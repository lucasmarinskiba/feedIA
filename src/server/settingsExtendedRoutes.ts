import type { BrandProfile } from '../config/types.js';
import { buildExtendedRoutes } from './extendedRoutes.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * /api/settings/connections|connect|disconnect from extendedRoutes.ts.
 * Never mounted on Express — note this is a narrower slice than
 * settings.js's full needs (apikeys, higgsfield/*, provider-mode,
 * automations, schedule, notifications live in a different, still-unmounted
 * file and are out of scope here).
 */
const createSettingsExtendedRoutes = (brand: BrandProfile) =>
  adaptRoutesToExpress(buildExtendedRoutes(brand).filter((r) => r.pattern.startsWith('/api/settings/')));

export default createSettingsExtendedRoutes;
