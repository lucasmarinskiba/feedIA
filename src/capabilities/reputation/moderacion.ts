import { askJson } from '../../agent/claude.js';

export type AccionModeracion = 'eliminar' | 'ocultar' | 'reportar' | 'responder' | 'mantener';

export interface DecisionModeracion {
  comentario: string;
  accion: AccionModeracion;
  motivo: string;
  tipoOfensa?: 'spam' | 'insulto' | 'fraude' | 'odio' | 'desinformacion' | 'amenaza';
  confianza: number;
}

export const moderarComentarios = async (
  comentarios: Array<{ id: string; autor: string; texto: string }>,
): Promise<Array<DecisionModeracion & { id: string; autor: string }>> => {
  const prompt = `Actuá como moderador de comentarios en Instagram. Sé estricto con spam y odio, indulgente con crítica genuina (incluso negativa).

COMENTARIOS:
${comentarios.map((c, i) => `${i + 1}. id=${c.id} @${c.autor}: "${c.texto}"`).join('\n')}

Reglas:
- "spam" = links sospechosos, promo de cripto/casino, copia repetida.
- "insulto" = ataque personal directo (no frustración).
- "fraude" = phishing, suplantación, links engañosos.
- "odio" = discriminación por identidad o grupo.
- "desinformacion" = afirmación falsa con potencial dañino.
- "amenaza" = violencia explícita.
- Crítica negativa REAL → mantener y responder. NO eliminar críticas porque incomoden.

JSON:
[
  {
    "id": "id del comentario",
    "autor": "@...",
    "comentario": "texto original",
    "accion": "eliminar|ocultar|reportar|responder|mantener",
    "motivo": "razón clara y trazable",
    "tipoOfensa": "spam|insulto|fraude|odio|desinformacion|amenaza (solo si aplica)",
    "confianza": 0.0
  }
]`;
  return askJson(prompt, { maxTokens: 4000 });
};
