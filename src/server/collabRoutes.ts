/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { randomUUID } from 'node:crypto';
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import {
  CONSEJOS_COLAB,
  ESTADOS_PROSPECTO,
  LIMITE_PROSPECTOS,
  OPCIONES_TIKTOK,
  errorDeTransicion,
  plantillaOutreach,
  recomendarColabs,
  resumenPipeline,
  transicionesPermitidas,
  validarProspecto,
  type EstadoProspecto,
  type Prospecto,
  type TipoMarca,
} from '../capabilities/executive/collabMetricas.js';
import {
  ideasDeColab,
  leerCollabs,
  modificarCollabs,
  perfilDeCuenta,
} from '../capabilities/executive/collabEjecutivo.js';

const ESTADOS_VALIDOS = Object.keys(ESTADOS_PROSPECTO) as EstadoProspecto[];

const esTipoMarca = (v: unknown): v is TipoMarca => v === 'personal' || v === 'empresa';
const esEstado = (v: unknown): v is EstadoProspecto =>
  typeof v === 'string' && (ESTADOS_VALIDOS as string[]).includes(v);

const buildCollabRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/collabs',
    handler: async ({ req, res }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const archivo = await leerCollabs(cuentasId);
      const perfil = await perfilDeCuenta(cuentasId, brand, archivo.tipoMarca);
      const recomendaciones = recomendarColabs(perfil);
      json(res, 200, {
        generadoEn: new Date().toISOString(),
        marca: brand.name,
        perfil,
        recomendaciones,
        consejos: CONSEJOS_COLAB,
        tiktok: OPCIONES_TIKTOK,
        plantilla: plantillaOutreach(perfil, brand.name),
        prospectos: [...archivo.prospectos].sort((a, b) => Date.parse(b.actualizadoEn) - Date.parse(a.actualizadoEn)),
        resumen: resumenPipeline(archivo.prospectos),
        estados: ESTADOS_PROSPECTO,
        transiciones: transicionesPermitidas(),
      });
    },
  },
  {
    method: 'PUT',
    pattern: '/api/executive/collabs/perfil',
    handler: async ({ req, res, body }) => {
      const tipo = (body as Record<string, unknown> | null)?.['tipoMarca'];
      if (!esTipoMarca(tipo)) {
        json(res, 400, { error: 'El tipo debe ser marca personal o empresa.' });
        return;
      }
      const cuentasId = await marcaDeCuentas(req, brand);
      await modificarCollabs(cuentasId, (datos) => {
        datos.tipoMarca = tipo;
        return { resultado: true };
      });
      json(res, 200, { tipoMarca: tipo });
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/collabs/prospectos',
    handler: async ({ req, res, body }) => {
      const entrada = validarProspecto(body);
      if (!entrada.ok) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const cuentasId = await marcaDeCuentas(req, brand);
      const ahora = new Date().toISOString();
      const prospecto: Prospecto = {
        id: `col-${randomUUID()}`,
        ...entrada.valor,
        estado: 'idea',
        creadoEn: ahora,
        actualizadoEn: ahora,
      };
      const salida = await modificarCollabs<Prospecto | { error: string }>(cuentasId, (datos) => {
        if (datos.prospectos.length >= LIMITE_PROSPECTOS) {
          return { error: `Llegaste al máximo de ${LIMITE_PROSPECTOS} prospectos.` };
        }
        datos.prospectos.push(prospecto);
        return { resultado: prospecto };
      });
      if (salida && 'error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      json(res, 201, prospecto);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/collabs/prospectos/:id/estado',
    handler: async ({ req, res, params, body }) => {
      const nuevo = (body as Record<string, unknown> | null)?.['estado'];
      if (!esEstado(nuevo)) {
        json(res, 400, { error: 'Estado no válido.' });
        return;
      }
      const cuentasId = await marcaDeCuentas(req, brand);
      const salida = await modificarCollabs<Prospecto>(cuentasId, (datos) => {
        const p = datos.prospectos.find((x) => x.id === (params['id'] ?? ''));
        if (!p) return null;
        const error = errorDeTransicion(p.estado, nuevo);
        if (error) return { error };
        p.estado = nuevo;
        p.actualizadoEn = new Date().toISOString();
        return { resultado: p };
      });
      if (salida === null) {
        json(res, 404, { error: 'prospecto no encontrado' });
        return;
      }
      if ('error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      json(res, 200, salida);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/collabs/ideas',
    handler: async ({ req, res }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const archivo = await leerCollabs(cuentasId);
      const perfil = await perfilDeCuenta(cuentasId, brand, archivo.tipoMarca);
      json(res, 200, await ideasDeColab(perfil, brand.name));
    },
  },
];

const createCollabRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildCollabRoutes(brand));

export default createCollabRoutes;
