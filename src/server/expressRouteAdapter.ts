import { Router, type Request, type Response, type NextFunction } from 'express';
import type { RouteDefinition, RouteContext } from './http.js';

/**
 * Adapts RouteDefinition[] (written for the plain http.js dev server in
 * http.ts / extendedRoutes.ts) to an Express Router, same shape as
 * createStudioRoutes in studioRoutes.ts. Reuses req.body already parsed by
 * express.json() instead of re-reading the raw stream (createRequestHandler's
 * readBody() does that, and hangs forever on POST once Express has already
 * drained the stream upstream).
 */
export const adaptRoutesToExpress = (routes: RouteDefinition[]): Router => {
  const router = Router();

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
