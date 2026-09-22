/**
 * Comment Brain Routes (Express) — cola de revisión y estado del modo.
 *
 * Montadas en server.ts detrás de adminKeyAuth: exponen comentarios de terceros
 * y borradores de respuesta de la marca. La lógica vive en controlCore.ts y se
 * comparte con el daemon (src/server/controlRoutes.ts).
 *
 * GET  /api/comment-brain/status              — modo activo + cola + topes de gasto
 * GET  /api/comment-brain/review              — items pendientes (?action=draft-for-review|escalate|ignore &limit=50)
 * POST /api/comment-brain/review/:id/resolve  — marcar un item como atendido (lo saca de la cola)
 *
 * Solo lectura + resolver: NO envía respuestas. Enviar sigue siendo una decisión
 * con compliance y GlassBox, fuera de este router.
 */

import express, { NextFunction, Request, Response } from 'express';
import { brainResolve, brainReview, brainStatus, checkAdminAccess, type CoreResponse } from './controlCore.js';

const router = express.Router();

const send = (res: Response, r: CoreResponse): void => {
  res.status(r.status).json(r.body);
};

/**
 * `adminKeyAuth` deja pasar todo si FEEDIA_ADMIN_KEY no está configurada (modo dev).
 * Este router expone comentarios de terceros, así que en producción falla cerrado.
 */
router.use((req: Request, res: Response, next: NextFunction): void => {
  const denied = checkAdminAccess(req.headers);
  if (denied) {
    send(res, denied);
    return;
  }
  next();
});

router.get('/status', (_req: Request, res: Response): void => send(res, brainStatus()));
router.get('/review', (req: Request, res: Response): void => send(res, brainReview(req.query)));
router.post('/review/:id/resolve', (req: Request, res: Response): void =>
  send(res, brainResolve(String(req.params['id'] ?? ''))),
);

export default router;
