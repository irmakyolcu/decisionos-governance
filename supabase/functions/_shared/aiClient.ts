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

export type AiMessage = { role: 'system' | 'user' | 'assistant'; content: string };

/** OpenAI-compatible chat call that works against both backends. */
export async function aiChat(opts: {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  jsonMode?: boolean;
  signal?: AbortSignal;
}): Promise<string> {
  if (!aiEnabled()) throw new Error('ai_disabled');

  const cfg = aiConfig();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (cfg.onPrem) {
    headers['Authorization'] = `Bearer ${cfg.apiKey}`;
  } else {
    headers['Lovable-API-Key'] = cfg.apiKey;
  }

  const body: Record<string, unknown> = {
    model: opts.model || cfg.chatModel,
    messages: opts.messages,
    stream: false,
  };
  if (opts.temperature !== undefined) body.temperature = opts.temperature;
  if (opts.jsonMode) body.response_format = { type: 'json_object' };

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AI request failed [${res.status}]: ${text.slice(0, 400)}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
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
