import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { BrandKit, BrandKitAsset, BrandKitAssetType } from './types.js';

const BRANDKIT_DIR = 'data/runtime/brandkit';

function kitPath(brandId: string): string {
  return join(BRANDKIT_DIR, `${brandId}.json`);
}

function ensureDir(): void {
  if (!existsSync(BRANDKIT_DIR)) mkdirSync(BRANDKIT_DIR, { recursive: true });
}

export const loadBrandKit = (brandId: string): BrandKit | null => {
  ensureDir();
  const path = kitPath(brandId);
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as BrandKit;
  } catch {
    return null;
  }
};

export const saveBrandKit = (kit: BrandKit): void => {
  ensureDir();
  writeFileSync(kitPath(kit.brandId), JSON.stringify(kit, null, 2), 'utf-8');
};

export const ensureBrandKit = (brandId: string): BrandKit => {
  const existing = loadBrandKit(brandId);
  if (existing) return existing;
  const kit: BrandKit = {
    brandId,
    assets: [],
    palette: { primary: [], secondary: [], neutrals: [], accent: [], semantic: {} },
    typography: { headings: '', body: '', scale: {} },
    updatedAt: new Date().toISOString(),
  };
  saveBrandKit(kit);
  return kit;
};

export const addAsset = (
  brandId: string,
  asset: Omit<BrandKitAsset, 'id' | 'createdAt' | 'updatedAt'>,
): BrandKitAsset => {
  const kit = ensureBrandKit(brandId);
  const fullAsset: BrandKitAsset = {
    ...asset,
    id: `bk-${asset.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  kit.assets.push(fullAsset);
  kit.updatedAt = new Date().toISOString();
  saveBrandKit(kit);
  return fullAsset;
};

export const getAsset = (brandId: string, assetId: string): BrandKitAsset | undefined => {
  const kit = loadBrandKit(brandId);
  return kit?.assets.find((a) => a.id === assetId);
};

export const listAssets = (brandId: string, type?: BrandKitAssetType): BrandKitAsset[] => {
  const kit = loadBrandKit(brandId);
  if (!kit) return [];
  if (type) return kit.assets.filter((a) => a.type === type);
  return [...kit.assets];
};

export const removeAsset = (brandId: string, assetId: string): boolean => {
  const kit = loadBrandKit(brandId);
  if (!kit) return false;
  const idx = kit.assets.findIndex((a) => a.id === assetId);
  if (idx === -1) return false;
  kit.assets.splice(idx, 1);
  kit.updatedAt = new Date().toISOString();
  saveBrandKit(kit);
  return true;
};

export const updateAsset = (
  brandId: string,
  assetId: string,
  updates: Partial<Omit<BrandKitAsset, 'id' | 'createdAt'>>,
): BrandKitAsset | null => {
  const kit = loadBrandKit(brandId);
  if (!kit) return null;
  const asset = kit.assets.find((a) => a.id === assetId);
  if (!asset) return null;
  Object.assign(asset, updates, { updatedAt: new Date().toISOString() });
  kit.updatedAt = new Date().toISOString();
  saveBrandKit(kit);
  return asset;
};
