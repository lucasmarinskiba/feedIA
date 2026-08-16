/**
 * Audio Intelligence System — TikTok/Instagram sound optimization
 * Discovers, analyzes, matches, and syncs trending audio for maximum virality
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TrendingAudio {
  audioId: string;
  name: string;
  artist: string;
  platform: 'tiktok' | 'instagram';
  genre: string;
  mood: string[];
  bpm: number;
  duration: number;
  uses: number;
  virality: number; // 0-1
  trend: 'emerging' | 'accelerating' | 'plateauing' | 'declining';
  lastUpdated: string;
  originalUrl: string;
}

interface AudioMatch {
  audioId: string;
  format: 'carousel' | 'reel' | 'story' | 'static';
  niche: string;
  matchScore: number; // 0-1
  reasoning: string[];
  syncPoints: Array<{ second: number; beat: string }>;
  estimatedEngagement: number;
  confidence: number;
}

interface AudioPerformance {
  audioId: string;
  platform: 'tiktok' | 'instagram';
  totalUses: number;
  avgEngagement: number;
  avgReach: number;
  conversionRate: number;
  sentiment: number; // -1 to 1
  trending: boolean;
  peakHours: string[];
}

// In-memory audio database (persistent in production)
const audioDatabase: Map<string, TrendingAudio> = new Map();
const audioMatches: Map<string, AudioMatch[]> = new Map();
const audioPerformance: Map<string, AudioPerformance> = new Map();

const AUDIO_MOOD_MAP: Record<string, string[]> = {
  skincare: ['calm', 'inspirational', 'uplifting', 'energetic'],
  fitness: ['energetic', 'motivational', 'powerful', 'epic'],
  food: ['fun', 'playful', 'appetizing', 'cozy'],
  business: ['professional', 'motivational', 'authoritative'],
  lifestyle: ['chill', 'trendy', 'aesthetic', 'dreamy'],
  fashion: ['trendy', 'fashionable', 'energetic', 'sophisticated'],
  travel: ['adventurous', 'inspiring', 'peaceful', 'epic'],
  education: ['calm', 'clear', 'motivational', 'engaging'],
};

const NICHE_GENRES: Record<string, string[]> = {
  skincare: ['pop', 'electronic', 'indie-pop'],
  fitness: ['hip-hop', 'edm', 'trap', 'rock'],
  food: ['pop', 'dance', 'funk', 'indie'],
  business: ['corporate', 'ambient', 'chill-hop'],
  lifestyle: ['indie-pop', 'chill-hip-hop', 'lo-fi'],
  fashion: ['pop', 'edm', 'disco', 'indie-pop'],
  travel: ['indie-pop', 'folk', 'world', 'epic'],
  education: ['ambient', 'lo-fi', 'indie-pop'],
};

/**
 * Fetch trending audio from TikTok/Instagram
 * (In production: connect to official APIs)
 */
export const fetchTrendingAudio = (platform: 'tiktok' | 'instagram', niche?: string): TrendingAudio[] => {
  // Mock data for demo; production connects to API
  const trendingAudios: TrendingAudio[] = [
    {
      audioId: 'aud_tiktok_viral_001',
      name: 'Aesthetic Vibes',
      artist: 'Creator Labs',
      platform: 'tiktok',
      genre: 'indie-pop',
      mood: ['calm', 'inspirational', 'aesthetic'],
      bpm: 92,
      duration: 45,
      uses: 2800000,
      virality: 0.94,
      trend: 'accelerating',
      lastUpdated: new Date().toISOString(),
      originalUrl: 'https://www.tiktok.com/music/...',
    },
    {
      audioId: 'aud_instagram_viral_002',
      name: 'Energetic Beats',
      artist: 'Sound Collective',
      platform: 'instagram',
      genre: 'edm',
      mood: ['energetic', 'powerful', 'fun'],
      bpm: 128,
      duration: 60,
      uses: 1950000,
      virality: 0.87,
      trend: 'accelerating',
      lastUpdated: new Date().toISOString(),
      originalUrl: 'https://www.instagram.com/reels/audio/...',
    },
    {
      audioId: 'aud_tiktok_viral_003',
      name: 'Lo-Fi Chill',
      artist: 'Beat Masters',
      platform: 'tiktok',
      genre: 'lo-fi',
      mood: ['chill', 'dreamy', 'cozy'],
      bpm: 76,
      duration: 120,
      uses: 1200000,
      virality: 0.72,
      trend: 'plateauing',
      lastUpdated: new Date().toISOString(),
      originalUrl: 'https://www.tiktok.com/music/...',
    },
  ];

  // Filter by niche if provided
  if (niche) {
    const allowedGenres = NICHE_GENRES[niche] || [];
    return trendingAudios.filter((audio) => allowedGenres.includes(audio.genre));
  }

  return trendingAudios;
};

