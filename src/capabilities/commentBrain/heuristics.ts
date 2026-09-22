/**
 * Heurísticas deterministas del Comment Brain.
 *
 * Tres usos, en orden de importancia:
 *  1. `detectHardFlags`: escalamiento duro. Se aplica SIEMPRE, por encima de lo
 *     que diga el LLM (legal, salud, amenazas, autolesión).
 *  2. `prefilter`: descarta sin gastar tokens lo obvio (solo emojis, spam claro).
 *  3. `heuristicClassify`: red de seguridad cuando el LLM falla. Siempre con
 *     confianza baja para que la política mande el caso a revisión humana.
 */

import type { Classification, CommentKind } from './types.js';

/**
 * `\b` de JS solo considera ASCII como "palabra": no hay límite entre "ó" y un
 * espacio, así que /\bmuri[oó]\b/ jamás matchea "murió". Este helper usa límites
 * Unicode (letras/dígitos) en su lugar.
 */
const wordRegex = (body: string): RegExp => new RegExp(String.raw`(?<![\p{L}\d_])(?:${body})(?![\p{L}\d_])`, 'iu');

const HARD_FLAG_PATTERNS: Array<{ flag: string; regex: RegExp }> = [
  {
    flag: 'legal',
    regex: wordRegex(
      String.raw`abogad[oa]s?|demanda\p{L}*|denunci\p{L}+|defensa del consumidor|chargeback|contracargo|estaf\p{L}+|fraud\p{L}+`,
    ),
  },
  {
    flag: 'autolesion',
    regex: wordRegex(String.raw`suicid\p{L}*|me quiero morir|quiero morirme|matarme|hacerme da[ñn]o|no quiero vivir`),
  },
  {
    flag: 'salud-seguridad',
    regex: wordRegex(
      String.raw`me intoxiqu\p{L}*|me enferm\p{L}*|intoxicaci[oó]n|alergia|al[eé]rgic[oa]|me lastim\p{L}*|me quem[oó]|urgencias|hospital|sangr\p{L}*`,
    ),
  },
  {
    flag: 'amenaza',
    regex: wordRegex(
      String.raw`te voy a (?:matar|buscar|reventar)|s[eé] d[oó]nde (?:viv[ií]s|vives|trabaj\p{L}*)|van a pagar`,
    ),
  },
];

export const detectHardFlags = (text: string): string[] =>
  HARD_FLAG_PATTERNS.filter(({ regex }) => regex.test(text)).map(({ flag }) => flag);

const SENSITIVE_TOPIC_REGEX = wordRegex(
  String.raw`muri[oó]|muerte|fallec\p{L}*|funeral|c[aá]ncer|tumor|enfermedad terminal|tragedia|atentado|guerra|v[ií]ctimas?|violaci[oó]n|abuso|acoso|suicid\p{L}*|pol[ií]tic\p{L}*|elecciones|presidente|religi[oó]n|dios|racis\p{L}*|xenof\p{L}*`,
);

/** ¿El tema (del comentario o del post) hace inapropiado cualquier chiste? */
export const isSensitiveTopic = (...texts: Array<string | undefined>): boolean =>
  texts.some((t) => Boolean(t) && SENSITIVE_TOPIC_REGEX.test(t as string));

// Explícito a propósito: \p{Emoji_Component} incluiría dígitos y '#', y un comentario "3" no es un emoji.
const EMOJI_ONLY_REGEX = /^[\p{Extended_Pictographic}\u{200D}\u{FE0F}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\s]+$/u;

const SPAM_REGEX = new RegExp(
  String.raw`bit\.ly/|t\.me/|wa\.me/|(?<![\p{L}\d_])(?:f4f|s4s)(?![\p{L}\d_])|gan[aá]r? dinero (?:desde|r[aá]pido)|s[ií]gueme y te sigo|vendo seguidores|promo en mi perfil|check (?:my|out my) (?:page|profile|bio)|dm (?:me )?for promo|inversi[oó]n garantizada|cripto(?:moneda)? garantizad`,
  'iu',
);

/** Devuelve una clasificación sin LLM para casos triviales, o null si hay que analizar. */
export const prefilter = (text: string): Classification | null => {
  const trimmed = text.trim();
  if (trimmed.length === 0) return buildHeuristic('emoji-only', 0.95, 'comentario vacío');
  if (EMOJI_ONLY_REGEX.test(trimmed)) return buildHeuristic('emoji-only', 0.95, 'solo emojis');
  if (SPAM_REGEX.test(trimmed)) return buildHeuristic('spam', 0.9, 'patrón de spam claro');
  return null;
};

const PRICE_REGEX = wordRegex(
  String.raw`precio|cu[aá]nto (?:sale|cuesta|vale)|costo|valor|cotiza\p{L}*|env[ií]os?|talles?|stock|disponible|d[oó]nde (?:compro|consigo)|c[oó]mo compro|link`,
);
const COMPLAINT_REGEX = wordRegex(
  String.raw`no (?:funciona|funcion[oó]|anda)|(?:no|nunca|jam[aá]s) (?:me )?lleg[oó]|reclamo|queja|p[eé]simo|terrible|horrible|devoluci[oó]n|reembolso|nunca m[aá]s|todav[ií]a espero`,
);
const PRAISE_REGEX = wordRegex(
  String.raw`genial|excelente|incre[ií]ble|me encanta\p{L}*|hermos[oa]|buen[ií]simo|brillante|felicitaciones|crack|amazing|love it|awesome`,
);
const QUESTION_REGEX = new RegExp(
  String.raw`[?¿]|(?<![\p{L}\d_])(?:c[oó]mo|cu[aá]ndo|d[oó]nde|por qu[eé]|cu[aá]l(?:es)?|alguien sabe)(?![\p{L}\d_])`,
  'iu',
);
const TAG_REGEX = /^(?:@[\w.]+\s*){1,3}[\p{Extended_Pictographic}\s!.]*$/u;

const buildHeuristic = (kind: CommentKind, confidence: number, reasoning: string): Classification => ({
  kind,
  sarcasm: { present: false, stance: null },
  literalSentiment: 'neutral',
  trueSentiment: 'neutral',
  hostility: 0,
  risk: 'low',
  language: 'es',
  confidence,
  promptInjection: false,
  hardFlags: [],
  reasoning,
  source: 'heuristic',
});

/** Clasificación neutra para comentarios que se omiten sin analizar (topes de gasto, duplicados). */
export const neutralClassification = (reasoning: string): Classification => buildHeuristic('other', 1, reasoning);

/**
 * Clasificación de respaldo. NO detecta sarcasmo (no es confiable con regex):
 * por eso su confianza máxima (0.4) queda siempre por debajo del umbral y la
 * política lo manda a revisión humana.
 */
export const heuristicClassify = (text: string): Classification => {
  const trimmed = text.trim();
  const pre = prefilter(trimmed);
  if (pre) return pre;

  let kind: CommentKind = 'other';
  if (TAG_REGEX.test(trimmed)) kind = 'tag-friend';
  else if (COMPLAINT_REGEX.test(trimmed)) kind = 'complaint';
  else if (PRICE_REGEX.test(trimmed)) kind = 'purchase-intent';
  else if (QUESTION_REGEX.test(trimmed)) kind = 'question';
  else if (PRAISE_REGEX.test(trimmed)) kind = 'praise';

  return {
    ...buildHeuristic(kind, 0.4, 'clasificación por reglas (LLM no disponible o inválido)'),
    risk: kind === 'complaint' ? 'medium' : 'low',
  };
};
