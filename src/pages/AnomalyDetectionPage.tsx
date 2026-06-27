import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

type Anomaly = {
  id: string;
  decision_id: string | null;
  action_id: string | null;
  detector: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string | null;
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
  signal: Record<string, unknown>;
};

const SEVERITY: Record<string, string> = {
  low: 'bg-muted text-muted-foreground border-border',
  medium: 'bg-warning/10 text-warning border-warning/20',
  high: 'bg-destructive/10 text-destructive border-destructive/20',
  critical: 'bg-destructive text-destructive-foreground border-destructive',
};

export default function AnomalyDetectionPage() {
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [items, setItems] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    if (!workspace) return;
    setLoading(true);
    const { data } = await supabase
      .from('anomalies')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false });
    setItems((data ?? []) as Anomaly[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const scan = async () => {
    if (!workspace || !user) return;
    setScanning(true);
    try {
      // Heuristic scan (deterministic, no LLM): pull decisions + action proposals and flag patterns.
      const [{ data: decisions }, { data: actions }] = await Promise.all([
        supabase.from('decisions').select('id, title, budget, risk_level, status, created_at').eq('workspace_id', workspace.id),
        supabase.from('action_proposals').select('id, decision_id, authority_level, risk_level, expires_at, approval_status, version').eq('workspace_id', workspace.id),
      ]);

      const findings: Array<Omit<Anomaly, 'id' | 'created_at' | 'status'> & { status: Anomaly['status'] }> = [];

      (decisions ?? []).forEach((d: any) => {
        if (d.budget && d.budget > 1_000_000 && d.risk_level !== 'High' && d.risk_level !== 'Critical') {
          findings.push({
            decision_id: d.id,
            action_id: null,
            detector: 'budget_risk_mismatch',
            severity: 'high',
            title: `High budget with low risk classification: ${d.title}`,
            description: `Budget of ${d.budget.toLocaleString()} flagged as ${d.risk_level}. Likely under-classified.`,
            signal: { budget: d.budget, risk_level: d.risk_level },
            status: 'open',
          });
        }
      });

      (actions ?? []).forEach((a: any) => {
        if (a.expires_at && new Date(a.expires_at) < new Date() && a.approval_status === 'awaiting_approval') {
          findings.push({
            decision_id: a.decision_id,
            action_id: a.id,
            detector: 'expired_pending_action',
            severity: 'medium',
            title: 'Action proposal expired while awaiting approval',
            description: `Action expired at ${new Date(a.expires_at).toLocaleString()}.`,
            signal: { expires_at: a.expires_at },
            status: 'open',
          });
        }
        if (a.authority_level >= 3 && a.version > 3) {
          findings.push({
            decision_id: a.decision_id,
            action_id: a.id,
            detector: 'high_authority_repeated_edits',
            severity: 'high',
            title: 'High-authority action edited many times',
            description: `Authority L${a.authority_level} action reached version ${a.version}, repeatedly invalidating approvals.`,
            signal: { version: a.version, authority_level: a.authority_level },
            status: 'open',
          });
        }
      });

      if (findings.length === 0) {
        toast.success('No anomalies detected');
      } else {
        const rows = findings.map((f) => ({ ...f, workspace_id: workspace.id }));
        const { error } = await supabase.from('anomalies').insert(rows);
        if (error) throw error;
        toast.success(`${findings.length} anomalies recorded`);
      }
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  };

  const updateStatus = async (id: string, status: Anomaly['status']) => {
    const patch: Partial<Anomaly> & { resolved_at?: string | null; resolved_by?: string | null } = { status };
    if (status === 'resolved' || status === 'dismissed') {
      patch.resolved_at = new Date().toISOString();
      patch.resolved_by = user?.id ?? null;
    }
    await supabase.from('anomalies').update(patch).eq('id', id);
    load();
  };

  const open = items.filter((i) => i.status === 'open');
  const handled = items.filter((i) => i.status !== 'open');

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-warning" /> Anomaly Detection
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Deterministic heuristics over decisions and action proposals. Run a scan to refresh findings.
          </p>
        </div>
        <Button onClick={scan} disabled={scanning} className="gap-2">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Run scan
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" /> Open ({open.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : open.length === 0 ? (
            <div className="text-sm text-muted-foreground">No open anomalies.</div>
          ) : (
            open.map((a) => (
              <div key={a.id} className="border border-border rounded-md p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-foreground">{a.title}</div>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className={SEVERITY[a.severity]}>{a.severity}</Badge>
                      <Badge variant="outline" className="text-[10px]">{a.detector}</Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'acknowledged')}>Acknowledge</Button>
                    <Button size="sm" variant="outline" onClick={() => updateStatus(a.id, 'resolved')}>Resolve</Button>
                    <Button size="sm" variant="ghost" onClick={() => updateStatus(a.id, 'dismissed')}>Dismiss</Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {handled.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-success" /> Handled ({handled.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {handled.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div>
                  <span className="text-foreground">{a.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">— {a.status}</span>
                </div>
                <Badge variant="outline" className={SEVERITY[a.severity]}>{a.severity}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
