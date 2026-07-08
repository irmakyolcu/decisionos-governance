import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Brain, Shield, GitBranch, Users, Zap, Building2, ArrowRight, Sparkles } from 'lucide-react';

export default function LandingPage() {
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
            <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/auth"><Button size="sm">Get started</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border bg-muted/40 text-xs text-muted-foreground mb-6">
          <Sparkles className="h-3 w-3" /> Permission-aware Company Brain
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight max-w-4xl mx-auto leading-[1.1]">
          Turn every company interaction into organizational intelligence.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          DecisionOS transforms your emails, meetings, documents, decisions, and workflows into a living Company Brain for employees and AI agents.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link to="/auth">
            <Button size="lg" className="gap-2">Build Your Company Brain <ArrowRight className="h-4 w-4" /></Button>
          </Link>
          <Button size="lg" variant="outline">View Product Demo</Button>
        </div>
      </section>

      {/* Problem */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-border">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">The Problem</div>
            <h2 className="text-3xl font-bold mb-4">Your company's memory is scattered.</h2>
            <p className="text-muted-foreground">
              Critical decisions live in Slack threads. Client promises hide in email. Processes exist only in one person's head.
              When they leave, the knowledge leaves with them.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {['Emails','Meetings','Documents','CRM','Slack','Employee memory'].map((s) => (
              <div key={s} className="p-4 rounded-lg border border-border bg-card text-sm">{s}</div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16 border-t border-border">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">How DecisionOS works</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: GitBranch, title: 'Decision Memory', body: 'Every decision structured with reasoning, evidence, approvers, and outcomes.' },
            { icon: Shield, title: 'Permission-Aware Brain', body: 'Answers respect roles, departments, projects, and confidentiality — automatically.' },
            { icon: Zap, title: 'Company Skills for AI Agents', body: 'Machine-readable operating instructions so agents work the way your company works.' },
            { icon: Building2, title: 'Client & Project Intelligence', body: 'Promises, risks, and commitments surfaced before they become problems.' },
            { icon: Brain, title: 'Ask DecisionOS', body: 'Source-cited answers about any decision, client, process, or policy.' },
            { icon: Users, title: 'Expertise Map', body: 'See who owns what — and where knowledge concentration puts you at risk.' },
          ].map(({ icon: Icon, title, body }) => (
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
          Every employee leaves knowledge behind. Every meeting creates context. Every decision contains intelligence.
          <span className="text-primary"> DecisionOS makes sure your company never loses it.</span>
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-7xl mx-auto px-6 py-20 border-t border-border">
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to build your Company Brain?</h2>
          <p className="text-muted-foreground mb-6">Start capturing decisions, promises, and knowledge in minutes.</p>
          <Link to="/auth"><Button size="lg" className="gap-2">Get started free <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} DecisionOS
      </footer>
    </div>
  );
}
