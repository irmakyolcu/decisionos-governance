// @ts-nocheck
// Shared helpers for App User Connectors (per-end-user OAuth via Lovable connector gateway).

export const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev';

export type ConnectorId = 'slack' | 'google_calendar' | 'microsoft_teams';

export const SUPPORTED_CONNECTORS: ConnectorId[] = ['slack', 'google_calendar', 'microsoft_teams'];

export const CONNECTOR_SCOPES: Record<ConnectorId, string[]> = {
  slack: [
    'channels:read',
    'channels:history',
    'groups:read',
    'groups:history',
    'users:read',
  ],
  google_calendar: [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events.readonly',
  ],
  microsoft_teams: [
    'openid',
    'profile',
    'email',
    'offline_access',
    'Team.ReadBasic.All',
    'Channel.ReadBasic.All',
    'ChannelMessage.Read.All',
  ],
};

/** Provider API base path appended after the connector id in gateway proxy calls. */
export const CONNECTOR_API_BASE: Record<ConnectorId, string> = {
  slack: '',
  google_calendar: '',
  microsoft_teams: '',
};

export function clientApiKeyEnvName(connectorId: ConnectorId): string {
  return `${connectorId.toUpperCase()}_APP_USER_CONNECTOR_CLIENT_API_KEY`;
}

export function getClientApiKey(connectorId: ConnectorId): string | null {
  return Deno.env.get(clientApiKeyEnvName(connectorId)) ?? null;
}

/** Starts per-user OAuth consent and returns the provider authorization URL + connection key. */
export async function authorizeAppUser(opts: {
  connectorId: ConnectorId;
  appUserId: string;
  returnUrl: string;
  connectionKey?: string | null;
}): Promise<{ authorizationUrl: string; connectionKey: string | null }> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');
  const clientKey = getClientApiKey(opts.connectorId);
  if (!clientKey) {
    throw new Error(
      `${clientApiKeyEnvName(opts.connectorId)} is not configured. Connect the App User Connector client for "${opts.connectorId}" first.`,
    );
  }

  const body: Record<string, unknown> = {
    connector_id: opts.connectorId,
    app_user_id: opts.appUserId,
    return_url: opts.returnUrl,
    credentials_configuration: { scopes: CONNECTOR_SCOPES[opts.connectorId] },
  };
  if (opts.connectionKey) body.connection_key = opts.connectionKey;

  const res = await fetch(`${GATEWAY_BASE_URL}/api/v1/app-users/oauth2/authorize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      'X-Client-Api-Key': clientKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`[${res.status}] ${text}`);

  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Gateway returned non-JSON: ${text.slice(0, 300)}`);
  }

  const authorizationUrl =
    data.authorization_url ?? data.authorizationUrl ?? data.url ?? data.redirect_url;
  const connectionKey =
    data.connection_key ?? data.connectionKey ?? data.app_user_connection_key ?? null;

  if (!authorizationUrl) throw new Error(`No authorization URL in gateway response: ${text.slice(0, 300)}`);
  return { authorizationUrl, connectionKey };
}

/** Calls the provider API on behalf of one app user through the connector gateway. */
export async function callAsAppUser(opts: {
  connectorId: ConnectorId;
  connectionKey: string;
  path: string;
  init?: RequestInit;
}): Promise<Response> {
  const lovableKey = Deno.env.get('LOVABLE_API_KEY');
  if (!lovableKey) throw new Error('LOVABLE_API_KEY is not configured');

  const url = `${GATEWAY_BASE_URL}/${opts.connectorId}${opts.path}`;
  const headers = new Headers(opts.init?.headers ?? {});
  headers.set('Authorization', `Bearer ${lovableKey}`);
  headers.set('X-Connection-Api-Key', opts.connectionKey);

  return await fetch(url, { ...opts.init, headers });
}
