/**
 * Wake Word Engine v2 — Detección robusta de frases de activación
 * ─────────────────────────────────────────────────────────────────────────
 * Reemplaza el regex simple por un sistema híbrido:
 *   1. Fuzzy phonetic matching — tolera errores de STT ("ola talia" ≈ "hola talía")
 *   2. Levenshtein distance — scoring numérico de similitud
 *   3. Multi-phrase scoring — elige la mejor coincidencia entre todas las frases
 *   4. Configurable threshold — ajustable por entorno (ruidoso/quieto)
 *
 * No requiere dependencias nativas pesadas. Todo es string-matching inteligente.
 * Para wake word por audio crudo (no STT), usar el browser con Porcupine Web.
 */

import { log } from '../agent/logger.js';

export interface WakeDetectionResult {
  matched: boolean;
  phrase: string;
  language: string;
  confidence: number; // 0.0 - 1.0
  score: number; // raw Levenshtein score (lower = better)
}

interface WakePhraseDef {
  phrases: string[]; // variantes de la misma frase
  language: string;
  display: string;
}

/* ── Phrase Bank ─────────────────────────────────────────────────────────── */

const WAKE_PHRASE_BANK: WakePhraseDef[] = [
  {
    phrases: [
      'hola talia',
      'ola talia',
      'hola talía',
      'ola talía',
      'hola talya',
      'hey talia',
      'hey talía',
      'ey talia',
      'ei talia',
      'ok talia',
      'okay talia',
      'okey talia',
      'talía ayudame',
      'talia ayudame',
      'talía ayúdame',
      'activa talia',
      'actívate talia',
      'despierta talia',
      'talia modo automático',
      'talia manos libres',
    ],
    language: 'es-AR',
    display: 'Hola Talía',
  },
  {
    phrases: [
      'hello talia',
      'hi talia',
      'hey talia',
      'okay talia',
      'talia help',
      'talia please',
      'wake up talia',
      'activate talia',
      'talia mode',
      'talia hands free',
    ],
    language: 'en-US',
    display: 'Hey Talia',
  },
  {
    phrases: [
      'olá talia',
      'ola talia',
      'oi talia',
      'ei talia',
      'talia me ajuda',
      'talia ajuda',
      'talia modo automático',
    ],
    language: 'pt-BR',
    display: 'Olá Tália',
  },
  {
    phrases: ['bonjour talia', 'salut talia', 'allô talia', 'hey talia'],
    language: 'fr-FR',
    display: 'Bonjour Talia',
  },
  {
    phrases: ['ciao talia', 'ehi talia', 'hey talia', 'salve talia'],
    language: 'it-IT',
    display: 'Ciao Talia',
  },
  {
    phrases: ['hallo talia', 'hey talia', 'hej talia', 'guten tag talia'],
    language: 'de-DE',
    display: 'Hallo Talia',
  },
];

/* ── Levenshtein Distance ────────────────────────────────────────────────── */

const levenshtein = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const matrix: number[][] = Array.from({ length: m + 1 }, (_, i) => [i]);
  for (let j = 1; j <= n; j++) matrix[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(matrix[i - 1]![j]! + 1, matrix[i]![j - 1]! + 1, matrix[i - 1]![j - 1]! + cost);
    }
  }
  return matrix[m]![n]!;
};

/* ── Phonetic Simplification ───────────────────────────────────────────────
   Reduce palabras a su esqueleto fonético para tolerar errores de STT       */

const phoneticSimplify = (text: string): string =>
  text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quitar tildes
    .replace(/[^a-z]/g, '') // solo letras
    .replace(/([a-z])\1+/g, '$1') // collapse duplicados ("hoola" → "hola")
    .replace(/c([ei])/g, 's$1') // "ci" → "si", "ce" → "se"
    .replace(/c/g, 'k') // "ca" → "ka"
    .replace(/v/g, 'b') // "v" → "b"
    .replace(/z/g, 's') // "z" → "s"
    .replace(/y/g, 'i') // "y" → "i"
    .replace(/w/g, 'u') // "w" → "u"
    .replace(/h/g, '') // H muda en español
    .replace(/q/g, 'k') // "que" → "ke"
    .replace(/x/g, 'ks') // "x" → "ks"
    .replace(/ph/g, 'f') // "ph" → "f"
    .replace(/ll/g, 'y') // "ll" → "y"
    .replace(/rr/g, 'r') // "rr" → "r"
    .replace(/ch/g, 'x') // "ch" → "x" (placeholder)
    .replace(/sh/g, 'x') // "sh" → "x"
    .replace(/gh/g, '') // "gh" muda
    .replace(/th/g, 't') // "th" → "t"
    .replace(/ss/g, 's') // collapse
    .replace(/nn/g, 'n')
    .replace(/mm/g, 'm')
    .replace(/tt/g, 't')
    .replace(/kk/g, 'k')
    .replace(/pp/g, 'p')
    .replace(/ff/g, 'f')
    .replace(/([a-z])\1+/g, '$1'); // collapse final
