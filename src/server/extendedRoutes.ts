// @ts-nocheck
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/**
 * Extended API routes — endpoints para los módulos nuevos:
 * Experiencia (welcome, personalización, home, achievements, rituales, celebraciones, memorabilia),
 * Community (inbox, leads, FAQ, fans, UGC, menciones, stories, support),
 * Goals (goals, tasks, calendar, period reports),
 * Computer Use (canva, profiles, android emulator, voice narrator).
 *
 * Todos los endpoints siguen el patrón json(res, status, payload) de http.ts.
 */

import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { saveBrandProfile, getActiveBrandId } from '../config/accounts.js';

// ── Experience ──────────────────────────────────────────────────────────────
import {
  startWelcome,
  advanceStage as welcomeAdvanceStage,
  generateStageContent,
  buildCompletionRecap,
  getWelcomeSession,
  getActiveWelcomeForUser,
  hasCompletedOnboarding,
  getCatalogs as welcomeCatalogs,
  getWelcomeSnapshot,
} from '../capabilities/experience/welcomeExperience.js';
import {
  initPersonalization,
  getPersonalization,
  updatePersonalization,
  resetToDefaults as personalizationReset,
  addInsideJoke,
  addCustomCommand,
  removeCustomCommand,
  getCatalogPreview,
  getPersonalizationSnapshot,
  exportPersonalizationCSS,
} from '../capabilities/experience/personalizationEngine.js';
import {
  buildHomeDashboard,
  buildMinimalHome,
  buildHomeAsText,
  getDelightMessage,
} from '../capabilities/experience/homeDashboard.js';
import {
  ACHIEVEMENTS,
  evaluateAchievements,
  getAllAchievements,
  getUnlockedAchievements,
  getAchievementsByCategory,
  getProgressTowardNext,
  getAchievementsSnapshot,
  markAchievementShared,
  markAchievementAcknowledged,
  getUnacknowledgedAchievements,
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
} from '../capabilities/experience/dailyRitual.js';
import {
  triggerCelebration,
  celebrateMilestone,
  celebrateGoalCompleted,
  celebrateStreak,
  celebrateSurprise,
  getRecentCelebrations,
  getCelebration,
  markCelebrationAcknowledged,
  markCelebrationShared,
  getUnacknowledgedCelebrations,
  getCelebrationSnapshot,
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

// ── Community (CM modules) ──────────────────────────────────────────────────
import {
  ingestMessage,
  suggestReply,
  tickInbox,
  listConversations,
  getConversation,
  getInboxSnapshot,
  updateConversationStatus,
  escalateToHuman,
} from '../capabilities/community/dmInbox.js';
import {
  detectFlowType,
  openSupportCase,
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
  createStorySequence,
  publishSequence,
  planDailyStories,
  listSequences,
  getSequence,
  getStoriesSnapshot,
} from '../capabilities/community/storiesStudio.js';
import {
  createLead,
  advanceLeadStage,
  scheduleFollowUp,
  processFollowUpsDue,
  getPipelineKanban,
  listLeads,
  getLead,
  getPipelineSnapshot,
  recordWonRevenue,
} from '../capabilities/community/leadPipeline.js';
import { checkTone, guardOutput } from '../capabilities/community/toneGuardian.js';
import {
  ingestUGC,
  requestRepostPermission,
  markPermission,
  generateRepostCaption,
  markReposted,
  listUGC,
  getUGCSnapshot,
} from '../capabilities/community/ugcManager.js';
import {
  ingestMention,
  acknowledgeMention,
  listMentions,
  getMentionsSnapshot,
} from '../capabilities/community/mentionTracker.js';
import {
  generatePoll,
  recordPollResults,
  analyzePollResults,
  listPolls,
  getPollSnapshot,
} from '../capabilities/community/pollQuizEngine.js';
import {
  enqueueNewFollower,
  sendWelcomeDM,
  processNewFollowersQueue,
  refreshAllFanProfiles,
  getTopFans,
  grantReward,
  proposeFanOfTheWeek,
  detectChurningFans,
  getFanSnapshot,
} from '../capabilities/community/fanRecognition.js';

// ── Goals system ────────────────────────────────────────────────────────────
import {
  createGoal,
  listGoals,
  getGoalsSnapshot,
  checkGoalsHealth,
  cascadeAnnualGoal,
  cascadeQuarterlyGoal,
  autoUpdateProgress,
} from '../capabilities/goals/goalManager.js';
import { parseUserIntent } from '../capabilities/goals/intentParser.js';
import {
  createTask,
  listTasks,
  updateTaskStatus,
  getKanbanView,
  getTeamWorkload,
  buildDailyStandup,
  decomposeGoalIntoTasks,
} from '../capabilities/goals/taskBoard.js';
import {
  createEvent,
  listEvents,
  getMonthView,
  getWeekView,
  getCalendarSnapshot,
  processUpcomingEvents,
} from '../capabilities/goals/calendarBoard.js';
import { generatePeriodReport, listReports, getReport, reportToText } from '../capabilities/goals/periodReport.js';
import { runKickoffFromText, previewKickoff } from '../capabilities/goals/kickoffOrchestrator.js';

// ── Computer Use ────────────────────────────────────────────────────────────
import { runCanvaBrain, CANVA_BRAIN_AGENTS, type CanvaBrainMode } from '../capabilities/computerUse/canvaBrain.js';
import {
  runMasterBrain,
  listAvailableBrains,
  type MasterContext,
  type MasterIntent,
  type MasterMode,
} from '../capabilities/computerUse/masterBrain.js';
import {
  runBrandingBrain,
  BRANDING_BRAIN_AGENTS,
  type BrandingBrainMode,
} from '../capabilities/branding/brandingBrain.js';
import { listInstalledApps, launchApp, openCanva } from '../capabilities/computerUse/appLauncher.js';
import { runCanvaToInstagram, getDesktopWorkflowsStatus } from '../capabilities/computerUse/desktopWorkflows.js';
import {
  listProfiles as listChromeProfiles,
  createProfile as createChromeProfile,
  launchWithProfile,
  ensureProfileForBrand,
  getProfilesSnapshot,
} from '../capabilities/computerUse/chromeProfileManager.js';
import {
  detectInstalledEmulators,
  listEmulators,
  registerEmulator,
  launchEmulator as launchAndroidEmulator,
  getAndroidEmulatorSnapshot,
} from '../capabilities/computerUse/androidEmulator.js';
import {
  narrate as voiceNarrate,
  getNarratorConfig,
  setNarratorLevel,
  updateNarratorConfig,
  getNarratorStats,
  enable as voiceNarratorEnable,
  disable as voiceNarratorDisable,
  isEnabled as voiceNarratorIsEnabled,
} from '../capabilities/computerUse/voiceNarrator.js';
import {
  listReplaySessions,
  getReplaySession,
  generateNarrative as replayGenerateNarrative,
  getReplayStats,
} from '../capabilities/computerUse/visualReplayLog.js';
import {
  getCuaMode,
  getCuaModeState,
  setCuaMode,
  approveAction,
  rejectAction,
  listPendingApprovals,
  cleanupExpiredApprovals,
  getCuaModeStats,
  type CuaMode,
} from '../capabilities/computerUse/cuaMode.js';

// Growth (algunos endpoints útiles para UI)
import {
  getCurrentProgress as getGrowthProgress,
  getRecentDailyMetrics,
  getMilestones,
  getGrowthHealth,
} from '../capabilities/growth/growthEngine.js';
import { buildDashboard as buildGrowthDashboard } from '../capabilities/growth/growthDashboard.js';
import { extractPatterns, getAccountSummary, getTopPerformers } from '../capabilities/analytics/performanceDB.js';

// Brand renewal
import {
  auditBrand,
  proposeEvolution,
  listRenewals,
  getRenewal,
  runFullRenewal,
} from '../capabilities/branding/brandRenewal.js';
import {
  startInterview,
  getActiveInterview,
  submitAnswer as brandInterviewSubmitAnswer,
  consolidateInterview,
  getInterviewProgress,
  INTERVIEW_QUESTIONS,
} from '../capabilities/branding/brandInterview.js';

// ── Consumption (Cost / Quality / Plan / Onboarding) ────────────────────────
import {
  trackCost,
  buildCostAttributionDashboard,
  getCostBreakdownByWorkflow,
  getCostBreakdownByAgent,
  getCostBreakdownByTaskType,
  getCostBreakdownByFeature,
  getCostTimeSeries,
  getRecentEvents as getRecentCostEvents,
} from '../capabilities/consumption/costAttribution.js';
import {
  evaluateResponseQuality,
  checkAndRecord as qualityCheckAndRecord,
  buildQualityDashboard,
  setSurfaceThreshold,
  getThresholds as getQualityThresholds,
  recordUserOverride as recordQualityOverride,
  getRecentQualityChecks,
} from '../capabilities/consumption/qualityGate.js';
import {
  recommendPlan,
  buildUsageSnapshot,
  setCustomPlans,
  getAvailablePlans,
  getRecentRecommendations,
} from '../capabilities/consumption/planRecommendation.js';
import {
  syncProgress as onboardingSync,
  getNextSteps as onboardingNextSteps,
  markStepDone,
  skipStep,
  generateContextualTip,
  getOnboardingSnapshot,
  getAllSteps as getOnboardingSteps,
  getProgressForUser,
} from '../capabilities/consumption/onboardingGuide.js';

// ── Churn Shield (operator-only — NO en UI usuario) ─────────────────────────
import {
  evaluateAccount,
  executePlay,
  tickShield,
  listAccountsAtRisk,
  getAccountChurnState,
  getShieldSnapshot,
  setSilentMode,
  setOperatorContact,
} from '../capabilities/consumption/churnShield.js';

// ── Helpers ──────────────────────────────────────────────────────────────────

const userIdFrom = (req: { headers: Record<string, string | string[] | undefined> }): string => {
  const raw = req.headers['x-feedia-user'] ?? 'default';
  return Array.isArray(raw) ? (raw[0] ?? 'default') : raw;
};

const asString = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : v == null ? fallback : String(v));

const asNumber = (v: unknown, fallback = 0): number => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

// ── Route builder ───────────────────────────────────────────────────────────

