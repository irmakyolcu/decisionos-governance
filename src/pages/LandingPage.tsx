import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, Shield, GitBranch, Users, Zap, Building2, ArrowRight, Sparkles } from 'lucide-react';
import { LanguageToggle } from '@/components/LanguageToggle';
import { useLanguage } from '@/contexts/LanguageContext';

export default function LandingPage() {
  const { t } = useLanguage();

  const features = [
    { icon: GitBranch, title: t('f.decisionMemory'), body: t('f.decisionMemoryBody') },
    { icon: Shield, title: t('f.permBrain'), body: t('f.permBrainBody') },
    { icon: Zap, title: t('f.skills'), body: t('f.skillsBody') },
    { icon: Building2, title: t('f.client'), body: t('f.clientBody') },
    { icon: Brain, title: t('f.ask'), body: t('f.askBody') },
    { icon: Users, title: t('f.expertise'), body: t('f.expertiseBody') },
  ];

  const sources = [
    t('src.emails'), t('src.meetings'), t('src.documents'),
    t('src.crm'), t('src.slack'), t('src.memory'),
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Brain className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">DecisionOS</span>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Link to="/auth"><Button variant="ghost" size="sm">{t('nav.signin')}</Button></Link>
            <Link to="/auth"><Button size="sm">{t('nav.getStarted')}</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" /> {t('hero.badge')}
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
          {t('hero.title')}
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">{t('hero.cta')} <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Button size="lg" variant="outline">{t('hero.demo')}</Button>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-border">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">{t('problem.tag')}</div>
            <h2 className="text-3xl font-bold mb-4">{t('problem.title')}</h2>
            <p className="text-muted-foreground">{t('problem.body')}</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {sources.map((s) => (
              <div key={s} className="p-4 rounded-lg border border-border bg-card text-sm">{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t('features.title')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {features.map(({ icon: Icon, title, body }) => (
            <div key={title} className="p-6 rounded-xl border border-border bg-card">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center border-t border-border">
        <p className="text-2xl md:text-3xl font-medium leading-snug">
          {t('quote')}
          <span className="text-primary"> {t('quote.highlight')}</span>
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-border">
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <h2 className="text-3xl font-bold mb-3">{t('cta.title')}</h2>
          <p className="text-muted-foreground mb-6">{t('cta.body')}</p>
          <Link to="/auth"><Button size="lg" className="gap-2">{t('cta.button')} <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DecisionOS
      </footer>
    </div>
  );
}
