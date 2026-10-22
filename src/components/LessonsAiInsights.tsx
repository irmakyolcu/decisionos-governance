import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage, translate } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Loader2, AlertTriangle, Target, Compass, Tag, Briefcase, CalendarCheck, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DejaVuSans } from '@/lib/pdf/DejaVuSans';
import { DejaVuSansBold } from '@/lib/pdf/DejaVuSansBold';
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
    const i = data.insights;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.addFileToVFS('DejaVuSans.ttf', DejaVuSans);
    doc.addFont('DejaVuSans.ttf', 'dejavu', 'normal');
    doc.addFileToVFS('DejaVuSans-Bold.ttf', DejaVuSansBold);
    doc.addFont('DejaVuSans-Bold.ttf', 'dejavu', 'bold');
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 16;
    const maxW = pageW - margin * 2;
    let y = margin;

    const ensure = (need: number) => {
      if (y + need > pageH - margin) { doc.addPage(); y = margin; }
    };
    const para = (text: string | undefined, size = 10, style: 'normal' | 'bold' | 'italic' = 'normal', indent = 0, gap = 3) => {
      if (!text) return;
      doc.setFont('dejavu', style === 'bold' ? 'bold' : 'normal');
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(text, maxW - indent);
      lines.forEach((line: string) => {
        ensure(size * 0.42);
        doc.text(line, margin + indent, y);
        y += size * 0.42;
      });
      y += gap;
    };
    const h1 = (text: string) => { ensure(14); doc.setFont('dejavu', 'bold'); doc.setFontSize(18); doc.text(text, margin, y); y += 10; };
    const h2 = (text: string) => {
      ensure(12);
      y += 4;
      doc.setFont('dejavu', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(49, 46, 129);
      doc.text(text, margin, y);
      doc.setTextColor(17, 24, 39);
      doc.setDrawColor(49, 46, 129);
      doc.setLineWidth(0.6);
      doc.line(margin, y + 1.5, pageW - margin, y + 1.5);
      y += 7;
    };
    const muted = (text: string) => { doc.setTextColor(107, 114, 128); para(text, 8, 'normal', 0, 2); doc.setTextColor(17, 24, 39); };

    muted(`DecisionOS · ${new Date(data.generated_at).toLocaleString(locale)} · ${lessons.length} ${t('ders', 'lessons')}`);
    h1(t('Yönetici Raporu: Çıkarılan Dersler', 'Executive Report: Lessons Learned'));

    h2(t('Yönetici Özeti', 'Executive Summary'));
    if (typeof i.health_score === 'number') para(`${t('Sağlık skoru', 'Health score')}: ${i.health_score}/100`, 11, 'bold');
    para(i.executive_summary, 10);

    if (i.gaps?.length) {
      h2(t('Şirketin eksik olduğu alanlar', 'Where the company falls short'));
      i.gaps.forEach((g) => {
        para(`${g.area} [${translate(g.severity)}]`, 10, 'bold', 0, 1);
        para(g.description, 10, 'normal', 4, g.evidence ? 1 : 3);
        if (g.evidence) para(g.evidence, 8, 'italic', 4, 3);
      });
    }

    h2(t('Öneriler', 'Recommendations'));
    groups.forEach((g) => {
      const items = (i.recommendations || []).filter((r) => r.type === g.key);
      if (!items.length) return;
      para(g.label, 11, 'bold', 0, 2);
      items.forEach((r) => {
        para(`• ${r.title}${r.priority ? ` [${translate(r.priority)}]` : ''}`, 10, 'bold', 0, 1);
        para(r.detail, 10, 'normal', 4, 1);
        if (r.counterfactual) para(`“${r.counterfactual}”`, 9, 'italic', 4, 1);
        if (r.expected_impact) para(`${t('Beklenen etki', 'Expected impact')}: ${r.expected_impact}`, 8, 'normal', 4, 3);
      });
    });

    if (i.next_30_days?.length) {
      h2(t('Önümüzdeki 30 gün', 'Next 30 days'));
      i.next_30_days.forEach((s, idx) => para(`${idx + 1}. ${s}`, 10, 'normal', 0, 1));
    }

    y += 4;
    muted(t('AI önerileri tavsiye niteliğindedir; son karar yöneticiye aittir.', 'AI recommendations are advisory; executives make the final call.'));

    doc.save(`decisionos-yonetici-raporu-${new Date().toISOString().slice(0, 10)}.pdf`);
    toast.success(t('PDF indirildi', 'PDF downloaded'));
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
