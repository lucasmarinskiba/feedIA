/**
 * Phase 24-25: Multi-User Content Pipeline (Enhanced)
 *
 * REST endpoints for SaaS: brand philosophy, typography, generation, coherence
 * Philosophy-first: Define brand → derive visual → generate content
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { createUserBrandProfile, getUserBrandProfile, updateUserBrandLearnings, getPersonalizedGeneratorSettings, getAvailableFonts, getFontsByCategory, getFontPairings } from '../capabilities/branding/multiUserBrandingEngine.js';
import { generateBrandCoherenceReport } from '../capabilities/branding/brandingCoherenceEnforcer.js';
import { createBrandPhilosophy, getBrandPhilosophy, updateBrandPhilosophy, deriveVisualFromPhilosophy, validateVisualAgainstPhilosophy, generatePhilosophyBrief } from '../capabilities/branding/brandPhilosophyEngine.js';
import { generateSmartCarousel } from '../capabilities/content/smartCarouselGenerator.js';
import { generateSmartVideo } from '../capabilities/content/smartVideoGenerator.js';
import { recommendResourcesFor, getFreeResources } from '../capabilities/resources/resourceAggregator.js';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', phases: [21, 22, 23, 24, 25], message: 'Multi-user SaaS online (Phase 25: Philosophy-First Branding)' });
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

// ── PHASE 25: BRAND PHILOSOPHY ENGINE ──────────────────────────────────────

/**
 * POST /api/multi-user/:userId/philosophy
 * Create brand philosophy (mission, values, personality, tone)
 */
router.post('/:userId/philosophy', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    log.info(`[Phase 25] Creating philosophy for user: ${userId}`);

    const philosophy = createBrandPhilosophy(userId, req.body);

    res.json({
      status: 'success',
      data: philosophy,
      message: 'Brand philosophy created (foundation for visual identity)',
    });
  } catch (error) {
    log.error(`[Phase 25] Philosophy creation failed: ${error}`);
    res.status(500).json({ error: 'Philosophy creation failed', details: String(error) });
  }
});

/**
 * GET /api/multi-user/:userId/philosophy
 * Retrieve user's brand philosophy
 */
router.get('/:userId/philosophy', (req: Request, res: Response) => {
  const { userId } = req.params;
  const philosophy = getBrandPhilosophy(userId);

  if (!philosophy) {
    return res.status(404).json({ error: 'Brand philosophy not found. Create one first.' });
  }

  res.json({ status: 'success', data: philosophy });
});

/**
 * PUT /api/multi-user/:userId/philosophy
 * Update brand philosophy
 */
router.put('/:userId/philosophy', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const updated = updateBrandPhilosophy(userId, req.body);

    if (!updated) {
      return res.status(404).json({ error: 'Brand philosophy not found' });
    }

    res.json({ status: 'success', data: updated, message: 'Philosophy updated' });
  } catch (error) {
    res.status(500).json({ error: 'Update failed', details: String(error) });
  }
});

// ── TYPOGRAPHY SYSTEM ──────────────────────────────────────────────────────

/**
 * GET /api/multi-user/:userId/fonts/available
 * List all 20 premium fonts available
 */
router.get('/:userId/fonts/available', (req: Request, res: Response) => {
  const fonts = getAvailableFonts();
  res.json({
    status: 'success',
    data: { count: fonts.length, fonts },
    message: '20 premium fonts available',
  });
});

/**
 * GET /api/multi-user/:userId/fonts/category/:category
 * Get fonts by category (headline, body, display, etc)
 */
router.get('/:userId/fonts/category/:category', (req: Request, res: Response) => {
  const { category } = req.params;
  const fonts = getFontsByCategory(category as any);

  res.json({
    status: 'success',
    data: { category, fonts, count: fonts.length },
  });
});

/**
 * GET /api/multi-user/:userId/fonts/pairing/:niche
 * Get recommended font pairing for niche (tech, finance, wellness, etc)
 */
router.get('/:userId/fonts/pairing/:niche', (req: Request, res: Response) => {
  const { niche } = req.params;
  const pairing = getFontPairings(niche);

  res.json({
    status: 'success',
    data: pairing,
    message: `Font pairing for ${niche} niche`,
  });
});

// ── VISUAL IDENTITY DERIVATION ─────────────────────────────────────────────

/**
 * POST /api/multi-user/:userId/visual/derive
 * Automatically derive visual identity (fonts, colors) from brand philosophy
 */
router.post('/:userId/visual/derive', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const philosophy = getBrandPhilosophy(userId);

    if (!philosophy) {
      return res.status(404).json({ error: 'Brand philosophy required. Create one first.' });
    }

    log.info(`[Phase 25] Deriving visual identity from philosophy: ${userId}`);

    const visual = deriveVisualFromPhilosophy(philosophy);

    res.json({
      status: 'success',
      data: visual,
      message: 'Visual identity derived automatically from philosophy',
    });
  } catch (error) {
    res.status(500).json({ error: 'Derivation failed', details: String(error) });
  }
});

/**
 * POST /api/multi-user/:userId/visual/validate
 * Validate visual identity against brand philosophy (ensure alignment)
 */
router.post('/:userId/visual/validate', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { visual } = req.body;

    log.info(`[Phase 25] Validating visual against philosophy: ${userId}`);

    const validation = validateVisualAgainstPhilosophy(visual);

    res.json({
      status: 'success',
      data: {
        aligned: validation.aligned,
        mismatches: validation.mismatches,
      },
      message: validation.aligned ? 'Visual identity aligned with philosophy' : 'Misalignments found',
    });
  } catch (error) {
    res.status(500).json({ error: 'Validation failed', details: String(error) });
  }
});

/**
 * GET /api/multi-user/:userId/philosophy/brief
 * Generate content brief from brand philosophy (used for content generation)
 */
router.get('/:userId/philosophy/brief', (req: Request, res: Response) => {
  const { userId } = req.params;
  const { brief, pillars } = generatePhilosophyBrief(userId);

  if (!brief) {
    return res.status(404).json({ error: 'Brand philosophy not found' });
  }

  res.json({
    status: 'success',
    data: { brief, contentPillars: pillars },
    message: 'Philosophy brief for content generation',
  });
});

log.info('[Phase 24-25] Multi-User Content Pipeline ✅ (Philosophy-first branding)');

export default router;
