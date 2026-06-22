/**
 * AntiDetection — Capa profesional de anti-detección para browser automation.
 * Integra stealth, human behavior, rate limits, y session warming.
 */
import { log } from '../../agent/logger.js';
import { humanDelay, humanReadingPause } from './humanBehavior.js';
// Playwright types are loaded dynamically; use conditional typing
type PageLike = {
  goto: (url: string, opts?: { waitUntil?: string }) => Promise<unknown>;
  mouse: { wheel: (dx: number, dy: number) => Promise<unknown> };
  locator: (sel: string) => { count: () => Promise<number> };
  evaluate: <T>(fn: () => T) => Promise<T>;
};

/** URLs de "calentamiento" — páginas inocuas para romper patrones */
const WARMUP_URLS = [
  'https://www.google.com/search?q=clima+hoy',
  'https://www.youtube.com',
  'https://news.google.com',
  'https://www.wikipedia.org',
  'https://www.reddit.com/r/technology',
];

const SEARCH_QUERIES = [
  'recetas fáciles',
  'noticias deportivas',
  'clima fin de semana',
  'mejores películas 2024',
  'cómo plantar tomates',
];

/** Sesión warming: visitar páginas inocuas antes de la acción real */
export const warmUpSession = async (page: PageLike, steps: number = 3): Promise<void> => {
  log.info('[AntiDetection] Iniciando session warm-up...');

  // Paso 1: Google search
  const query = SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)] ?? 'clima hoy';
  await page.goto(`https://www.google.com/search?q=${encodeURIComponent(query)}`, {
    waitUntil: 'networkidle',
  });
  await humanReadingPause(2000, 5000);
  await humanDelay(1000, 2000);

  // Pasos 2-N: URLs aleatorias
  const shuffled = WARMUP_URLS.sort(() => Math.random() - 0.5).slice(0, steps - 1);
  for (const url of shuffled) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await humanReadingPause(3000, 8000);
    // Scroll ocasional
    if (Math.random() > 0.5) {
      await page.mouse.wheel(0, 300 + Math.random() * 400);
      await humanDelay(500, 1500);
    }
  }

  log.info('[AntiDetection] Session warm-up completado');
};

/** Verifica si la página detectó automation (mensajes de bloqueo) */
export const detectBlocking = async (page: PageLike): Promise<{ blocked: boolean; reason?: string }> => {
  const blockIndicators = [
    'text=Acceso denegado',
    'text=Access denied',
    'text=Please verify you are a human',
    'text=Confirm you are not a robot',
    'text=Sesión expirada',
    'text=Unusual activity',
    'text=Comportamiento inusual',
    'text=Account suspended',
    'text=Cuenta suspendida',
  ];

  for (const indicator of blockIndicators) {
    const count = await page.locator(indicator).count();
    if (count > 0) {
      return { blocked: true, reason: indicator };
    }
  }
  return { blocked: false };
};

/** Rotación de User-Agent por sesión (ya manejada en stealthProfile) */
export const rotateUserAgent = (): string => {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:126.0) Gecko/20100101 Firefox/126.0',
  ];
  return agents[Math.floor(Math.random() * agents.length)] ?? agents[0]!;
};

/** Aplica parches de anti-detección adicionales en runtime */
export const applyRuntimePatches = async (page: PageLike): Promise<void> => {
  await page.evaluate(() => {
    // Ocultar webdriver
    delete (Object.getPrototypeOf(navigator) as Record<string, unknown>).webdriver;

    // Spoof plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer' },
        { name: 'Native Client', filename: 'internal-nacl-plugin' },
      ],
    });

    // Spoof permissions
    const navPerm = (navigator as unknown as { permissions: { query: (p: { name: string }) => Promise<unknown> } })
      .permissions;
    const originalQuery = navPerm.query;
    navPerm.query = (parameters: { name: string }) =>
      parameters.name === 'notifications' ? Promise.resolve({ state: 'default' }) : originalQuery(parameters);

    // Ocultar automation flags
    const w = globalThis as unknown as Record<string, unknown>;
    delete w.__webdriver_script_fn;
    delete w._phantom;
    delete w.callPhantom;
    delete w._selenium;
    delete w.callSelenium;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Array;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
    delete w.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
  });
};

/** Verifica el estado de salud anti-detection de una sesión */
export const checkAntiDetectionHealth = async (
  page: PageLike,
): Promise<{
  healthy: boolean;
  webdriverHidden: boolean;
  pluginsSpoofed: boolean;
  userAgent: string;
  warnings: string[];
}> => {
  const warnings: string[] = [];

  const webdriverHidden = await page.evaluate(
    () =>
      // @ts-expect-error
      navigator.webdriver === undefined,
  );
  if (!webdriverHidden) warnings.push('navigator.webdriver es visible');

  const pluginsSpoofed = await page.evaluate(
    () =>
      // @ts-expect-error — plugins may not exist in typing
      (navigator.plugins?.length ?? 0) > 0,
  );
  if (!pluginsSpoofed) warnings.push('navigator.plugins está vacío');

  const userAgent = await page.evaluate(() => navigator.userAgent);

  const blocked = await detectBlocking(page);
  if (blocked.blocked) warnings.push(`Página bloqueada: ${blocked.reason}`);

  return {
    healthy: warnings.length === 0,
    webdriverHidden,
    pluginsSpoofed,
    userAgent,
    warnings,
  };
};
