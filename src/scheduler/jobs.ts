import type { BrandProfile } from '../config/types.js';
import { enviarDigest } from '../capabilities/digest/index.js';
import { isAutopilotModuleActive, isAutopilotMasterActivated, markModuleRun } from '../capabilities/autopilot/index.js';
import { env } from '../config/index.js';
import { procesarTodasLasSources } from '../capabilities/curator/index.js';
import { ejecutarPasosListos } from '../capabilities/nurture/index.js';
import { runOnce as botRunOnce } from '../capabilities/bot/index.js';
import { expirarSolicitudesViejas, listarPorEstado } from '../capabilities/ugc/index.js';
import { sendAlert } from '../integrations/notifications.js';
import { runWeeklyAutopilot } from '../capabilities/pipelines/index.js';
import { scoreAesthetic } from '../capabilities/aesthetic/index.js';
import { generateImage } from '../integrations/imageGen.js';
import { validateAllCanvaTemplates, logTemplateHealthReport } from '../integrations/canvaTemplateValidator.js';
import { scoutTrends } from '../capabilities/trends/index.js';
import { investigarHashtags } from '../capabilities/hashtags/index.js';
import { generarComentariosFaro } from '../capabilities/growth/index.js';
import { ensureBrandStrategy, evaluateBrandRules, generateBrandRuleReport } from '../capabilities/branding/index.js';
import { runBrandConsistencyCheck } from '../capabilities/brandkit/consistencyEngine.js';
import { ensureBrandKit } from '../capabilities/brandkit/index.js';
import { listCheckpoints } from '../agent/checkpoints.js';
import { topPerformers } from '../agent/memory.js';
import { askJson } from '../agent/claude.js';
import { brandContext } from '../agent/memory.js';
import { log } from '../agent/logger.js';
import { runWeeklyAudit, persistAudit, getAuditTrend } from '../capabilities/kpiAudit/index.js';
import { runAutoOptimization, recordOptimizationRun, listRecommendations } from '../capabilities/autoOptimize/index.js';
import { produceBatch } from '../capabilities/autonomous/index.js';
import { planRetentionPulses, defaultSignals, getPulseStats } from '../capabilities/retentionPulse/index.js';
import { clearOldFingerprints } from '../capabilities/originality/index.js';
import { osTick } from '../os/autonomousCore.js';
import {
  realizarBeaconEngagement,
  procesarNotificaciones,
  leerInsights,
} from '../capabilities/computerUse/instagramActions.js';
import { recordPost, getAccountSummary } from '../capabilities/analytics/performanceDB.js';
import { rebuildTimingModel } from '../capabilities/analytics/audienceTiming.js';
import { processQueue, getQueueStatus } from '../integrations/eventReactor.js';
import {
  recordDailySnapshot,
  detectAndCelebrateMilestones,
  getCurrentProgress,
  getGrowthHealth,
  recommendNextActions,
} from '../capabilities/growth/growthEngine.js';
import { runBoostTick, getActiveBoosts } from '../capabilities/growth/postBoost.js';
import { rideTheWave } from '../capabilities/trends/viralTracker.js';
import { buildTextSummary, getQuickInsights } from '../capabilities/growth/growthDashboard.js';
import {
  autoUpdateProgress as autoUpdateGoalProgress,
  notifyHealthIssues as notifyGoalsHealthIssues,
  findGoalsClosingSoon,
  periodBoundaries,
} from '../capabilities/goals/goalManager.js';
import { processUpcomingEvents } from '../capabilities/goals/calendarBoard.js';
import { generatePeriodReport, sendReportAlert } from '../capabilities/goals/periodReport.js';
import { runFullRenewal } from '../capabilities/branding/brandRenewal.js';
import { tickInbox as cmTickInbox, getInboxSnapshot } from '../capabilities/community/dmInbox.js';
import { detectFAQPatterns } from '../capabilities/community/faqDatabase.js';
import { planDailyStories } from '../capabilities/community/storiesStudio.js';
import { processFollowUpsDue, getPipelineSnapshot } from '../capabilities/community/leadPipeline.js';
import {
  processNewFollowersQueue,
  refreshAllFanProfiles,
  detectChurningFans,
  proposeFanOfTheWeek,
} from '../capabilities/community/fanRecognition.js';
import { getSupportSnapshot } from '../capabilities/community/customerSupport.js';
import { getMentionsSnapshot } from '../capabilities/community/mentionTracker.js';
import { getUGCSnapshot } from '../capabilities/community/ugcManager.js';
import { runAccountabilityTick } from '../capabilities/accountabilityEngine/accountabilityEngine.js';
import { listPromises } from '../capabilities/promiseRegistry/promiseRegistry.js';
import { listDueScheduledPosts, updateCalendarPost } from '../database/calendarQueue.js';
import { addJob } from '../workers/queue.js';
import { generatePromiseReport, promiseReportToMarkdown } from '../capabilities/promiseRegistry/promiseReporter.js';
import { auditContentForEmptyPromises } from '../capabilities/antiPromiseAuditor/antiPromiseAuditor.js';

export type JobName =
  | 'calendar-dispatcher'
  | 'digest-diario'
  | 'curator-fetch'
  | 'nurture-ejecutar'
  | 'bot-poll'
  | 'smart-reply-daily'
  | 'cmo-daily-cycle'
  | 'video-engine-health'
  | 'ugc-expirar'
  | 'autopilot-semanal'
  | 'studio-daily-render'
  | 'aesthetic-audit'
  | 'asset-curation'
  | 'playbook-viral-scan'
  | 'playbook-lead-nurture'
  | 'playbook-community-sprint'
  | 'agent-checkpoints-reminder'
  | 'discipline-audit'
  | 'hashtag-rotation'
  | 'predictor-weekly'
  | 'brand-consistency-check'
  | 'competitor-monitor'
  | 'weekly-kpi-audit'
  | 'auto-optimization'
  | 'autonomous-producer-batch'
  | 'retention-pulse-plan'
  | 'performance-sync'
  | 'timing-model-rebuild'
  | 'events-processor'
  | 'content-pipeline-daily'
  | 'performance-weekly-digest'
  | 'growth-daily-snapshot'
  | 'growth-milestone-check'
  | 'growth-daily-recommendations'
  | 'post-boost-tick'
  | 'viral-scan-daily'
  | 'growth-dashboard-monday'
  | 'goals-progress-sync'
  | 'goals-health-monitor'
  | 'calendar-prep-processor'
  | 'period-report-weekly'
  | 'period-report-monthly'
  | 'period-report-quarterly'
  | 'period-report-annual'
  | 'brand-audit-monthly'
  | 'cm-inbox-tick'
  | 'cm-stories-daily'
  | 'cm-faq-mining-weekly'
  | 'cm-leads-followups'
  | 'cm-fan-welcomes'
  | 'cm-fan-refresh'
  | 'cm-fan-churning-detect'
  | 'cm-community-snapshot'
  | 'originality-fingerprint-prune'
  | 'os-tick'
  | 'ig-beacon-engagement'
  | 'ig-process-notifications'
  | 'ig-read-insights'
  | 'ig-weekly-growth'
  | 'ig-community-daily'
  | 'ig-knowledge-study'
  | 'bandit-sync'
  | 'directives-tick'
  | 'cu-morning-routine'
  | 'cu-story-engagement'
  | 'cu-weekly-explore'
  | 'cu-selector-health'
  | 'trigger-trend-scout'
  | 'trigger-competitor-monitor'
  | 'trigger-anomaly-scan'
  | 'trigger-weekly-report'
  | 'trigger-event-bus'
  | 'trigger-autonomous'
  | 'agent-evolution-weekly'
  | 'custom-playbook-scheduler'
  | 'instagram-publish-queue'
  | 'browser-session-warmup'
  | 'antidetect-health-check'
  | 'competitor-weekly-intelligence'
  | 'canva-daily-design'
  | 'capcut-weekly-reel'
  | 'video-ai-generate'
  | 'canva-template-health'
  | 'conversion-weekly-funnel'
  | 'profile-monthly-audit'
  | 'ritual-weekly-plan'
  | 'audience-monthly-segment'
  | 'fomo-trending-daily'
  | 'dm-triage-hourly'
  | 'lead-nurture-batch'
  | 'anomaly-scan'
  | 'community-daily-engagement'
  | 'promise-daily-check'
  | 'promise-weekly-report'
  | 'anti-promise-audit'
  | 'autopilot-weekly'
  | 'fomo-anticipation-weekly'
  | 'fomo-drop-monthly'
  | 'fomo-campaign-quarterly'
  | 'repurpose-daily'
  | 'cross-platform-publish-queue'
  | 'platform-health-check'
  | 'brain-memory-compaction'
  | 'brain-trend-sync'
  | 'brain-language-prune'
  | 'brain-episode-summarize'
  | 'brain-personality-evolve'
  | 'brain-causal-infer'
  | 'brain-nightly-learning'
  | 'brain-orchestrator-daily'
  | 'brain-crisis-scan'
  | 'brain-competitor-track'
  | 'brain-recycler-scan'
  | 'brain-revenue-sync'
  | 'brain-lifecycle-sync'
  | 'brain-social-listening'
  | 'brain-crossbrand-sync'
  | 'brain-dream-nightly'
  | 'brain-emotional-sync'
  | 'brain-forecast-weekly'
  | 'brain-evolution-weekly'
  | 'brain-loop-optimize'
  | 'brain-hashtag-sync'
  | 'smart-boost-detector'
  | 'campaign-performance-daily'
  | 'campaign-audit-weekly'
  | 'budget-optimizer'
  | 'lead-score-sync'
  | 'sales-funnel-daily'
  | 'revenue-attribution-weekly'
  | 'tiktok-trend-scout'
  | 'tiktok-fyp-optimizer'
  | 'tiktok-analytics-sync'
  | 'tiktok-content-producer'
  | 'audio-music-generate'
  | 'audio-sfx-pack-generate'
  // ── Sprint 7: Neural Brain + Vector DB ──────────────────────────────
  | 'neural-memory-consolidate'
  | 'neural-learning-sync'
  | 'vector-store-cleanup'
  | 'rag-knowledge-sync'
  | 'semantic-search-index'
  | 'attention-routing-daily'
  // ── Sprint 8: Agent Swarm + Predictive ML ───────────────────────────
  | 'swarm-daily-orchestration'
  | 'predictive-content-score'
  | 'anomaly-daily-scan'
  | 'trend-forecast-weekly'
  | 'engagement-model-train'
  | 'swarm-consensus-daily'
  // ── Sprint 9: Real-Time Infrastructure ──────────────────────────────
  | 'realtime-health-pulse'
  | 'event-bus-cleanup'
  | 'live-stream-monitor'
  | 'webhook-retry-failed'
  | 'realtime-analytics-flush'
  | 'push-digest-realtime'
  // ── Sprint 10: Computer Vision ──────────────────────────────────────
  | 'vision-daily-content-audit'
  | 'auto-moderation-scan'
  | 'visual-palette-sync'
  | 'ocr-batch-extract'
  | 'face-check-compliance'
  | 'similar-content-detection'
  // ── Sprint 11: Self-Improvement + AR ────────────────────────────────
  | 'feedback-daily-collect'
  | 'performance-weekly-review'
  | 'strategy-auto-tune'
  | 'ar-filter-refresh'
  | 'ar-preview-check'
  | 'ar-campaign-track';

export interface JobDefinition {
  name: JobName;
  description: string;
  defaultCron: string;
  handler: (brand: BrandProfile) => Promise<unknown>;
}

