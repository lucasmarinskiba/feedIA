/**
 * Audience Targeting Agent — encuentra el mejor camino al ICP.
 *
 * Output: hashtags estratificados, collab targets, format priority, hooks que resuenan, CTAs, placements.
 * 100% heurístico. LLM opcional para sugerencias de collab targets específicos.
 *
 * Reusa:
 *   - NICHE_PROFILES_DEEP de _nicheResearchAgent
 *   - HOOK_FORMULAS_EXTENDED de _hookLab (vía import dinámico para evitar coste cold-start)
 *   - igInsights/ttProfile de _social si conectado
 */

import * as store from './_store.js';
import { askLLMJson } from './_llm.js';
import { NICHE_PROFILES_DEEP } from './_nicheResearchAgent.js';
import { igConnected, ttConnected, igInsights, ttProfile } from './_social.js';

const PLATFORM_FORMAT_PRIORITY = {
  tiktok: ['video', 'photo', 'live'],
  instagram: ['reels', 'carousel', 'stories', 'feed'],
};

const PLACEMENT_HINTS = {
  tiktok: ['For You Page (frío)', 'Búsqueda por hashtag', 'Profile reach via bio', 'Stitch/Duet entrada por creators'],
  instagram: [
    'Explore (Reels)',
    'Hashtags relevantes 3-8',
    'Collab Posts con audiencias adyacentes',
    'Stories de creators tagueados',
  ],
};

const audienceProfile = (icp) => {
  const age = Number(icp?.ageMin || icp?.age || 25);
  if (age < 25) return 'gen-z';
  if (age < 35) return 'millennial';
  return 'gen-x';
};

const hashtagsForNiche = (nicheKey, icp, platform) => {
  const profile = NICHE_PROFILES_DEEP[nicheKey] || NICHE_PROFILES_DEEP.general;
  const pillars = profile.contentPillars || [];
  const trends = profile.trends2026 || [];

  const core = (icp?.handle ? [`#${icp.handle}`] : []).concat([`#${nicheKey}`, `#${nicheKey}tips`]).slice(0, 3);
  const nicheTags = pillars
    .map(
      (p) =>
        `#${String(p)
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase()}`,
    )
    .slice(0, 5);
  const trendingTags = trends
    .map(
      (t) =>
        `#${String(t)
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase()}`,
    )
    .slice(0, 3);
  const branded = icp?.brand
    ? [
        `#${String(icp.brand)
          .replace(/[^a-z0-9]/gi, '')
          .toLowerCase()}`,
      ]
    : [];

  const platformBoost = platform === 'tiktok' ? ['#fyp', '#parati', `#${nicheKey}tok`] : ['#reels', '#instareels'];

  return {
    core: [...new Set(core)],
    niche: [...new Set([...nicheTags, ...trendingTags])],
    branded,
    platformBoost,
    recommendedCount: platform === 'tiktok' ? '3-5' : '3-8',
    rationale: 'Pocos hashtags hiper-relevantes > muchos genéricos. Algoritmo premia coherencia.',
  };
};

const hooksForICP = (nicheKey, audienceSegment) => {
  // Selección curada heurística — orden importa.
  const map = {
    'gen-z': ['pattern-break', 'controversy', 'pov-narrative', 'shame-relief', 'unpopular-opinion'],
    millennial: ['specific-number', 'before-after', 'counter-intuitive', 'mistake-warn', 'time-bound'],
    'gen-x': ['authority', 'experiment', 'live-demo', 'consequence', 'reveal-secret'],
  };
  return (map[audienceSegment] || map.millennial).map((id) => ({
    formulaId: id,
    why: `Resuena en ${audienceSegment} para nicho ${nicheKey}`,
  }));
};

const ctasForGoal = (goal) => {
  const base = {
    awareness: ['Compartí con quien necesite esto', 'Guardalo para volver', 'Etiquetá a alguien'],
    engagement: ['Comentá tu experiencia', '¿Vos qué hacés? Contame', 'Etiquetá a quien lo necesite'],
    conversion: ['DM con palabra trigger', 'Link en bio para guía', 'Reservá llamada gratis'],
    community: ['Sumate al canal', 'Respondé con tu opinión', 'Compartí en tu historia'],
    sales: ['Comentá "info" → DM', 'Link en bio limitado', 'Quedan X cupos'],
  };
  return base[goal] || base.engagement;
};

const collabTargetsHeuristic = (nicheKey, icp, profile) => {
  const adjacent = {
    'marketing-digital': ['negocios', 'creator', 'tech'],
    fitness: ['salud', 'lifestyle', 'food'],
    food: ['lifestyle', 'fitness', 'salud'],
    tech: ['marketing-digital', 'creator', 'gaming'],
    finanzas: ['business', 'tech', 'lifestyle'],
    beauty: ['moda', 'lifestyle', 'salud'],
    business: ['marketing-digital', 'finanzas', 'creator'],
    lifestyle: ['fitness', 'food', 'moda'],
    educacion: ['business', 'creator', 'tech'],
    salud: ['fitness', 'food', 'lifestyle'],
  };
  const adj = adjacent[nicheKey] || [];
  return adj.map((nn) => ({
    targetNiche: nn,
    why: `Audiencia adyacente, no rival — cross-pollination`,
    ask: `Collab Post IG / Stitch TT con valor mutuo`,
    formato: 'Collab Post (IG) o Duet/Stitch (TT)',
  }));
};

