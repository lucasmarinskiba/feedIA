/**
 * Fan Recognition + Lead Pipeline — identifica VIPs y scores leads automáticamente.
 *
 * Dos flujos:
 * 1. Fan Recognition: rastrear followers leales (high engagement, repeat purchases)
 *    → VIP tier system (Bronze/Silver/Gold/Platinum)
 *    → rewards: early access, exclusive content, discounts
 *
 * 2. Lead Pipeline: leads automáticos con scoring (hot/warm/cold)
 *    → detecta intención de compra
 *    → propone CTA/follow-up automático
 *    → mide conversion rate por score
 */

import { getProfile, saveProfile } from './_accountMemory.js';
import { askLLMJson } from './_llm.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

const DEFAULT_FAN_STORE = {
  fans: [],
  vips: [],
  lastUpdated: new Date().toISOString(),
};

const DEFAULT_LEAD_STORE = {
  leads: [],
  lastUpdated: new Date().toISOString(),
};

const VIP_TIERS = {
  BRONZE: { min_score: 100, rewards: ['5% discount'], label: 'Bronze VIP' },
  SILVER: { min_score: 250, rewards: ['10% discount', 'early access'], label: 'Silver VIP' },
  GOLD: { min_score: 500, rewards: ['15% discount', 'early access', 'exclusive content'], label: 'Gold VIP' },
  PLATINUM: { min_score: 1000, rewards: ['20% discount', 'vip events', 'personal manager'], label: 'Platinum VIP' },
};

// ── Computar score de fan (engagement + purchases) ───────────────────────────

const computeFanScore = (fan) => {
  let score = 0;

  // Engagement: comments, likes, shares
  score += (fan.engagementCount || 0) * 2; // 2 puntos por interacción
  score +=
    (fan.followsSince
      ? Math.floor((Date.now() - new Date(fan.followsSince).getTime()) / (1000 * 60 * 60 * 24 * 30))
      : 0) * 5; // 5 puntos por mes de seguimiento

  // Purchases
  score += (fan.purchaseCount || 0) * 50; // 50 puntos por compra
  score += (fan.totalSpent || 0) * 0.1; // 0.1 puntos por dólar gastado

  // Recency: penalidad si no interactuó hace mucho
  const daysSinceLastEngagement = fan.lastEngagementAt
    ? Math.floor((Date.now() - new Date(fan.lastEngagementAt).getTime()) / (1000 * 60 * 60 * 24))
    : 365;
  if (daysSinceLastEngagement > 90) {
    score *= 0.5; // 50% penalty si no interactuó en 90 días
  }

  return Math.floor(score);
};

const getVIPTier = (score) => {
  if (score >= VIP_TIERS.PLATINUM.min_score) return 'PLATINUM';
  if (score >= VIP_TIERS.GOLD.min_score) return 'GOLD';
  if (score >= VIP_TIERS.SILVER.min_score) return 'SILVER';
  if (score >= VIP_TIERS.BRONZE.min_score) return 'BRONZE';
  return null;
};

// ── Registrar interacción de fan ──────────────────────────────────────────────

export const recordFanEngagement = async (scope, accountId, engagement) => {
  const { username, type = 'comment', postId = null } = engagement || {};
  if (!username) return null;

  const store = await loadFans(scope, accountId);
  let fan = (store.fans || []).find((f) => f.username === username);

  if (!fan) {
    fan = {
      username,
      followsSince: new Date().toISOString(),
      engagementCount: 0,
      purchaseCount: 0,
      totalSpent: 0,
      vipTier: null,
      engagementHistory: [],
    };
    store.fans = [...(store.fans || []), fan];
  }

  fan.engagementCount = (fan.engagementCount || 0) + 1;
  fan.lastEngagementAt = new Date().toISOString();
  fan.engagementHistory = [
    ...((fan.engagementHistory || []).slice(-9), // mantener últimas 10
    { type, postId, at: new Date().toISOString() }),
  ];

  // Recalcular score y tier
  fan.score = computeFanScore(fan);
  fan.vipTier = getVIPTier(fan.score);

  await saveFans(scope, accountId, store);
  return fan;
};

// ── Registrar compra de fan ──────────────────────────────────────────────────

