import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface CuratorSource {
  id: string;
  tipo: 'rss' | 'url' | 'newsletter' | 'paper-feed' | 'reddit-subreddit' | 'manual';
  nombre: string;
  url?: string;
  ultimaRevision?: string;
  activo: boolean;
}

export interface BacklogItem {
  id: string;
  sourceId: string;
  capturadoEn: string;
  resumen: string;
  urlOriginal?: string;
  scoreRelevancia: number;
  ideasDerivadas: string[];
  status: 'nuevo' | 'aprobado' | 'usado' | 'descartado';
  formatosSugeridos: Array<'reel' | 'carrusel' | 'historia' | 'post-imagen'>;
}

const SOURCES_PATH = resolve('data/runtime/curator-sources.json');
const BACKLOG_PATH = resolve('data/runtime/curator-backlog.json');

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

export const loadSources = (): CuratorSource[] =>
  existsSync(SOURCES_PATH) ? (JSON.parse(readFileSync(SOURCES_PATH, 'utf-8')) as CuratorSource[]) : [];

export const saveSources = (sources: CuratorSource[]): void => {
  ensureDir();
  writeFileSync(SOURCES_PATH, JSON.stringify(sources, null, 2), 'utf-8');
};

export const loadBacklog = (): BacklogItem[] =>
  existsSync(BACKLOG_PATH) ? (JSON.parse(readFileSync(BACKLOG_PATH, 'utf-8')) as BacklogItem[]) : [];

export const saveBacklog = (items: BacklogItem[]): void => {
  ensureDir();
  writeFileSync(BACKLOG_PATH, JSON.stringify(items, null, 2), 'utf-8');
};

export const addSource = (source: Omit<CuratorSource, 'id'>): CuratorSource => {
  const sources = loadSources();
  const created: CuratorSource = {
    id: `src-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    ...source,
  };
  sources.push(created);
  saveSources(sources);
  return created;
};

export const removeSource = (id: string): boolean => {
  const sources = loadSources();
  const next = sources.filter((s) => s.id !== id);
  if (next.length === sources.length) return false;
  saveSources(next);
  return true;
};

export const updateSourceLastReview = (id: string): void => {
  const sources = loadSources();
  const s = sources.find((src) => src.id === id);
  if (s) {
    s.ultimaRevision = new Date().toISOString();
    saveSources(sources);
  }
};
