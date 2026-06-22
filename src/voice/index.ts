export {
  speak,
  speakAsync,
  listSAPIVoices,
  buildBrowserTTSPayload,
  TTSConfig,
  type TTSOptions,
  type TTSResult,
  type TTSLanguage,
  type TTSProvider,
} from './tts.js';

export {
  listenOnce,
  listenContinuous,
  isSTTAvailable,
  buildBrowserSTTConfig,
  type STTOptions,
  type STTResult,
} from './stt.js';

export {
  detectWakeWord,
  detectHandsFreeIntent,
  getWakeResponse,
  WAKE_PHRASES,
  WAKE_RESPONSES,
  HANDS_FREE_COMMANDS,
  HANDS_FREE_MENU,
  type WakeWordMatch,
  type WakePhrase,
} from './wakeWord.js';

export {
  startHandsFreeMode,
  stopHandsFreeMode,
  handleWakeWordDetection,
  processVoiceCommand,
  processVoiceCommandWithContext,
  getSessionState,
  getHandsFreeMenu,
  resetSession,
  type VoiceSessionState,
  type VoiceCommand,
} from './voiceSession.js';

// ── Action Router v2 (voice → real system actions)
export {
  detectIntent,
  executeVoiceAction,
  needsConfirmation,
  isConfirmationYes,
  isConfirmationNo,
  type VoiceActionResult,
  type VoiceIntent,
} from './voiceActionRouter.js';

// ── Conversation Context (multi-turn memory)
export {
  getOrCreateContext,
  addTurn,
  setPendingConfirmation,
  clearPendingConfirmation,
  markConfirmed,
  getPendingConfirmation,
  buildContextualGoal,
  listActiveSessions,
  type ConversationTurn,
  type VoiceContext,
} from './voiceContext.js';

// ── Audio Feedback (beeps/boops for voice states)
export {
  setAudioFeedback,
  isAudioFeedbackEnabled,
  playWake,
  playListening,
  playProcessing,
  playSuccess,
  playError,
  playConfirm,
  playClick,
} from './voiceFeedback.js';

// ── Wake Word Engine v2 (fuzzy phonetic matching)
export {
  detectWakeWordAdvanced,
  quickWakeCheck,
  addCustomWakePhrase,
  listWakePhrases,
  type WakeDetectionResult,
} from './wakeWordEngine.js';

// ── Streaming STT (VAD + Whisper + SAPI)
export {
  StreamingSTTSession,
  createStreamingSTT,
  listAvailableSTTProviders,
  type StreamingSTTOptions,
  type StreamingSTTResult,
} from './streamingSTT.js';

// ── Voice Macro Recorder (action macros)
export {
  startRecording,
  recordStep,
  stopRecording,
  cancelRecording,
  isRecording,
  getRecordingState,
  runMacro,
  listMacros,
  deleteMacro,
  getMacro,
  findMacroByFuzzyName,
  type MacroStep,
  type VoiceMacro,
  type RecordingSession,
} from './voiceMacroRecorder.js';

// ── Home Assistant / Alexa / Google Home Bridge
export {
  verifyWebhookToken,
  handleAssistantRequest,
  formatHomeAssistantResponse,
  formatAlexaResponse,
  formatGoogleResponse,
  ALEXA_INTENTS,
  GOOGLE_ACTIONS_INTENTS,
  type AssistantRequest,
  type AssistantResponse,
} from './homeAssistantBridge.js';

// ── Sentiment Analyzer (adaptive tone based on user emotion)
export { analyzeSentiment, analyzeSentimentWithAPI, adaptTone, type SentimentResult } from './sentimentAnalyzer.js';

// ── Voice Biometrics (speaker recognition)
export {
  extractFingerprint,
  matchVoice,
  enrollVoice,
  listProfiles,
  getProfile,
  deleteProfile,
  checkPermission,
  PERMISSIONS,
  getActiveSpeaker,
  setActiveSpeaker,
  recordSpeakerInteraction,
  clearActiveSpeaker,
  listSpeakerHistory,
  autoDetectSpeaker,
  saveProfile,
  type VoiceProfile,
  type VoiceFingerprint,
  type BiometricMatch,
  type SpeakerSession,
} from './voiceBiometrics.js';

// ── Offline Mode (100% local voice processing)
export {
  detectOfflineEngines,
  isOfflineMode,
  enableOfflineMode,
  disableOfflineMode,
  withOnlineFallback,
  isActionOfflineCompatible,
  getOfflineCompatibleActions,
  type OfflineEngineStatus,
} from './offlineMode.js';

// ── Training Wizard (enroll new speakers)
export {
  startTraining,
  getTrainingSession,
  cancelTraining,
  submitSample,
  getTrainingSteps,
  type TrainingStep,
  type TrainingSession,
} from './trainingWizard.js';

// ── Conversation Export (JSON/Markdown/CSV/TXT)
export {
  exportConversation,
  exportAllConversations,
  type ExportFormat,
  type ExportOptions,
} from './conversationExport.js';

