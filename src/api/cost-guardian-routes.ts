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
 * POST   /api/cost-guardian/config          — set/update fixed monthly costs, ceiling, ratio (merge por clave)
 * GET    /api/cost-guardian/config          — leer política actual
 * DELETE /api/cost-guardian/config/fixed-cost/:name — eliminar un costo fijo mensual
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
  removeFixedMonthlyCost,
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
    // Merge por clave — { railway: 20 } solo actualiza "railway", no borra las demás.
    fixedMonthlyCosts: z.record(z.string(), z.number().nonnegative()).optional(),
    preRevenueCeilingUsd: z.number().positive().optional(),
    revenueRatioLimitPct: z.number().positive().max(100).optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'At least one field required' });

const RemoveFixedCostSchema = z.object({
  name: z.string().min(1),
});

router.post('/cost', (req: Request, res: Response): void => {
  const parsed = CostSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const entry = recordExternalCost(parsed.data.source as CostSource, parsed.data.amountUsd, parsed.data.description);
    return res.json({ ok: true, entry });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to record cost', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.post('/revenue', (req: Request, res: Response): void => {
  const parsed = RevenueSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const entry = recordRevenue(parsed.data.source as RevenueSource, parsed.data.amountUsd, parsed.data.description);
    return res.json({ ok: true, entry });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to record revenue', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const days = Number(req.query.days) || 30;
    const evaluate = req.query.evaluate === 'true';
    const status = evaluate ? await evaluateAndAlert(days) : getFinancialStatus(days);
    return res.json({ ok: true, status });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to get status', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/history', (req: Request, res: Response): void => {
  try {
    const limit = Number(req.query.limit) || 100;
    return res.json({
      ok: true,
      costs: getCostHistory(limit),
      revenue: getRevenueHistory(limit),
    });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to get history', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.get('/config', (_req: Request, res: Response): void => {
  return res.json({ ok: true, config: getConfig() });
});

router.post('/config', (req: Request, res: Response): void => {
  const parsed = ConfigSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const config = updateConfig(parsed.data);
    return res.json({ ok: true, config });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to update config', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

router.delete('/config/fixed-cost/:name', (req: Request, res: Response): void => {
  const parsed = RemoveFixedCostSchema.safeParse({ name: req.params.name });
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: parsed.error.issues });
    return;
  }
  try {
    const config = removeFixedMonthlyCost(parsed.data.name);
    return res.json({ ok: true, config });
  } catch (err) {
    log.error('[CostGuardianRoutes] Failed to remove fixed cost', { error: String(err) });
    return res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
