/**
 * Growth Intelligence — modules para análisis + estrategia.
 *
 * Incluye:
 *   - nicheAnalyzer: análisis nicho + tendencias + top players
 *   - audienceAnalyzer: psicografía + pain points + dream outcomes
 *   - performanceAnalyzer: top posts + winning patterns + descartar low-perf
 *   - focusRecommender: en qué enfocarse esta semana
 *   - smartCalendarBuilder: calendar diario/semanal/mensual con tipo mix
 *   - hookGenerator: hooks <10 palabras (curiosity/controversy/impact)
 *   - storytellingArchitect: emotional + simple + short sentences + CTA
 *   - viralIdeasGenerator: ideas <30min creation, max share
 *   - viralAnalyzer: qué funciona en IG/TT por nicho
 *   - manychat integration: lead filtering
 *   - leadCapture: capture intelligence
 *   - briefToCampaign: brief → campaign full
 *   - brandIdentityGenerator: brand identity desde brief
 *
 * Sin Anthropic call directo. Heurístico + freeLlm fallback. Free plan compatible.
 */

import { freeLlm } from './_freeAi.js';
import { routeLlm } from './_aiRouter.js';
import { getSessionFromReq } from './_users.js';
import { hasFeature, getFeature } from './_planFeatures.js';
import * as store from './_store.js';

/* ════════════════════ NICHE ANALYZER ════════════════════ */

const NICHE_PATTERNS = {
  'marketing-digital': {
    topPlayers: ['@garyvee', '@neilpatel', '@aliabdaal', '@chasedimond'],
    contentPillars: ['tactics', 'case-studies', 'data-insights', 'behind-scenes'],
    trends2026: ['AI automation', 'short-form video', 'community-led growth', 'creator economy'],
    avgPostFreq: { ig: '5-7/sem', tt: '7-14/sem' },
    monetization: ['cursos', 'consultoría', 'agencia', 'SaaS', 'afiliados'],
  },
  fitness: {
    topPlayers: ['@chris_bumstead', '@athleanx', '@chriskreso'],
    contentPillars: ['workout-tutorials', 'transformation', 'nutrition', 'motivation'],
    trends2026: ['hybrid training', 'longevity science', 'wearables', 'female strength'],
    avgPostFreq: { ig: '7/sem', tt: '10-14/sem' },
    monetization: ['coaching', 'apps', 'suplementos', 'merch', 'cursos'],
  },
  food: {
    topPlayers: ['@gordongram', '@buzzfeedtasty', '@joshelkin'],
    contentPillars: ['recipes', 'reviews', 'asmr', 'behind-restaurant'],
    trends2026: ['high-protein', 'global cuisines', '30-min meals', 'budget cooking'],
    avgPostFreq: { ig: '5-7/sem', tt: '10-14/sem' },
    monetization: ['cookbooks', 'meal kits', 'restaurant', 'ads', 'sponsorships'],
  },
  tech: {
    topPlayers: ['@mkbhd', '@unboxtherapy', '@theverge'],
    contentPillars: ['unboxing', 'reviews', 'tutorials', 'news'],
    trends2026: ['AI agents', 'spatial computing', 'EV', 'foldables', 'wearables'],
    avgPostFreq: { ig: '4-6/sem', tt: '7/sem' },
    monetization: ['ads', 'sponsorships', 'affiliate', 'consulting'],
  },
  finance: {
    topPlayers: ['@grahamstephan', '@humphreytalks', '@vivian_tu'],
    contentPillars: ['tutorials-básicos', 'case-studies', 'market-takes', 'budget-hacks'],
    trends2026: ['AI-powered investing', 'creator finance', 'crypto regulation', 'side hustles'],
    avgPostFreq: { ig: '5/sem', tt: '10/sem' },
    monetization: ['cursos', 'newsletter', 'fondos', 'consulting'],
  },
  beauty: {
    topPlayers: ['@hudabeauty', '@manny_mua733', '@nikkietutorials'],
    contentPillars: ['tutorials', 'reviews', 'GRWM', 'transformations'],
    trends2026: ['minimalist routine', 'skinification', 'AI try-on', 'sustainability'],
    avgPostFreq: { ig: '7/sem', tt: '10-14/sem' },
    monetization: ['brand collabs', 'própia línea', 'cursos', 'ads'],
  },
  business: {
    topPlayers: ['@noahkagan', '@aliabdaal', '@codiesanchez'],
    contentPillars: ['lessons', 'case-studies', 'tools', 'frameworks'],
    trends2026: ['solopreneurship', 'AI productivity', 'side hustles', 'remote work'],
    avgPostFreq: { ig: '4-5/sem', tt: '7/sem' },
    monetization: ['cursos', 'consulting', 'newsletter', 'software', 'comunidad'],
  },
};

