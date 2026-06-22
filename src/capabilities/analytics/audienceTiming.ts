/**
 * Motor de timing inteligente para FeedIA.
 * Analiza el historial de performance para determinar cuándo publicar y maximizar engagement.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { getRecentPosts } from './performanceDB.js';
import { ask as routerAsk } from '../../agent/tokenRouter.js';
import { log } from '../../agent/logger.js';
import type { ContentFormat } from '../../config/types.js';

const TIMING_PATH = join(process.cwd(), 'data', 'analytics', 'timing.json');

const DAY_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as const;

interface SlotData {
  totalEngagement: number;
  sampleSize: number;
  avgEngagement: number;
}

interface TimingStore {
  lastUpdated: string;
  totalPostsAnalyzed: number;
  byHour: SlotData[]; // índice 0-23
  byDay: SlotData[]; // índice 0-6 (domingo=0)
  byFormatAndHour: Record<ContentFormat, SlotData[]>;
  recommendedSlots: Array<{ day: number; hour: number; score: number; label: string }>;
}

export interface BestTimeResult {
  bestSlot: { day: number; hour: number; score: number; label: string };
  top5: Array<{ day: number; hour: number; score: number; label: string }>;
  currentMomentScore: number; // 0-100: qué tan bueno es publicar AHORA
  nextOptimalWindow: string;
  basedOnPosts: number;
}

const makeEmptySlots = (n: number): SlotData[] =>
  Array.from({ length: n }, () => ({ totalEngagement: 0, sampleSize: 0, avgEngagement: 0 }));

const ALL_FORMATS: ContentFormat[] = ['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless', 'live'];

const DEFAULT_STORE: TimingStore = {
  lastUpdated: new Date().toISOString(),
  totalPostsAnalyzed: 0,
  byHour: makeEmptySlots(24),
  byDay: makeEmptySlots(7),
  byFormatAndHour: Object.fromEntries(ALL_FORMATS.map((f) => [f, makeEmptySlots(24)])) as Record<
    ContentFormat,
    SlotData[]
  >,
  recommendedSlots: [],
};

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'analytics');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): TimingStore => {
  try {
    ensureDir();
    if (!existsSync(TIMING_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(TIMING_PATH, 'utf8')) as TimingStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: TimingStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(TIMING_PATH, JSON.stringify(store, null, 2), 'utf8');
};

const updateSlot = (slot: SlotData, eng: number): void => {
  slot.totalEngagement += eng;
  slot.sampleSize++;
  slot.avgEngagement = slot.totalEngagement / slot.sampleSize;
};

// Benchmarks de industria como fallback cuando no hay datos propios
const INDUSTRY_DEFAULTS: Array<{ day: number; hour: number; score: number; label: string }> = [
  { day: 2, hour: 9, score: 90, label: 'Martes a las 09:00' },
  { day: 3, hour: 12, score: 87, label: 'Miércoles a las 12:00' },
  { day: 4, hour: 18, score: 85, label: 'Jueves a las 18:00' },
  { day: 2, hour: 18, score: 80, label: 'Martes a las 18:00' },
  { day: 1, hour: 9, score: 75, label: 'Lunes a las 09:00' },
  { day: 5, hour: 17, score: 72, label: 'Viernes a las 17:00' },
  { day: 3, hour: 9, score: 70, label: 'Miércoles a las 09:00' },
  { day: 4, hour: 12, score: 68, label: 'Jueves a las 12:00' },
  { day: 6, hour: 11, score: 60, label: 'Sábado a las 11:00' },
  { day: 0, hour: 19, score: 55, label: 'Domingo a las 19:00' },
];

/**
 * Reconstruye el modelo de timing con todos los posts históricos disponibles.
 * Ejecutar semanalmente para mantenerlo actualizado.
 */
export const rebuildTimingModel = (): void => {
  const posts = getRecentPosts(180); // 6 meses
  if (posts.length < 5) {
    log.info(`[AudienceTiming] Solo ${posts.length} posts — usando benchmarks de industria`);
    return;
  }

  const store = structuredClone(DEFAULT_STORE);

  posts.forEach((post) => {
    const date = new Date(post.publishedAt);
    const hour = date.getHours();
    const day = date.getDay();
    const eng = post.metrics.engagementRate;

    const hourSlot = store.byHour[hour];
    const daySlot = store.byDay[day];
    if (hourSlot) updateSlot(hourSlot, eng);
    if (daySlot) updateSlot(daySlot, eng);

    const fmtSlot = store.byFormatAndHour[post.format]?.[hour];
    if (fmtSlot) updateSlot(fmtSlot, eng);
  });

  store.totalPostsAnalyzed = posts.length;

  // Construir top-10 slots combinando score de día y hora
  const maxHourEng = Math.max(...store.byHour.map((s) => s.avgEngagement), 0.001);
  const maxDayEng = Math.max(...store.byDay.map((s) => s.avgEngagement), 0.001);

  const slots: Array<{ day: number; hour: number; score: number; label: string }> = [];
  for (let d = 0; d < 7; d++) {
    for (let h = 6; h < 23; h++) {
      // solo horas razonables
      const hourN = (store.byHour[h]?.avgEngagement ?? 0) / maxHourEng;
      const dayN = (store.byDay[d]?.avgEngagement ?? 0) / maxDayEng;
      const score = Math.round((hourN * 0.6 + dayN * 0.4) * 100);
      if (score > 20) {
        slots.push({ day: d, hour: h, score, label: `${DAY_NAMES[d]} a las ${h.toString().padStart(2, '0')}:00` });
      }
    }
  }
  store.recommendedSlots = slots.sort((a, b) => b.score - a.score).slice(0, 15);

  saveStore(store);
  log.info(
    `[AudienceTiming] Modelo reconstruido con ${posts.length} posts. Top slot: ${store.recommendedSlots[0]?.label ?? 'N/A'}`,
  );
};

