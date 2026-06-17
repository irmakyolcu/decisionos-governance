import { useMemo } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { AlignmentScore } from '@/components/AlignmentScore';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ceoProfile } from '@/data/ceoTwin';
import { Compass, Crown, ShieldAlert, Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

/** Deterministic per-decision alignment score derived from risk, budget, status and priorities. */
function scoreDecision(d: { riskLevel: string; budget: number; status: string }) {
  let s = 80;
  if (d.riskLevel === 'High') s -= 18;
  if (d.riskLevel === 'Critical') s -= 28;
  if (d.budget > 5000) s -= 8;
  if (d.budget > 50000) s -= 6;
  if (d.status === 'Approved' || d.status === 'Executed') s += 8;
  if (d.status === 'Rejected') s -= 18;
  if (d.status === 'Escalated') s -= 6;
  return Math.max(8, Math.min(98, s));
}

export default function StrategicAlignmentPage() {
  const { decisions } = useDecisions();

  const scored = useMemo(
    () => decisions.map((d) => ({ d, score: scoreDecision(d) })).sort((a, b) => b.score - a.score),
    [decisions],
  );

  const portfolio = useMemo(() => {
    if (scored.length === 0) return { avg: 82, aligned: 0, mixed: 0, misaligned: 0 };
    const avg = Math.round(scored.reduce((s, x) => s + x.score, 0) / scored.length);
    const aligned = scored.filter((x) => x.score >= 70).length;
    const mixed = scored.filter((x) => x.score >= 50 && x.score < 70).length;
    const misaligned = scored.filter((x) => x.score < 50).length;
    return { avg, aligned, mixed, misaligned };
  }, [scored]);

  return (
    <div className="space-y-6">
      <div className="page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Strategic Alignment</p>
          <h1 className="page-title">Is the company moving in the CEO's direction?</h1>
          <p className="page-description max-w-2xl">
            Every decision scored against {ceoProfile.name}'s priorities, red lines and risk appetite. Spot drift before it compounds.
          </p>
        </div>
        <Button variant="outline" asChild><Link to="/ceo-profile"><Crown className="h-4 w-4" />Update CEO logic</Link></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Portfolio alignment</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            <AlignmentScore score={portfolio.avg} size="lg" />
            <div className="grid grid-cols-3 gap-3 w-full text-center">
              <Stat label="Aligned" value={portfolio.aligned} cls="text-success" />
              <Stat label="Mixed" value={portfolio.mixed} cls="text-warning" />
              <Stat label="Drift" value={portfolio.misaligned} cls="text-destructive" />
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Compass className="h-4 w-4 text-primary" />CEO priorities driving the score</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ceoProfile.priorities.map((p, i) => (
                <li key={p} className="flex gap-3 rounded-lg border border-border bg-muted/20 p-3">
                  <span className="h-6 w-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  <span className="text-sm text-foreground">{p}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 rounded-md border border-l-4 border-l-destructive/60 border-border bg-destructive/5 p-3">
              <p className="text-xs uppercase tracking-wider text-destructive font-medium flex items-center gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Red lines</p>
              <p className="text-xs text-foreground mt-1">{ceoProfile.redLines.join(' · ')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Decision-by-decision alignment</CardTitle>
        </CardHeader>
        <CardContent>
          {scored.length === 0 ? (
            <p className="text-sm text-muted-foreground">No decisions yet. Submit one from <Link to="/decision-intake" className="text-primary hover:underline">Decision Intake</Link>.</p>
          ) : (
            <div className="divide-y divide-border/60">
              {scored.map(({ d, score }) => (
                <div key={d.id} className="py-4 flex items-center gap-4">
                  <AlignmentScore score={score} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{d.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RiskBadge level={d.riskLevel} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, cls }: { label: string; value: number; cls: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <p className={`text-xl font-bold ${cls}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
