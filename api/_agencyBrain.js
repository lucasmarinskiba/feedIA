/**
 * Agency Brain — Orquestador maestro que combina todos los módulos de inteligencia.
 *
 * Reemplaza CM + agencia: genera hooks, captions, hashtags, storytelling,
 * ideas virales, análisis de nicho y audiencia, todo en paralelo.
 *
 * $0/month: mayoría heurístico. 1 llamada LLM para captions + CTAs.
 * POST /api/agency/brain/run
 */

import {
  analyzeNiche,
  analyzeAudience,
  generateViralIdeas,
  analyzeViralPatterns,
  buildStorytelling,
} from './_growthIntelligence.js';
import { generateHookSet } from './_hookLab.js';
import { askLLMJson } from './_llm.js';
import { runCopyEngine } from './_copyEngine.js';
import { runAndromeda } from './_andromeda.js';
import { getAllSpecs, getSpec } from './_canvasSpecs.js';
import { CAROUSEL_DOS, CAROUSEL_DONTS, VALIDATED_10_SLIDE_FORMAT, CAROUSEL_DIMENSIONS } from './_carouselViralRules.js';

const safe = (fn, label, fallback = null) =>
  Promise.resolve()
    .then(fn)
    .catch((e) => {
      console.error(`[agencyBrain] ${label}:`, e?.message || e);
      return fallback;
    });

const HASHTAG_BANK = {
  'marketing-digital': {
    niche: [
      '#marketingdigital',
      '#contentmarketing',
      '#socialmediatips',
      '#crecimientoorgánico',
      '#marketinglatam',
      '#strategiadigital',
      '#contenidodigital',
      '#redessociales',
      '#marketincontenidos',
      '#creatoreconomy',
    ],
    broad: ['#marketing', '#emprendimiento', '#negociosdigitales', '#agencia', '#instagram'],
    mega: ['#negocios', '#emprender'],
  },
  fitness: {
    niche: [
      '#entrenamiento',
      '#fitnessmotivation',
      '#ganarmúsculo',
      '#rutinagym',
      '#fitnesslatam',
      '#saludybienestar',
      '#culturismo',
      '#nutriciondeportiva',
      '#bodybuilding',
      '#gymlife',
    ],
    broad: ['#fitness', '#gym', '#salud', '#ejercicio', '#deporte'],
    mega: ['#vida', '#motivacion'],
  },
  food: {
    niche: [
      '#recetasfáciles',
      '#comidareal',
      '#foodblogger',
      '#recetaslatam',
      '#cocinacasera',
      '#foodphotography',
      '#reels_food',
      '#recetasveganas',
      '#comidaargentina',
      '#chefcasero',
    ],
    broad: ['#comida', '#cocina', '#recetas', '#food', '#gastronomia'],
    mega: ['#foodie', '#yummy'],
  },
  tech: {
    niche: [
      '#techenespañol',
      '#productividad',
      '#herramientasIA',
      '#techlatam',
      '#softwarelibre',
      '#programacion',
      '#startupstips',
      '#iaparatodos',
      '#automatizacion',
      '#techtools',
    ],
    broad: ['#tecnologia', '#inteligenciaartificial', '#innovacion', '#ia', '#digital'],
    mega: ['#tech', '#AI'],
  },
  finance: {
    niche: [
      '#finanzaspersonales',
      '#inversiones',
      '#libertadfinanciera',
      '#ahorrolatam',
      '#educacionfinanciera',
      '#criptografia',
      '#bolsadevalores',
      '#finanzas101',
      '#dinerointeligente',
      '#patrimonioneto',
    ],
    broad: ['#finanzas', '#dinero', '#inversion', '#ahorro', '#economia'],
    mega: ['#libertad', '#exito'],
  },
  beauty: {
    niche: [
      '#maquillajefácil',
      '#skincareroutine',
      '#makeuptutorial',
      '#bellezalatam',
      '#cuidadopiel',
      '#makeupinspiration',
      '#tutorialesmaquillaje',
      '#skincareespañol',
      '#glam',
      '#beautylatam',
    ],
    broad: ['#maquillaje', '#belleza', '#makeup', '#skincare', '#cosmeticos'],
    mega: ['#beauty', '#glow'],
  },
  business: {
    niche: [
      '#emprendedores',
      '#negocios2026',
      '#startupspanol',
      '#escalarnegocio',
      '#marketingb2b',
      '#ventasdirectas',
      '#agenciamarketing',
      '#sistemasdenegocios',
      '#productividadlatam',
      '#ceolatam',
    ],
    broad: ['#negocios', '#emprendimiento', '#ventas', '#startup', '#liderazgo'],
    mega: ['#exito', '#empresario'],
  },
  humor: {
    niche: [
      '#humorlatino',
      '#comediaespañol',
      '#memeslatam',
      '#memesenespañol',
      '#videosgraciosos',
      '#reelscomedia',
      '#reelsgraciosos',
      '#funnyvideos',
      '#comediante',
      '#humorargentino',
    ],
    broad: ['#humor', '#comedia', '#memes', '#gracioso', '#divertido'],
    mega: ['#risa', '#viral'],
  },
  lifestyle: {
    niche: [
      '#estilodevida',
      '#lifestylelatam',
      '#bienestarpersonal',
      '#mindfulness',
      '#habitossanos',
      '#minimalismo',
      '#bienestar',
      '#saludmental',
      '#crecimientopersonal',
      '#vloggerslatam',
    ],
    broad: ['#lifestyle', '#vida', '#motivacion', '#bienestar', '#felicidad'],
    mega: ['#feliz', '#vivir'],
  },
  general: {
    niche: [
      '#contenidodigital',
      '#redessociales',
      '#creatores',
      '#hispanicreels',
      '#contenidoespañol',
      '#reelseducativos',
      '#socialmedia',
      '#virales',
      '#cuentasinteresantes',
      '#contenidoviral',
    ],
    broad: ['#instagram', '#tiktok', '#reels', '#contenido', '#creator'],
    mega: ['#viral', '#trending'],
  },
};

