/**
 * Instagram Bot Routes (Express) — configuración de Ice Breakers (AUTO-003).
 *
 * Montadas detrás de adminKeyAuth: igual que comment-brain/tiktok-routes,
 * exponen configuración que llega a usuarios reales de Instagram, así que en
 * producción fallan cerrado sin FEEDIA_ADMIN_KEY. También respetan el
 * interruptor de instagram-bot (panel de Bots).
 *
 * GET  /api/instagram/ice-breakers/:accountId       — menú configurado
 * PUT  /api/instagram/ice-breakers/:accountId       — { iceBreakers: [{question,payload}] }
 * POST /api/instagram/ice-breakers/:accountId/sync  — sincroniza con la Graph API de Meta
 */

import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { checkAdminAccess } from './controlCore.js';
import { isBotEnabled } from '../capabilities/botControl/state.js';
import { getIceBreakers, setIceBreakers, syncIceBreakersToMeta } from '../capabilities/instagram/iceBreakers.js';

const router = express.Router();

router.use((req: Request, res: Response, next: NextFunction): void => {
  const denied = checkAdminAccess(req.headers);
  if (denied) {
    res.status(denied.status).json(denied.body);
    return;
  }
  next();
});

const requireInstagramBotOn = (req: Request, res: Response, next: NextFunction): void => {
  if (!isBotEnabled('instagram-bot')) {
    res
      .status(409)
      .json({ error: 'instagram-bot-disabled', message: 'El bot de Instagram está apagado en el panel de Bots.' });
    return;
  }
  next();
};

router.get('/ice-breakers/:accountId', requireInstagramBotOn, (req: Request, res: Response): void => {
  const accountId = String(req.params['accountId'] ?? '');
  res.status(200).json({ accountId, iceBreakers: getIceBreakers(accountId) });
});

const SetIceBreakersSchema = z.object({
  iceBreakers: z
    .array(z.object({ question: z.string().min(1), payload: z.string().min(1) }))
    .min(1)
    .max(4),
});

router.put('/ice-breakers/:accountId', requireInstagramBotOn, (req: Request, res: Response): void => {
  const parsed = SetIceBreakersSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid-body', issues: parsed.error.issues });
    return;
  }
  const result = setIceBreakers(String(req.params['accountId'] ?? ''), parsed.data.iceBreakers);
  res.status(result.ok ? 200 : 422).json(result);
});

router.post('/ice-breakers/:accountId/sync', requireInstagramBotOn, (req: Request, res: Response): void => {
  void syncIceBreakersToMeta(String(req.params['accountId'] ?? ''))
    .then((result) => res.status(result.ok ? 200 : 502).json(result))
    .catch((err: Error) => res.status(500).json({ error: 'ice-breakers-sync-failed', message: err.message }));
});

export default router;
