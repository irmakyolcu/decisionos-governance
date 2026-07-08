import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) return json({ error: "unauthorized" }, 401);

    const { question, workspace_id, conversation_id, history } = await req.json();
    if (!question || !workspace_id) return json({ error: "missing fields" }, 400);

    // Retrieve relevant knowledge via FTS
    const { data: ki } = await supabase
      .from("knowledge_items")
      .select("id,title,content,summary,source_url,source_date,entity_type,entity_id")
      .eq("workspace_id", workspace_id)
      .textSearch("title", question.split(/\s+/).slice(0, 6).join(" | "), { config: "english" })
      .limit(6);

    // Also pull recent decisions as fallback context
    const { data: decisions } = await supabase
      .from("decisions")
      .select("id,title,description,status,created_at")
      .eq("workspace_id", workspace_id)
      .order("created_at", { ascending: false })
      .limit(4);

    const sources = [
      ...(ki ?? []).map((k) => ({
        id: k.id, kind: "knowledge", title: k.title,
        snippet: (k.summary || k.content || "").slice(0, 400),
        date: k.source_date, url: k.source_url,
      })),
      ...(decisions ?? []).map((d) => ({
        id: d.id, kind: "decision", title: d.title,
        snippet: (d.description || "").slice(0, 300), date: d.created_at,
      })),
    ];

    const contextBlock = sources.length
      ? sources.map((s, i) => `[${i + 1}] (${s.kind}) ${s.title}\n${s.snippet}`).join("\n\n")
      : "No indexed company knowledge yet.";

    const systemPrompt = `You are DecisionOS, a permission-aware Company Brain. Answer strictly from provided company context. If context is insufficient, say so honestly and suggest what to upload. Always cite source numbers like [1], [2]. Respond ONLY with valid JSON matching this exact schema:
{
  "answer": "concise markdown answer with [n] citation markers",
  "confidence": 0.0 to 1.0,
  "citations": [ { "index": 1, "source_id": "uuid", "kind": "knowledge|decision", "title": "..." } ],
  "suggested_action": "one-sentence next step for the user"
}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(Array.isArray(history) ? history.slice(-6) : []),
      { role: "user", content: `Company context:\n${contextBlock}\n\nQuestion: ${question}` },
    ];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": Deno.env.get("LOVABLE_API_KEY")!,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) return json({ error: "rate_limited", detail: errText }, 429);
      if (aiRes.status === 402) return json({ error: "credits_exhausted", detail: errText }, 402);
      return json({ error: "ai_error", detail: errText }, 500);
    }

    const aiData = await aiRes.json();
    const raw = aiData.choices?.[0]?.message?.content ?? "{}";
    let parsed: any;
    try { parsed = JSON.parse(raw); }
    catch { parsed = { answer: raw, confidence: 0.5, citations: [], suggested_action: "" }; }

    // Enrich citations with source data
    const enrichedCitations = (parsed.citations ?? []).map((c: any) => {
      const src = sources[Number(c.index) - 1];
      return src ? { ...c, source_id: src.id, title: src.title, kind: src.kind, snippet: src.snippet, date: src.date } : c;
    });

    return json({
      answer: parsed.answer ?? "",
      confidence: Number(parsed.confidence ?? 0.5),
      citations: enrichedCitations,
      suggested_action: parsed.suggested_action ?? "",
      sources_considered: sources.length,
    });
  } catch (e) {
    return json({ error: "internal", detail: String(e) }, 500);
  }
});

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
