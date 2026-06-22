/**
 * Stripe billing — checkout, webhook, customer portal.
 *
 * Env vars:
 *   STRIPE_SECRET_KEY            sk_live_... o sk_test_...
 *   STRIPE_WEBHOOK_SECRET        whsec_... (firma de webhooks)
 *   STRIPE_PRICE_STARTER         price_xxx (mensual)
 *   STRIPE_PRICE_PRO             price_xxx
 *   STRIPE_PRICE_AGENCY          price_xxx
 *   PUBLIC_BASE_URL              https://feedia.vercel.app
 *
 * Endpoints:
 *   GET  /api/billing/plans                       → catálogo público
 *   POST /api/billing/checkout {planId}           → crea Checkout Session, devuelve URL
 *   POST /api/billing/portal                      → Customer Portal URL
 *   GET  /api/billing/subscription                → estado actual del user
 *   POST /api/billing/webhook                     → Stripe event listener
 */

import * as store from './_store.js';
import { getSessionFromReq } from './_users.js';

const SK = process.env.STRIPE_SECRET_KEY || '';
const WHSEC = process.env.STRIPE_WEBHOOK_SECRET || '';
const BASE = process.env.PUBLIC_BASE_URL || 'https://feedia.vercel.app';

import { PLAN_LIMITS } from './_usage.js';

// ─── Credit Packs (one-time purchase, pay-per-use overage) ────────────────────
// User compra cuando agota cuota mensual de video credits. Add-on top-up.
// Margen: vendemos credits con markup ~2.5× sobre costo real para amortiguar pico de uso.
// 1 credit cost a vos ≈ $0.02 (720p baseline) → vendemos a $0.05 → margen 60% en overage.
export const CREDIT_PACKS = {
  'pack-small': {
    id: 'pack-small',
    label: '🎬 Pack Mini',
    credits: 200,
    priceUsd: 5,
    description: '200 video credits ≈ 40 clips 1080p × 5s ó ~13 min 720p',
    priceId: process.env.STRIPE_PRICE_CREDITPACK_SMALL || '',
  },
  'pack-medium': {
    id: 'pack-medium',
    label: '🎬 Pack Standard',
    credits: 600,
    priceUsd: 12,
    savingsPct: 20,
    description: '600 credits ≈ 120 clips 1080p × 5s ó ~40 min 720p ó ~13 min en 4K. Ahorrás 20% vs Mini.',
    priceId: process.env.STRIPE_PRICE_CREDITPACK_MEDIUM || '',
  },
  'pack-large': {
    id: 'pack-large',
    label: '🎬 Pack Pro',
    credits: 1500,
    priceUsd: 25,
    savingsPct: 33,
    description: '1.500 credits ≈ 300 clips 1080p × 5s ó ~100 min 720p ó ~33 min en 4K. Best value.',
    priceId: process.env.STRIPE_PRICE_CREDITPACK_LARGE || '',
  },
  'pack-mega': {
    id: 'pack-mega',
    label: '🎬 Pack Mega',
    credits: 5000,
    priceUsd: 70,
    savingsPct: 44,
    description: '5.000 credits ≈ 1.000 clips 1080p ó ~333 min 720p ó ~111 min en 4K. Para agencies.',
    priceId: process.env.STRIPE_PRICE_CREDITPACK_MEGA || '',
  },
};

