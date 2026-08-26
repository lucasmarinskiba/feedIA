/**
 * Content Systems — sistemas de contenido repetibles que escalan un negocio
 * en Instagram/TikTok (no piezas sueltas: arquitectura reusable).
 *
 * Diferencia con lo que ya existe:
 *   - _calendarPlanner: CUÁNDO publicar (horarios/cadencia).
 *   - _winningAngles: QUÉ mensaje calificador usar en un post puntual.
 *   - _growthStrategistAgent: plan táctico 7/30/90 días (tareas).
 *   - _contentSystems (este): el SISTEMA que hace que un pilar de contenido
 *     se multiplique en decenas de piezas y termine en ingresos, con jugadas
 *     concretas de: funnel de contenido, series firma, loop de repurposing,
 *     stack de autoridad y puente a monetización — por etapa de la cuenta.
 *
 * Framework (biblioteca 36 libros):
 *   - Cole (Online Writing): Pillar Pieces — 3-5 artículos ancla → tráfico compuesto.
 *   - Brunson (Expert Secrets): Attractive Character + 1,000 True Fans.
 *   - Eyal (Hooked): Hook Model — serie repetible = trigger interno entrenado.
 *   - Weinberg (Traction): Bullseye — testear canales/formatos, no adivinar.
 *   - Spinks/Richardson (Community): "Build WITH not FOR" — contenido que activa,
 *     no sólo informa.
 *
 * Reusa NICHE_PROFILES_DEEP (monetization, contentPillars) — no reinventa
 * investigación de nicho.
 */

import { NICHE_PROFILES_DEEP } from './_nicheResearchAgent.js';
import * as store from './_store.js';

// ── Arquitectura de funnel de contenido (TOFU/MOFU/BOFU) por tipo de pieza ──
const CONTENT_FUNNEL_TEMPLATE = {
  tofu: {
    label: 'Top of funnel — alcance y descubrimiento',
    purpose: 'Entrar al FYP/Explore de gente que no te conoce. Optimiza reach, no conversión.',
    pieceTypes: ['hook viral de entretenimiento/curiosidad', 'trend audio + tu ángulo', 'pattern-break de 3-7s'],
    cadenceShare: 0.3,
    kpi: 'Reach frío, completion rate, shares',
  },
  mofu: {
    label: 'Middle of funnel — calificación y confianza',
    purpose: 'Convertir curioso en seguidor identificado. Series, mecanismo, prueba social específica.',
    pieceTypes: ['serie firma (nombre fijo)', 'mecanismo único explicado', 'caso real con números'],
    cadenceShare: 0.4,
    kpi: 'Saves, comments de valor, profile-view → follow',
  },
  bofu: {
    label: 'Bottom of funnel — conversión',
    purpose: 'Mover al seguidor calificado al DM/lead magnet/oferta. Objeciones, costo de inacción, CTA directo.',
    pieceTypes: ['objeción específica resuelta', 'costo de no actuar', 'oferta + urgencia real'],
    cadenceShare: 0.3,
    kpi: 'DMs, clicks a link, leads capturados',
  },
};

// ── Series firma sugeridas por nicho (repetibles, nombre fijo — Cole + Eyal) ──
const signatureSeriesFor = (nicheKey, profile) => {
  const pillar = profile.contentPillars?.[0] || 'tema principal';
  const gap = profile.contentGaps?.[0] || 'un gap real del nicho';
  return [
    {
      name: `"${pillarSeriesName(pillar)}" — serie semanal de ${pillar}`,
      format: 'reels/video corto, mismo intro visual siempre',
      cadence: '1x/semana, día fijo',
      purpose: 'Entrena trigger interno (Eyal): la audiencia espera esta entrega — sube rewatch y retención de seguidores.',
    },
    {
      name: `"Lo que nadie dice de ${nicheKey}" — serie de creencias`,
      format: 'carousel o video, 1 creencia falsa por entrega',
      cadence: '1x cada 2 semanas',
      purpose: 'Cada entrega es un Big Domino (Brunson) — acumula autoridad de contrarian bien fundamentado.',
    },
    {
      name: `"Caso real" — serie de prueba social`,
      format: 'carousel con números + antes/después verificable',
      cadence: '1x/semana o 1x cada 2 semanas',
      purpose: `Cubre el gap "${gap}" con evidencia concreta, no testimonio genérico.`,
    },
  ];
};

const pillarSeriesName = (pillar) => {
  const clean = String(pillar).replace(/[-_]/g, ' ');
  return clean.charAt(0).toUpperCase() + clean.slice(1);
};

// ── Loop de repurposing: 1 pieza pilar → N micro-piezas ──────────────────
const REPURPOSING_LOOP = [
  { step: 1, action: 'Grabar/escribir 1 pieza pilar larga (video 3-5min o carousel de 10 slides con profundidad real).' },
  { step: 2, action: 'Cortar 3-5 clips/quotes cortos del pilar → reels/videos independientes de 15-30s.' },
  { step: 3, action: 'Convertir el pilar en 1 carousel resumen (si el original fue video) o 1 reel-resumen (si fue carousel).' },
  { step: 4, action: 'Sacar 2-3 stories con polls/preguntas sobre el mismo tema — feedback directo para la próxima pieza pilar.' },
  { step: 5, action: 'Reciclar el ángulo del pilar en formato "caso real" o "objeción resuelta" 2-3 semanas después con nueva evidencia.' },
];

