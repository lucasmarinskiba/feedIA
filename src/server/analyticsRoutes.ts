/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { construirAnalytics } from '../capabilities/experience/analyticsResumen.js';

const buildAnalyticsRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/analytics',
    handler: async ({ req, res }) => {
      json(res, 200, await construirAnalytics(await marcaDeCuentas(req, brand)));
    },
  },
];

const createAnalyticsRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAnalyticsRoutes(brand));

export default createAnalyticsRoutes;
