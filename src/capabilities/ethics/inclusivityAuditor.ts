export interface InclusivityAudit {
  score: number;
  issues: string[];
  accessibilityNotes: string[];
  passes: boolean;
}

const NON_INCLUSIVE_TERMS = [
  { term: /todos\s+los\s+chicos/gi, replacement: 'todes', issue: 'Lenguaje no inclusivo (masculino genérico)' },
  { term: /cada\s+uno/gi, replacement: 'cada persona', issue: 'Lenguaje no inclusivo' },
  { term: /el\s+usuario/gi, replacement: 'la persona usuaria', issue: 'Masculino genérico' },
  { term: /normal/gi, replacement: 'típico/común', issue: 'Término excluyente (implica que lo diferente es anormal)' },
  { term: /loco/gi, replacement: 'increíble/impresionante', issue: 'Lenguaje capacitista' },
  { term: /chico\s+de\s+los\s+recursos/gi, replacement: 'persona de recursos', issue: 'Estereotipo de género' },
  {
    term: /(?:cieg[o|a]|sord[o|a])\s+(?:de|a|ante)/gi,
    replacement: 'indiferente ante',
    issue: 'Metáforas capacitistas',
  },
];

const CONTRAST_ISSUES = [/color:\s*#fff.*background:\s*#f5f5f5/gi, /color:\s*#000.*background:\s*#0a0a0a/gi];

export const auditInclusivity = (text: string, visualDescription?: string): InclusivityAudit => {
  const issues: string[] = [];
  const accessibilityNotes: string[] = [];
  let score = 95;

  // Text inclusivity
  for (const item of NON_INCLUSIVE_TERMS) {
    if (item.term.test(text)) {
      issues.push(`${item.issue}. Sugerencia: "${item.replacement}"`);
      score -= 8;
    }
  }

  // Check for unbalanced representation
  const maleRefs = (text.match(/\b(?:él|su\s+equipo|el\s+dueño|el\s+emprendedor)\b/gi) ?? []).length;
  const femaleRefs = (text.match(/\b(?:ella|su\s+equipo|la\s+dueña|la\s+emprendedora)\b/gi) ?? []).length;
  if (maleRefs > 0 && femaleRefs === 0 && maleRefs > 2) {
    issues.push('Texto solo usa referencias masculinas. Considerá alternar o usar lenguaje neutro.');
    score -= 10;
  }

  // Visual accessibility
  if (visualDescription) {
    if (visualDescription.toLowerCase().includes('texto pequeño')) {
      accessibilityNotes.push('Asegurar texto legible en mobile (mínimo 24px en stories)');
      score -= 5;
    }
    if (visualDescription.toLowerCase().includes('mucho texto')) {
      accessibilityNotes.push('Considerar versión con menos texto para accesibilidad cognitiva');
      score -= 5;
    }

    // Contrast check (basic regex)
    for (const pattern of CONTRAST_ISSUES) {
      if (pattern.test(visualDescription)) {
        issues.push('Posible problema de contraste de colores (texto y fondo muy similares)');
        score -= 10;
      }
    }
  }

  // Alt text suggestion
  accessibilityNotes.push('Agregar alt text descriptivo en todas las imágenes para lectores de pantalla');

  score = Math.max(0, Math.min(100, score));
  const passes = score >= 70;

  return { score, issues, accessibilityNotes, passes };
};

export const generateAltText = (visualDescription: string, brandName: string): string =>
  `Imagen de ${brandName}: ${visualDescription.slice(0, 120)}`;
