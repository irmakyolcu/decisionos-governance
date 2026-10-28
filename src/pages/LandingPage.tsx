import { Link } from 'react-router-dom';
import { useState } from 'react';
import { ArrowRight, Brain, FileText, ShieldCheck, GitBranch, Users, Eye, Database, Search, AlertTriangle, CheckCircle2, Play, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import demoVideo from '@/assets/decisionos-demo.mp4.asset.json';
import productImage from '@/assets/decisionos-intake.jpg.asset.json';

export default function LandingPage() {
  const { t } = useLanguage();
  const [demoOpen, setDemoOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation = [{ id: 'product', key: 'web.product' }, { id: 'use-cases', key: 'web.useCases' }, { id: 'governance', key: 'web.governance' }];
  const steps = [{ key: 'connect', icon: Database }, { key: 'understand', icon: Search }, { key: 'detect', icon: AlertTriangle }, { key: 'govern', icon: ShieldCheck }, { key: 'track', icon: CheckCircle2 }];
  const capabilities = [{ key: 'memory', icon: Brain }, { key: 'risk', icon: Search }, { key: 'trace', icon: GitBranch }, { key: 'approval', icon: Users }, { key: 'agent', icon: Eye }];
  return (
    <div className="website-page min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/landing" className="flex items-center gap-2 shrink-0" aria-label="DecisionOS">
            <span className="h-8 w-8 rounded-md bg-primary flex items-center justify-center"><Brain className="h-4 w-4 text-primary-foreground" /></span>
            <span className="font-bold text-lg">DecisionOS</span>
          </Link>
          <nav className="hidden lg:flex gap-7 text-sm text-muted-foreground" aria-label={t('web.product')}>
            {navigation.map(n => <a key={n.id} href={`#${n.id}`} className="hover:text-primary">{t(n.key)}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex"><Link to="/auth">{t('nav.signin')}</Link></Button>
            <Button asChild size="sm" className="hidden md:inline-flex"><Link to="/book-demo">{t('web.demo')}</Link></Button>
            <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label={t('web.product')} title={t('web.product')} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><Menu className="h-5 w-5" /></Button>
          </div>
        </div>
        {menuOpen && <nav className="lg:hidden border-t border-border px-5 py-4 flex flex-col gap-4 text-sm">
          {navigation.map(n => <a key={n.id} href={`#${n.id}`} onClick={() => setMenuOpen(false)}>{t(n.key)}</a>)}
          <Link to="/auth">{t('nav.signin')}</Link>
          <Button asChild><Link to="/book-demo">{t('web.demo')}</Link></Button>
        </nav>}
      </header>

      <main>
        <section className="relative isolate overflow-hidden border-b border-border">
          <img src={productImage.url} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover object-top" />
          <div className="absolute inset-0 bg-background/95" />
          <div className="relative max-w-7xl mx-auto px-5 sm:px-6 pt-14 pb-16 sm:pt-20 sm:pb-20">
            <p className="text-sm font-medium text-primary mb-5">DecisionOS / {t('web.position')}</p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl leading-tight max-w-4xl font-semibold">{t('web.title')}</h1>
            <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-2xl">{t('web.subtitle')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2"><Link to="/book-demo">{t('web.demo')}<ArrowRight className="h-4 w-4" /></Link></Button>
              <Button asChild variant="outline" size="lg"><a href="#how-it-works">{t('web.explore')}</a></Button>
            </div>
            <p className="mt-8 max-w-2xl text-sm text-muted-foreground border-l-2 border-primary pl-4">{t('web.statement')}</p>
          </div>
        </section>

        <section className="border-b border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20 grid lg:grid-cols-[1fr_1.3fr] gap-10 lg:gap-20">
            <div><h2 className="text-3xl sm:text-4xl leading-tight">{t('web.problemTitle')}</h2><p className="mt-5 text-muted-foreground leading-relaxed">{t('web.problemBody')}</p></div>
            <ul className="divide-y divide-border">{[1,2,3,4,5].map(i => <li key={i} className="flex gap-4 py-4 first:pt-0"><span className="text-sm font-mono text-primary shrink-0">0{i}</span><span className="text-sm sm:text-base leading-relaxed">{t(`web.problem${i}`)}</span></li>)}</ul>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
            <h2 className="text-3xl sm:text-4xl max-w-3xl leading-tight">{t('web.workflowTitle')}</h2>
            <ol className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-8">
              {steps.map(({ key, icon: Icon }, i) => <li key={key} className="border-t-2 border-border pt-5"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-primary" /><span className="text-xs font-mono text-muted-foreground">0{i+1}</span></div><h3 className="mt-4 text-lg">{t(`web.${key}`)}</h3><p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t(`web.${key}Body`)}</p></li>)}
            </ol>
            <p className="mt-10 text-sm text-muted-foreground leading-relaxed border-l-2 border-info pl-4 max-w-4xl">{t('web.availability')}</p>
            <div className="mt-12 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
              <img src={productImage.url} alt={t('web.imageAlt')} width="1014" height="780" loading="lazy" className="w-full h-auto rounded-md border border-border" />
              <div><FileText className="h-6 w-6 text-primary" /><h3 className="text-2xl mt-4">{t('web.memory')}</h3><p className="text-muted-foreground mt-4 leading-relaxed">{t('web.statement')}</p><Button variant="outline" className="mt-6 gap-2" onClick={() => setDemoOpen(true)}><Play className="h-4 w-4" />{t('web.watch')}</Button><p className="text-xs text-muted-foreground mt-3">{t('web.videoNote')}</p></div>
            </div>
          </div>
        </section>

        <section id="product" className="scroll-mt-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
            <h2 className="text-3xl sm:text-4xl max-w-3xl leading-tight">{t('web.capabilitiesTitle')}</h2>
            <div className="mt-10 grid md:grid-cols-2 gap-x-14">
              {capabilities.map(({key, icon: Icon}) => <article key={key} className="py-7 border-t border-border"><Icon className="h-6 w-6 text-primary" /><h3 className="text-xl mt-4">{t(`web.${key}`)}</h3><p className="mt-3 text-muted-foreground text-sm leading-relaxed max-w-xl">{t(`web.${key}Body`)}</p></article>)}
            </div>
          </div>
        </section>

        <section id="use-cases" className="scroll-mt-20 border-b border-border bg-card">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
            <h2 className="text-3xl sm:text-4xl max-w-3xl leading-tight">{t('web.casesTitle')}</h2>
            <div className="mt-10 divide-y divide-border">{[1,2,3,4,5].map(i => <article key={i} className="grid md:grid-cols-2 gap-3 md:gap-12 py-6"><h3 className="text-lg">{t(`web.case${i}`)}</h3><p className="text-sm text-muted-foreground leading-relaxed">{t(`web.case${i}Body`)}</p></article>)}</div>
          </div>
        </section>

        <section id="governance" className="scroll-mt-20 border-b border-border">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
            <ShieldCheck className="h-8 w-8 text-primary" /><h2 className="text-3xl sm:text-4xl mt-5 max-w-3xl leading-tight">{t('web.trustTitle')}</h2>
            <div className="mt-10 grid md:grid-cols-3 gap-8">{['access','audit','deploy'].map(key => <article key={key} className="border-t border-border pt-5"><h3 className="text-lg">{t(`web.${key}`)}</h3><p className="mt-3 text-sm text-muted-foreground leading-relaxed">{t(`web.${key}Body`)}</p></article>)}</div>
            <p className="text-xs text-muted-foreground mt-8 leading-relaxed">{t('web.disclaimer')}</p>
            <Button asChild variant="link" className="px-0 mt-3 h-auto whitespace-normal text-left"><Link to="/trust">{t('web.trustLink')}<ArrowRight className="h-4 w-4 ml-2 shrink-0" /></Link></Button>
          </div>
        </section>

        <section className="bg-accent">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 sm:py-20">
            <h2 className="text-3xl sm:text-4xl max-w-4xl leading-tight">{t('web.finalTitle')}</h2>
            <p className="mt-5 max-w-2xl text-muted-foreground leading-relaxed">{t('web.finalBody')}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/book-demo">{t('web.demo')}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline"><Link to="/book-demo?intent=pilot">{t('web.pilot')}</Link></Button></div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border"><div className="max-w-7xl mx-auto px-5 sm:px-6 py-8 flex flex-col sm:flex-row justify-between gap-4 text-sm text-muted-foreground"><span>© {new Date().getFullYear()} DecisionOS</span><div className="flex flex-wrap gap-6"><Link to="/trust">{t('web.governance')}</Link><Link to="/auth">{t('nav.signin')}</Link><Link to="/book-demo">{t('web.demo')}</Link></div></div></footer>
      <Dialog open={demoOpen} onOpenChange={setDemoOpen}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>{t('web.watch')}</DialogTitle><DialogDescription>{t('web.videoNote')}</DialogDescription></DialogHeader><video src={demoVideo.url} controls playsInline preload="metadata" className="w-full aspect-video rounded-md bg-background" /></DialogContent></Dialog>
    </div>
  );
}
