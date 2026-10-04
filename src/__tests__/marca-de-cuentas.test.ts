import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { BrandProfile } from '../config/types.js';
import { getSessionUser } from '../auth/userAccounts.js';
import { marcaDeCuentas } from '../server/marcaDeCuentas.js';

vi.mock('../auth/userAccounts.js', () => ({
  getSessionUser: vi.fn(),
}));

const mockedGetSessionUser = vi.mocked(getSessionUser);
const brand = { id: 'paithon-labs', name: 'Paithon Labs' } as unknown as BrandProfile;

const reqCon = (cookie?: string): { headers: Record<string, string | undefined> } => ({
  headers: cookie ? { cookie } : {},
});

describe('marcaDeCuentas', () => {
  beforeEach(() => {
    mockedGetSessionUser.mockReset();
  });

  it('usa la marca por defecto del servidor sin sesión', async () => {
    expect(await marcaDeCuentas(reqCon(), brand)).toBe('paithon-labs');
    expect(mockedGetSessionUser).not.toHaveBeenCalled();
  });

  it('usa la marca activa de la sesión, la misma donde se conectan las cuentas', async () => {
    mockedGetSessionUser.mockResolvedValue({
      id: 'usr-1',
      activeBrandId: 'default-abc12345',
      brandIds: ['default-abc12345'],
    } as unknown as Awaited<ReturnType<typeof getSessionUser>>);
    expect(await marcaDeCuentas(reqCon('feedia_session=tok'), brand)).toBe('default-abc12345');
  });

  it('cae en la marca por defecto si la marca activa no pertenece al usuario', async () => {
    mockedGetSessionUser.mockResolvedValue({
      id: 'usr-2',
      activeBrandId: 'ajena',
      brandIds: ['propia'],
    } as unknown as Awaited<ReturnType<typeof getSessionUser>>);
    expect(await marcaDeCuentas(reqCon('feedia_session=tok'), brand)).toBe('paithon-labs');
  });

  it('cae en la marca por defecto con una sesión inválida', async () => {
    mockedGetSessionUser.mockResolvedValue(null);
    expect(await marcaDeCuentas(reqCon('feedia_session=vencida'), brand)).toBe('paithon-labs');
  });
});
