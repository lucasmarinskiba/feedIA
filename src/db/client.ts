/**
 * FeedIA Database Client
 * Centralized export of all database operations
 */

// Core DB operations
export { query, transaction, healthCheck, close } from './index.js';
export { initDb } from './init.js';

// Schema types
export type {
  User,
  UserTier,
  Campaign,
  Content,
  AnalyticsEvent,
  AudienceSegment,
  ABTest,
  EngagementForecast,
  ComplianceCheck,
  BatchJob,
  AudioLibrary,
  Webhook,
  WebhookDelivery,
  ApiCost,
  AuditLog,
} from './schema.js';

// Auth queries
export {
  upsertUser,
  getUserByEmail,
  getUserById,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllSessions,
  revokeSession,
  updateLastLogin,
  getUserSessions,
} from './auth-queries.js';

// Campaign queries
export {
  createCampaign,
  getCampaignById,
  listCampaigns,
  updateCampaign,
  archiveCampaign,
  publishCampaign,
  scheduleCampaign,
  getScheduledCampaigns,
  pauseCampaign,
} from './campaign-queries.js';
