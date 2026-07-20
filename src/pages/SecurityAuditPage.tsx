import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldCheck, ShieldAlert, CheckCircle2, Download, Search } from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'fixed' | 'ignored' | 'open';

interface AuditFinding {
  id: string;
  title: string;
  area: string;
  severity: Severity;
  status: Status;
  discoveredAt: string;
  resolvedAt?: string;
  summary: string;
  resolution?: string;
}

// Historical security audit log for DecisionOS.
// Sourced from previous security scan cycles and remediation work.
const AUDIT_HISTORY: AuditFinding[] = [
  {
    id: 'meeting_recordings_insert_no_workspace_check',
    title: 'Meeting recording inserts missing workspace check',
    area: 'RLS · meeting_recordings',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-05-14',
    resolvedAt: '2026-05-14',
    summary: 'INSERT policy did not verify that the target workspace matched the caller.',
    resolution: 'Added workspace_id = current workspace membership check to INSERT policy.',
  },
  {
    id: 'workspace_invites_token_exposure',
    title: 'Invite tokens exposed via public SELECT',
    area: 'RLS · workspace_invites',
    severity: 'critical',
    status: 'fixed',
    discoveredAt: '2026-05-14',
    resolvedAt: '2026-05-14',
    summary: 'Invite tokens were readable outside of the intended recipient flow.',
    resolution: 'Revoked broad SELECT; access now goes through a SECURITY DEFINER RPC.',
  },
  {
    id: 'ceo_recommend_unauth',
    title: 'ceo-recommend edge function accepted unauthenticated calls',
    area: 'Edge Function · ceo-recommend',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-05-14',
    resolvedAt: '2026-05-14',
    summary: 'Function ran without validating the caller JWT.',
    resolution: 'Enforced JWT verification and workspace membership check.',
  },
  {
    id: 'missing_trust_surface_page',
    title: 'No public trust / security posture surface',
    area: 'App · Trust page',
    severity: 'low',
    status: 'fixed',
    discoveredAt: '2026-05-14',
    resolvedAt: '2026-05-14',
    summary: 'Enterprise buyers had no page describing controls, RLS and audit posture.',
    resolution: 'Created /trust with governance, audit and data handling summary.',
  },
  {
    id: 'SUPA_function_search_path_mutable',
    title: 'set_action_hash_on_insert had mutable search_path',
    area: 'Database · function',
    severity: 'medium',
    status: 'fixed',
    discoveredAt: '2026-06-02',
    resolvedAt: '2026-06-02',
    summary: 'Search path was not pinned, enabling potential schema hijack.',
    resolution: 'Set SECURITY DEFINER function search_path = public, pg_temp.',
  },
  {
    id: 'execution_records_no_write_policy',
    title: 'execution_records missing write policies',
    area: 'RLS · execution_records',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-02',
    resolvedAt: '2026-06-02',
    summary: 'Table had RLS enabled but no INSERT/UPDATE/DELETE policies defined.',
    resolution: 'Added admin-only write policies scoped by workspace.',
  },
  {
    id: 'notifications_any_member_can_notify_any_user',
    title: 'Any workspace member could insert notifications for any user',
    area: 'RLS · notifications',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-02',
    resolvedAt: '2026-06-02',
    summary: 'INSERT policy did not restrict recipient to auth.uid().',
    resolution: 'Restricted INSERT to rows where recipient_user_id = auth.uid() or service role.',
  },
  {
    id: 'policy_evaluations_no_write_policy',
    title: 'policy_evaluations missing write policies',
    area: 'RLS · policy_evaluations',
    severity: 'medium',
    status: 'fixed',
    discoveredAt: '2026-06-02',
    resolvedAt: '2026-06-02',
    summary: 'Writes were only possible via service role; no explicit policy.',
    resolution: 'Added admin write policy scoped by workspace.',
  },
  {
    id: 'policy_versions_no_write_policy',
    title: 'policy_versions missing write policies',
    area: 'RLS · policy_versions',
    severity: 'medium',
    status: 'fixed',
    discoveredAt: '2026-06-02',
    resolvedAt: '2026-06-02',
    summary: 'Table had RLS enabled but writes had no matching policy.',
    resolution: 'Added admin-only write policies.',
  },
  {
    id: 'audit_actor_spoofing',
    title: 'audit_events allowed actor_user_id spoofing',
    area: 'RLS · audit_events',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-18',
    resolvedAt: '2026-06-18',
    summary: 'Callers could insert audit rows attributing actions to other users.',
    resolution: 'INSERT policy now enforces actor_user_id = auth.uid().',
  },
  {
    id: 'decision_analyze_missing_authz',
    title: 'decision-analyze function missing workspace authorization',
    area: 'Edge Function · decision-analyze',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-18',
    resolvedAt: '2026-06-18',
    summary: 'Any authenticated user could analyze any decision id.',
    resolution: 'Added workspace membership check before running analysis.',
  },
  {
    id: 'gmail_scheduler_unauth',
    title: 'gmail-sync-scheduler exposed without auth',
    area: 'Edge Function · gmail-sync-scheduler',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-18',
    resolvedAt: '2026-06-18',
    summary: 'Scheduler endpoint could be triggered by anyone.',
    resolution: 'Restricted to service role or workspace-authorized callers.',
  },
  {
    id: 'voice_functions_unauth',
    title: 'Voice edge functions missing JWT validation',
    area: 'Edge Function · voice-*',
    severity: 'high',
    status: 'fixed',
    discoveredAt: '2026-06-18',
    resolvedAt: '2026-06-18',
    summary: 'voice-transcribe / voice-tts / voice-chat accepted anonymous calls.',
    resolution: 'Added JWT validation to all three voice functions.',
  },
  {
    id: 'agent_runs_viewer_write',
    title: 'agent_runs allowed viewer role to write',
    area: 'RLS · agent_runs',
    severity: 'medium',
    status: 'fixed',
    discoveredAt: '2026-07-05',
    resolvedAt: '2026-07-05',
    summary: 'Permissive FOR ALL policy let viewer role insert/update/delete.',
    resolution: 'Split policies: SELECT for members, write restricted to writer role.',
  },
];

