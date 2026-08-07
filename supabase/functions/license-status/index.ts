// @ts-nocheck
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { currentLicense } from '../_shared/license.ts';
import { aiConfig, aiEnabled } from '../_shared/aiClient.ts';

// Public read-only endpoint: the app needs it before/while signing in
// so it can show an expiry banner or block a de-licensed install.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const license = await currentLicense();

    let ai: Record<string, unknown> = { enabled: false };
    try {
      const cfg = aiConfig();
      ai = { enabled: aiEnabled(), on_premise: cfg.onPrem, model: cfg.chatModel };
    } catch (e) {
      ai = { enabled: false, error: String(e?.message ?? e) };
    }

    return new Response(
      JSON.stringify({
        deployment: Deno.env.get('DEPLOYMENT_ID') ? 'on-premise' : 'cloud',
        license,
        ai,
        outbound_internet:
          (Deno.env.get('ALLOW_OUTBOUND_INTERNET') ?? 'true') !== 'false',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
