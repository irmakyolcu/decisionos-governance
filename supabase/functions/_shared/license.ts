// @ts-nocheck
// -------------------------------------------------------------------
// Offline license verification. Air-gapped safe: no network calls.
// A license key is `base64url(payloadJSON).base64url(ed25519Signature)`
// signed by the vendor's private key; only the raw public key ships.
// -------------------------------------------------------------------

export type LicensePayload = {
  v: number;
  customer: string;
  deployment_id: string;
  seats: number;
  features: string[];
  issued_at: string;
  expires_at: string;
};

export type LicenseStatus = {
  valid: boolean;
  reason?: string;
  mode: 'licensed' | 'grace' | 'unlicensed' | 'cloud';
  customer?: string;
  seats?: number;
  features: string[];
  expires_at?: string;
  days_remaining?: number;
};

const GRACE_DAYS = 14;

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(pad + '==='.slice((pad.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function verifyLicense(
  token: string | undefined,
  publicKeyB64Url: string | undefined,
  deploymentId: string | undefined,
): Promise<LicenseStatus> {
  // Hosted/cloud installs are licensed by contract, not by key file.
  if (!publicKeyB64Url) {
    return { valid: true, mode: 'cloud', features: ['core', 'ai', 'api', 'connectors'] };
  }
  if (!token) {
    return { valid: false, mode: 'unlicensed', reason: 'no_license_key', features: [] };
  }

  const [body, sig] = token.trim().split('.');
  if (!body || !sig) {
    return { valid: false, mode: 'unlicensed', reason: 'malformed_license', features: [] };
  }

  let ok = false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      b64urlToBytes(publicKeyB64Url),
      { name: 'Ed25519' },
      false,
      ['verify'],
    );
    ok = await crypto.subtle.verify(
      { name: 'Ed25519' },
      key,
      b64urlToBytes(sig),
      new TextEncoder().encode(body),
    );
  } catch (_e) {
    ok = false;
  }
  if (!ok) {
    return { valid: false, mode: 'unlicensed', reason: 'bad_signature', features: [] };
  }

  let payload: LicensePayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(body)));
  } catch {
    return { valid: false, mode: 'unlicensed', reason: 'malformed_payload', features: [] };
  }

  // The key is bound to one installation, so it cannot be copied to another host.
  if (deploymentId && payload.deployment_id && payload.deployment_id !== deploymentId) {
    return { valid: false, mode: 'unlicensed', reason: 'deployment_mismatch', features: [] };
  }

  const expires = new Date(payload.expires_at).getTime();
  const daysRemaining = Math.floor((expires - Date.now()) / 86_400_000);

  const base = {
    customer: payload.customer,
    seats: payload.seats,
    features: payload.features ?? [],
    expires_at: payload.expires_at,
    days_remaining: daysRemaining,
  };

  if (daysRemaining >= 0) return { valid: true, mode: 'licensed', ...base };
  // Expired licenses degrade gracefully instead of locking the customer out.
  if (daysRemaining >= -GRACE_DAYS) {
    return { valid: true, mode: 'grace', reason: 'expired_in_grace', ...base };
  }
  return { valid: false, mode: 'unlicensed', reason: 'expired', ...base };
}

/** Reads the license from the container environment and verifies it. */
export async function currentLicense(): Promise<LicenseStatus> {
  return await verifyLicense(
    Deno.env.get('DECISIONOS_LICENSE') ?? undefined,
    Deno.env.get('DECISIONOS_LICENSE_PUBLIC_KEY') ?? undefined,
    Deno.env.get('DEPLOYMENT_ID') ?? undefined,
  );
}

/** Guard for feature-gated endpoints. Returns null when allowed. */
export async function requireFeature(feature: string): Promise<Response | null> {
  const lic = await currentLicense();
  if (!lic.valid) {
    return new Response(
      JSON.stringify({ error: 'license_invalid', reason: lic.reason }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }
  if (lic.mode !== 'cloud' && !lic.features.includes(feature)) {
    return new Response(
      JSON.stringify({ error: 'feature_not_licensed', feature }),
      { status: 402, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return null;
}
