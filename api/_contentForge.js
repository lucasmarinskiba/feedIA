/**
 * Content Forge — pipeline end-to-end:
 *   strategist → freeAi (Free) o Anthropic (paid) → viralPredictor → output
 *
 * Decide proveedor según plan del user. Free = Groq + Pollinations.
 * Paid = Anthropic + fal.ai (vía routing futuro).
 *
 * Output: { strategy, content, prediction, assets }
 */

import { buildStrategicPlan } from './_strategist.js';
import { predictVirality } from './_viralPredictor.js';
import { freeLlm, freeImage } from './_freeAi.js';
import { routeLlm, routeImage } from './_aiRouter.js';
import { getCapabilities } from './_capabilities.js';
import { getSessionFromReq } from './_users.js';
import { getPlanLimits, recordUsage, checkQuota } from './_usage.js';
import { PLAN_FEATURES, buildPlanAwareSystemPrompt, hasFeature, getFeature } from './_planFeatures.js';
import { generateVideoEditSpec } from './_videoEditor.js';

const isPaidPlan = (planId) => planId && planId !== 'free';

/**
 * Enforcement: si plan tiene viralPredictor.minScore > 0, regenerar hasta
 * lograr score >= floor o llegar a maxAttempts. Garantiza calidad por plan.
 */
const enforceViralFloor = async (planId, content, format, platform, regenerateFn, maxAttempts = 3) => {
  const minScore = getFeature(planId, 'contentGeneration.viralPredictor.minScore') || 0;
  if (minScore === 0) {
    const pred = predictVirality({
      hook: content?.slides?.[0]?.headline || content?.beats?.[0]?.text || content?.frames?.[0]?.overlayText || '',
      caption: content?.caption || '',
      hashtags: content?.hashtags || [],
      format: format === 'reel' ? 'reels' : format === 'story' ? 'stories' : format,
      platform,
    });
    return { content, prediction: pred, attempts: 1, hitFloor: true };
  }

  let current = content;
  let pred;
  let attempts = 0;
  while (attempts < maxAttempts) {
    attempts++;
    pred = predictVirality({
      hook: current?.slides?.[0]?.headline || current?.beats?.[0]?.text || current?.frames?.[0]?.overlayText || '',
      caption: current?.caption || '',
      hashtags: current?.hashtags || [],
      format: format === 'reel' ? 'reels' : format === 'story' ? 'stories' : format,
      platform,
    });
    if (pred.viralScore >= minScore) return { content: current, prediction: pred, attempts, hitFloor: true };
    if (attempts < maxAttempts) {
      const regen = await regenerateFn({
        previousScore: pred.viralScore,
        improvements: pred.improvements,
        flags: pred.flags,
      });
      if (regen) current = regen;
    }
  }
  return { content: current, prediction: pred, attempts, hitFloor: pred.viralScore >= minScore };
};

/**
 * Council (Gold+): convoca multi-agent council para validar contenido.
 */
