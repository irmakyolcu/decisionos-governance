import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useLanguage, getLocale } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { OUTBOUND_EVENTS, INBOUND_TYPES } from '../../supabase/functions/_shared/integrationRules';

type Row = Record<string, any>;
const CFG_KINDS = ['inbound_api', 'outbound_webhooks', 'slack'] as const;
const INBOUND_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/integration-inbound`;
const ACTIONS = ['notify', 'escalate', 'create_task', 'block_next_step'] as const;

async function fnError(error: any) {
  try { const body = await error?.context?.json?.(); return body?.message || body?.error || error.message; } catch { return error?.message ?? String(error); }
}

export default function IntegrationHubPage() {
  const { workspace, role } = useWorkspace();
  const { t, language } = useLanguage();
  const ws = workspace?.id;
  const isAdmin = role === 'admin';
  const canView = role === 'admin' || role === 'auditor';
  const fmt = (d?: string | null) => (d ? new Date(d).toLocaleString(getLocale(language)) : t('ih.never'));

  const [configs, setConfigs] = useState<Row[]>([]);
  const [inbound, setInbound] = useState<Row[]>([]);
  const [endpoints, setEndpoints] = useState<Row[]>([]);
  const [deliveries, setDeliveries] = useState<Row[]>([]);
  const [allow, setAllow] = useState<Row[]>([]);
  const [suggestions, setSuggestions] = useState<Row[]>([]);
  const [rules, setRules] = useState<Row[]>([]);
  const [ruleRuns, setRuleRuns] = useState<Row[]>([]);
  const [runs, setRuns] = useState<Row[]>([]);
  const [inboundKeys, setInboundKeys] = useState(0);
  const [members, setMembers] = useState<{ id: string; name: string }[]>([]);

  const load = useCallback(async () => {
    if (!ws) return;
    const q = (table: string, order = 'created_at') => (supabase.from(table as any) as any).select('*').eq('workspace_id', ws).order(order, { ascending: false }).limit(50);
    const [c, i, e, d, a, s, r, rr, l, k, m] = await Promise.all([
      q('integration_configs'), q('inbound_events', 'received_at'),
      (supabase.from('webhook_endpoints' as any) as any).select('id,name,url,events,enabled,created_at').eq('workspace_id', ws).order('created_at', { ascending: false }),
      (supabase.from('webhook_deliveries' as any) as any).select('*, event:outbound_events(event_type, created_at), endpoint:webhook_endpoints(name)').eq('workspace_id', ws).order('created_at', { ascending: false }).limit(50),
      q('slack_channel_allowlist'), (supabase.from('extraction_suggestions' as any) as any).select('*').eq('workspace_id', ws).eq('status', 'pending').order('created_at', { ascending: false }),
      q('automation_rules'), q('automation_runs'), q('integration_runs'),
      supabase.from('api_keys').select('scopes').eq('workspace_id', ws).is('revoked_at', null),
      supabase.from('workspace_members').select('user_id').eq('workspace_id', ws),
    ]);
    const firstErr = [c, i, e, d, a, s, r, rr, l].find((x: any) => x.error);
    if (firstErr) toast.error((firstErr as any).error.message);
    setConfigs(c.data ?? []); setInbound(i.data ?? []); setEndpoints(e.data ?? []); setDeliveries(d.data ?? []);
    setAllow(a.data ?? []); setSuggestions(s.data ?? []); setRules(r.data ?? []); setRuleRuns(rr.data ?? []); setRuns(l.data ?? []);
    setInboundKeys((k.data ?? []).filter((x: any) => x.scopes?.includes('inbound:write') || x.scopes?.includes('*')).length);
    const ids = (m.data ?? []).map((x: any) => x.user_id);
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id, full_name, email').in('id', ids);
      setMembers(ids.map((id: string) => { const pr: any = p?.find((x: any) => x.id === id); return { id, name: pr?.full_name || pr?.email || id.slice(0, 8) }; }));
    }
  }, [ws]);
  useEffect(() => { load(); }, [load]);

  if (!canView) return <div className="p-6"><Card><CardContent className="p-6 text-muted-foreground">{t('ih.noAccess')}</CardContent></Card></div>;

  // ---------- Overview ----------
  const cfgFor = (kind: string) => configs.find((c) => c.kind === kind);
  const effectiveStatus = (kind: string) => {
    const c = cfgFor(kind);
    if (c && !c.enabled) return 'disabled';
    if (kind === 'inbound_api') return inboundKeys ? (c?.status === 'error' ? 'error' : c?.last_sync_at ? 'connected' : 'not_configured') : 'not_configured';
    if (kind === 'outbound_webhooks') return endpoints.some((e) => e.enabled) ? (deliveries.some((d) => d.status === 'failed') ? 'error' : 'connected') : 'not_configured';
    return c?.status ?? 'not_configured';
  };
  const upsertCfg = async (kind: string, patch: Row) => {
    const c = cfgFor(kind);
    const { error } = c
      ? await (supabase.from('integration_configs' as any) as any).update(patch).eq('id', c.id)
      : await (supabase.from('integration_configs' as any) as any).insert({ workspace_id: ws, kind, name: kind, enabled: false, ...patch });
    if (error) toast.error(error.message); else { toast.success(t('ih.saved')); load(); }
  };
  const testSlack = async () => {
    const { data, error } = await supabase.functions.invoke('meeting-sync', { body: { action: 'test', connector_id: 'slack' } });
    const msg = error ? await fnError(error) : data?.error;
    if (error || !data?.ok) {
      toast.error(`${t('ih.testFail')}: ${msg === 'not_connected' ? t('ih.slack.notConnected') : msg}`);
      await upsertCfg('slack', { status: 'error', last_error: String(msg ?? '').slice(0, 300) });
    } else { toast.success(`${t('ih.testOk')}: ${data.team ?? ''}`); await upsertCfg('slack', { status: 'connected', last_error: null, last_sync_at: new Date().toISOString() }); }
  };

  const statusBadge = (s: string) => <Badge variant={s === 'connected' ? 'default' : s === 'error' ? 'destructive' : 'secondary'}>{t(`ih.status.${s}`)}</Badge>;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-6xl">
      <div>
        <h1 className="text-2xl font-semibold">{t('ih.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('ih.subtitle')}</p>
        {!isAdmin && <p className="text-xs text-muted-foreground mt-1">{t('ih.adminOnly')}</p>}
      </div>
      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap h-auto">
          {['overview', 'inbound', 'webhooks', 'slack', 'automation', 'logs'].map((k) => <TabsTrigger key={k} value={k}>{t(`ih.tab.${k}`)}</TabsTrigger>)}
        </TabsList>

        <TabsContent value="overview" className="grid gap-3 md:grid-cols-3">
          {CFG_KINDS.map((kind) => {
            const c = cfgFor(kind); const st = effectiveStatus(kind);
            return (
              <Card key={kind}>
                <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">{t(`ih.cfg.${kind}`)}</CardTitle>{statusBadge(st)}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-muted-foreground">{t('ih.lastSync')}: {fmt(c?.last_sync_at)}</div>
                  {c?.last_error && <div className="text-destructive text-xs break-words">{t('ih.lastError')}: {c.last_error}</div>}
                  <div className="flex items-center gap-2">
                    <Switch disabled={!isAdmin} checked={!!c?.enabled} onCheckedChange={(v) => upsertCfg(kind, { enabled: v })} id={`en-${kind}`} />
                    <Label htmlFor={`en-${kind}`}>{t('ih.enabled')}</Label>
                  </div>
                  {kind === 'slack' && isAdmin && <Button size="sm" variant="outline" onClick={testSlack}>{t('ih.test')}</Button>}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="inbound" className="space-y-3">
          <Card><CardContent className="p-4 space-y-3 text-sm">
            <p>{t('ih.inbound.howto')}</p>
            {!inboundKeys && <p className="text-destructive">{t('ih.inbound.noKey')}</p>}
            <div className="flex gap-2 items-center"><code className="text-xs bg-muted p-2 rounded break-all flex-1">POST {INBOUND_URL}</code>
              <Button size="icon" variant="ghost" onClick={() => { navigator.clipboard.writeText(INBOUND_URL); toast.success('OK'); }}><Copy className="h-4 w-4" /></Button></div>
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{`{"source":"erp","external_id":"evt-123","type":"decision","data":{"title":"...","description":"..."}}`}</pre>
            <div>
              <Label>{t('ih.allowedTypes')}</Label>
              <div className="flex flex-wrap gap-3 mt-1">
                {INBOUND_TYPES.map((ty) => {
                  const cur: string[] = cfgFor('inbound_api')?.allowed_data_types ?? [];
                  return <label key={ty} className="flex items-center gap-1 text-xs"><Checkbox disabled={!isAdmin} checked={cur.includes(ty)}
                    onCheckedChange={(v) => upsertCfg('inbound_api', { allowed_data_types: v ? [...cur, ty] : cur.filter((x) => x !== ty) })} />{ty}</label>;
                })}
              </div>
            </div>
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{t('ih.inbound.events')}</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">
            {inbound.length === 0 && <p className="text-muted-foreground">{t('ih.logs.empty')}</p>}
            {inbound.map((e) => <div key={e.id} className="flex flex-wrap gap-2 border-b py-1"><Badge variant={e.status === 'failed' ? 'destructive' : 'secondary'}>{e.status}</Badge><span>{e.event_type}</span><span className="text-muted-foreground">{e.source}/{e.external_id}</span><span className="ml-auto text-muted-foreground">{fmt(e.received_at)}</span>{e.error && <span className="text-destructive w-full">{e.error}</span>}</div>)}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-3">
          {isAdmin && <WebhookForm ws={ws!} onDone={load} />}
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {endpoints.length === 0 && <p className="text-muted-foreground">{t('ih.webhooks.none')}</p>}
            {endpoints.map((e) => (
              <div key={e.id} className="flex flex-wrap items-center gap-2 border-b pb-2">
                <span className="font-medium">{e.name}</span><span className="text-xs text-muted-foreground break-all">{e.url}</span>
                <div className="flex flex-wrap gap-1">{e.events.map((ev: string) => <Badge key={ev} variant="outline">{t(`ih.ev.${ev}`)}</Badge>)}</div>
                {isAdmin && <div className="ml-auto flex gap-1 items-center">
                  <Switch checked={e.enabled} onCheckedChange={async (v) => { const { error } = await (supabase.from('webhook_endpoints' as any) as any).update({ enabled: v }).eq('id', e.id); if (error) toast.error(error.message); load(); }} />
                  <Button size="sm" variant="outline" onClick={async () => {
                    const { data, error } = await supabase.functions.invoke('webhook-dispatch', { body: { action: 'test', endpoint_id: e.id } });
                    if (error || !data?.ok) toast.error(`${t('ih.testFail')}: ${error ? await fnError(error) : data?.error}`); else toast.success(`${t('ih.testOk')} (HTTP ${data.status_code})`);
                    load();
                  }}>{t('ih.test')}</Button>
                  <Button size="icon" variant="ghost" onClick={async () => { const { error } = await (supabase.from('webhook_endpoints' as any) as any).delete().eq('id', e.id); if (error) toast.error(error.message); load(); }}><Trash2 className="h-4 w-4" /></Button>
                </div>}
              </div>))}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{t('ih.webhooks.deliveries')}</CardTitle></CardHeader><CardContent className="space-y-1 text-xs">
            {deliveries.length === 0 && <p className="text-muted-foreground">{t('ih.logs.empty')}</p>}
            {deliveries.map((d) => (
              <div key={d.id} className="flex flex-wrap gap-2 items-center border-b py-1">
                <Badge variant={d.status === 'failed' ? 'destructive' : d.status === 'delivered' ? 'default' : 'secondary'}>{d.status}</Badge>
                <span>{t(`ih.ev.${d.event?.event_type}`)}</span><span className="text-muted-foreground">{d.endpoint?.name}</span>
                <span>{t('ih.attempts')}: {d.attempts}</span>{d.last_status_code && <span>HTTP {d.last_status_code}</span>}
                <span className="ml-auto text-muted-foreground">{fmt(d.created_at)}</span>
                {d.status === 'failed' && isAdmin && <Button size="sm" variant="outline" onClick={async () => { const { error } = await supabase.rpc('retry_webhook_delivery' as any, { _delivery: d.id }); if (error) toast.error(error.message); else { await supabase.functions.invoke('webhook-dispatch', { body: {} }); load(); } }}><RefreshCw className="h-3 w-3 mr-1" />{t('ih.webhooks.retry')}</Button>}
                {d.last_error && <span className="text-destructive w-full break-words">{d.last_error}</span>}
              </div>))}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="slack" className="space-y-3">
          <SlackPanel ws={ws!} isAdmin={isAdmin} allow={allow} suggestions={suggestions} members={members} onDone={load} />
        </TabsContent>

        <TabsContent value="automation" className="space-y-3">
          {isAdmin && <RuleForm ws={ws!} onDone={load} />}
          <Card><CardContent className="p-4 space-y-2 text-sm">
            {rules.length === 0 && <p className="text-muted-foreground">{t('ih.rules.none')}</p>}
            {rules.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-2 border-b pb-2">
                <span className="font-medium">{r.name}</span><Badge variant="outline">{t(`ih.ev.${r.event_type}`)}</Badge>
                {Object.keys(r.conditions ?? {}).length > 0 && <code className="text-xs">{JSON.stringify(r.conditions)}</code>}
                <span className="text-xs text-muted-foreground">{(r.actions ?? []).map((a: Row) => `${t(`ih.act.${a.type}`)}${a.target ? ` → ${t(`ih.target.${a.target}`)}` : ''}`).join(' · ')}</span>
                {isAdmin && <div className="ml-auto flex gap-1 items-center">
                  <Switch checked={r.enabled} onCheckedChange={async (v) => { const { error } = await (supabase.from('automation_rules' as any) as any).update({ enabled: v }).eq('id', r.id); if (error) toast.error(error.message); load(); }} />
                  <Button size="icon" variant="ghost" onClick={async () => { const { error } = await (supabase.from('automation_rules' as any) as any).delete().eq('id', r.id); if (error) toast.error(error.message); load(); }}><Trash2 className="h-4 w-4" /></Button>
                </div>}
              </div>))}
          </CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">{t('ih.rules.runs')}</CardTitle></CardHeader><CardContent className="text-xs space-y-1">
            {ruleRuns.length === 0 && <p className="text-muted-foreground">{t('ih.logs.empty')}</p>}
            {ruleRuns.map((r) => <div key={r.id} className="flex gap-2 border-b py-1"><Badge variant={r.status === 'failed' ? 'destructive' : 'secondary'}>{r.status}</Badge><span>{rules.find((x) => x.id === r.rule_id)?.name}</span><span className="text-muted-foreground truncate">{JSON.stringify(r.detail)}</span><span className="ml-auto text-muted-foreground">{fmt(r.created_at)}</span></div>)}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="logs">
          <Card><CardContent className="p-4 text-xs space-y-1">
            {runs.length === 0 && <p className="text-muted-foreground">{t('ih.logs.empty')}</p>}
            {runs.map((r) => <div key={r.id} className="flex flex-wrap gap-2 border-b py-1"><Badge variant={r.status === 'failed' ? 'destructive' : 'secondary'}>{r.status}</Badge><span>{r.kind}</span><span className="ml-auto text-muted-foreground">{fmt(r.created_at)}</span>{r.error && <span className="text-destructive w-full break-words">{r.error}</span>}</div>)}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function WebhookForm({ ws, onDone }: { ws: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(''); const [url, setUrl] = useState(''); const [events, setEvents] = useState<string[]>([]);
  const [secret, setSecret] = useState<string | null>(null);
  const submit = async () => {
    const { data, error } = await supabase.rpc('create_webhook_endpoint' as any, { _workspace: ws, _name: name, _url: url, _events: events });
    if (error) return toast.error(error.message);
    setSecret((data as any).secret); setName(''); setUrl(''); setEvents([]); onDone();
  };
  return (
    <Card><CardHeader><CardTitle className="text-base">{t('ih.webhooks.add')}</CardTitle></CardHeader><CardContent className="space-y-2">
      <div className="grid md:grid-cols-2 gap-2"><Input placeholder={t('ih.webhooks.name')} value={name} onChange={(e) => setName(e.target.value)} /><Input placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} /></div>
      <div className="flex flex-wrap gap-3">{OUTBOUND_EVENTS.map((ev) => <label key={ev} className="flex items-center gap-1 text-xs"><Checkbox checked={events.includes(ev)} onCheckedChange={(v) => setEvents(v ? [...events, ev] : events.filter((x) => x !== ev))} />{t(`ih.ev.${ev}`)}</label>)}</div>
      <Button size="sm" disabled={!name || !url || !events.length} onClick={submit}>{t('ih.webhooks.add')}</Button>
      {secret && <div className="text-xs space-y-1 border rounded p-2"><p>{t('ih.webhooks.secretOnce')}</p><div className="flex gap-2 items-center"><code className="break-all flex-1">{secret}</code><Button size="icon" variant="ghost" onClick={() => navigator.clipboard.writeText(secret)}><Copy className="h-4 w-4" /></Button></div></div>}
    </CardContent></Card>
  );
}

function RuleForm({ ws, onDone }: { ws: string; onDone: () => void }) {
  const { t } = useLanguage();
  const [name, setName] = useState(''); const [ev, setEv] = useState<string>('step.quality_failed'); const [cond, setCond] = useState('{}');
  const [acts, setActs] = useState<Row[]>([]); const [title, setTitle] = useState('');
  const save = async (rule: Row) => {
    const { error } = await (supabase.from('automation_rules' as any) as any).insert({ workspace_id: ws, ...rule });
    if (error) toast.error(error.message); else { toast.success(t('ih.saved')); setName(''); setActs([]); setCond('{}'); onDone(); }
  };
  const submit = () => {
    let conditions: Row;
    try { conditions = JSON.parse(cond || '{}'); if (!conditions || typeof conditions !== 'object' || Array.isArray(conditions)) throw 0; } catch { return toast.error(t('ih.invalidJson')); }
    save({ name, event_type: ev, conditions, actions: acts.map((a) => (a.type === 'create_task' ? { ...a, title: title || name } : a)) });
  };
  const toggle = (type: string) => setActs(acts.some((a) => a.type === type) ? acts.filter((a) => a.type !== type) : [...acts, { type, target: type === 'escalate' || type === 'block_next_step' ? undefined : 'quality_owner' }]);
  return (
    <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">{t('ih.rules.add')}</CardTitle>
      <Button size="sm" variant="outline" onClick={() => save({ name: 'Quality failure → corrective work', event_type: 'step.quality_failed', conditions: {}, actions: [
        { type: 'create_task', target: 'quality_owner', title: 'Corrective action' }, { type: 'notify', target: 'quality_owner', message: 'Quality inspection failed' }, { type: 'block_next_step' }] })}>{t('ih.rules.template')}</Button>
    </CardHeader><CardContent className="space-y-2">
      <div className="grid md:grid-cols-2 gap-2">
        <Input placeholder={t('ih.webhooks.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <Select value={ev} onValueChange={setEv}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{OUTBOUND_EVENTS.map((e) => <SelectItem key={e} value={e}>{t(`ih.ev.${e}`)}</SelectItem>)}</SelectContent></Select>
      </div>
      <Label className="text-xs">{t('ih.rules.conditions')}</Label><Textarea rows={2} value={cond} onChange={(e) => setCond(e.target.value)} />
      <Label className="text-xs">{t('ih.rules.actions')}</Label>
      <div className="flex flex-wrap gap-3">{ACTIONS.map((a) => <label key={a} className="flex items-center gap-1 text-xs"><Checkbox checked={acts.some((x) => x.type === a)} onCheckedChange={() => toggle(a)} />{t(`ih.act.${a}`)}</label>)}</div>
      {acts.some((a) => a.type === 'create_task') && <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} />}
      <Button size="sm" disabled={!name || !acts.length} onClick={submit}>{t('ih.rules.add')}</Button>
    </CardContent></Card>
  );
}

function SlackPanel({ ws, isAdmin, allow, suggestions, members, onDone }: { ws: string; isAdmin: boolean; allow: Row[]; suggestions: Row[]; members: { id: string; name: string }[]; onDone: () => void }) {
  const { t } = useLanguage();
  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [priv, setPriv] = useState<Record<string, boolean>>({});
  const [owner, setOwner] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const loadChannels = async () => {
    const { data, error } = await supabase.functions.invoke('meeting-sync', { body: { action: 'list', connector_id: 'slack' } });
    if (error) { const m = await fnError(error); return toast.error(m === 'not_connected' ? t('ih.slack.notConnected') : m); }
    setChannels(data?.sources ?? []);
  };
  const add = async (c: { id: string; name: string }) => {
    const { error } = await (supabase.from('slack_channel_allowlist' as any) as any).insert({ workspace_id: ws, channel_id: c.id, channel_name: c.name, is_private: !!priv[c.id], private_authorized: !!priv[c.id] });
    if (error) toast.error(error.message); else onDone();
  };
  const extract = async (channel: string) => {
    setBusy(channel);
    const { data, error } = await supabase.functions.invoke('meeting-sync', { body: { action: 'extract', connector_id: 'slack', source_id: channel } });
    setBusy(null);
    if (error) return toast.error(await fnError(error));
    toast.success(`${data?.suggestions ?? 0}`); onDone();
  };
  const review = async (id: string, accept: boolean) => {
    const { error } = await supabase.rpc('review_extraction_suggestion' as any, { _id: id, _accept: accept, _owner: owner[id] || null });
    if (error) toast.error(error.message); else onDone();
  };
  return (<>
    <Card><CardHeader className="flex-row items-center justify-between space-y-0"><CardTitle className="text-base">{t('ih.slack.allowlist')}</CardTitle>
      {isAdmin && <Button size="sm" variant="outline" onClick={loadChannels}>{t('ih.slack.loadChannels')}</Button>}</CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xs text-muted-foreground">{t('ih.slack.noDm')}</p>
        {allow.map((a) => <div key={a.id} className="flex flex-wrap items-center gap-2 border-b pb-1"><span>{a.channel_name || a.channel_id}</span>{a.is_private && <Badge variant="outline">private</Badge>}
          <div className="ml-auto flex gap-1"><Button size="sm" variant="outline" disabled={busy === a.channel_id} onClick={() => extract(a.channel_id)}>{t('ih.slack.extract')}</Button>
            {isAdmin && <Button size="sm" variant="ghost" onClick={async () => { await (supabase.from('slack_channel_allowlist' as any) as any).delete().eq('id', a.id); onDone(); }}>{t('ih.slack.remove')}</Button>}</div></div>)}
        {channels.filter((c) => !allow.some((a) => a.channel_id === c.id)).map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-2 text-xs"><span>{c.name}</span>
            <label className="flex items-center gap-1"><Checkbox checked={!!priv[c.id]} onCheckedChange={(v) => setPriv({ ...priv, [c.id]: !!v })} />{t('ih.slack.private')}</label>
            <Button size="sm" variant="outline" className="ml-auto" onClick={() => add(c)}>{t('ih.slack.allow')}</Button></div>))}
      </CardContent></Card>
    <Card><CardHeader><CardTitle className="text-base">{t('ih.slack.review')}</CardTitle></CardHeader><CardContent className="space-y-2 text-sm">
      <p className="text-xs text-muted-foreground">{t('ih.slack.reviewHint')}</p>
      {suggestions.length === 0 && <p className="text-muted-foreground">{t('ih.noPending')}</p>}
      {suggestions.map((s) => (
        <div key={s.id} className="border rounded p-2 space-y-1">
          <div className="flex gap-2 items-center"><Badge>{t(`ih.kind.${s.kind}`)}</Badge><span className="font-medium">{s.title}</span></div>
          {s.quote && <p className="text-xs text-muted-foreground italic">“{s.quote}”</p>}
          <div className="text-xs text-muted-foreground">{t('ih.owner')}: {s.owner_hint ?? '—'} · {t('ih.due')}: {s.due_hint ?? '—'}</div>
          <div className="flex flex-wrap gap-2 items-center">
            <Select value={owner[s.id] ?? ''} onValueChange={(v) => setOwner({ ...owner, [s.id]: v })}><SelectTrigger className="w-48 h-8"><SelectValue placeholder={t('ih.owner')} /></SelectTrigger>
              <SelectContent>{members.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent></Select>
            <Button size="sm" onClick={() => review(s.id, true)}>{t('ih.accept')}</Button>
            <Button size="sm" variant="ghost" onClick={() => review(s.id, false)}>{t('ih.reject')}</Button>
          </div>
        </div>))}
    </CardContent></Card>
  </>);
}
