/**
 * Gstack — Meta-controller / "Growth Stack" orchestrator.
 *
 * Punto de entrada único que decide QUÉ profesional (rol/archetype/mood) usar
 * para CADA tarea, basándose en el perfil de la cuenta + inteligencia cacheada +
 * patrones ganadores (memoria activa, cuando Build 5 esté).
 *
 * Rutea downstream al módulo correcto:
 *   format=carousel → _autopilotCreate
 *   format=story    → _storiesEngine (Build 3)
 *   format=reel     → _autopilotCreate (reel branch)
 *   intent=dm       → _communityEngine.respondDM (Build 4)
 *   intent=comment  → _communityEngine.respondComment (Build 4)
 *   default         → _agencyBrain.runAgencyBrain
 *
 * Endpoint: POST /api/gstack/run
 */

import { getProfile, getMetrics } from './_accountMemory.js';
import { loadIntelligencePriming, loadIntelligenceRaw } from './_nicheIntelligence.js';
import {
  ARCHETYPES,
  DESIGN_MOODS,
  CREATIVE_ROLES,
  buildPriming,
  buildRoleChainPriming,
  detectNiche,
  detectArchetype,
} from './_promptLibrary.js';
import { createAutonomousPost } from './_autopilotCreate.js';
import { runAgencyBrain } from './_agencyBrain.js';

// Budget timeout helper (mismo patrón que _autopilotCreate)
const withBudget = (promise, deadline, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), Math.max(1000, deadline - Date.now()))),
  ]);

// ── Scoring: archetype + mood óptimos por tarea + perfil ──────────────────────
const SCORE_HINTS = {
  // verbo en task → archetype preferido
  verbs: {
    enseñar: 'educador',
    educar: 'educador',
    explicar: 'educador',
    vender: 'vendedor',
    convertir: 'vendedor',
    cerrar: 'vendedor',
    inspirar: 'inspirador',
    motivar: 'inspirador',
    contar: 'storyteller',
    historia: 'storyteller',
    narrar: 'storyteller',
    analizar: 'analista',
    medir: 'analista',
    datos: 'analista',
    diferenciar: 'contrario',
    romper: 'rebel',
    desafiar: 'contrario',
    posicionar: 'autoridad',
    validar: 'autoridad',
    entretener: 'humorista',
    divertir: 'humorista',
    humor: 'humorista',
    guiar: 'mentor',
    acompañar: 'mentor',
    ayudar: 'mentor',
    predecir: 'visionario',
    futuro: 'visionario',
    tendencia: 'visionario',
    simplificar: 'minimalista',
    resumir: 'minimalista',
  },
  // goal → archetype default si no hay verbo
  goalDefault: {
    awareness: 'humorista',
    engagement: 'educador',
    conversion: 'vendedor',
    community: 'cercano',
    sales: 'vendedor',
  },
};

export const scoreArchetypeMood = ({ task = '', profile = {}, intel = null, goal = 'engagement' } = {}) => {
  const t = task.toLowerCase();
  // 1. Archetype por verbo en task
  let archetype = null;
  for (const [verb, arch] of Object.entries(SCORE_HINTS.verbs)) {
    if (t.includes(verb)) {
      archetype = arch;
      break;
    }
  }
  // 2. Archetype del perfil
  if (!archetype && profile?.voice && ARCHETYPES[profile.voice]) archetype = profile.voice;
  // 3. Archetype por goal
  if (!archetype) archetype = SCORE_HINTS.goalDefault[goal] || 'educador';
  // 4. Si la inteligencia detectó winning pattern → override (Build 5 lo poblará)
  const winning = intel?.summary?.winningArchetype;
  if (winning && ARCHETYPES[winning]) archetype = winning;

  // Mood: profile preferido > saturación del nicho > default premium
  let mood = profile?.mood && DESIGN_MOODS[profile.mood] ? profile.mood : null;
  if (!mood) {
    const sat = intel?.niche?.saturationLevel;
    if (sat === 'muy alto' || sat === 'alto')
      mood = 'brutal'; // diferenciarse en nichos saturados
    else if (goal === 'community') mood = 'pastel';
    else if (goal === 'awareness') mood = 'editorial';
    else mood = 'premium';
  }

  return { archetype, mood };
};

