/**
 * Retry Logic — Exponential backoff + circuit breaker
 *
 * Flow: Call function → Fail → Exponential backoff → Retry → Success or circuit break
 *
 * Circuit breaker prevents cascading failures (stops retrying after X failures in window)
 */

import { debug, error as logError, warn } from './structured-logger.js';

// ─── Types ──────────────────────────────────────────────────────────────

export interface RetryOptions {
  maxRetries?: number; // Default: 3
  initialDelayMs?: number; // Default: 100ms
  maxDelayMs?: number; // Default: 10s
  backoffMultiplier?: number; // Default: 2
  timeoutMs?: number; // Timeout per attempt
  name?: string; // For logging
}

export interface CircuitBreakerOptions {
  failureThreshold?: number; // Failures before open (default: 5)
  resetTimeoutMs?: number; // Time before half-open (default: 30s)
  windowSizeMs?: number; // Window for counting failures (default: 60s)
  name?: string;
}

// ─── Circuit Breaker State ──────────────────────────────────────────────

interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailureTime: number;
  openedAt: number;
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    state: 'closed',
    failures: 0,
    lastFailureTime: 0,
    openedAt: 0,
  };

  constructor(private options: Required<CircuitBreakerOptions>) {}

  /**
   * Check if call is allowed
   */
  canExecute(): boolean {
    const { state, openedAt } = this.state;
    const { resetTimeoutMs } = this.options;

    if (state === 'closed') return true;
    if (state === 'open') {
      // Try half-open after timeout
      if (Date.now() - openedAt > resetTimeoutMs) {
        this.state.state = 'half-open';
        return true;
      }
      return false;
    }
    // half-open: allow one attempt
    return true;
  }

  /**
   * Record success—reset breaker
   */
  recordSuccess(): void {
    this.state = {
      state: 'closed',
      failures: 0,
      lastFailureTime: 0,
      openedAt: 0,
    };
  }

  /**
   * Record failure—may open breaker
   */
  recordFailure(): void {
    const now = Date.now();
    const { failureThreshold, windowSizeMs } = this.options;

    // Clear old failures outside window
    if (now - this.state.lastFailureTime > windowSizeMs) {
      this.state.failures = 0;
    }

    this.state.failures += 1;
    this.state.lastFailureTime = now;

    if (this.state.failures >= failureThreshold) {
      this.state.state = 'open';
      this.state.openedAt = now;
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }
}

// ─── Retry Execution ────────────────────────────────────────────────────

/**
 * Execute function with exponential backoff retry
 *
 * Returns result on success or throws last error after max retries
 */
export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> => {
  const {
    maxRetries = 3,
    initialDelayMs = 100,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    timeoutMs = 30000,
    name = 'operation',
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Apply timeout to this attempt
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`${name} timeout after ${timeoutMs}ms`)), timeoutMs),
        ),
      ]);

      if (attempt > 0) {
        debug(`${name} succeeded on attempt ${attempt + 1}`, { attempt: attempt + 1, maxRetries });
      }

      return result;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt >= maxRetries) {
        logError(`${name} failed after ${maxRetries + 1} attempts`, lastError, {
          operation: name,
          attempts: maxRetries + 1,
        });
        throw lastError;
      }

      // Calculate backoff delay
      const delayMs = Math.min(initialDelayMs * Math.pow(backoffMultiplier, attempt), maxDelayMs);

      warn(`${name} attempt ${attempt + 1} failed, retrying in ${delayMs}ms`, {
        operation: name,
        attempt: attempt + 1,
        delay: delayMs,
        error: lastError.message,
      });

      // Wait before retry
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should never reach here
  throw lastError || new Error(`${name} failed`);
};

/**
 * Execute function with circuit breaker
 *
 * Stops retrying if breaker opens (threshold failures in window)
 */
export const executeWithCircuitBreaker = async <T>(
  fn: () => Promise<T>,
  breaker: CircuitBreaker,
  options: RetryOptions = {},
): Promise<T> => {
  if (!breaker.canExecute()) {
    throw new Error('Circuit breaker is OPEN. Service unavailable.');
  }

  try {
    const result = await retryWithBackoff(fn, options);
    breaker.recordSuccess();
    return result;
  } catch (err) {
    breaker.recordFailure();
    throw err;
  }
};

/**
 * Create circuit breaker instance
 */
export const createCircuitBreaker = (options: CircuitBreakerOptions = {}): CircuitBreaker => {
  const defaults: Required<CircuitBreakerOptions> = {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    windowSizeMs: 60000,
    name: 'circuit-breaker',
  };

  return new CircuitBreaker({ ...defaults, ...options });
};

export default {
  retryWithBackoff,
  executeWithCircuitBreaker,
  createCircuitBreaker,
};
