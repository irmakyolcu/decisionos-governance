import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage, translate } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { recordHref } from '@/lib/records';
import { buildIntelligencePdf } from '@/lib/intelligenceReport';

type Alert = { key: string; group: 'risk' | 'decision' | 'work'; title: string; why: string; evidence: string; process: string | null; owner: string | null; next: string; href: string };

export function CeoIntelligence() {
  const { t, locale } = useLanguage();
  const { workspace } = useWorkspace();
  const ws = workspace?.id;
  const today = new Date().toISOString().slice(0, 10);

  const { data, isLoading, error } = useQuery({
    queryKey: ['ceo-intel', ws], enabled: !!ws, refetchInterval: 60_000,
    queryFn: async () => {
      const r = await Promise.all([
        supabase.from('risks').select('id,summary,severity,status,department,owner_id,why_it_matters,recommended_action,evidence,affected_entity_type,affected_entity_id,updated_at').eq('workspace_id', ws!).in('status', ['new', 'investigating', 'action_required']),
        supabase.from('decisions').select('id,title,status,owner_id,created_by,risk_level,updated_at,created_at').eq('workspace_id', ws!).order('created_at', { ascending: false }).limit(200),
        supabase.from('workflow_steps').select('id,run_id,title,status,due_date,owner_id,department,quality_status').eq('workspace_id', ws!).neq('status', 'completed'),
        supabase.from('workflow_tasks').select('id,run_id,step_id,title,status,due_date,assignee_id').eq('workspace_id', ws!).neq('status', 'completed'),
        supabase.from('workflow_runs').select('id,name,process_id,project_id').eq('workspace_id', ws!),
        supabase.from('processes').select('id,name').eq('workspace_id', ws!),
        supabase.from('profiles').select('user_id,display_name').eq('workspace_id', ws!),
        supabase.from('decision_outcomes').select('decision_id,outcome_status,summary,measured_at').eq('workspace_id', ws!),
        supabase.from('knowledge_items').select('id,title,created_at').eq('workspace_id', ws!).eq('entity_type', 'lesson').order('created_at', { ascending: false }).limit(5),
        supabase.from('decision_intelligence_runs').select('decision_id,risk_level,risk_score,rationale,mitigations,sources,data_as_of,created_at').eq('workspace_id', ws!).order('created_at', { ascending: false }).limit(50),
      ]);
      for (const x of r) if (x.error) throw x.error;
      const [risks, decisions, steps, tasks, runs, processes, profiles, outcomes, lessons, intel] = r.map((x) => x.data ?? []) as any[][];
      return { risks, decisions, steps, tasks, runs, processes, profiles, outcomes, lessons, intel };
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full" />;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;
  if (!data) return null;

  const name = (id?: string | null) => (id ? data.profiles.find((p: any) => p.user_id === id)?.display_name || id.slice(0, 8) : null);
  const runById = new Map(data.runs.map((r: any) => [r.id, r]));
  const procName = (runId: string) => { const run: any = runById.get(runId); return run ? data.processes.find((p: any) => p.id === run.process_id)?.name ?? run.name : null; };
  const stepById = new Map(data.steps.map((s: any) => [s.id, s]));
  const latestIntel = new Map<string, any>();
  for (const i of data.intel) if (!latestIntel.has(i.decision_id)) latestIntel.set(i.decision_id, i);

  const alerts: Alert[] = [];
  for (const r of data.risks.filter((x: any) => ['high', 'critical'].includes(x.severity))) {
    const ev = Array.isArray(r.evidence) ? r.evidence.length : 0;
    alerts.push({ key: `r${r.id}`, group: 'risk', title: r.summary, why: r.why_it_matters || translate('ceo.why.risk', { s: t(`di.level.${r.severity}`) }), evidence: ev ? `${ev}` : '—', process: r.affected_entity_type === 'process' ? data.processes.find((p: any) => p.id === r.affected_entity_id)?.name ?? null : r.department, owner: name(r.owner_id), next: r.recommended_action || t('ceo.next.resolve'), href: recordHref('risk', r.id) });
  }
  for (const d of data.decisions.filter((x: any) => ['Pending', 'Under Review', 'Escalated'].includes(x.status))) {
    const intel = latestIntel.get(d.id);
    alerts.push({ key: `d${d.id}`, group: 'decision', title: d.title, why: intel?.rationale || t('ceo.why.decision'), evidence: intel ? `${(intel.sources ?? []).length}` : '—', process: null, owner: name(d.owner_id || d.created_by), next: t('ceo.next.review'), href: recordHref('decision', d.id) });
  }
  for (const s of data.steps.filter((x: any) => x.quality_status === 'failed' || (x.due_date && x.due_date < today))) {
    const run: any = runById.get(s.run_id);
    alerts.push({ key: `s${s.id}`, group: 'work', title: s.title, why: s.quality_status === 'failed' ? t('ceo.why.blocked') : translate('ceo.why.overdue', { d: s.due_date }), evidence: '—', process: procName(s.run_id), owner: name(s.owner_id), next: t('ceo.next.resolve'), href: run ? `/processes?record=${run.process_id}&step=${s.id}` : '/processes' });
  }
  for (const k of data.tasks.filter((x: any) => x.due_date && x.due_date < today)) {
    const run: any = runById.get(k.run_id);
    alerts.push({ key: `t${k.id}`, group: 'work', title: k.title, why: translate('ceo.why.overdue', { d: k.due_date }), evidence: (stepById.get(k.step_id) as any)?.title ?? '—', process: procName(k.run_id), owner: name(k.assignee_id), next: t('ceo.next.resolve'), href: run ? `/processes?record=${run.process_id}&step=${k.step_id}` : '/processes' });
  }

  const depts = new Map<string, { risks: number; tasks: number }>();
  const bump = (d: string | null | undefined, f: 'risks' | 'tasks') => { const key = d || '—'; const v = depts.get(key) ?? { risks: 0, tasks: 0 }; v[f]++; depts.set(key, v); };
  data.risks.forEach((r: any) => bump(r.department, 'risks'));
  data.tasks.forEach((k: any) => bump((stepById.get(k.step_id) as any)?.department, 'tasks'));
  const outcomeBy = new Map(data.outcomes.map((o: any) => [o.decision_id, o]));

  const download = () => {
    const sev = ['low', 'medium', 'high', 'critical'];
    const statuses = ['Success', 'Partial Success', 'Failure', 'Pending'];
    const dates = [...data.intel.map((i: any) => i.data_as_of), ...data.risks.map((r: any) => r.updated_at), ...data.decisions.map((d: any) => d.updated_at)].filter(Boolean).sort();
    const created = data.decisions.map((d: any) => d.created_at).sort();
    const doc = buildIntelligencePdf({
      workspace: workspace?.name ?? '', locale, dataAsOf: dates.at(-1) ?? null,
      periodFrom: new Date(created[0] ?? Date.now()), periodTo: new Date(),
      labels: { title: t('ceo.intel'), period: t('Period'), generated: t('di.generated'), dataAsOf: t('di.dataAsOf'), scope: t('Contains only records you are authorized to view.'), riskChart: t('Open risks by severity'), outcomeChart: t('Decision outcomes'), alerts: t('Needs Your Attention'), why: t('ceo.why'), owner: t('ceo.owner'), next: t('ceo.next'), assessments: t('di.risk'), sources: t('di.sources'), outdated: t('di.outdated'), decisions: t('Decisions'), governance: t('di.governance') },
      riskDistribution: sev.map((s) => ({ label: t(`di.level.${s}`), value: data.risks.filter((r: any) => r.severity === s).length })),
      outcomeDistribution: statuses.map((s) => ({ label: t(s), value: data.outcomes.filter((o: any) => o.outcome_status === s).length })),
      alerts: alerts.slice(0, 20).map((a) => ({ title: a.title, why: a.why, owner: a.owner ?? t('ceo.unassigned'), next: a.next })),
      assessments: [...latestIntel.entries()].slice(0, 15).map(([id, i]) => ({ decision: data.decisions.find((d: any) => d.id === id)?.title ?? id, level: t(`di.level.${i.risk_level ?? 'unknown'}`), score: i.risk_score, rationale: i.rationale ?? '', mitigations: (i.mitigations ?? []).map((m: any) => m.action), sources: (i.sources ?? []).slice(0, 8) })),
      decisions: data.decisions.slice(0, 30).map((d: any) => ({ title: d.title, status: t(d.status), outcome: (outcomeBy.get(d.id) as any)?.outcome_status ? t((outcomeBy.get(d.id) as any).outcome_status) : t('di.noOutcome') })),
    });
    doc.save(`decisionos-intelligence-${today}.pdf`);
    toast.success(t('ceo.reportDone'));
  };

  const Group = ({ g, title }: { g: Alert['group']; title: string }) => {
    const list = alerts.filter((a) => a.group === g);
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">{title} <Badge variant="secondary" className="ml-1">{list.length}</Badge></CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.length === 0 ? <p className="text-sm text-muted-foreground">{t('ceo.nothing')}</p> : list.slice(0, 6).map((a) => (
            <div key={a.key} className="rounded border p-3 text-sm space-y-1">
              <div className="flex items-start justify-between gap-2"><span className="font-medium">{a.title}</span><Button asChild size="sm" variant="outline"><Link to={a.href}>{t('ceo.open')}</Link></Button></div>
              <p className="text-xs line-clamp-3"><b>{t('ceo.why')}:</b> {a.why}</p>
              <p className="text-xs text-muted-foreground"><b>{t('ceo.evidence')}:</b> {a.evidence} · <b>{t('ceo.process')}:</b> {a.process ?? '—'} · <b>{t('ceo.owner')}:</b> {a.owner ?? t('ceo.unassigned')}</p>
              <p className="text-xs"><b>{t('ceo.next')}:</b> {a.next}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2"><Brain className="h-5 w-5" />{t('ceo.intel')}</h2>
        <Button variant="outline" onClick={download}><Download className="h-4 w-4 mr-1" />{t('ceo.report')}</Button>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Group g="risk" title={t('ceo.highRisks')} />
        <Group g="decision" title={t('ceo.awaiting')} />
        <Group g="work" title={t('ceo.blocked')} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t('ceo.dept')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {depts.size === 0 ? <p className="text-sm text-muted-foreground">{t('ceo.nothing')}</p> : [...depts.entries()].map(([d, v]) => (
              <div key={d} className="flex justify-between text-sm border-b py-1"><span>{d}</span><span className="text-muted-foreground">{v.risks} {t('ceo.openRisks')} · {v.tasks} {t('ceo.openTasks')}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t('ceo.outcomes')}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {data.outcomes.slice(0, 5).map((o: any) => {
              const d = data.decisions.find((x: any) => x.id === o.decision_id);
              return <Link key={o.decision_id} to={recordHref('decision', o.decision_id)} className="flex justify-between text-sm border-b py-1 hover:underline"><span className="truncate">{d?.title ?? o.summary}</span><Badge variant="outline">{t(o.outcome_status)}</Badge></Link>;
            })}
            {data.lessons.map((l: any) => <Link key={l.id} to={recordHref('lesson', l.id)} className="block text-sm py-1 hover:underline">💡 {l.title}</Link>)}
            {data.outcomes.length === 0 && data.lessons.length === 0 && <p className="text-sm text-muted-foreground">{t('ceo.nothing')}</p>}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
