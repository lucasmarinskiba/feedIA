// @ts-nocheck
/**
 * Stalker Tracker — Inteligencia de seguidores
 * Detecta stalkers (mirones), lurkers, super fans, haters, y potenciales socios
 * Cada perfil tiene un "heat map" de comportamiento
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as episodic from '../memory/episodicMemory.js';
import * as graph from '../memory/knowledgeGraph.js';

const STALKER_PATH = resolve('data/runtime/brain/stalker-intel.json');

export type StalkerType =
  | 'superfan'
  | 'lurker'
  | 'stalker'
  | 'hater'
  | 'curious'
  | 'competitor'
  | 'potential_partner'
  | 'bot'
  | 'ghost';

export interface StalkerProfile {
  handle: string;
  firstSeen: string;
  lastSeen: string;
  type: StalkerType;
  confidence: number; // 0-1
  behaviors: string[];
  patterns: {
    storyViews: number;
    postLikes: number;
    comments: number;
    dms: number;
    saves: number;
    shares: number;
    profileVisits: number;
    hoursActive: number[]; // horas del día 0-23
  };
  engagementVelocity: number; // cambio reciente
  riskLevel: 'none' | 'low' | 'medium' | 'high';
  notes: string[];
}

interface StalkerStore {
  profiles: StalkerProfile[];
  lastScan: string;
  flagged: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): StalkerStore => {
  try {
    ensureDir();
    if (!existsSync(STALKER_PATH)) return { profiles: [], lastScan: new Date().toISOString(), flagged: [] };
    return JSON.parse(readFileSync(STALKER_PATH, 'utf-8')) as StalkerStore;
  } catch {
    return { profiles: [], lastScan: new Date().toISOString(), flagged: [] };
  }
};

const saveStore = (store: StalkerStore): void => {
  ensureDir();
  writeFileSync(STALKER_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Classify a user based on behavior signals ──────────────────────────────

export const classifyUser = (signals: {
  handle: string;
  storyViews: number;
  postLikes: number;
  comments: number;
  dms: number;
  saves: number;
  shares: number;
  profileVisits: number;
  hoursActive: number[];
}): StalkerProfile => {
  const store = loadStore();
  const existing = store.profiles.find((p) => p.handle.toLowerCase() === signals.handle.toLowerCase());

  const score =
    signals.storyViews * 0.1 +
    signals.postLikes * 0.2 +
    signals.comments * 0.5 +
    signals.dms * 0.8 +
    signals.saves * 0.6 +
    signals.shares * 0.7 +
    signals.profileVisits * 0.3;

  let type: StalkerType = 'curious';
  let confidence = 0.5;
  let riskLevel: StalkerProfile['riskLevel'] = 'none';
  const behaviors: string[] = [];

  // Classification logic
  if (signals.storyViews > 50 && signals.postLikes < 3) {
    type = 'lurker';
    confidence = 0.7;
    behaviors.push('mira historias pero no interactúa');
  }
  if (signals.profileVisits > 10 && signals.dms === 0) {
    type = 'stalker';
    confidence = 0.6;
    behaviors.push('visita perfil repetidamente sin contactar');
  }
  if (signals.comments > 10 && signals.saves > 5 && signals.shares > 3) {
    type = 'superfan';
    confidence = 0.85;
    behaviors.push('alta interacción en todos los formatos');
  }
  if (signals.comments > 5 && score < 2) {
    type = 'hater';
    confidence = 0.6;
    riskLevel = 'medium';
    behaviors.push('comenta mucho pero con bajo engagement positivo');
  }
  if (score > 15 && signals.dms > 2) {
    type = 'potential_partner';
    confidence = 0.7;
    behaviors.push('engagement sostenido + contacto directo');
  }
  if (signals.hoursActive.length > 0 && signals.hoursActive.every((h) => h < 6 || h > 23)) {
    type = 'bot';
    confidence = 0.8;
    behaviors.push('actividad solo en horarios atípicos');
  }
  if (signals.postLikes === 0 && signals.comments === 0 && signals.storyViews === 0) {
    type = 'ghost';
    confidence = 0.9;
    behaviors.push('sin actividad detectable');
  }

  const profile: StalkerProfile = {
    handle: signals.handle,
    firstSeen: existing?.firstSeen ?? new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    type,
    confidence,
    behaviors,
    patterns: {
      storyViews: signals.storyViews,
      postLikes: signals.postLikes,
      comments: signals.comments,
      dms: signals.dms,
      saves: signals.saves,
      shares: signals.shares,
      profileVisits: signals.profileVisits,
      hoursActive: signals.hoursActive,
    },
    engagementVelocity: existing ? (score - (existing.patterns.postLikes + existing.patterns.comments)) / 7 : 0,
    riskLevel,
    notes: existing?.notes ?? [],
  };

  if (existing) {
    const idx = store.profiles.indexOf(existing);
    store.profiles[idx] = profile;
  } else {
    store.profiles.push(profile);
  }

  // Flag high-risk
  if (riskLevel === 'high' && !store.flagged.includes(signals.handle)) {
    store.flagged.push(signals.handle);
  }

  saveStore(store);

  // Store intelligence
  graph.addTriple(signals.handle, 'es clasificado como', type, confidence, 'stalker-tracker');
  episodic.recordEpisode('stalker-classified', `${signals.handle} → ${type} (conf=${confidence.toFixed(2)})`, {
    who: signals.handle,
    tags: ['stalker', type],
    emotion: type === 'superfan' ? 'positive' : type === 'hater' ? 'negative' : 'neutral',
  });

  log.info(`[StalkerTracker] @${signals.handle} → ${type} (conf=${confidence.toFixed(2)})`);
  return profile;
};

// ── Get intelligence brief ─────────────────────────────────────────────────

export const getIntelBrief = (handle: string): StalkerProfile | undefined => {
  return loadStore().profiles.find((p) => p.handle.toLowerCase() === handle.toLowerCase());
};

export const getAllByType = (type: StalkerType): StalkerProfile[] => {
  return loadStore().profiles.filter((p) => p.type === type);
};

export const getFlaggedUsers = (): StalkerProfile[] => {
  const store = loadStore();
  return store.flagged
    .map((h) => store.profiles.find((p) => p.handle.toLowerCase() === h.toLowerCase()))
    .filter((p): p is StalkerProfile => !!p);
};

export const getPotentialPartners = (): StalkerProfile[] => {
  return loadStore()
    .profiles.filter((p) => p.type === 'potential_partner' || (p.type === 'superfan' && p.confidence > 0.8))
    .sort((a, b) => b.confidence - a.confidence);
};

// ── Risk assessment for account ────────────────────────────────────────────

export const assessAccountRisk = (): {
  total: number;
  byType: Record<string, number>;
  flagged: number;
  recommendations: string[];
} => {
  const store = loadStore();
  const byType: Record<string, number> = {};
  for (const p of store.profiles) byType[p.type] = (byType[p.type] ?? 0) + 1;

  const recommendations: string[] = [];
  if (byType.hater > 5) recommendations.push('Activar moderación automática de comentarios');
  if (byType.lurker > 50) recommendations.push('Crear contenido que convierta lurkers a interactores');
  if (byType.potential_partner > 3) recommendations.push('Iniciar outreach a potenciales socios');
  if (byType.superfan < 5) recommendations.push('Necesitas más contenido de valor para crear superfans');

  return { total: store.profiles.length, byType, flagged: store.flagged.length, recommendations };
};
