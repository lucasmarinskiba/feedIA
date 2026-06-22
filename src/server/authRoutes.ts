/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Auth Routes — endpoints multi-tenant.
 *
 *   POST   /api/auth/register         — crear cuenta de usuario
 *   POST   /api/auth/login            — iniciar sesión (set cookie)
 *   POST   /api/auth/logout           — cerrar sesión
 *   GET    /api/auth/me               — usuario actual (lee cookie)
 *   POST   /api/auth/close-account    — cerrar cuenta de usuario
 *   POST   /api/auth/upgrade-plan     — cambiar plan
 *
 *   GET    /api/users/brands          — cuentas IG del user
 *   POST   /api/users/brands/add      — agregar cuenta IG
 *   POST   /api/users/brands/remove   — quitar cuenta IG
 *   POST   /api/users/brands/active   — cambiar cuenta activa
 */

import { json, type RouteDefinition } from './http.js';
import {
  registerUser,
  login,
  logout,
  getSessionUser,
  closeUserAccount,
  upgradePlan,
  addBrandToUser,
  removeBrandFromUser,
  setActiveBrand,
  canAddBrand,
  sanitizeUser,
  PLAN_LIMITS,
  type PlanTier,
} from '../auth/userAccounts.js';

const SESSION_COOKIE = 'feedia_session';

const parseCookie = (cookieHeader: string | undefined, name: string): string | undefined => {
  if (!cookieHeader) return undefined;
  const m = cookieHeader.match(new RegExp(`${name}=([^;]+)`));
  return m?.[1];
};

