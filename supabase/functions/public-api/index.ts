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
    const { data, error } = await admin.from('knowledge_items').select('*').eq('workspace_id', key.workspace_id).contains('tags', ['lesson']).order('created_at', { ascending: false }).limit(100);
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
      tags: ['lesson'],
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

const RELATIONS = ['next_step', 'depends_on', 'subprocess', 'related'];

async function handleProcessLinks(req: Request, key: KeyRow) {
  if (req.method === 'GET') {
    const denied = requireScope(key, 'processes:read', 'viewer');
    if (denied) return denied;
    const url = new URL(req.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '100'), 200);
    const fromId = url.searchParams.get('from_process_id');
    let q = admin
      .from('process_links')
      .select('*')
      .eq('workspace_id', key.workspace_id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (fromId) q = q.eq('from_process_id', fromId);
    const { data, error } = await q;
    if (error) return json({ error: error.message }, 400);
    return json({ data });
  }
  if (req.method === 'POST') {
    const denied = requireScope(key, 'processes:write', 'writer');
    if (denied) return denied;
    const body = await req.json().catch(() => null);
    const from = body?.from_process_id;
    const to = body?.to_process_id;
    const relation = body?.relation ?? 'related';
    if (typeof from !== 'string' || typeof to !== 'string')
      return json({ error: 'from_process_id and to_process_id are required' }, 400);
    if (from === to) return json({ error: 'A process cannot link to itself' }, 400);
    if (!RELATIONS.includes(relation))
      return json({ error: `relation must be one of: ${RELATIONS.join(', ')}` }, 400);

    const { data: procs, error: procErr } = await admin
      .from('processes')
      .select('id')
      .eq('workspace_id', key.workspace_id)
      .in('id', [from, to]);
    if (procErr) return json({ error: procErr.message }, 400);
    if ((procs?.length ?? 0) !== 2) return json({ error: 'Process not found in workspace' }, 404);

    const { data, error } = await admin
      .from('process_links')
      .insert({
        workspace_id: key.workspace_id,
        created_by: key.created_by,
        from_process_id: from,
        to_process_id: to,
        relation,
        note: body?.note ? String(body.note).slice(0, 1000) : null,
      })
      .select()
      .single();
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

// ─── Data OUT: bulk export ─────────────────────────────────────────────────
const EXPORTABLE: Record<string, { table: string; scope: string }> = {
  decisions: { table: 'decisions', scope: 'decisions:read' },
  knowledge: { table: 'knowledge_items', scope: 'knowledge:read' },
  processes: { table: 'processes', scope: 'processes:read' },
  process_links: { table: 'process_links', scope: 'processes:read' },
  projects: { table: 'projects', scope: 'projects:read' },
  clients: { table: 'clients', scope: 'clients:read' },
  risks: { table: 'risks', scope: 'risks:read' },
  meetings: { table: 'meetings', scope: 'meetings:read' },
  audit: { table: 'audit_events', scope: 'audit:read' },
};

function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return '';
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
}

async function handleExport(req: Request, key: KeyRow) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const url = new URL(req.url);
  const requested = (url.searchParams.get('entities') ?? 'decisions')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const format = (url.searchParams.get('format') ?? 'json').toLowerCase();
  const since = url.searchParams.get('since');
  const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '500'), 2000);

  const unknown = requested.filter((e) => !EXPORTABLE[e]);
  if (unknown.length) return json({ error: `Unknown entities: ${unknown.join(', ')}`, available: Object.keys(EXPORTABLE) }, 400);
  if (format === 'csv' && requested.length !== 1) return json({ error: 'CSV export supports exactly one entity' }, 400);

  const out: Record<string, unknown[]> = {};
  for (const name of requested) {
    const { table, scope } = EXPORTABLE[name];
    const denied = requireScope(key, scope, 'viewer');
    if (denied) return denied;
    let q = admin.from(table).select('*').eq('workspace_id', key.workspace_id)
      .order('created_at', { ascending: false }).limit(limit);
    if (since) q = q.gte('updated_at', since);
    const { data, error } = await q;
    if (error) return json({ error: `${name}: ${error.message}` }, 400);
    out[name] = data ?? [];
  }

  if (format === 'csv') {
    const name = requested[0];
    return new Response(toCsv(out[name] as Record<string, unknown>[]), {
      headers: { ...corsHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${name}.csv"` },
    });
  }
  return json({ exported_at: new Date().toISOString(), workspace_id: key.workspace_id, counts: Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length])), data: out });
}

// ─── Data IN: bulk import ──────────────────────────────────────────────────
type Mapper = (r: Record<string, any>, key: KeyRow) => Record<string, unknown> | string;

