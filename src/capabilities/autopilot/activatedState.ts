/**
 * Autopilot — "Activado" del Computer Use
 * ─────────────────────────────────────────────────────────────────────────
 * Estado persistente del cerebro autónomo. Cuando "activated" = true, los
 * subsistemas marcados como `enabled` corren solos en su ciclo natural
 * (scheduler/ticks). Cuando está apagado, todo queda en modo manual.
 *
 * Los 6 subsistemas son los pilares de autopilot:
 *   • pinSlate     — qué se queda fijo en el feed/perfil
 *   • templates    — plantillas a rotar
 *   • originality  — chequeo de originalidad antes de publicar
 *   • convoRouter  — ruteo de DMs/comentarios a las respuestas correctas
 *   • retention    — pulses de retención (re-engagement)
 *   • outreach     — campañas de salida (cold DMs / colaboraciones)
 *
 * Los módulos del sistema que ejecutan estas tareas pueden leer
 * `getModuleEnabled('pinSlate')` para decidir si correr — sin tocar su
 * lógica, sólo gatean su acción.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type AutopilotModuleId = 'pinSlate' | 'templates' | 'originality' | 'convoRouter' | 'retention' | 'outreach';

export interface AutopilotModule {
  id: AutopilotModuleId;
  label: string;
  description: string;
  enabled: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
}

export interface AutopilotState {
  activated: boolean;
  modules: Record<AutopilotModuleId, AutopilotModule>;
  updatedAt: string;
}

const PATH = resolve('data/runtime/autopilotActivated.json');

const DEFAULT_MODULES: Record<AutopilotModuleId, AutopilotModule> = {
  pinSlate: {
    id: 'pinSlate',
    label: 'Pin Slate',
    description: 'Mantiene fijados los posts/Highlights de mayor valor del feed/perfil.',
    enabled: true,
  },
  templates: {
    id: 'templates',
    label: 'Templates',
    description: 'Rota plantillas de carrusel/reel para mantener frescura visual.',
    enabled: true,
  },
  originality: {
    id: 'originality',
    label: 'Originality',
    description: 'Chequea originalidad (anti-repetición) antes de cada publicación.',
    enabled: true,
  },
  convoRouter: {
    id: 'convoRouter',
    label: 'Convo Router',
    description: 'Rutea DMs y comentarios a la respuesta correcta (FAQ / sales / soporte).',
    enabled: true,
  },
  retention: {
    id: 'retention',
    label: 'Retention Pulse',
    description: 'Dispara micro-acciones de re-engagement a la audiencia tibia.',
    enabled: false,
  },
  outreach: {
    id: 'outreach',
    label: 'Outreach',
    description: 'Lanza campañas de salida (cold DMs / colaboraciones priorizadas).',
    enabled: false,
  },
};

const defaultState = (): AutopilotState => ({
  activated: false,
  modules: { ...DEFAULT_MODULES },
  updatedAt: new Date().toISOString(),
});

const read = (): AutopilotState => {
  if (!existsSync(PATH)) return defaultState();
  try {
    const raw = JSON.parse(readFileSync(PATH, 'utf-8')) as Partial<AutopilotState>;
    const merged: AutopilotState = {
      activated: !!raw.activated,
      modules: { ...DEFAULT_MODULES },
      updatedAt: raw.updatedAt ?? new Date().toISOString(),
    };
    // Mergear preservando defaults para subsistemas nuevos
    for (const id of Object.keys(DEFAULT_MODULES) as AutopilotModuleId[]) {
      const stored = raw.modules?.[id];
      if (stored) {
        merged.modules[id] = {
          ...DEFAULT_MODULES[id],
          ...stored,
          id,
          label: DEFAULT_MODULES[id].label,
          description: DEFAULT_MODULES[id].description,
        };
      }
    }
    return merged;
  } catch {
    return defaultState();
  }
};

const write = (s: AutopilotState): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify({ ...s, updatedAt: new Date().toISOString() }, null, 2), 'utf-8');
};

export const getActivatedState = (): AutopilotState => read();

export const setActivated = (activated: boolean): AutopilotState => {
  const s = read();
  s.activated = activated;
  write(s);
  return s;
};

export const setModuleEnabled = (id: AutopilotModuleId, enabled: boolean): AutopilotState => {
  const s = read();
  if (!s.modules[id]) return s;
  s.modules[id]!.enabled = enabled;
  write(s);
  return s;
};

/** Marca un run del subsistema (úsese desde el scheduler/jobs cuando ejecutan). */
export const markModuleRun = (id: AutopilotModuleId, nextRunAt?: string): void => {
  const s = read();
  if (!s.modules[id]) return;
  s.modules[id]!.lastRunAt = new Date().toISOString();
  if (nextRunAt) s.modules[id]!.nextRunAt = nextRunAt;
  write(s);
};

/** Lectura rápida usada por capabilities para decidir si ejecutar. */
export const isAutopilotModuleActive = (id: AutopilotModuleId): boolean => {
  const s = read();
  return s.activated && !!s.modules[id]?.enabled;
};
