// Pure, deterministic rules for evidence-grounded decision intelligence.
// Shared by the edge function and the browser (tests import it from src/test).

export type ClaimKind = 'fact' | 'inference' | 'assumption' | 'missing';
export interface Claim { kind: ClaimKind; text: string; source_ids: string[] }
export interface Criterion { key: string; label: string; weight: number; enabled: boolean }
export interface CriterionRating { key: string; rating: number | null; rationale: string; source_ids: string[] }

export const DEFAULT_CRITERIA: Criterion[] = [
  { key: 'probability', label: 'Probability of occurrence', weight: 3, enabled: true },
  { key: 'impact', label: 'Potential impact', weight: 3, enabled: true },
  { key: 'evidence_quality', label: 'Evidence quality and completeness', weight: 2, enabled: true },
  { key: 'historical_outcomes', label: 'Historical outcomes', weight: 2, enabled: true },
  { key: 'external_conditions', label: 'External economic and industry conditions', weight: 1, enabled: true },
  { key: 'uncertainty', label: 'Uncertainty and conflicting information', weight: 2, enabled: true },
];

/** Minimum recorded outcomes of similar decisions before a numeric probability may be shown. */
export const MIN_OUTCOMES_FOR_PROBABILITY = 5;

/** Facts must cite at least one supplied record; otherwise they are downgraded to inference. Unknown IDs are dropped. */
export function groundClaims(raw: unknown, allowedIds: Set<string>): Claim[] {
  if (!Array.isArray(raw)) return [];
  const kinds: ClaimKind[] = ['fact', 'inference', 'assumption', 'missing'];
  return raw.flatMap((c: any) => {
    const text = typeof c?.text === 'string' ? c.text.trim().slice(0, 600) : '';
    if (!text) return [];
    let kind: ClaimKind = kinds.includes(c?.kind) ? c.kind : 'inference';
    const source_ids = (Array.isArray(c?.source_ids) ? c.source_ids : []).filter((id: unknown) => typeof id === 'string' && allowedIds.has(id));
    if (kind === 'fact' && source_ids.length === 0) kind = 'inference';
    return [{ kind, text, source_ids }];
  });
}

/** Weighted 0-100 score from 1-5 ratings; unrated criteria are excluded. Returns null if nothing was rated. */
export function computeRiskScore(criteria: Criterion[], ratings: CriterionRating[]): number | null {
  let total = 0, weight = 0;
  for (const c of criteria) {
    if (!c.enabled || c.weight <= 0) continue;
    const r = ratings.find((x) => x.key === c.key)?.rating;
    if (typeof r !== 'number' || !Number.isFinite(r)) continue;
    const clamped = Math.min(5, Math.max(1, r));
    total += ((clamped - 1) / 4) * 100 * c.weight;
    weight += c.weight;
  }
  return weight === 0 ? null : Math.round(total / weight);
}

export function riskLevel(score: number | null): 'low' | 'medium' | 'high' | 'critical' | 'unknown' {
  if (score === null) return 'unknown';
  if (score >= 75) return 'critical';
  if (score >= 55) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

/** Empirical failure rate among similar decisions with recorded outcomes; null below the sample threshold. */
export function outcomeProbability(outcomes: string[]): { probability: number | null; basis: string } {
  const recorded = outcomes.filter((o) => ['Success', 'Partial Success', 'Failure'].includes(o));
  if (recorded.length < MIN_OUTCOMES_FOR_PROBABILITY) {
    return { probability: null, basis: `insufficient_outcomes:${recorded.length}/${MIN_OUTCOMES_FOR_PROBABILITY}` };
  }
  const bad = recorded.filter((o) => o === 'Failure').length + recorded.filter((o) => o === 'Partial Success').length * 0.5;
  return { probability: Math.round((bad / recorded.length) * 100) / 100, basis: `recorded_outcomes:${recorded.length}` };
}

/** An observation is stale when older than its source freshness window. */
export function isStale(publishedAt: string, freshnessDays: number, now = new Date()): boolean {
  const age = (now.getTime() - new Date(publishedAt).getTime()) / 86_400_000;
  return age > freshnessDays;
}

/** A past decision's result may only be stated when an outcome is recorded. */
export function outcomeLabel(recorded: string | null | undefined): string {
  return recorded && recorded !== 'Pending' ? recorded : 'No recorded outcome';
}
