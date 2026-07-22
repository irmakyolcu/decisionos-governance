// Public REST API — workspace-scoped, API-key auth, role + scope rules
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-api-key, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

async function sha256Hex(input: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

type Role = 'viewer' | 'writer' | 'admin';
const ROLE_RANK: Record<Role, number> = { viewer: 0, writer: 1, admin: 2 };

interface KeyRow {
  id: string;
  workspace_id: string;
  role: Role;
  scopes: string[];
  revoked_at: string | null;
  created_by: string;
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false } },
);

async function authenticate(req: Request): Promise<KeyRow | Response> {
  const raw =
    req.headers.get('x-api-key') ||
    req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    '';
  if (!raw || !raw.startsWith('dos_')) return json({ error: 'Missing or invalid API key' }, 401);
  const hash = await sha256Hex(raw);
  const { data, error } = await admin
    .from('api_keys')
    .select('id, workspace_id, role, scopes, revoked_at, created_by')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .maybeSingle();
  if (error || !data) return json({ error: 'Invalid API key' }, 401);
  admin.from('api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id).then(() => {});
  return data as KeyRow;
}

function requireScope(key: KeyRow, scope: string, minRole: Role): Response | null {
  const hasScope = key.scopes.includes(scope) || key.scopes.includes('*');
  const hasRole = ROLE_RANK[key.role] >= ROLE_RANK[minRole];
  if (!hasScope) return json({ error: `Missing scope: ${scope}` }, 403);
  if (!hasRole) return json({ error: `Requires role: ${minRole}` }, 403);
  return null;
}

// ─── Route handlers ────────────────────────────────────────────────────────
async function handleDecisions(req: Request, key: KeyRow, id?: string) {
  if (req.method === 'GET') {
    const denied = requireScope(key, 'decisions:read', 'viewer');
    if (denied) return denied;
    if (id) {
      const { data, error } = await admin.from('decisions').select('*').eq('workspace_id', key.workspace_id).eq('id', id).maybeSingle();
      if (error) return json({ error: error.message }, 400);
      if (!data) return json({ error: 'Not found' }, 404);
      return json({ data });
    }
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
    const { data, error } = await admin.from('decisions').select('*').eq('workspace_id', key.workspace_id).order('created_at', { ascending: false }).limit(limit);
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }
  if (req.method === 'POST') {
    const denied = requireScope(key, 'decisions:write', 'writer');
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    if (!body?.title) return json({ error: 'title is required' }, 400);
    const { data, error } = await admin.from('decisions').insert({
      workspace_id: key.workspace_id,
      title: String(body.title).slice(0, 500),
      description: body.description ? String(body.description).slice(0, 5000) : null,
      problem_statement: body.problem_statement ? String(body.problem_statement).slice(0, 5000) : null,
      budget: typeof body.budget === 'number' ? body.budget : null,
      risk_level: body.risk_level ?? 'Medium',
      status: 'Draft',
      created_by: key.created_by, // placeholder; api-key acts on workspace behalf
      options_considered: Array.isArray(body.options_considered) ? body.options_considered : [],
    }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleLessons(req: Request, key: KeyRow) {
  if (req.method === 'GET') {
    const denied = requireScope(key, 'lessons:read', 'viewer');
    if (denied) return denied;
    const { data, error } = await admin.from('knowledge_items').select('*').eq('workspace_id', key.workspace_id).eq('kind', 'lesson').order('created_at', { ascending: false }).limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }
  if (req.method === 'POST') {
    const denied = requireScope(key, 'lessons:write', 'writer');
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    if (!body?.title) return json({ error: 'title is required' }, 400);
    const { data, error } = await admin.from('knowledge_items').insert({
      workspace_id: key.workspace_id,
      title: String(body.title).slice(0, 500),
      content: body.content ? String(body.content).slice(0, 10000) : '',
      summary: body.summary ? String(body.summary).slice(0, 1000) : null,
      kind: 'lesson',
      confidentiality: 'internal',
      created_by: key.created_by,
    }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleKnowledge(req: Request, key: KeyRow) {
  if (req.method === 'GET') {
    const denied = requireScope(key, 'knowledge:read', 'viewer');
    if (denied) return denied;
    const { data, error } = await admin.from('knowledge_items').select('*').eq('workspace_id', key.workspace_id).order('created_at', { ascending: false }).limit(100);
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }
  if (req.method === 'POST') {
    const denied = requireScope(key, 'knowledge:write', 'writer');
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    if (!body?.title || !body?.content) return json({ error: 'title and content required' }, 400);
    const { data, error } = await admin.from('knowledge_items').insert({
      workspace_id: key.workspace_id,
      title: String(body.title).slice(0, 500),
      content: String(body.content).slice(0, 20000),
      summary: body.summary ? String(body.summary).slice(0, 1000) : String(body.content).slice(0, 300),
      confidentiality: body.confidentiality ?? 'internal',
      created_by: key.created_by,
    }).select().single();
    if (error) return json({ error: error.message }, 400);
    return json({ data }, 201);
  }
  return json({ error: 'Method not allowed' }, 405);
}

async function handleReadOnly(req: Request, key: KeyRow, table: string, scope: string) {
  if (req.method !== 'GET') return json({ error: 'Read-only endpoint' }, 405);
  const denied = requireScope(key, scope, 'viewer');
  if (denied) return denied;
  const { data, error } = await admin.from(table).select('*').eq('workspace_id', key.workspace_id).order('created_at', { ascending: false }).limit(100);
  if (error) return json({ error: error.message }, 400);
  return json({ data });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip function prefix: /public-api/v1/...
  const path = url.pathname.replace(/^.*\/public-api/, '') || '/';

  if (path === '/' || path === '/v1' || path === '/v1/') {
    return json({
      name: 'DecisionOS Public API',
      version: '1.0',
      auth: 'Send X-API-Key header (or Authorization: Bearer <key>)',
      endpoints: [
        'GET  /v1/decisions          scope=decisions:read',
        'GET  /v1/decisions/:id      scope=decisions:read',
        'POST /v1/decisions          scope=decisions:write',
        'GET  /v1/lessons            scope=lessons:read',
        'POST /v1/lessons            scope=lessons:write',
        'GET  /v1/knowledge          scope=knowledge:read',
        'POST /v1/knowledge          scope=knowledge:write',
        'GET  /v1/notifications      scope=notifications:read',
        'GET  /v1/audit              scope=audit:read',
      ],
    });
  }

  const auth = await authenticate(req);
  if (auth instanceof Response) return auth;

  try {
    const m = path.match(/^\/v1\/decisions(?:\/([^/]+))?\/?$/);
    if (m) return await handleDecisions(req, auth, m[1]);
    if (path === '/v1/lessons') return await handleLessons(req, auth);
    if (path === '/v1/knowledge') return await handleKnowledge(req, auth);
    if (path === '/v1/notifications') return await handleReadOnly(req, auth, 'notifications', 'notifications:read');
    if (path === '/v1/audit') return await handleReadOnly(req, auth, 'audit_events', 'audit:read');
    return json({ error: 'Not found', path }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
