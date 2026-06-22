/**
 * Ask the Professor — consulta experta fundamentada
 * ─────────────────────────────────────────────────────────────────────────
 * Cuando un agente tiene una duda estratégica de Instagram que no resuelve
 * con sus tools, "le pregunta al profesor": una consulta a Claude con un
 * system prompt cargado de conocimiento experto (instagramExpert) + facts
 * curados + el ledger de inteligencia viva. Devuelve respuesta accionable.
 *
 * Si el LLM no está disponible, degrada a una respuesta determinista armada
 * con los facts y apuntes relevantes (mejor que nada y nunca rompe).
 */

import { ask } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { buildInstagramExpertContext } from '../../agent/instagramExpert.js';
import { recallFacts, formatFactsAsPrompt } from '../knowledgeBase/index.js';
import { queryLedger, formatLedgerAsPrompt } from './ledger.js';

export interface ConsultResult {
  answer: string;
  grounded: boolean;
  source: 'experto-llm' | 'facts-deterministas';
  factsUsed: number;
}

export const askProfessor = async (brand: BrandProfile, question: string): Promise<ConsultResult> => {
  const facts = recallFacts({
    keywords: question
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 4)
      .slice(0, 8),
    limit: 8,
  });
  const factsPrompt = formatFactsAsPrompt(facts);
  const ledgerPrompt = formatLedgerAsPrompt(10);

  try {
    const answer = await ask(question, {
      fast: false,
      maxTokens: 1400,
      temperature: 0.4,
      system: `Sos el "Profesor" de Instagram del sistema FeedIA: un estratega senior que responde dudas de los agentes con precisión y sin relleno.

${buildInstagramExpertContext(brand, question)}

## Facts curados relevantes
${factsPrompt}

## Inteligencia reciente (ledger vivo — puede incluir cambios de políticas/mercado)
${ledgerPrompt}

Reglas:
- Respondé en español rioplatense, concreto y accionable (máx ~250 palabras).
- Si algo del ledger está marcado "a verificar", aclaralo y no lo des por hecho.
- Si la pregunta toca políticas/algoritmo que pudieron cambiar, decí explícitamente el nivel de confianza y qué habría que verificar.
- Nada de clickbait ni promesas vacías.`,
    });
    return { answer: answer.trim(), grounded: true, source: 'experto-llm', factsUsed: facts.length };
  } catch (err) {
    log.warn(`[askProfessor] LLM falló: ${(err as Error).message}`);
    const ledger = queryLedger({ search: question, limit: 5 });
    const deterministic = [
      'No pude consultar al modelo; respondo con el conocimiento curado disponible:',
      '',
      '— Facts relevantes —',
      factsPrompt,
      ledger.length ? '\n— Apuntes recientes —' : '',
      ...ledger.map((e) => `• (${e.confidence}) ${e.insight}`),
    ].join('\n');
    return {
      answer: deterministic.trim(),
      grounded: facts.length > 0,
      source: 'facts-deterministas',
      factsUsed: facts.length,
    };
  }
};
