/**
 * Gestión de Versiones de Contenido
 *
 * Registra todas las versiones de una pieza de contenido
 * desde su generación hasta su publicación (o rechazo).
 *
 * Permite:
 * - Ver historial de cambios
 * - Comparar versiones
 * - Revertir a una versión anterior
 * - Auditar quién aprobó qué y cuándo
 *
 * Uso:
 *   import { trackVersion, getVersions, approveVersion } from './compliance/contentVersions.js';
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { audit } from './auditLog.js';

const VERSIONS_DIR = resolve('data/runtime/content-versions');

export interface ContentVersion {
  versionId: string;
  contentId: string;
  versionNumber: number;
  timestamp: string;
  status: 'draft' | 'approved' | 'rejected' | 'published' | 'blocked';
  caption: string;
  hashtags: string[];
  riskScore: number;
  approvedBy?: string;
  rejectionReason?: string;
  changes: string[];
}

export interface ContentHistory {
  contentId: string;
  createdAt: string;
  versions: ContentVersion[];
}

const ensureDir = (): void => {
  if (!existsSync(VERSIONS_DIR)) mkdirSync(VERSIONS_DIR, { recursive: true });
};

const getHistoryPath = (contentId: string): string => resolve(VERSIONS_DIR, `${contentId}.json`);

const loadHistory = (contentId: string): ContentHistory => {
  const path = getHistoryPath(contentId);
  if (!existsSync(path)) {
    return { contentId, createdAt: new Date().toISOString(), versions: [] };
  }
  return JSON.parse(readFileSync(path, 'utf-8')) as ContentHistory;
};

const saveHistory = (history: ContentHistory): void => {
  ensureDir();
  writeFileSync(getHistoryPath(history.contentId), JSON.stringify(history, null, 2), 'utf-8');
};

/**
 * Registra una nueva versión de contenido.
 */
export const trackVersion = (opts: {
  contentId: string;
  caption: string;
  hashtags: string[];
  riskScore: number;
  status: ContentVersion['status'];
  changes?: string[];
  approvedBy?: string;
  rejectionReason?: string;
}): ContentVersion => {
  const history = loadHistory(opts.contentId);
  const versionNumber = history.versions.length + 1;

  const version: ContentVersion = {
    versionId: `${opts.contentId}-v${versionNumber}`,
    contentId: opts.contentId,
    versionNumber,
    timestamp: new Date().toISOString(),
    status: opts.status,
    caption: opts.caption,
    hashtags: opts.hashtags,
    riskScore: opts.riskScore,
    approvedBy: opts.approvedBy,
    rejectionReason: opts.rejectionReason,
    changes: opts.changes ?? [],
  };

  history.versions.push(version);
  saveHistory(history);

  log.info(`Versión ${versionNumber} registrada para ${opts.contentId} (status: ${opts.status})`);

  audit({
    action: 'PUBLISH',
    outcome: opts.status === 'blocked' ? 'blocked' : 'success',
    targetContentId: opts.contentId,
    contentSummary: `v${versionNumber} - ${opts.status}`,
    dryRun: env.dryRun,
  });

  return version;
};

/**
 * Obtiene el historial completo de un contenido.
 */
export const getVersions = (contentId: string): ContentHistory => loadHistory(contentId);

/**
 * Aprueba una versión específica.
 */
export const approveVersion = (contentId: string, versionNumber: number, approver: string): boolean => {
  const history = loadHistory(contentId);
  const version = history.versions.find((v) => v.versionNumber === versionNumber);
  if (!version) return false;

  version.status = 'approved';
  version.approvedBy = approver;
  saveHistory(history);

  log.success(`Versión ${versionNumber} de ${contentId} aprobada por ${approver}`);
  return true;
};

/**
 * Rechaza una versión con razón.
 */
export const rejectVersion = (contentId: string, versionNumber: number, reason: string): boolean => {
  const history = loadHistory(contentId);
  const version = history.versions.find((v) => v.versionNumber === versionNumber);
  if (!version) return false;

  version.status = 'rejected';
  version.rejectionReason = reason;
  saveHistory(history);

  log.warn(`Versión ${versionNumber} de ${contentId} rechazada: ${reason}`);
  return true;
};

/**
 * Compara dos versiones y retorna las diferencias.
 */
export const compareVersions = (
  contentId: string,
  v1: number,
  v2: number,
): { captionDiff: string; riskScoreDiff: number; statusChanged: boolean } | null => {
  const history = loadHistory(contentId);
  const version1 = history.versions.find((v) => v.versionNumber === v1);
  const version2 = history.versions.find((v) => v.versionNumber === v2);
  if (!version1 || !version2) return null;

  return {
    captionDiff: `De "${version1.caption.slice(0, 50)}..." a "${version2.caption.slice(0, 50)}..."`,
    riskScoreDiff: version2.riskScore - version1.riskScore,
    statusChanged: version1.status !== version2.status,
  };
};
