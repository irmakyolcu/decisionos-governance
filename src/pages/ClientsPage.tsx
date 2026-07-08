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
import { Plus, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function ClientsPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', industry: '', risk_level: 'low', notes: '' });

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('clients').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.name) return;
    const { error } = await supabase.from('clients').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: form.name, industry: form.industry, risk_level: form.risk_level as any, notes: form.notes,
    });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ name: '', industry: '', risk_level: 'low', notes: '' }); load();
  };

  const riskColor = (r: string) => r === 'critical' ? 'destructive' : r === 'high' ? 'destructive' : r === 'medium' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">Client intelligence — health, risk, promises.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Client</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Client</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div><Label>Industry</Label><Input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} /></div>
              <div><Label>Risk level</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Create</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div className="font-semibold">{c.name}</div>
                <Badge variant={riskColor(c.risk_level) as any} className="text-[10px]">{c.risk_level}</Badge>
              </div>
              {c.industry && <div className="text-xs text-muted-foreground">{c.industry}</div>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Health {c.health_score ?? 75}</span>
                {c.revenue_at_risk > 0 && <span>Risk ${Number(c.revenue_at_risk).toLocaleString()}</span>}
              </div>
              {c.notes && <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
