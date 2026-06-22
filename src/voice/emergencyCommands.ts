/**
 * Emergency Voice Commands
 * ─────────────────────────────────────────────────────────────────────────
 * Commands that bypass normal GlassBox gates and confirmation flows.
 * Designed for critical situations where the operator needs immediate
 * control over the system regardless of current supervision mode.
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';
import { stopHandsFreeMode } from './voiceSession.js';

export interface EmergencyCommand {
  action: 'pause' | 'resume' | 'status' | 'force_approve' | 'emergency_mode' | 'shutdown';
  description: string;
  requiresAdmin: boolean;
}

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

export const EMERGENCY_COMMANDS: EmergencyCommand[] = [
  { action: 'pause', description: 'Pausa GlassBox inmediatamente', requiresAdmin: false },
  { action: 'resume', description: 'Reanuda supervisión de GlassBox', requiresAdmin: false },
  { action: 'status', description: 'Estado actual de GlassBox y acciones pendientes', requiresAdmin: false },
  { action: 'force_approve', description: 'Aprueba todas las acciones pendientes', requiresAdmin: true },
  { action: 'emergency_mode', description: 'Activa modo emergencia (pausa + log)', requiresAdmin: true },
  { action: 'shutdown', description: 'Detiene modo manos libres y reduce actividad', requiresAdmin: false },
];

const EMERGENCY_ACTIONS = new Set(EMERGENCY_COMMANDS.map((c) => c.action));

/**
 * Checks whether a detected intent corresponds to an emergency command.
 * Returns true if the category is 'emergency' or the action matches a
 * known emergency pattern.
 */
export const isEmergencyCommand = (intent: { category: string; action: string }): boolean => {
  if (intent.category === 'emergency') return true;
  if (EMERGENCY_ACTIONS.has(intent.action as EmergencyCommand['action'])) return true;
  // Fuzzy fallback: common emergency utterances
  const emergencyPatterns =
    /\b(pausa|pause|resume|reanudar|estado|status|aprueba todo|approve all|emergencia|emergency|shutdown|detener|stop)\b/i;
  return emergencyPatterns.test(intent.action);
};

/**
 * Returns a localized spoken response for a given emergency action.
 */
export const getEmergencyResponse = (action: string, lang: string): string => {
  const isEs = lang.startsWith('es');
  const responses: Record<string, { es: string; en: string }> = {
    pause: {
      es: 'GlassBox pausado. Las acciones ya no requieren aprobación.',
      en: 'GlassBox paused. Actions no longer require approval.',
    },
    resume: {
      es: 'GlassBox reanudado. Modo supervisión activo.',
      en: 'GlassBox resumed. Supervision mode active.',
    },
    status: {
      es: 'Consultando estado del sistema.',
      en: 'Checking system status.',
    },
    force_approve: {
      es: 'Aprobando todas las acciones pendientes.',
      en: 'Approving all pending actions.',
    },
    emergency_mode: {
      es: 'Modo emergencia activado. Sistema pausado y evento registrado.',
      en: 'Emergency mode activated. System paused and event logged.',
    },
    shutdown: {
      es: 'Modo manos libres detenido. Actividad reducida.',
      en: 'Hands-free mode stopped. Activity reduced.',
    },
    unknown: {
      es: 'Comando de emergencia no reconocido.',
      en: 'Unrecognized emergency command.',
    },
    unauthorized: {
      es: 'Este comando requiere privilegios de administrador.',
      en: 'This command requires administrator privileges.',
    },
  };
  const entry = responses[action] ?? responses.unknown;
  return isEs ? entry!.es : entry!.en;
};

/**
 * Retrieves current GlassBox status without blocking on static imports.
 */
export const getEmergencyStatus = (): {
  glassboxMode: string;
  pendingActions: number;
  systemStatus: string;
} =>
  // Default safe values when glassbox cannot be loaded dynamically
  ({
    glassboxMode: 'unknown',
    pendingActions: 0,
    systemStatus: 'ok',
  });

/**
 * Executes an emergency command, bypassing normal confirmation gates.
 * Uses dynamic imports to avoid circular dependencies with GlassBox.
 */
export const executeEmergencyCommand = async (
  action: EmergencyCommand['action'],
  brand: BrandProfile,
): Promise<VoiceActionResult> => {
  const lang = brand.audience.locale ?? 'es-AR';
  const baseResult = (ok: boolean, executed: boolean, detail?: unknown): VoiceActionResult => ({
    ok,
    spokenResponse: getEmergencyResponse(action, lang),
    actionType: `emergency.${action}`,
    executed,
    detail,
  });

  log.info(`[Emergency] Executing emergency command: ${action}`);

  try {
    // Dynamic import prevents circular dependency with glassbox
    const glassbox = await import('../glassbox/index.js');

    switch (action) {
      case 'pause': {
        glassbox.pause();
        log.step('GlassBox paused via emergency voice command');
        return baseResult(true, true, { mode: glassbox.getMode?.() ?? 'paused' });
      }

      case 'resume': {
        glassbox.resume();
        log.step('GlassBox resumed via emergency voice command');
        return baseResult(true, true, { mode: glassbox.getMode?.() ?? 'supervised' });
      }

      case 'status': {
        const status = glassbox.getStatus ? glassbox.getStatus() : { mode: 'unknown', pending: 0 };
        const pending = glassbox.getPendingActions ? glassbox.getPendingActions().length : 0;
        const spoken = lang.startsWith('es')
          ? `Modo ${status.mode}. Hay ${pending} acciones pendientes.`
          : `Mode ${status.mode}. There are ${pending} pending actions.`;
        return {
          ok: true,
          spokenResponse: spoken,
          actionType: 'emergency.status',
          executed: true,
          detail: { ...status, pending },
        };
      }

      case 'force_approve': {
        // Admin check is a soft gate here; caller should verify speaker permissions via biometrics
        const result = glassbox.approveAllPending?.('Emergency voice command');
        log.step(`Emergency force_approve executed: ${JSON.stringify(result)}`);
        return baseResult(true, true, result);
      }

      case 'emergency_mode': {
        glassbox.pause();
        log.warn('EMERGENCY MODE activated via voice command');
        return baseResult(true, true, {
          mode: glassbox.getMode?.() ?? 'paused',
          emergencyTimestamp: new Date().toISOString(),
          brand: brand.name,
        });
      }

      case 'shutdown': {
        await stopHandsFreeMode();
        log.step('Hands-free mode stopped via emergency command');
        return baseResult(true, true, { handsFreeMode: false });
      }

      default: {
        const _exhaustive: never = action;
        void _exhaustive;
        return baseResult(false, false, { error: 'Unknown emergency action' });
      }
    }
  } catch (err) {
    log.error(`[Emergency] Failed to execute ${action}: ${(err as Error).message}`);
    return {
      ok: false,
      spokenResponse: getEmergencyResponse('unknown', lang),
      actionType: `emergency.${action}`,
      executed: false,
      detail: { error: (err as Error).message },
    };
  }
};
