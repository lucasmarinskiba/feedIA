export type BrandKitAssetType =
  | 'logo'
  | 'avatar'
  | 'highlight-cover'
  | 'watermark'
  | 'signature'
  | 'font'
  | 'color-swatch'
  | 'texture'
  | 'icon';

export interface BrandKitAsset {
  id: string;
  type: BrandKitAssetType;
  name: string;
  url: string;
  variants?: Record<string, string>;
  usageRules: string[];
  minSize?: string;
  clearspace?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrandKitPalette {
  primary: string[];
  secondary: string[];
  neutrals: string[];
  accent: string[];
  semantic: Record<string, string>;
}

export interface BrandKitTypography {
  headings: string;
  body: string;
  scale: Record<string, string>;
}

export interface BrandKit {
  brandId: string;
  assets: BrandKitAsset[];
  palette: BrandKitPalette;
  typography: BrandKitTypography;
  updatedAt: string;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  field: string;
  message: string;
  suggestion?: string;
}

export interface ValidationResult {
  valid: boolean;
  score: number;
  issues: ValidationIssue[];
}

export interface BrandConsistencyResult {
  totalScore: number;
  paletteScore: number;
  typographyScore: number;
  iconographyScore: number;
  voiceScore: number;
  compositionScore: number;
  issues: ValidationIssue[];
  passed: boolean;
  threshold: number;
}
