import { speakInterruptible, stopActiveTTS, isTTSSpeaking, type TTSLanguage } from './tts.js';
import { listenContinuous } from './stt.js';
import { getWakeResponse, HANDS_FREE_MENU } from './wakeWord.js';
import { detectWakeWordAdvanced } from './wakeWordEngine.js';
import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';
import {
  detectIntent,
  executeVoiceAction,
  isConfirmationYes,
  isConfirmationNo,
  type VoiceActionResult,
  type VoiceIntent,
} from './voiceActionRouter.js';
import {
  getOrCreateContext,
  addTurn,
  setPendingConfirmation,
  clearPendingConfirmation,
  markConfirmed,
  getPendingConfirmation,
  buildContextualGoal,
  type VoiceContext,
} from './voiceContext.js';
import { playWake, playListening, playProcessing, playSuccess, playError, playConfirm } from './voiceFeedback.js';
import { analyzeSentiment, adaptTone } from './sentimentAnalyzer.js';
import { matchVoice, checkPermission, PERMISSIONS } from './voiceBiometrics.js';
import { recordCommand, recordWakeWordDetection, recordIntent } from './voiceAnalytics.js';
import { isEmergencyCommand } from './emergencyCommands.js';
import { processTranslatedCommand } from './realtimeTranslation.js';

export interface VoiceSessionState {
  active: boolean;
  language: string;
  handsFreeMode: boolean;
  lastActivity: Date | null;
  totalInteractions: number;
  currentSessionId: string;
}

export interface VoiceCommand {
  transcript: string;
  intent: string;
  language: string;
  response: string;
  timestamp: Date;
  executed: boolean;
  actionType: string;
}

const sessionState: VoiceSessionState = {
  active: false,
  language: process.env['TTS_LANGUAGE'] ?? 'es-AR',
  handsFreeMode: false,
  lastActivity: null,
  totalInteractions: 0,
  currentSessionId: `voice-${Date.now()}`,
};

let stopListening: (() => void) | null = null;

/* ── Core Processing Pipeline ────────────────────────────────────────────── */

const processTranscript = async (transcript: string, ctx: VoiceContext): Promise<VoiceActionResult> => {
  const startTime = Date.now();
  const brand = loadBrandProfile();
  const lang = sessionState.language.startsWith('en') ? 'en' : 'es';

  // 0. Emergency commands bypass everything (even biometric gate)
  const emergencyIntent = detectIntent(transcript);
  if (isEmergencyCommand(emergencyIntent)) {
    const { executeEmergencyCommand } = await import('./emergencyCommands.js');
    const result = await executeEmergencyCommand(
      emergencyIntent.action as 'pause' | 'resume' | 'status' | 'force_approve' | 'emergency_mode' | 'shutdown',
      brand,
    );
    recordCommand({
      transcript,
      intent: emergencyIntent.action,
      category: 'emergency',
      success: result.ok,
      durationMs: Date.now() - startTime,
      engine: 'emergency',
    });
    return result;
  }

  // 1. Check for pending confirmation
  const pending = getPendingConfirmation(ctx);
  if (pending) {
    if (isConfirmationYes(transcript)) {
      const intent = pending.intent as VoiceIntent;
      markConfirmed(ctx, `${intent.category}:${intent.action}`);
      playProcessing();
      const result = await executeVoiceAction(intent, brand, { confirmed: true });
      if (result.ok) playSuccess();
      else playError();
      return result;
    }
    if (isConfirmationNo(transcript)) {
      clearPendingConfirmation(ctx);
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Cancelled.' : 'Cancelado.',
        actionType: 'confirmation:cancelled',
        executed: false,
      };
    }
    // Neither yes nor no — treat as new command
    clearPendingConfirmation(ctx);
  }

  // 2. Detect sentiment & intent
  const sentiment = analyzeSentiment(transcript, sessionState.language);
  const intent = detectIntent(transcript);
  log.debug(
    `[VoiceSession] Intent: ${intent.category}:${intent.action} | Sentiment: ${sentiment.label} (${sentiment.score.toFixed(2)})`,
  );

  // 2.5 Biometric gate (if audio fingerprint available)
  // For text-only commands, we skip biometric check. For audio commands,
  // the caller should pass a pcm16 buffer and we verify the speaker.

  // 3. Execute with context (with optional translation)
  playProcessing();
  let result: VoiceActionResult;

  const { isTranslationAvailable } = await import('./realtimeTranslation.js');
  if (isTranslationAvailable() && intent.category !== 'emergency') {
    const translated = await processTranslatedCommand(transcript, async (cmdText) => {
      const tIntent = detectIntent(cmdText);
      const tResult = await executeVoiceAction(tIntent, brand);
      if (!tResult.requiresConfirmation && tResult.spokenResponse) {
        tResult.spokenResponse = adaptTone(tResult.spokenResponse, sentiment.tone, sessionState.language);
      }
      return { response: tResult.spokenResponse };
    });
    // Build result from translated pipeline
    result = {
      ok: true,
      spokenResponse: translated.translatedResponse,
      actionType: `${intent.category}:${intent.action}`,
      executed: true,
    };
  } else {
    result = await executeVoiceAction(intent, brand);
    // Adapt response tone based on detected sentiment
    if (!result.requiresConfirmation && result.spokenResponse) {
      result.spokenResponse = adaptTone(result.spokenResponse, sentiment.tone, sessionState.language);
    }
  }

  // 4. Record analytics
  const durationMs = Date.now() - startTime;
  recordCommand({
    transcript,
    intent: intent.action,
    category: intent.category,
    success: result.ok,
    durationMs,
    engine: 'voiceSession',
  });
  recordIntent({
    intent: intent.action,
    category: intent.category,
    confidence: intent.confidence === 'high' ? 0.9 : intent.confidence === 'medium' ? 0.6 : 0.3,
  });

  if (result.requiresConfirmation) {
    playConfirm();
    setPendingConfirmation(ctx, result.confirmationContext!);
  } else if (result.ok) {
    playSuccess();
  } else {
    playError();
  }

  return result;
};

