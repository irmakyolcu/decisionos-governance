import { describe, it, expect } from 'vitest';
import { signWebhook, verifyWebhook, validateInbound, matchesConditions, retryDelaySeconds, checkWebhookUrl } from '../../supabase/functions/_shared/integrationRules';

const SECRET = 'whsec_' + btoa('0123456789abcdef0123456789abcdef');

describe('webhook signatures', () => {
  it('verifies a signature it produced', async () => {
    const sig = await signWebhook(SECRET, 'msg_1', 1700000000, '{"a":1}');
    expect(await verifyWebhook(SECRET, 'msg_1', 1700000000, '{"a":1}', sig, 1700000010)).toBe(true);
  });
  it('rejects a tampered body', async () => {
    const sig = await signWebhook(SECRET, 'msg_1', 1700000000, '{"a":1}');
    expect(await verifyWebhook(SECRET, 'msg_1', 1700000000, '{"a":2}', sig, 1700000010)).toBe(false);
  });
  it('rejects timestamps older than 5 minutes', async () => {
    const sig = await signWebhook(SECRET, 'msg_1', 1700000000, 'x');
    expect(await verifyWebhook(SECRET, 'msg_1', 1700000000, 'x', sig, 1700000301)).toBe(false);
  });
});

describe('inbound validation', () => {
  it('accepts a valid decision', () => {
    expect(validateInbound({ source: 'erp', external_id: '1', type: 'decision', data: { title: 'X' } }).ok).toBe(true);
  });
  it('rejects unknown types and missing title', () => {
    const r = validateInbound({ source: 'erp', external_id: '1', type: 'payment', data: {} });
    expect(r.ok).toBe(false);
  });
  it('rejects bad meeting dates', () => {
    expect(validateInbound({ source: 's', external_id: '1', type: 'meeting_note', data: { title: 'm', date: '29/10/2026' } }).ok).toBe(false);
  });
});

describe('automation conditions', () => {
  it('matches equal and list values', () => {
    expect(matchesConditions({ severity: ['high', 'critical'] }, { severity: 'critical' })).toBe(true);
    expect(matchesConditions({ severity: 'critical' }, { severity: 'high' })).toBe(false);
    expect(matchesConditions({ department: 'QA' }, {})).toBe(false);
    expect(matchesConditions({}, { anything: 1 })).toBe(true);
  });
});

describe('delivery rules', () => {
  it('backs off exponentially', () => {
    expect(retryDelaySeconds(1)).toBe(30);
    expect(retryDelaySeconds(2)).toBe(120);
    expect(retryDelaySeconds(10)).toBe(4 * 3600);
  });
  it('rejects non-https and private webhook urls', () => {
    expect(checkWebhookUrl('http://example.com')).not.toBeNull();
    expect(checkWebhookUrl('https://127.0.0.1/x')).not.toBeNull();
    expect(checkWebhookUrl('https://169.254.169.254/')).not.toBeNull();
    expect(checkWebhookUrl('https://hooks.example.com/x')).toBeNull();
  });
});
