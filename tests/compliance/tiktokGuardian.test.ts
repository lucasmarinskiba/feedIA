import { beforeEach, describe, expect, it } from 'vitest';
import { evaluate, recordSuccess } from '../../src/compliance/tiktokGuardian.js';
import { configureRateLimitStore } from '../../src/compliance/rateLimiter.js';

// Memoria aislada por archivo de test — el rate limiter real persiste en un
// archivo compartido (data/runtime/rate-limits.json); en modo memoria cada
// worker de vitest tiene el suyo, así los tests no se pisan entre archivos
// que corren en paralelo.
beforeEach(() => configureRateLimitStore(null));

describe('tiktokGuardian: bloquea siempre engagement falso y automatización tipo humano (TT-AUTO-*)', () => {
  it.each([
    ['comprar seguidores', 'Quiero comprar 1000 seguidores para mi cuenta'],
    ['vender likes', 'Vendemos 500 likes por $10'],
    ['engagement pod', 'Sumate a nuestro pod de engagement artificial'],
    ['paquete de seguidores', '5000 seguidores por $50, mandame el pago'],
  ])('%s → bloqueado (TT-AUTO-001)', (_label, text) => {
    const decision = evaluate('publish', { actor: 'test', contentText: text });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('TT-AUTO-001');
  });

  it.each([
    ['auto-follow', 'Activá el auto-follow para ganar seguidores rápido'],
    ['scraping', 'Necesito scrapear los seguidores de esta cuenta'],
    ['mass follow', 'Bot para seguir masivamente cuentas del nicho'],
  ])('%s → bloqueado (TT-AUTO-002)', (_label, text) => {
    const decision = evaluate('publish', { actor: 'test', contentText: text });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('TT-AUTO-002');
  });

  it('granja de clics → bloqueado (TT-AUTO-003)', () => {
    const decision = evaluate('publish', {
      actor: 'test',
      contentText: 'Usamos una granja de dispositivos para vistas',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('TT-AUTO-003');
  });

  it('contenido legítimo no dispara ninguna regla', () => {
    const decision = evaluate('publish', { actor: 'test', contentText: 'Hoy les traigo 3 tips de skincare 🌿' });
    expect(decision.allowed).toBe(true);
    expect(decision.violatedRules).toHaveLength(0);
  });
});

describe('tiktokGuardian: mensajería de negocio solo como respuesta (TT-BIZ-001)', () => {
  it('sin que el usuario haya escrito primero → bloqueado', () => {
    const decision = evaluate('business_dm_reply', {
      actor: 'test',
      targetTikTokUserId: 'u1',
      userInitiatedContact: false,
      contentText: 'Hola! Te escribimos para contarte de nuestros productos',
    });
    expect(decision.allowed).toBe(false);
    expect(decision.violatedRules.map((r) => r.code)).toContain('TT-BIZ-001');
  });

  it('sin ID de destinatario verificable → bloqueado', () => {
    const decision = evaluate('business_dm_reply', { actor: 'test', userInitiatedContact: true, contentText: 'Hola!' });
    expect(decision.allowed).toBe(false);
  });

  it('respuesta a alguien que escribió primero, con ID → permitido', () => {
    const decision = evaluate('business_dm_reply', {
      actor: 'test',
      targetTikTokUserId: 'u1',
      userInitiatedContact: true,
      contentText: 'Claro! Te paso el catálogo.',
    });
    expect(decision.allowed).toBe(true);
  });
});

describe('tiktokGuardian: rate limiting', () => {
  it('respeta el límite de business_dm_reply y se recupera al limpiar el store', () => {
    const ctx = { actor: 'test', targetTikTokUserId: 'u2', userInitiatedContact: true, contentText: 'ok' };
    for (let i = 0; i < 20; i++) recordSuccess('business_dm_reply', ctx);
    const decision = evaluate('business_dm_reply', ctx);
    expect(decision.allowed).toBe(false);
    expect(decision.rateLimit.allowed).toBe(false);

    configureRateLimitStore(null);
    expect(evaluate('business_dm_reply', ctx).allowed).toBe(true);
  });

  it('live_moderate tiene límite alto (pensado para volumen de chat en vivo)', () => {
    const decision = evaluate('live_moderate', { actor: 'test' });
    expect(decision.allowed).toBe(true);
    expect(decision.rateLimit.limit).toBeGreaterThanOrEqual(500);
  });
});

describe('tiktokGuardian: riskScore', () => {
  it('una violación crítica sube el riskScore por encima de 0', () => {
    const decision = evaluate('publish', { actor: 'test', contentText: 'comprar 1000 seguidores' });
    expect(decision.riskScore).toBeGreaterThan(0);
  });

  it('sin violaciones ni rate limit excedido, riskScore es 0', () => {
    const decision = evaluate('publish', { actor: 'test', contentText: 'contenido normal' });
    expect(decision.riskScore).toBe(0);
  });
});
