import { useLanguage, translate, getLocale } from "@/contexts/LanguageContext";
import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Plus, Search, Trash2, TrendingUp, TrendingDown, Minus, GitBranch, Link2 } from 'lucide-react';
import { useLessons, type Lesson } from '@/hooks/useLessons';
import { useTable } from '@/hooks/useGovernance';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { canWriteMemory } from '@/lib/records';
import { RecordLinks } from '@/components/RecordLinks';
import { Checkbox } from '@/components/ui/checkbox';
import { lessonsKey } from '@/hooks/useLessons';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import LessonsAiInsights from '@/components/LessonsAiInsights';

const CATEGORIES = ['Strategy', 'Product', 'Hiring', 'Sales', 'Ops', 'Finance', 'Partnership', 'Crisis'];

export default function LessonsLearnedPage() {
  useLanguage();
  const { rows, save: saveLesson, remove: deleteLesson, loading, error } = useLessons();
  const { workspace, role } = useWorkspace();
  const writable = canWriteMemory(role);
  const { rows: memoryDecisions } = useTable<any>('decisions');
  const [editing, setEditing] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [legacy, setLegacy] = useState<Lesson[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [impact, setImpact] = useState('all');
  const [open, setOpen] = useState(false);
  const empty: Omit<Lesson, 'id' | 'created_at'> = {
    title: '', context: '', what_worked: '', what_failed: '', recommendation: '',
    category: 'Strategy', impact: 'mixed', source: '', observed_outcome: '', decisionIds: [],
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    try { setLegacy(JSON.parse(localStorage.getItem(lessonsKey(workspace?.id)) || '[]')); } catch { setLegacy([]); }
  }, [workspace?.id]);
  async function save() {
    setSaving(true);
    try { await saveLesson({ ...form, ...(editing ? { id: editing } : {}) }); setOpen(false); setEditing(null); setForm(empty); toast.success(translate('Saved')); } catch(e: any) { toast.error(e.message); } finally { setSaving(false); }
  }
  async function remove(id: string) { try { await deleteLesson(id); } catch(e: any) { toast.error(e.message); } }
  async function importSelected() { setSaving(true); try { for(const lesson of legacy.filter(l=>selected.includes(l.id))) { const {id,decisionIds,created_at,...rest}=lesson; await saveLesson(rest); } setSelected([]); toast.success(translate('Saved')); } catch(e:any) {toast.error(e.message);} finally {setSaving(false);} }

  const filtered = useMemo(() => rows.filter((r) => {
    const okC = cat === 'all' || r.category === cat;
    const okI = impact === 'all' || r.impact === impact;
    const ql = q.toLowerCase();
    const okQ = !ql || [r.title, r.context, r.recommendation, r.source].some((v) => v?.toLowerCase().includes(ql));
    return okC && okI && okQ;
  }), [rows, q, cat, impact]);

  const impactIcon = (i: Lesson['impact']) =>
    i === 'positive' ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" /> :
    i === 'negative' ? <TrendingDown className="h-3.5 w-3.5 text-red-500" /> :
    <Minus className="h-3.5 w-3.5 text-amber-500" />;

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary" /> {translate("Lessons Learned")}</h1>
          <p className="page-description">{translate("Distilled insights from past decisions, deals, launches and crises.")}</p>
        </div>
        <div className="flex gap-2">
          {writable && <Button asChild variant="outline" size="sm">
            <Link to="/memory/links"><Link2 className="h-4 w-4 mr-2" /> {translate("Link to decisions")}</Link>
          </Button>}
          <Dialog open={open} onOpenChange={setOpen}>
            {writable && <DialogTrigger asChild>
              <Button size="sm" onClick={()=>{setEditing(null);setForm(empty);}}><Plus className="h-4 w-4 mr-2" /> {translate("New Lesson")}</Button>
            </DialogTrigger>}
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{translate("Capture a lesson")}</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><Label>{translate("Title")}</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>{translate("Category")}</Label>
                    <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{translate(c)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>{translate("Impact")}</Label>
                    <Select value={form.impact} onValueChange={(v: any) => setForm({ ...form, impact: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="positive">{translate("Positive")}</SelectItem>
                        <SelectItem value="negative">{translate("Negative")}</SelectItem>
                        <SelectItem value="mixed">{translate("Mixed")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>{translate("Context")}</Label><Textarea rows={2} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} /></div>
                <div><Label>{translate("What worked")}</Label><Textarea rows={2} value={form.what_worked} onChange={(e) => setForm({ ...form, what_worked: e.target.value })} /></div>
                <div><Label>{translate("What failed")}</Label><Textarea rows={2} value={form.what_failed} onChange={(e) => setForm({ ...form, what_failed: e.target.value })} /></div>
                <div><Label>{translate("Recommendation for next time")}</Label><Textarea rows={2} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} /></div>
                <div><Label>{translate("Source (project, deal, incident…)")}</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
              </div>
              <div><Label>{translate("km.observed")}</Label><Textarea value={form.observed_outcome} onChange={e=>setForm({...form,observed_outcome:e.target.value})}/></div>
              <DialogFooter><Button disabled={saving} onClick={save}>{translate("Save")}</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={translate("Search lessons…")} className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{translate("All categories")}</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{translate(c)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={impact} onValueChange={setImpact}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{translate("All impact")}</SelectItem>
            <SelectItem value="positive">{translate("Positive")}</SelectItem>
            <SelectItem value="negative">{translate("Negative")}</SelectItem>
            <SelectItem value="mixed">{translate("Mixed")}</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      {loading && <p>{translate('Loading…')}</p>}
      {error && <p role="alert" className="text-destructive">{error}</p>}
      {writable && legacy.length > 0 && <details className="border border-border rounded-md p-4"><summary>{translate('km.import')}</summary><p className="text-sm text-muted-foreground my-3">{translate('km.localWarning')}</p>{legacy.map(l=><label key={l.id} className="flex gap-2 py-2"><Checkbox checked={selected.includes(l.id)} onCheckedChange={v=>setSelected(v?[...selected,l.id]:selected.filter(id=>id!==l.id))}/><span>{l.title} · {l.source}</span></label>)}<Button disabled={saving||!selected.length} onClick={importSelected}>{translate('km.importConfirm')}</Button></details>}
      <LessonsAiInsights lessons={rows} />

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((r) => {
          const linked = memoryDecisions.filter((d) => r.decisionIds?.includes(d.id));
          return (
            <Card key={r.id} id={`record-${r.id}`}>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">{translate(r.category)}</Badge>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{impactIcon(r.impact)} {translate(r.impact)}</span>
                    </div>
                    <h3 className="font-semibold mt-2">{r.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{r.source} · {new Date(r.created_at).toLocaleDateString(getLocale())}</p>
                  </div>
                  {writable && <div className="flex gap-1"><Button variant="outline" size="sm" onClick={()=>{setEditing(r.id);setForm({...empty,...r});setOpen(true);}}>{translate('Edit')}</Button><Button aria-label={translate('Delete')} variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button></div>}
                </div>
                {r.context && <p className="text-sm text-muted-foreground">{r.context}</p>}
                <div className="grid gap-2">
                  {r.what_worked && <Row label={translate("Worked")} tone="positive" value={r.what_worked} />}
                  {r.what_failed && <Row label={translate("Failed")} tone="negative" value={r.what_failed} />}
                  {r.recommendation && (
                    <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{translate("Next time")}</p>
                      <p className="text-sm">{r.recommendation}</p>
                    </div>
                  )}
                </div>
                <RecordLinks kind="lesson" id={r.id} />
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{translate("Linked decisions (")}{linked.length})</span>
                    <Link to="/memory/links" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> {translate("Manage")}
                    </Link>
                  </div>
                  {linked.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">{translate("No decisions linked yet.")}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {linked.map((d) => (
                        <Badge key={d.id} variant="secondary" className="gap-1 text-xs"><Link to={`/decisions/list/${d.id}`}>
                          <GitBranch className="h-3 w-3" /> {d.title}</Link>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" /> {translate("No lessons match your filters.")}
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, tone, value }: { label: string; tone: 'positive' | 'negative'; value: string }) {
  useLanguage();
  const cls = tone === 'positive' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : 'text-red-600 border-red-500/30 bg-red-500/5';
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider mb-1">{translate(label)}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
