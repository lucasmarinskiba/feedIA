/**
 * Groq — LLM inference ultra-rápida, free tier generoso.
 * Modelos: LLaMA 3, Mixtral, Gemma.
 * Docs: https://console.groq.com/docs
 */

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GroqOptions {
  model?: GroqModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export type GroqModel =
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'llama-3.2-90b-vision-preview'
  | 'mixtral-8x7b-32768'
  | 'gemma2-9b-it'
  | 'whisper-large-v3';

export interface GroqChatResult {
  ok: boolean;
  text: string;
  model: string;
  tokensUsed: number;
  durationMs: number;
  error?: string;
}

const GROQ_API_BASE = 'https://api.groq.com/openai/v1';

const getApiKey = (): string | null => process.env['GROQ_API_KEY'] ?? null;

export const isGroqAvailable = (): boolean => Boolean(getApiKey());

export const groqChat = async (messages: GroqMessage[], opts: GroqOptions = {}): Promise<GroqChatResult> => {
  const apiKey = getApiKey();
  if (!apiKey)
    return { ok: false, text: '', model: '', tokensUsed: 0, durationMs: 0, error: 'GROQ_API_KEY no configurada' };

  const model = opts.model ?? 'llama-3.3-70b-versatile';
  const allMessages: GroqMessage[] = opts.systemPrompt
    ? [{ role: 'system', content: opts.systemPrompt }, ...messages]
    : messages;

  const start = Date.now();
  try {
    const response = await fetch(`${GROQ_API_BASE}/chat/completions`, {
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
        error: `Groq ${response.status}: ${err.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string } }>;
      usage: { total_tokens: number };
      model: string;
    };

    const text = data.choices[0]?.message.content ?? '';
    return {
      ok: true,
      text,
      model: data.model,
      tokensUsed: data.usage.total_tokens,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    return { ok: false, text: '', model, tokensUsed: 0, durationMs: Date.now() - start, error: (err as Error).message };
  }
};

export const groqAsk = async (prompt: string, opts: GroqOptions = {}): Promise<string> => {
  const result = await groqChat([{ role: 'user', content: prompt }], opts);
  if (!result.ok) throw new Error(`Groq: ${result.error}`);
  return result.text;
};

/** Transcripción de audio con Whisper (Groq) */
export const groqTranscribe = async (audioBase64: string, language = 'es'): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('GROQ_API_KEY no configurada');

  const formData = new FormData();
  const blob = new Blob([Buffer.from(audioBase64, 'base64')], { type: 'audio/mp3' });
  formData.append('file', blob, 'audio.mp3');
  formData.append('model', 'whisper-large-v3');
  formData.append('language', language);

  const response = await fetch(`${GROQ_API_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  if (!response.ok) throw new Error(`Groq Whisper ${response.status}`);
  const data = (await response.json()) as { text: string };
  return data.text;
};

export const GROQ_MODELS: Array<{ id: GroqModel; description: string; contextWindow: number; free: boolean }> = [
  {
    id: 'llama-3.3-70b-versatile',
    description: 'LLaMA 3.3 70B — Mejor calidad general',
    contextWindow: 128000,
    free: true,
  },
  { id: 'llama-3.1-8b-instant', description: 'LLaMA 3.1 8B — Ultra rápido', contextWindow: 128000, free: true },
  { id: 'mixtral-8x7b-32768', description: 'Mixtral 8x7B — Multilingüe', contextWindow: 32768, free: true },
  { id: 'gemma2-9b-it', description: 'Gemma 2 9B (Google) — Eficiente', contextWindow: 8192, free: true },
  { id: 'whisper-large-v3', description: 'Whisper V3 — Transcripción de audio', contextWindow: 0, free: true },
];
