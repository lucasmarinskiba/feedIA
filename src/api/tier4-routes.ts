/**
 * Tier 4 Routes Registration
 * Content, Analytics, Compliance, Growth
 */

import type { Express } from 'express';
import {
  generateContent,
  getContent,
  publishContent,
  listContent,
  deleteContent,
} from './content-generation-endpoints.js';
import {
  recordEvent,
  getCampaignMetrics,
  getAnalyticsSummary,
  getContentMetrics,
} from './analytics-endpoints.js';
import { validateCompliance, getComplianceReport } from './compliance-endpoints.js';
import {
  getGrowthStrategy,
  getEngagementForecast,
  getRecommendations,
} from './growth-strategy-endpoints.js';
import { verifyJWT, checkTier } from './auth-endpoints.js';

export const registerTier4Routes = (app: Express): void => {
  // ============ Content Generation (requires auth) ============
  app.post('/api/content/generate', verifyJWT, checkTier, generateContent);
  app.get('/api/content', verifyJWT, listContent);
  app.get('/api/content/:id', verifyJWT, getContent);
  app.post('/api/content/:id/publish', verifyJWT, publishContent);
  app.delete('/api/content/:id', verifyJWT, deleteContent);

  // ============ Analytics (requires auth) ============
  app.post('/api/analytics/events', recordEvent); // Can be anonymous (pixel tracking)
  app.get('/api/analytics/campaigns/:id', verifyJWT, getCampaignMetrics);
  app.get('/api/analytics/content/:id', verifyJWT, getContentMetrics);
  app.get('/api/analytics/summary', verifyJWT, getAnalyticsSummary);

  // ============ Compliance (requires auth) ============
  app.post('/api/compliance/validate', verifyJWT, validateCompliance);
  app.get('/api/compliance/:contentId', verifyJWT, getComplianceReport);

  // ============ Growth Strategy (requires auth) ============
  app.get('/api/growth/strategy', verifyJWT, getGrowthStrategy);
  app.get('/api/growth/forecast', verifyJWT, getEngagementForecast);
  app.get('/api/growth/recommendations', verifyJWT, getRecommendations);

  console.log('[Routes] Tier 4 routes registered (content, analytics, compliance, growth)');
};