export const analyzeNiche = (niche) => {
  const normalized = (niche || '').toLowerCase().trim();
  const matchedKey =
    Object.keys(NICHE_PATTERNS).find((k) => normalized.includes(k) || k.includes(normalized.split(/\s/)[0])) ||
    'business';
  const data = NICHE_PATTERNS[matchedKey];
  return {
    niche: niche || 'general',
    matchedAs: matchedKey,
    topPlayers: data.topPlayers,
    contentPillars: data.contentPillars,
    trends2026: data.trends2026,
    avgPostFrequency: data.avgPostFreq,
    monetizationModels: data.monetization,
    recommendedFocus: data.contentPillars[0],
    confidence: matchedKey === 'business' && !normalized.includes('business') ? 0.5 : 0.85,
  };
};

/* ════════════════════ AUDIENCE ANALYZER ════════════════════ */

const PSYCHOGRAPHIC_SEGMENTS = {
  'aspiring-creator': {
    painPoints: ['no sé qué postear', 'crezco lento', 'no tengo tiempo', 'no veo resultados'],
    dreamOutcomes: ['1K followers', 'monetizar', 'sentirme creator real', 'libertad de horario'],
    triggers: ['transformation stories', 'tactics específicas', 'before/after', 'datos concretos'],
    objections: ['no soy bueno con cámara', 'mi nicho no funciona', 'es muy tarde para empezar'],
    contentThatConverts: ['tutoriales paso a paso', 'mis errores y aprendizajes', 'plantillas gratis'],
  },
  'small-business-owner': {
    painPoints: ['no llegan leads', 'cliente quiere precio bajo', 'no me destaco', 'ads caros'],
    dreamOutcomes: ['más clientes', 'precios más altos', 'autoridad nicho', 'tiempo libre'],
    triggers: ['ROI claro', 'case-studies con números', 'systemas', 'time-saved'],
    objections: ['no tengo tiempo', 'IA no es para mi negocio', 'ya probé y no funcionó'],
    contentThatConverts: ['behind-the-scenes negocio real', 'transparencia números', 'frameworks'],
  },
  'agency-owner': {
    painPoints: ['operación caótica', 'márgenes bajos', 'cliente difícil', 'escalar duele'],
    dreamOutcomes: ['agencia que corre solo', 'márgenes 50%+', 'clientes premium', 'venta exit'],
    triggers: ['systems', 'tooling', 'positioning', 'pricing strategy'],
    objections: ['nada nuevo me sirve', 'mi nicho es diferente'],
    contentThatConverts: ['operational frameworks', 'pricing teardowns', 'client horror stories'],
  },
  'employee-aspiring-side-hustle': {
    painPoints: ['trabajo aburrido', 'sueldo bajo', 'sin tiempo', 'no sé por dónde empezar'],
    dreamOutcomes: ['ingreso extra', 'renunciar al 9-5', 'independencia', 'pasión + dinero'],
    triggers: ['proof of concept rápido', 'side income visible', 'storytelling personal'],
    objections: ['no tengo skills', 'soy malo vendiendo', 'no tengo plata para empezar'],
    contentThatConverts: ['$0 to $X stories', 'side hustle ideas rápidas', 'tools gratis'],
  },
};

