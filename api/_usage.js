/**
 * Usage tracking + quota enforcement por plan.
 *
 * Trackea por usuario/mes:
 *   - postsThisMonth      (cada publicación cuenta 1)
 *   - aiCalls             (cada llamada LLM cuenta 1)
 *   - aiInputTokens       (acumulado para coste real)
 *   - aiOutputTokens
 *   - aiCostUsdEstimated  (Σ tokens × precio modelo)
 *   - imagesGenerated     (Stable Diffusion / DALL·E / fal.ai)
 *   - cuMinutes           (minutos de Computer Use)
 *   - kvOps               (lectura+escritura KV — para estimar costo Upstash)
 *
 * Reset: 1ro de cada mes. Persistido en KV con TTL 32 días.
 *
 * Gates:
 *   - `checkQuota(userId, plan, kind)` → { ok, reason?, used, limit }
 *   - `recordUsage(userId, kind, amount, costUsd?)` → incrementa contadores
 *
 * Costos plan-safe — los límites están atados a:
 *   - tier de modelo permitido (Haiku/Sonnet/Opus)
 *   - cap de gasto Anthropic por user
 *   - cap de operaciones KV (Upstash free = 10K/día → repartir entre N users)
 */

import * as store from './_store.js';

/** Costos Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5 (per 1M tokens). */
export const MODEL_COSTS = {
  'claude-opus-4-7': { input: 5.0, output: 25.0 },
  'claude-opus-4-6': { input: 5.0, output: 25.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 1.0, output: 5.0 },
};

/**
 * Límites por plan, calibrados para que NO perdamos plata.
 * Asumimos:
 *   - 1 post = ~3K input + ~2K output tokens (carrusel/reel guion + image prompts)
 *   - Imagen fal.ai = ~$0.025 cada una
 *   - KV op = ~0 (caemos antes del límite Upstash)
 *
 * Margen objetivo: 50%+ del precio del plan después de costos.
 */
/**
 * Tiers — calibrados para mercado LATAM/Argentina (precios accesibles)
 * sin perder plata. Anual = -30% (mostrar como precio efectivo /mes).
 *
 * Free → Starter ($7) → Pro ($19) → Gold ($39) → Premium ($79)
 */
