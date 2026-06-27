import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useTable } from '@/hooks/useGovernance';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

const db = supabase as any;

const EFFECTS = ['allow', 'allow_with_logging', 'require_approval', 'require_multi_approval', 'warn', 'block', 'escalate'];

export default function PoliciesPage() {
  const { rows: policies, refetch } = useTable<any>('policies', 'priority', true);
  const { workspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: '', description: '', category: 'finance',
    action_type: '', field: 'amount', operator: '>', value: '25000',
    effect: 'require_multi_approval' as any, priority: 100,
  });

  async function save() {
    if (!workspace || !form.name) return;
    const rule_tree = {
      conditions: [
        ...(form.action_type ? [{ field: 'action_type', op: '=', value: form.action_type }] : []),
        { field: form.field, op: form.operator, value: isNaN(Number(form.value)) ? form.value : Number(form.value) },
      ],
    };
    const { error } = await db.from('policies').insert({
      workspace_id: workspace.id, name: form.name, description: form.description,
      category: form.category, effect: form.effect, priority: form.priority,
      applicable_action_types: form.action_type ? [form.action_type] : [],
      rule_tree,
    });
    if (error) { toast.error(error.message); return; }
    toast.success('Policy created'); setOpen(false); refetch();
  }

  async function remove(id: string) {
    await db.from('policies').delete().eq('id', id);
    refetch();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Policies</h1>
          <p className="text-muted-foreground mt-1">Deterministic rules evaluated independently of any language model.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Policy</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Create Policy</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} placeholder="Budget over €25k requires CEO+CFO" /></div>
              <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({...form, description: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({...form, category: e.target.value})} /></div>
                <div><Label>Applies to action type</Label><Input value={form.action_type} onChange={(e) => setForm({...form, action_type: e.target.value})} placeholder="approve_budget" /></div>
              </div>
              <div className="p-3 bg-muted rounded space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide">IF</p>
                <div className="grid grid-cols-3 gap-2">
                  <Input value={form.field} onChange={(e) => setForm({...form, field: e.target.value})} placeholder="amount" />
                  <Select value={form.operator} onValueChange={(v) => setForm({...form, operator: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{['>', '>=', '<', '<=', '=', '!='].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <Input value={form.value} onChange={(e) => setForm({...form, value: e.target.value})} />
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide">THEN</p>
                <Select value={form.effect} onValueChange={(v) => setForm({...form, effect: v as any})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EFFECTS.map(e => <SelectItem key={e} value={e}>{e.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>Create</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {policies.length === 0 && <li className="p-6 text-sm text-muted-foreground">No policies yet. Create your first rule to govern AI-proposed actions.</li>}
            {policies.map((p) => (
              <li key={p.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{p.name}</p>
                    <Badge variant="outline">{p.category}</Badge>
                    <Badge>{p.effect?.replace(/_/g, ' ')}</Badge>
                    <span className="text-xs text-muted-foreground">priority {p.priority}</span>
                  </div>
                  {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                  <pre className="text-xs bg-muted p-2 rounded mt-2 overflow-x-auto">{JSON.stringify(p.rule_tree, null, 2)}</pre>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
