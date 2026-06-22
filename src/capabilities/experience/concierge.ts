/**
 * Concierge — la experiencia desde que el usuario ENTRA
 * ─────────────────────────────────────────────────────────────────────────
 * El primer momento define la percepción de todo el producto. Este módulo
 * crea el "ritual de entrada":
 *
 *   • Saludo personalizado por horario + nombre de marca.
 *   • Primera vez → bienvenida ceremonial; vuelta → "mientras no estabas…".
 *   • Delta real de lo que el equipo hizo desde la última visita.
 *   • Una sola próxima indicación sugerida (mínimo input, máximo efecto).
 *   • Feed HUMANIZADO: el sistema se presenta como personas (Nova, Lía,
 *     Gard…) trabajando para vos — no como logs.
 *
 * Todo determinista. Persiste lastSeen/visitas por marca.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { BrandProfile } from '../../config/types.js';
import { computeLeverage } from './executiveBrief.js';
import { listMissions } from '../../agent/swarm/index.js';
import { listCarouselJobs } from '../content/index.js';
import { listWatchSessions } from '../computerUse/index.js';
import { listDirectives } from '../directives/index.js';
import { listTraces } from '../reasoningTrace/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE = resolve('data/runtime/experienceConcierge.json');

interface ConciergeStore {
  byBrand: Record<string, { lastSeenAt: string; visits: number }>;
}
const read = (): ConciergeStore => {
  if (!existsSync(STORE)) return { byBrand: {} };
  try {
    return JSON.parse(readFileSync(STORE, 'utf-8')) as ConciergeStore;
  } catch {
    return { byBrand: {} };
  }
};
const write = (s: ConciergeStore): void => {
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf-8');
};

/* ── Roster humano (company.json) con fallback ──────────────────────────── */
interface Member {
  nombre: string;
  emoji: string;
  rol: string;
}
let _rosterCache: Member[] | null = null;
const roster = (): Member[] => {
  if (_rosterCache) return _rosterCache;
  try {
    const p = join(__dirname, '../../../data/company.json');
    const data = JSON.parse(readFileSync(p, 'utf-8')) as {
      equipo_ia?: Array<{ nombre: string; emoji: string; rol: string }>;
    };
    _rosterCache = (data.equipo_ia ?? []).map((m) => ({ nombre: m.nombre, emoji: m.emoji, rol: m.rol }));
  } catch {
    _rosterCache = [];
  }
  if (_rosterCache.length === 0) {
    _rosterCache = [
      { nombre: 'Talía', emoji: '🎯', rol: 'Orquestadora' },
      { nombre: 'Nova', emoji: '✍️', rol: 'Copywriter' },
      { nombre: 'Luca', emoji: '🎨', rol: 'Director de Contenido' },
      { nombre: 'Lía', emoji: '💬', rol: 'Community Manager' },
      { nombre: 'Vero', emoji: '📊', rol: 'Analista' },
      { nombre: 'Gard', emoji: '🛡️', rol: 'Compliance' },
      { nombre: 'Scout', emoji: '🔭', rol: 'Tendencias' },
    ];
  }
  return _rosterCache;
};

const byName = (n: string): Member =>
  roster().find((m) => m.nombre.toLowerCase() === n.toLowerCase()) ?? { nombre: n, emoji: '🤖', rol: '' };

/** Mapea un agentId/área técnico a un miembro humano del equipo. */
const personFor = (agentId: string): Member => {
  const a = agentId.toLowerCase();
  if (/copy|caption|hook|writer|nova/.test(a)) return byName('Nova');
  if (/carousel|design|visual|studio|art|luca|pixel/.test(a)) return byName('Luca');
  if (/community|dm|inbox|comment|reply|lia|lía/.test(a)) return byName('Lía');
  if (/analytic|kpi|metric|report|vero/.test(a)) return byName('Vero');
  if (/crisis|compliance|safety|gard/.test(a)) return byName('Gard');
  if (/trend|scout|viral|research|study/.test(a)) return byName('Scout');
  return byName('Talía');
};

const greetingByHour = (): string => {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};

const TIERS: Array<{ t: string; min: number }> = [
  { t: 'Bronce', min: 0 },
  { t: 'Plata', min: 50 },
  { t: 'Oro', min: 200 },
  { t: 'Platino', min: 600 },
  { t: 'Visionario', min: 1500 },
];
const tierOf = (acc: number): string => {
  let cur = 'Bronce';
  for (const x of TIERS) if (acc >= x.min) cur = x.t;
  return cur;
};

export interface ActivityItem {
  emoji: string;
  quien: string;
  rol: string;
  accion: string;
  cuando: string;
}

