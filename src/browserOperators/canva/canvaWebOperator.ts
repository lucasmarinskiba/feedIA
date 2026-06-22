/**
 * CanvaWebOperator — Controla Canva (web) para crear y exportar diseños.
 * Hereda de BrowserOperatorBase para anti-detection, retry, rate limits.
 */
import { BrowserOperatorBase, type OperatorResult, type OperatorOptions } from '../core/browserOperatorBase.js';
import { warmUpSession } from '../core/antiDetection.js';
import { humanDelay } from '../core/humanBehavior.js';
import { log } from '../../agent/logger.js';
import { actionGate } from '../../glassbox/index.js';

export interface DesignOptions {
  templateQuery?: string;
  width?: number;
  height?: number;
  format?: 'instagram-post' | 'instagram-story' | 'instagram-reel' | 'presentation' | 'custom';
}

export interface TextEdit {
  elementIndex: number;
  text: string;
  font?: string;
  color?: string;
  size?: number;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'pdf' | 'mp4';
  quality?: 'standard' | 'high';
}

export class CanvaWebOperator extends BrowserOperatorBase {
  constructor(options: OperatorOptions) {
    super(options);
  }

  getPlatform(): string {
    return 'canva-web';
  }
  getLoginUrl(): string {
    return 'https://www.canva.com/login/';
  }

  async isLoggedIn(page: { locator: (s: string) => { count: () => Promise<number> } }): Promise<boolean> {
    try {
      const count = await page.locator('button:has-text("Crear un diseño")').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  async login(_page: unknown, _credentials: Record<string, string>): Promise<boolean> {
    log.info('[CanvaWeb] Login manual requerido. Asegurate de estar logueado en Chrome.');
    return false;
  }

  /** ================================================================ */
  /**  Crear diseño desde template o en blanco                         */
  /** ================================================================ */

  async createDesign(options: DesignOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'canva_create_design',
      `Crear diseño en Canva: ${options.format ?? 'custom'}`,
      async () => true,
      { source: 'canva-web' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'createDesign', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] Canva Web: crear diseño ${options.format}`);
      return { ok: true, action: 'createDesign', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      const page = await this.ensurePage();
      if (!this.session?.isWarmedUp) {
        await warmUpSession(page as unknown as Parameters<typeof warmUpSession>[0]);
        this.session!.isWarmedUp = true;
      }

      await this.navigate('https://www.canva.com/');
      await humanDelay(2000, 4000);

      // Click en "Crear un diseño"
      await this.click('button:has-text("Crear un diseño")');
      await humanDelay(1500, 3000);

      // Seleccionar formato
      const formatMap: Record<string, string> = {
        'instagram-post': 'Instagram Post',
        'instagram-story': 'Instagram Story',
        'instagram-reel': 'Instagram Reel',
        presentation: 'Presentación',
      };
      const searchTerm = formatMap[options.format ?? ''] ?? options.templateQuery ?? 'Instagram Post';
      await this.type('input[placeholder*="Buscar"]', searchTerm);
      await humanDelay(2000, 4000);

      // Click en primer template/blank
      await this.click('[data-testid="template-card"]:first-child, [data-testid="blank-design"]:first-child');
      await humanDelay(3000, 6000);

      return {
        ok: true,
        action: 'createDesign',
        summary: `Diseño ${searchTerm} creado`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'createDesign',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  /** ================================================================ */
  /**  Editar texto en el diseño                                       */
  /** ================================================================ */

  async editText(edits: TextEdit[]): Promise<OperatorResult> {
    const gateResult = await actionGate('canva_edit_text', `Editar ${edits.length} textos en Canva`, async () => true, {
      source: 'canva-web',
    });
    if (!gateResult.ok)
      return { ok: false, action: 'editText', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] Canva Web: editar ${edits.length} textos`);
      return { ok: true, action: 'editText', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      for (const edit of edits) {
        await this.click('div[contenteditable="true"]');
        await humanDelay(500, 1000);

        // Seleccionar todo y reemplazar
        const page = await this.ensurePage();
        await page.locator('div[contenteditable="true"]').first().press('Control+a');
        await humanDelay(200, 500);
        await this.type('div[contenteditable="true"]', edit.text);
        await humanDelay(1000, 2000);

        if (edit.color) {
          await this.click('button[data-testid="color-picker"]');
          await humanDelay(300, 800);
          await this.type('input[placeholder="#000000"]', edit.color);
          await humanDelay(500, 1000);
          await page.locator('body').first().press('Enter');
          await humanDelay(500, 1000);
        }
      }
      return {
        ok: true,
        action: 'editText',
        summary: `${edits.length} textos editados`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, action: 'editText', summary: `Error: ${msg}`, error: msg, durationMs: Date.now() - start };
    }
  }

  /** ================================================================ */
  /**  Exportar diseño                                                 */
  /** ================================================================ */

  async exportDesign(options: ExportOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'canva_export_design',
      `Exportar diseño como ${options.format}`,
      async () => true,
      { source: 'canva-web' },
    );
    if (!gateResult.ok)
      return { ok: false, action: 'exportDesign', summary: gateResult.reason ?? 'Rechazado', durationMs: 0 };

    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] Canva Web: exportar como ${options.format}`);
      return { ok: true, action: 'exportDesign', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.click('button:has-text("Compartir")');
      await humanDelay(1000, 2000);
      await this.click('button:has-text("Descargar")');
      await humanDelay(1000, 2000);

      const formatBtn = {
        png: 'button:has-text("PNG")',
        jpg: 'button:has-text("JPG")',
        pdf: 'button:has-text("PDF")',
        mp4: 'button:has-text("MP4")',
      }[options.format];
      await this.click(formatBtn ?? 'button:has-text("PNG")');
      await humanDelay(500, 1000);

      await this.click('button:has-text("Descargar")');
      await humanDelay(5000, 10000);

      return {
        ok: true,
        action: 'exportDesign',
        summary: `Exportado como ${options.format}`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'exportDesign',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  async createCarouselSlides(options: {
    slideCount: number;
    templateQuery?: string;
    topic?: string;
  }): Promise<OperatorResult> {
    const start = Date.now();
    if (this.isDryRun()) {
      log.step(`[DRY_RUN] Canva Web: crear carrusel de ${options.slideCount} slides`);
      return { ok: true, action: 'createCarouselSlides', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    try {
      await this.navigate('https://www.canva.com/design');
      await this.click('button:has-text("Crear diseño")');
      await humanDelay(500, 1000);
      await this.click('button:has-text("Instagram Post")');
      await humanDelay(2000, 4000);

      for (let i = 1; i < options.slideCount; i++) {
        await this.click('button[aria-label="Agregar página"]');
        await humanDelay(800, 1500);
      }

      return {
        ok: true,
        action: 'createCarouselSlides',
        summary: `Carrusel de ${options.slideCount} slides creado`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'createCarouselSlides',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  /** ================================================================ */
  /**  Pipeline: crear + editar + exportar                             */
  /** ================================================================ */

  async createAndExport(
    designOpts: DesignOptions,
    edits: TextEdit[],
    exportOpts: ExportOptions,
  ): Promise<OperatorResult> {
    const r1 = await this.createDesign(designOpts);
    if (!r1.ok) return r1;

    if (edits.length > 0) {
      const r2 = await this.editText(edits);
      if (!r2.ok) return r2;
    }

    return this.exportDesign(exportOpts);
  }
}
