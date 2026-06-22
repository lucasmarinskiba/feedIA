/**
 * IG Calculators — la "calculadora" del sistema
 * ─────────────────────────────────────────────────────────────────────────
 * Funciones DETERMINISTAS y puras. Los agentes las usan para no alucinar
 * números: tasa de engagement, proyección de crecimiento compuesto, plan de
 * cadencia, estimación de alcance, mezcla de hashtags y ROI de colaboración.
 * Todo verificable, sin LLM.
 */

const round = (n: number, d = 2): number => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export interface EngagementInput {
  followers: number;
  likes: number;
  comments: number;
  saves?: number;
  shares?: number;
}

/** Tasa de engagement clásica y la "ponderada 2026" (saves/shares pesan más). */
export const engagementRate = (
  i: EngagementInput,
): {
  classicPct: number;
  weightedPct: number;
  band: 'bajo' | 'normal' | 'bueno' | 'excelente';
} => {
  const f = Math.max(1, i.followers);
  const classic = ((i.likes + i.comments) / f) * 100;
  const weighted = ((i.likes + i.comments * 2 + (i.saves ?? 0) * 3 + (i.shares ?? 0) * 4) / f) * 100;
  const band = weighted >= 8 ? 'excelente' : weighted >= 4 ? 'bueno' : weighted >= 1.5 ? 'normal' : 'bajo';
  return { classicPct: round(classic), weightedPct: round(weighted), band };
};

/** Proyección de seguidores con crecimiento compuesto semanal. */
export const growthProjection = (params: {
  current: number;
  weeklyGrowthPct: number;
  weeks: number;
}): { final: number; absoluteGain: number; weekly: number[] } => {
  const r = params.weeklyGrowthPct / 100;
  const weekly: number[] = [];
  let v = params.current;
  for (let w = 0; w < Math.max(0, Math.floor(params.weeks)); w++) {
    v = v * (1 + r);
    weekly.push(Math.round(v));
  }
  const final = Math.round(v);
  return { final, absoluteGain: final - params.current, weekly };
};

/** ¿Qué crecimiento semanal necesito para llegar a una meta en N semanas? */
export const requiredWeeklyGrowth = (params: {
  current: number;
  target: number;
  weeks: number;
}): { weeklyGrowthPct: number; feasible: boolean } => {
  const w = Math.max(1, params.weeks);
  if (params.current <= 0) return { weeklyGrowthPct: 0, feasible: false };
  const ratio = params.target / params.current;
  const pct = (Math.pow(ratio, 1 / w) - 1) * 100;
  // >7%/semana sostenido es poco realista orgánicamente.
  return { weeklyGrowthPct: round(pct), feasible: pct <= 7 };
};

/** Plan de cadencia semanal sugerido según objetivo. */
export const cadencePlan = (
  goal: 'awareness' | 'engagement' | 'ventas',
): {
  reels: number;
  carruseles: number;
  posts: number;
  stories: number;
  rationale: string;
} => {
  if (goal === 'awareness') {
    return {
      reels: 4,
      carruseles: 2,
      posts: 1,
      stories: 10,
      rationale: 'Reels priorizados: máximo alcance de cuentas nuevas.',
    };
  }
  if (goal === 'ventas') {
    return {
      reels: 2,
      carruseles: 3,
      posts: 2,
      stories: 14,
      rationale: 'Carruseles + stories con CTA: educan y convierten.',
    };
  }
  return {
    reels: 3,
    carruseles: 3,
    posts: 1,
    stories: 12,
    rationale: 'Mix balanceado: alcance + profundidad para comunidad.',
  };
};

/** Estimación de alcance/impresiones de un post (rangos, no promesas). */
export const reachEstimate = (params: {
  followers: number;
  engagementRatePct: number;
  format: 'reel' | 'carrusel' | 'post' | 'historia';
}): { reachLow: number; reachHigh: number; impressionsHigh: number } => {
  const base = params.followers * (params.engagementRatePct / 100);
  const mult =
    params.format === 'reel' ? 6 : params.format === 'carrusel' ? 2.2 : params.format === 'historia' ? 0.6 : 1.4;
  const low = Math.round(params.followers * 0.18 * (params.format === 'reel' ? 1.5 : 1));
  const high = Math.round(Math.max(low, base * mult * 10 + params.followers * 0.25));
  return { reachLow: low, reachHigh: high, impressionsHigh: Math.round(high * 1.35) };
};

/** Mezcla de hashtags recomendada para un total dado (regla de pirámide). */
export const hashtagMix = (
  total: number,
): {
  nicho: number;
  medianos: number;
  amplios: number;
  marca: number;
} => {
  const t = Math.max(5, Math.min(30, Math.floor(total)));
  const marca = 1;
  const amplios = Math.max(1, Math.round(t * 0.15));
  const medianos = Math.max(1, Math.round(t * 0.35));
  const nicho = Math.max(1, t - marca - amplios - medianos);
  return { nicho, medianos, amplios, marca };
};

/** ROI estimado de una colaboración/canje. */
export const collabRoi = (params: {
  costUsd: number;
  partnerFollowers: number;
  expectedCtrPct?: number;
  conversionPct?: number;
  avgOrderUsd?: number;
}): { estReach: number; estLeads: number; estRevenueUsd: number; roi: number; verdict: string } => {
  const ctr = (params.expectedCtrPct ?? 2) / 100;
  const conv = (params.conversionPct ?? 2) / 100;
  const aov = params.avgOrderUsd ?? 0;
  const estReach = Math.round(params.partnerFollowers * 0.3);
  const estLeads = Math.round(estReach * ctr);
  const estRevenue = round(estLeads * conv * aov);
  const roi = params.costUsd > 0 ? round((estRevenue - params.costUsd) / params.costUsd, 2) : 0;
  const verdict = roi >= 1 ? 'Vale la pena' : roi >= 0 ? 'Marginal — negociar' : 'No conviene a ese costo';
  return { estReach, estLeads, estRevenueUsd: estRevenue, roi, verdict };
};

export type IgCalcOp =
  | { op: 'engagement'; input: EngagementInput }
  | { op: 'growth'; input: { current: number; weeklyGrowthPct: number; weeks: number } }
  | { op: 'required-growth'; input: { current: number; target: number; weeks: number } }
  | { op: 'cadence'; input: { goal: 'awareness' | 'engagement' | 'ventas' } }
  | {
      op: 'reach';
      input: { followers: number; engagementRatePct: number; format: 'reel' | 'carrusel' | 'post' | 'historia' };
    }
  | { op: 'hashtag-mix'; input: { total: number } }
  | { op: 'collab-roi'; input: Parameters<typeof collabRoi>[0] };

/** Dispatcher único para exponer como una sola herramienta. */
export const igCalc = (req: IgCalcOp): unknown => {
  switch (req.op) {
    case 'engagement':
      return engagementRate(req.input);
    case 'growth':
      return growthProjection(req.input);
    case 'required-growth':
      return requiredWeeklyGrowth(req.input);
    case 'cadence':
      return cadencePlan(req.input.goal);
    case 'reach':
      return reachEstimate(req.input);
    case 'hashtag-mix':
      return hashtagMix(req.input.total);
    case 'collab-roi':
      return collabRoi(req.input);
    default:
      return { error: 'operación desconocida' };
  }
};
