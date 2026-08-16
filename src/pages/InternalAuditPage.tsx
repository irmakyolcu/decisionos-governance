import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTable } from '@/hooks/useGovernance';
import { NavLink } from '@/components/NavLink';
import { Download, Lock, ShieldCheck, History, EyeOff } from 'lucide-react';
import { downloadStepAudits, downloadRows, auditEventToRow } from '@/lib/stepAudit';

const ALL = '__all__';

export default function InternalAuditPage() {
  const { rows } = useTable<any>('audit_events');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [eventType, setEventType] = useState(ALL);
  const [flow, setFlow] = useState(ALL);

  const eventTypeOptions = useMemo(
    () => [...new Set(rows.map((r) => r.event_type).filter(Boolean))].sort(),
    [rows],
  );
  const flowOptions = useMemo(
    () => [...new Set(rows.map((r) => (r.after_state as any)?.flow).filter(Boolean))].sort(),
    [rows],
  );

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const text = `${r.event_type ?? ''} ${r.reason ?? ''}`.toLowerCase();
        if (q && !text.includes(q.toLowerCase())) return false;
        if (from && new Date(r.created_at) < new Date(from)) return false;
        if (to && new Date(r.created_at) > new Date(`${to}T23:59:59`)) return false;
        if (eventType !== ALL && r.event_type !== eventType) return false;
        if (flow !== ALL && (r.after_state as any)?.flow !== flow) return false;
        return true;
      }),
    [rows, q, from, to, eventType, flow],
  );

  const auditReportRows = useMemo(() => filtered.map(auditEventToRow), [filtered]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((r) => m.set(r.event_type, (m.get(r.event_type) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [filtered]);

  const actors = useMemo(
    () => new Set(filtered.map((r) => r.actor_user_id).filter(Boolean)).size,
    [filtered],
  );

  const stepAuditRows = useMemo(
    () =>
      filtered
        .filter((r) => String(r.event_type ?? '').startsWith('step.audit.'))
        .map((r) => {
          const p = (r.after_state ?? {}) as any;
          const names = (a: unknown) => (Array.isArray(a) ? a.map((f: any) => f?.label).filter(Boolean).join(' | ') : '');
          return {
            id: r.id,
            recorded_at: r.created_at,
            completed_at: p.completedAt ?? null,
            flow: p.flow ?? null,
            step: p.step ?? null,
            step_title: p.stepTitle ?? null,
            status: p.status ?? String(r.event_type).replace('step.audit.', ''),
            missing_count: Array.isArray(p.missing) ? p.missing.length : 0,
            error_count: Array.isArray(p.errors) ? p.errors.length : 0,
            interrupted_count: Array.isArray(p.interrupted) ? p.interrupted.length : 0,
            missing: names(p.missing),
            errors: names(p.errors),
            interrupted: names(p.interrupted),
            summary: r.reason ?? null,
          };
        }),
    [filtered],
  );

  function exportCsv() {
    const headers = ['created_at', 'event_type', 'decision_id', 'action_id', 'actor_user_id', 'reason'];
    const csv = [headers.join(',')]
      .concat(filtered.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ic-denetim-ledger.csv';
    a.click();
  }


  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Denetim — İç</p>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Lock className="h-6 w-6" /> İç Denetim
          </h1>
          <p className="text-muted-foreground mt-1">
            Kuruluş içi denetim görünümü: aktör kimlikleri, gerekçeler ve tüm iç kayıtlar dahil.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          <Input placeholder="Filtrele…" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
          <Button variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Adım denetim raporları</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {stepAuditRows.length} otomatik adım raporu — eksik bilgi, yakalanan hata ve kesilen akış özetleri.
            Aynı şema dışa aktarım uç noktasında da mevcut: <code className="text-xs">GET /v1/export?entities=step_audits&amp;format=json|csv</code>
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!stepAuditRows.length}
              onClick={() => downloadStepAudits(stepAuditRows as any, 'json', 'adim-denetim-raporlari')}
            >
              <Download className="h-4 w-4 mr-2" /> JSON
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!stepAuditRows.length}
              onClick={() => downloadStepAudits(stepAuditRows as any, 'csv', 'adim-denetim-raporlari')}
            >
              <Download className="h-4 w-4 mr-2" /> CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Kapsamdaki olay</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{filtered.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Farklı aktör</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{actors}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">İlgili modüller</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <NavLink to="/security-audit" className="text-xs text-primary hover:underline flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Güvenlik Denetimi
            </NavLink>
            <NavLink to="/memory/link-audit" className="text-xs text-primary hover:underline flex items-center gap-1">
              <History className="h-3.5 w-3.5" /> Bağlantı İzi
            </NavLink>
          </CardContent>
        </Card>
      </div>

      {byType.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Olay türü dağılımı</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {byType.map(([type, count]) => (
              <Badge key={type} variant="outline" className="font-mono text-xs">
                {type} · {count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Append-only iç denetim defteri</CardTitle>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <EyeOff className="h-3.5 w-3.5" /> Dış denetçilere kapalı
          </span>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filtered.length === 0 && <li className="p-6 text-sm text-muted-foreground">Kayıt yok.</li>}
            {filtered.map((e) => (
              <li key={e.id} className="p-3 flex items-start gap-3 text-sm">
                <span className="text-xs text-muted-foreground font-mono w-44 flex-shrink-0">
                  {new Date(e.created_at).toLocaleString()}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{e.event_type}</p>
                  {e.reason && <p className="text-xs text-muted-foreground">{e.reason}</p>}
                  <p className="text-xs font-mono text-muted-foreground mt-0.5">
                    {e.actor_user_id && <>actor:{String(e.actor_user_id).slice(0, 8)} </>}
                    {e.action_id && <>act:{String(e.action_id).slice(0, 8)} </>}
                    {e.decision_id && <>dec:{String(e.decision_id).slice(0, 8)}</>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
