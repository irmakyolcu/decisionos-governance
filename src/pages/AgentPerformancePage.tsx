import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTable } from '@/hooks/useGovernance';
import { Activity, CheckCircle2, AlertTriangle, Clock, Brain } from 'lucide-react';

export default function AgentPerformancePage() {
  const { rows: runs } = useTable<any>('agent_runs');

  const byAgent = useMemo(() => {
    const map = new Map<string, any[]>();
    runs.forEach((r) => {
      if (!map.has(r.agent_id)) map.set(r.agent_id, []);
      map.get(r.agent_id)!.push(r);
    });
    return Array.from(map.entries()).map(([agent_id, rs]) => {
      const total = rs.length;
      const success = rs.filter((r) => r.status === 'success').length;
      const overridden = rs.filter((r) => r.was_overridden).length;
      const helpful = rs.filter((r) => r.was_helpful === true).length;
      const avgLatency = Math.round(rs.reduce((s, r) => s + (r.latency_ms || 0), 0) / Math.max(1, total));
      return { agent_id, total, success, overridden, helpful, avgLatency };
    });
  }, [runs]);

  const totals = useMemo(() => ({
    runs: runs.length,
    success: runs.filter((r) => r.status === 'success').length,
    failed: runs.filter((r) => r.status === 'failed').length,
    overridden: runs.filter((r) => r.was_overridden).length,
  }), [runs]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Activity className="h-7 w-7" /> Agent Performance</h1>
        <p className="text-muted-foreground mt-1">How each AI agent is performing for your workspace.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Metric icon={Activity} label="Total runs" value={totals.runs} />
        <Metric icon={CheckCircle2} label="Successful" value={totals.success} tone="ok" />
        <Metric icon={AlertTriangle} label="Failed" value={totals.failed} tone="risk" />
        <Metric icon={Brain} label="Overridden by humans" value={totals.overridden} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">By agent</CardTitle></CardHeader>
        <CardContent className="p-0">
          {byAgent.length === 0 ? <p className="p-6 text-sm text-muted-foreground">No agent runs recorded yet.</p> : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr><th className="p-3 text-left">Agent</th><th className="p-3 text-right">Runs</th>
                  <th className="p-3 text-right">Success rate</th><th className="p-3 text-right">Override rate</th>
                  <th className="p-3 text-right">Helpful</th><th className="p-3 text-right">Avg latency</th></tr>
              </thead>
              <tbody>
                {byAgent.map((a) => (
                  <tr key={a.agent_id} className="border-t">
                    <td className="p-3 font-medium">{a.agent_id}</td>
                    <td className="p-3 text-right">{a.total}</td>
                    <td className="p-3 text-right">{Math.round((a.success / a.total) * 100)}%</td>
                    <td className="p-3 text-right">{Math.round((a.overridden / a.total) * 100)}%</td>
                    <td className="p-3 text-right">{a.helpful}</td>
                    <td className="p-3 text-right">{a.avgLatency} ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> Recent runs</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {runs.length === 0 && <li className="p-6 text-sm text-muted-foreground">No runs yet.</li>}
            {runs.slice(0, 30).map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                <Badge variant={r.status === 'success' ? 'default' : 'destructive'}>{r.status}</Badge>
                <span className="font-medium">{r.agent_id}</span>
                <span className="text-muted-foreground text-xs">{r.model}</span>
                {r.was_overridden && <Badge variant="outline">overridden</Badge>}
                <span className="ml-auto text-xs text-muted-foreground">{r.latency_ms ? `${r.latency_ms} ms · ` : ''}{new Date(r.created_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: any) {
  return (
    <Card><CardContent className="pt-6 flex items-center justify-between">
      <div><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-bold mt-1">{value}</p></div>
      <Icon className={`h-8 w-8 ${tone === 'risk' ? 'text-red-500' : tone === 'ok' ? 'text-emerald-500' : 'text-muted-foreground'}`} />
    </CardContent></Card>
  );
}
