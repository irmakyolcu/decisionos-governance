import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Link2, Sparkles, Search, Check, X, Lightbulb, GitBranch, ArrowRight, Wand2,
} from 'lucide-react';
import { useLessons, scoreMatch, type Lesson } from '@/hooks/useLessons';
import { memoryDecisions } from '@/data/ceoTwin';
import { toast } from 'sonner';

const MIN_SCORE = 2;

export default function LessonDecisionLinksPage() {
  const { rows: lessons, setLinks, persist } = useLessons();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>('all');
  const [showOnlyUnlinked, setShowOnlyUnlinked] = useState(false);

  const filtered = useMemo(() => {
    const ql = q.toLowerCase();
    return lessons.filter((l) => {
      const okQ = !ql || [l.title, l.context, l.recommendation, l.source].some((v) => v?.toLowerCase().includes(ql));
      const okC = cat === 'all' || l.category === cat;
      const okU = !showOnlyUnlinked || !(l.decisionIds && l.decisionIds.length);
      return okQ && okC && okU;
    });
  }, [lessons, q, cat, showOnlyUnlinked]);

  const categories = useMemo(() => Array.from(new Set(lessons.map((l) => l.category))), [lessons]);

  function suggestFor(lesson: Lesson) {
    const text = [lesson.title, lesson.context, lesson.what_worked, lesson.what_failed, lesson.recommendation].join(' ');
    return memoryDecisions
      .map((d) => ({ d, score: scoreMatch(text, [d.title, d.finalDecision, d.reasoning, d.outcome, d.lessons].join(' ')) }))
      .filter((x) => x.score >= MIN_SCORE)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  function autoLinkAll() {
    let touched = 0;
    lessons.forEach((l) => {
      const sug = suggestFor(l);
      if (!sug.length) return;
      const existing = new Set(l.decisionIds ?? []);
      const nextIds = new Set(existing);
      sug.forEach((s) => nextIds.add(s.d.id));
      if (nextIds.size !== existing.size) {
        setLinks(l.id, [...nextIds], 'auto_link_all');
        touched += 1;
      }
    });
    toast.success(touched ? `${touched} ders için otomatik bağlantı eklendi` : 'Yeni eşleşme bulunamadı');
  }

  const totalLinks = lessons.reduce((n, l) => n + (l.decisionIds?.length ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="page-header flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Link2 className="h-6 w-6 text-primary" /> Lessons ↔ Decisions
          </h1>
          <p className="page-description">
            Bir dersi bir veya birden fazla geçmiş karara bağlayın. Otomatik öneri anahtar kelime örtüşmesine göre çalışır.
          </p>
        </div>
        <Button size="sm" onClick={autoLinkAll}>
          <Wand2 className="h-4 w-4 mr-2" /> Auto-link all
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Lessons" value={lessons.length} />
        <Stat label="Decisions in memory" value={memoryDecisions.length} />
        <Stat label="Total links" value={totalLinks} />
        <Stat label="Unlinked lessons" value={lessons.filter((l) => !(l.decisionIds && l.decisionIds.length)).length} />
      </div>

      <Card><CardContent className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search lessons…" className="pl-9" />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={showOnlyUnlinked} onCheckedChange={(v) => setShowOnlyUnlinked(Boolean(v))} />
          Only unlinked
        </label>
      </CardContent></Card>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <Card><CardContent className="p-10 text-center text-sm text-muted-foreground">
            <Lightbulb className="h-6 w-6 mx-auto mb-2 opacity-50" /> No lessons match. Add some in Lessons Learned first.
          </CardContent></Card>
        )}

        {filtered.map((l) => {
          const linked = memoryDecisions.filter((d) => l.decisionIds?.includes(d.id));
          const suggestions = suggestFor(l).filter((s) => !l.decisionIds?.includes(s.d.id));

          return (
            <Card key={l.id}>
              <CardContent className="p-5">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.2fr)] gap-4 items-start">
                  {/* Lesson */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs"><Lightbulb className="h-3 w-3 mr-1" />{l.category}</Badge>
                      <span className="text-[11px] text-muted-foreground capitalize">{l.impact}</span>
                    </div>
                    <h3 className="font-semibold mt-1.5">{l.title}</h3>
                    {l.recommendation && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">→ {l.recommendation}</p>
                    )}
                  </div>

                  <ArrowRight className="hidden lg:block h-4 w-4 text-muted-foreground mt-6" />

                  {/* Linked decisions + manage */}
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Linked decisions ({linked.length})</span>
                      <DecisionPicker lesson={l} onChange={(ids) => setLinks(l.id, ids)} />
                    </div>

                    {linked.length === 0 && suggestions.length === 0 && (
                      <p className="text-xs text-muted-foreground italic">No links yet. Use "Manage links" or the suggestions.</p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
                      {linked.map((d) => (
                        <Badge key={d.id} variant="secondary" className="gap-1">
                          <GitBranch className="h-3 w-3" />
                          {d.title}
                          <button
                            className="ml-1 hover:text-destructive"
                            onClick={() => setLinks(l.id, (l.decisionIds ?? []).filter((x) => x !== d.id))}
                            aria-label="Remove link"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    {suggestions.length > 0 && (
                      <div className="rounded-md border border-dashed p-3 bg-primary/5">
                        <div className="flex items-center gap-1.5 text-xs text-primary mb-2">
                          <Sparkles className="h-3.5 w-3.5" /> Suggested matches
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestions.map((s) => (
                            <button
                              key={s.d.id}
                              onClick={() => setLinks(l.id, [...(l.decisionIds ?? []), s.d.id])}
                              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border bg-background hover:border-primary transition"
                            >
                              <Check className="h-3 w-3 text-emerald-500" />
                              {s.d.title}
                              <span className="text-[10px] text-muted-foreground">·{s.score}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </CardContent></Card>
  );
}

function DecisionPicker({ lesson, onChange }: { lesson: Lesson; onChange: (ids: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const linked = new Set(lesson.decisionIds ?? []);
  const list = useMemo(() => {
    const ql = q.toLowerCase();
    return memoryDecisions.filter((d) => !ql || [d.title, d.category, d.reasoning, d.finalDecision].some((v) => v.toLowerCase().includes(ql)));
  }, [q]);

  function toggle(id: string) {
    const next = new Set(linked);
    next.has(id) ? next.delete(id) : next.add(id);
    onChange([...next]);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm"><Link2 className="h-3.5 w-3.5 mr-1.5" /> Manage links</Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search decisions…" className="pl-9 h-9" />
          </div>
        </div>
        <ScrollArea className="max-h-80">
          <div className="p-2">
            {list.map((d) => (
              <label key={d.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-muted cursor-pointer">
                <Checkbox checked={linked.has(d.id)} onCheckedChange={() => toggle(d.id)} className="mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{d.title}</div>
                  <div className="text-[11px] text-muted-foreground">{d.category} · {new Date(d.date).toLocaleDateString()}</div>
                </div>
              </label>
            ))}
            {list.length === 0 && <div className="p-6 text-center text-xs text-muted-foreground">No decisions match.</div>}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