const tightenWithMetrics = (current, platform) => {
  if (!current) return { available: false };
  const followers = current?.followers || current?.fans || 0;
  const er = current?.engagementRate || null;
  const reach = current?.reach || null;
  let advice = [];
  if (followers < 1000) advice.push('Sub-1k: foco en 1 nicho + 1 formato + cadencia diaria');
  else if (followers < 10000) advice.push('Sub-10k: series repetibles + collab posts adyacentes');
  else advice.push('10k+: comunidad activa + DM funnel + autoridad');
  if (er !== null && er < 0.02) advice.push('ER bajo: revisar hooks + CTAs concretos');
  return { available: true, followers, er, reach, advice };
};

/**
 * Encuentra el mejor camino al ICP.
 */
export const findAudiencePath = async ({
  icp = {},
  niche = '',
  platform = 'tiktok',
  goal = 'awareness',
  currentMetrics = null,
  llm = false,
  user = null,
} = {}) => {
  const { researchNiche } = await import('./_nicheResearchAgent.js');
  const research = await researchNiche({ niche, platform, depth: 'standard' });
  const nicheKey = research.nicheNormalized;
  const profile = NICHE_PROFILES_DEEP[nicheKey] || NICHE_PROFILES_DEEP.general;
  const audienceSegment = audienceProfile(icp);

  // Métricas reales si conectado
  let current = currentMetrics || null;
  try {
    if (!current && user) {
      if (platform === 'instagram' && (await igConnected())) {
        const ins = await igInsights();
        current = { followers: ins?.followersCount, engagementRate: ins?.engagementRate, reach: ins?.reach };
      } else if (platform === 'tiktok' && (await ttConnected())) {
        const p = await ttProfile();
        current = { followers: p?.followers, engagementRate: p?.engagementRate };
      }
    }
  } catch {
    /* best-effort */
  }

  const hashtags = hashtagsForNiche(nicheKey, icp, platform);
  const hooksThatResonate = hooksForICP(nicheKey, audienceSegment);
  const CTAs = ctasForGoal(goal);
  const collabHeur = collabTargetsHeuristic(nicheKey, icp, profile);

  let llmCollabs = null;
  if (llm) {
    const prompt = `Sugerí 5 perfiles ARQUETIPO (no handles reales) de cuentas con las que un creator de "${niche}" en ${platform} debería buscar collab. ICP: ${JSON.stringify(icp)}. Goal: ${goal}.
Devolvé JSON: {"collabs":[{"archetype":"...","why":"...","ask":"..."}]}.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 500, temperature: 0.6 });
      if (out?.collabs?.length) llmCollabs = out.collabs;
    } catch {
      /* heurístico ya está */
    }
  }

  const collabTargets = llmCollabs
    ? llmCollabs.map((c, i) => ({ targetArchetype: c.archetype, why: c.why, ask: c.ask, source: 'llm', rank: i + 1 }))
    : collabHeur.map((c, i) => ({ ...c, rank: i + 1, source: 'heuristic' }));

  const formatPriority = PLATFORM_FORMAT_PRIORITY[platform] || PLATFORM_FORMAT_PRIORITY.tiktok;
  const placements = PLACEMENT_HINTS[platform] || PLACEMENT_HINTS.tiktok;
  const accountStage = tightenWithMetrics(current, platform);

  const result = {
    platform,
    niche,
    nicheNormalized: nicheKey,
    audienceSegment,
    goal,
    icp,
    hashtags,
    collabTargets,
    formatPriority,
    hooksThatResonate,
    CTAs,
    placements,
    accountStage,
    riskTopics: profile.riskTopics,
    monetizationHints: profile.monetization,
    generatedBy: llmCollabs ? 'llm+heuristic' : 'heuristic',
  };

  if (user?.id) {
    try {
      await store.setUser(user.id, 'audience:path', { at: Date.now(), result });
    } catch {
      /* best-effort */
    }
  }

  return result;
};

/**
 * Scoring de fit candidato contra ICP — para rankear collabs/hashtags propuestos por el usuario.
 */
export const scoreFit = (candidate, icp) => {
  let score = 50;
  const reasons = [];
  if (candidate.niche && icp.niche && String(candidate.niche).toLowerCase() === String(icp.niche).toLowerCase()) {
    score += 25;
    reasons.push('mismo nicho');
  }
  if (
    candidate.audienceAge &&
    icp.ageMin &&
    icp.ageMax &&
    candidate.audienceAge >= icp.ageMin &&
    candidate.audienceAge <= icp.ageMax
  ) {
    score += 15;
    reasons.push('rango etario coincide');
  }
  if (candidate.platform === icp.platform) {
    score += 10;
    reasons.push('misma plataforma');
  }
  if (
    candidate.followers &&
    icp.followers &&
    Math.abs(Math.log10(candidate.followers + 1) - Math.log10(icp.followers + 1)) < 0.7
  ) {
    score += 10;
    reasons.push('tamaño similar');
  }
  return { score: Math.max(0, Math.min(100, score)), reasons };
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleAudienceTargeting = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;

  if (path === '/api/growth/audience/path' && m === 'POST') {
    const result = await findAudiencePath({ ...(body || {}), user });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/growth/audience/score-fit' && m === 'POST') {
    const { candidate, icp } = body || {};
    if (!candidate || !icp) {
      json(res, 400, { error: 'candidate + icp requeridos' });
      return true;
    }
    json(res, 200, scoreFit(candidate, icp));
    return true;
  }

  return false;
};
