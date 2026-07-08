/**
 * FeedIA Batch 92-93 Video Routes
 * Vertical engagement (9:16, 15sec) + Ultra-detailed reference patterns
 * Batch 92: 700 prompts (7 engagement categories × 100)
 * Batch 93: 650 prompts (7 reference patterns × 50-100)
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { videoPromptEngine } from '../services/video-prompt-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

interface Batch92Request {
  engagementType: 'emotional' | 'entertainment' | 'polemic' | 'education' | 'humor' | 'debate';
  persona: string;
  product: string;
  duration?: number;
  userImage?: string;
}

interface Batch93Request {
  referencePattern: 'documentary-minimalism' | 'travel-vlogging' | 'continuous-macro' | 'luxury-food' | 'luxury-product' | 'modular-review' | 'urban-action';
  persona: string;
  location?: string;
  product?: string;
  duration?: number;
  userImage?: string;
}

/**
 * POST /api/video/batch-92/generate
 * Generate vertical engagement prompt (9:16, 15sec TikTok/Instagram Reels)
 */
router.post('/batch-92/generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { engagementType, persona, product, duration = 15, userImage } = req.body as Batch92Request;

    if (!engagementType || !persona || !product) {
      return res.status(400).json({
        error: 'Required: engagementType, persona, product',
        supportedTypes: ['emotional', 'entertainment', 'polemic', 'education', 'humor', 'debate'],
      });
    }

    log.info('[Batch92] Vertical engagement generation', {
      engagementType,
      persona,
      product,
      duration,
      userImage: userImage ? '✓' : '✗',
    });

    // Map engagement type to category template
    const categoryMap: Record<string, string> = {
      emotional: 'VE-EMO-001',
      entertainment: 'VE-ENT-001',
      polemic: 'VE-EMO-001', // Uses emotional hooks for controversial content
      education: 'VE-EMO-001', // Uses structured emotional arc
      humor: 'VE-ENT-001', // Uses entertainment template
      debate: 'VE-EMO-001', // Uses emotional engagement
    };

    const templateId = categoryMap[engagementType] || 'VE-EMO-001';
    const prompt = videoPromptEngine.generatePrompt(templateId, {
      category: 'vertical-engagement',
      persona,
      product,
      duration,
      tone: engagementType,
      engagementType: engagementType as any,
      userImage,
      specs: `PLATAFORMA: TikTok/Instagram Reels (9:16), max 15seg, ${engagementType} hook`,
    });

    if (!prompt) {
      return res.status(400).json({
        error: 'Failed to generate prompt. Check required parameters.',
      });
    }

    return res.json({
      status: 'success',
      batch: 'batch-92',
      prompt,
      engagementType,
      userImage: userImage ? '✓' : '✗',
      format: '9:16 vertical',
      duration,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[Batch92] Generation error', error);
    return res.status(500).json({ error: 'Batch 92 generation failed' });
  }
});

/**
 * POST /api/video/batch-92/batch-generate
 * Generate multiple vertical engagement prompts
 */