const getHashtags = (niche) => {
  const key = Object.keys(HASHTAG_BANK).find((k) => (niche || '').toLowerCase().includes(k)) || 'general';
  const b = HASHTAG_BANK[key];
  return {
    niche: b.niche,
    broad: b.broad,
    mega: b.mega,
    recommended: [...b.niche.slice(0, 8), ...b.broad.slice(0, 3), ...b.mega.slice(0, 2)],
    strategy: `10 nicho (10K-200K) + 3 broad (200K-2M) + 2 mega (trending). Rotar 30% cada semana.`,
  };
};

const generateCaptionsLLM = async ({ topic, platform, goal, niche, briefSnippet }) => {
  const isIg = platform !== 'tiktok';
  const goalCTA =
    {
      awareness: 'Compartí con alguien que lo necesite 💙',
      engagement: 'Comentá: ¿estás de acuerdo? 👇',
      conversion: 'Comentá "INFO" y te paso los detalles ✅',
      community: 'Contame en comentarios tu experiencia 💬',
      sales: 'Mandame "QUIERO" al DM y te cuento todo 🔥',
    }[goal] || 'Guardá esto para después 📌';

  const prompt = `Sos copywriter elite de ${isIg ? 'Instagram' : 'TikTok'} para el nicho: ${niche || 'general'}.
Tema: "${topic}". Objetivo: ${goal}.
${briefSnippet ? `Contexto de marca: ${briefSnippet.slice(0, 200)}` : ''}

Generá 3 captions LISTOS PARA PUBLICAR (sin placeholders, texto real). Tono: directo, conversacional, LATAM.

Devolvé SOLO JSON:
{
  "carousel": "caption completo para carrusel (150-220 chars + emojis + CTA: ${goalCTA}). Sin hashtags aquí.",
  "reel": "caption corto para reel (60-100 chars + emoji de impacto). Sin hashtags.",
  "story": "texto overlay para historia (máx 8 palabras, impactante) + sticker_sugerido como 'Encuesta: ¿Sí o No?'",
  "ctas": ["CTA 1 para comentarios","CTA 2 para DM","CTA 3 para guardar"],
  "dm_script": "Script inicial para responder DMs de interesados (2-3 oraciones, warm pero directo)",
  "hook_caption": "Primera oración viral del carrusel (≤10 palabras, genera curiosidad)"
}`;

  try {
    return await askLLMJson(prompt, null, 'gpt-4o-mini', 700);
  } catch {
    return {
      carousel: `¿Ya sabías esto sobre ${topic}? La mayoría lo hace mal. Seguí leyendo 👉 ${goalCTA}`,
      reel: `Lo que nadie te dice de ${topic} 🔥`,
      story: `¿LO SABÍAS? + sticker_sugerido: Encuesta ¿Sí o No?`,
      ctas: [goalCTA, `Mandame ${topic} al DM`, 'Guardá esto 📌'],
      dm_script: `Hola! Vi que te interesó el tema de ${topic}. Contame: ¿en qué punto estás ahora? Así te ayudo mejor.`,
      hook_caption: `Nadie te enseñó esto de ${topic}.`,
    };
  }
};

