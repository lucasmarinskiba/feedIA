/**
 * InstagramWebOperator — Controla Instagram vía navegador web.
 * Hereda de BrowserOperatorBase para anti-detection, retry, rate limits.
 */
import { BrowserOperatorBase, type OperatorResult, type OperatorOptions } from '../core/browserOperatorBase.js';
import { warmUpSession, checkAntiDetectionHealth } from '../core/antiDetection.js';
import { humanDelay, humanReadingPause } from '../core/humanBehavior.js';
import { log } from '../../agent/logger.js';
import { actionGate } from '../../glassbox/index.js';

export interface PostOptions {
  imagePaths: string[];
  caption: string;
  hashtags?: string[];
  altText?: string;
  location?: string;
  collaborator?: string;
}

export interface ReelOptions {
  videoPath: string;
  caption: string;
  audioName?: string;
  coverFrameTime?: number;
  shareToFeed?: boolean;
}

export interface StoryOptions {
  mediaPath: string;
  stickers?: Array<{ type: string; text?: string; options?: string[]; url?: string }>;
  mentions?: string[];
  links?: string[];
}

export class InstagramWebOperator extends BrowserOperatorBase {
  constructor(options: OperatorOptions) {
    super(options);
  }

  getPlatform(): string {
    return 'instagram-web';
  }
  getLoginUrl(): string {
    return 'https://www.instagram.com/accounts/login/';
  }

  async isLoggedIn(page: { locator: (s: string) => { count: () => Promise<number> } }): Promise<boolean> {
    try {
      const count = await page.locator('svg[aria-label="Nueva publicación"]').count();
      return count > 0;
    } catch {
      return false;
    }
  }

  async login(_page: unknown, _credentials: Record<string, string>): Promise<boolean> {
    // Instagram login via web requiere 2FA handling; se documenta como
    // "requiere login manual previo" para evitar complejidad.
    log.info('[InstagramWeb] Login manual requerido. Asegurate de estar logueado en Chrome.');
    return false;
  }

  /** ================================================================ */
  /**  Publicación de Post (imagen simple)                              */
  /** ================================================================ */

