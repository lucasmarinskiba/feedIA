export type RenderFormat = 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf' | 'svg' | 'webp';

export type ContentAssetType = 'image' | 'video' | 'audio' | 'font' | 'vector';

export interface ContentAsset {
  id: string;
  type: ContentAssetType;
  source: 'generated' | 'uploaded' | 'stock' | 'brand-kit' | 'moodboard';
  url?: string;
  localPath?: string;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface RenderRequest {
  id: string;
  recipeId?: string;
  format: RenderFormat;
  title: string;
  brandProfileId: string;
  assets: ContentAsset[];
  fields: Record<string, string>;
  options?: Record<string, unknown>;
  userHandle?: string;
}

export interface RenderResult {
  ok: boolean;
  requestId: string;
  engineName: string;
  format: RenderFormat;
  artifactUrls?: string[];
  artifactLocalPaths?: string[];
  designId?: string;
  designUrl?: string;
  assetIds?: string[];
  costEstimate?: number;
  durationMs: number;
  error?: string;
}

export interface EngineCapability {
  formats: RenderFormat[];
  supportsAnimation: boolean;
  supportsAudio: boolean;
  maxResolution: { width: number; height: number };
  bulkRender: boolean;
  assetUpload: boolean;
}

export interface EngineEstimate {
  cost: number; // abstract cost units (USD cents or API credits)
  durationSeconds: number;
  rateLimited: boolean;
}

export interface PipelineStep {
  stepId: string;
  engine: string;
  request: RenderRequest;
  dependsOn?: string[];
}

export interface PipelineResult {
  ok: boolean;
  pipelineId: string;
  steps: Array<{
    stepId: string;
    result: RenderResult;
    startedAt: string;
    finishedAt: string;
  }>;
  artifacts: ContentAsset[];
  totalDurationMs: number;
  error?: string;
}

export interface RecipeInput {
  idea: string;
  brandTone?: string;
  objective?: string;
  targetFormat?: string;
  extraParams?: Record<string, unknown>;
}

export interface RecipeOutput {
  recipeId: string;
  ok: boolean;
  contentPieces: Array<{
    format: string;
    title: string;
    caption?: string;
    hashtags?: string[];
    assets: ContentAsset[];
    renderResults: RenderResult[];
  }>;
  pipelineResults: PipelineResult[];
  error?: string;
}
