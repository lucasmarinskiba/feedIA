/**
 * CapCutWebOperator — Controla CapCut (web) para editar videos.
 * Nota: CapCut web es experimental y menos estable que la app.
 * Se recomienda usar Make/n8n webhook como fallback.
 */
import { BrowserOperatorBase, type OperatorResult, type OperatorOptions } from '../core/browserOperatorBase.js';
import { humanDelay } from '../core/humanBehavior.js';
import { log } from '../../agent/logger.js';
import { actionGate } from '../../glassbox/index.js';

export interface CapCutProjectOptions {
  template?: string;
  aspectRatio: '9:16' | '16:9' | '1:1' | '4:5';
}

export interface CapCutTextOverlay {
  text: string;
  startTimeSec: number;
  durationSec: number;
  style?: 'default' | 'bold' | 'cinematic';
}

export interface CapCutExportOptions {
  quality: '720p' | '1080p' | '4k';
  format: 'mp4' | 'mov';
  watermark?: boolean;
}

export class CapCutWebOperator extends BrowserOperatorBase {
  constructor(options: OperatorOptions) {
    super(options);
  }

  getPlatform(): string {
    return 'capcut-web';
  }
  getLoginUrl(): string {
    return 'https://www.capcut.com/login';
  }

  async isLoggedIn(page: { locator: (s: string) => { count: () => Promise<number> } }): Promise<boolean> {
    try {
      const count = await page.locator('button:has-text("New project")').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  async login(_page: unknown, _credentials: Record<string, string>): Promise<boolean> {
    log.info('[CapCutWeb] Login manual requerido.');
    return false;
  }

  async createProject(options: CapCutProjectOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'capcut_create_project',
      `Crear proyecto CapCut ${options.aspectRatio}`,
      async () => true,
      { source: 'capcut-web' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'createProject', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] CapCut Web: crear proyecto ${options.aspectRatio}`);
      return { ok: true, action: 'createProject', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.navigate('https://www.capcut.com/editor');
      await humanDelay(3000, 6000);
      await this.click('button:has-text("New project")');
      await humanDelay(2000, 4000);

      const ratioBtn = {
        '9:16': 'button:has-text("9:16")',
        '16:9': 'button:has-text("16:9")',
        '1:1': 'button:has-text("1:1")',
        '4:5': 'button:has-text("4:5")',
      }[options.aspectRatio];
      await this.click(ratioBtn ?? 'button:has-text("9:16")');
      await humanDelay(2000, 4000);

      return {
        ok: true,
        action: 'createProject',
        summary: `Proyecto ${options.aspectRatio} creado`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'createProject',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  async uploadMedia(filePath: string): Promise<OperatorResult> {
    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] CapCut Web: upload ${filePath}`);
      return { ok: true, action: 'uploadMedia', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      const page = await this.ensurePage();
      const input = page.locator('input[type="file"]').first() as unknown as {
        setInputFiles: (p: string) => Promise<unknown>;
      };
      await input.setInputFiles(filePath);
      await humanDelay(5000, 10000);
      return { ok: true, action: 'uploadMedia', summary: 'Media subida', durationMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'uploadMedia', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }

  async addCaptions(language: string = 'es'): Promise<OperatorResult> {
    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] CapCut Web: add captions ${language}`);
      return { ok: true, action: 'addCaptions', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.click('button:has-text("Text")');
      await humanDelay(1000, 2000);
      await this.click('button:has-text("Auto captions")');
      await humanDelay(1000, 2000);
      await this.click('button:has-text("Create")');
      await humanDelay(5000, 10000);
      return {
        ok: true,
        action: 'addCaptions',
        summary: 'Captions automáticos agregados',
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'addCaptions', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }

  async addMusic(trackName: string): Promise<OperatorResult> {
    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] CapCut Web: add music ${trackName}`);
      return { ok: true, action: 'addMusic', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.click('button:has-text("Audio")');
      await humanDelay(1000, 2000);
      await this.type('input[placeholder*="Search"]', trackName);
      await humanDelay(2000, 4000);
      await this.click('div[class*="audio-card"]:first-child');
      await humanDelay(1000, 2000);
      return {
        ok: true,
        action: 'addMusic',
        summary: `Música "${trackName}" agregada`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'addMusic', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }

  async exportVideo(options: CapCutExportOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'capcut_export_video',
      `Exportar video CapCut ${options.quality}`,
      async () => true,
      { source: 'capcut-web' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'exportVideo', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] CapCut Web: exportar ${options.quality}`);
      return { ok: true, action: 'exportVideo', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.click('button:has-text("Export")');
      await humanDelay(2000, 4000);
      await this.click(`button:has-text("${options.quality}")`);
      await humanDelay(1000, 2000);
      await this.click('button:has-text("Export")');
      await humanDelay(10000, 20000);
      return {
        ok: true,
        action: 'exportVideo',
        summary: `Video exportado en ${options.quality}`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'exportVideo', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }
}
