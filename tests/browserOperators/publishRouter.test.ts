/**
 * Tests del Publish Router.
 *
 * El fallback a Instagram Web/App (Playwright con fingerprint spoofing contra
 * la sesión real del usuario) se deshabilitó: violaba AUTO-002 y arriesgaba
 * el baneo de la cuenta. Estos tests confirman que sigue apagado — no que
 * "funcione", sino que nunca intenta controlar un navegador.
 */
import { describe, it, expect } from 'vitest';
import { checkPublishHealth, publishToInstagramViaRouter } from '../../src/browserOperators/instagram/publishRouter.js';
import { loadBrandProfile } from '../../src/config/index.js';

const brand = loadBrandProfile();

describe('PublishRouter', () => {
  it('checkPublishHealth: web/app siempre false, recommended siempre api', async () => {
    const health = await checkPublishHealth(brand);
    expect(health.web).toBe(false);
    expect(health.app).toBe(false);
    expect(health.recommended).toBe('api');
  });

  it('sin credenciales de Meta, falla con error claro en vez de caer a web/app', async () => {
    const result = await publishToInstagramViaRouter(brand, {
      format: 'post',
      mediaPaths: ['test.jpg'],
      caption: 'Test via router',
    });
    expect(result.ok).toBe(false);
    expect(result.via).toBe('api');
    expect(result.error).toMatch(/OAuth|credenciales/i);
  });

  it('un formato que la API no soporta (story) falla en vez de automatizar el navegador', async () => {
    const result = await publishToInstagramViaRouter(brand, {
      format: 'story',
      mediaPaths: ['test.jpg'],
      caption: '',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no está soportado/i);
  });

  it('forzar via "web" o "app" explícitamente también queda bloqueado', async () => {
    const web = await publishToInstagramViaRouter(
      brand,
      { format: 'post', mediaPaths: ['test.jpg'], caption: 'x' },
      'web',
    );
    expect(web.ok).toBe(false);
    expect(web.error).toMatch(/deshabilitada/i);

    const app = await publishToInstagramViaRouter(
      brand,
      { format: 'post', mediaPaths: ['test.jpg'], caption: 'x' },
      'app',
    );
    expect(app.ok).toBe(false);
    expect(app.error).toMatch(/deshabilitada/i);
  });
});
