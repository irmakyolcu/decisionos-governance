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
import { Plus, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLOR: Record<string, string> = { draft: 'secondary', active: 'default', needs_review: 'destructive', deprecated: 'outline' };

export default function CompanySkillsPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', trigger: '', steps: '', decision_rules: '', expected_output: '', status: 'draft' });

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('company_skills').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const { error } = await supabase.from('company_skills').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, description: form.description, trigger: form.trigger,
      steps: form.steps.split('\n').filter(Boolean).map((s, i) => ({ order: i + 1, instruction: s })),
      decision_rules: form.decision_rules.split('\n').filter(Boolean),
      expected_output: form.expected_output, status: form.status as any,
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', description: '', trigger: '', steps: '', decision_rules: '', expected_output: '', status: 'draft' }); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Company Skills</h1><p className="text-sm text-muted-foreground">Executable instructions for employees and AI agents.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Skill</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>New Company Skill</DialogTitle></DialogHeader>
            <div className="space-y-3 max-h-[70vh] overflow-auto pr-1">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div><Label>Trigger (when to use)</Label><Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} /></div>
              <div><Label>Steps (one per line)</Label><Textarea rows={4} value={form.steps} onChange={(e) => setForm({ ...form, steps: e.target.value })} /></div>
              <div><Label>Decision rules (one per line)</Label><Textarea rows={3} value={form.decision_rules} onChange={(e) => setForm({ ...form, decision_rules: e.target.value })} /></div>
              <div><Label>Expected output</Label><Input value={form.expected_output} onChange={(e) => setForm({ ...form, expected_output: e.target.value })} /></div>
              <div><Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem><SelectItem value="active">Active</SelectItem>
                    <SelectItem value="needs_review">Needs review</SelectItem><SelectItem value="deprecated">Deprecated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={create} className="w-full">Create Skill</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No skills yet.</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((s) => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />{s.name}</div>
                <Badge variant={STATUS_COLOR[s.status] as any} className="text-[10px]">{s.status}</Badge>
              </div>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              {s.trigger && <div className="text-xs"><span className="text-muted-foreground">Trigger: </span>{s.trigger}</div>}
              <div className="text-[10px] text-muted-foreground">v{s.version} · {Array.isArray(s.steps) ? s.steps.length : 0} steps</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
