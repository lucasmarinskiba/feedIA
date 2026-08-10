/**
 * Mention Tracker serverless — tracking de menciones/tags de marca en redes.
 *
 * Vigila: historias tagged, posts que mencionan @cuenta, comentarios con hashtag.
 * Clasifica por sentiment (crítico/negativo/neutro/positivo).
 * Prioriza respuesta por importancia (influencer, crítica, etc).
 *
 * Persistencia: usa _accountMemory.js (MongoDB).
 * Port de src/capabilities/community/mentionTracker.ts → serverless.
 */

import { getProfile, saveProfile } from './_accountMemory.js';
import { askLLMJson } from './_llm.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

const DEFAULT_MENTION_STORE = {
  mentions: [],
  lastUpdated: new Date().toISOString(),
  stats: {
    totalMentions: 0,
    positiveLast30Days: 0,
    negativeLast30Days: 0,
    influencerMentionsLast30Days: 0,
  },
};

// ── Clasificación rápida de sentiment ─────────────────────────────────────────

const CRITICAL_WORDS_ES = ['estafa', 'fraude', 'denuncia', 'demanda', 'mentirosos', 'roban', 'horrible', 'criminal'];
const NEGATIVE_WORDS_ES = ['malo', 'pésimo', 'no recomiendo', 'no funciona', 'decepción', 'queja', 'timador', 'falso'];
const POSITIVE_WORDS_ES = [
  'gracias',
  'genial',
  'excelente',
  'recomiendo',
  'top',
  'crack',
  'amor',
  'increíble',
  'fantástico',
  'maravilloso',
];

const classifySentiment = (text) => {
  const lower = text.toLowerCase();
  if (CRITICAL_WORDS_ES.some((w) => lower.includes(w))) return 'critical';
  if (NEGATIVE_WORDS_ES.some((w) => lower.includes(w))) return 'negative';
  if (POSITIVE_WORDS_ES.some((w) => lower.includes(w))) return 'positive';
  return 'neutral';
};

const computeImportance = (sentiment, followerCount = 0, mentionType = 'comment-mention') => {
  if (sentiment === 'critical') return 'critical';
  if (followerCount > 50000) return 'critical';
  if (followerCount > 10000) return 'high';
  if (sentiment === 'negative') return 'high';
  if (mentionType === 'story-mention' || mentionType === 'post-tag') return 'medium';
  return 'low';
};

// ── Carga/Guarda mentions ─────────────────────────────────────────────────────

const loadMentions = async (scope, accountId) => {
  try {
    const profile = await getProfile(scope, accountId);
    return profile?.mentionStore || DEFAULT_MENTION_STORE;
  } catch {
    return DEFAULT_MENTION_STORE;
  }
};

const saveMentions = async (scope, accountId, mentionStore) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, mentionStore });
};

// ── Agregar mención ──────────────────────────────────────────────────────────

