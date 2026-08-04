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

    // Resolve host to IPs and reject any private/loopback/link-local destination (SSRF guard)
    const hostCheck = await assertPublicHost(target.hostname);
    if (hostCheck) return json({ error: hostCheck }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: memberOk } = await admin.rpc('is_workspace_member', { _user_id: userId, _workspace_id: workspace_id });
    if (!memberOk) return json({ error: 'forbidden' }, 403);

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 15000);
    let resp: Response;
    try {
      let current = target;
      let hops = 0;
      // Follow redirects manually, re-validating the destination each hop
      for (;;) {
        resp = await fetch(current.toString(), {
          method,
          headers: { Accept: 'application/json, text/*;q=0.9, */*;q=0.5', ...headers, ...authHeaders },
          body: body && method !== 'GET' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
          signal: controller.signal,
          redirect: 'manual',
        });
        if (![301, 302, 303, 307, 308].includes(resp.status)) break;
        const loc = resp.headers.get('location');
        if (!loc || ++hops > 3) return json({ error: 'too many redirects' }, 502);
        const next = new URL(loc, current);
        if (!['http:', 'https:'].includes(next.protocol)) return json({ error: 'only http(s) allowed' }, 400);
        const redirCheck = await assertPublicHost(next.hostname);
        if (redirCheck) return json({ error: redirCheck }, 400);
        current = next;
      }
    } catch (e: any) {
      return json({ error: `fetch failed: ${e.message}` }, 502);
    } finally { clearTimeout(t); }

    const ct = resp.headers.get('content-type') || 'text/plain';
    const raw = await resp.text();
    if (!resp.ok) return json({ error: `Upstream ${resp.status}`, body: raw.slice(0, 500) }, 502);
    const truncated = raw.slice(0, 200000);

    // Never persist credentials (query API keys, tokens, passwords)
    const safeUrl = `${target.origin}${target.pathname}`;

    const finalTitle = title || `API: ${target.hostname}${target.pathname}`;
    const { data: doc, error: docErr } = await admin.from('uploaded_documents').insert({
      workspace_id, created_by: userId,
      title: finalTitle,
      content_text: truncated,
      mime_type: ct,
      source_kind: 'api',
      confidentiality,
      process_status: 'indexed',
      metadata: { url: safeUrl, method, fetched_at: new Date().toISOString() },
    }).select().single();
    if (docErr) return json({ error: docErr.message }, 400);

    await admin.from('knowledge_items').insert({
      workspace_id, created_by: userId, document_id: doc.id,
      title: finalTitle,
      content: truncated.slice(0, 5000),
      summary: `Fetched from ${safeUrl}`,
      confidentiality,
      source_date: new Date().toISOString(),
    });

    // Register as a data_source for visibility. Credentials are NOT stored:
    // only the auth scheme is recorded so the UI can prompt for re-entry.
    await admin.from('data_sources').insert({
      workspace_id, created_by: userId, kind: 'api', label: finalTitle,
      status: 'connected',
      config: { url: safeUrl, method, auth_type: auth?.type ?? null, credentials_stored: false },
    });

    return json({ ok: true, document_id: doc.id, length: truncated.length, content_type: ct });
  } catch (e: any) {
    return json({ error: e.message }, 500);
  }
});

function normalizeIpLiteral(host: string): string | null {
  let h = host.trim().toLowerCase();
  if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
  // IPv4 dotted-quad
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(h)) return h;
  // IPv6
  if (h.includes(':')) return h;
  // decimal / hex / octal encodings of an IPv4 address
  let n: number | null = null;
  if (/^0x[0-9a-f]+$/.test(h)) n = parseInt(h, 16);
  else if (/^0[0-7]+$/.test(h)) n = parseInt(h, 8);
  else if (/^\d+$/.test(h)) n = parseInt(h, 10);
  if (n !== null && Number.isFinite(n) && n >= 0 && n <= 0xffffffff) {
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  return null;
}

function isBlockedIp(ip: string): boolean {
  let addr = ip.toLowerCase();
  if (addr.startsWith('[') && addr.endsWith(']')) addr = addr.slice(1, -1);
  const zone = addr.indexOf('%');
  if (zone !== -1) addr = addr.slice(0, zone);

  if (addr.includes(':')) {
    // IPv4-mapped / embedded IPv6 (e.g. ::ffff:127.0.0.1)
    const embedded = addr.match(/(\d{1,3}(?:\.\d{1,3}){3})$/);
    if (embedded) return isBlockedIp(embedded[1]);
    if (addr === '::' || addr === '::1') return true;
    if (/^f[cd][0-9a-f]{2}:/.test(addr)) return true; // unique local fc00::/7
    if (/^fe[89ab][0-9a-f]:/.test(addr)) return true; // link-local fe80::/10
    return false;
  }

  const parts = addr.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 192 && b === 0) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a === 198 && (b === 18 || b === 19)) return true;
  if (a >= 224) return true; // multicast / reserved
  return false;
}

/** Returns an error message when the host resolves to a non-public address, otherwise null. */
async function assertPublicHost(hostname: string): Promise<string | null> {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    return 'private hosts are not allowed';
  }

  const literal = normalizeIpLiteral(host);
  if (literal) return isBlockedIp(literal) ? 'private hosts are not allowed' : null;

  let addresses: string[] = [];
  try {
    const [v4, v6] = await Promise.allSettled([
      Deno.resolveDns(host, 'A'),
      Deno.resolveDns(host, 'AAAA'),
    ]);
    if (v4.status === 'fulfilled') addresses.push(...v4.value);
    if (v6.status === 'fulfilled') addresses.push(...v6.value);
  } catch {
    return 'host could not be resolved';
  }
  if (addresses.length === 0) return 'host could not be resolved';
  if (addresses.some(isBlockedIp)) return 'private hosts are not allowed';
  return null;
}

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
