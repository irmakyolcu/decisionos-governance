import { supabase } from '@/integrations/supabase/client';

export type StepAuditCheck = {
  /** Human-readable label of what was checked. */
  label: string;
  /** 'missing' = required info absent, 'error' = validation/runtime error, 'interrupted' = flow could not continue. */
  kind: 'missing' | 'error' | 'interrupted';
  detail?: string;
};

export type StepAuditReport = {
  step: number;
  stepTitle: string;
  flow: string;
  completedAt: string;
  missing: StepAuditCheck[];
  errors: StepAuditCheck[];
  interrupted: StepAuditCheck[];
  status: 'clean' | 'observation' | 'blocked';
};

/** Build an automatic audit report for a finished step. */
export function buildStepAudit(
  flow: string,
  step: number,
  stepTitle: string,
  findings: StepAuditCheck[],
): StepAuditReport {
  const missing = findings.filter((f) => f.kind === 'missing');
  const errors = findings.filter((f) => f.kind === 'error');
  const interrupted = findings.filter((f) => f.kind === 'interrupted');
  const status: StepAuditReport['status'] =
    errors.length > 0 || interrupted.length > 0 ? 'blocked' : missing.length > 0 ? 'observation' : 'clean';
  return { flow, step, stepTitle, completedAt: new Date().toISOString(), missing, errors, interrupted, status };
}

/** Persist the report to the append-only audit ledger (internal audit module). */
export async function recordStepAudit(workspaceId: string | undefined, report: StepAuditReport) {
  if (!workspaceId) return;
  const { data } = await supabase.auth.getUser();
  const actor = data.user?.id ?? null;
  await (supabase as any).from('audit_events').insert({
    workspace_id: workspaceId,
    actor_user_id: actor,
    event_type: `step.audit.${report.status}`,
    reason: `${report.flow} · Adım ${report.step} (${report.stepTitle}) — ${report.missing.length} eksik bilgi, ${report.errors.length} hata, ${report.interrupted.length} kesinti`,
    after_state: report as unknown as Record<string, unknown>,
  });
}

/** Flattened row shape — identical to the `step_audits` entity of GET /v1/export. */
export type StepAuditRow = {
  id: string | null;
  recorded_at: string | null;
  completed_at: string | null;
  flow: string | null;
  step: number | null;
  step_title: string | null;
  status: string;
  missing_count: number;
  error_count: number;
  interrupted_count: number;
  missing: string;
  errors: string;
  interrupted: string;
  summary: string | null;
};

const names = (arr: unknown) =>
  Array.isArray(arr) ? arr.map((f: any) => f?.label).filter(Boolean).join(' | ') : '';

export function reportToRow(report: StepAuditReport, id: string | null = null): StepAuditRow {
  return {
    id,
    recorded_at: report.completedAt,
    completed_at: report.completedAt,
    flow: report.flow,
    step: report.step,
    step_title: report.stepTitle,
    status: report.status,
    missing_count: report.missing.length,
    error_count: report.errors.length,
    interrupted_count: report.interrupted.length,
    missing: names(report.missing),
    errors: names(report.errors),
    interrupted: names(report.interrupted),
    summary: `${report.flow} · Adım ${report.step} (${report.stepTitle})`,
  };
}

/** Pull persisted step-audit reports from the ledger, in export-endpoint shape. */
export async function fetchStepAuditRows(workspaceId: string | undefined, flow?: string): Promise<StepAuditRow[]> {
  if (!workspaceId) return [];
  const { data } = await (supabase as any)
    .from('audit_events')
    .select('*')
    .eq('workspace_id', workspaceId)
    .like('event_type', 'step.audit.%')
    .order('created_at', { ascending: false })
    .limit(500);
  const rows: StepAuditRow[] = ((data ?? []) as any[]).map((r) => {
    const p = (r.after_state ?? {}) as any;
    return {
      id: r.id,
      recorded_at: r.created_at,
      completed_at: p.completedAt ?? null,
      flow: p.flow ?? null,
      step: p.step ?? null,
      step_title: p.stepTitle ?? null,
      status: p.status ?? String(r.event_type ?? '').replace('step.audit.', ''),
      missing_count: Array.isArray(p.missing) ? p.missing.length : 0,
      error_count: Array.isArray(p.errors) ? p.errors.length : 0,
      interrupted_count: Array.isArray(p.interrupted) ? p.interrupted.length : 0,
      missing: names(p.missing),
      errors: names(p.errors),
      interrupted: names(p.interrupted),
      summary: r.reason ?? null,
    };
  });
  return flow ? rows.filter((r) => (r.flow ?? '').toLowerCase() === flow.toLowerCase()) : rows;
}

export function stepAuditsToCsv(rows: StepAuditRow[]): string {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc((r as any)[c])).join(','))].join('\n');
}

export function downloadStepAudits(rows: StepAuditRow[], format: 'json' | 'csv', filename = 'step-audits') {
  const body =
    format === 'csv'
      ? stepAuditsToCsv(rows)
      : JSON.stringify(
          { exported_at: new Date().toISOString(), entity: 'step_audits', count: rows.length, data: { step_audits: rows } },
          null,
          2,
        );
  const blob = new Blob([body], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Flattened internal audit ledger row — identical to the `audit` entity of GET /v1/export. */
export type AuditReportRow = {
  id: string | null;
  recorded_at: string | null;
  event_type: string | null;
  flow: string | null;
  step: number | null;
  step_title: string | null;
  status: string | null;
  actor_user_id: string | null;
  decision_id: string | null;
  action_id: string | null;
  reason: string | null;
};

export function auditEventToRow(r: any): AuditReportRow {
  const p = (r.after_state ?? {}) as any;
  return {
    id: r.id ?? null,
    recorded_at: r.created_at ?? null,
    event_type: r.event_type ?? null,
    flow: p.flow ?? null,
    step: p.step ?? null,
    step_title: p.stepTitle ?? null,
    status: p.status ?? null,
    actor_user_id: r.actor_user_id ?? null,
    decision_id: r.decision_id ?? null,
    action_id: r.action_id ?? null,
    reason: r.reason ?? null,
  };
}

/** Generic download for any flattened export row set (same shape as the export endpoint). */
export function downloadRows(
  rows: Record<string, unknown>[],
  format: 'json' | 'csv',
  entity: string,
  filename = entity,
) {
  const body =
    format === 'csv'
      ? stepAuditsToCsv(rows as any)
      : JSON.stringify(
          { exported_at: new Date().toISOString(), entity, count: rows.length, data: { [entity]: rows } },
          null,
          2,
        );
  const blob = new Blob([body], { type: format === 'csv' ? 'text/csv;charset=utf-8' : 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.${format}`;
  a.click();
  URL.revokeObjectURL(url);
}
