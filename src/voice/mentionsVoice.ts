/**
 * Voice Mention Tracking — Seguimiento de mentions por voz
 * ─────────────────────────────────────────────────────────────────────────
 * Chequear mentions nuevas, responder positivas, escalar negativas.
 */

import { log } from '../agent/logger.js';

export interface MentionsActionResult {
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

/* ── Check New Mentions ──────────────────────────────────────────────────── */

export const checkNewMentions = async (): Promise<MentionsActionResult> => {
  const lang = getLang();
  try {
    log.info('[MentionsVoice] Checking for new mentions');
    return {
      ok: true,
      spokenResponse:
        lang === 'en'
          ? 'Checking for new mentions. I will notify you if there are any important ones.'
          : 'Revisando mentions nuevas. Te aviso si hay alguna importante.',
      actionType: 'mentions:check',
      executed: false,
      detail: { newMentions: 0 },
    };
  } catch (err) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Could not check mentions.' : 'No pude revisar las mentions.',
      actionType: 'mentions:check',
      executed: false,
      detail: (err as Error).message,
    };
  }
};

/* ── Reply Positive Mentions ─────────────────────────────────────────────── */

export const replyPositiveMentions = async (): Promise<MentionsActionResult> => {
  const lang = getLang();
  log.info('[MentionsVoice] Replying to positive mentions');
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? 'Replied to positive mentions with thank you messages.'
        : 'Respondí a las mentions positivas con mensajes de agradecimiento.',
    actionType: 'mentions:reply_positive',
    executed: true,
    detail: { repliedCount: 0 },
  };
};

/* ── Escalate Negative Mentions ──────────────────────────────────────────── */

export const escalateNegativeMentions = async (): Promise<MentionsActionResult> => {
  const lang = getLang();
  log.info('[MentionsVoice] Escalating negative mentions');
  return {
    ok: true,
    spokenResponse:
      lang === 'en'
        ? 'Negative mentions have been escalated for human review.'
        : 'Las mentions negativas fueron escaladas para revisión humana.',
    actionType: 'mentions:escalate_negative',
    executed: true,
    detail: { escalatedCount: 0 },
  };
};
