/**
 * Account Memory — memoria persistente por cuenta de IG/TikTok + loop de datos reales.
 *
 * Etapa 1 (memoria): recuerda perfil (nicho, voz, marca, objetivo) e historial de planes
 * generados entre sesiones, por cuenta.
 * Etapa 2 (datos reales): ingesta métricas reales de posts publicados y deriva insights
 * deterministas (qué formato/ángulo/topic rinde) que se reinyectan en la estrategia.
 *
 * 100% determinista ($0, sin LLM). Backend: _store.js (Redis/KV o memoria).
 *
 * Claves:
 *   feedia:acct:{scope}:{accountId}:profile   → objeto perfil
 *   feedia:acct:{scope}:{accountId}:history   → lista (cap 50) de resúmenes de plan
 *   feedia:acct:{scope}:{accountId}:metrics   → lista (cap 100) de métricas reales
 */

import * as store from './_store.js';

const HISTORY_CAP = 50;
const METRICS_CAP = 100;

export const slugifyAccount = (handle = '') =>
  String(handle)
    .toLowerCase()
    .trim()
    .replace(/^@/, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .slice(0, 48) || 'default';

const base = (scope, accountId) => `feedia:acct:${scope || 'anon'}:${slugifyAccount(accountId)}`;
const kProfile = (s, a) => `${base(s, a)}:profile`;
const kHistory = (s, a) => `${base(s, a)}:history`;
const kMetrics = (s, a) => `${base(s, a)}:metrics`;

// ── Perfil ──
export const getProfile = async (scope, accountId) => {
  try {
    return (await store.get(kProfile(scope, accountId))) || null;
  } catch {
    return null;
  }
};

export const saveProfile = async (scope, accountId, patch = {}) => {
  const prev = (await getProfile(scope, accountId)) || {};
  const next = {
    handle: slugifyAccount(accountId),
    ...prev,
    ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined && v !== '')),
    updatedAt: new Date().toISOString(),
  };
  try {
    await store.set(kProfile(scope, accountId), next);
  } catch {}
  return next;
};

// ── Historial de planes ──
export const recordPlan = async (scope, accountId, summary = {}) => {
  const entry = { ts: new Date().toISOString(), ...summary };
  try {
    await store.lpush(kHistory(scope, accountId), entry);
    await store.ltrim(kHistory(scope, accountId), 0, HISTORY_CAP - 1);
  } catch {}
  return entry;
};

export const getHistory = async (scope, accountId, n = HISTORY_CAP) => {
  try {
    return (await store.lrange(kHistory(scope, accountId), 0, n - 1)) || [];
  } catch {
    return [];
  }
};

// ── Métricas reales (loop de datos) ──
// entry: { topic, format, reach, likes, saves, shares, comments, follows, postedAt?, url?, notes? }
export const recordMetrics = async (scope, accountId, entry = {}) => {
  const num = (v) => (v == null || v === '' ? null : Number(v));
  const clean = {
    ts: new Date().toISOString(),
    topic: entry.topic || '',
    format: entry.format || 'reel',
    reach: num(entry.reach),
    likes: num(entry.likes),
    saves: num(entry.saves),
    shares: num(entry.shares),
    comments: num(entry.comments),
    follows: num(entry.follows),
    postedAt: entry.postedAt || null,
    url: entry.url || null,
    notes: entry.notes || '',
  };
  try {
    await store.lpush(kMetrics(scope, accountId), clean);
    await store.ltrim(kMetrics(scope, accountId), 0, METRICS_CAP - 1);
  } catch {}
  return clean;
};

export const getMetrics = async (scope, accountId, n = METRICS_CAP) => {
  try {
    return (await store.lrange(kMetrics(scope, accountId), 0, n - 1)) || [];
  } catch {
    return [];
  }
};

// Engagement score de una métrica (saves y shares pesan más — señales algorítmicas top).
const engagementScore = (m) => {
  const reach = m.reach || 0;
  const weighted =
    (m.saves || 0) * 3 + (m.shares || 0) * 3 + (m.comments || 0) * 2 + (m.follows || 0) * 4 + (m.likes || 0) * 1;
  if (reach > 0) return weighted / reach; // tasa ponderada
  return weighted; // sin reach: score absoluto
};

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

/**
 * Deriva insights deterministas del historial + métricas reales.
 * @returns { hasData, postsTracked, bestFormat, formatBreakdown, topPosts, worstPosts,
 *            trend, recommendations, recentTopics, summaryText }
 */
