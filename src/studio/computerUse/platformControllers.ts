import type { BrandProfile } from '../../config/types.js';

/**
 * Platform-specific Computer Use controllers for Instagram + TikTok —
 * DESHABILITADO.
 *
 * Cada función de acá armaba un goal en lenguaje natural ("Open
 * instagram.com → Click Create → Upload → Write caption → Share") y se lo
 * pasaba a executeWithRecovery()/runComputerUseSession() — el motor real de
 * Computer Use (cursor + teclado reales vía la API de Claude, ver
 * capabilities/computerUse/controller.ts), sin ningún chequeo de compliance,
 * rate limit ni disclosure. Publicar así (en vez de vía la API oficial) viola
 * las reglas de Instagram/TikTok (AUTO-002, TT-SCHED-001) y arriesga el
 * baneo real de la cuenta — mismo motivo por el que se deshabilitó el resto
 * de los publishers de UI automation esta sesión (publishRouter.ts,
 * instagramActions.ts, cuPostPublisher.ts).
 *
 * instagramAdsCreate/tiktokAdsCreate son un caso aparte y más grave: hacían
 * click-through de un Ads Manager real con presupuesto en USD vía UI
 * automation en vez de la API de Marketing oficial — un agente autónomo
 * gastando dinero real de un cliente sin ningún control de aprobación.
 *
 * Publicar contenido propio ya tiene un camino compliant real: Upload-Post
 * (integrations/uploadPost.ts), el mismo agregador que ya usa TikTok — ver
 * capabilities/computerUse/desktopWorkflows.ts.
 */

const DISABLED_REASON =
  'Automatización de Instagram/TikTok vía navegador (Computer Use) deshabilitada por riesgo de baneo de cuenta — no se ejecuta. Usá la API oficial (integrations/uploadPost.ts) para publicar.';

export const instagramNativePost = async (
  _brand: BrandProfile,
  _mediaPath: string,
  _caption: string,
  _hashtags: string[],
): Promise<{ ok: boolean; postUrl?: string; durationMs: number; error?: string }> => ({
  ok: false,
  durationMs: 0,
  error: DISABLED_REASON,
});

export const tiktokNativePost = async (
  _brand: BrandProfile,
  _videoPath: string,
  _caption: string,
  _hashtags: string[],
  _isPrivate: boolean = false,
): Promise<{ ok: boolean; videoUrl?: string; durationMs: number; error?: string }> => ({
  ok: false,
  durationMs: 0,
  error: DISABLED_REASON,
});

export const tiktokStudioAutomate = async (
  _brand: BrandProfile,
  action: 'upload' | 'schedule' | 'analytics' | 'promote',
  _params: Record<string, unknown>,
): Promise<{ ok: boolean; durationMs: number; result?: unknown; error?: string }> => ({
  ok: false,
  durationMs: 0,
  result: { action, status: 'disabled' },
  error: DISABLED_REASON,
});

const ADS_DISABLED_REASON =
  'Creación de campañas de Ads deshabilitada: controlaba el Ads Manager por navegador con presupuesto real en vez de la API oficial de Marketing — un agente gastando dinero real sin aprobación humana. No se ejecuta.';

export const instagramAdsCreate = async (
  _brand: BrandProfile,
  _campaignType: 'awareness' | 'traffic' | 'conversions' | 'engagement',
  _budget: number,
  _duration: number,
  _targetAudience: string,
): Promise<{ ok: boolean; campaignId?: string; durationMs: number; error?: string }> => ({
  ok: false,
  durationMs: 0,
  error: ADS_DISABLED_REASON,
});

export const tiktokAdsCreate = async (
  _brand: BrandProfile,
  _campaignType: string,
  _budget: number,
  _targetAudience: string,
): Promise<{ ok: boolean; campaignId?: string; durationMs: number; error?: string }> => ({
  ok: false,
  durationMs: 0,
  error: ADS_DISABLED_REASON,
});

export const applyContentEffects = async (
  _brand: BrandProfile,
  _platform: 'instagram' | 'tiktok',
  _effectType: 'filter' | 'text' | 'sticker' | 'sound',
  _params: Record<string, unknown>,
): Promise<{ ok: boolean; durationMs: number; error?: string }> => ({
  ok: false,
  durationMs: 0,
  error: DISABLED_REASON,
});

/**
 * QUICK REFERENCE: Other Essential Tools (informativo, no ejecuta nada)
 *
 * Instagram:
 * - Reels Editor: instagram.com/create/reel
 * - Story Creator: instagram.com/create/story
 * - Carousel Builder: Instagram app → Create → Multiple photos
 * - Shopping Tags: instagram.com/business/shopping
 * - DM Auto-reply: Business Settings → DM Filters
 *
 * TikTok:
 * - TikTok Creator Fund: creator.tiktok.com
 * - Hashtag Challenges: ads.tiktok.com → Branded Hashtag Challenge
 * - Green Screen: In-app effect
 * - Duets/Stitches: Native app features
 * - Trending Sounds: Sound library in editor
 * - Creator Analytics: studio.tiktok.com/analytics
 *
 * Cross-Platform:
 * - Buffer/Later: Social scheduling
 * - Canva Pro: Design with platform templates
 * - Hootsuite: Multi-platform management
 * - Sprout Social: Analytics + scheduling
 * - Metricool: Cross-platform analytics
 */

export const platformToolsReference = {
  instagram: {
    posting: ['Web (instagram.com)', 'Mobile App', 'Creator Studio'],
    editing: ['Reels Editor', 'Story Creator', 'Carousel'],
    analytics: ['Insights', 'Creator Studio'],
    ads: ['Ads Manager', 'Business Suite'],
    ecommerce: ['Shopping Tags', 'Catalog'],
  },
  tiktok: {
    posting: ['Web (tiktok.com)', 'Mobile App', 'TikTok Studio'],
    editing: ['In-app Editor', 'Green Screen', 'Effects'],
    promotion: ['Video Promotion', 'Ads Manager', 'Creator Fund'],
    analytics: ['Studio Analytics', 'Creator Analytics'],
    advanced: ['Hashtag Challenges', 'Brand Collabs'],
  },
};
