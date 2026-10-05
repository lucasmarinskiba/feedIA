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
  listReports as listTTReports,
  proponerDesdeReporteTT,
  runTTAutopilot,
} from '../capabilities/executive/tiktokAutopilot.js';
import { observacionRealTikTok } from '../capabilities/executive/ttObservacion.js';

import { registrarEvento } from '../capabilities/executive/bitacoraEjecutivo.js';
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
        await registrarEvento(brandId, {
          categoria: 'autopilot',
          titulo: 'Autopilot de Instagram ejecutado',
          detalle: `${reporte.signals.length} señal(es) detectadas.`,
          actor: 'sistema',
          resultado: null,
        });
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
      handler: async ({ res }) => {
        const observacion = await observacionRealTikTok(brandId);
        const reporte = await runTTAutopilot(observacion);
        const propuestas = await proponerDesdeReporteTT(brandId, reporte);
        await registrarEvento(brandId, {
          categoria: 'autopilot',
          titulo: 'Autopilot de TikTok ejecutado',
          detalle: `${reporte.signals.length} señal(es) detectadas.`,
          actor: 'sistema',
          resultado: null,
        });
        json(res, 200, { ...reporte, propuestasEncoladas: propuestas });
      },
    },
    {
      method: 'GET',
      pattern: '/api/autopilot/tiktok/latest',
      handler: async ({ res }) => {
        const reporte = await getTTLatestReport(brandId);
        if (!reporte) {
          json(res, 404, { error: 'Todavía no hay reportes de TikTok: generá el primero.' });
          return;
        }
        json(res, 200, reporte);
      },
    },
    {
      method: 'GET',
      pattern: '/api/autopilot/tiktok/history',
      handler: async ({ res }) => {
        json(res, 200, await listTTReports(brandId, 10));
      },
    },
  ];
};

const createAutopilotRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildAutopilotRoutes(brand));

export default createAutopilotRoutes;
