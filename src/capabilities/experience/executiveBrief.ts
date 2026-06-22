/**
 * Executive Experience — la "Sala Ejecutiva" del fundador
 * ─────────────────────────────────────────────────────────────────────────
 * No es un dashboard más: es una EXPERIENCIA de estatus. Convierte la
 * operación invisible del sistema en un relato donde el usuario es el
 * visionario que, con pocas indicaciones, comanda un equipo de élite que
 * trabaja 24/7 para él.
 *
 * Todo número es DETERMINISTA y verificable (apalancamiento, equipo
 * reemplazado, dinero/horas que no paga). El relato puede elevarse con LLM
 * (presupuesto-aware) y si no, cae a una narrativa premium fija.
 *
 * Psicología de producto aplicada:
 *   • Logro y maestría  → ratio de apalancamiento "1 : N".
 *   • Estatus social    → tier (Bronce→Visionario) + credencial compartible.
 *   • Reciprocidad      → "tu equipo trabajó mientras dormías".
 *   • Escasez/exclusiv. → lenguaje de élite, no de herramienta.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { BrandProfile } from '../../config/types.js';
import { ask } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { emit } from '../../agent/bus.js';
import { getReplacementValue, PROFESSIONS_REPLACED } from '../knowledge/professionalKnowledge.js';
import { listMissions } from '../../agent/swarm/index.js';
import { listCarouselJobs } from '../content/index.js';
import { listWatchSessions } from '../computerUse/index.js';
import { getTraceStats } from '../reasoningTrace/index.js';
import { listDirectives } from '../directives/index.js';

export interface Leverage {
  indicacionesDadas: number;
  accionesEjecutadas: number;
  ratio: number; // acciones / indicaciones
  ratioLabel: string; // "1 : 84"
  equipoReemplazado: number; // nº de roles senior
  costoEquipoUsdMes: number; // sueldos que NO paga
  horasHumanasAhorradas: number; // estimación honesta
  ahorroAnualUsd: number;
}

export type Tier = 'Bronce' | 'Plata' | 'Oro' | 'Platino' | 'Visionario';

export interface Trophy {
  id: string;
  titulo: string;
  detalle: string;
  logradoEn: string;
}

export interface ExecutiveBrief {
  fundador: string; // a quién se dirige (marca)
  saludo: string;
  titular: string;
  tier: Tier;
  tierProgresoPct: number;
  leverage: Leverage;
  staff: Array<{ rol: string; estado: string }>;
  hitos: Trophy[];
  narrativa: string;
  credencial: string; // string compartible de estatus
  /** Si subió de nivel desde la última vez: ceremonia. */
  ascenso?: { de: Tier; a: Tier };
  generadoEn: string;
}

const STORE = resolve('data/runtime/experienceTrophies.json');
interface TrophyStore {
  won: Trophy[];
  lastTier?: Tier;
}
const readTrophies = (): TrophyStore => {
  if (!existsSync(STORE)) return { won: [] };
  try {
    return JSON.parse(readFileSync(STORE, 'utf-8')) as TrophyStore;
  } catch {
    return { won: [] };
  }
};
const writeTrophies = (s: TrophyStore): void => {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf-8');
};

const TIER_RANK: Tier[] = ['Bronce', 'Plata', 'Oro', 'Platino', 'Visionario'];

/** Detecta ascenso de nivel y dispara la ceremonia (una sola vez). */
const checkTierCeremony = async (
  brand: BrandProfile,
  fundador: string,
  tier: Tier,
): Promise<{ de: Tier; a: Tier } | undefined> => {
  const s = readTrophies();
  const prev = s.lastTier;
  if (prev === tier) return undefined;
  s.lastTier = tier;
  writeTrophies(s);
  if (!prev || TIER_RANK.indexOf(tier) <= TIER_RANK.indexOf(prev)) return undefined;
  emit({
    type: 'TierAscended',
    sourceAgent: 'experience',
    priority: 'normal',
    correlationId: `tier-${Date.now().toString(36)}`,
    payload: { brand: brand.name, from: prev, to: tier },
  });
  await sendAlert({
    severity: 'reporte',
    title: `👑 ${fundador} ascendió a nivel ${tier}`,
    body: `Tu imperio creció: subiste de ${prev} a ${tier}. Tu equipo de IA sigue operando para vos 24/7.`,
  }).catch(() => undefined);
  return { de: prev, a: tier };
};

