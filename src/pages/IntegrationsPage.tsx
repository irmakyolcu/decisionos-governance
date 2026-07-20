import { useEffect, useState } from 'react';
import { Plug, Check, X, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

type Integration = {
  id: string;
  provider: string;
  display_name: string;
  kind: string;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
  config: Record<string, unknown>;
};

type CatalogEntry = { provider: string; display_name: string; kind: string; description: string; category: 'messaging' | 'meetings' | 'productivity' | 'crm' | 'erp' | 'custom' };

const CATALOG: CatalogEntry[] = [
  // Messaging & Collaboration
  { provider: 'slack', display_name: 'Slack', kind: 'connector', category: 'messaging', description: 'Push approval requests and audit notifications to channels.' },
  { provider: 'teams', display_name: 'Microsoft Teams', kind: 'connector', category: 'messaging', description: 'Approval and notification channel for Microsoft 365 orgs.' },
  { provider: 'discord', display_name: 'Discord', kind: 'connector', category: 'messaging', description: 'Route notifications to Discord servers and channels.' },

  // Meetings & Transcription
  { provider: 'zoom', display_name: 'Zoom', kind: 'connector', category: 'meetings', description: 'Import Zoom meeting recordings and transcripts as decision evidence.' },
  { provider: 'google_meet', display_name: 'Google Meet', kind: 'connector', category: 'meetings', description: 'Pull Meet recordings and captions into decision context.' },
  { provider: 'ms_teams_meetings', display_name: 'Teams Meetings', kind: 'connector', category: 'meetings', description: 'Sync Microsoft Teams meeting transcripts and recordings.' },
  { provider: 'fireflies', display_name: 'Fireflies.ai', kind: 'connector', category: 'meetings', description: 'Auto-import AI meeting notes and action items.' },
  { provider: 'otter', display_name: 'Otter.ai', kind: 'connector', category: 'meetings', description: 'Sync Otter transcripts into structured meeting memory.' },
  { provider: 'fathom', display_name: 'Fathom', kind: 'connector', category: 'meetings', description: 'Import Fathom AI meeting summaries and highlights.' },
  { provider: 'gong', display_name: 'Gong', kind: 'connector', category: 'meetings', description: 'Import revenue-call intelligence into decisions.' },

  // Productivity
  { provider: 'gmail', display_name: 'Gmail', kind: 'connector', category: 'productivity', description: 'Send and receive emails as part of approved actions.' },
  { provider: 'google_calendar', display_name: 'Google Calendar', kind: 'connector', category: 'productivity', description: 'Schedule decision review meetings and reminders.' },
  { provider: 'gdrive', display_name: 'Google Drive', kind: 'connector', category: 'productivity', description: 'Attach evidence files to decisions.' },
  { provider: 'notion', display_name: 'Notion', kind: 'connector', category: 'productivity', description: 'Sync Notion docs into the Company Brain.' },
  { provider: 'jira', display_name: 'Jira', kind: 'connector', category: 'productivity', description: 'Create issues from approved action proposals.' },

  // CRM
  { provider: 'salesforce', display_name: 'Salesforce', kind: 'connector', category: 'crm', description: 'Pull deal context and push CRM updates after execution.' },
  { provider: 'hubspot', display_name: 'HubSpot', kind: 'connector', category: 'crm', description: 'Sync customer signals into decision intake.' },

  // ERP
  { provider: 'sap', display_name: 'SAP', kind: 'connector', category: 'erp', description: 'Pull financial actuals for post-decision reviews.' },

  // Custom
  { provider: 'mcp_custom', display_name: 'Custom MCP Server', kind: 'mcp', category: 'custom', description: 'Connect any Model Context Protocol server endpoint.' },
  { provider: 'webhook_custom', display_name: 'Custom Webhook', kind: 'webhook', category: 'custom', description: 'Send events to a custom HTTPS endpoint.' },
];

const CATEGORY_LABELS: Record<CatalogEntry['category'], string> = {
  messaging: 'Messaging & Collaboration',
  meetings: 'Meetings & Transcription',
  productivity: 'Productivity',
  crm: 'CRM',
  erp: 'ERP',
  custom: 'Custom',
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
