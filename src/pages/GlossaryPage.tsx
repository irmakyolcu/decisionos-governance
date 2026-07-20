import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { BookMarked, Plus, Search, Trash2 } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

type Term = { id: string; term: string; definition: string; aliases: string; category: string; owner: string };

const seed: Term[] = [
  { id: 't1', term: 'ARR', definition: 'Annual Recurring Revenue. Sum of active subscription MRR × 12.', aliases: 'Annual Recurring Revenue', category: 'Finance', owner: 'CFO' },
  { id: 't2', term: 'Decision Room', definition: 'Governed workspace where a specific decision is proposed, evaluated by AI and approved by humans.', aliases: 'Karar Odası', category: 'Product', owner: 'CPO' },
  { id: 't3', term: 'Authority Level', definition: '0–3 scale that gates what an AI agent may execute autonomously. Level 3 always requires human approval.', aliases: 'AL', category: 'Governance', owner: 'Chief of Staff' },
  { id: 't4', term: 'Company Brain', definition: 'The unified, structured substrate of clients, projects, processes, risks and decisions that the whole company reasons from.', aliases: 'Kurumsal Beyin', category: 'Product', owner: 'CEO' },
];

export default function GlossaryPage() {
  const { workspace } = useWorkspace();
  const key = workspace ? `mem:glossary:${workspace.id}` : 'mem:glossary';
  const [rows, setRows] = useState<Term[]>([]);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const empty: Omit<Term, 'id'> = { term: '', definition: '', aliases: '', category: '', owner: '' };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!workspace) return;
    const raw = localStorage.getItem(key);
    const initial = raw ? (JSON.parse(raw) as Term[]) : seed;
    setRows(initial);
    if (!raw) localStorage.setItem(key, JSON.stringify(initial));
  }, [workspace, key]);

  function persist(next: Term[]) { setRows(next); localStorage.setItem(key, JSON.stringify(next)); }
  function save() {
    if (!form.term.trim()) return toast.error('Terim gerekli');
    persist([{ ...form, id: crypto.randomUUID() }, ...rows]);
    setOpen(false); setForm(empty); toast.success('Terim eklendi');
  }
  function remove(id: string) { persist(rows.filter((r) => r.id !== id)); }

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return [...rows]
      .filter((r) => !ql || [r.term, r.definition, r.aliases, r.category].some((v) => v.toLowerCase().includes(ql)))
      .sort((a, b) => a.term.localeCompare(b.term));
  }, [rows, q]);

  const grouped = useMemo(() => {
    const g: Record<string, Term[]> = {};
    filtered.forEach((t) => {
      const letter = (t.term[0] || '#').toUpperCase();
      (g[letter] ||= []).push(t);
    });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2"><BookMarked className="h-6 w-6 text-primary" /> Glossary</h1>
          <p className="page-description">Canonical definitions for internal terminology, acronyms and metrics.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Term</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add term</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Term</Label><Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} /></div>
              <div><Label>Definition</Label><Textarea rows={3} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Aliases</Label><Input value={form.aliases} onChange={(e) => setForm({ ...form, aliases: e.target.value })} placeholder="Comma separated" /></div>
                <div><Label>Category</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              </div>
              <div><Label>Owner</Label><Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
            </div>
            <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card><CardContent className="p-4">
        <div className="relative max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search terms, aliases…" className="pl-9" />
        </div>
      </CardContent></Card>

      <div className="space-y-6">
        {grouped.map(([letter, terms]) => (
          <div key={letter}>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-7 w-7 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">{letter}</div>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {terms.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold">{t.term}</h3>
                          {t.category && <Badge variant="outline" className="text-xs">{t.category}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1.5">{t.definition}</p>
                        <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                          {t.aliases && <span>Also: {t.aliases}</span>}
                          {t.owner && <span>Owner: {t.owner}</span>}
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(t.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
        {grouped.length === 0 && (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
            <BookMarked className="h-6 w-6 mx-auto mb-2 opacity-50" /> No terms match.
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
