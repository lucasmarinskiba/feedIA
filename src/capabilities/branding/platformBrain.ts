/**
 * Platform Brain — equipo de especialistas IA por plataforma (Instagram /
 * TikTok). Mismo motor que brandingBrain.ts (prompt caching + tiers vía
 * callCanvaAgent), pero UN SOLO orquestador parametrizado por plataforma en
 * vez de duplicar el código para cada una — 1 motor, 2 rosters de 4
 * especialistas, mismo contrato de salida para que el front-end renderice
 * ambos con la misma plantilla.
 *
 * Instagram y TikTok NO son la misma app con distinto logo: rankean por
 * señales distintas (Explore/Búsqueda vs For You Page), premian formatos
 * distintos (Reel pulido vs nativo-crudo) y se descubren distinto (hashtags
 * vs sonidos/challenges). Cada rol está armado para esa diferencia, no para
 * "consejos genéricos de redes sociales".
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { callCanvaAgent, type CanvaAgentTier } from '../computerUse/canvaClaudeClient.js';

export type Platform = 'instagram' | 'tiktok';

export interface PlatformAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  specialty: string;
  tier: CanvaAgentTier;
}

export interface PlatformBrainStep {
  agentId: string;
  agentName: string;
  emoji: string;
  phase: string;
  thinking: string;
  output: string;
  durationMs: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface AlgorithmStrategy {
  rankingFactors: string[];
  formatMix: Array<{ format: string; weight: number; why: string }>;
  postingCadence: string;
  keyMetric: string;
  avoid: string[];
}

export interface GrowthPlaybook {
  tactics: string[];
  quickWins: string[];
  ninetyDayPlan: string[];
}

/** IG: hashtags (mega/micro). TikTok: tipos de sonido/challenge. Mismo shape, distinto contenido. */
export interface DiscoveryStrategy {
  primary: string[];
  secondary: string[];
  rule: string;
  riskNotes: string[];
}

export interface NativeFormatRules {
  hookRule: string;
  editingRules: string[];
  lengthGuidance: string;
  antiPatterns: string[];
}

export interface PlatformBrainResult {
  ok: boolean;
  jobId: string;
  platform: Platform;
  steps: PlatformBrainStep[];
  algorithmStrategy: AlgorithmStrategy;
  growthPlaybook: GrowthPlaybook;
  discoveryStrategy: DiscoveryStrategy;
  nativeFormatRules: NativeFormatRules;
  totalDurationMs: number;
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
}

export const PLATFORM_AGENTS: Record<Platform, PlatformAgent[]> = {
  instagram: [
    {
      id: 'ig-algorithm-strategist',
      name: 'Valentina Roig',
      emoji: '📊',
      role: 'Estratega de Algoritmo de Instagram',
      specialty: 'Ranking de Explore/Búsqueda, mix Reel/Carrusel/Historia, señales de retención',
      tier: 'analytical',
    },
    {
      id: 'ig-growth-hacker',
      name: 'Nicolás Farina',
      emoji: '🚀',
      role: 'Growth Hacker de Instagram',
      specialty: 'Crecimiento de seguidores real, collabs, funnel de DMs y guardados',
      tier: 'creative',
    },
    {
      id: 'ig-hashtag-scientist',
      name: 'Delfina Otero',
      emoji: '🔬',
      role: 'Científica de Hashtags & Descubrimiento',
      specialty: 'Pirámide de hashtags (mega/macro/medio/micro/nicho), SEO de búsqueda, shadowban',
      tier: 'analytical',
    },
    {
      id: 'ig-format-strategist',
      name: 'Franco Miele',
      emoji: '🗓️',
      role: 'Estratega de Formato & Timing',
      specialty: 'Qué formato usar según objetivo, cadencia de publicación, horarios',
      tier: 'analytical',
    },
  ],
  tiktok: [
    {
      id: 'tt-fyp-strategist',
      name: 'Camila Suárez',
      emoji: '🎯',
      role: 'Estratega de Algoritmo FYP',
      specialty: 'Completion rate, watch time, re-loop, señales de ranking del For You Page',
      tier: 'analytical',
    },
    {
      id: 'tt-sound-curator',
      name: 'Bruno Kessler',
      emoji: '🎵',
      role: 'Curador de Sonido & Tendencias',
      specialty: 'Sonidos trending, challenges, timing antes de que el sonido se sature',
      tier: 'creative',
    },
    {
      id: 'tt-native-specialist',
      name: 'Mía Boccardo',
      emoji: '🎬',
      role: 'Especialista en Contenido Nativo',
      specialty: 'Hook en 0-1s, edición nativa cruda, por qué lo pulido rinde peor acá',
      tier: 'creative',
    },
    {
      id: 'tt-growth-shop',
      name: 'Ignacio Prados',
      emoji: '🛍️',
      role: 'Growth & TikTok Shop',
      specialty: 'Loops de duetos/stitches, TikTok Shop, engagement en comentarios',
      tier: 'analytical',
    },
  ],
};

