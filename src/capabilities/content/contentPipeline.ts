/**
 * Pipeline completo de producción de contenido para FeedIA.
 * Orquesta el flujo: Idea → Brief → Contenido → Score → Mejora → Timing → Programación.
 * Cada etapa tiene un quality gate. El resultado es contenido listo para publicar.
 */

import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import { scoreAndImprove } from './contentScorer.js';
import { getBestPostingTime, shouldPostNow } from '../analytics/audienceTiming.js';
import { extractPatterns, getTopPerformers } from '../analytics/performanceDB.js';
import { log } from '../../agent/logger.js';
import { loadBrandProfile } from '../../config/index.js';
import type { ContentFormat, ContentPiece, BrandProfile } from '../../config/types.js';

// ── Tipos del pipeline ────────────────────────────────────────────────────────

export interface PipelineInput {
  idea: string; // La idea o tema a desarrollar
  format?: ContentFormat; // Si no se especifica, el pipeline elige el mejor
  targetAudience?: string; // Segmento específico (override del brand default)
  objective?: 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad';
  tone?: string; // Override del tono de marca
  urgency?: 'now' | 'next-slot' | 'this-week';
  skipScoring?: boolean; // Para pruebas o contenido ya revisado
}

export interface ContentBrief {
  format: ContentFormat;
  angle: string; // El ángulo único de abordaje
  hook: string; // Primera línea (el hook principal)
  keyMessages: string[]; // 3-4 mensajes clave a comunicar
  cta: string; // CTA específico
  visualDirection: string; // Qué mostrar visualmente
  estimatedPerformance: string;
  whyThisAngle: string;
}

export interface PipelineResult {
  ok: boolean;
  content?: ContentPiece;
  brief?: ContentBrief;
  scoreResult?: { overall: number; approved: boolean; feedback: string[] };
  scheduledFor?: string; // ISO string del slot recomendado
  timingAdvice?: string;
  iterations?: number; // Iteraciones de mejora necesarias
  failReason?: string;
  durationMs: number;
}

// ── Etapa 1: Elección de formato ──────────────────────────────────────────────

const chooseBestFormat = async (idea: string, brand: BrandProfile): Promise<ContentFormat> => {
  const patterns = extractPatterns();
  const bestFmt = patterns.bestFormats[0]?.format ?? 'reel';

  const prompt = `Para esta idea de contenido de Instagram, elegí el formato más adecuado.

MARCA: ${brand.name} (${brand.niche})
OBJETIVO PRINCIPAL: ${brand.goals.primary}
IDEA: ${idea}
FORMATO QUE MEJOR LE FUNCIONA HISTÓRICAMENTE: ${bestFmt}

Formatos disponibles: reel, carrusel, post-imagen, historia, reel-faceless

Respondé SOLO con el nombre del formato (una sola palabra).`;

  const result = await routerAsk(prompt, { taskType: 'strategy', freeOnly: true });
  const chosen = result.text.trim().toLowerCase();
  const valid: ContentFormat[] = ['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless', 'live'];
  return valid.includes(chosen as ContentFormat) ? (chosen as ContentFormat) : bestFmt;
};

// ── Etapa 2: Generación de brief ──────────────────────────────────────────────

const generateBrief = async (
  idea: string,
  format: ContentFormat,
  brand: BrandProfile,
  input: PipelineInput,
): Promise<ContentBrief> => {
  const topPerformers = getTopPerformers(format, 3);
  const topHooks = topPerformers.map((p) => `"${p.hookText}"`).join(' | ');
  const audience = input.targetAudience ?? brand.audience.description;
  const objective = input.objective ?? brand.goals.primary;

  const prompt = `Creá un brief de contenido de Instagram para esta idea.

MARCA: ${brand.name}
NICHO: ${brand.niche}
AUDIENCIA: ${audience}
OBJETIVO: ${objective}
FORMATO: ${format}
IDEA BASE: ${idea}
TONO DE VOZ: ${(input.tone ?? brand.voice.tone).toString()}
${topHooks ? `HOOKS QUE FUNCIONARON EN ESTA CUENTA: ${topHooks}` : ''}

El brief debe tener un ángulo ÚNICO y específico. No genérico.

JSON:
{
  "format": "${format}",
  "angle": "el ángulo único y específico",
  "hook": "primera línea del caption — debe ser irresistible",
  "keyMessages": ["mensaje 1", "mensaje 2", "mensaje 3"],
  "cta": "CTA específico y accionable",
  "visualDirection": "qué mostrar en pantalla, composición, elementos clave",
  "estimatedPerformance": "por qué este ángulo debería funcionar bien",
  "whyThisAngle": "razón estratégica para elegir este enfoque"
}`;

  return routerAskJson<ContentBrief>(prompt, {
    taskType: 'strategy',
    systemPrompt: 'Sos un estratega de contenido de Instagram de elite. Creás briefs precisos y accionables.',
  });
};

