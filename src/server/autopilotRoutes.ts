/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import {
  getLatestReport as getIGLatestReport,
  listReports as listIGReports,
  proponerDesdeReporte,
  runIGAutopilot,
} from '../capabilities/executive/instagramAutopilot.js';
import { observacionRealInstagram } from '../capabilities/executive/instagramObservacion.js';
import {
  getLatestReport as getTTLatestReport,
  runTTAutopilot,
  type TTObservation,
} from '../capabilities/executive/tiktokAutopilot.js';

const buildAutopilotRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  return [
    {
      method: 'POST',
      pattern: '/api/autopilot/instagram/run',
      handler: async ({ res }) => {
        const observacion = await observacionRealInstagram(brandId);
        const reporte = await runIGAutopilot(observacion);
        const propuestas = await proponerDesdeReporte(brandId, reporte);
        json(res, 200, { ...reporte, propuestasEncoladas: propuestas });
      },
    },
    {
      method: 'GET',
      pattern: '/api/autopilot/instagram/latest',
      handler: async ({ res }) => {
        const reporte = await getIGLatestReport(brandId);
        if (!reporte) {
          json(res, 404, { error: 'Todavía no hay reportes: generá el primero.' });
          return;
        }
        json(res, 200, reporte);
      },
    },
    {
      method: 'GET',
      pattern: '/api/autopilot/instagram/history',
      handler: async ({ res }) => {
        json(res, 200, await listIGReports(brandId, 10));
      },
    },
    {
      method: 'POST',
      pattern: '/api/autopilot/tiktok/run',
      handler: async ({ res, body }) => {
        const obs = (body ?? {}) as Omit<TTObservation, 'brandId' | 'timestamp'>;
        json(res, 200, await runTTAutopilot({ brandId, timestamp: new Date().toISOString(), ...obs }));
      },
    },
    {
      method: 'GET',
      pattern: '/api/autopilot/tiktok/latest',
      handler: async ({ res }) => {
        const reporte = await getTTLatestReport(brandId);
        if (!reporte) {
          json(res, 404, { error: 'Todavía no hay reportes de TikTok.' });
          return;
        }
        json(res, 200, reporte);
      },
    },
  ];
};

const createAutopilotRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAutopilotRoutes(brand));

export default createAutopilotRoutes;
