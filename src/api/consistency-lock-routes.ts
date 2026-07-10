/**
 * Consistency Lock Routes
 * Create locks for character/product/environment
 * Generate carousel prompts with stability guarantees
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { consistencyLockManager } from '../services/consistency-lock.js';
import { characterStabilityService } from '../services/character-stability.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/consistency/create-lock
 * Create character/product/environment locks for carousel series
 */
router.post('/create-lock', async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { frameCount, characterDescription, productDescription, environmentDescription } = req.body;

    if (!frameCount || frameCount < 2) {
      return void res.status(400).json({ error: 'frameCount must be >= 2' });
    }

    log.info('[ConsistencyLock] Lock creation requested', { frameCount, brand: brand?.name });

    // Create individual locks
    let charLock, prodLock, envLock;

    if (characterDescription) {
      charLock = consistencyLockManager.createCharacterLock(characterDescription);
    }
    if (productDescription) {
      prodLock = consistencyLockManager.createProductLock(productDescription);
    }
    if (environmentDescription) {
      envLock = consistencyLockManager.createEnvironmentLock(environmentDescription);
    }

    // Create series lock
    const seriesLock = consistencyLockManager.createSeriesLock(frameCount, charLock, prodLock, envLock);

    res.json({
      status: 'success',
      seriesId: seriesLock.seriesId,
      frameCount: seriesLock.frameCount,
      locks: {
        character: charLock ? { lockId: charLock.lockId, character: charLock.characterName } : null,
        product: prodLock ? { lockId: prodLock.lockId, product: prodLock.productName } : null,
        environment: envLock ? { lockId: envLock.lockId, setting: envLock.settingName } : null,
      },
      guarantees: [
        '✓ Same character across all frames (face, outfit, traits)',
        '✓ Same product (shape, color, material)',
        '✓ Same environment (setting, lighting, time)',
        '✓ Consistency enforced via lock injection',
      ],
      nextStep: `POST /api/consistency/generate-prompts with seriesId: ${seriesLock.seriesId}`,
      metadata: { createdAt: seriesLock.createdAt },
    });
  } catch (error) {
    log.error('[ConsistencyLock] Lock creation failed', error);
    res.status(500).json({ error: 'Lock creation failed', message: String(error) });
  }
});

/**
 * POST /api/consistency/generate-prompts
 * Generate carousel prompts with consistency locks applied
 */
router.post('/generate-prompts', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, basePrompt, narrativeArc } = req.body;

    if (!seriesId || !basePrompt) {
      return void res.status(400).json({ error: 'seriesId and basePrompt required' });
    }

    const seriesLock = consistencyLockManager.getSeriesLock(seriesId);
    if (!seriesLock) {
      return void res.status(404).json({ error: 'Series lock not found', seriesId });
    }

    log.info('[ConsistencyLock] Prompt generation requested', { seriesId });

    // Generate locked prompts
    const lockedPrompts = await characterStabilityService.generateStableCarouselPrompts(
      basePrompt,
      seriesId,
      seriesLock.frameCount,
      narrativeArc
    );

    res.json({
      status: 'success',
      seriesId,
      frameCount: lockedPrompts.length,
      prompts: lockedPrompts.map((p, i) => ({
        frameNumber: i + 1,
        preview: p.slice(0, 200) + '...',
        fullPrompt: p,
      })),
      consistency: {
        characterLocked: !!seriesLock.characterLock,
        productLocked: !!seriesLock.productLock,
        environmentLocked: !!seriesLock.environmentLock,
      },
      nextStep: 'Send each prompt to /api/video/parameterized-prompt or expansion endpoint',
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ConsistencyLock] Prompt generation failed', error);
    res.status(500).json({ error: 'Prompt generation failed', message: String(error) });
  }
});

/**
 * POST /api/consistency/validate
 * Validate carousel prompts for consistency
 */
router.post('/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, prompts } = req.body;

    if (!seriesId || !prompts || prompts.length < 2) {
      return void res.status(400).json({ error: 'seriesId and prompts array (min 2) required' });
    }

    log.info('[ConsistencyLock] Validation requested', { seriesId, frameCount: prompts.length });

    const report = await characterStabilityService.validateCharacterConsistency(seriesId, prompts);

    res.json({
      status: 'validated',
      ...report,
      passed: report.consistencyScore >= 70,
      statusLabel: report.consistencyScore >= 85 ? 'Excellent' :
                   report.consistencyScore >= 70 ? 'Good' :
                   report.consistencyScore >= 50 ? 'Needs work' :
                   'Critical',
      metadata: { validatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ConsistencyLock] Validation failed', error);
    res.status(500).json({ error: 'Validation failed', message: String(error) });
  }
});

/**
 * POST /api/consistency/suggest-improvements
 * Get suggestions to improve carousel consistency
 */
router.post('/suggest-improvements', async (req: Request, res: Response): Promise<void> => {
  try {
    const { seriesId, prompts } = req.body;

    if (!seriesId || !prompts) {
      return void res.status(400).json({ error: 'seriesId and prompts required' });
    }

    const suggestions = await characterStabilityService.suggestStabilityImprovements(
      seriesId,
      prompts
    );

    res.json({
      status: 'analysis_complete',
      ...suggestions,
      metadata: { analyzedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ConsistencyLock] Suggestions failed', error);
    res.status(500).json({ error: 'Suggestions failed', message: String(error) });
  }
});

/**
 * GET /api/consistency/lock/:seriesId
 * Get series lock details
 */
router.get('/lock/:seriesId', async (req: Request, res: Response): Promise<void> => {
  try {
    const seriesId = String(req.params.seriesId ?? '');
    const seriesLock = consistencyLockManager.getSeriesLock(seriesId);

    if (!seriesLock) {
      return void res.status(404).json({ error: 'Series lock not found', seriesId });
    }

    res.json({
      status: 'ok',
      seriesId,
      seriesLock,
      lockInstructions: seriesLock.lockInstructions,
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ConsistencyLock] Lock retrieval failed', error);
    res.status(500).json({ error: 'Lock retrieval failed' });
  }
});

/**
 * GET /api/consistency/health
 * Consistency lock health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'consistency-lock-manager',
      capabilities: [
        'Character consistency locks (face, outfit, traits)',
        'Product consistency locks (shape, color, material)',
        'Environment consistency locks (setting, lighting, time)',
        'Prompt generation with lock injection',
        'Carousel validation + recommendations',
      ],
      endpoints: {
        createLock: 'POST /api/consistency/create-lock',
        generatePrompts: 'POST /api/consistency/generate-prompts',
        validate: 'POST /api/consistency/validate',
        suggestImprovements: 'POST /api/consistency/suggest-improvements',
        getLock: 'GET /api/consistency/lock/:seriesId',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[ConsistencyLock] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
