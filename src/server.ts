import express, { Express, Request, Response } from 'express';
import { log } from './agent/logger.js';
import promptGenerationRoutes from './api/prompt-generation-routes.js';
import contentRoutes from './api/content-routes.js';
import autonomyRoutes from './api/autonomy-routes.js';
import parameterizedImageRoutes from './api/parameterized-image-routes.js';
import videoParameterizedRoutes from './api/video-parameterized-routes.js';
import videoBatch9293Routes from './api/video-batch-92-93-routes.js';
import videoBatch95Routes from './api/video-batch-95-routes.js';
import videoBatch96Routes from './api/video-batch-96-routes.js';
import imageUploadRoutes from './api/image-upload-handler.js';
import { scalingLayer } from './api/scaling-layer.js';
import { feedIADatabase } from './db/database.js';
import type { BrandProfile } from './config/types.js';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Brand context middleware (mock)
app.use((req: Request, res: Response, next) => {
  const mockBrand: BrandProfile = {
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
  };
  (req as any).brand = mockBrand;
  next();
});

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

// Error handler
app.use((err: any, req: Request, res: Response) => {
  log.error('[Server] error', { error: err.message });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Initialize database + start server
app.listen(PORT, async () => {
  try {
    await feedIADatabase.initialize();
    log.info('[Database] initialized', { path: './feedia.db' });
  } catch (error) {
    log.error('[Database] initialization failed', error);
  }

  log.info('[Server] started', { port: PORT });
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
  console.log(`🎬 Video Library Total: BATCH 90-91 (1,100) + BATCH 92-93 (1,350) + BATCH 95-96 (1,000) = 3,450 PROMPTS`);
  console.log(`🖼️  Image Upload & Parameterization Endpoints:`);
  console.log(`   POST /api/image-upload/upload — upload image, extract features`);
  console.log(`   POST /api/image-upload/match-prompts — find matching prompts for image`);
  console.log(`   POST /api/image-upload/parameterize — combine image + prompt + parameters`);
  console.log(`   GET  /api/image-upload/status — database statistics`);
  console.log(`💾 Database: feedia.db (SQLite). Schema: prompts, variations, images, content, analytics, brand_profiles`);
  console.log(`💾 Database Endpoints:`);
  console.log(`   POST /api/autonomy/database/sync — sync Brain → SQL`);
  console.log(`   GET  /api/autonomy/database/stats`);
  console.log(`   GET  /api/autonomy/database/performance/:batchId`);
});

export default app;
