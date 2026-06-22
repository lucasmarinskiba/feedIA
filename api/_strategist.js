/**
 * Strategic Brain — piensa ANTES de crear contenido.
 *
 * Output: plan estratégico mejor que agencia. Analiza:
 *   - Algoritmo objetivo (IG/TT) → señales prioritarias
 *   - Audiencia → psicografía + intenciones
 *   - Trend window → momentum surfeable
 *   - Competidores → gaps + ángulos no usados
 *   - Brand voice → consistencia
 *   - Format fit → reel/carrusel/story decidido por target
 *   - Hook variants → 3-5 opciones predichas por strength
 *   - CTA ladder → microcomisión a macro
 *   - Posting window → mejor hora basada en audience timezone
 *   - Risk flags → topics evitar
 *
 * Sin Anthropic — usa reglas + freeLlm si necesita.
 */

const PLATFORM_ALGO_SIGNALS = {
  instagram: {
    reels: {
      primary: ['watch-time', 'completion', 'rewatch', 'shares'],
      weight: { watchTime: 0.35, completion: 0.25, rewatch: 0.15, shares: 0.15, saves: 0.1 },
    },
    carousel: {
      primary: ['saves', 'swipe-rate', 'shares', 'comments'],
      weight: { saves: 0.4, swipes: 0.2, shares: 0.2, comments: 0.2 },
    },
    stories: {
      primary: ['completion', 'reply', 'sticker-tap', 'forward'],
      weight: { completion: 0.4, reply: 0.2, stickers: 0.25, forward: 0.15 },
    },
    feed: {
      primary: ['engagement-rate', 'saves', 'time-on-post'],
      weight: { saves: 0.35, comments: 0.25, likes: 0.2, time: 0.2 },
    },
  },
  tiktok: {
    video: {
      primary: ['completion', 'rewatch', 'shares', 'comments', 'follows-post'],
      weight: { completion: 0.4, rewatch: 0.2, shares: 0.15, comments: 0.1, follows: 0.15 },
    },
    photo: {
      primary: ['swipe-rate', 'completion', 'sound-saves', 'shares'],
      weight: { swipes: 0.35, completion: 0.25, soundSave: 0.2, shares: 0.2 },
    },
    live: {
      primary: ['watch-duration', 'gifts', 'comments-per-min', 'shares'],
      weight: { duration: 0.45, gifts: 0.25, comments: 0.2, shares: 0.1 },
    },
  },
};

const AUDIENCE_PSYCHOGRAPHY = {
  'gen-z': {
    triggers: ['authentic', 'humor', 'irony', 'aesthetic', 'social-cause'],
    avoid: ['corporate', 'cringe', 'sales-pitch'],
    hookStyle: 'pattern-interrupt',
    attentionSec: 1.5,
  },
  millennial: {
    triggers: ['nostalgia', 'self-improvement', 'travel', 'productivity'],
    avoid: ['hard-sell', 'gimmicks'],
    hookStyle: 'curiosity-gap',
    attentionSec: 2.5,
  },
  business: {
    triggers: ['ROI', 'time-saved', 'authority', 'case-study'],
    avoid: ['memes', 'casual-tone'],
    hookStyle: 'problem-statement',
    attentionSec: 3,
  },
  creator: {
    triggers: ['tactics', 'data', 'behind-scenes', 'tool-stack'],
    avoid: ['theory-only', 'generic'],
    hookStyle: 'specific-result',
    attentionSec: 2,
  },
  lifestyle: {
    triggers: ['aspiration', 'transformation', 'sensory', 'belonging'],
    avoid: ['technical', 'cold'],
    hookStyle: 'visual-pop',
    attentionSec: 2,
  },
  edu: {
    triggers: ['novelty', 'simplicity', 'mental-model', 'aha-moment'],
    avoid: ['fluff', 'long-intro'],
    hookStyle: 'counter-intuitive',
    attentionSec: 3,
  },
};

