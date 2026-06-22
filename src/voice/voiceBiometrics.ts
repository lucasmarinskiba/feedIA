/**
 * Voice Biometrics — Reconocimiento de hablante por "voice fingerprint"
 * ─────────────────────────────────────────────────────────────────────────
 * Sistema ligero basado en características acústicas extraídas de audio PCM:
 *   • Pitch fundamental (frecuencia base)
 *   • Energía RMS promedio
 *   • Zero-crossing rate
 *   • Formantes aproximados (picos espectrales)
 *   • Timbre vector (12 coeficientes simplificados)
 *
 * NO es forense ni infalible. Es un sistema de conveniencia para:
 *   • Identificar quién dio un comando en entornos multi-usuario
 *   • Diferenciar al operador principal de visitas
 *   • Aplicar permisos diferenciados (ej: solo el admin puede ejecutar jobs)
 *
 * Persistencia: data/runtime/voice-profiles/{profileId}.json
 * Threshold: 0.75 similitud coseno para match.
 */

import { resolve } from 'node:path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { log } from '../agent/logger.js';

const PROFILE_DIR = resolve('data/runtime/voice-profiles');
const MATCH_THRESHOLD = 0.75;

export interface VoiceProfile {
  id: string;
  name: string;
  label: 'admin' | 'operator' | 'guest';
  createdAt: string;
  samples: number;
  fingerprint: VoiceFingerprint;
}

export interface VoiceFingerprint {
  pitch: number; // Hz fundamental promedio
  rms: number; // Energía promedio 0-1
  zcr: number; // Zero-crossing rate
  formants: number[]; // 3 formantes principales (Hz)
  timbre: number[]; // 12-dimensional timbre vector
}

export interface BiometricMatch {
  matched: boolean;
  profileId: string | null;
  profileName: string | null;
  similarity: number;
  label: string | null;
}

/* ── Persistence ─────────────────────────────────────────────────────────── */

const profilePath = (id: string): string => resolve(PROFILE_DIR, `${id}.json`);

export const listProfiles = (): VoiceProfile[] => {
  if (!existsSync(PROFILE_DIR)) return [];
  return readdirSync(PROFILE_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(readFileSync(resolve(PROFILE_DIR, f), 'utf-8')) as VoiceProfile;
      } catch {
        return null;
      }
    })
    .filter((p): p is VoiceProfile => p !== null);
};

export const saveProfile = (p: VoiceProfile): void => {
  mkdirSync(PROFILE_DIR, { recursive: true });
  writeFileSync(profilePath(p.id), JSON.stringify(p, null, 2), 'utf-8');
};

export const getProfile = (id: string): VoiceProfile | null => {
  const p = profilePath(id);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as VoiceProfile;
  } catch {
    return null;
  }
};

export const deleteProfile = (id: string): boolean => {
  const p = profilePath(id);
  if (!existsSync(p)) return false;
  try {
    unlinkSync(p);
    return true;
  } catch {
    return false;
  }
};

/* ── Feature Extraction ──────────────────────────────────────────────────── */

/**
 * Extrae fingerprint de un buffer PCM 16-bit mono 16kHz.
 * Algoritmos simplificados pero efectivos para discriminación básica.
 */
export const extractFingerprint = (pcm16: Buffer): VoiceFingerprint => {
  const samples = new Int16Array(pcm16.buffer, pcm16.byteOffset, pcm16.length / 2);
  const n = samples.length;

  // 1. RMS Energy
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += samples[i]! * samples[i]!;
  const rms = Math.sqrt(sumSq / n) / 32768;

  // 2. Zero-crossing rate
  let zc = 0;
  for (let i = 1; i < n; i++) {
    if (samples[i - 1]! >= 0 !== samples[i]! >= 0) zc++;
  }
  const zcr = zc / n;

  // 3. Pitch (autocorrelation básica)
  const pitch = estimatePitch(samples, 16000);

  // 4. Formantes (picos espectrales simples vía STFT rudimentario)
  const formants = estimateFormants(samples, 16000);

  // 5. Timbre vector (energía por bandas de frecuencia)
  const timbre = extractTimbre(samples, 16000);

  return { pitch, rms, zcr, formants, timbre };
};

