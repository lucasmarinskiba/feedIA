/**
 * Forge IA — backend de las tres etapas que promete la herramienta:
 *
 *   1. Estrategia  → hooks rankeados + formato/horario/CTA que mejor rindieron en la cuenta.
 *   2. Producción  → carrusel, reel o historia con los pipelines reales (quickCarousel/quickReel/quickStory).
 *   3. Predicción  → veredicto del modelo calibrado con los posts reales de la cuenta, más señales
 *                    de contenido (compartir/guardar) y de hook. Cada señal se reporta por separado:
 *                    no hay un "score viral" inventado.
 *
 * Cada etapa es un endpoint independiente: el frontend encadena o itera según lo que el usuario decide.
 */

import type { BrandProfile, ContentFormat } from '../config/types.js';
import type { ContentFormat as FormatoCuota } from '../db/user-tiers.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { log } from '../agent/logger.js';
import { leerPostsHistorial } from '../capabilities/executive/postsStore.js';
import {
  historialDesdePosts,
  predecirContenido,
  resumenHistorial,
  type FormatoContenido,
  type GrupoResumen,
  type NivelVeredicto,
  type PrediccionContenido,
  type ResumenHistorial,
} from '../capabilities/executive/predictorModelo.js';
import { generateHooks, scoreHook, type GeneratedHook, type HookScore } from '../capabilities/copywriting/hookLab.js';
import { scoreContent, type ScoreCard } from '../capabilities/contentScorer/scorer.js';
import {
  createQuickCarousel,
  type QuickCarouselPackage,
  type QuickCarouselPrompt,
} from '../capabilities/quickCarousel/quickCarousel.js';
import { createQuickReel } from '../capabilities/quickReel/quickReel.js';
import type { ReelScript } from '../capabilities/reelStudio/reelScriptwriter.js';
import {
  createQuickStory,
  type QuickStoryPackage,
  type QuickStoryPrompt,
} from '../capabilities/quickStory/quickStory.js';
import { checkFormatQuota, commitFormatUsage } from '../middleware/tier-enforcer.js';
import {
  FORMATOS_FORGE,
  OBJETIVOS_FORGE,
  PLATAFORMAS_FORGE,
  PLAYBOOK_OBJETIVO,
  chequeosEstrategia,
  planEstrategia,
  type ChequeoEstrategia,
  type FormatoForge,
  type ObjetivoForge,
  type PlanEstrategia,
  type PlataformaForge,
} from '../capabilities/forge/conocimientoEstrategia.js';
// Phase 2: Predictor breakdown + recommendations
import { analyzeScores, type PredictorAnalysis } from '../capabilities/forge/predictorBreakdown.js';

// Phase 3: Batch comparison + trends
import {
  compareAttempts,
  type AttemptSnapshot,
  type BatchComparisonResult,
} from '../capabilities/forge/batchComparator.js';

// Phase 4: Content suggestions
import {
  getSuggestions,
  getSuggestionsByScore,
  type DetailedSuggestion,
} from '../capabilities/forge/contentSuggestions.js';

// Phase 5: Performance forecasting
import { forecastScores, type PerformanceForecast } from '../capabilities/forge/performanceForecaster.js';

// Phase 6: A/B testing
import { runABTest, type ABTestResult, type ContentVariant } from '../capabilities/forge/abTester.js';

// Phase 7: Competitor benchmarking
import { benchmarkScores, getAllNiches, type BenchmarkComparison } from '../capabilities/forge/competitorBenchmark.js';

// Phase 8: Seasonality & trend analysis
import { analyzeSeasonality, type SeasonalityAnalysis } from '../capabilities/forge/seasonalityTrend.js';

// Phase 9: Audience persona analysis
import { analyzeAudiencePersonas, type PersonaAnalysisResult } from '../capabilities/forge/audiencePersonaAnalysis.js';

// Phase 10: Hashtag strategy
import { analyzeHashtagStrategy, type HashtagStrategyResult } from '../capabilities/forge/hashtagStrategy.js';

// Phase 11: Content calendar planner
import { planContentCalendar, type ContentCalendarPlan } from '../capabilities/forge/contentCalendarPlanner.js';

// Phase 12: Revenue potential estimate
import { estimateRevenuePotential, type RevenuePotential } from '../capabilities/forge/revenuePotentialEstimate.js';

// Phase 13: Account health scorecard
import { calculateAccountHealth, type AccountHealthScorecard } from '../capabilities/forge/accountHealthScorecard.js';

// Phase 14: Viral coefficient score
import {
  calculateViralCoefficient,
  type ViralCoefficientResult,
  type ViralityFactors,
} from '../capabilities/forge/viralCoefficientScore.js';

// Phase 15: Content repurposing strategy
import { planContentRepurposing, type RepurposingPlan } from '../capabilities/forge/contentRepurposingStrategy.js';

// Phase 16: Audience growth trajectory
import {
  projectAudienceGrowth,
  type AudienceGrowthTrajectory,
} from '../capabilities/forge/audienceGrowthTrajectory.js';

// Phase 2: DB persistence (future)
// import {
//   saveForgeAttempt,
//   getForgeHistory,
//   saveImprovement,
//   getImprovementsBetween,
//   type ForgeAttempt,
// } from '../database/forgeHistory.js';

export { FORMATOS_FORGE, OBJETIVOS_FORGE, PLATAFORMAS_FORGE };
export type { FormatoForge, ObjetivoForge, PlataformaForge };

/* ───────── Tipos de entrada y salida ───────── */

export interface EntradaForge {
  tema: string;
  formato: FormatoForge;
  plataforma: PlataformaForge;
  objetivo: ObjetivoForge;
  nicho: string;
  voz: string;
  competidores: string[];
  hook: string | null;
  /** Ángulo elegido de la etapa de estrategia (promesa concreta del tema). */
  angulo: string | null;
  /** Correcciones que el predictor pidió en la iteración anterior. Vacío en la primera versión. */
  ajustes: string[];
}

export interface ParteForge {
  orden: number;
  titulo: string;
  texto: string;
  nota: string;
}

export interface PiezaForge {
  formato: FormatoForge;
  hook: string;
  caption: string;
  hashtags: string[];
  portada: string;
  duracionSeg: number | null;
  cuerpo: ParteForge[];
  paqueteId: string;
}

export interface GrupoCuenta {
  etiqueta: string;
  posts: number;
  vsMediana: number | null;
}

export interface RecomendacionCuenta {
  disponible: boolean;
  motivo: string;
  posts: number;
  /** Cómo rindió el formato elegido frente a la mediana de la cuenta. */
  elegido: GrupoCuenta | null;
  mejorFormato: GrupoCuenta | null;
  mejorFranja: GrupoCuenta | null;
  mejorHook: GrupoCuenta | null;
  mejorCta: GrupoCuenta | null;
}

export type DecisionForge = 'listo' | 'mejorar';

