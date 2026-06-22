import { BaseEngine } from './base.js';
import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';
import { generateImage, type ImageGenRequest } from '../../integrations/imageGen.js';

export class ImageGenEngine extends BaseEngine {
  readonly name = 'imagegen';
  readonly version = '1.0.0';

  getCapabilities(): EngineCapability {
    return {
      formats: ['png', 'jpg', 'webp'],
      supportsAnimation: false,
      supportsAudio: false,
      maxResolution: { width: 2048, height: 2048 },
      bulkRender: true,
      assetUpload: false,
    };
  }

  supports(request: RenderRequest): boolean {
    return ['png', 'jpg', 'webp'].includes(request.format);
  }

  estimate(request: RenderRequest): EngineEstimate {
    const count = Number(request.options?.['count'] ?? 1);
    return {
      cost: count * 8,
      durationSeconds: count * 12,
      rateLimited: false,
    };
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const start = Date.now();
    const prompt = request.fields['prompt'] ?? request.title;
    const aspectRatio = (request.options?.['aspectRatio'] as ImageGenRequest['aspectRatio']) ?? '1:1';
    const count = Number(request.options?.['count'] ?? 1);
    const style = request.options?.['style'] as string | undefined;

    const result = await generateImage({
      prompt,
      aspectRatio,
      count,
      style,
    });

    if (!result.ok || !result.urls) {
      return this.failure(request, result.error ?? 'Image generation falló', start);
    }

    return this.success(
      request,
      {
        artifactUrls: result.urls,
      },
      start,
    );
  }
}
