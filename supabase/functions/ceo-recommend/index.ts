// CEO Digital Twin — generate a structured decision recommendation grounded in the CEO profile.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const tool = {
  type: "function",
  function: {
    name: "submit_ceo_recommendation",
    description:
      "Return a structured CEO-aligned recommendation for an incoming decision request.",
    parameters: {
      type: "object",
      properties: {
        recommended_action: { type: "string", description: "Single clear recommended action." },
        reasoning: { type: "string", description: "Why this action fits the CEO's logic. 2-4 sentences." },
        similar_past_decisions: {
          type: "array",
          description: "Titles of similar past decisions from memory that informed this recommendation.",
          items: { type: "string" },
        },
        risk_level: { type: "string", enum: ["Low", "Medium", "High"] },
        ceo_approval_required: { type: "boolean" },
        strategic_alignment_score: {
          type: "integer",
          description: "0-100 alignment with the CEO's strategic priorities.",
        },
        suggested_next_step: { type: "string" },
        suggested_message: {
          type: "string",
          description: "Short message the requester can send to the external stakeholder, in the CEO's voice (direct, short, decision-oriented).",
        },
        delegation_level: {
          type: "string",
          enum: ["Team can decide", "Needs manager approval", "Needs CEO approval", "Escalate immediately"],
        },
      },
      required: [
        "recommended_action",
        "reasoning",
        "similar_past_decisions",
        "risk_level",
        "ceo_approval_required",
        "strategic_alignment_score",
        "suggested_next_step",
        "suggested_message",
        "delegation_level",
      ],
      additionalProperties: false,
    },
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const { intake, ceoProfile, memory } = body ?? {};
    if (!intake?.title) {
      return new Response(JSON.stringify({ error: "intake.title required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are the CEO Digital Twin for ${ceoProfile?.name ?? "the CEO"} (${ceoProfile?.title ?? ""} at ${ceoProfile?.company ?? ""}).
You DO NOT impersonate the CEO. You make recommendations grounded in the CEO's known decision logic, priorities, risk appetite, red lines and delegation rules.
Always call submit_ceo_recommendation. Be direct, short, decision-oriented. Default to recommending exploration over commitment.
If anything touches a red line, set ceo_approval_required = true and delegation_level = "Needs CEO approval".`;

    const userPrompt = `CEO PROFILE
Priorities: ${JSON.stringify(ceoProfile?.priorities ?? [])}
Risk appetite: ${JSON.stringify(ceoProfile?.riskAppetite ?? [])}
Decision style: ${JSON.stringify(ceoProfile?.decisionStyle ?? [])}
Communication style: ${JSON.stringify(ceoProfile?.communicationStyle ?? [])}
Red lines: ${JSON.stringify(ceoProfile?.redLines ?? [])}
Delegation rules: ${JSON.stringify(ceoProfile?.delegationRules ?? [])}
Strategic focus: ${JSON.stringify(ceoProfile?.strategicFocus ?? [])}

DECISION MEMORY (past decisions to reference if similar):
${(memory ?? []).map((m: any) => `- ${m.title} (${m.category}, ${m.date}): ${m.finalDecision} — ${m.lessons}`).join("\n")}

INCOMING DECISION REQUEST
Title: ${intake.title}
Category: ${intake.category}
Context: ${intake.context}
Options considered: ${intake.options}
Urgency: ${intake.urgency}
Financial impact (EUR): ${intake.financialImpactEUR}
Legal risk: ${intake.legalRisk}
Brand risk: ${intake.brandRisk}
Strategic relevance: ${intake.strategicRelevance}
Requested by: ${intake.requestedBy}
Deadline: ${intake.deadline ?? "—"}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "submit_ceo_recommendation" } },
      }),
    });

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error", aiResp.status, errText);
      return new Response(JSON.stringify({ error: "AI recommendation failed" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      return new Response(JSON.stringify({ error: "AI did not return structured recommendation" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const p = JSON.parse(toolCall.function.arguments);
    const recommendation = {
      recommendedAction: String(p.recommended_action ?? ""),
      reasoning: String(p.reasoning ?? ""),
      similarPastDecisions: Array.isArray(p.similar_past_decisions) ? p.similar_past_decisions.map(String) : [],
      riskLevel: (p.risk_level ?? "Medium") as "Low" | "Medium" | "High",
      ceoApprovalRequired: Boolean(p.ceo_approval_required),
      strategicAlignmentScore: Math.max(0, Math.min(100, Math.round(Number(p.strategic_alignment_score) || 0))),
      suggestedNextStep: String(p.suggested_next_step ?? ""),
      suggestedMessage: String(p.suggested_message ?? ""),
      delegationLevel: (p.delegation_level ?? "Needs CEO approval"),
    };

    return new Response(JSON.stringify({ recommendation }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ceo-recommend error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