const HOOK_FORMULAS = [
  { id: 'pattern-break', template: 'Nadie está hablando de esto: {topic}', strength: 0.82, fit: ['reels', 'video'] },
  {
    id: 'curiosity-gap',
    template: 'Si {commonBelief}, entonces ¿por qué {contradiction}?',
    strength: 0.78,
    fit: ['carousel', 'video'],
  },
  {
    id: 'specific-number',
    template: '{number} cosas que cambiaron mi {area} en {timeframe}',
    strength: 0.85,
    fit: ['carousel', 'reels', 'video'],
  },
  {
    id: 'mistake-warn',
    template: 'Estás haciendo {action} mal. Esto es lo correcto:',
    strength: 0.8,
    fit: ['reels', 'video', 'photo'],
  },
  { id: 'aspiration', template: 'Cómo {achievement} sin {commonExcuse}', strength: 0.76, fit: ['carousel', 'reels'] },
  { id: 'reveal', template: 'Te muestro lo que NADIE te dijo de {topic}', strength: 0.79, fit: ['reels', 'video'] },
  {
    id: 'counter-intuitive',
    template: 'Lo opuesto a {commonAdvice} funciona mejor. Te explico.',
    strength: 0.83,
    fit: ['carousel', 'video'],
  },
  {
    id: 'before-after',
    template: 'De {before} a {after} en {timeframe}. Mi sistema:',
    strength: 0.81,
    fit: ['reels', 'carousel'],
  },
  {
    id: 'ask-question',
    template: '¿Por qué {phenomenon}? La respuesta te sorprende:',
    strength: 0.74,
    fit: ['carousel'],
  },
  {
    id: 'social-proof',
    template: '{number} personas hicieron esto y {result}. Yo también:',
    strength: 0.77,
    fit: ['video', 'carousel'],
  },
  {
    id: 'time-pressure',
    template: 'En {short-timeframe} aprendí lo que cuesta {long-timeframe}',
    strength: 0.79,
    fit: ['reels', 'video'],
  },
  {
    id: 'controversy',
    template: '{controversial-claim}. Y te explico por qué tengo razón:',
    strength: 0.86,
    fit: ['video', 'carousel'],
  },
];

const OPTIMAL_POSTING_WINDOWS = {
  instagram: {
    reels: ['Mon 6pm-9pm', 'Wed 12pm-2pm', 'Thu 7pm-10pm', 'Sat 11am-1pm'],
    carousel: ['Tue 11am-1pm', 'Wed 9am-11am', 'Thu 12pm-2pm', 'Sun 7pm-9pm'],
    stories: ['Mon-Fri 8am, 12pm, 6pm, 9pm'],
  },
  tiktok: {
    video: ['Tue 9am, 2pm', 'Wed 12pm, 7pm', 'Thu 9am, 6pm', 'Fri 5am, 1pm', 'Sat 11am, 7pm'],
    photo: ['Tue 7pm', 'Thu 8pm', 'Sun 6pm'],
  },
};

const detectAudienceSegment = (brandNiche, targetAge) => {
  const niche = (brandNiche || '').toLowerCase();
  if (/business|b2b|saas|consultor|empresa/.test(niche)) return 'business';
  if (/creator|content|marketing|growth/.test(niche)) return 'creator';
  if (/educ|aprend|curso|enseñ|estudiantes/.test(niche)) return 'edu';
  if (/moda|fitness|viaje|food|lifestyle/.test(niche)) return 'lifestyle';
  if (targetAge && targetAge < 25) return 'gen-z';
  return 'millennial';
};

const computeHookCandidates = (topic, audience, format) => {
  const segment = AUDIENCE_PSYCHOGRAPHY[audience] || AUDIENCE_PSYCHOGRAPHY.millennial;
  const candidates = HOOK_FORMULAS.filter((h) => h.fit.includes(format))
    .map((h) => {
      let adjustedStrength = h.strength;
      if (segment.hookStyle === 'pattern-interrupt' && h.id === 'pattern-break') adjustedStrength += 0.08;
      if (segment.hookStyle === 'curiosity-gap' && h.id === 'curiosity-gap') adjustedStrength += 0.08;
      if (segment.hookStyle === 'specific-result' && h.id === 'specific-number') adjustedStrength += 0.08;
      if (segment.hookStyle === 'counter-intuitive' && h.id === 'counter-intuitive') adjustedStrength += 0.1;
      if (segment.hookStyle === 'problem-statement' && h.id === 'mistake-warn') adjustedStrength += 0.06;
      const filled = h.template
        .replace('{topic}', topic)
        .replace('{area}', topic)
        .replace('{number}', String(Math.floor(Math.random() * 5) + 3))
        .replace('{timeframe}', '7 días')
        .replace('{short-timeframe}', '1 hora')
        .replace('{long-timeframe}', 'años')
        .replace('{action}', topic)
        .replace('{achievement}', topic)
        .replace('{commonExcuse}', 'tiempo o presupuesto')
        .replace('{commonAdvice}', 'lo que todos hacen')
        .replace('{phenomenon}', topic)
        .replace('{controversial-claim}', `Casi todos están haciendo ${topic} mal`)
        .replace('{commonBelief}', 'todos dicen X')
        .replace('{contradiction}', 'los datos muestran lo opuesto')
        .replace('{before}', 'cero')
        .replace('{after}', 'resultado real')
        .replace('{result}', 'funcionó');
      return { id: h.id, hook: filled, predictedStrength: Math.min(0.98, adjustedStrength), formula: h.id };
    })
    .sort((a, b) => b.predictedStrength - a.predictedStrength)
    .slice(0, 5);
  return candidates;
};