export const analyzeAudience = ({ niche, targetSegment, ageRange, geo }) => {
  const segment =
    targetSegment && PSYCHOGRAPHIC_SEGMENTS[targetSegment]
      ? PSYCHOGRAPHIC_SEGMENTS[targetSegment]
      : PSYCHOGRAPHIC_SEGMENTS['aspiring-creator'];
  return {
    targetSegment: targetSegment || 'aspiring-creator',
    niche: niche || 'general',
    ageRange: ageRange || '22-35',
    geo: geo || 'LATAM',
    painPoints: segment.painPoints,
    dreamOutcomes: segment.dreamOutcomes,
    emotionalTriggers: segment.triggers,
    commonObjections: segment.objections,
    contentThatConverts: segment.contentThatConverts,
    recommendedAngle: `Empezá cada post con un pain point (${segment.painPoints[0]}) y terminá con un dream outcome (${segment.dreamOutcomes[0]}).`,
  };
};

/* ════════════════════ PERFORMANCE ANALYZER ════════════════════ */

export const analyzePerformance = (posts = []) => {
  if (posts.length === 0) {
    return {
      hasData: false,
      message: 'Sin posts para analizar. Conectá tu IG/TT primero.',
      winningPatterns: [],
      discardPatterns: [],
    };
  }
  const sorted = [...posts].sort((a, b) => (b.engagementRate || 0) - (a.engagementRate || 0));
  const top20pct = sorted.slice(0, Math.max(1, Math.ceil(posts.length * 0.2)));
  const bottom20pct = sorted.slice(-Math.max(1, Math.ceil(posts.length * 0.2)));

  const winning = {
    formats: [...new Set(top20pct.map((p) => p.format))],
    avgLength: Math.round(top20pct.reduce((s, p) => s + (p.length || 0), 0) / top20pct.length),
    avgHashtags: Math.round(top20pct.reduce((s, p) => s + (p.hashtagCount || 0), 0) / top20pct.length),
    avgEngagement:
      Math.round((top20pct.reduce((s, p) => s + (p.engagementRate || 0), 0) / top20pct.length) * 1000) / 1000,
    commonHookPatterns: [],
    topPostingHours: [...new Set(top20pct.map((p) => p.postedHour))].slice(0, 3),
  };
  const losing = {
    formats: [...new Set(bottom20pct.map((p) => p.format))],
    avgLength: Math.round(bottom20pct.reduce((s, p) => s + (p.length || 0), 0) / bottom20pct.length),
    commonProblems: ['Sin hook fuerte', 'Hashtags genéricos', 'Sin CTA claro', 'Horario subóptimo'],
  };

  return {
    hasData: true,
    totalAnalyzed: posts.length,
    topPostsCount: top20pct.length,
    bottomPostsCount: bottom20pct.length,
    winningPatterns: winning,
    discardPatterns: losing,
    recommendations: [
      `Duplicá formato ganador: ${winning.formats.join(', ')}`,
      `Cambiá horario a: ${winning.topPostingHours.join(', ') || '18:00-21:00'}`,
      `Mantené hashtag count en ~${winning.avgHashtags || 12}`,
      `Hook formula: 6-10 palabras, número específico, promesa concreta`,
    ],
  };
};

/* ════════════════════ FOCUS RECOMMENDER ════════════════════ */

