import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarRange, Filter, Building2, TrendingUp, TrendingDown, Minus,
  CheckCircle2, XCircle, Clock, ExternalLink, DollarSign, Activity,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from '@/hooks/use-toast';

type Row = {
  id: string;
  title: string;
  status: string | null;
  risk_level: string | null;
  budget: number | null;
  created_at: string;
  decision_context_snapshots: {
    financial_health: string | null;
    company_state: string | null;
    market_conditions: string | null;
    revenue: number | null;
    runway_months: number | null;
  }[];
  decision_outcomes: {
    outcome_status: string;
    impact_financial: number | null;
    summary: string;
  }[];
};

const FIN_META: Record<string, { label: string; color: string; ring: string; dot: string }> = {
  strong:   { label: 'Güçlü',       color: 'text-success',      ring: 'ring-success/40',      dot: 'bg-success' },
  stable:   { label: 'İstikrarlı',  color: 'text-primary',      ring: 'ring-primary/40',      dot: 'bg-primary' },
  stressed: { label: 'Zorlanan',    color: 'text-warning',      ring: 'ring-warning/40',      dot: 'bg-warning' },
  critical: { label: 'Kritik',      color: 'text-destructive',  ring: 'ring-destructive/40',  dot: 'bg-destructive' },
  unknown:  { label: 'Bilinmiyor',  color: 'text-muted-foreground', ring: 'ring-border',      dot: 'bg-muted-foreground' },
};

const OUTCOME_META: Record<string, { icon: any; className: string; label: string }> = {
  success: { icon: CheckCircle2, className: 'text-success',     label: 'Başarılı' },
  partial: { icon: Minus,        className: 'text-warning',     label: 'Kısmi' },
  failure: { icon: XCircle,      className: 'text-destructive', label: 'Başarısız' },
  pending: { icon: Clock,        className: 'text-muted-foreground', label: 'Beklemede' },
};

