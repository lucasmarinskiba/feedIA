// @ts-nocheck
/**
 * Partnership Engine — Descubrimiento, evaluación y outreach de socios
 * Encuentra creators, marcas, influencers complementarios para colaborar
 * Evalúa alineación de valores, audiencia, engagement, y potencial de sinergia
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as episodic from '../memory/episodicMemory.js';

const PARTNER_PATH = resolve('data/runtime/brain/partnership-engine.json');

export interface PartnerCandidate {
  handle: string;
  platform: string;
  niche: string;
  followers: number;
  engagementRate: number;
  audienceOverlap: number; // 0-1 estimated
  valueAlignment: number; // 0-1
  contentQuality: number; // 0-1
  collaborationHistory: string[];
  contactAttempted: boolean;
  contactSuccess: boolean;
  status: 'discovered' | 'evaluated' | 'contacted' | 'negotiating' | 'partner' | 'rejected';
  notes: string[];
  discoveredAt: string;
  score: number; // overall partnership score
}

interface PartnerStore {
  candidates: PartnerCandidate[];
  activePartnerships: { partner: string; startedAt: string; type: string; results: string[] }[];
  outreachTemplates: Record<string, string>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): PartnerStore => {
  try {
    ensureDir();
    if (!existsSync(PARTNER_PATH)) return { candidates: [], activePartnerships: [], outreachTemplates: {} };
    return JSON.parse(readFileSync(PARTNER_PATH, 'utf-8')) as PartnerStore;
  } catch {
    return { candidates: [], activePartnerships: [], outreachTemplates: {} };
  }
};

const saveStore = (store: PartnerStore): void => {
  ensureDir();
  writeFileSync(PARTNER_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Discover partners ──────────────────────────────────────────────────────

export const discoverPartner = (
  handle: string,
  platform: string,
  niche: string,
  followers: number,
  engagementRate: number,
): PartnerCandidate => {
  const store = loadStore();

  const existing = store.candidates.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
  if (existing) {
    existing.followers = followers;
    existing.engagementRate = engagementRate;
    saveStore(store);
    return existing;
  }

  const candidate: PartnerCandidate = {
    handle,
    platform,
    niche,
    followers,
    engagementRate,
    audienceOverlap: 0,
    valueAlignment: 0,
    contentQuality: 0,
    collaborationHistory: [],
    contactAttempted: false,
    contactSuccess: false,
    status: 'discovered',
    notes: [],
    discoveredAt: new Date().toISOString(),
    score: 0,
  };

  store.candidates.push(candidate);
  saveStore(store);

  graph.addTriple(handle, 'es candidato a partner en', platform, 0.5, 'partnership-engine');
  log.info(`[PartnershipEngine] Discovered @${handle} (${niche}, ${followers} followers)`);
  return candidate;
};

// ── Evaluate partner fit ───────────────────────────────────────────────────

export const evaluatePartner = async (
  handle: string,
  ourNiche: string,
  ourValues: string[],
  ourAudienceSize: number,
): Promise<PartnerCandidate | null> => {
  const store = loadStore();
  const candidate = store.candidates.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
  if (!candidate) return null;

  // Calculate audience overlap (heuristic)
  const nicheOverlap =
    candidate.niche === ourNiche
      ? 0.8
      : candidate.niche.includes(ourNiche) || ourNiche.includes(candidate.niche)
        ? 0.5
        : 0.2;
  const sizeRatio = Math.min(candidate.followers, ourAudienceSize) / Math.max(candidate.followers, ourAudienceSize);
  candidate.audienceOverlap = nicheOverlap * 0.6 + sizeRatio * 0.4;

  // Value alignment (from notes/content analysis - simplified)
  candidate.valueAlignment = 0.5; // Would be analyzed from content

  // Content quality score
  candidate.contentQuality = candidate.engagementRate > 0.05 ? 0.8 : candidate.engagementRate > 0.02 ? 0.6 : 0.3;

  // Overall score
  candidate.score =
    candidate.audienceOverlap * 0.3 +
    candidate.valueAlignment * 0.25 +
    candidate.contentQuality * 0.25 +
    candidate.engagementRate * 10 * 0.2;

  candidate.score = Math.min(1, candidate.score);
  candidate.status = 'evaluated';

  saveStore(store);

  await semantic.storeMemory(
    `Evaluación partner @${handle}: score ${(candidate.score * 100).toFixed(0)}%`,
    'learning',
    { handle, score: candidate.score, niche: candidate.niche },
    candidate.score,
  );

  graph.addTriple(
    handle,
    'tiene score de partner',
    `${(candidate.score * 100).toFixed(0)}%`,
    candidate.score,
    'partnership-engine',
  );

  log.info(`[PartnershipEngine] Evaluated @${handle}: score=${candidate.score.toFixed(2)}`);
  return candidate;
};

// ── Generate outreach message ──────────────────────────────────────────────

export const generateOutreach = (
  handle: string,
  ourBrand: string,
  ourNiche: string,
  collabType: 'shoutout' | 'collab' | 'affiliate' | 'joint-content',
): string => {
  const store = loadStore();
  const candidate = store.candidates.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
  if (!candidate) return '';

  const templates: Record<string, string[]> = {
    shoutout: [
      `Hola ${handle}! 👋 Me encanta tu contenido de ${candidate.niche}. Veo mucha sinergia con lo que hacemos en ${ourBrand}. ¿Te animarías a un intercambio de shoutouts? Podría sumarle valor a ambas comunidades.`,
    ],
    collab: [
      `Hola ${handle}! 💡 Estoy armando una serie de reels colaborativos sobre ${ourNiche} + ${candidate.niche}. Creo que juntos podemos hacer algo épico. ¿Te interesa charlar 10 min?`,
    ],
    affiliate: [
      `Hola ${handle}! 🚀 En ${ourBrand} tenemos un programa de afiliados que está funcionando muy bien. Veo que tu audiencia es justo la que nos encanta. ¿Te gustaría conocer los detalles?`,
    ],
    'joint-content': [
      `Hola ${handle}! 🎬 Tengo una idea de contenido conjunto que creo que le va a volar la cabeza a tu audiencia. Es sobre ${ourNiche} y ${candidate.niche}. ¿Te copa que te cuente?`,
    ],
  };

  const list = templates[collabType] ?? templates.collab;
  return list[0];
};

// ── Record outreach attempt ────────────────────────────────────────────────

export const recordOutreach = (handle: string, success: boolean, response?: string): void => {
  const store = loadStore();
  const candidate = store.candidates.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
  if (!candidate) return;

  candidate.contactAttempted = true;
  candidate.contactSuccess = success;
  candidate.status = success ? 'negotiating' : 'contacted';
  if (response) candidate.notes.push(`Respuesta: ${response.slice(0, 200)}`);

  saveStore(store);

  episodic.recordEpisode('partner-outreach', `${handle}: ${success ? 'aceptó' : 'sin respuesta'}`, {
    who: handle,
    tags: ['partnership', success ? 'success' : 'pending'],
    emotion: success ? 'positive' : 'neutral',
  });

  log.info(`[PartnershipEngine] Outreach to @${handle}: ${success ? 'success' : 'no response'}`);
};

// ── Get top candidates ─────────────────────────────────────────────────────

export const getTopCandidates = (limit = 10, minScore = 0.5): PartnerCandidate[] => {
  return loadStore()
    .candidates.filter((c) => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// ── Active partnerships ────────────────────────────────────────────────────

export const startPartnership = (handle: string, type: string): void => {
  const store = loadStore();
  store.activePartnerships.push({ partner: handle, startedAt: new Date().toISOString(), type, results: [] });

  const candidate = store.candidates.find((c) => c.handle.toLowerCase() === handle.toLowerCase());
  if (candidate) candidate.status = 'partner';

  saveStore(store);
  log.info(`[PartnershipEngine] Partnership started with @${handle} (${type})`);
};

export const getActivePartnerships = (): PartnerStore['activePartnerships'] => {
  return loadStore().activePartnerships;
};
