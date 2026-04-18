import { useMemo } from 'react';
import { useDecisions } from '@/hooks/useDecisions';
import { MetricCard } from '@/components/MetricCard';
import { BarChart3, CheckCircle, XCircle, TrendingUp, AlertTriangle, GitBranch } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function AnalyticsPage() {
  const { decisions, loading } = useDecisions();

  const data = useMemo(() => {
    const total = decisions.length;
    const approved = decisions.filter(d => ['Approved', 'Executed'].includes(d.status)).length;
    const rejected = decisions.filter(d => d.status === 'Rejected').length;
    const escalated = decisions.filter(d => d.status === 'Escalated').length;
    const successRate = total > 0 ? Math.round((approved / total) * 100) : 0;
    const failureRate = total > 0 ? Math.round((rejected / total) * 100) : 0;
    const avgROI = (() => {
      const evals = decisions.map(d => d.aiEvaluation?.expectedROI).filter((v): v is number => typeof v === 'number');
      return evals.length ? Math.round(evals.reduce((a, b) => a + b, 0) / evals.length) : 0;
    })();
    const thisMonth = decisions.filter(d => {
      const now = new Date();
      return d.createdAt.getMonth() === now.getMonth() && d.createdAt.getFullYear() === now.getFullYear();
    }).length;

    // last 6 months
    const now = new Date();
    const decisionsByMonth = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      const monthDecs = decisions.filter(d =>
        d.createdAt.getMonth() === date.getMonth() && d.createdAt.getFullYear() === date.getFullYear()
      );
      return {
        month: MONTHS[date.getMonth()],
        approved: monthDecs.filter(d => ['Approved', 'Executed'].includes(d.status)).length,
        rejected: monthDecs.filter(d => d.status === 'Rejected').length,
      };
    });

    const outcomeDistribution = [
      { name: 'Approved', value: approved, color: 'hsl(142, 76%, 36%)' },
      { name: 'Pending', value: decisions.filter(d => ['Pending', 'Under Review', 'Escalated'].includes(d.status)).length, color: 'hsl(38, 92%, 50%)' },
      { name: 'Rejected', value: rejected, color: 'hsl(0, 72%, 51%)' },
      { name: 'Draft', value: decisions.filter(d => d.status === 'Draft').length, color: 'hsl(215, 15%, 47%)' },
    ].filter(o => o.value > 0);

    // top decision makers
    const makerMap = new Map<string, { name: string; decisions: number; approved: number }>();
    decisions.forEach(d => {
      const k = d.createdBy.name;
      const cur = makerMap.get(k) ?? { name: k, decisions: 0, approved: 0 };
      cur.decisions++;
      if (['Approved', 'Executed'].includes(d.status)) cur.approved++;
      makerMap.set(k, cur);
    });
    const topDecisionMakers = Array.from(makerMap.values())
      .sort((a, b) => b.decisions - a.decisions)
      .slice(0, 5)
      .map(m => ({ name: m.name, decisions: m.decisions, successRate: m.decisions ? Math.round((m.approved / m.decisions) * 100) : 0 }));

    // escalations by role
    const escMap = new Map<string, number>();
    decisions.filter(d => d.status === 'Escalated').forEach(d => {
      escMap.set(d.createdBy.role, (escMap.get(d.createdBy.role) ?? 0) + 1);
    });
    const escalationsByRole = Array.from(escMap.entries()).map(([role, escalated]) => ({ role, escalated }));

    return { total, successRate, failureRate, avgROI, escalated, thisMonth, decisionsByMonth, outcomeDistribution, topDecisionMakers, escalationsByRole };
  }, [decisions]);

  if (loading) return <div className="p-6 space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-96 w-full" /></div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Decision Analytics</h1>
        <p className="page-description">Executive dashboard showing organizational decision effectiveness.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard title="Success Rate" value={`${data.successRate}%`} icon={<CheckCircle className="h-5 w-5 text-success" />} />
        <MetricCard title="Failure Rate" value={`${data.failureRate}%`} icon={<XCircle className="h-5 w-5 text-destructive" />} />
        <MetricCard title="Avg ROI" value={`${data.avgROI}%`} icon={<TrendingUp className="h-5 w-5 text-primary" />} />
        <MetricCard title="Escalated" value={data.escalated} icon={<AlertTriangle className="h-5 w-5 text-warning" />} />
        <MetricCard title="Total Decisions" value={data.total} icon={<GitBranch className="h-5 w-5 text-primary" />} />
        <MetricCard title="This Month" value={data.thisMonth} icon={<BarChart3 className="h-5 w-5 text-info" />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Decisions by Month</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.decisionsByMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 88%)" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 47%)" />
              <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 15%, 47%)" />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(214, 20%, 88%)' }} />
              <Bar dataKey="approved" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Approved" />
              <Bar dataKey="rejected" fill="hsl(0, 72%, 51%)" radius={[4, 4, 0, 0]} name="Rejected" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="enterprise-card p-6">
          <h3 className="font-semibold text-foreground mb-4">Outcome Distribution</h3>
          {data.outcomeDistribution.length === 0 ? (
            <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">Veri yok</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.outcomeDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {data.outcomeDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="enterprise-card overflow-hidden mb-6">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Top Decision Makers</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Name</th><th>Decisions</th><th>Success Rate</th></tr>
          </thead>
          <tbody>
            {data.topDecisionMakers.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-muted-foreground py-6">Veri yok</td></tr>
            ) : data.topDecisionMakers.map((dm, i) => (
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

      <div className="enterprise-card overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold text-foreground text-sm">Escalations by Role</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr><th>Role</th><th>Escalated Decisions</th></tr>
          </thead>
          <tbody>
            {data.escalationsByRole.length === 0 ? (
              <tr><td colSpan={2} className="text-center text-muted-foreground py-6">Yükseltme yok</td></tr>
            ) : data.escalationsByRole.map((e, i) => (
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
