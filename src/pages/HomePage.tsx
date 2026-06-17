import { useMemo } from 'react';
import { MetricCard } from '@/components/MetricCard';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { useDecisions } from '@/hooks/useDecisions';
import { useMeetings } from '@/hooks/useMeetings';
import { BarChart3, CheckCircle, AlertTriangle, TrendingUp, Clock, DollarSign, GitBranch, Calendar, Crown, Inbox, Users, ShieldAlert, Compass, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ceoProfile } from '@/data/ceoTwin';

export default function HomePage() {
  const { decisions, loading: dLoading } = useDecisions();
  const { meetings, loading: mLoading } = useMeetings();

  const formatCurrency = (n: number) => n >= 1000000 ? `€${(n / 1000000).toFixed(1)}M` : `€${(n / 1000).toFixed(0)}k`;

  const metrics = useMemo(() => {
    const total = decisions.length;
    const pending = decisions.filter(d => ['Pending', 'Under Review', 'Escalated'].includes(d.status)).length;
    const approved = decisions.filter(d => ['Approved', 'Executed'].includes(d.status)).length;
    const rejected = decisions.filter(d => d.status === 'Rejected').length;
    const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const escalated = decisions.filter(d => d.status === 'Escalated').length;
    const budgetUsed = decisions.filter(d => d.status === 'Approved' || d.status === 'Executed').reduce((s, d) => s + d.budget, 0);
    const budgetAllocated = decisions.reduce((s, d) => s + d.budget, 0);
    const thisMonth = decisions.filter(d => {
      const now = new Date();
      return d.createdAt.getMonth() === now.getMonth() && d.createdAt.getFullYear() === now.getFullYear();
    }).length;
    const avgROI = (() => {
      const evals = decisions.map(d => d.aiEvaluation?.expectedROI).filter((v): v is number => typeof v === 'number');
      return evals.length ? Math.round(evals.reduce((a, b) => a + b, 0) / evals.length) : 0;
    })();
    return { total, pending, approved, rejected, successRate, escalated, budgetUsed, budgetAllocated, thisMonth, avgROI };
  }, [decisions]);

  // CEO Twin executive summary: derive from existing decisions
  const twin = useMemo(() => {
    const pending = decisions.filter(d => ['Pending', 'Under Review', 'Escalated'].includes(d.status)).length;
    const ceoNeeded = decisions.filter(d => d.status === 'Escalated' || (d.budget > 5000 && d.status === 'Under Review') || d.riskLevel === 'High' || d.riskLevel === 'Critical').length;
    const delegatable = Math.max(0, pending - ceoNeeded);
    const highRisk = decisions.filter(d => d.riskLevel === 'High' || d.riskLevel === 'Critical').length;
    const alignment = decisions.length === 0 ? 78 : Math.max(40, Math.min(96, 82 + Math.round((decisions.filter(d => d.status === 'Approved').length - decisions.filter(d => d.status === 'Rejected').length) * 2)));
    return { pending, ceoNeeded, delegatable, highRisk, alignment };
  }, [decisions]);

  return (
    <div>
      <div className="page-header flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">CEO Digital Twin · {ceoProfile.company}</p>
          <h1 className="page-title">Preserve founder judgment as the company scales</h1>
          <p className="page-description max-w-2xl">
            Reduce CEO bottlenecks. Turn past decisions into reusable operating logic, so teams move without waiting and only what truly needs executive judgment gets escalated.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild><Link to="/ceo-profile"><Crown className="h-4 w-4" />Map CEO Decision Logic</Link></Button>
          <Button asChild><Link to="/decision-intake"><Inbox className="h-4 w-4" />Submit Decision Request</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <MetricCard title="Pending" value={twin.pending} icon={<Clock className="h-5 w-5 text-warning" />} subtitle="Awaiting routing" />
        <MetricCard title="CEO Review Needed" value={twin.ceoNeeded} icon={<Crown className="h-5 w-5 text-primary" />} subtitle="Red line or > €5k" />
        <MetricCard title="Delegated to Team" value={twin.delegatable} icon={<Users className="h-5 w-5 text-success" />} subtitle="Team can decide" />
        <MetricCard title="High-Risk Items" value={twin.highRisk} icon={<ShieldAlert className="h-5 w-5 text-destructive" />} subtitle="Brand · legal · financial" />
        <MetricCard title="Strategic Alignment" value={`${twin.alignment}%`} icon={<Compass className="h-5 w-5 text-primary" />} subtitle="Portfolio vs CEO" />
      </div>

      <div className="enterprise-card mb-8 p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-l-4 border-l-primary">
        <div>
          <h3 className="font-semibold text-foreground">Judgment Layer is active</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            {ceoProfile.priorities.length} priorities, {ceoProfile.redLines.length} red lines, and {ceoProfile.delegationRules.length} delegation rules now power every recommendation. The team gets a CEO-aligned answer in seconds — the CEO only sees what truly needs them.
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" asChild><Link to="/twin-onboarding">Setup Wizard<ArrowRight className="h-3.5 w-3.5" /></Link></Button>
          <Button variant="outline" size="sm" asChild><Link to="/strategic-alignment">Strategic Alignment<ArrowRight className="h-3.5 w-3.5" /></Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Decisions" value={metrics.total} icon={<GitBranch className="h-5 w-5 text-primary" />} />
        <MetricCard title="Pending Approvals" value={metrics.pending} icon={<Clock className="h-5 w-5 text-warning" />} subtitle="Requires attention" />
        <MetricCard title="Success Rate" value={`${metrics.successRate}%`} icon={<CheckCircle className="h-5 w-5 text-success" />} />
        <MetricCard title="Budget Utilized" value={formatCurrency(metrics.budgetUsed)} icon={<DollarSign className="h-5 w-5 text-primary" />} subtitle={`of ${formatCurrency(metrics.budgetAllocated)} allocated`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="enterprise-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent Decisions</h3>
            <Link to="/decisions" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {dLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : decisions.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Henüz karar yok.</p>
            ) : decisions.slice(0, 5).map((d) => (
              <div key={d.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{d.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">by {d.createdBy.name} · {d.createdAt.toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <RiskBadge level={d.riskLevel} />
                    <StatusBadge status={d.status} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="enterprise-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Upcoming Meetings</h3>
            <Link to="/meetings" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {mLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : meetings.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Henüz toplantı yok.</p>
            ) : meetings.slice(0, 5).map((m) => (
              <div key={m.id} className="p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-sm text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{m.date.toLocaleDateString()} · {m.startTime}–{m.endTime}</p>
                    <p className="text-xs text-muted-foreground">{m.location}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {m.duration}min
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <MetricCard title="Avg ROI" value={`${metrics.avgROI}%`} icon={<TrendingUp className="h-5 w-5 text-success" />} />
        <MetricCard title="Escalated Decisions" value={metrics.escalated} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
        <MetricCard title="This Month" value={metrics.thisMonth} icon={<BarChart3 className="h-5 w-5 text-primary" />} subtitle="decisions processed" />
      </div>
    </div>
  );
}
