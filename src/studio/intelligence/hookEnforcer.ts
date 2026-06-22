import type { NicheCategory } from './nicheAnalyzer.js';
import { audiencePsychologyAgent } from './audiencePsychologyAgent.js';
import { DEFAULT_AUDIENCE } from '../../agent/tools/intelligenceHelpers.js';

export type CognitiveBias =
  | 'curiosity-gap'
  | 'social-proof'
  | 'loss-aversion'
  | 'identity-threat'
  | 'pattern-interrupt'
  | 'urgency-scarcity'
  | 'controversy'
  | 'transformation-promise'
  | 'authority-signal'
  | 'specificity-trust';

export interface HookIssue {
  type: 'too-generic' | 'no-bias' | 'too-long' | 'weak-open' | 'no-specificity' | 'brand-ego' | 'no-tension';
  description: string;
  fix: string;
}

export interface HookScore {
  rawHook: string;
  score: number;
  passed: boolean;
  biasDetected: CognitiveBias | null;
  issues: HookIssue[];
  improvedHook: string;
  alternativeHooks: string[];
  blockReason?: string;
}

export interface ManyChatCTA {
  triggerKeyword: string;
  platform: 'instagram' | 'tiktok';
  ctaText: string;
  captionCTA: string;
  automationMessage: string;
  conversionGoal: 'lead-magnet' | 'dm-sale' | 'link-delivery' | 'discovery-call';
}

export interface RetentionSegment {
  order: number;
  text: string;
  durationEstimate: number;
  retentionTechnique: 'pattern-interrupt' | 'open-loop' | 'value-delivery' | 'social-proof' | 'controversy' | 'cta';
  wordCount: number;
  passesLengthRule: boolean;
}

export interface RetentionScript {
  hook: string;
  hookScore: HookScore;
  body: RetentionSegment[];
  cta: ManyChatCTA;
  totalDurationEstimate: number;
  retentionScore: number;
  passed: boolean;
  blockingIssues: string[];
}

const WEAK_HOOK_PATTERNS: RegExp[] = [
  /^bienvenidos?/i,
  /^hola,?\s+hoy/i,
  /^en este video/i,
  /^voy a hablar/i,
  /^hoy les traigo/i,
  /^quiero compartir/i,
  /^como (ya )?saben/i,
  /^soy .+ y (hoy|en este)/i,
];

const BIAS_PATTERNS: Record<CognitiveBias, RegExp> = {
  'curiosity-gap': /nadie te (dice|habla|cuenta|enseña)|secreto|lo que no|nunca te dij|¿(qué|por qué) (nadie|todos)/i,
  'social-proof': /\d+(k|K|mil|millones)? (personas|seguidores|clientes)|el \d+% de/i,
  'loss-aversion': /error(es)? que|está(s)? (perdiendo|arruinando|cometiendo)|si no (haces|cambias)/i,
  'identity-threat': /si (eres|haces|crees).*eres|la (razón|verdad) por la que fracas/i,
  'pattern-interrupt': /^para[.,]|^wait[.,]|^espera[.,]|^momento[.,]/i,
  'urgency-scarcity': /solo (hoy|hasta|por \d+)|últim[ao]s?|antes de que|ya no (podrás|puedes)/i,
  controversy: /opinión impopular|me va a costar|polémic[ao]|la verdad (es|sobre)|agencias (mienten|fallan)/i,
  'transformation-promise': /de \d+ a|en \d+ (días|semanas|meses)|cómo pasé de|resultado en/i,
  'authority-signal': /después de \d+ (años|clientes|casos)|lo que aprendí|estrategia que usé con/i,
  'specificity-trust': /\d+ (pasos|formas|razones|errores|tips|hacks|estrategias)/i,
};

const HOOK_TEMPLATES: Record<CognitiveBias, string> = {
  'curiosity-gap': 'Lo que nadie te dice sobre [TOPIC] (y destruye tu [RESULT])',
  'social-proof': '[N] creadores de [NICHE] ya usan esto — y tú todavía no',
  'loss-aversion': 'El error #1 que arruina tu [RESULT] (y casi todos lo cometen)',
  'identity-threat': 'Si haces esto, no eres realmente [IDENTITY]',
  'pattern-interrupt': 'Para. Esto que haces en [TOPIC] te está costando [RESULT]',
  'urgency-scarcity': 'Esto desaparece en [TIMEFRAME] y el 90% de [AUDIENCE] no lo sabe',
  controversy: 'Opinión impopular: [COMMON BELIEF] está completamente mal',
  'transformation-promise': 'De [BAD STATE] a [GOOD STATE] en [TIMEFRAME] — proceso completo',
  'authority-signal': 'Después de [N] [CLIENTS], aprendí que [COUNTER-INTUITIVE TRUTH]',
  'specificity-trust': '[N] [THINGS] que destruyen tu [GOAL] (el #[M] sorprende a todos)',
};

