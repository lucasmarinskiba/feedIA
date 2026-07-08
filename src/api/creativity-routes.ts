/**
 * Creativity/Ocurrencia Routes
 * Ensure all content has genuine wit, originality, unexpected twists
 * No clichés. No generic. Every piece: "didn't see that coming"
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { creativityWitEngine } from '../services/creativity-wit-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/creativity/analyze
 * Analyze prompt for wit/originality score
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'promptText required' });
    }

    const analysis = await creativityWitEngine.analyzeWit(promptText);

    return res.json({
      status: 'analyzed',
      witScore: analysis.witScore,
      originalityScore: analysis.originalityScore,
      combinedScore: Math.round((analysis.witScore + analysis.originalityScore) / 2),
      passed: analysis.passed,
      clichesFound: analysis.clicheDetected,
      surpriseElements: analysis.surpriseElements,
      recommendation: analysis.recommendation,
      metadata: { analyzedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Creativity] Analysis failed', error);
    return res.status(500).json({ error: 'Analysis failed' });
  }
});

/**
 * POST /api/creativity/boost
 * Full pipeline: analyze + remove clichés + inject twist
 */
router.post('/boost', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { promptText } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'promptText required' });
    }

    log.info('[Creativity] Boost requested', { brand: brand?.name });

    const result = await creativityWitEngine.boostWit(promptText);

    return res.json({
      status: 'boosted',
      original: {
        prompt: result.originalPrompt.slice(0, 150) + '...',
        score: Math.round((result.analysis.witScore + result.analysis.originalityScore) / 2),
      },
      enhanced: {
        prompt: result.enhancedPrompt,
        clichesRemoved: result.clichesRemoved,
        twistApplied: result.twistApplied,
      },
      guarantee: 'Content now has genuine ocurrencia: wit, surprise, originality',
      metadata: { boostedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Creativity] Boost failed', error);
    return res.status(500).json({ error: 'Boost failed', message: String(error) });
  }
});

/**
 * POST /api/creativity/inject-twist
 * Inject specific creative twist technique
 */
router.post('/inject-twist', async (req: Request, res: Response) => {
  try {
    const { promptText, twistType, contentType } = req.body;

    if (!promptText) {
      return res.status(400).json({ error: 'promptText required' });
    }

    let selectedTwist = twistType;

    // Auto-suggest based on content type if not specified
    if (!selectedTwist && contentType) {
      const suggestions = creativityWitEngine.suggestTwistForContentType(contentType);
      selectedTwist = suggestions[0]?.twistType;
    }

    const result = creativityWitEngine.injectCreativeTwist(promptText, selectedTwist);

    return res.json({
      status: 'twist_injected',
      twist: result.twist,
      enhancedPrompt: result.prompt,
      metadata: { injectedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Creativity] Twist injection failed', error);
    return res.status(500).json({ error: 'Twist injection failed' });
  }
});

/**
 * GET /api/creativity/twist-techniques
 * List all available creative twist techniques
 */
router.get('/twist-techniques', async (req: Request, res: Response) => {
  try {
    const techniques = creativityWitEngine.getAllTwistTechniques();

    res.json({
      status: 'ok',
      totalTechniques: techniques.length,
      techniques,
      usage: 'POST /api/creativity/inject-twist with twistType to apply specific technique',
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Creativity] Techniques list failed', error);
    res.status(500).json({ error: 'Techniques list failed' });
  }
});

/**
 * GET /api/creativity/suggest/:contentType
 * Get suggested twists for content type (carousel/reel/story/image)
 */
router.get('/suggest/:contentType', async (req: Request<{ contentType: string }>, res: Response) => {
  try {
    const { contentType } = req.params;

    if (!['carousel', 'reel', 'story', 'image'].includes(contentType)) {
      return res.status(400).json({ error: 'contentType must be: carousel, reel, story, or image' });
    }

    const suggestions = creativityWitEngine.suggestTwistForContentType(
      contentType as 'carousel' | 'reel' | 'story' | 'image'
    );

    return res.json({
      status: 'ok',
      contentType,
      suggestedTechniques: suggestions,
      metadata: { suggestedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Creativity] Suggestion failed', error);
    return res.status(500).json({ error: 'Suggestion failed' });
  }
});

/**
 * GET /api/creativity/health
 * Creativity engine health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const techniques = creativityWitEngine.getAllTwistTechniques();

    res.json({
      status: 'ok',
      service: 'creativity-wit-engine',
      definition: 'OCURRENTE: Ingenious, witty, unexpected, sharp, original content',
      capabilities: [
        'Cliché detection (17+ patterns tracked)',
        'Wit signal analysis',
        'Creative twist injection (10 techniques)',
        'Cliché-to-fresh-alternative replacement',
        'Content-type-specific twist suggestions',
      ],
      twistTechniqueCount: techniques.length,
      guarantee: 'Every piece of content analyzed for genuine wit before delivery',
      endpoints: {
        analyze: 'POST /api/creativity/analyze',
        boost: 'POST /api/creativity/boost',
        injectTwist: 'POST /api/creativity/inject-twist',
        twistTechniques: 'GET /api/creativity/twist-techniques',
        suggest: 'GET /api/creativity/suggest/:contentType',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[Creativity] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