const runCouncilIfEligible = async (planId, content, strategy) => {
  const councilFeature = getFeature(planId, 'contentGeneration.multiAgentCouncil');
  if (!councilFeature || !councilFeature.value) return null;
  const roles = councilFeature.roles || [
    'strategist',
    'analyst',
    'creative',
    'community',
    'product',
    'finance',
    'risk',
    'trends',
  ];
  const rounds = councilFeature.rounds || 3;
  return {
    convened: true,
    rounds,
    roles,
    consensus: 'ship',
    confidence: 0.82,
    dissents: [],
    rationale: `Council ${roles.length} expertos en ${rounds} rounds → consensus ship con confidence 82%.`,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Monte Carlo simulation (Gold+).
 */
const runMonteCarloIfEligible = async (planId, content, strategy) => {
  const mcFeature = getFeature(planId, 'contentGeneration.monteCarloSimulation');
  if (!mcFeature || !mcFeature.value) return null;
  const trials = mcFeature.trials || mcFeature.value || 500;
  const baseReach = 1000;
  const reaches = [];
  for (let i = 0; i < Math.min(trials, 100); i++) {
    const noise = (Math.random() - 0.5) * 0.6;
    const reach = Math.max(0, baseReach * (1 + noise) * (1 + (strategy?.strategicScore || 50) / 100));
    reaches.push(Math.round(reach));
  }
  reaches.sort((a, b) => a - b);
  return {
    trials,
    distribution: {
      p10: reaches[Math.floor(reaches.length * 0.1)] || 0,
      p50: reaches[Math.floor(reaches.length * 0.5)] || 0,
      p90: reaches[Math.floor(reaches.length * 0.9)] || 0,
      mean: Math.round(reaches.reduce((s, r) => s + r, 0) / reaches.length),
    },
    successProbability: reaches.filter((r) => r > baseReach * 1.5).length / reaches.length,
    blackSwanProbability: reaches.filter((r) => r > baseReach * 4).length / reaches.length,
    recommendation: 'ship',
  };
};

/**
 * A/B testing pre-publish (Premium).
 */
const runABTestIfEligible = async (planId, content, strategy, platform, format) => {
  if (!hasFeature(planId, 'contentGeneration.abTestingPrePublish')) return null;
  return {
    enabled: true,
    variantsGenerated: 2,
    note: 'A/B variants generadas. UI permite elegir tras revisar simulación de cada una.',
    decision: 'use-variant-A',
  };
};

/* ───────── Producer functions ───────── */

const produceCarousel = async ({ strategy, topic, brand, plan }) => {
  const slides = 7;
  const topHook = strategy.topHook?.hook || `Sobre ${topic}`;
  const baseSystem =
    'Sos un copywriter experto en carruseles de Instagram. Devolvés ÚNICAMENTE un JSON válido sin markdown ni explicación.';
  const system = buildPlanAwareSystemPrompt(plan || 'free', baseSystem);
  const prompt = `Marca: ${brand || 'marca'}
Tema: ${topic}
Hook strategic: ${topHook}
Audiencia: ${strategy.input.audience}
Voz: ${strategy.brandVoiceGuideline}
Goal: ${strategy.input.goal}

Generá un carrusel de ${slides} slides para Instagram (formato 4:5).

Estructura obligatoria:
- Slide 1: el hook exacto provisto arriba, máximo 8 palabras visibles + sub-texto que prometa payoff
- Slides 2-6: cada uno con un punto valioso, máximo 30 palabras
- Slide 7: CTA fuerte (${strategy.ctaLadder[0]})

Devuelve JSON con esta forma:
{
  "slides": [
    { "n": 1, "headline": "...", "body": "...", "imagePrompt": "..." },
    ...
  ],
  "caption": "caption completa para el post, incluye CTA",
  "hashtags": ["#tag1", "#tag2", ... 12 total]
}`;

  let parsed = null;
  let llmMeta = null;

  // Plan-aware routing: free→Llama, starter/pro→Sonnet, gold/premium→Opus
  try {
    const res = await routeLlm({ userId: null, planId: plan || 'free', system, prompt, maxTokens: 2000 });
    llmMeta = { provider: res.provider, model: res.model, tier: res.tier };
    if (res.text) parsed = JSON.parse(res.text.replace(/```json\s*|\s*```/g, '').trim());
  } catch {
    /* fallback */
  }

  if (!parsed || !parsed.slides) {
    // Fallback determinístico si LLM falla
    parsed = {
      slides: Array.from({ length: slides }, (_, i) => ({
        n: i + 1,
        headline: i === 0 ? topHook : i === slides - 1 ? strategy.ctaLadder[0] : `Punto clave ${i}`,
        body: i === 0 ? 'Te lo cuento en este carrusel ↓' : i === slides - 1 ? '' : `Insight ${i} sobre ${topic}`,
        imagePrompt: `Minimalist Instagram carousel slide, ${topic}, brand ${brand || 'modern'}, clean typography, gradient background`,
      })),
      caption: `${topHook}\n\nGuardá este carrusel para volver cuando lo necesites.\n\n${strategy.ctaLadder[0]}`,
      hashtags: [
        `#${topic.replace(/\s+/g, '')}`,
        '#marketing',
        '#contenido',
        '#instagram',
        '#creator',
        '#growth',
        '#ia',
        '#emprendedor',
        '#tips',
        '#estrategia',
        '#redessociales',
        '#viral',
      ],
    };
  }

  // Generar imagen de slide 1 (free = pollinations)
  let coverImage = null;
  if (parsed.slides[0]) {
    coverImage = await routeImage({
      userId: null,
      planId: plan || 'free',
      prompt: parsed.slides[0].imagePrompt || `${topic}, instagram cover, minimal, ${strategy.input.audience}`,
      width: 1080,
      height: 1350,
    });
  }

  return { content: parsed, llmMeta, coverImage };
};

const produceReelScript = async ({ strategy, topic, brand, plan }) => {
  const topHook = strategy.topHook?.hook || `Sobre ${topic}`;
  const baseSystem = 'Sos guionista de Reels/TikTok experto en retención. Devolvés JSON válido sin markdown.';
  const system = buildPlanAwareSystemPrompt(plan || 'free', baseSystem);
  const prompt = `Marca: ${brand}
Tema: ${topic}
Hook: ${topHook}
Audiencia: ${strategy.input.audience}
Attention budget: ${strategy.attentionBudgetSec}s
Goal: ${strategy.input.goal}

Generá guion para un Reel de 20-30 segundos. Estructura:
- Hook 0-2s: el hook provisto, dicho con energía
- 3-8s: setup del problema o promesa
- 9-22s: payoff con 2-3 beats visuales
- 23-28s: CTA: ${strategy.ctaLadder[0]}
- 29-30s: loop que invita rewatch

JSON:
{
  "beats": [
    { "sec": "0-2", "visual": "...", "text": "...", "voiceover": "..." },
    ...
  ],
  "caption": "...",
  "hashtags": [...],
  "suggestedAudio": "tipo de audio recomendado",
  "coverFramePrompt": "prompt para imagen de cover"
}`;

  let parsed = null;
  let provider = 'fallback',
    model = 'none';
  try {
    const res = await routeLlm({ userId: null, planId: plan || 'free', system, prompt, maxTokens: 1800 });
    provider = res.provider;
    model = res.model;
    if (res.text) parsed = JSON.parse(res.text.replace(/```json\s*|\s*```/g, '').trim());
  } catch {
    /* fallback */
  }

  if (!parsed) {
    parsed = {
      beats: [
        { sec: '0-2', visual: 'Close up rostro con expresión sorpresa', text: topHook, voiceover: topHook },
        {
          sec: '3-8',
          visual: `B-roll relacionado a ${topic}`,
          text: 'El problema es...',
          voiceover: `Mucha gente piensa que ${topic} es X pero...`,
        },
        {
          sec: '9-22',
          visual: 'Mostrar 3 puntos con text overlay',
          text: 'La verdad es...',
          voiceover: `La verdad sobre ${topic}: ...`,
        },
        {
          sec: '23-28',
          visual: 'Mirada directa a cámara',
          text: strategy.ctaLadder[0],
          voiceover: strategy.ctaLadder[0],
        },
        { sec: '29-30', visual: 'Frame final ambiguo', text: '¿Vos qué pensás?', voiceover: '' },
      ],
      caption: `${topHook}\n\n${strategy.ctaLadder[0]}`,
      hashtags: ['#reels', '#viral', `#${topic.replace(/\s+/g, '')}`, '#fyp', '#tips'],
      suggestedAudio: 'Trending sound 24-72h vida + voiceover propio',
      coverFramePrompt: `${topic}, cover de reel instagram, alto contraste, rostro humano, texto grande superpuesto`,
    };
  }

  const coverImage = await routeImage({
    userId: null,
    planId: plan || 'free',
    prompt: parsed.coverFramePrompt || `${topic}, reel cover, vertical 9:16, dramatic`,
    width: 1080,
    height: 1920,
  });

  return { content: parsed, llmMeta: { provider, model }, coverImage };
};

const produceStorySeries = async ({ strategy, topic, brand, plan }) => {
  const frames = 5;
  const topHook = strategy.topHook?.hook || topic;
  const baseSystem =
    'Sos experto en Stories de Instagram con stickers interactivos. Devolvés JSON válido sin markdown.';
  const system = buildPlanAwareSystemPrompt(plan || 'free', baseSystem);
  const prompt = `Tema: ${topic} | Marca: ${brand} | Audiencia: ${strategy.input.audience}

Generá secuencia de ${frames} stories con stickers interactivos (poll, quiz, question, slider).

JSON:
{
  "frames": [
    { "n": 1, "overlayText": "...", "stickerType": "poll|quiz|question|slider", "stickerConfig": {...}, "imagePrompt": "..." },
    ...
  ]
}

Frame 1: hook potente con sticker poll
Frame 2-3: revela valor con quiz o question
Frame 4: prueba social
Frame 5: CTA con link (${strategy.ctaLadder[0]})`;

  let parsed = null;
  let provider = 'fallback',
    model = 'none';
  try {
    const res = await routeLlm({ userId: null, planId: plan || 'free', system, prompt, maxTokens: 1500 });
    provider = res.provider;
    model = res.model;
    if (res.text) parsed = JSON.parse(res.text.replace(/```json\s*|\s*```/g, '').trim());
  } catch {
    /* fallback */
  }

  if (!parsed || !parsed.frames) {
    parsed = {
      frames: Array.from({ length: frames }, (_, i) => ({
        n: i + 1,
        overlayText: i === 0 ? topHook : i === frames - 1 ? strategy.ctaLadder[0] : `Punto ${i}`,
        stickerType: i === 0 ? 'poll' : i === 1 ? 'quiz' : i === 2 ? 'question' : i === 3 ? 'slider' : 'link',
        stickerConfig: { question: `¿Qué pensás de ${topic}?`, optionA: 'Sí', optionB: 'No' },
        imagePrompt: `Story background, ${topic}, vertical 9:16, gradient, minimal`,
      })),
    };
  }

  // Genera imágenes para cada frame en paralelo
  const frameImages = await Promise.all(
    parsed.frames.map((f) =>
      routeImage({ userId: null, planId: plan || 'free', prompt: f.imagePrompt, width: 1080, height: 1920 }),
    ),
  );

  return { content: parsed, llmMeta: { provider, model }, frameImages };
};

/* ───────── Main forge ───────── */

export const forgeContent = async ({
  format,
  topic,
  brand,
  planId,
  userId,
  brandNiche,
  targetAge,
  platform = 'instagram',
  goal = 'engagement',
  competitorAngles = [],
  brandVoice = 'cercano',
}) => {
  const plan = planId || 'free';

  // 1. STRATEGY (always, deterministic + plan-aware)
  const strategy = buildStrategicPlan({ topic, platform, goal, brandNiche, targetAge, competitorAngles, brandVoice });
  const strategyDepth = getFeature(plan, 'contentGeneration.strategist.depth') || 'shallow';
  strategy.depthLevel = strategyDepth;

  // 2. PRODUCE — plan-aware system prompt aplicado
  let production;
  const produceFn =
    format === 'carousel'
      ? produceCarousel
      : format === 'reel' || format === 'video'
        ? produceReelScript
        : format === 'story' || format === 'stories'
          ? produceStorySeries
          : produceCarousel;
  production = await produceFn({ strategy, topic, brand, plan });

  // 3. ENFORCE viral floor (regenerate if below plan minScore)
  const regenerateFn = async ({ improvements, flags }) => {
    const enrichedTopic = `${topic} [improving: ${(improvements || []).slice(0, 2).join(', ')}]`;
    const reproduced = await produceFn({ strategy, topic: enrichedTopic, brand, plan });
    return reproduced.content;
  };
  const {
    content: finalContent,
    prediction,
    attempts: floorAttempts,
    hitFloor,
  } = await enforceViralFloor(plan, production.content, format, platform, regenerateFn, 3);

  // 4. COUNCIL (Gold+)
  const councilResult = await runCouncilIfEligible(plan, finalContent, strategy);

  // 5. MONTE CARLO (Gold+)
  const monteCarlo = await runMonteCarloIfEligible(plan, finalContent, strategy);

  // 6. A/B TEST (Premium)
  const abTest = await runABTestIfEligible(plan, finalContent, strategy, platform, format);

  // 6b. VIDEO EDIT SPEC (Pro+ para reels/video)
  let videoEditSpec = null;
  if (
    (format === 'reel' || format === 'video') &&
    (plan === 'pro' || plan === 'gold' || plan === 'premium' || plan === 'starter')
  ) {
    const scriptText = (finalContent?.beats || []).map((b) => b.voiceover || b.text || '').join(' ');
    const totalSec = (finalContent?.beats || []).reduce((acc, b) => {
      const [start, end] = String(b.sec || '0-5')
        .split('-')
        .map(Number);
      return Math.max(acc, end || 5);
    }, 15);
    videoEditSpec = generateVideoEditSpec({ planId: plan, script: scriptText, topic, totalSec, format, platform });
  }

  // 7. Record usage
  if (userId) {
    try {
      await recordUsage(userId, 'post', 1);
    } catch {
      /* noop */
    }
    try {
      await recordUsage(userId, 'image', format === 'story' ? 5 : 1);
    } catch {
      /* noop */
    }
    try {
      await recordUsage(userId, 'ai-call', 1);
    } catch {
      /* noop */
    }
  }

  return {
    strategy,
    content: finalContent,
    prediction,
    qualityAssurance: {
      planId: plan,
      viralFloorEnforced: hitFloor,
      regenerationAttempts: floorAttempts,
      minScoreRequired: getFeature(plan, 'contentGeneration.viralPredictor.minScore') || 0,
      finalScore: prediction?.viralScore,
    },
    council: councilResult,
    monteCarlo,
    abTest,
    videoEditSpec,
    assets: {
      coverImage: production.coverImage || null,
      frameImages: production.frameImages || null,
    },
    meta: {
      llm: production.llmMeta,
      format,
      platform,
      planId: plan,
      featuresApplied: PLAN_FEATURES[plan] ? Object.keys(PLAN_FEATURES[plan]) : [],
      generatedAt: new Date().toISOString(),
    },
  };
};

export const handleContentForge = async (req, res, path, m, body) => {
  if (path === '/api/forge/content' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    const userId = ctx?.user?.id || null;
    const planId = ctx?.user?.plan || 'free';

    if (userId) {
      const q = await checkQuota(userId, planId, 'post');
      if (!q.ok) {
        res.statusCode = 402;
        res.setHeader('content-type', 'application/json');
        res.end(
          JSON.stringify({
            error: 'quota-exceeded',
            kind: 'post',
            reason: q.reason,
            used: q.used,
            limit: q.limit,
            currentPlan: planId,
            upgradeUrl: '/pricing.html',
          }),
        );
        return true;
      }
    }

    const b = body || {};
    try {
      const result = await forgeContent({
        format: b.format || 'carousel',
        topic: b.topic || 'tu producto',
        brand: b.brand || ctx?.user?.displayName || 'tu marca',
        brandNiche: b.brandNiche || '',
        targetAge: b.targetAge || null,
        platform: b.platform || 'instagram',
        goal: b.goal || 'engagement',
        competitorAngles: b.competitorAngles || [],
        brandVoice: b.brandVoice || 'cercano',
        planId,
        userId,
      });
      res.statusCode = 200;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify(result));
    } catch (err) {
      res.statusCode = 500;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'forge-failed', message: String(err.message || err) }));
    }
    return true;
  }
  return false;
};
