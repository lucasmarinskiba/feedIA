import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { PostJunta } from './juntaMetricas.js';
import { MIN_POSTS_PREDICCION } from './predictorModelo.js';

export interface Piloto {
  nombre: string;
  desde: string;
  hipotesis: string;
  creadoEn: string;
  actualizadoEn: string;
}

export interface VentanaPiloto {
  publicaciones: number;
  tasaMediana: number | null;
  porSemana: number | null;
}

export interface ComparacionPiloto {
  dias: number;
  listo: boolean;
  antes: VentanaPiloto;
  despues: VentanaPiloto;
  deltaPp: number | null;
  lectura: string;
  faltantes: string[];
}

const DIA_MS = 86_400_000;
const SEMANA_MS = 7 * DIA_MS;
const MAX_ANTIGUEDAD_DIAS = 730;
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

const limpio = (v: unknown, max: number): string =>
  typeof v === 'string'
    ? v
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, max)
    : '';

export const validarPiloto = (
  body: unknown,
  ahora: number,
): { ok: true; valor: Omit<Piloto, 'creadoEn' | 'actualizadoEn'> } | { ok: false; error: string } => {
  const datos = (body ?? {}) as Record<string, unknown>;
  const nombre = limpio(datos['nombre'], 80);
  if (nombre.length < 3) return { ok: false, error: 'El nombre del piloto debe tener al menos 3 caracteres.' };
  const desde = typeof datos['desde'] === 'string' ? datos['desde'].trim() : '';
  if (!FECHA.test(desde) || !Number.isFinite(Date.parse(`${desde}T00:00:00Z`))) {
    return { ok: false, error: 'La fecha de inicio no es válida.' };
  }
  const hoy = new Date(ahora).toISOString().slice(0, 10);
  if (desde > hoy) return { ok: false, error: 'La fecha de inicio no puede ser futura.' };
  const minima = new Date(ahora - MAX_ANTIGUEDAD_DIAS * DIA_MS).toISOString().slice(0, 10);
  if (desde < minima) return { ok: false, error: 'La fecha de inicio es demasiado antigua para medirla.' };
  return { ok: true, valor: { nombre, desde, hipotesis: limpio(datos['hipotesis'], 200) } };
};

const mediana = (valores: number[]): number | null => {
  if (valores.length === 0) return null;
  const ord = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(ord.length / 2);
  return ord.length % 2 === 0 ? ((ord[medio - 1] ?? 0) + (ord[medio] ?? 0)) / 2 : (ord[medio] ?? 0);
};

const redondear = (n: number, decimales: number): number => Math.round(n * 10 ** decimales) / 10 ** decimales;

