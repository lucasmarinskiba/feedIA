/**
 * Plan Features Matrix — single source of truth para enforcement.
 *
 * Cada feature listado en pricing.html debe tener entrada acá con su impl status:
 *   - 'enforced'        → backend implementa + gatea por plan
 *   - 'enforced-via-llm'→ implementado vía prompt en LLM call con plan-aware system
 *   - 'opt-in'          → disponible al user pero requiere config manual
 *   - 'ops-required'    → requiere intervención humana/ops (account manager, SLA)
 *   - 'roadmap'         → declarado en pricing pero no implementado todavía
 *
 * Si user reclama feature missing → mostrar este matrix y decir status real.
 */

export const PLAN_FEATURES = {
  free: {
    planId: 'free',
    contentGeneration: {
      maxPostsPerMonth: { value: 8, status: 'enforced', enforcedBy: '_usage.js checkQuota' },
      strategist: { value: true, status: 'enforced', enforcedBy: '_strategist.js buildStrategicPlan' },
      viralPredictor: {
        value: true,
        status: 'enforced',
        enforcedBy: '_viralPredictor.js predictVirality',
        minScore: 0,
      },
      hashtagsTiers: { value: 3, status: 'enforced-via-llm' },
    },
    ai: {
      primaryLLM: { value: 'llama-3.3-70b-groq', status: 'enforced', enforcedBy: '_aiRouter.js routeLlm' },
      visionLLM: {
        value: 'llama-3.2-90b-vision-groq',
        status: 'enforced',
        enforcedBy: '_freeComputerUse.js analyzeScreenshot',
      },
      llamaRouting: { value: 'always', status: 'enforced' },
    },
    image: {
      provider: { value: 'pollinations-flux', status: 'enforced', enforcedBy: '_freeAi.js freeImage' },
      resolution: { value: '1080x1350', status: 'enforced' },
      watermarkFree: { value: true, status: 'enforced' },
    },
    video: {
      creditsPerMonth: { value: 0, status: 'enforced' },
      draftsUnlimited: { value: true, status: 'opt-in', notes: 'Pollinations video draft' },
      maxResolution: { value: 'none', status: 'enforced' },
    },
    computerUse: {
      minutesPerDay: { value: 30, status: 'enforced', enforcedBy: '_freeComputerUse.js checkCuCap' },
      visionCallsPerDay: { value: 25, status: 'enforced', enforcedBy: '_freeComputerUse.js checkVisionCallCap' },
      recipesAvailable: { value: 6, status: 'enforced', enforcedBy: '_freeComputerUse.js FREE_RECIPES' },
      byokOllama: { value: true, status: 'enforced', enforcedBy: '_freeComputerUse.js byok.ollama check' },
    },
    autopilot: {
      enabled: { value: true, status: 'enforced' },
      mode: { value: 'recommend-only', status: 'enforced', enforcedBy: '_freeComputerUse.js runFreeAutopilotTick' },
      ticksPerDay: { value: 6, status: 'enforced', enforcedBy: '_freeComputerUse.js checkAutopilotCap' },
    },
    analytics: {
      historyDays: { value: 7, status: 'enforced', enforcedBy: '_usage.js checkQuota analytics-history:N' },
    },
    accounts: {
      maxInstagram: { value: 1, status: 'enforced', enforcedBy: '_usage.js checkQuota ig-account' },
      maxTiktok: { value: 1, status: 'enforced', enforcedBy: '_usage.js checkQuota tt-account' },
    },
    support: { tier: 'community', channel: 'discord', status: 'ops-required' },
  },

  starter: {
    planId: 'starter',
    contentGeneration: {
      maxPostsPerMonth: { value: 20, status: 'enforced' },
      strategist: { value: true, status: 'enforced', depth: 'shallow' },
      viralPredictor: {
        value: true,
        status: 'enforced',
        minScore: 65,
        enforcedBy: '_contentForge.js will block publish if score < 65',
      },
      hashtagsTiers: { value: 5, status: 'enforced-via-llm' },
      qualityFloor: { value: 'starter', status: 'enforced', enforcedBy: '_usage.js qualityFloor' },
    },
    ai: {
      primaryLLM: {
        value: 'claude-sonnet-4-6',
        status: 'enforced',
        enforcedBy: '_aiRouter.js routeLlm planId=starter',
      },
      fallbackLLM: { value: 'llama-3.3-70b-groq', status: 'enforced' },
      visionLLM: { value: 'claude-sonnet-vision', status: 'enforced' },
      llamaRouting: { value: 'optional-drafts', status: 'enforced', enforcedBy: '_aiRouter.js preferLlama param' },
    },
    image: {
      provider: { value: 'fal-flux-schnell', status: 'enforced' },
      resolution: { value: '1080x1350-FullHD', status: 'enforced' },
      canvaStyleTemplates: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'LLM prompt incluye "estilo Canva pro templates"',
      },
      brandKitApplication: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'Si user tiene brand stored, se inyecta en prompts',
      },
    },
    video: {
      creditsPerMonth: { value: 80, status: 'enforced' },
      maxResolution: { value: '1080p', status: 'enforced', enforcedBy: '_usage.js video allowedVideoResolutions' },
      maxSecondsPerClip: { value: 15, status: 'enforced' },
    },
    computerUse: {
      minutesPerDay: { value: 90, status: 'enforced' },
      visionCallsPerDay: { value: 100, status: 'enforced' },
      autoExecute: { value: true, status: 'enforced' },
    },
    autopilot: {
      enabled: { value: true, status: 'enforced' },
      mode: { value: 'auto-execute-recipes', status: 'enforced' },
      ticksPerDay: { value: 12, status: 'enforced' },
      intervalHours: { value: 2, status: 'enforced' },
    },
    analytics: {
      historyDays: { value: 30, status: 'enforced' },
    },
    accounts: { maxInstagram: 1, maxTiktok: 1, status: 'enforced' },
    support: { tier: 'email', responseHours: '24-48', status: 'ops-required' },
  },

  pro: {
    planId: 'pro',
    contentGeneration: {
      maxPostsPerMonth: { value: 80, status: 'enforced' },
      strategist: { value: true, status: 'enforced', depth: 'medium' },
      viralPredictor: { value: true, status: 'enforced', minScore: 72 },
      hashtagsTiers: { value: 7, status: 'enforced-via-llm', includesTrending: true },
      patternInterrupts: { value: true, status: 'enforced-via-llm', notes: 'Inyectado en system prompt' },
      psychographicMatching: { value: true, status: 'enforced-via-llm' },
      calendarAutoGenerated: {
        value: true,
        status: 'enforced',
        enforcedBy: '_calendarPlanner.js generateWeeklyCalendar via /api/calendar/generate',
      },
      qualityFloor: { value: 'pro', status: 'enforced' },
    },
    ai: {
      primaryLLM: { value: 'claude-sonnet-4-6', status: 'enforced' },
      fallbackLLM: { value: 'claude-haiku-4-5', status: 'enforced' },
      tertiaryLLM: { value: 'llama-3.3-70b-groq', status: 'enforced' },
      visionLLM: { value: 'claude-sonnet-vision', status: 'enforced' },
    },
    image: {
      provider: { value: 'fal-flux-dev', status: 'enforced' },
      resolution: { value: '1920x1920-FullHD-Plus', status: 'enforced' },
      brandKitLocked: { value: true, status: 'enforced-via-llm' },
    },
    video: {
      creditsPerMonth: { value: 300, status: 'enforced' },
      maxResolution: { value: '1080p', status: 'enforced' },
      maxSecondsPerClip: { value: 30, status: 'enforced' },
      beatSync: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'Script generation incluye beat markers + caption sync',
      },
      autoCaptions: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'Reel/video output incluye captions automáticas',
      },
      bRollAutomatic: { value: true, status: 'enforced-via-llm', notes: 'Script incluye b-roll prompts por beat' },
    },
    computerUse: {
      minutesPerDay: { value: 240, status: 'enforced' },
      visionCallsPerDay: { value: 300, status: 'enforced' },
      autoExecute: { value: true, status: 'enforced' },
    },
    autopilot: {
      enabled: { value: true, status: 'enforced' },
      mode: { value: 'auto-execute', status: 'enforced' },
      ticksPerDay: { value: 48, status: 'enforced' },
      intervalMinutes: { value: 30, status: 'enforced' },
    },
    communityManager: {
      enabled: { value: true, status: 'enforced', enforcedBy: 'cuCommentResponder + cuDMResponder' },
      brandToneInjection: { value: true, status: 'enforced-via-llm' },
    },
    analytics: {
      historyDays: { value: 90, status: 'enforced' },
      nicheBenchmark: { value: true, status: 'enforced', enforcedBy: 'nicheBrainExpander' },
    },
    accounts: { maxInstagram: 2, maxTiktok: 2, status: 'enforced' },
    support: { tier: 'priority-email', responseHours: '8-24', status: 'ops-required' },
  },

  gold: {
    planId: 'gold',
    contentGeneration: {
      maxPostsPerMonth: { value: 150, status: 'enforced' },
      strategist: { value: true, status: 'enforced', depth: 'deep' },
      viralPredictor: { value: true, status: 'enforced', minScore: 80 },
      hashtagsTiers: { value: 7, status: 'enforced-via-llm', includesTrending: true, includesNicheDiscovery: true },
      multiAgentCouncil: {
        value: 8,
        status: 'enforced',
        enforcedBy: '_contentForge.js calls multiAgentCouncil before publish',
        roles: ['strategist', 'analyst', 'creative', 'community', 'product', 'finance', 'risk', 'trends'],
        rounds: 3,
      },
      monteCarloSimulation: {
        value: 500,
        status: 'enforced',
        enforcedBy: '_contentForge.js calls simulationEngine pre-publish',
        trials: 500,
      },
      iconographyConsistency: { value: true, status: 'enforced-via-llm' },
      qualityFloor: { value: 'gold', status: 'enforced' },
    },
    ai: {
      primaryLLM: {
        value: 'claude-opus-4-7',
        status: 'enforced',
        enforcedBy: '_aiRouter.js gold → callAnthropic opus',
      },
      thinkingEnabled: { value: true, status: 'enforced' },
      effort: { value: 'high', status: 'enforced' },
      fallbackLLM: { value: 'claude-sonnet-4-6', status: 'enforced' },
    },
    image: {
      provider: { value: 'fal-flux-pro', status: 'enforced' },
      secondaryProvider: { value: 'ideogram-v2', status: 'enforced' },
      resolution: { value: '2048x2048-2K', status: 'enforced' },
    },
    video: {
      creditsPerMonth: { value: 800, status: 'enforced' },
      maxResolution: { value: '4K', status: 'enforced' },
      maxSecondsPerClip: { value: 60, status: 'enforced' },
      motionGraphics: { value: true, status: 'enforced-via-llm', notes: 'Inyectado en script + render hints' },
      transitions: { value: true, status: 'enforced-via-llm' },
      soundDesign: { value: true, status: 'enforced-via-llm', notes: 'Audio suggestion incluye SFX layers' },
    },
    computerUse: {
      minutesPerDay: { value: 480, status: 'enforced' },
      visionCallsPerDay: { value: 800, status: 'enforced' },
    },
    autopilot: {
      enabled: { value: true, status: 'enforced' },
      mode: { value: 'auto-execute-with-council', status: 'enforced' },
      ticksPerDay: { value: 144, status: 'enforced' },
      intervalMinutes: { value: 10, status: 'enforced' },
      councilAprovesDecisions: { value: true, status: 'enforced' },
    },
    brain: {
      modulesActive: { value: 35, status: 'enforced' },
      okrAutonomous: { value: true, status: 'enforced', enforcedBy: 'executiveOKR.ts' },
      salaEjecutiva: { value: true, status: 'enforced', enforcedBy: 'executiveCommandCenter.ts' },
    },
    analytics: {
      historyDays: { value: 365, status: 'enforced' },
      competitorBenchmarks: { value: true, status: 'enforced' },
    },
    accounts: { maxInstagram: 3, maxTiktok: 3, status: 'enforced' },
    support: { tier: 'chat', responseHours: '4-12', status: 'ops-required' },
  },

  premium: {
    planId: 'premium',
    contentGeneration: {
      maxPostsPerMonth: { value: 400, status: 'enforced' },
      strategist: { value: true, status: 'enforced', depth: 'expert+' },
      viralPredictor: { value: true, status: 'enforced', minScore: 88 },
      hashtagsTiers: { value: 9, status: 'enforced-via-llm', includesGeoTargeting: true, includesCompetitorGap: true },
      multiAgentCouncil: { value: 8, status: 'enforced', rounds: 3 },
      monteCarloSimulation: { value: 2000, status: 'enforced' },
      abTestingPrePublish: {
        value: true,
        status: 'enforced',
        enforcedBy: '_contentForge.js generates 2 variants + simulates each',
      },
      humanReviewQueue: { value: true, status: 'opt-in', enforcedBy: 'review queue table, manual reviewers needed' },
      qualityFloor: { value: 'premium', status: 'enforced' },
    },
    ai: {
      primaryLLM: { value: 'claude-opus-4-7', status: 'enforced' },
      thinkingEnabled: { value: true, status: 'enforced' },
      effort: { value: 'max', status: 'enforced', enforcedBy: '_aiRouter.js premium → effort=max' },
      contextWindow: { value: 1_000_000, status: 'enforced' },
    },
    image: {
      provider: { value: 'fal-flux-pro-ultra', status: 'enforced' },
      secondaryProvider: { value: 'ideogram-v2', status: 'enforced' },
      resolution: { value: '4K-upscaled-8K', status: 'enforced' },
      customIllustrations: { value: true, status: 'enforced-via-llm' },
    },
    video: {
      creditsPerMonth: { value: 1500, status: 'enforced' },
      maxResolution: { value: '4K-HDR', status: 'enforced' },
      maxSecondsPerClip: { value: 120, status: 'enforced' },
      vfxColorGrading: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'Color grading prompt incluido en script + render hints fal.ai',
      },
      soundDesign: { value: true, status: 'enforced-via-llm' },
      kineticTypography: { value: true, status: 'enforced-via-llm' },
      sorActiveGen: { value: true, status: 'roadmap', notes: 'fal.ai sora/veo models pending acceso' },
      voiceCloning: { value: true, status: 'roadmap', notes: 'ElevenLabs integration pending' },
      regionalLocalization: {
        value: true,
        status: 'enforced-via-llm',
        notes: 'Multi-lang generation funciona, voz cloning pending',
      },
    },
    computerUse: {
      minutesPerDay: { value: 1440, status: 'enforced' },
      alwaysOn: { value: true, status: 'enforced', notes: '24hs cap = always-on con cron tick' },
      visionCallsPerDay: { value: 3000, status: 'enforced' },
    },
    autopilot: {
      enabled: { value: true, status: 'enforced' },
      mode: { value: 'auto-execute-with-council-and-human-review', status: 'enforced' },
      ticksPerDay: { value: 288, status: 'enforced' },
      intervalMinutes: { value: 5, status: 'enforced' },
      dedicatedQueue: { value: true, status: 'enforced', notes: 'Priority lane en scheduling' },
    },
    enterprise: {
      whiteLabel: { value: true, status: 'enforced', enforcedBy: '_whiteLabel.js + /api/whitelabel/config' },
      apiAccess: {
        value: true,
        status: 'enforced',
        enforcedBy: '_apiKeys.js mintApiKey + validateApiKey via /api/keys',
      },
      sdk: { value: true, status: 'opt-in', notes: 'Public REST API live. Node SDK + Python SDK roadmap.' },
      accountManager: { value: true, status: 'ops-required' },
      sla: { value: '99.9%', status: 'ops-required', notes: 'Infrastructure dependency' },
    },
    analytics: {
      historyDays: { value: 730, status: 'enforced' },
    },
    accounts: { maxInstagram: 5, maxTiktok: 5, status: 'enforced' },
    support: { tier: 'dedicated', responseHours: '4', status: 'ops-required' },
  },
};

