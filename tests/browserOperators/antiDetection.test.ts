/**
 * Tests de anti-detection para browser operators.
 */
import { describe, it, expect } from 'vitest';
import { applyStealthProfile, getBrowserFingerprint } from '../../src/browserOperators/core/stealthProfile.js';
import {
  humanDelay,
  humanScroll,
  humanType,
  humanMouseMove,
  humanReadingPause,
} from '../../src/browserOperators/core/humanBehavior.js';
import { inferTierFromFollowers, getRateLimiter } from '../../src/browserOperators/core/rateLimitSmart.js';

describe('StealthProfile', () => {
  it('genera perfiles con userAgent válido', () => {
    const profile = applyStealthProfile();
    expect(profile.userAgent).toContain('Mozilla/5.0');
    expect(profile.viewport.width).toBeGreaterThan(0);
    expect(profile.viewport.height).toBeGreaterThan(0);
  });

  it('genera fingerprints determinísticos por perfil', () => {
    const p1 = applyStealthProfile();
    const p2 = applyStealthProfile();
    const fp1 = getBrowserFingerprint(p1);
    const fp2 = getBrowserFingerprint(p2);
    // Diferentes perfiles deben tener diferentes fingerprints
    expect(fp1).not.toBe(fp2);
  });

  it('incluye geolocation válida', () => {
    const profile = applyStealthProfile();
    expect(profile.geolocation.latitude).toBeGreaterThan(-90);
    expect(profile.geolocation.latitude).toBeLessThan(90);
    expect(profile.geolocation.longitude).toBeGreaterThan(-180);
    expect(profile.geolocation.longitude).toBeLessThan(180);
  });
});

describe('RateLimitSmart', () => {
  it('infiere tier correcto por followers', () => {
    expect(inferTierFromFollowers(100)).toBe('new');
    expect(inferTierFromFollowers(3000)).toBe('small');
    expect(inferTierFromFollowers(30000)).toBe('medium');
    expect(inferTierFromFollowers(300000)).toBe('large');
    expect(inferTierFromFollowers(1000000)).toBe('enterprise');
  });

  it('limita posts por día según tier', () => {
    const limiter = getRateLimiter('new');
    expect(limiter.config.maxPostsPerDay).toBe(1);
    expect(limiter.config.maxInteractionsPerHour).toBe(10);
  });

  it('limiter permite primera acción', () => {
    const limiter = getRateLimiter('medium');
    expect(limiter.canProceed('post_1')).toBe(true);
  });

  it('rate limiter respeta límites por hora', () => {
    const limiter = getRateLimiter('new');
    // Simular 11 interacciones (límite es 10)
    for (let i = 0; i < 11; i++) {
      if (limiter.canProceed('interaction')) {
        limiter.recordAction('interaction');
      }
    }
    expect(limiter.canProceed('interaction')).toBe(false);
  });
});

describe('HumanBehavior', () => {
  it('humanDelay respeta rangos', async () => {
    const start = Date.now();
    await humanDelay(50, 100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(200); // margen
  });

  it('humanReadingPause respeta rangos', async () => {
    const start = Date.now();
    await humanReadingPause(50, 100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(50);
    expect(elapsed).toBeLessThan(200);
  });
});
