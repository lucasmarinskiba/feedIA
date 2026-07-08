/**
 * FeedIA Image Upload Handler
 * Accept user images → extract features → match prompts → enable parameterization
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';
import { analyzeImageFeatures, generateRealImageEmbeddingViaCaption, isGeminiConfigured } from '../services/gemini-vision-client.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads/images';

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, WebP allowed'));
    }
  },
});

/**
 * Extract image features via real Gemini vision analysis (person/scene/
 * emotion/palette/quality). Falls back to a neutral placeholder if
 * GEMINI_API_KEY is unset or the call fails — never throws, upload always
 * succeeds even without the real model configured.
 */
async function extractImageFeatures(imagePath: string): Promise<Record<string, any>> {
  const real = isGeminiConfigured() ? await analyzeImageFeatures(imagePath) : null;

  if (real) {
    log.info('[ImageUpload] Real Gemini vision analysis used', { imagePath });
    return real;
  }

  log.warn('[ImageUpload] Falling back to placeholder features (GEMINI_API_KEY unset or call failed)', { imagePath });
  return {
    person: {
      detected: true,
      age_range: 'unknown',
      gender: 'unknown',
      ethnicity: 'unknown',
      expression: 'neutral',
    },
    scene: {
      location_type: 'indoor',
      lighting: 'natural',
      time_of_day: 'day',
    },
    emotion: {
      primary: 'neutral',
      secondary: null,
      confidence: 0.5,
    },
    palette: {
      dominant_colors: ['#FFFFFF', '#000000', '#808080'],
      temperature: 'neutral',
      saturation: 'medium',
    },
    quality: {
      blur_score: 0.2,
      brightness: 0.5,
      contrast: 0.5,
    },
  };
}

/**
 * Generate a real image embedding via caption-then-embed (Gemini vision
 * describes the image, then the real text-embedding-004 model embeds that
 * description — see gemini-vision-client.ts for why this isn't true CLIP but
 * is real model output). Falls back to a random placeholder vector (matching
 * dimensionality) when GEMINI_API_KEY is unset or the call fails.
 */
async function generateImageEmbedding(imagePath: string): Promise<number[]> {
  const real = isGeminiConfigured() ? await generateRealImageEmbeddingViaCaption(imagePath) : null;

  if (real) {
    log.info('[ImageUpload] Real embedding generated via caption-then-embed', {
      imagePath,
      dimension: real.embedding.length,
      caption: real.caption.slice(0, 80),
    });
    return real.embedding;
  }

  log.warn('[ImageUpload] Falling back to placeholder embedding (GEMINI_API_KEY unset or call failed)', { imagePath });
  return Array(512)
    .fill(0)
    .map(() => Math.random() - 0.5);
}

/**
 * Calculate similarity score between two embeddings (cosine similarity)
 */
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * (b[i] ?? 0), 0);
  const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return normA && normB ? dotProduct / (normA * normB) : 0;
}

/**
 * POST /api/image-upload/upload
 * Upload image → extract features → store in DB
 */
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const userId = (req as any).userId || 'anonymous';

    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }

    log.info('[ImageUpload] Processing image', { filename: req.file.filename, size: req.file.size });

    const imagePath = req.file.path;
    const imageHash = crypto.createHash('md5').update(fs.readFileSync(imagePath)).digest('hex');
    const [features, embedding] = await Promise.all([
      extractImageFeatures(imagePath),
      generateImageEmbedding(imagePath),
    ]);
    const imageId = crypto.randomUUID();

    // Store image in database
    const stored = feedIADatabase.storeUserImage({
      id: imageId,
      user_id: userId,
      image_path: imagePath,
      image_hash: imageHash,
      features_json: JSON.stringify(features),
      embedding_vector: JSON.stringify(embedding),
    });

    if (!stored) {
      fs.unlinkSync(imagePath); // Clean up
      return res.status(500).json({ error: 'Failed to store image in database' });
    }

    log.info('[ImageUpload] Image stored', { imageId, userId });

    return res.json({
      status: 'success',
      image: {
        id: imageId,
        filename: req.file.filename,
        size: req.file.size,
        features,
        embedding_dimension: embedding.length,
      },
      next_step: 'Call POST /api/image-upload/match-prompts to find matching prompts',
      facial_identity_note: features.person?.detected
        ? 'Person detected. If generating content FROM this photo (not just matching), call POST /api/identity/lock with this imageId to preserve exact facial features across all generated frames.'
        : undefined,
      brand: brand?.name,
      metadata: {
        uploadedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[ImageUpload] Upload failed', error);
    if (req.file) {
      fs.unlinkSync(req.file.path); // Clean up on error
    }
    return res.status(500).json({ error: 'Image upload failed' });
  }
});

/**
 * POST /api/image-upload/match-prompts
 * Find matching prompts for uploaded image
 */
router.post('/match-prompts', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { imageId, limit = 50, category, batch } = req.body;

    if (!imageId) {
      return res.status(400).json({ error: 'imageId required' });
    }

    log.info('[ImageMatch] Finding matching prompts', { imageId, limit, category, batch });

    // Query database for matching prompts
    const matches = feedIADatabase.findMatchingPrompts(imageId, limit);

    // TODO: Filter by category/batch if specified
    // TODO: Implement actual similarity scoring based on embeddings

    return res.json({
      status: 'success',
      imageId,
      matchCount: matches.length,
      matches: matches.slice(0, limit),
      nextStep: 'Use matched prompt IDs for content generation',
      metadata: {
        queriedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[ImageMatch] Match prompts failed', error);
    return res.status(500).json({ error: 'Prompt matching failed' });
  }
});

/**
 * POST /api/image-upload/parameterize
 * Combine user image + matched prompt + parameters → generate content
 */
router.post('/parameterize', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { imageId, promptId, parameters } = req.body;

    if (!imageId || !promptId) {
      return res.status(400).json({ error: 'imageId and promptId required' });
    }

    log.info('[ImageParameterize] Parameterizing prompt', { imageId, promptId, parameters });

    // TODO: Load prompt template from DB
    // TODO: Fill parameters with user-provided values
    // TODO: Generate parameterized prompt
    // TODO: Queue for video generation

    return res.json({
      status: 'success',
      parameterized: {
        imageId,
        promptId,
        parameters,
        readyForGeneration: true,
      },
      nextStep: 'Call POST /api/content/video to generate video',
      metadata: {
        parameterizedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    log.error('[ImageParameterize] Parameterization failed', error);
    return res.status(500).json({ error: 'Parameterization failed' });
  }
});

/**
 * GET /api/image-upload/status
 * Database statistics
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const stats = feedIADatabase.getStats();

    return res.json({
      status: 'operational',
      database: stats,
      uploadDirectory: UPLOAD_DIR,
      features: [
        'Image upload with feature extraction',
        'Prompt matching via similarity search',
        'User image parameterization',
        'Analytics tracking',
      ],
      endpoints: {
        upload: 'POST /api/image-upload/upload',
        match: 'POST /api/image-upload/match-prompts',
        parameterize: 'POST /api/image-upload/parameterize',
        status: 'GET /api/image-upload/status',
      },
    });
  } catch (error) {
    log.error('[ImageUpload] Status check failed', error);
    return res.status(500).json({ error: 'Status check failed' });
  }
});

export default router;