/** Feed humanizado de lo que "el equipo" viene haciendo. */
export const humanizeActivity = (brandId: string, limit = 24): ActivityItem[] => {
  const items: ActivityItem[] = [];
  for (const m of listMissions(brandId).slice(0, 10)) {
    const lead = personFor(m.crew[0]?.agentId ?? 'talia');
    items.push({
      emoji: lead.emoji,
      quien: lead.nombre,
      rol: lead.rol,
      accion: `coordinó la misión "${m.objective.slice(0, 60)}" (${m.status})`,
      cuando: m.finishedAt || m.startedAt,
    });
    for (const st of m.steps.slice(0, 3)) {
      const p = personFor(st.agentId);
      items.push({
        emoji: p.emoji,
        quien: p.nombre,
        rol: p.rol,
        accion: st.status === 'completed' ? `resolvió "${st.taskId}"` : `trabajó en "${st.taskId}"`,
        cuando: m.finishedAt || m.startedAt,
      });
    }
  }
  for (const c of listCarouselJobs(brandId).slice(0, 8)) {
    const p = byName('Luca');
    items.push({
      emoji: p.emoji,
      quien: p.nombre,
      rol: p.rol,
      accion: `diseñó un carrusel branded (${c.slideCount} slides, estética ${c.aestheticScore}) — ${c.status}`,
      cuando: c.finishedAt || c.startedAt,
    });
  }
  for (const w of listWatchSessions().slice(0, 5)) {
    items.push({
      emoji: '🖥️',
      quien: 'Operador',
      rol: 'Computer Use',
      accion: `operó la pantalla: "${w.instruction.slice(0, 60)}"`,
      cuando: w.startedAt,
    });
  }
  for (const t of listTraces({ brandId, limit: 10 })) {
    const p = personFor(t.agentId);
    items.push({
      emoji: p.emoji,
      quien: p.nombre,
      rol: p.rol,
      accion: `decidió: ${t.reasoning.slice(0, 70)}`,
      cuando: t.createdAt,
    });
  }
  return items
    .filter((i) => i.cuando)
    .sort((a, b) => Date.parse(b.cuando) - Date.parse(a.cuando))
    .slice(0, limit);
};

export interface Welcome {
  saludo: string;
  marca: string;
  primeraVez: boolean;
  visita: number;
  tier: string;
  equipoActivo: number;
  desdeUltimaVisita: {
    horas: number;
    misiones: number;
    carruseles: number;
    sesionesPantalla: number;
    decisiones: number;
    titular: string;
  };
  proximaIndicacion: string;
  destacado: ActivityItem[];
}

const nextIndication = (brandId: string): string => {
  const carousels = listCarouselJobs(brandId);
  const missions = listMissions(brandId);
  const directives = listDirectives(brandId);
  if (carousels.length === 0)
    return 'Con una sola indicación puedo armar y subir tu primer carrusel branded. Solo decímelo.';
  if (directives.length === 0) return 'Pedime "subí 1 carrusel por día" y tu equipo lo hace solo, todos los días.';
  if (missions.length < 3)
    return 'Lanzá una misión de crecimiento: en una frase, tu equipo arma la jugada de la semana.';
  return 'Tu imperio ya gira solo. Pedime el recap para compartir tu resultado.';
};

export const getWelcome = (brand: BrandProfile): Welcome => {
  const s = read();
  const prev = s.byBrand[brand.name];
  const now = Date.now();
  const sinceMs = prev ? now - Date.parse(prev.lastSeenAt) : 0;
  const horas = prev ? Math.max(0, Math.round(sinceMs / 3_600_000)) : 0;

  const since = (iso?: string): boolean => !!iso && Date.parse(iso) >= (prev ? Date.parse(prev.lastSeenAt) : 0);
  const missions = listMissions(brand.name).filter((m) => since(m.finishedAt || m.startedAt)).length;
  const carruseles = listCarouselJobs(brand.name).filter((c) => since(c.finishedAt || c.startedAt)).length;
  const sesiones = listWatchSessions().filter((w) => since(w.startedAt)).length;
  const decisiones = listTraces({ brandId: brand.name, limit: 200 }).filter((t) => since(t.createdAt)).length;

  const lev = computeLeverage(brand.name);
  const tier = tierOf(lev.accionesEjecutadas);
  const primeraVez = !prev;

  const titular = primeraVez
    ? 'Tu equipo de élite está listo para empezar a trabajar para vos.'
    : missions + carruseles + sesiones + decisiones > 0
      ? `Mientras no estabas, tu equipo ejecutó ${missions} misión(es), ${carruseles} carrusel(es) y ${decisiones} decisiones autónomas.`
      : 'Tu equipo mantuvo todo bajo control. Sin incendios. Todo en orden.';

  // Actualizar lastSeen DESPUÉS de calcular el delta.
  s.byBrand[brand.name] = { lastSeenAt: new Date(now).toISOString(), visits: (prev?.visits ?? 0) + 1 };
  write(s);

  return {
    saludo: `${greetingByHour()}, ${brand.name}`,
    marca: brand.name,
    primeraVez,
    visita: s.byBrand[brand.name]!.visits,
    tier,
    equipoActivo: roster().length,
    desdeUltimaVisita: { horas, misiones: missions, carruseles, sesionesPantalla: sesiones, decisiones, titular },
    proximaIndicacion: nextIndication(brand.name),
    destacado: humanizeActivity(brand.name, 6),
  };
};
