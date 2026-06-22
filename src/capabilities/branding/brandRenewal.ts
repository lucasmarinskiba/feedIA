/**
 * Brand Renewal de FeedIA — sistema de renovación y evolución de marca.
 *
 * Reemplaza al especialista de branding senior. Audita la marca actual,
 * detecta señales de fatiga, propone evolución manteniendo coherencia y ejecuta
 * el rebrand operativo (nueva identidad visual, nueva voz, nueva paleta).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { sendAlert } from '../../integrations/notifications.js';
import { generateImage } from '../../integrations/falAi.js';
import { generateHighlightCoverSet, generateProfilePhoto } from '../design/graphicDesigner.js';
import { getRecentPosts, getAccountSummary } from '../analytics/performanceDB.js';
import type { BrandProfile } from '../../config/types.js';

const RENEWAL_PATH = join(process.cwd(), 'data', 'branding', 'renewals.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FatigueSignal =
  | 'declining-engagement' // ER bajando 3+ meses
  | 'topic-saturation' // se notan temas repetidos
  | 'visual-monotony' // estética cansada
  | 'audience-mismatch' // ya no resuena con la audiencia actual
  | 'category-evolution' // el nicho cambió y la marca quedó atrás
  | 'positioning-drift' // se diluyó el posicionamiento
  | 'voice-inconsistency'; // tono inconsistente entre piezas

export interface BrandAuditResult {
  auditedAt: string;
  overallHealth: 'sólida' | 'estable' | 'fatigada' | 'crítica';
  score: number; // 0-100
  fatigueSignals: FatigueSignal[];
  detectedIssues: string[];
  whatWorks: string[];
  whatDoesntWork: string[];
  evolutionUrgency: 'baja' | 'media' | 'alta';
  recommendation: 'mantener' | 'refresh-sutil' | 'rebrand-parcial' | 'rebrand-total';
}

export interface BrandEvolutionProposal {
  proposalId: string;
  generatedAt: string;
  basedOnAuditAt: string;
  scope: 'visual' | 'voice' | 'positioning' | 'full';
  changes: {
    positioning?: { from: string; to: string; rationale: string };
    voice?: { from: string[]; to: string[]; rationale: string };
    visualIdentity?: {
      paletteFrom: string[];
      paletteTo: string[];
      moodFrom: string;
      moodTo: string;
      typographyShift: string;
      rationale: string;
    };
    archetype?: { from: string; to: string; rationale: string };
    contentMix?: { from: string; to: string; rationale: string };
  };
  rolloutPlan: Array<{
    phase: number;
    label: string;
    days: number;
    actions: string[];
  }>;
  risksAndMitigations: Array<{ risk: string; mitigation: string }>;
  estimatedImpact: {
    engagementUplift: string; // ej: "+15-30%"
    audienceFit: string;
    differentiationGain: string;
  };
}

export interface BrandRenewalRecord {
  id: string;
  brandName: string;
  audit: BrandAuditResult;
  proposal?: BrandEvolutionProposal;
  status: 'audited' | 'proposed' | 'approved' | 'in-rollout' | 'completed' | 'rejected';
  executedAssets: Array<{
    kind: 'profile-photo' | 'highlight-cover' | 'visual-style-board';
    url: string;
    createdAt: string;
  }>;
  startedAt: string;
  completedAt?: string;
  notes: string[];
}

interface RenewalStore {
  version: number;
  renewals: BrandRenewalRecord[];
  lastUpdated: string;
}

const DEFAULT_STORE: RenewalStore = { version: 1, renewals: [], lastUpdated: new Date().toISOString() };

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'branding');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): RenewalStore => {
  try {
    ensureDir();
    if (!existsSync(RENEWAL_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(RENEWAL_PATH, 'utf8')) as RenewalStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: RenewalStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(RENEWAL_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Paso 1: Auditoría profunda de marca ──────────────────────────────────────

export const auditBrand = async (brand: BrandProfile): Promise<BrandAuditResult> => {
  log.info(`[BrandRenewal] Auditando @${brand.name}...`);

  const recentPosts = getRecentPosts(90);
  const summary = getAccountSummary();

  // Datos cualitativos para que la IA evalúe
  const recentHooks = recentPosts
    .slice(0, 15)
    .map((p) => `"${p.hookText}"`)
    .join(' | ');
  const recentTopics = [...new Set(recentPosts.flatMap((p) => p.topics))].slice(0, 12).join(', ');

  const prompt = `Sos un especialista de branding senior con 15 años de experiencia. Auditá la salud de esta marca de Instagram.

MARCA: ${brand.name}
NICHO: ${brand.niche}
ARQUETIPO: ${brand.brandStrategy.archetype || '(no definido)'}
PROMESA: ${brand.brandStrategy.promise || '(no definida)'}
POSICIONAMIENTO: ${brand.brandStrategy.positioning || '(no definido)'}
TONO DE VOZ: ${brand.voice.tone.join(', ')}
ESTILO VISUAL: ${brand.visual.style} / ${brand.visual.mood}
PALETA: ${brand.visual.palette.join(', ') || '(no definida)'}

PERFORMANCE RECIENTE (últimos 90 días):
- Engagement rate promedio: ${summary.avgEngagementRate.toFixed(2)}%
- Tendencia: ${summary.trend}
- Total posts: ${summary.totalPosts}

HOOKS RECIENTES: ${recentHooks || '(sin posts)'}
TEMAS RECURRENTES: ${recentTopics || '(sin temas detectados)'}

Evaluá honestamente. NO seas complaciente: si hay fatiga, decilo.

JSON:
{
  "overallHealth": "sólida | estable | fatigada | crítica",
  "score": número 0-100,
  "fatigueSignals": ["declining-engagement" | "topic-saturation" | "visual-monotony" | "audience-mismatch" | "category-evolution" | "positioning-drift" | "voice-inconsistency"],
  "detectedIssues": ["problema 1 específico y concreto", "problema 2", ...],
  "whatWorks": ["fortaleza 1", "fortaleza 2"],
  "whatDoesntWork": ["debilidad 1", "debilidad 2"],
  "evolutionUrgency": "baja | media | alta",
  "recommendation": "mantener | refresh-sutil | rebrand-parcial | rebrand-total"
}`;

  const audit = await routerAskJson<Omit<BrandAuditResult, 'auditedAt'>>(prompt, {
    taskType: 'analysis',
    maxTokens: 2500,
    systemPrompt:
      'Sos un brand strategist senior. Tu análisis es directo, no complaciente, basado en señales concretas.',
  });

  const fullAudit: BrandAuditResult = { ...audit, auditedAt: new Date().toISOString() };
  log.info(`[BrandRenewal] Audit completado: ${audit.overallHealth} (${audit.score}/100) → ${audit.recommendation}`);
  return fullAudit;
};

// ── Paso 2: Propuesta de evolución ──────────────────────────────────────────

export const proposeEvolution = async (
  brand: BrandProfile,
  audit: BrandAuditResult,
  scope?: BrandEvolutionProposal['scope'],
): Promise<BrandEvolutionProposal> => {
  const inferredScope =
    scope ??
    (audit.recommendation === 'rebrand-total'
      ? 'full'
      : audit.recommendation === 'rebrand-parcial'
        ? 'visual'
        : audit.recommendation === 'refresh-sutil'
          ? 'visual'
          : 'voice');

  log.info(`[BrandRenewal] Proponiendo evolución (scope: ${inferredScope})...`);

  const prompt = `Sos un brand strategist senior. Diseñá la propuesta de evolución para esta marca según el audit.

MARCA ACTUAL:
- Nombre: ${brand.name}
- Posicionamiento actual: ${brand.brandStrategy.positioning}
- Tono: ${brand.voice.tone.join(', ')}
- Paleta: ${brand.visual.palette.join(', ') || '(no definida)'}
- Mood: ${brand.visual.mood}
- Arquetipo: ${brand.brandStrategy.archetype || '(no definido)'}

AUDIT:
- Score: ${audit.score}/100 (${audit.overallHealth})
- Recommendation: ${audit.recommendation}
- Issues: ${audit.detectedIssues.join(' | ')}
- What doesn't work: ${audit.whatDoesntWork.join(' | ')}
- Fatigue signals: ${audit.fatigueSignals.join(', ')}

SCOPE de propuesta: ${inferredScope}

Devolvé una propuesta REALISTA y EJECUTABLE en 4-8 semanas (no un rebrand fantasioso):

JSON:
{
  "scope": "${inferredScope}",
  "changes": {
    "positioning": { "from": "actual", "to": "nuevo posicionamiento concreto", "rationale": "por qué este cambio" },
    "voice": { "from": ["tono actual 1", "actual 2"], "to": ["nuevo tono 1", "nuevo 2"], "rationale": "por qué" },
    "visualIdentity": {
      "paletteFrom": ["${brand.visual.palette.join('","') || ''}"],
      "paletteTo": ["#hex1", "#hex2", "#hex3"],
      "moodFrom": "${brand.visual.mood}",
      "moodTo": "nuevo mood",
      "typographyShift": "ej: 'de sans serif geométrico a sans serif humanista'",
      "rationale": "por qué"
    },
    "archetype": { "from": "actual", "to": "nuevo arquetipo", "rationale": "..." },
    "contentMix": { "from": "actual ej: '60% educativo + 30% inspiracional + 10% promocional'", "to": "nuevo mix", "rationale": "..." }
  },
  "rolloutPlan": [
    { "phase": 1, "label": "Anuncio + teaser", "days": 7, "actions": ["acción 1", "acción 2"] },
    { "phase": 2, "label": "Migración visual", "days": 14, "actions": [] },
    { "phase": 3, "label": "Reinforcement", "days": 21, "actions": [] }
  ],
  "risksAndMitigations": [
    { "risk": "perder seguidores que vinieron por la marca vieja", "mitigation": "comunicar el por qué del cambio con honestidad" }
  ],
  "estimatedImpact": {
    "engagementUplift": "+X-Y%",
    "audienceFit": "descripción",
    "differentiationGain": "descripción"
  }
}`;

  const proposal = await routerAskJson<Omit<BrandEvolutionProposal, 'proposalId' | 'generatedAt' | 'basedOnAuditAt'>>(
    prompt,
    {
      taskType: 'strategy',
      maxTokens: 3500,
      systemPrompt: 'Sos brand strategist senior. Propuestas concretas, ejecutables y honestas. No rebrand fantasioso.',
    },
  );

  const fullProposal: BrandEvolutionProposal = {
    proposalId: `proposal-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    generatedAt: new Date().toISOString(),
    basedOnAuditAt: audit.auditedAt,
    ...proposal,
  };

  log.info(
    `[BrandRenewal] Propuesta generada: ${fullProposal.rolloutPlan.length} fases (${fullProposal.rolloutPlan.reduce((s, p) => s + p.days, 0)} días totales)`,
  );
  return fullProposal;
};

// ── Paso 3: Generar nuevos assets visuales ───────────────────────────────────

export const generateRenewalAssets = async (
  brand: BrandProfile,
  proposal: BrandEvolutionProposal,
): Promise<BrandRenewalRecord['executedAssets']> => {
  log.info(`[BrandRenewal] Generando nuevos assets para @${brand.name}...`);

  const assets: BrandRenewalRecord['executedAssets'] = [];

  // 1. Profile photo si hay cambio visual
  if (proposal.changes.visualIdentity || proposal.scope === 'full' || proposal.scope === 'visual') {
    const newPalette = proposal.changes.visualIdentity?.paletteTo ?? brand.visual.palette;
    const newMood = proposal.changes.visualIdentity?.moodTo ?? brand.visual.mood;

    const evolvedBrand: BrandProfile = {
      ...brand,
      visual: { ...brand.visual, palette: newPalette, mood: newMood },
    };

    try {
      const profileResult = await generateProfilePhoto(
        `Profile photo profesional para @${brand.name}, mood ${newMood}`,
        evolvedBrand,
        2,
      );
      for (const variant of profileResult.variants) {
        assets.push({ kind: 'profile-photo', url: variant.url, createdAt: new Date().toISOString() });
      }
    } catch (err) {
      log.warn(`[BrandRenewal] Profile photo falló: ${(err as Error).message}`);
    }

    // 2. Set de highlight covers (mínimo viable)
    try {
      const highlightSet = await generateHighlightCoverSet(
        [
          { name: 'Sobre mí', concept: 'Cover minimalista representando identidad' },
          { name: 'Servicios', concept: 'Cover representando oferta de valor' },
          { name: 'Testimonios', concept: 'Cover representando prueba social' },
          { name: 'Detrás', concept: 'Cover representando "behind the scenes"' },
        ],
        evolvedBrand,
      );
      for (const h of highlightSet) {
        if (h.imageUrl) assets.push({ kind: 'highlight-cover', url: h.imageUrl, createdAt: new Date().toISOString() });
      }
    } catch (err) {
      log.warn(`[BrandRenewal] Highlight covers fallaron: ${(err as Error).message}`);
    }

    // 3. Style board (1 imagen referencial del nuevo estilo)
    try {
      const styleBoardPrompt = `Style board / moodboard que ilustre la nueva identidad visual de marca: ${newMood}, paleta ${newPalette.join(', ')}, ${proposal.changes.visualIdentity?.typographyShift ?? 'tipografía moderna'}`;
      const styleResult = await generateImage({
        prompt: styleBoardPrompt,
        preset: 'instagram-post',
        model: 'recraft-v3',
      });
      const firstImg = styleResult.images[0];
      if (firstImg) {
        assets.push({ kind: 'visual-style-board', url: firstImg.url, createdAt: new Date().toISOString() });
      }
    } catch (err) {
      log.warn(`[BrandRenewal] Style board falló: ${(err as Error).message}`);
    }
  }

  log.info(`[BrandRenewal] ✓ ${assets.length} assets generados`);
  return assets;
};

// ── Orquestador completo: audit → propose → execute ─────────────────────────

export const runFullRenewal = async (brand: BrandProfile): Promise<BrandRenewalRecord> => {
  log.info(`[BrandRenewal] 🎨 Iniciando renovación completa de @${brand.name}`);

  const audit = await auditBrand(brand);

  const record: BrandRenewalRecord = {
    id: `renewal-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    brandName: brand.name,
    audit,
    status: 'audited',
    executedAssets: [],
    startedAt: new Date().toISOString(),
    notes: [],
  };

  // Solo proponer si la urgencia lo justifica
  if (audit.recommendation !== 'mantener') {
    const proposal = await proposeEvolution(brand, audit);
    record.proposal = proposal;
    record.status = 'proposed';

    // Notificar al usuario que hay una propuesta para revisar
    await sendAlert({
      severity: 'info',
      title: `${brand.name}: propuesta de evolución de marca lista`,
      body: `Audit: ${audit.overallHealth} (${audit.score}/100)\nRecomendación: ${audit.recommendation}\nFases del plan: ${proposal.rolloutPlan.length}\nImpacto estimado: ${proposal.estimatedImpact.engagementUplift}`,
      metadata: { renewalId: record.id, proposalId: proposal.proposalId },
    }).catch(() => undefined);
  } else {
    record.notes.push('Audit indica que no es necesaria una renovación. Mantener marca actual.');
  }

  // Persistir
  const store = loadStore();
  store.renewals.push(record);
  saveStore(store);

  return record;
};

// ── Aprobar y ejecutar (después del checkpoint humano) ──────────────────────

export const approveAndExecuteRenewal = async (
  renewalId: string,
  brand: BrandProfile,
): Promise<BrandRenewalRecord | null> => {
  const store = loadStore();
  const record = store.renewals.find((r) => r.id === renewalId);
  if (!record) return null;
  if (record.status !== 'proposed' && record.status !== 'approved') {
    log.warn(`[BrandRenewal] Renewal ${renewalId} en estado ${record.status}, no se puede ejecutar`);
    return record;
  }
  if (!record.proposal) {
    log.warn(`[BrandRenewal] Renewal ${renewalId} sin propuesta, no se puede ejecutar`);
    return record;
  }

  record.status = 'in-rollout';
  saveStore(store);

  const assets = await generateRenewalAssets(brand, record.proposal);
  record.executedAssets = assets;
  record.status = 'completed';
  record.completedAt = new Date().toISOString();

  saveStore(store);

  await sendAlert({
    severity: 'info',
    title: `${brand.name}: renovación de marca ejecutada`,
    body: `Se generaron ${assets.length} nuevos assets visuales (profile photo, highlight covers, style board).`,
    metadata: { renewalId: record.id, assetsCount: assets.length },
  }).catch(() => undefined);

  log.info(`[BrandRenewal] ✓ Renovación completada para @${brand.name}`);
  return record;
};

// ── Consultas ─────────────────────────────────────────────────────────────────

export const listRenewals = (limit = 10): BrandRenewalRecord[] => loadStore().renewals.slice(-limit).reverse();

export const getRenewal = (renewalId: string): BrandRenewalRecord | null =>
  loadStore().renewals.find((r) => r.id === renewalId) ?? null;

export const getLatestAudit = (brandName: string): BrandAuditResult | null => {
  const renewals = loadStore().renewals.filter((r) => r.brandName === brandName);
  if (renewals.length === 0) return null;
  return renewals[renewals.length - 1]?.audit ?? null;
};
