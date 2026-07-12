import { Router, Request, Response } from 'express';
import {
  carouselEditingService,
  CarouselSlide,
  CarouselEditOperation,
} from '../services/carousel-editing-service';

const router = Router();

router.post('/carousel/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, operations } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      operations: CarouselEditOperation[];
    };

    if (!carouselId || !slides || !Array.isArray(slides)) {
      res.status(400).json({
        error: 'Missing required fields: carouselId, slides (array)',
      });
      return;
    }

    let updated = slides;
    if (operations && Array.isArray(operations)) {
      updated = await carouselEditingService.processOperations(slides, operations);
    }

    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({
      ok: true,
      carouselId,
      slideCount: updated.length,
      operationsApplied: operations?.length ?? 0,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Carousel edit failed: ${error}` });
  }
});

router.post('/carousel/reorder', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, newOrder } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      newOrder: number[];
    };

    if (!carouselId || !slides || !newOrder) {
      res
        .status(400)
        .json({ error: 'Missing fields: carouselId, slides, newOrder' });
      return;
    }

    const updated = await carouselEditingService.reorderSlides(slides, newOrder);
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({ ok: true, carouselId, reordered: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Reorder failed: ${error}` });
  }
});

router.post('/carousel/update-text', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, slideId, text, textColor } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      slideId: string;
      text: string;
      textColor?: string;
    };

    if (!carouselId || !slides || !slideId || !text) {
      res.status(400).json({
        error: 'Missing fields: carouselId, slides, slideId, text',
      });
      return;
    }

    const updated = await carouselEditingService.updateSlideText(slides, slideId, {
      text,
      textColor,
    });
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({ ok: true, carouselId, slideId, updated: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Text update failed: ${error}` });
  }
});

router.post('/carousel/update-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, slideId, imageUrl } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      slideId: string;
      imageUrl: string;
    };

    if (!carouselId || !slides || !slideId || !imageUrl) {
      res.status(400).json({
        error: 'Missing fields: carouselId, slides, slideId, imageUrl',
      });
      return;
    }

    const updated = await carouselEditingService.updateSlideImage(slides, slideId, {
      imageUrl,
    });
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({ ok: true, carouselId, slideId, updated: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Image update failed: ${error}` });
  }
});

router.post('/carousel/delete-slide', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, slideId } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      slideId: string;
    };

    if (!carouselId || !slides || !slideId) {
      res
        .status(400)
        .json({ error: 'Missing fields: carouselId, slides, slideId' });
      return;
    }

    const updated = await carouselEditingService.deleteSlide(slides, slideId);
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({ ok: true, carouselId, deleted: true, slideCount: updated.length });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Slide delete failed: ${error}` });
  }
});

router.post('/carousel/add-slide', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, imageUrl, text, position } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      imageUrl: string;
      text?: string;
      position: number;
    };

    if (!carouselId || !slides || !imageUrl || typeof position !== 'number') {
      res.status(400).json({
        error: 'Missing fields: carouselId, slides, imageUrl, position',
      });
      return;
    }

    const updated = await carouselEditingService.addSlide(slides, {
      imageUrl,
      text,
      position,
    });
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({
      ok: true,
      carouselId,
      added: true,
      slideCount: updated.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Slide add failed: ${error}` });
  }
});

router.post('/carousel/update-style', async (req: Request, res: Response): Promise<void> => {
  try {
    const { carouselId, slides, slideId, backgroundColor, textColor } = req.body as {
      carouselId: string;
      slides: CarouselSlide[];
      slideId: string;
      backgroundColor?: string;
      textColor?: string;
    };

    if (!carouselId || !slides || !slideId) {
      res.status(400).json({
        error: 'Missing fields: carouselId, slides, slideId',
      });
      return;
    }

    const updated = await carouselEditingService.updateSlideStyle(slides, slideId, {
      backgroundColor,
      textColor,
    });
    await carouselEditingService.saveCarousel(carouselId, updated);

    res.json({ ok: true, carouselId, slideId, styled: true });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Style update failed: ${error}` });
  }
});

router.get('/carousel/:carouselId', async (req: Request, res: Response): Promise<void> => {
  try {
    const carouselId = typeof req.params.carouselId === 'string' ? req.params.carouselId : '';

    if (!carouselId) {
      res.status(400).json({ error: 'Missing carouselId' });
      return;
    }

    const slides = await carouselEditingService.loadCarousel(carouselId);

    res.json({ ok: true, carouselId, slides });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Load failed: ${error}` });
  }
});

export default router;
