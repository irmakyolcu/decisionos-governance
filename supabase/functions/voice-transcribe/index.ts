// Speech-to-text via Lovable AI Gateway
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiTranscribe, AiError } from "../_shared/aiClient.ts";

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const unauth = await requireUser(req);
    if (unauth) return unauth;

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size < 256) {
      return new Response(JSON.stringify({ error: "Empty or missing audio file" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mime = (file.type || "audio/webm").split(";")[0];
    const ext = ({ "audio/webm": "webm", "audio/mp4": "mp4", "audio/mpeg": "mp3", "audio/wav": "wav" } as Record<string, string>)[mime] ?? "webm";

    let text = "";
    try {
      text = await aiTranscribe(file, `recording.${ext}`);
    } catch (err) {
      if (err instanceof AiError) {
        return new Response(JSON.stringify({ error: err.detail || `Upstream ${err.status}` }), {
          status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw err;
    }

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
