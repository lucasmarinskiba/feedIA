import { log } from '../../agent/logger.js';
import { runComputerUseSession } from '../../capabilities/computerUse/controller.js';
import type { BrandProfile } from '../../config/types.js';
import type { ComputerUseOptions, ComputerUseResult } from '../../capabilities/computerUse/controller.js';
import { errorRecoveryManager } from './errorRecovery.js';

export interface ReliableSessionOptions extends ComputerUseOptions {
  operationName?: string;
  maxRetries?: number;
  onRetry?: (attempt: number, error: string) => void;
}

export const runReliableSession = async (
  brand: BrandProfile,
  opts: ReliableSessionOptions,
): Promise<ComputerUseResult> => {
  const operationName = opts.operationName || opts.goal.substring(0, 50);
  const maxRetries = opts.maxRetries ?? 3;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      log.info(`[ReliableSession] "${operationName}" (attempt ${attempt}/${maxRetries})`);

      const result = await errorRecoveryManager.executeWithRetry(
        () => runComputerUseSession(brand, opts),
        operationName,
        { maxAttempts: 1 }, // disable inner retry, we handle it here
      );

      if (!result.ok) {
        lastError = new Error(result.summary || 'Computer Use session failed');

        if (attempt < maxRetries) {
          const classified = errorRecoveryManager.classifyError(lastError);
          if (!classified.retryable) {
            throw lastError;
          }
          opts.onRetry?.(attempt, classified.message);
          continue;
        }
      }

      log.info(`[ReliableSession] "${operationName}" succeeded after ${attempt} attempt(s)`);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const classified = errorRecoveryManager.classifyError(lastError);

      if (!classified.retryable || attempt >= maxRetries) {
        log.error(`[ReliableSession] "${operationName}" failed: ${classified.category}`);
        log.error(`[ReliableSession] Recovery: ${errorRecoveryManager.getRecoveryStrategy(classified)}`);
        throw lastError;
      }

      const delay = classified.suggestedDelay || 2000 * attempt;
      log.warn(`[ReliableSession] Retry in ${delay}ms (${classified.category})`);
      opts.onRetry?.(attempt, classified.message);

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error(`${operationName} failed after ${maxRetries} attempts`);
};

/**
 * Wrap individual Computer Use calls with automatic retry + error recovery
 * Usage:
 *   const result = await executeWithRecovery(brand, {
 *     goal: "Create design in Canva",
 *     maxRetries: 3,
 *     onRetry: (attempt, error) => {
 *       console.log(`Retry ${attempt}: ${error}`);
 *     }
 *   });
 */
export const executeWithRecovery = runReliableSession;
