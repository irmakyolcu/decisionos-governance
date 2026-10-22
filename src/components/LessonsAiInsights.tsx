import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage, translate } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Loader2, AlertTriangle, Target, Compass, Tag, Briefcase, CalendarCheck, Download } from 'lucide-react';
import type { Lesson } from '@/hooks/useLessons';
import { toast } from 'sonner';

type Insights = {
  executive_summary?: string;
  health_score?: number;
  gaps?: { area: string; severity: string; description: string; evidence?: string }[];
  recommendations?: { type: 'action' | 'strategy' | 'pricing'; title: string; detail: string; counterfactual?: string; expected_impact?: string; priority?: string }[];
  next_30_days?: string[];
};

const CACHE = 'mem:lessons:ai-insights';

export default function LessonsAiInsights({ lessons }: { lessons: Lesson[] }) {
  const { lang, locale } = useLanguage();
  const tr = lang !== 'en';
  const t = (trS: string, enS: string) => (tr ? trS : enS);
  const [data, setData] = useState<{ insights: Insights; generated_at: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(CACHE) || 'null'); } catch { return null; }
  });
  const [loading, setLoading] = useState(false);

  async function run() {
    if (lessons.length === 0) return toast.error(t('Önce en az bir ders ekleyin', 'Add at least one lesson first'));
    setLoading(true);
    const { data: res, error } = await supabase.functions.invoke('lessons-insights', { body: { lessons, language: tr ? 'tr' : 'en' } });
    setLoading(false);
    if (error || !res?.ok) {
      const code = res?.error;
      toast.error(code === 'rate_limited' ? t('Çok fazla istek, biraz sonra deneyin', 'Too many requests, try again shortly')
        : code === 'credits_exhausted' ? t('AI kredisi bitti', 'AI credits exhausted')
        : t('AI analizi başarısız oldu', 'AI analysis failed'));
      return;
    }
    const next = { insights: res.insights, generated_at: res.generated_at };
    setData(next); localStorage.setItem(CACHE, JSON.stringify(next));
  }

  const ins = data?.insights;
  const recs = ins?.recommendations || [];
  const groups: { key: 'action' | 'strategy' | 'pricing'; label: string; icon: any }[] = [
    { key: 'action', label: t('Aksiyon', 'Action'), icon: Target },
    { key: 'strategy', label: t('Strateji', 'Strategy'), icon: Compass },
    { key: 'pricing', label: t('Fiyat', 'Pricing'), icon: Tag },
  ];

  function downloadReport() {
    if (!data) return;
    const w = window.open('', '_blank');
    if (!w) return toast.error(t('Açılır pencere engellendi', 'Popup blocked'));
    const esc = (v: unknown) => String(v ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);
    const i = data.insights;
    const recHtml = groups.map((g) => `<h3>${esc(g.label)}</h3>` + (i.recommendations || []).filter((r) => r.type === g.key).map((r) =>
      `<div class="card"><b>${esc(r.title)}</b>${r.priority ? ` <span class="tag">${esc(translate(r.priority))}</span>` : ''}<p>${esc(r.detail)}</p>${r.counterfactual ? `<p class="cf">“${esc(r.counterfactual)}”</p>` : ''}${r.expected_impact ? `<p class="muted">${esc(t('Beklenen etki', 'Expected impact'))}: ${esc(r.expected_impact)}</p>` : ''}</div>`).join('')).join('');
    const html = `<!doctype html><html lang="${tr ? 'tr' : 'en'}"><head><meta charset="utf-8"><title>${esc(t('Yönetici Raporu – Çıkarılan Dersler', 'Executive Report – Lessons Learned'))}</title>
<style>@page{size:A4;margin:14mm}body{font-family:Georgia,'Times New Roman',serif;color:#111827;line-height:1.5;max-width:800px;margin:auto;padding:24px}
h1{font-size:24px;margin:0}h2{font-size:17px;border-bottom:2px solid #312e81;padding-bottom:4px;margin-top:28px;color:#312e81}h3{font-size:14px;margin:16px 0 6px}
.muted{color:#6b7280;font-size:12px}.box{background:#eef2ff;border:1px solid #c7d2fe;padding:14px;border-radius:6px}.card{border:1px solid #e5e7eb;border-radius:6px;padding:10px;margin-bottom:8px;break-inside:avoid}
.card p{margin:4px 0;font-size:13px}.cf{font-style:italic;background:#f3f4f6;padding:6px;border-radius:4px}.tag{font-size:11px;border:1px solid #9ca3af;border-radius:10px;padding:1px 7px}
*{-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head><body>
<p class="muted">DecisionOS · ${esc(new Date(data.generated_at).toLocaleString(locale))} · ${lessons.length} ${esc(t('ders', 'lessons'))}</p>
<h1>${esc(t('Yönetici Raporu: Çıkarılan Dersler', 'Executive Report: Lessons Learned'))}</h1>
<h2>${esc(t('Yönetici Özeti', 'Executive Summary'))}</h2><div class="box">${typeof i.health_score === 'number' ? `<p><b>${esc(t('Sağlık skoru', 'Health score'))}: ${i.health_score}/100</b></p>` : ''}<p>${esc(i.executive_summary)}</p></div>
<h2>${esc(t('Şirketin eksik olduğu alanlar', 'Where the company falls short'))}</h2>${(i.gaps || []).map((g) => `<div class="card"><b>${esc(g.area)}</b> <span class="tag">${esc(translate(g.severity))}</span><p>${esc(g.description)}</p>${g.evidence ? `<p class="muted">${esc(g.evidence)}</p>` : ''}</div>`).join('')}
<h2>${esc(t('Öneriler', 'Recommendations'))}</h2>${recHtml}
${i.next_30_days?.length ? `<h2>${esc(t('Önümüzdeki 30 gün', 'Next 30 days'))}</h2><ul>${i.next_30_days.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
<p class="muted" style="margin-top:28px">${esc(t('AI önerileri tavsiye niteliğindedir; son karar yöneticiye aittir.', 'AI recommendations are advisory; executives make the final call.'))}</p>
<script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`;
    w.document.open(); w.document.write(html); w.document.close();
  }

  const sevCls = (s: string) => s === 'critical' || s === 'high' ? 'border-destructive/40 text-destructive' : s === 'medium' ? 'border-amber-500/40 text-amber-600' : 'text-muted-foreground';

  return (
    <Card className="border-primary/30">
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base"><Sparkles className="h-5 w-5 text-primary" /> {t('AI Önerileri', 'AI Recommendations')}</CardTitle>
        <div className="flex items-center gap-3">
          {data && <span className="text-xs text-muted-foreground">{new Date(data.generated_at).toLocaleString(locale)}</span>}
          {data && !loading && <Button size="sm" variant="outline" onClick={downloadReport}><Download className="h-4 w-4 mr-2" />{t('Yönetici raporu indir', 'Download executive report')}</Button>}
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {data ? t('Yeniden analiz et', 'Re-analyze') : t('AI analizi oluştur', 'Generate AI analysis')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {loading && <div className="space-y-2"><p className="text-sm text-muted-foreground">{t('AI analiz ediliyor…', 'AI is analyzing…')}</p><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div>}
        {!loading && !ins && <p className="text-sm text-muted-foreground">{t('Derslerinize göre şirketin eksiklerini, yönetici özetini ve aksiyon/strateji/fiyat önerilerini AI ile çıkarın.', 'Use AI to surface company gaps, an executive summary and action/strategy/pricing recommendations from your lessons.')}</p>}
        {!loading && ins && (<>
          <section className="rounded-lg bg-primary/5 border border-primary/20 p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> {t('Yönetici Özeti', 'Executive Summary')}</h3>
              {typeof ins.health_score === 'number' && <Badge variant="outline">{t('Sağlık skoru', 'Health score')}: {ins.health_score}/100</Badge>}
            </div>
            <p className="text-sm leading-relaxed">{ins.executive_summary}</p>
          </section>

          {!!ins.gaps?.length && <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> {t('Şirketin eksik olduğu alanlar', 'Where the company falls short')}</h3>
            <div className="grid md:grid-cols-2 gap-2">
              {ins.gaps.map((g, i) => (
                <div key={i} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium text-sm">{g.area}</span><Badge variant="outline" className={`text-xs ${sevCls(g.severity)}`}>{translate(g.severity)}</Badge></div>
                  <p className="text-sm text-muted-foreground mt-1">{g.description}</p>
                  {g.evidence && <p className="text-xs text-muted-foreground mt-1 italic">{g.evidence}</p>}
                </div>
              ))}
            </div>
          </section>}

          <section className="grid lg:grid-cols-3 gap-3">
            {groups.map(({ key, label, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /> {label}</h3>
                {recs.filter((r) => r.type === key).map((r, i) => (
                  <div key={i} className="rounded-md border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2"><span className="font-medium text-sm">{r.title}</span>{r.priority && <Badge variant="secondary" className="text-[10px]">{translate(r.priority)}</Badge>}</div>
                    <p className="text-sm text-muted-foreground">{r.detail}</p>
                    {r.counterfactual && <p className="text-sm rounded bg-muted p-2 italic">“{r.counterfactual}”</p>}
                    {r.expected_impact && <p className="text-xs text-primary">{t('Beklenen etki', 'Expected impact')}: {r.expected_impact}</p>}
                  </div>
                ))}
              </div>
            ))}
          </section>

          {!!ins.next_30_days?.length && <section>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /> {t('Önümüzdeki 30 gün', 'Next 30 days')}</h3>
            <ul className="list-disc pl-5 text-sm space-y-1">{ins.next_30_days.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>}
          <p className="text-xs text-muted-foreground">{t('AI önerileri tavsiye niteliğindedir; son karar yöneticiye aittir.', 'AI recommendations are advisory; executives make the final call.')}</p>
        </>)}
      </CardContent>
    </Card>
  );
}
