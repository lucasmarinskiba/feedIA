/**
 * Tests del tracker de uso de video IA.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { recordVideoUsage, getVideoUsage, getTotalVideoCostUsd } from '../../../src/capabilities/videoEngine/usageTracker.js';

describe('VideoEngine usage tracker', () => {
  beforeEach(() => {
    // Los tests comparten el archivo JSON real; usamos marcas únicas para aislar.
  });

  it('registra un uso y lo recupera', () => {
    const topic = `test-${Date.now()}`;
    const record = recordVideoUsage({
      provider: 'runway',
      format: 'reel',
      durationSec: 10,
      costEstimateUsd: 0.8,
      topic,
      brandName: 'TestBrand',
      style: 'broll',
      success: true,
    });

    expect(record.id).toBeDefined();
    expect(record.createdAt).toBeDefined();
    expect(record.costEstimateUsd).toBe(0.8);

    const found = getVideoUsage({ brandName: 'TestBrand' }).filter((r) => r.topic === topic);
    expect(found.length).toBeGreaterThanOrEqual(1);
  });

  it('suma costos correctamente', () => {
    const brand = `brand-${Date.now()}`;
    recordVideoUsage({ provider: 'heygen', format: 'tiktok', durationSec: 30, costEstimateUsd: 1.25, topic: 't1', brandName: brand, success: true });
    recordVideoUsage({ provider: 'mock', format: 'reel', durationSec: 15, costEstimateUsd: 0, topic: 't2', brandName: brand, success: true });

    const total = getTotalVideoCostUsd({ brandName: brand });
    expect(total).toBeGreaterThanOrEqual(1.25);
  });
});