const detectBias = (hook: string): CognitiveBias | null => {
  for (const [bias, pattern] of Object.entries(BIAS_PATTERNS) as [CognitiveBias, RegExp][]) {
    if (pattern.test(hook)) return bias;
  }
  return null;
};

const detectIssues = (hook: string): HookIssue[] => {
  const issues: HookIssue[] = [];

  if (WEAK_HOOK_PATTERNS.some((p) => p.test(hook))) {
    issues.push({
      type: 'weak-open',
      description: 'Hook abre con intro de marca/persona — algoritmo lo entierra.',
      fix: 'Empezar con la tensión o el problema, nunca con "hola" o introducción.',
    });
  }

  if (hook.split(' ').length > 15) {
    issues.push({
      type: 'too-long',
      description: `Hook de ${hook.split(' ').length} palabras — debe ser ≤12 palabras para 3 segundos.`,
      fix: 'Recortar a la frase más impactante. Eliminar contexto innecesario.',
    });
  }

  if (!detectBias(hook)) {
    issues.push({
      type: 'no-bias',
      description: 'Sin sesgo cognitivo detectado — hook no crea tensión ni urgencia.',
      fix: 'Añadir: curiosidad (qué nadie te dice), pérdida (error que destruye X), o prueba social (N personas).',
    });
  }

  if (!/\d/.test(hook) && !/específic|exactamente|precis/.test(hook)) {
    issues.push({
      type: 'no-specificity',
      description: 'Hook genérico sin números ni especificidad. Vago = invisible.',
      fix: 'Añadir número específico: "3 errores", "en 30 días", "el 87% de creadores".',
    });
  }

  if (/mi marca|nuestra empresa|nosotros somos|presentamos/i.test(hook)) {
    issues.push({
      type: 'brand-ego',
      description: 'Hook habla de la marca, no del problema del cliente.',
      fix: 'Reescribir para hablar del dolor o deseo del espectador.',
    });
  }

  return issues;
};

const computeScore = (hook: string): number => {
  const issues = detectIssues(hook);
  const bias = detectBias(hook);
  const wordCount = hook.split(' ').length;
  let score = 5;

  score -= issues.filter((i) => i.type === 'weak-open').length * 3;
  score -= issues.filter((i) => i.type === 'no-bias').length * 2;
  score -= issues.filter((i) => i.type === 'brand-ego').length * 2;
  score -= issues.filter((i) => i.type === 'too-long').length * 1;

  if (bias) score += 2;
  if (/\d/.test(hook)) score += 1;
  if (wordCount <= 10) score += 1;
  if (/¿/.test(hook)) score += 0.5;
  if (/\bno\b.*\b(lo|te|les|saben)\b/i.test(hook)) score += 0.5;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
};

const buildImprovedHook = (rawHook: string, bias: CognitiveBias): string => {
  const template = HOOK_TEMPLATES[bias];
  const topicWords = rawHook.split(' ').slice(0, 3).join(' ');
  return template
    .replace('[TOPIC]', topicWords)
    .replace('[RESULT]', 'resultado')
    .replace('[N]', '3')
    .replace('[M]', '3')
    .replace('[NICHE]', 'creadores')
    .replace('[AUDIENCE]', 'creadores')
    .replace('[TIMEFRAME]', '30 días')
    .replace('[THINGS]', 'errores')
    .replace('[GOAL]', 'crecimiento')
    .replace('[BAD STATE]', '0 seguidores')
    .replace('[GOOD STATE]', '10K')
    .replace('[IDENTITY]', 'emprendedor real')
    .replace('[COUNTER-INTUITIVE TRUTH]', 'la consistencia no es lo más importante')
    .replace('[CLIENTS]', 'clientes')
    .replace('[COMMON BELIEF]', 'más contenido = más crecimiento');
};

class HookEnforcer {
  scoreHook = (rawHook: string): HookScore => {
    const score = computeScore(rawHook);
    const bias = detectBias(rawHook);
    const issues = detectIssues(rawHook);
    const passed = score >= 7;

    const dominantBias: CognitiveBias = bias ?? 'curiosity-gap';
    const improvedHook = buildImprovedHook(rawHook, dominantBias);

    const altBiases: CognitiveBias[] = ['loss-aversion', 'transformation-promise', 'specificity-trust'];
    const alternativeHooks = altBiases.map((b) => buildImprovedHook(rawHook, b));

    return {
      rawHook,
      score,
      passed,
      biasDetected: bias,
      issues,
      improvedHook,
      alternativeHooks,
      blockReason: passed
        ? undefined
        : `Hook score ${score}/10 — mínimo 7.0. ${issues.map((i) => i.description).join(' ')}`,
    };
  };