const fmtUsd = (n) => '$' + n;

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceUsd: 0,
    priceUsdAnnual: 0,
    badge: '🆓',
    tagline: 'Empezá gratis. Sin tarjeta. Sin promesas vacías.',
    valueProp:
      'Probá la IA que está haciendo crecer cuentas de IG y TikTok como nunca. Si te sirve, upgradeás. Si no, no pagaste nada.',
    idealFor: 'Creadores que recién arrancan + freelancers + makers explorando si la IA realmente vale la pena.',
    whatYouGet: [
      '🧠 Cerebro IA gratis: Llama 3.3 70B (mismo motor que ChatGPT, sin pagar un peso)',
      '🤖 Computer Use REAL: el sistema interactúa con tu IG/TikTok como un humano',
      '👁️ Visión IA: lee tu pantalla y reacciona inteligentemente (Llama Vision 3.2 90B)',
      '🛸 Autopilot inteligente: cada 4hs te detecta oportunidades y recomienda qué hacer',
      '📚 6 rutinas pre-armadas que ejecutan SIN gastar tokens: engagement feed, stories watch, DMs leads, FYP scroll, trending research, cross-post check',
      '🔑 BYOK Ollama: si corrés modelos en tu PC, uso ilimitado + privacidad total',
      '✨ 8 publicaciones IA/mes con plan estratégico + predicción viral incluida',
      '🖼️ Imágenes 1080×1350 sin marca de agua (Pollinations Flux)',
      '📊 Histórico 7 días para ver qué funciona',
      '👥 Soporte por Discord (comunidad activa)',
      '🚫 Sin trampas: si no te sirve, no pagás nada. Si te sirve, upgradeás cuando quieras.',
    ],
    priceId: null,
    priceIdAnnual: null,
    features: [
      '1 cuenta de Instagram + 1 de TikTok',
      '8 publicaciones de IA por mes (con strategist + viral predictor)',
      '🖼️ Imágenes Pollinations Flux 1080×1350 (sin marca de agua)',
      '🧠 Llama 3.3 70B vía Groq (rápido, gratis, calidad GPT-4 class)',
      '👁️ Llama Vision 3.2 90B incluido (análisis de screenshots)',
      '🤖 Computer Use 30 min/día (25 vision calls + recipes ilimitados)',
      '🛸 Autopilot 6 ticks/día (cada 4hs, modo recomendar)',
      '📚 6 recipes determinísticas: engage feed, stories watch, DM leads, FYP scroll, trending research, cross-post',
      '🔑 BYOK Ollama local → CU ilimitado + privacidad total',
      '📊 Histórico 7 días + analytics básicos',
      '👥 Soporte comunidad (Discord)',
    ],
    notIncluded: [
      'Sonnet/Opus',
      'Autopilot auto-execute',
      'Multi-agent council',
      'Monte Carlo',
      'Video gen premium',
      'Imágenes Full HD profesionales',
    ],
    limits: PLAN_LIMITS.free,
  },
  starter: {
    id: 'starter',
    name: 'Starter',
    priceUsd: 7,
    priceUsdAnnual: 58,
    badge: '⚡',
    tagline: 'Calidad de agencia por menos que un café por semana.',
    valueProp:
      '20 posts PREMIUM > 50 mediocres. El sistema piensa, diseña y publica por vos con calidad profesional real.',
    idealFor:
      'Creadores 0-10K followers + emprendedores solos + makers que quieren contenido decente sin invertir 10hs/semana editando.',
    whatYouGet: [
      '✨ 20 publicaciones PREMIUM/mes garantizadas con viral score ≥65 (no publicás hasta que la IA aprueba)',
      '🧠 Claude Sonnet 4.6 (mismo modelo que usan las agencias top mundial) + Llama 3.3 + Llama Vision',
      '🖼️ Imágenes Full HD 1080×1350 listas para postear (sin retoque manual)',
      '🎬 Video corto HD 1080p incluido (80 video credits/mes)',
      '📐 Plan estratégico ANTES de cada post (no improvisás, no quemás contenido)',
      '#️⃣ Hashtags pirámide 5-tier optimizada (no quemás tu cuenta con tags muertos)',
      '🎨 Diseños estilo Canva pro con brand kit aplicado automáticamente',
      '🤖 Computer Use 90 min/día — el sistema trabaja en tu cuenta mientras dormís',
      '🛸 Autopilot ejecuta recipes diarias sin que pidas nada (12 ticks/día, cada 2hs)',
      '⏱️ Ahorrás 10+ horas/semana de trabajo manual (que valen $200-400/sem freelance)',
      '📊 Histórico 30 días + analytics detallados',
      '💌 Soporte por email (respuesta 24-48h)',
    ],
    priceId: process.env.STRIPE_PRICE_STARTER || '',
    priceIdAnnual: process.env.STRIPE_PRICE_STARTER_ANNUAL || '',
    features: [
      '1 cuenta de Instagram + 1 de TikTok conectadas',
      '✨ **20 publicaciones PREMIUM/mes** (calidad sobre cantidad)',
      '🖼️ Imágenes Full HD 1080×1350 con diseño estilo Canva pro',
      '🎬 **80 video credits/mes** = 16 clips HD 1080p × 5s ó 80s en 720p',
      '📐 Drafts video ilimitados (Pollinations) para iteración rápida',
      '🧠 Claude Sonnet 4.6 + Haiku + Llama 3.3 70B + Llama Vision',
      '🎯 Garantizado: viral score ≥65 + plan estratégico + hashtags pirámide 5-tier',
      '🎨 Templates Canva pro aplicados + brand kit',
      '🤖 Computer Use 90 min/día (100 vision calls/día)',
      '🛸 Autopilot auto-execute recipes (12 ticks/día, cada 2hs)',
      '📊 Histórico 30 días + analytics detallados',
      '💬 Soporte por email (24-48h)',
    ],
    notIncluded: ['Modelo Opus 4.7', 'Video 4K', 'Multi-agent council', 'Monte Carlo', 'White-label'],
    limits: PLAN_LIMITS.starter,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceUsd: 19,
    priceUsdAnnual: 159,
    badge: '🚀',
    tagline: 'Equivalente a $300-500/mes de freelancers, por $19.',
    valueProp:
      'Tu community manager + diseñador + planner + editor de video — todos en uno. Trabajan cada 30 minutos sin que pidas nada.',
    idealFor:
      'Creadores 10K-100K followers + pequeños negocios + freelancers/consultores que viven de su marca personal y necesitan estar presentes diariamente sin quemarse.',
    whatYouGet: [
      '👤 Reemplazás al community manager: responde DMs y comments con TU tono de voz',
      '🎨 Reemplazás al diseñador: Full HD+ 1920×1920 con tu brand kit aplicado automático',
      '📅 Reemplazás al planner editorial: calendario semanal auto-generado por nicho',
      '🎬 Reemplazás al editor de video: beat-sync + auto-captions + b-roll inserción automática',
      '✨ 80 publicaciones IA/mes (~3/día sostenible) con viral score ≥72 obligatorio',
      '🧠 Claude Sonnet 4.6 + Haiku + Llama 3.3 + Llama Vision (routing inteligente)',
      '🖼️ Imágenes Full HD+ con Flux-Dev + 300 video credits/mes (~60 clips 1080p)',
      '🛸 Autopilot trabaja cada 30 minutos optimizando tu cuenta sin pedirte nada',
      '🤖 Computer Use 4hs/día — jornada de medio tiempo de IA dedicada a vos',
      '🧠 Pattern interrupts para retención + psychographic matching audiencia',
      '#️⃣ Hashtags 7-tier con detección de trending en tiempo real',
      '📊 Analytics avanzados + comparativa vs tu nicho (qué hacen los top)',
      '📚 Histórico 90 días para detectar patrones ganadores',
      '⚡ Soporte prioritario por email (8-24h)',
    ],
    priceId: process.env.STRIPE_PRICE_PRO || '',
    priceIdAnnual: process.env.STRIPE_PRICE_PRO_ANNUAL || '',
    features: [
      '2 cuentas de Instagram + 2 de TikTok conectadas',
      '✨ **80 publicaciones/mes** (~3/día) con viral score ≥72',
      '🖼️ Imágenes Full HD+ 1920×1920 con Flux-Dev',
      '🎬 **300 video credits/mes** = 60 clips 1080p × 5s ó 5 min en 720p',
      '📐 Drafts ilimitados + edición pro: beat-sync, auto-captions, b-roll',
      '🧠 Claude Sonnet 4.6 + Haiku + Llama 3.3 + Llama Vision',
      '🎯 Garantizado: viral score ≥72 + plan estratégico + hashtags 7-tier con trending',
      '🎨 Canva Pro templates + brand kit aplicado automáticamente',
      '🧠 Pattern interrupts para retention + psychographic matching',
      '🤖 Computer Use 4hs/día (300 vision calls/día)',
      '🛸 Autopilot auto-execute cada 30 min (48 ticks/día)',
      '💬 Community manager IA: responde DMs y comments con tu tono',
      '📊 Histórico 90 días + analytics avanzados + comparativa vs nicho',
      '⚡ Soporte prioritario por email (8-24h)',
    ],
    notIncluded: ['Modelo Opus 4.7', 'Multi-agent council', 'Monte Carlo', 'Video 4K', 'White-label'],
    limits: PLAN_LIMITS.pro,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    priceUsd: 39,
    priceUsdAnnual: 329,
    badge: '🏆',
    mostPopular: true,
    tagline: 'Una agencia chica entera. Por menos que su café diario.',
    valueProp:
      '$2.000-$4.000/mes de agencia, en $39. Modelo top mundial + 8 expertos IA debatiendo cada post antes de publicarlo.',
    idealFor:
      'Marcas 100K+ followers + e-commerce con catálogo + empresas medianas + creators que monetizan en serio y necesitan resultados predecibles.',
    whatYouGet: [
      '🧠 Claude Opus 4.7 (top calidad mundial — el mismo modelo que Claude.ai Pro)',
      '🤝 Multi-agent council: 8 expertos IA debaten ANTES de publicar (3 rounds)',
      '   → Estratega + Analyst + Creativo + Community + Producto + Finance + Risk + Trends',
      '🎲 Monte Carlo simulation: 500 escenarios predichos por post antes de salir',
      '✨ 150 publicaciones/mes (~5/día — pro creator real) con viral score ≥80 garantizado',
      '🖼️ Imágenes 2K profesionales (2048×2048) con Flux-Pro + Ideogram v2',
      '🎬 800 video credits/mes (~100 clips 1080p o mix con 4K showcase)',
      '🎥 Video editing pro: motion graphics + transitions + sound design profesional',
      '🤖 Computer Use 8hs/día (jornada laboral completa de IA trabajando para vos)',
      '🛸 Autopilot cada 10 min con council aprobando decisiones críticas',
      '🏁 OKRs autónomos + Sala Ejecutiva con decisiones esperando tu approve',
      '🧠 35 módulos cerebro completos (super-genius + autonomy v2)',
      '🎨 Canva Pro + Figma export + brand kit lockeado + variable fonts editorial',
      '📊 Histórico 12 meses + analytics enterprise + competitor benchmarks',
      '💬 Soporte por chat (4-12h response)',
    ],
    priceId: process.env.STRIPE_PRICE_GOLD || '',
    priceIdAnnual: process.env.STRIPE_PRICE_GOLD_ANNUAL || '',
    features: [
      '3 cuentas de Instagram + 3 de TikTok conectadas',
      '✨ **150 publicaciones/mes** (~5/día) con viral score ≥80',
      '🖼️ Imágenes 2K (2048×2048) Flux-Pro + Ideogram v2',
      '🎬 **800 video credits/mes** = 100 clips 1080p ó mix 60 clips 1080p + 10 clips 4K',
      '🎬 Video editing pro: motion graphics + transitions + sound design',
      '🧠 **Claude Opus 4.7** + Sonnet + Haiku + Llama (routing inteligente)',
      '👁️ Llama Vision + Claude Vision para análisis profundo',
      '🎯 Garantizado: viral score ≥80 + Monte Carlo 500 trials + psychographic matching',
      '🎨 Canva Pro + Figma export + brand kit lockeado + variable fonts',
      '🤝 Multi-agent council: 8 expertos IA debaten cada post (3 rounds)',
      '🧠 35 módulos cerebro completos (super-genius + autonomy v2)',
      '🏁 OKRs autónomos + Sala Ejecutiva + decision queue',
      '🤖 Computer Use 8hs/día (800 vision calls/día, ramping a Opus vision)',
      '🛸 Autopilot cada 10 min con council aprobando decisiones críticas',
      '📊 Histórico 12 meses + analytics enterprise + competitor benchmarks',
      '💬 Soporte por chat (4-12h)',
    ],
    notIncluded: ['White-label', 'API access', 'Video gen Sora/Veo', 'Human review queue', 'Always-on 24hs CU'],
    limits: PLAN_LIMITS.gold,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceUsd: 79,
    priceUsdAnnual: 662,
    badge: '👑',
    tagline: 'Always-on. White-label. Para los que ganan miles.',
    valueProp:
      'Una agencia enterprise entera trabajando 24/7 para vos. Revendé como tuyo. $8.000-$15.000/mes de operación, en $79.',
    idealFor:
      'Agencias gestionando 3+ brands + enterprises (1M+ followers) + creators top tier monetizando varios canales + revendedores white-label que cobran a sus clientes finales.',
    whatYouGet: [
      '🌟 Computer Use 24/7 ALWAYS-ON — nunca para de trabajar (ni cuando dormís, ni fin de semana)',
      '🧠 Opus 4.7 con thinking + effort=max — el setting MÁS PRECISO de Claude que existe (~$25-30/M tokens, pagás vos $0 extra)',
      '🎲 Monte Carlo 2.000 trials + A/B testing PRE-publish (validás antes de exponer)',
      '🎥 Video VFX-grade: color grading profesional + sound design + kinetic typography',
      '🎙️ Voice cloning + regional localization multi-idioma (escalá a otros mercados)',
      '🎨 Imágenes 4K upscaled a 8K (Flux-Pro-Ultra + Ideogram + custom illustrations)',
      '🎞️ Video gen Sora/Veo style acceso (los modelos más caros del mundo)',
      '👤 Human review queue opcional: agregás revisión humana cuando querés safety extra',
      '✨ 400 publicaciones IA/mes (~13/día sostenible) con viral score ≥88 garantizado',
      '📱 5 cuentas IG + 5 TikTok conectadas (10 redes total — multi-brand real)',
      '🛸 Autopilot cada 5 min con queue dedicada de prioridad (no esperás cola)',
      '🏷️ White-label COMPLETO: tu logo, tu dominio, tu marca — revendés como tuyo a tus clientes',
      '🔌 API access + SDK para integrar a tus pipelines existentes (Zapier, Make, n8n, custom)',
      '👨‍💼 Account manager humano DEDICADO (te conoce por nombre, no es chatbot)',
      '⚡ SLA 99.9% + soporte 4h response time garantizado',
      '📚 Histórico 24 meses + analytics enterprise full + exports',
      '🤝 Multi-agent council 8 expertos + 35 módulos cerebro completos',
    ],
    priceId: process.env.STRIPE_PRICE_PREMIUM || '',
    priceIdAnnual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL || '',
    features: [
      '5 cuentas de Instagram + 5 de TikTok conectadas (10 redes total)',
      '✨ **400 publicaciones/mes** (~13/día) con viral score ≥88',
      '🖼️ Imágenes 4K upscaled a 8K (Flux-Pro-Ultra + Ideogram v2 + custom illustrations)',
      '🎬 **1.500 video credits/mes** = 100 clips 1080p × 5s + 30 clips 4K × 5s, o equivalente',
      '🎥 Video gen Sora/Veo style (acceso a modelos premium)',
      '🎬 Video VFX pro: color grading + sound design + kinetic typography',
      '🎙️ Voice cloning + regional localization multi-idioma',
      '📐 Drafts ilimitados + 4K-HDR + iteración sin gastar credits',
      '🧠 **Claude Opus 4.7 + thinking + effort=max** (setting top mundial)',
      '🧠 + Sonnet + Haiku + Llama + Llama Vision (todos disponibles)',
      '🎯 Garantizado: viral score ≥88 + Monte Carlo 2.000 trials + A/B testing pre-publish',
      '🎨 Canva Enterprise + Figma + Adobe export',
      '🤝 Multi-agent council 8 expertos + Human review queue (revisión humana opcional)',
      '🤖 Computer Use **24hs/día always-on** (3.000 vision calls/día)',
      '🛸 Autopilot cada 5 min con queue dedicada (priority enterprise)',
      '🏷️ White-label completo (logo tuyo, dominio propio)',
      '🔌 API access + SDK para integrar a pipelines propios',
      '📊 Histórico 24 meses + analytics enterprise full',
      '👤 Account manager humano dedicado',
      '⚡ SLA 99.9% + soporte 4h response time',
    ],
    notIncluded: [],
    limits: PLAN_LIMITS.premium,
  },
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

