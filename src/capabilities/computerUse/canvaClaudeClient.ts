/**
 * Canva Claude Client — cliente especializado para los 7 agentes del Canva Brain.
 *
 * Optimizaciones clave (siguiendo el skill de Claude API):
 *
 *  1. **Prompt caching del contexto de marca.** Los 7 agentes (Estratega,
 *     Copywriter, Director de Arte, Validador, Optimizador, QA Estético,
 *     Diseñador Gráfico) reciben EL MISMO bloque de identidad de marca.
 *     Renderizamos ese bloque como `system` con `cache_control: ephemeral` →
 *     el primer agente lo escribe en cache (~1.25× el costo) y los 6
 *     siguientes lo leen a ~0.1× del costo input. Para una marca con
 *     ~800 tokens de contexto, ahorro neto ~80% en input tokens por job.
 *
 *  2. **Opus 4.7 con adaptive thinking** por defecto para los roles que
 *     requieren juicio creativo (Director de Arte, QA Estético, Estratega).
 *     Roles deterministas (validador, formateadores) usan Sonnet 4.6.
 *
 *  3. **JSON mode vía instrucción explícita** + parser defensivo. La SDK
 *     v0.32 no tiene `messages.parse()` aún; replicamos su efecto con
 *     limpieza de fences y `JSON.parse` con fallback explícito.
 *
 *  4. **Streaming opcional** para salidas largas (briefs creativos completos,
 *     planes visuales detallados) — evita timeouts HTTP con max_tokens altos.
 *
 *  5. **Cache hit telemetry** — log `cache_read_input_tokens` para verificar
 *     que el caché efectivamente está activo. Si es 0 entre llamadas
 *     repetidas, hay un invalidador silencioso (timestamp/UUID/orden).
 *
 * Si la API key no está configurada, falla con `MissingApiKeyError` (el
 * caller en canvaBrain.ts ya tiene fallback determinista).
 */

import Anthropic from '@anthropic-ai/sdk';
import { claude, hasApiKey, MissingApiKeyError } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

// SDK v0.32 todavía no tipa `claude-opus-4-7`, `adaptive thinking`, ni
// `output_config`. La API HTTP los acepta — casteamos solo en el sitio
// puntual del `messages.create` para no perder el resto de los tipos.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const claudeAny = claude as any;

export type CanvaAgentTier = 'creative' | 'analytical' | 'fast';

/**
 * Tier → modelo. Las nuevas IDs no están en los literales de SDK 0.32 pero
 * la API HTTP las acepta como string. Sin date suffix (ver `shared/models.md`).
 */
const MODEL_BY_TIER: Record<CanvaAgentTier, string> = {
  creative: 'claude-opus-4-7', // Director de Arte, QA Estético, Estratega
  analytical: 'claude-sonnet-4-6', // Copywriter, Optimizador
  fast: 'claude-haiku-4-5', // Validador rápido, formateadores
};

/**
 * Render del contexto de marca como bloque CACHEABLE.
 *
 * IMPORTANTE: el contenido debe ser DETERMINISTA — sin `Date.now()`, sin
 * UUIDs, sin sets desordenados. Cualquier byte que cambie invalida el caché.
 * Ordenamos arrays alfabéticamente, formateamos hex en mayúscula, etc.
 */
