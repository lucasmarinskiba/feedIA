/**
 * TikTok LIVE Chat Moderation — asiste al creador durante un LIVE (TT-LIVE-001):
 * clasifica comentarios entrantes en tiempo real y SUGIERE qué ocultar o qué
 * leer en voz alta. Nunca ejecuta una acción real sobre el chat (banear,
 * eliminar, silenciar) — eso requiere la sesión/API propia y autorizada del
 * creador. Esto es lectura y clasificación, no automatización de moderación.
 */

import * as tiktokGuardian from '../../compliance/tiktokGuardian.js';

export type ModerationAction = 'allow' | 'hide-suggested' | 'read-aloud-candidate';

export interface LiveComment {
  id: string;
  authorUsername: string;
  text: string;
}

export interface ModerationVerdict {
  commentId: string;
  action: ModerationAction;
  reason?: string;
}

/** Patrones de spam/abuso obvio — mismo criterio que un moderador humano aplicaría a simple vista. */
const SPAM_PATTERNS: RegExp[] = [
  /💰💰💰/,
  /\bclick\s+here\b/i,
  /\bt\.me\/|telegram\.me\b/i,
  /\bbit\.ly\/\w+/i,
  /\bseguime\s+y\s+te\s+sigo\b/i,
  /\bgan[aá]\s+dinero\s+f[aá]cil\b/i,
];

const ABUSE_PATTERNS: RegExp[] = [
  /\b(matate|muerete|hijo\s+de\s+puta|concha\s+tu\s+madre)\b/i,
  /\b(te\s+voy\s+a\s+encontrar|me\s+vas\s+a\s+pagar)\b/i,
];

/** Comentarios que valen la pena leer en voz alta: preguntas genuinas o elogios claros — no spam ni abuso. */
const READ_ALOUD_HINTS: RegExp[] = [
  /\?\s*$/,
  /\b(pregunta|duda)\b/i,
  /\b(genial|increíble|te\s+amo|sos\s+lo\s+m[aá]s)\b/i,
];

export const moderateComment = (comment: LiveComment): ModerationVerdict => {
  if (ABUSE_PATTERNS.some((re) => re.test(comment.text))) {
    return { commentId: comment.id, action: 'hide-suggested', reason: 'Lenguaje abusivo/amenazante' };
  }
  if (SPAM_PATTERNS.some((re) => re.test(comment.text))) {
    return { commentId: comment.id, action: 'hide-suggested', reason: 'Patrón de spam' };
  }
  if (READ_ALOUD_HINTS.some((re) => re.test(comment.text))) {
    return { commentId: comment.id, action: 'read-aloud-candidate' };
  }
  return { commentId: comment.id, action: 'allow' };
};

export interface BatchModerationResult {
  verdicts: ModerationVerdict[];
  counts: Record<ModerationAction, number>;
  blocked: boolean;
  blockedReason?: string;
}

/**
 * Clasifica un lote de comentarios de un LIVE. Pasa por el guardian igual que
 * cualquier otra acción — un volumen anómalo (mucho más alto de lo esperable
 * para un chat real) activa el mismo rate limit que protege el resto del
 * sistema, como defensa en profundidad.
 */
export const batchModerate = (comments: LiveComment[], actor = 'tiktok-live-moderator'): BatchModerationResult => {
  const decision = tiktokGuardian.evaluate('live_moderate', { actor });
  if (!decision.allowed) {
    return {
      verdicts: [],
      counts: { allow: 0, 'hide-suggested': 0, 'read-aloud-candidate': 0 },
      blocked: true,
      blockedReason: decision.reason,
    };
  }
  tiktokGuardian.recordSuccess('live_moderate', { actor });

  const verdicts = comments.map(moderateComment);
  const counts: Record<ModerationAction, number> = { allow: 0, 'hide-suggested': 0, 'read-aloud-candidate': 0 };
  for (const v of verdicts) counts[v.action] += 1;

  return { verdicts, counts, blocked: false };
};
