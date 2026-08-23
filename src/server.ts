import express, { Express, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { log } from './agent/logger.js';
import { initSentry, captureException } from './observability/sentry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize error tracking before anything else can throw (no-op if SENTRY_DSN unset)
initSentry();
import promptGenerationRoutes from './api/prompt-generation-routes.js';
import promptSelectionRoutes from './api/prompt-selection-routes.js';
import qualityLoopRoutes from './api/quality-loop-routes.js';
import strategicReasoningRoutes from './api/strategic-reasoning-routes.js';
import multiAgentOrchestratorRoutes from './api/multi-agent-orchestrator-routes.js';
import roiCalculatorRoutes from './api/roi-calculator-routes.js';
import smartBatchingRoutes from './api/smart-batching-routes.js';
import autoFeedbackRoutes from './api/auto-feedback-routes.js';
import platformNativeRoutes from './api/platform-native-routes.js';
import rationalSystemsRoutes from './api/rational-systems-routes.js';
import contentRoutes from './api/content-routes.js';
import autonomyRoutes from './api/autonomy-routes.js';
import parameterizedImageRoutes from './api/parameterized-image-routes.js';
import videoParameterizedRoutes from './api/video-parameterized-routes.js';
import videoBatch9293Routes from './api/video-batch-92-93-routes.js';
import videoBatch95Routes from './api/video-batch-95-routes.js';
import videoBatch96Routes from './api/video-batch-96-routes.js';
import imageUploadRoutes from './api/image-upload-handler.js';
import promptExpansionRoutes from './api/prompt-expansion-routes.js';
import batchWorkerRoutes from './api/batch-worker-routes.js';
import qualityExpansionRoutes from './api/quality-expansion-routes.js';
import consistencyLockRoutes from './api/consistency-lock-routes.js';
import footballMemeRoutes from './api/football-meme-routes.js';
import adminDashboardRoutes from './api/admin-dashboard-routes.js';
import adminOpsRoutes from './api/admin-ops-routes.js';
import creativityRoutes from './api/creativity-routes.js';
import facialIdentityRoutes from './api/facial-identity-routes.js';
import resolutionQualityRoutes from './api/resolution-quality-routes.js';
import masterGenerateRoutes from './api/master-generate-routes.js';
import generateRoutes from './api/generate-routes.js';
import contentStrategyRoutes from './api/content-strategy-routes.js';
import veoVideoRoutes from './api/veo-video-routes.js';
import pollingStatusRoutes from './api/polling-status-routes.js';
import instagramOAuthRoutes from './api/instagram-oauth-routes.js';
import cacheManagementRoutes from './api/cache-management-routes.js';
import engagementRoutes from './api/engagement-routes.js';
import browserlessSettingsRoutes from './api/browserless-settings-routes.js';
import { scalingLayer } from './api/scaling-layer.js';
import { feedIAOrchestrator } from './services/feedia-agents-orchestrator.js';
import { feedIADatabase } from './db/database.js';
import { BrandProfileSchema } from './config/types.js';
import { startPollingScheduler } from './workers/metricsPollingOrchestrator.js';
import createStudioRoutes from './server/studioRoutes.js';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { apiKeyAuth, adminKeyAuth, attachKeyContext } from './middleware/auth.js';
import { autoRateLimiter } from './middleware/rate-limiter.js';
import { inputSanitizer } from './middleware/input-sanitizer.js';
import userContextMiddleware from './middleware/user-context.js';
import securityRoutes from './api/security-routes.js';
import videoStorageRoutes from './api/video-storage-routes.js';
import carouselMetricsRoutes from './api/carousel-metrics-routes.js';
import carouselApiRoutes from './api/carousel-api-routes.js';
import carouselQualityRoutes from './api/carousel-quality-routes.js';
import carouselCreationRoutes from './api/carousel-creation-routes.js';
import carouselAnalyticsRoutes from './api/carousel-analytics-routes.js';
import carouselGenerationIntegrationRoutes from './api/carousel-generation-integration-routes.js';
import costGuardianRoutes from './api/cost-guardian-routes.js';
import selliaDashboardRoutes from './api/sellia-dashboard-routes.js';
import predictiveRoutes from './api/predictive-routes.js';
import orchestratorRoutes from './api/orchestrator-routes.js';
import { carouselDB } from './db/postgres.js';
import agencySimpleRoutes from './api/agency-simple-routes.js';
import conversionRoutes from './api/conversion-routes.js';
import billingRoutes from './api/billing-routes.js';
import { initializeUserTiersTable } from './db/user-tiers.js';
import { initFeedbackSchema, initWeightsSchema } from './db/feedback-schema.js';
import { PRICING_HTML } from './api/pricing-routes.js';
import { registerTrendingRoutes } from './api/trending-endpoints.js';
import { registerTiers5_15Routes } from './api/tiers5-15-bundled.js';
import { initRedis, isRedisReady } from './cache/redis-client.js';
import { initializeBillingTables } from './services/billing-manager.js';
import { initializeWebhookTables } from './services/webhook-service.js';
import featureFlagsRoutes from './api/feature-flags-routes.js';
import { registerBootstrapRoutes } from './api/bootstrap-routes.js';
import { registerSeedEndpoint } from './api/seed-endpoint.js';
import { register, login, logout, refresh, verifyJWT } from './api/auth-endpoints.js';
import { registerUserRoutes } from './api/user-routes.js';
import { registerContentStorageRoutes } from './api/content-storage-routes.js';
import { registerSocialPublishingRoutes } from './api/social-publishing-routes.js';
import { registerSocialAutomationRoutes } from './api/social-automation-complete.js';
import { registerSocialIntelligenceRoutes } from './api/social-intelligence-agents.js';
import { registerNeuralAgentRoutes } from './api/neural-agents.js';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// ─── Security layer (order matters) ───────────────────────────────────────────

// 1. HTTP security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow image loading from CDNs
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
  }),
);

