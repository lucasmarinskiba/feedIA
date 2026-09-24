import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/tokenRouter.js', () => ({
  ask: vi.fn(async () => ({ text: 'Claro! Te paso el link del catálogo: https://tiktok.com/shop/ejemplo' })),
}));

import { ask } from '../../../src/agent/tokenRouter.js';
import {
  classifyBusinessIntent,
  respondToBusinessMessage,
} from '../../../src/capabilities/tiktok/businessMessaging.js';
import { configureRateLimitStore } from '../../../src/compliance/rateLimiter.js';
import type { BrandProfile } from '../../../src/config/types.js';

const mockBrand = {
  name: 'MarcaTest',
  type: 'empresa',
  niche: 'skincare',
  audience: { description: 'creators', pains: [], desires: [], locale: 'es-AR' },
  voice: { tone: ['directo', 'cercano'], forbidden: [], referenceQuotes: [] },
  visual: {
    palette: [],
    typography: [],
    style: 'minimalista',
    mood: 'profesional',
    photographyStyle: 'natural',
    compositionRules: [],
    allowedIconography: [],
    forbiddenIconography: [],
    moodboardUrls: [],
    density: 'medium',
    imageTextRatio: 'balanced',
  },
  goals: { primary: 'engagement', metricsToWatch: [] },
} as unknown as BrandProfile;

beforeEach(() => {
  configureRateLimitStore(null);
  vi.mocked(ask).mockClear();
});

describe('classifyBusinessIntent', () => {
  it.each([
    ['catalogo', '¿Cuánto cuesta el producto?'],
    ['catalogo', 'quiero ver el catálogo'],
    ['agendar', 'quiero agendar una llamada'],
    ['agendar', 'puedo reservar un turno?'],
    ['soporte', 'tengo un problema con mi pedido'],
    ['general', 'hola que tal!'],
  ])('clasifica "%s" para "%s"', (expected, text) => {
    expect(classifyBusinessIntent(text)).toBe(expected);
  });
});

describe('respondToBusinessMessage', () => {
  it('genera y permite una respuesta a alguien que escribió primero', async () => {
    const result = await respondToBusinessMessage({ senderId: 'tt-user-1', text: '¿Cuánto cuesta?' }, mockBrand, {
      catalogUrl: 'https://tiktok.com/shop/ejemplo',
    });
    expect(result.sent).toBe(true);
    expect(result.text).toBeTruthy();
    expect(result.intent).toBe('catalogo');
    expect(ask).toHaveBeenCalledOnce();
  });

  it('nunca envía sin un senderId (no hay forma de mass-messaging por acá)', async () => {
    const result = await respondToBusinessMessage({ senderId: '', text: 'hola' }, mockBrand);
    expect(result.sent).toBe(false);
    expect(result.reason).toMatch(/TT-BIZ-001/);
  });

  it('dos respuestas seguidas al MISMO usuario: la segunda queda bloqueada por espaciado mínimo', async () => {
    const first = await respondToBusinessMessage({ senderId: 'same-user', text: 'hola' }, mockBrand);
    expect(first.sent).toBe(true);
    const second = await respondToBusinessMessage({ senderId: 'same-user', text: 'otra vez' }, mockBrand);
    expect(second.sent).toBe(false);
    expect(second.reason).toMatch(/esperar/i);
  });

  it('usuarios distintos no comparten ventana de rate limit', async () => {
    const a = await respondToBusinessMessage({ senderId: 'user-a', text: 'hola' }, mockBrand);
    const b = await respondToBusinessMessage({ senderId: 'user-b', text: 'hola' }, mockBrand);
    expect(a.sent).toBe(true);
    expect(b.sent).toBe(true);
  });
});
