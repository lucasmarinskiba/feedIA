/**
 * Profile Audit — Analiza bio, foto, highlights, grid aesthetic
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ProfileAuditResult {
  overallScore: number; // 0-100
  bio: { score: number; issues: string[]; suggestions: string[] };
  photo: { score: number; issues: string[]; suggestions: string[] };
  highlights: { score: number; issues: string[]; suggestions: string[] };
  grid: { score: number; issues: string[]; suggestions: string[] };
  linkInBio: { score: number; issues: string[]; suggestions: string[] };
  topPriority: string;
  quickWins: string[];
}

export const auditProfile = async (brand: BrandProfile): Promise<ProfileAuditResult> => {
  const prompt = `Sos un Instagram profile optimizer con 10 años de experiencia. Auditá este perfil como si fueras un visitante que decide en 3 segundos si seguir o no.

${brandContext(brand)}

Analizá:
1. BIO: ¿Tiene CTA claro? ¿Keywords del nicho? ¿Social proof? ¿Qué hace único?
2. FOTO DE PERFIL: ¿Es reconocible? ¿Profesional? ¿Alineada con la marca?
3. HIGHLIGHTS: ¿Los nombres son claros? ¿El orden tiene sentido? ¿Faltan categorías clave?
4. GRID: ¿Qué impresión da al scrollear? ¿Hay coherencia visual? ¿Mezcla de formatos?
5. LINK IN BIO: ¿A dónde lleva? ¿Es claro el siguiente paso?

JSON:
{
  "overallScore": 0-100,
  "bio": { "score": 0-100, "issues": ["problema 1"], "suggestions": ["sugerencia 1"] },
  "photo": { "score": 0-100, "issues": [], "suggestions": [] },
  "highlights": { "score": 0-100, "issues": [], "suggestions": [] },
  "grid": { "score": 0-100, "issues": [], "suggestions": [] },
  "linkInBio": { "score": 0-100, "issues": [], "suggestions": [] },
  "topPriority": "lo MÁS IMPORTANTE que debería cambiar AHORA",
  "quickWins": ["cambio rápido 1", "cambio rápido 2", "cambio rápido 3"]
}`;
  return askJson<ProfileAuditResult>(prompt, { maxTokens: 3000 });
};
