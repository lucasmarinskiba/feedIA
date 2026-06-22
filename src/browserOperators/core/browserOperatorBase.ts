/**
 * BrowserOperatorBase — Clase base abstracta para todos los operadores de navegador.
 * Proporciona: navegación, screenshots, retry, human delays, cookie jar,
 * session persistence, y anti-detection built-in.
 */
// Playwright types loaded dynamically — define minimal interfaces
type Browser = unknown;
type BrowserContext = unknown;
interface Page {
  goto: (url: string, opts?: { waitUntil?: string }) => Promise<unknown>;
  locator: (sel: string) => {
    first: () => {
      click: (opts?: { force?: boolean }) => Promise<unknown>;
      boundingBox: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
      focus: () => Promise<unknown>;
      fill: (value: string) => Promise<unknown>;
      press: (key: string) => Promise<unknown>;
    };
    count: () => Promise<number>;
  };
  mouse: {
    move: (x: number, y: number) => Promise<unknown>;
    wheel: (dx: number, dy: number) => Promise<unknown>;
  };
  screenshot: (opts?: { path?: string; fullPage?: boolean }) => Promise<Buffer | string>;
  waitForSelector: (sel: string, opts?: { timeout?: number; state?: string }) => Promise<unknown>;
  waitForLoadState: (state: string, opts?: { timeout?: number }) => Promise<unknown>;
  setViewportSize: (size: { width: number; height: number }) => Promise<unknown>;
  evaluate: <T>(fn: () => T) => Promise<T>;
  viewportSize: () => { width: number; height: number } | null;
}
// End Playwright minimal types
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import { applyStealthProfile, type StealthConfig } from './stealthProfile.js';
import { humanDelay, humanScroll, humanType, humanMouseMove } from './humanBehavior.js';
import { getRateLimiter, type RateLimitTier } from './rateLimitSmart.js';
import type { BrandProfile } from '../../config/types.js';

export interface OperatorSession {
  id: string;
  brandId: string;
  platform: string;
  browser?: Browser;
  context?: BrowserContext;
  page?: Page;
  lastUsedAt: number;
  createdAt: number;
  fingerprint: StealthConfig;
  cookiesPath: string;
  isWarmedUp: boolean;
}

export interface OperatorResult {
  ok: boolean;
  action: string;
  summary: string;
  error?: string;
  durationMs: number;
  screenshot?: string;
}

export interface OperatorOptions {
  brand: BrandProfile;
  headless?: boolean;
  dryRun?: boolean;
  rateLimitTier?: RateLimitTier;
  proxyUrl?: string;
  timeoutMs?: number;
}

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min
const MAX_RETRIES = 3;

export abstract class BrowserOperatorBase {
  protected session: OperatorSession | null = null;
  protected options: OperatorOptions;
  protected rateLimiter: ReturnType<typeof getRateLimiter>;

  constructor(options: OperatorOptions) {
    this.options = {
      headless: env.dryRun,
      dryRun: env.dryRun,
      timeoutMs: 60000,
      ...options,
    };
    this.rateLimiter = getRateLimiter(options.rateLimitTier ?? 'medium');
  }

  /** Nombre único del operador (ej: 'instagram-web', 'canva') */
  abstract getPlatform(): string;

  /** URL de login de la plataforma */
  abstract getLoginUrl(): string;

  /** Verifica si la sesión está autenticada */
  abstract isLoggedIn(page: Page): Promise<boolean>;

  /** Realiza login en la plataforma */
  abstract login(page: Page, credentials: Record<string, string>): Promise<boolean>;

  /** ================================================================ */
  /**  Sesión y navegador                                              */
  /** ================================================================ */

