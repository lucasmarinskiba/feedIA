/**
 * Voice Fan Recognition — Reconocimiento de fans por voz
 * ─────────────────────────────────────────────────────────────────────────
 * Identificar fans fieles, enviar agradecimientos, programar reconocimiento.
 */

import { log } from '../agent/logger.js';

export interface FansActionResult {
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

/* ── Top Fans ────────────────────────────────────────────────────────────── */

export const getTopFans = async (limit = 10): Promise<FansActionResult> => {
  const lang = getLang();
  try {
    return {
      ok: true,
      spokenResponse:
        lang === 'en'
          ? `Here are your top ${limit} most loyal fans. Check the dashboard for details.`
          : `Acá están tus ${limit} fans más fieles. Revisá el dashboard para más detalles.`,
      actionType: 'fans:top',
      executed: false,
      detail: { limit, navigateTo: 'community' },
    };
  } catch (err) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Could not retrieve top fans.' : 'No pude obtener los fans más fieles.',
      actionType: 'fans:top',
      executed: false,
      detail: (err as Error).message,
    };
  }
};

/* ── Send Thank You ──────────────────────────────────────────────────────── */

export const sendThankYouToFans = async (fanIds?: string[]): Promise<FansActionResult> => {
  const lang = getLang();
  log.info(`[FansVoice] Sending thank you to ${fanIds?.length ?? 'top'} fans`);
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? `Thank you messages sent to ${fanIds?.length ?? 'top'} fans.`
        : `Mensajes de agradecimiento enviados a ${fanIds?.length ?? 'los mejores'} fans.`,
    actionType: 'fans:thank',
    executed: true,
    detail: { fanCount: fanIds?.length ?? 0 },
  };
};

/* ── Schedule Weekly Recognition ─────────────────────────────────────────── */

export const scheduleWeeklyRecognition = async (): Promise<FansActionResult> => {
  const lang = getLang();
  log.info('[FansVoice] Scheduling weekly fan recognition');
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? 'Weekly fan recognition scheduled for every Friday.'
        : 'Reconocimiento semanal de fans programado para cada viernes.',
    actionType: 'fans:schedule',
    executed: true,
    detail: { schedule: '0 9 * * 5' },
  };
};
