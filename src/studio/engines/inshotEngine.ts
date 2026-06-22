/**
 * InShot Studio Engine v1
 *
 * InShot no tiene API pública. Al igual que CapCut, operamos mediante webhook a
 * Make/n8n/Zapier (normalmente conectado a un flujo mobile o Computer Use) que
 * retorna el asset refinado a /api/webhook/inshot.
 *
 * Nunca bloquea el pipeline.
 */

import { BaseEngine } from './base.js';
import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';
import { randomUUID } from 'node:crypto';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import { trackCost } from '../../capabilities/consumption/costAttribution.js';
import type { InShotEnhancementInput } from '../../integrations/inshotWebhook.js';
import { requestInShotEnhancement } from '../../integrations/inshotWebhook.js';

export interface InShotEngineOptions {
  recipe?: InShotEnhancementInput['recipe'];
  webhookReturnUrl?: string;
  timeoutMs?: number;
  brandName?: string;
}

export class InShotEngine extends BaseEngine {
  readonly name = 'inshot';
  readonly version = '1.0.0';

  private readonly recipe: NonNullable<InShotEngineOptions['recipe']>;
  private readonly webhookReturnUrl?: string;
  private readonly timeoutMs: number;
  private readonly brandName?: string;

  constructor(opts: InShotEngineOptions = {}) {
    super();
    this.recipe = opts.recipe ?? 'inshot-auto-captions';
    this.webhookReturnUrl = opts.webhookReturnUrl;
    this.timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
    this.brandName = opts.brandName;
  }

  getCapabilities(): EngineCapability {
    return {
      formats: ['mp4', 'png'],
      supportsAnimation: true,
      supportsAudio: true,
      maxResolution: { width: 1080, height: 1920 },
      bulkRender: false,
      assetUpload: false,
    };
  }

  supports(request: RenderRequest): boolean {
    return ['mp4', 'png'].includes(request.format);
  }

  estimate(): EngineEstimate {
    return { cost: 0, durationSeconds: 180, rateLimited: false };
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const start = Date.now();
    log.info(`[InShotEngine] render ${request.id} recipe=${this.recipe}`);

    const videoUrl = request.assets.find((a) => a.type === 'video' && a.url)?.url;
    const audioUrl = request.assets.find((a) => a.type === 'audio' && a.url)?.url;

    if (!videoUrl) {
      return this.failure(request, 'InShot engine requiere un asset de video de entrada.', start);
    }

    if (env.dryRun) {
      const sim = `https://inshot.com/export/simulated-${request.id}.${request.format}`;
      log.info(`[InShotEngine] DRY_RUN: ${sim}`);
      return this.success(request, { artifactUrls: [sim] }, start);
    }

    try {
      const requestId = randomUUID();
      const enhancement: InShotEnhancementInput = {
        requestId,
        videoUrl,
        caption: this.brandName ? `${this.brandName} — ${request.title}` : request.title,
        captions: request.options?.['captions'] as string[] | undefined,
        recipe: this.recipe,
        webhookReturnUrl:
          this.webhookReturnUrl ??
          `${process.env['SERVER_BASE_URL'] || `http://localhost:${process.env['DAEMON_PORT'] || 7321}`}/api/webhook/inshot`,
      };

      log.info(`[InShotEngine] Solicitando refinado vía webhook: ${requestId}`);
      const result = await requestInShotEnhancement(enhancement, this.timeoutMs);

      if (!result.ok || !result.refinedUrl) {
        log.warn(`[InShotEngine] Refinado falló: ${result.error}. Devolviendo video original.`);
        return this.success(request, { artifactUrls: [videoUrl] }, start);
      }

      const urls = [result.refinedUrl];
      if (audioUrl) urls.push(audioUrl);

      trackCost({
        model: 'inshot-webhook',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        workflow: 'brief-to-publish',
        agent: 'inshotEngine',
        feature: 'post-production',
        metadata: { recipe: this.recipe, requestId: request.id, refinedUrl: result.refinedUrl },
      });

      return this.success(request, { artifactUrls: urls }, start);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[InShotEngine] Excepción: ${msg}`);
      return this.success(request, { artifactUrls: [videoUrl] }, start);
    }
  }
}
