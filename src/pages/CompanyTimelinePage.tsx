import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Plus, Trash2, Flag, Rocket, TrendingUp, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { toast } from 'sonner';

type Kind = 'founding' | 'launch' | 'funding' | 'hiring' | 'pivot' | 'crisis' | 'milestone';
type Milestone = { id: string; date: string; title: string; kind: Kind; description: string; impact: string };

const KIND_META: Record<Kind, { label: string; icon: any; color: string }> = {
  founding: { label: 'Founding', icon: Flag, color: 'text-purple-500 border-purple-500/40 bg-purple-500/10' },
  launch: { label: 'Launch', icon: Rocket, color: 'text-blue-500 border-blue-500/40 bg-blue-500/10' },
  funding: { label: 'Funding', icon: DollarSign, color: 'text-emerald-500 border-emerald-500/40 bg-emerald-500/10' },
  hiring: { label: 'Hiring', icon: Users, color: 'text-cyan-500 border-cyan-500/40 bg-cyan-500/10' },
  pivot: { label: 'Pivot', icon: TrendingUp, color: 'text-amber-500 border-amber-500/40 bg-amber-500/10' },
  crisis: { label: 'Crisis', icon: AlertTriangle, color: 'text-red-500 border-red-500/40 bg-red-500/10' },
  milestone: { label: 'Milestone', icon: Flag, color: 'text-slate-500 border-slate-500/40 bg-slate-500/10' },
};

const seed: Milestone[] = [
  { id: 'm1', date: '2022-03-14', title: 'Company founded', kind: 'founding', description: 'Two co-founders, one seed idea.', impact: 'Reference point for equity, culture and legal structure.' },
  { id: 'm2', date: '2022-11-01', title: 'Seed round closed ($2.5M)', kind: 'funding', description: 'Led by Tier-1 fund, 24-month runway.', impact: 'Enabled first 6 hires.' },
  { id: 'm3', date: '2023-06-20', title: 'Public v1 launch', kind: 'launch', description: 'Shipped to public waitlist.', impact: 'First 400 paying customers within 60 days.' },
  { id: 'm4', date: '2024-02-05', title: 'Pivot to enterprise', kind: 'pivot', description: 'Moved from SMB to mid-market/enterprise.', impact: 'ACV grew 8×, sales cycle grew 3×.' },
];

export default function CompanyTimelinePage() {
  const { workspace } = useWorkspace();
  const key = workspace ? `mem:milestones:${workspace.id}` : 'mem:milestones';
  const [rows, setRows] = useState<Milestone[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [open, setOpen] = useState(false);
  const empty: Omit<Milestone, 'id'> = { date: new Date().toISOString().slice(0, 10), title: '', kind: 'milestone', description: '', impact: '' };
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!workspace) return;
    const raw = localStorage.getItem(key);
    const initial = raw ? (JSON.parse(raw) as Milestone[]) : seed;
    setRows(initial);
    if (!raw) localStorage.setItem(key, JSON.stringify(initial));
    localStorage.setItem(`${key}:count`, String(initial.length));
  }, [workspace, key]);

  function persist(next: Milestone[]) {
    setRows(next);
    localStorage.setItem(key, JSON.stringify(next));
    localStorage.setItem(`${key}:count`, String(next.length));
  }
  function save() {
    if (!form.title.trim()) return toast.error('Başlık gerekli');
    persist([{ ...form, id: crypto.randomUUID() }, ...rows]);
    setOpen(false); setForm(empty); toast.success('Milestone eklendi');
  }
  function remove(id: string) { persist(rows.filter((r) => r.id !== id)); }

  const sorted = useMemo(() =>
    [...rows]
      .filter((r) => filter === 'all' || r.kind === filter)
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
  [rows, filter]);

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2"><History className="h-6 w-6 text-primary" /> Company Timeline</h1>
          <p className="page-description">The company's history — the events every executive and AI agent should know.</p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All events</SelectItem>
              {Object.entries(KIND_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-2" /> New Milestone</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Add milestone</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Date</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                  <div>
                    <Label>Type</Label>
                    <Select value={form.kind} onValueChange={(v: Kind) => setForm({ ...form, kind: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{Object.entries(KIND_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
                <div><Label>Description</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
                <div><Label>Impact</Label><Textarea rows={2} value={form.impact} onChange={(e) => setForm({ ...form, impact: e.target.value })} /></div>
              </div>
              <DialogFooter><Button onClick={save}>Save</Button></DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="relative pl-8">
        <div className="absolute left-3 top-2 bottom-2 w-px bg-border" />
        <div className="space-y-4">
          {sorted.map((m) => {
            const meta = KIND_META[m.kind];
            const Icon = meta.icon;
            return (
              <div key={m.id} className="relative">
                <div className={`absolute -left-8 top-2 h-6 w-6 rounded-full border flex items-center justify-center ${meta.color}`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">{new Date(m.date).toLocaleDateString()}</span>
                          <Badge variant="outline" className="text-xs">{meta.label}</Badge>
                        </div>
                        <h3 className="font-semibold mt-1">{m.title}</h3>
                        {m.description && <p className="text-sm text-muted-foreground mt-1">{m.description}</p>}
                        {m.impact && (
                          <div className="mt-2 rounded-md bg-primary/5 border border-primary/20 p-2">
                            <p className="text-[10px] uppercase tracking-wider text-primary">Impact</p>
                            <p className="text-sm">{m.impact}</p>
                          </div>
                        )}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(m.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })}
          {sorted.length === 0 && (
            <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
              <History className="h-6 w-6 mx-auto mb-2 opacity-50" /> No milestones yet.
            </CardContent></Card>
          )}
        </div>
      </div>
    </div>
  );
}
