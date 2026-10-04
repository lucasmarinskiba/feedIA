/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { construirAnalytics } from '../capabilities/experience/analyticsResumen.js';

const buildAnalyticsRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  return [
    {
      method: 'GET',
      pattern: '/api/executive/analytics',
      handler: async ({ res }) => {
        json(res, 200, await construirAnalytics(brandId));
      },
    },
  ];
};

const createAnalyticsRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAnalyticsRoutes(brand));

export default createAnalyticsRoutes;
