import { BaseEngine } from './base.js';
import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';

/**
 * Adobe Express / Firefly Engine — Stub estructurado.
 *
 * Adobe Firefly API: https://developer.adobe.com/firefly-api/docs/
 * Adobe Express API: actualmente en beta cerrada.
 *
 * Este engine soporta:
 * - Generación de imágenes vía Firefly (text-to-image, generative fill)
 * - Render de templates Express vía API cuando esté disponible
 * - Export a múltiples formatos
 */
export class AdobeExpressEngine extends BaseEngine {
  readonly name = 'adobe_express';
  readonly version = '0.1.0-stub';

  getCapabilities(): EngineCapability {
    return {
      formats: ['png', 'jpg', 'mp4', 'pdf'],
      supportsAnimation: true,
      supportsAudio: false,
      maxResolution: { width: 4096, height: 4096 },
      bulkRender: true,
      assetUpload: false,
    };
  }

  supports(request: RenderRequest): boolean {
    return ['png', 'jpg', 'mp4', 'pdf'].includes(request.format);
  }

  estimate(request: RenderRequest): EngineEstimate {
    const isVideo = request.format === 'mp4';
    return {
      cost: isVideo ? 30 : 10,
      durationSeconds: isVideo ? 60 : 15,
      rateLimited: !env.imageGen.openaiKey, // placeholder until Adobe key env var exists
    };
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const start = Date.now();

    if (env.dryRun) {
      log.info(`[DRY RUN] AdobeExpressEngine: "${request.title}" → simulado`);
      return this.success(
        request,
        {
          artifactUrls: [`https://adobe.com/express/simulated-${request.id}.${request.format}`],
          designUrl: 'https://adobe.com/express/editor/simulated',
        },
        start,
      );
    }

    // TODO: Implementar llamada real a Adobe Firefly/Express API
    // Necesita: ADOBE_CLIENT_ID, ADOBE_CLIENT_SECRET, y scopes adecuados.
    return this.failure(request, 'Adobe Express engine requiere implementación de API real. Stub activo.', start);
  }
}
