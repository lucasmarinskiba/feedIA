import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * Studio Manager toolbox routes from extendedRoutes.ts: A/B testing,
 * hashtags, DM engine, content queue, captions, comment orchestration,
 * trends, competitor adaptation. All consumed together from
 * studioManager.js / globalSearch.js. Never mounted on Express.
 *
 * /api/trends/detect and /api/trends/audio are already served by
 * registerTrendingRoutes (mounted earlier in server.ts) — Express matches
 * the first-registered handler per path+method, so those two stay on the
 * existing implementation; this only fills the remaining trends/* gaps
 * (latest, adapt, calendar, score).
 */
const STUDIO_TOOLS_PREFIXES = [
  '/api/ab-tests',
  '/api/hashtags',
  '/api/dm/',
  '/api/queue',
  '/api/caption',
  '/api/comments',
  '/api/trends',
  '/api/competitors',
];

const createStudioToolsRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(
    buildExtendedRoutes(brand).filter((r) => STUDIO_TOOLS_PREFIXES.some((prefix) => r.pattern.startsWith(prefix))),
  );

export default createStudioToolsRoutes;