  async publishPost(options: PostOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'instagram_publish_post',
      `Publicar post en Instagram Web: ${options.caption.slice(0, 50)}...`,
      async () => true,
      { source: 'instagram-web' },
    );
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'publishPost',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    await this.withRetry('publishPost', async () => {
      if (this.isDryRun()) {
        log.step(`[DRY_RUN] Instagram Web: publicar post con ${options.imagePaths.length} imágenes`);
        return;
      }

      const page = await this.ensurePage();

      // Session warming antes de publicar
      if (!this.session?.isWarmedUp) {
        await warmUpSession(page as unknown as Parameters<typeof warmUpSession>[0]);
        this.session!.isWarmedUp = true;
      }

      await this.navigate('https://www.instagram.com/');
      await humanDelay(2000, 4000);

      // Click en "Crear +"
      await this.click('svg[aria-label="Nueva publicación"]');
      await humanDelay(1500, 3000);

      // Seleccionar archivo
      const fileInput = page.locator('input[type="file"]').first() as unknown as {
        setInputFiles: (paths: string | string[]) => Promise<unknown>;
      };
      await fileInput.setInputFiles(options.imagePaths[0]!);
      await humanDelay(3000, 6000);

      // Si hay más imágenes (carrusel)
      if (options.imagePaths.length > 1) {
        await this.click('svg[aria-label="Seleccionar varios"]');
        for (let i = 1; i < options.imagePaths.length; i++) {
          const input = page.locator('input[type="file"]').first() as unknown as {
            setInputFiles: (paths: string | string[]) => Promise<unknown>;
          };
          await input.setInputFiles(options.imagePaths[i]!);
          await humanDelay(1500, 3000);
        }
      }

      // Next → Filtros
      await this.click('button:has-text("Siguiente")');
      await humanDelay(1000, 2000);

      // Next → Detalles
      await this.click('button:has-text("Siguiente")');
      await humanDelay(1000, 2000);

      // Escribir caption
      const captionText = [options.caption, ...(options.hashtags ?? [])].join(' ');
      await this.type('textarea[aria-label="Escribe un pie de foto..."]', captionText);
      await humanDelay(1000, 2000);

      // Alt text
      if (options.altText) {
        await this.click('text=Accesibilidad');
        await humanDelay(500, 1000);
        await this.type('input[placeholder="Texto alternativo..."]', options.altText);
        await humanDelay(500, 1000);
      }

      // Location
      if (options.location) {
        await this.click('text=Agregar ubicación');
        await humanDelay(500, 1000);
        await this.type('input[placeholder="¿Dónde estás?"]', options.location);
        await humanDelay(1000, 2000);
        await this.click('div[role="button"]:has-text("' + options.location + '")');
      }

      // Publicar
      await this.click('button:has-text("Compartir")');
      await humanDelay(5000, 10000);

      // Verificar éxito
      const success =
        (await page.locator('text=Publicación compartida').count()) > 0 ||
        (await page.locator('text=Your post has been shared').count()) > 0;

      if (!success) {
        throw new Error('No se detectó confirmación de publicación');
      }
    });
    return { ok: true, action: 'publishPost', summary: 'Post publicado vía web', durationMs: 0 };
  }

  /** ================================================================ */
  /**  Publicación de Reel                                            */
  /** ================================================================ */

  async publishReel(options: ReelOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'instagram_publish_reel',
      `Publicar reel en Instagram Web: ${options.caption.slice(0, 50)}...`,
      async () => true,
      { source: 'instagram-web' },
    );
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'publishReel',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    await this.withRetry('publishReel', async () => {
      if (this.isDryRun()) {
        log.step(`[DRY_RUN] Instagram Web: publicar reel ${options.videoPath}`);
        return;
      }

      const page = await this.ensurePage();

      if (!this.session?.isWarmedUp) {
        await warmUpSession(page as unknown as Parameters<typeof warmUpSession>[0]);
        this.session!.isWarmedUp = true;
      }

      await this.navigate('https://www.instagram.com/');
      await humanDelay(2000, 4000);

      // Crear → Reel
      await this.click('svg[aria-label="Nueva publicación"]');
      await humanDelay(1000, 2000);
      await this.click('text=Reel');
      await humanDelay(1000, 2000);

      // Subir video
      const fileInput = page.locator('input[type="file"]').first() as unknown as {
        setInputFiles: (paths: string | string[]) => Promise<unknown>;
      };
      await fileInput.setInputFiles(options.videoPath);
      await humanDelay(5000, 10000); // Videos tardan más

      // Next → Detalles
      await this.click('button:has-text("Siguiente")');
      await humanDelay(1000, 2000);
      await this.click('button:has-text("Siguiente")');
      await humanDelay(1000, 2000);

      // Caption
      await this.type('textarea[aria-label="Escribe un pie de foto..."]', options.caption);
      await humanDelay(1000, 2000);

      // Share to feed
      if (options.shareToFeed !== false) {
        await this.click('text=También compartir en el feed');
      }

      // Publicar
      await this.click('button:has-text("Compartir")');
      await humanDelay(8000, 15000);
    });
    return { ok: true, action: 'publishReel', summary: 'Reel publicado vía web', durationMs: 0 };
  }

  /** ================================================================ */
  /**  Publicación de Historia                                        */
  /** ================================================================ */

  async publishStory(options: StoryOptions): Promise<OperatorResult> {
    const gateResult = await actionGate(
      'instagram_publish_story',
      'Publicar historia en Instagram Web',
      async () => true,
      { source: 'instagram-web' },
    );
    if (!gateResult.ok) {
      return {
        ok: false,
        action: 'publishStory',
        summary: gateResult.reason ?? 'Rechazado por GlassBox',
        durationMs: 0,
      };
    }

    await this.withRetry('publishStory', async () => {
      if (this.isDryRun()) {
        log.step(`[DRY_RUN] Instagram Web: publicar historia ${options.mediaPath}`);
        return;
      }

      const page = await this.ensurePage();

      if (!this.session?.isWarmedUp) {
        await warmUpSession(page as unknown as Parameters<typeof warmUpSession>[0]);
        this.session!.isWarmedUp = true;
      }

      await this.navigate('https://www.instagram.com/');
      await humanDelay(2000, 4000);

      // Crear → Historia
      await this.click('svg[aria-label="Nueva publicación"]');
      await humanDelay(1000, 2000);
      await this.click('text=Historia');
      await humanDelay(1000, 2000);

      // Subir media
      const fileInput = page.locator('input[type="file"]').first() as unknown as {
        setInputFiles: (paths: string | string[]) => Promise<unknown>;
      };
      await fileInput.setInputFiles(options.mediaPath);
      await humanDelay(3000, 6000);

      // Agregar stickers si hay
      if (options.stickers) {
        for (let i = 0; i < options.stickers.length; i++) {
          await this.click('text=Agregar sticker');
          await humanDelay(500, 1000);
          // Cada tipo de sticker requiere flujo específico
          // Esto es un stub que se expande según necesidad
        }
      }

      // Publicar
      await this.click('text=Tu historia');
      await humanDelay(3000, 6000);
    });
    return { ok: true, action: 'publishStory', summary: 'Historia publicada vía web', durationMs: 0 };
  }

  /** ================================================================ */
  /**  Acciones de engagement                                         */
  /** ================================================================ */

  async likePost(postUrl: string): Promise<OperatorResult> {
    return this.performAtomicAction('likePost', async () => {
      await this.navigate(postUrl);
      await humanReadingPause(2000, 5000);
      await this.click('svg[aria-label="Me gusta"]');
      await humanDelay(1000, 3000);
    });
  }

  async commentOnPost(postUrl: string, comment: string): Promise<OperatorResult> {
    return this.performAtomicAction('commentOnPost', async () => {
      await this.navigate(postUrl);
      await humanReadingPause(3000, 6000);
      await this.click('textarea[aria-label="Agrega un comentario..."]');
      await this.type('textarea[aria-label="Agrega un comentario..."]', comment);
      await humanDelay(500, 1500);
      await this.click('button:has-text("Publicar")');
      await humanDelay(2000, 4000);
    });
  }

  async sendDM(username: string, message: string): Promise<OperatorResult> {
    return this.performAtomicAction('sendDM', async () => {
      await this.navigate(`https://www.instagram.com/direct/inbox/`);
      await humanDelay(2000, 4000);
      await this.click('svg[aria-label="Nuevo mensaje"]');
      await humanDelay(1000, 2000);
      await this.type('input[placeholder="Buscar..."]', username);
      await humanDelay(2000, 4000);
      await this.click(`text=${username}`);
      await humanDelay(500, 1000);
      await this.click('button:has-text("Chat")');
      await humanDelay(1500, 3000);
      await this.type('textarea[placeholder="Mensaje..."]', message);
      await humanDelay(500, 1000);
      await this.click('button:has-text("Enviar")');
      await humanDelay(2000, 4000);
    });
  }

  /** ================================================================ */
  /**  Health check                                                   */
  /** ================================================================ */

  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, unknown> }> {
    if (this.isDryRun()) {
      return { healthy: true, details: { mode: 'dry_run' } };
    }
    const page = await this.ensurePage();
    await this.navigate('https://www.instagram.com/');
    const health = await checkAntiDetectionHealth(page as unknown as Parameters<typeof checkAntiDetectionHealth>[0]);
    const loggedIn = await this.isLoggedIn(page);
    return {
      healthy: health.healthy && loggedIn,
      details: { ...health, loggedIn },
    };
  }
}
