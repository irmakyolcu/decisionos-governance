import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Loader2, ShieldCheck, Globe2 } from 'lucide-react';
import { toast } from 'sonner';
import { recordHref } from '@/lib/records';

const KIND_STYLE: Record<string, string> = {
  fact: 'border-primary/40 bg-primary/5', inference: 'border-accent bg-accent/30',
  assumption: 'border-muted-foreground/30 bg-muted/40', missing: 'border-destructive/40 bg-destructive/5',
};

export function DecisionIntelligencePanel({ decisionId, canRun }: { decisionId: string; canRun: boolean }) {
  const { t, locale } = useLanguage();
  const qc = useQueryClient();
  const [running, setRunning] = useState(false);
  const { data: run, isLoading, error } = useQuery({
    queryKey: ['di-run', decisionId],
    queryFn: async () => {
      const { data, error } = await supabase.from('decision_intelligence_runs').select('*').eq('decision_id', decisionId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const analyze = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('decision-intelligence', { body: { decision_id: decisionId } });
    setRunning(false);
    if (error || data?.error) {
      let msg = data?.error;
      try { msg = msg || (await (error as any)?.context?.json())?.error; } catch { /* ignore */ }
      toast.error(msg || error?.message || 'Error');
      return;
    }
    qc.invalidateQueries({ queryKey: ['di-run', decisionId] });
  };

  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString(locale) : '—');
  const claims = (run?.claims ?? []) as any[];
  const srcLabel = new Map<string, any>(((run?.sources ?? []) as any[]).map((s) => [s.id, s]));
  const linkFor = (s: any) => {
    if (s.type === 'past_decision') return `/decisions/${s.id}`;
    const kind = s.type.replace(/^linked_/, '');
    if (s.type.startsWith('external_')) return s.url || null;
    if (s.type === 'evidence') return null;
    if (s.type === 'open_risk') return '/risks';
    try { return recordHref(kind as any, s.id); } catch { return null; }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4" />{t('di.title')}</CardTitle>
        {canRun ? (
          <Button size="sm" onClick={analyze} disabled={running}>
            {running ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Brain className="h-4 w-4 mr-1" />}{running ? t('di.running') : t('di.run')}
          </Button>
        ) : <span className="text-xs text-muted-foreground">{t('di.readonly')}</span>}
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" />{t('di.governance')}</p>
        {isLoading || running ? <Skeleton className="h-40 w-full" /> : error ? <p className="text-sm text-destructive">{(error as Error).message}</p> : !run ? <p className="text-sm text-muted-foreground">{t('di.none')}</p> : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline"><Globe2 className="h-3 w-3 mr-1" />{t(`di.ext.${run.external_status}`)}</Badge>
              <span>{t('di.generated')}: {fmt(run.created_at)}</span>
              <span>· {t('di.dataAsOf')}: {fmt(run.data_as_of)}</span>
            </div>

            <section className="space-y-2">
              <h3 className="font-semibold text-sm">{t('di.risk')}</h3>
              <div className="flex flex-wrap gap-3">
                <Badge className="text-sm" variant={['high', 'critical'].includes(run.risk_level) ? 'destructive' : 'secondary'}>{t('di.level')}: {t(`di.level.${run.risk_level ?? 'unknown'}`)}</Badge>
                <Badge variant="outline" className="text-sm">{t('di.score')}: {run.risk_score ?? '—'}/100</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{run.probability != null ? `${t('di.probability')}: %${Math.round(run.probability * 100)} (${run.probability_basis})` : t('di.qualitative')}</p>
              {run.rationale && <p className="text-sm">{run.rationale}</p>}
              <h4 className="text-xs font-semibold uppercase text-muted-foreground pt-1">{t('di.factors')}</h4>
              <ul className="space-y-1.5">
                {(run.criteria_ratings as any[]).map((r) => (
                  <li key={r.key} className="text-sm rounded border p-2">
                    <div className="flex justify-between gap-2"><span className="font-medium">{t(`di.crit.${r.key}`)}</span><span className="text-xs">{r.rating == null ? t('di.notRated') : `${r.rating}/5`}</span></div>
                    {r.rationale && <p className="text-xs text-muted-foreground mt-1">{r.rationale}</p>}
                  </li>
                ))}
              </ul>
            </section>

            {(['fact', 'inference', 'assumption', 'missing'] as const).map((k) => {
              const list = claims.filter((c) => c.kind === k);
              if (!list.length) return null;
              return (
                <section key={k} className="space-y-1.5">
                  <h3 className="font-semibold text-sm">{t(`di.${k}`)} ({list.length})</h3>
                  {list.map((c, i) => (
                    <div key={i} className={`rounded border p-2 text-sm ${KIND_STYLE[k]}`}>
                      {c.text}
                      {c.source_ids?.length > 0 && <div className="mt-1 flex flex-wrap gap-1">{c.source_ids.map((id: string) => <Badge key={id} variant="outline" className="text-[10px]">{srcLabel.get(id)?.label?.slice(0, 40) ?? id.slice(0, 8)}</Badge>)}</div>}
                    </div>
                  ))}
                </section>
              );
            })}

            <section className="space-y-1.5">
              <h3 className="font-semibold text-sm">{t('di.similar')}</h3>
              {(run.similar_decisions as any[]).length === 0 ? <p className="text-xs text-muted-foreground">—</p> : (run.similar_decisions as any[]).map((s) => (
                <div key={s.id} className="rounded border p-2 text-sm space-y-1">
                  <div className="flex justify-between gap-2"><Link to={`/decisions/${s.id}`} className="font-medium hover:underline">{s.title}</Link><Badge variant="outline">{s.recorded_outcome === 'No recorded outcome' ? t('di.noOutcome') : t(s.recorded_outcome)}</Badge></div>
                  <p className="text-xs"><b>{t('di.similarities')}:</b> {s.similarities}</p>
                  <p className="text-xs"><b>{t('di.differences')}:</b> {s.differences}</p>
                </div>
              ))}
            </section>

            {(run.mitigations as any[]).length > 0 && (
              <section className="space-y-1.5">
                <h3 className="font-semibold text-sm">{t('di.mitigations')}</h3>
                <ul className="list-disc pl-5 text-sm space-y-1">{(run.mitigations as any[]).map((m, i) => <li key={i}>{m.action}{m.addresses && <span className="text-xs text-muted-foreground"> — {t(`di.crit.${m.addresses}`)}</span>}</li>)}</ul>
              </section>
            )}

            <section className="space-y-1.5">
              <h3 className="font-semibold text-sm">{t('di.sources')} ({(run.sources as any[]).length})</h3>
              <ul className="space-y-1 text-xs">
                {(run.sources as any[]).map((s) => {
                  const href = linkFor(s);
                  return (
                    <li key={s.id} className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">{s.type}</Badge>
                      {href ? (href.startsWith('http') ? <a href={href} target="_blank" rel="noreferrer" className="hover:underline">{s.label}</a> : <Link to={href} className="hover:underline">{s.label}</Link>) : <span>{s.label}</span>}
                      {s.date && <span className="text-muted-foreground">{new Date(s.date).toLocaleDateString(locale)}</span>}
                      {s.stale && <Badge variant="destructive" className="text-[10px]">{t('di.outdated')}</Badge>}
                    </li>
                  );
                })}
              </ul>
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
