/**
 * OpenRouter — Agregador de LLMs con free tier y créditos gratuitos.
 * Acceso a Claude, GPT-4, LLaMA, Gemini, Mistral y más desde una API.
 * Docs: https://openrouter.ai/docs
 * Free models: https://openrouter.ai/models?q=free
 */

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

const getApiKey = (): string | null => process.env['OPENROUTER_API_KEY'] ?? null;

export const isOpenRouterAvailable = (): boolean => Boolean(getApiKey());

export type OpenRouterModel =
  // Modelos FREE (sin costo)
  | 'meta-llama/llama-3.2-3b-instruct:free'
  | 'meta-llama/llama-3.1-8b-instruct:free'
  | 'google/gemma-2-9b-it:free'
  | 'mistralai/mistral-7b-instruct:free'
  | 'microsoft/phi-3-mini-128k-instruct:free'
  | 'qwen/qwen-2-7b-instruct:free'
  | 'huggingfaceh4/zephyr-7b-beta:free'
  // Modelos de pago (mejores)
  | 'anthropic/claude-3.5-sonnet'
  | 'openai/gpt-4o-mini'
  | 'google/gemini-pro-1.5'
  | 'mistralai/mixtral-8x7b-instruct';

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterOptions {
  model?: OpenRouterModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  site?: string;
  appName?: string;
}

export interface OpenRouterResult {
  ok: boolean;
  text: string;
  model: string;
  totalTokens: number;
  cost: number;
  durationMs: number;
  error?: string;
}

export const openRouterChat = async (
  messages: OpenRouterMessage[],
  opts: OpenRouterOptions = {},
): Promise<OpenRouterResult> => {
  const apiKey = getApiKey();
  if (!apiKey)
    return {
      ok: false,
      text: '',
      model: '',
      totalTokens: 0,
      cost: 0,
      durationMs: 0,
      error: 'OPENROUTER_API_KEY no configurada',
    };

  const model = opts.model ?? 'meta-llama/llama-3.2-3b-instruct:free';
  const allMessages: OpenRouterMessage[] = opts.systemPrompt
    ? [{ role: 'system', content: opts.systemPrompt }, ...messages]
    : messages;

  const start = Date.now();
  try {
    const response = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
        'http-referer': opts.site ?? 'https://paithonlabs.com',
        'x-title': opts.appName ?? 'FeedIA',
      },
      body: JSON.stringify({
        model,
        messages: allMessages,
        max_tokens: opts.maxTokens ?? 4096,
        temperature: opts.temperature ?? 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        ok: false,
        text: '',
        model,
        totalTokens: 0,
        cost: 0,
        durationMs: Date.now() - start,
        error: `OpenRouter ${response.status}: ${err.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number; total_cost?: number };
      model: string;
    };

    return {
      ok: true,
      text: data.choices[0]?.message.content ?? '',
      model: data.model,
      totalTokens: data.usage.total_tokens,
      cost: data.usage.total_cost ?? 0,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return {
      ok: false,
      text: '',
      model,
      totalTokens: 0,
      cost: 0,
      durationMs: Date.now() - start,
      error: (err as Error).message,
    };
  }
};

export const openRouterAsk = async (prompt: string, opts: OpenRouterOptions = {}): Promise<string> => {
  const result = await openRouterChat([{ role: 'user', content: prompt }], opts);
  if (!result.ok) throw new Error(`OpenRouter: ${result.error}`);
  return result.text;
};

/** Lista modelos disponibles (free + pagos) */
export const listOpenRouterModels = async (): Promise<
  Array<{
    id: string;
    name: string;
    contextLength: number;
    pricing: { prompt: string; completion: string };
  }>
> => {
  const apiKey = getApiKey();
  if (!apiKey) return [];
  try {
    const response = await fetch(`${OPENROUTER_BASE}/models`, {
      headers: { authorization: `Bearer ${apiKey}` },
    });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        context_length: number;
        pricing: { prompt: string; completion: string };
      }>;
    };
    return data.data.map((m) => ({
      id: m.id,
      name: m.name,
      contextLength: m.context_length,
      pricing: m.pricing,
    }));
  } catch {
    return [];
  }
};

export const FREE_OPENROUTER_MODELS: OpenRouterModel[] = [
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'mistralai/mistral-7b-instruct:free',
  'microsoft/phi-3-mini-128k-instruct:free',
];
