import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Loader2, Paperclip, Clock, Power, CalendarClock, Pause, Play, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Evidence = {
  id: string;
  source: string;
  source_date: string | null;
  owner: string | null;
  summary: string | null;
  created_at: string;
};

type Schedule = {
  id: string;
  decision_id: string;
  workspace_id: string;
  query: string | null;
  max_results: number;
  cadence_minutes: number;
  enabled: boolean;
  last_run_at: string | null;
  next_run_at: string;
  last_status: string | null;
  last_count: number | null;
};

const CADENCE_OPTIONS = [
  { label: 'Every 15 min', value: 15 },
  { label: 'Every 30 min', value: 30 },
  { label: 'Hourly', value: 60 },
  { label: 'Every 4 hours', value: 240 },
  { label: 'Daily', value: 1440 },
];

export function GmailSyncPanel({ decisionId, defaultQuery }: { decisionId: string; defaultQuery?: string }) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [query, setQuery] = useState(defaultQuery ?? '');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [cadence, setCadence] = useState(60);
  const [scheduling, setScheduling] = useState(false);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: sched }] = await Promise.all([
      supabase
        .from('decision_evidence')
        .select('id, source, source_date, owner, summary, created_at')
        .eq('decision_id', decisionId)
        .like('source', 'gmail:%')
        .order('source_date', { ascending: false })
        .limit(50),
      (supabase as any)
        .from('gmail_sync_schedules')
        .select('*')
        .eq('decision_id', decisionId)
        .maybeSingle(),
    ]);
    setItems((ev ?? []) as Evidence[]);
    const s = (sched ?? null) as Schedule | null;
    setSchedule(s);
    if (s) {
      setCadence(s.cadence_minutes);
      if (s.query) setQuery(s.query);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [decisionId]);

  const sync = async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('gmail-sync', {
        body: { decision_id: decisionId, query: query || undefined, max: 10 },
      });
      if (error) throw error;
      toast({ title: 'Gmail synced', description: `${data?.count ?? 0} message(s) attached to this decision.` });
      load();
    } catch (e: any) {
      toast({ title: 'Gmail sync failed', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const saveSchedule = async (enabled: boolean) => {
    setScheduling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not signed in');
      const { data: dec } = await supabase.from('decisions').select('workspace_id').eq('id', decisionId).maybeSingle();
      if (!dec) throw new Error('Decision not found');

      const payload = {
        decision_id: decisionId,
        workspace_id: (dec as any).workspace_id,
        query: query || null,
        cadence_minutes: cadence,
        max_results: 10,
        enabled,
        created_by: user.id,
        next_run_at: new Date().toISOString(),
      };
      const { data, error } = await (supabase as any)
        .from('gmail_sync_schedules')
        .upsert(payload, { onConflict: 'decision_id' })
        .select()
        .maybeSingle();
      if (error) throw error;
      setSchedule(data as Schedule);
      toast({
        title: enabled ? 'Auto-sync enabled' : 'Auto-sync paused',
        description: enabled ? `Running every ${cadence} minute(s).` : 'No more scheduled runs until re-enabled.',
      });
    } catch (e: any) {
      toast({ title: 'Schedule failed', description: e.message ?? String(e), variant: 'destructive' });
    } finally {
      setScheduling(false);
    }
  };

  const removeSchedule = async () => {
    if (!schedule) return;
    setScheduling(true);
    try {
      const { error } = await (supabase as any).from('gmail_sync_schedules').delete().eq('id', schedule.id);
      if (error) throw error;
      setSchedule(null);
      toast({ title: 'Auto-sync removed' });
    } finally {
      setScheduling(false);
    }
  };

  return (
    <div className="enterprise-card">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm text-foreground">Gmail Context</h3>
          <span className="text-xs text-muted-foreground">({items.length})</span>
        </div>
        <button
          onClick={sync}
          disabled={syncing}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50 flex items-center gap-1"
        >
          {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Sync now
        </button>
      </div>

      <div className="p-3 border-b border-border space-y-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Gmail search (e.g. from:cfo@acme.com subject:"Q3 plan")'
          className="w-full text-xs bg-muted rounded-lg px-3 py-2 outline-none font-mono"
        />
        <p className="text-[10px] text-muted-foreground">Empty = search by decision title. Uses standard Gmail operators.</p>
      </div>

      {/* Scheduler */}
      <div className="p-3 border-b border-border bg-muted/30 space-y-2">
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Auto-sync schedule</span>
          {schedule?.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-600 font-medium">ACTIVE</span>
          )}
          {schedule && !schedule.enabled && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">PAUSED</span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={cadence}
            onChange={(e) => setCadence(Number(e.target.value))}
            className="text-xs bg-background border border-border rounded px-2 py-1.5"
          >
            {CADENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => saveSchedule(true)}
            disabled={scheduling}
            className="px-2.5 py-1.5 rounded text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 flex items-center gap-1"
          >
            {scheduling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Power className="h-3 w-3" />}
            {schedule?.enabled ? 'Update' : 'Enable auto-sync'}
          </button>
          {schedule?.enabled && (
            <button
              onClick={() => saveSchedule(false)}
              disabled={scheduling}
              className="px-2.5 py-1.5 rounded text-xs font-medium bg-muted text-foreground hover:bg-muted/70 disabled:opacity-50"
            >
              Pause
            </button>
          )}
          {schedule && (
            <button
              onClick={removeSchedule}
              disabled={scheduling}
              className="px-2.5 py-1.5 rounded text-xs font-medium text-destructive hover:bg-destructive/10"
            >
              Remove
            </button>
          )}
        </div>
        {schedule && (
          <div className="text-[10px] text-muted-foreground space-y-0.5">
            <p>
              Last run: {schedule.last_run_at ? new Date(schedule.last_run_at).toLocaleString() : '—'}
              {schedule.last_status && <> · status <span className="font-mono">{schedule.last_status}</span></>}
              {schedule.last_count != null && <> · {schedule.last_count} new</>}
            </p>
            <p>Next run: {schedule.enabled ? new Date(schedule.next_run_at).toLocaleString() : 'paused'}</p>
          </div>
        )}
      </div>

      <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No Gmail context yet. Click "Sync now" or enable auto-sync.</div>
        ) : (
          items.map((it) => {
            const lines = (it.summary ?? '').split('\n');
            const subject = lines[0]?.replace(/^\[Gmail\]\s*/, '') ?? '(no subject)';
            const attachLine = lines.find(l => l.startsWith('Attachments:'));
            const body = lines.slice(attachLine ? 4 : 3).join(' ').trim();
            return (
              <div key={it.id} className="p-3">
                <p className="text-sm font-medium text-foreground">{subject}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{it.owner} · {it.source_date}</p>
                {attachLine && (
                  <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                    <Paperclip className="h-3 w-3" />
                    {attachLine.replace('Attachments: ', '')}
                  </p>
                )}
                {body && <p className="text-xs text-muted-foreground mt-2 line-clamp-3">{body}</p>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
