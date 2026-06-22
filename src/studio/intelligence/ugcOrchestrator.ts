import type { NicheCategory } from './nicheAnalyzer.js';
import type { RetentionScript } from './hookEnforcer.js';

export type UGCVideoFormat = '9:16' | '1:1' | '4:5' | '16:9';

export type UGCBriefStatus =
  | 'draft'
  | 'posted'
  | 'claimed'
  | 'in-production'
  | 'submitted'
  | 'qa-review'
  | 'approved'
  | 'revision-requested'
  | 'delivered';

export interface CreatorProfile {
  id: string;
  handle: string;
  platform: 'instagram' | 'tiktok' | 'both';
  niche: NicheCategory;
  followerRange: 'nano' | 'micro' | 'mid' | 'macro';
  avgEngagementRate: number;
  deliveryDays: number;
  pricePerVideo: number;
  sampleVideoUrl?: string;
  specialties: string[];
  rating: number;
  completedBriefs: number;
  approvalRate: number;
}

export interface UGCRequirements {
  format: UGCVideoFormat;
  minDuration: number;
  maxDuration: number;
  mustShowFace: boolean;
  mustShowProduct: boolean;
  mustInclude: string[];
  mustAvoid: string[];
  brandKit?: {
    primaryColor?: string;
    logo?: string;
    handle?: string;
    website?: string;
  };
}

export interface UGCDeliverable {
  type: 'raw-video' | 'edited-video' | 'thumbnail' | 'caption';
  url?: string;
  format?: UGCVideoFormat;
  durationSeconds?: number;
  status: 'pending' | 'uploaded' | 'approved' | 'rejected';
}

export interface QACheck {
  name: string;
  passed: boolean;
  score: number;
  detail: string;
}

export interface UGCQAResult {
  passed: boolean;
  overallScore: number;
  checks: QACheck[];
  autoRejected: boolean;
  rejectionReason?: string;
  suggestedEdits: string[];
}

export interface UGCBrief {
  briefId: string;
  brandId: string;
  productName: string;
  productDescription: string;
  script: RetentionScript;
  requirements: UGCRequirements;
  deadline: Date;
  budget: number;
  assignedCreatorId?: string;
  status: UGCBriefStatus;
  deliverables: UGCDeliverable[];
  qaResult?: UGCQAResult;
  createdAt: Date;
}

const checkDuration = (durationSec: number, req: UGCRequirements): QACheck => ({
  name: 'Duración',
  passed: durationSec >= req.minDuration && durationSec <= req.maxDuration,
  score: durationSec >= req.minDuration && durationSec <= req.maxDuration ? 100 : 30,
  detail: `${durationSec}s — rango requerido: ${req.minDuration}-${req.maxDuration}s`,
});

const checkHook = (transcript: string, hook: string): QACheck => {
  const hookWords = hook.toLowerCase().split(' ').slice(0, 5);
  const found = hookWords.some((w) => transcript.toLowerCase().includes(w));
  return {
    name: 'Hook en primeros 3 segundos',
    passed: found,
    score: found ? 100 : 0,
    detail: found ? 'Hook detectado al inicio' : 'Hook no encontrado — video rechazado automáticamente',
  };
};

const checkSubtitles = (has: boolean): QACheck => ({
  name: 'Subtítulos presentes',
  passed: has,
  score: has ? 100 : 50,
  detail: has ? 'Subtítulos detectados' : 'Sin subtítulos — reduce retención ~30%',
});

const checkCTA = (transcript: string, ctaText: string): QACheck => {
  const ctaWords = ctaText.toLowerCase().split(' ').slice(0, 4);
  const found = ctaWords.some((w) => transcript.toLowerCase().includes(w));
  return {
    name: 'CTA al final',
    passed: found,
    score: found ? 100 : 20,
    detail: found ? 'CTA detectado' : 'Sin CTA — video pierde conversiones',
  };
};

const checkForbidden = (transcript: string, mustAvoid: string[]): QACheck => {
  const violations = mustAvoid.filter((w) => transcript.toLowerCase().includes(w.toLowerCase()));
  return {
    name: 'Contenido prohibido',
    passed: violations.length === 0,
    score: violations.length === 0 ? 100 : 0,
    detail: violations.length === 0 ? 'Sin violaciones' : `Palabras prohibidas: ${violations.join(', ')}`,
  };
};

class UGCOrchestrator {
  private readonly briefs: Map<string, UGCBrief> = new Map();
  private readonly creators: CreatorProfile[] = [];

