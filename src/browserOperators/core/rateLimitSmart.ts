/**
 * RateLimitSmart — Límites adaptativos basados en el tamaño/historial de la cuenta.
 * Cada tier tiene límites diferentes con jitter para evitar patrones.
 */

export type RateLimitTier = 'new' | 'small' | 'medium' | 'large' | 'enterprise';

interface TierConfig {
  maxPostsPerDay: number;
  maxInteractionsPerHour: number;
  maxCommentsPerHour: number;
  maxDmsPerHour: number;
  minDelayBetweenPostsMs: number;
  minDelayBetweenInteractionsMs: number;
  minDelayBetweenCommentsMs: number;
  minDelayBetweenDmsMs: number;
}

const TIER_CONFIGS: Record<RateLimitTier, TierConfig> = {
  new: {
    maxPostsPerDay: 1,
    maxInteractionsPerHour: 10,
    maxCommentsPerHour: 5,
    maxDmsPerHour: 3,
    minDelayBetweenPostsMs: 12 * 60 * 60 * 1000, // 12h
    minDelayBetweenInteractionsMs: 20 * 60 * 1000, // 20min
    minDelayBetweenCommentsMs: 10 * 60 * 1000, // 10min
    minDelayBetweenDmsMs: 15 * 60 * 1000, // 15min
  },
  small: {
    maxPostsPerDay: 2,
    maxInteractionsPerHour: 20,
    maxCommentsPerHour: 10,
    maxDmsPerHour: 8,
    minDelayBetweenPostsMs: 6 * 60 * 60 * 1000, // 6h
    minDelayBetweenInteractionsMs: 5 * 60 * 1000, // 5min
    minDelayBetweenCommentsMs: 3 * 60 * 1000, // 3min
    minDelayBetweenDmsMs: 5 * 60 * 1000, // 5min
  },
  medium: {
    maxPostsPerDay: 3,
    maxInteractionsPerHour: 35,
    maxCommentsPerHour: 20,
    maxDmsPerHour: 15,
    minDelayBetweenPostsMs: 4 * 60 * 60 * 1000, // 4h
    minDelayBetweenInteractionsMs: 2.5 * 60 * 1000, // 2.5min
    minDelayBetweenCommentsMs: 90 * 1000, // 90s
    minDelayBetweenDmsMs: 2.5 * 60 * 1000, // 2.5min
  },
  large: {
    maxPostsPerDay: 5,
    maxInteractionsPerHour: 60,
    maxCommentsPerHour: 40,
    maxDmsPerHour: 30,
    minDelayBetweenPostsMs: 2 * 60 * 60 * 1000, // 2h
    minDelayBetweenInteractionsMs: 60 * 1000, // 1min
    minDelayBetweenCommentsMs: 45 * 1000, // 45s
    minDelayBetweenDmsMs: 60 * 1000, // 1min
  },
  enterprise: {
    maxPostsPerDay: 10,
    maxInteractionsPerHour: 120,
    maxCommentsPerHour: 80,
    maxDmsPerHour: 60,
    minDelayBetweenPostsMs: 60 * 60 * 1000, // 1h
    minDelayBetweenInteractionsMs: 30 * 1000, // 30s
    minDelayBetweenCommentsMs: 20 * 1000, // 20s
    minDelayBetweenDmsMs: 30 * 1000, // 30s
  },
};

/** Aplica jitter de ±30% a un valor */
const withJitter = (value: number): number => {
  const jitter = (Math.random() - 0.5) * 0.6; // ±30%
  return Math.round(value * (1 + jitter));
};

export const inferTierFromFollowers = (followers: number): RateLimitTier => {
  if (followers < 500) return 'new';
  if (followers < 5000) return 'small';
  if (followers < 50000) return 'medium';
  if (followers < 500000) return 'large';
  return 'enterprise';
};

export const getRateLimiter = (tier: RateLimitTier) => {
  const config = TIER_CONFIGS[tier];
  const actionLog: Record<string, number[]> = {};

  const now = () => Date.now();
  const dayAgo = () => now() - 24 * 60 * 60 * 1000;
  const hourAgo = () => now() - 60 * 60 * 1000;

  const logAction = (action: string) => {
    if (!actionLog[action]) actionLog[action] = [];
    actionLog[action].push(now());
    // Limpiar logs antiguos
    actionLog[action] = actionLog[action].filter((t) => t > dayAgo());
  };

  const getRecentCount = (action: string, since: number) => {
    const logs = actionLog[action] ?? [];
    return logs.filter((t) => t > since).length;
  };

  return {
    tier,
    config,

    recordAction(action: string) {
      logAction(action);
    },

    canProceed(action: string): boolean {
      const timeUntil = this.timeUntilNext(action);
      return timeUntil <= 0;
    },

    timeUntilNext(action: string): number {
      const logs = actionLog[action] ?? [];
      if (logs.length === 0) return 0;

      const lastAction = logs[logs.length - 1]!;
      let minDelay = 0;

      if (action.startsWith('post')) {
        minDelay = config.minDelayBetweenPostsMs;
        // Verificar límite diario
        const todayPosts = getRecentCount(action, dayAgo());
        if (todayPosts >= config.maxPostsPerDay) {
          // Calcular tiempo hasta mañana
          const tomorrow = new Date();
          tomorrow.setHours(0, 0, 0, 0);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return tomorrow.getTime() - now();
        }
      } else if (action.startsWith('comment')) {
        minDelay = config.minDelayBetweenCommentsMs;
        const hourComments = getRecentCount(action, hourAgo());
        if (hourComments >= config.maxCommentsPerHour) return 60 * 60 * 1000;
      } else if (action.startsWith('dm')) {
        minDelay = config.minDelayBetweenDmsMs;
        const hourDms = getRecentCount(action, hourAgo());
        if (hourDms >= config.maxDmsPerHour) return 60 * 60 * 1000;
      } else {
        minDelay = config.minDelayBetweenInteractionsMs;
        const hourInteractions = getRecentCount(action, hourAgo());
        if (hourInteractions >= config.maxInteractionsPerHour) return 60 * 60 * 1000;
      }

      const elapsed = now() - lastAction;
      const required = withJitter(minDelay);
      return Math.max(0, required - elapsed);
    },

    getStats(action: string) {
      return {
        today: getRecentCount(action, dayAgo()),
        thisHour: getRecentCount(action, hourAgo()),
        timeUntilNext: this.timeUntilNext(action),
      };
    },
  };
};

export type RateLimiter = ReturnType<typeof getRateLimiter>;
