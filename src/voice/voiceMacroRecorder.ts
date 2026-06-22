/**
 * Voice Macro Recorder — Graba secuencias de acciones de voz y las
 * convierte en macros reutilizables.
 * ─────────────────────────────────────────────────────────────────────────
 * El usuario dice "grabar macro" → realiza varios comandos → "terminar".
 * Luego puede decir "ejecutar macro X" para reproducir la secuencia.
 *
 * Persistencia: data/runtime/voice-macros/{macroName}.json
 */

import { resolve } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { log } from '../agent/logger.js';
import type { VoiceIntent } from './voiceActionRouter.js';
import { executeVoiceAction } from './voiceActionRouter.js';
import { loadBrandProfile } from '../config/index.js';

const MACRO_DIR = resolve('data/runtime/voice-macros');

export interface MacroStep {
  order: number;
  intent: VoiceIntent;
  spokenCommand: string;
}

export interface VoiceMacro {
  name: string;
  description: string;
  steps: MacroStep[];
  createdAt: string;
  updatedAt: string;
  runCount: number;
  lastRunAt?: string;
}

export interface RecordingSession {
  name: string;
  steps: Omit<MacroStep, 'order'>[];
  startedAt: string;
}

let activeRecording: RecordingSession | null = null;

/* ── Persistence ─────────────────────────────────────────────────────────── */

const macroPath = (name: string): string => resolve(MACRO_DIR, `${sanitizeName(name)}.json`);

const sanitizeName = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 60);

const loadMacro = (name: string): VoiceMacro | null => {
  const p = macroPath(name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as VoiceMacro;
  } catch {
    return null;
  }
};

const saveMacro = (macro: VoiceMacro): void => {
  mkdirSync(MACRO_DIR, { recursive: true });
  writeFileSync(macroPath(macro.name), JSON.stringify(macro, null, 2), 'utf-8');
};

/* ── Recording API ───────────────────────────────────────────────────────── */

export const startRecording = (name: string): { ok: boolean; error?: string } => {
  if (activeRecording) {
    return { ok: false, error: `Ya hay una grabación activa: ${activeRecording.name}` };
  }
  activeRecording = {
    name: sanitizeName(name),
    steps: [],
    startedAt: new Date().toISOString(),
  };
  log.info(`[MacroRecorder] Iniciando grabación: ${name}`);
  return { ok: true };
};

export const recordStep = (spokenCommand: string, intent: VoiceIntent): { ok: boolean; error?: string } => {
  if (!activeRecording) {
    return { ok: false, error: 'No hay grabación activa. Decí "grabar macro [nombre]" primero.' };
  }
  activeRecording.steps.push({ spokenCommand, intent });
  log.info(`[MacroRecorder] Paso ${activeRecording.steps.length} grabado: ${spokenCommand}`);
  return { ok: true };
};

export const stopRecording = (description?: string): VoiceMacro | { error: string } => {
  if (!activeRecording) {
    return { error: 'No hay grabación activa.' };
  }
  if (activeRecording.steps.length === 0) {
    activeRecording = null;
    return { error: 'La macro está vacía. No se guardó.' };
  }

  const macro: VoiceMacro = {
    name: activeRecording.name,
    description: description ?? `Macro de ${activeRecording.steps.length} pasos`,
    steps: activeRecording.steps.map((s, i) => ({ ...s, order: i + 1 })),
    createdAt: activeRecording.startedAt,
    updatedAt: new Date().toISOString(),
    runCount: 0,
  };

  saveMacro(macro);
  log.success(`[MacroRecorder] Macro guardada: ${macro.name} (${macro.steps.length} pasos)`);
  activeRecording = null;
  return macro;
};

export const cancelRecording = (): void => {
  if (activeRecording) {
    log.info(`[MacroRecorder] Grabación cancelada: ${activeRecording.name}`);
    activeRecording = null;
  }
};

export const isRecording = (): boolean => activeRecording !== null;
export const getRecordingState = (): RecordingSession | null => activeRecording;

/* ── Execution API ───────────────────────────────────────────────────────── */

export const runMacro = async (name: string): Promise<{ ok: boolean; results: string[]; error?: string }> => {
  const macro = loadMacro(name);
  if (!macro) {
    return { ok: false, results: [], error: `Macro "${name}" no encontrada.` };
  }

  const brand = loadBrandProfile();
  const results: string[] = [];

  log.info(`[MacroRecorder] Ejecutando macro: ${macro.name} (${macro.steps.length} pasos)`);

  for (const step of macro.steps) {
    try {
      const result = await executeVoiceAction(step.intent, brand);
      results.push(result.spokenResponse);
    } catch (err) {
      const msg = `Error en paso ${step.order}: ${(err as Error).message}`;
      results.push(msg);
      log.warn(`[MacroRecorder] ${msg}`);
    }
  }

  macro.runCount += 1;
  macro.lastRunAt = new Date().toISOString();
  saveMacro(macro);

  return { ok: true, results };
};

/* ── Management API ──────────────────────────────────────────────────────── */

export const listMacros = (): VoiceMacro[] => {
  if (!existsSync(MACRO_DIR)) return [];
  return readdirSync(MACRO_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => loadMacro(f.replace('.json', '')))
    .filter((m): m is VoiceMacro => m !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export const deleteMacro = (name: string): boolean => {
  const p = macroPath(name);
  if (!existsSync(p)) return false;
  try {
    unlinkSync(p);
    log.info(`[MacroRecorder] Macro eliminada: ${name}`);
    return true;
  } catch {
    return false;
  }
};

export const getMacro = (name: string): VoiceMacro | null => loadMacro(name);

/* ── Voice-friendly name resolution ──────────────────────────────────────── */

export const findMacroByFuzzyName = (query: string): VoiceMacro | null => {
  const macros = listMacros();
  const q = query.toLowerCase().trim();

  // Exact match first
  const exact = macros.find((m) => m.name.toLowerCase() === q || m.name.toLowerCase().replace(/_/g, ' ') === q);
  if (exact) return exact;

  // Contains match
  const contains = macros.find((m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q));
  if (contains) return contains;

  // Word-level match
  const words = q.split(/\s+/);
  const wordMatch = macros.find((m) => words.some((w) => m.name.toLowerCase().includes(w)));
  return wordMatch ?? null;
};

// ── Voice-Triggered Automation (macros by speaker) ─────────────────────────

const speakerTriggers = new Map<string, string>(); // profileId -> macroName

export const assignMacroToSpeaker = (profileId: string, macroName: string): void => {
  speakerTriggers.set(profileId, macroName);
  log.info(`[MacroRecorder] Macro "${macroName}" asignada al speaker ${profileId}`);
};

export const removeMacroFromSpeaker = (profileId: string): void => {
  speakerTriggers.delete(profileId);
};

export const getMacroForSpeaker = (profileId: string): string | undefined => speakerTriggers.get(profileId);

export const listSpeakerTriggers = (): Array<{ profileId: string; macroName: string }> =>
  Array.from(speakerTriggers.entries()).map(([profileId, macroName]) => ({ profileId, macroName }));

/**
 * Ejecuta la macro asignada a un speaker, si existe.
 */
export const runSpeakerTrigger = async (
  profileId: string,
): Promise<{ ok: boolean; result?: string[]; error?: string }> => {
  const macroName = speakerTriggers.get(profileId);
  if (!macroName) return { ok: false, error: 'Ninguna macro asignada a este speaker.' };
  return runMacro(macroName);
};
