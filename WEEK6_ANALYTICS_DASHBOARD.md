# Week 6-7: Analytics Dashboard (Parallel with Video Storage)

**Goal**: Real-time carousel engagement metrics. Pro+ feature. +$180/mo revenue (retention).

---

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS carousel_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  event_type VARCHAR(20) NOT NULL, -- view, share, save, like, click
  source VARCHAR(50), -- instagram, tiktok, direct, etc
  user_agent VARCHAR(500), -- for device detection
  referrer VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX (carousel_id),
  INDEX (user_id),
  INDEX (created_at),
  INDEX (event_type)
);

CREATE TABLE IF NOT EXISTS carousel_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  views_unique INT DEFAULT 0,
  shares INT DEFAULT 0,
  saves INT DEFAULT 0,
  likes INT DEFAULT 0,
  clicks INT DEFAULT 0,
  engagement_rate DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (carousel_id, date),
  INDEX (user_id, date)
);

-- Event tracking: store individual views for real-time dashboard
-- Aggregated daily into carousel_metrics_daily for reporting
```

---

## Analytics Event Tracker

**File**: `src/services/analytics-service.ts`

```typescript
import { carouselDB } from '../db/postgres.js';
import { log } from '../agent/logger.js';

interface AnalyticsEvent {
  carouselId: string;
  userId: string;
  eventType: 'view' | 'share' | 'save' | 'like' | 'click';
  source?: string;
  userAgent?: string;
  referrer?: string;
}

class AnalyticsService {
  /**
   * Track carousel event
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    try {
      const pool = (carouselDB as any).pool;

      // Insert event
      await pool.query(
        `INSERT INTO carousel_analytics (carousel_id, user_id, event_type, source, user_agent, referrer)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [event.carouselId, event.userId, event.eventType, event.source, event.userAgent, event.referrer],
      );

      // Invalidate cache for this carousel
      await this.invalidateCarouselCache(event.carouselId);
    } catch (err) {
      log.info('Error tracking event', { carouselId: event.carouselId, error: err });
      // Don't throw — analytics failure shouldn't break app
    }
  }

  /**
   * Get carousel metrics (cached)
   */
  async getCarouselMetrics(carouselId: string): Promise<{
    views: number;
    views_unique: number;
    shares: number;
    saves: number;
    likes: number;
    engagement_rate: number;
    trend: 'up' | 'down' | 'flat';
  }> {
    try {
      const pool = (carouselDB as any).pool;

      // Get today's metrics
      const today = new Date().toISOString().split('T')[0];
      const todayResult = await pool.query(
        `SELECT views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
         WHERE carousel_id = $1 AND date = $2`,
        [carouselId, today],
      );

      // Get yesterday's metrics for trend
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      const yesterdayResult = await pool.query(
        `SELECT views FROM carousel_metrics_daily WHERE carousel_id = $1 AND date = $2`,
        [carouselId, yesterday],
      );

      const todayMetrics = todayResult.rows[0] || {
        views: 0,
        views_unique: 0,
        shares: 0,
        saves: 0,
        likes: 0,
        engagement_rate: 0,
      };

      const yesterdayViews = yesterdayResult.rows[0]?.views || 0;
      const trend = todayMetrics.views > yesterdayViews ? 'up' : todayMetrics.views < yesterdayViews ? 'down' : 'flat';

      return {
        views: todayMetrics.views,
        views_unique: todayMetrics.views_unique,
        shares: todayMetrics.shares,
        saves: todayMetrics.saves,
        likes: todayMetrics.likes,
        engagement_rate: todayMetrics.engagement_rate,
        trend,
      };
    } catch (err) {
      log.info('Error getting carousel metrics', { carouselId, error: err });
      throw err;
    }
  }

  /**
   * Get carousel performance over time
   */
  async getCarouselHistory(carouselId: string, days: number = 30): Promise<any[]> {
    try {
      const pool = (carouselDB as any).pool;

      const result = await pool.query(
        `SELECT date, views, views_unique, shares, saves, likes, engagement_rate FROM carousel_metrics_daily
         WHERE carousel_id = $1 AND date >= NOW() - INTERVAL '${days} days'
         ORDER BY date ASC`,
        [carouselId],
      );

      return result.rows;
    } catch (err) {
      log.info('Error fetching carousel history', { carouselId, error: err });
      throw err;
    }
  }

