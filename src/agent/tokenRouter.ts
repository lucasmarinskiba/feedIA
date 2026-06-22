/**
 * TokenRouter — estrategia de tokens ilimitados para FeedIA.
 *
 * Filosofía: cada tarea se enruta al proveedor más económico y rápido que pueda ejecutarla bien.
 *
 * Jerarquía de proveedores (menor a mayor costo):
 *   1. Groq (llama3.3-70b / llama3.1-8b)  → gratis, 30 req/min, 6000 tokens/min
 *   2. Ollama (llama3.2, phi3)              → local, sin costo, sin límite
 *   3. OpenRouter (free tier)              → 200+ modelos gratuitos
 *   4. Claude Sonnet                       → alta calidad, costo moderado
 *   5. Claude Opus                         → máxima inteligencia, solo para decisiones críticas
 *
 * Técnicas anti-límite:
 *   - Chunking: divide textos largos, procesa en paralelo y combina
 *   - Map-reduce: procesa partes independientes, luego sintetiza
 *   - Sliding window: para contextos largos, mantiene ventana deslizante
 *   - Caching: almacena resultados de operaciones repetitivas
 */

import { groqAsk, isGroqAvailable } from '../integrations/providers/groq.js';
import { ollamaAsk, isOllamaAvailable } from '../integrations/providers/ollama.js';
import { openRouterAsk, isOpenRouterAvailable } from '../integrations/providers/openRouter.js';
import { ask as claudeAsk, askJson as claudeAskJson, hasApiKey, type PromptOptions } from './claude.js';
import { isDeepSeekAvailable, deepseekAsk } from '../integrations/providers/deepseek.js';
import { hubChat } from '../integrations/openSourceHub.js';
import { log } from './logger.js';
import { getBudgetStatus } from './budget.js';
import { pickArm, rewardArm } from '../capabilities/experiments/bandit.js';
import { lookupSemantic, storeSemantic } from './semanticCache.js';

/** Latencia (ms) por encima de la cual una respuesta cuenta como "mala" para el bandit. */
const SLOW_MS = 20_000;

/** % del presupuesto diario a partir del cual se fuerzan proveedores gratis. */
const FREE_SWITCH_PCT = 70;

/**
 * freeOnly efectivo: respeta lo pedido, pero ADEMÁS fuerza proveedores
 * gratuitos (Groq/Ollama/OpenRouter) cuando el presupuesto de LLM va bajo o
 * el breaker está abierto. El router se vuelve más barato solo, sin cortar.
 */
export const budgetAwareFreeOnly = (requested?: boolean): boolean => {
  if (requested) return true;
  // Sin ANTHROPIC_API_KEY → usar SOLO proveedores gratuitos (Groq/Ollama/
  // OpenRouter). Así carruseles y demás funcionan a costo $0 sin Claude.
  if (!hasApiKey()) return true;
  const b = getBudgetStatus();
  return b.breaker === 'open' || b.usedPct >= FREE_SWITCH_PCT;
};

// ── Tipos ──────────────────────────────────────────────────────────────────────

export type TaskType =
  | 'caption' // generar captions de Instagram
  | 'hashtags' // investigar y generar hashtags
  | 'strategy' // decisiones estratégicas de alto nivel
  | 'analysis' // analizar métricas, contenido, competidores
  | 'creative' // brainstorming, ideas, variaciones creativas
  | 'response' // respuestas a comentarios y DMs
  | 'bulk' // procesamiento en volumen (muchos items)
  | 'vision' // análisis de imágenes (requiere Claude)
  | 'planning' // planificación semanal/mensual
  | 'copywriting' // hooks, CTAs, copies publicitarios
  | 'audit' // auditorías de cuenta y contenido
  | 'translation'; // traducciones y localización

export interface RouterOptions {
  taskType?: TaskType;
  maxTokens?: number;
  temperature?: number;
  freeOnly?: boolean; // si true, nunca usa Claude
  systemPrompt?: string;
  language?: string;
  priority?: 'speed' | 'quality' | 'cost';
}

export interface RouterResult {
  text: string;
  provider: string;
  model: string;
  tokensUsed?: number;
  durationMs: number;
}

export interface ChunkResult {
  chunks: string[];
  combined: string;
  provider: string;
}

// ── Configuración de routing por tipo de tarea ──────────────────────────────

