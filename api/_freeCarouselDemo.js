/**
 * Free Carousel Demo — Computer Use journey end-to-end para plan Free.
 *
 * Pipeline ($0 a vos):
 *   1. Strategy (heurístico, $0)
 *   2. Slides JSON (Llama 3.3 70B Groq, $0)
 *   3. Slide images (Pollinations Flux, $0)
 *   4. Caption + hashtags (Llama 3.3 70B Groq, $0)
 *   5. Viral predictor (heurístico, $0)
 *   6. CU recipe para publicar (deterministic steps, $0)
 *
 * Output: package completo + CU script con pasos visualizables en UI.
 *
 * Costo a FeedIA dev: $0 (todo proveedores free).
 * Costo user: cuenta como ~5 min CU (~17% del daily cap free de 30min).
 */

import { buildStrategicPlan } from './_strategist.js';
import { predictVirality } from './_viralPredictor.js';
import { freeLlm, freeImage } from './_freeAi.js';
import { getSessionFromReq } from './_users.js';
import { recordUsage } from './_usage.js';
import * as store from './_store.js';

const SLIDE_COUNT = 7;

const generateCarouselJson = async ({ topic, brand, strategy }) => {
  const topHook = strategy.topHook?.hook || `Sobre ${topic}`;
  const ctaText = strategy.ctaLadder?.[0] || 'Guardá para volver';
  const prompt = `Tema: ${topic}
Marca: ${brand || 'tu marca'}
Hook estratégico: ${topHook}
Audiencia: ${strategy.input?.audience || 'creators'}
Voz: ${strategy.brandVoiceGuideline || 'cercana profesional'}

Genera carrusel de ${SLIDE_COUNT} slides para Instagram 4:5. JSON ÚNICAMENTE:
{
  "slides": [
    { "n": 1, "headline": "...", "body": "...", "imagePrompt": "..." }
  ],
  "caption": "caption completa con CTA al final",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7", "#tag8", "#tag9", "#tag10", "#tag11", "#tag12"]
}

Slide 1: hook (máximo 8 palabras visibles)
Slides 2-6: 5 puntos de valor (1 por slide, máximo 30 palabras)
Slide 7: CTA — usar exactamente: "${ctaText}"`;

  const system = 'Sos copywriter experto en carruseles de Instagram. Devolvés JSON válido sin markdown ni explicación.';
  const result = await freeLlm({ prompt, system, maxTokens: 2000, temperature: 0.75 });
  try {
    const parsed = JSON.parse((result.text || '').replace(/```json\s*|\s*```/g, '').trim());
    return { ...parsed, llmMeta: { provider: result.provider, model: result.model } };
  } catch {
    // Fallback determinístico
    return {
      slides: Array.from({ length: SLIDE_COUNT }, (_, i) => ({
        n: i + 1,
        headline: i === 0 ? topHook : i === SLIDE_COUNT - 1 ? ctaText : `Punto clave ${i}`,
        body: i === 0 ? 'Te lo cuento en este carrusel ↓' : i === SLIDE_COUNT - 1 ? '' : `Insight ${i} sobre ${topic}`,
        imagePrompt: `Minimalist Instagram carousel slide, ${topic}, modern typography, gradient background`,
      })),
      caption: `${topHook}\n\nGuardá este carrusel para volver cuando lo necesites.\n\n${ctaText}`,
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
      llmMeta: { provider: result.provider, model: result.model, fallback: true },
    };
  }
};

const generateSlideImages = async (slides) => {
  const images = await Promise.all(
    slides.map((slide) =>
      freeImage({
        prompt: slide.imagePrompt || `Instagram carousel slide ${slide.n}, modern design, gradient`,
        width: 1080,
        height: 1350,
      }),
    ),
  );
  return slides.map((slide, i) => ({ ...slide, imageUrl: images[i]?.url || '', imageProvider: 'pollinations-flux' }));
};

const buildPublishRecipe = ({ topic, brand, slides, caption, hashtags }) => ({
  recipeId: 'free-publish-carousel-ig',
  label: 'Publicar carrusel en Instagram (Computer Use)',
  estimatedMinutes: 4,
  totalSteps: 11,
  steps: [
    { n: 1, label: 'Abrir Instagram.com', action: 'navigate', detail: 'instagram.com', estimatedSec: 8, icon: '🌐' },
    {
      n: 2,
      label: 'Tap botón "Nueva publicación" (+)',
      action: 'click',
      detail: 'aria-label="Nueva publicación"',
      estimatedSec: 4,
      icon: '➕',
    },
    {
      n: 3,
      label: '"Seleccionar del ordenador"',
      action: 'click',
      detail: 'button[data-modal-upload]',
      estimatedSec: 4,
      icon: '📁',
    },
    {
      n: 4,
      label: `Subir ${slides.length} imágenes generadas`,
      action: 'upload-files',
      detail: slides.map((s) => s.imageUrl),
      estimatedSec: 25,
      icon: '🖼️',
    },
    {
      n: 5,
      label: 'Verificar orden de slides',
      action: 'verify-thumbnails',
      detail: `${slides.length} thumbnails visibles`,
      estimatedSec: 5,
      icon: '✅',
    },
    {
      n: 6,
      label: 'Aplicar recorte 4:5 a todos',
      action: 'crop-all',
      detail: 'aspect-ratio 4:5',
      estimatedSec: 10,
      icon: '✂️',
    },
    {
      n: 7,
      label: 'Tap "Siguiente"',
      action: 'click-next',
      detail: 'siguiente paso editor',
      estimatedSec: 3,
      icon: '➡️',
    },
    {
      n: 8,
      label: 'Skip filtros, "Siguiente"',
      action: 'click-next',
      detail: 'siguiente paso caption',
      estimatedSec: 3,
      icon: '➡️',
    },
    {
      n: 9,
      label: 'Pegar caption + hashtags',
      action: 'type-caption',
      detail: `${caption}\n\n${hashtags.join(' ')}`,
      estimatedSec: 12,
      icon: '📝',
    },
    {
      n: 10,
      label: 'Tap "Compartir"',
      action: 'click-publish',
      detail: 'button[type="submit"]',
      estimatedSec: 8,
      icon: '📤',
    },
    {
      n: 11,
      label: 'Verificar post en perfil',
      action: 'verify-published',
      detail: 'profile-grid first-post',
      estimatedSec: 12,
      icon: '🎉',
    },
  ],
  rateLimitNotes: 'Sin rate limit en publicación normal. Esperá 24h entre 3+ posts seguidos.',
  fallbackInstructions:
    'Si tu cuenta IG no está autenticada en este navegador, FeedIA te genera el .zip con imágenes + caption listo para subir manual desde tu celular.',
});

