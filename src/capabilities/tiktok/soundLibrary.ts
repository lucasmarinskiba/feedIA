/**
 * TikTok Sound Library — Catálogo curado de sounds para máximo rendimiento FYP.
 * En producción se conecta a TikTok Commercial Music Library o API de trending sounds.
 */

import { log } from '../../agent/logger.js';

export interface SoundAsset {
  id: string;
  name: string;
  artist: string;
  bpm: number;
  durationSec: number;
  genre: string;
  mood: 'upbeat' | 'chill' | 'dramatic' | 'funny' | 'inspirational' | 'trending';
  dropTimestamp?: number;
  usageCount: number; // proxy de saturación
  license: 'free' | 'licensed' | 'trending';
  suggestedFor: string[];
  url?: string;
}

const CATALOGUE: SoundAsset[] = [
  {
    id: 'tt-snd-upbeat-01',
    name: 'Morning Energy',
    artist: 'Trending Pop',
    bpm: 120,
    durationSec: 15,
    genre: 'pop',
    mood: 'upbeat',
    dropTimestamp: 2.5,
    usageCount: 120000,
    license: 'trending',
    suggestedFor: ['lifestyle', 'productivity', 'fashion'],
  },
  {
    id: 'tt-snd-hype-01',
    name: 'Hype Transition',
    artist: 'Viral Beats',
    bpm: 140,
    durationSec: 12,
    genre: 'electronic',
    mood: 'upbeat',
    dropTimestamp: 1.8,
    usageCount: 450000,
    license: 'trending',
    suggestedFor: ['fashion', 'beauty', 'transitions'],
  },
  {
    id: 'tt-snd-chill-01',
    name: 'Lo-fi Focus',
    artist: 'Study Beats',
    bpm: 85,
    durationSec: 30,
    genre: 'lofi',
    mood: 'chill',
    usageCount: 80000,
    license: 'free',
    suggestedFor: ['education', 'tips', 'storytelling'],
  },
  {
    id: 'tt-snd-dramatic-01',
    name: 'Plot Twist',
    artist: 'Cinematic',
    bpm: 70,
    durationSec: 20,
    genre: 'cinematic',
    mood: 'dramatic',
    dropTimestamp: 5.0,
    usageCount: 60000,
    license: 'free',
    suggestedFor: ['storytelling', 'motivation', 'case-study'],
  },
  {
    id: 'tt-snd-funny-01',
    name: 'Comedy Sting',
    artist: 'Sound Effects',
    bpm: 90,
    durationSec: 10,
    genre: 'comedy',
    mood: 'funny',
    usageCount: 200000,
    license: 'trending',
    suggestedFor: ['comedy', 'reaction', 'meme'],
  },
  {
    id: 'tt-snd-inspirational-01',
    name: 'Rise Up',
    artist: 'Motivation',
    bpm: 110,
    durationSec: 25,
    genre: 'pop',
    mood: 'inspirational',
    dropTimestamp: 4.0,
    usageCount: 150000,
    license: 'licensed',
    suggestedFor: ['motivation', 'fitness', 'business'],
  },
];

export const listSounds = (opts?: {
  mood?: SoundAsset['mood'];
  genre?: string;
  maxUsageCount?: number;
  minBpm?: number;
  maxBpm?: number;
  license?: SoundAsset['license'];
  limit?: number;
}): SoundAsset[] => {
  let filtered = [...CATALOGUE];
  if (opts?.mood) filtered = filtered.filter((s) => s.mood === opts.mood);
  if (opts?.genre) filtered = filtered.filter((s) => s.genre === opts.genre);
  if (opts?.maxUsageCount) filtered = filtered.filter((s) => s.usageCount <= opts.maxUsageCount!);
  if (opts?.minBpm) filtered = filtered.filter((s) => s.bpm >= opts.minBpm!);
  if (opts?.maxBpm) filtered = filtered.filter((s) => s.bpm <= opts.maxBpm!);
  if (opts?.license) filtered = filtered.filter((s) => s.license === opts.license);

  // Prioriza sounds con uso medio-bajo pero trending
  filtered.sort((a, b) => {
    const scoreA = a.license === 'trending' ? 100 : 50 - a.usageCount / 10000;
    const scoreB = b.license === 'trending' ? 100 : 50 - b.usageCount / 10000;
    return scoreB - scoreA;
  });

  return filtered.slice(0, opts?.limit ?? 10);
};

export const recommendSound = (opts: {
  contentType: string;
  durationSec: number;
  mood?: SoundAsset['mood'];
}): SoundAsset => {
  const normalizedType = opts.contentType.toLowerCase();
  const candidates = CATALOGUE.filter(
    (s) =>
      s.durationSec >= opts.durationSec * 0.5 &&
      s.durationSec <= opts.durationSec * 1.5 &&
      (opts.mood ? s.mood === opts.mood : true) &&
      (s.suggestedFor.some((t) => normalizedType.includes(t)) || s.license === 'trending'),
  );

  const chosen = candidates.sort((a, b) => b.usageCount - a.usageCount)[0] ?? CATALOGUE[0]!;
  log.info(`[SoundLibrary] Recommended "${chosen.name}" for ${normalizedType} (${opts.durationSec}s)`);
  return chosen;
};

export const getSoundById = (id: string): SoundAsset | undefined => CATALOGUE.find((s) => s.id === id);