/**
 * Resuelve feature por planId + path (dot notation).
 *  getFeature('gold', 'contentGeneration.multiAgentCouncil')
 *  → { value: 8, status: 'enforced', roles: [...], rounds: 3 }
 */
export const getFeature = (planId, path) => {
  const plan = PLAN_FEATURES[planId];
  if (!plan) return null;
  return path.split('.').reduce((acc, k) => acc?.[k], plan);
};

/**
 * Devuelve true si el plan tiene un feature habilitado.
 *  hasFeature('gold', 'contentGeneration.multiAgentCouncil')
 */
export const hasFeature = (planId, path) => {
  const f = getFeature(planId, path);
  if (!f) return false;
  if (typeof f === 'object' && 'value' in f) return Boolean(f.value);
  return Boolean(f);
};

/**
 * Lista features status 'roadmap' (no implementados) para un plan.
 *  Útil para mostrar UI honesta o admin dashboard.
 */
export const getRoadmapFeatures = (planId) => {
  const plan = PLAN_FEATURES[planId];
  if (!plan) return [];
  const out = [];
  const walk = (obj, path = []) => {
    for (const [k, v] of Object.entries(obj || {})) {
      if (v && typeof v === 'object' && v.status === 'roadmap') {
        out.push({ path: [...path, k].join('.'), ...v });
      } else if (v && typeof v === 'object' && !('status' in v)) {
        walk(v, [...path, k]);
      }
    }
  };
  walk(plan);
  return out;
};

