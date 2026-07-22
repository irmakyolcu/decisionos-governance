// decision-macro-assess: AI evaluates macroeconomic, sector and geopolitical
// context (war, inflation, FX, energy, supply chain, regulation) around a
// decision and stores an append-only assessment.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { decision_id, trigger_reason, sector_hint, geographies_hint } = await req.json();
    if (!decision_id) return json({ error: 'decision_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: decision } = await admin.from('decisions').select('*').eq('id', decision_id).maybeSingle();
    if (!decision) return json({ error: 'decision not found' }, 404);

    const { data: membership } = await admin
      .from('workspace_members').select('role')
      .eq('workspace_id', decision.workspace_id).eq('user_id', user.id).maybeSingle();
    if (!membership) return json({ error: 'forbidden' }, 403);

    const model = 'google/gemini-2.5-pro';
    const sys = `Sen DecisionOS Makro Analistisin. Bir kurumsal kararı; sektör, ulusal ve küresel ekonomik durum,
jeopolitik gerilimler (savaş, yaptırım, ticaret savaşları), enflasyon, faiz, döviz kuru, enerji fiyatları,
tedarik zinciri, düzenleyici riskler ve talep görünümü açısından değerlendirirsin.
Kurallar:
- Bilgin bir kesme tarihine sahiptir; kesin fiyat/kur verme, aralık ve yön belirt.
- Türkçe, yönetici diliyle yaz. Kısa, kanıta dayalı, spekülatif değil.
- SADECE geçerli JSON döndür.`;

    const prompt = `KARAR:
Başlık: ${decision.title}
Açıklama: ${decision.description || '—'}
Problem: ${decision.problem_statement || '—'}
Bütçe: ${decision.budget ?? 0}
Risk (kullanıcı): ${decision.risk_level || 'unknown'}
Sektör ipucu: ${sector_hint || '(tespit et)'}
Coğrafya ipucu: ${geographies_hint || '(tespit et; varsayılan: Türkiye + küresel)'}

Aşağıdaki JSON şemasında yanıt ver:
{
  "sector": "kararın ait olduğu sektör (TR)",
  "geographies": ["etkilenen ülke/bölgeler"],
  "macro_score": 0-100 tam sayı (0=çok olumsuz makro ortam, 100=çok elverişli),
  "macro_level": "unfavorable" | "cautious" | "neutral" | "supportive" | "favorable",
  "outlook": "3-6 ay görünüm: negative | mixed | stable | positive",
  "headline": "1 cümlelik yönetici başlığı (TR)",
  "commentary": "3-5 cümlelik ayrıntılı yorum (TR): küresel + ulusal + sektörel resmi bağla, kararı bu bağlamda konumla",
  "risks": [{"title":"kısa risk","detail":"1 cümle","severity":"low|medium|high"}],
  "opportunities": [{"title":"kısa fırsat","detail":"1 cümle"}],
  "indicators": {
    "inflation":"yön/aralık yorumu (TR)",
    "interest_rates":"...",
    "fx":"USD/TRY, EUR/USD gibi ilgili paritelerde yön",
    "energy":"petrol/gaz/elektrik yönü",
    "geopolitics":"savaş, yaptırım, ticaret kısıtı, seçim vb.",
    "supply_chain":"...",
    "demand":"..."
  },
  "geopolitical_notes": "aktif çatışma/yaptırım/gerilim bağlamı (TR, 1-3 cümle)",
  "sources": ["konu başlığı olarak referans alanlar (TR) — URL zorunlu değil"]
}`;

    const started = Date.now();
    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (aiRes.status === 429) return json({ error: 'AI hız sınırı aşıldı, biraz sonra tekrar deneyin.' }, 429);
    if (aiRes.status === 402) return json({ error: 'AI kredisi tükendi.' }, 402);
    if (!aiRes.ok) return json({ error: 'AI gateway error', detail: await aiRes.text() }, aiRes.status);

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '{}';
    let parsed: any = {};
    try { parsed = JSON.parse(content); } catch { parsed = {}; }

    const { data: inserted, error: insErr } = await admin
      .from('decision_macro_assessments')
      .insert({
        workspace_id: decision.workspace_id,
        decision_id,
        sector: parsed.sector ?? null,
        geographies: Array.isArray(parsed.geographies) ? parsed.geographies : null,
        macro_score: parsed.macro_score != null ? Number(parsed.macro_score) : null,
        macro_level: parsed.macro_level ?? null,
        outlook: parsed.outlook ?? null,
        headline: parsed.headline ?? null,
        commentary: parsed.commentary ?? '',
        risks: parsed.risks ?? [],
        opportunities: parsed.opportunities ?? [],
        indicators: parsed.indicators ?? {},
        geopolitical_notes: parsed.geopolitical_notes ?? null,
        sources: parsed.sources ?? [],
        model,
        triggered_by: user.id,
        trigger_reason: trigger_reason ?? 'manual',
      })
      .select()
      .maybeSingle();
    if (insErr) return json({ error: insErr.message }, 500);

    await admin.from('audit_events').insert({
      workspace_id: decision.workspace_id,
      event_type: 'agent.macro_assessment_generated',
      decision_id,
      actor_user_id: user.id,
      agent_id: 'macro_agent',
      model,
      reason: `Makro skor: ${parsed.macro_score ?? '—'}/100 (${parsed.macro_level ?? '—'})`,
    });
    await admin.from('agent_runs').insert({
      workspace_id: decision.workspace_id,
      agent_id: 'macro_agent',
      decision_id, model,
      status: 'success',
      latency_ms: Date.now() - started,
      tokens_input: aiJson.usage?.prompt_tokens,
      tokens_output: aiJson.usage?.completion_tokens,
    });

    return json({ ok: true, assessment: inserted });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
