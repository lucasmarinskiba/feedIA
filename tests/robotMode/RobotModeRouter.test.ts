/**
 * RobotModeRouter ya no controla un navegador ni un emulador — like/comment/
 * follow/dm (siempre no soportadas por la API oficial sobre cuentas ajenas)
 * y publish sin API disponible quedan deshabilitadas. Estos tests confirman
 * que el router falla rápido y claro en esos casos, sin ejecutar nada.
 */
import { describe, expect, it } from 'vitest';
import { executeRobotAction, type RobotAction } from '../../src/robotMode/RobotModeRouter.js';
import { loadBrandProfile } from '../../src/config/index.js';

const brand = loadBrandProfile();

describe('executeRobotAction: acciones deshabilitadas (AUTO-001/002/003, INT-001)', () => {
  it.each<[RobotAction]>([
    [{ type: 'like', brand, postUrl: 'https://instagram.com/p/abc' }],
    [{ type: 'comment', brand, postUrl: 'https://instagram.com/p/abc', text: 'hola!' }],
    [{ type: 'follow', brand, username: 'alguien' }],
    [{ type: 'dm', brand, username: 'alguien', message: 'hola' }],
  ])('%s: nunca se ejecuta, falla rápido con error claro', async (action) => {
    const result = await executeRobotAction(action);
    expect(result.ok).toBe(false);
    expect(result.via).toBe('none');
    expect(result.error).toMatch(/no está soportad|deshabilitad/i);
  });

  it('publish con formato story (requiere web) falla sin automatizar el navegador', async () => {
    const result = await executeRobotAction({
      type: 'publish',
      brand,
      format: 'story',
      mediaPaths: ['test.jpg'],
      caption: '',
    });
    expect(result.ok).toBe(false);
    expect(result.via).toBe('none');
    expect(result.error).toMatch(/no está soportado/i);
  });

  it('publish con colaborador (requiere web) falla sin automatizar el navegador', async () => {
    const result = await executeRobotAction({
      type: 'publish',
      brand,
      format: 'post',
      mediaPaths: ['test.jpg'],
      caption: 'x',
      collaborator: 'otra_cuenta',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no está soportado/i);
  });

  it('publish normal sin credenciales de Meta configuradas: falla pidiendo conectar la cuenta', async () => {
    const result = await executeRobotAction({
      type: 'publish',
      brand,
      format: 'post',
      mediaPaths: ['test.jpg'],
      caption: 'x',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/OAuth|credenciales/i);
  });
});
