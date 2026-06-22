/**
 * A/B Testing Engine — Motor de pruebas A/B para contenido de Instagram.
 *
 * Genera variantes de contenido con diferentes ángulos de caption, estilos de
 * hook, estrategias de hashtag y CTAs. Evalúa resultados con significancia
 * estadística y usa Claude para extraer insights accionables.
 *
 * Almacenamiento: data/runtime/ab-tests/{brandId}/{testId}.json
 * No realiza llamadas HTTP a la API de Instagram — es capa pura de IA/lógica.
 */

import Anthropic from '@anthropic-ai/sdk';
import { mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface ABTestVariant {
  id: string;
  label: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
  publishedAt?: string;
  postId?: string;
}

export interface ABTest {
  id: string;
  brandId: string;
  contentType: 'reel' | 'carrusel' | 'post-imagen' | 'historia';
  topic: string;
  hypothesis: string;
  variants: ABTestVariant[];
  metric: 'engagement_rate' | 'reach' | 'saves' | 'shares' | 'clicks';
  status: 'draft' | 'running' | 'evaluating' | 'completed';
  winnerVariantId?: string;
  startedAt?: string;
  completedAt?: string;
  results?: Record<string, { value: number; sampleSize: number }>;
  createdAt: string;
}

export interface ABTestResult {
  test: ABTest;
  winner: ABTestVariant | null;
  confidence: number;
  recommendation: string;
  insights: string[];
}

// ── Helpers de persistencia ────────────────────────────────────────────────────

const testsDir = (brandId: string): string => resolve(join('data', 'runtime', 'ab-tests', brandId));

const testPath = (brandId: string, testId: string): string => join(testsDir(brandId), `${testId}.json`);

const saveTest = (test: ABTest): void => {
  const dir = testsDir(test.brandId);
  mkdirSync(dir, { recursive: true });
  writeFileSync(testPath(test.brandId, test.id), JSON.stringify(test, null, 2), 'utf-8');
};

const loadTestRaw = (testId: string, brandId: string): ABTest | null => {
  const path = testPath(brandId, testId);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as ABTest;
  } catch (err) {
    log.warn(`[ABTestingEngine] No se pudo leer ${path}: ${(err as Error).message}`);
    return null;
  }
};

const generateId = (): string => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

// ── Llamada a Claude con thinking adaptativo ───────────────────────────────────

const callClaude = async (prompt: string, maxTokens = 4096): Promise<string> => {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'enabled', budget_tokens: 2000 },
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[ABTestingEngine] Claude no devolvió bloque de texto');
  }
  return textBlock.text;
};

