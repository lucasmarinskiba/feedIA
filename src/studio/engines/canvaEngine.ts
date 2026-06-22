import { BaseEngine } from './base.js';
import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';
import { autofillTemplate, exportDesign, uploadAsset, type CanvaField } from '../../integrations/canva.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';

export class CanvaEngine extends BaseEngine {
  readonly name = 'canva';
  readonly version = '1.0.0';

  getCapabilities(): EngineCapability {
    return {
      formats: ['png', 'jpg', 'mp4', 'gif', 'pdf'],
      supportsAnimation: true,
      supportsAudio: false,
      maxResolution: { width: 4096, height: 4096 },
      bulkRender: true,
      assetUpload: true,
    };
  }

  supports(request: RenderRequest): boolean {
    return ['png', 'jpg', 'mp4', 'gif', 'pdf'].includes(request.format);
  }

  estimate(request: RenderRequest): EngineEstimate {
    const baseCost = request.format === 'mp4' ? 15 : 5;
    const assetCost = request.assets.length * 2;
    return {
      cost: baseCost + assetCost,
      durationSeconds: request.format === 'mp4' ? 45 : 20,
      rateLimited: false,
    };
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const start = Date.now();
    const templateId = this.resolveTemplateId(request);
    if (!templateId) {
      return this.failure(request, 'Template ID no resuelto para este formato/req', start);
    }

    // Upload assets if any
    const uploadedAssetIds: string[] = [];
    for (const asset of request.assets) {
      if (asset.localPath && asset.mimeType) {
        try {
          const { readFileSync } = await import('node:fs');
          const bytes = readFileSync(asset.localPath);
          const up = await uploadAsset({
            fileBytes: bytes,
            filename: asset.id,
            mimeType: asset.mimeType,
            userHandle: request.userHandle,
          });
          if (up.ok && up.assetId) uploadedAssetIds.push(up.assetId);
        } catch (err) {
          log.warn(`CanvaEngine: fallo upload asset ${asset.id}: ${(err as Error).message}`);
        }
      }
    }

    const data = this.buildFields(request, uploadedAssetIds);

    const fill = await autofillTemplate({
      brandTemplateId: templateId,
      title: request.title,
      data,
      userHandle: request.userHandle,
    });
    if (!fill.ok || !fill.designId) {
      return this.failure(request, fill.error ?? 'Canva autofill falló', start);
    }

    const exp = await exportDesign({
      designId: fill.designId,
      format: request.format as 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf',
      quality: 'high',
      userHandle: request.userHandle,
    });
    if (!exp.ok) {
      return this.failure(request, exp.error ?? 'Canva export falló', start);
    }

    return this.success(
      request,
      {
        designId: fill.designId,
        designUrl: fill.designUrl,
        artifactUrls: exp.urls,
        assetIds: uploadedAssetIds,
      },
      start,
    );
  }

  private resolveTemplateId(request: RenderRequest): string | undefined {
    const fmt = request.options?.['templateFormat'] as string | undefined;
    if (fmt === 'carrusel') return env.canva.templates.carrusel;
    if (fmt === 'reel') return env.canva.templates.reel;
    if (fmt === 'historia') return env.canva.templates.historia;
    if (fmt === 'post-imagen') return env.canva.templates.postImagen;
    // Fallback by request format heuristics
    if (request.format === 'mp4') return env.canva.templates.reel;
    if (request.options?.['storyCount']) return env.canva.templates.historia;
    return env.canva.templates.postImagen ?? env.canva.templates.carrusel;
  }

  private buildFields(request: RenderRequest, assetIds: string[]): Record<string, CanvaField> {
    const fields: Record<string, CanvaField> = {};
    for (const [key, value] of Object.entries(request.fields)) {
      fields[key] = { type: 'text', text: value };
    }
    assetIds.forEach((aid, idx) => {
      fields[`asset_${idx + 1}`] = { type: 'image', asset_id: aid };
    });
    return fields;
  }
}
