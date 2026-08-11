/**
 * E2E Test — Full Webhook Flow in Staging
 *
 * Tests: Webhook received → Validated → Stored → Aggregated → Dashboard reflects
 * Scope: Integration from HTTP handler to dashboard metrics
 * Runs against: Staging environment (real DB, real middleware)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';

/**
 * Note: These tests assume staging API running at STAGING_API_URL
 * Set via env or run against local server
 *
 * Usage:
 * STAGING_API_URL=http://localhost:3000 npm test -- e2e-webhook-flow.test.ts
 */

const STAGING_API_URL = process.env.STAGING_API_URL ?? 'http://localhost:3000';
const TEST_ACCOUNT_ID = 'e2e-test-account-' + Date.now();

describe('E2E: Webhook → Dashboard Flow', () => {
  beforeAll(async () => {
    // Wait for API to be ready
    let retries = 5;
    while (retries > 0) {
      try {
        const res = await fetch(`${STAGING_API_URL}/health`);
        if (res.ok) break;
      } catch {
        retries--;
        if (retries === 0) throw new Error('Staging API not reachable');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  });

  describe('Conversion Flow', () => {
    it('records conversion via webhook', async () => {
      const payload = {
        postId: 'post-e2e-1',
        value: 99.99,
        timestamp: new Date().toISOString(),
        source: 'instagram',
        fanId: 'fan-e2e-1',
      };

      const res = await fetch(`${STAGING_API_URL}/api/realdata/webhook/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': TEST_ACCOUNT_ID,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as Record<string, unknown>;
      expect(result.success).toBe(true);
      expect(result.idempotencyKey).toBeTruthy();
    });

    it('detects duplicate conversions', async () => {
      const payload = {
        postId: 'post-e2e-2',
        value: 50,
        timestamp: '2026-01-01T10:00:00Z',
        source: 'instagram',
      };

      // First webhook
      const res1 = await fetch(`${STAGING_API_URL}/api/realdata/webhook/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': TEST_ACCOUNT_ID,
        },
        body: JSON.stringify(payload),
      });

      expect(res1.status).toBe(200);
      const result1 = (await res1.json()) as Record<string, unknown>;
      expect(result1.duplicate).toBeUndefined();

      // Duplicate webhook (same natural key)
      const res2 = await fetch(`${STAGING_API_URL}/api/realdata/webhook/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': TEST_ACCOUNT_ID,
        },
        body: JSON.stringify(payload),
      });

      expect(res2.status).toBe(200);
      const result2 = (await res2.json()) as Record<string, unknown>;
      expect(result2.duplicate).toBe(true);
    });

    it('rejects invalid conversion', async () => {
      const payload = {
        postId: '', // Invalid: empty
        value: -50, // Invalid: negative
        timestamp: 'not-a-date',
        source: 'unknown',
      };

      const res = await fetch(`${STAGING_API_URL}/api/realdata/webhook/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': TEST_ACCOUNT_ID,
        },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(400);
      const result = (await res.json()) as Record<string, unknown>;
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Dashboard Aggregation', () => {
    it('reflects recorded conversion in dashboard', async () => {
      // Record conversion
      const convPayload = {
        postId: 'post-e2e-dash-1',
        value: 150,
        timestamp: new Date().toISOString(),
        source: 'instagram',
      };

      const convRes = await fetch(`${STAGING_API_URL}/api/realdata/webhook/conversion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Account-ID': TEST_ACCOUNT_ID,
        },
        body: JSON.stringify(convPayload),
      });

      expect(convRes.status).toBe(200);

      // Small delay for DB write
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Query dashboard
      const dashRes = await fetch(`${STAGING_API_URL}/api/realdata/dashboard/${TEST_ACCOUNT_ID}`);

      expect(dashRes.status).toBe(200);
      const dashboard = (await dashRes.json()) as Record<string, unknown>;
      expect(dashboard.timestamp).toBeTruthy();
      expect(dashboard.overview).toBeTruthy();

      // TODO: Assert conversions array includes recorded conversion
      // (once dashboard endpoint implemented)
    });
  });

  describe('Anomaly Detection', () => {
    it('detects viral drop anomaly', async () => {
      const payload = {
        viralScoreBaseline: 100,
        viralScoreCurrent: 30, // 70% drop
        churnBaselinePercent: 2,
        churnCurrentPercent: 2,
        lastLeadSignalTimestamp: new Date().toISOString(),
        roiBaseline: 300,
        roiCurrent: 300,
      };

      const res = await fetch(`${STAGING_API_URL}/api/anomaly/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as Record<string, unknown>;
      expect(result.anomalies).toBeTruthy();
      expect((result.anomalies as unknown[])?.length).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('liveness check passes', async () => {
      const res = await fetch(`${STAGING_API_URL}/health`);
      expect(res.status).toBe(200);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.status).toBe('alive');
    });

    it('readiness check passes', async () => {
      const res = await fetch(`${STAGING_API_URL}/health/ready`);
      // Should be 200 or 503 depending on dependencies
      expect([200, 503]).toContain(res.status);
    });

    it('detailed health has components', async () => {
      const res = await fetch(`${STAGING_API_URL}/health/detailed`);
      expect([200, 503]).toContain(res.status);
      const data = (await res.json()) as Record<string, unknown>;
      expect(data.components).toBeTruthy();
    });
  });

  describe('Metrics', () => {
    it('prometheus metrics endpoint available', async () => {
      const res = await fetch(`${STAGING_API_URL}/metrics`);
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/plain');

      const text = await res.text();
      expect(text.length).toBeGreaterThan(0);
      expect(text).toContain('webhooks_received_total');
    });
  });
});
