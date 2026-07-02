/**
 * Phase 20: Extended Content Routes
 *
 * Unified API endpoints for Phases 17-19:
 * - Smart Carousel Generator (Pinterest-trained)
 * - Smart Video Generator (Platform-optimized)
 * - Pattern Library Access
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { generateSmartCarousel, type CarouselBrief } from '../capabilities/content/smartCarouselGenerator.js';
import { generateSmartVideo, type VideoBrief } from '../capabilities/content/smartVideoGenerator.js';
import { pinterestPatternLibrary, selectColorPalette, selectNarrativeStructure } from '../capabilities/content/pinterestPatternEncoder.js';

const router = Router();

// ── Health check ───────────────────────────────────────────────────────

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    phases: [17, 18, 19, 20],
    message: 'Smart carousel + video generators online',
  });
});

// ── GET: Pattern Library ───────────────────────────────────────────────

/**
 * GET /api/extended/patterns
 * Returns full Pinterest pattern library for reference
 */
router.get('/patterns', (req: Request, res: Response) => {
  log.info('[Extended Routes] Fetching pattern library');

  res.json({
    status: 'success',
    data: {
      colorPalettes: pinterestPatternLibrary.colorPalettes.map((p) => ({
        id: p.id,
        name: p.name,
        frequency: p.frequency,
        mood: p.implementation.mood,
      })),
      typography: pinterestPatternLibrary.typographyPairings.map((p) => ({
        id: p.id,
        name: p.name,
        pairing: `${p.implementation.headlineFont} + ${p.implementation.bodyFont}`,
      })),
      layouts: pinterestPatternLibrary.layoutPatterns.map((p) => ({
        id: p.id,
        name: p.name,
        frequency: p.frequency,
      })),
      narrativeStructures: pinterestPatternLibrary.narrativeStructures.map((p) => ({
        id: p.id,
        name: p.name,
        optimalSlides: p.implementation.slides.length,
        frequency: p.frequency,
      })),
    },
    message: 'Pattern library extracted from 50 Pinterest pins',
  });
});

// ── POST: Smart Carousel Generator ──────────────────────────────────────

/**
 * POST /api/extended/carousel/generate
 * Generate carousel using Pinterest patterns + psychology
 *
 * Body:
 * {
 *   "topic": "productivity tips",
 *   "emotion": "curiosity",
 *   "contentType": "tips",
 *   "audience": "professional",
 *   "targetSlideCount": 7
 * }
 *
 * Response: Carousel with slides, design system, retention curve
 */
router.post('/carousel/generate', async (req: Request, res: Response) => {
  try {
    const brief: CarouselBrief = req.body;

    log.info(
      `[Extended Routes] Carousel generation request: topic="${brief.topic}", emotion=${brief.emotion}`,
    );

    // Validate input
    if (!brief.topic) {
      return res.status(400).json({error: 'topic required'});
    }

    if (!brief.emotion) {
      brief.emotion = 'curiosity'; // Default
    }

    // Generate
    const carousel = await generateSmartCarousel(brief);

    log.info(
      `[Extended Routes] ✓ Carousel generated: ${carousel.slideCount} slides, retention=${carousel.metadata.averageRetention}%`,
    );

    res.json({
      status: 'success',
      data: carousel,
      message: `Generated ${carousel.slideCount}-slide carousel (Pinterest-optimized)`,
    });
  } catch (error) {
    log.error(`[Extended Routes] Carousel generation failed: ${error}`);
    res.status(500).json({error: 'Carousel generation failed', details: String(error)});
  }
});

// ── POST: Smart Video Generator ────────────────────────────────────────

/**
 * POST /api/extended/video/generate
 * Generate video script using Pinterest patterns
 *
 * Body:
 * {
 *   "topic": "productivity hacks",
 *   "emotion": "curiosity",
 *   "platform": "tiktok",
 *   "contentType": "how-to",
 *   "duration": 30
 * }
 *
 * Response: Video script with scenes, hook, CTA, retention curve
 */
router.post('/video/generate', async (req: Request, res: Response) => {
  try {
    const brief: VideoBrief = req.body;

    log.info(
      `[Extended Routes] Video generation request: topic="${brief.topic}", platform=${brief.platform}`,
    );

    // Validate
    if (!brief.topic) {
      return res.status(400).json({error: 'topic required'});
    }

    if (!brief.platform) {
      brief.platform = 'tiktok'; // Default
    }

    if (!brief.emotion) {
      brief.emotion = 'curiosity'; // Default
    }

    // Generate
    const video = await generateSmartVideo(brief);

    log.info(
      `[Extended Routes] ✓ Video generated: ${video.duration}s ${video.platform}, ${video.scenes.length} scenes, retention=${video.metadata.averageRetention}%`,
    );

    res.json({
      status: 'success',
      data: video,
      message: `Generated ${video.duration}s ${video.platform} video script (Pinterest-optimized)`,
    });
  } catch (error) {
    log.error(`[Extended Routes] Video generation failed: ${error}`);
    res.status(500).json({error: 'Video generation failed', details: String(error)});
  }
});

