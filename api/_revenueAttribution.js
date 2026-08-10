/**
 * Revenue Attribution — mapeo contenido → conversiones → ROI.
 *
 * Cierra círculo de negocio:
 *   Autopilot → publica contenido
 *   + Cost Guardian → rastrea costo LLM
 *   + SellIA → registra ventas/conversiones
 *   → calcula ROI por pieza de contenido
 *   → propone optimizaciones
 *
 * Responde: ¿Qué contenido genera más ROI? ¿Vale la pena generar más carruseles vs reels?
 */

import { getProfile, saveProfile } from './_accountMemory.js';
import { askLLMJson } from './_llm.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

const DEFAULT_ATTRIBUTION_STORE = {
  posts: [],
  conversions: [],
  costLog: [],
  lastUpdated: new Date().toISOString(),
};

// ── Registrar publicación (desde Autopilot) ───────────────────────────────────

export const recordPublication = async (scope, accountId, publication) => {
  const {
    id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    timestamp = new Date().toISOString(),
    platform = 'instagram',
    format = 'carousel', // carousel, reel, image, story
    topic = '',
    hook = '',
    viralScore = 0,
    costLLM = 0, // costo en USD de generar este post
  } = publication || {};

  const store = await loadAttribution(scope, accountId);
  const post = {
    id,
    timestamp,
    platform,
    format,
    topic,
    hook,
    viralScore,
    costLLM,
    conversions: [], // se llenará después
    totalRevenue: 0,
    roi: 0,
  };

  store.posts = [...(store.posts || []), post];
  if (costLLM > 0) {
    store.costLog = [...(store.costLog || []), { postId: id, cost: costLLM, timestamp }];
  }

  await saveAttribution(scope, accountId, store);
  return post;
};

// ── Registrar conversión (desde SellIA o webhook externo) ───────────────────

