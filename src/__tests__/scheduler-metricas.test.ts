import { describe, it, expect } from 'vitest';
import {
  construirVistaJobs,
  describirCron,
  resumirScheduler,
  siguienteEjecucion,
  validarExpresionCron,
  type JobBase,
  type RegistroEjecucion,
} from '../capabilities/executive/schedulerMetricas.js';

const AHORA = new Date('2026-10-04T13:00:00.000Z');

const jobs: JobBase[] = [
  { name: 'digest-diario', description: 'Digest', defaultCron: '0 9 * * *' },
  { name: 'bot-poll', description: 'Bot', defaultCron: '*/5 * * * *' },
  { name: 'ugc-expirar', description: 'UGC', defaultCron: '0 */2 * * *' },
];

describe('describirCron', () => {
  it('describe patrones comunes en español', () => {
    expect(describirCron('*/15 * * * *')).toBe('Cada 15 minutos');
    expect(describirCron('0 9 * * *')).toBe('Todos los días a las 09:00');
    expect(describirCron('30 8 * * 1-5')).toBe('De lunes a viernes a las 08:30');
    expect(describirCron('0 */2 * * *')).toBe('Cada 2 horas');
    expect(describirCron('0 9 * * 1')).toBe('Cada lunes a las 09:00');
    expect(describirCron('0 7,15 * * *')).toBe('Todos los días a las 07:00 y 15:00');
  });

  it('marca como personalizada una expresión que no tiene forma común', () => {
    expect(describirCron('15 10 1,15 * *')).toBe('Horario personalizado');
  });

  it('informa expresiones inválidas', () => {
    expect(describirCron('no es cron')).toBe('Expresión inválida');
  });
});

describe('siguienteEjecucion', () => {
  it('calcula la próxima hora diaria en la zona de la marca', () => {
    const proxima = siguienteEjecucion(
      '0 9 * * *',
      new Date('2026-10-04T10:00:00-03:00'),
      'America/Argentina/Buenos_Aires',
    );
    expect(proxima?.toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });

  it('respeta el día de la semana', () => {
    const proxima = siguienteEjecucion(
      '0 9 * * 1',
      new Date('2026-10-04T10:00:00-03:00'),
      'America/Argentina/Buenos_Aires',
    );
    expect(proxima?.toISOString()).toBe('2026-10-05T12:00:00.000Z');
  });

  it('avanza en intervalos de minutos', () => {
    const proxima = siguienteEjecucion('*/15 * * * *', new Date('2026-10-04T12:07:00.000Z'), 'UTC');
    expect(proxima?.toISOString()).toBe('2026-10-04T12:15:00.000Z');
  });

  it('devuelve null si la expresión no se cumple en la semana siguiente', () => {
    expect(siguienteEjecucion('0 0 31 2 *', AHORA, 'UTC')).toBeNull();
  });

  it('devuelve null para expresiones inválidas', () => {
    expect(siguienteEjecucion('hola', AHORA, 'UTC')).toBeNull();
  });
});

describe('construirVistaJobs', () => {
  const historial: RegistroEjecucion[] = [
    { name: 'digest-diario', startedAt: '2026-10-04T12:00:00.000Z', durationMs: 900, ok: true },
    { name: 'bot-poll', startedAt: '2026-10-04T11:00:00.000Z', durationMs: 120, ok: false, error: 'timeout' },
    { name: 'bot-poll', startedAt: '2026-09-01T11:00:00.000Z', durationMs: 120, ok: true },
  ];

  it('marca pausados los jobs deshabilitados y no les calcula próxima ejecución', () => {
    const vistas = construirVistaJobs(
      jobs,
      [{ name: 'digest-diario', cron: '0 9 * * *', enabled: false }],
      [],
      AHORA,
      'UTC',
    );
    const digest = vistas.find((v) => v.nombre === 'digest-diario');
    expect(digest?.estado).toBe('pausado');
    expect(digest?.proximaEjecucion).toBeNull();
    expect(digest?.personalizado).toBe(true);
  });

  it('distingue éxito, error y falta de ejecuciones', () => {
    const vistas = construirVistaJobs(jobs, [], historial, AHORA, 'UTC');
    expect(vistas.find((v) => v.nombre === 'digest-diario')?.estado).toBe('activo');
    expect(vistas.find((v) => v.nombre === 'bot-poll')?.estado).toBe('con-error');
    expect(vistas.find((v) => v.nombre === 'ugc-expirar')?.estado).toBe('sin-ejecuciones');
  });

  it('cuenta ejecuciones y errores de las últimas 24 horas', () => {
    const bot = construirVistaJobs(jobs, [], historial, AHORA, 'UTC').find((v) => v.nombre === 'bot-poll');
    expect(bot?.ejecuciones24h).toBe(1);
    expect(bot?.errores24h).toBe(1);
    expect(bot?.ultimaEjecucion?.error).toBe('timeout');
  });

  it('usa el horario personalizado cuando hay override', () => {
    const vistas = construirVistaJobs(
      jobs,
      [{ name: 'bot-poll', cron: '*/30 * * * *', enabled: true }],
      [],
      AHORA,
      'UTC',
    );
    const bot = vistas.find((v) => v.nombre === 'bot-poll');
    expect(bot?.cronEfectivo).toBe('*/30 * * * *');
    expect(bot?.cronDefault).toBe('*/5 * * * *');
    expect(bot?.cronLegible).toBe('Cada 30 minutos');
  });
});

describe('resumirScheduler', () => {
  it('suma activos, pausados, errores y la próxima ejecución más cercana', () => {
    const vistas = construirVistaJobs(
      jobs,
      [{ name: 'ugc-expirar', cron: '0 */2 * * *', enabled: false }],
      [{ name: 'bot-poll', startedAt: '2026-10-04T12:30:00.000Z', durationMs: 1, ok: false }],
      AHORA,
      'UTC',
    );
    const resumen = resumirScheduler(vistas);
    expect(resumen.total).toBe(3);
    expect(resumen.pausados).toBe(1);
    expect(resumen.activos).toBe(2);
    expect(resumen.conError).toBe(1);
    expect(resumen.errores24h).toBe(1);
    expect(resumen.proximaEjecucion).toBe('2026-10-04T13:05:00.000Z');
  });
});

describe('validarExpresionCron', () => {
  it('acepta expresiones válidas y devuelve el texto limpio', () => {
    expect(validarExpresionCron('  */5 * * * *  ')).toEqual({ ok: true, valor: '*/5 * * * *' });
  });

  it('rechaza texto no válido y expresiones vacías', () => {
    expect(validarExpresionCron('hola').ok).toBe(false);
    expect(validarExpresionCron('').ok).toBe(false);
    expect(validarExpresionCron(42).ok).toBe(false);
  });
});
