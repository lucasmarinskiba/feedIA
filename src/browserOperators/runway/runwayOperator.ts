/**
 * RunwayOperator — Generación de video con Runway ML.
 * Prioridad: API REST → Browser fallback.
 */
import { BrowserOperatorBase, type OperatorResult, type OperatorOptions } from '../core/browserOperatorBase.js';
import { humanDelay } from '../core/humanBehavior.js';
import { log } from '../../agent/logger.js';
import { actionGate } from '../../glassbox/index.js';
import { generateVideoWithRunway, imageToVideoWithRunway } from './runwayApi.js';
import type { RunwayGenerateOptions, RunwayImageToVideoOptions } from './runwayApi.js';

export class RunwayOperator extends BrowserOperatorBase {
  constructor(options: OperatorOptions) {
    super(options);
  }

  getPlatform(): string {
    return 'runway';
  }
  getLoginUrl(): string {
    return 'https://app.runwayml.com/login';
  }

  async isLoggedIn(page: { locator: (s: string) => { count: () => Promise<number> } }): Promise<boolean> {
    try {
      const count = await page.locator('button:has-text("Generate")').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  async login(_page: unknown, _credentials: Record<string, string>): Promise<boolean> {
    log.info('[Runway] Login manual requerido.');
    return false;
  }

  async generateVideo(opts: RunwayGenerateOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'runway_generate_video',
      `Generar video con Runway: ${opts.prompt.slice(0, 50)}...`,
      async () => true,
      { source: 'runway' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'generateVideo', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();

    // Intentar API primero
    const apiResult = await generateVideoWithRunway(opts);
    if (apiResult.ok) {
      log.info(`[Runway] Video generado vía API: ${apiResult.taskId}`);
      return {
        ok: true,
        action: 'generateVideo',
        summary: `Video generado: ${apiResult.taskId}`,
        durationMs: Date.now() - start,
      };
    }

    // Fallback a browser
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] Runway: generar video "${opts.prompt.slice(0, 50)}..."`);
      return { ok: true, action: 'generateVideo', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    log.warn(`[Runway] API falló: ${apiResult.error}. Fallback a browser...`);
    try {
      await this.navigate('https://app.runwayml.com/video-tools/ai-tools/gen-3-alpha');
      await humanDelay(3000, 5000);

      await this.type('textarea[placeholder*="Prompt"]', opts.prompt);
      await humanDelay(1000, 2000);

      await this.click('button:has-text("Generate")');
      await humanDelay(10000, 15000);

      return {
        ok: true,
        action: 'generateVideo',
        summary: 'Video generado vía browser',
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'generateVideo',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  async imageToVideo(opts: RunwayImageToVideoOptions): Promise<OperatorResult> {
    const start = Date.now();
    const apiResult = await imageToVideoWithRunway(opts);
    if (apiResult.ok) {
      return {
        ok: true,
        action: 'imageToVideo',
        summary: `Video generado: ${apiResult.taskId}`,
        durationMs: Date.now() - start,
      };
    }
    return {
      ok: false,
      action: 'imageToVideo',
      summary: apiResult.error ?? 'Falló',
      error: apiResult.error,
      durationMs: Date.now() - start,
    };
  }
}
