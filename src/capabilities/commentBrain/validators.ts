/**
 * Validación determinista de la respuesta ya redactada.
 *
 * El LLM propone; estas reglas disponen. Cualquier issue `block` impide el
 * envío automático (la respuesta se degrada a borrador para revisión).
 */

import { auditContentForEmptyPromises } from '../antiPromiseAuditor/antiPromiseAuditor.js';
import type { BrandProfile } from '../../config/types.js';
import type { ValidationIssue } from './types.js';

export interface ValidateOptions {
  brand: BrandProfile;
  commenterHandle: string;
  /** Últimas respuestas enviadas por esta cuenta (anti-patrón de bot). */
  recentReplies: string[];
  /** Datos verificados citables. Sirven para permitir precios que sí están respaldados. */
  facts: string[];
  maxChars?: number;
  /** Inyectable en tests: el auditor real escribe en el audit log. */
  promiseVerdict?: (text: string) => 'clean' | 'soft-promise' | 'hard-promise';
}

const DEFAULT_MAX_CHARS = 280;
const REPEAT_SIMILARITY = 0.6;

const strip = (s: string): string =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const words = (s: string): Set<string> =>
  new Set(
    strip(s)
      .replace(/[^a-z0-9ñ\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 3),
  );

/** Similitud Jaccard de vocabulario, 0-1. */
export const similarity = (a: string, b: string): number => {
  const wa = words(a);
  const wb = words(b);
  if (wa.size === 0 || wb.size === 0) return 0;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  return inter / (wa.size + wb.size - inter);
};

const URL_REGEX = /(https?:\/\/|www\.|\b[\w-]+\.(?:com|ar|mx|es|co|net|io|me|ly)\b)/i;
const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[\w.]+/;
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/;
const HASHTAG_REGEX = /#\w+/;
const MENTION_REGEX = /@([\w.]+)/g;
const PRICE_REGEX = /(?:[$€£]\s?\d[\d.,]*|\b\d[\d.,]*\s?(?:usd|ars|mxn|eur|pesos|d[oó]lares|euros)\b)/i;
const AI_TELL_REGEX =
  /(como (?:una? )?(?:ia|inteligencia artificial|modelo de lenguaje)|as an ai|soy un (?:bot|asistente virtual))/i;
const CORPORATE_OPENER_REGEX = /^\s*(?:¡?gracias por (?:tu|su) comentario|estimad[oa]|apreciad[oa]|le informamos)/i;
const EMOJI_REGEX = /\p{Extended_Pictographic}/gu;

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const defaultPromiseVerdict = (text: string): 'clean' | 'soft-promise' | 'hard-promise' =>
  auditContentForEmptyPromises(text).verdict;

export const validateReply = (text: string, opts: ValidateOptions): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  const block = (code: string, detail: string): void => {
    issues.push({ code, severity: 'block', detail });
  };
  const warn = (code: string, detail: string): void => {
    issues.push({ code, severity: 'warn', detail });
  };

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    block('vacio', 'la respuesta está vacía');
    return issues;
  }
  if (trimmed.length > (opts.maxChars ?? DEFAULT_MAX_CHARS)) {
    block('muy-largo', `${trimmed.length} caracteres`);
  }

  const normalized = strip(trimmed);
  for (const forbidden of opts.brand.voice.forbidden) {
    const f = strip(forbidden).trim();
    if (f && new RegExp(`(^|[^a-z0-9ñ])${escapeRegex(f)}([^a-z0-9ñ]|$)`).test(normalized)) {
      block('palabra-prohibida', forbidden);
    }
  }

  if (URL_REGEX.test(trimmed) || EMAIL_REGEX.test(trimmed) || PHONE_REGEX.test(trimmed)) {
    block('contacto-o-link', 'links, mails o teléfonos no van en respuestas públicas');
  }
  if (HASHTAG_REGEX.test(trimmed)) block('hashtag', 'sin hashtags en respuestas');

  const commenter = opts.commenterHandle.replace(/^@/, '').toLowerCase();
  for (const m of trimmed.matchAll(MENTION_REGEX)) {
    const mentioned = (m[1] ?? '').toLowerCase();
    if (mentioned && mentioned !== commenter) block('mencion-ajena', `@${mentioned}`);
  }

  const price = trimmed.match(PRICE_REGEX);
  if (price) {
    const digits = price[0].replace(/[^\d]/g, '');
    const backed = opts.facts.some((f) => f.replace(/[^\d]/g, '').includes(digits));
    if (!backed) block('precio-no-verificado', price[0]);
  }

  if (AI_TELL_REGEX.test(trimmed)) block('delata-ia', 'menciona ser IA/bot');

  const letters = trimmed.replace(/[^\p{L}]/gu, '');
  if (letters.length > 10) {
    const upper = letters.replace(/[^\p{Lu}]/gu, '').length;
    if (upper / letters.length > 0.6) block('gritando', 'demasiadas mayúsculas');
  }

  const verdict = (opts.promiseVerdict ?? defaultPromiseVerdict)(trimmed);
  if (verdict === 'hard-promise') block('promesa-dura', 'promete resultados que la marca no puede sostener');

  for (const recent of opts.recentReplies) {
    if (similarity(trimmed, recent) >= REPEAT_SIMILARITY) {
      block('repetida', 'demasiado parecida a una respuesta reciente (patrón de bot)');
      break;
    }
  }

  if ((trimmed.match(EMOJI_REGEX) ?? []).length > 2) warn('muchos-emojis', 'más de 2 emojis');
  if (CORPORATE_OPENER_REGEX.test(trimmed)) warn('tono-corporativo', 'arranque de call center');
  if (verdict === 'soft-promise') warn('promesa-blanda', 'lenguaje de promesa vaga');

  return issues;
};

export const hasBlockingIssue = (issues: ValidationIssue[]): boolean => issues.some((i) => i.severity === 'block');
