/**
 * instagramActions.ts ya no controla el navegador contra cuentas ajenas ni
 * publica (eso va vía Upload-Post/API — ver desktopWorkflows.ts). Estos tests
 * confirman que las funciones prohibidas quedaron afuera del módulo (no solo
 * "sin usarse en algún lado" — directamente no existen para importar) y que
 * las que quedan (cuenta propia, read-only) siguen funcionando.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/capabilities/computerUse/controller.js', () => ({
  runComputerUseSession: vi.fn(async () => ({
    ok: true,
    summary: 'sesión simulada',
    actionsExecuted: 1,
  })),
}));

import { runComputerUseSession } from '../../../src/capabilities/computerUse/controller.js';
import * as instagramActions from '../../../src/capabilities/computerUse/instagramActions.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();

beforeEach(() => {
  vi.mocked(runComputerUseSession).mockClear();
});

describe('instagramActions: superficie del módulo', () => {
  it('no exporta ninguna acción de engagement/publish sobre cuentas ajenas o que duplique DM Inbox', () => {
    const removed = [
      'comentarEnPost',
      'darLike',
      'seguirCuenta',
      'enviarDM',
      'responderDMsPendientes',
      'realizarBeaconEngagement',
      'interactuarConTendencia',
      'publicarPost',
      'publicarHistoria',
      'publicarReel',
    ];
    for (const name of removed) {
      expect(name in instagramActions).toBe(false);
    }
  });

  it('conserva las acciones de cuenta propia / read-only', () => {
    const kept = [
      'editarPerfil',
      'auditarPerfil',
      'leerInsights',
      'verAnaliticasPost',
      'crearHighlight',
      'moderarComentariosDePost',
      'procesarNotificaciones',
    ];
    for (const name of kept) {
      expect(typeof (instagramActions as Record<string, unknown>)[name]).toBe('function');
    }
  });
});

describe('procesarNotificaciones', () => {
  it('ya no acepta followBackRelevant (auto-follow eliminado)', async () => {
    const opts: instagramActions.NotificationActionOptions = { respondToComments: true, maxActions: 10 };
    expect('followBackRelevant' in opts).toBe(false);
    const result = await instagramActions.procesarNotificaciones(brand, opts);
    expect(result.ok).toBe(true);
    expect(runComputerUseSession).toHaveBeenCalledOnce();
  });
});

describe('auditarPerfil / verAnaliticasPost / leerInsights: read-only, cuenta propia', () => {
  it('auditarPerfil corre una sesión de solo lectura', async () => {
    const result = await instagramActions.auditarPerfil(brand);
    expect(result.ok).toBe(true);
  });

  it('verAnaliticasPost corre una sesión de solo lectura sobre un post propio', async () => {
    const result = await instagramActions.verAnaliticasPost(brand, 'https://instagram.com/p/propio123');
    expect(result.ok).toBe(true);
  });
});
