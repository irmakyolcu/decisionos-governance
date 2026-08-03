// @ts-nocheck
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import {
  SUPPORTED_CONNECTORS,
  authorizeAppUser,
  getClientApiKey,
} from '../_shared/appUserConnector.ts';

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { action = 'status', connector_id, return_url } = await req.json().catch(() => ({}));

    // Which connectors have a configured client?
    if (action === 'status') {
      const { data: rows } = await admin
        .from('app_user_connections')
        .select('connector_id, status, connected_at')
        .eq('user_id', user.id);

      const connectors = SUPPORTED_CONNECTORS.map((id) => {
        const row = rows?.find((r: any) => r.connector_id === id);
        return {
          connector_id: id,
          configured: !!getClientApiKey(id),
          status: row?.status ?? 'disconnected',
          connected_at: row?.connected_at ?? null,
        };
      });
      return json({ connectors });
    }

    if (action === 'authorize') {
      if (!SUPPORTED_CONNECTORS.includes(connector_id)) {
        return json({ error: 'Unsupported connector' }, 400);
      }
      if (!getClientApiKey(connector_id)) {
        return json({ error: 'connector_not_configured', connector_id }, 409);
      }

      // Workspace of the signed-in user
      const { data: member } = await admin
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (!member) return json({ error: 'No workspace membership' }, 403);

      const { data: existing } = await admin
        .from('app_user_connections')
        .select('connection_key')
        .eq('user_id', user.id)
        .eq('connector_id', connector_id)
        .maybeSingle();

      const { authorizationUrl, connectionKey } = await authorizeAppUser({
        connectorId: connector_id,
        appUserId: user.id,
        returnUrl: return_url || 'https://decisionosai.com/meeting-sources',
        connectionKey: existing?.connection_key ?? null,
      });

      await admin.from('app_user_connections').upsert(
        {
          workspace_id: member.workspace_id,
          user_id: user.id,
          connector_id,
          connection_key: connectionKey ?? existing?.connection_key ?? null,
          status: 'connected',
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,connector_id' },
      );

      return json({ authorization_url: authorizationUrl });
    }

    if (action === 'disconnect') {
      await admin
        .from('app_user_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('connector_id', connector_id);
      return json({ ok: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (e) {
    console.error('app-user-connect error:', e);
    return json({ error: String(e?.message ?? e) }, 500);
  }
});
