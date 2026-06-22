import { askJson } from '../../agent/claude.js';

export interface HashtagAuditEntry {
  tag: string;
  veredicto: 'sano' | 'sospechoso' | 'shadowbanned' | 'banneado';
  razon: string;
  reemplazoSugerido?: string;
}

export const auditHashtags = async (tags: string[]): Promise<HashtagAuditEntry[]> => {
  const prompt = `Actuá como auditor de hashtags de Instagram. Detectá tags problemáticos.

HASHTAGS A AUDITAR:
${tags.map((t) => `- ${t}`).join('\n')}

Para cada uno marcá:
- sano: sin problemas conocidos
- sospechoso: ambigüedad o uso mixto (ej. ha sido usado por contenido NSFW de forma indirecta)
- shadowbanned: Instagram limita su alcance históricamente
- banneado: removido completamente

Si no es sano, proponé un reemplazo equivalente en intención.

JSON: array
[
  {
    "tag": "#...",
    "veredicto": "sano|sospechoso|shadowbanned|banneado",
    "razon": "...",
    "reemplazoSugerido": "#..." (solo si no sano)
  }
]`;
  return askJson<HashtagAuditEntry[]>(prompt, { maxTokens: 3000 });
};
