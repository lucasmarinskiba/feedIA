/**
 * Historial de posts por marca. Cada red devuelve solo sus últimos posts; este almacén guarda
 * la última lectura de cada uno para que el predictor aprenda de más publicaciones con el paso
 * del tiempo. Las escrituras se encadenan para no pisarse entre lecturas simultáneas.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { PostCrudo } from './postsMetricas.js';

const HISTORIAL_DIR = path.resolve('data/executive/postsHistorial');
const MAX_POSTS_POR_MARCA = 400;

type Almacen = Record<string, PostCrudo & { capturadoEn: string }>;

const archivo = (marcaId: string): string => path.join(HISTORIAL_DIR, `${marcaId}.json`);

const leerAlmacen = async (marcaId: string): Promise<Almacen> => {
  try {
    return JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as Almacen;
  } catch {
    return {};
  }
};

const escribir = async (marcaId: string, posts: PostCrudo[]): Promise<void> => {
  const almacen = await leerAlmacen(marcaId);
  const capturadoEn = new Date().toISOString();
  for (const p of posts) almacen[`${p.plataforma}:${p.id}`] = { ...p, capturadoEn };
  const recortado = Object.fromEntries(
    Object.entries(almacen)
      .sort(([, a], [, b]) => (Date.parse(b.publicadoEn) || 0) - (Date.parse(a.publicadoEn) || 0))
      .slice(0, MAX_POSTS_POR_MARCA),
  );
  await fs.mkdir(HISTORIAL_DIR, { recursive: true });
  await fs.writeFile(archivo(marcaId), JSON.stringify(recortado), 'utf-8');
};

let cola: Promise<void> = Promise.resolve();

export const registrarPosts = (marcaId: string, posts: PostCrudo[]): Promise<void> => {
  if (posts.length === 0) return Promise.resolve();
  const siguiente = cola
    .then(() => escribir(marcaId, posts))
    .catch((err: unknown) => {
      log.warn('[PostsStore] no se pudo guardar el historial de posts', { marcaId, error: String(err) });
    });
  cola = siguiente;
  return siguiente;
};

export const leerPostsHistorial = async (marcaId: string): Promise<PostCrudo[]> =>
  Object.values(await leerAlmacen(marcaId));