const SEV_STYLES: Record<Severity, string> = {
  critical: 'bg-red-500/15 text-red-600 border-red-500/30',
  high: 'bg-orange-500/15 text-orange-600 border-orange-500/30',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  low: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
};

const STATUS_STYLES: Record<Status, string> = {
  fixed: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  ignored: 'bg-slate-500/15 text-slate-600 border-slate-500/30',
  open: 'bg-red-500/15 text-red-600 border-red-500/30',
};

export default function SecurityAuditPage() {
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<Status | 'all'>('all');

  const filtered = useMemo(() => {
    return AUDIT_HISTORY.filter((f) => {
      if (statusFilter !== 'all' && f.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${f.title} ${f.area} ${f.summary} ${f.id}`.toLowerCase();
      return hay.includes(q.toLowerCase());
    }).sort((a, b) => (b.discoveredAt || '').localeCompare(a.discoveredAt || ''));
  }, [q, statusFilter]);

  const stats = useMemo(() => ({
    total: AUDIT_HISTORY.length,
    fixed: AUDIT_HISTORY.filter((f) => f.status === 'fixed').length,
    open: AUDIT_HISTORY.filter((f) => f.status === 'open').length,
    ignored: AUDIT_HISTORY.filter((f) => f.status === 'ignored').length,
  }), []);

  function exportCsv() {
    const headers = ['id', 'title', 'area', 'severity', 'status', 'discoveredAt', 'resolvedAt', 'summary', 'resolution'];
    const csv = [headers.join(',')]
      .concat(filtered.map((f) => headers.map((h) => JSON.stringify((f as any)[h] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'security-audit-history.csv';
    a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6" /> Security Audit History
          </h1>
          <p className="text-muted-foreground mt-1">
            Timeline of security findings raised against DecisionOS and how each one was resolved.
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total findings" value={stats.total} icon={ShieldAlert} />
        <StatCard label="Fixed" value={stats.fixed} icon={CheckCircle2} tone="ok" />
        <StatCard label="Open" value={stats.open} icon={ShieldAlert} tone={stats.open > 0 ? 'risk' : undefined} />
        <StatCard label="Ignored" value={stats.ignored} icon={ShieldAlert} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <CardTitle className="text-base">{filtered.length} findings</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Search…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8 w-64"
              />
            </div>
            <div className="flex gap-1">
              {(['all', 'fixed', 'open', 'ignored'] as const).map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={statusFilter === s ? 'default' : 'outline'}
                  onClick={() => setStatusFilter(s)}
                  className="capitalize"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">No findings match.</li>
            )}
            {filtered.map((f) => (
              <li key={f.id} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{f.title}</p>
                      <Badge variant="outline" className={SEV_STYLES[f.severity]}>{f.severity}</Badge>
                      <Badge variant="outline" className={STATUS_STYLES[f.status]}>{f.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-mono">{f.area} · {f.id}</p>
                  </div>
                  <div className="text-xs text-muted-foreground text-right flex-shrink-0">
                    <div>Found: {f.discoveredAt}</div>
                    {f.resolvedAt && <div>Resolved: {f.resolvedAt}</div>}
                  </div>
                </div>
                <p className="text-sm">{f.summary}</p>
                {f.resolution && (
                  <p className="text-sm text-emerald-700 border-l-2 border-emerald-500/40 pl-3">
                    <span className="font-medium">Resolution:</span> {f.resolution}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: number; tone?: 'ok' | 'risk' }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${tone === 'ok' ? 'text-emerald-500' : tone === 'risk' ? 'text-red-500' : 'text-muted-foreground'}`} />
        </div>
      </CardContent>
    </Card>
  );
}
