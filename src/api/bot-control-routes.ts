/**
 * Bot Control Routes (Express) — panel de bots (solo admin).
 *
 * Montadas en server.ts detrás de adminKeyAuth. La lógica vive en controlCore.ts
 * y se comparte con el daemon (src/server/controlRoutes.ts), que es donde
 * realmente corren los bots.
 *
 * GET  /api/bots                — estado de todos los bots + botón maestro
 * POST /api/bots/master         — { enabled } apaga/enciende todos en bloque
 * POST /api/bots/:id/state      — { enabled } prende/apaga un bot
 */

import express, { NextFunction, Request, Response } from 'express';
import { checkAdminAccess, listBots, setBot, setMaster, type CoreResponse } from './controlCore.js';

const router = express.Router();

const send = (res: Response, r: CoreResponse): void => {
  res.status(r.status).json(r.body);
};

router.use((req: Request, res: Response, next: NextFunction): void => {
  const denied = checkAdminAccess(req.headers);
  if (denied) {
    send(res, denied);
    return;
  }
  next();
});

router.get('/', (_req: Request, res: Response): void => {
  void listBots().then((r) => send(res, r));
});
router.post('/master', (req: Request, res: Response): void => {
  void setMaster(req.body).then((r) => send(res, r));
});
router.post('/:id/state', (req: Request, res: Response): void => {
  void setBot(String(req.params['id'] ?? ''), req.body).then((r) => send(res, r));
});

export default router;