export default function DecisionTimelinePage() {
  const { workspace } = useWorkspace();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [financial, setFinancial] = useState('all');
  const [risk, setRisk] = useState('all');

  useEffect(() => {
    if (!workspace) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('decisions')
        .select(`
          id, title, status, risk_level, budget, created_at,
          decision_context_snapshots(financial_health, company_state, market_conditions, revenue, runway_months),
          decision_outcomes(outcome_status, impact_financial, summary)
        `)
        .eq('workspace_id', workspace.id)
        .order('created_at', { ascending: false });
      if (error) toast({ title: 'Yüklenemedi', description: error.message, variant: 'destructive' });
      else setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [workspace]);

  const filtered = useMemo(() => {
    return rows.filter((d) => {
      const c = new Date(d.created_at);
      if (from && c < new Date(from)) return false;
      if (to && c > new Date(to + 'T23:59:59')) return false;
      if (risk !== 'all' && (d.risk_level ?? '').toLowerCase() !== risk) return false;
      if (financial !== 'all') {
        const fh = (d.decision_context_snapshots[0]?.financial_health ?? '').toLowerCase();
        if (financial === 'unknown' ? fh !== '' : fh !== financial) return false;
      }
      return true;
    });
  }, [rows, from, to, financial, risk]);

  // Group by year → month
  const grouped = useMemo(() => {
    const byYear = new Map<number, Map<string, Row[]>>();
    for (const d of filtered) {
      const dt = new Date(d.created_at);
      const y = dt.getFullYear();
      const m = dt.toLocaleDateString('tr-TR', { month: 'long' });
      if (!byYear.has(y)) byYear.set(y, new Map());
      const months = byYear.get(y)!;
      if (!months.has(m)) months.set(m, []);
      months.get(m)!.push(d);
    }
    return Array.from(byYear.entries()).sort((a, b) => b[0] - a[0]);
  }, [filtered]);

  // Aggregate by month for a compact bar strip
  const monthlyStrip = useMemo(() => {
    const map = new Map<string, { key: string; label: string; count: number; financial: Record<string, number> }>();
    for (const d of filtered) {
      const dt = new Date(d.created_at);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: dt.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' }),
          count: 0,
          financial: {},
        });
      }
      const b = map.get(key)!;
      b.count += 1;
      const fh = d.decision_context_snapshots[0]?.financial_health ?? 'unknown';
      b.financial[fh] = (b.financial[fh] ?? 0) + 1;
    }
    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key));
  }, [filtered]);

  const maxCount = Math.max(1, ...monthlyStrip.map((m) => m.count));
  const reset = () => { setFrom(''); setTo(''); setFinancial('all'); setRisk('all'); };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <header className="space-y-2">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <CalendarRange className="h-3.5 w-3.5" /> Karar Zaman Çizelgesi
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Şirket dönemine göre kararlar</h1>
          <p className="text-muted-foreground max-w-3xl">
            Kararları alındıkları döneme ve şirketin o anki finansal durumuna göre görselleştirir.
            Renkler finansal sağlığı, işaretler sonucu gösterir.
          </p>
        </header>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Başlangıç</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Bitiş</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
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
                  <SelectItem value="unknown">Bilinmiyor</SelectItem>
                </SelectContent>
              </Select>
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
            <div className="flex items-end">
              <Button variant="outline" onClick={reset} className="w-full gap-2">
                <Filter className="h-4 w-4" /> Sıfırla
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Finansal durum:</span>
          {Object.entries(FIN_META).map(([k, m]) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} /> {m.label}
            </span>
          ))}
        </div>

        {/* Monthly strip */}
        {loading ? (
          <Skeleton className="h-32 w-full" />
        ) : monthlyStrip.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" /> Aylık karar yoğunluğu
                </div>
                <div className="text-xs text-muted-foreground">{filtered.length} karar</div>
              </div>
              <div className="flex items-end gap-1.5 h-32 overflow-x-auto pb-2">
                {monthlyStrip.map((m) => (
                  <Tooltip key={m.key}>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1 min-w-[36px]">
                        <div className="flex flex-col-reverse w-full h-24 rounded overflow-hidden border border-border/60 bg-muted/30">
                          {Object.entries(m.financial).map(([fh, n]) => {
                            const meta = FIN_META[fh] ?? FIN_META.unknown;
                            const h = (n / maxCount) * 100;
                            return (
                              <div
                                key={fh}
                                className={`${meta.dot} opacity-90`}
                                style={{ height: `${h}%` }}
                              />
                            );
                          })}
                        </div>
                        <div className="text-[9px] text-muted-foreground rotate-0 whitespace-nowrap">{m.label}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="font-medium mb-1">{m.label} — {m.count} karar</div>
                      {Object.entries(m.financial).map(([fh, n]) => (
                        <div key={fh}>{(FIN_META[fh] ?? FIN_META.unknown).label}: {n}</div>
                      ))}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vertical timeline */}
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : grouped.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center text-muted-foreground">
              Bu filtrelerle eşleşen karar bulunamadı.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {grouped.map(([year, months]) => (
              <section key={year}>
                <div className="sticky top-0 z-10 bg-background/90 backdrop-blur py-2 mb-3 flex items-center gap-3">
                  <div className="text-2xl font-bold tracking-tight">{year}</div>
                  <div className="h-px flex-1 bg-border" />
                  <div className="text-xs text-muted-foreground">
                    {Array.from(months.values()).reduce((s, arr) => s + arr.length, 0)} karar
                  </div>
                </div>
                <div className="relative pl-6">
                  <div className="absolute left-2 top-1 bottom-1 w-px bg-border" />
                  <div className="space-y-6">
                    {Array.from(months.entries()).map(([month, list]) => (
                      <div key={month}>
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3 -ml-6 pl-6">
                          {month}
                        </div>
                        <div className="space-y-3">
                          {list.map((d) => <TimelineItem key={d.id} d={d} />)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function TimelineItem({ d }: { d: Row }) {
  const snap = d.decision_context_snapshots[0];
  const out = d.decision_outcomes[0];
  const fh = snap?.financial_health ?? 'unknown';
  const finMeta = FIN_META[fh] ?? FIN_META.unknown;
  const outMeta = out ? OUTCOME_META[out.outcome_status] ?? OUTCOME_META.pending : null;
  const OutIcon = outMeta?.icon;

  const fmt = (n: number | null | undefined) =>
    n == null ? '—' : new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="relative">
      {/* Node */}
      <div className={`absolute -left-[19px] top-4 h-3 w-3 rounded-full ${finMeta.dot} ring-4 ${finMeta.ring} ring-offset-2 ring-offset-background`} />

      <Link
        to={`/decisions/list/${d.id}`}
        className="block group rounded-xl border border-border bg-card p-4 hover:border-primary/50 transition-colors"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1">
              <span>{new Date(d.created_at).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}</span>
              <span>•</span>
              <span className={finMeta.color}>{finMeta.label}</span>
              {snap?.company_state && (
                <>
                  <span>•</span>
                  <span className="truncate max-w-[220px]">{snap.company_state}</span>
                </>
              )}
            </div>
            <div className="font-semibold group-hover:text-primary transition-colors truncate">{d.title}</div>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              {d.status && <Badge variant="secondary" className="text-[10px]">{d.status}</Badge>}
              {d.risk_level && <Badge variant="outline" className="text-[10px]">Risk: {d.risk_level}</Badge>}
              {d.budget != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <DollarSign className="h-3 w-3" /> {fmt(d.budget)}
                </span>
              )}
              {snap?.runway_months != null && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {snap.runway_months} ay runway
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {outMeta && OutIcon && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={`inline-flex items-center gap-1 text-xs ${outMeta.className}`}>
                    <OutIcon className="h-4 w-4" />
                    {out?.impact_financial != null && (
                      <span className="font-medium">
                        {out.impact_financial >= 0 ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                        {' '}{fmt(out.impact_financial)}
                      </span>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left" className="max-w-xs text-xs">
                  <div className="font-medium mb-1">{outMeta.label}</div>
                  {out?.summary && <div className="text-muted-foreground">{out.summary}</div>}
                </TooltipContent>
              </Tooltip>
            )}
            <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </Link>
    </div>
  );
}
