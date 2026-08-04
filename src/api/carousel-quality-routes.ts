import { Router, Request, Response } from 'express';
import { carouselQualityValidator } from '../services/carousel-quality-validator.js';
import { carouselStorageService } from '../services/carousel-storage-service.js';
import { Carousel } from '../db/carousel-schema.js';

const router = Router();

// POST /api/carousels/validate - Validate carousel content
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const carousel = req.body as Carousel;

    if (!carousel || !carousel.slides) {
      return res.status(400).json({ error: 'Invalid carousel structure' });
    }

    const report = await carouselQualityValidator.generateReport(carousel);
    return res.json(report);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Validation failed: ${error}` });
  }
});

// GET /api/carousels/:carouselId/quality - Get quality report for existing carousel
router.get('/:carouselId', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carouselId as string;
    if (!carouselId) {
      return res.status(400).json({ error: 'Carousel ID is required' });
    }

    const carousel = await carouselStorageService.getById(carouselId);

    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }

    const report = await carouselQualityValidator.generateReport(carousel);
    return res.json({ ...report, carouselId });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Quality check failed: ${error}` });
  }
});

// POST /api/carousels/:carouselId/quality/approve - Approve carousel quality
router.post('/:carouselId/approve', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carouselId as string;
    if (!carouselId) {
      return res.status(400).json({ error: 'Carousel ID is required' });
    }

    const carousel = await carouselStorageService.getById(carouselId);

    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }

    const report = await carouselQualityValidator.generateReport(carousel);

    if (!report.validation.isValid) {
      return res.status(400).json({
        error: 'Carousel has validation errors',
        report,
      });
    }

    return res.json({
      carouselId,
      approved: true,
      score: report.validation.score,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Approval check failed: ${error}` });
  }
});

// POST /api/carousels/batch-validate - Validate multiple carousels
router.post('/batch/validate', async (req: Request, res: Response) => {
  try {
    const carousels = req.body as Carousel[];

    if (!Array.isArray(carousels)) {
      return res.status(400).json({ error: 'Expected array of carousels' });
    }

    const reports = await Promise.all(
      carousels.map(carousel => carouselQualityValidator.generateReport(carousel)),
    );

    const stats = {
      total: reports.length,
      approved: reports.filter(r => r.recommendation === 'approve').length,
      review_needed: reports.filter(r => r.recommendation === 'review').length,
      rejected: reports.filter(r => r.recommendation === 'reject').length,
      avg_score: Math.round((reports.reduce((sum, r) => sum + r.validation.score, 0) / reports.length) * 10) / 10,
    };

    return res.json({ stats, reports });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Batch validation failed: ${error}` });
  }
});

export default router;