const buildSessionCookie = (token: string, expiresAt: string): string => {
  const expires = new Date(expiresAt).toUTCString();
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`;
};

const clearSessionCookie = (): string =>
  `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;

export const authRoutes: RouteDefinition[] = [
  // ── Register ──────────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/auth/register',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { email?: string; password?: string; displayName?: string; plan?: PlanTier };
      if (!b.email || !b.password || !b.displayName) {
        json(res, 400, { error: 'email, password, displayName requeridos' });
        return;
      }
      try {
        const user = await registerUser({
          email: b.email,
          password: b.password,
          displayName: b.displayName,
          plan: b.plan,
        });
        json(res, 201, { user: sanitizeUser(user) });
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : 'Error al registrar' });
      }
    },
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/auth/login',
    handler: async ({ req, res, body }) => {
      const b = (body ?? {}) as { email?: string; password?: string };
      if (!b.email || !b.password) {
        json(res, 400, { error: 'email y password requeridos' });
        return;
      }

      const result = await login(b.email, b.password, {
        userAgent: req.headers['user-agent'] ?? '',
        ip: req.socket?.remoteAddress ?? '',
      });
      if (!result) {
        json(res, 401, { error: 'Credenciales inválidas' });
        return;
      }

      res.setHeader('Set-Cookie', buildSessionCookie(result.session.token, result.session.expiresAt));
      json(res, 200, { user: sanitizeUser(result.user), expiresAt: result.session.expiresAt });
    },
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/auth/logout',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      if (token) await logout(token);
      res.setHeader('Set-Cookie', clearSessionCookie());
      json(res, 200, { ok: true });
    },
  },

  // ── Me (current user) ─────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/auth/me',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      json(res, 200, {
        user: sanitizeUser(user),
        limits: PLAN_LIMITS[user.plan],
      });
    },
  },

  // ── Close user account ────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/auth/close-account',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const b = (body ?? {}) as { confirm?: string };
      if (b.confirm !== user.email) {
        json(res, 400, { error: 'Confirma con tu email para cerrar la cuenta' });
        return;
      }

      const ok = await closeUserAccount(user.id);
      res.setHeader('Set-Cookie', clearSessionCookie());
      json(res, 200, { ok });
    },
  },

  // ── Upgrade plan ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/auth/upgrade-plan',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const b = (body ?? {}) as { plan?: PlanTier };
      if (!b.plan) {
        json(res, 400, { error: 'plan requerido' });
        return;
      }
      const updated = await upgradePlan(user.id, b.plan);
      json(res, 200, { user: updated ? sanitizeUser(updated) : null });
    },
  },

  // ── List brands del user ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/users/brands',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const { listBrandProfiles } = await import('../config/accounts.js');
      const allBrands = listBrandProfiles();
      const userBrands = allBrands.filter((b) => user.brandIds.includes(b.id));
      const capability = await canAddBrand(user.id);

      json(res, 200, {
        brands: userBrands,
        activeBrandId: user.activeBrandId,
        canAdd: capability.canAdd,
        current: capability.current,
        max: capability.max,
        plan: user.plan,
      });
    },
  },

  // ── Add brand (cuenta IG) ─────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/users/brands/add',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const b = (body ?? {}) as { brandId?: string; profile?: Record<string, unknown> };
      if (!b.brandId) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }

      const capability = await canAddBrand(user.id);
      if (!capability.canAdd) {
        json(res, 403, {
          error: capability.reason,
          current: capability.current,
          max: capability.max,
          suggestedUpgrade: user.plan === 'free' ? 'pro' : 'business',
        });
        return;
      }

      // Si pasaron profile (minimal o completo), guardarlo primero
      if (b.profile) {
        const { saveBrandProfile } = await import('../config/accounts.js');
        const { BrandProfileSchema } = await import('../config/types.js');
        const { buildMinimalBrandProfile } = await import('../auth/brandHelpers.js');
        const raw = b.profile as Record<string, unknown>;
        let parsed;
        try {
          parsed = BrandProfileSchema.parse(raw);
        } catch {
          // Si falla validación, intentar con minimal helper
          parsed = buildMinimalBrandProfile({
            id: b.brandId,
            name: (raw['name'] as string) ?? b.brandId,
            niche: (raw['niche'] as string) ?? 'general',
            handle: raw['handle'] as string | undefined,
            industryCategory: (raw['industryCategory'] as string) ?? 'general',
          });
        }
        saveBrandProfile(b.brandId, parsed);
      }

      try {
        const updated = await addBrandToUser(user.id, b.brandId);
        json(res, 200, { user: updated ? sanitizeUser(updated) : null });
      } catch (err) {
        json(res, 400, { error: err instanceof Error ? err.message : 'Error al agregar' });
      }
    },
  },

  // ── Remove brand ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/users/brands/remove',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const b = (body ?? {}) as { brandId?: string };
      if (!b.brandId) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      const updated = await removeBrandFromUser(user.id, b.brandId);
      json(res, 200, { user: updated ? sanitizeUser(updated) : null });
    },
  },

  // ── Cambiar brand activa ──────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/users/brands/active',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const b = (body ?? {}) as { brandId?: string };
      if (!b.brandId) {
        json(res, 400, { error: 'brandId requerido' });
        return;
      }
      try {
        const updated = await setActiveBrand(user.id, b.brandId);
        json(res, 200, { user: updated ? sanitizeUser(updated) : null });
      } catch (err) {
        json(res, 403, { error: err instanceof Error ? err.message : 'Error' });
      }
    },
  },

  // ── Plans info (público) ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/plans',
    handler: async ({ res }) => {
      json(res, 200, { plans: PLAN_LIMITS });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  ME-CAROUSEL — Endpoints auth-aware end-to-end (crear + publicar)
  // ════════════════════════════════════════════════════════════════════════

  /** Crear + renderizar + opcionalmente publicar carrusel en la cuenta activa del user */
  {
    method: 'POST',
    pattern: '/api/me/carousel/full',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'No tenés cuenta IG activa. Agregá una primero.' });
        return;
      }

      const b = (body ?? {}) as {
        prompt?: string;
        slideCount?: number;
        formula?: 'AIDA' | 'PAS';
        goal?: 'educar' | 'vender' | 'inspirar' | 'entretener' | 'viralizar';
        publish?: boolean;
        scheduledFor?: string;
        path?: 'A-native' | 'B-canva' | 'C-fal-ai';
        canvaTemplateId?: string;
        dryRun?: boolean;
      };

      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }

      // Quota check ANTES de gastar Claude tokens
      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (!quota.allowed) {
        json(res, 429, {
          error: quota.reason,
          quota,
          upgrade: user.plan === 'free' ? 'pro' : 'business',
        });
        return;
      }

      try {
        const { loadBrandProfileById } = await import('../config/accounts.js');
        const brand = loadBrandProfileById(brandId);

        const { createQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
        const { runCarouselPipeline } = await import('../capabilities/quickCarousel/carouselPipeline.js');

        const pkg = await createQuickCarousel(brand, {
          prompt: b.prompt,
          slideCount: b.slideCount,
          formula: b.formula,
          goal: b.goal,
        });

        await incrementPostCounter(user.id);

        const pipelineResult = await runCarouselPipeline(brand, pkg, {
          path: b.path,
          publishToInstagram: b.publish ?? false,
          scheduledFor: b.scheduledFor,
          canvaTemplateId: b.canvaTemplateId,
          dryRun: b.dryRun,
        });

        // Notificar éxito
        const { createNotification } = await import('../auth/notificationCenter.js');
        if (pipelineResult.status === 'published') {
          await incrementPublishedCounter(user.id);
          await createNotification({
            userId: user.id,
            type: 'carousel-published',
            priority: 'success',
            title: '✅ Carrusel publicado',
            message: `Tu carrusel sobre "${b.prompt.slice(0, 80)}" se publicó en Instagram.`,
            metadata: { pkgId: pkg.id, brandId, publishedUrl: pipelineResult.publishedUrl },
          });
        } else if (pipelineResult.status === 'scheduled') {
          await createNotification({
            userId: user.id,
            type: 'carousel-scheduled-ran',
            priority: 'info',
            title: '📅 Carrusel programado',
            message: `Tu carrusel se publicará el ${b.scheduledFor}.`,
            metadata: { pkgId: pkg.id, brandId, scheduledFor: b.scheduledFor },
          });
        } else if (pipelineResult.status === 'failed') {
          await createNotification({
            userId: user.id,
            type: 'carousel-failed',
            priority: 'critical',
            title: '❌ Falló el carrusel',
            message: `Errores: ${pipelineResult.errors.join(' / ')}`,
            metadata: { pkgId: pkg.id, brandId, errors: pipelineResult.errors },
          });
        }

        json(res, 200, {
          packageId: pkg.id,
          brandId,
          prompt: b.prompt,
          slides: pkg.slides.length,
          caption: pkg.caption.full,
          hashtags: pkg.hashtags.flat,
          pipeline: pipelineResult,
          previewUrl: `/api/me/carousel/preview?id=${pkg.id}`,
          quota: await checkPostQuota(user.id),
        });
      } catch (err) {
        json(res, 500, { error: err instanceof Error ? err.message : 'Error en pipeline' });
      }
    },
  },

  /** Status / progreso de un paquete del user */
  {
    method: 'GET',
    pattern: '/api/me/carousel/status',
    handler: async ({ req, res, query }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 404, { error: 'Sin cuenta IG activa' });
        return;
      }

      const id = (query as Record<string, string>)?.id;
      const { getQuickCarousel, listQuickCarousels } = await import('../capabilities/quickCarousel/quickCarousel.js');
      if (id) {
        const pkg = await getQuickCarousel(brandId, id);
        json(res, pkg ? 200 : 404, pkg ?? { error: 'No encontrado' });
      } else {
        const list = await listQuickCarousels(brandId, 10);
        json(res, 200, { carousels: list, count: list.length });
      }
    },
  },

  /** Capacidades disponibles del sistema (qué APIs hay configuradas) */
  {
    method: 'GET',
    pattern: '/api/me/system/capabilities',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }

      const { checkCapabilities } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const caps = checkCapabilities();
      const plan = PLAN_LIMITS[user.plan];

      json(res, 200, {
        ...caps,
        userPlan: user.plan,
        planLimits: plan,
        canPublish: caps.hasUploadPost,
        publishHint: caps.hasUploadPost
          ? 'OK — sistema puede publicar automáticamente'
          : 'Falta UPLOAD_POST_KEY en env. Sin esto el sistema genera pero NO publica.',
      });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  ME-REEL — Auth-aware end-to-end
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/me/reel/full',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'Sin cuenta IG activa' });
        return;
      }

      const b = (body ?? {}) as {
        prompt?: string;
        style?:
          | 'storytelling'
          | 'tutorial'
          | 'pov'
          | 'transformation'
          | 'comedy'
          | 'reaction'
          | 'listicle'
          | 'mythbusting';
        duration?: 15 | 30 | 60 | 90;
        publish?: boolean;
        path?: 'A-script-only' | 'B-heygen' | 'C-runway' | 'D-fal-video';
        scheduledFor?: string;
        dryRun?: boolean;
      };
      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }

      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (!quota.allowed) {
        json(res, 429, { error: quota.reason, quota });
        return;
      }

      try {
        const { loadBrandProfileById } = await import('../config/accounts.js');
        const brand = loadBrandProfileById(brandId);
        const { createQuickReel } = await import('../capabilities/quickReel/quickReel.js');
        const { runReelPipeline } = await import('../capabilities/quickReel/reelPipeline.js');

        const script = await createQuickReel(brand, { prompt: b.prompt, style: b.style, duration: b.duration });
        await incrementPostCounter(user.id);

        const pipeline = await runReelPipeline(brand, script, {
          path: b.path,
          publishToInstagram: b.publish ?? false,
          scheduledFor: b.scheduledFor,
          dryRun: b.dryRun,
        });

        const { createNotification } = await import('../auth/notificationCenter.js');
        if (pipeline.status === 'published') {
          await incrementPublishedCounter(user.id);
          await createNotification({
            userId: user.id,
            type: 'carousel-published',
            priority: 'success',
            title: '✅ Reel publicado',
            message: `Reel "${b.prompt.slice(0, 80)}" en IG.`,
            metadata: { id: script.id },
          });
        } else if (pipeline.status === 'script-only') {
          await createNotification({
            userId: user.id,
            type: 'carousel-failed',
            priority: 'warning',
            title: '📝 Reel: solo guion',
            message: 'Sin API de video configurada (HEYGEN/RUNWAY/FAL). Se generó guion + cover para grabación manual.',
            metadata: { id: script.id },
          });
        } else if (pipeline.status === 'failed') {
          await createNotification({
            userId: user.id,
            type: 'carousel-failed',
            priority: 'critical',
            title: '❌ Reel falló',
            message: pipeline.errors.join(' / '),
            metadata: { id: script.id },
          });
        }

        json(res, 200, { script, pipeline, quota: await checkPostQuota(user.id) });
      } catch (err) {
        json(res, 500, { error: err instanceof Error ? err.message : 'Error' });
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/me/reel/capabilities',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const { checkReelCapabilities } = await import('../capabilities/quickReel/reelPipeline.js');
      json(res, 200, checkReelCapabilities());
    },
  },
  {
    method: 'GET',
    pattern: '/api/me/story/capabilities',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const { checkStoryCapabilities } = await import('../capabilities/quickStory/storyPipeline.js');
      json(res, 200, checkStoryCapabilities());
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  BATCH — Genera N piezas en paralelo
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/me/batch/carousel',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'Sin cuenta IG activa' });
        return;
      }

      const b = (body ?? {}) as {
        prompts?: string[];
        slideCount?: number;
        aspectRatio?: '1:1' | '4:5' | '1.91:1';
        publish?: boolean;
        scheduledFor?: string[]; // 1 fecha por prompt opcional
      };
      if (!b.prompts?.length) {
        json(res, 400, { error: 'body.prompts (array) requerido' });
        return;
      }
      if (b.prompts.length > 10) {
        json(res, 400, { error: 'Máximo 10 carruseles por batch' });
        return;
      }

      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (quota.max !== -1 && quota.remaining < b.prompts.length) {
        json(res, 429, { error: `Quota insuficiente. Quedan ${quota.remaining}, pedís ${b.prompts.length}.`, quota });
        return;
      }

      const { loadBrandProfileById } = await import('../config/accounts.js');
      const brand = loadBrandProfileById(brandId);
      const { createQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const { runCarouselPipeline } = await import('../capabilities/quickCarousel/carouselPipeline.js');

      const results = await Promise.all(
        b.prompts.map(async (prompt, idx) => {
          try {
            const pkg = await createQuickCarousel(brand, {
              prompt,
              slideCount: b.slideCount,
              aspectRatio: b.aspectRatio,
            });
            await incrementPostCounter(user.id);
            const pipeline = await runCarouselPipeline(brand, pkg, {
              publishToInstagram: b.publish ?? false,
              scheduledFor: b.scheduledFor?.[idx],
            });
            if (pipeline.status === 'published') await incrementPublishedCounter(user.id);
            return { ok: true, prompt, packageId: pkg.id, status: pipeline.status, errors: pipeline.errors };
          } catch (err) {
            return { ok: false, prompt, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );

      json(res, 200, { results, count: results.length, quota: await checkPostQuota(user.id) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/me/batch/reel',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'Sin cuenta IG activa' });
        return;
      }

      const b = (body ?? {}) as {
        prompts?: string[];
        duration?: 15 | 30 | 60 | 90;
        customDurationSec?: number;
        aspectRatio?: '9:16' | '1:1' | '4:5';
        publish?: boolean;
        path?: 'A-script-only' | 'B-heygen' | 'C-runway' | 'D-fal-video';
      };
      if (!b.prompts?.length) {
        json(res, 400, { error: 'body.prompts (array) requerido' });
        return;
      }
      if (b.prompts.length > 5) {
        json(res, 400, { error: 'Máximo 5 reels por batch (videos pesan)' });
        return;
      }

      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (quota.max !== -1 && quota.remaining < b.prompts.length) {
        json(res, 429, { error: `Quota insuficiente. Quedan ${quota.remaining}, pedís ${b.prompts.length}.`, quota });
        return;
      }

      const { loadBrandProfileById } = await import('../config/accounts.js');
      const brand = loadBrandProfileById(brandId);
      const { createQuickReel } = await import('../capabilities/quickReel/quickReel.js');
      const { runReelPipeline } = await import('../capabilities/quickReel/reelPipeline.js');

      const results = await Promise.all(
        b.prompts.map(async (prompt) => {
          try {
            const script = await createQuickReel(brand, {
              prompt,
              duration: b.duration,
              customDurationSec: b.customDurationSec,
              aspectRatio: b.aspectRatio,
            });
            await incrementPostCounter(user.id);
            const pipeline = await runReelPipeline(brand, script, {
              path: b.path,
              publishToInstagram: b.publish ?? false,
            });
            if (pipeline.status === 'published') await incrementPublishedCounter(user.id);
            return {
              ok: true,
              prompt,
              scriptId: script.id,
              status: pipeline.status,
              needsManualRecording: pipeline.needsManualRecording,
              errors: pipeline.errors,
            };
          } catch (err) {
            return { ok: false, prompt, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );

      json(res, 200, { results, count: results.length, quota: await checkPostQuota(user.id) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/me/batch/story',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'Sin cuenta IG activa' });
        return;
      }

      const b = (body ?? {}) as {
        prompts?: string[];
        frameCount?: number;
        publish?: boolean;
        path?: 'A-native' | 'B-fal-ai' | 'C-canva';
        canvaTemplateId?: string;
      };
      if (!b.prompts?.length) {
        json(res, 400, { error: 'body.prompts (array) requerido' });
        return;
      }
      if (b.prompts.length > 10) {
        json(res, 400, { error: 'Máximo 10 stories por batch' });
        return;
      }

      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (quota.max !== -1 && quota.remaining < b.prompts.length) {
        json(res, 429, { error: `Quota insuficiente. Quedan ${quota.remaining}.`, quota });
        return;
      }

      const { loadBrandProfileById } = await import('../config/accounts.js');
      const brand = loadBrandProfileById(brandId);
      const { createQuickStory } = await import('../capabilities/quickStory/quickStory.js');
      const { runStoryPipeline } = await import('../capabilities/quickStory/storyPipeline.js');

      const results = await Promise.all(
        b.prompts.map(async (prompt) => {
          try {
            const pkg = await createQuickStory(brand, { prompt, frameCount: b.frameCount });
            await incrementPostCounter(user.id);
            const pipeline = await runStoryPipeline(brand, pkg, {
              path: b.path,
              canvaTemplateId: b.canvaTemplateId,
              publishToInstagram: b.publish ?? false,
            });
            if (pipeline.status === 'published') await incrementPublishedCounter(user.id);
            return { ok: true, prompt, packageId: pkg.id, status: pipeline.status, errors: pipeline.errors };
          } catch (err) {
            return { ok: false, prompt, error: err instanceof Error ? err.message : String(err) };
          }
        }),
      );

      json(res, 200, { results, count: results.length, quota: await checkPostQuota(user.id) });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  ME-STORY — Auth-aware end-to-end
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/me/story/full',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const brandId = user.activeBrandId;
      if (!brandId) {
        json(res, 400, { error: 'Sin cuenta IG activa' });
        return;
      }

      const b = (body ?? {}) as {
        prompt?: string;
        frameCount?: number;
        goal?: 'engagement' | 'venta' | 'awareness' | 'feedback' | 'anuncio';
        includeInteractive?: boolean;
        linkUrl?: string;
        publish?: boolean;
        path?: 'A-native' | 'B-fal-ai';
        dryRun?: boolean;
      };
      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }

      const { checkPostQuota, incrementPostCounter, incrementPublishedCounter } =
        await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      if (!quota.allowed) {
        json(res, 429, { error: quota.reason, quota });
        return;
      }

      try {
        const { loadBrandProfileById } = await import('../config/accounts.js');
        const brand = loadBrandProfileById(brandId);
        const { createQuickStory } = await import('../capabilities/quickStory/quickStory.js');
        const { runStoryPipeline } = await import('../capabilities/quickStory/storyPipeline.js');

        const pkg = await createQuickStory(brand, {
          prompt: b.prompt,
          frameCount: b.frameCount,
          goal: b.goal,
          includeInteractive: b.includeInteractive,
          linkUrl: b.linkUrl,
        });
        await incrementPostCounter(user.id);

        const pipeline = await runStoryPipeline(brand, pkg, {
          path: b.path,
          publishToInstagram: b.publish ?? false,
          dryRun: b.dryRun,
        });

        const { createNotification } = await import('../auth/notificationCenter.js');
        if (pipeline.status === 'published') {
          await incrementPublishedCounter(user.id);
          await createNotification({
            userId: user.id,
            type: 'carousel-published',
            priority: 'success',
            title: '✅ Story publicada',
            message: `Story "${b.prompt.slice(0, 80)}" en IG.`,
            metadata: { id: pkg.id },
          });
        } else if (pipeline.status === 'failed') {
          await createNotification({
            userId: user.id,
            type: 'carousel-failed',
            priority: 'critical',
            title: '❌ Story falló',
            message: pipeline.errors.join(' / '),
            metadata: { id: pkg.id },
          });
        }

        json(res, 200, { package: pkg, pipeline, quota: await checkPostQuota(user.id) });
      } catch (err) {
        json(res, 500, { error: err instanceof Error ? err.message : 'Error' });
      }
    },
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/me/notifications',
    handler: async ({ req, res, query }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const { listNotifications, getUnreadCount } = await import('../auth/notificationCenter.js');
      const q = query as Record<string, string>;
      const list = await listNotifications(user.id, {
        unreadOnly: q?.unreadOnly === 'true',
        limit: q?.limit ? Number(q.limit) : 50,
      });
      const unread = await getUnreadCount(user.id);
      json(res, 200, { notifications: list, unreadCount: unread });
    },
  },
  {
    method: 'POST',
    pattern: '/api/me/notifications/read',
    handler: async ({ req, res, body }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const b = (body ?? {}) as { id?: string; all?: boolean };
      const { markAsRead, markAllAsRead } = await import('../auth/notificationCenter.js');
      if (b.all) {
        const count = await markAllAsRead(user.id);
        json(res, 200, { ok: true, marked: count });
      } else if (b.id) {
        const ok = await markAsRead(user.id, b.id);
        json(res, ok ? 200 : 404, { ok });
      } else {
        json(res, 400, { error: 'id o all requerido' });
      }
    },
  },

  // ── Quota ─────────────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/me/quota',
    handler: async ({ req, res }) => {
      const token = parseCookie(req.headers.cookie, SESSION_COOKIE);
      const user = await getSessionUser(token);
      if (!user) {
        json(res, 401, { error: 'No autenticado' });
        return;
      }
      const { checkPostQuota, getMonthlyStats } = await import('../auth/quotaTracker.js');
      const quota = await checkPostQuota(user.id);
      const stats = await getMonthlyStats(user.id);
      json(res, 200, { quota, stats });
    },
  },

  // ── Webhook Upload-Post callback ──────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/webhooks/upload-post',
    handler: async ({ req, res, body }) => {
      // Validar firma del webhook si UPLOAD_POST_WEBHOOK_SECRET está set
      const secret = process.env['UPLOAD_POST_WEBHOOK_SECRET'];
      if (secret) {
        const sig = req.headers['x-webhook-signature'];
        if (sig !== secret) {
          json(res, 401, { error: 'Firma inválida' });
          return;
        }
      }

      const b = (body ?? {}) as {
        uploadId?: string;
        status?: 'posted' | 'failed' | 'scheduled';
        platform?: string;
        socialUrl?: string;
        socialPostId?: string;
        error?: string;
        pkgId?: string;
      };

      // Buscar pkg owner y notificar
      if (b.pkgId) {
        try {
          const fs = await import('node:fs/promises');
          const path = await import('node:path');
          const dir = path.resolve('data/quick-carousel');
          const files = await fs.readdir(dir).catch(() => []);
          const match = files.find((f) => f.includes(b.pkgId!) && f.endsWith('.json'));
          if (match) {
            const pkgData = JSON.parse(await fs.readFile(path.resolve(dir, match), 'utf-8')) as { brandId: string };
            const { findUsersByBrandId } = await import('../auth/userAccounts.js');
            const { createNotification } = await import('../auth/notificationCenter.js');
            const owners = await findUsersByBrandId(pkgData.brandId);
            for (const owner of owners) {
              await createNotification({
                userId: owner.id,
                type: b.status === 'posted' ? 'carousel-published' : 'carousel-failed',
                priority: b.status === 'posted' ? 'success' : 'critical',
                title: b.status === 'posted' ? `✅ Publicado en ${b.platform ?? 'Instagram'}` : `❌ Falló publicación`,
                message:
                  b.status === 'posted'
                    ? `Tu carrusel ya está publicado. ${b.socialUrl ?? ''}`
                    : `Error: ${b.error ?? 'desconocido'}`,
                metadata: { ...b },
              });
            }
          }
        } catch (err) {
          // No fallar el webhook por errores de notif
          const { log } = await import('../agent/logger.js');
          log.warn(`[webhook upload-post] notify failed · ${String(err)}`);
        }
      }

      json(res, 200, { ok: true, processed: true });
    },
  },

  /** Status del scheduler loop */
  {
    method: 'GET',
    pattern: '/api/scheduler/status',
    handler: async ({ res }) => {
      const { isSchedulerRunning } = await import('./schedulerLoop.js');
      const { listScheduled } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const list = await listScheduled();
      json(res, 200, {
        running: isSchedulerRunning(),
        pending: list.filter((s) => s.status === 'pending').length,
        published: list.filter((s) => s.status === 'published').length,
        failed: list.filter((s) => s.status === 'failed').length,
        nextScheduled: list
          .filter((s) => s.status === 'pending')
          .sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0]?.scheduledFor,
      });
    },
  },
];
