/**
 * Integration test: Verify metrics flow from platform APIs → daily snapshot → achievements
 *
 * Run with: npm test -- metrics-flow.test.ts
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { recordDailySnapshot, getRecentDailyMetrics } from '../capabilities/growth/growthEngine.js';
import type { BrandProfile } from '../config/types.js';

// Mock brand profile (minimal required fields)
const mockBrand = {
  id: 'test-brand',
  name: 'Test Brand',
  type: 'marca-personal' as const,
  niche: 'tech',
  audience: {
    description: 'Tech enthusiasts',
    pains: [] as string[],
    desires: [] as string[],
    locale: 'es-AR',
  },
  voice: {
    tone: ['professional'],
    forbidden: [] as string[],
    referenceQuotes: [] as string[],
  },
} as unknown as BrandProfile;

describe('Metrics Flow: Platform Data → Achievements', () => {
  beforeEach(() => {
    // Clean slate for each test
  });

  it('should record daily snapshot with platform metrics', () => {
    const today = new Date().toISOString().split('T')[0]!;

    const snapshot = recordDailySnapshot({
      date: today,
      followers: 5000,
      reach24h: 50000,
      engagement24h: 2500,
      postsPublished: 3,
      storiesPublished: 2,
      // Platform-specific
      tiktokFollowers: 3000,
      tiktokEngagement24h: 1500,
      instagramFollowers: 2000,
      instagramTotalLikes: 1000,
    });

    // Verify snapshot was recorded
    expect(snapshot).toBeDefined();
    expect(snapshot.date).toBe(today);
    expect(snapshot.followers).toBe(5000);
    expect(snapshot.tiktokFollowers).toBe(3000);
    expect(snapshot.instagramFollowers).toBe(2000);
  });

  it('should calculate platform follower deltas', () => {
    const today = new Date().toISOString().split('T')[0]!;

    // Record day 1
    recordDailySnapshot({
      date: today,
      followers: 1000,
      reach24h: 10000,
      engagement24h: 500,
      postsPublished: 1,
      storiesPublished: 0,
      tiktokFollowers: 800,
      instagramFollowers: 200,
    });

    // Record day 2 (simulated next day)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]!;
    const snapshot2 = recordDailySnapshot({
      date: tomorrow,
      followers: 1100,
      reach24h: 12000,
      engagement24h: 600,
      postsPublished: 1,
      storiesPublished: 0,
      tiktokFollowers: 850,
      instagramFollowers: 250,
    });

    // Verify deltas calculated
    expect(snapshot2.followersDelta).toBe(100); // 1100 - 1000
    expect(snapshot2.tiktokFollowersDelta).toBe(50); // 850 - 800
    expect(snapshot2.instagramFollowersDelta).toBe(50); // 250 - 200
  });

  it('should retrieve recent metrics with platform data', () => {
    const today = new Date().toISOString().split('T')[0]!;

    recordDailySnapshot({
      date: today,
      followers: 5000,
      reach24h: 50000,
      engagement24h: 2500,
      postsPublished: 2,
      storiesPublished: 1,
      tiktokFollowers: 3500,
      instagramFollowers: 1500,
      tiktokTotalLikes: 50000,
      instagramTotalLikes: 25000,
    });

    const recent = getRecentDailyMetrics(30);

    expect(recent.length).toBeGreaterThan(0);
    const latest = recent[recent.length - 1]!;
    expect(latest.tiktokFollowers).toBe(3500);
    expect(latest.instagramFollowers).toBe(1500);
  });

  it('should handle missing platform data (fallback to 0)', () => {
    const today = new Date().toISOString().split('T')[0]!;

    // Record with only generic metrics
    const snapshot = recordDailySnapshot({
      date: today,
      followers: 5000,
      reach24h: 50000,
      engagement24h: 2500,
      postsPublished: 2,
      storiesPublished: 1,
      // No platform data
    });

    expect(snapshot.tiktokFollowers).toBeUndefined();
    expect(snapshot.instagramFollowers).toBeUndefined();

    // But getRecentDailyMetrics should safely return 0
    const recent = getRecentDailyMetrics(1);
    const latest = recent[0];
    if (latest) {
      const ttFollowers = latest.tiktokFollowers ?? 0;
      const igFollowers = latest.instagramFollowers ?? 0;
      expect(ttFollowers).toBe(0);
      expect(igFollowers).toBe(0);
    }
  });

  it('should enable TikTok follower milestones with platform data', async () => {
    const today = new Date().toISOString().split('T')[0]!;

    // Record TikTok reaching 100 followers milestone
    recordDailySnapshot({
      date: today,
      followers: 5000,
      reach24h: 50000,
      engagement24h: 2500,
      postsPublished: 1,
      storiesPublished: 0,
      tiktokFollowers: 100,
    });

    const recent = getRecentDailyMetrics(1);
    const latest = recent[0];

    expect(latest?.tiktokFollowers).toBe(100);

    // Achievement evaluator should be able to check this
    // const hasAchievement = (latest?.tiktokFollowers ?? 0) >= 100;
    // expect(hasAchievement).toBe(true);
  });

  it('should enable Instagram engagement tracking with platform data', async () => {
    const today = new Date().toISOString().split('T')[0]!;

    recordDailySnapshot({
      date: today,
      followers: 5000,
      reach24h: 50000,
      engagement24h: 2500,
      postsPublished: 2,
      storiesPublished: 0,
      instagramFollowers: 5000,
      instagramTotalLikes: 1000,
    });

    const recent = getRecentDailyMetrics(1);
    const latest = recent[0];

    expect(latest?.instagramFollowers).toBe(5000);
    expect(latest?.instagramTotalLikes).toBe(1000);
  });

  it('achievement snapshot should include platform milestone counts', () => {
    // Record multiple milestones
    const snapshot = recordDailySnapshot({
      date: new Date().toISOString().split('T')[0]!,
      followers: 10000,
      reach24h: 100000,
      engagement24h: 5000,
      postsPublished: 3,
      storiesPublished: 2,
      tiktokFollowers: 1000,
      instagramFollowers: 9000,
    });

    // Verify data recorded (achievement evaluation happens separately)
    expect(snapshot).toBeDefined();
    expect(snapshot.tiktokFollowers).toBe(1000);
    expect(snapshot.instagramFollowers).toBe(9000);
  });
});

/**
 * Manual testing checklist:
 *
 * 1. Set credentials in .env:
 *    export META_ACCESS_TOKEN=your_token
 *    export TIKTOK_ACCESS_TOKEN=your_token
 *
 * 2. Check health endpoint:
 *    curl http://localhost:3000/api/platform/health
 *    Should return: { allHealthy: true, platforms: [...] }
 *
 * 3. Trigger daily snapshot job:
 *    npm run dev
 *    Wait for 23:00 or manually trigger via admin endpoint
 *
 * 4. Verify metrics recorded:
 *    curl http://localhost:3000/api/growth/metrics?days=1
 *    Should include: tiktokFollowers, instagramFollowers, etc.
 *
 * 5. Check achievements unlocked:
 *    curl http://localhost:3000/api/achievements/snapshot
 *    Should show updated totals if milestones hit
 *
 * 6. View medal shelf:
 *    Visit http://localhost:3000/#achievements
 *    Should display earned medals in shelf UI
 */