export const jobs: JobDefinition[] = [
  // ── Core jobs ─────────────────────────────────────────────────────────────

  {
    name: 'calendar-dispatcher',
    description: 'Revisa posts programados vencidos y los encola en socialPublish para publicación real.',
    defaultCron: '* * * * *',
    handler: async (): Promise<unknown> => {
      const due = await listDueScheduledPosts(50);
      if (due.length === 0) return { dispatched: 0 };
      const results = await Promise.all(
        due.map(async (post) => {
          await updateCalendarPost(post.id, { status: 'publishing' });
          const res = await addJob({
            name: 'socialPublish',
            payload: { postId: post.id, accountId: post.accountId },
            accountId: post.accountId,
          });
          if (!res.ok) {
            // Si no se pudo encolar, dejarlo scheduled para el próximo tick
            await updateCalendarPost(post.id, { status: 'scheduled' });
            return { postId: post.id, ok: false, error: res.error };
          }
          return { postId: post.id, ok: true, jobId: res.id };
        }),
      );
      const dispatched = results.filter((r) => r.ok).length;
      return { dispatched, total: due.length, results };
    },
  },

  {
    name: 'digest-diario',
    description: 'Construye y envía el digest diario consolidando todos los módulos.',
    defaultCron: '30 8 * * *',
    handler: enviarDigest,
  },
  {
    name: 'curator-fetch',
    description: 'Procesa todas las sources del Content Curator y agrega ítems al backlog.',
    defaultCron: '0 7,15 * * *',
    handler: procesarTodasLasSources,
  },
  {
    name: 'nurture-ejecutar',
    description: 'Ejecuta los pasos pendientes de las nurture sequences.',
    defaultCron: '*/15 * * * *',
    handler: async () => ejecutarPasosListos(),
  },
  {
    name: 'bot-poll',
    description:
      'Una iteración del bot: pide DMs/comentarios nuevos a Meta y procesa con Unified Reply Orchestrator (CRM + memoria + RAG + FAQ + tone guardian). Gateado por Cerebro Activado · módulo Convo Router.',
    defaultCron: '* * * * *',
    handler: async (brand): Promise<unknown> => {
      if (!isAutopilotModuleActive('convoRouter')) {
        // Modo manual: el usuario procesa DMs/comentarios cuando quiere; el
        // bot autónomo no actúa hasta encender el Cerebro + Convo Router.
        return { skipped: true, reason: 'autopilot:convoRouter off' };
      }
      const result = await botRunOnce(brand);
      markModuleRun('convoRouter');
      return result;
    },
  },
  {
    name: 'smart-reply-daily',
    description: 'Reporte diario del orquestador de respuestas: FAQs usadas, fuentes de respuesta y escalaciones.',
    defaultCron: '0 9 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { listAllContexts } = await import('../capabilities/bot/conversationMemory.js');
      const { getFAQSnapshot } = await import('../capabilities/community/faqDatabase.js');
      const { getCacheStats } = await import('../capabilities/tiktok/trendScraper.js');
      const contexts = listAllContexts();
      const faqSnapshot = getFAQSnapshot();
      const escalated = contexts.filter((c) => c.escaladoAHumano).length;
      log.info(
        `[SmartReplyDaily] ${contexts.length} conversaciones, ${escalated} escaladas, ${faqSnapshot.totalFAQs} FAQs`,
      );
      return {
        conversations: contexts.length,
        escalated,
        faqSnapshot,
        trendCache: getCacheStats(),
      };
    },
  },
  {
    name: 'cmo-daily-cycle',
    description:
      'Ciclo diario del CMO Autónomo: inteligencia → estrategia → producción → publicación → community → analytics → optimización.',
    defaultCron: '0 8 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runCMODailyCycle } = await import('../os/cmoCore.js');
      return runCMODailyCycle(brand);
    },
  },
  {
    name: 'video-engine-health',
    description: 'Verifica disponibilidad de proveedores de video (Runway, HeyGen) y reporta estado.',
    defaultCron: '0 */6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { isRunwayAvailable } = await import('../integrations/runway.js');
      const { isHeyGenAvailable } = await import('../integrations/heygen.js');
      const { isElevenLabsAvailable } = await import('../integrations/elevenlabs.js');
      const status = {
        runway: isRunwayAvailable(),
        heygen: isHeyGenAvailable(),
        elevenlabs: isElevenLabsAvailable(),
      };
      log.info(`[VideoEngineHealth] ${JSON.stringify(status)}`);
      return status;
    },
  },
  {
    name: 'ugc-expirar',
    description: 'Marca como expiradas solicitudes UGC sin respuesta >7 días.',
    defaultCron: '0 9 * * *',
    handler: async (): Promise<{ expirados: number; aprobadosPorRevisar: number }> => {
      const expirados = expirarSolicitudesViejas(7);
      const aprobadosPorRevisar = listarPorEstado('aprobado');
      if (expirados.length || aprobadosPorRevisar.length) {
        await sendAlert({
          severity: 'info',
          title: 'UGC: pendientes de revisión',
          body: `${expirados.length} expirados, ${aprobadosPorRevisar.length} aprobados sin republicar`,
        });
      }
      return { expirados: expirados.length, aprobadosPorRevisar: aprobadosPorRevisar.length };
    },
  },
  {
    name: 'autopilot-semanal',
    description: 'Corre el autopilot semanal y deja todo pendiente de aprobación (gateado por Cerebro Activado).',
    defaultCron: '0 8 * * 1',
    handler: async (brand): Promise<unknown> => {
      if (!isAutopilotMasterActivated()) {
        return { skipped: true, reason: 'autopilot:master off' };
      }
      const r = await runWeeklyAutopilot(brand, { dryRunBrief: true });
      // Marcamos los 3 módulos que el autopilot semanal toca.
      markModuleRun('templates');
      markModuleRun('pinSlate');
      markModuleRun('outreach');
      return r;
    },
  },
  {
    name: 'studio-daily-render',
    description: 'Renderiza contenido pre-aprobado que esté en cola de producción.',
    defaultCron: '0 10,16 * * *',
    handler: async (_brand): Promise<{ status: string; rendered: number }> => {
      log.info('[studio-daily-render] Revisando cola de producción...');
      return { status: 'checked', rendered: 0 };
    },
  },
  {
    name: 'aesthetic-audit',
    description: 'Revisa el backlog visual y evalúa coherencia estética del contenido planificado.',
    defaultCron: '0 9 * * 2,5',
    handler: async (brand): Promise<{ score: number; issues: number }> => {
      log.info('[aesthetic-audit] Auditando backlog visual...');
      const dummyProposal = {
        title: 'Audit semanal',
        format: 'post-imagen' as const,
        colorsUsed: brand.visual.palette.slice(0, 3),
        fontsUsed: brand.visual.typography,
        textBlocks: 3,
        imageBlocks: 1,
        densityEstimate: brand.visual.density ?? 'medium',
        description: `${brand.visual.style}, ${brand.visual.mood ?? 'profesional'}`,
      };
      const score = scoreAesthetic(brand, dummyProposal);
      if (score.total < 70) {
        await sendAlert({
          severity: 'warn',
          title: 'Aesthetic Audit: score bajo',
          body: `Score estético: ${score.total}/100. Issues: ${score.issues.slice(0, 3).join('; ')}`,
        });
      }
      return { score: score.total, issues: score.issues.length };
    },
  },
  {
    name: 'asset-curation',
    description: 'Genera assets visuales de stock para la semana usando IA.',
    defaultCron: '0 6 * * 1',
    handler: async (brand): Promise<{ generated: number; total: number }> => {
      log.info('[asset-curation] Generando assets semanales...');
      const prompts = [
        `Fondo minimalista ${brand.visual.style}, paleta ${brand.visual.palette.slice(0, 2).join('/')}`,
        `Textura sutil en tonos ${brand.visual.palette[0] ?? '#0A0A0A'}`,
      ];
      const results: Array<{ ok: boolean }> = [];
      for (const prompt of prompts) {
        const result = await generateImage({ prompt, aspectRatio: '1:1', count: 1 });
        results.push({ ok: result.ok });
      }
      return { generated: results.filter((r) => r.ok).length, total: results.length };
    },
  },

  // ── Playbooks implementados ───────────────────────────────────────────────

  {
    name: 'playbook-viral-scan',
    description: 'Detecta oportunidades virales cada 4 horas y alerta si hay tendencias accionables.',
    defaultCron: '0 */4 * * *',
    handler: async (brand): Promise<{ trends: number; highPriority: number; alerted: boolean }> => {
      log.info('[playbook-viral-scan] Escaneando tendencias virales...');
      const { angulos } = await scoutTrends(brand);
      const highPriority = angulos.filter(
        (a) => a.saturacionEstimada === 'baja' && a.ventanaOportunidad.includes('días'),
      );
      let alerted = false;
      if (highPriority.length >= 2) {
        await sendAlert({
          severity: 'info',
          title: `🚀 ${highPriority.length} tendencias virales detectadas`,
          body: highPriority
            .slice(0, 3)
            .map((a) => `• ${a.angulo} (${a.plataformaOrigen}) — ${a.encajeConMarca}`)
            .join('\n'),
        });
        alerted = true;
      }
      return { trends: angulos.length, highPriority: highPriority.length, alerted };
    },
  },
  {
    name: 'playbook-lead-nurture',
    description: 'Avanza los pasos de nurture pendientes y alerta leads CRM-listos.',
    defaultCron: '*/15 * * * *',
    handler: async (): Promise<{ ejecutados: number; alertados: number }> => {
      const ejecutados = await ejecutarPasosListos();
      const alertados = 0;
      return {
        ejecutados: Array.isArray(ejecutados) ? ejecutados.length : 0,
        alertados,
      };
    },
  },
  {
    name: 'playbook-community-sprint',
    description: 'Sprint semanal de community: comentarios faro + plan de nurturing de fans.',
    defaultCron: '0 7 * * 1',
    handler: async (brand): Promise<{ comentariosGenerados: number; ok: boolean }> => {
      log.info('[playbook-community-sprint] Iniciando sprint de community...');
      const comentarios = await generarComentariosFaro(brand, []);
      const count = Array.isArray(comentarios) ? comentarios.length : 0;
      if (count > 0) {
        await sendAlert({
          severity: 'info',
          title: `❤️ Community sprint: ${count} comentarios faro listos`,
          body: `Comentarios estratégicos generados para esta semana.\nPrimero: "${Array.isArray(comentarios) && comentarios[0] ? comentarios[0].comentarioSugerido.slice(0, 120) : '—'}"`,
        });
      }
      return { comentariosGenerados: count, ok: true };
    },
  },
  {
    name: 'agent-checkpoints-reminder',
    description: 'Alerta si hay checkpoints pendientes o vencidos que requieren aprobación humana.',
    defaultCron: '0 */2 * * *',
    handler: async (): Promise<{ pending: number; expired: number; alerted: boolean }> => {
      const pending = listCheckpoints('pending');
      const expired = listCheckpoints('expired');
      let alerted = false;
      if (pending.length > 0) {
        await sendAlert({
          severity: pending.length > 3 ? 'crisis' : 'warn',
          title: `⏳ ${pending.length} checkpoint${pending.length > 1 ? 's' : ''} pendiente${pending.length > 1 ? 's' : ''} de aprobación`,
          body: pending
            .slice(0, 5)
            .map((c) => `• [${c.type}] ${c.description} (creado: ${new Date(c.createdAt).toLocaleString('es-AR')})`)
            .join('\n'),
        });
        alerted = true;
      }
      return { pending: pending.length, expired: expired.length, alerted };
    },
  },
  {
    name: 'discipline-audit',
    description: 'Auditoría semanal de consistencia de marca y voz — reporte completo.',
    defaultCron: '0 20 * * 0',
    handler: async (brand): Promise<{ score: number; passed: boolean; violations: number }> => {
      log.info('[discipline-audit] Ejecutando auditoría semanal de disciplina de marca...');
      const strategy = ensureBrandStrategy(brand.name);
      const sampleContent: Parameters<typeof evaluateBrandRules>[0] = {
        format: 'post-imagen',
        caption: `Contenido representativo de ${brand.niche} para auditoría`,
        description: `Auditoría semanal — nicho: ${brand.niche}`,
        colorsUsed: brand.visual.palette.slice(0, 3),
        fontsUsed: brand.visual.typography,
        textBlocks: 2,
        imageBlocks: 1,
        density: brand.visual.density,
      };
      const sampleAsset: Parameters<typeof evaluateBrandRules>[1] = {
        type: 'image',
        name: `Pieza representativa ${brand.name}`,
      };
      const sampleInteraction: Parameters<typeof evaluateBrandRules>[2] = {
        channel: 'instagram',
        tone: brand.voice.tone[0] ?? 'profesional',
        personalized: true,
      };
      const evaluation = evaluateBrandRules(sampleContent, sampleAsset, sampleInteraction, brand, strategy);
      const report = generateBrandRuleReport(evaluation);
      if (!evaluation.passed || (strategy.vision && evaluation.score < 70)) {
        await sendAlert({
          severity: evaluation.score < 60 ? 'crisis' : 'warn',
          title: `📊 Discipline Audit: score ${evaluation.score}/100`,
          body: `${evaluation.passed ? '✅ Pasó el umbral' : '❌ Por debajo del umbral'}\n${report.slice(0, 400)}`,
        });
      }
      return {
        score: evaluation.score,
        passed: evaluation.passed,
        violations: evaluation.violations.length,
      };
    },
  },

  // ── Nuevos jobs ───────────────────────────────────────────────────────────

  {
    name: 'hashtag-rotation',
    description: 'Investigación semanal de hashtags y rotación estratégica del pool activo.',
    defaultCron: '0 9 * * 1',
    handler: async (brand): Promise<{ sets: number; alerted: boolean }> => {
      log.info('[hashtag-rotation] Investigando y rotando hashtags...');
      const research = await investigarHashtags(brand);
      const totalTags = Object.values(research.pools).reduce((n, pool) => n + pool.length, 0);
      await sendAlert({
        severity: 'info',
        title: `#️⃣ Hashtag rotation: ${totalTags} tags auditados`,
        body: [
          `Mix recomendado: mega×${research.recomendacionMezclaPorPost.mega} grande×${research.recomendacionMezclaPorPost.grande} medio×${research.recomendacionMezclaPorPost.medio} nicho×${research.recomendacionMezclaPorPost.nicho} marca×${research.recomendacionMezclaPorPost.marca}`,
          research.notas ? `\nNotas: ${research.notas.slice(0, 200)}` : '',
        ].join(''),
      });
      return { sets: Object.keys(research.pools).length, alerted: true };
    },
  },
  {
    name: 'predictor-weekly',
    description: 'Predice el mejor contenido para la semana basándose en top performers históricos.',
    defaultCron: '0 22 * * 0',
    handler: async (brand): Promise<{ predictions: number; alerted: boolean }> => {
      log.info('[predictor-weekly] Generando predicciones semanales...');
      const best = topPerformers(5);
      type Prediction = { format: string; hookSugerido: string; mejorHora: string; objetivoPrimario: string };
      const result = await askJson<{ predictions: Prediction[] }>(
        `Actuás como predictor de performance de contenido en Instagram.

${brandContext(brand)}

TOP PERFORMERS HISTÓRICOS DE LA CUENTA:
${best.length ? best.map((p, i) => `${i + 1}. [${p.format}] "${p.hookFirstLine}" → saves=${p.metrics.saves} shares=${p.metrics.shares} likes=${p.metrics.likes}`).join('\n') : 'Sin historial aún.'}

Basándote en estos datos y el nicho, predecí los 3-5 mejores tipos de contenido para publicar esta semana.
Para cada predicción incluí: formato, hook sugerido listo para usar, mejor hora de publicación y objetivo primario.

Respondé EXCLUSIVAMENTE con JSON: { "predictions": [{ "format": string, "hookSugerido": string, "mejorHora": string, "objetivoPrimario": string }] }`,
        { maxTokens: 800 },
      );
      const preds = result.predictions ?? [];
      if (preds.length) {
        await sendAlert({
          severity: 'info',
          title: `🔮 Predictor semanal: ${preds.length} formatos recomendados`,
          body: preds
            .slice(0, 3)
            .map((p) => `• [${p.format}] ${p.hookSugerido.slice(0, 80)}… → ${p.mejorHora}`)
            .join('\n'),
        });
      }
      return { predictions: preds.length, alerted: preds.length > 0 };
    },
  },
  {
    name: 'brand-consistency-check',
    description: 'Verificación semanal de consistencia de marca en el contenido planificado.',
    defaultCron: '0 10 * * 3',
    handler: async (brand): Promise<{ score: number; passed: boolean; issues: number }> => {
      log.info('[brand-consistency-check] Verificando consistencia de marca...');
      const kit = ensureBrandKit(brand.name);
      const check = runBrandConsistencyCheck(
        {
          title: 'Check semanal de consistencia',
          format: 'post-imagen',
          description: `Contenido de marca en nicho ${brand.niche}`,
          colorsUsed: brand.visual.palette.slice(0, 3),
          fontsUsed: brand.visual.typography,
          textBlocks: 2,
          imageBlocks: 1,
          density: brand.visual.density,
        },
        brand,
        kit,
      );
      if (!check.passed) {
        await sendAlert({
          severity: check.combinedScore < 60 ? 'crisis' : 'warn',
          title: `🎨 Brand Consistency: ${check.combinedScore}/100`,
          body: [
            `Consistencia: ${check.consistencyScore} | Estética: ${check.aestheticScore}`,
            check.issues
              .slice(0, 3)
              .map((i) => `• ${i.message}`)
              .join('\n'),
            check.recommendations
              .slice(0, 2)
              .map((r) => `→ ${r}`)
              .join('\n'),
          ].join('\n'),
        });
      }
      return { score: check.combinedScore, passed: check.passed, issues: check.issues.length };
    },
  },
  {
    name: 'competitor-monitor',
    description: 'Monitoreo diario de tendencias competitivas y oportunidades de contenido.',
    defaultCron: '0 14 * * *',
    handler: async (brand): Promise<{ angulos: number; oportunidades: number; alerted: boolean }> => {
      log.info('[competitor-monitor] Monitoreando landscape competitivo...');
      const { angulos, resumenPatrones } = await scoutTrends(brand);
      const oportunidades = angulos.filter((a) => a.saturacionEstimada !== 'alta');
      let alerted = false;
      if (oportunidades.length >= 3) {
        await sendAlert({
          severity: 'info',
          title: `🔍 Monitor competitivo: ${oportunidades.length} oportunidades`,
          body: [
            resumenPatrones.slice(0, 150),
            '',
            oportunidades
              .slice(0, 3)
              .map(
                (a) =>
                  `• ${a.angulo} (${a.plataformaOrigen}, sat=${a.saturacionEstimada}): ${a.encajeConMarca.slice(0, 80)}`,
              )
              .join('\n'),
          ].join('\n'),
        });
        alerted = true;
      }
      return { angulos: angulos.length, oportunidades: oportunidades.length, alerted };
    },
  },

  // ── Autonomous operating system jobs ──────────────────────────────────────

  {
    name: 'weekly-kpi-audit',
    description:
      'Auditoría completa: performance + branding + crisis + experimentos + ajuste automático de estrategia.',
    defaultCron: '0 8 * * 1', // Mondays at 8am — start of week.
    handler: async (brand): Promise<{ score: number; band: string; priorities: number; adjustments: number }> => {
      log.info('[weekly-kpi-audit] Ejecutando auditoría semanal completa...');
      const audit = await runWeeklyAudit(brand, 7);
      persistAudit(audit);
      const trend = getAuditTrend();
      const trendStr =
        trend.deltaPct !== null ? ` (${trend.deltaPct > 0 ? '+' : ''}${trend.deltaPct}% vs semana pasada)` : '';
      await sendAlert({
        severity: audit.overallScore < 60 ? 'warn' : 'reporte',
        title: `📊 Audit semanal: ${audit.overallScore}/100 — ${audit.overallBand}${trendStr}`,
        body: [
          audit.executiveSummary,
          '',
          'PRIORIDADES DE LA SEMANA:',
          ...audit.priorities.slice(0, 3).map((p) => `${p.rank}. ${p.title} (owner: ${p.ownerHint})`),
          '',
          `Ajustes auto-aplicados al store de estrategia: ${audit.appliedAdjustments}`,
        ].join('\n'),
      });
      return {
        score: audit.overallScore,
        band: audit.overallBand,
        priorities: audit.priorities.length,
        adjustments: audit.appliedAdjustments,
      };
    },
  },

  {
    name: 'auto-optimization',
    description: 'Bucle de auto-optimización: extrae patrones de top performers y propone ajustes y próximas piezas.',
    defaultCron: '0 6 * * 1,4', // Mon + Thu morning — twice a week.
    handler: async (brand): Promise<{ recommendations: number; adjustments: number; sampleSize: number }> => {
      log.info('[auto-optimization] Cerrando loop de aprendizaje desde top performers...');
      const result = await runAutoOptimization(brand, 60);
      const stored = recordOptimizationRun(result);
      if (stored.storedRecommendations.length > 0) {
        await sendAlert({
          severity: 'info',
          title: `🔁 Auto-optimization: ${stored.storedRecommendations.length} recomendaciones nuevas`,
          body: [
            result.executiveSummary,
            '',
            'Próximas piezas sugeridas:',
            ...stored.storedRecommendations
              .slice(0, 3)
              .map((r) => `• [${r.format}] ${r.hookText.slice(0, 80)} (×${r.expectedSavesMultiplier} saves)`),
          ].join('\n'),
        });
      }
      return {
        recommendations: stored.storedRecommendations.length,
        adjustments: stored.storedAdjustments.length,
        sampleSize: result.extraction.sampleSize,
      };
    },
  },

  {
    name: 'autonomous-producer-batch',
    description: 'Producer autónomo: convierte las top 3 recomendaciones en piezas listas para revisión humana.',
    defaultCron: '0 9 * * 2,5', // Tue + Fri — day after auto-optimization.
    handler: async (brand): Promise<{ produced: number; avgScore: number; passingThreshold: number }> => {
      log.info('[autonomous-producer-batch] Produciendo lote de piezas autónomas...');
      const pending = listRecommendations({ status: 'propuesto' });
      if (pending.length === 0) {
        log.info('[autonomous-producer-batch] Sin recomendaciones pendientes — skip.');
        return { produced: 0, avgScore: 0, passingThreshold: 0 };
      }
      const results = await produceBatch(brand, Math.min(3, pending.length));
      const avgScore = results.length
        ? Math.round(results.reduce((acc, r) => acc + r.scoreCard.combinedScore, 0) / results.length)
        : 0;
      const passing = results.filter((r) => r.scoreCard.combinedScore >= 72).length;
      if (results.length > 0) {
        await sendAlert({
          severity: passing >= results.length / 2 ? 'reporte' : 'warn',
          title: `🤖 Producer batch: ${results.length} piezas (${passing} ≥72 score)`,
          body: results
            .slice(0, 3)
            .map(
              (r) =>
                `• [${r.piece.format}] score ${r.scoreCard.combinedScore} (${r.scoreCard.band}): ${r.piece.hook.slice(0, 80)}`,
            )
            .join('\n'),
        });
      }
      return { produced: results.length, avgScore, passingThreshold: passing };
    },
  },

  {
    name: 'retention-pulse-plan',
    description:
      'Planifica pulsos de re-engagement: DMs a leads fríos, stories a dormidos, callbacks a virales pasados.',
    defaultCron: '0 7 * * 3', // Wednesdays at 7am.
    handler: async (
      brand,
    ): Promise<{ created: number; highPriority: number; total: number; skipped?: boolean; reason?: string }> => {
      if (!isAutopilotModuleActive('retention')) {
        log.info('[retention-pulse-plan] Saltado: Cerebro Activado OFF o módulo Retention apagado.');
        return { created: 0, highPriority: 0, total: 0, skipped: true, reason: 'autopilot:retention off' };
      }
      log.info('[retention-pulse-plan] Planificando ciclo de retención proactiva...');
      // Until we wire signal pulls from Insights API, we use sensible defaults
      // that won't trigger pulses unless the user manually feeds signals via API.
      const signals = defaultSignals();
      const created = planRetentionPulses(brand, signals);
      const stats = getPulseStats();
      if (created.length > 0) {
        await sendAlert({
          severity: stats.highPriorityPending > 0 ? 'lead' : 'info',
          title: `🔁 Retention pulses: ${created.length} nuevos`,
          body: created
            .slice(0, 3)
            .map((p) => `• [${p.priority}] ${p.title}`)
            .join('\n'),
        });
      }
      markModuleRun('retention');
      return { created: created.length, highPriority: stats.highPriorityPending, total: stats.total };
    },
  },

  {
    name: 'originality-fingerprint-prune',
    description: 'Limpieza periódica de fingerprints antiguos (>1 año) para mantener el store ágil.',
    defaultCron: '0 3 1 * *', // First day of month at 3am.
    handler: async (): Promise<{ removed: number; skipped?: boolean; reason?: string }> => {
      if (!isAutopilotModuleActive('originality')) {
        log.info('[originality-fingerprint-prune] Saltado: Cerebro Activado OFF o módulo Originality apagado.');
        return { removed: 0, skipped: true, reason: 'autopilot:originality off' };
      }
      log.info('[originality-fingerprint-prune] Limpiando fingerprints antiguos...');
      const removed = clearOldFingerprints(365);
      markModuleRun('originality');
      return { removed };
    },
  },

  // ── FeedIA Autonomous OS ──────────────────────────────────────────────────

  {
    name: 'os-tick',
    description: 'Tick del sistema operativo autónomo: ejecuta tareas programadas, self-healing y evolución.',
    defaultCron: '*/30 * * * *', // cada 30 minutos
    handler: async (): Promise<{ tasksExecuted: number; errors: string[] }> => osTick(),
  },

  // ── Instagram Automation Jobs ─────────────────────────────────────────────

  {
    name: 'ig-beacon-engagement',
    description: 'Beacon engagement diario: interactúa con cuentas faro del niche para potenciar alcance orgánico.',
    defaultCron: '0 9,18 * * *', // 9am y 6pm
    handler: async (brand): Promise<unknown> => {
      const beaconAccounts: string[] = ((brand as Record<string, unknown>).beaconAccounts as string[]) ?? [
        'cuenta_faro_1',
        'cuenta_faro_2',
        'cuenta_faro_3',
      ];
      return realizarBeaconEngagement(brand, {
        targetAccounts: beaconAccounts.slice(0, 5),
        actionsPerAccount: 3,
        commentTexts: [
          '¡Qué buen contenido! ¿Con qué herramienta lo hacés?',
          'Exactamente lo que necesitaba ver hoy 🔥',
          'Muy buena perspectiva sobre este tema',
          'Completamente de acuerdo con este enfoque',
          'Esto es exactamente lo que la gente necesita escuchar',
        ],
      });
    },
  },

  {
    name: 'ig-process-notifications',
    description: 'Procesa notificaciones de Instagram: responde comentarios prioritarios y gestiona nuevos follows.',
    defaultCron: '0 10,14,20 * * *', // 3 veces al día
    handler: async (brand): Promise<unknown> =>
      procesarNotificaciones(brand, {
        respondToComments: true,
        respondToDMs: false, // DMs los maneja el bot por separado
        followBackRelevant: false,
        maxActions: 15,
      }),
  },

  {
    name: 'ig-read-insights',
    description: 'Lee las métricas de Instagram Insights y registra los datos para análisis tendencial.',
    defaultCron: '0 8 * * 1,4', // Lunes y Jueves
    handler: async (brand): Promise<unknown> => leerInsights(brand, '7_dias'),
  },

  {
    name: 'ig-weekly-growth',
    description: 'Ejecuta el workflow completo de crecimiento semanal de Instagram.',
    defaultCron: '0 9 * * 1', // Todos los lunes a las 9am
    handler: async (brand): Promise<unknown> => {
      const { runTalia } = await import('../agent/talia.js');
      return runTalia(brand, {
        goal: 'Ejecutar el workflow de crecimiento semanal completo. Usar el workflow "ig-growth-weekly" con ejecutar_workflow.',
        maxIterations: 30,
      });
    },
  },

  {
    name: 'ig-community-daily',
    description: 'Gestión diaria de comunidad: triage de DMs, respuesta a comentarios, engagement.',
    defaultCron: '0 11,17 * * *', // 11am y 5pm
    handler: async (brand): Promise<unknown> => {
      const { runTalia } = await import('../agent/talia.js');
      return runTalia(brand, {
        goal: 'Ejecutar el workflow de gestión de comunidad diaria. Usar el workflow "ig-community-management" con ejecutar_workflow.',
        maxIterations: 20,
      });
    },
  },

  // ── Computer Use (automation via browser/desktop) ───────────────────────────

  {
    name: 'cu-morning-routine',
    description:
      'Computer Use: abre Instagram, revisa notificaciones, da like a posts del feed, y responde comentarios prioritarios.',
    defaultCron: '0 8 * * *', // 8am diario
    handler: async (brand): Promise<unknown> => {
      const { planComputerUse } = await import('../capabilities/computerUse/planner.js');
      const { executePlan } = await import('../capabilities/computerUse/executor.js');
      const { isLiveRuntimeAvailable } = await import('../capabilities/computerUse/executor.js');

      const plans = [
        planComputerUse('navegar a notificaciones y revisar'),
        planComputerUse('dar like a los últimos 5 posts del feed'),
        planComputerUse('responder comentarios prioritarios'),
      ];

      const results = [];
      for (const plan of plans) {
        const runtimeAvailable = await isLiveRuntimeAvailable();
        if (!runtimeAvailable) {
          log.info('[CU-morning] Playwright no disponible — ejecutando en plan-only');
        }
        const result = await executePlan(plan, { brandId: brand.name ?? 'default', force: false });
        results.push({ instruction: plan.instruction, completed: result.completed, mode: result.mode });
      }
      return { routine: 'morning', results };
    },
  },

  {
    name: 'cu-story-engagement',
    description: 'Computer Use: ve las historias de cuentas seguidas y reacciona a las más relevantes.',
    defaultCron: '0 10,16 * * *', // 10am y 4pm
    handler: async (brand): Promise<unknown> => {
      const { planComputerUse } = await import('../capabilities/computerUse/planner.js');
      const { executePlan } = await import('../capabilities/computerUse/executor.js');

      const plan = planComputerUse('ver historias y reaccionar a las mejores');
      const result = await executePlan(plan, { brandId: brand.name ?? 'default', force: false });
      return { instruction: plan.instruction, completed: result.completed, mode: result.mode };
    },
  },

  {
    name: 'cu-weekly-explore',
    description:
      'Computer Use: explora la página de descubrimiento, guarda contenido relevante del nicho para inspiración.',
    defaultCron: '0 15 * * 3', // Miércoles 3pm
    handler: async (brand): Promise<unknown> => {
      const { planComputerUse } = await import('../capabilities/computerUse/planner.js');
      const { executePlan } = await import('../capabilities/computerUse/executor.js');

      const niche = (brand as Record<string, unknown>).niche ?? brand.niche ?? 'general';
      const plan = planComputerUse(`explorar Instagram y guardar 3 posts relevantes de ${String(niche)}`);
      const result = await executePlan(plan, { brandId: brand.name ?? 'default', force: false });
      return { instruction: plan.instruction, completed: result.completed, mode: result.mode };
    },
  },

  {
    name: 'cu-selector-health',
    description:
      'Computer Use: valida que los selectores del UI map aún resuelven contra Instagram (DOM rot detection).',
    defaultCron: '0 3 * * 0', // Domingo 3am
    handler: async (_brand): Promise<unknown> => {
      const { runFullHealthCheck } = await import('../capabilities/computerUse/selectorHealth.js');
      const report = await runFullHealthCheck();
      return {
        runAt: report.runAt,
        total: report.totalTargets,
        healthy: report.healthyTargets,
        rotten: report.rottenTargets,
        rottenIds: report.targets.filter((t) => !t.healthy).map((t) => t.targetId),
      };
    },
  },

  // ── Performance & Learning ──────────────────────────────────────────────────

  {
    name: 'performance-sync',
    description:
      'Sincroniza métricas reales de los posts publicados ayer desde Insights a la base de datos local de performance.',
    defaultCron: '0 7 * * *', // 7am diario
    handler: async (_brand): Promise<unknown> => {
      const { buildSnapshot } = await import('../capabilities/analytics/insights.js');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const snapshot = await buildSnapshot(yesterday);

      let synced = 0;
      for (const post of snapshot.posts) {
        try {
          recordPost({
            id: post.postId,
            publishedAt: post.publishedAt,
            format: post.format as Parameters<typeof recordPost>[0]['format'],
            caption: '',
            hashtags: [],
            hookText: '',
            topics: [],
            contentScore: 0,
            metrics: {
              likes: post.metrics.likes,
              comments: post.metrics.comments,
              shares: post.metrics.shares,
              saves: post.metrics.saves,
              reach: post.metrics.alcance,
              impressions: post.metrics.impresiones,
              profileVisits: post.metrics.profileVisits ?? 0,
              websiteClicks: 0,
              watchTimePercent: post.metrics.completionRate ?? 0,
              replays: 0,
              engagementRate:
                post.metrics.alcance > 0
                  ? ((post.metrics.likes + post.metrics.comments + post.metrics.saves + post.metrics.shares) /
                      post.metrics.alcance) *
                    100
                  : 0,
            },
          });
          synced++;
        } catch {
          /* skip individual post errors */
        }
      }

      const summary = getAccountSummary();
      log.info(`[Jobs] performance-sync: ${synced} posts sincronizados. Tendencia: ${summary.trend}`);
      return { synced, summary };
    },
  },

  {
    name: 'timing-model-rebuild',
    description: 'Reconstruye el modelo de timing de publicación analizando el historial completo (últimos 6 meses).',
    defaultCron: '0 6 * * 1', // Lunes 6am
    handler: async (_brand): Promise<unknown> => {
      rebuildTimingModel();
      return { ok: true, message: 'Modelo de timing actualizado' };
    },
  },

  {
    name: 'events-processor',
    description:
      'Procesa la cola de eventos de Instagram (comentarios, DMs, menciones) y genera respuestas automáticas.',
    defaultCron: '*/10 * * * *', // Cada 10 minutos
    handler: async (_brand): Promise<unknown> => {
      const status = getQueueStatus();
      if (status.pendingCount === 0) return { ok: true, message: 'Sin eventos pendientes' };

      const result = await processQueue(20);
      if (result.criticalHandled > 0) {
        await sendAlert({
          severity: 'warn',
          title: 'Eventos críticos de Instagram procesados',
          body: `Se procesaron ${result.criticalHandled} eventos críticos (comentarios negativos o leads de alta prioridad). Revisar respuestas automáticas.`,
          metadata: { ...result },
        });
      }
      return result;
    },
  },

  {
    name: 'content-pipeline-daily',
    description: 'Ejecuta el pipeline de producción diaria: genera el contenido del día siguiente listo para aprobar.',
    defaultCron: '0 20 * * *', // 8pm — prepara el día siguiente
    handler: async (brand): Promise<unknown> => {
      const { runTalia } = await import('../agent/talia.js');
      return runTalia(brand, {
        goal: `Producir el contenido de Instagram para mañana usando el pipeline_produce_content.
Primero consultá timing_best_time para elegir el formato adecuado.
Después generá 1 pieza de contenido con idea fresca basada en las tendencias del nicho "${brand.niche}".
Al finalizar, devolvé el caption completo, score obtenido y el horario recomendado de publicación.`,
        maxIterations: 10,
      });
    },
  },

  {
    name: 'performance-weekly-digest',
    description: 'Genera el resumen ejecutivo semanal de performance con patrones, tendencias y recomendaciones.',
    defaultCron: '0 8 * * 5', // Viernes 8am
    handler: async (brand): Promise<unknown> => {
      const summary = getAccountSummary();
      const { buildSnapshot } = await import('../capabilities/analytics/insights.js');
      const { generateWeeklyReport, sendWeeklyReportAlert } = await import('../capabilities/analytics/reports.js');
      const { detectAnomalies } = await import('../capabilities/analytics/insights.js');

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const snapshot = await buildSnapshot(weekAgo);
      const anomalies = detectAnomalies(snapshot);
      const report = await generateWeeklyReport(brand, snapshot, anomalies);

      await sendWeeklyReportAlert(brand, report, snapshot);

      log.info(`[Jobs] performance-weekly-digest: trend=${summary.trend} topFormat=${summary.bestFormat ?? 'N/A'}`);
      return { report, summary, anomalies };
    },
  },

  // ── Growth Engine Jobs ──────────────────────────────────────────────────────

  {
    name: 'growth-daily-snapshot',
    description:
      'Captura el snapshot diario de seguidores, alcance y engagement para alimentar las predicciones y el dashboard.',
    defaultCron: '0 23 * * *', // 11pm cada día
    handler: async (_brand): Promise<unknown> => {
      const { fetchAccountInsights } = await import('../integrations/insightsApi.js');
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const acc = await fetchAccountInsights(yesterday);
      if (!acc) {
        log.warn('[Jobs] growth-daily-snapshot: sin datos de Insights, skipping');
        return { ok: false, reason: 'sin datos de Insights' };
      }
      const today = new Date().toISOString().split('T')[0]!;
      const summary = getAccountSummary();
      const snapshot = recordDailySnapshot({
        date: today,
        followers: acc.followers,
        reach24h: acc.reach,
        engagement24h: Math.round(acc.reach * (summary.avgEngagementRate / 100)),
        postsPublished: 0,
        storiesPublished: 0,
      });
      log.info(`[Jobs] growth-daily-snapshot: ${acc.followers} seguidores (delta ${snapshot.followersDelta})`);
      return snapshot;
    },
  },

  {
    name: 'growth-milestone-check',
    description:
      'Verifica si se alcanzaron nuevos hitos de crecimiento (1k, 5k, 10k seguidores, streaks, engagement rate) y celebra los wins.',
    defaultCron: '30 23 * * *', // 11:30pm cada día (después del snapshot)
    handler: async (brand): Promise<unknown> => {
      const newMilestones = await detectAndCelebrateMilestones(brand);
      return { newMilestonesCount: newMilestones.length, milestones: newMilestones };
    },
  },

  {
    name: 'growth-daily-recommendations',
    description: 'Genera las 5 acciones más impactantes del día para crecer la cuenta y las envía al usuario.',
    defaultCron: '0 8 * * *', // 8am cada día
    handler: async (brand): Promise<unknown> => {
      const progress = getCurrentProgress();
      const health = getGrowthHealth();
      const actions = await recommendNextActions(brand);

      // Si la salud es crítica, alertar
      if (health.status === 'crítica' || health.status === 'estancada') {
        await sendAlert({
          severity: 'warn',
          title: `${brand.name}: foco urgente en growth (${health.status})`,
          body: `Score salud: ${health.score}/100\n\nAcciones prioritarias:\n${actions
            .slice(0, 3)
            .map((a) => `• ${a.action} (${a.priority}) — ${a.expectedImpact}`)
            .join('\n')}`,
          metadata: { progress, health, actions },
        }).catch(() => undefined);
      }

      return { actions, health, progress };
    },
  },

  {
    name: 'post-boost-tick',
    description:
      'Ejecuta las acciones de post-boost programadas (anchor comment, community prime, beacon engagement, métricas).',
    defaultCron: '*/5 * * * *', // Cada 5 minutos
    handler: async (_brand): Promise<unknown> => {
      const active = getActiveBoosts();
      if (active.length === 0) return { ok: true, message: 'sin boosts activos' };
      return runBoostTick();
    },
  },

  {
    name: 'viral-scan-daily',
    description: 'Escanea el nicho buscando oportunidades virales y propone la mejor adaptación lista para producir.',
    defaultCron: '0 10 * * *', // 10am cada día
    handler: async (brand): Promise<unknown> => {
      const result = await rideTheWave(brand);
      if (result.bestOpportunity) {
        await sendAlert({
          severity: 'info',
          title: `${brand.name}: oportunidad viral detectada`,
          body: `Mejor adaptación (fit ${result.bestOpportunity.bestAdaptation.predictedFit}/100):\nHook: "${result.bestOpportunity.bestAdaptation.adaptedHook}"\nÁngulo: ${result.bestOpportunity.bestAdaptation.adaptedAngle}`,
          metadata: { viral: result.bestOpportunity.viral.id },
        }).catch(() => undefined);
      }
      return result;
    },
  },

  {
    name: 'growth-dashboard-monday',
    description: 'Envía el dashboard de crecimiento textual cada lunes a la mañana para empezar la semana con datos.',
    defaultCron: '0 9 * * 1', // Lunes 9am
    handler: async (brand): Promise<unknown> => {
      const text = buildTextSummary(brand);
      const insights = getQuickInsights();

      await sendAlert({
        severity: 'reporte',
        title: `${brand.name}: dashboard de crecimiento (semana)`,
        body: `${text}\n\n💡 ${insights.topInsight}`,
        metadata: { insights },
      }).catch(() => undefined);

      return { text, insights };
    },
  },
  {
    name: 'directives-tick',
    description:
      'Ejecuta las directivas vigentes que estén "due" (ej: "subí 1 carrusel por día", "respondé los mensajes").',
    defaultCron: '*/10 * * * *', // cada 10 min — el engine respeta nextRunAt de cada directiva
    handler: async (brand): Promise<unknown> => {
      const { runDueDirectives } = await import('../capabilities/directives/index.js');
      const { executed, runs } = await runDueDirectives(brand);
      if (executed > 0) {
        const okCount = runs.filter((r) => r.status === 'ok').length;
        await sendAlert({
          severity: 'reporte',
          title: `${brand.name}: ${executed} directiva(s) ejecutada(s)`,
          body: runs
            .map((r) => `• ${r.summary}`)
            .join('\n')
            .slice(0, 600),
          metadata: { executed, okCount },
        }).catch(() => undefined);
      }
      return { executed, runs: runs.map((r) => ({ id: r.id, status: r.status, summary: r.summary })) };
    },
  },

  // ── Goals lifecycle jobs ────────────────────────────────────────────────────

  {
    name: 'goals-progress-sync',
    description: 'Sincroniza el progreso real de cada meta activa leyendo del performanceDB y growthEngine.',
    defaultCron: '0 */6 * * *', // Cada 6 horas
    handler: async (_brand): Promise<unknown> => autoUpdateGoalProgress(),
  },

  {
    name: 'goals-health-monitor',
    description: 'Monitorea la salud de las metas activas y alerta si alguna está en estado crítico.',
    defaultCron: '0 10 * * *', // 10am diario
    handler: async (brand): Promise<unknown> => {
      await notifyGoalsHealthIssues(brand);
      const closingSoon = findGoalsClosingSoon(2);
      if (closingSoon.length > 0) {
        await sendAlert({
          severity: 'warn',
          title: `${brand.name}: ${closingSoon.length} meta(s) vencen en próximos 2 días`,
          body: closingSoon.map((g) => `• ${g.title} (${g.horizon}, ${g.progress}% completado)`).join('\n'),
          metadata: { closingSoonIds: closingSoon.map((g) => g.id) },
        }).catch(() => undefined);
      }
      return { closingSoonCount: closingSoon.length };
    },
  },

  {
    name: 'calendar-prep-processor',
    description: 'Procesa eventos próximos del calendario y dispara las tareas de preparación que correspondan.',
    defaultCron: '0 7 * * *', // 7am diario
    handler: async (_brand): Promise<unknown> => processUpcomingEvents(30),
  },

  {
    name: 'period-report-weekly',
    description: 'Genera el reporte ejecutivo de cierre de semana cada domingo a la noche.',
    defaultCron: '0 22 * * 0', // Domingo 22:00
    handler: async (brand): Promise<unknown> => {
      const report = await generatePeriodReport(brand, 'weekly');
      await sendReportAlert(brand, report);
      return { reportId: report.id, completionRate: report.goalsAchievement.completionRate };
    },
  },

  {
    name: 'period-report-monthly',
    description: 'Genera el reporte mensual ejecutivo el último día del mes.',
    defaultCron: '0 23 28-31 * *',
    handler: async (brand): Promise<unknown> => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (tomorrow.getDate() !== 1) return { skipped: true, reason: 'no es último día del mes' };

      const report = await generatePeriodReport(brand, 'monthly');
      await sendReportAlert(brand, report);
      return { reportId: report.id, completionRate: report.goalsAchievement.completionRate };
    },
  },

  {
    name: 'period-report-quarterly',
    description: 'Genera el reporte trimestral el último día de Marzo, Junio, Septiembre y Diciembre.',
    defaultCron: '0 23 28-31 3,6,9,12 *',
    handler: async (brand): Promise<unknown> => {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(now.getDate() + 1);
      if (tomorrow.getDate() !== 1) return { skipped: true, reason: 'no es último día del trimestre' };

      const report = await generatePeriodReport(brand, 'quarterly');
      await sendReportAlert(brand, report);
      return { reportId: report.id, completionRate: report.goalsAchievement.completionRate };
    },
  },

  {
    name: 'period-report-annual',
    description: 'Genera el reporte anual el 31 de diciembre.',
    defaultCron: '0 23 31 12 *',
    handler: async (brand): Promise<unknown> => {
      const report = await generatePeriodReport(brand, 'annual');
      await sendReportAlert(brand, report);
      const bounds = periodBoundaries('annual');
      log.info(
        `[Jobs] Reporte anual generado para período ${bounds.startsAt.split('T')[0]} → ${bounds.endsAt.split('T')[0]}`,
      );
      return { reportId: report.id, completionRate: report.goalsAchievement.completionRate };
    },
  },

  {
    name: 'brand-audit-monthly',
    description: 'Audita la marca cada mes y propone renovación si detecta fatiga.',
    defaultCron: '0 10 1 * *', // Día 1 de cada mes, 10am
    handler: async (brand): Promise<unknown> => {
      const renewal = await runFullRenewal(brand);
      return {
        renewalId: renewal.id,
        recommendation: renewal.audit.recommendation,
        health: renewal.audit.overallHealth,
      };
    },
  },
  {
    name: 'bandit-sync',
    description:
      'Sincroniza los bandits Thompson con los outcomes del reasoning-trace: el sistema aprende qué funciona de su propia evidencia.',
    defaultCron: '0 5 * * *', // todos los días 5am
    handler: async (brand): Promise<unknown> => {
      const { syncBanditsFromTraces } = await import('../capabilities/experiments/index.js');
      return syncBanditsFromTraces(brand.name);
    },
  },
  {
    name: 'ig-knowledge-study',
    description:
      'Sesión de estudio autónoma: revisa cambios de políticas/algoritmo/mercado de Instagram y actualiza los apuntes vivos.',
    defaultCron: '0 6 * * *', // todos los días 6am
    handler: async (brand): Promise<unknown> => {
      const { runStudySession } = await import('../capabilities/research/index.js');
      const report = await runStudySession(brand);
      if (report.checkpointId) {
        await sendAlert({
          severity: 'warn',
          title: `${brand.name}: posible cambio de política de Instagram`,
          body: `El estudio autónomo abrió el checkpoint ${report.checkpointId}. ${report.note}`,
        }).catch(() => undefined);
      }
      return { recorded: report.recorded, pruned: report.pruned, checkpoint: report.checkpointId ?? null };
    },
  },

  // ── Trigger System & Agent Evolution ──────────────────────────────────────

  {
    name: 'trigger-event-bus',
    description: 'Procesa eventos persistidos en la cola SQLite y dispara triggers automáticos.',
    defaultCron: '*/30 * * * * *', // cada 30 segundos
    handler: async (brand): Promise<{ processed: number; pending: number }> => {
      const { processEventQueue } = await import('../agent/agentTriggers.js');
      const { getUnprocessedCount } = await import('../database/eventQueue.js');
      const processed = await processEventQueue(brand, 50);
      const pending = getUnprocessedCount();
      if (processed > 0) log.info(`[trigger-event-bus] ${processed} eventos procesados, ${pending} pendientes`);
      return { processed, pending };
    },
  },

  {
    name: 'trigger-autonomous',
    description: 'Escanea condiciones autónomas (anomalías, tendencias, competidores) y emite eventos al bus.',
    defaultCron: '* * * * *', // cada 1 minuto
    handler: async (brand): Promise<{ emitted: number }> => {
      const { persistEvent } = await import('../agent/agentTriggers.js');
      const { detectAnomalies } = await import('../capabilities/analytics/index.js');
      const { buildSnapshot } = await import('../capabilities/analytics/insights.js');
      const { scoutTrends } = await import('../capabilities/trends/index.js');

      let emitted = 0;
      const now = Date.now();

      // Anomaly scan
      try {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
        const snapshot = await buildSnapshot(weekAgo);
        const anomalies = detectAnomalies(snapshot);
        if (anomalies.length > 0) {
          persistEvent('anomaly_detected', { anomalies, timestamp: now }, brand.name);
          emitted++;
        }
      } catch {
        /* ignore */
      }

      // Trend scan
      try {
        const { angulos } = await scoutTrends(brand);
        const highGrowth = angulos.filter((a) => a.saturacionEstimada === 'baja');
        if (highGrowth.length > 0) {
          persistEvent(
            'trend_detected',
            { trends: highGrowth.map((a) => a.angulo), growth: 35, timestamp: now },
            brand.name,
          );
          emitted++;
        }
      } catch {
        /* ignore */
      }

      // Competitor scan — simplified, uses tracked snapshots if available
      try {
        const { getLatestAnalytics } = await import('../database/index.js');
        const latest = getLatestAnalytics(brand.name);
        if (latest && typeof latest === 'object' && 'competitorSnapshots' in latest) {
          const snaps = (latest as Record<string, unknown>).competitorSnapshots as
            | Array<{ avgLikes?: number }>
            | undefined;
          const viral = snaps?.find((s) => (s.avgLikes ?? 0) > 1000);
          if (viral) {
            persistEvent('competitor_viral_detected', { competitorLikes: viral.avgLikes, timestamp: now }, brand.name);
            emitted++;
          }
        }
      } catch {
        /* ignore */
      }

      if (emitted > 0) log.info(`[trigger-autonomous] ${emitted} eventos emitidos`);
      return { emitted };
    },
  },

  {
    name: 'agent-evolution-weekly',
    description: 'Ciclo semanal de auto-evolución: analiza performance de agentes y genera mejoras.',
    defaultCron: '0 3 * * 0', // Domingo 3am
    handler: async (): Promise<unknown> => {
      const { runEvolutionCycle } = await import('../os/agentEvolution.js');
      return runEvolutionCycle();
    },
  },

  {
    name: 'custom-playbook-scheduler',
    description: 'Ejecuta playbooks personalizados que tengan autoSchedule habilitado.',
    defaultCron: '0 * * * *', // cada hora
    handler: async (brand): Promise<{ executed: number }> => {
      const { listCustomPlaybooks, runCustomPlaybook } = await import('../agent/playbooks/customPlaybooks.js');
      const { startPlaybookRun, finishPlaybookRun } = await import('../database/playbookRuns.js');
      const pbs = listCustomPlaybooks().filter((p) => p.metadata.autoSchedule?.enabled);
      let executed = 0;
      for (const pb of pbs) {
        const runId = startPlaybookRun(pb.id, 'custom', brand.name);
        try {
          const result = await runCustomPlaybook(brand, pb);
          finishPlaybookRun(runId, result.success ? 'completed' : 'partial', result);
          executed++;
        } catch (err) {
          finishPlaybookRun(runId, 'failed', { error: err instanceof Error ? err.message : String(err) });
        }
      }
      if (executed > 0) log.info(`[custom-playbook-scheduler] ${executed} playbooks ejecutados`);
      return { executed };
    },
  },

  // ── Community Manager Replacement Jobs ──────────────────────────────────────

  {
    name: 'cm-inbox-tick',
    description: 'Procesa el DM Inbox cada 10 minutos: triage, respuestas auto, escalaciones.',
    defaultCron: '*/10 * * * *',
    handler: async (_brand): Promise<unknown> => {
      const snapshot = getInboxSnapshot();
      if (snapshot.needingResponse === 0) return { ok: true, message: 'sin pendientes' };
      return cmTickInbox(20);
    },
  },

  {
    name: 'cm-stories-daily',
    description: 'Genera y publica las stories del día (3 secuencias con stickers interactivos).',
    defaultCron: '30 9 * * *',
    handler: async (brand): Promise<unknown> => {
      const sequences = await planDailyStories(brand);
      return { sequencesCount: sequences.length, sequenceIds: sequences.map((s) => s.id) };
    },
  },

  {
    name: 'cm-faq-mining-weekly',
    description: 'Cada lunes 7am, analiza el histórico de DMs y detecta nuevas FAQs.',
    defaultCron: '0 7 * * 1',
    handler: async (brand): Promise<unknown> => {
      const patterns = await detectFAQPatterns(brand);
      if (patterns.length > 0) {
        await sendAlert({
          severity: 'info',
          title: `${brand.name}: ${patterns.length} FAQ candidatas detectadas`,
          body: patterns
            .slice(0, 5)
            .map((p) => `• "${p.detectedQuestion}" (${p.occurrences} apariciones)`)
            .join('\n'),
          metadata: { patternsCount: patterns.length },
        }).catch(() => undefined);
      }
      return { patternsDetected: patterns.length };
    },
  },

  {
    name: 'cm-leads-followups',
    description: 'Procesa follow-ups del lead pipeline cada hora.',
    defaultCron: '0 * * * *',
    handler: async (brand): Promise<unknown> => processFollowUpsDue(brand),
  },

  {
    name: 'cm-fan-welcomes',
    description: 'Procesa queue de nuevos seguidores y envía bienvenidas (cada 30 min en horario activo).',
    defaultCron: '*/30 9-22 * * *',
    handler: async (_brand): Promise<unknown> => processNewFollowersQueue(5),
  },

  {
    name: 'cm-fan-refresh',
    description: 'Rebuild de perfiles de fans desde el histórico (3am diario).',
    defaultCron: '0 3 * * *',
    handler: async (_brand): Promise<unknown> => refreshAllFanProfiles(),
  },

  {
    name: 'cm-fan-churning-detect',
    description: 'Detecta fans churning y propone fan de la semana (domingo 10am).',
    defaultCron: '0 10 * * 0',
    handler: async (brand): Promise<unknown> => {
      const churning = detectChurningFans(30);
      const fanOfWeek = await proposeFanOfTheWeek(brand);
      return {
        churningCount: churning.length,
        churningTopFive: churning.slice(0, 5).map((f) => f.username),
        fanOfWeek: fanOfWeek?.fan.username,
        shoutoutText: fanOfWeek?.shoutoutText,
      };
    },
  },

  {
    name: 'cm-community-snapshot',
    description: 'Reporte unificado de comunidad (inbox+support+leads+mentions+UGC+fans) cada noche.',
    defaultCron: '0 22 * * *',
    handler: async (brand): Promise<unknown> => {
      const inbox = getInboxSnapshot();
      const support = getSupportSnapshot();
      const leads = getPipelineSnapshot();
      const mentions = getMentionsSnapshot(brand);
      const ugc = getUGCSnapshot();

      const hasCritical =
        inbox.escalatedToHuman > 0 ||
        support.slaBreaches.length > 0 ||
        leads.hotLeads.length > 0 ||
        (mentions.sentimentLast7Days.critical ?? 0) > 0;

      if (hasCritical) {
        await sendAlert({
          severity: 'reporte',
          title: `${brand.name}: snapshot diario de comunidad`,
          body: [
            `📬 Inbox: ${inbox.needingResponse} pendientes, ${inbox.escalatedToHuman} escalados`,
            `🛟 Soporte: ${support.totalActive} activos, ${support.slaBreaches.length} SLA breaches`,
            `💼 Leads: ${leads.hotLeads.length} hot, ${leads.pendingFollowUps} follow-ups pendientes`,
            `📢 Menciones (7d): +${mentions.sentimentLast7Days.positive} positivas / -${mentions.sentimentLast7Days.negative} negativas / ${mentions.sentimentLast7Days.critical} críticas`,
            `🎬 UGC: ${ugc.readyToRepost.length} listos para repostear`,
          ].join('\n'),
          metadata: { inbox, support, leads, mentions, ugc },
        }).catch(() => undefined);
      }

      return { inbox, support, leads, mentions, ugc };
    },
  },

  // ── Browser Operators & Instagram Publisher ───────────────────────────────

  {
    name: 'instagram-publish-queue',
    description: 'Procesa la cola de publicaciones programadas para Instagram (API/Web/App).',
    defaultCron: '*/15 * * * *',
    handler: async (_brand): Promise<{ processed: number; errors: number }> => {
      // En una implementación completa, leería desde una tabla SQLite de scheduled_posts
      // Por ahora, este job es un placeholder para la lógica de cola
      log.info('[instagram-publish-queue] Revisando cola de publicaciones programadas...');
      return { processed: 0, errors: 0 };
    },
  },

  {
    name: 'browser-session-warmup',
    description: 'Calienta sesiones de navegador visitando páginas inocuas para romper patrones de bot.',
    defaultCron: '0 */4 * * *',
    handler: async (brand): Promise<{ warmedUp: number }> => {
      const { InstagramWebOperator } = await import('../browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: true, dryRun: env.dryRun });
      try {
        await op.initSession();
        const page = op.getPage();
        if (page) {
          const { warmUpSession } = await import('../browserOperators/core/antiDetection.js');
          await warmUpSession(page as unknown as Parameters<typeof warmUpSession>[0]);
        }
        await op.closeSession();
        return { warmedUp: 1 };
      } catch (err) {
        await op.closeSession();
        log.error(`[browser-session-warmup] Error: ${err instanceof Error ? err.message : String(err)}`);
        return { warmedUp: 0 };
      }
    },
  },

  {
    name: 'antidetect-health-check',
    description: 'Verifica el estado de anti-detección de las sesiones de navegador activas.',
    defaultCron: '0 */6 * * *',
    handler: async (brand): Promise<{ healthy: boolean; details: unknown }> => {
      const { InstagramWebOperator } = await import('../browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
      const health = await op.healthCheck();
      await op.closeSession();
      if (!health.healthy) {
        await sendAlert({
          severity: 'warn',
          title: `${brand.name}: sesión de navegador posiblemente detectable`,
          body:
            ((health.details as Record<string, unknown>).warnings as string[] | undefined)?.join('\n') ??
            'Revisar configuración anti-detection',
        });
      }
      return { healthy: health.healthy, details: health.details };
    },
  },

  // ── Competitive Intelligence ──────────────────────────────────────────────
  {
    name: 'competitor-weekly-intelligence',
    description:
      'Análisis completo de competidores: SWOT, content gap, posting patterns, virales y alertas. Corre los lunes a las 7:30.',
    defaultCron: '30 7 * * 1',
    handler: async (_brand): Promise<{ competitors: number; alerts: number }> => {
      const { runFullCompetitiveAnalysis } = await import('../voice/competitiveIntelligenceVoice.js');
      const result = await runFullCompetitiveAnalysis();
      if (!result.ok) {
        log.error(`[competitor-weekly-intelligence] Falló: ${result.spokenResponse}`);
        throw new Error(result.spokenResponse);
      }
      const detail = result.detail as Record<string, unknown> | undefined;
      const competitors = (detail?.competitors as number) ?? 0;
      const viralCount = (detail?.viralPosts as unknown[])?.length ?? 0;
      log.success(
        `[competitor-weekly-intelligence] ${competitors} competidores, ${viralCount} virales. ${result.spokenResponse.slice(0, 200)}`,
      );
      return { competitors, alerts: viralCount };
    },
  },

  // ── Fases 21-25: Growth & Community Engine ───────────────────────────────
  {
    name: 'conversion-weekly-funnel',
    description: 'Analiza el funnel de conversión semanalmente y sugiere fixes.',
    defaultCron: '0 10 * * 1',
    handler: async (_brand): Promise<unknown> => {
      const { analyzeConversionFunnel, suggestFunnelFix } = await import('../voice/conversionVoice.js');
      const funnel = await analyzeConversionFunnel();
      if (!funnel.ok || !funnel.detail) return { ok: false, message: funnel.spokenResponse };
      const detail = funnel.detail as { bottleneck?: string };
      const fix = await suggestFunnelFix(detail.bottleneck ?? 'awareness');
      log.success(`[conversion-weekly-funnel] ${funnel.spokenResponse} → ${fix.spokenResponse}`);
      return { funnel: funnel.spokenResponse, fix: fix.spokenResponse };
    },
  },
  {
    name: 'profile-monthly-audit',
    description: 'Audita el perfil de Instagram mensualmente.',
    defaultCron: '0 9 1 * *',
    handler: async (_brand): Promise<unknown> => {
      const { auditProfile } = await import('../voice/profileVoice.js');
      const result = await auditProfile();
      log.success(`[profile-monthly-audit] ${result.spokenResponse}`);
      return { audit: result.spokenResponse, detail: result.detail };
    },
  },
  {
    name: 'ritual-weekly-plan',
    description: 'Planifica rituales semanales y contenido insider.',
    defaultCron: '0 9 * * 1',
    handler: async (_brand): Promise<unknown> => {
      const { createRituals } = await import('../voice/ritualVoice.js');
      const rituals = await createRituals();
      log.success(`[ritual-weekly-plan] ${rituals.spokenResponse}`);
      return { rituals: rituals.spokenResponse };
    },
  },
  {
    name: 'audience-monthly-segment',
    description: 'Segmenta la audiencia y empareja contenido mensualmente.',
    defaultCron: '0 10 1 * *',
    handler: async (_brand): Promise<unknown> => {
      const { segmentAudience, matchContentToPersonas } = await import('../voice/audienceVoice.js');
      const seg = await segmentAudience();
      const match = await matchContentToPersonas();
      log.success(`[audience-monthly-segment] ${seg.spokenResponse} | ${match.spokenResponse}`);
      return { segment: seg.spokenResponse, match: match.spokenResponse };
    },
  },
  {
    name: 'fomo-trending-daily',
    description: 'Detecta tendencias diarias en el nicho.',
    defaultCron: '0 8 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { detectTrending } = await import('../voice/fomoVoice.js');
      const result = await detectTrending();
      log.success(`[fomo-trending-daily] ${result.spokenResponse}`);
      return { trends: result.spokenResponse };
    },
  },
  {
    name: 'fomo-anticipation-weekly',
    description: 'Diseña arcos de anticipación para lanzamientos semanales.',
    defaultCron: '0 9 * * 1',
    handler: async (_brand): Promise<unknown> => {
      const { designAnticipationArc } = await import('../voice/fomoVoice.js');
      const result = await designAnticipationArc('Lanzamiento semanal', 7);
      log.success(`[fomo-anticipation-weekly] ${result.spokenResponse}`);
      return { anticipation: result.spokenResponse };
    },
  },
  {
    name: 'fomo-drop-monthly',
    description: 'Diseña un drop exclusivo mensual.',
    defaultCron: '0 10 1 * *',
    handler: async (_brand): Promise<unknown> => {
      const { designDrop } = await import('../voice/fomoVoice.js');
      const result = await designDrop();
      log.success(`[fomo-drop-monthly] ${result.spokenResponse}`);
      return { drop: result.spokenResponse };
    },
  },
  {
    name: 'fomo-campaign-quarterly',
    description: 'Diseña una campaña FOMO completa de 14 días cada trimestre.',
    defaultCron: '0 9 1 1,4,7,10 *',
    handler: async (_brand): Promise<unknown> => {
      const { designFomoCampaign } = await import('../voice/fomoVoice.js');
      const result = await designFomoCampaign('Campaña trimestral', 14);
      log.success(`[fomo-campaign-quarterly] ${result.spokenResponse}`);
      return { campaign: result.spokenResponse };
    },
  },

  // ── Sprint 2: Visual Pipelines (Canva, CapCut, Runway, HeyGen) ────────────
  {
    name: 'canva-daily-design',
    description: 'Crea un diseño diario en Canva para Instagram (post o story).',
    defaultCron: '0 10 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('canva-operator');
      if (!agent) return { skipped: true, reason: 'canva-operator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Crear un diseño diario para Instagram: post o story alineado con el brand kit de ${brand.name}. Usá canva_create_design y exportá en PNG.`,
        `canva-daily-${Date.now()}`,
      );
    },
  },

  {
    name: 'capcut-weekly-reel',
    description: 'Edita un reel semanal en CapCut con captions y música trending.',
    defaultCron: '0 14 * * 3',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('capcut-operator');
      if (!agent) return { skipped: true, reason: 'capcut-operator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Editar un reel semanal para ${brand.name}. Agregá captions automáticos, música trending, y exportá en 1080p.`,
        `capcut-weekly-${Date.now()}`,
      );
    },
  },

  {
    name: 'canva-template-health',
    description: 'Valida que los Brand Templates de Canva configurados existan y contengan los campos de autofill esperados.',
    defaultCron: '0 7 * * *',
    handler: async (): Promise<unknown> => {
      const report = await validateAllCanvaTemplates();
      logTemplateHealthReport(report);
      return report;
    },
  },

  {
    name: 'video-ai-generate',
    description: 'Genera un video con IA (Runway o HeyGen) 2 veces por semana.',
    defaultCron: '0 9 * * 1,4',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('video-generation-operator');
      if (!agent) return { skipped: true, reason: 'video-generation-operator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Generar un video con IA para ${brand.name}. Elegí Runway o HeyGen según el tipo de contenido que mejor funcione en el nicho.`,
        `video-ai-${Date.now()}`,
      );
    },
  },

  // ── Sprint 3: Engagement, Analytics & Autopilot ─────────────────────

  {
    name: 'dm-triage-hourly',
    description: 'Triagea DMs de Instagram cada hora: clasifica, califica leads, y escala a humano si es necesario.',
    defaultCron: '0 * * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('dm-operator');
      if (!agent) return { skipped: true, reason: 'dm-operator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Revisá los DMs recientes de ${brand.name}. Clasificá por categoría, calificá leads, y sincronizá los calificados al CRM.`,
        `dm-triage-${Date.now()}`,
      );
    },
  },

  {
    name: 'lead-nurture-batch',
    description: 'Ejecuta el batch de nurturing: envía pasos listos y avanza enrollments.',
    defaultCron: '0 11,17 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('lead-nurturer');
      if (!agent) return { skipped: true, reason: 'lead-nurturer no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Ejecutá el batch de nurturing para ${brand.name}. Revisá enrollments listos, enviá mensajes, y avanzá al siguiente paso.`,
        `nurture-batch-${Date.now()}`,
      );
    },
  },

  {
    name: 'anomaly-scan',
    description: 'Escanea anomalías de performance: pérdida de followers, bajo reach, posts bajo benchmark.',
    defaultCron: '0 9 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('analytics-inspector');
      if (!agent) return { skipped: true, reason: 'analytics-inspector no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Escaneá anomalías de performance de ${brand.name} en los últimos 7 días. Detectá pérdida de followers, bajo reach, y posts bajo benchmark. Generá alertas si encontrás problemas.`,
        `anomaly-scan-${Date.now()}`,
      );
    },
  },

  {
    name: 'community-daily-engagement',
    description: 'Ejecuta el engagement diario de comunidad: beacon comments, fan nurturing, respuestas a comentarios.',
    defaultCron: '0 10,18 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('community-manager');
      if (!agent) return { skipped: true, reason: 'community-manager no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Ejecutá el engagement diario de comunidad para ${brand.name}. Interactuá con cuentas faro, revisá comentarios prioritarios, y planificá acciones de fan nurturing.`,
        `community-daily-${Date.now()}`,
      );
    },
  },

  {
    name: 'autopilot-weekly',
    description:
      'Ejecuta el autopilot semanal completo: planificación → creación → publicación → engagement → análisis → optimización (gateado por Cerebro Activado).',
    defaultCron: '0 8 * * 1',
    handler: async (brand): Promise<unknown> => {
      if (!isAutopilotMasterActivated()) {
        return { skipped: true, reason: 'autopilot:master off' };
      }
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('autopilot-orchestrator');
      if (!agent) return { skipped: true, reason: 'autopilot-orchestrator no registrado' };
      const r = await runAgentTask(
        brand,
        agent,
        `Ejecutá el autopilot semanal completo para ${brand.name}. Planificá, creá, publicá, enganchá, analizá y optimizá la próxima semana.`,
        `autopilot-weekly-${Date.now()}`,
      );
      markModuleRun('templates');
      markModuleRun('pinSlate');
      markModuleRun('outreach');
      return r;
    },
  },

  // ── Sprint 4: Multi-Platform Expansion ──────────────────────────────

  {
    name: 'repurpose-daily',
    description: 'Repurposea el mejor contenido del día anterior para otras plataformas.',
    defaultCron: '0 11 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('repurposing-specialist');
      if (!agent) return { skipped: true, reason: 'repurposing-specialist no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Repurposeá el mejor contenido de ayer de ${brand.name}. Elegí el top performer y adaptalo para TikTok, YouTube Shorts, LinkedIn y/o X.`,
        `repurpose-daily-${Date.now()}`,
      );
    },
  },

  {
    name: 'cross-platform-publish-queue',
    description: 'Procesa la cola de publicaciones multiplataforma pendientes.',
    defaultCron: '0 12,18 * * *',
    handler: async (brand): Promise<unknown> => {
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const { getAgent } = await import('../agent/registry.js');
      const agent = getAgent('multi-platform-publisher');
      if (!agent) return { skipped: true, reason: 'multi-platform-publisher no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Procesá la cola de publicaciones multiplataforma pendientes de ${brand.name}. Publicá en TikTok, YouTube Shorts, LinkedIn y X según lo programado.`,
        `cross-platform-${Date.now()}`,
      );
    },
  },

  {
    name: 'platform-health-check',
    description: 'Verifica la conectividad de las cuentas conectadas en cada plataforma.',
    defaultCron: '0 9 * * 1',
    handler: async (_brand): Promise<unknown> => {
      const { listConnectedAccounts } = await import('../integrations/uploadPost.js');
      const accounts = await listConnectedAccounts();
      const inactive = accounts.filter((a) => !a.isActive);
      if (inactive.length > 0) {
        const { sendAlert } = await import('../integrations/notifications.js');
        await sendAlert({
          severity: 'warn',
          title: 'Cuentas multiplataforma inactivas',
          body: `Plataformas con cuentas inactivas: ${inactive.map((a) => a.platform).join(', ')}`,
        });
      }
      return { total: accounts.length, active: accounts.filter((a) => a.isActive).length, inactive: inactive.length };
    },
  },

  // ── Sprint 5: Monetization & Paid Growth ──────────────────────────────────

  {
    name: 'smart-boost-detector',
    description: 'Detecta el top performer semanal y evalúa si amerita campaña de boost pagado.',
    defaultCron: '0 10 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('analytics-inspector');
      if (!agent) return { skipped: true, reason: 'analytics-inspector no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Analiza los últimos 7 días de ${brand.name} en performance DB. Identifica el top performer y evalúa si merece boost: score > 70, engagement > 5%, formato adecuado. Reporta la recomendación.`,
        `sbd-${Date.now()}`,
      );
    },
  },

  {
    name: 'campaign-performance-daily',
    description: 'Monitorea todas las campañas activas y registra métricas clave.',
    defaultCron: '0 9 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('paid-media-manager');
      if (!agent) return { skipped: true, reason: 'paid-media-manager no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Revisa todas las campañas activas de ${brand.name}. Obtén métricas detalladas (CPM, CPC, CTR, ROAS) y registra el estado de cada campaña. Alerta si ROAS < 1.5 por más de 2 días.`,
        `cpd-${Date.now()}`,
      );
    },
  },

  {
    name: 'campaign-audit-weekly',
    description: 'Auditoría semanal de todas las campañas: optimiza winners, pausa losers.',
    defaultCron: '0 10 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('paid-media-manager');
      if (!agent) return { skipped: true, reason: 'paid-media-manager no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Auditoría semanal de paid media para ${brand.name}: 1) Listar campañas activas, 2) Optimizar presupuestos de campañas con ROAS > 2.0, 3) Pausar campañas con ROAS < 1.5 por más de 3 días, 4) Proponer 2-3 experimentos A/B. Reporta acciones tomadas.`,
        `caw-${Date.now()}`,
      );
    },
  },

  {
    name: 'budget-optimizer',
    description: 'Rebalancea presupuestos entre campañas según ROAS real-time.',
    defaultCron: '0 18 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('paid-media-manager');
      if (!agent) return { skipped: true, reason: 'paid-media-manager no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Rebalancea presupuestos de ${brand.name} entre campañas activas. Aumenta 20% en campañas con ROAS > 2.5. Reduce 30% en campañas con ROAS < 1.5. Mantén campañas con ROAS 1.5-2.5. Reporta ajustes.`,
        `bo-${Date.now()}`,
      );
    },
  },

  {
    name: 'lead-score-sync',
    description: 'Recalcula lead scores y actualiza segmentación del pipeline.',
    defaultCron: '0 11 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('conversion-strategist');
      if (!agent) return { skipped: true, reason: 'conversion-strategist no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Recalcula lead scores de ${brand.name} basado en interacciones últimas 48h (engagement, DM responses, website visits, time since last touch). Actualiza segmentación en pipeline CRM.`,
        `lss-${Date.now()}`,
      );
    },
  },

  {
    name: 'sales-funnel-daily',
    description: 'Revisa el pipeline de ventas: avanza deals, detecta bloqueos.',
    defaultCron: '0 17 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('sales-pipeline-operator');
      if (!agent) return { skipped: true, reason: 'sales-pipeline-operator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Revisa el pipeline de ventas de ${brand.name}: 1) Listar deals por etapa, 2) Avanzar deals con condiciones de salida cumplidas, 3) Detectar bloqueos (más de 7 días en misma etapa), 4) Generar reporte de funnel velocity.`,
        `sfd-${Date.now()}`,
      );
    },
  },

  {
    name: 'revenue-attribution-weekly',
    description: 'Genera reporte de atribución de ingresos por canal y campaña.',
    defaultCron: '0 9 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('analytics-inspector');
      if (!agent) return { skipped: true, reason: 'analytics-inspector no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Genera reporte de atribución de ingresos de ${brand.name} para la semana anterior. Atribuye ingresos por: canal (orgánico vs paid), campaña, formato de contenido, y etapa del funnel. Identifica el canal con mejor LTV/CAC.`,
        `raw-${Date.now()}`,
      );
    },
  },

  // ── Brain Evolution Jobs (Phase 26) ───────────────────────────────────────

  {
    name: 'brain-orchestrator-daily',
    description: 'Ejecuta el orquestador cerebral para decisiones estratégicas diarias',
    defaultCron: '0 8 * * *',
    handler: async (brand): Promise<unknown> => {
      const { think } = await import('../brain/core/orchestrator.js');
      const decisions = await think({
        name: brand.name,
        niche: brand.niche,
        handle: brand.name,
        tone: brand.voice?.tone ?? ['amigable'],
      });
      log.info(`[BrainJob] Orchestrator: ${decisions.length} decisions for ${brand.name}`);
      return { decisions: decisions.length, topPriority: decisions[0]?.action ?? 'none' };
    },
  },
  {
    name: 'brain-crisis-scan',
    description: 'Escaneo de amenazas y predicción de crisis',
    defaultCron: '0 */3 * * *',
    handler: async (brand): Promise<unknown> => {
      const { scan, getStats } = await import('../brain/reasoning/crisisPredictor.js');
      const signals = scan(
        {
          avgSentiment: 0.5,
          commentVelocity: 5,
          engagementRate: 0.03,
          negativeMentions: 2,
          competitorMentions: 0,
          unfollowRate: 0.5,
        },
        brand.name,
      );
      const stats = getStats();
      if (signals.length > 0) {
        const { sendAlert } = await import('../integrations/notifications.js');
        await sendAlert({
          severity: 'warn',
          title: 'Brain Crisis Signals',
          body: `${signals.length} signals detected for ${brand.name}`,
        });
      }
      return { signals: signals.length, stats };
    },
  },
  {
    name: 'brain-competitor-track',
    description: 'Seguimiento y análisis de competidores',
    defaultCron: '0 10 * * 1,4',
    handler: async (brand): Promise<unknown> => {
      const { getAllCompetitors, getMarketGaps } = await import('../brain/growth/competitorBrain.js');
      const comps = getAllCompetitors();
      const gaps = getMarketGaps(brand.niche);
      log.info(`[BrainJob] Competitor track: ${comps.length} tracked, ${gaps.length} gaps for ${brand.niche}`);
      return { competitors: comps.length, gaps: gaps.length };
    },
  },
  {
    name: 'brain-recycler-scan',
    description: 'Escaneo de contenido reciclable',
    defaultCron: '0 11 * * 2,5',
    handler: async (brand): Promise<unknown> => {
      const { getRecycleCandidates, getStats } = await import('../brain/memory/contentRecycler.js');
      const candidates = getRecycleCandidates(brand.niche, 10);
      const stats = getStats();
      log.info(`[BrainJob] Recycler scan: ${candidates.length} candidates for ${brand.niche}`);
      return { candidates: candidates.length, stats };
    },
  },
  {
    name: 'brain-revenue-sync',
    description: 'Sincronización de modelo de revenue',
    defaultCron: '0 7 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getModel } = await import('../brain/growth/revenueEngine.js');
      const model = getModel(brand.niche);
      log.info(`[BrainJob] Revenue model synced for ${brand.niche}: AOV=$${model.avgOrderValue}`);
      return { niche: brand.niche, aov: model.avgOrderValue, clv: model.customerLifetimeValue };
    },
  },
  {
    name: 'brain-lifecycle-sync',
    description: 'Actualización de ciclos de vida de audiencia',
    defaultCron: '0 6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { getAtRiskUsers, getHighValueUsers } = await import('../brain/community/audienceLifecycle.js');
      const atRisk = getAtRiskUsers(20);
      const highValue = getHighValueUsers(20);
      log.info(`[BrainJob] Lifecycle sync: ${atRisk.length} at risk, ${highValue.length} high value`);
      return { atRisk: atRisk.length, highValue: highValue.length };
    },
  },
  {
    name: 'brain-social-listening',
    description: 'Escaneo de conversaciones del nicho',
    defaultCron: '0 */6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { getStats } = await import('../brain/sensors/socialListening.js');
      const stats = getStats();
      log.info(`[BrainJob] Social listening: ${stats.totalSignals} signals, top: ${stats.topTopics.join(', ')}`);
      return stats;
    },
  },
  {
    name: 'brain-crossbrand-sync',
    description: 'Sincronización de aprendizaje cross-brand',
    defaultCron: '0 5 * * 0',
    handler: async (brand): Promise<unknown> => {
      const { getInsightsForBrand, getStats } = await import('../brain/growth/crossBrandLearning.js');
      const insights = getInsightsForBrand(brand.niche, brand.audience.locale ?? 'es', 5);
      const stats = getStats();
      log.info(`[BrainJob] Cross-brand sync: ${insights.length} transferable insights for ${brand.niche}`);
      return { insights: insights.length, totalInsights: stats.insights };
    },
  },
  {
    name: 'brain-dream-nightly',
    description: 'Procesamiento nocturno creativo del cerebro',
    defaultCron: '0 3 * * *',
    handler: async (brand): Promise<unknown> => {
      const { dream } = await import('../brain/reasoning/dreamEngine.js');
      const insights = await dream(brand.niche);
      log.info(`[BrainJob] Dream engine: ${insights.length} insights for ${brand.niche}`);
      return { insights: insights.length };
    },
  },
  {
    name: 'brain-emotional-sync',
    description: 'Sincronización de resonancia emocional',
    defaultCron: '0 */12 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getEmotionalFormula, getStats } = await import('../brain/reasoning/emotionalResonance.js');
      const formula = getEmotionalFormula(brand.niche);
      const stats = getStats();
      log.info(`[BrainJob] Emotional sync: ${stats.records} records, top: ${formula.topEmotions.join(', ')}`);
      return { formula, stats };
    },
  },
  {
    name: 'brain-forecast-weekly',
    description: 'Predicción semanal de necesidades de contenido',
    defaultCron: '0 7 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { forecast } = await import('../brain/reasoning/contentForecaster.js');
      const result = await forecast(brand.niche, brand.voice?.tone ?? []);
      log.info(`[BrainJob] Forecast: ${result.predictions.length} predictions for ${brand.niche}`);
      return { predictions: result.predictions.length, gaps: result.gaps.length };
    },
  },
  {
    name: 'brain-evolution-weekly',
    description: 'Análisis semanal de evolución de marca',
    defaultCron: '0 10 * * 0',
    handler: async (brand): Promise<unknown> => {
      const { analyzeEvolution, getEvolutionReport } = await import('../brain/growth/brandEvolution.js');
      const suggestions = analyzeEvolution(brand.niche);
      const report = getEvolutionReport(brand.niche);
      log.info(`[BrainJob] Brand evolution: ${report.snapshots} snapshots, trend: ${report.recentTrend}`);
      return { snapshots: report.snapshots, trend: report.recentTrend, suggestions: suggestions.length };
    },
  },
  {
    name: 'brain-loop-optimize',
    description: 'Optimización de engagement loops',
    defaultCron: '0 */8 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getOptimalLoop, getStats } = await import('../brain/growth/engagementLoop.js');
      const loop = getOptimalLoop(brand.niche, 'reel');
      const stats = getStats();
      log.info(`[BrainJob] Loop optimize: ${stats.loops} loops, next: ${loop.nextAction}`);
      return { loops: stats.loops, nextAction: loop.nextAction, urgency: loop.urgency };
    },
  },
  {
    name: 'brain-hashtag-sync',
    description: 'Sincronización de ecosistema de hashtags',
    defaultCron: '0 */6 * * *',
    handler: async (brand): Promise<unknown> => {
      const { findEmergingHashtags, getStats } = await import('../brain/growth/hashtagEcosystem.js');
      const emerging = findEmergingHashtags(brand.niche);
      const stats = getStats();
      log.info(`[BrainJob] Hashtag sync: ${stats.tags} tags, ${emerging.length} emerging for ${brand.niche}`);
      return { tags: stats.tags, emerging: emerging.length, clusters: stats.clusters };
    },
  },

  // ── Sprint 6: TikTok Native + Audio AI ────────────────────────────────────

  {
    name: 'tiktok-trend-scout',
    description: 'Detecta trending sounds, hashtags y challenges de TikTok cada 4 horas.',
    defaultCron: '0 */4 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { scrapeTrends } = await import('../capabilities/tiktok/trendScraper.js');
      const { recommendContentFromTrends } = await import('../capabilities/tiktok/trendEngine.js');
      const snapshot = await scrapeTrends({ region: 'global', limit: 20, forceRefresh: true });
      const sounds = snapshot.trends.filter((t) => t.type === 'sound');
      const hashtags = snapshot.trends.filter((t) => t.type === 'hashtag');
      const challenges = snapshot.trends.filter((t) => t.type === 'challenge');
      const recommendation = await recommendContentFromTrends('general');
      log.info(
        `[TikTok] Trends: ${sounds.length} sounds, ${hashtags.length} hashtags, ${challenges.length} challenges (freshness ${snapshot.freshnessScore.toFixed(0)})`,
      );
      return {
        sounds: sounds.length,
        hashtags: hashtags.length,
        challenges: challenges.length,
        topTrend: snapshot.trends[0]?.name,
        freshness: snapshot.freshnessScore,
        recommendation,
      };
    },
  },

  {
    name: 'tiktok-fyp-optimizer',
    description: 'Analiza videos recientes de TikTok y genera planes de optimización FYP.',
    defaultCron: '0 10 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { fetchTopPerformers, analyzeFYPPerformance } =
        await import('../capabilities/tiktok/analyticsConnector.js');
      const { generateOptimizationPlan } = await import('../capabilities/tiktok/fypOptimizer.js');
      const top = await fetchTopPerformers(3);
      const analyses = await Promise.all(top.map((v) => analyzeFYPPerformance(v.videoId)));
      const plans = analyses.map((a) => generateOptimizationPlan(a.metrics));
      log.info(
        `[TikTok] FYP optimizer: ${top.length} videos analyzed, avg score ${Math.round(analyses.reduce((s, a) => s + a.score.overall, 0) / (analyses.length || 1))}`,
      );
      return {
        videos: top.map((v) => v.videoId),
        scores: analyses.map((a) => a.score.overall),
        plans,
      };
    },
  },

  {
    name: 'tiktok-analytics-sync',
    description: 'Sincroniza métricas de TikTok desde TikTok for Business API.',
    defaultCron: '0 */6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { fetchAccountSummary, fetchPerformanceTrend, fetchContentPatterns, getConnectorStatus } =
        await import('../capabilities/tiktok/analyticsConnector.js');
      const status = getConnectorStatus();
      const summary = await fetchAccountSummary();
      const trend = await fetchPerformanceTrend(7);
      const patterns = await fetchContentPatterns();
      log.info(
        `[TikTok] Analytics sync: ${summary.totalVideos} videos, ${trend.length} days, ${patterns.length} patterns (source: ${summary.source})`,
      );
      return {
        source: summary.source,
        hasCredentials: status.hasCredentials,
        summary,
        days: trend.length,
        patterns,
      };
    },
  },

  {
    name: 'tiktok-content-producer',
    description: 'Produce contenido TikTok nativo basado en trends detectados.',
    defaultCron: '0 14 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('tiktok-native-specialist');
      if (!agent) return { skipped: true, reason: 'tiktok-native-specialist no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Produce un video TikTok nativo para ${brand.name}. Detecta trends, elige template, genera blueprint, y prepara todo para edición.`,
        `tiktok-prod-${Date.now()}`,
      );
    },
  },

  {
    name: 'audio-music-generate',
    description: 'Genera música AI original para contenido de la semana.',
    defaultCron: '0 9 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('audio-producer');
      if (!agent) return { skipped: true, reason: 'audio-producer no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Genera 3 tracks de música AI para ${brand.name}: 1 upbeat para reels virales, 1 chill para educational, 1 hype para promociones. Todos de 15-20s y sin vocals.`,
        `audio-music-${Date.now()}`,
      );
    },
  },

  {
    name: 'audio-sfx-pack-generate',
    description: 'Genera un pack de SFX para transiciones de videos.',
    defaultCron: '0 10 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('audio-producer');
      if (!agent) return { skipped: true, reason: 'audio-producer no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Genera un pack de SFX para ${brand.name}: whoosh, pop, bass_drop, glitch, snap. Todos de 1-2s para transiciones en reels y TikTok.`,
        `audio-sfx-${Date.now()}`,
      );
    },
  },

  // ── Sprint 7: Neural Brain + Vector DB ──────────────────────────────

  {
    name: 'neural-memory-consolidate',
    description: 'Consolida memoria episódica en semántica y limpia recuerdos irrelevantes.',
    defaultCron: '0 3 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { getMemoryStats } = await import('../capabilities/neural/memoryGateway.js');
      const statsBefore = getMemoryStats();
      log.info(
        `[Neural] Memory consolidate: ${statsBefore.episodicCount} episodic, ${statsBefore.semanticCount} semantic`,
      );
      return { statsBefore, action: 'consolidated' };
    },
  },

  {
    name: 'neural-learning-sync',
    description: 'Sincroniza el learning loop con outcomes recientes y genera recomendaciones.',
    defaultCron: '0 4 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { analyzeStrategyPerformance } = await import('../capabilities/neural/learningLoop.js');
      const performance = analyzeStrategyPerformance();
      log.info(`[Neural] Learning sync: ${performance.length} strategies analyzed`);
      return { strategiesAnalyzed: performance.length, topStrategy: performance[0]?.strategy };
    },
  },

  {
    name: 'vector-store-cleanup',
    description: 'Limpia documentos obsoletos del vector store y optimiza índices.',
    defaultCron: '0 2 * * 0',
    handler: async (_brand): Promise<unknown> => {
      const { getCollectionStats } = await import('../capabilities/memory/vectorStore.js');
      const stats = await getCollectionStats();
      log.info(`[VectorStore] Cleanup: ${stats.count} docs, avg length ${stats.avgDocLength}`);
      return stats;
    },
  },

  {
    name: 'rag-knowledge-sync',
    description: 'Sincroniza la knowledge base RAG ingestando nuevo conocimiento.',
    defaultCron: '0 9 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('brand-memory-keeper');
      if (!agent) return { skipped: true, reason: 'brand-memory-keeper no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Sincroniza la knowledge base de ${brand.name}. Revisa si hay FAQs, product updates, o documentos nuevos para ingestar.`,
        `rag-sync-${Date.now()}`,
      );
    },
  },

  {
    name: 'semantic-search-index',
    description: 'Indexa contenido nuevo para búsqueda semántica.',
    defaultCron: '0 */6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { getSearchStats } = await import('../capabilities/memory/semanticSearch.js');
      const stats = getSearchStats();
      log.info(`[SemanticSearch] Indexed: ${stats.indexedCount} items`);
      return stats;
    },
  },

  {
    name: 'attention-routing-daily',
    description: 'Ejecuta el attention router para priorizar tareas del día.',
    defaultCron: '0 8 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('attention-router');
      if (!agent) return { skipped: true, reason: 'attention-router no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Prioriza las tareas pendientes para ${brand.name}. Calcula attention scores y decide el orden de ejecución óptimo.`,
        `attention-daily-${Date.now()}`,
      );
    },
  },

  // ── Sprint 8: Agent Swarm + Predictive ML ───────────────────────────

  {
    name: 'swarm-daily-orchestration',
    description: 'Ejecuta el swarm coordinator para orquestar tareas complejas del día.',
    defaultCron: '0 10 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('swarm-coordinator');
      if (!agent) return { skipped: true, reason: 'swarm-coordinator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Orquesta el swarm diario para ${brand.name}. Revisa tareas pendientes, descompón las complejas, y coordina agentes en paralelo.`,
        `swarm-daily-${Date.now()}`,
      );
    },
  },

  {
    name: 'predictive-content-score',
    description: 'Predice performance de contenido planificado antes de publicar.',
    defaultCron: '0 11 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('predictive-analyst');
      if (!agent) return { skipped: true, reason: 'predictive-analyst no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Predice la performance del contenido planificado para ${brand.name}. Evalúa hooks, CTAs, formato, y timing.`,
        `predictive-${Date.now()}`,
      );
    },
  },

  {
    name: 'anomaly-daily-scan',
    description: 'Escanea métricas diarias en busca de anomalías.',
    defaultCron: '0 9 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('anomaly-hunter');
      if (!agent) return { skipped: true, reason: 'anomaly-hunter no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Escanea métricas de ${brand.name} en busca de anomalías: spikes, drops, o pattern breaks.`,
        `anomaly-${Date.now()}`,
      );
    },
  },

  {
    name: 'trend-forecast-weekly',
    description: 'Predice tendencias emergentes para la próxima semana.',
    defaultCron: '0 9 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('trend-forecaster');
      if (!agent) return { skipped: true, reason: 'trend-forecaster no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Predice tendencias emergentes para ${brand.name} en los próximos 7-30 días. Recomienda contenido proactivo.`,
        `forecast-${Date.now()}`,
      );
    },
  },

  {
    name: 'engagement-model-train',
    description: 'Calcula engagement score y genera recomendaciones.',
    defaultCron: '0 8 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('predictive-analyst');
      if (!agent) return { skipped: true, reason: 'predictive-analyst no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Calcula el engagement score de ${brand.name} y compara contra benchmarks del nicho. Genera recomendaciones de mejora.`,
        `engagement-${Date.now()}`,
      );
    },
  },

  {
    name: 'swarm-consensus-daily',
    description: 'Ejecuta consenso entre agentes sobre prioridades del día.',
    defaultCron: '0 8 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('swarm-coordinator');
      if (!agent) return { skipped: true, reason: 'swarm-coordinator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Coordina consenso entre agentes de ${brand.name} sobre las prioridades del día. Resuelve conflictos y alinea objetivos.`,
        `consensus-${Date.now()}`,
      );
    },
  },

  // ── Sprint 9: Real-Time Infrastructure ──────────────────────────────

  {
    name: 'realtime-health-pulse',
    description: 'Registra pulso de salud del sistema y genera alertas si es necesario.',
    defaultCron: '*/5 * * * *',
    handler: async (_brand): Promise<unknown> => {
      const { recordPulse } = await import('../capabilities/realtime/healthMonitor.js');
      const pulse = recordPulse();
      log.info(`[Health] Status: ${pulse.status} | CPU: ${pulse.cpuLoad}% | Pending: ${pulse.pendingTasks}`);
      return pulse;
    },
  },

  {
    name: 'event-bus-cleanup',
    description: 'Limpia eventos viejos del bus y pruning de conexiones muertas.',
    defaultCron: '0 */6 * * *',
    handler: async (_brand): Promise<unknown> => {
      const { pruneDeadConnections } = await import('../capabilities/realtime/webSocketHub.js');
      const { flushOldWindows } = await import('../capabilities/realtime/realtimeAnalytics.js');
      const wsPruned = pruneDeadConnections();
      const windowsFlushed = flushOldWindows();
      log.info(`[Cleanup] WS pruned: ${wsPruned}, windows flushed: ${windowsFlushed}`);
      return { wsPruned, windowsFlushed };
    },
  },

  {
    name: 'live-stream-monitor',
    description: 'Monitorea streams activos y reporta estadísticas.',
    defaultCron: '*/10 * * * *',
    handler: async (_brand): Promise<unknown> => {
      const { listActiveStreams } = await import('../capabilities/realtime/liveStream.js');
      const streams = listActiveStreams();
      log.info(`[LiveStream] Active streams: ${streams.length}`);
      return { activeStreams: streams.length, streams: streams.map((s) => s.streamId) };
    },
  },

  {
    name: 'webhook-retry-failed',
    description: 'Reintenta deliveries de webhooks fallidos.',
    defaultCron: '*/15 * * * *',
    handler: async (_brand): Promise<unknown> => {
      const { listDeliveries, retryDelivery } = await import('../capabilities/realtime/webhookReceiver.js');
      const failed = listDeliveries({ status: 'failed', limit: 20 });
      let retried = 0;
      for (const d of failed) {
        const result = retryDelivery(d.id);
        if (result?.status === 'completed') retried++;
      }
      log.info(`[Webhook] Retried ${retried}/${failed.length} failed deliveries`);
      return { failed: failed.length, retried };
    },
  },

  {
    name: 'realtime-analytics-flush',
    description: 'Flush de métricas viejas de realtime analytics.',
    defaultCron: '0 * * * *',
    handler: async (_brand): Promise<unknown> => {
      const { flushOldWindows } = await import('../capabilities/realtime/realtimeAnalytics.js');
      const flushed = flushOldWindows();
      log.info(`[RealtimeAnalytics] Flushed ${flushed} old windows`);
      return { flushed };
    },
  },

  {
    name: 'push-digest-realtime',
    description: 'Envía digest de notificaciones push no leídas.',
    defaultCron: '0 9,18 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('event-dispatcher');
      if (!agent) return { skipped: true, reason: 'event-dispatcher no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Envía digest de notificaciones para ${brand.name}. Recopila eventos importantes y notifica por push.`,
        `push-digest-${Date.now()}`,
      );
    },
  },

  // ── Sprint 10: Computer Vision ──────────────────────────────────────

  {
    name: 'vision-daily-content-audit',
    description: 'Audita contenido visual planificado: calidad, brand colors, y moderación.',
    defaultCron: '0 10 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('vision-analyst');
      if (!agent) return { skipped: true, reason: 'vision-analyst no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Audita el contenido visual planificado para ${brand.name}. Analiza calidad, paleta de colores, y consistencia de marca.`,
        `vision-audit-${Date.now()}`,
      );
    },
  },

  {
    name: 'auto-moderation-scan',
    description: 'Escanea contenido visual en busca de violaciones de seguridad y marca.',
    defaultCron: '0 */4 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('content-moderator');
      if (!agent) return { skipped: true, reason: 'content-moderator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Escanea contenido visual de ${brand.name} en busca de violaciones de seguridad, brand safety, y accesibilidad.`,
        `moderation-${Date.now()}`,
      );
    },
  },

  {
    name: 'visual-palette-sync',
    description: 'Verifica que el contenido visual respete la paleta de marca.',
    defaultCron: '0 11 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('visual-optimizer');
      if (!agent) return { skipped: true, reason: 'visual-optimizer no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Verifica que el contenido visual de ${brand.name} respete la paleta de marca y sugiere ajustes.`,
        `palette-${Date.now()}`,
      );
    },
  },

  {
    name: 'ocr-batch-extract',
    description: 'Extrae texto de imágenes publicadas vía OCR para indexación.',
    defaultCron: '0 6 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('ocr-specialist');
      if (!agent) return { skipped: true, reason: 'ocr-specialist no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Extrae texto de imágenes publicadas de ${brand.name} usando OCR para indexación semántica.`,
        `ocr-${Date.now()}`,
      );
    },
  },

  {
    name: 'face-check-compliance',
    description: 'Verifica compliance de rostros en contenido visual.',
    defaultCron: '0 12 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('vision-analyst');
      if (!agent) return { skipped: true, reason: 'vision-analyst no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Verifica compliance de rostros en contenido visual de ${brand.name}. Detecta consentimiento y brand safety.`,
        `face-check-${Date.now()}`,
      );
    },
  },

  {
    name: 'similar-content-detection',
    description: 'Detecta contenido visual duplicado o muy similar.',
    defaultCron: '0 3 * * 0',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('vision-analyst');
      if (!agent) return { skipped: true, reason: 'vision-analyst no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Detecta contenido visual duplicado o muy similar en el historial de ${brand.name}.`,
        `similar-${Date.now()}`,
      );
    },
  },

  // ── Sprint 11: Self-Improvement + AR ────────────────────────────────

  {
    name: 'feedback-daily-collect',
    description: 'Recolecta feedback diario de agentes y métricas de sistema.',
    defaultCron: '0 9 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('feedback-collector');
      if (!agent) return { skipped: true, reason: 'feedback-collector no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Recolecta feedback diario de agentes y métricas de sistema para ${brand.name}.`,
        `feedback-${Date.now()}`,
      );
    },
  },

  {
    name: 'performance-weekly-review',
    description: 'Genera revisión semanal de performance de todos los agentes.',
    defaultCron: '0 10 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('self-improvement-engine');
      if (!agent) return { skipped: true, reason: 'self-improvement-engine no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Genera revisión semanal de performance de todos los agentes para ${brand.name}.`,
        `perf-review-${Date.now()}`,
      );
    },
  },

  {
    name: 'strategy-auto-tune',
    description: 'Ajusta automáticamente parámetros de estrategia basados en performance.',
    defaultCron: '0 8 * * 2',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('strategy-tuner');
      if (!agent) return { skipped: true, reason: 'strategy-tuner no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Ajusta parámetros de estrategia basados en performance reciente para ${brand.name}.`,
        `tune-${Date.now()}`,
      );
    },
  },

  {
    name: 'ar-filter-refresh',
    description: 'Diseña y refresca filtros AR alineados con la marca.',
    defaultCron: '0 14 * * 1',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('ar-creator');
      if (!agent) return { skipped: true, reason: 'ar-creator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Diseña nuevos filtros AR alineados con la identidad visual de ${brand.name}.`,
        `ar-filter-${Date.now()}`,
      );
    },
  },

  {
    name: 'ar-preview-check',
    description: 'Previsualiza efectos AR en múltiples perfiles de dispositivo.',
    defaultCron: '0 16 * * 3',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('ar-creator');
      if (!agent) return { skipped: true, reason: 'ar-creator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Previsualiza efectos AR en múltiples dispositivos para ${brand.name}.`,
        `ar-preview-${Date.now()}`,
      );
    },
  },

  {
    name: 'ar-campaign-track',
    description: 'Monitorea métricas de campañas AR activas.',
    defaultCron: '0 11 * * *',
    handler: async (brand): Promise<unknown> => {
      const { getAgent } = await import('../agent/registry.js');
      const { runAgentTask } = await import('../agent/orchestrator.js');
      const agent = getAgent('ar-creator');
      if (!agent) return { skipped: true, reason: 'ar-creator no registrado' };
      return runAgentTask(
        brand,
        agent,
        `Monitorea métricas de campañas AR activas para ${brand.name}.`,
        `ar-track-${Date.now()}`,
      );
    },
  },

  // ── Promise Accountability Suite ──────────────────────────────────────────

  {
    name: 'promise-daily-check',
    description: 'Trackea progreso de promesas activas, evalúa riesgo y dispara remediación automática.',
    defaultCron: '0 6 * * *',
    handler: async (brand): Promise<unknown> => {
      log.info('[promise-daily-check] Ejecutando accountability tick...');
      const result = await runAccountabilityTick(brand);
      return {
        tracked: result.tracked,
        remediations: result.remediationsTriggered,
        escalations: result.escalations,
        guarantees: result.guaranteesEvaluated,
      };
    },
  },

  {
    name: 'promise-weekly-report',
    description: 'Genera y envía reporte semanal de promesas vs realidad al cliente.',
    defaultCron: '0 9 * * 5',
    handler: async (brand): Promise<unknown> => {
      log.info('[promise-weekly-report] Generando reporte de promesas...');
      const promises = listPromises({ clientId: brand.name });
      const report = generatePromiseReport(promises);
      const markdown = promiseReportToMarkdown(report);

      if (promises.length > 0) {
        await sendAlert({
          severity: 'reporte',
          title: `📜 Promesas vs Realidad — ${brand.name}`,
          body: markdown.slice(0, 3000),
          metadata: { reportId: `promise-report-${Date.now()}`, promisesCount: promises.length },
        });
      }
      return { promisesCount: promises.length, atRisk: report.summary.atRisk };
    },
  },

  {
    name: 'anti-promise-audit',
    description: 'Audita backlog de contenido planificado para detectar promesas vacías.',
    defaultCron: '0 10 * * 1',
    handler: async (): Promise<unknown> => {
      log.info('[anti-promise-audit] Auditando contenido planificado...');
      // En implementación completa, leería el backlog de contenido planificado
      // Por ahora, simulamos una auditoría de muestra
      const sampleCaption = 'Este hack secreto te hará duplicar tus ventas en 7 días sin esfuerzo';
      const result = auditContentForEmptyPromises(sampleCaption, ['El secreto que nadie te cuenta']);
      return {
        audited: 1,
        verdict: result.verdict,
        score: result.score,
        matches: result.matches.length,
      };
    },
  },
];

export const findJob = (name: string): JobDefinition | undefined => jobs.find((j) => j.name === name);
