import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search, Filter, Calendar, TrendingUp, TrendingDown, Minus,
  Building2, DollarSign, AlertTriangle, CheckCircle2, XCircle,
  Clock, ExternalLink, History, Sparkles,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

type Snapshot = {
  id: string;
  decision_id: string;
  company_state: string;
  financial_health: string | null;
  market_conditions: string | null;
  key_challenges: string | null;
  revenue: number | null;
  runway_months: number | null;
  team_size: number | null;
  recorded_at: string;
};

type Outcome = {
  id: string;
  decision_id: string;
  summary: string;
  outcome_status: string;
  impact_financial: number | null;
  impact_qualitative: string | null;
  lessons_learned: string | null;
  measured_at: string;
};

type Decision = {
  id: string;
  title: string;
  description: string | null;
  problem_statement: string | null;
  status: string | null;
  risk_level: string | null;
  budget: number | null;
  created_at: string;
  decision_context_snapshots: Snapshot[];
  decision_outcomes: Outcome[];
};

const OUTCOME_META: Record<string, { label: string; icon: any; className: string }> = {
  success: { label: 'Başarılı', icon: CheckCircle2, className: 'bg-success/10 text-success border-success/30' },
  partial: { label: 'Kısmi', icon: Minus, className: 'bg-warning/10 text-warning border-warning/30' },
  failure: { label: 'Başarısız', icon: XCircle, className: 'bg-destructive/10 text-destructive border-destructive/30' },
  pending: { label: 'Beklemede', icon: Clock, className: 'bg-muted text-muted-foreground border-border' },
};

