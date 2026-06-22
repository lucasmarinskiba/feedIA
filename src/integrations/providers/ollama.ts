/**
 * Ollama — LLMs 100% locales, sin internet, sin costo, máxima privacidad.
 * Instalación: https://ollama.com
 * Modelos: llama3, mistral, phi3, gemma2, qwen2, etc.
 */

const OLLAMA_BASE = process.env['OLLAMA_HOST'] ?? 'http://localhost:11434';

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaOptions {
  model?: string;
  stream?: boolean;
  temperature?: number;
  numCtx?: number;
  systemPrompt?: string;
}

export interface OllamaResult {
  ok: boolean;
  text: string;
  model: string;
  durationMs: number;
  totalDuration?: number;
  error?: string;
}

export interface OllamaModel {
  name: string;
  size: number;
  modifiedAt: string;
  details?: { family: string; parameterSize: string; quantizationLevel: string };
}

export const isOllamaAvailable = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
};

export const listOllamaModels = async (): Promise<OllamaModel[]> => {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return [];
    const data = (await response.json()) as {
      models: Array<{
        name: string;
        size: number;
        modified_at: string;
        details?: { family: string; parameter_size: string; quantization_level: string };
      }>;
    };
    return data.models.map((m) => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
      details: m.details
        ? {
            family: m.details.family,
            parameterSize: m.details.parameter_size,
            quantizationLevel: m.details.quantization_level,
          }
        : undefined,
    }));
  } catch {
    return [];
  }
};

export const ollamaChat = async (messages: OllamaMessage[], opts: OllamaOptions = {}): Promise<OllamaResult> => {
  const model = opts.model ?? process.env['OLLAMA_DEFAULT_MODEL'] ?? 'llama3.2';
  const allMessages: OllamaMessage[] = opts.systemPrompt
    ? [{ role: 'system', content: opts.systemPrompt }, ...messages]
    : messages;

  const start = Date.now();
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: allMessages,
        stream: false,
        options: {
          temperature: opts.temperature ?? 0.7,
          num_ctx: opts.numCtx ?? 4096,
        },
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        ok: false,
        text: '',
        model,
        durationMs: Date.now() - start,
        error: `Ollama ${response.status}: ${err.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as {
      message: { content: string };
      total_duration: number;
      model: string;
    };

    return {
      ok: true,
      text: data.message.content,
      model: data.model,
      durationMs: Date.now() - start,
      totalDuration: Math.round((data.total_duration ?? 0) / 1e6),
    };
  } catch (err) {
    return { ok: false, text: '', model, durationMs: Date.now() - start, error: (err as Error).message };
  }
};

export const ollamaAsk = async (prompt: string, opts: OllamaOptions = {}): Promise<string> => {
  const result = await ollamaChat([{ role: 'user', content: prompt }], opts);
  if (!result.ok) throw new Error(`Ollama: ${result.error}`);
  return result.text;
};

export const ollamaPull = async (modelName: string): Promise<{ ok: boolean; error?: string }> => {
  try {
    const response = await fetch(`${OLLAMA_BASE}/api/pull`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: false }),
      signal: AbortSignal.timeout(600000), // 10 min para descargar
    });
    return { ok: response.ok };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
};

export const RECOMMENDED_OLLAMA_MODELS = [
  { name: 'llama3.2', description: 'LLaMA 3.2 3B — Rápido y eficiente', size: '2.0 GB' },
  { name: 'llama3.1', description: 'LLaMA 3.1 8B — Balance calidad/velocidad', size: '4.7 GB' },
  { name: 'mistral', description: 'Mistral 7B — Multilingüe excelente', size: '4.1 GB' },
  { name: 'gemma2', description: 'Gemma 2 9B (Google) — Alta calidad', size: '5.4 GB' },
  { name: 'phi3', description: 'Phi-3 Mini — Muy pequeño y capaz', size: '2.2 GB' },
  { name: 'qwen2', description: 'Qwen 2 7B — Bueno en español/chino', size: '4.4 GB' },
  { name: 'nomic-embed-text', description: 'Embeddings de texto', size: '274 MB' },
];
