import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileDown, FileText, Sparkles, Loader2, Mail, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type Scope = 'all' | 'docs' | 'decisions' | 'lessons';

export default function ReportsPage() {
  const { user } = useAuth();
  const { workspace, role } = useWorkspace();
  const { toast } = useToast();
  const [scope, setScope] = useState<Scope>('all');
  const [busy, setBusy] = useState<string | null>(null);
  const [brief, setBrief] = useState<string>('');
  const [bundle, setBundle] = useState<Record<string, any[]>>({});
  const [schedules, setSchedules] = useState<any[]>([]);
  const [schedForm, setSchedForm] = useState({ name: '', recipient_email: '', cadence: 'weekly', format: 'markdown', scope: 'all' });
  const canWrite = role === 'admin' || role === 'approver';

  const loadSchedules = async () => {
    if (!workspace) return;
    const { data } = await supabase.from('report_schedules').select('*').eq('workspace_id', workspace.id).order('created_at', { ascending: false });
    setSchedules(data ?? []);
  };
  useEffect(() => { loadSchedules(); }, [workspace]);

  const runReport = async () => {
    if (!workspace) return;
    setBusy('brief'); setBrief(''); setBundle({});
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', { body: { workspace_id: workspace.id, scope, lang: 'tr' } });
      if (error) throw error;
      setBrief(data.brief || '');
      setBundle(data.bundle || {});
      toast({ title: 'Rapor hazır', description: 'AI brifingi ve veri seti yüklendi.' });
    } catch (e: any) {
      toast({ title: 'Hata', description: e.message, variant: 'destructive' });
    } finally { setBusy(null); }
  };

  const downloadMd = () => {
    if (!brief) return;
    const blob = new Blob([brief], { type: 'text/markdown' });
    triggerDownload(blob, `decisionos-brief-${scope}-${today()}.md`);
  };

  const downloadCsv = () => {
    const rows: any[] = [];
    for (const [k, arr] of Object.entries(bundle)) {
      (arr as any[]).forEach((r) => rows.push({ section: k, ...r }));
    }
    if (!rows.length) return toast({ title: 'Veri yok', description: 'Önce raporu üretin.' });
    const csv = Papa.unparse(rows);
    triggerDownload(new Blob([csv], { type: 'text/csv' }), `decisionos-${scope}-${today()}.csv`);
  };

  const downloadPdf = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text('DecisionOS — Rapor', 14, 18);
    doc.setFontSize(10); doc.text(`Kapsam: ${scope} · ${new Date().toLocaleString()}`, 14, 25);
    let y = 34;
    if (brief) {
      doc.setFontSize(11);
      const lines = doc.splitTextToSize(brief, 180);
      doc.text(lines, 14, y);
      y += lines.length * 5 + 6;
    }
    for (const [name, arr] of Object.entries(bundle)) {
      const list = arr as any[];
      if (!list.length) continue;
      const cols = Object.keys(list[0]).slice(0, 5);
      autoTable(doc, {
        startY: y,
        head: [[name, ...cols.slice(1)]],
        body: list.slice(0, 20).map((r) => cols.map((c) => truncate(String(r[c] ?? '')))),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 41, 59] },
      });
      // @ts-expect-error jsPDF lastAutoTable
      y = doc.lastAutoTable.finalY + 8;
      if (y > 260) { doc.addPage(); y = 20; }
    }
    doc.save(`decisionos-${scope}-${today()}.pdf`);
  };

  const addSchedule = async () => {
    if (!workspace || !user || !schedForm.name || !schedForm.recipient_email) return;
    const nextRun = new Date(); nextRun.setDate(nextRun.getDate() + (schedForm.cadence === 'daily' ? 1 : schedForm.cadence === 'monthly' ? 30 : 7));
    const { error } = await supabase.from('report_schedules').insert({
      workspace_id: workspace.id, created_by: user.id,
      name: schedForm.name, recipient_email: schedForm.recipient_email,
      cadence: schedForm.cadence, format: schedForm.format, scope: schedForm.scope,
      next_run_at: nextRun.toISOString(),
    });
    if (error) return toast({ title: 'Hata', description: error.message, variant: 'destructive' });
    toast({ title: 'Zamanlandı', description: 'Rapor takvimine eklendi.' });
    setSchedForm({ name: '', recipient_email: '', cadence: 'weekly', format: 'markdown', scope: 'all' });
    loadSchedules();
  };

  const removeSchedule = async (id: string) => {
    await supabase.from('report_schedules').delete().eq('id', id);
    loadSchedules();
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><FileText className="h-6 w-6 text-primary" /> Raporlar</h1>
        <p className="text-sm text-muted-foreground mt-1">AI yönetici brifingi üretin, CSV/PDF olarak indirin, periyodik e-posta raporları zamanlayın.</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <Label>Kapsam</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü (workspace)</SelectItem>
                <SelectItem value="docs">Dokümanlar + Knowledge</SelectItem>
                <SelectItem value="decisions">Kararlar + AI değerlendirmeleri</SelectItem>
                <SelectItem value="lessons">Lessons Learned + Audit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={runReport} disabled={busy === 'brief'} className="gap-2">
            {busy === 'brief' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            AI Executive Brief üret
          </Button>
          <Button variant="outline" onClick={downloadMd} disabled={!brief} className="gap-2"><FileDown className="h-4 w-4" /> Markdown</Button>
          <Button variant="outline" onClick={downloadCsv} disabled={!Object.keys(bundle).length} className="gap-2"><FileDown className="h-4 w-4" /> CSV</Button>
          <Button variant="outline" onClick={downloadPdf} disabled={!brief && !Object.keys(bundle).length} className="gap-2"><FileDown className="h-4 w-4" /> PDF</Button>
        </div>

        {brief && (
          <div className="mt-4 p-4 rounded-lg border border-border bg-muted/30 whitespace-pre-wrap text-sm font-mono max-h-[500px] overflow-auto">
            {brief}
          </div>
        )}
        {!!Object.keys(bundle).length && (
          <div className="flex flex-wrap gap-2 mt-2">
            {Object.entries(bundle).map(([k, v]) => (
              <Badge key={k} variant="outline">{k}: {(v as any[]).length}</Badge>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /><h2 className="font-semibold">Zamanlanmış e-posta raporları</h2></div>
        {canWrite ? (
          <div className="grid md:grid-cols-6 gap-2 items-end">
            <div className="md:col-span-2"><Label>Ad</Label><Input value={schedForm.name} onChange={(e) => setSchedForm({ ...schedForm, name: e.target.value })} placeholder="Haftalık yönetici raporu" /></div>
            <div className="md:col-span-2"><Label>Alıcı e-posta</Label><Input type="email" value={schedForm.recipient_email} onChange={(e) => setSchedForm({ ...schedForm, recipient_email: e.target.value })} placeholder="ceo@company.com" /></div>
            <div>
              <Label>Sıklık</Label>
              <Select value={schedForm.cadence} onValueChange={(v) => setSchedForm({ ...schedForm, cadence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Günlük</SelectItem>
                  <SelectItem value="weekly">Haftalık</SelectItem>
                  <SelectItem value="monthly">Aylık</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Kapsam</Label>
              <Select value={schedForm.scope} onValueChange={(v) => setSchedForm({ ...schedForm, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="docs">Dokümanlar</SelectItem>
                  <SelectItem value="decisions">Kararlar</SelectItem>
                  <SelectItem value="lessons">Lessons</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="md:col-span-6" onClick={addSchedule}>Zamanla</Button>
          </div>
        ) : (
          <p className="text-xs text-warning">Zamanlama yalnızca admin/approver rollerine açıktır.</p>
        )}

        <div className="space-y-2 mt-4">
          {schedules.length === 0 ? (
            <p className="text-sm text-muted-foreground">Henüz zamanlanmış rapor yok.</p>
          ) : schedules.map((s) => (
            <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.recipient_email} · {s.cadence} · {s.scope} · {s.format}</div>
                <div className="text-[10px] text-muted-foreground">Sonraki çalışma: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : '—'}</div>
              </div>
              <Badge variant={s.active ? 'default' : 'secondary'} className="text-[10px]">{s.active ? 'aktif' : 'pasif'}</Badge>
              {canWrite && (
                <Button size="icon" variant="ghost" onClick={() => removeSchedule(s.id)}><Trash2 className="h-4 w-4" /></Button>
              )}
            </div>
          ))}
          <p className="text-[10px] text-muted-foreground mt-2">Not: E-posta gönderimi için Resend bağlantısı gereklidir. Şu an kayıtlar oluşturulur; teslimat cron entegrasyonuyla etkinleşir.</p>
        </div>
      </Card>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function today() { return new Date().toISOString().slice(0, 10); }
function truncate(s: string, n = 60) { return s.length > n ? s.slice(0, n) + '…' : s; }
