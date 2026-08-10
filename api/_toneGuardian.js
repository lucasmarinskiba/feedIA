/**
 * Tone Guardian — valida y corrige la voz de marca en cada output público.
 *
 * Port de src/capabilities/community/toneGuardian.ts (Railway/Express) a
 * Vercel serverless: usa _llm.js (router multi-provider $0-first) y
 * _accountMemory.js (perfil por cuenta) en vez de config/tokenRouter de Railway.
 *
 * Cada caption, DM, comentario o anuncio pasa por acá antes de salir con la
 * marca. Reemplaza al CM que cuida consistencia de tono — sin esto, cada
 * agente (copyEngine, communityEngine, autopilotCreate) define tono por su
 * cuenta sin un punto de control único.
 *
 * Degradación honesta: si no hay LLM disponible (sin API keys), usa solo la
 * detección rápida por regex — no bloquea el pipeline, no inventa un score.
 */

import { askLLM, askLLMJson } from './_llm.js';
import { getProfile } from './_accountMemory.js';

// ── Voz de marca por defecto (si la cuenta no configuró nada aún) ────────────
const DEFAULT_VOICE = {
  tone: ['auténtico', 'directo', 'cercano'],
  forbidden: [],
  referenceQuotes: [],
};

// ── Detección rápida (sin LLM, $0) ────────────────────────────────────────────

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const detectForbiddenWords = (text, forbidden) => {
  const issues = [];
  for (const word of forbidden || []) {
    const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, 'i');
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

const detectCorporateSpeak = (text) => {
  const issues = [];
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

const detectCliches = (text) => {
  const issues = [];
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

const detectOverPromise = (text) => {
  const issues = [];
  const patterns = [
    /\bgarantizad[ao]\s+(100%|al 100|para siempre)/i,
    /\bsin ning[uú]n riesgo\b/i,
    /\b(100%|el 100 por ciento) de éxito/i,
    /\bresultado[s]? garantizado[s]?\b/i,
    /\bel mejor del mundo\b/i,
    /\b(siempre|nunca) (funciona|falla)\b/i,
  ];
  for (const pattern of patterns) {
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

const runFastChecks = (text, voice) => [
  ...detectForbiddenWords(text, voice.forbidden),
  ...detectCorporateSpeak(text),
  ...detectCliches(text),
  ...detectOverPromise(text),
];

// ── Reescritura con feedback ──────────────────────────────────────────────────

const rewriteText = async (originalText, issues, voice) => {
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
- Tono: ${(voice.tone || []).join(', ')}
- NO usar: ${(voice.forbidden || []).join(', ') || '(ninguna)'}

Devolvé SOLO el texto reescrito, sin explicaciones ni prefijos. Mantené aproximadamente la misma longitud.`;

  const text = await askLLM(prompt, { maxTokens: 800, temperature: 0.6 });
  return (text || originalText).trim();
};

// ── Check completo (rápido + IA) ──────────────────────────────────────────────

export const checkTone = async (text, context, options = {}) => {
  const voice = options.voice || DEFAULT_VOICE;
  const strictMode = options.strictMode ?? false;

  const fastIssues = runFastChecks(text, voice);
  const hasCritical = fastIssues.some((i) => i.severity === 'critical');

  if (hasCritical && !strictMode) {
    const rewrite = await rewriteText(text, fastIssues, voice);
    return {
      passes: false,
      score: 30,
      issues: fastIssues,
      reasonsToReject: fastIssues.filter((i) => i.severity === 'critical').map((i) => i.problem),
      suggestedRewrite: rewrite,
      voiceCharacteristicsHit: [],
      voiceCharacteristicsMiss: voice.tone || [],
    };
  }

  const prompt = `Sos editor de marca senior. Auditá si este texto respeta la voz de marca.

VOZ DE MARCA:
- Tono: ${(voice.tone || []).join(', ')}
- Palabras prohibidas: ${(voice.forbidden || []).join(', ') || '(ninguna)'}
- Frases de referencia: ${(voice.referenceQuotes || []).join(' | ') || '(ninguna)'}

CONTEXTO DEL TEXTO: ${context}
TEXTO A EVALUAR:
"""
${text}
"""

DETECCIONES PRELIMINARES:
${fastIssues.length > 0 ? fastIssues.map((i) => `- ${i.type}: ${i.problem} (evidencia: "${i.evidence}")`).join('\n') : '(ninguna)'}

Evaluá:
1. Score 0-100 (qué tanto respeta la voz de marca)
2. Características de la voz que logra
3. Características que falla
4. Issues adicionales que la detección rápida no capturó

JSON:
{
  "passes": boolean,
  "score": número 0-100,
  "additionalIssues": [{"type": "tone-mismatch | inappropriate-formality | inconsistency", "severity": "critical | high | medium | low", "problem": "...", "evidence": "...", "suggestion": "..."}],
  "voiceCharacteristicsHit": ["..."],
  "voiceCharacteristicsMiss": ["..."]
}`;

  const aiResult = await askLLMJson(prompt, {
    maxTokens: 1500,
    system: 'Sos editor de marca senior. Evaluás con criterio profesional, no buscás errores donde no hay.',
  });

  // Sin LLM disponible (sin API keys configuradas) — degradar a solo detección
  // rápida en vez de bloquear el pipeline o inventar un score.
  if (!aiResult) {
    const rejects = fastIssues.filter((i) => i.severity === 'critical' || i.severity === 'high');
    return {
      passes: rejects.length === 0,
      score: fastIssues.length === 0 ? 85 : 60,
      issues: fastIssues,
      reasonsToReject: rejects.map((i) => i.problem),
      suggestedRewrite: rejects.length > 0 ? await rewriteText(text, fastIssues, voice) : undefined,
      voiceCharacteristicsHit: [],
      voiceCharacteristicsMiss: [],
      degraded: 'sin-llm',
    };
  }

  const allIssues = [...fastIssues, ...(aiResult.additionalIssues ?? [])];
  const reasonsToReject = allIssues
    .filter((i) => i.severity === 'critical' || i.severity === 'high')
    .map((i) => i.problem);
  const finalPasses = Boolean(aiResult.passes) && reasonsToReject.length === 0;

  const result = {
    passes: finalPasses,
    score: aiResult.score ?? 50,
    issues: allIssues,
    reasonsToReject,
    voiceCharacteristicsHit: aiResult.voiceCharacteristicsHit ?? [],
    voiceCharacteristicsMiss: aiResult.voiceCharacteristicsMiss ?? [],
  };

  if (!finalPasses) {
    result.suggestedRewrite = await rewriteText(text, allIssues, voice);
  }

  return result;
};

// ── Wrapper para validar antes de publicar ───────────────────────────────────

export const guardOutput = async (text, context, options = {}) => {
  const voice = options.voice || DEFAULT_VOICE;
  const minScore = options.minScore ?? 70;
  const maxIterations = options.maxIterations ?? 2;
  const autoRewrite = options.autoRewrite ?? true;

  let currentText = text;
  let iterations = 0;
  let firstScore = 0;

  let lastResult = await checkTone(currentText, context, { voice });
  firstScore = lastResult.score;
  const allIssues = [...lastResult.issues];

  while (lastResult.score < minScore && autoRewrite && iterations < maxIterations) {
    if (!lastResult.suggestedRewrite) break;
    currentText = lastResult.suggestedRewrite;
    iterations++;
    lastResult = await checkTone(currentText, context, { voice });
    allIssues.push(...lastResult.issues);
  }

  const approved = lastResult.passes && lastResult.score >= minScore;

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

// ── Convenience: validate-then-publish ────────────────────────────────────────

export const validateOrFail = async (text, context, options = {}) => {
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

// ── Carga la voz de marca configurada para una cuenta (o el default) ─────────

export const loadVoiceForAccount = async (scope, accountId) => {
  const profile = await getProfile(scope, accountId).catch(() => null);
  if (!profile) return DEFAULT_VOICE;
  return {
    tone: Array.isArray(profile.voiceTone) && profile.voiceTone.length ? profile.voiceTone : DEFAULT_VOICE.tone,
    forbidden: Array.isArray(profile.voiceForbidden) ? profile.voiceForbidden : DEFAULT_VOICE.forbidden,
    referenceQuotes: Array.isArray(profile.voiceReferenceQuotes)
      ? profile.voiceReferenceQuotes
      : DEFAULT_VOICE.referenceQuotes,
  };
};

// ── Auditoría de consistencia sobre múltiples outputs ─────────────────────────

export const auditConsistency = async (texts, voice = DEFAULT_VOICE) => {
  const results = await Promise.all(
    texts.map(async (t) => {
      const check = await checkTone(t.text, t.context, { voice });
      return { id: t.id, score: check.score, passes: check.passes, mainIssue: check.issues[0]?.problem ?? null };
    }),
  );

  const overallScore = results.reduce((s, r) => s + r.score, 0) / Math.max(1, results.length);
  const inconsistencies = [];
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

// ── HTTP handler ───────────────────────────────────────────────────────────────

export const handleToneGuardian = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/tone-guardian/check' && m === 'POST') {
    const b = body || {};
    if (!b.text) return json(400, { ok: false, error: 'falta "text"' });
    const scope = ctx.userId || 'anon';
    const voice = b.voice || (await loadVoiceForAccount(scope, b.accountId || scope));
    const result = await checkTone(b.text, b.context || 'caption', { voice, strictMode: Boolean(b.strictMode) });
    return json(200, { ok: true, ...result });
  }

  if (path === '/api/tone-guardian/guard' && m === 'POST') {
    const b = body || {};
    if (!b.text) return json(400, { ok: false, error: 'falta "text"' });
    const scope = ctx.userId || 'anon';
    const voice = b.voice || (await loadVoiceForAccount(scope, b.accountId || scope));
    const result = await guardOutput(b.text, b.context || 'caption', {
      voice,
      minScore: b.minScore,
      autoRewrite: b.autoRewrite !== false,
    });
    return json(200, { ok: true, ...result });
  }

  if (path === '/api/tone-guardian/voice' && m === 'GET') {
    const scope = ctx.userId || 'anon';
    const accountId = req?.query?.accountId || scope;
    const voice = await loadVoiceForAccount(scope, accountId);
    return json(200, { ok: true, voice });
  }

  if (path === '/api/tone-guardian/voice' && m === 'POST') {
    const b = body || {};
    const scope = ctx.userId || 'anon';
    const accountId = b.accountId || scope;
    const { saveProfile } = await import('./_accountMemory.js');
    await saveProfile(scope, accountId, {
      voiceTone: Array.isArray(b.tone) ? b.tone : undefined,
      voiceForbidden: Array.isArray(b.forbidden) ? b.forbidden : undefined,
      voiceReferenceQuotes: Array.isArray(b.referenceQuotes) ? b.referenceQuotes : undefined,
    });
    const voice = await loadVoiceForAccount(scope, accountId);
    return json(200, { ok: true, voice });
  }

  return false;
};
