/**
 * FeedIA Brain → Tools Integration Hub
 * Injects knowledge, analysis, strategies, planning into every tool via backend
 * TikTok, Instagram, Sala tools access unified intelligence
 */

import { AutonomousFeedIABrain } from '../autonomous/AUTONOMOUS_FEEDIA_BRAIN';

interface BrainIntelligence {
  accountPersonality: any;
  contentStrategy: string[];
  growthOpportunities: string[];
  viralTriggers: string[];
  postingSchedule: string[];
  contentCalendar: any;
  audienceSegments: string[];
  performanceMetrics: any;
  competitorInsights: any;
  recommendations: string[];
}

interface ToolContext {
  platform: 'instagram' | 'tiktok' | 'sala';
  userId: string;
  intelligence: BrainIntelligence;
  cachedAt: Date;
}

// ── BRAIN-TO-TOOLS HUB ───────────────────────────────

class BrainToToolsHub {
  private brain: AutonomousFeedIABrain;
  private toolContextCache: Map<string, ToolContext> = new Map();
  private cacheExpiry: number = 3600000; // 1 hour

  constructor() {
    this.brain = new AutonomousFeedIABrain();
  }

  async injectIntelligenceIntoTools(): Promise<void> {
    console.log('[Brain→Tools Hub] Injecting intelligence into all tools');

    // Get brain's current intelligence
    const intelligence = await this.extractBrainIntelligence();

    // Distribute to all tools
    await this.injectIntoInstagram(intelligence);
    await this.injectIntoTikTok(intelligence);
    await this.injectIntoSala(intelligence);

    console.log('[Brain→Tools Hub] Intelligence distribution complete');
  }

  // ── EXTRACT BRAIN INTELLIGENCE ─────────────────────

  private async extractBrainIntelligence(): Promise<BrainIntelligence> {
    console.log('[Brain→Tools] Extracting intelligence from brain');

    const intelligence: BrainIntelligence = {
      accountPersonality: await this.brain.detectAccountPersonality(),
      contentStrategy: await this.brain.getContentStrategy(),
      growthOpportunities: await this.brain.identifyGrowthOpportunities(),
      viralTriggers: await this.brain.getViralTriggers(),
      postingSchedule: await this.brain.getOptimalPostingTimes(),
      contentCalendar: await this.brain.getContentCalendar(),
      audienceSegments: await this.brain.getAudienceSegmentation(),
      performanceMetrics: await this.brain.getPerformanceAnalysis(),
      competitorInsights: await this.brain.analyzeCompetitors(),
      recommendations: await this.brain.getOptimizationRecommendations(),
    };

    return intelligence;
  }

  // ── INJECT INTO INSTAGRAM ──────────────────────────

  private async injectIntoInstagram(intelligence: BrainIntelligence): Promise<void> {
    console.log('[Instagram Tool] Receiving intelligence from brain');

    const instagramContext = {
      platform: 'instagram' as const,
      userId: 'current_user',
      intelligence,
      cachedAt: new Date(),
    };

    // Cache for quick access
    this.toolContextCache.set('instagram', instagramContext);

    // Inject into Instagram tool handlers
    const instagramTool = new InstagramToolAdapter(instagramContext);

    await instagramTool.setPlatformStrategy({
      contentMix: {
        carousel: 40, // 40% carousels (high engagement)
        reels: 35, // 35% reels (viral potential)
        stories: 15, // 15% stories (engagement)
        posts: 10, // 10% static posts
      },
      postingTimes: intelligence.postingSchedule,
      contentTopics: intelligence.contentStrategy,
      audienceTargeting: intelligence.audienceSegments,
      performanceGoals: {
        engagement: 8, // 8% minimum
        reach: 50000, // 50k minimum
        saves: 100, // 100 saves minimum
      },
    });

    await instagramTool.activateContentFiltering({
      mustAlignWith: intelligence.accountPersonality.vibe,
      minAestheticScore: 75,
      minAlignmentScore: 80,
      autoRemoveIfBelow: { aesthetic: 60, alignment: 70 },
    });

    await instagramTool.enableGrowthOptimization({
      opportunities: intelligence.growthOpportunities,
      triggers: intelligence.viralTriggers,
      recommendations: intelligence.recommendations,
    });

    console.log('[Instagram Tool] Intelligence injected. Ready.');
  }

