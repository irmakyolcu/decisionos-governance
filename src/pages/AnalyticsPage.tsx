import { analyticsData, dashboardMetrics } from '@/data/mockData';
import { MetricCard } from '@/components/MetricCard';
import { BarChart3, CheckCircle, XCircle, TrendingUp, AlertTriangle, GitBranch } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

export default function AnalyticsPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Analytics</h1>
        <p className="page-description">Executive dashboard showing organizational decision effectiveness.</p>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard title="Success Rate" value={`${dashboardMetrics.successRate}%`} icon={<CheckCircle className="h-5 w-5 text-success" />} />
        <MetricCard title="Failure Rate" value={`${dashboardMetrics.failureRate}%`} icon={<XCircle className="h-5 w-5 text-destructive" />} />
        <MetricCard title="Avg ROI" value={`${dashboardMetrics.avgROI}%`} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        <MetricCard title="Escalated" value={dashboardMetrics.escalatedDecisions} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
        <MetricCard title="Total Decisions" value={dashboardMetrics.totalDecisions} icon={<GitBranch className="h-5 w-5 text-primary" />} />
        <MetricCard title="This Month" value={dashboardMetrics.decisionsThisMonth} icon={<BarChart3 className="h-5 w-5 text-info" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Decisions by Month */}
        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Decisions by Month</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={analyticsData.decisionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214, 20%, 88%)' }} />
              <Bar dataKey="approved" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Approved" />
              <Bar dataKey="rejected" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Outcome Distribution */}
        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Outcome Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={analyticsData.outcomeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}%`}>
                {analyticsData.outcomeDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Decision Makers */}
      <div className="enterprise-card overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Top Decision Makers</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Decisions</th><th>Success Rate</th></tr>
          </thead>
          <tbody>
            {analyticsData.topDecisionMakers.map((dm, i) => (
              <tr key={i}>
                <td className="font-medium text-foreground">{dm.name}</td>
                <td>{dm.decisions}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full max-w-[100px]">
                      <div className="h-2 bg-success rounded-full" style={{ width: `${dm.successRate}%` }} />
                    </div>
                    <span className="text-sm text-foreground">{dm.successRate}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Escalations by Role */}
      <div className="enterprise-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Escalations by Role</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Role</th><th>Escalated Decisions</th></tr>
          </thead>
          <tbody>
            {analyticsData.escalationsByRole.map((e, i) => (
              <tr key={i}>
                <td className="font-medium text-foreground">{e.role}</td>
                <td>{e.escalated}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
