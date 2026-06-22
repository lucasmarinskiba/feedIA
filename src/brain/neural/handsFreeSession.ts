/**
 * Hands-Free Session — sesión de interacción solo por voz.
 *
 * Estado:
 *   - listening (mic abierto, esperando wake-word o command)
 *   - processing (procesando intent del audio)
 *   - speaking (TTS reproduciendo respuesta)
 *   - paused
 *
 * Wake words: "che FeedIA", "hola FeedIA", "FeedIA".
 *
 * Cada turn del user genera un VoiceScript de respuesta + posibles acciones.
 * Mientras el cerebro trabaja, narra lo que hace ("Estoy redactando tu carrusel...").
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const HF_DIR = path.resolve('data/neural/hands-free');

export type SessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'paused' | 'ended';

export type IntentType =
  | 'create-content'
  | 'analyze'
  | 'publish'
  | 'check-status'
  | 'cancel'
  | 'help'
  | 'unknown'
  | 'small-talk'
  | 'navigate';

export interface VoiceTurn {
  turnId: string;
  timestamp: string;
  userTranscript: string;
  detectedIntent: IntentType;
  intentConfidence: number;
  systemResponse: string;
  voiceScriptId?: string;
  actionsTriggered: string[];
  durationMs: number;
}

export interface HandsFreeSession {
  id: string;
  brandId: string;
  userId: string;
  startedAt: string;
  lastActivityAt: string;
  state: SessionState;
  turns: VoiceTurn[];
  wakeWord: string;
  persona: string;
  totalTurns: number;
  totalActionsTriggered: number;
  endedAt?: string;
  endReason?: string;
}

export interface IntentDetection {
  intent: IntentType;
  confidence: number;
  extractedParams: Record<string, string>;
  shouldNarrateProgress: boolean;
}

const WAKE_WORDS = ['che feedia', 'hola feedia', 'feedia', 'oye feedia', 'eh feedia'];

const INTENT_PATTERNS: Array<{ intent: IntentType; patterns: RegExp[]; narrate: boolean }> = [
  {
    intent: 'create-content',
    narrate: true,
    patterns: [
      /hac[eé]me\s+(un\s+)?(carrusel|reel|story|stories|post)/i,
      /cre[aá]\s+(un\s+)?contenido/i,
      /generar?\s+(un\s+)?(carrusel|reel|story)/i,
      /quier[oa]\s+publicar/i,
    ],
  },
  {
    intent: 'analyze',
    narrate: true,
    patterns: [
      /analiz[áa]/i,
      /audit[áa]/i,
      /revis[áa]/i,
      /diagnostic[aá]/i,
      /c[oó]mo\s+v[oa]y/i,
      /qu[ée]\s+(tal|pasa)\s+con/i,
    ],
  },
  { intent: 'publish', narrate: true, patterns: [/publi[cqk]/i, /sub[ií]l[oa]/i, /lanz[áa]/i, /post[eéaá]/i] },
  {
    intent: 'check-status',
    narrate: false,
    patterns: [
      /(c[oó]mo|qu[ée])\s+est[aá]s?/i,
      /estad[oo]/i,
      /qu[ée]\s+(hiciste|hacés)/i,
      /resumen/i,
      /briefing/i,
      /reporte/i,
    ],
  },
  { intent: 'cancel', narrate: false, patterns: [/cancel/i, /detenete/i, /(par[áa]|frená)\b/i, /stop/i, /detené/i] },
  { intent: 'help', narrate: false, patterns: [/ayuda/i, /qu[ée]\s+pod[éeé]s/i, /comandos/i, /opcion[ee]s/i] },
  { intent: 'navigate', narrate: false, patterns: [/ir\s+a/i, /lleva(me)?\s+a/i, /abr[ií]/i, /muestr[aá]me/i] },
  {
    intent: 'small-talk',
    narrate: false,
    patterns: [/\b(hola|buen[oa]s|qu[ée]\s+tal|saludos)\b/i, /\bgracias\b/i, /\b(buen|mal)\s+(d[ií]a|noche|tarde)/i],
  },
];

const sessionPath = (sessionId: string): string => path.join(HF_DIR, `${sessionId}.json`);

const loadSession = async (sessionId: string): Promise<HandsFreeSession | null> => {
  try {
    return JSON.parse(await fs.readFile(sessionPath(sessionId), 'utf-8')) as HandsFreeSession;
  } catch {
    return null;
  }
};

const saveSession = async (session: HandsFreeSession): Promise<void> => {
  await fs.mkdir(HF_DIR, { recursive: true });
  await fs.writeFile(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf-8');
};

export const startSession = async (params: {
  brandId: string;
  userId: string;
  wakeWord?: string;
  persona?: string;
}): Promise<HandsFreeSession> => {
  const session: HandsFreeSession = {
    id: `hf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    userId: params.userId,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    state: 'listening',
    turns: [],
    wakeWord: params.wakeWord ?? 'che FeedIA',
    persona: params.persona ?? 'amigo-experto',
    totalTurns: 0,
    totalActionsTriggered: 0,
  };
  await saveSession(session);
  log.info('[handsFreeSession] started', { id: session.id, brandId: params.brandId });
  return session;
};

export const detectIntent = (transcript: string): IntentDetection => {
  const text = transcript.toLowerCase();
  for (const { intent, patterns, narrate } of INTENT_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        const extractedParams: Record<string, string> = {};
        const topicMatch = text.match(/sobre\s+(.+?)(?:[.,?!]|$)/i);
        if (topicMatch?.[1]) extractedParams.topic = topicMatch[1].trim();
        const formatMatch = text.match(/(carrusel|reel|story|stories|post|video)/i);
        if (formatMatch?.[1]) extractedParams.format = formatMatch[1].toLowerCase();
        return { intent, confidence: 0.85, extractedParams, shouldNarrateProgress: narrate };
      }
    }
  }
  return { intent: 'unknown', confidence: 0.3, extractedParams: {}, shouldNarrateProgress: false };
};

export const detectWakeWord = (audioTranscript: string): boolean => {
  const lower = audioTranscript.toLowerCase().trim();
  return WAKE_WORDS.some((w) => lower.includes(w));
};

export const recordTurn = async (
  sessionId: string,
  params: {
    userTranscript: string;
    systemResponse: string;
    voiceScriptId?: string;
    actionsTriggered?: string[];
    durationMs: number;
  },
): Promise<HandsFreeSession | null> => {
  const session = await loadSession(sessionId);
  if (!session) return null;

  const detection = detectIntent(params.userTranscript);
  const turn: VoiceTurn = {
    turnId: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    userTranscript: params.userTranscript,
    detectedIntent: detection.intent,
    intentConfidence: detection.confidence,
    systemResponse: params.systemResponse,
    voiceScriptId: params.voiceScriptId,
    actionsTriggered: params.actionsTriggered ?? [],
    durationMs: params.durationMs,
  };

  session.turns.push(turn);
  session.totalTurns++;
  session.totalActionsTriggered += turn.actionsTriggered.length;
  session.lastActivityAt = new Date().toISOString();
  session.state = 'listening';
  await saveSession(session);
  log.info('[handsFreeSession] turn recorded', { sessionId, intent: detection.intent });
  return session;
};

export const setSessionState = async (sessionId: string, state: SessionState): Promise<HandsFreeSession | null> => {
  const session = await loadSession(sessionId);
  if (!session) return null;
  session.state = state;
  session.lastActivityAt = new Date().toISOString();
  if (state === 'ended') {
    session.endedAt = new Date().toISOString();
    session.endReason = 'user-ended';
  }
  await saveSession(session);
  return session;
};

export const endSession = async (sessionId: string, reason = 'user-ended'): Promise<HandsFreeSession | null> => {
  const session = await loadSession(sessionId);
  if (!session) return null;
  session.state = 'ended';
  session.endedAt = new Date().toISOString();
  session.endReason = reason;
  await saveSession(session);
  log.info('[handsFreeSession] ended', { sessionId, reason, totalTurns: session.totalTurns });
  return session;
};

export const getSession = (sessionId: string): Promise<HandsFreeSession | null> => loadSession(sessionId);

export const composeProgressNarration = (action: string, step: number, totalSteps: number): string => {
  const progressPct = Math.round((step / Math.max(1, totalSteps)) * 100);
  const variations = [
    `Voy ${progressPct} por ciento. ${action}.`,
    `Trabajando: paso ${step} de ${totalSteps}. ${action}.`,
    `${action}. Casi listo.`,
    `Estoy ${action.toLowerCase()}, ya casi.`,
  ];
  return variations[Math.floor(Math.random() * variations.length)] ?? variations[0]!;
};

export const composeIntentConfirmation = (detection: IntentDetection): string => {
  switch (detection.intent) {
    case 'create-content':
      return `Voy a crear ${detection.extractedParams.format ?? 'contenido'}${detection.extractedParams.topic ? ` sobre ${detection.extractedParams.topic}` : ''}. Empiezo.`;
    case 'analyze':
      return `Analizando${detection.extractedParams.topic ? ` ${detection.extractedParams.topic}` : ' tu cuenta'} ahora.`;
    case 'publish':
      return `Publico${detection.extractedParams.format ? ` el ${detection.extractedParams.format}` : ''} ya.`;
    case 'check-status':
      return `Te paso el estado actual.`;
    case 'cancel':
      return `Frenando todo. Pausado.`;
    case 'help':
      return `Puedo crear contenido, analizar tu cuenta, publicar, o darte estado. ¿Qué necesitás?`;
    case 'navigate':
      return `Te llevo ahí.`;
    case 'small-talk':
      return `Acá estoy. ¿En qué te ayudo?`;
    case 'unknown':
    default:
      return `No entendí. ¿Podés repetirlo de otra forma?`;
  }
};

export const listActiveSessions = async (): Promise<HandsFreeSession[]> => {
  try {
    const files = await fs.readdir(HF_DIR);
    const sessions: HandsFreeSession[] = [];
    for (const f of files) {
      if (!f.startsWith('hf-')) continue;
      try {
        const s = JSON.parse(await fs.readFile(path.join(HF_DIR, f), 'utf-8')) as HandsFreeSession;
        if (s.state !== 'ended') sessions.push(s);
      } catch {
        /* skip */
      }
    }
    return sessions.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  } catch {
    return [];
  }
};