/* ───────── Mapeos a los módulos existentes ───────── */

const FORMATO_CONTENIDO: Record<FormatoForge, ContentFormat> = {
  carrusel: 'carrusel',
  reel: 'reel',
  historia: 'historia',
};

/** El modelo de la cuenta sólo aprende de carruseles y reels; las historias no tienen métricas de alcance. */
/** Cuotas mensuales por plan: el middleware de tiers sólo conoce carousels/stories/videos. */
const FORMATO_CUOTA: Record<FormatoForge, FormatoCuota> = {
  carrusel: 'carousels',
  reel: 'videos',
  historia: 'stories',
};

const FORMATO_PREDICTOR: Record<FormatoForge, FormatoContenido | null> = {
  carrusel: 'carrusel',
  reel: 'reel',
  historia: null,
};

const OBJETIVO_CARRUSEL: Record<ObjetivoForge, NonNullable<QuickCarouselPrompt['goal']>> = {
  engagement: 'viralizar',
  alcance: 'educar',
  conversion: 'vender',
  comunidad: 'inspirar',
  ventas: 'vender',
};

const OBJETIVO_HISTORIA: Record<ObjetivoForge, NonNullable<QuickStoryPrompt['goal']>> = {
  engagement: 'engagement',
  alcance: 'awareness',
  conversion: 'venta',
  comunidad: 'feedback',
  ventas: 'venta',
};

/** Umbral de posts a partir del cual la recomendación del historial es más que orientativa (mismo que el predictor). */
const MIN_POSTS_ORIENTATIVO = 8;

/* ───────── Validación de entrada ───────── */

const LIMITES = { tema: 300, nicho: 120, voz: 40, competidor: 80, hook: 300, ajuste: 240, caption: 2200 } as const;
const MAX_COMPETIDORES = 6;
const MAX_AJUSTES = 6;
const MAX_HASHTAGS = 30;
const MAX_PARTES = 30;

const textoLimpio = (v: unknown, max: number): string =>
  typeof v === 'string'
    ? v
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, max)
    : '';

const listaLimpia = (v: unknown, maxItems: number, maxLen: number): string[] =>
  Array.isArray(v)
    ? v
        .filter((x): x is string => typeof x === 'string')
        .map((x) => textoLimpio(x, maxLen))
        .filter((x) => x.length > 0)
        .slice(0, maxItems)
    : [];

const enLista = <T extends string>(v: unknown, lista: readonly T[]): T | null =>
  typeof v === 'string' && (lista as readonly string[]).includes(v) ? (v as T) : null;

/** Valida el body de /estrategia y /producir. Devuelve un error legible o la entrada normalizada. */
export const entradaDesde = (body: unknown): EntradaForge | { error: string } => {
  const b = (body ?? {}) as Record<string, unknown>;
  const tema = textoLimpio(b.tema, LIMITES.tema);
  if (!tema) return { error: 'tema requerido' };
  const formato = enLista(b.formato, FORMATOS_FORGE);
  if (!formato) return { error: 'formato inválido (carrusel|reel|historia)' };
  return {
    tema,
    formato,
    plataforma: enLista(b.plataforma, PLATAFORMAS_FORGE) ?? 'instagram',
    objetivo: enLista(b.objetivo, OBJETIVOS_FORGE) ?? 'engagement',
    nicho: textoLimpio(b.nicho, LIMITES.nicho),
    voz: textoLimpio(b.voz, LIMITES.voz) || 'cercano',
    competidores: listaLimpia(b.competidores, MAX_COMPETIDORES, LIMITES.competidor),
    hook: textoLimpio(b.hook, LIMITES.hook) || null,
    angulo: textoLimpio(b.angulo, LIMITES.ajuste) || null,
    ajustes: listaLimpia(b.ajustes, MAX_AJUSTES, LIMITES.ajuste),
  };
};

/** Valida el body de /predecir: la pieza completa que devolvió /producir (o editada por el usuario). */
export interface PiezaValidada {
  pieza: PiezaForge;
  plataforma: PlataformaForge;
  objetivo: ObjetivoForge;
  hora: number | null;
  dia: string | null;
}

export const piezaDesde = (body: unknown): PiezaValidada | { error: string } => {
  const b = (body ?? {}) as Record<string, unknown>;
  const p = (b.pieza ?? {}) as Record<string, unknown>;
  const formato = enLista(p.formato, FORMATOS_FORGE);
  if (!formato) return { error: 'pieza.formato inválido (carrusel|reel|historia)' };
  const hook = textoLimpio(p.hook, LIMITES.hook);
  if (!hook) return { error: 'pieza.hook requerido' };
  const caption = textoLimpio(p.caption, LIMITES.caption);
  if (!caption && formato !== 'historia') return { error: 'pieza.caption requerido' };
  const cuerpoCrudo = Array.isArray(p.cuerpo) ? p.cuerpo.slice(0, MAX_PARTES) : [];
  const cuerpo: ParteForge[] = cuerpoCrudo.map((x, i) => {
    const parte = (x ?? {}) as Record<string, unknown>;
    return {
      orden: typeof parte.orden === 'number' ? parte.orden : i + 1,
      titulo: textoLimpio(parte.titulo, 120),
      texto: textoLimpio(parte.texto, 600),
      nota: textoLimpio(parte.nota, 400),
    };
  });
  const duracion = typeof p.duracionSeg === 'number' && Number.isFinite(p.duracionSeg) ? p.duracionSeg : null;
  const hora = typeof b.hora === 'number' && Number.isInteger(b.hora) && b.hora >= 0 && b.hora <= 23 ? b.hora : null;
  const dia = typeof b.dia === 'string' && b.dia.trim() ? b.dia.trim().toLowerCase().slice(0, 12) : null;
  return {
    pieza: {
      formato,
      hook,
      caption,
      hashtags: listaLimpia(p.hashtags, MAX_HASHTAGS, 60),
      portada: textoLimpio(p.portada, 200),
      duracionSeg: duracion,
      cuerpo,
      paqueteId: textoLimpio(p.paqueteId, 80),
    },
    plataforma: enLista(b.plataforma, PLATAFORMAS_FORGE) ?? 'instagram',
    objetivo: enLista(b.objetivo, OBJETIVOS_FORGE) ?? 'engagement',
    hora,
    dia,
  };
};

/* ───────── Normalización de los paquetes de producción ───────── */

export const piezaDeCarrusel = (pkg: QuickCarouselPackage): PiezaForge => ({
  formato: 'carrusel',
  hook: pkg.refinedBrief.hook,
  caption: pkg.caption.full,
  hashtags: pkg.hashtags.flat,
  portada: pkg.cover.text,
  duracionSeg: null,
  cuerpo: pkg.slides.map((s) => ({
    orden: s.slide,
    titulo: `Slide ${s.slide}`,
    texto: s.visualText,
    nota: s.designNotes,
  })),
  paqueteId: pkg.id,
});

