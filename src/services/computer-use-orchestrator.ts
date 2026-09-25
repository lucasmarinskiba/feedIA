/**
 * Computer Use Orchestrator — DESHABILITADO.
 *
 * Esto controlaba un navegador remoto (Browserless) para dar like/comentar/
 * seguir/ver stories en cuentas de TERCEROS ajenas usando el token OAuth de
 * Instagram real de la cuenta conectada — exactamente lo que AUTO-001/002/003
 * prohíben, y arriesga el baneo real de la cuenta.
 *
 * Además, executeEngagementTask() se llamaba desde
 * api/engagement-routes.ts SIN ningún middleware de autenticación — el
 * endpoint estaba público. Y getInstagramToken() ignora accountId por
 * completo (devuelve rows[0], la primera cuenta conectada) — es decir,
 * cualquiera en internet podía hacer que la cuenta conectada
 * siguiera/likeara/comentara en cualquier objetivo, gratis para el atacante,
 * a costo real (dinero + riesgo de baneo) para el dueño de la cuenta.
 * browserless-automation.ts además interpola message/targetPostId/
 * targetAccountId/igToken sin sanitizar dentro de un script que se ejecuta
 * server-side — inyección de código + posible exfiltración del token real.
 *
 * executeEngagementTask() ahora falla rápido y claro, sin resolver token,
 * presupuesto ni tocar Browserless. Ver services/browserless-automation.ts
 * para el mismo tratamiento en el nivel de abajo.
 */

import { log } from '../agent/logger.js';

export interface EngagementTask {
  accountId: string;
  action: 'like' | 'comment' | 'story-view' | 'follow';
  targetPostId?: string;
  targetAccountId?: string;
  message?: string; // for comments
}

export interface EngagementResult {
  success: boolean;
  action: string;
  accountId: string;
  cost: number; // USD
  rateLimitReached?: boolean;
  error?: string;
}

const DISABLED_REASON =
  'La automatización de engagement (like/comment/follow/story-view en cuentas de terceros vía Browserless) está deshabilitada: violaba las reglas de Instagram (AUTO-001/002/003) y el endpoint que la exponía no tenía autenticación. No se ejecuta.';

/**
 * Execute engagement task — DESHABILITADO. Ver comentario de archivo.
 */
export const executeEngagementTask = async (task: EngagementTask): Promise<EngagementResult> => {
  log.warn('[ComputerUseOrchestrator] Intento de engagement bloqueado (deshabilitado)', {
    accountId: task.accountId,
    action: task.action,
  });
  return {
    success: false,
    action: task.action,
    accountId: task.accountId,
    cost: 0,
    error: DISABLED_REASON,
  };
};

/**
 * Schedule daily engagement routine — DESHABILITADO. Ver comentario de archivo.
 */
export const scheduleDailyEngagementRoutine = async (
  accountId: string,
): Promise<{ executed: number; skipped: number; errors: number }> => {
  log.warn('[ComputerUseOrchestrator] Rutina de engagement diaria bloqueada (deshabilitada)', { accountId });
  return { executed: 0, skipped: 0, errors: 0 };
};

/**
 * Get engagement metrics (for feedback loop)
 */
export const getEngagementMetrics = (
  accountId: string,
): { likes: number; comments: number; follows: number; reaches: number } =>
  // TODO: Pull from account growth service + engagement tracking
  ({
    likes: 0,
    comments: 0,
    follows: 0,
    reaches: 0,
  });
