/**
 * Directive Engine — end-to-end executor
 * ─────────────────────────────────────────────────────────────────────────
 * Given a due Directive, this runs it to completion through the right
 * autonomous pipeline and records exactly what happened. This is the piece
 * that makes "Subí 1 carrusel por día" actually produce a branded carousel
 * and queue it for publication, and "Respondé todos los mensajes" actually
 * answer the DMs.
 *
 * It composes existing engines (autonomous producer, audit, auto-optimize,
 * faro comments, Talía delegation) rather than reimplementing them. Publish
 * is requested via a bus event so the existing compliance / publishing flow
 * (and DRY_RUN) stays the single authority over what actually goes live.
 */

import type { BrandProfile } from '../../config/types.js';
import { env } from '../../config/index.js';
import { emit } from '../../agent/bus.js';
import { recordTrace } from '../reasoningTrace/index.js';
import { produceContent } from '../autonomous/index.js';
import { runCarouselFactory } from '../content/index.js';
import { runWeeklyAudit } from '../kpiAudit/index.js';
import { runAutoOptimization } from '../autoOptimize/index.js';
import { runMission } from '../../agent/swarm/index.js';
import type { Directive, DirectiveRun } from './types.js';

const stepOk = (label: string, detail?: string): DirectiveRun['steps'][number] => ({ label, status: 'ok', detail });
const stepFail = (label: string, detail?: string): DirectiveRun['steps'][number] => ({
  label,
  status: 'failed',
  detail,
});

