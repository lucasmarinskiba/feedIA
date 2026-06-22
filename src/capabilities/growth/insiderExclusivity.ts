/**
 * Insider Exclusivity — FOMO por pertenencia a un grupo selecto
 * "Los insiders ya saben", "Close Friends", "Early access"
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface InsiderTier {
  name: string;
  requirement: string;
  benefits: string[];
  fomoForOutsiders: string;
  welcomeMessage: string;
}

export interface InsiderSystem {
  tiers: InsiderTier[];
  entryRitual: string;
  monthlyExclusive: string;
  outsidersTeaser: string;
}

export const designInsiderSystem = async (brand: BrandProfile): Promise<InsiderSystem> => {
  const prompt = `Sos un community architect. Diseñá un sistema de insiders de 3 niveles.

${brandContext(brand)}

Reglas:
- Cada nivel debe tener requisitos claros y beneficios reales
- El FOMO para outsiders debe ser ético (no humillante)
- Que haya una narrativa de "progresión" (empezás acá, podés llegar allá)
- Incluir un ritual de entrada (qué pasa cuando alguien sube de nivel)

JSON:
{
  "tiers": [
    {
      "name": "nombre del nivel",
      "requirement": "cómo se entra",
      "benefits": ["beneficio 1", "beneficio 2"],
      "fomoForOutsiders": "qué ven los que NO están adentro",
      "welcomeMessage": "mensaje de bienvenida al subir"
    }
  ],
  "entryRitual": "qué pasa cuando alguien entra al insider circle",
  "monthlyExclusive": "qué contenido exclusivo se entrega cada mes",
  "outsidersTeaser": "cómo se muestra a los outsiders que hay algo más"
}`;
  return askJson<InsiderSystem>(prompt, { maxTokens: 3000 });
};

export const generateCloseFriendsDrop = async (
  brand: BrandProfile,
  contentType: string,
): Promise<{ teaserForPublic: string; contentForInsiders: string; revealAftermath: string }> => {
  const prompt = `Sos un content strategist. Diseñá un drop exclusivo para Close Friends.

${brandContext(brand)}
Tipo de contenido: ${contentType}

JSON:
{
  "teaserForPublic": "qué se muestra públicamente (que genera FOMO)",
  "contentForInsiders": "qué reciben los Close Friends",
  "revealAftermath": "qué pasa después para mantener el misterio"
}`;
  return askJson<{ teaserForPublic: string; contentForInsiders: string; revealAftermath: string }>(prompt, {
    maxTokens: 1500,
  });
};

export const craftInsiderTeaser = async (brand: BrandProfile, insiderContentName: string): Promise<string[]> => {
  const prompt = `Sos un copywriter. Escribí 5 teasers públicos que generen FOMO de contenido insider.

${brandContext(brand)}
Contenido exclusivo: ${insiderContentName}

Reglas:
- Que generen CURIOSIDAD, no envidia tóxica
- Que invite a unirse, no que excluya agresivamente
- Que funcione en stories (máx 2 oraciones cada uno)

JSON: array de 5 strings
`;
  return askJson<string[]>(prompt, { maxTokens: 1500 });
};