export const renderBrandContextForCache = (brand: BrandProfile): string => {
  // Orden determinista — cualquier cambio invalida el caché (ver
  // shared/prompt-caching.md → silent invalidators). Ordenamos arrays y
  // usamos lowercase para hex consistente.
  const sort = (arr: readonly string[] | undefined): string[] => [...(arr ?? [])].sort();
  const palette = sort(brand.visual.palette).map((c) => c.toLowerCase());
  const tones = sort(brand.voice.tone);
  const forbidden = sort(brand.voice.forbidden);
  const refQuotes = sort(brand.voice.referenceQuotes);
  const pains = sort(brand.audience?.pains);
  const desires = sort(brand.audience?.desires);
  const compositionRules = sort(brand.visual.compositionRules);
  const allowedIconography = sort(brand.visual.allowedIconography);
  const forbiddenIconography = sort(brand.visual.forbiddenIconography);
  const values = sort(brand.brandStrategy?.values);
  const differentiators = sort(brand.brandStrategy?.differentiators);
  const personality = sort(brand.brandStrategy?.personality);
  const experiencePrinciples = sort(brand.brandStrategy?.experiencePrinciples);

  return `# CONTEXTO DE MARCA — ${brand.name}

Este bloque describe la identidad completa de la marca. Es la MISMA para todos
los agentes del equipo Canva (Estratega, Copywriter, Director de Arte,
Validador, QA Estético, Especialista Social Media, Diseñador Gráfico). Es la
base de toda decisión creativa — leelo entero antes de razonar sobre el pedido
específico que viene en el mensaje del usuario.

## Identidad
- Nombre: ${brand.name}
- Tipo: ${brand.type}
- Nicho: ${brand.niche}

## Audiencia
- Descripción: ${brand.audience?.description ?? '(no definida)'}
- Locale: ${brand.audience?.locale ?? 'es-AR'}
- Dolores (JTBD): ${pains.join('; ') || '(no definidos)'}
- Deseos (JTBD): ${desires.join('; ') || '(no definidos)'}

## Voz
- Tono: ${tones.join(', ')}
- Palabras prohibidas: ${forbidden.join(', ') || 'ninguna'}
- Frases de referencia: ${refQuotes.length > 0 ? refQuotes.map((q) => `"${q}"`).join(' | ') : '(ninguna)'}

## Identidad visual
- Paleta (hex): ${palette.join(', ') || '(no definida)'}
- Tipografías: ${(brand.visual.typography ?? []).join(' · ') || '(no definidas)'}
- Estilo: ${brand.visual.style ?? 'minimalista'}
- Mood: ${brand.visual.mood ?? 'profesional'}
- Estilo fotográfico: ${brand.visual.photographyStyle ?? 'natural'}
- Densidad visual: ${brand.visual.density ?? 'medium'}
- Ratio imagen/texto: ${brand.visual.imageTextRatio ?? 'balanced'}
- Reglas de composición: ${compositionRules.join('; ') || '(ninguna)'}
- Iconografía permitida: ${allowedIconography.join(', ') || '(libre)'}
- Iconografía prohibida: ${forbiddenIconography.join(', ') || '(ninguna)'}

## Estrategia de marca
- Visión: ${brand.brandStrategy?.vision || '(no definida)'}
- Misión: ${brand.brandStrategy?.mission || '(no definida)'}
- Posicionamiento: ${brand.brandStrategy?.positioning || '(no definido)'}
- Promesa: ${brand.brandStrategy?.promise || '(no definida)'}
- Valores: ${values.join(', ') || '(no definidos)'}
- Personalidad: ${personality.join(', ') || '(no definida)'}
- Diferenciadores: ${differentiators.join('; ') || '(no definidos)'}
- Principios de experiencia: ${experiencePrinciples.join('; ') || '(ninguno)'}
- Arquetipo: ${brand.brandStrategy?.archetype || '(no definido)'}
- Story: ${brand.brandStrategy?.story || '(no definida)'}

## Objetivos de Instagram
- Objetivo primario: ${brand.goals?.primary ?? '(no definido)'}
- Métricas clave: ${(brand.goals?.metricsToWatch ?? []).join(', ') || '(no definidas)'}
${brand.accountCategory ? `\n## Categoría de cuenta\n- Tipo de cuenta: ${brand.accountCategory}\n- Industria: ${brand.industryCategory ?? '(genérica)'}` : ''}${brand.contentPillars?.length ? `\n\n## Pilares de contenido\n${brand.contentPillars.map((p) => `- ${p.name} (${p.weight}%): ${p.description}`).join('\n')}` : ''}${
    brand.complianceRules?.length
      ? `\n\n## Reglas de compliance del nicho (OBLIGATORIAS)\n${brand.complianceRules
          .filter((r) => r.required)
          .map((r) => `- [${r.id}] ${r.description}${r.example ? ` — Ejemplo: "${r.example}"` : ''}`)
          .join('\n')}`
      : ''
  }

