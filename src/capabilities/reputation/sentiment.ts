import { askJson } from '../../agent/claude.js';

export interface SentimentSnapshot {
  scoreGlobal: number;
  distribucion: { positivo: number; neutro: number; negativo: number };
  alertaCrisis: boolean;
  motivosPrincipales: string[];
  recomendacion: 'pausar-publicaciones' | 'responder-publico' | 'monitorear' | 'todo-normal';
  respuestaPublicaSugerida?: string;
}

export const analizarSentimiento = async (postId: string, comentarios: string[]): Promise<SentimentSnapshot> => {
  const prompt = `Analizá el sentimiento del hilo de comentarios de un post de Instagram.

POST ID: ${postId}
COMENTARIOS (${comentarios.length}):
${comentarios.map((c, i) => `${i + 1}. ${c}`).join('\n')}

Tarea:
- Estimá score global (-1 a 1).
- Calculá distribución porcentual aproximada.
- Detectá señales de crisis: pile-on, acusación grave, fake news propagándose, llamado al boicot.
- Si hay crisis: recomendá pausar publicaciones programadas.
- Si la crítica es legítima: respuesta pública sugerida (transparente, sin defensiva).

JSON:
{
  "scoreGlobal": 0.0,
  "distribucion": { "positivo": 0, "neutro": 0, "negativo": 0 },
  "alertaCrisis": false,
  "motivosPrincipales": ["..."],
  "recomendacion": "pausar-publicaciones|responder-publico|monitorear|todo-normal",
  "respuestaPublicaSugerida": "solo si la recomendación lo requiere, máximo 4 oraciones"
}`;
  return askJson<SentimentSnapshot>(prompt, { maxTokens: 2500 });
};
