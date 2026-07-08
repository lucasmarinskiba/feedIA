/**
 * FeedIA Batch 96 Video Routes
 * Soft-Sell Marketing (Problem→Solution, Entertain/Educate/Emotion) (500 prompts)
 * 5 categories: pets/lifestyle/services/brand/cause
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { videoPromptEngine } from '../services/video-prompt-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

interface Batch96Request {
  category: 'soft-sell-pets' | 'soft-sell-lifestyle' | 'soft-sell-services' | 'soft-sell-brand' | 'soft-sell-cause';
  problem: string;
  solution?: string;
  persona?: string;
  product?: string;
  brand?: string;
  duration?: number;
  userImage?: string;
  emotionalArc?: string;
}

/**
 * POST /api/video/batch-96/pets
 * Generate soft-sell pet/animal marketing (problem→solution enabled)
 */
router.post('/batch-96/pets', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { problem, product, persona = 'pet owner', duration = 20, userImage } = req.body as Batch96Request;

    if (!problem || !product) {
      return res.status(400).json({ error: 'Required: problem, product' });
    }

    log.info('[Batch96] Pet soft-sell generation', { problem, product });

    const prompt = videoPromptEngine.generatePrompt('B96-PET-001', {
      category: 'soft-sell-pets',
      problem,
      product,
      persona,
      duration,
      userImage,
      softSellStrategy: 'problem-shown',
      specs: `Soft-sell pet marketing. Problem shown (${problem}). Product [${product}] enables solution. Character transforms, product subtle.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate pet soft-sell prompt' });
    }

    return res.json({
      status: 'success',
      batch: 'batch-96',
      category: 'soft-sell-pets',
      prompt,
      problem,
      product,
      userImage: userImage ? '✓' : '✗',
      strategy: 'problem→solution-enabled→transformation→brand-subtle',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch96] Pet soft-sell error', error);
    return res.status(500).json({ error: 'Pet soft-sell generation failed' });
  }
});

/**
 * POST /api/video/batch-96/lifestyle
 * Generate soft-sell lifestyle product marketing
 */
router.post('/batch-96/lifestyle', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { problem, product, persona, duration = 20, userImage } = req.body as Batch96Request;

    if (!problem || !product) {
      return res.status(400).json({ error: 'Required: problem, product' });
    }

    log.info('[Batch96] Lifestyle soft-sell generation', { problem, product });

    const prompt = videoPromptEngine.generatePrompt('B96-LIFE-001', {
      category: 'soft-sell-lifestyle',
      problem,
      product,
      persona,
      duration,
      userImage,
      softSellStrategy: 'solution-enabled',
      specs: `Soft-sell lifestyle. Character faced [${problem}]. Product [${product}] enables transformation. Genuine emotion, product natural.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate lifestyle soft-sell' });
    }

    return res.json({
      status: 'success',
      batch: 'batch-96',
      category: 'soft-sell-lifestyle',
      prompt,
      problem,
      product,
      userImage: userImage ? '✓' : '✗',
      strategy: 'problem→solution-enabled→transformation→brand-subtle',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch96] Lifestyle soft-sell error', error);
    return res.status(500).json({ error: 'Lifestyle soft-sell generation failed' });
  }
});

/**
 * POST /api/video/batch-96/services
 * Generate soft-sell service provider marketing (coaching/education/therapy/business services)
 */
router.post('/batch-96/services', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { problem, product, persona, duration = 20, userImage } = req.body as Batch96Request;

    if (!problem || !product) {
      return res.status(400).json({ error: 'Required: problem, product (service)' });
    }

    log.info('[Batch96] Service soft-sell generation', { problem, product });

    const prompt = videoPromptEngine.generatePrompt('B96-SVC-001', {
      category: 'soft-sell-services',
      problem,
      product,
      persona,
      duration,
      userImage,
      softSellStrategy: 'transformation',
      specs: `Soft-sell service. Person struggles with [${problem}]. Service [${product}] guides transformation. Service is enabler, not hero.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate service soft-sell' });
    }

    return res.json({
      status: 'success',
      batch: 'batch-96',
      category: 'soft-sell-services',
      prompt,
      problem,
      serviceProduct: product,
      userImage: userImage ? '✓' : '✗',
      strategy: 'problem→vulnerability→solution-enabled→transformation→gratitude',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch96] Service soft-sell error', error);
    return res.status(500).json({ error: 'Service soft-sell generation failed' });
  }
});

/**
 * POST /api/video/batch-96/brand-positioning
 * Generate soft-sell brand positioning (company culture/values/social responsibility)
 */
router.post('/batch-96/brand-positioning', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { product: brandName, problem: brandValue, persona, duration = 20, userImage } = req.body as Batch96Request;

    if (!brandName || !brandValue) {
      return res.status(400).json({ error: 'Required: product (brand name), problem (brand value)' });
    }

    log.info('[Batch96] Brand positioning generation', { brand: brandName, value: brandValue });

    const prompt = videoPromptEngine.generatePrompt('B96-BRD-001', {
      category: 'soft-sell-brand',
      product: brandName,
      problem: brandValue,
      persona,
      duration,
      userImage,
      softSellStrategy: 'brand-subtle',
      specs: `Brand positioning. Show company [${brandName}] values: ${brandValue}. Day-in-life or team story. Brand purpose subtle.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate brand positioning' });
    }

    return res.json({
      status: 'success',
      batch: 'batch-96',
      category: 'soft-sell-brand-positioning',
      prompt,
      brand: brandName,
      brandValue,
      userImage: userImage ? '✓' : '✗',
      strategy: 'culture-visible→purpose-aligned→values-clear→brand-humanized',
      duration,
      brandContext: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch96] Brand positioning error', error);
    return res.status(500).json({ error: 'Brand positioning generation failed' });
  }
});

