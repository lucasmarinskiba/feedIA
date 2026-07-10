/**
 * Higgsfield connection routes — per-user API key management.
 *
 * GET  /api/settings/higgsfield/status      → { connected, plan, models, connectedAt }
 * POST /api/settings/higgsfield/connect     { apiKey } → validate + save
 * POST /api/settings/higgsfield/disconnect  → revoke
 * GET  /api/video/higgsfield/models         → available models for user
 * POST /api/video/higgsfield/generate       { prompt, model?, aspectRatio?, durationSeconds? }
 * POST /api/image/higgsfield/generate       { prompt, model?, aspectRatio?, numImages? }
 */

import { json, type RouteDefinition, type RouteContext } from './http.js';
import {
  saveHiggsfieldCredentials,
  loadHiggsfieldCredentials,
  deleteHiggsfieldCredentials,
  isHiggsfieldConnected,
  validateHiggsfieldApiKey,
} from '../integrations/higgsfieldAuth.js';
import {
  generateVideoAndWait as higgsfieldVideo,
  generateImageAndWait as higgsfieldImage,
  type HiggsfieldVideoModel,
  type HiggsfieldImageModel,
} from '../integrations/higgsfield.js';
import { getUser, updateUser } from '../integrations/userRegistry.js';
import type { ProviderMode } from '../integrations/userRegistry.js';
import { log } from '../agent/logger.js';

const VALID_MODES: ProviderMode[] = ['auto', 'higgsfield-first', 'speed', 'quality'];

const DEFAULT_MODELS = [
  'seedance-v1-lite',
  'seedance-v1-pro',
  'wan-2.1-t2v',
  'wan-2.1-i2v',
  'kling-v1',
  'kling-v1.5',
];

/** Resolve user handle from query param ?handle=@foo or request body. */
const getHandle = (ctx: RouteContext): string | null =>
  (ctx.query['handle'] as string | undefined) ??
  ((ctx.body as Record<string, unknown>)?.['handle'] as string | undefined) ??
  null;

