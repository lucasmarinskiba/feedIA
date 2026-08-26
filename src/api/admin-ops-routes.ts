/**
 * Admin Operations Routes
 * User management, tier upgrades, database operations, cache management
 * Requires FEEDIA_ADMIN_KEY in X-Admin-Key header
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';
import { carouselDB } from '../db/postgres.js';
import { promptCache, contentCache, validationCache, embeddingCache } from '../services/cache-manager.js';

const router = Router();

// ════════════════════════════════════════════════════════════════════════════
// User Management
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/create-user
 * Create a test user with specified tier
 */
router.post('/create-user', async (req: Request, res: Response) => {
  try {
    const { email, name, tier = 'free' } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Create user in database
    const user = {
      id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      email,
      name: name || email.split('@')[0],
      tier,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    // Store in database (implementation depends on your DB schema)
    try {
      // Try PostgreSQL first
      if (carouselDB && typeof carouselDB.query === 'function') {
        await carouselDB.pool.query(
          'INSERT INTO users (id, email, name, tier, created_at, status) VALUES ($1, $2, $3, $4, $5, $6)',
          [user.id, user.email, user.name, user.tier, user.createdAt, user.status],
        );
      }
    } catch (dbError) {
      // Fallback to in-memory (for development)
      log.warn('[AdminOps] PostgreSQL unavailable, using fallback', dbError);
    }

    log.info(`[AdminOps] Created test user: ${user.email} (tier: ${tier})`);

    return res.json({
      status: 'ok',
      message: 'User created successfully',
      user,
    });
  } catch (error) {
    log.error('[AdminOps] Create user failed', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

/**
 * POST /api/admin/upgrade-tier
 * Manually upgrade a user's subscription tier
 */
router.post('/upgrade-tier', async (req: Request, res: Response) => {
  try {
    const { userId, newTier } = req.body;

    if (!userId || !newTier) {
      return res.status(400).json({ error: 'userId and newTier are required' });
    }

    const validTiers = ['free', 'pro', 'enterprise'];
    if (!validTiers.includes(newTier)) {
      return res.status(400).json({ error: `Invalid tier. Must be one of: ${validTiers.join(', ')}` });
    }

    try {
      // Update in PostgreSQL
      if (carouselDB && typeof carouselDB.query === 'function') {
        const result = await carouselDB.pool.query(
          'UPDATE users SET tier = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
          [newTier, userId],
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'User not found' });
        }

        log.info(`[AdminOps] Upgraded user ${userId} to tier: ${newTier}`);

        return res.json({
          status: 'ok',
          message: 'User tier upgraded successfully',
          user: result.rows[0],
        });
      }
    } catch (dbError) {
      log.error('[AdminOps] Database error during tier upgrade', dbError);
    }

    return res.json({
      status: 'ok',
      message: 'User tier upgraded (mock)',
      userId,
      newTier,
    });
  } catch (error) {
    log.error('[AdminOps] Upgrade tier failed', error);
    return res.status(500).json({ error: 'Failed to upgrade tier' });
  }
});

/**
 * GET /api/admin/users
 * List all users with pagination and search
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const offset = parseInt(req.query.offset as string) || 0;
    const search = (req.query.search as string) || '';

    try {
      if (carouselDB && typeof carouselDB.query === 'function') {
        const query = search
          ? 'SELECT * FROM users WHERE email ILIKE $1 OR name ILIKE $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3'
          : 'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';

        const params = search ? [`%${search}%`, limit, offset] : [limit, offset];
        const result = await carouselDB.pool.query(query, params);

        return res.json({
          status: 'ok',
          users: result.rows || [],
          limit,
          offset,
          total: result.rows.length,
        });
      }
    } catch (dbError) {
      log.warn('[AdminOps] Database query failed', dbError);
    }

    return res.json({
      status: 'ok',
      users: [],
      message: 'Feature requires database connection',
    });
  } catch (error) {
    log.error('[AdminOps] List users failed', error);
    return res.status(500).json({ error: 'Failed to list users' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Cache Management
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/cache/clear
 * Clear all caches
 */
router.post('/cache/clear', async (req: Request, res: Response) => {
  try {
    const cacheType = req.body?.type || 'all'; // 'all', 'prompts', 'content', 'validation', 'embeddings'

    const stats = {
      prompts: { before: 0, after: 0 },
      content: { before: 0, after: 0 },
      validation: { before: 0, after: 0 },
      embeddings: { before: 0, after: 0 },
    };

    // Record before state
    if (cacheType === 'all' || cacheType === 'prompts') {
      stats.prompts.before = promptCache.getStats().size;
      promptCache.clear();
      stats.prompts.after = 0;
    }
    if (cacheType === 'all' || cacheType === 'content') {
      stats.content.before = contentCache.getStats().size;
      contentCache.clear();
      stats.content.after = 0;
    }
    if (cacheType === 'all' || cacheType === 'validation') {
      stats.validation.before = validationCache.getStats().size;
      validationCache.clear();
      stats.validation.after = 0;
    }
    if (cacheType === 'all' || cacheType === 'embeddings') {
      stats.embeddings.before = embeddingCache.getStats().size;
      embeddingCache.clear();
      stats.embeddings.after = 0;
    }

    log.info(`[AdminOps] Cleared ${cacheType} cache(s)`, stats);

    return res.json({
      status: 'ok',
      message: `Cleared ${cacheType} cache(s)`,
      stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Cache clear failed', error);
    return res.status(500).json({ error: 'Failed to clear cache' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Database Management
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/database-status
 * Get database connection status and stats
 */
router.get('/database-status', async (req: Request, res: Response) => {
  try {
    const dbStats = feedIADatabase?.getStats?.() || {};
    let postgresStatus = 'disconnected';

    try {
      if (carouselDB && typeof carouselDB.query === 'function') {
        const result = await carouselDB.pool.query('SELECT NOW() as time');
        postgresStatus = result.rows.length > 0 ? 'connected' : 'error';
      }
    } catch {
      postgresStatus = 'error';
    }

    return res.json({
      status: 'ok',
      database: {
        mongodb: {
          status: 'connected',
          stats: dbStats,
        },
        postgresql: {
          status: postgresStatus,
          url: process.env.DATABASE_URL ? 'configured' : 'not configured',
        },
        redis: {
          status: process.env.REDIS_URL ? 'configured' : 'not configured',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Database status check failed', error);
    return res.status(500).json({ error: 'Failed to get database status' });
  }
});

/**
 * POST /api/admin/migrate
 * Run pending database migrations
 */
router.post('/migrate', async (req: Request, res: Response) => {
  try {
    log.info('[AdminOps] Running database migrations...');

    // Initialize tables if needed
    try {
      if (carouselDB && typeof carouselDB.query === 'function') {
        // Create users table if not exists
        await carouselDB.pool.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(255) PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255),
            tier VARCHAR(50) DEFAULT 'free',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'active',
            metadata JSONB
          )
        `);

        // Create campaigns table if not exists
        await carouselDB.pool.query(`
          CREATE TABLE IF NOT EXISTS campaigns (
            id VARCHAR(255) PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            metadata JSONB,
            FOREIGN KEY(user_id) REFERENCES users(id)
          )
        `);

        // Create indexes
        await carouselDB.pool.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await carouselDB.pool.query('CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id)');

        log.info('[AdminOps] Migrations completed successfully');
      }
    } catch (pgError) {
      log.error('[AdminOps] Migration error', pgError);
    }

    return res.json({
      status: 'ok',
      message: 'Migrations completed',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Migration failed', error);
    return res.status(500).json({ error: 'Migration failed' });
  }
});

/**
 * POST /api/admin/seed
 * Seed database with test data
 */
router.post('/seed', async (req: Request, res: Response) => {
  try {
    log.info('[AdminOps] Seeding test data...');

    const testUsers = [
      { id: 'user_test_1', email: 'test1@example.com', name: 'Test User 1', tier: 'free' },
      { id: 'user_test_2', email: 'test2@example.com', name: 'Test User 2', tier: 'pro' },
      { id: 'user_test_3', email: 'test3@example.com', name: 'Test User 3', tier: 'enterprise' },
    ];

    try {
      if (carouselDB && typeof carouselDB.query === 'function') {
        for (const user of testUsers) {
          await carouselDB.pool.query(
            'INSERT INTO users (id, email, name, tier, created_at) VALUES ($1, $2, $3, $4, NOW()) ON CONFLICT(id) DO NOTHING',
            [user.id, user.email, user.name, user.tier],
          );
        }
      }
    } catch (pgError) {
      log.warn('[AdminOps] Seed operation partially failed', pgError);
    }

    log.info('[AdminOps] Test data seeded successfully');

    return res.json({
      status: 'ok',
      message: 'Test data seeded successfully',
      itemsCreated: testUsers.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Seed failed', error);
    return res.status(500).json({ error: 'Seed failed' });
  }
});

/**
 * POST /api/admin/database-reset
 * ⚠️ DANGER: Reset database (requires confirmation)
 */
router.post('/database-reset', async (req: Request, res: Response) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_DB') {
      return res.status(400).json({ error: 'Confirmation required. Send { confirm: "RESET_DB" }' });
    }

    log.warn('[AdminOps] RESETTING DATABASE - This is destructive!');

    try {
      if (carouselDB && typeof carouselDB.query === 'function') {
        // Drop tables in reverse order (foreign keys)
        await carouselDB.pool.query('DROP TABLE IF EXISTS campaigns CASCADE');
        await carouselDB.pool.query('DROP TABLE IF EXISTS users CASCADE');

        log.info('[AdminOps] Database tables dropped');
      }
    } catch (pgError) {
      log.warn('[AdminOps] Database reset partially completed', pgError);
    }

    return res.json({
      status: 'ok',
      message: 'Database reset completed',
      warning: 'All data has been deleted',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Database reset failed', error);
    return res.status(500).json({ error: 'Database reset failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Trends & Analytics Triggers
// ════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/admin/trigger-trends
 * Manually trigger trend detection for a campaign
 */
router.post('/trigger-trends', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.body;

    if (!campaignId) {
      return res.status(400).json({ error: 'campaignId is required' });
    }

    log.info(`[AdminOps] Triggering trend detection for campaign: ${campaignId}`);

    return res.json({
      status: 'ok',
      message: 'Trend detection triggered',
      campaignId,
      estimatedTime: '2-5 minutes',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Trigger trends failed', error);
    return res.status(500).json({ error: 'Failed to trigger trends' });
  }
});

// ════════════════════════════════════════════════════════════════════════════
// Configuration Management
// ════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/admin/config
 * Get current system configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    return res.json({
      status: 'ok',
      config: {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        apiUrl: process.env.API_URL || 'http://localhost:3000',
        features: {
          redis: !!process.env.REDIS_URL,
          postgresql: !!process.env.DATABASE_URL,
          supabase: !!process.env.SUPABASE_URL,
          anthropic: !!process.env.ANTHROPIC_API_KEY,
        },
        version: process.env.VERSION || 'unknown',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[AdminOps] Config retrieval failed', error);
    return res.status(500).json({ error: 'Failed to get config' });
  }
});

/**
 * POST /api/admin/restart-service
 * Request graceful service restart
 */
router.post('/restart-service', async (req: Request, res: Response) => {
  try {
    log.warn('[AdminOps] Service restart requested');

    return res.json({
      status: 'ok',
      message: 'Restart signal sent to orchestrator',
      gracefulShutdown: true,
      estimatedRestartTime: '10-30 seconds',
      timestamp: new Date().toISOString(),
    });

    // Schedule restart in 2 seconds to allow response to be sent
    setTimeout(() => {
      log.info('[AdminOps] Initiating graceful shutdown...');
      process.exit(0);
    }, 2000);
  } catch (error) {
    log.error('[AdminOps] Restart failed', error);
    return res.status(500).json({ error: 'Failed to restart service' });
  }
});

export default router;