export const runAgencyBrain = async ({
  topic = '',
  platform = 'instagram',
  goal = 'engagement',
  niche = '',
  brandVoice = '',
  briefSnippet = '',
  accountId = '',
  scope = 'anon',
} = {}) => {
  const startedAt = Date.now();

  const [nicheData, audienceData, viralIdeas, viralPatterns, hookSet, captions, copyData, andromedaData] =
    await Promise.all([
      safe(() => analyzeNiche(niche || topic), 'analyzeNiche', {
        niche,
        trends2026: [],
        contentPillars: [],
        topPlayers: [],
        monetizationModels: [],
      }),
      safe(() => analyzeAudience({ niche: niche || topic, targetSegment: 'aspiring-creator' }), 'analyzeAudience', {
        painPoints: [],
        dreamOutcomes: [],
        emotionalTriggers: [],
        contentThatConverts: [],
      }),
      safe(() => generateViralIdeas({ niche: niche || topic, count: 5 }), 'viralIdeas', { ideas: [] }),
      safe(() => analyzeViralPatterns({ niche: niche || topic, platform }), 'viralPatterns', {}),
      safe(
        () =>
          generateHookSet({
            topic: topic || niche,
            niche: niche || topic,
            platform,
            format: platform === 'tiktok' ? 'video' : 'reels',
            count: 6,
            llm: false,
          }),
        'hookSet',
        { hooks: [] },
      ),
      safe(() => generateCaptionsLLM({ topic, platform, goal, niche, briefSnippet }), 'captions', null),
      safe(() => runCopyEngine({ topic, goal, niche, tone: brandVoice || 'cercano', platform }), 'copyEngine', null),
      safe(() => runAndromeda({ topic, niche, goal, platform }), 'andromeda', null),
    ]);

  const hashtags = getHashtags(niche || nicheData?.matchedAs);

  const topHooks = (hookSet?.hooks || []).slice(0, 5).map((h) => ({
    verbal: h.verbal || h.formula,
    visual: h.visual || '',
    onScreenText: h.onScreenText || '',
    score: h.score || Math.round((h.strength || 0.75) * 100),
    formula: h.id || h.formula || '',
  }));

  const storytelling = buildStorytelling({
    hook: topHooks[0]?.verbal?.replace('{topic}', topic) || `Sobre ${topic}`,
    topic,
    audience: audienceData,
    goal,
  });

  const postingWindows = {
    instagram: {
      best: ['18:00-20:00', '12:00-13:00'],
      days: ['Martes', 'Miércoles', 'Jueves'],
      cadence: '5-7 posts/sem',
    },
    tiktok: { best: ['19:00-21:00', '07:00-09:00'], days: ['Lunes', 'Martes', 'Viernes'], cadence: '7-14 posts/sem' },
  };
  const timing = postingWindows[platform] || postingWindows.instagram;

  return {
    _meta: { durationMs: Date.now() - startedAt, topic, platform, goal, niche: nicheData?.matchedAs || niche },

    hooks: topHooks,

    captions: captions || {},

    hashtags,

    storytelling,

    niche: {
      detected: nicheData?.matchedAs || niche || 'general',
      trends2026: nicheData?.trends2026 || [],
      pillars: nicheData?.contentPillars || [],
      topPlayers: nicheData?.topPlayers || [],
      monetization: nicheData?.monetizationModels || [],
      avgFreq: nicheData?.avgPostFrequency || {},
    },

    audience: {
      painPoints: audienceData?.painPoints || [],
      dreamOutcomes: audienceData?.dreamOutcomes || [],
      triggers: audienceData?.emotionalTriggers || [],
      objections: audienceData?.commonObjections || [],
      contentThatConverts: audienceData?.contentThatConverts || [],
      angle: audienceData?.recommendedAngle || '',
    },

    viralIdeas: (viralIdeas?.ideas || []).map((idea) => ({
      concept: idea.idea,
      format: idea.format,
      creationMin: idea.maxCreationMinutes || idea.creationMin,
      shareability: Math.round((idea.shareability || 0.8) * 100),
    })),

    viralPatterns: viralPatterns?.viralFormulas || {},

    timing,

    copy: copyData,

    andromeda: andromedaData,

    canvasSpecs: getAllSpecs(platform === 'tiktok' ? 'tiktok' : 'instagram'),

    carouselRules: {
      dos: CAROUSEL_DOS,
      donts: CAROUSEL_DONTS,
      validatedFormat: VALIDATED_10_SLIDE_FORMAT,
      dimensions: CAROUSEL_DIMENSIONS,
    },

    contentMix: {
      educational: goal === 'awareness' ? 40 : 25,
      entertainment: goal === 'community' ? 40 : 30,
      sales: goal === 'conversion' || goal === 'sales' ? 35 : 15,
      community: goal === 'community' ? 30 : 15,
      behindScenes: 10,
    },

    weekPlan: [
      { day: 'Lunes', format: 'reel', angle: `Hook viral sobre ${topic}` },
      { day: 'Martes', format: 'carousel', angle: `Educativo: 5 puntos clave de ${topic}` },
      { day: 'Miércoles', format: 'story', angle: `Poll / pregunta de comunidad` },
      { day: 'Jueves', format: 'reel', angle: `Antes/después o transformación en ${topic}` },
      { day: 'Viernes', format: 'carousel', angle: `Listicle: errores comunes en ${topic}` },
      { day: 'Sábado', format: 'story', angle: `Behind the scenes + CTA directo` },
      { day: 'Domingo', format: 'reel', angle: `POV o trending audio + ${topic}` },
    ],
  };
};

export const handleAgencyBrain = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/agency/brain/run' && m === 'POST') {
    try {
      const result = await runAgencyBrain({
        topic: body?.topic || '',
        platform: body?.platform || 'instagram',
        goal: body?.goal || 'engagement',
        niche: body?.niche || '',
        brandVoice: body?.brandVoice || '',
        briefSnippet: body?.briefSnippet || '',
        accountId: body?.accountId || '',
        scope: ctx.userId || 'anon',
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  return false;
};
