/**
 * Sugerencias de los agentes y automatizaciones de FeedIA.
 *
 * Cada sugerencia sale de una señal real que ya está en los stores (misión
 * fallida, carrusel retenido, cuenta sin conectar, borrador de comentario,
 * gasto de IA cerca del tope, OKR atrasado). Se encola en la cola de decisiones
 * con una clave de señal: no se duplica mientras la señal exista, y se expira
 * cuando la señal desaparece. Aceptar registra la decisión; solo ejecuta lo que
 * es navegación o conexión de redes.
 */

import { getBudgetStatus } from '../../agent/budget.js';
import { getConnection, isExpired, type ConnectionPlatform } from '../../integrations/oauthConnections.js';
import { listMissions } from '../../agent/swarm/index.js';
import { listCarouselJobs } from '../content/index.js';
import { listActiveObjectives } from './executiveOKR.js';
import { readJsonl } from '../experience/staffActivity.js';
import {
  enqueueDecision,
  expireStaleSignals,
  hasDecisionForSignal,
  type DecisionAction,
  type DecisionSource,
  type DecisionUrgency,
} from './executiveDecisionQueue.js';

const DIA_MS = 86_400_000;
const NOMBRE_RED: Record<ConnectionPlatform, string> = { instagram: 'Instagram', tiktok: 'TikTok' };

interface Sugerencia {
  signalKey: string;
  source: DecisionSource;
  urgency: DecisionUrgency;
  title: string;
  context: string;
  reasoning: string;
  expectedOutcome: string;
  risks?: string[];
  action: DecisionAction;
}

interface ComentarioBorrador {
  itemId: string;
  handle: string;
  commentText: string;
  kind: string;
  outcome: string;
  draft?: string;
  decidedAt: string;
}

const accion = (
  label: string,
  impacto: number,
  payload: Record<string, unknown> = {},
  irreversible = false,
): DecisionAction => ({
  label,
  payload,
  irreversible,
  estimatedCostUsd: 0,
  estimatedImpactScore: impacto,
});

