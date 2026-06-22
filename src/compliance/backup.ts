/**
 * Backup Automatizado del Sistema
 *
 * Realiza copias de seguridad periódicas de:
 * - Configuración (.env, brand.json)
 * - Datos de runtime (audit logs, rate limits, memoria, conversaciones)
 * - Estado del sistema (emergency, crisis, scheduler)
 *
 * Uso:
 *   import { createBackup, listBackups, restoreBackup } from './compliance/backup.js';
 *   await createBackup({ reason: 'backup-diario' });
 */

import {
  existsSync,
  mkdirSync,
  copyFileSync,
  writeFileSync,
  readdirSync,
  statSync,
  rmSync,
  readFileSync,
} from 'node:fs';
import { resolve, basename } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { audit } from './auditLog.js';

const BACKUP_DIR = resolve('data/backups');
const RUNTIME_DIR = resolve('data/runtime');
const CONFIG_FILES = ['.env', 'data/brand.json'];
const RUNTIME_PATTERNS = [
  'audit',
  'rate-limits.json',
  'memory.json',
  'conversations',
  'crisis-state.json',
  'emergency-state.json',
  'scheduler-overrides.json',
  'events.json',
];

export interface BackupEntry {
  id: string;
  timestamp: string;
  reason: string;
  path: string;
  sizeBytes: number;
  fileCount: number;
  retentionDays: number;
}

const ensureBackupDir = (): void => {
  if (!existsSync(BACKUP_DIR)) mkdirSync(BACKUP_DIR, { recursive: true });
};

const generateBackupId = (): string => {
  const now = new Date();
  return `backup-${now.toISOString().slice(0, 10)}-${Date.now()}`;
};

const getBackupPath = (id: string): string => resolve(BACKUP_DIR, id);

/**
 * Crea un backup completo del sistema.
 */
export const createBackup = async (opts: { reason: string; retentionDays?: number }): Promise<BackupEntry> => {
  ensureBackupDir();
  const id = generateBackupId();
  const backupPath = getBackupPath(id);
  mkdirSync(backupPath, { recursive: true });

  // Crear subdirectorios
  mkdirSync(resolve(backupPath, 'config'), { recursive: true });
  mkdirSync(resolve(backupPath, 'runtime'), { recursive: true });

  let fileCount = 0;

  // 1. Backup de configuración
  for (const file of CONFIG_FILES) {
    const src = resolve(file);
    if (existsSync(src)) {
      copyFileSync(src, resolve(backupPath, 'config', basename(file)));
      fileCount++;
    }
  }

  // 2. Backup de runtime
  for (const pattern of RUNTIME_PATTERNS) {
    const src = resolve(RUNTIME_DIR, pattern);
    if (existsSync(src)) {
      const dest = resolve(backupPath, 'runtime', pattern);
      if (statSync(src).isDirectory()) {
        copyDirectory(src, dest);
        fileCount += countFiles(src);
      } else {
        copyFileSync(src, dest);
        fileCount++;
      }
    }
  }

  // 3. Metadatos del backup
  const meta = {
    id,
    timestamp: new Date().toISOString(),
    reason: opts.reason,
    version: process.env.npm_package_version ?? '0.1.0',
    nodeVersion: process.version,
    retentionDays: opts.retentionDays ?? env.compliance.auditRetentionDays,
  };
  writeFileSync(resolve(backupPath, 'meta.json'), JSON.stringify(meta, null, 2), 'utf-8');

  // Calcular tamaño
  const sizeBytes = calculateDirectorySize(backupPath);

  const entry: BackupEntry = {
    id,
    timestamp: meta.timestamp,
    reason: opts.reason,
    path: backupPath,
    sizeBytes,
    fileCount,
    retentionDays: meta.retentionDays,
  };

  log.success(`Backup creado: ${id} (${formatBytes(sizeBytes)}, ${fileCount} archivos)`);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `Backup creado: ${id} (${opts.reason})`,
    dryRun: env.dryRun,
  });

  return entry;
};

/**
 * Lista todos los backups disponibles.
 */
export const listBackups = (): BackupEntry[] => {
  ensureBackupDir();
  const entries: BackupEntry[] = [];

  for (const id of readdirSync(BACKUP_DIR)) {
    const path = getBackupPath(id);
    const metaPath = resolve(path, 'meta.json');
    if (!existsSync(metaPath)) continue;

    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
      entries.push({
        id: meta.id,
        timestamp: meta.timestamp,
        reason: meta.reason,
        path,
        sizeBytes: calculateDirectorySize(path),
        fileCount: countFiles(path),
        retentionDays: meta.retentionDays ?? 90,
      });
    } catch {
      // ignorar backups corruptos
    }
  }

  return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Restaura un backup específico.
 * ⚠️ ADVERTENCIA: Esto sobrescribe datos actuales.
 */
export const restoreBackup = async (backupId: string): Promise<void> => {
  const backupPath = getBackupPath(backupId);
  if (!existsSync(backupPath)) {
    throw new Error(`Backup ${backupId} no encontrado`);
  }

  log.warn(`🚨 RESTAURANDO BACKUP ${backupId}. Esto sobrescribirá datos actuales.`);

  // Restaurar configuración
  const configDir = resolve(backupPath, 'config');
  if (existsSync(configDir)) {
    for (const file of readdirSync(configDir)) {
      const src = resolve(configDir, file);
      const dest = resolve(file === 'brand.json' ? 'data/brand.json' : file);
      copyFileSync(src, dest);
      log.info(`Restaurado: ${dest}`);
    }
  }

  // Restaurar runtime
  const runtimeDir = resolve(backupPath, 'runtime');
  if (existsSync(runtimeDir)) {
    for (const item of readdirSync(runtimeDir)) {
      const src = resolve(runtimeDir, item);
      const dest = resolve(RUNTIME_DIR, item);
      if (statSync(src).isDirectory()) {
        copyDirectory(src, dest);
      } else {
        copyFileSync(src, dest);
      }
      log.info(`Restaurado: ${dest}`);
    }
  }

  log.success(`Backup ${backupId} restaurado.`);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `Backup restaurado: ${backupId}`,
    dryRun: env.dryRun,
  });
};

/**
 * Elimina backups más allá de su período de retención.
 */
export const purgeOldBackups = (): number => {
  ensureBackupDir();
  let deleted = 0;
  const now = Date.now();

  for (const entry of listBackups()) {
    const ageDays = (now - new Date(entry.timestamp).getTime()) / (1000 * 60 * 60 * 24);
    if (ageDays > entry.retentionDays) {
      rmSync(entry.path, { recursive: true, force: true });
      log.info(`Backup eliminado por retención: ${entry.id} (${Math.round(ageDays)} días)`);
      deleted++;
    }
  }

  return deleted;
};

// ─── Helpers ───

const copyDirectory = (src: string, dest: string): void => {
  mkdirSync(dest, { recursive: true });
  for (const item of readdirSync(src)) {
    const srcPath = resolve(src, item);
    const destPath = resolve(dest, item);
    if (statSync(srcPath).isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
};

const countFiles = (dir: string): number => {
  let count = 0;
  for (const item of readdirSync(dir)) {
    const path = resolve(dir, item);
    if (statSync(path).isDirectory()) {
      count += countFiles(path);
    } else {
      count++;
    }
  }
  return count;
};

const calculateDirectorySize = (dir: string): number => {
  let size = 0;
  for (const item of readdirSync(dir)) {
    const path = resolve(dir, item);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      size += calculateDirectorySize(path);
    } else {
      size += stats.size;
    }
  }
  return size;
};

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
