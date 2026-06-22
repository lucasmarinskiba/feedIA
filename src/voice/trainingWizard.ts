/**
 * Voice Training Wizard — Guía paso a paso para enrolar nuevos hablantes
 * ─────────────────────────────────────────────────────────────────────────
 * El usuario graba 3 muestras de voz y el sistema:
 *   1. Verifica calidad de audio (nivel, ruido)
 *   2. Extrae fingerprint de cada muestra
 *   3. Promedia los fingerprints para mayor robustez
 *   4. Crea el perfil con permisos asignados
 *
 * Persistencia: data/runtime/voice-profiles/{id}.json
 */

import { log } from '../agent/logger.js';
import { extractFingerprint, enrollVoice, type VoiceProfile } from './voiceBiometrics.js';

export interface TrainingStep {
  step: number;
  label: string;
  instruction: string;
}

export interface TrainingSession {
  id: string;
  name: string;
  intendedLabel: VoiceProfile['label'];
  samples: Buffer[];
  fingerprints: ReturnType<typeof extractFingerprint>[];
  currentStep: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
}

const STEPS: TrainingStep[] = [
  { step: 1, label: 'frase1', instruction: 'Decí: "Hola Talía, soy yo"' },
  { step: 2, label: 'frase2', instruction: 'Decí: "Activa el modo manos libres"' },
  { step: 3, label: 'frase3', instruction: 'Decí: "Estoy listo para trabajar"' },
];

const activeSessions = new Map<string, TrainingSession>();

/* ── Session Management ──────────────────────────────────────────────────── */

export const startTraining = (id: string, name: string, label: VoiceProfile['label']): TrainingSession => {
  const session: TrainingSession = {
    id,
    name,
    intendedLabel: label,
    samples: [],
    fingerprints: [],
    currentStep: 0,
    status: 'recording',
  };
  activeSessions.set(id, session);
  log.info(`[TrainingWizard] Sesión iniciada: ${name} (${id})`);
  return session;
};

export const getTrainingSession = (id: string): TrainingSession | undefined => activeSessions.get(id);

export const cancelTraining = (id: string): void => {
  activeSessions.delete(id);
};

/* ── Audio Submission ────────────────────────────────────────────────────── */

export const submitSample = (id: string, pcm16: Buffer): { ok: boolean; nextStep?: TrainingStep; error?: string } => {
  const session = activeSessions.get(id);
  if (!session) return { ok: false, error: 'Sesión no encontrada.' };
  if (session.status !== 'recording') return { ok: false, error: 'La sesión no está en modo grabación.' };

  // Quality check: minimum energy
  const samples = new Int16Array(pcm16.buffer, pcm16.byteOffset, pcm16.length / 2);
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) sumSq += samples[i]! * samples[i]!;
  const rms = Math.sqrt(sumSq / samples.length) / 32768;
  if (rms < 0.01) return { ok: false, error: 'Audio demasiado bajo. Acercate al micrófono.' };

  const fp = extractFingerprint(pcm16);
  session.samples.push(pcm16);
  session.fingerprints.push(fp);
  session.currentStep += 1;

  log.info(`[TrainingWizard] Muestra ${session.currentStep}/3 recibida para ${session.name}`);

  if (session.currentStep >= STEPS.length) {
    session.status = 'processing';
    void finalizeTraining(id);
    return { ok: true };
  }

  return { ok: true, nextStep: STEPS[session.currentStep] };
};

/* ── Finalization ────────────────────────────────────────────────────────── */

const finalizeTraining = (id: string): void => {
  const session = activeSessions.get(id);
  if (!session) return;

  try {
    // Average fingerprints
    const avgFingerprint = averageFingerprints(session.fingerprints);

    // Create profile with averaged fingerprint
    const profile = enrollVoice(session.id, session.name, session.intendedLabel, session.samples[0]!);

    // Override with averaged fingerprint
    profile.fingerprint = avgFingerprint;
    profile.samples = session.samples.length;

    const { saveProfile } = require('./voiceBiometrics.js') as typeof import('./voiceBiometrics.js');
    saveProfile(profile);

    session.status = 'completed';
    log.success(`[TrainingWizard] Perfil completado: ${session.name} (${session.intendedLabel})`);
  } catch (err) {
    session.status = 'failed';
    log.error(`[TrainingWizard] Error finalizando ${id}: ${(err as Error).message}`);
  }
};

const averageFingerprints = (
  fingerprints: ReturnType<typeof extractFingerprint>[],
): ReturnType<typeof extractFingerprint> => {
  const n = fingerprints.length;
  const avgPitch = fingerprints.reduce((s, f) => s + f.pitch, 0) / n;
  const avgRms = fingerprints.reduce((s, f) => s + f.rms, 0) / n;
  const avgZcr = fingerprints.reduce((s, f) => s + f.zcr, 0) / n;

  const avgFormants: number[] = [];
  for (let i = 0; i < 3; i++) {
    avgFormants.push(fingerprints.reduce((s, f) => s + (f.formants[i] ?? 0), 0) / n);
  }

  const avgTimbre: number[] = [];
  for (let i = 0; i < 12; i++) {
    avgTimbre.push(fingerprints.reduce((s, f) => s + (f.timbre[i] ?? 0), 0) / n);
  }

  return { pitch: avgPitch, rms: avgRms, zcr: avgZcr, formants: avgFormants, timbre: avgTimbre };
};

export const getTrainingSteps = (): TrainingStep[] => STEPS;
