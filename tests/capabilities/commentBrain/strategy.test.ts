import { describe, expect, it } from 'vitest';
import { decidePlan } from '../../../src/capabilities/commentBrain/strategy.js';
import type { BrainConfig } from '../../../src/capabilities/commentBrain/types.js';
import { BALANCED, cls } from './helpers.js';

const plan = (
  c: Parameters<typeof decidePlan>[0],
  cfg: BrainConfig = BALANCED,
  sensitiveTopic = false,
): ReturnType<typeof decidePlan> => decidePlan(c, cfg, { sensitiveTopic });

describe('decidePlan — sarcasmo', () => {
  it('playful en banter → contraataque ingenioso, automático', () => {
    const p = plan(cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' } }));
    expect(p).toMatchObject({ action: 'reply', mode: 'witty-comeback' });
  });

  it('playful en crítica liviana → contraataque ingenioso', () => {
    const p = plan(cls({ kind: 'criticism', sarcasm: { present: true, stance: 'playful' } }));
    expect(p).toMatchObject({ action: 'reply', mode: 'witty-comeback' });
  });

  it('critical sobre un reclamo → empatía, sin humor, y lo revisa una persona', () => {
    const p = plan(cls({ kind: 'complaint', sarcasm: { present: true, stance: 'critical' }, risk: 'medium' }));
    expect(p).toMatchObject({ action: 'draft-for-review', mode: 'empathize-resolve' });
  });

  it('critical sobre una crítica de bajo riesgo → reconoce la crítica (nunca witty)', () => {
    const p = plan(cls({ kind: 'criticism', sarcasm: { present: true, stance: 'critical' } }));
    expect(p).toMatchObject({ action: 'reply', mode: 'acknowledge-critique' });
  });

  it('sarcasmo critical disfrazado de elogio NO se trata como chiste', () => {
    const p = plan(cls({ kind: 'praise', sarcasm: { present: true, stance: 'critical' } }));
    expect(p.mode).toBe('acknowledge-critique');
  });

  it('hostile de baja hostilidad → se ignora', () => {
    const p = plan(cls({ kind: 'troll', sarcasm: { present: true, stance: 'hostile' }, hostility: 0.5 }));
    expect(p.action).toBe('ignore');
  });

  it('hostile de alta hostilidad → moderación humana', () => {
    const p = plan(cls({ kind: 'criticism', sarcasm: { present: true, stance: 'hostile' }, hostility: 0.85 }));
    expect(p.action).toBe('escalate');
  });

  it('humor con confianza entre el umbral general y el de humor → borrador', () => {
    const p = plan(cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' }, confidence: 0.72 }));
    expect(p.action).toBe('draft-for-review');
    expect(p.reasons.join(' ')).toMatch(/humor exige/);
  });

  it('humor en tema sensible nunca sale solo', () => {
    const p = plan(cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' } }), BALANCED, true);
    expect(p.action).toBe('draft-for-review');
    expect(p.reasons.join(' ')).toMatch(/tema sensible/);
  });

  it('un elogio en tema sensible sí puede agradecerse (no es humor)', () => {
    const p = plan(cls({ kind: 'praise' }), BALANCED, true);
    expect(p).toMatchObject({ action: 'reply', mode: 'thank' });
  });
});

describe('decidePlan — tipos de comentario', () => {
  it.each([
    ['praise', 'thank'],
    ['question', 'answer'],
    ['purchase-intent', 'sales-handoff'],
    ['banter', 'playful-banter'],
    ['tag-friend', 'playful-banter'],
    ['criticism', 'acknowledge-critique'],
  ] as const)('%s → %s automático', (kind, mode) => {
    expect(plan(cls({ kind }))).toMatchObject({ action: 'reply', mode });
  });

  it('reclamo sin sarcasmo y riesgo bajo → empatía automática', () => {
    expect(plan(cls({ kind: 'complaint' }))).toMatchObject({ action: 'reply', mode: 'empathize-resolve' });
  });

  it('reclamo de riesgo medio → borrador', () => {
    expect(plan(cls({ kind: 'complaint', risk: 'medium' })).action).toBe('draft-for-review');
  });

  it.each(['spam', 'emoji-only', 'other'] as const)('%s → ignorar', (kind) => {
    expect(plan(cls({ kind })).action).toBe('ignore');
  });

  it('odio → escalar', () => {
    expect(plan(cls({ kind: 'hate', hostility: 0.9 })).action).toBe('escalate');
  });
});

describe('decidePlan — seguridad', () => {
  it('reglas duras escalan aunque el LLM haya dicho "elogio" con riesgo bajo', () => {
    const p = plan(cls({ kind: 'praise', risk: 'low', hardFlags: ['legal'] }));
    expect(p.action).toBe('escalate');
  });

  it('riesgo alto escala', () => {
    expect(plan(cls({ kind: 'question', risk: 'high' })).action).toBe('escalate');
  });

  it('prompt injection se ignora, incluso si el resto parece inocente', () => {
    expect(plan(cls({ kind: 'question', promptInjection: true })).action).toBe('ignore');
  });

  it('clasificación por reglas (sin LLM) nunca responde sola', () => {
    const p = plan(cls({ kind: 'praise', source: 'heuristic', confidence: 0.4 }));
    expect(p.action).toBe('draft-for-review');
  });

  it('confianza baja → borrador', () => {
    expect(plan(cls({ kind: 'praise', confidence: 0.5 })).action).toBe('draft-for-review');
  });
});

describe('decidePlan — autonomía', () => {
  it('suggest: nada se envía solo, pero ignorar y escalar se mantienen', () => {
    const cfg: BrainConfig = { autonomy: 'suggest', minConfidence: 0.7 };
    expect(plan(cls({ kind: 'praise' }), cfg).action).toBe('draft-for-review');
    expect(plan(cls({ kind: 'spam' }), cfg).action).toBe('ignore');
    expect(plan(cls({ kind: 'praise', hardFlags: ['salud-seguridad'] }), cfg).action).toBe('escalate');
  });

  it('full baja el umbral de confianza, incluido el de humor', () => {
    const c = cls({ kind: 'banter', sarcasm: { present: true, stance: 'playful' }, confidence: 0.65 });
    expect(plan(c, BALANCED).action).toBe('draft-for-review');
    expect(plan(c, { autonomy: 'full', minConfidence: 0.7 }).action).toBe('reply');
  });

  it('full NO relaja las reglas duras ni el riesgo alto', () => {
    const cfg: BrainConfig = { autonomy: 'full', minConfidence: 0.7 };
    expect(plan(cls({ hardFlags: ['legal'] }), cfg).action).toBe('escalate');
    expect(plan(cls({ risk: 'high' }), cfg).action).toBe('escalate');
  });
});