export const recommendFocus = ({ niche, audience, performance, currentGoal }) => {
  const nicheData = typeof niche === 'string' ? analyzeNiche(niche) : niche;
  const focusItems = [];

  if (currentGoal === 'growth' || !currentGoal) {
    focusItems.push({
      priority: 'high',
      action: 'Reels diarios con hooks 0-2s pattern interrupt',
      rationale: 'Reels = #1 distribution mechanism IG/TT',
      timeInvestment: '30-60 min/día',
    });
  }
  if (currentGoal === 'conversion' || currentGoal === 'sales') {
    focusItems.push({
      priority: 'high',
      action: 'DM funnel + lead magnet en bio',
      rationale: 'Convertir reach en leads cualificados',
      timeInvestment: '2hs setup + 15min/día gestión',
    });
  }
  focusItems.push({
    priority: 'medium',
    action: `Pilar único: ${nicheData.recommendedFocus}`,
    rationale: 'Consistency > variedad para audiencia nueva',
    timeInvestment: 'planning 1h/semana',
  });
  focusItems.push({
    priority: 'medium',
    action: 'Stories diarias con polls/quiz/questions',
    rationale: 'Algoritmo premia interacción + warming audiencia',
    timeInvestment: '5-10 min/día',
  });
  if (performance?.winningPatterns?.commonHookPatterns?.length > 0) {
    focusItems.push({
      priority: 'high',
      action: `Replicar hook pattern ganador: ${performance.winningPatterns.commonHookPatterns[0]}`,
      rationale: 'Data interna > theory',
      timeInvestment: 'iteración por post',
    });
  }
  return {
    focusForNext30Days: focusItems,
    discardItems: ['Posts genéricos sin hook', 'Carruseles >10 slides', 'Horarios random', 'Hashtags mega solos'],
    expectedOutcome: 'Si seguís este focus 30 días → +30-50% reach, +1-3K followers nicho-fit',
  };
};

/* ════════════════════ SMART CALENDAR ════════════════════ */

const CALENDAR_TEMPLATES = {
  daily: {
    instagram: ['1 story con sticker (mañana)', '1 reel (tarde) — siguiendo trending sound'],
    tiktok: ['2 videos por día — 1 educativo + 1 entertainment'],
  },
  weekly: {
    instagram: [
      { day: 'Lun', type: 'reel', focus: 'tactic-tutorial' },
      { day: 'Mar', type: 'carousel', focus: 'framework-deep-dive' },
      { day: 'Mié', type: 'reel', focus: 'pattern-interrupt-meme' },
      { day: 'Jue', type: 'carousel', focus: 'case-study-numbers' },
      { day: 'Vie', type: 'reel', focus: 'behind-scenes' },
      { day: 'Sáb', type: 'story-only', focus: 'engagement-poll' },
      { day: 'Dom', type: 'carousel', focus: 'weekly-recap' },
    ],
    tiktok: [
      { day: 'Lun', type: 'video', focus: 'hook-controversia' },
      { day: 'Mar', type: 'video', focus: 'tutorial' },
      { day: 'Mié', type: 'video', focus: 'pov-storytelling' },
      { day: 'Jue', type: 'video', focus: 'react-to-trend' },
      { day: 'Vie', type: 'photo-mode', focus: 'list-format' },
      { day: 'Sáb', type: 'video', focus: 'behind-scenes' },
      { day: 'Dom', type: 'video', focus: 'transformation-story' },
    ],
  },
  monthly: {
    instagram: [
      { week: 1, theme: 'Foundation — quien soy + para quien' },
      { week: 2, theme: 'Authority — case-studies + frameworks' },
      { week: 3, theme: 'Community — engagement + UGC' },
      { week: 4, theme: 'Conversion — soft sell + CTA fuerte' },
    ],
    tiktok: [
      { week: 1, theme: 'Hooks variados a/b testing' },
      { week: 2, theme: 'Trending sounds en tu nicho' },
      { week: 3, theme: 'Series — Parte 1, 2, 3...' },
      { week: 4, theme: 'Promotional + product-led' },
    ],
  },
};

export const buildSmartCalendar = ({
  niche,
  audience,
  performance,
  platform = 'instagram',
  period = 'weekly',
  goal = 'growth',
}) => {
  const template = CALENDAR_TEMPLATES[period] || CALENDAR_TEMPLATES.weekly;
  const platformPlan = template[platform] || template.instagram;
  const nicheData = typeof niche === 'string' ? analyzeNiche(niche) : niche;

  // Inyectar pilar + topic hint por slot
  const enriched = Array.isArray(platformPlan)
    ? platformPlan.map((slot) => ({
        ...slot,
        pillar: nicheData.contentPillars[Math.floor(Math.random() * nicheData.contentPillars.length)],
        topicHint: `${slot.focus} aplicado a ${nicheData.niche}`,
        idealClientAttractionLevel: goal === 'conversion' ? 'high' : 'medium',
      }))
    : platformPlan;

  return {
    platform,
    period,
    goal,
    niche: nicheData.niche,
    plan: enriched,
    cadenceSummary: `${platform === 'tiktok' ? 7 : 5} posts/sem (alineado con nicho ${nicheData.niche})`,
    contentTypeMix: { reels: '50%', carousel: '25%', story: '20%', other: '5%' },
    idealClientFunnel: {
      attract: 'Hooks con curiosity + controversia',
      engage: 'Stories interactivas + comments warming',
      convert: 'DM bridge + lead magnet en bio',
    },
  };
};