export const runFreeCarouselDemo = async ({
  userId,
  topic,
  brand,
  platform = 'instagram',
  goal = 'engagement',
  brandNiche = '',
  brandVoice = 'cercano',
}) => {
  const startedAt = Date.now();
  const events = [];
  const emit = (label, data) => events.push({ ts: Date.now() - startedAt, label, data });

  // 1. STRATEGY
  emit('strategy:start', { topic });
  const strategy = buildStrategicPlan({ topic, platform, goal, brandNiche, brandVoice });
  emit('strategy:done', {
    strategicScore: strategy.strategicScore,
    format: strategy.recommendedFormat?.format,
    topHook: strategy.topHook,
  });

  // 2. CONTENT JSON
  emit('content:start', {});
  const content = await generateCarouselJson({ topic, brand, strategy });
  emit('content:done', { slideCount: content.slides?.length, llm: content.llmMeta });

  // 3. SLIDE IMAGES
  emit('images:start', { count: content.slides?.length });
  const slidesWithImages = await generateSlideImages(content.slides || []);
  emit('images:done', { generated: slidesWithImages.length, provider: 'pollinations-flux' });

  // 4. VIRAL PREDICTION
  emit('predict:start', {});
  const prediction = predictVirality({
    hook: slidesWithImages[0]?.headline || '',
    caption: content.caption || '',
    hashtags: content.hashtags || [],
    format: 'carousel',
    platform,
    thumbnail: { hasFace: false, hasText: true, highContrast: true, brightColors: true },
  });
  emit('predict:done', { viralScore: prediction.viralScore, virality: prediction.virality });

  // 5. PUBLISH RECIPE
  emit('recipe:start', {});
  const publishRecipe = buildPublishRecipe({
    topic,
    brand,
    slides: slidesWithImages,
    caption: content.caption,
    hashtags: content.hashtags,
  });
  emit('recipe:done', { totalSteps: publishRecipe.totalSteps, estimatedMinutes: publishRecipe.estimatedMinutes });

  // 6. RECORD USAGE
  if (userId) {
    try {
      await recordUsage(userId, 'post', 1);
    } catch {
      /* noop */
    }
    try {
      await recordUsage(userId, 'image', SLIDE_COUNT);
    } catch {
      /* noop */
    }
    try {
      await recordUsage(userId, 'ai-call', 1);
    } catch {
      /* noop */
    }
    try {
      await recordUsage(userId, 'cu-minute', 5);
    } catch {
      /* noop */
    }
  }

  emit('done', { totalDurationMs: Date.now() - startedAt });

  return {
    success: true,
    planId: 'free',
    topic,
    brand,
    strategy,
    content: {
      slides: slidesWithImages,
      caption: content.caption,
      hashtags: content.hashtags,
    },
    prediction,
    publishRecipe,
    events,
    timing: { totalMs: Date.now() - startedAt },
    costToDev: {
      llmCalls: 1,
      llmProvider: 'groq-llama-3.3-70b-free',
      images: SLIDE_COUNT,
      imageProvider: 'pollinations-flux-free',
      totalUsd: 0,
    },
  };
};

export const handleFreeCarouselDemo = async (req, res, path, m, body) => {
  const json = (code, body) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(body));
  };

  if (path === '/api/free-cu/carousel-demo' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) return json(401, { error: 'no session' });

    const planId = ctx.user.plan || 'free';
    // Free user CU cap check
    const today = new Date().toISOString().slice(0, 10);
    const cuKey = `feedia:freecu:${ctx.user.id}:${today}`;
    const cuUsed = Number((await store.get(cuKey)) || 0);
    if (cuUsed + 5 > 30) {
      return json(402, {
        error: 'cu-cap-near-reached',
        message: `Carrusel demo consume ~5 min CU. Te quedan ${30 - cuUsed} min hoy. Volvé mañana o upgrade.`,
        used: cuUsed,
        cap: 30,
        upgradeUrl: '/pricing.html',
      });
    }

    const b = body || {};
    try {
      const result = await runFreeCarouselDemo({
        userId: ctx.user.id,
        topic: b.topic || 'cómo crecer en Instagram con IA',
        brand: b.brand || ctx.user.displayName || 'tu marca',
        platform: b.platform || 'instagram',
        goal: b.goal || 'engagement',
        brandNiche: b.brandNiche || '',
        brandVoice: b.brandVoice || 'cercano',
      });
      // Bump CU minutes
      await store.set(cuKey, cuUsed + 5);
      json(200, result);
    } catch (err) {
      json(500, { error: 'demo-failed', message: String(err.message || err) });
    }
    return true;
  }

  return false;
};