export const PLAN_LIMITS = {
  free: {
    name: 'Free',
    priceUsd: 0,
    priceUsdAnnual: 0,
    badge: '🆓',
    allowedModels: ['llama-3.3-70b-groq', 'llama-3.2-90b-vision-groq', 'pollinations-flux'],
    maxPostsPerMonth: 8,
    maxAiCallsPerMonth: 120,
    maxAiCostUsdPerMonth: 0, // Groq + Pollinations = $0 a vos
    maxImagesPerMonth: 15,
    maxComputerUseMinutes: 30, // 30 min/día (80% recipes, 20% vision)
    maxComputerUseMinutesPerDay: 30,
    maxComputerUseVisionCallsPerDay: 25, // cap específico para vision (Groq pool protection)
    maxAutopilotTicksPerDay: 6, // cada 4hs
    maxIgAccounts: 1,
    maxTtAccounts: 1,
    maxKvOpsPerMonth: 5_000,
    autopilotEnabled: true,
    autopilotMode: 'recommend-only',
    analyticsHistoryDays: 7,
    supportTier: 'community',
  },
  starter: {
    name: 'Starter',
    priceUsd: 7,
    priceUsdAnnual: 58,
    badge: '⚡',
    allowedModels: [
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'llama-3.3-70b-groq',
      'llama-3.2-90b-vision-groq',
      'pollinations-flux',
      'fal-flux-schnell',
    ],
    maxPostsPerMonth: 20, // calidad sobre cantidad: 20 publicaciones premium garantizadas
    maxAiCallsPerMonth: 600,
    maxAiCostUsdPerMonth: 0.9,
    maxImagesPerMonth: 50,
    // ─── Video budget = sistema de "credits" (token-equivalent) ──────────────
    // 1 credit = 1 segundo de video HD 720p (costo ~$0.02 a vos)
    // Multiplicadores: 720p = 1×, 1080p HD = 2.5×, 4K = 7.5×, 4K-HDR = 10×
    // User puede mezclar libre — credits se descuentan según resolución elegida.
    maxVideoCreditsPerMonth: 80, // = 80s 720p, ó ~32s 1080p, ó ~10s 4K
    maxVideoSecondsPerClip: 15,
    allowedVideoResolutions: ['720p', '1080p'],
    defaultVideoResolution: '1080p',
    unlimitedDraftVideo: true, // Pollinations draft (cualquier cantidad, low-quality)
    maxComputerUseMinutes: 90,
    maxComputerUseMinutesPerDay: 90,
    maxComputerUseVisionCallsPerDay: 100,
    maxAutopilotTicksPerDay: 12,
    maxIgAccounts: 1,
    maxTtAccounts: 1,
    maxKvOpsPerMonth: 30_000,
    autopilotEnabled: true,
    autopilotMode: 'auto-execute-recipes',
    analyticsHistoryDays: 30,
    supportTier: 'email',
    // Quality guarantees
    qualityFloor: {
      imageResolution: '1080x1350-FullHD',
      videoResolution: '1080p-HD',
      typography: 'modern-canva-grade',
      hashtagStrategy: 'pyramid-5-tier',
      hookPredictionMinScore: 65, // viral predictor floor antes de publicar
      strategicPlanRequired: true,
      designSystem: 'canva-style-templates',
      audienceRetentionOptimized: true,
    },
  },
  pro: {
    name: 'Pro',
    priceUsd: 19,
    priceUsdAnnual: 159,
    badge: '🚀',
    allowedModels: [
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'llama-3.3-70b-groq',
      'llama-3.2-90b-vision-groq',
      'pollinations-flux',
      'fal-flux-dev',
    ],
    maxPostsPerMonth: 80,
    maxAiCallsPerMonth: 2_000,
    maxAiCostUsdPerMonth: 4.0,
    maxImagesPerMonth: 150,
    maxVideoCreditsPerMonth: 300, // = 5 min 720p, 2 min 1080p, ó ~40s 4K
    maxVideoSecondsPerClip: 30,
    allowedVideoResolutions: ['720p', '1080p'],
    defaultVideoResolution: '1080p',
    unlimitedDraftVideo: true,
    maxComputerUseMinutes: 240,
    maxComputerUseMinutesPerDay: 240,
    maxComputerUseVisionCallsPerDay: 300,
    maxAutopilotTicksPerDay: 48,
    maxIgAccounts: 2,
    maxTtAccounts: 2,
    maxKvOpsPerMonth: 100_000,
    autopilotEnabled: true,
    autopilotMode: 'auto-execute',
    analyticsHistoryDays: 90,
    supportTier: 'priority-email',
    qualityFloor: {
      imageResolution: '1920x1920-FullHD-Plus',
      videoResolution: '1080p-HD-60fps',
      typography: 'pro-typography-pairs',
      hashtagStrategy: 'pyramid-7-tier-with-trending',
      hookPredictionMinScore: 72,
      strategicPlanRequired: true,
      designSystem: 'canva-pro-templates+brand-kit',
      videoEditingPrecision: 'beat-sync-captions-broll',
      audienceRetentionOptimized: true,
      attentionPatternInterrupts: true,
    },
  },
  gold: {
    name: 'Gold',
    priceUsd: 39,
    priceUsdAnnual: 329,
    badge: '🏆',
    mostPopular: true,
    allowedModels: [
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'claude-opus-4-7',
      'llama-3.3-70b-groq',
      'llama-3.2-90b-vision-groq',
      'fal-flux-pro',
      'ideogram-v2',
    ],
    maxPostsPerMonth: 150,
    maxAiCallsPerMonth: 4_000,
    maxAiCostUsdPerMonth: 8.0,
    maxImagesPerMonth: 300,
    // Gold: ~$15 video budget = 750 credits
    // Ej mix: 80 videos × 5s × 1080p (1000 cred) + 10 videos × 5s × 4K (375) = 1375 → cap a 800
    maxVideoCreditsPerMonth: 800, // = 13min 720p, ~5.3min 1080p, ó ~1.8min 4K
    maxVideoSecondsPerClip: 60,
    allowedVideoResolutions: ['720p', '1080p', '4K'],
    defaultVideoResolution: '1080p',
    unlimitedDraftVideo: true,
    maxComputerUseMinutes: 480,
    maxComputerUseMinutesPerDay: 480,
    maxComputerUseVisionCallsPerDay: 800,
    maxAutopilotTicksPerDay: 144,
    maxIgAccounts: 3,
    maxTtAccounts: 3,
    maxKvOpsPerMonth: 250_000,
    autopilotEnabled: true,
    autopilotMode: 'auto-execute-with-council',
    multiAgentCouncil: true,
    monteCarloSimulation: true,
    analyticsHistoryDays: 365,
    supportTier: 'chat',
    qualityFloor: {
      imageResolution: '2048x2048-2K',
      videoResolution: '4K-60fps-HDR',
      typography: 'editorial-grade-with-variable-fonts',
      hashtagStrategy: 'pyramid-7-tier+real-time-trending+niche-discovery',
      hookPredictionMinScore: 80,
      strategicPlanRequired: true,
      multiAgentCouncilValidation: true,
      monteCarloSimulationTrials: 500,
      designSystem: 'canva-pro+figma-export+brand-kit-locked',
      videoEditingPrecision: 'beat-sync+auto-captions+broll+transitions+motion-graphics',
      audienceRetentionOptimized: true,
      attentionPatternInterrupts: true,
      psychographicMatching: true,
      iconographyConsistency: true,
    },
  },
  premium: {
    name: 'Premium',
    priceUsd: 79,
    priceUsdAnnual: 662,
    badge: '👑',
    allowedModels: [
      'claude-haiku-4-5',
      'claude-sonnet-4-6',
      'claude-opus-4-7-thinking-max',
      'llama-3.3-70b-groq',
      'llama-3.2-90b-vision-groq',
      'fal-flux-pro-ultra',
      'ideogram-v2',
      'sora-style-video',
      'veo-style-video',
    ],
    maxPostsPerMonth: 400,
    maxAiCallsPerMonth: 10_000,
    maxAiCostUsdPerMonth: 18.0,
    maxImagesPerMonth: 800,
    // Premium: ~$30 video budget = 1500 credits
    // Permite (target user-vision): 100 videos 1080p (5s c/u = 1250 cred)
    //                              + 30 videos 4K (5s c/u = 1125 cred) = 2375 → real cap 1500
    // Realista: 80 videos × 5s × 1080p (1000 cred) + 13 videos × 5s × 4K (488 cred)
    //          ó cualquier mix equivalente.
    maxVideoCreditsPerMonth: 1_500,
    maxVideoSecondsPerClip: 120,
    allowedVideoResolutions: ['720p', '1080p', '4K', '4K-HDR'],
    defaultVideoResolution: '1080p', // default 1080p, 4K opcional
    unlimitedDraftVideo: true,
    maxComputerUseMinutes: 1_440,
    maxComputerUseMinutesPerDay: 1_440,
    maxComputerUseVisionCallsPerDay: 3_000,
    maxAutopilotTicksPerDay: 288,
    maxIgAccounts: 5,
    maxTtAccounts: 5,
    maxKvOpsPerMonth: 800_000,
    autopilotEnabled: true,
    autopilotMode: 'auto-execute-with-council-and-human-review',
    multiAgentCouncil: true,
    monteCarloSimulation: true,
    humanReviewQueue: true,
    whiteLabel: true,
    apiAccess: true,
    dedicatedQueue: true,
    analyticsHistoryDays: 730,
    supportTier: 'dedicated',
    qualityFloor: {
      imageResolution: '4096x4096-4K-upscaled-8K',
      videoResolution: '4K-120fps-HDR-Dolby',
      typography: 'editorial-grade+custom-fonts+kinetic-typography',
      hashtagStrategy: 'pyramid-9-tier+real-time-trending+geo-targeting+niche-discovery+competitor-gap',
      hookPredictionMinScore: 88,
      strategicPlanRequired: true,
      multiAgentCouncilValidation: true,
      monteCarloSimulationTrials: 2000,
      humanReviewQueueEnabled: true,
      designSystem: 'canva-enterprise+figma+adobe-export+brand-kit-locked+custom-illustrations',
      videoEditingPrecision: 'beat-sync+auto-captions+broll+transitions+motion-graphics+vfx+color-grading+sound-design',
      audienceRetentionOptimized: true,
      attentionPatternInterrupts: true,
      psychographicMatching: true,
      iconographyConsistency: true,
      voiceCloningEnabled: true,
      regionalLocalization: true,
      abTestingPrePublish: true,
    },
  },
};