// ── Voice-Triggered Automation (speaker → macro)
export {
  assignMacroToSpeaker,
  removeMacroFromSpeaker,
  getMacroForSpeaker,
  listSpeakerTriggers,
  runSpeakerTrigger,
} from './voiceMacroRecorder.js';

// ── Voice Analytics Engine (metrics, heatmaps, success rates)
export {
  recordCommand,
  recordWakeWordDetection,
  recordSTT,
  recordTTS,
  recordConfirmation,
  recordIntent,
  getAnalyticsSummary,
  getIntentHeatmap,
  getSuccessRate,
  getHourlyActivity,
  getTopCommands,
  getSpeakerStats,
  getEngineReliability,
  rotateOldAnalytics,
  type CommandEvent,
  type WakeWordEvent,
  type STTEvent,
  type TTSEvent,
  type ConfirmationEvent,
  type IntentEvent,
  type AnalyticsSummary,
  type IntentHeatmap,
  type SuccessRate,
  type HourlyActivity,
  type TopCommand,
  type SpeakerStats,
  type EngineReliability,
} from './voiceAnalytics.js';

// ── Emergency Voice Commands (bypass GlassBox gates)
export {
  EMERGENCY_COMMANDS,
  isEmergencyCommand,
  executeEmergencyCommand,
  getEmergencyStatus,
  getEmergencyResponse,
  type EmergencyCommand,
} from './emergencyCommands.js';

// ── Custom Wake Word Training (personalized wake phrases)
export {
  addCustomWakeWord,
  addPorcupineWakeWord,
  listCustomWakeWords,
  removeCustomWakeWord,
  activateCustomWakeWord,
  deactivateCustomWakeWord,
  getActiveCustomWakeWords,
  rebuildWakePhraseBank,
  getPpnFilePath,
  type CustomWakeWord,
} from './customWakeWord.js';

// ── Voice Cloning (ElevenLabs personalized TTS)
export {
  cloneVoice,
  listClonedVoices,
  getClonedVoice,
  deleteClonedVoice,
  speakWithClonedVoice,
  isVoiceCloningAvailable,
  type ClonedVoice,
} from './voiceCloning.js';

// ── Realtime Translation (multi-language voice pipeline)
export {
  detectLanguage,
  translate,
  translateWithFallback,
  isTranslationAvailable,
  getSupportedLanguages,
  processTranslatedCommand,
  type TranslationResult,
} from './realtimeTranslation.js';

// ── Phase 7: Executive Voice (Crisis, A/B Testing, UGC, Collab, Analytics)
export {
  checkCrisisStatus,
  pausePublishing,
  resumePublishing,
  evaluateRecentComments,
  getCrisisState,
  draftCrisisResponse,
} from './crisisVoice.js';
export { startABTest, getABTestStatus, evaluateABTest, cancelABTest, listABTests } from './abTestingVoice.js';
export { scoutUGC, evaluateUGC, requestPermission, repostUGC, listPendingUGC } from './ugcVoice.js';
export { evaluateCreator, sendOutreach, listProspects, negotiateWithCreator, getNextSteps } from './collabVoice.js';
export {
  getWeeklyReport,
  getGrowthStatus,
  analyzeCompetitor,
  getTrends,
  getDailyMetrics,
  predictPostPerformance,
} from './analyticsVoice.js';

// ── Phase 8: Producer Voice (Content, Canva, Images, Video, Publishing)
export { createCarousel, createReel, createStory, createCaption, createFaceless } from './contentVoice.js';
export { designCarousel, renderReel, exportDesign, connectCanvaAccount } from './canvaVoice.js';
export { generateImage, generateImageBatch, listImageModels, isImageGenAvailable } from './imageGenVoice.js';
export { createFacelessReel, generateVideo, getVideoPipelineStatus } from './videoVoice.js';
export { publishNow, schedulePost, listScheduledPosts, cancelScheduledPost } from './publishVoice.js';

// ── Phase 9: Autonomous Voice (Goals, Autopilot, Predictions, Learning, Briefings)
export { setGrowthGoal, listActiveGoals, getGoalProgress, adjustGoal } from './goalsVoice.js';
export { startAutopilot, stopAutopilot, getAutopilotReport, configureAutopilot } from './autopilotVoice.js';
export {
  predictPostPerformance as predictPostPerf,
  predictBestTime,
  predictWeeklyGrowth,
  isPredictorAvailable,
} from './predictorVoice.js';
export { weeklyAnalysis, getRecommendations, applySuccessPattern } from './learningVoice.js';
export { getDailyBriefing, getWeeklyBriefing, getPendingTasks } from './briefingVoice.js';

