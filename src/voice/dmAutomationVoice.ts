/**
 * Voice DM Automation — Configuración de automatización de DMs por voz
 * ─────────────────────────────────────────────────────────────────────────
 * Triggers automáticos, smart first comment, respuestas por palabra clave.
 */

import { log } from '../agent/logger.js';

export interface DMActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
}

const getLang = (): string => {
  const locale = process.env['TTS_LANGUAGE'] ?? 'es-AR';
  return locale.startsWith('en') ? 'en' : 'es';
};

/* ── Setup Auto Reply ────────────────────────────────────────────────────── */

export const setupAutoReply = async (keyword: string, message: string): Promise<DMActionResult> => {
  const lang = getLang();
  if (!keyword || !message) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Need keyword and message.' : 'Necesito palabra clave y mensaje.',
      actionType: 'dm:auto_reply',
      executed: false,
    };
  }
  log.info(`[DMVoice] Auto-reply setup for keyword "${keyword}"`);
  return {
    ok: true,
    spokenResponse:
      lang === 'en' ? `Auto-reply configured for "${keyword}".` : `Respuesta automática configurada para "${keyword}".`,
    actionType: 'dm:auto_reply',
    executed: true,
    detail: { keyword, message },
  };
};

/* ── List Active Triggers ────────────────────────────────────────────────── */

export const listActiveTriggers = async (): Promise<DMActionResult> => {
  const lang = getLang();
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? 'Here are your active DM automation triggers.'
        : 'Acá están tus triggers de automatización de DMs activos.',
    actionType: 'dm:list_triggers',
    executed: false,
    detail: { triggers: [] },
  };
};

/* ── Enable Smart First Comment ──────────────────────────────────────────── */

export const enableSmartFirstComment = async (messages?: string[]): Promise<DMActionResult> => {
  const lang = getLang();
  const defaultMessages = messages ?? ['¿Te gustó? Guardalo 📌', '¿Querés que hagamos uno de estos? Comentá 👇'];
  log.info('[DMVoice] Smart first comment enabled');
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? 'Smart first comment enabled with rotating messages.'
        : 'Smart first comment activado con mensajes rotativos.',
    actionType: 'dm:smart_comment',
    executed: true,
    detail: { messages: defaultMessages },
  };
};

/* ── Disable Trigger ─────────────────────────────────────────────────────── */

export const disableTrigger = async (triggerId: string): Promise<DMActionResult> => {
  const lang = getLang();
  if (!triggerId) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Need trigger ID.' : 'Necesito el ID del trigger.',
      actionType: 'dm:disable_trigger',
      executed: false,
    };
  }
  log.info(`[DMVoice] Disabling trigger ${triggerId}`);
  return {
    ok: true,
    spokenResponse: lang === 'en' ? `Trigger ${triggerId} disabled.` : `Trigger ${triggerId} desactivado.`,
    actionType: 'dm:disable_trigger',
    executed: true,
    detail: { triggerId },
  };
};
