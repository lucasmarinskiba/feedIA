import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { startHttp, json, text, type RouteDefinition, type RouteHandler } from './http.js';
import { onVoiceSocketConnect } from './voiceSocket.js';
import { buildDashboardRoutes } from './dashboardApi.js';

import { buildExtendedRoutes } from './extendedRoutes.js';
import { buildSkillsRoutes } from './skillsRoutes.js';
import { carouselDesignerRoutes } from './carouselDesignerRoutes.js';
import { authRoutes } from './authRoutes.js';
import { startSchedulerLoop } from './schedulerLoop.js';
import { buildStudioRoutes } from './studioApi.js';
import { buildCanvaOAuthRoutes } from './canvaOAuthRoutes.js';
import { buildHiggsfieldRoutes } from './higgsfieldRoutes.js';
import { buildOAuthRoutes } from './oauthRoutes.js';
import { voiceRoutes } from './voiceApi.js';
import { buildGlassBoxRoutes } from './glassboxApi.js';
import { buildCalendarRoutes } from './calendarApi.js';
import { buildOnboardingRoutes } from './onboardingApi.js';
import { buildStrategyRoutes } from './strategyApi.js';
import { buildCapCutWebhookRoutes } from './capcutWebhookRoute.js';
import { buildInShotWebhookRoutes } from './inshotWebhookRoute.js';
import { startAutonomousOS } from '../os/autonomousCore.js';
import { buildVerifyHandler, buildEventHandler } from './metaWebhook.js';
import { startScheduler } from '../scheduler/index.js';
import { startTriggerConnector } from '../agent/triggerConnector.js';
import { env } from '../config/index.js';
import { initBrandRegistry } from '../config/brandRegistry.js';
import { initMemory } from '../agent/memory.js';
import { log } from '../agent/logger.js';
import { initSentry } from '../observability/sentry.js';

initSentry();

const moduleDir = dirname(fileURLToPath(import.meta.url));

const STATIC_CANDIDATES = [
  resolve(moduleDir, 'static'),
  resolve(moduleDir, '../../src/server/static'),
  resolve(process.cwd(), 'src/server/static'),
];

const findStaticDir = (): string | null => {
  for (const c of STATIC_CANDIDATES) {
    if (existsSync(c) && statSync(c).isDirectory()) return c;
  }
  return null;
};

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

/**
 * Set de extensiones que son "assets" (archivos físicos esperados).
 * Si el cliente pide /views/foo.js y NO existe, debe recibir 404 REAL — NUNCA el
 * index.html como fallback. Si recibiera index.html, el browser intentaría parsearlo
 * como JS y explotaría con "Unexpected token '<', '<!doctype'... is not valid JSON".
 */
const ASSET_EXTENSIONS = new Set([
  '.js',
  '.mjs',
  '.cjs',
  '.css',
  '.json',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.ico',
  '.mp4',
  '.mp3',
  '.wav',
  '.webm',
  '.ogg',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.pdf',
  '.txt',
  '.xml',
  '.wasm',
]);

const buildStaticHandler =
  (staticDir: string): RouteHandler =>
  async ({ req, res }) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    const safe = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
    if (safe.includes('..')) {
      text(res, 400, 'invalid path');
      return;
    }
    const fullPath = join(staticDir, safe);
    const ext = extname(fullPath).toLowerCase();
    const isAssetRequest = ASSET_EXTENSIONS.has(ext);

    if (!existsSync(fullPath) || !statSync(fullPath).isFile()) {
      // ASSET no existe → 404 REAL con content-type correcto para que el browser no se confunda.
      // SPA navigation (sin extensión) → sí cae al index.html.
      if (isAssetRequest) {
        const errBody = JSON.stringify({
          error: 'asset-not-found',
          path: urlPath,
          hint: 'El archivo solicitado no existe. Si lo agregaste recientemente, corré `npm run build` y reiniciá el servidor.',
        });
        res.statusCode = 404;
        res.setHeader('content-type', 'application/json; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        res.end(errBody);
        return;
      }
      if (safe !== 'index.html') {
        const indexPath = join(staticDir, 'index.html');
        if (existsSync(indexPath)) {
          const html = readFileSync(indexPath);
          res.statusCode = 200;
          res.setHeader('content-type', MIME['.html'] ?? 'text/html');
          res.end(html);
          return;
        }
      }
      text(res, 404, 'not found');
      return;
    }
    const ct = MIME[ext] ?? 'application/octet-stream';
    res.statusCode = 200;
    res.setHeader('content-type', ct);
    res.end(readFileSync(fullPath));
  };

export interface DaemonOptions {
  port?: number;
  metaVerifyToken?: string;
  metaAppSecret?: string;
  enableScheduler?: boolean;
  enableHttp?: boolean;
  enableTriggers?: boolean;
}