// ── Picker de roles (2-3 lentes IA) ──────────────────────────────────────────
export const pickRoleChain = ({ task = '', format = '', intent = '', goal = 'engagement' } = {}) => {
  const t = task.toLowerCase();
  const roles = new Set();

  // Siempre: Creative Director (visión)
  roles.add('ai-creative-director');

  // Por intent
  if (intent === 'dm' || intent === 'comment') {
    roles.add('community-manager');
    roles.add('ai-copywriter');
    return [...roles];
  }

  // Por format
  if (format === 'carousel' || format === 'reel') roles.add('ai-copywriter');
  if (format === 'reel' || format === 'story') roles.add('ai-designer');

  // Por goal
  if (goal === 'awareness' || /viral|alcance|crecer/.test(t)) roles.add('growth-hacker');
  if (goal === 'conversion' || goal === 'sales' || /vender/.test(t)) roles.add('ai-copywriter');
  if (/estrategia|plan|calendario/.test(t)) roles.add('social-strategist');
  if (/marca|branding|identidad/.test(t)) roles.add('brand-architect');
  if (/metric|resultado|analizar/.test(t)) roles.add('data-analyst');
  if (/tendencia|trend|nuevo/.test(t)) roles.add('trend-forecaster');

  // Cap a 4 roles para no inflar tokens
  return [...roles].slice(0, 4);
};

// ── Detector simple de format/intent desde texto libre ───────────────────────
const detectFormat = (task) => {
  const t = (task || '').toLowerCase();
  if (/carrusel|carousel|slides?/.test(t)) return 'carousel';
  if (/reel|video|vídeo/.test(t)) return 'reel';
  if (/histor[ií]a|story|stories/.test(t)) return 'story';
  return null;
};

const detectIntent = (task) => {
  const t = (task || '').toLowerCase();
  if (/responde[r]? (un )?dm|mensaje privado|inbox/.test(t)) return 'dm';
  if (/responde[r]? (un )?coment/.test(t)) return 'comment';
  return null;
};

// ── Router downstream — delega al módulo correcto ───────────────────────────
const routeDownstream = async ({ decision, payload }) => {
  const { format, intent } = decision;

  if (intent === 'dm' || intent === 'comment') {
    // Build 4 todavía no existe → devolver stub claro
    return {
      pending: true,
      reason: `Community engine (Build 4) aún no cableado. La decisión Gstack está lista — esperá a tener _communityEngine.js wireado para auto-respuestas.`,
      decisionWasRight: true,
    };
  }

  if (format === 'story') {
    // Build 3 todavía no existe → devolver stub claro
    return {
      pending: true,
      reason: `Stories engine (Build 3) aún no cableado. La decisión Gstack está lista — esperá a _storiesEngine.js wireado para historias visuales.`,
      decisionWasRight: true,
    };
  }

  if (format === 'carousel' || format === 'reel') {
    return await createAutonomousPost({
      topic: payload.topic || payload.task,
      niche: payload.niche || '',
      goal: payload.goal || 'engagement',
      platform: payload.platform || 'instagram',
      format,
      accountId: payload.accountId || '',
      images: payload.images || [],
      brandColors: payload.brandColors || [],
      extraElements: payload.extraElements || [],
      brandVoice: decision.archetype,
      autoPublish: false,
      scope: payload.scope || 'anon',
    });
  }

  // Default: estrategia general con agency brain
  return await runAgencyBrain({
    topic: payload.topic || payload.task,
    platform: payload.platform || 'instagram',
    goal: payload.goal || 'engagement',
    niche: payload.niche || '',
    brandVoice: decision.archetype,
  });
};

