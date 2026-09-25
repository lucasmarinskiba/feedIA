import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/integrations/metaAccountResolver.js', () => ({
  resolveMetaCredentials: vi.fn(),
}));
vi.mock('../../../src/integrations/metaApiClient.js', () => ({
  metaFetch: vi.fn(async () => new Response('{}', { status: 200 })),
}));

import { env } from '../../../src/config/index.js';
import { resolveMetaCredentials } from '../../../src/integrations/metaAccountResolver.js';
import { metaFetch } from '../../../src/integrations/metaApiClient.js';
import { configureRateLimitStore } from '../../../src/compliance/rateLimiter.js';
import {
  DEFAULT_ICE_BREAKERS,
  configureIceBreakerStore,
  getIceBreakers,
  setIceBreakers,
  syncIceBreakersToMeta,
} from '../../../src/capabilities/instagram/iceBreakers.js';

const mockedResolve = vi.mocked(resolveMetaCredentials);
const mockedFetch = vi.mocked(metaFetch);

beforeEach(() => {
  configureIceBreakerStore(null);
  configureRateLimitStore(null);
  mockedResolve.mockReset();
  mockedFetch.mockClear();
});

describe('getIceBreakers / setIceBreakers', () => {
  it('sin configuración previa, devuelve los defaults compliant (AUTO-003)', () => {
    expect(getIceBreakers('acct-1')).toEqual(DEFAULT_ICE_BREAKERS);
  });

  it('guarda un menú válido y lo devuelve después', () => {
    const items = [{ question: '¿Envíos a todo el país?', payload: 'IB_SHIPPING' }];
    const result = setIceBreakers('acct-1', items);
    expect(result.ok).toBe(true);
    expect(getIceBreakers('acct-1')).toEqual(items);
  });

  it('rechaza más de 4 opciones (límite de Meta)', () => {
    const items = Array.from({ length: 5 }, (_, i) => ({ question: `Q${i}`, payload: `P${i}` }));
    const result = setIceBreakers('acct-1', items);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/4/);
  });

  it('rechaza menú vacío', () => {
    expect(setIceBreakers('acct-1', []).ok).toBe(false);
  });

  it('rechaza preguntas con promesas absolutas (CONT-003, via guardian)', () => {
    const items = [{ question: 'Ganás $10000 en 7 días garantizado', payload: 'IB_SCAM' }];
    const result = setIceBreakers('acct-1', items);
    expect(result.ok).toBe(false);
  });

  it('cuentas distintas no comparten el menú configurado', () => {
    setIceBreakers('acct-1', [{ question: 'Solo para acct-1', payload: 'P1' }]);
    expect(getIceBreakers('acct-2')).toEqual(DEFAULT_ICE_BREAKERS);
  });
});

describe('syncIceBreakersToMeta', () => {
  it('sin credenciales configuradas → no-credentials, sin llamar a la Graph API', async () => {
    mockedResolve.mockResolvedValue(null);
    const result = await syncIceBreakersToMeta('acct-sin-creds');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('no-credentials');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('con credenciales pero sin pageId → missing-page-id', async () => {
    mockedResolve.mockResolvedValue({ accessToken: 'tok', igBusinessId: 'ig-1' });
    const result = await syncIceBreakersToMeta('acct-sin-page');
    expect(result.ok).toBe(false);
    expect(result.error).toBe('missing-page-id');
    expect(mockedFetch).not.toHaveBeenCalled();
  });

  it('con credenciales completas: dryRun refleja env.dryRun honestamente', async () => {
    mockedResolve.mockResolvedValue({ accessToken: 'tok', igBusinessId: 'ig-1', pageId: 'page-1' });
    const result = await syncIceBreakersToMeta('acct-completa');
    expect(result.dryRun).toBe(env.dryRun);
    if (env.dryRun) {
      expect(result.ok).toBe(true);
      expect(mockedFetch).not.toHaveBeenCalled();
    } else {
      expect(mockedFetch).toHaveBeenCalledOnce();
      const [url] = mockedFetch.mock.calls[0];
      expect(String(url)).toContain('page-1/messenger_profile');
      expect(String(url)).toContain('platform=instagram');
    }
  });
});
