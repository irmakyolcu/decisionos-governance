import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, CheckCircle2, Activity, ShieldAlert, Plus } from 'lucide-react';
import { useTable } from '@/hooks/useGovernance';
import { ApprovalStatusBadge, RiskBadge, AuthorityLevelBadge } from '@/components/governance/StatusBadges';

export default function ExecutiveDashboardPage() {
  const nav = useNavigate();
  const { rows: actions } = useTable<any>('action_proposals');
  const { rows: decisions } = useTable<any>('decisions');
  const { rows: audit } = useTable<any>('audit_events');

  const awaitingApproval = actions.filter((a) => ['awaiting_approval', 'partially_approved'].includes(a.approval_status));
  const highRisk = actions.filter((a) => ['high', 'critical'].includes((a.risk_level || '').toLowerCase()));
  const blockedDecisions = decisions.filter((d) => d.status === 'Escalated' || d.status === 'Under Review');
  const recentlyApproved = decisions.filter((d) => d.status === 'Approved').slice(0, 5);
  const policyViolations = audit.filter((e) => e.event_type?.includes('policy_violation'));

  const needsAttention = [
    ...awaitingApproval.filter((a) => a.authority_level === 'commit').map((a) => ({ ...a, _why: 'L3 commit awaiting two approvals' })),
    ...highRisk.filter((a) => a.approval_status !== 'completed').map((a) => ({ ...a, _why: 'High-risk action' })),
  ].slice(0, 6);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Executive Dashboard</h1>
          <p className="text-muted-foreground mt-1">AI prepares the decision. You stay accountable.</p>
        </div>
        <Button onClick={() => nav('/decision-intake')}><Plus className="h-4 w-4 mr-2" />Start a New Decision</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard icon={Clock} label="Decisions awaiting approval" value={awaitingApproval.filter(a=>a.decision_id).length} onClick={() => nav('/approvals-center')} />
        <MetricCard icon={Activity} label="Execution actions pending" value={awaitingApproval.length} onClick={() => nav('/execution')} />
        <MetricCard icon={ShieldAlert} label="High-risk actions" value={highRisk.length} tone="risk" />
        <MetricCard icon={CheckCircle2} label="Recently approved" value={recentlyApproved.length} tone="ok" />
      </div>

      <Card className="border-amber-500/40 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="h-5 w-5" /> Needs Your Attention
          </CardTitle>
        </CardHeader>
        <CardContent>
          {needsAttention.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing requires your attention right now.</p>
          ) : (
            <ul className="space-y-3">
              {needsAttention.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-4 p-3 rounded-lg bg-background border">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a._why}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <AuthorityLevelBadge level={a.authority_level} />
                    <RiskBadge level={a.risk_level} />
                    <Button size="sm" variant="outline" onClick={() => nav('/approvals-center')}>Review</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Blocked decisions</CardTitle></CardHeader>
          <CardContent>
            {blockedDecisions.length === 0 ? <p className="text-sm text-muted-foreground">None.</p> : (
              <ul className="space-y-2">
                {blockedDecisions.slice(0, 5).map((d) => (
                  <li key={d.id} className="flex items-center justify-between text-sm">
                    <span className="truncate">{d.title}</span>
                    <Button size="sm" variant="ghost" onClick={() => nav(`/decisions/${d.id}`)}>Open</Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Policy violations (last events)</CardTitle></CardHeader>
          <CardContent>
            {policyViolations.length === 0 ? <p className="text-sm text-muted-foreground">No violations recorded.</p> : (
              <ul className="space-y-2 text-sm">
                {policyViolations.slice(0, 5).map((e) => (
                  <li key={e.id} className="flex justify-between"><span>{e.event_type}</span><span className="text-muted-foreground text-xs">{new Date(e.created_at).toLocaleString()}</span></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Latest action proposals</CardTitle></CardHeader>
        <CardContent>
          {actions.length === 0 ? <p className="text-sm text-muted-foreground">No action proposals yet.</p> : (
            <ul className="divide-y">
              {actions.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between py-3 gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.action_type} → {a.target_system || 'internal'}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <ApprovalStatusBadge status={a.approval_status} />
                    <AuthorityLevelBadge level={a.authority_level} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, onClick, tone }: any) {
  return (
    <Card className={onClick ? 'cursor-pointer hover:border-primary/50 transition-colors' : ''} onClick={onClick}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${tone === 'risk' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
        </div>
      </CardContent>
    </Card>
  );
}
