/**
 * HeyGenOperator — Creación de videos con avatares AI.
 * Prioridad: API REST → Browser fallback.
 */
import { BrowserOperatorBase, type OperatorResult, type OperatorOptions } from '../core/browserOperatorBase.js';
import { humanDelay } from '../core/humanBehavior.js';
import { log } from '../../agent/logger.js';
import { actionGate } from '../../glassbox/index.js';
import { createAvatarVideo, checkHeyGenVideo } from './heygenApi.js';
import type { HeyGenVideoOptions } from './heygenApi.js';

export class HeyGenOperator extends BrowserOperatorBase {
  constructor(options: OperatorOptions) {
    super(options);
  }

  getPlatform(): string {
    return 'heygen';
  }
  getLoginUrl(): string {
    return 'https://app.heygen.com/login';
  }

  async isLoggedIn(page: { locator: (s: string) => { count: () => Promise<number> } }): Promise<boolean> {
    try {
      const count = await page.locator('button:has-text("Create")').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  async login(_page: unknown, _credentials: Record<string, string>): Promise<boolean> {
    log.info('[HeyGen] Login manual requerido.');
    return false;
  }

  async createVideo(opts: HeyGenVideoOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'heygen_create_video',
      `Crear video con avatar: ${opts.script.slice(0, 50)}...`,
      async () => true,
      { source: 'heygen' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'createVideo', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();

    // Intentar API primero
    const apiResult = await createAvatarVideo(opts);
    if (apiResult.ok) {
      log.info(`[HeyGen] Video creado vía API: ${apiResult.videoId}`);
      return {
        ok: true,
        action: 'createVideo',
        summary: `Video creado: ${apiResult.videoId}`,
        durationMs: Date.now() - start,
      };
    }

    if (this.isDryRun()) {
      log.step(`[DRY_RUN] HeyGen: crear video "${opts.script.slice(0, 50)}..."`);
      return { ok: true, action: 'createVideo', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    log.warn(`[HeyGen] API falló: ${apiResult.error}. Fallback a browser...`);
    try {
      await this.navigate('https://app.heygen.com/home');
      await humanDelay(3000, 5000);

      await this.click('button:has-text("Create")');
      await humanDelay(2000, 4000);

      await this.type('textarea[placeholder*="script"]', opts.script);
      await humanDelay(1000, 2000);

      await this.click('button:has-text("Submit")');
      await humanDelay(10000, 15000);

      return { ok: true, action: 'createVideo', summary: 'Video creado vía browser', durationMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'createVideo', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }

  async pollVideoStatus(videoId: string): Promise<OperatorResult> {
    const start = Date.now();
    const result = await checkHeyGenVideo(videoId);
    if (result.ok) {
      return {
        ok: true,
        action: 'pollVideoStatus',
        summary: `Video listo: ${result.videoUrl}`,
        durationMs: Date.now() - start,
      };
    }
    return {
      ok: false,
      action: 'pollVideoStatus',
      summary: result.error ?? 'Pendiente',
      error: result.error,
      durationMs: Date.now() - start,
    };
  }
}
