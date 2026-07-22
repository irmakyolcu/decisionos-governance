import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supa.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);

    const { workspace_id, scope = 'all', lang = 'tr' } = await req.json();
    if (!workspace_id) return json({ error: 'workspace_id required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: memberOk } = await admin.rpc('is_workspace_member', { _user_id: claims.claims.sub, _workspace_id: workspace_id });
    if (!memberOk) return json({ error: 'forbidden' }, 403);

    // Gather scope data
    const bundle: Record<string, unknown> = {};

    if (scope === 'docs' || scope === 'all') {
      const { data } = await admin.from('uploaded_documents').select('title,confidentiality,process_status,created_at').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(50);
      bundle.documents = data ?? [];
      const { data: ki } = await admin.from('knowledge_items').select('title,summary,tags,created_at').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(50);
      bundle.knowledge = ki ?? [];
    }
    if (scope === 'decisions' || scope === 'all') {
      const { data } = await admin.from('decisions').select('title,description,status,risk_level,budget,created_at').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(50);
      bundle.decisions = data ?? [];
      const decIds = (data ?? []).map((d: any) => d.title);
      if (decIds.length) {
        const { data: aiE } = await admin.from('ai_evaluations').select('summary,expected_roi,break_even_months,decision_id').limit(50);
        bundle.ai_evaluations = aiE ?? [];
      }
    }
    if (scope === 'lessons' || scope === 'all') {
      const { data } = await admin.from('knowledge_items').select('title,summary,tags,created_at').eq('workspace_id', workspace_id).contains('tags', ['lesson']).order('created_at', { ascending: false }).limit(50);
      bundle.lessons = data ?? [];
      const { data: audit } = await admin.from('audit_events').select('event_type,created_at,reason').eq('workspace_id', workspace_id).order('created_at', { ascending: false }).limit(30);
      bundle.audit = audit ?? [];
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) return json({ error: 'AI unavailable' }, 500);

    const systemPrompt = lang === 'en'
      ? 'You are an executive analyst. Produce a concise, professional markdown briefing (max ~800 words) with sections: Executive Summary, Key Metrics, Highlights, Risks & Watch Items, Recommendations. Use tables where helpful. No preamble.'
      : 'Sen bir üst düzey yönetici analistisin. Kısa, profesyonel bir markdown brifingi üret (en fazla ~800 kelime). Bölümler: Yönetici Özeti, Kilit Metrikler, Öne Çıkanlar, Riskler ve İzlenecekler, Öneriler. Uygun yerlerde tablo kullan. Girişe gerek yok.';

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Scope: ${scope}\n\nData:\n${JSON.stringify(bundle).slice(0, 40000)}` },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      return json({ error: 'AI failed', details: errText, status: aiRes.status }, aiRes.status);
    }
    const ai = await aiRes.json();
    const brief = ai.choices?.[0]?.message?.content ?? '';

    return json({ brief, bundle, generated_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
