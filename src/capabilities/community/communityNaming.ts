/**
 * Community Naming — Propone un nombre para la comunidad
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface CommunityName {
  name: string;
  meaning: string;
  hashtag: string;
  usage: string;
  vibe: string;
}

export const suggestCommunityNames = async (brand: BrandProfile): Promise<CommunityName[]> => {
  const prompt = `Sos un brand strategist. Proponé 5 nombres para la comunidad de esta marca.

${brandContext(brand)}

Reglas:
- Que no existan ya (evitar "familia", "tribu" genéricos)
- Que conecte con el nicho o valores de la marca
- Fácil de recordar y escribir
- Que genere identidad de grupo
- Incluir hashtag sugerido

JSON: array de 5 nombres:
[
  {
    "name": "nombre de la comunidad",
    "meaning": "qué significa y por qué",
    "hashtag": "#hashtagSugerido",
    "usage": "cómo usarlo en posts/stories",
    "vibe": "sensación que transmite"
  }
]`;
  return askJson<CommunityName[]>(prompt, { maxTokens: 2000 });
};

export const createCommunityManifesto = async (
  brand: BrandProfile,
  communityName: string,
): Promise<{ manifesto: string; rules: string[]; welcomeMessage: string }> => {
  const prompt = `Sos un community builder. Escribí un manifesto corto para la comunidad "${communityName}".

${brandContext(brand)}

Reglas:
- Manifesto inspirador pero no cursi (máx 5 oraciones)
- 3 reglas de convivencia simples
- 1 mensaje de bienvenida para nuevos miembros

JSON:
{
  "manifesto": "texto del manifesto",
  "rules": ["regla 1", "regla 2", "regla 3"],
  "welcomeMessage": "mensaje para darle a nuevos followers"
}`;
  return askJson<{ manifesto: string; rules: string[]; welcomeMessage: string }>(prompt, { maxTokens: 1500 });
};
