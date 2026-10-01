import type { Router } from 'express';
import type { BrandProfile } from '../config/types.js';
import { buildDashboardRoutes } from './dashboardApi.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';

/**
 * /api/assistant/chat — real handler lives in dashboardApi.ts's buildDashboardRoutes,
 * written for the home-grown http.js dev server (src/server/index.ts, only ever run
 * via `tsx src/cli.ts daemon`) and never mounted on this Express app. Same
 * unmounted-on-Express gap as /api/cm/* and achievements (see experienceRoutes.ts):
 * every chat request from assistant.js (full page) and chatbotUI.js (floating
 * widget) fell through to the SPA catch-all and got index.html back instead of
 * JSON, so the assistant always showed "sin conexión" in production.
 *
 * Cherry-picks only this one pattern out of buildDashboardRoutes (not the whole
 * ~3000-line route table, most of which duplicates routes already implemented
 * natively on this Express app elsewhere) to avoid colliding with those.
 */
const createAssistantChatRoute = (brand: BrandProfile): Router =>
  adaptRoutesToExpress(buildDashboardRoutes(brand).filter((r) => r.pattern === '/api/assistant/chat'));

export default createAssistantChatRoute;
