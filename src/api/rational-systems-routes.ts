/**
 * Rational Systems Routes
 * All 10 autonomous backend systems: Curation, Audience, Forecasting, A/B Testing, Orchestration,
 * Competitive Intelligence, Sentiment Analysis, Compliance Validator, Trend Detector, Growth Hacker
 */

import { Router, Request, Response } from 'express';

// Import all 10 service modules
import * as ContentCuration from '../services/content-curation.js';
import * as AudienceProfiling from '../services/audience-profiling.js';
import * as EngagementForecasting from '../services/engagement-forecasting.js';
import * as ABTesting from '../services/ab-testing.js';
import * as ChannelOrchestration from '../services/channel-orchestration.js';
import * as CompetitiveIntelligence from '../services/competitive-intelligence.js';
import * as SentimentAnalysis from '../services/sentiment-analysis.js';
import * as ComplianceValidator from '../services/compliance-validator.js';
import * as TrendDetector from '../services/trend-detector.js';
import * as GrowthHacker from '../services/growth-hacker.js';

const router = Router();

// ============ CONTENT CURATION ============

router.post('/curation/record', (req: Request, res: Response): void => {
  try {
    const perf = req.body as ContentCuration.PromptPerformance;
    ContentCuration.recordPromptPerformance(perf);
    const curation = ContentCuration.curateContent();
    return res.json({ success: true, curation });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.get('/curation/analyze', (req: Request, res: Response): void => {
  try {
    const result = ContentCuration.curateContent();
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ AUDIENCE PROFILING ============

router.post('/audience/create-segment', (req: Request, res: Response): void => {
  try {
    const { niche, description } = req.body as { niche: string; description: string };
    const segment = AudienceProfiling.createAudienceSegment(niche, description);
    return res.json({ success: true, segment });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.post('/audience/profile', (req: Request, res: Response): void => {
  try {
    const { niche, description } = req.body as { niche: string; description: string };
    const profile = AudienceProfiling.profileAudience(niche, description);
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ ENGAGEMENT FORECASTING ============

router.post('/forecasting/predict', (req: Request, res: Response): void => {
  try {
    const input = req.body as EngagementForecasting.ForecastInput;
    const forecast = EngagementForecasting.forecastEngagement(input);
    return res.json({ success: true, forecast });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.post('/forecasting/compare', (req: Request, res: Response): void => {
  try {
    const { formats, topic, platform, audience, postingTime } = req.body as {
      formats: Array<'carousel' | 'reel' | 'story' | 'static'>;
      topic: string;
      platform: 'instagram' | 'tiktok' | 'pinterest';
      audience: string;
      postingTime: string;
    };
    const forecasts = EngagementForecasting.compareForecastsForContent(formats, topic, platform, audience, postingTime);
    return res.json({ success: true, forecasts });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ A/B TESTING ============

router.post('/testing/create', (req: Request, res: Response): void => {
  try {
    const { name, hypothesis, controlLabel, variantLabels } = req.body as { name: string; hypothesis: string; controlLabel: string; variantLabels: string[] };
    const test = ABTesting.createTest(name, hypothesis, controlLabel, variantLabels);
    return res.json({ success: true, test });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.get('/testing/active', (req: Request, res: Response): void => {
  try {
    const tests = ABTesting.getActiveTests();
    return res.json({ success: true, tests });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ CHANNEL ORCHESTRATION ============

router.post('/orchestration/distribute', (req: Request, res: Response): void => {
  try {
    const { contentId, contentType, topic } = req.body as { contentId: string; contentType: 'carousel' | 'reel' | 'story' | 'static'; topic: string };
    const distribution = ChannelOrchestration.distributeContent(contentId, contentType, topic);
    return res.json({ success: true, distribution });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.get('/orchestration/schedule/:period', (req: Request, res: Response): void => {
  try {
    const period = String(req.params.period) as 'week' | 'month';
    const schedule = ChannelOrchestration.orchestrateSchedule(period);
    return res.json({ success: true, schedule });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ COMPETITIVE INTELLIGENCE ============

router.post('/competitive/add-competitor', (req: Request, res: Response): void => {
  try {
    const { name, niche, platforms } = req.body as { name: string; niche: string; platforms: string[] };
    const profile = CompetitiveIntelligence.addCompetitor(name, niche, platforms);
    return res.json({ success: true, profile });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.post('/competitive/analyze', (req: Request, res: Response): void => {
  try {
    const { niche } = req.body as { niche: string };
    const analysis = CompetitiveIntelligence.analyzeCompetitors(niche);
    return res.json({ success: true, analysis });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ SENTIMENT ANALYSIS ============

router.post('/sentiment/analyze-comment', (req: Request, res: Response): void => {
  try {
    const { commentId, text } = req.body as { commentId: string; text: string };
    const analysis = SentimentAnalysis.analyzeComment(commentId, text);
    return res.json({ success: true, analysis });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.post('/sentiment/generate-report', (req: Request, res: Response): void => {
  try {
    const { contentId, commentIds } = req.body as { contentId: string; commentIds: string[] };
    const report = SentimentAnalysis.generateSentimentReport(contentId, commentIds);
    return res.json({ success: true, report });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ COMPLIANCE VALIDATOR ============

router.post('/compliance/validate', (req: Request, res: Response): void => {
  try {
    const { contentId, content, platform } = req.body as { contentId: string; content: string; platform: string };
    const check = ComplianceValidator.validateContent(contentId, content, platform);
    return res.json({ success: true, check });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.get('/compliance/stats', (req: Request, res: Response): void => {
  try {
    const stats = ComplianceValidator.getComplianceStats();
    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ TREND DETECTOR ============

router.post('/trends/detect', (req: Request, res: Response): void => {
  try {
    const { name, category, volume, keywords } = req.body as { name: string; category: string; volume: number; keywords: string[] };
    const trend = TrendDetector.detectTrend(name, category, volume, keywords);
    return res.json({ success: true, trend });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.get('/trends/analyze', (req: Request, res: Response): void => {
  try {
    const analysis = TrendDetector.analyzeTrends();
    return res.json({ success: true, analysis });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ GROWTH HACKER ============

router.post('/growth/strategy', (req: Request, res: Response): void => {
  try {
    const { currentFollowers, engagementRate, conversionRate } = req.body as { currentFollowers: number; engagementRate: number; conversionRate: number };
    const strategy = GrowthHacker.buildGrowthStrategy(currentFollowers, engagementRate, conversionRate);
    return res.json({ success: true, strategy });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

router.post('/growth/viral-coefficient', (req: Request, res: Response): void => {
  try {
    const { invites, signups } = req.body as { invites: number; signups: number };
    const result = GrowthHacker.calculateViralCoefficient(invites, signups);
    return res.json({ success: true, result });
  } catch (err) {
    return res.status(400).json({ error: String(err) });
  }
});

// ============ HEALTH CHECK ============

router.get('/health', (req: Request, res: Response): void => {
  return res.json({
    status: 'healthy',
    systems: [
      'content-curation',
      'audience-profiling',
      'engagement-forecasting',
      'ab-testing',
      'channel-orchestration',
      'competitive-intelligence',
      'sentiment-analysis',
      'compliance-validator',
      'trend-detector',
      'growth-hacker',
    ],
    endpoints: 28,
  });
});

export default router;
