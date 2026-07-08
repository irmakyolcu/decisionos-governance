// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GATEWAY = 'https://connector-gateway.lovable.dev/google_mail/gmail/v1';

function b64urlDecode(s: string): string {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try { return atob(s); } catch { return ''; }
}
function extractTextFromPayload(payload: any): string {
  if (!payload) return '';
  if (payload.body?.data && (payload.mimeType === 'text/plain' || payload.mimeType === 'text/html')) {
    const decoded = b64urlDecode(payload.body.data);
    return payload.mimeType === 'text/html' ? decoded.replace(/<[^>]+>/g, ' ') : decoded;
  }
  if (Array.isArray(payload.parts)) {
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plain) return extractTextFromPayload(plain);
    for (const p of payload.parts) { const t = extractTextFromPayload(p); if (t) return t; }
  }
  return '';
}
function collectAttachments(payload: any, out: string[] = []): string[] {
  if (!payload) return out;
  if (payload.filename && payload.filename.length > 0) out.push(payload.filename);
  if (Array.isArray(payload.parts)) payload.parts.forEach((p: any) => collectAttachments(p, out));
  return out;
}
function header(headers: any[], name: string): string {
  const h = headers?.find((x: any) => x.name.toLowerCase() === name.toLowerCase());
  return h?.value ?? '';
}

async function runOne(admin: any, schedule: any, gwHeaders: any) {
  const { data: decision } = await admin.from('decisions').select('id, workspace_id, title').eq('id', schedule.decision_id).maybeSingle();
  if (!decision) return { ok: false, error: 'decision_not_found', count: 0 };

  const q = (schedule.query?.trim()) || decision.title;
  const max = Math.min(Number(schedule.max_results) || 10, 25);
  const listUrl = `${GATEWAY}/users/me/messages?maxResults=${max}&q=${encodeURIComponent(q)}`;
  const listRes = await fetch(listUrl, { headers: gwHeaders });
  if (!listRes.ok) return { ok: false, error: `gmail_list_${listRes.status}`, count: 0 };
  const list = await listRes.json();
  const messages = list.messages ?? [];

  let inserted = 0;
  for (const m of messages) {
    const { data: existing } = await admin
      .from('decision_evidence').select('id')
      .eq('decision_id', decision.id).eq('source', `gmail:${m.id}`).maybeSingle();
    if (existing) continue;

    const mRes = await fetch(`${GATEWAY}/users/me/messages/${m.id}?format=full`, { headers: gwHeaders });
    if (!mRes.ok) continue;
    const msg = await mRes.json();
    const hs = msg.payload?.headers ?? [];
    const subject = header(hs, 'Subject') || '(no subject)';
    const from = header(hs, 'From');
    const dateStr = header(hs, 'Date');
    const dateIso = dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const text = extractTextFromPayload(msg.payload).replace(/\s+/g, ' ').trim().slice(0, 2000);
    const attachments = collectAttachments(msg.payload).filter(Boolean);
    const summary = [
      `[Gmail] ${subject}`, `From: ${from}`,
      attachments.length ? `Attachments: ${attachments.join(', ')}` : null,
      '', text || msg.snippet || '',
    ].filter(Boolean).join('\n');

    const { error: insErr } = await admin.from('decision_evidence').insert({
      workspace_id: decision.workspace_id,
      decision_id: decision.id,
      source: `gmail:${m.id}`,
      source_date: dateIso,
      owner: from,
      reliability: 'medium',
      is_verified: false,
      summary,
    });
    if (!insErr) inserted++;
  }

  await admin.from('audit_events').insert({
    workspace_id: decision.workspace_id,
    event_type: 'integration.gmail_sync_scheduled',
    decision_id: decision.id,
    actor_user_id: schedule.created_by,
    reason: `Scheduled sync: ${inserted} new email(s) (query: "${q}", cadence ${schedule.cadence_minutes}m)`,
  }).catch(() => {});

  return { ok: true, count: inserted };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GMAIL_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!LOVABLE_KEY || !GMAIL_KEY) {
      return new Response(JSON.stringify({ error: 'Gmail connection not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // AuthN/AuthZ: allow either a valid user JWT OR the service role key (for cron/internal)
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
    const isServiceRole = !!token && token === Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let userId: string | null = null;
    if (!isServiceRole) {
      if (!token) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: authData, error: authErr } = await userClient.auth.getUser();
      if (authErr || !authData?.user) {
        return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      userId = authData.user.id;
    }
    const gwHeaders = { 'Authorization': `Bearer ${LOVABLE_KEY}`, 'X-Connection-Api-Key': GMAIL_KEY };

    // Optional manual trigger: { schedule_id } runs just that one
    let body: any = {};
    try { body = await req.json(); } catch {}
    let query = admin.from('gmail_sync_schedules').select('*').eq('enabled', true);
    if (body?.schedule_id) {
      query = admin.from('gmail_sync_schedules').select('*').eq('id', body.schedule_id);
    } else {
      // Bulk cron sweep — restrict to service-role callers only
      if (!isServiceRole) {
        return new Response(JSON.stringify({ error: 'forbidden: bulk sweep requires service role' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      query = query.lte('next_run_at', new Date().toISOString()).limit(20);
    }
    const { data: due, error } = await query;
    if (error) throw error;

    // For user-triggered runs, verify workspace membership on every schedule fetched
    let filteredDue = due ?? [];
    if (!isServiceRole && userId) {
      const filtered: any[] = [];
      for (const s of filteredDue) {
        const { data: decision } = await admin.from('decisions').select('workspace_id').eq('id', s.decision_id).maybeSingle();
        if (!decision) continue;
        const { data: mem } = await admin.from('workspace_members').select('user_id').eq('workspace_id', decision.workspace_id).eq('user_id', userId).maybeSingle();
        if (mem) filtered.push(s);
      }
      filteredDue = filtered;
      if (filteredDue.length === 0) {
        return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const results: any[] = [];
    for (const s of filteredDue) {
      const res = await runOne(admin, s, gwHeaders);
      const now = new Date();
      const next = new Date(now.getTime() + (s.cadence_minutes || 60) * 60_000).toISOString();
      await admin.from('gmail_sync_schedules').update({
        last_run_at: now.toISOString(),
        next_run_at: next,
        last_status: res.ok ? 'ok' : (res.error || 'error'),
        last_count: res.count ?? 0,
      }).eq('id', s.id);
      results.push({ id: s.id, decision_id: s.decision_id, ...res });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