export const startDaemon = (opts: DaemonOptions = {}): { stop: () => void } => {
  // Stable brand object (multi-tenant en caliente). Its identity never
  // changes; activateBrandProfile() mutates its contents in place so every
  // route that captured it serves the new account without a restart.
  const brand = initBrandRegistry();
  initMemory(brand);
  const port = opts.port ?? Number(process.env['DAEMON_PORT'] ?? 7321);
  const verifyToken = opts.metaVerifyToken ?? process.env['META_VERIFY_TOKEN'] ?? '';
  const appSecret = opts.metaAppSecret ?? process.env['META_APP_SECRET'] ?? '';

  let stopScheduler: (() => void) | null = null;
  if (opts.enableScheduler !== false) {
    const handle = startScheduler(brand);
    stopScheduler = handle.stop;
  }

  // Start trigger connector (event bus → agent triggers)
  if (opts.enableTriggers !== false) {
    startTriggerConnector(brand);
  }

  let httpClose: (() => void) | null = null;
  if (opts.enableHttp !== false) {
    const dashboardRoutes = buildDashboardRoutes(brand);
    const webhookRoutes: RouteDefinition[] = [];
    if (verifyToken) {
      webhookRoutes.push({
        method: 'GET',
        pattern: '/webhook/meta',
        handler: buildVerifyHandler(verifyToken),
      });
      webhookRoutes.push({
        method: 'POST',
        pattern: '/webhook/meta',
        handler: buildEventHandler(brand, appSecret),
      });
      log.info(`Webhook Meta habilitado: GET/POST /webhook/meta`);
    } else {
      log.warn('META_VERIFY_TOKEN no configurado: webhook entrante deshabilitado.');
    }

    const staticDir = findStaticDir();
    const staticHandler = staticDir ? buildStaticHandler(staticDir) : null;
    if (!staticDir) {
      log.warn('No se encontró src/server/static. El dashboard no se servirá.');
    }

    // Fallback inteligente: para rutas /api/* siempre devolver JSON 404
    // (nunca caer al staticHandler que devuelve index.html — eso rompe los fetch del frontend
    // con "Unexpected token '<', '<!doctype'... is not valid JSON").
    const fallback: RouteHandler = (ctx): void => {
      const url = ctx.req.url ?? '';
      const path = url.split('?')[0] ?? '';
      if (path.startsWith('/api/') || path.startsWith('/api')) {
        json(ctx.res, 404, {
          error: 'endpoint-not-found',
          path,
          method: ctx.req.method,
          hint: 'El endpoint solicitado no existe en este servidor. Si lo agregaste recientemente, asegurate de haber corrido `npm run build` y reiniciado el servidor (`npm start`).',
        });
        return;
      }
      if (staticHandler) {
        staticHandler(ctx);
        return;
      }
      json(ctx.res, 404, { error: 'Not found' });
    };

    const studioRoutes = buildStudioRoutes(brand);
    const calendarRoutes = buildCalendarRoutes();
    const onboardingRoutes = buildOnboardingRoutes();
    const capcutWebhookRoutes = buildCapCutWebhookRoutes();
    const inshotWebhookRoutes = buildInShotWebhookRoutes();
    const canvaOAuthRoutes = buildCanvaOAuthRoutes();
    const higgsfieldRoutes = buildHiggsfieldRoutes();
    const glassboxRoutes = buildGlassBoxRoutes();
    const extendedRoutes = buildExtendedRoutes(brand);
    const skillsRoutes = buildSkillsRoutes();
    const oauthRoutes = buildOAuthRoutes(brand);
    const strategyRoutes = buildStrategyRoutes(brand);
    const allRoutes = [
      ...dashboardRoutes,
      ...extendedRoutes,
      ...skillsRoutes,
      ...carouselDesignerRoutes,
      ...studioRoutes,
      ...calendarRoutes,
      ...onboardingRoutes,
      ...capcutWebhookRoutes,
      ...inshotWebhookRoutes,
      ...canvaOAuthRoutes,
      ...higgsfieldRoutes,
      ...oauthRoutes,
      ...voiceRoutes,
      ...webhookRoutes,
      ...glassboxRoutes,
      ...strategyRoutes,
      ...authRoutes,
    ];

    // Scheduler background loop — publica carruseles programados cada 2 min
    startSchedulerLoop();

    const handle = startHttp(port, allRoutes, fallback, (req, socket, _head) => {
      if (req.url === '/ws/voice') {
        const sessionId = `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        onVoiceSocketConnect(
          {
            send: (data) => socket.write(`data: ${data}\n\n`),
            on: (event, cb) => {
              if (event === 'message') socket.on('data', (chunk) => cb(chunk.toString()));
              if (event === 'close') socket.on('close', () => cb());
              if (event === 'error') socket.on('error', (err) => cb(err));
            },
          },
          sessionId,
        );
        socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n');
      } else {
        socket.destroy();
      }
    });
    httpClose = handle.close;
    log.success(`Dashboard: http://localhost:${port}`);
    log.info(`Modo: dryRun=${env.dryRun} bot=${env.bot.autoReplyEnabled} timezone=${env.timezone}`);
    log.info(`Voz/IA: POST /api/talia/chat | GET /api/hub/summary | GET /api/os/status`);

    // Iniciar OS autónomo en background
    void startAutonomousOS().catch((e) => log.warn(`OS init: ${(e as Error).message}`));
  }

  return {
    stop: (): void => {
      stopScheduler?.();
      httpClose?.();
      log.info('Daemon detenido');
    },
  };
};