const decideFormat = (goal, audience) => {
  // goal: awareness | engagement | conversion | community | sales
  // Mapa de scoring por (goal × audience) → format priority
  const matrix = {
    awareness: { reels: 0.95, video: 0.95, photo: 0.7, carousel: 0.65, stories: 0.55 },
    engagement: { carousel: 0.92, video: 0.85, reels: 0.8, stories: 0.78, photo: 0.65 },
    conversion: { carousel: 0.88, stories: 0.85, video: 0.75, reels: 0.72, photo: 0.55 },
    community: { stories: 0.92, video: 0.85, reels: 0.78, carousel: 0.7, photo: 0.6 },
    sales: { carousel: 0.85, stories: 0.85, video: 0.8, reels: 0.7, photo: 0.5 },
  };
  return matrix[goal] || matrix.engagement;
};

const buildAlgorithmChecklist = (platform, format) => {
  const algo = PLATFORM_ALGO_SIGNALS[platform]?.[format];
  if (!algo) return [];
  return algo.primary.map((signal) => {
    const tactics = {
      'watch-time': 'Hook 0.5s + payoff cada 3s. Sin transiciones lentas. Video <30s para 90% completion.',
      completion: 'Loop final que invita rewatch. Texto en frame último ambiguo (engancha).',
      rewatch: 'Detalle visual rico (text overlay denso, b-roll cambiante).',
      shares: 'Punchline shareable: dato sorprendente, frase memorable, mini-historia.',
      saves: 'Valor referenciable: lista numerada, framework, template, cheat-sheet.',
      'swipe-rate': 'Slide 2 promete payoff que no se ve en slide 1. Cliffhanger.',
      comments: 'Pregunta cerrada + CTA explícito: "¿Vos cuál preferís? A o B".',
      reply: 'Sticker pregunta/quiz en story. Pregunta personal genera response.',
      'sticker-tap': 'Mínimo 1 sticker interactivo (poll/quiz/slider) por story.',
      forward: 'Frase shareable + indicación implícita: "etiquetá a quien necesite esto".',
      'sound-saves': 'Audio original único O trending sound (24-72h vida).',
      'follows-post': 'Promesa de serie: "Parte 1 de 7" → engancha al follow para no perder.',
      'engagement-rate': 'Hook fuerte + CTA explícito en caption. Responder 1ras 60min.',
      'time-on-post': 'Caption largo con micro-historia. Imagen detallada que invita pause.',
      'watch-duration': 'Live > 30min triggers algoritmo. Anunciar 24h antes.',
      gifts: 'Pedir gifts cada 5-10min con call directo. Hacer shoutout a quien regala.',
      'comments-per-min': 'Q&A en vivo. Responder por nombre cada comentario.',
    };
    return { signal, tactic: tactics[signal] || `Optimizar ${signal}` };
  });
};

const computeStrategicScore = (plan) => {
  // Heuristic 0-100 — qué tan agresivamente este plan optimiza para algoritmo
  let score = 50;
  if (plan.topHook?.predictedStrength > 0.85) score += 15;
  else if (plan.topHook?.predictedStrength > 0.78) score += 10;
  if (plan.algorithmChecklist.length >= 4) score += 10;
  if (plan.recommendedFormat?.fit > 0.85) score += 10;
  if (plan.trendOpportunities?.length > 0) score += 8;
  if (plan.differentiationAngles?.length >= 2) score += 7;
  return Math.min(100, score);
};

