import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ArrowLeft, Lock, Save, Trash2, Plus, History, FileText, ShieldCheck, Sparkles, TrendingUp, TrendingDown, Minus, Loader2, Gauge, Globe2, AlertTriangle, Lightbulb, Activity } from 'lucide-react';
import { toast } from 'sonner';
import ContextOutcomePanel from '@/components/decision/ContextOutcomePanel';

const db = supabase as any;
const STATUSES = ['Draft', 'Pending', 'Under Review', 'Approved', 'Rejected', 'Escalated', 'Executed'] as const;
const RISKS = ['Low', 'Medium', 'High', 'Critical'] as const;

export default function DecisionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { workspace } = useWorkspace();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [decision, setDecision] = useState<any>(null);
  const [evidence, setEvidence] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]);
  const [macros, setMacros] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Map<string, any>>(new Map());
  const [assessing, setAssessing] = useState(false);
  const [macroAssessing, setMacroAssessing] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', problem_statement: '', budget: 0, risk_level: 'Medium', status: 'Draft',
  });

  const locked = useMemo(
    () => decision && (decision.status === 'Approved' || decision.status === 'Executed'),
    [decision]
  );

  async function load() {
    if (!id || !workspace) return;
    setLoading(true);
    const [{ data: d }, { data: ev }, { data: hist }, { data: ras }, { data: macAll }] = await Promise.all([
      db.from('decisions').select('*').eq('id', id).maybeSingle(),
      db.from('decision_evidence').select('*').eq('decision_id', id).order('created_at', { ascending: false }),
      db.from('decision_history').select('*').eq('decision_id', id).order('created_at', { ascending: false }),
      db.from('decision_risk_assessments').select('*').eq('decision_id', id).order('created_at', { ascending: false }),
      db.from('decision_macro_assessments').select('*').eq('decision_id', id).order('created_at', { ascending: false }),
    ]);
    if (!d) { setLoading(false); return; }
    setDecision(d);
    setEvidence(ev ?? []);
    setHistory(hist ?? []);
    setAssessments(ras ?? []);
    setMacros(macAll ?? []);
    setForm({
      title: d.title ?? '', description: d.description ?? '', problem_statement: d.problem_statement ?? '',
      budget: Number(d.budget ?? 0), risk_level: d.risk_level ?? 'Medium', status: d.status ?? 'Draft',
    });
    const ids = new Set<string>([d.created_by, ...(hist ?? []).map((h: any) => h.changed_by).filter(Boolean), ...(ras ?? []).map((r: any) => r.triggered_by).filter(Boolean), ...(macAll ?? []).map((r: any) => r.triggered_by).filter(Boolean)]);
    const { data: pr } = await db.from('profiles').select('user_id, display_name').in('user_id', Array.from(ids));
    setProfiles(new Map((pr ?? []).map((p: any) => [p.user_id, p])));
    setLoading(false);
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id, workspace?.id]);

  async function save() {
    if (!id) return;
    setSaving(true);
    const { error } = await db.from('decisions').update({
      title: form.title,
      description: form.description,
      problem_statement: form.problem_statement,
      budget: Number(form.budget) || 0,
      risk_level: form.risk_level,
      status: form.status,
    }).eq('id', id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Karar güncellendi');
    await load();
    // Trigger AI risk re-assessment after edits (non-blocking)
    runRiskAssessment('field_updated');
  }

  async function remove() {
    if (!id) return;
    const { error } = await db.from('decisions').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Karar silindi');
    nav('/decisions/list');
  }

  async function runRiskAssessment(reason: string = 'manual') {
    if (!id) return;
    setAssessing(true);
    const { data, error } = await supabase.functions.invoke('decision-risk-assess', {
      body: { decision_id: id, trigger_reason: reason },
    });
    setAssessing(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Risk değerlendirmesi başarısız');
      return;
    }
    toast.success('AI risk değerlendirmesi kayıt altına alındı');
    load();
  }

  async function runMacroAssessment(reason: string = 'manual') {
    if (!id) return;
    setMacroAssessing(true);
    const { data, error } = await supabase.functions.invoke('decision-macro-assess', {
      body: { decision_id: id, trigger_reason: reason },
    });
    setMacroAssessing(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || 'Makro değerlendirme başarısız');
      return;
    }
    toast.success('Makro/jeopolitik değerlendirme kaydedildi');
    load();
  }

  if (loading) return <div className="p-6 space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  if (!decision) return <div className="p-6"><p className="text-muted-foreground">Karar bulunamadı.</p><Link to="/decisions/list" className="text-primary text-sm">← Geri</Link></div>;

  const latest = assessments[0];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild><Link to="/decisions/list"><ArrowLeft className="h-4 w-4 mr-1" />Kararlar</Link></Button>
        {locked && (
          <Badge variant="outline" className="bg-amber-500/10 text-amber-700 border-amber-500/40">
            <Lock className="h-3 w-3 mr-1" /> Kilitli (immutable)
          </Badge>
        )}
      </div>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{decision.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {profiles.get(decision.created_by)?.display_name ?? 'Bilinmiyor'} · {new Date(decision.created_at).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={saving || locked}><Save className="h-4 w-4 mr-2" />{saving ? 'Kaydediliyor…' : 'Kaydet'}</Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" disabled={locked}><Trash2 className="h-4 w-4" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Kararı sil?</AlertDialogTitle>
                <AlertDialogDescription>Bu işlem geri alınamaz. Tüm bağlı yorum, kanıt ve geçmiş kayıtları silinir.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Vazgeç</AlertDialogCancel>
                <AlertDialogAction onClick={remove}>Sil</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <RiskSummaryCard latest={latest} count={assessments.length} onRun={() => runRiskAssessment('manual')} assessing={assessing} />

      {locked && (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-4 flex gap-3 items-start">
            <ShieldCheck className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Bu karar kilitli.</p>
              <p className="text-muted-foreground">Approved/Executed durumundaki kararlar veritabanı seviyesinde değiştirilemez. Yalnızca <strong>Approved → Executed</strong> geçişi yapılabilir.</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Detaylar</TabsTrigger>
          <TabsTrigger value="risk"><Gauge className="h-3.5 w-3.5 mr-1" />AI Risk ({assessments.length})</TabsTrigger>
          <TabsTrigger value="macro"><Globe2 className="h-3.5 w-3.5 mr-1" />Makro & Jeopolitik ({macros.length})</TabsTrigger>
          <TabsTrigger value="sources"><FileText className="h-3.5 w-3.5 mr-1" />Kaynaklar ({evidence.length})</TabsTrigger>
          <TabsTrigger value="history"><History className="h-3.5 w-3.5 mr-1" />Geçmiş ({history.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div><Label>Başlık</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={locked} /></div>
            <div><Label>Açıklama</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={locked} /></div>
            <div><Label>Problem ifadesi</Label><Textarea value={form.problem_statement} onChange={(e) => setForm({ ...form, problem_statement: e.target.value })} disabled={locked} rows={2} /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>Bütçe (€)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: Number(e.target.value) })} disabled={locked} /></div>
              <div><Label>Risk</Label>
                <Select value={form.risk_level} onValueChange={(v) => setForm({ ...form, risk_level: v })} disabled={locked}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RISKS.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Durum</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Her değerlendirme append-only olarak saklanır — düzenlenemez, silinemez. Tam denetim izi.
            </p>
            <Button size="sm" onClick={() => runRiskAssessment('manual')} disabled={assessing}>
              {assessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Değerlendiriliyor…</> : <><Sparkles className="h-4 w-4 mr-2" />Yeniden Değerlendir</>}
            </Button>
          </div>
          {assessments.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Henüz AI değerlendirmesi yok. "Yeniden Değerlendir" ile ilkini oluştur.
            </CardContent></Card>
          )}
          {assessments.map((a, idx) => (
            <AssessmentCard key={a.id} a={a} isLatest={idx === 0} author={profiles.get(a.triggered_by)?.display_name} />
          ))}
        </TabsContent>

        <TabsContent value="macro" className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Sektör, ulusal + küresel ekonomi, savaş / yaptırım / enerji / enflasyon / kur gibi makro etkenlerin bu karara etkisi. Append-only.
            </p>
            <Button size="sm" onClick={() => runMacroAssessment('manual')} disabled={macroAssessing}>
              {macroAssessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analiz ediliyor…</> : <><Globe2 className="h-4 w-4 mr-2" />Makro değerlendirme al</>}
            </Button>
          </div>
          {macros.length === 0 && (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
              Henüz makro değerlendirme yok. "Makro değerlendirme al" ile ilkini oluştur.
            </CardContent></Card>
          )}
          {macros.map((m, idx) => (
            <MacroCard key={m.id} m={m} isLatest={idx === 0} author={profiles.get(m.triggered_by)?.display_name} />
          ))}
        </TabsContent>


        <TabsContent value="sources" className="mt-4">
          <EvidencePanel decisionId={decision.id} workspaceId={decision.workspace_id} evidence={evidence} onChange={load} />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-2">
          {history.length === 0 && <p className="text-sm text-muted-foreground">Henüz kayıt yok.</p>}
          {history.map((h) => (
            <Card key={h.id}>
              <CardContent className="py-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{h.change_type}</Badge>
                    {h.field_name && <span className="font-mono text-xs text-muted-foreground">{h.field_name}</span>}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {profiles.get(h.changed_by)?.display_name ?? '—'} · {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
                {h.note && <p className="mt-1 text-muted-foreground">{h.note}</p>}
                {(h.old_value || h.new_value) && (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded bg-destructive/5 border border-destructive/20 p-2">
                      <p className="text-[10px] uppercase text-destructive mb-0.5">Önceki</p>
                      <p className="font-mono break-words">{formatVal(h.old_value)}</p>
                    </div>
                    <div className="rounded bg-emerald-500/5 border border-emerald-500/20 p-2">
                      <p className="text-[10px] uppercase text-emerald-700 mb-0.5">Yeni</p>
                      <p className="font-mono break-words">{formatVal(h.new_value)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function riskColor(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'critical') return 'bg-red-500/10 text-red-700 border-red-500/40';
  if (l === 'high') return 'bg-orange-500/10 text-orange-700 border-orange-500/40';
  if (l === 'medium') return 'bg-amber-500/10 text-amber-700 border-amber-500/40';
  return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40';
}

function RiskSummaryCard({ latest, count, onRun, assessing }: { latest: any; count: number; onRun: () => void; assessing: boolean }) {
  if (!latest) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-4 flex items-center justify-between gap-4">
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <Gauge className="h-4 w-4" /> Bu karar henüz AI tarafından risk açısından değerlendirilmedi.
          </div>
          <Button size="sm" onClick={onRun} disabled={assessing}>
            {assessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Değerlendiriliyor…</> : <><Sparkles className="h-4 w-4 mr-2" />İlk değerlendirmeyi al</>}
          </Button>
        </CardContent>
      </Card>
    );
  }
  const delta = latest.score_delta;
  const deltaIcon = delta == null ? <Minus className="h-3.5 w-3.5" /> : delta > 0 ? <TrendingUp className="h-3.5 w-3.5" /> : delta < 0 ? <TrendingDown className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />;
  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold tabular-nums">{Number(latest.risk_score).toFixed(0)}</div>
              <div className="text-[10px] uppercase text-muted-foreground">/100 risk</div>
            </div>
            <div>
              <Badge variant="outline" className={riskColor(latest.risk_level)}>{latest.risk_level}</Badge>
              {latest.confidence != null && <span className="ml-2 text-xs text-muted-foreground">Güven: {Number(latest.confidence).toFixed(0)}%</span>}
              {latest.verdict && <p className="text-sm font-medium mt-1">{latest.verdict}</p>}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            {delta != null && (
              <Badge variant="outline" className={delta > 0 ? 'text-red-700 border-red-500/40' : delta < 0 ? 'text-emerald-700 border-emerald-500/40' : ''}>
                {deltaIcon}<span className="ml-1">{delta > 0 ? '+' : ''}{Number(delta).toFixed(0)} vs önceki</span>
              </Badge>
            )}
            <span className="text-[11px] text-muted-foreground">{count} kayıt</span>
            <Button size="sm" variant="outline" onClick={onRun} disabled={assessing}>
              {assessing ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />…</> : <><Sparkles className="h-3.5 w-3.5 mr-1" />Yeniden değerlendir</>}
            </Button>
          </div>
        </div>
        {latest.comparison_note && (
          <div className="text-xs bg-muted/50 rounded p-2 border">
            <span className="font-semibold">Karşılaştırma:</span> {latest.comparison_note}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AssessmentCard({ a, isLatest, author }: { a: any; isLatest: boolean; author?: string }) {
  const delta = a.score_delta;
  return (
    <Card className={isLatest ? 'border-primary/40' : ''}>
      <CardContent className="py-3 space-y-2">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tabular-nums">{Number(a.risk_score).toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></span>
            <Badge variant="outline" className={riskColor(a.risk_level)}>{a.risk_level}</Badge>
            {isLatest && <Badge variant="secondary" className="text-[10px]">En güncel</Badge>}
            {a.previous_score != null && (
              <span className="text-xs text-muted-foreground">
                Önceden %{Number(a.previous_score).toFixed(0)} → şimdi %{Number(a.risk_score).toFixed(0)}
                {delta != null && (
                  <span className={delta > 0 ? 'text-red-600 ml-1' : delta < 0 ? 'text-emerald-600 ml-1' : 'ml-1'}>
                    ({delta > 0 ? '+' : ''}{Number(delta).toFixed(0)})
                  </span>
                )}
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {author ?? 'AI'} · {new Date(a.created_at).toLocaleString('tr-TR')} · {a.trigger_reason}
          </span>
        </div>
        {a.verdict && <p className="text-sm font-medium">{a.verdict}</p>}
        <p className="text-sm text-muted-foreground">{a.commentary}</p>
        {a.comparison_note && (
          <p className="text-xs bg-muted/40 border rounded p-2"><span className="font-semibold">Karşılaştırma:</span> {a.comparison_note}</p>
        )}
      </CardContent>
    </Card>
  );
}

function formatVal(v: any) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'string') return v;
  return JSON.stringify(v);
}

function EvidencePanel({ decisionId, workspaceId, evidence, onChange }: { decisionId: string; workspaceId: string; evidence: any[]; onChange: () => void }) {
  const [form, setForm] = useState({ source: '', summary: '', owner: '', reliability: 'medium', supports: '' });
  const [adding, setAdding] = useState(false);

  async function add() {
    if (!form.source.trim()) return;
    setAdding(true);
    const { error } = await db.from('decision_evidence').insert({
      workspace_id: workspaceId, decision_id: decisionId,
      source: form.source, summary: form.summary, owner: form.owner || null,
      reliability: form.reliability, supports: form.supports || null,
    });
    setAdding(false);
    if (error) return toast.error(error.message);
    toast.success('Kaynak eklendi');
    setForm({ source: '', summary: '', owner: '', reliability: 'medium', supports: '' });
    onChange();
  }

  async function del(id: string) {
    const { error } = await db.from('decision_evidence').delete().eq('id', id);
    if (error) return toast.error(error.message);
    onChange();
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Plus className="h-4 w-4" />Yeni kaynak</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Input placeholder="Kaynak (belge, URL, kişi, sistem)" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
          <Textarea placeholder="Özet / kanıt içeriği" rows={2} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
          <div className="grid grid-cols-3 gap-2">
            <Input placeholder="Sahip" value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} />
            <Select value={form.reliability} onValueChange={(v) => setForm({ ...form, reliability: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="high">Yüksek güvenilirlik</SelectItem>
                <SelectItem value="medium">Orta</SelectItem>
                <SelectItem value="low">Düşük</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Neyi destekliyor?" value={form.supports} onChange={(e) => setForm({ ...form, supports: e.target.value })} />
          </div>
          <Button onClick={add} disabled={adding || !form.source.trim()} size="sm"><Plus className="h-4 w-4 mr-1" />Ekle</Button>
        </CardContent>
      </Card>

      {evidence.length === 0 && <p className="text-sm text-muted-foreground">Henüz kaynak yok.</p>}
      {evidence.map((e) => (
        <Card key={e.id}>
          <CardContent className="py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium">{e.source}</p>
                <Badge variant="outline">{e.reliability ?? 'medium'}</Badge>
                {e.is_verified && <Badge variant="secondary">verified</Badge>}
              </div>
              {e.summary && <p className="text-sm text-muted-foreground mt-1">{e.summary}</p>}
              <p className="text-xs text-muted-foreground mt-1">{e.owner ?? '—'} · {new Date(e.created_at).toLocaleDateString()}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => del(e.id)}><Trash2 className="h-4 w-4" /></Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function macroColor(level?: string) {
  const l = (level || '').toLowerCase();
  if (l === 'unfavorable') return 'bg-red-500/10 text-red-700 border-red-500/40';
  if (l === 'cautious') return 'bg-orange-500/10 text-orange-700 border-orange-500/40';
  if (l === 'supportive' || l === 'favorable') return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/40';
  return 'bg-muted text-muted-foreground border-border';
}

function outlookBadge(o?: string) {
  const s = (o || '').toLowerCase();
  if (s === 'positive') return { cls: 'text-emerald-700 border-emerald-500/40', label: 'Pozitif görünüm' };
  if (s === 'negative') return { cls: 'text-red-700 border-red-500/40', label: 'Negatif görünüm' };
  if (s === 'mixed') return { cls: 'text-amber-700 border-amber-500/40', label: 'Karışık görünüm' };
  return { cls: '', label: 'Stabil görünüm' };
}

function MacroCard({ m, isLatest, author }: { m: any; isLatest: boolean; author?: string }) {
  const ob = outlookBadge(m.outlook);
  const ind = m.indicators || {};
  const risks: any[] = Array.isArray(m.risks) ? m.risks : [];
  const opps: any[] = Array.isArray(m.opportunities) ? m.opportunities : [];
  const sources: any[] = Array.isArray(m.sources) ? m.sources : [];
  return (
    <Card className={isLatest ? 'border-primary/40' : ''}>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {m.macro_score != null && (
              <div className="text-center">
                <div className="text-2xl font-bold tabular-nums">{Number(m.macro_score).toFixed(0)}</div>
                <div className="text-[10px] uppercase text-muted-foreground">/100 makro</div>
              </div>
            )}
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                {m.macro_level && <Badge variant="outline" className={macroColor(m.macro_level)}>{m.macro_level}</Badge>}
                <Badge variant="outline" className={ob.cls}>{ob.label}</Badge>
                {isLatest && <Badge variant="secondary" className="text-[10px]">En güncel</Badge>}
                {m.sector && <Badge variant="secondary" className="text-[10px]">{m.sector}</Badge>}
              </div>
              {m.headline && <p className="text-sm font-medium mt-1">{m.headline}</p>}
              {Array.isArray(m.geographies) && m.geographies.length > 0 && (
                <p className="text-xs text-muted-foreground mt-1">🌍 {m.geographies.join(', ')}</p>
              )}
            </div>
          </div>
          <span className="text-[11px] text-muted-foreground text-right">
            {author ?? 'AI'} · {new Date(m.created_at).toLocaleString('tr-TR')}<br />
            {m.trigger_reason}
          </span>
        </div>

        {m.commentary && <p className="text-sm text-muted-foreground">{m.commentary}</p>}

        {m.geopolitical_notes && (
          <div className="text-xs bg-amber-500/5 border border-amber-500/30 rounded p-2">
            <span className="font-semibold">Jeopolitik:</span> {m.geopolitical_notes}
          </div>
        )}

        {Object.keys(ind).length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {Object.entries(ind).map(([k, v]) => (
              <div key={k} className="rounded border p-2 bg-muted/30">
                <p className="text-[10px] uppercase text-muted-foreground">{k.replace(/_/g, ' ')}</p>
                <p>{String(v)}</p>
              </div>
            ))}
          </div>
        )}

        {(risks.length > 0 || opps.length > 0) && (
          <div className="grid sm:grid-cols-2 gap-3">
            {risks.length > 0 && (
              <div>
                <p className="text-xs font-semibold flex items-center gap-1 mb-1"><AlertTriangle className="h-3 w-3 text-red-600" />Riskler</p>
                <ul className="space-y-1">
                  {risks.map((r, i) => (
                    <li key={i} className="text-xs rounded border bg-red-500/5 border-red-500/20 p-2">
                      <span className="font-medium">{r.title}</span>
                      {r.severity && <Badge variant="outline" className="ml-1 text-[9px] py-0">{r.severity}</Badge>}
                      {r.detail && <p className="text-muted-foreground mt-0.5">{r.detail}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {opps.length > 0 && (
              <div>
                <p className="text-xs font-semibold flex items-center gap-1 mb-1"><Lightbulb className="h-3 w-3 text-emerald-600" />Fırsatlar</p>
                <ul className="space-y-1">
                  {opps.map((r, i) => (
                    <li key={i} className="text-xs rounded border bg-emerald-500/5 border-emerald-500/20 p-2">
                      <span className="font-medium">{r.title}</span>
                      {r.detail && <p className="text-muted-foreground mt-0.5">{r.detail}</p>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {sources.length > 0 && (
          <p className="text-[11px] text-muted-foreground">Referans alanları: {sources.map((s: any) => typeof s === 'string' ? s : (s?.title || '')).filter(Boolean).join(' · ')}</p>
        )}
      </CardContent>
    </Card>
  );
}
