import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { DEFAULT_CRITERIA, isStale } from '../../supabase/functions/_shared/decisionIntelligence';
import { canWriteMemory } from '@/lib/records';

const KINDS = ['macro', 'industry', 'geopolitical', 'other'] as const;

export default function ExternalContextPage() {
  const { t, locale } = useLanguage();
  const { workspace, role } = useWorkspace();
  const ws = workspace?.id;
  const qc = useQueryClient();
  const writer = canWriteMemory(role);
  const admin = role === 'admin';

  const q = useQuery({
    queryKey: ['ext', ws], enabled: !!ws,
    queryFn: async () => {
      const [s, o, c] = await Promise.all([
        supabase.from('external_sources').select('*').eq('workspace_id', ws!).order('created_at'),
        supabase.from('external_observations').select('*').eq('workspace_id', ws!).order('published_at', { ascending: false }),
        supabase.from('risk_criteria').select('*').eq('workspace_id', ws!),
      ]);
      for (const r of [s, o, c]) if (r.error) throw r.error;
      return { sources: s.data ?? [], obs: o.data ?? [], criteria: c.data ?? [] };
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['ext', ws] });
  const fail = (e: any) => { if (e) { toast.error(e.message); return true; } return false; };

  const [src, setSrc] = useState({ name: '', provider: '', url: '', kind: 'macro', freshness_days: 30, configured: true });
  const [obs, setObs] = useState({ source_id: '', title: '', value: '', summary: '', reference_url: '', published_at: '' });
  const [weights, setWeights] = useState<Record<string, { weight: number; enabled: boolean }>>({});
  useEffect(() => {
    const m: Record<string, { weight: number; enabled: boolean }> = {};
    for (const d of DEFAULT_CRITERIA) {
      const row: any = q.data?.criteria.find((c: any) => c.key === d.key);
      m[d.key] = { weight: row ? Number(row.weight) : d.weight, enabled: row ? row.enabled : d.enabled };
    }
    setWeights(m);
  }, [q.data]);

  const addSource = async () => {
    if (!src.name.trim()) return;
    if (fail((await supabase.from('external_sources').insert({ ...src, workspace_id: ws!, url: src.url || null, provider: src.provider || null })).error)) return;
    setSrc({ ...src, name: '', provider: '', url: '' }); refresh();
  };
  const toggleSource = async (id: string, configured: boolean) => { if (!fail((await supabase.from('external_sources').update({ configured }).eq('id', id)).error)) refresh(); };
  const addObs = async () => {
    if (!obs.source_id || !obs.title.trim() || !obs.published_at) return;
    if (obs.reference_url && !/^https?:\/\//.test(obs.reference_url)) { toast.error('URL'); return; }
    if (fail((await supabase.from('external_observations').insert({ ...obs, workspace_id: ws!, value: obs.value || null, summary: obs.summary || null, reference_url: obs.reference_url || null })).error)) return;
    setObs({ ...obs, title: '', value: '', summary: '', reference_url: '' }); refresh();
  };
  const saveCriteria = async () => {
    const rows = DEFAULT_CRITERIA.map((d) => ({ workspace_id: ws!, key: d.key, label: d.label, weight: Math.min(10, Math.max(0, weights[d.key]?.weight ?? d.weight)), enabled: weights[d.key]?.enabled ?? true, updated_at: new Date().toISOString() }));
    if (!fail((await supabase.from('risk_criteria').upsert(rows, { onConflict: 'workspace_id,key' })).error)) { toast.success(t('ext.saved')); refresh(); }
  };

  const sources = q.data?.sources ?? [];
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{t('ext.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('ext.subtitle')}</p>
        <p className="text-xs text-muted-foreground mt-2">{t('ext.liveNote')}</p>
      </div>
      {q.error && <p className="text-sm text-destructive">{(q.error as Error).message}</p>}

      <Card>
        <CardHeader><CardTitle className="text-base">{t('ext.criteria')}</CardTitle><p className="text-xs text-muted-foreground">{t('ext.criteriaHint')}</p></CardHeader>
        <CardContent className="space-y-2">
          {DEFAULT_CRITERIA.map((d) => (
            <div key={d.key} className="flex items-center gap-3">
              <Switch checked={weights[d.key]?.enabled ?? true} disabled={!admin} onCheckedChange={(v) => setWeights({ ...weights, [d.key]: { ...weights[d.key], enabled: v } })} aria-label={t(`di.crit.${d.key}`)} />
              <span className="flex-1 text-sm">{t(`di.crit.${d.key}`)}</span>
              <Input type="number" min={0} max={10} className="w-20" disabled={!admin} value={weights[d.key]?.weight ?? d.weight} onChange={(e) => setWeights({ ...weights, [d.key]: { ...weights[d.key], weight: Number(e.target.value) } })} />
            </div>
          ))}
          {admin && <Button size="sm" onClick={saveCriteria}>{t('ext.save')}</Button>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('ext.sources')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {sources.length === 0 ? <p className="text-sm text-muted-foreground">{t('di.ext.not_configured')}</p> : sources.map((s: any) => (
            <div key={s.id} className="flex flex-wrap items-center gap-2 rounded border p-2 text-sm">
              <Badge variant="secondary">{t(`ext.kind.${s.kind}`)}</Badge>
              <span className="font-medium">{s.name}</span>
              {s.provider && <span className="text-muted-foreground">· {s.provider}</span>}
              <span className="text-xs text-muted-foreground">· {s.freshness_days}d</span>
              <span className="ml-auto flex items-center gap-2 text-xs">{t('ext.configured')}<Switch checked={s.configured} disabled={!writer} onCheckedChange={(v) => toggleSource(s.id, v)} /></span>
            </div>
          ))}
          {writer && (
            <div className="grid gap-2 md:grid-cols-6 items-end">
              <div className="md:col-span-2"><Label>{t('ext.name')}</Label><Input value={src.name} onChange={(e) => setSrc({ ...src, name: e.target.value })} /></div>
              <div><Label>{t('ext.provider')}</Label><Input value={src.provider} onChange={(e) => setSrc({ ...src, provider: e.target.value })} /></div>
              <div><Label>{t('ext.kind')}</Label>
                <Select value={src.kind} onValueChange={(v) => setSrc({ ...src, kind: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{t(`ext.kind.${k}`)}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('ext.freshness')}</Label><Input type="number" min={1} value={src.freshness_days} onChange={(e) => setSrc({ ...src, freshness_days: Math.max(1, Number(e.target.value)) })} /></div>
              <Button onClick={addSource}>{t('ext.addSource')}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{t('ext.observations')}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {writer && sources.length > 0 && (
            <div className="grid gap-2 md:grid-cols-6 items-end">
              <div><Label>{t('ext.sources')}</Label>
                <Select value={obs.source_id} onValueChange={(v) => setObs({ ...obs, source_id: v })}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent>{sources.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>{t('ext.obsTitle')}</Label><Input value={obs.title} onChange={(e) => setObs({ ...obs, title: e.target.value })} /></div>
              <div><Label>{t('ext.value')}</Label><Input value={obs.value} onChange={(e) => setObs({ ...obs, value: e.target.value })} /></div>
              <div><Label>{t('ext.reference')}</Label><Input value={obs.reference_url} onChange={(e) => setObs({ ...obs, reference_url: e.target.value })} /></div>
              <div><Label>{t('ext.published')}</Label><Input type="date" value={obs.published_at} onChange={(e) => setObs({ ...obs, published_at: e.target.value })} /></div>
              <Button onClick={addObs}>{t('ext.addObs')}</Button>
              <div className="md:col-span-6"><Label>{t('ext.summary')}</Label><Input value={obs.summary} onChange={(e) => setObs({ ...obs, summary: e.target.value })} /></div>
            </div>
          )}
          {(q.data?.obs ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t('ext.empty')}</p> : (q.data?.obs ?? []).map((o: any) => {
            const s: any = sources.find((x: any) => x.id === o.source_id);
            const stale = s ? isStale(o.published_at, s.freshness_days) : true;
            return (
              <div key={o.id} className="rounded border p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{o.title}</span>{o.value && <Badge variant="outline">{o.value}</Badge>}{stale && <Badge variant="destructive">{t('di.outdated')}</Badge>}</div>
                {o.summary && <p className="text-xs mt-1">{o.summary}</p>}
                <p className="text-xs text-muted-foreground mt-1">{s?.name} · {t('ext.published')}: {new Date(o.published_at).toLocaleDateString(locale)} · {t('ext.retrieved')}: {new Date(o.retrieved_at).toLocaleString(locale)}{o.reference_url && <> · <a className="underline" href={o.reference_url} target="_blank" rel="noreferrer">{t('ext.reference')}</a></>}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
