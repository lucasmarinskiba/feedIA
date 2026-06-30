/**
 * Catch-all serverless de FeedIA en Vercel.
 *
 * Esta deploy de Vercel es MODO DEMO: el frontend completo (toda la UI/UX,
 * vistas, ⌘K, theme toggle, Pantalla en vivo simulada, Sala Ejecutiva,
 * Brand Board, etc.) funciona y se ve "vivo" con datos sembrados acá.
 *
 * Para operación REAL (publicar, autopilot, scheduler, SSE largo, SQLite,
 * Computer Use real) hace falta correr el backend completo en un host con
 * proceso largo (Render/Railway/Fly/VPS). Ver README-DEPLOY.md.
 *
 * Política: cualquier path no mapeado devuelve 200 con `{ demoMode: true, note }`
 * en vez de 404 — así el `apiSafe` del frontend no llena la pantalla de
 * errores y la demo se siente coherente.
 */

import * as d from './_demo.js';
import { handleSkills } from './_skills.js';
import { handleGrowth } from './_growth.js';
import { handleAuth } from './_auth.js';
import { handleUsers, getSessionFromReq } from './_users.js';
import { handleBilling } from './_billing.js';
import { handleGate, gateRequest } from './_gate.js';
import { recordUsage } from './_usage.js';
import { handleWorkspace } from './_workspace.js';
import { handleBridge } from './_bridge.js';
import { handleStrategist, buildStrategicPlan } from './_strategist.js';
import { handleTiktokScript } from './_tiktokScriptEngine.js';
import { handleHookLab } from './_hookLab.js';
import { handleVisualDirector } from './_visualDirector.js';
import { handleSoundDesigner } from './_soundDesigner.js';
import { handleNicheResearch } from './_nicheResearchAgent.js';
import { buildAccountBrief } from './_accountBrief.js';
import {
  handleAccountMemory,
  buildMemoryContext,
  recordPlan as recordAccountPlan,
  saveProfile as saveAccountProfile,
} from './_accountMemory.js';
import { handleFeedVision } from './_feedVision.js';
import { handleSocialConnect } from './_socialConnect.js';
import { handleAudienceTargeting } from './_audienceTargetingAgent.js';
import { handleGrowthStrategist } from './_growthStrategistAgent.js';
import { handleGrowthCouncil } from './_growthCouncil.js';
import { handleViralPredictor, predictVirality } from './_viralPredictor.js';
import { handleContentForge } from './_contentForge.js';
import { getFreeProviderStatus } from './_freeAi.js';
import { handleByok, handleCapabilities } from './_aiRouter.js';
import { handleFreeCu } from './_freeComputerUse.js';
import { handleCalendar } from './_calendarPlanner.js';
import { handleApiKeys, validateApiKey } from './_apiKeys.js';
import * as featureFlags from './_featureFlags.js';
import * as jobQueue from './_queue.js';
import { getOpenApiSpec } from './_openapi.js';
import { handleWhiteLabel } from './_whiteLabel.js';
import { handleAlwaysOnCron } from './_alwaysOnScheduler.js';
import { handleVideoEditor } from './_videoEditor.js';
import { handleImageProviders } from './_imageProviders.js';
import { handleVideoProviders } from './_videoProviders.js';
import { handleCuRecipes } from './_cuRecipeLibrary.js';
import { handleGrowthIntelligence } from './_growthIntelligence.js';
import { handleEliteEngine } from './_eliteCreatorEngine.js';
import { handleEliteVideoEditing } from './_eliteVideoEditing.js';
import { handleLegendaryEngine } from './_legendaryCreatorEngine.js';
import { handleAgencyBrain } from './_agencyBrain.js';
import { handleAndromeda } from './_andromeda.js';
import { handleCanvasSpecs } from './_canvasSpecs.js';
import { handleBrandStudio } from './_brandStudio.js';
import { handleCarouselRules } from './_carouselViralRules.js';
import { handleAutopilotCreate } from './_autopilotCreate.js';
import { handleCanvaConnect } from './_canvaConnect.js';
import { handleDesignTools } from './_designTools.js';
import { handleVisionLoop } from './_visionLoop.js';
import { handlePromptLibrary } from './_promptLibrary.js';
import { handleNicheIntelligence } from './_nicheIntelligence.js';
import { handleGstack } from './_gstack.js';
import { handleFeedbackLoop } from './_feedbackLoop.js';
import { handleToolBoost } from './_toolBoost.js';
import { handleHandsFree } from './_handsFree.js';
import { handleRunAll } from './_runAll.js';
import { handleElevenLabs } from './_elevenLabs.js';
import { handleIntentParser } from './_intentParser.js';
import { handleCommunityBrain } from './_communityBrain.js';
import { handleStoriesEngine } from './_storiesEngine.js';
import { handleCommunityEngine } from './_communityEngine.js';
import { handleMasterOrchestrator } from './_cuMasterOrchestrator.js';
import { handleCuExecutor } from './_cuExecutor.js';
import { handleBrandAuthority } from './_brandAuthorityEngine.js';
import { handleInfluencerImagination } from './_influencerImagination.js';
import { igProfile, ttProfile, igInsights, igMedia, igConnected } from './_social.js';
import * as store from './_store.js';
import * as cache from './_cache.js';
import { rateLimit, ipOf, LIMITS, costLimit } from './_rateLimit.js';
import { checkCsrf } from './_csrf.js';
import { logError, logHit, getErrors, getStats, getMonitoringDashboard, logCreditUsage, logRateLimit } from './_obs.js';
import { askLLMJson, askLLM, HAS_LLM, ORDER as LLM_ORDER } from './_llm.js';

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  if (!res.getHeader('cache-control')) res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

const ok = (res, body) => json(res, 200, body);
const accepted = (res, body) => json(res, 202, body);

// CDN cache: respuestas inmutables/lentas (capabilities, plans, hooks/library, etc.)
const cached = (res, body, sMaxage = 3600, swr = 86400) => {
  res.setHeader('cache-control', `public, s-maxage=${sMaxage}, stale-while-revalidate=${swr}`);
  return ok(res, body);
};

const NOT_REAL = (path) => ({
  demoMode: true,
  note: `Endpoint ${path} no disponible en la deploy de Vercel (modo demo). Cloná el repo y corré el backend completo para datos reales.`,
});