/* ════════════════════ HOOK GENERATOR ════════════════════ */

const HOOK_TEMPLATES = {
  curiosity: [
    'Nadie te dice esto sobre {topic}',
    'Lo que descubrí cambiando {topic}',
    '{topic} oculto: la verdad',
    'Por qué {topic} no funciona',
    'El secreto detrás de {topic}',
    '{topic}: lo que nadie cuenta',
  ],
  controversy: [
    '{topic} es una mentira',
    'Dejá de hacer {topic} ya',
    '{topic} está sobrevalorado',
    'Te mintieron sobre {topic}',
    'Estás haciendo {topic} mal',
    '{topic} no sirve para nada',
  ],
  impact: [
    '{topic} en 30 segundos',
    'Cambié {topic} en 7 días',
    '$0 a $X con {topic}',
    'Un cambio en {topic} = todo',
    'Sin {topic}, sin resultados',
    '{topic}: el ROI brutal',
  ],
};

export const generateHooks = ({ topic, audience, count = 6 }) => {
  const t = topic || 'tu tema';
  const hooks = [];
  ['curiosity', 'controversy', 'impact'].forEach((type) => {
    const templates = HOOK_TEMPLATES[type];
    templates.slice(0, Math.ceil(count / 3)).forEach((tpl) => {
      const text = tpl.replace(/\{topic\}/g, t);
      const wordCount = text.split(/\s+/).length;
      hooks.push({
        text,
        type,
        wordCount,
        valid: wordCount <= 10,
        strength: type === 'controversy' ? 0.86 : type === 'curiosity' ? 0.78 : 0.83,
        nextStep: 'sigue con storytelling emocional + frase corta + CTA',
      });
    });
  });
  return hooks.sort((a, b) => b.strength - a.strength).slice(0, count);
};

/* ════════════════════ STORYTELLING ARCHITECT ════════════════════ */

export const buildStorytelling = ({ hook, topic, audience, goal }) => {
  return {
    structure: [
      { beat: 'Hook', sec: '0-2', text: hook || `Sobre ${topic}`, notes: '<10 palabras, atrapar' },
      {
        beat: 'Pain',
        sec: '2-5',
        text: `¿Te pasa que ${audience?.painPoints?.[0] || 'no ves resultados'}?`,
        notes: 'frase corta + emocional',
      },
      {
        beat: 'Promise',
        sec: '5-8',
        text: `Hay una forma de ${audience?.dreamOutcomes?.[0] || 'lograrlo'}`,
        notes: 'aspiración + concreta',
      },
      {
        beat: 'Story',
        sec: '8-18',
        text: `Cuando yo empecé con ${topic}, también me costaba. Hasta que descubrí esto:`,
        notes: 'storytelling personal + relatable',
      },
      { beat: 'Solution', sec: '18-25', text: '3 pasos concretos:', notes: 'lenguaje simple, números, framework' },
      {
        beat: 'CTA',
        sec: '25-30',
        text:
          goal === 'sales'
            ? 'Comentá "INFO" y te paso el sistema'
            : 'Guardá esto + compartí con alguien que lo necesite',
        notes: 'comando + razón + urgencia',
      },
    ],
    languageRules: [
      'Frases <10 palabras',
      'Voz activa siempre',
      'Vos > usted',
      'Verbos de acción primero',
      'Sin jerga técnica innecesaria',
    ],
    emotionalArc: 'pain → curiosity → promise → relatability → revelation → urgency',
  };
};

/* ════════════════════ VIRAL IDEAS GENERATOR ════════════════════ */

