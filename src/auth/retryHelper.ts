/**
 * Retry Helper — backoff exponencial para llamadas a APIs externas.
 *
 * Reintenta operaciones que fallan por rate limit, network, o errores transitorios.
 * Jitter aleatorio para evitar thundering herd.
 */

import { log } from '../agent/logger.js';

export interface RetryConfig {
  maxAttempts: number; // default 5
  baseDelayMs: number; // default 1000
  maxDelayMs: number; // default 60000 (1 min cap)
  jitterFactor: number; // default 0.3 (±30%)
  retryableErrors?: (err: unknown) => boolean;
}

const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 5,
  baseDelayMs: 1000,
  maxDelayMs: 60_000,
  jitterFactor: 0.3,
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableDefault = (err: unknown): boolean => {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  // Rate limits, timeouts, 5xx, network errors
  return (
    msg.includes('rate limit') ||
    msg.includes('429') ||
    msg.includes('timeout') ||
    msg.includes('econnreset') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('socket hang up') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('500') ||
    msg.includes('temporarily unavailable')
  );
};

const computeDelay = (attempt: number, cfg: RetryConfig): number => {
  // Exponencial: base × 2^(attempt-1)
  const exp = cfg.baseDelayMs * Math.pow(2, attempt - 1);
  const capped = Math.min(exp, cfg.maxDelayMs);
  // Jitter ±X%
  const jitter = capped * cfg.jitterFactor * (Math.random() * 2 - 1);
  return Math.max(0, capped + jitter);
};

/**
 * Ejecuta `fn` con retry exponencial.
 * Re-lanza el error si agota maxAttempts o si el error no es retriable.
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context = 'operation',
): Promise<T> => {
  const cfg: RetryConfig = { ...DEFAULT_CONFIG, ...config };
  const isRetryable = cfg.retryableErrors ?? isRetryableDefault;

  let lastError: unknown;
  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      const retryable = isRetryable(err);
      log.warn('[retry] attempt failed', {
        context,
        attempt,
        maxAttempts: cfg.maxAttempts,
        retryable,
        error: err instanceof Error ? err.message : String(err),
      });

      if (!retryable || attempt === cfg.maxAttempts) {
        throw err;
      }

      const delay = computeDelay(attempt, cfg);
      log.info('[retry] backoff', { context, attempt, delayMs: Math.round(delay) });
      await sleep(delay);
    }
  }

  throw lastError;
};

/** Wrapper especializado para uploads sociales (rate limits comunes). */
export const withUploadRetry = <T>(fn: () => Promise<T>, context = 'social-upload'): Promise<T> =>
  withRetry(fn, { maxAttempts: 5, baseDelayMs: 2000, maxDelayMs: 120_000 }, context);