export const computeInsights = (history = [], metrics = []) => {
  const out = {
    hasData: false,
    postsTracked: metrics.length,
    plansGenerated: history.length,
    bestFormat: null,
    formatBreakdown: {},
    topPosts: [],
    trend: 'sin datos',
    recommendations: [],
    recentTopics: [],
    summaryText: '',
  };

  // Topics recientes (evitar repetir muy seguido)
  out.recentTopics = [...new Set(history.map((h) => h.topic).filter(Boolean))].slice(0, 8);

  if (!metrics.length) {
    if (history.length) {
      out.summaryText = `Historial: ${history.length} planes generados antes. Topics recientes: ${out.recentTopics.slice(0, 5).join(', ') || '—'}. Aún sin métricas reales cargadas — cargá resultados de posts publicados para que la estrategia aprenda qué funciona.`;
    }
    return out;
  }

  out.hasData = true;

  // Breakdown por formato
  const byFormat = {};
  for (const m of metrics) {
    const f = m.format || 'reel';
    (byFormat[f] = byFormat[f] || []).push(engagementScore(m));
  }
  for (const [f, scores] of Object.entries(byFormat)) {
    out.formatBreakdown[f] = { posts: scores.length, avgScore: Number(avg(scores).toFixed(3)) };
  }
  out.bestFormat = Object.entries(out.formatBreakdown).sort((a, b) => b[1].avgScore - a[1].avgScore)[0]?.[0] || null;

  // Top posts por engagement
  const scored = metrics.map((m) => ({ ...m, _score: engagementScore(m) })).sort((a, b) => b._score - a._score);
  out.topPosts = scored.slice(0, 3).map((m) => ({
    topic: m.topic,
    format: m.format,
    score: Number(m._score.toFixed(3)),
    saves: m.saves,
    shares: m.shares,
  }));

  // Tendencia: comparar mitad reciente vs antigua (metrics está en orden lpush = más nuevo primero)
  if (metrics.length >= 4) {
    const half = Math.floor(metrics.length / 2);
    const recent = avg(metrics.slice(0, half).map(engagementScore));
    const older = avg(metrics.slice(half).map(engagementScore));
    out.trend = recent > older * 1.1 ? 'creciendo' : recent < older * 0.9 ? 'bajando' : 'estable';
  } else {
    out.trend = 'pocos datos (cargá más para tendencia)';
  }

  // Recomendaciones accionables
  if (out.bestFormat)
    out.recommendations.push(`Doblá apuesta en ${out.bestFormat} — es tu formato de mayor rendimiento.`);
  const weakFormat = Object.entries(out.formatBreakdown).sort((a, b) => a[1].avgScore - b[1].avgScore)[0];
  if (weakFormat && Object.keys(out.formatBreakdown).length > 1 && weakFormat[1].posts >= 2) {
    out.recommendations.push(`Revisá tu enfoque en ${weakFormat[0]} (bajo rendimiento) o reasigná ese esfuerzo.`);
  }
  if (out.topPosts[0]?.topic)
    out.recommendations.push(
      `Tu mejor post fue sobre "${out.topPosts[0].topic}" — generá variaciones/secuela de ese ángulo.`,
    );
  if (out.trend === 'bajando')
    out.recommendations.push(
      'Tendencia a la baja: probá un ángulo nuevo (provocador/contraintuitivo) para romper el patrón.',
    );
  if (out.trend === 'creciendo')
    out.recommendations.push('Tendencia al alza: mantené cadencia y duplicá lo que viene funcionando.');

  // Texto para inyectar en el brief de generación
  const topStr = out.topPosts.map((p) => `"${p.topic}" (${p.format})`).join(', ');
  out.summaryText = `APRENDIZAJES DE ESTA CUENTA (datos reales de ${metrics.length} posts):
- Formato que más rinde: ${out.bestFormat || 'n/d'} | Tendencia: ${out.trend}
- Posts top: ${topStr || '—'}
- ${out.recommendations.join(' ')}
Usá estos aprendizajes: priorizá el formato/ángulo que ya funcionó en esta cuenta y evitá repetir literal los topics recientes (${out.recentTopics.slice(0, 5).join(', ') || '—'}).`;

  return out;
};

/**
 * Contexto de memoria listo para inyectar + perfil mergeado.
 * @returns { profile, insights, history, metrics, memoryText }
 */
export const buildMemoryContext = async (scope, accountId) => {
  const [profile, history, metrics] = await Promise.all([
    getProfile(scope, accountId),
    getHistory(scope, accountId),
    getMetrics(scope, accountId),
  ]);
  const insights = computeInsights(history, metrics);
  return { profile, insights, history, metrics, memoryText: insights.summaryText };
};

// ── HTTP handler ──
export const handleAccountMemory = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/account/profile' && m === 'POST') {
    const { accountId, action, ...fields } = body || {};
    if (!accountId) return json(400, { error: 'accountId requerido' });
    if (action === 'get') return json(200, { profile: await getProfile(scope, accountId) });
    const profile = await saveProfile(scope, accountId, fields);
    return json(200, { ok: true, profile });
  }

  if (path === '/api/account/metrics' && m === 'POST') {
    const { accountId, entry } = body || {};
    if (!accountId) return json(400, { error: 'accountId requerido' });
    const saved = await recordMetrics(scope, accountId, entry || body || {});
    const ctx2 = await buildMemoryContext(scope, accountId);
    return json(200, { ok: true, saved, insights: ctx2.insights });
  }

  if (path === '/api/account/insights' && m === 'POST') {
    const { accountId } = body || {};
    if (!accountId) return json(400, { error: 'accountId requerido' });
    const c = await buildMemoryContext(scope, accountId);
    return json(200, {
      profile: c.profile,
      insights: c.insights,
      history: c.history.slice(0, 10),
      metricsCount: c.metrics.length,
    });
  }

  return false;
};