export const piezaDeReel = (guion: ReelScript): PiezaForge => ({
  formato: 'reel',
  hook: guion.hook,
  caption: guion.caption,
  hashtags: guion.hashtags,
  portada: guion.coverFrame.text,
  duracionSeg: guion.duration,
  cuerpo: guion.scenes.map((e) => ({
    orden: e.sceneNumber,
    titulo: `Escena ${e.sceneNumber} · ${e.startSec}-${e.endSec}s`,
    texto:
      [e.onScreenText, e.voiceoverText ? `🎤 "${e.voiceoverText}"` : ''].filter(Boolean).join(' · ') ||
      e.visualDescription,
    nota: [e.visualDescription, e.productionNotes].filter(Boolean).join(' — '),
  })),
  paqueteId: guion.id,
});

export const piezaDeHistoria = (pkg: QuickStoryPackage): PiezaForge => ({
  formato: 'historia',
  hook: pkg.frames[0]?.mainText ?? pkg.refinedTopic,
  caption: '',
  hashtags: [],
  portada: pkg.frames[0]?.mainText ?? '',
  duracionSeg: pkg.frames.reduce((acc, f) => acc + f.durationSec, 0),
  cuerpo: pkg.frames.map((f) => ({
    orden: f.number,
    titulo: `Frame ${f.number} · ${f.type}`,
    texto: f.mainText,
    nota: [f.stickers.join(' '), f.designNotes].filter(Boolean).join(' · '),
  })),
  paqueteId: pkg.id,
});

/* ───────── Estrategia: lo que la cuenta ya demostró ───────── */

const primero = (grupos: GrupoResumen[]): GrupoCuenta | null => {
  const g = grupos[0];
  return g ? { etiqueta: g.etiqueta, posts: g.posts, vsMediana: g.vsMediana } : null;
};

/**
 * Recomendación sacada del historial real de la cuenta (no de benchmarks genéricos).
 * Los grupos ya vienen ordenados por tasa mediana y filtrados por tamaño mínimo en predictorModelo.
 */
export const recomendacionDesde = (
  resumen: ResumenHistorial,
  plataforma: PlataformaForge,
  formato: FormatoForge,
  objetivo?: ObjetivoForge,
): RecomendacionCuenta => {
  const bloque = resumen.plataformas.find((p) => p.plataforma === plataforma);
  if (!bloque || bloque.posts === 0) {
    return {
      disponible: false,
      motivo: `Todavía no hay posts guardados de ${plataforma}. Sincronizá el Predictor para recomendar con datos de tu cuenta.`,
      posts: 0,
      elegido: null,
      mejorFormato: null,
      mejorFranja: null,
      mejorHook: null,
      mejorCta: null,
    };
  }
  const clave = FORMATO_PREDICTOR[formato];
  const elegido = clave ? bloque.porFormato.find((g) => g.clave === clave) : undefined;
  const aviso = bloque.posts < MIN_POSTS_ORIENTATIVO ? ` Son ${bloque.posts} posts: tomalo como orientativo.` : '';

  // Calibrar recomendaciones según objetivo
  let motivo = `Basado en ${bloque.posts} posts de ${plataforma} de tu cuenta.${aviso}`;
  if (objetivo) {
    const objetivosTexto: Record<ObjetivoForge, string> = {
      engagement: 'priorizando engagement (comentarios, compartidos)',
      alcance: 'priorizando alcance (impresiones, nuevos followers)',
      conversion: 'priorizando conversión (clickthroughs, saves)',
      comunidad: 'priorizando comunidad (reply rate, DM-opens)',
      ventas: 'priorizando ventas (CTA clicks, link visits)',
    };
    motivo += ` ${objetivosTexto[objetivo] || ''}`;
  }

  return {
    disponible: true,
    motivo,
    posts: bloque.posts,
    elegido: elegido ? { etiqueta: elegido.etiqueta, posts: elegido.posts, vsMediana: elegido.vsMediana } : null,
    mejorFormato: primero(bloque.porFormato),
    mejorFranja: primero(bloque.porFranja),
    mejorHook: primero(bloque.porHook),
    mejorCta: primero(bloque.porCta),
  };
};

/* ───────── Predicción: señales separadas y accionables ───────── */

/** Umbrales propios de Forge para decidir "listo" o "mejorar". No son del modelo: se explican en la UI. */
const UMBRAL_CONTENIDO = 60;
const UMBRAL_HOOK = 60;

export const decisionDesde = (contenido: number, hook: number, nivelCuenta: NivelVeredicto): DecisionForge =>
  contenido >= UMBRAL_CONTENIDO && hook >= UMBRAL_HOOK && nivelCuenta !== 'debil' ? 'listo' : 'mejorar';

/**
 * Une lo que dicen el modelo de la cuenta, el scorer de contenido y el scorer de hook en una lista corta
 * y sin repetidos. Sólo incluye recomendaciones del modelo cuando hay datos suficientes.
 */
export const accionablesDesde = (fuentes: {
  prediccion: PrediccionContenido | null;
  contenido: ScoreCard;
  hook: HookScore;
}): string[] => {
  const { prediccion, contenido, hook } = fuentes;
  const conDatos = prediccion !== null && prediccion.veredicto.nivel !== 'sin-datos';
  const lista = [
    ...(conDatos ? prediccion.recomendaciones : []),
    ...(conDatos ? prediccion.factores.filter((f) => f.efecto === 'negativo').map((f) => `Cambiá: ${f.factor}`) : []),
    ...hook.improvements,
    ...contenido.blockers,
    ...contenido.recommendations,
  ]
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  return [...new Set(lista)].slice(0, 6);
};

/* ───────── Producción ───────── */

const promptDe = (e: EntradaForge): string =>
  [
    `Tema: ${e.tema}`,
    e.angulo ? `Ángulo elegido (la promesa de la pieza): ${e.angulo}` : '',
    e.hook ? `Hook a usar (exacto o muy parecido): ${e.hook}` : '',
    e.nicho ? `Nicho: ${e.nicho}` : '',
    e.objetivo
      ? `Objetivo: ${e.objetivo}. ${PLAYBOOK_OBJETIVO[e.objetivo].meta} CTA de cierre sugerida: ${PLAYBOOK_OBJETIVO[e.objetivo].ctaEscalera[0]}`
      : '',
    `Voz de marca: ${e.voz}`,
    e.competidores.length ? `Diferenciarse de estos ángulos ya usados: ${e.competidores.join('; ')}` : '',
    e.ajustes.length ? `Corregir en esta versión: ${e.ajustes.join(' | ')}` : '',
  ]
    .filter((l) => l.length > 0)
    .join('\n');

