import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface RotationState {
  recentlyUsed: Record<string, string[]>;
}

const ROTATION_PATH = resolve('data/runtime/hashtag-rotation.json');

const loadState = (): RotationState => {
  if (!existsSync(ROTATION_PATH)) return { recentlyUsed: {} };
  return JSON.parse(readFileSync(ROTATION_PATH, 'utf-8')) as RotationState;
};

const saveState = (state: RotationState): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
  writeFileSync(ROTATION_PATH, JSON.stringify(state, null, 2), 'utf-8');
};

export interface RotationOptions {
  pool: string[];
  bucket: string;
  count: number;
  cooldownDays?: number;
}

const daysAgo = (iso: string): number => Math.floor((Date.now() - new Date(iso).getTime()) / 86400_000);

export const pickFromPool = (opts: RotationOptions): string[] => {
  const cooldown = opts.cooldownDays ?? 7;
  const state = loadState();
  const usedRaw = state.recentlyUsed[opts.bucket] ?? [];
  const usedTags = new Set(
    usedRaw
      .map((entry) => entry.split('::'))
      .filter(([, when]) => when !== undefined && daysAgo(when) < cooldown)
      .map(([tag]) => tag!),
  );

  const fresh = opts.pool.filter((tag) => !usedTags.has(tag));
  const stale = opts.pool.filter((tag) => usedTags.has(tag));
  const ordered = [...fresh, ...stale];
  const picked = ordered.slice(0, opts.count);

  const now = new Date().toISOString();
  const updated = [
    ...picked.map((tag) => `${tag}::${now}`),
    ...usedRaw.filter((entry) => {
      const parts = entry.split('::');
      const when = parts[1];
      return when !== undefined && daysAgo(when) < cooldown * 2;
    }),
  ].slice(0, 200);

  state.recentlyUsed[opts.bucket] = updated;
  saveState(state);
  return picked;
};

export const buildPostHashtags = (
  pools: {
    mega: string[];
    grande: string[];
    medio: string[];
    nicho: string[];
    marca: string[];
  },
  mix: { mega: number; grande: number; medio: number; nicho: number; marca: number },
): string[] => [
  ...pickFromPool({ pool: pools.mega, bucket: 'mega', count: mix.mega }),
  ...pickFromPool({ pool: pools.grande, bucket: 'grande', count: mix.grande }),
  ...pickFromPool({ pool: pools.medio, bucket: 'medio', count: mix.medio }),
  ...pickFromPool({ pool: pools.nicho, bucket: 'nicho', count: mix.nicho }),
  ...pickFromPool({ pool: pools.marca, bucket: 'marca', count: mix.marca }),
];
