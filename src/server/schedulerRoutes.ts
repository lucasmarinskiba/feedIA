/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import {
  actualizarJob,
  ejecutarJobAhora,
  estadoScheduler,
  existeJob,
} from '../capabilities/executive/schedulerEjecutivo.js';
import { validarExpresionCron } from '../capabilities/executive/schedulerMetricas.js';

const buildSchedulerRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/scheduler',
    handler: async ({ res }) => {
      json(res, 200, { generadoEn: new Date().toISOString(), ...estadoScheduler() });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/executive/scheduler/jobs/:name',
    handler: async ({ res, params, body }) => {
      const nombre = params['name'] ?? '';
      if (!existeJob(nombre)) {
        json(res, 404, { error: 'job no encontrado' });
        return;
      }
      const datos = (body ?? {}) as Record<string, unknown>;
      const cambios: { habilitado?: boolean; cron?: string | null } = {};
      if (datos['habilitado'] !== undefined) {
        if (typeof datos['habilitado'] !== 'boolean') {
          json(res, 400, { error: 'habilitado debe ser verdadero o falso.' });
          return;
        }
        cambios.habilitado = datos['habilitado'];
      }
      if (datos['restaurar'] === true) {
        cambios.cron = null;
      } else if (datos['cron'] !== undefined) {
        const cron = validarExpresionCron(datos['cron']);
        if (!cron.ok) {
          json(res, 400, { error: cron.error });
          return;
        }
        cambios.cron = cron.valor;
      }
      const salida = actualizarJob(nombre, cambios);
      if (!salida) {
        json(res, 404, { error: 'job no encontrado' });
        return;
      }
      json(res, 200, salida.vista);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/scheduler/jobs/:name/ejecutar',
    handler: async ({ res, params }) => {
      const nombre = params['name'] ?? '';
      if (!existeJob(nombre)) {
        json(res, 404, { error: 'job no encontrado' });
        return;
      }
      const registro = await ejecutarJobAhora(nombre, brand);
      json(res, 200, registro);
    },
  },
];

const createSchedulerRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildSchedulerRoutes(brand));

export default createSchedulerRoutes;
