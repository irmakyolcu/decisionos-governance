import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useTable } from '@/hooks/useGovernance';
import { NavLink } from '@/components/NavLink';
import { Building, Download, FileCheck, ShieldOff, Package } from 'lucide-react';
import { toast } from 'sonner';

const FRAMEWORKS = ['SOC 2', 'ISO 27001', 'GDPR', 'EU AI Act', 'NIS2', 'Internal Governance'];

type Report = {
  id: string;
  title: string;
  framework: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  findings: Array<{ check: string; status: string }> | null;
};

export default function ExternalAuditPage() {
  const { workspace } = useWorkspace();
  const { rows } = useTable<any>('audit_events');
  const [reports, setReports] = useState<Report[]>([]);
  const [framework, setFramework] = useState(FRAMEWORKS[0]);
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(monthAgo);
  const [to, setTo] = useState(today);

  useEffect(() => {
    if (!workspace) return;
    supabase
      .from('compliance_reports')
      .select('*')
      .eq('workspace_id', workspace.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setReports((data ?? []) as unknown as Report[]));
  }, [workspace?.id]);

  // External auditors receive redacted evidence: no actor identities, no free-text reasons.
  const redacted = useMemo(
    () =>
      rows
        .filter((r) => new Date(r.created_at) >= new Date(from) && new Date(r.created_at) <= new Date(`${to}T23:59:59`))
        .map((r) => ({
          timestamp: new Date(r.created_at).toISOString(),
          event_type: r.event_type,
          decision_ref: r.decision_id ? String(r.decision_id).slice(0, 8) : '',
          action_ref: r.action_id ? String(r.action_id).slice(0, 8) : '',
          actor: r.actor_user_id ? 'redacted' : 'system',
        })),
    [rows, from, to],
  );

  function download(name: string, content: string, type: string) {
    const blob = new Blob([content], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
  }

  function exportPackage(format: 'csv' | 'json') {
    if (redacted.length === 0) return toast.error('Seçilen dönemde kanıt kaydı yok.');
    const stamp = `${from}_${to}`;
    if (format === 'json') {
      download(
        `dis-denetim-paketi_${framework.replace(/\s/g, '-')}_${stamp}.json`,
        JSON.stringify({ framework, period: { from, to }, redaction: 'actor identities and reasons removed', events: redacted }, null, 2),
        'application/json',
      );
    } else {
      const headers = ['timestamp', 'event_type', 'decision_ref', 'action_ref', 'actor'];
      const csv = [headers.join(',')]
        .concat(redacted.map((r: any) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')))
        .join('\n');
      download(`dis-denetim-paketi_${stamp}.csv`, csv, 'text/csv');
    }
    toast.success('Dış denetim paketi indirildi (maskelenmiş).');
  }

  const frameworkReports = reports.filter((r) => r.framework === framework);

  return (
    <div className="p-6 space-y-6">
      <div>
        <p className="text-xs uppercase tracking-widest text-primary font-medium mb-1">Denetim — Dış</p>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Building className="h-6 w-6" /> Dış Denetim
        </h1>
        <p className="text-muted-foreground mt-1">
          Bağımsız denetçiler için kapsam sınırlı, maskelenmiş kanıt paketleri ve çerçeve bazlı uyum raporları.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" /> Kanıt paketi oluştur
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Çerçeve</Label>
              <Select value={framework} onValueChange={setFramework}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (
                    <SelectItem key={f} value={f}>
                      {f}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Başlangıç</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Bitiş</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{redacted.length} kanıt kaydı</Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ShieldOff className="h-3.5 w-3.5" /> Aktör kimlikleri ve iç gerekçeler maskelenir
            </span>
            <div className="ml-auto flex gap-2">
              <Button variant="outline" onClick={() => exportPackage('csv')}>
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
              <Button onClick={() => exportPackage('json')}>
                <Download className="h-4 w-4 mr-2" />
                JSON paketi
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2">
            <FileCheck className="h-4 w-4" /> {framework} uyum raporları
          </CardTitle>
          <NavLink to="/compliance" className="text-xs text-primary hover:underline">
            Rapor üret →
          </NavLink>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {frameworkReports.length === 0 && (
              <li className="p-6 text-sm text-muted-foreground">Bu çerçeve için henüz rapor yok.</li>
            )}
            {frameworkReports.map((r) => (
              <li key={r.id} className="p-3 flex items-center gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{r.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {r.period_start} → {r.period_end} · {(r.findings ?? []).length} bulgu
                  </p>
                </div>
                <Badge variant="outline">{r.status}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        İç denetim kayıtları (aktör kimlikleri, gerekçeler, güvenlik bulguları) bu modülde gösterilmez —{' '}
        <NavLink to="/audit/internal" className="text-primary hover:underline">
          İç Denetim
        </NavLink>{' '}
        modülünde yer alır.
      </p>
    </div>
  );
}