// ── Phase 10: Social Voice (Community, Leads, Fans, DM Automation, Mentions)
export {
  replyPendingDMs,
  replyRecentComments,
  moderateComments,
  createPoll,
  getCommunityStatus,
} from './communityVoice.js';
export { listLeads, moveLead, sendProposal, getSalesPipeline } from './leadsVoice.js';
export { getTopFans, sendThankYouToFans, scheduleWeeklyRecognition } from './fansVoice.js';
export { setupAutoReply, listActiveTriggers, enableSmartFirstComment, disableTrigger } from './dmAutomationVoice.js';
export { checkNewMentions, replyPositiveMentions, escalateNegativeMentions } from './mentionsVoice.js';

// ── Phase 11: Strategy Voice (Positioning, Archetypes, Calendar, Audit)
export {
  analyzePositioning,
  suggestArchetypes,
  planStrategicCalendar,
  auditAccount,
  refineValueProp,
} from './strategyVoice.js';

// ── Phase 12: Monetization Voice (Pricing, Funnels, Sponsorships, Products)
export {
  suggestPricing,
  analyzeFunnel,
  draftSponsorshipPitch,
  trackAffiliatePerformance,
  suggestDigitalProducts,
} from './monetizationVoice.js';

// ── Phase 13: Legal/Compliance Voice (Terms, Privacy, Disclaimers, Contracts)
export {
  generateTerms,
  generatePrivacyPolicy,
  generateDisclaimer,
  checkCopyrightRisk,
  draftCreatorContract,
} from './legalVoice.js';

// ── Phase 14: Multi-Account Voice (Switch, Consolidate, Cross-post, Permissions)
export {
  listAccounts,
  switchAccount,
  consolidateAnalytics,
  planCrossPost,
  checkPermissions,
} from './multiAccountVoice.js';

// ── Phase 15: SEO & Discovery Voice (Hashtags, Keywords, Alt Text, Geotags)
export { optimizeHashtags, researchKeywords, suggestAltText, suggestGeotags, checkSearchRankings } from './seoVoice.js';

// ── Phase 16: Business Intelligence Voice (Dashboards, Exports, Correlations)
export {
  createCustomDashboard,
  exportData,
  analyzeCorrelations,
  trackCohort,
  benchmarkAgainstIndustry,
} from './biVoice.js';

// ── Phase 17: Innovation & Trends Voice (Updates, Betas, Playbooks, Forecast)
export {
  checkPlatformUpdates,
  suggestBetaFeatures,
  getEarlyAdopterPlaybook,
  forecastTrends,
  analyzeCompetitorInnovation,
} from './innovationVoice.js';

// ── Phase 18: Reporting & White-label Voice (PDF, Scheduled, White-label)
export {
  generatePdfReport,
  scheduleReport,
  exportWhiteLabel,
  comparePeriods,
  generateExecutiveSummary,
} from './reportingVoice.js';

// ── Phase 19: Onboarding & Training Voice (Tutorials, Tips, Quiz, Progress)
export {
  startVoiceTutorial,
  getDailyTip,
  startCertificationQuiz,
  getOnboardingProgress,
  discoverFeature,
} from './onboardingVoice.js';

// ── Phase 20: Integrations & Automation Voice (Webhooks, APIs, Sync, Health)
export {
  checkWebhookStatus,
  triggerAutomation,
  searchApiDirectory,
  checkSyncStatus,
  getIntegrationHealth,
} from './integrationsVoice.js';

// ── Competitive Intelligence Voice (Unified competitor analysis)
export { runFullCompetitiveAnalysis, quickCompetitorCheck } from './competitiveIntelligenceVoice.js';

// ── Phase 21: Conversion Voice (Funnel, Scarcity, Social Proof, Offers)
export {
  analyzeConversionFunnel,
  suggestFunnelFix,
  generateScarcityCampaign,
  generateCountdownSequence,
  generateSocialProof,
  generateOffer,
  generateLaunchSequence,
} from './conversionVoice.js';

// ── Phase 22: Profile & Grid Voice (Audit, Highlights, Bio, Grid)
export { auditProfile, generateHighlightStrategy, optimizeBio, planGrid, getScrollStopHooks } from './profileVoice.js';

// ── Phase 23: Community & Ritual Voice (Rituals, Insider, Naming, Loops)
export {
  createRituals,
  createInsiderContent,
  suggestCommunityNames,
  createCommunityManifesto,
  createEngagementLoops,
} from './ritualVoice.js';

// ── Phase 24: Audience & Personas Voice (Segmentation, Content Match, Personalization)
export {
  segmentAudience,
  analyzePersonaJourney,
  matchContentToPersonas,
  generatePersonalizedVariants,
  suggestSegmentRotation,
} from './audienceVoice.js';

// ── Phase 25: FOMO & Episodic Voice (Expert Level)
export {
  createEpisodicSeries,
  generateCountdown,
  generateTeaserDrop,
  generateMustFollowHooks,
  craftProfileHook,
  detectTrending,
  designAnticipationArc,
  designDrop,
  designDropSeries,
  createDisappearingContent,
  generateSocialCounters,
  designGamifiedFomo,
  designInsiderSystem,
  generateVisualFomo,
  designSwipeToReveal,
  designFomoCampaign,
  getFomoPlaybook,
} from './fomoVoice.js';