export const addMention = async (scope, accountId, mention) => {
  const store = await loadMentions(scope, accountId);
  const sentiment = classifySentiment(mention.context || '');
  const importance = computeImportance(sentiment, mention.authorFollowerCount || 0, mention.type || 'comment-mention');

  const entry = {
    id: `mention-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    ...mention,
    sentiment,
    importance,
    acknowledged: false,
    acknowledgedAt: null,
    promotedToUGC: false,
    tags: mention.tags || [],
    notes: mention.notes || [],
    detectedAt: new Date().toISOString(),
  };

  store.mentions = [...(store.mentions || []), entry];
  store.stats.totalMentions = (store.stats.totalMentions || 0) + 1;

  // Actualizar stats por sentiment (últimos 30 días)
  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  if (new Date(entry.detectedAt).getTime() > thirtyDaysAgo) {
    if (sentiment === 'positive') store.stats.positiveLast30Days = (store.stats.positiveLast30Days || 0) + 1;
    if (sentiment === 'negative') store.stats.negativeLast30Days = (store.stats.negativeLast30Days || 0) + 1;
    if ((mention.authorFollowerCount || 0) > 10000)
      store.stats.influencerMentionsLast30Days = (store.stats.influencerMentionsLast30Days || 0) + 1;
  }

  await saveMentions(scope, accountId, store);
  return entry;
};

// ── Marcar como reconocida (respondida/reaccionada) ────────────────────────────

export const acknowledgeMention = async (scope, accountId, mentionId) => {
  const store = await loadMentions(scope, accountId);
  const mention = (store.mentions || []).find((m) => m.id === mentionId);
  if (!mention) return { ok: false, error: 'mention-not-found' };

  mention.acknowledged = true;
  mention.acknowledgedAt = new Date().toISOString();
  await saveMentions(scope, accountId, store);

  return { ok: true, mention };
};

// ── Promover a UGC (user-generated content) ────────────────────────────────

export const promoteToUGC = async (scope, accountId, mentionId, ugcMetadata = {}) => {
  const store = await loadMentions(scope, accountId);
  const mention = (store.mentions || []).find((m) => m.id === mentionId);
  if (!mention) return { ok: false, error: 'mention-not-found' };

  mention.promotedToUGC = true;
  mention.acknowledged = true;
  mention.acknowledgedAt = mention.acknowledgedAt || new Date().toISOString();
  mention.ugcMetadata = ugcMetadata;

  await saveMentions(scope, accountId, store);
  return { ok: true, mention };
};

// ── Filtrar por importancia + sentiment ───────────────────────────────────────

export const getMentionsByFilter = async (scope, accountId, filters = {}) => {
  const store = await loadMentions(scope, accountId);
  const { importance, sentiment, acknowledged, limit = 50 } = filters;

  let results = store.mentions || [];

  if (importance) {
    results = results.filter((m) => m.importance === importance);
  }
  if (sentiment) {
    results = results.filter((m) => m.sentiment === sentiment);
  }
  if (acknowledged !== undefined) {
    results = results.filter((m) => m.acknowledged === Boolean(acknowledged));
  }

  // Ordenar por fecha descendente
  results = results.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());

  return results.slice(0, limit);
};

// ── Dashboard: menciones críticas pendientes ──────────────────────────────────

export const getCriticalMentions = async (scope, accountId) => {
  const critical = await getMentionsByFilter(scope, accountId, {
    importance: 'critical',
    acknowledged: false,
    limit: 20,
  });

  const high = await getMentionsByFilter(scope, accountId, {
    importance: 'high',
    acknowledged: false,
    limit: 10,
  });

  return { critical, high, totalUnacknowledged: critical.length + high.length };
};

// ── Análisis de reach potencial ───────────────────────────────────────────────

export const calculateReach = async (scope, accountId, mentionId) => {
  const store = await loadMentions(scope, accountId);
  const mention = (store.mentions || []).find((m) => m.id === mentionId);
  if (!mention) return null;

  // Heurística simple: followers del autor × peso de importancia
  const authorReach = mention.authorFollowerCount || 0;
  const importanceWeights = { critical: 1.5, high: 1.2, medium: 1.0, low: 0.5 };
  const weight = importanceWeights[mention.importance] || 1;

  return Math.floor(authorReach * weight);
};

// ── Estadísticas ──────────────────────────────────────────────────────────────

export const getMentionStats = async (scope, accountId) => {
  const store = await loadMentions(scope, accountId);
  const mentions = store.mentions || [];

  const now = Date.now();
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
  const last30 = mentions.filter((m) => new Date(m.detectedAt).getTime() > thirtyDaysAgo);

  const sentimentBreakdown = {
    positive: mentions.filter((m) => m.sentiment === 'positive').length,
    neutral: mentions.filter((m) => m.sentiment === 'neutral').length,
    negative: mentions.filter((m) => m.sentiment === 'negative').length,
    critical: mentions.filter((m) => m.sentiment === 'critical').length,
  };

  const importanceBreakdown = {
    critical: mentions.filter((m) => m.importance === 'critical').length,
    high: mentions.filter((m) => m.importance === 'high').length,
    medium: mentions.filter((m) => m.importance === 'medium').length,
    low: mentions.filter((m) => m.importance === 'low').length,
  };

  const unacknowledgedCount = mentions.filter((m) => !m.acknowledged).length;
  const influencerMentions = mentions.filter((m) => (m.authorFollowerCount || 0) > 10000).length;

  return {
    total: mentions.length,
    last30Days: last30.length,
    sentiment: sentimentBreakdown,
    importance: importanceBreakdown,
    unacknowledged: unacknowledgedCount,
    influencerMentions,
    responseRatePercent:
      mentions.length > 0 ? Math.round(((mentions.length - unacknowledgedCount) / mentions.length) * 100) : 0,
  };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleMentionTracker = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // POST /api/mentions/add
  if (path === '/api/mentions/add' && m === 'POST') {
    const { type, authorUsername, context, postUrl, authorFollowerCount, tags } = body || {};
    if (!type || !context) return json(400, { ok: false, error: 'missing type or context' });
    const accountId = body.accountId || scope;
    const mention = await addMention(scope, accountId, {
      type,
      authorUsername,
      context,
      postUrl,
      authorFollowerCount,
      tags,
    }).catch(() => null);
    return json(mention ? 200 : 500, { ok: mention ? true : false, mention });
  }

  // GET /api/mentions/critical
  if (path === '/api/mentions/critical' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const result = await getCriticalMentions(scope, accountId).catch(() => ({}));
    return json(200, { ok: true, ...result });
  }

  // GET /api/mentions/stats
  if (path === '/api/mentions/stats' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const stats = await getMentionStats(scope, accountId).catch(() => ({}));
    return json(200, { ok: true, stats });
  }

  // GET /api/mentions?importance=...&sentiment=...&acknowledged=false
  if (path === '/api/mentions' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const mentions = await getMentionsByFilter(scope, accountId, {
      importance: req.query?.importance,
      sentiment: req.query?.sentiment,
      acknowledged: req.query?.acknowledged !== 'false' ? undefined : false,
      limit: parseInt(req.query?.limit || '50', 10),
    }).catch(() => []);
    return json(200, { ok: true, mentions });
  }

  // POST /api/mentions/:id/acknowledge
  if (path.startsWith('/api/mentions/') && path.endsWith('/acknowledge') && m === 'POST') {
    const mentionId = path.split('/')[3];
    const accountId = body?.accountId || scope;
    const result = await acknowledgeMention(scope, accountId, mentionId).catch(() => null);
    return json(result?.ok ? 200 : 400, result);
  }

  // POST /api/mentions/:id/promote-ugc
  if (path.startsWith('/api/mentions/') && path.endsWith('/promote-ugc') && m === 'POST') {
    const mentionId = path.split('/')[3];
    const accountId = body?.accountId || scope;
    const result = await promoteToUGC(scope, accountId, mentionId, body?.metadata || {}).catch(() => null);
    return json(result?.ok ? 200 : 400, result);
  }

  return false;
};
