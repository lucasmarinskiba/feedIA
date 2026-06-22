/**
 * Disaster Recovery — Recuperación ante desastres
 *
 * Procedimientos automatizados para:
 * - Recuperar desde backup más reciente
 * - Reconstruir estado mínimo si no hay backup
 * - Verificar integridad después de recuperación
 *
 * Uso:
 *   import { runDisasterRecovery } from './compliance/disasterRecovery.js';
 *   await runDisasterRecovery();
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { audit } from './auditLog.js';
import { createBackup, listBackups, restoreBackup } from './backup.js';
import { runPreFlightCheck } from './preflight.js';

export interface RecoveryReport {
  success: boolean;
  method: 'backup-restore' | 'minimal-rebuild' | 'failed';
  backupId?: string;
  issues: string[];
  preflightPassed: boolean;
  timestamp: string;
}

/**
 * Ejecuta el procedimiento completo de disaster recovery.
 */
export const runDisasterRecovery = async (): Promise<RecoveryReport> => {
  log.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.error('  DISASTER RECOVERY INICIADO');
  log.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const report: RecoveryReport = {
    success: false,
    method: 'failed',
    issues: [],
    preflightPassed: false,
    timestamp: new Date().toISOString(),
  };

  try {
    // 1. Intentar backup más reciente
    const backups = listBackups();
    if (backups.length > 0 && backups[0]) {
      const latest = backups[0];
      log.step(`Restaurando backup más reciente: ${latest.id}`);
      await restoreBackup(latest.id);
      report.method = 'backup-restore';
      report.backupId = latest.id;
    } else {
      // 2. Sin backup: reconstrucción mínima
      log.warn('No hay backups. Reconstruyendo estado mínimo...');
      await rebuildMinimalState();
      report.method = 'minimal-rebuild';
      report.issues.push('No había backups disponibles. Estado reconstruido al mínimo.');
    }

    // 3. Verificar integridad con preflight
    log.step('Verificando integridad post-recuperación...');
    const preflight = await runPreFlightCheck();
    report.preflightPassed = preflight.overallStatus !== 'FAIL';

    if (!report.preflightPassed) {
      report.issues.push('Preflight falló después de recuperación. Revisar manualmente.');
    }

    report.success = report.preflightPassed;

    // 4. Auditar
    audit({
      action: 'API_REQUEST',
      outcome: report.success ? 'success' : 'failure',
      reason: `Disaster recovery: ${report.method}. Success: ${report.success}`,
      dryRun: env.dryRun,
    });

    if (report.success) {
      log.success('Disaster recovery completado exitosamente.');
    } else {
      log.error('Disaster recovery completado con problemas. Revisar issues.');
    }

    return report;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log.error(`Disaster recovery falló: ${msg}`);
    report.issues.push(`Error crítico: ${msg}`);

    audit({
      action: 'API_REQUEST',
      outcome: 'failure',
      reason: `Disaster recovery falló: ${msg}`,
      dryRun: env.dryRun,
    });

    return report;
  }
};

/**
 * Reconstruye el estado mínimo necesario para operar.
 */
const rebuildMinimalState = async (): Promise<void> => {
  const runtimeDir = resolve('data/runtime');
  if (!existsSync(runtimeDir)) mkdirSync(runtimeDir, { recursive: true });

  // Crear archivos mínimos vacíos
  const minimalFiles = ['rate-limits.json', 'memory.json', 'events.json', 'crisis-state.json', 'emergency-state.json'];

  for (const file of minimalFiles) {
    const path = resolve(runtimeDir, file);
    if (!existsSync(path)) {
      writeFileSync(path, JSON.stringify({}, null, 2), 'utf-8');
      log.info(`Creado estado mínimo: ${file}`);
    }
  }

  // Crear directorio de audit
  const auditDir = resolve(runtimeDir, 'audit');
  if (!existsSync(auditDir)) mkdirSync(auditDir, { recursive: true });

  log.success('Estado mínimo reconstruido.');
};

/**
 * Crea un backup de emergencia antes de cualquier operación riesgosa.
 */
export const createEmergencyBackup = async (reason: string): Promise<void> => {
  log.step('Creando backup de emergencia...');
  await createBackup({ reason: `emergency-${reason}`, retentionDays: 30 });
};
