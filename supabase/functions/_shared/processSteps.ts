export function normalizeProcessSteps(value: unknown): { id: string; title: string; [key: string]: unknown }[] {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error('steps must be an array');
  if (value.length > 100) throw new Error('Max 100 steps per process');
  const seen = new Set<string>();
  return value.map(step => {
    const row = typeof step === 'string' ? { title: step } : step;
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Invalid process step');
    const title = String(row.title ?? '').trim();
    if (!title) throw new Error('Step title required');
    const id = row.id == null ? crypto.randomUUID() : String(row.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Invalid step identity');
    if (seen.has(id.toLowerCase())) throw new Error('Duplicate step identity');
    seen.add(id.toLowerCase());
    return { ...row, id, title };
  });
}