// ── runGstack: decide + ejecuta ──────────────────────────────────────────────
export const runGstack = async ({
  task = '',
  format = null,
  intent = null,
  topic = '',
  niche = '',
  goal = 'engagement',
  accountId = '',
  scope = 'anon',
  platform = 'instagram',
  images = [],
  brandColors = [],
  extraElements = [],
} = {}) => {
  const startedAt = Date.now();
  const deadline = startedAt + 50_000;

  // Auto-detect format/intent si no vienen
  const resolvedFormat = format || detectFormat(task);
  const resolvedIntent = intent || detectIntent(task);

  // 1. Cargar perfil + intel
  const [profile, intelPriming, intelRaw] = await Promise.all([
    getProfile(scope, accountId).catch(() => ({})),
    loadIntelligencePriming({ scope, accountId, accountHandle: accountId }).catch(() => ''),
    loadIntelligenceRaw({ scope, accountId, accountHandle: accountId }).catch(() => null),
  ]);

  // intel raw incluye summary.winningArchetype/winningFormat del feedback loop (Build 5)
  const intel = intelRaw || (intelPriming ? { summary: {}, niche: {} } : null);

  // 2. Scoring
  const { archetype, mood } = scoreArchetypeMood({ task, profile, intel, goal });
  const detectedNiche = niche || detectNiche(topic || task);
  const roles = pickRoleChain({ task, format: resolvedFormat, intent: resolvedIntent, goal });

  // 3. Composite system priming (para visibilidad / debug)
  const roleChain = buildRoleChainPriming(roles, { context: `Task: ${task}. Niche: ${detectedNiche}. Goal: ${goal}.` });
  const taskPriming = buildPriming(resolvedFormat === 'carousel' ? 'carousel_slides' : 'any_caption', {
    topic: topic || task,
    niche: detectedNiche,
    goal,
    archetype,
    mood,
  });

  const decision = {
    task,
    format: resolvedFormat,
    intent: resolvedIntent,
    archetype,
    mood,
    roles,
    niche: detectedNiche,
    profileLoaded: Boolean(profile?.handle || profile?.niche),
    intelLoaded: Boolean(intelPriming),
    reasoning: [
      `Archetype "${archetype}" elegido por ${profile?.voice === archetype ? 'profile.voice' : `verbo/goal "${goal}"`}`,
      `Mood "${mood}" elegido por ${profile?.mood === mood ? 'profile.mood' : `goal/saturación`}`,
      `${roles.length} roles: ${roles.join(' + ')}`,
      resolvedFormat ? `Format detectado/recibido: ${resolvedFormat}` : 'Format: default (agency brain)',
      resolvedIntent ? `Intent detectado/recibido: ${resolvedIntent}` : null,
    ].filter(Boolean),
    primingPreview: (roleChain.priming + '\n\n' + taskPriming.priming).slice(0, 400) + '…',
  };

  // 4. Ejecutar downstream con budget
  const output = await withBudget(
    routeDownstream({
      decision,
      payload: {
        topic,
        niche: detectedNiche,
        goal,
        platform,
        accountId,
        scope,
        images,
        brandColors,
        extraElements,
        task,
      },
    }),
    deadline,
    { error: 'budget-exceeded', message: 'Gstack ejecución pasó budget Vercel. Reintentá con tarea más simple.' },
  );

  return {
    decision,
    output,
    durationMs: Date.now() - startedAt,
  };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleGstack = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/gstack/run' && m === 'POST') {
    try {
      const result = await runGstack({
        task: body?.task || '',
        format: body?.format || null,
        intent: body?.intent || null,
        topic: body?.topic || body?.task || '',
        niche: body?.niche || '',
        goal: body?.goal || 'engagement',
        accountId: body?.accountId || '',
        scope: ctx.userId || 'anon',
        platform: body?.platform || 'instagram',
        images: body?.images || [],
        brandColors: body?.brandColors || [],
        extraElements: body?.extraElements || [],
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  return false;
};
