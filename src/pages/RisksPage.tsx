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
import { Plus, AlertTriangle, Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const CATEGORIES = ['client_risk','knowledge_loss','contradictory_info','outdated_info','unowned_process','missing_approval','policy_violation','project_delay','revenue_risk','data_access_risk','employee_dependency'];
const DEPARTMENTS = ['Engineering','Product','Sales','Marketing','Finance','Operations','HR','Legal','IT / Security','Customer Success'];
const SEV_WEIGHT: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
const SEV_COLOR: Record<string, string> = { low: 'secondary', medium: 'default', high: 'destructive', critical: 'destructive' };

export default function RisksPage() {
  const { user } = useAuth();
  const { workspace, role } = useWorkspace();
  const isCeo = role === 'admin';
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [form, setForm] = useState({ category: 'client_risk', severity: 'medium', department: 'Operations', summary: '', why_it_matters: '', recommended_action: '' });

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
    setOpen(false); setForm({ category: 'client_risk', severity: 'medium', department: 'Operations', summary: '', why_it_matters: '', recommended_action: '' }); load();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('risks').update({ status: status as any }).eq('id', id); load();
  };

  const filteredRows = rows.filter((r) =>
    deptFilter === 'all' ? true : deptFilter === 'unassigned' ? !r.department : r.department === deptFilter
  );

  const openRows = rows.filter((r) => r.status !== 'resolved' && r.status !== 'dismissed' && r.department);
  const deptSummary = Array.from(
    openRows.reduce((map, r) => {
      const cur = map.get(r.department) ?? { name: r.department as string, total: 0, low: 0, medium: 0, high: 0, critical: 0, weight: 0 };
      cur.total += 1;
      cur[r.severity as 'low' | 'medium' | 'high' | 'critical'] += 1;
      cur.weight += SEV_WEIGHT[r.severity] ?? 1;
      map.set(r.department, cur);
      return map;
    }, new Map<string, { name: string; total: number; low: number; medium: number; high: number; critical: number; weight: number }>())
      .values()
  )
    .map((d) => ({ ...d, exposure: d.weight / d.total }))
    .sort((a, b) => b.exposure - a.exposure || b.total - a.total);

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
              <div><Label>Department</Label>
                <Select value={form.department} onValueChange={(v) => setForm({ ...form, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
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

      {isCeo && (
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Operational Risks by Department</h2>
            <Badge variant="secondary" className="text-[10px]">CEO view</Badge>
          </div>
          {deptSummary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No departmental risks recorded yet.</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {deptSummary.map((d) => (
                <button
                  key={d.name}
                  onClick={() => setDeptFilter(deptFilter === d.name ? 'all' : d.name)}
                  className={`text-left rounded-lg border p-3 transition hover:border-primary/50 ${deptFilter === d.name ? 'border-primary bg-muted/50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{d.name}</span>
                    <Badge variant="outline" className="text-[10px]">{d.total} open</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {d.critical} critical · {d.high} high · {d.medium} medium · {d.low} low
                  </div>
                  <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                    <div className={`h-full ${d.exposure >= 3 ? 'bg-destructive' : 'bg-primary'}`} style={{ width: `${Math.min(100, (d.exposure / 4) * 100)}%` }} />
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">Risk exposure {d.exposure.toFixed(1)} / 4</div>
                </button>
              ))}
            </div>
          )}
        </Card>
      )}

      <div className="flex items-center gap-2">
        <Label className="text-xs text-muted-foreground">Department</Label>
        <Select value={deptFilter} onValueChange={setDeptFilter}>
          <SelectTrigger className="w-56 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {DEPARTMENTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            <SelectItem value="unassigned">Unassigned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredRows.length === 0 ? (
        <Card className="p-12 text-center"><AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No risks logged.</p></Card>
      ) : (
        <div className="space-y-2">
          {filteredRows.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className={`h-2 w-2 rounded-full mt-2 ${r.severity === 'critical' || r.severity === 'high' ? 'bg-destructive' : 'bg-yellow-500'}`} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="font-medium">{r.summary}</div>
                    <Badge variant={SEV_COLOR[r.severity] as any} className="text-[10px]">{r.severity}</Badge>
                    <Badge variant="outline" className="text-[10px]">{r.category.replace(/_/g,' ')}</Badge>
                    {r.department && <Badge variant="secondary" className="text-[10px]">{r.department}</Badge>}
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
