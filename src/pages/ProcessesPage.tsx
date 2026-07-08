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
import { Plus, Workflow, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ProcessesPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', purpose: '', department: '', steps: '' });

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('processes').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const steps = form.steps.split('\n').filter(Boolean).map((s, i) => ({ order: i + 1, title: s }));
    const { error } = await supabase.from('processes').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, purpose: form.purpose, department: form.department, steps,
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', purpose: '', department: '', steps: '' }); load();
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
