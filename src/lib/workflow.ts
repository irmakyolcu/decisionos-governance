import type { Tables } from '@/integrations/supabase/types';
export type WorkflowStep = Tables<'workflow_steps'>;
export type WorkflowTask = Tables<'workflow_tasks'>;
export function workflowProgress(steps: Pick<WorkflowStep, 'status'>[], tasks: Pick<WorkflowTask, 'status'>[]) {
  const work = [...steps, ...tasks];
  return work.length ? Math.round(100 * work.filter(item => item.status === 'completed').length / work.length) : null;
}
export function reorderIds(ids: string[], from: string, to: string) {
  const source = ids.indexOf(from); const target = ids.indexOf(to);
  if (source < 0 || target < 0) return ids;
  const next = [...ids]; const [item] = next.splice(source, 1); next.splice(target, 0, item); return next;
}