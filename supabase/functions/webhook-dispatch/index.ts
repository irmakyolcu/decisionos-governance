// Delivers pending outbound webhook deliveries with Standard Webhooks signatures,
// exponential retry and a final "failed" state. Safe to call repeatedly (scheduled every minute).
// Also handles admin "test" pings for one endpoint.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { MAX_ATTEMPTS, assertPublicHost, checkWebhookUrl, retryDelaySeconds, signWebhook } from '../_shared/integrationRules.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function send(url: string, secret: string, id: string, body: string) {
  const urlErr = checkWebhookUrl(url) ?? (await assertPublicHost(new URL(url).hostname));
  if (urlErr) return { ok: false, status: null as number | null, error: urlErr };
  const ts = Math.floor(Date.now() / 1000);
  const sig = await signWebhook(secret, id, ts, body);
  try {
    const res = await fetch(url, {
      method: 'POST', redirect: 'manual', signal: AbortSignal.timeout(10_000),
      headers: { 'Content-Type': 'application/json', 'webhook-id': id, 'webhook-timestamp': String(ts), 'webhook-signature': sig, 'User-Agent': 'DecisionOS-Webhooks/1' },
      body,
    });
    const text = (await res.text()).slice(0, 300);
    return { ok: res.status >= 200 && res.status < 300, status: res.status, error: res.ok ? null : `HTTP ${res.status}: ${text}` };
  } catch (e) {
    return { ok: false, status: null, error: String((e as Error).message ?? e).slice(0, 300) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const body = await req.json().catch(() => ({}));

  // Admin test ping
  if (body?.action === 'test') {
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);
    const { data: ep } = await admin.from('webhook_endpoints').select('id, workspace_id, url, secret').eq('id', String(body.endpoint_id ?? '')).maybeSingle();
    if (!ep) return json({ error: 'Endpoint not found' }, 404);
    const { data: m } = await admin.from('workspace_members').select('role').eq('workspace_id', ep.workspace_id).eq('user_id', user.id).maybeSingle();
    if (m?.role !== 'admin') return json({ error: 'Admin required' }, 403);
    const id = `test_${crypto.randomUUID()}`;
    const r = await send(ep.url, ep.secret, id, JSON.stringify({ type: 'test.ping', id, timestamp: new Date().toISOString(), data: {} }));
    await admin.from('integration_runs').insert({ workspace_id: ep.workspace_id, kind: 'webhook_test', status: r.ok ? 'success' : 'failed', detail: { endpoint_id: ep.id, status_code: r.status }, error: r.error, actor_id: user.id });
    return json({ ok: r.ok, status_code: r.status, error: r.error });
  }

  // Scheduled dispatch: claim due deliveries
  const now = new Date().toISOString();
  const { data: due } = await admin.from('webhook_deliveries').select('id').eq('status', 'pending').lte('next_retry_at', now).order('next_retry_at').limit(50);
  let delivered = 0, failed = 0;
  for (const { id } of due ?? []) {
    const { data: claimed } = await admin.from('webhook_deliveries').update({ status: 'delivering' }).eq('id', id).eq('status', 'pending')
      .select('id, attempts, workspace_id, endpoint:webhook_endpoints(url, secret, enabled), event:outbound_events(id, event_type, payload, created_at)').maybeSingle();
    if (!claimed) continue;
    // deno-lint-ignore no-explicit-any
    const c = claimed as any;
    if (!c.endpoint?.enabled) { await admin.from('webhook_deliveries').update({ status: 'failed', last_error: 'endpoint disabled' }).eq('id', id); failed++; continue; }
    const payload = JSON.stringify({ type: c.event.event_type, id: c.event.id, timestamp: c.event.created_at, data: c.event.payload });
    const r = await send(c.endpoint.url, c.endpoint.secret, c.event.id, payload);
    const attempts = c.attempts + 1;
    if (r.ok) {
      delivered++;
      await admin.from('webhook_deliveries').update({ status: 'delivered', attempts, last_status_code: r.status, last_error: null, delivered_at: new Date().toISOString() }).eq('id', id);
    } else {
      const final = attempts >= MAX_ATTEMPTS;
      if (final) failed++;
      await admin.from('webhook_deliveries').update({
        status: final ? 'failed' : 'pending', attempts, last_status_code: r.status, last_error: r.error,
        next_retry_at: new Date(Date.now() + retryDelaySeconds(attempts) * 1000).toISOString(),
      }).eq('id', id);
    }
  }
  return json({ processed: due?.length ?? 0, delivered, failed });
});
