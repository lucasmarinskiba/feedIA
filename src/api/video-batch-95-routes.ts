/**
 * FeedIA Batch 95 Video Routes
 * UGC + Location-Based + User-Image Adaptable (500 prompts)
 * 5 categories: daily-life/ugc/transformation/action/location-montage
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { videoPromptEngine } from '../services/video-prompt-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

interface Batch95Request {
  category: 'daily-life-montage' | 'ugc-reel' | 'transformation-narrative' | 'action-sequence' | 'location-montage';
  persona?: string;
  location?: string;
  product?: string;
  duration?: number;
  userImage?: string;
  emotionalArc?: string;
}

/**
 * POST /api/video/batch-95/daily-life-montage
 * Generate daily-life montage prompt (café/office/home/shop)
 */
router.post('/batch-95/daily-life-montage', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { persona, location = 'café', product, duration = 15, userImage, emotionalArc } = req.body as Batch95Request;

    log.info('[Batch95] Daily-life montage generation', {
      persona,
      location,
      duration,
      userImage: userImage ? '✓' : '✗',
    });

    const prompt = videoPromptEngine.generatePrompt('B95-DLM-001', {
      category: 'daily-life-montage',
      persona,
      location,
      product,
      duration,
      userImage,
      emotionalArc: emotionalArc || 'routine→chaos→peace',
      specs: `Daily-life montage in [${location}]. Same space, multiple emotions. Ultra-cinematic. Character: [${persona || 'ensemble'}]`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate montage prompt' });
    }

    res.json({
      status: 'success',
      batch: 'batch-95',
      category: 'daily-life-montage',
      prompt,
      location,
      userImage: userImage ? '✓' : '✗',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch95] Daily-life generation error', error);
    res.status(500).json({ error: 'Generation failed' });
  }
});

/**
 * POST /api/video/batch-95/ugc-reel
 * Generate authentic UGC reel (iPhone vlog, character-locked)
 */
router.post('/batch-95/ugc-reel', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { persona, location = 'home', product, duration = 30, userImage } = req.body as Batch95Request;

    log.info('[Batch95] UGC reel generation', { persona, duration, userImage: userImage ? '✓' : '✗' });

    const prompt = videoPromptEngine.generatePrompt('B95-UGC-001', {
      category: 'ugc-reel',
      persona,
      location,
      product,
      duration,
      userImage,
      specs: `Authentic phone vlog. iPhone 14 Pro aesthetic. Character-locked identity. Real dialogue, no narration. Natural movement.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate UGC prompt' });
    }

    res.json({
      status: 'success',
      batch: 'batch-95',
      category: 'ugc-reel',
      prompt,
      userImage: userImage ? '✓' : '✗',
      format: 'authentic-vlog',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch95] UGC reel error', error);
    res.status(500).json({ error: 'UGC generation failed' });
  }
});

/**
 * POST /api/video/batch-95/transformation-narrative
 * Generate character transformation narrative (eye-reflection, glow-up, historical)
 */
router.post('/batch-95/transformation-narrative', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { persona, location, product, duration = 20, userImage, emotionalArc } = req.body as Batch95Request;

    log.info('[Batch95] Transformation narrative generation', { persona, emotionalArc });

    const prompt = videoPromptEngine.generatePrompt('B95-TRN-001', {
      category: 'transformation-narrative',
      persona,
      location,
      product,
      duration,
      userImage,
      emotionalArc: emotionalArc || 'stuck→breakthrough→empowered',
      specs: `Character transformation. Eye-reflection morphing OR historical selfie POV OR glow-up journey. Smooth transitions.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate transformation prompt' });
    }

    res.json({
      status: 'success',
      batch: 'batch-95',
      category: 'transformation-narrative',
      prompt,
      emotionalArc: emotionalArc || 'stuck→breakthrough→empowered',
      userImage: userImage ? '✓' : '✗',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch95] Transformation error', error);
    res.status(500).json({ error: 'Transformation generation failed' });
  }
});

/**
 * POST /api/video/batch-95/action-sequence
 * Generate action/stunt sequence (western/parkour/sports/fantasy/cinematic)
 */
router.post('/batch-95/action-sequence', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { location = 'desert', product, duration = 15, userImage } = req.body as Batch95Request;

    log.info('[Batch95] Action sequence generation', { location, duration });

    const prompt = videoPromptEngine.generatePrompt('B95-ACT-001', {
      category: 'action-sequence',
      location,
      product,
      duration,
      userImage,
      specs: `Dynamic action sequence. Practical stunts. Multiple camera angles. Slow-mo at peaks. Cinematic framing.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate action prompt' });
    }

    res.json({
      status: 'success',
      batch: 'batch-95',
      category: 'action-sequence',
      prompt,
      location,
      userImage: userImage ? '✓' : '✗',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch95] Action sequence error', error);
    res.status(500).json({ error: 'Action generation failed' });
  }
});

/**
 * POST /api/video/batch-95/location-montage
 * Generate location-based montage (snow/desert/beach/city/indoor with emotional arc)
 */
router.post('/batch-95/location-montage', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { location = 'beach', persona, duration = 20, userImage, emotionalArc } = req.body as Batch95Request;

    log.info('[Batch95] Location montage generation', { location, emotionalArc });

    const prompt = videoPromptEngine.generatePrompt('B95-LOC-001', {
      category: 'location-montage',
      location,
      persona,
      duration,
      userImage,
      emotionalArc: emotionalArc || 'struggle→discovery→peace',
      specs: `Location-based montage. Different scenes in [${location}]. Emotional arc: ${emotionalArc || 'struggle→discovery→peace'}. Cinematic transitions.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate location montage' });
    }

    res.json({
      status: 'success',
      batch: 'batch-95',
      category: 'location-montage',
      prompt,
      location,
      emotionalArc: emotionalArc || 'struggle→discovery→peace',
      userImage: userImage ? '✓' : '✗',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch95] Location montage error', error);
    res.status(500).json({ error: 'Location montage generation failed' });
  }
});

/**
 * GET /api/video/batch-95/categories
 * List supported categories for Batch 95
 */
router.get('/batch-95/categories', async (req: Request, res: Response) => {
  res.json({
    status: 'success',
    batch: 'batch-95',
    categories: [
      {
        name: 'daily-life-montage',
        description: 'Same space, multiple emotions over time. Café/office/home/shop.',
        total: 100,
        endpoint: 'POST /api/video/batch-95/daily-life-montage',
      },
      {
        name: 'ugc-reel',
        description: 'Authentic phone vlog. Character-locked. Real dialogue. iPhone aesthetic.',
        total: 100,
        endpoint: 'POST /api/video/batch-95/ugc-reel',
      },
      {
        name: 'transformation-narrative',
        description: 'Eye-reflection morphing, historical selfie-POV, glow-up journey.',
        total: 100,
        endpoint: 'POST /api/video/batch-95/transformation-narrative',
      },
      {
        name: 'action-sequence',
        description: 'Western/parkour/sports/fantasy/cinematic. Dynamic, practical stunts.',
        total: 100,
        endpoint: 'POST /api/video/batch-95/action-sequence',
      },
      {
        name: 'location-montage',
        description: 'Snow/desert/beach/city/indoor. Emotional arc tied to place.',
        total: 100,
        endpoint: 'POST /api/video/batch-95/location-montage',
      },
    ],
    totalPrompts: 500,
  });
});

export default router;
