/**
 * InstagramAppOperator — Controla Instagram vía app nativa en emulador Android.
 * Usa ADB (Android Debug Bridge) para interactuar con la app.
 */
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { actionGate } from '../../glassbox/index.js';
import { humanDelay } from '../core/humanBehavior.js';
import type { BrandProfile } from '../../config/types.js';
import type { OperatorResult } from '../core/browserOperatorBase.js';

export interface AppPostOptions {
  mediaPath: string;
  caption: string;
  hashtags?: string[];
  location?: string;
}

export interface AppReelOptions {
  videoPath: string;
  caption: string;
  audioName?: string;
  shareToFeed?: boolean;
}

export interface AppStoryOptions {
  mediaPath: string;
}

export class InstagramAppOperator {
  private brand: BrandProfile;
  private dryRun: boolean;
  private emulatorId?: string;

  constructor(brand: BrandProfile) {
    this.brand = brand;
    this.dryRun = env.dryRun;
  }

  /** Inicializa el emulador y abre Instagram */
  async init(): Promise<boolean> {
    if (this.dryRun) {
      log.step('[DRY_RUN] Instagram App: inicializar emulador');
      return true;
    }

    try {
      const { listEmulators, launchInstagramOnEmulator } =
        await import('../../capabilities/computerUse/androidEmulator.js');
      const emulators = listEmulators().filter((e) => e.isRunning);
      if (emulators.length === 0) {
        log.warn('[InstagramApp] No hay emuladores conectados');
        return false;
      }
      this.emulatorId = emulators[0]!.id;
      await launchInstagramOnEmulator(this.emulatorId);
      await humanDelay(5000, 8000);
      return true;
    } catch (err) {
      log.error(`[InstagramApp] Error inicializando: ${err instanceof Error ? err.message : String(err)}`);
      return false;
    }
  }

  /** ================================================================ */
  /**  Publicación vía app nativa                                     */
  /** ================================================================ */

  async publishPost(options: AppPostOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'instagram_app_publish_post',
      `Publicar post vía app: ${options.caption.slice(0, 50)}...`,
      async () => true,
      { source: 'instagram-app' },
    );
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'appPublishPost',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    const start = Date.now();
    if (this.dryRun) {
      log.step(`[DRY_RUN] Instagram App: publicar post ${options.mediaPath}`);
      return { ok: true, action: 'appPublishPost', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    if (!this.emulatorId) {
      const ok = await this.init();
      if (!ok)
        return {
          ok: false,
          action: 'appPublishPost',
          summary: 'Emulador no disponible',
          durationMs: Date.now() - start,
        };
    }

    try {
      const { mobileTap, mobileType } = await import('../../capabilities/computerUse/androidEmulator.js');

      // Tap en botón "+" (centro inferior, aprox)
      await mobileTap(this.emulatorId!, { x: 540, y: 1920 });
      await humanDelay(1500, 3000);

      // Seleccionar Post
      await mobileTap(this.emulatorId!, { x: 540, y: 1400 });
      await humanDelay(1000, 2000);

      // Seleccionar imagen (primer thumbnail, aprox)
      await mobileTap(this.emulatorId!, { x: 200, y: 600 });
      await humanDelay(1000, 2000);

      // Next (esquina superior derecha)
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(1000, 2000);

      // Next again
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(1000, 2000);

      // Escribir caption
      const fullCaption = [options.caption, ...(options.hashtags ?? [])].join(' ');
      await mobileType(this.emulatorId!, { text: fullCaption });
      await humanDelay(1000, 2000);

      // Share
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(8000, 15000);

      return { ok: true, action: 'appPublishPost', summary: 'Post publicado vía app', durationMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'appPublishPost',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  async publishReel(options: AppReelOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'instagram_app_publish_reel',
      `Publicar reel vía app: ${options.caption.slice(0, 50)}...`,
      async () => true,
      { source: 'instagram-app' },
    );
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'appPublishReel',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    const start = Date.now();
    if (this.dryRun) {
      log.step(`[DRY_RUN] Instagram App: publicar reel ${options.videoPath}`);
      return { ok: true, action: 'appPublishReel', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    if (!this.emulatorId) {
      const ok = await this.init();
      if (!ok)
        return {
          ok: false,
          action: 'appPublishReel',
          summary: 'Emulador no disponible',
          durationMs: Date.now() - start,
        };
    }

    try {
      const { mobileTap, mobileType } = await import('../../capabilities/computerUse/androidEmulator.js');

      // Tap en "+"
      await mobileTap(this.emulatorId!, { x: 540, y: 1920 });
      await humanDelay(1500, 3000);

      // Seleccionar Reel
      await mobileTap(this.emulatorId!, { x: 540, y: 1600 });
      await humanDelay(1000, 2000);

      // Seleccionar video
      await mobileTap(this.emulatorId!, { x: 200, y: 600 });
      await humanDelay(2000, 4000);

      // Next
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(1000, 2000);

      // Next
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(1000, 2000);

      // Caption
      await mobileType(this.emulatorId!, { text: options.caption });
      await humanDelay(1000, 2000);

      // Share
      await mobileTap(this.emulatorId!, { x: 980, y: 150 });
      await humanDelay(10000, 20000);

      return { ok: true, action: 'appPublishReel', summary: 'Reel publicado vía app', durationMs: Date.now() - start };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'appPublishReel',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }

  async publishStory(options: AppStoryOptions): Promise<OperatorResult> {
    const gateResult = await actionGate('instagram_app_publish_story', 'Publicar historia vía app', async () => true, {
      source: 'instagram-app',
    });
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'appPublishStory',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    const start = Date.now();
    if (this.dryRun) {
      log.step(`[DRY_RUN] Instagram App: publicar historia ${options.mediaPath}`);
      return { ok: true, action: 'appPublishStory', summary: 'DRY_RUN', durationMs: Date.now() - start };
    }

    if (!this.emulatorId) {
      const ok = await this.init();
      if (!ok)
        return {
          ok: false,
          action: 'appPublishStory',
          summary: 'Emulador no disponible',
          durationMs: Date.now() - start,
        };
    }

    try {
      const { mobileTap, mobileSwipe } = await import('../../capabilities/computerUse/androidEmulator.js');

      // Swipe right en la barra de historias o tap en avatar propio
      await mobileSwipe(this.emulatorId!, { x1: 900, y1: 300, x2: 300, y2: 300, durationMs: 300 });
      await humanDelay(1000, 2000);

      // Tap en "Tu historia"
      await mobileTap(this.emulatorId!, { x: 150, y: 250 });
      await humanDelay(2000, 4000);

      // Seleccionar media
      await mobileTap(this.emulatorId!, { x: 200, y: 600 });
      await humanDelay(2000, 4000);

      // "Tu historia" para publicar
      await mobileTap(this.emulatorId!, { x: 150, y: 2100 });
      await humanDelay(3000, 6000);

      return {
        ok: true,
        action: 'appPublishStory',
        summary: 'Historia publicada vía app',
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: 'appPublishStory',
        summary: `Error: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }
}
