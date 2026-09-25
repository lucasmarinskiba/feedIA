/**
 * interactuarConPost() drove real Computer Use to like/comment/save/share on
 * an ARBITRARY post (no ownership check on `contexto`) — same risk as
 * darLike/comentarEnPost/platform_auto_reply, already disabled elsewhere
 * this session. Now permanently disabled here too. The rest of this file
 * (navegarInstagram, leerFeed, buscarCuentaOHashtag, leerDMs, verPerfil,
 * verNotificaciones) stays live: observation-only, no engagement action.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/capabilities/computerUse/controller.js', () => ({
  runComputerUseSession: vi.fn(async () => ({ ok: true, summary: 'mock', actionsExecuted: 0 })),
}));

import { runComputerUseSession } from '../../../src/capabilities/computerUse/controller.js';
import { interactuarConPost } from '../../../src/capabilities/computerUse/instagramNavigator.js';
import { loadBrandProfile } from '../../../src/config/index.js';

const brand = loadBrandProfile();
const mockedRunComputerUseSession = vi.mocked(runComputerUseSession);

beforeEach(() => {
  mockedRunComputerUseSession.mockClear();
});

describe('interactuarConPost: deshabilitado', () => {
  it.each(['like', 'comentar', 'guardar', 'compartir'] as const)(
    '%s: nunca ejecuta, nunca toca Computer Use',
    async (accion) => {
      const result = await interactuarConPost(brand, accion, 'último post de @alguien');
      expect(result.ok).toBe(false);
      expect(result.actionsExecuted).toBe(0);
      expect(mockedRunComputerUseSession).not.toHaveBeenCalled();
    },
  );
});