// 2. Response compression (gzip/brotli) — cuts bandwidth on JSON-heavy
// endpoints (prompt batches, carousel payloads). Skips already-compressed
// content (images, video) via default filter, and requests with `x-no-compression`.
app.use(
  compression({
    threshold: 1024, // don't bother compressing tiny responses
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  }),
);

// 3. CORS — explicit origin allowlist, never wildcard in production
const ALLOWED_ORIGINS = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter((o) => o.length > 0);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, Postman, server-to-server)
      if (!origin) return callback(null, true);
      // In dev (no env set), allow all — warn loudly
      if (ALLOWED_ORIGINS.length === 0) {
        if (process.env.NODE_ENV === 'production') {
          return callback(new Error('CORS: CORS_ORIGIN env var not set in production'));
        }
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  }),
);

// 4. Attach key context (reads key from header, stores truncated hash for logs)
app.use(attachKeyContext);

// 5. Rate limiting (before auth — prevents brute force auth enumeration)
app.use(autoRateLimiter);

// 6. API key authentication
app.use(apiKeyAuth);

// 6.5. User context (extract userId from headers or generate)
app.use(userContextMiddleware);

// 7. Body parsing with strict size limits (1MB prevents DoS via large payloads)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 8. Input sanitization (after body parse, before route handlers)
app.use(inputSanitizer);

// ──────────────────────────────────────────────────────────────────────────────

// Brand context middleware (mock)
const mockBrand = BrandProfileSchema.parse({
  name: process.env.BRAND_NAME || 'FeedIA',
  type: 'empresa',
  niche: process.env.BRAND_NICHE || 'instagram-growth',
  audience: {
    description: process.env.BRAND_AUDIENCE || 'creators',
    pains: [],
    desires: [],
    locale: 'es-AR',
  },
  voice: {
    tone: ['professional', 'creative'],
    forbidden: [],
    referenceQuotes: [],
  },
  visual: {
    palette: [],
    typography: [],
    style: 'minimalista',
    mood: 'profesional',
    photographyStyle: 'natural',
    compositionRules: [],
    allowedIconography: [],
    forbiddenIconography: [],
    moodboardUrls: [],
    density: 'medium',
    imageTextRatio: 'balanced',
  },
  goals: {
    primary: 'engagement',
    metricsToWatch: [],
  },
});

app.use((req: Request, res: Response, next) => {
  req.brand = mockBrand;
  next();
});

// Authentication routes (public — no API key required)
app.post('/api/auth/register', register);
app.post('/api/auth/login', login);
app.post('/api/auth/refresh', refresh);
app.post('/api/auth/logout', verifyJWT, logout);

// User routes (require authentication)
registerUserRoutes(app);

// Content storage routes (posts, videos, carousels management)
registerContentStorageRoutes(app);

// Social publishing routes (Instagram + TikTok posting)
registerSocialPublishingRoutes(app);

// Social automation routes (OAuth, scheduler, analytics, AI captions)
registerSocialAutomationRoutes(app);

// Social intelligence agents (CM, growth, design, copy, strategy, niche expertise)
registerSocialIntelligenceRoutes(app);

// Neural agents (ML brain: prediction, learning, optimization, audience mapping)
registerNeuralAgentRoutes(app);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'feedIA-server',
    timestamp: new Date().toISOString(),
  });
});

// Scaling layer health
app.get('/health/scaling', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    scaling: scalingLayer.getHealth(),
  });
});

