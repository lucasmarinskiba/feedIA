/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { construirReporte } from '../capabilities/executive/reporteEjecutivo.js';
import { esPeriodoReporte } from '../capabilities/executive/reporteMetricas.js';

const buildReportesRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  return [
    {
      method: 'GET',
      pattern: '/api/executive/report',
      handler: async ({ res, query }) => {
        const periodo = query['periodo'] ?? 'month';
        if (!esPeriodoReporte(periodo)) {
          json(res, 400, { error: 'periodo inválido (week|month|quarter|halfYear|year)' });
          return;
        }
        json(res, 200, await construirReporte(brandId, brand.name, periodo));
      },
    },
  ];
};

const createReportesRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildReportesRoutes(brand));

export default createReportesRoutes;
