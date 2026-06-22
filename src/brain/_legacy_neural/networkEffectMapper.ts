// @ts-nocheck
/**
 * Network Effect Mapper — grafo social de Instagram.
 *
 * Mapea quién sigue a quién, identifica super-connectors, calcula
 * viral path óptimos, clusters de comunidad y centralidad de cuentas.
 *
 * Permite saber: si quiero viralizar contenido X en nicho Y,
 * ¿qué N cuentas debo conseguir que compartan para activar cascada?
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const NETWORK_DIR = path.resolve('data/neural/network');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface NetworkNode {
  handle: string;
  followers: number;
  engagementRate: number;
  niche: string;
  centralityScore: number; // 0-1 importance in graph
  influenceScore: number; // 0-1 ability to amplify
  bridgingScore: number; // 0-1 connector entre clusters
  amplificationFactor: number; // average reach when shares
  audienceOverlap: Record<string, number>; // @handle → overlap %
  clusterId?: string;
}

export interface NetworkEdge {
  from: string;
  to: string;
  type: 'follows' | 'mentions' | 'collabs' | 'tags' | 'shares';
  weight: number; // 0-1 strength
  detectedAt: string;
}

export interface NetworkCluster {
  id: string;
  name: string; // 'fitness-creators-LATAM'
  size: number;
  centralAccounts: string[];
  averageEngagement: number;
  description: string;
}

export interface ViralPath {
  fromBrand: string;
  targetAudience: string;
  steps: Array<{ handle: string; expectedReach: number; probability: number }>;
  estimatedTotalReach: number;
  estimatedDays: number;
  cost: 'free' | 'low' | 'medium' | 'high';
  recommendedTactic: 'engage' | 'collab' | 'mention' | 'paid' | 'gift';
}

export interface NetworkMap {
  brandId: string;
  generatedAt: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  clusters: NetworkCluster[];
  superConnectors: NetworkNode[]; // top bridging accounts
  ownPosition: { centralityScore: number; nearestCluster: string; gapAccounts: string[] };
}

// ── Construcción de network map ──────────────────────────────────────────────

export const buildNetworkMap = async (
  brand: BrandProfile,
  options: {
    niche?: string;
    seedAccounts?: string[];
    depth?: number; // 1=direct, 2=friend-of-friend
  } = {},
): Promise<NetworkMap> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const niche = options.niche ?? brand.industryCategory ?? 'general';

  log.info('[networkEffectMapper] building map', { brandId, niche });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Mapper de network social de Instagram. Identificás super-connectors, clusters, bridging accounts.
Conocés el ecosistema de cada nicho — quién sigue a quién, quién colabora con quién, cuáles son los puentes entre comunidades.`,
    messages: [
      {
        role: 'user',
        content: `Construí network map del nicho "${niche}" para ${brand.name}:

${options.seedAccounts?.length ? `Cuentas seed: ${options.seedAccounts.join(', ')}` : ''}

Identificá 15-25 nodes (cuentas relevantes) y los edges entre ellos.

JSON: {
  "nodes": [{
    "handle": "@nombre",
    "followers": número,
    "engagementRate": 0-1,
    "niche": "string",
    "centralityScore": 0-1,
    "influenceScore": 0-1,
    "bridgingScore": 0-1,
    "amplificationFactor": número,
    "audienceOverlap": { "@otroHandle": 0-1 },
    "clusterId": "cluster-1"
  }],
  "edges": [{
    "from": "@a", "to": "@b",
    "type": "follows|mentions|collabs|tags|shares",
    "weight": 0-1
  }],
  "clusters": [{
    "id": "cluster-1",
    "name": "nombre descriptivo",
    "size": número,
    "centralAccounts": ["@central"],
    "averageEngagement": 0-1,
    "description": "qué los une"
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[networkEffectMapper] No network data');

  const generated = JSON.parse(jsonMatch[0]) as Partial<NetworkMap>;
  const nodes = generated.nodes ?? [];
  const edges = (generated.edges ?? []).map((e) => ({ ...e, detectedAt: new Date().toISOString() }));
  const clusters = generated.clusters ?? [];

  // Super-connectors: top bridging + influence
  const superConnectors = [...nodes]
    .sort((a, b) => b.bridgingScore * b.influenceScore - a.bridgingScore * a.influenceScore)
    .slice(0, 5);

  // Own position
  const ownNode = nodes.find((n) => n.handle.includes(brand.name.toLowerCase())) ?? nodes[0];
  const ownPosition = {
    centralityScore: ownNode?.centralityScore ?? 0.1,
    nearestCluster: ownNode?.clusterId ?? clusters[0]?.id ?? '',
    gapAccounts: superConnectors.slice(0, 3).map((sc) => sc.handle),
  };

  const map: NetworkMap = {
    brandId,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    clusters,
    superConnectors,
    ownPosition,
  };

  await fs.mkdir(NETWORK_DIR, { recursive: true });
  await fs.writeFile(path.join(NETWORK_DIR, `${brandId}-network.json`), JSON.stringify(map, null, 2), 'utf-8');
  log.info('[networkEffectMapper] map saved', { brandId, nodes: nodes.length, clusters: clusters.length });
  return map;
};

/** Computa viral path óptimo desde brand a target audience. */
export const computeViralPath = async (brandId: string, targetAudience: string, maxSteps = 3): Promise<ViralPath[]> => {
  let map: NetworkMap;
  try {
    map = JSON.parse(await fs.readFile(path.join(NETWORK_DIR, `${brandId}-network.json`), 'utf-8')) as NetworkMap;
  } catch {
    return [];
  }

  // Top N super-connectors como candidates para path
  const paths: ViralPath[] = [];
  for (const connector of map.superConnectors.slice(0, 3)) {
    const expectedReach = connector.followers * connector.engagementRate * connector.amplificationFactor;
    const probability = connector.influenceScore * 0.6;
    paths.push({
      fromBrand: brandId,
      targetAudience,
      steps: [{ handle: connector.handle, expectedReach, probability }],
      estimatedTotalReach: Math.round(expectedReach),
      estimatedDays: 7,
      cost: connector.followers > 500_000 ? 'high' : connector.followers > 100_000 ? 'medium' : 'low',
      recommendedTactic: connector.bridgingScore > 0.7 ? 'collab' : 'mention',
    });
  }

  return paths.sort((a, b) => b.estimatedTotalReach - a.estimatedTotalReach).slice(0, maxSteps);
};

export const getNetworkMap = async (brandId: string): Promise<NetworkMap | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(NETWORK_DIR, `${brandId}-network.json`), 'utf-8')) as NetworkMap;
  } catch {
    return null;
  }
};

/** Enrichment con super-connectors para outreach prioritization. */
export const buildNetworkEnrichment = async (brandId: string): Promise<string> => {
  const map = await getNetworkMap(brandId);
  if (!map || map.superConnectors.length === 0) return '';
  const parts: string[] = ['[NETWORK MAP — cuentas para activar cascadas]'];
  for (const sc of map.superConnectors.slice(0, 5)) {
    parts.push(
      `- ${sc.handle} (centrality ${(sc.centralityScore * 100).toFixed(0)}%, amplification ${sc.amplificationFactor.toFixed(1)}x) — ${sc.niche}`,
    );
  }
  parts.push(
    `Tu posición: centrality ${(map.ownPosition.centralityScore * 100).toFixed(0)}% — gap accounts a conectar: ${map.ownPosition.gapAccounts.join(', ')}`,
  );
  parts.push('[FIN NETWORK MAP]');
  return parts.join('\n');
};
