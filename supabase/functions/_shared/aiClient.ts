// @ts-nocheck
// -------------------------------------------------------------------
// AI abstraction layer.
//   Cloud install  -> Lovable AI Gateway (default)
//   On-premise     -> local Ollama / vLLM via AI_BASE_URL
// Both speak the OpenAI-compatible chat-completions API, so every
// edge function can call `aiChat()` without knowing which one is live.
// -------------------------------------------------------------------

const LOVABLE_GATEWAY = 'https://ai.gateway.lovable.dev/v1';

export function aiEnabled(): boolean {
  return (Deno.env.get('AI_ENABLED') ?? 'true') !== 'false';
}

function isLocalHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return (
      h === 'localhost' ||
      h === '127.0.0.1' ||
      h === 'ollama' ||
      h === 'vllm' ||
      h.endsWith('.local') ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h)
    );
  } catch {
    return false;
  }
}

export function aiConfig() {
  const baseUrl = Deno.env.get('AI_BASE_URL') || LOVABLE_GATEWAY;
  const onPrem = baseUrl !== LOVABLE_GATEWAY;
  const allowExternal = (Deno.env.get('AI_ALLOW_EXTERNAL') ?? 'true') !== 'false';

  // Air-gapped guarantee: refuse to send company data to a non-local host.
  if (!allowExternal && !isLocalHost(baseUrl)) {
    throw new Error(
      `AI_ALLOW_EXTERNAL=false but AI_BASE_URL points outside the local network (${baseUrl})`,
    );
  }

  return {
    baseUrl,
    onPrem,
    apiKey: onPrem
      ? (Deno.env.get('AI_API_KEY') || 'local')
      : (Deno.env.get('LOVABLE_API_KEY') || ''),
    chatModel: Deno.env.get('AI_CHAT_MODEL') || 'openai/gpt-5.6-sol',
    embeddingModel: Deno.env.get('AI_EMBEDDING_MODEL') || 'text-embedding-3-small',
  };
}

export type AiMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | unknown[];
};

/** Error carrying the upstream HTTP status so callers can map 429/402 etc. */
export class AiError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`AI request failed [${status}]: ${detail.slice(0, 400)}`);
    this.name = 'AiError';
    this.status = status;
    this.detail = detail;
  }
}

function chatHeaders(cfg: ReturnType<typeof aiConfig>): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.onPrem) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  else headers['Lovable-API-Key'] = cfg.apiKey;
  return headers;
}

/**
 * Raw OpenAI-compatible chat call — returns the full response JSON so callers
 * can read tool_calls, usage, etc. Works against both backends.
 */
export async function aiChatRaw(opts: {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
  tools?: unknown[];
  toolChoice?: unknown;
  signal?: AbortSignal;
}): Promise<any> {
  if (!aiEnabled()) throw new AiError(503, 'ai_disabled');

  const cfg = aiConfig();
  const body: Record<string, unknown> = {
    model: opts.model || cfg.chatModel,
    messages: opts.messages,
    stream: false,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: 'json_object' };
  if (opts.tools) body.tools = opts.tools;
  if (opts.toolChoice) body.tool_choice = opts.toolChoice;

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: chatHeaders(cfg),
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) throw new AiError(res.status, await res.text());
  return await res.json();
}

/** OpenAI-compatible chat call that works against both backends. */
export async function aiChat(opts: Parameters<typeof aiChatRaw>[0]): Promise<string> {
  const data = await aiChatRaw(opts);
  return data?.choices?.[0]?.message?.content ?? '';
}

/** Speech-to-text (OpenAI-compatible /audio/transcriptions). */
export async function aiTranscribe(file: File, filename: string): Promise<string> {
  if (!aiEnabled()) throw new AiError(503, 'ai_disabled');
  const cfg = aiConfig();
  const model = Deno.env.get('AI_TRANSCRIBE_MODEL') || 'openai/gpt-4o-mini-transcribe';

  const form = new FormData();
  form.append('model', model);
  form.append('file', file, filename);

  const res = await fetch(`${cfg.baseUrl}/audio/transcriptions`, {
    method: 'POST',
    headers: cfg.onPrem
      ? { Authorization: `Bearer ${cfg.apiKey}` }
      : { 'Lovable-API-Key': cfg.apiKey },
    body: form,
  });
  if (!res.ok) throw new AiError(res.status, await res.text());
  const data = await res.json();
  return data?.text ?? '';
}

/** Text-to-speech (OpenAI-compatible /audio/speech). Returns raw audio bytes. */
export async function aiSpeech(opts: {
  text: string;
  voice?: string;
  instructions?: string;
}): Promise<Uint8Array> {
  if (!aiEnabled()) throw new AiError(503, 'ai_disabled');
  const cfg = aiConfig();
  const body: Record<string, unknown> = {
    model: Deno.env.get('AI_TTS_MODEL') || 'openai/gpt-4o-mini-tts',
    input: opts.text.slice(0, 4000),
    voice: opts.voice || 'alloy',
    response_format: 'mp3',
  };
  if (opts.instructions) body.instructions = opts.instructions;

  const res = await fetch(`${cfg.baseUrl}/audio/speech`, {
    method: 'POST',
    headers: chatHeaders(cfg),
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new AiError(res.status, await res.text());
  return new Uint8Array(await res.arrayBuffer());
}


/** OpenAI-compatible embeddings (Ask DecisionOS retrieval). */
export async function aiEmbed(input: string | string[]): Promise<number[][]> {
  if (!aiEnabled()) throw new Error('ai_disabled');
  const cfg = aiConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.onPrem) headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  else headers['Lovable-API-Key'] = cfg.apiKey;

  const res = await fetch(`${cfg.baseUrl}/embeddings`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: cfg.embeddingModel, input }),
  });
  if (!res.ok) throw new Error(`Embedding failed [${res.status}]: ${await res.text()}`);
  const data = await res.json();
  return (data?.data ?? []).map((d: any) => d.embedding);
}
