/**
 * Content Strategy Routes
 * Calendario de contenido, lista de tareas, brújula de contenido, guiones
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { contentStrategyEngine, DEFAULT_WEEKLY_CADENCE } from '../services/content-strategy-engine.js';
import { scriptWriterEngine } from '../services/script-writer-engine.js';
import type { BrandProfile } from '../config/types.js';

const router = Router();

/**
 * POST /api/strategy/calendar/plan
 * Plan N days of content calendar (persists drafts, does not generate final prompts yet)
 */
router.post('/calendar/plan', async (req: Request, res: Response) => {
  try {
    const brand = req.brand as BrandProfile;
    const { accountId, days = 7, cadence } = req.body;

    if (!accountId) {
      res.status(400).json({ error: 'accountId required' });
      return;
    }

    const plan = await contentStrategyEngine.planCalendar(
      String(accountId),
      brand,
      days,
      cadence || DEFAULT_WEEKLY_CADENCE,
    );

    res.json({
      status: 'success',
      ...plan,
      nextStep:
        'GET /api/strategy/tasks/:accountId to see the pipeline, advance each item through idea -> script -> design -> review -> ready -> scheduled',
      metadata: { plannedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Calendar plan failed', error);
    res.status(500).json({ error: 'Calendar planning failed', message: String(error) });
  }
});

/**
 * GET /api/strategy/tasks/:accountId
 * Task list grouped by production stage
 */
router.get('/tasks/:accountId', async (req: Request, res: Response) => {
  try {
    const { accountId } = req.params;
    const tasks = await contentStrategyEngine.getTaskList(String(accountId));

    const counts = Object.fromEntries(Object.entries(tasks).map(([stage, items]) => [stage, items.length]));

    res.json({
      status: 'ok',
      accountId,
      counts,
      tasks,
      metadata: { retrievedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Task list failed', error);
    res.status(500).json({ error: 'Task list retrieval failed' });
  }
});

/**
 * POST /api/strategy/tasks/:postId/advance
 * Move a planned piece to the next production stage
 */
router.post('/tasks/:postId/advance', async (req: Request, res: Response) => {
  try {
    const { postId } = req.params;
    const { newStage, caption, mediaUrls, scheduledAt } = req.body;

    if (!newStage) {
      res.status(400).json({ error: 'newStage required (idea|script|design|review|ready|scheduled)' });
      return;
    }

    await contentStrategyEngine.advanceStage(String(postId), newStage, { caption, mediaUrls, scheduledAt });

    res.json({
      status: 'advanced',
      postId,
      newStage,
      metadata: { advancedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Task advance failed', error);
    res.status(500).json({ error: 'Task advance failed', message: String(error) });
  }
});

/**
 * GET /api/strategy/compass/:accountId
 * Content Compass — gap analysis vs ideal cadence + recommendation
 */
router.get('/compass/:accountId', async (req: Request, res: Response) => {
  try {
    const brand = req.brand as BrandProfile;
    const { accountId } = req.params;

    const compass = await contentStrategyEngine.getContentCompass(String(accountId), brand);

    res.json({
      status: 'ok',
      ...compass,
      metadata: { computedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Compass failed', error);
    res.status(500).json({ error: 'Compass computation failed' });
  }
});

/**
 * POST /api/strategy/compass/:accountId/fill-gaps
 * Auto-plan just enough posts to close the biggest detected gap
 */
router.post('/compass/:accountId/fill-gaps', async (req: Request, res: Response) => {
  try {
    const brand = req.brand as BrandProfile;
    const { accountId } = req.params;

    const plan = await contentStrategyEngine.fillCompassGaps(String(accountId), brand);

    res.json({
      status: 'success',
      ...plan,
      message: plan.items.length
        ? `Planned ${plan.items.length} posts to close the biggest gap`
        : 'No gaps found — cadence already balanced',
      metadata: { filledAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Fill gaps failed', error);
    res.status(500).json({ error: 'Fill gaps failed', message: String(error) });
  }
});

/**
 * POST /api/strategy/script
 * Generate a scene-by-scene script (guion) for a reel/story/tiktok-video
 */
router.post('/script', async (req: Request, res: Response) => {
  try {
    const { topic, format = 'reel', totalDurationSeconds = 15, sceneCount = 4, asText = false } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'topic required' });
      return;
    }

    const script = await scriptWriterEngine.generateScript(topic, format, totalDurationSeconds, sceneCount);

    res.json({
      status: 'success',
      script,
      textVersion: asText ? scriptWriterEngine.renderScriptAsText(script) : undefined,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Script generation failed', error);
    res.status(500).json({ error: 'Script generation failed', message: String(error) });
  }
});

/**
 * POST /api/strategy/script/audio
 * Generate real ElevenLabs voiceover audio for every scene of a script
 * (script must be a ContentScript object, e.g. from POST /api/strategy/script)
 */
router.post('/script/audio', async (req: Request, res: Response) => {
  try {
    const { script, voiceId } = req.body;

    if (!script || !Array.isArray(script.scenes)) {
      res.status(400).json({ error: 'script (ContentScript object with scenes[]) required' });
      return;
    }

    const audio = await scriptWriterEngine.generateScriptAudio(script, voiceId);

    res.json({
      status: 'success',
      sceneCount: audio.length,
      audio,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Script audio generation failed', error);
    res.status(500).json({ error: 'Script audio generation failed', message: String(error) });
  }
});

/**
 * POST /api/strategy/script/batch
 * Generate scripts for multiple topics in one call
 */
router.post('/script/batch', async (req: Request, res: Response) => {
  try {
    const { topics, format = 'reel', totalDurationSeconds = 15 } = req.body;

    if (!Array.isArray(topics) || topics.length === 0) {
      res.status(400).json({ error: 'topics array required' });
      return;
    }

    const scripts = await scriptWriterEngine.generateScriptBatch(topics, format, totalDurationSeconds);

    res.json({
      status: 'success',
      count: scripts.length,
      scripts,
      metadata: { generatedAt: new Date().toISOString() },
    });
  } catch (error) {
    log.error('[ContentStrategy] Script batch failed', error);
    res.status(500).json({ error: 'Script batch failed' });
  }
});

/**
 * GET /api/strategy/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    res.json({
      status: 'ok',
      service: 'content-strategy-engine',
      purpose: 'Planning, positioning, calendar, task list, content compass (Brújula), and script generation',
      capabilities: [
        'Content calendar planning (weighted pillar rotation, format cadence)',
        'Task list (idea -> script -> design -> review -> ready -> scheduled)',
        'Content Compass — 14-day gap analysis vs ideal cadence + recommendation',
        'Auto-fill gaps — plans just enough posts to fix biggest deficit',
        'Script writer — scene-by-scene guiones with hook/build/CTA pacing',
        'Real ElevenLabs TTS — voiceover audio per scene (falls back to mock if ELEVENLABS_API_KEY unset)',
      ],
      defaultCadence: DEFAULT_WEEKLY_CADENCE,
      endpoints: {
        planCalendar: 'POST /api/strategy/calendar/plan',
        taskList: 'GET /api/strategy/tasks/:accountId',
        advanceTask: 'POST /api/strategy/tasks/:postId/advance',
        compass: 'GET /api/strategy/compass/:accountId',
        fillGaps: 'POST /api/strategy/compass/:accountId/fill-gaps',
        script: 'POST /api/strategy/script',
        scriptBatch: 'POST /api/strategy/script/batch',
        scriptAudio: 'POST /api/strategy/script/audio',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('[ContentStrategy] Health check failed', error);
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