export const recordConversion = async (scope, accountId, conversion) => {
  const {
    id = `conversion-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    postId = null, // post que generó esta conversión
    timestamp = new Date().toISOString(),
    type = 'sale', // sale, lead, signup, click
    value = 0, // revenue en USD (0 si lead/signup)
    source = 'instagram', // instagram, tiktok, email, affiliate, etc
    metadata = {}, // client data, product sold, etc
  } = conversion || {};

  const store = await loadAttribution(scope, accountId);

  // Crear entry de conversión
  const conv = {
    id,
    postId,
    timestamp,
    type,
    value,
    source,
    metadata,
  };

  store.conversions = [...(store.conversions || []), conv];

  // Actualizar post si hay postId
  if (postId) {
    const post = (store.posts || []).find((p) => p.id === postId);
    if (post) {
      post.conversions = [...(post.conversions || []), id];
      post.totalRevenue = (post.totalRevenue || 0) + value;
      post.roi = post.costLLM > 0 ? ((post.totalRevenue - post.costLLM) / post.costLLM) * 100 : 0;
    }
  }

  await saveAttribution(scope, accountId, store);
  return conv;
};

// ── Calcular ROI por formato/topic/período ─────────────────────────────────

export const calculateROIByDimension = async (scope, accountId, dimension = 'format') => {
  const store = await loadAttribution(scope, accountId);
  const posts = store.posts || [];

  if (dimension === 'format') {
    const byFormat = {};
    for (const post of posts) {
      const fmt = post.format || 'unknown';
      if (!byFormat[fmt]) {
        byFormat[fmt] = { count: 0, totalCost: 0, totalRevenue: 0, postIds: [] };
      }
      byFormat[fmt].count += 1;
      byFormat[fmt].totalCost += post.costLLM || 0;
      byFormat[fmt].totalRevenue += post.totalRevenue || 0;
      byFormat[fmt].postIds.push(post.id);
    }

    // Calcular ROI por formato
    const results = {};
    for (const [fmt, data] of Object.entries(byFormat)) {
      results[fmt] = {
        count: data.count,
        avgCostPerPost: data.totalCost / Math.max(1, data.count),
        avgRevenuePerPost: data.totalRevenue / Math.max(1, data.count),
        totalCost: data.totalCost,
        totalRevenue: data.totalRevenue,
        roi:
          data.totalCost > 0
            ? ((data.totalRevenue - data.totalCost) / data.totalCost) * 100
            : data.totalRevenue > 0
              ? 10000
              : 0,
        roiPct: `${((data.totalCost > 0 ? ((data.totalRevenue - data.totalCost) / data.totalCost) * 100 : 0) || 0).toFixed(1)}%`,
      };
    }
    return results;
  }

  if (dimension === 'topic') {
    const byTopic = {};
    for (const post of posts) {
      const topic = post.topic || 'unknown';
      if (!byTopic[topic]) {
        byTopic[topic] = { count: 0, totalCost: 0, totalRevenue: 0 };
      }
      byTopic[topic].count += 1;
      byTopic[topic].totalCost += post.costLLM || 0;
      byTopic[topic].totalRevenue += post.totalRevenue || 0;
    }

    const results = {};
    for (const [topic, data] of Object.entries(byTopic)) {
      results[topic] = {
        count: data.count,
        avgCostPerPost: data.totalCost / Math.max(1, data.count),
        avgRevenuePerPost: data.totalRevenue / Math.max(1, data.count),
        roi:
          data.totalCost > 0
            ? ((data.totalRevenue - data.totalCost) / data.totalCost) * 100
            : data.totalRevenue > 0
              ? 10000
              : 0,
      };
    }
    return results;
  }

  return {};
};

// ── Top performers + worst performers ─────────────────────────────────────

export const getPerformers = async (scope, accountId, limit = 10) => {
  const store = await loadAttribution(scope, accountId);
  const posts = store.posts || [];

  const withROI = posts.filter((p) => p.totalRevenue > 0 || p.costLLM > 0);
  const sorted = withROI.sort((a, b) => {
    const roiA = a.costLLM > 0 ? (a.totalRevenue - a.costLLM) / a.costLLM : a.totalRevenue;
    const roiB = b.costLLM > 0 ? (b.totalRevenue - b.costLLM) / b.costLLM : b.totalRevenue;
    return roiB - roiA;
  });

  const topPerformers = sorted.slice(0, limit);
  const worstPerformers = sorted.slice(-limit).reverse();

  return { topPerformers, worstPerformers };
};

// ── Análisis de eficiencia LLM ─────────────────────────────────────────────

export const getLLMEfficiency = async (scope, accountId) => {
  const store = await loadAttribution(scope, accountId);
  const posts = store.posts || [];
  const conversions = store.conversions || [];

  const totalCostLLM = posts.reduce((sum, p) => sum + (p.costLLM || 0), 0);
  const totalRevenue = conversions.reduce((sum, c) => sum + (c.value || 0), 0);
  const conversionCount = conversions.length;
  const postCount = posts.length;

  const avgCostPerPost = totalCostLLM / Math.max(1, postCount);
  const avgRevenuePerConversion = totalRevenue / Math.max(1, conversionCount);
  const conversionRate = conversionCount / Math.max(1, postCount);
  const roi = totalCostLLM > 0 ? ((totalRevenue - totalCostLLM) / totalCostLLM) * 100 : 0;

  return {
    totalCostLLM,
    totalRevenue,
    postCount,
    conversionCount,
    conversionRate: `${(conversionRate * 100).toFixed(2)}%`,
    avgCostPerPost,
    avgRevenuePerConversion,
    roi: `${roi.toFixed(1)}%`,
    recommendation:
      roi > 200
        ? '🚀 Excelente ROI. Escalar inversión en contenido.'
        : roi > 100
          ? '✅ Buen ROI. Mantener ritmo actual.'
          : roi > 0
            ? '⚠️ ROI positivo pero bajo. Optimizar contenido + targeting.'
            : '❌ ROI negativo. Revisar estrategia de conversión.',
  };
};

// ── Propuestas de optimización (LLM-powered) ──────────────────────────────

export const suggestOptimizations = async (scope, accountId) => {
  const efficiency = await getLLMEfficiency(scope, accountId);
  const byFormat = await calculateROIByDimension(scope, accountId, 'format');
  const byTopic = await calculateROIByDimension(scope, accountId, 'topic');

  // Encontrar formato/topic ganador
  let bestFormat = null;
  let bestFormatROI = -Infinity;
  for (const [fmt, data] of Object.entries(byFormat)) {
    if (data.roi > bestFormatROI) {
      bestFormatROI = data.roi;
      bestFormat = fmt;
    }
  }

  let bestTopic = null;
  let bestTopicROI = -Infinity;
  for (const [topic, data] of Object.entries(byTopic)) {
    if (data.roi > bestTopicROI) {
      bestTopicROI = data.roi;
      bestTopic = topic;
    }
  }

  const prompt = `Analiza estos datos de ROI de marketing y propone 3 acciones concretas:

Total ROI: ${efficiency.roi}
Costo LLM promedio/post: $${efficiency.avgCostPerPost.toFixed(2)}
Revenue promedio/conversión: $${efficiency.avgRevenuePerConversion.toFixed(2)}
Tasa de conversión: ${efficiency.conversionRate}

Mejor formato por ROI: ${bestFormat} (${bestFormatROI.toFixed(1)}%)
Mejor tema por ROI: ${bestTopic} (${bestTopicROI.toFixed(1)}%)

Formato/tema breakdown:
Formatos: ${JSON.stringify(byFormat)}
Temas: ${JSON.stringify(byTopic)}

Propone 3 acciones específicas y cuantificables para mejorar ROI. JSON:
{
  "actions": [
    {"action": "...", "expectedImpact": "...%", "rationale": "..."},
    ...
  ]
}`;

  const result = await askLLMJson(prompt, { maxTokens: 800 }).catch(() => null);
  return result?.actions || [];
};

// ── Carga/guarda attribution store ────────────────────────────────────────

const loadAttribution = async (scope, accountId) => {
  try {
    const profile = await getProfile(scope, accountId);
    return profile?.attributionStore || DEFAULT_ATTRIBUTION_STORE;
  } catch {
    return DEFAULT_ATTRIBUTION_STORE;
  }
};

const saveAttribution = async (scope, accountId, attributionStore) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, attributionStore });
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleRevenueAttribution = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // POST /api/revenue/record-publication
  if (path === '/api/revenue/record-publication' && m === 'POST') {
    const { platform, format, topic, hook, viralScore, costLLM } = body || {};
    const accountId = body?.accountId || scope;
    const post = await recordPublication(scope, accountId, {
      platform,
      format,
      topic,
      hook,
      viralScore: parseFloat(viralScore) || 0,
      costLLM: parseFloat(costLLM) || 0,
    }).catch(() => null);
    return json(post ? 200 : 500, { ok: post ? true : false, post });
  }

  // POST /api/revenue/record-conversion
  if (path === '/api/revenue/record-conversion' && m === 'POST') {
    const { postId, type, value, source, metadata } = body || {};
    const accountId = body?.accountId || scope;
    const conv = await recordConversion(scope, accountId, {
      postId,
      type,
      value: parseFloat(value) || 0,
      source,
      metadata,
    }).catch(() => null);
    return json(conv ? 200 : 500, { ok: conv ? true : false, conversion: conv });
  }

  // GET /api/revenue/roi?dimension=format|topic
  if (path === '/api/revenue/roi' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const dimension = req.query?.dimension || 'format';
    const roi = await calculateROIByDimension(scope, accountId, dimension).catch(() => ({}));
    return json(200, { ok: true, dimension, roi });
  }

  // GET /api/revenue/efficiency
  if (path === '/api/revenue/efficiency' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const efficiency = await getLLMEfficiency(scope, accountId).catch(() => ({}));
    return json(200, { ok: true, efficiency });
  }

  // GET /api/revenue/performers
  if (path === '/api/revenue/performers' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const limit = parseInt(req.query?.limit || '10', 10);
    const result = await getPerformers(scope, accountId, limit).catch(() => ({}));
    return json(200, { ok: true, ...result });
  }

  // GET /api/revenue/optimize
  if (path === '/api/revenue/optimize' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const actions = await suggestOptimizations(scope, accountId).catch(() => []);
    return json(200, { ok: true, optimizations: actions });
  }

  return false;
};
