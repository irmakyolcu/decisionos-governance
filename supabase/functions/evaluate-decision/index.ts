// Edge function: evaluate a decision with Lovable AI and store the result in ai_evaluations
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface EvalRequest {
  decisionId: string;
}

const evaluationTool = {
  type: "function",
  function: {
    name: "submit_decision_evaluation",
    description:
      "Return a quantitative evaluation of a corporate decision based on its description, budget and risk.",
    parameters: {
      type: "object",
      properties: {
        change_percentage: {
          type: "number",
          description: "Overall recommended change vs original plan, as a percentage (-100 to 100).",
        },
        budget_change: {
          type: "number",
          description: "Recommended budget change in percent (e.g. -12 means reduce 12%).",
        },
        timeline_change: {
          type: "number",
          description: "Recommended timeline change in percent.",
        },
        risk_change: {
          type: "number",
          description: "Risk score change in points (-50 to 50). Negative = improvement.",
        },
        expected_roi: {
          type: "number",
          description: "Expected ROI as a percentage.",
        },
        risk_adjusted_roi: {
          type: "number",
          description: "Risk adjusted ROI as a percentage.",
        },
        break_even_months: {
          type: "integer",
          description: "Estimated months until break-even.",
        },
        expected_value: {
          type: "number",
          description: "Expected value in the same currency as budget.",
        },
        summary: {
          type: "string",
          description: "Short executive summary (3-4 sentences) explaining the evaluation.",
        },
        impact_breakdown: {
          type: "array",
          description: "4-6 components describing the impact.",
          items: {
            type: "object",
            properties: {
              component: { type: "string" },
              change: { type: "string" },
              impact: { type: "string" },
            },
            required: ["component", "change", "impact"],
            additionalProperties: false,
          },
        },
      },
      required: [
        "change_percentage",
        "budget_change",
        "timeline_change",
        "risk_change",
        "expected_roi",
        "risk_adjusted_roi",
        "break_even_months",
        "expected_value",
        "summary",
        "impact_breakdown",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Verify caller
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as EvalRequest;
    if (!body?.decisionId) {
      return new Response(JSON.stringify({ error: "decisionId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for DB writes (after we authorise via membership check)
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: decision, error: dErr } = await admin
      .from("decisions")
      .select("id, workspace_id, title, description, problem_statement, budget, risk_level, status, options_considered")
      .eq("id", body.decisionId)
      .maybeSingle();

    if (dErr || !decision) {
      return new Response(JSON.stringify({ error: "Decision not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Membership check
    const { data: membership } = await admin
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", decision.workspace_id)
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Evaluate this corporate decision and call submit_decision_evaluation with quantitative results.

Title: ${decision.title}
Description: ${decision.description}
Problem statement: ${decision.problem_statement}
Budget (EUR): ${decision.budget}
Risk level: ${decision.risk_level}
Options considered: ${JSON.stringify(decision.options_considered)}

Be realistic and conservative. Use the budget value as basis for expected_value.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a senior corporate decision analyst. Always respond by calling the provided tool with realistic, well-reasoned numbers.",
          },
          { role: "user", content: userPrompt },
        ],
        tools: [evaluationTool],
        tool_choice: { type: "function", function: { name: "submit_decision_evaluation" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(
          JSON.stringify({ error: "Lovable AI credits exhausted. Add credits in Settings > Workspace > Usage." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI evaluation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in AI response", JSON.stringify(aiJson));
      return new Response(JSON.stringify({ error: "AI did not return structured evaluation" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool call arguments", e);
      return new Response(JSON.stringify({ error: "Invalid AI output" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upsert (decision_id is unique)
    const { error: upErr } = await admin
      .from("ai_evaluations")
      .upsert(
        {
          decision_id: decision.id,
          change_percentage: Number(parsed.change_percentage) || 0,
          budget_change: Number(parsed.budget_change) || 0,
          timeline_change: Number(parsed.timeline_change) || 0,
          risk_change: Number(parsed.risk_change) || 0,
          expected_roi: Number(parsed.expected_roi) || 0,
          risk_adjusted_roi: Number(parsed.risk_adjusted_roi) || 0,
          break_even_months: Math.round(Number(parsed.break_even_months) || 0),
          expected_value: Number(parsed.expected_value) || 0,
          summary: String(parsed.summary ?? ""),
          impact_breakdown: parsed.impact_breakdown ?? [],
          evaluated_at: new Date().toISOString(),
        },
        { onConflict: "decision_id" },
      );

    if (upErr) {
      console.error("DB upsert error", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, evaluation: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-decision error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