const recortar = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export const sugerenciasDeSenales = async (brandId: string, brandName: string): Promise<Sugerencia[]> => {
  const sugerencias: Sugerencia[] = [];

  for (const c of listCarouselJobs(brandName).filter((j) => j.status === 'held')) {
    sugerencias.push({
      signalKey: `carousel:${c.id}`,
      source: 'carousel-factory',
      urgency: 'medium',
      title: `Aprobar carrusel «${recortar(c.topic, 80)}»`,
      context: `${c.slideCount} slides · score estético ${c.aestheticScore}. Quedó retenido antes de publicar.`,
      reasoning: 'Carousel Factory no lo publicó solo: requiere tu revisión.',
      expectedOutcome: 'Queda marcado como aprobado. La publicación la hacés desde Studio.',
      risks: ['Publicar sin revisar puede afectar la marca.'],
      action: accion('Marcar aprobado', 5),
    });
  }

  for (const m of listMissions(brandName).filter(
    (x) => x.status === 'failed' && Date.parse(x.finishedAt || x.startedAt) >= Date.now() - 7 * DIA_MS,
  )) {
    const fallidos = m.steps.filter((s) => s.status === 'failed').length;
    sugerencias.push({
      signalKey: `mision:${m.id}`,
      source: 'swarm-conductor',
      urgency: 'high',
      title: `Reintentar misión: ${recortar(m.objective, 90)}`,
      context: `Terminó fallida con ${fallidos} tarea(s) sin completar.`,
      reasoning: 'El swarm no logró cumplir el objetivo ni con el replan.',
      expectedOutcome: 'Vuelve a correr el plan con las tareas que fallaron.',
      action: accion('Marcar para reintento', 7),
    });
  }

  for (const plataforma of ['instagram', 'tiktok'] as const) {
    const conn = await getConnection(brandId, plataforma);
    const nombre = NOMBRE_RED[plataforma];
    if (!conn) {
      sugerencias.push({
        signalKey: `red:${plataforma}`,
        source: 'social-connector',
        urgency: 'medium',
        title: `Conectar ${nombre} para medir crecimiento real`,
        context: `${nombre} no está conectado.`,
        reasoning: 'Sin cuenta conectada no hay followers, alcance ni publicación en esa red.',
        expectedOutcome: `Se abre el login de ${nombre}. Al autorizar, empiezan a verse métricas reales.`,
        action: accion('Conectar', 8, { tipo: 'conectar', plataforma }),
      });
    } else if (isExpired(conn)) {
      sugerencias.push({
        signalKey: `red:${plataforma}`,
        source: 'social-connector',
        urgency: 'high',
        title: `Reconectar ${nombre}`,
        context: `El token de ${nombre} venció.`,
        reasoning: 'Con el token vencido se dejan de leer métricas y de publicar.',
        expectedOutcome: `Se abre el login de ${nombre} para renovar el token.`,
        action: accion('Reconectar', 8, { tipo: 'conectar', plataforma }),
      });
    }
  }

  const comentarios = readJsonl<ComentarioBorrador>('data/runtime/comment-review-decisions.jsonl')
    .filter((c) => c.draft && c.outcome !== 'handled-elsewhere')
    .sort((a, b) => Date.parse(b.decidedAt) - Date.parse(a.decidedAt));
  const porHandle = new Set<string>();
  for (const c of comentarios) {
    if (porHandle.has(c.handle) || porHandle.size >= 5) continue;
    porHandle.add(c.handle);
    sugerencias.push({
      signalKey: `comentario:${c.itemId}`,
      source: 'comment-brain',
      urgency: 'low',
      title: `Responder a @${c.handle}`,
      context: `«${recortar(c.commentText, 140)}» (${c.kind})`,
      reasoning: `Comment Brain redactó un borrador: «${recortar(c.draft ?? '', 180)}»`,
      expectedOutcome: 'Respondés con el borrador aprobado, o lo editás antes de enviar.',
      action: accion('Aprobar borrador', 4),
    });
  }

  const presupuesto = getBudgetStatus();
  if (presupuesto.usedPct >= 80) {
    sugerencias.push({
      signalKey: `presupuesto:${new Date().toISOString().slice(0, 10)}`,
      source: 'budget-guardian',
      urgency: presupuesto.usedPct >= 95 ? 'high' : 'medium',
      title: `Gasto de IA al ${presupuesto.usedPct}% del tope diario`,
      context: `$${presupuesto.spentUsd.toFixed(2)} de $${presupuesto.capUsd.toFixed(2)} hoy.`,
      reasoning: 'Cerca del tope diario los agentes pueden quedar pausados.',
      expectedOutcome: 'Menos llamadas a modelos caros hasta mañana.',
      action: accion('Aceptar límite', 3),
    });
  }

  for (const obj of (await listActiveObjectives(brandId)).filter((o) => o.status === 'behind')) {
    sugerencias.push({
      signalKey: `okr:${obj.id}`,
      source: 'okr-tracker',
      urgency: 'medium',
      title: `Replanificar «${recortar(obj.title, 80)}»`,
      context: `Atrasado · progreso ${obj.overallProgressPct}%.`,
      reasoning: 'El ritmo actual no alcanza para cerrar los key results del período.',
      expectedOutcome: 'Metas ajustadas al ritmo real.',
      action: accion('Ver OKR', 6, { tipo: 'tab', tab: 'okrs' }),
    });
  }

  return sugerencias;
};

/**
 * Encola las sugerencias nuevas y expira las que ya no tienen señal detrás.
 * Idempotente: llamarla varias veces no duplica nada.
 */
export const refreshSugerencias = async (
  brandId: string,
  brandName: string,
): Promise<{ creadas: number; expiradas: number }> => {
  const actuales = await sugerenciasDeSenales(brandId, brandName);
  const expiradas = await expireStaleSignals(brandId, new Set(actuales.map((s) => s.signalKey)));
  let creadas = 0;
  for (const s of actuales) {
    if (await hasDecisionForSignal(brandId, s.signalKey)) continue;
    await enqueueDecision({
      brandId,
      source: s.source,
      signalKey: s.signalKey,
      urgency: s.urgency,
      title: s.title,
      context: s.context,
      reasoning: s.reasoning,
      expectedOutcome: s.expectedOutcome,
      risks: s.risks,
      recommendedAction: s.action,
      alternativeActions: [],
      autoExecuteIfNoResponse: false,
    });
    creadas++;
  }
  return { creadas, expiradas };
};
