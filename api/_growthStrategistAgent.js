/**
 * Growth Strategist Agent — consolida la estrategia 7/30/90 días.
 *
 * Toma outputs de los agentes (research, audiencePath, hooks, sounds, visuals, scriptAnalysis)
 * y entrega un plan calendarizado, accionable, con KPIs y north star.
 *
 * Reusa:
 *   - buildStrategicPlan de _strategist (plan táctico base)
 *   - NICHE_PROFILES_DEEP para risk topics y monetization
 *
 * LLM: solo para narrar `summary` en planes paid; las tasks son siempre determinísticas.
 */

import * as store from './_store.js';
import { askLLMJson } from './_llm.js';
import { buildStrategicPlan } from './_strategist.js';
import { NICHE_PROFILES_DEEP } from './_nicheResearchAgent.js';

const taskId = () => `task_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

const dailyTasks7d = (nicheKey, platform, hookFormulas, formatPriority) => {
  const baseFormat = formatPriority?.[0] || (platform === 'tiktok' ? 'video' : 'reels');
  return [
    {
      id: taskId(),
      day: 1,
      type: 'content',
      title: `Publicar 1 ${baseFormat} usando hook formula ${hookFormulas?.[0]?.formulaId || 'pattern-break'}`,
    },
    {
      id: taskId(),
      day: 1,
      type: 'engage',
      title: 'Responder los primeros 30min de comentarios — empuja velocity inicial',
    },
    { id: taskId(), day: 2, type: 'content', title: `Publicar 1 ${baseFormat} segundo hook formula (variante A/B)` },
    { id: taskId(), day: 3, type: 'analysis', title: 'Analizar primeros 2 posts: completion, saves, retention curve' },
    {
      id: taskId(),
      day: 3,
      type: 'content',
      title: `Carrusel save-bait (si IG) o photo TikTok (si TT) con utilidad alta`,
    },
    {
      id: taskId(),
      day: 4,
      type: 'community',
      title: 'Comentar con valor en 5 cuentas grandes del nicho — entrar al grafo',
    },
    { id: taskId(), day: 5, type: 'content', title: `Publicar pieza serie repetible (nombre fijo + intro fija)` },
    { id: taskId(), day: 5, type: 'experiment', title: 'Probar hook formula counter-intuitive — medir vs baseline' },
    { id: taskId(), day: 6, type: 'community', title: 'Story con sticker pregunta + responder DMs' },
    { id: taskId(), day: 7, type: 'review', title: 'Audit semanal: ¿qué post viralizó? ¿qué patrón se repite?' },
  ];
};

const weeklyMilestones30d = (nicheKey, platform, monetization) => [
  { week: 1, milestone: 'Hook winner identificado (hook + visual + on-screen).', kpi: 'Hook strength promedio > 75' },
  { week: 2, milestone: 'Formato dominante decidido + cadencia fija.', kpi: 'Reach-rate sostenido' },
  { week: 3, milestone: 'Serie nombrada + primeras 2 entregas publicadas.', kpi: 'Returning viewers > 20%' },
  {
    week: 4,
    milestone: 'Primer collab post / stitch ejecutado con audiencia adyacente.',
    kpi: 'Followers cruzados ganados',
  },
];

const monthlyPhases90d = (nicheKey, profile, audiencePath) => [
  {
    month: 1,
    phase: 'Foundation',
    goals: ['Identidad clara', 'Hook winner', 'Cadencia sostenida'],
    primarySignal: 'engagement velocity primeros 30min',
  },
  {
    month: 2,
    phase: 'Authority',
    goals: ['Serie repetible activa', 'Collab posts mensuales', 'DM funnel sembrado'],
    primarySignal: 'profile-view → follow rate',
  },
  {
    month: 3,
    phase: 'Monetize',
    goals: [`Activar ${profile.monetization?.[0] || 'oferta'}`, 'Lead magnet listo', 'Email/Newsletter capture'],
    primarySignal: 'sends/saves + conversion to DM',
  },
];

const kpisByPlatform = (platform) =>
  platform === 'tiktok'
    ? [
        { name: 'Completion rate', target: '>50%', why: 'Métrica madre del FYP' },
        { name: 'Rewatch rate', target: '>15%', why: 'Doble exposición + boost algorítmico' },
        { name: 'Follower growth', target: '+5%/sem', why: 'Salud cumulativa' },
        { name: 'Shares + Stitch', target: 'top decile', why: 'Distribución viral fuera del FYP' },
      ]
    : [
        { name: 'Sends + Saves', target: '>0.05/reach', why: 'Señal madre IG' },
        { name: 'Reach-rate Reels', target: '>1x followers', why: 'Alcance frío' },
        { name: 'Profile-view → follow', target: '>15%', why: 'Conversión perfil' },
        { name: 'Comments velocity', target: 'top 30min cargados', why: 'Trigger reach boost' },
      ];

const risksConsolidated = (profile, currentAccount) => {
  const risks = [...(profile.riskTopics || [])];
  if (!currentAccount?.followers || currentAccount.followers < 1000)
    risks.push('Etapa 0-1k: tentación de comprar followers (no hacerlo, destruye reach futuro)');
  if (!currentAccount?.engagementRate) risks.push('Sin métricas baseline: definir baseline antes de iterar');
  return risks;
};

/**
 * Consolida la estrategia.
 */
export const consolidateStrategy = async ({
  userId = null,
  niche = '',
  audience = '',
  platform = 'tiktok',
  goal = 'awareness',
  research = null,
  audiencePath = null,
  scriptAnalysis = null,
  currentAccount = null,
  llm = false,
  user = null,
} = {}) => {
  const nicheKey = audiencePath?.nicheNormalized || research?.nicheNormalized || 'general';
  const profile = NICHE_PROFILES_DEEP[nicheKey] || NICHE_PROFILES_DEEP.general;

  const tacticalPlan = buildStrategicPlan({
    topic: research?.angles?.[0]?.topic || niche,
    platform,
    goal,
    brandNiche: niche,
    targetAge: Number(audience?.ageMin || null),
  });

  const hookFormulas = audiencePath?.hooksThatResonate || [];
  const formatPriority = audiencePath?.formatPriority || [];

  const next7Days = dailyTasks7d(nicheKey, platform, hookFormulas, formatPriority);
  const next30Days = weeklyMilestones30d(nicheKey, platform, profile.monetization);
  const next90Days = monthlyPhases90d(nicheKey, profile, audiencePath);

  const kpis = kpisByPlatform(platform);
  const northStar =
    platform === 'tiktok'
      ? 'Completion + Rewatch + Shares — convertidos en seguidores de calidad'
      : 'Sends + Saves + Reach-rate Reels — señal madre que IG premia';

  const risks = risksConsolidated(profile, currentAccount);

  // Summary narrativo (LLM opcional)
  let summary = `Estrategia ${platform.toUpperCase()} para nicho "${niche}" (${nicheKey}), goal: ${goal}. ${next7Days.length} tareas en 7d, ${next30Days.length} milestones en 30d, ${next90Days.length} fases en 90d. Primary signal: ${tacticalPlan.algorithmPrimarySignals?.join(', ') || 'engagement velocity'}.`;
  if (llm) {
    const prompt = `Como estratega senior de creadores TikTok/IG, escribí un párrafo (max 100 palabras) que resuma esta estrategia y dé una motivación accionable concreta. Nicho: ${niche}. Goal: ${goal}. Plataforma: ${platform}. Hook winner: ${tacticalPlan.topHook?.hook || 'TBD'}. KPIs principales: ${kpis.map((k) => k.name).join(', ')}. Devolvé JSON: {"summary":"..."}.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 300, temperature: 0.6 });
      if (out?.summary) summary = out.summary;
    } catch {
      /* heurístico ya está */
    }
  }

  const result = {
    generatedAt: new Date().toISOString(),
    niche,
    nicheNormalized: nicheKey,
    audience,
    platform,
    goal,
    summary,
    northStar,
    kpis,
    next7Days,
    next30Days,
    next90Days,
    tacticalPlan,
    risks,
    monetizationHints: profile.monetization,
    inputsUsed: {
      research: Boolean(research),
      audiencePath: Boolean(audiencePath),
      scriptAnalysis: Boolean(scriptAnalysis),
      currentAccount: Boolean(currentAccount),
    },
    generatedBy: llm && summary.length > 100 ? 'llm+heuristic' : 'heuristic',
  };

  if (userId) {
    try {
      await store.setUser(userId, 'strategy:consolidated:latest', result);
      await store.lpushUser(userId, 'strategy:consolidated:history', { at: Date.now(), niche, platform, goal });
      await store.ltrim(store.userKey(userId, 'strategy:consolidated:history'), 0, 11);
    } catch {
      /* best-effort */
    }
  }

  return result;
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleGrowthStrategist = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/growth/strategy/consolidate' && m === 'POST') {
    const result = await consolidateStrategy({ ...(body || {}), userId, user });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/growth/strategy/latest' && m === 'GET' && userId) {
    const latest = await store.getUser(userId, 'strategy:consolidated:latest');
    json(res, 200, latest || { empty: true });
    return true;
  }

  if (path === '/api/growth/strategy/history' && m === 'GET' && userId) {
    const items = await store.lrangeUser(userId, 'strategy:consolidated:history', 0, 11);
    json(res, 200, { items });
    return true;
  }

  return false;
};
