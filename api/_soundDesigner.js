/**
 * Sound Designer — música/sonido trending por nicho/mood/BPM.
 *
 * Seed estático (catálogo) + opcional pull en vivo desde TikTok (si TT está conectado).
 * 100% heurístico, sin LLM.
 *
 * Cache:
 *   - feedia:sound:trending:{niche}        6h TTL
 *   - userKey(userId, 'sound:used:30d')    rolling list de IDs usados
 */

import * as store from './_store.js';
import { ttConnected, ttVideos } from './_social.js';

const NOW = () => Date.now();
const HOUR = 3600;

/**
 * Catálogo deterministic — sonidos arquetipo por nicho.
 * `decayDate` indica cuándo refrescar manualmente (admin endpoint futuro).
 */
export const SOUND_CATALOG_TIKTOK = [
  // Universales (alta rotación)
  {
    id: 'tt-univ-001',
    name: 'Aesthetic Lo-Fi Loop',
    bpm: 75,
    mood: 'calm',
    niches: ['*'],
    trendingFlag: true,
    decayDate: '2026-09-30',
    durationFitSec: [10, 60],
  },
  {
    id: 'tt-univ-002',
    name: 'Energetic Tech-House Drop',
    bpm: 128,
    mood: 'energetic',
    niches: ['*'],
    trendingFlag: true,
    decayDate: '2026-09-30',
    durationFitSec: [15, 30],
  },
  {
    id: 'tt-univ-003',
    name: 'Cinematic Build + Whoosh',
    bpm: 90,
    mood: 'dramatic',
    niches: ['*'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [10, 60],
  },
  {
    id: 'tt-univ-004',
    name: 'Playful Kawaii Bell',
    bpm: 110,
    mood: 'playful',
    niches: ['lifestyle', 'beauty', 'food'],
    trendingFlag: true,
    decayDate: '2026-08-15',
    durationFitSec: [10, 20],
  },
  {
    id: 'tt-univ-005',
    name: 'Retro Synthwave',
    bpm: 100,
    mood: 'retro',
    niches: ['tech', 'lifestyle'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [15, 60],
  },

  // Fitness
  {
    id: 'tt-fit-001',
    name: 'Hard Trap Workout',
    bpm: 140,
    mood: 'energetic',
    niches: ['fitness'],
    trendingFlag: true,
    decayDate: '2026-08-15',
    durationFitSec: [10, 30],
  },
  {
    id: 'tt-fit-002',
    name: 'Phonk Slap Loop',
    bpm: 130,
    mood: 'dramatic',
    niches: ['fitness'],
    trendingFlag: true,
    decayDate: '2026-09-30',
    durationFitSec: [10, 30],
  },

  // Finanzas / Business
  {
    id: 'tt-fin-001',
    name: 'Corporate Cinematic Pad',
    bpm: 90,
    mood: 'dramatic',
    niches: ['finanzas', 'business', 'negocios'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [20, 60],
  },
  {
    id: 'tt-fin-002',
    name: 'Tense Build to Drop',
    bpm: 120,
    mood: 'dramatic',
    niches: ['finanzas', 'business'],
    trendingFlag: true,
    decayDate: '2026-08-30',
    durationFitSec: [15, 45],
  },

  // Tech
  {
    id: 'tt-tch-001',
    name: 'Future Bass Hype',
    bpm: 130,
    mood: 'energetic',
    niches: ['tech'],
    trendingFlag: true,
    decayDate: '2026-08-30',
    durationFitSec: [15, 30],
  },
  {
    id: 'tt-tch-002',
    name: 'Glitch IDM Ambience',
    bpm: 100,
    mood: 'cinematic',
    niches: ['tech'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [20, 60],
  },

  // Food
  {
    id: 'tt-fd-001',
    name: 'ASMR Kitchen Pop',
    bpm: 95,
    mood: 'warm',
    niches: ['food'],
    trendingFlag: true,
    decayDate: '2026-09-15',
    durationFitSec: [15, 60],
  },
  {
    id: 'tt-fd-002',
    name: 'Funky Jazz Cooking',
    bpm: 105,
    mood: 'playful',
    niches: ['food'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [15, 45],
  },

  // Beauty
  {
    id: 'tt-bty-001',
    name: 'Soft Pop Female Vocal',
    bpm: 100,
    mood: 'minimal',
    niches: ['beauty'],
    trendingFlag: true,
    decayDate: '2026-09-15',
    durationFitSec: [10, 30],
  },
  {
    id: 'tt-bty-002',
    name: 'Aesthetic Slow Beat',
    bpm: 80,
    mood: 'luxe',
    niches: ['beauty', 'moda'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [15, 45],
  },

  // Education
  {
    id: 'tt-edu-001',
    name: 'Minimal Piano + Click Track',
    bpm: 90,
    mood: 'clean',
    niches: ['educacion', 'educ'],
    trendingFlag: false,
    decayDate: '2026-12-31',
    durationFitSec: [20, 60],
  },
];

const matchesNiche = (sound, niche) => {
  const n = String(niche || '').toLowerCase();
  if (!n) return true;
  return sound.niches.includes('*') || sound.niches.some((nn) => n.includes(nn));
};

const matchesMood = (sound, mood) => {
  if (!mood) return true;
  return sound.mood === mood;
};

const matchesDuration = (sound, durationSec) => {
  if (!durationSec) return true;
  const [min, max] = sound.durationFitSec || [0, 999];
  return durationSec >= min && durationSec <= max;
};

const isExpired = (sound) => {
  const d = new Date(sound.decayDate || '2030-01-01').getTime();
  return d < NOW();
};

const bpmTargetForMood = (mood) => {
  const map = {
    calm: 70,
    minimal: 90,
    clean: 95,
    warm: 100,
    retro: 105,
    playful: 115,
    cinematic: 100,
    dramatic: 110,
    luxe: 90,
    energetic: 130,
  };
  return map[mood] || 100;
};

const soundDesignTipsByMood = (mood) => {
  const tips = {
    energetic: [
      'Sincronizá cortes en cada beat 4x4',
      'Drop coincide con el hook 0-2s',
      'Bajá la voz 6dB cuando entra el drop',
    ],
    dramatic: [
      'Reservá el bass hit para la revelación',
      'Riser sube energía 2-3s antes del payoff',
      'Silencio absoluto 0.3s antes del impacto',
    ],
    warm: [
      'Compresión suave 2:1 · evitá clipping',
      'Texturas vinilo + crackle bajo',
      'EQ con boost en 250-400Hz para warmth',
    ],
    playful: ['Sound effects bell/pop en cada gag', 'Sidechain sutil con kick', 'Filtros high-pass durante diálogo'],
    cinematic: ['Reverb largo en hook + corte seco en payoff', 'Sub-bass en revelaciones', 'Foley natural en B-roll'],
    minimal: [
      'Una sola capa instrumental dominante',
      'Silencios estratégicos cada 4s',
      'EQ limpio · sin nada bajo 60Hz',
    ],
    clean: ['Voz al frente · música -18dB', 'Sin reverb en voz para tutorial', 'Click track de transición sutil'],
    retro: ['Saturación tape leve', 'Tape stop al final', 'Bit-crush ligero en hi-hats'],
    luxe: ['Cuerda lenta + pad', 'Reverb cathedral 30%', 'Boost subtle en 8-12kHz para brillo'],
    calm: ['Pad evolutivo · sin percusión dura', 'Voz susurrada con doble-tracking', 'Sidechain al respiro'],
  };
  return tips[mood] || tips.cinematic;
};

/**
 * Recomienda sonidos del catálogo + tips de sound design.
 */
export const recommendSounds = async ({
  niche = '',
  mood = null,
  durationSec = null,
  useLive = false,
  user = null,
} = {}) => {
  const filtered = SOUND_CATALOG_TIKTOK.filter((s) => !isExpired(s))
    .filter((s) => matchesNiche(s, niche))
    .filter((s) => matchesMood(s, mood))
    .filter((s) => matchesDuration(s, durationSec));

  // Evitar repetir sonidos usados últimos 30d
  let usedIds = [];
  if (user?.id) {
    try {
      const list = await store.lrangeUser(user.id, 'sound:used:30d', 0, 199);
      usedIds = (list || []).map((x) => x?.id).filter(Boolean);
    } catch {
      /* best-effort */
    }
  }

  const ranked = filtered.sort((a, b) => {
    const aUsed = usedIds.includes(a.id) ? 1 : 0;
    const bUsed = usedIds.includes(b.id) ? 1 : 0;
    if (aUsed !== bUsed) return aUsed - bUsed; // no usados primero
    if (a.trendingFlag !== b.trendingFlag) return a.trendingFlag ? -1 : 1;
    return 0;
  });

  const trending = ranked.filter((s) => s.trendingFlag).slice(0, 6);
  const evergreen = ranked.filter((s) => !s.trendingFlag).slice(0, 6);

  // Live pull opcional
  let live = null;
  if (useLive) {
    try {
      if (await ttConnected()) {
        const cacheKey = `feedia:sound:trending:${(niche || 'general').toLowerCase()}`;
        const cached = await store.get(cacheKey);
        if (cached) {
          live = { source: 'cache', items: cached };
        } else {
          const vids = await ttVideos(20);
          const ids = (vids?.videos || [])
            .map((v) => v?.music?.id)
            .filter(Boolean)
            .slice(0, 8);
          live = { source: 'tiktok-api', items: ids };
          await store.set(cacheKey, live.items);
          await store.expire(cacheKey, HOUR * 6);
        }
      }
    } catch {
      /* live opcional, no rompe */
    }
  }

  return {
    niche,
    mood: mood || 'auto',
    durationSec,
    bpmTarget: bpmTargetForMood(mood),
    trending,
    evergreen,
    live,
    soundDesignTips: soundDesignTipsByMood(mood || 'cinematic'),
    decayWarnings: ranked
      .filter((s) => {
        const decayDays = (new Date(s.decayDate).getTime() - NOW()) / (1000 * 60 * 60 * 24);
        return decayDays < 30 && decayDays > 0;
      })
      .map((s) => ({ id: s.id, name: s.name, decayDate: s.decayDate })),
  };
};

/**
 * Registra un sonido usado por user (para evitar repetición 30d).
 */
export const recordSoundUsage = async (userId, soundId) => {
  if (!userId || !soundId) return;
  try {
    await store.lpushUser(userId, 'sound:used:30d', { id: soundId, at: NOW() });
    await store.ltrim(store.userKey(userId, 'sound:used:30d'), 0, 199);
  } catch {
    /* best-effort */
  }
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleSoundDesigner = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/tiktok/sound/recommend' && m === 'POST') {
    const result = await recommendSounds({ ...(body || {}), user });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/tiktok/sound/used' && m === 'POST' && userId) {
    const { soundId } = body || {};
    await recordSoundUsage(userId, soundId);
    json(res, 200, { ok: true });
    return true;
  }

  if (path === '/api/tiktok/sound/catalog' && m === 'GET') {
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({ count: SOUND_CATALOG_TIKTOK.length, catalog: SOUND_CATALOG_TIKTOK }));
    return true;
  }

  return false;
};