const IMPORTABLE: Record<string, { table: string; scope: string; map: Mapper }> = {
  decisions: {
    table: 'decisions', scope: 'decisions:write',
    map: (r, key) => !r.title ? 'title is required' : ({
      workspace_id: key.workspace_id, created_by: key.created_by,
      title: String(r.title).slice(0, 500),
      description: r.description ? String(r.description).slice(0, 5000) : null,
      problem_statement: r.problem_statement ? String(r.problem_statement).slice(0, 5000) : null,
      budget: typeof r.budget === 'number' ? r.budget : null,
      risk_level: r.risk_level ?? 'Medium',
      status: 'Draft',
      options_considered: Array.isArray(r.options_considered) ? r.options_considered : [],
    }),
  },
  knowledge: {
    table: 'knowledge_items', scope: 'knowledge:write',
    map: (r, key) => !r.title || !r.content ? 'title and content are required' : ({
      workspace_id: key.workspace_id, created_by: key.created_by,
      title: String(r.title).slice(0, 500),
      content: String(r.content).slice(0, 20000),
      summary: r.summary ? String(r.summary).slice(0, 1000) : String(r.content).slice(0, 300),
      tags: Array.isArray(r.tags) ? r.tags.map(String).slice(0, 20) : [],
      confidentiality: r.confidentiality ?? 'internal',
    }),
  },
  processes: {
    table: 'processes', scope: 'processes:write',
    map: (r, key) => !r.name ? 'name is required' : ({
      workspace_id: key.workspace_id, created_by: key.created_by,
      name: String(r.name).slice(0, 300),
      description: r.description ? String(r.description).slice(0, 5000) : null,
      department: r.department ? String(r.department).slice(0, 120) : null,
    }),
  },
  risks: {
    table: 'risks', scope: 'risks:write',
    map: (r, key) => !r.title ? 'title is required' : ({
      workspace_id: key.workspace_id, created_by: key.created_by,
      title: String(r.title).slice(0, 300),
      description: r.description ? String(r.description).slice(0, 5000) : null,
      severity: r.severity ?? 'medium',
      status: r.status ?? 'new',
      department: r.department ? String(r.department).slice(0, 120) : null,
    }),
  },
};

async function handleImport(req: Request, key: KeyRow) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  const body = await req.json().catch(() => null);
  const entity = body?.entity;
  const records = body?.records;
  if (typeof entity !== 'string' || !IMPORTABLE[entity])
    return json({ error: 'Invalid entity', available: Object.keys(IMPORTABLE) }, 400);
  if (!Array.isArray(records) || records.length === 0)
    return json({ error: 'records must be a non-empty array' }, 400);
  if (records.length > 500) return json({ error: 'Max 500 records per request' }, 400);

  const { table, scope, map } = IMPORTABLE[entity];
  const denied = requireScope(key, scope, 'writer');
  if (denied) return denied;

  const rows: Record<string, unknown>[] = [];
  const errors: { index: number; error: string }[] = [];
  records.forEach((r: unknown, i: number) => {
    if (!r || typeof r !== 'object') { errors.push({ index: i, error: 'record must be an object' }); return; }
    const mapped = map(r as Record<string, any>, key);
    if (typeof mapped === 'string') errors.push({ index: i, error: mapped });
    else rows.push(mapped);
  });

  if (body?.dry_run) return json({ dry_run: true, valid: rows.length, invalid: errors.length, errors });
  if (!rows.length) return json({ inserted: 0, failed: errors.length, errors }, 400);

  const { data, error } = await admin.from(table).insert(rows).select('id');
  if (error) return json({ error: error.message, failed: errors }, 400);

  await admin.from('audit_events').insert({
    workspace_id: key.workspace_id,
    actor_id: key.created_by,
    action: 'api.import',
    entity_type: entity,
    metadata: { inserted: data?.length ?? 0, invalid: errors.length, api_key_id: key.id },
  }).then(() => {}, () => {});

  return json({ inserted: data?.length ?? 0, ids: data?.map((d: any) => d.id) ?? [], invalid: errors.length, errors }, 201);
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
        'GET  /v1/processes          scope=processes:read',
        'GET  /v1/process-links      scope=processes:read (?from_process_id=&limit=)',
        'POST /v1/process-links      scope=processes:write {from_process_id,to_process_id,relation,note}',
        'GET  /v1/export             (?entities=decisions,knowledge,...&format=json|csv&since=ISO&limit=) — needs read scope of each entity',
        'POST /v1/import             {entity, records[], dry_run?} — needs write scope of the entity',
      ],
      exportable_entities: ['decisions', 'knowledge', 'processes', 'process_links', 'projects', 'clients', 'risks', 'meetings', 'audit'],
      importable_entities: ['decisions', 'knowledge', 'processes', 'risks'],
      _endpoints_end: [
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
    if (path === '/v1/processes') return await handleReadOnly(req, auth, 'processes', 'processes:read');
    if (path === '/v1/process-links' || path === '/v1/process-links/') return await handleProcessLinks(req, auth);
    return json({ error: 'Not found', path }, 404);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Server error' }, 500);
  }
});