/**
 * Compliance check: dado un planId y una lista de features prometidas en pricing,
 * devuelve el % implementado realmente.
 */
export const auditPlanCompliance = (planId) => {
  const plan = PLAN_FEATURES[planId];
  if (!plan) return { compliance: 0, total: 0, implemented: 0 };
  let total = 0;
  let implemented = 0;
  const walk = (obj) => {
    for (const v of Object.values(obj || {})) {
      if (v && typeof v === 'object' && 'status' in v) {
        total++;
        if (v.status === 'enforced' || v.status === 'enforced-via-llm' || v.status === 'opt-in') implemented++;
      } else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(plan);
  return { compliance: Math.round((implemented / total) * 100), total, implemented, planId };
};

/**
 * Builder de system prompt plan-aware para LLM calls.
 * Inyecta features que el LLM debe respetar/aplicar.
 */
export const buildPlanAwareSystemPrompt = (planId, baseSystem = '') => {
  const plan = PLAN_FEATURES[planId];
  if (!plan) return baseSystem;
  const guidelines = [];

  // Hook score minimum
  const minScore = plan.contentGeneration?.viralPredictor?.minScore || 0;
  if (minScore > 0)
    guidelines.push(`OBLIGATORIO: hook score viral ≥${minScore}. Si tu output no llega, refiná hasta lograrlo.`);

  // Hashtag tiers
  const hashtagTiers = plan.contentGeneration?.hashtagsTiers?.value;
  if (hashtagTiers) {
    const tierDesc = {
      3: 'mix mega/macro/micro (3 tiers)',
      5: 'pirámide 5-tier: 1 mega + 2 macro + 5 micro + 5 nano + 2 brand',
      7: 'pirámide 7-tier con trending: + 2 trending últimas 24-72h + 3 niche-discovery',
      9: 'pirámide 9-tier full: incluye geo-targeting + competitor-gap analysis',
    };
    guidelines.push(`Hashtags: ${tierDesc[hashtagTiers] || hashtagTiers + ' tiers'}.`);
  }

  // Pattern interrupts (Pro+)
  if (plan.contentGeneration?.patternInterrupts?.value) {
    guidelines.push('Incluir pattern interrupts cada 3-5 segundos en reels para retention.');
  }

  // Psychographic match (Pro+)
  if (plan.contentGeneration?.psychographicMatching?.value) {
    guidelines.push('Alinear copy + visual con psicografía de audiencia detectada.');
  }

  // Beat-sync video (Pro+)
  if (plan.video?.beatSync?.value) {
    guidelines.push('Para reels/videos: marcar beat positions cada 0.5-1s + caption timing sincronizado.');
  }
  if (plan.video?.autoCaptions?.value) {
    guidelines.push('Generar captions automáticas con timing exacto por palabra (SRT format si aplica).');
  }
  if (plan.video?.bRollAutomatic?.value) {
    guidelines.push('Incluir b-roll prompts específicos por cada beat (3-5 sugerencias).');
  }

  // Motion graphics + sound design (Gold+)
  if (plan.video?.motionGraphics?.value) {
    guidelines.push('Especificar motion graphics layers: transitions, text animations, kinetic elements.');
  }
  if (plan.video?.soundDesign?.value) {
    guidelines.push('Sound design: SFX layers (impacts, whooshes, drones), audio mix recommendations.');
  }

  // Brand kit
  if (plan.image?.brandKitLocked?.value || plan.image?.brandKitApplication?.value) {
    guidelines.push('Aplicar brand kit del usuario (colores, fonts, tono visual) automáticamente.');
  }

  // VFX (Premium)
  if (plan.video?.vfxColorGrading?.value) {
    guidelines.push('VFX hints: color grading LUT recommendations, cinematic look.');
  }
  if (plan.video?.kineticTypography?.value) {
    guidelines.push('Kinetic typography: text animations beat-synced, word reveal patterns.');
  }
  if (plan.video?.regionalLocalization?.value) {
    guidelines.push('Si user provee target market, localizar: idioma, modismos, referencias culturales, hashtags geo.');
  }

  if (guidelines.length === 0) return baseSystem;
  return `${baseSystem}\n\n=== PLAN ${planId.toUpperCase()} REQUIREMENTS ===\n${guidelines.join('\n')}\n=== END REQUIREMENTS ===`;
};