  /**
   * Aggregate raw events → daily metrics (run nightly)
   */
  async aggregateDailyMetrics(): Promise<void> {
    try {
      const pool = (carouselDB as any).pool;

      // Get yesterday's date
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

      // Aggregate carousel_analytics → carousel_metrics_daily
      await pool.query(
        `INSERT INTO carousel_metrics_daily (carousel_id, user_id, date, views, views_unique, shares, saves, likes, clicks)
         SELECT
           carousel_id,
           user_id,
           DATE(created_at)::date,
           COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
           COUNT(DISTINCT CASE WHEN event_type = 'view' THEN user_id END) as views_unique,
           COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
           COUNT(CASE WHEN event_type = 'save' THEN 1 END) as saves,
           COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes,
           COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
         FROM carousel_analytics
         WHERE DATE(created_at)::date = $1
         GROUP BY carousel_id, user_id, DATE(created_at)::date
         ON CONFLICT (carousel_id, date) DO UPDATE SET
           views = EXCLUDED.views,
           views_unique = EXCLUDED.views_unique,
           shares = EXCLUDED.shares,
           saves = EXCLUDED.saves,
           likes = EXCLUDED.likes,
           clicks = EXCLUDED.clicks`,
        [yesterday],
      );

      // Calculate engagement rate
      await pool.query(
        `UPDATE carousel_metrics_daily
         SET engagement_rate = ROUND((shares + saves + likes)::decimal / NULLIF(views, 0) * 100, 2)
         WHERE date = $1`,
        [yesterday],
      );

      log.info('Daily metrics aggregated', { date: yesterday });
    } catch (err) {
      log.info('Error aggregating metrics', { error: err });
    }
  }

  /**
   * Invalidate carousel cache (when new event arrives)
   */
  private async invalidateCarouselCache(carouselId: string): Promise<void> {
    // TODO: Implement Redis cache invalidation
    // For now, just log
    log.info('Cache invalidated', { carouselId });
  }
}

export const analyticsService = new AnalyticsService();
```

---

## Analytics API Routes

**File**: `src/api/analytics-routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import { analyticsService } from '../services/analytics-service.js';
import { log } from '../agent/logger.js';

const router = Router();

/**
 * 1. Track carousel event
 * POST /api/carousels/:carousel_id/events
 * Event: { eventType: 'view'|'share'|'save'|'like'|'click', source?, userAgent?, referrer? }
 */
router.post('/api/carousels/:carousel_id/events', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const userId = (req as any).userId;
    const { eventType, source, userAgent, referrer } = req.body;

    if (!carouselId || !eventType) {
      return res.status(400).json({ error: 'Missing carousel_id or eventType' });
    }

    await analyticsService.trackEvent({
      carouselId,
      userId: userId || 'anonymous',
      eventType,
      source,
      userAgent,
      referrer,
    });

    return res.json({ success: true });
  } catch (err) {
    log.info('Error tracking event', { error: err });
    return res.status(500).json({ error: 'Failed to track event' });
  }
});

/**
 * 2. Get carousel metrics (today + trend)
 * GET /api/carousels/:carousel_id/analytics
 */
