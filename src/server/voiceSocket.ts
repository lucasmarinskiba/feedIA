/**
 * Voice WebSocket — Streaming bidireccional de voz en tiempo real
 * ─────────────────────────────────────────────────────────────────────────
 * Protocolo:
 *   Cliente → Servidor:
 *     { type: 'audio_chunk', sessionId, data: 'base64pcm' }
 *     { type: 'command', sessionId, transcript }
 *     { type: 'start_wake', sessionId, lang }
 *     { type: 'stop_wake', sessionId }
 *   Servidor → Cliente:
 *     { type: 'stt_result', transcript, isFinal, confidence }
 *     { type: 'tts_start', text }
 *     { type: 'tts_end' }
 *     { type: 'wake_detected', phrase, lang }
 *     { type: 'command_result', response, executed, actionType }
 *     { type: 'error', message }
 */

interface WebSocketLike {
  send: (data: string) => void;
  on: (event: string, callback: (...args: unknown[]) => void) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const wsOn = (ws: WebSocketLike, event: string, cb: (...args: any[]) => void): void => {
  ws.on(event, cb as (...args: unknown[]) => void);
};
import { log } from '../agent/logger.js';
import { createStreamingSTT } from '../voice/streamingSTT.js';
import { processVoiceCommand } from '../voice/voiceSession.js';
import { speakInterruptible, stopActiveTTS } from '../voice/tts.js';
import { detectWakeWordAdvanced } from '../voice/wakeWordEngine.js';
import { recordSTT, recordCommand, recordWakeWordDetection } from '../voice/voiceAnalytics.js';

interface SocketSession {
  ws: WebSocketLike;
  sessionId: string;
  lang: string;
  sttSession?: ReturnType<typeof createStreamingSTT>;
  wakeActive: boolean;
}

const sessions = new Map<string, SocketSession>();

const send = (ws: WebSocketLike, msg: unknown): void => {
  try {
    ws.send(JSON.stringify(msg));
  } catch {
    /* ignore */
  }
};

/* ── Message Handlers ────────────────────────────────────────────────────── */

const handleAudioChunk = (session: SocketSession, data: string): void => {
  if (!session.sttSession) return;
  try {
    const buffer = Buffer.from(data, 'base64');
    session.sttSession.pushAudio(buffer);
  } catch (err) {
    log.warn(`[VoiceSocket] Audio chunk error: ${(err as Error).message}`);
  }
};

// Track STT timing per session for analytics
const sttStartTimes = new Map<string, number>();

const handleCommand = async (session: SocketSession, transcript: string): Promise<void> => {
  const cmdStart = Date.now();
  try {
    // Interrupt TTS if speaking
    stopActiveTTS();

    const result = await processVoiceCommand(transcript);

    // Record analytics
    const category = result.actionType?.split(':')[0] ?? 'unknown';
    recordCommand({
      transcript,
      intent: result.actionType,
      category,
      success: result.executed,
      durationMs: Date.now() - cmdStart,
      engine: 'websocket',
    });

    send(session.ws, {
      type: 'command_result',
      response: result.response,
      executed: result.executed,
      actionType: result.actionType,
    });

    // Speak response via TTS
    if (result.response) {
      send(session.ws, { type: 'tts_start', text: result.response });
      const tts = await speakInterruptible(result.response, { language: session.lang as never });
      await tts.finished;
      send(session.ws, { type: 'tts_end' });
    }
  } catch (err) {
    recordCommand({
      transcript,
      intent: 'error',
      category: 'unknown',
      success: false,
      durationMs: Date.now() - cmdStart,
      engine: 'websocket',
    });
    send(session.ws, { type: 'error', message: (err as Error).message });
  }
};

const handleStartWake = (session: SocketSession): void => {
  session.wakeActive = true;
  log.info(`[VoiceSocket] Wake mode started for ${session.sessionId}`);
};

const handleStopWake = (session: SocketSession): void => {
  session.wakeActive = false;
};

/* ── STT Setup ───────────────────────────────────────────────────────────── */

const setupSTT = (session: SocketSession): void => {
  sttStartTimes.set(session.sessionId, Date.now());
  session.sttSession = createStreamingSTT(
    (result) => {
      send(session.ws, {
        type: 'stt_result',
        transcript: result.transcript,
        isFinal: result.isFinal,
        confidence: result.confidence,
      });

      // If wake mode active, check for wake word in interim results
      if (session.wakeActive && result.transcript) {
        const wake = detectWakeWordAdvanced(result.transcript);
        if (wake.matched) {
          recordWakeWordDetection({ phrase: wake.phrase, engine: 'websocket', confidence: wake.confidence });
          send(session.ws, {
            type: 'wake_detected',
            phrase: wake.phrase,
            lang: wake.language,
            confidence: wake.confidence,
          });
        }
      }

      // Auto-process final results in command mode
      if (result.isFinal && result.transcript && !session.wakeActive) {
        const sttStart = sttStartTimes.get(session.sessionId) ?? Date.now();
        recordSTT({ provider: 'websocket', durationMs: Date.now() - sttStart, success: true });
        void handleCommand(session, result.transcript);
      }
    },
    { language: session.lang },
  );
};

/* ── Connection Lifecycle ────────────────────────────────────────────────── */

export const onVoiceSocketConnect = (ws: WebSocketLike, sessionId: string, lang = 'es-AR'): void => {
  const session: SocketSession = { ws, sessionId, lang, wakeActive: false };
  sessions.set(sessionId, session);
  setupSTT(session);

  log.info(`[VoiceSocket] Connected: ${sessionId} (${lang})`);
  send(ws, { type: 'connected', sessionId, lang });

  wsOn(ws, 'message', (raw: string) => {
    try {
      const msg = JSON.parse(raw) as { type: string; data?: string; transcript?: string; lang?: string };
      switch (msg.type) {
        case 'audio_chunk':
          if (msg.data) handleAudioChunk(session, msg.data);
          break;
        case 'command':
          if (msg.transcript) void handleCommand(session, msg.transcript);
          break;
        case 'start_wake':
          handleStartWake(session);
          break;
        case 'stop_wake':
          handleStopWake(session);
          break;
        default:
          send(ws, { type: 'error', message: `Unknown type: ${msg.type}` });
      }
    } catch {
      send(ws, { type: 'error', message: 'Invalid JSON' });
    }
  });

  wsOn(ws, 'close', () => {
    sessions.delete(sessionId);
    if (session.sttSession) session.sttSession.destroy();
    log.info(`[VoiceSocket] Disconnected: ${sessionId}`);
  });

  wsOn(ws, 'error', (err: Error) => {
    log.warn(`[VoiceSocket] Error ${sessionId}: ${err.message}`);
  });
};

export const getVoiceSocketStats = (): { activeSessions: number; sessions: string[] } => ({
  activeSessions: sessions.size,
  sessions: Array.from(sessions.keys()),
});