const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
const usageKey = (userId, month = monthKey()) => `feedia:usage:${userId}:${month}`;

const blankUsage = () => ({
  postsThisMonth: 0,
  aiCalls: 0,
  aiInputTokens: 0,
  aiOutputTokens: 0,
  aiCostUsdEstimated: 0,
  imagesGenerated: 0,
  cuMinutes: 0,
  kvOps: 0,
});

export const getUsage = async (userId, month = monthKey()) => {
  const u = await store.get(usageKey(userId, month));
  return u || blankUsage();
};

// Mapeo legacy → nuevo tier (usuarios viejos con plan 'agency' caen a 'premium')
const LEGACY_PLAN_MAP = { agency: 'premium' };

export const getPlanLimits = (planId) => {
  const id = LEGACY_PLAN_MAP[planId] || planId;
  return PLAN_LIMITS[id] || PLAN_LIMITS.free;
};

/**
 * Tipos de quota que el frontend/backend pueden chequear:
 *   - 'post'           — crear post (carrusel/reel/story)
 *   - 'ai-call'        — call genérico al LLM
 *   - 'image'          — generar imagen
 *   - 'cu-minute'      — minuto de Computer Use
 *   - 'ig-account'     — anexar cuenta IG
 *   - 'tt-account'     — anexar cuenta TT
 *   - 'autopilot'      — activar autopilot
 *   - 'model:{id}'     — usar modelo específico
 *   - 'analytics-history:{days}' — pedir histórico
 */