router.get('/api/carousels/:carousel_id/analytics', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;

    const metrics = await analyticsService.getCarouselMetrics(carouselId);

    return res.json({
      carousel_id: carouselId,
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.info('Error fetching analytics', { error: err });
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

/**
 * 3. Get carousel performance history (30 days default)
 * GET /api/carousels/:carousel_id/analytics/history?days=30
 */
router.get('/api/carousels/:carousel_id/analytics/history', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const days = parseInt(req.query.days as string) || 30;

    const history = await analyticsService.getCarouselHistory(carouselId, days);

    return res.json({
      carousel_id: carouselId,
      days,
      data: history,
      count: history.length,
    });
  } catch (err) {
    log.info('Error fetching analytics history', { error: err });
    return res.status(500).json({ error: 'Failed to fetch analytics history' });
  }
});

/**
 * 4. Get user's top carousels by engagement
 * GET /api/users/:user_id/top-carousels
 */
router.get('/api/users/:user_id/top-carousels', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const pool = (require('../db/postgres.js').carouselDB as any).pool;

    const result = await pool.query(
      `SELECT
         c.id, c.title, c.slides_count,
         COALESCE(m.views, 0) as views,
         COALESCE(m.engagement_rate, 0) as engagement_rate
       FROM carousels c
       LEFT JOIN carousel_metrics_daily m ON c.id = m.carousel_id AND m.date = CURRENT_DATE
       WHERE c.user_id = $1 AND c.status = 'published'
       ORDER BY COALESCE(m.views, 0) DESC
       LIMIT 10`,
      [userId],
    );

    return res.json({
      user_id: userId,
      top_carousels: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    log.info('Error fetching top carousels', { error: err });
    return res.status(500).json({ error: 'Failed to fetch top carousels' });
  }
});

export default router;
```

---

## Scheduled Aggregation Job

**File**: `src/workers/analytics-aggregator.ts`

Runs nightly (11 PM UTC) via node-cron:

```typescript
import cron from 'node-cron';
import { analyticsService } from '../services/analytics-service.js';
import { log } from '../agent/logger.js';

// Run nightly aggregation (23:00 UTC)
cron.schedule('0 23 * * *', async () => {
  try {
    log.info('Starting nightly analytics aggregation');
    await analyticsService.aggregateDailyMetrics();
    log.info('Nightly analytics aggregation complete');
  } catch (err) {
    log.info('Error in nightly aggregation', { error: err });
  }
});

export default cron;
```

---

## Frontend Integration (Client-Side Tracking)

JavaScript snippet to embed in carousel embeds:

```javascript
// Track carousel events
const trackEvent = (carouselId, eventType) => {
  fetch(`/api/carousels/${carouselId}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventType,
      source: 'instagram', // or tiktok, web, etc
      userAgent: navigator.userAgent,
      referrer: document.referrer,
    }),
  });
};

// Track view on load
window.addEventListener('load', () => {
  trackEvent(carouselId, 'view');
});

// Track share/save/like (click handlers)
document.querySelectorAll('[data-action]').forEach((el) => {
  el.addEventListener('click', (e) => {
    const action = e.target.getAttribute('data-action');
    if (['share', 'save', 'like'].includes(action)) {
      trackEvent(carouselId, action);
    }
  });
});
```

---

## Implementation Checklist

- [ ] **Database**: Run schema migrations (carousel_analytics, carousel_metrics_daily)
- [ ] **Services**: Implement AnalyticsService class
- [ ] **API Routes**: Add 4 analytics endpoints
- [ ] **Scheduled Worker**: Set up cron job for nightly aggregation
- [ ] **Frontend Integration**: Add tracking snippet to carousel embeds
- [ ] **Pro+ Gating**: Verify analytics only accessible to Pro+
- [ ] **Testing**: Track test events, verify aggregation, check dashboard
- [ ] **Deployment**: Deploy to Railway with cron worker enabled

---

## Success Criteria

| Metric                      | Target                                          |
| --------------------------- | ----------------------------------------------- |
| Event tracking latency      | <100ms                                          |
| Unique visitor tracking     | >95% accuracy                                   |
| Engagement rate calculation | <1% variance                                    |
| Dashboard load time         | <500ms                                          |
| Data retention              | 90 days (free), 1 year (pro), 7 years (premium) |

---

## Pricing & Tier Gating

- **Free**: No analytics (basic view count only)
- **Pro**: Real-time analytics, 30-day history
- **Premium**: Real-time analytics, 365-day history, API access, CSV export

---

## Week 6-7 Timeline

**Week 6 (Days 1-3)**: Video Storage implementation + testing
**Week 6 (Days 4-7)**: Analytics setup + frontend integration
**Week 7**: Stabilization, bug fixes, minor optimizations

---

## Next: Week 8-10 Collaboration

After analytics dashboard launches, begin team collaboration feature (shared carousels, approval workflows).
