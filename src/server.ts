import express, { Express, Request, Response } from 'express';
import { log } from './agent/logger.js';
import promptGenerationRoutes from './api/prompt-generation-routes.js';
import contentRoutes from './api/content-routes.js';
import autonomyRoutes from './api/autonomy-routes.js';
import parameterizedImageRoutes from './api/parameterized-image-routes.js';
import videoParameterizedRoutes from './api/video-parameterized-routes.js';
import { scalingLayer } from './api/scaling-layer.js';
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

// Error handler
app.use((err: any, req: Request, res: Response) => {
  log.error('[Server] error', { error: err.message });
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

// Start server
app.listen(PORT, () => {
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
  console.log(`💾 Database Endpoints:`);
  console.log(`   POST /api/autonomy/database/sync — sync Brain → SQL`);
  console.log(`   GET  /api/autonomy/database/stats`);
  console.log(`   GET  /api/autonomy/database/performance/:batchId`);
});

export default app;
