import { log } from '../../agent/logger.js';

export type ErrorCategory =
  | 'timeout'
  | 'network'
  | 'ui_not_found'
  | 'auth_failed'
  | 'rate_limited'
  | 'element_blocked'
  | 'navigation_failed'
  | 'unknown';

export interface ComputerUseError {
  category: ErrorCategory;
  message: string;
  retryable: boolean;
  suggestedDelay?: number;
}

export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 2000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

export class ErrorRecoveryManager {
  private retryConfig: RetryConfig;

  constructor(config?: Partial<RetryConfig>) {
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  classifyError(error: unknown): ComputerUseError {
    if (typeof error === 'string') {
      return this.parseErrorString(error);
    }

    if (error instanceof Error) {
      return this.parseErrorObject(error);
    }

    return {
      category: 'unknown',
      message: String(error),
      retryable: false,
    };
  }

  private parseErrorString(msg: string): ComputerUseError {
    const lower = msg.toLowerCase();

    if (lower.includes('timeout')) {
      return {
        category: 'timeout',
        message: msg,
        retryable: true,
        suggestedDelay: 5000,
      };
    }

    if (lower.includes('network') || lower.includes('connection')) {
      return {
        category: 'network',
        message: msg,
        retryable: true,
        suggestedDelay: 10000,
      };
    }

    if (lower.includes('not found') || lower.includes('element')) {
      return {
        category: 'ui_not_found',
        message: msg,
        retryable: true,
        suggestedDelay: 3000,
      };
    }

    if (lower.includes('401') || lower.includes('403') || lower.includes('auth') || lower.includes('login')) {
      return {
        category: 'auth_failed',
        message: msg,
        retryable: false,
      };
    }

    if (lower.includes('429') || lower.includes('rate limit')) {
      return {
        category: 'rate_limited',
        message: msg,
        retryable: true,
        suggestedDelay: 60000,
      };
    }

    if (lower.includes('blocked') || lower.includes('blocked by')) {
      return {
        category: 'element_blocked',
        message: msg,
        retryable: true,
        suggestedDelay: 5000,
      };
    }

    if (lower.includes('navigate') || lower.includes('redirect')) {
      return {
        category: 'navigation_failed',
        message: msg,
        retryable: true,
        suggestedDelay: 4000,
      };
    }

    return {
      category: 'unknown',
      message: msg,
      retryable: false,
    };
  }

  private parseErrorObject(error: Error): ComputerUseError {
    return this.parseErrorString(error.message);
  }

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>,
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    let lastError: ComputerUseError | null = null;
    let attempt = 0;
    let delay = config.initialDelay;

    while (attempt < config.maxAttempts) {
      attempt++;
      try {
        log.debug(`[ErrorRecovery] ${operationName}: attempt ${attempt}/${config.maxAttempts}`);
        return await fn();
      } catch (error) {
        lastError = this.classifyError(error);

        if (!lastError.retryable) {
          log.error(`[ErrorRecovery] ${operationName} failed (non-retryable): ${lastError.category}`);
          throw error;
        }

        if (attempt >= config.maxAttempts) {
          log.error(`[ErrorRecovery] ${operationName} failed after ${config.maxAttempts} attempts`);
          throw error;
        }

        const waitTime = lastError.suggestedDelay || Math.min(delay, config.maxDelay);
        log.warn(`[ErrorRecovery] ${operationName} (${lastError.category}). Retry in ${waitTime}ms...`);

        await this.wait(waitTime);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }

    throw lastError || new Error(`${operationName} failed after ${config.maxAttempts} attempts`);
  }

  getRecoveryStrategy(error: ComputerUseError): string {
    switch (error.category) {
      case 'timeout':
        return 'Increase timeout. Try again with slower network conditions.';
      case 'network':
        return 'Check network. Wait for connection. Retry.';
      case 'ui_not_found':
        return 'Page not loaded. Wait for render. Scroll to find element. Retry.';
      case 'auth_failed':
        return 'Manual login required. Credentials expired.';
      case 'rate_limited':
        return 'Hit rate limit. Exponential backoff. Retry after delay.';
      case 'element_blocked':
        return 'Element obscured. Scroll/click to reveal. Retry operation.';
      case 'navigation_failed':
        return 'Navigation error. Verify URL. Refresh page. Retry.';
      default:
        return 'Unknown error. Check logs. Retry.';
    }
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const errorRecoveryManager = new ErrorRecoveryManager({
  maxAttempts: 3,
  initialDelay: 2000,
});
