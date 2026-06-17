import { delegationRules } from '@/data/ceoTwin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, UserCog, Crown, AlertOctagon } from 'lucide-react';
import type { DelegationLevel } from '@/types/ceoTwin';

const levels: { key: DelegationLevel; icon: React.ReactNode; cls: string; desc: string }[] = [
  { key: 'Team can decide', icon: <Users className="h-4 w-4" />, cls: 'border-success/30 bg-success/5', desc: 'Reversible, low-impact decisions the team owns end-to-end.' },
  { key: 'Needs manager approval', icon: <UserCog className="h-4 w-4" />, cls: 'border-warning/30 bg-warning/5', desc: 'Department-scope decisions that need a manager sign-off.' },
  { key: 'Needs CEO approval', icon: <Crown className="h-4 w-4" />, cls: 'border-primary/30 bg-primary/5', desc: 'Strategic, financial, legal, or brand-sensitive decisions.' },
  { key: 'Escalate immediately', icon: <AlertOctagon className="h-4 w-4" />, cls: 'border-destructive/30 bg-destructive/5', desc: 'PR, security, or legal incidents that need real-time attention.' },
];

const lvlBadge = (l: DelegationLevel) =>
  l === 'Team can decide' ? 'bg-success/10 text-success border-success/30'
  : l === 'Needs manager approval' ? 'bg-warning/10 text-warning border-warning/30'
  : l === 'Needs CEO approval' ? 'bg-primary/10 text-primary border-primary/30'
  : 'bg-destructive/10 text-destructive border-destructive/30';

export default function DelegationEnginePage() {
  return (
    <div className="space-y-6">
      <div className="page-header">
        <h1 className="page-title">Delegation Engine</h1>
        <p className="page-description">Every incoming decision is auto-classified into one of four lanes. Rules below are derived from the CEO Decision Profile.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {levels.map((l) => (
          <Card key={l.key} className={`border ${l.cls}`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-foreground">{l.icon}<span className="font-semibold text-sm">{l.key}</span></div>
              <p className="text-xs text-muted-foreground">{l.desc}</p>
              <p className="text-xs text-muted-foreground mt-2">
                {delegationRules.filter((r) => r.level === l.key).length} active rule(s)
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active classification rules</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {delegationRules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <p className="text-sm text-foreground">{r.condition}</p>
                <Badge variant="outline" className={lvlBadge(r.level)}>{r.level}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
