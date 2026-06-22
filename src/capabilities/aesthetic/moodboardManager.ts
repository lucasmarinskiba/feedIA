import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

export interface MoodboardEntry {
  id: string;
  url: string;
  tags: string[];
  source: 'url' | 'upload' | 'generated';
  campaign?: string;
  season?: string;
  addedAt: string;
}

export interface Moodboard {
  id: string;
  name: string;
  description: string;
  entries: MoodboardEntry[];
  createdAt: string;
  updatedAt: string;
}

const MOODBOARD_DIR = resolve('data/runtime/moodboards');

const ensureDir = (): void => {
  mkdirSync(MOODBOARD_DIR, { recursive: true });
};

const moodboardPath = (id: string): string => resolve(MOODBOARD_DIR, `${id}.json`);

export const createMoodboard = (name: string, description?: string): Moodboard => {
  ensureDir();
  const id = `mb-${Date.now()}`;
  const board: Moodboard = {
    id,
    name,
    description: description ?? '',
    entries: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(moodboardPath(id), JSON.stringify(board, null, 2), 'utf-8');
  return board;
};

export const getMoodboard = (id: string): Moodboard | null => {
  const path = moodboardPath(id);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8')) as Moodboard;
};

export const listMoodboards = (): Moodboard[] => {
  ensureDir();
  const files = readdirSync(MOODBOARD_DIR).filter((f) => f.endsWith('.json'));
  return files.map((f) => JSON.parse(readFileSync(resolve(MOODBOARD_DIR, f), 'utf-8')) as Moodboard);
};

export const addEntry = (moodboardId: string, entry: Omit<MoodboardEntry, 'id' | 'addedAt'>): Moodboard | null => {
  const board = getMoodboard(moodboardId);
  if (!board) return null;
  const newEntry: MoodboardEntry = {
    ...entry,
    id: `me-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    addedAt: new Date().toISOString(),
  };
  board.entries.push(newEntry);
  board.updatedAt = new Date().toISOString();
  writeFileSync(moodboardPath(moodboardId), JSON.stringify(board, null, 2), 'utf-8');
  return board;
};

export const removeEntry = (moodboardId: string, entryId: string): Moodboard | null => {
  const board = getMoodboard(moodboardId);
  if (!board) return null;
  board.entries = board.entries.filter((e) => e.id !== entryId);
  board.updatedAt = new Date().toISOString();
  writeFileSync(moodboardPath(moodboardId), JSON.stringify(board, null, 2), 'utf-8');
  return board;
};

export const findEntriesByTag = (moodboardId: string, tag: string): MoodboardEntry[] => {
  const board = getMoodboard(moodboardId);
  if (!board) return [];
  return board.entries.filter((e) => e.tags.includes(tag));
};
