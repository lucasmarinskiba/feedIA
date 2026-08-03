import { Router, Request, Response } from 'express';
import { metricsAggregationService } from '../services/metrics-aggregation-service.js';
import { log } from '../agent/logger.js';

const router = Router();

router.post('/api/carousels/:carousel_id/events', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const userId = (req as unknown as Record<string, any>).userId as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const { eventType, source, userAgent, referrer } = req.body;
    if (!carouselId || !eventType) {
      return res.status(400).json({ error: 'Missing params' });
    }
    await metricsAggregationService.trackEvent({
      carouselId,
      userId: userId || 'anonymous',
      eventType,
      source,
      userAgent,
      referrer,
    });
    res.json({ success: true });
  } catch (err) {
    log.info('Error tracking event', { error: err });
    res.status(500).json({ error: 'Failed to track event' });
  }
});

router.get('/api/carousels/:carousel_id/metrics', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const metrics = await metricsAggregationService.getCarouselMetrics(carouselId);
    res.json({ carousel_id: carouselId, metrics, timestamp: new Date().toISOString() });
  } catch (err) {
    log.info('Error fetching metrics', { error: err });
    res.status(500).json({ error: 'Failed to fetch metrics' });
  }
});

router.get('/api/carousels/:carousel_id/metrics/history', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const days = parseInt(req.query.days as string) || 30;
    const history = await metricsAggregationService.getCarouselHistory(carouselId, days);
    res.json({ carousel_id: carouselId, days, data: history, count: history.length });
  } catch (err) {
    log.info('Error fetching history', { error: err });
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/api/users/:user_id/metrics/summary', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const summary = await metricsAggregationService.getUserEngagementSummary(userId);
    res.json({ user_id: userId, summary });
  } catch (err) {
    log.info('Error fetching summary', { error: err });
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

router.get('/api/users/:user_id/carousels/top', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;
    const topCarousels = await metricsAggregationService.getUserTopCarousels(userId);
    res.json({ user_id: userId, top_carousels: topCarousels, count: topCarousels.length });
  } catch (err) {
    log.info('Error fetching top carousels', { error: err });
    res.status(500).json({ error: 'Failed to fetch top carousels' });
  }
});

router.get('/api/carousels/:carousel_id/metrics/breakdown', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const days = parseInt(req.query.days as string) || 7;
    const breakdown = await metricsAggregationService.getCarouselEventBreakdown(carouselId, days);
    res.json({ carousel_id: carouselId, days, events: breakdown });
  } catch (err) {
    log.info('Error fetching breakdown', { error: err });
    res.status(500).json({ error: 'Failed to fetch breakdown' });
  }
});

export default router;
