import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// runner.ts importa el catálogo completo de jobs y notificaciones: acá solo interesa el guard.
vi.mock('../../../src/scheduler/jobs.js', () => ({ jobs: [], findJob: vi.fn() }));
vi.mock('../../../src/integrations/notifications.js', () => ({ sendAlert: vi.fn() }));

import { configureBotControlStore, setAllBots, setBotEnabled } from '../../../src/capabilities/botControl/state.js';
import { fireScheduledJob } from '../../../src/scheduler/runner.js';
import type { JobDefinition } from '../../../src/scheduler/jobs.js';
import { makeBrand } from '../commentBrain/helpers.js';

const job = (name: string): JobDefinition =>
  ({ name, description: name, defaultCron: '* * * * *', handler: vi.fn() }) as unknown as JobDefinition;

beforeEach(() => configureBotControlStore(null));
afterEach(() => configureBotControlStore(null));

describe('fireScheduledJob — guard del cron', () => {
  it('con el bot prendido, el job corre', () => {
    const run = vi.fn(async () => undefined);
    expect(fireScheduledJob(job('cmo-daily-cycle'), makeBrand(), run)).toBe(true);
    expect(run).toHaveBeenCalledTimes(1);
  });

  it('con el bot apagado, el job NO corre: cero gasto (ni se llama al handler)', () => {
    setBotEnabled('content-bot', false);
    const j = job('cmo-daily-cycle');
    const run = vi.fn(async () => undefined);
    expect(fireScheduledJob(j, makeBrand(), run)).toBe(false);
    expect(run).not.toHaveBeenCalled();
    expect(j.handler).not.toHaveBeenCalled();
  });

  it('el cambio surte efecto al instante, sin reiniciar el scheduler', () => {
    const run = vi.fn(async () => undefined);
    const j = job('cmo-daily-cycle');
    fireScheduledJob(j, makeBrand(), run);
    setBotEnabled('content-bot', false);
    fireScheduledJob(j, makeBrand(), run);
    setBotEnabled('content-bot', true);
    fireScheduledJob(j, makeBrand(), run);
    expect(run).toHaveBeenCalledTimes(2); // 1º y 3º; el 2º estaba apagado
  });

  it('con TODO apagado, la infraestructura sigue corriendo (posts programados, control del gasto)', () => {
    setAllBots(false);
    const run = vi.fn(async () => undefined);
    expect(fireScheduledJob(job('calendar-dispatcher'), makeBrand(), run)).toBe(true);
    expect(fireScheduledJob(job('cost-guardian-daily-check'), makeBrand(), run)).toBe(true);
    expect(fireScheduledJob(job('cmo-daily-cycle'), makeBrand(), run)).toBe(false);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('con el maestro apagado se puede reactivar un solo bot y solo corren sus jobs', () => {
    setAllBots(false);
    setBotEnabled('tiktok-bot', true);
    const run = vi.fn(async () => undefined);
    expect(fireScheduledJob(job('tiktok-trend-scout'), makeBrand(), run)).toBe(true);
    expect(fireScheduledJob(job('cu-morning-routine'), makeBrand(), run)).toBe(false);
    expect(fireScheduledJob(job('cmo-daily-cycle'), makeBrand(), run)).toBe(false);
  });

  it('un job que falla no rompe el cron ni deja un rechazo sin manejar', async () => {
    const run = vi.fn(async () => {
      throw new Error('boom');
    });
    expect(() => fireScheduledJob(job('cmo-daily-cycle'), makeBrand(), run)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0)); // deja correr el catch interno; si quedara sin manejar, vitest falla el archivo
    expect(run).toHaveBeenCalledTimes(1);
  });
});
