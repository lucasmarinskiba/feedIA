/**
 * FeedIA Parameterized Image Routes
 * User image upload → prompt matching → content generation
 * 12,870 parameterized prompts (batches 62-95)
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import { log } from '../agent/logger.js';
import { feediaBrain } from '../core/feedia-brain.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();
const upload = multer({ dest: 'uploads/' });

interface ParameterizedPromptRequest {
  userImages: string[];
  objective: string;
  contentType: 'carousel' | 'reel' | 'story' | 'post';
  domain?: string;
  occasion?: 'trabajo' | 'amigos' | 'temática';
  batchIds?: string[];
}

interface MatchedPrompt {
  id: string;
  base: string;
  parameterized: string;
  occasion: string;
  batchId: string;
  confidence: number;
}

interface GeneratedContent {
  contentType: string;
  prompts: MatchedPrompt[];
  images: string[];
  objective: string;
  metadata: {
    totalPrompts: number;
    generatedAt: string;
    brand?: string;
  };
}

/**
 * POST /api/parameterized/upload-images
 * User uploads images → system analyzes + matches to prompts
 */
router.post('/upload-images', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { objective, contentType = 'carousel', domain, occasion, batchIds } = req.body as ParameterizedPromptRequest;
    const uploadedFiles = req.files as Express.Multer.File[];

    if (!uploadedFiles || uploadedFiles.length === 0) {
      return res.status(400).json({ error: 'No images uploaded' });
    }

    if (!objective) {
      return res.status(400).json({ error: 'objective required' });
    }

    log.info('[ParameterizedRoutes] Images uploaded', {
      count: uploadedFiles.length,
      objective,
      contentType,
    });

    const imagePaths = uploadedFiles.map(f => f.path);

    // Match images to parameterized prompts
    const matchedPrompts = await matchImagesToPrompts(
      imagePaths,
      objective,
      domain,
      occasion,
      batchIds,
    );

    const response: GeneratedContent = {
      contentType,
      prompts: matchedPrompts,
      images: imagePaths,
      objective,
      metadata: {
        totalPrompts: matchedPrompts.length,
        generatedAt: new Date().toISOString(),
        brand: brand?.name,
      },
    };

    return res.json(response);
  } catch (error) {
    log.error('[ParameterizedRoutes] Upload error', error);
    res.status(500).json({ error: 'Image processing failed' });
  }
});

/**
 * POST /api/parameterized/match-prompts
 * Direct prompt matching from parameterized library
 */
router.post('/match-prompts', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { imageDescriptions, objective, contentType = 'carousel', occasion } = req.body;

    if (!imageDescriptions || imageDescriptions.length === 0) {
      return res.status(400).json({ error: 'imageDescriptions required' });
    }

    log.info('[ParameterizedRoutes] Matching prompts', {
      descriptionCount: imageDescriptions.length,
      objective,
    });

    const matched = await matchDescriptionsToPrompts(imageDescriptions, objective, occasion);

    res.json({
      status: 'success',
      matched,
      count: matched.length,
      contentType,
      objective,
    });
  } catch (error) {
    log.error('[ParameterizedRoutes] Matching error', error);
    res.status(500).json({ error: 'Prompt matching failed' });
  }
});

/**
 * GET /api/parameterized/library-status
 * Parameterized library info
 */
router.get('/library-status', (req: Request, res: Response) => {
  res.json({
    status: 'ready',
    library: 'FeedIA Parameterized Prompts',
    totalPrompts: 12870,
    baseBatches: '28-61',
    parameterizedBatches: '62-95',
    basePrompts: 6770,
    parameterizedTemplates: 6100,
    placeholderToken: '[USER_IMAGE]',
    supportedContentTypes: ['carousel', 'reel', 'story', 'post'],
    supportedOccasions: ['trabajo', 'amigos', 'temática'],
  });
});

/**
 * POST /api/parameterized/generate-content
 * Full pipeline: images → matched prompts → generated content
 */
router.post('/generate-content', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const {
      imageDescriptions,
      objective,
      contentType = 'carousel',
      occasion = 'temática',
    } = req.body;

    if (!imageDescriptions || !objective) {
      return res.status(400).json({ error: 'imageDescriptions and objective required' });
    }

    log.info('[ParameterizedRoutes] Content generation', {
      images: imageDescriptions.length,
      objective,
      contentType,
    });

    // Step 1: Match prompts
    const matchedPrompts = await matchDescriptionsToPrompts(
      imageDescriptions,
      objective,
      occasion,
    );

    // Step 2: Generate content variants
    const contentVariants = await generateContentVariants(
      matchedPrompts,
      imageDescriptions,
      objective,
      contentType,
    );

    res.json({
      status: 'success',
      contentType,
      variants: contentVariants,
      objective,
      metadata: {
        promptsMatched: matchedPrompts.length,
        variantsGenerated: contentVariants.length,
        generatedAt: new Date().toISOString(),
        brand: brand?.name,
      },
    });
  } catch (error) {
    log.error('[ParameterizedRoutes] Generation error', error);
    res.status(500).json({ error: 'Content generation failed' });
  }
});

// ── Helper Functions ──────────────────────────────────────────────────────

