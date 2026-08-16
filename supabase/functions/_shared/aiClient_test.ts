// @ts-nocheck
// Local-Ollama simulation tests for aiClient.ts
// Spins an OpenAI-compatible server on 127.0.0.1 and points AI_BASE_URL at it.
import { assert, assertEquals, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { aiChat, aiChatRaw, aiTranscribe, aiSpeech, aiEmbed, aiConfig, AiError } from "./aiClient.ts";

type Captured = { path: string; auth?: string; lovableKey?: string; body?: any; form?: FormData };
let captured: Captured[] = [];
let nextStatus = 200;
let nextError = "";

const ac = new AbortController();
const server = Deno.serve(
  { port: 8799, hostname: "127.0.0.1", signal: ac.signal, onListen: () => {} },
  async (req) => {
    const url = new URL(req.url);
    const rec: Captured = {
      path: url.pathname,
      auth: req.headers.get("authorization") ?? undefined,
      lovableKey: req.headers.get("lovable-api-key") ?? undefined,
    };
    const ct = req.headers.get("content-type") ?? "";
    if (ct.includes("multipart/form-data")) rec.form = await req.formData();
    else if (ct.includes("json")) rec.body = await req.json();
    captured.push(rec);

    if (nextStatus !== 200) {
      return new Response(nextError || "upstream failure", { status: nextStatus });
    }

    if (url.pathname === "/v1/chat/completions") {
      const wantsTool = Array.isArray(rec.body?.tools) && rec.body.tools.length > 0;
      return Response.json({
        choices: [{
          message: wantsTool
            ? { role: "assistant", content: "", tool_calls: [{ id: "c1", type: "function", function: { name: "record_decision", arguments: '{"risk":0.4}' } }] }
            : { role: "assistant", content: "local-ollama-reply" },
        }],
        usage: { total_tokens: 12 },
      });
    }
    if (url.pathname === "/v1/audio/transcriptions") {
      return Response.json({ text: "merhaba karar" });
    }
    if (url.pathname === "/v1/audio/speech") {
      return new Response(new Uint8Array([1, 2, 3, 4]), { headers: { "content-type": "audio/mpeg" } });
    }
    if (url.pathname === "/v1/embeddings") {
      return Response.json({ data: [{ embedding: [0.1, 0.2, 0.3] }] });
    }
    return new Response("not found", { status: 404 });
  },
);

const BASE = "http://127.0.0.1:8799/v1";
function localEnv() {
  Deno.env.set("AI_ENABLED", "true");
  Deno.env.set("AI_BASE_URL", BASE);
  Deno.env.set("AI_ALLOW_EXTERNAL", "false");
  Deno.env.set("AI_API_KEY", "ollama-local");
  Deno.env.set("AI_CHAT_MODEL", "qwen2.5:14b-instruct");
  Deno.env.set("AI_EMBEDDING_MODEL", "nomic-embed-text");
  Deno.env.set("AI_TRANSCRIBE_MODEL", "whisper-1");
  Deno.env.set("AI_TTS_MODEL", "kokoro");
  captured = [];
  nextStatus = 200;
  nextError = "";
}

Deno.test("config: local base url is detected as on-prem", () => {
  localEnv();
  const cfg = aiConfig();
  assertEquals(cfg.onPrem, true);
  assertEquals(cfg.apiKey, "ollama-local");
  assertEquals(cfg.chatModel, "qwen2.5:14b-instruct");
});

Deno.test("chat: returns content and uses Bearer auth + local model", async () => {
  localEnv();
  const out = await aiChat({ messages: [{ role: "user", content: "selam" }], temperature: 0.2 });
  assertEquals(out, "local-ollama-reply");
  const r = captured[0];
  assertEquals(r.path, "/v1/chat/completions");
  assertEquals(r.auth, "Bearer ollama-local");
  assertEquals(r.lovableKey, undefined);
  assertEquals(r.body.model, "qwen2.5:14b-instruct");
  assertEquals(r.body.stream, false);
  assertEquals(r.body.temperature, 0.2);
});

Deno.test("chat: json mode sets response_format", async () => {
  localEnv();
  await aiChat({ messages: [{ role: "user", content: "json ver" }], jsonMode: true });
  assertEquals(captured[0].body.response_format.type, "json_object");
});

Deno.test("tool-calling: tools forwarded and tool_calls returned", async () => {
  localEnv();
  const tools = [{ type: "function", function: { name: "record_decision", parameters: { type: "object", properties: {} } } }];
  const data = await aiChatRaw({ messages: [{ role: "user", content: "karar" }], tools, toolChoice: "auto" });
  const call = data.choices[0].message.tool_calls[0];
  assertEquals(call.function.name, "record_decision");
  assertEquals(JSON.parse(call.function.arguments).risk, 0.4);
  assertEquals(captured[0].body.tool_choice, "auto");
  assertEquals(captured[0].body.tools[0].function.name, "record_decision");
});

Deno.test("STT: transcribes multipart upload", async () => {
  localEnv();
  const file = new File([new Uint8Array([0, 1, 2])], "q.webm", { type: "audio/webm" });
  const text = await aiTranscribe(file, "q.webm");
  assertEquals(text, "merhaba karar");
  const r = captured[0];
  assertEquals(r.path, "/v1/audio/transcriptions");
  assertEquals(r.auth, "Bearer ollama-local");
  assertEquals(r.form?.get("model"), "whisper-1");
  assert(r.form?.get("file") instanceof File);
});

Deno.test("TTS: returns audio bytes with local model + voice", async () => {
  localEnv();
  const bytes = await aiSpeech({ text: "karar onaylandı", voice: "nova", instructions: "calm" });
  assertEquals(Array.from(bytes), [1, 2, 3, 4]);
  const r = captured[0];
  assertEquals(r.path, "/v1/audio/speech");
  assertEquals(r.body.model, "kokoro");
  assertEquals(r.body.voice, "nova");
  assertEquals(r.body.response_format, "mp3");
  assertEquals(r.body.instructions, "calm");
});

Deno.test("embeddings: returns vectors from local model", async () => {
  localEnv();
  const vecs = await aiEmbed(["karar metni"]);
  assertEquals(vecs[0].length, 3);
  assertEquals(captured[0].body.model, "nomic-embed-text");
});

Deno.test("error: upstream 429 surfaces as AiError with status", async () => {
  localEnv();
  nextStatus = 429;
  nextError = "rate limited";
  const err = await aiChat({ messages: [{ role: "user", content: "x" }] }).catch((e) => e);
  assert(err instanceof AiError);
  assertEquals(err.status, 429);
  assertStringIncludes(err.detail, "rate limited");
});

Deno.test("error: upstream 500 on TTS surfaces as AiError", async () => {
  localEnv();
  nextStatus = 500;
  const err = await aiSpeech({ text: "x" }).catch((e) => e);
  assert(err instanceof AiError);
  assertEquals(err.status, 500);
});

Deno.test("error: AI_ENABLED=false blocks every call with 503", async () => {
  localEnv();
  Deno.env.set("AI_ENABLED", "false");
  for (const fn of [
    () => aiChat({ messages: [{ role: "user", content: "x" }] }),
    () => aiSpeech({ text: "x" }),
    () => aiTranscribe(new File([new Uint8Array([1])], "a.webm"), "a.webm"),
  ]) {
    const err = await fn().catch((e) => e);
    assert(err instanceof AiError);
    assertEquals(err.status, 503);
    assertEquals(err.detail, "ai_disabled");
  }
  const embedErr = await aiEmbed("x").catch((e) => e);
  assertEquals(embedErr.message, "ai_disabled");
  assertEquals(captured.length, 0);
});

Deno.test("error: air-gap guard rejects external host when AI_ALLOW_EXTERNAL=false", async () => {
  localEnv();
  Deno.env.set("AI_BASE_URL", "https://api.openai.com/v1");
  const err = await aiChat({ messages: [{ role: "user", content: "x" }] }).catch((e) => e);
  assertStringIncludes(err.message, "AI_ALLOW_EXTERNAL=false");
  assertEquals(captured.length, 0);
});

Deno.test("error: abort signal cancels in-flight request", async () => {
  localEnv();
  const c = new AbortController();
  c.abort();
  const err = await aiChat({ messages: [{ role: "user", content: "x" }], signal: c.signal }).catch((e) => e);
  assertEquals(err.name, "AbortError");
});

Deno.test("teardown", async () => {
  ac.abort();
  await server.finished;
});
