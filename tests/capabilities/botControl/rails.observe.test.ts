import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '../../../src/config/index.js';
import { evaluateRails } from '../../../src/capabilities/bot/safetyRails.js';
import type { UserContext } from '../../../src/capabilities/bot/conversationMemory.js';

const ctx = (over: Partial<UserContext> = {}): UserContext => ({
  userId: 'ana',
  handle: 'ana',
  channel: 'comentario',
  primerContacto: '',
  ultimoContacto: '',
  mensajesTotales: 0,
  autoRepliesEnviados: 0,
  autoRepliesPorDia: {},
  intentHistory: [],
  escaladoAHumano: false,
  notas: '',
  turnos: [],
  ...over,
});

const saved = { ...env.bot };

beforeEach(() => {
  env.bot.autoReplyEnabled = false; // el default: el bot "apagado"
  env.bot.quietHoursStart = 0; // 0-24: siempre en horario silencioso
  env.bot.quietHoursEnd = 24;
});

afterEach(() => {
  env.bot.autoReplyEnabled = saved.autoReplyEnabled;
  env.bot.quietHoursStart = saved.quietHoursStart;
  env.bot.quietHoursEnd = saved.quietHoursEnd;
});

describe('evaluateRails — modo observación (Comment Brain en suggest)', () => {
  it('sin observación, el interruptor maestro apagado y el horario silencioso BLOQUEAN (comportamiento de siempre)', () => {
    const d = evaluateRails(ctx(), 'hola, qué lindo');
    expect(d.permitir).toBe(false);
    expect(d.motivos).toEqual(expect.arrayContaining(['auto-reply-deshabilitado', 'horario-silencio']));
  });

  it('en observación NO aplican: no se envía nada, así que no hay a quién proteger', () => {
    const d = evaluateRails(ctx(), 'hola, qué lindo', { observeOnly: true });
    expect(d.permitir).toBe(true);
    expect(d.motivos).toEqual([]);
  });

  it('en observación siguen vigentes las reglas que protegen y ahorran gasto', () => {
    expect(evaluateRails(ctx({ escaladoAHumano: true }), 'hola', { observeOnly: true }).motivos).toContain(
      'usuario-escalado',
    );
    expect(evaluateRails(ctx(), 'voy a hablar con mi abogado', { observeOnly: true }).motivos).toContain('queja-grave');
    expect(evaluateRails(ctx(), 'te voy a matar', { observeOnly: true }).motivos).toContain('amenaza');
    expect(evaluateRails(ctx(), 'mi dni es 123', { observeOnly: true }).motivos).toContain(
      'datos-personales-detectados',
    );
  });

  it('el límite diario por usuario también sigue aplicando', () => {
    const today = new Date().toISOString().split('T')[0]!;
    const limit = env.bot.maxAutoRepliesPerUserPerDay;
    const d = evaluateRails(ctx({ autoRepliesPorDia: { [today]: limit } }), 'hola', { observeOnly: true });
    expect(d.motivos).toContain('limite-diario-usuario');
  });

  it('con el bot ENCENDIDO el modo observación no cambia nada', () => {
    env.bot.autoReplyEnabled = true;
    env.bot.quietHoursStart = 0;
    env.bot.quietHoursEnd = 0;
    expect(evaluateRails(ctx(), 'hola').permitir).toBe(true);
    expect(evaluateRails(ctx(), 'hola', { observeOnly: true }).permitir).toBe(true);
  });
});
