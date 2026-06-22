// @ts-nocheck
/**
 * Knowledge Graph — Grafo de conocimiento navegable para el cerebro FeedIA
 * Triples: Subject → Relation → Object
 * Ej: "MarcaX" → "tiene público" → "Emprendedores 25-34"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
// log imported lazily to avoid unused-var lint error; used in future debug expansions
// import { log } from '../../agent/logger.js';

const KG_PATH = resolve('data/runtime/brain/knowledge-graph.json');

export interface Triple {
  id: string;
  subject: string;
  relation: string;
  object: string;
  confidence: number; // 0-1
  source: string;
  timestamp: string;
}

interface KGStore {
  triples: Triple[];
  entities: Set<string>;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): KGStore => {
  try {
    ensureDir();
    if (!existsSync(KG_PATH)) return { triples: [], entities: new Set() };
    const raw = JSON.parse(readFileSync(KG_PATH, 'utf-8'));
    return { triples: raw.triples ?? [], entities: new Set(raw.entities ?? []) };
  } catch {
    return { triples: [], entities: new Set() };
  }
};

const saveStore = (store: KGStore): void => {
  ensureDir();
  writeFileSync(
    KG_PATH,
    JSON.stringify(
      {
        triples: store.triples,
        entities: Array.from(store.entities),
      },
      null,
      2,
    ),
    'utf-8',
  );
};

export const addTriple = (
  subject: string,
  relation: string,
  object: string,
  confidence = 0.8,
  source = 'inferred',
): Triple => {
  const store = loadStore();
  const triple: Triple = {
    id: `kg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    subject: subject.trim(),
    relation: relation.trim(),
    object: object.trim(),
    confidence,
    source,
    timestamp: new Date().toISOString(),
  };
  store.triples.push(triple);
  store.entities.add(triple.subject);
  store.entities.add(triple.object);
  saveStore(store);
  return triple;
};

export const querySubject = (subject: string): Triple[] => {
  const store = loadStore();
  return store.triples.filter((t) => t.subject.toLowerCase() === subject.toLowerCase());
};

export const queryObject = (object: string): Triple[] => {
  const store = loadStore();
  return store.triples.filter((t) => t.object.toLowerCase() === object.toLowerCase());
};

export const queryRelation = (relation: string): Triple[] => {
  const store = loadStore();
  return store.triples.filter((t) => t.relation.toLowerCase() === relation.toLowerCase());
};

export const findPath = (from: string, to: string, maxDepth = 3): Triple[][] => {
  const store = loadStore();
  const paths: Triple[][] = [];
  const visited = new Set<string>();

  const dfs = (current: string, target: string, depth: number, path: Triple[]): void => {
    if (depth > maxDepth) return;
    if (current.toLowerCase() === target.toLowerCase()) {
      paths.push([...path]);
      return;
    }
    if (visited.has(`${current}-${depth}`)) return;
    visited.add(`${current}-${depth}`);
    for (const t of store.triples) {
      if (t.subject.toLowerCase() === current.toLowerCase() && !path.includes(t)) {
        dfs(t.object, target, depth + 1, [...path, t]);
      }
    }
  };

  dfs(from, to, 0, []);
  return paths.sort((a, b) => b.length - a.length);
};

export const getRelatedEntities = (entity: string, depth = 1): string[] => {
  const store = loadStore();
  const related = new Set<string>();
  const visit = (e: string, d: number): void => {
    if (d > depth) return;
    for (const t of store.triples) {
      if (t.subject.toLowerCase() === e.toLowerCase()) {
        related.add(t.object);
        visit(t.object, d + 1);
      }
      if (t.object.toLowerCase() === e.toLowerCase()) {
        related.add(t.subject);
        visit(t.subject, d + 1);
      }
    }
  };
  visit(entity, 0);
  related.delete(entity);
  return Array.from(related);
};

export const getInsightsAbout = (entity: string): { relation: string; objects: string[] }[] => {
  const triples = querySubject(entity);
  const grouped = new Map<string, string[]>();
  for (const t of triples) {
    const arr = grouped.get(t.relation) ?? [];
    arr.push(t.object);
    grouped.set(t.relation, arr);
  }
  return Array.from(grouped.entries()).map(([relation, objects]) => ({ relation, objects }));
};

export const getStats = (): { triples: number; entities: number; topRelations: string[] } => {
  const store = loadStore();
  const relCounts = new Map<string, number>();
  for (const t of store.triples) relCounts.set(t.relation, (relCounts.get(t.relation) ?? 0) + 1);
  const topRelations = Array.from(relCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([r]) => r);
  return { triples: store.triples.length, entities: store.entities.size, topRelations };
};

export const exportAsContext = (entity: string): string => {
  const insights = getInsightsAbout(entity);
  if (insights.length === 0) return '';
  const lines = [`CONOCIMIENTO SOBRE "${entity}":`];
  for (const i of insights) {
    lines.push(`  - ${i.relation}: ${i.objects.join(', ')}`);
  }
  const related = getRelatedEntities(entity, 1);
  if (related.length > 0) lines.push(`  - Relacionado con: ${related.slice(0, 10).join(', ')}`);
  return lines.join('\n');
};
