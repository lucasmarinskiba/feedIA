/**
 * Study Session — el sistema "estudia" el panorama de Instagram
 * ─────────────────────────────────────────────────────────────────────────
 * Como un alumno que repasa para no quedar desactualizado: revisa qué pudo
 * cambiar en políticas, algoritmo, features y demanda del mercado, lo
 * compara contra lo que ya tiene anotado (facts + ledger) y deja apuntes
 * nuevos con su nivel de confianza. Lo dudoso queda `needsVerification`.
 *
 * Si sospecha un cambio de POLÍTICA de alto impacto con confianza media+,
 * abre un checkpoint humano (no se cambia la estrategia a ciegas).
 *
 * Acepta `sources` opcionales (ej: texto traído por webFetch del newsroom
 * de Meta) para fundamentar el estudio en material real, no solo memoria.
 */

import { ask } from '../../agent/claude.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { createCheckpoint } from '../../agent/checkpoints.js';
import { formatFactsAsPrompt, recallFacts } from '../knowledgeBase/index.js';
import {
  recordLedgerEntry,
  pruneLedger,
  formatLedgerAsPrompt,
  type LedgerTopic,
  type LedgerConfidence,
} from './ledger.js';

export interface StudyFinding {
  topic: LedgerTopic;
  insight: string;
  confidence: LedgerConfidence;
  needsVerification: boolean;
  highImpact: boolean;
}

export interface StudyReport {
  ran: boolean;
  findings: StudyFinding[];
  recorded: number;
  pruned: number;
  checkpointId?: string;
  note: string;
}

const TOPICS: LedgerTopic[] = [
  'policy-change',
  'algorithm-shift',
  'new-feature',
  'market-demand',
  'format-trend',
  'risk',
  'best-practice',
];
const CONF: LedgerConfidence[] = ['alta', 'media', 'baja'];

interface RawStudy {
  findings?: Array<Partial<StudyFinding>>;
}

const parse = (text: string): RawStudy | null => {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  const body = fenced?.[1] ?? text;
  const a = body.indexOf('{');
  const b = body.lastIndexOf('}');
  if (a < 0 || b <= a) return null;
  try {
    return JSON.parse(body.slice(a, b + 1)) as RawStudy;
  } catch {
    return null;
  }
};

export const runStudySession = async (brand: BrandProfile, opts: { sources?: string[] } = {}): Promise<StudyReport> => {
  const { pruned } = pruneLedger();
  const facts = recallFacts({ topics: ['ranking-signal', 'feature-2026', 'shadowban-trigger'], limit: 10 });

  const sourcesBlock = (opts.sources ?? []).map((s, i) => `Fuente ${i + 1}:\n${s.slice(0, 4000)}`).join('\n\n');

  let raw: RawStudy | null = null;
  try {
    const text = await ask(
      `Estudiá el panorama ACTUAL de Instagram para una cuenta del nicho "${brand.niche}".
Detectá QUÉ PUDO CAMBIAR respecto de lo ya sabido: políticas de uso, señales del algoritmo, features nuevas, qué está pidiendo el mercado/audiencia, tendencias de formato, riesgos (shadowban/penalizaciones).

Conocimiento ya registrado (no repitas lo idéntico; enfocate en cambios o matices):
— Facts curados —
${formatFactsAsPrompt(facts)}
— Ledger vivo —
${formatLedgerAsPrompt(15)}
${sourcesBlock ? `\n— Material de fuentes para fundamentar —\n${sourcesBlock}` : ''}

Devolvé SOLO un bloque \`\`\`json:
{ "findings": [ { "topic": "policy-change|algorithm-shift|new-feature|market-demand|format-trend|risk|best-practice", "insight": "1-2 frases accionables", "confidence": "alta|media|baja", "needsVerification": true|false, "highImpact": true|false } ] }
Reglas: 3 a 8 findings. Si no tenés fuentes y es de memoria, marcá needsVerification=true salvo que sea conocimiento estable. Sé honesto con la confianza.`,
      { fast: false, maxTokens: 1600, temperature: 0.5 },
    );
    raw = parse(text);
  } catch (err) {
    log.warn(`[study] LLM falló: ${(err as Error).message}`);
    return {
      ran: false,
      findings: [],
      recorded: 0,
      pruned,
      note: `No se pudo estudiar (LLM no disponible): ${(err as Error).message}. Ledger purgado igualmente.`,
    };
  }

  if (!raw || !Array.isArray(raw.findings)) {
    return { ran: false, findings: [], recorded: 0, pruned, note: 'El estudio no devolvió hallazgos válidos.' };
  }

  const findings: StudyFinding[] = [];
  for (const f of raw.findings.slice(0, 8)) {
    if (!f.insight || !f.insight.trim()) continue;
    const topic = TOPICS.includes(f.topic as LedgerTopic) ? (f.topic as LedgerTopic) : 'best-practice';
    const confidence = CONF.includes(f.confidence as LedgerConfidence) ? (f.confidence as LedgerConfidence) : 'baja';
    const finding: StudyFinding = {
      topic,
      insight: f.insight.trim(),
      confidence,
      needsVerification: f.needsVerification !== false,
      highImpact: f.highImpact === true,
    };
    findings.push(finding);
    recordLedgerEntry({
      topic: finding.topic,
      insight: finding.insight,
      confidence: finding.confidence,
      source: opts.sources?.length ? 'estudio-con-fuentes' : 'estudio-autónomo',
      needsVerification: finding.needsVerification,
    });
  }

  // Cambio de política de alto impacto con confianza media+ → checkpoint humano.
  const critical = findings.find((f) => f.topic === 'policy-change' && f.highImpact && f.confidence !== 'baja');
  let checkpointId: string | undefined;
  if (critical) {
    const cp = createCheckpoint(
      'strategy_change',
      `Posible cambio de política de Instagram detectado en el estudio autónomo: "${critical.insight}". Verificá en la fuente oficial antes de ajustar la estrategia.`,
      `study-${Date.now().toString(36)}`,
      { topic: critical.topic, confidence: critical.confidence },
    );
    checkpointId = cp.id;
  }

  return {
    ran: true,
    findings,
    recorded: findings.length,
    pruned,
    checkpointId,
    note: `Estudio completo: ${findings.length} apunte(s) nuevo(s), ${pruned} vencido(s) purgado(s)${checkpointId ? `, checkpoint ${checkpointId} abierto` : ''}.`,
  };
};