// ── Etapa 3: Producción del contenido ────────────────────────────────────────

const produceContent = async (
  brief: ContentBrief,
  brand: BrandProfile,
  input: PipelineInput,
): Promise<ContentPiece> => {
  const forbidden = brand.voice.forbidden.length > 0 ? `NUNCA usar: ${brand.voice.forbidden.join(', ')}` : '';

  const prompt = `Escribí el contenido completo de Instagram basado en este brief.

MARCA: ${brand.name}
TONO: ${(input.tone ?? brand.voice.tone).toString()}
${forbidden}

BRIEF:
- Ángulo: ${brief.angle}
- Hook: ${brief.hook}
- Mensajes clave: ${brief.keyMessages.join(' | ')}
- CTA: ${brief.cta}
- Formato: ${brief.format}

REGLAS DEL CAPTION:
1. Primera línea = hook del brief (modificable si mejora)
2. Desarrollá los mensajes clave con valor real, no relleno
3. Usá saltos de línea entre ideas
4. Emojis estratégicos (5-10 máximo)
5. CTA al final, específico y accionable
6. Separar hashtags del caption con \\n\\n

REGLAS DE HASHTAGS:
- 18-22 hashtags
- Mix: 5 amplios (comunidad), 8 de nicho, 5 micro-nicho

JSON:
{
  "id": "cp-${Date.now()}",
  "format": "${brief.format}",
  "hook": "primera línea del caption",
  "body": "cuerpo del caption (sin hook ni CTA)",
  "caption": "caption completo con emojis, saltos de línea y hashtags al final",
  "cta": "${brief.cta}",
  "hashtags": ["hashtag1", "hashtag2"],
  "visualDirection": "${brief.visualDirection}",
  "rationale": "por qué este contenido va a funcionar"
}`;

  return routerAskJson<ContentPiece>(prompt, {
    taskType: 'caption',
    systemPrompt: `Sos el mejor copywriter de Instagram de habla hispana. Creás contenido que genera engagement real.`,
    maxTokens: 3000,
  });
};

// ── Etapa 4: Timing ───────────────────────────────────────────────────────────

const resolveScheduling = (
  format: ContentFormat,
  urgency: PipelineInput['urgency'],
): {
  scheduledFor: string;
  timingAdvice: string;
} => {
  const timing = getBestPostingTime(format);
  const check = shouldPostNow(format);
  const now = new Date();

  if (urgency === 'now' || (urgency !== 'this-week' && check.recommended)) {
    return {
      scheduledFor: now.toISOString(),
      timingAdvice: `Publicar AHORA. ${check.reason}`,
    };
  }

  // Calcular próximo slot óptimo
  const best = timing.bestSlot;
  const next = new Date(now);
  const daysUntil = (best.day - now.getDay() + 7) % 7 || (now.getHours() < best.hour ? 0 : 7);
  next.setDate(next.getDate() + daysUntil);
  next.setHours(best.hour, 0, 0, 0);

  return {
    scheduledFor: next.toISOString(),
    timingAdvice: `Programado para: ${timing.bestSlot.label}. ${check.reason}`,
  };
};

// ── Pipeline principal ────────────────────────────────────────────────────────

/**
 * Ejecuta el pipeline completo de producción de contenido.
 * idea → formato → brief → contenido → score → mejora → timing
 */
