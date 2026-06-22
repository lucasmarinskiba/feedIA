/**
 * onboardingVoice.ts — Voz Onboarding & Capacitación: tutoriales, tips, certificación
 * ─────────────────────────────────────────────────────────────────────────
 * Fase 19. Guía a nuevos usuarios mediante voz interactiva.
 */

import { log } from '../agent/logger.js';
import type { VoiceActionResult } from './voiceActionRouter.js';

const ok = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: true,
  spokenResponse: es,
  actionType,
  executed: true,
  detail,
});

const fail = (es: string, en: string, actionType: string, detail?: unknown): VoiceActionResult => ({
  ok: false,
  spokenResponse: es,
  actionType,
  executed: false,
  detail,
});

/* ── Voice Tutorial ──────────────────────────────────────────────────────── */

export const startVoiceTutorial = async (step?: number): Promise<VoiceActionResult> => {
  const actionType = 'onboarding.tutorial';
  const s = step ?? 1;
  log.info(`[onboardingVoice] startVoiceTutorial: step ${s}`);
  try {
    const tutorials = [
      'Paso 1: Configurá tu marca en data/brand.json. Decí "siguiente" para continuar.',
      'Paso 2: Conectá tu cuenta de Instagram. Usá el dashboard para autorizar.',
      'Paso 3: Probá tu primer comando de voz. Decí "Hola Talía, estado del sistema".',
      'Paso 4: Programá tu primera publicación. Decí "programar post para mañana".',
    ];
    const text = tutorials[s - 1] ?? tutorials[tutorials.length - 1] ?? '';
    return ok(text, text, actionType, { step: s, total: tutorials.length });
  } catch (err) {
    const msg = (err as Error).message;
    return fail(`Error en tutorial. ${msg.slice(0, 120)}`, `Tutorial error. ${msg.slice(0, 120)}`, actionType, msg);
  }
};

/* ── Daily Tip ───────────────────────────────────────────────────────────── */

export const getDailyTip = async (): Promise<VoiceActionResult> => {
  const actionType = 'onboarding.tip';
  log.info('[onboardingVoice] getDailyTip');
  try {
    const tips = [
      'Tip del día: Respondé los primeros comentarios en los primeros 30 minutos para impulsar el alcance.',
      'Tip del día: Usá 3-5 hashtags específicos y 2-3 amplios por post.',
      'Tip del día: La primera línea del caption es el gancho. Que se entienda sin contexto.',
      'Tip del día: Publicá Reels entre 19h y 21h para mayor retención.',
    ];
    const tip = tips[Math.floor(Math.random() * tips.length)] ?? tips[0] ?? '';
    return ok(tip, tip, actionType, { tip });
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error obteniendo tip. ${msg.slice(0, 120)}`,
      `Error getting tip. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Certification Quiz ──────────────────────────────────────────────────── */

export const startCertificationQuiz = async (): Promise<VoiceActionResult> => {
  const actionType = 'onboarding.quiz';
  log.info('[onboardingVoice] startCertificationQuiz');
  try {
    return ok(
      'Quiz de certificación iniciado. Pregunta 1: ¿Cuál es la mejor hora para publicar Reels? Decí "respuesta A", "B" o "C".',
      'Certification quiz started. Question 1: What is the best time to post Reels? Say "answer A", "B", or "C".',
      actionType,
      { question: 1, total: 5 },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error iniciando quiz. ${msg.slice(0, 120)}`,
      `Error starting quiz. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Progress Tracking ───────────────────────────────────────────────────── */

export const getOnboardingProgress = async (): Promise<VoiceActionResult> => {
  const actionType = 'onboarding.progress';
  log.info('[onboardingVoice] getOnboardingProgress');
  try {
    return ok(
      'Progreso de onboarding: 75% completado. Faltan: conectar Instagram y programar primer post.',
      'Onboarding progress: 75% complete. Remaining: connect Instagram and schedule first post.',
      actionType,
      { progress: 0.75, remaining: ['connect-instagram', 'schedule-first-post'] },
    );
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error obteniendo progreso. ${msg.slice(0, 120)}`,
      `Error getting progress. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};

/* ── Feature Discovery ───────────────────────────────────────────────────── */

export const discoverFeature = async (featureName?: string): Promise<VoiceActionResult> => {
  const actionType = 'onboarding.discover';
  const f = featureName ?? 'voz';
  log.info(`[onboardingVoice] discoverFeature: ${f}`);
  try {
    const descriptions: Record<string, string> = {
      voz: 'El modo manos libres te permite controlar todo por voz. Decí "Hola Talía" para empezar.',
      macros: 'Las macros graban secuencias de comandos para ejecutarlas con una sola frase.',
      autopilot: 'El autopilot gestiona tu cuenta automáticamente según las reglas que configures.',
      analytics: 'Los analytics de voz te muestran qué comandos usás más y cuáles funcionan mejor.',
    };
    const text = descriptions[f] ?? `Feature ${f}: explorá el dashboard para más información.`;
    return ok(text, text, actionType, { feature: f });
  } catch (err) {
    const msg = (err as Error).message;
    return fail(
      `Error descubriendo feature. ${msg.slice(0, 120)}`,
      `Error discovering feature. ${msg.slice(0, 120)}`,
      actionType,
      msg,
    );
  }
};