  // ── INJECT INTO TIKTOK ──────────────────────────────

  private async injectIntoTikTok(intelligence: BrainIntelligence): Promise<void> {
    console.log('[TikTok Tool] Receiving intelligence from brain');

    const tiktokContext = {
      platform: 'tiktok' as const,
      userId: 'current_user',
      intelligence,
      cachedAt: new Date(),
    };

    this.toolContextCache.set('tiktok', tiktokContext);

    const tiktokTool = new TikTokToolAdapter(tiktokContext);

    await tiktokTool.setPlatformStrategy({
      contentMix: {
        shortForm: 80, // 80% short-form (15-60sec) - TikTok native
        challenges: 10, // 10% trend participation
        duets: 5, // 5% engagement
        stitches: 5, // 5% collaboration
      },
      trendingTopics: intelligence.viralTriggers,
      soundStrategy: {
        trendingSounds: 60, // Use 60% trending audio
        originalSounds: 40, // 40% original/niche audio
      },
      uploadSchedule: intelligence.postingSchedule,
      contentFocus: intelligence.contentStrategy,
      audienceDemographics: intelligence.audienceSegments,
      performanceGoals: {
        views: 100000, // 100k views minimum
        engagement: 5, // 5% minimum
        shares: 500, // 500 shares minimum
      },
    });

    await tiktokTool.enableViralOptimization({
      hooks: intelligence.viralTriggers.filter((t) => t.includes('hook')),
      trends: intelligence.viralTriggers.filter((t) => t.includes('trend')),
      soundsToUse: intelligence.viralTriggers.filter((t) => t.includes('sound')),
    });

    console.log('[TikTok Tool] Intelligence injected. Ready.');
  }

  // ── INJECT INTO SALA (Room/Internal Tool) ──────────

  private async injectIntoSala(intelligence: BrainIntelligence): Promise<void> {
    console.log('[Sala Tool] Receiving intelligence from brain');

    const salaContext = {
      platform: 'sala' as const,
      userId: 'current_user',
      intelligence,
      cachedAt: new Date(),
    };

    this.toolContextCache.set('sala', salaContext);

    const salaTool = new SalaToolAdapter(salaContext);

    // Sala = internal planning/management tool
    await salaTool.setPlanningStrategy({
      contentCalendar: intelligence.contentCalendar,
      strategicPillars: intelligence.contentStrategy,
      teamTasks: await this.generateTeamTasks(intelligence),
      performanceTargets: intelligence.performanceMetrics,
      competitorBenchmarks: intelligence.competitorInsights,
    });

    await salaTool.enableStrategyDashboard({
      realTimeMetrics: intelligence.performanceMetrics,
      growthOpportunities: intelligence.growthOpportunities,
      recommendations: intelligence.recommendations,
      adjustableParameters: {
        contentMix: 'dynamically adjust by performance',
        postingTimes: 'learn from engagement patterns',
        contentTopics: 'prioritize high-performing pillars',
      },
    });

    console.log('[Sala Tool] Intelligence injected. Ready.');
  }

  // ── REAL-TIME CONTEXT INJECTION ────────────────────

  async getContextForTool(platform: 'instagram' | 'tiktok' | 'sala'): Promise<ToolContext> {
    // Check cache validity
    const cached = this.toolContextCache.get(platform);
    if (cached && Date.now() - cached.cachedAt.getTime() < this.cacheExpiry) {
      return cached;
    }

    // Cache expired, refresh intelligence
    const freshIntelligence = await this.extractBrainIntelligence();

    const context: ToolContext = {
      platform,
      userId: 'current_user',
      intelligence: freshIntelligence,
      cachedAt: new Date(),
    };

    this.toolContextCache.set(platform, context);
    return context;
  }

