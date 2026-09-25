/**
 * Browserless Automation Service — DESHABILITADO.
 *
 * Controlaba un navegador remoto (browserless.io) para dar like/comentar/
 * seguir/ver stories en cuentas de TERCEROS ajenas — automatización de
 * engagement fuera de la API oficial, prohibida por Instagram (AUTO-001/
 * 002/003) y con riesgo real de baneo de cuenta.
 *
 * Además tenía una vulnerabilidad real de inyección: buildPayload()
 * interpolaba message/targetPostId/targetAccountId/igToken SIN sanitizar
 * dentro de un string de código JS que se mandaba a Browserless para
 * ejecutar server-side — cualquiera que llamara a esto con un `message`
 * malicioso podía inyectar código arbitrario en ese contexto, incluyendo
 * exfiltrar el token real de Instagram (igToken) que también iba embebido
 * en el mismo string. Se llamaba, además, desde un endpoint público sin
 * autenticación (api/engagement-routes.ts) — ver services/
 * computer-use-orchestrator.ts para ese lado del fix.
 *
 * executeBrowserlessAction() ahora nunca construye ni envía ese payload.
 */

import { log } from '../agent/logger.js';

export interface BrowserlessAction {
  action: 'like' | 'comment' | 'follow' | 'story-view';
  targetPostId?: string;
  targetAccountId?: string;
  message?: string; // for comments
}

export interface BrowserlessResult {
  ok: boolean;
  action: string;
  durationMs: number;
  error?: string;
}

/**
 * Execute Instagram action via Browserless — DESHABILITADO. Ver comentario de archivo.
 */
export const executeBrowserlessAction = async (
  task: BrowserlessAction,
  _igToken: string,
  _browserlessKey?: string,
): Promise<BrowserlessResult> => {
  log.warn('[Browserless] Automatización de engagement bloqueada (deshabilitada)', { action: task.action });
  return {
    ok: false,
    action: task.action,
    durationMs: 0,
    error:
      'Automatización de engagement en cuentas de terceros deshabilitada por riesgo de baneo de cuenta y por una vulnerabilidad de inyección en el payload — no se ejecuta.',
  };
};