export const getBestPostingTime = (format?: ContentFormat): BestTimeResult => {
  const store = loadStore();
  const now = new Date();
  const slots = store.recommendedSlots.length >= 5 ? store.recommendedSlots : INDUSTRY_DEFAULTS;

  // Score del momento actual
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  let currentMomentScore = 50;
  if (store.recommendedSlots.length >= 5) {
    const matchingSlot = store.recommendedSlots.find((s) => s.day === currentDay && s.hour === currentHour);
    currentMomentScore =
      matchingSlot?.score ?? Math.round((slots.reduce((s, sl) => s + sl.score, 0) / slots.length) * 0.5);
  }

  // Si hay datos por formato, ajustar ranking
  let rankedSlots = [...slots];
  if (format && store.totalPostsAnalyzed >= 10) {
    const fmtSlots = store.byFormatAndHour[format] ?? [];
    const maxFmt = Math.max(...fmtSlots.map((s) => s.avgEngagement), 0.001);
    rankedSlots = rankedSlots
      .map((sl) => {
        const fmtScore = (fmtSlots[sl.hour]?.avgEngagement ?? 0) / maxFmt;
        return { ...sl, score: Math.round(sl.score * 0.6 + fmtScore * 100 * 0.4) };
      })
      .sort((a, b) => b.score - a.score);
  }

  const top5 = rankedSlots.slice(0, 5);
  const best = top5[0] ?? INDUSTRY_DEFAULTS[0]!;

  // Próxima ventana óptima (futuro más cercano entre los top-5)
  const nextWindow =
    top5.find((sl) => {
      const daysUntil = (sl.day - currentDay + 7) % 7 || (now.getHours() < sl.hour ? 0 : 7);
      return daysUntil > 0 || (daysUntil === 0 && now.getHours() < sl.hour);
    }) ?? best;

  return {
    bestSlot: best,
    top5,
    currentMomentScore,
    nextOptimalWindow: nextWindow.label,
    basedOnPosts: store.totalPostsAnalyzed,
  };
};

export const getTimingAdvice = async (format?: ContentFormat): Promise<string> => {
  const result = loadStore();
  const timing = getBestPostingTime(format);
  const posts = getRecentPosts(30, format);

  if (posts.length < 5) {
    return `Datos propios insuficientes (${posts.length} posts). Recomendación basada en benchmarks de industria:\n- Mejor momento: ${timing.bestSlot.label}\n- Top horarios: ${timing.top5.map((s) => s.label).join(', ')}\n- Publicar martes-jueves entre 9-11am o 17-19hs suele dar los mejores resultados.`;
  }

  const context = `Análisis de timing basado en ${result.totalPostsAnalyzed} posts propios:
- Mejor slot: ${timing.bestSlot.label} (score: ${timing.bestSlot.score}/100)
- Top 5 ventanas: ${timing.top5.map((s) => `${s.label} (${s.score})`).join(' | ')}
- Score ahora mismo: ${timing.currentMomentScore}/100
- Próxima ventana óptima: ${timing.nextOptimalWindow}`;

  const prompt = `Sos estratega de Instagram. Con estos datos de timing de una cuenta, dá 3 recomendaciones cortas y accionables:

${context}

Respondé en 3 bullets muy concretos. Máximo 2 líneas por bullet.`;

  const advice = await routerAsk(prompt, { taskType: 'analysis', freeOnly: true });
  return `${context}\n\n${advice.text}`;
};

export const shouldPostNow = (format?: ContentFormat): { recommended: boolean; reason: string } => {
  const timing = getBestPostingTime(format);
  if (timing.currentMomentScore >= 70) {
    return { recommended: true, reason: `Score actual: ${timing.currentMomentScore}/100. Buen momento para publicar.` };
  }
  if (timing.currentMomentScore >= 50) {
    return {
      recommended: false,
      reason: `Score actual: ${timing.currentMomentScore}/100. Esperable pero no óptimo. Próxima ventana ideal: ${timing.nextOptimalWindow}.`,
    };
  }
  return {
    recommended: false,
    reason: `Score actual: ${timing.currentMomentScore}/100. Momento no recomendado. Próxima ventana: ${timing.nextOptimalWindow}.`,
  };
};