const VIRAL_FORMATS_BY_NICHE = {
  'marketing-digital': [
    { idea: 'Pantalla → Dashboard real con números', format: 'reel', creationMin: 15, shareability: 0.85 },
    { idea: 'Antes/Después con timeline', format: 'reel', creationMin: 20, shareability: 0.88 },
    { idea: 'Lista 5 errores con texto overlay', format: 'reel', creationMin: 15, shareability: 0.82 },
    { idea: '$0 a $X timeline visual', format: 'carousel', creationMin: 25, shareability: 0.9 },
    { idea: 'POV: cliente difícil', format: 'reel-pov', creationMin: 10, shareability: 0.87 },
  ],
  fitness: [
    { idea: 'Workout de 30s todo el body', format: 'reel', creationMin: 15, shareability: 0.85 },
    { idea: 'Transformación weekly photo grid', format: 'carousel', creationMin: 20, shareability: 0.9 },
    { idea: 'Comida prep en 60 segundos', format: 'reel', creationMin: 25, shareability: 0.82 },
  ],
  general: [
    { idea: 'Top 3 herramientas que uso', format: 'reel', creationMin: 15, shareability: 0.78 },
    { idea: 'Day in the life acelerado', format: 'reel', creationMin: 20, shareability: 0.8 },
    { idea: 'Listicle estilo "5 cosas que..."', format: 'carousel', creationMin: 25, shareability: 0.85 },
    { idea: 'POV / behind-the-scenes', format: 'reel-pov', creationMin: 10, shareability: 0.83 },
    { idea: 'Reaction a trending topic nicho', format: 'reel-react', creationMin: 12, shareability: 0.88 },
  ],
};

export const generateViralIdeas = ({ niche, count = 5 }) => {
  const nicheData = analyzeNiche(niche);
  const pool = VIRAL_FORMATS_BY_NICHE[nicheData.matchedAs] || VIRAL_FORMATS_BY_NICHE.general;
  return {
    niche: nicheData.niche,
    ideas: pool.slice(0, count).map((p, i) => ({
      ...p,
      n: i + 1,
      hooks: generateHooks({ topic: nicheData.niche, count: 3 }),
      expectedShares: Math.round((p.shareability || 0.7) * 1000),
      maxCreationMinutes: p.creationMin,
      visualStyle: 'modern minimal + bright + text-overlay-bold',
    })),
    trends2026: nicheData.trends2026,
  };
};

/* ════════════════════ VIRAL ANALYZER (IG/TT por nicho) ════════════════════ */

export const analyzeViralPatterns = ({ niche, platform }) => {
  const nicheData = analyzeNiche(niche);
  return {
    niche: nicheData.niche,
    platform,
    viralFormulas: {
      hook: '6-8 palabras + número + curiosity gap',
      structure: 'Hook → Pain → Promise → Proof → CTA',
      pacing: platform === 'tiktok' ? 'Pattern interrupt cada 1.5-3s' : 'Slide reveal cada 3-5s',
      audio: platform === 'tiktok' ? 'Sound trending 24-72h vida' : 'Trending audio biblioteca IG',
    },
    topPlayersBenchmark: nicheData.topPlayers,
    viralKeywords: ['secreto', 'verdad', 'nadie te dice', 'mi error fue', 'cambié X y'],
    avoidPatterns: ['intro larga >3s', 'lenguaje técnico sin contexto', 'CTA débil al final'],
    bestPostingWindows: platform === 'tiktok' ? ['9-10am', '7-10pm'] : ['11am-1pm', '6-9pm'],
  };
};

/* ════════════════════ BRAND IDENTITY GENERATOR ════════════════════ */

