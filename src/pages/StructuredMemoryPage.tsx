import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTable } from '@/hooks/useGovernance';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { BookOpen, Plus, Lock, Search, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;
const SENS = ['public', 'internal', 'confidential', 'restricted'] as const;
const sensColor: Record<string, string> = {
  public: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
  internal: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
  confidential: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  restricted: 'bg-red-500/10 text-red-700 border-red-500/30',
};

export default function StructuredMemoryPage() {
  const { rows, refetch } = useTable<any>('memory_entries');
  const { workspace } = useWorkspace();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [sensFilter, setSensFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const emptyForm = { title: '', summary: '', context: '', outcome: '', tags: '', sensitivity: 'internal' };
  const [form, setForm] = useState(emptyForm);

  function openEdit(e: any) {
    setEditing(e);
    setForm({
      title: e.title ?? '', summary: e.summary ?? '', context: e.context ?? '',
      outcome: e.outcome ?? '', tags: (e.tags ?? []).join(', '), sensitivity: e.sensitivity ?? 'internal',
    });
    setOpen(true);
  }
  function openNew() { setEditing(null); setForm(emptyForm); setOpen(true); }

  async function del(id: string) {
    const { error } = await db.from('memory_entries').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Silindi'); refetch();
  }

  const filtered = useMemo(() => rows.filter((r) =>
    (sensFilter === 'all' || r.sensitivity === sensFilter) &&
    (!q || r.title?.toLowerCase().includes(q.toLowerCase()) ||
      r.summary?.toLowerCase().includes(q.toLowerCase()) ||
      (r.tags || []).join(' ').toLowerCase().includes(q.toLowerCase()))
  ), [rows, q, sensFilter]);

  async function save() {
    if (!workspace || !form.title) return;
    const payload = {
      workspace_id: workspace.id,
      title: form.title, summary: form.summary, context: form.context,
      outcome: form.outcome, sensitivity: form.sensitivity,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
    };
    const { error } = editing
      ? await db.from('memory_entries').update(payload).eq('id', editing.id)
      : await db.from('memory_entries').insert({ ...payload, created_by: user?.id });
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Güncellendi' : 'Kaydedildi');
    setOpen(false); setEditing(null); setForm(emptyForm); refetch();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><BookOpen className="h-7 w-7" /> Decision Memory</h1>
          <p className="text-muted-foreground mt-1">Structured library of past decisions. Sensitivity controls how the Twin uses each entry.</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Add Entry</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? 'Kaydı düzenle' : 'New memory entry'}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} /></div>
              <div><Label>Summary</Label><Textarea value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} /></div>
              <div><Label>Context</Label><Textarea value={form.context} onChange={(e) => setForm({...form, context: e.target.value})} rows={2} /></div>
              <div><Label>Outcome</Label><Textarea value={form.outcome} onChange={(e) => setForm({...form, outcome: e.target.value})} rows={2} /></div>
              <div><Label>Tags (comma-separated)</Label><Input value={form.tags} onChange={(e) => setForm({...form, tags: e.target.value})} placeholder="hiring, pricing, strategy" /></div>
              <div><Label>Sensitivity</Label>
                <Select value={form.sensitivity} onValueChange={(v) => setForm({...form, sensitivity: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SENS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter><Button onClick={save}>{editing ? 'Güncelle' : 'Save'}</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>


      <div className="flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, summary, tags…" className="pl-8" />
        </div>
        <Select value={sensFilter} onValueChange={setSensFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sensitivities</SelectItem>
            {SENS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 && <p className="text-sm text-muted-foreground col-span-full">No entries match.</p>}
        {filtered.map((e) => (
          <Card key={e.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{e.title}</CardTitle>
                <Badge variant="outline" className={sensColor[e.sensitivity]}>
                  {(e.sensitivity === 'confidential' || e.sensitivity === 'restricted') && <Lock className="h-3 w-3 mr-1" />}
                  {e.sensitivity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {e.summary && <p>{e.summary}</p>}
              {e.outcome && <p className="text-xs"><strong>Outcome:</strong> {e.outcome}</p>}
              {e.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {e.tags.map((t: string) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                </div>
              )}
              <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleDateString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