// ── Stack de autoridad (Brunson: attractive character) ────────────────────
const AUTHORITY_STACK_CHECKLIST = [
  'Backstory visible: de dónde venías antes de saber lo que sabés ahora (no sólo el resultado actual).',
  'Certeza en el resultado, no en el proceso — mostrás convicción aunque el camino tenga baches.',
  '"Un capítulo adelante" alcanza como autoridad — no hace falta ser el experto absoluto del nicho.',
  'Mostrar ambos lados: la lucha real Y el estado actual — sólo mostrar el destino final rompe conexión (sonder).',
  'Epiphany Bridge: contar el momento exacto donde entendiste lo que ahora enseñás, no sólo el resultado.',
];

// ── Puente de monetización: contenido → lead → oferta ─────────────────────
const monetizationBridge = (profile) => {
  const monetization = profile.monetization || ['oferta'];
  return {
    primaryOffer: monetization[0] || 'oferta principal',
    alternativeOffers: monetization.slice(1),
    pathway: [
      { stage: 'Contenido BOFU', action: 'CTA directo a DM con palabra trigger o link en bio a lead magnet.' },
      { stage: 'Lead magnet', action: 'Entregable de valor real y específico (no genérico) atado al ángulo bottom-funnel que lo trajo.' },
      { stage: 'Nurture', action: 'Secuencia corta (email/DM) que resuelve 1-2 objeciones más antes de ofrecer.' },
      { stage: 'Oferta', action: `Presentar ${monetization[0] || 'la oferta'} con stack de valor (Brunson) — no precio solo.` },
    ],
    warning: 'Sin lead magnet ni DM funnel, el contenido bottom-funnel se pierde — el puente es tan importante como el ángulo.',
  };
};

// ── Milestones de escalado por etapa de followers ──────────────────────────
const SCALING_MILESTONES = [
  {
    stage: '0-1k',
    whatChanges: 'Foco en 1 nicho + 1 formato + cadencia diaria. Ignorar monetización — validar ángulo y formato ganador.',
    contentFocus: 'TOFU 50% / MOFU 40% / BOFU 10% — todavía no hay audiencia calificada para vender.',
    risk: 'Tentación de comprar followers o dispersar nicho — destruye reach futuro y calificación.',
  },
  {
    stage: '1k-10k',
    whatChanges: 'Serie repetible activa + primeras collabs. Empezar a sembrar DM funnel de forma pasiva.',
    contentFocus: 'TOFU 35% / MOFU 45% / BOFU 20% — empieza calificación activa.',
    risk: 'Publicar sólo TOFU (vanity) sin construir MOFU — se estanca en alcance sin compradores.',
  },
  {
    stage: '10k+',
    whatChanges: 'Comunidad activa, DM funnel formal, autoridad establecida — el contenido BOFU ya puede sostener oferta recurrente.',
    contentFocus: 'TOFU 30% / MOFU 40% / BOFU 30% — funnel completo, sistema en régimen.',
    risk: 'Dejar de hacer TOFU asumiendo que "ya me conocen" — el alcance frío sigue siendo el combustible del sistema.',
  },
];

/**
 * Construye el sistema de contenido completo para escalar el negocio de la cuenta.
 */
export const buildContentSystem = ({
  niche = '',
  nicheKey = '',
  platform = 'instagram',
  followerStage = '0-1k', // '0-1k' | '1k-10k' | '10k+'
} = {}) => {
  const key = nicheKey || String(niche).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'general';
  const profile = NICHE_PROFILES_DEEP[key] || NICHE_PROFILES_DEEP.general || { contentPillars: [], contentGaps: [], monetization: [] };

  const milestone = SCALING_MILESTONES.find((s) => s.stage === followerStage) || SCALING_MILESTONES[0];

  return {
    niche,
    nicheKey: key,
    platform,
    followerStage,
    contentFunnel: CONTENT_FUNNEL_TEMPLATE,
    signatureSeries: signatureSeriesFor(key, profile),
    repurposingLoop: REPURPOSING_LOOP,
    authorityStack: AUTHORITY_STACK_CHECKLIST,
    monetizationBridge: monetizationBridge(profile),
    currentStageGuidance: milestone,
    allStages: SCALING_MILESTONES,
    northStar: 'El sistema > la pieza suelta: 1 pilar bien pensado se multiplica en 8-12 piezas via repurposing, cubriendo todo el funnel sin producir desde cero cada vez.',
    generatedAt: new Date().toISOString(),
  };
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleContentSystems = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/systems/content' && (m === 'POST' || m === 'GET')) {
    const params = body || {};
    const result = buildContentSystem({
      niche: params.niche || '',
      nicheKey: params.nicheKey || '',
      platform: params.platform || 'instagram',
      followerStage: params.followerStage || '0-1k',
    });
    if (userId) {
      try {
        await store.setUser(userId, 'systems:content:latest', result);
      } catch {
        /* best-effort */
      }
    }
    json(res, 200, result);
    return true;
  }

  if (path === '/api/systems/content/latest' && m === 'GET' && userId) {
    const latest = await store.getUser(userId, 'systems:content:latest');
    json(res, 200, latest || { empty: true });
    return true;
  }

  return false;
};