async function matchImagesToPrompts(
  imagePaths: string[],
  objective: string,
  domain?: string,
  occasion?: string,
  batchIds?: string[],
): Promise<MatchedPrompt[]> {
  const matched: MatchedPrompt[] = [];

  // Analyze each image + find matching parameterized prompts
  for (const imagePath of imagePaths) {
    const imageType = analyzeImageType(imagePath);
    const relevantBatches = batchIds || getRelevantBatches(objective, imageType);

    // Get parameterized prompts from relevant batches
    for (const batchId of relevantBatches) {
      const prompts = feediaBrain.getPromptsByBatch(batchId);

      for (const prompt of prompts) {
        if (prompt.parameterized?.includes('[USER_IMAGE]')) {
          const confidence = calculateMatchConfidence(prompt, objective, imageType);

          if (confidence > 0.6) {
            matched.push({
              id: `${batchId}-${prompt.id}`,
              base: prompt.base,
              parameterized: prompt.parameterized,
              occasion: occasion || prompt.occasion || 'temática',
              batchId,
              confidence,
            });
          }
        }
      }
    }
  }

  return matched.slice(0, 50); // Return top 50 matches
}

async function matchDescriptionsToPrompts(
  descriptions: string[],
  objective: string,
  occasion?: string,
): Promise<MatchedPrompt[]> {
  const matched: MatchedPrompt[] = [];

  for (const description of descriptions) {
    const imageType = inferImageType(description);
    const relevantBatches = getRelevantBatches(objective, imageType);

    for (const batchId of relevantBatches) {
      const prompts = feediaBrain.getPromptsByBatch(batchId);

      for (const prompt of prompts) {
        if (prompt.parameterized?.includes('[USER_IMAGE]')) {
          const confidence = calculateDescriptionConfidence(
            prompt,
            description,
            objective,
          );

          if (confidence > 0.65) {
            matched.push({
              id: `${batchId}-${prompt.id}`,
              base: prompt.base,
              parameterized: prompt.parameterized,
              occasion: occasion || 'temática',
              batchId,
              confidence,
            });
          }
        }
      }
    }
  }

  return matched.slice(0, 50);
}

async function generateContentVariants(
  matchedPrompts: MatchedPrompt[],
  imageDescriptions: string[],
  objective: string,
  contentType: string,
): Promise<any[]> {
  const variants = [];

  for (const prompt of matchedPrompts.slice(0, 10)) {
    // Replace [USER_IMAGE] with actual image description
    const finalPrompt = prompt.parameterized.replace(
      '[USER_IMAGE]',
      imageDescriptions[0] || 'custom image',
    );

    variants.push({
      promptId: prompt.id,
      originalParameterized: prompt.parameterized,
      finalPrompt,
      occasion: prompt.occasion,
      contentType,
      confidence: prompt.confidence,
      metadata: {
        batchId: prompt.batchId,
        base: prompt.base,
      },
    });
  }

  return variants;
}

// ── Image Analysis Helpers ───────────────────────────────────────────────

function analyzeImageType(imagePath: string): string {
  const ext = path.extname(imagePath).toLowerCase();
  // Basic type inference from file extension
  if (['.jpg', '.jpeg', '.png'].includes(ext)) return 'photo';
  if (['.svg'].includes(ext)) return 'vector';
  return 'unknown';
}

function inferImageType(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('person') || lower.includes('woman') || lower.includes('man')) return 'portrait';
  if (lower.includes('product') || lower.includes('bottle') || lower.includes('box')) return 'product';
  if (lower.includes('logo') || lower.includes('icon') || lower.includes('shield')) return 'graphic';
  if (lower.includes('food') || lower.includes('cake') || lower.includes('dish')) return 'food';
  if (lower.includes('pet') || lower.includes('dog') || lower.includes('cat')) return 'animal';
  return 'generic';
}

function getRelevantBatches(objective: string, imageType: string): string[] {
  const objectiveLower = objective.toLowerCase();

  // Map objective to relevant batch IDs (62-95 parameterized)
  const objectiveToBatches: Record<string, string[]> = {
    branding: ['64', '69', '81', '85', '86', '87', '90', '91', '94', '95'],
    product: ['77', '78', '79', '82', '84', '86', '87'],
    lifestyle: ['80', '83', '90', '93', '94'],
    fashion: ['87', '90', '91', '92', '94'],
    beauty: ['88', '89', '90', '91', '92'],
    food: ['85', '86', '87'],
    celebrity: ['80', '83'],
    commercial: ['84', '85'],
    designer: ['72', '75'],
    professional: ['72', '73'],
  };

  for (const [key, batches] of Object.entries(objectiveToBatches)) {
    if (objectiveLower.includes(key)) {
      return batches;
    }
  }

  // Default: all parameterized batches
  return Array.from({ length: 34 }, (_, i) => String(62 + i));
}

function calculateMatchConfidence(prompt: MatchedPrompt, objective: string, imageType: string): number {
  let score = 0.5; // Base score

  // Boost for relevant batch
  if (prompt.base?.includes(objective)) score += 0.2;

  // Boost for matching image type
  if (prompt.parameterized?.includes(imageType)) score += 0.15;

  // Boost for occasion match
  if (prompt.occasion === 'temática') score += 0.1;

  return Math.min(score, 1.0);
}

function calculateDescriptionConfidence(
  prompt: MatchedPrompt,
  description: string,
  objective: string,
): number {
  let score = 0.5;

  const descLower = description.toLowerCase();
  const baseLower = prompt.base.toLowerCase();
  const paramLower = prompt.parameterized.toLowerCase();

  // Token overlap scoring
  const descTokens = descLower.split(/\s+/);
  const baseTokens = baseLower.split(/\s+/);

  const overlap = descTokens.filter(t => baseTokens.includes(t)).length;
  score += Math.min(overlap * 0.05, 0.3);

  // Objective match
  if (paramLower.includes(objective.toLowerCase())) score += 0.15;

  return Math.min(score, 1.0);
}

export default router;
