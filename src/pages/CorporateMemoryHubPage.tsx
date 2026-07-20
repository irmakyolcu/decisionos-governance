import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Brain, BookOpen, Lightbulb, History, BookMarked, GitBranch,
  Search, TrendingUp, Clock, ShieldAlert, Sparkles, ArrowRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';

type Stat = { label: string; value: number; hint: string };

export default function CorporateMemoryHubPage() {
  const { workspace } = useWorkspace();
  const [q, setQ] = useState('');
  const [stats, setStats] = useState<Stat[]>([
    { label: 'Memory Entries', value: 0, hint: 'Structured knowledge' },
    { label: 'Recorded Decisions', value: 0, hint: 'With rationale + outcome' },
    { label: 'Lessons Learned', value: 0, hint: 'Distilled insights' },
    { label: 'Timeline Milestones', value: 0, hint: 'Company history' },
  ]);

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      const [m, d] = await Promise.all([
        supabase.from('memory_entries' as any).select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
        supabase.from('decisions' as any).select('*', { count: 'exact', head: true }).eq('workspace_id', workspace.id),
      ]);
      const lessons = Number(localStorage.getItem(`mem:lessons:${workspace.id}:count`) || 0);
      const milestones = Number(localStorage.getItem(`mem:milestones:${workspace.id}:count`) || 0);
      setStats([
        { label: 'Memory Entries', value: m.count ?? 0, hint: 'Structured knowledge' },
        { label: 'Recorded Decisions', value: d.count ?? 0, hint: 'With rationale + outcome' },
        { label: 'Lessons Learned', value: lessons, hint: 'Distilled insights' },
        { label: 'Timeline Milestones', value: milestones, hint: 'Company history' },
      ]);
    })();
  }, [workspace]);

  const sections = [
    {
      title: 'Structured Memory',
      desc: 'Sensitivity-tagged knowledge entries with tags & search.',
      href: '/memory/structured',
      icon: BookOpen,
      accent: 'from-blue-500/20 to-blue-500/5',
    },
    {
      title: 'Decision Memory',
      desc: 'Past decisions, reasoning, accepted risks, outcomes.',
      href: '/memory/decisions',
      icon: GitBranch,
      accent: 'from-emerald-500/20 to-emerald-500/5',
    },
    {
      title: 'Lessons Learned',
      desc: 'What worked, what did not — captured for reuse.',
      href: '/memory/lessons',
      icon: Lightbulb,
      accent: 'from-amber-500/20 to-amber-500/5',
    },
    {
      title: 'Company Timeline',
      desc: 'Founding, pivots, launches, acquisitions and inflection points.',
      href: '/memory/timeline',
      icon: History,
      accent: 'from-purple-500/20 to-purple-500/5',
    },
    {
      title: 'Glossary',
      desc: 'Internal terminology, acronyms and canonical definitions.',
      href: '/memory/glossary',
      icon: BookMarked,
      accent: 'from-pink-500/20 to-pink-500/5',
    },
  ];

  const health = [
    { label: 'Coverage', v: 62, icon: Brain },
    { label: 'Freshness (<90d)', v: 54, icon: Clock },
    { label: 'Traceability', v: 78, icon: TrendingUp },
    { label: 'Ownership', v: 71, icon: ShieldAlert },
  ];

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="page-title flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" />
              Corporate Memory
            </h1>
            <p className="page-description">
              A single, governed substrate the whole organization — and the AI — reasons from.
            </p>
          </div>
          <Button asChild size="sm">
            <Link to="/ask">
              <Sparkles className="h-4 w-4 mr-2" /> Ask the memory
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="relative max-w-2xl">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search across decisions, lessons, milestones, glossary…"
              className="pl-9"
            />
          </div>
          {q && (
            <p className="text-xs text-muted-foreground mt-3">
              Press <Link to={`/ask?q=${encodeURIComponent(q)}`} className="text-primary underline">Enter in Ask DecisionOS</Link> to run a semantic query.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-bold mt-1">{s.value}</div>
              <div className="text-[11px] text-muted-foreground mt-1">{s.hint}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Memory Health</h2>
            <Badge variant="secondary">Composite 66</Badge>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {health.map((h) => (
              <div key={h.label} className="rounded-lg border p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <h.icon className="h-3.5 w-3.5" />
                  {h.label}
                </div>
                <div className="text-lg font-semibold mt-1">{h.v}%</div>
                <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${h.v}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="font-semibold mb-3">Memory Layers</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((s) => (
            <Link key={s.href} to={s.href}>
              <Card className="hover:border-primary/40 transition h-full">
                <CardContent className={`p-5 bg-gradient-to-br ${s.accent} rounded-lg h-full`}>
                  <div className="flex items-start justify-between">
                    <div className="h-10 w-10 rounded-lg bg-background/70 flex items-center justify-center border">
                      <s.icon className="h-5 w-5 text-primary" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mt-3">{s.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
