/**
 * Facial Identity Preservation Routes
 * Lock + validate + inject facial identity from uploaded user photos
 * Guarantees generated content preserves real facial features
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { facialIdentityPreservationService } from '../services/facial-identity-preservation.js';
import { feedIADatabase } from '../db/database.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/identity/lock
 * Create identity lock from uploaded image (via imageId from /api/image-upload/upload)
 */
router.post('/lock', async (req: Request, res: Response) => {
  try {
    const brand = (req as any).brand as BrandProfile;
    const { imageId, imagePath, facialFeatures } = req.body;

    if (!imageId || !imagePath) {
      return res.status(400).json({ error: 'imageId and imagePath required' });
    }

    log.info('[FacialIdentity] Lock creation requested', { imageId, brand: brand?.name });

    const identityLock = await facialIdentityPreservationService.createIdentityLock(
      imageId,
      imagePath,
      facialFeatures
    );

    res.json({
      status: 'success',
      lockId: identityLock.lockId,
      confidence: identityLock.confidenceScore,
      landmarks: identityLock.landmarks,
      guarantee: 'Generated content will preserve these exact facial features',
      nextStep: `POST /api/identity/inject with lockId: ${identityLock.lockId}`,
      metadata: { createdAt: identityLock.createdAt },
    });
  } catch (error) {
    log.error('[FacialIdentity] Lock creation failed', error);
    res.status(500).json({ error: 'Identity lock creation failed', message: String(error) });
  }
});

/**
 * POST /api/identity/inject
 * Inject identity preservation instructions into content prompt
 */
router.post('/inject', async (req: Request, res: Response) => {
  try {
    const { lockId, prompt } = req.body;

    if (!lockId || !prompt) {
      return res.status(400).json({ error: 'lockId and prompt required' });
    }

    const enhancedPrompt = facialIdentityPreservationService.injectIdentityLock(prompt, lockId);

    res.json({
      status: 'success',
      lockId,
      enhancedPrompt,
      guarantee: 'Facial identity preservation instructions injected',
      metadata: { injectedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FacialIdentity] Injection failed', error);
    res.status(500).json({ error: 'Injection failed', message: String(error) });
  }
});

/**
 * POST /api/identity/validate
 * Validate generated content description preserves source identity
 */
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { lockId, generatedDescription } = req.body;

    if (!lockId || !generatedDescription) {
      return res.status(400).json({ error: 'lockId and generatedDescription required' });
    }

    const validation = await facialIdentityPreservationService.validatePreservation(
      lockId,
      generatedDescription
    );

    res.json({
      status: 'validated',
      ...validation,
      statusLabel: validation.identityPreserved ? 'Identity Preserved' : 'REGENERATE — Identity At Risk',
      metadata: { validatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FacialIdentity] Validation failed', error);
    res.status(500).json({ error: 'Validation failed' });
  }
});

/**
 * POST /api/identity/lock-and-inject
 * Combined: create lock from image + immediately inject into prompt (single call)
 */
router.post('/lock-and-inject', async (req: Request, res: Response) => {
  try {
    const { imageId, imagePath, facialFeatures, prompt } = req.body;

    if (!imageId || !imagePath || !prompt) {
      return res.status(400).json({ error: 'imageId, imagePath, and prompt required' });
    }

    const identityLock = await facialIdentityPreservationService.createIdentityLock(
      imageId,
      imagePath,
      facialFeatures
    );

    const enhancedPrompt = facialIdentityPreservationService.injectIdentityLock(
      prompt,
      identityLock.lockId
    );

    res.json({
      status: 'success',
      lockId: identityLock.lockId,
      confidence: identityLock.confidenceScore,
      enhancedPrompt,
      guarantee: 'Real facial features from source photo locked into generation prompt',
      metadata: { processedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FacialIdentity] Lock-and-inject failed', error);
    res.status(500).json({ error: 'Lock-and-inject failed', message: String(error) });
  }
});

/**
 * GET /api/identity/lock/:lockId
 * Retrieve identity lock details
 */
router.get('/lock/:lockId', async (req: Request, res: Response) => {
  try {
    const { lockId } = req.params;
    const identityLock = facialIdentityPreservationService.getIdentityLock(lockId);

    if (!identityLock) {
      return res.status(404).json({ error: 'Identity lock not found', lockId });
    }

    res.json({
      status: 'ok',
      identityLock,
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[FacialIdentity] Lock retrieval failed', error);
    res.status(500).json({ error: 'Lock retrieval failed' });
  }
});

/**
 * GET /api/identity/health
 * Facial identity preservation service health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'facial-identity-preservation',
      purpose: 'Ensures generated content preserves REAL facial features from uploaded photos, not invented/idealized faces',
      landmarksTracked: [
        'faceShape', 'eyeShape', 'eyeColor', 'eyeSpacing', 'eyebrowShape',
        'noseShape', 'lipShape', 'jawline', 'cheekbones', 'skinTone',
        'skinTexture', 'distinguishingMarks', 'facialHair', 'hairColor',
        'hairTexture', 'hairLength', 'estimatedAge', 'estimatedGender',
      ],
      criticalRules: [
        'Same person recognizable across all frames/angles/lighting',
        'No symmetrizing, smoothing, or beautifying beyond source',
        'No ethnicity/age/gender swaps',
        'Expression may change, bone structure must not',
        'Default to source photo when uncertain, never invent',
      ],
      endpoints: {
        lock: 'POST /api/identity/lock',
        inject: 'POST /api/identity/inject',
        validate: 'POST /api/identity/validate',
        lockAndInject: 'POST /api/identity/lock-and-inject',
        getLock: 'GET /api/identity/lock/:lockId',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[FacialIdentity] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
