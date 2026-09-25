import { beforeEach, describe, expect, it } from 'vitest';
import { evaluate } from '../../src/compliance/guardian.js';
import { configureRateLimitStore } from '../../src/compliance/rateLimiter.js';

// Memoria aislada por archivo de test — ver tiktokGuardian.test.ts para el motivo.
beforeEach(() => configureRateLimitStore(null));

describe('guardian: INT-005 ventana de 24h para nurture_sequence', () => {
  it('sin lastInteractionAt → bloqueado', () => {
    const decision = evaluate('nurture_sequence', {
      actor: 'nurture:seq-1',
      targetIgUserId: 'u1',
      contentText: 'Hola!',
      humanInitiated: false,
    });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('INT-005');
  });

  it('lastInteractionAt hace más de 24h → bloqueado', () => {
    const decision = evaluate('nurture_sequence', {
      actor: 'nurture:seq-1',
      targetIgUserId: 'u1',
      contentText: 'Hola de nuevo!',
      humanInitiated: false,
      lastInteractionAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('INT-005');
  });

  it('lastInteractionAt dentro de 24h → permitido', () => {
    const decision = evaluate('nurture_sequence', {
      actor: 'nurture:seq-1',
      targetIgUserId: 'u1',
      contentText: 'Hola!',
      humanInitiated: false,
      lastInteractionAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(decision.violatedRules.map((r) => r.code)).not.toContain('INT-005');
  });

  it('categoría dm genérica no aplica INT-005 (otros emisores de sendDm responden en el mismo turno)', () => {
    const decision = evaluate('dm', {
      actor: 'bot:reply',
      targetIgUserId: 'u1',
      contentText: 'Gracias por tu mensaje!',
      humanInitiated: false,
    });
    expect(decision.violatedRules.map((r) => r.code)).not.toContain('INT-005');
  });
});
