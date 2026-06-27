import { useEffect, useState } from 'react';
import { UserCog, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

const ROLES = ['owner', 'approver', 'legal', 'compliance', 'observer', 'contributor'] as const;
type Role = typeof ROLES[number];

type Decision = { id: string; title: string };
type Member = { user_id: string; display_name: string | null; role: string };
type DecisionRole = {
  id: string;
  decision_id: string;
  user_id: string;
  role: Role;
  created_at: string;
};

const ROLE_STYLE: Record<Role, string> = {
  owner: 'bg-primary/10 text-primary border-primary/20',
  approver: 'bg-warning/10 text-warning border-warning/20',
  legal: 'bg-info/10 text-info border-info/20',
  compliance: 'bg-info/10 text-info border-info/20',
  observer: 'bg-muted text-muted-foreground border-border',
  contributor: 'bg-success/10 text-success border-success/20',
};

export default function DecisionRolesPage() {
  const { workspace, role } = useWorkspace();
  const { user } = useAuth();
  const isWriter = role === 'admin' || role === 'approver';
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [assignments, setAssignments] = useState<DecisionRole[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<Role>('approver');

  const load = async () => {
    if (!workspace) return;
    const [decisionsR, membersR, rolesR] = await Promise.all([
      supabase.from('decisions').select('id, title').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      supabase
        .from('workspace_members')
        .select('user_id, role, profiles:profiles!workspace_members_user_id_fkey(display_name)')
        .eq('workspace_id', workspace.id),
      supabase.from('decision_roles').select('*').eq('workspace_id', workspace.id),
    ]);
    setDecisions((decisionsR.data ?? []) as Decision[]);
    setMembers(
      ((membersR.data as any[]) ?? []).map((m) => ({
        user_id: m.user_id,
        role: m.role,
        display_name: m.profiles?.display_name ?? null,
      })),
    );
    setAssignments((rolesR.data ?? []) as DecisionRole[]);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspace?.id]);

  const assign = async () => {
    if (!workspace || !user) return;
    if (!selectedDecision || !selectedUser) return toast.error('Pick a decision and a member');
    const { error } = await supabase.from('decision_roles').insert({
      workspace_id: workspace.id,
      decision_id: selectedDecision,
      user_id: selectedUser,
      role: selectedRole,
      assigned_by: user.id,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Role assigned');
      load();
    }
  };

  const remove = async (id: string) => {
    await supabase.from('decision_roles').delete().eq('id', id);
    load();
  };

  const nameFor = (uid: string) => members.find((m) => m.user_id === uid)?.display_name ?? uid.slice(0, 8);
  const titleFor = (did: string) => decisions.find((d) => d.id === did)?.title ?? did.slice(0, 8);

  const byDecision = new Map<string, DecisionRole[]>();
  assignments.forEach((a) => {
    const arr = byDecision.get(a.decision_id) ?? [];
    arr.push(a);
    byDecision.set(a.decision_id, arr);
  });

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <UserCog className="h-6 w-6 text-primary" /> Decision Roles
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Assign decision-scoped roles (approver, legal, compliance, observer, contributor) per decision.
          Workspace-level roles still control access; these add per-decision responsibilities.
        </p>
      </div>

      {isWriter && (
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" /> Assign role</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-3">
              <Select value={selectedDecision} onValueChange={setSelectedDecision}>
                <SelectTrigger><SelectValue placeholder="Decision" /></SelectTrigger>
                <SelectContent>
                  {decisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger><SelectValue placeholder="Member" /></SelectTrigger>
                <SelectContent>
                  {members.map((m) => <SelectItem key={m.user_id} value={m.user_id}>{m.display_name ?? m.user_id.slice(0, 8)}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as Role)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button onClick={assign}>Assign</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {decisions.map((d) => {
          const roles = byDecision.get(d.id) ?? [];
          if (roles.length === 0) return null;
          return (
            <Card key={d.id}>
              <CardHeader>
                <CardTitle className="text-base">{d.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {roles.map((r) => (
                  <div key={r.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-foreground">{nameFor(r.user_id)}</span>
                      <Badge variant="outline" className={ROLE_STYLE[r.role]}>{r.role}</Badge>
                    </div>
                    {isWriter && (
                      <Button size="sm" variant="ghost" onClick={() => remove(r.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
        {assignments.length === 0 && (
          <Card><CardContent className="p-12 text-center text-sm text-muted-foreground">
            No decision-scoped roles yet. Assign one above to surface it here.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
