/**
 * Influencer Imagination Engine — taste + cultural radar + imagination.
 *
 * Lo que separa influencer top de mediocres:
 *   - Taste filter (qué postear vs descartar)
 *   - Cultural radar (qué está vibrating ahora)
 *   - Imagination (ángulos no obvios)
 *   - Timing instinct (cuándo subir)
 *   - Aesthetic eye (composition + color + mood)
 *
 * Cada módulo simula este "sexto sentido".
 */

/* ════════ TASTE FILTER ════════ */
export const tasteFilter = ({ contentIdea, niche }) => {
  const score =
    (contentIdea?.uniqueness || 0) * 30 +
    (contentIdea?.audienceFit || 0) * 25 +
    (contentIdea?.executionDifficulty < 5 ? 20 : 10) +
    (contentIdea?.cultural_relevance || 0) * 15 +
    (contentIdea?.timeless || contentIdea?.timely ? 10 : 0);
  return {
    contentIdea,
    score,
    verdict: score >= 70 ? 'ship' : score >= 50 ? 'iterate' : 'kill',
    rationale:
      score >= 70
        ? 'Strong fit + unique + actionable'
        : score >= 50
          ? 'OK base, push uniqueness o timing'
          : 'Mediocre — descarte mejora foco',
    influencerWouldSay:
      score >= 70 ? '"this slaps, post it"' : score >= 50 ? '"could be better — rework hook"' : '"not it, next"',
  };
};

/* ════════ CULTURAL RADAR ════════ */
export const culturalRadar = ({ niche, currentDate }) => ({
  signalsToTrack: {
    'micro-trends': [
      'TikTok sounds <72h vida',
      'IG Reels remix tendencias',
      'Twitter trending topics',
      'Reddit r/[niche] hot',
    ],
    'macro-shifts': ['Gen Z language evolution', 'platform feature releases', 'cultural moments universal'],
    'niche-conversations': [
      `${niche} subreddit hot threads`,
      'top creators reactions',
      'creator drama (track sin participate)',
    ],
    'data-signals': ['Google Trends sudden spikes', 'TikTok Discover top hashtags', 'YouTube trending'],
  },
  refreshCadence: 'Daily 15 min scroll + 1× semanal deep dive 1h',
  influencerTip: 'Top creators dedican 30% del tiempo a consumir, no producir. Saturate brain con culture.',
});

/* ════════ IMAGINATION ENGINE — angles no obvios ════════ */
export const generateNonObviousAngles = ({ topic, count = 10 }) => ({
  topic,
  angleStrategies: [
    { method: 'inversion', example: `Por qué TODOS dicen Z sobre ${topic} pero el opuesto es verdad` },
    { method: 'unexpected-comparison', example: `${topic} explained con metáfora del ${'fútbol'}` },
    { method: 'historical-lens', example: `Cómo lo hacían en 1995 vs ahora con ${topic}` },
    { method: 'extreme-edge-case', example: `Llevé ${topic} al máximo absurdo — esto pasó` },
    { method: 'opposite-audience', example: `${topic} para gente que odia ${topic}` },
    { method: 'meta-content', example: `Por qué nadie habla de ${topic} en este formato` },
    { method: 'data-no-one-sees', example: `Mi screen-time con ${topic} este mes — los datos reales` },
    { method: 'micro-narrow', example: `${topic} pero solo para martes a la mañana` },
    { method: 'cross-discipline', example: `Lo que ${topic} aprendió de la cocina japonesa` },
    { method: 'breakdown-failure', example: `Mi error catastrófico con ${topic} — lección` },
  ].slice(0, count),
  influencerTip: 'Boring angles = no engagement. Imagination = 80% del trabajo.',
});

/* ════════ TIMING INSTINCT ════════ */
export const timingInstinct = ({ contentType, platform, audienceTimezone }) => ({
  rule: 'Top creators publican 15-30 min antes del peak. Algoritmo testea fresh content en pico audience.',
  platformPeaks:
    platform === 'tiktok'
      ? { primary: '19-21:30', secondary: '12-14', tertiary: '8-10' }
      : { primary: '17-19', secondary: '11-13', tertiary: '20-22' },
  precisionRule: `Postear ${platform === 'tiktok' ? '18:30' : '16:30'} para peak ${platform === 'tiktok' ? '19' : '17'}`,
  weeklyVariation: 'Tue-Thu para B2B / educational. Sat-Sun para entertainment.',
  dayOffWisdom: 'NO posts crítico domingo noche o lunes 9am — competence overwhelming.',
});

/* ════════ AESTHETIC EYE ════════ */
export const aestheticGuidance = ({ mood, niche }) => ({
  moodCompositionRules: {
    energetic: {
      palette: 'saturated bright',
      composition: 'tight crop + face + motion blur',
      music: 'high BPM trending',
    },
    'calm-luxe': {
      palette: 'muted earth + accent gold',
      composition: 'wide + symmetry + negative space',
      music: 'minimal ambient',
    },
    'edgy-cyber': {
      palette: 'neon + black + chromatic aberration',
      composition: 'asymmetric + glitch',
      music: 'electronic distorted',
    },
    'wholesome-nostalgic': {
      palette: 'warm desat + grain',
      composition: 'rule of thirds + slow zoom',
      music: 'indie acoustic',
    },
  },
  influencerEye: [
    'Si dudás de un frame, no es el frame correcto',
    'Visual consistency 80% wins. 20% surprise rotation.',
    'Una marca visual = mismo ángulo cámara + lighting + outfit recurrente',
    'Hero color de marca presente en 60%+ posts',
  ],
});

/* ════════ HANDLER ════════ */
export const handleInfluencerImagination = async (req, res, path, m, body) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const routes = {
    '/api/imagination/taste-filter': () => tasteFilter(body || {}),
    '/api/imagination/cultural-radar': () => culturalRadar(body || {}),
    '/api/imagination/non-obvious-angles': () => generateNonObviousAngles(body || {}),
    '/api/imagination/timing-instinct': () => timingInstinct(body || {}),
    '/api/imagination/aesthetic-guidance': () => aestheticGuidance(body || {}),
  };
  if (routes[path] && (m === 'POST' || m === 'GET')) {
    json(200, routes[path]());
    return true;
  }
  return false;
};
