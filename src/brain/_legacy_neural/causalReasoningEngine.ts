// @ts-nocheck
/**
 * Causal Reasoning Engine — razonamiento causal, no solo correlacional.
 *
 * Mientras feedbackLoop ve "engagement bajó", causal engine pregunta:
 *   - ¿QUÉ causó la caída?
 *   - ¿Qué intervención específica reverte esto?
 *   - Counterfactual: "si NO hubiera hecho X, ¿qué habría pasado?"
 *
 * Construye Causal Graph (DAG) con nodes = variables, edges = causa→efecto.
 * Permite hacer "do-calculus" estilo Judea Pearl (simplificado).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const CAUSAL_DIR = path.resolve('data/neural/causal');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface CausalNode {
  id: string;
  name: string;
  type: 'metric' | 'action' | 'event' | 'context' | 'attribute';
  observable: boolean;
  currentValue?: number;
}

export interface CausalEdge {
  from: string; // node id
  to: string;
  strength: number; // -1 a 1 (signo + magnitud)
  confidence: number; // 0-1
  mechanism: string; // explicación de cómo causa
  lag: 'instant' | 'hours' | 'days' | 'weeks';
}

export interface CausalGraph {
  brandId: string;
  generatedAt: string;
  nodes: CausalNode[];
  edges: CausalEdge[];
  rootCauses: Array<{ nodeId: string; downstreamImpact: number }>;
}

export interface CounterfactualQuery {
  question: string;
  outcomeNode: string;
  intervention: { nodeId: string; setValue: number };
  baseline: { nodeId: string; observedValue: number };
}

export interface CounterfactualResult {
  query: CounterfactualQuery;
  baselineOutcome: number;
  counterfactualOutcome: number;
  causalEffect: number; // diff entre los dos
  confidence: number;
  pathwaysContributing: string[];
  recommendation: string;
}

// ── Construcción del grafo causal ────────────────────────────────────────────

export const buildCausalGraph = async (
  brand: BrandProfile,
  observedData: {
    metrics: Record<string, number>;
    recentActions: string[];
    contextEvents: string[];
  },
): Promise<CausalGraph> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[causalReasoning] building graph', { brandId });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Experto en causal inference aplicado a Instagram.
Construís DAGs (directed acyclic graphs) de causa-efecto entre variables.
Distingues correlación de causación. Identificás confounders.`,
    messages: [
      {
        role: 'user',
        content: `Construí causal graph para ${brand.name}:

Métricas observadas: ${JSON.stringify(observedData.metrics)}
Acciones recientes: ${observedData.recentActions.join(', ')}
Eventos contexto: ${observedData.contextEvents.join(', ')}

Identificá 15-25 nodes (métricas, acciones, eventos, atributos del contenido) y los edges causales entre ellos.

JSON: {
  "nodes": [{
    "name": "engagement_rate",
    "type": "metric|action|event|context|attribute",
    "observable": true,
    "currentValue": número opcional
  }],
  "edges": [{
    "from": "node-name-source",
    "to": "node-name-target",
    "strength": -1 a 1 (signo y magnitud),
    "confidence": 0-1,
    "mechanism": "cómo X causa Y",
    "lag": "instant|hours|days|weeks"
  }],
  "rootCauses": [{
    "nodeName": "node con mucho downstream impact",
    "downstreamImpact": 0-1
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[causalReasoning] No graph');

  const generated = JSON.parse(jsonMatch[0]) as {
    nodes: Array<Partial<CausalNode> & { name: string }>;
    edges: Array<Partial<CausalEdge>>;
    rootCauses: Array<{ nodeName: string; downstreamImpact: number }>;
  };

  const nodes: CausalNode[] = generated.nodes.map((n, i) => ({
    id: `node-${i}`,
    name: n.name,
    type: n.type ?? 'metric',
    observable: n.observable ?? true,
    currentValue: n.currentValue,
  }));

  const nameToId: Record<string, string> = {};
  for (const n of nodes) nameToId[n.name] = n.id;

  const edges: CausalEdge[] = (generated.edges ?? []).map((e) => ({
    from: nameToId[e.from as string] ?? e.from!,
    to: nameToId[e.to as string] ?? e.to!,
    strength: e.strength ?? 0,
    confidence: e.confidence ?? 0.5,
    mechanism: e.mechanism ?? '',
    lag: e.lag ?? 'days',
  }));

  const rootCauses = (generated.rootCauses ?? []).map((rc) => ({
    nodeId: nameToId[rc.nodeName] ?? rc.nodeName,
    downstreamImpact: rc.downstreamImpact,
  }));

  const graph: CausalGraph = {
    brandId,
    generatedAt: new Date().toISOString(),
    nodes,
    edges,
    rootCauses,
  };

  await fs.mkdir(CAUSAL_DIR, { recursive: true });
  await fs.writeFile(path.join(CAUSAL_DIR, `${brandId}-graph.json`), JSON.stringify(graph, null, 2), 'utf-8');
  log.info('[causalReasoning] graph saved', { nodes: nodes.length, edges: edges.length });
  return graph;
};

// ── Counterfactual reasoning ─────────────────────────────────────────────────

export const runCounterfactual = async (brandId: string, query: CounterfactualQuery): Promise<CounterfactualResult> => {
  let graph: CausalGraph;
  try {
    graph = JSON.parse(await fs.readFile(path.join(CAUSAL_DIR, `${brandId}-graph.json`), 'utf-8')) as CausalGraph;
  } catch {
    throw new Error('[causalReasoning] No graph for brand — build first');
  }

  // Propagar intervención a través de edges desde intervention.nodeId hasta outcomeNode
  const visited = new Set<string>();
  const pathways: string[] = [];

  const propagate = (currentId: string, currentEffect: number, depth = 0): number => {
    if (depth > 5 || visited.has(currentId)) return 0;
    visited.add(currentId);

    if (currentId === query.outcomeNode) return currentEffect;

    const outEdges = graph.edges.filter((e) => e.from === currentId);
    let totalEffect = 0;
    for (const edge of outEdges) {
      const propagatedEffect = currentEffect * edge.strength * edge.confidence;
      const node = graph.nodes.find((n) => n.id === edge.to);
      if (node) pathways.push(`${currentId} → ${node.name} (strength ${edge.strength.toFixed(2)})`);
      totalEffect += propagate(edge.to, propagatedEffect, depth + 1);
    }
    return totalEffect;
  };

  const baselineOutcome = query.baseline.observedValue;
  const interventionMagnitude =
    query.intervention.setValue - (graph.nodes.find((n) => n.id === query.intervention.nodeId)?.currentValue ?? 0);
  const causalEffect = propagate(query.intervention.nodeId, interventionMagnitude);
  const counterfactualOutcome = baselineOutcome + causalEffect;

  const result: CounterfactualResult = {
    query,
    baselineOutcome,
    counterfactualOutcome,
    causalEffect,
    confidence: Math.min(1, Math.max(0, 1 - visited.size * 0.05)),
    pathwaysContributing: pathways.slice(0, 5),
    recommendation:
      causalEffect > 0
        ? `Intervención produciría +${causalEffect.toFixed(2)} en ${query.outcomeNode} — vale la pena`
        : causalEffect < 0
          ? `Intervención reduce ${query.outcomeNode} en ${Math.abs(causalEffect).toFixed(2)} — evitar`
          : `Sin efecto causal detectable — neutral`,
  };

  return result;
};

// ── Root cause analysis ──────────────────────────────────────────────────────

export const findRootCauses = async (
  brandId: string,
  symptomNodeId: string,
  maxDepth = 4,
): Promise<Array<{ rootNode: CausalNode; pathway: string[]; cumulativeEffect: number }>> => {
  let graph: CausalGraph;
  try {
    graph = JSON.parse(await fs.readFile(path.join(CAUSAL_DIR, `${brandId}-graph.json`), 'utf-8')) as CausalGraph;
  } catch {
    return [];
  }

  const results: Array<{ rootNode: CausalNode; pathway: string[]; cumulativeEffect: number }> = [];

  const traverse = (currentId: string, pathway: string[], effect: number, depth: number): void => {
    if (depth > maxDepth) return;
    const inEdges = graph.edges.filter((e) => e.to === currentId);
    if (inEdges.length === 0) {
      const rootNode = graph.nodes.find((n) => n.id === currentId);
      if (rootNode) results.push({ rootNode, pathway, cumulativeEffect: effect });
      return;
    }
    for (const edge of inEdges) {
      const sourceNode = graph.nodes.find((n) => n.id === edge.from);
      if (!sourceNode) continue;
      traverse(edge.from, [sourceNode.name, ...pathway], effect * edge.strength * edge.confidence, depth + 1);
    }
  };

  const symptom = graph.nodes.find((n) => n.id === symptomNodeId);
  if (symptom) traverse(symptomNodeId, [symptom.name], 1, 0);

  return results.sort((a, b) => Math.abs(b.cumulativeEffect) - Math.abs(a.cumulativeEffect)).slice(0, 5);
};

export const getCausalGraph = async (brandId: string): Promise<CausalGraph | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(CAUSAL_DIR, `${brandId}-graph.json`), 'utf-8')) as CausalGraph;
  } catch {
    return null;
  }
};