const TIERS: Array<{ tier: Tier; min: number }> = [
  { tier: 'Bronce', min: 0 },
  { tier: 'Plata', min: 50 },
  { tier: 'Oro', min: 200 },
  { tier: 'Platino', min: 600 },
  { tier: 'Visionario', min: 1500 },
];

const tierFor = (acciones: number): { tier: Tier; progresoPct: number } => {
  let cur = TIERS[0]!;
  let next: { tier: Tier; min: number } | null = null;
  for (let i = 0; i < TIERS.length; i++) {
    if (acciones >= TIERS[i]!.min) {
      cur = TIERS[i]!;
      next = TIERS[i + 1] ?? null;
    }
  }
  const progresoPct = next ? Math.min(100, Math.round(((acciones - cur.min) / (next.min - cur.min)) * 100)) : 100;
  return { tier: cur.tier, progresoPct };
};

export const computeLeverage = (brandId: string): Leverage => {
  const missions = listMissions(brandId);
  const carousels = listCarouselJobs(brandId);
  const watch = listWatchSessions();
  const traces = getTraceStats(brandId);
  const directives = listDirectives(brandId);

  // Indicaciones = lo que el HUMANO pidió (directivas + misiones lanzadas).
  const indicaciones = Math.max(1, directives.length + missions.length);
  // Acciones = lo que el SISTEMA ejecutó por su cuenta.
  const accionesMisiones = missions.reduce((n, m) => n + m.steps.length, 0);
  const accionesWatch = watch.reduce((n, w) => n + (w.steps || 0), 0);
  const acciones =
    accionesMisiones +
    carousels.length * 9 +
    accionesWatch +
    traces.totalTraces +
    directives.reduce((n, d) => n + (d.runCount ?? 0), 0);

  const rv = getReplacementValue();
  const ratio = Math.max(1, Math.round(acciones / indicaciones));
  // Estimación honesta: ~7 min de trabajo humano calificado por acción.
  const horas = Math.round((acciones * 7) / 60);

  return {
    indicacionesDadas: indicaciones,
    accionesEjecutadas: acciones,
    ratio,
    ratioLabel: `1 : ${ratio}`,
    equipoReemplazado: PROFESSIONS_REPLACED.length,
    costoEquipoUsdMes: rv.totalUsdPerMonth,
    horasHumanasAhorradas: horas,
    ahorroAnualUsd: rv.totalUsdPerMonth * 12,
  };
};

const evaluateTrophies = (lev: Leverage): Trophy[] => {
  const s = readTrophies();
  const have = new Set(s.won.map((t) => t.id));
  const candidates: Array<Omit<Trophy, 'logradoEn'> & { when: boolean }> = [
    {
      id: 'first-blood',
      titulo: 'Primer movimiento',
      detalle: 'Tu equipo de IA ejecutó su primera acción por vos.',
      when: lev.accionesEjecutadas >= 1,
    },
    {
      id: 'lev-50',
      titulo: 'Apalancamiento x50',
      detalle: 'Cada indicación tuya rinde como 50 acciones.',
      when: lev.ratio >= 50,
    },
    {
      id: 'lev-100',
      titulo: 'Efecto multiplicador',
      detalle: 'Ratio 1:100 — operás como un holding, no como una cuenta.',
      when: lev.ratio >= 100,
    },
    {
      id: 'team-replaced',
      titulo: 'Reemplazaste un equipo senior',
      detalle: `${lev.equipoReemplazado} especialistas trabajando para vos sin nómina.`,
      when: lev.equipoReemplazado >= 8,
    },
    {
      id: 'six-figures',
      titulo: 'Ahorro de 6 cifras',
      detalle: `US$${lev.ahorroAnualUsd.toLocaleString('en-US')} al año que no pagás en sueldos.`,
      when: lev.ahorroAnualUsd >= 100000,
    },
    {
      id: 'always-on',
      titulo: 'Imperio que no duerme',
      detalle: 'Más de 100 acciones autónomas acumuladas.',
      when: lev.accionesEjecutadas >= 100,
    },
  ];
  let changed = false;
  for (const c of candidates) {
    if (c.when && !have.has(c.id)) {
      s.won.push({ id: c.id, titulo: c.titulo, detalle: c.detalle, logradoEn: new Date().toISOString() });
      changed = true;
    }
  }
  if (changed) writeTrophies(s);
  return s.won;
};

