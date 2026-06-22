// @ts-nocheck
/**
 * Audience Psychology Brain — Maslow + Cialdini + behavioral economics aplicado a IG.
 *
 * Decoda QUÉ motiva a cada segmento de audiencia:
 *   - Maslow's hierarchy → qué nivel de necesidad activa el contenido
 *   - Cialdini's 6 principios → reciprocidad, escasez, autoridad, consistencia, social proof, sympathy
 *   - Behavioral economics → loss aversion, anchoring, framing, default effect
 *   - Emotion wheel → identifica emoción exacta + arousal level
 *
 * Output: psychological triggers a aplicar por audience segment.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const PSYCH_DIR = path.resolve('data/neural/psychology');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MaslowLevel = 'fisiologica' | 'seguridad' | 'pertenencia' | 'estima' | 'autorrealizacion';

export type CialdiniPrinciple = 'reciprocidad' | 'escasez' | 'autoridad' | 'consistencia' | 'social-proof' | 'sympathy';

export type BehavioralBias =
  | 'loss-aversion' // perder duele 2x más que ganar
  | 'anchoring' // primer número visto sesga juicio
  | 'framing' // mismo dato + framing distinto = decisión distinta
  | 'default-effect' // opción default es elegida x más
  | 'bandwagon' // si muchos hacen, yo también
  | 'sunk-cost' // continúo porque ya invertí
  | 'recency' // último visto pesa más
  | 'priming' // exposición previa influye decisión
  | 'fomo'; // miedo a perderme algo

export type Emotion =
  | 'alegria'
  | 'sorpresa'
  | 'tristeza'
  | 'miedo'
  | 'asco'
  | 'rabia'
  | 'desprecio'
  | 'aprobacion'
  | 'esperanza'
  | 'orgullo'
  | 'envidia'
  | 'nostalgia'
  | 'admiracion'
  | 'curiosidad';

export interface AudienceSegment {
  segmentId: string;
  name: string; // 'Emprendedores 30-45'
  size: number; // % del total followers
  dominantMaslowLevel: MaslowLevel;
  activeMotivations: string[]; // pain points + desires
  resonantPrinciples: CialdiniPrinciple[];
  susceptibleBiases: BehavioralBias[];
  dominantEmotions: Emotion[];
  arousalPreference: 'low' | 'medium' | 'high'; // low=relax / high=intenso
  decisionStyle: 'analytical' | 'intuitive' | 'social' | 'emotional';
}

export interface PsychologicalTriggers {
  segmentId: string;
  contentType: string;
  primaryHook: { principle: CialdiniPrinciple; example: string };
  emotionalAnchor: { emotion: Emotion; intensity: 'low' | 'medium' | 'high'; example: string };
  appliedBiases: Array<{ bias: BehavioralBias; application: string }>;
  ctaFraming: string; // cómo enmarcar la CTA
  socialProofType: 'numbers' | 'logos' | 'testimonials' | 'celebrity' | 'crowd' | 'expert';
  urgencyMechanism: 'scarcity' | 'time-limit' | 'fomo' | 'social-pressure' | 'none';
  storyArc: 'hero' | 'underdog' | 'transformation' | 'mystery' | 'rebellion' | 'mentorship';
}

export interface PsychProfile {
  brandId: string;
  generatedAt: string;
  segments: AudienceSegment[];
  defaultTriggers: PsychologicalTriggers;
  dominantSegmentId: string;
}

// ── Database de patrones psicológicos ────────────────────────────────────────

const MASLOW_TO_TRIGGERS: Record<MaslowLevel, { emotions: Emotion[]; biases: BehavioralBias[] }> = {
  fisiologica: { emotions: ['miedo', 'esperanza'], biases: ['loss-aversion', 'fomo'] },
  seguridad: { emotions: ['miedo', 'aprobacion'], biases: ['loss-aversion', 'default-effect', 'recency'] },
  pertenencia: { emotions: ['alegria', 'orgullo', 'nostalgia'], biases: ['bandwagon', 'social-proof' as never] },
  estima: { emotions: ['orgullo', 'admiracion', 'envidia'], biases: ['anchoring', 'bandwagon'] },
  autorrealizacion: { emotions: ['curiosidad', 'esperanza', 'admiracion'], biases: ['priming', 'framing'] },
};

const PRINCIPLE_EXAMPLES: Record<CialdiniPrinciple, string[]> = {
  reciprocidad: ['Te doy esta guía gratis', 'Acceso anticipado para vos', 'Bonus exclusivo de regalo'],
  escasez: ['Quedan 3 cupos', 'Solo 24 horas', 'Edición limitada de 100 unidades'],
  autoridad: ['Validado por 50 expertos', 'Como visto en Forbes', '15 años de experiencia'],
  consistencia: ['Si dijiste sí a esto antes, esto es el siguiente paso', 'Coherente con tu valor X'],
  'social-proof': ['+10K personas ya lo eligieron', 'Las top marcas lo usan', '4.9/5 en 1200 reviews'],
  sympathy: ['Yo también lo viví', 'Soy como vos', 'Conozco tu lucha'],
};

// ── Generación de profile psicológico ───────────────────────────────────────

export const buildPsychProfile = async (
  brand: BrandProfile,
  hints?: { knownSegments?: string[]; topPosts?: string[] },
): Promise<PsychProfile> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3000,
    thinking: { type: 'adaptive' },
    system: `Psicólogo del consumidor digital especializado en Instagram.
Aplicás Maslow + Cialdini + behavioral economics + emotion wheel para profilar audiencias.
Sos específico, no genérico. Devolvés JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Construí psychological profile de la audiencia de ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Audiencia: ${brand.audience?.description ?? 'no especificada'}
Pains: ${brand.audience?.pains?.join(', ') ?? ''}
Desires: ${brand.audience?.desires?.join(', ') ?? ''}
${hints?.knownSegments?.length ? `Segmentos conocidos: ${hints.knownSegments.join(', ')}` : ''}
${hints?.topPosts?.length ? `Top posts (ejemplos):\n${hints.topPosts.slice(0, 3).join('\n')}` : ''}

Identificá 2-4 segmentos psicológicos distintos. Para cada uno:

JSON:
{
  "segments": [{
    "segmentId": "seg-1",
    "name": "nombre del segmento",
    "size": % del total,
    "dominantMaslowLevel": "fisiologica|seguridad|pertenencia|estima|autorrealizacion",
    "activeMotivations": ["pain o desire activo"],
    "resonantPrinciples": ["reciprocidad|escasez|autoridad|consistencia|social-proof|sympathy"],
    "susceptibleBiases": ["loss-aversion|anchoring|framing|default-effect|bandwagon|sunk-cost|recency|priming|fomo"],
    "dominantEmotions": ["alegria|sorpresa|tristeza|miedo|asco|rabia|desprecio|aprobacion|esperanza|orgullo|envidia|nostalgia|admiracion|curiosidad"],
    "arousalPreference": "low|medium|high",
    "decisionStyle": "analytical|intuitive|social|emotional"
  }],
  "dominantSegmentId": "seg-1"
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<PsychProfile>) : { segments: [] };

  // Construir defaultTriggers desde dominant segment
  const dominant = (generated.segments ?? [])[0] ?? ({} as AudienceSegment);
  const defaultTriggers = buildTriggersForSegment(dominant);

  const profile: PsychProfile = {
    brandId,
    generatedAt: new Date().toISOString(),
    segments: generated.segments ?? [],
    defaultTriggers,
    dominantSegmentId: generated.dominantSegmentId ?? dominant.segmentId ?? 'seg-1',
  };

  await fs.mkdir(PSYCH_DIR, { recursive: true });
  await fs.writeFile(path.join(PSYCH_DIR, `${brandId}-profile.json`), JSON.stringify(profile, null, 2), 'utf-8');
  log.info('[audiencePsychology] profile built', { brandId, segments: profile.segments.length });
  return profile;
};

const buildTriggersForSegment = (segment: AudienceSegment): PsychologicalTriggers => {
  const principle = segment.resonantPrinciples?.[0] ?? 'social-proof';
  const emotion = segment.dominantEmotions?.[0] ?? 'curiosidad';
  const maslowTriggers = MASLOW_TO_TRIGGERS[segment.dominantMaslowLevel] ?? MASLOW_TO_TRIGGERS.estima;

  return {
    segmentId: segment.segmentId,
    contentType: 'general',
    primaryHook: { principle, example: PRINCIPLE_EXAMPLES[principle]?.[0] ?? '' },
    emotionalAnchor: { emotion, intensity: segment.arousalPreference ?? 'medium', example: '' },
    appliedBiases: (segment.susceptibleBiases ?? maslowTriggers.biases).map((b) => ({
      bias: b,
      application: applicationForBias(b),
    })),
    ctaFraming: segment.decisionStyle === 'emotional' ? 'storytelling-first' : 'value-first',
    socialProofType: segment.dominantMaslowLevel === 'estima' ? 'celebrity' : 'numbers',
    urgencyMechanism: segment.susceptibleBiases?.includes('fomo')
      ? 'fomo'
      : segment.susceptibleBiases?.includes('loss-aversion')
        ? 'scarcity'
        : 'none',
    storyArc: segment.dominantMaslowLevel === 'autorrealizacion' ? 'hero' : 'transformation',
  };
};

const applicationForBias = (bias: BehavioralBias): string => {
  const map: Record<BehavioralBias, string> = {
    'loss-aversion': 'Mostrá qué pierde si NO actúa (vs qué gana si actúa)',
    anchoring: 'Mencionar precio alto primero, luego "tu precio especial"',
    framing: '"3 de cada 10 fallan" en vez de "70% tiene éxito"',
    'default-effect': 'Opción recomendada pre-seleccionada',
    bandwagon: '"Ya somos +X personas haciendo esto"',
    'sunk-cost': 'Recordar inversión previa, presionar continuar',
    recency: 'Mostrar caso reciente arriba',
    priming: 'Imagen sutil de éxito antes del CTA',
    fomo: 'Countdown timer + "muchos viéndolo ahora"',
  };
  return map[bias];
};

/** Triggers para un contenido específico según target segment. */
export const getTriggersForContent = async (
  brand: BrandProfile,
  contentType: string,
  targetSegmentId?: string,
): Promise<PsychologicalTriggers> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  let profile: PsychProfile;
  try {
    profile = JSON.parse(await fs.readFile(path.join(PSYCH_DIR, `${brandId}-profile.json`), 'utf-8')) as PsychProfile;
  } catch {
    profile = await buildPsychProfile(brand);
  }
  const segment =
    profile.segments.find((s) => s.segmentId === (targetSegmentId ?? profile.dominantSegmentId)) ?? profile.segments[0];
  if (!segment) return profile.defaultTriggers;
  return { ...buildTriggersForSegment(segment), contentType };
};

