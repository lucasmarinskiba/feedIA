/**
 * Strategy API — expone el Content Strategy Engine vía HTTP.
 */

import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition, type RouteContext } from './http.js';
import { planNextContent, type StrategicBrief } from '../capabilities/strategy/index.js';
import { briefFromStrategy } from '../capabilities/pipelines/briefToPublish.js';

export const buildStrategyRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/strategy/plan',
    handler: async ({ res, query }: RouteContext): Promise<void> => {
      const windowDays = Math.min(30, Math.max(1, Number(query.windowDays ?? 7)));
      const briefsPerWindow = Math.min(20, Math.max(1, Number(query.briefsPerWindow ?? 5)));
      const plan = await planNextContent(brand, {
        windowDays,
        briefsPerWindow,
        dryRun: true,
        competitorHandles: brand.competitors,
      });
      json(res, 200, { ok: true, plan });
    },
  },
  {
    method: 'POST',
    pattern: '/api/strategy/brief/:id/publish',
    handler: async ({ res, params, body }: RouteContext): Promise<void> => {
      const brief = (body as { brief?: StrategicBrief }).brief;
      if (!brief || brief.id !== params.id) {
        json(res, 400, { ok: false, error: 'brief inválido o id no coincide' });
        return;
      }
      const outcome = await briefFromStrategy(brand, brief, {
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
      json(res, 200, { ok: true, outcome });
    },
  },
];
