import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Loader2, Paperclip } from 'lucide-react';
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

export function GmailSyncPanel({ decisionId, defaultQuery }: { decisionId: string; defaultQuery?: string }) {
  const [items, setItems] = useState<Evidence[]>([]);
  const [query, setQuery] = useState(defaultQuery ?? '');
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('decision_evidence')
      .select('id, source, source_date, owner, summary, created_at')
      .eq('decision_id', decisionId)
      .like('source', 'gmail:%')
      .order('source_date', { ascending: false })
      .limit(50);
    setItems((data ?? []) as Evidence[]);
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
      <div className="p-3 border-b border-border">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Gmail search (e.g. from:cfo@acme.com subject:"Q3 plan")'
          className="w-full text-xs bg-muted rounded-lg px-3 py-2 outline-none font-mono"
        />
        <p className="text-[10px] text-muted-foreground mt-1">Empty = search by decision title. Uses standard Gmail operators.</p>
      </div>
      <div className="divide-y divide-border/50 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-xs text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-xs text-muted-foreground">No Gmail context yet. Click "Sync now" to pull related emails.</div>
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
