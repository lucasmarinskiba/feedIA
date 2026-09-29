import { Router, type Request, type Response, type NextFunction } from 'express';
import { buildExtendedRoutes } from './extendedRoutes.js';
import type { BrandProfile } from '../config/types.js';
import type { RouteContext } from './http.js';

/**
 * Adapta las rutas /api/achievements* y /api/stream/achievements (definidas en
 * extendedRoutes.ts para el server plano de http.ts) a Express, mismo patrón
 * que createCmRoutes: esas rutas nunca estuvieron montadas en esta app Express,
 * así que caían al catch-all SPA y devolvían index.html en vez de JSON —
 * exactamente el "Sin conexión al backend" que ve /#achievements en prod.
 */
const createAchievementsRoutes = (brand: BrandProfile) => {
  const router = Router();
  const routes = buildExtendedRoutes(brand).filter(
    (r) => r.pattern.startsWith('/api/achievements') || r.pattern === '/api/stream/achievements',
  );

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

export default createAchievementsRoutes;
