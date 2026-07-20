import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, X, Loader2, RefreshCw, Plug, ArrowRight, Shield, Database, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CATEGORY_LABELS, CATEGORY_PROFILES, findEntry } from '@/data/integrationsCatalog';

type Integration = {
  id: string;
  provider: string;
  display_name: string;
  kind: string;
  status: 'connected' | 'disconnected' | 'error';
  last_synced_at: string | null;
  config: Record<string, unknown>;
};

export default function IntegrationDetailPage() {
  const { provider = '' } = useParams();
  const navigate = useNavigate();
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const isAdmin = role === 'admin';
  const entry = useMemo(() => findEntry(provider), [provider]);
  const profile = entry ? CATEGORY_PROFILES[entry.category] : null;

  const [integration, setIntegration] = useState<Integration | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!workspace || !entry) return;
    setLoading(true);
    const { data } = await supabase
      .from('integrations')
      .select('*')
      .eq('workspace_id', workspace.id)
      .eq('provider', entry.provider)
      .maybeSingle();
    setIntegration((data as Integration) ?? null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id, entry?.provider]);

  if (!entry || !profile) {
    return (
      <div className="p-6 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate('/integrations')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to integrations
        </Button>
        <Card><CardContent className="p-8 text-sm text-muted-foreground">Unknown integration.</CardContent></Card>
      </div>
    );
  }

  const connected = integration?.status === 'connected';

  const connect = async () => {
    if (!workspace || !user || !isAdmin) return;
    setBusy(true);
    try {
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
      if (integration) {
        await supabase.from('integrations').update(payload).eq('id', integration.id);
      } else {
        await supabase.from('integrations').insert(payload);
      }
      toast.success(`${entry.display_name} connected (simulated)`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Connect failed');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    if (!integration || !isAdmin) return;
    setBusy(true);
    await supabase.from('integrations').update({ status: 'disconnected' }).eq('id', integration.id);
    toast.success(`${entry.display_name} disconnected`);
    setBusy(false);
    load();
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/integrations')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <Badge variant="outline" className="text-xs">{CATEGORY_LABELS[entry.category]}</Badge>
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Plug className="h-6 w-6 text-primary" /> {entry.display_name}
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">{entry.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className={connected ? 'bg-success/10 text-success border-success/20' : 'bg-muted text-muted-foreground'}>
            {connected ? <><Check className="h-3 w-3 mr-1" />Connected</> : <><X className="h-3 w-3 mr-1" />Not connected</>}
          </Badge>
          {connected ? (
            <>
              <Button size="sm" variant="outline" disabled={!isAdmin || busy} onClick={connect} className="gap-1">
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Sync
              </Button>
              <Button size="sm" variant="ghost" disabled={!isAdmin || busy} onClick={disconnect}>Disconnect</Button>
            </>
          ) : (
            <Button size="sm" disabled={!isAdmin || busy} onClick={connect} className="gap-1">
              {busy && <Loader2 className="h-3 w-3 animate-spin" />} Connect
            </Button>
          )}
        </div>
      </div>

      {!isAdmin && (
        <p className="text-xs text-warning">Workspace admins manage integrations.</p>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">{profile.overview}</p>
          {loading ? null : integration?.last_synced_at ? (
            <p className="text-xs text-muted-foreground mt-3">Last synced {new Date(integration.last_synced_at).toLocaleString()}</p>
          ) : (
            <p className="text-xs text-muted-foreground mt-3">Never synced</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Use cases</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {profile.useCases.map((uc, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground/90">
                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary flex-shrink-0" />
                <span>{uc}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Data flow</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile.dataFlow.map((step, i) => (
            <div key={i} className="rounded-md border border-border bg-muted/30 p-3">
              <div className="flex items-center gap-2 flex-wrap text-sm font-medium text-foreground">
                <span className="px-2 py-0.5 rounded bg-background border border-border">{step.source}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground italic">{step.via}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{step.target}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">{step.note}</p>
            </div>
          ))}
          <div className="grid md:grid-cols-2 gap-3 pt-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Data types</p>
              <div className="flex flex-wrap gap-1.5">
                {profile.dataTypes.map((d, i) => (
                  <Badge key={i} variant="outline" className="text-[11px]">{d}</Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Write-back</p>
              <p className="text-sm text-foreground/90">{profile.writeBack}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> Governance & security</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 leading-relaxed">{profile.governance}</p>
        </CardContent>
      </Card>
    </div>
  );
}