/* ──────────────── Stripe REST API helpers (sin SDK) ──────────────── */

const stripeApi = async (path, opts = {}) => {
  if (!SK) throw new Error('STRIPE_SECRET_KEY no configurado');
  const headers = {
    Authorization: `Bearer ${SK}`,
    'Stripe-Version': '2024-12-18.acacia',
    ...(opts.headers || {}),
  };
  if (opts.body && typeof opts.body !== 'string') {
    headers['Content-Type'] = 'application/x-www-form-urlencoded';
  }
  const res = await fetch(`https://api.stripe.com${path}`, { ...opts, headers });
  const json = await res.json();
  if (!res.ok) throw new Error(`Stripe ${res.status}: ${json.error?.message || JSON.stringify(json).slice(0, 200)}`);
  return json;
};

const toForm = (obj, prefix = '') => {
  const params = new URLSearchParams();
  const flatten = (o, p) => {
    for (const [k, v] of Object.entries(o)) {
      const key = p ? `${p}[${k}]` : k;
      if (v === null || v === undefined) continue;
      if (Array.isArray(v))
        v.forEach((item, i) => {
          if (typeof item === 'object') flatten(item, `${key}[${i}]`);
          else params.append(`${key}[${i}]`, String(item));
        });
      else if (typeof v === 'object') flatten(v, key);
      else params.append(key, String(v));
    }
  };
  flatten(obj, prefix);
  return params.toString();
};

