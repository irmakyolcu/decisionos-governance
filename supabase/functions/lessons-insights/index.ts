// lessons-insights: AI executive summary + gap analysis + action/strategy/pricing recommendations
// based on the company's lessons learned. Advisory only; never executes actions.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { aiChatRaw, AiError } from '../_shared/aiClient.ts';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization') || '' } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);

    const { lessons, language } = await req.json();
    if (!Array.isArray(lessons) || lessons.length === 0) return json({ error: 'lessons required' }, 400);
    const trimmed = lessons.slice(0, 60).map((l: any) => ({
      title: String(l.title || '').slice(0, 300),
      category: l.category, impact: l.impact,
      context: String(l.context || '').slice(0, 800),
      what_worked: String(l.what_worked || '').slice(0, 800),
      what_failed: String(l.what_failed || '').slice(0, 800),
      recommendation: String(l.recommendation || '').slice(0, 800),
      source: String(l.source || '').slice(0, 200),
    }));
    const lang = language === 'en' ? 'English' : 'Turkish';

    const sys = `You are the DecisionOS strategy advisor for the executive team. You analyse the company's lessons learned and identify where the company is weak, and give concrete, counterfactual advice such as "if you had priced it like X you would not have lost this customer". Recommendations are advisory; humans decide. Write all text in ${lang}. Output strict JSON only.`;
    const prompt = `Lessons learned:\n${JSON.stringify(trimmed)}\n\nReturn JSON with shape:
{
  "executive_summary": "4-6 sentence summary for the CEO",
  "health_score": 0-100,
  "gaps": [{"area": str, "severity": "low|medium|high|critical", "description": str, "evidence": "which lesson(s) show it"}],
  "recommendations": [{"type": "action|strategy|pricing", "title": str, "detail": str, "counterfactual": "e.g. If you had done X, you would not have lost Y", "expected_impact": str, "priority": "low|medium|high"}],
  "next_30_days": [str]
}
Give 3-5 gaps and at least 2 recommendations for each type (action, strategy, pricing).`;

    let ai: any;
    try {
      ai = await aiChatRaw({
        model: Deno.env.get('AI_CHAT_MODEL') || 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }],
        jsonMode: true,
      });
    } catch (err) {
      const status = err instanceof AiError ? err.status : 500;
      const detail = err instanceof AiError ? err.detail : String(err);
      const msg = status === 429 ? 'rate_limited' : status === 402 ? 'credits_exhausted' : 'ai_error';
      return json({ error: msg, detail }, status);
    }
    const content = ai.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content.replace(/^```json\s*|```$/g, ''));
    return json({ ok: true, insights: parsed, generated_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