// Mount prompt generation routes
app.use('/api/prompts', promptGenerationRoutes);

// Mount intelligent prompt selection routes
app.use('/api/prompt-selection', promptSelectionRoutes);

// Mount quality feedback loop routes (collect + analyze user ratings → retrain ranking)
app.use('/api/feedback', qualityLoopRoutes);

// Mount strategic reasoning routes (competitive analysis, pricing, budget, positioning)
app.use('/api/strategy', strategicReasoningRoutes);

// Mount multi-agent orchestrator routes (Art Director ↔ Carousel Designer collaboration)
app.use('/api/orchestrate', multiAgentOrchestratorRoutes);

// Mount ROI calculator routes (estimate cost per result, engagement, conversions)
app.use('/api/roi', roiCalculatorRoutes);

// Mount smart batching routes (auto-generate 30+ assets with optimized strategy)
app.use('/api/batch', smartBatchingRoutes);

// Mount auto feedback loop routes (track performance → auto-update weights)
app.use('/api/auto-feedback', autoFeedbackRoutes);

// Mount platform-native output routes (format content for platform specs + scheduling)
app.use('/api/platform-native', platformNativeRoutes);

// Mount rational systems routes (all 10 autonomous backend systems)
app.use('/api/systems', rationalSystemsRoutes);

// Mount content generation routes
app.use('/api/content', contentRoutes);

// Mount autonomous generation routes
app.use('/api/autonomy', autonomyRoutes);

// Mount parameterized image routes (12,870 prompts, user-image adaptable)
app.use('/api/parameterized', parameterizedImageRoutes);

// Mount video parameterized routes (1,100 video prompts, Batch 90-91)
app.use('/api/video', videoParameterizedRoutes);

// Mount video batch 92-93 routes (1,350 prompts, vertical engagement + reference patterns)
app.use('/api/video', videoBatch9293Routes);

// Mount video batch 95 routes (500 prompts, UGC + location-based)
app.use('/api/video', videoBatch95Routes);

// Mount video batch 96 routes (500 prompts, soft-sell marketing)
app.use('/api/video', videoBatch96Routes);

// Mount image upload routes (feature extraction + prompt matching + parameterization)
app.use('/api/image-upload', imageUploadRoutes);

// Mount prompt expansion routes (LLM-powered variation generation: 3,450 → 315,840)
app.use('/api/prompts', promptExpansionRoutes);

// Mount batch worker routes (Queue-based expansion with progress tracking)
app.use('/api/batch', batchWorkerRoutes);

// Mount quality expansion routes (Validate + refine + expand pipeline)
app.use('/api/quality', qualityExpansionRoutes);

// Mount consistency lock routes (Character/product/environment stability across carousel frames)
app.use('/api/consistency', consistencyLockRoutes);

// Mount football meme routes (@433 style viral designs)
app.use('/api/football', footballMemeRoutes);

// Mount admin dashboard (monitoring + metrics + optimization) — requires admin key
app.use('/api/admin', adminKeyAuth, adminDashboardRoutes);

// Mount admin operations (user management, database operations, cache control) — requires admin key
app.use('/api/admin', adminKeyAuth, adminOpsRoutes);

// Serve admin dashboard UI
app.get('/admin', adminKeyAuth, (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, 'server', 'static', 'admin-dashboard.html'));
});

// Mount cost guardian (spend vs revenue governance) — financial data, admin key required
app.use('/api/cost-guardian', adminKeyAuth, costGuardianRoutes);

// Mount creativity/ocurrencia routes (wit analysis + twist injection + cliché removal)
app.use('/api/creativity', creativityRoutes);

// Mount facial identity preservation routes (real face features locked from source photo)
app.use('/api/identity', facialIdentityRoutes);

// Mount resolution/quality routes (max IG/TikTok resolution, zero quality loss)
app.use('/api/resolution', resolutionQualityRoutes);

// Mount master pipeline (single-call: quality + refinement + ocurrencia + identity + consistency + resolution)
app.use('/api/master', masterGenerateRoutes);

// Mount prompt-to-content generation (DB prompts → Claude → slides)
app.use('/api/generate', generateRoutes);

// Mount content strategy routes (calendar + task list + content compass/Brújula + scripts)
app.use('/api/strategy', contentStrategyRoutes);

// Mount Veo video generation routes (real video rendering, closes prompt-to-video gap)
app.use('/api/video-gen', veoVideoRoutes);

// Polling status + monitoring routes (4h/15-30m/7d metrics cycles)
app.use('/api/polling', pollingStatusRoutes);

// Instagram OAuth routes (simplified: click → connect → auto-save token)
app.use('/oauth/instagram', instagramOAuthRoutes);

