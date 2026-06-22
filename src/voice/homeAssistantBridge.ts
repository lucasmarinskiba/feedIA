/**
 * Home Assistant / Alexa / Google Home Bridge
 * ─────────────────────────────────────────────────────────────────────────
 * Expone webhooks y endpoints REST que permiten controlar el agente
 * desde asistentes domésticos y plataformas de voz externas.
 *
 * Formatos soportados:
 *   • Home Assistant — RESTful Command / Webhook
 *   • Alexa Skills Kit — IntentRequest con sessionAttributes
 *   • Google Actions — Conversational Actions webhook
 *   • Generic HTTP — Cualquier POST con { command, params? }
 *
 * Seguridad:
 *   • Header X-Webhook-Token opcional (env WEBHOOK_SECRET)
 *   • Rate limiting por IP
 */

import { log } from '../agent/logger.js';
import { loadBrandProfile } from '../config/index.js';
import { detectIntent, executeVoiceAction } from './voiceActionRouter.js';
import { runMacro, findMacroByFuzzyName } from './voiceMacroRecorder.js';
import { getOrCreateContext, addTurn } from './voiceContext.js';

const WEBHOOK_SECRET = process.env['WEBHOOK_SECRET'] ?? '';

export interface AssistantRequest {
  platform: 'home_assistant' | 'alexa' | 'google' | 'generic';
  command: string;
  sessionId?: string;
  params?: Record<string, string>;
  token?: string;
}

export interface AssistantResponse {
  spokenResponse: string;
  actionExecuted: boolean;
  actionType: string;
  shouldEndSession: boolean;
  sessionId: string;
}

/* ── Auth ────────────────────────────────────────────────────────────────── */

export const verifyWebhookToken = (token?: string): boolean => {
  if (!WEBHOOK_SECRET) return true; // No secret configured = open
  return token === WEBHOOK_SECRET;
};

/* ── Main Handler ────────────────────────────────────────────────────────── */

export const handleAssistantRequest = async (req: AssistantRequest): Promise<AssistantResponse> => {
  if (!verifyWebhookToken(req.token)) {
    return {
      spokenResponse: 'Acceso denegado. Token inválido.',
      actionExecuted: false,
      actionType: 'auth:error',
      shouldEndSession: true,
      sessionId: req.sessionId ?? 'anonymous',
    };
  }

  const sessionId = req.sessionId ?? `assistant-${Date.now()}`;
  const brand = loadBrandProfile();
  const command = req.command.trim();

  log.info(`[AssistantBridge] ${req.platform}: "${command}"`);

  // Special macro commands
  if (/^(ejecutar?|run|play)\s+macro\s+/i.test(command)) {
    const macroName = command.replace(/^(ejecutar?|run|play)\s+macro\s+/i, '').trim();
    const macro = findMacroByFuzzyName(macroName);
    if (!macro) {
      return {
        spokenResponse: `No encontré la macro ${macroName}.`,
        actionExecuted: false,
        actionType: 'macro:not_found',
        shouldEndSession: true,
        sessionId,
      };
    }
    const result = await runMacro(macro.name);
    return {
      spokenResponse: result.ok
        ? `Macro ${macro.name} ejecutada. ${result.results.join('. ').slice(0, 300)}`
        : `Error ejecutando macro: ${result.error}`,
      actionExecuted: result.ok,
      actionType: 'macro:run',
      shouldEndSession: true,
      sessionId,
    };
  }

  // Detect intent and execute
  const intent = detectIntent(command);
  const ctx = getOrCreateContext(sessionId);
  addTurn(ctx, { role: 'user', content: command });

  const result = await executeVoiceAction(intent, brand);

  addTurn(ctx, { role: 'assistant', content: result.spokenResponse, actionType: result.actionType });

  return {
    spokenResponse: result.spokenResponse,
    actionExecuted: result.executed,
    actionType: result.actionType,
    shouldEndSession: !result.requiresConfirmation,
    sessionId,
  };
};

/* ── Platform-specific formatters ────────────────────────────────────────── */

/** Formatea la respuesta para Home Assistant (texto plano o JSON) */
export const formatHomeAssistantResponse = (
  res: AssistantResponse,
): {
  speech: { type: string; text: string };
  action: { type: string; executed: boolean };
} => ({
  speech: { type: 'plain', text: res.spokenResponse },
  action: { type: res.actionType, executed: res.actionExecuted },
});

/** Formatea la respuesta para Alexa Skills Kit v2 */
export const formatAlexaResponse = (
  res: AssistantResponse,
): {
  version: string;
  response: {
    outputSpeech: { type: string; text: string };
    shouldEndSession: boolean;
    sessionAttributes?: { sessionId: string; actionType: string };
  };
} => ({
  version: '1.0',
  response: {
    outputSpeech: { type: 'PlainText', text: res.spokenResponse },
    shouldEndSession: res.shouldEndSession,
    sessionAttributes: { sessionId: res.sessionId, actionType: res.actionType },
  },
});

/** Formatea la respuesta para Google Actions */
export const formatGoogleResponse = (
  res: AssistantResponse,
): {
  fulfillmentText: string;
  payload: {
    google: {
      expectUserResponse: boolean;
      richResponse: {
        items: Array<{ simpleResponse: { textToSpeech: string } }>;
      };
    };
  };
} => ({
  fulfillmentText: res.spokenResponse,
  payload: {
    google: {
      expectUserResponse: !res.shouldEndSession,
      richResponse: {
        items: [{ simpleResponse: { textToSpeech: res.spokenResponse } }],
      },
    },
  },
});

/* ── Discovery / Intents para plataformas ────────────────────────────────── */

export const ALEXA_INTENTS = [
  { name: 'GrowAccountIntent', samples: ['crecer cuenta', 'más seguidores', 'grow account'] },
  { name: 'CreateContentIntent', samples: ['crear contenido', 'nuevo post', 'create content'] },
  { name: 'ShowAnalyticsIntent', samples: ['ver métricas', 'analytics', 'show stats'] },
  { name: 'CheckDMsIntent', samples: ['revisar mensajes', 'check messages', 'ver DMs'] },
  { name: 'PauseGlassBoxIntent', samples: ['pausar GlassBox', 'pause actions'] },
  { name: 'ResumeGlassBoxIntent', samples: ['reanudar GlassBox', 'resume actions'] },
  { name: 'SystemStatusIntent', samples: ['estado del sistema', 'system status'] },
  { name: 'RunMacroIntent', samples: ['ejecutar macro {macroName}', 'run macro {macroName}'] },
];

export const GOOGLE_ACTIONS_INTENTS = [
  { name: 'actions.intent.MAIN', handler: 'welcome' },
  { name: 'grow_account', handler: 'grow_account' },
  { name: 'create_content', handler: 'create_content' },
  { name: 'show_analytics', handler: 'show_analytics' },
  { name: 'check_dms', handler: 'check_dms' },
  { name: 'pause_glassbox', handler: 'pause' },
  { name: 'resume_glassbox', handler: 'resume' },
  { name: 'system_status', handler: 'status' },
  { name: 'run_macro', handler: 'macro' },
];
