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
 * POST /api/comment-brain/review/:id/approve  — aprobar (y ENCOLAR el envío) un borrador
 * GET  /api/comment-brain/outbox              — cola de envío (?view=pending|failed|history|all)
 * POST /api/comment-brain/outbox/:id/retry|cancel
 *
 * Aprobar no envía directo: encola en el outbox, que respeta el ritmo de compliance
 * (ver capabilities/replyOutbox).
 */

import express, { NextFunction, Request, Response } from 'express';
import {
  brainApprove,
  brainDecisions,
  brainReject,
  brainResolve,
  brainReview,
  brainStatus,
  checkAdminAccess,
  outboxCancel,
  outboxList,
  outboxRetry,
  type CoreResponse,
} from './controlCore.js';

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
router.get('/decisions', (req: Request, res: Response): void => send(res, brainDecisions(req.query)));
router.post('/review/:id/approve', (req: Request, res: Response): void => {
  void brainApprove(String(req.params['id'] ?? ''), req.body).then((r) => send(res, r));
});
router.post('/review/:id/reject', (req: Request, res: Response): void =>
  send(res, brainReject(String(req.params['id'] ?? ''), req.body)),
);
router.post('/review/:id/resolve', (req: Request, res: Response): void =>
  send(res, brainResolve(String(req.params['id'] ?? ''))),
);
router.get('/outbox', (req: Request, res: Response): void => send(res, outboxList(req.query)));
router.post('/outbox/:id/retry', (req: Request, res: Response): void => {
  void outboxRetry(String(req.params['id'] ?? '')).then((r) => send(res, r));
});
router.post('/outbox/:id/cancel', (req: Request, res: Response): void =>
  send(res, outboxCancel(String(req.params['id'] ?? ''))),
);

export default router;
