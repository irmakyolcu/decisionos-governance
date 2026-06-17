import { ceoProfile } from '@/data/ceoTwin';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Shield, MessageSquare, Compass, AlertOctagon, Users, Sparkles } from 'lucide-react';

const riskColor = (l: string) =>
  l === 'High' ? 'bg-success/10 text-success border-success/30'
  : l === 'Medium' ? 'bg-warning/10 text-warning border-warning/30'
  : 'bg-destructive/10 text-destructive border-destructive/30';

export default function CEOProfilePage() {
  const p = ceoProfile;
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">CEO Decision Profile</h1>
        <p className="page-description">
          The Judgment Layer — {p.name}, {p.title} at {p.company}. This is the source of truth that powers every recommendation, delegation call, and alignment score.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">CEO Priorities</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {p.priorities.map((x) => (
                <li key={x} className="flex gap-2 text-sm">
                  <span className="text-primary mt-0.5">→</span>
                  <span className="text-foreground">{x}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Risk Appetite</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {p.riskAppetite.map((r) => (
              <div key={r.area} className="flex items-start justify-between gap-3 border-b border-border/50 pb-2 last:border-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{r.area}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.note}</p>
                </div>
                <Badge variant="outline" className={riskColor(r.level)}>{r.level}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Preferred Decision Style</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {p.decisionStyle.map((x) => <li key={x} className="text-sm text-foreground">• {x}</li>)}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Communication Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {p.communicationStyle.map((x) => <Badge key={x} variant="secondary">{x}</Badge>)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <AlertOctagon className="h-5 w-5 text-destructive" />
            <CardTitle className="text-base">Red Lines / Non-Negotiables</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {p.redLines.map((x) => (
                <li key={x} className="text-sm text-foreground flex gap-2">
                  <span className="text-destructive">✕</span><span>{x}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Users className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Delegation Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {p.delegationRules.map((x) => <li key={x} className="text-sm text-foreground">• {x}</li>)}
            </ul>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <Compass className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Strategic Focus Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {p.strategicFocus.map((x) => (
                <div key={x} className="rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">{x}</div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