export const recordFanPurchase = async (scope, accountId, purchase) => {
  const { username, amount = 0, productId = null } = purchase || {};
  if (!username) return null;

  const store = await loadFans(scope, accountId);
  let fan = (store.fans || []).find((f) => f.username === username);

  if (!fan) {
    fan = {
      username,
      followsSince: new Date().toISOString(),
      engagementCount: 0,
      purchaseCount: 0,
      totalSpent: 0,
      vipTier: null,
      purchaseHistory: [],
    };
    store.fans = [...(store.fans || []), fan];
  }

  fan.purchaseCount = (fan.purchaseCount || 0) + 1;
  fan.totalSpent = (fan.totalSpent || 0) + amount;
  fan.lastPurchaseAt = new Date().toISOString();
  fan.purchaseHistory = [
    ...((fan.purchaseHistory || []).slice(-4), { productId, amount, at: new Date().toISOString() }),
  ];

  fan.score = computeFanScore(fan);
  fan.vipTier = getVIPTier(fan.score);

  await saveFans(scope, accountId, store);
  return fan;
};

// ── Obtener top fans / VIPs ──────────────────────────────────────────────────

export const getTopFans = async (scope, accountId, limit = 20) => {
  const store = await loadFans(scope, accountId);
  const fans = store.fans || [];
  return fans.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
};

export const getVIPs = async (scope, accountId) => {
  const store = await loadFans(scope, accountId);
  const fans = store.fans || [];
  return fans
    .filter((f) => f.vipTier)
    .sort((a, b) => {
      const tierOrder = { PLATINUM: 4, GOLD: 3, SILVER: 2, BRONZE: 1 };
      return (tierOrder[b.vipTier] || 0) - (tierOrder[a.vipTier] || 0);
    });
};

// ── Lead Pipeline: crear + score lead ────────────────────────────────────────

const scoreLeadIntent = async (leadText) => {
  const prompt = `Calcula probabilidad de compra (0-100) del siguiente texto de usuario:

Texto: "${leadText}"

Señales hot (alta intención): pregunta por precio, expresa urgencia, pide demo, compara productos
Señales warm (media intención): pregunta general sobre producto, pide recomendación
Señales cold (baja intención): solo curiosidad, pregunta sobre empresa

Devolvé JSON: { "score": 0-100, "signals": ["..."], "tier": "hot|warm|cold" }`;

  const result = await askLLMJson(prompt, { maxTokens: 200 }).catch(() => ({ score: 30, tier: 'cold', signals: [] }));
  return result;
};

export const createLead = async (scope, accountId, lead) => {
  const { source = 'instagram', username = '', email = '', text = '', metadata = {} } = lead || {};

  const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const intentScore = await scoreLeadIntent(text);

  const leadEntry = {
    id,
    source,
    username,
    email,
    text,
    metadata,
    createdAt: new Date().toISOString(),
    intentScore: intentScore.score || 30,
    tier: intentScore.tier || 'cold',
    signals: intentScore.signals || [],
    status: 'new', // new → contacted → qualified → converted
    contactedAt: null,
    convertedAt: null,
  };

  const store = await loadLeads(scope, accountId);
  store.leads = [...(store.leads || []), leadEntry];
  await saveLeads(scope, accountId, store);

  return leadEntry;
};

// ── Marcar lead como contactado / convertido ──────────────────────────────────

export const contactLead = async (scope, accountId, leadId, message = '') => {
  const store = await loadLeads(scope, accountId);
  const lead = (store.leads || []).find((l) => l.id === leadId);
  if (!lead) return null;

  lead.status = 'contacted';
  lead.contactedAt = new Date().toISOString();
  lead.contactMessage = message;
  await saveLeads(scope, accountId, store);
  return lead;
};

export const convertLead = async (scope, accountId, leadId, amount = 0) => {
  const store = await loadLeads(scope, accountId);
  const lead = (store.leads || []).find((l) => l.id === leadId);
  if (!lead) return null;

  lead.status = 'converted';
  lead.convertedAt = new Date().toISOString();
  lead.conversionAmount = amount;

  // Agregar a fans si tiene username
  if (lead.username) {
    await recordFanPurchase(scope, accountId, { username: lead.username, amount });
  }

  await saveLeads(scope, accountId, store);
  return lead;
};

// ── Obtener leads por tier ───────────────────────────────────────────────────

export const getLeadsByTier = async (scope, accountId, tier = 'hot') => {
  const store = await loadLeads(scope, accountId);
  const leads = store.leads || [];
  return leads
    .filter((l) => l.tier === tier && l.status === 'new')
    .sort((a, b) => (b.intentScore || 0) - (a.intentScore || 0));
};

// ── Stats: conversion rate por tier ──────────────────────────────────────────

