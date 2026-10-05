/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { registrarEvento } from '../capabilities/executive/bitacoraEjecutivo.js';
import { analizarPostsDeMarca, type BloquePlataforma } from '../capabilities/executive/postsAnalisis.js';
import type { PostAnalizado } from '../capabilities/executive/postsMetricas.js';
import {
  asignarPublicacion,
  crearExperimentoBorrador,
  errorAlIniciar,
  METRICAS_EXPERIMENTO,
  progresoDe,
  resultadoDe,
  validarEntrada,
  type Experimento,
  type PublicacionExperimento,
  type Variante,
} from '../capabilities/executive/experimentosMetricas.js';
import {
  agregarExperimento,
  leerExperimentos,
  modificarExperimento,
  nuevoIdExperimento,
  sugerirExperimentos,
} from '../capabilities/executive/experimentosEjecutivo.js';

const publicacionDe = (p: PostAnalizado): PublicacionExperimento => ({
  id: p.id,
  plataforma: p.plataforma,
  formato: p.formato,
  titulo: p.texto,
  url: p.url,
  publicadoEn: p.publicadoEn,
  alcance: p.alcance,
  likes: p.likes,
  guardados: p.guardados,
  compartidos: p.compartidos,
  interacciones: p.interacciones,
});

const cargarPublicaciones = async (
  cuentasId: string,
  refrescar: boolean,
): Promise<{
  bloques: { instagram: BloquePlataforma; tiktok: BloquePlataforma };
  publicaciones: PublicacionExperimento[];
}> => {
  const bloques = await analizarPostsDeMarca(cuentasId, { refrescar });
  const publicaciones = [...bloques.instagram.posts, ...bloques.tiktok.posts].map(publicacionDe);
  return { bloques, publicaciones };
};

const formatoDestacado = (bloques: { instagram: BloquePlataforma; tiktok: BloquePlataforma }): string | null => {
  const mejores = new Map<string, { suma: number; n: number }>();
  for (const p of [...bloques.instagram.posts, ...bloques.tiktok.posts]) {
    if (p.tasaInteraccion === null) continue;
    const acc = mejores.get(p.formato) ?? { suma: 0, n: 0 };
    mejores.set(p.formato, { suma: acc.suma + p.tasaInteraccion, n: acc.n + 1 });
  }
  let ganador: { formato: string; media: number } | null = null;
  for (const [formato, { suma, n }] of mejores) {
    const media = suma / n;
    if (!ganador || media > ganador.media) ganador = { formato, media };
  }
  return ganador?.formato ?? null;
};

const conectadas = (bloques: { instagram: BloquePlataforma; tiktok: BloquePlataforma }): string[] =>
  [bloques.instagram.conectado ? 'Instagram' : null, bloques.tiktok.conectado ? 'TikTok' : null].filter(
    (x): x is string => x !== null,
  );

const vistaDe = (exp: Experimento, publicaciones: PublicacionExperimento[], ahora: Date) => {
  const resultado =
    exp.estado === 'cerrado'
      ? exp.resultadoFinal
      : exp.estado === 'corriendo'
        ? resultadoDe(exp, publicaciones, ahora.toISOString())
        : null;
  return { ...exp, resultado, progreso: progresoDe(exp, ahora) };
};

const esVariante = (valor: unknown): valor is Variante => valor === 'A' || valor === 'B';

const buildExperimentosRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/executive/experiments',
    handler: async ({ req, res, query }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const { bloques, publicaciones } = await cargarPublicaciones(cuentasId, query['refrescar'] === '1');
      const ahora = new Date();
      const experimentos = await leerExperimentos(cuentasId);
      json(res, 200, {
        generadoEn: ahora.toISOString(),
        conectado: { instagram: bloques.instagram.conectado, tiktok: bloques.tiktok.conectado },
        metricas: METRICAS_EXPERIMENTO,
        publicaciones: publicaciones.sort((x, y) => Date.parse(y.publicadoEn) - Date.parse(x.publicadoEn)),
        experimentos: experimentos
          .map((exp) => vistaDe(exp, publicaciones, ahora))
          .sort((x, y) => Date.parse(y.creadoEn) - Date.parse(x.creadoEn)),
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments',
    handler: async ({ req, res, body }) => {
      const entrada = validarEntrada(body);
      if (!entrada.ok) {
        json(res, 400, { error: entrada.error });
        return;
      }
      const cuentasId = await marcaDeCuentas(req, brand);
      const exp = crearExperimentoBorrador(nuevoIdExperimento(), entrada.valor, new Date().toISOString());
      await agregarExperimento(cuentasId, exp);
      await registrarEvento(cuentasId, {
        categoria: 'experimento',
        titulo: `Experimento creado: ${exp.hipotesis}`,
        detalle: `Variable: ${exp.variable}. Métrica: ${METRICAS_EXPERIMENTO[exp.metrica].label}. Umbral: ${exp.umbralMejora} %.`,
        actor: 'vos',
        resultado: 'Borrador',
      });
      json(res, 201, exp);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments/sugerir',
    handler: async ({ req, res }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const { bloques } = await cargarPublicaciones(cuentasId, false);
      const sugerencias = await sugerirExperimentos({
        plataformas: conectadas(bloques),
        formatoDestacado: formatoDestacado(bloques),
      });
      json(res, 200, sugerencias);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments/:id/publicaciones',
    handler: async ({ req, res, params, body }) => {
      const datos = (body ?? {}) as Record<string, unknown>;
      const publicacionId = typeof datos['publicacionId'] === 'string' ? datos['publicacionId'] : '';
      const varianteRaw = datos['variante'] ?? null;
      if (!publicacionId || publicacionId.length > 200) {
        json(res, 400, { error: 'Publicación inválida.' });
        return;
      }
      if (varianteRaw !== null && !esVariante(varianteRaw)) {
        json(res, 400, { error: 'La variante debe ser A, B o nada.' });
        return;
      }
      const variante: Variante | null = esVariante(varianteRaw) ? varianteRaw : null;
      const cuentasId = await marcaDeCuentas(req, brand);
      const { publicaciones } = await cargarPublicaciones(cuentasId, false);
      if (!publicaciones.some((p) => p.id === publicacionId)) {
        json(res, 400, { error: 'La publicación no está entre tus últimas publicaciones.' });
        return;
      }
      const salida = await modificarExperimento(cuentasId, params['id'] ?? '', (exp) => {
        if (exp.estado !== 'borrador') return 'Las publicaciones solo se pueden cambiar en borrador.';
        asignarPublicacion(exp, publicacionId, variante);
        return null;
      });
      if (salida === null) {
        json(res, 404, { error: 'experimento no encontrado' });
        return;
      }
      if ('error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      json(res, 200, salida.exp);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments/:id/iniciar',
    handler: async ({ req, res, params }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const ahora = new Date().toISOString();
      const salida = await modificarExperimento(cuentasId, params['id'] ?? '', (exp) => {
        const error = errorAlIniciar(exp);
        if (error) return error;
        exp.estado = 'corriendo';
        exp.iniciadoEn = ahora;
        return null;
      });
      if (salida === null) {
        json(res, 404, { error: 'experimento no encontrado' });
        return;
      }
      if ('error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      await registrarEvento(cuentasId, {
        categoria: 'experimento',
        titulo: `Experimento iniciado: ${salida.exp.hipotesis}`,
        detalle: `Duración prevista: ${salida.exp.duracionDias} días.`,
        actor: 'vos',
        resultado: 'Corriendo',
      });
      json(res, 200, salida.exp);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments/:id/cerrar',
    handler: async ({ req, res, params }) => {
      const cuentasId = await marcaDeCuentas(req, brand);
      const { publicaciones } = await cargarPublicaciones(cuentasId, false);
      const ahora = new Date();
      const salida = await modificarExperimento(cuentasId, params['id'] ?? '', (exp) => {
        if (exp.estado !== 'corriendo') return 'Solo se puede cerrar un experimento que está corriendo.';
        exp.estado = 'cerrado';
        exp.cerradoEn = ahora.toISOString();
        exp.resultadoFinal = resultadoDe(exp, publicaciones, ahora.toISOString());
        return null;
      });
      if (salida === null) {
        json(res, 404, { error: 'experimento no encontrado' });
        return;
      }
      if ('error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      await registrarEvento(cuentasId, {
        categoria: 'experimento',
        titulo: `Experimento cerrado: ${salida.exp.hipotesis}`,
        detalle: salida.exp.resultadoFinal?.explicacion ?? '',
        actor: 'vos',
        resultado: salida.exp.resultadoFinal?.veredicto ?? null,
      });
      json(res, 200, salida.exp);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/experiments/:id/descartar',
    handler: async ({ req, res, params, body }) => {
      const datos = (body ?? {}) as Record<string, unknown>;
      const motivo = typeof datos['motivo'] === 'string' ? datos['motivo'].trim().slice(0, 300) : '';
      const cuentasId = await marcaDeCuentas(req, brand);
      const salida = await modificarExperimento(cuentasId, params['id'] ?? '', (exp) => {
        if (exp.estado !== 'borrador' && exp.estado !== 'corriendo') {
          return 'Solo se pueden descartar experimentos en borrador o corriendo.';
        }
        exp.estado = 'descartado';
        exp.motivoDescarte = motivo || null;
        return null;
      });
      if (salida === null) {
        json(res, 404, { error: 'experimento no encontrado' });
        return;
      }
      if ('error' in salida) {
        json(res, 409, { error: salida.error });
        return;
      }
      await registrarEvento(cuentasId, {
        categoria: 'experimento',
        titulo: `Experimento descartado: ${salida.exp.hipotesis}`,
        detalle: motivo || 'Sin motivo indicado.',
        actor: 'vos',
        resultado: 'Descartado',
      });
      json(res, 200, salida.exp);
    },
  },
];

const createExperimentosRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildExperimentosRoutes(brand));

export default createExperimentosRoutes;