  // ── STRATEGY ROUTING ───────────────────────────────

  async routeStrategyByPlatform(
    platform: 'instagram' | 'tiktok' | 'sala',
    task: string,
  ): Promise<any> {
    const context = await this.getContextForTool(platform);

    switch (platform) {
      case 'instagram':
        return this.executeInstagramStrategy(task, context);
      case 'tiktok':
        return this.executeTikTokStrategy(task, context);
      case 'sala':
        return this.executeSalaStrategy(task, context);
    }
  }

  private async executeInstagramStrategy(task: string, context: ToolContext): Promise<any> {
    // Instagram strategy: authority + aspiration + engagement
    return {
      approach: 'high-engagement carousels + reels + authentic stories',
      contentMix: context.intelligence.contentStrategy,
      timing: context.intelligence.postingSchedule,
      quality: { aesthetic: 80, alignment: 85, engagement: 8 },
    };
  }

  private async executeTikTokStrategy(task: string, context: ToolContext): Promise<any> {
    // TikTok strategy: viral + trending + entertainment
    return {
      approach: 'trend-jacking + original hooks + audio optimization',
      contentMix: context.intelligence.viralTriggers,
      timing: context.intelligence.postingSchedule,
      quality: { virality: 70, engagement: 5, shares: 500 },
    };
  }

  private async executeSalaStrategy(task: string, context: ToolContext): Promise<any> {
    // Sala strategy: planning + optimization + analysis
    return {
      approach: 'strategic planning + performance dashboard + team coordination',
      goals: context.intelligence.performanceMetrics,
      recommendations: context.intelligence.recommendations,
      calendar: context.intelligence.contentCalendar,
    };
  }

  // ── HELPER FUNCTIONS ───────────────────────────────

  private async generateTeamTasks(intelligence: BrainIntelligence): Promise<string[]> {
    return [
      'Create carousels based on content strategy pillars',
      'Record TikTok videos focusing on viral triggers',
      'Engage with audience comments (CM tasks)',
      'Analyze performance metrics weekly',
      'Optimize posting times based on engagement data',
    ];
  }
}

// ── TOOL ADAPTERS (Receive intelligence) ───────────

class InstagramToolAdapter {
  constructor(private context: ToolContext) {}

  async setPlatformStrategy(strategy: any): Promise<void> {
    console.log('[Instagram] Platform strategy set:', strategy);
  }

  async activateContentFiltering(rules: any): Promise<void> {
    console.log('[Instagram] Content filtering activated:', rules);
  }

  async enableGrowthOptimization(config: any): Promise<void> {
    console.log('[Instagram] Growth optimization enabled:', config);
  }
}

class TikTokToolAdapter {
  constructor(private context: ToolContext) {}

  async setPlatformStrategy(strategy: any): Promise<void> {
    console.log('[TikTok] Platform strategy set:', strategy);
  }

  async enableViralOptimization(config: any): Promise<void> {
    console.log('[TikTok] Viral optimization enabled:', config);
  }
}

class SalaToolAdapter {
  constructor(private context: ToolContext) {}

  async setPlanningStrategy(strategy: any): Promise<void> {
    console.log('[Sala] Planning strategy set:', strategy);
  }

  async enableStrategyDashboard(config: any): Promise<void> {
    console.log('[Sala] Strategy dashboard enabled:', config);
  }
}

// ── PUBLIC API ──────────────────────────────────────

export async function initializeBrainToToolsHub(): Promise<BrainToToolsHub> {
  const hub = new BrainToToolsHub();
  await hub.injectIntelligenceIntoTools();
  return hub;
}

export { BrainToToolsHub };
