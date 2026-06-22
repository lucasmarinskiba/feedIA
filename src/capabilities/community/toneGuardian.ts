/**
 * Tone Guardian de FeedIA — validador de voz de marca en cada output.
 *
 * Reemplaza al CM que cuida la consistencia del tono. Cada caption, DM, comentario
 * o respuesta automática pasa por este filtro antes de publicarse. Si no respeta
 * el tono de marca o usa palabras prohibidas, lo reescribe.
 */

import { log } from '../../agent/logger.js';
import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type OutputContext =
  | 'caption'
  | 'dm-reply'
  | 'comment-reply'
  | 'story-text'
  | 'public-announcement'
  | 'support-message'
  | 'bio'
  | 'cta';

export interface ToneCheckIssue {
  type:
    | 'forbidden-word'
    | 'tone-mismatch'
    | 'inappropriate-formality'
    | 'over-promise'
    | 'inconsistency'
    | 'cliche'
    | 'corporate-speak';
  severity: 'critical' | 'high' | 'medium' | 'low';
  problem: string;
  evidence: string; // fragmento textual del problema
  suggestion: string;
}

export interface ToneCheckResult {
  passes: boolean;
  score: number; // 0-100
  issues: ToneCheckIssue[];
  reasonsToReject: string[]; // si passes=false
  suggestedRewrite?: string;
  voiceCharacteristicsHit: string[]; // qué características de marca SÍ logró
  voiceCharacteristicsMiss: string[]; // qué características pudo y no hizo
}

// ── Detección rápida (sin AI) ─────────────────────────────────────────────────

const detectForbiddenWords = (text: string, forbidden: string[]): ToneCheckIssue[] => {
  const issues: ToneCheckIssue[] = [];
  for (const word of forbidden) {
    const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const match = regex.exec(text);
    if (match) {
      issues.push({
        type: 'forbidden-word',
        severity: 'critical',
        problem: `Usa la palabra prohibida "${word}"`,
        evidence: match[0],
        suggestion: `Eliminar "${word}" o reescribir la idea sin esa palabra`,
      });
    }
  }
  return issues;
};

const CORPORATE_SPEAK_PATTERNS = [
  { pattern: /\bnos enorgullece anunciar\b/i, suggestion: 'Reemplazar con "queremos contarte..." o algo más natural' },
  { pattern: /\bestamos comprometidos con\b/i, suggestion: 'Sonar humano: "creemos en..." o "nos importa..."' },
  { pattern: /\ben el d[ií]a de (la fecha|hoy)\b/i, suggestion: 'Solo "hoy"' },
  { pattern: /\bproceder a\b/i, suggestion: 'Reemplazar por el verbo directo' },
  { pattern: /\ben aras de\b/i, suggestion: 'Reemplazar por "para"' },
  { pattern: /\ben pos de\b/i, suggestion: 'Reemplazar por "para"' },
  { pattern: /\bdiligenciar\b/i, suggestion: 'Reemplazar por "completar" o "llenar"' },
  { pattern: /\baccionar\b/i, suggestion: 'Reemplazar por "hacer" o "actuar"' },
];

const detectCorporateSpeak = (text: string): ToneCheckIssue[] => {
  const issues: ToneCheckIssue[] = [];
  for (const { pattern, suggestion } of CORPORATE_SPEAK_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      issues.push({
        type: 'corporate-speak',
        severity: 'medium',
        problem: 'Frase corporativa que aleja a la audiencia',
        evidence: match[0],
        suggestion,
      });
    }
  }
  return issues;
};

const CLICHE_PATTERNS = [
  /\bhola querid[ao]s seguidor(es|as)\b/i,
  /\bque tengan un excelente d[ií]a\b/i,
  /\bgracias por (formar parte|acompa[ñn]arnos)\b/i,
  /\b(hoy te|hoy les) (traigo|comparto)\b/i,
  /\b(no te lo pierdas|no se lo pierdan)\b/i,
];

const detectCliches = (text: string): ToneCheckIssue[] => {
  const issues: ToneCheckIssue[] = [];
  for (const pattern of CLICHE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      issues.push({
        type: 'cliche',
        severity: 'medium',
        problem: 'Frase cliché que cualquier marca podría decir',
        evidence: match[0],
        suggestion: 'Reemplazar por algo específico de la marca',
      });
    }
  }
  return issues;
};

const detectOverPromise = (text: string): ToneCheckIssue[] => {
  const issues: ToneCheckIssue[] = [];
  const overPromisePatterns = [
    /\bgarantizad[ao]\s+(100%|al 100|para siempre)/i,
    /\bsin ning[uú]n riesgo\b/i,
    /\b(100%|el 100 por ciento) de éxito/i,
    /\bresultado[s]? garantizado[s]?\b/i,
    /\bel mejor del mundo\b/i,
    /\b(siempre|nunca) (funciona|falla)\b/i,
  ];
  for (const pattern of overPromisePatterns) {
    const match = pattern.exec(text);
    if (match) {
      issues.push({
        type: 'over-promise',
        severity: 'high',
        problem: 'Promesa exagerada que reduce credibilidad',
        evidence: match[0],
        suggestion: 'Suavizar: "muchas veces", "tiende a", agregar contexto realista',
      });
    }
  }
  return issues;
};

