import { beforeEach, describe, expect, it } from 'vitest';
import { batchModerate, moderateComment } from '../../../src/capabilities/tiktok/liveModeration.js';
import { configureRateLimitStore } from '../../../src/compliance/rateLimiter.js';

beforeEach(() => configureRateLimitStore(null));

describe('moderateComment', () => {
  it('marca lenguaje abusivo/amenazante para ocultar', () => {
    const v = moderateComment({ id: 'c1', authorUsername: 'u1', text: 'hijo de puta, te voy a encontrar' });
    expect(v.action).toBe('hide-suggested');
  });

  it('marca spam obvio para ocultar', () => {
    const v = moderateComment({ id: 'c2', authorUsername: 'u2', text: 'gana dinero facil, click here bit.ly/x' });
    expect(v.action).toBe('hide-suggested');
  });

  it('marca preguntas genuinas como candidatas a leer en voz alta', () => {
    const v = moderateComment({ id: 'c3', authorUsername: 'u3', text: '¿de dónde sos?' });
    expect(v.action).toBe('read-aloud-candidate');
  });

  it('comentario neutro se permite sin marcar', () => {
    const v = moderateComment({ id: 'c4', authorUsername: 'u4', text: 'jajaja' });
    expect(v.action).toBe('allow');
  });

  it('NUNCA ejecuta una acción real — el resultado es siempre una sugerencia (action string), nunca un side effect', () => {
    // No hay mocks de red/fs acá a propósito: si esta función alguna vez llamara a
    // una API externa para banear/ocultar de verdad, este test tendría que mockearla.
    const v = moderateComment({ id: 'c5', authorUsername: 'u5', text: 'spam bit.ly/x' });
    expect(typeof v.action).toBe('string');
    expect(v).not.toHaveProperty('executed');
  });
});

describe('batchModerate', () => {
  it('clasifica un lote y cuenta por acción', () => {
    const result = batchModerate([
      { id: '1', authorUsername: 'a', text: 'hola genial!' },
      { id: '2', authorUsername: 'b', text: 'click here bit.ly/x' },
      { id: '3', authorUsername: 'c', text: 'jaja' },
    ]);
    expect(result.blocked).toBe(false);
    expect(result.verdicts).toHaveLength(3);
    expect(result.counts['hide-suggested']).toBe(1);
    expect(result.counts['read-aloud-candidate']).toBe(1);
    expect(result.counts.allow).toBe(1);
  });

  it('respeta el guardian: bloqueado si el rate limit de live_moderate se excede', () => {
    for (let i = 0; i < 500; i++) batchModerate([{ id: `x${i}`, authorUsername: 'u', text: 'hola' }]);
    const result = batchModerate([{ id: 'over', authorUsername: 'u', text: 'hola' }]);
    expect(result.blocked).toBe(true);
    expect(result.verdicts).toHaveLength(0);
  });
});
