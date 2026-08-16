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
