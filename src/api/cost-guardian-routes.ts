/**
 * Cost Guardian Routes — gobierno financiero (gasto vs recaudación)
 *
 * Todas admin-gated (datos financieros sensibles) — montadas en server.ts
 * detrás de adminKeyAuth.
 *
 * POST /api/cost-guardian/cost      — registrar costo externo (Railway/Backblaze/otro)
 * POST /api/cost-guardian/revenue   — registrar ingreso (manual/stripe)
 * GET  /api/cost-guardian/status    — estado financiero unificado (?days=30)
 * GET  /api/cost-guardian/history   — historial de costos + ingresos (?limit=100)
 * POST /api/cost-guardian/config    — actualizar política (railway cost, ceiling, ratio)
 * GET  /api/cost-guardian/config    — leer política actual
 */

import express, { Request, Response } from 'express';
import { z } from 'zod';
import { log } from '../agent/logger.js';
import {
  recordExternalCost,
  recordRevenue,
  getFinancialStatus,
  evaluateAndAlert,
  getConfig,
  updateConfig,
  getCostHistory,
  getRevenueHistory,
  type CostSource,
  type RevenueSource,
} from '../agent/costGuardian.js';

const router = express.Router();

const CostSchema = z.object({
  source: z.enum(['railway', 'backblaze', 'other-api', 'manual']),
  amountUsd: z.number().positive(),
  description: z.string().max(500).optional(),
});

const RevenueSchema = z.object({
  source: z.enum(['manual', 'stripe']),
  amountUsd: z.number().positive(),
  description: z.string().max(500).optional(),
});

const ConfigSchema = z
  .object({
    railwayMonthlyCostUsd: z.number().nonnegative().optional(),
    preRevenueCeilingUsd: z.number().positive().optional(),
    revenueRatioLimitPct: z.number().positive().max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });

router.post('/cost', (req: Request, res: Response): void => {
  const parsed = CostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const entry = recordExternalCost(parsed.data.source as CostSource, parsed.data.amountUsd, parsed.data.description);
    res.json({ ok: true, entry });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to record cost', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/revenue', (req: Request, res: Response): void => {
  const parsed = RevenueSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const entry = recordRevenue(parsed.data.source as RevenueSource, parsed.data.amountUsd, parsed.data.description);
    res.json({ ok: true, entry });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to record revenue', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;
    const evaluate = req.query.evaluate === 'true';
    const status = evaluate ? await evaluateAndAlert(days) : getFinancialStatus(days);
    res.json({ ok: true, status });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to get status', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/history', (req: Request, res: Response): void => {
  try {
    const limit = Number(req.query.limit) || 100;
    res.json({
      ok: true,
      costs: getCostHistory(limit),
      revenue: getRevenueHistory(limit),
    });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to get history', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/config', (_req: Request, res: Response): void => {
  res.json({ ok: true, config: getConfig() });
});

router.post('/config', (req: Request, res: Response): void => {
  const parsed = ConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const config = updateConfig(parsed.data);
    res.json({ ok: true, config });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to update config', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
