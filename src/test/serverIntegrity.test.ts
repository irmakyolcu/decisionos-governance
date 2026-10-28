import { describe, expect, it } from 'vitest';
import { isWriter, mayReadRestricted, sanitizeAnalysis } from '../../supabase/functions/_shared/integrity';

describe('server integrity rules', () => {
  it('denies viewer mutations', () => { expect(isWriter('viewer')).toBe(false); });
  it('denies auditor mutations', () => { expect(isWriter('auditor')).toBe(false); });
  it('allows administrators and approvers', () => { expect(isWriter('admin')).toBe(true); expect(isWriter('approver')).toBe(true); });
  it('requires explicit restricted-data scope even for admin machine keys', () => {
    expect(mayReadRestricted('admin', ['*'])).toBe(false);
    expect(mayReadRestricted('viewer', ['confidential:read'])).toBe(false);
    expect(mayReadRestricted('admin', ['confidential:read'])).toBe(true);
  });
  it('does not persist fabricated evidence or probabilities', () => {
    const output = sanitizeAnalysis({ evidence: [{ source: 'invented', is_verified: true }], scenarios: [{ scenario: 'base', probability: .98, financial_impact: 999 }] });
    expect(output).not.toHaveProperty('evidence');
    expect(output.scenarios[0].probability).toBeNull();
    expect(output.scenarios[0].financial_impact).toBeNull();
  });
  it('never trusts model identity or unsupported financial estimates', () => {
    const output = sanitizeAnalysis({ alternatives: [{ title: 'Option', workspace_id: 'attacker', estimated_cost: 100, expected_value: 500, confidence: 2 }] });
    expect(output.alternatives[0]).not.toHaveProperty('workspace_id');
    expect(output.alternatives[0].estimated_cost).toBeNull();
    expect(output.alternatives[0].confidence).toBe(1);
  });
});