import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Lightbulb, Plus, Search, Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

type Lesson = {
  id: string;
  title: string;
  context: string;
  what_worked: string;
  what_failed: string;
  recommendation: string;
  category: string;
  impact: 'positive' | 'negative' | 'mixed';
  source: string;
  created_at: string;
};

const CATEGORIES = ['Strategy', 'Product', 'Hiring', 'Sales', 'Ops', 'Finance', 'Partnership', 'Crisis'];

const seed: Lesson[] = [
  {
    id: 's1',
    title: 'Enterprise pilots need executive sponsor before day 1',
    context: 'Q2 pilot with a Fortune-500 buyer stalled for 4 months.',
    what_worked: 'Champion inside product team was highly engaged and technical.',
    what_failed: 'No VP-level sponsor meant procurement blocked commercial expansion.',
    recommendation: 'Only start paid pilots when a named EVP sponsor is on the kickoff call.',
    category: 'Sales',
    impact: 'negative',
    source: 'Deal review – Acme Corp',
    created_at: new Date().toISOString(),
  },
  {
    id: 's2',
    title: 'Small async design reviews beat 90-min meetings',
    context: 'Weekly design review meetings ran long without decisions.',
    what_worked: 'Switching to Loom + written responses cut cycle time by 60%.',
    what_failed: 'Live meetings encouraged tangents and social debate.',
    recommendation: 'Default to async design reviews; live only for tier-1 launches.',
    category: 'Product',
    impact: 'positive',
    source: 'Design ops retro',
    created_at: new Date().toISOString(),
  },
];

export default function LessonsLearnedPage() {
  const { workspace } = useWorkspace();
  const key = workspace ? `mem:lessons:${workspace.id}` : 'mem:lessons';
  const [rows, setRows] = useState<Lesson[]>([]);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('all');
  const [impact, setImpact] = useState('all');
  const [open, setOpen] = useState(false);
  const empty: Omit<Lesson, 'id' | 'created_at'> = {
    title: '', context: '', what_worked: '', what_failed: '', recommendation: '',
    category: 'Strategy', impact: 'mixed', source: '',
  };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!workspace) return;
    const raw = localStorage.getItem(key);
    const initial = raw ? (JSON.parse(raw) as Lesson[]) : seed;
    setRows(initial);
    if (!raw) localStorage.setItem(key, JSON.stringify(initial));
    localStorage.setItem(`${key}:count`, String(initial.length));
  }, [workspace, key]);

  function persist(next: Lesson[]) {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(`${key}:count`, String(next.length));
  }

  function save() {
    if (!form.title.trim()) return toast.error('Başlık gerekli');
    const next = [{ ...form, id: crypto.randomUUID(), created_at: new Date().toISOString() }, ...rows];
    persist(next);
    setOpen(false);
    setForm(empty);
    toast.success('Ders eklendi');
  }

  function remove(id: string) {
    persist(rows.filter((r) => r.id !== id));
  }

  const filtered = useMemo(() => rows.filter((r) => {
    const okC = cat === 'all' || r.category === cat;
    const okI = impact === 'all' || r.impact === impact;
    const ql = q.toLowerCase();
    const okQ = !ql || [r.title, r.context, r.recommendation, r.source].some((v) => v.toLowerCase().includes(ql));
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
          <h1 className="page-title flex items-center gap-2"><Lightbulb className="h-6 w-6 text-primary" /> Lessons Learned</h1>
          <p className="page-description">Distilled insights from past decisions, deals, launches and crises.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Lesson</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Capture a lesson</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Impact</Label>
                  <Select value={form.impact} onValueChange={(v: any) => setForm({ ...form, impact: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                      <SelectItem value="mixed">Mixed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Context</Label><Textarea rows={2} value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} /></div>
              <div><Label>What worked</Label><Textarea rows={2} value={form.what_worked} onChange={(e) => setForm({ ...form, what_worked: e.target.value })} /></div>
              <div><Label>What failed</Label><Textarea rows={2} value={form.what_failed} onChange={(e) => setForm({ ...form, what_failed: e.target.value })} /></div>
              <div><Label>Recommendation for next time</Label><Textarea rows={2} value={form.recommendation} onChange={(e) => setForm({ ...form, recommendation: e.target.value })} /></div>
              <div><Label>Source (project, deal, incident…)</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={impact} onValueChange={setImpact}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All impact</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
            <SelectItem value="mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
      </CardContent></Card>

      <div className="grid md:grid-cols-2 gap-3">
        {filtered.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{r.category}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">{impactIcon(r.impact)} {r.impact}</span>
                  </div>
                  <h3 className="font-semibold mt-2">{r.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{r.source} · {new Date(r.created_at).toLocaleDateString()}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
              {r.context && <p className="text-sm text-muted-foreground">{r.context}</p>}
              <div className="grid gap-2">
                {r.what_worked && <Row label="Worked" tone="positive" value={r.what_worked} />}
                {r.what_failed && <Row label="Failed" tone="negative" value={r.what_failed} />}
                {r.recommendation && (
                  <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-primary mb-1">Next time</p>
                    <p className="text-sm">{r.recommendation}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <Card className="md:col-span-2"><CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" /> No lessons match your filters.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}

function Row({ label, tone, value }: { label: string; tone: 'positive' | 'negative'; value: string }) {
  const cls = tone === 'positive' ? 'text-emerald-600 border-emerald-500/30 bg-emerald-500/5' : 'text-red-600 border-red-500/30 bg-red-500/5';
  return (
    <div className={`rounded-md border p-2.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider mb-1">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  );
}