/* ── Pitch Estimation (autocorrelation) ──────────────────────────────────── */

const estimatePitch = (samples: Int16Array, sampleRate: number): number => {
  const minLag = Math.floor(sampleRate / 400); // 400 Hz max
  const maxLag = Math.floor(sampleRate / 80); // 80 Hz min
  let bestLag = 0;
  let bestCorr = -Infinity;

  for (let lag = minLag; lag <= maxLag; lag++) {
    let corr = 0;
    for (let i = 0; i < samples.length - lag; i++) {
      corr += samples[i]! * samples[i + lag]!;
    }
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  return bestLag > 0 ? sampleRate / bestLag : 0;
};

/* ── Formant Estimation (peaks in spectrum) ──────────────────────────────── */

const estimateFormants = (samples: Int16Array, sampleRate: number): number[] => {
  // FFT simplificada: dividir en 3 bandas y encontrar energía máxima
  const bands = 64;
  const bandSize = Math.floor(samples.length / bands);
  const energies: number[] = [];

  for (let b = 0; b < bands; b++) {
    let e = 0;
    for (let i = b * bandSize; i < (b + 1) * bandSize && i < samples.length; i++) {
      e += samples[i]! * samples[i]!;
    }
    energies.push(e);
  }

  // Encontrar 3 picos locales
  const peaks: number[] = [];
  for (let i = 1; i < energies.length - 1; i++) {
    if (energies[i]! > energies[i - 1]! && energies[i]! > energies[i + 1]!) {
      const freq = (i / bands) * (sampleRate / 2);
      if (freq > 200 && freq < 4000) peaks.push(freq);
    }
  }

  peaks.sort((a, b) => b - a);
  return peaks.slice(0, 3);
};

/* ── Timbre Vector (12 bandas) ───────────────────────────────────────────── */

const extractTimbre = (samples: Int16Array, _sampleRate: number): number[] => {
  const bands = 12;
  const fftSize = 512;
  const hop = fftSize / 4;
  const numFrames = Math.floor((samples.length - fftSize) / hop);
  const energies = new Array(bands).fill(0);

  for (let f = 0; f < numFrames; f++) {
    const frame = new Float64Array(fftSize);
    for (let i = 0; i < fftSize; i++) {
      frame[i] = samples[f * hop + i]! / 32768;
    }

    // Apply Hann window
    for (let i = 0; i < fftSize; i++) {
      frame[i] = frame[i]! * 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
    }

    // DFT magnitude
    const mag = new Float64Array(fftSize / 2);
    for (let k = 0; k < fftSize / 2; k++) {
      let real = 0,
        imag = 0;
      for (let n = 0; n < fftSize; n++) {
        const angle = -(2 * Math.PI * k * n) / fftSize;
        real += frame[n]! * Math.cos(angle);
        imag += frame[n]! * Math.sin(angle);
      }
      mag[k] = Math.sqrt(real * real + imag * imag);
    }

    // Mel-spaced bands (simplified: log-spaced)
    for (let b = 0; b < bands; b++) {
      const start = Math.floor((fftSize / 2) * (b / bands));
      const end = Math.floor((fftSize / 2) * ((b + 1) / bands));
      let bandEnergy = 0;
      for (let i = start; i < end; i++) bandEnergy += mag[i]!;
      energies[b] += bandEnergy;
    }
  }

  // Normalize
  const maxE = Math.max(...energies);
  return energies.map((e) => (maxE > 0 ? e / maxE : 0));
};

/* ── Similarity (cosine) ─────────────────────────────────────────────────── */

const cosineSimilarity = (a: number[], b: number[]): number => {
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const fingerprintToVector = (fp: VoiceFingerprint): number[] => [
  fp.pitch / 500, // normalize ~0-1
  fp.rms,
  fp.zcr * 10, // scale up
  ...fp.formants.map((f) => f / 4000),
  ...fp.timbre,
];

/* ── Matching ────────────────────────────────────────────────────────────── */

export const matchVoice = (pcm16: Buffer): BiometricMatch => {
  const profiles = listProfiles();
  if (profiles.length === 0) {
    return { matched: false, profileId: null, profileName: null, similarity: 0, label: null };
  }

  const fp = extractFingerprint(pcm16);
  const vec = fingerprintToVector(fp);

  let best: BiometricMatch = { matched: false, profileId: null, profileName: null, similarity: 0, label: null };

  for (const p of profiles) {
    const pVec = fingerprintToVector(p.fingerprint);
    const sim = cosineSimilarity(vec, pVec);
    if (sim > best.similarity) {
      best = {
        matched: sim >= MATCH_THRESHOLD,
        profileId: p.id,
        profileName: p.name,
        similarity: sim,
        label: p.label,
      };
    }
  }

  return best;
};

/* ── Enrollment ──────────────────────────────────────────────────────────── */

export const enrollVoice = (id: string, name: string, label: VoiceProfile['label'], pcm16: Buffer): VoiceProfile => {
  const fp = extractFingerprint(pcm16);
  const existing = getProfile(id);
  const profile: VoiceProfile = {
    id,
    name,
    label,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
    samples: (existing?.samples ?? 0) + 1,
    fingerprint: fp,
  };
  saveProfile(profile);
  log.info(`[VoiceBiometrics] Perfil enrolado: ${name} (${label})`);
  return profile;
};

/* ── Permission Check ────────────────────────────────────────────────────── */

export const checkPermission = (match: BiometricMatch, requiredLabel: VoiceProfile['label'][]): boolean => {
  if (!match.matched) return false;
  return requiredLabel.includes(match.label as VoiceProfile['label']);
};

export const PERMISSIONS = {
  run_job: ['admin', 'operator'] as VoiceProfile['label'][],
  stop_all: ['admin'] as VoiceProfile['label'][],
  approve_all: ['admin'] as VoiceProfile['label'][],
  post_content: ['admin', 'operator'] as VoiceProfile['label'][],
  default: ['admin', 'operator', 'guest'] as VoiceProfile['label'][],
};

/* ── Multi-Speaker Session Tracking ──────────────────────────────────────── */

export interface SpeakerSession {
  profileId: string;
  name: string;
  label: VoiceProfile['label'];
  joinedAt: string;
  lastSeenAt: string;
  interactionCount: number;
}

let activeSpeaker: SpeakerSession | null = null;
const speakerHistory: SpeakerSession[] = [];

export const getActiveSpeaker = (): SpeakerSession | null => activeSpeaker;

export const setActiveSpeaker = (profileId: string): SpeakerSession | null => {
  const profile = getProfile(profileId);
  if (!profile) return null;
  activeSpeaker = {
    profileId: profile.id,
    name: profile.name,
    label: profile.label,
    joinedAt: new Date().toISOString(),
    lastSeenAt: new Date().toISOString(),
    interactionCount: 0,
  };
  speakerHistory.push(activeSpeaker);
  log.info(`[VoiceBiometrics] Speaker activo: ${profile.name} (${profile.label})`);
  return activeSpeaker;
};

export const recordSpeakerInteraction = (): void => {
  if (activeSpeaker) {
    activeSpeaker.interactionCount += 1;
    activeSpeaker.lastSeenAt = new Date().toISOString();
  }
};

export const clearActiveSpeaker = (): void => {
  activeSpeaker = null;
};

export const listSpeakerHistory = (): SpeakerSession[] => [...speakerHistory];

/**
 * Auto-detect speaker from audio and set as active.
 */
export const autoDetectSpeaker = (pcm16: Buffer): SpeakerSession | null => {
  const match = matchVoice(pcm16);
  if (match.matched && match.profileId) {
    return setActiveSpeaker(match.profileId);
  }
  clearActiveSpeaker();
  return null;
};
