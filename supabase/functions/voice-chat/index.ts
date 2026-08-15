// Conversational CEO Twin — text chat over Lovable AI Gateway
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiChat, AiError } from "../_shared/aiClient.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function requireUser(req: Request): Promise<Response | null> {
  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await supabase.auth.getClaims(authHeader.slice(7));
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  return null;
}

const SYSTEM_PROMPT = `You are the CEO Digital Twin inside DecisionOS — an executive judgment layer that preserves founder judgment as the company scales.

Voice & style:
- Speak as a confident, decisive operator: short sentences, direct, no fluff.
- Reduce CEO bottlenecks. Escalate only what truly needs executive judgment.
- Turn past decisions into reusable operating logic.
- Help teams move without waiting for the CEO.

When the user asks a question:
1. Give the call (recommended action) in 1–2 sentences.
2. Briefly state the reasoning (1–2 sentences) grounded in CEO logic.
3. State delegation level: team can decide / needs manager approval / needs CEO approval / escalate.
Keep total response under 90 words so it reads well aloud.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const unauth = await requireUser(req);
    if (unauth) return unauth;

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let reply = "";
    try {
      reply = await aiChat({
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      });
    } catch (err) {
      if (err instanceof AiError) {
        return new Response(JSON.stringify({ error: err.detail || `Upstream ${err.status}` }), {
          status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
