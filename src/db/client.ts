/**
 * FeedIA Database Client
 * Centralized export of all database operations
 */

// Core DB operations
export { query, transaction, healthCheck, close } from './index.js';
export { initDb } from './init.js';

// Schema types. AudienceSegment/EngagementForecast/ComplianceCheck/
// AudioLibrary were re-exported here but never existed in schema.js and
// nothing in the codebase actually imports them from this barrel
// (confirmed via repo-wide grep) -- dead re-exports, removed rather than
// inventing 4 unused interfaces to satisfy them.
export type {
  User,
  UserTier,
  UserSession,
  Campaign,
  Content,
  AnalyticsEvent,
  ABTest,
  BatchJob,
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
