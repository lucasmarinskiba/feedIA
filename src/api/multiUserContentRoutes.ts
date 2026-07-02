/**
 * Phase 24: Multi-User Content Pipeline
 *
 * REST endpoints for SaaS: per-user brand kit, generation, coherence, resources, dashboard
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { createUserBrandProfile, getUserBrandProfile, updateUserBrandLearnings, getPersonalizedGeneratorSettings } from '../capabilities/branding/multiUserBrandingEngine.js';
import { generateBrandCoherenceReport } from '../capabilities/branding/brandingCoherenceEnforcer.js';
import { generateSmartCarousel } from '../capabilities/content/smartCarouselGenerator.js';
import { generateSmartVideo } from '../capabilities/content/smartVideoGenerator.js';
import { recommendResourcesFor, getFreeResources } from '../capabilities/resources/resourceAggregator.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', phases: [21, 22, 23, 24], message: 'Multi-user SaaS online' });
});

router.post('/:userId/brand', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const profile = createUserBrandProfile(userId, req.body);
    res.json({ status: 'success', data: profile });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/:userId/brand', (req: Request, res: Response) => {
  const profile = getUserBrandProfile(req.params.userId);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'success', data: profile });
});

router.post('/:userId/generate/carousel', async (req: Request, res: Response) => {
  try {
    const carousel = await generateSmartCarousel(req.body);
    res.json({ status: 'success', data: carousel });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/:userId/generate/video', async (req: Request, res: Response) => {
  try {
    const video = await generateSmartVideo(req.body);
    res.json({ status: 'success', data: video });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/:userId/validate/coherence', (req: Request, res: Response) => {
  const report = generateBrandCoherenceReport(req.params.userId, req.body.posts || []);
  res.json({ status: 'success', data: report });
});

router.get('/:userId/resources/recommend', (req: Request, res: Response) => {
  const contentType = (req.query.contentType as string) || 'carousel';
  const recommendations = recommendResourcesFor(contentType);
  res.json({ status: 'success', data: { recommended: recommendations, free: getFreeResources().slice(0, 5) } });
});

router.get('/:userId/dashboard', (req: Request, res: Response) => {
  const profile = getUserBrandProfile(req.params.userId);
  if (!profile) return res.status(404).json({ error: 'Not found' });
  res.json({
    status: 'success',
    data: {
      accountName: profile.accountName,
      colors: profile.primaryColors,
      fonts: [profile.headlineFont, profile.bodyFont],
      engagement: profile.averageEngagement,
      retention: profile.averageRetention,
    },
  });
});

router.post('/:userId/learnings/update', (req: Request, res: Response) => {
  const updated = updateUserBrandLearnings(req.params.userId, req.body);
  if (!updated) return res.status(404).json({ error: 'Not found' });
  res.json({ status: 'success', data: updated });
});

router.post('/:userId/generate/batch', async (req: Request, res: Response) => {
  try {
    const { carousels = [], videos = [] } = req.body;
    const carouselResults = await Promise.all(carousels.map((b: any) => generateSmartCarousel(b)));
    const videoResults = await Promise.all(videos.map((b: any) => generateSmartVideo(b)));
    res.json({ status: 'success', data: { carousels: carouselResults, videos: videoResults } });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

log.info('[Phase 24] Multi-User Content Pipeline ✅');

export default router;
