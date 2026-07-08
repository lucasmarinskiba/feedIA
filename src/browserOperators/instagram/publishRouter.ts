/**
 * PublishRouter — Elige la mejor vía para publicar en Instagram.
 * Prioridad: Meta API → Instagram Web → Instagram App (emulador)
 */
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import type { PostOptions, ReelOptions, StoryOptions } from './instagramWebOperator.js';
import type { AppPostOptions, AppReelOptions, AppStoryOptions } from './instagramAppOperator.js';
import { InstagramWebOperator } from './instagramWebOperator.js';
import { InstagramAppOperator } from './instagramAppOperator.js';
import { publishToInstagram } from '../../integrations/meta.js';
import { actionGate } from '../../glassbox/index.js';

export type PublishVia = 'api' | 'web' | 'app';

interface PublishResult {
  ok: boolean;
  via: PublishVia;
  postId?: string;
  url?: string;
  error?: string;
  durationMs: number;
}

interface PublishRequest {
  format: 'post' | 'reel' | 'story' | 'carousel';
  mediaPaths: string[];
  caption: string;
  hashtags?: string[];
  location?: string;
  collaborator?: string;
  audioName?: string;
  shareToFeed?: boolean;
  altText?: string;
}

/** Determina si la Meta API está disponible y puede usarse */
const canUseApi = (): boolean => !!env.meta.accessToken && !!env.meta.igBusinessId && !env.dryRun;

/** Determina si una feature requiere web/app (no disponible en API) */
const requiresWebOrApp = (req: PublishRequest): boolean => {
  // API de Instagram no soporta:
  // - Stories con stickers interactivos
  // - Collab posts
  // - Location tagging avanzado
  // - Alt text (a veces)
  if (req.format === 'story') return true;
  if (req.collaborator) return true;
  return false;
};

/** Construye el request para Meta API */
const buildApiRequest = (req: PublishRequest, brand: BrandProfile) => {
  const isCarousel = req.format === 'carousel' || req.mediaPaths.length > 1;
  const format = isCarousel ? 'carrusel' : req.format === 'reel' ? 'reel' : 'imagen';

  return {
    caption: [req.caption, ...(req.hashtags ?? [])].join(' '),
    mediaUrls: req.mediaPaths,
    firstComment: '',
    scheduledAt: undefined,
    format: format as 'imagen' | 'reel' | 'historia' | 'carrusel',
    brand,
  };
};

/** ================================================================ */
/**  Router principal                                                 */
/** ================================================================ */

export const publishToInstagramViaRouter = async (
  brand: BrandProfile,
  req: PublishRequest,
  preferredVia?: PublishVia,
): Promise<PublishResult> => {
  const start = Date.now();

  // Elegir vía
  let via: PublishVia = preferredVia ?? 'api';

  if (via === 'api' && (!canUseApi() || requiresWebOrApp(req))) {
    log.info('[PublishRouter] API no disponible o feature requiere web. Fallback a web.');
    via = 'web';
  }

  // GlassBox gate para publicación
  const gateResult = await actionGate(
    'instagram_publish',
    `Publicar ${req.format} en Instagram vía ${via}`,
    async () => true,
    { source: 'publish-router' },
  );
  if (!gateResult.ok) {
    return { ok: false, via, error: gateResult.reason ?? 'Rechazado por GlassBox', durationMs: Date.now() - start };
  }

  // Intentar publicación
  if (via === 'api' && canUseApi()) {
    try {
      const apiReq = buildApiRequest(req, brand);
      const result = await publishToInstagram(apiReq);
      return {
        ok: result.ok,
        via: 'api',
        postId: result.postId,
        url: result.url,
        error: result.error,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[PublishRouter] API falló: ${msg}. Fallback a web...`);
      via = 'web';
    }
  }

  if (via === 'web') {
    try {
      const webOperator = new InstagramWebOperator({ brand, headless: false, dryRun: env.dryRun });

      if (req.format === 'post' || req.format === 'carousel') {
        const webReq: PostOptions = {
          imagePaths: req.mediaPaths,
          caption: req.caption,
          hashtags: req.hashtags,
          altText: req.altText,
          location: req.location,
          collaborator: req.collaborator,
        };
        const result = await webOperator.publishPost(webReq);
        await webOperator.closeSession();
        return {
          ok: result.ok,
          via: 'web',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }

      if (req.format === 'reel') {
        const webReq: ReelOptions = {
          videoPath: req.mediaPaths[0]!,
          caption: req.caption,
          audioName: req.audioName,
          shareToFeed: req.shareToFeed,
        };
        const result = await webOperator.publishReel(webReq);
        await webOperator.closeSession();
        return {
          ok: result.ok,
          via: 'web',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }

      if (req.format === 'story') {
        const webReq: StoryOptions = {
          mediaPath: req.mediaPaths[0]!,
        };
        const result = await webOperator.publishStory(webReq);
        await webOperator.closeSession();
        return {
          ok: result.ok,
          via: 'web',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[PublishRouter] Web falló: ${msg}. Fallback a app...`);
      via = 'app';
    }
  }

  if (via === 'app') {
    try {
      const appOperator = new InstagramAppOperator(brand);

      if (req.format === 'post' || req.format === 'carousel') {
        const appReq: AppPostOptions = {
          mediaPath: req.mediaPaths[0]!,
          caption: req.caption,
          hashtags: req.hashtags,
          location: req.location,
        };
        const result = await appOperator.publishPost(appReq);
        return {
          ok: result.ok,
          via: 'app',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }

      if (req.format === 'reel') {
        const appReq: AppReelOptions = {
          videoPath: req.mediaPaths[0]!,
          caption: req.caption,
          audioName: req.audioName,
          shareToFeed: req.shareToFeed,
        };
        const result = await appOperator.publishReel(appReq);
        return {
          ok: result.ok,
          via: 'app',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }

      if (req.format === 'story') {
        const appReq: AppStoryOptions = {
          mediaPath: req.mediaPaths[0]!,
        };
        const result = await appOperator.publishStory(appReq);
        return {
          ok: result.ok,
          via: 'app',
          error: result.error,
          durationMs: Date.now() - start,
        };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`[PublishRouter] App también falló: ${msg}`);
      return {
        ok: false,
        via: 'app',
        error: `Todas las vías fallaron. Último error: ${msg}`,
        durationMs: Date.now() - start,
      };
    }
  }

  return {
    ok: false,
    via,
    error: 'No se pudo determinar vía de publicación',
    durationMs: Date.now() - start,
  };
};

/** Health check de todas las vías disponibles */
export const checkPublishHealth = async (
  _brand: BrandProfile,
): Promise<{
  api: boolean;
  web: boolean;
  app: boolean;
  recommended: PublishVia;
}> => {
  const apiOk = canUseApi();
  let webOk = false;
  let appOk = false;

  // Check web (sin iniciar sesión, solo verificar si Chrome/Playwright está disponible)
  try {
    const pw = await import('playwright').catch(() => null);
    webOk = !!pw;
  } catch {
    /* ignore */
  }

  // Check app (verificar si hay emuladores)
  try {
    const { listEmulators } = await import('../../capabilities/computerUse/androidEmulator.js');
    const emulators = listEmulators().filter((e) => e.isRunning);
    appOk = emulators.length > 0;
  } catch {
    /* ignore */
  }

  const recommended: PublishVia = apiOk ? 'api' : webOk ? 'web' : appOk ? 'app' : 'web';

  return { api: apiOk, web: webOk, app: appOk, recommended };
};