// ── GET: Color Palette Recommendations ─────────────────────────────────

/**
 * GET /api/extended/patterns/colors?topic=productivity&emotion=curiosity
 * Get recommended color palettes for topic + emotion
 */
router.get('/patterns/colors', (req: Request, res: Response) => {
  const topic = req.query.topic as string;
  const emotion = (req.query.emotion as string) || 'curiosity';

  log.info(`[Extended Routes] Color palette recommendation: topic="${topic}", emotion=${emotion}`);

  if (!topic) {
    return res.status(400).json({error: 'topic required'});
  }

  const palette = selectColorPalette(topic, emotion as any, undefined);

  res.json({
    status: 'success',
    data: {
      recommended: palette,
      alternatives: pinterestPatternLibrary.colorPalettes.filter((p) => p.id !== palette.id).slice(0, 2),
    },
    message: `Recommended palette: ${palette.name} (${palette.frequency}% frequency in research)`,
  });
});

// ── GET: Narrative Structure Recommendations ──────────────────────────

/**
 * GET /api/extended/patterns/narrative?slideCount=7&contentType=tips
 * Get recommended narrative structure
 */
router.get('/patterns/narrative', (req: Request, res: Response) => {
  const slideCount = parseInt(req.query.slideCount as string) || 7;
  const contentType = req.query.contentType as string;

  log.info(
    `[Extended Routes] Narrative recommendation: slides=${slideCount}, type=${contentType}`,
  );

  const narrative = selectNarrativeStructure(slideCount, contentType);

  res.json({
    status: 'success',
    data: narrative,
    message: `${narrative.name} recommended for ${slideCount}-slide carousel`,
  });
});

// ── GET: Pattern Performance Stats ─────────────────────────────────────

/**
 * GET /api/extended/patterns/stats
 * Performance statistics from Pinterest research
 */
router.get('/patterns/stats', (req: Request, res: Response) => {
  const stats = {
    researchSource: '50 Pinterest pins analyzed',
    colorPalettes: pinterestPatternLibrary.colorPalettes.length,
    typographyPairings: pinterestPatternLibrary.typographyPairings.length,
    layoutPatterns: pinterestPatternLibrary.layoutPatterns.length,
    narrativeStructures: pinterestPatternLibrary.narrativeStructures.length,
    visualElements: pinterestPatternLibrary.visualElements.length,
    topPatterns: {
      colorPalette: pinterestPatternLibrary.colorPalettes.sort((a, b) => b.frequency - a.frequency)[0],
      typography: pinterestPatternLibrary.typographyPairings.sort((a, b) => b.frequency - a.frequency)[0],
      layout: pinterestPatternLibrary.layoutPatterns.sort((a, b) => b.frequency - a.frequency)[0],
      narrative: pinterestPatternLibrary.narrativeStructures.sort((a, b) => b.frequency - a.frequency)[0],
    },
  };

  res.json({
    status: 'success',
    data: stats,
    message: 'Pinterest research aggregation complete',
  });
});

// ── POST: Batch Generate Carousels ─────────────────────────────────────

/**
 * POST /api/extended/carousel/batch
 * Generate multiple carousels at once
 *
 * Body: Array of CarouselBrief
 */
router.post('/carousel/batch', async (req: Request, res: Response) => {
  try {
    const briefs: CarouselBrief[] = req.body;

    log.info(`[Extended Routes] Batch carousel generation: ${briefs.length} carousels`);

    const results = await Promise.all(briefs.map((brief) => generateSmartCarousel(brief)));

    log.info(`[Extended Routes] ✓ Batch complete: ${results.length} carousels generated`);

    res.json({
      status: 'success',
      data: results,
      message: `Generated ${results.length} carousels (Pinterest-optimized)`,
    });
  } catch (error) {
    log.error(`[Extended Routes] Batch carousel generation failed: ${error}`);
    res.status(500).json({error: 'Batch generation failed', details: String(error)});
  }
});

// ── POST: Batch Generate Videos ────────────────────────────────────────

/**
 * POST /api/extended/video/batch
 * Generate multiple videos at once
 *
 * Body: Array of VideoBrief
 */
router.post('/video/batch', async (req: Request, res: Response) => {
  try {
    const briefs: VideoBrief[] = req.body;

    log.info(`[Extended Routes] Batch video generation: ${briefs.length} videos`);

    const results = await Promise.all(briefs.map((brief) => generateSmartVideo(brief)));

    log.info(`[Extended Routes] ✓ Batch complete: ${results.length} videos generated`);

    res.json({
      status: 'success',
      data: results,
      message: `Generated ${results.length} videos (Pinterest-optimized)`,
    });
  } catch (error) {
    log.error(`[Extended Routes] Batch video generation failed: ${error}`);
    res.status(500).json({error: 'Batch generation failed', details: String(error)});
  }
});

// ── Mount routes ───────────────────────────────────────────────────────

log.info('[Phase 20] Extended content routes initialized');

export default router;
