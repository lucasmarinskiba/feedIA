import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * "CONSUMPTION" routes from extendedRoutes.ts — cost attribution, quality
 * gate, plan recommendation, smart onboarding guide. Never mounted on
 * Express; settings.js depends on cost/dashboard, quality/dashboard,
 * plan/recommend, and onboarding/next|step.
 */
const createConsumptionRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(buildExtendedRoutes(brand).filter((r) => r.pattern.startsWith('/api/consumption')));

export default createConsumptionRoutes;