const TASK_ROUTING: Record<TaskType, { providers: string[]; notes: string }> = {
  caption: {
    providers: ['groq', 'openrouter', 'deepseek', 'claude-sonnet'],
    notes: 'Groq gratis → DeepSeek barato → Claude',
  },
  hashtags: {
    providers: ['groq', 'ollama', 'openrouter', 'deepseek'],
    notes: 'Tarea repetitiva, ideal para modelos gratuitos',
  },
  strategy: {
    providers: ['claude-opus', 'claude-sonnet', 'deepseek'],
    notes: 'Requiere razonamiento profundo (DeepSeek R1 como alternativa barata)',
  },
  analysis: {
    providers: ['groq', 'deepseek', 'claude-sonnet', 'openrouter'],
    notes: 'Groq rápido, DeepSeek barato, Claude profundo',
  },
  creative: {
    providers: ['groq', 'openrouter', 'deepseek', 'claude-sonnet'],
    notes: 'Variedad: free → barato → premium',
  },
  response: { providers: ['groq', 'ollama', 'openrouter', 'deepseek'], notes: 'Respuestas rápidas y baratas' },
  bulk: { providers: ['groq', 'ollama', 'deepseek'], notes: 'Volumen alto, prioridad costo' },
  vision: { providers: ['claude-sonnet', 'claude-opus'], notes: 'Análisis visual requiere Claude' },
  planning: { providers: ['claude-sonnet', 'deepseek', 'groq', 'openrouter'], notes: 'Planificación táctica' },
  copywriting: { providers: ['groq', 'openrouter', 'deepseek', 'claude-sonnet'], notes: 'Creatividad + persuasión' },
  audit: { providers: ['claude-sonnet', 'deepseek', 'groq'], notes: 'Auditorías requieren análisis detallado' },
  translation: {
    providers: ['groq', 'ollama', 'openrouter', 'deepseek'],
    notes: 'Traducción, modelos baratos suficientes',
  },
};

// ── Cache simple en memoria para evitar llamadas repetidas ─────────────────

