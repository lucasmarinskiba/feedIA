/**
 * Originality Store — persisted fingerprints of every piece this brand has
 * produced or considered. Indexed on disk so the similarity check stays
 * sub-millisecond even with thousands of historical posts.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { ContentFingerprint } from './fingerprint.js';

interface FingerprintStoreShape {
  fingerprints: ContentFingerprint[];
}

const PATH = resolve('data/runtime/fingerprints.json');

const readStore = (): FingerprintStoreShape => {
  if (!existsSync(PATH)) return { fingerprints: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as FingerprintStoreShape;
  } catch {
    return { fingerprints: [] };
  }
};

const writeStore = (s: FingerprintStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

export const saveFingerprint = (fp: ContentFingerprint): void => {
  const s = readStore();
  // Replace if id already exists.
  const idx = s.fingerprints.findIndex((f) => f.id === fp.id);
  if (idx >= 0) s.fingerprints[idx] = fp;
  else s.fingerprints.push(fp);
  // Keep last 1000 — beyond that, oldest gets dropped.
  if (s.fingerprints.length > 1000) {
    s.fingerprints.splice(0, s.fingerprints.length - 1000);
  }
  writeStore(s);
};

export const listFingerprints = (limit?: number): ContentFingerprint[] => {
  const all = readStore().fingerprints;
  return limit ? all.slice(-limit) : all;
};

export const getFingerprint = (id: string): ContentFingerprint | undefined =>
  readStore().fingerprints.find((f) => f.id === id);

export const clearOldFingerprints = (olderThanDays: number): number => {
  const s = readStore();
  const cutoff = Date.now() - olderThanDays * 86_400_000;
  const before = s.fingerprints.length;
  s.fingerprints = s.fingerprints.filter((f) => Date.parse(f.createdAt) >= cutoff);
  if (s.fingerprints.length !== before) writeStore(s);
  return before - s.fingerprints.length;
};
