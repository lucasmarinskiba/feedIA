/**
 * Custom Wake Word Manager
 * ─────────────────────────────────────────────────────────────────────────
 * Persiste, activa y gestiona wake words personalizadas:
 *   • Fuzzy — frases entrenadas que se agregan al phrase bank del engine
 *   • Porcupine — archivos .ppn para detección nativa en dispositivos edge
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';
import { addCustomWakePhrase } from './wakeWordEngine.js';

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface CustomWakeWord {
  id: string;
  phrase: string;
  language: string;
  displayName: string;
  type: 'fuzzy' | 'porcupine';
  porcupinePpnBase64?: string;
  createdAt: string;
  active: boolean;
}

/* ── Constants ──────────────────────────────────────────────────────────── */

const DATA_DIR = resolve('data/runtime/voice-wake-words');
const PERSISTENCE_FILE = resolve(DATA_DIR, 'custom-wake-words.json');
const SUPPORTED_LANGUAGES = ['es-AR', 'en-US', 'pt-BR', 'fr-FR', 'it-IT', 'de-DE'] as const;
type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/* ── Persistence helpers ────────────────────────────────────────────────── */

const ensureDir = (): void => {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
};

const loadWords = (): CustomWakeWord[] => {
  if (!existsSync(PERSISTENCE_FILE)) return [];
  try {
    const raw = readFileSync(PERSISTENCE_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) return parsed as CustomWakeWord[];
    log.warn('[CustomWakeWord] Persistence file malformed, starting fresh');
    return [];
  } catch {
    log.warn('[CustomWakeWord] Failed to load persistence file, starting fresh');
    return [];
  }
};

const saveWords = (words: CustomWakeWord[]): void => {
  ensureDir();
  try {
    writeFileSync(PERSISTENCE_FILE, JSON.stringify(words, null, 2), 'utf-8');
  } catch (err) {
    log.error(`[CustomWakeWord] Failed to save persistence: ${(err as Error).message}`);
  }
};

/* ── In-memory cache with lazy init ─────────────────────────────────────── */

let _words: CustomWakeWord[] | null = null;

const getWords = (): CustomWakeWord[] => {
  if (_words === null) _words = loadWords();
  return _words;
};

const setWords = (words: CustomWakeWord[]): void => {
  _words = words;
  saveWords(words);
};

/* ── ID generator ───────────────────────────────────────────────────────── */

const generateId = (): string => {
  const random = Math.floor(Math.random() * 10000)
    .toString(16)
    .padStart(4, '0');
  return `custom-${Date.now()}-${random}`;
};

/* ── Validation ─────────────────────────────────────────────────────────── */

