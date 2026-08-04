import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Workflow, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProcessesPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', purpose: '', department: '', steps: '', owner_id: '' });
  const [members, setMembers] = useState<{ user_id: string; display_name: string | null }[]>([]);

  const load = async () => {
    if (!workspace) return;
    const [procR, memR] = await Promise.all([
      supabase.from('processes').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
      supabase
        .from('workspace_members')
        .select('user_id, profiles:profiles!workspace_members_user_id_fkey(display_name)')
        .eq('workspace_id', workspace.id),
    ]);
    setRows(procR.data ?? []);
    setMembers(((memR.data as any[]) ?? []).map((m) => ({ user_id: m.user_id, display_name: m.profiles?.display_name ?? null })));
  };

  const memberName = (id: string | null) =>
    (id && members.find((m) => m.user_id === id)?.display_name) || (id ? 'Unknown user' : null);

  const setOwner = async (processId: string, ownerId: string | null) => {
    const { error } = await supabase.from('processes').update({ owner_id: ownerId }).eq('id', processId);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: ownerId ? 'Owner assigned' : 'Owner removed' });
    load();
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const steps = form.steps.split('\n').filter(Boolean).map((s, i) => ({ order: i + 1, title: s }));
    const { error } = await supabase.from('processes').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, purpose: form.purpose, department: form.department, steps,
      owner_id: form.owner_id || null,
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', purpose: '', department: '', steps: '', owner_id: '' }); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Processes</h1><p className="text-sm text-muted-foreground">Company process library.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Process</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Process</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Purpose</Label><Textarea value={form.purpose} onChange={(e) => setForm({ ...form, purpose: e.target.value })} /></div>
              <div><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
              <div>
                <Label>Owner</Label>
                <Select value={form.owner_id || 'none'} onValueChange={(v) => setForm({ ...form, owner_id: v === 'none' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {members.map((m) => (
                      <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Steps (one per line)</Label><Textarea rows={5} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><Workflow className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No processes yet.</p></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((p) => {
            const unowned = !p.owner_id;
            const stale = !p.last_verified_at;
            return (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    {p.department && <div className="text-xs text-muted-foreground">{p.department}</div>}
                  </div>
                  <div className="flex gap-1">
                    {unowned && <Badge variant="destructive" className="text-[10px]"><AlertCircle className="h-2.5 w-2.5 mr-1" />No owner</Badge>}
                    {stale && <Badge variant="secondary" className="text-[10px]">Not verified</Badge>}
                  </div>
                </div>
                {p.purpose && <p className="text-sm text-muted-foreground mb-2">{p.purpose}</p>}
                <div className="flex items-center gap-2 mb-2">
                  <Label className="text-xs text-muted-foreground">Owner</Label>
                  <Select value={p.owner_id ?? 'none'} onValueChange={(v) => setOwner(p.id, v === 'none' ? null : v)}>
                    <SelectTrigger className="h-8 w-56 text-xs"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Unassigned</SelectItem>
                      {members.map((m) => (
                        <SelectItem key={m.user_id} value={m.user_id}>{m.display_name || m.user_id.slice(0, 8)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {p.owner_id && !members.some((m) => m.user_id === p.owner_id) && (
                    <span className="text-xs text-muted-foreground">{memberName(p.owner_id)}</span>
                  )}
                </div>
                {Array.isArray(p.steps) && p.steps.length > 0 && (
                  <ol className="text-xs space-y-1 pl-4 list-decimal text-muted-foreground">
                    {p.steps.slice(0, 5).map((s: any, i: number) => <li key={i}>{s.title || s}</li>)}
                  </ol>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
