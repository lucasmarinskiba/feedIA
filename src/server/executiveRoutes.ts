import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * Executive dashboard routes from extendedRoutes.ts (command center,
 * decisions, digest, OKRs). Never mounted on Express; imperio.js depends on
 * command-center, decisions/pending, decisions/resolve, and okr/active.
 */
const createExecutiveRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(buildExtendedRoutes(brand).filter((r) => r.pattern.startsWith('/api/executive')));

export default createExecutiveRoutes;