/** Inyecta triggers psicológicos en prompt de generación. */
export const buildPsychEnrichment = async (
  brand: BrandProfile,
  contentType: string,
  segmentId?: string,
): Promise<string> => {
  const triggers = await getTriggersForContent(brand, contentType, segmentId);
  const parts: string[] = ['[TRIGGERS PSICOLÓGICOS — aplicá estos]'];
  parts.push(`Cialdini hook: ${triggers.primaryHook.principle} — ej "${triggers.primaryHook.example}"`);
  parts.push(`Emoción ancla: ${triggers.emotionalAnchor.emotion} (intensidad ${triggers.emotionalAnchor.intensity})`);
  parts.push(
    `Behavioral biases: ${triggers.appliedBiases
      .slice(0, 3)
      .map((b) => `${b.bias} → ${b.application}`)
      .join(' | ')}`,
  );
  parts.push(`CTA framing: ${triggers.ctaFraming}`);
  parts.push(`Social proof: ${triggers.socialProofType}`);
  parts.push(`Urgency: ${triggers.urgencyMechanism}`);
  parts.push(`Story arc: ${triggers.storyArc}`);
  parts.push('[FIN TRIGGERS]');
  return parts.join('\n');
};

export const getPsychProfile = async (brandId: string): Promise<PsychProfile | null> => {
  try {
    return JSON.parse(await fs.readFile(path.join(PSYCH_DIR, `${brandId}-profile.json`), 'utf-8')) as PsychProfile;
  } catch {
    return null;
  }
};
