export interface CommonSenseAudit {
  score: number;
  issues: string[];
  factChecks: Array<{
    claim: string;
    status: 'verified' | 'unverified' | 'misleading' | 'false';
    note: string;
  }>;
  passes: boolean;
}

const STATISTICAL_CLAIM_PATTERN =
  /\b(\d{1,3}(?:\.\d+)?%)\b|\b(\d{1,3}\s+de\s+cada\s+\d+)\b|\b(aument[oó]|creci[oó]|subi[oó])\s+(?:un\s+)?(\d+)%\b/gi;

const UNSOURCED_SUPERLATIVES = [
  /el\s+mejor/gi,
  /la\s+mejor/gi,
  /número\s+1/gi,
  /top\s+1/gi,
  /líder\s+(?:indiscutible|absoluto)/gi,
];

const CAUSAL_FALLACIES = [
  /(?:por\s+eso|por\s+lo\s+tanto|entonces)\s+.+\s+(?:aumenta|sube|baja|mejora|empeora)/gi,
  /(?:usar|tener)\s+.+\s+(?:garantiza|asegura|significa)\s+.+\s+(?:éxito|resultado)/gi,
];

const MEDICAL_LEGAL_ADVICE = [
  /(?:deberías|tenés\s+que)\s+(?:tomar|usar|aplicar)\s+.{0,30}(?:medicina|pastilla|tratamiento|terapia)/gi,
  /(?:consulta|contrata|demanda)\s+.{0,20}(?:abogado|juez|tribunal)/gi,
];

export const validateCommonSense = (text: string): CommonSenseAudit => {
  const issues: string[] = [];
  const factChecks: CommonSenseAudit['factChecks'] = [];
  let score = 90;

  // Check unsourced statistics
  const statsMatches = text.matchAll(STATISTICAL_CLAIM_PATTERN);
  for (const match of statsMatches) {
    const claim = match[0] ?? '';
    issues.push(`Dato estadístico sin fuente: "${claim}"`);
    score -= 10;
    factChecks.push({
      claim,
      status: 'unverified',
      note: 'Agregar fuente o contexto del estudio/muestra',
    });
  }

  // Check superlatives without evidence
  for (const pattern of UNSOURCED_SUPERLATIVES) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const claim = match[0] ?? '';
      issues.push(`Superlativo sin evidencia: "${claim}"`);
      score -= 8;
      factChecks.push({
        claim,
        status: 'misleading',
        note: 'Si es cierto, citar fuente. Si no, usar lenguaje más moderado.',
      });
    }
  }

  // Check causal fallacies
  for (const pattern of CAUSAL_FALLACIES) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const claim = match[0] ?? '';
      issues.push(`Relación causal espuria o no demostrada: "${claim}"`);
      score -= 12;
      factChecks.push({
        claim,
        status: 'misleading',
        note: 'Correlación no implica causalidad. Agregar "puede ayudar a" o "está asociado con".',
      });
    }
  }

  // Check medical/legal advice
  for (const pattern of MEDICAL_LEGAL_ADVICE) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const claim = match[0] ?? '';
      issues.push(`Posible consejo médico/legal sin disclaimer: "${claim}"`);
      score -= 15;
      factChecks.push({
        claim,
        status: 'false',
        note: 'Agregar disclaimer "No es consejo médico/legal profesional. Consultá con un especialista."',
      });
    }
  }

  // Check for absolute statements
  const absolutes = text.match(/\b(?:siempre|nunca|todos|ninguno|absolutamente)\b/gi);
  if (absolutes && absolutes.length > 2) {
    issues.push(`Exceso de afirmaciones absolutas (${absolutes.length})`);
    score -= 5;
  }

  score = Math.max(0, Math.min(100, score));
  const passes = score >= 65;

  return { score, issues, factChecks, passes };
};

export const generateCommonSenseReport = (audit: CommonSenseAudit): string => {
  const lines = [
    `Score de sentido común: ${audit.score}/100`,
    `Estado: ${audit.passes ? '✅ Aprobado' : '⚠️ Requiere revisión'}`,
    '',
    `Issues encontrados: ${audit.issues.length}`,
    ...audit.issues.map((i) => `  - ${i}`),
    '',
    'Fact-checks:',
    ...audit.factChecks.map((fc) => `  [${fc.status.toUpperCase()}] "${fc.claim}" → ${fc.note}`),
  ];
  return lines.join('\n');
};
