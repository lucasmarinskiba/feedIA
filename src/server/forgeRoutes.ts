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
// Phase 2: DB persistence
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
  return {
    disponible: true,
    motivo: `Basado en ${bloque.posts} posts de ${plataforma} de tu cuenta.${aviso}`,
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
        const recomendacion = recomendacionDesde(resumen, entrada.plataforma, entrada.formato);

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
];

export const createForgeRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildForgeRoutes(brand));

export default createForgeRoutes;