/**
 * Analyze audio characteristics for virality potential
 */
export const analyzeAudioCharacteristics = (audio: TrendingAudio): { virality: number; momentum: number } => {
  const baseVirality = audio.uses / 5000000; // Normalize by usage
  const trendMultiplier =
    audio.trend === 'accelerating' ? 1.3 : audio.trend === 'emerging' ? 1.2 : audio.trend === 'plateauing' ? 0.9 : 0.6;
  const moodBoost = audio.mood.length > 0 ? 1.1 : 1.0;

  const virality = Math.min(1, baseVirality * trendMultiplier * moodBoost);
  const momentum = audio.trend === 'accelerating' ? 0.9 : audio.trend === 'emerging' ? 0.75 : 0.4;

  return { virality, momentum };
};

/**
 * Smart match audio to content (format + niche + style)
 */
export const matchAudioToContent = (
  format: 'carousel' | 'reel' | 'story' | 'static',
  niche: string,
  contentLength: number // seconds
): AudioMatch[] => {
  const allAudio = fetchTrendingAudio('tiktok', niche);

  const matches: AudioMatch[] = allAudio.map((audio) => {
    const { virality, momentum } = analyzeAudioCharacteristics(audio);

    // Format compatibility
    const formatDuration = format === 'story' ? 15 : format === 'carousel' ? 3 : 60;
    const durationMatch = Math.min(audio.duration / formatDuration, 1);

    // Niche alignment
    const nicheMoods = AUDIO_MOOD_MAP[niche] || [];
    const moodMatch = audio.mood.filter((m) => nicheMoods.includes(m)).length / Math.max(audio.mood.length, 1);

    // Overall score
    const matchScore = (virality * 0.4 + moodMatch * 0.3 + momentum * 0.2 + durationMatch * 0.1) * 100;

    // Sync points (for video alignment)
    const beats = Math.floor(audio.duration / (60 / audio.bpm));
    const syncPoints = Array.from({ length: Math.min(beats, 5) }, (_, i) => ({
      second: (i * audio.duration) / Math.min(beats, 5),
      beat: `beat_${i + 1}`,
    }));

    return {
      audioId: audio.audioId,
      format,
      niche,
      matchScore: Math.min(matchScore / 100, 1),
      reasoning: [
        `Mood alignment: ${(moodMatch * 100).toFixed(0)}%`,
        `Virality: ${(virality * 100).toFixed(0)}%`,
        `Trending: ${audio.trend}`,
        `${audio.uses.toLocaleString()} current uses`,
      ],
      syncPoints,
      estimatedEngagement: virality * moodMatch * momentum,
      confidence: moodMatch > 0.5 ? 0.9 : moodMatch > 0.3 ? 0.7 : 0.5,
    };
  });

  // Sort by match score
  return matches.sort((a, b) => b.matchScore - a.matchScore);
};

/**
 * Track audio performance over time
 */