/**
 * Procesa un comando de voz y retorna la respuesta de Talía.
 * Versión pública usada por la API y el modo manos libres.
 */
export const processVoiceCommand = async (transcript: string): Promise<VoiceCommand> => {
  const ctx = getOrCreateContext(sessionState.currentSessionId);

  sessionState.totalInteractions += 1;
  sessionState.lastActivity = new Date();

  addTurn(ctx, { role: 'user', content: transcript });

  const result = await processTranscript(transcript, ctx);

  addTurn(ctx, {
    role: 'assistant',
    content: result.spokenResponse,
    actionType: result.actionType,
  });

  return {
    transcript,
    intent: result.actionType,
    language: sessionState.language,
    response: result.spokenResponse,
    timestamp: new Date(),
    executed: result.executed,
    actionType: result.actionType,
  };
};

/**
 * Procesa un comando libre con contexto conversacional enriquecido.
 * Útil para comandos que referencian el turno anterior.
 */
export const processVoiceCommandWithContext = async (transcript: string): Promise<VoiceCommand> => {
  const ctx = getOrCreateContext(sessionState.currentSessionId);
  const contextualGoal = buildContextualGoal(ctx, transcript);

  // If the router detected a specific action, use it; otherwise fallback to free goal with context
  const intent = detectIntent(transcript);
  if (intent.category !== 'agent' && intent.category !== 'unknown') {
    return processVoiceCommand(transcript);
  }

  // Free-form query with rich context
  const brand = loadBrandProfile();
  const lang = sessionState.language.startsWith('en') ? 'en' : 'es';

  sessionState.totalInteractions += 1;
  sessionState.lastActivity = new Date();

  addTurn(ctx, { role: 'user', content: transcript });
  playProcessing();

  const { runTalia } = await import('../agent/talia.js');
  let response: string;
  try {
    const result = await runTalia(brand, { goal: contextualGoal, maxIterations: 10 });
    response = result.finalText.slice(0, 600);
    playSuccess();
  } catch {
    response = lang === 'en' ? 'Something went wrong. Check the logs.' : 'Algo salió mal. Revisá los logs.';
    playError();
  }

  addTurn(ctx, { role: 'assistant', content: response });

  return {
    transcript,
    intent: 'agent:contextual',
    language: sessionState.language,
    response,
    timestamp: new Date(),
    executed: false,
    actionType: 'agent:contextual',
  };
};

/**
 * Procesa un comando de voz con audio adjunto para biometric gate.
 * Rechaza comandos si el hablante no está autorizado.
 */
