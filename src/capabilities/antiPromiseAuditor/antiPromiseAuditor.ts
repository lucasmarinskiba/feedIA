/**
 * Anti-Promise Auditor
 *
 * Audita captions, hooks y copy generado para detectar promesas vacías,
 * superlativos sin evidencia, garantías absolutas y lenguaje de "gurú".
 *
 * Se integra en el pipeline briefToPublish DESPUÉS del safety audit.
 */

import { z } from 'zod';
import { log } from '../../agent/logger.js';
import { audit } from '../../compliance/auditLog.js';

export const AntiPromiseVerdictSchema = z.enum(['clean', 'soft-promise', 'hard-promise']);
export type AntiPromiseVerdict = z.infer<typeof AntiPromiseVerdictSchema>;

export interface AntiPromiseAuditResult {
  verdict: AntiPromiseVerdict;
  score: number; // 0-100, más alto = más limpio
  matches: Array<{
    pattern: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }>;
  rewritten?: string; // versión sugerida si hay soft-promise
}

// Patrones deterministas (regex)
const HARD_PATTERNS: Array<{ regex: RegExp; pattern: string; suggestion: string }> = [
  {
    regex: /\b(garantizado\s+(al\s+)?100%?|garantizo\s+(al\s+)?100%?)\b/gi,
    pattern: 'garantía absoluta',
    suggestion: 'Reemplazar por resultado verificable o testimonio concreto.',
  },
  {
    regex: /\b(resultados?\s+(inmediatos?|instantáneos?|de\s+la\s+noche\s+a\s+la\s+mañana))\b/gi,
    pattern: 'resultados inmediatos',
    suggestion: 'Especificar timeframe realista (ej: "en 30 días").',
  },
  {
    regex: /\b(duplicar|triplicar|multiplicar)\s+(tus?\s+)?(ventas?|ingresos?|clientes?)\s+(en\s+\d+\s+días?)?\b/gi,
    pattern: 'promesa de multiplicación de resultados',
    suggestion: 'Usar caso real con porcentaje verificable o quitar el claim numérico.',
  },
  {
    regex: /\b(secreto\s+que\s+nadie\s+te\s+cuenta|nadie\s+te\s+dice|lo\s+que\s+no\s+quieren\s+que\s+sepas)\b/gi,
    pattern: 'lenguaje conspirativo/secreto',
    suggestion: 'Reemplazar por insight accionable concreto.',
  },
  {
    regex: /\b(fórmula\s+mágica|truco\s+secreto|hack\s+secreto)\b/gi,
    pattern: 'fórmula mágica / hack secreto',
    suggestion: 'Nombrar el proceso o framework real que usás.',
  },
  {
    regex: /\b(sin\s+esfuerzo|sin\s+hacer\s+nada|mientras\s+dormís)\b/gi,
    pattern: 'sin esfuerzo',
    suggestion: 'Mencionar el trabajo requerido de forma honesta.',
  },
  {
    regex: /\b(siempre\s+funciona|nunca\s+falla|funciona\s+para\s+todos)\b/gi,
    pattern: 'promesa universal',
    suggestion: 'Agregar contexto o disclaimer de caso típico.',
  },
];

const SOFT_PATTERNS: Array<{ regex: RegExp; pattern: string; suggestion: string }> = [
  {
    regex: /\b(garantizado|garantizo)\b/gi,
    pattern: 'garantía sin cuantificación',
    suggestion: 'Si hay garantía, especificar condiciones y métrica.',
  },
  {
    regex: /\b(el\s+mejor|la\s+mejor|único|perfecto|impecable)\b/gi,
    pattern: 'superlativo absoluto',
    suggestion: 'Reemplazar por comparativa concreta o atributo medible.',
  },
  {
    regex: /\b(nunca\s+más|olvídate\s+de|se\s+acabó)\b/gi,
    pattern: 'lenguaje de eliminación absoluta',
    suggestion: 'Usar "reduce" o "minimiza" con porcentaje si hay datos.',
  },
  {
    regex: /\b(descubrí|aprendé)\s+(el\s+)?(secreto|método|sistema)\b/gi,
    pattern: 'secreto/método sin nombre',
    suggestion: 'Nombrar el método o sistema concretamente.',
  },
  {
    regex: /\b(cambiará\s+tu\s+vida|revoluciona|transforma)\b/gi,
    pattern: 'transformación sin métrica',
    suggestion: 'Especificar qué cambia y en qué timeframe.',
  },
];

export const auditContentForEmptyPromises = (caption: string, hooks: string[] = []): AntiPromiseAuditResult => {
  const text = `${caption}\n${hooks.join('\n')}`.toLowerCase();
  const matches: AntiPromiseAuditResult['matches'] = [];

  for (const hp of HARD_PATTERNS) {
    if (hp.regex.test(text)) {
      matches.push({ pattern: hp.pattern, severity: 'high', suggestion: hp.suggestion });
    }
  }

  for (const sp of SOFT_PATTERNS) {
    if (sp.regex.test(text)) {
      matches.push({ pattern: sp.pattern, severity: 'medium', suggestion: sp.suggestion });
    }
  }

  const hardCount = matches.filter((m) => m.severity === 'high').length;
  const softCount = matches.filter((m) => m.severity === 'medium').length;

  let score = 100;
  score -= hardCount * 35;
  score -= softCount * 15;
  score = Math.max(0, score);

  let verdict: AntiPromiseVerdict = 'clean';
  if (hardCount > 0) verdict = 'hard-promise';
  else if (softCount > 0) verdict = 'soft-promise';

  const result: AntiPromiseAuditResult = {
    verdict,
    score,
    matches,
  };

  if (verdict !== 'clean') {
    log.warn(`[AntiPromiseAuditor] ${verdict.toUpperCase()} detectado: ${matches.map((m) => m.pattern).join(', ')}`);
    audit({
      action: 'COMPLIANCE_WARNING',
      outcome: 'blocked',
      reason: `ANTI_PROMISE_AUDIT: ${verdict} — ${matches.map((m) => m.pattern).join(', ')}`,
      contentSummary: caption.slice(0, 120),
    });
  }

  return result;
};

export const generateSafeRewrite = (caption: string, _hooks: string[] = []): string => {
  // Versión básica: reemplazar palabras de hard patterns por alternativas seguras
  let safe = caption;
  const replacements: Array<[RegExp, string]> = [
    [/\b(garantizado\s+(al\s+)?100%?)\b/gi, 'con resultados medibles'],
    [/\b(resultados?\s+inmediatos?)\b/gi, 'resultados en semanas con aplicación consistente'],
    [/\b(secreto\s+que\s+nadie\s+te\s+cuenta)\b/gi, 'estrategia que pocos aplican'],
    [/\b(fórmula\s+mágica)\b/gi, 'proceso sistemático'],
    [/\b(sin\s+esfuerzo)\b/gi, 'con el esfuerzo mínimo necesario'],
    [/\b(el\s+mejor|la\s+mejor)\b/gi, 'uno de los más efectivos'],
    [/\b(cambiará\s+tu\s+vida)\b/gi, 'puede mejorar resultados concretos'],
  ];

  for (const [regex, replacement] of replacements) {
    safe = safe.replace(regex, replacement);
  }

  return safe;
};
