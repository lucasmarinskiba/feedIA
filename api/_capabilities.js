/**
 * Capability Matrix — gradiente explícito tier-by-tier.
 *
 * Cada plan obtiene MEJOR experiencia en velocidad, calidad, agents, memoria,
 * validaciones, retries. Free es USABLE pero mejorable cada tier.
 *
 * Justifica el upgrade SIN frustrar al free user.
 */

export const CAPABILITY_MATRIX = {
  free: {
    label: '🆓 Free',
    // ─── Modelos LLM (calidad ascendente) ──────────────────────────────
    llm: {
      primary: 'llama-3.3-70b-groq', // libre, rápido
      fallback: 'llama-3.2-3b-hf',
      qualityScore: 65, // /100
      avgLatencyMs: 800, // Groq es rápido
      contextWindow: 8_000, // tokens
      requiresUserKey: true, // BYOK obligatorio si volumen alto
      provider: 'groq+huggingface',
    },
    computerUse: {
      enabled: true,
      minutesPerDay: 30, // 30 min/día gratis
      visionCallsPerDay: 25, // cap separado para vision
      visionProvider: 'groq-llama-3.2-90b-vision',
      byokSupported: ['ollama-llava', 'ollama-llama3.2-vision'],
      recipesAvailable: 6,
      autoExecute: false,
      planMode: 'recipe-first-then-vision',
    },
    autopilot: {
      enabled: true,
      mode: 'recommend-only',
      ticksPerDay: 6,
      intervalHours: 4,
    },
    // ─── Imágenes ───────────────────────────────────────────────────────
    image: {
      provider: 'pollinations',
      model: 'flux-schnell-free',
      qualityScore: 70,
      avgGenerationSec: 6,
      maxResolution: '1080x1350',
      stylePresets: 3,
    },
    // ─── Strategy + production ─────────────────────────────────────────
    strategy: {
      agentCount: 3, // hook, format, audience
      reasoningDepth: 'shallow', // 1 pasada
      validationPasses: 0,
      retryOnLowScore: false,
    },
    viralPredictor: {
      enabled: true,
      breakdownDetail: 'basic', // solo score + flags
      predictionAccuracy: 0.65,
    },
    memory: {
      historyDays: 7,
      embeddingsEnabled: false,
      brainModulesActive: 5, // de 35
      crossUserLearning: false,
    },
    performance: {
      cacheEnabled: true, // cache agresivo para reducir cost
      cacheTtl: 3600,
      parallelization: 1, // serializa todo
      priorityQueue: 'low',
    },
    // ─── Friction puntos (deliberados, no rabiosos) ────────────────────
    friction: {
      watermark: false, // sin watermark — pero...
      brandedFooter: true, // "Made with FeedIA" en exports
      generationDelayMs: 0, // sin throttle artificial
      maxConcurrentJobs: 1,
      requiresBYOK: false, // suave: solo si pasa de 30 reqs/día
    },
  },

  starter: {
    label: '⚡ Starter',
    llm: {
      primary: 'sonnet-4.6',
      fallback: 'llama-3.3-70b-groq',
      qualityScore: 88,
      avgLatencyMs: 2200,
      contextWindow: 50_000,
      requiresUserKey: false,
      provider: 'anthropic',
    },
    computerUse: {
      enabled: true,
      minutesPerDay: 90,
      visionCallsPerDay: 100,
      visionProvider: 'claude-sonnet-vision',
      recipesAvailable: 12,
      autoExecute: true, // auto-execute recipes
      planMode: 'recipe-or-llm',
    },
    autopilot: {
      enabled: true,
      mode: 'auto-execute-recipes',
      ticksPerDay: 12,
      intervalHours: 2,
    },
    image: {
      provider: 'fal+pollinations',
      model: 'flux-schnell-paid',
      qualityScore: 85,
      avgGenerationSec: 3,
      maxResolution: '1080x1920',
      stylePresets: 8,
    },
    strategy: {
      agentCount: 6,
      reasoningDepth: 'medium',
      validationPasses: 1,
      retryOnLowScore: false,
    },
    viralPredictor: {
      enabled: true,
      breakdownDetail: 'detailed',
      predictionAccuracy: 0.75,
    },
    memory: {
      historyDays: 30,
      embeddingsEnabled: true,
      brainModulesActive: 12,
      crossUserLearning: false,
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 1800,
      parallelization: 2,
      priorityQueue: 'normal',
    },
    friction: {
      watermark: false,
      brandedFooter: false,
      generationDelayMs: 0,
      maxConcurrentJobs: 2,
      requiresBYOK: false,
    },
  },

  pro: {
    label: '🚀 Pro',
    llm: {
      primary: 'sonnet-4.6',
      fallback: 'haiku-4.5',
      qualityScore: 90,
      avgLatencyMs: 1900,
      contextWindow: 200_000,
      requiresUserKey: false,
      provider: 'anthropic',
    },
    computerUse: {
      enabled: true,
      minutesPerDay: 240, // 4hs
      visionCallsPerDay: 300,
      visionProvider: 'claude-sonnet-vision',
      recipesAvailable: 16,
      autoExecute: true,
      planMode: 'llm-or-recipe',
    },
    autopilot: {
      enabled: true,
      mode: 'auto-execute',
      ticksPerDay: 48,
      intervalMinutes: 30,
    },
    image: {
      provider: 'fal',
      model: 'flux-dev',
      qualityScore: 90,
      avgGenerationSec: 4,
      maxResolution: '2048x2048',
      stylePresets: 20,
    },
    strategy: {
      agentCount: 12, // multi-agent council activo
      reasoningDepth: 'deep',
      validationPasses: 2,
      retryOnLowScore: true, // si score < 60, regenera
    },
    viralPredictor: {
      enabled: true,
      breakdownDetail: 'full',
      predictionAccuracy: 0.82,
    },
    memory: {
      historyDays: 90,
      embeddingsEnabled: true,
      brainModulesActive: 22,
      crossUserLearning: true, // anonimizado, opt-in
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 900,
      parallelization: 4,
      priorityQueue: 'high',
    },
    friction: {
      watermark: false,
      brandedFooter: false,
      generationDelayMs: 0,
      maxConcurrentJobs: 5,
      requiresBYOK: false,
    },
  },

  gold: {
    label: '🏆 Gold',
    llm: {
      primary: 'opus-4.7',
      fallback: 'sonnet-4.6',
      tertiary: 'haiku-4.5',
      qualityScore: 98,
      avgLatencyMs: 4500,
      contextWindow: 200_000,
      thinkingEnabled: true,
      requiresUserKey: false,
      provider: 'anthropic',
    },
    computerUse: {
      enabled: true,
      minutesPerDay: 480, // 8hs
      visionCallsPerDay: 800,
      visionProvider: 'claude-opus-vision',
      recipesAvailable: 24,
      autoExecute: true,
      planMode: 'opus-thinking',
      multiAgentCouncil: true,
    },
    autopilot: {
      enabled: true,
      mode: 'auto-execute-with-council',
      ticksPerDay: 144,
      intervalMinutes: 10,
    },
    image: {
      provider: 'fal+midjourney-style',
      model: 'flux-pro',
      qualityScore: 95,
      avgGenerationSec: 6,
      maxResolution: '4096x4096',
      stylePresets: 50,
      upscaler: true,
    },
    strategy: {
      agentCount: 24, // council completo + simulación
      reasoningDepth: 'expert',
      validationPasses: 3,
      retryOnLowScore: true,
      simulationEngine: true, // Monte Carlo pre-publish
    },
    viralPredictor: {
      enabled: true,
      breakdownDetail: 'full+simulation',
      predictionAccuracy: 0.88,
      monteCarlo: { trials: 500, scenarios: 5 },
    },
    memory: {
      historyDays: 365,
      embeddingsEnabled: true,
      brainModulesActive: 35, // todos los módulos
      crossUserLearning: true,
      personalizedBrainTraining: true, // brain aprende solo del user
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 600,
      parallelization: 8,
      priorityQueue: 'priority',
    },
    friction: {
      watermark: false,
      brandedFooter: false,
      generationDelayMs: 0,
      maxConcurrentJobs: 10,
      requiresBYOK: false,
    },
  },

  premium: {
    label: '👑 Premium',
    llm: {
      primary: 'opus-4.7',
      fallback: 'opus-4.7',
      qualityScore: 99,
      avgLatencyMs: 4500,
      contextWindow: 1_000_000,
      thinkingEnabled: true,
      effortMax: true,
      requiresUserKey: false,
      provider: 'anthropic',
      whiteLabel: true,
    },
    computerUse: {
      enabled: true,
      minutesPerDay: 1_440, // 24hs always-on
      visionCallsPerDay: 3_000,
      visionProvider: 'claude-opus-vision+thinking',
      recipesAvailable: 32,
      autoExecute: true,
      planMode: 'opus-thinking-max',
      multiAgentCouncil: true,
      humanReviewQueue: true,
    },
    autopilot: {
      enabled: true,
      mode: 'auto-execute-with-council-and-human-review',
      ticksPerDay: 288,
      intervalMinutes: 5,
      dedicatedQueue: true,
    },
    image: {
      provider: 'fal+midjourney+ideogram',
      model: 'flux-pro-ultra+ideogram-v2',
      qualityScore: 99,
      avgGenerationSec: 8,
      maxResolution: '8192x8192',
      stylePresets: 100,
      upscaler: true,
      videoGen: true, // Sora/Veo/Pika acceso
    },
    strategy: {
      agentCount: 35, // brain completo + custom agents
      reasoningDepth: 'expert+',
      validationPasses: 5,
      retryOnLowScore: true,
      simulationEngine: true,
      humanReviewLayer: true, // queue para review humano opcional
    },
    viralPredictor: {
      enabled: true,
      breakdownDetail: 'full+simulation+humanReview',
      predictionAccuracy: 0.92,
      monteCarlo: { trials: 2000, scenarios: 12 },
      backtest: true, // valida contra dataset histórico
    },
    memory: {
      historyDays: 730, // 2 años
      embeddingsEnabled: true,
      brainModulesActive: 35,
      crossUserLearning: true,
      personalizedBrainTraining: true,
      multiAccountMemory: true, // memoria compartida entre brands del user
    },
    performance: {
      cacheEnabled: true,
      cacheTtl: 300, // cache corto = data más fresca
      parallelization: 20,
      priorityQueue: 'enterprise', // queue dedicada
      slaMs: 5000, // SLA: 5s response time
    },
    friction: {
      watermark: false,
      brandedFooter: false,
      generationDelayMs: 0,
      maxConcurrentJobs: 50,
      requiresBYOK: false,
      apiAccess: true,
      whiteLabel: true,
    },
  },
};