export const buildExtendedRoutes = (brand: BrandProfile): RouteDefinition[] => [
  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — welcome / onboarding
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/welcome/start',
    handler: ({ req, res }) => json(res, 200, startWelcome(userIdFrom(req), brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/welcome/:id/advance',
    handler: async ({ req, res, params, body }) => {
      const b = body as {
        nextStage: string;
        choices?: Record<string, unknown>;
        personalStory?: Record<string, unknown>;
      };
      const updated = welcomeAdvanceStage(
        params['id']!,
        b.nextStage as Parameters<typeof welcomeAdvanceStage>[1],
        b.choices as Parameters<typeof welcomeAdvanceStage>[2],
        b.personalStory as Parameters<typeof welcomeAdvanceStage>[3],
      );
      json(res, 200, updated);
      void req;
    },
  },
  {
    method: 'GET',
    pattern: '/api/welcome/:id/stage/:stage',
    handler: async ({ res, params }) => {
      const session = getWelcomeSession(params['id']!);
      if (!session) {
        json(res, 404, { error: 'not found' });
        return;
      }
      const content = await generateStageContent(
        session,
        params['stage']! as Parameters<typeof generateStageContent>[1],
        brand,
      );
      json(res, 200, content);
    },
  },
  {
    method: 'GET',
    pattern: '/api/welcome/:id/recap',
    handler: async ({ res, params }) => json(res, 200, await buildCompletionRecap(params['id']!, brand)),
  },
  {
    method: 'GET',
    pattern: '/api/welcome/:id',
    handler: ({ res, params }) => json(res, 200, getWelcomeSession(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/welcome/active',
    handler: ({ req, res }) => json(res, 200, getActiveWelcomeForUser(userIdFrom(req))),
  },
  {
    method: 'GET',
    pattern: '/api/welcome/completed',
    handler: ({ req, res }) => json(res, 200, { completed: hasCompletedOnboarding(userIdFrom(req)) }),
  },
  {
    method: 'GET',
    pattern: '/api/welcome/catalogs',
    handler: ({ res }) => json(res, 200, welcomeCatalogs()),
  },
  {
    method: 'GET',
    pattern: '/api/welcome/snapshot',
    handler: ({ res }) => json(res, 200, getWelcomeSnapshot()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — personalization
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/personalization/init',
    handler: ({ req, res }) => json(res, 200, initPersonalization(userIdFrom(req), brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/personalization',
    handler: ({ req, res }) =>
      json(res, 200, getPersonalization(userIdFrom(req)) ?? initPersonalization(userIdFrom(req), brand.name)),
  },
  {
    method: 'PUT',
    pattern: '/api/personalization',
    handler: ({ req, res, body }) => {
      const updates = body as Parameters<typeof updatePersonalization>[1];
      json(res, 200, updatePersonalization(userIdFrom(req), updates));
    },
  },
  {
    method: 'POST',
    pattern: '/api/personalization/reset',
    handler: ({ req, res }) => json(res, 200, personalizationReset(userIdFrom(req))),
  },
  {
    method: 'POST',
    pattern: '/api/personalization/inside-joke',
    handler: ({ req, res, body }) => {
      const b = body as { context: string; jokeText: string };
      json(res, 200, addInsideJoke(userIdFrom(req), b.context, b.jokeText));
    },
  },
  {
    method: 'POST',
    pattern: '/api/personalization/command',
    handler: ({ req, res, body }) => {
      const b = body as { trigger: string; response: string };
      json(res, 200, addCustomCommand(userIdFrom(req), b.trigger, b.response));
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/personalization/command/:trigger',
    handler: ({ req, res, params }) => json(res, 200, removeCustomCommand(userIdFrom(req), params['trigger']!)),
  },
  {
    method: 'GET',
    pattern: '/api/personalization/catalogs',
    handler: ({ res }) => json(res, 200, getCatalogPreview()),
  },
  {
    method: 'GET',
    pattern: '/api/personalization/snapshot',
    handler: ({ res }) => json(res, 200, getPersonalizationSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/personalization/css',
    handler: ({ req, res }) => {
      const css = exportPersonalizationCSS(userIdFrom(req));
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      res.end(css);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — home dashboard
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/home/dashboard',
    handler: async ({ req, res, query }) =>
      json(res, 200, await buildHomeDashboard(userIdFrom(req), brand, asString(query['lastVisit']) || undefined)),
  },
  {
    method: 'GET',
    pattern: '/api/home/minimal',
    handler: async ({ req, res }) => json(res, 200, await buildMinimalHome(userIdFrom(req), brand)),
  },
  {
    method: 'GET',
    pattern: '/api/home/text',
    handler: async ({ req, res, query }) =>
      json(res, 200, {
        text: await buildHomeAsText(userIdFrom(req), brand, asString(query['lastVisit']) || undefined),
      }),
  },
  {
    method: 'GET',
    pattern: '/api/home/delight',
    handler: async ({ res }) => json(res, 200, { text: await getDelightMessage(brand) }),
  },

  // Identidad para el saludo "Bienvenido a casa, [nombre]"
  {
    method: 'GET',
    pattern: '/api/home/identity',
    handler: ({ req, res }) => {
      const userId = userIdFrom(req);
      const personalization = getPersonalization(userId);
      const instagramName = (brand as { name: string; instagramHandle?: string }).instagramHandle ?? brand.name;
      const ownerNickname = personalization?.ownerNickname;
      const systemName = personalization?.systemName ?? 'Talía';
      const displayName = ownerNickname || instagramName || brand.name || 'tu cuenta';
      json(res, 200, {
        displayName,
        instagramName,
        ownerNickname,
        brandName: brand.name,
        systemName,
        niche: brand.niche,
      });
    },
  },

  // KPIs reales por período (7 / 30 / 90 / 365 días)
  {
    method: 'GET',
    pattern: '/api/home/kpis',
    handler: ({ res, query }) => {
      const periodDays = asNumber(query['period'], 7);
      const metrics = getRecentDailyMetrics(Math.max(periodDays + 1, 14));
      const summary = getAccountSummary();
      const progress = getGrowthProgress();

      const inPeriod = metrics.slice(-periodDays);
      const beforePeriod = metrics.slice(-periodDays * 2, -periodDays);

      const followersNow = inPeriod[inPeriod.length - 1]?.followers ?? progress.current.followers ?? 0;
      const followersThen = inPeriod[0]?.followers ?? followersNow;
      const followersDelta = followersNow - followersThen;
      const followersDeltaPct = followersThen > 0 ? (followersDelta / followersThen) * 100 : 0;

      const reachInPeriod = inPeriod.reduce((s, m) => s + (m.reach24h ?? 0), 0);
      const reachBefore = beforePeriod.reduce((s, m) => s + (m.reach24h ?? 0), 0);
      const reachDeltaPct = reachBefore > 0 ? ((reachInPeriod - reachBefore) / reachBefore) * 100 : 0;

      const engagementInPeriod = inPeriod.reduce((s, m) => s + (m.engagement24h ?? 0), 0);
      const engagementRateAvg =
        reachInPeriod > 0 ? (engagementInPeriod / reachInPeriod) * 100 : (summary.avgEngagementRate ?? 0);

      // Velocidad = seguidores nuevos por día promedio
      const velocityPerDay = inPeriod.length > 0 ? followersDelta / inPeriod.length : 0;

      json(res, 200, {
        periodDays,
        followers: {
          current: followersNow,
          delta: followersDelta,
          deltaPct: Number(followersDeltaPct.toFixed(1)),
          direction: followersDelta > 0 ? 'up' : followersDelta < 0 ? 'down' : 'flat',
        },
        reach: {
          total: reachInPeriod,
          deltaPct: Number(reachDeltaPct.toFixed(1)),
          direction: reachDeltaPct > 0 ? 'up' : reachDeltaPct < 0 ? 'down' : 'flat',
        },
        engagementRate: {
          value: Number(engagementRateAvg.toFixed(2)),
          unit: '%',
          direction: 'flat',
        },
        velocity: {
          value: Number(velocityPerDay.toFixed(1)),
          unit: 'seg/día',
          description: 'Seguidores nuevos por día promedio en el período',
          direction: velocityPerDay > 0 ? 'up' : velocityPerDay < 0 ? 'down' : 'flat',
        },
        sampleSize: inPeriod.length,
        hasRealData: inPeriod.length > 0 && (followersNow > 0 || reachInPeriod > 0),
      });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — achievements
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/achievements/evaluate',
    handler: async ({ res }) => {
      const newUnlocks = await evaluateAchievements(brand);

      // Notify SSE clients of new unlocks
      if (newUnlocks.length > 0) {
        const { notifyAchievementUnlock } = await import('../server/ws-server.js');
        const allAchievements = ACHIEVEMENTS;

        for (const unlock of newUnlocks) {
          const def = allAchievements.find((a) => a.id === unlock.achievementId);
          if (def) {
            notifyAchievementUnlock(def);
          }
        }
      }

      json(res, 200, newUnlocks);
    },
  },
  {
    method: 'GET',
    pattern: '/api/achievements',
    handler: ({ res }) => json(res, 200, getAllAchievements()),
  },
  {
    method: 'GET',
    pattern: '/api/achievements/unlocked',
    handler: ({ res }) => json(res, 200, getUnlockedAchievements()),
  },
  {
    method: 'GET',
    pattern: '/api/achievements/category/:cat',
    handler: ({ res, params }) =>
      json(res, 200, getAchievementsByCategory(params['cat'] as Parameters<typeof getAchievementsByCategory>[0])),
  },
  {
    method: 'GET',
    pattern: '/api/achievements/next',
    handler: ({ res }) => json(res, 200, getProgressTowardNext()),
  },
  {
    method: 'GET',
    pattern: '/api/achievements/snapshot',
    handler: ({ res }) => json(res, 200, getAchievementsSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/achievements/unacknowledged',
    handler: ({ res }) => json(res, 200, getUnacknowledgedAchievements()),
  },
  {
    method: 'POST',
    pattern: '/api/achievements/:id/share',
    handler: ({ res, params }) => json(res, 200, { ok: markAchievementShared(params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/achievements/:id/ack',
    handler: ({ res, params }) => json(res, 200, { ok: markAchievementAcknowledged(params['id']!) }),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — daily rituals
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/rituals/morning',
    handler: async ({ req, res }) => json(res, 200, await buildMorningRitual(brand, userIdFrom(req))),
  },
  {
    method: 'POST',
    pattern: '/api/rituals/evening',
    handler: async ({ req, res }) => json(res, 200, await buildEveningRitual(brand, userIdFrom(req))),
  },
  {
    method: 'POST',
    pattern: '/api/rituals/monday',
    handler: async ({ req, res }) => json(res, 200, await buildMondayKickoff(brand, userIdFrom(req))),
  },
  {
    method: 'POST',
    pattern: '/api/rituals/friday',
    handler: async ({ req, res }) => json(res, 200, await buildFridayClose(brand, userIdFrom(req))),
  },
  {
    method: 'POST',
    pattern: '/api/rituals/:id/deliver',
    handler: async ({ res, params }) => json(res, 200, await deliverRitual(params['id']!, brand)),
  },
  {
    method: 'GET',
    pattern: '/api/rituals',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        getRecentRituals(asNumber(query['limit'], 14), query['type'] as Parameters<typeof getRecentRituals>[1]),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/rituals/:id',
    handler: ({ res, params }) => json(res, 200, getRitualById(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/rituals/:id/ack',
    handler: ({ res, params }) => json(res, 200, { ok: markRitualAcknowledged(params['id']!) }),
  },
  {
    method: 'GET',
    pattern: '/api/rituals/snapshot',
    handler: ({ res }) => json(res, 200, getRitualSnapshot()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — celebrations
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/celebrations/trigger',
    handler: async ({ req, res, body }) => {
      const b = body as {
        kind: string;
        intensity?: string;
        description: string;
        metricName?: string;
        metricValue?: number;
      };
      const result = await triggerCelebration({
        kind: b.kind as Parameters<typeof triggerCelebration>[0]['kind'],
        intensity: b.intensity as Parameters<typeof triggerCelebration>[0]['intensity'],
        context: { description: b.description, metricName: b.metricName, metricValue: b.metricValue },
        brand,
        userId: userIdFrom(req),
      });
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/milestone',
    handler: async ({ req, res, body }) => {
      const b = body as { value: number; metricName: string };
      json(res, 200, await celebrateMilestone(b.value, b.metricName, brand, userIdFrom(req)));
    },
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/goal',
    handler: async ({ req, res, body }) => {
      const b = body as { goalTitle: string };
      json(res, 200, await celebrateGoalCompleted(b.goalTitle, brand, userIdFrom(req)));
    },
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/streak',
    handler: async ({ req, res, body }) => {
      const b = body as { days: number };
      json(res, 200, await celebrateStreak(b.days, brand, userIdFrom(req)));
    },
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/surprise',
    handler: async ({ req, res }) => json(res, 200, await celebrateSurprise(brand, userIdFrom(req))),
  },
  {
    method: 'GET',
    pattern: '/api/celebrations',
    handler: ({ res, query }) => json(res, 200, getRecentCelebrations(asNumber(query['limit'], 20))),
  },
  {
    method: 'GET',
    pattern: '/api/celebrations/:id',
    handler: ({ res, params }) => json(res, 200, getCelebration(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/:id/ack',
    handler: ({ res, params }) => json(res, 200, { ok: markCelebrationAcknowledged(params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/celebrations/:id/share',
    handler: ({ res, params }) => json(res, 200, { ok: markCelebrationShared(params['id']!) }),
  },
  {
    method: 'GET',
    pattern: '/api/celebrations/unacknowledged',
    handler: ({ res }) => json(res, 200, getUnacknowledgedCelebrations()),
  },
  {
    method: 'GET',
    pattern: '/api/celebrations/snapshot',
    handler: ({ res }) => json(res, 200, getCelebrationSnapshot()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  EXPERIENCE — memorabilia
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/memorabilia',
    handler: async ({ res, body }) => {
      const b = body as Parameters<typeof captureMemory>[0];
      json(res, 200, await captureMemory({ ...b, brand, generateStory: b.generateStory ?? true }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/memorabilia/auto-detect',
    handler: async ({ res }) => json(res, 200, await autoDetectAndCapture(brand)),
  },
  {
    method: 'POST',
    pattern: '/api/memorabilia/:id/pin',
    handler: ({ res, params }) => json(res, 200, pinMemory(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/memorabilia/:id/unpin',
    handler: ({ res, params }) => json(res, 200, unpinMemory(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/memorabilia/:id/revisit',
    handler: ({ res, params }) => json(res, 200, markRevisited(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listMemories({
          type: query['type'] as Parameters<typeof listMemories>[0] extends infer X
            ? X extends { type?: infer T }
              ? T
              : never
            : never,
          minWeight: asNumber(query['minWeight']) as 1 | 2 | 3 | 4 | 5,
          pinned: query['pinned'] === 'true' ? true : query['pinned'] === 'false' ? false : undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/throwback',
    handler: ({ res }) => json(res, 200, getThrowbackMemory()),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/on-this-day',
    handler: ({ res }) => json(res, 200, getOnThisDayMemories()),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/highlight-reel',
    handler: async ({ res, query }) => json(res, 200, await buildHighlightReel(brand, asNumber(query['count'], 10))),
  },
  {
    method: 'POST',
    pattern: '/api/memorabilia/yearbook/:year',
    handler: async ({ res, params }) => json(res, 200, await generateYearbook(asNumber(params['year']), brand)),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/yearbook/:year',
    handler: ({ res, params }) => json(res, 200, getYearbook(asNumber(params['year']))),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/yearbooks',
    handler: ({ res }) => json(res, 200, listYearbooks()),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/:id',
    handler: ({ res, params }) => json(res, 200, getMemory(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/memorabilia/snapshot',
    handler: ({ res }) => json(res, 200, getMemorabiliaSnapshot()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — DM Inbox
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/inbox/ingest',
    handler: ({ res, body }) => json(res, 200, ingestMessage(body as Parameters<typeof ingestMessage>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/inbox/:id/suggest-reply',
    handler: async ({ res, params, body }) => {
      const b = (body ?? {}) as { customInstructions?: string; autoSend?: boolean };
      json(res, 200, await suggestReply(params['id']!, { brand, ...b }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/inbox/tick',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { maxProcess?: number };
      json(res, 200, await tickInbox(b.maxProcess ?? 15));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/inbox',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listConversations({
          status: query['status'] as NonNullable<Parameters<typeof listConversations>[0]>['status'],
          intent: query['intent'] as NonNullable<Parameters<typeof listConversations>[0]>['intent'],
          priority: query['priority'] as NonNullable<Parameters<typeof listConversations>[0]>['priority'],
          assignedTo: query['assignedTo'] as NonNullable<Parameters<typeof listConversations>[0]>['assignedTo'],
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/inbox/snapshot',
    handler: ({ res }) => json(res, 200, getInboxSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/inbox/:id',
    handler: ({ res, params }) => json(res, 200, getConversation(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/inbox/:id/status',
    handler: ({ res, params, body }) => {
      const b = body as { status: string; note?: string };
      json(
        res,
        200,
        updateConversationStatus(params['id']!, b.status as Parameters<typeof updateConversationStatus>[1], b.note),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/inbox/:id/escalate',
    handler: ({ res, params, body }) => {
      const b = body as { reason: string };
      json(res, 200, escalateToHuman(params['id']!, b.reason));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — Customer Support
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/support/detect',
    handler: async ({ res, body }) => {
      const b = body as { text: string; context?: string };
      json(res, 200, await detectFlowType(b.text, b.context));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/support/open',
    handler: ({ res, body }) => json(res, 200, openSupportCase(body as Parameters<typeof openSupportCase>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/support/from-conv/:convId',
    handler: async ({ res, params }) => json(res, 200, await openCaseFromConversation(params['convId']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/support/:id/advance',
    handler: async ({ res, params, body }) => {
      const b = body as { customerMessage: string };
      json(res, 200, await advanceSupportCase(params['id']!, b.customerMessage, brand));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/support',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listSupportCases({
          stage: query['stage'] as NonNullable<Parameters<typeof listSupportCases>[0]>['stage'],
          flowType: query['flowType'] as NonNullable<Parameters<typeof listSupportCases>[0]>['flowType'],
          priority: query['priority'] as NonNullable<Parameters<typeof listSupportCases>[0]>['priority'],
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/support/snapshot',
    handler: ({ res }) => json(res, 200, getSupportSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/support/:id',
    handler: ({ res, params }) => json(res, 200, getSupportCase(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/support/:id/rate',
    handler: ({ res, params, body }) => {
      const b = body as { score: 1 | 2 | 3 | 4 | 5; comment?: string };
      json(res, 200, rateSupportCase(params['id']!, b.score, b.comment));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — FAQ
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/faq',
    handler: ({ res, body }) => json(res, 200, createFAQ(body as Parameters<typeof createFAQ>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/faq/match',
    handler: ({ res, body }) => {
      const b = body as { question: string; minSimilarity?: number };
      json(res, 200, findMatchingFAQ(b.question, b.minSimilarity));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/faq/try-answer',
    handler: async ({ res, body }) => {
      const b = body as { question: string; conversationContext: string; minConfidence?: number };
      json(
        res,
        200,
        await tryAnswerWithFAQ(b.question, b.conversationContext, brand, { minConfidence: b.minConfidence }),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/faq/detect-patterns',
    handler: async ({ res }) => json(res, 200, await detectFAQPatterns(brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/faq/propose/:patternId',
    handler: async ({ res, params }) => json(res, 200, await proposeFAQFromPattern(params['patternId']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/faq/approve',
    handler: ({ res, body }) => {
      const b = body as { draft: Parameters<typeof approveAndAddFAQ>[0]; patternId?: string };
      json(res, 200, approveAndAddFAQ(b.draft, b.patternId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/faq',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listFAQs({
          category: query['category'] as NonNullable<Parameters<typeof listFAQs>[0]>['category'],
          minPopularity: asNumber(query['minPopularity']) || undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/faq/pending',
    handler: ({ res }) => json(res, 200, listPendingPatterns()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/faq/snapshot',
    handler: ({ res }) => json(res, 200, getFAQSnapshot()),
  },
  {
    method: 'DELETE',
    pattern: '/api/cm/faq/:id',
    handler: ({ res, params }) => json(res, 200, { deleted: deleteFAQ(params['id']!) }),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — Stories Studio
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/stories/sequence',
    handler: async ({ res, body }) =>
      json(res, 200, await createStorySequence(body as Parameters<typeof createStorySequence>[0], brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/stories/:id/publish',
    handler: async ({ res, params, body }) => {
      const b = (body ?? {}) as { scheduleAt?: string };
      json(res, 200, await publishSequence(params['id']!, b.scheduleAt));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/stories/plan-daily',
    handler: async ({ res }) => json(res, 200, await planDailyStories(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/cm/stories',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listSequences({
          status: query['status'] as NonNullable<Parameters<typeof listSequences>[0]>['status'],
          intent: query['intent'] as NonNullable<Parameters<typeof listSequences>[0]>['intent'],
          limit: asNumber(query['limit']) || undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/stories/snapshot',
    handler: ({ res }) => json(res, 200, getStoriesSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/stories/:id',
    handler: ({ res, params }) => json(res, 200, getSequence(params['id']!)),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — Lead Pipeline
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/leads',
    handler: async ({ res, body }) => json(res, 200, await createLead(body as Parameters<typeof createLead>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/leads/:id/advance',
    handler: ({ res, params, body }) => {
      const b = body as { newStage: string; note?: string; valueAmount?: number };
      json(
        res,
        200,
        advanceLeadStage(params['id']!, b.newStage as Parameters<typeof advanceLeadStage>[1], b.note, b.valueAmount),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/leads/:id/followup',
    handler: ({ res, params, body }) => {
      const b = body as Parameters<typeof scheduleFollowUp>[1];
      json(res, 200, scheduleFollowUp(params['id']!, b));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/leads/process-followups',
    handler: async ({ res }) => json(res, 200, await processFollowUpsDue(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/cm/leads/kanban',
    handler: ({ res }) => json(res, 200, getPipelineKanban()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/leads',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listLeads({
          stage: query['stage'] as NonNullable<Parameters<typeof listLeads>[0]>['stage'],
          classification: query['classification'] as NonNullable<Parameters<typeof listLeads>[0]>['classification'],
          ownerAgent: query['ownerAgent'] as NonNullable<Parameters<typeof listLeads>[0]>['ownerAgent'],
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/leads/snapshot',
    handler: ({ res }) => json(res, 200, getPipelineSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/leads/:id',
    handler: ({ res, params }) => json(res, 200, getLead(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/leads/:id/won',
    handler: ({ res, params, body }) => {
      const b = body as { amount: number; currency?: string };
      json(res, 200, recordWonRevenue(params['id']!, b.amount, b.currency));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMUNITY — Tone Guardian, UGC, Mentions, Polls, Fans
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/cm/tone/check',
    handler: async ({ res, body }) => {
      const b = body as { text: string; context: string };
      json(res, 200, await checkTone(b.text, b.context as Parameters<typeof checkTone>[1], { brand }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/tone/guard',
    handler: async ({ res, body }) => {
      const b = body as { text: string; context: string; minScore?: number };
      json(
        res,
        200,
        await guardOutput(b.text, b.context as Parameters<typeof guardOutput>[1], { brand, minScore: b.minScore }),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/ugc',
    handler: ({ res, body }) => json(res, 200, ingestUGC(body as Parameters<typeof ingestUGC>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/ugc/:id/request',
    handler: async ({ res, params }) => json(res, 200, await requestRepostPermission(params['id']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/ugc/:id/permission',
    handler: ({ res, params, body }) => {
      const b = body as { granted: boolean; note?: string };
      json(res, 200, markPermission(params['id']!, b.granted, b.note));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/ugc/:id/caption',
    handler: async ({ res, params }) => json(res, 200, { caption: await generateRepostCaption(params['id']!, brand) }),
  },
  {
    method: 'POST',
    pattern: '/api/cm/ugc/:id/reposted',
    handler: ({ res, params, body }) => {
      const b = body as { postId: string };
      json(res, 200, markReposted(params['id']!, b.postId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/ugc',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listUGC({
          stage: query['stage'] as NonNullable<Parameters<typeof listUGC>[0]>['stage'],
          ugcType: query['ugcType'] as NonNullable<Parameters<typeof listUGC>[0]>['ugcType'],
          minQuality: asNumber(query['minQuality']) || undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/ugc/snapshot',
    handler: ({ res }) => json(res, 200, getUGCSnapshot()),
  },
  {
    method: 'POST',
    pattern: '/api/cm/mentions',
    handler: ({ res, body }) => json(res, 200, ingestMention(body as Parameters<typeof ingestMention>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/mentions/:id/ack',
    handler: ({ res, params, body }) => {
      const b = (body ?? {}) as { note?: string };
      json(res, 200, acknowledgeMention(params['id']!, b.note));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/mentions',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listMentions({
          type: query['type'] as NonNullable<Parameters<typeof listMentions>[0]>['type'],
          sentiment: query['sentiment'] as NonNullable<Parameters<typeof listMentions>[0]>['sentiment'],
          importance: query['importance'] as NonNullable<Parameters<typeof listMentions>[0]>['importance'],
          unacknowledged: query['unacknowledged'] === 'true' ? true : undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/mentions/snapshot',
    handler: ({ res }) => json(res, 200, getMentionsSnapshot(brand)),
  },
  {
    method: 'POST',
    pattern: '/api/cm/polls',
    handler: async ({ res, body }) =>
      json(res, 200, await generatePoll({ ...(body as Parameters<typeof generatePoll>[0]), brand })),
  },
  {
    method: 'POST',
    pattern: '/api/cm/polls/:id/results',
    handler: ({ res, params, body }) =>
      json(res, 200, recordPollResults(params['id']!, body as Parameters<typeof recordPollResults>[1])),
  },
  {
    method: 'POST',
    pattern: '/api/cm/polls/:id/analyze',
    handler: async ({ res, params }) => json(res, 200, await analyzePollResults(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/cm/polls',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listPolls({
          type: query['type'] as NonNullable<Parameters<typeof listPolls>[0]>['type'],
          purpose: query['purpose'] as NonNullable<Parameters<typeof listPolls>[0]>['purpose'],
          hasResults: query['hasResults'] === 'true' ? true : undefined,
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/cm/polls/snapshot',
    handler: ({ res }) => json(res, 200, getPollSnapshot()),
  },
  {
    method: 'POST',
    pattern: '/api/cm/fans/new-follower',
    handler: ({ res, body }) => {
      const b = body as { username: string };
      enqueueNewFollower(b.username);
      json(res, 200, { ok: true });
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/fans/welcome',
    handler: async ({ res, body }) => {
      const b = body as { username: string };
      json(res, 200, await sendWelcomeDM(b.username, brand));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/fans/process-welcomes',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { maxProcess?: number };
      json(res, 200, await processNewFollowersQueue(b.maxProcess ?? 5));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cm/fans/refresh',
    handler: ({ res }) => json(res, 200, refreshAllFanProfiles()),
  },
  {
    method: 'GET',
    pattern: '/api/cm/fans/top',
    handler: ({ res, query }) =>
      json(res, 200, getTopFans(query['tier'] as Parameters<typeof getTopFans>[0], asNumber(query['limit'], 20))),
  },
  {
    method: 'POST',
    pattern: '/api/cm/fans/:username/reward',
    handler: ({ res, params, body }) => {
      const b = body as Parameters<typeof grantReward>[1];
      json(res, 200, grantReward(params['username']!, b));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cm/fans/fan-of-week',
    handler: async ({ res }) => json(res, 200, await proposeFanOfTheWeek(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/cm/fans/churning',
    handler: ({ res, query }) => json(res, 200, detectChurningFans(asNumber(query['days'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/cm/fans/snapshot',
    handler: ({ res }) => json(res, 200, getFanSnapshot()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  GOALS — Goals, Tasks, Calendar, Reports
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/goals',
    handler: ({ res, body }) => json(res, 200, createGoal(body as Parameters<typeof createGoal>[0])),
  },
  {
    method: 'GET',
    pattern: '/api/goals',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listGoals({
          horizon: query['horizon'] as NonNullable<Parameters<typeof listGoals>[0]>['horizon'],
          category: query['category'] as NonNullable<Parameters<typeof listGoals>[0]>['category'],
          status: query['status'] as NonNullable<Parameters<typeof listGoals>[0]>['status'],
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/goals/snapshot',
    handler: ({ res }) => json(res, 200, getGoalsSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/goals/health',
    handler: ({ res }) => json(res, 200, checkGoalsHealth()),
  },
  {
    method: 'POST',
    pattern: '/api/goals/:id/cascade/annual',
    handler: async ({ res, params }) => json(res, 200, await cascadeAnnualGoal(params['id']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/goals/:id/cascade/quarterly',
    handler: async ({ res, params }) => json(res, 200, await cascadeQuarterlyGoal(params['id']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/goals/:id/decompose',
    handler: async ({ res, params }) => json(res, 200, await decomposeGoalIntoTasks(params['id']!, brand)),
  },
  {
    method: 'POST',
    pattern: '/api/goals/auto-progress',
    handler: ({ res }) => json(res, 200, autoUpdateProgress()),
  },
  {
    method: 'POST',
    pattern: '/api/goals/intent-parse',
    handler: async ({ res, body }) => {
      const b = body as Omit<Parameters<typeof parseUserIntent>[0], 'brand'>;
      json(res, 200, await parseUserIntent({ ...b, brand }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/goals/kickoff',
    handler: async ({ res, body }) => {
      const b = body as { text: string; source?: 'voice' | 'chat'; referenceDate?: string };
      json(res, 200, await runKickoffFromText(b.text, brand, b.source ?? 'chat', b.referenceDate));
    },
  },
  {
    method: 'POST',
    pattern: '/api/goals/kickoff/preview',
    handler: async ({ res, body }) => {
      const b = body as Omit<Parameters<typeof previewKickoff>[0], 'brand'>;
      json(res, 200, await previewKickoff({ ...b, brand }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/tasks',
    handler: ({ res, body }) => json(res, 200, createTask(body as Parameters<typeof createTask>[0])),
  },
  {
    method: 'GET',
    pattern: '/api/tasks',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listTasks({
          status: query['status'] as NonNullable<Parameters<typeof listTasks>[0]>['status'],
          agent: query['agent'] as NonNullable<Parameters<typeof listTasks>[0]>['agent'],
          priority: query['priority'] as NonNullable<Parameters<typeof listTasks>[0]>['priority'],
          goalId: query['goalId'] as string | undefined,
        }),
      ),
  },
  {
    method: 'POST',
    pattern: '/api/tasks/:id/status',
    handler: ({ res, params, body }) => {
      const b = body as { status: string; note?: string };
      json(res, 200, updateTaskStatus(params['id']!, b.status as Parameters<typeof updateTaskStatus>[1], b.note));
    },
  },
  {
    method: 'GET',
    pattern: '/api/tasks/kanban',
    handler: ({ res }) => json(res, 200, getKanbanView()),
  },
  // Alias sin prefijo /tasks/ — workspace.js llama a /api/kanban
  {
    method: 'GET',
    pattern: '/api/kanban',
    handler: ({ res }) => json(res, 200, getKanbanView()),
  },
  {
    method: 'GET',
    pattern: '/api/tasks/workload',
    handler: ({ res }) => json(res, 200, getTeamWorkload()),
  },
  {
    method: 'GET',
    pattern: '/api/tasks/standup',
    handler: ({ res }) => json(res, 200, buildDailyStandup()),
  },
  {
    method: 'POST',
    pattern: '/api/calendar/events',
    handler: ({ res, body }) => json(res, 200, createEvent(body as Parameters<typeof createEvent>[0])),
  },
  {
    method: 'GET',
    pattern: '/api/calendar/events',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        listEvents({
          from: query['from'] as string | undefined,
          to: query['to'] as string | undefined,
          type: query['type'] as NonNullable<Parameters<typeof listEvents>[0]>['type'],
        }),
      ),
  },
  {
    method: 'GET',
    pattern: '/api/calendar/month/:year/:month',
    handler: ({ res, params }) => json(res, 200, getMonthView(asNumber(params['year']), asNumber(params['month']))),
  },
  {
    method: 'GET',
    pattern: '/api/calendar/week',
    handler: ({ res, query }) => {
      const ref = query['ref'] ? new Date(asString(query['ref'])) : undefined;
      json(res, 200, getWeekView(ref));
    },
  },
  {
    method: 'GET',
    pattern: '/api/calendar/snapshot',
    handler: ({ res }) => json(res, 200, getCalendarSnapshot()),
  },
  {
    method: 'POST',
    pattern: '/api/calendar/process-upcoming',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { lookaheadDays?: number };
      json(res, 200, processUpcomingEvents(b.lookaheadDays ?? 30));
    },
  },
  {
    method: 'POST',
    pattern: '/api/reports/period',
    handler: async ({ res, body }) => {
      const b = body as { horizon: 'weekly' | 'monthly' | 'quarterly' | 'annual'; reference?: string };
      json(res, 200, await generatePeriodReport(brand, b.horizon, b.reference ? new Date(b.reference) : new Date()));
    },
  },
  {
    method: 'GET',
    pattern: '/api/reports',
    handler: ({ res, query }) =>
      json(res, 200, listReports(query['horizon'] as Parameters<typeof listReports>[0], asNumber(query['limit'], 20))),
  },
  {
    method: 'GET',
    pattern: '/api/reports/:id',
    handler: ({ res, params }) => {
      const r = getReport(params['id']!);
      if (!r) {
        json(res, 404, { error: 'not found' });
        return;
      }
      json(res, 200, { report: r, text: reportToText(r) });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  GROWTH (datos para UI)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/growth/progress',
    handler: ({ res }) => json(res, 200, getGrowthProgress()),
  },
  {
    method: 'GET',
    pattern: '/api/growth/dashboard',
    handler: ({ res }) => json(res, 200, buildGrowthDashboard(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/growth/daily-metrics',
    handler: ({ res, query }) => json(res, 200, getRecentDailyMetrics(asNumber(query['days'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/growth/milestones',
    handler: ({ res, query }) => json(res, 200, getMilestones(asNumber(query['limit'], 10))),
  },
  {
    method: 'GET',
    pattern: '/api/growth/health',
    handler: ({ res }) => json(res, 200, getGrowthHealth()),
  },
  {
    method: 'GET',
    pattern: '/api/analytics/patterns',
    handler: ({ res }) => json(res, 200, extractPatterns()),
  },
  {
    method: 'GET',
    pattern: '/api/analytics/summary',
    handler: ({ res }) => json(res, 200, getAccountSummary()),
  },
  {
    method: 'GET',
    pattern: '/api/analytics/top-performers',
    handler: ({ res, query }) =>
      json(
        res,
        200,
        getTopPerformers(query['format'] as Parameters<typeof getTopPerformers>[0], asNumber(query['limit'], 10)),
      ),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  FEED GRID — Tu Instagram en formato grid 3xN (cómo se ve en IG real)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/feed/grid',
    handler: async ({ res, query }) => {
      const { getRecentPosts } = await import('../capabilities/analytics/performanceDB.js');
      const limit = asNumber(query['limit'], 36);
      const days = asNumber(query['days'], 365);
      const format = query['format'] as Parameters<typeof getRecentPosts>[1];
      const posts = getRecentPosts(days, format).slice(0, limit);
      json(res, 200, {
        brand: { name: brand.name, niche: brand.niche },
        totalShown: posts.length,
        posts: posts.map((p) => ({
          id: p.id,
          format: p.format,
          publishedAt: p.publishedAt,
          hook: p.hookText,
          caption: p.caption?.slice(0, 280),
          topics: p.topics,
          hashtags: p.hashtags?.slice(0, 10),
          metrics: {
            likes: p.metrics.likes,
            comments: p.metrics.comments,
            saves: p.metrics.saves,
            shares: p.metrics.shares,
            reach: p.metrics.reach,
            impressions: p.metrics.impressions,
            engagementRate: p.metrics.engagementRate,
          },
          score: p.actualScore,
          isTopPerformer: p.isTopPerformer,
        })),
      });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  BRAND — Interview + Renewal
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/brand/interview/start',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { source?: 'voice' | 'chat' | 'form' | 'canvas' };
      json(res, 200, startInterview(b.source ?? 'chat'));
    },
  },
  {
    method: 'GET',
    pattern: '/api/brand/interview/active',
    handler: ({ res }) => json(res, 200, getActiveInterview()),
  },
  {
    method: 'POST',
    pattern: '/api/brand/interview/:id/answer',
    handler: async ({ res, params, body }) => {
      const b = body as { questionId: string; answer: string };
      json(res, 200, await brandInterviewSubmitAnswer(params['id']!, b.questionId, b.answer));
    },
  },
  {
    method: 'POST',
    pattern: '/api/brand/interview/:id/consolidate',
    handler: async ({ res, params }) => json(res, 200, await consolidateInterview(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/brand/interview/:id/progress',
    handler: ({ res, params }) => json(res, 200, getInterviewProgress(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/brand/interview/questions',
    handler: ({ res }) => json(res, 200, INTERVIEW_QUESTIONS),
  },
  {
    method: 'POST',
    pattern: '/api/brand/audit',
    handler: async ({ res }) => json(res, 200, await auditBrand(brand)),
  },
  {
    method: 'POST',
    pattern: '/api/brand/propose-evolution',
    handler: async ({ res, body }) => {
      const audit = await auditBrand(brand);
      const b = (body ?? {}) as { scope?: 'visual' | 'voice' | 'positioning' | 'full' };
      json(res, 200, await proposeEvolution(brand, audit, b.scope));
    },
  },
  {
    method: 'POST',
    pattern: '/api/brand/renewal',
    handler: async ({ res }) => json(res, 200, await runFullRenewal(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/brand/renewals',
    handler: ({ res, query }) => json(res, 200, listRenewals(asNumber(query['limit'], 10))),
  },
  {
    method: 'GET',
    pattern: '/api/brand/renewals/:id',
    handler: ({ res, params }) => json(res, 200, getRenewal(params['id']!)),
  },

  // GET /api/niche-packs — lista todos los niche packs disponibles
  {
    method: 'GET',
    pattern: '/api/niche-packs',
    handler: async ({ res }) => {
      const { NICHE_PACKS } = await import('../config/nichePacks.js');
      const summary = NICHE_PACKS.map(({ id, label, emoji, description, accountCategory, industryCategory }) => ({
        id,
        label,
        emoji,
        description,
        accountCategory,
        industryCategory,
      }));
      return json(res, 200, { packs: summary });
    },
  },

  // GET /api/niche-packs/:id — devuelve el seed de un pack específico
  {
    method: 'GET',
    pattern: '/api/niche-packs/:id',
    handler: async ({ res, params }) => {
      const { getNichePackSeed, NICHE_PACK_BY_ID } = await import('../config/nichePacks.js');
      const pack = NICHE_PACK_BY_ID[params['id']!];
      if (!pack) return json(res, 404, { error: 'Niche pack not found' });
      const seed = getNichePackSeed(params['id']!);
      return json(res, 200, { pack, seed });
    },
  },

  // POST /api/niche-packs/:id/apply — aplica el seed del pack al BrandProfile activo
  {
    method: 'POST',
    pattern: '/api/niche-packs/:id/apply',
    handler: async ({ res, params }) => {
      try {
        const { getNichePackSeed } = await import('../config/nichePacks.js');
        const { loadBrandProfileById } = await import('../config/accounts.js');
        const seed = getNichePackSeed(params['id']!);
        if (!seed) return json(res, 404, { error: 'Niche pack not found' });

        const brandId = getActiveBrandId();
        const current = loadBrandProfileById(brandId);

        // Merge: pack values are defaults, existing user values take precedence
        // for non-empty fields (arrays are unioned, strings only overwrite if empty)
        const mergeArr = <T>(existing: T[], incoming: T[]): T[] => (existing.length > 0 ? existing : incoming);

        const mergeStr = (existing: string, incoming: string): string => (existing.trim() ? existing : incoming);

        const merged: BrandProfile = {
          ...current,
          type: current.type ?? seed.type,
          accountCategory: current.accountCategory ?? seed.accountCategory,
          industryCategory: current.industryCategory ?? seed.industryCategory,
          niche: mergeStr(current.niche, seed.niche),
          nichePackId: seed.nichePackId,
          voice: {
            ...current.voice,
            tone: mergeArr(current.voice.tone, seed.voice.tone),
            forbidden: mergeArr(current.voice.forbidden, seed.voice.forbidden),
            referenceQuotes: mergeArr(current.voice.referenceQuotes, seed.voice.referenceQuotes),
          },
          visual: {
            ...current.visual,
            style: mergeStr(current.visual.style, seed.visual.style),
            mood: mergeStr(current.visual.mood, seed.visual.mood),
            photographyStyle: mergeStr(current.visual.photographyStyle, seed.visual.photographyStyle),
            density: current.visual.density ?? seed.visual.density,
            imageTextRatio: current.visual.imageTextRatio ?? seed.visual.imageTextRatio,
            compositionRules: mergeArr(current.visual.compositionRules, seed.visual.compositionRules),
          },
          goals: {
            primary: current.goals.primary ?? seed.goals.primary,
            metricsToWatch: mergeArr(current.goals.metricsToWatch, seed.goals.metricsToWatch),
          },
          contentPillars: mergeArr(current.contentPillars ?? [], seed.contentPillars),
          complianceRules: mergeArr(current.complianceRules ?? [], seed.complianceRules),
          hashtagPools: Object.keys(current.hashtagPools ?? {}).length > 0 ? current.hashtagPools : seed.hashtagPools,
          brandStrategy: {
            ...seed.brandStrategy,
            ...current.brandStrategy,
            archetype: mergeStr(current.brandStrategy?.archetype ?? '', seed.brandStrategy.archetype),
            differentiators: mergeArr(current.brandStrategy?.differentiators ?? [], seed.brandStrategy.differentiators),
            experiencePrinciples: mergeArr(
              current.brandStrategy?.experiencePrinciples ?? [],
              seed.brandStrategy.experiencePrinciples,
            ),
          },
        };

        saveBrandProfile(brandId, merged);
        return json(res, 200, { ok: true, brandId, nichePackId: params['id'] });
      } catch (err) {
        return json(res, 500, { error: String(err) });
      }
    },
  },

  // POST /api/brand/apply-branding-brain
  // Aplica los resultados del Branding Brain al BrandProfile activo.
  // Mergea estrategia, voz e identidad visual manteniendo los campos
  // existentes que no hayan sido generados por el brain.
  {
    method: 'POST',
    pattern: '/api/brand/apply-branding-brain',
    handler: async ({ res, body }) => {
      try {
        const b = body as {
          brandStrategy?: {
            vision?: string;
            mission?: string;
            values?: string[];
            positioning?: string;
            differentiator?: string;
          };
          audienceAvatar?: {
            description?: string;
            pains?: string[];
            desires?: string[];
            aspirationalIdentity?: string;
          };
          voice?: { tone?: string[]; vocabulary?: string[]; forbidden?: string[]; sampleHooks?: string[] };
          visualIdentity?: { palette?: string[]; typography?: string[]; mood?: string };
          narrative?: { originStory?: string; coreMessages?: string[] };
        };

        const brandId = getActiveBrandId();
        // Importamos dinámico para no crear dependencia circular en el módulo
        const { loadBrandProfileById } = await import('../config/accounts.js');
        const current = loadBrandProfileById(brandId);

        // Merge profundo — el Brain output enriquece sin destruir
        const updated: BrandProfile = {
          ...current,
          voice: {
            ...current.voice,
            ...(b.voice?.tone?.length ? { tone: b.voice.tone } : {}),
            ...(b.voice?.forbidden?.length ? { forbidden: b.voice.forbidden } : {}),
            ...(b.voice?.vocabulary?.length
              ? { referenceQuotes: b.voice.sampleHooks ?? current.voice.referenceQuotes }
              : {}),
          },
          visual: {
            ...current.visual,
            ...(b.visualIdentity?.palette?.length ? { palette: b.visualIdentity.palette } : {}),
            ...(b.visualIdentity?.typography?.length ? { typography: b.visualIdentity.typography } : {}),
            ...(b.visualIdentity?.mood ? { mood: b.visualIdentity.mood } : {}),
          },
          audience: {
            ...current.audience,
            ...(b.audienceAvatar?.description ? { description: b.audienceAvatar.description } : {}),
            ...(b.audienceAvatar?.pains?.length ? { pains: b.audienceAvatar.pains } : {}),
            ...(b.audienceAvatar?.desires?.length ? { desires: b.audienceAvatar.desires } : {}),
          },
          brandStrategy: {
            ...current.brandStrategy,
            ...(b.brandStrategy?.vision ? { vision: b.brandStrategy.vision } : {}),
            ...(b.brandStrategy?.mission ? { mission: b.brandStrategy.mission } : {}),
            ...(b.brandStrategy?.values?.length ? { values: b.brandStrategy.values } : {}),
            ...(b.brandStrategy?.positioning ? { positioning: b.brandStrategy.positioning } : {}),
            ...(b.brandStrategy?.differentiator ? { promise: b.brandStrategy.differentiator } : {}),
          },
        };

        saveBrandProfile(brandId, updated);
        json(res, 200, {
          ok: true,
          brandId,
          message: 'Identidad de marca actualizada con los resultados del Branding Brain',
        });
      } catch (err) {
        json(res, 500, { ok: false, error: (err as Error).message });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMPUTER USE — Canva + Profiles + Android + Voice + Replay
  // ════════════════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════════════════
  //  SUPER-GENIUS BRAINS — 6 expert modules
  // ════════════════════════════════════════════════════════════════════════

  // Algorithm Decoder
  {
    method: 'POST',
    pattern: '/api/genius/algorithm/predict',
    handler: async ({ res, body }) => {
      const { predictAlgorithmReach, estimateSignalsFromDraft } = await import('../brain/neural/algorithmDecoder.js');
      const b = (body ?? {}) as {
        contentId?: string;
        signals?: Parameters<typeof predictAlgorithmReach>[2];
        audienceSize?: number;
        draft?: Parameters<typeof estimateSignalsFromDraft>[1];
      };
      if (!b.contentId) {
        json(res, 400, { error: 'contentId requerido' });
        return;
      }
      let signals = b.signals;
      if (!signals && b.draft) signals = await estimateSignalsFromDraft(brand, b.draft);
      if (!signals) {
        json(res, 400, { error: 'signals o draft requerido' });
        return;
      }
      const prediction = await predictAlgorithmReach(brand, b.contentId, signals, b.audienceSize ?? 1000);
      json(res, 200, prediction);
    },
  },

  // Viral Mechanics
  {
    method: 'POST',
    pattern: '/api/genius/viral/predict',
    handler: async ({ res, body }) => {
      const { predictViralPotential } = await import('../brain/neural/viralMechanics.js');
      const b = (body ?? {}) as { draft?: Parameters<typeof predictViralPotential>[1]; audienceSize?: number };
      if (!b.draft) {
        json(res, 400, { error: 'draft requerido' });
        return;
      }
      const prediction = await predictViralPotential(brand, b.draft, b.audienceSize ?? 1000);
      json(res, 200, prediction);
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/viral/track',
    handler: async ({ res, body }) => {
      const { trackPostPublish } = await import('../brain/neural/viralMechanics.js');
      const b = (body ?? {}) as { contentId?: string; metrics?: Parameters<typeof trackPostPublish>[2] };
      if (!b.contentId || !b.metrics) {
        json(res, 400, { error: 'contentId + metrics requeridos' });
        return;
      }
      const viral = await trackPostPublish(brand, b.contentId, b.metrics);
      json(res, 200, viral);
    },
  },

  // Audience Psychology
  {
    method: 'POST',
    pattern: '/api/genius/psychology/build',
    handler: async ({ res, body }) => {
      const { buildPsychProfile } = await import('../brain/neural/audiencePsychology.js');
      const b = (body ?? {}) as { hints?: Parameters<typeof buildPsychProfile>[1] };
      const profile = await buildPsychProfile(brand, b.hints);
      json(res, 200, profile);
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/psychology/triggers',
    handler: async ({ res, body }) => {
      const { getTriggersForContent } = await import('../brain/neural/audiencePsychology.js');
      const b = (body ?? {}) as { contentType?: string; segmentId?: string };
      const triggers = await getTriggersForContent(brand, b.contentType ?? 'general', b.segmentId);
      json(res, 200, triggers);
    },
  },

  // Trend Forecaster
  {
    method: 'POST',
    pattern: '/api/genius/trends/forecast',
    handler: async ({ res, body }) => {
      const { forecastTrends } = await import('../brain/neural/trendForecaster.js');
      const b = (body ?? {}) as { niche?: string; horizon?: number };
      const report = await forecastTrends(brand, { niche: b.niche, horizon: b.horizon });
      json(res, 200, report);
    },
  },
  {
    method: 'GET',
    pattern: '/api/genius/trends/latest',
    handler: async ({ res }) => {
      const { getLatestForecast } = await import('../brain/neural/trendForecaster.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestForecast(brandId);
      json(res, report ? 200 : 404, report ?? { error: 'no forecast yet' });
    },
  },

  // Auto-Experiment Brain
  {
    method: 'POST',
    pattern: '/api/genius/experiment/design',
    handler: async ({ res, body }) => {
      const { designExperiment } = await import('../brain/neural/autoExperimentBrain.js');
      const b = (body ?? {}) as {
        type?: Parameters<typeof designExperiment>[1];
        hypothesis?: string;
        variants?: Parameters<typeof designExperiment>[3];
      };
      if (!b.type || !b.hypothesis || !b.variants) {
        json(res, 400, { error: 'type + hypothesis + variants requeridos' });
        return;
      }
      const exp = await designExperiment(brand, b.type, b.hypothesis, b.variants);
      json(res, 200, exp);
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/experiment/analyze',
    handler: async ({ res, body }) => {
      const { analyzeExperiment } = await import('../brain/neural/autoExperimentBrain.js');
      const b = (body ?? {}) as { experimentId?: string };
      if (!b.experimentId) {
        json(res, 400, { error: 'experimentId requerido' });
        return;
      }
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const result = await analyzeExperiment(brandId, b.experimentId);
      json(res, result ? 200 : 404, result ?? { error: 'experiment not found or insufficient data' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/experiment/auto-ship',
    handler: async ({ res }) => {
      const { autoShipWinners } = await import('../brain/neural/autoExperimentBrain.js');
      const result = await autoShipWinners(brand);
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/genius/experiment/active',
    handler: async ({ res }) => {
      const { listActiveExperiments } = await import('../brain/neural/autoExperimentBrain.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const exps = await listActiveExperiments(brandId);
      json(res, 200, { experiments: exps, count: exps.length });
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/experiment/propose',
    handler: async ({ res, body }) => {
      const { proposeNextExperiments } = await import('../brain/neural/autoExperimentBrain.js');
      const b = (body ?? {}) as { count?: number };
      const proposals = await proposeNextExperiments(brand, b.count ?? 3);
      json(res, 200, { proposals, count: proposals.length });
    },
  },

  // Storytelling Architect
  {
    method: 'POST',
    pattern: '/api/genius/story/design-arc',
    handler: async ({ res, body }) => {
      const { designNarrativeArc } = await import('../brain/neural/storytellingArchitect.js');
      const b = (body ?? {}) as Parameters<typeof designNarrativeArc>[1];
      const arc = await designNarrativeArc(brand, b ?? {});
      json(res, 200, arc);
    },
  },
  {
    method: 'GET',
    pattern: '/api/genius/story/next',
    handler: async ({ res }) => {
      const { getNextNarrativeContent } = await import('../brain/neural/storytellingArchitect.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const next = await getNextNarrativeContent(brandId);
      json(res, 200, { upcoming: next, count: next.length });
    },
  },
  {
    method: 'POST',
    pattern: '/api/genius/story/advance',
    handler: async ({ res, body }) => {
      const { advanceBeat } = await import('../brain/neural/storytellingArchitect.js');
      const b = (body ?? {}) as { arcId?: string };
      if (!b.arcId) {
        json(res, 400, { error: 'arcId requerido' });
        return;
      }
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const beat = await advanceBeat(brandId, b.arcId);
      json(res, beat ? 200 : 404, beat ?? { concluded: true });
    },
  },
  {
    method: 'GET',
    pattern: '/api/genius/story/calendar',
    handler: async ({ res }) => {
      const { buildMultiArcCalendar } = await import('../brain/neural/storytellingArchitect.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const calendar = await buildMultiArcCalendar(brandId);
      json(res, 200, calendar);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  USER LEARNING — captura signals + consolida profile
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/learning/signal',
    handler: async ({ res, body }) => {
      const { recordUserSignal } = await import('../brain/neural/userLearningEngine.js');
      const b = (body ?? {}) as Parameters<typeof recordUserSignal>[0];
      await recordUserSignal(b);
      json(res, 200, { ok: true });
    },
  },
  {
    method: 'POST',
    pattern: '/api/learning/consolidate',
    handler: async ({ res, body }) => {
      const { consolidateUserProfile } = await import('../brain/neural/userLearningEngine.js');
      const b = (body ?? {}) as { userId?: string };
      if (!b.userId) {
        json(res, 400, { error: 'userId requerido' });
        return;
      }
      const profile = await consolidateUserProfile(b.userId, brand);
      json(res, profile ? 200 : 404, profile ?? { error: 'insufficient signals' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/learning/profile/:userId',
    handler: async ({ res, params }) => {
      const { getUserProfile } = await import('../brain/neural/userLearningEngine.js');
      const userId = (params as Record<string, string>)?.userId;
      if (!userId) {
        json(res, 400, { error: 'userId requerido' });
        return;
      }
      const profile = await getUserProfile(userId);
      json(res, profile ? 200 : 404, profile ?? { error: 'no profile yet' });
    },
  },

  // ── Post performance via Computer Use ─────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/performance/scrape',
    handler: async ({ res, body }) => {
      const { scrapeAccountMetrics } = await import('../brain/neural/postPerformanceAnalyzer.js');
      const b = (body ?? {}) as { handle?: string; maxPosts?: number };
      if (!b.handle) {
        json(res, 400, { error: 'handle requerido' });
        return;
      }
      const posts = await scrapeAccountMetrics(brand, b.handle, b.maxPosts ?? 12);
      json(res, 200, { posts, count: posts.length });
    },
  },
  {
    method: 'POST',
    pattern: '/api/performance/analyze',
    handler: async ({ res, body }) => {
      const { runFullAnalysis } = await import('../brain/neural/postPerformanceAnalyzer.js');
      const b = (body ?? {}) as { scope?: 'own' | 'competitor' | 'niche-top'; handles?: string[]; maxPosts?: number };
      const result = await runFullAnalysis({
        brand,
        scope: b.scope ?? 'own',
        handles: b.handles,
        maxPostsPerHandle: b.maxPosts,
      });
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/performance/patterns',
    handler: async ({ res }) => {
      const { getTopPatterns } = await import('../brain/neural/postPerformanceAnalyzer.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const patterns = await getTopPatterns(brandId, 20);
      json(res, 200, { patterns, count: patterns.length });
    },
  },

  // ── Niche brain expander ──────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/niche/expand',
    handler: async ({ res, body }) => {
      const { expandNicheBrain } = await import('../brain/neural/nicheBrainExpander.js');
      const b = (body ?? {}) as { niche?: string; scrapeTopBrands?: number };
      const niche = b.niche ?? brand.industryCategory ?? 'general';
      const knowledge = await expandNicheBrain(brand, niche, { scrapeTopBrands: b.scrapeTopBrands ?? 0 });
      json(res, 200, knowledge);
    },
  },
  {
    method: 'GET',
    pattern: '/api/niche/knowledge/:niche',
    handler: async ({ res, params }) => {
      const { getNicheKnowledge } = await import('../brain/neural/nicheBrainExpander.js');
      const niche = (params as Record<string, string>)?.niche;
      if (!niche) {
        json(res, 400, { error: 'niche requerido' });
        return;
      }
      const knowledge = await getNicheKnowledge(niche);
      json(res, knowledge ? 200 : 404, knowledge ?? { error: 'no knowledge yet' });
    },
  },

  // ── Cross-user collective knowledge ───────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/cross-user/contribute',
    handler: async ({ res, body }) => {
      const { contributeSignal } = await import('../brain/neural/crossUserKnowledge.js');
      const b = (body ?? {}) as Parameters<typeof contributeSignal>;
      if (!b[0] || !b[1] || !b[2]) {
        json(res, 400, { error: 'userId + brand + signal requeridos' });
        return;
      }
      await contributeSignal(b[0], b[1], b[2]);
      json(res, 200, { ok: true });
    },
  },
  {
    method: 'POST',
    pattern: '/api/cross-user/consolidate',
    handler: async ({ res }) => {
      const { consolidateCrossUserPatterns } = await import('../brain/neural/crossUserKnowledge.js');
      const patterns = await consolidateCrossUserPatterns();
      json(res, 200, { patterns, count: patterns.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/cross-user/state',
    handler: async ({ res }) => {
      const { getCrossUserState } = await import('../brain/neural/crossUserKnowledge.js');
      const state = await getCrossUserState();
      json(res, 200, state);
    },
  },
  {
    method: 'POST',
    pattern: '/api/cross-user/consent',
    handler: async ({ res, body }) => {
      const { setUserConsent } = await import('../brain/neural/crossUserKnowledge.js');
      const b = (body ?? {}) as { userId?: string; optedIn?: boolean };
      if (!b.userId || b.optedIn === undefined) {
        json(res, 400, { error: 'userId + optedIn requeridos' });
        return;
      }
      await setUserConsent(b.userId, b.optedIn);
      json(res, 200, { ok: true });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  SKILL REGISTRY & INTEGRATION
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/skills/registry',
    handler: async ({ res }) => {
      const { SKILL_REGISTRY } = await import('../brain/neural/skillRegistry.js');
      json(res, 200, { skills: Object.values(SKILL_REGISTRY), count: Object.keys(SKILL_REGISTRY).length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/skills/by-category',
    handler: async ({ res, query }) => {
      const { findSkillsByCategory } = await import('../brain/neural/skillRegistry.js');
      const cat = (query as Record<string, string>)?.category;
      if (!cat) {
        json(res, 400, { error: 'query.category requerido' });
        return;
      }
      const skills = findSkillsByCategory(cat as Parameters<typeof findSkillsByCategory>[0]);
      json(res, 200, { skills, count: skills.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/skills/by-metric',
    handler: async ({ res, query }) => {
      const { findSkillsForMetric } = await import('../brain/neural/skillRegistry.js');
      const metric = (query as Record<string, string>)?.metric;
      if (!metric) {
        json(res, 400, { error: 'query.metric requerido' });
        return;
      }
      const skills = findSkillsForMetric(metric as Parameters<typeof findSkillsForMetric>[0]);
      json(res, 200, { skills, count: skills.length });
    },
  },
  {
    method: 'POST',
    pattern: '/api/skills/plan',
    handler: async ({ res, body }) => {
      const { buildIntegrationPlan } = await import('../brain/neural/skillIntegrator.js');
      const b = (body ?? {}) as {
        state?: Parameters<typeof buildIntegrationPlan>[1];
        evaluation?: Parameters<typeof buildIntegrationPlan>[2];
        action?: Parameters<typeof buildIntegrationPlan>[3];
      };
      if (!b.state || !b.evaluation || !b.action) {
        json(res, 400, { error: 'state + evaluation + action requeridos' });
        return;
      }
      const plan = buildIntegrationPlan(brand, b.state, b.evaluation, b.action, `plan-${Date.now()}`);
      json(res, 200, plan);
    },
  },
  {
    method: 'POST',
    pattern: '/api/skills/execute',
    handler: async ({ res, body }) => {
      const { executeIntegrationPlan } = await import('../brain/neural/skillIntegrator.js');
      const b = (body ?? {}) as {
        plan?: Parameters<typeof executeIntegrationPlan>[0];
        dryRun?: boolean;
        maxCost?: number;
      };
      if (!b.plan) {
        json(res, 400, { error: 'plan requerido' });
        return;
      }
      const results = await executeIntegrationPlan(b.plan, brand, {
        dryRun: b.dryRun ?? false,
        maxTotalCost: b.maxCost ?? 5.0,
      });
      json(res, 200, { results, count: results.length });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CU CONTROL — cancel mid-run + watchdog status + telemetry
  // ════════════════════════════════════════════════════════════════════════
  // ── Brain-Aware CU — cerebro + memory + safety + RL feedback ──────────────
  {
    method: 'POST',
    pattern: '/api/cu/brain-aware/run',
    handler: async ({ res, body }) => {
      const { runBrainAwareCu } = await import('../capabilities/computerUse/brainAwareCu.js');
      const b = (body ?? {}) as Parameters<typeof runBrainAwareCu>[1];
      if (!b.instruction) {
        json(res, 400, { error: 'instruction requerida' });
        return;
      }
      const result = await runBrainAwareCu(brand, b);
      const { summarizeSession } = await import('../capabilities/computerUse/brainAwareCu.js');
      json(res, 200, { result, summary: summarizeSession(result) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/brain-aware/summary/:sessionId',
    handler: async ({ res, body }) => {
      const { summarizeSession, extractScreenshots } = await import('../capabilities/computerUse/brainAwareCu.js');
      const b = (body ?? {}) as { result?: Parameters<typeof summarizeSession>[0] };
      if (!b.result) {
        json(res, 400, { error: 'body.result requerido' });
        return;
      }
      json(res, 200, {
        summary: summarizeSession(b.result),
        screenshots: extractScreenshots(b.result).slice(0, 10),
      });
    },
  },

  {
    method: 'POST',
    pattern: '/api/cu/cancel/:sessionId',
    handler: async ({ res, params }) => {
      const sessionId = (params as Record<string, string>)?.sessionId;
      if (!sessionId) {
        json(res, 400, { error: 'sessionId requerido' });
        return;
      }
      const { cancelSession } = await import('../capabilities/computerUse/cuWatchdog.js');
      const ok = cancelSession(sessionId, 'api-cancel');
      json(res, ok ? 200 : 404, { ok, sessionId });
    },
  },
  {
    method: 'GET',
    pattern: '/api/cu/watchdog/active',
    handler: async ({ res }) => {
      const { listActiveWatchdogs } = await import('../capabilities/computerUse/cuWatchdog.js');
      const list = listActiveWatchdogs();
      json(res, 200, { active: list, count: list.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/cu/optimizer/status',
    handler: async ({ res }) => {
      json(res, 200, {
        compressScreenshots: process.env['CU_COMPRESS_SCREENSHOTS'] !== 'false',
        pruneHistory: process.env['CU_PRUNE_HISTORY'] !== 'false',
        promptCaching: process.env['CU_PROMPT_CACHING'] !== 'false',
        keepLastScreenshots: Number(process.env['CU_KEEP_LAST_SCREENSHOTS'] ?? 4),
        maxEmptyTurns: Number(process.env['CU_MAX_EMPTY_TURNS'] ?? 3),
        maxTurns: Number(process.env['COMPUTER_USE_MAX_TURNS'] ?? 14),
        sessionTimeoutMs: 300_000,
        turnTimeoutMs: 60_000,
        actionTimeoutMs: 8_000,
      });
    },
  },

  {
    method: 'GET',
    pattern: '/api/cu/apps/installed',
    handler: ({ res }) => json(res, 200, listInstalledApps()),
  },
  {
    method: 'POST',
    pattern: '/api/cu/apps/launch',
    handler: async ({ res, body }) => {
      const b = body as { app: string; url?: string; filePath?: string };
      json(res, 200, await launchApp(b.app as Parameters<typeof launchApp>[0], { url: b.url, filePath: b.filePath }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/canva/open',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { templateUrl?: string };
      json(res, 200, await openCanva(b.templateUrl));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/canva/to-instagram',
    handler: async ({ res, body }) =>
      json(res, 200, await runCanvaToInstagram(brand, body as Parameters<typeof runCanvaToInstagram>[1])),
  },
  {
    method: 'GET',
    pattern: '/api/cu/desktop-status',
    handler: ({ res }) => json(res, 200, getDesktopWorkflowsStatus()),
  },
  {
    method: 'GET',
    pattern: '/api/cu/profiles',
    handler: ({ res }) => json(res, 200, listChromeProfiles()),
  },
  {
    method: 'POST',
    pattern: '/api/cu/profiles',
    handler: ({ res, body }) => json(res, 200, createChromeProfile(body as Parameters<typeof createChromeProfile>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cu/profiles/:id/launch',
    handler: ({ res, params, body }) => {
      const b = (body ?? {}) as Parameters<typeof launchWithProfile>[1];
      json(res, 200, launchWithProfile(params['id']!, b));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/profiles/ensure-for-brand',
    handler: ({ res }) => json(res, 200, ensureProfileForBrand(brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/cu/profiles/snapshot',
    handler: ({ res }) => json(res, 200, getProfilesSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/cu/android/installed',
    handler: ({ res }) => json(res, 200, detectInstalledEmulators()),
  },
  {
    method: 'GET',
    pattern: '/api/cu/android',
    handler: ({ res }) => json(res, 200, listEmulators()),
  },
  {
    method: 'POST',
    pattern: '/api/cu/android',
    handler: ({ res, body }) => json(res, 200, registerEmulator(body as Parameters<typeof registerEmulator>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cu/android/:id/launch',
    handler: async ({ res, params }) => json(res, 200, await launchAndroidEmulator(params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/cu/android/snapshot',
    handler: ({ res }) => json(res, 200, getAndroidEmulatorSnapshot()),
  },
  {
    method: 'POST',
    pattern: '/api/cu/voice/narrate',
    handler: async ({ res, body }) => {
      const b = body as { text: string; category?: string };
      json(res, 200, await voiceNarrate(b.text, b.category as Parameters<typeof voiceNarrate>[1]));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cu/voice/config',
    handler: ({ res }) => json(res, 200, getNarratorConfig()),
  },
  {
    method: 'PUT',
    pattern: '/api/cu/voice/config',
    handler: ({ res, body }) =>
      json(res, 200, updateNarratorConfig(body as Parameters<typeof updateNarratorConfig>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cu/voice/level/:level',
    handler: ({ res, params }) =>
      json(res, 200, setNarratorLevel(params['level'] as Parameters<typeof setNarratorLevel>[0])),
  },
  {
    method: 'POST',
    pattern: '/api/cu/voice/enable',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { level?: 'quiet' | 'normal' | 'verbose' };
      json(res, 200, voiceNarratorEnable(b.level ?? 'normal'));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/voice/disable',
    handler: ({ res }) => json(res, 200, voiceNarratorDisable()),
  },
  {
    method: 'GET',
    pattern: '/api/cu/voice/enabled',
    handler: ({ res }) => json(res, 200, { enabled: voiceNarratorIsEnabled() }),
  },
  {
    method: 'GET',
    pattern: '/api/cu/voice/stats',
    handler: ({ res }) => json(res, 200, getNarratorStats()),
  },
  {
    method: 'GET',
    pattern: '/api/cu/replay',
    handler: ({ res, query }) => json(res, 200, listReplaySessions(asNumber(query['limit'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/cu/replay/:id',
    handler: ({ res, params }) => {
      const session = getReplaySession(params['id']!);
      if (!session) {
        json(res, 404, { error: 'not found' });
        return;
      }
      json(res, 200, { session, narrative: replayGenerateNarrative(params['id']!) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/cu/replay-stats',
    handler: ({ res }) => json(res, 200, getReplayStats()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CUA MODE — Off / Auto / Supervised (acompañar)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/cu/mode',
    handler: ({ res }) =>
      json(res, 200, {
        mode: getCuaMode(),
        state: getCuaModeState(),
        stats: getCuaModeStats(),
      }),
  },
  {
    method: 'PUT',
    pattern: '/api/cu/mode',
    handler: ({ res, body }) => {
      const b = body as { mode: CuaMode; reason?: string; changedBy?: string };
      if (!['off', 'auto', 'supervised'].includes(b.mode)) {
        json(res, 400, { error: 'invalid-mode', validModes: ['off', 'auto', 'supervised'] });
        return;
      }
      json(res, 200, setCuaMode(b.mode, { reason: b.reason, changedBy: b.changedBy }));
    },
  },
  {
    method: 'GET',
    pattern: '/api/cu/mode/pending-approvals',
    handler: ({ res }) => {
      cleanupExpiredApprovals();
      json(res, 200, listPendingApprovals());
    },
  },
  // Alias de aprobaciones genéricas — workspace.js llama a /api/approvals
  // Devuelve las aprobaciones CUA en formato { count, items }
  {
    method: 'GET',
    pattern: '/api/approvals',
    handler: ({ res }) => {
      cleanupExpiredApprovals();
      const raw = listPendingApprovals();
      const items = raw.map((a) => ({
        kind: 'checkpoint',
        title: a.action,
        detail: a.context + (a.workflow ? ` · ${a.workflow}` : ''),
        createdAt: a.createdAt,
        actionableId: a.id,
      }));
      json(res, 200, { count: items.length, items });
    },
  },
  {
    method: 'POST',
    pattern: '/api/approvals/:id/approve',
    handler: ({ req, res, params }) => {
      const by = req.headers['x-feedia-user'] as string | undefined;
      json(res, 200, approveAction(params['id']!, by));
    },
  },
  {
    method: 'POST',
    pattern: '/api/approvals/:id/reject',
    handler: ({ req, res, params, body }) => {
      const by = req.headers['x-feedia-user'] as string | undefined;
      const b = (body ?? {}) as { reason?: string };
      json(res, 200, rejectAction(params['id']!, by, b.reason));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CANVA BRAIN — Cerebro multi-agente para diseño autónomo en Canva
  //  7 profesionales especializados que operan Canva via Computer Use.
  //  Modo supervisor: aprobación humana antes de ejecutar.
  //  Modo autopilot: flujo completo sin intervención.
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/cu/canva/brain/agents',
    handler: ({ res }) => json(res, 200, { agents: CANVA_BRAIN_AGENTS }),
  },
  {
    method: 'POST',
    pattern: '/api/cu/canva/brain',
    handler: async ({ res, body }) => {
      const b = body as {
        designType?: string;
        topic?: string;
        objective?: string;
        tone?: string;
        extraInstructions?: string;
        mode?: string;
      };
      const result = await runCanvaBrain(
        brand,
        {
          designType: (b.designType ?? 'instagram-carousel') as Parameters<typeof runCanvaBrain>[1]['designType'],
          topic: b.topic ?? 'Contenido de marca',
          objective: b.objective ?? 'engagement',
          tone: b.tone,
          extraInstructions: b.extraInstructions,
        },
        (b.mode ?? 'supervisor') as CanvaBrainMode,
      );
      json(res, 200, result);
    },
  },
  {
    // Aprobar el paso de diseño en modo supervisor → Luca ejecuta en Canva
    method: 'POST',
    pattern: '/api/cu/canva/brain/:jobId/approve',
    handler: async ({ res, params, body }) => {
      const b = (body ?? {}) as {
        designType?: string;
        topic?: string;
        objective?: string;
        copywriting?: Record<string, unknown>;
        visualPlan?: Record<string, unknown>;
      };
      // Re-ejecutar con mode autopilot para que Luca abra Canva
      const result = await runCanvaBrain(
        brand,
        {
          designType: (b.designType ?? 'instagram-carousel') as Parameters<typeof runCanvaBrain>[1]['designType'],
          topic: b.topic ?? 'Contenido de marca',
          objective: b.objective ?? 'engagement',
          extraInstructions: `Job aprobado (${params['jobId']}). Ejecutar directamente sin pedir aprobación.`,
        },
        'autopilot',
      );
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/canva/brain/:jobId/reject',
    handler: ({ res, params }) => {
      json(res, 200, {
        ok: true,
        jobId: params['jobId'],
        status: 'rejected',
        message: 'Job de diseño cancelado por el usuario.',
      });
    },
  },

  // ── Coherence Guardian — gate de publicación ─────────────────────────────
  // GET /api/coherence/check — valida si el contenido cumple el mínimo de
  // coherencia de marca. Score < 70 → bloqueado. Score >= 70 → aprobado.
  {
    method: 'POST',
    pattern: '/api/coherence/check',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        content?: string; // texto del contenido a validar
        headline?: string;
        caption?: string;
        hashtags?: string[];
        bypassThreshold?: boolean; // admin override
      };

      const minScore = 70;

      // Validación determinista sin IA (fast path):
      // 1) Palabras prohibidas → penaliza el score
      // 2) Tono detectado vs tono de marca → bonus/malus
      const forbidden = (brand.voice?.forbidden ?? []).map((w) => w.toLowerCase());
      const contentText = [b.content ?? '', b.headline ?? '', b.caption ?? ''].join(' ').toLowerCase();

      let score = 85; // score base
      const violations: string[] = [];
      const notes: string[] = [];

      // Penalizar palabras prohibidas
      for (const word of forbidden) {
        if (contentText.includes(word)) {
          score -= 15;
          violations.push(`Palabra prohibida detectada: "${word}"`);
        }
      }

      // Bonus si menciona el nicho o nombre de marca
      if (contentText.includes(brand.name.toLowerCase()) || contentText.includes(brand.niche.toLowerCase())) {
        score = Math.min(100, score + 5);
        notes.push('Menciona la marca o el nicho — coherente.');
      }

      // Validar hashtags mínimos
      if (b.hashtags && b.hashtags.length < 3) {
        score -= 5;
        notes.push('Menos de 3 hashtags — recomendamos al menos 5.');
      }

      // ── Reglas de compliance por industria (del BrandProfile) ────────────
      // Estas reglas vienen del niche pack aplicado (ej: matrícula visible,
      // no diagnóstico online, no garantías financieras, etc.)
      const complianceRules = brand.complianceRules ?? [];
      const complianceViolations: string[] = [];

      for (const rule of complianceRules) {
        if (!rule.required) continue;
        // Heurísticas simples: si el rule tiene un keyword en su descripción,
        // verificamos que el contenido lo respete. Si el rule es sólo
        // declarativo (ej: matrícula en perfil) se omite en esta check.
        // Los rules con penalty > 0 se evalúan en la puntuación.
        const isLikelyViolation =
          rule.id === 'publicidad-declarada'
            ? !contentText.includes('#ad') && !contentText.includes('#publi') && !contentText.includes('#colaboracion')
            : rule.id === 'no-garantias' ||
                rule.id === 'no-garantias-falsas' ||
                rule.id === 'no-resultados-garantizados'
              ? contentText.includes('garantiz') || contentText.includes('100% seguro')
              : rule.id === 'no-consejo-sin-evaluacion' ||
                  rule.id === 'no-consejo-financiero-especifico' ||
                  rule.id === 'no-diagnostico-online'
                ? contentText.includes('te recomiendo') && !contentText.includes('consultá')
                : false; // otros rules son flags declarativos, no auto-detectables

        if (isLikelyViolation) {
          score -= rule.penalty;
          complianceViolations.push(
            `[${rule.id}] ${rule.description}${rule.example ? ` — Ejemplo correcto: "${rule.example}"` : ''}`,
          );
        }
      }

      if (complianceViolations.length > 0) {
        violations.push(...complianceViolations);
      }

      score = Math.max(0, Math.min(100, score));
      const approved = b.bypassThreshold ? true : score >= minScore;

      json(res, 200, {
        ok: true,
        score,
        approved,
        minScore,
        violations,
        complianceViolations,
        notes,
        nichePackId: brand.nichePackId ?? null,
        message: approved
          ? `✅ Score ${score}/100 — contenido aprobado por el Guardian de Coherencia.`
          : `🚫 Score ${score}/100 — por debajo del mínimo (${minScore}). Corregí las violaciones antes de publicar.`,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/canva/brain/:jobId/request-changes',
    handler: ({ res, params, body }) => {
      const b = (body ?? {}) as { changes?: string };
      json(res, 200, {
        ok: true,
        jobId: params['jobId'],
        status: 'changes-requested',
        changes: b.changes,
        message: 'Cambios solicitados. El equipo los procesará en el próximo ciclo.',
      });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  BRANDING BRAIN — 8 especialistas en marca (Lorenzo, Renata, Tomás,
  //  Aurora, Joaquín, Mariela, Bautista, Helena). Construcción, refinamiento,
  //  evolución y autopilot del branding completo.
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/branding/brain/agents',
    handler: ({ res }) => json(res, 200, { agents: BRANDING_BRAIN_AGENTS }),
  },
  {
    method: 'POST',
    pattern: '/api/branding/brain',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        goal?: string;
        userIdeas?: string;
        constraints?: string;
        targetTier?: string;
        mode?: string;
      };
      // Inyectar competidores en userIdeas si el usuario no especificó ideas propias
      try {
        const { readFileSync, existsSync } = await import('node:fs');
        const { resolve } = await import('node:path');
        const f = resolve('data/runtime/intelligence/competitors.json');
        if (existsSync(f) && !b.userIdeas) {
          const comps = JSON.parse(readFileSync(f, 'utf-8')) as Array<{ handle: string; niche: string }>;
          if (comps.length > 0) {
            b.userIdeas = `Competidores detectados: ${comps.map((c) => `@${c.handle} (${c.niche})`).join(', ')}. Usá esta info para encontrar ángulos diferenciales.`;
          }
        }
      } catch {
        /* noop */
      }
      const result = await runBrandingBrain(
        brand,
        {
          goal: b.goal ?? 'refinar la marca para el próximo trimestre',
          userIdeas: b.userIdeas,
          constraints: b.constraints,
          targetTier: (b.targetTier ?? 'growing') as Parameters<typeof runBrandingBrain>[1]['targetTier'],
        },
        (b.mode ?? 'refinement') as BrandingBrainMode,
      );
      json(res, 200, result);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  MASTER BRAIN — orquestador unificado de TODOS los cerebros y agentes.
  //  El cerebro central de Computer Use que une Canva Brain, Branding Brain,
  //  Agentes Generales, Planner y Controller bajo una sola intención.
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/cu/master/brains',
    handler: ({ res }) => json(res, 200, { brains: listAvailableBrains() }),
  },
  {
    method: 'POST',
    pattern: '/api/cu/master',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        userInput?: string;
        userPreferences?: string;
        userConstraints?: string;
        intent?: string;
        mode?: string;
        contentFormat?: string;
        topic?: string;
      };
      const ctx: MasterContext = {
        brand,
        userInput: b.userInput ?? '',
        userPreferences: b.userPreferences,
        userConstraints: b.userConstraints,
        intent: (b.intent ?? 'create-content') as MasterIntent,
        mode: (b.mode ?? 'supervisor') as MasterMode,
        contentFormat: b.contentFormat as MasterContext['contentFormat'],
        topic: b.topic,
      };
      const result = await runMasterBrain(ctx);
      // Incluir scoreEntry para que el frontend lo persista en localStorage
      const scoreEntry = {
        ts: Date.now(),
        innovationScore: result.innovationScore,
        influencerScore: result.influencerScore,
        brandCoherenceScore: result.brandCoherenceScore,
        jobId: result.jobId ?? null,
        contentFormat: b.contentFormat ?? 'carousel',
      };
      json(res, 200, { ...result, scoreEntry });
    },
  },

  // GET /api/cu/master/theater — SSE stream del Master Brain Live Theater.
  // El cliente se subscribe con EventSource y recibe eventos por cada paso
  // que los cerebros van completando. Permite un "live view" del orquestador.
  {
    method: 'GET',
    pattern: '/api/cu/master/theater',
    handler: async ({ res, query }) => {
      const userInput = (query['input'] as string | undefined) ?? '';
      const intent = (query['intent'] as string | undefined) ?? 'create-content';
      const format = (query['format'] as string | undefined) ?? 'carousel';

      // Cabeceras SSE
      const r = res as import('node:http').ServerResponse;
      r.statusCode = 200;
      r.setHeader('content-type', 'text/event-stream; charset=utf-8');
      r.setHeader('cache-control', 'no-cache, no-transform');
      r.setHeader('connection', 'keep-alive');
      r.setHeader('access-control-allow-origin', '*');
      if (typeof (r as { flushHeaders?: () => void }).flushHeaders === 'function') {
        (r as { flushHeaders: () => void }).flushHeaders();
      }

      const emit = (event: string, data: unknown): void => {
        try {
          r.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        } catch {
          /* cerrado */
        }
      };

      const ping = setInterval(() => {
        try {
          r.write(': ping\n\n');
        } catch {
          clearInterval(ping);
        }
      }, 20_000);

      emit('theater-start', { userInput, intent, format, ts: Date.now() });

      try {
        const ctx: MasterContext = {
          brand,
          userInput,
          intent: intent as MasterIntent,
          mode: 'supervisor' as MasterMode,
          contentFormat: format as MasterContext['contentFormat'],
          topic: userInput,
        };

        // Emitir cada brain activation como evento SSE
        // MasterBrain no tiene callbacks nativos — ejecutamos y emitimos resultado completo
        emit('theater-progress', { phase: 'orchestrating', message: 'Cerebro Maestro iniciado — activando cerebros…' });
        const result = await runMasterBrain(ctx);

        // Emitir pasos individuales como stream
        for (const step of result.steps ?? []) {
          emit('theater-step', {
            emoji: step.emoji,
            brainLabel: step.brainLabel,
            phase: step.phase,
            output: step.output,
            durationMs: step.durationMs,
          });
        }

        emit('theater-scores', {
          innovationScore: result.innovationScore,
          influencerScore: result.influencerScore,
          brandCoherenceScore: result.brandCoherenceScore,
        });

        emit('theater-recommendations', { recommendations: result.recommendations ?? [] });
        emit('theater-done', {
          ok: result.ok,
          totalDurationMs: result.totalDurationMs,
          brainsActivated: result.brainsActivated,
        });
      } catch (err) {
        emit('theater-error', { message: (err as Error).message });
      } finally {
        clearInterval(ping);
        try {
          r.end();
        } catch {
          /* ya cerrado */
        }
      }
    },
  },

  {
    method: 'POST',
    pattern: '/api/cu/mode/approve/:id',
    handler: ({ req, res, params }) => {
      const by = req.headers['x-feedia-user'] as string | undefined;
      json(res, 200, approveAction(params['id']!, by));
    },
  },
  {
    method: 'POST',
    pattern: '/api/cu/mode/reject/:id',
    handler: ({ req, res, params, body }) => {
      const by = req.headers['x-feedia-user'] as string | undefined;
      const b = (body ?? {}) as { reason?: string };
      json(res, 200, rejectAction(params['id']!, by, b.reason));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CONSUMPTION — Cost Attribution
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/consumption/cost/track',
    handler: ({ res, body }) => json(res, 200, trackCost(body as Parameters<typeof trackCost>[0])),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/dashboard',
    handler: ({ res }) => json(res, 200, buildCostAttributionDashboard()),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/by-workflow',
    handler: ({ res, query }) => json(res, 200, getCostBreakdownByWorkflow(query['from'] as string | undefined)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/by-agent',
    handler: ({ res, query }) => json(res, 200, getCostBreakdownByAgent(query['from'] as string | undefined)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/by-task',
    handler: ({ res, query }) => json(res, 200, getCostBreakdownByTaskType(query['from'] as string | undefined)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/by-feature',
    handler: ({ res, query }) => json(res, 200, getCostBreakdownByFeature(query['from'] as string | undefined)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/timeseries',
    handler: ({ res, query }) => json(res, 200, getCostTimeSeries(asNumber(query['days'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/cost/events',
    handler: ({ res, query }) => json(res, 200, getRecentCostEvents(asNumber(query['limit'], 50))),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CONSUMPTION — Quality Gate
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/consumption/quality/evaluate',
    handler: async ({ res, body }) => {
      const b = body as { responseText: string; surface: string; inputContext: string };
      json(
        res,
        200,
        await evaluateResponseQuality(
          b.responseText,
          b.surface as Parameters<typeof evaluateResponseQuality>[1],
          b.inputContext,
          brand,
        ),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/consumption/quality/check',
    handler: async ({ res, body }) => {
      const b = body as {
        responseText: string;
        surface: string;
        inputContext: string;
        metadata?: Record<string, unknown>;
      };
      json(
        res,
        200,
        await qualityCheckAndRecord({
          responseText: b.responseText,
          surface: b.surface as Parameters<typeof qualityCheckAndRecord>[0]['surface'],
          inputContext: b.inputContext,
          brand,
          metadata: b.metadata,
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/consumption/quality/dashboard',
    handler: ({ res }) => json(res, 200, buildQualityDashboard()),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/quality/recent',
    handler: ({ res, query }) => json(res, 200, getRecentQualityChecks(asNumber(query['limit'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/quality/thresholds',
    handler: ({ res }) => json(res, 200, getQualityThresholds()),
  },
  {
    method: 'PUT',
    pattern: '/api/consumption/quality/thresholds/:surface',
    handler: ({ res, params, body }) => {
      const b = body as { threshold: number };
      setSurfaceThreshold(params['surface'] as Parameters<typeof setSurfaceThreshold>[0], b.threshold);
      json(res, 200, { ok: true, thresholds: getQualityThresholds() });
    },
  },
  {
    method: 'POST',
    pattern: '/api/consumption/quality/:id/override',
    handler: ({ res, params, body }) => {
      const b = body as { override: 'forced-send' | 'rewrote' | 'cancelled' };
      json(res, 200, recordQualityOverride(params['id']!, b.override));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CONSUMPTION — Plan Recommendation
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/consumption/plan/recommend',
    handler: ({ res, query }) => json(res, 200, recommendPlan(asNumber(query['days'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/plan/usage',
    handler: ({ res, query }) => json(res, 200, buildUsageSnapshot(asNumber(query['days'], 30))),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/plan/available',
    handler: ({ res }) => json(res, 200, getAvailablePlans()),
  },
  {
    method: 'PUT',
    pattern: '/api/consumption/plan/custom',
    handler: ({ res, body }) => {
      setCustomPlans(body as Parameters<typeof setCustomPlans>[0]);
      json(res, 200, { ok: true, plans: getAvailablePlans() });
    },
  },
  {
    method: 'GET',
    pattern: '/api/consumption/plan/history',
    handler: ({ res }) => json(res, 200, getRecentRecommendations()),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CONSUMPTION — Smart Onboarding AI Guide
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/consumption/onboarding/sync',
    handler: ({ req, res }) => json(res, 200, onboardingSync(userIdFrom(req), brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/onboarding/next',
    handler: ({ req, res }) => json(res, 200, onboardingNextSteps(userIdFrom(req), brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/consumption/onboarding/step/:id/done',
    handler: ({ req, res, params }) => json(res, 200, markStepDone(userIdFrom(req), params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/consumption/onboarding/step/:id/skip',
    handler: ({ req, res, params }) => json(res, 200, skipStep(userIdFrom(req), params['id']!)),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/onboarding/tip',
    handler: async ({ req, res }) => json(res, 200, { tip: await generateContextualTip(userIdFrom(req), brand) }),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/onboarding/snapshot',
    handler: ({ res }) => json(res, 200, getOnboardingSnapshot()),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/onboarding/steps',
    handler: ({ res }) => json(res, 200, getOnboardingSteps()),
  },
  {
    method: 'GET',
    pattern: '/api/consumption/onboarding/progress',
    handler: ({ req, res }) => json(res, 200, getProgressForUser(userIdFrom(req))),
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CHURN SHIELD (operator-only — endpoints internos, NO en UI usuario)
  //  Headers requeridos: X-Feedia-Operator: <key> (a configurar en env)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/_internal/churn-shield/evaluate',
    handler: ({ req, res, body }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      const b = body as { accountId: string; brandName: string };
      json(res, 200, evaluateAccount(b.accountId, b.brandName));
    },
  },
  {
    method: 'POST',
    pattern: '/api/_internal/churn-shield/play',
    handler: ({ req, res, body }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      const b = body as { accountId: string; play: string; dryRun?: boolean };
      json(res, 200, executePlay(b.accountId, b.play as Parameters<typeof executePlay>[1], { dryRun: b.dryRun }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/_internal/churn-shield/tick',
    handler: ({ req, res, body }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      const b = (body ?? { accountIds: [] }) as { accountIds: Array<{ accountId: string; brandName: string }> };
      json(res, 200, tickShield(b.accountIds));
    },
  },
  {
    method: 'GET',
    pattern: '/api/_internal/churn-shield/at-risk',
    handler: ({ req, res }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      json(res, 200, listAccountsAtRisk());
    },
  },
  {
    method: 'GET',
    pattern: '/api/_internal/churn-shield/account/:id',
    handler: ({ req, res, params }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      json(res, 200, getAccountChurnState(params['id']!));
    },
  },
  {
    method: 'GET',
    pattern: '/api/_internal/churn-shield/snapshot',
    handler: ({ req, res }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      json(res, 200, getShieldSnapshot());
    },
  },
  {
    method: 'PUT',
    pattern: '/api/_internal/churn-shield/config',
    handler: ({ req, res, body }) => {
      const op = req.headers['x-feedia-operator'];
      if (!op || op !== (process.env['FEEDIA_OPERATOR_KEY'] ?? '__not-set__')) {
        json(res, 403, { error: 'operator-only' });
        return;
      }
      const b = body as { silentMode?: boolean; operatorContact?: { email?: string; webhook?: string } };
      if (b.silentMode !== undefined) setSilentMode(b.silentMode);
      if (b.operatorContact) setOperatorContact(b.operatorContact);
      json(res, 200, getShieldSnapshot());
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  INTELLIGENCE — Differential Strategist: competitors monitor
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/intelligence/competitors',
    handler: ({ res }) =>
      json(res, 200, {
        competitors: [],
        message: 'Sin competidores configurados. El Estratega Diferencial los usará cuando estén cargados.',
      }),
  },
  {
    method: 'POST',
    pattern: '/api/intelligence/competitors',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { competitors: Array<{ handle: string; niche: string; notes?: string }> };
      const { resolve } = await import('node:path');
      const { writeFileSync, mkdirSync } = await import('node:fs');
      const dir = resolve('data/runtime/intelligence');
      mkdirSync(dir, { recursive: true });
      writeFileSync(resolve(dir, 'competitors.json'), JSON.stringify(b.competitors, null, 2));
      json(res, 200, { ok: true, count: b.competitors.length });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  A/B TESTING ENGINE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/ab-tests',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { topic?: string; contentType?: string; metric?: string; variantCount?: number };
      const { createABTest } = await import('../capabilities/computerUse/abTestingEngine.js');
      const test = await createABTest(brand, {
        topic: b.topic ?? 'Contenido de marca',
        contentType: (b.contentType ?? 'carrusel') as Parameters<typeof createABTest>[1]['contentType'],
        metric: (b.metric ?? 'engagement_rate') as Parameters<typeof createABTest>[1]['metric'],
        variantCount: b.variantCount,
      });
      json(res, 200, { ok: true, test });
    },
  },
  {
    method: 'GET',
    pattern: '/api/ab-tests',
    handler: async ({ res }) => {
      const { listABTests } = await import('../capabilities/computerUse/abTestingEngine.js');
      const brandId = getActiveBrandId();
      json(res, 200, { tests: listABTests(brandId) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/ab-tests/:id',
    handler: async ({ res, params }) => {
      const { getABTest } = await import('../capabilities/computerUse/abTestingEngine.js');
      const brandId = getActiveBrandId();
      const test = getABTest(params['id']!, brandId);
      if (!test) return json(res, 404, { error: 'Test no encontrado' });
      return json(res, 200, { test });
    },
  },
  {
    method: 'POST',
    pattern: '/api/ab-tests/:id/evaluate',
    handler: async ({ res, params, body }) => {
      const b = (body ?? {}) as { metrics: Record<string, { value: number; sampleSize: number }> };
      const { evaluateABTest } = await import('../capabilities/computerUse/abTestingEngine.js');
      const brandId = getActiveBrandId();
      const result = await evaluateABTest(params['id']!, brandId, b.metrics ?? {});
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/ab-tests/suggest-next',
    handler: async ({ res }) => {
      const { listABTests, suggestNextTest } = await import('../capabilities/computerUse/abTestingEngine.js');
      const brandId = getActiveBrandId();
      const past = listABTests(brandId);
      const suggestion = await suggestNextTest(brand, past);
      json(res, 200, suggestion);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  HASHTAG ENGINE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/hashtags/strategy',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { topic?: string; format?: string; hook?: string };
      const { generateHashtagStrategy } = await import('../capabilities/computerUse/hashtagEngine.js');
      const strategy = await generateHashtagStrategy(brand, {
        topic: b.topic ?? '',
        format: b.format ?? 'carrusel',
        hook: b.hook ?? '',
      });
      json(res, 200, strategy);
    },
  },
  {
    method: 'POST',
    pattern: '/api/hashtags/rotate',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { recentlyUsed?: string[][] };
      const { rotateHashtagSets } = await import('../capabilities/computerUse/hashtagEngine.js');
      const tags = await rotateHashtagSets(brand, b.recentlyUsed ?? []);
      json(res, 200, { tags });
    },
  },
  {
    method: 'POST',
    pattern: '/api/hashtags/score',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { tags?: string[] };
      const { scoreHashtagSet } = await import('../capabilities/computerUse/hashtagEngine.js');
      const result = await scoreHashtagSet(b.tags ?? [], brand.niche);
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/hashtags/build-pool',
    handler: async ({ res }) => {
      const { buildHashtagPool } = await import('../capabilities/computerUse/hashtagEngine.js');
      const pool = await buildHashtagPool(brand);
      json(res, 200, { pool });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  DM CONVERSATION ENGINE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/dm/conversations',
    handler: async ({ res }) => {
      const { loadDMConversations } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const brandId = getActiveBrandId();
      json(res, 200, { conversations: loadDMConversations(brandId) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/dm/classify',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { messages?: unknown[]; username?: string };
      const { classifyDM } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const result = await classifyDM(
        { messages: (b.messages ?? []) as Parameters<typeof classifyDM>[0]['messages'], username: b.username ?? '' },
        brand,
      );
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/dm/reply',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { conversation: unknown; mode?: 'autopilot' | 'supervised' };
      const { generateReply } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const draft = await generateReply(b.conversation as Parameters<typeof generateReply>[0], brand, {
        mode: b.mode ?? 'supervised',
      });
      json(res, 200, draft);
    },
  },
  {
    method: 'POST',
    pattern: '/api/dm/batch',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { conversations: unknown[] };
      const { processInboxBatch } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const result = await processInboxBatch(b.conversations as Parameters<typeof processInboxBatch>[0], brand);
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/dm/quick-replies/:intent',
    handler: async ({ res, params }) => {
      const { generateQuickReplies } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const replies = await generateQuickReplies(params['intent'] as Parameters<typeof generateQuickReplies>[0], brand);
      json(res, 200, { replies });
    },
  },
  {
    method: 'POST',
    pattern: '/api/dm/templates/build',
    handler: async ({ res }) => {
      const { buildAutoResponseTemplates } = await import('../capabilities/computerUse/dmConversationEngine.js');
      const templates = await buildAutoResponseTemplates(brand);
      json(res, 200, { templates });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CONTENT QUEUE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/queue',
    handler: async ({ res, query }) => {
      const { getQueue, getQueueSummary } = await import('../capabilities/computerUse/contentQueue.js');
      const brandId = getActiveBrandId();
      const items = getQueue(brandId, {
        status: query['status'] as Parameters<typeof getQueue>[1] extends { status?: infer S } ? S : undefined,
        format: query['format'] as Parameters<typeof getQueue>[1] extends { format?: infer F } ? F : undefined,
      });
      const summary = getQueueSummary(brandId);
      json(res, 200, { items, summary });
    },
  },
  {
    method: 'POST',
    pattern: '/api/queue',
    handler: async ({ res, body }) => {
      const { addToQueue } = await import('../capabilities/computerUse/contentQueue.js');
      const b = (body ?? {}) as Parameters<typeof addToQueue>[0];
      const item = addToQueue({ ...b, brandId: getActiveBrandId() });
      json(res, 200, { ok: true, item });
    },
  },
  {
    method: 'PATCH',
    pattern: '/api/queue/:id',
    handler: async ({ res, params, body }) => {
      const { updateQueueItem } = await import('../capabilities/computerUse/contentQueue.js');
      const brandId = getActiveBrandId();
      const updated = updateQueueItem(params['id']!, brandId, (body ?? {}) as Parameters<typeof updateQueueItem>[2]);
      if (!updated) return json(res, 404, { error: 'Item no encontrado' });
      return json(res, 200, { ok: true, item: updated });
    },
  },
  {
    method: 'DELETE',
    pattern: '/api/queue/:id',
    handler: async ({ res, params }) => {
      const { removeFromQueue } = await import('../capabilities/computerUse/contentQueue.js');
      const brandId = getActiveBrandId();
      const ok = removeFromQueue(params['id']!, brandId);
      json(res, 200, { ok });
    },
  },
  {
    method: 'POST',
    pattern: '/api/queue/schedule',
    handler: async ({ res }) => {
      const { getQueue, suggestOptimalSchedule, updateQueueItem } =
        await import('../capabilities/computerUse/contentQueue.js');
      const brandId = getActiveBrandId();
      const items = getQueue(brandId, { status: 'draft' });
      const scheduled = await suggestOptimalSchedule(brand, items);
      for (const item of scheduled) {
        updateQueueItem(item.id, brandId, { scheduledFor: item.scheduledFor, status: 'scheduled' });
      }
      json(res, 200, { ok: true, scheduled: scheduled.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/queue/windows',
    handler: async ({ res }) => {
      const { getPublishingWindows } = await import('../capabilities/computerUse/contentQueue.js');
      json(res, 200, { windows: getPublishingWindows(brand) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/queue/process-next',
    handler: async ({ res }) => {
      const { processNextDue } = await import('../capabilities/computerUse/contentQueue.js');
      const brandId = getActiveBrandId();
      const next = processNextDue(brandId);
      json(res, 200, { ok: true, item: next });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CAPTION GENERATOR
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/caption/generate',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { topic?: string; format?: string; hook?: string; bodyText?: string; cta?: string };
      const { generateCaption } = await import('../capabilities/computerUse/captionGenerator.js');
      const caption = await generateCaption({
        topic: b.topic ?? '',
        format: (b.format ?? 'carrusel') as Parameters<typeof generateCaption>[0]['format'],
        hook: b.hook ?? '',
        body: b.bodyText ?? '',
        cta: b.cta,
        brand,
      });
      json(res, 200, caption);
    },
  },
  {
    method: 'POST',
    pattern: '/api/caption/variants',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { topic?: string; format?: string; baseCaption?: string };
      const { generateCaptionVariants } = await import('../capabilities/computerUse/captionGenerator.js');
      const variants = await generateCaptionVariants({
        topic: b.topic ?? '',
        format: b.format ?? 'carrusel',
        brand,
        baseCaption: b.baseCaption,
      });
      json(res, 200, variants);
    },
  },
  {
    method: 'POST',
    pattern: '/api/caption/subtitles',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { transcript?: string; durationMs?: number; language?: string };
      const { generateSubtitles, subtitleTrackToSRT, subtitleTrackToVTT } =
        await import('../capabilities/computerUse/captionGenerator.js');
      const track = generateSubtitles({
        transcript: b.transcript ?? '',
        durationMs: b.durationMs ?? 30000,
        language: b.language ?? 'es-AR',
      });
      json(res, 200, { track, srt: subtitleTrackToSRT(track), vtt: subtitleTrackToVTT(track) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/caption/alt-text',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { visualDescription?: string; context?: string };
      const { generateAltText } = await import('../capabilities/computerUse/captionGenerator.js');
      const altText = await generateAltText({
        visualDescription: b.visualDescription ?? '',
        brand,
        context: b.context ?? '',
      });
      json(res, 200, { altText });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMMENT ORCHESTRATOR
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/comments/analyze',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { comments?: unknown[]; postId?: string };
      const { analyzeComments } = await import('../capabilities/computerUse/commentOrchestrator.js');
      const batch = await analyzeComments((b.comments ?? []) as Parameters<typeof analyzeComments>[0], brand);
      json(res, 200, batch);
    },
  },
  {
    method: 'POST',
    pattern: '/api/comments/replies',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { batch?: unknown; mode?: 'autopilot' | 'supervised'; maxReplies?: number };
      const { generateCommentReplies } = await import('../capabilities/computerUse/commentOrchestrator.js');
      const plans = await generateCommentReplies(b.batch as Parameters<typeof generateCommentReplies>[0], brand, {
        mode: b.mode ?? 'supervised',
        maxReplies: b.maxReplies,
      });
      json(res, 200, { plans });
    },
  },
  {
    method: 'POST',
    pattern: '/api/comments/detect-crisis',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { batch?: unknown };
      const { detectCrisis } = await import('../capabilities/computerUse/commentOrchestrator.js');
      const crisis = detectCrisis(b.batch as Parameters<typeof detectCrisis>[0]);
      json(res, 200, crisis);
    },
  },
  {
    method: 'POST',
    pattern: '/api/comments/seed',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { hook?: string; caption?: string; format?: string; count?: number };
      const { generateSeedComments } = await import('../capabilities/computerUse/commentOrchestrator.js');
      const comments = await generateSeedComments(
        { hook: b.hook ?? '', caption: b.caption ?? '', format: b.format ?? 'carrusel' },
        brand,
        b.count,
      );
      json(res, 200, { comments });
    },
  },
  {
    method: 'POST',
    pattern: '/api/comments/library/build',
    handler: async ({ res }) => {
      const { buildCommentResponseLibrary } = await import('../capabilities/computerUse/commentOrchestrator.js');
      const library = await buildCommentResponseLibrary(brand);
      json(res, 200, { library });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  TRENDING ENGINE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/trends/detect',
    handler: async ({ res }) => {
      const { detectTrends } = await import('../capabilities/computerUse/trendingEngine.js');
      const report = await detectTrends(brand);
      json(res, 200, report);
    },
  },
  {
    method: 'GET',
    pattern: '/api/trends/latest',
    handler: async ({ res }) => {
      const { getLatestTrendingReport } = await import('../capabilities/computerUse/trendingEngine.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestTrendingReport(brandId);
      json(res, report ? 200 : 404, report ?? { error: 'No hay reporte de tendencias aún' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/trends/adapt',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { trend?: unknown };
      const { adaptTrendToContent } = await import('../capabilities/computerUse/trendingEngine.js');
      const adaptation = await adaptTrendToContent(b.trend as Parameters<typeof adaptTrendToContent>[0], brand);
      json(res, 200, adaptation);
    },
  },
  {
    method: 'POST',
    pattern: '/api/trends/calendar',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { days?: number };
      const { getLatestTrendingReport, buildTrendingContentCalendar } =
        await import('../capabilities/computerUse/trendingEngine.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestTrendingReport(brandId);
      if (!report) {
        json(res, 400, { error: 'Primero detecta tendencias con POST /api/trends/detect' });
        return;
      }
      const calendar = await buildTrendingContentCalendar(report, brand, b.days ?? 7);
      json(res, 200, { calendar });
    },
  },
  {
    method: 'POST',
    pattern: '/api/trends/score',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { trend?: unknown };
      const { scoreTrendRelevance } = await import('../capabilities/computerUse/trendingEngine.js');
      const score = scoreTrendRelevance(b.trend as Parameters<typeof scoreTrendRelevance>[0], brand);
      json(res, 200, { score });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  COMPETITOR ADAPTATION ENGINE
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/competitors/analyze',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { handles?: string[] };
      const { analyzeCompetitors } = await import('../capabilities/computerUse/competitorAdaptation.js');
      const report = await analyzeCompetitors(brand, b.handles ?? []);
      json(res, 200, report);
    },
  },
  {
    method: 'GET',
    pattern: '/api/competitors/latest',
    handler: async ({ res }) => {
      const { getLatestAnalysis } = await import('../capabilities/computerUse/competitorAdaptation.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestAnalysis(brandId);
      json(res, report ? 200 : 404, report ?? { error: 'No hay análisis de competidores aún' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/competitors/strategies',
    handler: async ({ res }) => {
      const { getLatestAnalysis, extractWinningStrategies } =
        await import('../capabilities/computerUse/competitorAdaptation.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestAnalysis(brandId);
      if (!report) {
        json(res, 400, { error: 'Primero analiza competidores con POST /api/competitors/analyze' });
        return;
      }
      const strategies = await extractWinningStrategies(report, brand);
      json(res, 200, { strategies });
    },
  },
  {
    method: 'POST',
    pattern: '/api/competitors/content-from-gaps',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { maxIdeas?: number };
      const { getLatestAnalysis, generateContentFromGaps } =
        await import('../capabilities/computerUse/competitorAdaptation.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestAnalysis(brandId);
      if (!report) {
        json(res, 400, { error: 'Primero analiza competidores con POST /api/competitors/analyze' });
        return;
      }
      const ideas = await generateContentFromGaps(report, brand, b.maxIdeas ?? 5);
      json(res, 200, { ideas });
    },
  },
  {
    method: 'POST',
    pattern: '/api/competitors/compare',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        followers?: number;
        engagementRate?: number;
        postingFrequency?: 'diaria' | '3-5-semana' | '1-2-semana' | 'esporadica';
      };
      const { getLatestAnalysis, compareToCompetitors } =
        await import('../capabilities/computerUse/competitorAdaptation.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestAnalysis(brandId);
      if (!report) {
        json(res, 400, { error: 'Primero analiza competidores con POST /api/competitors/analyze' });
        return;
      }
      const comparison = compareToCompetitors(brand, report, {
        followers: b.followers ?? 0,
        engagementRate: b.engagementRate ?? 0,
        postingFrequency: b.postingFrequency ?? 'esporadica',
      });
      json(res, 200, comparison);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  NEURAL BRAIN — Cerebro Central Autónomo
  // ════════════════════════════════════════════════════════════════════════

  /** POST /api/neural/cycle — Ejecuta un ciclo autónomo completo */
  {
    method: 'POST',
    pattern: '/api/neural/cycle',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        rawMetrics?: import('../brain/neural/autonomyCore.js').RawMetricsInput;
        config?: Partial<import('../brain/neural/autonomyCore.js').CoreConfig>;
      };
      const { runAutonomousCycle } = await import('../brain/neural/autonomyCore.js');
      const rawMetrics: import('../brain/neural/autonomyCore.js').RawMetricsInput = {
        followers: b.rawMetrics?.followers ?? 1000,
        weeklyFollowerDelta: b.rawMetrics?.weeklyFollowerDelta ?? 10,
        avgEngagementRate: b.rawMetrics?.avgEngagementRate ?? 0.03,
        avgReachPerPost: b.rawMetrics?.avgReachPerPost ?? 500,
        postsPerWeek: b.rawMetrics?.postsPerWeek ?? 4,
        brandCoherenceScore: b.rawMetrics?.brandCoherenceScore ?? 70,
        lastPublishHour: b.rawMetrics?.lastPublishHour ?? 18,
      };
      const result = await runAutonomousCycle(brand, rawMetrics, b.config ?? {});
      json(res, 200, result);
    },
  },

  /** GET /api/neural/status — Estado del cerebro autónomo */
  {
    method: 'GET',
    pattern: '/api/neural/status',
    handler: async ({ res }) => {
      const { getBrainStatus } = await import('../brain/neural/autonomyCore.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const status = await getBrainStatus(brandId);
      json(res, 200, status);
    },
  },

  /** GET /api/neural/last-cycle — Último ciclo sin ejecutar uno nuevo */
  {
    method: 'GET',
    pattern: '/api/neural/last-cycle',
    handler: async ({ res }) => {
      const { getLastCycle } = await import('../brain/neural/autonomyCore.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const cycle = await getLastCycle(brandId);
      json(res, cycle ? 200 : 404, cycle ?? { error: 'Sin ciclos aún. Ejecuta POST /api/neural/cycle' });
    },
  },

  /** GET /api/neural/history — Historial de ciclos */
  {
    method: 'GET',
    pattern: '/api/neural/history',
    handler: async ({ res, query }) => {
      const { getCycleHistory } = await import('../brain/neural/autonomyCore.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const limit = Number((query as Record<string, string>)?.limit ?? '20');
      const history = await getCycleHistory(brandId, limit);
      json(res, 200, { history, count: history.length });
    },
  },

  /** GET /api/neural/weights — Pesos actuales de la red */
  {
    method: 'GET',
    pattern: '/api/neural/weights',
    handler: async ({ res }) => {
      const { getCurrentWeights } = await import('../brain/neural/autonomyCore.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const weights = await getCurrentWeights(brandId);
      json(res, 200, weights);
    },
  },

  /** POST /api/neural/weights/reset — Resetea pesos a default */
  {
    method: 'POST',
    pattern: '/api/neural/weights/reset',
    handler: async ({ res }) => {
      const { resetWeights } = await import('../brain/neural/autonomyCore.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      await resetWeights(brandId);
      json(res, 200, { ok: true, message: 'Pesos reseteados a valores por defecto' });
    },
  },

  /** POST /api/neural/feedback/cycle — Ciclo de feedback aislado */
  {
    method: 'POST',
    pattern: '/api/neural/feedback/cycle',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { state?: import('../brain/neural/neuralKnowledgeBase.js').NeuralInputState };
      if (!b.state) {
        json(res, 400, { error: 'Falta body.state (NeuralInputState)' });
        return;
      }
      const { runFeedbackCycle } = await import('../brain/neural/feedbackLoop.js');
      const evaluation = await runFeedbackCycle(brand, b.state);
      json(res, 200, evaluation);
    },
  },

  /** GET /api/neural/feedback/latest — Última evaluación de feedback */
  {
    method: 'GET',
    pattern: '/api/neural/feedback/latest',
    handler: async ({ res }) => {
      const { getLatestEvaluation } = await import('../brain/neural/feedbackLoop.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const evaluation = await getLatestEvaluation(brandId);
      json(res, evaluation ? 200 : 404, evaluation ?? { error: 'Sin evaluaciones aún' });
    },
  },

  /** GET /api/neural/safety/status — Estado de circuit breakers y rate limits */
  {
    method: 'GET',
    pattern: '/api/neural/safety/status',
    handler: async ({ res }) => {
      const { generateSafetyReport } = await import('../brain/neural/safetyController.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await generateSafetyReport(brandId);
      json(res, 200, report);
    },
  },

  /** POST /api/neural/safety/check — Verifica seguridad de una acción */
  {
    method: 'POST',
    pattern: '/api/neural/safety/check',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { action?: string };
      if (!b.action) {
        json(res, 400, { error: 'Falta body.action' });
        return;
      }
      const { checkActionSafety } = await import('../brain/neural/safetyController.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const check = await checkActionSafety(
        brandId,
        b.action as import('../brain/neural/reinforcementEngine.js').RLAction,
      );
      json(res, 200, check);
    },
  },

  /** GET /api/neural/mlops/deployment — Deployment activo actual */
  {
    method: 'GET',
    pattern: '/api/neural/mlops/deployment',
    handler: async ({ res }) => {
      const { getDataPipelineStats } = await import('../brain/neural/mlopsOrchestrator.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const stats = await getDataPipelineStats(brandId);
      json(res, 200, stats);
    },
  },

  /** POST /api/neural/mlops/retrain — Fuerza reentrenamiento */
  {
    method: 'POST',
    pattern: '/api/neural/mlops/retrain',
    handler: async ({ res }) => {
      const { getCurrentPolicy, getEpisodeHistory } = await import('../brain/neural/reinforcementEngine.js');
      const { runRetrainingJob: mlopsRetrain } = await import('../brain/neural/mlopsOrchestrator.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const [episodes, policy] = await Promise.all([getEpisodeHistory(brandId, 50), getCurrentPolicy(brandId)]);
      const result = await mlopsRetrain(brandId, 'manual', episodes, policy);
      json(res, 200, result);
    },
  },

  /** POST /api/neural/rl/refine — Refinamiento de política RL con Claude */
  {
    method: 'POST',
    pattern: '/api/neural/rl/refine',
    handler: async ({ res }) => {
      const { refinePolicyWithClaude, getEpisodeHistory } = await import('../brain/neural/reinforcementEngine.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const episodes = await getEpisodeHistory(brandId, 20);
      const recommendations = await refinePolicyWithClaude(brand, episodes);
      json(res, 200, { recommendations });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  CREADORES + DISEÑO (Reels, Visual Identity, Feed, Multi-Format)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/reels/script',
    handler: async ({ res, body }) => {
      const { generateReelScript } = await import('../capabilities/reelStudio/reelScriptwriter.js');
      const b = (body ?? {}) as { topic: string; style?: string; duration?: number };
      const script = await generateReelScript(brand, {
        topic: b.topic,
        style: (b.style as Parameters<typeof generateReelScript>[1]['style']) ?? 'storytelling',
        duration: (b.duration as 15 | 30 | 60 | 90) ?? 30,
      });
      json(res, 200, script);
    },
  },
  {
    method: 'POST',
    pattern: '/api/reels/hooks',
    handler: async ({ res, body }) => {
      const { generateHookVariants } = await import('../capabilities/reelStudio/reelScriptwriter.js');
      const b = (body ?? {}) as { topic: string; style?: string };
      const hooks = await generateHookVariants(
        brand,
        b.topic,
        (b.style as Parameters<typeof generateHookVariants>[2]) ?? 'storytelling',
      );
      json(res, 200, { hooks });
    },
  },
  {
    method: 'POST',
    pattern: '/api/reels/series',
    handler: async ({ res, body }) => {
      const { generateReelSeries } = await import('../capabilities/reelStudio/reelScriptwriter.js');
      const b = (body ?? {}) as { theme: string; episodes?: number; style?: string };
      const series = await generateReelSeries(
        brand,
        b.theme,
        b.episodes ?? 5,
        (b.style as Parameters<typeof generateReelSeries>[3]) ?? 'storytelling',
      );
      json(res, 200, { series });
    },
  },
  {
    method: 'POST',
    pattern: '/api/identity/build',
    handler: async ({ res, body }) => {
      const { buildVisualIdentity } = await import('../capabilities/visualIdentity/identityBuilder.js');
      const b = (body ?? {}) as Parameters<typeof buildVisualIdentity>[1];
      const identity = await buildVisualIdentity(brand, b);
      json(res, 200, identity);
    },
  },
  {
    method: 'GET',
    pattern: '/api/identity',
    handler: async ({ res }) => {
      const { getIdentity, exportGuidelines } = await import('../capabilities/visualIdentity/identityBuilder.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const identity = await getIdentity(brandId);
      if (!identity) {
        json(res, 404, { error: 'Sin identidad. POST /api/identity/build' });
        return;
      }
      json(res, 200, { identity, markdown: exportGuidelines(identity) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/feed/analyze',
    handler: async ({ res, body }) => {
      const { analyzeFeedGrid } = await import('../capabilities/feedAesthetic/feedPlanner.js');
      const b = (body ?? {}) as {
        slots: Parameters<typeof analyzeFeedGrid>[1];
        pattern?: Parameters<typeof analyzeFeedGrid>[2];
      };
      const grid = await analyzeFeedGrid(brand, b.slots, b.pattern);
      json(res, 200, grid);
    },
  },
  {
    method: 'GET',
    pattern: '/api/feed/next',
    handler: async ({ res }) => {
      const { getCurrentGrid, suggestNextPost } = await import('../capabilities/feedAesthetic/feedPlanner.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const grid = await getCurrentGrid(brandId);
      if (!grid) {
        json(res, 404, { error: 'Sin grid. POST /api/feed/analyze' });
        return;
      }
      const suggestion = await suggestNextPost(brand, grid);
      json(res, 200, suggestion);
    },
  },
  {
    method: 'POST',
    pattern: '/api/multi-format/adapt',
    handler: async ({ res, body }) => {
      const { adaptToMultipleFormats } = await import('../capabilities/multiFormatAdapter/formatAdapter.js');
      const b = (body ?? {}) as {
        content: string;
        topic: string;
        formats: Parameters<typeof adaptToMultipleFormats>[1]['formats'];
      };
      const adapted = await adaptToMultipleFormats(brand, b);
      json(res, 200, adapted);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  ESPECIALISTAS (Hashtag, Influencer, Bio)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/hashtags/research',
    handler: async ({ res, body }) => {
      const { researchHashtags } = await import('../capabilities/hashtagScientist/deepResearch.js');
      const b = (body ?? {}) as Parameters<typeof researchHashtags>[1];
      const research = await researchHashtags(brand, b);
      json(res, 200, research);
    },
  },
  {
    method: 'GET',
    pattern: '/api/hashtags/latest',
    handler: async ({ res }) => {
      const { getResearch } = await import('../capabilities/hashtagScientist/deepResearch.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const research = await getResearch(brandId);
      json(res, research ? 200 : 404, research ?? { error: 'Sin research. POST /api/hashtags/research' });
    },
  },
  {
    method: 'POST',
    pattern: '/api/influencers/find',
    handler: async ({ res, body }) => {
      const { findCompatibleInfluencers } = await import('../capabilities/influencerOutreach/outreachManager.js');
      const b = (body ?? {}) as Parameters<typeof findCompatibleInfluencers>[1];
      const influencers = await findCompatibleInfluencers(brand, b);
      json(res, 200, { influencers });
    },
  },
  {
    method: 'POST',
    pattern: '/api/influencers/outreach',
    handler: async ({ res, body }) => {
      const { composeOutreachMessage, createCollabRecord } =
        await import('../capabilities/influencerOutreach/outreachManager.js');
      const b = (body ?? {}) as {
        influencer: Parameters<typeof composeOutreachMessage>[1];
        deliverable: string;
        budget?: number;
      };
      const message = await composeOutreachMessage(brand, b.influencer, b.deliverable, b.budget);
      const collab = await createCollabRecord(brand, b.influencer.handle, message.message);
      json(res, 200, { message, collab });
    },
  },
  {
    method: 'GET',
    pattern: '/api/influencers/pipeline',
    handler: async ({ res }) => {
      const { getPipeline } = await import('../capabilities/influencerOutreach/outreachManager.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const pipeline = await getPipeline(brandId);
      json(res, 200, pipeline);
    },
  },
  {
    method: 'POST',
    pattern: '/api/bio/optimize',
    handler: async ({ res, body }) => {
      const { optimizeProfile } = await import('../capabilities/bioOptimizer/bioOptimizer.js');
      const b = (body ?? {}) as Parameters<typeof optimizeProfile>[1];
      const optimization = await optimizeProfile(brand, b);
      json(res, 200, optimization);
    },
  },
  {
    method: 'POST',
    pattern: '/api/bio/audit',
    handler: async ({ res, body }) => {
      const { auditCurrentProfile } = await import('../capabilities/bioOptimizer/bioOptimizer.js');
      const b = (body ?? {}) as Parameters<typeof auditCurrentProfile>[1];
      const audit = await auditCurrentProfile(brand, b);
      json(res, 200, audit);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  //  NEURAL EXPANSION (Memory, Attention, Ensemble, Conv, RNN, Dropout)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/neural/memory/recall',
    handler: async ({ res, body }) => {
      const { recallMemories } = await import('../brain/neural/memoryNeurons.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as Partial<Parameters<typeof recallMemories>[0]>;
      const result = await recallMemories({ brandId, ...b });
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/neural/memory/consolidate',
    handler: async ({ res }) => {
      const { consolidateMemories } = await import('../brain/neural/memoryNeurons.js');
      const memories = await consolidateMemories(brand);
      json(res, 200, { semanticMemories: memories, count: memories.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/neural/memory/stats',
    handler: async ({ res }) => {
      const { getMemoryStats } = await import('../brain/neural/memoryNeurons.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const stats = await getMemoryStats(brandId);
      json(res, 200, stats);
    },
  },
  {
    method: 'POST',
    pattern: '/api/neural/attention/run',
    handler: async ({ res, body }) => {
      const { runMultiHeadAttention } = await import('../brain/neural/attentionMechanism.js');
      const b = (body ?? {}) as { input: Parameters<typeof runMultiHeadAttention>[0]; numHeads?: number };
      const layer = runMultiHeadAttention(b.input, b.numHeads ?? 4);
      json(res, 200, layer);
    },
  },
  {
    method: 'POST',
    pattern: '/api/neural/ensemble/vote',
    handler: async ({ res, body }) => {
      const { runEnsembleVote } = await import('../brain/neural/ensembleOrchestrator.js');
      const b = (body ?? {}) as {
        inputState: Parameters<typeof runEnsembleVote>[1];
        evaluation: Parameters<typeof runEnsembleVote>[2];
        candidateActions: Parameters<typeof runEnsembleVote>[3];
      };
      const decision = await runEnsembleVote(brand, b.inputState, b.evaluation, b.candidateActions);
      json(res, 200, decision);
    },
  },
  {
    method: 'GET',
    pattern: '/api/neural/ensemble/accuracy',
    handler: async ({ res }) => {
      const { getExpertAccuracy } = await import('../brain/neural/ensembleOrchestrator.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const accuracy = await getExpertAccuracy(brandId);
      json(res, 200, accuracy);
    },
  },
  {
    method: 'POST',
    pattern: '/api/neural/conv/analyze',
    handler: async ({ res, body }) => {
      const { runConvolutionalLayer, slotsToMatrix } = await import('../brain/neural/convolutionalLayer.js');
      const b = (body ?? {}) as {
        slots?: Parameters<typeof slotsToMatrix>[0];
        matrix?: Parameters<typeof runConvolutionalLayer>[0];
      };
      const matrix = b.matrix ?? slotsToMatrix(b.slots ?? []);
      const result = runConvolutionalLayer(matrix);
      json(res, 200, result);
    },
  },
  // ════════════════════════════════════════════════════════════════════════
  //  QUICK CAROUSEL — 1 prompt → carrusel completo listo-para-publicar
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/carousel/quick',
    handler: async ({ res, body }) => {
      const { createQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const b = (body ?? {}) as Parameters<typeof createQuickCarousel>[1];
      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }
      const pkg = await createQuickCarousel(brand, b);
      json(res, 200, pkg);
    },
  },
  {
    method: 'POST',
    pattern: '/api/carousel/variants',
    handler: async ({ res, body }) => {
      const { createCarouselVariants } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const b = (body ?? {}) as Parameters<typeof createCarouselVariants>[1];
      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }
      const variants = await createCarouselVariants(brand, b);
      json(res, 200, { variants });
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/list',
    handler: async ({ res }) => {
      const { listQuickCarousels } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const pkgs = await listQuickCarousels(brandId);
      json(res, 200, { carousels: pkgs, count: pkgs.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/capabilities',
    handler: async ({ res }) => {
      const { checkCapabilities } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      json(res, 200, checkCapabilities());
    },
  },
  {
    method: 'POST',
    pattern: '/api/carousel/render',
    handler: async ({ res, body }) => {
      const { getQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const { runCarouselPipeline } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const b = (body ?? {}) as { id: string; config?: Parameters<typeof runCarouselPipeline>[2] };
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const pkg = await getQuickCarousel(brandId, b.id);
      if (!pkg) {
        json(res, 404, { error: 'Package no encontrado. POST /api/carousel/quick primero' });
        return;
      }
      const result = await runCarouselPipeline(brand, pkg, b.config ?? {});
      json(res, 200, result);
    },
  },
  {
    method: 'POST',
    pattern: '/api/carousel/full',
    handler: async ({ res, body }) => {
      const { createQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const { runCarouselPipeline } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const b = (body ?? {}) as {
        prompt: string;
        pipeline?: Parameters<typeof runCarouselPipeline>[2];
        carousel?: Parameters<typeof createQuickCarousel>[1];
      };
      if (!b.prompt) {
        json(res, 400, { error: 'body.prompt requerido' });
        return;
      }
      const pkg = await createQuickCarousel(brand, { ...(b.carousel ?? {}), prompt: b.prompt });
      const pipelineResult = await runCarouselPipeline(brand, pkg, b.pipeline ?? {});
      json(res, 200, { package: pkg, pipeline: pipelineResult });
    },
  },
  {
    method: 'POST',
    pattern: '/api/carousel/preview',
    handler: async ({ res, body }) => {
      const { getQuickCarousel } = await import('../capabilities/quickCarousel/quickCarousel.js');
      const { generatePreviewHTML } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const b = (body ?? {}) as { id: string };
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const pkg = await getQuickCarousel(brandId, b.id);
      if (!pkg) {
        json(res, 404, { error: 'Package no encontrado' });
        return;
      }
      const previewPath = await generatePreviewHTML(brand, pkg);
      json(res, 200, { previewPath, url: `file://${previewPath}` });
    },
  },
  {
    method: 'POST',
    pattern: '/api/carousel/scheduled/process',
    handler: async ({ res }) => {
      const { processScheduled } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const result = await processScheduled();
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/scheduled',
    handler: async ({ res }) => {
      const { listScheduled } = await import('../capabilities/quickCarousel/carouselPipeline.js');
      const list = await listScheduled();
      json(res, 200, { scheduled: list, count: list.length });
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/markdown',
    handler: async ({ res, query }) => {
      const { getQuickCarousel, exportCarouselAsMarkdown } =
        await import('../capabilities/quickCarousel/quickCarousel.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const id = (query as Record<string, string>)?.id;
      if (!id) {
        json(res, 400, { error: 'query.id requerido' });
        return;
      }
      const pkg = await getQuickCarousel(brandId, id);
      if (!pkg) {
        json(res, 404, { error: 'No encontrado' });
        return;
      }
      json(res, 200, { markdown: exportCarouselAsMarkdown(pkg) });
    },
  },

  {
    method: 'POST',
    pattern: '/api/neural/rnn/sequence',
    handler: async ({ res, body }) => {
      const { processSequence, detectTrend } = await import('../brain/neural/recurrentNeuron.js');
      const b = (body ?? {}) as { sequence: Parameters<typeof processSequence>[0] };
      const result = processSequence(b.sequence);
      const trend = detectTrend(b.sequence);
      json(res, 200, { ...result, trend });
    },
  },

  // ─── Executive Command Center (Sala Ejecutiva backend) ──────────────────────
  {
    method: 'GET',
    pattern: '/api/executive/command-center',
    handler: async ({ res }) => {
      const { buildCommandCenterBundle } = await import('../capabilities/executive/executiveCommandCenter.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const bundle = await buildCommandCenterBundle(brandId);
      json(res, 200, bundle);
    },
  },
  {
    method: 'GET',
    pattern: '/api/executive/decisions/pending',
    handler: async ({ res }) => {
      const { listPending } = await import('../capabilities/executive/executiveDecisionQueue.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await listPending(brandId));
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/decisions/enqueue',
    handler: async ({ res, body }) => {
      const { enqueueDecision } = await import('../capabilities/executive/executiveDecisionQueue.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as Omit<Parameters<typeof enqueueDecision>[0], 'brandId'>;
      json(res, 200, await enqueueDecision({ brandId, ...b }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/decisions/resolve',
    handler: async ({ res, body }) => {
      const { resolveDecision } = await import('../capabilities/executive/executiveDecisionQueue.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as {
        decisionId: string;
        status: 'approved' | 'rejected' | 'auto-executed' | 'expired';
        outcomeNote?: string;
      };
      const result = await resolveDecision(brandId, b.decisionId, { status: b.status, outcomeNote: b.outcomeNote });
      if (!result) {
        json(res, 404, { error: 'decision not found' });
        return;
      }
      json(res, 200, result);
    },
  },
  {
    method: 'GET',
    pattern: '/api/executive/decisions/stats',
    handler: async ({ res }) => {
      const { getDecisionStats } = await import('../capabilities/executive/executiveDecisionQueue.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await getDecisionStats(brandId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/executive/digest/latest',
    handler: async ({ res, query }) => {
      const { getLatestDigest } = await import('../capabilities/executive/executiveDigest.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const period = ((query as Record<string, string>)?.period ?? 'daily') as 'daily' | 'weekly' | 'monthly';
      const digest = await getLatestDigest(brandId, period);
      if (!digest) {
        json(res, 404, { error: 'no digest yet' });
        return;
      }
      json(res, 200, digest);
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/digest/generate',
    handler: async ({ res, body }) => {
      const { generateDigest } = await import('../capabilities/executive/executiveDigest.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as Omit<Parameters<typeof generateDigest>[0], 'brandId'>;
      json(res, 200, await generateDigest({ brandId, ...b }));
    },
  },
  {
    method: 'GET',
    pattern: '/api/executive/okr/active',
    handler: async ({ res }) => {
      const { listActiveObjectives, getOKRSummary } = await import('../capabilities/executive/executiveOKR.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, { objectives: await listActiveObjectives(brandId), summary: await getOKRSummary(brandId) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/okr/create',
    handler: async ({ res, body }) => {
      const { createObjective } = await import('../capabilities/executive/executiveOKR.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as Omit<Parameters<typeof createObjective>[0], 'brandId'>;
      json(res, 200, await createObjective({ brandId, ...b }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/executive/okr/update-kr',
    handler: async ({ res, body }) => {
      const { updateKRProgress } = await import('../capabilities/executive/executiveOKR.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const b = (body ?? {}) as { objectiveId: string; krId: string; newValue: number };
      const result = await updateKRProgress(brandId, b.objectiveId, b.krId, b.newValue);
      if (!result) {
        json(res, 404, { error: 'objective or KR not found' });
        return;
      }
      json(res, 200, result);
    },
  },

  // ─── Instagram + TikTok Autopilot ───────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/autopilot/instagram/run',
    handler: async ({ res, body }) => {
      const { runIGAutopilot } = await import('../capabilities/executive/instagramAutopilot.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const obs = (body ?? {}) as Omit<Parameters<typeof runIGAutopilot>[0], 'brandId' | 'timestamp'>;
      json(res, 200, await runIGAutopilot({ brandId, timestamp: new Date().toISOString(), ...obs }));
    },
  },
  {
    method: 'GET',
    pattern: '/api/autopilot/instagram/latest',
    handler: async ({ res }) => {
      const { getLatestReport } = await import('../capabilities/executive/instagramAutopilot.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestReport(brandId);
      if (!report) {
        json(res, 404, { error: 'no report yet' });
        return;
      }
      json(res, 200, report);
    },
  },
  {
    method: 'POST',
    pattern: '/api/autopilot/tiktok/run',
    handler: async ({ res, body }) => {
      const { runTTAutopilot } = await import('../capabilities/executive/tiktokAutopilot.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const obs = (body ?? {}) as Omit<Parameters<typeof runTTAutopilot>[0], 'brandId' | 'timestamp'>;
      json(res, 200, await runTTAutopilot({ brandId, timestamp: new Date().toISOString(), ...obs }));
    },
  },
  {
    method: 'GET',
    pattern: '/api/autopilot/tiktok/latest',
    handler: async ({ res }) => {
      const { getLatestReport } = await import('../capabilities/executive/tiktokAutopilot.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const report = await getLatestReport(brandId);
      if (!report) {
        json(res, 404, { error: 'no report yet' });
        return;
      }
      json(res, 200, report);
    },
  },

  // ─── Real profile data: Instagram + TikTok ──────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/instagram/profile',
    handler: async ({ res }) => {
      const { fetchInstagramProfile } = await import('../integrations/platformProfiles.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await fetchInstagramProfile(brandId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/instagram/media',
    handler: async ({ res, query }) => {
      const { fetchInstagramMedia } = await import('../integrations/platformProfiles.js');
      const limit = Math.min(100, Math.max(1, Number((query as Record<string, string>)?.limit ?? 36)));
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await fetchInstagramMedia(limit, brandId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/tiktok/profile',
    handler: async ({ res }) => {
      const { fetchTikTokProfile } = await import('../integrations/platformProfiles.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await fetchTikTokProfile(brandId));
    },
  },
  {
    method: 'GET',
    pattern: '/api/tiktok/videos',
    handler: async ({ res, query }) => {
      const { fetchTikTokVideos } = await import('../integrations/platformProfiles.js');
      const limit = Math.min(50, Math.max(1, Number((query as Record<string, string>)?.limit ?? 20)));
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      json(res, 200, await fetchTikTokVideos(limit, brandId));
    },
  },

  // ─── Platform Health Check ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/platform/health',
    handler: async ({ res }) => {
      const { checkAllPlatforms } = await import('../integrations/platformHealthCheck.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
      const health = await checkAllPlatforms(brandId);
      json(res, 200, {
        timestamp: new Date().toISOString(),
        platforms: health,
        allHealthy: health.every((h) => h.status === 'ok'),
      });
    },
  },

  // ─── Settings: Platform Connections ─────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/connections',
    handler: async ({ res }) => {
      const { checkAllPlatforms } = await import('../integrations/platformHealthCheck.js');
      const { getAllOAuthTokens } = await import('../integrations/oauthStorage.js');
      const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');

      const health = await checkAllPlatforms(brandId);
      const tokens = getAllOAuthTokens();

      const connections: Record<string, Record<string, unknown>> = {
        instagram: { connected: !!tokens.instagram, status: tokens.instagram?.status ?? 'disconnected' },
        tiktok: { connected: !!tokens.tiktok, status: tokens.tiktok?.status ?? 'disconnected' },
      };

      for (const h of health) {
        if (h.platform === 'instagram' && h.status === 'ok' && connections.instagram) {
          connections.instagram = {
            connected: true,
            status: 'ok',
            username: '@user',
            followers: h.followerCount ?? 0,
            mediaCount: 0,
          };
        } else if (h.platform === 'tiktok' && h.status === 'ok' && connections.tiktok) {
          connections.tiktok = {
            connected: true,
            status: 'ok',
            username: '@user',
            followers: h.followerCount ?? 0,
            videoCount: 0,
          };
        }
      }

      json(res, 200, connections);
    },
  },

  {
    method: 'POST',
    pattern: '/api/settings/connect',
    handler: async ({ body, res }) => {
      const { service } = body as { service?: string };
      if (!service) return json(res, 400, { error: 'service required' });

      const oauthUrls: Record<string, string> = {
        instagram: `${process.env.OAUTH_BASE_URL || 'http://localhost:3000'}/auth/instagram`,
        tiktok: `${process.env.OAUTH_BASE_URL || 'http://localhost:3000'}/auth/tiktok`,
      };

      const authUrl = oauthUrls[service];
      if (!authUrl) return json(res, 400, { error: 'Unknown service' });

      json(res, 200, { authUrl });
    },
  },

  {
    method: 'POST',
    pattern: '/api/settings/disconnect',
    handler: async ({ body, res }) => {
      const { service } = body as { service?: string };
      if (!service) return json(res, 400, { error: 'service required' });

      const { removeOAuthToken } = await import('../integrations/oauthStorage.js');
      removeOAuthToken(service);
      json(res, 200, { disconnected: true, service });
    },
  },

  // ─── Real-Time: SSE Achievements Stream ─────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/stream/achievements',
    handler: async ({ res }) => {
      const { subscribeToAchievementUpdates } = await import('../server/ws-server.js');
      subscribeToAchievementUpdates(res);
    },
  },

  // ─── OAuth Flow: Instagram ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/auth/instagram',
    handler: async ({ res, query }) => {
      const code = (query as Record<string, string>)?.code;
      const state = (query as Record<string, string>)?.state;

      if (code) {
        // Callback from Instagram OAuth
        const { storeOAuthToken } = await import('../integrations/oauthStorage.js');
        await storeOAuthToken('instagram', code, state);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          `<html><body><script>window.close();</script><p>Conectado. Cierra esta ventana.</p></body></html>`,
        );
      } else {
        // Initiate OAuth (redirect to Instagram)
        const clientId = process.env.META_APP_ID || 'test-client-id';
        const redirectUri = `${process.env.OAUTH_BASE_URL || 'http://localhost:3000'}/auth/instagram`;
        const state = Math.random().toString(36).substring(7);

        const authUrl = `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_basic,pages_read_engagement,pages_manage_metadata&response_type=code&state=${state}`;
        res.writeHead(302, { Location: authUrl });
        res.end();
      }
    },
  },

  // ─── OAuth Flow: TikTok ─────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/auth/tiktok',
    handler: async ({ res, query }) => {
      const code = (query as Record<string, string>)?.code;
      const state = (query as Record<string, string>)?.state;

      if (code) {
        // Callback from TikTok OAuth
        const { storeOAuthToken } = await import('../integrations/oauthStorage.js');
        await storeOAuthToken('tiktok', code, state);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          `<html><body><script>window.close();</script><p>Conectado. Cierra esta ventana.</p></body></html>`,
        );
      } else {
        // Initiate OAuth (redirect to TikTok)
        const clientId = process.env.TIKTOK_APP_ID || 'test-client-id';
        const redirectUri = `${process.env.OAUTH_BASE_URL || 'http://localhost:3000'}/auth/tiktok`;
        const state = Math.random().toString(36).substring(7);

        const authUrl = `https://www.tiktok.com/oauth/authorize?client_key=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user.info.basic,video.list&response_type=code&state=${state}`;
        res.writeHead(302, { Location: authUrl });
        res.end();
      }
    },
  },
];