export const getLeadStats = async (scope, accountId) => {
  const store = await loadLeads(scope, accountId);
  const leads = store.leads || [];

  const tiers = { hot: [], warm: [], cold: [] };
  for (const lead of leads) {
    if (tiers[lead.tier]) tiers[lead.tier].push(lead);
  }

  const stats = {};
  for (const [tier, tierLeads] of Object.entries(tiers)) {
    const converted = tierLeads.filter((l) => l.status === 'converted').length;
    const rate = tierLeads.length > 0 ? (converted / tierLeads.length) * 100 : 0;
    stats[tier] = {
      count: tierLeads.length,
      converted,
      conversionRate: `${rate.toFixed(1)}%`,
      avgScore:
        tierLeads.length > 0
          ? Math.floor(tierLeads.reduce((s, l) => s + (l.intentScore || 0), 0) / tierLeads.length)
          : 0,
    };
  }

  return stats;
};

// ── Carga/guarda stores ──────────────────────────────────────────────────────

const loadFans = async (scope, accountId) => {
  try {
    const profile = await getProfile(scope, accountId);
    return profile?.fanStore || DEFAULT_FAN_STORE;
  } catch {
    return DEFAULT_FAN_STORE;
  }
};

const saveFans = async (scope, accountId, fanStore) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, fanStore });
};

const loadLeads = async (scope, accountId) => {
  try {
    const profile = await getProfile(scope, accountId);
    return profile?.leadStore || DEFAULT_LEAD_STORE;
  } catch {
    return DEFAULT_LEAD_STORE;
  }
};

const saveLeads = async (scope, accountId, leadStore) => {
  const profile = await getProfile(scope, accountId).catch(() => ({}));
  await saveProfile(scope, accountId, { ...profile, leadStore });
};

// ── HTTP handler ──────────────────────────────────────────────────────────────

export const handleFanRecognition = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  const scope = ctx.userId || 'anon';

  // POST /api/fans/engagement
  if (path === '/api/fans/engagement' && m === 'POST') {
    const { username, type, postId } = body || {};
    const accountId = body?.accountId || scope;
    if (!username) return json(400, { ok: false, error: 'missing username' });
    const fan = await recordFanEngagement(scope, accountId, { username, type, postId }).catch(() => null);
    return json(fan ? 200 : 500, { ok: fan ? true : false, fan });
  }

  // POST /api/fans/purchase
  if (path === '/api/fans/purchase' && m === 'POST') {
    const { username, amount, productId } = body || {};
    const accountId = body?.accountId || scope;
    if (!username) return json(400, { ok: false, error: 'missing username' });
    const fan = await recordFanPurchase(scope, accountId, { username, amount, productId }).catch(() => null);
    return json(fan ? 200 : 500, { ok: fan ? true : false, fan });
  }

  // GET /api/fans/top
  if (path === '/api/fans/top' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const limit = parseInt(req.query?.limit || '20', 10);
    const fans = await getTopFans(scope, accountId, limit).catch(() => []);
    return json(200, { ok: true, fans });
  }

  // GET /api/fans/vips
  if (path === '/api/fans/vips' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const vips = await getVIPs(scope, accountId).catch(() => []);
    return json(200, { ok: true, vips });
  }

  // POST /api/leads/create
  if (path === '/api/leads/create' && m === 'POST') {
    const { source, username, email, text, metadata } = body || {};
    const accountId = body?.accountId || scope;
    if (!text) return json(400, { ok: false, error: 'missing text' });
    const lead = await createLead(scope, accountId, { source, username, email, text, metadata }).catch(() => null);
    return json(lead ? 200 : 500, { ok: lead ? true : false, lead });
  }

  // POST /api/leads/:id/contact
  if (path.startsWith('/api/leads/') && path.endsWith('/contact') && m === 'POST') {
    const leadId = path.split('/')[3];
    const { message } = body || {};
    const accountId = body?.accountId || scope;
    const lead = await contactLead(scope, accountId, leadId, message).catch(() => null);
    return json(lead ? 200 : 400, { ok: lead ? true : false, lead });
  }

  // POST /api/leads/:id/convert
  if (path.startsWith('/api/leads/') && path.endsWith('/convert') && m === 'POST') {
    const leadId = path.split('/')[3];
    const { amount } = body || {};
    const accountId = body?.accountId || scope;
    const lead = await convertLead(scope, accountId, leadId, parseFloat(amount) || 0).catch(() => null);
    return json(lead ? 200 : 400, { ok: lead ? true : false, lead });
  }

  // GET /api/leads?tier=hot|warm|cold
  if (path === '/api/leads' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const tier = req.query?.tier || 'hot';
    const leads = await getLeadsByTier(scope, accountId, tier).catch(() => []);
    return json(200, { ok: true, leads });
  }

  // GET /api/leads/stats
  if (path === '/api/leads/stats' && m === 'GET') {
    const accountId = req.query?.accountId || scope;
    const stats = await getLeadStats(scope, accountId).catch(() => ({}));
    return json(200, { ok: true, stats });
  }

  return false;
};
