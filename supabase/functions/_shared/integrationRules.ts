// Shared integration rules: webhook signing (Standard Webhooks format), inbound payload
// validation, retry backoff, automation condition matching and SSRF host checks.
// Pure TypeScript so the same rules are unit-tested in Vitest and used by edge functions.

export const OUTBOUND_EVENTS = [
  'decision.approved',
  'task.assigned',
  'step.completed',
  'step.quality_failed',
  'approval.required',
  'risk.threshold_exceeded',
] as const;

export const INBOUND_TYPES = ['decision', 'meeting_note', 'note', 'document_text', 'operational_event'] as const;
export type InboundType = (typeof INBOUND_TYPES)[number];

export const MAX_ATTEMPTS = 6;

const b64 = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
};
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Standard Webhooks signature: v1,base64(HMAC-SHA256(secretBytes, `${id}.${ts}.${body}`)) */
export async function signWebhook(secret: string, id: string, timestamp: number, body: string): Promise<string> {
  const raw = secret.startsWith('whsec_') ? unb64(secret.slice(6)) : new TextEncoder().encode(secret);
  const key = await crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`));
  return `v1,${b64(new Uint8Array(sig))}`;
}

export async function verifyWebhook(
  secret: string, id: string, timestamp: number, body: string, header: string, nowSec = Math.floor(Date.now() / 1000), toleranceSec = 300,
): Promise<boolean> {
  if (!id || !Number.isFinite(timestamp) || Math.abs(nowSec - timestamp) > toleranceSec) return false;
  const expected = await signWebhook(secret, id, timestamp, body);
  return header.split(' ').some((part) => timingSafeEqual(part, expected));
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Exponential backoff in seconds: 30s, 2m, 8m, 32m, ~2h. */
export function retryDelaySeconds(attempt: number): number {
  return Math.min(30 * 4 ** Math.max(0, attempt - 1), 4 * 3600);
}

export interface InboundPayload {
  source: string;
  external_id: string;
  type: InboundType;
  data: Record<string, unknown>;
}

/** Returns the validated payload or a list of field errors. */
export function validateInbound(input: unknown): { ok: true; value: InboundPayload } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  const o = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const str = (k: string, max: number) => {
    const v = o[k];
    if (typeof v !== 'string' || !v.trim()) errors.push(`${k} is required`);
    else if (v.length > max) errors.push(`${k} is too long`);
  };
  str('source', 80);
  str('external_id', 200);
  if (!INBOUND_TYPES.includes(o.type as InboundType)) errors.push(`type must be one of ${INBOUND_TYPES.join(', ')}`);
  const data = o.data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) errors.push('data must be an object');
  else {
    const d = data as Record<string, unknown>;
    const t = o.type as InboundType;
    if (t !== 'operational_event' && (typeof d.title !== 'string' || !d.title.trim())) errors.push('data.title is required');
    if (typeof d.title === 'string' && d.title.length > 200) errors.push('data.title is too long');
    for (const k of ['description', 'content', 'summary', 'transcript', 'text']) {
      if (d[k] !== undefined && (typeof d[k] !== 'string' || (d[k] as string).length > 100000)) errors.push(`data.${k} must be text up to 100000 characters`);
    }
    if (t === 'meeting_note' && d.date !== undefined && !/^\d{4}-\d{2}-\d{2}$/.test(String(d.date))) errors.push('data.date must be YYYY-MM-DD');
    if (JSON.stringify(d).length > 256_000) errors.push('data is larger than 256 KB');
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, value: { source: String(o.source).trim(), external_id: String(o.external_id).trim(), type: o.type as InboundType, data: data as Record<string, unknown> } };
}

/** Mirrors public.automation_matches: each condition key must equal (or be one of) the payload value. */
export function matchesConditions(conditions: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  return Object.entries(conditions).every(([k, v]) => {
    if (!(k in payload) || payload[k] === null || payload[k] === undefined) return false;
    const actual = typeof payload[k] === 'string' ? payload[k] : JSON.stringify(payload[k]);
    if (Array.isArray(v)) return v.some((x) => (typeof x === 'string' ? x : JSON.stringify(x)) === actual);
    return (typeof v === 'string' ? v : JSON.stringify(v)) === actual;
  });
}

export function normalizeIpLiteral(host: string): string | null {
  let h = host.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return h;
  if (h.includes(':')) return h;
  let n: number | null = null;
  if (/^0x[0-9a-f]+$/.test(h)) n = parseInt(h, 16);
  else if (/^0[0-7]+$/.test(h)) n = parseInt(h, 8);
  else if (/^\d+$/.test(h)) n = parseInt(h, 10);
  if (n !== null && Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  return null;
}

export function isBlockedIp(ip: string): boolean {
  let addr = ip.toLowerCase();
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1);
  const zone = addr.indexOf('%');
  if (zone !== -1) addr = addr.slice(0, zone);
  if (addr.includes(':')) {
    const embedded = addr.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (embedded) return isBlockedIp(embedded[1]);
    if (addr === '::' || addr === '::1') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(addr)) return true;
    if (/^fe[89ab][0-9a-f]:/.test(addr)) return true;
    return false;
  }
  const parts = addr.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true;
  return false;
}

/** Synchronous URL checks (https, no private literal hosts). DNS check happens in assertPublicHost. */
export function checkWebhookUrl(url: string): string | null {
  let u: URL;
  try { u = new URL(url); } catch { return 'invalid url'; }
  if (u.protocol !== 'https:') return 'https is required';
  if (u.username || u.password) return 'credentials in url are not allowed';
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) return 'private hosts are not allowed';
  const lit = normalizeIpLiteral(host);
  if (lit && isBlockedIp(lit)) return 'private hosts are not allowed';
  return null;
}

// deno-lint-ignore no-explicit-any
declare const Deno: any;
export async function assertPublicHost(hostname: string): Promise<string | null> {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const pre = checkWebhookUrl(`https://${host}/`);
  if (pre) return pre;
  if (normalizeIpLiteral(host)) return null;
  const addresses: string[] = [];
  const [v4, v6] = await Promise.allSettled([Deno.resolveDns(host, 'A'), Deno.resolveDns(host, 'AAAA')]);
  if (v4.status === 'fulfilled') addresses.push(...v4.value);
  if (v6.status === 'fulfilled') addresses.push(...v6.value);
  if (addresses.length === 0) return 'host could not be resolved';
  if (addresses.some(isBlockedIp)) return 'private hosts are not allowed';
  return null;
}
