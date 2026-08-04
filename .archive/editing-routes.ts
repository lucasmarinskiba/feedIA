import { Router, Request, Response } from 'express';
import { videoEditingService, VideoEditRequest } from '../services/video-editing-service';
import { photoEditingService, PhotoEditRequest } from '../services/photo-editing-service';

const router = Router();

router.post('/video/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, operations } = req.body as VideoEditRequest;

    if (!inputPath || !outputPath || !operations || operations.length === 0) {
      res.status(400).json({ error: 'Missing required fields: inputPath, outputPath, operations' });
      return;
    }

    await videoEditingService.processOperations({ inputPath, outputPath, operations });

    res.json({
      ok: true,
      outputPath,
      operationsApplied: operations.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Video editing failed: ${error}` });
  }
});

router.post('/video/trim', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, startSec, endSec } = req.body;

    if (!inputPath || !outputPath || typeof startSec !== 'number' || typeof endSec !== 'number') {
      res.status(400).json({ error: 'Missing fields: inputPath, outputPath, startSec, endSec' });
      return;
    }

    await videoEditingService.trim(inputPath, outputPath, { startSec, endSec });

    res.json({ ok: true, outputPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Video trim failed: ${error}` });
  }
});

router.post('/video/speed', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, factor } = req.body;

    if (!inputPath || !outputPath || typeof factor !== 'number') {
      res.status(400).json({ error: 'Missing fields: inputPath, outputPath, factor' });
      return;
    }

    await videoEditingService.speed(inputPath, outputPath, { factor });

    res.json({ ok: true, outputPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Video speed failed: ${error}` });
  }
});

router.post('/photo/edit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, operations } = req.body as PhotoEditRequest;

    if (!inputPath || !outputPath || !operations || operations.length === 0) {
      res.status(400).json({ error: 'Missing required fields: inputPath, outputPath, operations' });
      return;
    }

    await photoEditingService.processOperations({ inputPath, outputPath, operations });

    res.json({
      ok: true,
      outputPath,
      operationsApplied: operations.length,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Photo editing failed: ${error}` });
  }
});

router.post('/photo/filter', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, filterName } = req.body;

    if (!inputPath || !outputPath || !filterName) {
      res.status(400).json({ error: 'Missing fields: inputPath, outputPath, filterName' });
      return;
    }

    await photoEditingService.filter(inputPath, outputPath, { name: filterName });

    res.json({ ok: true, outputPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Photo filter failed: ${error}` });
  }
});

router.post('/photo/resize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { inputPath, outputPath, width, height, fit } = req.body;

    if (!inputPath || !outputPath || typeof width !== 'number' || typeof height !== 'number') {
      res.status(400).json({ error: 'Missing fields: inputPath, outputPath, width, height' });
      return;
    }

    await photoEditingService.resize(inputPath, outputPath, { width, height, fit });

    res.json({ ok: true, outputPath });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Photo resize failed: ${error}` });
  }
});

export default router;
