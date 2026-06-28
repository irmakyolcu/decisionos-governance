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
    // Prefer text/plain
    const plain = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (plain) return extractTextFromPayload(plain);
    for (const p of payload.parts) {
      const t = extractTextFromPayload(p);
      if (t) return t;
    }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const LOVABLE_KEY = Deno.env.get('LOVABLE_API_KEY');
    const GMAIL_KEY = Deno.env.get('GOOGLE_MAIL_API_KEY');
    if (!LOVABLE_KEY || !GMAIL_KEY) {
      return new Response(JSON.stringify({ error: 'Gmail connection not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { decision_id, query, max = 10 } = await req.json();
    if (!decision_id) return new Response(JSON.stringify({ error: 'decision_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // Verify decision and get workspace
    const { data: decision, error: decErr } = await supabase.from('decisions').select('id, workspace_id, title').eq('id', decision_id).maybeSingle();
    if (decErr || !decision) return new Response(JSON.stringify({ error: 'Decision not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const gwHeaders = {
      'Authorization': `Bearer ${LOVABLE_KEY}`,
      'X-Connection-Api-Key': GMAIL_KEY,
    };

    const q = query?.trim() || decision.title;
    const listUrl = `${GATEWAY}/users/me/messages?maxResults=${Math.min(Number(max) || 10, 25)}&q=${encodeURIComponent(q)}`;
    const listRes = await fetch(listUrl, { headers: gwHeaders });
    if (!listRes.ok) {
      const body = await listRes.text();
      return new Response(JSON.stringify({ error: 'Gmail list failed', status: listRes.status, body }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const list = await listRes.json();
    const messages = list.messages ?? [];

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const synced: any[] = [];

    for (const m of messages) {
      const mRes = await fetch(`${GATEWAY}/users/me/messages/${m.id}?format=full`, { headers: gwHeaders });
      if (!mRes.ok) continue;
      const msg = await mRes.json();
      const headers = msg.payload?.headers ?? [];
      const subject = header(headers, 'Subject') || '(no subject)';
      const from = header(headers, 'From');
      const dateStr = header(headers, 'Date');
      const dateIso = dateStr ? new Date(dateStr).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const text = extractTextFromPayload(msg.payload).replace(/\s+/g, ' ').trim().slice(0, 2000);
      const attachments = collectAttachments(msg.payload).filter(Boolean);

      const summary = [
        `[Gmail] ${subject}`,
        `From: ${from}`,
        attachments.length ? `Attachments: ${attachments.join(', ')}` : null,
        '',
        text || msg.snippet || '',
      ].filter(Boolean).join('\n');

      // De-dup by checking existing summary prefix
      const { data: existing } = await admin
        .from('decision_evidence')
        .select('id')
        .eq('decision_id', decision_id)
        .eq('source', `gmail:${m.id}`)
        .maybeSingle();
      if (existing) { synced.push({ id: m.id, skipped: true }); continue; }

      const { error: insErr } = await admin.from('decision_evidence').insert({
        workspace_id: decision.workspace_id,
        decision_id,
        source: `gmail:${m.id}`,
        source_date: dateIso,
        owner: from,
        reliability: 'medium',
        is_verified: false,
        summary,
      });
      if (!insErr) synced.push({ id: m.id, subject, from, date: dateIso, attachments });
    }

    // Audit
    await admin.from('audit_events').insert({
      workspace_id: decision.workspace_id,
      event_type: 'integration.gmail_sync',
      decision_id,
      actor_user_id: user.id,
      reason: `Synced ${synced.filter(s => !s.skipped).length} email(s) from Gmail (query: "${q}")`,
    }).catch(() => {});

    return new Response(JSON.stringify({ ok: true, query: q, count: synced.length, synced }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