/* ──────────────── Webhook signature verification ──────────────── */

import crypto from 'node:crypto';

const verifyWebhook = (rawBody, signature) => {
  if (!WHSEC) return false;
  const parts = (signature || '').split(',').reduce((acc, p) => {
    const [k, v] = p.split('=');
    if (k && v) acc[k] = v;
    return acc;
  }, {});
  if (!parts.t || !parts.v1) return false;
  const payload = `${parts.t}.${rawBody}`;
  const expected = crypto.createHmac('sha256', WHSEC).update(payload).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
  } catch {
    return false;
  }
};

/* ──────────────── Handler ──────────────── */

export const handleBilling = async (req, res, path, m, body, rawBody) => {
  // ─── Lista pública de planes ─────────────────────────────────────────
  if (path === '/api/billing/plans' && m === 'GET') {
    json(res, 200, {
      plans: Object.values(PLANS).map((p) => ({
        id: p.id,
        name: p.name,
        badge: p.badge || '',
        priceUsd: p.priceUsd,
        priceUsdAnnual: p.priceUsdAnnual,
        priceUsdAnnualPerMonth: p.priceUsdAnnual ? Math.round((p.priceUsdAnnual / 12) * 100) / 100 : 0,
        savingsAnnualPct:
          p.priceUsd > 0 ? Math.round(((p.priceUsd * 12 - p.priceUsdAnnual) / (p.priceUsd * 12)) * 100) : 0,
        tagline: p.tagline,
        valueProp: p.valueProp || '',
        idealFor: p.idealFor || '',
        whatYouGet: p.whatYouGet || [],
        features: p.features,
        notIncluded: p.notIncluded || [],
        limits: p.limits,
        mostPopular: p.mostPopular || false,
        available: p.id === 'free' || Boolean(p.priceId),
        availableAnnual: p.id === 'free' || Boolean(p.priceIdAnnual),
      })),
      stripeConfigured: Boolean(SK),
    });
    return true;
  }

  // ─── Estado de suscripción del user ──────────────────────────────────
  if (path === '/api/billing/subscription' && m === 'GET') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    const sub = await store.get(`feedia:user:${ctx.user.id}:subscription`);
    json(res, 200, {
      currentPlan: ctx.user.plan || 'free',
      subscription: sub || null,
      planDetails: PLANS[ctx.user.plan || 'free'],
    });
    return true;
  }

  // ─── Checkout Session ────────────────────────────────────────────────
  if (path === '/api/billing/checkout' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    if (!SK) {
      json(res, 500, { error: 'Stripe no configurado. Faltan STRIPE_SECRET_KEY + STRIPE_PRICE_* en env.' });
      return true;
    }

    const planId = (body || {}).planId;
    const cycle = (body || {}).cycle === 'annual' ? 'annual' : 'monthly';
    const plan = PLANS[planId];
    if (!plan) {
      json(res, 400, { error: 'plan inválido' });
      return true;
    }
    const priceId = cycle === 'annual' ? plan.priceIdAnnual : plan.priceId;
    if (!priceId) {
      json(res, 400, { error: `Plan ${planId} (${cycle}) sin priceId configurado en Stripe` });
      return true;
    }

    let customerId = ctx.user.stripeCustomerId;
    try {
      if (!customerId) {
        const c = await stripeApi('/v1/customers', {
          method: 'POST',
          body: toForm({ email: ctx.user.email, name: ctx.user.displayName, metadata: { feediaUserId: ctx.user.id } }),
        });
        customerId = c.id;
        const u = await store.get(`feedia:user:${ctx.user.id}`);
        u.stripeCustomerId = customerId;
        await store.set(`feedia:user:${ctx.user.id}`, u);
      }

      const session = await stripeApi('/v1/checkout/sessions', {
        method: 'POST',
        body: toForm({
          mode: 'subscription',
          customer: customerId,
          line_items: [{ price: priceId, quantity: 1 }],
          success_url: `${BASE}/?checkout=success&plan=${plan.id}&cycle=${cycle}`,
          cancel_url: `${BASE}/pricing.html?checkout=cancelled`,
          allow_promotion_codes: true,
          billing_address_collection: 'auto',
          client_reference_id: ctx.user.id,
          metadata: { feediaUserId: ctx.user.id, feediaPlanId: plan.id, feediaCycle: cycle },
          subscription_data: { metadata: { feediaUserId: ctx.user.id, feediaPlanId: plan.id, feediaCycle: cycle } },
        }),
      });
      json(res, 200, { url: session.url, sessionId: session.id });
    } catch (err) {
      json(res, 500, { error: 'checkout-failed', message: String(err.message || err) });
    }
    return true;
  }

  // ─── Credit Packs (overage video credits) ────────────────────────────
  if (path === '/api/billing/credit-packs' && m === 'GET') {
    json(res, 200, {
      packs: Object.values(CREDIT_PACKS).map((p) => ({
        id: p.id,
        label: p.label,
        credits: p.credits,
        priceUsd: p.priceUsd,
        description: p.description,
        savingsPct: p.savingsPct || 0,
        pricePerCredit: Number((p.priceUsd / p.credits).toFixed(4)),
        available: Boolean(p.priceId),
      })),
      explanation:
        'Compra credit packs cuando agotás cuota mensual de video. Credits no caducan, se acumulan al balance overage.',
    });
    return true;
  }

  if (path === '/api/billing/buy-credits' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    if (!SK) {
      json(res, 500, { error: 'Stripe no configurado' });
      return true;
    }

    const packId = (body || {}).packId;
    const pack = CREDIT_PACKS[packId];
    if (!pack || !pack.priceId) {
      json(res, 400, { error: 'Pack inválido o sin priceId' });
      return true;
    }

    let customerId = ctx.user.stripeCustomerId;
    try {
      if (!customerId) {
        const c = await stripeApi('/v1/customers', {
          method: 'POST',
          body: toForm({ email: ctx.user.email, name: ctx.user.displayName, metadata: { feediaUserId: ctx.user.id } }),
        });
        customerId = c.id;
        const u = await store.get(`feedia:user:${ctx.user.id}`);
        u.stripeCustomerId = customerId;
        await store.set(`feedia:user:${ctx.user.id}`, u);
      }

      const session = await stripeApi('/v1/checkout/sessions', {
        method: 'POST',
        body: toForm({
          mode: 'payment', // one-time, no subscription
          customer: customerId,
          line_items: [{ price: pack.priceId, quantity: 1 }],
          success_url: `${BASE}/?creditpack=success&credits=${pack.credits}`,
          cancel_url: `${BASE}/pricing.html?creditpack=cancelled`,
          billing_address_collection: 'auto',
          client_reference_id: ctx.user.id,
          metadata: { feediaUserId: ctx.user.id, feediaPackId: pack.id, feediaCredits: String(pack.credits) },
        }),
      });
      json(res, 200, { url: session.url, sessionId: session.id, packId: pack.id, credits: pack.credits });
    } catch (err) {
      json(res, 500, { error: 'creditpack-checkout-failed', message: String(err.message || err) });
    }
    return true;
  }

  // ─── Customer Portal ─────────────────────────────────────────────────
  if (path === '/api/billing/portal' && m === 'POST') {
    const ctx = await getSessionFromReq(req);
    if (!ctx) {
      json(res, 401, { error: 'no session' });
      return true;
    }
    if (!ctx.user.stripeCustomerId) {
      json(res, 400, { error: 'sin customer Stripe — comprá un plan primero' });
      return true;
    }
    if (!SK) {
      json(res, 500, { error: 'Stripe no configurado' });
      return true;
    }
    try {
      const portal = await stripeApi('/v1/billing_portal/sessions', {
        method: 'POST',
        body: toForm({ customer: ctx.user.stripeCustomerId, return_url: `${BASE}/?from=portal` }),
      });
      json(res, 200, { url: portal.url });
    } catch (err) {
      json(res, 500, { error: 'portal-failed', message: String(err.message || err) });
    }
    return true;
  }

  // ─── Webhook ─────────────────────────────────────────────────────────
  if (path === '/api/billing/webhook' && m === 'POST') {
    const signature = req.headers['stripe-signature'] || '';
    if (!verifyWebhook(rawBody, signature)) {
      json(res, 400, { error: 'invalid signature' });
      return true;
    }
    let event;
    try {
      event = JSON.parse(rawBody);
    } catch {
      json(res, 400, { error: 'invalid json' });
      return true;
    }

    const data = event.data?.object || {};
    const feediaUserId = data.metadata?.feediaUserId || data.client_reference_id;

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          // Subscription checkout
          if (feediaUserId && data.subscription) {
            const planId = data.metadata?.feediaPlanId || 'pro';
            await applyPlanToUser(feediaUserId, planId, {
              subscriptionId: data.subscription,
              status: 'active',
              customerId: data.customer,
              startedAt: new Date().toISOString(),
            });
          }
          // One-time credit pack checkout (mode: payment)
          if (feediaUserId && data.metadata?.feediaPackId) {
            const credits = Number(data.metadata?.feediaCredits || 0);
            if (credits > 0) {
              const { recordUsage } = await import('./_usage.js');
              await recordUsage(feediaUserId, 'video-overage-topup', credits, { credits });
            }
          }
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.created': {
          if (feediaUserId) {
            const planId = data.metadata?.feediaPlanId || 'pro';
            await applyPlanToUser(feediaUserId, planId, {
              subscriptionId: data.id,
              status: data.status,
              customerId: data.customer,
              currentPeriodEnd: data.current_period_end ? new Date(data.current_period_end * 1000).toISOString() : null,
              cancelAtPeriodEnd: Boolean(data.cancel_at_period_end),
            });
          }
          break;
        }
        case 'customer.subscription.deleted': {
          if (feediaUserId) {
            await applyPlanToUser(feediaUserId, 'free', { status: 'canceled', canceledAt: new Date().toISOString() });
          }
          break;
        }
        case 'invoice.payment_failed': {
          if (feediaUserId) {
            const sub = (await store.get(`feedia:user:${feediaUserId}:subscription`)) || {};
            sub.lastPaymentFailedAt = new Date().toISOString();
            sub.status = 'past_due';
            await store.set(`feedia:user:${feediaUserId}:subscription`, sub);
          }
          break;
        }
        default:
          break;
      }
      json(res, 200, { received: true });
    } catch (err) {
      json(res, 500, { error: 'webhook-handler-failed', message: String(err.message || err) });
    }
    return true;
  }

  return false;
};

const applyPlanToUser = async (userId, planId, subPayload) => {
  const user = await store.get(`feedia:user:${userId}`);
  if (!user) return;
  user.plan = planId;
  if (subPayload.customerId) user.stripeCustomerId = subPayload.customerId;
  await store.set(`feedia:user:${userId}`, user);
  const existing = (await store.get(`feedia:user:${userId}:subscription`)) || {};
  await store.set(`feedia:user:${userId}:subscription`, { ...existing, ...subPayload, planId });
};
