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
    const userId = String(req.params.userId ?? '');
    const profile = createUserBrandProfile(userId, req.body);
    res.json({ status: 'success', data: profile });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get('/:userId/brand', (req: Request, res: Response): void => {
  const profile = getUserBrandProfile(String(req.params.userId ?? ''));
  if (!profile) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ status: 'success', data: profile });
});

router.post('/:userId/generate/carousel', async (req: Request, res: Response): Promise<void> => {
  try {
    const carousel = await generateSmartCarousel(req.body);
    res.json({ status: 'success', data: carousel });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/:userId/generate/video', async (req: Request, res: Response): Promise<void> => {
  try {
    const video = await generateSmartVideo(req.body);
    res.json({ status: 'success', data: video });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post('/:userId/validate/coherence', (req: Request, res: Response) => {
  const report = generateBrandCoherenceReport(String(req.params.userId ?? ''), req.body.posts || []);
  res.json({ status: 'success', data: report });
});

router.get('/:userId/resources/recommend', (req: Request, res: Response) => {
  const contentType = (req.query.contentType as string) || 'carousel';
  const recommendations = recommendResourcesFor(contentType);
  res.json({ status: 'success', data: { recommended: recommendations, free: getFreeResources().slice(0, 5) } });
});

router.get('/:userId/dashboard', (req: Request, res: Response): void => {
  const profile = getUserBrandProfile(String(req.params.userId ?? ''));
  if (!profile) { res.status(404).json({ error: 'Not found' }); return; }
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

router.post('/:userId/learnings/update', (req: Request, res: Response): void => {
  const updated = updateUserBrandLearnings(String(req.params.userId ?? ''), req.body);
  if (!updated) { res.status(404).json({ error: 'Not found' }); return; }
  res.json({ status: 'success', data: updated });
});

router.post('/:userId/generate/batch', async (req: Request, res: Response): Promise<void> => {
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
    const userId = String(req.params.userId ?? '');
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
router.get('/:userId/philosophy', (req: Request, res: Response): void => {
  const userId = String(req.params.userId ?? '');
  const philosophy = getBrandPhilosophy(userId);

  if (!philosophy) {
    res.status(404).json({ error: 'Brand philosophy not found. Create one first.' }); return;
  }

  res.json({ status: 'success', data: philosophy });
});

/**
 * PUT /api/multi-user/:userId/philosophy
 * Update brand philosophy
 */
router.put('/:userId/philosophy', (req: Request, res: Response): void => {
  try {
    const userId = String(req.params.userId ?? '');
    const updated = updateBrandPhilosophy(userId, req.body);

    if (!updated) {
      res.status(404).json({ error: 'Brand philosophy not found' }); return;
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
  const niche = String(req.params.niche ?? '');
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
router.post('/:userId/visual/derive', (req: Request, res: Response): void => {
  try {
    const userId = String(req.params.userId ?? '');
    const philosophy = getBrandPhilosophy(userId);

    if (!philosophy) {
      res.status(404).json({ error: 'Brand philosophy required. Create one first.' }); return;
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
    const userId = String(req.params.userId ?? '');
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
router.get('/:userId/philosophy/brief', (req: Request, res: Response): void => {
  const userId = String(req.params.userId ?? '');
  const { brief, pillars } = generatePhilosophyBrief(userId);

  if (!brief) {
    res.status(404).json({ error: 'Brand philosophy not found' }); return;
  }

  res.json({
    status: 'success',
    data: { brief, contentPillars: pillars },
    message: 'Philosophy brief for content generation',
  });
});

// ── PHASE 26: DESIGN PATTERN LIBRARY ENDPOINTS ──────────────────────────────

/**
 * GET /api/multi-user/:userId/patterns/available
 * List all available carousel patterns (inverted, message, storytelling)
 */
router.get('/:userId/patterns/available', (req: Request, res: Response) => {
  const patterns = {
    inverted: [
      'productWontPattern',
      'characterPunchlinePattern',
      'beforeDuringAfterInverted',
      'fastFactsInverted'
    ],
    advancedMessage: [
      'beforeDuringAfter',
      'misconceptionFlip',
      'accumulationStrategy',
      'objectionLadder',
      'contrastStory',
      'frameworkReveal',
      'patternInterrupt',
      'proofProgression',
      'speedVsQuality',
      'authorityChallenge'
    ],
    storytelling: [
      'herosJourney',
      'problemAgitationSolution',
      'beforeDuringAfter',
      'curiosityLoop',
      'teachingStory'
    ],
  };

  res.json({
    status: 'success',
    data: patterns,
    message: 'All carousel patterns available (Phase 26)',
  });
});

/**
 * POST /api/multi-user/:userId/patterns/generate
 * Generate carousel brief from selected pattern + industry + messaging
 */
router.post('/:userId/patterns/generate', (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? '');
    const { patternType, patternName, industry, messaging, format } = req.body;

    log.info(`[Phase 26] Generating carousel: ${patternName} for ${industry}`);

    // Pattern brief template
    const brief = {
      userId,
      pattern: patternName,
      category: patternType,
      industry,
      format: format || 'carousel',
      slides: 5,
      messageFramework: messaging || 'Adaptable to any message',
      structure: 'Problem → Error → Proof → System → Wisdom (Inverted) OR Hook → Connect → Reveal → Deliver → Invite (Forward)',
      psychology: 'Multi-layer engagement. Forces swipes. Shareability high.',
      timestamp: new Date().toISOString(),
      readyFor: ['Instagram Carousel', 'Instagram Reel', 'TikTok', 'LinkedIn', 'Email'],
      nextStep: 'Use brief to generate visual assets + copy with LLM'
    };

    res.json({
      status: 'success',
      data: brief,
      message: 'Carousel brief generated. Ready for asset + copy generation.',
    });
  } catch (error) {
    log.error(`[Phase 26] Pattern generation failed: ${error}`);
    res.status(500).json({ error: 'Pattern generation failed', details: String(error) });
  }
});

/**
 * GET /api/multi-user/:userId/patterns/:patternName/template
 * Get full template for specific pattern
 */
router.get('/:userId/patterns/:patternName/template', (req: Request, res: Response): void => {
  const patternName = String(req.params.patternName ?? '');

  const templates: Record<string, any> = {
    productWontPattern: {
      slides: [
        { slide: 1, type: 'Punchline', example: '[PRODUCT] won\'t [SOLVE PROBLEM]' },
        { slide: 2, type: 'Error ID', example: 'EL ERROR: [PRODUCT] = [FALSE SOLUTION]' },
        { slide: 3, type: 'Proof', example: 'Formulas: + [X] ≠ + [Y]' },
        { slide: 4, type: 'System', example: 'Puzzle: [Component 1] + [Component 2] + [Component 3]...' },
        { slide: 5, type: 'Wisdom', example: 'Tu [PRODUCT] es [ROLE], no [WRONG ROLE]' }
      ]
    },
    invertedCarousel: {
      structure: 'Punchline (funny) → Error (frustration) → Proof (data) → System (solution) → Wisdom (context)',
      shareability: 'Slide 1 (meme) + Slide 5 (quote) both independently shareable'
    },
    herosJourney: {
      acts: [
        { act: 1, title: 'Ordinary World', duration: '5-10%' },
        { act: 2, title: 'The Call', duration: '10-15%' },
        { act: 3, title: 'Resistance & Journey', duration: '60-70%' },
        { act: 4, title: 'Transformation', duration: '10-15%' },
        { act: 5, title: 'Return Changed', duration: '5-10%' }
      ]
    },
    beforeDuringAfter: {
      structure: 'Before (pain) → During (process) → After (transformation)',
      psychology: 'Emotional arc forces completion. Relatability high.'
    }
  };

  const template = templates[patternName];

  if (!template) {
    res.status(404).json({ error: `Pattern ${patternName} not found` }); return;
  }

  res.json({
    status: 'success',
    data: template,
    message: `Template for ${patternName}`,
  });
});

/**
 * POST /api/multi-user/:userId/patterns/batch-generate
 * Generate multiple carousel briefs at once (for multi-carousel campaigns)
 */
router.post('/:userId/patterns/batch-generate', (req: Request, res: Response) => {
  try {
    const userId = String(req.params.userId ?? '');
    const { patterns } = req.body; // Array of {patternName, industry, messaging}

    log.info(`[Phase 26] Batch generating ${patterns.length} carousels`);

    const briefs = patterns.map((p: any, idx: number) => ({
      index: idx + 1,
      pattern: p.patternName,
      industry: p.industry,
      messaging: p.messaging,
      slides: 5,
      status: 'ready for generation'
    }));

    res.json({
      status: 'success',
      data: { briefs, totalCarousels: patterns.length },
      message: 'Batch carousel briefs generated. Ready for asset generation.',
    });
  } catch (error) {
    log.error(`[Phase 26] Batch generation failed: ${error}`);
    res.status(500).json({ error: 'Batch generation failed', details: String(error) });
  }
});

/**
 * GET /api/multi-user/:userId/patterns/platform/:platform
 * Get platform-specific storytelling recommendations
 */
router.get('/:userId/patterns/platform/:platform', (req: Request, res: Response): void => {
  const platform = String(req.params.platform ?? '');

  const platformGuides: Record<string, any> = {
    'instagram-carousel': {
      format: '5 slides',
      pacing: 'User controls (can swipe fast or slow)',
      structure: 'Hook → Build (2-3 slides) → Reveal → CTA',
      recommendation: 'Each slide answers question from previous'
    },
    'instagram-reel': {
      duration: '15-60 seconds',
      timing: '0-3s hook, 3-45s build, 45-60s end',
      recommendation: 'Audio-first, fast cuts, captions'
    },
    'instagram-story': {
      frames: '4-5',
      pacing: 'Rapid fire, escalating urgency',
      recommendation: 'One swipe = one beat'
    },
    'tiktok': {
      duration: '15-60 seconds',
      timing: '0-3s unmissable hook, 3-15s pattern interrupt, 15-45s deliver',
      recommendation: 'Sound-first, subtitles mandatory'
    },
    'linkedin': {
      length: '1-3 paragraphs',
      structure: 'Hook → Body → Proof → CTA',
      recommendation: 'Business language + personal touch'
    },
    'email': {
      structure: 'Subject (hook) → Body (story) → Proof → CTA',
      recommendation: 'Conversational, clear value'
    }
  };

  const guide = platformGuides[platform];

  if (!guide) {
    res.status(404).json({ error: `Platform ${platform} not found` }); return;
  }

  res.json({
    status: 'success',
    data: guide,
    message: `Storytelling guide for ${platform}`
  });
});

log.info('[Phase 24-26] Multi-User Content Pipeline ✅ (Philosophy-first branding + Design Pattern Library)');

export default router;
