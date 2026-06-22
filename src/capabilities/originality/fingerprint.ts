/**
 * Originality Engine — Content Fingerprinting
 * ─────────────────────────────────────────────────────────────────────────
 * Deterministic, LLM-free fingerprinting and similarity scoring so the
 * Autonomous Producer can guarantee "contenido 100% original" before
 * publication. Two passes catch most repetition:
 *
 *   1. SHINGLES (n-gram Jaccard) — robust to word reordering and minor
 *      rewrites. Tunable n. Good for catching "rewrote the same idea".
 *   2. BIGRAMS — finer-grained, catches phrase-level reuse.
 *
 * Plus a HOOK-LINE comparison: if the first 80 chars match >85% with any
 * historical hook, we flag it regardless of body similarity (because IG
 * users perceive the hook as the post's identity).
 *
 * Everything is pure functions over normalized strings → cheap to run on
 * every draft. No persistent state inside this module.
 */

const STOP_WORDS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'de',
  'del',
  'al',
  'a',
  'en',
  'por',
  'para',
  'con',
  'sin',
  'y',
  'o',
  'u',
  'pero',
  'que',
  'qué',
  'como',
  'cómo',
  'es',
  'son',
  'fue',
  'fueron',
  'ser',
  'sido',
  'siendo',
  'esto',
  'esta',
  'este',
  'estos',
  'estas',
  'eso',
  'esa',
  'ese',
  'su',
  'sus',
  'mi',
  'mis',
  'tu',
  'tus',
  'me',
  'te',
  'se',
  'le',
  'les',
  'lo',
  'nos',
  'os',
  'yo',
  'vos',
  'tú',
  'él',
  'ella',
  'ellos',
  'ellas',
  'más',
  'muy',
  'también',
  'ya',
  'no',
  'sí',
  'si',
  'cuando',
  'donde',
  'dónde',
  'porque',
  'aunque',
  'mientras',
  'hasta',
  'desde',
  'sobre',
  'tras',
  'entre',
]);

/** Normalize: lowercase, strip accents, remove punctuation, collapse whitespace. */
export const normalize = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Tokenize + drop stop words (Spanish). */
export const tokenize = (s: string): string[] =>
  normalize(s)
    .split(' ')
    .filter((t) => t.length >= 3 && !STOP_WORDS.has(t));

/** Generate n-gram shingles. n=3 by default is the standard for Jaccard. */
export const shingles = (text: string, n = 3): Set<string> => {
  const tokens = tokenize(text);
  const set = new Set<string>();
  if (tokens.length < n) {
    if (tokens.length > 0) set.add(tokens.join(' '));
    return set;
  }
  for (let i = 0; i <= tokens.length - n; i += 1) {
    set.add(tokens.slice(i, i + n).join(' '));
  }
  return set;
};

/** Jaccard similarity between two sets, 0–1. */
export const jaccard = <T>(a: Set<T>, b: Set<T>): number => {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const v of a) if (b.has(v)) inter += 1;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

/**
 * Stable, lightweight fingerprint hash so we can index past content without
 * storing the full text. djb2 variant — good distribution, deterministic.
 */
export const fingerprintHash = (text: string): string => {
  const norm = normalize(text);
  let h = 5381;
  for (let i = 0; i < norm.length; i += 1) {
    h = ((h << 5) + h + norm.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
};

export interface ContentFingerprint {
  id: string;
  hash: string;
  hookLine: string;
  shingles3: string[]; // serialized for JSON storage
  shingles5: string[];
  createdAt: string;
  format?: string;
}

/** Build a serializable fingerprint of a content piece. */
export const buildFingerprint = (params: {
  id: string;
  hook?: string;
  body?: string;
  caption?: string;
  format?: string;
  createdAt?: string;
}): ContentFingerprint => {
  const fullText = [params.hook, params.body, params.caption].filter((s): s is string => Boolean(s)).join('\n');
  return {
    id: params.id,
    hash: fingerprintHash(fullText),
    hookLine: (params.hook ?? '').slice(0, 120),
    shingles3: Array.from(shingles(fullText, 3)),
    shingles5: Array.from(shingles(fullText, 5)),
    createdAt: params.createdAt ?? new Date().toISOString(),
    format: params.format,
  };
};