export const recordAudioPerformance = (audioId: string, platform: 'tiktok' | 'instagram', metrics: Partial<AudioPerformance>) => {
  const existing = audioPerformance.get(audioId) || {
    audioId,
    platform,
    totalUses: 0,
    avgEngagement: 0,
    avgReach: 0,
    conversionRate: 0,
    sentiment: 0,
    trending: false,
    peakHours: [],
  };

  const updated = {
    ...existing,
    ...metrics,
    totalUses: (existing.totalUses || 0) + 1,
  };

  audioPerformance.set(audioId, updated);

  return updated;
};

/**
 * Predict audio virality trajectory
 */
export const predictAudioVirality = (audio: TrendingAudio): { score: number; label: string; prediction: string } => {
  const { virality, momentum } = analyzeAudioCharacteristics(audio);

  const score = virality * 0.6 + momentum * 0.4;
  const label = score > 0.8 ? 'Viral' : score > 0.6 ? 'Trending' : score > 0.4 ? 'Growing' : 'Fading';

  let prediction = '';
  if (audio.trend === 'accelerating' && score > 0.7) {
    prediction = 'Peak expected in 3-7 days. Use ASAP.';
  } else if (audio.trend === 'accelerating') {
    prediction = 'Gaining momentum. Good window for next 5-10 days.';
  } else if (audio.trend === 'plateauing') {
    prediction = 'Peak passed. Use for niche/evergreen content only.';
  } else {
    prediction = 'Declining. Risk of algorithm suppression.';
  }

  return { score, label, prediction };
};

/**
 * Recommend optimal posting time based on audio + platform
 */
export const getOptimalPostingTime = (audioId: string, platform: 'tiktok' | 'instagram'): string[] => {
  // TikTok peaks: 6-10am, 7-11pm
  // Instagram peaks: 11am-1pm, 7-9pm, 8-11pm
  const tiktokPeaks = ['06:00', '07:00', '08:00', '09:00', '10:00', '19:00', '20:00', '21:00', '22:00', '23:00'];
  const instagramPeaks = ['11:00', '12:00', '13:00', '19:00', '20:00', '21:00', '22:00'];

  return platform === 'tiktok' ? tiktokPeaks : instagramPeaks;
};

/**
 * Generate audio strategy (which sounds to use when)
 */
export const buildAudioStrategy = (
  niche: string,
  format: 'carousel' | 'reel' | 'story' | 'static',
  weeklyVolume: number // posts per week
): {
  weeklyPlaylist: Array<{ day: number; audio: TrendingAudio; reason: string }>;
  backupAudios: TrendingAudio[];
  avoidList: string[];
} => {
  const trending = fetchTrendingAudio('tiktok', niche);
  const matches = matchAudioToContent(format, niche, 60);

  const weeklyPlaylist = matches.slice(0, weeklyVolume).map((match, idx) => ({
    day: idx + 1,
    audio: trending.find((a) => a.audioId === match.audioId)!,
    reason: `Match score: ${(match.matchScore * 100).toFixed(0)}%`,
  }));

  const backupAudios = trending.filter((a) => a.trend === 'accelerating').slice(0, 3);

  const avoidList = trending.filter((a) => a.trend === 'declining').map((a) => a.audioId);

  return { weeklyPlaylist, backupAudios, avoidList };
};

/**
 * Sync audio to video beats (for editing)
 */
export const getSyncPoints = (audioId: string, videoDuration: number): Array<{ second: number; action: string }> => {
  const audio = fetchTrendingAudio('tiktok').find((a) => a.audioId === audioId);
  if (!audio) return [];

  const beatInterval = (60 / audio.bpm) * 4; // 4-beat measure
  const syncPoints: Array<{ second: number; action: string }> = [];

  for (let i = 0; i < videoDuration; i += beatInterval) {
    syncPoints.push({
      second: i,
      action: i === 0 ? 'intro_beat' : i >= videoDuration - beatInterval ? 'outro_beat' : 'main_beat',
    });
  }

  return syncPoints;
};

export default {
  fetchTrendingAudio,
  analyzeAudioCharacteristics,
  matchAudioToContent,
  recordAudioPerformance,
  predictAudioVirality,
  getOptimalPostingTime,
  buildAudioStrategy,
  getSyncPoints,
};