// Cache management routes (60% fewer API calls via prompt reuse)
app.use('/api/cache', cacheManagementRoutes);

// Engagement routes (Computer Use orchestration: likes/comments/follows with budget control)
app.use('/api/engagement', engagementRoutes);

// Browserless settings routes (per-user API key management for SaaS)
app.use('/api/settings/browserless', browserlessSettingsRoutes);

// Studio routes (carousel, reel, stories, vision, predictor generation)
app.use('/api/studio', createStudioRoutes(mockBrand));

// Security routes (Week 3: 2FA + IP whitelist + audit + GDPR/CCPA)
app.use(securityRoutes);

// Video storage routes (Week 6: Premium tier video uploads to Backblaze B2 with encoding)
app.use(videoStorageRoutes);

// Carousel metrics routes (Week 6-7: Real-time engagement tracking with daily aggregation)
app.use(carouselMetricsRoutes);

// Carousel API routes (storage, CRUD, persistence)
app.use('/api/carousels', carouselApiRoutes);

// Carousel quality validation routes (quality checks, approval workflow)
app.use('/api/carousels/quality', carouselQualityRoutes);

// Carousel creation pipeline routes (validation-gated creation)
app.use('/api/carousels', carouselCreationRoutes);

// Carousel analytics routes (metrics queries, trends, comparisons)
app.use('/api/analytics', carouselAnalyticsRoutes);

// Carousel generation integration routes (generate → validate → create pipeline)
app.use('/api/carousel', carouselGenerationIntegrationRoutes);

// SellIA dashboard routes (ROI, Fans VIP tiers, Lead pipeline)
app.use('/api/dashboard', selliaDashboardRoutes);

// Predictive intelligence routes (viral score, churn risk, ROI forecast, lead conversion)
app.use('/api/predict', predictiveRoutes);

// Agent orchestrator (dashboard → predictions → decisions)
app.use('/api/orchestrate', orchestratorRoutes);

// TIER 7: Agency OS (campaign generation)
app.use('/api/agency', agencySimpleRoutes);

// TIER 8 Extension: Conversion + FOMO Strategy
app.use('/api/conversion', conversionRoutes);

// TIER 8 Extension: Billing + Tier Management (Stripe + Database)
app.use('/api/billing', billingRoutes);

// Feature Flags: Tier-based feature access control
app.use('/api/features', featureFlagsRoutes);

// TIERS 5-15: Autonomous Systems (Trending, Audience, A/B, ROI, etc.)
registerTrendingRoutes(app);
registerTiers5_15Routes(app);

// Bootstrap: Seed data + system validation
registerBootstrapRoutes(app);

// Seed endpoint: HTTP POST to populate test data
registerSeedEndpoint(app);

// Debug: Inspect MemoryDB state
app.get('/api/debug/memorydb', async (_req: Request, res: Response): Promise<void> => {
  try {
    const { getMemoryDBState } = await import('./db/sqlite-pool.js');
    const state = getMemoryDBState();
    res.json({
      recordCount: state.user_tiers.length,
      users: state.user_tiers.map((u) => ({ user_id: u.user_id, tier: u.tier, email: u.email })),
    });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Pricing page (embedded HTML constant, served before SPA catch-all)
app.get('/pricing', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(PRICING_HTML);
});

// Static files + SPA catch-all (must be after all /api routes)
// Use __dirname for absolute paths (works in Railway serverless env)
const STATIC_CANDIDATES = [
  path.resolve(__dirname, '../../dist-static'),
  path.resolve(__dirname, './static'),
  path.resolve(process.cwd(), 'dist-static'),
  path.resolve(process.cwd(), 'src/server/static'),
];
const staticDir = STATIC_CANDIDATES.find((d) => fs.existsSync(d)) ?? null;
if (staticDir) {
  log.info('[Server] Serving static files from', { staticDir });
}
if (staticDir) {
  app.use(express.static(staticDir));
  // SPA catch-all: serve index.html for all unmatched routes (express 5 compat: use app.use not app.get('*'))
  app.use((req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, 'index.html'));
  });
} else {
  app.get('/', (req: Request, res: Response) => {
    res.json({ status: 'ok', service: 'FeedIA API', docs: '/health' });
  });
}

// Admin: Seed test data (mock)
app.post('/api/admin/seed', adminKeyAuth, async (_req, res): Promise<void> => {
  res.json({
    status: 'seeded',
    testUsers: [
      { id: 'user-1', email: 'test@feedia.dev', tier: 'pro' },
      { id: 'user-2', email: 'test2@feedia.dev', tier: 'pro' },
    ],
    testCampaigns: [
      { id: 'camp-1', user_id: 'user-1', title: 'Test Campaign', platform: 'instagram', status: 'active' },
      { id: 'camp-2', user_id: 'user-1', title: 'Test Campaign 2', platform: 'tiktok', status: 'active' },
    ],
    note: 'Run actual migrations with: railway run npm run db:migrate',
  });
});

