/**
 * Emotional Resonance Tracker — Aprende qué emociones genera cada post
 * Trackea el impacto emocional y aprende a replicar los que más conectan.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const EMOTION_PATH = resolve('data/runtime/brain/emotional-resonance.json');

export type EmotionType =
  | 'joy'
  | 'surprise'
  | 'anger'
  | 'sadness'
  | 'fear'
  | 'trust'
  | 'anticipation'
  | 'nostalgia'
  | 'hope'
  | 'relatability';

export interface EmotionalRecord {
  contentId: string;
  emotions: { type: EmotionType; intensity: number }[];
  engagement: number;
  comments: number;
  saves: number;
  shares: number;
  niche: string;
  createdAt: string;
}

interface EmotionStore {
  records: EmotionalRecord[];
  emotionPerformance: Record<EmotionType, number[]>;
  topCombinations: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): EmotionStore => {
  try {
    ensureDir();
    if (!existsSync(EMOTION_PATH)) {
      const empty: EmotionStore = {
        records: [],
        emotionPerformance: {} as Record<EmotionType, number[]>,
        topCombinations: [],
      };
      return empty;
    }
    return JSON.parse(readFileSync(EMOTION_PATH, 'utf-8')) as EmotionStore;
  } catch {
    const empty: EmotionStore = {
      records: [],
      emotionPerformance: {} as Record<EmotionType, number[]>,
      topCombinations: [],
    };
    return empty;
  }
};

const saveStore = (store: EmotionStore): void => {
  ensureDir();
  writeFileSync(EMOTION_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ─- Emotion keywords detector ─────────────────────────────────────────────

const EMOTION_KEYWORDS: Record<EmotionType, RegExp[]> = {
  joy: [/\b(alegría|feliz|contento|genial|me encanta|😊|😂|🎉)\b/gi],
  surprise: [/\b(sorpresa|increíble|no puede ser|wow|😲|🤯|plot twist)\b/gi],
  anger: [/\b(enojado|indignado|injusticia|odio|😤|😠)\b/gi],
  sadness: [/\b(triste|nostalgia|echo de menos|😢|😭)\b/gi],
  fear: [/\b(miedo|ansiedad|preocupado|😰|😨)\b/gi],
  trust: [/\b(confianza|seguro|garantía|testimonio|resultado|💪|🙏)\b/gi],
  anticipation: [/\b(espero|pronto|emocionado|ansioso|🔜|⏳)\b/gi],
  nostalgia: [/\b(antes|recuerdo|infancia|tiempo atrás|viejos tiempos)\b/gi],
  hope: [/\b(esperanza|futuro|mejorar|sueño|meta|✨|🌟)\b/gi],
  relatability: [/\b(me pasó|igual|también|identifico|yo también|real|same)\b/gi],
};

export const analyzeEmotions = (text: string): { type: EmotionType; intensity: number }[] => {
  const emotions: { type: EmotionType; intensity: number }[] = [];
  for (const [emotion, patterns] of Object.entries(EMOTION_KEYWORDS)) {
    let matches = 0;
    for (const pattern of patterns) {
      matches += text.toLowerCase().match(pattern)?.length ?? 0;
    }
    if (matches > 0) {
      emotions.push({ type: emotion as EmotionType, intensity: Math.min(1, matches * 0.3) });
    }
  }
  return emotions.sort((a, b) => b.intensity - a.intensity);
};

// ── Record emotional impact ────────────────────────────────────────────────

export const recordEmotionalImpact = (
  contentId: string,
  content: string,
  performance: { engagement: number; comments: number; saves: number; shares: number },
  niche: string,
): EmotionalRecord => {
  const store = loadStore();
  const emotions = analyzeEmotions(content);

  const record: EmotionalRecord = {
    contentId,
    emotions,
    ...performance,
    niche,
    createdAt: new Date().toISOString(),
  };

  store.records.push(record);
  if (store.records.length > 300) store.records = store.records.slice(-300);

  // Update emotion performance
  for (const e of emotions) {
    const arr = store.emotionPerformance[e.type] ?? [];
    arr.push(performance.engagement);
    store.emotionPerformance[e.type] = arr.slice(-50);
  }

  // Track combinations
  if (emotions.length >= 2) {
    const combo = emotions
      .slice(0, 2)
      .map((e) => e.type)
      .join('+');
    if (!store.topCombinations.includes(combo)) store.topCombinations.push(combo);
  }

  saveStore(store);

  semantic.storeMemory(
    `Emociones: ${emotions.map((e) => `${e.type}(${(e.intensity * 100).toFixed(0)}%)`).join(', ')} → engagement ${performance.engagement}`,
    'learning',
    { contentId, emotions: emotions.map((e) => e.type), niche },
    Math.min(1, performance.engagement / 10000),
  );

  log.info(`[EmotionalResonance] ${contentId}: ${emotions.map((e) => e.type).join(', ')}`);
  return record;
};

// ─- Get emotional formula ──────────────────────────────────────────────────

export const getEmotionalFormula = (
  niche: string,
): {
  topEmotions: EmotionType[];
  bestCombinations: string[];
  recommendation: string;
} => {
  const store = loadStore();
  const nicheRecords = store.records.filter((r) => r.niche === niche);

  if (nicheRecords.length === 0) {
    return {
      topEmotions: ['relatability', 'trust', 'hope'],
      bestCombinations: ['relatability+trust'],
      recommendation: 'Probar contenido que genere identificación y confianza',
    };
  }

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / (arr.length || 1);

  const emotionScores = new Map<EmotionType, number[]>();
  for (const r of nicheRecords) {
    for (const e of r.emotions) {
      const arr = emotionScores.get(e.type) ?? [];
      arr.push(r.engagement);
      emotionScores.set(e.type, arr);
    }
  }

  const topEmotions = Array.from(emotionScores.entries())
    .sort((a, b) => avg(b[1]) - avg(a[1]))
    .slice(0, 3)
    .map(([e]) => e);

  return {
    topEmotions,
    bestCombinations: store.topCombinations.slice(-5),
    recommendation: `Enfocar en ${topEmotions[0]} + ${topEmotions[1] ?? 'trust'} para máximo engagement`,
  };
};

export const getStats = (): { records: number; emotionsTracked: number } => {
  const store = loadStore();
  return { records: store.records.length, emotionsTracked: Object.keys(store.emotionPerformance).length };
};
