import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plug, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CATALOG, CATEGORY_LABELS, type CatalogEntry, type IntegrationCategory } from '@/data/integrationsCatalog';

type Integration = {
  id: string;
  provider: string;
  display_name: string;
  kind: string;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
  config: Record<string, unknown>;
};


export default function IntegrationsPage() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = role === 'admin';
  const [items, setItems] = useState<Integration[]>([]);
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspace.id);
    setItems((data ?? []) as Integration[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const byProvider = (p: string) => items.find((i) => i.provider === p);

  const connect = async (entry: typeof CATALOG[number]) => {
    if (!workspace || !user || !isAdmin) return;
    setBusyProvider(entry.provider);
    try {
      const existing = byProvider(entry.provider);
      const payload = {
        workspace_id: workspace.id,
        provider: entry.provider,
        display_name: entry.display_name,
        kind: entry.kind,
        status: 'connected' as const,
        last_synced_at: new Date().toISOString(),
        config: { simulated: true, connected_by: user.id },
        created_by: user.id,
      };
      if (existing) {
        await supabase.from('integrations').update(payload).eq('id', existing.id);
      } else {
        await supabase.from('integrations').insert(payload);
      }
      toast.success(`${entry.display_name} connected (simulated)`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setBusyProvider(null);
    }
  };

  const disconnect = async (entry: typeof CATALOG[number]) => {
    const existing = byProvider(entry.provider);
    if (!existing || !isAdmin) return;
    setBusyProvider(entry.provider);
    await supabase.from('integrations').update({ status: 'disconnected' }).eq('id', existing.id);
    toast.success(`${entry.display_name} disconnected`);
    setBusyProvider(null);
    load();
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Plug className="h-6 w-6 text-primary" /> Integrations
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect external systems used by the Execution Engine. Phase 3 connections are simulated — real OAuth and MCP wiring is enabled per provider on request.
        </p>
        {!isAdmin && (
          <p className="text-xs text-warning mt-2">Workspace admins manage integrations.</p>
        )}
      </div>

      {loading ? (
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Loading…</CardContent></Card>
      ) : (
        <div className="space-y-8">
          {(Object.keys(CATEGORY_LABELS) as CatalogEntry['category'][]).map((cat) => {
            const entries = CATALOG.filter((e) => e.category === cat);
            if (!entries.length) return null;
            return (
              <div key={cat}>
                <h2 className="text-sm font-semibold text-foreground/80 uppercase tracking-wide mb-3">{CATEGORY_LABELS[cat]}</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {entries.map((entry) => {
                    const existing = byProvider(entry.provider);
                    const connected = existing?.status === 'connected';
                    return (
                      <Card key={entry.provider}>
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle className="text-base">{entry.display_name}</CardTitle>
                              <p className="text-xs text-muted-foreground mt-1">{entry.description}</p>
                            </div>
                            <Badge variant="outline" className={connected ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
                              {connected ? <><Check className="h-3 w-3 mr-1" />Connected</> : <><X className="h-3 w-3 mr-1" />Not connected</>}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-muted-foreground">
                              {existing?.last_synced_at ? `Last synced ${new Date(existing.last_synced_at).toLocaleString()}` : 'Never synced'}
                            </div>
                            <div className="flex gap-2">
                              {connected ? (
                                <>
                                  <Button size="sm" variant="outline" disabled={!isAdmin || busyProvider === entry.provider} onClick={() => connect(entry)} className="gap-1">
                                    {busyProvider === entry.provider ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                    Sync
                                  </Button>
                                  <Button size="sm" variant="ghost" disabled={!isAdmin} onClick={() => disconnect(entry)}>Disconnect</Button>
                                </>
                              ) : (
                                <Button size="sm" disabled={!isAdmin || busyProvider === entry.provider} onClick={() => connect(entry)} className="gap-1">
                                  {busyProvider === entry.provider && <Loader2 className="h-3 w-3 animate-spin" />}
                                  Connect
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
