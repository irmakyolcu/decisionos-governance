import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTable, logAudit } from '@/hooks/useGovernance';
import { ApprovalStatusBadge, AuthorityLevelBadge, RiskBadge, ContentHashChip } from '@/components/governance/StatusBadges';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Play, Undo2 } from 'lucide-react';

const db = supabase as any;

export default function ExecutionCenterPage() {
  const { rows: actions, refetch } = useTable<any>('action_proposals');
  const { rows: records, refetch: refetchR } = useTable<any>('execution_records');
  const { rows: approvals } = useTable<any>('action_approvals');
  const { workspace } = useWorkspace();
  const { user } = useAuth();

  async function execute(a: any) {
    if (!workspace || !user) return;
    if (a.approval_status !== 'approved') { toast.error('Action is not approved'); return; }
    if (a.expires_at && new Date(a.expires_at) < new Date()) { toast.error('Approval expired'); return; }

    const approvalsForAction = approvals.filter((x) => x.action_id === a.id && x.action_version === a.version && (x.vote === 'approve' || x.vote === 'approve_with_conditions'));
    if (approvalsForAction.length < a.required_approver_count) { toast.error('Insufficient approvals'); return; }

    await db.from('action_proposals').update({ approval_status: 'executing' }).eq('id', a.id);
    // Simulated execution
    await new Promise((r) => setTimeout(r, 600));
    const result = Math.random() > 0.05 ? 'success' : 'failed';
    await db.from('execution_records').insert({
      workspace_id: workspace.id, action_id: a.id, action_version: a.version,
      executed_payload: a.proposed_payload, target_system: a.target_system,
      result, verification_status: result === 'success' ? 'verified' : 'failed',
      error_details: result === 'failed' ? 'Simulated transient failure' : null,
    });
    await db.from('action_proposals').update({ approval_status: result === 'success' ? 'completed' : 'failed' }).eq('id', a.id);
    await logAudit(workspace.id, `action.${result === 'success' ? 'executed' : 'execution_failed'}`, { action_id: a.id, actor_user_id: user.id });
    toast.success(result === 'success' ? 'Executed' : 'Execution failed (recorded)');
    refetch(); refetchR();
  }

  async function rollback(rec: any) {
    if (!workspace || !user) return;
    await db.from('execution_records').update({ result: 'rolled_back', rollback_at: new Date().toISOString() }).eq('id', rec.id);
    await db.from('action_proposals').update({ approval_status: 'rolled_back' }).eq('id', rec.action_id);
    await logAudit(workspace.id, 'action.rolled_back', { action_id: rec.action_id, actor_user_id: user.id });
    toast.success('Rolled back');
    refetch(); refetchR();
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Execution Center</h1>
        <p className="text-muted-foreground mt-1">Approved actions run here through a deterministic Execution Engine — never by the AI directly.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Action Proposals</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {actions.length === 0 && <li className="p-6 text-sm text-muted-foreground">No actions yet.</li>}
            {actions.map((a) => (
              <li key={a.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">{a.title}</p>
                    <ContentHashChip hash={a.content_hash} version={a.version} />
                  </div>
                  <p className="text-xs text-muted-foreground">{a.action_type} → {a.target_system || 'internal'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <ApprovalStatusBadge status={a.approval_status} />
                    <AuthorityLevelBadge level={a.authority_level} />
                    <RiskBadge level={a.risk_level} />
                  </div>
                </div>
                <Button size="sm" disabled={a.approval_status !== 'approved'} onClick={() => execute(a)}>
                  <Play className="h-3 w-3 mr-1" /> Execute
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Execution Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {records.length === 0 && <li className="p-6 text-sm text-muted-foreground">Nothing executed yet.</li>}
            {records.map((r) => (
              <li key={r.id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{r.target_system || 'internal'} · v{r.action_version}</p>
                  <p className="text-xs text-muted-foreground">{new Date(r.executed_at).toLocaleString()} · {r.result}{r.error_details ? ` · ${r.error_details}` : ''}</p>
                </div>
                {r.result === 'success' && (
                  <Button size="sm" variant="outline" onClick={() => rollback(r)}><Undo2 className="h-3 w-3 mr-1" /> Rollback</Button>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
