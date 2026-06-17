import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlignmentScore } from '@/components/AlignmentScore';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ceoProfile, memoryDecisions } from '@/data/ceoTwin';
import type { AIRecommendation, DecisionCategory, DecisionIntake, RiskBand, Urgency } from '@/types/ceoTwin';
import { Sparkles, ShieldCheck, Compass, MessageSquare, ArrowRight, Copy, ChevronDown, Brain } from 'lucide-react';

const CATS: DecisionCategory[] = ['Strategy','Partnership','Hiring','Finance','Product','Legal','Sales','Investor Relations'];
const RISKS: RiskBand[] = ['Low','Medium','High'];
const URG: Urgency[] = ['Low','Normal','High','Critical'];

const riskClass = (l: RiskBand) =>
  l === 'High' ? 'bg-destructive/10 text-destructive border-destructive/30'
  : l === 'Medium' ? 'bg-warning/10 text-warning border-warning/30'
  : 'bg-success/10 text-success border-success/30';

const delegationClass = (l: string) =>
  l === 'Needs CEO approval' || l === 'Escalate immediately'
    ? 'bg-destructive/10 text-destructive border-destructive/30'
    : l === 'Needs manager approval'
      ? 'bg-warning/10 text-warning border-warning/30'
      : 'bg-success/10 text-success border-success/30';

