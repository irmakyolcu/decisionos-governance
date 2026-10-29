import jsPDF from 'jspdf';
import { DejaVuSans } from '@/lib/pdf/DejaVuSans';
import { DejaVuSansBold } from '@/lib/pdf/DejaVuSansBold';

export interface ReportInput {
  workspace: string; periodFrom: Date; periodTo: Date; dataAsOf: string | null; locale: string;
  labels: Record<string, string>;
  riskDistribution: { label: string; value: number }[];
  outcomeDistribution: { label: string; value: number }[];
  alerts: { title: string; why: string; owner: string; next: string }[];
  assessments: { decision: string; level: string; score: number | null; rationale: string; mitigations: string[]; sources: { label: string; date: string | null; stale: boolean }[] }[];
  decisions: { title: string; status: string; outcome: string }[];
}

export function buildIntelligencePdf(r: ReportInput): jsPDF {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  doc.addFileToVFS('DejaVuSans.ttf', DejaVuSans); doc.addFont('DejaVuSans.ttf', 'dejavu', 'normal');
  doc.addFileToVFS('DejaVuSans-Bold.ttf', DejaVuSansBold); doc.addFont('DejaVuSans-Bold.ttf', 'dejavu', 'bold');
  const M = 15, W = 180; let y = 18;
  const ensure = (h: number) => { if (y + h > 280) { doc.addPage(); y = 18; } };
  const text = (s: string, size = 10, bold = false, indent = 0) => {
    doc.setFont('dejavu', bold ? 'bold' : 'normal'); doc.setFontSize(size);
    for (const line of doc.splitTextToSize(s || '—', W - indent)) { ensure(size * 0.5); doc.text(line, M + indent, y); y += size * 0.45; }
    y += 1;
  };
  const h = (s: string) => { y += 3; ensure(12); text(s, 13, true); };
  const bars = (data: { label: string; value: number }[]) => {
    const max = Math.max(1, ...data.map((d) => d.value));
    for (const d of data) {
      ensure(7); doc.setFont('dejavu', 'normal'); doc.setFontSize(9);
      doc.text(d.label, M, y + 3.5);
      doc.setFillColor(79, 70, 229); doc.rect(M + 45, y, (d.value / max) * 110, 4.5, 'F');
      doc.text(String(d.value), M + 45 + (d.value / max) * 110 + 2, y + 3.5); y += 6.5;
    }
  };
  const L = r.labels;
  text(L.title, 18, true);
  text(`${r.workspace} · ${L.period}: ${r.periodFrom.toLocaleDateString(r.locale)} – ${r.periodTo.toLocaleDateString(r.locale)}`, 10);
  text(`${L.generated}: ${new Date().toLocaleString(r.locale)} · ${L.dataAsOf}: ${r.dataAsOf ? new Date(r.dataAsOf).toLocaleString(r.locale) : '—'}`, 9);
  text(L.scope, 8);
  h(L.riskChart); bars(r.riskDistribution);
  h(L.outcomeChart); bars(r.outcomeDistribution);
  h(L.alerts);
  if (!r.alerts.length) text('—');
  for (const a of r.alerts) { text(a.title, 10, true); text(`${L.why}: ${a.why}`, 9, false, 3); text(`${L.owner}: ${a.owner} · ${L.next}: ${a.next}`, 9, false, 3); }
  h(L.assessments);
  if (!r.assessments.length) text('—');
  for (const a of r.assessments) {
    text(`${a.decision} — ${a.level}${a.score != null ? ` (${a.score}/100)` : ''}`, 10, true);
    text(a.rationale, 9, false, 3);
    for (const m of a.mitigations) text(`• ${m}`, 9, false, 5);
    if (a.sources.length) { text(`${L.sources}:`, 9, true, 3); for (const s of a.sources) text(`– ${s.label}${s.date ? ` (${new Date(s.date).toLocaleDateString(r.locale)})` : ''}${s.stale ? ` [${L.outdated}]` : ''}`, 8, false, 5); }
  }
  h(L.decisions);
  for (const d of r.decisions) text(`${d.title} — ${d.status} — ${d.outcome}`, 9);
  y += 3; text(L.governance, 8);
  return doc;
}
