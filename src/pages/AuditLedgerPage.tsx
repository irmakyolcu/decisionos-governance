import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTable } from '@/hooks/useGovernance';
import { Download, Lock } from 'lucide-react';

export default function AuditLedgerPage() {
  const { rows } = useTable<any>('audit_events');
  const [q, setQ] = useState('');
  const filtered = useMemo(() => rows.filter((r) =>
    !q || r.event_type?.toLowerCase().includes(q.toLowerCase()) || r.reason?.toLowerCase().includes(q.toLowerCase())
  ), [rows, q]);

  function exportCsv() {
    const headers = ['created_at', 'event_type', 'decision_id', 'action_id', 'actor_user_id', 'reason'];
    const csv = [headers.join(',')].concat(filtered.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')
    )).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'audit-ledger.csv'; a.click();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2"><Lock className="h-6 w-6" /> Audit Ledger</h1>
          <p className="text-muted-foreground mt-1">Append-only record of every decision, approval, and execution event.</p>
        </div>
        <div className="flex gap-2">
          <Input placeholder="Filter…" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />
          <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Export CSV</Button>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{filtered.length} events</CardTitle></CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.length === 0 && <li className="p-6 text-sm text-muted-foreground">No events.</li>}
            {filtered.map((e) => (
              <li key={e.id} className="p-3 flex items-start gap-3 text-sm">
                <span className="text-xs text-muted-foreground font-mono w-44 flex-shrink-0">{new Date(e.created_at).toLocaleString()}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{e.event_type}</p>
                  {e.reason && <p className="text-xs text-muted-foreground">{e.reason}</p>}
                  {(e.action_id || e.decision_id) && (
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      {e.action_id && <>act:{String(e.action_id).slice(0, 8)} </>}
                      {e.decision_id && <>dec:{String(e.decision_id).slice(0, 8)}</>}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
