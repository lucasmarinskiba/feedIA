/**
 * File Bridge de FeedIA — puente entre apps de diseño y publicación.
 *
 * Monitorea la carpeta de descargas, detecta archivos recién exportados (de Canva,
 * Figma, Photopea, etc.), los valida, los renombra a una ubicación estable y los
 * deja listos para upload a Instagram via Upload-Post o computer use.
 */

import { readdirSync, statSync, existsSync, mkdirSync, copyFileSync, renameSync, unlinkSync } from 'node:fs';
import { join, extname, basename } from 'node:path';
import { homedir } from 'node:os';
import { log } from '../../agent/logger.js';

const WATCHED_FOLDERS_DEFAULT = [join(homedir(), 'Downloads')];

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FileDetectionOptions {
  folder?: string; // dónde mirar (default Downloads)
  extension?: 'png' | 'jpg' | 'jpeg' | 'gif' | 'mp4' | 'pdf' | 'webp' | 'svg' | 'mov';
  maxAgeSeconds?: number; // máximo de antigüedad (default 120s)
  filenameContains?: string; // filtrar por substring
  excludeFilenameContains?: string[];
}

export interface DetectedFile {
  path: string;
  filename: string;
  extension: string;
  sizeKB: number;
  createdAt: string;
  modifiedAt: string;
  isFresh: boolean; // dentro del maxAgeSeconds
}

// ── Detección de archivos recientes ───────────────────────────────────────────

export const detectRecentDownload = async (options: FileDetectionOptions = {}): Promise<string | undefined> => {
  const detected = await listRecentDownloads(options);
  return detected[0]?.path;
};

export const listRecentDownloads = async (options: FileDetectionOptions = {}): Promise<DetectedFile[]> => {
  const folder = options.folder ?? WATCHED_FOLDERS_DEFAULT[0]!;
  const ext = options.extension;
  const maxAge = options.maxAgeSeconds ?? 120;
  const now = Date.now();
  const cutoff = now - maxAge * 1000;

  if (!existsSync(folder)) {
    log.warn(`[FileBridge] Carpeta no existe: ${folder}`);
    return [];
  }

  try {
    const files = readdirSync(folder);
    const detected: DetectedFile[] = [];

    for (const f of files) {
      const filePath = join(folder, f);
      try {
        const stat = statSync(filePath);
        if (!stat.isFile()) continue;
        if (ext && !f.toLowerCase().endsWith(`.${ext}`)) continue;
        if (options.filenameContains && !f.toLowerCase().includes(options.filenameContains.toLowerCase())) continue;
        if (options.excludeFilenameContains?.some((excl) => f.toLowerCase().includes(excl.toLowerCase()))) continue;

        // Skip archivos parciales en descarga
        if (f.endsWith('.crdownload') || f.endsWith('.part') || f.endsWith('.tmp')) continue;

        const isFresh = stat.mtimeMs >= cutoff;

        detected.push({
          path: filePath,
          filename: f,
          extension: extname(f).slice(1).toLowerCase(),
          sizeKB: Math.round(stat.size / 1024),
          createdAt: new Date(stat.birthtimeMs).toISOString(),
          modifiedAt: new Date(stat.mtimeMs).toISOString(),
          isFresh,
        });
      } catch {
        continue;
      }
    }

    // Ordenar por modifiedAt desc (más recientes primero)
    detected.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
    return detected;
  } catch (err) {
    log.warn(`[FileBridge] Error listando ${folder}: ${(err as Error).message}`);
    return [];
  }
};

// ── Espera activa por un archivo nuevo (polling) ─────────────────────────────

export interface WaitForDownloadOptions extends FileDetectionOptions {
  timeoutSeconds?: number;
  pollIntervalMs?: number;
  baseline?: string[]; // archivos ya existentes a ignorar
}

export const waitForNewDownload = async (options: WaitForDownloadOptions = {}): Promise<DetectedFile | null> => {
  const timeout = (options.timeoutSeconds ?? 60) * 1000;
  const pollInterval = options.pollIntervalMs ?? 1500;
  const folder = options.folder ?? WATCHED_FOLDERS_DEFAULT[0]!;

  // Capturar baseline si no se provee
  let baselineSet: Set<string>;
  if (options.baseline) {
    baselineSet = new Set(options.baseline);
  } else {
    const current = await listRecentDownloads({ folder, extension: options.extension });
    baselineSet = new Set(current.map((f) => f.path));
  }

  const start = Date.now();
  while (Date.now() - start < timeout) {
    const current = await listRecentDownloads({ ...options, folder });
    const newFiles = current.filter((f) => !baselineSet.has(f.path) && f.isFresh);
    if (newFiles.length > 0) {
      log.info(`[FileBridge] Nuevo archivo detectado: ${newFiles[0]!.filename} (${newFiles[0]!.sizeKB} KB)`);
      return newFiles[0]!;
    }
    await new Promise<void>((resolve) => setTimeout(resolve, pollInterval));
  }

  log.warn(`[FileBridge] Timeout esperando download (${options.timeoutSeconds}s en ${folder})`);
  return null;
};