const cache = new Map<string, { result: string; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

const getCached = (key: string): string | null => {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.result;
};

const setCached = (key: string, result: string): void => {
  // Limitar tamaño del cache
  if (cache.size > 200) {
    const firstKey = cache.keys().next().value;
    if (firstKey) cache.delete(firstKey);
  }
  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
};

// ── Función principal de routing ──────────────────────────────────────────

/**
 * Envía un prompt al mejor proveedor disponible según el tipo de tarea.
 * Garantiza respuesta incluso si el proveedor principal falla (fallback chain).
 */
export const ask = async (prompt: string, opts: RouterOptions = {}): Promise<RouterResult> => {
  const taskType = opts.taskType ?? 'creative';
  const priority = opts.priority ?? 'cost';
  const freeOnly = budgetAwareFreeOnly(opts.freeOnly);
  const start = Date.now();

  const temp = opts.temperature ?? 0.7;
  const cacheable = temp <= 0.5;

  // 1) Cache exacto (rápido) para tareas casi deterministas
  if (temp < 0.3) {
    const cacheKey = `${taskType}:${prompt.slice(0, 200)}`;
    const cached = getCached(cacheKey);
    if (cached) {
      return { text: cached, provider: 'cache', model: 'cached', durationMs: 0 };
    }
  }

  // 2) Cache SEMÁNTICO: prompt suficientemente equivalente → no se re-paga
  if (cacheable) {
    const hit = lookupSemantic(taskType, prompt);
    if (hit) {
      return { text: hit.text, provider: 'semantic-cache', model: hit.model, durationMs: Date.now() - start };
    }
  }

  const routing = TASK_ROUTING[taskType];
  let providers = [...routing.providers];

  // Si solo queremos gratis, filtrar Claude
  if (freeOnly) {
    providers = providers.filter((p) => !p.startsWith('claude'));
    if (providers.length === 0) providers = ['groq', 'ollama', 'openrouter'];
  }

  // Si la prioridad es calidad, mover Claude al frente
  if (priority === 'quality' && !freeOnly) {
    providers = ['claude-opus', ...providers.filter((p) => !p.startsWith('claude'))];
  } else if (providers.length > 1) {
    // El bandit aprende qué proveedor responde mejor (disponibilidad+latencia)
    // para este tipo de tarea y lo prueba primero. La cadena de fallback se
    // mantiene intacta detrás.
    const banditExp = `router:${taskType}`;
    const pref = pickArm(banditExp, providers).armId;
    providers = [pref, ...providers.filter((p) => p !== pref)];
  }

  const banditExp = `router:${taskType}`;
  const served = (provider: string, r: RouterResult): RouterResult => {
    rewardArm(banditExp, provider, r.durationMs < SLOW_MS);
    if (cacheable) storeSemantic(taskType, prompt, r.text, r.model);
    return r;
  };

  for (const provider of providers) {
    try {
      if (provider === 'groq') {
        const available = await isGroqAvailable();
        if (!available) continue;
        const text = await groqAsk(prompt, {
          systemPrompt: opts.systemPrompt,
          maxTokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.7,
        });
        const result = { text, provider: 'groq', model: 'llama-3.3-70b-versatile', durationMs: Date.now() - start };
        if (!opts.temperature || opts.temperature < 0.3) setCached(`${taskType}:${prompt.slice(0, 200)}`, text);
        return served(provider, result);
      }

      if (provider === 'ollama') {
        const available = await isOllamaAvailable();
        if (!available) continue;
        const text = await ollamaAsk(prompt, {
          systemPrompt: opts.systemPrompt,
        });
        return served(provider, { text, provider: 'ollama', model: 'local', durationMs: Date.now() - start });
      }

      if (provider === 'openrouter') {
        const available = await isOpenRouterAvailable();
        if (!available) continue;
        const text = await openRouterAsk(prompt, {
          systemPrompt: opts.systemPrompt,
          maxTokens: opts.maxTokens ?? 4096,
        });
        return served(provider, { text, provider: 'openrouter', model: 'free-tier', durationMs: Date.now() - start });
      }

      if (provider === 'deepseek') {
        if (!isDeepSeekAvailable()) continue;
        const text = await deepseekAsk(prompt, {
          systemPrompt: opts.systemPrompt,
          maxTokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature ?? 0.7,
        });
        return served(provider, { text, provider: 'deepseek', model: 'deepseek-chat', durationMs: Date.now() - start });
      }

      if (provider === 'claude-sonnet' && !freeOnly) {
        const text = await claudeAsk(prompt, {
          system: opts.systemPrompt ?? 'Sos un experto en Instagram y marketing digital.',
          maxTokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature,
        });
        return served(provider, {
          text,
          provider: 'anthropic',
          model: 'claude-sonnet-4-6',
          durationMs: Date.now() - start,
        });
      }

      if (provider === 'claude-opus' && !freeOnly) {
        const text = await claudeAsk(prompt, {
          system: opts.systemPrompt ?? 'Sos el mejor estratega de Instagram y marketing digital del mundo.',
          maxTokens: opts.maxTokens ?? 4096,
          temperature: opts.temperature,
        });
        return served(provider, {
          text,
          provider: 'anthropic',
          model: 'claude-opus-4-7',
          durationMs: Date.now() - start,
        });
      }
    } catch (err) {
      rewardArm(banditExp, provider, false);
      log.warn(`[TokenRouter] ${provider} falló: ${(err as Error).message} — probando siguiente`);
    }
  }

  // Último recurso: hubChat con fallback automático
  const result = await hubChat(prompt, { freeOnly });
  if (cacheable) storeSemantic(taskType, prompt, result.text, result.model ?? 'unknown');
  return {
    text: result.text,
    provider: result.provider,
    model: result.model ?? 'unknown',
    durationMs: Date.now() - start,
  };
};

/**
 * Genera JSON estructurado con el proveedor apropiado.
 * Siempre usa Claude para garantizar JSON válido en tareas complejas.
 */
export const askJson = async <T>(prompt: string, opts: RouterOptions = {}): Promise<T> => {
  const jsonPrompt = `${prompt}\n\nRESPONDÉ ÚNICAMENTE CON JSON VÁLIDO, SIN MARKDOWN NI TEXTO ADICIONAL.`;

  if (budgetAwareFreeOnly(opts.freeOnly)) {
    const result = await ask(jsonPrompt, opts);
    try {
      const clean = result.text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();
      return JSON.parse(clean) as T;
    } catch {
      throw new Error(`[TokenRouter] JSON inválido del proveedor ${result.provider}: ${result.text.slice(0, 200)}`);
    }
  }

  return claudeAskJson<T>(prompt, {
    system: opts.systemPrompt ?? 'Respondé siempre con JSON válido y bien estructurado.',
    maxTokens: opts.maxTokens,
    temperature: opts.temperature,
  } as PromptOptions);
};

/**
 * Procesa un array de prompts en paralelo (bulk operations).
 * Usa Groq/Ollama para procesar sin incurrir en costos.
 */
export const askBulk = async (prompts: string[], opts: RouterOptions = {}): Promise<RouterResult[]> => {
  const batchSize = 5; // máximo en paralelo para no saturar rate limits
  const results: RouterResult[] = [];

  for (let i = 0; i < prompts.length; i += batchSize) {
    const batch = prompts.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map((p) => ask(p, { ...opts, taskType: opts.taskType ?? 'bulk', freeOnly: true })),
    );
    results.push(...batchResults);

    // Pequeña pausa entre batches para respetar rate limits
    if (i + batchSize < prompts.length) {
      await new Promise<void>((r) => setTimeout(r, 1200));
    }
  }

  return results;
};

