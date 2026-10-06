import { describe, it, expect } from 'vitest';
import {
  momentoDeIso,
  movimientosOptimizar,
  movimientosReprogramar,
  planificarSlots,
  proximaOcurrencia,
} from '../capabilities/executive/herramientasPlanificacion.js';

const HORA = 3_600_000;
const DIA = 86_400_000;
// Lunes 5 de octubre de 2026, 09:00 en Buenos Aires (12:00 UTC).
const DESDE = Date.UTC(2026, 9, 5, 12, 0, 0);

describe('proximaOcurrencia (hora de Buenos Aires, UTC-3)', () => {
  it('usa la misma fecha si la hora todavía no pasó', () => {
    expect(proximaOcurrencia('lunes', 18, DESDE)).toBe('2026-10-05T21:00:00.000Z');
  });

  it('pasa a la semana siguiente si la hora ya pasó', () => {
    expect(proximaOcurrencia('lunes', 8, DESDE)).toBe('2026-10-12T11:00:00.000Z');
  });

  it('devuelve null con un día o una hora inválidos', () => {
    expect(proximaOcurrencia('funes', 18, DESDE)).toBeNull();
    expect(proximaOcurrencia('lunes', 25, DESDE)).toBeNull();
  });

  it('cruza la medianoche UTC sin cambiar el día local', () => {
    // Miércoles 7 de octubre a las 21:00 de Buenos Aires = jueves 8 de octubre 00:00 UTC.
    expect(proximaOcurrencia('miércoles', 21, DESDE)).toBe('2026-10-08T00:00:00.000Z');
  });
});

describe('momentoDeIso', () => {
  it('traduce un instante ISO a día y franja de Buenos Aires', () => {
    expect(momentoDeIso('2026-10-05T21:00:00.000Z')).toEqual({ dia: 'lunes', franja: 'tarde' });
    expect(momentoDeIso('no es fecha')).toBeNull();
  });
});

describe('planificarSlots', () => {
  it('reparte las publicaciones sin repetir un mismo instante', () => {
    const slots = planificarSlots({
      semanas: 2,
      porSemana: 3,
      momentos: [
        { dia: 'lunes', franja: 'tarde' },
        { dia: 'miércoles', franja: 'mañana' },
      ],
      desdeMs: DESDE,
    });
    expect(slots).toHaveLength(6);
    expect(slots.every((s) => s !== null)).toBe(true);
    expect(new Set(slots).size).toBe(6);
  });

  it('sin historial usa tardes distribuidas por la semana', () => {
    const slots = planificarSlots({ semanas: 1, porSemana: 3, momentos: [], desdeMs: DESDE });
    expect(slots.filter((s) => s !== null)).toHaveLength(3);
    for (const s of slots) expect(momentoDeIso(s ?? '')?.franja).toBe('tarde');
  });
});

describe('movimientosOptimizar', () => {
  const momentos = [{ dia: 'lunes', franja: 'tarde' }];

  it('mueve una pieza fuera de los mejores horarios a uno de ellos', () => {
    const movimientos = movimientosOptimizar(
      [
        {
          id: 'p1',
          plataforma: 'instagram',
          caption: 'Mañana',
          status: 'scheduled',
          scheduledAt: '2026-10-06T13:00:00.000Z',
        },
      ],
      momentos,
      DESDE,
      14,
    );
    expect(movimientos).toHaveLength(1);
    expect(momentoDeIso(movimientos[0]?.propuesto ?? '')).toEqual({ dia: 'lunes', franja: 'tarde' });
  });

  it('no mueve una pieza que ya está en un mejor horario', () => {
    const movimientos = movimientosOptimizar(
      [
        {
          id: 'p1',
          plataforma: 'instagram',
          caption: 'Ya bien',
          status: 'scheduled',
          scheduledAt: '2026-10-05T21:00:00.000Z',
        },
      ],
      momentos,
      DESDE,
      14,
    );
    expect(movimientos).toEqual([]);
  });

  it('no propone un hueco ya ocupado por otra pieza programada', () => {
    const ocupado = proximaOcurrencia('lunes', 18, DESDE) ?? '';
    const movimientos = movimientosOptimizar(
      [
        { id: 'otra', plataforma: 'instagram', caption: 'x', status: 'scheduled', scheduledAt: ocupado },
        { id: 'p1', plataforma: 'tiktok', caption: 'y', status: 'draft', scheduledAt: null },
      ],
      momentos,
      DESDE,
      14,
    );
    expect(movimientos.every((m) => m.propuesto !== ocupado)).toBe(true);
  });
});

describe('movimientosReprogramar', () => {
  it('reubica solo las piezas programadas que ya vencieron', () => {
    const movimientos = movimientosReprogramar(
      [
        {
          id: 'vencida',
          plataforma: 'instagram',
          caption: 'Quedó',
          status: 'scheduled',
          scheduledAt: new Date(DESDE - 2 * DIA).toISOString(),
        },
        {
          id: 'futura',
          plataforma: 'instagram',
          caption: 'Sigue',
          status: 'scheduled',
          scheduledAt: new Date(DESDE + DIA).toISOString(),
        },
        { id: 'borrador', plataforma: 'tiktok', caption: 'Borrador', status: 'draft', scheduledAt: null },
      ],
      [{ dia: 'lunes', franja: 'tarde' }],
      DESDE,
      14,
    );
    expect(movimientos.map((m) => m.postId)).toEqual(['vencida']);
    expect(Date.parse(movimientos[0]?.propuesto ?? '')).toBeGreaterThan(DESDE);
  });
});

describe('zona horaria sin cambio de hora', () => {
  it('el desfase de Buenos Aires es fijo: 3 horas', () => {
    const iso = proximaOcurrencia('martes', 10, DESDE) ?? '';
    expect(Date.parse(iso) % DIA).toBe(13 * HORA);
  });
});