// ── Mover/renombrar a ubicación estable de assets ────────────────────────────

const ASSETS_FOLDER = join(process.cwd(), 'data', 'assets', 'designs');

const ensureAssetsFolder = (): void => {
  if (!existsSync(ASSETS_FOLDER)) mkdirSync(ASSETS_FOLDER, { recursive: true });
};

export interface RegisteredAsset {
  id: string;
  originalPath: string;
  storedPath: string;
  filename: string;
  extension: string;
  sizeKB: number;
  source: 'canva' | 'figma' | 'photopea' | 'photoshop' | 'manual' | 'unknown';
  intendedFor?:
    | 'instagram-post'
    | 'instagram-story'
    | 'instagram-reel'
    | 'instagram-carousel-slide'
    | 'youtube-thumbnail'
    | 'general';
  metadata?: Record<string, unknown>;
  registeredAt: string;
}

const inferSource = (filename: string): RegisteredAsset['source'] => {
  const lower = filename.toLowerCase();
  if (lower.includes('canva')) return 'canva';
  if (lower.includes('figma')) return 'figma';
  if (lower.includes('photopea')) return 'photopea';
  if (lower.includes('.psd')) return 'photoshop';
  return 'unknown';
};

export const registerAsset = (
  filePath: string,
  options: {
    intendedFor?: RegisteredAsset['intendedFor'];
    metadata?: Record<string, unknown>;
    keepOriginal?: boolean;
  } = {},
): RegisteredAsset => {
  ensureAssetsFolder();
  const ext = extname(filePath).slice(1).toLowerCase();
  const filename = basename(filePath);
  const stat = statSync(filePath);
  const id = `asset-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  const safeFilename = `${id}-${filename.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const storedPath = join(ASSETS_FOLDER, safeFilename);

  if (options.keepOriginal) {
    copyFileSync(filePath, storedPath);
  } else {
    try {
      renameSync(filePath, storedPath);
    } catch {
      copyFileSync(filePath, storedPath);
      try {
        unlinkSync(filePath);
      } catch {
        /* ignore */
      }
    }
  }

  const asset: RegisteredAsset = {
    id,
    originalPath: filePath,
    storedPath,
    filename: safeFilename,
    extension: ext,
    sizeKB: Math.round(stat.size / 1024),
    source: inferSource(filename),
    intendedFor: options.intendedFor,
    metadata: options.metadata,
    registeredAt: new Date().toISOString(),
  };

  log.info(`[FileBridge] Asset registrado: ${asset.id} (${asset.sizeKB} KB, source=${asset.source})`);
  return asset;
};

// ── Pipeline: download → register → return path ──────────────────────────────

export const captureLatestDownload = async (
  options: {
    extension?: FileDetectionOptions['extension'];
    intendedFor?: RegisteredAsset['intendedFor'];
    waitSeconds?: number;
    baseline?: string[];
  } = {},
): Promise<RegisteredAsset | null> => {
  const detected = await waitForNewDownload({
    extension: options.extension ?? 'png',
    timeoutSeconds: options.waitSeconds ?? 60,
    baseline: options.baseline,
  });

  if (!detected) return null;

  return registerAsset(detected.path, {
    intendedFor: options.intendedFor,
    keepOriginal: false,
  });
};

// ── Validaciones de archivo ───────────────────────────────────────────────────

export interface AssetValidationResult {
  ok: boolean;
  fileExists: boolean;
  size: { kb: number; ok: boolean };
  format: { detected: string; ok: boolean };
  issues: string[];
}

const FORMAT_LIMITS: Record<string, { minKB: number; maxKB: number; allowedFor: RegisteredAsset['intendedFor'][] }> = {
  png: {
    minKB: 30,
    maxKB: 30000,
    allowedFor: [
      'instagram-post',
      'instagram-story',
      'instagram-reel-cover' as never,
      'instagram-carousel-slide',
      'youtube-thumbnail',
      'general',
    ],
  },
  jpg: {
    minKB: 30,
    maxKB: 30000,
    allowedFor: ['instagram-post', 'instagram-story', 'instagram-carousel-slide', 'general'],
  },
  jpeg: {
    minKB: 30,
    maxKB: 30000,
    allowedFor: ['instagram-post', 'instagram-story', 'instagram-carousel-slide', 'general'],
  },
  mp4: { minKB: 500, maxKB: 500000, allowedFor: ['instagram-reel', 'instagram-story', 'general'] },
  mov: { minKB: 500, maxKB: 500000, allowedFor: ['instagram-reel', 'instagram-story', 'general'] },
  gif: { minKB: 50, maxKB: 8000, allowedFor: ['instagram-story', 'general'] },
  webp: { minKB: 30, maxKB: 30000, allowedFor: ['instagram-post', 'general'] },
};

export const validateAsset = (
  asset: RegisteredAsset,
  intendedFor?: RegisteredAsset['intendedFor'],
): AssetValidationResult => {
  const issues: string[] = [];
  const fileExists = existsSync(asset.storedPath);
  if (!fileExists) issues.push('Archivo no existe en disco');

  const limits = FORMAT_LIMITS[asset.extension];
  const formatOk = Boolean(limits);
  if (!formatOk) issues.push(`Formato ${asset.extension} no soportado para uso en Instagram`);

  const sizeOk = limits ? asset.sizeKB >= limits.minKB && asset.sizeKB <= limits.maxKB : false;
  if (limits && asset.sizeKB < limits.minKB)
    issues.push(`Archivo muy chico (${asset.sizeKB} KB), mínimo ${limits.minKB} KB`);
  if (limits && asset.sizeKB > limits.maxKB)
    issues.push(`Archivo muy grande (${asset.sizeKB} KB), máximo ${limits.maxKB} KB`);

  const target = intendedFor ?? asset.intendedFor ?? 'general';
  if (limits && !limits.allowedFor.includes(target as never)) {
    issues.push(`Formato ${asset.extension} no recomendado para ${target}`);
  }

  return {
    ok: fileExists && formatOk && sizeOk && issues.length === 0,
    fileExists,
    size: { kb: asset.sizeKB, ok: sizeOk },
    format: { detected: asset.extension, ok: formatOk },
    issues,
  };
};

// ── Lista de assets registrados ───────────────────────────────────────────────

export const listRegisteredAssets = (
  filters: { source?: RegisteredAsset['source']; intendedFor?: RegisteredAsset['intendedFor'] } = {},
): RegisteredAsset[] => {
  ensureAssetsFolder();
  // No persistimos un store, listamos directamente la carpeta
  try {
    const files = readdirSync(ASSETS_FOLDER);
    const assets: RegisteredAsset[] = [];
    for (const f of files) {
      const filePath = join(ASSETS_FOLDER, f);
      try {
        const stat = statSync(filePath);
        if (!stat.isFile()) continue;
        const ext = extname(f).slice(1).toLowerCase();
        const id = f.split('-').slice(0, 2).join('-');
        const asset: RegisteredAsset = {
          id,
          originalPath: filePath,
          storedPath: filePath,
          filename: f,
          extension: ext,
          sizeKB: Math.round(stat.size / 1024),
          source: inferSource(f),
          registeredAt: new Date(stat.birthtimeMs).toISOString(),
        };
        if (filters.source && asset.source !== filters.source) continue;
        if (filters.intendedFor && asset.intendedFor !== filters.intendedFor) continue;
        assets.push(asset);
      } catch {
        continue;
      }
    }
    return assets.sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  } catch {
    return [];
  }
};

// ── Resumen / snapshot ────────────────────────────────────────────────────────

export const getFileBridgeSnapshot = (): {
  watchedFolders: string[];
  assetsFolder: string;
  totalAssets: number;
  recentDownloadsCount: number;
  bySource: Record<string, number>;
} => {
  const assets = listRegisteredAssets();
  const bySource: Record<string, number> = {};
  for (const a of assets) {
    bySource[a.source] = (bySource[a.source] ?? 0) + 1;
  }
  return {
    watchedFolders: WATCHED_FOLDERS_DEFAULT,
    assetsFolder: ASSETS_FOLDER,
    totalAssets: assets.length,
    recentDownloadsCount: assets.filter((a) => Date.now() - new Date(a.registeredAt).getTime() < 24 * 60 * 60 * 1000)
      .length,
    bySource,
  };
};
