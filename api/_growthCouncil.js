/**
 * Growth Council — orquestador multi-agente.
 *
 * Ejecuta en paralelo: researchNiche, findAudiencePath, generateHookSet, recommendSounds, recommendVisuals.
 * Luego consolidateStrategy() recibe los outputs.
 *
 * Degrada con gracia: si un agente falla, devuelve `parts` parcial.
 *
 * Cost (cost-bucket): `growth_council` (declarado en _rateLimit.ACTION_COSTS).
 * Owner bypass automático (vía _rateLimit isOwner check).
 */

import * as store from './_store.js';
import { researchNiche } from './_nicheResearchAgent.js';
import { findAudiencePath } from './_audienceTargetingAgent.js';
import { generateHookSet } from './_hookLab.js';
import { recommendSounds } from './_soundDesigner.js';
import { recommendVisuals } from './_visualDirector.js';
import { consolidateStrategy } from './_growthStrategistAgent.js';

const AGENT_TIMEOUT_MS = 8000;

const withTimeout = (promise, label, ms = AGENT_TIMEOUT_MS) => {
  return Promise.race([
    promise.then((value) => ({ ok: true, label, value })),
    new Promise((resolve) => setTimeout(() => resolve({ ok: false, label, error: 'timeout' }), ms)),
  ]).catch((err) => ({ ok: false, label, error: String(err?.message || err) }));
};

const runId = () => `council_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

/**
 * @param {{ user: object|null, input: object, depth?: 'standard'|'deep' }} params
 */
export const runGrowthCouncil = async ({ user = null, input = {}, depth = 'standard' } = {}) => {
  const startedAt = Date.now();
  const id = runId();
  const userId = user?.id || null;

  const {
    niche = '',
    audience = '',
    platform = 'tiktok',
    goal = 'awareness',
    topic = niche,
    icp = {},
    currentAccount = null,
  } = input || {};

  const useLlm = depth === 'deep'; // standard = heurístico; deep = LLM en agentes compatibles

  // Paralelizar los 5 agentes
  const [research, audiencePath, hooks, sounds, visuals] = await Promise.all([
    withTimeout(researchNiche({ niche, platform, audience, depth, llm: useLlm, user }), 'research'),
    withTimeout(
      findAudiencePath({ icp, niche, platform, goal, currentMetrics: currentAccount, llm: useLlm, user }),
      'audiencePath',
    ),
    withTimeout(
      generateHookSet({
        topic,
        niche,
        audience,
        platform,
        format: platform === 'tiktok' ? 'video' : 'reels',
        count: 6,
        llm: useLlm,
        user,
      }),
      'hooks',
    ),
    withTimeout(recommendSounds({ niche, mood: null, durationSec: 30, useLive: depth === 'deep', user }), 'sounds'),
    withTimeout(
      recommendVisuals({
        niche,
        mood: null,
        format: platform === 'tiktok' ? 'video' : 'reels',
        platform,
        llm: useLlm,
        user,
      }),
      'visuals',
    ),
  ]);

  const parts = {
    research: research.ok ? research.value : { error: research.error },
    audiencePath: audiencePath.ok ? audiencePath.value : { error: audiencePath.error },
    hooks: hooks.ok ? hooks.value : { error: hooks.error },
    sounds: sounds.ok ? sounds.value : { error: sounds.error },
    visuals: visuals.ok ? visuals.value : { error: visuals.error },
  };
  const ranAgents = [research, audiencePath, hooks, sounds, visuals].filter((r) => r.ok).map((r) => r.label);
  const failedAgents = [research, audiencePath, hooks, sounds, visuals]
    .filter((r) => !r.ok)
    .map((r) => ({ label: r.label, error: r.error }));

  // Strategist consolida (agente 6, secuencial post-paralelo)
  const strategy = await consolidateStrategy({
    userId,
    user,
    niche,
    audience,
    platform,
    goal,
    research: research.ok ? research.value : null,
    audiencePath: audiencePath.ok ? audiencePath.value : null,
    currentAccount,
    llm: useLlm,
  });

  const durationMs = Date.now() - startedAt;

  const result = {
    id,
    generatedAt: new Date().toISOString(),
    input: { niche, audience, platform, goal, topic, icp, currentAccount },
    depth,
    ranAgents,
    failedAgents,
    parts,
    strategy,
    durationMs,
  };

  if (userId) {
    try {
      await store.setUser(userId, `council:run:${id}`, result);
      await store.lpushUser(userId, 'council:runs', {
        id,
        at: Date.now(),
        niche,
        platform,
        goal,
        ranAgentsCount: ranAgents.length,
      });
      await store.ltrim(store.userKey(userId, 'council:runs'), 0, 19);
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

const isOwner = (user) => user && (user.role === 'owner' || user.plan === 'owner');

export const handleGrowthCouncil = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/growth/council/run' && m === 'POST') {
    const input = body || {};
    const depth = isOwner(user)
      ? input.depth || 'deep'
      : user?.plan === 'free'
        ? 'standard'
        : input.depth || 'standard';
    const result = await runGrowthCouncil({ user, input, depth });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/growth/council/runs' && m === 'GET' && userId) {
    const items = await store.lrangeUser(userId, 'council:runs', 0, 19);
    json(res, 200, { items });
    return true;
  }

  if (path?.startsWith('/api/growth/council/run/') && m === 'GET' && userId) {
    const id = path.split('/').pop();
    const data = await store.getUser(userId, `council:run:${id}`);
    if (!data) {
      json(res, 404, { error: 'run no encontrado' });
      return true;
    }
    json(res, 200, data);
    return true;
  }

  return false;
};