export const checkQuota = async (userId, planId, kind, opts = {}) => {
  const limits = getPlanLimits(planId);
  const usage = await getUsage(userId);

  if (kind === 'post') {
    if (usage.postsThisMonth >= limits.maxPostsPerMonth)
      return {
        ok: false,
        reason: `Llegaste al límite de ${limits.maxPostsPerMonth} publicaciones/mes del plan ${limits.name}. Upgradeá para más.`,
        used: usage.postsThisMonth,
        limit: limits.maxPostsPerMonth,
        upgrade: true,
      };
    return { ok: true, used: usage.postsThisMonth, limit: limits.maxPostsPerMonth };
  }

  if (kind === 'ai-call') {
    if (usage.aiCalls >= limits.maxAiCallsPerMonth)
      return {
        ok: false,
        reason: `Llegaste al límite de ${limits.maxAiCallsPerMonth} llamadas IA/mes.`,
        used: usage.aiCalls,
        limit: limits.maxAiCallsPerMonth,
        upgrade: true,
      };
    if (usage.aiCostUsdEstimated >= limits.maxAiCostUsdPerMonth)
      return {
        ok: false,
        reason: `Llegaste al cap de $${limits.maxAiCostUsdPerMonth} de IA/mes en plan ${limits.name}.`,
        used: usage.aiCostUsdEstimated,
        limit: limits.maxAiCostUsdPerMonth,
        upgrade: true,
      };
    return { ok: true, used: usage.aiCalls, limit: limits.maxAiCallsPerMonth };
  }

  if (kind === 'image') {
    if (usage.imagesGenerated >= limits.maxImagesPerMonth)
      return {
        ok: false,
        reason: `Límite de ${limits.maxImagesPerMonth} imágenes/mes alcanzado.`,
        used: usage.imagesGenerated,
        limit: limits.maxImagesPerMonth,
        upgrade: true,
      };
    return { ok: true, used: usage.imagesGenerated, limit: limits.maxImagesPerMonth };
  }

  // ─── Video credits — sistema token-equivalent + pay-per-use overage ────
  // opts: { durationSec, resolution: '720p'|'1080p'|'4K'|'4K-HDR', allowOverage? }
  if (kind === 'video') {
    const maxCredits = limits.maxVideoCreditsPerMonth || 0;
    if (maxCredits === 0 && !usage.videoOverageBalance) {
      return {
        ok: false,
        reason: `Plan ${limits.name} no incluye video premium. Usá draft (Pollinations gratis) o upgradeá.`,
        upgrade: true,
      };
    }
    const duration = opts.durationSec || 5;
    if (duration > (limits.maxVideoSecondsPerClip || 5)) {
      return {
        ok: false,
        reason: `Plan ${limits.name} permite clips hasta ${limits.maxVideoSecondsPerClip}s. Reducí duración o upgradeá.`,
        upgrade: true,
      };
    }
    const resolution = opts.resolution || limits.defaultVideoResolution || '1080p';
    if (!(limits.allowedVideoResolutions || []).includes(resolution)) {
      return {
        ok: false,
        reason: `Resolución ${resolution} no disponible en plan ${limits.name}. Permitidas: ${(limits.allowedVideoResolutions || []).join(', ')}.`,
        upgrade: true,
      };
    }
    const multipliers = { '720p': 1, '1080p': 2.5, '4K': 7.5, '4K-HDR': 10 };
    const creditsNeeded = Math.ceil(duration * (multipliers[resolution] || 2.5));
    const used = usage.videoCreditsUsed || 0;
    const overageBalance = usage.videoOverageBalance || 0;

    // Cabe en cuota mensual del plan
    if (used + creditsNeeded <= maxCredits) {
      return { ok: true, used, limit: maxCredits, creditsNeeded, resolution, duration, source: 'plan' };
    }

    // No cabe en cuota — fallback a overage pack si tiene balance
    if (overageBalance >= creditsNeeded) {
      return {
        ok: true,
        used,
        limit: maxCredits,
        creditsNeeded,
        resolution,
        duration,
        source: 'overage',
        overageBalance,
      };
    }

    // Sin cuota ni balance — sugerir compra
    return {
      ok: false,
      reason: `Plan ${limits.name}: ${maxCredits - used} credits restantes en cuota. Este clip (${duration}s × ${resolution}) necesita ${creditsNeeded}. Comprá pack o reducí calidad/duración.`,
      used,
      limit: maxCredits,
      creditsNeeded,
      overageBalance,
      overageOption: { suggestion: 'buy-credit-pack', url: '/pricing.html#credit-packs' },
      upgrade: true,
    };
  }

  if (kind === 'cu-minute') {
    if (limits.maxComputerUseMinutes === 0)
      return {
        ok: false,
        reason: `Plan ${limits.name} no incluye Computer Use. Upgradeá a Starter o Pro.`,
        upgrade: true,
      };
    if (usage.cuMinutes >= limits.maxComputerUseMinutes)
      return {
        ok: false,
        reason: `${limits.maxComputerUseMinutes}min de CU/mes consumidos.`,
        used: usage.cuMinutes,
        limit: limits.maxComputerUseMinutes,
        upgrade: true,
      };
    return { ok: true, used: usage.cuMinutes, limit: limits.maxComputerUseMinutes };
  }

  if (kind === 'ig-account' || kind === 'tt-account') {
    const max = kind === 'ig-account' ? limits.maxIgAccounts : limits.maxTtAccounts;
    const current = opts.currentCount || 0;
    if (current >= max)
      return {
        ok: false,
        reason: `Máximo ${max} cuentas ${kind === 'ig-account' ? 'IG' : 'TT'} en plan ${limits.name}.`,
        used: current,
        limit: max,
        upgrade: true,
      };
    return { ok: true, used: current, limit: max };
  }

  if (kind === 'autopilot') {
    if (!limits.autopilotEnabled)
      return {
        ok: false,
        reason: `Autopilot solo disponible en Pro y Agency. Plan actual: ${limits.name}.`,
        upgrade: true,
      };
    return { ok: true };
  }

  if (kind.startsWith('model:')) {
    const modelId = kind.slice(6);
    if (!limits.allowedModels.includes(modelId))
      return {
        ok: false,
        reason: `Modelo ${modelId} requiere upgrade. Plan ${limits.name} incluye: ${limits.allowedModels.join(', ')}.`,
        upgrade: true,
      };
    return { ok: true };
  }

  if (kind.startsWith('analytics-history:')) {
    const requested = Number(kind.slice(18));
    if (requested > limits.analyticsHistoryDays)
      return {
        ok: false,
        reason: `Histórico hasta ${limits.analyticsHistoryDays}d en plan ${limits.name}.`,
        used: limits.analyticsHistoryDays,
        limit: limits.analyticsHistoryDays,
        upgrade: true,
      };
    return { ok: true };
  }

  return { ok: true };
};

