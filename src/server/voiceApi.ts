/**
 * Endpoints HTTP para el sistema de voz e interacción con Talía.
 * El browser usa Web Speech API → POST aquí → Talía procesa → respuesta TTS.
 */

import type { RouteDefinition, RouteHandler } from './http.js';
import { json } from './http.js';
import { getWakeResponse, HANDS_FREE_MENU } from '../voice/wakeWord.js';
import { detectWakeWordAdvanced } from '../voice/wakeWordEngine.js';
import { buildBrowserTTSPayload } from '../voice/tts.js';
import { buildBrowserSTTConfig } from '../voice/stt.js';
import { processVoiceCommand, getSessionState } from '../voice/voiceSession.js';
import {
  handleAssistantRequest,
  formatHomeAssistantResponse,
  formatAlexaResponse,
  formatGoogleResponse,
  ALEXA_INTENTS,
  GOOGLE_ACTIONS_INTENTS,
} from '../voice/homeAssistantBridge.js';
import {
  listMacros,
  runMacro,
  startRecording,
  stopRecording,
  cancelRecording,
  isRecording,
  recordStep,
  assignMacroToSpeaker,
  removeMacroFromSpeaker,
  listSpeakerTriggers,
  runSpeakerTrigger,
} from '../voice/voiceMacroRecorder.js';
import { runTalia } from '../agent/talia.js';
import { loadBrandProfile } from '../config/index.js';
import {
  listSupportedLocales,
  setLocale,
  getLocale,
  detectLocaleFromText,
  type SupportedLocale,
} from '../i18n/index.js';
import { getHubSummary, getProviderStatuses } from '../integrations/openSourceHub.js';
import { getOSStatus, scheduleOSTask, setAutonomyLevel, type OSState } from '../os/autonomousCore.js';
import { searchPublicApis, CURATED_APIS_FOR_FEEDIA } from '../integrations/apiDirectory.js';
import { groqChat, isGroqAvailable, GROQ_MODELS } from '../integrations/providers/groq.js';
import { ollamaChat, isOllamaAvailable, listOllamaModels } from '../integrations/providers/ollama.js';
import { hubChat } from '../integrations/openSourceHub.js';
import { voiceExtendedRoutes } from './voiceApiExtended.js';