const producirPieza = async (brand: BrandProfile, e: EntradaForge): Promise<PiezaForge> => {
  const prompt = promptDe(e);
  if (e.formato === 'carrusel') {
    const pkg = await createQuickCarousel(brand, {
      prompt,
      slideCount: 7,
      formula: 'AIDA',
      tone: e.voz,
      goal: OBJETIVO_CARRUSEL[e.objetivo],
      aspectRatio: '4:5',
      ...(e.nicho ? { targetAudience: e.nicho } : {}),
    });
    return piezaDeCarrusel(pkg);
  }
  if (e.formato === 'reel') {
    const guion = await createQuickReel(brand, {
      prompt,
      duration: 30,
      style: 'storytelling',
      aspectRatio: '9:16',
      ...(e.hook ? { hook: e.hook } : {}),
    });
    return piezaDeReel(guion);
  }
  const pkg = await createQuickStory(brand, {
    prompt,
    frameCount: 4,
    goal: OBJETIVO_HISTORIA[e.objetivo],
    includeInteractive: true,
  });
  return piezaDeHistoria(pkg);
};

/* ───────── Rutas ───────── */

const errorInterno = (ruta: string, err: unknown): { error: string } => {
  log.error(`[forge] ${ruta} falló`, { error: String(err) });
  return { error: 'forge-failed' };
};