# REGLAS GLOBALES PARA TODOS LOS AGENTES
- Respondé SIEMPRE en español rioplatense (locale: ${brand.audience?.locale ?? 'es-AR'})
- Cero clickbait, cero palabras genéricas (gurú, literalmente, increíble, game-changer)
- Honrá la lista de palabras prohibidas: si alguna aparece en tu output, reescribilo
- Salida estrictamente JSON cuando se solicita — sin fences markdown, sin texto antes/después
- Toda decisión creativa debe ser consistente con la voz, identidad visual y posicionamiento de arriba
- Si la marca tiene reglas de compliance, respetarlas en TODA la comunicación generada`;
};

export interface CanvaAgentCallOptions {
  agentRole: string; // ej "Director de Arte" — solo para logs/telemetry
  tier?: CanvaAgentTier; // default: 'creative'
  taskPrompt: string; // el pedido específico del agente (NO cached)
  maxTokens?: number; // default 2000
  useAdaptiveThinking?: boolean; // default true para creative tier
  budget?: BrainBudget; // circuit breaker opcional — si se supera, lanza BudgetExceededError
}

export interface CanvaAgentCallResult<T> {
  data: T;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

const stripJsonFences = (text: string): string =>
  text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

// ── Per-brain budget circuit breaker ─────────────────────────────────────────
// Evita que un job runaway consuma tokens ilimitados. El breaker es por job
// (no persistente), se resetea cuando se crea un nuevo job.
// Default: 100K output tokens por job completo. Si se supera, lanza error.

export interface BrainBudget {
  maxOutputTokens: number; // límite de output tokens por job
  maxInputTokens: number; // límite de input tokens por job (excl. cache)
  consumedOutput: number;
  consumedInput: number;
  tripped: boolean;
}

export const createBrainBudget = (maxOutputTokens = 100_000, maxInputTokens = 200_000): BrainBudget => ({
  maxOutputTokens,
  maxInputTokens,
  consumedOutput: 0,
  consumedInput: 0,
  tripped: false,
});

/**
 * Registra consumo y lanza `BudgetExceededError` si se supera el límite.
 * Llamar ANTES de hacer la request para detectar el breaker previo, y DESPUÉS
 * para acumular el consumo real.
 */
export class BudgetExceededError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetExceededError';
  }
}

export const checkAndAccumulateBudget = (
  budget: BrainBudget | undefined,
  outputTokens: number,
  inputTokens: number,
): void => {
  if (!budget) return;
  if (budget.tripped) {
    throw new BudgetExceededError(
      `[BrainBudget] Circuit breaker abierto — job cancelado. ` +
        `Output consumido: ${budget.consumedOutput}/${budget.maxOutputTokens}.`,
    );
  }
  budget.consumedOutput += outputTokens;
  budget.consumedInput += inputTokens;
  if (budget.consumedOutput > budget.maxOutputTokens || budget.consumedInput > budget.maxInputTokens) {
    budget.tripped = true;
    throw new BudgetExceededError(
      `[BrainBudget] Límite superado — output: ${budget.consumedOutput}/${budget.maxOutputTokens}, ` +
        `input: ${budget.consumedInput}/${budget.maxInputTokens}. Job abortado.`,
    );
  }
};

/**
 * Llamada genérica de un agente Canva con prompt caching del brand context.
 *
 * El llamador construye el `taskPrompt` específico del agente. El sistema
 * inyecta el bloque cacheado de marca + reglas globales como `system` con
 * `cache_control: ephemeral`. Los 7 agentes usando esta función comparten
 * el mismo prefijo cacheado.
 */
export const callCanvaAgent = async <T>(
  brand: BrandProfile,
  options: CanvaAgentCallOptions,
): Promise<CanvaAgentCallResult<T>> => {
  if (!hasApiKey()) throw new MissingApiKeyError();

  const tier = options.tier ?? 'creative';
  const model = MODEL_BY_TIER[tier];
  const maxTokens = options.maxTokens ?? 2000;
  const useThinking = options.useAdaptiveThinking ?? tier === 'creative';
  const start = Date.now();

  const brandContext = renderBrandContextForCache(brand);

  // System con cache_control en el último bloque → cachea tools + system.
  // Tipamos como any solo en este sitio para incluir cache_control (la SDK
  // 0.32 lo soporta runtime aunque no esté en los types).
  const systemBlocks = [
    {
      type: 'text',
      text: brandContext,
      cache_control: { type: 'ephemeral' as const },
    },
  ];

  const messages: Anthropic.MessageParam[] = [
    {
      role: 'user',
      content: `${options.taskPrompt}\n\nRespondé EXCLUSIVAMENTE con JSON válido — sin texto antes ni después, sin bloques de código markdown.`,
    },
  ];

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: systemBlocks,
    messages,
  };

  if (useThinking) {
    // Adaptive thinking — Opus 4.7 / 4.6 / Sonnet 4.6. La SDK 0.32 no lo
    // tipa pero el endpoint lo acepta.
    requestBody['thinking'] = { type: 'adaptive' };
  }

  let response: Anthropic.Message;
  try {
    response = await claudeAny.messages.create(requestBody);
  } catch (err) {
    // Re-throw con contexto adicional para el caller
    const apiErr = err as Error & { status?: number; type?: string };
    if (apiErr.status === 400 && apiErr.message?.includes('thinking')) {
      log.warn(`[CanvaClaudeClient] adaptive thinking rechazado por ${model}, reintentando sin thinking...`);
      delete requestBody['thinking'];
      response = await claudeAny.messages.create(requestBody);
    } else {
      throw err;
    }
  }

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`[CanvaClaudeClient] ${options.agentRole}: respuesta sin bloque de texto`);
  }

  const cleaned = stripJsonFences(textBlock.text);
  let parsed: T;
  try {
    parsed = JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[CanvaClaudeClient] ${options.agentRole}: JSON inválido. Error: ${(err as Error).message}\n` +
        `Primeros 400 chars: ${cleaned.slice(0, 400)}`,
    );
  }

  // Telemetría de caché — log y retorno para que el caller pueda agregar
  // a su propio panel de costos. Si cacheRead==0 después de la 1ra llamada
  // del job, hay un invalidador silencioso en `renderBrandContextForCache`.
  const usage = response.usage as Anthropic.Usage & {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const cacheWrite = usage.cache_creation_input_tokens ?? 0;

  log.info(
    `[CanvaClaudeClient] ${options.agentRole} (${model}) · ` +
      `in=${usage.input_tokens} cache_read=${cacheRead} cache_write=${cacheWrite} ` +
      `out=${usage.output_tokens} · ${Date.now() - start}ms`,
  );

  // Registrar consumo en el circuit breaker (si está activo)
  checkAndAccumulateBudget(options.budget, usage.output_tokens, usage.input_tokens);

  return {
    data: parsed,
    cacheReadTokens: cacheRead,
    cacheWriteTokens: cacheWrite,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    model,
    durationMs: Date.now() - start,
  };
};

