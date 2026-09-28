import { Router, type Request, type Response, type NextFunction } from 'express';
import { buildExtendedRoutes } from './extendedRoutes.js';
import type { BrandProfile } from '../config/types.js';
import type { RouteContext } from './http.js';

/**
 * Adapta las rutas /api/cm/* (definidas en extendedRoutes.ts para el server
 * plano de http.ts) a Express, igual que createStudioRoutes en studioRoutes.ts.
 * No usa createRequestHandler: ese dispatcher hace su propio req.on('data'/'end')
 * sobre el stream crudo, pero para cuando llega acá Express ya consumió el
 * stream con express.json() — 'end' nunca vuelve a disparar y la promesa
 * de readBody() cuelga para siempre en cualquier POST con body JSON.
 */
const createCmRoutes = (brand: BrandProfile) => {
  const router = Router();
  const routes = buildExtendedRoutes(brand).filter((r) => r.pattern.startsWith('/api/cm/'));

  routes.forEach((route) => {
    const method = route.method.toLowerCase();

    const adapter = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ctx: RouteContext = {
          req,
          res,
          params: req.params as Record<string, string>,
          query: req.query as Record<string, string>,
          body: req.body,
          rawBody: (req as Request & { rawBody?: Buffer }).rawBody || Buffer.alloc(0),
        };
        await route.handler(ctx);
      } catch (err) {
        next(err);
      }
    };

    if (method === 'get') {
      router.get(route.pattern, adapter);
    } else if (method === 'post') {
      router.post(route.pattern, adapter);
    } else if (method === 'put') {
      router.put(route.pattern, adapter);
    } else if (method === 'delete') {
      router.delete(route.pattern, adapter);
    } else if (method === 'patch') {
      router.patch(route.pattern, adapter);
    }
  });

  return router;
};

export default createCmRoutes;