// Admin: Run migrations
app.post('/api/admin/migrate', adminKeyAuth, async (_req, res): Promise<void> => {
  try {
    const { Pool } = (await import('pg')) as typeof import('pg');
    const path = (await import('path')) as typeof import('path');
    const fs = (await import('fs')) as typeof import('fs');

    const connectionString = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;
    if (!connectionString) {
      res.status(500).json({ error: 'DATABASE_URL/DATABASE_PRIVATE_URL not set' });
      return;
    }

    const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
    const schemaFiles = [
      'src/db/users-schema.sql',
      'src/db/carousel-storage-schema.sql',
      'src/db/video-storage-schema.sql',
      'src/db/analytics-schema.sql',
    ];
    const results: string[] = [];

    for (const file of schemaFiles) {
      const filePath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(filePath)) {
        results.push(`⊘ ${file} (not found)`);
        continue;
      }
      const sql = fs.readFileSync(filePath, 'utf-8');
      try {
        await pool.query(sql);
        results.push(`✓ ${file}`);
      } catch (e) {
        results.push(`✗ ${file}: ${e instanceof Error ? e.message : 'unknown'}`);
      }
    }
    await pool.end();
    res.json({ status: 'complete', results });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

// Error handler (4-arg signature required by Express)
app.use((err: Error, req: Request, res: Response, _next: express.NextFunction) => {
  log.error('[Server] error', { error: err.message });
  captureException(err, { path: req.path, method: req.method });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Auto-migrate DB on startup (fire-and-forget, non-blocking)
async function runMigrationsIfNeeded(): Promise<void> {
  try {
    const { Pool } = (await import('pg')) as typeof import('pg');
    const path = (await import('path')) as typeof import('path');
    const fs = (await import('fs')) as typeof import('fs');

    const connStr = process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL;
    if (!connStr) return; // Skip if no DB URL

    const pool = new Pool({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
    const files = [
      'src/db/users-schema.sql',
      'src/db/carousel-storage-schema.sql',
      'src/db/video-storage-schema.sql',
      'src/db/analytics-schema.sql',
      'src/db/social-automation-schema.sql',
    ];

    for (const file of files) {
      const fpath = path.resolve(process.cwd(), file);
      if (!fs.existsSync(fpath)) continue;
      try {
        const sql = fs.readFileSync(fpath, 'utf-8');
        await pool.query(sql);
        console.log(`✓ Migration: ${file}`);
      } catch (e) {
        console.error(`✗ Migration ${file}:`, e instanceof Error ? e.message : e);
      }
    }
    await pool.end();
  } catch (err) {
    console.error('[Migrations] Error:', err);
  }
}

// Fire-and-forget init (serverless: no app.listen)
Promise.all([
  feedIADatabase.initialize(),
  carouselDB.initialize(),
  initializeUserTiersTable(),
  initFeedbackSchema(),
  initWeightsSchema(),
  initializeBillingTables(),
  initializeWebhookTables(),
  initRedis(), // Initialize Redis for caching + rate limiting
  runMigrationsIfNeeded(), // Run DB migrations
])
  .then(() => {
    feedIAOrchestrator.initializeAgents();
    startPollingScheduler();
    const redisStatus = isRedisReady() ? '✅ Redis enabled' : '⚠️  Redis disabled';
    log.info(
      `[Server] initialized: metrics polling + carousel storage + billing/tiers + webhooks + quality feedback loop (${redisStatus})`,
    );
  })
  .catch((err) => log.error('[Server] initialization failed', err));

// Start server (Railway needs explicit listener)
app.listen(PORT, () => {
  console.log(`✅ FeedIA Autonomous Generator running on http://localhost:${PORT}`);
  console.log(`📊 Batches: 28-61 base (6,770) + 62-95 parameterized (6,100) = 12,870 total`);
  console.log(`🔗 Prompt Endpoints:`);
  console.log(`   GET  /api/prompts/query?occasion=trabajo`);
  console.log(`   GET  /api/prompts/stats`);
  console.log(`🎬 Content Endpoints:`);
  console.log(`   POST /api/content/carousel — designer pipeline`);
  console.log(`   POST /api/content/reel — scene composition`);
  console.log(`   POST /api/content/story — frame sequence`);
  console.log(`   POST /api/content/batch — multi-format`);
  console.log(`🤖 Autonomy Endpoints (Direct Agent Access):`);
  console.log(`   POST /api/autonomy/generate — all formats`);
  console.log(`   POST /api/autonomy/carousels`);
  console.log(`   POST /api/autonomy/reels`);
  console.log(`   POST /api/autonomy/stories`);
  console.log(`   GET  /api/autonomy/status`);
  console.log(`🖼️  Parameterized Image Endpoints (USER IMAGES):`);
  console.log(`   POST /api/parameterized/upload-images — user images → matched prompts`);
  console.log(`   POST /api/parameterized/match-prompts — direct prompt matching`);
  console.log(`   POST /api/parameterized/generate-content — full pipeline (images → content)`);
  console.log(`   GET  /api/parameterized/library-status — 12,870 prompt library info`);
  console.log(`🎬 Video Parameterized Endpoints (BATCH 90-91: 1,100 PROMPTS):`);
  console.log(`   POST /api/video/parameterized-prompt — generate single video prompt`);
  console.log(`   POST /api/video/batch-generate — generate 1-10 video prompts`);
  console.log(`   POST /api/video/batch-expand — expand 1 prompt → 10 variations`);
  console.log(`   GET  /api/video/templates — list all templates`);
  console.log(`   GET  /api/video/library-status — 1,100 video prompt library info`);
  console.log(`🎬 Video Batch 92-93 Endpoints (VERTICAL + REFERENCE PATTERNS: 1,350 PROMPTS):`);
  console.log(`   POST /api/video/batch-92/generate — vertical engagement (9:16, ≤15sec)`);
  console.log(`   POST /api/video/batch-93/generate — ultra-detailed reference patterns`);
  console.log(`🎬 Video Batch 95 Endpoints (UGC + LOCATION-BASED: 500 PROMPTS):`);
  console.log(`   POST /api/video/batch-95/daily-life-montage — café/office/home/shop`);
  console.log(`   POST /api/video/batch-95/ugc-reel — authentic phone vlog, character-locked`);
  console.log(`   POST /api/video/batch-95/transformation-narrative — eye-reflection, glow-up`);
  console.log(`   POST /api/video/batch-95/action-sequence — western/parkour/sports/fantasy`);
  console.log(`   POST /api/video/batch-95/location-montage — snow/desert/beach/city/indoor`);
  console.log(`   GET  /api/video/batch-95/categories — list all categories`);
  console.log(`🎬 Video Batch 96 Endpoints (SOFT-SELL MARKETING: 500 PROMPTS):`);
  console.log(`   POST /api/video/batch-96/pets — pet/animal soft-sell`);
  console.log(`   POST /api/video/batch-96/lifestyle — lifestyle product soft-sell`);
  console.log(`   POST /api/video/batch-96/services — service provider soft-sell`);
  console.log(`   POST /api/video/batch-96/brand-positioning — brand/culture positioning`);
  console.log(`   POST /api/video/batch-96/cause-driven — NGO/cause/social-impact marketing`);
  console.log(`   GET  /api/video/batch-96/categories — list soft-sell categories`);
  console.log(
    `🎬 Video Library Total: BATCH 90-91 (1,100) + BATCH 92-93 (1,350) + BATCH 95-96 (1,000) = 3,450 PROMPTS`,
  );
  console.log(`🖼️  Image Upload & Parameterization Endpoints:`);
  console.log(`   POST /api/image-upload/upload — upload image, extract features`);
  console.log(`   POST /api/image-upload/match-prompts — find matching prompts for image`);
  console.log(`   POST /api/image-upload/parameterize — combine image + prompt + parameters`);
  console.log(`   GET  /api/image-upload/status — database statistics`);
  console.log(
    `💾 Database: feedia.db (SQLite). Schema: prompts, variations, images, content, analytics, brand_profiles`,
  );
  console.log(`🚀 Prompt Expansion Endpoints (LLM-powered: 3,450 → 315,840+):`);
  console.log(`   POST /api/prompts/expand-single — expand 1 prompt → 6 variations`);
  console.log(`   POST /api/prompts/super-expand — expand 1 prompt → 12 variations (2x, scaling)`);
  console.log(`   POST /api/prompts/expand-batch — expand entire batch (queued job, ~10s per prompt)`);
  console.log(`   GET  /api/prompts/expansion-status — library stats + progress`);
  console.log(`   GET  /api/prompts/expansion-info — strategy + capacity info`);
  console.log(`📦 Batch Worker Endpoints (Queue + Quality Validation):`);
  console.log(`   POST /api/batch/expand-all — queue all batches (video/image/stories)`);
  console.log(`   POST /api/batch/expand-batch — queue specific batch`);
  console.log(`   GET  /api/batch/status/:jobId — job progress + ETA`);
  console.log(`   GET  /api/batch/jobs — list active/completed jobs`);
  console.log(`   GET  /api/batch/health — worker health check`);
  console.log(`✨ Quality Control Endpoints (Validation + Refinement + Cinematography):`);
  console.log(`   POST /api/quality/expand-refine — expand + validate + refine in one step`);
  console.log(`   POST /api/quality/validate — quality check (ortografia, faces, products, environments)`);
  console.log(`   POST /api/quality/refine — refine prompt (inject cinematography + artistic standards)`);
  console.log(`   GET  /api/quality/standards — all standards + patterns applied`);
  console.log(`🔒 Consistency Lock Endpoints (Character/Product/Environment Stability):`);
  console.log(`   POST /api/consistency/create-lock — create locks for carousel series`);
  console.log(`   POST /api/consistency/generate-prompts — generate locked carousel prompts`);
  console.log(`   POST /api/consistency/validate — validate carousel consistency`);
  console.log(`   POST /api/consistency/suggest-improvements — get suggestions for better consistency`);
  console.log(`   GET  /api/consistency/lock/:seriesId — get lock details`);
  console.log(`⚽ Football Meme Endpoints (@433 Style Viral Designs):`);
  console.log(`   POST /api/football/generate — generate single football meme (2,000 templates)`);
  console.log(`   POST /api/football/batch-generate — generate multiple football memes`);
  console.log(`   GET  /api/football/categories — list categories + templates`);
  console.log(`   GET  /api/football/health — service status`);
  console.log(`🧠 Backend Professional + Agents:`);
  console.log(
    `   → Orchestrator: Coordinate 6 specialized agents (content-gen, quality-val, consistency, refinement, analytics, batch-processor)`,
  );
  console.log(`   → Neural Embeddings: Semantic search, similarity matching, pattern clustering (text + image)`);
  console.log(`   → Analytics Engine: Metrics, trends, optimization recommendations, health reports`);
  console.log(`   → Cache Manager: LRU eviction, TTL support, hit-rate tracking (5 caches)`);
  console.log(`📊 Admin Dashboard Endpoints (System Monitoring):`);
  console.log(`   GET  /api/admin/health — system health report`);
  console.log(`   GET  /api/admin/agents — agent metrics + specialization`);
  console.log(`   GET  /api/admin/metrics — detailed performance metrics`);
  console.log(`   GET  /api/admin/recommendations — optimization recommendations`);
  console.log(`   GET  /api/admin/cache — cache performance (hit rates, evictions)`);
  console.log(`   GET  /api/admin/errors — recent errors + issues`);
  console.log(`   GET  /api/admin/trends — metrics trends over time`);
  console.log(`   GET  /api/admin/summary — executive summary`);
  console.log(`🎭 Creativity/Ocurrencia Endpoints (Wit + Originality Guarantee):`);
  console.log(`   POST /api/creativity/analyze — score wit + originality, detect clichés`);
  console.log(`   POST /api/creativity/boost — full pipeline: remove clichés + inject twist`);
  console.log(`   POST /api/creativity/inject-twist — apply specific creative twist technique`);
  console.log(`   GET  /api/creativity/twist-techniques — list 10 twist techniques`);
  console.log(`   GET  /api/creativity/suggest/:contentType — suggested twists by format`);
  console.log(`   → Auto-applied: Every refined prompt now passes through ocurrencia check`);
  console.log(`🧬 Facial Identity Preservation Endpoints (Real Face Feature Lock):`);
  console.log(`   POST /api/identity/lock — extract + lock real facial landmarks from uploaded photo`);
  console.log(`   POST /api/identity/inject — inject preservation instructions into content prompt`);
  console.log(`   POST /api/identity/validate — verify generated output preserved source identity`);
  console.log(`   POST /api/identity/lock-and-inject — combined lock + inject in one call`);
  console.log(`   GET  /api/identity/lock/:lockId — retrieve lock details`);
  console.log(
    `   → Guarantee: Uploaded person's real face shape/eyes/nose/lips/marks preserved, not idealized/invented`,
  );
  console.log(`📐 Resolution & Quality Endpoints (Max IG/TikTok Resolution, Zero Quality Loss):`);
  console.log(`   GET  /api/resolution/specs/:platform — full spec table (instagram/tiktok)`);
  console.log(`   POST /api/resolution/inject-instructions — inject quality lock into prompt`);
  console.log(`   POST /api/resolution/validate — check asset specs vs platform requirements`);
  console.log(`   POST /api/resolution/upscale-strategy — AI upscale recommendation for low-res source`);
  console.log(`   GET  /api/resolution/best/:platform/:contentType — max quality spec for format`);
  console.log(
    `   → Auto-applied: Every refined prompt now locks resolution/bitrate (IG reels 1080x1920@8000kbps, TikTok HD 1080x1920@16000kbps)`,
  );
  console.log(`🎯 MASTER PIPELINE Endpoints (Single-Call Full Guarantee):`);
  console.log(
    `   POST /api/master/generate — one prompt through ALL systems (quality+cinematography+ocurrencia+identity+consistency+resolution)`,
  );
  console.log(`   POST /api/master/generate-carousel — full 2-10 frame carousel, one call`);
  console.log(`   GET  /api/master/health — pipeline stages + usage guide`);
  console.log(`   → THIS IS THE RECOMMENDED ENTRY POINT for all new content generation`);
  console.log(`🗓️  Content Strategy Endpoints (Calendar + Tasks + Brújula + Scripts):`);
  console.log(`   POST /api/strategy/calendar/plan — plan N days, weighted pillar rotation, format cadence`);
  console.log(`   GET  /api/strategy/tasks/:accountId — task list (idea→script→design→review→ready→scheduled)`);
  console.log(`   POST /api/strategy/tasks/:postId/advance — move item to next production stage`);
  console.log(`   GET  /api/strategy/compass/:accountId — 14-day gap analysis vs ideal cadence + recommendation`);
  console.log(`   POST /api/strategy/compass/:accountId/fill-gaps — auto-plan posts to close biggest gap`);
  console.log(`   POST /api/strategy/script — scene-by-scene guion (hook/build/CTA pacing)`);
  console.log(`   POST /api/strategy/script/batch — scripts for multiple topics in one call`);
  console.log(
    `   📊 Scaling Math: Video 3,450×12=41,400 + Image 12,870×12=154,440 + Stories 10,000×12=120,000 + Football 2,000×12=24,000 + Hooks 1,000×12=12,000 = 352,840 total`,
  );
  console.log(`🎬 Veo 3.1 Video Generation Endpoints (Real Video Rendering):`);
  console.log(`   POST /api/video-gen/start — start async video generation (returns operation to poll)`);
  console.log(`   GET  /api/video-gen/status/:operationName — poll generation progress`);
  console.log(`   POST /api/video-gen/wait — start + block until video ready (or timeout)`);
  console.log(`   GET  /api/video-gen/health — models + requirements`);
  console.log(`   → NOTE: Veo requires a BILLED Google Cloud project — free-tier GEMINI_API_KEY quota is 0`);
  console.log(`🔬 Real Model Integration Status:`);
  console.log(
    `   Gemini Vision + Embeddings (facial landmarks, image features, text/image embeddings): ${process.env.GEMINI_API_KEY ? '✅ configured' : '⚠️  GEMINI_API_KEY not set — falling back to placeholders'}`,
  );
  console.log(
    `   Veo 3.1 (real video generation): ${process.env.GEMINI_API_KEY ? '✅ key configured (billing/quota not yet verified)' : '⚠️  GEMINI_API_KEY not set'}`,
  );
  console.log(
    `   FAL Clarity Upscaler (real AI upscaling): ${process.env.FAL_KEY ? '✅ configured' : '⚠️  FAL_KEY not set — upscale strategy only, cannot execute'}`,
  );
  console.log(
    `   ElevenLabs TTS (script voiceover): ${process.env.ELEVENLABS_API_KEY ? '✅ configured' : '⚠️  ELEVENLABS_API_KEY not set — falls back to mock audio URLs'}`,
  );
  console.log(
    `   Sentry error tracking: ${process.env.SENTRY_DSN ? '✅ configured' : '⚠️  SENTRY_DSN not set — errors only logged locally'}`,
  );
  console.log(
    `   Redis cache/queue persistence: ${process.env.REDIS_URL ? '✅ configured (check GET /api/admin/infra)' : '⚠️  REDIS_URL not set — cache-manager.ts in-memory only'}`,
  );
  console.log(`💾 Database Endpoints:`);
  console.log(`   POST /api/autonomy/database/sync — sync Brain → SQL`);
  console.log(`   GET  /api/autonomy/database/stats`);
  console.log(`   GET  /api/autonomy/database/performance/:batchId`);
});

// Graceful shutdown
const server = app.listen(PORT, () => {
  log.info(`[Server] listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  log.info('[Server] SIGTERM received, starting graceful shutdown');
  server.close(() => {
    log.info('[Server] HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 30s
  setTimeout(() => {
    log.error('[Server] Forced shutdown after 30s timeout');
    process.exit(1);
  }, 30000);
});

process.on('SIGINT', () => {
  log.info('[Server] SIGINT received');
  process.emit('SIGTERM');
});

export default app;
