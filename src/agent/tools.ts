// @ts-nocheck
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import type { BrandProfile, ContentFormat } from '../config/types.js';

import { designTools, executeDesignTool } from './tools/designTools.js';
import { videoTools, executeVideoTool } from './tools/videoTools.js';
import { analyticsTools, executeAnalyticsTool } from './tools/analyticsTools.js';
import { postingTools, executePostingTool } from './tools/postingTools.js';
import { orchestrationTools, executeOrchestrationTool } from './tools/orchestrationTools.js';
import { platformTools, executePlatformTool } from './tools/platformTools.js';
import { workflowTools, executeWorkflowTool } from './tools/workflowTools.js';
import { growthTools, executeGrowthTool } from './tools/growthTools.js';
import { canvaTools, executeCanvaTool } from './tools/canvaTools.js';
import { nicheTools, executeNicheTool } from './tools/nicheTools.js';
import { analyzeNicho, reposicionar } from '../capabilities/strategy/index.js';
import { generateHooks, optimizeForRetention } from '../capabilities/copywriting/index.js';
import {
  createCarrusel,
  createReel,
  createStorySequence,
  createCaption,
  createFacelessTriple,
  runCarouselFactory,
  listCarouselJobs,
} from '../capabilities/content/index.js';
import { scoutTrends, validarAngulos } from '../capabilities/trends/index.js';
import { engineerHooks } from '../capabilities/retention/index.js';
import {
  generarComentariosFaro,
  planFanNurturing,
  responderEnComentariosAjenos,
} from '../capabilities/growth/index.js';
import { triageDms, calificarLead, pushLeadToCrm } from '../capabilities/inbox/index.js';
import type { LeadQualification } from '../capabilities/inbox/leads.js';
import { moderarComentarios, analizarSentimiento } from '../capabilities/reputation/index.js';
import { decideAbVariant, sugerirReciclaje, planSemana } from '../capabilities/ops/index.js';
import { renderArtifact } from '../integrations/contentRender.js';
import { publishToInstagram } from '../integrations/meta.js';
import { generateVideoWithRunway, imageToVideoWithRunway } from '../browserOperators/runway/runwayApi.js';
import { createAvatarVideo, checkHeyGenVideo } from '../browserOperators/heygen/heygenApi.js';

import {
  renderCarruselToCanva,
  renderReelToCanva,
  renderStorySequenceToCanva,
} from '../capabilities/content/canvaRender.js';
import { simulateInbound, runOnce, evaluateAndDecide } from '../capabilities/bot/index.js';
import type { Channel } from '../capabilities/bot/index.js';
import {
  buildSnapshot,
  detectAnomalies,
  generateWeeklyReport,
  sendWeeklyReportAlert,
} from '../capabilities/analytics/index.js';
import { investigarHashtags, buildPostHashtags, auditHashtags } from '../capabilities/hashtags/index.js';
import { analizarCompetidores, detectarVirales, compararConCompetidores } from '../capabilities/competitors/index.js';
import { repurposeContent } from '../capabilities/repurposing/index.js';
import { evaluarUgc, registrarUgc, solicitarPermiso, listarPorEstado } from '../capabilities/ugc/index.js';
import { briefToPublish, runWeeklyAutopilot } from '../capabilities/pipelines/index.js';
import { sendAlert } from '../integrations/notifications.js';
import { exportIcs } from '../integrations/calendar.js';
import { scoreAesthetic } from '../capabilities/aesthetic/aestheticScorer.js';
import { createMoodboard, listMoodboards, addEntry } from '../capabilities/aesthetic/moodboardManager.js';
import { auditReceptorResponsibility } from '../capabilities/ethics/receptorResponsibility.js';
import { validateCommonSense } from '../capabilities/ethics/commonSenseValidator.js';
import { generateImage } from '../integrations/imageGen.js';
import { runRecipe } from '../capabilities/recipes/index.js';
import { getDefaultRunner } from '../studio/index.js';
import {
  listAssets,
  addAsset,
  validateAssetAgainstBrand,
  runBrandConsistencyCheck,
  ensureBrandKit,
  type BrandKitAssetType,
} from '../capabilities/brandkit/index.js';
import {
  ensureBrandStrategy,
  updateBrandStrategy,
  formatBrandStrategyContext,
  evaluateBrandRules,
  generateBrandRuleReport,
  ALL_BRAND_RULES,
} from '../capabilities/branding/index.js';
import { ejecutarCrisisCheck, reanudarPublicaciones, isPausado, getCrisisState } from '../capabilities/crisis/index.js';
import {
  diseñarExperimentos,
  lanzarExperimento,
  completarExperimento,
  listarExperimentos,
  pickArm,
  rewardArm,
  banditStats,
  syncBanditsFromTraces,
} from '../capabilities/experiments/index.js';
import {
  addSource,
  loadSources,
  procesarSource,
  procesarTodasLasSources,
  aprobarItem,
  marcarUsado,
  listarBacklog,
} from '../capabilities/curator/index.js';
import { auditarPrePublicacion } from '../capabilities/safety/index.js';
import { optimizarPerfil } from '../capabilities/profile/index.js';
import {
  diseñarSecuencia,
  inscribirEnSecuencia,
  ejecutarPasosListos,
  listarSecuencias,
  listarEnrollments,
  enrollmentsListos,
  avanzarPaso,
} from '../capabilities/nurture/index.js';
import { localizarContenido } from '../capabilities/localization/index.js';
import {
  addDeal,
  advanceDeal,
  getPipelineSummary,
  getFunnelVelocity,
  getDealsByScore,
} from '../capabilities/pipelineCRM.js';
import {
  getAttributionReport,
  getContentAttribution,
  getChannelComparison,
  getLTVByChannel,
} from '../capabilities/revenueAttribution.js';
import { fetchTikTokTrends, fetchTikTokSounds } from '../capabilities/tiktok/trendEngine.js';
import { calculateFYPScore, generateOptimizationPlan } from '../capabilities/tiktok/fypOptimizer.js';
import { listTemplates, generateBlueprint } from '../capabilities/tiktok/videoTemplates.js';
import { detectBeats, generateSyncPoints, generateEDL } from '../capabilities/tiktok/soundSync.js';
import { getAccountSummary as getTikTokAccountSummary } from '../capabilities/tiktok/analytics.js';
import { generateMusic } from '../capabilities/audio/musicGeneration.js';
import { generateSFX, getSFXPreset } from '../capabilities/audio/sfxGeneration.js';
import {
  listBrandVoices,
  synthesizeSpeech,
  cloneVoice,
  generateVoiceoverForScript,
} from '../capabilities/audio/voiceCloning.js';
import { dubVideo } from '../capabilities/audio/autoDubbing.js';
import {
  rankTasks,
  selectTopTask,
  startFocus,
  endFocus,
  interruptFocus,
} from '../capabilities/neural/attentionEngine.js';
import {
  recordEpisodic,
  recordSemantic,
  recallEpisodic,
  recallSemantic,
  getMemoryStats,
} from '../capabilities/neural/memoryGateway.js';
import { recordOutcome, analyzeStrategyPerformance } from '../capabilities/neural/learningLoop.js';
import { addDocument, querySimilar, getCollectionStats } from '../capabilities/memory/vectorStore.js';
import { queryRAG, ingestKnowledge, ingestFAQ } from '../capabilities/memory/ragEngine.js';
import { searchSimilar } from '../capabilities/memory/semanticSearch.js';
import { getRecipe, listRecipes, createSoundDesign, autoDesignForVideo } from '../capabilities/audio/soundDesign.js';
import { construirDigest, enviarDigest } from '../capabilities/digest/index.js';
import {
  procesarObservaciones,
  responderNegociacion,
  enviarOutreach,
  listByStatus as listProspects,
  setStatus as setProspectStatus,
} from '../capabilities/collab/index.js';
import { diseñarArcoSemanal, ajustarBeatsParaCallback } from '../capabilities/arc/index.js';
import { listJobs, recentRuns, runJobByName } from '../scheduler/index.js';
import { runPlaybook, type PlaybookDefinition } from './orchestrator.js';
import { listAgents, getAgent } from './registry.js';
import {
  createPromise,
  listPromises,
  updatePromise,
  getPromise,
  type PromiseContract,
} from '../capabilities/promiseRegistry/promiseRegistry.js';
import { runRemediation } from '../capabilities/accountabilityEngine/remediationProtocol.js';
import { listCheckpoints, approveCheckpoint, rejectCheckpoint, createCheckpoint } from './checkpoints.js';
// import { emit, getHistory } from './bus.js';
import {
  runComputerUseSession,
  navegarInstagram,
  interactuarConPost,
  leerFeed,
  buscarCuentaOHashtag,
  leerDMs,
  verPerfil,
  verNotificaciones,
  INSTAGRAM_UI_ZONES,
  startWatchSession,
} from '../capabilities/computerUse/index.js';
import { listAgentTypes, describeAgentType, getAgentType, type AgentTypeCategory } from './agentTypes.js';
import { getAgentsByType } from './registry.js';
import { speak } from '../voice/tts.js';
import { detectWakeWord, HANDS_FREE_MENU } from '../voice/wakeWord.js';
import { setLocale, getLocale, listSupportedLocales, type SupportedLocale } from '../i18n/index.js';
import { hubChat, getHubSummary, getProviderStatuses, hubSentiment } from '../integrations/openSourceHub.js';
import { groqAsk } from '../integrations/providers/groq.js';
import { ollamaAsk, isOllamaAvailable, listOllamaModels } from '../integrations/providers/ollama.js';
import { openRouterAsk } from '../integrations/providers/openRouter.js';
import { searchPublicApis, CURATED_APIS_FOR_FEEDIA } from '../integrations/apiDirectory.js';
import { supabaseSelect, supabaseInsert, isSupabaseAvailable } from '../integrations/providers/supabase.js';
import { getOSStatus, scheduleOSTask, setAutonomyLevel, runOSEvolution, type OSState } from '../os/autonomousCore.js';
import { getSystemHealth, triggerSelfHealing } from '../os/selfHealing.js';
import { getTopLessons, addLesson, getLessonsForAgent } from '../os/agentEvolution.js';
import {
  askBulk as routerAskBulk,
  generateVariations,
  generateFullCaption,
  generateReply,
  processLongText,
} from './tokenRouter.js';
import {
  buildInstagramExpertContext,
  ALGORITHM_SIGNALS,
  GROWTH_PLAYBOOKS,
  ANALYTICS_BENCHMARKS,
  COMMUNITY_MANAGEMENT,
  CRISIS_PLAYBOOK,
  CONTENT_FORMATS,
} from './instagramExpert.js';
import {
  publicarPost,
  publicarHistoria,
  publicarReel,
  comentarEnPost,
  darLike,
  seguirCuenta,
  enviarDM,
  responderDMsPendientes,
  editarPerfil,
  realizarBeaconEngagement,
  procesarNotificaciones,
  leerInsights,
  moderarComentariosDePost,
  interactuarConTendencia,
  crearHighlight,
  auditarPerfil,
  verAnaliticasPost,
} from '../capabilities/computerUse/instagramActions.js';
import {
  WORKFLOW_CRECIMIENTO_SEMANAL,
  WORKFLOW_PRODUCCION_DIARIA,
  WORKFLOW_GESTION_COMUNIDAD,
  WORKFLOW_ANALISIS_COMPETENCIA,
  WORKFLOW_RESPUESTA_CRISIS,
  WORKFLOW_LANZAMIENTO_CAMPAÑA,
  WORKFLOW_AUDITORIA_MENSUAL,
  WORKFLOW_ONBOARDING_CUENTA,
  getWorkflowByIntent,
  listWorkflows,
  buildDynamicWorkflow,
} from '../workflows/instagramWorkflows.js';
import {
  recordPost,
  getTopPerformers,
  getRecentPosts,
  getBenchmarks,
  extractPatterns,
  getAccountSummary,
} from '../capabilities/analytics/performanceDB.js';
import { scoreContent, scoreAndImprove } from '../capabilities/content/contentScorer.js';
import {
  getBestPostingTime,
  getTimingAdvice,
  shouldPostNow,
  rebuildTimingModel,
} from '../capabilities/analytics/audienceTiming.js';
import {
  enqueueEvent,
  processQueue,
  getQueueStatus,
  getPendingCritical,
  configureReactor,
} from '../integrations/eventReactor.js';
import { runContentPipeline, runVariationPipeline, planWeekContent } from '../capabilities/content/contentPipeline.js';
import {
  setGrowthGoal,
  clearGrowthGoal,
  recordDailySnapshot,
  getCurrentProgress,
  detectAndCelebrateMilestones,
  recommendNextActions,
  getGrowthNarrative,
  getGrowthHealth,
  getRecentDailyMetrics,
  getMilestones,
} from '../capabilities/growth/growthEngine.js';
import {
  generateHooks as hookLabGenerate,
  scoreHook,
  getBestHook,
  analyzeHookPerformance,
  pickHookForAB,
  improveHook,
  HOOK_TEMPLATES,
} from '../capabilities/copywriting/hookLab.js';
import {
  schedulePostBoost,
  runBoostTick,
  getBoostStatus,
  cancelBoost,
  getBoostStats,
  getBoostHistory,
  getActiveBoosts,
} from '../capabilities/growth/postBoost.js';
import {
  scanForViralPosts,
  decomposeViralPost,
  adaptToBrand as adaptViralToBrand,
  rideTheWave,
  getNicheTrendNarrative,
  getRecentViralPosts,
  getTrackerStatus,
} from '../capabilities/trends/viralTracker.js';
import { buildDashboard, buildTextSummary, getQuickInsights } from '../capabilities/growth/growthDashboard.js';
import {
  createGoal,
  listGoals,
  getGoalsSnapshot,
  checkGoalsHealth,
  cascadeAnnualGoal,
  cascadeQuarterlyGoal,
  autoUpdateProgress as autoUpdateGoalProgress,
} from '../capabilities/goals/goalManager.js';
import { parseUserIntent, validateParseResult } from '../capabilities/goals/intentParser.js';
import {
  createTask,
  listTasks,
  updateTaskStatus,
  getKanbanView,
  getTeamWorkload,
  buildDailyStandup,
  decomposeGoalIntoTasks,
  AGENT_SPECIALTIES,
} from '../capabilities/goals/taskBoard.js';
import {
  createEvent as createCalendarEvent,
  listEvents as listCalendarEvents,
  getMonthView,
  getWeekView,
  getCalendarSnapshot,
  processUpcomingEvents,
  addBlackoutDate,
} from '../capabilities/goals/calendarBoard.js';
import { generatePeriodReport, listReports, getReport, reportToText } from '../capabilities/goals/periodReport.js';
import { runKickoff, runKickoffFromText, previewKickoff } from '../capabilities/goals/kickoffOrchestrator.js';
import {
  uploadToSocial,
  getUploadStatus,
  listConnectedAccounts as listUploadAccounts,
  getUsageStats as getUploadUsage,
  validateAll as validateUploadPayload,
  adaptCaptionFor,
} from '../integrations/uploadPost.js';
import {
  createCampaign,
  pauseCampaign,
  getCampaigns,
  getCampaignInsights,
  boostPost,
  optimizeBudget,
  trackPixelEvent,
  isMetaAdsAvailable,
} from '../integrations/metaAds.js';
import {
  generateImage as falGenerateImage,
  generateCarousel as falGenerateCarousel,
  buildPromptFromBrief,
  listAvailableModels as listFalModels,
  getSpendingSummary as getFalSpending,
} from '../integrations/falAi.js';
import {
  startInterview,
  getActiveInterview,
  getNextQuestion as brandInterviewNextQuestion,
  submitAnswer as brandInterviewSubmitAnswer,
  consolidateInterview,
  briefToBrandProfile,
  getInterviewProgress,
  INTERVIEW_QUESTIONS,
} from '../capabilities/branding/brandInterview.js';
import {
  generateDesign,
  generateCarouselDeliverable,
  designFromCaption,
  generateProfilePhoto,
  generateHighlightCoverSet,
  remixDesign,
  auditDesign,
  DESIGN_PRINCIPLES,
} from '../capabilities/design/graphicDesigner.js';
import {
  auditBrand,
  proposeEvolution,
  runFullRenewal,
  approveAndExecuteRenewal,
  listRenewals,
  getRenewal,
} from '../capabilities/branding/brandRenewal.js';
import {
  getProfessionKB,
  buildProfessionalSystemPrompt,
  PROFESSIONS_REPLACED,
  getReplacementValue,
} from '../capabilities/knowledge/professionalKnowledge.js';
import {
  ingestMessage as cmIngestMessage,
  suggestReply as cmSuggestReply,
  tickInbox as cmTickInbox,
  listConversations as cmListConversations,
  getConversation as cmGetConversation,
  getInboxSnapshot,
  updateConversationStatus as cmUpdateConvStatus,
  escalateToHuman as cmEscalateToHuman,
} from '../capabilities/community/dmInbox.js';
import {
  detectFlowType as supportDetectFlow,
  openCaseFromConversation,
  advanceSupportCase,
  listCases as listSupportCases,
  getCase as getSupportCase,
  getSupportSnapshot,
  rateSupportCase,
} from '../capabilities/community/customerSupport.js';
import {
  createFAQ,
  findMatchingFAQ,
  detectFAQPatterns,
  proposeFAQFromPattern,
  approveAndAddFAQ,
  listFAQs,
  listPendingPatterns,
  getFAQSnapshot,
  tryAnswerWithFAQ,
  deleteFAQ,
} from '../capabilities/community/faqDatabase.js';
import {
  createStorySequence as cmCreateStorySequence,
  publishSequence,
  planDailyStories,
  listSequences,
  getSequence,
  getStoriesSnapshot,
  recordSequenceMetrics,
} from '../capabilities/community/storiesStudio.js';
import {
  createLead,
  advanceLeadStage,
  scheduleFollowUp,
  processFollowUpsDue,
  syncLeadFromConversation,
  getPipelineKanban,
  listLeads,
  getLead,
  getPipelineSnapshot,
  recordWonRevenue,
  addObjectionToLead,
  addPromiseToLead,
  computeLeadScore,
} from '../capabilities/community/leadPipeline.js';
import { checkTone, guardOutput, auditConsistency, validateOrFail } from '../capabilities/community/toneGuardian.js';
import {
  ingestUGC,
  requestRepostPermission,
  markPermission,
  generateRepostCaption,
  markReposted,
  sendThankYou,
  listUGC,
  getUGCSnapshot,
  getUGC,
} from '../capabilities/community/ugcManager.js';
import {
  ingestMention,
  acknowledgeMention,
  listMentions,
  getMentionsSnapshot,
  getMention,
} from '../capabilities/community/mentionTracker.js';
import {
  generatePoll,
  recordPollResults,
  analyzePollResults,
  suggestPollFromContext,
  listPolls,
  getPoll,
  getPollSnapshot,
  POLL_TEMPLATES,
} from '../capabilities/community/pollQuizEngine.js';
import {
  refreshFanProfile,
  enqueueNewFollower,
  sendWelcomeDM,
  processNewFollowersQueue,
  refreshAllFanProfiles,
  getTopFans,
  grantReward,
  proposeFanOfTheWeek,
  detectChurningFans,
  sendReengagementDM,
  getFanSnapshot,
  getFan,
} from '../capabilities/community/fanRecognition.js';
import {
  launchApp,
  closeApp,
  openBrowserWithUrl,
  openCanva,
  openFigma,
  openPhotopea,
  openInstagramWeb,
  ensureAppRunning,
  getAppStatus,
  listInstalledApps,
  focusApp,
} from '../capabilities/computerUse/appLauncher.js';
import {
  runCanvaWorkflow,
  createInstagramPost as canvaCreateIGPost,
  createInstagramStory as canvaCreateIGStory,
  createCarouselSlide as canvaCreateSlide,
  createFullCarousel as canvaCreateFullCarousel,
  resumeCanvaSession,
} from '../capabilities/computerUse/canvaStudio.js';
import {
  runDesignToolWorkflow,
  recommendToolForTask,
  listDesignTools,
  DESIGN_TOOLS_REGISTRY,
} from '../capabilities/computerUse/designToolsGeneric.js';
import {
  detectRecentDownload,
  listRecentDownloads,
  waitForNewDownload,
  captureLatestDownload,
  registerAsset,
  validateAsset,
  listRegisteredAssets,
  getFileBridgeSnapshot,
} from '../capabilities/computerUse/fileBridge.js';
import {
  runCanvaToInstagram,
  runDesignToInstagram,
  runBatchProduction,
  runCanvaPreviewOnly,
  getDesktopWorkflowsStatus,
  findLatestDesignFile,
} from '../capabilities/computerUse/desktopWorkflows.js';
import {
  startReplaySession,
  endReplaySession,
  logStep as replayLogStep,
  getReplaySession,
  listReplaySessions,
  searchReplays,
  generateNarrative as replayGenerateNarrative,
  getReplayStats,
  pruneOldReplays,
} from '../capabilities/computerUse/visualReplayLog.js';
import {
  createProfile as cpmCreateProfile,
  getProfile as cpmGetProfile,
  findProfileByName as cpmFindByName,
  findProfileByBrand as cpmFindByBrand,
  listProfiles as cpmListProfiles,
  setDefaultProfile as cpmSetDefault,
  getDefaultProfile as cpmGetDefault,
  markServiceLoggedIn as cpmMarkLogin,
  updateProfile as cpmUpdate,
  deleteProfile as cpmDelete,
  launchWithProfile as cpmLaunch,
  launchWithBrandProfile as cpmLaunchByBrand,
  ensureFeediaExtension,
  getProfileSize,
  cleanProfileCache,
  getProfilesSnapshot,
  ensureProfileForBrand,
} from '../capabilities/computerUse/chromeProfileManager.js';
import {
  detectInstalledEmulators,
  registerEmulator as androidRegister,
  launchEmulator as androidLaunch,
  stopEmulator as androidStop,
  listEmulators as androidList,
  getEmulator as androidGet,
  setDefaultEmulator as androidSetDefault,
  refreshEmulatorStatus,
  mobileTap,
  mobileSwipe,
  mobileType,
  mobilePressKey,
  mobileBack,
  mobileHome,
  mobileScreenshot,
  listInstalledApps as androidListApps,
  launchAppOnDevice,
  stopAppOnDevice,
  isAppInstalled as androidIsAppInstalled,
  launchInstagramOnEmulator,
  runMobileCanvaToInstagram,
  autoSetupEmulator,
  getAndroidEmulatorSnapshot,
  INSTAGRAM_PACKAGE,
  TIKTOK_PACKAGE,
  CANVA_ANDROID_PACKAGE,
} from '../capabilities/computerUse/androidEmulator.js';
import {
  narrate as voiceNarrate,
  getNarratorConfig,
  setNarratorLevel,
  updateNarratorConfig,
  toggleCategory as voiceToggleCategory,
  getNarratorStats,
  getDailyUsage as voiceDailyUsage,
  resetStats as voiceResetStats,
  disable as voiceDisable,
  enable as voiceEnable,
  isEnabled as voiceIsEnabled,
  enforceCostLimit as voiceEnforceCostLimit,
} from '../capabilities/computerUse/voiceNarrator.js';
import {
  startWelcome,
  advanceStage as welcomeAdvanceStage,
  generateStageContent,
  buildCompletionRecap,
  getWelcomeSession,
  getActiveWelcomeForUser,
  hasCompletedOnboarding,
  getCatalogs as welcomeCatalogs,
  getRandomCompliment,
  generateReturnGreeting,
  getWelcomeSnapshot,
} from '../capabilities/experience/welcomeExperience.js';
import {
  initPersonalization,
  getPersonalization,
  updatePersonalization,
  resetToDefaults as personalizationReset,
  addInsideJoke,
  getRelevantInsideJoke,
  addCustomCommand,
  removeCustomCommand,
  matchCustomCommand,
  buildPersonalContextForTalia,
  getCatalogPreview,
  getPersonalizationSnapshot,
  exportPersonalizationCSS,
  getThemeForUser,
  getMascotForUser,
  getEffectiveAccentColor,
} from '../capabilities/experience/personalizationEngine.js';
import {
  buildHomeDashboard,
  buildMinimalHome,
  buildHomeAsText,
  getDelightMessage,
  getHomeDashboardConfig,
  generateAmbientComment,
  buildPersonalGreeting,
} from '../capabilities/experience/homeDashboard.js';
import {
  evaluateAchievements,
  getAllAchievements,
  getUnlockedAchievements,
  getAchievementsByCategory,
  getProgressTowardNext,
  getAchievementsSnapshot,
  markAchievementShared,
  markAchievementAcknowledged,
  getUnacknowledgedAchievements,
  manuallyUnlock,
} from '../capabilities/experience/achievementSystem.js';
import {
  buildMorningRitual,
  buildEveningRitual,
  buildMondayKickoff,
  buildFridayClose,
  deliverRitual,
  getRecentRituals,
  getRitualById,
  markRitualAcknowledged,
  getRitualSnapshot,
  runMorningRitual,
  runEveningRitual,
} from '../capabilities/experience/dailyRitual.js';
import {
  triggerCelebration,
  celebrateMilestone,
  celebrateAchievement as celebrateAchievementFn,
  celebrateGoalCompleted,
  celebrateStreak,
  celebrateFirstTime,
  celebrateTopPost,
  celebrateSurprise,
  celebrateAnniversary,
  celebrateComeback,
  getRecentCelebrations,
  getCelebration,
  markCelebrationAcknowledged,
  markCelebrationShared,
  getUnacknowledgedCelebrations,
  getCelebrationSnapshot,
  updateConfig as celebrationUpdateConfig,
  getConfig as celebrationGetConfig,
} from '../capabilities/experience/celebrationEngine.js';
import {
  captureMemory,
  autoDetectAndCapture,
  pinMemory,
  unpinMemory,
  markRevisited,
  listMemories,
  getMemory,
  getThrowbackMemory,
  generateYearbook,
  getYearbook,
  listYearbooks,
  buildHighlightReel,
  getMemorabiliaSnapshot,
  getOnThisDayMemories,
} from '../capabilities/experience/memorabiliaArchive.js';
import {
  runMission,
  listMissions,
  runOperationsCycle,
  getOperationsStatus,
  recallSimilarMissions,
} from './swarm/index.js';
import { getBudgetStatus, getBudgetHistory } from './budget.js';
import {
  buildExecutiveBrief,
  buildRecapData,
  buildOnePagerData,
  getWelcome,
  humanizeActivity,
} from '../capabilities/experience/index.js';
import { routeCommand } from '../capabilities/command/index.js';
import {
  askProfessor,
  runStudySession,
  queryLedger,
  igCalc,
  webFetch,
  type IgCalcOp,
} from '../capabilities/research/index.js';
import { runReelPipeline } from '../capabilities/video/index.js';
import { startABTest, evaluateABTest, listABTests } from '../capabilities/abTesting/index.js';
import { scoutTrends as scoutRealTrends } from '../integrations/trends.js';
import { trackCompetitor } from '../integrations/competitors.js';
import { sendNotification } from '../integrations/email.js';
import { handleEvent, listTriggers } from './agentTriggers.js';
import { runAgentTeam, listTeams, getTeam } from './agentTeams.js';
import { listBrandProfiles, loadBrandProfileById } from '../config/accounts.js';
import { createSwarm, runSwarm, getSwarmStatus, listSwarms } from '../capabilities/swarm/swarmOrchestrator.js';
import { proposeConsensus, castVote, resolveConsensus } from '../capabilities/swarm/agentConsensus.js';
import { decomposeTask } from '../capabilities/swarm/taskDecomposer.js';
import { publishMessage } from '../capabilities/swarm/swarmMessageBus.js';
import { predictPerformance } from '../capabilities/predictive/performancePredictor.js';
import { forecastTrend } from '../capabilities/predictive/trendForecaster.js';
import { detectAnomalies as detectPredictiveAnomalies } from '../capabilities/predictive/anomalyDetector.js';
import { calculateEngagementScore, benchmarkEngagement } from '../capabilities/predictive/engagementModel.js';
import { publishEvent, subscribeTopic, getEventHistory } from '../capabilities/realtime/eventBus.js';
import { broadcast as wsBroadcast, getConnections } from '../capabilities/realtime/webSocketHub.js';
import { startStream, getStream, getStreamStats } from '../capabilities/realtime/liveStream.js';
import {
  registerEndpoint,
  receiveWebhook,
  listEndpoints,
  listDeliveries,
  getEndpointStats,
  retryDelivery,
} from '../capabilities/realtime/webhookReceiver.js';
import { sendPush } from '../capabilities/realtime/pushNotifier.js';
import { recordPulse } from '../capabilities/realtime/healthMonitor.js';
import { getWindow, getDashboardSnapshot } from '../capabilities/realtime/realtimeAnalytics.js';
import { emitEvent as sseEmit } from '../capabilities/realtime/sseBroadcaster.js';
import { analyzeImage, batchAnalyzeImages } from '../capabilities/vision/imageAnalyzer.js';
import { detectObjects } from '../capabilities/vision/objectDetector.js';
import { extractText } from '../capabilities/vision/ocrEngine.js';
import { analyzeFaces, checkFaceCompliance } from '../capabilities/vision/faceAnalyzer.js';
import { compareImages, findSimilarImages } from '../capabilities/vision/visualComparer.js';
import { generateAutoCaption } from '../capabilities/vision/autoCaption.js';
import { moderateImage, moderateBatch, getModerationStats } from '../capabilities/vision/visualModerator.js';
import { extractPalette, checkBrandColors, suggestColorAdjustments } from '../capabilities/vision/colorAnalyzer.js';
import { recordCycle, analyzeImprovements, suggestImprovements } from '../capabilities/selfImprove/selfImproveLoop.js';
import { recordPattern, predictTransfer, getTopPatterns } from '../capabilities/selfImprove/metaLearning.js';
import { suggestTuning, evaluateTuningImpact } from '../capabilities/selfImprove/autoTuner.js';
import { collectSignal, applyFeedback } from '../capabilities/selfImprove/feedbackEngine.js';
import { generateReview } from '../capabilities/selfImprove/performanceReview.js';
import { generateFilter, generateFilterCampaign } from '../capabilities/ar/arFilterGenerator.js';
import { generatePreview } from '../capabilities/ar/arPreview.js';
import {
  composeSequence,
  exportEffect,
  listSequences as arListSequences,
} from '../capabilities/ar/arEffectComposer.js';

type ToolHandler = (input: Record<string, unknown>, brand: BrandProfile) => Promise<unknown>;

interface RegisteredTool {
  spec: Tool;
  handler: ToolHandler;
}

const tool = (
  name: string,
  description: string,
  input_schema: Tool.InputSchema,
  handler: ToolHandler,
): RegisteredTool => ({ spec: { name, description, input_schema }, handler });

const str = (description: string): { type: 'string'; description: string } => ({
  type: 'string',
  description,
});

export const tools: RegisteredTool[] = [
  tool(
    'analyze_nicho',
    'Identifica patrones saturados en el nicho y propone 10 ideas frescas que respeten el algoritmo.',
    {
      type: 'object',
      properties: { objetivo: str('Objetivo override (awareness, leads, ventas, etc.)') },
    },
    async (input, brand) => analyzeNicho(brand, typeof input['objetivo'] === 'string' ? input['objetivo'] : undefined),
  ),
  tool(
    'reposicionar_contenido',
    'Reescribe un texto en versiones elegante, directa y premium (sin tono gurú).',
    {
      type: 'object',
      properties: { contenido: str('Texto original a reposicionar') },
      required: ['contenido'],
    },
    async (input, brand) => reposicionar(brand, input['contenido'] as string),
  ),
  tool(
    'generate_hooks',
    'Genera 15 ganchos para una idea, balanceados por categoría, y rankea los 5 mejores.',
    {
      type: 'object',
      properties: { idea: str('Idea concreta del post') },
      required: ['idea'],
    },
    async (input, brand) => generateHooks(brand, input['idea'] as string),
  ),
  tool(
    'optimizar_retencion',
    'Reescribe contenido maximizando watch time, finalización, guardados y compartidos.',
    {
      type: 'object',
      properties: { contenido: str('Texto a optimizar') },
      required: ['contenido'],
    },
    async (input, brand) => optimizeForRetention(brand, input['contenido'] as string),
  ),
  tool(
    'crear_carrusel',
    'Diseña un carrusel completo con slides, copy, hashtags y dirección visual.',
    {
      type: 'object',
      properties: {
        idea: str('Idea del carrusel'),
        longitud: { type: 'string', enum: ['corto', 'medio', 'largo'] },
      },
      required: ['idea'],
    },
    async (input, brand) =>
      createCarrusel(
        brand,
        input['idea'] as string,
        (input['longitud'] as 'corto' | 'medio' | 'largo' | undefined) ?? 'medio',
      ),
  ),
  tool(
    'crear_reel',
    'Genera guion de reel con beats segundo a segundo, hook visual, CTA y notas de retención.',
    {
      type: 'object',
      properties: {
        tema: str('Tema del reel'),
        duracion: { type: 'number', enum: [15, 20, 30, 45, 60] },
      },
      required: ['tema'],
    },
    async (input, brand) =>
      createReel(brand, input['tema'] as string, (input['duracion'] as 15 | 20 | 30 | 45 | 60 | undefined) ?? 30),
  ),
  tool(
    'crear_stories',
    'Diseña secuencia de stories interactivas con stickers y narrativa.',
    {
      type: 'object',
      properties: {
        evento: str('Evento o contexto del día'),
        cantidad: { type: 'number' },
      },
      required: ['evento'],
    },
    async (input, brand) =>
      createStorySequence(brand, input['evento'] as string, (input['cantidad'] as number | undefined) ?? 5),
  ),
  tool(
    'crear_caption',
    'Genera 3 versiones de caption (corta, media, larga) + hashtags + primer comentario.',
    {
      type: 'object',
      properties: {
        contexto: str('Resumen del contenido al que acompaña el caption'),
        formato: { type: 'string', enum: ['reel', 'carrusel', 'post-imagen', 'historia'] },
      },
      required: ['contexto', 'formato'],
    },
    async (input, brand) =>
      createCaption(
        brand,
        input['contexto'] as string,
        input['formato'] as 'reel' | 'carrusel' | 'post-imagen' | 'historia',
      ),
  ),
  tool(
    'crear_faceless_triple',
    'Convierte una idea en 3 versiones faceless: carrusel, reel-texto y post-visual.',
    {
      type: 'object',
      properties: {
        idea: str('Idea a transformar'),
        objetivo: str('Objetivo del contenido (opcional)'),
      },
      required: ['idea'],
    },
    async (input, brand) =>
      createFacelessTriple(
        brand,
        input['idea'] as string,
        typeof input['objetivo'] === 'string' ? input['objetivo'] : undefined,
      ),
  ),
  tool(
    'scout_tendencias',
    'Identifica 5 ángulos con mayor demanda cruzando IG/TikTok/Reddit (con o sin datos externos).',
    {
      type: 'object',
      properties: { observacionesExternas: str('Datos crudos o resúmenes que querés inyectar') },
    },
    async (input, brand) =>
      scoutTrends(
        brand,
        typeof input['observacionesExternas'] === 'string' ? input['observacionesExternas'] : undefined,
      ),
  ),
  tool(
    'validar_angulos',
    'Filtra una lista de ángulos: subir, descartar o pivotear, con razones.',
    {
      type: 'object',
      properties: {
        angulos: { type: 'array', items: { type: 'string' } },
      },
      required: ['angulos'],
    },
    async (input, brand) => validarAngulos(brand, input['angulos'] as string[]),
  ),
  tool(
    'engineer_hooks',
    'Analiza hooks virales y propone 5 nuevos optimizados con triggers psicológicos.',
    {
      type: 'object',
      properties: {
        ejemplosVirales: { type: 'array', items: { type: 'string' } },
      },
      required: ['ejemplosVirales'],
    },
    async (input, brand) => engineerHooks(brand, input['ejemplosVirales'] as string[]),
  ),
  tool(
    'comentar_cuentas_faro',
    'Genera comentarios inteligentes para posts recientes de cuentas faro del nicho.',
    {
      type: 'object',
      properties: {
        postsRecientes: {
          type: 'array',
          items: {
            type: 'object',
            properties: { cuenta: str('handle'), descripcion: str('descripción del post') },
            required: ['cuenta', 'descripcion'],
          },
        },
      },
      required: ['postsRecientes'],
    },
    async (input, brand) =>
      generarComentariosFaro(brand, input['postsRecientes'] as Array<{ cuenta: string; descripcion: string }>),
  ),
  tool(
    'plan_fan_nurturing',
    'Decide cómo interactuar con fans recientes (like, comentario, DM, mención).',
    {
      type: 'object',
      properties: {
        actividad: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              usuario: str('handle'),
              tipo: {
                type: 'string',
                enum: ['comentario', 'mencion', 'reaccion', 'guardado', 'compartido'],
              },
              contenido: str('descripción de la acción del fan'),
            },
            required: ['usuario', 'tipo', 'contenido'],
          },
        },
      },
      required: ['actividad'],
    },
    async (input, brand) =>
      planFanNurturing(
        brand,
        input['actividad'] as Array<{
          usuario: string;
          tipo: 'comentario' | 'mencion' | 'reaccion' | 'guardado' | 'compartido';
          contenido: string;
        }>,
      ),
  ),
  tool(
    'responder_comentarios_ajenos',
    'Responde preguntas en comentarios de cuentas ajenas sin promocionar la marca.',
    {
      type: 'object',
      properties: {
        preguntas: {
          type: 'array',
          items: {
            type: 'object',
            properties: { post: str('descripción del post'), comentario: str('pregunta original') },
            required: ['post', 'comentario'],
          },
        },
      },
      required: ['preguntas'],
    },
    async (input, brand) =>
      responderEnComentariosAjenos(brand, input['preguntas'] as Array<{ post: string; comentario: string }>),
  ),
  tool(
    'triage_dms',
    'Clasifica DMs (soporte, curioso, lead-caliente, spam, colaboración).',
    {
      type: 'object',
      properties: {
        dms: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              remitente: str('handle'),
              mensaje: str('texto del DM'),
              historial: str('historial previo opcional'),
            },
            required: ['remitente', 'mensaje'],
          },
        },
      },
      required: ['dms'],
    },
    async (input, brand) =>
      triageDms(brand, input['dms'] as Array<{ remitente: string; mensaje: string; historial?: string }>),
  ),
  tool(
    'calificar_lead',
    'Califica un lead conversacional con score 0-100 y siguiente paso.',
    {
      type: 'object',
      properties: {
        remitente: str('handle del lead'),
        turnos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              rol: { type: 'string', enum: ['lead', 'marca'] },
              texto: str('contenido del turno'),
            },
            required: ['rol', 'texto'],
          },
        },
      },
      required: ['remitente', 'turnos'],
    },
    async (input, brand) =>
      calificarLead(brand, {
        remitente: input['remitente'] as string,
        turnos: input['turnos'] as Array<{ rol: 'lead' | 'marca'; texto: string }>,
      }),
  ),
  tool(
    'sync_lead_crm',
    'Empuja un lead calificado al CRM configurado (Notion/HubSpot/Salesforce).',
    {
      type: 'object',
      properties: {
        qualification: { type: 'object' },
        rawHistorial: str('Texto plano del historial para extraer email/teléfono'),
      },
      required: ['qualification', 'rawHistorial'],
    },
    async (input) => {
      type Q = import('../capabilities/inbox/leads.js').LeadQualification;
      return pushLeadToCrm(input['qualification'] as Q, input['rawHistorial'] as string);
    },
  ),
  tool(
    'moderar_comentarios',
    'Decide acción (eliminar/ocultar/reportar/responder/mantener) sobre comentarios.',
    {
      type: 'object',
      properties: {
        comentarios: {
          type: 'array',
          items: {
            type: 'object',
            properties: { id: str('id'), autor: str('handle'), texto: str('comentario') },
            required: ['id', 'autor', 'texto'],
          },
        },
      },
      required: ['comentarios'],
    },
    async (input) => moderarComentarios(input['comentarios'] as Array<{ id: string; autor: string; texto: string }>),
  ),
  tool(
    'analizar_sentimiento',
    'Analiza sentimiento global de los comentarios de un post y detecta crisis.',
    {
      type: 'object',
      properties: {
        postId: str('id del post'),
        comentarios: { type: 'array', items: { type: 'string' } },
      },
      required: ['postId', 'comentarios'],
    },
    async (input) => analizarSentimiento(input['postId'] as string, input['comentarios'] as string[]),
  ),
  tool(
    'decidir_ab_variant',
    'A las 2h de publicar, decide si conviene cambiar hook/caption/cta o mantener.',
    {
      type: 'object',
      properties: {
        post: { type: 'object' },
        metrics: { type: 'object' },
        benchmark: { type: 'object' },
      },
      required: ['post', 'metrics', 'benchmark'],
    },
    async (input, brand) => {
      type M = import('../capabilities/ops/abTesting.js').PostMetrics;
      return decideAbVariant(
        brand,
        input['post'] as { caption: string; hook: string; format: string },
        input['metrics'] as M,
        input['benchmark'] as M,
      );
    },
  ),
  tool(
    'sugerir_reciclaje_evergreen',
    'Sugiere refresh para posts evergreen con buen rendimiento histórico.',
    {
      type: 'object',
      properties: { candidatos: { type: 'array' } },
      required: ['candidatos'],
    },
    async (input, brand) => {
      type C = import('../capabilities/ops/evergreen.js').EvergreenCandidate;
      return sugerirReciclaje(brand, input['candidatos'] as C[]);
    },
  ),
  tool(
    'planificar_semana',
    'Genera plan semanal completo de Instagram (posts + stories) con horarios óptimos.',
    {
      type: 'object',
      properties: {
        ideas: { type: 'array' },
        bestHours: { type: 'array', items: { type: 'string' } },
      },
      required: ['ideas'],
    },
    async (input, brand) => {
      type ContentFormat = import('../config/types.js').ContentFormat;
      return planSemana(
        brand,
        input['ideas'] as Array<{ idea: string; formatoSugerido: ContentFormat }>,
        input['bestHours'] as string[] | undefined,
      );
    },
  ),
  tool(
    'render_artifact',
    'Guarda un artefacto de contenido (carrusel/reel/imagen) listo para producción.',
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['carrusel', 'reel', 'imagen'] },
        payload: { type: 'object' },
      },
      required: ['type', 'payload'],
    },
    async (input) =>
      renderArtifact({
        type: input['type'] as 'carrusel' | 'reel' | 'imagen',
        payload: input['payload'] as Record<string, unknown>,
      }),
  ),
  tool(
    'render_carrusel_canva',
    'Toma el output de crear_carrusel y lo renderiza con un brand template de Canva (autofill + export PNG).',
    {
      type: 'object',
      properties: {
        carrusel: { type: 'object', description: 'CarruselResult completo' },
        titulo: str('Título del diseño'),
      },
      required: ['carrusel', 'titulo'],
    },
    async (input) => {
      type C = import('../capabilities/content/carrusel.js').CarruselResult;
      return renderCarruselToCanva(input['carrusel'] as C, input['titulo'] as string);
    },
  ),
  tool(
    'render_reel_canva',
    'Toma el output de crear_reel y lo renderiza con un brand template de Canva (autofill + export MP4).',
    {
      type: 'object',
      properties: {
        reel: { type: 'object', description: 'ReelScript completo' },
        titulo: str('Título del diseño'),
      },
      required: ['reel', 'titulo'],
    },
    async (input) => {
      type R = import('../capabilities/content/reel.js').ReelScript;
      return renderReelToCanva(input['reel'] as R, input['titulo'] as string);
    },
  ),
  tool(
    'render_stories_canva',
    'Toma el output de crear_stories y lo renderiza con un brand template de Canva (autofill + export PNG).',
    {
      type: 'object',
      properties: {
        story: { type: 'object', description: 'StorySequence completo' },
        titulo: str('Título del diseño'),
      },
      required: ['story', 'titulo'],
    },
    async (input) => {
      type S = import('../capabilities/content/stories.js').StorySequence;
      return renderStorySequenceToCanva(input['story'] as S, input['titulo'] as string);
    },
  ),

  // ── Design & Computer Use ─────────────────────────────────────────────────
  ...Object.entries(designTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeDesignTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Video & Computer Use ──────────────────────────────────────────────────
  ...Object.entries(videoTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeVideoTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Analytics & Dashboard ────────────────────────────────────────────────
  ...Object.entries(analyticsTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeAnalyticsTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Posting & Publishing ──────────────────────────────────────────────────
  ...Object.entries(postingTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executePostingTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Orchestration & Brand Logic ───────────────────────────────────────────
  ...Object.entries(orchestrationTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeOrchestrationTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Platform Native Control (Instagram + TikTok) ─────────────────────────
  ...Object.entries(platformTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executePlatformTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Smart Workflow Orchestration ──────────────────────────────────────────
  ...Object.entries(workflowTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeWorkflowTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Growth Guarantee System (M1→M5) ──────────────────────────────────────
  ...Object.entries(growthTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeGrowthTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Canva Computer Use (Advanced Design Automation) ─────────────────────
  ...Object.entries(canvaTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeCanvaTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  // ── Multi-Account Niche Intelligence ─────────────────────────────────────
  ...Object.entries(nicheTools).map(([name, spec]) =>
    tool(name, spec.description || `Execute ${name}`, spec.input_schema, async (input, brand) =>
      executeNicheTool(name, input as Record<string, unknown>, brand),
    ),
  ),

  tool(
    'bot_simular_entrada',
    'Procesa mensajes/comentarios simulados a través del bot conversacional (rails + intent + auto-reply). Útil para QA antes de activar BOT_AUTO_REPLY_ENABLED.',
    {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              remitente: str('handle del usuario'),
              mensaje: str('texto del mensaje'),
              canal: { type: 'string', enum: ['dm', 'comentario'] },
              postId: str('id del post si es comentario'),
            },
            required: ['remitente', 'mensaje', 'canal'],
          },
        },
      },
      required: ['items'],
    },
    async (input, brand) =>
      simulateInbound(
        brand,
        input['items'] as Array<{
          remitente: string;
          mensaje: string;
          canal: Channel;
          postId?: string;
        }>,
      ),
  ),
  tool(
    'bot_correr_una_vez',
    'Ejecuta una iteración del bot: pide DMs/comentarios nuevos a Meta y procesa cada uno con rails + auto-reply.',
    { type: 'object', properties: {} },
    async (_input, brand) => runOnce(brand),
  ),
  tool(
    'analytics_snapshot',
    'Trae métricas de la cuenta + posts en una ventana, calcula benchmarks y detecta top/bajo rendimiento.',
    {
      type: 'object',
      properties: {
        desdeIso: str('ISO 8601 inicio'),
        hastaIso: str('ISO 8601 fin (opcional)'),
      },
      required: ['desdeIso'],
    },
    async (input) => {
      const snap = await buildSnapshot(input['desdeIso'] as string, input['hastaIso'] as string | undefined);
      return { snap, anomalias: detectAnomalies(snap) };
    },
  ),
  tool(
    'reporte_semanal',
    'Genera un reporte ejecutivo accionable de la última semana y dispara una alerta a Slack/webhook.',
    {
      type: 'object',
      properties: { desdeIso: str('ISO 8601 inicio') },
      required: ['desdeIso'],
    },
    async (input, brand) => {
      const snap = await buildSnapshot(input['desdeIso'] as string);
      const anomalias = detectAnomalies(snap);
      const report = await generateWeeklyReport(brand, snap, anomalias);
      await sendWeeklyReportAlert(brand, report, snap);
      return { report, anomalias };
    },
  ),
  tool(
    'investigar_hashtags',
    'Genera pools de hashtags por tier (mega/grande/medio/nicho/marca) con riesgo de baneo.',
    {
      type: 'object',
      properties: { tema: str('Tema o eje del post (opcional)') },
    },
    async (input, brand) => investigarHashtags(brand, typeof input['tema'] === 'string' ? input['tema'] : undefined),
  ),
  tool(
    'pickear_hashtags',
    'Toma pools y mix recomendado, devuelve hashtags rotando los recientemente usados.',
    {
      type: 'object',
      properties: {
        pools: { type: 'object' },
        mix: { type: 'object' },
      },
      required: ['pools', 'mix'],
    },
    async (input) => {
      type Pools = { mega: string[]; grande: string[]; medio: string[]; nicho: string[]; marca: string[] };
      type Mix = { mega: number; grande: number; medio: number; nicho: number; marca: number };
      return buildPostHashtags(input['pools'] as Pools, input['mix'] as Mix);
    },
  ),
  tool(
    'auditar_hashtags',
    'Detecta hashtags shadowbanned/baneados y propone reemplazos.',
    {
      type: 'object',
      properties: { tags: { type: 'array', items: { type: 'string' } } },
      required: ['tags'],
    },
    async (input) => auditHashtags(input['tags'] as string[]),
  ),
  tool(
    'analizar_competidores',
    'Analiza posts recientes de competidores y propone acción por cada observación.',
    {
      type: 'object',
      properties: {
        observaciones: {
          type: 'array',
          items: { type: 'object' },
        },
      },
      required: ['observaciones'],
    },
    async (input, brand) => {
      type O = import('../capabilities/competitors/monitor.js').CompetitorPostObservation;
      const obs = input['observaciones'] as O[];
      return {
        opportunities: await analizarCompetidores(brand, obs),
        virales: detectarVirales(obs),
      };
    },
  ),
  tool(
    'comparar_con_competidores',
    'Compara la performance propia con un set de competidores y devuelve jugadas concretas.',
    {
      type: 'object',
      properties: {
        miSnapshot: { type: 'object' },
        competidores: { type: 'array', items: { type: 'object' } },
      },
      required: ['miSnapshot', 'competidores'],
    },
    async (input, brand) => {
      type S = import('../capabilities/analytics/insights.js').PerformanceSnapshot;
      type B = import('../capabilities/competitors/compare.js').BenchmarkCompetitor;
      return compararConCompetidores(brand, input['miSnapshot'] as S, input['competidores'] as B[]);
    },
  ),
  tool(
    'repurpose_long_form',
    'Convierte un blog/transcripción/podcast/paper en carruseles + reels + stories + captions.',
    {
      type: 'object',
      properties: {
        source: { type: 'object' },
        carruselesCount: { type: 'number' },
        reelsCount: { type: 'number' },
        storiesCount: { type: 'number' },
      },
      required: ['source'],
    },
    async (input, brand) => {
      type S = import('../capabilities/repurposing/pipeline.js').SourceContent;
      const opts: import('../capabilities/repurposing/pipeline.js').RepurposeOptions = {};
      if (typeof input['carruselesCount'] === 'number') opts.carruselesCount = input['carruselesCount'];
      if (typeof input['reelsCount'] === 'number') opts.reelsCount = input['reelsCount'];
      if (typeof input['storiesCount'] === 'number') opts.storiesCount = input['storiesCount'];
      return repurposeContent(brand, input['source'] as S, opts);
    },
  ),
  tool(
    'evaluar_ugc',
    'Evalúa candidatos UGC (menciones, reviews, creativos) y decide si vale resubir + permiso necesario.',
    {
      type: 'object',
      properties: { candidatos: { type: 'array', items: { type: 'object' } } },
      required: ['candidatos'],
    },
    async (input, brand) => {
      type C = import('../capabilities/ugc/detector.js').UgcCandidate;
      const decisions = await evaluarUgc(brand, input['candidatos'] as C[]);
      const records = decisions.filter((d) => d.vale).map((d) => registrarUgc(d));
      return { decisions, records };
    },
  ),
  tool(
    'ugc_solicitar_permiso',
    'Envía DM al autor del UGC con el borrador de permiso. Respeta DRY_RUN.',
    {
      type: 'object',
      properties: { recordId: str('id del UGC record') },
      required: ['recordId'],
    },
    async (input) => solicitarPermiso(input['recordId'] as string),
  ),
  tool(
    'ugc_listar',
    'Lista UGC records por estado (no-solicitado, solicitado, aprobado, rechazado, expirado).',
    {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['no-solicitado', 'solicitado', 'aprobado', 'rechazado', 'expirado'],
        },
      },
      required: ['status'],
    },
    async (input) => {
      type S = import('../capabilities/ugc/repostFlow.js').PermissionStatus;
      return listarPorEstado(input['status'] as S);
    },
  ),
  tool(
    'brief_to_publish',
    'Pipeline end-to-end: idea → contenido + Canva render + caption + hashtags auditados → publicación o aprobación humana.',
    {
      type: 'object',
      properties: {
        idea: str('Idea base del post'),
        formato: { type: 'string', enum: ['reel', 'carrusel'] },
        scheduledAt: str('ISO 8601 si se agenda'),
        longitudCarrusel: { type: 'string', enum: ['corto', 'medio', 'largo'] },
        duracionReel: { type: 'number', enum: [15, 20, 30, 45, 60] },
        requiereAprobacionHumana: { type: 'boolean' },
      },
      required: ['idea', 'formato'],
    },
    async (input, brand) => {
      type B = import('../capabilities/pipelines/briefToPublish.js').BriefRequest;
      const brief: B = {
        idea: input['idea'] as string,
        formato: input['formato'] as 'reel' | 'carrusel',
        ...(typeof input['scheduledAt'] === 'string' ? { scheduledAt: input['scheduledAt'] } : {}),
        ...(typeof input['longitudCarrusel'] === 'string'
          ? { longitudCarrusel: input['longitudCarrusel'] as 'corto' | 'medio' | 'largo' }
          : {}),
        ...(typeof input['duracionReel'] === 'number'
          ? { duracionReel: input['duracionReel'] as 15 | 20 | 30 | 45 | 60 }
          : {}),
        ...(typeof input['requiereAprobacionHumana'] === 'boolean'
          ? { requiereAprobacionHumana: input['requiereAprobacionHumana'] }
          : {}),
      };
      return briefToPublish(brand, brief);
    },
  ),
  tool(
    'autopilot_semanal',
    'Pipeline más alto: analiza nicho → plan semanal → genera y deja todos los posts pendientes de aprobación + iCal + alerta.',
    {
      type: 'object',
      properties: {
        bestHours: { type: 'array', items: { type: 'string' } },
        dryRunBrief: { type: 'boolean' },
      },
    },
    async (input, brand) => {
      const opts: { bestHours?: string[]; dryRunBrief?: boolean } = {};
      if (Array.isArray(input['bestHours'])) opts.bestHours = input['bestHours'] as string[];
      if (typeof input['dryRunBrief'] === 'boolean') opts.dryRunBrief = input['dryRunBrief'];
      return runWeeklyAutopilot(brand, opts);
    },
  ),
  tool(
    'enviar_alerta',
    'Envía una alerta manual a los canales configurados (Slack/webhook).',
    {
      type: 'object',
      properties: {
        severity: { type: 'string', enum: ['info', 'warn', 'crisis', 'lead', 'reporte'] },
        title: str('Título corto'),
        body: str('Cuerpo de la alerta (puede tener markdown)'),
        ctaUrl: str('URL opcional para botón'),
      },
      required: ['severity', 'title', 'body'],
    },
    async (input) =>
      sendAlert({
        severity: input['severity'] as 'info' | 'warn' | 'crisis' | 'lead' | 'reporte',
        title: input['title'] as string,
        body: input['body'] as string,
        ...(typeof input['ctaUrl'] === 'string' ? { ctaUrl: input['ctaUrl'] } : {}),
      }),
  ),
  tool(
    'exportar_calendario_ics',
    'Exporta una lista de slots a un archivo .ics importable en Google Calendar / Outlook / iCal.',
    {
      type: 'object',
      properties: {
        nombreCalendario: str('Nombre del calendario'),
        eventos: { type: 'array', items: { type: 'object' } },
      },
      required: ['nombreCalendario', 'eventos'],
    },
    async (input) => {
      type E = import('../integrations/calendar.js').CalendarEvent;
      const path = exportIcs(input['nombreCalendario'] as string, input['eventos'] as E[]);
      return { path };
    },
  ),
  tool(
    'crisis_check',
    'Sub-agente Crisis Manager: analiza comentarios de un post, decide pausar publicaciones y enviar alertas.',
    {
      type: 'object',
      properties: {
        postId: str('ID del post bajo observación'),
        comentariosRecientes: { type: 'array', items: { type: 'string' } },
      },
      required: ['postId', 'comentariosRecientes'],
    },
    async (input, brand) =>
      ejecutarCrisisCheck(brand, {
        postId: input['postId'] as string,
        comentariosRecientes: input['comentariosRecientes'] as string[],
      }),
  ),
  tool(
    'crisis_estado',
    'Devuelve el estado actual del Crisis Manager (pausado, posts en observación, alertas).',
    { type: 'object', properties: {} },
    async () => ({ pausado: isPausado(), state: getCrisisState() }),
  ),
  tool(
    'crisis_reanudar',
    'Reanuda publicaciones pausadas por crisis (solo cuando el equipo lo confirma).',
    { type: 'object', properties: {} },
    async () => reanudarPublicaciones(),
  ),
  tool(
    'experimentos_disenar',
    'Diseña N experimentos de growth con métrica primaria y umbral de éxito.',
    {
      type: 'object',
      properties: {
        contextoActual: str('Resumen del estado actual de la cuenta'),
        cantidad: { type: 'number' },
      },
      required: ['contextoActual'],
    },
    async (input, brand) =>
      diseñarExperimentos(brand, input['contextoActual'] as string, (input['cantidad'] as number | undefined) ?? 3),
  ),
  tool(
    'experimentos_lanzar',
    'Marca un experimento diseñado como corriendo.',
    {
      type: 'object',
      properties: { id: str('id del experimento') },
      required: ['id'],
    },
    async (input) => lanzarExperimento(input['id'] as string),
  ),
  tool(
    'experimentos_completar',
    'Cierra un experimento con métricas observadas y aprendizaje generado por IA.',
    {
      type: 'object',
      properties: {
        id: str('id del experimento'),
        metricasObservadas: { type: 'object' },
      },
      required: ['id', 'metricasObservadas'],
    },
    async (input, brand) =>
      completarExperimento(brand, input['id'] as string, input['metricasObservadas'] as Record<string, number>),
  ),
  tool(
    'experimentos_listar',
    'Lista experimentos por estado (diseñado/corriendo/completado/descartado).',
    {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['diseñado', 'corriendo', 'completado', 'descartado'],
        },
      },
    },
    async (input) => {
      type S = import('../capabilities/experiments/runner.js').ExperimentStatus;
      return listarExperimentos(input['status'] as S | undefined);
    },
  ),
  tool(
    'curator_add_source',
    'Registra una fuente para el Content Curator (RSS, URL, newsletter).',
    {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['rss', 'url', 'newsletter', 'paper-feed', 'reddit-subreddit', 'manual'],
        },
        nombre: str('Nombre identificable'),
        url: str('URL si aplica'),
        activo: { type: 'boolean' },
      },
      required: ['tipo', 'nombre', 'activo'],
    },
    async (input) => {
      type T = import('../capabilities/curator/sources.js').CuratorSource['tipo'];
      const payload: Parameters<typeof addSource>[0] = {
        tipo: input['tipo'] as T,
        nombre: input['nombre'] as string,
        activo: input['activo'] as boolean,
        ...(typeof input['url'] === 'string' ? { url: input['url'] } : {}),
      };
      return addSource(payload);
    },
  ),
  tool(
    'curator_listar_sources',
    'Lista todas las fuentes registradas en el Content Curator.',
    { type: 'object', properties: {} },
    async () => loadSources(),
  ),
  tool(
    'curator_procesar_todas',
    'Hace fetch de todas las sources activas, analiza relevancia y agrega ítems al backlog.',
    { type: 'object', properties: {} },
    async (_input, brand) => procesarTodasLasSources(brand),
  ),
  tool(
    'curator_procesar_source',
    'Procesa una fuente específica.',
    {
      type: 'object',
      properties: { sourceId: str('id de la fuente') },
      required: ['sourceId'],
    },
    async (input, brand) => {
      const source = loadSources().find((s) => s.id === input['sourceId']);
      if (!source) return { error: 'Source no encontrada' };
      return procesarSource(brand, source);
    },
  ),
  tool(
    'curator_backlog',
    'Lista el backlog del curator por estado.',
    {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['nuevo', 'aprobado', 'usado', 'descartado'] },
      },
    },
    async (input) => {
      type B = import('../capabilities/curator/sources.js').BacklogItem['status'];
      return listarBacklog(input['status'] as B | undefined);
    },
  ),
  tool(
    'curator_aprobar',
    'Aprueba un ítem del backlog para usarlo como semilla de contenido.',
    {
      type: 'object',
      properties: { id: str('id del ítem') },
      required: ['id'],
    },
    async (input) => aprobarItem(input['id'] as string),
  ),
  tool(
    'curator_marcar_usado',
    'Marca un ítem del backlog como ya utilizado.',
    {
      type: 'object',
      properties: { id: str('id del ítem') },
      required: ['id'],
    },
    async (input) => marcarUsado(input['id'] as string),
  ),
  tool(
    'safety_audit',
    'Audita un contenido pre-publicación contra políticas deterministas + revisión IA.',
    {
      type: 'object',
      properties: {
        caption: str('caption final con hashtags'),
        hooks: { type: 'array', items: { type: 'string' } },
        otros: { type: 'array', items: { type: 'string' } },
      },
      required: ['caption'],
    },
    async (input, brand) =>
      auditarPrePublicacion(brand, {
        caption: input['caption'] as string,
        ...(Array.isArray(input['hooks']) ? { hooks: input['hooks'] as string[] } : {}),
        ...(Array.isArray(input['otros']) ? { otros: input['otros'] as string[] } : {}),
      }),
  ),
  tool(
    'profile_optimizar',
    'Audita bio + pinneados + highlights y propone 3 versiones de bio + estructura ideal.',
    {
      type: 'object',
      properties: {
        snapshot: { type: 'object' },
      },
      required: ['snapshot'],
    },
    async (input, brand) => {
      type P = import('../capabilities/profile/optimizer.js').ProfileSnapshot;
      return optimizarPerfil(brand, input['snapshot'] as P);
    },
  ),
  tool(
    'nurture_disenar',
    'Diseña una secuencia de DM nurturing para un trigger específico.',
    {
      type: 'object',
      properties: {
        trigger: {
          type: 'string',
          enum: ['nuevo-seguidor', 'lead-frio', 'lead-tibio', 'cliente-nuevo', 'reenganche-30d', 'asistio-evento'],
        },
        pasosDeseados: { type: 'number' },
      },
      required: ['trigger', 'pasosDeseados'],
    },
    async (input, brand) => {
      type T = import('../capabilities/nurture/sequences.js').SequenceTrigger;
      return diseñarSecuencia(brand, input['trigger'] as T, input['pasosDeseados'] as number);
    },
  ),
  tool(
    'nurture_inscribir',
    'Inscribe un usuario en la secuencia activa de un trigger.',
    {
      type: 'object',
      properties: {
        igUserId: str('handle o id del usuario'),
        trigger: {
          type: 'string',
          enum: ['nuevo-seguidor', 'lead-frio', 'lead-tibio', 'cliente-nuevo', 'reenganche-30d', 'asistio-evento'],
        },
      },
      required: ['igUserId', 'trigger'],
    },
    async (input) => {
      type T = import('../capabilities/nurture/sequences.js').SequenceTrigger;
      return inscribirEnSecuencia(input['igUserId'] as string, input['trigger'] as T);
    },
  ),
  tool(
    'nurture_ejecutar',
    'Procesa todos los enrollments con paso pendiente: envía DMs y avanza el estado.',
    { type: 'object', properties: {} },
    async () => ejecutarPasosListos(),
  ),
  tool(
    'nurture_listar',
    'Lista secuencias y/o enrollments del módulo nurture.',
    {
      type: 'object',
      properties: {
        que: { type: 'string', enum: ['secuencias', 'enrollments'] },
        status: { type: 'string' },
      },
      required: ['que'],
    },
    async (input) => {
      if (input['que'] === 'secuencias') return listarSecuencias();
      type S = import('../capabilities/nurture/sequences.js').SequenceEnrollment['status'];
      return listarEnrollments(typeof input['status'] === 'string' ? (input['status'] as S) : undefined);
    },
  ),
  tool(
    'localizar_contenido',
    'Adapta caption/hooks/CTA a múltiples mercados con sensibilidad cultural.',
    {
      type: 'object',
      properties: {
        contenido: { type: 'object' },
        mercados: { type: 'array', items: { type: 'object' } },
      },
      required: ['contenido', 'mercados'],
    },
    async (input, brand) => {
      type M = import('../capabilities/localization/translator.js').MarketTarget;
      return localizarContenido(
        brand,
        input['contenido'] as { caption: string; hooks: string[]; cta: string },
        input['mercados'] as M[],
      );
    },
  ),
  tool(
    'digest_diario',
    'Construye y envía el digest diario consolidando todos los módulos.',
    {
      type: 'object',
      properties: { soloConstruir: { type: 'boolean' } },
    },
    async (input, brand) => (input['soloConstruir'] === true ? construirDigest(brand) : enviarDigest(brand)),
  ),
  tool(
    'collab_evaluar',
    'Sub-agente Collab Manager: evalúa creadores como prospects, scoreaa alineación/riesgo y genera outreach.',
    {
      type: 'object',
      properties: { observaciones: { type: 'array', items: { type: 'object' } } },
      required: ['observaciones'],
    },
    async (input, brand) => {
      type O = import('../capabilities/collab/manager.js').CreatorObservation;
      return procesarObservaciones(brand, input['observaciones'] as O[]);
    },
  ),
  tool(
    'collab_outreach',
    'Envía el DM de outreach inicial a un prospect evaluado.',
    {
      type: 'object',
      properties: { prospectId: str('id del prospect') },
      required: ['prospectId'],
    },
    async (input) => enviarOutreach(input['prospectId'] as string),
  ),
  tool(
    'collab_responder_negociacion',
    'Genera respuesta para una negociación en curso con un prospect.',
    {
      type: 'object',
      properties: {
        prospectId: str('id del prospect'),
        mensajeRecibido: str('mensaje del creador'),
      },
      required: ['prospectId', 'mensajeRecibido'],
    },
    async (input, brand) => {
      const prospect = listProspects().find((p) => p.id === input['prospectId']);
      if (!prospect) return { error: 'Prospect no encontrado' };
      return responderNegociacion(brand, prospect, input['mensajeRecibido'] as string);
    },
  ),
  tool(
    'collab_listar',
    'Lista prospects de colaboración por estado.',
    {
      type: 'object',
      properties: { status: { type: 'string' } },
    },
    async (input) => {
      type S = import('../capabilities/collab/prospects.js').ProspectStatus;
      return listProspects(input['status'] as S | undefined);
    },
  ),
  tool(
    'collab_set_status',
    'Cambia el estado de un prospect (avanzar negociación, descartar, marcar aceptado).',
    {
      type: 'object',
      properties: {
        prospectId: str('id'),
        status: { type: 'string' },
        nota: str('nota opcional'),
      },
      required: ['prospectId', 'status'],
    },
    async (input) => {
      type S = import('../capabilities/collab/prospects.js').ProspectStatus;
      return setProspectStatus(
        input['prospectId'] as string,
        input['status'] as S,
        typeof input['nota'] === 'string' ? input['nota'] : undefined,
      );
    },
  ),
  tool(
    'arc_disenar',
    'Sub-agente Story Arc: convierte una semana de slots sueltos en arco narrativo con callbacks.',
    {
      type: 'object',
      properties: {
        slots: { type: 'array', items: { type: 'object' } },
        contextoTematico: str('contexto opcional'),
      },
      required: ['slots'],
    },
    async (input, brand) => {
      type S = import('../capabilities/ops/scheduler.js').ScheduledSlot;
      return diseñarArcoSemanal(
        brand,
        input['slots'] as S[],
        typeof input['contextoTematico'] === 'string' ? input['contextoTematico'] : undefined,
      );
    },
  ),
  tool(
    'arc_ajustar_beats',
    'Genera patches de captions/hooks para que los beats existentes encadenen como arco narrativo.',
    {
      type: 'object',
      properties: {
        arc: { type: 'object' },
        beatsExistentes: { type: 'array', items: { type: 'object' } },
      },
      required: ['arc', 'beatsExistentes'],
    },
    async (input, brand) => {
      type A = import('../capabilities/arc/designer.js').StoryArc;
      return ajustarBeatsParaCallback(
        brand,
        input['arc'] as A,
        input['beatsExistentes'] as Array<{ tema: string; caption: string; hook?: string }>,
      );
    },
  ),
  tool(
    'scheduler_listar_jobs',
    'Lista jobs definidos en el scheduler con su cron y override actual.',
    { type: 'object', properties: {} },
    async () => listJobs(),
  ),
  tool(
    'scheduler_correr_job',
    'Corre un job del scheduler ahora (sin esperar al cron).',
    {
      type: 'object',
      properties: { name: str('nombre del job') },
      required: ['name'],
    },
    async (input, brand) => runJobByName(input['name'] as string, brand),
  ),
  tool(
    'scheduler_ultimas_corridas',
    'Devuelve las últimas N corridas registradas con su duración y errores.',
    {
      type: 'object',
      properties: { limit: { type: 'number' } },
    },
    async (input) => recentRuns(typeof input['limit'] === 'number' ? input['limit'] : 50),
  ),
  tool(
    'ejecutar_playbook',
    'Ejecuta un playbook multi-agente end-to-end. Requiere aprobación humana en checkpoints.',
    {
      type: 'object',
      properties: {
        playbookId: str(
          'ID del playbook a ejecutar (viral-engine, lead-to-sale, community-sprint, crisis-to-opportunity, autopilot-plus)',
        ),
        parametro: str('Parámetro principal del playbook (ej: tema, handle de lead, etc.)'),
      },
      required: ['playbookId'],
    },
    async (input, brand) => {
      const playbookId = input['playbookId'] as string;
      // Dynamic import to avoid circular deps
      const { getPlaybook } = await import('./playbooks/index.js');
      const playbook = getPlaybook(playbookId);
      if (!playbook) return { error: `Playbook ${playbookId} no encontrado` };
      const param = typeof input['parametro'] === 'string' ? input['parametro'] : undefined;
      if (param) {
        // Inject param into first task goal
        playbook.tasks[0]!.goal += ` | Contexto: ${param}`;
      }
      const result = await runPlaybook(brand, playbook);
      return result;
    },
  ),
  tool(
    'delegar_a_agente',
    'Delega una tarea específica a un agente especializado registrado.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        goal: str('Objetivo en lenguaje natural'),
        requireCheckpoint: { type: 'boolean' },
      },
      required: ['agentId', 'goal'],
    },
    async (input, brand) => {
      const agentId = input['agentId'] as string;
      const goal = input['goal'] as string;
      const requireCheckpoint = input['requireCheckpoint'] === true;
      const agent = getAgent(agentId);
      if (!agent) return { error: `Agente ${agentId} no registrado` };
      // Use orchestrator runAgentTask logic
      const { runAgentTask } = await import('./orchestrator.js');
      const result = await runAgentTask(brand, agent, goal, `deleg-${Date.now()}`);
      return { agentId, result, checkpointRequired: requireCheckpoint };
    },
  ),
  tool(
    'listar_agentes',
    'Lista todos los agentes especializados registrados con sus especialidades y nivel de autonomía.',
    { type: 'object', properties: {} },
    async () =>
      listAgents().map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        specialties: a.specialties,
        autonomyLevel: a.autonomyLevel,
        checkpoints: a.humanCheckpoints,
      })),
  ),
  tool(
    'crear_checkpoint',
    'Crea un checkpoint de aprobación humana manualmente.',
    {
      type: 'object',
      properties: {
        type: str(
          'Tipo de checkpoint: publish, dm_reply_sales, collab_offer, crisis_response, ad_spend, pricing_disclosure, strategy_change, nurture_change, boost_post',
        ),
        description: str('Descripción de qué se necesita aprobar'),
        correlationId: str('ID de correlación del playbook/tarea'),
        expiresInMinutes: { type: 'number' },
      },
      required: ['type', 'description', 'correlationId'],
    },
    async (input) => {
      const cp = createCheckpoint(
        input['type'] as never,
        input['description'] as string,
        input['correlationId'] as string,
        {},
        typeof input['expiresInMinutes'] === 'number' ? input['expiresInMinutes'] : undefined,
      );
      return cp;
    },
  ),
  tool(
    'aprobar_checkpoint',
    'Aprueba un checkpoint pendiente para que el playbook continúe.',
    {
      type: 'object',
      properties: {
        checkpointId: str('ID del checkpoint'),
        note: str('Nota opcional'),
      },
      required: ['checkpointId'],
    },
    async (input) => {
      const cp = approveCheckpoint(input['checkpointId'] as string, input['note'] as string | undefined);
      return cp ?? { error: 'Checkpoint no encontrado' };
    },
  ),
  tool(
    'rechazar_checkpoint',
    'Rechaza un checkpoint pendiente.',
    {
      type: 'object',
      properties: {
        checkpointId: str('ID del checkpoint'),
        note: str('Nota opcional'),
      },
      required: ['checkpointId'],
    },
    async (input) => {
      const cp = rejectCheckpoint(input['checkpointId'] as string, input['note'] as string | undefined);
      return cp ?? { error: 'Checkpoint no encontrado' };
    },
  ),
  tool(
    'listar_checkpoints',
    'Lista checkpoints por estado (pending, approved, rejected, expired).',
    {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['pending', 'approved', 'rejected', 'expired'] },
      },
    },
    async (input) => listCheckpoints(typeof input['status'] === 'string' ? (input['status'] as never) : undefined),
  ),
  tool(
    'publicar_instagram',
    'Publica (o agenda) un post a Instagram. Respeta DRY_RUN. Requiere aprobación humana en producción.',
    {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['reel', 'carrusel', 'imagen', 'historia'] },
        caption: str('Caption final'),
        mediaUrls: { type: 'array', items: { type: 'string' } },
        scheduledAt: str('ISO 8601 si se agenda'),
        firstComment: str('Primer comentario opcional'),
      },
      required: ['format', 'mediaUrls'],
    },
    async (input) => {
      const req: import('../integrations/meta.js').PublishRequest = {
        format: input['format'] as 'reel' | 'carrusel' | 'imagen' | 'historia',
        mediaUrls: input['mediaUrls'] as string[],
        ...(typeof input['caption'] === 'string' ? { caption: input['caption'] } : {}),
        ...(typeof input['scheduledAt'] === 'string' ? { scheduledAt: input['scheduledAt'] } : {}),
        ...(typeof input['firstComment'] === 'string' ? { firstComment: input['firstComment'] } : {}),
      };
      return publishToInstagram(req);
    },
  ),
  tool(
    'render_with_engine',
    'Renderiza contenido usando cualquier engine del Studio (Canva, CapCut, InShot, ImageGen, etc.).',
    {
      type: 'object',
      properties: {
        engine: str('Engine a usar (canva, capcut, inshot, imagegen, adobe_express, figma)'),
        format: { type: 'string', enum: ['png', 'jpg', 'mp4', 'gif', 'pdf', 'svg', 'webp'] },
        title: str('Título del diseño'),
        fields: { type: 'object', description: 'Campos de texto clave-valor para autofill' },
        assets: { type: 'array', items: { type: 'object' }, description: 'Assets a subir' },
        options: { type: 'object', description: 'Opciones específicas del engine/template' },
      },
      required: ['engine', 'format', 'title'],
    },
    async (input) => {
      const runner = getDefaultRunner();
      const engine = runner.getEngine(input['engine'] as string);
      if (!engine)
        return { error: `Engine "${input['engine']}" no registrado. Disponibles: ${runner.listEngines().join(', ')}` };
      const request = {
        id: `tool-${Date.now()}`,
        format: input['format'] as 'png' | 'jpg' | 'mp4' | 'gif' | 'pdf' | 'svg' | 'webp',
        title: input['title'] as string,
        brandProfileId: 'default',
        assets: ((input['assets'] as Array<Record<string, unknown>>) ?? []).map((a) => ({
          id: String(a['id'] ?? `asset-${Date.now()}`),
          type: String(a['type'] ?? 'image') as 'image' | 'video' | 'audio' | 'font' | 'vector',
          source: String(a['source'] ?? 'uploaded') as 'generated' | 'uploaded' | 'stock' | 'brand-kit' | 'moodboard',
          url: typeof a['url'] === 'string' ? a['url'] : undefined,
        })),
        fields: (input['fields'] as Record<string, string>) ?? {},
        options: (input['options'] as Record<string, unknown>) ?? {},
      };
      return engine.render(request);
    },
  ),
  tool(
    'run_recipe',
    'Ejecuta una receta de automatización predefinida del Content Studio.',
    {
      type: 'object',
      properties: {
        recipeId: {
          type: 'string',
          enum: [
            'reel-faceless-tutorial',
            'carrusel-educativo',
            'story-sequence-launch',
            'post-imagen-quote',
            'repurpose-blog-to-all',
            'weekly-content-package',
            'trending-audio-reel',
            'testimonial-to-carrusel',
            'product-showcase-reel',
            'faq-faceless-triple',
          ],
        },
        idea: str('Idea o tema principal'),
        extraParams: { type: 'object', description: 'Parámetros adicionales específicos de la receta' },
      },
      required: ['recipeId', 'idea'],
    },
    async (input, brand) => {
      const recipeId = input['recipeId'] as import('../capabilities/recipes/index.js').RecipeId;
      return runRecipe(brand, recipeId, {
        idea: input['idea'] as string,
        extraParams: (input['extraParams'] as Record<string, unknown>) ?? {},
      });
    },
  ),
  tool(
    'evaluate_aesthetic',
    'Evalúa la coherencia visual de una propuesta contra la guía de marca.',
    {
      type: 'object',
      properties: {
        title: str('Título de la propuesta'),
        format: { type: 'string', enum: ['reel', 'carrusel', 'post-imagen', 'historia'] },
        colorsUsed: { type: 'array', items: { type: 'string' } },
        fontsUsed: { type: 'array', items: { type: 'string' } },
        textBlocks: { type: 'number' },
        imageBlocks: { type: 'number' },
        density: { type: 'string', enum: ['low', 'medium', 'high'] },
        description: str('Descripción visual de la propuesta'),
      },
      required: ['title', 'format', 'description'],
    },
    async (input, brand) =>
      scoreAesthetic(brand, {
        title: input['title'] as string,
        format: input['format'] as string,
        colorsUsed: (input['colorsUsed'] as string[]) ?? [],
        fontsUsed: (input['fontsUsed'] as string[]) ?? [],
        textBlocks: typeof input['textBlocks'] === 'number' ? input['textBlocks'] : 3,
        imageBlocks: typeof input['imageBlocks'] === 'number' ? input['imageBlocks'] : 1,
        densityEstimate: (input['density'] as 'low' | 'medium' | 'high') ?? 'medium',
        description: input['description'] as string,
      }),
  ),
  tool(
    'ethical_audit',
    'Audita responsabilidad con el receptor, sentido común e inclusividad del contenido.',
    {
      type: 'object',
      properties: {
        caption: str('Caption a auditar'),
        hooks: { type: 'array', items: { type: 'string' } },
        visualDescription: str('Descripción visual del contenido'),
        textContent: str('Texto adicional a validar con sentido común'),
      },
      required: ['caption'],
    },
    async (input, brand) => {
      const receptor = auditReceptorResponsibility(
        brand,
        input['caption'] as string,
        (input['hooks'] as string[]) ?? [],
      );
      const commonSense =
        typeof input['textContent'] === 'string' ? validateCommonSense(input['textContent'] as string) : null;
      return {
        receptor,
        commonSense,
        overallPass: receptor.passes && (commonSense?.passes ?? true),
      };
    },
  ),
  tool(
    'adapt_format',
    'Adapta una pieza de contenido a otro formato (ej: reel → carrusel, carrusel → stories).',
    {
      type: 'object',
      properties: {
        sourceFormat: { type: 'string', enum: ['reel', 'carrusel', 'post-imagen', 'historia', 'blog', 'video'] },
        targetFormats: { type: 'array', items: { type: 'string' } },
        content: str('Contenido original a adaptar'),
      },
      required: ['sourceFormat', 'targetFormats', 'content'],
    },
    async (input, brand) => {
      const { adaptFormat } = await import('../capabilities/agents/specialized.js');
      return adaptFormat(brand, {
        sourceFormat: input['sourceFormat'] as string,
        targetFormats: input['targetFormats'] as string[],
        content: input['content'] as string,
      });
    },
  ),
  tool(
    'generate_asset',
    'Genera un asset visual con IA (imagen) usando el proveedor configurado.',
    {
      type: 'object',
      properties: {
        prompt: str('Prompt descriptivo'),
        aspectRatio: { type: 'string', enum: ['1:1', '4:5', '9:16', '16:9'] },
        count: { type: 'number' },
        style: str('Estilo visual opcional'),
      },
      required: ['prompt', 'aspectRatio'],
    },
    async (input) =>
      generateImage({
        prompt: input['prompt'] as string,
        aspectRatio: input['aspectRatio'] as '1:1' | '4:5' | '9:16' | '16:9',
        count: typeof input['count'] === 'number' ? input['count'] : 1,
        style: typeof input['style'] === 'string' ? input['style'] : undefined,
      }),
  ),
  tool(
    'curate_moodboard',
    'Crea, lista o agrega entradas a moodboards visuales de la marca.',
    {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['create', 'list', 'add'] },
        moodboardId: str('ID del moodboard (para add)'),
        name: str('Nombre (para create)'),
        theme: str('Tema (para create)'),
        entryUrl: str('URL de la entrada (para add)'),
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['action'],
    },
    async (input) => {
      const action = input['action'] as string;
      if (action === 'create') {
        return createMoodboard(input['name'] as string, input['theme'] as string);
      }
      if (action === 'list') {
        return listMoodboards();
      }
      if (action === 'add') {
        return addEntry(input['moodboardId'] as string, {
          url: input['entryUrl'] as string,
          tags: (input['tags'] as string[]) ?? [],
          source: 'url',
        });
      }
      return { error: 'Acción no válida' };
    },
  ),
  tool(
    'brandkit_list_assets',
    'Lista los assets del Brand Kit de la marca, filtrados opcionalmente por tipo.',
    {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [
            'logo',
            'avatar',
            'highlight-cover',
            'watermark',
            'signature',
            'font',
            'color-swatch',
            'texture',
            'icon',
          ],
          description: 'Filtrar por tipo de asset',
        },
      },
    },
    async (_input, brand) => listAssets(brand.name, _input['type'] as BrandKitAssetType),
  ),
  tool(
    'brandkit_add_asset',
    'Agrega un nuevo asset al Brand Kit con validación automática.',
    {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: [
            'logo',
            'avatar',
            'highlight-cover',
            'watermark',
            'signature',
            'font',
            'color-swatch',
            'texture',
            'icon',
          ],
          description: 'Tipo de asset',
        },
        name: str('Nombre del asset'),
        url: str('URL del asset'),
        usageRules: { type: 'array', items: { type: 'string' }, description: 'Reglas de uso' },
        variants: { type: 'object', description: 'Variantes (ej: { primary: "url", monochrome: "url" })' },
      },
      required: ['type', 'name', 'url'],
    },
    async (input, brand) => {
      const asset = addAsset(brand.name, {
        type: input['type'] as BrandKitAssetType,
        name: input['name'] as string,
        url: input['url'] as string,
        usageRules: (input['usageRules'] as string[]) ?? [],
        variants: (input['variants'] as Record<string, string>) ?? undefined,
      });
      const validation = validateAssetAgainstBrand(asset, brand);
      return { asset, validation };
    },
  ),
  tool(
    'brandkit_validate_asset',
    'Valida un asset del Brand Kit contra las reglas de marca.',
    {
      type: 'object',
      properties: {
        assetId: str('ID del asset a validar'),
      },
      required: ['assetId'],
    },
    async (input, brand) => {
      const asset = listAssets(brand.name).find((a) => a.id === input['assetId']);
      if (!asset) return { error: `Asset ${input['assetId']} no encontrado` };
      return validateAssetAgainstBrand(asset, brand);
    },
  ),
  tool(
    'brand_consistency_check',
    'Audita la coherencia de una pieza de contenido contra el Brand Kit y la guía de marca. Score < 70 = bloqueado.',
    {
      type: 'object',
      properties: {
        title: str('Título de la pieza'),
        format: { type: 'string', enum: ['reel', 'carrusel', 'post-imagen', 'historia'], description: 'Formato' },
        description: str('Descripción visual del contenido'),
        colorsUsed: { type: 'array', items: { type: 'string' }, description: 'Colores hex usados' },
        fontsUsed: { type: 'array', items: { type: 'string' }, description: 'Fuentes usadas' },
        iconography: { type: 'array', items: { type: 'string' }, description: 'Iconografía o elementos gráficos' },
      },
      required: ['title', 'format', 'description'],
    },
    async (input, brand) => {
      const kit = ensureBrandKit(brand.name);
      return runBrandConsistencyCheck(
        {
          title: input['title'] as string,
          format: input['format'] as 'reel' | 'carrusel' | 'post-imagen' | 'historia',
          description: input['description'] as string,
          colorsUsed: (input['colorsUsed'] as string[]) ?? [],
          fontsUsed: (input['fontsUsed'] as string[]) ?? [],
          iconography: (input['iconography'] as string[]) ?? [],
        },
        brand,
        kit,
      );
    },
  ),
  tool(
    'brand_strategy_get',
    'Obtiene la estrategia completa de marca: visión, misión, valores, posicionamiento, promesa, arquetipo, etc.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, brand) => {
      const strategy = ensureBrandStrategy(brand.name);
      return { strategy, formatted: formatBrandStrategyContext(strategy) };
    },
  ),
  tool(
    'brand_strategy_update',
    'Actualiza campos de la estrategia de marca.',
    {
      type: 'object',
      properties: {
        vision: str('Visión de marca'),
        mission: str('Misión'),
        values: { type: 'array', items: { type: 'string' }, description: 'Valores de marca' },
        promise: str('Promesa de valor'),
        positioning: str('Posicionamiento'),
        story: str('Historia de marca'),
        personality: { type: 'array', items: { type: 'string' }, description: 'Rasgos de personalidad' },
        archetype: str('Arquetipo de marca'),
        differentiators: { type: 'array', items: { type: 'string' }, description: 'Diferenciadores' },
        experiencePrinciples: { type: 'array', items: { type: 'string' }, description: 'Principios de experiencia' },
      },
    },
    async (input, brand) => {
      const updates: Record<string, unknown> = {};
      if (input['vision']) updates.vision = input['vision'];
      if (input['mission']) updates.mission = input['mission'];
      if (input['values']) updates.values = input['values'];
      if (input['promise']) updates.promise = input['promise'];
      if (input['positioning']) updates.positioning = input['positioning'];
      if (input['story']) updates.story = input['story'];
      if (input['personality']) updates.personality = input['personality'];
      if (input['archetype']) updates.archetype = input['archetype'];
      if (input['differentiators']) updates.differentiators = input['differentiators'];
      if (input['experiencePrinciples']) updates.experiencePrinciples = input['experiencePrinciples'];
      const updated = updateBrandStrategy(brand.name, updates);
      return { updated, success: true };
    },
  ),
  tool(
    'brand_rules_evaluate',
    'Evalúa una pieza de contenido contra TODAS las reglas de branding. Score < 70 = bloqueado.',
    {
      type: 'object',
      properties: {
        title: str('Título de la pieza'),
        format: { type: 'string', enum: ['reel', 'carrusel', 'post-imagen', 'historia'], description: 'Formato' },
        description: str('Descripción visual'),
        caption: str('Caption'),
        colorsUsed: { type: 'array', items: { type: 'string' }, description: 'Colores hex' },
        fontsUsed: { type: 'array', items: { type: 'string' }, description: 'Fuentes' },
        iconography: { type: 'array', items: { type: 'string' }, description: 'Iconografía' },
      },
      required: ['title', 'format', 'description'],
    },
    async (input, brand) => {
      const strategy = ensureBrandStrategy(brand.name);
      const result = evaluateBrandRules(
        {
          title: input['title'] as string,
          format: input['format'] as import('../config/types.js').ContentFormat,
          description: input['description'] as string,
          caption: input['caption'] as string,
          colorsUsed: (input['colorsUsed'] as string[]) ?? [],
          fontsUsed: (input['fontsUsed'] as string[]) ?? [],
          iconography: (input['iconography'] as string[]) ?? [],
        },
        undefined,
        undefined,
        brand,
        strategy,
      );
      return { result, report: generateBrandRuleReport(result) };
    },
  ),
  tool(
    'brand_rules_list',
    'Lista las reglas de branding por categoría o severidad.',
    {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          enum: ['visual', 'voice', 'strategy', 'experience', 'asset-usage'],
          description: 'Filtrar por categoría',
        },
        severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'], description: 'Filtrar por severidad' },
      },
    },
    async (input) => {
      let rules = ALL_BRAND_RULES;
      if (input['category']) rules = rules.filter((r) => r.category === input['category']);
      if (input['severity']) rules = rules.filter((r) => r.severity === input['severity']);
      return rules.map((r) => ({ id: r.id, category: r.category, severity: r.severity, description: r.description }));
    },
  ),
  // ── Computer Use ──────────────────────────────────────────────────────────
  tool(
    'computer_use_session',
    'Controla el cursor y teclado del sistema operativo para navegar Instagram o cualquier app de escritorio como un humano. Ejecuta una sesión de computer use con Claude como piloto.',
    {
      type: 'object',
      properties: {
        goal: str('Objetivo de la sesión de control de computadora. Qué debe hacer exactamente.'),
        context: str('Contexto adicional sobre el estado de la pantalla o la tarea (opcional)'),
        maxIterations: { type: 'number', description: 'Máximo de iteraciones (default: 20)' },
      },
      required: ['goal'],
    },
    async (input, brand) =>
      runComputerUseSession(brand, {
        goal: input['goal'] as string,
        context: typeof input['context'] === 'string' ? input['context'] : undefined,
        maxIterations: typeof input['maxIterations'] === 'number' ? input['maxIterations'] : 20,
      }),
  ),
  tool(
    'instagram_navegar',
    'Navega a una sección específica de Instagram usando control de computadora. Destinos: feed, barraHistorias, cabecera, buscador, explorar, reels, historias, crearPublicacion, perfil, fotoDePerfil, biografia, historiasDestacadas, contadores, grid, botonMeGusta, botonCompartir, botonGuardar, caption, comentarios, mensajesDirectos, notificaciones.',
    {
      type: 'object',
      properties: {
        destino: str(`Sección de Instagram a la que navegar. Opciones: ${Object.keys(INSTAGRAM_UI_ZONES).join(', ')}`),
        accionEspecifica: str('Acción específica a realizar una vez en esa sección (opcional)'),
        cuentaObjetivo: str('Nombre de usuario (@) si la acción es sobre una cuenta específica (opcional)'),
        maxIterations: { type: 'number', description: 'Máximo de pasos (default: 15)' },
      },
      required: ['destino'],
    },
    async (input, brand) =>
      navegarInstagram(brand, {
        destino: input['destino'] as string,
        accionEspecifica: typeof input['accionEspecifica'] === 'string' ? input['accionEspecifica'] : undefined,
        cuentaObjetivo: typeof input['cuentaObjetivo'] === 'string' ? input['cuentaObjetivo'] : undefined,
        maxIterations: typeof input['maxIterations'] === 'number' ? input['maxIterations'] : 15,
      }),
  ),
  tool(
    'instagram_interactuar_post',
    'Da like, comenta, guarda o comparte un post de Instagram usando control de computadora.',
    {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['like', 'comentar', 'guardar', 'compartir'] },
        contexto: str('Descripción del post o cuenta donde realizar la acción'),
      },
      required: ['accion', 'contexto'],
    },
    async (input, brand) =>
      interactuarConPost(
        brand,
        input['accion'] as 'like' | 'comentar' | 'guardar' | 'compartir',
        input['contexto'] as string,
      ),
  ),
  tool(
    'instagram_leer_feed',
    'Lee y analiza los primeros N posts del feed de Instagram usando control de computadora.',
    {
      type: 'object',
      properties: {
        cantidadPosts: { type: 'number', description: 'Cantidad de posts a leer (default: 5)' },
      },
    },
    async (input, brand) => leerFeed(brand, typeof input['cantidadPosts'] === 'number' ? input['cantidadPosts'] : 5),
  ),
  tool(
    'instagram_buscar',
    'Busca una cuenta o hashtag en Instagram usando el buscador nativo (computer use).',
    {
      type: 'object',
      properties: {
        termino: str('Término a buscar (nombre de usuario o hashtag sin #)'),
        tipo: { type: 'string', enum: ['cuenta', 'hashtag'] },
      },
      required: ['termino'],
    },
    async (input, brand) =>
      buscarCuentaOHashtag(
        brand,
        input['termino'] as string,
        (input['tipo'] as 'cuenta' | 'hashtag' | undefined) ?? 'cuenta',
      ),
  ),
  tool(
    'instagram_leer_dms',
    'Abre la bandeja de mensajes directos de Instagram y lee las últimas conversaciones usando computer use.',
    {
      type: 'object',
      properties: {
        limite: { type: 'number', description: 'Cantidad de conversaciones a leer (default: 10)' },
      },
    },
    async (input, brand) => leerDMs(brand, typeof input['limite'] === 'number' ? input['limite'] : 10),
  ),
  tool(
    'instagram_ver_perfil',
    'Visita y analiza el perfil de una cuenta de Instagram usando computer use. Extrae bio, seguidores, posts, highlights.',
    {
      type: 'object',
      properties: {
        cuenta: str('Nombre de usuario (sin @) del perfil a visitar'),
      },
      required: ['cuenta'],
    },
    async (input, brand) => verPerfil(brand, input['cuenta'] as string),
  ),
  tool(
    'instagram_ver_notificaciones',
    'Abre el centro de notificaciones de Instagram y clasifica los últimos eventos usando computer use.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, brand) => verNotificaciones(brand),
  ),

  // ── Voz e Idioma ──────────────────────────────────────────────────────────
  tool(
    'talia_hablar',
    'Talía habla un texto en voz alta por los altavoces del sistema. Útil para respuestas manos libres.',
    {
      type: 'object',
      properties: {
        texto: str('Texto que Talía debe decir en voz alta'),
        idioma: {
          type: 'string',
          enum: ['es-AR', 'es-ES', 'en-US', 'pt-BR', 'fr-FR'],
          description: 'Idioma de la voz',
        },
      },
      required: ['texto'],
    },
    async (input) => {
      const result = await speak(input['texto'] as string, { language: (input['idioma'] as never) ?? 'es-AR' });
      return result;
    },
  ),
  tool(
    'detectar_wake_word',
    'Detecta si un texto activa a Talía (frases como "Hola Talía", "Hey Talia", "Olá Tália" en 15+ idiomas).',
    {
      type: 'object',
      properties: { transcript: str('Texto a analizar para detectar wake word') },
      required: ['transcript'],
    },
    async (input) => detectWakeWord(input['transcript'] as string),
  ),
  tool(
    'cambiar_idioma',
    'Cambia el idioma del sistema FeedIA. Afecta respuestas, menús y voz de Talía.',
    {
      type: 'object',
      properties: {
        idioma: { type: 'string', enum: ['es-AR', 'es-ES', 'en-US', 'en-GB', 'pt-BR', 'fr-FR', 'de-DE', 'it-IT'] },
      },
      required: ['idioma'],
    },
    async (input) => {
      setLocale(input['idioma'] as SupportedLocale);
      return { ok: true, idioma: input['idioma'], disponibles: listSupportedLocales() };
    },
  ),
  tool(
    'menu_manos_libres',
    'Devuelve el menú de opciones del modo manos libres de Talía.',
    { type: 'object', properties: {} },
    async () => ({ menu: HANDS_FREE_MENU, idiomaActual: getLocale() }),
  ),

  // ── Hub de IA Open Source ──────────────────────────────────────────────────
  tool(
    'hub_ia_estado',
    'Muestra el estado de todos los proveedores de IA disponibles: Groq, Ollama, OpenRouter, HuggingFace, Anthropic.',
    { type: 'object', properties: {} },
    async () => {
      const [summary, statuses] = await Promise.all([getHubSummary(), getProviderStatuses()]);
      return { summary, statuses };
    },
  ),
  tool(
    'hub_ia_chat',
    'Envía un prompt al mejor proveedor de IA disponible (Groq → OpenRouter → Ollama). Usa proveedores gratuitos automáticamente.',
    {
      type: 'object',
      properties: {
        prompt: str('Prompt a enviar'),
        proveedor: {
          type: 'string',
          enum: ['groq', 'openrouter', 'ollama', 'huggingface'],
          description: 'Proveedor preferido (opcional)',
        },
        soloGratuito: { type: 'boolean', description: 'Usar solo proveedores gratuitos' },
        systemPrompt: str('System prompt personalizado (opcional)'),
      },
      required: ['prompt'],
    },
    async (input) =>
      hubChat(input['prompt'] as string, {
        preferProvider: input['proveedor'] as never,
        freeOnly: (input['soloGratuito'] as boolean) ?? false,
        systemPrompt: input['systemPrompt'] as string | undefined,
      }),
  ),
  tool(
    'hub_sentiment',
    'Analiza el sentimiento de un texto usando HuggingFace o LLM. Retorna positive/negative/neutral.',
    {
      type: 'object',
      properties: { texto: str('Texto a analizar') },
      required: ['texto'],
    },
    async (input) => hubSentiment(input['texto'] as string),
  ),
  tool(
    'groq_chat',
    'Chat ultra-rápido con Groq (LLaMA 3, Mixtral). Free tier. Ideal para tareas rápidas.',
    {
      type: 'object',
      properties: {
        prompt: str('Mensaje al modelo'),
        modelo: { type: 'string', description: 'Modelo Groq (ej: llama-3.3-70b-versatile)' },
        systemPrompt: str('System prompt (opcional)'),
      },
      required: ['prompt'],
    },
    async (input) =>
      groqAsk(input['prompt'] as string, {
        model: input['modelo'] as never,
        systemPrompt: input['systemPrompt'] as string | undefined,
      }),
  ),
  tool(
    'ollama_chat',
    'Chat con LLM local usando Ollama. 100% offline, sin costo, máxima privacidad. Requiere Ollama instalado.',
    {
      type: 'object',
      properties: {
        prompt: str('Mensaje al modelo local'),
        modelo: str('Modelo Ollama (ej: llama3.2, mistral, gemma2)'),
        systemPrompt: str('System prompt (opcional)'),
      },
      required: ['prompt'],
    },
    async (input) =>
      ollamaAsk(input['prompt'] as string, {
        model: input['modelo'] as string | undefined,
        systemPrompt: input['systemPrompt'] as string | undefined,
      }),
  ),
  tool(
    'ollama_modelos',
    'Lista los modelos de Ollama instalados localmente.',
    { type: 'object', properties: {} },
    async () => {
      const available = await isOllamaAvailable();
      if (!available)
        return {
          available: false,
          models: [],
          message: 'Ollama no está instalado o no está corriendo en localhost:11434',
        };
      return { available: true, models: await listOllamaModels() };
    },
  ),
  tool(
    'openrouter_chat',
    'Chat con OpenRouter. Acceso a muchos LLMs, con modelos free disponibles.',
    {
      type: 'object',
      properties: {
        prompt: str('Mensaje al modelo'),
        soloGratuito: { type: 'boolean', description: 'Usar solo modelos gratuitos' },
        systemPrompt: str('System prompt (opcional)'),
      },
      required: ['prompt'],
    },
    async (input) =>
      openRouterAsk(input['prompt'] as string, {
        model: input['soloGratuito'] ? 'meta-llama/llama-3.2-3b-instruct:free' : undefined,
        systemPrompt: input['systemPrompt'] as string | undefined,
      }),
  ),

  // ── API Directory ──────────────────────────────────────────────────────────
  tool(
    'buscar_apis_publicas',
    'Busca APIs públicas y gratuitas en publicapis.io. Útil para descubrir nuevas integraciones.',
    {
      type: 'object',
      properties: {
        query: str('Término de búsqueda (ej: "instagram", "images", "social")'),
        categoria: str('Categoría opcional (ej: "Social", "Machine Learning")'),
      },
      required: ['query'],
    },
    async (input) => searchPublicApis(input['query'] as string, input['categoria'] as string | undefined),
  ),
  tool(
    'apis_curadas_feedia',
    'Lista las APIs curadas y recomendadas para FeedIA: IA, BaaS, imágenes, tendencias, etc.',
    { type: 'object', properties: {} },
    async () => ({ apis: CURATED_APIS_FOR_FEEDIA, total: CURATED_APIS_FOR_FEEDIA.length }),
  ),

  // ── Supabase (BaaS) ────────────────────────────────────────────────────────
  tool(
    'supabase_select',
    'Consulta datos de Supabase (PostgreSQL BaaS open-source). Requiere SUPABASE_URL y SUPABASE_ANON_KEY.',
    {
      type: 'object',
      properties: {
        tabla: str('Nombre de la tabla'),
        columnas: str('Columnas a seleccionar (ej: "id,nombre,email")'),
        limite: { type: 'number', description: 'Máximo de filas (default: 20)' },
      },
      required: ['tabla'],
    },
    async (input) => {
      if (!isSupabaseAvailable()) return { error: 'Supabase no configurado. Agregá SUPABASE_URL y SUPABASE_ANON_KEY.' };
      return supabaseSelect(input['tabla'] as string, {
        select: input['columnas'] as string | undefined,
        limit: (input['limite'] as number | undefined) ?? 20,
      });
    },
  ),
  tool(
    'supabase_insert',
    'Inserta un registro en Supabase.',
    {
      type: 'object',
      properties: {
        tabla: str('Nombre de la tabla'),
        datos: { type: 'object', description: 'Objeto con los datos a insertar' },
      },
      required: ['tabla', 'datos'],
    },
    async (input) => {
      if (!isSupabaseAvailable()) return { error: 'Supabase no configurado.' };
      return supabaseInsert(input['tabla'] as string, input['datos'] as Record<string, never>);
    },
  ),

  // ── OS Autónomo ────────────────────────────────────────────────────────────
  tool(
    'os_estado',
    'Muestra el estado completo del sistema operativo autónomo FeedIA: modo, tareas, salud, proveedores.',
    { type: 'object', properties: {} },
    async () => getOSStatus(),
  ),
  tool(
    'os_agendar_tarea',
    'Agenda una tarea autónoma para el OS de FeedIA. La ejecutará automáticamente según prioridad.',
    {
      type: 'object',
      properties: {
        goal: str('Objetivo de la tarea'),
        prioridad: { type: 'string', enum: ['critical', 'high', 'normal'] },
        demora: { type: 'number', description: 'Minutos de demora antes de ejecutar (default: 0)' },
      },
      required: ['goal'],
    },
    async (input) => {
      const id = scheduleOSTask(
        input['goal'] as string,
        (input['prioridad'] as never) ?? 'normal',
        (input['demora'] as number | undefined) ?? 0,
      );
      return { ok: true, id, message: `Tarea agendada: ${(input['goal'] as string).slice(0, 80)}` };
    },
  ),
  tool(
    'os_autonomia',
    'Cambia el nivel de autonomía del sistema: supervised (solo ejecuta con aprobación), semi_autonomous, fully_autonomous.',
    {
      type: 'object',
      properties: {
        nivel: { type: 'string', enum: ['supervised', 'semi_autonomous', 'fully_autonomous'] },
      },
      required: ['nivel'],
    },
    async (input) => {
      setAutonomyLevel(input['nivel'] as OSState['autonomyLevel']);
      return { ok: true, nivel: input['nivel'] };
    },
  ),
  tool(
    'os_evolucionar',
    'Ejecuta el ciclo de auto-evolución del sistema: analiza performance, descubre APIs y genera mejoras.',
    { type: 'object', properties: {} },
    async () =>
      runOSEvolution().then(() => ({
        ok: true,
        message: 'Ciclo de evolución ejecutado. Ver data/runtime/evolution.json para detalles.',
      })),
  ),
  tool(
    'os_salud',
    'Muestra el estado de salud de todos los agentes del sistema y las últimas acciones de auto-reparación.',
    { type: 'object', properties: {} },
    async () => getSystemHealth(),
  ),
  tool(
    'os_self_healing',
    'Ejecuta manualmente el ciclo de auto-reparación del sistema.',
    { type: 'object', properties: {} },
    async () => triggerSelfHealing(),
  ),
  tool(
    'os_lecciones',
    'Muestra las lecciones aprendidas pendientes de aplicar (top 10 por impacto).',
    { type: 'object', properties: {} },
    async () => ({ lecciones: getTopLessons(10) }),
  ),
  tool(
    'os_agregar_leccion',
    'Registra una lección aprendida para que el OS la aplique en futuras evoluciones.',
    {
      type: 'object',
      properties: {
        agente: str('ID del agente al que aplica'),
        contexto: str('Contexto en que se aprendió la lección'),
        leccion: str('Qué se aprendió (conciso y accionable)'),
        impacto: { type: 'string', enum: ['high', 'medium', 'low'] },
        categoria: {
          type: 'string',
          enum: ['prompt_improvement', 'parameter_tuning', 'new_capability', 'api_discovery', 'workflow_optimization'],
        },
      },
      required: ['agente', 'contexto', 'leccion'],
    },
    async (input) => {
      addLesson({
        agentId: input['agente'] as string,
        context: input['contexto'] as string,
        lesson: input['leccion'] as string,
        impact: (input['impacto'] as never) ?? 'medium',
        category: (input['categoria'] as never) ?? 'prompt_improvement',
      });
      return { ok: true };
    },
  ),

  // ── Tipos de Agentes IA ────────────────────────────────────────────────────
  tool(
    'listar_tipos_agente',
    'Lista los 5 tipos de agentes IA según la clasificación técnica IBM: simple_reflex, model_based_reflex, goal_based, utility_based, learning.',
    {
      type: 'object',
      properties: {
        tipo: {
          type: 'string',
          enum: ['simple_reflex', 'model_based_reflex', 'goal_based', 'utility_based', 'learning'],
          description: 'Si se especifica, devuelve solo ese tipo con descripción completa.',
        },
      },
    },
    async (input) => {
      if (typeof input['tipo'] === 'string') {
        const tipo = input['tipo'] as AgentTypeCategory;
        return {
          tipo: getAgentType(tipo),
          descripcionCompleta: describeAgentType(tipo),
          agentesRegistrados: getAgentsByType(tipo).map((a) => ({
            id: a.id,
            nombre: a.name,
            tagline: a.tagline,
          })),
        };
      }
      return {
        tipos: listAgentTypes(),
        descripcionCompleta: 'Usar con tipo específico para descripción detallada.',
      };
    },
  ),

  // ── Talía: Agent Manager ──────────────────────────────────────────────────
  tool(
    'talia_listar_equipo',
    'Talía: lista todos los agentes del sistema con sus especialidades, tipo IBM, autonomía y herramientas disponibles.',
    {
      type: 'object',
      properties: {},
    },
    async () => {
      const { listAgents: listAll } = await import('./registry.js');
      const agents = listAll();
      return {
        totalAgentes: agents.length,
        agentes: agents.map((a) => ({
          id: a.id,
          nombre: a.name,
          emoji: a.emoji,
          tagline: a.tagline,
          especialidades: a.specialties,
          tipoAgente: a.agentType ?? 'no_clasificado',
          autonomia: a.autonomyLevel,
          checkpoints: a.humanCheckpoints,
          herramientas: a.toolNames,
          maxIteraciones: a.maxIterations,
        })),
      };
    },
  ),
  tool(
    'talia_ejecutar_playbook',
    'Talía: diseña y ejecuta un playbook de tareas multi-agente. Recibe la definición del playbook con tareas asignadas a agentes específicos y las ejecuta en el orden correcto.',
    {
      type: 'object',
      properties: {
        id: str('ID único del playbook (ej: talia-semana-contenido-1)'),
        name: str('Nombre descriptivo del playbook'),
        description: str('Qué hace este playbook'),
        tasks: {
          type: 'array',
          description: 'Lista de tareas a ejecutar',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'ID único de la tarea' },
              agentId: { type: 'string', description: 'ID del agente asignado' },
              goal: { type: 'string', description: 'Objetivo de la tarea para el agente' },
              dependsOn: {
                type: 'array',
                items: { type: 'string' },
                description: 'IDs de tareas que deben completarse antes',
              },
              checkpointType: {
                type: 'string',
                description: 'Tipo de checkpoint si requiere aprobación humana (opcional)',
              },
              checkpointDescription: { type: 'string', description: 'Descripción del checkpoint (opcional)' },
            },
            required: ['id', 'agentId', 'goal'],
          },
        },
        maxGlobalIterations: { type: 'number', description: 'Máximo de iteraciones globales (default: 30)' },
      },
      required: ['id', 'name', 'description', 'tasks'],
    },
    async (input, brand) => runPlaybook(brand, input as unknown as PlaybookDefinition),
  ),

  tool(
    'brand_health_report',
    'Genera un reporte de salud de marca completo.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, brand) => {
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
          logos: kit.assets.filter((a) => a.type === 'logo').length,
          avatars: kit.assets.filter((a) => a.type === 'avatar').length,
          highlights: kit.assets.filter((a) => a.type === 'highlight-cover').length,
          watermarks: kit.assets.filter((a) => a.type === 'watermark').length,
        },
        rules: {
          total: ALL_BRAND_RULES.length,
          byCategory: {
            visual: ALL_BRAND_RULES.filter((r) => r.category === 'visual').length,
            voice: ALL_BRAND_RULES.filter((r) => r.category === 'voice').length,
            strategy: ALL_BRAND_RULES.filter((r) => r.category === 'strategy').length,
            experience: ALL_BRAND_RULES.filter((r) => r.category === 'experience').length,
            assetUsage: ALL_BRAND_RULES.filter((r) => r.category === 'asset-usage').length,
          },
        },
      };
      return report;
    },
  ),
];

// ── Instagram Actions (Computer Use Atómico) ─────────────────────────────────

tools.push(
  tool(
    'ig_publicar_post',
    'Publica un post (imagen o carrusel) en Instagram. Incluye seleccionar media, escribir caption con hashtags y publicar.',
    {
      type: 'object',
      properties: {
        imagePath: str('Ruta local de la imagen o video a publicar'),
        caption: str('Caption completo con hashtags y CTA (ya formateado)'),
        location: str('Ubicación opcional a agregar al post'),
        altText: str('Texto alternativo para accesibilidad (opcional)'),
        collaborator: str('Username de cuenta para Collab post (opcional, sin @)'),
        isCarousel: { type: 'boolean', description: 'true si es un carrusel con múltiples imágenes' },
        additionalImages: {
          type: 'array',
          items: { type: 'string' },
          description: 'Rutas de imágenes adicionales para carrusel',
        },
      },
      required: ['imagePath', 'caption'],
    },
    async (input, brand) =>
      publicarPost(brand, {
        imagePath: input.imagePath as string,
        caption: input.caption as string,
        location: input.location as string | undefined,
        altText: input.altText as string | undefined,
        collaborator: input.collaborator as string | undefined,
        isCarousel: input.isCarousel as boolean | undefined,
        additionalImages: input.additionalImages as string[] | undefined,
      }),
  ),

  tool(
    'ig_publicar_historia',
    'Publica una Historia (Story) en Instagram con stickers interactivos opcionales (poll, pregunta, quiz, link, countdown).',
    {
      type: 'object',
      properties: {
        mediaPath: str('Ruta local de la imagen o video para la historia'),
        sticker: str('Tipo de sticker: poll | question | quiz | link | countdown | emoji_slider'),
        stickerText: str('Texto del sticker (pregunta, título del countdown, etc.)'),
        stickerOption1: str('Opción 1 del poll'),
        stickerOption2: str('Opción 2 del poll'),
        linkUrl: str('URL para el link sticker'),
        mentionAccount: str('Cuenta a mencionar en la historia (sin @)'),
        hashtagToAdd: str('Hashtag a agregar como sticker (sin #)'),
      },
      required: ['mediaPath'],
    },
    async (input, brand) =>
      publicarHistoria(brand, {
        mediaPath: input.mediaPath as string,
        sticker: input.sticker as never,
        stickerText: input.stickerText as string | undefined,
        stickerOption1: input.stickerOption1 as string | undefined,
        stickerOption2: input.stickerOption2 as string | undefined,
        linkUrl: input.linkUrl as string | undefined,
        mentionAccount: input.mentionAccount as string | undefined,
        hashtagToAdd: input.hashtagToAdd as string | undefined,
      }),
  ),

  tool(
    'ig_publicar_reel',
    'Publica un Reel en Instagram. Sube el video, agrega caption, busca audio trending si se especifica y publica.',
    {
      type: 'object',
      properties: {
        videoPath: str('Ruta local del video MP4 del Reel'),
        caption: str('Caption del Reel con hashtags y CTA'),
        audioName: str('Nombre del audio trending a usar (opcional)'),
        coverFrameTime: { type: 'number', description: 'Segundo del video a usar como portada (opcional)' },
        shareToFeed: { type: 'boolean', description: 'true para también compartir en el feed (default: true)' },
      },
      required: ['videoPath', 'caption'],
    },
    async (input, brand) =>
      publicarReel(brand, {
        videoPath: input.videoPath as string,
        caption: input.caption as string,
        audioName: input.audioName as string | undefined,
        coverFrameTime: input.coverFrameTime as number | undefined,
        shareToFeed: input.shareToFeed as boolean | undefined,
      }),
  ),

  tool(
    'ig_comentar_post',
    'Escribe un comentario en un post de Instagram. Puede ser un comentario nuevo o respuesta a otro comentario.',
    {
      type: 'object',
      properties: {
        postUrl: str('URL directa del post (opcional si se provee postContext)'),
        postContext: str('Descripción del post a comentar si no hay URL disponible'),
        commentText: str('Texto exacto del comentario a escribir'),
        replyToUser: str('Username del comentario a responder (sin @), para responder un comentario específico'),
      },
      required: ['commentText'],
    },
    async (input, brand) =>
      comentarEnPost(brand, {
        postUrl: input.postUrl as string | undefined,
        postContext: input.postContext as string | undefined,
        commentText: input.commentText as string,
        replyToUser: input.replyToUser as string | undefined,
      }),
  ),

  tool(
    'ig_dar_like',
    'Da Like (Me gusta) a un post específico de Instagram.',
    {
      type: 'object',
      properties: {
        postContext: str('URL del post o descripción de qué post likear (ej: "último post de @usuario" o URL directa)'),
      },
      required: ['postContext'],
    },
    async (input, brand) => darLike(brand, input.postContext as string),
  ),

  tool(
    'ig_seguir_cuenta',
    'Sigue una cuenta de Instagram. Verifica que no esté ya seguida antes de actuar.',
    {
      type: 'object',
      properties: {
        cuenta: str('Username de la cuenta a seguir (sin @)'),
      },
      required: ['cuenta'],
    },
    async (input, brand) => seguirCuenta(brand, input.cuenta as string),
  ),

  tool(
    'ig_enviar_dm',
    'Envía un mensaje directo (DM) a una cuenta de Instagram.',
    {
      type: 'object',
      properties: {
        username: str('Username del destinatario (sin @)'),
        message: str('Texto del mensaje a enviar'),
        isNewConversation: { type: 'boolean', description: 'true si es una conversación nueva, false si ya existe' },
      },
      required: ['username', 'message'],
    },
    async (input, brand) =>
      enviarDM(brand, {
        username: input.username as string,
        message: input.message as string,
        isNewConversation: input.isNewConversation as boolean | undefined,
      }),
  ),

  tool(
    'ig_responder_dms_bulk',
    'Responde múltiples DMs pendientes en Instagram de forma secuencial con delays humanos.',
    {
      type: 'object',
      properties: {
        respuestas: {
          type: 'array',
          description: 'Array de {username, respuesta} para responder cada DM',
          items: {
            type: 'object',
            properties: {
              username: str('Username del destinatario (sin @)'),
              respuesta: str('Texto de la respuesta a enviar'),
            },
          },
        },
      },
      required: ['respuestas'],
    },
    async (input, brand) =>
      responderDMsPendientes(brand, input.respuestas as Array<{ username: string; respuesta: string }>),
  ),

  tool(
    'ig_editar_perfil',
    'Edita el perfil de Instagram: bio, nombre, website o foto de perfil.',
    {
      type: 'object',
      properties: {
        bio: str('Nueva biografía del perfil (máx 150 caracteres)'),
        website: str('Nueva URL para el link en bio'),
        displayName: str('Nuevo nombre visible (con keywords del niche)'),
        newProfilePhotoPath: str('Ruta local de la nueva foto de perfil'),
      },
    },
    async (input, brand) =>
      editarPerfil(brand, {
        bio: input.bio as string | undefined,
        website: input.website as string | undefined,
        displayName: input.displayName as string | undefined,
        newProfilePhotoPath: input.newProfilePhotoPath as string | undefined,
      }),
  ),

  tool(
    'ig_beacon_engagement',
    'Realiza el "Beacon Engagement" estratégico: interactúa con cuentas faro del niche para potenciar el alcance orgánico propio.',
    {
      type: 'object',
      properties: {
        targetAccounts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de usernames de cuentas faro (sin @, máx 5)',
        },
        actionsPerAccount: {
          type: 'number',
          description: 'Número de acciones por cuenta (likes + comentarios, máx 5)',
        },
        commentTexts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de textos de comentarios para rotar entre cuentas',
        },
      },
      required: ['targetAccounts', 'commentTexts'],
    },
    async (input, brand) =>
      realizarBeaconEngagement(brand, {
        targetAccounts: input.targetAccounts as string[],
        actionsPerAccount: (input.actionsPerAccount as number) ?? 3,
        commentTexts: input.commentTexts as string[],
      }),
  ),

  tool(
    'ig_procesar_notificaciones',
    'Lee y procesa las notificaciones de Instagram: responde comentarios, gestiona follows, da likes a comentarios relevantes.',
    {
      type: 'object',
      properties: {
        respondToComments: { type: 'boolean', description: 'true para responder comentarios en los propios posts' },
        respondToDMs: { type: 'boolean', description: 'true para revisar y responder DMs urgentes' },
        followBackRelevant: { type: 'boolean', description: 'true para seguir de vuelta a followers relevantes' },
        maxActions: { type: 'number', description: 'Límite total de acciones a realizar (default: 20)' },
      },
    },
    async (input, brand) =>
      procesarNotificaciones(brand, {
        respondToComments: input.respondToComments as boolean | undefined,
        respondToDMs: input.respondToDMs as boolean | undefined,
        followBackRelevant: input.followBackRelevant as boolean | undefined,
        maxActions: input.maxActions as number | undefined,
      }),
  ),

  tool(
    'ig_leer_insights',
    'Lee las métricas de Instagram Insights: alcance, impresiones, engagement, nuevos seguidores, mejores posts.',
    {
      type: 'object',
      properties: {
        periodo: str('Período de análisis: 7_dias | 30_dias | 90_dias (default: 7_dias)'),
      },
    },
    async (input, brand) => leerInsights(brand, (input.periodo as '7_dias' | '30_dias' | '90_dias') ?? '7_dias'),
  ),

  tool(
    'ig_moderar_comentarios',
    'Modera los comentarios de un post específico: elimina spam/toxicidad, da like a comentarios relevantes.',
    {
      type: 'object',
      properties: {
        postUrl: str('URL del post a moderar'),
        criteriosModeración: str('Criterios específicos: qué borrar, qué aprobar, qué responder'),
      },
      required: ['postUrl', 'criteriosModeración'],
    },
    async (input, brand) =>
      moderarComentariosDePost(brand, input.postUrl as string, input.criteriosModeración as string),
  ),

  tool(
    'ig_interactuar_tendencia',
    'Interactúa con posts de un hashtag trending: da likes y/o comentarios para capitalizar el alcance de la tendencia.',
    {
      type: 'object',
      properties: {
        hashtag: str('Hashtag trending a explotar (sin #)'),
        cantidadInteracciones: { type: 'number', description: 'Número total de interacciones (máx 15)' },
        tipoInteraccion: str('Tipo: like | comentar | ambos (default: ambos)'),
      },
      required: ['hashtag'],
    },
    async (input, brand) =>
      interactuarConTendencia(
        brand,
        input.hashtag as string,
        (input.cantidadInteracciones as number) ?? 10,
        (input.tipoInteraccion as 'like' | 'comentar' | 'ambos') ?? 'ambos',
      ),
  ),

  tool(
    'ig_crear_highlight',
    'Crea un nuevo Highlight en el perfil de Instagram con historias del archivo.',
    {
      type: 'object',
      properties: {
        nombre: str('Nombre del Highlight (corto, descriptivo, con emoji si aplica)'),
        storiesAIncluir: str('Descripción de qué historias incluir (tema, fecha aproximada o contenido)'),
      },
      required: ['nombre', 'storiesAIncluir'],
    },
    async (input, brand) => crearHighlight(brand, input.nombre as string, input.storiesAIncluir as string),
  ),

  tool(
    'ig_auditar_perfil',
    'Realiza una auditoría visual completa del propio perfil de Instagram: foto, bio, highlights, grid, métricas. Genera recomendaciones.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, brand) => auditarPerfil(brand),
  ),

  tool(
    'ig_analiticas_post',
    'Ve las estadísticas detalladas de un post específico: alcance, impresiones, likes, comentarios, saves, compartidos, visitas al perfil.',
    {
      type: 'object',
      properties: {
        postUrl: str('URL directa del post del que ver estadísticas'),
      },
      required: ['postUrl'],
    },
    async (input, brand) => verAnaliticasPost(brand, input.postUrl as string),
  ),

  // ── Token Router — Generación de Contenido con Tokens Ilimitados ─────────────

  tool(
    'router_generar_caption',
    'Genera un caption completo de Instagram (con hashtags y CTA) usando el proveedor de IA más eficiente. Gratis cuando es posible.',
    {
      type: 'object',
      properties: {
        contexto: str('Contexto del post: de qué trata, qué se quiere comunicar'),
        tono: str('Tono de la marca: profesional, cercano, humorístico, inspiracional, etc.'),
        formato: str('Formato del post: reel, carrusel, static post, historia'),
        audiencia: str('Audiencia objetivo del post'),
      },
      required: ['contexto'],
    },
    async (input, brand) =>
      generateFullCaption(
        input.contexto as string,
        {
          name: brand.name,
          niche: ((brand as Record<string, unknown>).niche as string) ?? brand.name,
          tone: (input.tono as string) ?? 'auténtico y cercano',
          targetAudience: (input.audiencia as string) ?? brand.audience?.description ?? 'audiencia general',
        },
        { taskType: 'caption', freeOnly: false },
      ),
  ),

  tool(
    'router_generar_variaciones',
    'Genera N variaciones de un copy/caption en paralelo usando proveedores gratuitos. Ideal para A/B testing.',
    {
      type: 'object',
      properties: {
        basePrompt: str('Prompt base que describe qué generar (caption, hook, CTA, etc.)'),
        cantidad: { type: 'number', description: 'Número de variaciones a generar (2-10, default: 5)' },
        tipo: str('Tipo de contenido: caption, hook, cta, bio, respuesta_comentario'),
      },
      required: ['basePrompt'],
    },
    async (input, _brand) =>
      generateVariations(input.basePrompt as string, (input.cantidad as number) ?? 5, {
        taskType: 'creative',
        freeOnly: true,
      }),
  ),

  tool(
    'router_respuesta_rapida',
    'Genera una respuesta auténtica y personalizada para un comentario o DM usando IA gratuita (Groq/Ollama).',
    {
      type: 'object',
      properties: {
        mensaje: str('Mensaje o comentario a responder'),
        contexto: str('Contexto: "comentario en post de [tema]" o "DM consultando por [tema]"'),
        tono: str('Tono de respuesta: cercano, profesional, humorístico, empático'),
      },
      required: ['mensaje', 'contexto'],
    },
    async (input, brand) =>
      generateReply(
        input.mensaje as string,
        input.contexto as string,
        { name: brand.name, tone: (input.tono as string) ?? 'cercano y auténtico' },
        { freeOnly: true },
      ),
  ),

  tool(
    'router_analizar_texto_largo',
    'Procesa y analiza textos muy largos dividiéndolos en chunks. Ideal para analizar comentarios masivos, transcripciones, o reportes extensos.',
    {
      type: 'object',
      properties: {
        texto: str('Texto largo a procesar (puede ser de cualquier longitud)'),
        instruccion: str('Qué hacer con el texto: analizar sentimiento, resumir, extraer insights, etc.'),
      },
      required: ['texto', 'instruccion'],
    },
    async (input, _brand) =>
      processLongText(input.texto as string, input.instruccion as string, { taskType: 'analysis', freeOnly: true }),
  ),

  tool(
    'router_bulk_captions',
    'Genera múltiples captions en paralelo usando proveedores gratuitos. Ideal para producción masiva de contenido.',
    {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: { type: 'string' },
          description: 'Array de prompts, uno por caption a generar',
        },
        tipo: str('Tipo de contenido: caption, hashtags, hook, respuesta'),
      },
      required: ['prompts'],
    },
    async (input, _brand) =>
      routerAskBulk(input.prompts as string[], { taskType: (input.tipo as never) ?? 'caption', freeOnly: true }),
  ),

  // ── Workflows Profesionales ───────────────────────────────────────────────────

  tool(
    'ejecutar_workflow',
    'Ejecuta un workflow profesional predefinido de Instagram. Lista los workflows disponibles con listar_workflows.',
    {
      type: 'object',
      properties: {
        workflowId: str(
          'ID del workflow a ejecutar (ej: ig-growth-weekly, ig-daily-production, ig-community-management, etc.)',
        ),
        contextoAdicional: str('Contexto o parámetros adicionales para personalizar la ejecución del workflow'),
      },
      required: ['workflowId'],
    },
    async (input, brand) => {
      const workflowMap: Record<string, typeof WORKFLOW_CRECIMIENTO_SEMANAL> = {
        'ig-growth-weekly': WORKFLOW_CRECIMIENTO_SEMANAL,
        'ig-daily-production': WORKFLOW_PRODUCCION_DIARIA,
        'ig-community-management': WORKFLOW_GESTION_COMUNIDAD,
        'ig-competitor-analysis': WORKFLOW_ANALISIS_COMPETENCIA,
        'ig-crisis-response': WORKFLOW_RESPUESTA_CRISIS,
        'ig-campaign-launch': WORKFLOW_LANZAMIENTO_CAMPAÑA,
        'ig-monthly-audit': WORKFLOW_AUDITORIA_MENSUAL,
        'ig-account-onboarding': WORKFLOW_ONBOARDING_CUENTA,
      };
      const workflow = workflowMap[input.workflowId as string];
      if (!workflow) {
        return {
          error: `Workflow "${input.workflowId}" no encontrado. Usá listar_workflows para ver los disponibles.`,
        };
      }
      const { runPlaybook } = await import('./orchestrator.js');
      return runPlaybook(brand, workflow);
    },
  ),

  tool(
    'listar_workflows',
    'Lista todos los workflows profesionales de Instagram disponibles con su descripción y cantidad de tareas.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, _brand) => ({
      workflows: listWorkflows(),
      total: listWorkflows().length,
      uso: 'Usá ejecutar_workflow con el id del workflow para ejecutarlo, o construir_workflow_dinamico para crear uno personalizado.',
    }),
  ),

  tool(
    'construir_workflow_dinamico',
    'Construye un workflow de agentes personalizado para un objetivo específico usando IA. Úsalo cuando ningún workflow predefinido encaje.',
    {
      type: 'object',
      properties: {
        objetivo: str('Descripción detallada del objetivo a lograr en Instagram'),
      },
      required: ['objetivo'],
    },
    async (input, brand) => {
      const workflow = await buildDynamicWorkflow(input.objetivo as string, brand);
      return {
        workflow,
        message: `Workflow "${workflow.name}" creado con ${workflow.tasks.length} tareas. Usá ejecutar_workflow con id "${workflow.id}" para ejecutarlo, o ejecutá el playbook directamente con talia_ejecutar_playbook.`,
      };
    },
  ),

  tool(
    'workflow_por_intencion',
    'Encuentra el workflow más relevante para una intención expresada en lenguaje natural.',
    {
      type: 'object',
      properties: {
        intencion: str(
          'Descripción en lenguaje natural de lo que querés lograr (ej: "crecer followers", "gestionar comunidad", "análisis de competencia")',
        ),
      },
      required: ['intencion'],
    },
    async (input, _brand) => {
      const workflow = getWorkflowByIntent(input.intencion as string);
      if (!workflow) {
        return {
          found: false,
          message:
            'No se encontró un workflow predefinido para esa intención. Usá construir_workflow_dinamico para crear uno personalizado.',
          disponibles: listWorkflows(),
        };
      }
      return {
        found: true,
        workflow: {
          id: workflow.id,
          name: workflow.name,
          description: workflow.description,
          tasks: workflow.tasks.length,
        },
        message: `Workflow encontrado: "${workflow.name}". Ejecutalo con ejecutar_workflow (id: ${workflow.id}).`,
      };
    },
  ),

  // ── Conocimiento Experto de Instagram ────────────────────────────────────────

  tool(
    'ig_expert_context',
    'Obtiene el contexto experto de Instagram adaptado a la marca: algoritmo, estrategia, benchmarks y tácticas específicas para el niche.',
    {
      type: 'object',
      properties: {
        objetivo: str(
          'Objetivo específico para el que necesitás contexto experto (ej: "crecer followers", "mejorar engagement", "planificar contenido")',
        ),
      },
      required: ['objetivo'],
    },
    async (input, brand) => ({
      expertContext: buildInstagramExpertContext(brand, input.objetivo as string),
      algorithmSignals: ALGORITHM_SIGNALS,
      analyticsTargets: ANALYTICS_BENCHMARKS,
      communityProtocols: COMMUNITY_MANAGEMENT,
    }),
  ),

  tool(
    'ig_growth_playbooks',
    'Lista y describe todos los playbooks de crecimiento orgánico disponibles con sus pasos exactos.',
    {
      type: 'object',
      properties: {
        nombre: str('Nombre del playbook específico a obtener (opcional — si no se especifica, devuelve todos)'),
      },
    },
    async (input, _brand) => {
      if (input.nombre) {
        const pb = GROWTH_PLAYBOOKS.find((p) => p.name.toLowerCase().includes((input.nombre as string).toLowerCase()));
        return pb ?? { error: 'Playbook no encontrado', disponibles: GROWTH_PLAYBOOKS.map((p) => p.name) };
      }
      return { playbooks: GROWTH_PLAYBOOKS, total: GROWTH_PLAYBOOKS.length };
    },
  ),

  tool(
    'ig_crisis_protocol',
    'Obtiene el protocolo completo de gestión de crisis de Instagram: triggers, acciones inmediatas, plan de respuesta.',
    {
      type: 'object',
      properties: {},
    },
    async (_input, _brand) => CRISIS_PLAYBOOK,
  ),

  tool(
    'ig_content_formats',
    'Especificaciones técnicas y mejores prácticas para cada formato de contenido de Instagram: Reel, Carrusel, Post, Story.',
    {
      type: 'object',
      properties: {
        formato: str('Formato específico: reel | carousel | staticPost | story (opcional — si no, devuelve todos)'),
      },
    },
    async (input, _brand) => {
      if (input.formato) {
        const f = CONTENT_FORMATS[input.formato as keyof typeof CONTENT_FORMATS];
        return f ?? { error: 'Formato no encontrado', disponibles: Object.keys(CONTENT_FORMATS) };
      }
      return CONTENT_FORMATS;
    },
  ),

  // ── Performance DB ──────────────────────────────────────────────────────────

  tool(
    'performance_record_post',
    'Registra las métricas reales de un post publicado en la base de datos local para aprendizaje continuo.',
    {
      type: 'object',
      properties: {
        id: str('ID único del post'),
        publishedAt: str('Fecha de publicación ISO'),
        format: str('Formato: reel | carrusel | post-imagen | historia | reel-faceless | live'),
        caption: str('Caption completo del post'),
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Lista de hashtags sin #' },
        hookText: str('Primera línea del caption'),
        topics: { type: 'array', items: { type: 'string' }, description: 'Temas del post' },
        contentScore: { type: 'number', description: 'Score predicho antes de publicar (0-100)' },
        metrics: {
          type: 'object',
          description: 'Métricas reales del post',
          properties: {
            likes: { type: 'number' },
            comments: { type: 'number' },
            shares: { type: 'number' },
            saves: { type: 'number' },
            reach: { type: 'number' },
            impressions: { type: 'number' },
            profileVisits: { type: 'number' },
            websiteClicks: { type: 'number' },
            watchTimePercent: { type: 'number' },
            replays: { type: 'number' },
            engagementRate: { type: 'number' },
          },
          required: [
            'likes',
            'comments',
            'shares',
            'saves',
            'reach',
            'impressions',
            'profileVisits',
            'websiteClicks',
            'watchTimePercent',
            'replays',
            'engagementRate',
          ],
        },
      },
      required: ['id', 'publishedAt', 'format', 'caption', 'hashtags', 'hookText', 'topics', 'contentScore', 'metrics'],
    },
    async (input, _brand) => {
      const record = recordPost(input as Parameters<typeof recordPost>[0]);
      return { ok: true, actualScore: record.actualScore, isTopPerformer: record.isTopPerformer };
    },
  ),

  tool(
    'performance_top_posts',
    'Devuelve los posts con mejor performance histórico para identificar patrones ganadores.',
    {
      type: 'object',
      properties: {
        format: str('Filtrar por formato específico (opcional)'),
        limit: { type: 'number', description: 'Cantidad de posts a retornar (default 10)' },
      },
    },
    async (input, _brand) =>
      getTopPerformers(
        input.format as 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'reel-faceless' | 'live' | undefined,
        Number(input.limit ?? 10),
      ),
  ),

  tool(
    'performance_patterns',
    'Extrae patrones de éxito del historial: temas ganadores, mejores hooks, formatos top, hashtags de mayor alcance.',
    { type: 'object', properties: {} },
    async (_input, _brand) => {
      const patterns = extractPatterns();
      const summary = getAccountSummary();
      return { patterns, summary };
    },
  ),

  tool(
    'performance_benchmarks',
    'Retorna los benchmarks actuales de la cuenta por formato (engagement rate promedio, alcance promedio).',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({
      benchmarks: getBenchmarks(),
      summary: getAccountSummary(),
    }),
  ),

  tool(
    'performance_recent',
    'Lista los posts recientes con sus métricas para análisis de tendencia.',
    {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Últimos N días (default 30)' },
        format: str('Filtrar por formato (opcional)'),
      },
    },
    async (input, _brand) =>
      getRecentPosts(Number(input.days ?? 30), input.format as Parameters<typeof getRecentPosts>[1]),
  ),

  // ── Content Scorer ──────────────────────────────────────────────────────────

  tool(
    'content_score',
    'Evalúa la calidad de un caption ANTES de publicarlo (0-100). Analiza hook, CTA, legibilidad, hashtags y originalidad. Score < 65 = revisar.',
    {
      type: 'object',
      properties: {
        caption: str('Caption completo a evaluar'),
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Lista de hashtags' },
        format: str('Formato del post: reel | carrusel | post-imagen | historia'),
        hasCTA: { type: 'boolean', description: '¿El caption tiene CTA explícito?' },
        topic: str('Tema principal del contenido'),
        hasVisualBrief: { type: 'boolean', description: '¿Tiene brief visual?' },
      },
      required: ['caption', 'hashtags', 'format', 'hasCTA', 'topic'],
    },
    async (input, _brand) =>
      scoreContent({
        caption: String(input.caption),
        hashtags: input.hashtags as string[],
        format: input.format as Parameters<typeof scoreContent>[0]['format'],
        hasCTA: Boolean(input.hasCTA),
        topic: String(input.topic),
        hasVisualBrief: Boolean(input.hasVisualBrief ?? false),
      }),
  ),

  tool(
    'content_score_and_improve',
    'Evalúa y mejora automáticamente un caption hasta alcanzar score ≥ 65. Máximo 2 iteraciones de mejora.',
    {
      type: 'object',
      properties: {
        caption: str('Caption a evaluar y mejorar'),
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags' },
        format: str('Formato del post'),
        topic: str('Tema del contenido'),
        hasCTA: { type: 'boolean', description: '¿Tiene CTA?' },
      },
      required: ['caption', 'hashtags', 'format', 'topic'],
    },
    async (input, _brand) => {
      const result = await scoreAndImprove({
        caption: String(input.caption),
        hashtags: input.hashtags as string[],
        format: input.format as Parameters<typeof scoreContent>[0]['format'],
        hasCTA: Boolean(input.hasCTA ?? true),
        topic: String(input.topic),
        hasVisualBrief: false,
      });
      return {
        finalCaption: result.finalContent.caption,
        finalScore: result.finalScore.overall,
        approved: result.finalScore.approved,
        feedback: result.finalScore.feedback,
        prediction: result.finalScore.prediction,
        iterationsUsed: result.iterations,
      };
    },
  ),

  // ── Audience Timing ─────────────────────────────────────────────────────────

  tool(
    'timing_best_time',
    'Determina el mejor momento para publicar basado en el historial de engagement de la cuenta.',
    {
      type: 'object',
      properties: {
        format: str('Formato del contenido para ajustar la recomendación (opcional)'),
      },
    },
    async (input, _brand) => getBestPostingTime(input.format as Parameters<typeof getBestPostingTime>[0]),
  ),

  tool(
    'timing_advice',
    'Genera recomendaciones específicas de timing con análisis de los datos históricos de la cuenta.',
    {
      type: 'object',
      properties: {
        format: str('Formato del contenido (opcional)'),
      },
    },
    async (input, _brand) => ({
      advice: await getTimingAdvice(input.format as Parameters<typeof getTimingAdvice>[0]),
    }),
  ),

  tool(
    'timing_should_post_now',
    '¿Es buen momento para publicar ahora mismo? Devuelve recomendación con score y razón.',
    {
      type: 'object',
      properties: {
        format: str('Formato del contenido (opcional)'),
      },
    },
    async (input, _brand) => shouldPostNow(input.format as Parameters<typeof shouldPostNow>[0]),
  ),

  tool(
    'timing_rebuild_model',
    'Reconstruye el modelo de timing analizando todo el historial de posts. Ejecutar semanalmente.',
    { type: 'object', properties: {} },
    async (_input, _brand) => {
      rebuildTimingModel();
      return { ok: true, message: 'Modelo de timing reconstruido desde historial de posts' };
    },
  ),

  // ── Event Reactor ───────────────────────────────────────────────────────────

  tool(
    'events_enqueue',
    'Agrega un evento de Instagram a la cola de procesamiento (comentario, DM, mención, viral, etc.).',
    {
      type: 'object',
      properties: {
        id: str('ID único del evento'),
        type: str(
          'Tipo: new_comment | new_dm | new_follower | mention | post_going_viral | negative_comment | lead_detected',
        ),
        timestamp: str('ISO timestamp del evento'),
        data: { type: 'object', description: 'Datos del evento (text, username, postId, etc.)' },
      },
      required: ['id', 'type', 'timestamp', 'data'],
    },
    async (input, _brand) => {
      enqueueEvent({
        id: String(input.id),
        type: input.type as Parameters<typeof enqueueEvent>[0]['type'],
        timestamp: String(input.timestamp),
        data: input.data as Record<string, unknown>,
      });
      return { ok: true, queueStatus: getQueueStatus() };
    },
  ),

  tool(
    'events_process_queue',
    'Procesa la cola de eventos pendientes y genera respuestas automáticas inteligentes.',
    {
      type: 'object',
      properties: {
        maxBatch: { type: 'number', description: 'Máximo de eventos a procesar (default 15)' },
      },
    },
    async (input, _brand) => processQueue(Number(input.maxBatch ?? 15)),
  ),

  tool(
    'events_status',
    'Estado actual de la cola de eventos: pendientes, críticos, respuestas generadas.',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({
      status: getQueueStatus(),
      criticalPending: getPendingCritical(),
    }),
  ),

  tool(
    'events_configure',
    'Configura el comportamiento del reactor: auto-respuestas, keywords de leads, horarios de silencio.',
    {
      type: 'object',
      properties: {
        autoRespondComments: { type: 'boolean', description: 'Responder comentarios automáticamente' },
        autoRespondDMs: { type: 'boolean', description: 'Responder DMs automáticamente' },
        alertOnViral: { type: 'boolean', description: 'Alertar cuando un post viraliza' },
        negativeKeywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Palabras que detectan comentarios negativos',
        },
        leadKeywords: {
          type: 'array',
          items: { type: 'string' },
          description: 'Palabras que detectan intención de compra',
        },
        quietHoursStart: { type: 'number', description: 'Hora de inicio del silencio (0-23)' },
        quietHoursEnd: { type: 'number', description: 'Hora de fin del silencio (0-23)' },
      },
    },
    async (input, _brand) => {
      configureReactor(input as Parameters<typeof configureReactor>[0]);
      return { ok: true, newStatus: getQueueStatus() };
    },
  ),

  // ── Content Pipeline ────────────────────────────────────────────────────────

  tool(
    'pipeline_produce_content',
    'Pipeline completo: idea → brief → contenido → score → mejora → timing. Genera contenido listo para publicar.',
    {
      type: 'object',
      properties: {
        idea: str('La idea, tema o ángulo a desarrollar'),
        format: str('Formato deseado (opcional — si no se especifica, el pipeline elige el mejor)'),
        targetAudience: str('Audiencia objetivo específica (opcional — override del brand)'),
        objective: str('Objetivo: awareness | engagement | leads | ventas | autoridad'),
        tone: str('Tono override (opcional)'),
        urgency: str('Urgencia de publicación: now | next-slot | this-week'),
        skipScoring: { type: 'boolean', description: 'Saltear evaluación de calidad (no recomendado)' },
      },
      required: ['idea'],
    },
    async (input, _brand) =>
      runContentPipeline({
        idea: String(input.idea),
        format: input.format as Parameters<typeof runContentPipeline>[0]['format'],
        targetAudience: input.targetAudience as string | undefined,
        objective: input.objective as Parameters<typeof runContentPipeline>[0]['objective'],
        tone: input.tone as string | undefined,
        urgency: (input.urgency as 'now' | 'next-slot' | 'this-week') ?? 'next-slot',
        skipScoring: Boolean(input.skipScoring ?? false),
      }),
  ),

  tool(
    'pipeline_variations',
    'Genera N variaciones de contenido con ángulos distintos para una misma idea. Ideal para A/B testing.',
    {
      type: 'object',
      properties: {
        idea: str('Idea base a desarrollar en variaciones'),
        variations: { type: 'number', description: 'Cantidad de variaciones (default 3)' },
        format: str('Formato deseado (opcional)'),
        urgency: str('Urgencia: now | next-slot | this-week'),
      },
      required: ['idea'],
    },
    async (input, _brand) => {
      const results = await runVariationPipeline(
        {
          idea: String(input.idea),
          format: input.format as Parameters<typeof runContentPipeline>[0]['format'],
          urgency: (input.urgency as 'now' | 'next-slot' | 'this-week') ?? 'next-slot',
        },
        Number(input.variations ?? 3),
      );
      return results.map((r) => ({
        ok: r.ok,
        score: r.scoreResult?.overall,
        approved: r.scoreResult?.approved,
        caption: r.content?.caption,
        scheduledFor: r.scheduledFor,
        briefAngle: r.brief?.angle,
      }));
    },
  ),

  tool(
    'pipeline_plan_week',
    'Genera el plan de contenido completo de la semana: briefs con formatos, ángulos, hooks y CTAs para cada pieza.',
    {
      type: 'object',
      properties: {
        ideas: {
          type: 'array',
          items: { type: 'string' },
          description: 'Lista de ideas o temas para la semana',
        },
      },
      required: ['ideas'],
    },
    async (input, brand) => planWeekContent(input.ideas as string[], brand),
  ),

  // ── Growth Engine ───────────────────────────────────────────────────────────

  tool(
    'growth_set_goal',
    'Setea la meta de crecimiento: seguidores objetivo, engagement rate objetivo y deadline. Define el norte del sistema.',
    {
      type: 'object',
      properties: {
        targetFollowers: { type: 'number', description: 'Cantidad de seguidores objetivo' },
        targetEngagementRate: { type: 'number', description: 'Engagement rate objetivo en % (ej: 5.0)' },
        targetReachPerPost: { type: 'number', description: 'Alcance promedio objetivo por post' },
        deadline: str('Fecha límite ISO (ej: 2026-12-31)'),
        primaryFocus: str('awareness | engagement | leads | ventas | autoridad'),
      },
      required: ['targetFollowers', 'targetEngagementRate', 'targetReachPerPost', 'deadline', 'primaryFocus'],
    },
    async (input, _brand) =>
      setGrowthGoal({
        targetFollowers: Number(input.targetFollowers),
        targetEngagementRate: Number(input.targetEngagementRate),
        targetReachPerPost: Number(input.targetReachPerPost),
        deadline: String(input.deadline),
        primaryFocus: input.primaryFocus as 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad',
      }),
  ),

  tool(
    'growth_clear_goal',
    'Elimina la meta de crecimiento actual.',
    { type: 'object', properties: {} },
    async (_input, _brand) => {
      clearGrowthGoal();
      return { ok: true };
    },
  ),

  tool(
    'growth_record_daily',
    'Registra el snapshot diario de métricas para alimentar las series de tiempo y las predicciones.',
    {
      type: 'object',
      properties: {
        date: str('Fecha YYYY-MM-DD'),
        followers: { type: 'number', description: 'Total de seguidores actuales' },
        reach24h: { type: 'number', description: 'Alcance de las últimas 24h' },
        engagement24h: { type: 'number', description: 'Engagement total de las últimas 24h' },
        postsPublished: { type: 'number', description: 'Posts publicados en el día' },
        storiesPublished: { type: 'number', description: 'Stories publicadas en el día' },
      },
      required: ['date', 'followers', 'reach24h', 'engagement24h', 'postsPublished', 'storiesPublished'],
    },
    async (input, _brand) =>
      recordDailySnapshot({
        date: String(input.date),
        followers: Number(input.followers),
        reach24h: Number(input.reach24h),
        engagement24h: Number(input.engagement24h),
        postsPublished: Number(input.postsPublished),
        storiesPublished: Number(input.storiesPublished),
      }),
  ),

  tool(
    'growth_progress',
    'Devuelve el progreso actual hacia la meta: gap, velocidad, proyección, confianza.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCurrentProgress(),
  ),

  tool(
    'growth_recommend_actions',
    'Recomienda las 5 acciones más impactantes para las próximas 24-48 horas según el estado actual.',
    { type: 'object', properties: {} },
    async (_input, brand) => recommendNextActions(brand),
  ),

  tool(
    'growth_narrative',
    'Resumen ejecutivo de crecimiento para el dueño de la cuenta: motivador, basado en datos, con headline y highlights.',
    { type: 'object', properties: {} },
    async (_input, brand) => getGrowthNarrative(brand),
  ),

  tool(
    'growth_health',
    'Estado de salud del crecimiento (excelente | buena | estancada | crítica) con score 0-100 y señales detalladas.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getGrowthHealth(),
  ),

  tool(
    'growth_milestones_check',
    'Verifica si se alcanzaron nuevos hitos (1k, 5k, 10k seguidores; streaks; engagement rate) y envía notificaciones celebrando los wins.',
    { type: 'object', properties: {} },
    async (_input, brand) => detectAndCelebrateMilestones(brand),
  ),

  tool(
    'growth_dashboard',
    'Dashboard completo de crecimiento: KPIs, charts, milestones próximos, top posts, predicciones, week-over-week.',
    { type: 'object', properties: {} },
    async (_input, brand) => buildDashboard(brand),
  ),

  tool(
    'growth_dashboard_text',
    'Versión textual del dashboard de crecimiento, ideal para enviar como reporte por mensaje o leerlo en voz.',
    { type: 'object', properties: {} },
    async (_input, brand) => ({ text: buildTextSummary(brand) }),
  ),

  tool(
    'growth_quick_insights',
    'Insights rápidos del crecimiento: top insight, warnings, oportunidades. Útil para Talía al iniciar conversación.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getQuickInsights(),
  ),

  tool(
    'growth_recent_metrics',
    'Devuelve los snapshots diarios de los últimos N días para gráficos o análisis.',
    {
      type: 'object',
      properties: { days: { type: 'number', description: 'Cantidad de días (default 30)' } },
    },
    async (input, _brand) => getRecentDailyMetrics(Number(input.days ?? 30)),
  ),

  tool(
    'growth_milestones_list',
    'Lista de hitos ya celebrados, con los más recientes primero.',
    {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Cantidad de hitos (default 10)' } },
    },
    async (input, _brand) => getMilestones(Number(input.limit ?? 10)),
  ),

  // ── Hook Lab ────────────────────────────────────────────────────────────────

  tool(
    'hook_generate',
    'Genera N hooks únicos para un tema y formato, con scoring y categoría detectada para cada uno.',
    {
      type: 'object',
      properties: {
        topic: str('Tema o ángulo del contenido'),
        audience: str('Audiencia destino (opcional — usa brand.audience por default)'),
        format: str('Formato: reel | carrusel | post-imagen | historia | reel-faceless'),
        count: { type: 'number', description: 'Cantidad de hooks a generar (default 8)' },
        preferredCategories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Categorías preferidas (opcional)',
        },
      },
      required: ['topic', 'format'],
    },
    async (input, brand) =>
      hookLabGenerate(brand, {
        topic: String(input.topic),
        audience: (input.audience as string) ?? brand.audience.description,
        format: input.format as Parameters<typeof hookLabGenerate>[1]['format'],
        count: Number(input.count ?? 8),
        preferredCategories: input.preferredCategories as Parameters<typeof hookLabGenerate>[1]['preferredCategories'],
      }),
  ),

  tool(
    'hook_score',
    'Evalúa la calidad de un hook puntual: score 0-100, categoría detectada, razones e improvements concretos.',
    {
      type: 'object',
      properties: { hook: str('Hook a evaluar (texto literal)') },
      required: ['hook'],
    },
    async (input, _brand) => scoreHook(String(input.hook)),
  ),

  tool(
    'hook_best_for_topic',
    'Genera 8 hooks para un tema y devuelve el de mayor score (listo para usar).',
    {
      type: 'object',
      properties: {
        topic: str('Tema del contenido'),
        format: str('Formato del contenido'),
      },
      required: ['topic', 'format'],
    },
    async (input, brand) => getBestHook(brand, String(input.topic), input.format as Parameters<typeof getBestHook>[2]),
  ),

  tool(
    'hook_pick_for_ab',
    'Genera 6 hooks y devuelve 1 ganador + 3 runner-ups, ponderando por las categorías que históricamente funcionan en la cuenta.',
    {
      type: 'object',
      properties: {
        topic: str('Tema'),
        format: str('Formato'),
      },
      required: ['topic', 'format'],
    },
    async (input, brand) =>
      pickHookForAB(brand, String(input.topic), input.format as Parameters<typeof pickHookForAB>[2]),
  ),

  tool(
    'hook_improve',
    'Toma un hook débil y lo reescribe aplicando las correcciones necesarias.',
    {
      type: 'object',
      properties: {
        hook: str('Hook original'),
        format: str('Formato'),
      },
      required: ['hook', 'format'],
    },
    async (input, brand) => improveHook(String(input.hook), brand, input.format as Parameters<typeof improveHook>[2]),
  ),

  tool(
    'hook_performance_analysis',
    'Analiza qué categorías de hooks funcionan mejor en la cuenta según el historial real de performance.',
    { type: 'object', properties: {} },
    async (_input, _brand) => analyzeHookPerformance(),
  ),

  tool(
    'hook_templates_list',
    'Lista todos los templates de hooks del Hook Lab con sus categorías, drivers emocionales y ejemplos.',
    {
      type: 'object',
      properties: {
        category: str('Filtrar por categoría específica (opcional)'),
      },
    },
    async (input, _brand) => {
      if (input.category) {
        return HOOK_TEMPLATES.filter((t) => t.category === input.category);
      }
      return HOOK_TEMPLATES;
    },
  ),

  // ── Post Boost ──────────────────────────────────────────────────────────────

  tool(
    'boost_schedule',
    'Programa el boost post-publicación: comentario anchor, community prime, beacon engagement, reply-thread y check-metrics en las próximas 2 horas. Llamar INMEDIATAMENTE después de publicar.',
    {
      type: 'object',
      properties: {
        postId: str('ID del post'),
        postUrl: str('URL del post en Instagram (opcional pero recomendada)'),
        postFormat: str('Formato del post'),
        publishedAt: str('Timestamp ISO de la publicación'),
      },
      required: ['postId', 'postFormat', 'publishedAt'],
    },
    async (input, _brand) =>
      schedulePostBoost({
        postId: String(input.postId),
        postUrl: input.postUrl as string | undefined,
        postFormat: String(input.postFormat),
        publishedAt: String(input.publishedAt),
      }),
  ),

  tool(
    'boost_tick',
    'Ejecuta las acciones de boost que están listas para correr según el calendario. Llamar cada 5-10 minutos.',
    { type: 'object', properties: {} },
    async (_input, _brand) => runBoostTick(),
  ),

  tool(
    'boost_status',
    'Devuelve el estado del boost de un post específico (qué acciones se ejecutaron, lift medido).',
    {
      type: 'object',
      properties: { postId: str('ID del post') },
      required: ['postId'],
    },
    async (input, _brand) => getBoostStatus(String(input.postId)),
  ),

  tool(
    'boost_cancel',
    'Cancela el boost en curso de un post específico.',
    {
      type: 'object',
      properties: { postId: str('ID del post') },
      required: ['postId'],
    },
    async (input, _brand) => ({ cancelled: cancelBoost(String(input.postId)) }),
  ),

  tool(
    'boost_stats',
    'Estadísticas agregadas de todos los boosts ejecutados: lift promedio, % exitosos, mejor lift.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getBoostStats(),
  ),

  tool(
    'boost_history',
    'Historial de boosts ejecutados (más recientes primero).',
    {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Cantidad (default 25)' } },
    },
    async (input, _brand) => getBoostHistory(Number(input.limit ?? 25)),
  ),

  tool(
    'boost_active',
    'Lista los boosts activos (programados o en curso).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getActiveBoosts(),
  ),

  // ── Viral Tracker ───────────────────────────────────────────────────────────

  tool(
    'viral_scan',
    'Escanea el nicho para detectar posts con señales virales (alcance >3x, audio trending, hashtag spike).',
    {
      type: 'object',
      properties: {
        maxAccounts: { type: 'number', description: 'Cuentas referencia a considerar (default 8)' },
      },
    },
    async (input, brand) => scanForViralPosts(brand, Number(input.maxAccounts ?? 8)),
  ),

  tool(
    'viral_decompose',
    'Decompone la estructura de un post viral detectado (hook pattern, driver emocional, payoff). Devuelve patrones replicables sin plagiar.',
    {
      type: 'object',
      properties: {
        postId: str('ID del viral'),
        sourceAccount: str('Cuenta origen (sin @)'),
        format: str('Formato'),
        topic: str('Tema'),
        hookText: str('Hook del post'),
        estimatedReach: { type: 'number', description: 'Alcance estimado' },
        signals: { type: 'array', items: { type: 'string' }, description: 'Señales virales detectadas' },
      },
      required: ['postId', 'sourceAccount', 'format', 'topic', 'hookText'],
    },
    async (input, brand) =>
      decomposeViralPost({
        id: String(input.postId),
        sourceAccount: String(input.sourceAccount),
        format: input.format as Parameters<typeof decomposeViralPost>[0]['format'],
        topic: String(input.topic),
        hookText: String(input.hookText),
        estimatedReach: Number(input.estimatedReach ?? 0),
        signals: (input.signals as Parameters<typeof decomposeViralPost>[0]['signals']) ?? [],
        niche: brand.niche,
        detectedAt: new Date().toISOString(),
      }),
  ),

  tool(
    'viral_ride_wave',
    'Pipeline completo: scan → decompose → adapt. Detecta los virales del nicho, los analiza y propone la mejor adaptación para la marca, lista para producir.',
    { type: 'object', properties: {} },
    async (_input, brand) => rideTheWave(brand),
  ),

  tool(
    'viral_niche_trends',
    'Resumen narrativo de las tendencias del nicho en los últimos N días, con patrones dominantes y movimientos sugeridos.',
    {
      type: 'object',
      properties: { days: { type: 'number', description: 'Ventana en días (default 14)' } },
    },
    async (input, brand) => ({ narrative: await getNicheTrendNarrative(brand, Number(input.days ?? 14)) }),
  ),

  tool(
    'viral_recent',
    'Lista los virales detectados recientemente en el nicho.',
    {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Ventana en días (default 7)' },
        niche: str('Filtrar por nicho (opcional)'),
      },
    },
    async (input, brand) => getRecentViralPosts(Number(input.days ?? 7), (input.niche as string) ?? brand.niche),
  ),

  tool(
    'viral_status',
    'Estado del viral tracker: total trackeado, último scan, recientes.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getTrackerStatus(),
  ),

  tool(
    'viral_adapt',
    'Adapta un viral ya decompuesto a la marca con N variaciones (cada una con hook, ángulo, CTA, brief visual y predicted fit).',
    {
      type: 'object',
      properties: {
        postId: str('ID del viral'),
        sourceAccount: str('Cuenta origen'),
        format: str('Formato'),
        topic: str('Tema'),
        hookText: str('Hook'),
        estimatedReach: { type: 'number', description: 'Alcance estimado' },
        signals: { type: 'array', items: { type: 'string' }, description: 'Señales virales' },
        variations: { type: 'number', description: 'Cantidad de variaciones (default 3)' },
      },
      required: ['postId', 'sourceAccount', 'format', 'topic', 'hookText'],
    },
    async (input, brand) => {
      const post: Parameters<typeof decomposeViralPost>[0] = {
        id: String(input.postId),
        sourceAccount: String(input.sourceAccount),
        format: input.format as Parameters<typeof decomposeViralPost>[0]['format'],
        topic: String(input.topic),
        hookText: String(input.hookText),
        estimatedReach: Number(input.estimatedReach ?? 0),
        signals: (input.signals as Parameters<typeof decomposeViralPost>[0]['signals']) ?? [],
        niche: brand.niche,
        detectedAt: new Date().toISOString(),
      };
      const decomposition = await decomposeViralPost(post);
      return adaptViralToBrand(post, decomposition, brand, Number(input.variations ?? 3));
    },
  ),

  // ── Goals: ciclo de vida de metas por horizonte ─────────────────────────────

  tool(
    'goal_create',
    'Crea una nueva meta con horizonte (weekly/monthly/quarterly/annual), categoría y target numérico.',
    {
      type: 'object',
      properties: {
        horizon: str('weekly | monthly | quarterly | annual'),
        category: str('growth | engagement | content | sales | authority | community | custom'),
        title: str('Título corto de la meta'),
        description: str('Descripción 1-2 líneas (opcional)'),
        metric: str('Métrica: followers | engagement_rate | reach_per_post | sales_count | posts_count | custom'),
        value: { type: 'number', description: 'Valor objetivo' },
        unit: str('Unidad ej: seguidores, %, ventas'),
        startsAt: str('ISO opcional'),
        endsAt: str('ISO opcional'),
        source: str('voice | canvas | calendar | chat | system'),
      },
      required: ['horizon', 'category', 'title', 'metric', 'value', 'unit'],
    },
    async (input, _brand) =>
      createGoal({
        horizon: input.horizon as Parameters<typeof createGoal>[0]['horizon'],
        category: input.category as Parameters<typeof createGoal>[0]['category'],
        title: String(input.title),
        description: input.description as string | undefined,
        target: { metric: String(input.metric), value: Number(input.value), unit: String(input.unit) },
        startsAt: input.startsAt as string | undefined,
        endsAt: input.endsAt as string | undefined,
        source: input.source as Parameters<typeof createGoal>[0]['source'],
      }),
  ),

  tool(
    'goal_list',
    'Lista metas con filtros opcionales por horizonte, categoría o status.',
    {
      type: 'object',
      properties: {
        horizon: str('weekly | monthly | quarterly | annual (opcional)'),
        category: str('growth | engagement | content | sales | authority | community | custom (opcional)'),
        status: str('active | completed | failed | cancelled | paused (opcional)'),
      },
    },
    async (input, _brand) =>
      listGoals({
        horizon: input.horizon as NonNullable<Parameters<typeof listGoals>[0]>['horizon'],
        category: input.category as NonNullable<Parameters<typeof listGoals>[0]>['category'],
        status: input.status as NonNullable<Parameters<typeof listGoals>[0]>['status'],
      }),
  ),

  tool(
    'goal_snapshot',
    'Snapshot global de metas: activas, completadas, fallidas, health, próximas a vencer.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getGoalsSnapshot(),
  ),

  tool(
    'goal_health',
    'Health check de cada meta activa: expectedProgress vs actual, status (adelantado / on-track / atrasado / crítico).',
    { type: 'object', properties: {} },
    async (_input, _brand) => checkGoalsHealth(),
  ),

  tool(
    'goal_progress_followers',
    'Devuelve el progreso de seguidores hacia la meta actual del growthEngine.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCurrentProgress(),
  ),

  tool(
    'goal_cascade_annual',
    'Descompone una meta anual en 4 metas trimestrales automáticamente.',
    {
      type: 'object',
      properties: { goalId: str('ID de la meta anual') },
      required: ['goalId'],
    },
    async (input, brand) => cascadeAnnualGoal(String(input.goalId), brand),
  ),

  tool(
    'goal_cascade_quarterly',
    'Descompone una meta trimestral en 3 metas mensuales.',
    {
      type: 'object',
      properties: { goalId: str('ID de la meta trimestral') },
      required: ['goalId'],
    },
    async (input, brand) => cascadeQuarterlyGoal(String(input.goalId), brand),
  ),

  tool(
    'goal_decompose_to_tasks',
    'Descompone una meta en 5-12 tareas accionables asignadas automáticamente al equipo.',
    {
      type: 'object',
      properties: { goalId: str('ID de la meta') },
      required: ['goalId'],
    },
    async (input, brand) => decomposeGoalIntoTasks(String(input.goalId), brand),
  ),

  tool(
    'goal_auto_update_progress',
    'Lee métricas reales del sistema y actualiza el progress de cada meta activa.',
    { type: 'object', properties: {} },
    async (_input, _brand) => autoUpdateGoalProgress(),
  ),

  // ── Intent Parser y Kickoff ─────────────────────────────────────────────────

  tool(
    'intent_parse',
    'Parsea el input del usuario (voz/texto/canvas/calendario) y devuelve metas, eventos, tareas y restricciones estructuradas.',
    {
      type: 'object',
      properties: {
        source: str('voice | chat | canvas | calendar'),
        text: str('Texto del usuario (si source=voice o chat)'),
        canvas: { type: 'object', description: 'Objeto canvas con nodes y connections (si source=canvas)' },
        calendar: { type: 'array', description: 'Lista de CalendarEntry (si source=calendar)' },
        referenceDate: str('ISO opcional para interpretar fechas relativas'),
      },
      required: ['source'],
    },
    async (input, brand) => {
      const parsed = await parseUserIntent({
        source: input.source as Parameters<typeof parseUserIntent>[0]['source'],
        text: input.text as string | undefined,
        canvas: input.canvas as Parameters<typeof parseUserIntent>[0]['canvas'],
        calendar: input.calendar as Parameters<typeof parseUserIntent>[0]['calendar'],
        brand,
        referenceDate: input.referenceDate as string | undefined,
      });
      const issues = validateParseResult(parsed);
      return { parsed, issues };
    },
  ),

  tool(
    'kickoff_run_from_text',
    'Ejecuta el kickoff completo desde texto: parsea, valida, crea metas + tareas + eventos, y devuelve plan.',
    {
      type: 'object',
      properties: {
        text: str('Texto/transcripción de voz del usuario'),
        source: str('voice | chat (default chat)'),
        referenceDate: str('ISO opcional'),
      },
      required: ['text'],
    },
    async (input, brand) =>
      runKickoffFromText(
        String(input.text),
        brand,
        (input.source as 'voice' | 'chat') ?? 'chat',
        input.referenceDate as string | undefined,
      ),
  ),

  tool(
    'kickoff_preview',
    'Pre-vista del kickoff sin ejecutarlo: muestra qué metas/tareas/eventos crearía y posibles issues.',
    {
      type: 'object',
      properties: {
        source: str('voice | chat | canvas | calendar'),
        text: str('Si source=voice/chat'),
        canvas: { type: 'object' },
        calendar: { type: 'array' },
      },
      required: ['source'],
    },
    async (input, brand) =>
      previewKickoff({
        source: input.source as Parameters<typeof previewKickoff>[0]['source'],
        text: input.text as string | undefined,
        canvas: input.canvas as Parameters<typeof previewKickoff>[0]['canvas'],
        calendar: input.calendar as Parameters<typeof previewKickoff>[0]['calendar'],
        brand,
      }),
  ),

  tool(
    'kickoff_run_full',
    'Ejecuta kickoff completo con todas las opciones (texto, canvas, calendario, cascade, decompose).',
    {
      type: 'object',
      properties: {
        source: str('voice | chat | canvas | calendar'),
        text: str('(opcional)'),
        canvas: { type: 'object', description: '(opcional)' },
        calendar: { type: 'array', description: '(opcional)' },
        autoCascade: { type: 'boolean', description: 'default true' },
        autoDecompose: { type: 'boolean', description: 'default true' },
      },
      required: ['source'],
    },
    async (input, brand) =>
      runKickoff({
        source: input.source as Parameters<typeof runKickoff>[0]['source'],
        text: input.text as string | undefined,
        canvas: input.canvas as Parameters<typeof runKickoff>[0]['canvas'],
        calendar: input.calendar as Parameters<typeof runKickoff>[0]['calendar'],
        brand,
        autoCascade: (input.autoCascade as boolean) ?? true,
        autoDecompose: (input.autoDecompose as boolean) ?? true,
      }),
  ),

  // ── Task Board ──────────────────────────────────────────────────────────────

  tool(
    'task_create',
    'Crea una tarea suelta y la asigna automáticamente al agente correcto según su especialidad.',
    {
      type: 'object',
      properties: {
        title: str('Título'),
        description: str('Descripción'),
        assignedTo: str('Agente: talia|nova|scout|lia|luca|pixel|analytics|gard|max|vero (opcional)'),
        priority: str('critical|high|normal|low'),
        dueDate: str('YYYY-MM-DD opcional'),
        estimatedHours: { type: 'number' },
        goalId: str('ID de meta relacionada (opcional)'),
      },
      required: ['title'],
    },
    async (input, _brand) =>
      createTask({
        title: String(input.title),
        description: input.description as string | undefined,
        assignedTo: input.assignedTo as Parameters<typeof createTask>[0]['assignedTo'],
        priority: input.priority as Parameters<typeof createTask>[0]['priority'],
        dueDate: input.dueDate as string | undefined,
        estimatedHours: input.estimatedHours as number | undefined,
        goalId: input.goalId as string | undefined,
      }),
  ),

  tool(
    'task_list',
    'Lista tareas con filtros opcionales.',
    {
      type: 'object',
      properties: {
        status: str('todo|doing|done|blocked|cancelled (opcional)'),
        agent: str('Agente (opcional)'),
        priority: str('critical|high|normal|low (opcional)'),
        goalId: str('Filtrar por meta'),
        dueBefore: str('YYYY-MM-DD opcional'),
      },
    },
    async (input, _brand) =>
      listTasks({
        status: input.status as NonNullable<Parameters<typeof listTasks>[0]>['status'],
        agent: input.agent as NonNullable<Parameters<typeof listTasks>[0]>['agent'],
        priority: input.priority as NonNullable<Parameters<typeof listTasks>[0]>['priority'],
        goalId: input.goalId as string | undefined,
        dueBefore: input.dueBefore as string | undefined,
      }),
  ),

  tool(
    'task_update_status',
    'Actualiza el status de una tarea (todo/doing/done/blocked/cancelled).',
    {
      type: 'object',
      properties: {
        taskId: str('ID de la tarea'),
        status: str('todo|doing|done|blocked|cancelled'),
        note: str('Nota opcional'),
      },
      required: ['taskId', 'status'],
    },
    async (input, _brand) =>
      updateTaskStatus(
        String(input.taskId),
        input.status as Parameters<typeof updateTaskStatus>[1],
        input.note as string | undefined,
      ),
  ),

  tool(
    'task_kanban',
    'Vista Kanban: tareas agrupadas por status (todo / doing / done / blocked).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getKanbanView(),
  ),

  tool(
    'task_team_workload',
    'Carga de trabajo por agente del equipo: tareas activas, horas estimadas, bloqueadas.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getTeamWorkload(),
  ),

  tool(
    'task_daily_standup',
    'Daily standup del equipo: qué hace hoy cada agente, qué completó ayer, qué tiene bloqueado.',
    { type: 'object', properties: {} },
    async (_input, _brand) => buildDailyStandup(),
  ),

  tool(
    'team_specialties',
    'Lista los agentes del equipo con sus áreas de especialidad y capacidades.',
    { type: 'object', properties: {} },
    async (_input, _brand) => AGENT_SPECIALTIES,
  ),

  // ── Calendar ─────────────────────────────────────────────────────────────────

  tool(
    'calendar_create_event',
    'Registra un evento en el calendario (launch, campaign, milestone, collab, holiday). Genera tareas de preparación automáticamente.',
    {
      type: 'object',
      properties: {
        title: str('Título'),
        type: str('launch | campaign | milestone | collab | holiday | date-anchor | event | task'),
        startsAt: str('ISO'),
        endsAt: str('ISO opcional'),
        description: str('Descripción opcional'),
        goalIds: { type: 'array', items: { type: 'string' }, description: 'IDs de metas relacionadas' },
        prepareDaysAhead: { type: 'number', description: 'Días de anticipación para tareas de preparación' },
      },
      required: ['title', 'type', 'startsAt'],
    },
    async (input, _brand) =>
      createCalendarEvent({
        title: String(input.title),
        type: input.type as Parameters<typeof createCalendarEvent>[0]['type'],
        startsAt: String(input.startsAt),
        endsAt: input.endsAt as string | undefined,
        description: input.description as string | undefined,
        goalIds: input.goalIds as string[] | undefined,
        prepareDaysAhead: input.prepareDaysAhead as number | undefined,
      }),
  ),

  tool(
    'calendar_list_events',
    'Lista eventos del calendario con filtros.',
    {
      type: 'object',
      properties: {
        from: str('YYYY-MM-DD desde'),
        to: str('YYYY-MM-DD hasta'),
        type: str('Tipo de evento'),
        goalId: str('Filtrar por meta'),
      },
    },
    async (input, _brand) =>
      listCalendarEvents({
        from: input.from as string | undefined,
        to: input.to as string | undefined,
        type: input.type as NonNullable<Parameters<typeof listCalendarEvents>[0]>['type'],
        goalId: input.goalId as string | undefined,
      }),
  ),

  tool(
    'calendar_month_view',
    'Vista de mes del calendario: días con eventos y blackouts.',
    {
      type: 'object',
      properties: {
        year: { type: 'number', description: 'Año (default actual)' },
        month: { type: 'number', description: 'Mes 1-12 (default actual)' },
      },
    },
    async (input, _brand) => {
      const now = new Date();
      return getMonthView(Number(input.year ?? now.getFullYear()), Number(input.month ?? now.getMonth() + 1));
    },
  ),

  tool(
    'calendar_week_view',
    'Vista de semana del calendario (lunes a domingo).',
    {
      type: 'object',
      properties: { referenceDate: str('Fecha de referencia ISO opcional') },
    },
    async (input, _brand) => getWeekView(input.referenceDate ? new Date(String(input.referenceDate)) : undefined),
  ),

  tool(
    'calendar_snapshot',
    'Snapshot del calendario: eventos próximos 30 días, prep pendiente, conflictos.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCalendarSnapshot(),
  ),

  tool(
    'calendar_process_upcoming',
    'Procesa eventos próximos y dispara las tareas de preparación que correspondan.',
    {
      type: 'object',
      properties: { lookaheadDays: { type: 'number', description: 'default 30' } },
    },
    async (input, _brand) => processUpcomingEvents(Number(input.lookaheadDays ?? 30)),
  ),

  tool(
    'calendar_add_blackout',
    'Marca una fecha como "no publicar" (blackout).',
    {
      type: 'object',
      properties: { date: str('YYYY-MM-DD') },
      required: ['date'],
    },
    async (input, _brand) => {
      addBlackoutDate(String(input.date));
      return { ok: true };
    },
  ),

  // ── Period Reports ──────────────────────────────────────────────────────────

  tool(
    'period_report_generate',
    'Genera el reporte ejecutivo del período (weekly/monthly/quarterly/annual) con KPIs, charts, achievements y narrativa.',
    {
      type: 'object',
      properties: {
        horizon: str('weekly | monthly | quarterly | annual'),
        reference: str('ISO date de referencia (default ahora)'),
      },
      required: ['horizon'],
    },
    async (input, brand) =>
      generatePeriodReport(
        brand,
        input.horizon as Parameters<typeof generatePeriodReport>[1],
        input.reference ? new Date(String(input.reference)) : new Date(),
      ),
  ),

  tool(
    'period_report_text',
    'Devuelve el reporte como texto formateado (markdown) listo para enviar al usuario.',
    {
      type: 'object',
      properties: { reportId: str('ID del reporte') },
      required: ['reportId'],
    },
    async (input, _brand) => {
      const r = getReport(String(input.reportId));
      return r ? { text: reportToText(r) } : { error: 'Reporte no encontrado' };
    },
  ),

  tool(
    'period_report_list',
    'Lista los reportes generados con filtro opcional por horizonte.',
    {
      type: 'object',
      properties: {
        horizon: str('weekly | monthly | quarterly | annual (opcional)'),
        limit: { type: 'number', description: 'default 20' },
      },
    },
    async (input, _brand) => listReports(input.horizon as Parameters<typeof listReports>[0], Number(input.limit ?? 20)),
  ),

  // ── Upload-Post: publicación cross-platform desde server ───────────────────

  tool(
    'upload_to_social',
    'Publica en N redes a la vez (IG/TikTok/X/LinkedIn/Threads) vía Upload-Post. Funciona desde server, con el dispositivo apagado.',
    {
      type: 'object',
      properties: {
        platforms: {
          type: 'array',
          items: { type: 'string' },
          description: 'instagram|tiktok|x|linkedin|threads|facebook|youtube|pinterest',
        },
        mediaType: str('photo | video | reel | story | carousel'),
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'URLs públicas o data: URIs' },
        caption: str('Caption completo'),
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags sin #' },
        scheduleAt: str('ISO opcional para programar'),
        postId: str('ID interno para correlacionar'),
        goalId: str('Meta relacionada'),
      },
      required: ['platforms', 'mediaType', 'mediaUrls', 'caption'],
    },
    async (input, _brand) =>
      uploadToSocial({
        platforms: input.platforms as Parameters<typeof uploadToSocial>[0]['platforms'],
        mediaType: input.mediaType as Parameters<typeof uploadToSocial>[0]['mediaType'],
        mediaUrls: input.mediaUrls as string[],
        caption: String(input.caption),
        hashtags: input.hashtags as string[] | undefined,
        scheduleAt: input.scheduleAt as string | undefined,
        postId: input.postId as string | undefined,
        goalId: input.goalId as string | undefined,
      }),
  ),

  tool(
    'upload_status',
    'Consulta el estado de un upload programado o en curso.',
    {
      type: 'object',
      properties: { uploadId: str('ID del upload') },
      required: ['uploadId'],
    },
    async (input, _brand) => getUploadStatus(String(input.uploadId)),
  ),

  tool(
    'upload_list_accounts',
    'Lista las cuentas conectadas a Upload-Post (todas las redes).',
    { type: 'object', properties: {} },
    async (_input, _brand) => listUploadAccounts(),
  ),

  tool(
    'upload_usage',
    'Estadísticas de uso de Upload-Post: cuántas publicaciones gastadas este mes vs cuota.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getUploadUsage(),
  ),

  tool(
    'upload_validate_payload',
    'Valida que el caption, hashtags y media cumplan los límites de cada plataforma antes de subir.',
    {
      type: 'object',
      properties: {
        platforms: { type: 'array', items: { type: 'string' } },
        caption: str(''),
        hashtags: { type: 'array', items: { type: 'string' } },
        mediaUrls: { type: 'array', items: { type: 'string' } },
        mediaType: str('photo | video | reel | story | carousel'),
      },
      required: ['platforms', 'caption', 'mediaUrls', 'mediaType'],
    },
    async (input, _brand) =>
      validateUploadPayload({
        platforms: input.platforms as Parameters<typeof validateUploadPayload>[0]['platforms'],
        caption: String(input.caption),
        hashtags: input.hashtags as string[] | undefined,
        mediaUrls: input.mediaUrls as string[],
        mediaType: input.mediaType as Parameters<typeof validateUploadPayload>[0]['mediaType'],
      }),
  ),

  tool(
    'upload_adapt_caption',
    'Adapta un caption al límite de caracteres de una plataforma específica.',
    {
      type: 'object',
      properties: {
        caption: str('Caption original'),
        platform: str('instagram | tiktok | x | linkedin | threads | facebook | youtube | pinterest'),
      },
      required: ['caption', 'platform'],
    },
    async (input, _brand) => ({
      adapted: adaptCaptionFor(String(input.caption), input.platform as Parameters<typeof adaptCaptionFor>[1]),
    }),
  ),

  // ── Fal.ai: generación de imágenes profesionales ────────────────────────────

  tool(
    'fal_generate_image',
    'Genera una imagen con Fal.ai (nano-banana-2, flux-pro, ideogram-v3, etc.) para reemplazar al diseñador gráfico.',
    {
      type: 'object',
      properties: {
        prompt: str('Descripción visual'),
        negativePrompt: str('Elementos a evitar (opcional)'),
        aspectRatio: str('1:1 | 9:16 | 16:9 | 4:5 | 3:4 | 2:3'),
        style: str('photographic|illustration|minimal|3d-render|flat-design|anime|cinematic|cyberpunk'),
        model: str('nano-banana-2|flux-pro|flux-schnell|sdxl-turbo|ideogram-v3|recraft-v3|imagen-3'),
        numImages: { type: 'number', description: 'default 1' },
        preset: str('instagram-post|instagram-story|instagram-reel-cover|carousel-slide|youtube-thumbnail'),
      },
      required: ['prompt'],
    },
    async (input, _brand) =>
      falGenerateImage({
        prompt: String(input.prompt),
        negativePrompt: input.negativePrompt as string | undefined,
        aspectRatio: input.aspectRatio as Parameters<typeof falGenerateImage>[0]['aspectRatio'],
        style: input.style as Parameters<typeof falGenerateImage>[0]['style'],
        model: input.model as Parameters<typeof falGenerateImage>[0]['model'],
        numImages: input.numImages as number | undefined,
        preset: input.preset as Parameters<typeof falGenerateImage>[0]['preset'],
      }),
  ),

  tool(
    'fal_generate_carousel',
    'Genera múltiples imágenes para un carrusel coherente.',
    {
      type: 'object',
      properties: {
        slides: { type: 'array', description: 'Array de { slideNumber, title, body, visualConcept }' },
        baseStyle: { type: 'object', description: 'VisualBriefInput compartido entre slides' },
      },
      required: ['slides'],
    },
    async (input, _brand) =>
      falGenerateCarousel(
        input.slides as Parameters<typeof falGenerateCarousel>[0],
        input.baseStyle as Parameters<typeof falGenerateCarousel>[1],
      ),
  ),

  tool(
    'fal_build_prompt',
    'Construye un prompt visual estructurado desde un brief (subject, style, mood, colors, composition).',
    {
      type: 'object',
      properties: {
        subject: str('Qué se muestra'),
        style: str('Estilo'),
        mood: str('Mood'),
        brandColors: { type: 'array', items: { type: 'string' } },
        composition: str('Composición'),
        lighting: str('Iluminación'),
        textOverlay: str('Texto a integrar'),
        forbidden: { type: 'array', items: { type: 'string' } },
      },
      required: ['subject'],
    },
    async (input, _brand) =>
      buildPromptFromBrief({
        subject: String(input.subject),
        style: input.style as Parameters<typeof buildPromptFromBrief>[0]['style'],
        mood: input.mood as string | undefined,
        brandColors: input.brandColors as string[] | undefined,
        composition: input.composition as string | undefined,
        lighting: input.lighting as string | undefined,
        textOverlay: input.textOverlay as string | undefined,
        forbidden: input.forbidden as string[] | undefined,
      }),
  ),

  tool(
    'fal_list_models',
    'Lista los modelos de generación de imagen disponibles con su mejor uso, costo y calidad.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listFalModels(),
  ),

  tool(
    'fal_spending',
    'Resumen de gasto en Fal.ai: total, últimos 7 días, por modelo.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getFalSpending(),
  ),

  // ── Brand Interview ─────────────────────────────────────────────────────────

  tool(
    'brand_interview_start',
    'Inicia la entrevista de marca de 9 preguntas estructuradas.',
    {
      type: 'object',
      properties: { source: str('voice | chat | form | canvas') },
    },
    async (input, _brand) => startInterview((input.source as Parameters<typeof startInterview>[0]) ?? 'chat'),
  ),

  tool(
    'brand_interview_active',
    'Devuelve la entrevista actualmente en curso (si existe).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getActiveInterview(),
  ),

  tool(
    'brand_interview_next_question',
    'Devuelve la próxima pregunta sin responder de una entrevista en curso.',
    {
      type: 'object',
      properties: { interviewId: str('ID de la entrevista') },
      required: ['interviewId'],
    },
    async (input, _brand) => {
      const active = getActiveInterview();
      const interview = active && active.id === input.interviewId ? active : null;
      if (!interview) return { error: 'Entrevista no encontrada o no activa' };
      return brandInterviewNextQuestion(interview);
    },
  ),

  tool(
    'brand_interview_answer',
    'Submite una respuesta a una pregunta de la entrevista. Score automático + follow-up si la respuesta es pobre.',
    {
      type: 'object',
      properties: {
        interviewId: str('ID de entrevista'),
        questionId: str('ID de pregunta'),
        answer: str('Respuesta del usuario'),
      },
      required: ['interviewId', 'questionId', 'answer'],
    },
    async (input, _brand) =>
      brandInterviewSubmitAnswer(String(input.interviewId), String(input.questionId), String(input.answer)),
  ),

  tool(
    'brand_interview_consolidate',
    'Consolida las 9 respuestas en un BrandBrief completo (consolida + persiste).',
    {
      type: 'object',
      properties: { interviewId: str('ID de entrevista') },
      required: ['interviewId'],
    },
    async (input, _brand) => consolidateInterview(String(input.interviewId)),
  ),

  tool(
    'brand_interview_apply',
    'Convierte un BrandBrief en BrandProfile listo para guardar en data/brand.json.',
    {
      type: 'object',
      properties: { interviewId: str('ID de entrevista (debe estar consolidada)') },
      required: ['interviewId'],
    },
    async (input, brand) => {
      const result = await consolidateInterview(String(input.interviewId));
      return briefToBrandProfile(result, brand);
    },
  ),

  tool(
    'brand_interview_progress',
    'Progreso de una entrevista en curso: cuántas preguntas respondidas, calidad promedio, pendientes.',
    {
      type: 'object',
      properties: { interviewId: str('ID de entrevista') },
      required: ['interviewId'],
    },
    async (input, _brand) => getInterviewProgress(String(input.interviewId)),
  ),

  tool(
    'brand_interview_questions',
    'Lista las 9 preguntas estructuradas de la entrevista de marca.',
    { type: 'object', properties: {} },
    async (_input, _brand) => INTERVIEW_QUESTIONS,
  ),

  // ── Graphic Designer ────────────────────────────────────────────────────────

  tool(
    'design_generate',
    'Genera una pieza visual profesional reemplazando al diseñador gráfico (feed/reel cover/story/carousel/highlight cover).',
    {
      type: 'object',
      properties: {
        target: str('feed-post | reel-cover | story | carousel | highlight-cover | profile-photo'),
        concept: str('Qué se debe transmitir'),
        textOverlay: str('Texto a integrar (opcional)'),
        mood: str('Mood'),
        numVariants: { type: 'number', description: 'default 1' },
      },
      required: ['target', 'concept'],
    },
    async (input, brand) =>
      generateDesign(
        {
          target: input.target as Parameters<typeof generateDesign>[0]['target'],
          concept: String(input.concept),
          textOverlay: input.textOverlay as string | undefined,
          mood: input.mood as string | undefined,
          numVariants: input.numVariants as number | undefined,
        },
        brand,
      ),
  ),

  tool(
    'design_carousel',
    'Genera un carrusel completo: copy + visual + design system. Reemplaza al diseñador para carruseles.',
    {
      type: 'object',
      properties: {
        topic: str('Tema del carrusel'),
        slideCount: { type: 'number', description: 'Cantidad de slides' },
      },
      required: ['topic', 'slideCount'],
    },
    async (input, brand) => generateCarouselDeliverable(String(input.topic), Number(input.slideCount), brand),
  ),

  tool(
    'design_from_caption',
    'Genera el visual coherente para acompañar un caption existente.',
    {
      type: 'object',
      properties: {
        caption: str('Caption del post'),
        format: str('reel | reel-faceless | carrusel | post-imagen | historia | live'),
      },
      required: ['caption', 'format'],
    },
    async (input, brand) =>
      designFromCaption(String(input.caption), input.format as Parameters<typeof designFromCaption>[1], brand),
  ),

  tool(
    'design_profile_photo',
    'Genera variaciones de profile photo profesional.',
    {
      type: 'object',
      properties: {
        description: str('Descripción del avatar'),
        variants: { type: 'number', description: 'default 3' },
      },
      required: ['description'],
    },
    async (input, brand) => generateProfilePhoto(String(input.description), brand, Number(input.variants ?? 3)),
  ),

  tool(
    'design_highlight_set',
    'Genera un set completo de covers de Highlights con identidad visual coherente.',
    {
      type: 'object',
      properties: {
        highlights: { type: 'array', description: 'Array de { name, concept }' },
      },
      required: ['highlights'],
    },
    async (input, brand) =>
      generateHighlightCoverSet(input.highlights as Parameters<typeof generateHighlightCoverSet>[0], brand),
  ),

  tool(
    'design_remix',
    'Re-genera una pieza visual aplicando feedback del usuario.',
    {
      type: 'object',
      properties: {
        target: str('Target original'),
        concept: str('Concepto original'),
        feedback: str('Qué cambiar específicamente'),
      },
      required: ['target', 'concept', 'feedback'],
    },
    async (input, brand) =>
      remixDesign(
        {
          target: input.target as Parameters<typeof remixDesign>[0]['target'],
          concept: String(input.concept),
        },
        String(input.feedback),
        brand,
      ),
  ),

  tool(
    'design_audit',
    'Audita una pieza visual generada (score 0-100, issues, sugerencias).',
    {
      type: 'object',
      properties: {
        imageUrl: str('URL de la imagen'),
        intendedMood: str('Mood buscado'),
      },
      required: ['imageUrl', 'intendedMood'],
    },
    async (input, brand) => auditDesign(String(input.imageUrl), String(input.intendedMood), brand),
  ),

  tool(
    'design_principles',
    'Devuelve los principios de diseño que usa el sistema (composición, tipografía, color, carrusel).',
    { type: 'object', properties: {} },
    async (_input, _brand) => DESIGN_PRINCIPLES,
  ),

  // ── Brand Renewal ───────────────────────────────────────────────────────────

  tool(
    'brand_audit',
    'Audita la salud de la marca actual: fatiga, posicionamiento, voz, visual.',
    { type: 'object', properties: {} },
    async (_input, brand) => auditBrand(brand),
  ),

  tool(
    'brand_propose_evolution',
    'Propone evolución de marca basada en un audit reciente.',
    {
      type: 'object',
      properties: {
        scope: str('visual | voice | positioning | full (opcional)'),
      },
    },
    async (input, brand) => {
      const audit = await auditBrand(brand);
      return proposeEvolution(brand, audit, input.scope as Parameters<typeof proposeEvolution>[2]);
    },
  ),

  tool(
    'brand_renewal_full',
    'Workflow completo: audit + propuesta. Espera aprobación humana para ejecutar.',
    { type: 'object', properties: {} },
    async (_input, brand) => runFullRenewal(brand),
  ),

  tool(
    'brand_renewal_approve_execute',
    'Aprueba y ejecuta una renovación de marca: genera nuevos assets (profile photo, highlights, style board).',
    {
      type: 'object',
      properties: { renewalId: str('ID de la renovación') },
      required: ['renewalId'],
    },
    async (input, brand) => approveAndExecuteRenewal(String(input.renewalId), brand),
  ),

  tool(
    'brand_renewal_list',
    'Lista las renovaciones de marca hechas.',
    {
      type: 'object',
      properties: { limit: { type: 'number', description: 'default 10' } },
    },
    async (input, _brand) => listRenewals(Number(input.limit ?? 10)),
  ),

  tool(
    'brand_renewal_get',
    'Obtiene una renovación específica.',
    {
      type: 'object',
      properties: { renewalId: str('ID') },
      required: ['renewalId'],
    },
    async (input, _brand) => getRenewal(String(input.renewalId)),
  ),

  // ── Professional Knowledge ──────────────────────────────────────────────────

  tool(
    'knowledge_get_profession_kb',
    'Devuelve la base de conocimiento de una profesión (cm, designer, brand_strategist, creative_director, social_scientist, art_director, copywriter, video_producer).',
    {
      type: 'object',
      properties: { role: str('Role profesional') },
      required: ['role'],
    },
    async (input, _brand) => getProfessionKB(input.role as Parameters<typeof getProfessionKB>[0]),
  ),

  tool(
    'knowledge_system_prompt',
    'Construye un system prompt cargado con la KB profesional para una tarea específica.',
    {
      type: 'object',
      properties: { role: str('Role profesional') },
      required: ['role'],
    },
    async (input, brand) => ({
      systemPrompt: buildProfessionalSystemPrompt(
        input.role as Parameters<typeof buildProfessionalSystemPrompt>[0],
        brand,
      ),
    }),
  ),

  tool(
    'knowledge_professions_replaced',
    'Lista las profesiones que FeedIA reemplaza con su rango salarial de mercado.',
    { type: 'object', properties: {} },
    async (_input, _brand) => PROFESSIONS_REPLACED,
  ),

  tool(
    'knowledge_replacement_value',
    'Calcula el valor mensual estimado en USD que FeedIA reemplaza (suma de salarios promedio del equipo profesional).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getReplacementValue(),
  ),
);

tools.push(
  tool(
    'swarm_run_mission',
    'Lanza una MISIÓN AUTÓNOMA de punta a punta: el framework orquestador arma la crew de agentes, planifica el DAG de tareas, ejecuta, autoevalúa con un crítico de reflexión y replanifica si hace falta. Usalo para objetivos complejos que requieren varios agentes coordinados (ej: "subí 1 carrusel por día con su estrategia", "lanzá la campaña de crecimiento de la semana"). Respeta los checkpoints humanos.',
    {
      type: 'object',
      properties: {
        objetivo: str('Objetivo en lenguaje natural a cumplir de punta a punta'),
        maxReintentosPorTarea: { type: 'number', description: 'Reintentos máx por tarea (default 2)' },
        maxReplanificaciones: { type: 'number', description: 'Replanificaciones globales máx (default 1)' },
      },
      required: ['objetivo'],
    },
    async (input, brand) => {
      const rec = await runMission(brand, String(input['objetivo']), {
        maxAttemptsPerTask:
          typeof input['maxReintentosPorTarea'] === 'number' ? input['maxReintentosPorTarea'] : undefined,
        maxReplans: typeof input['maxReplanificaciones'] === 'number' ? input['maxReplanificaciones'] : undefined,
      });
      return {
        missionId: rec.id,
        status: rec.status,
        crew: rec.crew,
        pasos: rec.steps.map((s) => ({ tarea: s.taskId, agente: s.agentId, estado: s.status, score: s.score })),
        resumen: rec.summary,
      };
    },
  ),
  tool(
    'computer_watch',
    'Inicia una sesión de Computer Use OBSERVABLE: el usuario puede mirar en vivo (en la vista "Pantalla en vivo") cómo el sistema abre apps, mueve el cursor, tipea y opera para cumplir la instrucción. Devuelve el sessionId del stream.',
    {
      type: 'object',
      properties: {
        instruccion: str('Qué tiene que hacer (ej: "armá un carrusel y subilo", "respondé los DMs")'),
        velocidad: { type: 'number', description: 'Multiplicador de velocidad 0.15–3 (default 1)' },
      },
      required: ['instruccion'],
    },
    async (input, brand) =>
      startWatchSession(String(input['instruccion']), {
        brandId: brand.name,
        speed: typeof input['velocidad'] === 'number' ? (input['velocidad'] as number) : 1,
      }),
  ),
  tool(
    'bandit_pick',
    'Elige el mejor brazo de un experimento por Thompson Sampling (explora/explota solo, sin hiperparámetros). Ej: experimento "hook-pattern", brazos=ids de patrones.',
    {
      type: 'object',
      properties: {
        experimento: str('Id del experimento (ej: hook-pattern, content-format, posting-time)'),
        brazos: { type: 'array', items: { type: 'string' }, description: 'Ids de los brazos candidatos' },
      },
      required: ['experimento', 'brazos'],
    },
    async (input, _brand) => pickArm(String(input['experimento']), (input['brazos'] as string[]) ?? []),
  ),
  tool(
    'bandit_reward',
    'Registra el resultado de un brazo (éxito/fracaso) para que el bandit aprenda.',
    {
      type: 'object',
      properties: {
        experimento: str('Id del experimento'),
        brazo: str('Id del brazo'),
        exito: { type: 'boolean', description: 'true si funcionó' },
      },
      required: ['experimento', 'brazo', 'exito'],
    },
    async (input, _brand) => {
      rewardArm(String(input['experimento']), String(input['brazo']), input['exito'] === true);
      return banditStats(String(input['experimento']));
    },
  ),
  tool(
    'bandit_stats',
    'Estadísticas de un experimento del bandit: media estimada, pulls y Beta(α,β) por brazo, ordenados por mejor.',
    { type: 'object', properties: { experimento: str('Id del experimento') }, required: ['experimento'] },
    async (input, _brand) => banditStats(String(input['experimento'])),
  ),
  tool(
    'bandit_sync',
    'Sincroniza los bandits con los outcomes del reasoning-trace (el sistema aprende de su propia evidencia). Idempotente.',
    { type: 'object', properties: {} },
    async (_input, brand) => syncBanditsFromTraces(brand.name),
  ),
  tool(
    'executive_brief',
    'Genera el "brief ejecutivo" del fundador: apalancamiento (indicaciones→acciones), equipo senior reemplazado, ahorro, tier de estatus, trofeos y narrativa de prestigio. Pensado para que el dueño SIENTA que comanda un equipo de élite.',
    {
      type: 'object',
      properties: {
        fundador: str('Nombre del fundador/a a quien dirigirse (opcional)'),
        narrativaIA: { type: 'boolean', description: 'Elevar el relato con LLM (default false)' },
      },
    },
    async (input, brand) =>
      buildExecutiveBrief(brand, {
        fundador: typeof input['fundador'] === 'string' ? (input['fundador'] as string) : undefined,
        conNarrativaIA: input['narrativaIA'] === true,
      }),
  ),
  tool(
    'command_route',
    'Enruta una indicación libre del usuario a la acción correcta (carrusel, misión, atender comunidad, mirar pantalla, reporte, directiva). Devuelve la acción mapeada a un endpoint para disparar en un paso.',
    {
      type: 'object',
      properties: { texto: str('La indicación en lenguaje natural') },
      required: ['texto'],
    },
    async (input, brand) => routeCommand(brand, String(input['texto'])),
  ),
  tool(
    'concierge_welcome',
    'Ritual de entrada: saludo personalizado, delta de lo que el equipo hizo desde la última visita, tier, próxima indicación sugerida y feed humanizado. NOTA: actualiza la marca de "última visita".',
    { type: 'object', properties: {} },
    async (_input, brand) => getWelcome(brand),
  ),
  tool(
    'concierge_activity',
    'Feed humanizado en vivo: qué está haciendo cada miembro del equipo (Nova, Lía, Luca, Gard…) por la marca.',
    { type: 'object', properties: {} },
    async (_input, brand) => humanizeActivity(brand.name, 30),
  ),
  tool(
    'experience_recap',
    'Datos del recap "Wrapped" compartible del fundador (apalancamiento, equipo reemplazado, ahorro, tier). La imagen se descarga desde /api/experience/recap.svg|png.',
    { type: 'object', properties: {} },
    async (_input, brand) => buildRecapData(brand),
  ),
  tool(
    'investor_onepager',
    'Datos del one-pager para inversores (apalancamiento operativo, costo de equipo evitado, ahorro anualizado, tesis). El HTML imprimible está en /api/experience/onepager.',
    { type: 'object', properties: {} },
    async (_input, brand) => buildOnePagerData(brand),
  ),
  tool(
    'budget_status',
    'Estado del gobierno de tokens/costo de LLM: gasto del día, tope, % usado, llamadas y desglose por modelo. El sistema corta solo al llegar al tope (modo determinista).',
    {
      type: 'object',
      properties: { historial: { type: 'boolean', description: 'Incluir historial de días previos' } },
    },
    async (input, _brand) =>
      input['historial'] === true ? { actual: getBudgetStatus(), historial: getBudgetHistory() } : getBudgetStatus(),
  ),
  tool(
    'swarm_recall',
    'Recupera misiones autónomas pasadas SIMILARES a un objetivo (memoria basada en casos) para reusar lo que funcionó y no repetir errores.',
    {
      type: 'object',
      properties: {
        objetivo: str('Objetivo a comparar contra el historial'),
        k: { type: 'number', description: 'Cuántas misiones similares traer (default 3)' },
      },
      required: ['objetivo'],
    },
    async (input, brand) =>
      recallSimilarMissions(
        String(input['objetivo']),
        brand.name,
        typeof input['k'] === 'number' ? (input['k'] as number) : 3,
      ),
  ),
  tool(
    'carousel_factory_run',
    'Fábrica de carruseles 100% automática: elige un tema relevante a la cuenta (o el que pases), escribe el copy con la voz/paleta de marca, renderiza cada slide branded, valida estética + originalidad y lo sube a Instagram (respeta DRY_RUN). Devuelve el job con su estado.',
    {
      type: 'object',
      properties: {
        tema: str('Tema explícito (opcional; si falta se elige según la cuenta)'),
        autoPublicar: { type: 'boolean', description: 'Subir automáticamente (default true; DRY_RUN igual manda)' },
        longitud: str('corto | medio | largo (default medio)'),
      },
    },
    async (input, brand) =>
      runCarouselFactory(brand, {
        topic: typeof input['tema'] === 'string' ? (input['tema'] as string) : undefined,
        autoPublish: input['autoPublicar'] !== false,
        longitud: ['corto', 'medio', 'largo'].includes(String(input['longitud']))
          ? (input['longitud'] as 'corto' | 'medio' | 'largo')
          : 'medio',
      }),
  ),
  tool(
    'carousel_list',
    'Lista los últimos carruseles producidos por la fábrica automática con su estado, estética y slides renderizados.',
    { type: 'object', properties: {} },
    async (_input, brand) =>
      listCarouselJobs(brand.name)
        .slice(0, 20)
        .map((j) => ({
          id: j.id,
          tema: j.topic,
          estado: j.status,
          estetica: j.aestheticScore,
          slides: j.slideCount,
          nota: j.note,
        })),
  ),
  tool(
    'research_ask_professor',
    'Consultá al "Profesor" de Instagram: una respuesta experta fundamentada en conocimiento curado + inteligencia viva. Usalo cuando tengas una duda estratégica que no resolvés con otras tools.',
    {
      type: 'object',
      properties: { pregunta: str('La duda concreta de estrategia/algoritmo/políticas de Instagram') },
      required: ['pregunta'],
    },
    async (input, brand) => askProfessor(brand, String(input['pregunta'])),
  ),
  tool(
    'research_study_now',
    'Ejecuta una sesión de estudio: el sistema revisa qué pudo cambiar en políticas/algoritmo/mercado de Instagram y deja apuntes nuevos en el ledger (lo dudoso queda a verificar; un cambio de política de alto impacto abre checkpoint).',
    {
      type: 'object',
      properties: {
        fuentes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Textos de fuentes (ej: traídos por research_web_fetch) para fundamentar el estudio',
        },
      },
    },
    async (input, brand) =>
      runStudySession(brand, {
        sources: Array.isArray(input['fuentes']) ? (input['fuentes'] as string[]) : undefined,
      }),
  ),
  tool(
    'research_ledger_query',
    'Consulta los "apuntes" vivos del sistema sobre Instagram (cambios de políticas, algoritmo, demanda de mercado, riesgos). Conocimiento fresco con confianza y caducidad.',
    {
      type: 'object',
      properties: {
        topic: str(
          'Filtro opcional: policy-change|algorithm-shift|new-feature|market-demand|format-trend|risk|best-practice',
        ),
        buscar: str('Texto a buscar en los apuntes (opcional)'),
        limite: { type: 'number', description: 'Máx resultados (default 12)' },
      },
    },
    async (input, _brand) =>
      queryLedger({
        topic: typeof input['topic'] === 'string' ? (input['topic'] as never) : undefined,
        search: typeof input['buscar'] === 'string' ? (input['buscar'] as string) : undefined,
        limit: typeof input['limite'] === 'number' ? (input['limite'] as number) : 12,
      }),
  ),
  tool(
    'research_web_fetch',
    'Lee una página pública concreta (ej: el newsroom de Meta, un blog de la industria) y devuelve su texto. NO es un buscador: necesitás la URL. Para sintetizar usá research_ask_professor.',
    {
      type: 'object',
      properties: { url: str('URL http/https a leer') },
      required: ['url'],
    },
    async (input, _brand) => webFetch(String(input['url'])),
  ),
  tool(
    'ig_calc',
    'Calculadora determinista de Instagram (sin alucinar números): engagement, proyección de crecimiento, crecimiento requerido, plan de cadencia, estimación de alcance, mezcla de hashtags, ROI de colaboración.',
    {
      type: 'object',
      properties: {
        op: str('engagement|growth|required-growth|cadence|reach|hashtag-mix|collab-roi'),
        input: { type: 'object', description: 'Parámetros según la operación' },
      },
      required: ['op', 'input'],
    },
    async (input, _brand) => igCalc({ op: input['op'], input: input['input'] } as unknown as IgCalcOp),
  ),
  tool(
    'video_generate_reel',
    'Genera un video de Reel completo: script, imágenes y renderizado. Requiere VIDEO_PROVIDER configurado (replicate, ffmpeg, o api).',
    {
      type: 'object',
      properties: {
        topic: str('Tema del reel'),
        duration: { type: 'number', description: 'Duración en segundos (default 30)' },
        style: str('Estilo visual'),
        generateImages: { type: 'boolean', description: 'Generar imágenes automáticamente' },
      },
      required: ['topic'],
    },
    async (input, brand) =>
      runReelPipeline({
        topic: String(input['topic']),
        brandId: brand.name,
        targetDuration: typeof input['duration'] === 'number' ? input['duration'] : 30,
        style: input['style'] ? String(input['style']) : undefined,
        generateImages: input['generateImages'] !== false,
      }),
  ),
  tool(
    'ab_test_start',
    'Inicia un A/B test publicando variantes en Instagram. Cada variante tiene su propio caption y medios.',
    {
      type: 'object',
      properties: {
        name: str('Nombre del test'),
        hypothesis: str('Hipótesis a validar'),
        variants: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: str('Nombre de la variante'),
              caption: str('Caption'),
              mediaUrls: { type: 'array', items: { type: 'string' } },
              format: { type: 'string', enum: ['reel', 'imagen', 'carrusel', 'historia'] },
            },
            required: ['name', 'caption', 'mediaUrls', 'format'],
          },
        },
      },
      required: ['name', 'hypothesis', 'variants'],
    },
    async (input, brand) =>
      startABTest({
        accountId: brand.name,
        name: String(input['name']),
        hypothesis: String(input['hypothesis']),
        variants: input['variants'] as Array<{
          name: string;
          caption: string;
          mediaUrls: string[];
          format: 'reel' | 'imagen' | 'carrusel' | 'historia';
        }>,
      }),
  ),
  tool(
    'ab_test_evaluate',
    'Evalúa un A/B test en ejecución y determina si hay un ganador estadísticamente significativo.',
    {
      type: 'object',
      properties: {
        testId: str('ID del test'),
      },
      required: ['testId'],
    },
    async (input, _brand) => evaluateABTest(String(input['testId'])),
  ),
  tool(
    'ab_test_list',
    'Lista todos los A/B tests de la cuenta activa.',
    { type: 'object', properties: {} },
    async (_input, brand) => listABTests(brand.name),
  ),
  tool(
    'trends_scout_real',
    'Detecta tendencias reales usando Reddit, Google Trends (vía SerpAPI), y Twitter/X. Devuelve keywords con volumen y crecimiento.',
    {
      type: 'object',
      properties: {
        keywords: { type: 'array', items: { type: 'string' }, description: 'Palabras clave a buscar' },
        sources: { type: 'array', items: { type: 'string', enum: ['reddit', 'google', 'twitter'] } },
      },
      required: ['keywords'],
    },
    async (input, _brand) =>
      scoutRealTrends(
        (input['keywords'] as string[]) ?? [],
        (input['sources'] as Array<'reddit' | 'google' | 'twitter'>) ?? ['reddit', 'google'],
      ),
  ),
  tool(
    'competitor_track_real',
    'Obtiene datos reales de un competidor vía RapidAPI, Apify, o webhook configurado.',
    {
      type: 'object',
      properties: {
        handle: str('Usuario de Instagram del competidor'),
      },
      required: ['handle'],
    },
    async (input, _brand) => trackCompetitor(String(input['handle'])),
  ),
  tool(
    'email_send_notification',
    'Envía una notificación por email usando Resend, SendGrid, o SMTP configurado.',
    {
      type: 'object',
      properties: {
        to: str('Dirección de email destino'),
        subject: str('Asunto'),
        message: str('Mensaje en texto plano'),
      },
      required: ['to', 'subject', 'message'],
    },
    async (input, _brand) => sendNotification(String(input['to']), String(input['subject']), String(input['message'])),
  ),
  tool(
    'account_list',
    'Lista todas las marcas/cuentas configuradas en el sistema (multi-cuenta).',
    { type: 'object', properties: {} },
    async (_input, _brand) =>
      listBrandProfiles().map((b) => ({ id: b.id, name: b.profile.name, niche: b.profile.niche })),
  ),
  tool(
    'account_set_active',
    'Cambia la marca/cuenta activa para la sesión actual. Requiere reiniciar el agente para aplicar completamente.',
    {
      type: 'object',
      properties: {
        brandId: str('ID de la marca'),
      },
      required: ['brandId'],
    },
    async (input, _brand) => {
      const brandId = String(input['brandId']);
      const profile = loadBrandProfileById(brandId);
      return { ok: true, brandId, name: profile.name, note: 'Reiniciá el agente para aplicar la marca completamente.' };
    },
  ),
  tool(
    'agent_self_improve',
    'Registra una lección aprendida para que el agente mejore en futuras ejecuciones. Úsalo cuando detectés un patrón de error, una mejora posible, o un insight valioso.',
    {
      type: 'object',
      properties: {
        lesson: str('La lección aprendida en 1-2 oraciones'),
        context: str('Contexto en el que ocurrió'),
        impact: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Impacto de la lección' },
        category: {
          type: 'string',
          enum: ['prompt_improvement', 'parameter_tuning', 'new_capability', 'api_discovery', 'workflow_optimization'],
          description: 'Categoría',
        },
      },
      required: ['lesson', 'context', 'impact', 'category'],
    },
    async (input, _brand) => {
      addLesson({
        agentId: 'system',
        lesson: String(input['lesson']),
        context: String(input['context']),
        impact: input['impact'] as 'high' | 'medium' | 'low',
        category: input['category'] as
          | 'prompt_improvement'
          | 'parameter_tuning'
          | 'new_capability'
          | 'api_discovery'
          | 'workflow_optimization',
      });
      return { ok: true, message: 'Lección registrada' };
    },
  ),
  tool(
    'agent_recall_lessons',
    'Recupera lecciones aprendidas previas para un agente específico. Úsalo antes de ejecutar una tarea similar a una anterior.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        limit: { type: 'number', description: 'Máximo de lecciones a recuperar' },
      },
      required: ['agentId'],
    },
    async (input, _brand) => {
      const lessons = getLessonsForAgent(
        String(input['agentId']),
        typeof input['limit'] === 'number' ? input['limit'] : 5,
      );
      return { lessons };
    },
  ),
  tool(
    'trigger_list',
    'Lista todos los triggers automáticos configurados: qué eventos disparan qué agentes y con qué cooldown.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listTriggers(),
  ),
  tool(
    'trigger_simulate',
    'Simula un evento para probar triggers automáticos sin esperar a que ocurra realmente.',
    {
      type: 'object',
      properties: {
        event: str('Nombre del evento (ej: inbound_message_received, anomaly_detected)'),
        payload: { type: 'object', description: 'Datos del evento' },
      },
      required: ['event'],
    },
    async (input, brand) => {
      await handleEvent(String(input['event']), (input['payload'] as Record<string, unknown>) ?? {}, brand);
      return { ok: true, simulated: input['event'] };
    },
  ),
  tool(
    'team_list',
    'Lista todos los equipos de agentes preconfigurados (Content Strike Team, Growth Squad, etc.).',
    { type: 'object', properties: {} },
    async (_input, _brand) => listTeams().map((t) => ({ id: t.id, name: t.name, agents: t.agentIds })),
  ),
  tool(
    'team_run',
    'Ejecuta un equipo completo de agentes en secuencia. Cada agente recibe el contexto acumulado del anterior.',
    {
      type: 'object',
      properties: {
        teamId: str('ID del equipo'),
        context: str('Contexto adicional para la misión del equipo'),
      },
      required: ['teamId'],
    },
    async (input, brand) => {
      const team = getTeam(String(input['teamId']));
      if (!team) throw new Error(`Team ${input['teamId']} no encontrado`);
      return runAgentTeam(team.id, brand, input['context'] ? String(input['context']) : undefined);
    },
  ),
  tool(
    'swarm_operations_cycle',
    'Ejecuta un ciclo del Director de Operaciones 24/7: revisa los departamentos (crecimiento, frescura de contenido, refresco de branding) y despacha como máximo 1 misión autónoma para el que esté fuera de cooldown y sea más prioritario. Como un jefe de equipo decidiendo la jugada del día.',
    {
      type: 'object',
      properties: {
        maxMisiones: { type: 'number', description: 'Máx misiones a despachar (default 1)' },
      },
    },
    async (input, brand) =>
      runOperationsCycle(brand, {
        autonomy: 'fully_autonomous',
        maxMissions: typeof input['maxMisiones'] === 'number' ? input['maxMisiones'] : 1,
      }),
  ),
  tool(
    'swarm_operations_status',
    'Muestra el estado de los departamentos del Director de Operaciones: último despacho y cuándo vuelve a estar disponible cada uno (cooldown).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getOperationsStatus(),
  ),
  tool(
    'swarm_list_missions',
    'Lista las últimas misiones autónomas ejecutadas por el framework orquestador con su estado y resumen.',
    { type: 'object', properties: {} },
    async (_input, brand) =>
      listMissions(brand.name)
        .slice(0, 20)
        .map((m) => ({
          id: m.id,
          objetivo: m.objective,
          estado: m.status,
          tareas: m.steps.length,
          replans: m.replans,
          resumen: m.summary,
        })),
  ),

  // ── DM Inbox (CM real-time) ─────────────────────────────────────────────────

  tool(
    'cm_inbox_ingest',
    'Ingesta un mensaje entrante en el DM Inbox. Crea conversación nueva o agrega al thread existente. Auto-clasifica intent, sentiment, priority.',
    {
      type: 'object',
      properties: {
        threadId: str('ID del thread de Instagram'),
        contactUsername: str('Username del contacto'),
        text: str('Texto del mensaje'),
        contactFollowerCount: { type: 'number', description: 'Seguidores del contacto (opcional)' },
        contactIsFollower: { type: 'boolean' },
        referredPostId: str('ID del post que originó'),
        isStoryReply: { type: 'boolean' },
      },
      required: ['threadId', 'contactUsername', 'text'],
    },
    async (input, _brand) =>
      cmIngestMessage({
        threadId: String(input.threadId),
        contactUsername: String(input.contactUsername),
        text: String(input.text),
        contactFollowerCount: input.contactFollowerCount as number | undefined,
        contactIsFollower: input.contactIsFollower as boolean | undefined,
        referredPostId: input.referredPostId as string | undefined,
        isStoryReply: input.isStoryReply as boolean | undefined,
      }),
  ),

  tool(
    'cm_inbox_suggest_reply',
    'Genera la próxima respuesta apropiada para una conversación con todo el contexto multi-turn.',
    {
      type: 'object',
      properties: {
        conversationId: str('ID'),
        customInstructions: str('Opcional'),
        autoSend: { type: 'boolean' },
      },
      required: ['conversationId'],
    },
    async (input, brand) =>
      cmSuggestReply(String(input.conversationId), {
        brand,
        customInstructions: input.customInstructions as string | undefined,
        autoSend: input.autoSend as boolean | undefined,
      }),
  ),

  tool(
    'cm_inbox_tick',
    'Procesa la cola del inbox: triage, respuestas auto, escalaciones.',
    {
      type: 'object',
      properties: { maxProcess: { type: 'number' } },
    },
    async (input, _brand) => cmTickInbox(Number(input.maxProcess ?? 15)),
  ),

  tool(
    'cm_inbox_list',
    'Lista conversaciones del inbox con filtros.',
    {
      type: 'object',
      properties: {
        status: str('new|awaiting-reply|in-progress|stalled|resolved|escalated|archived'),
        intent: str('comercial|soporte|feedback|pregunta-general|colab|press|spam|amor|troll|desconocida'),
        priority: str('critical|high|normal|low'),
        assignedTo: str('lia|luca|gard|talia|human'),
      },
    },
    async (input, _brand) =>
      cmListConversations({
        status: input.status as NonNullable<Parameters<typeof cmListConversations>[0]>['status'],
        intent: input.intent as NonNullable<Parameters<typeof cmListConversations>[0]>['intent'],
        priority: input.priority as NonNullable<Parameters<typeof cmListConversations>[0]>['priority'],
        assignedTo: input.assignedTo as NonNullable<Parameters<typeof cmListConversations>[0]>['assignedTo'],
      }),
  ),

  tool(
    'cm_inbox_conversation',
    'Devuelve una conversación con todo su contexto multi-turn.',
    {
      type: 'object',
      properties: { conversationId: str('ID') },
      required: ['conversationId'],
    },
    async (input, _brand) => cmGetConversation(String(input.conversationId)),
  ),

  tool(
    'cm_inbox_snapshot',
    'Snapshot del inbox: pendientes, escalados, sentiment, breakdown por intent.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getInboxSnapshot(),
  ),

  tool(
    'cm_inbox_update_status',
    'Cambia el status de una conversación.',
    {
      type: 'object',
      properties: {
        conversationId: str('ID'),
        status: str('Status'),
        note: str('Nota'),
      },
      required: ['conversationId', 'status'],
    },
    async (input, _brand) =>
      cmUpdateConvStatus(
        String(input.conversationId),
        input.status as Parameters<typeof cmUpdateConvStatus>[1],
        input.note as string | undefined,
      ),
  ),

  tool(
    'cm_inbox_escalate',
    'Escala una conversación a un humano.',
    {
      type: 'object',
      properties: { conversationId: str('ID'), reason: str('Por qué') },
      required: ['conversationId', 'reason'],
    },
    async (input, _brand) => cmEscalateToHuman(String(input.conversationId), String(input.reason)),
  ),

  // ── Customer Support ────────────────────────────────────────────────────────

  tool(
    'cm_support_detect_flow',
    'Detecta el tipo de flow de soporte de un mensaje.',
    {
      type: 'object',
      properties: { messageText: str('Texto'), context: str('Contexto') },
      required: ['messageText'],
    },
    async (input, _brand) => supportDetectFlow(String(input.messageText), input.context as string | undefined),
  ),

  tool(
    'cm_support_open_from_conversation',
    'Abre caso de soporte automáticamente desde el último mensaje de conversación.',
    {
      type: 'object',
      properties: { conversationId: str('ID') },
      required: ['conversationId'],
    },
    async (input, brand) => openCaseFromConversation(String(input.conversationId), brand),
  ),

  tool(
    'cm_support_advance',
    'Avanza un caso de soporte con la próxima respuesta del cliente.',
    {
      type: 'object',
      properties: { caseId: str('ID'), customerMessage: str('Mensaje') },
      required: ['caseId', 'customerMessage'],
    },
    async (input, brand) => advanceSupportCase(String(input.caseId), String(input.customerMessage), brand),
  ),

  tool(
    'cm_support_list',
    'Lista casos de soporte con filtros.',
    {
      type: 'object',
      properties: {
        stage: str('Stage'),
        flowType: str('Tipo'),
        priority: str('critical|high|normal'),
      },
    },
    async (input, _brand) =>
      listSupportCases({
        stage: input.stage as NonNullable<Parameters<typeof listSupportCases>[0]>['stage'],
        flowType: input.flowType as NonNullable<Parameters<typeof listSupportCases>[0]>['flowType'],
        priority: input.priority as NonNullable<Parameters<typeof listSupportCases>[0]>['priority'],
      }),
  ),

  tool(
    'cm_support_get',
    'Devuelve un caso de soporte.',
    {
      type: 'object',
      properties: { caseId: str('ID') },
      required: ['caseId'],
    },
    async (input, _brand) => getSupportCase(String(input.caseId)),
  ),

  tool(
    'cm_support_snapshot',
    'Snapshot del support: activos, SLA breaches, tiempo de resolución.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getSupportSnapshot(),
  ),

  tool(
    'cm_support_rate',
    'Registra rating de satisfacción de un caso.',
    {
      type: 'object',
      properties: { caseId: str('ID'), score: { type: 'number' }, comment: str('') },
      required: ['caseId', 'score'],
    },
    async (input, _brand) =>
      rateSupportCase(
        String(input.caseId),
        Number(input.score) as 1 | 2 | 3 | 4 | 5,
        input.comment as string | undefined,
      ),
  ),

  // ── FAQ Database ────────────────────────────────────────────────────────────

  tool(
    'cm_faq_create',
    'Crea una FAQ manualmente.',
    {
      type: 'object',
      properties: {
        question: str(''),
        answer: str(''),
        category: str('producto|precio|envío|devoluciones|soporte|horarios|método-pago|política|general'),
        patterns: { type: 'array', items: { type: 'string' } },
      },
      required: ['question', 'answer', 'category'],
    },
    async (input, _brand) =>
      createFAQ({
        question: String(input.question),
        answer: String(input.answer),
        category: input.category as Parameters<typeof createFAQ>[0]['category'],
        patterns: input.patterns as string[] | undefined,
      }),
  ),

  tool(
    'cm_faq_match',
    'Busca FAQ que matchee una pregunta.',
    {
      type: 'object',
      properties: { question: str(''), minSimilarity: { type: 'number' } },
      required: ['question'],
    },
    async (input, _brand) => findMatchingFAQ(String(input.question), Number(input.minSimilarity ?? 0.5)),
  ),

  tool(
    'cm_faq_try_answer',
    'Intenta responder con FAQ con personalización al contexto.',
    {
      type: 'object',
      properties: {
        question: str(''),
        conversationContext: str(''),
        minConfidence: { type: 'number' },
      },
      required: ['question', 'conversationContext'],
    },
    async (input, brand) =>
      tryAnswerWithFAQ(String(input.question), String(input.conversationContext), brand, {
        minConfidence: input.minConfidence as number | undefined,
      }),
  ),

  tool(
    'cm_faq_detect_patterns',
    'Analiza histórico y detecta nuevas FAQ recurrentes.',
    { type: 'object', properties: {} },
    async (_input, brand) => detectFAQPatterns(brand),
  ),

  tool(
    'cm_faq_propose_from_pattern',
    'Genera draft FAQ desde un pattern detectado.',
    {
      type: 'object',
      properties: { patternId: str('ID') },
      required: ['patternId'],
    },
    async (input, brand) => proposeFAQFromPattern(String(input.patternId), brand),
  ),

  tool(
    'cm_faq_approve',
    'Aprueba y agrega una FAQ desde draft.',
    {
      type: 'object',
      properties: {
        question: str(''),
        answer: str(''),
        category: str('Categoría'),
        questionPatterns: { type: 'array', items: { type: 'string' } },
        patternId: str('ID pattern (opcional)'),
      },
      required: ['question', 'answer', 'category'],
    },
    async (input, _brand) =>
      approveAndAddFAQ(
        {
          question: String(input.question),
          answer: String(input.answer),
          category: input.category as Parameters<typeof createFAQ>[0]['category'],
          language: 'es',
          questionPatterns: (input.questionPatterns as string[]) ?? [String(input.question)],
          approvedByHuman: true,
          tags: [String(input.category)],
        },
        input.patternId as string | undefined,
      ),
  ),

  tool(
    'cm_faq_list',
    'Lista FAQs aprobadas.',
    {
      type: 'object',
      properties: { category: str(''), minPopularity: { type: 'number' } },
    },
    async (input, _brand) =>
      listFAQs({
        category: input.category as NonNullable<Parameters<typeof listFAQs>[0]>['category'],
        minPopularity: input.minPopularity as number | undefined,
      }),
  ),

  tool(
    'cm_faq_pending',
    'Lista patrones pendientes de aprobación.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listPendingPatterns(),
  ),

  tool('cm_faq_snapshot', 'Snapshot del FAQ database.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getFAQSnapshot(),
  ),

  tool(
    'cm_faq_delete',
    'Elimina una FAQ.',
    {
      type: 'object',
      properties: { faqId: str('ID') },
      required: ['faqId'],
    },
    async (input, _brand) => ({ deleted: deleteFAQ(String(input.faqId)) }),
  ),

  // ── Stories Studio ──────────────────────────────────────────────────────────

  tool(
    'cm_stories_create_sequence',
    'Genera secuencia de stories interactiva con copy + visuales (Fal.ai).',
    {
      type: 'object',
      properties: {
        intent: str('engagement|awareness|sales|community|announcement|behind-the-scenes'),
        topic: str(''),
        slideCount: { type: 'number' },
        scheduledFor: str(''),
        generateImages: { type: 'boolean' },
      },
      required: ['intent', 'topic'],
    },
    async (input, brand) =>
      cmCreateStorySequence(
        {
          intent: input.intent as Parameters<typeof cmCreateStorySequence>[0]['intent'],
          topic: String(input.topic),
          slideCount: input.slideCount as number | undefined,
          scheduledFor: input.scheduledFor as string | undefined,
          generateImages: (input.generateImages as boolean) ?? true,
        },
        brand,
      ),
  ),

  tool(
    'cm_stories_publish',
    'Publica una secuencia (Upload-Post, funciona con device off).',
    {
      type: 'object',
      properties: { sequenceId: str('ID'), scheduleAt: str('') },
      required: ['sequenceId'],
    },
    async (input, _brand) => publishSequence(String(input.sequenceId), input.scheduleAt as string | undefined),
  ),

  tool(
    'cm_stories_plan_daily',
    'Plan automático de 3 secuencias para el día.',
    { type: 'object', properties: {} },
    async (_input, brand) => planDailyStories(brand),
  ),

  tool(
    'cm_stories_list',
    'Lista secuencias.',
    {
      type: 'object',
      properties: {
        status: str(''),
        intent: str(''),
        limit: { type: 'number' },
      },
    },
    async (input, _brand) =>
      listSequences({
        status: input.status as NonNullable<Parameters<typeof listSequences>[0]>['status'],
        intent: input.intent as NonNullable<Parameters<typeof listSequences>[0]>['intent'],
        limit: input.limit as number | undefined,
      }),
  ),

  tool(
    'cm_stories_get',
    'Devuelve una secuencia.',
    {
      type: 'object',
      properties: { sequenceId: str('ID') },
      required: ['sequenceId'],
    },
    async (input, _brand) => getSequence(String(input.sequenceId)),
  ),

  tool('cm_stories_snapshot', 'Snapshot de stories.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getStoriesSnapshot(),
  ),

  tool(
    'cm_stories_record_metrics',
    'Registra métricas reales de una secuencia.',
    {
      type: 'object',
      properties: {
        sequenceId: str('ID'),
        metrics: { type: 'object' },
      },
      required: ['sequenceId', 'metrics'],
    },
    async (input, _brand) =>
      recordSequenceMetrics(String(input.sequenceId), input.metrics as Parameters<typeof recordSequenceMetrics>[1]),
  ),

  // ── Lead Pipeline ───────────────────────────────────────────────────────────

  tool(
    'cm_lead_create',
    'Crea lead desde conversación con BANT scoring automático.',
    {
      type: 'object',
      properties: {
        conversationId: str('ID conv'),
        source: str('dm-direct|comment-lead|story-reply|mention|profile-visit|referral'),
        productInterest: str(''),
        estimatedValueAmount: { type: 'number' },
        estimatedValueCurrency: str('USD'),
      },
      required: ['conversationId'],
    },
    async (input, _brand) =>
      createLead({
        conversationId: String(input.conversationId),
        source: input.source as Parameters<typeof createLead>[0]['source'],
        productInterest: input.productInterest as string | undefined,
        estimatedValue: input.estimatedValueAmount
          ? { amount: Number(input.estimatedValueAmount), currency: String(input.estimatedValueCurrency ?? 'USD') }
          : undefined,
      }),
  ),

  tool(
    'cm_lead_advance_stage',
    'Avanza lead de stage.',
    {
      type: 'object',
      properties: {
        leadId: str('ID'),
        newStage: str('new|qualified|engaged|proposal|negotiation|won|lost|nurture'),
        note: str(''),
        valueAmount: { type: 'number' },
      },
      required: ['leadId', 'newStage'],
    },
    async (input, _brand) =>
      advanceLeadStage(
        String(input.leadId),
        input.newStage as Parameters<typeof advanceLeadStage>[1],
        input.note as string | undefined,
        input.valueAmount as number | undefined,
      ),
  ),

  tool(
    'cm_lead_schedule_followup',
    'Programa follow-up para un lead.',
    {
      type: 'object',
      properties: {
        leadId: str('ID'),
        daysFromNow: { type: 'number' },
        template: str(''),
        context: str(''),
        reason: str(''),
      },
      required: ['leadId', 'daysFromNow', 'template', 'context', 'reason'],
    },
    async (input, _brand) =>
      scheduleFollowUp(String(input.leadId), {
        daysFromNow: Number(input.daysFromNow),
        template: String(input.template),
        context: String(input.context),
        reason: String(input.reason),
      }),
  ),

  tool(
    'cm_lead_process_followups',
    'Ejecuta follow-ups due.',
    { type: 'object', properties: {} },
    async (_input, brand) => processFollowUpsDue(brand),
  ),

  tool(
    'cm_lead_sync',
    'Re-sincroniza lead con conversación.',
    {
      type: 'object',
      properties: { leadId: str('ID') },
      required: ['leadId'],
    },
    async (input, brand) => syncLeadFromConversation(String(input.leadId), brand),
  ),

  tool('cm_lead_kanban', 'Pipeline Kanban completo.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getPipelineKanban(),
  ),

  tool(
    'cm_lead_list',
    'Lista leads con filtros.',
    {
      type: 'object',
      properties: {
        stage: str(''),
        classification: str('cold|warm|hot|unqualified'),
        ownerAgent: str('luca|max|human'),
      },
    },
    async (input, _brand) =>
      listLeads({
        stage: input.stage as NonNullable<Parameters<typeof listLeads>[0]>['stage'],
        classification: input.classification as NonNullable<Parameters<typeof listLeads>[0]>['classification'],
        ownerAgent: input.ownerAgent as NonNullable<Parameters<typeof listLeads>[0]>['ownerAgent'],
      }),
  ),

  tool(
    'cm_lead_get',
    'Devuelve lead específico.',
    {
      type: 'object',
      properties: { leadId: str('ID') },
      required: ['leadId'],
    },
    async (input, _brand) => getLead(String(input.leadId)),
  ),

  tool('cm_lead_snapshot', 'Snapshot del pipeline.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getPipelineSnapshot(),
  ),

  tool(
    'cm_lead_record_won',
    'Registra venta cerrada.',
    {
      type: 'object',
      properties: {
        leadId: str('ID'),
        amount: { type: 'number' },
        currency: str('USD'),
      },
      required: ['leadId', 'amount'],
    },
    async (input, _brand) =>
      recordWonRevenue(String(input.leadId), Number(input.amount), input.currency as string | undefined),
  ),

  tool(
    'cm_lead_add_objection',
    'Registra objeción del lead.',
    {
      type: 'object',
      properties: { leadId: str('ID'), objection: str('') },
      required: ['leadId', 'objection'],
    },
    async (input, _brand) => addObjectionToLead(String(input.leadId), String(input.objection)),
  ),

  tool(
    'cm_lead_add_promise',
    'Registra promesa que se le hizo al lead.',
    {
      type: 'object',
      properties: { leadId: str('ID'), promise: str('') },
      required: ['leadId', 'promise'],
    },
    async (input, _brand) => addPromiseToLead(String(input.leadId), String(input.promise)),
  ),

  tool(
    'cm_lead_score',
    'Calcula BANT score a partir de señales.',
    {
      type: 'object',
      properties: {
        hasBudget: { type: 'boolean' },
        budgetAmount: { type: 'number' },
        isDecisionMaker: { type: 'boolean' },
        hasUrgency: { type: 'boolean' },
        problemSeverity: str('low|medium|high|critical'),
        hasTimeline: { type: 'boolean' },
        timelineDays: { type: 'number' },
      },
    },
    async (input, _brand) =>
      computeLeadScore({
        hasBudget: input.hasBudget as boolean | undefined,
        budgetAmount: input.budgetAmount as number | undefined,
        isDecisionMaker: input.isDecisionMaker as boolean | undefined,
        hasUrgency: input.hasUrgency as boolean | undefined,
        problemSeverity: input.problemSeverity as Parameters<typeof computeLeadScore>[0]['problemSeverity'],
        hasTimeline: input.hasTimeline as boolean | undefined,
        timelineDays: input.timelineDays as number | undefined,
      }),
  ),

  // ── Tone Guardian ───────────────────────────────────────────────────────────

  tool(
    'cm_tone_check',
    'Audita si un texto respeta la voz de marca.',
    {
      type: 'object',
      properties: {
        text: str(''),
        context: str('caption|dm-reply|comment-reply|story-text|public-announcement|support-message|bio|cta'),
        strictMode: { type: 'boolean' },
      },
      required: ['text', 'context'],
    },
    async (input, brand) =>
      checkTone(String(input.text), input.context as Parameters<typeof checkTone>[1], {
        brand,
        strictMode: input.strictMode as boolean | undefined,
      }),
  ),

  tool(
    'cm_tone_guard',
    'Valida + auto-reescribe si no pasa.',
    {
      type: 'object',
      properties: {
        text: str(''),
        context: str(''),
        minScore: { type: 'number' },
        maxIterations: { type: 'number' },
        autoRewrite: { type: 'boolean' },
      },
      required: ['text', 'context'],
    },
    async (input, brand) =>
      guardOutput(String(input.text), input.context as Parameters<typeof guardOutput>[1], {
        brand,
        minScore: input.minScore as number | undefined,
        maxIterations: input.maxIterations as number | undefined,
        autoRewrite: input.autoRewrite as boolean | undefined,
      }),
  ),

  tool(
    'cm_tone_audit_consistency',
    'Audita consistencia tonal entre múltiples textos.',
    {
      type: 'object',
      properties: { texts: { type: 'array', description: '[{id, text, context}]' } },
      required: ['texts'],
    },
    async (input, brand) => auditConsistency(input.texts as Parameters<typeof auditConsistency>[0], brand),
  ),

  tool(
    'cm_tone_validate_or_fail',
    'Valida o falla (sin reescribir).',
    {
      type: 'object',
      properties: { text: str(''), context: str(''), minScore: { type: 'number' } },
      required: ['text', 'context'],
    },
    async (input, brand) =>
      validateOrFail(String(input.text), input.context as Parameters<typeof validateOrFail>[1], {
        brand,
        minScore: input.minScore as number | undefined,
      }),
  ),

  // ── UGC Manager ─────────────────────────────────────────────────────────────

  tool(
    'cm_ugc_ingest',
    'Ingesta detección de UGC.',
    {
      type: 'object',
      properties: {
        authorUsername: str(''),
        ugcType: str('story-mention|post-tag|comment-with-photo|review|unboxing|use-case'),
        caption: str(''),
        postUrl: str(''),
        mediaUrl: str(''),
        authorFollowerCount: { type: 'number' },
        sentimentEstimate: { type: 'number' },
      },
      required: ['authorUsername', 'ugcType', 'caption'],
    },
    async (input, _brand) =>
      ingestUGC({
        authorUsername: String(input.authorUsername),
        ugcType: input.ugcType as Parameters<typeof ingestUGC>[0]['ugcType'],
        caption: String(input.caption),
        postUrl: input.postUrl as string | undefined,
        mediaUrl: input.mediaUrl as string | undefined,
        authorFollowerCount: input.authorFollowerCount as number | undefined,
        sentimentEstimate: input.sentimentEstimate as number | undefined,
      }),
  ),

  tool(
    'cm_ugc_request_permission',
    'Envía DM pidiendo permiso para repostear UGC.',
    {
      type: 'object',
      properties: { ugcId: str('ID') },
      required: ['ugcId'],
    },
    async (input, brand) => requestRepostPermission(String(input.ugcId), brand),
  ),

  tool(
    'cm_ugc_mark_permission',
    'Marca permiso como granted/denied.',
    {
      type: 'object',
      properties: { ugcId: str('ID'), granted: { type: 'boolean' }, note: str('') },
      required: ['ugcId', 'granted'],
    },
    async (input, _brand) =>
      markPermission(String(input.ugcId), Boolean(input.granted), input.note as string | undefined),
  ),

  tool(
    'cm_ugc_generate_caption',
    'Genera caption para repost con crédito.',
    {
      type: 'object',
      properties: { ugcId: str('ID') },
      required: ['ugcId'],
    },
    async (input, brand) => ({ caption: await generateRepostCaption(String(input.ugcId), brand) }),
  ),

  tool(
    'cm_ugc_mark_reposted',
    'Marca UGC como reposted.',
    {
      type: 'object',
      properties: { ugcId: str('ID'), repostedPostId: str('ID nuevo post') },
      required: ['ugcId', 'repostedPostId'],
    },
    async (input, _brand) => markReposted(String(input.ugcId), String(input.repostedPostId)),
  ),

  tool(
    'cm_ugc_send_thanks',
    'Envía DM de agradecimiento post-repost.',
    {
      type: 'object',
      properties: { ugcId: str('ID') },
      required: ['ugcId'],
    },
    async (input, brand) => ({ message: await sendThankYou(String(input.ugcId), brand) }),
  ),

  tool(
    'cm_ugc_list',
    'Lista UGC.',
    {
      type: 'object',
      properties: {
        stage: str(''),
        ugcType: str(''),
        minQuality: { type: 'number' },
      },
    },
    async (input, _brand) =>
      listUGC({
        stage: input.stage as NonNullable<Parameters<typeof listUGC>[0]>['stage'],
        ugcType: input.ugcType as NonNullable<Parameters<typeof listUGC>[0]>['ugcType'],
        minQuality: input.minQuality as number | undefined,
      }),
  ),

  tool('cm_ugc_snapshot', 'Snapshot UGC.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getUGCSnapshot(),
  ),

  tool(
    'cm_ugc_get',
    'Devuelve UGC específico.',
    {
      type: 'object',
      properties: { ugcId: str('ID') },
      required: ['ugcId'],
    },
    async (input, _brand) => getUGC(String(input.ugcId)),
  ),

  // ── Mention Tracker ─────────────────────────────────────────────────────────

  tool(
    'cm_mention_ingest',
    'Registra mención detectada.',
    {
      type: 'object',
      properties: {
        type: str('story-mention|post-tag|comment-mention|caption-mention|hashtag-use|bio-mention'),
        authorUsername: str(''),
        authorFollowerCount: { type: 'number' },
        context: str(''),
        postUrl: str(''),
        mediaUrl: str(''),
      },
      required: ['type', 'authorUsername', 'context'],
    },
    async (input, _brand) =>
      ingestMention({
        type: input.type as Parameters<typeof ingestMention>[0]['type'],
        authorUsername: String(input.authorUsername),
        authorFollowerCount: input.authorFollowerCount as number | undefined,
        context: String(input.context),
        postUrl: input.postUrl as string | undefined,
        mediaUrl: input.mediaUrl as string | undefined,
      }),
  ),

  tool(
    'cm_mention_acknowledge',
    'Acknowledge una mención.',
    {
      type: 'object',
      properties: { mentionId: str('ID'), note: str('') },
      required: ['mentionId'],
    },
    async (input, _brand) => acknowledgeMention(String(input.mentionId), input.note as string | undefined),
  ),

  tool(
    'cm_mention_list',
    'Lista menciones.',
    {
      type: 'object',
      properties: {
        type: str(''),
        sentiment: str('positive|neutral|negative|critical'),
        importance: str('critical|high|medium|low'),
        unacknowledged: { type: 'boolean' },
      },
    },
    async (input, _brand) =>
      listMentions({
        type: input.type as NonNullable<Parameters<typeof listMentions>[0]>['type'],
        sentiment: input.sentiment as NonNullable<Parameters<typeof listMentions>[0]>['sentiment'],
        importance: input.importance as NonNullable<Parameters<typeof listMentions>[0]>['importance'],
        unacknowledged: input.unacknowledged as boolean | undefined,
      }),
  ),

  tool('cm_mention_snapshot', 'Snapshot de menciones.', { type: 'object', properties: {} }, async (_input, brand) =>
    getMentionsSnapshot(brand),
  ),

  tool(
    'cm_mention_get',
    'Devuelve mención.',
    {
      type: 'object',
      properties: { mentionId: str('ID') },
      required: ['mentionId'],
    },
    async (input, _brand) => getMention(String(input.mentionId)),
  ),

  // ── Poll & Quiz Engine ──────────────────────────────────────────────────────

  tool(
    'cm_poll_generate',
    'Genera poll/quiz inteligente para stories.',
    {
      type: 'object',
      properties: {
        type: str('binary|multi-choice|quiz|emoji-slider|open-question'),
        purpose: str('market-research|engagement|product-validation|preference-discovery|educational|fun|feedback'),
        topic: str(''),
        context: str(''),
        customOptions: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'purpose', 'topic'],
    },
    async (input, brand) =>
      generatePoll({
        type: input.type as Parameters<typeof generatePoll>[0]['type'],
        purpose: input.purpose as Parameters<typeof generatePoll>[0]['purpose'],
        topic: String(input.topic),
        brand,
        context: input.context as string | undefined,
        customOptions: input.customOptions as string[] | undefined,
      }),
  ),

  tool(
    'cm_poll_suggest_from_context',
    'Sugiere y genera el poll apropiado para un contexto.',
    {
      type: 'object',
      properties: { context: str('') },
      required: ['context'],
    },
    async (input, brand) => suggestPollFromContext(String(input.context), brand),
  ),

  tool(
    'cm_poll_record_results',
    'Registra resultados de poll.',
    {
      type: 'object',
      properties: {
        pollId: str('ID'),
        totalVotes: { type: 'number' },
        perOption: { type: 'array' },
        avgSliderValue: { type: 'number' },
        openAnswers: { type: 'array', items: { type: 'string' } },
        completionRate: { type: 'number' },
      },
      required: ['pollId', 'totalVotes'],
    },
    async (input, _brand) =>
      recordPollResults(String(input.pollId), {
        totalVotes: Number(input.totalVotes),
        perOption: (input.perOption as number[]) ?? [],
        avgSliderValue: input.avgSliderValue as number | undefined,
        openAnswers: input.openAnswers as string[] | undefined,
        completionRate: input.completionRate as number | undefined,
      }),
  ),

  tool(
    'cm_poll_analyze',
    'Analiza resultados de poll y extrae insights.',
    {
      type: 'object',
      properties: { pollId: str('ID') },
      required: ['pollId'],
    },
    async (input, _brand) => analyzePollResults(String(input.pollId)),
  ),

  tool(
    'cm_poll_list',
    'Lista polls.',
    {
      type: 'object',
      properties: {
        type: str(''),
        purpose: str(''),
        hasResults: { type: 'boolean' },
      },
    },
    async (input, _brand) =>
      listPolls({
        type: input.type as NonNullable<Parameters<typeof listPolls>[0]>['type'],
        purpose: input.purpose as NonNullable<Parameters<typeof listPolls>[0]>['purpose'],
        hasResults: input.hasResults as boolean | undefined,
      }),
  ),

  tool(
    'cm_poll_get',
    'Devuelve poll específico.',
    {
      type: 'object',
      properties: { pollId: str('ID') },
      required: ['pollId'],
    },
    async (input, _brand) => getPoll(String(input.pollId)),
  ),

  tool('cm_poll_snapshot', 'Snapshot de polls.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getPollSnapshot(),
  ),

  tool(
    'cm_poll_templates',
    'Templates pre-armados de polls efectivos.',
    { type: 'object', properties: {} },
    async (_input, _brand) => POLL_TEMPLATES,
  ),

  // ── Fan Recognition ─────────────────────────────────────────────────────────

  tool(
    'cm_fan_refresh_profile',
    'Refresca perfil de fan (tier y engagement score).',
    {
      type: 'object',
      properties: { username: str('') },
      required: ['username'],
    },
    async (input, _brand) => refreshFanProfile(String(input.username)),
  ),

  tool(
    'cm_fan_enqueue_new_follower',
    'Agrega nuevo seguidor a queue de bienvenidas.',
    {
      type: 'object',
      properties: { username: str('') },
      required: ['username'],
    },
    async (input, _brand) => {
      enqueueNewFollower(String(input.username));
      return { ok: true };
    },
  ),

  tool(
    'cm_fan_send_welcome',
    'Envía DM de bienvenida personalizada.',
    {
      type: 'object',
      properties: { username: str('') },
      required: ['username'],
    },
    async (input, brand) => sendWelcomeDM(String(input.username), brand),
  ),

  tool(
    'cm_fan_process_welcomes',
    'Procesa queue de nuevos seguidores.',
    {
      type: 'object',
      properties: { maxProcess: { type: 'number' } },
    },
    async (input, _brand) => processNewFollowersQueue(Number(input.maxProcess ?? 5)),
  ),

  tool(
    'cm_fan_refresh_all',
    'Rebuild todos los perfiles de fans desde el histórico.',
    { type: 'object', properties: {} },
    async (_input, _brand) => refreshAllFanProfiles(),
  ),

  tool(
    'cm_fan_top',
    'Top fans por engagement score.',
    {
      type: 'object',
      properties: {
        tier: str('casual|regular|super-fan|embajador'),
        limit: { type: 'number' },
      },
    },
    async (input, _brand) => getTopFans(input.tier as Parameters<typeof getTopFans>[0], Number(input.limit ?? 20)),
  ),

  tool(
    'cm_fan_grant_reward',
    'Otorga premio a un fan.',
    {
      type: 'object',
      properties: {
        username: str(''),
        type: str('feature|shoutout|discount|gift|exclusive-content'),
        note: str(''),
      },
      required: ['username', 'type', 'note'],
    },
    async (input, _brand) =>
      grantReward(String(input.username), {
        type: input.type as 'feature' | 'shoutout' | 'discount' | 'gift' | 'exclusive-content',
        note: String(input.note),
      }),
  ),

  tool(
    'cm_fan_of_the_week',
    'Propone fan de la semana con shoutout.',
    { type: 'object', properties: {} },
    async (_input, brand) => proposeFanOfTheWeek(brand),
  ),

  tool(
    'cm_fan_churning',
    'Detecta fans que se enfriaron.',
    {
      type: 'object',
      properties: { daysInactive: { type: 'number' } },
    },
    async (input, _brand) => detectChurningFans(Number(input.daysInactive ?? 30)),
  ),

  tool(
    'cm_fan_send_reengagement',
    'DM de re-engagement a un fan churning.',
    {
      type: 'object',
      properties: { username: str('') },
      required: ['username'],
    },
    async (input, brand) => sendReengagementDM(String(input.username), brand),
  ),

  tool('cm_fan_snapshot', 'Snapshot de fans.', { type: 'object', properties: {} }, async (_input, _brand) =>
    getFanSnapshot(),
  ),

  tool(
    'cm_fan_get',
    'Devuelve perfil de fan.',
    {
      type: 'object',
      properties: { username: str('') },
      required: ['username'],
    },
    async (input, _brand) => getFan(String(input.username)),
  ),

  // ── App Launcher (Computer Use) ─────────────────────────────────────────────

  tool(
    'cu_launch_app',
    'Abre una app de escritorio programáticamente (chrome, edge, firefox, brave, canva-desktop, photoshop, figma-desktop, paint, explorer, notepad).',
    {
      type: 'object',
      properties: {
        app: str('chrome|edge|firefox|brave|canva-desktop|photoshop|figma-desktop|paint|explorer|notepad'),
        url: str('URL si es navegador'),
        filePath: str('Archivo a abrir'),
        newWindow: { type: 'boolean' },
        fullscreen: { type: 'boolean' },
        waitForReadyMs: { type: 'number' },
      },
      required: ['app'],
    },
    async (input, _brand) =>
      launchApp(input.app as Parameters<typeof launchApp>[0], {
        url: input.url as string | undefined,
        filePath: input.filePath as string | undefined,
        newWindow: input.newWindow as boolean | undefined,
        fullscreen: input.fullscreen as boolean | undefined,
        waitForReadyMs: input.waitForReadyMs as number | undefined,
      }),
  ),

  tool(
    'cu_close_app',
    'Cierra una aplicación.',
    {
      type: 'object',
      properties: { app: str('Nombre app') },
      required: ['app'],
    },
    async (input, _brand) => closeApp(input.app as Parameters<typeof closeApp>[0]),
  ),

  tool(
    'cu_open_browser_url',
    'Abre un navegador en una URL específica.',
    {
      type: 'object',
      properties: {
        url: str('URL'),
        browser: str('chrome|edge|firefox|brave (default chrome)'),
      },
      required: ['url'],
    },
    async (input, _brand) =>
      openBrowserWithUrl(String(input.url), (input.browser as 'chrome' | 'edge' | 'firefox' | 'brave') ?? 'chrome'),
  ),

  tool(
    'cu_open_canva',
    'Abre Canva en el navegador (opcionalmente con URL de template).',
    {
      type: 'object',
      properties: {
        templateUrl: str('URL del template (opcional)'),
        browser: str('chrome|edge'),
      },
    },
    async (input, _brand) =>
      openCanva(input.templateUrl as string | undefined, (input.browser as 'chrome' | 'edge') ?? 'chrome'),
  ),

  tool(
    'cu_open_figma',
    'Abre Figma en el navegador.',
    {
      type: 'object',
      properties: { designUrl: str('URL del diseño (opcional)') },
    },
    async (input, _brand) => openFigma(input.designUrl as string | undefined),
  ),

  tool(
    'cu_open_photopea',
    'Abre Photopea (editor tipo Photoshop online).',
    { type: 'object', properties: {} },
    async (_input, _brand) => openPhotopea(),
  ),

  tool(
    'cu_open_instagram_web',
    'Abre Instagram web en el navegador.',
    { type: 'object', properties: {} },
    async (_input, _brand) => openInstagramWeb(),
  ),

  tool(
    'cu_ensure_app_running',
    'Asegura que una app esté corriendo. Si no lo está, la lanza.',
    {
      type: 'object',
      properties: {
        app: str('Nombre'),
        url: str(''),
      },
      required: ['app'],
    },
    async (input, _brand) =>
      ensureAppRunning(input.app as Parameters<typeof ensureAppRunning>[0], { url: input.url as string | undefined }),
  ),

  tool(
    'cu_get_app_status',
    'Devuelve si una app está instalada y/o corriendo.',
    {
      type: 'object',
      properties: { app: str('Nombre') },
      required: ['app'],
    },
    async (input, _brand) => getAppStatus(input.app as Parameters<typeof getAppStatus>[0]),
  ),

  tool(
    'cu_list_installed_apps',
    'Lista qué apps están instaladas y/o corriendo en el sistema.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listInstalledApps(),
  ),

  tool(
    'cu_focus_app',
    'Trae al frente la ventana de una app.',
    {
      type: 'object',
      properties: { app: str('Nombre') },
      required: ['app'],
    },
    async (input, _brand) => focusApp(input.app as Parameters<typeof focusApp>[0]),
  ),

  // ── Canva Studio ────────────────────────────────────────────────────────────

  tool(
    'cu_canva_workflow',
    'Ejecuta un workflow completo en Canva: abre, busca template, customiza, exporta.',
    {
      type: 'object',
      properties: {
        designType: str(
          'instagram-post|instagram-story|instagram-reel-cover|instagram-carousel|facebook-post|linkedin-post|youtube-thumbnail|pinterest-pin|logo|flyer|custom',
        ),
        searchQuery: str('Query para buscar template'),
        templateId: str('ID Canva del template (opcional)'),
        textEdits: { type: 'array', description: '[{findText, replaceWith, styleHints}]' },
        imageReplaces: { type: 'array' },
        applyBrandColors: { type: 'boolean' },
        applyBrandFont: { type: 'boolean' },
        customInstructions: str(''),
        exportFormat: str('png|jpg|pdf|mp4|gif'),
        exportQuality: str('standard|high|print'),
      },
      required: ['designType'],
    },
    async (input, brand) =>
      runCanvaWorkflow(
        brand,
        {
          designType: input.designType as Parameters<typeof runCanvaWorkflow>[1]['designType'],
          searchQuery: input.searchQuery as string | undefined,
          id: input.templateId as string | undefined,
        },
        {
          textEdits: (input.textEdits as Parameters<typeof runCanvaWorkflow>[2]['textEdits']) ?? [],
          imageReplaces: (input.imageReplaces as Parameters<typeof runCanvaWorkflow>[2]['imageReplaces']) ?? [],
          applyBrandColors: input.applyBrandColors as boolean | undefined,
          applyBrandFont: input.applyBrandFont as boolean | undefined,
          customInstructions: input.customInstructions as string | undefined,
        },
        {
          format: (input.exportFormat as 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif') ?? 'png',
          quality: (input.exportQuality as 'standard' | 'high' | 'print') ?? 'high',
        },
      ),
  ),

  tool(
    'cu_canva_create_post',
    'Crea un post de Instagram desde Canva con texto principal y CTA.',
    {
      type: 'object',
      properties: {
        topic: str(''),
        mainText: str(''),
        cta: str(''),
      },
      required: ['topic', 'mainText', 'cta'],
    },
    async (input, brand) => canvaCreateIGPost(brand, String(input.topic), String(input.mainText), String(input.cta)),
  ),

  tool(
    'cu_canva_create_story',
    'Crea una story de Instagram desde Canva.',
    {
      type: 'object',
      properties: {
        topic: str(''),
        hookText: str(''),
        stickerCTA: str(''),
      },
      required: ['topic', 'hookText', 'stickerCTA'],
    },
    async (input, brand) =>
      canvaCreateIGStory(brand, String(input.topic), String(input.hookText), String(input.stickerCTA)),
  ),

  tool(
    'cu_canva_create_carousel',
    'Crea un carrusel completo en Canva (N slides coherentes).',
    {
      type: 'object',
      properties: {
        slides: { type: 'array', description: '[{title, body, visualHint}]' },
        baseTemplate: str(''),
      },
      required: ['slides'],
    },
    async (input, brand) =>
      canvaCreateFullCarousel(brand, {
        slides: input.slides as Parameters<typeof canvaCreateFullCarousel>[1]['slides'],
        baseTemplate: input.baseTemplate as string | undefined,
      }),
  ),

  tool(
    'cu_canva_create_slide',
    'Crea una slide individual del carrusel.',
    {
      type: 'object',
      properties: {
        slideNumber: { type: 'number' },
        totalSlides: { type: 'number' },
        title: str(''),
        body: str(''),
      },
      required: ['slideNumber', 'totalSlides', 'title', 'body'],
    },
    async (input, brand) =>
      canvaCreateSlide(
        brand,
        Number(input.slideNumber),
        Number(input.totalSlides),
        String(input.title),
        String(input.body),
        Number(input.slideNumber) === 1,
        Number(input.slideNumber) === Number(input.totalSlides),
      ),
  ),

  tool(
    'cu_canva_resume',
    'Continúa una sesión activa de Canva con una nueva instrucción.',
    {
      type: 'object',
      properties: { instruction: str('Qué hacer ahora') },
      required: ['instruction'],
    },
    async (input, brand) => resumeCanvaSession(brand, String(input.instruction)),
  ),

  // ── Design Tools genéricos ──────────────────────────────────────────────────

  tool(
    'cu_design_tool_workflow',
    'Ejecuta un workflow en cualquier design tool (Figma, Photopea, Adobe Express, Crello, Visme, Kapwing, Photoshop-web).',
    {
      type: 'object',
      properties: {
        tool: str('figma|photopea|adobe-express|crello|visme|kapwing|photoshop-web'),
        task: str('Descripción libre de qué hacer'),
        exportFormat: str('png|jpg|pdf|mp4|gif|svg|webp'),
        customInstructions: str(''),
      },
      required: ['tool', 'task'],
    },
    async (input, brand) =>
      runDesignToolWorkflow(brand, {
        tool: input.tool as Parameters<typeof runDesignToolWorkflow>[1]['tool'],
        task: String(input.task),
        exportFormat: input.exportFormat as Parameters<typeof runDesignToolWorkflow>[1]['exportFormat'],
        customInstructions: input.customInstructions as string | undefined,
      }),
  ),

  tool(
    'cu_design_tool_recommend',
    'Recomienda qué design tool usar para una tarea específica.',
    {
      type: 'object',
      properties: {
        task: str(''),
        hasAdobeSubscription: { type: 'boolean' },
      },
      required: ['task'],
    },
    async (input, _brand) => ({
      recommended: recommendToolForTask(String(input.task), {
        hasAdobeSubscription: input.hasAdobeSubscription as boolean | undefined,
      }),
    }),
  ),

  tool(
    'cu_design_tools_list',
    'Lista todos los design tools soportados con sus capacidades.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listDesignTools(),
  ),

  tool(
    'cu_design_tool_info',
    'Info detallada de un design tool específico.',
    {
      type: 'object',
      properties: { tool: str('Nombre') },
      required: ['tool'],
    },
    async (input, _brand) =>
      DESIGN_TOOLS_REGISTRY[input.tool as keyof typeof DESIGN_TOOLS_REGISTRY] ?? { error: 'tool no soportado' },
  ),

  // ── File Bridge ─────────────────────────────────────────────────────────────

  tool(
    'cu_detect_recent_download',
    'Detecta el archivo más reciente descargado en una carpeta.',
    {
      type: 'object',
      properties: {
        folder: str('Default ~/Downloads'),
        extension: str('png|jpg|jpeg|gif|mp4|pdf|webp|svg|mov'),
        maxAgeSeconds: { type: 'number' },
        filenameContains: str(''),
      },
    },
    async (input, _brand) => ({
      path: await detectRecentDownload({
        folder: input.folder as string | undefined,
        extension: input.extension as Parameters<typeof detectRecentDownload>[0] extends infer X
          ? X extends { extension?: infer E }
            ? E
            : never
          : never,
        maxAgeSeconds: input.maxAgeSeconds as number | undefined,
        filenameContains: input.filenameContains as string | undefined,
      }),
    }),
  ),

  tool(
    'cu_list_recent_downloads',
    'Lista archivos descargados recientes con metadata.',
    {
      type: 'object',
      properties: {
        folder: str(''),
        extension: str(''),
        maxAgeSeconds: { type: 'number' },
      },
    },
    async (input, _brand) =>
      listRecentDownloads({
        folder: input.folder as string | undefined,
        extension: input.extension as Parameters<typeof listRecentDownloads>[0] extends infer X
          ? X extends { extension?: infer E }
            ? E
            : never
          : never,
        maxAgeSeconds: input.maxAgeSeconds as number | undefined,
      }),
  ),

  tool(
    'cu_wait_for_new_download',
    'Espera activamente hasta que aparezca un archivo nuevo (polling).',
    {
      type: 'object',
      properties: {
        folder: str(''),
        extension: str(''),
        timeoutSeconds: { type: 'number' },
      },
    },
    async (input, _brand) =>
      waitForNewDownload({
        folder: input.folder as string | undefined,
        extension: input.extension as Parameters<typeof waitForNewDownload>[0] extends infer X
          ? X extends { extension?: infer E }
            ? E
            : never
          : never,
        timeoutSeconds: input.timeoutSeconds as number | undefined,
      }),
  ),

  tool(
    'cu_capture_latest_download',
    'Captura el último download y lo registra como asset estable.',
    {
      type: 'object',
      properties: {
        extension: str(''),
        intendedFor: str(
          'instagram-post|instagram-story|instagram-reel|instagram-carousel-slide|youtube-thumbnail|general',
        ),
        waitSeconds: { type: 'number' },
      },
    },
    async (input, _brand) =>
      captureLatestDownload({
        extension: input.extension as Parameters<typeof captureLatestDownload>[0] extends infer X
          ? X extends { extension?: infer E }
            ? E
            : never
          : never,
        intendedFor: input.intendedFor as Parameters<typeof captureLatestDownload>[0] extends infer X
          ? X extends { intendedFor?: infer I }
            ? I
            : never
          : never,
        waitSeconds: input.waitSeconds as number | undefined,
      }),
  ),

  tool(
    'cu_register_asset',
    'Registra un archivo como asset estable (lo mueve a data/assets/designs).',
    {
      type: 'object',
      properties: {
        filePath: str('Ruta del archivo'),
        intendedFor: str(''),
        keepOriginal: { type: 'boolean' },
      },
      required: ['filePath'],
    },
    async (input, _brand) =>
      registerAsset(String(input.filePath), {
        intendedFor: input.intendedFor as Parameters<typeof registerAsset>[1] extends infer X
          ? X extends { intendedFor?: infer I }
            ? I
            : never
          : never,
        keepOriginal: input.keepOriginal as boolean | undefined,
      }),
  ),

  tool(
    'cu_validate_asset',
    'Valida que un asset cumple specs (formato, tamaño) para Instagram.',
    {
      type: 'object',
      properties: {
        assetId: str(''),
        storedPath: str(''),
        extension: str(''),
        sizeKB: { type: 'number' },
        source: str(''),
        intendedFor: str(''),
      },
      required: ['assetId', 'storedPath', 'extension', 'sizeKB'],
    },
    async (input, _brand) =>
      validateAsset(
        {
          id: String(input.assetId),
          originalPath: String(input.storedPath),
          storedPath: String(input.storedPath),
          filename: String(input.storedPath).split(/[/\\]/).pop() ?? '',
          extension: String(input.extension),
          sizeKB: Number(input.sizeKB),
          source: (input.source as 'canva' | 'figma' | 'photopea' | 'photoshop' | 'manual' | 'unknown') ?? 'unknown',
          intendedFor: input.intendedFor as Parameters<typeof validateAsset>[0]['intendedFor'],
          registeredAt: new Date().toISOString(),
        },
        input.intendedFor as Parameters<typeof validateAsset>[1],
      ),
  ),

  tool(
    'cu_list_assets',
    'Lista assets registrados.',
    {
      type: 'object',
      properties: {
        source: str(''),
        intendedFor: str(''),
      },
    },
    async (input, _brand) =>
      listRegisteredAssets({
        source: input.source as Parameters<typeof listRegisteredAssets>[0] extends infer X
          ? X extends { source?: infer S }
            ? S
            : never
          : never,
        intendedFor: input.intendedFor as Parameters<typeof listRegisteredAssets>[0] extends infer X
          ? X extends { intendedFor?: infer I }
            ? I
            : never
          : never,
      }),
  ),

  tool(
    'cu_file_bridge_snapshot',
    'Snapshot del file bridge: carpetas vigiladas, assets registrados, downloads recientes.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getFileBridgeSnapshot(),
  ),

  // ── Desktop Workflows (orquestadores end-to-end) ────────────────────────────

  tool(
    'cu_canva_to_instagram',
    'Pipeline completo Canva→Instagram: abrir Canva → diseñar con cursor → exportar → publicar en IG. El usuario ve todo en tiempo real.',
    {
      type: 'object',
      properties: {
        topic: str(''),
        designIntent: str('educar|inspirar|vender|entretener|reflexionar'),
        postType: str('feed-post|reel|story|carousel'),
        publishMethod: str('computer-use|upload-post-api|preview-only'),
        customCaption: str(''),
        customHashtags: { type: 'array', items: { type: 'string' } },
        scheduleAt: str(''),
        generateCaption: { type: 'boolean' },
      },
      required: ['topic', 'designIntent', 'postType'],
    },
    async (input, brand) =>
      runCanvaToInstagram(brand, {
        topic: String(input.topic),
        designIntent: input.designIntent as Parameters<typeof runCanvaToInstagram>[1]['designIntent'],
        postType: input.postType as Parameters<typeof runCanvaToInstagram>[1]['postType'],
        publishMethod: input.publishMethod as Parameters<typeof runCanvaToInstagram>[1]['publishMethod'],
        customCaption: input.customCaption as string | undefined,
        customHashtags: input.customHashtags as string[] | undefined,
        scheduleAt: input.scheduleAt as string | undefined,
        generateCaption: input.generateCaption as boolean | undefined,
      }),
  ),

  tool(
    'cu_design_to_instagram',
    'Pipeline diseño→Instagram con cualquier herramienta (figma, photopea, etc.).',
    {
      type: 'object',
      properties: {
        tool: str('figma|photopea|adobe-express|crello|visme|kapwing'),
        task: str(''),
        postType: str('feed-post|reel|story|carousel'),
        publishMethod: str(''),
        customCaption: str(''),
      },
      required: ['tool', 'task', 'postType'],
    },
    async (input, brand) =>
      runDesignToInstagram(brand, {
        tool: input.tool as Parameters<typeof runDesignToInstagram>[1]['tool'],
        task: String(input.task),
        postType: input.postType as Parameters<typeof runDesignToInstagram>[1]['postType'],
        publishMethod: input.publishMethod as Parameters<typeof runDesignToInstagram>[1]['publishMethod'],
        customCaption: input.customCaption as string | undefined,
      }),
  ),

  tool(
    'cu_canva_preview_only',
    'Pipeline Canva pero sin publicar — sólo deja el diseño + caption listo para revisar.',
    {
      type: 'object',
      properties: {
        topic: str(''),
        designIntent: str(''),
        postType: str(''),
      },
      required: ['topic', 'designIntent', 'postType'],
    },
    async (input, brand) =>
      runCanvaPreviewOnly(brand, {
        topic: String(input.topic),
        designIntent: input.designIntent as Parameters<typeof runCanvaPreviewOnly>[1]['designIntent'],
        postType: input.postType as Parameters<typeof runCanvaPreviewOnly>[1]['postType'],
      }),
  ),

  tool(
    'cu_batch_production',
    'Produce N piezas en lote (cada una Canva→IG) con stagger horario.',
    {
      type: 'object',
      properties: {
        pieces: { type: 'array', description: '[{topic, postType, designIntent}]' },
        staggerHours: { type: 'number' },
        publishMethod: str(''),
      },
      required: ['pieces'],
    },
    async (input, brand) =>
      runBatchProduction(brand, input.pieces as Parameters<typeof runBatchProduction>[1], {
        staggerHours: input.staggerHours as number | undefined,
        publishMethod: input.publishMethod as Parameters<typeof runBatchProduction>[2] extends infer X
          ? X extends { publishMethod?: infer P }
            ? P
            : never
          : never,
      }),
  ),

  tool(
    'cu_desktop_workflows_status',
    'Status del subsistema de desktop workflows (qué capabilities están disponibles).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getDesktopWorkflowsStatus(),
  ),

  tool(
    'cu_find_latest_design',
    'Busca el archivo de diseño más reciente en ~/Downloads.',
    {
      type: 'object',
      properties: { folder: str('Opcional') },
    },
    async (input, _brand) => ({ path: await findLatestDesignFile(input.folder as string | undefined) }),
  ),

  // ── Visual Replay Log ───────────────────────────────────────────────────────

  tool(
    'cu_replay_start',
    'Inicia sesión de replay log para registrar cada paso con screenshots.',
    {
      type: 'object',
      properties: {
        workflowName: str(''),
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['workflowName'],
    },
    async (input, brand) => startReplaySession(String(input.workflowName), brand.name, (input.tags as string[]) ?? []),
  ),

  tool(
    'cu_replay_end',
    'Cierra sesión de replay con outcome final.',
    {
      type: 'object',
      properties: {
        sessionId: str(''),
        outcome: str('success|partial|failed|cancelled'),
        summary: str(''),
      },
      required: ['sessionId', 'outcome'],
    },
    async (input, _brand) =>
      endReplaySession(
        String(input.sessionId),
        input.outcome as Parameters<typeof endReplaySession>[1],
        input.summary as string | undefined,
      ),
  ),

  tool(
    'cu_replay_log_step',
    'Registra un paso en la sesión de replay con captura de pantalla opcional.',
    {
      type: 'object',
      properties: {
        sessionId: str(''),
        actionType: str(
          'launch-app|navigate-url|click|type|scroll|drag|screenshot|wait|detect-element|decision|export-file|upload-file|verify|error',
        ),
        description: str(''),
        rationale: str(''),
        captureScreenshot: { type: 'boolean' },
        ok: { type: 'boolean' },
      },
      required: ['sessionId', 'actionType', 'description'],
    },
    async (input, _brand) =>
      replayLogStep({
        sessionId: String(input.sessionId),
        actionType: input.actionType as Parameters<typeof replayLogStep>[0]['actionType'],
        description: String(input.description),
        rationale: input.rationale as string | undefined,
        captureScreenshot: input.captureScreenshot as boolean | undefined,
        ok: input.ok as boolean | undefined,
      }),
  ),

  tool(
    'cu_replay_get_session',
    'Devuelve la sesión de replay completa con todos sus pasos.',
    {
      type: 'object',
      properties: { sessionId: str('') },
      required: ['sessionId'],
    },
    async (input, _brand) => getReplaySession(String(input.sessionId)),
  ),

  tool(
    'cu_replay_list',
    'Lista las sesiones de replay recientes.',
    {
      type: 'object',
      properties: { limit: { type: 'number' } },
    },
    async (input, _brand) => listReplaySessions(Number(input.limit ?? 30)),
  ),

  tool(
    'cu_replay_search',
    'Busca sesiones de replay por filtros.',
    {
      type: 'object',
      properties: {
        workflowName: str(''),
        outcome: str('in-progress|success|partial|failed|cancelled'),
        fromDate: str(''),
      },
    },
    async (input, brand) =>
      searchReplays({
        workflowName: input.workflowName as string | undefined,
        brandName: brand.name,
        outcome: input.outcome as Parameters<typeof searchReplays>[0] extends infer X
          ? X extends { outcome?: infer O }
            ? O
            : never
          : never,
        fromDate: input.fromDate as string | undefined,
      }),
  ),

  tool(
    'cu_replay_narrative',
    'Genera narrativa en markdown de una sesión de replay.',
    {
      type: 'object',
      properties: { sessionId: str('') },
      required: ['sessionId'],
    },
    async (input, _brand) => ({ narrative: replayGenerateNarrative(String(input.sessionId)) }),
  ),

  tool(
    'cu_replay_stats',
    'Estadísticas globales del sistema de replay.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getReplayStats(),
  ),

  tool(
    'cu_replay_prune',
    'Elimina sesiones de replay viejas del índice.',
    {
      type: 'object',
      properties: { maxAgeDays: { type: 'number' } },
    },
    async (input, _brand) => ({ pruned: pruneOldReplays(Number(input.maxAgeDays ?? 30)) }),
  ),

  // ── Chrome Profile Manager (cuentas dedicadas) ──────────────────────────────

  tool(
    'cu_profile_create',
    'Crea un perfil de Chrome dedicado a una cuenta/marca con cookies y sesiones persistentes.',
    {
      type: 'object',
      properties: {
        name: str('Nombre legible del perfil'),
        brandName: str('Marca asociada (opcional)'),
        defaultBrowser: str('chrome|edge|brave|chromium (default chrome)'),
        pinnedTabs: { type: 'array', items: { type: 'string' } },
        loadFeediaExtension: { type: 'boolean', description: 'Cargar extensión visual de FeedIA' },
      },
      required: ['name'],
    },
    async (input, _brand) =>
      cpmCreateProfile({
        name: String(input.name),
        brandName: input.brandName as string | undefined,
        defaultBrowser: input.defaultBrowser as Parameters<typeof cpmCreateProfile>[0]['defaultBrowser'],
        pinnedTabs: input.pinnedTabs as string[] | undefined,
        loadFeediaExtension: input.loadFeediaExtension as boolean | undefined,
      }),
  ),

  tool(
    'cu_profile_get',
    'Devuelve un perfil de Chrome específico.',
    {
      type: 'object',
      properties: { profileId: str('ID del perfil') },
      required: ['profileId'],
    },
    async (input, _brand) => cpmGetProfile(String(input.profileId)),
  ),

  tool(
    'cu_profile_find_by_brand',
    'Busca el perfil de Chrome asociado a una marca.',
    {
      type: 'object',
      properties: { brandName: str('') },
      required: ['brandName'],
    },
    async (input, _brand) => cpmFindByBrand(String(input.brandName)),
  ),

  tool(
    'cu_profile_find_by_name',
    'Busca un perfil por nombre.',
    {
      type: 'object',
      properties: { name: str('') },
      required: ['name'],
    },
    async (input, _brand) => cpmFindByName(String(input.name)),
  ),

  tool(
    'cu_profile_list',
    'Lista todos los perfiles de Chrome.',
    { type: 'object', properties: {} },
    async (_input, _brand) => cpmListProfiles(),
  ),

  tool(
    'cu_profile_set_default',
    'Define el perfil default para abrir cuando no se especifica.',
    {
      type: 'object',
      properties: { profileId: str('') },
      required: ['profileId'],
    },
    async (input, _brand) => ({ ok: cpmSetDefault(String(input.profileId)) }),
  ),

  tool(
    'cu_profile_get_default',
    'Devuelve el perfil default actual.',
    { type: 'object', properties: {} },
    async (_input, _brand) => cpmGetDefault(),
  ),

  tool(
    'cu_profile_mark_login',
    'Marca un servicio como logueado en un perfil (canva, instagram, figma, etc.).',
    {
      type: 'object',
      properties: { profileId: str(''), service: str('') },
      required: ['profileId', 'service'],
    },
    async (input, _brand) => cpmMarkLogin(String(input.profileId), String(input.service)),
  ),

  tool(
    'cu_profile_update',
    'Actualiza propiedades de un perfil (name, brandName, pinnedTabs).',
    {
      type: 'object',
      properties: {
        profileId: str(''),
        name: str(''),
        brandName: str(''),
        pinnedTabs: { type: 'array', items: { type: 'string' } },
      },
      required: ['profileId'],
    },
    async (input, _brand) =>
      cpmUpdate(String(input.profileId), {
        name: input.name as string | undefined,
        brandName: input.brandName as string | undefined,
        pinnedTabs: input.pinnedTabs as string[] | undefined,
      }),
  ),

  tool(
    'cu_profile_delete',
    'Elimina un perfil. Si removeData=true, borra también la carpeta de datos.',
    {
      type: 'object',
      properties: { profileId: str(''), removeData: { type: 'boolean' } },
      required: ['profileId'],
    },
    async (input, _brand) => ({ ok: cpmDelete(String(input.profileId), Boolean(input.removeData ?? false)) }),
  ),

  tool(
    'cu_profile_launch',
    'Lanza Chrome con un perfil específico. Las sesiones de Canva/IG/Figma están persistentes.',
    {
      type: 'object',
      properties: {
        profileId: str(''),
        url: str(''),
        openPinnedTabs: { type: 'boolean' },
        newWindow: { type: 'boolean' },
        loadExtensions: { type: 'boolean' },
        incognito: { type: 'boolean' },
      },
      required: ['profileId'],
    },
    async (input, _brand) =>
      cpmLaunch(String(input.profileId), {
        url: input.url as string | undefined,
        openPinnedTabs: input.openPinnedTabs as boolean | undefined,
        newWindow: input.newWindow as boolean | undefined,
        loadExtensions: input.loadExtensions as boolean | undefined,
        incognito: input.incognito as boolean | undefined,
      }),
  ),

  tool(
    'cu_profile_launch_by_brand',
    'Lanza Chrome con el perfil de una marca específica.',
    {
      type: 'object',
      properties: { brandName: str(''), url: str('') },
      required: ['brandName'],
    },
    async (input, _brand) => cpmLaunchByBrand(String(input.brandName), input.url as string | undefined),
  ),

  tool(
    'cu_profile_ensure_for_brand',
    'Asegura que la marca tenga un perfil de Chrome (lo crea si no existe).',
    {
      type: 'object',
      properties: { brandName: str('') },
      required: ['brandName'],
    },
    async (input, _brand) => ensureProfileForBrand(String(input.brandName)),
  ),

  tool(
    'cu_profile_ensure_extension',
    'Asegura que la extensión visual de FeedIA esté generada en disco.',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({ path: ensureFeediaExtension() }),
  ),

  tool(
    'cu_profile_get_size',
    'Devuelve el tamaño en MB y el conteo de archivos de un perfil.',
    {
      type: 'object',
      properties: { profileId: str('') },
      required: ['profileId'],
    },
    async (input, _brand) => getProfileSize(String(input.profileId)),
  ),

  tool(
    'cu_profile_clean_cache',
    'Limpia el cache de un perfil sin tocar cookies/login.',
    {
      type: 'object',
      properties: { profileId: str('') },
      required: ['profileId'],
    },
    async (input, _brand) => ({ ok: cleanProfileCache(String(input.profileId)) }),
  ),

  tool(
    'cu_profile_snapshot',
    'Snapshot del subsistema de perfiles: total, activos, login states.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getProfilesSnapshot(),
  ),

  // ── Android Emulator (BlueStacks/MEmu/LDPlayer) ─────────────────────────────

  tool(
    'cu_android_detect_emulators',
    'Detecta qué emuladores Android están instalados en el sistema (BlueStacks, MEmu, LDPlayer, Genymotion, Nox).',
    { type: 'object', properties: {} },
    async (_input, _brand) => detectInstalledEmulators(),
  ),

  tool(
    'cu_android_register',
    'Registra una instancia de emulador para uso con FeedIA.',
    {
      type: 'object',
      properties: {
        type: str('bluestacks|memu|ldplayer|genymotion|avd|nox'),
        name: str(''),
        adbHost: str('default 127.0.0.1'),
        adbPort: { type: 'number' },
      },
      required: ['type', 'name'],
    },
    async (input, _brand) =>
      androidRegister({
        type: input.type as Parameters<typeof androidRegister>[0]['type'],
        name: String(input.name),
        adbHost: input.adbHost as string | undefined,
        adbPort: input.adbPort as number | undefined,
      }),
  ),

  tool(
    'cu_android_launch',
    'Lanza un emulador previamente registrado y conecta ADB.',
    {
      type: 'object',
      properties: { emulatorId: str('') },
      required: ['emulatorId'],
    },
    async (input, _brand) => androidLaunch(String(input.emulatorId)),
  ),

  tool(
    'cu_android_stop',
    'Detiene un emulador.',
    {
      type: 'object',
      properties: { emulatorId: str('') },
      required: ['emulatorId'],
    },
    async (input, _brand) => androidStop(String(input.emulatorId)),
  ),

  tool(
    'cu_android_list',
    'Lista emuladores registrados con su estado actual.',
    { type: 'object', properties: {} },
    async (_input, _brand) => androidList(),
  ),

  tool(
    'cu_android_get',
    'Devuelve un emulador específico.',
    {
      type: 'object',
      properties: { emulatorId: str('') },
      required: ['emulatorId'],
    },
    async (input, _brand) => androidGet(String(input.emulatorId)),
  ),

  tool(
    'cu_android_set_default',
    'Define el emulador default.',
    {
      type: 'object',
      properties: { emulatorId: str('') },
      required: ['emulatorId'],
    },
    async (input, _brand) => ({ ok: androidSetDefault(String(input.emulatorId)) }),
  ),

  tool(
    'cu_android_refresh_status',
    'Refresca el estado running/offline de todos los emuladores via ADB.',
    { type: 'object', properties: {} },
    async (_input, _brand) => refreshEmulatorStatus(),
  ),

  tool(
    'cu_android_tap',
    'Tap en coordenadas específicas del emulador.',
    {
      type: 'object',
      properties: {
        deviceId: str(''),
        x: { type: 'number' },
        y: { type: 'number' },
      },
      required: ['deviceId', 'x', 'y'],
    },
    async (input, _brand) => ({ ok: mobileTap(String(input.deviceId), { x: Number(input.x), y: Number(input.y) }) }),
  ),

  tool(
    'cu_android_swipe',
    'Swipe (deslizar) entre dos puntos.',
    {
      type: 'object',
      properties: {
        deviceId: str(''),
        x1: { type: 'number' },
        y1: { type: 'number' },
        x2: { type: 'number' },
        y2: { type: 'number' },
        durationMs: { type: 'number' },
      },
      required: ['deviceId', 'x1', 'y1', 'x2', 'y2'],
    },
    async (input, _brand) => ({
      ok: mobileSwipe(String(input.deviceId), {
        x1: Number(input.x1),
        y1: Number(input.y1),
        x2: Number(input.x2),
        y2: Number(input.y2),
        durationMs: input.durationMs as number | undefined,
      }),
    }),
  ),

  tool(
    'cu_android_type',
    'Escribe texto en el campo activo del emulador.',
    {
      type: 'object',
      properties: { deviceId: str(''), text: str('') },
      required: ['deviceId', 'text'],
    },
    async (input, _brand) => ({ ok: mobileType(String(input.deviceId), { text: String(input.text) }) }),
  ),

  tool(
    'cu_android_press_key',
    'Presiona una tecla por keycode (KEYCODE_BACK, KEYCODE_HOME, etc.).',
    {
      type: 'object',
      properties: { deviceId: str(''), keycode: str('') },
      required: ['deviceId', 'keycode'],
    },
    async (input, _brand) => ({ ok: mobilePressKey(String(input.deviceId), { keycode: String(input.keycode) }) }),
  ),

  tool(
    'cu_android_back',
    'Tecla Back en Android.',
    {
      type: 'object',
      properties: { deviceId: str('') },
      required: ['deviceId'],
    },
    async (input, _brand) => ({ ok: mobileBack(String(input.deviceId)) }),
  ),

  tool(
    'cu_android_home',
    'Tecla Home en Android.',
    {
      type: 'object',
      properties: { deviceId: str('') },
      required: ['deviceId'],
    },
    async (input, _brand) => ({ ok: mobileHome(String(input.deviceId)) }),
  ),

  tool(
    'cu_android_screenshot',
    'Captura screenshot del emulador.',
    {
      type: 'object',
      properties: { deviceId: str('') },
      required: ['deviceId'],
    },
    async (input, _brand) => mobileScreenshot(String(input.deviceId)),
  ),

  tool(
    'cu_android_list_apps',
    'Lista las apps instaladas en el emulador.',
    {
      type: 'object',
      properties: { deviceId: str('') },
      required: ['deviceId'],
    },
    async (input, _brand) => ({ packages: androidListApps(String(input.deviceId)) }),
  ),

  tool(
    'cu_android_launch_app',
    'Lanza una app específica en el emulador por su package name.',
    {
      type: 'object',
      properties: { deviceId: str(''), packageName: str('') },
      required: ['deviceId', 'packageName'],
    },
    async (input, _brand) => ({ ok: launchAppOnDevice(String(input.deviceId), String(input.packageName)) }),
  ),

  tool(
    'cu_android_stop_app',
    'Force-stop de una app.',
    {
      type: 'object',
      properties: { deviceId: str(''), packageName: str('') },
      required: ['deviceId', 'packageName'],
    },
    async (input, _brand) => ({ ok: stopAppOnDevice(String(input.deviceId), String(input.packageName)) }),
  ),

  tool(
    'cu_android_is_app_installed',
    'Verifica si una app está instalada en el emulador.',
    {
      type: 'object',
      properties: { deviceId: str(''), packageName: str('') },
      required: ['deviceId', 'packageName'],
    },
    async (input, _brand) => ({ installed: androidIsAppInstalled(String(input.deviceId), String(input.packageName)) }),
  ),

  tool(
    'cu_android_launch_instagram',
    'Lanza la app móvil de Instagram en el emulador. Ideal para features que solo existen en mobile (Reels nativos, Stories avanzados).',
    {
      type: 'object',
      properties: { emulatorId: str('') },
    },
    async (input, _brand) => launchInstagramOnEmulator(input.emulatorId as string | undefined),
  ),

  tool(
    'cu_android_canva_to_instagram_mobile',
    'Pipeline mobile: abre Canva Android → diseña → publica en IG Android.',
    {
      type: 'object',
      properties: {
        emulatorId: str(''),
        instruction: str('Qué hacer en mobile'),
      },
      required: ['emulatorId', 'instruction'],
    },
    async (input, _brand) =>
      runMobileCanvaToInstagram(String(input.emulatorId), { instruction: String(input.instruction) }),
  ),

  tool(
    'cu_android_auto_setup',
    'Asistente de setup: detecta qué emulador hay instalado y dá instrucciones para los faltantes.',
    { type: 'object', properties: {} },
    async (_input, _brand) => autoSetupEmulator(),
  ),

  tool(
    'cu_android_snapshot',
    'Snapshot Android: emuladores instalados, registrados, corriendo, ADB disponible.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getAndroidEmulatorSnapshot(),
  ),

  tool(
    'cu_android_known_packages',
    'Devuelve los package names más usados (Instagram, TikTok, Canva).',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({
      instagram: INSTAGRAM_PACKAGE,
      tiktok: TIKTOK_PACKAGE,
      canva: CANVA_ANDROID_PACKAGE,
    }),
  ),

  // ── Voice Narrator (narración en vivo on/off) ───────────────────────────────

  tool(
    'cu_voice_narrate',
    'Narra un mensaje en voz alta. Respeta config (level, categories, threshold de costo).',
    {
      type: 'object',
      properties: {
        text: str('Texto a narrar'),
        category: str(
          'workflow-start|app-launch|navigation|editing|export|publishing|success|error|thinking|milestone|alert',
        ),
        workflowName: str(''),
        step: { type: 'number' },
        totalSteps: { type: 'number' },
      },
      required: ['text'],
    },
    async (input, brand) =>
      voiceNarrate(String(input.text), (input.category as Parameters<typeof voiceNarrate>[1]) ?? 'navigation', {
        workflowName: input.workflowName as string | undefined,
        brandName: brand.name,
        step: input.step as number | undefined,
        totalSteps: input.totalSteps as number | undefined,
      }),
  ),

  tool(
    'cu_voice_get_config',
    'Devuelve la config actual del narrador.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getNarratorConfig(),
  ),

  tool(
    'cu_voice_set_level',
    'Cambia el nivel de narración (off/quiet/normal/verbose). User puede desactivar para ahorrar tokens.',
    {
      type: 'object',
      properties: { level: str('off|quiet|normal|verbose') },
      required: ['level'],
    },
    async (input, _brand) => setNarratorLevel(input.level as Parameters<typeof setNarratorLevel>[0]),
  ),

  tool(
    'cu_voice_disable',
    'Desactiva por completo la narración (level=off). Útil cuando el user no quiere consumir tokens TTS.',
    { type: 'object', properties: {} },
    async (_input, _brand) => voiceDisable(),
  ),

  tool(
    'cu_voice_enable',
    'Reactiva la narración. Opcionalmente especificar level.',
    {
      type: 'object',
      properties: { level: str('quiet|normal|verbose') },
    },
    async (input, _brand) => voiceEnable((input.level as Parameters<typeof voiceEnable>[0]) ?? 'normal'),
  ),

  tool(
    'cu_voice_is_enabled',
    '¿Está activa la narración?',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({ enabled: voiceIsEnabled() }),
  ),

  tool(
    'cu_voice_update_config',
    'Actualiza la config del narrador (provider, voice, rate, pitch, volume, categories, etc.).',
    {
      type: 'object',
      properties: {
        provider: str('elevenlabs|google_unofficial|sapi|browser|cloned'),
        language: str('es-AR|es-ES|en-US|en-GB|pt-BR|fr-FR|it-IT|de-DE'),
        voice: str(''),
        rate: { type: 'number' },
        pitch: { type: 'number' },
        volume: { type: 'number' },
        maxNarrationsPerWorkflow: { type: 'number' },
        costAlertThresholdUsd: { type: 'number' },
        saveAudio: { type: 'boolean' },
        whisperMode: { type: 'boolean' },
      },
    },
    async (input, _brand) => updateNarratorConfig(input as Parameters<typeof updateNarratorConfig>[0]),
  ),

  tool(
    'cu_voice_toggle_category',
    'Activa/desactiva una categoría específica de narración.',
    {
      type: 'object',
      properties: {
        category: str(
          'workflow-start|app-launch|navigation|editing|export|publishing|success|error|thinking|milestone|alert',
        ),
        enabled: { type: 'boolean' },
      },
      required: ['category', 'enabled'],
    },
    async (input, _brand) =>
      voiceToggleCategory(input.category as Parameters<typeof voiceToggleCategory>[0], Boolean(input.enabled)),
  ),

  tool(
    'cu_voice_stats',
    'Estadísticas del narrador: total narrado, tokens, costo USD, por categoría, por día.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getNarratorStats(),
  ),

  tool(
    'cu_voice_daily_usage',
    'Uso del narrador hoy (o fecha específica).',
    {
      type: 'object',
      properties: { date: str('YYYY-MM-DD') },
    },
    async (input, _brand) => voiceDailyUsage(input.date as string | undefined),
  ),

  tool(
    'cu_voice_reset_stats',
    'Resetea las estadísticas del narrador.',
    { type: 'object', properties: {} },
    async (_input, _brand) => {
      voiceResetStats();
      return { ok: true };
    },
  ),

  tool(
    'cu_voice_enforce_cost_limit',
    'Verifica si el gasto excede el threshold y cambia a provider gratis si es necesario.',
    { type: 'object', properties: {} },
    async (_input, _brand) => voiceEnforceCostLimit(),
  ),

  // ── Welcome Experience (unboxing) ───────────────────────────────────────────

  tool(
    'ux_welcome_start',
    'Inicia el unboxing ceremonial del sistema para un nuevo usuario.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => startWelcome(String(input.userId), brand.name),
  ),

  tool(
    'ux_welcome_advance',
    'Avanza al siguiente stage del onboarding con elecciones del usuario.',
    {
      type: 'object',
      properties: {
        sessionId: str(''),
        nextStage: str(
          'box-opening|first-impression|name-the-system|choose-mascot|pick-theme|set-rituals|meet-team|first-goal|first-win|home-tour|completed',
        ),
        choices: { type: 'object', description: 'systemName, mascot, theme, voiceTone, etc.' },
        personalStory: { type: 'object', description: 'why, biggestDream, favoriteAccountName' },
      },
      required: ['sessionId', 'nextStage'],
    },
    async (input, _brand) =>
      welcomeAdvanceStage(
        String(input.sessionId),
        input.nextStage as Parameters<typeof welcomeAdvanceStage>[1],
        input.choices as Parameters<typeof welcomeAdvanceStage>[2],
        input.personalStory as Parameters<typeof welcomeAdvanceStage>[3],
      ),
  ),

  tool(
    'ux_welcome_stage_content',
    'Genera el copy ceremonial para una etapa del onboarding (personalizado con AI).',
    {
      type: 'object',
      properties: {
        sessionId: str(''),
        stage: str(''),
      },
      required: ['sessionId', 'stage'],
    },
    async (input, brand) => {
      const session = getWelcomeSession(String(input.sessionId));
      if (!session) return { error: 'sesión no encontrada' };
      return generateStageContent(session, input.stage as Parameters<typeof generateStageContent>[1], brand);
    },
  ),

  tool(
    'ux_welcome_recap',
    'Genera el resumen final personalizado al cerrar el onboarding.',
    {
      type: 'object',
      properties: { sessionId: str('') },
      required: ['sessionId'],
    },
    async (input, brand) => buildCompletionRecap(String(input.sessionId), brand),
  ),

  tool(
    'ux_welcome_get',
    'Devuelve una sesión de welcome específica.',
    {
      type: 'object',
      properties: { sessionId: str('') },
      required: ['sessionId'],
    },
    async (input, _brand) => getWelcomeSession(String(input.sessionId)),
  ),

  tool(
    'ux_welcome_active_for_user',
    'Devuelve la sesión activa de un usuario (si tiene una sin completar).',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => getActiveWelcomeForUser(String(input.userId)),
  ),

  tool(
    'ux_welcome_has_completed',
    '¿El usuario ya completó el onboarding?',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => ({ completed: hasCompletedOnboarding(String(input.userId)) }),
  ),

  tool(
    'ux_welcome_catalogs',
    'Catálogos disponibles: mascots, themes, soundpacks.',
    { type: 'object', properties: {} },
    async (_input, _brand) => welcomeCatalogs(),
  ),

  tool(
    'ux_welcome_compliment',
    'Devuelve un cumplido random para mostrar.',
    { type: 'object', properties: {} },
    async (_input, brand) => ({ text: await getRandomCompliment(brand) }),
  ),

  tool(
    'ux_welcome_return_greeting',
    'Genera saludo de bienvenida cuando el user vuelve después de N días.',
    {
      type: 'object',
      properties: { daysSinceLastVisit: { type: 'number' } },
      required: ['daysSinceLastVisit'],
    },
    async (input, brand) => ({ text: await generateReturnGreeting(brand, Number(input.daysSinceLastVisit)) }),
  ),

  tool(
    'ux_welcome_snapshot',
    'Snapshot global del onboarding (sesiones totales, completas, mascots populares).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getWelcomeSnapshot(),
  ),

  // ── Personalization Engine ──────────────────────────────────────────────────

  tool(
    'ux_personalization_init',
    'Inicializa personalización para un usuario con defaults inteligentes.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => initPersonalization(String(input.userId), brand.name),
  ),

  tool(
    'ux_personalization_get',
    'Devuelve la personalización actual del usuario.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => getPersonalization(String(input.userId)),
  ),

  tool(
    'ux_personalization_update',
    'Actualiza propiedades de personalización (theme, mascot, voice, density, etc.).',
    {
      type: 'object',
      properties: {
        userId: str(''),
        updates: { type: 'object' },
      },
      required: ['userId', 'updates'],
    },
    async (input, _brand) =>
      updatePersonalization(String(input.userId), input.updates as Parameters<typeof updatePersonalization>[1]),
  ),

  tool(
    'ux_personalization_reset',
    'Resetea la personalización a defaults preservando identidad.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => personalizationReset(String(input.userId)),
  ),

  tool(
    'ux_personalization_add_joke',
    'Agrega un inside joke con context para reutilizar después.',
    {
      type: 'object',
      properties: {
        userId: str(''),
        context: str(''),
        jokeText: str(''),
      },
      required: ['userId', 'context', 'jokeText'],
    },
    async (input, _brand) => addInsideJoke(String(input.userId), String(input.context), String(input.jokeText)),
  ),

  tool(
    'ux_personalization_match_joke',
    'Busca un inside joke relevante para el contexto actual.',
    {
      type: 'object',
      properties: { userId: str(''), currentContext: str('') },
      required: ['userId', 'currentContext'],
    },
    async (input, _brand) => ({ joke: getRelevantInsideJoke(String(input.userId), String(input.currentContext)) }),
  ),

  tool(
    'ux_personalization_add_command',
    'Agrega un comando custom (trigger → response).',
    {
      type: 'object',
      properties: {
        userId: str(''),
        trigger: str(''),
        response: str(''),
      },
      required: ['userId', 'trigger', 'response'],
    },
    async (input, _brand) => addCustomCommand(String(input.userId), String(input.trigger), String(input.response)),
  ),

  tool(
    'ux_personalization_remove_command',
    'Elimina un comando custom.',
    {
      type: 'object',
      properties: { userId: str(''), trigger: str('') },
      required: ['userId', 'trigger'],
    },
    async (input, _brand) => removeCustomCommand(String(input.userId), String(input.trigger)),
  ),

  tool(
    'ux_personalization_match_command',
    'Verifica si un input matchea un comando custom.',
    {
      type: 'object',
      properties: { userId: str(''), input: str('') },
      required: ['userId', 'input'],
    },
    async (input, _brand) => ({ response: matchCustomCommand(String(input.userId), String(input.input)) }),
  ),

  tool(
    'ux_personalization_context_for_talia',
    'Construye el contexto personalizado para inyectar en el system prompt de Talía.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => ({ contextString: buildPersonalContextForTalia(String(input.userId), brand) }),
  ),

  tool(
    'ux_personalization_catalogs_preview',
    'Devuelve previews de todos los catálogos (themes, mascots, sounds, densities, fonts, iconStyles).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCatalogPreview(),
  ),

  tool(
    'ux_personalization_snapshot',
    'Snapshot de personalización: usuarios totales, themes/mascots populares, inside jokes.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getPersonalizationSnapshot(),
  ),

  tool(
    'ux_personalization_css',
    'Exporta el CSS con variables del tema actual del usuario.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => ({ css: exportPersonalizationCSS(String(input.userId)) }),
  ),

  tool(
    'ux_personalization_theme',
    'Devuelve la info del tema actual del usuario.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => getThemeForUser(String(input.userId)),
  ),

  tool(
    'ux_personalization_mascot',
    'Devuelve la info del mascot actual del usuario.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => getMascotForUser(String(input.userId)),
  ),

  tool(
    'ux_personalization_accent_color',
    'Devuelve el accent color efectivo (override o del tema).',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => ({ accentColor: getEffectiveAccentColor(String(input.userId)) }),
  ),

  // ── Home Dashboard ──────────────────────────────────────────────────────────

  tool(
    'ux_home_dashboard',
    'Construye el dashboard de inicio personalizado: greeting + cards + while-you-were-away + next 3 hours.',
    {
      type: 'object',
      properties: {
        userId: str(''),
        lastVisitAt: str('ISO'),
      },
      required: ['userId'],
    },
    async (input, brand) => buildHomeDashboard(String(input.userId), brand, input.lastVisitAt as string | undefined),
  ),

  tool(
    'ux_home_minimal',
    'Versión minimal del home: greeting + 3 cards top.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildMinimalHome(String(input.userId), brand),
  ),

  tool(
    'ux_home_text',
    'Versión texto del home (ideal para narración o mensajería).',
    {
      type: 'object',
      properties: { userId: str(''), lastVisitAt: str('') },
      required: ['userId'],
    },
    async (input, brand) => ({
      text: await buildHomeAsText(String(input.userId), brand, input.lastVisitAt as string | undefined),
    }),
  ),

  tool(
    'ux_home_delight',
    'Devuelve un micro-mensaje delight aleatorio para el usuario.',
    { type: 'object', properties: {} },
    async (_input, brand) => ({ text: await getDelightMessage(brand) }),
  ),

  tool(
    'ux_home_config',
    'Devuelve la config del home dashboard para el usuario (mood, timeOfDay, etc.).',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, _brand) => getHomeDashboardConfig(String(input.userId)),
  ),

  tool(
    'ux_home_ambient_comment',
    'Genera un comentario ambiental personalizado.',
    { type: 'object', properties: {} },
    async (_input, brand) => ({ text: await generateAmbientComment(brand) }),
  ),

  tool(
    'ux_home_greeting',
    'Construye el greeting personal del usuario (separado del home completo).',
    {
      type: 'object',
      properties: { userId: str(''), lastVisitAt: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildPersonalGreeting(String(input.userId), brand, input.lastVisitAt as string | undefined),
  ),

  // ── Achievement System ─────────────────────────────────────────────────────

  tool(
    'ux_achievements_evaluate',
    'Evalúa todos los achievements y desbloquea los que el usuario haya conseguido.',
    { type: 'object', properties: {} },
    async (_input, brand) => evaluateAchievements(brand),
  ),

  tool(
    'ux_achievements_all',
    'Lista todos los achievements disponibles (catálogo completo).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getAllAchievements(),
  ),

  tool(
    'ux_achievements_unlocked',
    'Lista los achievements ya desbloqueados.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getUnlockedAchievements(),
  ),

  tool(
    'ux_achievements_by_category',
    'Lista achievements de una categoría específica.',
    {
      type: 'object',
      properties: { category: str('crecimiento|engagement|contenido|comunidad|ventas|rituales|maestría|especiales') },
      required: ['category'],
    },
    async (input, _brand) =>
      getAchievementsByCategory(input.category as Parameters<typeof getAchievementsByCategory>[0]),
  ),

  tool(
    'ux_achievements_next',
    'Próximos achievements a desbloquear con hint de progreso.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getProgressTowardNext(),
  ),

  tool(
    'ux_achievements_snapshot',
    'Snapshot global: total desbloqueados, puntos, por categoría/rareza.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getAchievementsSnapshot(),
  ),

  tool(
    'ux_achievements_mark_shared',
    'Marca un achievement como compartido en redes.',
    {
      type: 'object',
      properties: { achievementId: str('') },
      required: ['achievementId'],
    },
    async (input, _brand) => ({ ok: markAchievementShared(String(input.achievementId)) }),
  ),

  tool(
    'ux_achievements_mark_ack',
    'Marca un achievement como visto.',
    {
      type: 'object',
      properties: { achievementId: str('') },
      required: ['achievementId'],
    },
    async (input, _brand) => ({ ok: markAchievementAcknowledged(String(input.achievementId)) }),
  ),

  tool(
    'ux_achievements_unacknowledged',
    'Lista achievements desbloqueados pendientes de ver.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getUnacknowledgedAchievements(),
  ),

  tool(
    'ux_achievements_unlock_manual',
    'Desbloquea manualmente un achievement (para easter eggs o triggers especiales).',
    {
      type: 'object',
      properties: { achievementId: str(''), context: str('') },
      required: ['achievementId'],
    },
    async (input, _brand) => ({ ok: manuallyUnlock(String(input.achievementId), input.context as string | undefined) }),
  ),

  // ── Daily Rituals ──────────────────────────────────────────────────────────

  tool(
    'ux_ritual_morning',
    'Genera el ritual matutino personalizado.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildMorningRitual(brand, String(input.userId)),
  ),

  tool(
    'ux_ritual_evening',
    'Genera el ritual nocturno (cierre del día).',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildEveningRitual(brand, String(input.userId)),
  ),

  tool(
    'ux_ritual_monday_kickoff',
    'Ritual del lunes con visión semanal.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildMondayKickoff(brand, String(input.userId)),
  ),

  tool(
    'ux_ritual_friday_close',
    'Ritual del viernes (cierre de semana).',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => buildFridayClose(brand, String(input.userId)),
  ),

  tool(
    'ux_ritual_deliver',
    'Entrega un ritual generado (lo envía como alerta + voz si está habilitado).',
    {
      type: 'object',
      properties: { ritualId: str('') },
      required: ['ritualId'],
    },
    async (input, brand) => deliverRitual(String(input.ritualId), brand),
  ),

  tool(
    'ux_ritual_recent',
    'Lista rituales recientes.',
    {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        type: str('morning|evening|weekly-monday|weekly-friday|monthly-first|birthday-account'),
      },
    },
    async (input, _brand) =>
      getRecentRituals(Number(input.limit ?? 14), input.type as Parameters<typeof getRecentRituals>[1]),
  ),

  tool(
    'ux_ritual_get',
    'Devuelve un ritual específico.',
    {
      type: 'object',
      properties: { ritualId: str('') },
      required: ['ritualId'],
    },
    async (input, _brand) => getRitualById(String(input.ritualId)),
  ),

  tool(
    'ux_ritual_mark_ack',
    'Marca un ritual como visto.',
    {
      type: 'object',
      properties: { ritualId: str('') },
      required: ['ritualId'],
    },
    async (input, _brand) => ({ ok: markRitualAcknowledged(String(input.ritualId)) }),
  ),

  tool(
    'ux_ritual_snapshot',
    'Snapshot de rituales: total, por tipo, por tono emocional, entregas, acks.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getRitualSnapshot(),
  ),

  tool(
    'ux_ritual_run_morning',
    'Genera Y entrega el ritual matutino completo.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => runMorningRitual(brand, String(input.userId)),
  ),

  tool(
    'ux_ritual_run_evening',
    'Genera Y entrega el ritual nocturno completo.',
    {
      type: 'object',
      properties: { userId: str('') },
      required: ['userId'],
    },
    async (input, brand) => runEveningRitual(brand, String(input.userId)),
  ),

  // ── Celebration Engine ─────────────────────────────────────────────────────

  tool(
    'ux_celebrate_trigger',
    'Dispara una celebración custom con tipo, intensidad y context.',
    {
      type: 'object',
      properties: {
        kind: str(
          'milestone|achievement|streak|first-time|top-post|goal-completed|level-up|surprise|anniversary|comeback|collab-success',
        ),
        intensity: str('subtle|moderate|fiesta|épica'),
        description: str(''),
        metricName: str(''),
        metricValue: { type: 'number' },
        userId: str(''),
        generateShareable: { type: 'boolean' },
      },
      required: ['kind', 'description'],
    },
    async (input, brand) =>
      triggerCelebration({
        kind: input.kind as Parameters<typeof triggerCelebration>[0]['kind'],
        intensity: input.intensity as Parameters<typeof triggerCelebration>[0]['intensity'],
        context: {
          description: String(input.description),
          metricName: input.metricName as string | undefined,
          metricValue: input.metricValue as number | undefined,
        },
        brand,
        userId: input.userId as string | undefined,
        generateShareable: input.generateShareable as boolean | undefined,
      }),
  ),

  tool(
    'ux_celebrate_milestone',
    'Celebra un milestone numérico (followers, sales, etc.).',
    {
      type: 'object',
      properties: {
        value: { type: 'number' },
        metricName: str(''),
        userId: str(''),
      },
      required: ['value', 'metricName'],
    },
    async (input, brand) =>
      celebrateMilestone(Number(input.value), String(input.metricName), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_achievement',
    'Celebra el desbloqueo de un achievement.',
    {
      type: 'object',
      properties: {
        achievementName: str(''),
        rarity: str('común|rara|épica|legendaria|mítica'),
        userId: str(''),
      },
      required: ['achievementName', 'rarity'],
    },
    async (input, brand) =>
      celebrateAchievementFn(
        String(input.achievementName),
        String(input.rarity),
        brand,
        input.userId as string | undefined,
      ),
  ),

  tool(
    'ux_celebrate_goal',
    'Celebra una meta completada.',
    {
      type: 'object',
      properties: {
        goalTitle: str(''),
        userId: str(''),
      },
      required: ['goalTitle'],
    },
    async (input, brand) => celebrateGoalCompleted(String(input.goalTitle), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_streak',
    'Celebra una racha (X días seguidos).',
    {
      type: 'object',
      properties: {
        days: { type: 'number' },
        userId: str(''),
      },
      required: ['days'],
    },
    async (input, brand) => celebrateStreak(Number(input.days), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_first_time',
    'Celebra una primera vez (primer post, primer DM, etc.).',
    {
      type: 'object',
      properties: {
        description: str(''),
        userId: str(''),
      },
      required: ['description'],
    },
    async (input, brand) => celebrateFirstTime(String(input.description), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_top_post',
    'Celebra un post viral o top performer.',
    {
      type: 'object',
      properties: {
        postHook: str(''),
        reach: { type: 'number' },
        userId: str(''),
      },
      required: ['postHook', 'reach'],
    },
    async (input, brand) =>
      celebrateTopPost(String(input.postHook), Number(input.reach), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_surprise',
    'Dispara una celebración sorpresa random.',
    {
      type: 'object',
      properties: { userId: str('') },
    },
    async (input, brand) => celebrateSurprise(brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_anniversary',
    'Celebra el aniversario de la cuenta.',
    {
      type: 'object',
      properties: {
        yearsActive: { type: 'number' },
        userId: str(''),
      },
      required: ['yearsActive'],
    },
    async (input, brand) => celebrateAnniversary(Number(input.yearsActive), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrate_comeback',
    'Celebra el regreso del usuario después de tiempo.',
    {
      type: 'object',
      properties: {
        daysAway: { type: 'number' },
        userId: str(''),
      },
      required: ['daysAway'],
    },
    async (input, brand) => celebrateComeback(Number(input.daysAway), brand, input.userId as string | undefined),
  ),

  tool(
    'ux_celebrations_recent',
    'Lista celebraciones recientes.',
    {
      type: 'object',
      properties: {
        limit: { type: 'number' },
        kind: str(''),
      },
    },
    async (input, _brand) =>
      getRecentCelebrations(Number(input.limit ?? 20), input.kind as Parameters<typeof getRecentCelebrations>[1]),
  ),

  tool(
    'ux_celebration_get',
    'Devuelve una celebración específica.',
    {
      type: 'object',
      properties: { id: str('') },
      required: ['id'],
    },
    async (input, _brand) => getCelebration(String(input.id)),
  ),

  tool(
    'ux_celebration_mark_ack',
    'Marca una celebración como vista.',
    {
      type: 'object',
      properties: { id: str('') },
      required: ['id'],
    },
    async (input, _brand) => ({ ok: markCelebrationAcknowledged(String(input.id)) }),
  ),

  tool(
    'ux_celebration_mark_shared',
    'Marca una celebración como compartida.',
    {
      type: 'object',
      properties: { id: str('') },
      required: ['id'],
    },
    async (input, _brand) => ({ ok: markCelebrationShared(String(input.id)) }),
  ),

  tool(
    'ux_celebrations_unack',
    'Lista celebraciones pendientes de ver.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getUnacknowledgedCelebrations(),
  ),

  tool(
    'ux_celebrations_snapshot',
    'Snapshot de celebraciones.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCelebrationSnapshot(),
  ),

  tool(
    'ux_celebrations_config_update',
    'Actualiza la config global del engine.',
    {
      type: 'object',
      properties: {
        enabledKinds: { type: 'array', items: { type: 'string' } },
        minimumIntensity: str(''),
        cooldownMinutes: { type: 'number' },
      },
    },
    async (input, _brand) => celebrationUpdateConfig(input as Parameters<typeof celebrationUpdateConfig>[0]),
  ),

  tool(
    'ux_celebrations_config_get',
    'Devuelve la config actual.',
    { type: 'object', properties: {} },
    async (_input, _brand) => celebrationGetConfig(),
  ),

  // ── Memorabilia Archive ────────────────────────────────────────────────────

  tool(
    'ux_memorabilia_capture',
    'Captura una memoria del journey con narrativa generada por AI.',
    {
      type: 'object',
      properties: {
        type: str(
          'first-post|first-milestone|viral-post|first-sale|best-week|comeback|meaningful-comment|collab-moment|launch-day|anniversary|breakthrough|community-love',
        ),
        title: str(''),
        description: str(''),
        happenedAt: str('ISO'),
        emotionalWeight: { type: 'number', description: '1-5' },
        generateStory: { type: 'boolean' },
        associatedData: { type: 'object' },
        tags: { type: 'array', items: { type: 'string' } },
      },
      required: ['type', 'associatedData'],
    },
    async (input, brand) =>
      captureMemory({
        type: input.type as Parameters<typeof captureMemory>[0]['type'],
        title: input.title as string | undefined,
        description: input.description as string | undefined,
        happenedAt: input.happenedAt as string | undefined,
        emotionalWeight: input.emotionalWeight as Parameters<typeof captureMemory>[0]['emotionalWeight'],
        generateStory: (input.generateStory as boolean) ?? true,
        brand,
        associatedData: input.associatedData as Parameters<typeof captureMemory>[0]['associatedData'],
        tags: input.tags as string[] | undefined,
      }),
  ),

  tool(
    'ux_memorabilia_auto_detect',
    'Auto-detecta y captura memorias del journey (first post, virales, mejor semana, etc.).',
    { type: 'object', properties: {} },
    async (_input, brand) => autoDetectAndCapture(brand),
  ),

  tool(
    'ux_memorabilia_pin',
    'Pinea una memoria al tope.',
    {
      type: 'object',
      properties: { memoryId: str('') },
      required: ['memoryId'],
    },
    async (input, _brand) => pinMemory(String(input.memoryId)),
  ),

  tool(
    'ux_memorabilia_unpin',
    'Despinea una memoria.',
    {
      type: 'object',
      properties: { memoryId: str('') },
      required: ['memoryId'],
    },
    async (input, _brand) => unpinMemory(String(input.memoryId)),
  ),

  tool(
    'ux_memorabilia_revisit',
    'Marca una memoria como revisitada (incrementa contador).',
    {
      type: 'object',
      properties: { memoryId: str('') },
      required: ['memoryId'],
    },
    async (input, _brand) => markRevisited(String(input.memoryId)),
  ),

  tool(
    'ux_memorabilia_list',
    'Lista memorias con filtros.',
    {
      type: 'object',
      properties: {
        type: str(''),
        minWeight: { type: 'number' },
        pinned: { type: 'boolean' },
      },
    },
    async (input, _brand) =>
      listMemories({
        type: input.type as NonNullable<Parameters<typeof listMemories>[0]>['type'],
        minWeight: input.minWeight as NonNullable<Parameters<typeof listMemories>[0]>['minWeight'],
        pinned: input.pinned as boolean | undefined,
      }),
  ),

  tool(
    'ux_memorabilia_get',
    'Devuelve una memoria específica.',
    {
      type: 'object',
      properties: { memoryId: str('') },
      required: ['memoryId'],
    },
    async (input, _brand) => getMemory(String(input.memoryId)),
  ),

  tool(
    'ux_memorabilia_throwback',
    'Devuelve una memoria random emotiva (efecto nostálgico).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getThrowbackMemory(),
  ),

  tool(
    'ux_memorabilia_yearbook_generate',
    'Genera el yearbook completo de un año específico.',
    {
      type: 'object',
      properties: { year: { type: 'number' } },
      required: ['year'],
    },
    async (input, brand) => generateYearbook(Number(input.year), brand),
  ),

  tool(
    'ux_memorabilia_yearbook_get',
    'Devuelve el yearbook de un año.',
    {
      type: 'object',
      properties: { year: { type: 'number' } },
      required: ['year'],
    },
    async (input, _brand) => getYearbook(Number(input.year)),
  ),

  tool(
    'ux_memorabilia_yearbooks_list',
    'Lista todos los yearbooks generados.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listYearbooks(),
  ),

  tool(
    'ux_memorabilia_highlight_reel',
    'Construye el highlight reel de toda la vida (top N memorias).',
    {
      type: 'object',
      properties: { count: { type: 'number' } },
    },
    async (input, brand) => buildHighlightReel(brand, Number(input.count ?? 10)),
  ),

  tool(
    'ux_memorabilia_snapshot',
    'Snapshot de memorabilia: total, por tipo, yearbooks, etc.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getMemorabiliaSnapshot(),
  ),

  tool(
    'ux_memorabilia_on_this_day',
    'Memorias que ocurrieron en el mismo día de un año anterior.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getOnThisDayMemories(),
  ),

  // ── Instagram Publisher (Triple Vía) ──────────────────────────────

  tool(
    'instagram_publish_post',
    'Publica un post (imagen o carrusel) en Instagram usando la mejor vía disponible: API, Web o App.',
    {
      type: 'object',
      properties: {
        mediaPaths: { type: 'array', items: { type: 'string' }, description: 'Rutas locales de las imágenes' },
        caption: { type: 'string', description: 'Caption del post' },
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags opcionales' },
        location: { type: 'string', description: 'Ubicación opcional' },
        altText: { type: 'string', description: 'Texto alternativo opcional' },
        collaborator: { type: 'string', description: 'Usuario colaborador opcional' },
      },
      required: ['mediaPaths', 'caption'],
    },
    async (input, brand) => {
      const { publishToInstagramViaRouter } = await import('../browserOperators/instagram/publishRouter.js');
      const raw = input as Record<string, unknown>;
      const mediaPaths = (raw.mediaPaths as string[]) ?? [];
      const result = await publishToInstagramViaRouter(brand, {
        format: mediaPaths.length > 1 ? 'carousel' : 'post',
        mediaPaths,
        caption: String(raw.caption),
        hashtags: (raw.hashtags as string[]) ?? [],
        location: raw.location ? String(raw.location) : undefined,
        altText: raw.altText ? String(raw.altText) : undefined,
        collaborator: raw.collaborator ? String(raw.collaborator) : undefined,
      });
      return { ok: result.ok, via: result.via, postId: result.postId, error: result.error };
    },
  ),

  tool(
    'instagram_publish_reel',
    'Publica un Reel en Instagram usando la mejor vía disponible: API, Web o App.',
    {
      type: 'object',
      properties: {
        videoPath: { type: 'string', description: 'Ruta local del video' },
        caption: { type: 'string', description: 'Caption del reel' },
        audioName: { type: 'string', description: 'Nombre del audio trending opcional' },
        shareToFeed: { type: 'boolean', description: 'También compartir en el feed' },
      },
      required: ['videoPath', 'caption'],
    },
    async (input, brand) => {
      const { publishToInstagramViaRouter } = await import('../browserOperators/instagram/publishRouter.js');
      const result = await publishToInstagramViaRouter(brand, {
        format: 'reel',
        mediaPaths: [String(input.videoPath)],
        caption: String(input.caption),
        audioName: input.audioName ? String(input.audioName) : undefined,
        shareToFeed: input.shareToFeed === true,
      });
      return { ok: result.ok, via: result.via, postId: result.postId, error: result.error };
    },
  ),

  tool(
    'instagram_publish_story',
    'Publica una Historia en Instagram usando la mejor vía disponible: Web o App.',
    {
      type: 'object',
      properties: {
        mediaPath: { type: 'string', description: 'Ruta local de la imagen o video' },
      },
      required: ['mediaPath'],
    },
    async (input, brand) => {
      const { publishToInstagramViaRouter } = await import('../browserOperators/instagram/publishRouter.js');
      const result = await publishToInstagramViaRouter(brand, {
        format: 'story',
        mediaPaths: [String(input.mediaPath)],
        caption: '',
      });
      return { ok: result.ok, via: result.via, postId: result.postId, error: result.error };
    },
  ),

  tool(
    'instagram_publish_health',
    'Verifica el estado de salud de las 3 vías de publicación en Instagram (API, Web, App).',
    {
      type: 'object',
      properties: {},
    },
    async (_input, brand) => {
      const { checkPublishHealth } = await import('../browserOperators/instagram/publishRouter.js');
      const health = await checkPublishHealth(brand);
      return { ok: true, health };
    },
  ),

  tool(
    'browser_navigate',
    'Navega a una URL usando el browser operator.',
    {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'URL a navegar' },
        platform: { type: 'string', description: 'Plataforma objetivo (instagram-web, canva, etc.)' },
      },
      required: ['url', 'platform'],
    },
    async (input, brand) => {
      const { InstagramWebOperator } = await import('../browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: false, dryRun: true });
      await op.navigate(String(input.url));
      await op.closeSession();
      return { ok: true, url: input.url };
    },
  ),

  tool(
    'antidetect_check',
    'Verifica el estado de anti-detección de una sesión de navegador.',
    {
      type: 'object',
      properties: {
        platform: { type: 'string', description: 'Plataforma a verificar (instagram-web, etc.)' },
      },
    },
    async (input, brand) => {
      const { InstagramWebOperator } = await import('../browserOperators/instagram/instagramWebOperator.js');
      const op = new InstagramWebOperator({ brand, headless: false, dryRun: true });
      const health = await op.healthCheck();
      await op.closeSession();
      return { ok: health.healthy, details: health.details };
    },
  ),

  // ── Canva Operator ─────────────────────────────────────────────────

  tool(
    'canva_create_design',
    'Crea un diseño en Canva web desde template o en blanco.',
    {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['instagram-post', 'instagram-story', 'instagram-reel', 'presentation', 'custom'],
          description: 'Formato del diseño',
        },
        templateQuery: { type: 'string', description: 'Término de búsqueda de template' },
      },
    },
    async (input, brand) => {
      const { CanvaWebOperator } = await import('../browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: true });
      const raw = input as Record<string, unknown>;
      const result = await op.createDesign({
        format: raw.format as
          | 'instagram-post'
          | 'instagram-story'
          | 'instagram-reel'
          | 'presentation'
          | 'custom'
          | undefined,
        templateQuery: raw.templateQuery as string | undefined,
      });
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'canva_edit_text',
    'Edita textos en un diseño de Canva web.',
    {
      type: 'object',
      properties: {
        edits: {
          type: 'array',
          items: {
            type: 'object',
            properties: { elementIndex: { type: 'number' }, text: { type: 'string' }, color: { type: 'string' } },
          },
          description: 'Lista de ediciones de texto',
        },
      },
      required: ['edits'],
    },
    async (input, brand) => {
      const { CanvaWebOperator } = await import('../browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: true });
      const raw = input as Record<string, unknown>;
      const edits = ((raw.edits ?? []) as Array<Record<string, unknown>>).map((e) => ({
        elementIndex: Number(e.elementIndex ?? 0),
        text: String(e.text ?? ''),
        font: e.font ? String(e.font) : undefined,
        color: e.color ? String(e.color) : undefined,
        size: e.size ? Number(e.size) : undefined,
      }));
      const result = await op.editText(edits);
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'canva_export_design',
    'Exporta un diseño de Canva web en el formato deseado.',
    {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['png', 'jpg', 'pdf', 'mp4'], description: 'Formato de exportación' },
      },
      required: ['format'],
    },
    async (input, brand) => {
      const { CanvaWebOperator } = await import('../browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: true });
      const result = await op.exportDesign({
        format: (input as Record<string, unknown>).format as 'png' | 'jpg' | 'pdf' | 'mp4',
      });
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'canva_create_carousel',
    'Crea un carrusel de múltiples slides en Canva web para Instagram.',
    {
      type: 'object',
      properties: {
        slideCount: { type: 'number', default: 3, description: 'Cantidad de slides (2-10)' },
        templateQuery: { type: 'string', description: 'Término de búsqueda de template' },
        topic: { type: 'string', description: 'Tema del carrusel' },
      },
    },
    async (input, brand) => {
      const { CanvaWebOperator } = await import('../browserOperators/canva/canvaWebOperator.js');
      const op = new CanvaWebOperator({ brand, headless: true, dryRun: true });
      const raw = input as Record<string, unknown>;
      const result = await op.createCarouselSlides({
        slideCount: Number(raw.slideCount ?? 3),
        templateQuery: raw.templateQuery as string | undefined,
        topic: raw.topic as string | undefined,
      });
      await op.closeSession();
      return result;
    },
  ),

  // ── CapCut Operator ────────────────────────────────────────────────

  tool(
    'capcut_create_project',
    'Crea un proyecto nuevo en CapCut web.',
    {
      type: 'object',
      properties: {
        aspectRatio: { type: 'string', enum: ['9:16', '16:9', '1:1', '4:5'], description: 'Ratio de aspecto' },
      },
      required: ['aspectRatio'],
    },
    async (input, brand) => {
      const { CapCutWebOperator } = await import('../browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: true });
      const result = await op.createProject({
        aspectRatio: (input as Record<string, unknown>).aspectRatio as '9:16' | '16:9' | '1:1' | '4:5',
      });
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'capcut_add_captions',
    'Agrega captions automáticos a un video en CapCut web.',
    {
      type: 'object',
      properties: {
        language: { type: 'string', default: 'es', description: 'Idioma de los captions' },
      },
    },
    async (input, brand) => {
      const { CapCutWebOperator } = await import('../browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: true });
      const result = await op.addCaptions(((input as Record<string, unknown>).language as string) ?? 'es');
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'capcut_add_music',
    'Agrega música a un proyecto de CapCut web.',
    {
      type: 'object',
      properties: {
        trackName: { type: 'string', description: 'Nombre de la pista o "trending"' },
      },
      required: ['trackName'],
    },
    async (input, brand) => {
      const { CapCutWebOperator } = await import('../browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: true });
      const result = await op.addMusic(String((input as Record<string, unknown>).trackName));
      await op.closeSession();
      return result;
    },
  ),

  tool(
    'capcut_export_video',
    'Exporta un video desde CapCut web.',
    {
      type: 'object',
      properties: {
        quality: {
          type: 'string',
          enum: ['720p', '1080p', '4k'],
          default: '1080p',
          description: 'Calidad de exportación',
        },
      },
    },
    async (input, brand) => {
      const { CapCutWebOperator } = await import('../browserOperators/capcut/capcutWebOperator.js');
      const op = new CapCutWebOperator({ brand, headless: true, dryRun: true });
      const result = await op.exportVideo({
        quality: ((input as Record<string, unknown>).quality ?? '1080p') as '720p' | '1080p' | '4k',
        format: 'mp4',
      });
      await op.closeSession();
      return result;
    },
  ),

  // ── Runway Operator ────────────────────────────────────────────────

  tool(
    'runway_generate_video',
    'Genera un video con Runway ML Gen-3 Alpha desde un prompt de texto.',
    {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt descriptivo del video' },
        duration: { type: 'number', enum: [5, 10], default: 5, description: 'Duración en segundos' },
        ratio: {
          type: 'string',
          enum: ['1280:768', '768:1280'],
          default: '768:1280',
          description: 'Ratio (horizontal o vertical)',
        },
      },
      required: ['prompt'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      const result = await generateVideoWithRunway({
        prompt: String(raw.prompt),
        duration: (raw.duration ?? 5) as 5 | 10,
        ratio: (raw.ratio ?? '768:1280') as '1280:768' | '768:1280',
      });
      return result;
    },
  ),

  tool(
    'runway_image_to_video',
    'Convierte una imagen en video con Runway ML.',
    {
      type: 'object',
      properties: {
        imageUrl: { type: 'string', description: 'URL de la imagen' },
        prompt: { type: 'string', description: 'Prompt de movimiento/animación' },
      },
      required: ['imageUrl'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      const result = await imageToVideoWithRunway({
        imageUrl: String(raw.imageUrl),
        prompt: raw.prompt ? String(raw.prompt) : undefined,
      });
      return result;
    },
  ),

  // ── HeyGen Operator ────────────────────────────────────────────────

  tool(
    'heygen_create_avatar_video',
    'Crea un video con un avatar AI que lee un script usando HeyGen.',
    {
      type: 'object',
      properties: {
        script: { type: 'string', description: 'Script que el avatar va a leer' },
        avatarId: { type: 'string', description: 'ID del avatar (opcional)' },
        voiceId: { type: 'string', description: 'ID de la voz (opcional)' },
        language: { type: 'string', default: 'es', description: 'Idioma' },
      },
      required: ['script'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      const result = await createAvatarVideo({
        script: String(raw.script),
        avatarId: raw.avatarId ? String(raw.avatarId) : undefined,
        voiceId: raw.voiceId ? String(raw.voiceId) : undefined,
        language: raw.language ? String(raw.language) : 'es',
      });
      return result;
    },
  ),

  tool(
    'heygen_poll_status',
    'Verifica el estado de un video de HeyGen.',
    {
      type: 'object',
      properties: {
        videoId: { type: 'string', description: 'ID del video' },
      },
      required: ['videoId'],
    },
    async (input, _brand) => {
      const result = await checkHeyGenVideo(String((input as Record<string, unknown>).videoId));
      return result;
    },
  ),

  // ── Orchestration Pipelines ────────────────────────────────────────

  tool(
    'orchestrate_canva_to_instagram',
    'Ejecuta el pipeline completo: crear diseño en Canva → exportar → publicar en Instagram.',
    {
      type: 'object',
      properties: {
        contentBrief: { type: 'string', description: 'Brief del contenido a crear' },
        format: { type: 'string', enum: ['post', 'carousel', 'story'], description: 'Formato de publicación' },
        publish: { type: 'boolean', default: false, description: 'Si se debe publicar inmediatamente' },
      },
      required: ['contentBrief', 'format'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return {
        ok: true,
        pipeline: 'canva-to-instagram',
        steps: [
          { step: 'create-design', status: 'queued', tool: 'canva_create_design', brief: raw.contentBrief },
          { step: 'export', status: 'queued', tool: 'canva_export_design' },
          { step: 'caption', status: 'queued', tool: 'caption_ai_generate' },
          { step: 'publish', status: raw.publish ? 'queued' : 'skipped', tool: 'instagram_publish_post' },
        ],
        note: 'Ejecutá los pasos en orden via el agente visual-pipeline-orchestrator.',
      };
    },
  ),

  tool(
    'orchestrate_ai_video_to_reel',
    'Ejecuta el pipeline completo: generar video con IA → editar en CapCut → publicar como reel.',
    {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Prompt para generación de video' },
        tool: { type: 'string', enum: ['runway', 'heygen'], description: 'Herramienta de IA' },
        script: { type: 'string', description: 'Script para HeyGen (si aplica)' },
        publish: { type: 'boolean', default: false, description: 'Si se debe publicar inmediatamente' },
      },
      required: ['prompt', 'tool'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return {
        ok: true,
        pipeline: 'ai-video-to-reel',
        steps: [
          {
            step: 'generate-video',
            status: 'queued',
            tool: raw.tool === 'heygen' ? 'heygen_create_avatar_video' : 'runway_generate_video',
            prompt: raw.prompt,
          },
          { step: 'edit-capcut', status: 'queued', tool: 'capcut_create_project' },
          { step: 'export', status: 'queued', tool: 'capcut_export_video' },
          { step: 'caption', status: 'queued', tool: 'caption_ai_generate' },
          { step: 'publish', status: raw.publish ? 'queued' : 'skipped', tool: 'instagram_publish_reel' },
        ],
        note: 'Ejecutá los pasos en orden via el agente visual-pipeline-orchestrator.',
      };
    },
  ),

  // ── Sprint 3: Engagement, Analytics & Autopilot ─────────────────────

  tool(
    'push_lead_crm',
    'Sincroniza un lead calificado al CRM con datos de contacto extraídos.',
    {
      type: 'object',
      properties: {
        remitente: str('Handle del lead'),
        scoreInicial: { type: 'number' },
        razonScore: str('Razón del score'),
        siguientePaso: {
          type: 'string',
          enum: ['agendar-llamada', 'enviar-recurso', 'pedir-mas-info', 'derivar-humano', 'descartar'],
        },
        textoSiguienteMensaje: str('Texto del siguiente mensaje'),
        preguntasRecomendadas: { type: 'array', items: { type: 'string' } },
        rawTextHistorial: str('Texto histórico completo para extraer email/teléfono'),
      },
      required: ['remitente', 'scoreInicial', 'razonScore', 'siguientePaso', 'rawTextHistorial'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return pushLeadToCrm(
        {
          remitente: String(raw.remitente),
          scoreInicial: Number(raw.scoreInicial),
          razonScore: String(raw.razonScore),
          siguientePaso: String(raw.siguientePaso) as LeadQualification['siguientePaso'],
          textoSiguienteMensaje: String(raw.textoSiguienteMensaje ?? ''),
          preguntasRecomendadas: (raw.preguntasRecomendadas as string[]) ?? [],
        },
        String(raw.rawTextHistorial),
      );
    },
  ),

  tool(
    'growth_beacon_comments',
    'Genera comentarios inteligentes para interactuar con cuentas faro del nicho.',
    {
      type: 'object',
      properties: {
        posts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              cuenta: str('Handle de la cuenta faro'),
              descripcion: str('Descripción/resumen del post'),
            },
            required: ['cuenta', 'descripcion'],
          },
        },
      },
      required: ['posts'],
    },
    async (input, brand) =>
      generarComentariosFaro(
        brand,
        (input as Record<string, unknown>).posts as Array<{ cuenta: string; descripcion: string }>,
      ),
  ),

  tool(
    'bot_auto_reply',
    'Evalúa si un mensaje entrante debe recibir auto-reply y genera la respuesta.',
    {
      type: 'object',
      properties: {
        userId: str('ID del usuario'),
        handle: str('Handle del usuario'),
        channel: { type: 'string', enum: ['dm', 'comentario'] },
        mensaje: str('Mensaje entrante'),
        postId: str('ID del post (si es comentario)'),
        postResumen: str('Resumen del post (si es comentario)'),
      },
      required: ['userId', 'handle', 'channel', 'mensaje'],
    },
    async (input, brand) => {
      const raw = input as Record<string, unknown>;
      const { loadContext, upsertContext } = await import('../capabilities/bot/conversationMemory.js');
      let ctx = loadContext(String(raw.userId));
      if (!ctx) {
        ctx = upsertContext(String(raw.userId), String(raw.handle), raw.channel as 'dm' | 'comentario');
      }
      const incoming: import('../capabilities/bot/autoReply.js').AutoReplyContext = {
        channel: raw.channel as 'dm' | 'comentario',
        mensaje: String(raw.mensaje),
        ...(raw.postId
          ? {
              postContext: {
                postId: String(raw.postId),
                tipo: 'post',
                resumenContenido: String(raw.postResumen ?? ''),
              },
            }
          : {}),
      };
      return evaluateAndDecide(brand, ctx, incoming);
    },
  ),

  tool(
    'nurture_ready_enrollments',
    'Devuelve los enrollments de nurturing listos para enviar en este momento.',
    { type: 'object', properties: {} },
    async (_input, _brand) => enrollmentsListos(),
  ),

  tool(
    'nurture_advance_step',
    'Avanza un enrollment al siguiente paso de la secuencia.',
    {
      type: 'object',
      properties: { enrollmentId: str('ID del enrollment') },
      required: ['enrollmentId'],
    },
    async (input, _brand) => avanzarPaso(String((input as Record<string, unknown>).enrollmentId)),
  ),

  tool(
    'analytics_account_summary',
    'Devuelve un resumen ejecutivo de la cuenta: posts, engagement, tendencia.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getTikTokAccountSummary(),
  ),

  tool(
    'analytics_extract_patterns',
    'Extrae patrones de performance: top topics, hooks ganadores, mejores formatos, hashtags.',
    { type: 'object', properties: {} },
    async (_input, _brand) => extractPatterns(),
  ),

  tool(
    'analytics_best_time',
    'Devuelve el mejor horario para publicar según el formato.',
    {
      type: 'object',
      properties: {
        format: {
          type: 'string',
          enum: ['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless', 'live'],
          description: 'Formato de contenido',
        },
      },
    },
    async (input, _brand) => getBestPostingTime((input as Record<string, unknown>).format as ContentFormat | undefined),
  ),

  // ── Sprint 4: Multi-Platform Expansion ──────────────────────────────

  tool(
    'upload_to_tiktok',
    'Publica un video en TikTok.',
    {
      type: 'object',
      properties: {
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'URLs del video (máx 1)' },
        caption: str('Caption completo'),
        hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags sin #' },
        scheduleAt: str('ISO opcional para programar'),
      },
      required: ['mediaUrls', 'caption'],
    },
    async (input, _brand) =>
      uploadToSocial({
        platforms: ['tiktok'],
        mediaType: 'video',
        mediaUrls: (input as Record<string, unknown>).mediaUrls as string[],
        caption: String((input as Record<string, unknown>).caption),
        hashtags: ((input as Record<string, unknown>).hashtags as string[] | undefined) ?? [],
        scheduleAt: (input as Record<string, unknown>).scheduleAt as string | undefined,
      }),
  ),

  tool(
    'upload_to_youtube_shorts',
    'Publica un video como YouTube Short.',
    {
      type: 'object',
      properties: {
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'URLs del video (máx 1)' },
        caption: str('Caption / descripción'),
        title: str('Título del Short'),
        scheduleAt: str('ISO opcional para programar'),
      },
      required: ['mediaUrls', 'caption', 'title'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return uploadToSocial({
        platforms: ['youtube'],
        mediaType: 'video',
        mediaUrls: raw.mediaUrls as string[],
        caption: String(raw.caption),
        scheduleAt: raw.scheduleAt as string | undefined,
        perPlatform: { youtube: { title: String(raw.title), isShort: true } },
      });
    },
  ),

  tool(
    'upload_to_linkedin',
    'Publica una imagen o video en LinkedIn.',
    {
      type: 'object',
      properties: {
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'URLs de medios' },
        caption: str('Caption profesional'),
        firstComment: str('Primer comentario opcional'),
        scheduleAt: str('ISO opcional para programar'),
      },
      required: ['mediaUrls', 'caption'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return uploadToSocial({
        platforms: ['linkedin'],
        mediaType: 'photo',
        mediaUrls: raw.mediaUrls as string[],
        caption: String(raw.caption),
        scheduleAt: raw.scheduleAt as string | undefined,
        perPlatform: { linkedin: { firstComment: raw.firstComment ? String(raw.firstComment) : undefined } },
      });
    },
  ),

  tool(
    'upload_to_x',
    'Publica un post en X (Twitter).',
    {
      type: 'object',
      properties: {
        mediaUrls: { type: 'array', items: { type: 'string' }, description: 'URLs de medios (máx 4)' },
        caption: str('Texto del post (máx 280 chars)'),
        replyToTweetId: str('ID del tweet al que responde'),
        scheduleAt: str('ISO opcional para programar'),
      },
      required: ['caption'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      return uploadToSocial({
        platforms: ['x'],
        mediaType: 'photo',
        mediaUrls: (raw.mediaUrls as string[] | undefined) ?? [],
        caption: String(raw.caption),
        scheduleAt: raw.scheduleAt as string | undefined,
        perPlatform: { x: { replyToTweetId: raw.replyToTweetId ? String(raw.replyToTweetId) : undefined } },
      });
    },
  ),

  tool(
    'repurpose_post_for_platform',
    'Adapta un post de Instagram para otra plataforma: ajusta caption, hashtags y formato.',
    {
      type: 'object',
      properties: {
        originalCaption: str('Caption original del post'),
        originalHashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags originales' },
        targetPlatform: {
          type: 'string',
          enum: ['tiktok', 'youtube', 'linkedin', 'x', 'threads', 'facebook', 'pinterest'],
          description: 'Plataforma destino',
        },
        tone: { type: 'string', enum: ['professional', 'casual', 'viral', 'educational'], description: 'Tono deseado' },
      },
      required: ['originalCaption', 'targetPlatform'],
    },
    async (input, _brand) => {
      const raw = input as Record<string, unknown>;
      const platform = String(raw.targetPlatform) as import('../integrations/uploadPost.js').SocialPlatform;
      const adaptedCaption = adaptCaptionFor(String(raw.originalCaption), platform);
      const originalHashtags = (raw.originalHashtags as string[] | undefined) ?? [];
      const limits: Record<string, number> = {
        tiktok: 20,
        x: 5,
        linkedin: 8,
        threads: 5,
        facebook: 30,
        youtube: 15,
        pinterest: 10,
      };
      const maxTags = limits[platform] ?? 10;
      const adaptedHashtags = originalHashtags.slice(0, maxTags);
      const toneHints: Record<string, string> = {
        tiktok: 'Usá 3 hashtags trending + audio hint. Tono casual y viral.',
        youtube: 'Incluí keywords en la descripción. Tono educativo o entretenido.',
        linkedin: 'Formato profesional, bullet points, pregunta al final. Máx 8 hashtags.',
        x: 'Conciso, directo, opcional thread. Máx 2 hashtags.',
        threads: 'Conversacional, sin hashtags o máx 3.',
        facebook: 'Community-focused, pregunta para engagement.',
        pinterest: 'Descripción SEO-friendly con keywords.',
      };
      return {
        ok: true,
        targetPlatform: platform,
        adaptedCaption,
        adaptedHashtags,
        toneHint: toneHints[platform] ?? 'Adaptá el tono según la plataforma.',
        originalLength: String(raw.originalCaption).length,
        adaptedLength: adaptedCaption.length,
      };
    },
  ),

  // ── Sprint 5: Meta Ads & Paid Media ─────────────────────────────────

  tool(
    'meta_ads_boost_post',
    'Boostea un post de Instagram existente con presupuesto y objetivo definidos.',
    {
      type: 'object',
      properties: {
        postId: str('ID del post de Instagram a boostear'),
        budget: { type: 'number', description: 'Presupuesto total en USD' },
        durationDays: { type: 'number', default: 3, description: 'Duración en días' },
        objective: {
          type: 'string',
          enum: ['ENGAGEMENT', 'REACH', 'TRAFFIC', 'LEADS'],
          description: 'Objetivo del boost',
        },
        audience: {
          type: 'string',
          enum: ['auto', 'followers', 'lookalike', 'custom'],
          default: 'auto',
          description: 'Audiencia objetivo',
        },
      },
      required: ['postId', 'budget', 'durationDays', 'objective'],
    },
    async (input, _brand) =>
      boostPost({
        postId: String((input as Record<string, unknown>).postId),
        budget: Number((input as Record<string, unknown>).budget),
        durationDays: Number((input as Record<string, unknown>).durationDays),
        objective: (input as Record<string, unknown>).objective as 'ENGAGEMENT' | 'REACH' | 'TRAFFIC' | 'LEADS',
        audience:
          ((input as Record<string, unknown>).audience as 'auto' | 'followers' | 'lookalike' | 'custom') ?? 'auto',
      }),
  ),

  tool(
    'meta_ads_create_campaign',
    'Crea una campaña de Meta Ads con objetivo y presupuesto definidos.',
    {
      type: 'object',
      properties: {
        name: str('Nombre de la campaña'),
        objective: {
          type: 'string',
          enum: ['AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'LEADS', 'SALES', 'APP_PROMOTION'],
          description: 'Objetivo de campaña',
        },
        dailyBudget: { type: 'number', description: 'Presupuesto diario en USD' },
        lifetimeBudget: { type: 'number', description: 'Presupuesto total de por vida en USD' },
        status: { type: 'string', enum: ['ACTIVE', 'PAUSED'], default: 'PAUSED', description: 'Estado inicial' },
      },
      required: ['name', 'objective'],
    },
    async (input, _brand) =>
      createCampaign({
        name: String((input as Record<string, unknown>).name),
        objective: (input as Record<string, unknown>).objective as
          | 'AWARENESS'
          | 'TRAFFIC'
          | 'ENGAGEMENT'
          | 'LEADS'
          | 'SALES'
          | 'APP_PROMOTION',
        dailyBudget: (input as Record<string, unknown>).dailyBudget as number | undefined,
        lifetimeBudget: (input as Record<string, unknown>).lifetimeBudget as number | undefined,
        status: ((input as Record<string, unknown>).status as 'ACTIVE' | 'PAUSED' | undefined) ?? 'PAUSED',
      }),
  ),

  tool(
    'meta_ads_pause_campaign',
    'Pausa una campaña de Meta Ads activa.',
    {
      type: 'object',
      properties: { campaignId: str('ID de la campaña') },
      required: ['campaignId'],
    },
    async (input, _brand) => pauseCampaign(String((input as Record<string, unknown>).campaignId)),
  ),

  tool(
    'meta_ads_get_campaigns',
    'Lista las campañas de Meta Ads de la cuenta.',
    {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['ACTIVE', 'PAUSED', 'DELETED', 'ARCHIVED'],
          description: 'Filtrar por estado',
        },
      },
    },
    async (input, _brand) =>
      getCampaigns(
        (input as Record<string, unknown>).status as 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED' | undefined,
      ),
  ),

  tool(
    'meta_ads_get_insights',
    'Obtiene métricas de rendimiento (insights) de campañas específicas.',
    {
      type: 'object',
      properties: {
        campaignIds: { type: 'array', items: { type: 'string' }, description: 'IDs de campañas' },
        since: str('Fecha inicio ISO (YYYY-MM-DD)'),
        until: str('Fecha fin ISO (YYYY-MM-DD)'),
      },
      required: ['campaignIds'],
    },
    async (input, _brand) =>
      getCampaignInsights(
        (input as Record<string, unknown>).campaignIds as string[],
        (input as Record<string, unknown>).since as string | undefined,
        (input as Record<string, unknown>).until as string | undefined,
      ),
  ),

  tool(
    'meta_ads_optimize_budget',
    'Optimiza el presupuesto diario de una campaña según su ROAS objetivo.',
    {
      type: 'object',
      properties: {
        campaignId: str('ID de la campaña'),
        targetRoas: { type: 'number', default: 2.0, description: 'ROAS objetivo (ej: 2.0 = $2 por cada $1 gastado)' },
      },
      required: ['campaignId'],
    },
    async (input, _brand) =>
      optimizeBudget(
        String((input as Record<string, unknown>).campaignId),
        Number((input as Record<string, unknown>).targetRoas ?? 2.0),
      ),
  ),

  tool(
    'meta_ads_pixel_track',
    'Envía un evento de conversión al Meta Pixel.',
    {
      type: 'object',
      properties: {
        pixelId: str('ID del Meta Pixel'),
        eventName: {
          type: 'string',
          enum: ['PageView', 'Lead', 'Purchase', 'AddToCart', 'InitiateCheckout', 'CompleteRegistration'],
          description: 'Nombre del evento',
        },
        eventData: { type: 'object', description: 'Datos adicionales del evento' },
      },
      required: ['pixelId', 'eventName'],
    },
    async (input, _brand) =>
      trackPixelEvent(
        String((input as Record<string, unknown>).pixelId),
        String((input as Record<string, unknown>).eventName),
        (input as Record<string, unknown>).eventData as Record<string, unknown> | undefined,
      ),
  ),

  tool(
    'meta_ads_health',
    'Verifica si la integración de Meta Ads está configurada y disponible.',
    { type: 'object', properties: {} },
    async (_input, _brand) => ({
      available: isMetaAdsAvailable(),
      accountId: process.env['META_ADS_ACCOUNT_ID'] ? 'configured' : 'missing',
      token: process.env['META_ADS_ACCESS_TOKEN'] ? 'configured' : 'missing',
    }),
  ),

  // ── Pipeline CRM ────────────────────────────────────────────────────

  tool(
    'pipeline_add_deal',
    'Agrega un nuevo deal al pipeline de ventas.',
    {
      type: 'object',
      properties: {
        title: str('Título del deal'),
        value: { type: 'number', description: 'Valor estimado en USD' },
        stage: {
          type: 'string',
          enum: ['nuevo', 'calificado', 'propuesta-enviada', 'negociacion', 'cerrado-ganado', 'cerrado-perdido'],
          default: 'nuevo',
          description: 'Etapa inicial',
        },
        source: str('Fuente del lead'),
        score: { type: 'number', default: 50, description: 'Lead score inicial (0-100)' },
      },
      required: ['title', 'value'],
    },
    async (input, _brand) =>
      addDeal({
        title: String((input as Record<string, unknown>).title),
        value: Number((input as Record<string, unknown>).value),
        stage:
          ((input as Record<string, unknown>).stage as
            | 'nuevo'
            | 'calificado'
            | 'propuesta-enviada'
            | 'negociacion'
            | 'cerrado-ganado'
            | 'cerrado-perdido') ?? 'nuevo',
        source: (input as Record<string, unknown>).source as string | undefined,
        score: (input as Record<string, unknown>).score as number | undefined,
      }),
  ),

  tool(
    'pipeline_advance_deal',
    'Avanza un deal a la siguiente etapa del pipeline.',
    {
      type: 'object',
      properties: {
        id: str('ID del deal'),
        stage: {
          type: 'string',
          enum: ['nuevo', 'calificado', 'propuesta-enviada', 'negociacion', 'cerrado-ganado', 'cerrado-perdido'],
          description: 'Nueva etapa',
        },
        note: str('Nota sobre el avance'),
      },
      required: ['id', 'stage'],
    },
    async (input, _brand) =>
      advanceDeal(
        String((input as Record<string, unknown>).id),
        (input as Record<string, unknown>).stage as
          | 'nuevo'
          | 'calificado'
          | 'propuesta-enviada'
          | 'negociacion'
          | 'cerrado-ganado'
          | 'cerrado-perdido',
        (input as Record<string, unknown>).note as string | undefined,
      ),
  ),

  tool(
    'pipeline_get_summary',
    'Obtiene un resumen completo del pipeline de ventas.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getPipelineSummary(),
  ),

  tool(
    'pipeline_get_velocity',
    'Obtiene la velocidad del funnel (tasa de conversión por etapa).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getFunnelVelocity(),
  ),

  // ── Revenue Attribution ─────────────────────────────────────────────

  tool(
    'revenue_get_attribution',
    'Genera un reporte de atribución de ingresos por canal y campaña.',
    {
      type: 'object',
      properties: {
        periodDays: { type: 'number', default: 7, description: 'Período en días' },
      },
    },
    async (input, _brand) => getAttributionReport(Number((input as Record<string, unknown>).periodDays ?? 7)),
  ),

  tool(
    'revenue_content_roas',
    'Obtiene ROAS por pieza de contenido (top performers).',
    {
      type: 'object',
      properties: {
        limit: { type: 'number', default: 10, description: 'Cantidad de resultados' },
      },
    },
    async (input, _brand) => getContentAttribution(Number((input as Record<string, unknown>).limit ?? 10)),
  ),

  tool(
    'revenue_channel_comparison',
    'Compara performance entre canales (orgánico vs paid vs email, etc.).',
    { type: 'object', properties: {} },
    async (_input, _brand) => getChannelComparison(),
  ),

  tool(
    'revenue_ltv_by_channel',
    'Obtiene LTV y CAC por canal para evaluar eficiencia.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getLTVByChannel(),
  ),

  // ── Lead Scoring ────────────────────────────────────────────────────

  tool(
    'lead_score_calculate',
    'Calcula o recalcula el score de un lead basado en interacciones.',
    {
      type: 'object',
      properties: {
        handle: str('Handle del usuario'),
        engagement: { type: 'number', description: 'Puntaje de engagement (0-100)' },
        dmResponses: { type: 'number', description: 'Cantidad de respuestas en DM' },
        profileVisits: { type: 'number', description: 'Visitas al perfil' },
        websiteVisits: { type: 'number', description: 'Visitas al sitio web' },
        daysSinceLastTouch: { type: 'number', description: 'Días desde último contacto' },
      },
      required: ['handle'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      const engagement = Number(i.engagement ?? 0);
      const dmResponses = Number(i.dmResponses ?? 0);
      const profileVisits = Number(i.profileVisits ?? 0);
      const websiteVisits = Number(i.websiteVisits ?? 0);
      const daysSinceLastTouch = Number(i.daysSinceLastTouch ?? 999);
      const score = Math.min(
        100,
        Math.round(
          engagement * 0.4 +
            Math.min(dmResponses * 10, 30) +
            Math.min(profileVisits * 5, 15) +
            Math.min(websiteVisits * 10, 10) -
            Math.min(daysSinceLastTouch * 2, 20),
        ),
      );
      return {
        handle: String(i.handle),
        score,
        breakdown: {
          engagement: engagement * 0.4,
          dmResponses: Math.min(dmResponses * 10, 30),
          profileVisits: Math.min(profileVisits * 5, 15),
          websiteVisits: Math.min(websiteVisits * 10, 10),
          recency: -Math.min(daysSinceLastTouch * 2, 20),
        },
      };
    },
  ),

  tool(
    'lead_get_by_score',
    'Obtiene leads filtrados por score mínimo.',
    {
      type: 'object',
      properties: {
        minScore: { type: 'number', default: 70, description: 'Score mínimo (0-100)' },
      },
    },
    async (input, _brand) => getDealsByScore(Number((input as Record<string, unknown>).minScore ?? 70)),
  ),

  // ── Offers & Scarcity ───────────────────────────────────────────────

  tool(
    'offer_create_scarcity',
    'Crea una oferta con escasez real (cantidad limitada + deadline).',
    {
      type: 'object',
      properties: {
        productName: str('Nombre del producto/servicio'),
        originalPrice: { type: 'number', description: 'Precio original' },
        discountedPrice: { type: 'number', description: 'Precio con descuento' },
        quantity: { type: 'number', description: 'Cantidad limitada disponible' },
        deadline: str('Fecha límite ISO'),
        reason: str('Razón de la escasez (ej: "solo 20 lugares")'),
      },
      required: ['productName', 'originalPrice', 'discountedPrice', 'quantity', 'deadline', 'reason'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      return {
        offerId: `offer-${Date.now()}`,
        productName: String(i.productName),
        originalPrice: Number(i.originalPrice),
        discountedPrice: Number(i.discountedPrice),
        discountPercent: Math.round((1 - Number(i.discountedPrice) / Number(i.originalPrice)) * 100),
        quantity: Number(i.quantity),
        deadline: String(i.deadline),
        reason: String(i.reason),
        urgencyScore: Math.min(
          100,
          Math.round((1 - Number(i.discountedPrice) / Number(i.originalPrice)) * 50 + Number(i.quantity) * 0.5),
        ),
        createdAt: new Date().toISOString(),
      };
    },
  ),

  tool(
    'offer_create_bundle',
    'Crea un bundle de productos con precio especial.',
    {
      type: 'object',
      properties: {
        name: str('Nombre del bundle'),
        items: { type: 'array', items: { type: 'string' }, description: 'Lista de productos incluidos' },
        individualPrices: { type: 'array', items: { type: 'number' }, description: 'Precios individuales' },
        bundlePrice: { type: 'number', description: 'Precio del bundle' },
      },
      required: ['name', 'items', 'individualPrices', 'bundlePrice'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      const items = i.items as string[];
      const individualPrices = i.individualPrices as number[];
      const total = individualPrices.reduce((s, p) => s + p, 0);
      return {
        bundleId: `bundle-${Date.now()}`,
        name: String(i.name),
        items,
        individualPrices,
        totalValue: total,
        bundlePrice: Number(i.bundlePrice),
        savings: total - Number(i.bundlePrice),
        savingsPercent: Math.round((1 - Number(i.bundlePrice) / total) * 100),
        createdAt: new Date().toISOString(),
      };
    },
  ),

  // ── Smart Boost Detector ────────────────────────────────────────────

  tool(
    'smart_boost_detector',
    'Analiza contenido reciente y detecta si algún post merece boost pagado.',
    {
      type: 'object',
      properties: {
        days: { type: 'number', default: 7, description: 'Días a analizar' },
        minScore: { type: 'number', default: 70, description: 'Score mínimo para recomendar boost' },
        minEngagementRate: { type: 'number', default: 0.05, description: 'Engagement rate mínimo (0.05 = 5%)' },
      },
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      const days = Number(i.days ?? 7);
      const minScore = Number(i.minScore ?? 70);
      const minEngagementRate = Number(i.minEngagementRate ?? 0.05);
      const mockPosts = [
        { contentId: 'post-1', format: 'reel', reach: 12500, engagement: 875, score: 82 },
        { contentId: 'post-2', format: 'carrusel', reach: 5400, engagement: 243, score: 58 },
        { contentId: 'post-3', format: 'reel', reach: 18900, engagement: 1512, score: 91 },
      ];
      const candidates = mockPosts
        .map((p) => ({ ...p, engagementRate: p.engagement / p.reach }))
        .filter((p) => p.score >= minScore && p.engagementRate >= minEngagementRate);
      return {
        periodDays: days,
        analyzed: mockPosts.length,
        candidates: candidates.map((c) => ({
          contentId: c.contentId,
          format: c.format,
          score: c.score,
          engagementRate: Math.round(c.engagementRate * 1000) / 1000,
          recommendedBudget: c.score > 85 ? 50 : 30,
          reason: `Score ${c.score}, engagement ${(c.engagementRate * 100).toFixed(1)}%`,
        })),
        recommendation:
          candidates.length > 0
            ? `Top performer: ${candidates[0]?.contentId} (score ${candidates[0]?.score}) — recomendado para boost`
            : 'Ningún post cumple criterios para boost',
      };
    },
  ),

  // ── Sprint 6: TikTok Native Tools ───────────────────────────────────

  tool(
    'tiktok_fetch_trends',
    'Obtiene tendencias de TikTok: sounds, hashtags, challenges, creators.',
    {
      type: 'object',
      properties: {
        region: str('Región (ej: global, US, LATAM)'),
        category: str('Categoría (dance, comedy, education, beauty)'),
        type: {
          type: 'string',
          enum: ['sound', 'hashtag', 'creator', 'challenge', 'effect', 'format'],
          description: 'Tipo de trend',
        },
        limit: { type: 'number', default: 20, description: 'Cantidad de resultados' },
      },
    },
    async (input, _brand) => fetchTikTokTrends(input as Record<string, unknown>),
  ),

  tool(
    'tiktok_get_sounds',
    'Obtiene trending sounds de TikTok filtrados por género y BPM.',
    {
      type: 'object',
      properties: {
        genre: str('Género musical'),
        minBpm: { type: 'number', description: 'BPM mínimo' },
        maxBpm: { type: 'number', description: 'BPM máximo' },
        limit: { type: 'number', default: 10 },
      },
    },
    async (input, _brand) => fetchTikTokSounds(input as Record<string, unknown>),
  ),

  tool(
    'tiktok_get_templates',
    'Lista templates nativos de TikTok optimizados para FYP.',
    {
      type: 'object',
      properties: {
        bestFor: str('Tipo de contenido (comedy, fashion, education)'),
        maxDifficulty: { type: 'string', enum: ['easy', 'medium', 'hard'], description: 'Dificultad máxima' },
      },
    },
    async (input, _brand) => listTemplates(input as Record<string, unknown>),
  ),

  tool(
    'tiktok_calculate_fyp_score',
    'Calcula el FYP score de un video de TikTok basado en métricas.',
    {
      type: 'object',
      properties: {
        completionRate: { type: 'number', description: 'Tasa de completion (0-1)' },
        watchTimePct: { type: 'number', description: 'Watch time % (0-1)' },
        fypReachPct: { type: 'number', description: 'FYP reach % (0-1)' },
        rewatchRate: { type: 'number', description: 'Rewatch rate (0-1)' },
        shareRate: { type: 'number', description: 'Share rate (0-1)' },
        commentRate: { type: 'number', description: 'Comment rate (0-1)' },
        saveRate: { type: 'number', description: 'Save rate (0-1)' },
        followsPerView: { type: 'number' },
        avgViewDurationSec: { type: 'number' },
        videoLengthSec: { type: 'number' },
      },
      required: [
        'completionRate',
        'watchTimePct',
        'fypReachPct',
        'rewatchRate',
        'shareRate',
        'commentRate',
        'saveRate',
      ],
    },
    async (input, _brand) =>
      calculateFYPScore({
        completionRate: Number((input as Record<string, unknown>).completionRate),
        watchTimePct: Number((input as Record<string, unknown>).watchTimePct),
        fypReachPct: Number((input as Record<string, unknown>).fypReachPct),
        rewatchRate: Number((input as Record<string, unknown>).rewatchRate),
        shareRate: Number((input as Record<string, unknown>).shareRate),
        commentRate: Number((input as Record<string, unknown>).commentRate),
        saveRate: Number((input as Record<string, unknown>).saveRate),
        followsPerView: Number((input as Record<string, unknown>).followsPerView ?? 0),
        avgViewDurationSec: Number((input as Record<string, unknown>).avgViewDurationSec ?? 0),
        videoLengthSec: Number((input as Record<string, unknown>).videoLengthSec ?? 15),
      }),
  ),

  tool(
    'tiktok_generate_optimization_plan',
    'Genera un plan de optimización para un video de TikTok basado en sus métricas.',
    {
      type: 'object',
      properties: {
        completionRate: { type: 'number' },
        watchTimePct: { type: 'number' },
        fypReachPct: { type: 'number' },
        rewatchRate: { type: 'number' },
        shareRate: { type: 'number' },
        commentRate: { type: 'number' },
        saveRate: { type: 'number' },
        videoLengthSec: { type: 'number' },
      },
      required: [
        'completionRate',
        'watchTimePct',
        'fypReachPct',
        'rewatchRate',
        'shareRate',
        'commentRate',
        'saveRate',
      ],
    },
    async (input, _brand) =>
      generateOptimizationPlan({
        completionRate: Number((input as Record<string, unknown>).completionRate),
        watchTimePct: Number((input as Record<string, unknown>).watchTimePct),
        fypReachPct: Number((input as Record<string, unknown>).fypReachPct),
        rewatchRate: Number((input as Record<string, unknown>).rewatchRate),
        shareRate: Number((input as Record<string, unknown>).shareRate),
        commentRate: Number((input as Record<string, unknown>).commentRate),
        saveRate: Number((input as Record<string, unknown>).saveRate),
        followsPerView: Number((input as Record<string, unknown>).followsPerView ?? 0),
        avgViewDurationSec: Number((input as Record<string, unknown>).avgViewDurationSec ?? 0),
        videoLengthSec: Number((input as Record<string, unknown>).videoLengthSec ?? 15),
      }),
  ),

  tool(
    'tiktok_get_blueprint',
    'Genera un blueprint de video para TikTok basado en un template.',
    {
      type: 'object',
      properties: {
        templateId: str('ID del template'),
        topic: str('Tema del video'),
      },
      required: ['templateId', 'topic'],
    },
    async (input, _brand) =>
      generateBlueprint(
        String((input as Record<string, unknown>).templateId),
        String((input as Record<string, unknown>).topic),
      ),
  ),

  tool(
    'tiktok_detect_beats',
    'Detecta beats y drops en un audio para sincronización.',
    {
      type: 'object',
      properties: {
        audioUrl: str('URL o ID del audio'),
      },
      required: ['audioUrl'],
    },
    async (input, _brand) => detectBeats(String((input as Record<string, unknown>).audioUrl)),
  ),

  tool(
    'tiktok_generate_sync_points',
    'Genera puntos de sync (cortes, transiciones) basados en el beat map.',
    {
      type: 'object',
      properties: {
        bpm: { type: 'number' },
        durationSec: { type: 'number' },
        beats: { type: 'array', items: { type: 'object' } },
        drops: { type: 'array', items: { type: 'object' } },
      },
      required: ['bpm', 'durationSec', 'beats', 'drops'],
    },
    async (input, _brand) => generateSyncPoints(input as unknown as Parameters<typeof generateSyncPoints>[0]),
  ),

  tool(
    'tiktok_generate_edl',
    'Genera un Edit Decision List (EDL) para edición basada en sync points.',
    {
      type: 'object',
      properties: {
        videoDuration: { type: 'number' },
        syncPoints: { type: 'array', items: { type: 'object' } },
      },
      required: ['videoDuration', 'syncPoints'],
    },
    async (input, _brand) =>
      generateEDL(
        Number((input as Record<string, unknown>).videoDuration),
        (input as Record<string, unknown>).syncPoints as Parameters<typeof generateEDL>[1],
      ),
  ),

  // ── Sprint 6: Audio AI Tools ────────────────────────────────────────

  tool(
    'audio_generate_music',
    'Genera música original con AI para reels o TikTok.',
    {
      type: 'object',
      properties: {
        prompt: str('Descripción de la música deseada'),
        style: str('Estilo musical'),
        durationSec: { type: 'number', default: 15 },
        tempo: { type: 'string', enum: ['slow', 'medium', 'fast'], default: 'medium' },
        mood: {
          type: 'string',
          enum: ['energetic', 'chill', 'epic', 'emotional', 'upbeat', 'dark'],
          default: 'upbeat',
        },
        instrumental: { type: 'boolean', default: true },
      },
      required: ['prompt'],
    },
    async (input, _brand) =>
      generateMusic({
        prompt: String((input as Record<string, unknown>).prompt),
        style: (input as Record<string, unknown>).style as string | undefined,
        durationSec: (input as Record<string, unknown>).durationSec as number | undefined,
        tempo: (input as Record<string, unknown>).tempo as 'slow' | 'medium' | 'fast' | undefined,
        mood: (input as Record<string, unknown>).mood as
          | 'energetic'
          | 'chill'
          | 'epic'
          | 'emotional'
          | 'upbeat'
          | 'dark'
          | undefined,
        instrumental: (input as Record<string, unknown>).instrumental as boolean | undefined,
      }),
  ),

  tool(
    'audio_generate_sfx',
    'Genera efectos de sonido con AI.',
    {
      type: 'object',
      properties: {
        description: str('Descripción del SFX'),
        durationSec: { type: 'number', default: 2 },
        intensity: { type: 'string', enum: ['low', 'medium', 'high'], default: 'medium' },
      },
      required: ['description'],
    },
    async (input, _brand) =>
      generateSFX({
        description: String((input as Record<string, unknown>).description),
        durationSec: (input as Record<string, unknown>).durationSec as number | undefined,
        intensity: (input as Record<string, unknown>).intensity as 'low' | 'medium' | 'high' | undefined,
      }),
  ),

  tool(
    'audio_synthesize_speech',
    'Convierte texto a voz con una voz de marca.',
    {
      type: 'object',
      properties: {
        text: str('Texto a convertir'),
        voiceId: str('ID de la voz'),
        speed: { type: 'number', default: 1.0 },
      },
      required: ['text', 'voiceId'],
    },
    async (input, _brand) =>
      synthesizeSpeech({
        text: String((input as Record<string, unknown>).text),
        voiceId: String((input as Record<string, unknown>).voiceId),
        speed: (input as Record<string, unknown>).speed as number | undefined,
      }),
  ),

  tool(
    'audio_clone_voice',
    'Clona una voz a partir de muestras de audio.',
    {
      type: 'object',
      properties: {
        name: str('Nombre de la voz'),
        samples: { type: 'array', items: { type: 'string' }, description: 'URLs de muestras de audio' },
      },
      required: ['name', 'samples'],
    },
    async (input, _brand) =>
      cloneVoice(
        String((input as Record<string, unknown>).name),
        (input as Record<string, unknown>).samples as string[],
      ),
  ),

  tool(
    'audio_list_voices',
    'Lista las voces de marca disponibles.',
    { type: 'object', properties: {} },
    async (_input, _brand) => listBrandVoices(),
  ),

  tool(
    'audio_generate_voiceover',
    'Genera un voiceover para un script usando la voz de marca.',
    {
      type: 'object',
      properties: {
        script: str('Script a narrar'),
        voiceId: str('ID de voz (opcional)'),
      },
      required: ['script'],
    },
    async (input, _brand) =>
      generateVoiceoverForScript(
        String((input as Record<string, unknown>).script),
        (input as Record<string, unknown>).voiceId as string | undefined,
      ),
  ),

  tool(
    'audio_dub_video',
    'Dobla un video a otro idioma.',
    {
      type: 'object',
      properties: {
        script: str('Script original'),
        targetLanguage: str('Idioma destino (es-AR, en-US, pt-BR)'),
        voiceId: str('ID de voz (opcional)'),
      },
      required: ['script', 'targetLanguage'],
    },
    async (input, _brand) =>
      dubVideo({
        sourceLanguage: 'auto',
        targetLanguage: String((input as Record<string, unknown>).targetLanguage),
        script: String((input as Record<string, unknown>).script),
        voiceId: (input as Record<string, unknown>).voiceId as string | undefined,
      }),
  ),

  tool(
    'audio_create_sound_design',
    'Crea un proyecto de sound design completo para un video.',
    {
      type: 'object',
      properties: {
        name: str('Nombre del proyecto'),
        durationSec: { type: 'number' },
        videoType: { type: 'string', enum: ['reel', 'tiktok'], default: 'reel' },
        topic: str('Tema del video'),
        hasVoiceover: { type: 'boolean', default: false },
      },
      required: ['name', 'durationSec', 'topic'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      const recipe = autoDesignForVideo(
        (i.videoType as 'reel' | 'tiktok') ?? 'reel',
        Number(i.durationSec),
        String(i.topic),
        Boolean(i.hasVoiceover),
      );
      return { recipe, project: createSoundDesign(String(i.name), Number(i.durationSec)) };
    },
  ),

  tool(
    'audio_get_recipe',
    'Obtiene una receta de sound design por nombre o formato.',
    {
      type: 'object',
      properties: {
        name: str('Nombre de la receta'),
        forFormat: { type: 'string', enum: ['reel', 'tiktok', 'story', 'youtube_short'] },
      },
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      if (i.name) return getRecipe(String(i.name));
      return listRecipes(i.forFormat as string | undefined);
    },
  ),

  tool(
    'audio_get_sfx_preset',
    'Obtiene un SFX preset por nombre.',
    {
      type: 'object',
      properties: { name: str('Nombre del preset: whoosh, pop, bass_drop, glitch, snap') },
      required: ['name'],
    },
    async (input, _brand) => getSFXPreset(String((input as Record<string, unknown>).name)),
  ),

  // ── Sprint 7: Neural Brain + Vector DB ──────────────────────────────

  tool(
    'neural_attention_rank',
    'Rankea tareas por attention score para decidir qué hacer primero.',
    {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taskId: str('ID de la tarea'),
              agentId: str('ID del agente'),
              goal: str('Objetivo'),
              urgency: { type: 'number', minimum: 1, maximum: 10 },
              impact: { type: 'number', minimum: 1, maximum: 10 },
              effort: { type: 'number', minimum: 1, maximum: 10 },
              contextRelevance: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['taskId', 'agentId', 'goal', 'urgency', 'impact', 'effort', 'contextRelevance'],
          },
        },
      },
      required: ['requests'],
    },
    async (input, _brand) => rankTasks((input as Record<string, unknown>).requests as Parameters<typeof rankTasks>[0]),
  ),

  tool(
    'neural_attention_select',
    'Selecciona la tarea con mayor attention score.',
    {
      type: 'object',
      properties: {
        requests: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              taskId: str('ID de la tarea'),
              agentId: str('ID del agente'),
              goal: str('Objetivo'),
              urgency: { type: 'number', minimum: 1, maximum: 10 },
              impact: { type: 'number', minimum: 1, maximum: 10 },
              effort: { type: 'number', minimum: 1, maximum: 10 },
              contextRelevance: { type: 'number', minimum: 0, maximum: 1 },
            },
            required: ['taskId', 'agentId', 'goal', 'urgency', 'impact', 'effort', 'contextRelevance'],
          },
        },
      },
      required: ['requests'],
    },
    async (input, _brand) =>
      selectTopTask((input as Record<string, unknown>).requests as Parameters<typeof selectTopTask>[0]),
  ),

  tool(
    'neural_memory_record',
    'Registra una memoria episódica o semántica en el cerebro neural.',
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['episodic', 'semantic'], description: 'Tipo de memoria' },
        agentId: str('ID del agente'),
        taskId: str('ID de la tarea'),
        action: str('Acción realizada'),
        outcome: { type: 'string', enum: ['success', 'partial', 'failure'] },
        context: str('Contexto'),
        tags: { type: 'array', items: { type: 'string' } },
        importance: { type: 'number', minimum: 0, maximum: 1 },
        concept: str('Concepto (solo semántica)'),
        definition: str('Definición (solo semántica)'),
      },
      required: ['type', 'agentId'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      if (i.type === 'episodic') {
        return recordEpisodic({
          agentId: String(i.agentId),
          taskId: String(i.taskId ?? 'unknown'),
          action: String(i.action ?? 'unknown'),
          outcome: (i.outcome as 'success' | 'partial' | 'failure') ?? 'partial',
          context: String(i.context ?? ''),
          tags: (i.tags as string[]) ?? [],
          importance: Number(i.importance ?? 0.5),
        });
      }
      return recordSemantic({
        concept: String(i.concept ?? 'unknown'),
        definition: String(i.definition ?? ''),
        relationships: [],
        source: String(i.agentId),
        confidence: Number(i.importance ?? 0.5),
      });
    },
  ),

  tool(
    'neural_memory_recall',
    'Recupera memorias episódicas o semánticas del cerebro neural.',
    {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['episodic', 'semantic'], description: 'Tipo de memoria' },
        agentId: str('Filtrar por agente'),
        tags: { type: 'array', items: { type: 'string' } },
        conceptQuery: str('Buscar concepto (solo semántica)'),
        limit: { type: 'number', default: 10 },
      },
      required: ['type'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      if (i.type === 'episodic') {
        return recallEpisodic({
          agentId: i.agentId as string | undefined,
          tags: i.tags as string[] | undefined,
          limit: Number(i.limit ?? 10),
        });
      }
      return recallSemantic(String(i.conceptQuery ?? ''), Number(i.limit ?? 5));
    },
  ),

  tool(
    'neural_memory_stats',
    'Obtiene estadísticas de la memoria neural.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getMemoryStats(),
  ),

  tool(
    'neural_learning_record',
    'Registra un outcome para el learning loop.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        strategy: str('Estrategia usada'),
        context: str('Contexto'),
        outcome: { type: 'number', minimum: 0, maximum: 100 },
        lesson: str('Lección aprendida'),
      },
      required: ['agentId', 'strategy', 'context', 'outcome', 'lesson'],
    },
    async (input, _brand) =>
      recordOutcome({
        agentId: String((input as Record<string, unknown>).agentId),
        strategy: String((input as Record<string, unknown>).strategy),
        context: String((input as Record<string, unknown>).context),
        outcome: Number((input as Record<string, unknown>).outcome),
        lesson: String((input as Record<string, unknown>).lesson),
      }),
  ),

  tool(
    'neural_learning_analyze',
    'Analiza performance de estrategias del learning loop.',
    {
      type: 'object',
      properties: { agentId: str('Filtrar por agente') },
    },
    async (input, _brand) =>
      analyzeStrategyPerformance((input as Record<string, unknown>).agentId as string | undefined),
  ),

  tool(
    'neural_focus_start',
    'Inicia una ventana de foco para una tarea.',
    {
      type: 'object',
      properties: {
        taskId: str('ID de la tarea'),
        agentId: str('ID del agente'),
        estimatedMin: { type: 'number', default: 15 },
      },
      required: ['taskId', 'agentId'],
    },
    async (input, _brand) =>
      startFocus(
        String((input as Record<string, unknown>).taskId),
        String((input as Record<string, unknown>).agentId),
        Number((input as Record<string, unknown>).estimatedMin ?? 15),
      ),
  ),

  tool(
    'neural_focus_end',
    'Finaliza una ventana de foco.',
    {
      type: 'object',
      properties: { taskId: str('ID de la tarea') },
      required: ['taskId'],
    },
    async (input, _brand) => endFocus(String((input as Record<string, unknown>).taskId)),
  ),

  tool(
    'neural_focus_interrupt',
    'Interrumpe una ventana de foco (ej: alerta urgente).',
    {
      type: 'object',
      properties: {
        taskId: str('ID de la tarea'),
        reason: str('Razón de la interrupción'),
      },
      required: ['taskId', 'reason'],
    },
    async (input, _brand) =>
      interruptFocus(
        String((input as Record<string, unknown>).taskId),
        String((input as Record<string, unknown>).reason),
      ),
  ),

  // ── Vector DB / RAG Tools ───────────────────────────────────────────

  tool(
    'vector_store_add',
    'Agrega un documento al vector store para búsqueda semántica.',
    {
      type: 'object',
      properties: {
        text: str('Texto del documento'),
        metadata: { type: 'object', description: 'Metadatos asociados' },
      },
      required: ['text'],
    },
    async (input, _brand) =>
      addDocument({
        text: String((input as Record<string, unknown>).text),
        metadata: ((input as Record<string, unknown>).metadata as Record<string, unknown> | undefined) ?? {},
      }),
  ),

  tool(
    'vector_store_query',
    'Busca documentos similares en el vector store.',
    {
      type: 'object',
      properties: {
        query: str('Texto de búsqueda'),
        topK: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
    async (input, _brand) =>
      querySimilar(String((input as Record<string, unknown>).query), {
        topK: Number((input as Record<string, unknown>).topK ?? 5),
      }),
  ),

  tool(
    'vector_store_stats',
    'Obtiene estadísticas del vector store.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getCollectionStats(),
  ),

  tool(
    'rag_query',
    'Consulta la knowledge base usando RAG.',
    {
      type: 'object',
      properties: {
        question: str('Pregunta'),
        topK: { type: 'number', default: 5 },
      },
      required: ['question'],
    },
    async (input, _brand) =>
      queryRAG({
        question: String((input as Record<string, unknown>).question),
        topK: Number((input as Record<string, unknown>).topK ?? 5),
      }),
  ),

  tool(
    'rag_ingest_knowledge',
    'Ingesta conocimiento a la knowledge base (texto largo, auto-chunking).',
    {
      type: 'object',
      properties: {
        text: str('Texto a ingestar'),
        source: str('Fuente del conocimiento'),
        chunkSize: { type: 'number', default: 500 },
      },
      required: ['text', 'source'],
    },
    async (input, _brand) =>
      ingestKnowledge({
        text: String((input as Record<string, unknown>).text),
        source: String((input as Record<string, unknown>).source),
        chunkSize: Number((input as Record<string, unknown>).chunkSize ?? 500),
      }),
  ),

  tool(
    'rag_ingest_faq',
    'Ingesta FAQs a la knowledge base.',
    {
      type: 'object',
      properties: {
        faqs: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: str('Pregunta'),
              answer: str('Respuesta'),
              category: str('Categoría'),
            },
            required: ['question', 'answer'],
          },
        },
      },
      required: ['faqs'],
    },
    async (input, _brand) =>
      ingestFAQ(
        (input as Record<string, unknown>).faqs as Array<{ question: string; answer: string; category?: string }>,
      ),
  ),

  tool(
    'semantic_search',
    'Búsqueda semántica en contenido histórico.',
    {
      type: 'object',
      properties: {
        query: str('Query de búsqueda'),
        type: { type: 'string', enum: ['post', 'comment', 'dm', 'brief', 'caption', 'hashtag'] },
        limit: { type: 'number', default: 5 },
      },
      required: ['query'],
    },
    async (input, _brand) =>
      searchSimilar(String((input as Record<string, unknown>).query), {
        type: (input as Record<string, unknown>).type as string | undefined,
        limit: Number((input as Record<string, unknown>).limit ?? 5),
      }),
  ),

  // ── Sprint 8: Agent Swarm + Predictive ML ───────────────────────────

  tool(
    'swarm_create',
    'Crea un swarm de agentes para una meta compleja.',
    {
      type: 'object',
      properties: {
        goal: str('Meta del swarm'),
        tasks: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: str('ID de la tarea'),
              goal: str('Goal de la tarea'),
              agentId: str('ID del agente'),
              priority: { type: 'number', minimum: 1, maximum: 10 },
              dependencies: { type: 'array', items: { type: 'string' } },
            },
            required: ['id', 'goal', 'agentId', 'priority'],
          },
        },
      },
      required: ['goal', 'tasks'],
    },
    async (input, _brand) =>
      createSwarm(
        String((input as Record<string, unknown>).goal),
        (input as Record<string, unknown>).tasks as Parameters<typeof createSwarm>[1],
      ),
  ),

  tool(
    'swarm_run',
    'Ejecuta un swarm creado previamente.',
    {
      type: 'object',
      properties: { runId: str('ID del swarm run') },
      required: ['runId'],
    },
    async (input, _brand) => {
      const { runAgentTask } = await import('./orchestrator.js');
      return runSwarm(String((input as Record<string, unknown>).runId), async (task) => {
        const agent = getAgent(task.agentId);
        if (!agent) throw new Error(`Agent ${task.agentId} not found`);
        return runAgentTask(_brand, agent, task.goal, task.id);
      });
    },
  ),

  tool(
    'swarm_status',
    'Obtiene el estado de un swarm run.',
    {
      type: 'object',
      properties: { runId: str('ID del swarm run') },
      required: ['runId'],
    },
    async (input, _brand) => getSwarmStatus(String((input as Record<string, unknown>).runId)),
  ),

  tool(
    'swarm_list',
    'Lista los últimos swarm runs.',
    {
      type: 'object',
      properties: { limit: { type: 'number', default: 10 } },
    },
    async (input, _brand) => listSwarms(Number((input as Record<string, unknown>).limit ?? 10)),
  ),

  tool(
    'swarm_consensus',
    'Resuelve consenso entre agentes sobre un topic.',
    {
      type: 'object',
      properties: {
        topic: str('Topic a decidir'),
        options: { type: 'array', items: { type: 'string' } },
        votes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              agentId: str('ID del agente'),
              option: str('Opción elegida'),
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              reasoning: str('Razonamiento'),
            },
            required: ['agentId', 'option', 'confidence', 'reasoning'],
          },
        },
      },
      required: ['topic', 'options', 'votes'],
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      let proposal = proposeConsensus(String(i.topic), i.options as string[]);
      for (const vote of i.votes as Array<{ agentId: string; option: string; confidence: number; reasoning: string }>) {
        proposal = castVote(proposal, vote.agentId, vote.option, vote.confidence, vote.reasoning);
      }
      return resolveConsensus(proposal);
    },
  ),

  tool(
    'decompose_task',
    'Descompone una tarea compleja en sub-tareas para agentes.',
    {
      type: 'object',
      properties: { goal: str('Tarea a descomponer') },
      required: ['goal'],
    },
    async (input, _brand) => decomposeTask(String((input as Record<string, unknown>).goal)),
  ),

  tool(
    'agent_message',
    'Envía un mensaje entre agentes vía el message bus.',
    {
      type: 'object',
      properties: {
        channel: str('Canal del mensaje'),
        fromAgentId: str('Agente emisor'),
        payload: str('Payload del mensaje'),
        toAgentId: str('Agente receptor (opcional, broadcast si no)'),
        priority: { type: 'number', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['channel', 'fromAgentId', 'payload'],
    },
    async (input, _brand) =>
      publishMessage(
        String((input as Record<string, unknown>).channel),
        String((input as Record<string, unknown>).fromAgentId),
        String((input as Record<string, unknown>).payload),
        {
          toAgentId: (input as Record<string, unknown>).toAgentId as string | undefined,
          priority: Number((input as Record<string, unknown>).priority ?? 5),
        },
      ),
  ),

  tool(
    'predict_performance',
    'Predice performance de contenido antes de publicar.',
    {
      type: 'object',
      properties: {
        format: { type: 'string', enum: ['reel', 'carousel', 'post', 'story', 'tiktok'] },
        hookStrength: { type: 'number', minimum: 0, maximum: 1 },
        hasCta: { type: 'boolean' },
        videoLengthSec: { type: 'number' },
        hashtagCount: { type: 'number' },
        aestheticScore: { type: 'number', minimum: 0, maximum: 1 },
        audioType: { type: 'string', enum: ['music', 'voiceover', 'trending', 'none'] },
      },
      required: ['format'],
    },
    async (input, _brand) =>
      predictPerformance({
        format: (input as Record<string, unknown>).format as 'reel' | 'carousel' | 'post' | 'story' | 'tiktok',
        hookStrength: Number((input as Record<string, unknown>).hookStrength ?? 0.5),
        hasCta: Boolean((input as Record<string, unknown>).hasCta),
        videoLengthSec: (input as Record<string, unknown>).videoLengthSec as number | undefined,
        hashtagCount: Number((input as Record<string, unknown>).hashtagCount ?? 5),
        aestheticScore: Number((input as Record<string, unknown>).aestheticScore ?? 0.5),
        audioType: (input as Record<string, unknown>).audioType as
          | 'music'
          | 'voiceover'
          | 'trending'
          | 'none'
          | undefined,
      }),
  ),

  tool(
    'predict_engagement',
    'Calcula el engagement score de la marca.',
    {
      type: 'object',
      properties: {
        followerCount: { type: 'number' },
        avgLikesLast10: { type: 'number' },
        avgCommentsLast10: { type: 'number' },
        avgSavesLast10: { type: 'number' },
        postFrequency7d: { type: 'number' },
        replyRate: { type: 'number', minimum: 0, maximum: 1 },
        storyFrequency7d: { type: 'number' },
        collaborationCount30d: { type: 'number' },
      },
      required: ['followerCount', 'avgLikesLast10', 'avgCommentsLast10', 'avgSavesLast10'],
    },
    async (input, _brand) =>
      calculateEngagementScore({
        followerCount: Number((input as Record<string, unknown>).followerCount),
        avgLikesLast10: Number((input as Record<string, unknown>).avgLikesLast10),
        avgCommentsLast10: Number((input as Record<string, unknown>).avgCommentsLast10),
        avgSavesLast10: Number((input as Record<string, unknown>).avgSavesLast10),
        postFrequency7d: Number((input as Record<string, unknown>).postFrequency7d ?? 0),
        replyRate: Number((input as Record<string, unknown>).replyRate ?? 0),
        storyFrequency7d: Number((input as Record<string, unknown>).storyFrequency7d ?? 0),
        collaborationCount30d: Number((input as Record<string, unknown>).collaborationCount30d ?? 0),
      }),
  ),

  tool(
    'forecast_trends',
    'Predice tendencias basado en historial de menciones.',
    {
      type: 'object',
      properties: {
        topic: str('Topic a predecir'),
        history: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: str('Fecha ISO'),
              mentions: { type: 'number' },
              engagement: { type: 'number' },
              velocity: { type: 'number' },
            },
            required: ['date', 'mentions', 'engagement', 'velocity'],
          },
        },
      },
      required: ['topic', 'history'],
    },
    async (input, _brand) =>
      forecastTrend(
        String((input as Record<string, unknown>).topic),
        (input as Record<string, unknown>).history as Array<{
          date: string;
          mentions: number;
          engagement: number;
          velocity: number;
        }>,
      ),
  ),

  tool(
    'detect_anomalies',
    'Detecta anomalías en series de métricas.',
    {
      type: 'object',
      properties: {
        metricName: str('Nombre de la métrica'),
        values: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              date: str('Fecha ISO'),
              value: { type: 'number' },
            },
            required: ['date', 'value'],
          },
        },
        thresholdStdDev: { type: 'number', default: 2 },
      },
      required: ['metricName', 'values'],
    },
    async (input, _brand) =>
      detectPredictiveAnomalies(
        {
          metricName: String((input as Record<string, unknown>).metricName),
          values: (input as Record<string, unknown>).values as Array<{ date: string; value: number }>,
        },
        Number((input as Record<string, unknown>).thresholdStdDev ?? 2),
      ),
  ),

  tool(
    'benchmark_engagement',
    'Obtiene benchmarks de engagement para un nicho.',
    {
      type: 'object',
      properties: { niche: str('Nicho a benchmarkear') },
      required: ['niche'],
    },
    async (input, _brand) => benchmarkEngagement(String((input as Record<string, unknown>).niche)),
  ),

  // ── Sprint 9: Real-Time Infrastructure ──────────────────────────────

  tool(
    'realtime_publish_event',
    'Publica un evento en el event bus.',
    {
      type: 'object',
      properties: {
        topic: str('Topic del evento'),
        payload: str('Payload JSON'),
        source: str('Fuente del evento'),
        priority: { type: 'number', minimum: 1, maximum: 10, default: 5 },
      },
      required: ['topic', 'payload'],
    },
    async (input, _brand) =>
      publishEvent(
        String((input as Record<string, unknown>).topic),
        JSON.parse(String((input as Record<string, unknown>).payload)),
        {
          source: (input as Record<string, unknown>).source as string | undefined,
          priority: Number((input as Record<string, unknown>).priority ?? 5),
        },
      ),
  ),

  tool(
    'realtime_subscribe',
    'Subscribe a un topic del event bus. Devuelve subscriptionId.',
    {
      type: 'object',
      properties: { topic: str('Topic a suscribir') },
      required: ['topic'],
    },
    async (input, _brand) => {
      const subId = subscribeTopic(String((input as Record<string, unknown>).topic), () => {
        /* callback no-op for tool */
      });
      return { subscriptionId: subId };
    },
  ),

  tool(
    'realtime_get_events',
    'Obtiene historial de eventos del bus.',
    {
      type: 'object',
      properties: {
        topic: str('Filtrar por topic'),
        source: str('Filtrar por source'),
        limit: { type: 'number', default: 50 },
        since: str('Desde fecha ISO'),
      },
    },
    async (input, _brand) =>
      getEventHistory({
        topic: (input as Record<string, unknown>).topic as string | undefined,
        source: (input as Record<string, unknown>).source as string | undefined,
        limit: Number((input as Record<string, unknown>).limit ?? 50),
        since: (input as Record<string, unknown>).since as string | undefined,
      }),
  ),

  tool(
    'websocket_broadcast',
    'Broadcast un mensaje a clientes WebSocket conectados.',
    {
      type: 'object',
      properties: {
        channel: str('Canal'),
        payload: str('Payload JSON'),
      },
      required: ['channel', 'payload'],
    },
    async (input, _brand) => {
      const count = wsBroadcast(
        String((input as Record<string, unknown>).channel),
        JSON.parse(String((input as Record<string, unknown>).payload)),
      );
      return { clientsReached: count };
    },
  ),

  tool(
    'websocket_get_connections',
    'Obtiene estadísticas de conexiones WebSocket.',
    { type: 'object', properties: {} },
    async (_input, _brand) => getConnections(),
  ),

  tool(
    'sse_emit',
    'Emite un evento SSE a clientes conectados.',
    {
      type: 'object',
      properties: {
        channel: str('Canal SSE'),
        event: str('Nombre del evento'),
        data: str('Data JSON'),
      },
      required: ['channel', 'event', 'data'],
    },
    async (input, _brand) =>
      sseEmit(
        String((input as Record<string, unknown>).channel),
        String((input as Record<string, unknown>).event),
        JSON.parse(String((input as Record<string, unknown>).data)),
      ),
  ),

  tool(
    'live_stream_start',
    'Inicia un live stream de acciones de agentes.',
    {
      type: 'object',
      properties: {
        label: str('Label del stream'),
        agentFilter: { type: 'array', items: { type: 'string' } },
      },
      required: ['label'],
    },
    async (input, _brand) =>
      startStream(
        String((input as Record<string, unknown>).label),
        (input as Record<string, unknown>).agentFilter as string[] | undefined,
      ),
  ),

  tool(
    'live_stream_status',
    'Obtiene estado y stats de un live stream.',
    {
      type: 'object',
      properties: { streamId: str('ID del stream') },
      required: ['streamId'],
    },
    async (input, _brand) => {
      const streamId = String((input as Record<string, unknown>).streamId);
      const stream = getStream(streamId);
      const stats = getStreamStats(streamId);
      return { stream, stats };
    },
  ),

  tool(
    'webhook_register',
    'Registra un nuevo endpoint de webhook.',
    {
      type: 'object',
      properties: {
        path: str('Path del webhook'),
        source: str('Fuente externa'),
        secret: str('Secret para validación'),
      },
      required: ['path', 'source'],
    },
    async (input, _brand) =>
      registerEndpoint(
        String((input as Record<string, unknown>).path),
        String((input as Record<string, unknown>).source),
        (input as Record<string, unknown>).secret as string | undefined,
      ),
  ),

  tool(
    'webhook_receive',
    'Simula recepción de un webhook.',
    {
      type: 'object',
      properties: {
        endpointId: str('ID del endpoint'),
        payload: str('Payload JSON'),
        signature: str('Signature para validar'),
      },
      required: ['endpointId', 'payload'],
    },
    async (input, _brand) =>
      receiveWebhook(
        String((input as Record<string, unknown>).endpointId),
        JSON.parse(String((input as Record<string, unknown>).payload)),
        (input as Record<string, unknown>).signature as string | undefined,
      ),
  ),

  tool(
    'webhook_list',
    'Lista endpoints y deliveries de webhooks.',
    {
      type: 'object',
      properties: {
        endpointId: str('Filtrar por endpoint'),
        status: str('Filtrar por status'),
        limit: { type: 'number', default: 50 },
      },
    },
    async (input, _brand) => {
      const i = input as Record<string, unknown>;
      return {
        endpoints: listEndpoints(),
        deliveries: listDeliveries({
          endpointId: i.endpointId as string | undefined,
          status: i.status as string | undefined,
          limit: Number(i.limit ?? 50),
        }),
      };
    },
  ),

  tool(
    'webhook_retry',
    'Reintenta un delivery de webhook fallido.',
    {
      type: 'object',
      properties: { deliveryId: str('ID del delivery') },
      required: ['deliveryId'],
    },
    async (input, _brand) => retryDelivery(String((input as Record<string, unknown>).deliveryId)),
  ),

  tool(
    'webhook_stats',
    'Obtiene estadísticas de un endpoint de webhook.',
    {
      type: 'object',
      properties: { endpointId: str('ID del endpoint') },
      required: ['endpointId'],
    },
    async (input, _brand) => getEndpointStats(String((input as Record<string, unknown>).endpointId)),
  ),

  tool(
    'push_notify',
    'Envía una notificación push.',
    {
      type: 'object',
      properties: {
        title: str('Título'),
        body: str('Cuerpo'),
        channel: str('Canal'),
        priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'], default: 'normal' },
      },
      required: ['title', 'body', 'channel'],
    },
    async (input, _brand) =>
      sendPush(
        String((input as Record<string, unknown>).title),
        String((input as Record<string, unknown>).body),
        String((input as Record<string, unknown>).channel),
        { priority: (input as Record<string, unknown>).priority as 'low' | 'normal' | 'high' | 'urgent' | undefined },
      ),
  ),

  tool(
    'health_pulse',
    'Registra un pulso de salud del sistema.',
    {
      type: 'object',
      properties: {
        cpuLoad: { type: 'number', default: 30 },
        memoryUsageMb: { type: 'number', default: 128 },
        activeAgents: { type: 'number', default: 5 },
        pendingTasks: { type: 'number', default: 0 },
        failedTasksLastHour: { type: 'number', default: 0 },
        avgResponseTimeMs: { type: 'number', default: 200 },
      },
    },
    async (input, _brand) =>
      recordPulse({
        cpuLoad: Number((input as Record<string, unknown>).cpuLoad ?? 30),
        memoryUsageMb: Number((input as Record<string, unknown>).memoryUsageMb ?? 128),
        activeAgents: Number((input as Record<string, unknown>).activeAgents ?? 5),
        pendingTasks: Number((input as Record<string, unknown>).pendingTasks ?? 0),
        failedTasksLastHour: Number((input as Record<string, unknown>).failedTasksLastHour ?? 0),
        avgResponseTimeMs: Number((input as Record<string, unknown>).avgResponseTimeMs ?? 200),
      }),
  ),

  tool(
    'realtime_metrics',
    'Obtiene métricas en tiempo real y snapshot del dashboard.',
    {
      type: 'object',
      properties: {
        metric: str('Nombre de la métrica'),
        windowSec: { type: 'number', default: 60 },
      },
    },
    async (input, _brand) => {
      const metric = (input as Record<string, unknown>).metric as string | undefined;
      const windowSec = Number((input as Record<string, unknown>).windowSec ?? 60);
      return {
        dashboard: getDashboardSnapshot(),
        window: metric ? getWindow(metric, windowSec) : undefined,
      };
    },
  ),

  // ── Sprint 10: Computer Vision ──────────────────────────────────────

  tool(
    'vision_analyze_image',
    'Analiza una imagen: formato, calidad, colores, composición, y recomendaciones.',
    {
      type: 'object',
      properties: {
        imageUrl: str('URL de la imagen'),
        width: { type: 'number' },
        height: { type: 'number' },
      },
      required: ['imageUrl'],
    },
    async (input, _brand) =>
      analyzeImage(String((input as Record<string, unknown>).imageUrl), {
        width: (input as Record<string, unknown>).width as number | undefined,
        height: (input as Record<string, unknown>).height as number | undefined,
      }),
  ),

  tool(
    'vision_detect_objects',
    'Detecta objetos, escenas, y elementos clave en una imagen.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => detectObjects(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_extract_text',
    'Extrae texto de una imagen usando OCR.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => extractText(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_analyze_faces',
    'Analiza rostros y emociones en una imagen.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => analyzeFaces(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_compare_images',
    'Compara dos imágenes y devuelve similitud y recomendación.',
    {
      type: 'object',
      properties: {
        imageUrlA: str('URL imagen A'),
        imageUrlB: str('URL imagen B'),
      },
      required: ['imageUrlA', 'imageUrlB'],
    },
    async (input, _brand) =>
      compareImages(
        String((input as Record<string, unknown>).imageUrlA),
        String((input as Record<string, unknown>).imageUrlB),
      ),
  ),

  tool(
    'vision_auto_caption',
    'Genera caption automático basado en análisis visual.',
    {
      type: 'object',
      properties: {
        imageUrl: str('URL de la imagen'),
        brandName: str('Nombre de la marca'),
        scene: str('Tipo de escena opcional'),
      },
      required: ['imageUrl', 'brandName'],
    },
    async (input, _brand) =>
      generateAutoCaption(
        String((input as Record<string, unknown>).imageUrl),
        String((input as Record<string, unknown>).brandName),
        (input as Record<string, unknown>).scene as string | undefined,
      ),
  ),

  tool(
    'vision_moderate_image',
    'Modera una imagen: detecta contenido no seguro y flags.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => moderateImage(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_extract_palette',
    'Extrae la paleta de colores de una imagen.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => extractPalette(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_check_brand_colors',
    'Verifica consistencia de colores de marca en una imagen.',
    {
      type: 'object',
      properties: {
        imageUrl: str('URL de la imagen'),
        brandColors: { type: 'array', items: { type: 'string' } },
      },
      required: ['imageUrl', 'brandColors'],
    },
    async (input, _brand) =>
      checkBrandColors(
        String((input as Record<string, unknown>).imageUrl),
        (input as Record<string, unknown>).brandColors as string[],
      ),
  ),

  tool(
    'vision_batch_analyze',
    'Analiza múltiples imágenes en batch.',
    {
      type: 'object',
      properties: {
        imageUrls: { type: 'array', items: { type: 'string' } },
      },
      required: ['imageUrls'],
    },
    async (input, _brand) => batchAnalyzeImages((input as Record<string, unknown>).imageUrls as string[]),
  ),

  tool(
    'vision_find_similar',
    'Encuentra imágenes similares a una imagen de referencia.',
    {
      type: 'object',
      properties: {
        queryUrl: str('URL de referencia'),
        candidates: { type: 'array', items: { type: 'string' } },
        threshold: { type: 'number', default: 0.75 },
      },
      required: ['queryUrl', 'candidates'],
    },
    async (input, _brand) =>
      findSimilarImages(
        String((input as Record<string, unknown>).queryUrl),
        (input as Record<string, unknown>).candidates as string[],
        Number((input as Record<string, unknown>).threshold ?? 0.75),
      ),
  ),

  tool(
    'vision_moderate_batch',
    'Modera un batch de imágenes y devuelve estadísticas.',
    {
      type: 'object',
      properties: {
        imageUrls: { type: 'array', items: { type: 'string' } },
      },
      required: ['imageUrls'],
    },
    async (input, _brand) => {
      const results = moderateBatch((input as Record<string, unknown>).imageUrls as string[]);
      return { results, stats: getModerationStats(results) };
    },
  ),

  tool(
    'vision_face_compliance',
    'Verifica compliance de rostros en una imagen.',
    {
      type: 'object',
      properties: { imageUrl: str('URL de la imagen') },
      required: ['imageUrl'],
    },
    async (input, _brand) => checkFaceCompliance(String((input as Record<string, unknown>).imageUrl)),
  ),

  tool(
    'vision_suggest_colors',
    'Sugiere ajustes de color para alinear una imagen con la marca.',
    {
      type: 'object',
      properties: {
        imageUrl: str('URL de la imagen'),
        brandColors: { type: 'array', items: { type: 'string' } },
      },
      required: ['imageUrl', 'brandColors'],
    },
    async (input, _brand) =>
      suggestColorAdjustments(
        String((input as Record<string, unknown>).imageUrl),
        (input as Record<string, unknown>).brandColors as string[],
      ),
  ),

  // ── Sprint 11: Self-Improvement + AR ────────────────────────────────

  tool(
    'self_improve_record',
    'Registra un ciclo de auto-mejora.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        metric: str('Métrica mejorada'),
        beforeValue: { type: 'number' },
        afterValue: { type: 'number' },
        strategy: str('Estrategia usada'),
      },
      required: ['agentId', 'metric', 'beforeValue', 'afterValue', 'strategy'],
    },
    async (input, _brand) => {
      const beforeValue = Number((input as Record<string, unknown>).beforeValue);
      const afterValue = Number((input as Record<string, unknown>).afterValue);
      return recordCycle({
        agentId: String((input as Record<string, unknown>).agentId),
        metric: String((input as Record<string, unknown>).metric),
        beforeValue,
        afterValue,
        change: Math.round((afterValue - beforeValue) * 100) / 100,
        strategy: String((input as Record<string, unknown>).strategy),
      });
    },
  ),

  tool(
    'self_improve_analyze',
    'Analiza historial de mejoras de un agente.',
    {
      type: 'object',
      properties: { agentId: str('ID del agente') },
      required: ['agentId'],
    },
    async (input, _brand) => analyzeImprovements(String((input as Record<string, unknown>).agentId)),
  ),

  tool(
    'self_improve_suggest',
    'Sugiere mejoras para un agente basado en métricas actuales.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        metrics: { type: 'object', description: 'Métricas actuales como objeto' },
      },
      required: ['agentId'],
    },
    async (input, _brand) =>
      suggestImprovements(
        String((input as Record<string, unknown>).agentId),
        ((input as Record<string, unknown>).metrics as Record<string, number>) ?? {},
      ),
  ),

  tool(
    'meta_learn_record',
    'Registra un patrón de estrategia para meta-learning.',
    {
      type: 'object',
      properties: {
        context: str('Contexto'),
        action: str('Acción'),
        outcome: { type: 'number', minimum: 0, maximum: 1 },
      },
      required: ['context', 'action', 'outcome'],
    },
    async (input, _brand) =>
      recordPattern(
        String((input as Record<string, unknown>).context),
        String((input as Record<string, unknown>).action),
        Number((input as Record<string, unknown>).outcome),
      ),
  ),

  tool(
    'meta_learn_predict',
    'Predice transferencia de estrategias entre contextos.',
    {
      type: 'object',
      properties: {
        sourceContext: str('Contexto origen'),
        targetContext: str('Contexto destino'),
      },
      required: ['sourceContext', 'targetContext'],
    },
    async (input, _brand) =>
      predictTransfer(
        String((input as Record<string, unknown>).sourceContext),
        String((input as Record<string, unknown>).targetContext),
      ),
  ),

  tool(
    'meta_learn_top_patterns',
    'Obtiene los patrones de estrategia más exitosos.',
    {
      type: 'object',
      properties: { context: str('Filtrar por contexto'), limit: { type: 'number', default: 10 } },
    },
    async (input, _brand) =>
      getTopPatterns(
        (input as Record<string, unknown>).context as string | undefined,
        Number((input as Record<string, unknown>).limit ?? 10),
      ),
  ),

  tool(
    'auto_tune_suggest',
    'Sugiere ajuste de parámetro para un agente.',
    {
      type: 'object',
      properties: {
        paramName: str('Nombre del parámetro'),
        current: { type: 'number' },
        min: { type: 'number' },
        max: { type: 'number' },
        step: { type: 'number' },
        metric: str('Métrica afectada'),
        recentPerformance: { type: 'array', items: { type: 'number' } },
      },
      required: ['paramName', 'current', 'min', 'max', 'step', 'metric', 'recentPerformance'],
    },
    async (input, _brand) =>
      suggestTuning(
        {
          name: String((input as Record<string, unknown>).paramName),
          current: Number((input as Record<string, unknown>).current),
          min: Number((input as Record<string, unknown>).min),
          max: Number((input as Record<string, unknown>).max),
          step: Number((input as Record<string, unknown>).step),
          metric: String((input as Record<string, unknown>).metric),
        },
        (input as Record<string, unknown>).recentPerformance as number[],
      ),
  ),

  tool(
    'auto_tune_evaluate',
    'Evalúa impacto de tuning histórico para un agente.',
    {
      type: 'object',
      properties: { agentId: str('ID del agente') },
      required: ['agentId'],
    },
    async (input, _brand) => evaluateTuningImpact(String((input as Record<string, unknown>).agentId)),
  ),

  tool(
    'feedback_collect',
    'Colecta una señal de feedback.',
    {
      type: 'object',
      properties: {
        source: { type: 'string', enum: ['performance', 'user', 'system', 'human', 'algorithm'] },
        agentId: str('ID del agente'),
        metric: str('Métrica'),
        value: { type: 'number' },
        weight: { type: 'number', default: 1 },
      },
      required: ['source', 'agentId', 'metric', 'value'],
    },
    async (input, _brand) =>
      collectSignal({
        source: (input as Record<string, unknown>).source as 'performance' | 'user' | 'system' | 'human' | 'algorithm',
        agentId: String((input as Record<string, unknown>).agentId),
        metric: String((input as Record<string, unknown>).metric),
        value: Number((input as Record<string, unknown>).value),
        weight: Number((input as Record<string, unknown>).weight ?? 1),
      }),
  ),

  tool(
    'feedback_apply',
    'Aplica feedback acumulado a un agente.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        action: str('Acción a aplicar'),
      },
      required: ['agentId', 'action'],
    },
    async (input, _brand) =>
      applyFeedback(
        String((input as Record<string, unknown>).agentId),
        String((input as Record<string, unknown>).action),
      ),
  ),

  tool(
    'performance_review',
    'Genera una performance review para un agente.',
    {
      type: 'object',
      properties: {
        agentId: str('ID del agente'),
        startDate: str('Fecha inicio ISO'),
        endDate: str('Fecha fin ISO'),
        metrics: { type: 'array', items: { type: 'object' } },
      },
      required: ['agentId', 'startDate', 'endDate', 'metrics'],
    },
    async (input, _brand) =>
      generateReview(
        {
          startDate: String((input as Record<string, unknown>).startDate),
          endDate: String((input as Record<string, unknown>).endDate),
          agentId: String((input as Record<string, unknown>).agentId),
        },
        (input as Record<string, unknown>).metrics as Array<{
          name: string;
          actual: number;
          target: number;
          previous?: number;
        }>,
      ),
  ),

  tool(
    'ar_filter_create',
    'Genera un filtro AR.',
    {
      type: 'object',
      properties: {
        name: str('Nombre del filtro'),
        type: { type: 'string', enum: ['face', 'background', 'overlay', 'transform', 'lighting'] },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
      },
      required: ['name', 'type', 'platform'],
    },
    async (input, _brand) =>
      generateFilter(
        String((input as Record<string, unknown>).name),
        (input as Record<string, unknown>).type as 'face' | 'background' | 'overlay' | 'transform' | 'lighting',
        (input as Record<string, unknown>).platform as 'instagram' | 'tiktok' | 'both',
      ),
  ),

  tool(
    'ar_preview_generate',
    'Genera un preview AR para una imagen.',
    {
      type: 'object',
      properties: {
        filterId: str('ID del filtro'),
        originalImageUrl: str('URL de la imagen original'),
      },
      required: ['filterId', 'originalImageUrl'],
    },
    async (input, _brand) => {
      const { generateFilter } = await import('../capabilities/ar/arFilterGenerator.js');
      const filter = generateFilter(String((input as Record<string, unknown>).filterId), 'face', 'both');
      return generatePreview(filter, String((input as Record<string, unknown>).originalImageUrl));
    },
  ),

  tool(
    'ar_effect_compose',
    'Compone una secuencia de efectos AR.',
    {
      type: 'object',
      properties: {
        name: str('Nombre de la secuencia'),
        filterIds: { type: 'array', items: { type: 'string' } },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
      },
      required: ['name', 'filterIds', 'platform'],
    },
    async (input, _brand) => {
      const { generateFilter } = await import('../capabilities/ar/arFilterGenerator.js');
      const filters = (input as Record<string, unknown>).filterIds as string[];
      const filterObjects = filters.map((id) => generateFilter(id, 'overlay', 'both'));
      return composeSequence(
        String((input as Record<string, unknown>).name),
        filterObjects,
        (input as Record<string, unknown>).platform as 'instagram' | 'tiktok' | 'both',
      );
    },
  ),

  tool(
    'ar_export',
    'Exporta una secuencia AR en formato especificado.',
    {
      type: 'object',
      properties: {
        sequenceId: str('ID de la secuencia'),
        format: { type: 'string', enum: ['spark_ar', 'effect_house', 'json'] },
      },
      required: ['sequenceId', 'format'],
    },
    async (input, _brand) => {
      const seqs = arListSequences();
      const seq = seqs.find((s) => s.id === String((input as Record<string, unknown>).sequenceId));
      if (!seq) return { error: 'Sequence not found' };
      return exportEffect(seq, (input as Record<string, unknown>).format as 'spark_ar' | 'effect_house' | 'json');
    },
  ),

  tool(
    'ar_campaign_plan',
    'Genera un plan de campaña AR con múltiples filtros.',
    {
      type: 'object',
      properties: {
        brandName: str('Nombre de la marca'),
        filterCount: { type: 'number', default: 3 },
      },
      required: ['brandName'],
    },
    async (input, _brand) =>
      generateFilterCampaign(
        String((input as Record<string, unknown>).brandName),
        Number((input as Record<string, unknown>).filterCount ?? 3),
      ),
  ),
);

tools.push(
  tool(
    'registrar_promesa',
    'Registra una nueva promesa medible para un cliente con métrica, deadline y compensación.',
    {
      type: 'object',
      properties: {
        clientId: str('ID del cliente'),
        clientName: str('Nombre del cliente'),
        title: str('Título corto de la promesa'),
        description: str('Descripción detallada'),
        category: str('Categoría: growth, engagement, leads, sales, time_saved, authority, custom'),
        metricName: str('Métrica: followers, engagement_rate, reach_per_post, posts_count, leads, sales, hours_saved'),
        target: { type: 'number', description: 'Valor objetivo' },
        unit: str('Unidad: seguidores, %, posts, leads, horas, etc.'),
        deadline: str('Fecha límite ISO (YYYY-MM-DD)'),
        compensationType: str('Tipo de compensación: refund_pct, credit_pct, free_months, manual_review'),
        compensationValue: { type: 'number', description: 'Valor de la compensación' },
        compensationDescription: str('Descripción de la compensación'),
        baseline: { type: 'number', description: 'Valor inicial/baseline (opcional)', default: 0 },
      },
      required: [
        'clientId',
        'clientName',
        'title',
        'description',
        'category',
        'metricName',
        'target',
        'unit',
        'deadline',
        'compensationType',
        'compensationValue',
        'compensationDescription',
      ],
    },
    async (input, _brand) => {
      const promise = createPromise({
        clientId: String(input.clientId),
        clientName: String(input.clientName),
        title: String(input.title),
        description: String(input.description),
        category: String(input.category) as PromiseContract['category'],
        metric: {
          metric: String(input.metricName),
          target: Number(input.target),
          unit: String(input.unit),
          baseline: Number(input.baseline ?? 0),
        },
        deadline: new Date(String(input.deadline)).toISOString(),
        compensation: {
          type: String(input.compensationType) as PromiseContract['compensation']['type'],
          value: Number(input.compensationValue),
          description: String(input.compensationDescription),
        },
      });
      return { ok: true, promiseId: promise.id, title: promise.title };
    },
  ),
);

tools.push(
  tool(
    'consultar_promesas',
    'Lista las promesas registradas para un cliente con su estado y progreso actual.',
    {
      type: 'object',
      properties: {
        clientId: str('ID del cliente (opcional, si no se pasa lista todas)'),
        status: str('Filtrar por status: on-track, at-risk, breached, fulfilled (opcional)'),
      },
    },
    async (input, _brand) => {
      const promises = listPromises({
        clientId: typeof input.clientId === 'string' ? input.clientId : undefined,
        status: typeof input.status === 'string' ? (input.status as PromiseContract['status']) : undefined,
      });
      return {
        count: promises.length,
        promises: promises.map((p) => ({
          id: p.id,
          title: p.title,
          status: p.status,
          progress: p.progress,
          target: p.metric.target,
          unit: p.metric.unit,
          deadline: p.deadline,
          remediationCount: p.remediationCount,
        })),
      };
    },
  ),
);

tools.push(
  tool(
    'activar_remediacion',
    'Activa manualmente el protocolo de remediación para una promesa en riesgo.',
    {
      type: 'object',
      properties: {
        promiseId: str('ID de la promesa'),
      },
      required: ['promiseId'],
    },
    async (input, brand) => {
      const promise = getPromise(String(input.promiseId));
      if (!promise) return { ok: false, error: 'Promesa no encontrada' };
      const result = await runRemediation(promise, brand);
      updatePromise(promise.id, { remediationCount: promise.remediationCount + 1 });
      return { ok: true, actions: result.actions, experiments: result.experimentsLaunched };
    },
  ),
);

export const toolSpecs = (): Tool[] => tools.map((t) => t.spec);

export const findTool = (name: string): RegisteredTool | undefined => tools.find((t) => t.spec.name === name);
