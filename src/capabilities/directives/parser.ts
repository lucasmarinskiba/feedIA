/**
 * Directive Parser — natural language → structured Directive
 * ─────────────────────────────────────────────────────────────────────────
 * Deterministic, dependency-free parse of the user's instruction. Extracts:
 *   • the action (publish carousel / respond DMs / …)
 *   • the recurrence (per day / per week / continuous / once)
 *   • the content spec (topic, format, branding, auto-publish)
 *
 * Works for voice transcripts and written board text. Always returns a
 * best-effort Directive plus a human-readable interpretation so the user
 * can confirm what FeedIA understood before it runs autonomously.
 */

import type { DirectiveAction, Recurrence, ContentSpec, Directive } from './types.js';

const deaccent = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const NUM_WORDS: Record<string, number> = {
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
};

const parseCount = (t: string): number => {
  const digit = t.match(/\b(\d{1,2})\b/);
  if (digit) return Math.max(1, Math.min(20, Number(digit[1])));
  for (const [w, n] of Object.entries(NUM_WORDS)) {
    if (new RegExp(`\\b${w}\\b`).test(t)) return n;
  }
  return 1;
};

const detectAction = (t: string): DirectiveAction => {
  if (/\bcarrusel|carousel\b/.test(t)) return 'publish-carousel';
  if (/\breel|reels\b/.test(t)) return 'publish-reel';
  if (/\bhistoria|story|stories\b/.test(t)) return 'publish-story';
  if (/\bpost|foto|imagen\b/.test(t) && /\b(sub[ií]|public|crea)/.test(t)) return 'publish-post';
  if (/\b(respond|contesta).*(mensaje|dm|privad)/.test(t)) return 'respond-dms';
  if (/\b(respond|contesta).*(comentario)/.test(t)) return 'respond-comments';
  if (/\b(comenta|interactu).*(faro|cuenta|referencia)/.test(t)) return 'engage-faro';
  if (/\b(crec|aumenta|seguidor|gana).*(cuenta|seguidor)/.test(t)) return 'grow-followers';
  if (/\baudit|auditor[ií]a|kpi\b/.test(t)) return 'audit';
  if (/\boptimiz|mejora la estrategia\b/.test(t)) return 'optimize';
  if (/\bplanific|plan de la semana|calendario\b/.test(t)) return 'plan-week';
  return 'custom';
};

const detectRecurrence = (t: string): Recurrence => {
  if (
    /(todos los|cada vez|siempre que llegue|en cuanto llegue|continuamente|todo el|cualquier)/.test(t) &&
    /(mensajes?|dms?|comentarios?|privado|inbox)/.test(t)
  ) {
    return { kind: 'continuous' };
  }
  if (/\bcada hora|por hora\b/.test(t)) return { kind: 'hourly', everyHours: 1 };
  const everyN = t.match(/cada (\d+) horas?/);
  if (everyN) return { kind: 'hourly', everyHours: Number(everyN[1]) };

  if (/\b(por d[ií]a|al d[ií]a|diari|cada d[ií]a|todos los d[ií]as)\b/.test(t)) {
    return { kind: 'daily', times: parseCount(t), hour: detectHour(t) };
  }
  if (/\b(por semana|a la semana|semanal|cada semana)\b/.test(t)) {
    return { kind: 'weekly', times: parseCount(t) };
  }
  if (/\b(una vez|hoy|ma[nñ]ana|ahora|ya)\b/.test(t)) {
    return { kind: 'once' };
  }
  // Default for publish actions with a count → daily.
  return { kind: 'daily', times: parseCount(t), hour: detectHour(t) };
};

const detectHour = (t: string): number | undefined => {
  const h = t.match(/\ba las (\d{1,2})\b/);
  if (h) return Math.max(0, Math.min(23, Number(h[1])));
  if (/\bma[nñ]ana temprano|al amanecer\b/.test(t)) return 8;
  if (/\bal mediod[ií]a\b/.test(t)) return 13;
  if (/\bpor la tarde\b/.test(t)) return 18;
  if (/\bpor la noche\b/.test(t)) return 21;
  return undefined;
};

const detectTopic = (raw: string): string | undefined => {
  const m = raw.match(/\bsobre ([^.,;]+)/i) || raw.match(/\bde ([^.,;]+)/i);
  const topic = m?.[1]?.trim();
  if (!topic) return undefined;
  // Strip trailing recurrence words from the captured topic.
  return topic.replace(/\b(por d[ií]a|por semana|al d[ií]a|diario|cada [^ ]+)\b.*$/i, '').trim() || undefined;
};

