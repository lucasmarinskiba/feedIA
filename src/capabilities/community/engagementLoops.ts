/**
 * Engagement Loops — Diseña loops de engagement reutilizables
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface EngagementLoop {
  id: string;
  name: string;
  trigger: string;
  actionRequired: string;
  reward: string;
  format: 'comment' | 'dm' | 'story' | 'save' | 'share';
  copyTemplate: string;
  expectedReachMultiplier: number;
}

const generateId = (): string => `loop-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;

export const generateEngagementLoops = async (brand: BrandProfile): Promise<EngagementLoop[]> => {
  const prompt = `Sos un growth hacker ético. Diseñá 4 engagement loops para Instagram.

${brandContext(brand)}

Reglas:
- Un engagement loop es: el usuario hace X → recibe Y → se siente recompensado → vuelve
- NUNDA pedir "comentá para llegar a más gente" (es spam)
- SÍ pedir participación GENUINA: opiniones, experiencias, consejos
- La recompensa debe ser REAL (info, template, reconocimiento)
- Que se sienta natural, no mecánico

JSON: array de 4 loops:
[
  {
    "name": "nombre del loop",
    "trigger": "qué ve el usuario",
    "actionRequired": "qué tiene que hacer",
    "reward": "qué recibe",
    "format": "comment|dm|story|save|share",
    "copyTemplate": "texto listo para usar (con espacio para personalizar)",
    "expectedReachMultiplier": 1.2
  }
]`;
  const results = await askJson<Omit<EngagementLoop, 'id'>[]>(prompt, { maxTokens: 2500 });
  return results.map((r) => ({ ...r, id: generateId() }));
};

export const designViralLoop = async (brand: BrandProfile, topic: string): Promise<EngagementLoop> => {
  const prompt = `Sos un viral strategist. Diseñá un loop de engagement específico para el tema: ${topic}.

${brandContext(brand)}

Reglas:
- Que incentive compartir (tag o share) de forma natural
- Que el contenido compartido sea VALIOSO para quien recibe
- Sin sorteos ni "tag a 3 amigos"

JSON:
{
  "name": "nombre",
  "trigger": "trigger",
  "actionRequired": "acción",
  "reward": "recompensa",
  "format": "comment|dm|story|save|share",
  "copyTemplate": "template",
  "expectedReachMultiplier": 1.5
}`;
  const result = await askJson<Omit<EngagementLoop, 'id'>>(prompt, { maxTokens: 1500 });
  return { ...result, id: generateId() };
};