  createBrief = (
    brandId: string,
    productName: string,
    productDescription: string,
    script: RetentionScript,
    requirements: UGCRequirements,
    deadline: Date,
    budget: number,
  ): UGCBrief => {
    const brief: UGCBrief = {
      briefId: `brief_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      brandId,
      productName,
      productDescription,
      script,
      requirements,
      deadline,
      budget,
      status: 'draft',
      deliverables: [
        { type: 'raw-video', status: 'pending' },
        { type: 'edited-video', status: 'pending' },
        { type: 'caption', status: 'pending' },
      ],
      createdAt: new Date(),
    };
    this.briefs.set(brief.briefId, brief);
    return brief;
  };

  matchCreator = (brief: UGCBrief, niche: NicheCategory): CreatorProfile | null => {
    const daysUntilDeadline = Math.ceil((brief.deadline.getTime() - Date.now()) / 86400000);
    const eligible = this.creators.filter(
      (c) =>
        (c.niche === niche || c.specialties.includes(niche)) &&
        c.pricePerVideo <= brief.budget &&
        c.deliveryDays <= daysUntilDeadline &&
        c.approvalRate >= 0.7,
    );

    return (
      eligible.sort((a, b) => {
        const sa = a.avgEngagementRate * 0.4 + a.approvalRate * 40 + (1 - a.pricePerVideo / brief.budget) * 20;
        const sb = b.avgEngagementRate * 0.4 + b.approvalRate * 40 + (1 - b.pricePerVideo / brief.budget) * 20;
        return sb - sa;
      })[0] ?? null
    );
  };

  runQA = (briefId: string, videoTranscript: string, durationSeconds: number, hasSubtitles: boolean): UGCQAResult => {
    const brief = this.briefs.get(briefId);
    if (!brief) throw new Error(`Brief ${briefId} not found`);

    const checks: QACheck[] = [
      checkDuration(durationSeconds, brief.requirements),
      checkHook(videoTranscript, brief.script.hook),
      checkSubtitles(hasSubtitles),
      checkCTA(videoTranscript, brief.script.cta.ctaText),
      checkForbidden(videoTranscript, brief.requirements.mustAvoid),
    ];

    const overallScore = Math.round(checks.reduce((sum, c) => sum + c.score, 0) / checks.length);
    const criticalFails = checks.filter(
      (c) => !c.passed && (c.name === 'Hook en primeros 3 segundos' || c.name === 'Contenido prohibido'),
    );
    const passed = overallScore >= 70 && criticalFails.length === 0;

    const result: UGCQAResult = {
      passed,
      overallScore,
      checks,
      autoRejected: criticalFails.length > 0,
      rejectionReason: criticalFails.length > 0 ? criticalFails.map((c) => c.detail).join('; ') : undefined,
      suggestedEdits: checks.filter((c) => !c.passed).map((c) => c.detail),
    };

    const stored = this.briefs.get(briefId);
    if (stored) {
      stored.status = passed ? 'approved' : 'revision-requested';
      stored.qaResult = result;
    }

    return result;
  };

  exportBriefAsMarkdown = (brief: UGCBrief): string =>
    `
# UGC Brief — ${brief.productName}

**Brand:** ${brief.brandId}
**Deadline:** ${brief.deadline.toDateString()}
**Budget:** $${brief.budget}

## Script (Copy Exacto)

**HOOK (0-3s):**
> ${brief.script.hook}

**CUERPO:**
${brief.script.body.map((s, i) => `${i + 1}. ${s.text} _(${s.durationEstimate}s)_`).join('\n')}

**CTA:**
> ${brief.script.cta.ctaText}
> En caption: "${brief.script.cta.captionCTA}"

## Requisitos Técnicos
- **Formato:** ${brief.requirements.format}
- **Duración:** ${brief.requirements.minDuration}s — ${brief.requirements.maxDuration}s
- **Cara visible:** ${brief.requirements.mustShowFace ? 'Obligatorio' : 'Opcional'}
- **Producto visible:** ${brief.requirements.mustShowProduct ? 'Debe mostrarse' : 'Opcional'}
- **Incluir:** ${brief.requirements.mustInclude.join(', ') || '(ninguno adicional)'}
- **Evitar:** ${brief.requirements.mustAvoid.join(', ') || '(ninguno)'}

## Entregables
${brief.deliverables.map((d) => `- [ ] ${d.type}`).join('\n')}
`.trim();

  registerCreator = (creator: CreatorProfile): void => {
    this.creators.push(creator);
  };

  getBrief = (briefId: string): UGCBrief | undefined => this.briefs.get(briefId);

  listBriefs = (brandId: string): UGCBrief[] => [...this.briefs.values()].filter((b) => b.brandId === brandId);
}

export const ugcOrchestrator = new UGCOrchestrator();
