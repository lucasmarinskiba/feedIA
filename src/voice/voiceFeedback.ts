/**
 * Voice Feedback — Audio cues for hands-free interaction states
 * ─────────────────────────────────────────────────────────────────────────
 * Genera beeps/boops simples vía PowerShell para dar feedback auditivo
 * sin depender de archivos de audio externos.
 *
 * Estados:
 *   • wake      — beep suave (Talía escuchando wake word)
 *   • listening — beep ascendente (escuchando comando)
 *   • processing — beep doble (procesando)
 *   • success   — beep triple ascendente (acción exitosa)
 *   • error     — beep grave descendente (error / no entendió)
 *   • confirm   — beep pregunta (esperando confirmación sí/no)
 */

import { execSync } from 'child_process';

let audioEnabled = process.env['VOICE_AUDIO_FEEDBACK'] !== 'false';

export const setAudioFeedback = (enabled: boolean): void => {
  audioEnabled = enabled;
};
export const isAudioFeedbackEnabled = (): boolean => audioEnabled;

const playBeep = (freq: number, durationMs: number): void => {
  if (!audioEnabled) return;
  try {
    execSync(`powershell -Command "[Console]::Beep(${freq}, ${durationMs})"`, { timeout: 2000, windowsHide: true });
  } catch {
    /* ignore — Console.Beep puede fallar en algunos entornos */
  }
};

export const playWake = (): void => {
  // Soft, low beep — "I'm here"
  playBeep(880, 120);
};

export const playListening = (): void => {
  // Ascending — "Go ahead"
  playBeep(880, 100);
  setTimeout(() => playBeep(1100, 100), 80);
};

export const playProcessing = (): void => {
  // Double beep — "Working on it"
  playBeep(1000, 80);
  setTimeout(() => playBeep(1000, 80), 120);
};

export const playSuccess = (): void => {
  // Triple ascending — "Done!"
  playBeep(880, 100);
  setTimeout(() => playBeep(1100, 100), 100);
  setTimeout(() => playBeep(1320, 150), 200);
};

export const playError = (): void => {
  // Descending low — "Something went wrong"
  playBeep(400, 150);
  setTimeout(() => playBeep(300, 200), 120);
};

export const playConfirm = (): void => {
  // Question-like up-down
  playBeep(1000, 120);
  setTimeout(() => playBeep(800, 120), 100);
  setTimeout(() => playBeep(1000, 120), 200);
};

export const playClick = (): void => {
  // Very short high tick
  playBeep(2000, 40);
};
