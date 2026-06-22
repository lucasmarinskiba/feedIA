/**
 * CapCut Studio Engine v1
 *
 * Como CapCut no tiene API pública, este engine actúa como puente:
 * - En DRY_RUN devuelve un MP4 simulado.
 * - En producción envía el plan a Make/n8n/Zapier vía webhook, que luego retorna
 *   el asset refinado a /api/webhook/capcut.
 *
 * Nunca bloquea el pipeline; si falla o expira, retorna el video original.
 */

import { randomUUID } from 'node:crypto';
import { BaseEngine } from './base.js';
import type { RenderRequest, RenderResult, EngineCapability, EngineEstimate } from '../types.js';
import { env } from '../../config/index.js';
import { log } from '../../agent/logger.js';
import { trackCost } from '../../capabilities/consumption/costAttribution.js';
import type { CapCutEnhancementInput } from '../../integrations/capcutWebhook.js';
import { requestCapCutEnhancement } from '../../integrations/capcutWebhook.js';
import { planCapCutVideo, type CapCutBeat } from '../../capabilities/computerUse/capcutPlan.js';

export interface CapCutEngineOptions {
  recipe?: CapCutEnhancementInput['recipe'];
  webhookReturnUrl?: string;
  timeoutMs?: number;
  brandName?: string;
}

const asBeats = (request: RenderRequest): CapCutBeat[] => {
  const fromOptions = request.options?.['beats'] as CapCutBeat[] | undefined;
  if (Array.isArray(fromOptions) && fromOptions.length > 0) {
    return fromOptions.map((b) => ({
      texto: b.texto ?? request.title,
      segundos: b.segundos ?? 3,
      notaVisual: b.notaVisual,
    }));
  }
  return [
    { texto: request.fields['texto_pantalla'] ?? request.title, segundos: Number(request.options?.['durationSec']) || 15 },
  ];
};

export class CapCutEngine extends BaseEngine {
  readonly name = 'capcut';
  readonly version = '1.0.0';

  private readonly recipe: NonNullable<CapCutEngineOptions['recipe']>;
  private readonly webhookReturnUrl?: string;
  private readonly timeoutMs: number;
  private readonly brandName?: string;

  constructor(opts: CapCutEngineOptions = {}) {
    super();
    this.recipe = opts.recipe ?? 'capcut-auto-captions';
    this.webhookReturnUrl = opts.webhookReturnUrl;
    this.timeoutMs = opts.timeoutMs ?? 10 * 60 * 1000;
    this.brandName = opts.brandName;
  }

  getCapabilities(): EngineCapability {
    return {
      formats: ['mp4'],
      supportsAnimation: true,
      supportsAudio: true,
      maxResolution: { width: 1080, height: 1920 },
      bulkRender: false,
      assetUpload: false,
    };
  }

  supports(request: RenderRequest): boolean {
    return request.format === 'mp4';
  }

  estimate(): EngineEstimate {
    return { cost: 0, durationSeconds: 300, rateLimited: false };
  }

  async render(request: RenderRequest): Promise<RenderResult> {
    const start = Date.now();
    log.info(`[CapCutEngine] render ${request.id} recipe=${this.recipe}`);

    const videoUrl = request.assets.find((a) => a.type === 'video' && a.url)?.url;
    const audioUrl = request.assets.find((a) => a.type === 'audio' && a.url)?.url;

    if (!videoUrl) {
      return this.failure(request, 'CapCut engine requiere un asset de video de entrada.', start);
    }

    const beats = asBeats(request);
    const plan = planCapCutVideo(beats, {
      titulo: request.title,
      relacion: (request.options?.['aspect'] as '9:16' | '1:1' | '16:9') ?? '9:16',
      autoExportar: true,
    });

    if (env.dryRun) {
      const sim = `https://capcut.com/export/simulated-${request.id}.mp4`;
      log.info(`[CapCutEngine] DRY_RUN: ${sim}`);
      return this.success(
        request,
        {
          artifactUrls: [sim],
          designUrl: `https://www.capcut.com/editor?plan=${request.id}`,
        },
        start,
      );
    }

    try {
      const requestId = randomUUID();
      const enhancement: CapCutEnhancementInput = {
        requestId,
        videoUrl,
        caption: this.brandName ? `${this.brandName} — ${request.title}` : request.title,
        captions: beats.map((b) => b.texto).filter(Boolean),
        recipe: this.recipe,
        webhookReturnUrl:
          this.webhookReturnUrl ??
          `${process.env['SERVER_BASE_URL'] || `http://localhost:${process.env['DAEMON_PORT'] || 7321}`}/api/webhook/capcut`,
      };

      log.info(`[CapCutEngine] Solicitando refinado vía webhook: ${requestId}`);
      const result = await requestCapCutEnhancement(enhancement, this.timeoutMs);

      if (!result.ok || !result.refinedUrl) {
        log.warn(`[CapCutEngine] Refinado falló: ${result.error}. Devolviendo video original.`);
        return this.success(request, { artifactUrls: [videoUrl] }, start);
      }

      const urls = [result.refinedUrl];
      if (audioUrl && (this.recipe === 'capcut-beat-sync' || this.recipe === 'capcut-add-b-roll')) {
        urls.push(audioUrl);
      }

      trackCost({
        model: 'capcut-webhook',
        inputTokens: 0,
        outputTokens: 0,
        costUsd: 0,
        workflow: 'brief-to-publish',
        agent: 'capcutEngine',
        feature: 'post-production',
        metadata: { recipe: this.recipe, requestId: request.id, refinedUrl: result.refinedUrl },
      });

      return this.success(request, { artifactUrls: urls }, start);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`[CapCutEngine] Excepción: ${msg}`);
      return this.success(request, { artifactUrls: [videoUrl] }, start);
    }
  }
}