const validateLanguage = (lang: string): void => {
  if (!SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)) {
    throw new Error(`Unsupported language "${lang}". Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
};

const validatePhrase = (phrase: string): void => {
  if (!phrase || phrase.trim().length === 0) throw new Error('Wake phrase must be non-empty');
  if (phrase.length > 120) throw new Error('Wake phrase too long (max 120 chars)');
};

const validateDisplayName = (displayName: string): void => {
  if (!displayName || displayName.trim().length === 0) throw new Error('Display name must be non-empty');
};

/* ── PPN file helpers ───────────────────────────────────────────────────── */

const getPpnPath = (id: string): string => resolve(DATA_DIR, `${id}.ppn`);

const writePpnFile = (id: string, base64: string): void => {
  ensureDir();
  writeFileSync(getPpnPath(id), Buffer.from(base64, 'base64'));
};

const deletePpnFile = (id: string): void => {
  const path = getPpnPath(id);
  if (existsSync(path)) {
    try {
      unlinkSync(path);
    } catch {
      /* ignore */
    }
  }
};

/* ── Core API ───────────────────────────────────────────────────────────── */

/** Agrega una wake phrase personalizada de tipo fuzzy. */
export const addCustomWakeWord = (phrase: string, language: string, displayName: string): CustomWakeWord => {
  validatePhrase(phrase);
  validateLanguage(language);
  validateDisplayName(displayName);

  const word: CustomWakeWord = {
    id: generateId(),
    phrase: phrase.trim(),
    language: language.trim().toLowerCase(),
    displayName: displayName.trim(),
    type: 'fuzzy',
    createdAt: new Date().toISOString(),
    active: true,
  };

  const words = getWords();
  words.push(word);
  setWords(words);

  addCustomWakePhrase([word.phrase], word.language, word.displayName);
  log.info(`[CustomWakeWord] Added fuzzy wake word: ${word.displayName} (${word.id})`);
  return word;
};

/** Agrega una wake word de Porcupine a partir de un archivo .ppn en base64. */
export const addPorcupineWakeWord = (
  phrase: string,
  language: string,
  displayName: string,
  ppnBase64: string,
): CustomWakeWord => {
  validatePhrase(phrase);
  validateLanguage(language);
  validateDisplayName(displayName);
  if (!ppnBase64 || ppnBase64.trim().length === 0) throw new Error('Porcupine .ppn base64 payload must be non-empty');

  const word: CustomWakeWord = {
    id: generateId(),
    phrase: phrase.trim(),
    language: language.trim().toLowerCase(),
    displayName: displayName.trim(),
    type: 'porcupine',
    porcupinePpnBase64: ppnBase64,
    createdAt: new Date().toISOString(),
    active: true,
  };

  writePpnFile(word.id, ppnBase64);
  const words = getWords();
  words.push(word);
  setWords(words);

  log.info(`[CustomWakeWord] Added Porcupine wake word: ${word.displayName} (${word.id})`);
  return word;
};

/** Lista todas las custom wake words (activas e inactivas). */
export const listCustomWakeWords = (): CustomWakeWord[] => [...getWords()];

/** Elimina una custom wake word por ID. Devuelve `true` si existía. */
export const removeCustomWakeWord = (id: string): boolean => {
  const words = getWords();
  const idx = words.findIndex((w) => w.id === id);
  if (idx === -1) return false;

  const removed = words.splice(idx, 1)[0]!;
  if (removed.type === 'porcupine') deletePpnFile(removed.id);
  setWords(words);

  log.info(`[CustomWakeWord] Removed wake word: ${removed.displayName} (${id})`);
  return true;
};

/** Activa una custom wake word por ID. */
export const activateCustomWakeWord = (id: string): void => {
  const words = getWords();
  const word = words.find((w) => w.id === id);
  if (!word) throw new Error(`Wake word with id "${id}" not found`);
  if (word.active) return;

  word.active = true;
  setWords(words);

  if (word.type === 'fuzzy') addCustomWakePhrase([word.phrase], word.language, word.displayName);
  log.info(`[CustomWakeWord] Activated wake word: ${word.displayName} (${id})`);
};

/** Desactiva una custom wake word por ID. */
export const deactivateCustomWakeWord = (id: string): void => {
  const words = getWords();
  const word = words.find((w) => w.id === id);
  if (!word) throw new Error(`Wake word with id "${id}" not found`);
  if (!word.active) return;

  word.active = false;
  setWords(words);
  log.info(`[CustomWakeWord] Deactivated wake word: ${word.displayName} (${id})`);
};

/** Devuelve solo las custom wake words activas. */
export const getActiveCustomWakeWords = (): CustomWakeWord[] => getWords().filter((w) => w.active);

/** Reconstruye el phrase bank del engine con todas las fuzzy activas. */
export const rebuildWakePhraseBank = (): void => {
  const active = getActiveCustomWakeWords().filter((w) => w.type === 'fuzzy');
  for (const word of active) {
    addCustomWakePhrase([word.phrase], word.language, word.displayName);
  }
  log.info(`[CustomWakeWord] Rebuilt phrase bank with ${active.length} fuzzy wake word(s)`);
};

/** Devuelve la ruta absoluta al archivo .ppn para una wake word Porcupine. */
export const getPpnFilePath = (id: string): string | null => {
  const words = getWords();
  const word = words.find((w) => w.id === id);
  if (!word || word.type !== 'porcupine') return null;

  const path = getPpnPath(id);
  if (!existsSync(path)) {
    if (word.porcupinePpnBase64) {
      try {
        writePpnFile(id, word.porcupinePpnBase64);
        return path;
      } catch {
        return null;
      }
    }
    return null;
  }
  return path;
};
