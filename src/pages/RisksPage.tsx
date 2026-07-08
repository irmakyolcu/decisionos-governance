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
import { Plus, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['client_risk','knowledge_loss','contradictory_info','outdated_info','unowned_process','missing_approval','policy_violation','project_delay','revenue_risk','data_access_risk','employee_dependency'];
const SEV_COLOR: Record<string, string> = { low: 'secondary', medium: 'default', high: 'destructive', critical: 'destructive' };

export default function RisksPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ category: 'client_risk', severity: 'medium', summary: '', why_it_matters: '', recommended_action: '' });

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('risks').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const create = async () => {
    if (!workspace || !user || !form.summary) return;
    const { error } = await supabase.from('risks').insert({ workspace_id: workspace.id, created_by: user.id, ...form } as any);
    if (error) return toast({ title: 'Error', description: error.message, variant: 'destructive' });
    setOpen(false); setForm({ category: 'client_risk', severity: 'medium', summary: '', why_it_matters: '', recommended_action: '' }); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('risks').update({ status: status as any }).eq('id', id); load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Risks & Alerts</h1><p className="text-sm text-muted-foreground">Detected risks across your company.</p></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />New Risk</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Log Risk</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Severity</Label>
                <Select value={form.severity} onValueChange={(v) => setForm({ ...form, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{['low','medium','high','critical'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Summary</Label><Input value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} /></div>
              <div><Label>Why it matters</Label><Textarea value={form.why_it_matters} onChange={(e) => setForm({ ...form, why_it_matters: e.target.value })} /></div>
              <div><Label>Recommended action</Label><Textarea value={form.recommended_action} onChange={(e) => setForm({ ...form, recommended_action: e.target.value })} /></div>
              <Button onClick={create} className="w-full">Log Risk</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No risks logged.</p></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 ${r.severity === 'critical' || r.severity === 'high' ? 'bg-destructive' : 'bg-yellow-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">{r.summary}</div>
                    <Badge variant={SEV_COLOR[r.severity] as any} className="text-[10px]">{r.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.category.replace(/_/g,' ')}</Badge>
                  </div>
                  {r.why_it_matters && <p className="text-xs text-muted-foreground">{r.why_it_matters}</p>}
                  {r.recommended_action && <p className="text-xs mt-1"><span className="text-muted-foreground">Action: </span>{r.recommended_action}</p>}
                </div>
                <Select value={r.status} onValueChange={(v) => updateStatus(r.id, v)}>
                  <SelectTrigger className="w-40 h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{['new','investigating','action_required','resolved','dismissed'].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
