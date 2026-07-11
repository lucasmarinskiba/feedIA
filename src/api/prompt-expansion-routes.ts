/**
 * FeedIA Prompt Expansion Routes
 * LLM-powered variation generation: 3,450 base → 34,500+ variations
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import {
  expandAndStore,
  superExpandAndStore,
  expandBatch,
  getExpansionStatus,
} from '../services/prompt-expander.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/prompts/expand-single
 * Expand single base prompt into 6 variations (one per tone)
 */
router.post('/expand-single', async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { promptId, promptText } = req.body;

    if (!promptId || !promptText) {
      return void res.status(400).json({ error: 'promptId and promptText required' });
    }

    log.info('[PromptExpansion] Single expansion requested', { promptId });

    const result = await expandAndStore(promptId, promptText);

    res.json({
      status: 'success',
      expansion: result,
      message: '6 variations generated (1 per tone: emotional/entertaining/polemic/education/humor/debate)',
      brand: brand?.name,
      metadata: { expandedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[PromptExpansion] Single expansion error', error);
    res.status(500).json({ error: 'Expansion failed' });
  }
});

/**
 * POST /api/prompts/super-expand
 * Super-expand single prompt: 1 prompt → 12 variations (2x standard)
 * For scaling: video/image/stories 3,450 → 41,400 per library
 */
router.post('/super-expand', async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { promptId, promptText } = req.body;

    if (!promptId || !promptText) {
      return void res.status(400).json({ error: 'promptId and promptText required' });
    }

    log.info('[PromptExpansion] Super-expand requested', { promptId });

    const result = await superExpandAndStore(promptId, promptText);

    res.json({
      status: 'success',
      expansion: result,
      message: '12 variations generated (2x standard: emotional, entertaining, polemic, education, humor, debate + aspirational, introspective, energetic, calm, authoritative, playful)',
      scalingInfo: '3,450 base × 12 = 41,400 total prompts per library',
      brand: brand?.name,
      metadata: { expandedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[PromptExpansion] Super-expand error', error);
    res.status(500).json({ error: 'Super-expand failed' });
  }
});

/**
 * POST /api/prompts/expand-batch
 * Expand entire batch (e.g., batch-90, batch-91)
 * Rate-limited: ~10s per prompt to avoid API limits
 */
router.post('/expand-batch', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { batch = 'batch-90' } = req.body;

    log.info('[PromptExpansion] Batch expansion requested', { batch });

    // Queue expansion job (don't wait for completion)
    expandBatch(batch).then(result => {
      log.info('[PromptExpansion] Batch expansion completed', result);
    }).catch(error => {
      log.error('[PromptExpansion] Batch expansion error', error);
    });

    res.json({
      status: 'queued',
      batch,
      message: 'Batch expansion started. Check /api/prompts/expansion-status for progress.',
      estimatedTime: 'Depends on batch size (typically 30-60 minutes for 550 prompts)',
      rateLimit: '~10 seconds per prompt (API safety)',
      brand: brand?.name,
      metadata: { queuedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[PromptExpansion] Batch request error', error);
    res.status(500).json({ error: 'Batch request failed' });
  }
});

/**
 * GET /api/prompts/expansion-status
 * Check expansion progress + library statistics
 */
router.get('/expansion-status', async (req: Request, res: Response) => {
  try {
    const status = await getExpansionStatus();

    res.json({
      status: 'operational',
      library: status.library,
      expansion: status.expansion_info,
      nextStep: 'POST /api/prompts/expand-batch to generate variations for a batch',
      metadata: { checkedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[PromptExpansion] Status check error', error);
    res.status(500).json({ error: 'Status check failed' });
  }
});

/**
 * GET /api/prompts/expansion-info
 * Expansion strategy + capacity info
 */
router.get('/expansion-info', async (req: Request, res: Response) => {
  res.json({
    status: 'operational',
    strategy: 'LLM-powered variation generation (Claude API)',
    capacity: {
      base_prompts: 3450,
      tones_per_prompt: 6,
      total_possible_variations: 20700,
      conservative_estimate: 34500,
    },
    tone_options: ['emotional', 'entertaining', 'polemic', 'education', 'humor', 'debate'],
    batchOptions: [
      'batch-90 (550 prompts)',
      'batch-91 (550 prompts)',
      'batch-92 (700 prompts)',
      'batch-93 (650 prompts)',
      'batch-94 (500 prompts)',
      'batch-95 (500 prompts)',
      'batch-96 (500 prompts)',
    ],
    rateLimiting: '10 seconds between API calls (Anthropic safety)',
    costEstimate: 'Claude 3.5 Sonnet: ~$0.003-0.005 per prompt expansion',
    endpoints: {
      expandSingle: 'POST /api/prompts/expand-single',
      expandBatch: 'POST /api/prompts/expand-batch',
      status: 'GET /api/prompts/expansion-status',
      info: 'GET /api/prompts/expansion-info',
    },
  });
});

export default router;