// ── Check completo con IA ─────────────────────────────────────────────────────

export const checkTone = async (
  text: string,
  context: OutputContext,
  options: { brand?: BrandProfile; strictMode?: boolean } = {},
): Promise<ToneCheckResult> => {
  const brand = options.brand ?? loadBrandProfile();
  const strictMode = options.strictMode ?? false;

  // Detecciones rápidas (sin AI)
  const fastIssues: ToneCheckIssue[] = [
    ...detectForbiddenWords(text, brand.voice.forbidden),
    ...detectCorporateSpeak(text),
    ...detectCliches(text),
    ...detectOverPromise(text),
  ];

  // Check profundo con IA si no hay critical en detección rápida o si strictMode
  const hasCritical = fastIssues.some((i) => i.severity === 'critical');
  if (hasCritical && !strictMode) {
    // Si hay un critical rápido, ya falla — sugerir rewrite directamente
    const rewrite = await rewriteText(text, fastIssues, brand);
    return {
      passes: false,
      score: 30,
      issues: fastIssues,
      reasonsToReject: fastIssues.filter((i) => i.severity === 'critical').map((i) => i.problem),
      suggestedRewrite: rewrite,
      voiceCharacteristicsHit: [],
      voiceCharacteristicsMiss: brand.voice.tone,
    };
  }

  // Check profundo con IA
  const prompt = `Sos editor de marca senior. Auditá si este texto respeta la voz de @${brand.name}.

VOZ DE MARCA:
- Tono: ${brand.voice.tone.join(', ')}
- Palabras prohibidas: ${brand.voice.forbidden.join(', ') || '(ninguna)'}
- Frases de referencia: ${brand.voice.referenceQuotes.join(' | ') || '(ninguna)'}
- Audiencia: ${brand.audience.description}
- Arquetipo: ${brand.brandStrategy.archetype || '(no definido)'}

CONTEXTO DEL TEXTO: ${context}
TEXTO A EVALUAR:
"""
${text}
"""

DETECCIONES PRELIMINARES:
${fastIssues.length > 0 ? fastIssues.map((i) => `- ${i.type}: ${i.problem} (evidencia: "${i.evidence}")`).join('\n') : '(ninguna)'}

Evaluá:
1. Score 0-100 (qué tanto respeta la voz de marca)
2. Características de la voz que logra (qué hace bien)
3. Características que falla (qué pierde la oportunidad)
4. Issues adicionales que la detección rápida no capturó

JSON:
{
  "passes": boolean (si el texto puede publicarse tal como está),
  "score": número 0-100,
  "additionalIssues": [
    {
      "type": "tone-mismatch | inappropriate-formality | inconsistency",
      "severity": "critical | high | medium | low",
      "problem": "descripción del problema",
      "evidence": "fragmento exacto",
      "suggestion": "cómo arreglarlo"
    }
  ],
  "voiceCharacteristicsHit": ["característica 1 que logra", "característica 2"],
  "voiceCharacteristicsMiss": ["característica 1 que pierde", "característica 2"]
}`;

  const aiResult = await routerAskJson<{
    passes: boolean;
    score: number;
    additionalIssues: ToneCheckIssue[];
    voiceCharacteristicsHit: string[];
    voiceCharacteristicsMiss: string[];
  }>(prompt, {
    taskType: 'analysis',
    maxTokens: 1500,
    systemPrompt: 'Sos editor de marca senior. Evaluás con criterio profesional, no buscás errores donde no hay.',
  });

  const allIssues = [...fastIssues, ...(aiResult.additionalIssues ?? [])];
  const reasonsToReject = allIssues
    .filter((i) => i.severity === 'critical' || i.severity === 'high')
    .map((i) => i.problem);
  const finalPasses = aiResult.passes && reasonsToReject.length === 0;

  const result: ToneCheckResult = {
    passes: finalPasses,
    score: aiResult.score,
    issues: allIssues,
    reasonsToReject,
    voiceCharacteristicsHit: aiResult.voiceCharacteristicsHit ?? [],
    voiceCharacteristicsMiss: aiResult.voiceCharacteristicsMiss ?? [],
  };

  if (!finalPasses) {
    result.suggestedRewrite = await rewriteText(text, allIssues, brand);
  }

  return result;
};

// ── Reescritura con feedback ──────────────────────────────────────────────────

