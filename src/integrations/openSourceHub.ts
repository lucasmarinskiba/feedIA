/**
 * Hub de proveedores de IA open-source.
 * Enrutamiento inteligente: usa el mejor proveedor disponible según tarea y configuración.
 * Orden de preferencia: Anthropic → Groq → OpenRouter → Ollama → HuggingFace
 */

import { groqChat, isGroqAvailable, type GroqMessage } from './providers/groq.js';
import {
  openRouterChat,
  isOpenRouterAvailable,
  FREE_OPENROUTER_MODELS,
  type OpenRouterMessage,
} from './providers/openRouter.js';
import { ollamaChat, isOllamaAvailable, type OllamaMessage } from './providers/ollama.js';
import { hfSentimentAnalysis, hfGenerateImage, isHuggingFaceAvailable } from './providers/huggingface.js';
import { log } from '../agent/logger.js';

export type ProviderName = 'anthropic' | 'groq' | 'openrouter' | 'ollama' | 'huggingface';

export interface ProviderStatus {
  name: ProviderName;
  available: boolean;
  free: boolean;
  local: boolean;
  bestFor: string[];
  configKey: string;
}

export interface HubChatOptions {
  preferProvider?: ProviderName;
  fallbackChain?: ProviderName[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  freeOnly?: boolean;
}

export interface HubChatResult {
  ok: boolean;
  text: string;
  provider: ProviderName;
  model: string;
  durationMs: number;
  error?: string;
}

// ── Estado de proveedores ──────────────────────────────────────────────────
let _ollamaAvailable: boolean | null = null;

export const getProviderStatuses = async (): Promise<ProviderStatus[]> => {
  if (_ollamaAvailable === null) {
    _ollamaAvailable = await isOllamaAvailable();
  }

  return [
    {
      name: 'anthropic',
      available: Boolean(process.env['ANTHROPIC_API_KEY']),
      free: false,
      local: false,
      bestFor: ['razonamiento complejo', 'orquestación', 'análisis profundo'],
      configKey: 'ANTHROPIC_API_KEY',
    },
    {
      name: 'groq',
      available: isGroqAvailable(),
      free: true,
      local: false,
      bestFor: ['velocidad', 'tasks simples', 'transcripción de audio'],
      configKey: 'GROQ_API_KEY',
    },
    {
      name: 'openrouter',
      available: isOpenRouterAvailable(),
      free: true,
      local: false,
      bestFor: ['variedad de modelos', 'fallback', 'modelos free'],
      configKey: 'OPENROUTER_API_KEY',
    },
    {
      name: 'ollama',
      available: _ollamaAvailable,
      free: true,
      local: true,
      bestFor: ['privacidad', 'sin internet', 'sin costo', 'datos sensibles'],
      configKey: 'OLLAMA_HOST (default: localhost:11434)',
    },
    {
      name: 'huggingface',
      available: isHuggingFaceAvailable(),
      free: true,
      local: false,
      bestFor: ['sentiment analysis', 'clasificación', 'embeddings', 'imágenes'],
      configKey: 'HUGGINGFACE_TOKEN',
    },
  ];
};

// ── Enrutamiento inteligente ───────────────────────────────────────────────
const DEFAULT_CHAIN: ProviderName[] = ['groq', 'openrouter', 'ollama'];

const chatWithProvider = async (
  provider: ProviderName,
  messages: Array<{ role: string; content: string }>,
  opts: HubChatOptions,
): Promise<HubChatResult | null> => {
  const sysPrompt = opts.systemPrompt;
  const maxTokens = opts.maxTokens ?? 2048;
  const temp = opts.temperature ?? 0.7;

  if (provider === 'groq' && isGroqAvailable()) {
    const result = await groqChat(messages as GroqMessage[], { systemPrompt: sysPrompt, maxTokens, temperature: temp });
    if (result.ok)
      return { ok: true, text: result.text, provider: 'groq', model: result.model, durationMs: result.durationMs };
  }

  if (provider === 'openrouter' && isOpenRouterAvailable()) {
    const model = opts.freeOnly ? FREE_OPENROUTER_MODELS[0] : undefined;
    const result = await openRouterChat(messages as OpenRouterMessage[], {
      model,
      systemPrompt: sysPrompt,
      maxTokens,
      temperature: temp,
    });
    if (result.ok)
      return {
        ok: true,
        text: result.text,
        provider: 'openrouter',
        model: result.model,
        durationMs: result.durationMs,
      };
  }

  if (provider === 'ollama') {
    const available = _ollamaAvailable ?? (await isOllamaAvailable());
    _ollamaAvailable = available;
    if (available) {
      const result = await ollamaChat(messages as OllamaMessage[], {
        systemPrompt: sysPrompt,
        numCtx: maxTokens,
        temperature: temp,
      });
      if (result.ok)
        return { ok: true, text: result.text, provider: 'ollama', model: result.model, durationMs: result.durationMs };
    }
  }

  return null;
};

/**
 * Chat con enrutamiento automático a la mejor IA disponible.
 * El orden de intentos es: preferProvider → fallbackChain → DEFAULT_CHAIN.
 */
export const hubChat = async (prompt: string, opts: HubChatOptions = {}): Promise<HubChatResult> => {
  const messages = [{ role: 'user' as const, content: prompt }];
  const chain: ProviderName[] = [
    ...(opts.preferProvider ? [opts.preferProvider] : []),
    ...(opts.fallbackChain ?? DEFAULT_CHAIN),
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const provider of chain) {
    try {
      const result = await chatWithProvider(provider, messages, opts);
      if (result) {
        log.debug(`[Hub] Proveedor usado: ${provider} (${result.durationMs}ms)`);
        return result;
      }
    } catch (err) {
      log.warn(`[Hub] ${provider} falló: ${(err as Error).message}`);
    }
  }

  return {
    ok: false,
    text: '',
    provider: 'groq',
    model: 'none',
    durationMs: 0,
    error: 'Ningún proveedor disponible. Configurá al menos GROQ_API_KEY o instalá Ollama.',
  };
};

/**
 * Análisis de sentimiento multi-proveedor.
 * Usa HuggingFace si disponible, sino fallback a LLM prompt.
 */
export const hubSentiment = async (
  text: string,
): Promise<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number; provider: ProviderName }> => {
  if (isHuggingFaceAvailable()) {
    const result = await hfSentimentAnalysis(text);
    if (result.ok && result.data) {
      const top = result.data.reduce((a, b) => (a.score > b.score ? a : b));
      const sentiment = top.label.toLowerCase().includes('pos')
        ? 'positive'
        : top.label.toLowerCase().includes('neg')
          ? 'negative'
          : 'neutral';
      return { sentiment, score: top.score, provider: 'huggingface' };
    }
  }

  const result = await hubChat(
    `Analizá el sentimiento del siguiente texto. Respondé SOLO con una de estas palabras: positive, negative, neutral.\n\nTexto: "${text.slice(0, 500)}"`,
    { maxTokens: 10 },
  );

  const sentiment = result.text.trim().toLowerCase().includes('pos')
    ? 'positive'
    : result.text.trim().toLowerCase().includes('neg')
      ? 'negative'
      : 'neutral';
  return { sentiment, score: 0.7, provider: result.provider };
};

