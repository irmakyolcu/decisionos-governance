import { AlertTriangle, CheckCircle2, CircleSlash, FileWarning } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { StepAuditReport } from '@/lib/stepAudit';

const STATUS_META: Record<StepAuditReport['status'], { label: string; className: string }> = {
  clean: { label: 'Temiz', className: 'bg-success/10 text-success border-success/30' },
  observation: { label: 'Gözlem', className: 'bg-warning/10 text-warning border-warning/30' },
  blocked: { label: 'Kesinti', className: 'bg-destructive/10 text-destructive border-destructive/30' },
};

export function StepAuditReportCard({ report }: { report: StepAuditReport }) {
  const meta = STATUS_META[report.status];
  const sections = [
    { title: 'Eksik bilgi', items: report.missing, icon: FileWarning },
    { title: 'Yakalanan hata', items: report.errors, icon: AlertTriangle },
    { title: 'Kesilen akış', items: report.interrupted, icon: CircleSlash },
  ].filter((s) => s.items.length > 0);

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Otomatik denetim raporu</p>
          <p className="text-sm font-medium">
            Adım {report.step}: {report.stepTitle}
          </p>
        </div>
        <Badge variant="outline" className={meta.className}>
          {meta.label}
        </Badge>
      </div>

      {sections.length === 0 ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-success" />
          Eksik bilgi, hata veya kesinti bulunmadı.
        </p>
      ) : (
        <div className="space-y-2">
          {sections.map((s) => (
            <div key={s.title}>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                <s.icon className="h-3.5 w-3.5" /> {s.title} ({s.items.length})
              </p>
              <ul className="space-y-1">
                {s.items.map((it, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium">{it.label}</span>
                    {it.detail && <span className="text-muted-foreground"> — {it.detail}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        {new Date(report.completedAt).toLocaleString()} · İç Denetim defterine kaydedildi
      </p>
    </div>
  );
}