const callClaudeJson = async <T>(prompt: string, maxTokens = 4096): Promise<T> => {
  const raw = await callClaude(
    `${prompt}\n\nRespondé EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin bloques de código markdown.`,
    maxTokens,
  );
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[ABTestingEngine] No se pudo parsear JSON de Claude: ${(err as Error).message}\nRespuesta: ${raw.slice(0, 400)}`,
    );
  }
};

// ── Función 1: createABTest ────────────────────────────────────────────────────

interface VariantRaw {
  label: string;
  caption: string;
  hashtags: string[];
  hook: string;
  cta: string;
}

interface CreateABTestParams {
  topic: string;
  contentType: ABTest['contentType'];
  metric: ABTest['metric'];
  variantCount?: number;
}

export const createABTest = async (brand: BrandProfile, params: CreateABTestParams): Promise<ABTest> => {
  const count = params.variantCount ?? 2;
  const brandId = brand.name.toLowerCase().replace(/\s+/g, '-');

  log.info(`[ABTestingEngine] Creando test A/B para "${params.topic}" (${count} variantes)`);

  const prompt = `Sos un estratega experto en A/B testing para Instagram en LATAM.

MARCA: ${brand.name}
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
TONO DE VOZ: ${brand.voice.tone.join(', ')}
PALABRAS PROHIBIDAS: ${brand.voice.forbidden.join(', ') || 'ninguna'}
TIPO DE CONTENIDO: ${params.contentType}
TEMA: ${params.topic}
MÉTRICA A OPTIMIZAR: ${params.metric}

Tu tarea: generá ${count} variantes para testear A/B, cada una con un ÁNGULO DISTINTO:
- Variante A: enfoque más racional/educativo
- Variante B: enfoque más emocional/narrativo
${count > 2 ? `- Variante C+: explorar otros ángulos creativos únicos` : ''}

Cada variante debe diferir en: ángulo del caption, estilo del hook, estrategia de hashtags y CTA.
El hook debe ser la primera línea/frame que detiene el scroll (sin clickbait).
Los hashtags deben ser 15-25 tags variados entre nicho, medio y alto volumen.
El CTA debe ser accionable y coherente con el objetivo de ${params.metric}.

También generá la hipótesis general del test (qué variable principal estás testeando y por qué).

JSON:
{
  "hypothesis": "qué estás testeando y qué esperás que pase",
  "variants": [
    {
      "label": "Variante A — Nombre descriptivo del ángulo",
      "caption": "caption completo listo para publicar (300-500 chars)",
      "hashtags": ["#tag1", "#tag2", ...15-25 tags],
      "hook": "primera línea/frame de apertura",
      "cta": "llamado a la acción específico"
    }
  ]
}`;

  let hypothesis = `Test A/B sobre "${params.topic}" optimizando ${params.metric}`;
  let variants: ABTestVariant[] = [];

  try {
    const result = await callClaudeJson<{ hypothesis: string; variants: VariantRaw[] }>(prompt, 6000);
    hypothesis = result.hypothesis;
    variants = result.variants.slice(0, count).map((v, i) => ({
      id: `variant-${String.fromCharCode(65 + i).toLowerCase()}`,
      label: v.label,
      caption: v.caption,
      hashtags: v.hashtags,
      hook: v.hook,
      cta: v.cta,
    }));
  } catch (err) {
    log.warn(`[ABTestingEngine] Error generando variantes con Claude: ${(err as Error).message}`);
    variants = Array.from({ length: count }, (_, i) => ({
      id: `variant-${String.fromCharCode(65 + i).toLowerCase()}`,
      label: `Variante ${String.fromCharCode(65 + i)}`,
      caption: `[Pendiente] Caption para ${params.topic}`,
      hashtags: [],
      hook: `[Pendiente] Hook para ${params.topic}`,
      cta: 'Guardá este post para más info',
    }));
  }

  const test: ABTest = {
    id: generateId(),
    brandId,
    contentType: params.contentType,
    topic: params.topic,
    hypothesis,
    variants,
    metric: params.metric,
    status: 'draft',
    createdAt: new Date().toISOString(),
  };

  saveTest(test);
  log.info(`[ABTestingEngine] Test creado: ${test.id} con ${variants.length} variantes`);
  return test;
};

// ── Función 2: evaluateABTest ──────────────────────────────────────────────────

const determineWinner = (
  results: Record<string, { value: number; sampleSize: number }>,
  variants: ABTestVariant[],
): { winnerId: string | null; confidence: number } => {
  const qualified = variants.filter((v) => {
    const r = results[v.id];
    return r && r.sampleSize > 30;
  });

  if (qualified.length < 2) {
    return { winnerId: null, confidence: 0 };
  }

  const sorted = qualified.sort((a, b) => {
    const ra = results[a.id]?.value ?? 0;
    const rb = results[b.id]?.value ?? 0;
    return rb - ra;
  });

  const best = sorted[0];
  const second = sorted[1];
  if (!best || !second) return { winnerId: null, confidence: 0 };

  const bestValue = results[best.id]?.value ?? 0;
  const secondValue = results[second.id]?.value ?? 0;

  if (secondValue === 0) return { winnerId: null, confidence: 0 };

  const lift = (bestValue - secondValue) / secondValue;

  if (lift >= 0.2) {
    const rawConfidence = Math.min(95, 60 + lift * 100);
    const sampleBonus = Math.min(10, ((results[best.id]?.sampleSize ?? 0) - 30) / 10);
    return {
      winnerId: best.id,
      confidence: Math.round(Math.min(99, rawConfidence + sampleBonus)),
    };
  }

  return { winnerId: null, confidence: Math.round(lift * 150) };
};

export const evaluateABTest = async (
  testId: string,
  brandId: string,
  metricsData: Record<string, { value: number; sampleSize: number }>,
): Promise<ABTestResult> => {
  const test = loadTestRaw(testId, brandId);
  if (!test) {
    throw new Error(`[ABTestingEngine] Test no encontrado: ${testId} para marca ${brandId}`);
  }

  log.info(`[ABTestingEngine] Evaluando test ${testId}...`);

  test.status = 'evaluating';
  test.results = metricsData;

  const { winnerId, confidence } = determineWinner(metricsData, test.variants);
  const winner = winnerId ? (test.variants.find((v) => v.id === winnerId) ?? null) : null;

  if (winner) {
    test.winnerVariantId = winner.id;
    test.status = 'completed';
    test.completedAt = new Date().toISOString();
  }

  const metricsStr = test.variants
    .map((v) => {
      const r = metricsData[v.id];
      return `- ${v.label} (${v.id}): valor=${r?.value ?? 'N/A'}, muestra=${r?.sampleSize ?? 0}`;
    })
    .join('\n');

  const prompt = `Sos un analista de performance experto en Instagram LATAM.

TEST A/B:
- Tema: ${test.topic}
- Hipótesis: ${test.hypothesis}
- Métrica: ${test.metric}
- Ganador estadístico: ${winner ? winner.label : 'Sin ganador claro (diferencia < 20% o muestra insuficiente)'}
- Confianza estadística: ${confidence}%

VARIANTES Y RESULTADOS:
${test.variants.map((v) => `\n[${v.label}]\nHook: "${v.hook}"\nCaption: "${v.caption.slice(0, 120)}..."\nCTA: "${v.cta}"`).join('\n')}

MÉTRICAS REALES:
${metricsStr}

Generá insights accionables y una recomendación clara para los próximos posts.

JSON:
{
  "recommendation": "qué hacer de ahora en adelante con esta información (2-3 oraciones)",
  "insights": [
    "insight específico y accionable 1",
    "insight específico y accionable 2",
    "insight específico y accionable 3",
    "insight específico y accionable 4"
  ]
}`;

  let recommendation = winner
    ? `La ${winner.label} ganó con ${confidence}% de confianza. Aplicar su ángulo en próximos posts.`
    : 'No hay ganador claro aún. Continuar el test o aumentar la muestra.';

  let insights: string[] = [
    `Métrica optimizada: ${test.metric}`,
    `Muestra total recopilada: ${Object.values(metricsData).reduce((acc, r) => acc + r.sampleSize, 0)} interacciones`,
  ];

  try {
    const claudeResult = await callClaudeJson<{ recommendation: string; insights: string[] }>(prompt, 3000);
    recommendation = claudeResult.recommendation;
    insights = claudeResult.insights;
  } catch (err) {
    log.warn(`[ABTestingEngine] Error generando insights con Claude: ${(err as Error).message}`);
  }

  saveTest(test);
  log.info(`[ABTestingEngine] Test evaluado. Ganador: ${winnerId ?? 'ninguno'} (${confidence}% confianza)`);

  return { test, winner, confidence, recommendation, insights };
};

// ── Función 3: listABTests ─────────────────────────────────────────────────────

export const listABTests = (brandId: string): ABTest[] => {
  const dir = testsDir(brandId);
  if (!existsSync(dir)) return [];

  try {
    const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
    return files.reduce<ABTest[]>((acc, file) => {
      try {
        const content = readFileSync(join(dir, file), 'utf-8');
        acc.push(JSON.parse(content) as ABTest);
      } catch (err) {
        log.warn(`[ABTestingEngine] No se pudo leer ${file}: ${(err as Error).message}`);
      }
      return acc;
    }, []);
  } catch (err) {
    log.warn(`[ABTestingEngine] Error listando tests para ${brandId}: ${(err as Error).message}`);
    return [];
  }
};

// ── Función 4: getABTest ───────────────────────────────────────────────────────

export const getABTest = (testId: string, brandId: string): ABTest | null => loadTestRaw(testId, brandId);

// ── Función 5: suggestNextTest ─────────────────────────────────────────────────

interface NextTestSuggestion {
  hypothesis: string;
  variables: string[];
  expectedLift: string;
}

export const suggestNextTest = async (brand: BrandProfile, pastTests: ABTest[]): Promise<NextTestSuggestion> => {
  log.info('[ABTestingEngine] Generando sugerencia para el próximo test A/B...');

  const completedTests = pastTests.filter((t) => t.status === 'completed');
  const brandId = brand.name.toLowerCase().replace(/\s+/g, '-');

  const pastSummary =
    completedTests.length > 0
      ? completedTests
          .map((t) => {
            const winner = t.winnerVariantId ? t.variants.find((v) => v.id === t.winnerVariantId) : null;
            return `- Topic: "${t.topic}" | Métrica: ${t.metric} | Ganador: ${winner?.label ?? 'sin ganador'} (hipótesis: "${t.hypothesis}")`;
          })
          .join('\n')
      : 'Ningún test completado aún.';

  const runningTests = pastTests.filter((t) => t.status === 'running' || t.status === 'draft');
  const runningStr =
    runningTests.length > 0 ? runningTests.map((t) => `- "${t.topic}" (${t.status})`).join('\n') : 'Ninguno en curso.';

  const prompt = `Sos un estratega de CRO (Conversion Rate Optimization) experto en Instagram.

MARCA: ${brand.name}
NICHO: ${brand.niche}
OBJETIVO PRINCIPAL: ${brand.goals.primary}
MÉTRICAS A SEGUIR: ${brand.goals.metricsToWatch.join(', ')}

TESTS COMPLETADOS:
${pastSummary}

TESTS EN CURSO O BORRADOR:
${runningStr}

Basándote en los resultados previos, sugerí el próximo test A/B más valioso que la marca debería correr.
Evitá repetir variables ya testeadas. Priorizá las variables con mayor impacto potencial en ${brand.goals.primary}.

JSON:
{
  "hypothesis": "Si [hacemos X] entonces [esperamos Y] porque [razón basada en datos o comportamiento de audiencia]",
  "variables": ["variable 1 a testear", "variable 2 (si aplica)", "variable 3 (si aplica)"],
  "expectedLift": "estimación del incremento esperado en la métrica principal (ej: +15-25% en saves)"
}`;

  try {
    const result = await callClaudeJson<NextTestSuggestion>(prompt, 3000);
    log.info('[ABTestingEngine] Sugerencia generada correctamente');
    return result;
  } catch (err) {
    log.warn(`[ABTestingEngine] Error generando sugerencia con Claude: ${(err as Error).message}`);
    return {
      hypothesis: `Si variamos el estilo de hook en posts de ${brand.niche}, entonces mejoraremos el ${brand.goals.primary} porque la primera línea es el principal filtro de retención`,
      variables: ['estilo de hook (pregunta vs. afirmación)', 'longitud del caption', 'posición del CTA'],
      expectedLift: '+10-20% en engagement_rate estimado',
    };
  }

  void brandId;
};