/**
 * Registra uso. Async fire-and-forget desde caller.
 * Si `model` + tokens, calcula costo real con tabla MODEL_COSTS.
 */
export const recordUsage = async (userId, kind, amount = 1, extra = {}) => {
  if (!userId) return;
  const key = usageKey(userId);
  const usage = await getUsage(userId);

  if (kind === 'post') usage.postsThisMonth += amount;
  else if (kind === 'ai-call') {
    usage.aiCalls += amount;
    if (extra.inputTokens) usage.aiInputTokens += extra.inputTokens;
    if (extra.outputTokens) usage.aiOutputTokens += extra.outputTokens;
    if (extra.model && MODEL_COSTS[extra.model]) {
      const c = MODEL_COSTS[extra.model];
      const cost =
        ((extra.inputTokens || 0) / 1_000_000) * c.input + ((extra.outputTokens || 0) / 1_000_000) * c.output;
      usage.aiCostUsdEstimated = Math.round((usage.aiCostUsdEstimated + cost) * 1_000_000) / 1_000_000;
    }
  } else if (kind === 'image') usage.imagesGenerated += amount;
  else if (kind === 'video') {
    // extra: { credits, durationSec, resolution, source: 'plan'|'overage' }
    const credits = extra.credits || amount;
    if (extra.source === 'overage') {
      usage.videoOverageBalance = Math.max(0, (usage.videoOverageBalance || 0) - credits);
      usage.videoOverageSpent = (usage.videoOverageSpent || 0) + credits;
    } else {
      usage.videoCreditsUsed = (usage.videoCreditsUsed || 0) + credits;
    }
    usage.videoClipsGenerated = (usage.videoClipsGenerated || 0) + 1;
    usage.videoSecondsTotal = (usage.videoSecondsTotal || 0) + (extra.durationSec || 5);
  } else if (kind === 'video-overage-topup') {
    // extra: { credits } — desde Stripe webhook
    usage.videoOverageBalance = (usage.videoOverageBalance || 0) + (extra.credits || amount);
    usage.videoOveragePurchased = (usage.videoOveragePurchased || 0) + (extra.credits || amount);
  } else if (kind === 'cu-minute') usage.cuMinutes += amount;
  else if (kind === 'kv-op') usage.kvOps += amount;

  await store.set(key, usage);
  return usage;
};