export const compararPiloto = (datos: { piloto: Piloto; posts: PostJunta[]; ahora: number }): ComparacionPiloto => {
  const { piloto, posts, ahora } = datos;
  const desdeMs = Date.parse(`${piloto.desde}T00:00:00Z`);
  const conTiempo = posts
    .map((p) => ({ t: Date.parse(p.publicadoEn), tasa: p.tasa }))
    .filter((p) => Number.isFinite(p.t) && p.t <= ahora);
  const antesPosts = conTiempo.filter((p) => p.t < desdeMs);
  const despuesPosts = conTiempo.filter((p) => p.t >= desdeMs);

  const tasasPct = (ps: typeof conTiempo): number[] =>
    ps
      .map((p) => p.tasa)
      .filter((t): t is number => t !== null)
      .map((t) => t * 100);

  const semanasAntes = antesPosts.length
    ? Math.max(1, (desdeMs - Math.min(...antesPosts.map((p) => p.t))) / SEMANA_MS)
    : 1;
  const semanasDespues = Math.max(1, (ahora - desdeMs) / SEMANA_MS);

  const medianaAntes = mediana(tasasPct(antesPosts));
  const medianaDespues = mediana(tasasPct(despuesPosts));
  const antes: VentanaPiloto = {
    publicaciones: antesPosts.length,
    tasaMediana: medianaAntes === null ? null : redondear(medianaAntes, 1),
    porSemana: antesPosts.length ? redondear(antesPosts.length / semanasAntes, 1) : null,
  };
  const despues: VentanaPiloto = {
    publicaciones: despuesPosts.length,
    tasaMediana: medianaDespues === null ? null : redondear(medianaDespues, 1),
    porSemana: despuesPosts.length ? redondear(despuesPosts.length / semanasDespues, 1) : null,
  };
  const dias = Math.max(0, Math.floor((ahora - desdeMs) / DIA_MS));

  const faltantes: string[] = [];
  if (antes.publicaciones < MIN_POSTS_PREDICCION) {
    faltantes.push(
      `Hay ${antes.publicaciones} publicación(es) anteriores al inicio y hacen falta ${MIN_POSTS_PREDICCION}. Esa referencia no se puede recuperar después.`,
    );
  }
  if (despues.publicaciones < MIN_POSTS_PREDICCION) {
    faltantes.push(
      `Faltan ${MIN_POSTS_PREDICCION - despues.publicaciones} publicación(es) después del inicio para comparar.`,
    );
  }
  if (dias < 14)
    faltantes.push(`El piloto tiene ${dias} día(s). Conviene esperar 2 semanas antes de leer el resultado.`);

  const listo =
    antes.publicaciones >= MIN_POSTS_PREDICCION &&
    despues.publicaciones >= MIN_POSTS_PREDICCION &&
    antes.tasaMediana !== null &&
    despues.tasaMediana !== null;

  if (!listo) {
    return {
      dias,
      listo: false,
      antes,
      despues,
      deltaPp: null,
      lectura: 'Todavía no hay comparación confiable. Mirá los faltantes.',
      faltantes,
    };
  }

  const deltaPp = redondear((despues.tasaMediana as number) - (antes.tasaMediana as number), 1);
  const signo = deltaPp >= 0 ? '+' : '';
  return {
    dias,
    listo: true,
    antes,
    despues,
    deltaPp,
    lectura: `La tasa mediana de interacción pasó de ${antes.tasaMediana}% a ${despues.tasaMediana}% (${signo}${deltaPp} pp). Frecuencia: ${antes.porSemana} → ${despues.porSemana} publicaciones por semana. Es una correlación en el tiempo, no prueba de causa.`,
    faltantes,
  };
};

const archivo = (marcaId: string): string =>
  path.join(path.resolve('data/executive/pilotos'), `${marcaId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);

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

export const leerPiloto = async (marcaId: string): Promise<Piloto | null> => {
  try {
    const datos = JSON.parse(await fs.readFile(archivo(marcaId), 'utf-8')) as unknown;
    return datos && typeof datos === 'object' && 'desde' in datos ? (datos as Piloto) : null;
  } catch {
    return null;
  }
};

const escribir = async (marcaId: string, piloto: Piloto | null): Promise<void> => {
  const destino = archivo(marcaId);
  await fs.mkdir(path.dirname(destino), { recursive: true });
  if (piloto === null) {
    await fs.rm(destino, { force: true });
    return;
  }
  const temporal = `${destino}.${randomUUID()}.tmp`;
  await fs.writeFile(temporal, JSON.stringify(piloto, null, 2), 'utf-8');
  await fs.rename(temporal, destino);
};

export const guardarPiloto = (marcaId: string, valor: Omit<Piloto, 'creadoEn' | 'actualizadoEn'>): Promise<Piloto> =>
  enCola(marcaId, async () => {
    const previo = await leerPiloto(marcaId);
    const ahora = new Date().toISOString();
    const piloto: Piloto = { ...valor, creadoEn: previo?.creadoEn ?? ahora, actualizadoEn: ahora };
    await escribir(marcaId, piloto);
    return piloto;
  });

export const quitarPiloto = (marcaId: string): Promise<void> => enCola(marcaId, () => escribir(marcaId, null));