const ACTION_FORMAT: Partial<Record<DirectiveAction, ContentSpec['format']>> = {
  'publish-carousel': 'carrusel',
  'publish-reel': 'reel',
  'publish-story': 'historia',
  'publish-post': 'post-imagen',
};

let _seq = 0;
const newId = (): string =>
  `dir-${Date.now().toString(36)}-${(++_seq).toString(36)}-${Math.random().toString(36).slice(2, 5)}`;

export interface ParseResult {
  directive: Omit<Directive, 'brandId' | 'source'>;
}

export const parseDirective = (rawText: string): ParseResult => {
  const t = deaccent(rawText);
  const action = detectAction(t);
  const recurrence = detectRecurrence(t);
  const topic = detectTopic(rawText);
  const format = ACTION_FORMAT[action];

  // Auto-publish only for publish actions and only if the user didn't ask
  // for review/approval; respond actions always act.
  const wantsReview = /\b(revis|aprob|borrador|antes de publicar|para que vea)\b/.test(t);
  const isPublish = action.startsWith('publish-');
  const contentSpec: ContentSpec = {
    topic,
    format,
    applyBranding: true,
    autoPublish: isPublish ? !wantsReview : true,
  };

  const interpretation = buildInterpretation(action, recurrence, contentSpec, topic);

  return {
    directive: {
      id: newId(),
      rawText,
      action,
      recurrence,
      contentSpec,
      status: 'active',
      createdAt: new Date().toISOString(),
      runCount: 0,
      interpretation,
    },
  };
};

const recurrenceLabel = (r: Recurrence): string => {
  switch (r.kind) {
    case 'once':
      return 'una vez';
    case 'daily':
      return `${r.times}× por día${r.hour != null ? ` (~${r.hour}h)` : ''}`;
    case 'weekly':
      return `${r.times}× por semana`;
    case 'hourly':
      return `cada ${r.everyHours}h`;
    case 'continuous':
      return 'continuamente (cada ciclo)';
  }
};

const ACTION_LABEL: Record<DirectiveAction, string> = {
  'publish-carousel': 'producir y publicar un carrusel',
  'publish-reel': 'producir y publicar un reel',
  'publish-story': 'producir y publicar una historia',
  'publish-post': 'producir y publicar un post',
  'respond-dms': 'responder los mensajes directos',
  'respond-comments': 'responder los comentarios',
  'engage-faro': 'comentar en cuentas faro del nicho',
  'grow-followers': 'ejecutar un playbook de crecimiento',
  audit: 'correr la auditoría de KPIs',
  optimize: 'correr el loop de auto-optimización',
  'plan-week': 'planificar el calendario de la semana',
  custom: 'ejecutar la orden vía el equipo de especialistas',
};

const buildInterpretation = (
  action: DirectiveAction,
  recurrence: Recurrence,
  spec: ContentSpec,
  topic?: string,
): string => {
  const parts = [`FeedIA va a ${ACTION_LABEL[action]}`];
  if (topic) parts.push(`sobre "${topic}"`);
  parts.push(`— ${recurrenceLabel(recurrence)}`);
  if (action.startsWith('publish-')) {
    parts.push(
      spec.autoPublish ? '· con branding y publicación automática' : '· con branding, dejándolo para tu aprobación',
    );
  }
  return parts.join(' ');
};

/** Compute the next run timestamp from a recurrence, relative to `from`. */
export const computeNextRun = (recurrence: Recurrence, from: Date = new Date()): string | undefined => {
  const d = new Date(from);
  switch (recurrence.kind) {
    case 'once':
      return recurrence.at ?? d.toISOString();
    case 'continuous':
      return new Date(d.getTime() + 60_000).toISOString(); // next minute
    case 'hourly':
      return new Date(d.getTime() + recurrence.everyHours * 3_600_000).toISOString();
    case 'daily': {
      const next = new Date(d);
      next.setHours(recurrence.hour ?? 9, 0, 0, 0);
      if (next <= d) next.setDate(next.getDate() + 1);
      return next.toISOString();
    }
    case 'weekly': {
      const next = new Date(d);
      next.setDate(next.getDate() + Math.max(1, Math.floor(7 / recurrence.times)));
      next.setHours(10, 0, 0, 0);
      return next.toISOString();
    }
  }
};