/** Empuja al frontend lo necesario para mostrar barras de uso. */
export const getUsageSummary = async (userId, planId) => {
  const limits = getPlanLimits(planId);
  const usage = await getUsage(userId);
  const pct = (used, max) => (max > 0 ? Math.round((used / max) * 100) : 0);
  return {
    plan: planId,
    planName: limits.name,
    priceUsd: limits.priceUsd,
    posts: {
      used: usage.postsThisMonth,
      limit: limits.maxPostsPerMonth,
      pct: pct(usage.postsThisMonth, limits.maxPostsPerMonth),
    },
    aiCalls: {
      used: usage.aiCalls,
      limit: limits.maxAiCallsPerMonth,
      pct: pct(usage.aiCalls, limits.maxAiCallsPerMonth),
    },
    aiCostUsd: {
      used: Math.round(usage.aiCostUsdEstimated * 100) / 100,
      limit: limits.maxAiCostUsdPerMonth,
      pct: pct(usage.aiCostUsdEstimated, limits.maxAiCostUsdPerMonth),
    },
    images: {
      used: usage.imagesGenerated,
      limit: limits.maxImagesPerMonth,
      pct: pct(usage.imagesGenerated, limits.maxImagesPerMonth),
    },
    videoCredits: {
      used: usage.videoCreditsUsed || 0,
      limit: limits.maxVideoCreditsPerMonth || 0,
      pct: pct(usage.videoCreditsUsed || 0, limits.maxVideoCreditsPerMonth || 1),
      clipsGenerated: usage.videoClipsGenerated || 0,
      secondsGenerated: usage.videoSecondsTotal || 0,
      multipliers: { '720p': 1, '1080p': 2.5, '4K': 7.5, '4K-HDR': 10 },
      allowedResolutions: limits.allowedVideoResolutions || [],
      maxSecondsPerClip: limits.maxVideoSecondsPerClip || 0,
      unlimitedDraftVideo: !!limits.unlimitedDraftVideo,
    },
    cu: {
      used: usage.cuMinutes,
      limit: limits.maxComputerUseMinutes,
      pct: pct(usage.cuMinutes, limits.maxComputerUseMinutes),
    },
    features: {
      autopilotEnabled: limits.autopilotEnabled,
      allowedModels: limits.allowedModels,
      analyticsHistoryDays: limits.analyticsHistoryDays,
      maxIgAccounts: limits.maxIgAccounts,
      maxTtAccounts: limits.maxTtAccounts,
    },
    month: monthKey(),
  };
};
