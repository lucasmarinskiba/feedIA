import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import express, { type Request, type Response } from 'express';
import multer from 'multer';
import type { BrandProfile } from '../config/types.js';
import { log } from '../agent/logger.js';
import { argumentosFfmpeg, parsearTranscripcion, planEdicion } from '../capabilities/executive/herramientasEdicion.js';
import { obtenerCreacion } from '../capabilities/executive/herramientasCreaciones.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';

const BASE = path.resolve('data/executive/video');
const TMP = path.join(BASE, 'tmp');
const MAX_BYTES = 200 * 1024 * 1024;
const TIMEOUT_MS = 10 * 60 * 1000;
const TIPOS_PERMITIDOS = ['video/mp4', 'video/quicktime', 'video/webm'];
const ID_VIDEO = /^[0-9a-f-]{36}$/;

const upload = multer({
  dest: TMP,
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    cb(null, TIPOS_PERMITIDOS.includes(file.mimetype));
  },
});

const carpetaDe = (cuentas: string): string => path.join(BASE, cuentas.replace(/[^a-zA-Z0-9_-]/g, '_'));

let ffmpegDisponible: Promise<boolean> | null = null;

const verificarFfmpeg = (): Promise<boolean> => {
  ffmpegDisponible ??= new Promise((resolve) => {
    const proceso = spawn('ffmpeg', ['-version'], { stdio: 'ignore' });
    proceso.on('error', () => resolve(false));
    proceso.on('close', (codigo) => resolve(codigo === 0));
  });
  return ffmpegDisponible;
};

const ejecutarFfmpeg = (args: string[]): Promise<boolean> =>
  new Promise((resolve) => {
    const proceso = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let errores = '';
    proceso.stderr.on('data', (dato: Buffer) => {
      errores = (errores + dato.toString()).slice(-2000);
    });
    const corte = setTimeout(() => proceso.kill('SIGKILL'), TIMEOUT_MS);
    proceso.on('error', () => {
      clearTimeout(corte);
      resolve(false);
    });
    proceso.on('close', (codigo) => {
      clearTimeout(corte);
      if (codigo !== 0) log.warn('[VideoEdit] ffmpeg falló', { codigo, errores });
      resolve(codigo === 0);
    });
  });

export const createVideoEditRoutes = (brand: BrandProfile): express.Router => {
  const router = express.Router();

  router.post(
    '/api/executive/tools/creaciones/:cid/editar-video',
    upload.single('video'),
    async (req: Request, res: Response) => {
      const archivo = req.file;
      try {
        if (!archivo) {
          res.status(400).json({ error: 'Subí un video en el campo "video".' });
          return;
        }
        const cuentas = await marcaDeCuentas(req, brand);
        const creacion = await obtenerCreacion(cuentas, String(req.params['cid'] ?? ''));
        if (!creacion || creacion.herramientaId !== 'guion') {
          res.status(404).json({ error: 'Guion no encontrado.' });
          return;
        }
        const transcripcion = creacion.valores['transcripcion'];
        if (typeof transcripcion !== 'string' || transcripcion.trim() === '') {
          res.status(409).json({ error: 'Este guion no tiene transcripción para editar.' });
          return;
        }
        const plan = planEdicion(parsearTranscripcion(transcripcion));
        if (!plan) {
          res.status(409).json({ error: 'No queda contenido después de quitar silencios y muletillas.' });
          return;
        }
        const id = randomUUID();
        const carpeta = carpetaDe(cuentas);
        await fs.mkdir(carpeta, { recursive: true });
        const salida = path.join(carpeta, `${id}.mp4`);
        const args = argumentosFfmpeg(plan.conservado, archivo.path, salida);
        if (!args) {
          res.status(409).json({ error: 'Hay demasiados cortes para procesarlos de una sola vez.' });
          return;
        }
        if (!(await verificarFfmpeg())) {
          res.status(503).json({ error: 'La edición de video no está disponible en este servidor.' });
          return;
        }
        if (!(await ejecutarFfmpeg(args))) {
          res.status(422).json({ error: 'No se pudo procesar el video. Revisá el formato y que tenga audio.' });
          return;
        }
        res.status(201).json({
          id,
          duracionOriginal: plan.duracionOriginal,
          duracionFinal: plan.duracionFinal,
          muletillas: plan.muletillas,
          silencios: plan.silencios,
          descarga: `/api/executive/tools/video/${id}`,
        });
      } catch (err) {
        log.warn('[VideoEdit] error al editar', { error: String(err) });
        res.status(500).json({ error: 'No se pudo editar el video.' });
      } finally {
        if (archivo) await fs.rm(archivo.path, { force: true }).catch(() => undefined);
      }
    },
  );

  router.get('/api/executive/tools/video/:vid', async (req: Request, res: Response) => {
    const vid = String(req.params['vid'] ?? '');
    if (!ID_VIDEO.test(vid)) {
      res.status(404).json({ error: 'Video no encontrado.' });
      return;
    }
    const cuentas = await marcaDeCuentas(req, brand);
    const ruta = path.join(carpetaDe(cuentas), `${vid}.mp4`);
    if (!existsSync(ruta)) {
      res.status(404).json({ error: 'Video no encontrado.' });
      return;
    }
    res.sendFile(ruta);
  });

  return router;
};