let _seq = 0;
const runId = (): string => `run-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

const FORMAT_BY_ACTION = {
  'publish-carousel': 'carrusel',
  'publish-reel': 'reel',
  'publish-story': 'historia',
  'publish-post': 'post-imagen',
} as const;

/**
 * Execute one directive. Returns a DirectiveRun describing every step.
 * Never throws — failures are captured in the run.
 */
export const executeDirective = async (brand: BrandProfile, directive: Directive): Promise<DirectiveRun> => {
  const startedAt = new Date().toISOString();
  const steps: DirectiveRun['steps'] = [];
  let artifactId: string | undefined;
  let summary = '';
  let status: DirectiveRun['status'] = 'ok';

  try {
    if (directive.action === 'publish-carousel') {
      // Fábrica de carruseles 100% automática: tema relevante → copy branded
      // → render de slides → QA estética/originalidad → subida automática.
      steps.push(stepOk('Interpretar directiva', directive.interpretation));
      const cj = await runCarouselFactory(
        brand,
        {
          topic: directive.contentSpec.topic,
          autoPublish: directive.contentSpec.autoPublish,
        },
        `dir-${directive.id}`,
      );
      artifactId = cj.id;
      steps.push(
        stepOk(
          'Producir carrusel branded',
          `${cj.slideCount} slides · estética ${cj.aestheticScore}/100 · ${cj.attempts} intento(s)`,
        ),
      );
      steps.push(
        cj.status === 'published'
          ? stepOk('Publicar', cj.note)
          : cj.status === 'queued'
            ? stepOk('Publicar', cj.note)
            : cj.status === 'held'
              ? stepFail('Gate de calidad', cj.note)
              : stepFail('Fábrica de carrusel', cj.note),
      );
      status = cj.status === 'published' || cj.status === 'queued' ? 'ok' : cj.status === 'held' ? 'partial' : 'failed';
      summary = `Carrusel (${cj.slideCount} slides, estética ${cj.aestheticScore}) → ${cj.status}. ${cj.note}`.slice(
        0,
        240,
      );
    } else if (directive.action.startsWith('publish-')) {
      const format = FORMAT_BY_ACTION[directive.action as keyof typeof FORMAT_BY_ACTION] ?? 'carrusel';
      const idea = directive.contentSpec.topic
        ? `${directive.contentSpec.topic}`
        : 'Tema de alto valor del nicho según el loop de optimización';

      steps.push(stepOk('Interpretar directiva', directive.interpretation));

      const result = await produceContent(brand, { kind: 'idea', idea, format });
      artifactId = result.piece.id;
      steps.push(
        stepOk(
          `Producir ${format}`,
          `score ${result.scoreCard.combinedScore}, originalidad ${result.originality.originalityScore}, ${result.attempts} intento(s)`,
        ),
      );

      if (directive.contentSpec.applyBranding) {
        steps.push(stepOk('Aplicar identidad de marca', 'brandkit + dirección visual incluida en el brief'));
      }

      const passes = result.scoreCard.combinedScore >= 70 && result.originality.passed;

      if (directive.contentSpec.autoPublish && passes && !env.dryRun) {
        emit({
          type: 'DirectivePublishRequested',
          sourceAgent: 'directive-conductor',
          priority: 'high',
          correlationId: `dir-${directive.id}`,
          payload: { pieceId: result.piece.id, format, brand: brand.name },
        });
        steps.push(stepOk('Publicar', 'enviado al pipeline de publicación (sujeto a compliance)'));
        summary = `Pieza ${format} producida y enviada a publicación.`;
      } else if (directive.contentSpec.autoPublish && passes && env.dryRun) {
        steps.push(stepOk('Publicar', 'DRY_RUN activo — pieza lista, no se publicó realmente'));
        summary = `Pieza ${format} producida (DRY_RUN: no publicada).`;
      } else if (!passes) {
        status = 'partial';
        steps.push(stepFail('Gate de calidad', 'score/originalidad bajo umbral — queda para revisión'));
        summary = `Pieza ${format} producida pero retenida para revisión humana.`;
      } else {
        steps.push(stepOk('Dejar para aprobación', 'autoPublish desactivado por la directiva'));
        summary = `Pieza ${format} producida y dejada para tu aprobación.`;
      }
    } else if (directive.action === 'respond-dms' || directive.action === 'respond-comments') {
      // The conversational layer runs on the bot tick; the directive signals
      // intent + scope so the bot prioritizes it. We emit the request and
      // record it — actual replies are produced by the convo router/bot.
      emit({
        type: 'DirectiveRespondRequested',
        sourceAgent: 'directive-conductor',
        priority: 'high',
        correlationId: `dir-${directive.id}`,
        payload: { scope: directive.action, brand: brand.name },
      });
      steps.push(
        stepOk(
          directive.action === 'respond-dms' ? 'Atender mensajes directos' : 'Atender comentarios',
          'enrutado al Community Manager / Conversational Router',
        ),
      );
      summary =
        directive.action === 'respond-dms'
          ? 'Solicitud de respuesta de DMs enrutada a la comunidad.'
          : 'Solicitud de respuesta de comentarios enrutada a la comunidad.';
    } else if (directive.action === 'audit') {
      const audit = await runWeeklyAudit(brand, 7);
      steps.push(stepOk('Auditoría de KPIs', `score ${audit.overallScore}/100 — ${audit.overallBand}`));
      summary = `Auditoría completa: ${audit.overallScore}/100. ${audit.executiveSummary}`.slice(0, 240);
    } else if (directive.action === 'optimize') {
      const opt = await runAutoOptimization(brand, 30);
      steps.push(stepOk('Auto-optimización', `${opt.recommendations.length} recomendaciones nuevas`));
      summary = opt.executiveSummary.slice(0, 240);
    } else {
      // grow-followers / plan-week / engage-faro / custom → misión autónoma
      // de punta a punta a través del framework orquestador (planner + crew
      // + crítico + replan). Cada directiva vigente se convierte así en una
      // misión swarm completa, sin intervención humana salvo checkpoints.
      const objective = directive.contentSpec.topic
        ? `${directive.rawText} — foco: ${directive.contentSpec.topic}`
        : directive.rawText;
      const mission = await runMission(brand, objective);
      artifactId = mission.id;
      const okSteps = mission.steps.filter((s) => s.status === 'completed').length;
      const escalated = mission.steps.filter((s) => s.status === 'escalated').length;
      steps.push(
        mission.status === 'failed'
          ? stepFail('Misión autónoma', mission.summary.slice(0, 200))
          : stepOk(
              'Misión autónoma',
              `crew ${mission.crew.length} · ${okSteps}/${mission.steps.length} tareas OK${escalated ? ` · ${escalated} escaladas` : ''} · replans ${mission.replans}`,
            ),
      );
      status = mission.status === 'completed' ? 'ok' : mission.status === 'partial' ? 'partial' : 'failed';
      summary = mission.summary.slice(0, 240);
    }
  } catch (err) {
    status = 'failed';
    steps.push(stepFail('Ejecución', (err as Error).message));
    summary = `Error ejecutando la directiva: ${(err as Error).message}`;
  }

  const run: DirectiveRun = {
    id: runId(),
    directiveId: directive.id,
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    steps,
    artifactId,
    summary,
  };

  recordTrace({
    agentId: 'directive-conductor',
    decisionType: 'goal-decomposition',
    context: { directiveId: directive.id, action: directive.action, raw: directive.rawText },
    alternatives: [{ option: directive.action, score: status === 'ok' ? 100 : status === 'partial' ? 60 : 0 }],
    chosen: directive.action,
    reasoning: summary,
    brandId: brand.name,
    correlationId: `dir-${directive.id}`,
  });

  emit({
    type: 'DirectiveExecuted',
    sourceAgent: 'directive-conductor',
    priority: 'normal',
    correlationId: `dir-${directive.id}`,
    payload: { directiveId: directive.id, action: directive.action, status, artifactId },
  });

  return run;
};
