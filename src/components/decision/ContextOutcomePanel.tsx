import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Building2, Target, Plus, TrendingUp, TrendingDown, Minus, CheckCircle2, XCircle, Clock, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';

const db = supabase as any;

const OUTCOME_STATUSES = [
  { value: 'success', label: 'Başarılı', icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/30' },
  { value: 'partial', label: 'Kısmi Başarı', icon: TrendingUp, color: 'text-amber-600 bg-amber-500/10 border-amber-500/30' },
  { value: 'failure', label: 'Başarısız', icon: XCircle, color: 'text-red-600 bg-red-500/10 border-red-500/30' },
  { value: 'ongoing', label: 'Devam ediyor', icon: Clock, color: 'text-blue-600 bg-blue-500/10 border-blue-500/30' },
  { value: 'unknown', label: 'Bilinmiyor', icon: HelpCircle, color: 'text-muted-foreground bg-muted border-border' },
] as const;

export default function ContextOutcomePanel({
  decisionId,
  workspaceId,
  canWrite,
}: {
  decisionId: string;
  workspaceId: string;
  canWrite: boolean;
}) {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [outcomes, setOutcomes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const [{ data: s }, { data: o }] = await Promise.all([
      db.from('decision_context_snapshots').select('*').eq('decision_id', decisionId).order('recorded_at', { ascending: false }),
      db.from('decision_outcomes').select('*').eq('decision_id', decisionId).order('measured_at', { ascending: false }),
    ]);
    setSnapshots(s ?? []);
    setOutcomes(o ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [decisionId]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Company context at decision time */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Karar Anındaki Şirket Durumu</h3>
          </div>
          {canWrite && <ContextDialog decisionId={decisionId} workspaceId={workspaceId} onSaved={load} />}
        </div>
        <p className="text-xs text-muted-foreground">Karar alınırken şirketin finansal, operasyonel ve pazar durumu. Zaman içindeki değişim izlenir.</p>
        {loading ? <Card><CardContent className="py-6 text-sm text-muted-foreground">Yükleniyor…</CardContent></Card>
          : snapshots.length === 0
            ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Henüz bağlam kaydı yok. {canWrite && '"Anlık görüntü ekle" ile başlayın.'}</CardContent></Card>
            : snapshots.map((s, i) => <SnapshotCard key={s.id} s={s} isLatest={i === 0} />)}
      </div>

      {/* Outcomes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">Kararın Sonuçları</h3>
          </div>
          {canWrite && <OutcomeDialog decisionId={decisionId} workspaceId={workspaceId} onSaved={load} />}
        </div>
        <p className="text-xs text-muted-foreground">Karar sonrası ölçülen etki: finansal, niteliksel, KPI değişimleri ve çıkarılan dersler.</p>
        {loading ? <Card><CardContent className="py-6 text-sm text-muted-foreground">Yükleniyor…</CardContent></Card>
          : outcomes.length === 0
            ? <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Henüz sonuç kaydı yok. {canWrite && '"Sonuç ekle" ile başlayın.'}</CardContent></Card>
            : outcomes.map((o, i) => <OutcomeCard key={o.id} o={o} isLatest={i === 0} />)}
      </div>
    </div>
  );
}

function SnapshotCard({ s, isLatest }: { s: any; isLatest: boolean }) {
  return (
    <Card className={isLatest ? 'border-primary/40' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{new Date(s.recorded_at).toLocaleString('tr-TR')}</CardTitle>
          {isLatest && <Badge variant="secondary" className="text-[10px]">EN GÜNCEL</Badge>}
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p><span className="text-muted-foreground">Durum:</span> {s.company_state}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {s.financial_health && <div><span className="text-muted-foreground">Finansal:</span> {s.financial_health}</div>}
          {s.team_size != null && <div><span className="text-muted-foreground">Ekip:</span> {s.team_size}</div>}
          {s.revenue != null && <div><span className="text-muted-foreground">Gelir:</span> €{Number(s.revenue).toLocaleString('tr-TR')}</div>}
          {s.runway_months != null && <div><span className="text-muted-foreground">Runway:</span> {s.runway_months} ay</div>}
        </div>
        {s.market_conditions && <p className="text-xs"><span className="text-muted-foreground">Pazar:</span> {s.market_conditions}</p>}
        {s.key_challenges && <p className="text-xs"><span className="text-muted-foreground">Zorluklar:</span> {s.key_challenges}</p>}
      </CardContent>
    </Card>
  );
}

function OutcomeCard({ o, isLatest }: { o: any; isLatest: boolean }) {
  const cfg = OUTCOME_STATUSES.find(x => x.value === o.outcome_status) ?? OUTCOME_STATUSES[4];
  const Icon = cfg.icon;
  const impact = o.impact_financial;
  const ImpactIcon = impact == null ? Minus : impact > 0 ? TrendingUp : impact < 0 ? TrendingDown : Minus;
  return (
    <Card className={isLatest ? 'border-primary/40' : ''}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge className={`${cfg.color} border`}><Icon className="h-3 w-3 mr-1" />{cfg.label}</Badge>
            {isLatest && <Badge variant="secondary" className="text-[10px]">EN GÜNCEL</Badge>}
          </div>
          <span className="text-xs text-muted-foreground">{new Date(o.measured_at).toLocaleDateString('tr-TR')}</span>
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p>{o.summary}</p>
        {impact != null && (
          <div className="flex items-center gap-1.5 text-xs">
            <ImpactIcon className={`h-3.5 w-3.5 ${impact > 0 ? 'text-emerald-600' : impact < 0 ? 'text-red-600' : ''}`} />
            <span className="text-muted-foreground">Finansal etki:</span>
            <span className="font-medium">€{Number(impact).toLocaleString('tr-TR')}</span>
          </div>
        )}
        {o.impact_qualitative && <p className="text-xs text-muted-foreground">{o.impact_qualitative}</p>}
        {o.lessons_learned && (
          <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/5 p-2 text-xs">
            <p className="font-medium text-amber-700 mb-0.5">Çıkarılan ders</p>
            <p>{o.lessons_learned}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ContextDialog({ decisionId, workspaceId, onSaved }: { decisionId: string; workspaceId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ company_state: '', financial_health: '', team_size: '', revenue: '', runway_months: '', key_challenges: '', market_conditions: '' });

  async function save() {
    if (!f.company_state.trim()) return toast.error('Şirket durumu zorunlu');
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('decision_context_snapshots').insert({
      workspace_id: workspaceId,
      decision_id: decisionId,
      company_state: f.company_state,
      financial_health: f.financial_health || null,
      team_size: f.team_size ? Number(f.team_size) : null,
      revenue: f.revenue ? Number(f.revenue) : null,
      runway_months: f.runway_months ? Number(f.runway_months) : null,
      key_challenges: f.key_challenges || null,
      market_conditions: f.market_conditions || null,
      recorded_by: u.user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Bağlam kaydedildi');
    setOpen(false);
    setF({ company_state: '', financial_health: '', team_size: '', revenue: '', runway_months: '', key_challenges: '', market_conditions: '' });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Anlık görüntü ekle</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Şirket Durumu Anlık Görüntüsü</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Şirket durumu özeti *</Label><Textarea rows={2} value={f.company_state} onChange={e => setF({ ...f, company_state: e.target.value })} placeholder="Ör: Büyüme aşamasında, Seri A sonrası..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Finansal sağlık</Label><Input value={f.financial_health} onChange={e => setF({ ...f, financial_health: e.target.value })} placeholder="İyi / Zayıf / Karlı" /></div>
            <div><Label>Ekip büyüklüğü</Label><Input type="number" value={f.team_size} onChange={e => setF({ ...f, team_size: e.target.value })} /></div>
            <div><Label>Gelir (€)</Label><Input type="number" value={f.revenue} onChange={e => setF({ ...f, revenue: e.target.value })} /></div>
            <div><Label>Runway (ay)</Label><Input type="number" value={f.runway_months} onChange={e => setF({ ...f, runway_months: e.target.value })} /></div>
          </div>
          <div><Label>Pazar koşulları</Label><Textarea rows={2} value={f.market_conditions} onChange={e => setF({ ...f, market_conditions: e.target.value })} /></div>
          <div><Label>Ana zorluklar</Label><Textarea rows={2} value={f.key_challenges} onChange={e => setF({ ...f, key_challenges: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OutcomeDialog({ decisionId, workspaceId, onSaved }: { decisionId: string; workspaceId: string; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ outcome_status: 'ongoing', summary: '', impact_financial: '', impact_qualitative: '', lessons_learned: '' });

  async function save() {
    if (!f.summary.trim()) return toast.error('Özet zorunlu');
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await db.from('decision_outcomes').insert({
      workspace_id: workspaceId,
      decision_id: decisionId,
      outcome_status: f.outcome_status,
      summary: f.summary,
      impact_financial: f.impact_financial ? Number(f.impact_financial) : null,
      impact_qualitative: f.impact_qualitative || null,
      lessons_learned: f.lessons_learned || null,
      recorded_by: u.user?.id,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Sonuç kaydedildi');
    setOpen(false);
    setF({ outcome_status: 'ongoing', summary: '', impact_financial: '', impact_qualitative: '', lessons_learned: '' });
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1" />Sonuç ekle</Button></DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Karar Sonucu Kaydı</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div><Label>Durum *</Label>
            <Select value={f.outcome_status} onValueChange={v => setF({ ...f, outcome_status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{OUTCOME_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Özet *</Label><Textarea rows={2} value={f.summary} onChange={e => setF({ ...f, summary: e.target.value })} placeholder="Ne oldu, sonuç nedir?" /></div>
          <div><Label>Finansal etki (€, negatif de olabilir)</Label><Input type="number" value={f.impact_financial} onChange={e => setF({ ...f, impact_financial: e.target.value })} /></div>
          <div><Label>Niteliksel etki</Label><Textarea rows={2} value={f.impact_qualitative} onChange={e => setF({ ...f, impact_qualitative: e.target.value })} placeholder="Marka, moral, operasyon..." /></div>
          <div><Label>Çıkarılan dersler</Label><Textarea rows={2} value={f.lessons_learned} onChange={e => setF({ ...f, lessons_learned: e.target.value })} /></div>
        </div>
        <DialogFooter><Button onClick={save} disabled={saving}>{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