/* ── Scoring Engine ──────────────────────────────────────────────────────── */

const WAKE_THRESHOLD = Number(process.env['WAKE_WORD_THRESHOLD'] ?? 0.72);
const PHONETIC_BONUS = 0.15;

const scorePhrase = (input: string, phrase: string): number => {
  // 1. Direct normalized Levenshtein
  const rawDist = levenshtein(input, phrase);
  const maxLen = Math.max(input.length, phrase.length);
  const directScore = maxLen === 0 ? 1 : 1 - rawDist / maxLen;

  // 2. Phonetic Levenshtein
  const phonInput = phoneticSimplify(input);
  const phonPhrase = phoneticSimplify(phrase);
  const phonDist = levenshtein(phonInput, phonPhrase);
  const phonMaxLen = Math.max(phonInput.length, phonPhrase.length);
  const phoneticScore = phonMaxLen === 0 ? 1 : 1 - phonDist / phonMaxLen;

  // 3. Word-level containment bonus
  const inputWords = input.split(/\s+/);
  const phraseWords = phrase.split(/\s+/);
  const commonWords = inputWords.filter((w) => phraseWords.includes(w)).length;
  const containmentScore = phraseWords.length > 0 ? commonWords / phraseWords.length : 0;

  // Combined score with phonetic bonus
  return Math.min(
    1,
    directScore * 0.4 + phoneticScore * 0.4 + containmentScore * 0.2 + (phoneticScore > 0.85 ? PHONETIC_BONUS : 0),
  );
};

/**
 * Detecta wake word en un transcript usando scoring híbrido.
 * Mucho más robusto que regex simple ante errores de STT.
 */
export const detectWakeWordAdvanced = (transcript: string): WakeDetectionResult => {
  const input = transcript.trim().toLowerCase();
  let bestScore = 0;
  let bestMatch: WakePhraseDef | null = null;

  const allGroups = [...WAKE_PHRASE_BANK, ...customPhrases];
  for (const group of allGroups) {
    for (const phrase of group.phrases) {
      const score = scorePhrase(input, phrase);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = group;
      }
    }
  }

  const matched = bestScore >= WAKE_THRESHOLD;

  if (matched) {
    log.debug(`[WakeWordEngine] Match: "${input}" → ${bestMatch!.display} (score: ${bestScore.toFixed(2)})`);
  }

  return {
    matched,
    phrase: bestMatch?.display ?? '',
    language: bestMatch?.language ?? 'es-AR',
    confidence: bestScore,
    score: 1 - bestScore,
  };
};

/**
 * Versión rápida para uso en streaming: solo chequea si CONTIENE una wake phrase.
 * Si contiene, corre el scoring completo.
 */
export const quickWakeCheck = (transcript: string): WakeDetectionResult => {
  const input = transcript.toLowerCase();
  // Fast pre-filter: does it contain "talia" or similar?
  if (!/tali|taly|táli|tàli|tahl/i.test(input)) {
    return { matched: false, phrase: '', language: 'es-AR', confidence: 0, score: 1 };
  }
  return detectWakeWordAdvanced(transcript);
};

/**
 * Entrena una nueva wake phrase personalizada (runtime).
 */
const customPhrases: WakePhraseDef[] = [];

export const addCustomWakePhrase = (phrases: string[], language: string, display: string): void => {
  customPhrases.push({ phrases: phrases.map((p) => p.toLowerCase()), language, display });
  log.info(`[WakeWordEngine] Added custom wake phrase: ${display}`);
};

/**
 * Fuerza recarga de custom phrases (útil tras agregar/eliminar).
 */
export const reloadCustomWakePhrases = async (): Promise<void> => {
  customPhrases.length = 0;
  try {
    const { rebuildWakePhraseBank } = await import('./customWakeWord.js');
    rebuildWakePhraseBank();
  } catch {
    // customWakeWord no disponible
  }
};

/**
 * Lista todas las wake phrases activas.
 */
export const listWakePhrases = (): Array<{ display: string; language: string; variants: number }> =>
  [...WAKE_PHRASE_BANK, ...customPhrases].map((g) => ({
    display: g.display,
    language: g.language,
    variants: g.phrases.length,
  }));