export const runContentPipeline = async (input: PipelineInput): Promise<PipelineResult> => {
  const t0 = Date.now();
  const brand = loadBrandProfile();
  log.info(`[ContentPipeline] Iniciando pipeline para: "${input.idea.slice(0, 60)}..."`);

  try {
    // 1. Elegir formato
    const format = input.format ?? (await chooseBestFormat(input.idea, brand));
    log.debug(`[ContentPipeline] Formato elegido: ${format}`);

    // 2. Generar brief
    const brief = await generateBrief(input.idea, format, brand, input);
    log.debug(`[ContentPipeline] Brief generado. Ángulo: "${brief.angle}"`);

    // 3. Producir contenido
    const rawContent = await produceContent(brief, brand, input);
    log.debug(`[ContentPipeline] Contenido producido (${rawContent.caption.length} chars)`);

    // 4. Score + mejora automática
    let finalContent = rawContent;
    let scoreResult: PipelineResult['scoreResult'] = { overall: 100, approved: true, feedback: [] };
    let iterations = 0;

    if (!input.skipScoring) {
      const scored = await scoreAndImprove(
        {
          caption: rawContent.caption,
          hashtags: rawContent.hashtags,
          format,
          hasCTA: rawContent.cta.length > 0,
          topic: input.idea,
          hasVisualBrief: rawContent.visualDirection !== undefined,
        },
        2,
      );

      scoreResult = {
        overall: scored.finalScore.overall,
        approved: scored.finalScore.approved,
        feedback: scored.finalScore.feedback,
      };
      iterations = scored.iterations;

      if (scored.iterations > 0) {
        finalContent = { ...rawContent, caption: scored.finalContent.caption };
        log.info(
          `[ContentPipeline] Caption mejorado en ${iterations} iteración/es. Score final: ${scoreResult.overall}/100`,
        );
      }

      if (!scoreResult.approved) {
        log.warn(
          `[ContentPipeline] Contenido no alcanzó score mínimo (${scoreResult.overall}/100). Requiere revisión humana.`,
        );
      }
    }

    // 5. Timing
    const { scheduledFor, timingAdvice } = resolveScheduling(format, input.urgency);

    log.info(
      `[ContentPipeline] ✅ Pipeline completado en ${Date.now() - t0}ms. Score: ${scoreResult.overall}/100. Slot: ${scheduledFor}`,
    );

    return {
      ok: true,
      content: finalContent,
      brief,
      scoreResult,
      scheduledFor,
      timingAdvice,
      iterations,
      durationMs: Date.now() - t0,
    };
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[ContentPipeline] Error en pipeline: ${msg}`);
    return { ok: false, failReason: msg, durationMs: Date.now() - t0 };
  }
};

/**
 * Produce N variaciones de contenido a partir de la misma idea con ángulos distintos.
 * Útil para A/B testing o para elegir el mejor antes de publicar.
 */
export const runVariationPipeline = async (input: PipelineInput, variations = 3): Promise<PipelineResult[]> => {
  log.info(`[ContentPipeline] Generando ${variations} variaciones para: "${input.idea.slice(0, 50)}"`);

  const angles = await routerAskJson<string[]>(
    `Generá ${variations} ángulos DISTINTOS para este tema de Instagram: "${input.idea}".
Cada ángulo debe ser único en enfoque, tono o audiencia.
Respondé con JSON: ["ángulo 1", "ángulo 2", "ángulo 3"]`,
    { taskType: 'creative', freeOnly: true },
  );

  const results = await Promise.all(
    angles
      .slice(0, variations)
      .map((angle) => runContentPipeline({ ...input, idea: `${input.idea} — ángulo: ${angle}`, skipScoring: false })),
  );

  // Ordenar por score
  return results.sort((a, b) => (b.scoreResult?.overall ?? 0) - (a.scoreResult?.overall ?? 0));
};

/**
 * Genera el plan de contenido de la semana: N piezas con formatos y temas variados.
 */
export const planWeekContent = async (
  ideas: string[],
  brand?: BrandProfile,
): Promise<{ plan: ContentBrief[]; totalEstimatedReach: string }> => {
  const b = brand ?? loadBrandProfile();

  const prompt = `Creá un plan de contenido semanal de Instagram para ${b.name}.

Ideas disponibles:
${ideas.map((idea, i) => `${i + 1}. ${idea}`).join('\n')}

Nicho: ${b.niche}
Objetivo: ${b.goals.primary}
Formatos a combinar: 2-3 reels, 1-2 carruseles, stories diarias

Para cada pieza del plan, definí:
- format, angle, hook, keyMessages (array), cta, visualDirection, estimatedPerformance, whyThisAngle

Respondé con JSON: { "plan": [ {brief1}, {brief2}, ... ], "totalEstimatedReach": "estimado de alcance combinado semanal" }`;

  return routerAskJson<{ plan: ContentBrief[]; totalEstimatedReach: string }>(prompt, {
    taskType: 'planning',
    systemPrompt:
      'Sos un director de contenido de Instagram. Planificás con criterio estratégico y orientación a resultados.',
    maxTokens: 4000,
  });
};
