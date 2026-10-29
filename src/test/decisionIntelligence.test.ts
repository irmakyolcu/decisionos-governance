import { describe, expect, it } from 'vitest';
import { DEFAULT_CRITERIA, computeRiskScore, groundClaims, isStale, outcomeLabel, outcomeProbability, riskLevel } from '../../supabase/functions/_shared/decisionIntelligence';

describe('decision intelligence rules', () => {
  it('downgrades uncited facts to inference and drops unknown sources', () => {
    const c = groundClaims([
      { kind: 'fact', text: 'Budget is 1M', source_ids: ['invented'] },
      { kind: 'fact', text: 'Last launch failed', source_ids: ['d1'] },
    ], new Set(['d1']));
    expect(c[0]).toEqual({ kind: 'inference', text: 'Budget is 1M', source_ids: [] });
    expect(c[1].kind).toBe('fact');
  });
  it('computes a weighted score from ratings', () => {
    const ratings = DEFAULT_CRITERIA.map((c) => ({ key: c.key, rating: 5, rationale: '', source_ids: [] }));
    expect(computeRiskScore(DEFAULT_CRITERIA, ratings)).toBe(100);
    expect(computeRiskScore(DEFAULT_CRITERIA, [{ key: 'impact', rating: 3, rationale: '', source_ids: [] }])).toBe(50);
  });
  it('returns no score when nothing is rated', () => {
    expect(computeRiskScore(DEFAULT_CRITERIA, [])).toBeNull();
    expect(riskLevel(null)).toBe('unknown');
  });
  it('ignores disabled criteria', () => {
    const crit = [{ key: 'a', label: 'a', weight: 1, enabled: true }, { key: 'b', label: 'b', weight: 1, enabled: false }];
    expect(computeRiskScore(crit, [{ key: 'a', rating: 1, rationale: '', source_ids: [] }, { key: 'b', rating: 5, rationale: '', source_ids: [] }])).toBe(0);
  });
  it('withholds numeric probability below 5 recorded outcomes', () => {
    expect(outcomeProbability(['Failure', 'Success', 'Pending', 'Success']).probability).toBeNull();
    expect(outcomeProbability(['Failure', 'Success', 'Success', 'Success', 'Failure']).probability).toBe(0.4);
  });
  it('flags data older than the freshness window', () => {
    const now = new Date('2026-10-29');
    expect(isStale('2026-09-01', 30, now)).toBe(true);
    expect(isStale('2026-10-20', 30, now)).toBe(false);
  });
  it('never states a past result without a recorded outcome', () => {
    expect(outcomeLabel(null)).toBe('No recorded outcome');
    expect(outcomeLabel('Pending')).toBe('No recorded outcome');
    expect(outcomeLabel('Failure')).toBe('Failure');
  });
});
