import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Brain, ArrowRight, Sparkles, Mail, MessageSquare, Calendar, FileText,
  Database, Server, StickyNote, Users, ShieldCheck, TrendingUp, Target,
  Layers, GitBranch, DollarSign, Megaphone, UserCog, Scale, Cog, Check, X,
  Zap, Network, LineChart, Play,
} from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function LandingPage() {
  const { t } = useLanguage();
  const [demoOpen, setDemoOpen] = useState(false);


  const sources = [
    { icon: Mail, label: 'Gmail' },
    { icon: MessageSquare, label: 'Slack' },
    { icon: Users, label: 'Teams' },
    { icon: Calendar, label: 'Meetings' },
    { icon: FileText, label: 'Docs' },
    { icon: Database, label: 'CRM' },
    { icon: Server, label: 'ERP' },
    { icon: StickyNote, label: 'Notion' },
  ];

  const brainInputs: Array<{ key: string }> = [
    { key: 'brain.in.emails' },
    { key: 'brain.in.meetings' },
    { key: 'brain.in.slack' },
    { key: 'brain.in.crm' },
    { key: 'brain.in.calendar' },
    { key: 'brain.in.erp' },
  ];
  const brainOutputs = ['brain.out.execs', 'brain.out.employees', 'brain.out.agents'];

  const cosCards = [
    { icon: Target, key: 'brief', accent: 'from-primary/20 to-primary/5' },
    { icon: Sparkles, key: 'action', accent: 'from-info/20 to-info/5' },
    { icon: ShieldCheck, key: 'risk', accent: 'from-warning/20 to-warning/5' },
    { icon: GitBranch, key: 'similar', accent: 'from-success/20 to-success/5' },
    { icon: Users, key: 'stake', accent: 'from-primary/20 to-primary/5' },
    { icon: LineChart, key: 'conf', accent: 'from-info/20 to-info/5' },
  ];

  const memory = [
    { icon: TrendingUp, key: 'd1' },
    { icon: Users, key: 'd2' },
    { icon: DollarSign, key: 'd3' },
  ];

  const agents = [
    { icon: DollarSign, key: 'sales' },
    { icon: LineChart, key: 'finance' },
    { icon: Megaphone, key: 'marketing' },
    { icon: UserCog, key: 'hr' },
    { icon: Scale, key: 'legal' },
    { icon: Cog, key: 'ops' },
  ];

  const others = ['why.o1', 'why.o2', 'why.o3', 'why.o4', 'why.o5'];
  const ours = ['why.u1', 'why.u2', 'why.u3', 'why.u4', 'why.u5'];
  const now = [
    { icon: Sparkles, key: 'c1' },
    { icon: Network, key: 'c2' },
    { icon: Zap, key: 'c3' },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DecisionOS</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/auth"><Button variant="ghost" size="sm">{t('nav.signin')}</Button></Link>
            <Link to="/auth"><Button size="sm">{t('nav.getStarted')}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        {/* ambient glow */}
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/10 blur-[120px]" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur text-xs text-muted-foreground mb-8">
            <Sparkles className="h-3 w-3 text-primary" /> {t('hero.badge')}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl mx-auto">
            {t('hero.title')}
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 h-12 px-6">{t('hero.cta')} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Button size="lg" variant="outline" className="h-12 px-6 gap-2" onClick={() => setDemoOpen(true)}>
              <Play className="h-4 w-4" /> {t('hero.demo')}
            </Button>
          </div>




          {/* Hero illustration: systems → brain */}
          <div className="relative mt-20 mx-auto max-w-4xl">
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 opacity-90">
              {sources.map(({ icon: Icon, label }) => (
                <div
                  key={label}
                  className="group flex flex-col items-center gap-2 p-3 rounded-xl border border-border bg-card/60 backdrop-blur hover-scale"
                >
                  <Icon className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center my-6">
              <div className="h-14 w-px bg-gradient-to-b from-border to-primary/60" />
            </div>
            <div className="mx-auto inline-flex items-center gap-3 px-6 py-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 to-primary/5 backdrop-blur shadow-enterprise">
              <Brain className="h-6 w-6 text-primary" />
              <span className="font-semibold">{t('brain.core')}</span>
            </div>
          </div>
        </div>
      </section>

      {/* 01 — Problem */}
      <Section tag={t('problem.tag')}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              {t('problem.title')}
            </h2>
            <p className="mt-6 text-lg text-muted-foreground">{t('problem.body1')}</p>
            <p className="mt-3 text-lg text-muted-foreground">{t('problem.body2')}</p>
          </div>
          <div className="relative h-[360px]">
            {sources.map(({ icon: Icon, label }, i) => {
              const positions = [
                'top-0 left-2', 'top-4 right-6', 'top-24 left-16', 'top-20 right-2',
                'bottom-24 left-0', 'bottom-16 right-12', 'bottom-2 left-24', 'bottom-6 right-24',
              ];
              return (
                <div
                  key={label}
                  className={`absolute ${positions[i]} flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/70 backdrop-blur text-xs shadow-sm animate-fade-in`}
                  style={{ animationDelay: `${i * 80}ms`, transform: `rotate(${(i % 2 ? 1 : -1) * (2 + i)}deg)` }}
                >
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      </Section>

      {/* 02 — Company Brain */}
      <Section tag={t('brain.tag')}>
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('brain.title')}</h2>
          <p className="mt-6 text-lg text-muted-foreground">{t('brain.body')}</p>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-6 items-center">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">{t('brain.inputs')}</div>
            {brainInputs.map((s) => (
              <div key={s.key} className="px-4 py-3 rounded-lg border border-border bg-card text-sm flex items-center justify-between">
                <span>{t(s.key)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <div className="relative">
              <div aria-hidden className="absolute inset-0 -m-8 rounded-full bg-primary/20 blur-3xl animate-pulse" />
              <div className="relative h-48 w-48 rounded-full border border-primary/40 bg-gradient-to-br from-primary/20 to-transparent flex flex-col items-center justify-center backdrop-blur">
                <Brain className="h-12 w-12 text-primary mb-2" />
                <div className="text-sm font-semibold text-center px-4">{t('brain.core')}</div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3 md:text-right">{t('brain.outputs')}</div>
            {brainOutputs.map((k) => (
              <div key={k} className="px-4 py-3 rounded-lg border border-border bg-card text-sm flex items-center justify-between">
                <ArrowRight className="h-3.5 w-3.5 text-primary" />
                <span>{t(k)}</span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 03 — Chief of Staff */}
      <Section tag={t('cos.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('cos.title')}</h2>
          <p className="mt-6 text-lg text-muted-foreground">{t('cos.body')}</p>
        </div>

        <div className="mt-14 rounded-2xl border border-border bg-card/60 backdrop-blur p-6 md:p-8 shadow-enterprise">
          <div className="grid md:grid-cols-3 gap-4">
            {cosCards.map(({ icon: Icon, key, accent }) => (
              <div
                key={key}
                className={`group relative overflow-hidden rounded-xl border border-border bg-gradient-to-br ${accent} p-5 hover-scale`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-background/70 border border-border flex items-center justify-center">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="font-semibold text-sm">{t(`cos.${key}`)}</div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(`cos.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 04 — Decision Memory */}
      <Section tag={t('mem.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('mem.title')}</h2>
          <p className="mt-6 text-lg text-muted-foreground">{t('mem.body')}</p>
        </div>

        <div className="mt-14 relative">
          <div aria-hidden className="absolute left-4 md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
          <div className="space-y-6">
            {memory.map(({ icon: Icon, key }, i) => (
              <div key={key} className={`relative flex items-center gap-4 ${i % 2 ? 'md:flex-row-reverse' : ''}`}>
                <div className="hidden md:block flex-1" />
                <div className="relative z-10 h-10 w-10 rounded-full border border-primary/40 bg-background flex items-center justify-center shrink-0">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 rounded-xl border border-border bg-card p-5">
                  <div className="font-semibold">{t(`mem.${key}`)}</div>
                  <div className="text-sm text-success mt-1">{t(`mem.${key}.out`)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* 05 — Multi Agent */}
      <Section tag={t('agents.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('agents.title')}</h2>
          <p className="mt-6 text-lg text-muted-foreground">{t('agents.body')}</p>
        </div>

        <div className="mt-14 relative flex justify-center">
          <div className="relative w-full max-w-3xl aspect-[3/2]">
            {/* central brain */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="h-24 w-24 rounded-full border border-primary/40 bg-gradient-to-br from-primary/20 to-transparent flex items-center justify-center backdrop-blur">
                <Brain className="h-8 w-8 text-primary" />
              </div>
            </div>
            {agents.map(({ icon: Icon, key }, i) => {
              const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
              const rx = 42, ry = 38;
              const x = 50 + rx * Math.cos(angle);
              const y = 50 + ry * Math.sin(angle);
              return (
                <div
                  key={key}
                  className="absolute -translate-x-1/2 -translate-y-1/2 animate-fade-in"
                  style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/80 backdrop-blur shadow-sm">
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium whitespace-nowrap">{t(`agents.${key}`)}</span>
                  </div>
                </div>
              );
            })}
            {/* connecting lines */}
            <svg aria-hidden className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
              {agents.map((_, i) => {
                const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
                const x = 50 + 42 * Math.cos(angle);
                const y = 50 + 38 * Math.sin(angle);
                return (
                  <line
                    key={i}
                    x1="50" y1="50" x2={x} y2={y}
                    stroke="hsl(var(--primary) / 0.3)" strokeWidth="0.2" strokeDasharray="1 1"
                  />
                );
              })}
            </svg>
          </div>
        </div>
      </Section>

      {/* 06 — Why DecisionOS */}
      <Section tag={t('why.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('why.title')}</h2>
        </div>

        <div className="mt-14 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-6">{t('why.others')}</div>
            <ul className="space-y-4">
              {others.map((k) => (
                <li key={k} className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-6 w-6 rounded-full border border-border flex items-center justify-center">
                    <X className="h-3 w-3" />
                  </div>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8 shadow-enterprise">
            <div className="text-xs uppercase tracking-wider text-primary mb-6">{t('why.us')}</div>
            <ul className="space-y-4">
              {ours.map((k) => (
                <li key={k} className="flex items-center gap-3 font-medium">
                  <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* 07 — Why Now */}
      <Section tag={t('now.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('now.title')}</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {now.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-8 hover-scale">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-xl font-semibold mb-2">{t(`now.${key}`)}</div>
              <p className="text-muted-foreground">{t(`now.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 08 — Vision */}
      <section className="max-w-5xl mx-auto px-6 py-32 text-center">
        <div className="text-xs uppercase tracking-wider text-primary mb-8">{t('vision.tag')}</div>
        <div className="space-y-3 text-4xl md:text-6xl font-bold tracking-tight leading-[1.1]">
          <div className="text-muted-foreground/60">{t('vision.l1')}</div>
          <div className="text-muted-foreground/80">{t('vision.l2')}</div>
          <div className="bg-gradient-to-r from-primary to-info bg-clip-text text-transparent">
            {t('vision.l3')}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-12 md:p-20 text-center">
          <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <Layers className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight max-w-3xl mx-auto leading-tight">
              {t('cta.title')}
            </h2>
            <div className="mt-10">
              <Link to="/auth">
                <Button size="lg" className="gap-2 h-12 px-8">
                  {t('cta.button')} <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DecisionOS — The Company Brain Platform
      </footer>
    </div>
  );
}

function Section({ tag, children }: { tag: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border/60">
      <div className="max-w-7xl mx-auto px-6 py-24 md:py-32">
        <div className="text-xs uppercase tracking-wider text-primary mb-10">{tag}</div>
        {children}
      </div>
    </section>
  );
}
