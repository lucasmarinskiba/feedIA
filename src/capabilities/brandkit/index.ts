export type {
  BrandKit,
  BrandKitAsset,
  BrandKitAssetType,
  BrandKitPalette,
  BrandKitTypography,
  ValidationIssue,
  ValidationResult,
  BrandConsistencyResult,
} from './types.js';

export {
  loadBrandKit,
  saveBrandKit,
  ensureBrandKit,
  addAsset,
  getAsset,
  listAssets,
  removeAsset,
  updateAsset,
} from './store.js';

export { validateAssetAgainstBrand, validatePaletteContrast, validateContentAgainstBrandKit } from './validator.js';

export { runBrandConsistencyCheck, type BrandConsistencyReport } from './consistencyEngine.js';