/**
 * POST /api/video/batch-96/cause-driven
 * Generate soft-sell cause/social-impact marketing (NGO/non-profit/sustainability/justice)
 */
router.post('/batch-96/cause-driven', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { problem, solution, product, duration = 20, userImage } = req.body as Batch96Request;

    if (!problem) {
      return res.status(400).json({ error: 'Required: problem (social issue)' });
    }

    log.info('[Batch96] Cause-driven generation', { problem, solution });

    const prompt = videoPromptEngine.generatePrompt('B96-CAUSE-001', {
      category: 'soft-sell-cause',
      problem,
      solution: solution || 'action',
      product,
      duration,
      userImage,
      softSellStrategy: 'transformation',
      specs: `Cause-driven marketing. Problem shown: ${problem}. Solution action: ${solution || 'intervention'}. Organization/movement subtle, impact visible.`,
    });

    if (!prompt) {
      return res.status(400).json({ error: 'Failed to generate cause-driven prompt' });
    }

    return res.json({
      status: 'success',
      batch: 'batch-96',
      category: 'soft-sell-cause-driven',
      prompt,
      socialIssue: problem,
      solution,
      userImage: userImage ? '✓' : '✗',
      strategy: 'problem-injustice→action→impact-visible→movement-implicit→collective-responsibility',
      duration,
      brand: brand?.name,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[Batch96] Cause-driven error', error);
    return res.status(500).json({ error: 'Cause-driven generation failed' });
  }
});

/**
 * GET /api/video/batch-96/categories
 * List supported soft-sell categories
 */
router.get('/batch-96/categories', async (req: Request, res: Response) => {
  res.json({
    status: 'success',
    batch: 'batch-96',
    strategy: 'soft-sell (problem→solution-enabled, no direct CTA, character-driven, emotion-first)',
    categories: [
      {
        name: 'soft-sell-pets',
        description: 'Pet/animal marketing. Problem shown, product enables solution.',
        total: 100,
        endpoint: 'POST /api/video/batch-96/pets',
        examples: ['pet training', 'pet nutrition', 'pet health', 'pet grooming'],
      },
      {
        name: 'soft-sell-lifestyle',
        description: 'Lifestyle products. Home/fitness/beauty/wellness. Transformation narrative.',
        total: 100,
        endpoint: 'POST /api/video/batch-96/lifestyle',
        examples: ['home décor', 'fitness equipment', 'skincare', 'wellness app'],
      },
      {
        name: 'soft-sell-services',
        description: 'Service providers. Coaching/education/therapy/business. Person enabled.',
        total: 100,
        endpoint: 'POST /api/video/batch-96/services',
        examples: ['life coaching', 'tutoring', 'therapy', 'business consulting'],
      },
      {
        name: 'soft-sell-brand-positioning',
        description: 'Brand culture/values/social responsibility. Company story.',
        total: 100,
        endpoint: 'POST /api/video/batch-96/brand-positioning',
        examples: ['sustainability focus', 'team culture', 'social impact', 'innovation'],
      },
      {
        name: 'soft-sell-cause-driven',
        description: 'NGO/non-profit/cause marketing. Social issue, solution action.',
        total: 100,
        endpoint: 'POST /api/video/batch-96/cause-driven',
        examples: ['education access', 'environmental restoration', 'health equity', 'poverty'],
      },
    ],
    totalPrompts: 500,
    narrativePattern: 'Problem→Vulnerability→Solution-Enabled→Transformation→Brand-Subtle',
  });
});

export default router;