/**
 * Procesa texto largo en chunks y los combina.
 * Útil para analizar contenido largo sin límites de contexto.
 */
export const processLongText = async (
  text: string,
  instruction: string,
  opts: RouterOptions = {},
  chunkSize = 3000,
): Promise<ChunkResult> => {
  if (text.length <= chunkSize) {
    const result = await ask(`${instruction}\n\nTexto:\n${text}`, opts);
    return { chunks: [result.text], combined: result.text, provider: result.provider };
  }

  // Dividir en chunks con overlap para mantener coherencia
  const overlap = 200;
  const chunks: string[] = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + chunkSize));
    i += chunkSize - overlap;
  }

  log.debug(`[TokenRouter] Procesando ${chunks.length} chunks en paralelo`);

  const chunkResults = await askBulk(
    chunks.map((chunk, idx) => `${instruction}\n\nParte ${idx + 1}/${chunks.length}:\n${chunk}`),
    { ...opts, taskType: 'bulk', freeOnly: true },
  );

  const chunkTexts = chunkResults.map((r) => r.text);

  // Combinar resultados
  if (chunkTexts.length === 1) {
    return { chunks: chunkTexts, combined: chunkTexts[0] ?? '', provider: chunkResults[0]?.provider ?? 'unknown' };
  }

  const synthesisPrompt = `Combiná estos ${chunkTexts.length} análisis parciales en un resultado unificado y coherente:\n\n${chunkTexts.map((t, i) => `Parte ${i + 1}:\n${t}`).join('\n\n---\n\n')}`;

  const synthesis = await ask(synthesisPrompt, { ...opts, taskType: 'analysis' });
  return { chunks: chunkTexts, combined: synthesis.text, provider: synthesis.provider };
};

/**
 * Genera N variaciones de un caption/copy en paralelo.
 * Ideal para A/B testing de contenido.
 */
export const generateVariations = async (
  basePrompt: string,
  quantity: number,
  opts: RouterOptions = {},
): Promise<string[]> => {
  const prompts = Array.from(
    { length: quantity },
    (_, i) =>
      `${basePrompt}\n\nVariación ${i + 1} de ${quantity}: hacé esta versión única y diferente a las otras. Usá un tono y ángulo distintos.`,
  );

  const results = await askBulk(prompts, { ...opts, taskType: opts.taskType ?? 'creative' });
  return results.map((r) => r.text);
};

/**
 * Genera un caption completo con hashtags, CTA y emojis en una sola llamada eficiente.
 */
export const generateFullCaption = async (
  context: string,
  brand: { name: string; niche: string; tone: string; targetAudience: string },
  opts: RouterOptions = {},
): Promise<{ caption: string; hashtags: string[]; cta: string }> => {
  const prompt = `Generá un caption completo de Instagram para ${brand.name}.

Nicho: ${brand.niche}
Tono: ${brand.tone}
Audiencia objetivo: ${brand.targetAudience}
Contexto del post: ${context}

Respondé en JSON con este formato exacto:
{
  "caption": "texto del caption con emojis estratégicos y saltos de línea",
  "hashtags": ["hashtag1", "hashtag2", ...] (15-20 hashtags sin el #, mix de nichos),
  "cta": "llamada a la acción al final"
}`;

  return askJson<{ caption: string; hashtags: string[]; cta: string }>(prompt, {
    ...opts,
    taskType: 'caption',
    systemPrompt: 'Sos un experto en copywriting para Instagram. Creás contenido viral y auténtico.',
  });
};

/**
 * Responde un comentario o DM de forma personalizada y rápida.
 */
export const generateReply = async (
  originalMessage: string,
  context: string,
  brand: { name: string; tone: string },
  opts: RouterOptions = {},
): Promise<string> => {
  const prompt = `Generá UNA respuesta corta y auténtica para este ${context} en Instagram.

Marca: ${brand.name} (tono: ${brand.tone})
Mensaje a responder: "${originalMessage}"

La respuesta debe ser:
- Natural y humana (no robótica)
- Máximo 2-3 líneas
- Coherente con el tono de la marca
- Con emojis si aplica al tono
- Sin mencionar que sos una IA`;

  const result = await ask(prompt, {
    ...opts,
    taskType: 'response',
    freeOnly: true,
    systemPrompt: `Sos el community manager de ${brand.name}. Respondés de forma auténtica y rápida.`,
  });

  return result.text;
};
