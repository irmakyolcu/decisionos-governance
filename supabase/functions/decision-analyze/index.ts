// decision-analyze: produces alternatives, evidence stubs, recommendation, scenarios.
// Never executes external actions.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { decision_id, workspace_id } = await req.json();
    if (!decision_id || !workspace_id) {
      return new Response(JSON.stringify({ error: 'decision_id and workspace_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: decision } = await admin.from('decisions').select('*').eq('id', decision_id).maybeSingle();
    if (!decision) return new Response(JSON.stringify({ error: 'decision not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const model = 'google/gemini-3-flash-preview';
    const sys = `You are the DecisionOS Decision Agent. You prepare decisions for human leaders to approve. You do NOT execute actions. You MUST distinguish facts, assumptions, and unknowns. Output strict JSON only.`;
    const prompt = `Decision title: ${decision.title}
Description: ${decision.description || ''}
Problem statement: ${decision.problem_statement || ''}
Options considered: ${JSON.stringify(decision.options_considered || [])}
Budget: ${decision.budget || 0}
Risk level: ${decision.risk_level || 'unknown'}

Produce JSON with shape:
{
  "alternatives": [{"title": str, "description": str, "estimated_cost": number, "expected_value": number, "time_to_impact": str, "risk_level": "low|medium|high|critical", "reversibility": "high|medium|low", "confidence": 0-1, "is_recommended": bool}],
  "evidence": [{"source": str, "summary": str, "reliability": "high|medium|low", "supports": str, "contradicts": str, "is_verified": bool}],
  "assumptions": [{"text": str, "confidence": 0-1}],
  "unknowns": [{"text": str, "is_blocking": bool}],
  "recommendation": {"rationale": str, "confidence": 0-1, "invalidation_conditions": str, "devils_advocate": "multi-paragraph challenge to the recommendation"},
  "scenarios": [{"scenario": "best|base|worst|do_nothing", "summary": str, "financial_impact": number, "probability": 0-1}]
}
Include exactly one recommended alternative. Include all four scenarios. Include at least 2 assumptions and 2 unknowns.`;
    const startedAt = Date.now();

    const aiRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Lovable-API-Key': LOVABLE_API_KEY },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });
    if (!aiRes.ok) {
      const txt = await aiRes.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', detail: txt }), { status: aiRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const aiJson = await aiRes.json();
    const content = aiJson.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);

    // Clear prior derived rows
    await admin.from('decision_alternatives').delete().eq('decision_id', decision_id);
    await admin.from('decision_evidence').delete().eq('decision_id', decision_id);
    await admin.from('decision_assumptions').delete().eq('decision_id', decision_id);
    await admin.from('decision_unknowns').delete().eq('decision_id', decision_id);
    await admin.from('decision_scenarios').delete().eq('decision_id', decision_id);

    const base = { workspace_id, decision_id };
    let recommendedAltId: string | null = null;

    if (Array.isArray(parsed.alternatives)) {
      for (const a of parsed.alternatives) {
        const { data } = await admin.from('decision_alternatives').insert({ ...base, ...a }).select().maybeSingle();
        if (a.is_recommended && data) recommendedAltId = data.id;
      }
    }
    if (Array.isArray(parsed.evidence)) await admin.from('decision_evidence').insert(parsed.evidence.map((e: any) => ({ ...base, ...e })));
    if (Array.isArray(parsed.assumptions)) await admin.from('decision_assumptions').insert(parsed.assumptions.map((e: any) => ({ ...base, ...e })));
    if (Array.isArray(parsed.unknowns)) await admin.from('decision_unknowns').insert(parsed.unknowns.map((e: any) => ({ ...base, ...e })));
    if (Array.isArray(parsed.scenarios)) await admin.from('decision_scenarios').insert(parsed.scenarios.map((s: any) => ({ ...base, ...s })));
    if (parsed.recommendation) {
      await admin.from('decision_recommendations').insert({
        ...base,
        recommended_alternative_id: recommendedAltId,
        rationale: parsed.recommendation.rationale,
        confidence: parsed.recommendation.confidence,
        invalidation_conditions: parsed.recommendation.invalidation_conditions,
        devils_advocate: parsed.recommendation.devils_advocate,
        model,
      });
    }

    await admin.from('audit_events').insert({
      workspace_id, event_type: 'agent.analysis_generated',
      decision_id, actor_user_id: user.id, agent_id: 'decision_agent', model,
      reason: 'AI analysis generated alternatives, evidence, scenarios, and recommendation',
    });
    await admin.from('agent_runs').insert({
      workspace_id, agent_id: 'decision_agent', decision_id, model,
      status: 'success', latency_ms: Date.now() - startedAt,
      tokens_input: aiJson.usage?.prompt_tokens, tokens_output: aiJson.usage?.completion_tokens,
    });


    return new Response(JSON.stringify({ ok: true, model }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
