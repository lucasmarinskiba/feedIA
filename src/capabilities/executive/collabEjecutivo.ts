/**
 * Collabs por marca: persistencia de prospectos y del perfil de contenido (tipo de cuenta, nicho amplio,
 * subnichos, estilos y red principal), perfil con datos reales de la cuenta y búsqueda de ideas con IA
 * (con recomendaciones de reglas si la IA no responde).
 */

import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { askJson } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { construirAnalytics } from '../experience/analyticsResumen.js';
import { analizarPostsDeMarca } from './postsAnalisis.js';
import {
  ESTILOS_CONTENIDO,
  ESTILOS_IDS,
  recomendarColabs,
  redDe,
  type EstiloId,
  type PerfilColab,
  type PlataformaPrincipal,
  type Prospecto,
  type Recomendacion,
  type TipoMarca,
} from './collabMetricas.js';

const DIR = path.resolve('data/executive/collabs');

export interface ArchivoCollabs {
  tipoMarca: TipoMarca | null;
  nicho: string | null;
  subnichos: string[];
  estilos: EstiloId[];
  plataforma: PlataformaPrincipal | null;
  prospectos: Prospecto[];
}

const archivo = (marcaId: string): string => path.join(DIR, `${marcaId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

const colas = new Map<string, Promise<unknown>>();

const enCola = <T>(marcaId: string, tarea: () => Promise<T>): Promise<T> => {
  const previa = colas.get(marcaId) ?? Promise.resolve();
  const siguiente = previa.catch(() => undefined).then(tarea);
  colas.set(
    marcaId,
    siguiente.catch(() => undefined),
  );
  return siguiente;
};

const archivoVacio = (): ArchivoCollabs => ({
  tipoMarca: null,
  nicho: null,
  subnichos: [],
  estilos: [],
  plataforma: null,
  prospectos: [],
});

const esEstilo = (v: unknown): v is EstiloId => typeof v === 'string' && (ESTILOS_IDS as string[]).includes(v);

export const leerCollabs = async (marcaId: string): Promise<ArchivoCollabs> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as Partial<ArchivoCollabs>;
    return {
      tipoMarca: datos.tipoMarca ?? null,
      nicho: typeof datos.nicho === 'string' ? datos.nicho : null,
      subnichos: Array.isArray(datos.subnichos)
        ? datos.subnichos.filter((s): s is string => typeof s === 'string')
        : [],
      estilos: Array.isArray(datos.estilos) ? datos.estilos.filter(esEstilo) : [],
      plataforma: datos.plataforma ?? null,
      prospectos: Array.isArray(datos.prospectos) ? datos.prospectos : [],
    };
  } catch {
    return archivoVacio();
  }
};

const guardar = async (marcaId: string, datos: ArchivoCollabs): Promise<void> => {
  await fs.mkdir(DIR, { recursive: true });
  const destino = archivo(marcaId);
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(datos, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const modificarCollabs = <T>(
  marcaId: string,
  mutar: (datos: ArchivoCollabs) => { resultado: T } | { error: string } | null,
): Promise<T | { error: string } | null> =>
  enCola(marcaId, async () => {
    const datos = await leerCollabs(marcaId);
    const salida = mutar(datos);
    if (salida === null) return null;
    if ('error' in salida) return salida;
    await guardar(marcaId, datos);
    return salida.resultado;
  });

const plataformaDeConexiones = (instagram: boolean, tiktok: boolean): PlataformaPrincipal => {
  if (instagram && tiktok) return 'ambas';
  return tiktok ? 'tiktok' : 'instagram';
};

const aProporcion = (mediana: unknown): number | null => (typeof mediana === 'number' ? mediana / 100 : null);

export const perfilDeCuenta = async (
  cuentasId: string,
  brand: BrandProfile,
  guardado: ArchivoCollabs,
): Promise<PerfilColab> => {
  const tipoMarca: TipoMarca = guardado.tipoMarca ?? (brand.accountCategory === 'empresa' ? 'empresa' : 'personal');
  let seguidoresIg: number | null = null;
  let seguidoresTt: number | null = null;
  try {
    const analytics = await construirAnalytics(cuentasId);
    seguidoresIg = analytics.instagram.cuenta.seguidores ?? null;
    seguidoresTt = analytics.tiktok.cuenta.seguidores ?? null;
  } catch (err) {
    log.warn('[Collabs] analytics no disponibles', { error: String(err) });
  }
  let conectadaIg = false;
  let conectadaTt = false;
  let tasaIg: number | null = null;
  let tasaTt: number | null = null;
  try {
    const bloques = await analizarPostsDeMarca(cuentasId);
    conectadaIg = bloques.instagram.conectado;
    conectadaTt = bloques.tiktok.conectado;
    tasaIg = aProporcion(bloques.instagram.resumen.tasaMediana);
    tasaTt = aProporcion(bloques.tiktok.resumen.tasaMediana);
  } catch (err) {
    log.warn('[Collabs] posts no disponibles', { error: String(err) });
  }
  const plataforma = guardado.plataforma ?? plataformaDeConexiones(conectadaIg, conectadaTt);
  const seguidores =
    plataforma === 'tiktok' ? seguidoresTt : plataforma === 'instagram' ? seguidoresIg : (seguidoresIg ?? seguidoresTt);
  const tasaMediana =
    plataforma === 'tiktok' ? tasaTt : plataforma === 'instagram' ? tasaIg : conectadaIg ? tasaIg : tasaTt;
  return {
    tipoMarca,
    seguidores,
    tasaMediana,
    nicho: guardado.nicho ?? brand.niche,
    subnichos: guardado.subnichos,
    estilos: guardado.estilos,
    plataforma,
  };
};

export interface IdeaColab {
  titulo: string;
  criterio: string;
  busqueda: string;
}

const esIdea = (v: unknown): v is IdeaColab => {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o['titulo'] === 'string' &&
    typeof o['criterio'] === 'string' &&
    typeof o['busqueda'] === 'string' &&
    o['titulo'].length <= 120 &&
    o['criterio'].length <= 300 &&
    o['busqueda'].length <= 200
  );
};

const describirFoco = (perfil: PerfilColab): string => {
  const estilos = perfil.estilos.map((e) => ESTILOS_CONTENIDO[e].label).join(', ') || 'sin definir';
  const subnichos = perfil.subnichos.join(', ') || 'ninguno (usá el nicho amplio)';
  return `Nicho amplio: ${perfil.nicho || 'sin definir'}. Subnichos a los que apunta: ${subnichos}. Estilos de contenido: ${estilos}. Red principal: ${redDe(perfil.plataforma)}.`;
};

export const ideasDeColab = async (
  perfil: PerfilColab,
  marca: string,
): Promise<{ fuente: 'ia' | 'reglas'; ideas: IdeaColab[]; recomendaciones: Recomendacion[] }> => {
  const recomendaciones = recomendarColabs(perfil);
  const contexto = `Marca: ${marca}. Tipo: ${perfil.tipoMarca === 'empresa' ? 'empresa' : 'marca personal'}. ${describirFoco(perfil)} Seguidores: ${perfil.seguidores ?? 'desconocido'}. Tasa de interacción mediana: ${perfil.tasaMediana === null ? 'sin datos' : `${(perfil.tasaMediana * 100).toFixed(2)} %`}.`;
  const prompt = `Sugerí 3 tipos de colaboración para esta cuenta de Instagram/TikTok.
${contexto}

Reglas:
- Cada idea debe ser un tipo de colaborador concreto y su criterio de selección.
- Las ideas deben servir al subnicho y a los estilos indicados. Si no hay subnicho, usá el nicho amplio.
- Si hay subnicho, una idea debe llevar a creadores del nicho amplio que todavía no hablen de ese subnicho.
- "busqueda" es un texto que el dueño puede pegar en el buscador de la red principal. Empezalo con la red. No inventes nombres de cuentas.
- Respondé en español rioplatense neutro, sin relleno.

JSON: array de objetos con keys titulo, criterio, busqueda.`;
  try {
    const raw = await askJson<unknown>(prompt, { fast: true, maxTokens: 900, temperature: 0.6 });
    const ideas = Array.isArray(raw) ? raw.filter(esIdea).slice(0, 3) : [];
    if (ideas.length > 0) return { fuente: 'ia', ideas, recomendaciones };
    log.warn('[Collabs] IA sin ideas válidas, uso reglas');
  } catch (err) {
    log.warn('[Collabs] IA no disponible, uso reglas', { error: String(err) });
  }
  return {
    fuente: 'reglas',
    ideas: recomendaciones.map((r) => ({ titulo: r.titulo, criterio: r.porQue, busqueda: r.dondeBuscar })),
    recomendaciones,
  };
};