  async initSession(): Promise<OperatorSession> {
    if (this.session && Date.now() - this.session.lastUsedAt < SESSION_TIMEOUT_MS) {
      log.info(`[${this.getPlatform()}] Reutilizando sesión ${this.session.id}`);
      this.session.lastUsedAt = Date.now();
      return this.session;
    }

    if (this.session) {
      await this.closeSession();
    }

    // @ts-expect-error — playwright is optional dynamic dependency
    const pwModule = await import('playwright').catch(() => null);
    if (!pwModule) {
      throw new Error('Playwright no está instalado. Instalá con: npm install playwright');
    }
    const pw = pwModule as { chromium: { launch: (opts: unknown) => Promise<Browser> } };

    const fingerprint = applyStealthProfile();
    const sessionId = `${this.getPlatform()}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    log.info(`[${this.getPlatform()}] Iniciando sesión ${sessionId}`);

    const browser = await pw.chromium.launch({
      headless: this.options.headless ?? false,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=' + fingerprint.viewport.width + ',' + fingerprint.viewport.height,
        '--lang=' + fingerprint.locale,
        ...(this.options.proxyUrl ? ['--proxy-server=' + this.options.proxyUrl] : []),
      ],
    });

    const context = await (browser as unknown as { newContext: (opts: unknown) => Promise<BrowserContext> }).newContext(
      {
        viewport: fingerprint.viewport,
        userAgent: fingerprint.userAgent,
        locale: fingerprint.locale,
        timezoneId: fingerprint.timezone,
        colorScheme: 'light',
        reducedMotion: 'no-preference',
        geolocation: fingerprint.geolocation,
        permissions: ['geolocation'],
      },
    );

    // Aplicar stealth al page
    await (context as unknown as { addInitScript: (fn: () => void) => Promise<unknown> }).addInitScript(() => {
      delete (Object.getPrototypeOf(navigator) as Record<string, unknown>).webdriver;
      (globalThis as unknown as Record<string, unknown>).chrome = { runtime: {} };
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, 'languages', {
        get: () => ['es-AR', 'es', 'en-US', 'en'],
      });
    });

    const page = await (context as unknown as { newPage: () => Promise<Page> }).newPage();
    await page.setViewportSize(fingerprint.viewport);

    this.session = {
      id: sessionId,
      brandId: this.options.brand.name,
      platform: this.getPlatform(),
      browser,
      context,
      page,
      lastUsedAt: Date.now(),
      createdAt: Date.now(),
      fingerprint,
      cookiesPath: `data/runtime/browser-sessions/${sessionId}-cookies.json`,
      isWarmedUp: false,
    };

    return this.session;
  }

  async closeSession(): Promise<void> {
    if (!this.session) return;
    try {
      await (this.session.context as unknown as { close: () => Promise<unknown> })?.close();
      await (this.session.browser as unknown as { close: () => Promise<unknown> })?.close();
      log.info(`[${this.getPlatform()}] Sesión ${this.session.id} cerrada`);
    } catch (err) {
      log.warn(`[${this.getPlatform()}] Error cerrando sesión: ${err instanceof Error ? err.message : String(err)}`);
    }
    this.session = null;
  }

  /** ================================================================ */
  /**  Navegación y acciones atómicas                                  */
  /** ================================================================ */

  async navigate(url: string, waitUntil: 'load' | 'networkidle' | 'domcontentloaded' = 'networkidle'): Promise<void> {
    if (this.options.dryRun) {
      log.step(`[DRY_RUN] [${this.getPlatform()}] Navegar a ${url}`);
      return;
    }
    const page = await this.ensurePage();
    await humanDelay(800, 2000);
    await page.goto(url, { waitUntil });
    await humanDelay(500, 1500);
  }

  async click(selector: string, options?: { force?: boolean; timeout?: number }): Promise<void> {
    if (this.options.dryRun) {
      log.step(`[DRY_RUN] [${this.getPlatform()}] Click en ${selector}`);
      return;
    }
    const page = await this.ensurePage();
    await this.waitForSelector(selector, { timeout: options?.timeout ?? 10000 });
    const el = await page.locator(selector).first();
    const box = await el.boundingBox();
    if (box) {
      await humanMouseMove(page, box);
    }
    await humanDelay(200, 800);
    await el.click({ force: options?.force });
    await humanDelay(300, 1200);
  }

  async type(selector: string, text: string): Promise<void> {
    if (this.options.dryRun) {
      log.step(`[DRY_RUN] [${this.getPlatform()}] Type "${text.slice(0, 30)}..." en ${selector}`);
      return;
    }
    const page = await this.ensurePage();
    await this.waitForSelector(selector);
    const el = await page.locator(selector).first();
    await el.focus();
    await humanDelay(100, 300);
    await humanType(page, selector, text);
    await humanDelay(300, 800);
  }

  async scroll(direction: 'up' | 'down' = 'down', amount: number = 500): Promise<void> {
    if (this.options.dryRun) {
      log.step(`[DRY_RUN] [${this.getPlatform()}] Scroll ${direction} ${amount}px`);
      return;
    }
    const page = await this.ensurePage();
    await humanScroll(page, direction, amount);
  }

  async screenshot(name?: string): Promise<string | undefined> {
    if (this.options.dryRun) return undefined;
    const page = await this.ensurePage();
    const path = `data/runtime/screenshots/${this.getPlatform()}-${Date.now()}${name ? '-' + name : ''}.png`;
    await page.screenshot({ path, fullPage: false });
    return path;
  }

  async waitForSelector(selector: string, options?: { timeout?: number; visible?: boolean }): Promise<void> {
    if (this.options.dryRun) return;
    const page = await this.ensurePage();
    await page.waitForSelector(selector, {
      timeout: options?.timeout ?? 10000,
      state: options?.visible ? 'visible' : 'attached',
    });
  }

  async waitForNavigation(options?: { timeout?: number; url?: string }): Promise<void> {
    if (this.options.dryRun) return;
    const page = await this.ensurePage();
    await page.waitForLoadState('networkidle', { timeout: options?.timeout ?? 15000 });
  }

  /** ================================================================ */
  /**  Retry y rate limiting                                           */
  /** ================================================================ */

  async withRetry<T>(
    action: string,
    fn: () => Promise<T>,
    opts?: { maxRetries?: number; baseDelayMs?: number },
  ): Promise<T> {
    const maxRetries = opts?.maxRetries ?? MAX_RETRIES;
    const baseDelay = opts?.baseDelayMs ?? 2000;
    let lastError: Error | undefined;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        // Rate limit check
        if (!this.rateLimiter.canProceed(action)) {
          const wait = this.rateLimiter.timeUntilNext(action);
          log.info(`[${this.getPlatform()}] Rate limit: esperando ${Math.round(wait / 1000)}s para ${action}`);
          await new Promise((r) => setTimeout(r, wait));
        }
        this.rateLimiter.recordAction(action);

        const result = await fn();
        return result;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        if (i < maxRetries) {
          const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
          log.warn(
            `[${this.getPlatform()}] ${action} falló (intento ${i + 1}/${maxRetries + 1}): ${lastError.message}. Reintentando en ${Math.round(delay)}ms...`,
          );
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    throw lastError ?? new Error(`${action} falló después de ${maxRetries + 1} intentos`);
  }

  /** ================================================================ */
  /**  Utilidades                                                      */
  /** ================================================================ */

  async ensurePage(): Promise<Page> {
    if (!this.session?.page) {
      await this.initSession();
    }
    return this.session!.page!;
  }

  getPage(): Page | null {
    return this.session?.page ?? null;
  }

  isDryRun(): boolean {
    return this.options.dryRun ?? true;
  }

  protected async performAtomicAction(actionName: string, fn: () => Promise<void>): Promise<OperatorResult> {
    const start = Date.now();
    try {
      await this.withRetry(actionName, fn);
      return {
        ok: true,
        action: actionName,
        summary: `${actionName} completado`,
        durationMs: Date.now() - start,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        ok: false,
        action: actionName,
        summary: `${actionName} falló: ${msg}`,
        error: msg,
        durationMs: Date.now() - start,
      };
    }
  }
}
