/**
 * PublishRouter — Publica en Instagram vía la API oficial de Meta.
 *
 * Ya NO cae automáticamente a Instagram Web/App: ese fallback controlaba un
 * navegador con fingerprint spoofing + anti-detección (browserOperators/core/
 * stealthProfile.ts, antiDetection.ts) contra la sesión real logueada del
 * usuario — exactamente lo que AUTO-002 prohíbe ("eludir medidas de
 * seguridad... simular actividad humana para engañar a Instagram") y lo que
 * arriesga el baneo de la cuenta real de un cliente de FeedIA. Si la API no
 * está disponible o el formato la excede, se falla con un error claro en vez
 * de automatizar el navegador en secreto.
 */
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { publishToInstagram } from '../../integrations/meta.js';
import { actionGate } from '../../glassbox/index.js';

export type PublishVia = 'api' | 'web' | 'app';

/** Vías que controlan un navegador/app contra la sesión real del usuario — deshabilitadas (ver comentario arriba). */
const DISABLED_VIAS: ReadonlySet<PublishVia> = new Set(['web', 'app']);

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

/**
 * Features que la API de Instagram no soporta (Stories con stickers, collab
 * posts). Antes esto disparaba un fallback silencioso a browser automation;
 * ahora simplemente no están soportadas por publishToInstagramViaRouter.
 */
const requiresWebOrApp = (req: PublishRequest): boolean => {
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

  if (preferredVia && DISABLED_VIAS.has(preferredVia)) {
    return {
      ok: false,
      via: preferredVia,
      error:
        'La publicación vía navegador/app está deshabilitada: controlaba la sesión real del usuario con fingerprint spoofing, lo que viola las reglas de Instagram (AUTO-002) y arriesga el baneo de la cuenta. Conectá la cuenta vía OAuth para publicar por la API oficial.',
      durationMs: Date.now() - start,
    };
  }

  if (requiresWebOrApp(req)) {
    return {
      ok: false,
      via: 'api',
      error: `El formato "${req.format}"${req.collaborator ? ' con colaborador' : ''} no está soportado por la API oficial de Instagram, y la publicación por navegador está deshabilitada por riesgo de baneo. Publicá esto manualmente desde la app.`,
      durationMs: Date.now() - start,
    };
  }

  if (!canUseApi()) {
    return {
      ok: false,
      via: 'api',
      error:
        'La cuenta de Instagram no tiene credenciales de la API de Meta configuradas (o está en DRY_RUN). Conectá la cuenta vía OAuth antes de publicar — no hay fallback automático por navegador.',
      durationMs: Date.now() - start,
    };
  }

  // GlassBox gate para publicación
  const gateResult = await actionGate(
    'instagram_publish',
    `Publicar ${req.format} en Instagram vía api`,
    async () => true,
    { source: 'publish-router' },
  );
  if (!gateResult.ok) {
    return {
      ok: false,
      via: 'api',
      error: gateResult.reason ?? 'Rechazado por GlassBox',
      durationMs: Date.now() - start,
    };
  }

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
    log.warn(`[PublishRouter] API falló: ${msg}`);
    return { ok: false, via: 'api', error: msg, durationMs: Date.now() - start };
  }
};

/** Health check de la vía de publicación (solo API — web/app deshabilitados). */
export const checkPublishHealth = async (
  _brand: BrandProfile,
): Promise<{
  api: boolean;
  web: boolean;
  app: boolean;
  recommended: PublishVia;
}> => ({ api: canUseApi(), web: false, app: false, recommended: 'api' });
