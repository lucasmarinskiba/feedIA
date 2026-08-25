import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { carouselCreationPipeline } from '../services/carousel-creation-pipeline.js';
import { CarouselCreateRequest, Carousel } from '../db/carousel-schema.js';
import { quotaCheckMiddleware, chargeQuota } from '../middleware/quota-enforcer.js';
import { log } from '../agent/logger.js';

const router = Router();

// POST /api/carousels/create - Create with validation gate + quota enforcement
router.post('/create', quotaCheckMiddleware('carousels', 1), async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const generationId = uuidv4();

    const request = req.body as CarouselCreateRequest;
    const rejectOnCritical = req.query.rejectOnCritical !== 'false';
    const validateBefore = req.query.validateBefore !== 'false';
    const trackCreation = req.query.trackCreation !== 'false';

    const result = await carouselCreationPipeline.createWithValidation(request, {
      validateBefore,
      rejectOnCritical,
      trackCreation,
    });

    const statusCode = result.success ? 201 : result.validation?.isValid === false ? 400 : 500;

    // Charge quota ONLY on success
    if (result.success) {
      const charged = await chargeQuota(req, 'carousels', generationId);
      if (!charged) {
        log.warn('[Carousel] Quota charge failed', { userId, generationId });
      }
    }

    return res.status(statusCode).json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Creation failed: ${error}`, timestamp: new Date().toISOString() });
  }
});

// POST /api/carousels/batch-create - Create multiple carousels with validation + per-carousel quota
router.post('/batch-create', quotaCheckMiddleware('carousels', 1), async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    const requests = req.body as CarouselCreateRequest[];
    const rejectOnCritical = req.query.rejectOnCritical !== 'false';
    const validateBefore = req.query.validateBefore !== 'false';
    const trackCreation = req.query.trackCreation !== 'false';
    const continueOnError = req.query.continueOnError === 'true';

    if (!Array.isArray(requests)) {
      return res.status(400).json({ error: 'Expected array of carousel creation requests' });
    }

    // Check total quota (not individual)
    const { checkFormatQuota } = await import('../middleware/quota-enforcer.js');
    const quotaCheck = await checkFormatQuota(userId, 'carousels', requests.length);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: `Cannot create ${requests.length} carousels, quota only allows ${quotaCheck.limit - quotaCheck.used}`,
        requested: requests.length,
        used: quotaCheck.used,
        limit: quotaCheck.limit,
      });
    }

    const result = await carouselCreationPipeline.createBatch(requests, {
      validateBefore,
      rejectOnCritical,
      trackCreation,
      continueOnError,
    });

    // Charge quota for each successful carousel
    if (result.succeeded > 0) {
      for (let i = 0; i < result.succeeded; i++) {
        await chargeQuota(req, 'carousels', `batch-${uuidv4()}`);
      }
    }

    const statusCode = result.failed === 0 ? 201 : result.succeeded === 0 ? 400 : 207;
    return res.status(statusCode).json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({
      total: 0,
      succeeded: 0,
      failed: 0,
      results: [],
      error: `Batch creation failed: ${error}`,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/carousels/import - Import carousel with validation
router.post('/import', async (req: Request, res: Response) => {
  try {
    const carousel = req.body as Carousel;
    const rejectOnCritical = req.query.rejectOnCritical !== 'false';
    const validateBefore = req.query.validateBefore !== 'false';
    const skipPersistence = req.query.skipPersistence === 'true';

    const result = await carouselCreationPipeline.importWithValidation(carousel, {
      validateBefore,
      rejectOnCritical,
      skipPersistence,
    });

    const statusCode = result.success ? 201 : 400;
    return res.status(statusCode).json(result);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ success: false, error: `Import failed: ${error}`, timestamp: new Date().toISOString() });
  }
});

export default router;
