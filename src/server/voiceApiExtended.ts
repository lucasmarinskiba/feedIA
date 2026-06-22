// @ts-nocheck
/**
 * voiceApiExtended.ts — Endpoints HTTP para Fases 7-10 del sistema de voz
 * ─────────────────────────────────────────────────────────────────────────
 * Crisis, A/B Testing, UGC, Collab, Analytics, Content Production, Canva,
 * ImageGen, Video, Publishing, Goals, Autopilot, Predictor, Learning,
 * Briefing, Community, Leads, Fans, DM Automation, Mentions.
 */

import type { RouteDefinition, RouteHandler } from './http.js';
import { json } from './http.js';

/* ── Phase 7: Crisis ─────────────────────────────────────────────────────── */

const crisisRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/crisis/status',
    handler: (async (ctx): Promise<void> => {
      const { getCrisisState } = await import('../voice/crisisVoice.js');
      json(ctx.res, 200, await getCrisisState());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/crisis/pause',
    handler: (async (ctx): Promise<void> => {
      const { pausePublishing } = await import('../voice/crisisVoice.js');
      json(ctx.res, 200, await pausePublishing());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/crisis/resume',
    handler: (async (ctx): Promise<void> => {
      const { resumePublishing } = await import('../voice/crisisVoice.js');
      json(ctx.res, 200, await resumePublishing());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/crisis/evaluate',
    handler: (async (ctx): Promise<void> => {
      const { postId, comments } = ctx.body as { postId?: string; comments?: string[] };
      const { evaluateRecentComments } = await import('../voice/crisisVoice.js');
      json(ctx.res, 200, await evaluateRecentComments(postId, comments));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/crisis/draft',
    handler: (async (ctx): Promise<void> => {
      const { tone } = ctx.body as { tone?: string };
      const { draftCrisisResponse } = await import('../voice/crisisVoice.js');
      json(ctx.res, 200, await draftCrisisResponse((tone as 'humble' | 'factual' | 'brief') ?? 'humble'));
    }) as RouteHandler,
  },
];

/* ── Phase 7: A/B Testing ────────────────────────────────────────────────── */

const abtestRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/abtest',
    handler: (async (ctx): Promise<void> => {
      const { listABTests } = await import('../voice/abTestingVoice.js');
      json(ctx.res, 200, await listABTests());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/abtest/start',
    handler: (async (ctx): Promise<void> => {
      const { variants, description } = ctx.body as { variants: string[]; description?: string };
      if (!variants || !Array.isArray(variants)) {
        json(ctx.res, 400, { error: 'variants requerido (array)' });
        return;
      }
      const { startABTest } = await import('../voice/abTestingVoice.js');
      json(ctx.res, 200, await startABTest(variants, description ?? 'API-initiated A/B test'));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/abtest/:id/status',
    handler: (async (ctx): Promise<void> => {
      const { id } = ctx.params as { id: string };
      const { getABTestStatus } = await import('../voice/abTestingVoice.js');
      json(ctx.res, 200, await getABTestStatus(id));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/abtest/:id/evaluate',
    handler: (async (ctx): Promise<void> => {
      const { id } = ctx.params as { id: string };
      const { evaluateABTest } = await import('../voice/abTestingVoice.js');
      json(ctx.res, 200, await evaluateABTest(id));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/abtest/:id/cancel',
    handler: (async (ctx): Promise<void> => {
      const { id } = ctx.params as { id: string };
      const { cancelABTest } = await import('../voice/abTestingVoice.js');
      json(ctx.res, 200, await cancelABTest(id));
    }) as RouteHandler,
  },
];

/* ── Phase 7: UGC ────────────────────────────────────────────────────────── */

const ugcRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/ugc/scout',
    handler: (async (ctx): Promise<void> => {
      const { scoutUGC } = await import('../voice/ugcVoice.js');
      json(ctx.res, 200, await scoutUGC());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/ugc/evaluate/:id',
    handler: (async (ctx): Promise<void> => {
      const { id } = ctx.params as { id: string };
      const { evaluateUGC } = await import('../voice/ugcVoice.js');
      json(ctx.res, 200, await evaluateUGC(id));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/ugc/request/:id',
    handler: (async (ctx): Promise<void> => {
      const { id } = ctx.params as { id: string };
      const { requestPermission } = await import('../voice/ugcVoice.js');
      json(ctx.res, 200, await requestPermission(id));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/ugc/pending',
    handler: (async (ctx): Promise<void> => {
      const { listPendingUGC } = await import('../voice/ugcVoice.js');
      json(ctx.res, 200, await listPendingUGC());
    }) as RouteHandler,
  },
];

/* ── Phase 7: Collab ─────────────────────────────────────────────────────── */

const collabRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/collab/prospects',
    handler: (async (ctx): Promise<void> => {
      const { listProspects } = await import('../voice/collabVoice.js');
      json(ctx.res, 200, await listProspects());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/collab/evaluate',
    handler: (async (ctx): Promise<void> => {
      const { handle } = ctx.body as { handle: string };
      if (!handle) {
        json(ctx.res, 400, { error: 'handle requerido' });
        return;
      }
      const { evaluateCreator } = await import('../voice/collabVoice.js');
      json(ctx.res, 200, await evaluateCreator(handle));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/collab/outreach',
    handler: (async (ctx): Promise<void> => {
      const { prospectId } = ctx.body as { prospectId?: string };
      const { sendOutreach } = await import('../voice/collabVoice.js');
      json(ctx.res, 200, await sendOutreach(prospectId ? [prospectId] : undefined));
    }) as RouteHandler,
  },
];

/* ── Phase 7-8: Analytics / Predict ──────────────────────────────────────── */

const analyticsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/analytics/weekly',
    handler: (async (ctx): Promise<void> => {
      const { getWeeklyReport } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await getWeeklyReport());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/growth',
    handler: (async (ctx): Promise<void> => {
      const { getGrowthStatus } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await getGrowthStatus());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/analytics/competitor',
    handler: (async (ctx): Promise<void> => {
      const { handle } = ctx.body as { handle?: string };
      const { analyzeCompetitor } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await analyzeCompetitor(handle ?? ''));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/trends',
    handler: (async (ctx): Promise<void> => {
      const { getTrends } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await getTrends());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/analytics/daily',
    handler: (async (ctx): Promise<void> => {
      const { getDailyMetrics } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await getDailyMetrics());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/predict/post',
    handler: (async (ctx): Promise<void> => {
      const { description } = ctx.body as { description?: string };
      const { predictPostPerformance } = await import('../voice/analyticsVoice.js');
      json(ctx.res, 200, await predictPostPerformance(description ?? ''));
    }) as RouteHandler,
  },
];

/* ── Phase 8: Content Production ─────────────────────────────────────────── */

const contentRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/content/carousel',
    handler: (async (ctx): Promise<void> => {
      const { topic, slides } = ctx.body as { topic: string; slides?: number };
      if (!topic) {
        json(ctx.res, 400, { error: 'topic requerido' });
        return;
      }
      const { createCarousel } = await import('../voice/contentVoice.js');
      json(ctx.res, 200, await createCarousel(topic, slides));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/content/reel',
    handler: (async (ctx): Promise<void> => {
      const { topic, duration } = ctx.body as { topic: string; duration?: number };
      if (!topic) {
        json(ctx.res, 400, { error: 'topic requerido' });
        return;
      }
      const { createReel } = await import('../voice/contentVoice.js');
      json(ctx.res, 200, await createReel(topic, duration));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/content/story',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic: string };
      if (!topic) {
        json(ctx.res, 400, { error: 'topic requerido' });
        return;
      }
      const { createStory } = await import('../voice/contentVoice.js');
      json(ctx.res, 200, await createStory(topic));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/content/caption',
    handler: (async (ctx): Promise<void> => {
      const { context, format } = ctx.body as { context: string; format?: string };
      if (!context) {
        json(ctx.res, 400, { error: 'context requerido' });
        return;
      }
      const { createCaption } = await import('../voice/contentVoice.js');
      json(ctx.res, 200, await createCaption(context, format));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/content/faceless',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic: string };
      if (!topic) {
        json(ctx.res, 400, { error: 'topic requerido' });
        return;
      }
      const { createFaceless } = await import('../voice/contentVoice.js');
      json(ctx.res, 200, await createFaceless(topic));
    }) as RouteHandler,
  },
];

/* ── Phase 8: Canva / Image / Video / Publish ────────────────────────────── */

const mediaRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/canva/design',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic?: string };
      const { designCarousel } = await import('../voice/canvaVoice.js');
      json(ctx.res, 200, await designCarousel(topic ?? ''));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/image/generate',
    handler: (async (ctx): Promise<void> => {
      const { prompt, model } = ctx.body as { prompt: string; model?: string };
      if (!prompt) {
        json(ctx.res, 400, { error: 'prompt requerido' });
        return;
      }
      const { generateImage } = await import('../voice/imageGenVoice.js');
      json(ctx.res, 200, await generateImage(prompt, model));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/video/faceless',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic?: string };
      const { createFacelessReel } = await import('../voice/videoVoice.js');
      json(ctx.res, 200, await createFacelessReel(topic ?? ''));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/publish/now',
    handler: (async (ctx): Promise<void> => {
      const { contentId, format } = ctx.body as { contentId: string; format?: 'post' | 'reel' | 'story' };
      if (!contentId) {
        json(ctx.res, 400, { error: 'contentId requerido' });
        return;
      }
      const { publishNow } = await import('../voice/publishVoice.js');
      json(ctx.res, 200, await publishNow(contentId, format ?? 'post'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/publish/schedule',
    handler: (async (ctx): Promise<void> => {
      const { contentId, scheduledAt } = ctx.body as { contentId: string; scheduledAt: string };
      if (!contentId || !scheduledAt) {
        json(ctx.res, 400, { error: 'contentId y scheduledAt requeridos' });
        return;
      }
      const { schedulePost } = await import('../voice/publishVoice.js');
      json(ctx.res, 200, await schedulePost(contentId, scheduledAt));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/publish/scheduled',
    handler: (async (ctx): Promise<void> => {
      const { listScheduledPosts } = await import('../voice/publishVoice.js');
      json(ctx.res, 200, await listScheduledPosts());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/publish/cancel',
    handler: (async (ctx): Promise<void> => {
      const { postId } = ctx.body as { postId: string };
      if (!postId) {
        json(ctx.res, 400, { error: 'postId requerido' });
        return;
      }
      const { cancelScheduledPost } = await import('../voice/publishVoice.js');
      json(ctx.res, 200, await cancelScheduledPost(postId));
    }) as RouteHandler,
  },
];

/* ── Phase 9: Goals / Autopilot / Learning / Briefing ────────────────────── */

const autonomyRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/goals',
    handler: (async (ctx): Promise<void> => {
      const { target, metric, timeframe } = ctx.body as { target: string; metric: string; timeframe: string };
      if (!target || !metric || !timeframe) {
        json(ctx.res, 400, { error: 'target, metric y timeframe requeridos' });
        return;
      }
      const { setGrowthGoal } = await import('../voice/goalsVoice.js');
      json(ctx.res, 200, await setGrowthGoal(target, metric, timeframe));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/goals',
    handler: (async (ctx): Promise<void> => {
      const { listActiveGoals } = await import('../voice/goalsVoice.js');
      json(ctx.res, 200, await listActiveGoals());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/autopilot/start',
    handler: (async (ctx): Promise<void> => {
      const { startAutopilot } = await import('../voice/autopilotVoice.js');
      json(ctx.res, 200, await startAutopilot());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/autopilot/stop',
    handler: (async (ctx): Promise<void> => {
      const { stopAutopilot } = await import('../voice/autopilotVoice.js');
      json(ctx.res, 200, await stopAutopilot());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/autopilot/report',
    handler: (async (ctx): Promise<void> => {
      const { period } = ctx.query as { period?: string };
      const { getAutopilotReport } = await import('../voice/autopilotVoice.js');
      json(ctx.res, 200, await getAutopilotReport(period ?? 'daily'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/learning/weekly',
    handler: (async (ctx): Promise<void> => {
      const { weeklyAnalysis } = await import('../voice/learningVoice.js');
      json(ctx.res, 200, await weeklyAnalysis());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/briefing/daily',
    handler: (async (ctx): Promise<void> => {
      const { getDailyBriefing } = await import('../voice/briefingVoice.js');
      json(ctx.res, 200, await getDailyBriefing());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/briefing/weekly',
    handler: (async (ctx): Promise<void> => {
      const { getWeeklyBriefing } = await import('../voice/briefingVoice.js');
      json(ctx.res, 200, await getWeeklyBriefing());
    }) as RouteHandler,
  },
];

/* ── Phase 10: Community / Leads / Fans / DM / Mentions ──────────────────── */

const socialRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/community/reply-dms',
    handler: (async (ctx): Promise<void> => {
      const { limit } = ctx.body as { limit?: number };
      const { replyPendingDMs } = await import('../voice/communityVoice.js');
      json(ctx.res, 200, await replyPendingDMs(limit ?? 10));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/community/moderate',
    handler: (async (ctx): Promise<void> => {
      const { postId } = ctx.body as { postId?: string };
      const { moderateComments } = await import('../voice/communityVoice.js');
      json(ctx.res, 200, await moderateComments(postId));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/community/poll',
    handler: (async (ctx): Promise<void> => {
      const { question, options } = ctx.body as { question?: string; options?: string[] };
      const { createPoll } = await import('../voice/communityVoice.js');
      json(ctx.res, 200, await createPoll(question ?? '¿Qué te parece?', options ?? ['👍', '👎']));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/leads',
    handler: (async (ctx): Promise<void> => {
      const { listLeads } = await import('../voice/leadsVoice.js');
      json(ctx.res, 200, await listLeads());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/leads/move',
    handler: (async (ctx): Promise<void> => {
      const { leadId, stage } = ctx.body as { leadId: string; stage: string };
      if (!leadId || !stage) {
        json(ctx.res, 400, { error: 'leadId y stage requeridos' });
        return;
      }
      const { moveLead } = await import('../voice/leadsVoice.js');
      json(ctx.res, 200, await moveLead(leadId, stage));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fans/top',
    handler: (async (ctx): Promise<void> => {
      const { limit } = ctx.query as { limit?: string };
      const { getTopFans } = await import('../voice/fansVoice.js');
      json(ctx.res, 200, await getTopFans(Number(limit ?? 10)));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fans/thank',
    handler: (async (ctx): Promise<void> => {
      const { sendThankYouToFans } = await import('../voice/fansVoice.js');
      json(ctx.res, 200, await sendThankYouToFans());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/dm/auto-reply',
    handler: (async (ctx): Promise<void> => {
      const { trigger, response } = ctx.body as { trigger?: string; response?: string };
      const { setupAutoReply } = await import('../voice/dmAutomationVoice.js');
      json(ctx.res, 200, await setupAutoReply(trigger ?? 'precio', response ?? 'Te envío la info por DM'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/dm/smart-comment',
    handler: (async (ctx): Promise<void> => {
      const { enableSmartFirstComment } = await import('../voice/dmAutomationVoice.js');
      json(ctx.res, 200, await enableSmartFirstComment());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/mentions',
    handler: (async (ctx): Promise<void> => {
      const { checkNewMentions } = await import('../voice/mentionsVoice.js');
      json(ctx.res, 200, await checkNewMentions());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/mentions/reply',
    handler: (async (ctx): Promise<void> => {
      const { replyPositiveMentions } = await import('../voice/mentionsVoice.js');
      json(ctx.res, 200, await replyPositiveMentions());
    }) as RouteHandler,
  },
];

/* ── Phase 11: Strategy ──────────────────────────────────────────────────── */

const strategyRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/strategy/positioning',
    handler: (async (_ctx): Promise<void> => {
      const { analyzePositioning } = await import('../voice/strategyVoice.js');
      json(_ctx.res, 200, await analyzePositioning());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/strategy/archetypes',
    handler: (async (_ctx): Promise<void> => {
      const { suggestArchetypes } = await import('../voice/strategyVoice.js');
      json(_ctx.res, 200, await suggestArchetypes());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/strategy/calendar',
    handler: (async (ctx): Promise<void> => {
      const { quarter } = ctx.body as { quarter?: string };
      const { planStrategicCalendar } = await import('../voice/strategyVoice.js');
      json(ctx.res, 200, await planStrategicCalendar(quarter));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/strategy/audit',
    handler: (async (ctx): Promise<void> => {
      const { handle } = ctx.body as { handle?: string };
      const { auditAccount } = await import('../voice/strategyVoice.js');
      json(ctx.res, 200, await auditAccount(handle));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/strategy/valueprop',
    handler: (async (_ctx): Promise<void> => {
      const { refineValueProp } = await import('../voice/strategyVoice.js');
      json(_ctx.res, 200, await refineValueProp());
    }) as RouteHandler,
  },
];

/* ── Phase 12: Monetization ──────────────────────────────────────────────── */

const monetizationRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/monetization/pricing',
    handler: (async (ctx): Promise<void> => {
      const { product } = ctx.body as { product?: string };
      const { suggestPricing } = await import('../voice/monetizationVoice.js');
      json(ctx.res, 200, await suggestPricing(product));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/monetization/funnel',
    handler: (async (_ctx): Promise<void> => {
      const { analyzeFunnel } = await import('../voice/monetizationVoice.js');
      json(_ctx.res, 200, await analyzeFunnel());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/monetization/sponsorship',
    handler: (async (ctx): Promise<void> => {
      const { brandName } = ctx.body as { brandName?: string };
      const { draftSponsorshipPitch } = await import('../voice/monetizationVoice.js');
      json(ctx.res, 200, await draftSponsorshipPitch(brandName));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/monetization/affiliate',
    handler: (async (_ctx): Promise<void> => {
      const { trackAffiliatePerformance } = await import('../voice/monetizationVoice.js');
      json(_ctx.res, 200, await trackAffiliatePerformance());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/monetization/products',
    handler: (async (_ctx): Promise<void> => {
      const { suggestDigitalProducts } = await import('../voice/monetizationVoice.js');
      json(_ctx.res, 200, await suggestDigitalProducts());
    }) as RouteHandler,
  },
];

/* ── Phase 13: Legal ─────────────────────────────────────────────────────── */

const legalRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/legal/terms',
    handler: (async (_ctx): Promise<void> => {
      const { generateTerms } = await import('../voice/legalVoice.js');
      json(_ctx.res, 200, await generateTerms());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/legal/privacy',
    handler: (async (_ctx): Promise<void> => {
      const { generatePrivacyPolicy } = await import('../voice/legalVoice.js');
      json(_ctx.res, 200, await generatePrivacyPolicy());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/legal/disclaimer',
    handler: (async (ctx): Promise<void> => {
      const { type } = ctx.body as { type?: string };
      const { generateDisclaimer } = await import('../voice/legalVoice.js');
      json(ctx.res, 200, await generateDisclaimer(type));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/legal/copyright',
    handler: (async (ctx): Promise<void> => {
      const { contentId } = ctx.body as { contentId?: string };
      const { checkCopyrightRisk } = await import('../voice/legalVoice.js');
      json(ctx.res, 200, await checkCopyrightRisk(contentId));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/legal/contract',
    handler: (async (ctx): Promise<void> => {
      const { creatorHandle } = ctx.body as { creatorHandle?: string };
      const { draftCreatorContract } = await import('../voice/legalVoice.js');
      json(ctx.res, 200, await draftCreatorContract(creatorHandle));
    }) as RouteHandler,
  },
];

/* ── Phase 14: Multi-Account ─────────────────────────────────────────────── */

const multiAccountRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/accounts',
    handler: (async (_ctx): Promise<void> => {
      const { listAccounts } = await import('../voice/multiAccountVoice.js');
      json(_ctx.res, 200, await listAccounts());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/accounts/switch',
    handler: (async (ctx): Promise<void> => {
      const { accountId } = ctx.body as { accountId?: string };
      const { switchAccount } = await import('../voice/multiAccountVoice.js');
      json(ctx.res, 200, await switchAccount(accountId));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/accounts/consolidate',
    handler: (async (_ctx): Promise<void> => {
      const { consolidateAnalytics } = await import('../voice/multiAccountVoice.js');
      json(_ctx.res, 200, await consolidateAnalytics());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/accounts/crosspost',
    handler: (async (ctx): Promise<void> => {
      const { contentId } = ctx.body as { contentId?: string };
      const { planCrossPost } = await import('../voice/multiAccountVoice.js');
      json(ctx.res, 200, await planCrossPost(contentId));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/accounts/permissions',
    handler: (async (ctx): Promise<void> => {
      const { accountId } = ctx.query as { accountId?: string };
      const { checkPermissions } = await import('../voice/multiAccountVoice.js');
      json(ctx.res, 200, await checkPermissions(accountId));
    }) as RouteHandler,
  },
];

/* ── Phase 15: SEO ───────────────────────────────────────────────────────── */

const seoRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/seo/hashtags',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic?: string };
      const { optimizeHashtags } = await import('../voice/seoVoice.js');
      json(ctx.res, 200, await optimizeHashtags(topic));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/seo/keywords',
    handler: (async (ctx): Promise<void> => {
      const { seed } = ctx.body as { seed?: string };
      const { researchKeywords } = await import('../voice/seoVoice.js');
      json(ctx.res, 200, await researchKeywords(seed));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/seo/alttext',
    handler: (async (ctx): Promise<void> => {
      const { imageDesc } = ctx.body as { imageDesc?: string };
      const { suggestAltText } = await import('../voice/seoVoice.js');
      json(ctx.res, 200, await suggestAltText(imageDesc));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/seo/geotags',
    handler: (async (ctx): Promise<void> => {
      const { location } = ctx.body as { location?: string };
      const { suggestGeotags } = await import('../voice/seoVoice.js');
      json(ctx.res, 200, await suggestGeotags(location));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/seo/rankings',
    handler: (async (ctx): Promise<void> => {
      const { term } = ctx.query as { term?: string };
      const { checkSearchRankings } = await import('../voice/seoVoice.js');
      json(ctx.res, 200, await checkSearchRankings(term));
    }) as RouteHandler,
  },
];

/* ── Phase 16: BI ────────────────────────────────────────────────────────── */

const biRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/bi/dashboard',
    handler: (async (ctx): Promise<void> => {
      const { metrics } = ctx.body as { metrics?: string[] };
      const { createCustomDashboard } = await import('../voice/biVoice.js');
      json(ctx.res, 200, await createCustomDashboard(metrics));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/bi/export',
    handler: (async (ctx): Promise<void> => {
      const { format, days } = ctx.body as { format?: string; days?: number };
      const { exportData } = await import('../voice/biVoice.js');
      json(ctx.res, 200, await exportData(format, days));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/bi/correlations',
    handler: (async (_ctx): Promise<void> => {
      const { analyzeCorrelations } = await import('../voice/biVoice.js');
      json(_ctx.res, 200, await analyzeCorrelations());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/bi/cohort',
    handler: (async (ctx): Promise<void> => {
      const { name } = ctx.body as { name?: string };
      const { trackCohort } = await import('../voice/biVoice.js');
      json(ctx.res, 200, await trackCohort(name));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/bi/benchmark',
    handler: (async (_ctx): Promise<void> => {
      const { benchmarkAgainstIndustry } = await import('../voice/biVoice.js');
      json(_ctx.res, 200, await benchmarkAgainstIndustry());
    }) as RouteHandler,
  },
];

/* ── Phase 17: Innovation ────────────────────────────────────────────────── */

const innovationRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/innovation/updates',
    handler: (async (_ctx): Promise<void> => {
      const { checkPlatformUpdates } = await import('../voice/innovationVoice.js');
      json(_ctx.res, 200, await checkPlatformUpdates());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/innovation/beta',
    handler: (async (_ctx): Promise<void> => {
      const { suggestBetaFeatures } = await import('../voice/innovationVoice.js');
      json(_ctx.res, 200, await suggestBetaFeatures());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/innovation/playbook',
    handler: (async (ctx): Promise<void> => {
      const { feature } = ctx.body as { feature?: string };
      const { getEarlyAdopterPlaybook } = await import('../voice/innovationVoice.js');
      json(ctx.res, 200, await getEarlyAdopterPlaybook(feature));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/innovation/forecast',
    handler: (async (ctx): Promise<void> => {
      const { horizon } = ctx.body as { horizon?: string };
      const { forecastTrends } = await import('../voice/innovationVoice.js');
      json(ctx.res, 200, await forecastTrends(horizon));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/innovation/competitor',
    handler: (async (ctx): Promise<void> => {
      const { handle } = ctx.body as { handle?: string };
      const { analyzeCompetitorInnovation } = await import('../voice/innovationVoice.js');
      json(ctx.res, 200, await analyzeCompetitorInnovation(handle));
    }) as RouteHandler,
  },
];

/* ── Phase 18: Reporting ─────────────────────────────────────────────────── */

const reportingRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/reporting/pdf',
    handler: (async (ctx): Promise<void> => {
      const { period } = ctx.body as { period?: string };
      const { generatePdfReport } = await import('../voice/reportingVoice.js');
      json(ctx.res, 200, await generatePdfReport(period));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/reporting/schedule',
    handler: (async (ctx): Promise<void> => {
      const { frequency } = ctx.body as { frequency?: string };
      const { scheduleReport } = await import('../voice/reportingVoice.js');
      json(ctx.res, 200, await scheduleReport(frequency));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/reporting/whitelabel',
    handler: (async (ctx): Promise<void> => {
      const { clientName } = ctx.body as { clientName?: string };
      const { exportWhiteLabel } = await import('../voice/reportingVoice.js');
      json(ctx.res, 200, await exportWhiteLabel(clientName));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/reporting/compare',
    handler: (async (ctx): Promise<void> => {
      const { periodA, periodB } = ctx.body as { periodA?: string; periodB?: string };
      const { comparePeriods } = await import('../voice/reportingVoice.js');
      json(ctx.res, 200, await comparePeriods(periodA, periodB));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/reporting/executive',
    handler: (async (_ctx): Promise<void> => {
      const { generateExecutiveSummary } = await import('../voice/reportingVoice.js');
      json(_ctx.res, 200, await generateExecutiveSummary());
    }) as RouteHandler,
  },
];

/* ── Phase 19: Onboarding ────────────────────────────────────────────────── */

const onboardingRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/onboarding/tutorial',
    handler: (async (ctx): Promise<void> => {
      const { step } = ctx.body as { step?: number };
      const { startVoiceTutorial } = await import('../voice/onboardingVoice.js');
      json(ctx.res, 200, await startVoiceTutorial(step));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/onboarding/tip',
    handler: (async (_ctx): Promise<void> => {
      const { getDailyTip } = await import('../voice/onboardingVoice.js');
      json(_ctx.res, 200, await getDailyTip());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/onboarding/quiz',
    handler: (async (_ctx): Promise<void> => {
      const { startCertificationQuiz } = await import('../voice/onboardingVoice.js');
      json(_ctx.res, 200, await startCertificationQuiz());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/onboarding/progress',
    handler: (async (_ctx): Promise<void> => {
      const { getOnboardingProgress } = await import('../voice/onboardingVoice.js');
      json(_ctx.res, 200, await getOnboardingProgress());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/onboarding/discover',
    handler: (async (ctx): Promise<void> => {
      const { featureName } = ctx.body as { featureName?: string };
      const { discoverFeature } = await import('../voice/onboardingVoice.js');
      json(ctx.res, 200, await discoverFeature(featureName));
    }) as RouteHandler,
  },
];

/* ── Phase 20: Integrations ──────────────────────────────────────────────── */

const integrationsRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/integrations/webhooks',
    handler: (async (_ctx): Promise<void> => {
      const { checkWebhookStatus } = await import('../voice/integrationsVoice.js');
      json(_ctx.res, 200, await checkWebhookStatus());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/integrations/trigger',
    handler: (async (ctx): Promise<void> => {
      const { platform, payload } = ctx.body as { platform?: string; payload?: Record<string, unknown> };
      const { triggerAutomation } = await import('../voice/integrationsVoice.js');
      json(ctx.res, 200, await triggerAutomation(platform, payload));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/integrations/apis',
    handler: (async (ctx): Promise<void> => {
      const { query } = ctx.body as { query?: string };
      const { searchApiDirectory } = await import('../voice/integrationsVoice.js');
      json(ctx.res, 200, await searchApiDirectory(query));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/integrations/sync',
    handler: (async (_ctx): Promise<void> => {
      const { checkSyncStatus } = await import('../voice/integrationsVoice.js');
      json(_ctx.res, 200, await checkSyncStatus());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/integrations/health',
    handler: (async (_ctx): Promise<void> => {
      const { getIntegrationHealth } = await import('../voice/integrationsVoice.js');
      json(_ctx.res, 200, await getIntegrationHealth());
    }) as RouteHandler,
  },
];

/* ── Competitive Intelligence ────────────────────────────────────────────── */

const competitiveRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/competitor/full-analysis',
    handler: (async (_ctx): Promise<void> => {
      const { runFullCompetitiveAnalysis } = await import('../voice/competitiveIntelligenceVoice.js');
      json(_ctx.res, 200, await runFullCompetitiveAnalysis());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/competitor/quick-check',
    handler: (async (ctx): Promise<void> => {
      const { handle } = ctx.body as { handle: string };
      if (!handle) {
        json(ctx.res, 400, { error: 'handle requerido' });
        return;
      }
      const { quickCompetitorCheck } = await import('../voice/competitiveIntelligenceVoice.js');
      json(ctx.res, 200, await quickCompetitorCheck(handle));
    }) as RouteHandler,
  },
];

/* ── Phase 21: Conversion ────────────────────────────────────────────────── */

const conversionRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/conversion/funnel',
    handler: (async (_ctx): Promise<void> => {
      const { analyzeConversionFunnel } = await import('../voice/conversionVoice.js');
      json(_ctx.res, 200, await analyzeConversionFunnel());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/conversion/funnel-fix',
    handler: (async (ctx): Promise<void> => {
      const { bottleneck } = ctx.body as { bottleneck?: string };
      const { suggestFunnelFix } = await import('../voice/conversionVoice.js');
      json(ctx.res, 200, await suggestFunnelFix(bottleneck ?? 'awareness'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/conversion/scarcity',
    handler: (async (ctx): Promise<void> => {
      const { context } = ctx.body as { context?: string };
      const { generateScarcityCampaign } = await import('../voice/conversionVoice.js');
      json(ctx.res, 200, await generateScarcityCampaign(context));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/conversion/social-proof',
    handler: (async (_ctx): Promise<void> => {
      const { generateSocialProof } = await import('../voice/conversionVoice.js');
      json(_ctx.res, 200, await generateSocialProof());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/conversion/offer',
    handler: (async (ctx): Promise<void> => {
      const { type, context } = ctx.body as { type?: string; context?: string };
      const { generateOffer } = await import('../voice/conversionVoice.js');
      json(ctx.res, 200, await generateOffer(type, context));
    }) as RouteHandler,
  },
];

/* ── Phase 22: Profile ───────────────────────────────────────────────────── */

const profileRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/profile/audit',
    handler: (async (_ctx): Promise<void> => {
      const { auditProfile } = await import('../voice/profileVoice.js');
      json(_ctx.res, 200, await auditProfile());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/profile/highlights',
    handler: (async (_ctx): Promise<void> => {
      const { generateHighlightStrategy } = await import('../voice/profileVoice.js');
      json(_ctx.res, 200, await generateHighlightStrategy());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/profile/bio',
    handler: (async (ctx): Promise<void> => {
      const { goal } = ctx.body as { goal?: string };
      const { optimizeBio } = await import('../voice/profileVoice.js');
      json(ctx.res, 200, await optimizeBio(goal as 'followers' | 'leads' | 'sales' | 'authority' | undefined));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/profile/grid',
    handler: (async (ctx): Promise<void> => {
      const { postCount } = ctx.body as { postCount?: number };
      const { planGrid } = await import('../voice/profileVoice.js');
      json(ctx.res, 200, await planGrid(postCount));
    }) as RouteHandler,
  },
];

/* ── Phase 23: Ritual ────────────────────────────────────────────────────── */

const ritualRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/ritual/create',
    handler: (async (_ctx): Promise<void> => {
      const { createRituals } = await import('../voice/ritualVoice.js');
      json(_ctx.res, 200, await createRituals());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/ritual/insider',
    handler: (async (_ctx): Promise<void> => {
      const { createInsiderContent } = await import('../voice/ritualVoice.js');
      json(_ctx.res, 200, await createInsiderContent());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/ritual/naming',
    handler: (async (_ctx): Promise<void> => {
      const { suggestCommunityNames } = await import('../voice/ritualVoice.js');
      json(_ctx.res, 200, await suggestCommunityNames());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/ritual/manifesto',
    handler: (async (ctx): Promise<void> => {
      const { communityName } = ctx.body as { communityName?: string };
      const { createCommunityManifesto } = await import('../voice/ritualVoice.js');
      json(ctx.res, 200, await createCommunityManifesto(communityName ?? 'Comunidad'));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/ritual/loops',
    handler: (async (_ctx): Promise<void> => {
      const { createEngagementLoops } = await import('../voice/ritualVoice.js');
      json(_ctx.res, 200, await createEngagementLoops());
    }) as RouteHandler,
  },
];

/* ── Phase 24: Audience ──────────────────────────────────────────────────── */

const audienceRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/audience/segment',
    handler: (async (_ctx): Promise<void> => {
      const { segmentAudience } = await import('../voice/audienceVoice.js');
      json(_ctx.res, 200, await segmentAudience());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/audience/journey',
    handler: (async (ctx): Promise<void> => {
      const { personaName } = ctx.body as { personaName?: string };
      const { analyzePersonaJourney } = await import('../voice/audienceVoice.js');
      json(ctx.res, 200, await analyzePersonaJourney(personaName ?? 'La Curiosa'));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/audience/match',
    handler: (async (_ctx): Promise<void> => {
      const { matchContentToPersonas } = await import('../voice/audienceVoice.js');
      json(_ctx.res, 200, await matchContentToPersonas());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/audience/personalize',
    handler: (async (ctx): Promise<void> => {
      const { topic, segments } = ctx.body as { topic?: string; segments?: string[] };
      const { generatePersonalizedVariants } = await import('../voice/audienceVoice.js');
      json(ctx.res, 200, await generatePersonalizedVariants(topic ?? '', segments ?? []));
    }) as RouteHandler,
  },
];

/* ── Phase 25: FOMO (Expert Level) ───────────────────────────────────────── */

const fomoRoutes: RouteDefinition[] = [
  {
    method: 'POST',
    pattern: '/api/voice/fomo/series',
    handler: (async (ctx): Promise<void> => {
      const { topic, episodes } = ctx.body as { topic?: string; episodes?: number };
      const { createEpisodicSeries } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await createEpisodicSeries(topic, episodes));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/countdown',
    handler: (async (ctx): Promise<void> => {
      const { eventName, launchDate } = ctx.body as { eventName?: string; launchDate?: string };
      const { generateCountdown } = await import('../voice/fomoVoice.js');
      json(
        ctx.res,
        200,
        await generateCountdown(
          eventName ?? 'Lanzamiento',
          launchDate ?? new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        ),
      );
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/teaser',
    handler: (async (ctx): Promise<void> => {
      const { eventName } = ctx.body as { eventName?: string };
      const { generateTeaserDrop } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await generateTeaserDrop(eventName ?? 'Lanzamiento'));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/hooks',
    handler: (async (_ctx): Promise<void> => {
      const { generateMustFollowHooks } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await generateMustFollowHooks());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/trending',
    handler: (async (_ctx): Promise<void> => {
      const { detectTrending } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await detectTrending());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/anticipation',
    handler: (async (ctx): Promise<void> => {
      const { eventName, days } = ctx.body as { eventName?: string; days?: number };
      const { designAnticipationArc } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await designAnticipationArc(eventName ?? 'Lanzamiento', days));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/drop',
    handler: (async (ctx): Promise<void> => {
      const { type, context } = ctx.body as { type?: string; context?: string };
      const { designDrop } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await designDrop(type, context));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/drop-series',
    handler: (async (ctx): Promise<void> => {
      const { seriesName } = ctx.body as { seriesName?: string };
      const { designDropSeries } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await designDropSeries(seriesName ?? 'Colección'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/disappearing',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic?: string };
      const { createDisappearingContent } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await createDisappearingContent(topic));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/counters',
    handler: (async (_ctx): Promise<void> => {
      const { generateSocialCounters } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await generateSocialCounters());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/gamified',
    handler: (async (_ctx): Promise<void> => {
      const { designGamifiedFomo } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await designGamifiedFomo());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/insider',
    handler: (async (_ctx): Promise<void> => {
      const { designInsiderSystem } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await designInsiderSystem());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/visual',
    handler: (async (_ctx): Promise<void> => {
      const { generateVisualFomo } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await generateVisualFomo());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/swipe-reveal',
    handler: (async (ctx): Promise<void> => {
      const { topic } = ctx.body as { topic?: string };
      const { designSwipeToReveal } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await designSwipeToReveal(topic ?? ''));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/fomo/campaign',
    handler: (async (ctx): Promise<void> => {
      const { theme, durationDays } = ctx.body as { theme?: string; durationDays?: number };
      const { designFomoCampaign } = await import('../voice/fomoVoice.js');
      json(ctx.res, 200, await designFomoCampaign(theme, durationDays));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/fomo/playbook',
    handler: (async (_ctx): Promise<void> => {
      const { getFomoPlaybook } = await import('../voice/fomoVoice.js');
      json(_ctx.res, 200, await getFomoPlaybook());
    }) as RouteHandler,
  },
];

/* ── Phase 26: BRAIN (Cerebro FeedIA) ────────────────────────────────────── */

const brainRoutes: RouteDefinition[] = [
  {
    method: 'GET',
    pattern: '/api/voice/brain/stats',
    handler: (async (_ctx): Promise<void> => {
      const { getBrainStats } = await import('../brain/core/cortex.js');
      json(_ctx.res, 200, getBrainStats());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/recall',
    handler: (async (ctx): Promise<void> => {
      const { query } = ctx.body as { query?: string };
      const { recall } = await import('../brain/core/cortex.js');
      json(ctx.res, 200, await recall(query ?? ''));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/ingest',
    handler: (async (ctx): Promise<void> => {
      const { content, source, importance } = ctx.body as { content?: string; source?: string; importance?: number };
      const { ingest } = await import('../brain/core/cortex.js');
      await ingest({
        type: (source as 'message' | 'post' | 'trend' | 'insight' | 'feedback' | 'decision' | 'system') ?? 'system',
        content: content ?? '',
        importance,
      });
      json(ctx.res, 200, { ok: true });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/viral',
    handler: (async (ctx): Promise<void> => {
      const { content, niche, format } = ctx.body as { content?: string; niche?: string; format?: string };
      const { predictViralPotential } = await import('../brain/reasoning/viralScoring.js');
      json(ctx.res, 200, await predictViralPotential(content ?? '', niche ?? 'general', format));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/decision',
    handler: (async (ctx): Promise<void> => {
      const { type, options, niche } = ctx.body as { type?: string; options?: string[]; niche?: string };
      const { makeDecision } = await import('../brain/actuators/decisionActuator.js');
      json(
        ctx.res,
        200,
        await makeDecision({
          type: (type as 'post' | 'reply' | 'campaign' | 'strategy' | 'escalation') ?? 'strategy',
          options: options ?? [],
          context: {},
          niche: niche ?? 'general',
          brandName: '',
        }),
      );
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/content',
    handler: (async (ctx): Promise<void> => {
      const { topic, niche, brandName, format, goal } = ctx.body as {
        topic?: string;
        niche?: string;
        brandName?: string;
        format?: string;
        goal?: string;
      };
      const { generateContent } = await import('../brain/actuators/contentActuator.js');
      json(
        ctx.res,
        200,
        await generateContent({
          topic: topic ?? '',
          niche: niche ?? 'general',
          brandName: brandName ?? '',
          format: (format as 'carousel' | 'reel' | 'story' | 'post' | 'caption') ?? 'post',
          goal: (goal as 'engagement' | 'conversion' | 'awareness' | 'community') ?? 'engagement',
        }),
      );
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/trends',
    handler: (async (ctx): Promise<void> => {
      const niche = (ctx.query?.niche as string) ?? 'general';
      const { getTrendingTopics } = await import('../brain/sensors/trendSensor.js');
      json(ctx.res, 200, await getTrendingTopics(niche, 10));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/personality',
    handler: (async (ctx): Promise<void> => {
      const target = (ctx.query?.target as string) ?? '';
      const { getPersonalityContext } = await import('../brain/reasoning/personalityEngine.js');
      json(ctx.res, 200, { context: getPersonalityContext(target) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/memory/semantic',
    handler: (async (ctx): Promise<void> => {
      const { getStats } = await import('../brain/memory/semanticMemory.js');
      json(ctx.res, 200, getStats());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/memory/graph',
    handler: (async (_ctx): Promise<void> => {
      const { getStats } = await import('../brain/memory/knowledgeGraph.js');
      json(_ctx.res, 200, getStats());
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/community/greeting',
    handler: (async (ctx): Promise<void> => {
      const handle = (ctx.query?.handle as string) ?? '';
      const { getGreeting } = await import('../brain/community/communityManager.js');
      json(ctx.res, 200, { greeting: getGreeting(handle) });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/community/track',
    handler: (async (ctx): Promise<void> => {
      const { handle, message, direction, platform } = ctx.body as {
        handle?: string;
        message?: string;
        direction?: string;
        platform?: string;
      };
      const { trackInteraction } = await import('../brain/community/communityManager.js');
      const result = await trackInteraction(
        handle ?? '',
        message ?? '',
        (direction as 'inbound' | 'outbound') ?? 'inbound',
        platform ?? 'instagram',
      );
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/community/audit',
    handler: (async (_ctx): Promise<void> => {
      const { auditCommunity, getStats } = await import('../brain/community/communityManager.js');
      auditCommunity();
      json(_ctx.res, 200, getStats());
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/human-reply',
    handler: (async (ctx): Promise<void> => {
      const { handle, message, type } = ctx.body as { handle?: string; message?: string; type?: string };
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { craftHumanResponse } = await import('../brain/community/humanResponse.js');
      const result = await craftHumanResponse({
        handle: handle ?? '',
        message: message ?? '',
        platform: 'instagram',
        type: (type as 'comment' | 'dm' | 'story_reply') ?? 'comment',
        brandNiche: brand.niche,
        brandTone: brand.voice?.tone ?? ['amigable'],
      });
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/stalker/intel',
    handler: (async (ctx): Promise<void> => {
      const handle = (ctx.query?.handle as string) ?? '';
      const { getIntelBrief } = await import('../brain/community/stalkerTracker.js');
      json(ctx.res, 200, getIntelBrief(handle) ?? { notFound: true });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/profile/audit',
    handler: (async (ctx): Promise<void> => {
      const { bio, highlights } = ctx.body as { bio?: string; highlights?: string[] };
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { auditProfile } = await import('../brain/aesthetic/profileOptimizer.js');
      const result = await auditProfile(brand.name, bio ?? '', highlights ?? [], [], brand.niche);
      json(ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/aesthetic/report',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { analyzeCohesion } = await import('../brain/aesthetic/aestheticEngine.js');
      const result = await analyzeCohesion(brand.name, [], []);
      json(_ctx.res, 200, result);
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/partners',
    handler: (async (_ctx): Promise<void> => {
      const { getTopCandidates } = await import('../brain/growth/partnershipEngine.js');
      json(_ctx.res, 200, getTopCandidates(10, 0.4));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/niche',
    handler: (async (ctx): Promise<void> => {
      const niche = (ctx.query?.name as string) ?? '';
      const { getNiche, getOpportunities } = await import('../brain/growth/nicheMastery.js');
      const profile = getNiche(niche);
      const opportunities = getOpportunities(niche);
      json(ctx.res, 200, { profile, opportunities });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/trend-sync',
    handler: (async (ctx): Promise<void> => {
      const niche = (ctx.query?.niche as string) ?? 'general';
      const { getTrendsForNiche, getTrendContentIdeas } = await import('../brain/growth/trendSync.js');
      json(ctx.res, 200, { trends: getTrendsForNiche(niche, 0.3), ideas: getTrendContentIdeas(niche) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/orchestrator',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { think } = await import('../brain/core/orchestrator.js');
      json(
        _ctx.res,
        200,
        await think({
          name: brand.name,
          niche: brand.niche,
          handle: brand.name,
          tone: brand.voice?.tone ?? ['amigable'],
        }),
      );
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/competitor',
    handler: (async (ctx): Promise<void> => {
      const handle = (ctx.query?.handle as string) ?? '';
      const { getCompetitorIntel, getMarketGaps } = await import('../brain/growth/competitorBrain.js');
      if (handle) json(ctx.res, 200, getCompetitorIntel(handle) ?? { notFound: true });
      else json(ctx.res, 200, getMarketGaps('general'));
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/revenue/predict',
    handler: (async (ctx): Promise<void> => {
      const { reach, engagement, format, goal } = ctx.body as {
        reach?: number;
        engagement?: number;
        format?: string;
        goal?: string;
      };
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { predictContentRevenue } = await import('../brain/growth/revenueEngine.js');
      json(
        ctx.res,
        200,
        predictContentRevenue(
          {
            format: format ?? 'reel',
            predictedReach: reach ?? 5000,
            predictedEngagement: engagement ?? 500,
            goal: (goal as 'awareness' | 'engagement' | 'conversion') ?? 'conversion',
          },
          brand.niche,
        ),
      );
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/recycler',
    handler: (async (ctx): Promise<void> => {
      const niche = (ctx.query?.niche as string) ?? 'general';
      const { getRecycleCandidates } = await import('../brain/memory/contentRecycler.js');
      json(ctx.res, 200, getRecycleCandidates(niche, 10));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/crisis',
    handler: (async (_ctx): Promise<void> => {
      const { getActiveThreats, getStats } = await import('../brain/reasoning/crisisPredictor.js');
      json(_ctx.res, 200, { threats: getActiveThreats(), stats: getStats() });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/crossbrand',
    handler: (async (_ctx): Promise<void> => {
      const { getUniversalPatterns, getStats } = await import('../brain/growth/crossBrandLearning.js');
      json(_ctx.res, 200, { patterns: getUniversalPatterns(undefined, 10), stats: getStats() });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/lifecycle',
    handler: (async (ctx): Promise<void> => {
      const handle = (ctx.query?.handle as string) ?? '';
      const { getRecord, getFunnelStats, getAtRiskUsers } = await import('../brain/community/audienceLifecycle.js');
      if (handle) json(ctx.res, 200, getRecord(handle) ?? { notFound: true });
      else json(ctx.res, 200, { funnel: getFunnelStats(), atRisk: getAtRiskUsers(10) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/listening',
    handler: (async (ctx): Promise<void> => {
      const niche = (ctx.query?.niche as string) ?? 'general';
      const { getContentOpportunities, getPainPoints } = await import('../brain/sensors/socialListening.js');
      json(ctx.res, 200, { opportunities: getContentOpportunities(niche), painPoints: getPainPoints(niche) });
    }) as RouteHandler,
  },
  {
    method: 'POST',
    pattern: '/api/voice/brain/sequence',
    handler: (async (ctx): Promise<void> => {
      const { title, episodes, niche, goal } = ctx.body as {
        title?: string;
        episodes?: number;
        niche?: string;
        goal?: string;
      };
      const { createSequence } = await import('../brain/actuators/sequencingEngine.js');
      const seq = createSequence(
        title ?? 'Untitled',
        niche ?? 'general',
        niche ?? 'general',
        episodes ?? 5,
        (goal as 'awareness' | 'engagement' | 'conversion' | 'community') ?? 'engagement',
        'general',
      );
      json(ctx.res, 200, seq);
    }) as RouteHandler,
  },
  // ── Nuevos módulos Sprint 5-7 ─────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/voice/brain/vision',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { getVisualRecommendations } = await import('../brain/sensors/visionBrain.js');
      json(_ctx.res, 200, getVisualRecommendations(brand.niche));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/video',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { getVideoFormula } = await import('../brain/sensors/videoBrain.js');
      json(_ctx.res, 200, getVideoFormula(brand.niche));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/dream',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { dream } = await import('../brain/reasoning/dreamEngine.js');
      json(_ctx.res, 200, await dream(brand.niche));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/emotional',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { getEmotionalFormula } = await import('../brain/reasoning/emotionalResonance.js');
      json(_ctx.res, 200, getEmotionalFormula(brand.niche));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/forecast',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { forecast } = await import('../brain/reasoning/contentForecaster.js');
      json(_ctx.res, 200, await forecast(brand.niche, brand.voice?.tone ?? []));
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/evolution',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { analyzeEvolution, getEvolutionReport } = await import('../brain/growth/brandEvolution.js');
      const suggestions = analyzeEvolution(brand.niche);
      const report = getEvolutionReport(brand.niche);
      json(_ctx.res, 200, { report, suggestions });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/loop',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { getOptimalLoop, getPeakHours } = await import('../brain/growth/engagementLoop.js');
      json(_ctx.res, 200, { loop: getOptimalLoop(brand.niche, 'reel'), peaks: getPeakHours(brand.niche) });
    }) as RouteHandler,
  },
  {
    method: 'GET',
    pattern: '/api/voice/brain/hashtags',
    handler: (async (_ctx): Promise<void> => {
      const { loadBrandProfile } = await import('../config/index.js');
      const brand = loadBrandProfile();
      const { getHashtagStrategy, findEmergingHashtags } = await import('../brain/growth/hashtagEcosystem.js');
      json(_ctx.res, 200, { strategy: getHashtagStrategy(brand.niche), emerging: findEmergingHashtags(brand.niche) });
    }) as RouteHandler,
  },
];

/* ── Export ──────────────────────────────────────────────────────────────── */

export const voiceExtendedRoutes: RouteDefinition[] = [
  ...crisisRoutes,
  ...abtestRoutes,
  ...ugcRoutes,
  ...collabRoutes,
  ...analyticsRoutes,
  ...contentRoutes,
  ...mediaRoutes,
  ...autonomyRoutes,
  ...socialRoutes,
  ...strategyRoutes,
  ...monetizationRoutes,
  ...legalRoutes,
  ...multiAccountRoutes,
  ...seoRoutes,
  ...biRoutes,
  ...innovationRoutes,
  ...reportingRoutes,
  ...onboardingRoutes,
  ...integrationsRoutes,
  ...competitiveRoutes,
  ...conversionRoutes,
  ...profileRoutes,
  ...ritualRoutes,
  ...audienceRoutes,
  ...fomoRoutes,
  ...brainRoutes,
];
