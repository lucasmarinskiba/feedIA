/**
 * Tier 3 Routes Registration
 * Auth, RBAC, Batch, Webhooks
 */

import type { Express, Request, Response } from 'express';
import { register, login, refresh, logout, verifyJWT } from './auth-endpoints.js';
import { checkTier, checkCampaignLimit, checkBatchLimit, checkBrandingPermission } from './rbac-middleware.js';
import {
  batchCreateCampaigns,
  getBatchStatus,
  cancelBatch,
  listBatchJobs,
} from './batch-operations-endpoints.js';
import {
  createWebhook,
  listWebhooks,
  deleteWebhook,
  testWebhook,
} from './webhook-endpoints.js';

export const registerTier3Routes = (app: Express): void => {
  // ============ Authentication (no auth required) ============
  app.post('/api/auth/register', register);
  app.post('/api/auth/login', login);
  app.post('/api/auth/refresh', refresh);

  // ============ Logout (requires auth) ============
  app.post('/api/auth/logout', verifyJWT, logout);

  // ============ Batch Operations (requires auth + RBAC) ============
  app.post('/api/batch/campaigns', verifyJWT, checkTier, checkCampaignLimit, checkBatchLimit, batchCreateCampaigns);
  app.get('/api/batch/:jobId', verifyJWT, getBatchStatus);
  app.post('/api/batch/:jobId/cancel', verifyJWT, cancelBatch);
  app.get('/api/batch', verifyJWT, listBatchJobs);

  // ============ Webhooks (requires auth) ============
  app.post('/api/webhooks', verifyJWT, createWebhook);
  app.get('/api/webhooks', verifyJWT, listWebhooks);
  app.delete('/api/webhooks/:id', verifyJWT, deleteWebhook);
  app.post('/api/webhooks/:id/test', verifyJWT, testWebhook);

  console.log('[Routes] Tier 3 routes registered (auth, RBAC, batch, webhooks)');
};

/**
 * Health check endpoint (no auth)
 */
export const registerHealthCheck = (app: Express): void => {
  app.get('/api/health', (_req: Request, res: Response): void => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      systems: ['auth', 'database', 'batch', 'webhooks'],
    });
    return;
  });
};
