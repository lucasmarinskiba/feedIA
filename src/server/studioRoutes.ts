import { Router, type Request, type Response } from 'express';
import { buildStudioRoutes } from './studioApi.js';
import type { BrandProfile } from '../config/types.js';
import type { RouteContext } from './http.js';

const createStudioRoutes = (brand: BrandProfile) => {
  const router = Router();
  const routes = buildStudioRoutes(brand);

  routes.forEach(route => {
    const method = (route.method || 'GET').toLowerCase();
    const pattern = route.pattern.replace(/^\/api\/studio/, ''); // Remove /api/studio prefix since router is mounted at /api/studio

    const adapter = async (req: Request, res: Response, next: any) => {
      try {
        const ctx: RouteContext = {
          req: req as any, // Express Request acts like IncomingMessage for our purposes
          res: res as any, // Express Response acts like ServerResponse for our purposes
          params: req.params as Record<string, string>,
          query: req.query as Record<string, string>,
          body: req.body,
          rawBody: (req as any).rawBody || Buffer.alloc(0),
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
