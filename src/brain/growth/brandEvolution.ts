/**
 * Brand Evolution — La marca aprende y evoluciona automáticamente
 * Trackea cómo la marca cambia con el tiempo, sugiere evoluciones,
 * y detecta cuando un rebrand es necesario.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const EVOLVE_PATH = resolve('data/runtime/brain/brand-evolution.json');

export interface BrandSnapshot {
  timestamp: string;
  niche: string;
  voiceTone: string[];
  contentMix: Record<string, number>;
  topHashtags: string[];
  avgEngagement: number;
  followerGrowth: number;
  audienceSentiment: number; // -1 to 1
}

export interface EvolutionSuggestion {
  type: 'voice_shift' | 'niche_expansion' | 'content_pivot' | 'rebrand_needed' | 'tone_adjustment';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  suggestedChanges: string[];
  risks: string[];
}

interface EvolutionStore {
  snapshots: BrandSnapshot[];
  suggestions: EvolutionSuggestion[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): EvolutionStore => {
  try {
    ensureDir();
    if (!existsSync(EVOLVE_PATH)) return { snapshots: [], suggestions: [] };
    return JSON.parse(readFileSync(EVOLVE_PATH, 'utf-8')) as EvolutionStore;
  } catch {
    return { snapshots: [], suggestions: [] };
  }
};

const saveStore = (store: EvolutionStore): void => {
  ensureDir();
  writeFileSync(EVOLVE_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ─- Record snapshot ────────────────────────────────────────────────────────

export const recordSnapshot = (snapshot: Omit<BrandSnapshot, 'timestamp'>): BrandSnapshot => {
  const store = loadStore();
  const fullSnapshot: BrandSnapshot = { ...snapshot, timestamp: new Date().toISOString() };
  store.snapshots.push(fullSnapshot);
  if (store.snapshots.length > 52) store.snapshots = store.snapshots.slice(-52); // 1 year weekly
  saveStore(store);
  log.info(`[BrandEvolution] Snapshot recorded: engagement=${snapshot.avgEngagement.toFixed(1)}`);
  return fullSnapshot;
};

// ─- Analyze evolution ──────────────────────────────────────────────────────

export const analyzeEvolution = (niche: string): EvolutionSuggestion[] => {
  const store = loadStore();
  const nicheSnaps = store.snapshots.filter((s) => s.niche === niche);

  if (nicheSnaps.length < 3) return [];

  const suggestions: EvolutionSuggestion[] = [];

  // Detect engagement decline
  const recent = nicheSnaps.slice(-3);
  const older = nicheSnaps.slice(-6, -3);
  const recentAvg = recent.reduce((s, snap) => s + snap.avgEngagement, 0) / recent.length;
  const olderAvg = older.length > 0 ? older.reduce((s, snap) => s + snap.avgEngagement, 0) / older.length : recentAvg;

  if (recentAvg < olderAvg * 0.7) {
    suggestions.push({
      type: 'content_pivot',
      urgency: 'high',
      description: `Engagement cayó ${((1 - recentAvg / olderAvg) * 100).toFixed(0)}% en las últimas semanas`,
      suggestedChanges: ['Probar nuevos formatos', 'Revisar trending topics', 'A/B test de hooks'],
      risks: ['Perder audiencia si el cambio es muy brusco'],
    });
  }

  // Detect voice drift
  const voiceNow = recent[recent.length - 1]?.voiceTone ?? [];
  const voiceBefore = older[0]?.voiceTone ?? [];
  const drift = voiceNow.filter((v) => !voiceBefore.includes(v)).length;
  if (drift >= 2) {
    suggestions.push({
      type: 'voice_shift',
      urgency: 'medium',
      description: 'El tono de voz ha cambiado significativamente',
      suggestedChanges: ['Documentar el nuevo tono', 'Asegurar consistencia', 'Validar con la audiencia'],
      risks: ['Confusión en la audiencia'],
    });
  }

  // Detect negative sentiment trend
  const sentimentTrend = recent.map((s) => s.audienceSentiment);
  if (sentimentTrend.every((s) => s < -0.2)) {
    suggestions.push({
      type: 'tone_adjustment',
      urgency: 'critical',
      description: 'Sentimiento negativo sostenido por 3+ semanas',
      suggestedChanges: ['Auditoría de contenido reciente', 'Contenido de valor puro', 'Engagement directo'],
      risks: ['Perder followers activos', 'Daño reputacional'],
    });
  }

  store.suggestions.push(...suggestions);
  saveStore(store);

  return suggestions;
};

// ─- Get evolution report ───────────────────────────────────────────────────

export const getEvolutionReport = (
  niche: string,
): {
  snapshots: number;
  recentTrend: 'growing' | 'stable' | 'declining';
  suggestions: EvolutionSuggestion[];
  age: number; // weeks
} => {
  const store = loadStore();
  const nicheSnaps = store.snapshots.filter((s) => s.niche === niche);

  if (nicheSnaps.length === 0) {
    return { snapshots: 0, recentTrend: 'stable', suggestions: [], age: 0 };
  }

  const firstSnap = nicheSnaps[0];
  const first = new Date(firstSnap ? firstSnap.timestamp : Date.now()).getTime();
  const age = Math.round((Date.now() - first) / (1000 * 60 * 60 * 24 * 7));

  const recent = nicheSnaps.slice(-3);
  const older = nicheSnaps.slice(-6, -3);
  const recentEng = recent.reduce((s, snap) => s + snap.avgEngagement, 0) / recent.length;
  const olderEng = older.length > 0 ? older.reduce((s, snap) => s + snap.avgEngagement, 0) / older.length : recentEng;

  const trend = recentEng > olderEng * 1.1 ? 'growing' : recentEng < olderEng * 0.9 ? 'declining' : 'stable';
  const pendingSuggestions = store.suggestions.filter((s) => !s.type.includes('resolved'));

  return { snapshots: nicheSnaps.length, recentTrend: trend, suggestions: pendingSuggestions, age };
};

export const getStats = (): { snapshots: number; suggestions: number } => {
  const store = loadStore();
  return { snapshots: store.snapshots.length, suggestions: store.suggestions.length };
};