/**
 * Versión streaming para outputs largos (briefs completos, planes visuales
 * detallados con max_tokens > 16K). Necesario para evitar timeouts HTTP.
 * Devuelve el final message igual que `callCanvaAgent`.
 */
export const callCanvaAgentStreaming = async <T>(
  brand: BrandProfile,
  options: CanvaAgentCallOptions,
): Promise<CanvaAgentCallResult<T>> => {
  if (!hasApiKey()) throw new MissingApiKeyError();

  const tier = options.tier ?? 'creative';
  const model = MODEL_BY_TIER[tier];
  const maxTokens = options.maxTokens ?? 64000;
  const useThinking = options.useAdaptiveThinking ?? tier === 'creative';
  const start = Date.now();

  const brandContext = renderBrandContextForCache(brand);

  const requestBody: Record<string, unknown> = {
    model,
    max_tokens: maxTokens,
    system: [{ type: 'text', text: brandContext, cache_control: { type: 'ephemeral' as const } }],
    messages: [
      {
        role: 'user',
        content: `${options.taskPrompt}\n\nRespondé EXCLUSIVAMENTE con JSON válido — sin fences, sin texto extra.`,
      },
    ],
  };
  if (useThinking) requestBody['thinking'] = { type: 'adaptive' };

  // SDK 0.32 .stream() devuelve un MessageStream con .finalMessage()
  const stream = claudeAny.messages.stream(requestBody);
  const finalMessage: Anthropic.Message = await stream.finalMessage();

  const textBlock = finalMessage.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error(`[CanvaClaudeClient streaming] ${options.agentRole}: respuesta sin bloque de texto`);
  }

  const cleaned = stripJsonFences(textBlock.text);
  const parsed = JSON.parse(cleaned) as T;

  const usage = finalMessage.usage as Anthropic.Usage & {
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };

  return {
    data: parsed,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    model,
    durationMs: Date.now() - start,
  };
};
