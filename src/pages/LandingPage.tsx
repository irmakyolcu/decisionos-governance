import { Link } from 'react-router-dom';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Brain, ArrowRight, Sparkles, Mail, MessageSquare, Calendar, FileText,
  Database, Server, StickyNote, Users, ShieldCheck, Github, Cloud,
  DollarSign, Scale, UserCog, Cog, Check, X, Zap, Network, LineChart, Play,
  Layers, Fingerprint, KeyRound, Gavel, UserCheck, ScrollText, GitBranch,
  BadgeCheck, Eye, Activity, BrainCircuit, Building2, Briefcase, Crown,
} from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function LandingPage() {
  const { t } = useLanguage();
  const [demoOpen, setDemoOpen] = useState(false);

  const sources = [
    { icon: Mail, label: 'Gmail' },
    { icon: Mail, label: 'Outlook' },
    { icon: MessageSquare, label: 'Slack' },
    { icon: Users, label: 'Teams' },
    { icon: Cloud, label: 'Drive' },
    { icon: FileText, label: 'M365' },
    { icon: StickyNote, label: 'Notion' },
    { icon: FileText, label: 'Confluence' },
    { icon: Database, label: 'CRM' },
    { icon: Server, label: 'ERP' },
    { icon: Github, label: 'GitHub' },
    { icon: Calendar, label: t('src.meetings') },
  ];

  const l2Features = ['l2.f1', 'l2.f2', 'l2.f3', 'l2.f4', 'l2.f5'];

  const trustCards = [
    { icon: Fingerprint, key: 'l3.c1' },
    { icon: KeyRound, key: 'l3.c2' },
    { icon: Gavel, key: 'l3.c3' },
    { icon: UserCheck, key: 'l3.c4' },
    { icon: ScrollText, key: 'l3.c5' },
    { icon: GitBranch, key: 'l3.c6' },
    { icon: BadgeCheck, key: 'l3.c7' },
    { icon: Eye, key: 'l3.c8' },
    { icon: Activity, key: 'l3.c9' },
    { icon: Brain, key: 'l3.c10' },
  ];

  const agents = [
    { icon: Crown, key: 'l4.ceo' },
    { icon: DollarSign, key: 'l4.finance' },
    { icon: LineChart, key: 'l4.sales' },
    { icon: Scale, key: 'l4.legal' },
    { icon: UserCog, key: 'l4.hr' },
    { icon: Cog, key: 'l4.ops' },
  ];

  const pillars = [
    { icon: Brain, key: 'remember' },
    { icon: BrainCircuit, key: 'reason' },
    { icon: ShieldCheck, key: 'govern' },
    { icon: Network, key: 'act' },
  ];

  const trad = ['cmp.t1', 'cmp.t2', 'cmp.t3', 'cmp.t4', 'cmp.t5'];
  const us = ['cmp.u1', 'cmp.u2', 'cmp.u3', 'cmp.u4', 'cmp.u5'];

  const enterprise = [
    { icon: Users, key: 'emp' },
    { icon: Briefcase, key: 'mgr' },
    { icon: Network, key: 'ai' },
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
        <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 h-[520px] w-[820px] rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute inset-0 bg-[radial-gradient(hsl(var(--border))_1px,transparent_1px)] [background-size:32px_32px] opacity-20" />
        </div>

        <div className="max-w-6xl mx-auto px-6 pt-28 pb-24 text-center animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-card/60 backdrop-blur text-xs text-muted-foreground mb-8">
            <Sparkles className="h-3 w-3 text-primary" /> {t('hero.badge')}
          </div>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] max-w-5xl mx-auto">
            <span className="bg-gradient-to-b from-foreground to-foreground/70 bg-clip-text text-transparent">
              {t('hero.title')}
            </span>
          </h1>
          <p className="mt-8 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 h-12 px-6">{t('hero.cta')} <ArrowRight className="h-4 w-4" /></Button>
            </Link>
            <Link to="/book-demo">
              <Button size="lg" variant="outline" className="h-12 px-6 gap-2">
                <Calendar className="h-4 w-4" /> {t('hero.demo')}
              </Button>
            </Link>
          </div>

          {/* Hero stack preview */}
          <div className="relative mt-24 mx-auto max-w-5xl">
            <div className="grid grid-cols-4 gap-3">
              {[
                { icon: Database, k: 'l1.name' },
                { icon: BrainCircuit, k: 'l2.name' },
                { icon: ShieldCheck, k: 'l3.name' },
                { icon: Network, k: 'l4.name' },
              ].map(({ icon: Icon, k }, i) => (
                <div
                  key={k}
                  className="group relative rounded-xl border border-border bg-card/60 backdrop-blur p-4 hover-scale animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
                  <Icon className="h-5 w-5 text-primary mb-2 mx-auto" />
                  <div className="text-[11px] font-medium text-muted-foreground">{t(k)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* The Enterprise AI Stack */}
      <Section tag={t('stack.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('stack.title')}</h2>
          <p className="mt-6 text-lg text-muted-foreground">{t('stack.body')}</p>
        </div>

        <div className="mt-16 space-y-6">
          {/* Layer 1 */}
          <StackLayer index="01" icon={Database} title={t('l1.name')} description={t('l1.desc')}>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
              {sources.map(({ icon: Icon, label }, i) => (
                <div
                  key={label + i}
                  className="group flex flex-col items-center gap-1 p-2 rounded-lg border border-border bg-background/60 backdrop-blur"
                >
                  <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-[9px] text-muted-foreground truncate max-w-full">{label}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <FlowArrow />
            </div>
          </StackLayer>

          {/* Layer 2 */}
          <StackLayer index="02" icon={BrainCircuit} title={t('l2.name')} description={t('l2.desc')}>
            <div className="grid sm:grid-cols-2 md:grid-cols-5 gap-2">
              {l2Features.map((k) => (
                <div key={k} className="px-3 py-2 rounded-lg border border-border bg-background/60 text-xs text-center">
                  {t(k)}
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <FlowArrow />
            </div>
          </StackLayer>

          {/* Layer 3 */}
          <StackLayer index="03" icon={ShieldCheck} title={t('l3.name')} description={t('l3.desc')}>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {trustCards.map(({ icon: Icon, key }) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background/60">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-[11px] font-medium">{t(key)}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-center">
              <FlowArrow />
            </div>
          </StackLayer>

          {/* Layer 4 */}
          <StackLayer index="04" icon={Network} title={t('l4.name')} description={t('l4.desc')}>
            <div className="relative">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {agents.map(({ icon: Icon, key }, i) => (
                  <div
                    key={key}
                    className="relative flex items-center gap-2 px-3 py-2 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/10 to-transparent"
                  >
                    <div aria-hidden className="absolute inset-x-2 -top-px h-px bg-primary/50 animate-pulse" style={{ animationDelay: `${i * 200}ms` }} />
                    <Icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-xs font-medium">{t(key)}</span>
                  </div>
                ))}
              </div>
            </div>
          </StackLayer>
        </div>
      </Section>

      {/* Why DecisionOS — 4 pillars */}
      <Section tag={t('why.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('why.title')}</h2>
        </div>
        <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {pillars.map(({ icon: Icon, key }) => (
            <div key={key} className="group relative overflow-hidden rounded-2xl border border-border bg-card p-6 hover-scale">
              <div aria-hidden className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
              <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div className="text-2xl font-bold tracking-tight">{t(`why.${key}`)}</div>
              <div className="text-sm text-muted-foreground mt-1">{t(`why.${key}.sub`)}</div>
            </div>
          ))}
        </div>
      </Section>

      {/* Competitor positioning */}
      <Section tag={t('cmp.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('cmp.title')}</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-border bg-card p-8">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-6">{t('cmp.trad')}</div>
            <ul className="space-y-4">
              {trad.map((k) => (
                <li key={k} className="flex items-center gap-3 text-muted-foreground">
                  <div className="h-6 w-6 rounded-full border border-border flex items-center justify-center shrink-0">
                    <X className="h-3 w-3" />
                  </div>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-8 shadow-enterprise">
            <div className="text-xs uppercase tracking-wider text-primary mb-6">{t('cmp.us')}</div>
            <ul className="space-y-4">
              {us.map((k) => (
                <li key={k} className="flex items-center gap-3 font-medium">
                  <div className="h-6 w-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Enterprise Value */}
      <Section tag={t('ent.tag')}>
        <div className="max-w-3xl">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{t('ent.title')}</h2>
        </div>
        <div className="mt-14 grid md:grid-cols-3 gap-6">
          {enterprise.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-2xl border border-border bg-card p-8 hover-scale">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-6">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div className="text-xl font-semibold mb-2">{t(`ent.${key}`)}</div>
              <p className="text-muted-foreground">{t(`ent.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card to-card p-12 md:p-20 text-center">
          <div aria-hidden className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-primary/20 blur-3xl" />
          <div className="relative">
            <Building2 className="h-10 w-10 text-primary mx-auto mb-6" />
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

      <footer className="border-t border-border py-14">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
              <Brain className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-bold tracking-tight">DecisionOS</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {t('footer.message')}
          </p>
          <div className="mt-6 text-xs text-muted-foreground">
            © {new Date().getFullYear()} DecisionOS — {t('footer.tagline')}
          </div>
        </div>
      </footer>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden bg-card border-border">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Play className="h-4 w-4 text-primary" /> {t('demo.header')}
            </DialogTitle>
            <DialogDescription>
              {t('demo.desc')}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6">
            <div className="relative aspect-video w-full rounded-xl overflow-hidden border border-border bg-gradient-to-br from-primary/20 via-background to-info/10">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.25),transparent_60%)]" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-6">
                <div className="h-16 w-16 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center backdrop-blur">
                  <Brain className="h-8 w-8 text-primary" />
                </div>
                <div className="text-lg font-semibold">{t('demo.title')}</div>
                <p className="text-sm text-muted-foreground max-w-md">{t('demo.body')}</p>
                <div className="flex gap-2 mt-2">
                  <Link to="/auth" onClick={() => setDemoOpen(false)}>
                    <Button size="sm" className="gap-2">{t('demo.try')} <ArrowRight className="h-3.5 w-3.5" /></Button>
                  </Link>
                  <Button size="sm" variant="outline" onClick={() => setDemoOpen(false)}>{t('demo.close')}</Button>
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-3 text-xs">
              {[
                { icon: Brain, k: 'demo.f1' },
                { icon: ShieldCheck, k: 'demo.f2' },
                { icon: Network, k: 'demo.f3' },
              ].map(({ icon: Icon, k }) => (
                <div key={k} className="rounded-lg border border-border bg-background/50 p-3">
                  <Icon className="h-4 w-4 text-primary mb-2" />
                  <div className="text-foreground">{t(k)}</div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

function StackLayer({
  index, icon: Icon, title, description, children,
}: {
  index: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-card/60 backdrop-blur p-6 md:p-8 shadow-enterprise overflow-hidden">
      <div aria-hidden className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
      <div className="grid md:grid-cols-[280px_1fr] gap-6 md:gap-10">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Layer {index}</div>
          </div>
          <div className="text-xl md:text-2xl font-bold tracking-tight">{title}</div>
          <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{description}</p>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="relative h-8 w-px">
      <div className="absolute inset-0 bg-gradient-to-b from-primary/60 to-transparent" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full bg-primary animate-pulse" />
    </div>
  );
}
