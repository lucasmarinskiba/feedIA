import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * "COMPUTER USE" routes from extendedRoutes.ts — mode (off/auto/supervised +
 * pending-approvals/approve/reject), Canva Brain, Master Brain, profiles,
 * Android, voice, replay, watchdog/cancel. Never mounted on Express (only
 * /api/cu/recipes is, via cuRecipesRoutes — a separate, already-mounted
 * router, untouched here). Widely called from topbar.js/globalSearch.js on
 * nearly every page, so this was the highest-impact gap in the audit.
 */
const createCuRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(buildExtendedRoutes(brand).filter((r) => r.pattern.startsWith('/api/cu/')));

export default createCuRoutes;