  validateAndEnforce = (hook: string, niche: NicheCategory): HookScore => {
    const base = this.scoreHook(hook);
    if (base.passed) return base;

    const psych = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
    const desire = psych?.psychographics.coreDesire ?? 'resultados';
    const fear = psych?.psychographics.deepestFear ?? 'perder tiempo';

    const autoHook = `¿Por qué sigues perdiendo ${fear} sin obtener ${desire}? (La razón te va a sorprender)`;
    const autoScore = computeScore(autoHook);

    return {
      ...base,
      improvedHook: autoScore > base.score ? autoHook : base.improvedHook,
    };
  };

  buildManyChatCTA = (
    niche: NicheCategory,
    conversionGoal: ManyChatCTA['conversionGoal'],
    triggerKeyword?: string,
  ): ManyChatCTA => {
    const keyword = triggerKeyword ?? (niche.split('-')[0] ?? 'INFO').toUpperCase();

    const templates: Record<ManyChatCTA['conversionGoal'], { cta: string; caption: string; message: string }> = {
      'lead-magnet': {
        cta: `Comenta "${keyword}" y te mando el recurso gratuito`,
        caption: `Comenta ${keyword} aquí abajo y te lo mando directo al DM 👇`,
        message: `¡Hola! Aquí tienes el recurso que pediste: [LINK]. Respóndeme si tienes preguntas 🙌`,
      },
      'dm-sale': {
        cta: `Comenta "${keyword}" si quieres conocer los detalles`,
        caption: `Si quieres que hablemos, comenta ${keyword} y te escribo al DM 🎯`,
        message: `¡Hola! Vi que te interesa — ¿cuándo tienes 15 min para una llamada rápida?`,
      },
      'link-delivery': {
        cta: `Comenta "${keyword}" y te mando el link`,
        caption: `Link en bio o comenta ${keyword} y te lo mando directo`,
        message: `¡Aquí tienes el link: [LINK]. ¿Te puedo ayudar con algo más?`,
      },
      'discovery-call': {
        cta: `Comenta "${keyword}" para una estrategia personalizada gratis`,
        caption: `Agenda gratis — comenta ${keyword} y coordinamos 📅`,
        message: `¡Hola! Me alegra tu interés. Aquí puedes agendar tu llamada: [CALENDLY_LINK]`,
      },
    };

    const t = templates[conversionGoal];
    return {
      triggerKeyword: keyword,
      platform: 'instagram',
      ctaText: t.cta,
      captionCTA: t.caption,
      automationMessage: t.message,
      conversionGoal,
    };
  };

  buildRetentionScript = (
    hook: string,
    bodyPoints: string[],
    niche: NicheCategory,
    conversionGoal: ManyChatCTA['conversionGoal'] = 'lead-magnet',
  ): RetentionScript => {
    const hookScore = this.validateAndEnforce(hook, niche);
    const cta = this.buildManyChatCTA(niche, conversionGoal);

    const body: RetentionSegment[] = bodyPoints.map((point, i) => ({
      order: i + 1,
      text: point,
      durationEstimate: Math.ceil(point.split(' ').length / 2.5),
      retentionTechnique:
        i === 0
          ? 'open-loop'
          : i % 3 === 0
            ? 'pattern-interrupt'
            : i === bodyPoints.length - 1
              ? 'cta'
              : 'value-delivery',
      wordCount: point.split(' ').length,
      passesLengthRule: point.split('.').every((s) => s.trim().split(' ').length <= 12),
    }));

    const totalDuration = 3 + body.reduce((sum, s) => sum + s.durationEstimate, 0) + 2;
    const patternInterrupts = body.filter((s) => s.retentionTechnique === 'pattern-interrupt').length;
    const longSentences = body.filter((s) => !s.passesLengthRule).length;

    const retentionScore = Math.min(
      100,
      Math.round(
        hookScore.score * 5 +
          (patternInterrupts >= 2 ? 20 : patternInterrupts * 8) +
          (longSentences === 0 ? 20 : longSentences <= 2 ? 10 : 0) +
          (totalDuration <= 60 ? 15 : totalDuration <= 90 ? 10 : 0),
      ),
    );

    const blockingIssues: string[] = [];
    if (!hookScore.passed)
      blockingIssues.push(`Hook bloqueado (${hookScore.score}/10): ${hookScore.blockReason ?? ''}`);
    if (longSentences > 3) blockingIssues.push(`${longSentences} oraciones >12 palabras — rompen retención visual`);
    if (totalDuration > 90) blockingIssues.push(`Duración estimada ${totalDuration}s — recortar a ≤60s`);

    return {
      hook: hookScore.passed ? hook : hookScore.improvedHook,
      hookScore,
      body,
      cta,
      totalDurationEstimate: totalDuration,
      retentionScore,
      passed: retentionScore >= 65 && hookScore.passed,
      blockingIssues,
    };
  };
}

export const hookEnforcer = new HookEnforcer();
