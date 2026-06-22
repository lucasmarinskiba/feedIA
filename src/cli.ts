#!/usr/bin/env node
import chalk from 'chalk';
import ora from 'ora';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadBrandProfile, env, listBrandIds, getActiveBrandId, loadBrandProfileById } from './config/index.js';
import { initMemory } from './agent/memory.js';
import { log } from './agent/logger.js';
import { runAgent } from './agent/core.js';

import { analyzeNicho, reposicionar } from './capabilities/strategy/index.js';
import { generateHooks, optimizeForRetention } from './capabilities/copywriting/index.js';
import {
  createCarrusel,
  createReel,
  createStorySequence,
  createCaption,
  createFacelessTriple,
  renderCarruselToCanva,
  renderReelToCanva,
  renderStorySequenceToCanva,
} from './capabilities/content/index.js';
import { scoutTrends, validarAngulos } from './capabilities/trends/index.js';
import { engineerHooks } from './capabilities/retention/index.js';
import { planSemana } from './capabilities/ops/index.js';
import {
  simulateInbound,
  runLoop,
  runOnce,
  listAllContexts,
  type Channel as BotChannel,
} from './capabilities/bot/index.js';
import {
  buildSnapshot,
  detectAnomalies,
  generateWeeklyReport,
  sendWeeklyReportAlert,
} from './capabilities/analytics/index.js';
import { investigarHashtags, buildPostHashtags, auditHashtags } from './capabilities/hashtags/index.js';
import {
  analizarCompetidores,
  detectarVirales,
  type CompetitorPostObservation,
} from './capabilities/competitors/index.js';
import { repurposeContent, type SourceContent } from './capabilities/repurposing/index.js';
import {
  evaluarUgc,
  registrarUgc,
  solicitarPermiso,
  listarPorEstado,
  type UgcCandidate,
  type PermissionStatus,
} from './capabilities/ugc/index.js';
import { briefToPublish, runWeeklyAutopilot } from './capabilities/pipelines/index.js';
import { sendAlert } from './integrations/notifications.js';
import { publishToInstagram } from './integrations/meta.js';
import { runReelPipeline } from './capabilities/video/index.js';
import { startABTest, evaluateABTest, listABTests } from './capabilities/abTesting/index.js';
import { scoutTrends as scoutRealTrends } from './integrations/trends.js';
import { trackCompetitor } from './integrations/competitors.js';
import { sendNotification } from './integrations/email.js';
import { runAgentTeam, listTeams } from './agent/agentTeams.js';
import { handleEvent, listTriggers } from './agent/agentTriggers.js';
import { ejecutarCrisisCheck, reanudarPublicaciones, getCrisisState } from './capabilities/crisis/index.js';
import {
  diseñarExperimentos,
  lanzarExperimento,
  completarExperimento,
  listarExperimentos,
  type ExperimentStatus,
} from './capabilities/experiments/index.js';
import {
  addSource,
  loadSources,
  procesarTodasLasSources,
  listarBacklog,
  aprobarItem,
  type CuratorSource,
} from './capabilities/curator/index.js';
import { auditarPrePublicacion } from './capabilities/safety/index.js';
import { optimizarPerfil, type ProfileSnapshot } from './capabilities/profile/index.js';
import {
  diseñarSecuencia,
  inscribirEnSecuencia,
  ejecutarPasosListos,
  listarSecuencias,
  listarEnrollments,
  type SequenceTrigger,
} from './capabilities/nurture/index.js';
import { localizarContenido, type MarketTarget } from './capabilities/localization/index.js';
import { construirDigest, enviarDigest } from './capabilities/digest/index.js';
import { procesarObservaciones, enviarOutreach, type CreatorObservation } from './capabilities/collab/index.js';
import { diseñarArcoSemanal } from './capabilities/arc/index.js';
import { startScheduler, runJobByName, listJobs, recentRuns } from './scheduler/index.js';
import { startDaemon } from './server/index.js';
import type { ScheduledSlot } from './capabilities/ops/scheduler.js';
import { registerDashboardAgents, registerProductionAgents } from './capabilities/agents/registerExisting.js';
import {
  registerNicheAgents,
  getNicheAgentsByNiche,
  getNicheAgentsByFunction,
  NICHE_KNOWLEDGE,
  registerBrandAgents,
  registerStrategicBrandAgents,
} from './capabilities/agents/index.js';
import { registerIntegrationAgents } from './capabilities/agents/registerIntegrationAgents.js';
import {
  INSTAGRAM_RULES,
  CRITICAL_RULE_CODES,
  getRulesByCategory,
  getRateLimitStats,
  evaluate,
  runPreFlightCheck,
  runHealthChecks,
  runWeeklyAudit,
  runMonthlyAudit,
  runQuarterlyAudit,
  emergencyStop,
  resumeOperations,
  createBackup,
  listBackups,
  restoreBackup,
  purgeOldBackups,
  runDisasterRecovery,
  generateClientReport,
  trackVersion,
  getVersions,
  approveVersion,
  rejectVersion,
  compareVersions,
  getMonitoringStats,
  type GuardianContext,
} from './compliance/index.js';
import {
  getMode,
  setMode,
  pause,
  resume,
  getStatus,
  getPendingActions,
  getActionHistory,
  approveAction,
  rejectAction,
  modifyAction,
  approveAllPending,
  rejectAllPending,
} from './glassbox/index.js';

