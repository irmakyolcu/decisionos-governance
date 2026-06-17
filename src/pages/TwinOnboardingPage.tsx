import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Crown, BookOpen, Network, Inbox, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TWIN_ONBOARDING_KEY = 'decisionos.twinOnboarded';

const STEPS = [
  { id: 1, title: 'CEO priorities', subtitle: 'What does the CEO optimize for?', icon: Crown },
  { id: 2, title: 'Past decisions', subtitle: 'Turn past decisions into reusable operating logic', icon: BookOpen },
  { id: 3, title: 'Delegation rules', subtitle: 'Escalate only what truly needs executive judgment', icon: Network },
  { id: 4, title: 'First request', subtitle: 'Help teams move without waiting for the CEO', icon: Inbox },
];

export default function TwinOnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [priorities, setPriorities] = useState<string[]>(['', '', '']);
  const [pastDecisions, setPastDecisions] = useState('');
  const [rules, setRules] = useState<{ condition: string; level: string }[]>([
    { condition: 'Financial commitment > €5,000', level: 'Needs CEO approval' },
    { condition: 'Reversible product experiment < €2,000', level: 'Team can decide' },
    { condition: 'Any legal, brand or PR exposure', level: 'Needs CEO approval' },
  ]);
  const [firstRequest, setFirstRequest] = useState('');

  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  const finish = () => {
    localStorage.setItem(TWIN_ONBOARDING_KEY, '1');
    toast({ title: 'CEO Digital Twin is active', description: 'Your judgment layer is now powering recommendations.' });
    navigate('/decision-intake');
  };

  const StepIcon = STEPS[step - 1].icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="page-header">
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Setup — 4 steps</p>
        <h1 className="page-title">Preserve founder judgment as the company scales</h1>
        <p className="page-description">
          Capture how the CEO actually decides — so the team can move without waiting, and only what truly needs executive judgment gets escalated.
        </p>
      </div>

      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = s.id < step;
          const current = s.id === step;
          return (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold border-2
                ${done ? 'bg-success/10 text-success border-success/40'
                  : current ? 'bg-primary/10 text-primary border-primary'
                  : 'bg-muted text-muted-foreground border-border'}`}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px ${done ? 'bg-success/50' : 'bg-border'}`} />}
            </div>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center"><StepIcon className="h-5 w-5 text-primary" /></div>
            <div>
              <CardTitle className="text-base">Step {step}: {STEPS[step - 1].title}</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{STEPS[step - 1].subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 1 && (
            <>
              <p className="text-sm text-muted-foreground">List the top 3–5 things the CEO consistently optimizes for. The twin uses these to weight every recommendation.</p>
              {priorities.map((p, i) => (
                <div className="grid gap-2" key={i}>
                  <Label>Priority {i + 1}</Label>
                  <Input value={p} onChange={(e) => setPriorities((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                    placeholder={i === 0 ? 'e.g. Brand trust over short-term revenue' : 'Add a CEO priority…'} />
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={() => setPriorities((a) => [...a, ''])}>+ Add another priority</Button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-muted-foreground">Paste 3–10 past decisions and how the CEO actually resolved them. These become the twin's reusable operating logic.</p>
              <div className="grid gap-2">
                <Label>Past decisions</Label>
                <Textarea rows={10} value={pastDecisions} onChange={(e) => setPastDecisions(e.target.value)}
                  placeholder={`Example:\n• Freshmango accelerator → declined equity, kept advisory relationship. Equity is most expensive currency.\n• Senior PM hire → hired from network with 2-week paid trial. Trust signal beats credential signal.\n• Refund policy → extended to 30 days, first purchase only. Trust gestures pay back in retention.`} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <p className="text-sm text-muted-foreground">Define which decisions the team can take, which need a manager, and which require the CEO. Escalate only what truly needs executive judgment.</p>
              <div className="space-y-2">
                {rules.map((r, i) => (
                  <div key={i} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-start">
                    <Input className="md:col-span-3" value={r.condition} onChange={(e) =>
                      setRules((arr) => arr.map((x, j) => j === i ? { ...x, condition: e.target.value } : x))} placeholder="Condition" />
                    <select className="md:col-span-2 h-10 rounded-md border border-input bg-background px-3 text-sm"
                      value={r.level} onChange={(e) =>
                        setRules((arr) => arr.map((x, j) => j === i ? { ...x, level: e.target.value } : x))}>
                      <option>Team can decide</option>
                      <option>Needs manager approval</option>
                      <option>Needs CEO approval</option>
                      <option>Escalate immediately</option>
                    </select>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setRules((a) => [...a, { condition: '', level: 'Team can decide' }])}>+ Add rule</Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted-foreground">Try the twin on a real open decision. You'll get a CEO-aligned recommendation, reasoning, and a stakeholder message in seconds.</p>
              <div className="grid gap-2">
                <Label>What decision is on your desk right now?</Label>
                <Textarea rows={4} value={firstRequest} onChange={(e) => setFirstRequest(e.target.value)}
                  placeholder="e.g. Partnership offer from a new accelerator — they want 2% equity for a 12-week program." />
              </div>
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm text-foreground">
                On finish, you'll be taken to <span className="font-medium">Decision Intake</span> with this seeded, so the twin can produce its first recommendation.
              </div>
            </>
          )}

          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={prev} disabled={step === 1}><ArrowLeft className="h-4 w-4" />Back</Button>
            {step < 4 ? (
              <Button onClick={next}>Continue<ArrowRight className="h-4 w-4" /></Button>
            ) : (
              <Button onClick={finish}>Activate twin & submit first request<ArrowRight className="h-4 w-4" /></Button>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Skip and explore — <button className="text-primary hover:underline" onClick={() => navigate('/')}>go to dashboard</button>
      </p>
    </div>
  );
}

export { TWIN_ONBOARDING_KEY };
