/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { randomUUID } from 'node:crypto';
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import {
  CONSEJOS_COLAB,
  ESTADOS_PROSPECTO,
  ESTILOS_CONTENIDO,
  ESTILOS_IDS,
  LIMITE_ESTILOS,
  LIMITE_PROSPECTOS,
  LIMITE_SUBNICHOS,
  errorDeTransicion,
  opcionesDeRed,
  plantillaOutreach,
  recomendarColabs,
  resumenPipeline,
  transicionesPermitidas,
  validarPerfilContenido,
  validarProspecto,
  type EstadoProspecto,
  type Prospecto,
} from '../capabilities/executive/collabMetricas.js';
import {
  ideasDeColab,
  leerCollabs,
  modificarCollabs,
  perfilDeCuenta,
} from '../capabilities/executive/collabEjecutivo.js';

const ESTADOS_VALIDOS = Object.keys(ESTADOS_PROSPECTO) as EstadoProspecto[];

const esEstado = (v: unknown): v is EstadoProspecto =>
  typeof v === 'string' && (ESTADOS_VALIDOS as string[]).includes(v);

const buildCollabRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/collabs',
    handler: async ({ req, res }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const archivo = await leerCollabs(cuentasId);
      const perfil = await perfilDeCuenta(cuentasId, brand, archivo);
      const recomendaciones = recomendarColabs(perfil);
      json(res, 200, {
        generadoEn: new Date().toISOString(),
        marca: brand.name,
        perfil,
        recomendaciones,
        consejos: CONSEJOS_COLAB,
        opciones: opcionesDeRed(perfil.plataforma),
        estilosCatalogo: ESTILOS_IDS.map((id) => ({ id, label: ESTILOS_CONTENIDO[id].label })),
        limites: { subnichos: LIMITE_SUBNICHOS, estilos: LIMITE_ESTILOS },
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
      const entrada = validarPerfilContenido(body);
      if (!entrada.ok) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const { valor } = entrada;
      const cuentasId = await marcaDeCuentas(req, brand);
      await modificarCollabs(cuentasId, (datos) => {
        if (valor.tipoMarca !== undefined) datos.tipoMarca = valor.tipoMarca;
        if (valor.nicho !== undefined) datos.nicho = valor.nicho;
        if (valor.subnichos !== undefined) datos.subnichos = valor.subnichos;
        if (valor.estilos !== undefined) datos.estilos = valor.estilos;
        if (valor.plataforma !== undefined) datos.plataforma = valor.plataforma;
        return { resultado: true };
      });
      json(res, 200, { ok: true });
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
      const perfil = await perfilDeCuenta(cuentasId, brand, archivo);
      json(res, 200, await ideasDeColab(perfil, brand.name));
    },
  },
];

const createCollabRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildCollabRoutes(brand));

export default createCollabRoutes;
