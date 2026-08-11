/**
 * Unit Tests — Retry Logic
 *
 * Coverage: retryWithBackoff, createCircuitBreaker, executeWithCircuitBreaker
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { retryWithBackoff, createCircuitBreaker, executeWithCircuitBreaker } from '../services/retry-logic.js';

describe('Retry Logic', () => {
  describe('retryWithBackoff', () => {
    it('succeeds on first attempt', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const result = await retryWithBackoff(fn, { maxRetries: 3, name: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('retries on failure then succeeds', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new Error('fail1'))
        .mockRejectedValueOnce(new Error('fail2'))
        .mockResolvedValueOnce('success');

      const result = await retryWithBackoff(fn, { maxRetries: 3, initialDelayMs: 10, name: 'test' });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('throws after max retries exceeded', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('always fails'));

      await expect(
        retryWithBackoff(fn, { maxRetries: 2, initialDelayMs: 10, name: 'test' }),
      ).rejects.toThrow('always fails');

      expect(fn).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('applies exponential backoff', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const startTime = Date.now();

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 2,
          initialDelayMs: 50,
          backoffMultiplier: 2,
          name: 'test',
        }),
      ).rejects.toThrow();

      const elapsed = Date.now() - startTime;
      // Expected: 50ms (fail) + 100ms (backoff) + 50ms (fail) + 200ms (backoff) = ~400ms
      // Allow ±100ms for timing variations
      expect(elapsed).toBeGreaterThan(250);
      expect(elapsed).toBeLessThan(500);
    });

    it('respects maxDelayMs cap', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));

      await expect(
        retryWithBackoff(fn, {
          maxRetries: 5,
          initialDelayMs: 100,
          maxDelayMs: 200,
          backoffMultiplier: 10,
          name: 'test',
        }),
      ).rejects.toThrow();

      // With 10x multiplier, delays would be: 100, 1000 (capped to 200), 10000 (capped to 200)
      // Total ~700ms (100 + 200 + 200 + 200)
      expect(fn).toHaveBeenCalledTimes(6);
    });

    it('times out individual attempts', async () => {
      const fn = vi.fn().mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve('slow'), 2000);
          }),
      );

      await expect(
        retryWithBackoff(fn, { maxRetries: 1, timeoutMs: 100, initialDelayMs: 10, name: 'test' }),
      ).rejects.toThrow('timeout');

      expect(fn).toHaveBeenCalledTimes(2); // 1 initial + 1 retry
    });
  });

  describe('CircuitBreaker', () => {
    it('allows calls when closed', () => {
      const breaker = createCircuitBreaker({ failureThreshold: 5 });

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('closed');
    });

    it('opens after failure threshold reached', () => {
      const breaker = createCircuitBreaker({ failureThreshold: 3, windowSizeMs: 10000 });

      for (let i = 0; i < 3; i++) {
        breaker.recordFailure();
      }

      expect(breaker.canExecute()).toBe(false);
      expect(breaker.getState().state).toBe('open');
    });

    it('resets on success', () => {
      const breaker = createCircuitBreaker({ failureThreshold: 2 });

      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.getState().state).toBe('open');

      breaker.recordSuccess();
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('closed');
    });

    it('transitions to half-open after reset timeout', async () => {
      const breaker = createCircuitBreaker({ failureThreshold: 1, resetTimeoutMs: 50 });

      breaker.recordFailure();
      expect(breaker.getState().state).toBe('open');
      expect(breaker.canExecute()).toBe(false);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState().state).toBe('half-open');
    });

    it('clears old failures outside window', () => {
      const breaker = createCircuitBreaker({ failureThreshold: 3, windowSizeMs: 50 });

      breaker.recordFailure();
      breaker.recordFailure();

      // Wait for window to expire
      setTimeout(() => {
        breaker.recordFailure();
        // Should only have 1 failure, not 3
        expect(breaker.getState().failures).toBe(1);
      }, 60);
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('succeeds and records success', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      const breaker = createCircuitBreaker();

      const result = await executeWithCircuitBreaker(fn, breaker, { maxRetries: 0, name: 'test' });

      expect(result).toBe('ok');
      expect(breaker.getState().state).toBe('closed');
    });

    it('fails and records failure', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('fail'));
      const breaker = createCircuitBreaker({ failureThreshold: 1 });

      await expect(executeWithCircuitBreaker(fn, breaker, { maxRetries: 0, name: 'test' })).rejects.toThrow();

      expect(breaker.getState().state).toBe('open');
    });

    it('rejects when breaker is open', async () => {
      const fn = vi.fn();
      const breaker = createCircuitBreaker({ failureThreshold: 1 });

      breaker.recordFailure();

      await expect(executeWithCircuitBreaker(fn, breaker, { maxRetries: 0, name: 'test' })).rejects.toThrow(
        'Circuit breaker is OPEN',
      );

      expect(fn).not.toHaveBeenCalled();
    });
  });
});