const rewriteText = async (originalText: string, issues: ToneCheckIssue[], brand: BrandProfile): Promise<string> => {
  const correctionList = issues
    .map((i, idx) => `${idx + 1}. [${i.severity}] ${i.problem} → ${i.suggestion}`)
    .join('\n');

  const prompt = `Reescribí este texto aplicando estas correcciones, manteniendo el mensaje original.

TEXTO ORIGINAL:
"""
${originalText}
"""

CORRECCIONES A APLICAR:
${correctionList}

VOZ DE MARCA:
- Tono: ${brand.voice.tone.join(', ')}
- NO usar: ${brand.voice.forbidden.join(', ')}

Devolvé SOLO el texto reescrito, sin explicaciones ni prefijos. Mantené aproximadamente la misma longitud.`;

  const result = await routerAsk(prompt, { taskType: 'copywriting', maxTokens: 800 });
  return result.text.trim();
};

// ── Wrapper para validar antes de publicar ───────────────────────────────────

export interface GuardedOutputResult {
  approved: boolean;
  finalText: string;
  iterations: number;
  initialScore: number;
  finalScore: number;
  appliedRewrite: boolean;
  issuesFound: ToneCheckIssue[];
}

export const guardOutput = async (
  text: string,
  context: OutputContext,
  options: {
    brand?: BrandProfile;
    minScore?: number;
    maxIterations?: number;
    autoRewrite?: boolean;
  } = {},
): Promise<GuardedOutputResult> => {
  const brand = options.brand ?? loadBrandProfile();
  const minScore = options.minScore ?? 70;
  const maxIterations = options.maxIterations ?? 2;
  const autoRewrite = options.autoRewrite ?? true;

  let currentText = text;
  let iterations = 0;
  let firstScore = 0;

  log.debug(`[ToneGuardian] Evaluando texto (${context})...`);

  let lastResult = await checkTone(currentText, context, { brand });
  firstScore = lastResult.score;
  const allIssues = [...lastResult.issues];

  while (lastResult.score < minScore && autoRewrite && iterations < maxIterations) {
    if (!lastResult.suggestedRewrite) break;
    currentText = lastResult.suggestedRewrite;
    iterations++;
    log.debug(`[ToneGuardian] Iteración ${iterations}: re-evaluando con score ${lastResult.score} → reescritura`);
    lastResult = await checkTone(currentText, context, { brand });
    allIssues.push(...lastResult.issues);
  }

  const approved = lastResult.passes && lastResult.score >= minScore;
  if (!approved) {
    log.warn(
      `[ToneGuardian] No alcanzó score mínimo después de ${iterations} iteraciones (final: ${lastResult.score})`,
    );
  }

  return {
    approved,
    finalText: currentText,
    iterations,
    initialScore: firstScore,
    finalScore: lastResult.score,
    appliedRewrite: iterations > 0,
    issuesFound: allIssues,
  };
};

// ── Auditoría de tono sobre múltiples outputs (consistency check) ────────────

export const auditConsistency = async (
  texts: Array<{ id: string; text: string; context: OutputContext }>,
  brand?: BrandProfile,
): Promise<{
  overallScore: number;
  perText: Array<{ id: string; score: number; passes: boolean; mainIssue: string | null }>;
  inconsistencies: string[];
  recommendation: string;
}> => {
  const b = brand ?? loadBrandProfile();
  const results = await Promise.all(
    texts.map(async (t) => {
      const check = await checkTone(t.text, t.context, { brand: b });
      return { id: t.id, score: check.score, passes: check.passes, mainIssue: check.issues[0]?.problem ?? null };
    }),
  );

  const overallScore = results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length);
  const inconsistencies: string[] = [];
  const scoreVariance = Math.max(...results.map((r) => r.score)) - Math.min(...results.map((r) => r.score));
  if (scoreVariance > 30) inconsistencies.push(`Variación alta entre piezas (${scoreVariance} puntos)`);
  if (overallScore < 65) inconsistencies.push('Score promedio bajo — revisar definición de voz de marca');

  const recommendation =
    overallScore >= 80
      ? 'Voz consistente. Mantener.'
      : overallScore >= 60
        ? 'Voz aceptable pero hay piezas débiles. Refinar las más bajas.'
        : 'Voz inconsistente. Hacer un brand voice workshop antes de seguir publicando.';

  return { overallScore, perText: results, inconsistencies, recommendation };
};

// ── Convenience: validate-then-publish ────────────────────────────────────────

export const validateOrFail = async (
  text: string,
  context: OutputContext,
  options: { brand?: BrandProfile; minScore?: number } = {},
): Promise<{ ok: true; text: string } | { ok: false; reasons: string[]; suggestedRewrite: string | undefined }> => {
  const result = await guardOutput(text, context, { ...options, autoRewrite: false });
  if (result.approved) {
    return { ok: true, text: result.finalText };
  }
  return {
    ok: false,
    reasons: result.issuesFound.filter((i) => i.severity === 'critical' || i.severity === 'high').map((i) => i.problem),
    suggestedRewrite: result.finalText !== text ? result.finalText : undefined,
  };
};
