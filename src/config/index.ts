import 'dotenv/config';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { BrandProfileSchema, type BrandProfile } from './types.js';

const optional = (key: string, fallback = ''): string => process.env[key] ?? fallback;

/**
 * Returns the env var value, or '' if not set.
 * AI features will fail gracefully when they try to use a missing key;
 * this avoids crashing the dashboard server on startup.
 */
const softRequired = (key: string): string => {
  const value = process.env[key];
  if (!value) {
    // Only warn — don't throw. The dashboard can still serve the UI.
    process.stderr.write(`[config] Advertencia: ${key} no configurado. Las funciones de IA no estarán disponibles.\n`);
  }
  return value ?? '';
};

export const env = {
  anthropicApiKey: softRequired('ANTHROPIC_API_KEY'),
  modelPrimary: optional('CLAUDE_MODEL_PRIMARY', 'claude-opus-4-7'),
  modelFast: optional('CLAUDE_MODEL_FAST', 'claude-sonnet-4-6'),
  meta: {
    accessToken: optional('META_ACCESS_TOKEN'),
    igBusinessId: optional('META_IG_BUSINESS_ID'),
    pageId: optional('META_PAGE_ID'),
  },
  tiktok: {
    accessToken: optional('TIKTOK_ACCESS_TOKEN'),
    clientKey: optional('TIKTOK_CLIENT_KEY'),
    clientSecret: optional('TIKTOK_CLIENT_SECRET'),
    openId: optional('TIKTOK_OPEN_ID'),
  },
  automation: {
    makeWebhook: optional('MAKE_WEBHOOK_URL'),
    n8nWebhook: optional('N8N_WEBHOOK_URL'),
    zapierWebhook: optional('ZAPIER_WEBHOOK_URL'),
  },
  crm: {
    provider: optional('CRM_PROVIDER', 'none'),
    apiKey: optional('CRM_API_KEY'),
    databaseId: optional('CRM_DATABASE_ID'),
  },
  canva: {
    staticToken: optional('CANVA_API_TOKEN'),
    clientId: optional('CANVA_CLIENT_ID'),
    clientSecret: optional('CANVA_CLIENT_SECRET'),
    refreshToken: optional('CANVA_REFRESH_TOKEN'),
    templates: {
      carrusel: optional('CANVA_TEMPLATE_CARRUSEL'),
      reel: optional('CANVA_TEMPLATE_REEL'),
      historia: optional('CANVA_TEMPLATE_HISTORIA'),
      postImagen: optional('CANVA_TEMPLATE_POST_IMAGEN'),
    },
  },
  bot: {
    autoReplyEnabled: optional('BOT_AUTO_REPLY_ENABLED', 'false').toLowerCase() === 'true',
    pollIntervalSeconds: Number(optional('BOT_POLL_INTERVAL_SECONDS', '60')),
    maxAutoRepliesPerUserPerDay: Number(optional('BOT_MAX_AUTO_REPLIES_PER_USER_PER_DAY', '3')),
    quietHoursStart: Number(optional('BOT_QUIET_HOURS_START', '23')),
    quietHoursEnd: Number(optional('BOT_QUIET_HOURS_END', '8')),
    escalateThreshold: Number(optional('BOT_ESCALATE_THRESHOLD', '0.7')),
  },
  notifications: {
    slackWebhook: optional('SLACK_WEBHOOK_URL'),
    genericWebhook: optional('NOTIFICATIONS_WEBHOOK_URL'),
  },
  imageGen: {
    provider: optional('IMAGE_GEN_PROVIDER', 'none') as 'replicate' | 'openai' | 'flux' | 'sdxl' | 'none',
    replicateToken: optional('REPLICATE_API_TOKEN'),
    replicateModel: optional('REPLICATE_MODEL', 'black-forest-labs/flux-schnell'),
    openaiKey: optional('OPENAI_API_KEY'),
    openaiModel: optional('OPENAI_IMAGE_MODEL', 'dall-e-3'),
  },
  compliance: {
    strictMode: optional('COMPLIANCE_STRICT_MODE', 'true').toLowerCase() === 'true',
    acceptedTerms: optional('COMPLIANCE_ACCEPTED_TERMS', 'false').toLowerCase() === 'true',
    maxDailyPublish: Number(optional('COMPLIANCE_MAX_DAILY_PUBLISH', '15')),
    maxDailyDm: Number(optional('COMPLIANCE_MAX_DAILY_DM', '100')),
    maxDailyComments: Number(optional('COMPLIANCE_MAX_DAILY_COMMENTS', '200')),
    auditRetentionDays: Number(optional('COMPLIANCE_AUDIT_RETENTION_DAYS', '90')),
  },
  activeBrandId: optional('ACTIVE_BRAND_ID', 'default'),
  oauthTokenSecret: optional('OAUTH_TOKEN_SECRET'),
  dryRun: optional('DRY_RUN', 'true').toLowerCase() === 'true',
  logLevel: optional('LOG_LEVEL', 'info'),
  timezone: optional('TIMEZONE', 'America/Argentina/Buenos_Aires'),
  /**
   * When false (default), the public API/UI never reveals the internal
   * architecture: how many agents exist, their individual knowledge, the
   * taxonomy breakdown, or the org chart. These are trade secrets. Set
   * EXPOSE_INTERNALS=true only for local debugging.
   */
  exposeInternals: optional('EXPOSE_INTERNALS', 'false').toLowerCase() === 'true',
} as const;

export const loadBrandProfile = (path?: string): BrandProfile => {
  const resolved = resolve(path ?? 'data/brand.json');
  if (!existsSync(resolved)) {
    throw new Error(
      `No se encontró perfil de marca en ${resolved}. Copiá data/brand.example.json a data/brand.json y completalo.`,
    );
  }
  const raw = JSON.parse(readFileSync(resolved, 'utf-8')) as unknown;
  return BrandProfileSchema.parse(raw);
};

export type { BrandProfile };
export {
  loadBrandProfileById,
  listBrandIds,
  listBrandProfiles,
  getActiveBrandId,
  getActiveBrandProfile,
  saveBrandProfile,
  syncBrandToDb,
  syncAllBrandsToDb,
} from './accounts.js';
