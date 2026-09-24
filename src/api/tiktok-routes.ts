/**
 * TikTok Business Routes (Express) — mensajería de Cuenta de Empresa + moderación de LIVE.
 *
 * Montadas detrás de adminKeyAuth: igual que comment-brain, exponen contenido
 * de terceros (mensajes/comentarios de usuarios de TikTok), así que en
 * producción fallan cerrado sin FEEDIA_ADMIN_KEY. También respetan el
 * interruptor de tiktok-bot (panel de Bots) — si está apagado, no generan
 * ni evalúan respuestas, para que apagar el bot corte el gasto de verdad.
 *
 * POST /api/tiktok/business/respond — { senderId, senderUsername?, text, catalogUrl?, bookingUrl? }
 * POST /api/tiktok/live/moderate    — { comments: [{ id, authorUsername, text }] }
 */

import express, { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { checkAdminAccess } from './controlCore.js';
import { isBotEnabled } from '../capabilities/botControl/state.js';
import { respondToBusinessMessage } from '../capabilities/tiktok/businessMessaging.js';
import { batchModerate, type LiveComment } from '../capabilities/tiktok/liveModeration.js';
import { loadBrandProfile } from '../config/index.js';

const router = express.Router();

router.use((req: Request, res: Response, next: NextFunction): void => {
  const denied = checkAdminAccess(req.headers);
  if (denied) {
    res.status(denied.status).json(denied.body);
    return;
  }
  next();
});

const requireTikTokBotOn = (req: Request, res: Response, next: NextFunction): void => {
  if (!isBotEnabled('tiktok-bot')) {
    res
      .status(409)
      .json({ error: 'tiktok-bot-disabled', message: 'El bot de TikTok está apagado en el panel de Bots.' });
    return;
  }
  next();
};

const RespondSchema = z.object({
  senderId: z.string().min(1),
  senderUsername: z.string().optional(),
  text: z.string().min(1),
  catalogUrl: z.string().url().optional(),
  bookingUrl: z.string().url().optional(),
});

router.post('/business/respond', requireTikTokBotOn, (req: Request, res: Response): void => {
  const parsed = RespondSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid-body', issues: parsed.error.issues });
    return;
  }
  const { senderId, senderUsername, text, catalogUrl, bookingUrl } = parsed.data;
  void respondToBusinessMessage({ senderId, senderUsername, text }, loadBrandProfile(), { catalogUrl, bookingUrl })
    .then((result) => res.status(result.sent ? 200 : 403).json(result))
    .catch((err: Error) => res.status(500).json({ error: 'business-respond-failed', message: err.message }));
});

const ModerateSchema = z.object({
  comments: z
    .array(z.object({ id: z.string().min(1), authorUsername: z.string(), text: z.string() }))
    .min(1)
    .max(200),
});

router.post('/live/moderate', requireTikTokBotOn, (req: Request, res: Response): void => {
  const parsed = ModerateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid-body', issues: parsed.error.issues });
    return;
  }
  const result = batchModerate(parsed.data.comments as LiveComment[]);
  res.status(result.blocked ? 429 : 200).json(result);
});

export default router;
