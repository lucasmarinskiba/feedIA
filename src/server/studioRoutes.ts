import { Router, type Request, type Response, type NextFunction } from 'express';
import { buildStudioRoutes } from './studioApi.js';
import type { BrandProfile } from '../config/types.js';
import type { RouteContext } from './http.js';

const createStudioRoutes = (brand: BrandProfile) => {
  const router = Router();
  const routes = buildStudioRoutes(brand);

  routes.forEach((route) => {
    const method = (route.method || 'GET').toLowerCase();
    const pattern = route.pattern.replace(/^\/api\/studio/, ''); // Remove /api/studio prefix since router is mounted at /api/studio

    const adapter = async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ctx: RouteContext = {
          req, // Express's Request extends http.IncomingMessage structurally
          res, // Express's Response extends http.ServerResponse structurally
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
      router.get(pattern, adapter);
    } else if (method === 'post') {
      router.post(pattern, adapter);
    } else if (method === 'put') {
      router.put(pattern, adapter);
    } else if (method === 'delete') {
      router.delete(pattern, adapter);
    } else if (method === 'patch') {
      router.patch(pattern, adapter);
    }
  });

  return router;
};

export default createStudioRoutes;
