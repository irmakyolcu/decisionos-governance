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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Building2, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ClientForm = {
  name: string;
  industry: string;
  risk_level: string;
  health_score: string;
  revenue_at_risk: string;
  notes: string;
};

const emptyForm: ClientForm = { name: '', industry: '', risk_level: 'low', health_score: '75', revenue_at_risk: '0', notes: '' };

export default function ClientsPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('clients').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: any) => {
    setEditingId(c.id);
    setForm({
      name: c.name ?? '',
      industry: c.industry ?? '',
      risk_level: c.risk_level ?? 'low',
      health_score: String(c.health_score ?? 75),
      revenue_at_risk: String(c.revenue_at_risk ?? 0),
      notes: c.notes ?? '',
    });
    setOpen(true);
  };

  const save = async () => {
    if (!workspace || !user || !form.name) return;
    const payload = {
      name: form.name,
      industry: form.industry,
      risk_level: form.risk_level as any,
      health_score: Number(form.health_score) || 0,
      revenue_at_risk: Number(form.revenue_at_risk) || 0,
      notes: form.notes,
    };
    const { error } = editingId
      ? await supabase.from('clients').update(payload).eq('id', editingId)
      : await supabase.from('clients').insert({ ...payload, workspace_id: workspace.id, created_by: user.id });
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: editingId ? 'Client güncellendi' : 'Client oluşturuldu' });
    setOpen(false); setEditingId(null); setForm(emptyForm); load();
  };

  const remove = async (id: string) => {
    if (!confirm('Bu client silinsin mi?')) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    toast({ title: 'Silindi' });
    load();
  };

  const riskColor = (r: string) => r === 'critical' ? 'destructive' : r === 'high' ? 'destructive' : r === 'medium' ? 'default' : 'secondary';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Clients</h1>
          <p className="text-sm text-muted-foreground">Client intelligence — health, risk, promises.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" />New Client</Button>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Client Düzenle' : 'New Client'}</DialogTitle></DialogHeader>
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
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Health score (0-100)</Label><Input type="number" min={0} max={100} value={form.health_score} onChange={(e) => setForm({ ...form, health_score: e.target.value })} /></div>
              <div><Label>Revenue at risk ($)</Label><Input type="number" min={0} value={form.revenue_at_risk} onChange={(e) => setForm({ ...form, revenue_at_risk: e.target.value })} /></div>
            </div>
            <div><Label>Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>İptal</Button>
            <Button onClick={save}>{editingId ? 'Kaydet' : 'Oluştur'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rows.length === 0 ? (
        <Card className="p-12 text-center">
          <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No clients yet.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((c) => (
            <Card key={c.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold flex-1">{c.name}</div>
                <Badge variant={riskColor(c.risk_level) as any} className="text-[10px]">{c.risk_level}</Badge>
              </div>
              {c.industry && <div className="text-xs text-muted-foreground">{c.industry}</div>}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>Health {c.health_score ?? 75}</span>
                {c.revenue_at_risk > 0 && <span>Risk ${Number(c.revenue_at_risk).toLocaleString()}</span>}
              </div>
              {c.notes && <p className="text-xs text-muted-foreground line-clamp-2">{c.notes}</p>}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEdit(c)}>
                  <Pencil className="h-3 w-3 mr-1" />Düzenle
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive" onClick={() => remove(c.id)}>
                  <Trash2 className="h-3 w-3 mr-1" />Sil
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
