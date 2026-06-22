// @ts-nocheck
/**
 * Trend Sync — Sincronización con tendencias de Instagram en tiempo real
 * Escucha el pulso de la plataforma: audios virales, formats, challenges,
 * filtros trending, hashtags emergentes, y adapta la estrategia de contenido.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';

const TREND_PATH = resolve('data/runtime/brain/trend-sync.json');

export interface TrendSignal {
  id: string;
  topic: string;
  type: 'audio' | 'hashtag' | 'filter' | 'format' | 'challenge' | 'meme' | 'creator' | 'feature';
  platform: string;
  velocity: 'emerging' | 'accelerating' | 'peak' | 'declining';
  signalStrength: number; // 0-1
  firstSeen: string;
  peakExpected: string;
  relatedNiches: string[];
  usageExamples: string[];
  adaptedByBrand: boolean;
  brandAdaptation?: string;
}

interface TrendStore {
  signals: TrendSignal[];
  lastSync: string;
  nicheMomentum: Record<string, number>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): TrendStore => {
  try {
    ensureDir();
    if (!existsSync(TREND_PATH)) return { signals: [], lastSync: new Date().toISOString(), nicheMomentum: {} };
    return JSON.parse(readFileSync(TREND_PATH, 'utf-8')) as TrendStore;
  } catch {
    return { signals: [], lastSync: new Date().toISOString(), nicheMomentum: {} };
  }
};

const saveStore = (store: TrendStore): void => {
  ensureDir();
  writeFileSync(TREND_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Detect and record trend ────────────────────────────────────────────────

export const recordTrend = (
  topic: string,
  type: TrendSignal['type'],
  platform: string,
  relatedNiches: string[],
  strength = 0.5,
): TrendSignal => {
  const store = loadStore();

  const existing = store.signals.find((s) => s.topic.toLowerCase() === topic.toLowerCase() && s.type === type);
  if (existing) {
    existing.signalStrength = Math.min(1, existing.signalStrength + 0.1);
    existing.velocity = updateVelocity(existing);
    saveStore(store);
    return existing;
  }

  const signal: TrendSignal = {
    id: `trend-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    topic,
    type,
    platform,
    velocity: 'emerging',
    signalStrength: strength,
    firstSeen: new Date().toISOString(),
    peakExpected: new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
    relatedNiches,
    usageExamples: [],
    adaptedByBrand: false,
  };

  store.signals.push(signal);

  // Update niche momentum
  for (const niche of relatedNiches) {
    store.nicheMomentum[niche] = (store.nicheMomentum[niche] ?? 0) + strength;
  }

  // Prune old trends
  const cutoff = new Date(Date.now() - 90 * 24 * 3600_000).toISOString();
  store.signals = store.signals.filter((s) => s.firstSeen > cutoff || s.velocity !== 'declining');

  saveStore(store);

  episodic.recordEpisode('trend-detected', `${type}: ${topic} (${platform})`, {
    tags: ['trend', type, ...relatedNiches],
    emotion: 'positive',
  });

  log.info(`[TrendSync] ${type.toUpperCase()}: "${topic}" [${platform}] strength=${strength.toFixed(2)}`);
  return signal;
};

// ── Get actionable trends for niche ────────────────────────────────────────

export const getTrendsForNiche = (niche: string, minStrength = 0.3): TrendSignal[] => {
  const store = loadStore();
  return store.signals
    .filter((s) => s.relatedNiches.includes(niche) && s.signalStrength >= minStrength)
    .sort((a, b) => b.signalStrength - a.signalStrength);
};

// ── Adapt trend for brand ──────────────────────────────────────────────────

export const adaptTrend = async (
  trendId: string,
  brandNiche: string,
  brandVoice: string[],
): Promise<TrendSignal | null> => {
  const store = loadStore();
  const trend = store.signals.find((s) => s.id === trendId);
  if (!trend) return null;

  const adaptations: Record<TrendSignal['type'], string> = {
    audio: `Usar audio "${trend.topic}" en reel educativo sobre ${brandNiche}`,
    hashtag: `Incluir #${trend.topic} en próximo post con ángulo ${brandNiche}`,
    filter: `Aplicar filtro "${trend.topic}" a stories de behind-the-scenes`,
    format: `Crear contenido en formato "${trend.topic}" adaptado a ${brandNiche}`,
    challenge: `Participar en challenge "${trend.topic}" con twist de ${brandNiche}`,
    meme: `Reciclar meme "${trend.topic}" con contexto de ${brandNiche}`,
    creator: `Colaborar o reaccionar a contenido de "${trend.topic}"`,
    feature: `Usar nueva feature "${trend.topic}" para destacar en ${brandNiche}`,
  };

  trend.adaptedByBrand = true;
  trend.brandAdaptation = adaptations[trend.type] ?? `Explorar "${trend.topic}" en contexto ${brandNiche}`;

  saveStore(store);

  await semantic.storeMemory(
    `Tendencia adaptada: ${trend.topic} → ${trend.brandAdaptation}`,
    'learning',
    { trend: trend.topic, niche: brandNiche },
    trend.signalStrength,
  );

  log.info(`[TrendSync] Adapted "${trend.topic}" for ${brandNiche}`);
  return trend;
};

// ── Get content ideas from trends ──────────────────────────────────────────

export const getTrendContentIdeas = (niche: string): { trend: string; idea: string; urgency: string }[] => {
  const trends = getTrendsForNiche(niche, 0.4);
  const ideas: { trend: string; idea: string; urgency: string }[] = [];

  for (const t of trends.slice(0, 5)) {
    const daysToPeak = Math.ceil((new Date(t.peakExpected).getTime() - Date.now()) / (24 * 3600_000));
    const urgency = daysToPeak < 2 ? 'URGENTE' : daysToPeak < 5 ? 'Esta semana' : 'Próximos días';

    ideas.push({
      trend: t.topic,
      idea: t.brandAdaptation ?? `Explorar ${t.type} "${t.topic}" en ${niche}`,
      urgency,
    });
  }

  return ideas;
};

// ── Velocity updater ───────────────────────────────────────────────────────

const updateVelocity = (trend: TrendSignal): TrendSignal['velocity'] => {
  const daysSince = (Date.now() - new Date(trend.firstSeen).getTime()) / (24 * 3600_000);
  if (daysSince < 3) return 'emerging';
  if (daysSince < 7) return 'accelerating';
  if (daysSince < 14) return 'peak';
  return 'declining';
};

// ── Stats ──────────────────────────────────────────────────────────────────

export const getTrendStats = (): {
  total: number;
  byType: Record<string, number>;
  byVelocity: Record<string, number>;
  topNiches: string[];
} => {
  const store = loadStore();
  const byType: Record<string, number> = {};
  const byVelocity: Record<string, number> = {};
  for (const s of store.signals) {
    byType[s.type] = (byType[s.type] ?? 0) + 1;
    byVelocity[s.velocity] = (byVelocity[s.velocity] ?? 0) + 1;
  }

  const topNiches = Object.entries(store.nicheMomentum)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([n]) => n);

  return { total: store.signals.length, byType, byVelocity, topNiches };
};
