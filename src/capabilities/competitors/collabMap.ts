/**
 * collabMap.ts — Detección de colaboradores de competidores
 * ─────────────────────────────────────────────────────────────────────────
 * Analiza los captions de posts recientes para detectar mentions y tags
 * a otros creators, revelando con quiénes colaboran los competidores.
 */

import { askJson } from '../../agent/claude.js';

export interface CollabDetection {
  handle: string;
  collaborators: Array<{
    username: string;
    frequency: number;
    context: string;
    confidence: 'alta' | 'media' | 'baja';
  }>;
  insights: string[];
}

export const detectCollaborators = async (
  handle: string,
  posts: Array<{ caption: string; likes: number }>,
): Promise<CollabDetection> => {
  const prompt = `Analizá estos posts de @${handle} y detectá con quiénes colabora.

POSTS:
${posts.map((p, i) => `${i + 1}. (${p.likes} likes) ${p.caption.slice(0, 150)}`).join('\n')}

Buscá:
1. Mentions @usuario en captions (indica colaboración o cross-promo)
2. Tags frecuentes de otros creators
3. Frases como "con @usuario", "collab", "junto a", "gracias a @usuario"

Devolvé JSON:
{
  "collaborators": [
    { "username": "@usuario", "frequency": 3, "context": "cross-promo en reels", "confidence": "alta|media|baja" }
  ],
  "insights": ["2-3 insights sobre su estrategia de colaboración"]
}`;

  return askJson<CollabDetection>(prompt, { maxTokens: 2000 });
};