export const generateBrandIdentity = async ({ brief, planId, userId }) => {
  const prompt = `Brief: ${brief || 'crea identidad para creador marketing IA LATAM'}

Generá JSON con identidad de marca:
{
  "brandName": "...",
  "tagline": "frase 5-8 palabras",
  "missionStatement": "1 párrafo claro",
  "values": ["valor1", "valor2", "valor3"],
  "voice": { "tone": "...", "personality": "...", "doSay": [...], "dontSay": [...] },
  "visualIdentity": {
    "colorPalette": [{"name":"...","hex":"#..."}],
    "fontPairing": {"headline":"...","body":"..."},
    "designStyle": "minimalista / editorial / brutalist / ..."
  },
  "archetype": "Hero / Magician / Rebel / Sage / etc",
  "audience": "1 párrafo describiendo cliente ideal",
  "differentiators": ["dif1", "dif2", "dif3"]
}`;
  const result = await routeLlm({
    userId,
    planId: planId || 'free',
    system: 'Sos brand strategist senior. Devolvés JSON válido sin markdown.',
    prompt,
    maxTokens: 1800,
  });
  try {
    return {
      ...JSON.parse((result.text || '').replace(/```json\s*|\s*```/g, '').trim()),
      llmMeta: { provider: result.provider, model: result.model },
    };
  } catch {
    return {
      brandName: 'Tu Marca',
      tagline: 'Frase emblema en 5-8 palabras',
      missionStatement: 'Misión generada con LLM fallback.',
      values: ['autenticidad', 'resultados', 'consistencia'],
      voice: {
        tone: 'cercano',
        personality: 'experto pero accesible',
        doSay: ['concreto', 'real'],
        dontSay: ['vago', 'corporativo'],
      },
      visualIdentity: {
        colorPalette: [
          { name: 'Primary', hex: '#E1306C' },
          { name: 'Accent', hex: '#A855F7' },
        ],
        fontPairing: { headline: 'Inter Bold', body: 'Inter Regular' },
        designStyle: 'minimalista moderno',
      },
      archetype: 'Hero',
      audience: 'Creadores y emprendedores 22-35 LATAM que quieren resultados reales sin agencia.',
      differentiators: ['IA + estrategia', 'resultados medibles', 'lenguaje claro'],
      llmMeta: { fallback: true },
    };
  }
};

/* ════════════════════ BRIEF → CAMPAIGN ════════════════════ */

export const briefToCampaign = async ({ brief, planId, userId, durationDays = 30 }) => {
  const nicheGuess =
    (brief || '').toLowerCase().match(/marketing|fitness|food|tech|finance|beauty|business/)?.[0] || 'business';
  const nicheData = analyzeNiche(nicheGuess);
  const audience = analyzeAudience({ niche: nicheGuess, targetSegment: 'aspiring-creator' });
  const calendar = buildSmartCalendar({
    niche: nicheGuess,
    platform: 'instagram',
    period: 'weekly',
    goal: 'conversion',
  });
  const viralIdeas = generateViralIdeas({ niche: nicheGuess, count: 5 });
  const hooks = generateHooks({ topic: nicheGuess, count: 10 });

  return {
    brief,
    durationDays,
    niche: nicheData,
    audience,
    calendar,
    viralIdeasContent: viralIdeas,
    hookBank: hooks,
    funnelDesign: {
      attract: 'Reels con hooks curiosity (top10 hooks generados)',
      engage: 'Stories con polls + carruseles educativos',
      convert: 'DM funnel + lead magnet "checklist gratis" en bio',
      retain: 'Newsletter semanal + comunidad cerrada',
    },
    kpis: ['Reach diario', 'Engagement rate', 'DMs/día', 'Leads cualificados', 'Conversiones'],
    estimatedResults30Days: {
      reach: '+50K-200K',
      followers: '+1K-3K',
      leads: '50-300',
      conversions: '5-30 según oferta',
    },
  };
};

/* ════════════════════ MANYCHAT INTEGRATION ════════════════════ */

const MANYCHAT_API_BASE = 'https://api.manychat.com/fb';

