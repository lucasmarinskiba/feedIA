/**
 * Emergency Stop — Botón de Pánico
 *
 * Pausa TODAS las operaciones del sistema inmediatamente.
 * Útil ante:
 * - Detección de crisis de reputación
 * - Alerta de Meta sobre comportamiento sospechoso
 * - Baneo o restricción de cuenta
 * - Error humano grave
 *
 * Uso:
 *   import { emergencyStop } from './compliance/emergency.js';
 *   await emergencyStop({ reason: 'Cuenta baneada', initiatedBy: 'admin' });
 *
 * CLI:
 *   npm run dev emergency-stop --razon="..."
 */

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { env } from '../config/index.js';
import { log } from '../agent/logger.js';
import { sendAlert } from '../integrations/notifications.js';
import { audit } from './auditLog.js';

const EMERGENCY_STATE_FILE = resolve('data/runtime/emergency-state.json');

export interface EmergencyState {
  active: boolean;
  triggeredAt: string;
  reason: string;
  initiatedBy: string;
  actionsTaken: string[];
}

let inMemoryEmergency = false;

const ensureDir = (): void => {
  const dir = resolve('data/runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const saveState = (state: EmergencyState): void => {
  ensureDir();
  writeFileSync(EMERGENCY_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
};

export const isEmergencyActive = (): boolean => {
  if (inMemoryEmergency) return true;
  try {
    if (!existsSync(EMERGENCY_STATE_FILE)) return false;
    const raw = JSON.parse(require('node:fs').readFileSync(EMERGENCY_STATE_FILE, 'utf-8')) as EmergencyState;
    return raw.active;
  } catch {
    return false;
  }
};

/**
 * Activa el estado de emergencia y pausa todo.
 */
export const emergencyStop = async (opts: { reason: string; initiatedBy: string }): Promise<EmergencyState> => {
  log.error(`🚨 EMERGENCY STOP activado por ${opts.initiatedBy}: ${opts.reason}`);

  const actionsTaken: string[] = [];

  // 1. Pausar en memoria
  inMemoryEmergency = true;
  actionsTaken.push('emergency_flag_memory=true');

  // 2. Guardar estado en disco
  const state: EmergencyState = {
    active: true,
    triggeredAt: new Date().toISOString(),
    reason: opts.reason,
    initiatedBy: opts.initiatedBy,
    actionsTaken,
  };
  saveState(state);
  actionsTaken.push('state_saved_to_disk');

  // 3. Auditar
  audit({
    action: 'COMPLIANCE_BLOCKED',
    outcome: 'blocked',
    reason: `EMERGENCY STOP: ${opts.reason} (por ${opts.initiatedBy})`,
    dryRun: env.dryRun,
  });
  actionsTaken.push('audit_log_written');

  // 4. Notificar
  try {
    await sendAlert({
      severity: 'crisis',
      title: '🚨 EMERGENCY STOP ACTIVADO',
      body: `Razón: ${opts.reason}\nIniciado por: ${opts.initiatedBy}\nTimestamp: ${state.triggeredAt}\n\nTODAS las operaciones están pausadas. Revisar inmediatamente.`,
    });
    actionsTaken.push('alert_sent');
  } catch (err) {
    log.error(`No se pudo enviar alerta de emergencia: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 5. Actualizar estado con acciones
  state.actionsTaken = actionsTaken;
  saveState(state);

  log.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  log.error('  SISTEMA EN ESTADO DE EMERGENCIA');
  log.error(`  Razón: ${opts.reason}`);
  log.error('  Ninguna acción se ejecutará hasta reanudar');
  log.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  return state;
};

/**
 * Reanuda operaciones normales (solo después de investigación).
 */
export const resumeOperations = async (opts: { resumedBy: string; resolution: string }): Promise<EmergencyState> => {
  if (!isEmergencyActive()) {
    log.warn('No hay emergencia activa para reanudar.');
    return {
      active: false,
      triggeredAt: new Date().toISOString(),
      reason: 'No había emergencia activa',
      initiatedBy: opts.resumedBy,
      actionsTaken: [],
    };
  }

  log.success(`✅ Operaciones reanudadas por ${opts.resumedBy}: ${opts.resolution}`);

  inMemoryEmergency = false;

  const state: EmergencyState = {
    active: false,
    triggeredAt: new Date().toISOString(),
    reason: `Reanudado: ${opts.resolution}`,
    initiatedBy: opts.resumedBy,
    actionsTaken: ['emergency_cleared', 'operations_resumed'],
  };
  saveState(state);

  audit({
    action: 'API_REQUEST',
    outcome: 'success',
    reason: `EMERGENCY RESUMED: ${opts.resolution} (por ${opts.resumedBy})`,
    dryRun: env.dryRun,
  });

  await sendAlert({
    severity: 'info',
    title: '✅ Operaciones reanudadas',
    body: `Responsable: ${opts.resumedBy}\nResolución: ${opts.resolution}`,
  });

  return state;
};

/**
 * Verifica si una acción debe ser bloqueada por emergencia.
 * Llamar desde cualquier punto que ejecute acciones críticas.
 */
export const checkEmergencyBeforeAction = (actionDescription: string): boolean => {
  if (isEmergencyActive()) {
    log.error(`[EMERGENCY] Acción bloqueada: ${actionDescription}`);
    audit({
      action: 'COMPLIANCE_BLOCKED',
      outcome: 'blocked',
      reason: `Acción bloqueada por estado de emergencia activo: ${actionDescription}`,
      dryRun: env.dryRun,
    });
    return false;
  }
  return true;
};
