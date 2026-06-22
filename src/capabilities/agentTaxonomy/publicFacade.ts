/**
 * Public Facade — Trade-secret protection
 * ─────────────────────────────────────────────────────────────────────────
 * The internal architecture (how many agents exist, each agent's specific
 * knowledge/capabilities, the taxonomy breakdown, the org chart) is a trade
 * secret. The dashboard / public API must NOT leak it — competitors should
 * not be able to reverse-engineer the system by reading the UI.
 *
 * This module returns a deliberately abstracted view: the user sees that
 * "FeedIA opera con un equipo de especialistas" and a few capability themes,
 * but never the count, names, internal knowledge, or classification.
 *
 * Internals remain fully available server-side to Talía and the orchestrator;
 * only the *presentation* is sanitized. Gated by env.exposeInternals
 * (default false) so local debugging can still inspect everything.
 */

import { env } from '../../config/index.js';
import { listClassifiedAgents, listAgentTypes } from './taxonomy.js';

export interface PublicCapabilityTheme {
  area: string;
  /** Vague, non-revealing description of what FeedIA can do in this area. */
  whatItDoes: string;
}

export interface PublicSystemView {
  /** Single brand name the user interacts with — no internal agent roster. */
  assistant: 'FeedIA';
  tagline: string;
  /** High-level themes only — never the specific agent knowledge. */
  capabilities: PublicCapabilityTheme[];
  /** A coarse, non-numeric posture statement. */
  teamPosture: string;
  internalsHidden: boolean;
}

/** Coarse capability themes — safe to show, reveal nothing reusable. */
const PUBLIC_THEMES: PublicCapabilityTheme[] = [
  { area: 'Contenido', whatItDoes: 'Diseña y produce piezas listas para publicar con tu identidad de marca.' },
  { area: 'Crecimiento', whatItDoes: 'Optimiza alcance, engagement y conversión de forma continua.' },
  { area: 'Comunidad', whatItDoes: 'Responde mensajes y comentarios y nutre a tu audiencia.' },
  { area: 'Estrategia', whatItDoes: 'Convierte tus metas en un plan ejecutable y lo lleva adelante.' },
  { area: 'Operación', whatItDoes: 'Programa, publica y gestiona tu Instagram de punta a punta.' },
];

export const getPublicSystemView = (): PublicSystemView => ({
  assistant: 'FeedIA',
  tagline: 'Tu sistema de marketing autónomo para Instagram.',
  capabilities: PUBLIC_THEMES,
  teamPosture: 'FeedIA trabaja con un equipo de especialistas internos. La arquitectura es propietaria.',
  internalsHidden: true,
});

/**
 * Endpoint guard. Returns the raw internal payload only when explicitly
 * enabled; otherwise the abstract public view. Every internal endpoint
 * routes through this so there is a single chokepoint for the secret.
 */
export const guarded = <T>(rawInternal: () => T): T | PublicSystemView => {
  if (env.exposeInternals) return rawInternal();
  return getPublicSystemView();
};

export const internalsExposed = (): boolean => env.exposeInternals;

/**
 * Aggregate, non-revealing stats. Even when internals are hidden the UI can
 * show *that* the system is working without exposing how it's built. We
 * deliberately bucket the count so the exact number of agents is never shown.
 */
export const getPublicHealth = (): {
  status: 'operativo';
  scale: 'equipo amplio de especialistas';
  coverage: string[];
} => {
  // The exact agent count exists internally but is deliberately never
  // exposed — only a coarse, non-numeric scale label.
  void listClassifiedAgents;
  void listAgentTypes;
  return {
    status: 'operativo',
    scale: 'equipo amplio de especialistas',
    coverage: ['contenido', 'crecimiento', 'comunidad', 'estrategia', 'operación'],
  };
};
