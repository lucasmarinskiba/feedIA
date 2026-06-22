/**
 * Music Providers — integración con bibliotecas de música con licencia.
 *
 * Soporta endpoints genéricos configurables. En DRY_RUN o sin credenciales
 * devuelve el catálogo mock local.
 */

import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import type { MusicTrack } from './types.js';

export type MusicProvider = 'epidemic' | 'artlist' | 'uppbeat' | 'custom' | 'none';

const PROVIDER_URL = process.env['MUSIC_PROVIDER_API_URL'] ?? '';
const PROVIDER_KEY = process.env['MUSIC_PROVIDER_API_KEY'] ?? '';
const PROVIDER_NAME = (process.env['MUSIC_PROVIDER'] ?? 'none') as MusicProvider;

const MOCK_TRACKS: MusicTrack[] = [
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
];

export interface FetchTrackInput {
  mood?: MusicTrack['mood'];
  durationSec?: number;
  contentType?: string;
}

export const fetchLicensedTrack = async (opts: FetchTrackInput = {}): Promise<MusicTrack | null> => {
  if (env.dryRun || PROVIDER_NAME === 'none' || !PROVIDER_URL) {
    return MOCK_TRACKS.find((t) => (opts.mood ? t.mood === opts.mood : true)) ?? MOCK_TRACKS[0] ?? null;
  }

  try {
    const params = new URLSearchParams();
    if (opts.mood) params.set('mood', opts.mood);
    if (opts.durationSec) params.set('duration', String(opts.durationSec));
    if (opts.contentType) params.set('content_type', opts.contentType);

    const res = await fetch(`${PROVIDER_URL}?${params}`, {
      headers: {
        Accept: 'application/json',
        ...(PROVIDER_KEY ? { Authorization: `Bearer ${PROVIDER_KEY}` } : {}),
      },
    });

    if (!res.ok) {
      log.warn(`[MusicProvider] ${res.status}: ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as {
      id?: string;
      name?: string;
      artist?: string;
      bpm?: number;
      duration_sec?: number;
      genre?: string;
      mood?: MusicTrack['mood'];
      url?: string;
      license?: 'free' | 'licensed' | 'trending';
    };

    if (!data.url || !data.id) return null;

    return {
      id: data.id,
      name: data.name ?? 'Licensed Track',
      artist: data.artist ?? 'Unknown',
      bpm: data.bpm ?? 120,
      durationSec: data.duration_sec ?? (opts.durationSec || 30),
      genre: data.genre ?? 'unknown',
      mood: data.mood ?? opts.mood ?? 'upbeat',
      license: data.license ?? 'licensed',
      url: data.url,
    };
  } catch (err) {
    log.warn(`[MusicProvider] Error: ${(err as Error).message}`);
    return null;
  }
};

export const getMusicProvider = (): MusicProvider => PROVIDER_NAME;
