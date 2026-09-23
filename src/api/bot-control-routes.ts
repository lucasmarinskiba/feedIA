/**
 * Bot Control Routes (Express) — panel de bots, por cuenta y por plan.
 *
 * Montadas en server.ts SIN adminKeyAuth: el gate ya no es una clave de admin,
 * es el plan de la cuenta (ver controlCore.ts's resolveCaller). Una FEEDIA_ADMIN_KEY
 * válida sigue funcionando como bypass total (dueño de la instancia).
 *
 * GET  /api/bots                — estado de todos los bots (siempre los 8) + botón maestro, para la cuenta que llama
 * POST /api/bots/master         — { enabled } apaga/enciende en bloque los que el plan permite
 * POST /api/bots/:id/state      — { enabled } prende/apaga un bot (prender por encima del plan → 403)
 */

import express, { Request, Response } from 'express';
import { listBots, setBot, setMaster, type CoreResponse } from './controlCore.js';

const router = express.Router();

const send = (res: Response, r: CoreResponse): void => {
  res.status(r.status).json(r.body);
};

router.get('/', (req: Request, res: Response): void => {
  void listBots(req.headers).then((r) => send(res, r));
});
router.post('/master', (req: Request, res: Response): void => {
  void setMaster(req.headers, req.body).then((r) => send(res, r));
});
router.post('/:id/state', (req: Request, res: Response): void => {
  void setBot(String(req.params['id'] ?? ''), req.headers, req.body).then((r) => send(res, r));
});

export default router;
