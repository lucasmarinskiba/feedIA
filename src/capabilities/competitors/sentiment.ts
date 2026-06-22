/**
 * sentiment.ts — Sentimiento de comunidad en posts de competidores
 * ─────────────────────────────────────────────────────────────────────────
 * Analiza comentarios simulados/extraídos de posts rivales para detectar
 * sentimiento positivo, negativo, y temas de queja/oportunidad.
 */

import { askJson } from '../../agent/claude.js';

export interface CompetitorSentiment {
  handle: string;
  overallSentiment: 'positivo' | 'neutral' | 'negativo';
  score: number; // -100 a +100
  topComplaints: string[];
  topPraises: string[];
  opportunities: string[]; // qué reclaman los followers del rival que nosotros podemos cubrir
  crisisRisk: 'alto' | 'medio' | 'bajo';
}

export const analyzeCompetitorSentiment = async (
  handle: string,
  comments: Array<{ text: string; likes: number }>,
): Promise<CompetitorSentiment> => {
  const prompt = `Analizá el sentimiento de los comentarios en posts de @${handle}.

COMENTARIOS:
${comments.map((c, i) => `${i + 1}. (${c.likes} likes) "${c.text.slice(0, 120)}"`).join('\n')}

Devolvé JSON:
{
  "overallSentiment": "positivo|neutral|negativo",
  "score": número entre -100 y +100,
  "topComplaints": ["máx 3 quejas frecuentes"],
  "topPraises": ["máx 3 elogios frecuentes"],
  "opportunities": ["máx 3 oportunidades donde la marca puede aprovechar las debilidades del rival"],
  "crisisRisk": "alto|medio|bajo"
}`;

  const result = await askJson<{
    overallSentiment: 'positivo' | 'neutral' | 'negativo';
    score: number;
    topComplaints: string[];
    topPraises: string[];
    opportunities: string[];
    crisisRisk: 'alto' | 'medio' | 'bajo';
  }>(prompt, { maxTokens: 2000 });

  return {
    handle,
    overallSentiment: result.overallSentiment,
    score: Math.max(-100, Math.min(100, result.score)),
    topComplaints: result.topComplaints,
    topPraises: result.topPraises,
    opportunities: result.opportunities,
    crisisRisk: result.crisisRisk,
  };
};
