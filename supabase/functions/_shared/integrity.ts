export function isWriter(role: unknown): boolean {
  return role === 'admin' || role === 'approver';
}

/** Machine keys never imply access to restricted records. */
export function mayReadRestricted(keyRole: string, scopes: string[]): boolean {
  return keyRole === 'admin' && scopes.includes('confidential:read');
}

/** AI output is untrusted: never write model-provided tenant IDs or evidence. */
export function sanitizeAnalysis(value: any) {
  const text = (v: unknown) => typeof v === 'string' ? v.slice(0, 10000) : '';
  const confidence = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0;
  const list = (v: unknown): any[] => Array.isArray(v) ? v.slice(0, 30) : [];
  return {
    alternatives: list(value?.alternatives).filter(a => text(a?.title)).map(a => ({
      title: text(a.title), description: text(a.description), estimated_cost: null, expected_value: null,
      time_to_impact: text(a.time_to_impact), risk_level: ['low','medium','high','critical'].includes(a.risk_level) ? a.risk_level : 'medium',
      reversibility: ['high','medium','low'].includes(a.reversibility) ? a.reversibility : 'medium',
      confidence: confidence(a.confidence), is_recommended: a.is_recommended === true,
    })),
    assumptions: list(value?.assumptions).filter(a => text(a?.text)).map(a => ({ text: text(a.text), confidence: confidence(a.confidence) })),
    unknowns: list(value?.unknowns).filter(a => text(a?.text)).map(a => ({ text: text(a.text), is_blocking: a.is_blocking === true })),
    scenarios: list(value?.scenarios).filter(a => ['best','base','worst','do_nothing'].includes(a?.scenario)).map(a => ({ scenario: a.scenario, summary: text(a.summary), financial_impact: null, probability: null })),
    recommendation: {
      rationale: text(value?.recommendation?.rationale), confidence: confidence(value?.recommendation?.confidence),
      invalidation_conditions: text(value?.recommendation?.invalidation_conditions), devils_advocate: text(value?.recommendation?.devils_advocate),
    },
  };
}