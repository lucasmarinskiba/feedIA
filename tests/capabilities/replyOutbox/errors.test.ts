import { describe, expect, it } from 'vitest';
import { classifySendFailure, type SendResult } from '../../../src/capabilities/replyOutbox/errors.js';

const MIN = 60_000;

describe('classifySendFailure', () => {
  const cases: Array<[string, SendResult, { kind: string; code: string; waitMs?: number }]> = [
    // Ritmo propio (compliance)
    [
      'espera entre acciones: usa los segundos del mensaje',
      { ok: false, error: 'Compliance: Debe esperar 12s entre acciones de tipo reply_comment (límite de seguridad)' },
      { kind: 'rate-limited', code: 'compliance-spacing', waitMs: 12_000 },
    ],
    [
      'tope por hora',
      { ok: false, error: 'Compliance: Límite de 30 acciones/hora alcanzado para reply_comment' },
      { kind: 'rate-limited', code: 'compliance-cap', waitMs: 5 * MIN },
    ],
    [
      'tope diario',
      { ok: false, error: 'Compliance: Límite diario de 200 acciones alcanzado para reply_comment' },
      { kind: 'rate-limited', code: 'compliance-cap' },
    ],
    // Rechazos de contenido: reintentar no cambia nada
    [
      'violación de contenido',
      { ok: false, error: 'Compliance: Violación ALTA de compliance: [CONT-003] promesa absoluta' },
      { kind: 'permanent', code: 'compliance-blocked' },
    ],
    [
      'GlassBox rechazado',
      { ok: false, error: 'Rechazado por supervisor' },
      { kind: 'permanent', code: 'compliance-blocked' },
    ],
    [
      'GlassBox timeout de aprobación',
      { ok: false, error: 'Timeout de aprobación (300000ms). Acción bloqueada.' },
      { kind: 'permanent', code: 'compliance-blocked' },
    ],
    // Estado del sistema: se pausa, no es culpa de la respuesta
    [
      'modo emergencia',
      { ok: false, error: 'Sistema en estado de emergencia. No se permiten respuestas.' },
      { kind: 'hold', code: 'emergency', waitMs: MIN },
    ],
    [
      'términos sin aceptar',
      { ok: false, error: 'Términos de compliance no aceptados. Ver TERMS_OF_SERVICE.md' },
      { kind: 'hold', code: 'terms-not-accepted' },
    ],
    [
      'GlassBox en pausa',
      { ok: false, error: 'GlassBox está en modo PAUSADO. La acción fue encolada.' },
      { kind: 'hold', code: 'glassbox-paused' },
    ],
    // Códigos de Meta
    [
      'token vencido',
      { ok: false, error: 'Invalid OAuth access token', code: '190/463/OAuthException' },
      { kind: 'hold', code: 'auth' },
    ],
    [
      'límite de Meta',
      { ok: false, error: 'Application request limit reached', code: '4/2207051/OAuthException' },
      { kind: 'rate-limited', code: 'meta-rate-limit', waitMs: 15 * MIN },
    ],
    [
      'Meta bloqueó la acción',
      { ok: false, error: 'Action blocked', code: '368/1390008/OAuthException' },
      { kind: 'hold', code: 'action-blocked', waitMs: 60 * MIN },
    ],
    [
      'permisos',
      { ok: false, error: 'permission denied', code: '10/GraphMethodException' },
      { kind: 'hold', code: 'permissions' },
    ],
    [
      'permisos (serie 200)',
      { ok: false, error: '(#200) requires permission', code: '200/OAuthException' },
      { kind: 'hold', code: 'permissions' },
    ],
    [
      'comentario borrado',
      { ok: false, error: 'Object does not exist', code: '100/33/GraphMethodException' },
      { kind: 'permanent', code: 'comment-unavailable' },
    ],
    [
      'parámetro inválido',
      { ok: false, error: 'Invalid parameter', code: '100/1234/OAuthException' },
      { kind: 'permanent', code: 'invalid-request' },
    ],
    [
      'error temporal de Meta',
      { ok: false, error: 'An unknown error occurred', code: '2/GraphMethodException' },
      { kind: 'transient', code: 'meta-temporary' },
    ],
    // HTTP
    ['429', { ok: false, error: 'Too Many Requests', status: 429 }, { kind: 'rate-limited', code: 'http-429' }],
    ['503', { ok: false, error: 'Service Unavailable', status: 503 }, { kind: 'transient', code: 'http-503' }],
    [
      'status 0 (sin respuesta)',
      { ok: false, error: 'fetch failed', status: 0 },
      { kind: 'transient', code: 'http-0' },
    ],
    ['404', { ok: false, error: 'Not Found', status: 404 }, { kind: 'permanent', code: 'http-404' }],
    // Solo texto
    ['red', { ok: false, error: 'fetch failed' }, { kind: 'transient', code: 'network' }],
    ['timeout de socket', { ok: false, error: 'ETIMEDOUT' }, { kind: 'transient', code: 'network' }],
    [
      'comentario inexistente (solo texto)',
      { ok: false, error: 'Unsupported post request. Object does not exist' },
      { kind: 'permanent', code: 'comment-unavailable' },
    ],
    [
      'token (solo texto)',
      { ok: false, error: 'Error validating access token: session has expired' },
      { kind: 'hold', code: 'auth' },
    ],
    // Desconocido: se reintenta, pero acotado por intentos
    ['desconocido', { ok: false, error: 'algo raro pasó' }, { kind: 'transient', code: 'unknown' }],
    ['sin detalle', { ok: false }, { kind: 'transient', code: 'unknown' }],
  ];

  it.each(cases)('%s', (_name, result, expected) => {
    expect(classifySendFailure(result)).toMatchObject(expected);
  });

  it('lo estructurado (código de Meta) manda sobre el texto', () => {
    const r = classifySendFailure({ ok: false, error: 'Debe esperar 5s', code: '190/OAuthException' });
    expect(r).toMatchObject({ kind: 'hold', code: 'auth' });
  });

  it('el mensaje se recorta: un cuerpo de error enorme no infla el log', () => {
    const r = classifySendFailure({ ok: false, error: 'x'.repeat(5000) });
    expect(r.message.length).toBe(500);
  });
});
