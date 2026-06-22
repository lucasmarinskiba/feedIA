import type { BrandProfile } from '../../config/types.js';

export interface ReceptorAudit {
  score: number; // 0-100, más alto = más responsable
  issues: string[];
  correctedVersion?: string;
  passes: boolean;
}

const TOXIC_PATTERNS = [
  { regex: /garantizado\s+(al\s+)?100%/i, issue: 'Promesa absoluta no sustentable' },
  {
    regex: /(?:nunca|jamás|siempre)\s+(?:vas a|vas a|lograrás|tendrás)/i,
    issue: 'Promesa de resultado cierto sin contexto',
  },
  {
    regex: /(?:el\s+único|la\s+única|el\s+secreto|la\s+fórmula)/i,
    issue: 'Lenguaje de escasez artificial/unicidad engañosa',
  },
  {
    regex: /(?:última\s+oportunidad|se\s+acaba|antes\s+de\s+que\s+sea\s+tarde)/i,
    issue: 'Urgencia artificial/FOMO tóxico',
  },
  { regex: /(?:sin\s+esfuerzo|sin\s+trabajar|mientras\s+duermes)/i, issue: 'Promesa de resultados sin esfuerzo' },
  {
    regex: /(?:todos\s+lo\s+están\s+haciendo|todos\s+lo\s+usan|el\s+que\s+no\s+lo\s+hace)/i,
    issue: 'Presión social manipuladora',
  },
  { regex: /(?:pierdes|estás\s+perdiendo|te\s+estás\s+quedando\s+atrás)/i, issue: 'Miedo a la pérdida exagerado' },
];

const POSITIVE_PATTERNS = [
  { regex: /podés\s+empezar|primer\s+paso|empezá\s+con/i, bonus: 5, reason: 'Empoderamiento concreto' },
  { regex: /(?:depende\s+de|varía\s+según|cada\s+caso)/i, bonus: 5, reason: 'Nuance/contexto honesto' },
  {
    regex: /(?:tomá\s+tu\s+tiempo|a\s+tu\s+ritmo|sin\s+presión)/i,
    bonus: 10,
    reason: 'Respeto al tiempo del receptor',
  },
  { regex: /(?:no\s+es\s+para\s+todos|no\s+funciona\s+siempre)/i, bonus: 10, reason: 'Honestidad sobre limitaciones' },
  { regex: /(?:basado\s+en\s+datos|según\s+nuestro\s+análisis|investigamos)/i, bonus: 5, reason: 'Fundamentación' },
];

export const auditReceptorResponsibility = (
  brand: BrandProfile,
  caption: string,
  hooks: string[] = [],
): ReceptorAudit => {
  const text = `${caption} ${hooks.join(' ')}`;
  const issues: string[] = [];
  let score = 80;

  // Check toxic patterns
  for (const p of TOXIC_PATTERNS) {
    if (p.regex.test(text)) {
      issues.push(p.issue);
      score -= 15;
    }
  }

  // Check brand forbidden words
  for (const forbidden of brand.voice.forbidden) {
    const regex = new RegExp(`\\b${forbidden}\\b`, 'i');
    if (regex.test(text)) {
      issues.push(`Palabra prohibida por marca: "${forbidden}"`);
      score -= 10;
    }
  }

  // Check positive patterns
  for (const p of POSITIVE_PATTERNS) {
    if (p.regex.test(text)) {
      score += p.bonus;
    }
  }

  // Cap score
  score = Math.max(0, Math.min(100, score));

  const passes = score >= 60 && issues.length <= 2;

  return {
    score,
    issues,
    passes,
    correctedVersion: passes ? undefined : generateCorrectedVersion(caption, hooks, issues),
  };
};

const generateCorrectedVersion = (caption: string, hooks: string[], issues: string[]): string => {
  let corrected = caption;

  // Replace absolute promises with nuanced versions
  corrected = corrected.replace(/garantizado\s+(al\s+)?100%/gi, 'probado en nuestro contexto');
  corrected = corrected.replace(/(?:nunca|jamás)\s+(?:vas a|lograrás)/gi, 'no siempre es fácil, pero podés');
  corrected = corrected.replace(/el\s+único/gi, 'una opción que funciona para muchos');
  corrected = corrected.replace(/(?:última\s+oportunidad|se\s+acaba)/gi, 'hay tiempo, pero cuanto antes mejor');
  corrected = corrected.replace(/sin\s+esfuerzo/gi, 'con el esfuerzo correcto enfocado');

  return `VERSIÓN CORREGIDA (issues: ${issues.length}):
${corrected}

Hooks originales a revisar:
${hooks.map((h, i) => `${i + 1}. ${h}`).join('\n')}
`.trim();
};