export default function DecisionIntakePage() {
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [rec, setRec] = useState<{ intake: DecisionIntake; recommendation: AIRecommendation } | null>(null);

  const [form, setForm] = useState<DecisionIntake>({
    title: '',
    context: '',
    options: '',
    urgency: 'Normal',
    financialImpactEUR: 0,
    legalRisk: 'Low',
    brandRisk: 'Low',
    strategicRelevance: 'Medium',
    requestedBy: '',
    deadline: '',
    category: 'Strategy',
  });

  const update = <K extends keyof DecisionIntake>(k: K, v: DecisionIntake[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.context.trim()) {
      toast({ title: 'Add a title and context', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    setRec(null);
    try {
      const { data, error } = await supabase.functions.invoke('ceo-recommend', {
        body: {
          intake: form,
          ceoProfile,
          memory: memoryDecisions.map((m) => ({
            title: m.title, category: m.category, date: m.date,
            finalDecision: m.finalDecision, lessons: m.lessons,
          })),
        },
      });
      if (error) throw error;
      if (!data?.recommendation) throw new Error('No recommendation returned');
      setRec({ intake: form, recommendation: data.recommendation as AIRecommendation });
      toast({ title: 'Recommendation ready' });
    } catch (err: any) {
      toast({ title: 'Could not generate recommendation', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const copyMessage = () => {
    if (!rec) return;
    navigator.clipboard.writeText(rec.recommendation.suggestedMessage);
    toast({ title: 'Copied stakeholder message' });
  };

  return (
    <div className="space-y-6">
      <div className="page-header">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Decision Intake</p>
        <h1 className="page-title">Help teams move without waiting for the CEO</h1>
        <p className="page-description">Submit a request. The Judgment Layer returns a CEO-aligned action, a strategic alignment score, the right delegation level, and a stakeholder message — in seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">New decision request</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Decision title *</Label>
                <Input id="title" value={form.title} onChange={(e) => update('title', e.target.value)} placeholder="e.g. Partnership offer from new AI accelerator" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="context">Context *</Label>
                <Textarea id="context" rows={3} value={form.context} onChange={(e) => update('context', e.target.value)} placeholder="Background, what's being asked, who's involved" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="options">Options considered</Label>
                <Textarea id="options" rows={2} value={form.options} onChange={(e) => update('options', e.target.value)} placeholder="A) ... B) ... C) ..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Category</Label>
                  <Select value={form.category} onValueChange={(v) => update('category', v as DecisionCategory)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Urgency</Label>
                  <Select value={form.urgency} onValueChange={(v) => update('urgency', v as Urgency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{URG.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="fin">Financial impact (€)</Label>
                  <Input id="fin" type="number" min="0" value={form.financialImpactEUR} onChange={(e) => update('financialImpactEUR', Number(e.target.value) || 0)} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" type="date" value={form.deadline} onChange={(e) => update('deadline', e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {(['legalRisk','brandRisk','strategicRelevance'] as const).map((k) => (
                  <div key={k} className="grid gap-2">
                    <Label className="capitalize text-xs">{k.replace(/([A-Z])/g, ' $1')}</Label>
                    <Select value={form[k]} onValueChange={(v) => update(k, v as RiskBand)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RISKS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="req">Requested by</Label>
                <Input id="req" value={form.requestedBy} onChange={(e) => update('requestedBy', e.target.value)} placeholder="Name & role" />
              </div>
              <div className="grid gap-2">
                <Label>Supporting context</Label>
                <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-4 text-xs text-muted-foreground text-center">
                  Attach notes / docs — coming soon
                </div>
              </div>
              <Button type="submit" disabled={submitting} className="w-full">
                <Sparkles className="h-4 w-4" />
                {submitting ? 'Generating recommendation…' : 'Generate AI recommendation'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="lg:col-span-3">
          {!rec ? (
            <Card className="h-full">
              <CardContent className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-10">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">AI Recommendation</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Submit a decision request and the Judgment Layer will return a CEO-aligned action, reasoning, alignment score, and a ready-to-send stakeholder message.
                </p>
              </CardContent>
            </Card>
          ) : (
            <RecommendationCard intake={rec.intake} r={rec.recommendation} onCopy={copyMessage} />
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ intake, r, onCopy }: { intake: DecisionIntake; r: AIRecommendation; onCopy: () => void }) {
  const [whyOpen, setWhyOpen] = useState(false);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Decision</p>
            <CardTitle className="text-lg mt-1">{intake.title}</CardTitle>
          </div>
          <Badge variant="outline" className={delegationClass(r.delegationLevel)}>{r.delegationLevel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="md:col-span-2 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-xs uppercase tracking-wider text-primary font-medium">Recommended action</p>
            <p className="text-sm text-foreground mt-1 leading-relaxed">{r.recommendedAction}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-3 flex items-center justify-center">
            <AlignmentScore score={r.strategicAlignmentScore} size="md" label="Alignment with CEO" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat label="Risk level" value={r.riskLevel} cls={riskClass(r.riskLevel)} />
          <Stat label="CEO approval" value={r.ceoApprovalRequired ? 'Required' : 'Not required'}
            cls={r.ceoApprovalRequired ? 'bg-destructive/10 text-destructive border-destructive/30' : 'bg-success/10 text-success border-success/30'} />
          <Stat label="Category" value={intake.category} cls="bg-muted text-foreground border-border" />
        </div>

        <Collapsible open={whyOpen} onOpenChange={setWhyOpen}>
          <CollapsibleTrigger className="w-full flex items-center justify-between rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors px-3 py-2.5 text-left">
            <span className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Brain className="h-4 w-4 text-primary" />Why this recommendation?
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${whyOpen ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-2"><Compass className="h-3.5 w-3.5" />Reasoning grounded in CEO logic</p>
              <p className="text-sm text-foreground leading-relaxed">{r.reasoning}</p>
            </div>
            {r.similarPastDecisions.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium mb-1.5 flex items-center gap-2"><ShieldCheck className="h-3.5 w-3.5" />Past decisions that informed this</p>
                <ul className="space-y-1">
                  {r.similarPastDecisions.map((s) => (
                    <li key={s} className="text-sm text-foreground flex gap-2"><span className="text-muted-foreground">•</span>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>

        <Section icon={<ArrowRight className="h-4 w-4" />} title="Suggested next step">
          <p className="text-sm text-foreground">{r.suggestedNextStep}</p>
        </Section>

        <Section icon={<MessageSquare className="h-4 w-4" />} title="Message to stakeholder" action={
          <Button variant="ghost" size="sm" onClick={onCopy}><Copy className="h-3.5 w-3.5" />Copy</Button>
        }>
          <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-foreground whitespace-pre-wrap">{r.suggestedMessage}</div>
        </Section>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="rounded-md border bg-card p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className={`mt-1 inline-flex px-2 py-0.5 rounded text-xs font-medium border ${cls}`}>{value}</div>
    </div>
  );
}

function Section({ icon, title, children, action }: { icon: React.ReactNode; title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground font-medium">{icon}{title}</div>
        {action}
      </div>
      {children}
      <Separator className="mt-4" />
    </div>
  );
}
