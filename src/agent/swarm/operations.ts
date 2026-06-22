/**
 * Operations Director — el "líder de equipo" 24/7
 * ─────────────────────────────────────────────────────────────────────────
 * El scheduler ya cubre las tareas operativas puntuales (responder DMs,
 * publicar, auditar, etc.). Lo que faltaba era el rol de un DIRECTOR que,
 * como un jefe de equipo humano, revise el panorama y lance misiones
 * coordinadas multi-agente para las responsabilidades de fondo que ningún
 * cron cierra de punta a punta:
 *
 *   • Branding    → refrescar la identidad a los gustos/diseños actuales
 *   • Crecimiento → leer competencia + tendencias y ejecutar la mejor jugada
 *   • Contenido   → detectar fatiga de formatos/ganchos y renovar
 *
 * Cada "departamento" es una responsabilidad recurrente con cooldown propio
 * (trabaja siempre, pero sin malgastar): en cada tick se despacha como mucho
 * UNA misión, la de mayor prioridad que esté fuera de cooldown. Así el
 * sistema se comporta como un equipo de especialistas trabajando sin parar,
 * con costo acotado.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { log } from '../logger.js';
import type { BrandProfile } from '../../config/types.js';
import { runMission, type MissionRecord } from './conductor.js';
import { canSpend } from '../budget.js';

export type AutonomyLevel = 'supervised' | 'semi_autonomous' | 'fully_autonomous';

interface Department {
  key: string;
  label: string;
  /** Horas mínimas entre despachos de este departamento. */
  cooldownHours: number;
  /** Orden de prioridad (menor = más urgente). */
  priority: number;
  /** Autonomía mínima del OS para que este departamento actúe solo. */
  minAutonomy: Exclude<AutonomyLevel, 'supervised'>;
  objective: (brand: BrandProfile) => string;
}

const DEPARTMENTS: Department[] = [
  {
    key: 'growth-strategy',
    label: 'Crecimiento & Estrategia',
    cooldownHours: 72,
    priority: 0,
    minAutonomy: 'semi_autonomous',
    objective: (b) =>
      `Actuá como el equipo de growth de ${b.name}. Revisá competencia, tendencias del nicho "${b.niche}" y las métricas recientes, y ejecutá la mejor jugada de crecimiento accionable de esta semana (contenido, colaboración o engagement) alineada al algoritmo actual de Instagram. Entregá la jugada concreta lista para producir.`,
  },
  {
    key: 'content-freshness',
    label: 'Frescura de Contenido',
    cooldownHours: 48,
    priority: 1,
    minAutonomy: 'semi_autonomous',
    objective: (b) =>
      `Actuá como el equipo creativo de ${b.name}. Revisá el contenido reciente, detectá fatiga de formatos/ganchos y producí 2 variaciones frescas (ganchos + concepto visual) alineadas a lo que premia el algoritmo de Instagram hoy para el nicho "${b.niche}".`,
  },
  {
    key: 'branding-refresh',
    label: 'Refresco de Branding',
    cooldownHours: 336, // ~14 días
    priority: 2,
    minAutonomy: 'semi_autonomous',
    objective: (b) =>
      `Actuá como el equipo de marca de ${b.name}. Auditá la identidad visual actual contra las tendencias de diseño y los gustos vigentes del nicho "${b.niche}" en Instagram. Si hay fatiga o desalineación, proponé un refresco concreto (paleta, tipografía, plantillas, mood) y prepará los nuevos assets. El cambio de estética debe pasar por checkpoint humano antes de aplicarse.`,
  },
];

interface CooldownStore {
  last: Record<string, string>;
}

const PATH = resolve('data/runtime/opsCooldowns.json');

const readStore = (): CooldownStore => {
  if (!existsSync(PATH)) return { last: {} };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as CooldownStore;
  } catch {
    return { last: {} };
  }
};

const writeStore = (s: CooldownStore): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const offCooldown = (store: CooldownStore, dept: Department, now: number): boolean => {
  const last = store.last[dept.key];
  if (!last) return true;
  return now - Date.parse(last) >= dept.cooldownHours * 3_600_000;
};

export interface OperationsReport {
  dispatched: Array<{ department: string; missionId: string; status: MissionRecord['status'] }>;
  skipped: Array<{ department: string; reason: string }>;
}

export interface OperationsOptions {
  autonomy: AutonomyLevel;
  /** Máximo de misiones a despachar por ciclo (acota costo). Default 1. */
  maxMissions?: number;
}

const meetsAutonomy = (level: AutonomyLevel, min: Department['minAutonomy']): boolean => {
  if (level === 'supervised') return false;
  if (min === 'fully_autonomous') return level === 'fully_autonomous';
  return true; // semi_autonomous o superior
};

/**
 * Un ciclo del Director de Operaciones. Despacha como mucho `maxMissions`
 * misiones (las de mayor prioridad fuera de cooldown). Nunca lanza.
 */
export const runOperationsCycle = async (brand: BrandProfile, opts: OperationsOptions): Promise<OperationsReport> => {
  const report: OperationsReport = { dispatched: [], skipped: [] };
  // Circuit breaker de presupuesto: no despachar misiones si el LLM está
  // agotado por hoy (cada misión consume tokens).
  if (!canSpend()) {
    for (const d of DEPARTMENTS) report.skipped.push({ department: d.key, reason: 'presupuesto LLM agotado' });
    return report;
  }
  const max = Math.max(1, opts.maxMissions ?? 1);
  const store = readStore();
  const now = Date.now();

  const eligible = [...DEPARTMENTS]
    .sort((a, b) => a.priority - b.priority)
    .filter((d) => {
      if (!meetsAutonomy(opts.autonomy, d.minAutonomy)) {
        report.skipped.push({ department: d.key, reason: 'autonomía insuficiente' });
        return false;
      }
      if (!offCooldown(store, d, now)) {
        report.skipped.push({ department: d.key, reason: 'en cooldown' });
        return false;
      }
      return true;
    });

  for (const dept of eligible.slice(0, max)) {
    log.info(`[OPS] Despachando departamento "${dept.label}"`);
    try {
      const mission = await runMission(brand, dept.objective(brand));
      store.last[dept.key] = new Date().toISOString();
      writeStore(store);
      report.dispatched.push({
        department: dept.key,
        missionId: mission.id,
        status: mission.status,
      });
      log.success(`[OPS] ${dept.label} → ${mission.status} (${mission.id})`);
    } catch (err) {
      report.skipped.push({ department: dept.key, reason: `error: ${(err as Error).message}` });
      log.warn(`[OPS] ${dept.label} falló: ${(err as Error).message}`);
    }
  }

  return report;
};

/** Estado de los departamentos y sus cooldowns (para el panel). */
export const getOperationsStatus = (): Array<{
  department: string;
  label: string;
  cooldownHours: number;
  lastRunAt?: string;
  nextEligibleAt?: string;
}> => {
  const store = readStore();
  return DEPARTMENTS.map((d) => {
    const last = store.last[d.key];
    return {
      department: d.key,
      label: d.label,
      cooldownHours: d.cooldownHours,
      lastRunAt: last,
      nextEligibleAt: last ? new Date(Date.parse(last) + d.cooldownHours * 3_600_000).toISOString() : undefined,
    };
  });
};
