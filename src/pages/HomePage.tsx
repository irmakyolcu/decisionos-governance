import { MetricCard } from '@/components/MetricCard';
import { StatusBadge, RiskBadge } from '@/components/StatusBadge';
import { dashboardMetrics, decisions, meetings } from '@/data/mockData';
import { BarChart3, CheckCircle, AlertTriangle, TrendingUp, Clock, DollarSign, GitBranch, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const formatCurrency = (n: number) => n >= 1000000 ? `€${(n / 1000000).toFixed(1)}M` : `€${(n / 1000).toFixed(0)}k`;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-description">Welcome back. Here's your decision governance overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard title="Total Decisions" value={dashboardMetrics.totalDecisions} icon={<GitBranch className="h-5 w-5 text-primary" />} trend={{ value: 12, positive: true }} />
        <MetricCard title="Pending Approvals" value={dashboardMetrics.pendingApprovals} icon={<Clock className="h-5 w-5 text-warning" />} subtitle="Requires attention" />
        <MetricCard title="Success Rate" value={`${dashboardMetrics.successRate}%`} icon={<CheckCircle className="h-5 w-5 text-success" />} trend={{ value: 5, positive: true }} />
        <MetricCard title="Budget Utilized" value={formatCurrency(dashboardMetrics.budgetUtilized)} icon={<DollarSign className="h-5 w-5 text-primary" />} subtitle={`of ${formatCurrency(dashboardMetrics.budgetAllocated)} allocated`} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Decisions */}
        <div className="enterprise-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Recent Decisions</h3>
            <Link to="/decisions" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {decisions.map((d) => (
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

        {/* Upcoming Meetings */}
        <div className="enterprise-card">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Upcoming Meetings</h3>
            <Link to="/meetings" className="text-xs text-primary hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-border/50">
            {meetings.map((m) => (
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

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <MetricCard title="Avg ROI" value={`${dashboardMetrics.avgROI}%`} icon={<TrendingUp className="h-5 w-5 text-success" />} />
        <MetricCard title="Escalated Decisions" value={dashboardMetrics.escalatedDecisions} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
        <MetricCard title="This Month" value={dashboardMetrics.decisionsThisMonth} icon={<BarChart3 className="h-5 w-5 text-primary" />} subtitle="decisions processed" />
      </div>
    </div>
  );
}