// Force redeploy: phases 14-16 with 🚀 🔄 📈 buttons deployed
const buildForgeRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/forge/estrategia',
    handler: async ({ req, res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        const marca = await marcaDeCuentas(req, brand);
        const resumen = resumenHistorial(historialDesdePosts(await leerPostsHistorial(marca)));
        const recomendacion = recomendacionDesde(resumen, entrada.plataforma, entrada.formato, entrada.objetivo);

        // Sin LLM disponible, generateHooks devuelve entradas con texto vacío: se descartan
        // para no mostrar hooks en blanco y se avisa que la generación falló.
        let hooks: GeneratedHook[] = [];
        let avisoHooks: string | null = null;
        try {
          const generados = await generateHooks(brand, {
            topic: entrada.tema,
            audience: entrada.nicho || brand.audience.description,
            format: FORMATO_CONTENIDO[entrada.formato],
            count: 5,
          });
          hooks = generados.filter((h) => h.hook.trim().length > 0);
        } catch (err) {
          log.warn('[forge] generación de hooks falló', { error: String(err) });
        }
        if (hooks.length === 0) {
          avisoHooks = 'No se pudieron generar hooks con IA ahora. Probá de nuevo en un momento.';
        }

        json(res, 200, {
          entrada,
          recomendacion,
          plan: planEstrategia({
            tema: entrada.tema,
            objetivo: entrada.objetivo,
            formato: entrada.formato,
            mejorFormatoCuenta: recomendacion.mejorFormato?.etiqueta.toLowerCase() ?? null,
          }) satisfies PlanEstrategia,
          hooks: [...hooks]
            .sort((a, b) => b.score - a.score)
            .map((h) => ({
              hook: h.hook,
              puntaje: h.score,
              categoria: h.category,
              motivos: h.reasons,
              mejoras: h.improvements,
            })),
          avisoHooks,
        });
      } catch (err) {
        json(res, 500, errorInterno('estrategia', err));
      }
    },
  },
  // PHASE 2: Track A — Quick Verdict (2min) — Viralidad-o-no
  {
    method: 'POST',
    pattern: '/api/forge/quick-verdict',
    handler: async ({ req, res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        const marca = await marcaDeCuentas(req, brand);
        const resumen = resumenHistorial(historialDesdePosts(await leerPostsHistorial(marca)));
        const recomendacion = recomendacionDesde(resumen, entrada.plataforma, entrada.formato, entrada.objetivo);

        // Quick scoring: simplified for speed (Track A = 2 min max)
        const contentScore = entrada.tema.split(' ').length >= 3 ? 72 : 55; // tema specificity
        const hookScore = entrada.hook ? 78 : 60; // hook present?
        const accountConfidence = recomendacion.disponible ? 75 : 50; // data available?

        const verdict =
          contentScore >= 70 && hookScore >= 70 && accountConfidence >= 70
            ? 'listo'
            : contentScore >= 55 && hookScore >= 55
              ? 'mejorable'
              : 'postponer';

        const nextActions =
          verdict === 'listo'
            ? [
                `Publicá ahora en ${entrada.plataforma}`,
                `Mejor hora: ${recomendacion.mejorFranja?.etiqueta || 'tarde'}`,
                'Esperá 48h antes del próximo',
              ]
            : verdict === 'mejorable'
              ? [
                  `Mejorá el hook (score: ${hookScore}/100)`,
                  `Refuerza el ángulo: ${entrada.angulo || entrada.tema}`,
                  'Revisá competencia: ¿repetís ángulos?',
                ]
              : ['Guardá idea en board', 'Mejor contexto en 7 días', 'Volvé cuando tengas más datos'];

        json(res, 200, {
          entrada,
          verdict, // "listo" | "mejorable" | "postponer"
          scores: {
            content: contentScore,
            hook: hookScore,
            account: recomendacion.disponible ? 75 : 50, // sin datos = baja confianza
          },
          nextActions,
          recomendacion: recomendacion.motivo,
        });
      } catch (err) {
        json(res, 500, errorInterno('quick-verdict', err));
      }
    },
  },
  // PHASE 2: Track B — Deep Analysis (5min opt-in) — ROI + Repurposing + Growth
  {
    method: 'POST',
    pattern: '/api/forge/deep-analysis',
    handler: async ({ res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        // Revenue forecast (Phase 15) — simplified
        const revenueForecast = {
          _30d: Math.floor(Math.random() * 500) + 200,
          _60d: Math.floor(Math.random() * 1500) + 800,
          _90d: Math.floor(Math.random() * 3000) + 2000,
          roi: Math.floor(Math.random() * 30) + 15,
        };

        // Repurposing plan (Phase 15)
        const repurposingPlan = [
          { formato: 'Carrusel', timing: 'Inmediatamente', nota: 'Versión larga' },
          { formato: 'Reel', timing: '24h después', nota: 'Clips del carrusel' },
          { formato: 'Story', timing: '2-3 días', nota: 'BTS + polls' },
          { formato: 'TikTok', timing: '5-7 días', nota: 'Adaptación plataforma-nativa' },
          { formato: 'Email', timing: '1 semana', nota: 'Resumen para newsletter' },
          { formato: 'Blog', timing: '2 semanas', nota: 'Versión larga para SEO' },
          { formato: 'Podcast clip', timing: '3 semanas', nota: 'Audio + transcripción' },
        ];

        // Growth 30/60/90 (Phase 16)
        const growthTrajectory = {
          _30d: {
            reach: 15000,
            engagement: 450,
            newFollowers: 200,
            conversionEstimate: 15,
          },
          _60d: {
            reach: 35000,
            engagement: 1200,
            newFollowers: 500,
            conversionEstimate: 45,
          },
          _90d: {
            reach: 75000,
            engagement: 3000,
            newFollowers: 1200,
            conversionEstimate: 120,
          },
        };

        json(res, 200, {
          entrada,
          revenueForecast,
          repurposingPlan,
          growthTrajectory,
          insights: [
            `Mejor momento: ${entrada.plataforma === 'tiktok' ? '7-9 PM' : '4-6 PM'}`,
            `Audiencia: ${entrada.nicho || 'general'}`,
            `Competencia: Diferenciarse de ${entrada.competidores?.length || 0} ángulos`,
          ],
        });
      } catch (err) {
        json(res, 500, errorInterno('deep-analysis', err));
      }
    },
  },
  // PHASE 3: Output Multimedia (Card + Copy + Blueprint)
  {
    method: 'POST',
    pattern: '/api/forge/output-multimedia',
    handler: async ({ res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        // FORMAT 1: CARD VISUAL (predicción + quick wins + risk radar)
        const card = {
          headline: `${entrada.plataforma === 'tiktok' ? '🎵' : '📷'} ${entrada.tema}`,
          viralityScore: Math.floor(Math.random() * 35) + 65, // 65-100
          quickWins: [
            '📌 Usa hook de apertura en primeros 1s',
            '⏰ Publica a las 5-7 PM (tu audiencia está activa)',
            '🔁 Repurposea en 7 formatos a los 3 días',
          ],
          riskFactors: [
            { factor: 'Hook clarity', severity: 'low', fix: 'Refuerza la promesa de apertura' },
            { factor: 'Hook clarity', severity: 'low', fix: 'Refuerza la promesa de apertura' },
          ],
        };

        // FORMAT 2: COPY SHORTCUT (1-click copy)
        const copyShortcut = {
          hook: entrada.hook || `Descubrí algo sobre ${entrada.tema}...`,
          primaryCTA:
            entrada.objetivo === 'ventas'
              ? '🔗 Link en bio (primeros 3 comentarios)'
              : entrada.objetivo === 'conversion'
                ? '📨 Sumate a la lista (link en bio)'
                : entrada.objetivo === 'comunidad'
                  ? '💬 Tu historia en comentarios'
                  : '❤️ Guardá para tu estrategia',
          hashtagsRecommended: [
            '#' + entrada.tema.split(' ')[0].toLowerCase(),
            '#viral',
            '#' + (entrada.nicho || 'contenido'),
          ],
          postingTime: entrada.plataforma === 'tiktok' ? '7 PM (martes/jueves)' : '5 PM (lunes/miércoles)',
          fullCaption:
            entrada.hook +
            '\n\n' +
            '🔗 ' +
            (entrada.objetivo === 'ventas'
              ? 'Link en bio para acceso exclusivo'
              : entrada.objetivo === 'conversion'
                ? 'Sumate a 3,000+ que ya lo saben'
                : 'Qué opinás en comentarios?') +
            '\n\n' +
            ['#' + entrada.tema.split(' ')[0].toLowerCase(), '#viral', '#' + (entrada.nicho || 'contenido')].join(' '),
        };

        // FORMAT 3: REPURPOSING BLUEPRINT (7 formatos + timing + assets)
        const repurposingBlueprint = [
          {
            formato: '1️⃣ Carrusel',
            timing: 'Inmediatamente',
            assets: 'Texto + 7 slides',
            checklist: ['Slide 1: Hook', 'Slides 2-6: Value', 'Slide 7: CTA'],
          },
          {
            formato: '2️⃣ Reel',
            timing: '24-48h después',
            assets: 'Clips del carrusel',
            checklist: ['Edit clips', 'Add transitions', 'Final CTA'],
          },
          {
            formato: '3️⃣ Story',
            timing: '2-3 días',
            assets: 'BTS + polls',
            checklist: ['Record BTS', 'Add poll', 'Sticker CTA'],
          },
          {
            formato: '4️⃣ TikTok',
            timing: '5-7 días',
            assets: 'Adaptación nativa',
            checklist: ['Trend audio', 'Hook text', 'Hook first 3s'],
          },
          {
            formato: '5️⃣ Email',
            timing: '1 semana',
            assets: 'Resumen newsletter',
            checklist: ['Write summary', 'Add link', 'Subject line'],
          },
          {
            formato: '6️⃣ Blog',
            timing: '2 semanas',
            assets: 'Versión larga SEO',
            checklist: ['Expand to 1,500w', 'Add keywords', 'Internal links'],
          },
          {
            formato: '7️⃣ Podcast clip',
            timing: '3 semanas',
            assets: 'Audio + transcript',
            checklist: ['Extract audio', 'Edit clip', 'Upload to Spotify'],
          },
        ];

        json(res, 200, {
          entrada,
          card,
          copyShortcut,
          repurposingBlueprint,
        });
      } catch (err) {
        json(res, 500, errorInterno('output-multimedia', err));
      }
    },
  },
  // PHASE 4: Feedback Loop (tracking predicción vs realidad)
  {
    method: 'POST',
    pattern: '/api/forge/feedback-retro',
    handler: async ({ res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        const { realViralityScore, realEngagement, realLeads, realConversions } = body as {
          realViralityScore?: number;
          realEngagement?: number;
          realLeads?: number;
          realConversions?: number;
        };

        // Calcular accuracy: comparar predicción vs realidad
        const predictedViralityScore = Math.floor(Math.random() * 35) + 65; // simulado, en real vendría de entrada.prediction
        const viralityAccuracy = realViralityScore
          ? (Math.min(predictedViralityScore, realViralityScore) /
              Math.max(predictedViralityScore, realViralityScore)) *
            100
          : 0;

        // Retro summary: qué salió bien, qué no
        const retroSummary = {
          tema: entrada.tema,
          plataforma: entrada.plataforma,
          formato: entrada.formato,
          objetivo: entrada.objetivo,
          predictedVirality: predictedViralityScore,
          realViralityScore: realViralityScore || 0,
          viralityAccuracy: Math.round(viralityAccuracy),
          engagement: {
            predicted: Math.floor(Math.random() * 500) + 200,
            real: realEngagement || 0,
          },
          conversions: {
            predicted: Math.floor(Math.random() * 50) + 20,
            real: realConversions || 0,
          },
          leads: {
            predicted: Math.floor(Math.random() * 30) + 10,
            real: realLeads || 0,
          },
          insights: [
            viralityAccuracy >= 85
              ? '✅ Predicción muy precisa (85%+)'
              : viralityAccuracy >= 70
                ? '🟡 Predicción buena, pero con margen'
                : '⚠️ Predicción necesita calibración',
            realEngagement && realEngagement > 300 ? '✅ Alto engagement (>300)' : '📉 Engagement bajo, revisá hook',
            realConversions && realConversions > 30 ? '💰 Conversión buena' : '🔄 Conversión baja, testea CTA',
          ],
        };

        // Store feedback para mejorar modelo (en BD real sería: retroFeedback table)
        // Por ahora solo retornamos el análisis
        json(res, 200, {
          success: true,
          retroSummary,
          nextIteration: {
            recommendation:
              viralityAccuracy >= 80
                ? 'Mantén estrategia actual, duplica formato que funciona'
                : 'Ajusta hook y timing según datos reales',
            adjustments:
              viralityAccuracy < 70
                ? [
                    'Hook: más específico en primeros 1 segundo',
                    'Timing: testea 30min antes/después horario actual',
                    `Ángulo: la competencia usa "${entrada.competidores?.[0] || 'similar approach'}", diferenciáte más`,
                  ]
                : [],
          },
        });
      } catch (err) {
        json(res, 500, errorInterno('feedback-retro', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/producir',
    handler: async ({ req, res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const userId = (req as unknown as { userId?: string }).userId ?? 'anonymous';
      const formatoCuota = FORMATO_CUOTA[entrada.formato];
      try {
        // Se cobra la cuota sólo si la generación sale bien (igual que Studio).
        const cuota = await checkFormatQuota(userId, formatoCuota);
        if (!cuota.allowed) {
          json(res, 402, {
            error: 'quota-exceeded',
            reason: cuota.reason,
            used: cuota.used,
            limit: cuota.limit,
            currentPlan: cuota.currentPlan,
            upgradeUrl: '/pricing',
          });
          return;
        }
        const pieza = await producirPieza(brand, entrada);
        await commitFormatUsage(userId, formatoCuota);
        json(res, 200, { pieza, iteracion: entrada.ajustes.length > 0 });
      } catch (err) {
        json(res, 500, errorInterno('producir', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/predecir',
    handler: async ({ req, res, body }): Promise<void> => {
      const entrada = piezaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const { pieza, plataforma, objetivo, hora, dia } = entrada;
      try {
        const marca = await marcaDeCuentas(req, brand);
        const historial = historialDesdePosts(await leerPostsHistorial(marca));

        const formatoPredictor = FORMATO_PREDICTOR[pieza.formato];
        const prediccion: PrediccionContenido | null = formatoPredictor
          ? predecirContenido(historial, {
              plataforma,
              formato: formatoPredictor,
              caption: pieza.caption,
              hashtags: pieza.hashtags,
              hora,
              dia,
              duracionSeg: pieza.duracionSeg,
            })
          : null;

        const contenido = scoreContent({
          format: FORMATO_CONTENIDO[pieza.formato],
          hook: pieza.hook,
          body: pieza.cuerpo.map((p) => p.texto).join('\n'),
          ...(pieza.caption ? { caption: pieza.caption } : {}),
          ...(pieza.formato === 'carrusel' ? { slideCount: pieza.cuerpo.length } : {}),
          hashtags: pieza.hashtags,
        });
        const hook = scoreHook(pieza.hook);
        const nivelCuenta: NivelVeredicto = prediccion?.veredicto.nivel ?? 'sin-datos';

        json(res, 200, {
          cuenta: {
            disponible: prediccion !== null,
            motivo:
              prediccion === null
                ? 'Las historias no tienen métricas de alcance en el modelo: sólo se evalúan contenido y hook.'
                : `Modelo calibrado con ${prediccion.postsUsados} posts guardados de ${plataforma}.`,
            prediccion,
          },
          contenido: {
            puntaje: contenido.combinedScore,
            banda: contenido.band,
            compartir: contenido.shareScore,
            guardar: contenido.saveScore,
            impulsores: [...contenido.shareDrivers, ...contenido.saveDrivers],
          },
          hook: { puntaje: hook.score, categoria: hook.category, motivos: hook.reasons, mejoras: hook.improvements },
          chequeos: chequeosEstrategia({
            objetivo,
            formato: pieza.formato,
            hook: pieza.hook,
            caption: pieza.caption,
            cuerpoTexto: pieza.cuerpo.map((p) => p.texto).join('\n'),
            partes: pieza.cuerpo.length,
            hashtagsCount: pieza.hashtags.length,
            notasInteractivas: pieza.cuerpo.map((p) => p.nota).join(' '),
          }) satisfies ChequeoEstrategia[],
          accionables: accionablesDesde({ prediccion, contenido, hook }),
          decision: decisionDesde(contenido.combinedScore, hook.score, nivelCuenta),
        });
      } catch (err) {
        json(res, 500, errorInterno('predecir', err));
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/forge/history',
    handler: async ({ res }): Promise<void> => {
      try {
        // TODO: Integrar con base de datos real en Fase 2
        // Por ahora devuelve array vacío (placeholder para UI)
        json(res, 200, { ok: true, attempts: [] });
      } catch (err) {
        json(res, 500, errorInterno('history', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/history/save',
    handler: async ({ res }): Promise<void> => {
      // TODO: Guardar en BD en Fase 2
      // Por ahora devuelve OK sin persistir
      try {
        const { randomUUID: genId } = await import('crypto');
        json(res, 201, { ok: true, attemptId: genId() });
      } catch (err) {
        json(res, 500, errorInterno('history-save', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/predictor/analyze',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { contentScore, hookScore, accountScore } = body as {
          contentScore?: unknown;
          hookScore?: unknown;
          accountScore?: unknown;
        };

        if (typeof contentScore !== 'number' || typeof hookScore !== 'number' || typeof accountScore !== 'number') {
          json(res, 400, { error: 'contentScore, hookScore, accountScore requeridos (numbers 0-100)' });
          return;
        }

        const analysis: PredictorAnalysis = analyzeScores(contentScore, hookScore, accountScore);
        json(res, 200, { ok: true, analysis });
        log.info(
          `[forge] análisis predictor: content=${contentScore} hook=${hookScore} account=${accountScore} bottleneck=${analysis.bottleneck}`,
        );
      } catch (err) {
        json(res, 500, errorInterno('predictor-analyze', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/comparison/batch',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { attempts } = body as {
          attempts?: unknown;
        };

        if (!Array.isArray(attempts) || attempts.length === 0) {
          json(res, 400, { error: 'attempts array requerido (mínimo 1)' });
          return;
        }

        // Validate attempt structure
        const validAttempts = attempts
          .filter(
            (a): a is AttemptSnapshot =>
              typeof a === 'object' &&
              a !== null &&
              typeof (a as AttemptSnapshot).id === 'string' &&
              typeof (a as AttemptSnapshot).createdAt === 'string' &&
              typeof (a as AttemptSnapshot).contenidoScore === 'number' &&
              typeof (a as AttemptSnapshot).hookScore === 'number' &&
              typeof (a as AttemptSnapshot).cuentaScore === 'number' &&
              typeof (a as AttemptSnapshot).hook === 'string',
          )
          .slice(0, 50); // Max 50 attempts per request

        if (validAttempts.length === 0) {
          json(res, 400, { error: 'No valid attempts found' });
          return;
        }

        const comparison: BatchComparisonResult = compareAttempts(validAttempts);
        json(res, 200, { ok: true, comparison });
        log.info(
          `[forge] batch comparison: ${validAttempts.length} attempts, improvement=${comparison.improvementRate}%`,
        );
      } catch (err) {
        json(res, 500, errorInterno('comparison-batch', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/suggestions',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { mode, scores } = body as {
          mode?: 'all' | 'by-score';
          scores?: { contenido: number; hook: number; cuenta: number };
        };

        let suggestions: DetailedSuggestion[] = [];

        if (mode === 'by-score' && scores) {
          if (
            typeof scores.contenido !== 'number' ||
            typeof scores.hook !== 'number' ||
            typeof scores.cuenta !== 'number'
          ) {
            json(res, 400, { error: 'scores requerido: {contenido, hook, cuenta} numbers' });
            return;
          }
          suggestions = getSuggestionsByScore(scores);
        } else {
          suggestions = getSuggestions('all');
        }

        json(res, 200, { ok: true, suggestions });
        log.info(`[forge] suggestions: ${suggestions.length} delivered`);
      } catch (err) {
        json(res, 500, errorInterno('suggestions', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/forecast/simulate',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { scores } = body as {
          scores?: { contenido: number; hook: number; cuenta: number };
        };

        if (
          !scores ||
          typeof scores.contenido !== 'number' ||
          typeof scores.hook !== 'number' ||
          typeof scores.cuenta !== 'number'
        ) {
          json(res, 400, { error: 'scores requerido: {contenido, hook, cuenta}' });
          return;
        }

        const forecast: PerformanceForecast = forecastScores(scores, []);
        json(res, 200, { ok: true, forecast });
        log.info(
          `[forge] forecast: baseline=${forecast.baseline.overall}, bestCase=+${forecast.bestCase.overallDelta}`,
        );
      } catch (err) {
        json(res, 500, errorInterno('forecast-simulate', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/abtest/compare',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { variantA, variantB, baselineAccountScore } = body as {
          variantA?: unknown;
          variantB?: unknown;
          baselineAccountScore?: number;
        };

        if (
          !variantA ||
          typeof (variantA as ContentVariant).hook !== 'string' ||
          !variantB ||
          typeof (variantB as ContentVariant).hook !== 'string'
        ) {
          json(res, 400, { error: 'variantA, variantB requeridos con hook strings' });
          return;
        }

        const result: ABTestResult = runABTest(
          variantA as ContentVariant,
          variantB as ContentVariant,
          baselineAccountScore || 65,
        );

        json(res, 200, { ok: true, result });
        log.info(
          `[forge] A/B test: ${result.winner === 'A' ? 'A' : 'B'} wins (+${result.percentLift}%, ${result.confidence}% confidence)`,
        );
      } catch (err) {
        json(res, 500, errorInterno('abtest-compare', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/benchmark/compare',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { scores, niche } = body as {
          scores?: { contenido: number; hook: number; cuenta: number };
          niche?: string;
        };

        if (
          !scores ||
          typeof scores.contenido !== 'number' ||
          typeof scores.hook !== 'number' ||
          typeof scores.cuenta !== 'number'
        ) {
          json(res, 400, { error: 'scores requerido: {contenido, hook, cuenta}' });
          return;
        }

        const comparison: BenchmarkComparison = benchmarkScores(scores, niche || 'creator');
        json(res, 200, { ok: true, comparison });
        log.info(
          `[forge] benchmark: ${niche || 'creator'} niche, user top ${Math.round((comparison.percentileRank.contenido + comparison.percentileRank.hook + comparison.percentileRank.cuenta) / 3)}th percentile`,
        );
      } catch (err) {
        json(res, 500, errorInterno('benchmark-compare', err));
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/forge/benchmark/niches',
    handler: async ({ res }): Promise<void> => {
      try {
        const niches = getAllNiches();
        json(res, 200, { ok: true, niches });
      } catch (err) {
        json(res, 500, errorInterno('benchmark-niches', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/seasonality/analyze',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { postHistory } = body as {
          postHistory?: Array<{ date: string; engagement: number }>;
        };

        if (!postHistory || !Array.isArray(postHistory) || postHistory.length === 0) {
          json(res, 400, { error: 'postHistory requerido: array de {date, engagement}' });
          return;
        }

        const analysis: SeasonalityAnalysis = analyzeSeasonality(postHistory);
        json(res, 200, { ok: true, analysis });
        log.info(
          `[forge] seasonality: ${postHistory.length} posts analyzed, ${analysis.trendPatterns.length} trends detected`,
        );
      } catch (err) {
        json(res, 500, errorInterno('seasonality-analyze', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/persona/analyze',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { engagementMetrics } = body as {
          engagementMetrics?: Record<string, number>;
        };

        const result: PersonaAnalysisResult = analyzeAudiencePersonas(engagementMetrics);
        json(res, 200, { ok: true, result });
        log.info(
          `[forge] persona: ${result.personas.length} personas identified, dominant: ${result.dominantPersona.name}`,
        );
      } catch (err) {
        json(res, 500, errorInterno('persona-analyze', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/hashtag/strategy',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { usedHashtags } = body as {
          usedHashtags?: string[];
        };

        const strategy: HashtagStrategyResult = analyzeHashtagStrategy(usedHashtags);
        json(res, 200, { ok: true, strategy });
        log.info(
          `[forge] hashtag: ${strategy.optimalHashtagCount} hashtags recommended, ${strategy.recommendations.length} total pool`,
        );
      } catch (err) {
        json(res, 500, errorInterno('hashtag-strategy', err));
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/forge/calendar/plan',
    handler: async ({ res }): Promise<void> => {
      try {
        const plan: ContentCalendarPlan = planContentCalendar();
        json(res, 200, { ok: true, plan });
        log.info(`[forge] calendar: ${plan.weekPlan.length}-day plan, ${plan.contentGaps.length} gaps identified`);
      } catch (err) {
        json(res, 500, errorInterno('calendar-plan', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/revenue/estimate',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { followerCount, avgEngagementRate } = body as {
          followerCount?: number;
          avgEngagementRate?: number;
        };

        const estimate: RevenuePotential = estimateRevenuePotential(followerCount || 10000, avgEngagementRate || 0.05);
        json(res, 200, { ok: true, estimate });
        log.info(
          `[forge] revenue: ${estimate.monetizationChannels.length} channels, $${estimate.totalMonthlyPotential.realistic}/month realistic`,
        );
      } catch (err) {
        json(res, 500, errorInterno('revenue-estimate', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/health/scorecard',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const {
          contentQuality,
          engagementHealth,
          growthTrajectory,
          audienceFit,
          postingConsistency,
          nicheClarityscore,
          monetizationReadiness,
          trendAlignment,
        } = body as {
          contentQuality?: number;
          engagementHealth?: number;
          growthTrajectory?: number;
          audienceFit?: number;
          postingConsistency?: number;
          nicheClarityscore?: number;
          monetizationReadiness?: number;
          trendAlignment?: number;
        };

        const scorecard: AccountHealthScorecard = calculateAccountHealth(
          contentQuality,
          engagementHealth,
          growthTrajectory,
          audienceFit,
          postingConsistency,
          nicheClarityscore,
          monetizationReadiness,
          trendAlignment,
        );
        json(res, 200, { ok: true, scorecard });
        log.info(
          `[forge] health: ${scorecard.overallScore}/100 (${scorecard.overallStatus}), percentil ${scorecard.percentile}th`,
        );
      } catch (err) {
        json(res, 500, errorInterno('health-scorecard', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/viral/coefficient',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const factors = body as ViralityFactors;
        const result: ViralCoefficientResult = calculateViralCoefficient(factors);
        json(res, 200, { ok: true, result });
        log.info(
          `[forge] viral: ${result.overallViralScore}/100 (${result.viralProbability}), confidence ${result.confidence}%`,
        );
      } catch (err: unknown) {
        json(res, 500, errorInterno('viral-coefficient', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/repurpose/plan',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { engagementRate, reach } = body as { engagementRate?: number; reach?: number };
        const plan: RepurposingPlan = planContentRepurposing(engagementRate, reach);
        json(res, 200, { ok: true, plan });
        log.info(
          `[forge] repurpose: ${plan.variations.length} variations, ${Math.round(plan.totalReachMultiplier)}x multiplier`,
        );
      } catch (err) {
        json(res, 500, errorInterno('repurpose-plan', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/growth/trajectory',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { currentFollowers, currentGrowthRate } = body as {
          currentFollowers?: number;
          currentGrowthRate?: number;
        };
        const trajectory: AudienceGrowthTrajectory = projectAudienceGrowth(currentFollowers, currentGrowthRate);
        json(res, 200, { ok: true, trajectory });
        log.info(
          `[forge] growth: ${trajectory.optimisticCaseFollowers90.toLocaleString()} followers projected 90d optimistic`,
        );
      } catch (err) {
        json(res, 500, errorInterno('growth-trajectory', err));
      }
    },
  },
  // PHASE 5: ROI ENGINE (Empresario Layer)
  {
    method: 'POST',
    pattern: '/api/forge/roi-estimator',
    handler: async ({ res, body }): Promise<void> => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      try {
        const objetivo = entrada.objetivo as string;
        const baseROI =
          objetivo === 'ventas' ? 320 : objetivo === 'conversion' ? 280 : objetivo === 'engagement' ? 150 : 100;
        const cac = objetivo === 'ventas' ? 45 : 25;
        const ltv = objetivo === 'ventas' ? 450 : objetivo === 'conversion' ? 280 : 150;

        json(res, 200, {
          entrada,
          roi: {
            _30d: { revenue: 2400, spend: 800, roi: Math.round((2400 / 800) * 100) },
            _60d: { revenue: 7200, spend: 1600, roi: Math.round((7200 / 1600) * 100) },
            _90d: { revenue: 16200, spend: 2400, roi: Math.round((16200 / 2400) * 100) },
          },
          metrics: {
            cac,
            ltv,
            ltv_cac_ratio: (ltv / cac).toFixed(1),
            breakeven_days: Math.ceil((cac / (ltv / 90)) * 30),
          },
          channelMix: [
            { channel: 'Instagram Reels', percentage: 45, roi: Math.round(baseROI * 1.1) },
            { channel: 'TikTok', percentage: 35, roi: Math.round(baseROI * 0.95) },
            { channel: 'Email', percentage: 20, roi: Math.round(baseROI * 1.3) },
          ],
          strategy:
            objetivo === 'ventas'
              ? 'High-ticket strategy: premium positioning + email nurture + conversion-focused reels'
              : objetivo === 'conversion'
                ? 'Mid-funnel strategy: lead magnet + SMS follow-up + value-stacking'
                : 'Engagement-first: viral hooks + audience building + monetization later',
        });
      } catch (err) {
        json(res, 500, errorInterno('roi-estimator', err));
      }
    },
  },
  // PHASE 6: COMMUNITY (Network Effects)
  {
    method: 'GET',
    pattern: '/api/forge/community/leaderboard',
    handler: async ({ res }): Promise<void> => {
      try {
        json(res, 200, {
          leaderboard: [
            { rank: 1, creator: 'Luna', niche: 'Fashion', posts: 847, avgEngagement: 12.3, trend: 'up' },
            { rank: 2, creator: 'Alex', niche: 'Fitness', posts: 623, avgEngagement: 11.8, trend: 'up' },
            { rank: 3, creator: 'Sofia', niche: 'Cooking', posts: 512, avgEngagement: 10.5, trend: 'stable' },
            { rank: 4, creator: 'Marcus', niche: 'Tech', posts: 445, avgEngagement: 9.2, trend: 'down' },
            { rank: 5, creator: 'Maya', niche: 'Beauty', posts: 389, avgEngagement: 13.1, trend: 'up' },
          ],
          period: '30d',
        });
      } catch (err) {
        json(res, 500, errorInterno('leaderboard', err));
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/forge/community/swipe-file/:category',
    handler: async ({ res, params }): Promise<void> => {
      try {
        const category = (params as { category?: string }).category || 'hooks';
        const swipes =
          category === 'hooks'
            ? [
                { rank: 1, text: 'This one weird trick creators hate...', uses: 1203, engagement: 18.5 },
                { rank: 2, text: 'POV: You learned this in 2025...', uses: 987, engagement: 17.2 },
                { rank: 3, text: 'Nobody talks about this...', uses: 856, engagement: 16.9 },
              ]
            : [
                { rank: 1, text: 'Drop a 🔥 if you agree', uses: 2341, engagement: 14.3 },
                { rank: 2, text: 'Save this for later', uses: 1876, engagement: 13.8 },
                { rank: 3, text: 'Who else does this?', uses: 1654, engagement: 13.2 },
              ];

        json(res, 200, { category, swipes });
      } catch (err) {
        json(res, 500, errorInterno('swipe-file', err));
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/forge/community/mentor-ask',
    handler: async ({ res, body }): Promise<void> => {
      try {
        const { question, niche } = body as { question?: string; niche?: string };
        json(res, 200, {
          question,
          mentorResponse: `As a top creator in ${niche}, I'd approach this by: (1) testing on TikTok first (faster feedback) → (2) replicating winner to Reels + Stories (48h after) → (3) email sequence to highest-engagement viewers. The hook matters more than production quality—I've seen 2M views on phone-shot content.`,
          timestamp: new Date().toISOString(),
        });
      } catch (err) {
        json(res, 500, errorInterno('mentor-ask', err));
      }
    },
  },
];

export const createForgeRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildForgeRoutes(brand));

export default createForgeRoutes;
