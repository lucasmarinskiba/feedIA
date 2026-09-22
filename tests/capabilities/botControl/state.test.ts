import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  configureBotControlStore,
  getBotControlSnapshot,
  getMasterState,
  isAnyBotEnabled,
  isBotEnabled,
  setAllBots,
  setBotEnabled,
  shouldRunJob,
} from '../../../src/capabilities/botControl/state.js';
import { BOT_IDS, type BotId } from '../../../src/capabilities/botControl/registry.js';

let dir: string;
let file: string;

/** Simula reiniciar el proceso: se descarta toda memoria y se relee el mismo archivo. */
const restart = (): void => configureBotControlStore(file);
const enabledIds = (): BotId[] =>
  getBotControlSnapshot()
    .bots.filter((b) => b.enabled)
    .map((b) => b.id);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bot-control-'));
  file = join(dir, 'bot-control.json');
  configureBotControlStore(file);
});

afterEach(() => {
  configureBotControlStore(null);
  rmSync(dir, { recursive: true, force: true });
});

describe('estado inicial', () => {
  it('sin archivo rigen los defaults: todo prendido (se preserva el comportamiento previo) y no se crea nada por leer', () => {
    expect(getMasterState()).toEqual({ state: 'all-on', enabled: BOT_IDS.length, total: BOT_IDS.length });
    expect(enabledIds()).toEqual([...BOT_IDS]);
    expect(existsSync(file)).toBe(false);
  });
});

describe('interruptor por bot', () => {
  it('apagar uno deja el resto y el maestro pasa a parcial', () => {
    setBotEnabled('tiktok-bot', false);
    expect(isBotEnabled('tiktok-bot')).toBe(false);
    expect(isBotEnabled('comment-bot')).toBe(true);
    expect(getMasterState().state).toBe('partial');
  });

  it('el cambio persiste y sobrevive a un reinicio', () => {
    setBotEnabled('ads-bot', false);
    restart();
    expect(isBotEnabled('ads-bot')).toBe(false);
    expect(isBotEnabled('dm-bot')).toBe(true);
  });

  it('la escritura es atómica: no queda archivo temporal', () => {
    setBotEnabled('ads-bot', false);
    expect(existsSync(`${file}.tmp`)).toBe(false);
    expect(() => JSON.parse(readFileSync(file, 'utf-8'))).not.toThrow();
  });

  it('un bot inexistente lanza (no se corrompe el estado)', () => {
    expect(() => setBotEnabled('no-existe' as BotId, false)).toThrow();
    expect(existsSync(file)).toBe(false);
  });
});

describe('botón maestro', () => {
  it('apagar el maestro apaga TODOS los bots', () => {
    setAllBots(false);
    expect(getMasterState()).toEqual({ state: 'all-off', enabled: 0, total: BOT_IDS.length });
    for (const id of BOT_IDS) expect(isBotEnabled(id)).toBe(false);
  });

  it('con el maestro apagado se puede reactivar UN bot y los demás siguen apagados (no es una compuerta)', () => {
    setAllBots(false);
    setBotEnabled('comment-bot', true);
    expect(enabledIds()).toEqual(['comment-bot']);
    expect(getMasterState().state).toBe('partial');
    expect(shouldRunJob('bot-poll').run).toBe(true); // el job de ese bot corre
    expect(shouldRunJob('cmo-daily-cycle').run).toBe(false); // el resto no
  });

  it('encender el maestro restaura exactamente los que estaban prendidos antes de apagarlo', () => {
    setBotEnabled('tiktok-bot', false); // el usuario ya había apagado TikTok
    setBotEnabled('ads-bot', false);
    setAllBots(false);
    setAllBots(true);

    expect(isBotEnabled('tiktok-bot')).toBe(false); // NO se prende de golpe lo que estaba apagado (prender = gasto)
    expect(isBotEnabled('ads-bot')).toBe(false);
    expect(enabledIds()).toEqual(BOT_IDS.filter((id) => id !== 'tiktok-bot' && id !== 'ads-bot'));
  });

  it('lo reactivado a mano mientras el maestro estaba apagado se conserva al volver a encenderlo', () => {
    setBotEnabled('tiktok-bot', false);
    setAllBots(false);
    setBotEnabled('tiktok-bot', true); // decisión explícita del usuario
    setAllBots(true);
    expect(isBotEnabled('tiktok-bot')).toBe(true);
    expect(getMasterState().state).toBe('all-on');
  });

  it('apagar de nuevo desde un estado parcial (o doble clic) no pierde qué había antes', () => {
    setAllBots(false); // resume = todos
    setBotEnabled('dm-bot', true);
    setAllBots(false); // apagar otra vez: el historial original debe seguir
    setAllBots(true);
    expect(getMasterState().state).toBe('all-on');
  });

  it('sin historial, encender el maestro prende los bots por defecto', () => {
    setAllBots(true);
    expect(getMasterState().state).toBe('all-on');
  });

  it('el estado del maestro y el historial sobreviven a un reinicio', () => {
    setBotEnabled('ads-bot', false);
    setAllBots(false);
    restart();
    expect(getMasterState().state).toBe('all-off');
    setAllBots(true);
    expect(isBotEnabled('ads-bot')).toBe(false);
    expect(isBotEnabled('content-bot')).toBe(true);
  });
});

