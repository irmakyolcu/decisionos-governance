// Inbound integration endpoint: API-key auth (scope inbound:write, writer+), validated payload,
// idempotent on (workspace, source, external_id). Decisions are only created as Draft.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { validateInbound } from '../_shared/integrationRules.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const raw = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!raw.startsWith('dos_')) return json({ error: 'Missing or invalid API key' }, 401);
  const { data: key } = await admin.from('api_keys').select('id, workspace_id, role, scopes, created_by')
    .eq('key_hash', await sha256Hex(raw)).is('revoked_at', null).maybeSingle();
  if (!key) return json({ error: 'Invalid API key' }, 401);
  const { data: issuer } = await admin.from('workspace_members').select('role').eq('workspace_id', key.workspace_id).eq('user_id', key.created_by).maybeSingle();
  if (issuer?.role !== 'admin') return json({ error: 'Key issuer no longer authorized' }, 403);
  if (!(key.scopes ?? []).some((s: string) => s === 'inbound:write' || s === '*')) return json({ error: 'Missing scope: inbound:write' }, 403);
  if (key.role === 'viewer') return json({ error: 'Requires role: writer' }, 403);

  const len = Number(req.headers.get('content-length') ?? 0);
  if (len > 512_000) return json({ error: 'Payload too large' }, 413);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: 'Body must be JSON' }, 400); }
  const parsed = validateInbound(body);
  if (!parsed.ok) return json({ error: 'Validation failed', details: parsed.errors }, 400);
  const p = parsed.value;
  const ws = key.workspace_id;

  // Permitted data types from the inbound integration config (if configured)
  const { data: cfg } = await admin.from('integration_configs').select('id, enabled, allowed_data_types')
    .eq('workspace_id', ws).eq('kind', 'inbound_api').order('created_at').limit(1).maybeSingle();
  if (cfg && !cfg.enabled) return json({ error: 'Inbound integration is disabled' }, 403);
  if (cfg && cfg.allowed_data_types.length && !cfg.allowed_data_types.includes(p.type)) return json({ error: `Data type not permitted: ${p.type}` }, 403);

  const { data: ev, error: evErr } = await admin.from('inbound_events').insert({
    workspace_id: ws, source: p.source, external_id: p.external_id, event_type: p.type, payload: p.data, api_key_id: key.id,
  }).select('id').single();
  if (evErr) {
    if (evErr.code === '23505') {
      const { data: prev } = await admin.from('inbound_events').select('id, status, record_kind, record_id')
        .eq('workspace_id', ws).eq('source', p.source).eq('external_id', p.external_id).maybeSingle();
      return json({ duplicate: true, event: prev }, 200);
    }
    return json({ error: evErr.message }, 500);
  }

  const d = p.data as Record<string, string>;
  let recordKind: string | null = null; let recordId: string | null = null; let status = 'processed'; let error: string | null = null;
  try {
    if (p.type === 'decision') {
      const { data, error: e } = await admin.from('decisions').insert({
        workspace_id: ws, title: d.title, description: `${d.description ?? ''}\n\nKaynak: ${p.source}/${p.external_id}`.trim(),
        created_by: key.created_by, status: 'Draft',
      }).select('id').single();
      if (e) throw e; recordKind = 'decision'; recordId = data.id;
    } else if (p.type === 'meeting_note') {
      const { data, error: e } = await admin.from('meetings').upsert({
        workspace_id: ws, title: d.title, date: d.date ?? new Date().toISOString().slice(0, 10), location: p.source,
        source: 'api', external_ref: `api:${p.source}:${p.external_id}`, summary: d.summary ?? '', transcript: d.transcript ?? d.text ?? '',
        imported_at: new Date().toISOString(),
      }, { onConflict: 'workspace_id,external_ref' }).select('id').single();
      if (e) throw e; recordKind = 'meeting'; recordId = data.id;
    } else if (p.type === 'note' || p.type === 'document_text') {
      const { data, error: e } = await admin.from('company_notes').insert({
        workspace_id: ws, created_by: key.created_by, title: d.title, content: d.content ?? d.text ?? '',
        category: p.type === 'note' ? 'General' : 'Document', tags: ['inbound', p.source.slice(0, 40)],
      }).select('id').single();
      if (e) throw e; recordKind = 'note'; recordId = data.id;
    } else {
      status = 'stored';
    }
  } catch (e) {
    status = 'failed'; error = (e as { message?: string }).message ?? String(e);
  }
  await admin.from('inbound_events').update({ status, error, record_kind: recordKind, record_id: recordId }).eq('id', ev.id);
  await admin.from('integration_runs').insert({
    workspace_id: ws, integration_id: cfg?.id ?? null, kind: 'inbound', status: status === 'failed' ? 'failed' : 'success',
    detail: { inbound_event_id: ev.id, type: p.type, source: p.source }, error, actor_id: key.created_by,
  });
  if (cfg) await admin.from('integration_configs').update({ last_sync_at: new Date().toISOString(), status: status === 'failed' ? 'error' : 'connected', last_error: error }).eq('id', cfg.id);
  if (status === 'failed') return json({ error: 'Record could not be created', details: error, event_id: ev.id }, 422);
  return json({ event_id: ev.id, status, record_kind: recordKind, record_id: recordId }, 201);
});