export interface PlatformBrainRequest {
  goal: string;
  userIdeas?: string;
  constraints?: string;
}

const PLATFORM_LABEL: Record<Platform, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

export const runPlatformBrain = async (
  brand: BrandProfile,
  platform: Platform,
  request: PlatformBrainRequest,
): Promise<PlatformBrainResult> => {
  const start = Date.now();
  const jobId = Date.now().toString(36);
  const steps: PlatformBrainStep[] = [];
  const agents = PLATFORM_AGENTS[platform];
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;

  log.info(`[PlatformBrain] Job ${jobId} iniciado · platform=${platform} · goal=${request.goal.slice(0, 60)}`);

  const runStep = async <T>(
    agentIdx: number,
    phase: string,
    thinking: string,
    taskPrompt: string,
    fallback: T,
    summarize: (r: T) => string,
    maxTokens = 1200,
  ): Promise<T> => {
    const t0 = Date.now();
    const agent = agents[agentIdx]!;
    let result: T = fallback;
    let cacheRead: number | undefined;
    let cacheWrite: number | undefined;

    try {
      const res = await callCanvaAgent<T>(brand, { agentRole: agent.role, tier: agent.tier, taskPrompt, maxTokens });
      result = res.data ?? fallback;
      cacheRead = res.cacheReadTokens;
      cacheWrite = res.cacheWriteTokens;
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
    } catch (err) {
      log.warn(`[PlatformBrain] ${agent.id} fallback: ${(err as Error).message}`);
    }

    steps.push({
      agentId: agent.id,
      agentName: agent.name,
      emoji: agent.emoji,
      phase,
      thinking,
      output: summarize(result),
      durationMs: Date.now() - t0,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
    });
    return result;
  };

  const platformLabel = PLATFORM_LABEL[platform];
  const commonHeader = (agentName: string, role: string, specialty: string): string =>
    `Sos ${agentName}, ${role} — especialista EXCLUSIVAMENTE en ${platformLabel}, no en redes sociales en general.
Tu especialidad: ${specialty}.

Ya conocés la identidad completa de la marca desde el contexto de sistema.

ENCARGO ESPECÍFICO:
Objetivo del usuario: ${request.goal}
${request.userIdeas ? `Ideas del usuario: ${request.userIdeas}` : ''}
${request.constraints ? `Restricciones: ${request.constraints}` : ''}

Reglas:
- Hablá de ${platformLabel} específicamente. Si algo aplicaría igual en la otra plataforma, no lo menciones — sólo lo que es distinto/específico de ${platformLabel}.
- Nada de "publicá contenido de calidad" ni consejos que cualquier cuenta del nicho ya sabe. Específico y accionable.`;

  // ── 1. Estrategia de algoritmo ────────────────────────────────────────────
  const algoPrompt =
    platform === 'instagram'
      ? `${commonHeader(agents[0]!.name, agents[0]!.role, agents[0]!.specialty)}

Definí cómo jugarle al algoritmo de Instagram para este objetivo: qué señales de ranking priorizar (guardados, compartidos, tiempo de permanencia, comentarios tempranos), qué mezcla de formatos (Reel/Carrusel/Historia/Post) conviene y por qué, cadencia de publicación, LA métrica que más importa para este objetivo, y qué evitar (riesgo de reducción de alcance).

Respondé con JSON:
{
  "rankingFactors": ["señal de ranking 1 y cómo activarla", "señal 2", "señal 3"],
  "formatMix": [{"format": "Reel", "weight": 50, "why": "..."}, {"format": "Carrusel", "weight": 30, "why": "..."}, {"format": "Historia", "weight": 20, "why": "..."}],
  "postingCadence": "ej: 4 Reels + 2 Carruseles por semana, Historias diarias",
  "keyMetric": "la métrica que más correlaciona con este objetivo en IG",
  "avoid": ["qué evitar 1", "qué evitar 2"]
}`
      : `${commonHeader(agents[0]!.name, agents[0]!.role, agents[0]!.specialty)}

Definí cómo jugarle al algoritmo del For You Page para este objetivo: qué señales de ranking priorizar (completion rate, watch time, re-loops, shares fuera de la app), qué tipo de video conviene (duración, ritmo), cadencia de publicación, LA métrica que más importa para este objetivo, y qué evitar (contenido que el algoritmo penaliza: baja retención en los primeros 2s, video pulido tipo ad).

Respondé con JSON:
{
  "rankingFactors": ["señal de ranking 1 y cómo activarla", "señal 2", "señal 3"],
  "formatMix": [{"format": "Video nativo corto (<15s)", "weight": 50, "why": "..."}, {"format": "Video medio (15-60s)", "weight": 35, "why": "..."}, {"format": "LIVE", "weight": 15, "why": "..."}],
  "postingCadence": "ej: 1-3 videos por día en fases de crecimiento",
  "keyMetric": "la métrica que más correlaciona con este objetivo en TikTok",
  "avoid": ["qué evitar 1", "qué evitar 2"]
}`;

  const algorithmStrategy = await runStep<AlgorithmStrategy>(
    0,
    'Estrategia de algoritmo',
    `Mapeando señales de ranking de ${platformLabel} para el objetivo del usuario...`,
    algoPrompt,
    {
      rankingFactors: [`Retención en los primeros segundos`, `Guardados / shares`, `Tiempo total de visualización`],
      formatMix:
        platform === 'instagram'
          ? [
              { format: 'Reel', weight: 50, why: 'mayor alcance orgánico actual' },
              { format: 'Carrusel', weight: 30, why: 'mejor para guardados y autoridad' },
              { format: 'Historia', weight: 20, why: 'cercanía y recordación diaria' },
            ]
          : [
              { format: 'Video nativo corto', weight: 55, why: 'mejor completion rate' },
              { format: 'Video medio', weight: 30, why: 'profundidad sin perder retención' },
              { format: 'LIVE', weight: 15, why: 'señal fuerte de engagement real' },
            ],
      postingCadence: platform === 'instagram' ? '4-5 piezas/semana' : '1-2 videos/día',
      keyMetric: platform === 'instagram' ? 'guardados' : 'completion rate',
      avoid:
        platform === 'instagram'
          ? ['hashtags baneados', 'links externos en caption']
          : ['video pulido tipo ad', 'hook lento'],
    },
    (r) => `Métrica clave: ${r.keyMetric} · Cadencia: ${r.postingCadence}`,
  );

  // ── 2. Growth playbook ────────────────────────────────────────────────────
  const growthPlaybook = await runStep<GrowthPlaybook>(
    1,
    'Plan de crecimiento',
    `Diseñando tácticas de crecimiento específicas de ${platformLabel}...`,
    `${commonHeader(agents[1]!.name, agents[1]!.role, agents[1]!.specialty)}

ALGORITMO YA DEFINIDO: ${algorithmStrategy.rankingFactors.join('; ')}

Diseñá un playbook de crecimiento concreto: tácticas específicas de ${platformLabel} (no genéricas), 3 quick wins para esta semana, y un plan a 90 días.

Respondé con JSON:
{
  "tactics": ["táctica específica de ${platformLabel} 1", "táctica 2", "táctica 3", "táctica 4"],
  "quickWins": ["algo accionable esta semana 1", "quick win 2", "quick win 3"],
  "ninetyDayPlan": ["fase 1 (días 1-30)", "fase 2 (días 31-60)", "fase 3 (días 61-90)"]
}`,
    {
      tactics:
        platform === 'instagram'
          ? ['Collabs con 2 cuentas del nicho/mes', 'Responder cada DM en <1h', 'CTA a guardar en cada pieza']
          : [
              'Responder los primeros 10 comentarios con video',
              'Duetos con creators del nicho',
              'Postear en horario de pico de tu audiencia',
            ],
      quickWins: ['Auditar últimos 10 posts por retención', 'Optimizar bio/link', 'Definir 1 serie semanal'],
      ninetyDayPlan: [
        'Consistencia + testing de formatos',
        'Doblar apuesta en lo que funcionó',
        'Escalar con colaboraciones',
      ],
    },
    (r) => `Tácticas: ${r.tactics.length} · Quick wins: ${r.quickWins.length}`,
  );

  // ── 3. Descubrimiento — hashtags (IG) / sonido-trends (TikTok) ───────────
  const discoveryPrompt =
    platform === 'instagram'
      ? `${commonHeader(agents[2]!.name, agents[2]!.role, agents[2]!.specialty)}

Armá la estrategia de hashtags: mezcla de mega (>500K posts), macro, medio, micro y nicho — nada de hashtags genéricos saturados sin segmentación. Incluí términos de búsqueda (lo que la gente tipea en la lupa) y regla de rotación para evitar shadowban.

Respondé con JSON:
{
  "primary": ["hashtag grande/macro 1", "hashtag 2", "hashtag 3"],
  "secondary": ["hashtag nicho/micro específico 1", "hashtag 2", "hashtag 3", "hashtag 4", "hashtag 5"],
  "rule": "regla de rotación y cuántos usar por post",
  "riskNotes": ["riesgo de shadowban a evitar 1", "riesgo 2"]
}`
      : `${commonHeader(agents[2]!.name, agents[2]!.role, agents[2]!.specialty)}

Armá la estrategia de sonido y tendencias: qué TIPOS de sonido conviene usar (no un sonido específico que caduca, sino el criterio: trending audio propio vs sonido viral prestado vs voz original), formatos de challenge que le quedan bien al nicho, y regla de timing (cuándo subirse a una tendencia antes de que esté saturada).

Respondé con JSON:
{
  "primary": ["tipo de sonido/criterio 1", "tipo 2", "tipo 3"],
  "secondary": ["formato de challenge/trend adaptable al nicho 1", "formato 2", "formato 3", "formato 4"],
  "rule": "regla de timing — cuándo subirse a un trend y cuándo ya es tarde",
  "riskNotes": ["riesgo a evitar 1 (ej: sonido sobre-saturado)", "riesgo 2"]
}`;

  const discoveryStrategy = await runStep<DiscoveryStrategy>(
    2,
    platform === 'instagram' ? 'Hashtags & descubrimiento' : 'Sonido & tendencias',
    platform === 'instagram'
      ? 'Construyendo pirámide de hashtags y términos de búsqueda...'
      : 'Definiendo criterio de sonido y ventana de timing para tendencias...',
    discoveryPrompt,
    platform === 'instagram'
      ? {
          primary: [`#${brand.niche.replace(/\s+/g, '')}`, '#marketingdigital', '#emprendedores'],
          secondary: [`#${brand.niche.replace(/\s+/g, '')}argentina`, '#pymes', '#contenidodigital'],
          rule: '5-8 hashtags mezclando mega/micro/nicho, rotar cada 3-4 posts',
          riskNotes: ['evitar hashtags marcados como spam', 'no repetir el mismo set siempre'],
        }
      : {
          primary: [
            'sonido trending propio de la plataforma',
            'voz original narrando',
            'sonido viral adaptado al nicho',
          ],
          secondary: [
            'reto de transformación',
            'formato "POV"',
            'formato antes/después',
            'formato respuesta a comentario',
          ],
          rule: 'subirse a un trend en las primeras 48-72h de despegue, no cuando ya es mainstream',
          riskNotes: ['sonido sobre-usado pierde alcance', 'trend forzado sin conexión al nicho se nota'],
        },
    (r) => `Primarios: ${r.primary.length} · Secundarios: ${r.secondary.length}`,
  );

  // ── 4. Reglas de formato nativo ────────────────────────────────────────────
  const nativeFormatRules = await runStep<NativeFormatRules>(
    3,
    'Formato nativo',
    `Definiendo reglas de hook, edición y duración específicas de ${platformLabel}...`,
    `${commonHeader(agents[3]!.name, agents[3]!.role, agents[3]!.specialty)}

Definí las reglas de formato NATIVO de ${platformLabel} — cómo tiene que verse y sentirse una pieza para no parecer ajena a la plataforma.

Respondé con JSON:
{
  "hookRule": "regla exacta de los primeros segundos",
  "editingRules": ["regla de edición 1", "regla 2", "regla 3"],
  "lengthGuidance": "duración/longitud ideal según objetivo",
  "antiPatterns": ["qué NO hacer 1 (se nota como ajeno a la plataforma)", "anti-patrón 2"]
}`,
    platform === 'instagram'
      ? {
          hookRule: 'Primeros 3 segundos con texto en pantalla + promesa clara',
          editingRules: ['cortes cada 2-3s en Reels', 'subtítulos siempre', 'paleta de marca consistente'],
          lengthGuidance: 'Reels 15-30s para alcance, hasta 60s para autoridad',
          antiPatterns: ['intro de marca larga', 'logo tapando el hook'],
        }
      : {
          hookRule: 'Primer 1 segundo sin intro — arrancar en la acción o la frase fuerte',
          editingRules: [
            'edición cruda, no publicitaria',
            'texto nativo en pantalla',
            'cámara en mano > tripode pulido',
          ],
          lengthGuidance: '7-21s para alcance masivo, hasta 60s si la retención aguanta',
          antiPatterns: ['se ve como anuncio', 'logo o branding pesado al inicio', 'música corporativa de stock'],
        },
    (r) => `Hook: ${r.hookRule.slice(0, 60)}`,
  );

  const totalDurationMs = Date.now() - start;
  log.info(
    `[PlatformBrain] Job ${jobId} completado en ${totalDurationMs}ms · platform=${platform} · ` +
      `cache_read=${totalCacheReadTokens} cache_write=${totalCacheWriteTokens}`,
  );

  return {
    ok: true,
    jobId,
    platform,
    steps,
    algorithmStrategy,
    growthPlaybook,
    discoveryStrategy,
    nativeFormatRules,
    totalDurationMs,
    totalCacheReadTokens,
    totalCacheWriteTokens,
  };
};
