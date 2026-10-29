export const RECORD_TABLES = { decision: 'decisions', lesson: 'knowledge_items', document: 'uploaded_documents', note: 'company_notes', project: 'projects', client: 'clients', process: 'processes', meeting: 'meetings', evidence: 'decision_evidence', risk: 'risks' } as const;
export type RecordKind = keyof typeof RECORD_TABLES | 'step';
export function recordHref(kind: string, id: string) {
  const base: Record<string, string> = { knowledge: '/data-sources', decision: '/decisions/list', lesson: '/memory/lessons', document: '/data-sources', note: '/memory/notes', project: '/projects', client: '/clients', process: '/processes', step: '/processes', meeting: '/meetings', evidence: '/decisions', risk: '/risks' };
  return kind === 'decision' ? `${base.decision}/${id}` : `${base[kind] ?? '/memory'}?record=${encodeURIComponent(id)}`;
}
export function canWriteMemory(role: string | null | undefined) { return role === 'admin' || role === 'approver'; }
export function lessonPayload(lesson: Record<string, unknown>) {
  const title = String(lesson.title ?? '').trim();
  if (!title || title.length > 255) throw new Error('Title is required');
  const impact = lesson.impact ?? 'mixed';
  if (!['positive', 'negative', 'mixed'].includes(String(impact))) throw new Error('Invalid impact');
  return { title, entity_type: 'lesson', content: String(String(lesson.context ?? '')), summary: String(String(lesson.recommendation ?? '')), lesson_data: { context: String(lesson.context ?? ''), what_worked: String(lesson.what_worked ?? ''), what_failed: String(lesson.what_failed ?? ''), recommendation: String(lesson.recommendation ?? ''), category: String(lesson.category ?? 'Strategy'), impact: String(impact), source: String(lesson.source ?? ''), observed_outcome: String(lesson.observed_outcome ?? '') } };
}