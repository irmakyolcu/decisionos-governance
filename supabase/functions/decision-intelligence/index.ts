// decision-intelligence: evidence-grounded analysis + explainable risk for one decision.
// Reads ONLY through the caller's RLS. Never changes decision status or executes actions.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isWriter } from '../_shared/integrity.ts';
import { aiChatRaw, AiError } from '../_shared/aiClient.ts';
import {
  DEFAULT_CRITERIA, computeRiskScore, groundClaims, isStale, outcomeLabel, outcomeProbability, riskLevel,
  type Criterion, type CriterionRating,
} from '../_shared/decisionIntelligence.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON = Deno.env.get('SUPABASE_ANON_KEY')!;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const cut = (v: unknown, n = 400) => (typeof v === 'string' ? v.slice(0, n) : v ?? null);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const supa = createClient(SUPABASE_URL, ANON, { global: { headers: { Authorization: req.headers.get('Authorization') || '' } } });
    const { data: { user } } = await supa.auth.getUser();
    if (!user) return json({ error: 'unauthorized' }, 401);
    const body = await req.json().catch(() => ({}));
    const decision_id = body?.decision_id;
    if (typeof decision_id !== 'string' || !UUID.test(decision_id)) return json({ error: 'decision_id must be a UUID' }, 400);

    const { data: decision } = await supa.from('decisions').select('*').eq('id', decision_id).maybeSingle();
    if (!decision) return json({ error: 'decision not found' }, 404);
    const ws = decision.workspace_id;
    const { data: m } = await supa.from('workspace_members').select('role').eq('workspace_id', ws).eq('user_id', user.id).maybeSingle();
    if (!m || !isWriter(m.role)) return json({ error: 'forbidden' }, 403);

    const [ev, outs, others, links, lessons, risks, crit, srcs, obs] = await Promise.all([
      supa.from('decision_evidence').select('id,source,summary,reliability,source_date,is_verified').eq('decision_id', decision_id).limit(40),
      supa.from('decision_outcomes').select('decision_id,outcome_status,summary,measured_at').eq('workspace_id', ws).limit(500),
      supa.from('decisions').select('id,title,description,decision_type,budget,risk_level,status,decision_date,created_at').eq('workspace_id', ws).neq('id', decision_id).order('created_at', { ascending: false }).limit(40),
      supa.from('record_links').select('source_kind,source_id,target_kind,target_id,relation').eq('workspace_id', ws).or(`source_id.eq.${decision_id},target_id.eq.${decision_id}`).limit(50),
      supa.from('knowledge_items').select('id,title,content,created_at').eq('workspace_id', ws).eq('entity_type', 'lesson').order('created_at', { ascending: false }).limit(15),
      supa.from('risks').select('id,summary,severity,status,department,updated_at').eq('workspace_id', ws).in('status', ['new', 'investigating', 'action_required']).limit(20),
      supa.from('risk_criteria').select('key,label,weight,enabled').eq('workspace_id', ws),
      supa.from('external_sources').select('id,kind,name,provider,freshness_days,configured').eq('workspace_id', ws),
      supa.from('external_observations').select('id,source_id,title,value,summary,reference_url,published_at,retrieved_at').eq('workspace_id', ws).order('published_at', { ascending: false }).limit(30),
    ]);
    for (const r of [ev, outs, others, links, lessons, risks, crit, srcs, obs]) if (r.error) throw r.error;

    const outcomeBy = new Map<string, any>();
    for (const o of outs.data ?? []) outcomeBy.set(o.decision_id, o);
    const criteria: Criterion[] = (crit.data?.length ? crit.data : DEFAULT_CRITERIA).map((c: any) => ({ ...c, weight: Number(c.weight) }));
    const srcById = new Map((srcs.data ?? []).map((s: any) => [s.id, s]));
    const observations = (obs.data ?? []).filter((o: any) => srcById.get(o.source_id)?.configured).map((o: any) => {
      const s = srcById.get(o.source_id);
      return { ...o, kind: s.kind, source: s.name, stale: isStale(o.published_at, s.freshness_days) };
    });
    const external_status = !(srcs.data ?? []).some((s: any) => s.configured) ? 'not_configured' : observations.length === 0 ? 'no_data' : observations.every((o) => o.stale) ? 'stale' : 'available';

    // Linked records (projects/processes/documents/etc.) resolved via RLS.
    const linked = (links.data ?? []).map((l: any) => (l.source_id === decision_id ? { kind: l.target_kind, id: l.target_id, relation: l.relation } : { kind: l.source_kind, id: l.source_id, relation: l.relation }));

    const records: Record<string, any>[] = [
      ...(ev.data ?? []).map((e: any) => ({ id: e.id, type: 'evidence', source: e.source, summary: cut(e.summary), reliability: e.reliability, date: e.source_date, verified: e.is_verified })),
      ...(others.data ?? []).map((d: any) => ({ id: d.id, type: 'past_decision', title: d.title, summary: cut(d.description, 250), decision_type: d.decision_type, budget: d.budget, risk_level: d.risk_level, date: d.decision_date || d.created_at, recorded_outcome: outcomeLabel(outcomeBy.get(d.id)?.outcome_status), outcome_summary: cut(outcomeBy.get(d.id)?.summary, 200) })),
      ...(lessons.data ?? []).map((l: any) => ({ id: l.id, type: 'lesson', title: l.title, summary: cut(l.content, 250), date: l.created_at })),
      ...(risks.data ?? []).map((r: any) => ({ id: r.id, type: 'open_risk', summary: cut(r.summary, 200), severity: r.severity, department: r.department, date: r.updated_at })),
      ...linked.map((l) => ({ id: l.id, type: `linked_${l.kind}`, relation: l.relation })),
      ...observations.map((o) => ({ id: o.id, type: `external_${o.kind}`, source: o.source, title: o.title, value: o.value, summary: cut(o.summary, 200), published_at: o.published_at, stale: o.stale })),
    ];
    const allowed = new Set(records.map((r) => r.id));

    const sys = `You are the DecisionOS Decision Intelligence analyst. Respond in Turkish, as JSON only.
Rules:
- Use ONLY the supplied records. Cite record ids in source_ids. Never invent data, outcomes, sources, economic figures or dates.
- Classify every claim as "fact" (directly documented in a cited record), "inference", "assumption", or "missing" (information needed but absent).
- A past decision succeeded or failed ONLY if its recorded_outcome says so; otherwise say there is no recorded outcome.
- External records marked stale must be described as outdated, never as current.
- Rate each criterion from 1 (low risk) to 5 (high risk), or null if there is no basis. Do not output probabilities or a total score.
- You do not approve or execute anything; mitigations are suggestions for humans.`;
    const prompt = JSON.stringify({
      decision: { id: decision.id, title: decision.title, description: cut(decision.description, 1500), problem: cut(decision.problem_statement, 1000), budget: decision.budget, options: decision.options_considered, user_risk_level: decision.risk_level, rationale: cut(decision.rationale, 800), expected_outcomes: cut(decision.expected_outcomes, 800) },
      criteria: criteria.filter((c) => c.enabled).map((c) => ({ key: c.key, label: c.label })),
      external_status,
      records,
      output_schema: {
        claims: [{ kind: 'fact|inference|assumption|missing', text: 'string', source_ids: ['record id'] }],
        similar_decisions: [{ id: 'past_decision id', similarities: 'string', differences: 'string' }],
        criteria_ratings: [{ key: 'criterion key', rating: '1-5 or null', rationale: 'string', source_ids: ['record id'] }],
        rationale: 'string (2-4 sentences)',
        mitigations: [{ action: 'string', addresses: 'criterion key', requires_approval: 'boolean' }],
      },
    });

    let raw: any;
    try {
      raw = await aiChatRaw({ messages: [{ role: 'system', content: sys }, { role: 'user', content: `Return JSON.\n${prompt}` }], jsonMode: true });
    } catch (e) {
      if (e instanceof AiError) {
        if (e.status === 429) return json({ error: 'AI hız sınırı aşıldı, biraz sonra tekrar deneyin.' }, 429);
        if (e.status === 402) return json({ error: 'AI kredisi yetersiz. Ayarlar → Plan ve krediler bölümünden kredi ekleyin.' }, 402);
        if (e.status === 403) return json({ error: 'AI erişimi bu çalışma alanı için engelli.' }, 403);
        if (e.status === 503) return json({ error: 'AI yapılandırılmamış.' }, 503);
      }
      throw e;
    }
    const content = raw?.choices?.[0]?.message?.content;
    if (!content) return json({ error: 'AI boş yanıt döndürdü; analiz kaydedilmedi.' }, 502);
    let out: any;
    try { out = JSON.parse(content); } catch { return json({ error: 'AI geçersiz yanıt döndürdü; analiz kaydedilmedi.' }, 502); }

    const pastIds = new Set((others.data ?? []).map((d: any) => d.id));
    const claims = groundClaims(out.claims, allowed);
    const criterionKeys = new Set(criteria.map((c) => c.key));
    const ratings: CriterionRating[] = (Array.isArray(out.criteria_ratings) ? out.criteria_ratings : [])
      .filter((r: any) => criterionKeys.has(r?.key))
      .map((r: any) => ({ key: r.key, rating: typeof r.rating === 'number' ? Math.min(5, Math.max(1, Math.round(r.rating))) : null, rationale: String(cut(r.rationale, 500) ?? ''), source_ids: (r.source_ids ?? []).filter((id: string) => allowed.has(id)) }));
    const similar = (Array.isArray(out.similar_decisions) ? out.similar_decisions : []).filter((s: any) => pastIds.has(s?.id)).slice(0, 6).map((s: any) => {
      const d = (others.data ?? []).find((x: any) => x.id === s.id);
      return { id: s.id, title: d.title, similarities: cut(s.similarities, 400), differences: cut(s.differences, 400), recorded_outcome: outcomeLabel(outcomeBy.get(s.id)?.outcome_status) };
    });
    const score = computeRiskScore(criteria, ratings);
    const prob = outcomeProbability(similar.map((s: any) => outcomeBy.get(s.id)?.outcome_status).filter(Boolean));
    const mitigations = (Array.isArray(out.mitigations) ? out.mitigations : []).slice(0, 8).map((x: any) => ({ action: String(cut(x?.action, 300) ?? ''), addresses: criterionKeys.has(x?.addresses) ? x.addresses : null, requires_approval: true }));
    const cited = new Set([...claims.flatMap((c) => c.source_ids), ...ratings.flatMap((r) => r.source_ids), ...similar.map((s: any) => s.id)]);
    const sources = records.filter((r) => cited.has(r.id)).map((r) => ({ id: r.id, type: r.type, label: r.title || r.source || r.summary || r.type, date: r.date || r.published_at || null, stale: r.stale ?? false, url: observations.find((o) => o.id === r.id)?.reference_url ?? null }));
    const dates = records.map((r) => r.date || r.published_at).filter(Boolean).map((d: string) => new Date(d).getTime()).filter(Number.isFinite);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: run, error: insErr } = await admin.from('decision_intelligence_runs').insert({
      workspace_id: ws, decision_id, created_by: user.id, model: raw?.model ?? null,
      claims, similar_decisions: similar, criteria_ratings: ratings, risk_score: score, risk_level: riskLevel(score),
      probability: prob.probability, probability_basis: prob.basis, rationale: cut(out.rationale, 1500), mitigations, sources, external_status,
      data_as_of: dates.length ? new Date(Math.max(...dates)).toISOString() : null,
    }).select().single();
    if (insErr) throw insErr;
    await admin.from('audit_events').insert({ workspace_id: ws, actor_id: user.id, event_type: 'decision_intelligence.generated', entity_type: 'decision', entity_id: decision_id, metadata: { run_id: run.id, risk_level: run.risk_level } }).then(() => {}, () => {});
    return json({ run });
  } catch (e) {
    console.error('decision-intelligence', e);
    return json({ error: 'Analiz oluşturulamadı.' }, 500);
  }
});
