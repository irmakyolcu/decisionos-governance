import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { memoryDecisions } from '@/data/ceoTwin';
import type { DecisionCategory } from '@/types/ceoTwin';
import { Search, BookOpen, Lightbulb, Link2 } from 'lucide-react';
import { useLessons } from '@/hooks/useLessons';
import { Link } from 'react-router-dom';

const CATS: DecisionCategory[] = ['Strategy','Partnership','Hiring','Finance','Product','Legal','Sales','Investor Relations'];

export default function DecisionMemoryPage() {
  const [q, setQ] = useState('');
  const [active, setActive] = useState<DecisionCategory | 'All'>('All');
  const { rows: lessons } = useLessons();
  const lessonsByDecision = useMemo(() => {
    const map: Record<string, typeof lessons> = {};
    lessons.forEach((l) => (l.decisionIds ?? []).forEach((did) => {
      (map[did] ||= []).push(l);
    }));
    return map;
  }, [lessons]);

  const items = useMemo(() => {
    return memoryDecisions.filter((d) => {
      const matchCat = active === 'All' || d.category === active;
      const ql = q.toLowerCase().trim();
      const matchQ = !ql || [d.title, d.finalDecision, d.reasoning, d.lessons, d.outcome].some((t) => t.toLowerCase().includes(ql));
      return matchCat && matchQ;
    });
  }, [q, active]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Decision Memory</h1>
        <p className="page-description">The CEO's past decisions, why they were made, and what was learned. This is the substrate the Judgment Layer reasons from.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decisions, reasoning, lessons…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={active === 'All' ? 'default' : 'outline'} size="sm" onClick={() => setActive('All')}>All</Button>
          {CATS.map((c) => (
            <Button key={c} variant={active === c ? 'default' : 'outline'} size="sm" onClick={() => setActive(c)}>{c}</Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {items.length === 0 && (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground"><BookOpen className="h-6 w-6 mx-auto mb-2 opacity-50" />No decisions match.</CardContent></Card>
        )}
        {items.map((d) => (
          <Card key={d.id} className="hover:border-primary/40 transition-colors">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-semibold text-foreground">{d.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{new Date(d.date).toLocaleDateString()} · {d.category}</p>
                </div>
                <Badge variant="secondary">{d.category}</Badge>
              </div>
              <Field label="Final decision" value={d.finalDecision} />
              <Field label="Why" value={d.reasoning} />
              <Field label="Outcome" value={d.outcome} />
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Accepted risks</p>
                <div className="flex flex-wrap gap-1">
                  {d.acceptedRisks.map((r) => <Badge key={r} variant="outline" className="text-xs">{r}</Badge>)}
                </div>
              </div>
              <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5">
                <p className="text-[10px] uppercase tracking-wider text-primary mb-1">Lesson</p>
                <p className="text-sm text-foreground">{d.lessons}</p>
              </div>
              {(() => {
                const linked = lessonsByDecision[d.id] ?? [];
                return (
                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Linked lessons ({linked.length})</span>
                      <Link to="/memory/links" className="text-[11px] text-primary hover:underline inline-flex items-center gap-1">
                        <Link2 className="h-3 w-3" /> Manage
                      </Link>
                    </div>
                    {linked.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">No lessons linked yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {linked.map((l) => (
                          <Badge key={l.id} variant="secondary" className="gap-1 text-xs">
                            <Lightbulb className="h-3 w-3" /> {l.title}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground mt-0.5">{value}</p>
    </div>
  );
}