export const processVoiceCommandWithAudio = async (
  transcript: string,
  pcm16: Buffer,
): Promise<VoiceCommand & { biometric: { matched: boolean; profileName: string | null; authorized: boolean } }> => {
  const match = matchVoice(pcm16);
  const intent = detectIntent(transcript);
  const requiredLabels = PERMISSIONS[intent.action as keyof typeof PERMISSIONS] ?? PERMISSIONS.default;

  const authorized = !match.matched || checkPermission(match, requiredLabels);

  if (!authorized) {
    const lang = sessionState.language.startsWith('en') ? 'en' : 'es';
    const response =
      lang === 'en'
        ? `Access denied. Command "${intent.action}" requires ${requiredLabels.join(' or ')} privileges.`
        : `Acceso denegado. El comando "${intent.action}" requiere permisos de ${requiredLabels.join(' o ')}.`;
    playError();
    return {
      transcript,
      intent: intent.category === 'unknown' ? 'unknown' : `${intent.category}:${intent.action}`,
      language: sessionState.language,
      response,
      timestamp: new Date(),
      executed: false,
      actionType: 'biometric:denied',
      biometric: { matched: match.matched, profileName: match.profileName, authorized: false },
    };
  }

  const result = await processVoiceCommand(transcript);
  return {
    ...result,
    biometric: { matched: match.matched, profileName: match.profileName, authorized: true },
  };
};

/* ── Hands-Free Mode ─────────────────────────────────────────────────────── */

/**
 * Activa el modo manos libres: escucha continua + Talía responde en voz.
 */
export const startHandsFreeMode = async (language?: string): Promise<void> => {
  if (sessionState.active) return;

  sessionState.active = true;
  sessionState.handsFreeMode = true;
  sessionState.currentSessionId = `hf-${Date.now()}`;
  if (language) sessionState.language = language;

  const wakeResp = getWakeResponse(sessionState.language);
  log.success(`[VoiceSession] Modo manos libres activado (${sessionState.language})`);

  const tts1 = await speakInterruptible(wakeResp, { language: sessionState.language as TTSLanguage });
  await tts1.finished;
  playWake();

  // Hablar las opciones disponibles
  const menuText = sessionState.language.startsWith('en')
    ? 'You can say: grow account, create content, show analytics, check messages, pause GlassBox, or just tell me what you need.'
    : 'Podés decir: crecer cuenta, crear contenido, ver métricas, revisar mensajes, pausar GlassBox, o simplemente decime qué necesitás.';
  const tts2 = await speakInterruptible(menuText, { language: sessionState.language as TTSLanguage });
  await tts2.finished;

  stopListening = listenContinuous(
    (sttResult): void => {
      if (!sttResult.transcript) return;
      log.debug(`[VoiceSession] Escuché: "${sttResult.transcript}"`);

      void (async (): Promise<void> => {
        // Interrupt TTS if user speaks while Talía is talking
        if (isTTSSpeaking()) {
          stopActiveTTS();
          log.debug('[VoiceSession] TTS interrumpido por voz del usuario');
        }
        playListening();
        const cmd = await processVoiceCommand(sttResult.transcript);
        if (cmd.response) {
          const tts = await speakInterruptible(cmd.response, { language: sessionState.language as TTSLanguage });
          await tts.finished;
        }
      })();
    },
    { language: sessionState.language },
  ).stop;
};

/**
 * Detiene el modo manos libres.
 */
export const stopHandsFreeMode = async (): Promise<void> => {
  if (stopListening) {
    stopListening();
    stopListening = null;
  }
  sessionState.active = false;
  sessionState.handsFreeMode = false;
  log.info('[VoiceSession] Modo manos libres desactivado');
};

/**
 * Detecta wake word en un transcript y activa si hace match.
 * Retorna true si activó.
 */
export const handleWakeWordDetection = async (transcript: string): Promise<boolean> => {
  const match = detectWakeWordAdvanced(transcript);
  if (!match.matched) return false;

  log.success(
    `[VoiceSession] Wake word detectada: "${match.phrase}" (${match.language}) — confianza: ${match.confidence.toFixed(2)}`,
  );
  playWake();
  recordWakeWordDetection({ phrase: match.phrase, engine: 'v2', confidence: match.confidence });
  await startHandsFreeMode(match.language);
  return true;
};

/* ── Session State ───────────────────────────────────────────────────────── */

export const getSessionState = (): Readonly<VoiceSessionState> => ({ ...sessionState });
export const getHandsFreeMenu = (): typeof HANDS_FREE_MENU => HANDS_FREE_MENU;

/**
 * Fuerza un nuevo sessionId (útil para reiniciar contexto conversacional).
 */
export const resetSession = (): void => {
  sessionState.currentSessionId = `voice-${Date.now()}`;
  sessionState.totalInteractions = 0;
  log.info('[VoiceSession] Sesión de voz reiniciada');
};