export const buildHiggsfieldRoutes = (): RouteDefinition[] => [
  // ── Status ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/higgsfield/status',
    handler: (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const connected = isHiggsfieldConnected(handle);
      const creds = connected ? loadHiggsfieldCredentials(handle) : null;

      json(ctx.res, 200, {
        ok: true,
        connected,
        plan: creds?.plan ?? null,
        availableModels: creds?.availableModels ?? DEFAULT_MODELS,
        connectedAt: creds?.connectedAt ?? null,
      });
    },
  },

  // ── Connect (validate + save API key) ─────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/settings/higgsfield/connect',
    handler: async (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const { apiKey } = ctx.body as { apiKey?: string };
      if (!apiKey?.trim()) {
        return json(ctx.res, 400, { ok: false, error: 'apiKey required' });
      }

      log.info('[HiggsfieldRoutes] Validating API key', { handle });
      const validation = await validateHiggsfieldApiKey(apiKey.trim());

      if (!validation.valid) {
        return json(ctx.res, 401, {
          ok: false,
          error: 'API key inválida. Revisá tu key en app.higgsfield.ai/settings/api',
        });
      }

      saveHiggsfieldCredentials(handle, {
        apiKey: apiKey.trim(),
        connectedAt: new Date().toISOString(),
        plan: validation.plan,
        availableModels: validation.models ?? DEFAULT_MODELS,
      });

      log.info('[HiggsfieldRoutes] Connected', { handle, plan: validation.plan });

      json(ctx.res, 200, {
        ok: true,
        connected: true,
        plan: validation.plan ?? 'standard',
        availableModels: validation.models ?? DEFAULT_MODELS,
        message:
          'Higgsfield conectado. Ahora podés generar videos con SeeDance, Wan 2.1, Kling y más.',
      });
    },
  },

  // ── Disconnect ─────────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/settings/higgsfield/disconnect',
    handler: (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const deleted = deleteHiggsfieldCredentials(handle);
      log.info('[HiggsfieldRoutes] Disconnected', { handle });
      json(ctx.res, 200, { ok: true, disconnected: deleted });
    },
  },

  // ── Available models ───────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/video/higgsfield/models',
    handler: (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const creds = loadHiggsfieldCredentials(handle);
      if (!creds?.apiKey) {
        return json(ctx.res, 403, {
          ok: false,
          error: 'Higgsfield no conectado. Ingresá tu API key en Ajustes → Conexiones.',
        });
      }

      json(ctx.res, 200, {
        ok: true,
        models: creds.availableModels ?? DEFAULT_MODELS,
        plan: creds.plan ?? 'standard',
      });
    },
  },

  // ── Generate video ─────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/video/higgsfield/generate',
    handler: async (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const creds = loadHiggsfieldCredentials(handle);
      if (!creds?.apiKey) {
        return json(ctx.res, 403, {
          ok: false,
          error: 'Higgsfield no conectado. Ingresá tu API key en Ajustes → Conexiones.',
        });
      }

      const {
        prompt,
        model = 'auto',
        aspectRatio = '9:16',
        durationSeconds = 5,
        negativePrompt,
      } = ctx.body as {
        prompt?: string;
        model?: string;
        aspectRatio?: string;
        durationSeconds?: number;
        negativePrompt?: string;
      };

      if (!prompt?.trim()) return json(ctx.res, 400, { ok: false, error: 'prompt required' });

      log.info('[HiggsfieldRoutes] Video generate', { handle, model, durationSeconds });

      const result = await higgsfieldVideo(
        creds.apiKey,
        {
          prompt: prompt.trim(),
          model: model as HiggsfieldVideoModel,
          aspectRatio: aspectRatio as '9:16' | '16:9' | '1:1' | '4:5',
          durationSeconds: durationSeconds as 4 | 5 | 6 | 8 | 10 | 15,
          negativePrompt,
        },
        180000,
      );

      if (!result || result.status !== 'completed') {
        return json(ctx.res, 500, {
          ok: false,
          error: result?.error ?? 'Generación fallida o timeout',
        });
      }

      json(ctx.res, 200, {
        ok: true,
        videoUrl: result.resultUrl,
        provider: result.provider,
        model: result.model,
      });
    },
  },

  // ── Provider mode (GET + POST) ────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/provider-mode',
    handler: (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });
      const user = getUser(handle);
      json(ctx.res, 200, { ok: true, mode: user?.providerMode ?? 'auto' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/settings/provider-mode',
    handler: (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });
      const { mode } = ctx.body as { mode?: string };
      if (!mode || !VALID_MODES.includes(mode as ProviderMode)) {
        return json(ctx.res, 400, {
          ok: false,
          error: `mode debe ser uno de: ${VALID_MODES.join(', ')}`,
        });
      }
      updateUser(handle, { providerMode: mode as ProviderMode });
      log.info('[HiggsfieldRoutes] Provider mode updated', { handle, mode });
      json(ctx.res, 200, { ok: true, mode });
    },
  },

  // ── Generate image ─────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/image/higgsfield/generate',
    handler: async (ctx) => {
      const handle = getHandle(ctx);
      if (!handle) return json(ctx.res, 401, { ok: false, error: 'Not authenticated' });

      const creds = loadHiggsfieldCredentials(handle);
      if (!creds?.apiKey) {
        return json(ctx.res, 403, {
          ok: false,
          error: 'Higgsfield no conectado. Ingresá tu API key en Ajustes → Conexiones.',
        });
      }

      const {
        prompt,
        model = 'auto',
        aspectRatio = '4:5',
        numImages = 1,
      } = ctx.body as {
        prompt?: string;
        model?: string;
        aspectRatio?: string;
        numImages?: number;
      };

      if (!prompt?.trim()) return json(ctx.res, 400, { ok: false, error: 'prompt required' });

      const result = await higgsfieldImage(
        creds.apiKey,
        {
          prompt: prompt.trim(),
          model: model as HiggsfieldImageModel,
          aspectRatio: aspectRatio as '9:16' | '16:9' | '1:1' | '4:5',
          numImages: numImages as 1 | 2 | 4,
        },
        60000,
      );

      if (!result || result.status !== 'completed') {
        return json(ctx.res, 500, {
          ok: false,
          error: result?.error ?? 'Generación fallida o timeout',
        });
      }

      json(ctx.res, 200, {
        ok: true,
        imageUrl: result.resultUrl,
        imageUrls: result.resultUrls,
        provider: result.provider,
        model: result.model,
      });
    },
  },
];