export default function RetrospectivePage() {
  const { workspace } = useWorkspace();
  const [rows, setRows] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [risk, setRisk] = useState<string>('all');
  const [outcome, setOutcome] = useState<string>('all');
  const [financial, setFinancial] = useState<string>('all');

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('decisions')
        .select(`
          id, title, description, problem_statement, status, risk_level, budget, created_at,
          decision_context_snapshots(id, decision_id, company_state, financial_health, market_conditions, key_challenges, revenue, runway_months, team_size, recorded_at),
          decision_outcomes(id, decision_id, summary, outcome_status, impact_financial, impact_qualitative, lessons_learned, measured_at)
        `)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
      if (error) {
        toast({ title: 'Yüklenemedi', description: error.message, variant: 'destructive' });
      } else {
        setRows((data as any) ?? []);
      }
      setLoading(false);
    })();
  }, [workspace]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return rows.filter((d) => {
      const created = new Date(d.created_at);
      if (from && created < new Date(from)) return false;
      if (to && created > new Date(to + 'T23:59:59')) return false;
      if (risk !== 'all' && (d.risk_level ?? '').toLowerCase() !== risk) return false;

      const snap = d.decision_context_snapshots[0];
      const out = d.decision_outcomes[0];

      if (outcome !== 'all') {
        if (!out || out.outcome_status !== outcome) return false;
      }
      if (financial !== 'all') {
        if (!snap || (snap.financial_health ?? '').toLowerCase() !== financial) return false;
      }
      if (term) {
        const hay = [
          d.title, d.description, d.problem_statement,
          snap?.company_state, snap?.market_conditions, snap?.key_challenges,
          out?.summary, out?.lessons_learned, out?.impact_qualitative,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [rows, q, from, to, risk, outcome, financial]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const withOutcome = filtered.filter((d) => d.decision_outcomes.length > 0);
    const success = withOutcome.filter((d) => d.decision_outcomes[0].outcome_status === 'success').length;
    const failure = withOutcome.filter((d) => d.decision_outcomes[0].outcome_status === 'failure').length;
    const successRate = withOutcome.length ? Math.round((success / withOutcome.length) * 100) : 0;
    const netImpact = withOutcome.reduce((s, d) => s + (d.decision_outcomes[0].impact_financial ?? 0), 0);
    return { total, success, failure, successRate, netImpact, measured: withOutcome.length };
  }, [filtered]);

  const reset = () => { setQ(''); setFrom(''); setTo(''); setRisk('all'); setOutcome('all'); setFinancial('all'); };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="space-y-2">
        <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <History className="h-3.5 w-3.5" /> Retrospektif Arama
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Şirket geçmişinde bu karar alındı mı?</h1>
        <p className="text-muted-foreground max-w-3xl">
          Belirli bir dönemde alınan kararları, o dönem şirketin içinde bulunduğu durumu ve
          sonuçlarını birlikte gösterir. Filtrelere göre veya doğal dille arayın.
        </p>
      </header>

      {/* Search + filters */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Örn: fiyat artışı, yeni pazar, işten çıkarma, tedarikçi değişimi…"
              className="pl-10 h-11"
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Risk</Label>
              <Select value={risk} onValueChange={setRisk}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="low">Düşük</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="critical">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sonuç</Label>
              <Select value={outcome} onValueChange={setOutcome}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="success">Başarılı</SelectItem>
                  <SelectItem value="partial">Kısmi</SelectItem>
                  <SelectItem value="failure">Başarısız</SelectItem>
                  <SelectItem value="pending">Beklemede</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Finansal durum</Label>
              <Select value={financial} onValueChange={setFinancial}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="strong">Güçlü</SelectItem>
                  <SelectItem value="stable">İstikrarlı</SelectItem>
                  <SelectItem value="stressed">Zorlanan</SelectItem>
                  <SelectItem value="critical">Kritik</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={reset} className="w-full gap-2">
                <Filter className="h-4 w-4" /> Sıfırla
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Bulunan karar" value={stats.total.toString()} icon={History} />
        <StatCard label="Ölçülmüş sonuç" value={`${stats.measured}`} icon={CheckCircle2} />
        <StatCard label="Başarı oranı" value={`${stats.successRate}%`} icon={TrendingUp} />
        <StatCard
          label="Net finansal etki"
          value={new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(stats.netImpact)}
          icon={DollarSign}
          tone={stats.netImpact >= 0 ? 'success' : 'destructive'}
        />
      </div>

      {/* Results */}
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Sparkles className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                Bu filtrelerle eşleşen geçmiş karar bulunamadı. Farklı bir dönem veya anahtar kelime deneyin.
              </p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((d) => <RetroCard key={d.id} d={d} />)
        )}
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone = 'default',
}: { label: string; value: string; icon: any; tone?: 'default' | 'success' | 'destructive' }) {
  const toneCls =
    tone === 'success' ? 'text-success' : tone === 'destructive' ? 'text-destructive' : 'text-foreground';
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">{label}</div>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className={`text-2xl font-bold mt-2 ${toneCls}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function RetroCard({ d }: { d: Decision }) {
  const snap = d.decision_context_snapshots[0];
  const out = d.decision_outcomes[0];
  const meta = out ? OUTCOME_META[out.outcome_status] ?? OUTCOME_META.pending : null;
  const Icon = meta?.icon ?? Clock;

  const fmt = (n: number | null) =>
    n == null ? '—' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{d.title}</CardTitle>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(d.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              {d.risk_level && (
                <Badge variant="outline" className="text-[10px]">Risk: {d.risk_level}</Badge>
              )}
              {d.status && <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>}
              {d.budget != null && (
                <span className="inline-flex items-center gap-1">
                  <DollarSign className="h-3 w-3" /> {fmt(d.budget)}
                </span>
              )}
            </div>
          </div>
          <Link to={`/decisions/list/${d.id}`}>
            <Button size="sm" variant="ghost" className="gap-1">
              Detay <ExternalLink className="h-3 w-3" />
            </Button>
          </Link>
        </div>
        {d.problem_statement && (
          <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{d.problem_statement}</p>
        )}
      </CardHeader>

      <CardContent className="pt-0 grid md:grid-cols-2 gap-3">
        {/* Context */}
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            <Building2 className="h-3.5 w-3.5" /> Karar anındaki şirket durumu
          </div>
          {snap ? (
            <div className="space-y-2 text-sm">
              <Row label="Genel durum" value={snap.company_state} />
              <Row label="Finansal sağlık" value={snap.financial_health} />
              <Row label="Pazar koşulları" value={snap.market_conditions} />
              <Row label="Ana zorluklar" value={snap.key_challenges} />
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                <Mini label="Gelir" value={fmt(snap.revenue)} />
                <Mini label="Runway" value={snap.runway_months != null ? `${snap.runway_months} ay` : '—'} />
                <Mini label="Ekip" value={snap.team_size?.toString() ?? '—'} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Bu karar için bağlam snapshot'ı kaydedilmemiş.</p>
          )}
        </div>

        {/* Outcome */}
        <div className={`rounded-lg border p-4 ${out ? 'bg-card' : 'bg-muted/30 border-border'}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-3.5 w-3.5" /> Sonuç
            </div>
            {meta && (
              <Badge variant="outline" className={`gap-1 ${meta.className}`}>
                <Icon className="h-3 w-3" /> {meta.label}
              </Badge>
            )}
          </div>
          {out ? (
            <div className="space-y-2 text-sm">
              <Row label="Özet" value={out.summary} />
              <Row label="Nitel etki" value={out.impact_qualitative} />
              <Row
                label="Finansal etki"
                value={out.impact_financial != null ? fmt(out.impact_financial) : '—'}
                valueClass={
                  out.impact_financial == null ? '' :
                    out.impact_financial >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'
                }
              />
              {out.lessons_learned && (
                <div className="pt-2 border-t border-border/60">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Öğrenilen dersler
                  </div>
                  <p className="text-sm">{out.lessons_learned}</p>
                </div>
              )}
              <div className="text-[10px] text-muted-foreground pt-1">
                Ölçüm: {new Date(out.measured_at).toLocaleDateString('tr-TR')}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">Bu karar için henüz sonuç kaydedilmemiş.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, valueClass = '' }: { label: string; value: string | null | undefined; valueClass?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-sm ${valueClass}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}
