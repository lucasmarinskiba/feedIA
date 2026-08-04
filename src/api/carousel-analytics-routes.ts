import { Router, Request, Response } from 'express';
import { carouselAnalyticsService } from '../services/carousel-analytics-service.js';
import { carouselStorageService } from '../services/carousel-storage-service.js';

const router = Router();

// GET /api/analytics/carousel/:carouselId - Get comprehensive carousel analytics
router.get('/carousel/:carouselId', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carouselId as string;
    if (!carouselId) {
      return res.status(400).json({ error: 'Carousel ID required' });
    }

    const analytics = await carouselAnalyticsService.getCarouselAnalytics(carouselId);

    if (!analytics) {
      return res.status(404).json({ error: 'Carousel not found' });
    }

    return res.json({
      carousel_id: carouselId,
      analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Analytics failed: ${error}` });
  }
});

// GET /api/analytics/user/:userId - Get user-level analytics
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const analytics = await carouselAnalyticsService.getUserAnalytics(userId);

    return res.json({
      user_id: userId,
      analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `User analytics failed: ${error}` });
  }
});

// GET /api/analytics/carousel/:carouselId/timeseries - Get trends over time
router.get('/carousel/:carouselId/timeseries', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carouselId as string;
    const days = parseInt(req.query.days as string) || 30;

    if (!carouselId) {
      return res.status(400).json({ error: 'Carousel ID required' });
    }

    const timeseries = await carouselAnalyticsService.getTimeseriesMetrics(carouselId, days);

    return res.json({
      carousel_id: carouselId,
      days,
      data: timeseries,
      count: timeseries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Timeseries failed: ${error}` });
  }
});

// GET /api/analytics/carousel/:carouselId/breakdown - Event breakdown
router.get('/carousel/:carouselId/breakdown', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carouselId as string;
    const days = parseInt(req.query.days as string) || 7;

    if (!carouselId) {
      return res.status(400).json({ error: 'Carousel ID required' });
    }

    const breakdown = await carouselAnalyticsService.getEngagementBreakdown(carouselId, days);

    return res.json({
      carousel_id: carouselId,
      days,
      breakdown,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Breakdown failed: ${error}` });
  }
});

// POST /api/analytics/compare - Compare multiple carousels
router.post('/compare', async (req: Request, res: Response) => {
  try {
    const carouselIds = req.body?.carousel_ids as string[];

    if (!Array.isArray(carouselIds) || carouselIds.length === 0) {
      return res.status(400).json({ error: 'Expected array of carousel IDs' });
    }

    const comparison = await carouselAnalyticsService.compareCarousels(carouselIds);

    return res.json({
      total: carouselIds.length,
      compared: comparison.length,
      data: comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Comparison failed: ${error}` });
  }
});

// GET /api/analytics/user/:userId/top - Top carousels for user
router.get('/user/:userId/top', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const limit = parseInt(req.query.limit as string) || 10;

    if (!userId) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const userAnalytics = await carouselAnalyticsService.getUserAnalytics(userId);

    const carouselsStmt = 'SELECT id FROM carousels WHERE user_id = ? ORDER BY id DESC LIMIT ?';
    // Fetch top carousels (would need to extend carouselStorageService or query DB directly)
    // For now, return user analytics as top performer data
    return res.json({
      user_id: userId,
      top_carousel: userAnalytics.topCarousel,
      platform_distribution: userAnalytics.platformDistribution,
      total_carousels: userAnalytics.totalCarousels,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Top carousels failed: ${error}` });
  }
});

export default router;
