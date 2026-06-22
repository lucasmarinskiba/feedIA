/**
 * Swarm Critic — supervisor de reflexión (patrón Reflexion)
 * ─────────────────────────────────────────────────────────────────────────
 * Después de cada tarea, el crítico evalúa si el output realmente cumple el
 * objetivo y devuelve un veredicto que el conductor usa para decidir:
 *   • accept   → seguir
 *   • retry    → reintentar la MISMA tarea con un goal mejorado
 *   • replan   → el plan ya no sirve, replanificar lo que falta
 *   • escalate → requiere humano (checkpoint)
 *
 * LLM-based con modelo rápido; si falla, heurística conservadora que evita
 * loops infinitos (acepta salvo señales claras de error).
 */

import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from '../claude.js';
import { log } from '../logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

export type CriticVerdict = 'accept' | 'retry' | 'replan' | 'escalate';

export interface CritiqueResult {
  score: number; // 0–100
  verdict: CriticVerdict;
  reasoning: string;
  /** Goal reformulado para el reintento (solo cuando verdict = 'retry'). */
  improvedGoal?: string;
}

const FAIL_SIGNALS = [
  'no pude',
  'no puedo',
  'error',
  'falló',
  'fallo',
  'no encontré',
  'max iteraciones',
  'sin cierre',
  'undefined',
  'no registrada',
];

const heuristic = (objective: string, taskGoal: string, output: string): CritiqueResult => {
  const lower = output.toLowerCase();
  const tooShort = output.trim().length < 40;
  const hasFail = FAIL_SIGNALS.some((s) => lower.includes(s));
  if (tooShort || hasFail) {
    return {
      score: tooShort ? 25 : 40,
      verdict: 'retry',
      reasoning: tooShort
        ? 'Output demasiado corto para considerarse completo.'
        : 'El output contiene señales de fallo o tarea incompleta.',
      improvedGoal: `${taskGoal}\n\n(Reintento: el intento anterior no fue concluyente. Sé concreto, entregá el resultado real y evitá descripciones de lo que harías.)`,
    };
  }
  return {
    score: 75,
    verdict: 'accept',
    reasoning: 'Heurística: output sustancioso y sin señales de fallo.',
  };
};

interface RawCritique {
  score?: number;
  verdict?: string;
  reasoning?: string;
  improvedGoal?: string;
}

const parse = (text: string): RawCritique | null => {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as RawCritique;
  } catch {
    return null;
  }
};

const VERDICTS: readonly CriticVerdict[] = ['accept', 'retry', 'replan', 'escalate'];

export const critique = async (
  brand: BrandProfile,
  params: {
    objective: string;
    taskGoal: string;
    agentId: string;
    output: string;
    attempt: number;
    maxAttempts: number;
  },
): Promise<CritiqueResult> => {
  const { objective, taskGoal, agentId, output, attempt, maxAttempts } = params;

  try {
    const response = await claude.messages.create({
      model: env.modelFast,
      max_tokens: 700,
      system: `Sos el Crítico (reflexión) del orquestador autónomo de FeedIA para ${brand.name}.
Evaluás si el output de un agente cumple el objetivo de la misión. Sé exigente pero práctico: el sistema debe avanzar, no quedar en loop.

Veredictos:
- "accept": cumple suficientemente, se puede seguir.
- "retry": recuperable reintentando la misma tarea con instrucciones más precisas. NO uses retry si attempt >= maxAttempts.
- "replan": el enfoque está mal, hay que rehacer el plan de lo que falta.
- "escalate": necesita decisión/aprobación humana (riesgo, ambigüedad crítica).

Respondé SOLO un bloque \`\`\`json: { "score": 0-100, "verdict": "...", "reasoning": "1-2 frases", "improvedGoal": "solo si verdict=retry" }`,
      messages: [
        {
          role: 'user',
          content: `OBJETIVO MISIÓN: ${objective}
TAREA (agente ${agentId}): ${taskGoal}
INTENTO: ${attempt}/${maxAttempts}

OUTPUT DEL AGENTE:
${output.slice(0, 6000)}`,
        },
      ],
    });
    const text = response.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    const raw = parse(text);
    if (raw && typeof raw.score === 'number') {
      let verdict: CriticVerdict = VERDICTS.includes(raw.verdict as CriticVerdict)
        ? (raw.verdict as CriticVerdict)
        : 'accept';
      // Nunca pedir retry si ya agotamos los intentos.
      if (verdict === 'retry' && attempt >= maxAttempts) verdict = 'replan';
      return {
        score: Math.max(0, Math.min(100, Math.round(raw.score))),
        verdict,
        reasoning: raw.reasoning?.trim() || 'Sin justificación explícita.',
        improvedGoal: verdict === 'retry' ? raw.improvedGoal?.trim() : undefined,
      };
    }
  } catch (err) {
    log.warn(`[SWARM Critic] LLM falló: ${(err as Error).message}`);
  }

  const h = heuristic(objective, taskGoal, output);
  if (h.verdict === 'retry' && attempt >= maxAttempts) {
    return { ...h, verdict: 'replan', improvedGoal: undefined };
  }
  return h;
};