import { getDefaultRunner } from './studio/index.js';
import { runRecipe, listRecipes } from './capabilities/recipes/index.js';
import { scoreAesthetic } from './capabilities/aesthetic/index.js';
import { auditReceptorResponsibility, validateCommonSense } from './capabilities/ethics/index.js';
import { listCheckpoints, approveCheckpoint, rejectCheckpoint } from './agent/checkpoints.js';
import { listAgents, getAgent } from './agent/registry.js';
import { getPlaybook, listPlaybooks } from './agent/playbooks/index.js';
import { runPlaybook } from './agent/orchestrator.js';
import {
  listCustomPlaybooks,
  getCustomPlaybook,
  saveCustomPlaybook,
  deleteCustomPlaybook,
  validatePlaybookJSON,
  runCustomPlaybook,
} from './agent/playbooks/customPlaybooks.js';
import {
  listCommentToDmRules,
  addCommentToDmRule,
  updateCommentToDmRule,
  getCommentToDmStats,
  listDmTriggers,
  addDmTrigger,
  updateDmTrigger,
  getDmTriggerStats,
  listFirstCommentTemplates,
  addFirstCommentTemplate,
  updateFirstCommentTemplate,
  getFirstCommentStats,
} from './capabilities/conversion/index.js';
import {
  getLeads,
  addOrUpdateLead,
  moveLead,
  getPipelineStats,
  getAttributionByContent,
  getTopPerformingContent,
  getAttributionStats,
  type PipelineStage,
} from './capabilities/sales/index.js';
import { existsSync, readFileSync as fsReadFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { exec } from 'node:child_process';
import { openBrowser } from './integrations/openBrowser.js';
import { buildCanvaAuthUrl, exchangeCanvaCode, saveCanvaTokens, deleteCanvaTokens } from './integrations/canvaAuth.js';
import { ensureUser, listUsers, deleteUser } from './integrations/userRegistry.js';

const usage = (): void => {
  console.log(`
${chalk.bold('🤖 Agente IA — Especialista Instagram')}

${chalk.bold('Modo autónomo (recomendado):')}
  npm run agent -- "<objetivo en lenguaje natural>"
  ej: npm run agent -- "planificá la semana con 5 posts y 4 stories diarias"

${chalk.bold('Comandos directos por capacidad:')}
  npm run dev nicho [--objetivo=leads]
  npm run dev hooks --idea="..."
  npm run dev retencion --texto="..."
  npm run dev posicionar --texto="..."
  npm run dev carrusel --idea="..." [--longitud=corto|medio|largo]
  npm run dev reel --tema="..." [--duracion=20|30]
  npm run dev stories --evento="..." [--cantidad=5]
  npm run dev caption --contexto="..." --formato=reel|carrusel|post-imagen|historia
  npm run dev faceless --idea="..."
  npm run dev tendencias [--observaciones="..."]
  npm run dev validar --angulos="ángulo 1|ángulo 2|ángulo 3"
  npm run dev hook-engineering --ejemplos="hook 1|hook 2|hook 3"
  npm run dev plan-semana --ideas="idea1::reel|idea2::carrusel"

${chalk.bold('Render con Canva (autofill + export):')}
  npm run dev canva-carrusel --idea="..." [--longitud=corto|medio|largo] [--handle=@usuario] [--open]
  npm run dev canva-reel --tema="..." [--duracion=20|30] [--handle=@usuario] [--open]
  npm run dev canva-stories --evento="..." [--cantidad=5] [--handle=@usuario] [--open]

${chalk.bold('Bot conversacional:')}
  npm run dev bot-simular --items='[{"remitente":"@user","mensaje":"hola","canal":"dm"}]'
  npm run dev bot-once
  npm run dev bot-loop [--iteraciones=10]
  npm run dev bot-contextos

${chalk.bold('Analytics y reportes:')}
  npm run dev snapshot --desde=ISO_DATE [--hasta=ISO_DATE]
  npm run dev reporte-semanal --desde=ISO_DATE
  npm run dev alerta --severity=info|warn|crisis|lead|reporte --titulo="..." --body="..."

${chalk.bold('Hashtags:')}
  npm run dev hashtags-research [--tema="..."]
  npm run dev hashtags-audit --tags="#uno|#dos|#tres"

${chalk.bold('Competidores:')}
  npm run dev competidores --observaciones=path/to/json

${chalk.bold('Repurposing:')}
  npm run dev repurpose --titulo="..." --tipo=blog|video|transcripcion --texto="..." [--carruseles=2 --reels=3]

${chalk.bold('Content Studio (producción multimedia):')}
  npm run dev studio-render --engine=canva --format=png --title="..." [--fields='{"key":"value"}'] [--options='{"templateFormat":"reel"}']
  npm run dev canva-connect --handle=@usuario          # conectar cuenta Canva de un usuario
  npm run dev canva-users                              # listar usuarios con Canva conectado
  npm run dev canva-disconnect --handle=@usuario       # desconectar cuenta Canva
  npm run dev recipe-list
  npm run dev recipe-run --id=reel-faceless-tutorial --idea="..." [--params='{"longitud":"medio"}']
  npm run dev aesthetic-score --description="..." [--format=reel] [--colors="#0A0A0A,#F5F5F5"] [--fonts="Inter"]
  npm run dev ethical-check --caption="..." [--hooks="hook1|hook2"] [--texto="texto adicional"]
  npm run dev asset-generate --prompt="..." --aspectRatio=1:1 [--count=1] [--style="minimalista"]

${chalk.bold('UGC:')}
  npm run dev ugc-evaluar --candidatos=path/to/json
  npm run dev ugc-permiso --id=ugc-...
  npm run dev ugc-listar --status=no-solicitado|solicitado|aprobado|rechazado|expirado

${chalk.bold('Pipelines end-to-end:')}
  npm run dev brief --idea="..." --formato=carrusel|reel [--scheduledAt=ISO_DATE]
  npm run dev autopilot [--dryRunBrief=true|false]

${chalk.bold('Daemon (servidor + scheduler + webhook + dashboard):')}
  npm run dev daemon                # arranca scheduler + HTTP en :7321 (dashboard + webhook /webhook/meta)
  npm run dev scheduler-listar
  npm run dev scheduler-run --job=digest-diario
  npm run dev scheduler-runs [--limit=20]

${chalk.bold('Collab Manager:')}
  npm run dev collab-evaluar --observaciones=path/to/json
  npm run dev collab-outreach --id=pro-...
  npm run dev collab-listar [--status=evaluado|outreach-enviado|en-conversacion|aceptado|rechazado|descartado]

${chalk.bold('Story Arc:')}
  npm run dev arc-disenar --slots=path/to/slots.json [--contexto="..."]

${chalk.bold('Sub-agentes y automatizaciones avanzadas:')}
  npm run dev crisis-check --postId="..." --comentarios=path/to/json
  npm run dev crisis-estado
  npm run dev crisis-reanudar
  npm run dev exp-disenar --contexto="..." [--cantidad=3]
  npm run dev exp-lanzar --id=exp-...
  npm run dev exp-completar --id=exp-... --metricas=path/to/json
  npm run dev exp-listar [--status=corriendo|completado]
  npm run dev curator-add --tipo=rss --nombre="..." --url="..."
  npm run dev curator-procesar
  npm run dev curator-backlog [--status=nuevo]
  npm run dev curator-aprobar --id=bk-...
  npm run dev safety --caption="..." [--hooks="hook1|hook2"]
  npm run dev profile-optimizar --snapshot=path/to/json
  npm run dev nurture-disenar --trigger=nuevo-seguidor --pasos=5
  npm run dev nurture-inscribir --user="@..." --trigger=...
  npm run dev nurture-ejecutar
  npm run dev nurture-listar [--que=secuencias|enrollments] [--status=...]
  npm run dev localizar --contenido=path/to/json --mercados=path/to/json
  npm run dev digest [--soloConstruir]

${chalk.bold('Conversión y Revenue:')}
  npm run dev comment-to-dm-listar
  npm run dev comment-to-dm-crear --keyword="INFO" --message="Te envío la guía por DM..." [--cooldown=24] [--maxPerDay=100]
  npm run dev comment-to-dm-activar --id=ctdm-...
  npm run dev comment-to-dm-desactivar --id=ctdm-...
  npm run dev comment-to-dm-stats
  npm run dev dm-trigger-listar
  npm run dev dm-trigger-crear --keywords="precio,valor,costo" --action=reply|nurture|alert|escalate [--message="..."] [--nurtureTrigger=...]
  npm run dev dm-trigger-activar --id=dmt-...
  npm run dev dm-trigger-desactivar --id=dmt-...
  npm run dev dm-trigger-stats
  npm run dev smart-first-comment-listar
  npm run dev smart-first-comment-crear --messages="¿Te gustó? Guardalo 📌|¿Querés que hagamos uno de estos? Comentá 👇" [--types=reel,carrusel] [--rotate=sequential|random]
  npm run dev smart-first-comment-activar --id=sfc-...
  npm run dev smart-first-comment-desactivar --id=sfc-...
  npm run dev smart-first-comment-stats
  npm run dev lead-listar [--stage=nuevo|calificado|propuesta-enviada|negociacion|cerrado-ganado|cerrado-perdido]
  npm run dev lead-agregar --handle="@usuario" --source="reel:post-123" [--stage=nuevo] [--score=50] [--value=500] [--note="..."]
  npm run dev lead-mover --id=lead-... --stage=calificado [--note="..."]
  npm run dev lead-pipeline
  npm run dev attribution-content --contentId=...
  npm run dev attribution-top [--limit=10]
  npm run dev attribution-stats

${chalk.bold('Orquestación Multi-Agente:')}
  npm run dev playbook --name=viral-engine|lead-to-sale|community-sprint|crisis-to-opportunity|autopilot-plus|brand-kit-setup|content-production-pipeline|profile-refresh|brand-strategy-workshop|brand-audit-complete|competitive-brand-analysis|brand-evolution [--param="..."]
  npm run dev playbook-listar
  npm run dev playbook-personalizado-crear --file=playbook.json
  npm run dev playbook-personalizado-listar
  npm run dev playbook-personalizado-ejecutar --id=mi-playbook
  npm run dev playbook-personalizado-eliminar --id=mi-playbook
  npm run dev ig-publish --file=post.jpg --caption="..." --format=post|reel|story|carousel
  npm run dev ig-publish-via --file=... --format=post --via=api|web|app
  npm run dev ig-health
  npm run dev browser-navigate --url=https://instagram.com
  npm run dev browser-health
  npm run dev canva-create --format=instagram-post [--template="modern minimal"]
  npm run dev canva-export --format=png
  npm run dev capcut-create --aspectRatio=9:16
  npm run dev capcut-export --quality=1080p
  npm run dev runway-generate --prompt="aurora boreal sobre montañas" [--duration=5]
  npm run dev heygen-create --script="Hola, soy tu asistente virtual"
  npm run dev playbook --name=canva-to-instagram|ai-video-to-reel
  npm run dev checkpoint-listar [--status=pending|approved|rejected|expired]
  npm run dev checkpoint-aprobar --id=cp-...
  npm run dev checkpoint-rechazar --id=cp-...
  npm run dev agent-listar [--niche=emprendedor|...] [--function=content-strategist|...]
  npm run dev agent-info --id=agent-id
  npm run dev agent-ejecutar --id=agent-id --goal="..."
  npm run dev nicho-listar

${chalk.bold('Computer Use — Automatización vía navegador:')}
  npm run dev cu-plan --instruccion="navegar a Instagram y dar like al primer post"
  npm run dev cu-ejecutar --instruccion="..." [--force]
  npm run dev cu-resume --sesion=cu-...
  npm run dev cu-sesiones
  npm run dev cu-health
  npm run dev cu-runs [--limit=20]

${chalk.bold('Voz — Manos Libres (Hands-Free):')}
  npm run dev voz-hablar --texto="Hola, soy Talía"
  npm run dev voz-escuchar [--timeout=8000]
  npm run dev voz-comando --texto="estado del sistema"
  npm run dev voz-manos-libres [--idioma=es-AR]
  npm run dev voz-detener
  npm run dev voz-sesiones
  npm run dev voz-reiniciar
  npm run dev macro-listar
  npm run dev macro-ejecutar --nombre=morning-routine
  npm run dev macro-grabar --nombre=morning-routine
  npm run dev macro-paso --texto="estado del sistema"
  npm run dev macro-terminar [--descripcion="..."]
  npm run dev macro-cancelar
  npm run dev macro-eliminar --nombre=morning-routine
  npm run dev asistente-webhook --comando="estado"

${chalk.bold('Voz Avanzada — Tercera Fase:')}
  npm run dev sentimiento --texto="Estoy muy contento con los resultados"
  npm run dev biometrico-enrolar --id=usuario --nombre="Juan" --label=admin
  npm run dev biometrico-match
  npm run dev biometrico-perfiles
  npm run dev speaker-activo
  npm run dev offline-status
  npm run dev exportar-voz [--formato=json|markdown|csv|txt]
  npm run voz-entrenar --id=usuario --nombre="Juan" --label=admin
  npm run voz-trigger --perfil=usuario --macro=morning-routine
  npm run voz-dashboard

${chalk.bold('Voz — Sexta Fase (Analytics, Clonación, Traducción, Emergencia):')}
  npm run dev voz-analytics [--dias=7]
  npm run dev voz-heatmap [--dias=7]
  npm run dev voz-success-rate [--dias=7]
  npm run dev voz-top-commands [--limite=10]
  npm run dev voz-wake-custom --frase="..." --idioma=es --nombre="..."
  npm run dev voz-wake-listar
  npm run dev voz-clonar --nombre="Mi Voz" --muestras=./a1.wav,./a2.wav
  npm run dev voz-clones
  npm run dev voz-clonar-hablar --voz=clone-... --texto="Hola"
  npm run dev traducir --texto="..." --objetivo=en
  npm run dev emergencia-pausar
  npm run dev emergencia-reanudar
  npm run dev emergencia-estado
  npm run dev emergencia-forzar

${chalk.bold('GlassBox — Supervisión en tiempo real (Caja de Cristal):')}
  npm run dev glassbox-modo --modo=autonomous|supervised|paused
  npm run dev glassbox-pausar                # pausar ejecución del agente
  npm run dev glassbox-reanudar              # reanudar en modo supervisado
  npm run dev glassbox-estado                # ver estado, cola e historial
  npm run dev glassbox-cola                  # listar acciones pendientes
  npm run dev glassbox-historial [--limit=20] # ver historial de acciones
  npm run dev glassbox-aprobar --id=gb-a-... [--nota="OK"]
  npm run dev glassbox-rechazar --id=gb-a-... --razon="..."
  npm run dev glassbox-modificar --id=gb-a-... --payload='{"key":"value"}'
  npm run dev glassbox-aprobar-todas [--nota="OK"]
  npm run dev glassbox-rechazar-todas --razon="..."

${chalk.bold('Compliance y seguridad:')}
  npm run dev compliance-status              # estado del sistema de compliance
  npm run dev compliance-rules               # listar todas las reglas de Instagram
  npm run dev compliance-audit [--limit=20]  # ver últimas entradas del audit log
  npm run dev compliance-rate-limits         # ver uso actual de rate limits
  npm run dev compliance-check --texto="..." # verificar si un texto viola reglas
  npm run dev preflight                      # verificación completa antes de operar
  npm run dev health-check                   # verificación de salud del sistema
  npm run dev emergency-stop --razon="..."   # pausar TODAS las operaciones
  npm run dev emergency-resume --resolucion="..." # reanudar operaciones
  npm run dev auditoria-semanal              # reporte semanal de compliance
  npm run dev auditoria-mensual              # reporte mensual de compliance
  npm run dev auditoria-trimestral           # reporte trimestral de compliance
  npm run dev backup-crear --razon="..."     # crear backup manual
  npm run dev backup-listar                  # listar backups disponibles
  npm run dev backup-restaurar --id=...      # restaurar un backup
  npm run dev backup-purgar                  # eliminar backups antiguos
  npm run dev disaster-recovery              # ejecutar recuperación ante desastres

${chalk.bold('Video y Multimedia:')}
  npm run dev video-reel --tema="..." [--duracion=30] [--style="..."]

${chalk.bold('A/B Testing:')}
  npm run dev ab-test-start --name="..." --hypothesis="..." --variants=path/to/json
  npm run dev ab-test-evaluate --id=ab-...
  npm run dev ab-test-listar

${chalk.bold('Inteligencia de Mercado (Datos Reales):')}
  npm run dev trends-scout --keywords="ai,marketing" [--sources=reddit,google,twitter]
  npm run dev competitor-track --handle=@competidor

${chalk.bold('Fase 21 — Conversión (Funnel, Escasez, Social Proof, Ofertas):')}
  npm run dev conversion-funnel
  npm run dev conversion-funnel-fix --bottleneck=awareness|interest|decision|action
  npm run dev conversion-scarcity [--contexto="Lanzamiento del curso"]
  npm run dev conversion-countdown --evento="Lanzamiento" --fecha=ISO_DATE
  npm run dev conversion-social-proof
  npm run dev conversion-oferta [--tipo=discount|bundle|lead_magnet|flash_sale|exclusive] [--contexto="..."]
  npm run dev conversion-launch --nombre="Producto X"

${chalk.bold('Fase 22 — Perfil & Grid (Audit, Highlights, Bio, Grid):')}
  npm run dev profile-audit
  npm run dev profile-highlights
  npm run dev profile-bio [--objetivo=followers|leads|sales|authority]
  npm run dev profile-grid [--posts=9]
  npm run dev profile-hooks

${chalk.bold('Fase 23 — Comunidad & Ritual (Rituales, Insider, Naming, Loops):')}
  npm run dev ritual-crear
  npm run dev ritual-insider
  npm run dev ritual-naming
  npm run dev ritual-manifesto --nombre="Mi Tribu"
  npm run dev ritual-loops

${chalk.bold('Fase 24 — Audiencia & Personas (Segmentación, Content Match, Personalización):')}
  npm run dev audience-segmentar
  npm run dev audience-journey --persona="La Curiosa"
  npm run dev audience-match
  npm run dev audience-personalizar --tema="..." --segmentos="curiosa,compradora"
  npm run dev audience-rotacion

${chalk.bold('Fase 25 — FOMO Expert (Series, Countdown, Hooks, Trending + Avanzado):')}
  npm run dev fomo-serie --tema="..." [--episodios=5]
  npm run dev fomo-countdown --evento="..." --fecha=ISO_DATE
  npm run dev fomo-teaser --evento="..."
  npm run dev fomo-hooks
  npm run dev fomo-profile-hook
  npm run dev fomo-trending
  npm run dev fomo-anticipation --evento="..." [--dias=7]
  npm run dev fomo-drop [--tipo=product|content|access|experience] [--contexto="..."]
  npm run dev fomo-drop-series --nombre="Colección X"
  npm run dev fomo-efimero [--tema="..."]
  npm run dev fomo-counters
  npm run dev fomo-gamified
  npm run dev fomo-insider
  npm run dev fomo-visual
  npm run dev fomo-swipe-reveal --tema="..."
  npm run dev fomo-campaign [--tema="..."] [--dias=14]
  npm run dev fomo-playbook

${chalk.bold('Email y Notificaciones:')}
  npm run dev email-send --to="..." --subject="..." --message="..."

${chalk.bold('Multi-cuenta:')}
  npm run dev account-listar
  npm run dev account-set --id=default

${chalk.bold('Equipos de Agentes (Agent Teams):')}
  npm run dev team-listar
  npm run dev team-run --teamId=content-strike-team [--context="objetivo adicional"]

${chalk.bold('Triggers Automáticos:')}
  npm run dev trigger-listar
  npm run dev trigger-simular --event=inbound_message_received [--payload='{"type":"comentario"}']

${chalk.bold('Configuración Canva:')}
  npm run dev setup-canva                    # wizard: abre el Developer Portal y guía paso a paso

${chalk.bold('Pipeline end-to-end (Canva → Instagram):')}
  npm run dev pipeline-canva --formato=carrusel --idea="..." --handle=@usuario [--open] [--publicar]
  npm run dev pipeline-canva --formato=reel --idea="..." --handle=@usuario [--open] [--publicar]

${chalk.bold('Cerebro FeedIA (Brain):')}
  npm run dev brain-stats
  npm run dev brain-recall --query="..."
  npm run dev brain-viral --content="..." [--niche=...] [--format=...]
  npm run dev brain-content --topic="..." [--format=post|reel|carousel|story]
  npm run dev brain-decision --options="A|B|C" [--tipo=post|strategy]
  npm run dev brain-ingest --content="..." [--fuente=system|post|trend]
  npm run dev brain-trends [--niche=...]
  npm run dev brain-personality [--target=@usuario]
  npm run dev brain-community-greeting --handle=@usuario
  npm run dev brain-community-audit
  npm run dev brain-human-reply --handle=@user --message="..." [--tipo=comment|dm]
  npm run dev brain-stalker [--handle=@user]
  npm run dev brain-profile [--bio="..."] [--highlights="a,b,c"]
  npm run dev brain-aesthetic
  npm run dev brain-partners
  npm run dev brain-niche [--nombre=...] [--objetivo=conversion]
  npm run dev brain-trend-sync
  npm run dev brain-orchestrator
  npm run dev brain-competitor [--handle=@rival]
  npm run dev brain-revenue [--reach=5000] [--engagement=500]
  npm run dev brain-recycler
  npm run dev brain-crisis
  npm run dev brain-crossbrand
  npm run dev brain-lifecycle [--handle=@user]
  npm run dev brain-listening
  npm run dev brain-sequence --titulo="..." [--episodios=5]
  npm run dev brain-vision
  npm run dev brain-video
  npm run dev brain-dream
  npm run dev brain-emotional
  npm run dev brain-forecast
  npm run dev brain-evolution
  npm run dev brain-loop
  npm run dev brain-hashtags

${chalk.bold('Sprint 5 — Monetización & Paid Growth:')}
  npm run dev meta-campaign-listar [--estado=ACTIVE|PAUSED|ARCHIVED]
  npm run dev meta-campaign-crear --nombre="..." --objetivo=REACH|ENGAGEMENT|CONVERSIONS --presupuesto=50 --duracion=7 [--formato=reel|carrusel]
  npm run dev meta-campaign-insights --campaignId=...
  npm run dev meta-campaign-optimizar --campaignId=...
  npm run dev meta-budget-rebalance
  npm run dev sales-pipeline
  npm run dev sales-deal-agregar --titulo="..." --value=500 [--stage=nuevo] [--source="DM"]
  npm run dev sales-deal-mover --id=deal-... --stage=propuesta-enviada [--note="..."]
  npm run dev sales-deal-cerrar --id=deal-... --result=ganado|perdido [--value=...]
  npm run dev attribution-reporte [--dias=7]
  npm run dev revenue-content-roas [--limit=10]
  npm run dev smart-boost
  npm run dev campaign-weekly-review

${chalk.bold('Sprint 6 — TikTok Native + Audio AI:')}
  npm run dev tiktok-trends [--limit=20]
  npm run dev tiktok-sounds [--limit=10]
  npm run dev tiktok-templates [--tipo=comedy|fashion|education] [--dificultad=easy|medium|hard]
  npm run dev tiktok-blueprint --template=tt-tpl-fast-hook --tema="..."
  npm run dev tiktok-fyp-score --completion=0.5 --watchtime=0.5 --fyp=0.3 --rewatch=0.1 --share=0.01 --comment=0.02 --save=0.01 [--duration=15]
  npm run dev tiktok-agent-run --goal="..."
  npm run dev audio-music --prompt="..." [--duracion=15] [--mood=upbeat|energetic|chill|epic|emotional|dark]
  npm run dev audio-voiceover --script="..." [--voz=brand-primary]
  npm run dev audio-sfx --descripcion="Transition whoosh" | --preset=whoosh|pop|bass_drop|glitch|snap
  npm run dev audio-sound-design --formato=reel|tiktok --duracion=15 --tema="..." [--voiceover]
  npm run dev audio-dub --script="..." --origen=es-AR --destino=en-US

${chalk.bold('Sprint 7 — Neural Brain + Vector DB:')}
  npm run dev neural-memory-stats
  npm run dev neural-memory-recall --type=episodic|semantic [--agentId=...] [--limit=10]
  npm run dev neural-memory-record --type=episodic --agentId=... --action="..." --outcome=success|partial|failure
  npm run dev neural-learning-analyze [--agentId=...]
  npm run dev neural-focus-start --taskId=... --agentId=...
  npm run dev neural-focus-end --taskId=...
  npm run dev vector-store-query --query="..." [--topK=5]
  npm run dev vector-store-add --text="..." [--metadata='{"key":"value"}']
  npm run dev rag-query --question="..." [--topK=5]
  npm run dev rag-ingest --text="..." --source="..." [--chunkSize=500]
  npm run dev semantic-search --query="..." [--type=post|comment|dm] [--limit=5]
  npm run dev playbook --name=neural-memory-cycle|rag-knowledge-ops

${chalk.bold('Sprint 8 — Agent Swarm + Predictive ML:')}
  npm run dev swarm-create --goal="..." [--tasks='[{"id":"t1","goal":"...","agentId":"...","priority":5}]']
  npm run dev swarm-run --runId=swarm-...
  npm run dev swarm-status --runId=swarm-...
  npm run dev swarm-list [--limit=10]
  npm run decompose-task --goal="..."
  npm run dev agent-message --channel=general --from=... --payload="..." [--to=...]
  npm run dev predict-content --format=reel --hookStrength=0.8 --hasCta [--videoLengthSec=15] [--hashtagCount=5]
  npm run dev predict-engagement --followerCount=10000 --avgLikesLast10=500 --avgCommentsLast10=50 --avgSavesLast10=100
  npm run dev forecast-trends --topic="..." --history='[{"date":"2024-01-01","mentions":100,"engagement":500,"velocity":0.1}]'
  npm run dev detect-anomalies --metricName=reach --values='[{"date":"2024-01-01","value":1000}]'
  npm run dev benchmark-nicho --niche=fitness
  npm run dev playbook --name=swarm-content-strike|predictive-weekly-review

${chalk.bold('Sprint 9 — Real-Time Infrastructure:')}
  npm run dev realtime-publish --topic="..." --payload='{"key":"value"}' [--source=cli] [--priority=5]
  npm run dev realtime-subscribe --topic="..."
  npm run dev realtime-events [--topic=...] [--limit=50]
  npm run dev websocket-broadcast --channel=general --payload="..."
  npm run dev websocket-connections
  npm run dev live-stream-start --label="Launch Monitor" [--agentFilter=agent1,agent2]
  npm run dev live-stream-status --streamId=live-...
  npm run dev webhook-register --path=/webhook/ig --source=instagram [--secret=...]
  npm run dev webhook-list [--endpointId=...]
  npm run dev health-pulse [--cpuLoad=30] [--memoryUsageMb=128] [--pendingTasks=0]
  npm run dev playbook --name=realtime-crisis-response|live-launch-monitor

${chalk.bold('Sprint 10 — Computer Vision:')}
  npm run dev vision-analyze --imageUrl="..." [--width=1080] [--height=1080]
  npm run dev vision-objects --imageUrl="..."
  npm run dev vision-ocr --imageUrl="..."
  npm run dev vision-faces --imageUrl="..."
  npm run dev vision-compare --imageUrlA="..." --imageUrlB="..."
  npm run dev vision-caption --imageUrl="..." --brandName="..."
  npm run dev vision-moderate --imageUrl="..."
  npm run dev vision-palette --imageUrl="..."
  npm run dev vision-brand-check --imageUrl="..." --brandColors="#FF0000,#00FF00"
  npm run dev vision-batch --imageUrls='["url1","url2"]'
  npm run dev vision-similar --queryUrl="..." --candidates='["url1","url2"]'
  npm run dev playbook --name=visual-content-audit|auto-moderation-pipeline

${chalk.bold('Configuración general:')}
  - data/brand.json (copiar de data/brand.example.json)
  - data/brands/{id}.json para multi-cuenta
  - .env (copiar de .env.example)
  - DRY_RUN=${env.dryRun} (modo actual)
  - BOT_AUTO_REPLY_ENABLED=${env.bot.autoReplyEnabled} (bot activo)
  - COMPLIANCE_ACCEPTED_TERMS=${env.compliance.acceptedTerms} (términos aceptados)
`);
};

const parseFlags = (argv: string[]): Record<string, string> => {
  const flags: Record<string, string> = {};
  for (const arg of argv) {
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 0) {
      flags[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      flags[arg.slice(2)] = 'true';
    }
  }
  return flags;
};

const saveOutput = (label: string, data: unknown): string => {
  mkdirSync(resolve('output'), { recursive: true });
  const fp = resolve(`output/${label}-${Date.now()}.json`);
  writeFileSync(fp, JSON.stringify(data, null, 2), 'utf-8');
  return fp;
};

const withSpinner = async <T>(text: string, fn: () => Promise<T>): Promise<T> => {
  const spinner = ora({ text, color: 'magenta' }).start();
  try {
    const out = await fn();
    spinner.succeed(text);
    return out;
  } catch (err) {
    spinner.fail(`${text} — ${(err as Error).message}`);
    throw err;
  }
};

const main = async (): Promise<void> => {
  const [, , cmd, ...rest] = process.argv;
  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
    return;
  }

  const flags = parseFlags(rest);
  const positional = rest.filter((a) => !a.startsWith('--'));
  // Register all agents (dashboard + specialized + niche) into orchestration registry
  registerDashboardAgents();
  registerProductionAgents();
  registerNicheAgents();
  registerBrandAgents();
  registerStrategicBrandAgents();
  registerIntegrationAgents();

  const brand = loadBrandProfile();
  initMemory(brand);

  log.info(`Marca cargada: ${chalk.bold(brand.name)} | Nicho: ${brand.niche} | DRY_RUN=${env.dryRun}`);

  switch (cmd) {
    case 'agent': {
      const goal = positional.join(' ');
      if (!goal) {
        log.error('Falta el objetivo. Ej: npm run agent -- "planificá la semana"');
        process.exit(1);
      }
      const result = await withSpinner('Ejecutando agente autónomo', async () => runAgent(brand, { goal }));
      console.log('\n' + chalk.bold.green('━━━ RESULTADO DEL AGENTE ━━━') + '\n');
      console.log(result.finalText);
      console.log('\n' + chalk.gray(`Iteraciones: ${result.iterations} | Tool calls: ${result.toolCalls.length}`));
      const fp = saveOutput('agent-run', result);
      log.success(`Trace completo: ${fp}`);
      break;
    }
    case 'nicho': {
      const r = await withSpinner('Analizando nicho', () => analyzeNicho(brand, flags['objetivo']));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('nicho', r)}`);
      break;
    }
    case 'hooks': {
      if (!flags['idea']) throw new Error('Falta --idea="..."');
      const r = await withSpinner('Generando hooks', () => generateHooks(brand, flags['idea']!));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('hooks', r)}`);
      break;
    }
    case 'retencion': {
      if (!flags['texto']) throw new Error('Falta --texto="..."');
      const r = await withSpinner('Optimizando retención', () => optimizeForRetention(brand, flags['texto']!));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('retencion', r)}`);
      break;
    }
    case 'posicionar': {
      if (!flags['texto']) throw new Error('Falta --texto="..."');
      const r = await withSpinner('Reposicionando contenido', () => reposicionar(brand, flags['texto']!));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('posicionar', r)}`);
      break;
    }
    case 'carrusel': {
      if (!flags['idea']) throw new Error('Falta --idea="..."');
      const longitud = (flags['longitud'] ?? 'medio') as 'corto' | 'medio' | 'largo';
      const r = await withSpinner('Diseñando carrusel', () => createCarrusel(brand, flags['idea']!, longitud));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('carrusel', r)}`);
      break;
    }
    case 'reel': {
      if (!flags['tema']) throw new Error('Falta --tema="..."');
      const dur = flags['duracion'] ? Number(flags['duracion']) : 25;
      const allowed: Array<15 | 20 | 30 | 45 | 60> = [15, 20, 30, 45, 60];
      const duracion = allowed.includes(dur as 15 | 20 | 30 | 45 | 60) ? (dur as 15 | 20 | 30 | 45 | 60) : 30;
      const r = await withSpinner('Escribiendo reel', () => createReel(brand, flags['tema']!, duracion));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('reel', r)}`);
      break;
    }
    case 'stories': {
      if (!flags['evento']) throw new Error('Falta --evento="..."');
      const cantidad = flags['cantidad'] ? Number(flags['cantidad']) : 5;
      const r = await withSpinner('Diseñando stories', () => createStorySequence(brand, flags['evento']!, cantidad));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('stories', r)}`);
      break;
    }
    case 'caption': {
      if (!flags['contexto'] || !flags['formato']) {
        throw new Error('Faltan --contexto="..." --formato=reel|carrusel|post-imagen|historia');
      }
      const r = await withSpinner('Escribiendo caption', () =>
        createCaption(brand, flags['contexto']!, flags['formato'] as 'reel' | 'carrusel' | 'post-imagen' | 'historia'),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('caption', r)}`);
      break;
    }
    case 'faceless': {
      if (!flags['idea']) throw new Error('Falta --idea="..."');
      const r = await withSpinner('Generando triple faceless', () =>
        createFacelessTriple(brand, flags['idea']!, flags['objetivo']),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('faceless', r)}`);
      break;
    }
    case 'tendencias': {
      const r = await withSpinner('Buscando tendencias', () => scoutTrends(brand, flags['observaciones']));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('tendencias', r)}`);
      break;
    }
    case 'validar': {
      if (!flags['angulos']) throw new Error('Falta --angulos="ángulo 1|ángulo 2"');
      const angulos = flags['angulos'].split('|').map((s) => s.trim());
      const r = await withSpinner('Validando ángulos', () => validarAngulos(brand, angulos));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('validar', r)}`);
      break;
    }
    case 'hook-engineering': {
      if (!flags['ejemplos']) throw new Error('Falta --ejemplos="hook 1|hook 2"');
      const ejemplos = flags['ejemplos'].split('|').map((s) => s.trim());
      const r = await withSpinner('Ingeniería de hooks', () => engineerHooks(brand, ejemplos));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('hook-eng', r)}`);
      break;
    }
    case 'canva-carrusel': {
      if (!flags['idea']) throw new Error('Falta --idea="..."');
      const longitud = (flags['longitud'] ?? 'medio') as 'corto' | 'medio' | 'largo';
      const userHandle = flags['handle'];
      const carrusel = await withSpinner('Diseñando carrusel', () => createCarrusel(brand, flags['idea']!, longitud));
      const render = await withSpinner('Renderizando con Canva', () =>
        renderCarruselToCanva(carrusel, `Carrusel — ${flags['idea']!.slice(0, 40)}`, userHandle),
      );
      if (render.designUrl && flags['open']) openBrowser(render.designUrl);
      const out = { carrusel, render };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('canva-carrusel', out)}`);
      break;
    }
    case 'canva-reel': {
      if (!flags['tema']) throw new Error('Falta --tema="..."');
      const dur = flags['duracion'] ? Number(flags['duracion']) : 30;
      const allowed: Array<15 | 20 | 30 | 45 | 60> = [15, 20, 30, 45, 60];
      const duracion = allowed.includes(dur as 15 | 20 | 30 | 45 | 60) ? (dur as 15 | 20 | 30 | 45 | 60) : 30;
      const userHandle = flags['handle'];
      const reel = await withSpinner('Escribiendo reel', () => createReel(brand, flags['tema']!, duracion));
      const render = await withSpinner('Renderizando con Canva', () =>
        renderReelToCanva(reel, `Reel — ${flags['tema']!.slice(0, 40)}`, userHandle),
      );
      if (render.designUrl && flags['open']) openBrowser(render.designUrl);
      const out = { reel, render };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('canva-reel', out)}`);
      break;
    }
    case 'canva-stories': {
      if (!flags['evento']) throw new Error('Falta --evento="..."');
      const cantidad = flags['cantidad'] ? Number(flags['cantidad']) : 5;
      const userHandle = flags['handle'];
      const story = await withSpinner('Diseñando stories', () =>
        createStorySequence(brand, flags['evento']!, cantidad),
      );
      const render = await withSpinner('Renderizando con Canva', () =>
        renderStorySequenceToCanva(story, `Stories — ${flags['evento']!.slice(0, 40)}`, userHandle),
      );
      if (render.designUrl && flags['open']) openBrowser(render.designUrl);
      const out = { story, render };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('canva-stories', out)}`);
      break;
    }
    case 'bot-simular': {
      if (!flags['items']) {
        throw new Error('Falta --items=\'[{"remitente":"@user","mensaje":"...","canal":"dm"}]\'');
      }
      let items: Array<{
        remitente: string;
        mensaje: string;
        canal: BotChannel;
        postId?: string;
      }>;
      try {
        items = JSON.parse(flags['items']) as typeof items;
      } catch (err) {
        throw new Error(`--items no es JSON válido: ${(err as Error).message}`);
      }
      const r = await withSpinner('Procesando bot (simulado)', () => simulateInbound(brand, items));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('bot-simular', r)}`);
      break;
    }
    case 'bot-once': {
      const r = await withSpinner('Bot iteración única', () => runOnce(brand));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('bot-once', r)}`);
      break;
    }
    case 'bot-loop': {
      const iter = flags['iteraciones'] ? Number(flags['iteraciones']) : 0;
      log.info(
        iter > 0
          ? `Bot loop: ${iter} iteraciones (cada ${env.bot.pollIntervalSeconds}s)`
          : `Bot loop: indefinido (Ctrl+C para detener, cada ${env.bot.pollIntervalSeconds}s)`,
      );
      await runLoop(brand, iter > 0 ? { iteraciones: iter } : {});
      break;
    }
    case 'bot-contextos': {
      const contextos = listAllContexts();
      const resumen = contextos.map((c) => ({
        handle: c.handle,
        canal: c.channel,
        mensajesTotales: c.mensajesTotales,
        autoRepliesEnviados: c.autoRepliesEnviados,
        escaladoAHumano: c.escaladoAHumano,
        ultimoContacto: c.ultimoContacto,
        ultimoIntent: c.intentHistory.at(-1) ?? '(sin intent)',
      }));
      console.log(JSON.stringify(resumen, null, 2));
      log.success(`${contextos.length} conversaciones en memoria`);
      break;
    }
    case 'snapshot': {
      if (!flags['desde']) throw new Error('Falta --desde=ISO_DATE');
      const snap = await withSpinner('Construyendo snapshot', () => buildSnapshot(flags['desde']!, flags['hasta']));
      const anomalias = detectAnomalies(snap);
      const out = { snap, anomalias };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('snapshot', out)}`);
      break;
    }
    case 'reporte-semanal': {
      if (!flags['desde']) throw new Error('Falta --desde=ISO_DATE');
      const snap = await withSpinner('Snapshot', () => buildSnapshot(flags['desde']!));
      const anomalias = detectAnomalies(snap);
      const report = await withSpinner('Generando reporte', () => generateWeeklyReport(brand, snap, anomalias));
      await withSpinner('Enviando alerta', () => sendWeeklyReportAlert(brand, report, snap));
      const out = { report, anomalias };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('reporte-semanal', out)}`);
      break;
    }
    case 'alerta': {
      if (!flags['severity'] || !flags['titulo'] || !flags['body']) {
        throw new Error('Faltan --severity --titulo --body');
      }
      const r = await withSpinner('Enviando alerta', () =>
        sendAlert({
          severity: flags['severity'] as 'info' | 'warn' | 'crisis' | 'lead' | 'reporte',
          title: flags['titulo']!,
          body: flags['body']!,
          ...(flags['ctaUrl'] ? { ctaUrl: flags['ctaUrl'] } : {}),
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'hashtags-research': {
      const r = await withSpinner('Investigando hashtags', () => investigarHashtags(brand, flags['tema']));
      const pools = {
        mega: r.pools.mega.map((h) => h.tag),
        grande: r.pools.grande.map((h) => h.tag),
        medio: r.pools.medio.map((h) => h.tag),
        nicho: r.pools.nicho.map((h) => h.tag),
        marca: r.pools.marca.map((h) => h.tag),
      };
      const seleccion = buildPostHashtags(pools, r.recomendacionMezclaPorPost);
      const out = { research: r, seleccionRotada: seleccion };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('hashtags-research', out)}`);
      break;
    }
    case 'hashtags-audit': {
      if (!flags['tags']) throw new Error('Falta --tags="#uno|#dos|#tres"');
      const tags = flags['tags'].split('|').map((s) => s.trim());
      const r = await withSpinner('Auditando hashtags', () => auditHashtags(tags));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('hashtags-audit', r)}`);
      break;
    }
    case 'competidores': {
      if (!flags['observaciones']) throw new Error('Falta --observaciones=path/to/json');
      const obs = JSON.parse(readFileSync(resolve(flags['observaciones']), 'utf-8')) as CompetitorPostObservation[];
      const opportunities = await withSpinner('Analizando competidores', () => analizarCompetidores(brand, obs));
      const out = { opportunities, virales: detectarVirales(obs) };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('competidores', out)}`);
      break;
    }
    case 'repurpose': {
      if (!flags['titulo'] || !flags['tipo'] || !flags['texto']) {
        throw new Error('Faltan --titulo --tipo --texto');
      }
      const source: SourceContent = {
        tipo: flags['tipo'] as SourceContent['tipo'],
        titulo: flags['titulo'],
        texto: flags['texto'],
        ...(flags['url'] ? { url: flags['url'] } : {}),
      };
      const opts: { carruselesCount?: number; reelsCount?: number; storiesCount?: number } = {};
      if (flags['carruseles']) opts.carruselesCount = Number(flags['carruseles']);
      if (flags['reels']) opts.reelsCount = Number(flags['reels']);
      if (flags['stories']) opts.storiesCount = Number(flags['stories']);
      const r = await withSpinner('Repurposing', () => repurposeContent(brand, source, opts));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('repurpose', r)}`);
      break;
    }
    case 'ugc-evaluar': {
      if (!flags['candidatos']) throw new Error('Falta --candidatos=path/to/json');
      const cands = JSON.parse(readFileSync(resolve(flags['candidatos']), 'utf-8')) as UgcCandidate[];
      const decisions = await withSpinner('Evaluando UGC', () => evaluarUgc(brand, cands));
      const records = decisions.filter((d) => d.vale).map((d) => registrarUgc(d));
      const out = { decisions, records };
      console.log(JSON.stringify(out, null, 2));
      log.success(`Guardado en ${saveOutput('ugc-evaluar', out)}`);
      break;
    }
    case 'ugc-permiso': {
      if (!flags['id']) throw new Error('Falta --id=ugc-...');
      const r = await withSpinner('Solicitando permiso', () => solicitarPermiso(flags['id']!));
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'ugc-listar': {
      if (!flags['status']) throw new Error('Falta --status=...');
      const r = listarPorEstado(flags['status'] as PermissionStatus);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'brief': {
      if (!flags['idea'] || !flags['formato']) throw new Error('Faltan --idea --formato');
      const r = await withSpinner('Brief-to-publish', () =>
        briefToPublish(brand, {
          idea: flags['idea']!,
          formato: flags['formato'] as 'reel' | 'carrusel',
          ...(flags['scheduledAt'] ? { scheduledAt: flags['scheduledAt'] } : {}),
          ...(flags['longitudCarrusel']
            ? { longitudCarrusel: flags['longitudCarrusel'] as 'corto' | 'medio' | 'largo' }
            : {}),
          ...(flags['duracionReel'] ? { duracionReel: Number(flags['duracionReel']) as 15 | 20 | 30 | 45 | 60 } : {}),
          requiereAprobacionHumana: flags['requiereAprobacion'] !== 'false',
          ...(flags['handle'] ? { userHandle: flags['handle'] } : {}),
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('brief', r)}`);
      break;
    }
    case 'autopilot': {
      const r = await withSpinner('Autopilot semanal', () =>
        runWeeklyAutopilot(brand, {
          dryRunBrief: flags['dryRunBrief'] !== 'false',
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('autopilot', r)}`);
      break;
    }
    case 'crisis-check': {
      if (!flags['postId'] || !flags['comentarios']) {
        throw new Error('Faltan --postId --comentarios');
      }
      const comentarios = JSON.parse(readFileSync(resolve(flags['comentarios']), 'utf-8')) as string[];
      const r = await withSpinner('Crisis check', () =>
        ejecutarCrisisCheck(brand, { postId: flags['postId']!, comentariosRecientes: comentarios }),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('crisis-check', r)}`);
      break;
    }
    case 'crisis-estado': {
      console.log(JSON.stringify(getCrisisState(), null, 2));
      break;
    }
    case 'crisis-reanudar': {
      const r = reanudarPublicaciones();
      console.log(JSON.stringify(r, null, 2));
      log.success('Publicaciones reanudadas');
      break;
    }
    case 'exp-disenar': {
      if (!flags['contexto']) throw new Error('Falta --contexto="..."');
      const cantidad = flags['cantidad'] ? Number(flags['cantidad']) : 3;
      const r = await withSpinner('Diseñando experimentos', () =>
        diseñarExperimentos(brand, flags['contexto']!, cantidad),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('exp-disenar', r)}`);
      break;
    }
    case 'exp-lanzar': {
      if (!flags['id']) throw new Error('Falta --id=exp-...');
      const r = lanzarExperimento(flags['id']);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'exp-completar': {
      if (!flags['id'] || !flags['metricas']) throw new Error('Faltan --id --metricas');
      const metricas = JSON.parse(readFileSync(resolve(flags['metricas']), 'utf-8')) as Record<string, number>;
      const r = await withSpinner('Cerrando experimento', () => completarExperimento(brand, flags['id']!, metricas));
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'exp-listar': {
      const r = listarExperimentos(flags['status'] as ExperimentStatus | undefined);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'curator-add': {
      if (!flags['tipo'] || !flags['nombre']) throw new Error('Faltan --tipo --nombre');
      const created = addSource({
        tipo: flags['tipo'] as CuratorSource['tipo'],
        nombre: flags['nombre'],
        ...(flags['url'] ? { url: flags['url'] } : {}),
        activo: flags['activo'] !== 'false',
      });
      console.log(JSON.stringify(created, null, 2));
      break;
    }
    case 'curator-listar-sources': {
      console.log(JSON.stringify(loadSources(), null, 2));
      break;
    }
    case 'curator-procesar': {
      const r = await withSpinner('Procesando sources', () => procesarTodasLasSources(brand));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('curator-procesar', r)}`);
      break;
    }
    case 'curator-backlog': {
      type S = import('./capabilities/curator/sources.js').BacklogItem['status'];
      const r = listarBacklog(flags['status'] as S | undefined);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'curator-aprobar': {
      if (!flags['id']) throw new Error('Falta --id=bk-...');
      const r = aprobarItem(flags['id']);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'safety': {
      if (!flags['caption']) throw new Error('Falta --caption="..."');
      const hooks = flags['hooks'] ? flags['hooks'].split('|').map((s) => s.trim()) : [];
      const r = await withSpinner('Auditando contenido', () =>
        auditarPrePublicacion(brand, { caption: flags['caption']!, hooks }),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('safety', r)}`);
      break;
    }
    case 'profile-optimizar': {
      if (!flags['snapshot']) throw new Error('Falta --snapshot=path/to/json');
      const snap = JSON.parse(readFileSync(resolve(flags['snapshot']), 'utf-8')) as ProfileSnapshot;
      const r = await withSpinner('Optimizando perfil', () => optimizarPerfil(brand, snap));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('profile', r)}`);
      break;
    }
    case 'nurture-disenar': {
      if (!flags['trigger']) throw new Error('Falta --trigger=...');
      const pasos = flags['pasos'] ? Number(flags['pasos']) : 4;
      const r = await withSpinner('Diseñando secuencia', () =>
        diseñarSecuencia(brand, flags['trigger'] as SequenceTrigger, pasos),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('nurture-disenar', r)}`);
      break;
    }
    case 'nurture-inscribir': {
      if (!flags['user'] || !flags['trigger']) throw new Error('Faltan --user --trigger');
      const r = inscribirEnSecuencia(flags['user'], flags['trigger'] as SequenceTrigger);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'nurture-ejecutar': {
      const r = await withSpinner('Ejecutando pasos pendientes', () => ejecutarPasosListos());
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'nurture-listar': {
      if (flags['que'] === 'secuencias') {
        console.log(JSON.stringify(listarSecuencias(), null, 2));
      } else {
        type S = import('./capabilities/nurture/sequences.js').SequenceEnrollment['status'];
        console.log(JSON.stringify(listarEnrollments(flags['status'] as S | undefined), null, 2));
      }
      break;
    }
    case 'localizar': {
      if (!flags['contenido'] || !flags['mercados']) {
        throw new Error('Faltan --contenido --mercados (paths a JSON)');
      }
      const contenido = JSON.parse(readFileSync(resolve(flags['contenido']), 'utf-8')) as {
        caption: string;
        hooks: string[];
        cta: string;
      };
      const mercados = JSON.parse(readFileSync(resolve(flags['mercados']), 'utf-8')) as MarketTarget[];
      const r = await withSpinner('Localizando contenido', () => localizarContenido(brand, contenido, mercados));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('localizar', r)}`);
      break;
    }
    case 'digest': {
      const r = flags['soloConstruir']
        ? await withSpinner('Construyendo digest', () => construirDigest(brand))
        : await withSpinner('Enviando digest', () => enviarDigest(brand));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('digest', r)}`);
      break;
    }
    case 'daemon': {
      log.info('Daemon arrancando — Ctrl+C para detener');
      const handle = startDaemon();
      const onSig = (): void => {
        handle.stop();
        process.exit(0);
      };
      process.on('SIGINT', onSig);
      process.on('SIGTERM', onSig);
      await new Promise(() => {});
      break;
    }
    case 'scheduler-listar': {
      console.log(JSON.stringify(listJobs(), null, 2));
      break;
    }
    case 'scheduler-run': {
      if (!flags['job']) throw new Error('Falta --job=<nombre>');
      const r = await withSpinner(`Corriendo ${flags['job']}`, () => runJobByName(flags['job']!, brand));
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'scheduler-runs': {
      const limit = flags['limit'] ? Number(flags['limit']) : 20;
      console.log(JSON.stringify(recentRuns(limit), null, 2));
      break;
    }
    case 'scheduler-start': {
      log.info('Scheduler en foreground (sin HTTP). Ctrl+C para detener.');
      const handle = startScheduler(brand);
      const onSig = (): void => {
        handle.stop();
        process.exit(0);
      };
      process.on('SIGINT', onSig);
      process.on('SIGTERM', onSig);
      await new Promise(() => {});
      break;
    }
    case 'collab-evaluar': {
      if (!flags['observaciones']) throw new Error('Falta --observaciones=path/to/json');
      const obs = JSON.parse(readFileSync(resolve(flags['observaciones']), 'utf-8')) as CreatorObservation[];
      const r = await withSpinner('Evaluando creadores', () => procesarObservaciones(brand, obs));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('collab-evaluar', r)}`);
      break;
    }
    case 'collab-outreach': {
      if (!flags['id']) throw new Error('Falta --id=pro-...');
      const r = await withSpinner('Enviando outreach', () => enviarOutreach(flags['id']!));
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'collab-listar': {
      type S = import('./capabilities/collab/prospects.js').ProspectStatus;
      type CollabModule = typeof import('./capabilities/collab/index.js');
      const mod = (await import('./capabilities/collab/index.js')) as CollabModule;
      console.log(JSON.stringify(mod.listByStatus(flags['status'] as S | undefined), null, 2));
      break;
    }
    case 'arc-disenar': {
      if (!flags['slots']) throw new Error('Falta --slots=path/to/json');
      const slots = JSON.parse(readFileSync(resolve(flags['slots']), 'utf-8')) as ScheduledSlot[];
      const r = await withSpinner('Diseñando arco semanal', () => diseñarArcoSemanal(brand, slots, flags['contexto']));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('arc-disenar', r)}`);
      break;
    }
    case 'plan-semana': {
      if (!flags['ideas']) {
        throw new Error('Falta --ideas="idea1::reel|idea2::carrusel"');
      }
      type Cf = import('./config/types.js').ContentFormat;
      const ideas = flags['ideas'].split('|').map((entry) => {
        const [idea, formato] = entry.split('::');
        return {
          idea: (idea ?? '').trim(),
          formatoSugerido: (formato ?? 'reel').trim() as Cf,
        };
      });
      const r = await withSpinner('Planificando semana', () => planSemana(brand, ideas));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('plan-semana', r)}`);
      break;
    }
    case 'compliance-status': {
      console.log(chalk.bold('\n━━━ ESTADO DE COMPLIANCE ━━━\n'));
      console.log(
        `Términos aceptados: ${env.compliance.acceptedTerms ? chalk.green('SÍ') : chalk.red('NO — Leer TERMS_OF_SERVICE.md')}`,
      );
      console.log(`Modo estricto: ${env.compliance.strictMode ? chalk.yellow('activo') : chalk.gray('inactivo')}`);
      console.log(`DRY_RUN: ${env.dryRun ? chalk.yellow('true (simulación)') : chalk.green('false (producción)')}`);
      console.log(`Reglas cargadas: ${INSTAGRAM_RULES.length}`);
      console.log(`Reglas críticas: ${CRITICAL_RULE_CODES.length}`);
      console.log(`Max diario publicaciones: ${env.compliance.maxDailyPublish}`);
      console.log(`Max diario DMs: ${env.compliance.maxDailyDm}`);
      console.log(`Max diario comentarios: ${env.compliance.maxDailyComments}`);
      console.log(`Retención audit: ${env.compliance.auditRetentionDays} días`);

      if (!env.compliance.acceptedTerms) {
        console.log(chalk.red('\n⚠️  ATENCIÓN: No podés operar en producción hasta aceptar los términos.'));
        console.log(chalk.gray('   Leé TERMS_OF_SERVICE.md y configurá COMPLIANCE_ACCEPTED_TERMS=true'));
      }
      break;
    }
    case 'compliance-rules': {
      console.log(chalk.bold('\n━━━ REGLAS DE INSTAGRAM IMPLEMENTADAS ━━━\n'));
      const categories = ['automatizacion', 'contenido', 'interaccion', 'datos', 'cuenta', 'tecnica'] as const;
      for (const cat of categories) {
        const rules = getRulesByCategory(cat);
        console.log(chalk.bold(`\n[${cat.toUpperCase()}]`));
        for (const r of rules) {
          const color = r.severity === 'critica' ? chalk.red : r.severity === 'alta' ? chalk.yellow : chalk.gray;
          console.log(
            `  ${color(`[${r.code}]`)} ${r.description.slice(0, 100)}${r.description.length > 100 ? '...' : ''}`,
          );
        }
      }
      break;
    }
    case 'compliance-audit': {
      const limit = flags['limit'] ? Number(flags['limit']) : 20;
      const auditDir = resolve('data/runtime/audit');
      const todayFile = resolve(auditDir, `audit-${new Date().toISOString().slice(0, 10)}.ndjson`);
      if (!existsSync(todayFile)) {
        console.log(chalk.gray('No hay entradas de audit log para hoy.'));
        break;
      }
      const lines = fsReadFileSync(todayFile, 'utf-8').split('\n').filter(Boolean);
      const entries = lines.slice(-limit).map((l) => JSON.parse(l));
      console.log(chalk.bold(`\n━━━ ÚLTIMAS ${entries.length} ENTRADAS DE AUDIT ━━━\n`));
      for (const e of entries) {
        const color =
          e.outcome === 'blocked'
            ? chalk.red
            : e.outcome === 'failure'
              ? chalk.yellow
              : e.outcome === 'dry_run'
                ? chalk.gray
                : chalk.green;
        console.log(
          `${color(e.outcome.toUpperCase().padEnd(8))} | ${e.action.padEnd(18)} | ${e.timestamp.slice(11, 19)} | ${e.reason ? e.reason.slice(0, 50) : (e.contentSummary?.slice(0, 50) ?? '')}`,
        );
      }
      break;
    }
    case 'compliance-rate-limits': {
      const stats = getRateLimitStats();
      console.log(chalk.bold('\n━━━ RATE LIMITS ACTUALES ━━━\n'));
      const entries = Object.entries(stats);
      if (entries.length === 0) {
        console.log(chalk.gray('Sin actividad registrada aún.'));
      } else {
        for (const [key, s] of entries) {
          const pct = Math.round((s.count / s.limit) * 100);
          const color = pct > 80 ? chalk.red : pct > 50 ? chalk.yellow : chalk.green;
          console.log(`${key.padEnd(40)} | ${color(`${s.count}/${s.limit}`)} (${pct}%) | reset: ${s.resetsIn}`);
        }
      }
      break;
    }
    case 'compliance-check': {
      if (!flags['texto']) throw new Error('Falta --texto="..."');
      const texto = flags['texto'];
      const ctx: GuardianContext = {
        actor: 'cli:compliance-check',
        contentText: texto,
        humanInitiated: true,
      };
      const decision = evaluate('publish', ctx);
      console.log(chalk.bold('\n━━━ RESULTADO DEL CHECK ━━━\n'));
      console.log(`Permitido: ${decision.allowed ? chalk.green('SÍ') : chalk.red('NO')}`);
      if (decision.reason) console.log(`Razón: ${chalk.yellow(decision.reason)}`);
      console.log(`Score de riesgo: ${decision.riskScore}/100`);
      if (decision.violatedRules.length > 0) {
        console.log(chalk.red('\nReglas violadas:'));
        for (const r of decision.violatedRules) {
          console.log(`  • [${r.code}] ${r.severity.toUpperCase()}: ${r.description}`);
        }
      }
      if (decision.recommendations.length > 0) {
        console.log(chalk.cyan('\nRecomendaciones:'));
        for (const rec of decision.recommendations) {
          console.log(`  → ${rec}`);
        }
      }
      break;
    }
    case 'preflight': {
      const report = await runPreFlightCheck();
      console.log(chalk.bold('\n━━━ PRE-FLIGHT CHECK ━━━\n'));
      const statusColor =
        report.overallStatus === 'PASS' ? chalk.green : report.overallStatus === 'WARNING' ? chalk.yellow : chalk.red;
      console.log(`Estado general: ${statusColor(report.overallStatus)}`);
      console.log(
        `Checks: ${chalk.green(report.passed.toString())} OK | ${chalk.yellow(report.warnings.toString())} WARN | ${chalk.red(report.failed.toString())} FAIL\n`,
      );
      for (const check of report.checks) {
        const color = check.status === 'PASS' ? chalk.green : check.status === 'WARNING' ? chalk.yellow : chalk.red;
        console.log(`${color(`[${check.status}]`)} ${check.name}`);
        console.log(`      ${check.message}`);
        if (check.detail) console.log(`      ${chalk.gray(check.detail)}`);
      }
      const fp = saveOutput('preflight', report);
      log.success(`Reporte guardado en ${fp}`);
      if (report.overallStatus === 'FAIL') {
        log.error('Pre-flight FALLÓ — No operar en producción hasta resolver los errores.');
        process.exit(1);
      }
      break;
    }
    case 'health-check': {
      const health = await runHealthChecks();
      console.log(chalk.bold('\n━━━ HEALTH CHECK ━━━\n'));
      const statusColor =
        health.overallStatus === 'healthy'
          ? chalk.green
          : health.overallStatus === 'degraded'
            ? chalk.yellow
            : chalk.red;
      console.log(`Estado general: ${statusColor(health.overallStatus.toUpperCase())}\n`);
      for (const check of health.checks) {
        const color = check.status === 'healthy' ? chalk.green : check.status === 'degraded' ? chalk.yellow : chalk.red;
        console.log(`${color(`[${check.status.toUpperCase()}]`)} ${check.name}`);
        console.log(`      ${check.message}`);
        if (check.detail) console.log(`      ${chalk.gray(check.detail)}`);
      }
      const fp2 = saveOutput('health-check', health);
      log.success(`Reporte guardado en ${fp2}`);
      break;
    }
    case 'emergency-stop': {
      if (!flags['razon']) throw new Error('Falta --razon="..."');
      const state = await emergencyStop({ reason: flags['razon']!, initiatedBy: 'cli' });
      console.log(chalk.bold.red('\n━━━ EMERGENCY STOP ACTIVADO ━━━\n'));
      console.log(`Razón: ${state.reason}`);
      console.log(`Timestamp: ${state.triggeredAt}`);
      console.log(`Acciones tomadas: ${state.actionsTaken.join(', ')}`);
      console.log(chalk.red('\n🚨 TODAS las operaciones están pausadas.'));
      break;
    }
    case 'emergency-resume': {
      if (!flags['resolucion']) throw new Error('Falta --resolucion="..."');
      const state = await resumeOperations({ resumedBy: 'cli', resolution: flags['resolucion']! });
      console.log(chalk.bold.green('\n━━━ OPERACIONES REANUDADAS ━━━\n'));
      console.log(`Resolución: ${state.reason}`);
      console.log(chalk.green('\n✅ El sistema puede operar nuevamente.'));
      break;
    }
    case 'auditoria-semanal': {
      const report = await withSpinner('Auditoría semanal', () => runWeeklyAudit());
      console.log(JSON.stringify(report, null, 2));
      log.success(`Guardado en ${saveOutput('auditoria-semanal', report)}`);
      break;
    }
    case 'auditoria-mensual': {
      const report = await withSpinner('Auditoría mensual', () => runMonthlyAudit());
      console.log(JSON.stringify(report, null, 2));
      log.success(`Guardado en ${saveOutput('auditoria-mensual', report)}`);
      break;
    }
    case 'auditoria-trimestral': {
      const report = await withSpinner('Auditoría trimestral', () => runQuarterlyAudit());
      console.log(JSON.stringify(report, null, 2));
      log.success(`Guardado en ${saveOutput('auditoria-trimestral', report)}`);
      break;
    }
    case 'backup-crear': {
      if (!flags['razon']) throw new Error('Falta --razon="..."');
      const backup = await withSpinner('Creando backup', () => createBackup({ reason: flags['razon']! }));
      console.log(JSON.stringify(backup, null, 2));
      log.success(`Backup creado: ${backup.id}`);
      break;
    }
    case 'backup-listar': {
      const backups = listBackups();
      console.log(chalk.bold(`\n━━━ BACKUPS (${backups.length}) ━━━\n`));
      for (const b of backups) {
        const size =
          b.sizeBytes < 1024 * 1024
            ? `${(b.sizeBytes / 1024).toFixed(1)} KB`
            : `${(b.sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
        console.log(`${b.id.slice(0, 40).padEnd(42)} | ${b.timestamp.slice(0, 10)} | ${size} | ${b.fileCount} files`);
      }
      break;
    }
    case 'backup-restaurar': {
      if (!flags['id']) throw new Error('Falta --id=backup-...');
      log.warn(`🚨 Esto SOBREESCRIBIRÁ datos actuales`);
      await withSpinner('Restaurando', () => restoreBackup(flags['id']!));
      log.success(`Backup ${flags['id']} restaurado.`);
      break;
    }
    case 'backup-purgar': {
      const deleted = purgeOldBackups();
      console.log(chalk.green(`${deleted} backups antiguos eliminados.`));
      break;
    }
    case 'disaster-recovery': {
      const recovery = await withSpinner('Disaster recovery', () => runDisasterRecovery());
      console.log(JSON.stringify(recovery, null, 2));
      log.success(recovery.success ? 'Recovery exitoso' : 'Recovery con problemas');
      break;
    }
    case 'reporte-cliente': {
      if (!flags['cliente'] || !flags['desde']) throw new Error('Faltan --cliente y --desde');
      const report = await withSpinner('Generando reporte', () =>
        generateClientReport({ clientName: flags['cliente']!, since: flags['desde']! }),
      );
      console.log(JSON.stringify(report, null, 2));
      log.success(`Guardado en ${saveOutput('reporte-cliente', report)}`);
      break;
    }
    case 'version-track': {
      if (!flags['id'] || !flags['caption']) throw new Error('Faltan --id y --caption');
      const version = trackVersion({
        contentId: flags['id']!,
        caption: flags['caption']!,
        hashtags: flags['hashtags'] ? flags['hashtags'].split('|') : [],
        riskScore: Number(flags['score'] ?? 0),
        status: (flags['status'] as 'draft' | 'approved' | 'rejected' | 'published' | 'blocked') ?? 'draft',
        changes: flags['cambios'] ? flags['cambios'].split('|') : [],
      });
      console.log(JSON.stringify(version, null, 2));
      break;
    }
    case 'version-listar': {
      if (!flags['id']) throw new Error('Falta --id');
      const history = getVersions(flags['id']!);
      console.log(JSON.stringify(history, null, 2));
      break;
    }
    case 'version-aprobar': {
      if (!flags['id'] || !flags['version'] || !flags['aprobador'])
        throw new Error('Faltan --id --version --aprobador');
      const ok = approveVersion(flags['id']!, Number(flags['version']), flags['aprobador']!);
      console.log(ok ? 'Versión aprobada.' : 'Versión no encontrada.');
      break;
    }
    case 'version-rechazar': {
      if (!flags['id'] || !flags['version'] || !flags['razon']) throw new Error('Faltan --id --version --razon');
      const ok = rejectVersion(flags['id']!, Number(flags['version']), flags['razon']!);
      console.log(ok ? 'Versión rechazada.' : 'Versión no encontrada.');
      break;
    }
    case 'version-comparar': {
      if (!flags['id'] || !flags['v1'] || !flags['v2']) throw new Error('Faltan --id --v1 --v2');
      const diff = compareVersions(flags['id']!, Number(flags['v1']), Number(flags['v2']));
      console.log(JSON.stringify(diff, null, 2));
      break;
    }
    case 'webhook-stats': {
      const stats = getMonitoringStats();
      console.log(chalk.bold('\n━━━ MONITOREO WEBHOOK / API ━━━\n'));
      console.log(`Webhooks (última hora):`);
      console.log(
        `  Total: ${stats.webhooks.totalRecent} | Fallidos: ${stats.webhooks.failedRecent} | Firmas inválidas: ${stats.webhooks.invalidSignatures}`,
      );
      console.log(
        `  Tiempo promedio: ${stats.webhooks.avgProcessingTime}ms | Saludable: ${stats.webhooks.healthy ? 'SÍ' : 'NO'}`,
      );
      console.log(`\nAPI (última hora):`);
      console.log(
        `  Total: ${stats.api.totalRecent} | Fallidos: ${stats.api.failedRecent} | Rate limits: ${stats.api.rateLimitHits}`,
      );
      console.log(`  Tiempo promedio: ${stats.api.avgResponseTime}ms | Saludable: ${stats.api.healthy ? 'SÍ' : 'NO'}`);
      console.log(`\nEstado general: ${stats.overallHealthy ? chalk.green('SALUDABLE') : chalk.red('DEGRADADO')}`);
      break;
    }
    case 'playbook': {
      if (!flags['name']) throw new Error('Falta --name=...');
      const pb = getPlaybook(flags['name']);
      if (!pb)
        throw new Error(
          `Playbook ${flags['name']} no encontrado. Disponibles: ${listPlaybooks()
            .map((p) => p.id)
            .join(', ')}`,
        );
      if (flags['param']) {
        pb.tasks[0]!.goal += ` | Contexto: ${flags['param']}`;
      }
      const r = await withSpinner(`Ejecutando playbook ${pb.name}`, () => runPlaybook(brand, pb));
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('playbook', r)}`);
      break;
    }
    case 'playbook-listar': {
      const builtIn = listPlaybooks().map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: 'built-in',
      }));
      const custom = listCustomPlaybooks().map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        type: 'custom',
        version: p.version,
      }));
      console.log(JSON.stringify([...builtIn, ...custom], null, 2));
      break;
    }
    case 'playbook-personalizado-crear': {
      if (!flags['file']) throw new Error('Falta --file=...');
      const raw = JSON.parse(readFileSync(flags['file'], 'utf-8'));
      const validated = validatePlaybookJSON(raw);
      if (!validated.ok) {
        console.error(chalk.red('❌ Playbook inválido:'));
        validated.errors.forEach((e) => console.error(`  - ${e}`));
        process.exit(1);
      }
      saveCustomPlaybook(validated.data);
      console.log(chalk.green(`✅ Playbook personalizado guardado: ${validated.data.id}`));
      break;
    }
    case 'playbook-personalizado-listar': {
      const pbs = listCustomPlaybooks();
      console.log(
        JSON.stringify(
          pbs.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            version: p.version,
            tags: p.tags,
            tasks: p.tasks.length,
          })),
          null,
          2,
        ),
      );
      break;
    }
    case 'playbook-personalizado-ejecutar': {
      if (!flags['id']) throw new Error('Falta --id=...');
      const pb = getCustomPlaybook(flags['id']);
      if (!pb) throw new Error(`Playbook ${flags['id']} no encontrado. Usa playbook-personalizado-listar.`);
      const r = await withSpinner(`Ejecutando playbook personalizado ${pb.name}`, () =>
        runCustomPlaybook(brand, pb, (taskId, status, output) => {
          const icon = status === 'running' ? '⏳' : status === 'done' ? '✅' : '❌';
          console.log(`${icon} [${taskId}] ${status}${output ? ': ' + output.slice(0, 120) : ''}`);
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'playbook-personalizado-eliminar': {
      if (!flags['id']) throw new Error('Falta --id=...');
      const ok = deleteCustomPlaybook(flags['id']);
      if (!ok) throw new Error(`Playbook ${flags['id']} no encontrado.`);
      console.log(chalk.green(`🗑️ Playbook ${flags['id']} eliminado.`));
      break;
    }
    case 'ig-publish': {
      if (!flags['file'] || !flags['caption']) throw new Error('Faltan --file y --caption');
      const { publishToInstagramViaRouter } = await import('./browserOperators/instagram/publishRouter.js');
      const format = (flags['format'] ?? 'post') as 'post' | 'reel' | 'story' | 'carousel';
      const mediaPaths = flags['file']!.split(',');
      const r = await withSpinner(`Publicando ${format} en Instagram`, () =>
        publishToInstagramViaRouter(brand, {
          format,
          mediaPaths,
          caption: flags['caption']!,
          hashtags: flags['hashtags'] ? flags['hashtags'].split(',') : [],
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'ig-publish-via': {
      if (!flags['file'] || !flags['caption'] || !flags['via']) throw new Error('Faltan --file, --caption o --via');
      const { publishToInstagramViaRouter } = await import('./browserOperators/instagram/publishRouter.js');
      const r = await withSpinner(`Publicando vía ${flags['via']}`, () =>
        publishToInstagramViaRouter(
          brand,
          {
            format: (flags['format'] ?? 'post') as 'post' | 'reel' | 'story' | 'carousel',
            mediaPaths: flags['file']!.split(','),
            caption: flags['caption']!,
          },
          flags['via'] as 'api' | 'web' | 'app',
        ),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'ig-health': {
      const { checkPublishHealth } = await import('./browserOperators/instagram/publishRouter.js');
      const health = await checkPublishHealth(brand);
      console.log(JSON.stringify(health, null, 2));
      break;
    }
    case 'browser-navigate': {
      if (!flags['url']) throw new Error('Falta --url');
      const { InstagramWebOperator } = await import('./browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: false, dryRun: env.dryRun });
      await op.navigate(flags['url']);
      const screenshot = await op.screenshot('navigate');
      await op.closeSession();
      console.log(JSON.stringify({ ok: true, url: flags['url'], screenshot }, null, 2));
      break;
    }
    case 'browser-health': {
      const { InstagramWebOperator } = await import('./browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: false, dryRun: true });
      const health = await op.healthCheck();
      await op.closeSession();
      console.log(JSON.stringify(health, null, 2));
      break;
    }
    case 'canva-create': {
      const { CanvaWebOperator } = await import('./browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: env.dryRun });
      const r = await withSpinner('Creando diseño en Canva', () =>
        op.createDesign({
          format: flags['format'] as
            | 'instagram-post'
            | 'instagram-story'
            | 'instagram-reel'
            | 'presentation'
            | 'custom'
            | undefined,
          templateQuery: flags['template'] as string | undefined,
        }),
      );
      await op.closeSession();
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'canva-export': {
      const { CanvaWebOperator } = await import('./browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: env.dryRun });
      const r = await withSpinner('Exportando diseño de Canva', () =>
        op.exportDesign({
          format: (flags['format'] ?? 'png') as 'png' | 'jpg' | 'pdf' | 'mp4',
        }),
      );
      await op.closeSession();
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'capcut-create': {
      const { CapCutWebOperator } = await import('./browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: env.dryRun });
      const r = await withSpinner('Creando proyecto en CapCut', () =>
        op.createProject({
          aspectRatio: (flags['aspectRatio'] ?? '9:16') as '9:16' | '16:9' | '1:1' | '4:5',
        }),
      );
      await op.closeSession();
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'capcut-export': {
      const { CapCutWebOperator } = await import('./browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: env.dryRun });
      const r = await withSpinner('Exportando video de CapCut', () =>
        op.exportVideo({
          quality: (flags['quality'] ?? '1080p') as '720p' | '1080p' | '4k',
          format: 'mp4',
        }),
      );
      await op.closeSession();
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'runway-generate': {
      if (!flags['prompt']) throw new Error('Falta --prompt');
      const { generateVideoWithRunway } = await import('./browserOperators/runway/runwayApi.js');
      const r = await withSpinner('Generando video con Runway', () =>
        generateVideoWithRunway({
          prompt: flags['prompt']!,
          duration: (Number(flags['duration']) ?? 5) as 5 | 10,
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'heygen-create': {
      if (!flags['script']) throw new Error('Falta --script');
      const { createAvatarVideo } = await import('./browserOperators/heygen/heygenApi.js');
      const r = await withSpinner('Creando video con HeyGen avatar', () =>
        createAvatarVideo({
          script: flags['script']!,
          avatarId: flags['avatarId'] as string | undefined,
          voiceId: flags['voiceId'] as string | undefined,
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'brandkit-listar': {
      const { listAssets } = await import('./capabilities/brandkit/index.js');
      const assets = listAssets(
        brand.name,
        flags['type'] as import('./capabilities/brandkit/types.js').BrandKitAssetType,
      );
      console.log(JSON.stringify(assets, null, 2));
      break;
    }
    case 'brandkit-agregar': {
      const { addAsset } = await import('./capabilities/brandkit/index.js');
      if (!flags['type'] || !flags['name'] || !flags['url']) throw new Error('Faltan --type, --name o --url');
      const asset = addAsset(brand.name, {
        type: flags['type'] as import('./capabilities/brandkit/types.js').BrandKitAssetType,
        name: flags['name']!,
        url: flags['url']!,
        usageRules: (flags['rules']?.split(',') as string[]) ?? [],
      });
      console.log(JSON.stringify(asset, null, 2));
      break;
    }
    case 'brandkit-validar': {
      const { validateAssetAgainstBrand, listAssets } = await import('./capabilities/brandkit/index.js');
      if (!flags['id']) throw new Error('Falta --id');
      const asset = listAssets(brand.name).find((a) => a.id === flags['id']);
      if (!asset) throw new Error(`Asset ${flags['id']} no encontrado`);
      const result = validateAssetAgainstBrand(asset, brand);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'brand-consistency-check': {
      const { runBrandConsistencyCheck, ensureBrandKit } = await import('./capabilities/brandkit/index.js');
      const kit = ensureBrandKit(brand.name);
      const result = runBrandConsistencyCheck(
        {
          title: flags['title'] ?? 'Sin título',
          format: (flags['format'] as 'reel' | 'carrusel' | 'post-imagen' | 'historia') ?? 'post-imagen',
          description: flags['description'] ?? '',
          colorsUsed: (flags['colors']?.split(',') as string[]) ?? [],
          fontsUsed: (flags['fonts']?.split(',') as string[]) ?? [],
          iconography: (flags['icons']?.split(',') as string[]) ?? [],
        },
        brand,
        kit,
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'brand-strategy': {
      const { ensureBrandStrategy, formatBrandStrategyContext } = await import('./capabilities/branding/index.js');
      const strategy = ensureBrandStrategy(brand.name);
      console.log(formatBrandStrategyContext(strategy));
      break;
    }
    case 'brand-rules-listar': {
      const { getRulesByCategory } = await import('./capabilities/branding/index.js');
      const rules = getRulesByCategory((flags['category'] as string) ?? '');
      console.log(
        JSON.stringify(
          rules.map((r) => ({ id: r.id, category: r.category, severity: r.severity, description: r.description })),
          null,
          2,
        ),
      );
      break;
    }
    case 'brand-rules-evaluar': {
      const { evaluateBrandRules, generateBrandRuleReport, ensureBrandStrategy } =
        await import('./capabilities/branding/index.js');
      const strategy = ensureBrandStrategy(brand.name);
      const result = evaluateBrandRules(
        {
          title: flags['title'] ?? 'Sin título',
          format: (flags['format'] as import('./config/types.js').ContentFormat) ?? 'post-imagen',
          description: flags['description'] ?? '',
          caption: flags['caption'] ?? '',
          colorsUsed: (flags['colors']?.split(',') as string[]) ?? [],
          fontsUsed: (flags['fonts']?.split(',') as string[]) ?? [],
          iconography: (flags['icons']?.split(',') as string[]) ?? [],
        },
        undefined,
        undefined,
        brand,
        strategy,
      );
      console.log(generateBrandRuleReport(result));
      console.log(
        '\n' + JSON.stringify({ passed: result.passed, score: result.score, threshold: result.threshold }, null, 2),
      );
      break;
    }
    case 'brand-health': {
      const { ensureBrandStrategy } = await import('./capabilities/branding/index.js');
      const { ensureBrandKit } = await import('./capabilities/brandkit/index.js');
      const { ALL_BRAND_RULES } = await import('./capabilities/branding/brandRules.js');
      const strategy = ensureBrandStrategy(brand.name);
      const kit = ensureBrandKit(brand.name);
      const report = {
        brandName: brand.name,
        strategyCompleteness: {
          vision: strategy.vision ? '✅' : '❌',
          mission: strategy.mission ? '✅' : '❌',
          values: strategy.values.length > 0 ? '✅' : '❌',
          promise: strategy.promise ? '✅' : '❌',
          positioning: strategy.positioning ? '✅' : '❌',
          story: strategy.story ? '✅' : '❌',
          personality: strategy.personality.length > 0 ? '✅' : '❌',
          archetype: strategy.archetype ? '✅' : '❌',
          differentiators: strategy.differentiators.length > 0 ? '✅' : '❌',
        },
        brandKit: {
          totalAssets: kit.assets.length,
          logos: kit.assets.filter((a: { type: string }) => a.type === 'logo').length,
          avatars: kit.assets.filter((a: { type: string }) => a.type === 'avatar').length,
          highlights: kit.assets.filter((a: { type: string }) => a.type === 'highlight-cover').length,
          watermarks: kit.assets.filter((a: { type: string }) => a.type === 'watermark').length,
        },
        rules: {
          total: ALL_BRAND_RULES.length,
          byCategory: {
            visual: ALL_BRAND_RULES.filter((r: { category: string }) => r.category === 'visual').length,
            voice: ALL_BRAND_RULES.filter((r: { category: string }) => r.category === 'voice').length,
            strategy: ALL_BRAND_RULES.filter((r: { category: string }) => r.category === 'strategy').length,
            experience: ALL_BRAND_RULES.filter((r: { category: string }) => r.category === 'experience').length,
            assetUsage: ALL_BRAND_RULES.filter((r: { category: string }) => r.category === 'asset-usage').length,
          },
        },
      };
      console.log(JSON.stringify(report, null, 2));
      break;
    }
    case 'checkpoint-listar': {
      const r = listCheckpoints(flags['status'] as never);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'checkpoint-aprobar': {
      if (!flags['id']) throw new Error('Falta --id=cp-...');
      const r = approveCheckpoint(flags['id'], flags['note']);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'checkpoint-rechazar': {
      if (!flags['id']) throw new Error('Falta --id=cp-...');
      const r = rejectCheckpoint(flags['id'], flags['note']);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'agent-listar': {
      let agents = listAgents();
      if (flags['niche']) {
        agents = getNicheAgentsByNiche(flags['niche']!);
      }
      if (flags['function']) {
        agents = getNicheAgentsByFunction(flags['function']!);
      }
      console.log(
        JSON.stringify(
          agents.map((a) => ({
            id: a.id,
            name: a.name,
            emoji: a.emoji,
            autonomyLevel: a.autonomyLevel,
            specialties: a.specialties,
            tagline: a.tagline,
          })),
          null,
          2,
        ),
      );
      break;
    }
    case 'agent-info': {
      if (!flags['id']) throw new Error('Falta --id');
      const agent = getAgent(flags['id']!);
      if (!agent) throw new Error(`Agente ${flags['id']} no encontrado`);
      console.log(
        JSON.stringify(
          {
            id: agent.id,
            name: agent.name,
            emoji: agent.emoji,
            tagline: agent.tagline,
            description: agent.description,
            specialties: agent.specialties,
            autonomyLevel: agent.autonomyLevel,
            humanCheckpoints: agent.humanCheckpoints,
            tools: agent.toolNames,
            maxIterations: agent.maxIterations,
            preferFastModel: agent.preferFastModel,
          },
          null,
          2,
        ),
      );
      break;
    }
    case 'nicho-listar': {
      console.log(
        JSON.stringify(
          NICHE_KNOWLEDGE.map((n) => ({
            id: n.id,
            name: n.name,
            emoji: n.emoji,
            description: n.description,
            audienceType: n.audienceType,
            bestFormats: n.bestFormats,
            benchmarks: n.benchmarks,
          })),
          null,
          2,
        ),
      );
      break;
    }
    case 'agent-ejecutar': {
      if (!flags['id'] || !flags['goal']) throw new Error('Faltan --id y --goal');
      const agent = getAgent(flags['id']);
      if (!agent) throw new Error(`Agente ${flags['id']} no encontrado`);
      const { runAgentTask } = await import('./agent/orchestrator.js');
      const r = await withSpinner(`Ejecutando ${agent.name}`, () =>
        runAgentTask(brand, agent, flags['goal']!, `cli-${Date.now()}`),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('agent-ejecutar', r)}`);
      break;
    }
    case 'comment-to-dm-listar': {
      console.log(JSON.stringify(listCommentToDmRules(), null, 2));
      break;
    }
    case 'comment-to-dm-crear': {
      if (!flags['keyword'] || !flags['message']) throw new Error('Faltan --keyword y --message');
      const r = addCommentToDmRule({
        keyword: flags['keyword']!,
        dmMessage: flags['message']!,
        active: flags['active'] !== 'false',
        cooldownHours: flags['cooldown'] ? Number(flags['cooldown']) : 24,
        maxDmsPerDay: flags['maxPerDay'] ? Number(flags['maxPerDay']) : 100,
      });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'comment-to-dm-activar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateCommentToDmRule(flags['id']!, { active: true });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'comment-to-dm-desactivar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateCommentToDmRule(flags['id']!, { active: false });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'comment-to-dm-stats': {
      console.log(JSON.stringify(getCommentToDmStats(), null, 2));
      break;
    }
    case 'dm-trigger-listar': {
      console.log(JSON.stringify(listDmTriggers(), null, 2));
      break;
    }
    case 'dm-trigger-crear': {
      if (!flags['keywords'] || !flags['action']) throw new Error('Faltan --keywords y --action');
      const r = addDmTrigger({
        keywords: flags['keywords']!.split(',').map((k) => k.trim()),
        action: flags['action'] as never,
        replyMessage: flags['message'],
        nurtureTrigger: flags['nurtureTrigger'],
        active: flags['active'] !== 'false',
        cooldownHours: flags['cooldown'] ? Number(flags['cooldown']) : 24,
        maxActivationsPerDay: flags['maxPerDay'] ? Number(flags['maxPerDay']) : 100,
      });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'dm-trigger-activar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateDmTrigger(flags['id']!, { active: true });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'dm-trigger-desactivar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateDmTrigger(flags['id']!, { active: false });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'dm-trigger-stats': {
      console.log(JSON.stringify(getDmTriggerStats(), null, 2));
      break;
    }
    case 'smart-first-comment-listar': {
      console.log(JSON.stringify(listFirstCommentTemplates(), null, 2));
      break;
    }
    case 'smart-first-comment-crear': {
      if (!flags['messages']) throw new Error('Falta --messages="msg1|msg2|msg3"');
      const r = addFirstCommentTemplate({
        contentTypes: (flags['types'] ?? 'all').split(',').map((t: string) => t.trim()) as never,
        messages: flags['messages']!.split('|').map((m: string) => m.trim()),
        active: flags['active'] !== 'false',
        rotateMode: (flags['rotate'] ?? 'sequential') as 'sequential' | 'random',
      });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'smart-first-comment-activar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateFirstCommentTemplate(flags['id']!, { active: true });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'smart-first-comment-desactivar': {
      if (!flags['id']) throw new Error('Falta --id');
      const r = updateFirstCommentTemplate(flags['id']!, { active: false });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'smart-first-comment-stats': {
      console.log(JSON.stringify(getFirstCommentStats(), null, 2));
      break;
    }
    case 'lead-listar': {
      const r = getLeads(flags['stage'] as PipelineStage | undefined);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'lead-agregar': {
      if (!flags['handle']) throw new Error('Falta --handle');
      const r = addOrUpdateLead(flags['handle']!, {
        source: flags['source'] ?? 'manual',
        stage: (flags['stage'] as PipelineStage) ?? 'nuevo',
        score: flags['score'] ? Number(flags['score']) : undefined,
        expectedValue: flags['value'] ? Number(flags['value']) : undefined,
        notes: flags['note'] ? [flags['note']] : undefined,
      });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'lead-mover': {
      if (!flags['id'] || !flags['stage']) throw new Error('Faltan --id y --stage');
      const r = moveLead(flags['id']!, flags['stage'] as PipelineStage, flags['note']);
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'lead-pipeline': {
      console.log(JSON.stringify(getPipelineStats(), null, 2));
      break;
    }
    case 'attribution-content': {
      if (!flags['contentId']) throw new Error('Falta --contentId');
      console.log(JSON.stringify(getAttributionByContent(flags['contentId']!), null, 2));
      break;
    }
    case 'attribution-top': {
      console.log(JSON.stringify(getTopPerformingContent(flags['limit'] ? Number(flags['limit']) : 10), null, 2));
      break;
    }
    case 'attribution-stats': {
      console.log(JSON.stringify(getAttributionStats(), null, 2));
      break;
    }
    case 'studio-render': {
      if (!flags['engine'] || !flags['format'] || !flags['title']) {
        throw new Error('Faltan --engine --format --title');
      }
      const runner = getDefaultRunner();
      const engine = runner.getEngine(flags['engine']!);
      if (!engine) throw new Error(`Engine ${flags['engine']} no encontrado`);
      const render = await withSpinner(`Renderizando con ${flags['engine']}`, () =>
        engine!.render({
          id: `cli-${Date.now()}`,
          format: flags['format'] as 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf' | 'svg' | 'webp',
          title: flags['title']!,
          brandProfileId: brand.name,
          assets: [],
          fields: flags['fields'] ? JSON.parse(flags['fields']) : {},
          options: flags['options'] ? JSON.parse(flags['options']) : {},
          userHandle: flags['handle'],
        }),
      );
      console.log(JSON.stringify(render, null, 2));
      break;
    }
    case 'recipe-list': {
      console.log(JSON.stringify(listRecipes(), null, 2));
      break;
    }
    case 'recipe-run': {
      if (!flags['id'] || !flags['idea']) throw new Error('Faltan --id --idea');
      const r = await withSpinner(`Ejecutando receta ${flags['id']}`, () =>
        runRecipe(brand, flags['id'] as import('./capabilities/recipes/index.js').RecipeId, {
          idea: flags['idea']!,
          extraParams: flags['params'] ? JSON.parse(flags['params']) : {},
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      log.success(`Guardado en ${saveOutput('recipe-run', r)}`);
      break;
    }
    case 'aesthetic-score': {
      if (!flags['description']) throw new Error('Falta --description');
      const r = scoreAesthetic(brand, {
        title: flags['title'] ?? 'Propuesta',
        format: (flags['format'] as string) ?? 'post-imagen',
        colorsUsed: flags['colors'] ? flags['colors'].split(',').map((c: string) => c.trim()) : brand.visual.palette,
        fontsUsed: flags['fonts'] ? flags['fonts'].split(',').map((f: string) => f.trim()) : brand.visual.typography,
        textBlocks: flags['textBlocks'] ? Number(flags['textBlocks']) : 3,
        imageBlocks: flags['imageBlocks'] ? Number(flags['imageBlocks']) : 1,
        densityEstimate: (flags['density'] as 'low' | 'medium' | 'high') ?? 'medium',
        description: flags['description']!,
      });
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'ethical-check': {
      if (!flags['caption']) throw new Error('Falta --caption');
      const hooks = flags['hooks'] ? flags['hooks'].split('|').map((h: string) => h.trim()) : [];
      const receptor = auditReceptorResponsibility(brand, flags['caption']!, hooks);
      const commonSense = flags['texto'] ? validateCommonSense(flags['texto']!) : null;
      const out = { receptor, commonSense, overallPass: receptor.passes && (commonSense?.passes ?? true) };
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'asset-generate': {
      if (!flags['prompt'] || !flags['aspectRatio']) throw new Error('Faltan --prompt --aspectRatio');
      const { generateImage } = await import('./integrations/imageGen.js');
      const r = await withSpinner('Generando imagen', () =>
        generateImage({
          prompt: flags['prompt']!,
          aspectRatio: flags['aspectRatio'] as '1:1' | '4:5' | '9:16' | '16:9',
          count: flags['count'] ? Number(flags['count']) : 1,
          style: flags['style'],
        }),
      );
      console.log(JSON.stringify(r, null, 2));
      break;
    }
    case 'glassbox-modo': {
      const modo = flags['modo'] as string | undefined;
      if (!modo || !['autonomous', 'supervised', 'paused'].includes(modo)) {
        throw new Error('Falta --modo=autonomous|supervised|paused');
      }
      setMode(modo as 'autonomous' | 'supervised' | 'paused');
      console.log(chalk.green(`✅ GlassBox modo: ${getMode()}`));
      break;
    }
    case 'glassbox-pausar': {
      pause();
      console.log(chalk.yellow('⏸️ GlassBox pausado. Las acciones se encolarán.'));
      break;
    }
    case 'glassbox-reanudar': {
      resume();
      console.log(chalk.green('▶️ GlassBox reanudado en modo supervisado.'));
      break;
    }
    case 'glassbox-estado': {
      const s = getStatus();
      console.log(chalk.cyan('\n━━━ GLASSBOX ESTADO ━━━'));
      console.log(`Modo: ${chalk.bold(s.mode)}`);
      console.log(`Pendientes: ${s.pendingCount}`);
      console.log(`Historial: ${s.historyCount}`);
      if (s.recentActions.length) {
        console.log('\nÚltimas acciones:');
        for (const a of s.recentActions) {
          const color =
            a.status === 'completed'
              ? chalk.green
              : a.status === 'failed'
                ? chalk.red
                : a.status === 'rejected'
                  ? chalk.yellow
                  : chalk.blue;
          console.log(`  ${color(`[${a.status}]`)} ${a.actionType} — ${a.description.slice(0, 60)}`);
        }
      }
      break;
    }
    case 'glassbox-cola': {
      const pendientes = getPendingActions();
      console.log(chalk.cyan(`\n━━━ ACCIONES PENDIENTES (${pendientes.length}) ━━━`));
      for (const a of pendientes) {
        console.log(`  ${chalk.blue(a.id)} | ${a.actionType} | risk=${a.riskLevel}`);
        console.log(`    ${a.description.slice(0, 80)}`);
        if (a.guardianWarning) console.log(`    ⚠️ ${a.guardianWarning}`);
      }
      break;
    }
    case 'glassbox-historial': {
      const limit = Math.min(100, Math.max(1, Number(flags['limit'] ?? 20)));
      const hist = getActionHistory(limit);
      console.log(chalk.cyan(`\n━━━ HISTORIAL (${hist.length}) ━━━`));
      for (const a of hist) {
        const color =
          a.status === 'completed'
            ? chalk.green
            : a.status === 'failed'
              ? chalk.red
              : a.status === 'rejected'
                ? chalk.yellow
                : chalk.gray;
        console.log(`  ${color(`[${a.status}]`)} ${a.id} | ${a.actionType} | risk=${a.riskLevel}`);
        console.log(`    ${a.description.slice(0, 80)}`);
        if (a.resolutionNote) console.log(`    📝 ${a.resolutionNote}`);
      }
      break;
    }
    case 'glassbox-aprobar': {
      const id = flags['id'] as string | undefined;
      if (!id) throw new Error('Falta --id=<action-id>');
      const ok = approveAction(id, flags['nota'] as string | undefined);
      if (!ok) throw new Error(`No se pudo aprobar ${id}. ¿Ya fue resuelta?`);
      console.log(chalk.green(`✅ Acción ${id} aprobada.`));
      break;
    }
    case 'glassbox-rechazar': {
      const id = flags['id'] as string | undefined;
      if (!id) throw new Error('Falta --id=<action-id>');
      const razon = flags['razon'] as string | undefined;
      if (!razon) throw new Error('Falta --razon="motivo del rechazo"');
      const ok = rejectAction(id, razon);
      if (!ok) throw new Error(`No se pudo rechazar ${id}. ¿Ya fue resuelta?`);
      console.log(chalk.yellow(`❌ Acción ${id} rechazada: ${razon}`));
      break;
    }
    case 'glassbox-modificar': {
      const id = flags['id'] as string | undefined;
      if (!id) throw new Error('Falta --id=<action-id>');
      const payloadStr = flags['payload'] as string | undefined;
      if (!payloadStr) throw new Error('Falta --payload=\'{"key":"value"}\'');
      let payload: Record<string, unknown>;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        throw new Error('Payload JSON inválido');
      }
      const ok = modifyAction(id, payload);
      if (!ok) throw new Error(`No se pudo modificar ${id}. ¿Ya fue resuelta?`);
      console.log(chalk.cyan(`✏️ Acción ${id} modificada.`));
      break;
    }
    case 'glassbox-aprobar-todas': {
      const note = flags['nota'] as string | undefined;
      const r = approveAllPending(note);
      console.log(chalk.green(`✅ ${r.approved} acciones aprobadas. ${r.skipped} skipped.`));
      break;
    }
    case 'glassbox-rechazar-todas': {
      const razon = flags['razon'] as string | undefined;
      if (!razon) throw new Error('Falta --razon="motivo del rechazo masivo"');
      const r = rejectAllPending(razon);
      console.log(chalk.yellow(`❌ ${r.rejected} acciones rechazadas. ${r.skipped} skipped.`));
      break;
    }
    case 'canva-connect': {
      const handle = flags['handle'];
      if (!handle) throw new Error('Falta --handle=@usuario');
      if (!env.canva.clientId || !env.canva.clientSecret) {
        throw new Error('CANVA_CLIENT_ID y CANVA_CLIENT_SECRET deben estar configurados en .env');
      }

      const PORT = 7322;
      const REDIRECT_URI = `http://localhost:${PORT}/oauth/callback`;
      const { url, verifier } = await buildCanvaAuthUrl(env.canva.clientId, REDIRECT_URI, `cli:${handle}`);

      console.log(`\n🎨 Conectando Canva para ${handle}\n`);
      console.log('URL de autorización:', url, '\n');

      // Abrir navegador
      const platform = process.platform;
      const openCmd =
        platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "" "${url}"` : `xdg-open "${url}"`;
      exec(openCmd, (err) => {
        if (err) console.log('No se pudo abrir el navegador automáticamente.');
      });

      // Servidor temporal para recibir callback
      await new Promise<void>((resolveP, rejectP) => {
        const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
          const reqUrl = new URL(req.url ?? '/', `http://localhost:${PORT}`);
          if (reqUrl.pathname !== '/oauth/callback') {
            res.writeHead(404);
            res.end('Not found');
            return;
          }

          const code = reqUrl.searchParams.get('code');
          const error = reqUrl.searchParams.get('error');

          if (error) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(`<h1>Error: ${error}</h1>`);
            server.close();
            rejectP(new Error(`Canva error: ${error}`));
            return;
          }

          if (!code) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end('<h1>Falta código</h1>');
            server.close();
            rejectP(new Error('No se recibió authorization code'));
            return;
          }

          const result = await exchangeCanvaCode(
            code,
            verifier,
            env.canva.clientId,
            env.canva.clientSecret,
            REDIRECT_URI,
          );
          if (!result) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>Error intercambiando tokens</h1>');
            server.close();
            rejectP(new Error('Error intercambiando code por tokens'));
            return;
          }

          ensureUser(handle);
          saveCanvaTokens(handle, {
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            expiresAt: Date.now() + result.expires_in * 1000,
            connectedAt: new Date().toISOString(),
          });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(
            `<html><body style="font-family:sans-serif;text-align:center;padding:40px;"><h1>✅ Canva conectado para ${handle}</h1><p>Podés cerrar esta pestaña.</p></body></html>`,
          );
          server.close();
          console.log(`\n✅ Canva conectado para ${handle}`);
          resolveP();
        });

        server.listen(PORT, () => {
          console.log(`🌐 Esperando callback en ${REDIRECT_URI} ...`);
        });
      });
      break;
    }
    case 'canva-users': {
      const users = listUsers().filter((u) => u.canvaConnected);
      console.log(JSON.stringify(users, null, 2));
      console.log(`\n${users.length} usuario(s) con Canva conectado`);
      break;
    }
    case 'canva-disconnect': {
      const handle = flags['handle'];
      if (!handle) throw new Error('Falta --handle=@usuario');
      deleteCanvaTokens(handle);
      deleteUser(handle);
      console.log(`Canva desconectado para ${handle}`);
      break;
    }
    case 'setup-canva': {
      console.log(`
${chalk.bold('🎨 Wizard de configuración de Canva Connect')}
${chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')}

Voy a abrir el Canva Developer Portal en tu navegador.
Seguí estos pasos:

1. Hacé clic en ${chalk.bold('"Your integrations"')} en el menú superior
2. Hacé clic en ${chalk.bold('"Create an integration"')}
3. Elegí ${chalk.bold('"Connect API"')} como tipo
4. Completá el nombre (ej: "FeedIA Studio")
5. En ${chalk.bold('Authentication → Redirect URLs')} agregá:
   ${chalk.cyan('http://localhost:7321/oauth/callback/canva')}
6. Guardá y copiá el ${chalk.bold('Client ID')} y ${chalk.bold('Client Secret')}
7. Pegalos en tu archivo .env:
   ${chalk.cyan('CANVA_CLIENT_ID=tu_client_id')}
   ${chalk.cyan('CANVA_CLIENT_SECRET=tu_client_secret')}

Después ejecutá: ${chalk.bold('npm run dev canva-connect --handle=@usuario')}
`);
      openBrowser('https://www.canva.com/developers/');
      break;
    }
    case 'pipeline-canva': {
      const formato = flags['formato'] as 'carrusel' | 'reel' | 'historia' | undefined;
      const idea = flags['idea'];
      const handle = flags['handle'];
      const shouldOpen = flags['open'] === 'true' || flags['open'] === '1' || flags['open'] === '';
      const shouldPublish = flags['publicar'] === 'true' || flags['publicar'] === '1' || flags['publicar'] === '';

      if (!formato || !idea) {
        throw new Error('Faltan --formato=carrusel|reel|historia --idea="..."');
      }
      if (!handle) {
        throw new Error('Falta --handle=@usuario (¿quién va a publicar?)');
      }

      console.log(`\n${chalk.bold('🚀 Pipeline Canva → Instagram')}`);
      console.log(`   Formato: ${formato}`);
      console.log(`   Idea: ${idea}`);
      console.log(`   Usuario: ${handle}`);
      console.log(`   Abrir preview: ${shouldOpen ? 'sí' : 'no'}`);
      console.log(`   Publicar: ${shouldPublish ? 'sí' : 'no'}\n`);

      // 1. Generar contenido
      let render: import('./capabilities/content/canvaRender.js').RenderedDesign | undefined;
      let captionText = '';
      let hashtags: string[] = [];

      if (formato === 'carrusel') {
        const carrusel = await withSpinner('1/4 Diseñando carrusel', () =>
          createCarrusel(brand, idea, (flags['longitud'] ?? 'medio') as 'corto' | 'medio' | 'largo'),
        );
        const caption = await createCaption(brand, `Idea: ${idea}. Formato: carrusel.`, 'carrusel');
        captionText = caption.larga;
        hashtags = carrusel.hashtags;
        render = await withSpinner('2/4 Renderizando en Canva', () =>
          renderCarruselToCanva(carrusel, `Carrusel — ${idea.slice(0, 40)}`, handle),
        );
      } else if (formato === 'reel') {
        const dur = flags['duracion'] ? Number(flags['duracion']) : 30;
        const allowed: Array<15 | 20 | 30 | 45 | 60> = [15, 20, 30, 45, 60];
        const duracion = allowed.includes(dur as 15 | 20 | 30 | 45 | 60) ? (dur as 15 | 20 | 30 | 45 | 60) : 30;
        const reel = await withSpinner('1/4 Escribiendo reel', () => createReel(brand, idea, duracion));
        const caption = await createCaption(brand, `Idea: ${idea}. Formato: reel.`, 'reel');
        captionText = caption.larga;
        hashtags = reel.hashtags ?? [];
        render = await withSpinner('2/4 Renderizando en Canva', () =>
          renderReelToCanva(reel, `Reel — ${idea.slice(0, 40)}`, handle),
        );
      } else {
        const cantidad = flags['cantidad'] ? Number(flags['cantidad']) : 5;
        const story = await withSpinner('1/4 Diseñando stories', () => createStorySequence(brand, idea, cantidad));
        const caption = await createCaption(brand, `Idea: ${idea}. Formato: historia.`, 'historia');
        captionText = caption.larga;
        hashtags = [];
        render = await withSpinner('2/4 Renderizando en Canva', () =>
          renderStorySequenceToCanva(story, `Stories — ${idea.slice(0, 40)}`, handle),
        );
      }

      if (!render?.ok) {
        throw new Error(`Render en Canva falló: ${render?.error ?? 'desconocido'}`);
      }

      // 3. Abrir navegador para preview
      if (render.designUrl && shouldOpen) {
        console.log(`\n👀 Abriendo diseño en Canva para revisión...`);
        openBrowser(render.designUrl);
      }

      console.log(`\n${chalk.green('✅ Contenido generado y renderizado')}`);
      console.log(`   Design URL: ${render.designUrl ?? 'N/A'}`);
      console.log(`   Export URLs: ${render.exportUrls?.join(', ') ?? 'N/A'}`);

      // 4. Publicar en Instagram (opcional)
      let publicacion: import('./integrations/meta.js').PublishResult | undefined;
      if (shouldPublish && render.exportUrls && render.exportUrls.length > 0) {
        const fullCaption = `${captionText}\n\n${hashtags.join(' ')}`;
        publicacion = await withSpinner('4/4 Publicando en Instagram', () =>
          publishToInstagram({
            format: formato === 'historia' ? 'historia' : formato,
            caption: fullCaption,
            mediaUrls: render!.exportUrls!,
            scheduledAt: flags['scheduledAt'],
          }),
        );
        if (publicacion.ok) {
          console.log(`\n${chalk.green('🎉 Publicado en Instagram!')}`);
          console.log(`   Post ID: ${publicacion.postId ?? 'N/A'}`);
        } else {
          console.log(`\n${chalk.red('❌ Error publicando:')} ${publicacion.error}`);
        }
      }

      const out = { render, caption: captionText, hashtags, publicacion };
      log.success(`Guardado en ${saveOutput('pipeline-canva', out)}`);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case 'video-reel': {
      const tema = flags['tema'] || positional.join(' ');
      if (!tema) throw new Error('Falta --tema="..."');
      const result = await withSpinner('Generando video reel', () =>
        runReelPipeline({
          topic: tema,
          brandId: brand.name,
          targetDuration: Number(flags['duracion'] || 30),
          style: flags['style'],
        }),
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'ab-test-start': {
      const name = flags['name'];
      const hypothesis = flags['hypothesis'];
      const variantsPath = flags['variants'];
      if (!name || !hypothesis || !variantsPath) {
        throw new Error('Faltan --name, --hypothesis o --variants');
      }
      const variantsRaw = JSON.parse(readFileSync(variantsPath, 'utf-8')) as Array<{
        name: string;
        caption: string;
        mediaUrls: string[];
        format: 'reel' | 'imagen' | 'carrusel' | 'historia';
      }>;
      const result = await withSpinner('Iniciando A/B test', () =>
        startABTest({ accountId: brand.name, name, hypothesis, variants: variantsRaw }),
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'ab-test-evaluate': {
      const id = flags['id'];
      if (!id) throw new Error('Falta --id');
      const result = await withSpinner('Evaluando A/B test', () => evaluateABTest(id));
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'ab-test-listar': {
      const tests = listABTests(brand.name);
      console.log(JSON.stringify(tests, null, 2));
      break;
    }
    case 'trends-scout': {
      const keywords = (flags['keywords'] || '').split(',').filter(Boolean);
      const sources = (flags['sources'] || 'reddit,google').split(',') as Array<'reddit' | 'google' | 'twitter'>;
      const result = await withSpinner('Scouteando tendencias reales', () =>
        scoutRealTrends(keywords.length ? keywords : ['instagram', 'marketing', 'ia'], sources),
      );
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'competitor-track': {
      const handle = flags['handle'];
      if (!handle) throw new Error('Falta --handle=@competidor');
      const result = await withSpinner('Trackeando competidor', () => trackCompetitor(handle));
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'email-send': {
      const to = flags['to'];
      const subject = flags['subject'];
      const message = flags['message'];
      if (!to || !subject || !message) throw new Error('Faltan --to, --subject o --message');
      const result = await sendNotification(to, subject, message);
      console.log(JSON.stringify(result, null, 2));
      break;
    }
    case 'account-listar': {
      const ids = listBrandIds();
      console.log('Cuentas configuradas:');
      for (const id of ids) {
        const b = loadBrandProfileById(id);
        const active = id === getActiveBrandId() ? ' (ACTIVA)' : '';
        console.log(`  - ${id}: ${b.name}${active}`);
      }
      break;
    }
    case 'account-set': {
      const id = flags['id'];
      if (!id) throw new Error('Falta --id');
      loadBrandProfileById(id); // valida que exista
      console.log(`Para cambiar la cuenta activa a "${id}", ejecutá:`);
      console.log(`  ACTIVE_BRAND_ID=${id} npm run dev ...`);
      console.log(`O actualizá ACTIVE_BRAND_ID en el archivo .env`);
      break;
    }
    case 'team-listar': {
      const teams = listTeams();
      console.log('\n' + chalk.bold('━━━ EQUIPOS DE AGENTES ━━━') + '\n');
      for (const t of teams) {
        console.log(`${chalk.bold(t.name)} (${t.id})`);
        console.log(`  ${t.description}`);
        console.log(`  Agentes: ${t.agentIds.join(', ')}\n`);
      }
      break;
    }
    case 'team-run': {
      const teamId = flags['teamId'];
      if (!teamId) throw new Error('Falta --teamId');
      const ctx = flags['context'] ?? positional.join(' ');
      const result = await withSpinner(`Ejecutando equipo ${teamId}`, () =>
        runAgentTeam(String(teamId), brand, ctx || undefined),
      );
      console.log('\n' + chalk.bold('━━━ RESULTADO DEL EQUIPO ━━━') + '\n');
      console.log(`Estado: ${result.overallStatus}`);
      for (const r of result.results) {
        const color = r.status === 'success' ? chalk.green : chalk.red;
        console.log(`${color(`[${r.status.toUpperCase()}]`)} ${r.agentName}: ${r.summary.slice(0, 80)}`);
      }
      break;
    }
    case 'trigger-listar': {
      const triggers = listTriggers();
      console.log('\n' + chalk.bold('━━━ TRIGGERS AUTOMÁTICOS ━━━') + '\n');
      for (const t of triggers) {
        console.log(`${chalk.bold(t.id)} → ${t.agentId} (${t.cooldownMinutes}min cooldown)`);
      }
      break;
    }
    case 'trigger-simular': {
      const event = flags['event'];
      if (!event) throw new Error('Falta --event');
      const payload = flags['payload'] ? JSON.parse(flags['payload']) : {};
      console.log(`Simulando evento: ${event}`);
      await handleEvent(event, payload, brand);
      console.log(chalk.green('✅ Evento simulado'));
      break;
    }
    case 'cu-plan': {
      const instruccion = flags['instruccion'] ?? positional.join(' ');
      if (!instruccion) throw new Error('Falta --instruccion="..."');
      const { planComputerUse } = await import('./capabilities/computerUse/planner.js');
      const plan = planComputerUse(instruccion);
      console.log(chalk.cyan(`\n━━━ PLAN: ${plan.instruction} ━━━`));
      console.log(
        `Superficie: ${plan.surface} | Pasos: ${plan.actions.length} | Requiere aprobación: ${plan.requiresApproval}`,
      );
      for (const a of plan.actions) {
        console.log(`  ${a.step}. [${a.gesture}] ${a.targetLabel} — ${a.humanAction}`);
      }
      break;
    }
    case 'cu-ejecutar': {
      const instruccion = flags['instruccion'] ?? positional.join(' ');
      if (!instruccion) throw new Error('Falta --instruccion="..."');
      const { planComputerUse } = await import('./capabilities/computerUse/planner.js');
      const { executePlan } = await import('./capabilities/computerUse/executor.js');
      const plan = planComputerUse(instruccion);
      const result = await withSpinner('Ejecutando plan de Computer Use', () =>
        executePlan(plan, { brandId: brand.name, force: flags['force'] === 'true' }),
      );
      console.log(chalk.cyan(`\n━━━ RESULTADO ━━━`));
      console.log(`Modo: ${result.mode} | Completado: ${result.completed}`);
      for (const s of result.steps) {
        const color = s.status === 'ok' ? chalk.green : s.status === 'failed' ? chalk.red : chalk.yellow;
        console.log(`  ${color(`[${s.status}]`)} ${s.targetLabel} (${s.gesture}) — ${s.detail?.slice(0, 60)}`);
      }
      break;
    }
    case 'cu-resume': {
      const sesion = flags['sesion'] as string | undefined;
      if (!sesion) throw new Error('Falta --sesion=cu-...');
      const { resumeSession } = await import('./capabilities/computerUse/executor.js');
      const result = await withSpinner(`Reanudando sesión ${sesion}`, () => resumeSession(sesion));
      if (!result) {
        console.log(chalk.yellow('No se encontró sesión pendiente con ese ID.'));
      } else {
        console.log(chalk.cyan(`\n━━━ REANUDACIÓN ━━━`));
        console.log(`Completado: ${result.completed} | Pasos: ${result.steps.length}`);
      }
      break;
    }
    case 'cu-sesiones': {
      const { getPendingSessions } = await import('./capabilities/computerUse/executor.js');
      const sessions = getPendingSessions();
      console.log(chalk.cyan(`\n━━━ SESIONES PENDIENTES (${sessions.length}) ━━━`));
      for (const s of sessions) {
        console.log(
          `  ${chalk.blue(s.sessionId)} | ${s.planInstruction.slice(0, 50)} | pasos completados: ${s.stepsCompleted.length}`,
        );
      }
      break;
    }
    case 'cu-health': {
      const { runFullHealthCheck } = await import('./capabilities/computerUse/selectorHealth.js');
      const report = await withSpinner('Verificando selectores contra Instagram', () => runFullHealthCheck());
      console.log(chalk.cyan(`\n━━━ SELECTOR HEALTH ━━━`));
      console.log(
        `Total: ${report.totalTargets} | Healthy: ${chalk.green(report.healthyTargets)} | Rotten: ${chalk.red(report.rottenTargets)}`,
      );
      for (const t of report.targets.filter((x) => !x.healthy)) {
        console.log(`  ${chalk.red('✗')} ${t.targetId} — ${t.label}`);
      }
      break;
    }
    case 'cu-runs': {
      const { listComputerRuns } = await import('./capabilities/computerUse/executor.js');
      const limit = Math.min(100, Math.max(1, Number(flags['limit'] ?? 20)));
      const runs = listComputerRuns(limit);
      console.log(chalk.cyan(`\n━━━ ÚLTIMAS EJECUCIONES (${runs.length}) ━━━`));
      for (const r of runs) {
        const color = r.completed ? chalk.green : chalk.red;
        console.log(
          `  ${color(r.mode)} | ${r.planInstruction.slice(0, 50)} | ${r.steps.filter((s) => s.status === 'ok').length}/${r.steps.length} OK`,
        );
      }
      break;
    }
    case 'voz-hablar': {
      const texto = flags['texto'] ?? positional.join(' ');
      if (!texto) throw new Error('Falta --texto="..."');
      const { speak } = await import('./voice/tts.js');
      const lang = (flags['idioma'] ?? 'es-AR') as 'es-AR' | 'en-US';
      await withSpinner('Hablando', () => speak(texto, { language: lang }));
      break;
    }
    case 'voz-escuchar': {
      const { listenOnce } = await import('./voice/stt.js');
      const timeout = Number(flags['timeout'] ?? 8000);
      const result = await withSpinner(`Escuchando (${timeout}ms)`, async () => listenOnce({ timeoutMs: timeout }));
      console.log(chalk.cyan('\n━━━ RESULTADO STT ━━━'));
      console.log(`Transcript: ${result.transcript || '(silencio)'}`);
      console.log(`Confianza: ${result.confidence} | Provider: ${result.provider}`);
      if (result.error) console.log(chalk.red(`Error: ${result.error}`));
      break;
    }
    case 'voz-comando': {
      const texto = flags['texto'] ?? positional.join(' ');
      if (!texto) throw new Error('Falta --texto="..."');
      const { processVoiceCommand } = await import('./voice/voiceSession.js');
      const cmd = await withSpinner('Procesando comando de voz', () => processVoiceCommand(texto));
      console.log(chalk.cyan('\n━━━ COMANDO DE VOZ ━━━'));
      console.log(`Transcript: ${cmd.transcript}`);
      console.log(`Intent: ${cmd.intent}`);
      console.log(`Ejecutado: ${cmd.executed}`);
      console.log(`Respuesta: ${cmd.response}`);
      break;
    }
    case 'voz-manos-libres': {
      const { startHandsFreeMode } = await import('./voice/voiceSession.js');
      const lang = (flags['idioma'] ?? 'es-AR') as string;
      console.log(chalk.cyan('🎤 Activando modo manos libres...'));
      console.log(chalk.gray('Decí "Hola Talía" o presioná Ctrl+C para salir.'));
      await startHandsFreeMode(lang);
      // Keep process alive
      await new Promise(() => {});
      break;
    }
    case 'voz-detener': {
      const { stopHandsFreeMode } = await import('./voice/voiceSession.js');
      await stopHandsFreeMode();
      console.log(chalk.yellow('🎤 Modo manos libres detenido.'));
      break;
    }
    case 'voz-sesiones': {
      const { listActiveSessions } = await import('./voice/voiceContext.js');
      const sessions = listActiveSessions();
      console.log(chalk.cyan(`\n━━━ SESIONES DE VOZ ACTIVAS (${sessions.length}) ━━━`));
      for (const s of sessions) console.log(`  ${chalk.blue(s)}`);
      break;
    }
    case 'voz-reiniciar': {
      const { resetSession } = await import('./voice/voiceSession.js');
      resetSession();
      console.log(chalk.green('🔄 Sesión de voz reiniciada. Contexto limpio.'));
      break;
    }
    case 'macro-listar': {
      const { listMacros } = await import('./voice/voiceMacroRecorder.js');
      const macros = listMacros();
      console.log(chalk.cyan(`\n━━━ MACROS (${macros.length}) ━━━`));
      for (const m of macros) {
        console.log(`  ${chalk.bold(m.name)} — ${m.description} (${m.steps.length} pasos, ${m.runCount} ejecuciones)`);
      }
      break;
    }
    case 'macro-ejecutar': {
      const nombre = flags['nombre'] as string | undefined;
      if (!nombre) throw new Error('Falta --nombre=...');
      const { runMacro } = await import('./voice/voiceMacroRecorder.js');
      const result = await withSpinner(`Ejecutando macro ${nombre}`, () => runMacro(nombre));
      console.log(chalk.cyan(`\n━━━ RESULTADO ━━━`));
      console.log(`OK: ${result.ok}`);
      for (const r of result.results) console.log(`  → ${r.slice(0, 80)}`);
      break;
    }
    case 'macro-grabar': {
      const nombre = flags['nombre'] as string | undefined;
      if (!nombre) throw new Error('Falta --nombre=...');
      const { startRecording } = await import('./voice/voiceMacroRecorder.js');
      const r = startRecording(nombre);
      console.log(r.ok ? chalk.green(`🎙️ Grabando macro: ${nombre}`) : chalk.yellow(r.error));
      break;
    }
    case 'macro-paso': {
      const texto = flags['texto'] ?? positional.join(' ');
      if (!texto) throw new Error('Falta --texto=...');
      const { recordStep, detectIntent } = await import('./voice/index.js');
      const intent = detectIntent(texto);
      const r = recordStep(texto, intent);
      console.log(r.ok ? chalk.gray(`Paso grabado: ${texto.slice(0, 50)}`) : chalk.yellow(r.error));
      break;
    }
    case 'macro-terminar': {
      const { stopRecording } = await import('./voice/voiceMacroRecorder.js');
      const result = stopRecording(flags['descripcion'] as string | undefined);
      if ('error' in result) {
        console.log(chalk.yellow(result.error));
      } else {
        console.log(chalk.green(`✅ Macro guardada: ${result.name} (${result.steps.length} pasos)`));
      }
      break;
    }
    case 'macro-cancelar': {
      const { cancelRecording } = await import('./voice/voiceMacroRecorder.js');
      cancelRecording();
      console.log(chalk.yellow('🎙️ Grabación cancelada.'));
      break;
    }
    case 'macro-eliminar': {
      const nombre = flags['nombre'] as string | undefined;
      if (!nombre) throw new Error('Falta --nombre=...');
      const { deleteMacro } = await import('./voice/voiceMacroRecorder.js');
      const ok = deleteMacro(nombre);
      console.log(ok ? chalk.green(`🗑️ Macro eliminada: ${nombre}`) : chalk.yellow('Macro no encontrada.'));
      break;
    }
    case 'asistente-webhook': {
      const comando = flags['comando'] ?? positional.join(' ');
      if (!comando) throw new Error('Falta --comando=...');
      const { handleAssistantRequest } = await import('./voice/homeAssistantBridge.js');
      const result = await handleAssistantRequest({ platform: 'generic', command: comando });
      console.log(chalk.cyan('\n━━━ RESPUESTA DEL ASISTENTE ━━━'));
      console.log(`Acción: ${result.actionType}`);
      console.log(`Ejecutada: ${result.actionExecuted}`);
      console.log(`Respuesta: ${result.spokenResponse}`);
      break;
    }
    case 'sentimiento': {
      const texto = flags['texto'] ?? positional.join(' ');
      if (!texto) throw new Error('Falta --texto=...');
      const { analyzeSentiment } = await import('./voice/sentimentAnalyzer.js');
      const r = analyzeSentiment(texto);
      console.log(chalk.cyan('\n━━━ SENTIMIENTO ━━━'));
      console.log(`Score: ${r.score.toFixed(2)} | Magnitud: ${r.magnitude.toFixed(2)}`);
      console.log(`Label: ${r.label} | Tono: ${r.tone}`);
      console.log(`Keywords: ${r.keywords.join(', ')}`);
      break;
    }
    case 'biometrico-enrolar': {
      const id = flags['id'] as string | undefined;
      const nombre = flags['nombre'] as string | undefined;
      const label = (flags['label'] ?? 'operator') as 'admin' | 'operator' | 'guest';
      if (!id || !nombre) throw new Error('Faltan --id y --nombre');
      const pcm = Buffer.alloc(32000);
      for (let i = 0; i < pcm.length; i += 2) {
        const sample = Math.sin(i * 0.01) * 5000 + (Math.random() - 0.5) * 1000;
        pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sample))), i);
      }
      const { enrollVoice } = await import('./voice/voiceBiometrics.js');
      const profile = enrollVoice(id, nombre, label, pcm);
      console.log(chalk.green(`✅ Perfil enrolado: ${profile.name} (${profile.label})`));
      break;
    }
    case 'biometrico-match': {
      const pcm = Buffer.alloc(32000);
      for (let i = 0; i < pcm.length; i += 2) {
        const sample = Math.sin(i * 0.01) * 5000 + (Math.random() - 0.5) * 1000;
        pcm.writeInt16LE(Math.max(-32768, Math.min(32767, Math.floor(sample))), i);
      }
      const { matchVoice } = await import('./voice/voiceBiometrics.js');
      const m = matchVoice(pcm);
      console.log(chalk.cyan('\n━━━ MATCH BIOMÉTRICO ━━━'));
      console.log(`Match: ${m.matched} | Similitud: ${m.similarity.toFixed(2)}`);
      if (m.profileName) console.log(`Perfil: ${m.profileName} (${m.label})`);
      break;
    }
    case 'biometrico-perfiles': {
      const { listProfiles } = await import('./voice/voiceBiometrics.js');
      const profiles = listProfiles();
      console.log(chalk.cyan(`\n━━━ PERFILES DE VOZ (${profiles.length}) ━━━`));
      for (const p of profiles) {
        console.log(`  ${chalk.bold(p.name)} | ${p.label} | ${p.samples} muestras`);
      }
      break;
    }
    case 'speaker-activo': {
      const { getActiveSpeaker, listSpeakerHistory } = await import('./voice/voiceBiometrics.js');
      const active = getActiveSpeaker();
      console.log(chalk.cyan('\n━━━ SPEAKER ACTIVO ━━━'));
      console.log(
        active
          ? `${active.name} (${active.label}) — ${active.interactionCount} interacciones`
          : 'Ningún speaker detectado.',
      );
      const history = listSpeakerHistory();
      console.log(chalk.gray(`\nHistorial: ${history.length} sesiones`));
      break;
    }
    case 'offline-status': {
      const { detectOfflineEngines } = await import('./voice/offlineMode.js');
      const status = detectOfflineEngines();
      console.log(chalk.cyan('\n━━━ MOTORES OFFLINE ━━━'));
      console.log(`Wake word: ${status.wakeWord ? '✅' : '❌'}`);
      console.log(`STT: ${status.stt ? '✅' : '❌'}`);
      console.log(`TTS: ${status.tts ? '✅' : '❌'}`);
      console.log(`NLU: ${status.nlu ? '✅' : '❌'}`);
      console.log(`Fully offline: ${status.fullyOffline ? '✅' : '❌'}`);
      break;
    }
    case 'exportar-voz': {
      const formato = (flags['formato'] ?? 'markdown') as 'json' | 'markdown' | 'csv' | 'txt';
      const { exportConversation } = await import('./voice/conversationExport.js');
      const result = exportConversation({ format: formato });
      console.log(chalk.green(`✅ Exportado: ${result.path}`));
      console.log(chalk.gray(`${result.content.length} bytes`));
      break;
    }
    case 'voz-entrenar': {
      const id = flags['id'] as string | undefined;
      const nombre = flags['nombre'] as string | undefined;
      const label = (flags['label'] ?? 'operator') as 'admin' | 'operator' | 'guest';
      if (!id || !nombre) throw new Error('Faltan --id y --nombre');
      const { startTraining, getTrainingSteps } = await import('./voice/trainingWizard.js');
      const session = startTraining(id, nombre, label);
      console.log(chalk.cyan(`\n━━━ ENTRENAMIENTO DE VOZ ━━━`));
      console.log(`ID: ${session.id} | Nombre: ${session.name}`);
      for (const step of getTrainingSteps()) {
        console.log(`  ${step.step}. ${step.instruction}`);
      }
      break;
    }
    case 'voz-trigger': {
      const perfil = flags['perfil'] as string | undefined;
      const macro = flags['macro'] as string | undefined;
      if (!perfil) throw new Error('Falta --perfil=...');
      const { runSpeakerTrigger, assignMacroToSpeaker } = await import('./voice/voiceMacroRecorder.js');
      if (macro) {
        assignMacroToSpeaker(perfil, macro);
        console.log(chalk.green(`✅ Macro "${macro}" asignada a ${perfil}`));
      }
      const result = await runSpeakerTrigger(perfil);
      console.log(result.ok ? chalk.green('Trigger ejecutado.') : chalk.yellow(result.error!));
      break;
    }
    case 'voz-analytics': {
      const dias = Math.min(90, Math.max(1, Number(flags['dias'] ?? 7)));
      const { getAnalyticsSummary, getHourlyActivity } = await import('./voice/voiceAnalytics.js');
      const summary = getAnalyticsSummary(dias);
      const hourly = getHourlyActivity(dias);
      console.log(chalk.cyan(`\n━━━ ANALYTICS DE VOZ (${dias} días) ━━━`));
      console.log(`Comandos: ${summary.totalCommands} | Wake detections: ${summary.totalWakeDetections}`);
      console.log(
        `Tasa de éxito: ${(summary.successRate * 100).toFixed(1)}% | Duración promedio: ${summary.avgCommandDurationMs.toFixed(0)}ms`,
      );
      console.log(`Hora más activa: ${summary.mostActiveHour}:00 | Categoría top: ${summary.topCategory}`);
      console.log(`Speakers únicos: ${summary.uniqueSpeakers}`);
      console.log(chalk.gray(`\nActividad por hora (últimas 24h):`));
      console.log(
        hourly.hours
          .map(
            (v, i) =>
              `${i.toString().padStart(2, '0')}:${v > 0 ? chalk.green('█'.repeat(Math.min(10, v))) : chalk.gray('·')}`,
          )
          .join(' '),
      );
      break;
    }
    case 'voz-heatmap': {
      const dias = Math.min(90, Math.max(1, Number(flags['dias'] ?? 7)));
      const { getIntentHeatmap } = await import('./voice/voiceAnalytics.js');
      const heatmap = getIntentHeatmap(dias);
      console.log(chalk.cyan(`\n━━━ HEATMAP DE INTENTS (${dias} días) ━━━`));
      console.log('Categorías:');
      for (const [cat, count] of Object.entries(heatmap.categories).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${cat}: ${count}`);
      }
      break;
    }
    case 'voz-success-rate': {
      const dias = Math.min(90, Math.max(1, Number(flags['dias'] ?? 7)));
      const { getSuccessRate } = await import('./voice/voiceAnalytics.js');
      const rate = getSuccessRate(dias);
      console.log(chalk.cyan(`\n━━━ SUCCESS RATE (${dias} días) ━━━`));
      console.log(`General: ${(rate.overall * 100).toFixed(1)}%`);
      console.log('Por categoría:');
      for (const [cat, r] of Object.entries(rate.byCategory).sort((a, b) => b[1] - a[1])) {
        console.log(`  ${cat}: ${(r * 100).toFixed(1)}%`);
      }
      break;
    }
    case 'voz-top-commands': {
      const limite = Math.min(50, Math.max(1, Number(flags['limite'] ?? 10)));
      const { getTopCommands } = await import('./voice/voiceAnalytics.js');
      const cmds = getTopCommands(limite);
      console.log(chalk.cyan(`\n━━━ TOP COMANDOS (${cmds.length}) ━━━`));
      for (const c of cmds) {
        console.log(`  ${c.intent}: ${c.count} (éxito ${(c.successRate * 100).toFixed(0)}%)`);
      }
      break;
    }
    case 'voz-wake-custom': {
      const frase = flags['frase'] as string | undefined;
      const idioma = (flags['idioma'] ?? 'es-AR') as string;
      const nombre = flags['nombre'] as string | undefined;
      if (!frase || !nombre) throw new Error('Faltan --frase y --nombre');
      const { addCustomWakeWord } = await import('./voice/customWakeWord.js');
      const cw = addCustomWakeWord(frase, idioma, nombre);
      console.log(chalk.green(`✅ Wake word custom agregada: ${cw.displayName} (${cw.id})`));
      break;
    }
    case 'voz-wake-listar': {
      const { listCustomWakeWords } = await import('./voice/customWakeWord.js');
      const words = listCustomWakeWords();
      console.log(chalk.cyan(`\n━━━ WAKE WORDS CUSTOM (${words.length}) ━━━`));
      for (const w of words) {
        console.log(`  ${w.active ? chalk.green('●') : chalk.gray('○')} ${w.displayName} (${w.phrase}) [${w.type}]`);
      }
      break;
    }
    case 'voz-clonar': {
      const nombre = flags['nombre'] as string | undefined;
      const muestras = flags['muestras'] as string | undefined;
      if (!nombre || !muestras) throw new Error('Faltan --nombre y --muestras');
      const { cloneVoice, isVoiceCloningAvailable } = await import('./voice/voiceCloning.js');
      if (!isVoiceCloningAvailable()) throw new Error('Voice cloning no disponible. Falta ELEVENLABS_API_KEY.');
      const { readFileSync } = await import('node:fs');
      const paths = muestras.split(',');
      const buffers = paths.map((p) => readFileSync(p.trim()));
      const voice = await withSpinner('Clonando voz con ElevenLabs', () => cloneVoice(nombre, buffers));
      console.log(chalk.green(`✅ Voz clonada: ${voice.name} (${voice.id})`));
      break;
    }
    case 'voz-clones': {
      const { listClonedVoices } = await import('./voice/voiceCloning.js');
      const voices = listClonedVoices();
      console.log(chalk.cyan(`\n━━━ VOCES CLONADAS (${voices.length}) ━━━`));
      for (const v of voices) {
        console.log(`  ${v.name} | ${v.sampleCount} muestras | ${v.elevenLabsVoiceId}`);
      }
      break;
    }
    case 'voz-clonar-hablar': {
      const voz = flags['voz'] as string | undefined;
      const texto = flags['texto'] ?? positional.join(' ');
      if (!voz || !texto) throw new Error('Faltan --voz y --texto');
      const { speakWithClonedVoice } = await import('./voice/voiceCloning.js');
      await withSpinner('Hablando con voz clonada', () => speakWithClonedVoice(voz, texto));
      break;
    }
    case 'traducir': {
      const texto = flags['texto'] ?? positional.join(' ');
      const objetivo = (flags['objetivo'] ?? 'es') as string;
      const fuente = flags['fuente'] as string | undefined;
      if (!texto) throw new Error('Falta --texto');
      const { translate } = await import('./voice/realtimeTranslation.js');
      const result = await withSpinner('Traduciendo', () => translate(texto, objetivo, fuente));
      console.log(chalk.cyan('\n━━━ TRADUCCIÓN ━━━'));
      console.log(`Original (${result.detectedLanguage}): ${result.original}`);
      console.log(`Traducido: ${result.translated}`);
      console.log(`Provider: ${result.provider} | Confianza: ${(result.confidence * 100).toFixed(0)}%`);
      break;
    }
    case 'emergencia-pausar': {
      const brand = await loadBrandProfile();
      const { executeEmergencyCommand } = await import('./voice/emergencyCommands.js');
      const result = await executeEmergencyCommand('pause', brand);
      console.log(result.ok ? chalk.yellow('🛑 Sistema pausado.') : chalk.red(result.spokenResponse));
      break;
    }
    case 'emergencia-reanudar': {
      const brand = await loadBrandProfile();
      const { executeEmergencyCommand } = await import('./voice/emergencyCommands.js');
      const result = await executeEmergencyCommand('resume', brand);
      console.log(result.ok ? chalk.green('▶️ Sistema reanudado.') : chalk.red(result.spokenResponse));
      break;
    }
    case 'emergencia-estado': {
      const { getEmergencyStatus } = await import('./voice/emergencyCommands.js');
      const status = getEmergencyStatus();
      console.log(chalk.cyan('\n━━━ ESTADO DE EMERGENCIA ━━━'));
      console.log(`GlassBox: ${status.glassboxMode} | Pendientes: ${status.pendingActions}`);
      console.log(`Sistema: ${status.systemStatus}`);
      break;
    }
    case 'emergencia-forzar': {
      const brand = await loadBrandProfile();
      const { executeEmergencyCommand } = await import('./voice/emergencyCommands.js');
      const result = await executeEmergencyCommand('force_approve', brand);
      console.log(
        result.ok ? chalk.green('✅ Todas las acciones pendientes aprobadas.') : chalk.red(result.spokenResponse),
      );
      break;
    }

    // ── Phase 7: Executive Voice ───────────────────────────────────────────
    case 'crisis-estado': {
      const { getCrisisState } = await import('./voice/crisisVoice.js');
      const r = await getCrisisState();
      console.log(chalk.cyan('\n━━━ ESTADO DE CRISIS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'crisis-pausar': {
      const { pausePublishing } = await import('./voice/crisisVoice.js');
      const r = await pausePublishing();
      console.log(r.ok ? chalk.yellow('🛑 Publicaciones pausadas.') : chalk.red(r.spokenResponse));
      break;
    }
    case 'crisis-reanudar': {
      const { resumePublishing } = await import('./voice/crisisVoice.js');
      const r = await resumePublishing();
      console.log(r.ok ? chalk.green('▶️ Publicaciones reanudadas.') : chalk.red(r.spokenResponse));
      break;
    }
    case 'abtest-listar': {
      const { listABTests } = await import('./voice/abTestingVoice.js');
      const r = await listABTests();
      console.log(chalk.cyan('\n━━━ A/B TESTS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'abtest-iniciar': {
      const variants = (flags['variantes'] as string | undefined)?.split(',') ?? ['A', 'B'];
      const desc = flags['descripcion'] as string | undefined;
      const { startABTest } = await import('./voice/abTestingVoice.js');
      const r = await startABTest(variants, desc ?? 'CLI A/B test');
      console.log(r.ok ? chalk.green(`✅ Test iniciado: ${variants.join(' vs ')}`) : chalk.red(r.spokenResponse));
      break;
    }
    case 'abtest-evaluar': {
      const testId = flags['id'] as string | undefined;
      if (!testId) throw new Error('Falta --id');
      const { evaluateABTest } = await import('./voice/abTestingVoice.js');
      const r = await evaluateABTest(testId);
      console.log(chalk.cyan('\n━━━ EVALUACIÓN A/B ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ugc-buscar': {
      const { scoutUGC } = await import('./voice/ugcVoice.js');
      const r = await scoutUGC();
      console.log(chalk.cyan('\n━━━ UGC ENCONTRADO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ugc-pendiente': {
      const { listPendingUGC } = await import('./voice/ugcVoice.js');
      const r = await listPendingUGC();
      console.log(chalk.cyan('\n━━━ UGC PENDIENTE ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'collab-prospectos': {
      const { listProspects } = await import('./voice/collabVoice.js');
      const r = await listProspects();
      console.log(chalk.cyan('\n━━━ PROSPECTS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'collab-evaluar': {
      const handle = flags['handle'] as string | undefined;
      if (!handle) throw new Error('Falta --handle');
      const { evaluateCreator } = await import('./voice/collabVoice.js');
      const r = await evaluateCreator(handle);
      console.log(chalk.cyan('\n━━━ EVALUACIÓN CREATOR ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 8: Producer Voice ────────────────────────────────────────────
    case 'contenido-carrusel': {
      const tema = flags['tema'] ?? positional.join(' ');
      if (!tema) throw new Error('Falta --tema=...');
      const { createCarousel } = await import('./voice/contentVoice.js');
      const r = await withSpinner('Creando carrusel', () => createCarousel(tema));
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'contenido-reel': {
      const tema = flags['tema'] ?? positional.join(' ');
      if (!tema) throw new Error('Falta --tema=...');
      const { createReel } = await import('./voice/contentVoice.js');
      const r = await withSpinner('Creando reel', () => createReel(tema));
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'contenido-historia': {
      const tema = flags['tema'] ?? positional.join(' ');
      if (!tema) throw new Error('Falta --tema=...');
      const { createStory } = await import('./voice/contentVoice.js');
      const r = await withSpinner('Creando historia', () => createStory(tema));
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'imagen-generar': {
      const prompt = flags['prompt'] ?? positional.join(' ');
      if (!prompt) throw new Error('Falta --prompt=...');
      const { generateImage } = await import('./voice/imageGenVoice.js');
      const r = await withSpinner('Generando imagen', () => generateImage(prompt));
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'publicar-ahora': {
      const contentId = flags['id'] as string | undefined;
      const formato = (flags['formato'] ?? 'post') as 'post' | 'reel' | 'story';
      if (!contentId) throw new Error('Falta --id=...');
      const { publishNow } = await import('./voice/publishVoice.js');
      const r = await publishNow(contentId, formato);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.red(r.spokenResponse));
      break;
    }
    case 'publicar-programar': {
      const contentId = flags['id'] as string | undefined;
      const fecha = flags['fecha'] as string | undefined;
      if (!contentId || !fecha) throw new Error('Faltan --id y --fecha');
      const { schedulePost } = await import('./voice/publishVoice.js');
      const r = await schedulePost(contentId, fecha);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.red(r.spokenResponse));
      break;
    }

    // ── Phase 9: Autonomous Voice ──────────────────────────────────────────
    case 'metas-listar': {
      const { listActiveGoals } = await import('./voice/goalsVoice.js');
      const r = await listActiveGoals();
      console.log(chalk.cyan('\n━━━ METAS ACTIVAS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'metas-crear': {
      const target = flags['target'] as string | undefined;
      const metric = flags['metric'] as string | undefined;
      const timeframe = flags['timeframe'] as string | undefined;
      if (!target || !metric || !timeframe) throw new Error('Faltan --target, --metric y --timeframe');
      const { setGrowthGoal } = await import('./voice/goalsVoice.js');
      const r = await setGrowthGoal(target, metric, timeframe);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.red(r.spokenResponse));
      break;
    }
    case 'autopilot-iniciar': {
      const { startAutopilot } = await import('./voice/autopilotVoice.js');
      const r = await startAutopilot();
      console.log(r.ok ? chalk.green('🤖 Autopilot iniciado.') : chalk.yellow(r.spokenResponse));
      break;
    }
    case 'autopilot-detener': {
      const { stopAutopilot } = await import('./voice/autopilotVoice.js');
      const r = await stopAutopilot();
      console.log(r.ok ? chalk.yellow('🛑 Autopilot detenido.') : chalk.red(r.spokenResponse));
      break;
    }
    case 'briefing-diario': {
      const { getDailyBriefing } = await import('./voice/briefingVoice.js');
      const r = await getDailyBriefing();
      console.log(chalk.cyan('\n━━━ BRIEFING DIARIO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'briefing-semanal': {
      const { getWeeklyBriefing } = await import('./voice/briefingVoice.js');
      const r = await getWeeklyBriefing();
      console.log(chalk.cyan('\n━━━ BRIEFING SEMANAL ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 10: Social Voice ─────────────────────────────────────────────
    case 'comunidad-dms': {
      const limite = Number(flags['limite'] ?? 10);
      const { replyPendingDMs } = await import('./voice/communityVoice.js');
      const r = await replyPendingDMs(limite);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.red(r.spokenResponse));
      break;
    }
    case 'comunidad-moderar': {
      const postId = flags['postId'] as string | undefined;
      const { moderateComments } = await import('./voice/communityVoice.js');
      const r = await moderateComments(postId);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.red(r.spokenResponse));
      break;
    }
    case 'leads-listar': {
      const { listLeads } = await import('./voice/leadsVoice.js');
      const r = await listLeads();
      console.log(chalk.cyan('\n━━━ LEADS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fans-top': {
      const limite = Number(flags['limite'] ?? 10);
      const { getTopFans } = await import('./voice/fansVoice.js');
      const r = await getTopFans(limite);
      console.log(chalk.cyan('\n━━━ TOP FANS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'menciones-revisar': {
      const { checkNewMentions } = await import('./voice/mentionsVoice.js');
      const r = await checkNewMentions();
      console.log(chalk.cyan('\n━━━ MENCIONES ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 11: Strategy ─────────────────────────────────────────────────
    case 'estrategia-posicionamiento': {
      const { analyzePositioning } = await import('./voice/strategyVoice.js');
      const r = await withSpinner('Analizando posicionamiento', () => analyzePositioning());
      console.log(chalk.cyan('\n━━━ POSICIONAMIENTO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'estrategia-arquetipos': {
      const { suggestArchetypes } = await import('./voice/strategyVoice.js');
      const r = await suggestArchetypes();
      console.log(chalk.cyan('\n━━━ ARQUETIPOS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'estrategia-calendario': {
      const q = flags['trimestre'] as string | undefined;
      const { planStrategicCalendar } = await import('./voice/strategyVoice.js');
      const r = await planStrategicCalendar(q);
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'estrategia-auditoria': {
      const handle = flags['handle'] as string | undefined;
      const { auditAccount } = await import('./voice/strategyVoice.js');
      const r = await auditAccount(handle);
      console.log(chalk.cyan('\n━━━ AUDITORÍA ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 12: Monetization ─────────────────────────────────────────────
    case 'monetizacion-precios': {
      const producto = flags['producto'] as string | undefined;
      const { suggestPricing } = await import('./voice/monetizationVoice.js');
      const r = await suggestPricing(producto);
      console.log(chalk.cyan('\n━━━ PRECIOS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'monetizacion-funnel': {
      const { analyzeFunnel } = await import('./voice/monetizationVoice.js');
      const r = await analyzeFunnel();
      console.log(chalk.cyan('\n━━━ FUNNEL ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'monetizacion-sponsorship': {
      const marca = flags['marca'] as string | undefined;
      const { draftSponsorshipPitch } = await import('./voice/monetizationVoice.js');
      const r = await draftSponsorshipPitch(marca);
      console.log(chalk.cyan('\n━━━ SPONSORSHIP PITCH ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'monetizacion-productos': {
      const { suggestDigitalProducts } = await import('./voice/monetizationVoice.js');
      const r = await suggestDigitalProducts();
      console.log(chalk.cyan('\n━━━ PRODUCTOS DIGITALES ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 13: Legal ────────────────────────────────────────────────────
    case 'legal-terminos': {
      const { generateTerms } = await import('./voice/legalVoice.js');
      const r = await generateTerms();
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'legal-privacidad': {
      const { generatePrivacyPolicy } = await import('./voice/legalVoice.js');
      const r = await generatePrivacyPolicy();
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'legal-disclaimer': {
      const tipo = flags['tipo'] as string | undefined;
      const { generateDisclaimer } = await import('./voice/legalVoice.js');
      const r = await generateDisclaimer(tipo);
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'legal-contrato': {
      const handle = flags['handle'] as string | undefined;
      const { draftCreatorContract } = await import('./voice/legalVoice.js');
      const r = await draftCreatorContract(handle);
      console.log(chalk.cyan('\n━━━ CONTRATO ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 14: Multi-Account ────────────────────────────────────────────
    case 'cuentas-listar': {
      const { listAccounts } = await import('./voice/multiAccountVoice.js');
      const r = await listAccounts();
      console.log(chalk.cyan('\n━━━ CUENTAS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'cuentas-cambiar': {
      const id = flags['id'] as string | undefined;
      const { switchAccount } = await import('./voice/multiAccountVoice.js');
      const r = await switchAccount(id);
      console.log(r.ok ? chalk.green(`✅ ${r.spokenResponse}`) : chalk.yellow(r.spokenResponse));
      break;
    }
    case 'cuentas-consolidar': {
      const { consolidateAnalytics } = await import('./voice/multiAccountVoice.js');
      const r = await consolidateAnalytics();
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }

    // ── Phase 15: SEO ──────────────────────────────────────────────────────
    case 'seo-hashtags': {
      const tema = flags['tema'] as string | undefined;
      const { optimizeHashtags } = await import('./voice/seoVoice.js');
      const r = await optimizeHashtags(tema);
      console.log(chalk.cyan('\n━━━ HASHTAGS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'seo-keywords': {
      const seed = flags['seed'] as string | undefined;
      const { researchKeywords } = await import('./voice/seoVoice.js');
      const r = await researchKeywords(seed);
      console.log(chalk.cyan('\n━━━ KEYWORDS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'seo-alttext': {
      const desc = flags['descripcion'] as string | undefined;
      const { suggestAltText } = await import('./voice/seoVoice.js');
      const r = await suggestAltText(desc);
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }

    // ── Phase 16: BI ───────────────────────────────────────────────────────
    case 'bi-dashboard': {
      const { createCustomDashboard } = await import('./voice/biVoice.js');
      const r = await createCustomDashboard();
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'bi-exportar': {
      const formato = flags['formato'] as string | undefined;
      const dias = Number(flags['dias'] ?? 30);
      const { exportData } = await import('./voice/biVoice.js');
      const r = await exportData(formato, dias);
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'bi-correlaciones': {
      const { analyzeCorrelations } = await import('./voice/biVoice.js');
      const r = await analyzeCorrelations();
      console.log(chalk.cyan('\n━━━ CORRELACIONES ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 17: Innovation ───────────────────────────────────────────────
    case 'innovacion-updates': {
      const { checkPlatformUpdates } = await import('./voice/innovationVoice.js');
      const r = await checkPlatformUpdates();
      console.log(chalk.cyan('\n━━━ UPDATES ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'innovacion-tendencias': {
      const horizonte = flags['horizonte'] as string | undefined;
      const { forecastTrends } = await import('./voice/innovationVoice.js');
      const r = await forecastTrends(horizonte);
      console.log(chalk.cyan('\n━━━ TENDENCIAS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'innovacion-playbook': {
      const feature = flags['feature'] as string | undefined;
      const { getEarlyAdopterPlaybook } = await import('./voice/innovationVoice.js');
      const r = await getEarlyAdopterPlaybook(feature);
      console.log(chalk.cyan('\n━━━ PLAYBOOK ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 18: Reporting ────────────────────────────────────────────────
    case 'reporte-pdf': {
      const periodo = flags['periodo'] as string | undefined;
      const { generatePdfReport } = await import('./voice/reportingVoice.js');
      const r = await generatePdfReport(periodo);
      console.log(chalk.green(`✅ ${r.spokenResponse}`));
      break;
    }
    case 'reporte-ejecutivo': {
      const { generateExecutiveSummary } = await import('./voice/reportingVoice.js');
      const r = await generateExecutiveSummary();
      console.log(chalk.cyan('\n━━━ RESUMEN EJECUTIVO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'reporte-comparar': {
      const a = flags['a'] as string | undefined;
      const b = flags['b'] as string | undefined;
      const { comparePeriods } = await import('./voice/reportingVoice.js');
      const r = await comparePeriods(a, b);
      console.log(chalk.cyan('\n━━━ COMPARATIVA ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 19: Onboarding ───────────────────────────────────────────────
    case 'onboarding-tutorial': {
      const paso = Number(flags['paso'] ?? 1);
      const { startVoiceTutorial } = await import('./voice/onboardingVoice.js');
      const r = await startVoiceTutorial(paso);
      console.log(chalk.cyan('\n━━━ TUTORIAL ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'onboarding-tip': {
      const { getDailyTip } = await import('./voice/onboardingVoice.js');
      const r = await getDailyTip();
      console.log(chalk.yellow(`💡 ${r.spokenResponse}`));
      break;
    }
    case 'onboarding-progreso': {
      const { getOnboardingProgress } = await import('./voice/onboardingVoice.js');
      const r = await getOnboardingProgress();
      console.log(chalk.cyan('\n━━━ PROGRESO ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Phase 20: Integrations ─────────────────────────────────────────────
    case 'integraciones-webhooks': {
      const { checkWebhookStatus } = await import('./voice/integrationsVoice.js');
      const r = await checkWebhookStatus();
      console.log(chalk.cyan('\n━━━ WEBHOOKS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'integraciones-sync': {
      const { checkSyncStatus } = await import('./voice/integrationsVoice.js');
      const r = await checkSyncStatus();
      console.log(chalk.cyan('\n━━━ SYNC ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'integraciones-health': {
      const { getIntegrationHealth } = await import('./voice/integrationsVoice.js');
      const r = await getIntegrationHealth();
      console.log(chalk.cyan('\n━━━ INTEGRATION HEALTH ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'integraciones-apis': {
      const q = flags['query'] as string | undefined;
      const { searchApiDirectory } = await import('./voice/integrationsVoice.js');
      const r = await searchApiDirectory(q);
      console.log(chalk.cyan('\n━━━ APIs ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Competitive Intelligence ───────────────────────────────────────────
    case 'competencia-analisis': {
      const { runFullCompetitiveAnalysis } = await import('./voice/competitiveIntelligenceVoice.js');
      const r = await withSpinner('Analizando competencia', () => runFullCompetitiveAnalysis());
      console.log(chalk.cyan('\n━━━ INTELIGENCIA COMPETITIVA ━━━'));
      console.log(r.spokenResponse);
      if (r.detail && typeof r.detail === 'object') {
        const d = r.detail as Record<string, unknown>;
        console.log(chalk.gray(`\nCompetidores: ${d.competitors} | Virales: ${(d.viralPosts as unknown[]).length}`));
      }
      break;
    }
    case 'competencia-check': {
      const handle = flags['handle'] as string | undefined;
      if (!handle) throw new Error('Falta --handle=...');
      const { quickCompetitorCheck } = await import('./voice/competitiveIntelligenceVoice.js');
      const r = await quickCompetitorCheck(handle);
      console.log(chalk.cyan('\n━━━ CHECK RÁPIDO ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 21: Conversión ────────────────────────────────────────────────
    case 'conversion-funnel': {
      const { analyzeConversionFunnel } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Analizando funnel', () => analyzeConversionFunnel());
      console.log(chalk.cyan('\n━━━ FUNNEL DE CONVERSIÓN ━━━'));
      console.log(r.spokenResponse);
      if (r.detail) console.log(chalk.gray(JSON.stringify(r.detail, null, 2).slice(0, 500)));
      break;
    }
    case 'conversion-funnel-fix': {
      const bottleneck = flags['bottleneck'] as string | undefined;
      const { suggestFunnelFix } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Sugiriendo fix', () => suggestFunnelFix(bottleneck ?? 'awareness'));
      console.log(chalk.cyan('\n━━━ FIX DEL FUNNEL ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'conversion-scarcity': {
      const { generateScarcityCampaign } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Generando escasez', () => generateScarcityCampaign(flags['contexto'] ?? undefined));
      console.log(chalk.cyan('\n━━━ CAMPAÑA DE ESCASEZ ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'conversion-countdown': {
      if (!flags['evento'] || !flags['fecha']) throw new Error('Faltan --evento y --fecha');
      const { generateCountdownSequence } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Generando countdown', () =>
        generateCountdownSequence(flags['evento']!, flags['fecha']!),
      );
      console.log(chalk.cyan('\n━━━ COUNTDOWN ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'conversion-social-proof': {
      const { generateSocialProof } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Generando social proof', () => generateSocialProof());
      console.log(chalk.cyan('\n━━━ SOCIAL PROOF ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'conversion-oferta': {
      const { generateOffer } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Generando oferta', () => generateOffer(flags['tipo'], flags['contexto']));
      console.log(chalk.cyan('\n━━━ OFERTA ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'conversion-launch': {
      if (!flags['nombre']) throw new Error('Falta --nombre');
      const { generateLaunchSequence } = await import('./voice/conversionVoice.js');
      const r = await withSpinner('Generando secuencia', () => generateLaunchSequence(flags['nombre']!));
      console.log(chalk.cyan('\n━━━ SECUENCIA DE LANZAMIENTO ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 22: Perfil & Grid ─────────────────────────────────────────────
    case 'profile-audit': {
      const { auditProfile } = await import('./voice/profileVoice.js');
      const r = await withSpinner('Auditando perfil', () => auditProfile());
      console.log(chalk.cyan('\n━━━ AUDIT DE PERFIL ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'profile-highlights': {
      const { generateHighlightStrategy } = await import('./voice/profileVoice.js');
      const r = await withSpinner('Generando highlights', () => generateHighlightStrategy());
      console.log(chalk.cyan('\n━━━ HIGHLIGHTS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'profile-bio': {
      const { optimizeBio } = await import('./voice/profileVoice.js');
      const r = await withSpinner('Optimizando bio', () =>
        optimizeBio(flags['objetivo'] as 'followers' | 'leads' | 'sales' | 'authority' | undefined),
      );
      console.log(chalk.cyan('\n━━━ BIO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'profile-grid': {
      const { planGrid } = await import('./voice/profileVoice.js');
      const r = await withSpinner('Planificando grid', () =>
        planGrid(flags['posts'] ? Number(flags['posts']) : undefined),
      );
      console.log(chalk.cyan('\n━━━ GRID ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'profile-hooks': {
      const { getScrollStopHooks } = await import('./voice/profileVoice.js');
      const r = await withSpinner('Generando hooks', () => getScrollStopHooks());
      console.log(chalk.cyan('\n━━━ SCROLL-STOP HOOKS ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 23: Comunidad & Ritual ────────────────────────────────────────
    case 'ritual-crear': {
      const { createRituals } = await import('./voice/ritualVoice.js');
      const r = await withSpinner('Creando rituales', () => createRituals());
      console.log(chalk.cyan('\n━━━ RITUALES ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ritual-insider': {
      const { createInsiderContent } = await import('./voice/ritualVoice.js');
      const r = await withSpinner('Generando insider content', () => createInsiderContent());
      console.log(chalk.cyan('\n━━━ INSIDER CONTENT ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ritual-naming': {
      const { suggestCommunityNames } = await import('./voice/ritualVoice.js');
      const r = await withSpinner('Sugiriendo nombres', () => suggestCommunityNames());
      console.log(chalk.cyan('\n━━━ NOMBRES DE COMUNIDAD ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ritual-manifesto': {
      if (!flags['nombre']) throw new Error('Falta --nombre');
      const { createCommunityManifesto } = await import('./voice/ritualVoice.js');
      const r = await withSpinner('Creando manifesto', () => createCommunityManifesto(flags['nombre']!));
      console.log(chalk.cyan('\n━━━ MANIFESTO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'ritual-loops': {
      const { createEngagementLoops } = await import('./voice/ritualVoice.js');
      const r = await withSpinner('Diseñando loops', () => createEngagementLoops());
      console.log(chalk.cyan('\n━━━ ENGAGEMENT LOOPS ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 24: Audiencia & Personas ──────────────────────────────────────
    case 'audience-segmentar': {
      const { segmentAudience } = await import('./voice/audienceVoice.js');
      const r = await withSpinner('Segmentando audiencia', () => segmentAudience());
      console.log(chalk.cyan('\n━━━ SEGMENTACIÓN ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'audience-journey': {
      if (!flags['persona']) throw new Error('Falta --persona');
      const { analyzePersonaJourney } = await import('./voice/audienceVoice.js');
      const r = await withSpinner('Analizando journey', () => analyzePersonaJourney(flags['persona']!));
      console.log(chalk.cyan('\n━━━ JOURNEY ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'audience-match': {
      const { matchContentToPersonas } = await import('./voice/audienceVoice.js');
      const r = await withSpinner('Emparejando contenido', () => matchContentToPersonas());
      console.log(chalk.cyan('\n━━━ CONTENT MATCH ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'audience-personalizar': {
      if (!flags['tema'] || !flags['segmentos']) throw new Error('Faltan --tema y --segmentos');
      const { generatePersonalizedVariants } = await import('./voice/audienceVoice.js');
      const r = await withSpinner('Personalizando', () =>
        generatePersonalizedVariants(flags['tema']!, flags['segmentos']!.split(',')),
      );
      console.log(chalk.cyan('\n━━━ PERSONALIZACIÓN ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'audience-rotacion': {
      const { suggestSegmentRotation } = await import('./voice/audienceVoice.js');
      const r = await withSpinner('Sugiriendo rotación', () => suggestSegmentRotation());
      console.log(chalk.cyan('\n━━━ ROTACIÓN SEMANAL ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 25: FOMO & Episodic ───────────────────────────────────────────
    case 'fomo-serie': {
      const { createEpisodicSeries } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Creando serie', () =>
        createEpisodicSeries(flags['tema'], flags['episodios'] ? Number(flags['episodios']) : undefined),
      );
      console.log(chalk.cyan('\n━━━ SERIE EPISÓDICA ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-countdown': {
      if (!flags['evento'] || !flags['fecha']) throw new Error('Faltan --evento y --fecha');
      const { generateCountdown } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Generando countdown', () => generateCountdown(flags['evento']!, flags['fecha']!));
      console.log(chalk.cyan('\n━━━ COUNTDOWN ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-teaser': {
      if (!flags['evento']) throw new Error('Falta --evento');
      const { generateTeaserDrop } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Generando teaser', () => generateTeaserDrop(flags['evento']!));
      console.log(chalk.cyan('\n━━━ TEASER DROP ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-hooks': {
      const { generateMustFollowHooks } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Generando hooks', () => generateMustFollowHooks());
      console.log(chalk.cyan('\n━━━ MUST-FOLLOW HOOKS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-profile-hook': {
      const { craftProfileHook } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Creando hook de perfil', () => craftProfileHook());
      console.log(chalk.cyan('\n━━━ PROFILE HOOK ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-trending': {
      const { detectTrending } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Detectando tendencias', () => detectTrending());
      console.log(chalk.cyan('\n━━━ TRENDING ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-anticipation': {
      if (!flags['evento']) throw new Error('Falta --evento');
      const { designAnticipationArc } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando arco', () =>
        designAnticipationArc(flags['evento']!, flags['dias'] ? Number(flags['dias']) : undefined),
      );
      console.log(chalk.cyan('\n━━━ ARCO DE ANTICIPACIÓN ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-drop': {
      const { designDrop } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando drop', () => designDrop(flags['tipo'], flags['contexto']));
      console.log(chalk.cyan('\n━━━ DROP ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-drop-series': {
      if (!flags['nombre']) throw new Error('Falta --nombre');
      const { designDropSeries } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando serie de drops', () => designDropSeries(flags['nombre']!));
      console.log(chalk.cyan('\n━━━ DROP SERIES ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-efimero': {
      const { createDisappearingContent } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Creando contenido efímero', () =>
        createDisappearingContent(flags['tema'] ?? undefined),
      );
      console.log(chalk.cyan('\n━━━ CONTENIDO EFÍMERO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-counters': {
      const { generateSocialCounters } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Generando contadores', () => generateSocialCounters());
      console.log(chalk.cyan('\n━━━ SOCIAL COUNTERS ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-gamified': {
      const { designGamifiedFomo } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando gamificación', () => designGamifiedFomo());
      console.log(chalk.cyan('\n━━━ GAMIFIED FOMO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-insider': {
      const { designInsiderSystem } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando insider system', () => designInsiderSystem());
      console.log(chalk.cyan('\n━━━ INSIDER SYSTEM ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-visual': {
      const { generateVisualFomo } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Generando visual FOMO', () => generateVisualFomo());
      console.log(chalk.cyan('\n━━━ VISUAL FOMO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-swipe-reveal': {
      if (!flags['tema']) throw new Error('Falta --tema');
      const { designSwipeToReveal } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando swipe reveal', () => designSwipeToReveal(flags['tema']!));
      console.log(chalk.cyan('\n━━━ SWIPE TO REVEAL ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-campaign': {
      const { designFomoCampaign } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Diseñando campaña FOMO', () =>
        designFomoCampaign(flags['tema'], flags['dias'] ? Number(flags['dias']) : undefined),
      );
      console.log(chalk.cyan('\n━━━ CAMPAÑA FOMO ━━━'));
      console.log(r.spokenResponse);
      break;
    }
    case 'fomo-playbook': {
      const { getFomoPlaybook } = await import('./voice/fomoVoice.js');
      const r = await withSpinner('Obteniendo playbook', () => getFomoPlaybook());
      console.log(chalk.cyan('\n━━━ FOMO PLAYBOOK ━━━'));
      console.log(r.spokenResponse);
      break;
    }

    // ── Fase 26: CEREBRO (BRAIN) ───────────────────────────────────────────
    case 'brain-stats': {
      const { getBrainStats } = await import('./brain/core/cortex.js');
      const stats = getBrainStats();
      console.log(chalk.cyan('\n━━━ CEREBRO FEEDIA ━━━'));
      console.log(JSON.stringify(stats, null, 2));
      break;
    }
    case 'brain-recall': {
      const query = flags['query'] ?? positional.join(' ');
      if (!query) throw new Error('Falta --query');
      const { recall } = await import('./brain/core/cortex.js');
      const r = await withSpinner('Consultando memoria cerebral', () => recall(query));
      console.log(chalk.cyan('\n━━━ MEMORIA ━━━'));
      console.log(r.context || 'Sin resultados');
      break;
    }
    case 'brain-viral': {
      const content = flags['content'] ?? positional.join(' ');
      if (!content) throw new Error('Falta --content');
      const { predictViralPotential } = await import('./brain/reasoning/viralScoring.js');
      const r = await withSpinner('Prediciendo viralidad', () =>
        predictViralPotential(content, flags['niche'] ?? brand.niche, flags['format']),
      );
      console.log(chalk.cyan(`\n━━━ SCORE VIRAL: ${(r.score * 100).toFixed(0)}% ━━━`));
      console.log('Razones:', r.reasoning.join('; '));
      console.log('Sugerencias:', r.suggestions.join('; '));
      break;
    }
    case 'brain-content': {
      const topic = flags['topic'] ?? positional.join(' ');
      if (!topic) throw new Error('Falta --topic');
      const { generateContent } = await import('./brain/actuators/contentActuator.js');
      const r = await withSpinner('Generando contenido enriquecido', () =>
        generateContent({
          topic,
          niche: brand.niche,
          brandName: brand.name,
          format: (flags['format'] as 'carousel' | 'reel' | 'story' | 'post' | 'caption') ?? 'post',
        }),
      );
      console.log(chalk.cyan(`\n━━━ CONTENIDO (Score viral predicho: ${(r.predictedScore * 100).toFixed(0)}%) ━━━`));
      console.log(r.context);
      console.log('\nHook:', r.hookSuggestion);
      console.log('CTA:', r.ctaSuggestion);
      break;
    }
    case 'brain-decision': {
      const options = (flags['options'] ?? 'A|B').split('|');
      const { makeDecision } = await import('./brain/actuators/decisionActuator.js');
      const r = await withSpinner('Tomando decisión estratégica', () =>
        makeDecision({
          type: (flags['tipo'] as 'post' | 'reply' | 'campaign' | 'strategy' | 'escalation') ?? 'strategy',
          options,
          context: {},
          niche: brand.niche,
          brandName: brand.name,
        }),
      );
      console.log(chalk.cyan(`\n━━━ DECISIÓN: ${r.chosen} (${(r.confidence * 100).toFixed(0)}%) ━━━`));
      console.log('Razonamiento:', r.reasoning.join('\n'));
      if (r.risks.length) console.log('Riesgos:', r.risks.join('; '));
      break;
    }
    case 'brain-ingest': {
      const content = flags['content'] ?? positional.join(' ');
      if (!content) throw new Error('Falta --content');
      const { ingest } = await import('./brain/core/cortex.js');
      await ingest({
        type:
          (flags['fuente'] as 'message' | 'post' | 'trend' | 'insight' | 'feedback' | 'decision' | 'system') ??
          'system',
        content,
        importance: 0.7,
      });
      console.log(chalk.green('✓ Guardado en memoria cerebral'));
      break;
    }
    case 'brain-trends': {
      const { getTrendingTopics } = await import('./brain/sensors/trendSensor.js');
      const r = await withSpinner('Analizando tendencias', () => getTrendingTopics(flags['niche'] ?? brand.niche, 10));
      console.log(chalk.cyan('\n━━━ TENDENCIAS ━━━'));
      for (const t of r)
        console.log(`  • ${t.topic} (${t.platform}) — señal ${(t.signal * 100).toFixed(0)}% [${t.velocity}]`);
      break;
    }
    case 'brain-personality': {
      const { getPersonalityContext } = await import('./brain/reasoning/personalityEngine.js');
      const ctx = getPersonalityContext(flags['target'] ?? brand.name);
      console.log(chalk.cyan('\n━━━ PERSONALIDAD ━━━'));
      console.log(ctx || 'Sin perfil registrado');
      break;
    }
    case 'brain-community-greeting': {
      const handle = flags['handle'] ?? positional[0];
      if (!handle) throw new Error('Falta --handle');
      const { getGreeting } = await import('./brain/community/communityManager.js');
      console.log(chalk.cyan('\n━━━ SALUDO PERSONALIZADO ━━━'));
      console.log(getGreeting(handle));
      break;
    }
    case 'brain-community-audit': {
      const { auditCommunity, getStats } = await import('./brain/community/communityManager.js');
      auditCommunity();
      const stats = getStats();
      console.log(chalk.cyan('\n━━━ AUDITORÍA COMUNIDAD ━━━'));
      console.log(JSON.stringify(stats, null, 2));
      break;
    }
    case 'brain-human-reply': {
      const handle = flags['handle'] ?? positional[0];
      const message = flags['message'] ?? positional.slice(1).join(' ');
      if (!handle || !message) throw new Error('Faltan --handle y --message');
      const { craftHumanResponse } = await import('./brain/community/humanResponse.js');
      const r = await withSpinner('Crafteando respuesta humana', () =>
        craftHumanResponse({
          handle,
          message,
          platform: 'instagram',
          type: (flags['tipo'] as 'comment' | 'dm' | 'story_reply') ?? 'comment',
          brandNiche: brand.niche,
          brandTone: brand.voice?.tone ?? ['amigable'],
        }),
      );
      console.log(chalk.cyan('\n━━━ RESPUESTA HUMANA ━━━'));
      console.log(r.text);
      console.log(`Tone: ${r.tone} | Emojis: ${r.emojiCount} | Confidence: ${(r.confidence * 100).toFixed(0)}%`);
      break;
    }
    case 'brain-stalker': {
      const handle = flags['handle'] ?? positional[0];
      const { getIntelBrief, assessAccountRisk } = await import('./brain/community/stalkerTracker.js');
      if (handle) {
        const intel = getIntelBrief(handle);
        console.log(chalk.cyan(`\n━━━ INTEL @${handle} ━━━`));
        console.log(intel ? JSON.stringify(intel, null, 2) : 'Sin datos');
      } else {
        const risk = assessAccountRisk();
        console.log(chalk.cyan('\n━━━ INTELIGENCIA GENERAL ━━━'));
        console.log(JSON.stringify(risk, null, 2));
      }
      break;
    }
    case 'brain-profile': {
      const { auditProfile, generateOptimizedBio } = await import('./brain/aesthetic/profileOptimizer.js');
      const bio = flags['bio'] ?? '';
      const highlights = (flags['highlights'] ?? '').split(',').filter(Boolean);
      const r = await withSpinner('Auditando perfil', () => auditProfile(brand.name, bio, highlights, [], brand.niche));
      console.log(chalk.cyan(`\n━━━ PERFIL: NOTA ${r.overall.grade} ━━━`));
      console.log(JSON.stringify(r, null, 2));
      const optimized = generateOptimizedBio(
        brand.niche,
        r.bio.keywords,
        r.bio.ctaPresent ? 'Link en bio' : 'DM info',
        'Ayudando a cientos',
      );
      console.log('\nBio optimizada sugerida:');
      console.log(optimized);
      break;
    }
    case 'brain-aesthetic': {
      const { analyzeCohesion, getContentDirection } = await import('./brain/aesthetic/aestheticEngine.js');
      const r = await withSpinner('Analizando cohesión visual', () => analyzeCohesion(brand.name, [], []));
      console.log(chalk.cyan(`\n━━━ COHESIÓN VISUAL: ${(r.overallScore * 100).toFixed(0)}% ━━━`));
      console.log(JSON.stringify(r, null, 2));
      const direction = getContentDirection(brand.name);
      console.log('\nDirección de contenido:', direction.captions[0]);
      break;
    }
    case 'brain-partners': {
      const { getTopCandidates } = await import('./brain/growth/partnershipEngine.js');
      const candidates = getTopCandidates(10, 0.4);
      console.log(chalk.cyan('\n━━━ SOCIOS POTENCIALES ━━━'));
      for (const c of candidates) console.log(`  • @${c.handle} | ${c.niche} | Score: ${(c.score * 100).toFixed(0)}%`);
      break;
    }
    case 'brain-niche': {
      const nicheName = flags['nombre'] ?? brand.niche;
      const { getNiche, getOpportunities, getBestSegment } = await import('./brain/growth/nicheMastery.js');
      const profile = getNiche(nicheName);
      const ops = getOpportunities(nicheName);
      const segment = getBestSegment(
        nicheName,
        (flags['objetivo'] as 'engagement' | 'conversion' | 'awareness' | 'community') ?? 'conversion',
      );
      console.log(chalk.cyan(`\n━━━ NICHO: ${nicheName} ━━━`));
      console.log(
        JSON.stringify(
          {
            profile: { name: profile.name, segments: profile.audienceSegments.length, gaps: profile.contentGaps },
            opportunities: ops,
            bestSegment: segment,
          },
          null,
          2,
        ),
      );
      break;
    }
    case 'brain-trend-sync': {
      const { getTrendsForNiche, getTrendContentIdeas } = await import('./brain/growth/trendSync.js');
      const trends = getTrendsForNiche(brand.niche, 0.3);
      const ideas = getTrendContentIdeas(brand.niche);
      console.log(chalk.cyan(`\n━━━ TREND SYNC: ${brand.niche} ━━━`));
      for (const t of trends.slice(0, 5)) console.log(`  • ${t.topic} [${t.type}] — ${t.velocity}`);
      console.log('\nIdeas:');
      for (const i of ideas.slice(0, 5)) console.log(`  • ${i.trend}: ${i.idea} (${i.urgency})`);
      break;
    }
    case 'brain-orchestrator': {
      const { think } = await import('./brain/core/orchestrator.js');
      const decisions = await withSpinner('Pensando estratégicamente', () =>
        think({ name: brand.name, niche: brand.niche, handle: brand.name, tone: brand.voice?.tone ?? ['amigable'] }),
      );
      console.log(chalk.cyan(`\n━━━ DECISIONES ESTRATÉGICAS ━━━`));
      for (const d of decisions.slice(0, 5)) {
        console.log(`\n[${d.priority.toUpperCase()}] ${d.action}`);
        console.log('  Razonamiento:', d.reasoning.join('; '));
      }
      break;
    }
    case 'brain-competitor': {
      const handle = flags['handle'] ?? positional[0];
      const { getCompetitorIntel, getMarketGaps } = await import('./brain/growth/competitorBrain.js');
      if (handle) {
        const intel = getCompetitorIntel(handle);
        console.log(chalk.cyan(`\n━━━ COMPETIDOR @${handle} ━━━`));
        console.log(intel ? JSON.stringify(intel, null, 2) : 'Sin datos');
      } else {
        const gaps = getMarketGaps(brand.niche);
        console.log(chalk.cyan('\n━━━ GAPS DE MERCADO ━━━'));
        for (const g of gaps) console.log(`  • ${g.gap}: ${g.opportunity}`);
      }
      break;
    }
    case 'brain-revenue': {
      const { predictContentRevenue, getROIInsights } = await import('./brain/growth/revenueEngine.js');
      const reach = flags['reach'] ? Number(flags['reach']) : 5000;
      const engagement = flags['engagement'] ? Number(flags['engagement']) : 500;
      const pred = predictContentRevenue(
        {
          format: flags['format'] ?? 'reel',
          predictedReach: reach,
          predictedEngagement: engagement,
          goal: (flags['goal'] as 'awareness' | 'engagement' | 'conversion') ?? 'conversion',
        },
        brand.niche,
      );
      const roi = getROIInsights(brand.niche);
      console.log(chalk.cyan(`\n━━━ REVENUE PREDICHO: $${pred.predictedRevenue} ━━━`));
      console.log(JSON.stringify({ prediction: pred, roi }, null, 2));
      break;
    }
    case 'brain-recycler': {
      const { getRecycleCandidates, getStats } = await import('./brain/memory/contentRecycler.js');
      const candidates = getRecycleCandidates(brand.niche, 5);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ RECYCLER: ${stats.readyToRecycle} listos ━━━`));
      for (const c of candidates)
        console.log(
          `  • [${c.performance.sentiment}] ${c.content.slice(0, 80)}... (score: ${c.recycleScore.toFixed(2)})`,
        );
      break;
    }
    case 'brain-crisis': {
      const { getActiveThreats, getStats } = await import('./brain/reasoning/crisisPredictor.js');
      const threats = getActiveThreats();
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ CRISIS: ${stats.active} activas, ${stats.critical} críticas ━━━`));
      for (const t of threats)
        console.log(`  • [${t.severity.toUpperCase()}] ${t.type}: ${t.metric}=${t.current} (baseline: ${t.baseline})`);
      break;
    }
    case 'brain-crossbrand': {
      const { getUniversalPatterns, getStats } = await import('./brain/growth/crossBrandLearning.js');
      const patterns = getUniversalPatterns(undefined, 10);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ CROSS-BRAND: ${stats.insights} insights, ${stats.brands} marcas ━━━`));
      for (const p of patterns)
        console.log(`  • ${p.category}: "${p.pattern}" (${p.niche}, conf=${(p.confidence * 100).toFixed(0)}%)`);
      break;
    }
    case 'brain-lifecycle': {
      const handle = flags['handle'] ?? positional[0];
      const { getRecord, getFunnelStats, getAtRiskUsers, getHighValueUsers } =
        await import('./brain/community/audienceLifecycle.js');
      if (handle) {
        const r = getRecord(handle);
        console.log(chalk.cyan(`\n━━━ LIFECYCLE @${handle} ━━━`));
        console.log(r ? JSON.stringify(r, null, 2) : 'Sin registro');
      } else {
        const funnel = getFunnelStats();
        const atRisk = getAtRiskUsers(5);
        const highValue = getHighValueUsers(5);
        console.log(chalk.cyan('\n━━━ FUNNEL ━━━'));
        console.log(JSON.stringify(funnel, null, 2));
        console.log(`\nEn riesgo: ${atRisk.length} | Alto valor: ${highValue.length}`);
      }
      break;
    }
    case 'brain-listening': {
      const { getContentOpportunities, getPainPoints, getStats } = await import('./brain/sensors/socialListening.js');
      const ops = getContentOpportunities(brand.niche);
      const pains = getPainPoints(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ SOCIAL LISTENING: ${stats.totalSignals} señales ━━━`));
      console.log('\nPain Points:');
      for (const p of pains) console.log(`  • ${p.pain} (intensidad: ${p.intensity}) → ${p.solution}`);
      console.log('\nOportunidades:');
      for (const o of ops) console.log(`  • ${o.topic}: ${o.suggestion}`);
      break;
    }
    case 'brain-sequence': {
      const title = flags['titulo'] ?? positional.join(' ');
      const episodes = flags['episodios'] ? Number(flags['episodios']) : 5;
      const { createSequence } = await import('./brain/actuators/sequencingEngine.js');
      const seq = createSequence(
        title || `Serie ${brand.niche}`,
        brand.niche,
        brand.niche,
        episodes,
        'engagement',
        'general',
      );
      console.log(chalk.cyan(`\n━━━ SECUENCIA: "${seq.title}" ━━━`));
      for (const ep of seq.episodes) console.log(`  ${ep.number}. [${ep.format}] ${ep.hook}`);
      break;
    }
    case 'brain-vision': {
      const { getVisualRecommendations, getStats } = await import('./brain/sensors/visionBrain.js');
      const recs = getVisualRecommendations(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ VISUAL: ${stats.patterns} patrones ━━━`));
      console.log('Estilos top:', recs.bestStyles.join(', '));
      console.log('Colores top:', recs.bestColors.slice(0, 3).join(', '));
      console.log('Tips:', recs.tips.join('; '));
      break;
    }
    case 'brain-video': {
      const { getVideoFormula, getStats } = await import('./brain/sensors/videoBrain.js');
      const formula = getVideoFormula(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ VIDEO: ${stats.patterns} patrones ━━━`));
      console.log(`Duración óptima: ${formula.optimalDuration}s`);
      console.log(
        `Hook: ${formula.bestHook} | Transición: ${formula.bestTransition} | Caption: ${formula.bestCaption}`,
      );
      console.log('Tips:', formula.tips.join('; '));
      break;
    }
    case 'brain-dream': {
      const { dream } = await import('./brain/reasoning/dreamEngine.js');
      const insights = await withSpinner('Soñando...', () => dream(brand.niche));
      console.log(chalk.cyan(`\n━━━ DREAM ENGINE: ${insights.length} insights ━━━`));
      for (const i of insights)
        console.log(`  • [${(i.confidence * 100).toFixed(0)}%] ${i.insight} → ${i.suggestedAction}`);
      break;
    }
    case 'brain-emotional': {
      const { getEmotionalFormula, getStats } = await import('./brain/reasoning/emotionalResonance.js');
      const formula = getEmotionalFormula(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ EMOTIONAL: ${stats.records} registros ━━━`));
      console.log('Top emociones:', formula.topEmotions.join(', '));
      console.log('Recomendación:', formula.recommendation);
      break;
    }
    case 'brain-forecast': {
      const { forecast } = await import('./brain/reasoning/contentForecaster.js');
      const result = await withSpinner('Forescasting...', () => forecast(brand.niche, brand.voice?.tone ?? []));
      console.log(chalk.cyan(`\n━━━ FORECAST: ${result.predictions.length} predicciones ━━━`));
      for (const p of result.predictions)
        console.log(`  • [${p.urgency}] ${p.type} (${p.format}): ${p.suggestedAngle}`);
      console.log('\nGaps:', result.gaps.join(', '));
      console.log('Oportunidades:', result.opportunities.join('; '));
      break;
    }
    case 'brain-evolution': {
      const { analyzeEvolution, getEvolutionReport } = await import('./brain/growth/brandEvolution.js');
      const suggestions = analyzeEvolution(brand.niche);
      const report = getEvolutionReport(brand.niche);
      console.log(chalk.cyan(`\n━━━ EVOLUCIÓN: ${report.snapshots} snapshots | Tendencia: ${report.recentTrend} ━━━`));
      for (const s of suggestions) console.log(`  • [${s.urgency}] ${s.type}: ${s.description}`);
      break;
    }
    case 'brain-loop': {
      const { getOptimalLoop, getPeakHours, getStats } = await import('./brain/growth/engagementLoop.js');
      const loop = getOptimalLoop(brand.niche, flags['tipo'] ?? 'reel');
      const peaks = getPeakHours(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ LOOP: ${stats.loops} loops registrados ━━━`));
      console.log(`Próxima acción: ${loop.nextAction} en ${loop.waitHours}h (${loop.urgency})`);
      console.log('Peak hours:', peaks.join(', '));
      break;
    }
    case 'brain-hashtags': {
      const { getHashtagStrategy, findEmergingHashtags, getStats } = await import('./brain/growth/hashtagEcosystem.js');
      const strategy = getHashtagStrategy(brand.niche);
      const emerging = findEmergingHashtags(brand.niche);
      const stats = getStats();
      console.log(chalk.cyan(`\n━━━ HASHTAGS: ${stats.tags} tags, ${stats.clusters} clusters ━━━`));
      console.log('Mix recomendado:', strategy.mix);
      for (const t of strategy.tags.slice(0, 10))
        console.log(`  • #${t.tag} [${t.size}] — score ${t.score}% | ${t.why}`);
      console.log('Emergentes:', emerging.map((h) => `#${h}`).join(', '));
      break;
    }

    // ── Sprint 5: Monetización & Paid Growth ────────────────────────────

    case 'meta-campaign-listar': {
      const { getCampaigns } = await import('./integrations/metaAds.js');
      const estado = flags['estado'] as 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | undefined;
      const campaigns = await withSpinner('Listando campañas', () => getCampaigns(estado));
      console.log(chalk.cyan(`\n━━━ CAMPAÑAS META ADS ━━━`));
      for (const c of campaigns) {
        console.log(`  • ${c.name} [${c.status}] — Budget: $${c.dailyBudget ?? 'n/a'}/día | Objective: ${c.objective}`);
      }
      break;
    }

    case 'meta-campaign-crear': {
      const { createCampaign } = await import('./integrations/metaAds.js');
      const nombre = flags['nombre'];
      const objetivo = flags['objetivo'] as
        | 'AWARENESS'
        | 'TRAFFIC'
        | 'ENGAGEMENT'
        | 'LEADS'
        | 'SALES'
        | 'APP_PROMOTION';
      const presupuesto = flags['presupuesto'] ? Number(flags['presupuesto']) : 50;
      if (!nombre || !objetivo) throw new Error('Faltan --nombre y --objetivo');
      const campaign = await withSpinner('Creando campaña', () =>
        createCampaign({
          name: nombre,
          objective: objetivo,
          dailyBudget: presupuesto,
          status: 'PAUSED',
        }),
      );
      console.log(chalk.cyan(`\n━━━ CAMPAÑA CREADA ━━━`));
      console.log(JSON.stringify(campaign, null, 2));
      break;
    }

    case 'meta-campaign-insights': {
      const { getCampaignInsights } = await import('./integrations/metaAds.js');
      const campaignId = flags['campaignId'];
      if (!campaignId) throw new Error('Falta --campaignId');
      const insights = await withSpinner('Obteniendo insights', () => getCampaignInsights([campaignId]));
      console.log(chalk.cyan(`\n━━━ INSIGHTS ━━━`));
      if (insights.length > 0 && insights[0]) {
        console.log(`Campaña: ${insights[0].campaignName}`);
        console.log(JSON.stringify(insights[0], null, 2));
      } else {
        console.log('Sin datos de insights');
      }
      break;
    }

    case 'meta-campaign-optimizar': {
      const { optimizeBudget } = await import('./integrations/metaAds.js');
      const campaignId = flags['campaignId'];
      if (!campaignId) throw new Error('Falta --campaignId');
      const result = await withSpinner('Optimizando campaña', () => optimizeBudget(campaignId, 2.0));
      console.log(chalk.cyan(`\n━━━ OPTIMIZACIÓN ━━━`));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'meta-budget-rebalance': {
      const { getCampaigns, optimizeBudget } = await import('./integrations/metaAds.js');
      const campaigns = await getCampaigns('ACTIVE');
      const results: Array<{ campaignId: string; name: string; action: string; newBudget?: number; error?: string }> =
        [];
      for (const c of campaigns) {
        const r = await optimizeBudget(c.id, 2.0);
        results.push({ campaignId: c.id, name: c.name, action: r.action, newBudget: r.newBudget, error: r.error });
      }
      console.log(chalk.cyan(`\n━━━ REBALANCEO (${results.length} campañas) ━━━`));
      for (const r of results) {
        console.log(
          `  • ${r.name}: ${r.action}${r.newBudget ? ` → $${r.newBudget}` : ''}${r.error ? ` [ERROR: ${r.error}]` : ''}`,
        );
      }
      break;
    }

    case 'sales-pipeline': {
      const { getPipelineSummary } = await import('./capabilities/pipelineCRM.js');
      const summary = getPipelineSummary();
      console.log(chalk.cyan(`\n━━━ PIPELINE DE VENTAS ━━━`));
      console.log(
        `Total deals: ${summary.totalDeals} | Valor total: $${summary.totalValue} | Win rate: ${(summary.winRate * 100).toFixed(1)}%`,
      );
      for (const stage of summary.stages) {
        console.log(`  ${stage.stage}: ${stage.count} deals ($${stage.value}) — avg ${stage.avgDays.toFixed(1)} días`);
      }
      break;
    }

    case 'sales-deal-agregar': {
      const { addDeal } = await import('./capabilities/pipelineCRM.js');
      const titulo = flags['titulo'];
      const value = flags['value'] ? Number(flags['value']) : 0;
      if (!titulo) throw new Error('Falta --titulo');
      const deal = addDeal({
        title: titulo,
        value,
        stage:
          (flags['stage'] as
            | 'nuevo'
            | 'calificado'
            | 'propuesta-enviada'
            | 'negociacion'
            | 'cerrado-ganado'
            | 'cerrado-perdido') ?? 'nuevo',
        source: flags['source'] ?? 'manual',
      });
      console.log(chalk.cyan(`\n━━━ DEAL AGREGADO ━━━`));
      console.log(JSON.stringify(deal, null, 2));
      break;
    }

    case 'sales-deal-mover': {
      const { advanceDeal } = await import('./capabilities/pipelineCRM.js');
      const id = flags['id'];
      const stage = flags['stage'] as
        | 'nuevo'
        | 'calificado'
        | 'propuesta-enviada'
        | 'negociacion'
        | 'cerrado-ganado'
        | 'cerrado-perdido';
      if (!id || !stage) throw new Error('Faltan --id y --stage');
      const deal = advanceDeal(id, stage, flags['note']);
      console.log(chalk.cyan(`\n━━━ DEAL MOVIDO ━━━`));
      console.log(JSON.stringify(deal, null, 2));
      break;
    }

    case 'sales-deal-cerrar': {
      const { advanceDeal } = await import('./capabilities/pipelineCRM.js');
      const id = flags['id'];
      const result = flags['result'];
      if (!id || !result) throw new Error('Faltan --id y --result');
      const finalStage = result === 'ganado' ? 'cerrado-ganado' : 'cerrado-perdido';
      const deal = advanceDeal(id, finalStage, `Cerrado: ${result}`);
      console.log(chalk.cyan(`\n━━━ DEAL CERRADO ━━━`));
      console.log(JSON.stringify(deal, null, 2));
      break;
    }

    case 'attribution-reporte': {
      const { getAttributionReport } = await import('./capabilities/revenueAttribution.js');
      const dias = flags['dias'] ? Number(flags['dias']) : 7;
      const report = getAttributionReport(dias);
      console.log(chalk.cyan(`\n━━━ ATRIBUCIÓN DE INGRESOS (${dias} días) ━━━`));
      console.log(JSON.stringify(report, null, 2));
      break;
    }

    case 'revenue-content-roas': {
      const { getContentAttribution } = await import('./capabilities/revenueAttribution.js');
      const limit = flags['limit'] ? Number(flags['limit']) : 10;
      const contents = getContentAttribution(limit);
      console.log(chalk.cyan(`\n━━━ ROAS POR CONTENIDO ━━━`));
      for (const c of contents) {
        console.log(
          `  • ${c.contentId}: $${c.revenue} rev | $${c.spend} spend | ROAS ${c.roas.toFixed(2)} | ${c.conversions} conv`,
        );
      }
      break;
    }

    case 'smart-boost': {
      const { getAgent } = await import('./agent/registry.js');
      const { runAgentTask } = await import('./agent/orchestrator.js');
      const agent = getAgent('analytics-inspector');
      if (!agent) throw new Error('analytics-inspector no registrado');
      const r = await withSpinner('Ejecutando Smart Boost Loop', () =>
        runAgentTask(
          brand,
          agent,
          `Analiza los últimos 7 días de ${brand.name}. Identifica el top performer y evalúa si merece boost pagado. Si el score > 70 y engagement > 5%, crea una recomendación de campaña.`,
          `smart-boost-${Date.now()}`,
        ),
      );
      console.log(chalk.cyan('\n━━━ SMART BOOST ━━━'));
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    case 'campaign-weekly-review': {
      const { getAgent } = await import('./agent/registry.js');
      const { runAgentTask } = await import('./agent/orchestrator.js');
      const agent = getAgent('paid-media-manager');
      if (!agent) throw new Error('paid-media-manager no registrado');
      const r = await withSpinner('Ejecutando Weekly Review', () =>
        runAgentTask(
          brand,
          agent,
          `Auditoría semanal de paid media para ${brand.name}: 1) Listar campañas activas, 2) Optimizar presupuestos de campañas con ROAS > 2.0, 3) Pausar campañas con ROAS < 1.5 por más de 3 días, 4) Proponer 2-3 experimentos A/B. Reporta acciones tomadas.`,
          `weekly-review-${Date.now()}`,
        ),
      );
      console.log(chalk.cyan('\n━━━ WEEKLY REVIEW ━━━'));
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    // ── Sprint 6: TikTok Native + Audio AI ──────────────────────────────

    case 'tiktok-trends': {
      const { fetchTikTokTrends } = await import('./capabilities/tiktok/trendEngine.js');
      const trends = await withSpinner('Scrapeando trends de TikTok', () =>
        fetchTikTokTrends({ limit: Number(flags['limit'] ?? 20) }),
      );
      console.log(chalk.cyan('\n━━━ TIKTOK TRENDS ━━━'));
      for (const t of trends) console.log(`  [${t.type}] ${t.name} — velocity: ${t.velocity}/100 | ${t.freshness}`);
      break;
    }

    case 'tiktok-sounds': {
      const { fetchTikTokSounds } = await import('./capabilities/tiktok/trendEngine.js');
      const sounds = await withSpinner('Buscando trending sounds', () =>
        fetchTikTokSounds({ limit: Number(flags['limit'] ?? 10) }),
      );
      console.log(chalk.cyan('\n━━━ TRENDING SOUNDS ━━━'));
      for (const s of sounds) console.log(`  ${s.name} — ${s.bpm} BPM | drop: ${s.dropTimestamp}s`);
      break;
    }

    case 'tiktok-templates': {
      const { listTemplates } = await import('./capabilities/tiktok/videoTemplates.js');
      const templates = listTemplates({ bestFor: flags['tipo'], maxDifficulty: flags['dificultad'] });
      console.log(chalk.cyan('\n━━━ TIKTOK TEMPLATES ━━━'));
      for (const t of templates)
        console.log(
          `  ${t.name} [${t.difficulty}] — FYP score: ${t.fypScore} | ${t.durationRangeSec[0]}-${t.durationRangeSec[1]}s`,
        );
      break;
    }

    case 'tiktok-blueprint': {
      const { generateBlueprint } = await import('./capabilities/tiktok/videoTemplates.js');
      const templateId = flags['template'] ?? 'tt-tpl-fast-hook';
      const topic = flags['tema'] ?? brand.niche;
      const bp = generateBlueprint(templateId, topic);
      console.log(chalk.cyan(`\n━━━ BLUEPRINT: ${bp.templateId} ━━━`));
      for (const seg of bp.segments) console.log(`  ${seg.timestamp}: ${seg.instruction} [${seg.visualNote}]`);
      break;
    }

    case 'tiktok-fyp-score': {
      const { calculateFYPScore } = await import('./capabilities/tiktok/fypOptimizer.js');
      const metrics = {
        completionRate: Number(flags['completion'] ?? 0.5),
        watchTimePct: Number(flags['watchtime'] ?? 0.5),
        fypReachPct: Number(flags['fyp'] ?? 0.3),
        rewatchRate: Number(flags['rewatch'] ?? 0.1),
        shareRate: Number(flags['share'] ?? 0.01),
        commentRate: Number(flags['comment'] ?? 0.02),
        saveRate: Number(flags['save'] ?? 0.01),
        followsPerView: Number(flags['follows'] ?? 0.001),
        avgViewDurationSec: Number(flags['avgview'] ?? 10),
        videoLengthSec: Number(flags['duration'] ?? 15),
      };
      const score = calculateFYPScore(metrics);
      console.log(chalk.cyan(`\n━━━ FYP SCORE: ${score.overall}/100 ━━━`));
      console.log(`Veredicto: ${score.verdict}`);
      for (const r of score.recommendations) console.log(`  • ${r}`);
      break;
    }

    case 'audio-music': {
      const { generateMusic } = await import('./capabilities/audio/musicGeneration.js');
      const track = await withSpinner('Generando música AI', () =>
        generateMusic({
          prompt: flags['prompt'] ?? `Música para ${brand.niche}`,
          durationSec: Number(flags['duracion'] ?? 15),
          mood: (flags['mood'] as 'energetic' | 'chill' | 'epic' | 'emotional' | 'upbeat' | 'dark') ?? 'upbeat',
          instrumental: true,
        }),
      );
      console.log(chalk.cyan(`\n━━━ MÚSICA AI: ${track.trackId} ━━━`));
      console.log(JSON.stringify(track, null, 2));
      break;
    }

    case 'audio-voiceover': {
      const { generateVoiceoverForScript } = await import('./capabilities/audio/voiceCloning.js');
      const script = flags['script'] ?? `Hola, somos ${brand.name}`;
      const voice = await withSpinner('Generando voiceover', () => generateVoiceoverForScript(script, flags['voz']));
      console.log(chalk.cyan(`\n━━━ VOICEOVER ━━━`));
      console.log(JSON.stringify(voice, null, 2));
      break;
    }

    case 'audio-sfx': {
      const { generateSFX, getSFXPreset } = await import('./capabilities/audio/sfxGeneration.js');
      const preset = flags['preset'] ? getSFXPreset(flags['preset']) : undefined;
      const sfx =
        preset ??
        (await withSpinner('Generando SFX', () =>
          generateSFX({ description: flags['descripcion'] ?? 'Transition whoosh sound' }),
        ));
      console.log(chalk.cyan(`\n━━━ SFX ━━━`));
      console.log(JSON.stringify(sfx, null, 2));
      break;
    }

    case 'audio-sound-design': {
      const { autoDesignForVideo, createSoundDesign } = await import('./capabilities/audio/soundDesign.js');
      const recipe = autoDesignForVideo(
        (flags['formato'] as 'reel' | 'tiktok') ?? 'reel',
        Number(flags['duracion'] ?? 15),
        flags['tema'] ?? brand.niche,
        Boolean(flags['voiceover']),
      );
      const project = createSoundDesign(`${brand.name} - ${flags['tema'] ?? 'video'}`, Number(flags['duracion'] ?? 15));
      console.log(chalk.cyan(`\n━━━ SOUND DESIGN: ${recipe.name} ━━━`));
      console.log(JSON.stringify({ recipe, project }, null, 2));
      break;
    }

    case 'audio-dub': {
      const { dubVideo } = await import('./capabilities/audio/autoDubbing.js');
      const dub = await withSpinner('Doblando video', () =>
        dubVideo({
          sourceLanguage: flags['origen'] ?? 'es-AR',
          targetLanguage: flags['destino'] ?? 'en-US',
          script: flags['script'] ?? 'Bienvenidos a nuestro canal',
        }),
      );
      console.log(chalk.cyan(`\n━━━ DUB: ${dub.targetLanguage} ━━━`));
      console.log(JSON.stringify(dub, null, 2));
      break;
    }

    case 'tiktok-agent-run': {
      const { getAgent } = await import('./agent/registry.js');
      const { runAgentTask } = await import('./agent/orchestrator.js');
      const agent = getAgent('tiktok-native-specialist');
      if (!agent) throw new Error('tiktok-native-specialist no registrado');
      const r = await withSpinner('Ejecutando TikTok Specialist', () =>
        runAgentTask(
          brand,
          agent,
          flags['goal'] ?? `Crea un plan de contenido TikTok para ${brand.name}`,
          `tiktok-agent-${Date.now()}`,
        ),
      );
      console.log(chalk.cyan('\n━━━ TIKTOK AGENT ━━━'));
      console.log(JSON.stringify(r, null, 2));
      break;
    }

    // ── Sprint 7: Neural Brain + Vector DB ──────────────────────────────

    case 'neural-memory-stats': {
      const { getMemoryStats } = await import('./capabilities/neural/memoryGateway.js');
      const stats = getMemoryStats();
      console.log(chalk.cyan('\n━━━ NEURAL MEMORY STATS ━━━'));
      console.log(JSON.stringify(stats, null, 2));
      break;
    }

    case 'neural-memory-recall': {
      const { recallEpisodic, recallSemantic } = await import('./capabilities/neural/memoryGateway.js');
      const type = flags['type'] ?? 'episodic';
      const limit = Number(flags['limit'] ?? 10);
      const results =
        type === 'episodic'
          ? recallEpisodic({ agentId: flags['agentId'], limit })
          : recallSemantic(flags['conceptQuery'] ?? '', limit);
      console.log(chalk.cyan(`\n━━━ NEURAL MEMORY RECALL (${type}) ━━━`));
      console.log(JSON.stringify(results, null, 2));
      break;
    }

    case 'neural-memory-record': {
      const { recordEpisodic, recordSemantic } = await import('./capabilities/neural/memoryGateway.js');
      const type = flags['type'] ?? 'episodic';
      if (type === 'episodic') {
        const mem = recordEpisodic({
          agentId: flags['agentId'] ?? 'cli',
          taskId: flags['taskId'] ?? 'cli-task',
          action: flags['action'] ?? 'unknown',
          outcome: (flags['outcome'] as 'success' | 'partial' | 'failure') ?? 'partial',
          context: flags['context'] ?? '',
          tags: flags['tags'] ? String(flags['tags']).split(',') : [],
          importance: Number(flags['importance'] ?? 0.5),
        });
        console.log(chalk.cyan('\n━━━ EPISODIC MEMORY RECORDED ━━━'));
        console.log(JSON.stringify(mem, null, 2));
      } else {
        const mem = recordSemantic({
          concept: flags['concept'] ?? 'unknown',
          definition: flags['definition'] ?? '',
          relationships: [],
          source: flags['agentId'] ?? 'cli',
          confidence: Number(flags['importance'] ?? 0.5),
        });
        console.log(chalk.cyan('\n━━━ SEMANTIC MEMORY RECORDED ━━━'));
        console.log(JSON.stringify(mem, null, 2));
      }
      break;
    }

    case 'neural-learning-analyze': {
      const { analyzeStrategyPerformance } = await import('./capabilities/neural/learningLoop.js');
      const perf = analyzeStrategyPerformance(flags['agentId']);
      console.log(chalk.cyan('\n━━━ LEARNING ANALYSIS ━━━'));
      console.log(JSON.stringify(perf, null, 2));
      break;
    }

    case 'neural-focus-start': {
      const { startFocus } = await import('./capabilities/neural/attentionEngine.js');
      const focus = startFocus(
        flags['taskId'] ?? `focus-${Date.now()}`,
        flags['agentId'] ?? 'cli',
        Number(flags['estimatedMin'] ?? 15),
      );
      console.log(chalk.cyan('\n━━━ FOCUS STARTED ━━━'));
      console.log(JSON.stringify(focus, null, 2));
      break;
    }

    case 'neural-focus-end': {
      const { endFocus } = await import('./capabilities/neural/attentionEngine.js');
      const focus = endFocus(flags['taskId'] ?? 'unknown');
      console.log(chalk.cyan('\n━━━ FOCUS ENDED ━━━'));
      console.log(JSON.stringify(focus, null, 2));
      break;
    }

    case 'vector-store-query': {
      const { querySimilar } = await import('./capabilities/memory/vectorStore.js');
      const results = await querySimilar(flags['query'] ?? '', { topK: Number(flags['topK'] ?? 5) });
      console.log(chalk.cyan('\n━━━ VECTOR STORE QUERY ━━━'));
      for (const r of results) console.log(`  [${(1 - r.distance).toFixed(2)}] ${r.text.slice(0, 80)}...`);
      break;
    }

    case 'vector-store-add': {
      const { addDocument } = await import('./capabilities/memory/vectorStore.js');
      const doc = await addDocument({
        text: flags['text'] ?? '',
        metadata: flags['metadata'] ? JSON.parse(flags['metadata']) : {},
      });
      console.log(chalk.cyan('\n━━━ DOCUMENT ADDED ━━━'));
      console.log(JSON.stringify(doc, null, 2));
      break;
    }

    case 'rag-query': {
      const { queryRAG } = await import('./capabilities/memory/ragEngine.js');
      const result = await queryRAG({
        question: flags['question'] ?? '',
        topK: Number(flags['topK'] ?? 5),
      });
      console.log(chalk.cyan('\n━━━ RAG QUERY ━━━'));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'rag-ingest': {
      const { ingestKnowledge } = await import('./capabilities/memory/ragEngine.js');
      const count = await ingestKnowledge({
        text: flags['text'] ?? '',
        source: flags['source'] ?? 'cli',
        chunkSize: Number(flags['chunkSize'] ?? 500),
      });
      console.log(chalk.cyan('\n━━━ RAG INGEST ━━━'));
      console.log(`Ingested ${count} chunks`);
      break;
    }

    case 'semantic-search': {
      const { searchSimilar } = await import('./capabilities/memory/semanticSearch.js');
      const results = await searchSimilar(flags['query'] ?? '', {
        type: flags['type'] as 'post' | 'comment' | 'dm' | 'brief' | 'caption' | 'hashtag' | undefined,
        limit: Number(flags['limit'] ?? 5),
      });
      console.log(chalk.cyan('\n━━━ SEMANTIC SEARCH ━━━'));
      for (const r of results) console.log(`  [${r.similarity.toFixed(2)}] ${r.content.text.slice(0, 80)}...`);
      break;
    }

    // ── Sprint 8: Agent Swarm + Predictive ML ───────────────────────────

    case 'swarm-create': {
      const { createSwarm } = await import('./capabilities/swarm/swarmOrchestrator.js');
      const tasks = flags['tasks']
        ? JSON.parse(flags['tasks'])
        : [{ id: 't1', goal: flags['goal'] ?? 'Tarea default', agentId: 'content-creator', priority: 5 }];
      const swarm = createSwarm(flags['goal'] ?? 'Swarm default', tasks);
      console.log(chalk.cyan('\n━━━ SWARM CREATED ━━━'));
      console.log(JSON.stringify(swarm, null, 2));
      break;
    }

    case 'swarm-run': {
      const { runSwarm } = await import('./capabilities/swarm/swarmOrchestrator.js');
      const { runAgentTask } = await import('./agent/orchestrator.js');
      const { getAgent } = await import('./agent/registry.js');
      const result = await runSwarm(flags['runId'] ?? `swarm-${Date.now()}`, async (task) => {
        const agent = getAgent(task.agentId);
        if (!agent) throw new Error(`Agent ${task.agentId} not found`);
        return runAgentTask(brand, agent, task.goal, task.id);
      });
      console.log(chalk.cyan('\n━━━ SWARM RESULT ━━━'));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'swarm-status': {
      const { getSwarmStatus } = await import('./capabilities/swarm/swarmOrchestrator.js');
      const status = getSwarmStatus(flags['runId'] ?? 'unknown');
      console.log(chalk.cyan('\n━━━ SWARM STATUS ━━━'));
      console.log(JSON.stringify(status, null, 2));
      break;
    }

    case 'swarm-list': {
      const { listSwarms } = await import('./capabilities/swarm/swarmOrchestrator.js');
      const swarms = listSwarms(Number(flags['limit'] ?? 10));
      console.log(chalk.cyan('\n━━━ SWARM RUNS ━━━'));
      for (const s of swarms)
        console.log(`  ${s.runId}: ${s.status} | ${s.tasks.length} tasks | ${s.goal.slice(0, 40)}`);
      break;
    }

    case 'decompose-task': {
      const { decomposeTask } = await import('./capabilities/swarm/taskDecomposer.js');
      const breakdown = decomposeTask(flags['goal'] ?? '');
      console.log(chalk.cyan('\n━━━ TASK DECOMPOSITION ━━━'));
      console.log(JSON.stringify(breakdown, null, 2));
      break;
    }

    case 'agent-message': {
      const { publishMessage } = await import('./capabilities/swarm/swarmMessageBus.js');
      const msg = publishMessage(flags['channel'] ?? 'general', flags['from'] ?? 'cli', flags['payload'] ?? '', {
        toAgentId: flags['to'],
        priority: Number(flags['priority'] ?? 5),
      });
      console.log(chalk.cyan('\n━━━ MESSAGE SENT ━━━'));
      console.log(JSON.stringify(msg, null, 2));
      break;
    }

    case 'predict-content': {
      const { predictPerformance } = await import('./capabilities/predictive/performancePredictor.js');
      const prediction = predictPerformance({
        format: (flags['format'] as 'reel' | 'carousel' | 'post' | 'story' | 'tiktok') ?? 'reel',
        hookStrength: Number(flags['hookStrength'] ?? 0.5),
        hasCta: Boolean(flags['hasCta']),
        videoLengthSec: flags['videoLengthSec'] ? Number(flags['videoLengthSec']) : undefined,
        hashtagCount: Number(flags['hashtagCount'] ?? 5),
        aestheticScore: flags['aestheticScore'] ? Number(flags['aestheticScore']) : undefined,
        audioType: (flags['audioType'] as 'music' | 'voiceover' | 'trending' | 'none') ?? undefined,
      });
      console.log(chalk.cyan('\n━━━ CONTENT PREDICTION ━━━'));
      console.log(JSON.stringify(prediction, null, 2));
      break;
    }

    case 'predict-engagement': {
      const { calculateEngagementScore } = await import('./capabilities/predictive/engagementModel.js');
      const score = calculateEngagementScore({
        followerCount: Number(flags['followerCount'] ?? 0),
        avgLikesLast10: Number(flags['avgLikesLast10'] ?? 0),
        avgCommentsLast10: Number(flags['avgCommentsLast10'] ?? 0),
        avgSavesLast10: Number(flags['avgSavesLast10'] ?? 0),
        postFrequency7d: Number(flags['postFrequency7d'] ?? 0),
        replyRate: Number(flags['replyRate'] ?? 0),
        storyFrequency7d: Number(flags['storyFrequency7d'] ?? 0),
        collaborationCount30d: Number(flags['collaborationCount30d'] ?? 0),
      });
      console.log(chalk.cyan('\n━━━ ENGAGEMENT SCORE ━━━'));
      console.log(JSON.stringify(score, null, 2));
      break;
    }

    case 'forecast-trends': {
      const { forecastTrend } = await import('./capabilities/predictive/trendForecaster.js');
      const history = flags['history'] ? JSON.parse(flags['history']) : [];
      const forecast = forecastTrend(flags['topic'] ?? 'trend', history);
      console.log(chalk.cyan('\n━━━ TREND FORECAST ━━━'));
      console.log(JSON.stringify(forecast, null, 2));
      break;
    }

    case 'detect-anomalies': {
      const { detectAnomalies } = await import('./capabilities/predictive/anomalyDetector.js');
      const values = flags['values'] ? JSON.parse(flags['values']) : [];
      const anomalies = detectAnomalies(
        { metricName: flags['metricName'] ?? 'metric', values },
        Number(flags['thresholdStdDev'] ?? 2),
      );
      console.log(chalk.cyan('\n━━━ ANOMALIES ━━━'));
      console.log(JSON.stringify(anomalies, null, 2));
      break;
    }

    case 'benchmark-nicho': {
      const { benchmarkEngagement } = await import('./capabilities/predictive/engagementModel.js');
      const bench = benchmarkEngagement(flags['niche'] ?? 'default');
      console.log(chalk.cyan('\n━━━ BENCHMARK ━━━'));
      console.log(JSON.stringify(bench, null, 2));
      break;
    }

    // ── Sprint 9: Real-Time Infrastructure ──────────────────────────────

    case 'realtime-publish': {
      const { publishEvent } = await import('./capabilities/realtime/eventBus.js');
      const event = publishEvent(flags['topic'] ?? 'general', JSON.parse(flags['payload'] ?? '{}'), {
        source: flags['source'] ?? 'cli',
        priority: Number(flags['priority'] ?? 5),
      });
      console.log(chalk.cyan('\n━━━ EVENT PUBLISHED ━━━'));
      console.log(JSON.stringify(event, null, 2));
      break;
    }

    case 'realtime-subscribe': {
      const { subscribeTopic } = await import('./capabilities/realtime/eventBus.js');
      const subId = subscribeTopic(flags['topic'] ?? 'general', () => {});
      console.log(chalk.cyan('\n━━━ SUBSCRIBED ━━━'));
      console.log(`Subscription ID: ${subId}`);
      break;
    }

    case 'realtime-events': {
      const { getEventHistory } = await import('./capabilities/realtime/eventBus.js');
      const events = getEventHistory({
        topic: flags['topic'],
        limit: Number(flags['limit'] ?? 50),
      });
      console.log(chalk.cyan('\n━━━ EVENTS ━━━'));
      for (const e of events) console.log(`  [${e.timestamp}] ${e.topic}: ${JSON.stringify(e.payload).slice(0, 60)}`);
      break;
    }

    case 'websocket-broadcast': {
      const { broadcast: wsBroadcast } = await import('./capabilities/realtime/webSocketHub.js');
      const count = wsBroadcast(flags['channel'] ?? 'general', JSON.parse(flags['payload'] ?? '{}'));
      console.log(chalk.cyan('\n━━━ WS BROADCAST ━━━'));
      console.log(`Reached ${count} clients`);
      break;
    }

    case 'websocket-connections': {
      const { getConnections } = await import('./capabilities/realtime/webSocketHub.js');
      const conns = getConnections();
      console.log(chalk.cyan('\n━━━ WS CONNECTIONS ━━━'));
      console.log(JSON.stringify(conns, null, 2));
      break;
    }

    case 'live-stream-start': {
      const { startStream } = await import('./capabilities/realtime/liveStream.js');
      const stream = startStream(
        flags['label'] ?? 'Stream',
        flags['agentFilter'] ? String(flags['agentFilter']).split(',') : undefined,
      );
      console.log(chalk.cyan('\n━━━ LIVE STREAM STARTED ━━━'));
      console.log(JSON.stringify(stream, null, 2));
      break;
    }

    case 'live-stream-status': {
      const { getStream, getStreamStats } = await import('./capabilities/realtime/liveStream.js');
      const stream = getStream(flags['streamId'] ?? 'unknown');
      const stats = getStreamStats(flags['streamId'] ?? 'unknown');
      console.log(chalk.cyan('\n━━━ LIVE STREAM STATUS ━━━'));
      console.log(JSON.stringify({ stream, stats }, null, 2));
      break;
    }

    case 'webhook-register': {
      const { registerEndpoint } = await import('./capabilities/realtime/webhookReceiver.js');
      const ep = registerEndpoint(flags['path'] ?? '/webhook', flags['source'] ?? 'unknown', flags['secret']);
      console.log(chalk.cyan('\n━━━ WEBHOOK REGISTERED ━━━'));
      console.log(JSON.stringify(ep, null, 2));
      break;
    }

    case 'webhook-list': {
      const { listEndpoints, listDeliveries } = await import('./capabilities/realtime/webhookReceiver.js');
      const endpoints = listEndpoints();
      const deliveries = listDeliveries({ endpointId: flags['endpointId'], limit: 20 });
      console.log(chalk.cyan('\n━━━ WEBHOOKS ━━━'));
      console.log(JSON.stringify({ endpoints, deliveries }, null, 2));
      break;
    }

    case 'health-pulse': {
      const { recordPulse } = await import('./capabilities/realtime/healthMonitor.js');
      const pulse = recordPulse({
        cpuLoad: Number(flags['cpuLoad'] ?? 30),
        memoryUsageMb: Number(flags['memoryUsageMb'] ?? 128),
        pendingTasks: Number(flags['pendingTasks'] ?? 0),
      });
      console.log(chalk.cyan('\n━━━ HEALTH PULSE ━━━'));
      console.log(JSON.stringify(pulse, null, 2));
      break;
    }

    // ── Sprint 10: Computer Vision ──────────────────────────────────────

    case 'vision-analyze': {
      const { analyzeImage } = await import('./capabilities/vision/imageAnalyzer.js');
      const analysis = analyzeImage(flags['imageUrl'] ?? '', {
        width: flags['width'] ? Number(flags['width']) : undefined,
        height: flags['height'] ? Number(flags['height']) : undefined,
      });
      console.log(chalk.cyan('\n━━━ IMAGE ANALYSIS ━━━'));
      console.log(JSON.stringify(analysis, null, 2));
      break;
    }

    case 'vision-objects': {
      const { detectObjects } = await import('./capabilities/vision/objectDetector.js');
      const result = detectObjects(flags['imageUrl'] ?? '');
      console.log(chalk.cyan('\n━━━ OBJECT DETECTION ━━━'));
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case 'vision-ocr': {
      const { extractText } = await import('./capabilities/vision/ocrEngine.js');
      const ocr = extractText(flags['imageUrl'] ?? '');
      console.log(chalk.cyan('\n━━━ OCR ━━━'));
      console.log(JSON.stringify(ocr, null, 2));
      break;
    }

    case 'vision-faces': {
      const { analyzeFaces } = await import('./capabilities/vision/faceAnalyzer.js');
      const faces = analyzeFaces(flags['imageUrl'] ?? '');
      console.log(chalk.cyan('\n━━━ FACE ANALYSIS ━━━'));
      console.log(JSON.stringify(faces, null, 2));
      break;
    }

    case 'vision-compare': {
      const { compareImages } = await import('./capabilities/vision/visualComparer.js');
      const cmp = compareImages(flags['imageUrlA'] ?? '', flags['imageUrlB'] ?? '');
      console.log(chalk.cyan('\n━━━ IMAGE COMPARISON ━━━'));
      console.log(JSON.stringify(cmp, null, 2));
      break;
    }

    case 'vision-caption': {
      const { generateAutoCaption } = await import('./capabilities/vision/autoCaption.js');
      const caption = generateAutoCaption(flags['imageUrl'] ?? '', flags['brandName'] ?? brand.name);
      console.log(chalk.cyan('\n━━━ AUTO CAPTION ━━━'));
      console.log(JSON.stringify(caption, null, 2));
      break;
    }

    case 'vision-moderate': {
      const { moderateImage } = await import('./capabilities/vision/visualModerator.js');
      const mod = moderateImage(flags['imageUrl'] ?? '');
      console.log(chalk.cyan('\n━━━ MODERATION ━━━'));
      console.log(JSON.stringify(mod, null, 2));
      break;
    }

    case 'vision-palette': {
      const { extractPalette } = await import('./capabilities/vision/colorAnalyzer.js');
      const palette = extractPalette(flags['imageUrl'] ?? '');
      console.log(chalk.cyan('\n━━━ COLOR PALETTE ━━━'));
      console.log(JSON.stringify(palette, null, 2));
      break;
    }

    case 'vision-brand-check': {
      const { checkBrandColors } = await import('./capabilities/vision/colorAnalyzer.js');
      const colors = flags['brandColors'] ? String(flags['brandColors']).split(',') : (brand.visual?.palette ?? []);
      const check = checkBrandColors(flags['imageUrl'] ?? '', colors);
      console.log(chalk.cyan('\n━━━ BRAND COLOR CHECK ━━━'));
      console.log(JSON.stringify(check, null, 2));
      break;
    }

    case 'vision-batch': {
      const { batchAnalyzeImages } = await import('./capabilities/vision/imageAnalyzer.js');
      const urls = flags['imageUrls'] ? JSON.parse(flags['imageUrls']) : [];
      const results = batchAnalyzeImages(urls);
      console.log(chalk.cyan('\n━━━ BATCH ANALYSIS ━━━'));
      for (const r of results) console.log(`  ${r.aspectRatio} | ${r.qualityScore} quality | ${r.recommendedPlatform}`);
      break;
    }

    case 'vision-similar': {
      const { findSimilarImages } = await import('./capabilities/vision/visualComparer.js');
      const candidates = flags['candidates'] ? JSON.parse(flags['candidates']) : [];
      const similar = findSimilarImages(flags['queryUrl'] ?? '', candidates);
      console.log(chalk.cyan('\n━━━ SIMILAR IMAGES ━━━'));
      for (const s of similar) console.log(`  [${s.similarity.toFixed(2)}] ${s.url.slice(0, 60)}`);
      break;
    }

    // ── Sprint 11: Self-Improvement + AR ────────────────────────────────

    case 'self-improve': {
      const { analyzeImprovements } = await import('./capabilities/selfImprove/selfImproveLoop.js');
      const summary = analyzeImprovements((flags['agentId'] as string) ?? 'global');
      console.log(chalk.cyan('\n━━━ SELF IMPROVEMENT SUMMARY ━━━'));
      console.log(JSON.stringify(summary, null, 2));
      break;
    }

    case 'feedback-collect': {
      const { collectSignal } = await import('./capabilities/selfImprove/feedbackEngine.js');
      const fb = collectSignal({
        source: (flags['source'] as 'performance' | 'user' | 'system' | 'human' | 'algorithm') ?? 'user',
        agentId: (flags['agentId'] as string) ?? 'cli',
        metric: (flags['metric'] as string) ?? 'engagement',
        value: Number(flags['value']) || 0.7,
        weight: Number(flags['weight']) || 1.0,
        context: (flags['message'] as string) ?? 'Feedback desde CLI',
      });
      console.log(chalk.cyan('\n━━━ FEEDBACK COLLECTED ━━━'));
      console.log(JSON.stringify(fb, null, 2));
      break;
    }

    case 'performance-review': {
      const { generateReview } = await import('./capabilities/selfImprove/performanceReview.js');
      const review = generateReview(
        {
          startDate: (flags['start'] as string) ?? new Date().toISOString(),
          endDate: (flags['end'] as string) ?? new Date().toISOString(),
          agentId: (flags['agentId'] as string) ?? 'all',
        },
        (flags['metrics'] ? JSON.parse(flags['metrics']) : []) as Array<{
          name: string;
          actual: number;
          target: number;
          previous?: number;
        }>,
      );
      console.log(chalk.cyan('\n━━━ PERFORMANCE REVIEW ━━━'));
      console.log(JSON.stringify(review, null, 2));
      break;
    }

    case 'strategy-tune': {
      const { suggestTuning } = await import('./capabilities/selfImprove/autoTuner.js');
      const suggestion = suggestTuning(
        {
          name: (flags['param'] as string) ?? 'engagement_threshold',
          current: Number(flags['current']) || 0.5,
          min: Number(flags['min']) || 0.1,
          max: Number(flags['max']) || 1.0,
          step: Number(flags['step']) || 0.05,
          metric: (flags['metric'] as string) ?? 'engagement',
        },
        (flags['history'] ? JSON.parse(flags['history']) : [0.5, 0.55, 0.52]) as number[],
      );
      console.log(chalk.cyan('\n━━━ STRATEGY TUNE SUGGESTION ━━━'));
      console.log(JSON.stringify(suggestion, null, 2));
      break;
    }

    case 'ar-filter': {
      const { generateFilter } = await import('./capabilities/ar/arFilterGenerator.js');
      const filter = generateFilter(
        (flags['name'] as string) ?? `${brand.name} Filter`,
        (flags['type'] as 'face' | 'background' | 'overlay' | 'transform' | 'lighting') ?? 'face',
        (flags['platform'] as 'instagram' | 'tiktok' | 'both') ?? 'both',
      );
      console.log(chalk.cyan('\n━━━ AR FILTER ━━━'));
      console.log(JSON.stringify(filter, null, 2));
      break;
    }

    case 'ar-preview': {
      const { generateFilter, generateFilterCampaign } = await import('./capabilities/ar/arFilterGenerator.js');
      const { generatePreview } = await import('./capabilities/ar/arPreview.js');
      const filter = flags['filterId']
        ? (generateFilterCampaign(brand.name, 3).find((f) => f.id === (flags['filterId'] as string)) ??
          generateFilter(`${brand.name} Preview`, 'face', 'both'))
        : generateFilter(`${brand.name} Preview`, 'face', 'both');
      const preview = generatePreview(filter, (flags['imageUrl'] as string) ?? 'https://example.com/photo.jpg');
      console.log(chalk.cyan('\n━━━ AR PREVIEW ━━━'));
      console.log(JSON.stringify(preview, null, 2));
      break;
    }

    case 'ar-effect': {
      const { composeSequence } = await import('./capabilities/ar/arEffectComposer.js');
      const { generateFilterCampaign } = await import('./capabilities/ar/arFilterGenerator.js');
      const filters = generateFilterCampaign(brand.name, Number(flags['count']) || 3);
      const seq = composeSequence(
        `${brand.name} AR Experience`,
        filters,
        (flags['platform'] as 'instagram' | 'tiktok' | 'both') ?? 'both',
      );
      console.log(chalk.cyan('\n━━━ AR EFFECT SEQUENCE ━━━'));
      console.log(JSON.stringify(seq, null, 2));
      break;
    }

    case 'ar-export': {
      const { exportEffect, listSequences } = await import('./capabilities/ar/arEffectComposer.js');
      const seqs = listSequences();
      const seq = seqs.find((s) => s.id === (flags['sequenceId'] as string));
      if (!seq) {
        console.log(chalk.red('Sequence not found'));
        break;
      }
      const exported = exportEffect(seq, (flags['format'] as 'spark_ar' | 'effect_house' | 'json') ?? 'json');
      console.log(chalk.cyan('\n━━━ AR EXPORT ━━━'));
      console.log(JSON.stringify(exported, null, 2));
      break;
    }

    case 'ar-campaign': {
      const { generateFilterCampaign, estimateARPerformance } = await import('./capabilities/ar/arFilterGenerator.js');
      const filters = generateFilterCampaign(
        (flags['campaignId'] as string) ?? brand.name,
        Number(flags['count']) || 3,
      );
      const performance = filters.map((f) => ({ filter: f.name, ...estimateARPerformance(f) }));
      console.log(chalk.cyan('\n━━━ AR CAMPAIGN PROJECTION ━━━'));
      console.log(JSON.stringify({ filters: filters.length, projections: performance }, null, 2));
      break;
    }

    case 'ar-assets': {
      const { listSequences } = await import('./capabilities/ar/arEffectComposer.js');
      const { generateFilterCampaign } = await import('./capabilities/ar/arFilterGenerator.js');
      const seqs = listSequences();
      const filters = generateFilterCampaign(brand.name, 3);
      console.log(chalk.cyan('\n━━━ AR ASSETS ━━━'));
      console.log(`Sequences: ${seqs.length}`);
      for (const s of seqs) console.log(`  seq: ${s.name} (${s.platform})`);
      console.log(`Filters: ${filters.length}`);
      for (const f of filters) console.log(`  filter: ${f.name} (${f.type})`);
      break;
    }

    default:
      log.error(`Comando desconocido: ${cmd}`);
      usage();
      process.exit(1);
  }
};

main().catch((err) => {
  log.error((err as Error).message);
  process.exit(1);
});
