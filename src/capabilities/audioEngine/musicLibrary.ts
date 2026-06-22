/**
 * Music Library — catálogo curado de música y SFX para video social.
 */

import { fetchLicensedTrack } from './musicProviders.js';
import type { MusicTrack } from './types.js';

const CATALOGUE: MusicTrack[] = [
  {
    id: 'tt-music-upbeat-01',
    name: 'Social Energy',
    artist: 'FeedIA Audio',
    bpm: 120,
    durationSec: 30,
    genre: 'electropop',
    mood: 'upbeat',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/upbeat-120.mp3',
  },
  {
    id: 'tt-music-hype-01',
    name: 'Hype Drop',
    artist: 'FeedIA Audio',
    bpm: 140,
    durationSec: 20,
    genre: 'trap',
    mood: 'trending',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/hype-140.mp3',
  },
  {
    id: 'tt-music-chill-01',
    name: 'Focus Loop',
    artist: 'FeedIA Audio',
    bpm: 85,
    durationSec: 30,
    genre: 'lofi',
    mood: 'chill',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/chill-85.mp3',
  },
  {
    id: 'tt-music-dramatic-01',
    name: 'Story Arc',
    artist: 'FeedIA Audio',
    bpm: 70,
    durationSec: 25,
    genre: 'cinematic',
    mood: 'dramatic',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/dramatic-70.mp3',
  },
  {
    id: 'tt-music-funny-01',
    name: 'Comedy Sting',
    artist: 'FeedIA Audio',
    bpm: 110,
    durationSec: 15,
    genre: 'comedy',
    mood: 'funny',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/funny-110.mp3',
  },
  {
    id: 'tt-music-inspirational-01',
    name: 'Rise Up',
    artist: 'FeedIA Audio',
    bpm: 110,
    durationSec: 30,
    genre: 'pop',
    mood: 'inspirational',
    license: 'free',
    url: 'https://cdn.feedia.ai/mock/music/inspirational-110.mp3',
  },
];

export const listMusic = (opts?: {
  mood?: MusicTrack['mood'];
  minBpm?: number;
  maxBpm?: number;
  limit?: number;
}): MusicTrack[] => {
  let filtered = [...CATALOGUE];
  if (opts?.mood) filtered = filtered.filter((t) => t.mood === opts.mood);
  if (opts?.minBpm) filtered = filtered.filter((t) => t.bpm >= opts.minBpm!);
  if (opts?.maxBpm) filtered = filtered.filter((t) => t.bpm <= opts.maxBpm!);
  return filtered.slice(0, opts?.limit ?? 10);
};

export const recommendMusic = async (opts: {
  contentType: string;
  durationSec: number;
  mood?: MusicTrack['mood'];
}): Promise<MusicTrack> => {
  const licensed = await fetchLicensedTrack({
    mood: opts.mood,
    durationSec: opts.durationSec,
    contentType: opts.contentType,
  });
  if (licensed) return licensed;

  const normalized = opts.contentType.toLowerCase();
  const candidates = CATALOGUE.filter(
    (t) =>
      t.durationSec >= opts.durationSec * 0.5 &&
      t.durationSec <= opts.durationSec * 1.5 &&
      (opts.mood ? t.mood === opts.mood : true),
  );

  const scored = candidates.map((t) => {
    let score = 0;
    if (t.mood === 'trending') score += 20;
    if (normalized.includes('comedy') && t.mood === 'funny') score += 30;
    if (normalized.includes('educ') && t.mood === 'chill') score += 30;
    if (normalized.includes('motiv') && t.mood === 'inspirational') score += 30;
    if (normalized.includes('fashion') && t.mood === 'upbeat') score += 30;
    return { track: t, score };
  });

  const chosen = scored.sort((a, b) => b.score - a.score)[0]?.track ?? CATALOGUE[0]!;
  return chosen;
};

export const getMusicById = (id: string): MusicTrack | undefined => CATALOGUE.find((t) => t.id === id);

export const SFX_LIBRARY: Record<string, string> = {
  pop: 'https://cdn.feedia.ai/mock/sfx/pop.mp3',
  whoosh: 'https://cdn.feedia.ai/mock/sfx/whoosh.mp3',
  notification: 'https://cdn.feedia.ai/mock/sfx/notification.mp3',
  like: 'https://cdn.feedia.ai/mock/sfx/like.mp3',
  transition: 'https://cdn.feedia.ai/mock/sfx/transition.mp3',
};

export const getSfxUrl = (name: keyof typeof SFX_LIBRARY): string => SFX_LIBRARY[name] ?? SFX_LIBRARY.pop!;
