/**
 * Knowledge Graph — entidades + relaciones del cerebro.
 *
 * Nodes: brand, post, audience-segment, competitor, trend, persona, topic, hashtag.
 * Edges: tipadas (creates, targets, similar-to, inspired-by, competes-with, etc).
 *
 * Permite queries grafo:
 *   - Posts del topic X que tuvieron reward > 0.5
 *   - Personas que respondieron mejor a hook tipo Y
 *   - Competidores que comparten audience-segment con marca
 *
 * Local-only, file-based.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const GRAPH_DIR = path.resolve('data/neural/knowledge-graph');

export type NodeType =
  | 'brand'
  | 'post'
  | 'audience-segment'
  | 'competitor'
  | 'trend'
  | 'persona'
  | 'topic'
  | 'hashtag'
  | 'campaign'
  | 'experiment';

export type EdgeType =
  | 'creates'
  | 'targets'
  | 'similar-to'
  | 'inspired-by'
  | 'competes-with'
  | 'uses'
  | 'engages-with'
  | 'converts'
  | 'belongs-to'
  | 'part-of'
  | 'preceded-by'
  | 'caused-by'
  | 'addresses'
  | 'avoids';

export interface GraphNode {
  id: string;
  type: NodeType;
  label: string;
  attributes: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface GraphEdge {
  id: string;
  from: string;
  to: string;
  type: EdgeType;
  weight: number; // 0-1 strength
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface KnowledgeGraph {
  brandId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedAt: string;
}

const graphPath = (brandId: string): string => path.join(GRAPH_DIR, `${brandId}-graph.json`);

const loadGraph = async (brandId: string): Promise<KnowledgeGraph> => {
  try {
    return JSON.parse(await fs.readFile(graphPath(brandId), 'utf-8')) as KnowledgeGraph;
  } catch {
    return { brandId, nodes: [], edges: [], updatedAt: new Date().toISOString() };
  }
};

const saveGraph = async (graph: KnowledgeGraph): Promise<void> => {
  await fs.mkdir(GRAPH_DIR, { recursive: true });
  graph.updatedAt = new Date().toISOString();
  await fs.writeFile(graphPath(graph.brandId), JSON.stringify(graph, null, 2), 'utf-8');
};

export const upsertNode = async (
  brandId: string,
  node: Omit<GraphNode, 'createdAt' | 'updatedAt'>,
): Promise<GraphNode> => {
  const graph = await loadGraph(brandId);
  const existing = graph.nodes.find((n) => n.id === node.id);
  const now = new Date().toISOString();

  if (existing) {
    existing.label = node.label;
    existing.attributes = { ...existing.attributes, ...node.attributes };
    existing.updatedAt = now;
    await saveGraph(graph);
    return existing;
  }

  const newNode: GraphNode = { ...node, createdAt: now, updatedAt: now };
  graph.nodes.push(newNode);
  await saveGraph(graph);
  return newNode;
};

export const addEdge = async (brandId: string, edge: Omit<GraphEdge, 'id' | 'createdAt'>): Promise<GraphEdge> => {
  const graph = await loadGraph(brandId);
  const newEdge: GraphEdge = {
    ...edge,
    id: `edge-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  graph.edges.push(newEdge);
  await saveGraph(graph);
  return newEdge;
};

export const findNodes = async (
  brandId: string,
  filter: { type?: NodeType; labelContains?: string; attributeKey?: string; attributeValue?: unknown } = {},
): Promise<GraphNode[]> => {
  const graph = await loadGraph(brandId);
  return graph.nodes.filter((n) => {
    if (filter.type && n.type !== filter.type) return false;
    if (filter.labelContains && !n.label.toLowerCase().includes(filter.labelContains.toLowerCase())) return false;
    if (
      filter.attributeKey &&
      filter.attributeValue !== undefined &&
      n.attributes[filter.attributeKey] !== filter.attributeValue
    )
      return false;
    return true;
  });
};

export const findEdges = async (
  brandId: string,
  filter: { from?: string; to?: string; type?: EdgeType; minWeight?: number } = {},
): Promise<GraphEdge[]> => {
  const graph = await loadGraph(brandId);
  return graph.edges.filter((e) => {
    if (filter.from && e.from !== filter.from) return false;
    if (filter.to && e.to !== filter.to) return false;
    if (filter.type && e.type !== filter.type) return false;
    if (filter.minWeight !== undefined && e.weight < filter.minWeight) return false;
    return true;
  });
};

export const getNeighbors = async (
  brandId: string,
  nodeId: string,
  options: { direction?: 'outgoing' | 'incoming' | 'both'; edgeType?: EdgeType } = {},
): Promise<Array<{ node: GraphNode; edge: GraphEdge }>> => {
  const graph = await loadGraph(brandId);
  const direction = options.direction ?? 'both';
  const relevant = graph.edges.filter((e) => {
    if (options.edgeType && e.type !== options.edgeType) return false;
    if (direction === 'outgoing') return e.from === nodeId;
    if (direction === 'incoming') return e.to === nodeId;
    return e.from === nodeId || e.to === nodeId;
  });
  const result: Array<{ node: GraphNode; edge: GraphEdge }> = [];
  for (const edge of relevant) {
    const otherId = edge.from === nodeId ? edge.to : edge.from;
    const node = graph.nodes.find((n) => n.id === otherId);
    if (node) result.push({ node, edge });
  }
  return result;
};

export const traverseBFS = async (
  brandId: string,
  startNodeId: string,
  maxDepth = 3,
  edgeFilter?: EdgeType[],
): Promise<Array<{ node: GraphNode; depth: number; pathLength: number }>> => {
  const graph = await loadGraph(brandId);
  const visited = new Set<string>([startNodeId]);
  const queue: Array<{ id: string; depth: number }> = [{ id: startNodeId, depth: 0 }];
  const results: Array<{ node: GraphNode; depth: number; pathLength: number }> = [];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    if (depth > maxDepth) continue;
    const node = graph.nodes.find((n) => n.id === id);
    if (node) results.push({ node, depth, pathLength: depth });
    if (depth >= maxDepth) continue;

    const outEdges = graph.edges.filter((e) => {
      if (edgeFilter && !edgeFilter.includes(e.type)) return false;
      return e.from === id;
    });
    for (const edge of outEdges) {
      if (!visited.has(edge.to)) {
        visited.add(edge.to);
        queue.push({ id: edge.to, depth: depth + 1 });
      }
    }
  }
  return results;
};

export const computeNodeCentrality = async (
  brandId: string,
): Promise<Array<{ node: GraphNode; degree: number; centrality: number }>> => {
  const graph = await loadGraph(brandId);
  const degreeMap = new Map<string, number>();
  for (const edge of graph.edges) {
    degreeMap.set(edge.from, (degreeMap.get(edge.from) ?? 0) + 1);
    degreeMap.set(edge.to, (degreeMap.get(edge.to) ?? 0) + 1);
  }
  const maxDegree = Math.max(1, ...degreeMap.values());
  return graph.nodes
    .map((node) => {
      const degree = degreeMap.get(node.id) ?? 0;
      return { node, degree, centrality: degree / maxDegree };
    })
    .sort((a, b) => b.centrality - a.centrality);
};

export const queryHighRewardPosts = async (brandId: string, minReward = 0.5): Promise<GraphNode[]> => {
  const graph = await loadGraph(brandId);
  return graph.nodes.filter((n) => {
    if (n.type !== 'post') return false;
    const reward = n.attributes['reward'];
    return typeof reward === 'number' && reward >= minReward;
  });
};

export const getGraphStats = async (
  brandId: string,
): Promise<{
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  avgDegree: number;
  mostCentralNode: GraphNode | null;
}> => {
  const graph = await loadGraph(brandId);
  const nodesByType: Record<string, number> = {};
  for (const n of graph.nodes) nodesByType[n.type] = (nodesByType[n.type] ?? 0) + 1;
  const edgesByType: Record<string, number> = {};
  for (const e of graph.edges) edgesByType[e.type] = (edgesByType[e.type] ?? 0) + 1;
  const avgDegree = graph.nodes.length > 0 ? (graph.edges.length * 2) / graph.nodes.length : 0;
  const centrality = await computeNodeCentrality(brandId);
  return {
    totalNodes: graph.nodes.length,
    totalEdges: graph.edges.length,
    nodesByType,
    edgesByType,
    avgDegree,
    mostCentralNode: centrality[0]?.node ?? null,
  };
};

log.info('[knowledgeGraph] module loaded');
