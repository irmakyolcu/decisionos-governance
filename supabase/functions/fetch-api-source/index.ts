import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);
    const supa = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authErr } = await supa.auth.getClaims(token);
    if (authErr || !claims?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claims.claims.sub;

    const { workspace_id, title, url, method = 'GET', headers = {}, body, confidentiality = 'internal', auth } = await req.json();
    if (!workspace_id || !url) return json({ error: 'workspace_id and url required' }, 400);

    // Build auth headers from structured auth object
    const authHeaders: Record<string, string> = {};
    if (auth && typeof auth === 'object') {
      if (auth.type === 'bearer' && auth.token) {
        authHeaders['Authorization'] = `Bearer ${auth.token}`;
      } else if (auth.type === 'api_key' && auth.key_name && auth.key_value) {
        if (auth.location === 'query') {
          // handled below when building URL
        } else {
          authHeaders[auth.key_name] = auth.key_value;
        }
      } else if (auth.type === 'basic' && auth.username != null) {
        const encoded = btoa(`${auth.username}:${auth.password ?? ''}`);
        authHeaders['Authorization'] = `Basic ${encoded}`;
      }
    }

    // Validate URL
    let target: URL;
    try { target = new URL(url); } catch { return json({ error: 'invalid url' }, 400); }
    if (!['http:', 'https:'].includes(target.protocol)) return json({ error: 'only http(s) allowed' }, 400);
    // API key in query string
    if (auth && auth.type === 'api_key' && auth.location === 'query' && auth.key_name && auth.key_value) {
      target.searchParams.set(auth.key_name, auth.key_value);
    }

    // Block private/link-local ranges (basic SSRF guard)
    const host = target.hostname;
    if (
      host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' ||
      /^10\./.test(host) || /^192\.168\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
      /^169\.254\./.test(host) || host.endsWith('.local')
    ) return json({ error: 'private hosts are not allowed' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: memberOk } = await admin.rpc('is_workspace_member', { _user_id: userId, _workspace_id: workspace_id });
    if (!memberOk) return json({ error: 'forbidden' }, 403);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    let resp: Response;
    try {
      resp = await fetch(target.toString(), {
        method,
        headers: { Accept: 'application/json, text/*;q=0.9, */*;q=0.5', ...headers },
        body: body && method !== 'GET' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
      });
    } catch (e: any) {
      return json({ error: `fetch failed: ${e.message}` }, 502);
    } finally { clearTimeout(t); }

    const ct = resp.headers.get('content-type') || 'text/plain';
    const raw = await resp.text();
    if (!resp.ok) return json({ error: `Upstream ${resp.status}`, body: raw.slice(0, 500) }, 502);
    const truncated = raw.slice(0, 200000);

    const finalTitle = title || `API: ${target.hostname}${target.pathname}`;
    const { data: doc, error: docErr } = await admin.from('uploaded_documents').insert({
      workspace_id, created_by: userId,
      title: finalTitle,
      content_text: truncated,
      mime_type: ct,
      source_kind: 'api',
      confidentiality,
      process_status: 'indexed',
      metadata: { url: target.toString(), method, fetched_at: new Date().toISOString() },
    }).select().single();
    if (docErr) return json({ error: docErr.message }, 400);

    await admin.from('knowledge_items').insert({
      workspace_id, created_by: userId, document_id: doc.id,
      title: finalTitle,
      content: truncated.slice(0, 5000),
      summary: `Fetched from ${target.toString()}`,
      confidentiality,
      source_date: new Date().toISOString(),
    });

    // Also register as a data_source for visibility
    await admin.from('data_sources').insert({
      workspace_id, created_by: userId, kind: 'api', label: finalTitle,
      status: 'connected', config: { url: target.toString(), method },
    });

    return json({ ok: true, document_id: doc.id, length: truncated.length, content_type: ct });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
