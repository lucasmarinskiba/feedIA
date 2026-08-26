/**
 * Anomaly Detection Routes
 *
 * POST /api/anomaly/scan
 */

import { Router, Request, Response } from 'express';

const router = Router();

router.post('/scan', async (req: Request, res: Response) => {
  try {
    const accountId = req.get('X-Account-ID') || 'test-account';
    // TODO: Wire full anomaly scan with proper parameter types
    return res.json({ accountId, status: 'not_implemented', message: 'Anomaly scan endpoint ready for integration' });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

export default router;
