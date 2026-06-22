/**
 * Gamified FOMO — Exclusividad por acción, competencias, "solo los primeros"
 * "El primero en adivinar gana", "Solo 10 personas van a ver esto"
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface GamifiedMechanic {
  name: string;
  mechanic: 'first_come' | 'scavenger_hunt' | 'prediction' | 'challenge' | 'lottery' | 'milestone_unlock';
  rules: string;
  prize: string;
  fomoTrigger: string;
  copyHook: string;
  copyReveal: string;
  participantLimit?: number;
}

export const designGamifiedFomo = async (brand: BrandProfile): Promise<GamifiedMechanic[]> => {
  const prompt = `Sos un gamification designer. Diseñá 4 mecánicas de FOMO gamificado.

${brandContext(brand)}

Reglas:
- Cada mecánica debe tener un premio/valor REAL
- El FOMO viene de "si no participás ahora, te lo perdés"
- Sin sorteos vacíos ("like y tag para ganar" = spam)
- Que la mecánica refuerce la marca, no la diluya

Mecánicas posibles:
- First come: los primeros N reciben algo
- Scavenger hunt: encontrá algo en el feed/stories
- Prediction: adiviná y ganá acceso exclusivo
- Challenge: completá un desafío y desbloqueá
- Lottery: entre los que comentan, sorteo real
- Milestone unlock: cuando llegamos a X, todos reciben Y

JSON: array de 4 mecánicas:
[
  {
    "name": "nombre de la mecánica",
    "mechanic": "first_come|scavenger_hunt|prediction|challenge|lottery|milestone_unlock",
    "rules": "reglas claras",
    "prize": "qué ganan",
    "fomoTrigger": "por qué hay que actuar YA",
    "copyHook": "hook para el post",
    "copyReveal": "texto cuando se revela el ganador/resultado",
    "participantLimit": 10
  }
]`;
  return askJson<GamifiedMechanic[]>(prompt, { maxTokens: 3000 });
};

export const createScavengerHunt = async (
  brand: BrandProfile,
  prize: string,
): Promise<{ clues: string[]; revealPost: string; winnerAnnouncement: string }> => {
  const prompt = `Sos un gamification designer. Creá una búsqueda del tesoro en Instagram.

${brandContext(brand)}
Premio: ${prize}

Reglas:
- 3 pistas que llevan a través de posts/stories
- La última pista requiere DM o comentario específico
- Que sea divertido, no frustrante

JSON:
{
  "clues": ["pista 1", "pista 2", "pista 3"],
  "revealPost": "post cuando alguien encuentra",
  "winnerAnnouncement": "anuncio del ganador"
}`;
  return askJson<{ clues: string[]; revealPost: string; winnerAnnouncement: string }>(prompt, { maxTokens: 2000 });
};
