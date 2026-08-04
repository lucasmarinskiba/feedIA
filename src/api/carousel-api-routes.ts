import { Router, Request, Response } from 'express';
import { carouselStorageService } from '../services/carousel-storage-service.js';
import { Carousel, CarouselCreateRequest, CarouselUpdateRequest } from '../db/carousel-schema.js';

const router = Router();

// POST /api/carousels - Create carousel
router.post(
  '/',
  async (req: Request<Record<string, never>, Carousel | { error: string }, CarouselCreateRequest>, res: Response<Carousel | { error: string }>): Promise<void> => {
    try {
      const { userId, title, format, slides, platform, sourceCategory } = req.body;

      if (!userId || !title || !format || !slides || !platform) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      const carousel = await carouselStorageService.create({ userId, title, format, slides, platform, sourceCategory });
      res.status(201).json(carousel);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to create carousel: ${error}` });
    }
  },
);

// GET /api/carousels/:carouselId - Get carousel by ID
router.get(
  '/:carouselId',
  async (req: Request<{ carouselId: string }>, res: Response<Carousel | { error: string }>): Promise<void> => {
    try {
      const carousel = await carouselStorageService.getById(req.params.carouselId);

      if (!carousel) {
        res.status(404).json({ error: 'Carousel not found' });
        return;
      }

      res.json(carousel);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to fetch carousel: ${error}` });
    }
  },
);

// GET /api/carousels/user/:userId - List user carousels
router.get(
  '/user/:userId',
  async (req: Request<{ userId: string }>, res: Response<Carousel[] | { error: string }>): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const carousels = await carouselStorageService.listByUser(req.params.userId, limit);
      res.json(carousels);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to list carousels: ${error}` });
    }
  },
);

// PUT /api/carousels/:carouselId - Update carousel
router.put(
  '/:carouselId',
  async (req: Request<{ carouselId: string }, Carousel | { error: string }, CarouselUpdateRequest>, res: Response<Carousel | { error: string }>): Promise<void> => {
    try {
      const updated = await carouselStorageService.update(req.params.carouselId, req.body);

      if (!updated) {
        res.status(404).json({ error: 'Carousel not found' });
        return;
      }

      res.json(updated);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to update carousel: ${error}` });
    }
  },
);

// DELETE /api/carousels/:carouselId - Delete carousel
router.delete(
  '/:carouselId',
  async (req: Request<{ carouselId: string }>, res: Response<{ success: boolean } | { error: string }>): Promise<void> => {
    try {
      const deleted = await carouselStorageService.delete(req.params.carouselId);

      if (!deleted) {
        res.status(404).json({ error: 'Carousel not found' });
        return;
      }

      res.json({ success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to delete carousel: ${error}` });
    }
  },
);

// POST /api/carousels/:carouselId/publish - Publish carousel
router.post(
  '/:carouselId/publish',
  async (req: Request<{ carouselId: string }, Carousel | { error: string }, { platform: string }>, res: Response<Carousel | { error: string }>): Promise<void> => {
    try {
      const published = await carouselStorageService.publish(req.params.carouselId, req.body.platform as any);

      if (!published) {
        res.status(404).json({ error: 'Carousel not found' });
        return;
      }

      res.json(published);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to publish carousel: ${error}` });
    }
  },
);

// POST /api/carousels/:carouselId/metrics - Update metrics
router.post(
  '/:carouselId/metrics',
  async (req: Request<{ carouselId: string }, { success: boolean } | { error: string }, Record<string, number>>, res: Response<{ success: boolean } | { error: string }>): Promise<void> => {
    try {
      await carouselStorageService.updateMetrics(req.params.carouselId, req.body);
      res.json({ success: true });
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      res.status(500).json({ error: `Failed to update metrics: ${error}` });
    }
  },
);

export default router;
