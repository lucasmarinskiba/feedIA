/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { resolveDefaultBrandId } from './oauthRoutes.js';
import { construirJunta } from '../capabilities/executive/juntaEjecutiva.js';
import {
  ESTADOS_PROYECTO,
  LIMITE_PROYECTOS,
  modificarProyectos,
  nuevoProyecto,
  progresoProyecto,
  validarProyecto,
  type EstadoProyecto,
} from '../capabilities/executive/proyectosEjecutivo.js';

const buildJuntaRoutes = (brand: BrandProfile): RouteDefinition[] => {
  const plataformaId = () => resolveDefaultBrandId(brand) ?? 'default';
  return [
    {
      method: 'GET',
      pattern: '/api/executive/junta',
      handler: async ({ req, res }) => {
        json(res, 200, await construirJunta(await marcaDeCuentas(req, brand), plataformaId()));
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/proyectos',
      handler: async ({ res, body }) => {
        const entrada = validarProyecto(body);
        if (!entrada.ok) {
          json(res, 400, { error: entrada.error });
          return;
        }
        const proyecto = nuevoProyecto(entrada.valor);
        const salida = await modificarProyectos<typeof proyecto | { error: string }>(plataformaId(), (lista) => {
          if (lista.length >= LIMITE_PROYECTOS)
            return { error: `Llegaste al máximo de ${LIMITE_PROYECTOS} proyectos.` };
          lista.push(proyecto);
          return { resultado: proyecto };
        });
        if (salida && 'error' in salida) {
          json(res, 409, { error: salida.error });
          return;
        }
        json(res, 201, { ...proyecto, progreso: progresoProyecto(proyecto) });
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/proyectos/:id/tareas/:tarea',
      handler: async ({ res, params }) => {
        const salida = await modificarProyectos<unknown>(plataformaId(), (lista) => {
          const proyecto = lista.find((p) => p.id === (params['id'] ?? ''));
          if (!proyecto) return null;
          const tarea = proyecto.tareas.find((t) => t.id === (params['tarea'] ?? ''));
          if (!tarea) return { error: 'tarea no encontrada' };
          tarea.hecha = !tarea.hecha;
          proyecto.actualizadoEn = new Date().toISOString();
          return { resultado: { ...proyecto, progreso: progresoProyecto(proyecto) } };
        });
        if (salida === null) {
          json(res, 404, { error: 'proyecto no encontrado' });
          return;
        }
        if (typeof salida === 'object' && salida !== null && 'error' in salida) {
          json(res, 404, { error: 'tarea no encontrada' });
          return;
        }
        json(res, 200, salida);
      },
    },
    {
      method: 'POST',
      pattern: '/api/executive/proyectos/:id/estado',
      handler: async ({ res, params, body }) => {
        const estado = (body as { estado?: unknown } | null)?.estado;
        if (typeof estado !== 'string' || !ESTADOS_PROYECTO.includes(estado as EstadoProyecto)) {
          json(res, 400, { error: 'Estado no válido.' });
          return;
        }
        const salida = await modificarProyectos<unknown>(plataformaId(), (lista) => {
          const proyecto = lista.find((p) => p.id === (params['id'] ?? ''));
          if (!proyecto) return null;
          proyecto.estado = estado as EstadoProyecto;
          proyecto.actualizadoEn = new Date().toISOString();
          return { resultado: { ...proyecto, progreso: progresoProyecto(proyecto) } };
        });
        if (salida === null) {
          json(res, 404, { error: 'proyecto no encontrado' });
          return;
        }
        json(res, 200, salida);
      },
    },
  ];
};

const createJuntaRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildJuntaRoutes(brand));

export default createJuntaRoutes;
