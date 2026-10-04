/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { construirReporte } from '../capabilities/executive/reporteEjecutivo.js';
import { esPeriodoReporte } from '../capabilities/executive/reporteMetricas.js';

const buildReportesRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/report',
    handler: async ({ req, res, query }) => {
      const periodo = query['periodo'] ?? 'month';
      if (!esPeriodoReporte(periodo)) {
        json(res, 400, { error: 'periodo inválido (week|month|quarter|halfYear|year)' });
        return;
      }
      json(
        res,
        200,
        await construirReporte({
          marcaPlataforma: { id: resolveDefaultBrandId(brand) ?? 'default', nombre: brand.name },
          marcaCuentas: await marcaDeCuentas(req, brand),
          periodo,
        }),
      );
    },
  },
];

const createReportesRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildReportesRoutes(brand));

export default createReportesRoutes;
