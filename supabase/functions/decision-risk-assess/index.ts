// decision-risk-assess: AI generates a risk score + commentary for a decision.
// Compares the new score to the previous one and stores an append-only record.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { decision_id, trigger_reason } = await req.json();
    if (!decision_id) return json({ error: 'decision_id required' }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: decision } = await admin.from('decisions').select('*').eq('id', decision_id).maybeSingle();
    if (!decision) return json({ error: 'decision not found' }, 404);

    const { data: membership } = await admin
      .from('workspace_members').select('role')
      .eq('workspace_id', decision.workspace_id).eq('user_id', user.id).maybeSingle();
    if (!membership) return json({ error: 'forbidden' }, 403);

    const { data: prior } = await admin
      .from('decision_risk_assessments')
      .select('id, risk_score, risk_level, commentary, created_at')
      .eq('decision_id', decision_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const priorSummary = (prior ?? []).map((p: any, i: number) =>
      `#${i + 1} (${new Date(p.created_at).toLocaleString('tr-TR')}) — Skor ${p.risk_score}/100, Seviye: ${p.risk_level}. Yorum: ${p.commentary}`
    ).join('\n');

    const model = 'google/gemini-3-flash-preview';
    const sys = `You are the DecisionOS Risk Analyst. You rate decision risk (0-100) and comment in Turkish.
Rules:
- Compare against the previous assessment when one exists.
- Explain WHY the score changed (or stayed the same), referring to the prior assessments.
- Use plain executive language. Cite the specific fields that drove the score.
- Output STRICT JSON only.`;

    const prompt = `KARAR:
Başlık: ${decision.title}
Açıklama: ${decision.description || '—'}
Problem: ${decision.problem_statement || '—'}
Bütçe: ${decision.budget ?? 0}
Mevcut risk seviyesi (kullanıcı): ${decision.risk_level || 'unknown'}
Durum: ${decision.status}
Seçenekler: ${JSON.stringify(decision.options_considered || [])}

ÖNCEKİ AI DEĞERLENDİRMELERİ (en yeni ilk, boşsa ilk defa değerlendiriyorsun):
${priorSummary || '(hiç yok)'}

Aşağıdaki JSON şemasında yanıt ver:
{
  "risk_score": 0-100 tam sayı,
  "confidence": 0-100 tam sayı,
  "risk_level": "low" | "medium" | "high" | "critical",
  "verdict": "1 cümlelik yönetici özeti (Türkçe)",
  "commentary": "2-4 cümlelik ayrıntılı yorum (Türkçe), skoru neyin sürüklediğini açıkla",
  "comparison_note": "Önceki skor varsa: 'Önceden %X seviyesinde alındı, şimdi %Y — sebep: ...' formatında Türkçe karşılaştırma. Önceki yoksa: 'İlk değerlendirme.'"
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
    if (aiRes.status === 402) return json({ error: 'AI kredisi tükendi. Workspace bilgi ekranından kredi ekleyin.' }, 402);
    if (!aiRes.ok) return json({ error: 'AI gateway error', detail: await aiRes.text() }, aiRes.status);

    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    const previousScore = prior?.[0]?.risk_score ?? null;
    const newScore = Number(parsed.risk_score);
    const delta = previousScore != null ? newScore - Number(previousScore) : null;

    const { data: inserted, error: insErr } = await admin
      .from('decision_risk_assessments')
      .insert({
        workspace_id: decision.workspace_id,
        decision_id,
        risk_score: newScore,
        confidence: parsed.confidence ?? null,
        risk_level: String(parsed.risk_level || 'medium').toLowerCase(),
        verdict: parsed.verdict ?? null,
        commentary: parsed.commentary ?? '',
        comparison_note: parsed.comparison_note ?? null,
        previous_score: previousScore,
        score_delta: delta,
        triggered_by: user.id,
        trigger_reason: trigger_reason ?? 'manual',
        model,
        snapshot: {
          title: decision.title,
          budget: decision.budget,
          risk_level: decision.risk_level,
          status: decision.status,
        },
      })
      .select()
      .maybeSingle();

    if (insErr) return json({ error: insErr.message }, 500);

    await admin.from('audit_events').insert({
      workspace_id: decision.workspace_id,
      event_type: 'agent.risk_assessment_generated',
      decision_id,
      actor_user_id: user.id,
      agent_id: 'risk_agent',
      model,
      reason: `Risk skor: ${newScore}/100 (${parsed.risk_level})${delta != null ? `, delta ${delta > 0 ? '+' : ''}${delta}` : ''}`,
    });
    await admin.from('agent_runs').insert({
      workspace_id: decision.workspace_id,
      agent_id: 'risk_agent',
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