/**
 * Genera una imagen con el mejor proveedor disponible.
 */
export const hubGenerateImage = async (
  prompt: string,
): Promise<{ ok: boolean; base64?: string; provider: ProviderName; error?: string }> => {
  if (isHuggingFaceAvailable()) {
    const result = await hfGenerateImage(prompt);
    if (result.ok && result.data) {
      return { ok: true, base64: result.data, provider: 'huggingface' };
    }
  }
  return {
    ok: false,
    provider: 'huggingface',
    error: 'Generación de imágenes requiere HUGGINGFACE_TOKEN o REPLICATE_API_TOKEN',
  };
};

export const getHubSummary = async (): Promise<{
  availableProviders: string[];
  freeProviders: string[];
  localProviders: string[];
  recommendedSetup: string;
}> => {
  const statuses = await getProviderStatuses();
  const available = statuses.filter((s) => s.available);
  const free = available.filter((s) => s.free);
  const local = available.filter((s) => s.local);

  const hasAny = available.length > 0;
  const recommendation = !hasAny
    ? '⚠️ Sin proveedores configurados. Instalá Ollama (gratis) o configurá GROQ_API_KEY.'
    : local.length > 0
      ? '✅ Ollama disponible para uso offline y privado.'
      : free.length > 0
        ? `✅ ${free.map((p) => p.name).join(', ')} disponibles (gratuito).`
        : '✅ Solo Anthropic disponible (pagado).';

  return {
    availableProviders: available.map((p) => p.name),
    freeProviders: free.map((p) => p.name),
    localProviders: local.map((p) => p.name),
    recommendedSetup: recommendation,
  };
};
