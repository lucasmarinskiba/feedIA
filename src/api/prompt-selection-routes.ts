/**
 * Prompt Selection API Routes
 * /api/prompts/* — intelligent prompt selection based on user intent
 */

import { Router, Request, Response } from 'express';
import {
  selectPromptsForUser,
  parseUserIntent,
  selectPromptBatches,
  type ContentFormat,
  type ContentCategory,
} from '../services/prompt-index.js';

const router = Router();

/**
 * POST /api/prompts/select
 * Select best prompt batches for user request
 *
 * Request:
 * {
 *   "query": "I want to create a carousel about my premium skincare product",
 *   "topN": 3
 * }
 *
 * Response:
 * {
 *   "intent": { format: "carousel", category: "product", ... },
 *   "selectedBatches": [88, 65, 82],
 *   "description": "Batch 88: Product photography, commercial + Batch 65: Tech macro, packaging + ...",
 *   "recommendations": [
 *     { batchId: 88, score: 0.92, reason: "Format + category match" },
 *     { batchId: 65, score: 0.87, reason: "Product photography fits skincare" },
 *     ...
 *   ]
 * }
 */
router.post('/select', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query, topN = 3 } = req.body as { query: string; topN?: number };

    if (!query) {
      res.status(400).json({ error: 'query required' });
      return;
    }

    if (query.length < 10) {
      res.status(400).json({ error: 'query too short (min 10 chars)' });
      return;
    }

    const result = await selectPromptsForUser(query, Math.min(topN, 5));

    console.log('[PromptSelect] Request:', { query: query.substring(0, 50), topN, result });

    res.json({
      success: true,
      intent: result.intent,
      selectedBatches: result.selectedBatches,
      description: result.description,
      message: `Selected ${result.selectedBatches.length} prompt batches for your ${result.intent.format} ${result.intent.category} content`,
    });
    return;
  } catch (err) {
    console.error('[PromptSelect] Error:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * POST /api/prompts/parse-intent
 * Parse user message to extract intent (format, category, topic)
 *
 * Request: { "message": "I need carousel for startup" }
 * Response: { "intent": { format: "carousel", category: "brand", ... } }
 */
router.post('/parse-intent', async (req: Request, res: Response): Promise<void> => {
  try {
    const { message } = req.body as { message: string };

    if (!message) {
      res.status(400).json({ error: 'message required' });
      return;
    }

    const intent = parseUserIntent(message);

    res.json({
      success: true,
      intent,
      explanation: `Detected: ${intent.format} format, ${intent.category} category, ${intent.brandVoice} voice for ${intent.targetAudience} audience`,
    });
    return;
  } catch (err) {
    console.error('[ParseIntent] Error:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

/**
 * GET /api/prompts/batches/:format/:category
 * Get all batches matching format + category combo
 *
 * Example: GET /api/prompts/batches/carousel/product
 * Response: { batches: [28, 29, 65, 88], count: 4 }
 */
router.get('/batches/:format/:category', async (req: Request, res: Response): Promise<void> => {
  try {
    const { format, category } = req.params;

    const intent = {
      format: (format as ContentFormat) || ('any' as ContentFormat),
      category: (category as ContentCategory) || ('any' as ContentCategory),
      topic: '',
    };

    const batches = await selectPromptBatches(intent, 100); // Get all matching

    res.json({
      success: true,
      format,
      category,
      batches,
      count: batches.length,
    });
    return;
  } catch (err) {
    console.error('[GetBatches] Error:', err);
    res.status(500).json({ error: String(err) });
    return;
  }
});

export default router;
