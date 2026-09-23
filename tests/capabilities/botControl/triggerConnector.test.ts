import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Handler = (event: { payload: Record<string, unknown> }) => Promise<void> | void;
const handlers = new Map<string, Handler>();

vi.mock('../../../src/agent/bus.js', () => ({
  on: vi.fn((type: string, h: Handler) => {
    handlers.set(type, h);
    return () => handlers.delete(type);
  }),
}));
vi.mock('../../../src/agent/agentTriggers.js', () => ({ handleEvent: vi.fn(async () => undefined) }));

import { handleEvent } from '../../../src/agent/agentTriggers.js';
import { startTriggerConnector, stopTriggerConnector } from '../../../src/agent/triggerConnector.js';
import { configureBotControlStore, setAllBots, setBotEnabled } from '../../../src/capabilities/botControl/state.js';
import { makeBrand } from '../commentBrain/helpers.js';

const fire = (type: string): Promise<void> | void => handlers.get(type)?.({ payload: { x: 1 } });

beforeEach(() => {
  configureBotControlStore(null);
  handlers.clear();
  vi.mocked(handleEvent).mockClear();
  startTriggerConnector(makeBrand());
});

afterEach(() => {
  stopTriggerConnector();
  configureBotControlStore(null);
});

describe('triggerConnector + Bot Control', () => {
  it('con los bots prendidos los eventos despiertan a los agentes (comportamiento de siempre)', async () => {
    await fire('inbound_message_received');
    await fire('anomaly_detected');
    expect(handleEvent).toHaveBeenCalledTimes(2);
  });

  it('un mensaje entrante NO despierta agentes (LLM) si los bots de mensajes están apagados', async () => {
    setBotEnabled('comment-bot', false);
    setBotEnabled('dm-bot', false);
    await fire('inbound_message_received');
    expect(handleEvent).not.toHaveBeenCalled();
  });

  it('alcanza con que UNO de los bots que atienden el evento esté prendido', async () => {
    setBotEnabled('comment-bot', false);
    await fire('inbound_message_received');
    expect(handleEvent).toHaveBeenCalledTimes(1);
  });

  it('los eventos analíticos dependen del bot de inteligencia, no de los de mensajes', async () => {
    setBotEnabled('brain-bot', false);
    await fire('anomaly_detected');
    await fire('trend_detected');
    expect(handleEvent).not.toHaveBeenCalled();
    await fire('inbound_message_received'); // los bots de mensajes siguen prendidos
    expect(handleEvent).toHaveBeenCalledTimes(1);
  });

  it('con el maestro apagado no se despierta ningún agente, y reactivar uno solo lo habilita', async () => {
    setAllBots(false);
    await fire('inbound_message_received');
    await fire('scheduler_weekly');
    expect(handleEvent).not.toHaveBeenCalled();

    setBotEnabled('dm-bot', true);
    await fire('inbound_message_received');
    expect(handleEvent).toHaveBeenCalledTimes(1);
  });
});