const staffRoster = (): ExecutiveBrief['staff'] =>
  PROFESSIONS_REPLACED.map((p) => ({ rol: p.replaces, estado: 'operando para vos · 24/7' }));

const deterministicNarrative = (brand: BrandProfile, lev: Leverage, tier: Tier): string =>
  `Mientras el resto contrata, vos comandás. Con ${lev.indicacionesDadas} indicación(es), ` +
  `tu equipo de IA ejecutó ${lev.accionesEjecutadas} acciones de branding, contenido y comunidad ` +
  `para ${brand.name}: un apalancamiento de ${lev.ratioLabel}. Eso equivale a ${lev.equipoReemplazado} ` +
  `especialistas senior (US$${lev.costoEquipoUsdMes.toLocaleString('en-US')}/mes) trabajando sin que muevas un dedo. ` +
  `Nivel actual: ${tier}. No tenés una herramienta: tenés un equipo de élite que te reporta.`;

export const buildExecutiveBrief = async (
  brand: BrandProfile,
  opts: { fundador?: string; conNarrativaIA?: boolean } = {},
): Promise<ExecutiveBrief> => {
  const lev = computeLeverage(brand.name);
  const { tier, progresoPct } = tierFor(lev.accionesEjecutadas);
  const hitos = evaluateTrophies(lev);
  const fundador = opts.fundador?.trim() || brand.name;

  let narrativa = deterministicNarrative(brand, lev, tier);
  if (opts.conNarrativaIA) {
    try {
      const txt = await ask(
        `Escribí 3-4 frases que hagan sentir al dueño de "${brand.name}" un visionario de élite que comanda un equipo de IA. ` +
          `Datos reales: ${lev.indicacionesDadas} indicaciones → ${lev.accionesEjecutadas} acciones (apalancamiento ${lev.ratioLabel}), ` +
          `reemplaza ${lev.equipoReemplazado} roles senior (US$${lev.costoEquipoUsdMes}/mes), tier ${tier}. ` +
          `Tono: prestigio, no soberbia. Español rioplatense. Sin emojis. Sin comillas.`,
        { fast: true, maxTokens: 280, temperature: 0.7 },
      );
      if (txt && txt.trim().length > 40) narrativa = txt.trim();
    } catch (err) {
      log.warn(`[ExecutiveBrief] narrativa IA no disponible: ${(err as Error).message}`);
    }
  }

  const ascenso = await checkTierCeremony(brand, fundador, tier);

  const credencial =
    `FeedIA · ${fundador} · ${tier} · Apalancamiento ${lev.ratioLabel} · ` +
    `Equipo de ${lev.equipoReemplazado} reemplazado · ${new Date().getFullYear()}`;

  return {
    fundador,
    saludo: `${fundador}, tu imperio operó mientras vos vivías tu vida.`,
    titular: `${lev.accionesEjecutadas} acciones ejecutadas · apalancamiento ${lev.ratioLabel}`,
    tier,
    tierProgresoPct: progresoPct,
    leverage: lev,
    staff: staffRoster(),
    hitos: hitos.slice().reverse(),
    narrativa,
    credencial,
    ascenso,
    generadoEn: new Date().toISOString(),
  };
};
