import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useTable, logAudit } from '@/hooks/useGovernance';
import { ApprovalStatusBadge, RiskBadge, AuthorityLevelBadge, ContentHashChip } from '@/components/governance/StatusBadges';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const db = supabase as any;

export default function ApprovalCenterPage() {
  const { rows: actions, refetch } = useTable<any>('action_proposals');
  const { rows: approvals, refetch: refetchA } = useTable<any>('action_approvals');
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [selected, setSelected] = useState<any>(null);
  const [vote, setVote] = useState<string>('approve');
  const [rationale, setRationale] = useState('');

  const myApprovals = (id: string, v: number) => approvals.filter((x) => x.action_id === id && x.action_version === v);
  const hasMyVote = (a: any) => myApprovals(a.id, a.version).some((x) => x.approver_id === user?.id);

  const awaitingMe = actions.filter((a) => ['awaiting_approval', 'partially_approved'].includes(a.approval_status) && !hasMyVote(a));
  const highRisk = actions.filter((a) => ['high', 'critical'].includes((a.risk_level || '').toLowerCase()));
  const decisionApprovals = actions.filter((a) => a.action_type === 'decision_approval');
  const execApprovals = actions.filter((a) => a.action_type !== 'decision_approval');
  const rejected = actions.filter((a) => a.approval_status === 'cancelled');
  const expired = actions.filter((a) => a.approval_status === 'expired');
  const completed = actions.filter((a) => a.approval_status === 'completed');

  async function submitVote() {
    if (!selected || !workspace || !user) return;
    const { error } = await db.from('action_approvals').insert({
      workspace_id: workspace.id,
      action_id: selected.id,
      action_version: selected.version,
      approver_id: user.id,
      vote,
      rationale,
    });
    if (error) { toast.error(error.message); return; }

    // recompute approval status
    const approvalsForAction = [...approvals.filter(a => a.action_id === selected.id && a.action_version === selected.version), { vote, approver_id: user.id }];
    const approves = approvalsForAction.filter(a => a.vote === 'approve' || a.vote === 'approve_with_conditions').length;
    const rejects = approvalsForAction.filter(a => a.vote === 'reject').length;
    let newStatus = selected.approval_status;
    if (rejects > 0) newStatus = 'cancelled';
    else if (approves >= selected.required_approver_count) newStatus = 'approved';
    else if (approves > 0) newStatus = 'partially_approved';

    if (newStatus !== selected.approval_status) {
      await db.from('action_proposals').update({ approval_status: newStatus }).eq('id', selected.id);
    }
    await logAudit(workspace.id, `approval.${vote}`, { action_id: selected.id, actor_user_id: user.id, reason: rationale, after_state: { status: newStatus } });
    toast.success(`Vote recorded: ${vote}`);
    setSelected(null); setRationale(''); setVote('approve');
    refetch(); refetchA();
  }

  const list = (rows: any[]) => rows.length === 0 ? <p className="text-sm text-muted-foreground p-4">Nothing here.</p> : (
    <ul className="divide-y">
      {rows.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 p-4 hover:bg-muted/50">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{a.title}</p>
              <ContentHashChip hash={a.content_hash} version={a.version} />
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{a.reason}</p>
            <div className="flex items-center gap-2 mt-2">
              <ApprovalStatusBadge status={a.approval_status} />
              <AuthorityLevelBadge level={a.authority_level} />
              <RiskBadge level={a.risk_level} />
              <span className="text-xs text-muted-foreground">{myApprovals(a.id, a.version).length}/{a.required_approver_count} approvals</span>
            </div>
          </div>
          <Button size="sm" onClick={() => setSelected(a)}>Review</Button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Approval Center</h1>
        <p className="text-muted-foreground mt-1">Decision approval and execution approval are tracked separately. Approving a decision never auto-approves its execution.</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="me">
            <TabsList className="grid grid-cols-4 lg:grid-cols-8 mb-4">
              <TabsTrigger value="me">Awaiting Me ({awaitingMe.length})</TabsTrigger>
              <TabsTrigger value="high">High Risk ({highRisk.length})</TabsTrigger>
              <TabsTrigger value="dec">Decisions ({decisionApprovals.length})</TabsTrigger>
              <TabsTrigger value="exec">Execution ({execApprovals.length})</TabsTrigger>
              <TabsTrigger value="cond">Conditional</TabsTrigger>
              <TabsTrigger value="rej">Rejected ({rejected.length})</TabsTrigger>
              <TabsTrigger value="exp">Expired ({expired.length})</TabsTrigger>
              <TabsTrigger value="done">Completed ({completed.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="me">{list(awaitingMe)}</TabsContent>
            <TabsContent value="high">{list(highRisk)}</TabsContent>
            <TabsContent value="dec">{list(decisionApprovals)}</TabsContent>
            <TabsContent value="exec">{list(execApprovals)}</TabsContent>
            <TabsContent value="cond">{list(actions.filter(a => approvals.some(x => x.action_id === a.id && x.vote === 'approve_with_conditions')))}</TabsContent>
            <TabsContent value="rej">{list(rejected)}</TabsContent>
            <TabsContent value="exp">{list(expired)}</TabsContent>
            <TabsContent value="done">{list(completed)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <AuthorityLevelBadge level={selected.authority_level} />
                <RiskBadge level={selected.risk_level} />
                <ApprovalStatusBadge status={selected.approval_status} />
                <ContentHashChip hash={selected.content_hash} version={selected.version} />
              </div>
              {selected.authority_level === 'commit' && (
                <Card className="border-red-500/40 bg-red-500/5">
                  <CardContent className="pt-4 text-sm">
                    This action requires <strong>{selected.required_approver_count} distinct approvals</strong> and will not execute until every approver authorizes the exact same version. Editing the payload invalidates prior approvals.
                  </CardContent>
                </Card>
              )}
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Reason</p>
                <p className="text-sm">{selected.reason}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-muted-foreground tracking-wide mb-1">Proposed payload</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">{JSON.stringify(selected.proposed_payload, null, 2)}</pre>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['approve', 'approve_with_conditions', 'reject'] as const).map((v) => (
                  <Button key={v} variant={vote === v ? 'default' : 'outline'} onClick={() => setVote(v)} className="capitalize text-xs">
                    {v.replace(/_/g, ' ')}
                  </Button>
                ))}
              </div>
              <Textarea placeholder="Rationale (required for reject / conditional)" value={rationale} onChange={(e) => setRationale(e.target.value)} />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>Cancel</Button>
            <Button onClick={submitVote} disabled={(vote !== 'approve') && !rationale.trim()}>Submit vote</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
