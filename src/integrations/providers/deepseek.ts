/**
 * DeepSeek — LLM muy barato (≈ $0.27/Mtok input, $1.10/Mtok output en V3.2),
 * compatible con la API de OpenAI. Excelente alternativa a Claude para
 * generación de contenido (carruseles/reels/captions) con costo marginal.
 * Docs: https://platform.deepseek.com
 */

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export type DeepSeekModel =
  | 'deepseek-chat' // V3 — general (recomendado para contenido)
  | 'deepseek-reasoner'; // R1 — razonamiento

export interface DeepSeekOptions {
  model?: DeepSeekModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface DeepSeekChatResult {
  ok: boolean;
  text: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

const DEEPSEEK_API_BASE = process.env['DEEPSEEK_API_BASE'] ?? 'https://api.deepseek.com/v1';

const getApiKey = (): string | null => process.env['DEEPSEEK_API_KEY'] ?? null;

export const isDeepSeekAvailable = (): boolean => Boolean(getApiKey());

export const deepseekChat = async (
  messages: DeepSeekMessage[],
  opts: DeepSeekOptions = {},
): Promise<DeepSeekChatResult> => {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, text: '', model: '', tokensUsed: 0, durationMs: 0, error: 'DEEPSEEK_API_KEY no configurada' };
  }
  const model = opts.model ?? 'deepseek-chat';
  const allMessages: DeepSeekMessage[] = opts.systemPrompt
    ? [{ role: 'system', content: opts.systemPrompt }, ...messages]
    : messages;

  const start = Date.now();
  try {
    const response = await fetch(`${DEEPSEEK_API_BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
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
        tokensUsed: 0,
        durationMs: Date.now() - start,
        error: `DeepSeek ${response.status}: ${err.slice(0, 200)}`,
      };
    }
    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage?: { total_tokens?: number };
      model: string;
    };
    const text = data.choices[0]?.message.content ?? '';
    return {
      ok: true,
      text,
      model: data.model,
      tokensUsed: data.usage?.total_tokens ?? 0,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { ok: false, text: '', model, tokensUsed: 0, durationMs: Date.now() - start, error: (err as Error).message };
  }
};

export const deepseekAsk = async (prompt: string, opts: DeepSeekOptions = {}): Promise<string> => {
  const result = await deepseekChat([{ role: 'user', content: prompt }], opts);
  if (!result.ok) throw new Error(`DeepSeek: ${result.error}`);
  return result.text;
};

export const DEEPSEEK_MODELS: Array<{
  id: DeepSeekModel;
  description: string;
  contextWindow: number;
  pricePer1MIn: number;
  pricePer1MOut: number;
}> = [
  {
    id: 'deepseek-chat',
    description: 'DeepSeek V3 — general (recomendado para contenido)',
    contextWindow: 64000,
    pricePer1MIn: 0.27,
    pricePer1MOut: 1.1,
  },
  {
    id: 'deepseek-reasoner',
    description: 'DeepSeek R1 — razonamiento (más lento, más profundo)',
    contextWindow: 64000,
    pricePer1MIn: 0.55,
    pricePer1MOut: 2.19,
  },
];