export const getCapabilities = (planId) => CAPABILITY_MATRIX[planId] || CAPABILITY_MATRIX.free;

/**
 * Compara dos planes y devuelve diff legible (upgrade pitch).
 */
export const compareCapabilities = (fromPlan, toPlan) => {
  const a = getCapabilities(fromPlan);
  const b = getCapabilities(toPlan);
  return {
    qualityJump: {
      llm: `${a.llm.qualityScore} → ${b.llm.qualityScore} (+${b.llm.qualityScore - a.llm.qualityScore})`,
      image: `${a.image.qualityScore} → ${b.image.qualityScore} (+${b.image.qualityScore - a.image.qualityScore})`,
      prediction: `${(a.viralPredictor.predictionAccuracy * 100).toFixed(0)}% → ${(b.viralPredictor.predictionAccuracy * 100).toFixed(0)}%`,
    },
    speedJump: {
      llmLatency: `${a.llm.avgLatencyMs}ms → ${b.llm.avgLatencyMs}ms`,
      parallelJobs: `${a.performance.parallelization}x → ${b.performance.parallelization}x`,
      concurrentJobs: `${a.friction.maxConcurrentJobs} → ${b.friction.maxConcurrentJobs}`,
    },
    intelligence: {
      agents: `${a.strategy.agentCount} → ${b.strategy.agentCount}`,
      brainModules: `${a.memory.brainModulesActive} → ${b.memory.brainModulesActive} (de 35 totales)`,
      reasoningDepth: `${a.strategy.reasoningDepth} → ${b.strategy.reasoningDepth}`,
      validations: `${a.strategy.validationPasses} → ${b.strategy.validationPasses}`,
    },
    memory: {
      historyDays: `${a.memory.historyDays}d → ${b.memory.historyDays}d`,
      contextWindow: `${(a.llm.contextWindow / 1000).toFixed(0)}K → ${(b.llm.contextWindow / 1000).toFixed(0)}K tokens`,
    },
  };
};
