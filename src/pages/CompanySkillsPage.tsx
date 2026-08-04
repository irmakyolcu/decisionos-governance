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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Zap, Trash2, Pencil, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const STATUS_COLOR: Record<string, string> = { draft: 'secondary', active: 'default', needs_review: 'destructive', deprecated: 'outline' };

interface SkillForm {
  name: string;
  description: string;
  trigger: string;
  steps: string[];
  decision_rules: string[];
  expected_output: string;
  status: string;
}

const emptyForm = (): SkillForm => ({
  name: '', description: '', trigger: '', steps: [''], decision_rules: [''], expected_output: '', status: 'draft',
});

const toStepText = (s: any): string =>
  typeof s === 'string' ? s : (s?.instruction ?? s?.text ?? '');

export default function CompanySkillsPage() {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const { toast } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SkillForm>(emptyForm());

  const load = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('company_skills').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setRows(data ?? []);
  };
  useEffect(() => { load(); }, [workspace]);

  const openNew = () => { setEditingId(null); setForm(emptyForm()); setOpen(true); };

  const openEdit = (s: any) => {
    setEditingId(s.id);
    setForm({
      name: s.name ?? '',
      description: s.description ?? '',
      trigger: s.trigger ?? '',
      steps: Array.isArray(s.steps) && s.steps.length ? s.steps.map(toStepText) : [''],
      decision_rules: Array.isArray(s.decision_rules) && s.decision_rules.length ? s.decision_rules.map(String) : [''],
      expected_output: s.expected_output ?? '',
      status: s.status ?? 'draft',
    });
    setOpen(true);
  };

  // --- list helpers ---
  const setList = (key: 'steps' | 'decision_rules', list: string[]) => setForm((f) => ({ ...f, [key]: list }));
  const updateItem = (key: 'steps' | 'decision_rules', i: number, v: string) =>
    setList(key, form[key].map((x, idx) => (idx === i ? v : x)));
  const addItem = (key: 'steps' | 'decision_rules') => setList(key, [...form[key], '']);
  const removeItem = (key: 'steps' | 'decision_rules', i: number) => {
    const next = form[key].filter((_, idx) => idx !== i);
    setList(key, next.length ? next : ['']);
  };
  const moveItem = (key: 'steps' | 'decision_rules', i: number, dir: -1 | 1) => {
    const next = [...form[key]];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    setList(key, next);
  };
  const reorderItem = (key: 'steps' | 'decision_rules', from: number, to: number) => {
    if (from === to || from < 0 || to < 0) return;
    const next = [...form[key]];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setList(key, next);
  };

  const save = async () => {
    if (!workspace || !user || !form.name.trim()) {
      toast({ title: 'Skill adı gerekli', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description,
      trigger: form.trigger,
      steps: form.steps.map((s) => s.trim()).filter(Boolean).map((s, i) => ({ order: i + 1, instruction: s })),
      decision_rules: form.decision_rules.map((s) => s.trim()).filter(Boolean),
      expected_output: form.expected_output,
      status: form.status as any,
    };

    const { error } = editingId
      ? await supabase.from('company_skills').update(payload).eq('id', editingId)
      : await supabase.from('company_skills').insert({ ...payload, workspace_id: workspace.id, created_by: user.id });

    setSaving(false);
    if (error) return toast({ title: 'Kaydedilemedi', description: error.message, variant: 'destructive' });
    toast({ title: editingId ? 'Skill güncellendi' : 'Skill oluşturuldu' });
    setOpen(false); setEditingId(null); setForm(emptyForm()); load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('company_skills').delete().eq('id', id);
    if (error) return toast({ title: 'Silinemedi', description: error.message, variant: 'destructive' });
    toast({ title: 'Skill silindi' });
    load();
  };

  const renderList = (key: 'steps' | 'decision_rules', label: string, placeholder: string, addLabel: string) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <p className="text-[11px] text-muted-foreground">Sıralamayı değiştirmek için tutamaçtan sürükleyip bırakın.</p>
      <div className="space-y-2">
        {form[key].map((val, i) => {
          const isDragging = drag?.key === key && drag.from === i;
          const isOver = drag?.key === key && drag.over === i && drag.from !== i;
          return (
            <div
              key={i}
              onDragOver={(e) => {
                if (drag?.key !== key) return;
                e.preventDefault();
                if (drag.over !== i) setDrag({ ...drag, over: i });
              }}
              onDrop={(e) => {
                if (drag?.key !== key) return;
                e.preventDefault();
                reorderItem(key, drag.from, i);
                setDrag(null);
              }}
              className={`flex items-start gap-2 rounded-md transition-all ${isDragging ? 'opacity-50' : ''} ${isOver ? 'ring-2 ring-primary/60' : ''}`}
            >
              <div
                draggable
                onDragStart={() => setDrag({ key, from: i, over: i })}
                onDragEnd={() => setDrag(null)}
                title="Sürükleyerek taşı"
                className="mt-2 flex items-center gap-1 text-xs text-muted-foreground w-10 shrink-0 cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical className="h-3.5 w-3.5" />
                <span>{i + 1}</span>
              </div>
              <Textarea
                rows={2}
                className="flex-1 min-h-[38px]"
                placeholder={placeholder}
                value={val}
                onChange={(e) => updateItem(key, i, e.target.value)}
              />
              <div className="flex flex-col gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(key, i, -1)} disabled={i === 0}>
                  <ArrowUp className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem(key, i, 1)} disabled={i === form[key].length - 1}>
                  <ArrowDown className="h-3 w-3" />
                </Button>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeItem(key, i)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => addItem(key)}>
        <Plus className="h-3 w-3 mr-1" /> {addLabel}
      </Button>
    </div>
  );


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Skills</h1>
          <p className="text-sm text-muted-foreground">Executable instructions for employees and AI agents.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />New Skill</Button>
      </div>

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setEditingId(null); setForm(emptyForm()); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editingId ? 'Skill Düzenle' : 'New Company Skill'}</DialogTitle></DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-auto pr-1">
            <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>Trigger (when to use)</Label><Input value={form.trigger} onChange={(e) => setForm({ ...form, trigger: e.target.value })} /></div>

            {renderList('steps', 'Steps', 'Adımı yazın…', 'Add step')}
            {renderList('decision_rules', 'Decision rules', 'Kuralı yazın…', 'Add rule')}

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
            <Button onClick={save} disabled={saving} className="w-full">
              {saving ? 'Kaydediliyor…' : editingId ? 'Değişiklikleri kaydet' : 'Create Skill'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {rows.length === 0 ? (
        <Card className="p-12 text-center"><Zap className="h-8 w-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">No skills yet.</p></Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {rows.map((s) => (
            <Card key={s.id} className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />{s.name}</div>
                <div className="flex items-center gap-1">
                  <Badge variant={STATUS_COLOR[s.status] as any} className="text-[10px]">{s.status}</Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                </div>
              </div>
              {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              {s.trigger && <div className="text-xs"><span className="text-muted-foreground">Trigger: </span>{s.trigger}</div>}
              {Array.isArray(s.steps) && s.steps.length > 0 && (
                <ol className="list-decimal pl-5 space-y-0.5">
                  {s.steps.map((st: any, i: number) => (
                    <li key={i} className="text-xs text-muted-foreground">{toStepText(st)}</li>
                  ))}
                </ol>
              )}
              <div className="text-[10px] text-muted-foreground">v{s.version} · {Array.isArray(s.steps) ? s.steps.length : 0} steps</div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