describe('shouldRunJob', () => {
  it('la infraestructura corre siempre, aunque esté todo apagado', () => {
    setAllBots(false);
    for (const job of ['calendar-dispatcher', 'instagram-publish-queue', 'cost-guardian-daily-check']) {
      expect(shouldRunJob(job)).toMatchObject({ run: true, bots: [] });
    }
  });

  it('un job corre si su bot está prendido y se corta si está apagado, con el motivo', () => {
    expect(shouldRunJob('cmo-daily-cycle').run).toBe(true);
    setBotEnabled('content-bot', false);
    const d = shouldRunJob('cmo-daily-cycle');
    expect(d.run).toBe(false);
    expect(d.reason).toMatch(/content-bot/);
  });

  it('un job compartido corre si ALGUNO de sus bots está prendido', () => {
    setBotEnabled('comment-bot', false);
    expect(shouldRunJob('bot-poll').run).toBe(true); // dm-bot sigue prendido
    setBotEnabled('dm-bot', false);
    expect(shouldRunJob('bot-poll').run).toBe(false);
  });

  it('un job desconocido queda gobernado por intelligence-bot', () => {
    expect(shouldRunJob('job-nuevo').run).toBe(true);
    setBotEnabled('intelligence-bot', false);
    expect(shouldRunJob('job-nuevo').run).toBe(false);
  });

  it('isAnyBotEnabled: lista vacía (infraestructura) → true; si no, alguno prendido', () => {
    expect(isAnyBotEnabled([])).toBe(true);
    setAllBots(false);
    expect(isAnyBotEnabled(['comment-bot', 'dm-bot'])).toBe(false);
    setBotEnabled('dm-bot', true);
    expect(isAnyBotEnabled(['comment-bot', 'dm-bot'])).toBe(true);
  });
});

describe('fail-safe ante archivo dañado', () => {
  it.each([
    ['JSON inválido', '{no es json'],
    ['versión desconocida', JSON.stringify({ version: 99, bots: {} })],
    ['estructura incorrecta', JSON.stringify({ version: 1, bots: 'x' })],
    ['null', 'null'],
  ])('%s → TODOS los bots apagados (se prioriza controlar el gasto) y se avisa', (_n, content) => {
    writeFileSync(file, content, 'utf-8');
    expect(getMasterState().state).toBe('all-off');
    expect(shouldRunJob('cmo-daily-cycle').run).toBe(false);
    expect(getBotControlSnapshot().corrupt).toBe(true);
    expect(shouldRunJob('calendar-dispatcher').run).toBe(true); // la infraestructura sigue
  });

  it('tocar UN bot sobre un archivo dañado no reactiva a los demás por accidente', () => {
    writeFileSync(file, '{roto', 'utf-8');
    setBotEnabled('comment-bot', true);
    expect(enabledIds()).toEqual(['comment-bot']);
    expect(getBotControlSnapshot().corrupt).toBe(false); // ya quedó reparado
  });

  it('el maestro sobre un archivo dañado también parte de "todo apagado"', () => {
    writeFileSync(file, '{roto', 'utf-8');
    setAllBots(true);
    expect(getMasterState().state).toBe('all-on'); // sin historial → defaults, decisión explícita del usuario
    expect(getBotControlSnapshot().corrupt).toBe(false);
  });

  it('ignora ids desconocidos y valores mal tipados dentro de un archivo válido', () => {
    writeFileSync(
      file,
      JSON.stringify({
        version: 1,
        bots: {
          'bot-fantasma': { enabled: false },
          'dm-bot': { enabled: 'no' },
          'ads-bot': { enabled: false, changedAt: 'x' },
        },
        resume: ['bot-fantasma', 'dm-bot'],
      }),
      'utf-8',
    );
    expect(isBotEnabled('ads-bot')).toBe(false);
    expect(isBotEnabled('dm-bot')).toBe(true); // valor inválido → default
    expect(getBotControlSnapshot().corrupt).toBe(false);
  });
});

describe('snapshot para la API', () => {
  it('incluye conteo de jobs por bot e infraestructura cuando se pasa la lista', () => {
    const snap = getBotControlSnapshot(['bot-poll', 'cm-inbox-tick', 'calendar-dispatcher', 'cmo-daily-cycle']);
    expect(snap.infraJobs).toBe(1);
    expect(snap.bots.find((b) => b.id === 'dm-bot')?.jobs).toBe(2);
    expect(snap.bots.find((b) => b.id === 'comment-bot')?.jobs).toBe(1);
    expect(snap.bots.find((b) => b.id === 'content-bot')?.jobs).toBe(1);
  });

  it('sin lista de jobs no inventa conteos', () => {
    const snap = getBotControlSnapshot();
    expect(snap.infraJobs).toBeUndefined();
    expect(snap.bots[0]?.jobs).toBeUndefined();
  });
});