router.post('/batch-92/batch-generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { requests } = req.body as { requests: Batch92Request[] };

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'requests array required' });
    }

    if (requests.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 requests per batch' });
    }

    log.info('[Batch92] Batch generation', { requestCount: requests.length });

    const generatedPrompts = requests
      .map(req => {
        const categoryMap: Record<string, string> = {
          emotional: 'VE-EMO-001',
          entertainment: 'VE-ENT-001',
          polemic: 'VE-EMO-001',
          education: 'VE-EMO-001',
          humor: 'VE-ENT-001',
          debate: 'VE-EMO-001',
        };

        const templateId = categoryMap[req.engagementType] || 'VE-EMO-001';
        return videoPromptEngine.generatePrompt(templateId, {
          category: 'vertical-engagement',
          persona: req.persona,
          product: req.product,
          duration: req.duration || 15,
          engagementType: req.engagementType as any,
          userImage: req.userImage,
          specs: `PLATAFORMA: TikTok/Instagram Reels (9:16), max 15seg, ${req.engagementType} hook`,
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return res.json({
      status: 'success',
      batch: 'batch-92',
      totalRequested: requests.length,
      totalGenerated: generatedPrompts.length,
      format: '9:16 vertical',
      prompts: generatedPrompts,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[Batch92] Batch generation error', error);
    return res.status(500).json({ error: 'Batch 92 batch generation failed' });
  }
});

/**
 * POST /api/video/batch-93/generate
 * Generate ultra-detailed reference pattern prompt
 */
router.post('/batch-93/generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { referencePattern, persona, location, product, duration = 15, userImage } = req.body as Batch93Request;

    if (!referencePattern || !persona) {
      return res.status(400).json({
        error: 'Required: referencePattern, persona',
        supportedPatterns: [
          'documentary-minimalism',
          'travel-vlogging',
          'continuous-macro',
          'luxury-food',
          'luxury-product',
          'modular-review',
          'urban-action',
        ],
      });
    }

    log.info('[Batch93] Reference pattern generation', {
      referencePattern,
      persona,
      location,
      product,
      duration,
      userImage: userImage ? '✓' : '✗',
    });

    // Map pattern to template
    const patternMap: Record<string, string> = {
      'documentary-minimalism': 'B93-DOC-001',
      'travel-vlogging': 'B93-TRAV-001',
      'continuous-macro': 'B93-MACRO-001',
      'luxury-food': 'B93-MACRO-001', // Uses macro template
      'luxury-product': 'B93-MACRO-001', // Uses macro template
      'modular-review': 'B93-DOC-001', // Uses doc template (8-segment flow)
      'urban-action': 'B93-TRAV-001', // Uses travel vlog movement template
    };

    const templateId = patternMap[referencePattern] || 'B93-DOC-001';
    const prompt = videoPromptEngine.generatePrompt(templateId, {
      category: referencePattern as any,
      persona,
      location,
      product,
      duration,
      userImage,
      specs: `REFERENCE PATTERN: ${referencePattern}, 9:16 vertical, ultra-detailed scene direction`,
    });

    if (!prompt) {
      return res.status(400).json({
        error: 'Failed to generate prompt. Check required parameters.',
      });
    }

    return res.json({
      status: 'success',
      batch: 'batch-93',
      prompt,
      referencePattern,
      userImage: userImage ? '✓' : '✗',
      format: '9:16 vertical',
      duration,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[Batch93] Generation error', error);
    return res.status(500).json({ error: 'Batch 93 generation failed' });
  }
});

/**
 * POST /api/video/batch-93/batch-generate
 * Generate multiple reference pattern prompts
 */
router.post('/batch-93/batch-generate', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { requests } = req.body as { requests: Batch93Request[] };

    if (!requests || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'requests array required' });
    }

    if (requests.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 requests per batch' });
    }

    log.info('[Batch93] Batch generation', { requestCount: requests.length });

    const patternMap: Record<string, string> = {
      'documentary-minimalism': 'B93-DOC-001',
      'travel-vlogging': 'B93-TRAV-001',
      'continuous-macro': 'B93-MACRO-001',
      'luxury-food': 'B93-MACRO-001',
      'luxury-product': 'B93-MACRO-001',
      'modular-review': 'B93-DOC-001',
      'urban-action': 'B93-TRAV-001',
    };

    const generatedPrompts = requests
      .map(req => {
        const templateId = patternMap[req.referencePattern] || 'B93-DOC-001';
        return videoPromptEngine.generatePrompt(templateId, {
          category: req.referencePattern as any,
          persona: req.persona,
          location: req.location,
          product: req.product,
          duration: req.duration || 15,
          userImage: req.userImage,
          specs: `REFERENCE PATTERN: ${req.referencePattern}, 9:16 vertical, ultra-detailed`,
        });
      })
      .filter((p): p is NonNullable<typeof p> => p !== null);

    return res.json({
      status: 'success',
      batch: 'batch-93',
      totalRequested: requests.length,
      totalGenerated: generatedPrompts.length,
      format: '9:16 vertical',
      prompts: generatedPrompts,
      brand: brand?.name,
      metadata: {
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[Batch93] Batch generation error', error);
    return res.status(500).json({ error: 'Batch 93 batch generation failed' });
  }
});

/**
 * GET /api/video/batch-92/engagement-types
 * List supported engagement types for Batch 92
 */
router.get('/batch-92/engagement-types', async (req: Request, res: Response) => {
  res.json({
    status: 'success',
    batch: 'batch-92',
    engagementTypes: [
      { type: 'emotional', description: 'Instant emotional reaction hooks', count: 100 },
      { type: 'entertainment', description: 'Comedy/trend-based moments', count: 100 },
      { type: 'polemic', description: 'Controversial/debate-starting content', count: 100 },
      { type: 'education', description: 'Learning-focused content', count: 100 },
      { type: 'humor', description: 'Comedy-first entertainment', count: 100 },
      { type: 'debate', description: 'Discussion-prompting content', count: 100 },
    ],
    total: 700,
    format: '9:16 vertical, max 15 seconds',
    platform: 'TikTok/Instagram Reels',
  });
});

/**
 * GET /api/video/batch-93/reference-patterns
 * List supported reference patterns for Batch 93
 */
router.get('/batch-93/reference-patterns', async (req: Request, res: Response) => {
  res.json({
    status: 'success',
    batch: 'batch-93',
    referencePatterns: [
      { pattern: 'documentary-minimalism', description: 'MiniDV 2000s aesthetic, character-locked', count: 100 },
      { pattern: 'travel-vlogging', description: 'Smartphone handheld + cultural sensory details', count: 100 },
      { pattern: 'continuous-macro', description: 'No cuts, smooth orbits, FPV flow', count: 100 },
      { pattern: 'luxury-food', description: 'Hero shot, macro cinematography, steam/vapor', count: 100 },
      { pattern: 'luxury-product', description: 'Extreme detail, particles, reflections', count: 100 },
      { pattern: 'modular-review', description: '8-segment arc (hook→detail→use→CTA), replicable', count: 100 },
      { pattern: 'urban-action', description: 'Movement synced to music, street culture', count: 50 },
    ],
    total: 650,
    format: '9:16 vertical, ultra-detailed scene direction',
  });
});

/**
 * GET /api/video/batches-92-93/status
 * Full library status for Batch 92-93
 */
router.get('/batches-92-93/status', async (req: Request, res: Response) => {
  const libraryStatus = videoPromptEngine.getLibraryStatus();

  res.json({
    status: 'operational',
    batch92: {
      name: 'Vertical Engagement (TikTok/Instagram)',
      total: 700,
      format: '9:16 vertical',
      duration: '≤15 seconds',
      categories: 6,
      engagementTypes: ['emotional', 'entertainment', 'polemic', 'education', 'humor', 'debate'],
      endpoint: 'POST /api/video/batch-92/generate',
    },
    batch93: {
      name: 'Ultra-Detailed Reference Patterns',
      total: 650,
      format: '9:16 vertical',
      duration: '≤15 seconds',
      patterns: 7,
      referencePatterns: [
        'documentary-minimalism',
        'travel-vlogging',
        'continuous-macro',
        'luxury-food',
        'luxury-product',
        'modular-review',
        'urban-action',
      ],
      endpoint: 'POST /api/video/batch-93/generate',
    },
    totalPrompts: 1350,
    libraryStatus,
  });
});

export default router;