// ── Siamese CORS ──────────────────────────────────────────────────────
const ALLOWED_ORIGINS = new Set([
  'https://feedia.vercel.app',
  'https://feedia-next.vercel.app',
  'https://feedia-lucasdmarin-7650s-projects.vercel.app',
  'http://localhost:3000',
  'http://localhost:5173',
]);
const applyCors = (req, res) => {
  const origin = req.headers.origin || '';
  const allow = ALLOWED_ORIGINS.has(origin) ? origin : 'https://feedia-next.vercel.app';
  res.setHeader('access-control-allow-origin', allow);
  res.setHeader('access-control-allow-credentials', 'true');
  res.setHeader('access-control-allow-methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('access-control-allow-headers', 'content-type,authorization,x-feedia-passport,x-feedia-twin');
  res.setHeader('vary', 'origin');
  res.setHeader('x-feedia-twin', 'feedia-vanilla');
};

// Mapea rutas a acciones costosas para rate-limiting por créditos.
const pathToCostAction = (path, method) => {
  if (method === 'GET') return null;
  if (path.startsWith('/api/content-forge/')) return 'llm_advanced';
  if (path.startsWith('/api/strategist/')) return 'llm_advanced';
  if (path.startsWith('/api/bridge/')) return 'llm_basic';
  if (path.startsWith('/api/video-editor/')) return 'video_generate';
  if (path.startsWith('/api/image-providers/')) return 'image_generate';
  if (path.startsWith('/api/video-providers/')) return 'video_generate';
  if (path.startsWith('/api/cu-')) return 'computer_use';
  if (path.startsWith('/api/social/') && path.includes('publish')) return 'social_publish';
  if (path.startsWith('/api/audit')) return 'audit_full';
  if (path.startsWith('/api/chat')) return 'llm_basic';
  if (path.startsWith('/api/voice')) return 'voice';
  return null;
};

const innerHandler = async (req, res) => {
  applyCors(req, res);
  if ((req.method || 'GET').toUpperCase() === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  const url = new URL(req.url || '/', 'http://x');
  const path = url.pathname; // p.ej. /api/home/identity
  const m = req.method || 'GET';

  // ── CSRF check para mutaciones (soft-mode: solo enforce si CSRF_REQUIRED=true) ──
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(m)) {
    try {
      const cookies = (req.headers.cookie || '').split(';').map((c) => c.trim());
      const sessTok = cookies.find((c) => c.startsWith('feedia_session='))?.slice(15);
      if (!checkCsrf(req, res, sessTok)) return; // ya respondió 403 si REQUIRED
    } catch {
      /* CSRF soft-fail */
    }
  }

  // ── Version header en todas las respuestas ────────────────────────────
  const APP_VERSION = process.env.APP_VERSION || `1.0.0-${(process.env.VERCEL_GIT_COMMIT_SHA || 'dev').slice(0, 7)}`;
  res.setHeader('x-feedia-version', APP_VERSION);

  // ── API v1: Queue jobs (background workers) ────────────────────────────
  if (path === '/api/v1/queue/jobs' && m === 'POST') {
    const ctx = await getSessionFromReq(req).catch(() => null);
    if (!ctx) return json(res, 401, { error: 'Se requiere sesión' });
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const result = await jobQueue.enqueueJob(body);
    if (!result.ok) return json(res, 503, result);
    return json(res, 202, result);
  }
  if (path.startsWith('/api/v1/queue/jobs/') && m === 'GET') {
    const ctx = await getSessionFromReq(req).catch(() => null);
    if (!ctx) return json(res, 401, { error: 'Se requiere sesión' });
    const parts = path.split('/');
    const name = parts[parts.length - 2];
    const id = parts[parts.length - 1];
    const result = await jobQueue.getJobStatus(name, id);
    return json(res, result.ok ? 200 : 404, result);
  }

  // ── Feature flags públicas (para que el frontend sepa qué versiones mostrar) ─
  if (path === '/api/features' && m === 'GET') {
    const ctx = await getSessionFromReq(req).catch(() => null);
    const flags = await featureFlags.listFlags();
    const visible = [];
    for (const f of flags) {
      if (await featureFlags.isEnabled(f.key, ctx?.user || null))
        visible.push({ key: f.key, enabled: true, description: f.description });
    }
    return ok(res, { ok: true, flags: visible, version: APP_VERSION });
  }
  if (path.startsWith('/api/features/') && m === 'GET') {
    const ctx = await getSessionFromReq(req).catch(() => null);
    const key = path.split('/').pop();
    const enabled = await featureFlags.isEnabled(key, ctx?.user || null);
    return ok(res, { ok: true, key, enabled });
  }

  // ── Rate limiting por acción costosa (créditos por plan) ───────────────
  const costAction = pathToCostAction(path, m);
  if (costAction) {
    try {
      const costCtx = await getSessionFromReq(req);
      if (costCtx?.user && !(await costLimit(req, res, costCtx.user, costAction))) return;
    } catch {
      /* fallthrough: endpoints sin sesión pueden continuar */
    }
  }

  // ── Health check — siempre responde JSON 200 para silenciar offlineBanner ──
  if (path === '/api/health' || path === '/api/ping' || path === '/api/v1/health') {
    return cached(
      res,
      { ok: true, ts: Date.now(), env: 'vercel', region: process.env.VERCEL_REGION || 'unknown', version: APP_VERSION },
      10,
      60,
    );
  }
  if (path === '/api/health/providers' || path === '/api/v1/health/providers') {
    const status = await cache.withCache('health:providers', () => Promise.resolve(getFreeProviderStatus()), 30);
    return cached(res, status, 30, 300);
  }

  // ── API v1: OpenAPI spec ───────────────────────────────────────────────
  if (path === '/api/v1/openapi.json' && m === 'GET') {
    const spec = await getOpenApiSpec();
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify(spec, null, 2));
  }
  if (path === '/api/v1/openapi.yaml' && m === 'GET') {
    const { readFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const yaml = await readFile(resolve(process.cwd(), 'docs', 'openapi.yaml'), 'utf-8').catch(() => null);
    if (!yaml) return json(res, 404, { error: 'openapi.yaml no encontrado' });
    res.setHeader('content-type', 'text/yaml; charset=utf-8');
    return res.end(yaml);
  }

  // ── Plan Features Matrix — transparencia + audit honesto ──────────────
  if (path === '/api/plans/features-matrix') {
    const body = await cache.withCache(
      'plans:features-matrix',
      async () => {
        const { PLAN_FEATURES, auditPlanCompliance, getRoadmapFeatures } = await import('./_planFeatures.js');
        const audit = ['free', 'starter', 'pro', 'gold', 'premium'].reduce((acc, p) => {
          acc[p] = { compliance: auditPlanCompliance(p), roadmapFeatures: getRoadmapFeatures(p) };
          return acc;
        }, {});
        return { matrix: PLAN_FEATURES, audit };
      },
      600,
    );
    return cached(res, body, 600, 3600);
  }
  if (path && path.startsWith('/api/plans/features/')) {
    const planId = path.split('/').pop();
    const { PLAN_FEATURES, auditPlanCompliance, getRoadmapFeatures } = await import('./_planFeatures.js');
    if (!PLAN_FEATURES[planId]) return json(res, 404, { error: 'plan no existe' });
    return ok(res, {
      planId,
      features: PLAN_FEATURES[planId],
      compliance: auditPlanCompliance(planId),
      roadmapFeatures: getRoadmapFeatures(planId),
    });
  }

  // ── Capabilities matrix (público, para pricing.html y settings) ────────
  if (path === '/api/capabilities') {
    try {
      if (await handleCapabilities(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'capabilities-handler', message: String(err) });
    }
  }

  // ── Calendar editorial auto-gen (Pro+) ─────────────────────────────────
  if (path.startsWith('/api/calendar/')) {
    let cBody = req.body;
    if (cBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        cBody = raw ? JSON.parse(raw) : {};
      } catch {
        cBody = {};
      }
    }
    try {
      if (await handleCalendar(req, res, path, m, cBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'calendar-handler', message: String(err) });
    }
  }

  // ── Account Memory (perfil + métricas reales + insights) ────────────────
  if (path.startsWith('/api/account/')) {
    let aBody = req.body;
    if (aBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        aBody = raw ? JSON.parse(raw) : {};
      } catch {
        aBody = {};
      }
    }
    const amCtx = await getSessionFromReq(req).catch(() => null);
    const amUid = amCtx?.user?.id || null;
    try {
      if (await handleFeedVision(req, res, path, m, aBody || {}, { userId: amUid })) return;
    } catch (err) {
      return json(res, 500, { error: 'vision-handler', message: String(err) });
    }
    try {
      if (await handleAccountMemory(req, res, path, m, aBody || {}, { userId: amUid })) return;
    } catch (err) {
      return json(res, 500, { error: 'account-handler', message: String(err) });
    }
  }

  // ── Social Connect (OAuth IG/TikTok + publish + sync métricas reales) ────
  if (path.startsWith('/api/connect/') || path.startsWith('/api/publish/')) {
    let scBody = req.body;
    if (scBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        scBody = raw ? JSON.parse(raw) : {};
      } catch {
        scBody = {};
      }
    }
    const scCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleSocialConnect(req, res, path, m, scBody || {}, { userId: scCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'social-handler', message: String(err) });
    }
  }

  // ── Agency Brain (orquestador maestro) ────────────────────────────────
  if (path === '/api/agency/brain/run') {
    let abBody = req.body;
    if (abBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        abBody = raw ? JSON.parse(raw) : {};
      } catch {
        abBody = {};
      }
    }
    const abCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleAgencyBrain(req, res, path, m, abBody || {}, { userId: abCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'agency-brain', message: String(err) });
    }
  }

  // ── Andrómeda (Matriz Creativa) ────────────────────────────────────────────
  if (path === '/api/agency/andromeda/matrix') {
    let andBody = req.body;
    if (andBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        andBody = raw ? JSON.parse(raw) : {};
      } catch {
        andBody = {};
      }
    }
    try {
      if (await handleAndromeda(req, res, path, m, andBody || {}, {})) return;
    } catch (err) {
      return json(res, 500, { error: 'andromeda', message: String(err) });
    }
  }

  // ── Canvas Specs (dimensiones + safe-zones) ────────────────────────────────
  if (path === '/api/agency/specs') {
    try {
      if (await handleCanvasSpecs(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'canvas-specs', message: String(err) });
    }
  }

  // ── Vision Loop (see-decide-act, spy, extract, verify CU steps) ─────────────
  if (path.startsWith('/api/vision')) {
    let vlBody = req.body;
    if (vlBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        vlBody = raw ? JSON.parse(raw) : {};
      } catch { vlBody = {}; }
    }
    try {
      if (await handleVisionLoop(req, res, path, m, vlBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'vision-loop', message: String(err) });
    }
  }

  // ── Design Tools (remove-bg, upscale, palette, font-pair, slide-html) ────────
  if (path.startsWith('/api/design')) {
    let dtBody = req.body;
    if (dtBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        dtBody = raw ? JSON.parse(raw) : {};
      } catch { dtBody = {}; }
    }
    try {
      if (await handleDesignTools(req, res, path, m, dtBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'design-tools', message: String(err) });
    }
  }

  // ── Carousel Viral Rules ────────────────────────────────────────────────────
  if (path === '/api/agency/carousel-rules' || path === '/api/agency/carousel-validate') {
    let crBody = req.body;
    if (crBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        crBody = raw ? JSON.parse(raw) : {};
      } catch {
        crBody = {};
      }
    }
    try {
      if (await handleCarouselRules(req, res, path, m, crBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'carousel-rules', message: String(err) });
    }
  }

  // ── Autopilot Create (crear + publicar autónomo vía API) ───────────────────
  if (path === '/api/autopilot/create-post') {
    let apBody = req.body;
    if (apBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        apBody = raw ? JSON.parse(raw) : {};
      } catch {
        apBody = {};
      }
    }
    const apCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleAutopilotCreate(req, res, path, m, apBody || {}, { userId: apCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'autopilot-create', message: String(err) });
    }
  }

  // ── Prompt Library (priming por nicho/arquetipo/mood + roles) ─────────────
  if (path.startsWith('/api/library/')) {
    let plBody = req.body;
    if (plBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        plBody = raw ? JSON.parse(raw) : {};
      } catch {
        plBody = {};
      }
    }
    try {
      if (await handlePromptLibrary(req, res, path, m, plBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'prompt-library', message: String(err) });
    }
  }

  // ── Community Engine (DM + comment auto-response) ─────────────────────────
  if (path.startsWith('/api/community/')) {
    let ceBody = req.body;
    if (ceBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        ceBody = raw ? JSON.parse(raw) : {};
      } catch {
        ceBody = {};
      }
    }
    const ceCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleCommunityEngine(req, res, path, m, ceBody || {}, { userId: ceCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'community-engine', message: String(err) });
    }
  }

  // ── Stories Engine (visual frames 9:16 con good-zones + stickers) ─────────
  if (path === '/api/stories/generate') {
    let seBody = req.body;
    if (seBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        seBody = raw ? JSON.parse(raw) : {};
      } catch {
        seBody = {};
      }
    }
    const seCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleStoriesEngine(req, res, path, m, seBody || {}, { userId: seCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'stories-engine', message: String(err) });
    }
  }

  // ── Community Brain (CM IA — multi-step, cultura regional, thread memory) ─
  if (path.startsWith('/api/community/brain/')) {
    let cbBody = req.body;
    if (cbBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        cbBody = raw ? JSON.parse(raw) : {};
      } catch { cbBody = {}; }
    }
    const cbCtx = await getSessionFromReq(req).catch(() => null);
    try { if (await handleCommunityBrain(req, res, path, m, cbBody || {}, { userId: cbCtx?.user?.id || null })) return; }
    catch (err) { return json(res, 500, { error: 'community-brain', message: String(err) }); }
  }

  // ── Intent Parser (extrae estructura del texto/voz libre) ─────────────────
  if (path === '/api/intent/parse') {
    let ipBody = req.body;
    if (ipBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        ipBody = raw ? JSON.parse(raw) : {};
      } catch { ipBody = {}; }
    }
    try { if (await handleIntentParser(req, res, path, m, ipBody || {})) return; }
    catch (err) { return json(res, 500, { error: 'intent-parser', message: String(err) }); }
  }

  // ── ElevenLabs TTS (opt-in BYOK voz premium) ──────────────────────────────
  if (path.startsWith('/api/voice/elevenlabs/')) {
    let elBody = req.body;
    if (elBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        elBody = raw ? JSON.parse(raw) : {};
      } catch { elBody = {}; }
    }
    const elCtx = await getSessionFromReq(req).catch(() => null);
    try { if (await handleElevenLabs(req, res, path, m, elBody || {}, { userId: elCtx?.user?.id || null })) return; }
    catch (err) { return json(res, 500, { error: 'elevenlabs', message: String(err) }); }
  }

  // ── Run All (Trabajar mi cuenta esta semana — 1 botón, todo en cadena) ────
  if (path === '/api/runall/week') {
    let raBody = req.body;
    if (raBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        raBody = raw ? JSON.parse(raw) : {};
      } catch {
        raBody = {};
      }
    }
    const raCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleRunAll(req, res, path, m, raBody || {}, { userId: raCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'run-all', message: String(err) });
    }
  }

  // ── Hands-Free (Computer Use modo manos libres — 1 textarea, cero forms) ─
  if (path.startsWith('/api/handsfree/')) {
    let hfBody = req.body;
    if (hfBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        hfBody = raw ? JSON.parse(raw) : {};
      } catch {
        hfBody = {};
      }
    }
    const hfCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleHandsFree(req, res, path, m, hfBody || {}, { userId: hfCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'handsfree', message: String(err) });
    }
  }

  // ── Tool Boost (modelos/libs/frameworks por tool × plataforma) ────────────
  if (path === '/api/tool-boost') {
    try {
      if (await handleToolBoost(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'tool-boost', message: String(err) });
    }
  }

  // ── Feedback Loop (memoria activa + cron diario) ──────────────────────────
  if (path === '/api/feedback/run' || path === '/api/cron/feedback-daily') {
    let fbBody = req.body;
    if (fbBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        fbBody = raw ? JSON.parse(raw) : {};
      } catch {
        fbBody = {};
      }
    }
    const fbCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleFeedbackLoop(req, res, path, m, fbBody || {}, { userId: fbCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'feedback-loop', message: String(err) });
    }
  }

  // ── Gstack (meta-controller / Growth Stack orchestrator) ──────────────────
  if (path === '/api/gstack/run') {
    let gsBody = req.body;
    if (gsBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        gsBody = raw ? JSON.parse(raw) : {};
      } catch {
        gsBody = {};
      }
    }
    const gsCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleGstack(req, res, path, m, gsBody || {}, { userId: gsCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'gstack', message: String(err) });
    }
  }

  // ── Niche Intelligence Engine ──────────────────────────────────────────────
  if (path.startsWith('/api/intelligence/')) {
    let niBody = req.body;
    if (niBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        niBody = raw ? JSON.parse(raw) : {};
      } catch {
        niBody = {};
      }
    }
    const niCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleNicheIntelligence(req, res, path, m, niBody || {}, { userId: niCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'niche-intelligence', message: String(err) });
    }
  }

  // ── Canva Connect (OAuth + brand templates + export oficial) ───────────────
  if (path.startsWith('/api/canva/')) {
    let cvBody = req.body;
    if (cvBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        cvBody = raw ? JSON.parse(raw) : {};
      } catch {
        cvBody = {};
      }
    }
    const cvCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (await handleCanvaConnect(req, res, path, m, cvBody || {}, { userId: cvCtx?.user?.id || null })) return;
    } catch (err) {
      return json(res, 500, { error: 'canva-connect', message: String(err) });
    }
  }

  // ── Brand Studio (imágenes con foto autorizada + marca) ────────────────────
  if (path.startsWith('/api/brand-studio/')) {
    let bsBody = req.body;
    if (bsBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        bsBody = raw ? JSON.parse(raw) : {};
      } catch {
        bsBody = {};
      }
    }
    const bsCtx = await getSessionFromReq(req).catch(() => null);
    try {
      if (
        await handleBrandStudio(req, res, path, m, bsBody || {}, {
          userId: bsCtx?.user?.id || null,
          planId: bsCtx?.user?.plan || 'free',
        })
      )
        return;
    } catch (err) {
      return json(res, 500, { error: 'brand-studio', message: String(err) });
    }
  }

  // ── API Keys (Premium) ─────────────────────────────────────────────────
  if (path.startsWith('/api/keys')) {
    let kBody = req.body;
    if (kBody === undefined && (m === 'POST' || m === 'PUT' || m === 'DELETE')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        kBody = raw ? JSON.parse(raw) : {};
      } catch {
        kBody = {};
      }
    }
    try {
      if (await handleApiKeys(req, res, path, m, kBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'apikeys-handler', message: String(err) });
    }
  }

  // ── White-label config (Premium) ───────────────────────────────────────
  if (path.startsWith('/api/whitelabel/')) {
    let wBody = req.body;
    if (wBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        wBody = raw ? JSON.parse(raw) : {};
      } catch {
        wBody = {};
      }
    }
    try {
      if (await handleWhiteLabel(req, res, path, m, wBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'whitelabel-handler', message: String(err) });
    }
  }

  // ── Always-on cron (Vercel cron triggered) ─────────────────────────────
  if (path === '/api/cron/always-on-tick' || path === '/api/cron/status') {
    try {
      if (await handleAlwaysOnCron(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'cron-handler', message: String(err) });
    }
  }

  // ── CU Recipe Library (IG/TT/Canva/CapCut/Runway/Pika/Luma/Kling/...) ──
  if (path === '/api/cu/recipes' || path.startsWith('/api/cu/recipes/')) {
    try {
      if (await handleCuRecipes(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'cu-recipes', message: String(err) });
    }
  }

  // ── CU Master Workflows (multi-tool orchestration) ──────────────────────
  if (path === '/api/cu/workflows' || path.startsWith('/api/cu/workflows/')) {
    try {
      if (await handleMasterOrchestrator(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'master-orchestrator', message: String(err) });
    }
  }

  // ── Brand Authority Engine ─────────────────────────────────────────────
  if (path.startsWith('/api/brand-authority/')) {
    let baBody = req.body;
    if (baBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        baBody = raw ? JSON.parse(raw) : {};
      } catch {
        baBody = {};
      }
    }
    try {
      if (await handleBrandAuthority(req, res, path, m, baBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'brand-authority', message: String(err) });
    }
  }

  // ── Influencer Imagination Engine ──────────────────────────────────────
  if (path.startsWith('/api/imagination/')) {
    let imBody = req.body;
    if (imBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        imBody = raw ? JSON.parse(raw) : {};
      } catch {
        imBody = {};
      }
    }
    try {
      if (await handleInfluencerImagination(req, res, path, m, imBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'imagination', message: String(err) });
    }
  }

  // ── Legendary Creator Engine (archetypes Luisito/Trump/MrBeast/etc) ────
  if (path.startsWith('/api/legendary/')) {
    let lBody = req.body;
    if (lBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        lBody = raw ? JSON.parse(raw) : {};
      } catch {
        lBody = {};
      }
    }
    try {
      if (await handleLegendaryEngine(req, res, path, m, lBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'legendary-handler', message: String(err) });
    }
  }

  // ── Elite Video Editing (LUTs, color, audio, composition, safe-areas) ──
  if (path.startsWith('/api/elite-video/')) {
    let evBody = req.body;
    if (evBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        evBody = raw ? JSON.parse(raw) : {};
      } catch {
        evBody = {};
      }
    }
    try {
      if (await handleEliteVideoEditing(req, res, path, m, evBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'elite-video-handler', message: String(err) });
    }
  }

  // ── Elite Creator Engine (supera CM/influencers/creators top) ──────────
  if (path.startsWith('/api/elite/')) {
    let eBody = req.body;
    if (eBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        eBody = raw ? JSON.parse(raw) : {};
      } catch {
        eBody = {};
      }
    }
    try {
      if (await handleEliteEngine(req, res, path, m, eBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'elite-handler', message: String(err) });
    }
  }

  // ── Growth Intelligence (niche/audience/perf/calendar/hooks/viral/brand) ──
  if (path.startsWith('/api/intel/')) {
    let iBody = req.body;
    if (iBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        iBody = raw ? JSON.parse(raw) : {};
      } catch {
        iBody = {};
      }
    }
    try {
      if (await handleGrowthIntelligence(req, res, path, m, iBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'intel-handler', message: String(err) });
    }
  }

  // ── Provider registry endpoints (qué providers están disponibles) ──────
  if (path === '/api/providers/images') {
    try {
      if (await handleImageProviders(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'img-providers', message: String(err) });
    }
  }
  if (path === '/api/providers/videos') {
    try {
      if (await handleVideoProviders(req, res, path, m)) return;
    } catch (err) {
      return json(res, 500, { error: 'vid-providers', message: String(err) });
    }
  }

  // ── Video edit spec (plan-tier feature gradient) ───────────────────────
  if (path === '/api/video/edit-spec') {
    let vBody = req.body;
    if (vBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        vBody = raw ? JSON.parse(raw) : {};
      } catch {
        vBody = {};
      }
    }
    try {
      if (await handleVideoEditor(req, res, path, m, vBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'video-editor', message: String(err) });
    }
  }

  // ── Free Computer Use + Autopilot (Llama Vision + recipes) ────────────
  if (path.startsWith('/api/free-cu/')) {
    let cuBody = req.body;
    if (cuBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        cuBody = raw ? JSON.parse(raw) : {};
      } catch {
        cuBody = {};
      }
    }
    // Carousel demo (showcase end-to-end Computer Use journey)
    if (path === '/api/free-cu/carousel-demo') {
      try {
        const { handleFreeCarouselDemo } = await import('./_freeCarouselDemo.js');
        if (await handleFreeCarouselDemo(req, res, path, m, cuBody || {})) return;
      } catch (err) {
        return json(res, 500, { error: 'carousel-demo', message: String(err) });
      }
    }
    try {
      if (await handleFreeCu(req, res, path, m, cuBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'freecu-handler', message: String(err) });
    }
  }

  // ── BYOK (Bring Your Own Key) — free users con su propia Groq key ──────
  if (path.startsWith('/api/byok/')) {
    let bBody = req.body;
    if (bBody === undefined && (m === 'POST' || m === 'PUT' || m === 'DELETE')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        bBody = raw ? JSON.parse(raw) : {};
      } catch {
        bBody = {};
      }
    }
    try {
      if (await handleByok(req, res, path, m, bBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'byok-handler', message: String(err) });
    }
  }

  // ── TikTok Script Engine + Hook Lab + Visual Director + Sound Designer ──
  // ── Niche Research + Audience Targeting + Growth Strategist + Council ───
  if (
    path.startsWith('/api/tiktok/script/') ||
    path.startsWith('/api/hooks/') ||
    path.startsWith('/api/tiktok/visuals/') ||
    path.startsWith('/api/tiktok/sound/') ||
    path.startsWith('/api/growth/research/') ||
    path.startsWith('/api/growth/audience/') ||
    path.startsWith('/api/growth/strategy/') ||
    path.startsWith('/api/growth/council/')
  ) {
    const sessCtx = await getSessionFromReq(req).catch(() => null);
    const userId = sessCtx?.user?.id || null;
    const ip = ipOf(req);

    // Rate-limit por categoría (POST sólo — GET pasa libre con el cap global)
    if (m === 'POST') {
      let category = 'studio';
      if (path.startsWith('/api/hooks/')) category = 'hooks';
      else if (path.startsWith('/api/growth/research/') || path.startsWith('/api/growth/audience/'))
        category = 'branding';
      else if (path.startsWith('/api/growth/strategy/') || path.startsWith('/api/growth/council/')) category = 'forge';
      const limCfg = LIMITS[category] || LIMITS.studio;
      const rlKey = userId ? `${category}:${userId}` : `${category}:${ip}`;
      if (!(await rateLimit(req, res, rlKey, limCfg.limit, limCfg.window, { user: sessCtx?.user }))) return;

      // Cost limit específico para el Council (acción costosa que orquesta 6 agentes)
      if (path === '/api/growth/council/run' && sessCtx?.user) {
        if (!(await costLimit(req, res, sessCtx.user, 'growth_council'))) return;
      }
    }

    // Body parse
    let gBody = req.body;
    if (gBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        gBody = raw ? JSON.parse(raw) : {};
      } catch {
        gBody = {};
      }
    }

    const ctx = { user: sessCtx?.user || null };
    try {
      if (path.startsWith('/api/tiktok/script/') && (await handleTiktokScript(req, res, path, m, gBody || {}, ctx)))
        return;
      if (path.startsWith('/api/hooks/') && (await handleHookLab(req, res, path, m, gBody || {}, ctx))) return;
      if (path.startsWith('/api/tiktok/visuals/') && (await handleVisualDirector(req, res, path, m, gBody || {}, ctx)))
        return;
      if (path.startsWith('/api/tiktok/sound/') && (await handleSoundDesigner(req, res, path, m, gBody || {}, ctx)))
        return;
      if (path.startsWith('/api/growth/research/') && (await handleNicheResearch(req, res, path, m, gBody || {}, ctx)))
        return;
      if (
        path.startsWith('/api/growth/audience/') &&
        (await handleAudienceTargeting(req, res, path, m, gBody || {}, ctx))
      )
        return;
      if (
        path.startsWith('/api/growth/strategy/') &&
        (await handleGrowthStrategist(req, res, path, m, gBody || {}, ctx))
      )
        return;
      if (path.startsWith('/api/growth/council/') && (await handleGrowthCouncil(req, res, path, m, gBody || {}, ctx)))
        return;
    } catch (err) {
      return json(res, 500, { error: 'growth-agents-handler', path, message: String(err?.message || err) });
    }
  }

  // ── Strategic brain + Viral predictor + Content Forge ──────────────────
  if (path === '/api/strategy/plan' || path === '/api/predict/virality' || path === '/api/forge/content') {
    // Rate-limit por user (caro: usa LLM)
    if (m === 'POST') {
      const sessCtx = await getSessionFromReq(req);
      const rlKey = sessCtx?.user?.id ? `forge:${sessCtx.user.id}` : `forge:${ipOf(req)}`;
      if (!(await rateLimit(req, res, rlKey, LIMITS.forge.limit, LIMITS.forge.window, { user: sessCtx?.user }))) return;
    }
    let fBody = req.body;
    if (fBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        fBody = raw ? JSON.parse(raw) : {};
      } catch {
        fBody = {};
      }
    }
    try {
      if (path === '/api/strategy/plan' && (await handleStrategist(req, res, path, m, fBody || {}))) return;
      if (path === '/api/predict/virality' && (await handleViralPredictor(req, res, path, m, fBody || {}))) return;
      if (path === '/api/forge/content' && (await handleContentForge(req, res, path, m, fBody || {}))) return;
    } catch (err) {
      return json(res, 500, { error: 'brain-handler', message: String(err) });
    }
  }

  // ── Usage + Gate (plan limits & quotas) ─────────────────────────────────
  if (path.startsWith('/api/usage/') || path === '/api/plans/limits') {
    let gBody = req.body;
    if (gBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        gBody = raw ? JSON.parse(raw) : {};
      } catch {
        gBody = {};
      }
    }
    try {
      if (await handleGate(req, res, path, m, gBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'gate-handler', message: String(err) });
    }
  }

  // ── Stripe Billing ──────────────────────────────────────────────────────
  if (path.startsWith('/api/billing/')) {
    let rawBody = '';
    let bBody = req.body;
    if (m === 'POST' || m === 'PUT') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        rawBody = Buffer.concat(chunks).toString('utf-8');
        if (rawBody && bBody === undefined) {
          try {
            bBody = JSON.parse(rawBody);
          } catch {
            bBody = {};
          }
        }
      } catch {
        /* noop */
      }
    }
    try {
      if (await handleBilling(req, res, path, m, bBody || {}, rawBody)) return;
    } catch (err) {
      return json(res, 500, { error: 'billing-handler', message: String(err) });
    }
  }

  // ── SKILLS REALES (no demo): list / generador carrusel Node-FAL / status / slide ──
  if (path.startsWith('/api/skills')) {
    let parsedBody = req.body;
    if (parsedBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        parsedBody = raw ? JSON.parse(raw) : {};
      } catch {
        parsedBody = {};
      }
    }
    try {
      if (await handleSkills(req, res, path, m, parsedBody || {}, url.searchParams)) return;
    } catch (err) {
      return json(res, 500, { error: 'skills-handler', message: String(err) });
    }
  }

  // ── Workspace real: Calendario / Pizarra / Simulador (store-backed) ─────
  if (
    path.startsWith('/api/calendar') ||
    path === '/api/scheduler/jobs' ||
    path.startsWith('/api/whiteboard') ||
    path === '/api/simulate' ||
    path.startsWith('/api/predict/') ||
    path === '/api/autopilot/should-publish'
  ) {
    let wBody = req.body;
    if (wBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        wBody = raw ? JSON.parse(raw) : {};
      } catch {
        wBody = {};
      }
    }
    try {
      if (await handleWorkspace(req, res, path, m, wBody || {}, url.searchParams)) return;
    } catch (err) {
      return json(res, 500, { error: 'workspace-handler', message: String(err) });
    }
  }

  // ── Siamese Bridge: conexión con feedia-next ─────────────────────────
  if (path.startsWith('/api/bridge/') || path.startsWith('/api/twin/')) {
    let bBody = req.body;
    if (bBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        bBody = raw ? JSON.parse(raw) : {};
      } catch {
        bBody = {};
      }
    }
    try {
      if (await handleBridge(req, res, path, m, bBody || {}, url.searchParams)) return;
    } catch (err) {
      return json(res, 500, { error: 'bridge-handler', message: String(err) });
    }
  }

  // ── Auth de usuarios (register/login/logout/me/connections) ────────────
  // ⚠️ Va ANTES del OAuth de redes y del catch-all demo, porque captura
  // /api/auth/{register,login,logout,me,connections,disconnect}.
  if (
    path === '/api/auth/register' ||
    path === '/api/auth/login' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/me' ||
    path === '/api/auth/connections' ||
    path === '/api/auth/disconnect'
  ) {
    // Rate-limit por IP: defensa brute-force
    if (path === '/api/auth/login' && m === 'POST') {
      if (!(await rateLimit(req, res, `login:${ipOf(req)}`, LIMITS.login.limit, LIMITS.login.window))) return;
    }
    if (path === '/api/auth/register' && m === 'POST') {
      if (!(await rateLimit(req, res, `register:${ipOf(req)}`, LIMITS.register.limit, LIMITS.register.window))) return;
    }
    let uBody = req.body;
    if (uBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        uBody = raw ? JSON.parse(raw) : {};
      } catch {
        uBody = {};
      }
    }
    // On /api/auth/me: record active day + check comeback/streaks async
    if (path === '/api/auth/me' && m === 'GET') {
      getSessionFromReq(req).then(ctx => {
        if (!ctx?.user?.id) return;
        import('./_achievements.js').then(a =>
          a.onUserLogin(ctx.user.id, ctx.user.lastActiveAt)
        ).catch(() => {});
      }).catch(() => {});
    }
    try {
      if (await handleUsers(req, res, path, m, uBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'users-handler', message: String(err) });
    }
  }

  // ── Admin — solo owner puede usar estos endpoints ──────────────────────────
  if (path.startsWith('/api/admin/')) {
    const { getSessionFromReq } = await import('./_users.js');
    const adminCtx = await getSessionFromReq(req);
    if (!adminCtx || adminCtx.user?.role !== 'owner')
      return json(res, 403, { error: 'Solo el owner puede usar endpoints /api/admin/' });
    let aBody = req.body;
    if (aBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        aBody = raw ? JSON.parse(raw) : {};
      } catch {
        aBody = {};
      }
    }
    // POST /api/admin/grant { email, plan, note? } — asigna plan a un mail
    if (path === '/api/admin/grant' && m === 'POST') {
      const { email, plan, note } = aBody || {};
      if (!email || !plan) return json(res, 400, { error: 'email y plan requeridos' });
      const validPlans = ['free', 'pro', 'premium', 'owner', 'promo', 'partner'];
      if (!validPlans.includes(plan)) return json(res, 400, { error: `plan debe ser: ${validPlans.join(', ')}` });
      const { default: st } = await import('./_store.js').catch(() => ({ default: null }));
      const storeM = await import('./_store.js');
      const userId = await storeM.get(`feedia:user:byEmail:${email.toLowerCase()}`);
      if (!userId) return json(res, 404, { error: 'Usuario no encontrado — debe registrarse primero' });
      const user = await storeM.get(`feedia:user:${userId}`);
      if (!user) return json(res, 404, { error: 'Usuario no encontrado en store' });
      await storeM.set(`feedia:user:${userId}`, {
        ...user,
        plan,
        grantedBy: 'owner',
        grantedAt: new Date().toISOString(),
        grantNote: note || '',
      });
      return json(res, 200, {
        ok: true,
        email: email.toLowerCase(),
        plan,
        note: note || '',
        grantedAt: new Date().toISOString(),
      });
    }
    // GET /api/admin/users — lista usuarios registrados
    if (path === '/api/admin/users' && m === 'GET') {
      const storeM = await import('./_store.js');
      const grants = (await storeM.get('feedia:admin:grants')) || [];
      return json(res, 200, { ok: true, grants, note: 'Lista completa requiere KV scan — próximamente.' });
    }
    // GET /api/admin/stats — métricas 24h (hits, errores, rate)
    if (path === '/api/admin/stats' && m === 'GET') {
      const stats = await getStats();
      return json(res, 200, { ok: true, stats, generatedAt: new Date().toISOString() });
    }
    // GET /api/admin/logs?limit=100 — últimos errores
    if (path === '/api/admin/logs' && m === 'GET') {
      const limit = Math.min(Number(url.searchParams.get('limit') || 100), 500);
      const errors = await getErrors(limit);
      return json(res, 200, { ok: true, errors, count: errors.length });
    }
    // GET /api/admin/monitoring — dashboard de monitoreo (owner/admin only)
    if (path === '/api/admin/monitoring' && m === 'GET') {
      const dashboard = await getMonitoringDashboard();
      return json(res, 200, dashboard);
    }
    // GET /api/admin/health/deep — checks de KV + LLM + cron
    if (path === '/api/admin/health/deep' && m === 'GET') {
      const t0 = Date.now();
      let kvOk = false;
      try {
        await store.set('feedia:hc:ping', t0);
        const r = await store.get('feedia:hc:ping');
        kvOk = r === t0;
      } catch {
        kvOk = false;
      }
      const kvLatency = Date.now() - t0;
      return json(res, 200, {
        ok: true,
        kv: { ok: kvOk, latencyMs: kvLatency, mode: store.STORE_REAL ? 'upstash' : 'memory' },
        llm: {
          configured: HAS_LLM,
          providers: {
            groq: !!process.env.GROQ_API_KEY,
            anthropic: !!process.env.ANTHROPIC_API_KEY,
            gemini: !!process.env.GEMINI_API_KEY,
            openai: !!process.env.OPENAI_API_KEY,
          },
        },
        version: APP_VERSION,
      });
    }
    // POST /api/admin/revoke { email } — revoca grant, vuelve a free
    if (path === '/api/admin/revoke' && m === 'POST') {
      const { email } = aBody || {};
      if (!email) return json(res, 400, { error: 'email requerido' });
      const storeM = await import('./_store.js');
      const userId = await storeM.get(`feedia:user:byEmail:${email.toLowerCase()}`);
      if (!userId) return json(res, 404, { error: 'Usuario no encontrado' });
      const user = await storeM.get(`feedia:user:${userId}`);
      if (!user) return json(res, 404, { error: 'Usuario no encontrado en store' });
      await storeM.set(`feedia:user:${userId}`, {
        ...user,
        plan: 'free',
        grantedBy: null,
        grantedAt: null,
        grantNote: null,
      });
      return json(res, 200, { ok: true, email: email.toLowerCase(), plan: 'free' });
    }
    // GET /api/admin/releases — listar feature flags (control de versiones)
    if (path === '/api/admin/releases' && m === 'GET') {
      const flags = await featureFlags.listFlags();
      return json(res, 200, { ok: true, flags, version: APP_VERSION });
    }
    // POST /api/admin/releases { key, enabled?, allowed_plans?, rollout_percent?, description? }
    if (path === '/api/admin/releases' && m === 'POST') {
      const { key, enabled, allowed_plans, rollout_percent, description } = aBody || {};
      if (!key) return json(res, 400, { error: 'key requerido' });
      const existing = await featureFlags.getFlag(key);
      const payload = {};
      if (typeof enabled === 'boolean') payload.enabled = enabled;
      if (Array.isArray(allowed_plans)) payload.allowed_plans = allowed_plans;
      if (typeof rollout_percent === 'number') payload.rollout_percent = Math.max(0, Math.min(100, rollout_percent));
      if (typeof description === 'string') payload.description = description;
      let flag;
      if (existing) {
        flag = await featureFlags.setFlag(key, payload);
      } else {
        flag = await featureFlags.createFlag({
          key,
          enabled: typeof enabled === 'boolean' ? enabled : false,
          allowed_plans: Array.isArray(allowed_plans) ? allowed_plans : [],
          rollout_percent: typeof rollout_percent === 'number' ? Math.max(0, Math.min(100, rollout_percent)) : 0,
          description: description || '',
        });
      }
      return json(res, 200, { ok: true, flag });
    }
    return json(res, 404, { error: 'Admin endpoint no encontrado' });
  }

  // ── Settings connections (UI llama /api/settings/*, delegamos a /api/auth/*) ──
  if (path.startsWith('/api/settings/')) {
    let sBody = req.body;
    if (sBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        sBody = raw ? JSON.parse(raw) : {};
      } catch {
        sBody = {};
      }
    }
    if (path === '/api/settings/connect' && m === 'POST') {
      const svcMap = { instagram: '/api/auth/instagram/login', tiktok: '/api/auth/tiktok/login' };
      const svc = sBody?.service;
      if (!svcMap[svc]) return ok(res, NOT_REAL(path));
      const baseUrl = process.env.PUBLIC_BASE_URL || 'https://feedia.vercel.app';
      return ok(res, { authUrl: `${baseUrl}${svcMap[svc]}` });
    }
    if (path === '/api/settings/connections' && m === 'GET') {
      try {
        if (await handleAuth(req, res, '/api/auth/connections', 'GET', {}, url.searchParams)) return;
      } catch {
        /* fallback */
      }
      return ok(res, {});
    }
    if (path === '/api/settings/disconnect' && m === 'POST') {
      try {
        if (await handleAuth(req, res, '/api/auth/disconnect', 'POST', sBody, url.searchParams)) return;
      } catch {
        /* fallback */
      }
      return ok(res, { ok: true, demoMode: true });
    }
    if (path === '/api/settings/automations') {
      const ctx2 = await getSessionFromReq(req);
      if (!ctx2) return json(res, 401, { error: 'no session' });
      if (m === 'POST') {
        let sBody2 = req.body;
        if (sBody2 === undefined) {
          try {
            const ch = [];
            for await (const c of req) ch.push(c);
            sBody2 = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
          } catch {
            sBody2 = {};
          }
        }
        await store.set(`feedia:settings:${ctx2.user.id}:automations`, sBody2);
        return ok(res, { ok: true });
      }
      const saved = await store.get(`feedia:settings:${ctx2.user.id}:automations`);
      return ok(res, saved || { automations: [] });
    }
    if (path === '/api/settings/automations/toggle' && m === 'POST') {
      const ctx2 = await getSessionFromReq(req);
      if (!ctx2) return json(res, 401, { error: 'no session' });
      let tBody = req.body;
      if (tBody === undefined) {
        try {
          const ch = [];
          for await (const c of req) ch.push(c);
          tBody = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
        } catch {
          tBody = {};
        }
      }
      const saved = (await store.get(`feedia:settings:${ctx2.user.id}:automations`)) || { automations: [] };
      saved.automations = (saved.automations || []).map((a) => (a.id === tBody?.id ? { ...a, active: !a.active } : a));
      await store.set(`feedia:settings:${ctx2.user.id}:automations`, saved);
      return ok(res, { ok: true });
    }
    if (path === '/api/settings/schedule') {
      const ctx2 = await getSessionFromReq(req);
      if (!ctx2) return ok(res, { ok: true });
      if (m === 'POST') {
        let schBody = req.body;
        if (schBody === undefined) {
          try {
            const ch = [];
            for await (const c of req) ch.push(c);
            schBody = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
          } catch {
            schBody = {};
          }
        }
        await store.set(`feedia:settings:${ctx2.user.id}:schedule`, schBody);
        return ok(res, { ok: true });
      }
      const sch = await store.get(`feedia:settings:${ctx2.user.id}:schedule`);
      return ok(res, sch || { ok: true });
    }
    if (path === '/api/settings/notifications') return ok(res, { ok: true });
  }
  // ── OAuth de redes (Instagram + TikTok Login Kit) ──────────────────────
  if (path.startsWith('/api/auth/')) {
    try {
      if (await handleAuth(req, res, path, m, {}, url.searchParams)) return;
    } catch (err) {
      return json(res, 500, { error: 'auth-handler', message: String(err) });
    }
  }

  // ── Loop de crecimiento P0: insights / plan / schedule / cron / status ──
  if (
    path.startsWith('/api/insights') ||
    path.startsWith('/api/growth') ||
    path.startsWith('/api/schedule') ||
    path.startsWith('/api/cron') ||
    path.startsWith('/api/agenda') ||
    path === '/api/system/p0-status'
  ) {
    let gBody = req.body;
    if (gBody === undefined && (m === 'POST' || m === 'PUT')) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        gBody = raw ? JSON.parse(raw) : {};
      } catch {
        gBody = {};
      }
    }
    try {
      if (await handleGrowth(req, res, path, m, gBody || {}, url.searchParams)) return;
    } catch (err) {
      return json(res, 500, { error: 'growth-handler', message: String(err) });
    }
  }

  // ── Perfil de cuenta por red (feed header) — REAL si hay tokens, demo si no ──
  if (path === '/api/tiktok/profile') return ok(res, await ttProfile(req));
  if (path === '/api/instagram/profile') return ok(res, await igProfile(req));

  // ── Detectar sesión para distinguir visitante demo vs usuario autenticado ──
  // Usuario autenticado SIN datos reales → estado fresco (no demo).
  const ctxSession = await getSessionFromReq(req).catch(() => null);
  const authedUser = ctxSession?.user || null;
  const freshEmpty = (extra) => ({ ...(extra || {}), accountFresh: true, demoMode: false });

  // ── Identidad / branding / sistema ──────────────────────────────────────
  if (path === '/api/brand') {
    if (authedUser) return ok(res, { name: authedUser.displayName, niche: '', accountFresh: true });
    return ok(res, d.DEMO_BRAND);
  }
  if (path === '/api/home/identity') {
    if (authedUser) return ok(res, freshEmpty({ displayName: authedUser.displayName, niche: '', connected: false }));
    return ok(res, d.DEMO_IDENTITY);
  }
  if (path === '/api/home/dashboard') {
    if (authedUser)
      return ok(
        res,
        freshEmpty({
          mascotEmoji: '✨',
          themeColors: { primary: '#3FB8C9', secondary: '#E85A2C' },
          timeBasedMessage: 'Conectá tu Instagram o TikTok para empezar.',
          delightMessage: 'Tu cuenta está vacía — conectá una red para que el equipo de IA empiece a trabajar.',
          todayActions: [
            'Conectá tu cuenta de Instagram (banner arriba)',
            'Conectá tu TikTok (banner arriba)',
            'Definí tu nicho y voz de marca',
          ],
          suggestionsForNow: [],
          upcomingMilestone: null,
          activeCelebrations: [],
          unacknowledgedAchievements: [],
          activeGoals: [],
          privateMessage: '',
          recentMemory: null,
        }),
      );
    return ok(res, d.DEMO_DASHBOARD);
  }
  if (path === '/api/home/kpis') {
    const period = Number(url.searchParams.get('period') ?? 30);
    if (!authedUser) return ok(res, d.DEMO_KPIS(period));
    // Try real IG data with 2h KV cache
    const cacheKey = `feedia:home-kpis:${authedUser.id}`;
    try {
      const cached = await store.get(cacheKey);
      if (cached && Date.now() - (cached._ts || 0) < 7200000) return ok(res, cached);
      const connected = await igConnected(req);
      if (connected) {
        const [profile, insights] = await Promise.all([igProfile(req), igInsights(req)]);
        const engRate = profile.followers
          ? parseFloat((((insights.accounts_engaged ?? 0) / profile.followers) * 100).toFixed(2))
          : 0;
        const kpis = {
          connected: true,
          real: true,
          followers: profile.followers ?? 0,
          reach: insights.reach ?? 0,
          impressions: insights.impressions ?? 0,
          engagement: engRate,
          posts: profile.posts ?? 0,
          _ts: Date.now(),
          period,
        };
        await store.set(cacheKey, kpis);
        return ok(res, kpis);
      }
    } catch {
      /* fallback to zeros */
    }
    return ok(
      res,
      freshEmpty({
        followers: { value: 0, label: 'Seguidores', hint: 'Conectá Instagram para ver', delta: 0, period },
        reach: { value: 0, label: 'Alcance', hint: 'Conectá para sincronizar', delta: 0, period },
        engagement: { value: 0, label: 'Engagement', hint: 'Sin datos aún', delta: 0, period },
        velocity: { value: 0, label: 'Velocidad', hint: 'Sin baseline', delta: 0, period },
      }),
    );
  }
  if (path === '/api/system/ai-status') return ok(res, d.buildAiStatus());

  // ── Experience / concierge / sala ejecutiva ─────────────────────────────
  if (path === '/api/experience/welcome') {
    if (authedUser)
      return ok(
        res,
        freshEmpty({
          saludo: `Bienvenido, ${authedUser.displayName}`,
          marca: authedUser.displayName,
          primeraVez: !authedUser.connectedPlatforms?.length,
          visita: 1,
          tier: 'Bronce',
          equipoActivo: 10,
          desdeUltimaVisita: { horas: 0, misiones: 0, carruseles: 0, sesionesPantalla: 0, decisiones: 0 },
          proximaIndicacion: 'Conectá tu IG o TikTok para activar el equipo.',
        }),
      );
    return ok(res, d.DEMO_WELCOME);
  }
  if (path === '/api/experience/activity') {
    if (authedUser) return ok(res, []);
    return ok(res, d.DEMO_ACTIVITY);
  }
  if (path === '/api/experience/brief') {
    if (authedUser)
      return ok(
        res,
        freshEmpty({
          tier: 'Bronce',
          tierProgresoPct: 0,
          saludo: `Tu Sala Ejecutiva, ${authedUser.displayName}`,
          narrativa: 'Cuenta nueva. Conectá IG/TikTok para activar métricas y propuestas reales.',
          leverage: {
            ratioLabel: '0×',
            accionesEjecutadas: 0,
            indicacionesDadas: 0,
            costoEquipoUsdMes: 0,
            ahorroAnualUsd: 0,
            horasHumanasAhorradas: 0,
          },
          staff: [{ rol: 'Equipo en espera', estado: 'esperando conexión de redes' }],
          hitos: [],
        }),
      );
    return ok(res, d.DEMO_BRIEF);
  }
  if (path === '/api/intelligence') {
    if (authedUser)
      return ok(
        res,
        freshEmpty({
          budget: {
            spentUsd: 0,
            capUsd: 5,
            usedPct: 0,
            breaker: 'closed',
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            byModel: {},
          },
          cache: { hitRatePct: 0, entries: 0, hits: 0, misses: 0, topReused: [] },
          bandits: [],
          digest: {
            resumenEjecutivo: 'Cuenta nueva. Sin actividad aún.',
            data: {
              intel: {
                misiones: { ok: 0, parciales: 0, fallidas: 0, total: 0 },
                trazas: { tasaExito: 0, total: 0, conOutcome: 0 },
                carruseles: { publicados: 0, retenidos: 0, total: 0 },
                presupuesto: { gastadoUsd: 0, topeUsd: 5, usadoPct: 0, breaker: 'closed' },
                riesgos: [],
              },
            },
            cosasQueRequierenAtencion: [],
          },
        }),
      );
    return ok(res, d.DEMO_INTELLIGENCE);
  }

  // ── Autopilot "Activado" ────────────────────────────────────────────────
  if (path === '/api/autopilot/activated') {
    if (m === 'GET') return ok(res, d.DEMO_AUTOPILOT);
    if (m === 'POST')
      return ok(res, {
        ...d.DEMO_AUTOPILOT,
        demoMode: true,
        note: 'En la demo de Vercel el estado no persiste entre invocaciones.',
      });
  }

  // ── Swarm / operaciones ─────────────────────────────────────────────────
  if (path === '/api/swarm/operations') return ok(res, d.DEMO_OPERATIONS);
  if (path === '/api/swarm/missions') return ok(res, []);

  // ── Computer Use mode — persiste en KV para que el toggle funcione ───────
  if (path === '/api/cu/mode') {
    if (m === 'GET') {
      let cuMode = null;
      try {
        const st = await import('./_store.js');
        cuMode = await st.get('feedia:cu:mode');
      } catch {
        /* ignore */
      }
      const mode = cuMode?.mode ?? 'off';
      return ok(res, {
        mode,
        state: {
          mode,
          changedAt: cuMode?.changedAt ?? new Date().toISOString(),
          changedBy: cuMode?.changedBy ?? 'demo',
          reason: cuMode?.reason ?? 'modo demo',
        },
        stats: {},
      });
    }
    if (m === 'PUT') {
      let cuBody = req.body;
      if (cuBody === undefined) {
        try {
          const chunks = [];
          for await (const c of req) chunks.push(c);
          const raw = Buffer.concat(chunks).toString('utf-8');
          cuBody = raw ? JSON.parse(raw) : {};
        } catch {
          cuBody = {};
        }
      }
      const newMode = ['off', 'auto', 'supervised'].includes(cuBody?.mode) ? cuBody.mode : 'off';
      const newState = {
        mode: newMode,
        changedAt: new Date().toISOString(),
        changedBy: cuBody?.changedBy ?? 'user',
        reason: cuBody?.reason ?? '',
      };
      try {
        const st = await import('./_store.js');
        await st.set('feedia:cu:mode', newState);
      } catch {
        /* ignore */
      }
      return ok(res, { ...newState, stats: {} });
    }
  }
  if (path === '/api/cu/mode/pending-approvals') return ok(res, []);
  if (path === '/api/cu/desktop-status')
    return ok(res, { dryRun: true, capabilitiesAvailable: { computerUse: false }, demoMode: true });
  if (path === '/api/cu/voice/config') return ok(res, { enabled: false, demoMode: true });
  if (path === '/api/cu/replay-stats') return ok(res, { byOutcome: {}, demoMode: true });

  // ── Kanban / Tablero de contenido ──────────────────────────────────────
  if (path === '/api/kanban') {
    const kCtx = await getSessionFromReq(req);
    if (!kCtx) return ok(res, d.DEMO_KANBAN);
    if (m === 'POST') {
      let kBody = req.body;
      if (kBody === undefined) {
        try {
          const ch = [];
          for await (const c of req) ch.push(c);
          kBody = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
        } catch {
          kBody = {};
        }
      }
      await store.set(`feedia:kanban:${kCtx.user.id}`, kBody);
      return ok(res, { ok: true });
    }
    const board = await store.get(`feedia:kanban:${kCtx.user.id}`);
    return ok(res, board || d.DEMO_KANBAN);
  }
  if (path.startsWith('/api/kanban/') && (m === 'PATCH' || m === 'POST')) {
    const kCtx = await getSessionFromReq(req);
    if (!kCtx) return ok(res, { ok: true, demoMode: true });
    let kBody = req.body;
    if (kBody === undefined) {
      try {
        const ch = [];
        for await (const c of req) ch.push(c);
        kBody = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
      } catch {
        kBody = {};
      }
    }
    const board = (await store.get(`feedia:kanban:${kCtx.user.id}`)) || d.DEMO_KANBAN;
    // Move card: body = { cardId, toColumn }
    if (kBody?.cardId && kBody?.toColumn) {
      for (const col of board.columns || []) {
        const idx = (col.cards || []).findIndex((c) => c.id === kBody.cardId);
        if (idx !== -1) {
          const [card] = col.cards.splice(idx, 1);
          const target = board.columns.find((c) => c.id === kBody.toColumn);
          if (target) {
            target.cards = target.cards || [];
            target.cards.push(card);
          }
          break;
        }
      }
      await store.set(`feedia:kanban:${kCtx.user.id}`, board);
    }
    return ok(res, { ok: true });
  }

  // ── Approvals / Aprobaciones pendientes ────────────────────────────────
  if (path === '/api/approvals') return ok(res, d.DEMO_APPROVALS);
  if (path.startsWith('/api/approvals/') && m === 'POST')
    return ok(res, { ok: true, demoMode: true, note: 'Aprobación registrada en demo (no persiste).' });

  // ── Canva ───────────────────────────────────────────────────────────────
  if (path === '/api/canva/users') return ok(res, d.DEMO_CANVA_USERS);
  if (path === '/api/canva/health') {
    return ok(res, {
      connected: false,
      tokens: 0,
      apiReachable: false,
      reason: 'no_oauth_in_demo',
      message: 'En la demo no hay OAuth de Canva. Para conectar Canva real, deployá el backend completo.',
    });
  }

  // ── Canva Brain — cerebro multi-agente especializado ───────────────────
  if (path === '/api/cu/canva/brain/agents') return ok(res, { agents: d.DEMO_CANVA_BRAIN_AGENTS });
  if (path === '/api/cu/canva/brain' && m === 'POST') return ok(res, d.DEMO_CANVA_BRAIN_JOB);
  if (path.startsWith('/api/cu/canva/brain/') && m === 'POST')
    return ok(res, {
      ok: true,
      demoMode: true,
      note: 'En el backend real, Luca abre Canva y ejecuta el diseño completo.',
    });

  // ── Brand profiles (multi-tenant) y Modo Cliente ───────────────────────
  if (path === '/api/brand-profiles') return ok(res, d.DEMO_BRAND_PROFILES);
  if (path === '/api/brand-profiles/activate' && m === 'POST')
    return ok(res, {
      ok: true,
      demoMode: true,
      brand: { name: 'Marca Demo' },
      note: 'Cambio aceptado en demo (no persiste).',
    });
  if (path.startsWith('/api/brand-profiles/') && path.endsWith('/preview'))
    return ok(res, {
      name: 'Marca Demo',
      niche: 'Productividad para creators',
      impacto: { directivasActivas: 8, aprobacionesPendientes: 3, pizarras: 1 },
      aviso: 'Demo: el cambio no persiste entre invocaciones.',
    });
  if (path === '/api/client-view') return ok(res, d.DEMO_CLIENT_VIEW);

  // ── Branding Brain — cerebro de marca multi-agente ─────────────────────
  if (path === '/api/branding/brain/agents') return ok(res, { agents: d.DEMO_BRANDING_BRAIN_AGENTS });
  if (path === '/api/branding/brain' && m === 'POST') {
    const brCtx = await getSessionFromReq(req);
    const brKey = brCtx?.user?.id ? `branding:${brCtx.user.id}` : `branding:${ipOf(req)}`;
    if (!(await rateLimit(req, res, brKey, LIMITS.branding.limit, LIMITS.branding.window, { user: brCtx?.user })))
      return;
    let bBody = req.body;
    if (bBody === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        bBody = raw ? JSON.parse(raw) : {};
      } catch {
        bBody = {};
      }
    }
    if (!HAS_LLM) return ok(res, d.DEMO_BRANDING_BRAIN_JOB);
    const topic = bBody?.topic || bBody?.userInput || 'marca sin tema';
    const brand = bBody?.brand || {};
    const result = await askLLMJson(
      `Eres un equipo de 8 especialistas de marca (estratega, art director, copywriter, diseñador, social media, publicista, artista visual, analista). Analiza el objetivo: "${topic}". Contexto: ${JSON.stringify(brand)}.
       Devuelve SOLO JSON válido: { "summary": "string", "brandVoice": {"tone":[],"forbidden":[],"style":"string"}, "visualIdentity": {"palette":[],"typography":"string","style":"string"}, "contentStrategy": {"pillars":[],"formats":[],"frequency":"string"}, "audienceProfile": {"age":"string","interests":[],"pains":[],"desires":[]}, "differentiators": [], "recommendations": [{"id":"r1","title":"string","description":"string","priority":"high"}], "innovationScore": 85, "brandCoherenceScore": 88 }`,
      {},
      { temperature: 0.7 },
    );
    return ok(res, {
      ok: true,
      jobId: `brain-${Date.now()}`,
      status: 'done',
      result: result || {},
      steps: [{ phase: 'Análisis de marca', output: 'Completado con 8 agentes', durationMs: 600 }],
      totalDurationMs: 600,
      brainsUsed: ['brand-strategist', 'art-director', 'copywriter', 'social-media', 'publicist'],
    });
  }
  if (path.startsWith('/api/branding/brain/') && m === 'POST')
    return ok(res, { ok: true, demoMode: !HAS_LLM, note: 'Agente de marca procesando.' });

  // ── Master Brain — orquestador unificado ───────────────────────────────
  if (path === '/api/cu/master/brains') return ok(res, { brains: d.DEMO_MASTER_BRAIN_BRAINS });
  if (path === '/api/cu/master' && m === 'POST') {
    const cmCtx = await getSessionFromReq(req);
    const cmKey = cmCtx?.user?.id ? `cu:${cmCtx.user.id}` : `cu:${ipOf(req)}`;
    if (!(await rateLimit(req, res, cmKey, LIMITS.cu.limit, LIMITS.cu.window, { user: cmCtx?.user }))) return;
    let mBody = req.body;
    if (mBody === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        mBody = raw ? JSON.parse(raw) : {};
      } catch {
        mBody = {};
      }
    }
    if (!HAS_LLM) return accepted(res, d.DEMO_MASTER_BRAIN_JOB);
    const userInput = mBody?.userInput || mBody?.topic || 'estrategia de contenido';
    const contentFormat = mBody?.contentFormat || 'carrusel';
    const result = await askLLMJson(
      `Eres el Master Brain de FeedIA, orquestador de agentes IA especializados en redes sociales. Objetivo del usuario: "${userInput}". Formato objetivo: ${contentFormat}.
       Devuelve SOLO JSON: { "brainsActivated": ["branding-brain","agents-viral","algorithm-specialist"], "steps": [{"brainId":"string","brainLabel":"string","emoji":"string","phase":"string","thinking":"string","output":"string","durationMs":300,"contributesTo":"string"}], "finalOutput": {"summary":"string","deliverables":[{"kind":"content","label":"string","payload":"string"}],"nextActions":[{"label":"string","route":"studio-carousel"}]}, "innovationScore": 88, "influencerScore": 85, "brandCoherenceScore": 90, "approvalRequired": false }`,
      {},
      { temperature: 0.7 },
    );
    return accepted(res, {
      ok: true,
      jobId: `master-${Date.now()}`,
      status: 'done',
      ...(result || d.DEMO_MASTER_BRAIN_JOB),
      totalDurationMs: 900,
    });
  }
  if (path.startsWith('/api/cu/master/') && m === 'POST')
    return ok(res, { ok: true, demoMode: !HAS_LLM, note: 'Master Brain procesando.' });

  // ── CU Executor — workflow runs con state machine (requiere KV) ─────────
  if (path.startsWith('/api/cu/run') || path === '/api/cu/runs' || path === '/api/cu/bundle') {
    let cuRunBody = req.body;
    if (cuRunBody === undefined && m === 'POST') {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        cuRunBody = raw ? JSON.parse(raw) : {};
      } catch {
        cuRunBody = {};
      }
    }
    try {
      if (await handleCuExecutor(req, res, path, m, cuRunBody || {})) return;
    } catch (err) {
      return json(res, 500, { error: 'cu-executor', message: String(err) });
    }
  }

  // ── CU Agent — planeador LLM para modo auto/supervised ──────────────────
  if (path === '/api/cu/agent' && m === 'POST') {
    const caCtx = await getSessionFromReq(req);
    const caKey = caCtx?.user?.id ? `cu:${caCtx.user.id}` : `cu:${ipOf(req)}`;
    if (!(await rateLimit(req, res, caKey, LIMITS.cu.limit, LIMITS.cu.window, { user: caCtx?.user }))) return;
    let aBody = req.body;
    if (aBody === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        aBody = raw ? JSON.parse(raw) : {};
      } catch {
        aBody = {};
      }
    }
    if (!HAS_LLM)
      return ok(res, {
        ok: false,
        plan: [],
        note: 'Configurá GROQ_API_KEY (gratuita) para activar el agente CU. Ver console.groq.com.',
      });
    const instruction = aBody?.instruction || aBody?.userInput || '';
    const platform = aBody?.platform || 'instagram';
    const plan = await askLLMJson(
      `Eres un agente de Computer Use para redes sociales. Recibís una instrucción y generás un plan de pasos específicos y ejecutables. Instrucción: "${instruction}". Plataforma objetivo: ${platform}. Contexto: ${JSON.stringify(aBody?.context || {})}.
       Devuelve SOLO JSON: { "steps": [{ "n": 1, "action": "string", "target": "string", "detail": "string", "icon": "emoji", "apiCall": "string|null", "automated": true|false }], "summary": "string", "estimatedMinutes": 5, "canAutomate": true|false }
       Donde apiCall es el endpoint FeedIA a llamar si la acción se puede automatizar (ej: "/api/publish" para publicar).`,
      {},
      { temperature: 0.3 },
    );
    return ok(res, {
      ok: true,
      plan: plan?.steps || [],
      summary: plan?.summary || '',
      estimatedMinutes: plan?.estimatedMinutes || 5,
      canAutomate: plan?.canAutomate ?? false,
    });
  }

  // ── Publicar — endpoint unificado Instagram/TikTok ──────────────────────
  if (path === '/api/publish' && m === 'POST') {
    let pBody = req.body;
    if (pBody === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        pBody = raw ? JSON.parse(raw) : {};
      } catch {
        pBody = {};
      }
    }
    const { platform, type, imageUrl, imageUrls, videoUrl, caption } = pBody || {};
    if (platform === 'instagram') {
      const { igPublishImage, igPublishReel, igPublishCarousel } = await import('./_social.js');
      let result;
      if (type === 'reel') result = await igPublishReel(videoUrl, caption || '', req);
      else if (type === 'carousel') result = await igPublishCarousel(imageUrls || [imageUrl], caption || '', req);
      else result = await igPublishImage(imageUrl, caption || '', req);
      // Fire achievement trigger async (never blocks response)
      if (result?.ok !== false) {
        getSessionFromReq(req).then(ctx => {
          if (!ctx?.user?.id) return;
          const now = new Date();
          const afterMidnight = now.getHours() < 5;
          const isFriday13 = now.getDay() === 5 && now.getDate() === 13;
          import('./_achievements.js').then(a =>
            a.onPostPublished(ctx.user.id, { afterMidnight, friday13: isFriday13 })
          ).catch(() => {});
        }).catch(() => {});
      }
      return ok(res, result);
    }
    if (platform === 'tiktok') {
      return ok(res, {
        ok: false,
        note: 'TikTok publish requiere scope video.upload en la app TikTok Developer. Documentación: https://developers.tiktok.com/doc/content-posting-api-get-started',
        platform: 'tiktok',
      });
    }
    return ok(res, { ok: false, error: 'platform requerido: instagram | tiktok' });
  }

  // ── Carrusel Studio (genera contenido demo branded) ─────────────────────
  if (path === '/api/studio/carrusel' && m === 'POST') {
    const scCtx = await getSessionFromReq(req);
    const scKey = scCtx?.user?.id ? `studio:${scCtx.user.id}` : `studio:${ipOf(req)}`;
    if (!(await rateLimit(req, res, scKey, LIMITS.studio.limit, LIMITS.studio.window, { user: scCtx?.user }))) return;
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const { idea = '', longitud = 'medio', extraInstructions } = body || {};
    if (HAS_LLM && idea.length >= 3) {
      const slideCount = longitud === 'corto' ? 5 : longitud === 'largo' ? 9 : 7;
      const carruselSystem = `Sos un content strategist especialista en carruseles de Instagram. Generás slides con narrativa (gancho→desarrollo→climax→cta), voz de marca y máximo impacto. Respondés en español rioplatense.`;
      const carruselPrompt = `Generá un carrusel de Instagram de ${slideCount} slides para: "${idea}".${extraInstructions ? ` Indicaciones: ${extraInstructions}` : ''}

JSON:
{
  "slides": [
    { "numero": 1, "titulo": "string (máx 8 palabras, impacto)", "cuerpo": "string (2-3 oraciones de valor)", "rolEnNarrativa": "gancho|desarrollo|climax|cta|tension|resolucion", "direccionVisual": "string breve" }
  ],
  "caption": "string (listo para publicar, con CTA y emojis)",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"],
  "cta": "string (CTA concreto del último slide)",
  "formatoOptimo": "4:5",
  "notasDiseno": "string (instrucciones de diseño)"
}`;
      try {
        const carruselData = await askLLMJson(carruselPrompt, {
          system: carruselSystem,
          maxTokens: 1400,
          temperature: 0.65,
        });
        if (carruselData?.slides?.length) {
          const roleColors = {
            gancho: '#e1306c',
            desarrollo: '#6366f1',
            climax: '#a855f7',
            cta: '#10b981',
            tension: '#f59e0b',
            resolucion: '#22d3ee',
          };
          const total = carruselData.slides.length;
          const previews = carruselData.slides.map((s) => {
            const color = roleColors[s.rolEnNarrativa] || '#6366f1';
            const safe = (s.titulo || s.rolEnNarrativa || '').slice(0, 36).replace(/[<>&"]/g, '');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#0d0d12"/><rect width="400" height="5" fill="${color}"/><circle cx="200" cy="195" r="62" fill="${color}" fill-opacity="0.14"/><text x="200" y="210" text-anchor="middle" font-family="system-ui,sans-serif" font-size="44" font-weight="800" fill="${color}">${s.numero}</text><text x="200" y="278" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${color}">${(s.rolEnNarrativa || '').toUpperCase()}</text><text x="200" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#fff" opacity="0.8">${safe}</text><rect y="462" width="400" height="38" fill="${color}" opacity="0.8"/><text x="200" y="487" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">slide ${s.numero}/${total}</text></svg>`;
            return { dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` };
          });
          return ok(res, { carrusel: carruselData, previews });
        }
      } catch {
        /* fall through to demo */
      }
    }
    return ok(res, d.DEMO_CARRUSEL);
  }

  if (path === '/api/studio/stories' && m === 'POST') {
    const ssCtx = await getSessionFromReq(req);
    const ssKey = ssCtx?.user?.id ? `studio:${ssCtx.user.id}` : `studio:${ipOf(req)}`;
    if (!(await rateLimit(req, res, ssKey, LIMITS.studio.limit, LIMITS.studio.window, { user: ssCtx?.user }))) return;
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const { mensaje = '', objetivo = 'engagement', cantidadFrames = 5, extraInstructions } = body || {};
    if (HAS_LLM && mensaje.length >= 3) {
      const storiesSystem = `Sos un especialista en Instagram Stories. Creás secuencias de frames 9:16 con progresión narrativa, stickers de engagement y CTAs claros. Respondés en español rioplatense.`;
      const storiesPrompt = `Generá ${cantidadFrames} stories de Instagram para: "${mensaje}". Objetivo: ${objetivo}.${extraInstructions ? ` Indicaciones: ${extraInstructions}` : ''}

JSON (exactamente ${cantidadFrames} frames):
{
  "frames": [
    { "numero": 1, "tipo": "gancho|desarrollo|educacion|reveal|cta|comunidad", "textoPrincipal": "string (máx 6 palabras, impacto)", "textoSecundario": "string (1 oración de apoyo)", "sticker": "string|null (tipo de sticker interactivo)", "cta": "string|null (swipe-up o acción)", "fondoSugerido": "string (descripción del fondo/estética)" }
  ],
  "estrategia": "string (lógica de la secuencia completa)",
  "linkEnBio": "string|null",
  "horarioSugerido": "string (mejor momento para publicar)"
}`;
      try {
        const storiesData = await askLLMJson(storiesPrompt, {
          system: storiesSystem,
          maxTokens: 1000,
          temperature: 0.65,
        });
        if (storiesData?.frames?.length) {
          const storyColors = {
            gancho: '#e1306c',
            desarrollo: '#6366f1',
            cta: '#10b981',
            educacion: '#a855f7',
            reveal: '#22d3ee',
            comunidad: '#f59e0b',
          };
          const total = storiesData.frames.length;
          const previews = storiesData.frames.map((f) => {
            const color = storyColors[f.tipo] || '#a855f7';
            const safe = (f.textoPrincipal || f.tipo || '').slice(0, 32).replace(/[<>&"]/g, '');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="270" height="480" fill="#0d0d12"/><rect width="270" height="4" fill="${color}"/><circle cx="135" cy="175" r="52" fill="${color}" fill-opacity="0.14"/><text x="135" y="187" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="800" fill="${color}">${f.numero}</text><text x="135" y="253" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${color}">${(f.tipo || '').toUpperCase()}</text><text x="135" y="305" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.7">${safe}</text><rect y="442" width="270" height="38" fill="${color}" opacity="0.8"/><text x="135" y="466" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">frame ${f.numero}/${total}</text></svg>`;
            return { dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}` };
          });
          return ok(res, { stories: storiesData, previews });
        }
      } catch {
        /* fall through to demo */
      }
    }
    return ok(res, d.DEMO_STORIES);
  }

  if (path === '/api/studio/reel' && m === 'POST') {
    const srCtx = await getSessionFromReq(req);
    const srKey = srCtx?.user?.id ? `studio:${srCtx.user.id}` : `studio:${ipOf(req)}`;
    if (!(await rateLimit(req, res, srKey, LIMITS.studio.limit, LIMITS.studio.window, { user: srCtx?.user }))) return;
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const { tema = '', duracion = 30, estilo = 'broll', extraInstructions } = body || {};

    if (HAS_LLM && tema.length >= 3) {
      const beatCount = duracion <= 15 ? 4 : duracion <= 30 ? 6 : duracion <= 45 ? 8 : 10;
      const reelSystem = `Sos un director creativo especialista en TikTok y Reels 9:16. Generás guiones beat a beat virales en español rioplatense. Conocés hook 0-2s, completion rate, FYP algorithm, loop para rewatch, trending audio.`;
      const reelPrompt = `Generá un reel de ${duracion}s para: "${tema}". Estilo: ${estilo}.${extraInstructions ? ` Indicaciones: ${extraInstructions}` : ''}

JSON (exactamente ${beatCount} beats, español rioplatense):
{
  "hook": "primera frase gancho (máx 12 palabras, curiosidad/urgencia)",
  "caption": "caption completo listo para publicar (hook + cuerpo + CTA + hashtags)",
  "hashtags": ["#tag1","#tag2","#tag3","#tag4","#tag5","#tag6","#tag7","#tag8"],
  "audioSugerido": "nombre/tipo de audio tendencia específico",
  "estrategiaRetencion": "técnica específica de retención para este contenido",
  "beats": [
    { "numero": 1, "tipo": "hook|desarrollo|climax|cta|transicion", "duracionSegundos": 3, "vozEnOff": "texto narrador (pausa /)", "textoEnPantalla": "máx 8 palabras en pantalla", "bRoll": "descripción del visual de fondo", "transicion": "tipo de transición al siguiente" }
  ]
}`;
      try {
        const reelData = await askLLMJson(reelPrompt, { system: reelSystem, maxTokens: 1400, temperature: 0.65 });
        if (reelData?.beats?.length) {
          const colorMap = {
            hook: '#e1306c',
            desarrollo: '#7928ca',
            climax: '#a855f7',
            cta: '#10b981',
            transicion: '#3b82f6',
          };
          const previews = reelData.beats.map((b) => {
            const color = colorMap[b.tipo] || '#6366f1';
            const safe = (b.textoEnPantalla || b.tipo || '').slice(0, 30).replace(/[<>&"]/g, '');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="270" height="480" fill="#0d0d12"/><circle cx="135" cy="175" r="52" fill="${color}" fill-opacity="0.15"/><text x="135" y="185" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="800" fill="${color}">${b.numero}</text><text x="135" y="255" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${color}">${(b.tipo || '').toUpperCase()}</text><text x="135" y="305" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.7">${safe}</text><rect y="442" width="270" height="38" fill="${color}" opacity="0.8"/><text x="135" y="466" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">${b.duracionSegundos}s · ${b.tipo}</text></svg>`;
            return {
              dataUrl: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`,
              beat: b.numero,
              tipo: b.tipo,
            };
          });
          return ok(res, { reel: reelData, previews });
        }
      } catch {
        /* fall through to demo */
      }
    }
    return ok(res, d.DEMO_REEL);
  }

  // ── Voz / streaming / SSE — no se soportan en serverless ────────────────
  if (
    path.startsWith('/api/computer/stream') ||
    path.startsWith('/api/swarm/stream') ||
    path.startsWith('/api/whiteboard/collab')
  ) {
    return json(res, 501, {
      demoMode: true,
      error: 'sse_not_supported',
      hint: 'Server-Sent Events necesitan proceso largo (no Vercel serverless). Corré el backend completo.',
    });
  }

  // ── Command router — LLM-powered intent → multi-action dispatcher ──────
  if (path === '/api/command/route' && m === 'POST') {
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const text = (body?.text || '').trim();
    if (!text) return json(res, 400, { error: 'text requerido' });

    // Keyword-based deterministic fallback (no LLM needed, always fast)
    const t = text.toLowerCase();
    const QUICK_ROUTES = [
      {
        k: ['carrusel', 'carousel', 'slides', 'diapositiva'],
        reply: 'Voy a crear ese carrusel con IA.',
        intent: 'create_content',
        actions: [
          {
            label: 'Crear carrusel',
            icon: '🎨',
            kind: 'api',
            endpoint: '/api/carousel/run',
            method: 'POST',
            body: { topic: text, format: 'carrusel' },
          },
          { label: 'Ir al Studio', icon: '🖼️', kind: 'navigate', route: 'studio-carousel' },
        ],
      },
      {
        k: ['reel', 'reels', 'video', 'tiktok'],
        reply: 'Preparo el script del Reel.',
        intent: 'create_content',
        actions: [{ label: 'Studio Reels', icon: '🎬', kind: 'navigate', route: 'studio-reel' }],
      },
      {
        k: ['hashtag', 'hashtags', '#'],
        reply: 'Genero la estrategia de hashtags.',
        intent: 'analyze',
        actions: [
          {
            label: 'Generar hashtags',
            icon: '#️⃣',
            kind: 'api',
            endpoint: '/api/hashtags/strategy',
            method: 'POST',
            body: { topic: text, format: 'carrusel', hook: text },
          },
        ],
      },
      {
        k: ['competitor', 'competidor', 'competencia', 'rival'],
        reply: 'Analizo competidores del nicho.',
        intent: 'analyze',
        actions: [
          {
            label: 'Analizar competidores',
            icon: '🔍',
            kind: 'confirm',
            endpoint: '/api/competitors/analyze',
            method: 'POST',
            body: { handles: [] },
          },
        ],
      },
      {
        k: ['tendencia', 'trend', 'trending', 'viral'],
        reply: 'Detecto tendencias del nicho.',
        intent: 'analyze',
        actions: [
          {
            label: 'Detectar tendencias',
            icon: '📈',
            kind: 'api',
            endpoint: '/api/trends/detect',
            method: 'POST',
            body: {},
          },
        ],
      },
      {
        k: ['dm', 'mensaje', 'responder', 'inbox'],
        reply: 'Construyo plantillas de DM con IA.',
        intent: 'automate',
        actions: [
          {
            label: 'Construir DM templates',
            icon: '💬',
            kind: 'api',
            endpoint: '/api/dm/templates/build',
            method: 'POST',
            body: {},
          },
          { label: 'Ir al Inbox', icon: '📬', kind: 'navigate', route: 'inbox' },
        ],
      },
      {
        k: ['ab test', 'a/b', 'test', 'variante'],
        reply: 'Creo variantes A/B para el contenido.',
        intent: 'analyze',
        actions: [
          {
            label: 'Crear A/B Test',
            icon: '🧪',
            kind: 'api',
            endpoint: '/api/ab-tests',
            method: 'POST',
            body: { topic: text, contentType: 'carrusel', metric: 'engagement_rate', variantCount: 2 },
          },
        ],
      },
      {
        k: ['planific', 'calend', 'semana', 'programa', 'schedul'],
        reply: 'Programo contenido en horarios prime.',
        intent: 'schedule',
        actions: [
          {
            label: 'Programar cola',
            icon: '📅',
            kind: 'api',
            endpoint: '/api/queue/schedule',
            method: 'POST',
            body: {},
          },
          { label: 'Ver calendario', icon: '🗓️', kind: 'navigate', route: 'calendar' },
        ],
      },
      {
        k: ['misión', 'mision', 'mission', 'tomar control', 'full takeover'],
        reply: 'Lanzando misión autónoma.',
        intent: 'launch_mission',
        actions: [
          {
            label: 'Lanzar misión',
            icon: '🚀',
            kind: 'confirm',
            endpoint: '/api/missions/launch',
            method: 'POST',
            body: { freeIntent: text, runNow: true },
          },
        ],
      },
      {
        k: ['analytic', 'métrica', 'metrica', 'kpi', 'stats', 'estadística'],
        reply: 'Te llevo a Analytics.',
        intent: 'navigate',
        actions: [{ label: 'Ver Analytics', icon: '📊', kind: 'navigate', route: 'analytics' }],
      },
      {
        k: ['hook', 'gancho', 'apertura', 'caption'],
        reply: 'Abriendo el lab de hooks.',
        intent: 'navigate',
        actions: [{ label: 'Lab de Hooks', icon: '🎯', kind: 'navigate', route: 'hooks' }],
      },
      {
        k: ['crecimient', 'garant', 'seguidor', 'follower', 'audiencia'],
        reply: 'Te muestro las opciones de crecimiento garantizado.',
        intent: 'navigate',
        actions: [{ label: 'Ver Garantía de Crecimiento', icon: '📈', kind: 'navigate', route: 'growth' }],
      },
      {
        k: ['cereb', 'master', 'supervisor', 'takeover'],
        reply: 'Activando Cerebro Maestro en modo supervisor.',
        intent: 'launch_mission',
        actions: [
          {
            label: 'Full Takeover',
            icon: '🧠',
            kind: 'confirm',
            endpoint: '/api/cu/master',
            method: 'POST',
            body: {
              userInput: text,
              intent: 'full-takeover',
              mode: 'supervisor',
              contentFormat: 'carrusel',
              topic: 'contenido de marca',
            },
          },
        ],
      },
    ];

    const hit = QUICK_ROUTES.find((r) => r.k.some((k) => t.includes(k)));

    if (!HAS_LLM && hit) {
      const first = hit.actions[0];
      return ok(res, {
        reply: hit.reply,
        steps: ['Procesando tu pedido…', 'Ejecutando acción…'],
        intent: hit.intent,
        actions: hit.actions,
        // legacy compat for existing exec() code
        action: {
          label: first.label,
          kind: first.kind,
          route: first.route,
          endpoint: first.endpoint,
          method: first.method,
          body: first.body,
        },
      });
    }

    if (!HAS_LLM) {
      return ok(res, {
        reply: 'Decime qué querés hacer: crear contenido, analizar, programar, responder DMs o lanzar una misión.',
        steps: [],
        intent: 'answer',
        actions: [
          { label: 'Studio de Contenido', icon: '🎨', kind: 'navigate', route: 'studio-carousel' },
          { label: 'Lanzar Misión', icon: '🚀', kind: 'navigate', route: 'mission' },
          { label: 'Analytics', icon: '📊', kind: 'navigate', route: 'analytics' },
        ],
        action: { label: 'Ir a Studio', kind: 'navigate', route: 'studio-carousel' },
      });
    }

    // LLM-powered full intent classification
    const cmdSystem = `Sos FeedIA, agente IA que interpreta comandos en lenguaje natural para gestión de Instagram/TikTok.

ENDPOINTS DISPONIBLES:
- POST /api/carousel/run → body:{topic,format?,style?} → Crea carrusel con IA
- POST /api/missions/launch → body:{freeIntent,runNow:true} → Misión autónoma
- POST /api/hashtags/strategy → body:{topic,format,hook} → Estrategia hashtags
- POST /api/dm/templates/build → body:{} → Plantillas DM automáticas
- POST /api/ab-tests → body:{topic,contentType,variantCount:2} → Test A/B
- POST /api/queue/schedule → body:{} → Programa en horarios prime
- POST /api/competitors/analyze → body:{handles:[]} → Analiza competidores
- POST /api/trends/detect → body:{} → Tendencias del nicho
- POST /api/cu/master → body:{userInput,intent,mode:'supervisor',contentFormat,topic} → Cerebro Maestro
- navigate → routes: feed|studio-carousel|studio-reel|studio-stories|analytics|predictor|curator|ugc|agents|inbox|crisis|scheduler|calendar|settings|tools|assistant|mission|hooks|growth

REGLAS:
- Extraé topic/tema del texto cuando sea posible
- Devolvé 1-3 acciones en orden lógico de ejecución
- Si hay creación de contenido + analítica → ambas en actions[]
- kind: "navigate" para ir a vistas, "api" para llamadas directas, "confirm" para acciones destructivas/costosas
- Español rioplatense, 1 oración en reply`;

    const cmdPrompt = `Comando del usuario: "${text}"

Respondé JSON:
{
  "reply": "string — qué vas a hacer (1 oración)",
  "steps": ["paso 1", "paso 2", "paso 3"],
  "intent": "create_content|analyze|schedule|navigate|answer|launch_mission|automate",
  "actions": [
    {
      "label": "string",
      "icon": "emoji",
      "kind": "navigate|api|confirm",
      "route": "string (solo si navigate)",
      "endpoint": "string (solo si api o confirm)",
      "method": "POST",
      "body": {}
    }
  ]
}`;

    try {
      const result = await askLLMJson(cmdPrompt, { system: cmdSystem, maxTokens: 600, temperature: 0.3 });
      if (result?.actions?.length) {
        const first = result.actions[0];
        return ok(res, {
          ...result,
          // legacy compat
          action: {
            label: first.label,
            kind: first.kind,
            route: first.route,
            endpoint: first.endpoint,
            method: first.method,
            body: first.body,
          },
        });
      }
    } catch {
      /* fall through to keyword match or generic */
    }

    if (hit) {
      const first = hit.actions[0];
      return ok(res, {
        ...hit,
        action: {
          label: first.label,
          kind: first.kind,
          route: first.route,
          endpoint: first.endpoint,
          method: first.method,
          body: first.body,
        },
      });
    }

    return ok(res, {
      reply:
        'No entendí bien ese pedido. Probá con algo como: "subí un carrusel sobre X" o "analizá mis competidores".',
      steps: [],
      intent: 'answer',
      actions: [{ label: 'Asistente FeedIA', icon: '🤖', kind: 'navigate', route: 'assistant' }],
      action: { label: 'Asistente FeedIA', kind: 'navigate', route: 'assistant' },
    });
  }

  // ── Brújula del Día — plan estratégico enriquecido con agentes IG/TT ───
  if (path === '/api/brujula/plan' && m === 'POST') {
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }

    const { topic = '', platform = 'instagram', accountId = '', ...rawBrand } = body || {};

    // Memoria por cuenta — carga perfil guardado + insights de datos reales (si hay accountId)
    const bjScope = (await getSessionFromReq(req).catch(() => null))?.user?.id || 'anon';
    let memory = null;
    if (accountId) {
      try {
        memory = await buildMemoryContext(bjScope, accountId);
      } catch {}
    }
    const savedProfile = memory?.profile || {};

    // Request gana sobre perfil guardado; perfil guardado gana sobre default
    const goal = rawBrand.goal || savedProfile.goal || 'engagement';
    const brandNiche = rawBrand.brandNiche || savedProfile.brandNiche || savedProfile.niche || '';
    const brandVoice = rawBrand.brandVoice || savedProfile.brandVoice || 'cercano';
    const brandType = rawBrand.brandType || savedProfile.brandType || 'personal';

    // Deterministic plan — always fast
    const plan = buildStrategicPlan({ topic, platform, goal, brandNiche, brandVoice });

    // Account-aware brief — adapta toda la generación al nicho/marca/objetivo/algoritmo ($0, sin LLM extra)
    const account = buildAccountBrief({ plan, topic, platform, goal, brandNiche, brandVoice, brandType });

    // Loop de datos: si la cuenta tiene aprendizajes reales, inyectarlos en la generación
    if (memory?.memoryText) {
      account.briefText += `\n\n${memory.memoryText}`;
      account.strategy.memory = {
        postsTracked: memory.insights.postsTracked,
        bestFormat: memory.insights.bestFormat,
        trend: memory.insights.trend,
        recommendations: memory.insights.recommendations,
        topPosts: memory.insights.topPosts,
      };
    }
    plan.strategy = account.strategy;
    plan.niche = account.niche;

    plan._debug = {
      hasLLM: HAS_LLM,
      niche: account.niche,
      accountId: accountId || null,
      memoryPosts: memory?.insights?.postsTracked || 0,
    };

    // LLM enrichment — specialist agent by platform
    if (HAS_LLM && topic.trim().length >= 2) {
      const isIG = platform === 'instagram';
      const specialistSystem = isIG
        ? `Sos un agente especialista en algoritmo y estrategia de contenido para Instagram (2025). Conocés en profundidad: Reels (Explore, Following Feed), Carruseles (high-save content), Stories (engagement stickers), algoritmo de reach, señales de ranking. Respondés en español rioplatense, orientado a resultados y datos. NUNCA inventés stats — si no sabés, usá rangos conservadores.
REGLA DE INTEGRIDAD JSON: Siempre generás JSON 100% completo y válido. Para carruseles: (1) el slide 1 es SIEMPRE role:hook (título), (2) los slides del medio son role:content (subtítulos/contenido), (3) el ÚLTIMO slide es SIEMPRE role:cta (llamado a la acción) — nunca antes. El array slides DEBE tener exactamente slideCount elementos. Nunca truncás el JSON.`
        : `Sos un agente especialista en algoritmo y estrategia de contenido para TikTok (2025). Conocés en profundidad: For You Page (FYP), señales de completion rate, rewatch loops, sonidos trending, duetos/stitch, TikTok Shop. Respondés en español rioplatense, orientado a resultados y datos. NUNCA inventés stats — si no sabés, usá rangos conservadores.`;

      const _fmt = plan.recommendedFormat?.format || (isIG ? 'reels' : 'video');

      const enrichPrompt = isIG
        ? `CONTEXTO: Topic="${topic}" | Goal=${goal} | Audiencia=${plan.input.audience} | Score=${plan.strategicScore}/100

Sos especialista en contenido viral de Instagram. Para el topic dado, genera los 3 formatos completos con contenido REAL y ESPECIFICO (no placeholders). Responde SOLO JSON valido sin texto extra.

REGLAS CRITICAS PARA CARRUSEL — RAZONA ANTES DE GENERAR:
1. El carrusel DEBE tener EXACTAMENTE 5 slides en el array "slides". Ni mas ni menos.
2. Slide 1 (role:"hook"): SIEMPRE el titulo gancho — promesa principal, 3-5 palabras impactantes.
3. Slides 2, 3, 4 (role:"content"): subtitulos y contenido real — cada uno desarrolla un punto especifico del topic.
4. Slide 5 (role:"cta"): SIEMPRE el ULTIMO slide — llamado a la accion (guardar, comentar, seguir). NUNCA antes del ultimo.
5. El campo slideCount DEBE ser igual a la cantidad real de objetos en el array slides.
6. PROHIBIDO truncar el JSON — completa los 5 slides o el sistema falla.

{"igPlans":{"carousel":{"captionHook":"hook caption IG para el scroll max 12 palabras","captionCTA":"que hacer 1 oracion","slideCount":5,"slides":[{"n":1,"role":"hook","title":"TITULO GANCHO 3-5 PALABRAS","subtitle":"1 frase amplia la promesa","bodyText":"2 frases concretas que generan curiosidad","imageText":"texto breve sobre imagen si aplica","visual":"color/fondo/estilo Canva"},{"n":2,"role":"content","title":"Punto 1 corto","subtitle":"1 linea dato o tip","bodyText":"2-3 frases del contenido real punto 1","imageText":"","visual":"descripcion visual slide 2"},{"n":3,"role":"content","title":"Punto 2 corto","subtitle":"1 linea punto 2","bodyText":"2-3 frases del contenido punto 2","imageText":"","visual":"descripcion visual slide 3"},{"n":4,"role":"content","title":"Insight sorpresa","subtitle":"angulo que nadie dice","bodyText":"2 frases del insight mas valioso","imageText":"","visual":"slide contrastante"},{"n":5,"role":"cta","title":"CTA 3-4 palabras","subtitle":"que hacer ahora","bodyText":"1-2 frases cierre y motivacion","imageText":"Guardalo Compartilo Seguime","visual":"frame final impactante"}]},"reel":{"hooks":[{"text":"Hook A verbal max 8 palabras para el scroll","style":"pregunta/dato/shock"},{"text":"Hook B distinto angulo emocional","style":"identificacion/curiosidad"},{"text":"Hook C tercer angulo completamente distinto","style":"contraintuitivo/humor"}],"hookLayer":{"videoText":"TEXTO PANTALLA 3-4 PALABRAS","openingFrame":"descripcion primer frame plano fondo props","poseExpression":"pose y expresion del creador"},"script":{"apertura":"0-3s que decis para retener","beats":[{"n":1,"text":"Beat 1 mismo eje emocional hook","onScreen":"texto pantalla beat 1","visual":"que mostras"},{"n":2,"text":"Beat 2 desarrollo dato demo","onScreen":"","visual":"que mostras beat 2"},{"n":3,"text":"Beat 3 giro o prueba","onScreen":"","visual":"que mostras beat 3"},{"n":4,"text":"Beat 4 cierre hacia CTA","onScreen":"texto pantalla final","visual":"que mostras beat 4"}],"cierre":"CTA verbal exacto"},"cta":"llamado a la accion"},"stories":{"frames":[{"n":1,"role":"hook","mediaType":"video","mediaDescription":"descripcion concreta del video especifico al topic","onScreenText":"TEXTO GRANDE max 6 palabras","supportText":"texto apoyo si aplica","sticker":"Encuesta/ninguno","duration":"5s"},{"n":2,"role":"content","mediaType":"foto","mediaDescription":"descripcion media frame 2","onScreenText":"texto frame 2 claro directo","supportText":"","sticker":"ninguno","duration":"5s"},{"n":3,"role":"content","mediaType":"foto","mediaDescription":"descripcion media frame 3","onScreenText":"punto mas valioso frame 3","supportText":"","sticker":"ninguno","duration":"5s"},{"n":4,"role":"cta","mediaType":"video","mediaDescription":"frame final llamativo","onScreenText":"CTA en pantalla","supportText":"texto apoyo CTA","sticker":"Link/ninguno","duration":"7s"}]}},"guion":{"apertura":"apertura hook","desarrollo":["beat1","beat2","beat3","beat4"],"cierre":"cta"},"ctaOptions":["CTA1","CTA2"],"captionDraft":"caption completo max 280 chars","hashtags":{"core":["#tag1","#tag2","#tag3"],"niche":["#tag4","#tag5"],"trending":["#tag6"]},"platformTip":"tip algoritmo IG 1 oracion","quickWin":"accion mayor impacto 1 oracion"}}`
        : `CONTEXTO:
- Topic: "${topic}"
- Platform: TikTok
- Goal: ${goal}
- Formato: ${_fmt}
- Audiencia: ${plan.input.audience}
- Score estratégico: ${plan.strategicScore}/100

Generá 3 variantes de hook TikTok, cada una con guión completo. REGLAS: hooks entretenidos/educativos/emocionales; el guión sigue la MISMA línea emocional del hook; beats concretos (qué decís + qué mostrás); PROHIBIDO usar placeholders genéricos — todo específico para el topic.

Respondé SOLO JSON válido:

{
  "hookPlans": [
    {
      "hook": "texto verbal del hook — máx 10 palabras, gancho para '${topic}'",
      "hookLayer": {
        "videoText": "texto superpuesto — máx 4 palabras MAYÚSCULAS",
        "imageDescription": "descripción visual del frame: encuadre, props, fondo",
        "poseExpression": "pose y expresión: postura, cara, energía, dónde mira"
      },
      "script": {
        "apertura": "0-3s: qué decís/mostrás exactamente — misma energía que el hook",
        "beats": [
          "Beat 1 (misma línea emocional del hook): qué decís + qué mostrás",
          "Beat 2: desarrollo — dato/historia/demo que sostiene la promesa",
          "Beat 3: giro, prueba o sorpresa que valida el hook",
          "Beat 4: cierre narrativo que lleva al CTA"
        ],
        "cierre": "CTA exacto al final — misma voz que el hook"
      },
      "cta": "llamado a la acción (vacío si no hay producto)"
    }
  ],
  "guion": {"apertura":"apertura del mejor hook","desarrollo":["Beat 1","Beat 2","Beat 3","Beat 4"],"cierre":"CTA final"},
  "cameraAngles": ["ángulo 1","ángulo 2","ángulo 3"],
  "onScreenText": ["texto en pantalla 1","texto 2","texto 3"],
  "visualElements": ["elemento visual 1","elemento 2","elemento 3"],
  "ctaOptions": ["CTA 1","CTA 2","CTA 3"],
  "captionDraft": "caption completo. Máx 280 chars.",
  "hashtags": {"core":["#tag1","#tag2","#tag3"],"niche":["#tag4","#tag5"],"trending":["#tag6"]},
  "platformTip": "consejo específico del algoritmo TikTok (1 oración)",
  "quickWin": "única acción de mayor impacto (1 oración)",
  "automations": [{"label":"string","action":"carousel|reel|stories|schedule|hashtags|ab-test","desc":"string"}]
}`;

      // Helper: fix carousel slides structure (CTA last, renumber, sync count)
      const fixSlides = (sls) => {
        if (!Array.isArray(sls) || sls.length === 0) return sls;
        let s = [...sls];
        const ctaIdx = s.findIndex((x) => x.role === 'cta');
        if (ctaIdx !== -1 && ctaIdx < s.length - 1) {
          const [c] = s.splice(ctaIdx, 1);
          s.push(c);
        }
        if (s[s.length - 1].role !== 'cta') s[s.length - 1] = { ...s[s.length - 1], role: 'cta' };
        if (s[0].role !== 'hook') s[0] = { ...s[0], role: 'hook' };
        return s.map((x, i) => ({ ...x, n: i + 1 }));
      };

      // Build 3 small parallel prompts — 1 carousel each, less truncation risk
      const buildSingleCarouselPrompt = (
        angleName,
        angleDesc,
      ) => `Generá un carrusel de Instagram de EXACTAMENTE 5 slides sobre: "${topic}". Ángulo: ${angleName} (${angleDesc}).
REGLAS: slide 1 role:"hook" (título gancho), slides 2-4 role:"content" (contenido real), slide 5 role:"cta" (siempre último). JSON completo, sin texto extra.

{"angle":"${angleName}","captionHook":"hook 12 palabras max","captionCTA":"CTA 1 oración","slides":[{"n":1,"role":"hook","title":"TITULO GANCHO 3-5 palabras","subtitle":"frase promesa","bodyText":"2 frases curiosidad","imageText":"texto imagen","visual":"estilo Canva"},{"n":2,"role":"content","title":"Punto 1","subtitle":"dato","bodyText":"2-3 frases reales","imageText":"","visual":"estilo"},{"n":3,"role":"content","title":"Punto 2","subtitle":"dato","bodyText":"2-3 frases reales","imageText":"","visual":"estilo"},{"n":4,"role":"content","title":"Insight","subtitle":"sorpresa","bodyText":"2 frases","imageText":"","visual":"estilo"},{"n":5,"role":"cta","title":"CTA accion","subtitle":"que hacer","bodyText":"1-2 frases","imageText":"Guardalo · Seguime","visual":"frame final"}]}`;

      // Ángulos derivados del nicho (no genéricos) — ver _accountBrief.deriveAngles
      const carouselAngles = isIG ? account.angles.carousel : [];

      // Reel variations — 3 distinct angles, each with full hook+script
      const buildSingleReelPrompt = (
        angleName,
        angleDesc,
      ) => `Generá un Reel de Instagram sobre: "${topic}". Ángulo: ${angleName} (${angleDesc}).
REGLAS: hook verbal ≤8 palabras, primer frame con texto on-screen, script con 4 beats y CTA al final. JSON completo, sin texto extra.

{"angle":"${angleName}","hooks":[{"text":"hook verbal max 8 palabras","style":"pregunta/dato/shock"}],"hookLayer":{"videoText":"TEXTO PANTALLA 3-4 PALABRAS","openingFrame":"descripción primer frame: plano, fondo, props","poseExpression":"pose y expresión del creador"},"script":{"apertura":"0-3s qué decís para retener","beats":[{"n":1,"text":"Beat 1 mismo eje del hook","onScreen":"texto pantalla beat 1","visual":"qué mostrás"},{"n":2,"text":"Beat 2 desarrollo dato/demo","onScreen":"","visual":"qué mostrás beat 2"},{"n":3,"text":"Beat 3 giro o prueba","onScreen":"","visual":"qué mostrás beat 3"},{"n":4,"text":"Beat 4 cierre hacia CTA","onScreen":"texto final","visual":"qué mostrás beat 4"}],"cierre":"CTA verbal exacto"},"cta":"llamado a la acción"}`;

      const reelAngles = isIG ? account.angles.reel : [];

      // Stories variations — 3 angles, each with 4 frames
      const buildSingleStoriesPrompt = (
        angleName,
        angleDesc,
      ) => `Generá una secuencia de 4 Stories de Instagram sobre: "${topic}". Ángulo: ${angleName} (${angleDesc}).
REGLAS: frame 1 role:"hook", frames 2-3 role:"content", frame 4 role:"cta". JSON completo, sin texto extra.

{"angle":"${angleName}","frames":[{"n":1,"role":"hook","mediaType":"video","mediaDescription":"descripción del video específico","onScreenText":"TEXTO GRANDE max 6 palabras","supportText":"texto apoyo si aplica","sticker":"Encuesta/ninguno","duration":"5s"},{"n":2,"role":"content","mediaType":"foto","mediaDescription":"descripción media frame 2","onScreenText":"texto frame 2 claro directo","supportText":"","sticker":"ninguno","duration":"5s"},{"n":3,"role":"content","mediaType":"foto","mediaDescription":"descripción media frame 3","onScreenText":"punto más valioso frame 3","supportText":"","sticker":"ninguno","duration":"5s"},{"n":4,"role":"cta","mediaType":"video","mediaDescription":"frame final llamativo","onScreenText":"CTA en pantalla","supportText":"texto apoyo CTA","sticker":"Link/ninguno","duration":"7s"}]}`;

      const storiesAngles = isIG ? account.angles.stories : [];

      // Per-call timeout wrapper — prevents single slow call from blocking the batch
      const withTimeout = (p, ms = 25000) =>
        Promise.race([p, new Promise((resolve) => setTimeout(() => resolve(null), ms))]);

      // Robust JSON call: bypass Groq json_object mode, retry on transient null
      const parseJsonish = (txt) => {
        if (!txt) return null;
        let s = String(txt).trim();
        s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
        // Strip JS-style comments (some models echo /* */ or // from skeleton prompts → invalid JSON)
        s = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
        // Remove trailing commas left behind by stripped comments
        s = s.replace(/,(\s*[}\]])/g, '$1');
        try {
          return JSON.parse(s);
        } catch {}
        const start = s.indexOf('{');
        if (start === -1) return null;
        let depth = 0;
        for (let i = start; i < s.length; i++) {
          if (s[i] === '{') depth++;
          else if (s[i] === '}') {
            depth--;
            if (depth === 0) {
              try {
                return JSON.parse(s.slice(start, i + 1));
              } catch {
                return null;
              }
            }
          }
        }
        return null;
      };
      const askJsonRobust = async (prompt, opts, retries = 2) => {
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const txt = await askLLM(prompt, { ...opts, json: false });
            const parsed = parseJsonish(txt);
            if (parsed) return parsed;
          } catch {}
          // Small backoff for transient Groq errors
          if (attempt < retries) await new Promise((r) => setTimeout(r, 250 * (attempt + 1)));
        }
        return null;
      };

      try {
        plan._debug.stages = {};
        const tStart = Date.now();

        // Sequential execution — most stable with quota-constrained providers.
        // Batched: 1 main + 3 per-format (each returns 3 variants) = 4 calls (was 10).
        // 60% fewer LLM calls → less quota burn, fewer mid-batch rate-limits.
        const enriched = await withTimeout(
          askJsonRobust(enrichPrompt, { system: specialistSystem, maxTokens: isIG ? 3500 : 3500, temperature: 0.55 }),
        );
        plan._debug.stages.main = { ms: Date.now() - tStart, ok: !!enriched };

        // Batch prompt builders — 1 call returns array of 3 variants for a format.
        // Schema completo repetido 3x (sin comentarios → JSON siempre válido).
        const anglesList = (angles) => angles.map((a, i) => `${i + 1}. "${a.name}" — ${a.desc}`).join('\n');
        const carItem = (a) =>
          `{"angle":"${a.name}","captionHook":"hook caption 12 palabras para ${a.name}","captionCTA":"CTA 1 oración","slides":[{"n":1,"role":"hook","title":"TITULO GANCHO 3-5 palabras","subtitle":"frase que amplía la promesa","bodyText":"2 frases que generan curiosidad","imageText":"texto sobre imagen","visual":"color/fondo/estilo Canva"},{"n":2,"role":"content","title":"Punto 1 corto","subtitle":"dato o tip","bodyText":"2-3 frases reales del punto 1","imageText":"","visual":"descripción visual"},{"n":3,"role":"content","title":"Punto 2 corto","subtitle":"dato o tip","bodyText":"2-3 frases reales del punto 2","imageText":"","visual":"descripción visual"},{"n":4,"role":"content","title":"Insight sorpresa","subtitle":"ángulo que nadie dice","bodyText":"2 frases del insight más valioso","imageText":"","visual":"descripción visual"},{"n":5,"role":"cta","title":"CTA 3-4 palabras","subtitle":"qué hacer ahora","bodyText":"1-2 frases de cierre","imageText":"Guardalo · Seguime","visual":"frame final impactante"}]}`;
        const buildCarouselBatchPrompt = (angles) => `${account.briefText}

Sos especialista en carruseles virales de Instagram. Generá 3 carruseles DISTINTOS y específicos sobre: "${topic}", uno por cada ángulo:
${anglesList(angles)}
REGLAS por carrusel: EXACTAMENTE 5 slides. slide 1 role:"hook" (título gancho 3-5 palabras), slides 2-4 role:"content" (contenido REAL y específico al topic, nada genérico), slide 5 role:"cta" (siempre último). Cada ángulo debe sentirse DISTINTO en tono y enfoque.
Respondé SOLO con este JSON exacto, los 3 objetos completos, sin texto extra ni comentarios:
{"carousels":[${carItem(angles[0])},${carItem(angles[1])},${carItem(angles[2])}]}`;

        const reelItem = (a) =>
          `{"angle":"${a.name}","hooks":[{"text":"hook verbal máx 8 palabras para ${a.name}","style":"pregunta/dato/shock"}],"hookLayer":{"videoText":"TEXTO PANTALLA 3-4 PALABRAS","openingFrame":"descripción primer frame: plano, fondo, props","poseExpression":"pose y expresión del creador"},"script":{"apertura":"0-3s qué decís para retener","beats":[{"n":1,"text":"Beat 1 mismo eje del hook","onScreen":"texto pantalla beat 1","visual":"qué mostrás"},{"n":2,"text":"Beat 2 desarrollo dato/demo","onScreen":"","visual":"qué mostrás beat 2"},{"n":3,"text":"Beat 3 giro o prueba","onScreen":"","visual":"qué mostrás beat 3"},{"n":4,"text":"Beat 4 cierre hacia CTA","onScreen":"texto final","visual":"qué mostrás beat 4"}],"cierre":"CTA verbal exacto"},"cta":"llamado a la acción"}`;
        const buildReelBatchPrompt = (angles) => `${account.briefText}

Sos especialista en Reels virales de Instagram. Generá 3 Reels DISTINTOS y específicos sobre: "${topic}", uno por cada ángulo:
${anglesList(angles)}
REGLAS por reel: hook verbal ≤8 palabras, primer frame con texto on-screen, script con 4 beats y CTA al final. Contenido REAL específico al topic. Cada ángulo DISTINTO en tono.
Respondé SOLO con este JSON exacto, los 3 objetos completos, sin texto extra ni comentarios:
{"reels":[${reelItem(angles[0])},${reelItem(angles[1])},${reelItem(angles[2])}]}`;

        const storyItem = (a) =>
          `{"angle":"${a.name}","frames":[{"n":1,"role":"hook","mediaType":"video","mediaDescription":"descripción del video específico al topic","onScreenText":"TEXTO GRANDE máx 6 palabras","supportText":"texto apoyo si aplica","sticker":"Encuesta/ninguno","duration":"5s"},{"n":2,"role":"content","mediaType":"foto","mediaDescription":"descripción media frame 2","onScreenText":"texto claro y directo","supportText":"","sticker":"ninguno","duration":"5s"},{"n":3,"role":"content","mediaType":"foto","mediaDescription":"descripción media frame 3","onScreenText":"punto más valioso","supportText":"","sticker":"ninguno","duration":"5s"},{"n":4,"role":"cta","mediaType":"video","mediaDescription":"frame final llamativo","onScreenText":"CTA en pantalla","supportText":"texto apoyo CTA","sticker":"Link/ninguno","duration":"7s"}]}`;
        const buildStoriesBatchPrompt = (angles) => `${account.briefText}

Sos especialista en Stories de Instagram que convierten. Generá 3 secuencias DISTINTAS y específicas sobre: "${topic}", una por cada ángulo:
${anglesList(angles)}
REGLAS por secuencia: 4 frames. frame 1 role:"hook", frames 2-3 role:"content", frame 4 role:"cta". Cada frame con mediaType (foto/video), descripción del media, texto on-screen y sticker. Contenido REAL específico al topic.
Respondé SOLO con este JSON exacto, los 3 objetos completos, sin texto extra ni comentarios:
{"stories":[${storyItem(angles[0])},${storyItem(angles[1])},${storyItem(angles[2])}]}`;

        let carouselsRaw = null,
          reelsRaw = null,
          storiesRaw = null;

        if (isIG) {
          const tC = Date.now();
          const cBatch = await withTimeout(
            askJsonRobust(buildCarouselBatchPrompt(carouselAngles), {
              system: specialistSystem,
              maxTokens: 4000,
              temperature: 0.6,
            }),
          );
          const cArr = Array.isArray(cBatch?.carousels) ? cBatch.carousels : Array.isArray(cBatch) ? cBatch : [];
          carouselsRaw = { carousels: cArr.filter((c) => c && Array.isArray(c.slides) && c.slides.length >= 3) };
          plan._debug.stages.carousels = { ms: Date.now() - tC, ok: carouselsRaw.carousels.length };

          const tR = Date.now();
          const rBatch = await withTimeout(
            askJsonRobust(buildReelBatchPrompt(reelAngles), {
              system: specialistSystem,
              maxTokens: 4000,
              temperature: 0.6,
            }),
          );
          const rArr = Array.isArray(rBatch?.reels) ? rBatch.reels : Array.isArray(rBatch) ? rBatch : [];
          reelsRaw = rArr.filter((r) => r && (Array.isArray(r.hooks) || r.script || r.hookLayer));
          plan._debug.stages.reels = { ms: Date.now() - tR, ok: reelsRaw.length };

          const tS = Date.now();
          const sBatch = await withTimeout(
            askJsonRobust(buildStoriesBatchPrompt(storiesAngles), {
              system: specialistSystem,
              maxTokens: 4000,
              temperature: 0.6,
            }),
          );
          const sArr = Array.isArray(sBatch?.stories) ? sBatch.stories : Array.isArray(sBatch) ? sBatch : [];
          storiesRaw = sArr.filter((s) => s && Array.isArray(s.frames) && s.frames.length >= 2);
          plan._debug.stages.stories = { ms: Date.now() - tS, ok: storiesRaw.length };
        }

        // Partial JSON recovery for main call
        let enrichedFinal = enriched;
        if (!enrichedFinal && isIG) {
          try {
            const rawTxt = await askLLM(enrichPrompt, {
              system: specialistSystem,
              maxTokens: 5000,
              temperature: 0.55,
              json: true,
            });
            if (rawTxt) {
              const clean = rawTxt
                .trim()
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/```\s*$/i, '');
              const igIdx = clean.indexOf('"igPlans"');
              if (igIdx !== -1) {
                let depth = 0,
                  start = -1,
                  end = -1;
                for (let i = igIdx; i < clean.length; i++) {
                  if (clean[i] === '{') {
                    if (start === -1) start = i;
                    depth++;
                  } else if (clean[i] === '}') {
                    depth--;
                    if (depth === 0 && start !== -1) {
                      end = i;
                      break;
                    }
                  }
                }
                if (end > start) {
                  enrichedFinal = { igPlans: JSON.parse(clean.slice(start, end + 1)) };
                }
              }
            }
          } catch {
            /* partial recovery failed */
          }
        }

        const hasIgPlans = isIG && enrichedFinal?.igPlans;
        const hasTtPlans = !isIG && (enrichedFinal?.hookPlans?.length || enrichedFinal?.hooks?.length);

        // IG variants always inject if available, even if main enrichment failed
        if (isIG) {
          plan.igPlans = plan.igPlans || enrichedFinal?.igPlans || {};
          if (enrichedFinal) plan.enriched = enrichedFinal;

          // Inject carousel variations (whatever made it through)
          const rawCarousels = Array.isArray(carouselsRaw?.carousels) ? carouselsRaw.carousels : null;
          if (rawCarousels && rawCarousels.length >= 1) {
            plan.igPlans.carousels = rawCarousels.map((cv) => ({
              ...cv,
              slides: fixSlides(cv.slides || []),
              slideCount: (cv.slides || []).length,
            }));
            plan.igPlans.carousel = plan.igPlans.carousels[0];
          }

          // Inject reel variations
          if (Array.isArray(reelsRaw) && reelsRaw.length >= 1) {
            plan.igPlans.reels = reelsRaw;
            plan.igPlans.reel = reelsRaw[0];
          }

          // Inject stories variations
          if (Array.isArray(storiesRaw) && storiesRaw.length >= 1) {
            plan.igPlans.storiesVariants = storiesRaw;
            plan.igPlans.stories = storiesRaw[0];
          }
        }

        if (hasIgPlans || hasTtPlans) {
          plan.enriched = enrichedFinal;
          if (hasIgPlans) {
            // Fix carousel structure: CTA must be last, slideCount must match actual slides
            if (plan.igPlans?.carousel) {
              let car = plan.igPlans.carousel;
              let sls = fixSlides(Array.isArray(car.slides) ? car.slides : []);
              if (sls.length > 0) {
                plan.igPlans.carousel = { ...car, slides: sls, slideCount: sls.length };
              }
            }
            const reelHook = plan.igPlans.reel?.hook || enrichedFinal?.igPlans?.reel?.hook || '';
            const vp = predictVirality({
              hook: reelHook,
              platform: 'instagram',
              format: 'reels',
              thumbnail: { hasFace: true, hasText: true, highContrast: true },
            });
            plan.igPlans._viralScore = vp.viralScore;
            const topHook = plan.igPlans.carousel?.captionHook || plan.igPlans.carousel?.hook || reelHook || '';
            plan.hookCandidates = [
              {
                hook: topHook,
                predictedStrength: vp.viralScore / 100,
                viralScore: vp.viralScore,
                formula: 'llm-ig',
                id: 'llm-0',
              },
            ];
            plan.topHook = plan.hookCandidates[0];
          } else if (enriched.hookPlans?.length) {
            plan.hookPlans = enriched.hookPlans.map((hp) => {
              const vp = predictVirality({
                hook: hp.hook,
                platform,
                format: _fmt,
                thumbnail: {
                  hasFace: true,
                  hasText: Boolean(hp.hookLayer?.videoText),
                  highContrast: true,
                  brightColors: false,
                },
              });
              return {
                ...hp,
                viralScore: vp.viralScore,
                hookScore: vp.breakdown?.hook?.score ?? 0,
                completionScore: vp.breakdown?.emotion?.score ?? 0,
              };
            });
            plan.hookCandidates = plan.hookPlans.map((hp, i) => ({
              hook: hp.hook,
              predictedStrength: hp.viralScore / 100,
              viralScore: hp.viralScore,
              hookScore: hp.hookScore,
              formula: 'llm-specialist',
              id: `llm-${i}`,
            }));
          } else if (enriched.hooks?.length) {
            plan.hookCandidates = enriched.hooks.map((h, i) => {
              const vp = predictVirality({
                hook: h,
                platform,
                format: _fmt,
                thumbnail: { hasFace: true, hasText: true, highContrast: true },
              });
              return {
                hook: h,
                predictedStrength: vp.viralScore / 100,
                viralScore: vp.viralScore,
                formula: 'llm-specialist',
                id: `llm-${i}`,
              };
            });
          }
          plan.topHook = plan.topHook || plan.hookCandidates[0];
        }
      } catch (e) {
        plan._debug.error = String(e?.message || e).slice(0, 200);
        plan._debug.stack = String(e?.stack || '').slice(0, 500);
      }
      plan._debug.counts = {
        carousels: plan.igPlans?.carousels?.length || 0,
        reels: plan.igPlans?.reels?.length || 0,
        storiesVariants: plan.igPlans?.storiesVariants?.length || 0,
      };
      try {
        plan._debug.lastLLMError = globalThis.__lastLLMError || null;
      } catch {}
      try {
        plan._debug.geminiError = globalThis.__geminiError || null;
      } catch {}
      try {
        plan._debug.lastLLMProvider = globalThis.__lastLLMProvider || null;
      } catch {}
    }

    // ── Predictive models — platform-specific weights + Monte Carlo + content scoring ──
    try {
      const isIG = platform === 'instagram';
      const topHook = plan.topHook?.hook || topic;
      const captionDraft = plan.enriched?.captionDraft || `${topHook}\n\n${plan.ctaLadder?.[0] || ''}`;
      const hashtagsArr = [
        ...(plan.enriched?.hashtags?.core || []),
        ...(plan.enriched?.hashtags?.niche || []),
        ...(plan.enriched?.hashtags?.trending || []),
      ];
      const fmt = plan.recommendedFormat?.format || (isIG ? 'reels' : 'video');

      const vp = predictVirality({
        hook: topHook,
        caption: captionDraft,
        hashtags: hashtagsArr.length ? hashtagsArr : [`#${topic.replace(/\s+/g, '')}`, '#marketing', '#contenido'],
        format: fmt,
        platform,
        thumbnail: { hasFace: true, hasText: true, highContrast: true, brightColors: false },
        audienceSize: 1000,
        audienceEngaged: isIG ? 0.08 : 0.12, // TikTok FYP eng higher baseline
      });

      const hookSc = vp.breakdown.hook.score / 100;
      const captionSc = vp.breakdown.caption.score / 100;
      const emotionSc = vp.breakdown.emotion.score / 100;
      const formatSc = vp.breakdown.format.score / 100;
      const timingSc = vp.breakdown.timing.score / 100;
      const audienceFit = plan.recommendedFormat?.fit || 0.75;
      const algorithmFit = Math.min(1, (plan.algorithmChecklist?.length || 0) / 6);

      // Platform-specific matrix definitions — DIFFERENT signals per platform
      const PLATFORM_MATRIX = {
        instagram: [
          { key: 'hook', label: 'Hook', weight: 25 },
          { key: 'saves', label: 'Saves signal', weight: 20 },
          { key: 'algorithm', label: 'Algoritmo IG', weight: 18 },
          { key: 'audience', label: 'Audiencia', weight: 15 },
          { key: 'conversion', label: 'Conversión', weight: 12 },
          { key: 'production', label: 'Producción', weight: 7 },
          { key: 'timing', label: 'Timing', weight: 3 },
        ],
        tiktok: [
          { key: 'hook', label: 'Hook (3s)', weight: 30 },
          { key: 'completion', label: 'Completion %', weight: 28 },
          { key: 'sound', label: 'Audio trend', weight: 15 },
          { key: 'shareability', label: 'Shareability', weight: 12 },
          { key: 'audience', label: 'Audiencia', weight: 10 },
          { key: 'production', label: 'Producción', weight: 3 },
          { key: 'timing', label: 'Timing FYP', weight: 2 },
        ],
      };
      const matrixDims = PLATFORM_MATRIX[platform] || PLATFORM_MATRIX.instagram;

      let scoreMatrix, contentScoreRaw;
      if (isIG) {
        // Instagram: saves + algorithm fit dominate alongside hook
        const savesSignal = captionSc * 0.5 + emotionSc * 0.5;
        const retentionSignal = (plan.strategicScore / 100) * 0.7 + formatSc * 0.3;
        const goalConvMap = { conversion: 0.9, sales: 0.9, engagement: 0.7, community: 0.65, awareness: 0.55 };
        const conversionPot = goalConvMap[goal] || 0.7;
        const productionScore = 0.7;
        scoreMatrix = {
          hook: Math.round(hookSc * 100),
          saves: Math.round(savesSignal * 100),
          algorithm: Math.round(algorithmFit * 100),
          audience: Math.round(audienceFit * 100),
          conversion: Math.round(conversionPot * 100),
          production: Math.round(productionScore * 100),
          timing: Math.round(timingSc * 100),
        };
        contentScoreRaw =
          hookSc * 0.25 +
          savesSignal * 0.2 +
          algorithmFit * 0.18 +
          audienceFit * 0.15 +
          conversionPot * 0.12 +
          productionScore * 0.07 +
          timingSc * 0.03;
      } else {
        // TikTok: completion + hook dominate; sound and shareability matter more than on IG
        const completionSignal = Math.min(1, hookSc * 0.55 + formatSc * 0.45); // proxy: strong hook → better completion
        const soundSignal = 0.62; // conservative — we don't know if trending audio used
        const shareability = Math.min(1, emotionSc * 0.65 + hookSc * 0.35);
        const productionScore = 0.7;
        scoreMatrix = {
          hook: Math.round(hookSc * 100),
          completion: Math.round(completionSignal * 100),
          sound: Math.round(soundSignal * 100),
          shareability: Math.round(shareability * 100),
          audience: Math.round(audienceFit * 100),
          production: Math.round(productionScore * 100),
          timing: Math.round(timingSc * 100),
        };
        contentScoreRaw =
          hookSc * 0.3 +
          completionSignal * 0.28 +
          soundSignal * 0.15 +
          shareability * 0.12 +
          audienceFit * 0.1 +
          productionScore * 0.03 +
          timingSc * 0.02;
      }
      const contentScorePct = Math.round(contentScoreRaw * 100);
      const contentDecision = contentScorePct >= 72 ? 'GO' : contentScorePct >= 52 ? 'CONDITIONAL' : 'NO-GO';

      // Monte Carlo reach simulation (Box–Muller, 1000 iter)
      // TikTok has MUCH higher variance — FYP can multiply 100x or send to 0
      const baseReach = vp.predicted.reach;
      const sigma = isIG ? baseReach * 0.35 : baseReach * 0.9;
      const mcSamples = [];
      for (let i = 0; i < 1000; i++) {
        const u1 = Math.random(),
          u2 = Math.random();
        const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
        mcSamples.push(Math.max(isIG ? 50 : 100, Math.round(baseReach + sigma * z)));
      }
      mcSamples.sort((a, b) => a - b);
      const p10 = mcSamples[Math.floor(mcSamples.length * 0.1)];
      const p50 = mcSamples[Math.floor(mcSamples.length * 0.5)];
      const p90 = mcSamples[Math.floor(mcSamples.length * 0.9)];

      const disclaimer = isIG
        ? `Modelo calibrado con benchmarks de Instagram 2024-2025 para cuenta de ~1,000 seguidores. Escalá las cifras según tu audiencia real.`
        : `TikTok FYP tiene alta varianza — el mismo contenido puede recibir 200 o 200,000 views. P90 no garantizado. Modelo conservador para cuenta de ~1,000 seguidores.`;

      plan.predictions = {
        platform,
        viralScore: vp.viralScore,
        virality: vp.virality,
        ceilingScore: vp.ceilingScore,
        optimizationGap: vp.optimizationGap,
        predicted: vp.predicted,
        breakdown: vp.breakdown,
        flags: vp.flags,
        improvements: vp.improvements,
        benchmarks: vp.benchmarks,
        contentScore: contentScorePct,
        contentDecision,
        scoreMatrix,
        matrixDims, // frontend uses this to render correct labels/weights per platform
        monteCarlo: { p10, p50, p90, iterations: 1000 },
        disclaimer,
      };
    } catch {
      /* predictions optional */
    }

    // ── LLM honest predictive analysis — separate call for honest verdicts ──
    if (HAS_LLM && topic.trim().length >= 2 && plan.predictions) {
      const isIG2 = platform === 'instagram';
      try {
        const honestSystem = isIG2
          ? `Sos un data scientist especialista en métricas de Instagram. Analizás contenido y das predicciones HONESTAS y conservadoras basadas en benchmarks reales 2024-2025. Nunca inflás expectativas.`
          : `Sos un data scientist especialista en TikTok FYP. Analizás contenido y das predicciones HONESTAS. Sabés que la mayoría del contenido NO va viral (<5%). Nunca mentís sobre el potencial.`;
        const honestPrompt = `Analizá este plan de contenido para ${platform}:
Topic: "${topic}" | Formato: ${plan.recommendedFormat?.format} | Goal: ${goal}
Hook: "${plan.topHook?.hook || topic}"
Content score calculado: ${plan.predictions.contentScore}/100

Predicciones HONESTAS para cuenta de 1,000-10,000 seguidores. JSON:
{
  "completionRateRange": "ej: '35-55%' para TikTok, '60-80%' para carrusel IG",
  "engagementBenchmark": "ej: '3-6% típico para este formato'",
  "reachVsFollowers": "ej: '0.8x-2x seguidores' para IG reels, '1x-8x' para TikTok FYP",
  "viralProbability": "X% (honesto — la mayoría del contenido no viral)",
  "keySuccessFactors": ["factor más importante 1", "factor 2", "factor 3"],
  "mainRisks": ["riesgo real 1", "riesgo 2"],
  "honestVerdict": "evaluación directa en 1-2 oraciones sin mentiras — qué tan probable es el éxito con este contenido"
}`;
        const honestPred = await askLLMJson(honestPrompt, { system: honestSystem, maxTokens: 500, temperature: 0.2 });
        if (honestPred?.honestVerdict) plan.predictions.honestAnalysis = honestPred;
      } catch {
        /* optional */
      }
    }

    // Memoria por cuenta: persistir perfil + registrar este plan en el historial
    if (accountId) {
      try {
        await saveAccountProfile(bjScope, accountId, {
          platform,
          niche: account.niche,
          brandNiche,
          brandVoice,
          brandType,
          goal,
        });
        await recordAccountPlan(bjScope, accountId, {
          topic,
          niche: account.niche,
          goal,
          formats: {
            carousels: plan.igPlans?.carousels?.length || 0,
            reels: plan.igPlans?.reels?.length || 0,
            stories: plan.igPlans?.storiesVariants?.length || 0,
          },
          angles: (plan.igPlans?.carousels || []).map((c) => c.angle).filter(Boolean),
          topHook: plan.topHook?.hook || '',
          viralScore: plan.igPlans?._viralScore || plan.predictions?.viralScore || null,
        });
      } catch {
        /* memoria best-effort */
      }
    }

    if (bjScope && bjScope !== 'anon') {
      import('./_achievements.js').then(a => a.onWorkflowExecuted(bjScope)).catch(() => {});
    }
    return ok(res, plan);
  }

  // ── Asistente FeedIA — chat inteligente con contexto de marca ──────────
  if (path === '/api/assistant/chat' && m === 'POST') {
    const acCtx = await getSessionFromReq(req);
    const acKey = acCtx?.user?.id ? `chat:${acCtx.user.id}` : `chat:${ipOf(req)}`;
    if (!(await rateLimit(req, res, acKey, LIMITS.chat.limit, LIMITS.chat.window, { user: acCtx?.user }))) return;
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const message = body?.message || '';
    if (!message) return json(res, 400, { error: 'message requerido' });

    // Brand context: body override → KV user brand → demo brand
    const chatCtx = await getSessionFromReq(req);
    const kvBrand = chatCtx?.user?.id ? await store.get(`feedia:brand:${chatCtx.user.id}`) : null;
    const brand = body?.brand || kvBrand || d.DEMO_BRAND;
    const history = body?.history || [];

    if (!HAS_LLM) {
      // No LLM keys configured — return informative demo fallback
      return ok(res, {
        reply: `¡Hola! Soy FeedIA. Para activar las respuestas inteligentes, configurá una API key (GROQ_API_KEY es gratuita) en la sección Ajustes → Integraciones IA.`,
        replyHtml: `<p>¡Hola! Soy <strong>FeedIA</strong>. Para activar respuestas inteligentes configurá una <strong>API key</strong> en <em>Ajustes → Integraciones IA</em>. GROQ es gratuita y rápida.</p>`,
        tools: [{ label: 'Configurar IA', route: 'settings', icon: '⚙️' }],
        demoMode: true,
      });
    }

    const historyLines = history.map((m) => `${m.role === 'user' ? 'Usuario' : 'FeedIA'}: ${m.content}`).join('\n');

    const system = `Sos FeedIA, agente IA experto en Instagram y TikTok. Tenés acceso a datos de la marca y modelos predictivos de data science.

PERFIL DE MARCA:
• Marca: ${brand.name || 'Marca Demo'} (${brand.type || 'creator'})
• Nicho: ${brand.niche || 'Productividad para creators'}
• Audiencia: ${brand.audience?.description || 'Creators independientes 25-40'}
• Dolores: ${(brand.audience?.pains || ['falta de tiempo', 'bajo engagement']).join(' · ')}
• Deseos: ${(brand.audience?.desires || ['autoridad', 'monetización', 'comunidad']).join(' · ')}
• Tono: ${(brand.voice?.tone || ['cercano', 'directo']).join(', ')}
• Prohibido: ${(brand.voice?.forbidden || ['gurú']).join(', ')}
• Objetivo: ${brand.goals?.primary || 'autoridad en el nicho'}

CAPACIDADES DEL SISTEMA:
Studio: Carruseles · Reels · Stories · TikTok Scripts
Análisis: Predictor engagement · Analytics · KPIs · Feed visual
Automatizaciones: ManyChat triggers · UGC · Experimentos A/B · Collabs
Contenido: Curator · Hooks · Captions · Hashtags · Repurposing
Garantía de Crecimiento (7 tiers): Nano (+200 seg) · Starter (+500) · Growth (+2K) · Scale (+5K) · Authority (+10K) · Viral (+25K) · Elite (+50K + revenue)

MODELOS PREDICTIVOS:
• Predictor Viralidad: R₀ epidemiológico + curva-S + Bayesian update → probabilidad viral pre-publicación
• Simulador Embudo Ventas: Monte Carlo 1000 iter → P10/P50/P90 ingresos, LTV, CAC, ROAS
• Content Scoring Matrix: 7D ponderadas (Hook 28%, Retención 20%, Algoritmo 18%, Audiencia 14%, Conversión 10%, Producción 6%, Timing 4%) → GO/CONDITIONAL/NO-GO

REGLAS:
- Español rioplatense. Conciso, práctico, orientado a resultados.
- Ante preguntas de contenido: hooks concretos, formatos con datos de engagement, scores reales.
- Ante preguntas de crecimiento: tier de garantía recomendado con KPIs específicos.
- Ante preguntas de ventas/ingresos: lógica de embudo con benchmarks del nicho.
- Siempre incluí ≥1 tool chip con route correcta cuando sugerís actuar.
- Si detectás problema: diagnosticá + 3 acciones concretas con impacto estimado.`;

    const prompt = `${historyLines ? `Historial:\n${historyLines}\n\n` : ''}Usuario: ${message}

Respondé con JSON:
{ "reply": string (texto plano conciso), "replyHtml": string (HTML rico con <strong><ul><li><em><br>), "tools": [{ "label": string, "route": "feed|studio-carousel|studio-reel|studio-stories|vision|predictor|curator|ugc|experiments|collab|inbox|crisis|scheduler|settings|tools|analytics|assistant|calendar|agents|growth|hooks|optimize|mission", "icon": string (emoji) }] }`;

    try {
      const result = await askLLMJson(prompt, { system, maxTokens: 1600, temperature: 0.65 });
      if (result?.reply) return ok(res, result);
      // LLM responded but not valid JSON — return raw text
      const raw = await askLLM(prompt, { system, maxTokens: 1200 });
      return ok(res, { reply: raw || 'Error al procesar tu consulta.', replyHtml: null, tools: [] });
    } catch (err) {
      return json(res, 500, { error: String(err) });
    }
  }

  // ── Voz FeedIA — comando de voz interpretado por LLM ───────────────────
  if (path === '/api/voice/command' && m === 'POST') {
    const vcCtx = await getSessionFromReq(req);
    const vcKey = vcCtx?.user?.id ? `voice:${vcCtx.user.id}` : `voice:${ipOf(req)}`;
    if (!(await rateLimit(req, res, vcKey, LIMITS.voice.limit, LIMITS.voice.window, { user: vcCtx?.user }))) return;
    let body = req.body;
    if (body === undefined) {
      try {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString('utf-8');
        body = raw ? JSON.parse(raw) : {};
      } catch {
        body = {};
      }
    }
    const transcript = body?.transcript || '';
    if (!transcript) return json(res, 400, { error: 'transcript requerido' });

    if (!HAS_LLM) {
      return ok(res, {
        spokenReply: 'Hola, para activar el asistente de voz configurá una API key en Ajustes.',
        action: { type: 'navigate', route: 'settings' },
        demoMode: true,
      });
    }

    const voiceSystem = `Sos FeedIA, asistente de voz para gestión de Instagram y TikTok. El usuario habló por micrófono — respondé brevemente (máx 2 oraciones para TTS) y decidí qué acción tomar.

Acciones disponibles: navigate (route), launch-mission, answer (solo texto).
Routes: feed, studio-carousel, studio-reel, studio-stories, analytics, predictor, curator, ugc, agents, inbox, crisis, scheduler, calendar, settings, tools, assistant.`;

    const voicePrompt = `Transcript del usuario: "${transcript}"

Respondé JSON: { "spokenReply": string (corto, para TTS, español rioplatense), "action": { "type": "navigate"|"launch-mission"|"answer", "route"?: string, "mission"?: string } }`;

    try {
      const result = await askLLMJson(voicePrompt, { system: voiceSystem, maxTokens: 300, temperature: 0.5 });
      return ok(res, result || { spokenReply: 'Entendido, procesando tu solicitud.', action: { type: 'answer' } });
    } catch {
      return ok(res, { spokenReply: 'Entendido.', action: { type: 'answer' } });
    }
  }

  // ── Analytics — métricas reales de Instagram + historial KV ───────────
  if (path === '/api/analytics/overview' && m === 'GET') {
    const aCtx = await getSessionFromReq(req);
    const connected = await igConnected(req);
    if (!connected)
      return ok(res, {
        connected: false,
        real: false,
        followers: 0,
        reach: 0,
        engagementRate: 0,
        saves: 0,
        shares: 0,
        impressions: 0,
      });
    try {
      const [profile, insights] = await Promise.all([igProfile(req), igInsights(req)]);
      const engagementRate = profile.followers ? ((insights.accounts_engaged ?? 0) / profile.followers) * 100 : 0;
      const overview = {
        connected: true,
        real: true,
        followers: profile.followers ?? 0,
        followersDelta: 0,
        reach: insights.reach ?? 0,
        impressions: insights.impressions ?? 0,
        profileViews: insights.profile_views ?? 0,
        engagementRate: parseFloat(engagementRate.toFixed(2)),
        saves: 0,
        shares: 0,
      };
      // Store daily KPI snapshot
      if (aCtx?.user?.id) {
        const today = new Date().toISOString().slice(0, 10);
        const snap = JSON.stringify({
          fecha: today,
          engagementRate: overview.engagementRate,
          reach: overview.reach,
          followers: overview.followers,
        });
        const existing = await store.lrange(`feedia:kpi:${aCtx.user.id}:daily`, 0, 0);
        const last = existing[0] ? JSON.parse(existing[0]) : null;
        if (last?.fecha !== today) {
          await store.lpush(`feedia:kpi:${aCtx.user.id}:daily`, snap);
        }
        // Compute followersDelta from history
        const prev = await store.lrange(`feedia:kpi:${aCtx.user.id}:daily`, 1, 7);
        if (prev.length) {
          const old = JSON.parse(prev[prev.length - 1]);
          if (old.followers)
            overview.followersDelta = Math.round(((overview.followers - old.followers) / old.followers) * 100);
        }
      }
      return ok(res, overview);
    } catch {
      return ok(res, {
        connected: false,
        error: 'ig-api-error',
        real: false,
        followers: 0,
        reach: 0,
        engagementRate: 0,
      });
    }
  }

  if (path === '/api/analytics/engagement' && m === 'GET') {
    const aCtx = await getSessionFromReq(req);
    if (!aCtx?.user?.id) return ok(res, { data: [] });
    const raw = await store.lrange(`feedia:kpi:${aCtx.user.id}:daily`, 0, 13);
    const data = raw
      .map((r) => {
        try {
          return JSON.parse(r);
        } catch {
          return null;
        }
      })
      .filter(Boolean)
      .reverse();
    return ok(res, { data });
  }

  if (path === '/api/analytics/formats' && m === 'GET') {
    const connected = await igConnected(req);
    if (!connected) return ok(res, { formats: [] });
    try {
      const { media } = await igMedia(50, req);
      if (!media?.length) return ok(res, { formats: [] });
      const byType = {};
      for (const item of media) {
        const t = item.media_type || 'IMAGE';
        if (!byType[t]) byType[t] = { type: t, totalLikes: 0, totalComments: 0, count: 0 };
        byType[t].totalLikes += item.like_count ?? 0;
        byType[t].totalComments += item.comments_count ?? 0;
        byType[t].count++;
      }
      const LABEL = { IMAGE: 'Post imagen', VIDEO: 'Reel / Video', CAROUSEL_ALBUM: 'Carrusel' };
      const formats = Object.values(byType).map((f) => ({
        tipo: f.type,
        formato: LABEL[f.type] || f.type,
        avgLikes: f.count ? Math.round(f.totalLikes / f.count) : 0,
        avgComments: f.count ? Math.round(f.totalComments / f.count) : 0,
        score: Math.min(100, Math.round((f.totalLikes + f.totalComments * 5) / f.count / 10)),
        posts: f.count,
        avgEng: f.count ? parseFloat(((f.totalLikes + f.totalComments) / f.count).toFixed(1)) : 0,
      }));
      return ok(res, { formats, real: true });
    } catch {
      return ok(res, { formats: [] });
    }
  }

  if (path === '/api/analytics/best-times' && m === 'GET') {
    // Research-backed 2024 IG best times (consistent, not random)
    const data = [
      { dia: 0, hora: 9, score: 0.62 },
      { dia: 0, hora: 12, score: 0.78 },
      { dia: 0, hora: 18, score: 0.71 },
      { dia: 0, hora: 21, score: 0.58 },
      { dia: 1, hora: 9, score: 0.68 },
      { dia: 1, hora: 12, score: 0.82 },
      { dia: 1, hora: 18, score: 0.75 },
      { dia: 1, hora: 21, score: 0.63 },
      { dia: 2, hora: 9, score: 0.65 },
      { dia: 2, hora: 12, score: 0.73 },
      { dia: 2, hora: 18, score: 0.8 },
      { dia: 2, hora: 21, score: 0.69 },
      { dia: 3, hora: 9, score: 0.7 },
      { dia: 3, hora: 12, score: 0.85 },
      { dia: 3, hora: 18, score: 0.77 },
      { dia: 3, hora: 21, score: 0.72 },
      { dia: 4, hora: 9, score: 0.72 },
      { dia: 4, hora: 12, score: 0.88 },
      { dia: 4, hora: 15, score: 0.84 },
      { dia: 4, hora: 18, score: 0.76 },
      { dia: 5, hora: 9, score: 0.55 },
      { dia: 5, hora: 12, score: 0.74 },
      { dia: 5, hora: 15, score: 0.79 },
      { dia: 5, hora: 18, score: 0.83 },
      { dia: 6, hora: 9, score: 0.52 },
      { dia: 6, hora: 12, score: 0.71 },
      { dia: 6, hora: 15, score: 0.77 },
      { dia: 6, hora: 18, score: 0.82 },
    ];
    return cached(res, { data, source: 'benchmarks-2024' }, 86400, 604800);
  }

  // ── Hooks — generador LLM + biblioteca curada ─────────────────────────
  if (path === '/api/hooks/generate' && m === 'POST') {
    const hCtx = await getSessionFromReq(req);
    const hKey = hCtx?.user?.id ? `hooks:${hCtx.user.id}` : `hooks:${ipOf(req)}`;
    if (!(await rateLimit(req, res, hKey, LIMITS.hooks.limit, LIMITS.hooks.window, { user: hCtx?.user }))) return;
    let hBody = req.body;
    if (hBody === undefined) {
      try {
        const ch = [];
        for await (const c of req) ch.push(c);
        hBody = JSON.parse(Buffer.concat(ch).toString('utf-8') || '{}');
      } catch {
        hBody = {};
      }
    }
    const DEMO_HOOKS = {
      ok: true,
      hooks: [
        {
          text: 'El error que comete el 90% en Instagram',
          type: 'curiosity',
          score: 88,
          why: 'Número específico + miedo a perder',
        },
        {
          text: 'Por qué tu contenido no llega a nuevas personas',
          type: 'pain',
          score: 84,
          why: 'Apunta a dolor directo del creador',
        },
        {
          text: '3 cambios que duplicaron mi alcance en 30 días',
          type: 'benefit',
          score: 91,
          why: 'Número + timeframe específico + resultado',
        },
        {
          text: 'Nadie te contó esto sobre el algoritmo de Instagram',
          type: 'curiosity',
          score: 86,
          why: 'Exclusividad + conocimiento secreto',
        },
        {
          text: 'Cometí este error y perdí 5000 seguidores',
          type: 'story',
          score: 89,
          why: 'Vulnerabilidad + número concreto',
        },
      ],
    };
    if (!HAS_LLM) return ok(res, DEMO_HOOKS);
    const { topic = '', type: hookType = 'curiosity', platform = 'instagram', niche = '', count = 5 } = hBody || {};
    const hookResult = await askLLMJson(
      `Generá ${count} hooks de tipo "${hookType}" para el tema: "${topic || 'contenido de redes sociales'}". Nicho: ${niche || 'creators'}. Plataforma: ${platform}.
       Reglas: primera palabra de alto impacto, máx 12 palabras, específicos y concretos, que generen urgencia o curiosidad.
       Devuelve SOLO JSON válido: { "hooks": [{ "text": "string", "type": "${hookType}", "score": 85, "why": "string" }] }`,
      {},
      { temperature: 0.85, maxTokens: 800 },
    );
    return ok(res, { ok: true, hooks: hookResult?.hooks || DEMO_HOOKS.hooks });
  }

  if (path === '/api/hooks/library' && m === 'GET') {
    return cached(
      res,
      {
        templates: {
          curiosity: [
            'El secreto que nadie te cuenta sobre {tema}',
            '¿Por qué el 90% falla en {tema}?',
            'Lo que descubrí después de {N} intentos',
          ],
          pain: [
            '¿Cansado de {problema}?',
            'Por qué {problema} te está frenando',
            '{Problema} destruye tu crecimiento',
          ],
          benefit: [
            '{N} formas de {resultado} en {tiempo}',
            'Cómo logré {resultado} sin {esfuerzo}',
            'El método que me dio {resultado}',
          ],
          story: [
            'Cometí este error y {consecuencia}',
            'Hace {tiempo} yo también {situación}',
            'Nadie creyó que podía {logro}',
          ],
          controversy: [
            'Estoy harto de que nadie diga {verdad}',
            'La industria te miente sobre {tema}',
            'Unpopular opinion: {opinión}',
          ],
        },
      },
      3600,
      86400,
    );
  }

  // ── ACHIEVEMENTS (real per-user KV store if authenticated, demo otherwise) ──
  if (path.startsWith('/api/achievements')) {
    const achCtx = await getSessionFromReq(req);
    const achUserId = achCtx?.user?.id;

    if (achUserId) {
      // ── AUTHENTICATED: real per-user store ──────────────────────────────
      const {
        getAllAchievements, getUnlocked, getSnapshot, getNext,
        getUnacknowledged, markShared, markAcknowledged, evaluateAchievements,
        recordActiveDay, onUserLogin,
      } = await import('./_achievements.js');

      // Track active day on any authenticated achievement request
      recordActiveDay(achUserId).catch(() => {});

      if (path === '/api/achievements' && m === 'GET') {
        return ok(res, getAllAchievements());
      }
      if (path === '/api/achievements/unlocked' && m === 'GET') {
        return ok(res, await getUnlocked(achUserId));
      }
      if (path === '/api/achievements/snapshot' && m === 'GET') {
        return ok(res, await getSnapshot(achUserId));
      }
      if (path === '/api/achievements/next' && m === 'GET') {
        return ok(res, await getNext(achUserId));
      }
      if (path === '/api/achievements/unacknowledged' && m === 'GET') {
        return ok(res, await getUnacknowledged(achUserId));
      }
      if (path === '/api/achievements/evaluate' && m === 'POST') {
        const newUnlocks = await evaluateAchievements(achUserId);
        return ok(res, newUnlocks);
      }
      if (path.match(/^\/api\/achievements\/[^/]+\/share$/) && m === 'POST') {
        const id = path.split('/')[3];
        return ok(res, { ok: await markShared(achUserId, id) });
      }
      if (path.match(/^\/api\/achievements\/[^/]+\/ack$/) && m === 'POST') {
        const id = path.split('/')[3];
        return ok(res, { ok: await markAcknowledged(achUserId, id) });
      }
      // Any other achievements POST → ok
      return ok(res, { ok: true });
    }

    // ── NOT AUTHENTICATED: demo data ────────────────────────────────────
    const DEMO_ACHIEVEMENTS = [
      { id:'primeros-100', name:'Primeros 100', description:'Llegaste a 100 seguidores', category:'crecimiento', rarity:'común', emoji:'🌱', badgeIcon:'sprout', flavorText:'Toda planta empieza por una semilla.', unlockCondition:'Alcanzar 100 seguidores', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Acabo de cruzar 100 seguidores 🌱' },
      { id:'club-mil', name:'Club de los Mil', description:'1.000 seguidores reales', category:'crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'rocket', flavorText:'Mil ojos. Mil corazones. Esto es real.', unlockCondition:'Alcanzar 1.000 seguidores', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'¡1.000 seguidores! 🚀' },
      { id:'cinco-mil', name:'5K', description:'5.000 seguidores', category:'crecimiento', rarity:'rara', emoji:'⭐', badgeIcon:'star', flavorText:'Ya no es casualidad. Es construcción.', unlockCondition:'Alcanzar 5.000 seguidores', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Llegamos a 5K ⭐' },
      { id:'diez-mil', name:'Membresía 10K', description:'10.000 seguidores · gold tier', category:'crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'trophy', flavorText:'Diez mil personas eligieron escucharte.', unlockCondition:'Alcanzar 10.000 seguidores', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K seguidores 🏆 Gracias a cada uno.' },
      { id:'cien-mil', name:'Élite 100K', description:'Seis cifras. Una comunidad gigante.', category:'crecimiento', rarity:'legendaria', emoji:'👑', badgeIcon:'crown', flavorText:'Te lo ganaste con esfuerzo. Bienvenido a la élite.', unlockCondition:'Alcanzar 100.000 seguidores', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100.000 seguidores 👑 Histórico.' },
      { id:'millon', name:'Un Millón', description:'Un millón de personas', category:'crecimiento', rarity:'mítica', emoji:'💎', badgeIcon:'diamond', flavorText:'Esto se cuenta a los nietos.', unlockCondition:'Alcanzar 1.000.000 seguidores', points:5000, hidden:false, unlockSound:'mythic-revelation', unlockAnimation:'cosmic-reveal', shareableText:'UN MILLÓN 💎' },
      { id:'racha-7', name:'Semana ganadora', description:'7 días seguidos sumando seguidores', category:'crecimiento', rarity:'común', emoji:'🔥', badgeIcon:'flame', flavorText:'Una semana entera para arriba.', unlockCondition:'7 días seguidos con delta positivo', points:30, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'7 días seguidos creciendo 🔥' },
      { id:'racha-30', name:'Mes Inquebrantable', description:'30 días seguidos sumando seguidores', category:'crecimiento', rarity:'épica', emoji:'🌋', badgeIcon:'volcano', flavorText:'Un mes entero sin pausa.', unlockCondition:'30 días seguidos con delta positivo', points:200, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'30 días creciendo sin parar 🌋' },
      { id:'primer-mil-likes', name:'Primer mil likes', description:'1000 likes acumulados', category:'engagement', rarity:'común', emoji:'❤️', badgeIcon:'heart', flavorText:'Mil corazoncitos. No es poco.', unlockCondition:'Acumular 1000 likes', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'1K likes ❤️' },
      { id:'engagement-5pct', name:'Engagement de fuego', description:'Engagement rate sostenido > 5%', category:'engagement', rarity:'rara', emoji:'🔥', badgeIcon:'fire', flavorText:'Tu audiencia te ama.', unlockCondition:'Engagement rate promedio > 5% con 10+ posts', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Engagement rate +5% sostenido 🔥' },
      { id:'engagement-10pct', name:'Engagement de leyenda', description:'ER promedio > 10%', category:'engagement', rarity:'legendaria', emoji:'⚡', badgeIcon:'lightning', flavorText:'Esto es performance de top 1% mundial.', unlockCondition:'Engagement rate promedio > 10% con 20+ posts', points:500, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'ER promedio +10% 🤯' },
      { id:'cien-saves', name:'Save Master', description:'100 saves en un solo post', category:'engagement', rarity:'rara', emoji:'🔖', badgeIcon:'bookmark', flavorText:'Que guarden es la mejor métrica.', unlockCondition:'Un post con 100+ saves', points:60, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Mi post fue guardado 100+ veces 🔖' },
      { id:'mil-saves', name:'Maestro del Save', description:'1000+ saves en un post', category:'engagement', rarity:'épica', emoji:'📚', badgeIcon:'books', flavorText:'Tu contenido se vuelve referencia.', unlockCondition:'Un post con 1000+ saves', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'1000+ saves en un post 📚' },
      { id:'primer-post', name:'Primera Pieza', description:'Publicaste tu primer post', category:'contenido', rarity:'común', emoji:'🎬', badgeIcon:'clapboard', flavorText:'El que arranca, gana.', unlockCondition:'Publicar 1+ post', points:5, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Empecé 🎬' },
      { id:'diez-posts', name:'10 piezas', description:'Publicaste 10 posts', category:'contenido', rarity:'común', emoji:'✏️', badgeIcon:'pencil', flavorText:'La consistencia es difícil. Lo estás haciendo.', unlockCondition:'Publicar 10+ posts', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'10 piezas publicadas ✏️' },
      { id:'cien-posts', name:'Productor', description:'100 posts publicados', category:'contenido', rarity:'rara', emoji:'🎯', badgeIcon:'target', flavorText:'Cien piezas. Cien chances de ser visto.', unlockCondition:'Publicar 100+ posts', points:150, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'100 posts 🎯' },
      { id:'mil-posts', name:'Maquinista', description:'1000 posts publicados', category:'contenido', rarity:'épica', emoji:'⚙️', badgeIcon:'gear', flavorText:'Tu cuenta es una máquina. Y la manejás.', unlockCondition:'Publicar 1000+ posts', points:800, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'1000 piezas publicadas ⚙️' },
      { id:'top-performer-uno', name:'Tu Primer Top', description:'Tu primer post top performer', category:'contenido', rarity:'común', emoji:'🌟', badgeIcon:'star-twinkle', flavorText:'Algo conectó. Recordalo.', unlockCondition:'Tener 1+ post marcado como top performer', points:25, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'Mi primer top post 🌟' },
      { id:'top-performer-cinco', name:'Quinto Top', description:'5 posts top performers', category:'contenido', rarity:'rara', emoji:'⭐', badgeIcon:'stars', flavorText:'No fue suerte. Es patrón.', unlockCondition:'Tener 5+ top performers', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'5 top posts ⭐' },
      { id:'stories-diaria', name:'Story Daily', description:'7 días seguidos publicando stories', category:'contenido', rarity:'rara', emoji:'📱', badgeIcon:'phone', flavorText:'Estar todos los días no es fácil. Vos sí.', unlockCondition:'7 días consecutivos con stories', points:70, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'7 días de stories diarias 📱' },
      { id:'primera-respuesta', name:'Primera Respuesta', description:'Respondiste tu primer DM', category:'comunidad', rarity:'común', emoji:'💬', badgeIcon:'message-circle', flavorText:'Empezó la conversación.', unlockCondition:'Responder al menos 1 DM', points:5, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
      { id:'cien-respuestas', name:'Conversador', description:'100 DMs respondidos', category:'comunidad', rarity:'rara', emoji:'🗣️', badgeIcon:'speech', flavorText:'Cada DM contestado es un voto de confianza.', unlockCondition:'Responder 100+ DMs', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'100 conversaciones 🗣️' },
      { id:'primer-embajador', name:'Tu Primer Embajador', description:'Promoviste un fan a tier embajador', category:'comunidad', rarity:'rara', emoji:'🤝', badgeIcon:'handshake', flavorText:'Alguien defiende tu marca sin que se lo pidas.', unlockCondition:'1+ fan en tier "embajador"', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'diez-superfans', name:'Núcleo Caliente', description:'10 super-fans activos', category:'comunidad', rarity:'épica', emoji:'💛', badgeIcon:'heart-pulse', flavorText:'Diez personas hablan de vos sin que las pinches.', unlockCondition:'10+ super-fans', points:200, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10 super-fans 💛' },
      { id:'primer-lead', name:'Primer Lead', description:'Detectaste tu primer lead calificado', category:'ventas', rarity:'común', emoji:'🎯', badgeIcon:'target', flavorText:'Detrás de cada lead hay una vida.', unlockCondition:'Crear 1+ lead en pipeline', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
      { id:'primer-cierre', name:'Primera Venta', description:'Tu primera venta cerrada', category:'ventas', rarity:'rara', emoji:'💰', badgeIcon:'money-bag', flavorText:'El primer cliente nunca se olvida.', unlockCondition:'1+ lead en stage "won"', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'Primera venta cerrada 💰' },
      { id:'mil-usd', name:'Mil dólares', description:'Facturaste $1000+ acumulados', category:'ventas', rarity:'rara', emoji:'💵', badgeIcon:'cash', flavorText:'Mil USD. Empieza lo serio.', unlockCondition:'Revenue acumulado >= $1000', points:200, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'diez-mil-usd', name:'$10K', description:'Cinco cifras facturadas', category:'ventas', rarity:'épica', emoji:'💎', badgeIcon:'gem', flavorText:'Diez mil USD significa que tu marca convierte.', unlockCondition:'Revenue >= $10K', points:600, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
      { id:'primer-dia-completo', name:'Día Completo', description:'Usaste el sistema un día entero', category:'rituales', rarity:'común', emoji:'☀️', badgeIcon:'sun', flavorText:'Un día con vos. Mil más por venir.', unlockCondition:'Login en mañana, tarde y noche del mismo día', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
      { id:'fundador-mes', name:'Mes Founder', description:'30 días usando FeedIA', category:'rituales', rarity:'rara', emoji:'📅', badgeIcon:'calendar', flavorText:'Un mes con FeedIA. Estás cambiando hábitos.', unlockCondition:'30 días activos', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'fundador-año', name:'Un Año Juntos', description:'365 días con el sistema', category:'rituales', rarity:'legendaria', emoji:'🌍', badgeIcon:'globe', flavorText:'Un año entero. Mirá hasta dónde llegaste.', unlockCondition:'365 días activos', points:1500, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'Un año con FeedIA 🌍' },
      { id:'primer-workflow', name:'Primer Workflow', description:'Ejecutaste tu primer workflow', category:'maestría', rarity:'común', emoji:'⚡', badgeIcon:'bolt', flavorText:'Le diste cuerda al sistema.', unlockCondition:'Ejecutar 1+ workflow', points:10, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
      { id:'goal-completado', name:'Goal Completado', description:'Cumpliste tu primera meta', category:'maestría', rarity:'rara', emoji:'🏁', badgeIcon:'flag', flavorText:'Lo dijiste. Lo hiciste.', unlockCondition:'Completar 1+ meta', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'cinco-goals', name:'Cumplidor', description:'5 metas completadas', category:'maestría', rarity:'épica', emoji:'🎖️', badgeIcon:'medal', flavorText:'Cinco veces te propusiste algo. Cinco veces lo hiciste.', unlockCondition:'Completar 5+ metas', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
      { id:'todas-categorias', name:'Polifacético', description:'Desbloqueaste al menos 1 logro en cada categoría', category:'maestría', rarity:'épica', emoji:'🎭', badgeIcon:'mask', flavorText:'No te quedaste en una sola área. Todas te interesan.', unlockCondition:'Al menos 1 logro de cada categoría', points:400, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'' },
      { id:'boost-master', name:'Boost Master', description:'10+ boosts post-publicación con lift positivo', category:'maestría', rarity:'rara', emoji:'🚀', badgeIcon:'rocket-launch', flavorText:'Sabés sacar el jugo a la ventana del algoritmo.', unlockCondition:'10+ boosts exitosos', points:120, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'noche-creativa', name:'Búho Creativo', description:'Publicaste algo después de medianoche', category:'especiales', rarity:'común', emoji:'🦉', badgeIcon:'owl', flavorText:'Las mejores ideas vienen tarde.', unlockCondition:'???', points:25, hidden:true, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'' },
      { id:'viernes-13', name:'Viernes 13', description:'Publicaste un viernes 13', category:'especiales', rarity:'rara', emoji:'🔮', badgeIcon:'crystal-ball', flavorText:'No hay supersticiones cuando hay valor real.', unlockCondition:'???', points:35, hidden:true, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'' },
      { id:'cero-pendientes', name:'Inbox Zero', description:'Cero conversaciones pendientes', category:'especiales', rarity:'rara', emoji:'🧘', badgeIcon:'lotus', flavorText:'La paz mental viene de no tener pendientes.', unlockCondition:'???', points:40, hidden:true, unlockSound:'rare-fanfare', unlockAnimation:'sparkle', shareableText:'Inbox zero 🧘' },
      { id:'comeback', name:'Renacer', description:'Volviste después de mucho tiempo', category:'especiales', rarity:'épica', emoji:'🔥', badgeIcon:'phoenix-feather', flavorText:'Los que vuelven, vuelven más fuertes.', unlockCondition:'???', points:100, hidden:true, unlockSound:'epic-orchestra', unlockAnimation:'phoenix-rise', shareableText:'' },
      { id:'tt-100-seg', name:'Primeros 100 en TikTok', description:'100 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'común', emoji:'🎵', badgeIcon:'tiktok-sprout', flavorText:'TikTok te conoce.', unlockCondition:'Alcanzar 100 seguidores en TikTok', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 seguidores en TikTok 🎵' },
      { id:'tt-500-seg', name:'500 Seguidores', description:'500 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'común', emoji:'🎬', badgeIcon:'tiktok-grow', flavorText:'Tu contenido resonó.', unlockCondition:'Alcanzar 500 seguidores en TikTok', points:25, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'500 seguidores en TikTok 🎬' },
      { id:'tt-1k-seg', name:'Club TikTok 1K', description:'1.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'tiktok-rocket', flavorText:'Mil personas te siguen.', unlockCondition:'Alcanzar 1.000 seguidores en TikTok', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K seguidores en TikTok 🚀' },
      { id:'tt-2.5k-seg', name:'2.5K TikTokers', description:'2.500 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'⭐', badgeIcon:'tiktok-star', flavorText:'El algoritmo te ama.', unlockCondition:'Alcanzar 2.500 seguidores en TikTok', points:75, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'2.5K en TikTok ⭐' },
      { id:'tt-5k-seg', name:'5K Viral', description:'5.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'rara', emoji:'🔥', badgeIcon:'tiktok-flame', flavorText:'Tu contenido quema.', unlockCondition:'Alcanzar 5.000 seguidores en TikTok', points:100, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'5K en TikTok 🔥' },
      { id:'tt-10k-seg', name:'Creador TikTok 10K', description:'10.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'tiktok-trophy', flavorText:'Ya sos creator de verdad.', unlockCondition:'Alcanzar 10.000 seguidores en TikTok', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K creators en TikTok 🏆' },
      { id:'tt-25k-seg', name:'25K Influencer', description:'25.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'épica', emoji:'👑', badgeIcon:'tiktok-crown', flavorText:'Ya sois influencer.', unlockCondition:'Alcanzar 25.000 seguidores en TikTok', points:400, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'25K influencer en TikTok 👑' },
      { id:'tt-50k-seg', name:'50K Star', description:'50.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'legendaria', emoji:'💫', badgeIcon:'tiktok-star-burst', flavorText:'Medio millón de ojos sobre vos.', unlockCondition:'Alcanzar 50.000 seguidores en TikTok', points:600, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'50K star en TikTok 💫' },
      { id:'tt-100k-seg', name:'TikTok Celeb 100K', description:'100.000 seguidores en TikTok', category:'tiktok-crecimiento', rarity:'legendaria', emoji:'🌟', badgeIcon:'tiktok-celebrity', flavorText:'Seis cifras. Sos celebridad.', unlockCondition:'Alcanzar 100.000 seguidores en TikTok', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K celebridad en TikTok 🌟' },
      { id:'tt-100-likes', name:'Primeros 100 Likes TT', description:'100 likes totales en TikTok', category:'tiktok-engagement', rarity:'común', emoji:'❤️', badgeIcon:'tiktok-heart', flavorText:'Primeros corazones en TikTok.', unlockCondition:'100 likes acumulados en TikTok', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 likes en TikTok ❤️' },
      { id:'tt-1k-likes', name:'Mil Corazones TT', description:'1.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'rara', emoji:'💕', badgeIcon:'tiktok-hearts', flavorText:'Tu contenido late fuerte.', unlockCondition:'1.000 likes acumulados en TikTok', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K likes en TikTok 💕' },
      { id:'tt-10k-likes', name:'10K Viral TT', description:'10.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'épica', emoji:'🔥', badgeIcon:'tiktok-viral', flavorText:'Tu contenido es viral.', unlockCondition:'10.000 likes acumulados en TikTok', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K viral en TikTok 🔥' },
      { id:'tt-100k-likes', name:'100K Mega Viral', description:'100.000 likes totales en TikTok', category:'tiktok-engagement', rarity:'legendaria', emoji:'💎', badgeIcon:'tiktok-mega', flavorText:'Cien mil corazones.', unlockCondition:'100.000 likes acumulados en TikTok', points:800, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K mega viral en TikTok 💎' },
      { id:'tt-1m-likes', name:'1M Fenómeno', description:'1 millón de likes totales en TikTok', category:'tiktok-engagement', rarity:'mítica', emoji:'👑', badgeIcon:'tiktok-million', flavorText:'Un millón de corazones. Sos historia.', unlockCondition:'1.000.000 likes acumulados en TikTok', points:2000, hidden:false, unlockSound:'mythic-revelation', unlockAnimation:'cosmic-reveal', shareableText:'1M en TikTok 👑' },
      { id:'ig-100-seg', name:'Primeros 100 en Instagram', description:'100 seguidores en Instagram', category:'instagram-crecimiento', rarity:'común', emoji:'📸', badgeIcon:'ig-sprout', flavorText:'Instagram te conoce.', unlockCondition:'Alcanzar 100 seguidores en Instagram', points:15, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 seguidores en Instagram 📸' },
      { id:'ig-1k-seg', name:'Club Instagram 1K', description:'1.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'rara', emoji:'🚀', badgeIcon:'ig-rocket', flavorText:'Mil personas en tu feed.', unlockCondition:'Alcanzar 1.000 seguidores en Instagram', points:50, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K en Instagram 🚀' },
      { id:'ig-10k-seg', name:'Creador Instagram 10K', description:'10.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'épica', emoji:'🏆', badgeIcon:'ig-trophy', flavorText:'Sos creador de Instagram.', unlockCondition:'Alcanzar 10.000 seguidores en Instagram', points:250, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K creador en Instagram 🏆' },
      { id:'ig-100k-seg', name:'Instagram Celebrity 100K', description:'100.000 seguidores en Instagram', category:'instagram-crecimiento', rarity:'legendaria', emoji:'👑', badgeIcon:'ig-crown', flavorText:'Seis cifras en Instagram.', unlockCondition:'Alcanzar 100.000 seguidores en Instagram', points:1000, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K en Instagram 👑' },
      { id:'ig-100-likes', name:'Primeros 100 Likes IG', description:'100 likes totales en Instagram', category:'instagram-engagement', rarity:'común', emoji:'❤️', badgeIcon:'ig-heart', flavorText:'Instagram te quiere.', unlockCondition:'100 likes acumulados en Instagram', points:20, hidden:false, unlockSound:'common-chime', unlockAnimation:'sparkle', shareableText:'100 likes en Instagram ❤️' },
      { id:'ig-1k-likes', name:'Mil Corazones IG', description:'1.000 likes totales en Instagram', category:'instagram-engagement', rarity:'rara', emoji:'💕', badgeIcon:'ig-hearts', flavorText:'Tu feed enamora.', unlockCondition:'1.000 likes acumulados en Instagram', points:80, hidden:false, unlockSound:'rare-fanfare', unlockAnimation:'confetti-burst', shareableText:'1K likes en Instagram 💕' },
      { id:'ig-10k-likes', name:'10K Hit IG', description:'10.000 likes totales en Instagram', category:'instagram-engagement', rarity:'épica', emoji:'🔥', badgeIcon:'ig-viral', flavorText:'Tu contenido es un hit.', unlockCondition:'10.000 likes acumulados en Instagram', points:300, hidden:false, unlockSound:'epic-orchestra', unlockAnimation:'star-explosion', shareableText:'10K hit en Instagram 🔥' },
      { id:'ig-100k-likes', name:'100K Sensación', description:'100.000 likes totales en Instagram', category:'instagram-engagement', rarity:'legendaria', emoji:'💎', badgeIcon:'ig-mega', flavorText:'Cien mil interacciones.', unlockCondition:'100.000 likes acumulados en Instagram', points:800, hidden:false, unlockSound:'legendary-choir', unlockAnimation:'phoenix-rise', shareableText:'100K sensación en Instagram 💎' },
    ];

    // Demo: 6 achievements pre-desbloqueados para mostrar el sistema
    const DEMO_UNLOCKED_IDS = ['primer-post','primera-respuesta','primer-dia-completo','primeros-100','primer-workflow','racha-7'];
    const DEMO_UNLOCKED = DEMO_UNLOCKED_IDS.map((id, i) => {
      const def = DEMO_ACHIEVEMENTS.find(a => a.id === id);
      return def ? {
        ...def,
        achievementId: id,
        unlockedAt: new Date(Date.now() - (DEMO_UNLOCKED_IDS.length - i) * 86400000).toISOString(),
        shared: false,
        acknowledged: true,
      } : null;
    }).filter(Boolean);

    const DEMO_UNLOCKED_POINTS = DEMO_UNLOCKED.reduce((s, a) => s + a.points, 0);
    const DEMO_EPIC_PLUS = DEMO_UNLOCKED.filter(a => ['épica','legendaria','mítica'].includes(a.rarity)).length;

    if (path === '/api/achievements' && m === 'GET') {
      return ok(res, DEMO_ACHIEVEMENTS);
    }
    if (path === '/api/achievements/unlocked' && m === 'GET') {
      return ok(res, DEMO_UNLOCKED);
    }
    if (path === '/api/achievements/snapshot' && m === 'GET') {
      return ok(res, {
        totalUnlocked: DEMO_UNLOCKED.length,
        totalAvailable: DEMO_ACHIEVEMENTS.length,
        totalPoints: DEMO_UNLOCKED_POINTS,
        byCategory: {},
        byRarity: { común: DEMO_UNLOCKED.filter(a=>a.rarity==='común').length, rara: DEMO_UNLOCKED.filter(a=>a.rarity==='rara').length, épica: 0, legendaria: 0, mítica: 0 },
        completionPct: (DEMO_UNLOCKED.length / DEMO_ACHIEVEMENTS.length) * 100,
        rareUnlocked: DEMO_UNLOCKED.filter(a=>a.rarity==='rara').length,
        epicUnlocked: 0,
        legendaryUnlocked: 0,
        mythicUnlocked: 0,
        lastUnlocked: { name: 'Semana ganadora', at: new Date(Date.now() - 86400000).toISOString() },
      });
    }
    if (path === '/api/achievements/next' && m === 'GET') {
      const unlockedIds = new Set(DEMO_UNLOCKED_IDS);
      return ok(res, DEMO_ACHIEVEMENTS
        .filter(a => !unlockedIds.has(a.id) && !a.hidden)
        .slice(0, 5)
        .map(a => ({ achievement: a, progressHint: 'Modo demo — conectá el backend para progreso real' }))
      );
    }
    if (path === '/api/achievements/unacknowledged' && m === 'GET') {
      return ok(res, []);
    }
    if (path.startsWith('/api/achievements/') && m === 'POST') {
      return ok(res, { ok: true, demoMode: true });
    }
    if (path === '/api/achievements/evaluate' && m === 'POST') {
      return ok(res, []);
    }
  }

  // ── Fallback amigable: 200 con demoMode, no 404 ─────────────────────────
  return accepted(res, NOT_REAL(path));
};

// Wrapper top-level: captura errores + métricas, sin bloquear handler en caso de obs.
export default async (req, res) => {
  const startedAt = Date.now();
  try {
    await innerHandler(req, res);
  } catch (err) {
    try {
      const url = new URL(req.url || '/', 'http://x');
      const ctxUser = await (async () => {
        try {
          return (await getSessionFromReq(req))?.user;
        } catch {
          return null;
        }
      })();
      await logError({ req, err, ctx: { userId: ctxUser?.id || null, note: `path=${url.pathname}` } });
    } catch {
      /* obs ya es safe */
    }
    if (!res.headersSent) {
      try {
        res.statusCode = 500;
        res.setHeader('content-type', 'application/json');
        res.end(JSON.stringify({ error: 'internal-error', message: String(err?.message || err).slice(0, 300) }));
      } catch {
        /* socket roto */
      }
    }
  } finally {
    try {
      const url = new URL(req.url || '/', 'http://x');
      logHit({ path: url.pathname, method: req.method }).catch(() => {});
      res.setHeader?.('x-feedia-latency', String(Date.now() - startedAt));
    } catch {
      /* idem */
    }
  }
};