export const buildStrategicPlan = (input) => {
  const {
    topic = 'tu producto',
    platform = 'instagram', // instagram | tiktok
    goal = 'engagement',
    brandNiche = '',
    targetAge = null,
    competitorAngles = [],
    brandVoice = 'cercano',
  } = input || {};

  const audience = detectAudienceSegment(brandNiche, targetAge);
  const audienceProfile = AUDIENCE_PSYCHOGRAPHY[audience];
  const formatScores = decideFormat(goal, audience);
  const formatRanked = Object.entries(formatScores)
    .map(([fmt, fit]) => ({ format: fmt, fit }))
    .sort((a, b) => b.fit - a.fit);
  const recommendedFormat = formatRanked[0];
  const platformAlgo = PLATFORM_ALGO_SIGNALS[platform] || {};
  const formatKey =
    platform === 'tiktok'
      ? 'video'
      : recommendedFormat.format === 'carousel'
        ? 'carousel'
        : recommendedFormat.format === 'stories'
          ? 'stories'
          : 'reels';

  const hookCandidates = computeHookCandidates(topic, audience, formatKey);
  const algorithmChecklist = buildAlgorithmChecklist(platform, formatKey);
  const postingWindows =
    OPTIMAL_POSTING_WINDOWS[platform]?.[formatKey] || OPTIMAL_POSTING_WINDOWS[platform]?.video || [];

  const differentiationAngles =
    competitorAngles.length > 0
      ? [
          `Lo opuesto a ${competitorAngles[0]}`,
          `Lo que ${competitorAngles[0] || 'todos'} omiten`,
          'Caso real con números',
        ]
      : ['Caso real con números', 'Detrás de escena del proceso', 'Errores que cometiste'];

  const trendOpportunities = []; // Si hay trendDetector vivo, lo pone acá

  const ctaLadder =
    goal === 'sales'
      ? ['Comentá "info" → DM con detalles', 'Tap link bio para ver', 'Reservá la llamada gratis']
      : goal === 'community'
        ? ['Etiquetá a quien necesite esto', '¿Vos qué hacés? Contame en comentarios', 'Compartí en tu historia']
        : ['Guardá para volver', 'Compartí con tu equipo', 'Comentá tu experiencia'];

  const riskFlags = [];
  if (/política|religión/i.test(topic)) riskFlags.push('Topic políticamente sensible — moderar tono');
  if (/dieta|peso/i.test(topic)) riskFlags.push('Cuidado claims salud — IG/TT detecta y demotean');
  if (/garantía|100%/i.test(topic)) riskFlags.push('Evitar lenguaje absoluto — flag de Meta Ads');

  const plan = {
    timestamp: new Date().toISOString(),
    input: { topic, platform, goal, brandNiche, audience },
    audienceProfile,
    recommendedFormat: {
      format: recommendedFormat.format,
      fit: recommendedFormat.fit,
      reason: `Score ${(recommendedFormat.fit * 100).toFixed(0)}% para goal=${goal} + audience=${audience}`,
    },
    allFormatScores: formatRanked,
    hookCandidates,
    topHook: hookCandidates[0],
    algorithmChecklist,
    algorithmPrimarySignals: platformAlgo[formatKey]?.primary || [],
    postingWindows,
    differentiationAngles,
    trendOpportunities,
    ctaLadder,
    riskFlags,
    brandVoiceGuideline: `Tono ${brandVoice} + triggers ${audienceProfile.triggers.slice(0, 3).join(', ')} + evitar ${audienceProfile.avoid.slice(0, 2).join(', ')}`,
    attentionBudgetSec: audienceProfile.attentionSec,
    nextSteps: [
      `1. Producir hook usando: "${hookCandidates[0]?.hook}"`,
      `2. Formato: ${recommendedFormat.format} (fit ${(recommendedFormat.fit * 100).toFixed(0)}%)`,
      `3. Optimizar señales algorítmicas: ${(platformAlgo[formatKey]?.primary || []).join(', ')}`,
      `4. Publicar en ventana: ${postingWindows[0] || 'cualquier momento'}`,
      `5. Validar con viralPredictor antes de publicar`,
    ],
  };

  plan.strategicScore = computeStrategicScore(plan);
  return plan;
};

export const handleStrategist = async (req, res, path, m, body) => {
  if (path === '/api/strategy/plan' && m === 'POST') {
    const plan = buildStrategicPlan(body || {});
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(plan));
    return true;
  }
  return false;
};