export const setupManyChatLeadFilter = async ({ userId, manyChatApiKey, businessType, qualifyingCriteria }) => {
  if (!manyChatApiKey) return { ok: false, error: 'manyChatApiKey requerido' };
  await store.set(`feedia:user:${userId}:manychat`, {
    apiKey: manyChatApiKey,
    businessType,
    qualifyingCriteria: qualifyingCriteria || ['presupuesto', 'urgencia', 'fit-nicho'],
    setupAt: new Date().toISOString(),
  });
  return {
    ok: true,
    flowTemplate: {
      step1: { trigger: 'usuario escribe palabra clave en DM IG', action: 'pregunta cualificación 1' },
      step2: { trigger: 'respuesta 1', action: 'pregunta 2: presupuesto rango' },
      step3: { trigger: 'respuesta 2', action: 'pregunta 3: urgencia + uso' },
      step4: {
        trigger: 'respuestas completas',
        action: 'classify-lead: qualified | low-priority | not-fit',
        rules: [
          { condition: 'presupuesto < $X', action: 'mensaje educativo + recursos gratis (descarte amable)' },
          { condition: 'urgencia = baja', action: 'agregar a nurture sequence email' },
          { condition: 'qualified', action: 'agendar llamada calendario + alert humano' },
        ],
      },
    },
    estimatedTimeSaved: '8-15hs/semana de cualificación manual',
  };
};

export const sendManyChatMessage = async ({ userId, subscriberId, message }) => {
  const cfg = await store.get(`feedia:user:${userId}:manychat`);
  if (!cfg?.apiKey) return { ok: false, error: 'ManyChat no configurado' };
  try {
    const r = await fetch(`${MANYCHAT_API_BASE}/sending/sendContent`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriber_id: subscriberId, data: { messages: [{ type: 'text', text: message }] } }),
    });
    return { ok: r.ok, status: r.status };
  } catch (err) {
    return { ok: false, error: String(err.message || err) };
  }
};

/* ════════════════════ HANDLER ════════════════════ */

export const handleGrowthIntelligence = async (req, res, path, m, body) => {
  const json = (code, b) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(b));
  };
  const url = new URL(req.url || '/', 'http://x');

  if (path === '/api/intel/niche' && m === 'GET') {
    return (json(200, analyzeNiche(url.searchParams.get('niche') || 'general')), true);
  }
  if (path === '/api/intel/audience' && m === 'POST') {
    return (json(200, analyzeAudience(body || {})), true);
  }
  if (path === '/api/intel/performance' && m === 'POST') {
    return (json(200, analyzePerformance((body || {}).posts || [])), true);
  }
  if (path === '/api/intel/focus' && m === 'POST') {
    return (json(200, recommendFocus(body || {})), true);
  }
  if (path === '/api/intel/calendar' && m === 'POST') {
    return (json(200, buildSmartCalendar(body || {})), true);
  }
  if (path === '/api/intel/hooks' && m === 'POST') {
    return (json(200, generateHooks(body || {})), true);
  }
  if (path === '/api/intel/storytelling' && m === 'POST') {
    return (json(200, buildStorytelling(body || {})), true);
  }
  if (path === '/api/intel/viral-ideas' && m === 'POST') {
    return (json(200, generateViralIdeas(body || {})), true);
  }
  if (path === '/api/intel/viral-analysis' && m === 'POST') {
    return (json(200, analyzeViralPatterns(body || {})), true);
  }
  if (path === '/api/intel/brand-identity' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    const result = await generateBrandIdentity({
      brief: (body || {}).brief,
      planId: ctx?.user?.plan || 'free',
      userId: ctx?.user?.id,
    });
    return (json(200, result), true);
  }
  if (path === '/api/intel/brief-to-campaign' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    const result = await briefToCampaign({
      brief: (body || {}).brief,
      planId: ctx?.user?.plan || 'free',
      userId: ctx?.user?.id,
      durationDays: (body || {}).durationDays || 30,
    });
    return (json(200, result), true);
  }
  if (path === '/api/intel/manychat/setup' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const result = await setupManyChatLeadFilter({ userId: ctx.user.id, ...(body || {}) });
    return (json(result.ok ? 200 : 400, result), true);
  }
  if (path === '/api/intel/manychat/send' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return (json(401, { error: 'no session' }), true);
    const result = await sendManyChatMessage({ userId: ctx.user.id, ...(body || {}) });
    return (json(result.ok ? 200 : 500, result), true);
  }

  return false;
};
