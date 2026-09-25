/**
 * ejecutarPasosListos() envía DMs reales vía sendDm() (API legítima) para
 * secuencias de nurture, pero los pasos posteriores al primero se diseñan
 * espaciados por días (ver sequences.ts) sin que el guardian chequeara la
 * ventana de 24h de la Instagram Messaging API (INT-005, documentada pero
 * no aplicada). Ahora el guardian bloquea el envío si no hay interacción
 * verificable del usuario dentro de las últimas 24h, y este paso se difiere
 * en vez de intentar un envío que Meta rechazaría igual.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/integrations/meta.js', () => ({
  sendDm: vi.fn(async () => ({ ok: true })),
}));

vi.mock('../../../src/capabilities/nurture/sequences.js', () => ({
  enrollmentsListos: vi.fn(),
  avanzarPaso: vi.fn(),
}));

import { sendDm } from '../../../src/integrations/meta.js';
import { enrollmentsListos, avanzarPaso } from '../../../src/capabilities/nurture/sequences.js';
import { ejecutarPasosListos } from '../../../src/capabilities/nurture/runner.js';
import { configureRateLimitStore } from '../../../src/compliance/rateLimiter.js';

const mockedSendDm = vi.mocked(sendDm);
const mockedEnrollmentsListos = vi.mocked(enrollmentsListos);
const mockedAvanzarPaso = vi.mocked(avanzarPaso);

beforeEach(() => {
  configureRateLimitStore(null);
  mockedSendDm.mockClear();
  mockedAvanzarPaso.mockClear();
});

const paso = {
  ordenDia: 3,
  asunto: 'seguimiento',
  mensaje: 'Che, ¿viste el recurso?',
  esperaSegundos: 0,
  condicionAvance: 'siempre' as const,
};
const sequence = {
  id: 'seq-1',
  trigger: 'nuevo-seguidor' as const,
  nombre: 'Bienvenida',
  pasos: [paso],
  creadoEn: '2026-01-01T00:00:00.000Z',
};

describe('ejecutarPasosListos: ventana de 24h (INT-005)', () => {
  it('paso 0 (inmediato al trigger) sí envía, usando inscritoEn como última interacción', async () => {
    mockedEnrollmentsListos.mockReturnValue([
      {
        enrollment: {
          enrollmentId: 'e1',
          sequenceId: 'seq-1',
          igUserId: 'u1',
          pasoActual: 0,
          inscritoEn: new Date().toISOString(),
          proximoEnvioEn: new Date().toISOString(),
          status: 'activo',
        },
        paso,
        sequence,
      },
    ]);
    const results = await ejecutarPasosListos();
    expect(results[0]?.enviado).toBe(true);
    expect(mockedSendDm).toHaveBeenCalledWith('u1', expect.any(String));
  });

  it('paso >0 sin respuesta del usuario en el medio → se difiere, nunca llama sendDm', async () => {
    mockedEnrollmentsListos.mockReturnValue([
      {
        enrollment: {
          enrollmentId: 'e2',
          sequenceId: 'seq-1',
          igUserId: 'u2',
          pasoActual: 1,
          inscritoEn: new Date(Date.now() - 5 * 86400000).toISOString(),
          proximoEnvioEn: new Date().toISOString(),
          status: 'activo',
        },
        paso,
        sequence,
      },
    ]);
    const results = await ejecutarPasosListos();
    expect(results[0]?.enviado).toBe(false);
    expect(results[0]?.error).toMatch(/Compliance/i);
    expect(mockedSendDm).not.toHaveBeenCalled();
    expect(mockedAvanzarPaso).not.toHaveBeenCalled();
  });

  it('paso >0 con respuesta reciente del usuario (ultimaInteraccion <24h) → sí envía', async () => {
    mockedEnrollmentsListos.mockReturnValue([
      {
        enrollment: {
          enrollmentId: 'e3',
          sequenceId: 'seq-1',
          igUserId: 'u3',
          pasoActual: 1,
          inscritoEn: new Date(Date.now() - 5 * 86400000).toISOString(),
          proximoEnvioEn: new Date().toISOString(),
          status: 'activo',
          ultimaInteraccion: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        },
        paso,
        sequence,
      },
    ]);
    const results = await ejecutarPasosListos();
    expect(results[0]?.enviado).toBe(true);
    expect(mockedSendDm).toHaveBeenCalledWith('u3', expect.any(String));
  });
});