export const voiceRoutes: RouteDefinition[] = [
  // ── Activación por wake word ───────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/wake',
    handler: (async (ctx): Promise<void> => {
      const { transcript, language } = ctx.body as { transcript: string; language?: string };
      if (!transcript) return json(ctx.res, 400, { error: 'transcript requerido' });

      const match = detectWakeWordAdvanced(transcript);
      if (!match.matched) {
        return json(ctx.res, 200, { activated: false, engine: 'v2' });
      }

      const lang = language ?? match.language;
      const response = getWakeResponse(lang);
      const ttsPayload = buildBrowserTTSPayload(response, lang as never);

      return json(ctx.res, 200, {
        activated: true,
        engine: 'v2',
        language: lang,
        phrase: match.phrase,
        confidence: match.confidence,
        score: match.score,
        response,
        tts: ttsPayload,
        menu: HANDS_FREE_MENU,
      });
    }) as RouteHandler,
  },

  // ── Procesar comando de voz ────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/command',
    handler: (async (ctx): Promise<void> => {
      const { transcript, language } = ctx.body as { transcript: string; language?: string };
      if (!transcript) return json(ctx.res, 400, { error: 'transcript requerido' });

      if (language) setLocale(language as SupportedLocale);

      try {
        const cmd = await processVoiceCommand(transcript);
        const ttsPayload = buildBrowserTTSPayload(cmd.response, (cmd.language as never) ?? 'es-AR');
        return json(ctx.res, 200, {
          ...cmd,
          reply: cmd.response,
          spokenReply: cmd.response,
          tts: ttsPayload,
        });
      } catch (err) {
        return json(ctx.res, 500, { error: (err as Error).message });
      }
    }) as RouteHandler,
  },

  // ── Chat directo con Talía (texto o voz) ──────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/talia/chat',
    handler: (async (ctx): Promise<void> => {
      const { goal, language, maxIterations } = ctx.body as { goal: string; language?: string; maxIterations?: number };
      if (!goal) return json(ctx.res, 400, { error: 'goal requerido' });

      if (language) setLocale(language as SupportedLocale);
      const detectedLang = detectLocaleFromText(goal);
      if (!language) setLocale(detectedLang);

      try {
        const brand = loadBrandProfile();
        const result = await runTalia(brand, { goal, maxIterations: maxIterations ?? 10 });
        const ttsPayload = buildBrowserTTSPayload(result.finalText.slice(0, 500), (language ?? detectedLang) as never);
        return json(ctx.res, 200, { ...result, tts: ttsPayload });
      } catch (err) {
        return json(ctx.res, 500, { error: (err as Error).message });
      }
    }) as RouteHandler,
  },

  // ── Estado de la sesión de voz ─────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/session',
    handler: ((ctx): void => {
      json(ctx.res, 200, {
        session: getSessionState(),
        sttConfig: buildBrowserSTTConfig(getLocale()),
        currentLocale: getLocale(),
        menu: HANDS_FREE_MENU,
      });
    }) as RouteHandler,
  },

  // ── Idiomas disponibles ────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/i18n/locales',
    handler: ((ctx): void => {
      json(ctx.res, 200, {
        current: getLocale(),
        available: listSupportedLocales(),
      });
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/i18n/locale',
    handler: ((ctx): void => {
      const { locale } = ctx.body as { locale: string };
      if (!locale) {
        json(ctx.res, 400, { error: 'locale requerido' });
        return;
      }
      setLocale(locale as SupportedLocale);
      json(ctx.res, 200, { ok: true, locale });
    }) as RouteHandler,
  },

  // ── Hub de proveedores de IA ───────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/hub/summary',
    handler: (async (ctx): Promise<void> => {
      const [summary, statuses] = await Promise.all([getHubSummary(), getProviderStatuses()]);
      json(ctx.res, 200, { summary, statuses });
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/hub/chat',
    handler: (async (ctx): Promise<void> => {
      const { prompt, provider, freeOnly } = ctx.body as { prompt: string; provider?: string; freeOnly?: boolean };
      if (!prompt) {
        json(ctx.res, 400, { error: 'prompt requerido' });
        return;
      }
      const result = await hubChat(prompt, { preferProvider: provider as never, freeOnly });
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  {
    method: 'GET',
    pattern: '/api/hub/providers',
    handler: (async (ctx): Promise<void> => {
      json(ctx.res, 200, await getProviderStatuses());
    }) as RouteHandler,
  },

  // ── Ollama ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/ollama/models',
    handler: (async (ctx): Promise<void> => {
      const available = await isOllamaAvailable();
      if (!available) {
        json(ctx.res, 200, { available: false, models: [] });
        return;
      }
      const models = await listOllamaModels();
      json(ctx.res, 200, { available: true, models });
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/ollama/chat',
    handler: (async (ctx): Promise<void> => {
      const { message, model, systemPrompt } = ctx.body as { message: string; model?: string; systemPrompt?: string };
      if (!message) {
        json(ctx.res, 400, { error: 'message requerido' });
        return;
      }
      const result = await ollamaChat([{ role: 'user', content: message }], { model, systemPrompt });
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Groq ───────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/groq/models',
    handler: ((ctx): void => {
      json(ctx.res, 200, {
        available: isGroqAvailable(),
        models: GROQ_MODELS,
      });
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/groq/chat',
    handler: (async (ctx): Promise<void> => {
      const { message, model, systemPrompt } = ctx.body as { message: string; model?: string; systemPrompt?: string };
      if (!message) {
        json(ctx.res, 400, { error: 'message requerido' });
        return;
      }
      const result = await groqChat([{ role: 'user', content: message }], { model: model as never, systemPrompt });
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Sistema Operativo Autónomo ─────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/os/status',
    handler: (async (ctx): Promise<void> => {
      json(ctx.res, 200, await getOSStatus());
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/os/schedule',
    handler: ((ctx): void => {
      const { goal, priority, delayMinutes } = ctx.body as { goal: string; priority?: string; delayMinutes?: number };
      if (!goal) {
        json(ctx.res, 400, { error: 'goal requerido' });
        return;
      }
      const id = scheduleOSTask(goal, (priority as never) ?? 'normal', delayMinutes ?? 0);
      json(ctx.res, 200, { ok: true, id });
    }) as RouteHandler,
  },

  {
    method: 'POST',
    pattern: '/api/os/autonomy',
    handler: ((ctx): void => {
      const { level } = ctx.body as { level: string };
      if (!level) {
        json(ctx.res, 400, { error: 'level requerido' });
        return;
      }
      setAutonomyLevel(level as OSState['autonomyLevel']);
      json(ctx.res, 200, { ok: true, level });
    }) as RouteHandler,
  },

  // ── API Directory ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/apis/curated',
    handler: ((ctx): void => {
      json(ctx.res, 200, CURATED_APIS_FOR_FEEDIA);
    }) as RouteHandler,
  },

  {
    method: 'GET',
    pattern: '/api/apis/search',
    handler: (async (ctx): Promise<void> => {
      const query = ctx.query['q'] ?? '';
      const category = ctx.query['category'];
      if (!query) {
        json(ctx.res, 400, { error: 'q requerido' });
        return;
      }
      const result = await searchPublicApis(query, category);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Wake Word Engine v2 ────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/wake-v2',
    handler: ((ctx): void => {
      const { transcript } = ctx.body as { transcript: string };
      if (!transcript) {
        json(ctx.res, 400, { error: 'transcript requerido' });
        return;
      }
      const result = detectWakeWordAdvanced(transcript);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Macros ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/macros',
    handler: ((ctx): void => {
      json(ctx.res, 200, { macros: listMacros() });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/macros/run',
    handler: (async (ctx): Promise<void> => {
      const { name } = ctx.body as { name: string };
      if (!name) {
        json(ctx.res, 400, { error: 'name requerido' });
        return;
      }
      const result = await runMacro(name);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/macros/record',
    handler: ((ctx): void => {
      const { action, name, spokenCommand, intent } = ctx.body as {
        action: string;
        name?: string;
        spokenCommand?: string;
        intent?: unknown;
      };
      if (!action) {
        json(ctx.res, 400, { error: 'action requerido' });
        return;
      }
      switch (action) {
        case 'start':
          if (!name) {
            json(ctx.res, 400, { error: 'name requerido' });
            return;
          }
          json(ctx.res, 200, startRecording(name));
          break;
        case 'step':
          if (!spokenCommand || !intent) {
            json(ctx.res, 400, { error: 'spokenCommand e intent requeridos' });
            return;
          }
          json(ctx.res, 200, recordStep(spokenCommand, intent as never));
          break;
        case 'stop':
          json(ctx.res, 200, stopRecording());
          break;
        case 'cancel':
          cancelRecording();
          json(ctx.res, 200, { ok: true });
          break;
        case 'status':
          json(ctx.res, 200, { recording: isRecording() });
          break;
        default:
          json(ctx.res, 400, { error: 'acción no reconocida' });
      }
    }) as RouteHandler,
  },

  // ── Assistant Webhook (Home Assistant / Alexa / Google) ────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/webhook',
    handler: (async (ctx): Promise<void> => {
      const { platform, command, sessionId, params, token } = ctx.body as {
        platform?: string;
        command?: string;
        sessionId?: string;
        params?: Record<string, string>;
        token?: string;
      };
      if (!command) {
        json(ctx.res, 400, { error: 'command requerido' });
        return;
      }

      const result = await handleAssistantRequest({
        platform: (platform ?? 'generic') as never,
        command,
        sessionId,
        params,
        token,
      });

      // Format based on platform hint or Accept header
      const accept = ctx.req.headers['accept'] ?? '';
      if (platform === 'alexa' || accept.includes('alexa')) {
        json(ctx.res, 200, formatAlexaResponse(result));
        return;
      }
      if (platform === 'google' || accept.includes('google')) {
        json(ctx.res, 200, formatGoogleResponse(result));
        return;
      }
      json(ctx.res, 200, formatHomeAssistantResponse(result));
    }) as RouteHandler,
  },

  // ── Streaming STT Sessions ─────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/stream-stt',
    handler: (async (ctx): Promise<void> => {
      const { sessionId, chunk, finalize } = ctx.body as { sessionId?: string; chunk?: string; finalize?: boolean };
      if (!sessionId) {
        json(ctx.res, 400, { error: 'sessionId requerido' });
        return;
      }

      const { createStreamingSTT } = await import('../voice/streamingSTT.js');
      type STTSessionMap = Record<string, { session: ReturnType<typeof createStreamingSTT>; results: unknown[] }>;
      const sessions: STTSessionMap =
        ((global as Record<string, unknown>).__sttSessions as STTSessionMap | undefined) ?? {};
      (global as Record<string, unknown>).__sttSessions = sessions;

      if (!sessions[sessionId]) {
        sessions[sessionId] = {
          session: createStreamingSTT(
            (result) => {
              sessions[sessionId]!.results.push(result);
            },
            { language: getLocale() },
          ),
          results: [],
        };
      }

      const s = sessions[sessionId]!;

      if (finalize) {
        await s.session.finalize();
        const results = s.results;
        delete sessions[sessionId];
        json(ctx.res, 200, { sessionId, results });
        return;
      }

      if (chunk) {
        const buffer = Buffer.from(chunk, 'base64');
        s.session.pushAudio(buffer);
      }

      json(ctx.res, 200, { sessionId, buffered: s.results.length });
    }) as RouteHandler,
  },

  // ── Discovery / Config para asistentes ─────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/discovery',
    handler: ((ctx): void => {
      json(ctx.res, 200, {
        name: 'FeedIA Voice Agent',
        version: '2.0',
        endpoints: {
          webhook: '/api/voice/webhook',
          command: '/api/voice/command',
          wake: '/api/voice/wake-v2',
          macros: '/api/voice/macros',
        },
        platforms: ['home_assistant', 'alexa', 'google', 'generic'],
        alexa: { intents: ALEXA_INTENTS },
        google: { intents: GOOGLE_ACTIONS_INTENTS },
        authentication: process.env['WEBHOOK_SECRET'] ? 'token_required' : 'none',
      });
    }) as RouteHandler,
  },

  // ── Sentiment History Dashboard ────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/sentiment-history',
    handler: (async (ctx): Promise<void> => {
      const { getOrCreateContext, listActiveSessions } = await import('../voice/voiceContext.js');
      const limit = Math.min(100, Math.max(1, Number(ctx.query['limit'] ?? 20)));
      const sessions = listActiveSessions();
      const history: Array<{ sessionId: string; turn: number; role: string; content: string; sentiment?: unknown }> =
        [];

      for (const sid of sessions.slice(-10)) {
        const ctxVoice = getOrCreateContext(sid);
        for (const [idx, turn] of ctxVoice.turns.entries()) {
          history.push({
            sessionId: sid,
            turn: idx,
            role: turn.role,
            content: turn.content.slice(0, 100),
            sentiment: turn.actionType ? undefined : undefined, // sentiment could be stored in future
          });
        }
      }

      json(ctx.res, 200, {
        totalSessions: sessions.length,
        totalTurns: history.length,
        history: history.slice(-limit),
      });
    }) as RouteHandler,
  },

  // ── Alexa Skills Kit Endpoint ──────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/alexa-skill',
    handler: (async (ctx): Promise<void> => {
      const body = ctx.body as {
        request?: { type: string; intent?: { name: string; slots?: Record<string, { value?: string }> } };
        session?: { sessionId?: string };
      };
      const request = body.request;
      const sessionId = body.session?.sessionId ?? `alexa-${Date.now()}`;

      if (!request) {
        json(ctx.res, 400, { error: 'request requerido' });
        return;
      }

      // LaunchRequest / IntentRequest
      let command = '';
      if (request.type === 'LaunchRequest') {
        command = 'ayuda';
      } else if (request.type === 'IntentRequest' && request.intent) {
        const intentName = request.intent.name;
        const slots = request.intent.slots ?? {};
        const slotValues = Object.values(slots)
          .map((s) => s.value)
          .filter(Boolean)
          .join(' ');
        command = `${intentName} ${slotValues}`.trim();
      }

      const result = await handleAssistantRequest({
        platform: 'alexa',
        command,
        sessionId,
      });

      json(ctx.res, 200, formatAlexaResponse(result));
    }) as RouteHandler,
  },

  // ── Offline Mode Status ────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/offline-status',
    handler: (async (ctx): Promise<void> => {
      const { detectOfflineEngines } = await import('../voice/offlineMode.js');
      json(ctx.res, 200, detectOfflineEngines());
    }) as RouteHandler,
  },

  // ── Training Wizard ────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/training/start',
    handler: (async (ctx): Promise<void> => {
      const { id, name, label } = ctx.body as { id: string; name: string; label: string };
      if (!id || !name) {
        json(ctx.res, 400, { error: 'id y name requeridos' });
        return;
      }
      const { startTraining, getTrainingSteps } = await import('../voice/trainingWizard.js');
      const session = startTraining(id, name, label as 'admin' | 'operator' | 'guest');
      json(ctx.res, 200, { session, steps: getTrainingSteps() });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/training/submit',
    handler: (async (ctx): Promise<void> => {
      const { id, audio } = ctx.body as { id: string; audio?: string };
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { submitSample } = await import('../voice/trainingWizard.js');
      const buffer = audio ? Buffer.from(audio, 'base64') : Buffer.alloc(0);
      const result = submitSample(id, buffer);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Conversation Export ────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/export',
    handler: (async (ctx): Promise<void> => {
      const { format, sessionId } = ctx.body as { format?: string; sessionId?: string };
      const { exportConversation } = await import('../voice/conversationExport.js');
      const result = exportConversation({ format: format as never, sessionId });
      json(ctx.res, 200, { path: result.path, size: result.content.length });
    }) as RouteHandler,
  },

  // ── Speaker Triggers ───────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/speaker-triggers',
    handler: ((ctx): void => {
      const { profileId, macroName } = ctx.body as { profileId: string; macroName: string };
      if (!profileId || !macroName) {
        json(ctx.res, 400, { error: 'profileId y macroName requeridos' });
        return;
      }
      assignMacroToSpeaker(profileId, macroName);
      json(ctx.res, 200, { ok: true });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/speaker-triggers',
    handler: ((ctx): void => {
      json(ctx.res, 200, { triggers: listSpeakerTriggers() });
    }) as RouteHandler,
  },
  {
    method: 'DELETE',
    pattern: '/api/voice/speaker-triggers',
    handler: ((ctx): void => {
      const { profileId } = ctx.body as { profileId: string };
      if (!profileId) {
        json(ctx.res, 400, { error: 'profileId requerido' });
        return;
      }
      removeMacroFromSpeaker(profileId);
      json(ctx.res, 200, { ok: true });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/speaker-triggers/run',
    handler: (async (ctx): Promise<void> => {
      const { profileId } = ctx.body as { profileId: string };
      if (!profileId) {
        json(ctx.res, 400, { error: 'profileId requerido' });
        return;
      }
      const result = await runSpeakerTrigger(profileId);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Voice Analytics ────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/analytics/summary',
    handler: (async (ctx): Promise<void> => {
      const { getAnalyticsSummary } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, getAnalyticsSummary(days));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/heatmap',
    handler: (async (ctx): Promise<void> => {
      const { getIntentHeatmap } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, getIntentHeatmap(days));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/success-rate',
    handler: (async (ctx): Promise<void> => {
      const { getSuccessRate } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, getSuccessRate(days));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/hourly',
    handler: (async (ctx): Promise<void> => {
      const { getHourlyActivity } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, getHourlyActivity(days));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/top-commands',
    handler: (async (ctx): Promise<void> => {
      const { getTopCommands } = await import('../voice/voiceAnalytics.js');
      const limit = Math.min(50, Math.max(1, Number(ctx.query['limit'] ?? 10)));
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, { commands: getTopCommands(limit, days) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/speakers',
    handler: (async (ctx): Promise<void> => {
      const { getSpeakerStats } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, { speakers: getSpeakerStats(days) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/engines',
    handler: (async (ctx): Promise<void> => {
      const { getEngineReliability } = await import('../voice/voiceAnalytics.js');
      const days = Math.min(90, Math.max(1, Number(ctx.query['days'] ?? 7)));
      json(ctx.res, 200, getEngineReliability(days));
    }) as RouteHandler,
  },

  // ── Custom Wake Words ──────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/custom-wake-words',
    handler: (async (ctx): Promise<void> => {
      const { phrase, language, displayName } = ctx.body as { phrase: string; language: string; displayName: string };
      if (!phrase || !displayName) {
        json(ctx.res, 400, { error: 'phrase y displayName requeridos' });
        return;
      }
      const { addCustomWakeWord } = await import('../voice/customWakeWord.js');
      const cw = addCustomWakeWord(phrase, language ?? 'es-AR', displayName);
      json(ctx.res, 200, cw);
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/custom-wake-words/porcupine',
    handler: (async (ctx): Promise<void> => {
      const { phrase, language, displayName, ppnBase64 } = ctx.body as {
        phrase: string;
        language: string;
        displayName: string;
        ppnBase64: string;
      };
      if (!phrase || !displayName || !ppnBase64) {
        json(ctx.res, 400, { error: 'phrase, displayName y ppnBase64 requeridos' });
        return;
      }
      const { addPorcupineWakeWord } = await import('../voice/customWakeWord.js');
      const cw = addPorcupineWakeWord(phrase, language ?? 'es-AR', displayName, ppnBase64);
      json(ctx.res, 200, cw);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/custom-wake-words',
    handler: (async (ctx): Promise<void> => {
      const { listCustomWakeWords } = await import('../voice/customWakeWord.js');
      json(ctx.res, 200, { wakeWords: listCustomWakeWords() });
    }) as RouteHandler,
  },
  {
    method: 'DELETE',
    pattern: '/api/voice/custom-wake-words/:id',
    handler: (async (ctx): Promise<void> => {
      const id = ctx.params['id'];
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { removeCustomWakeWord } = await import('../voice/customWakeWord.js');
      const ok = removeCustomWakeWord(id);
      json(ctx.res, 200, { ok });
    }) as RouteHandler,
  },
  {
    method: 'PATCH',
    pattern: '/api/voice/custom-wake-words/:id/activate',
    handler: (async (ctx): Promise<void> => {
      const id = ctx.params['id'];
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { activateCustomWakeWord } = await import('../voice/customWakeWord.js');
      activateCustomWakeWord(id);
      json(ctx.res, 200, { ok: true });
    }) as RouteHandler,
  },
  {
    method: 'PATCH',
    pattern: '/api/voice/custom-wake-words/:id/deactivate',
    handler: (async (ctx): Promise<void> => {
      const id = ctx.params['id'];
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { deactivateCustomWakeWord } = await import('../voice/customWakeWord.js');
      deactivateCustomWakeWord(id);
      json(ctx.res, 200, { ok: true });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/keyword/:name',
    handler: (async (ctx): Promise<void> => {
      const name = ctx.params['name'];
      if (!name) {
        json(ctx.res, 400, { error: 'name requerido' });
        return;
      }
      const { getPpnFilePath } = await import('../voice/customWakeWord.js');
      const ppnPath = getPpnFilePath(name);
      if (!ppnPath) {
        json(ctx.res, 404, { error: 'keyword not found' });
        return;
      }
      // Serve the PPN file
      const { readFileSync } = await import('node:fs');
      const buffer = readFileSync(ppnPath);
      ctx.res.setHeader('content-type', 'application/octet-stream');
      ctx.res.statusCode = 200;
      ctx.res.end(buffer);
    }) as RouteHandler,
  },

  // ── Voice Cloning ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/clone',
    handler: (async (ctx): Promise<void> => {
      const { name, description, audioSamples } = ctx.body as {
        name: string;
        description?: string;
        audioSamples: string[];
      };
      if (!name || !audioSamples?.length) {
        json(ctx.res, 400, { error: 'name y audioSamples requeridos' });
        return;
      }
      const { cloneVoice } = await import('../voice/voiceCloning.js');
      const buffers = audioSamples.map((b) => Buffer.from(b, 'base64'));
      const voice = await cloneVoice(name, buffers, description);
      json(ctx.res, 200, voice);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/clones',
    handler: (async (ctx): Promise<void> => {
      const { listClonedVoices } = await import('../voice/voiceCloning.js');
      json(ctx.res, 200, { voices: listClonedVoices() });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/clones/:id',
    handler: (async (ctx): Promise<void> => {
      const id = ctx.params['id'];
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { getClonedVoice } = await import('../voice/voiceCloning.js');
      const voice = getClonedVoice(id);
      if (!voice) {
        json(ctx.res, 404, { error: 'voice not found' });
        return;
      }
      json(ctx.res, 200, voice);
    }) as RouteHandler,
  },
  {
    method: 'DELETE',
    pattern: '/api/voice/clones/:id',
    handler: (async (ctx): Promise<void> => {
      const id = ctx.params['id'];
      if (!id) {
        json(ctx.res, 400, { error: 'id requerido' });
        return;
      }
      const { deleteClonedVoice } = await import('../voice/voiceCloning.js');
      const ok = await deleteClonedVoice(id);
      json(ctx.res, 200, { ok });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/clone-speak',
    handler: (async (ctx): Promise<void> => {
      const { voiceId, text, language } = ctx.body as { voiceId: string; text: string; language?: string };
      if (!voiceId || !text) {
        json(ctx.res, 400, { error: 'voiceId y text requeridos' });
        return;
      }
      const { speakWithClonedVoice } = await import('../voice/voiceCloning.js');
      const result = await speakWithClonedVoice(voiceId, text, { language: language as never });
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },

  // ── Translation ────────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/translate',
    handler: (async (ctx): Promise<void> => {
      const { text, targetLang, sourceLang } = ctx.body as { text: string; targetLang: string; sourceLang?: string };
      if (!text || !targetLang) {
        json(ctx.res, 400, { error: 'text y targetLang requeridos' });
        return;
      }
      const { translate } = await import('../voice/realtimeTranslation.js');
      const result = await translate(text, targetLang, sourceLang);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/languages',
    handler: (async (ctx): Promise<void> => {
      const { getSupportedLanguages } = await import('../voice/realtimeTranslation.js');
      json(ctx.res, 200, { languages: getSupportedLanguages() });
    }) as RouteHandler,
  },

  // ── Emergency Commands ─────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/voice/emergency',
    handler: (async (ctx): Promise<void> => {
      const { action } = ctx.body as { action: string };
      if (!action) {
        json(ctx.res, 400, { error: 'action requerido' });
        return;
      }
      const validActions = ['pause', 'resume', 'status', 'force_approve', 'emergency_mode', 'shutdown'];
      if (!validActions.includes(action)) {
        json(ctx.res, 400, { error: 'acción no válida' });
        return;
      }
      const brand = loadBrandProfile();
      const { executeEmergencyCommand } = await import('../voice/emergencyCommands.js');
      const result = await executeEmergencyCommand(
        action as 'pause' | 'resume' | 'status' | 'force_approve' | 'emergency_mode' | 'shutdown',
        brand,
      );
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/emergency/status',
    handler: (async (ctx): Promise<void> => {
      const { getEmergencyStatus } = await import('../voice/emergencyCommands.js');
      json(ctx.res, 200, getEmergencyStatus());
    }) as RouteHandler,
  },

  // ── Extended Routes (Phases 7-10) ──────────────────────────────────────────
  ...voiceExtendedRoutes,
];
