import { log } from '../../agent/logger.js';
import { accountProfiler } from './accountProfiler.js';
import type { AccountIntelligence } from './accountProfiler.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Multi-Account Orchestrator
 * Routes ALL system capabilities (design, video, posting, analytics, ads)
 * per account based on niche intelligence profile
 *
 * One user → many accounts → each account gets tailored strategy
 */

export interface MultiAccountPlan {
  userId: string;
  accounts: AccountPlan[];
  crossAccountSynergies: string[];
  generatedAt: Date;
}

export interface AccountPlan {
  accountId: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  weeklyContentPlan: WeeklyContentItem[];
  adStrategy: AdStrategyConfig;
  growthActions: GrowthAction[];
  kpis: AccountKPI[];
}

export interface WeeklyContentItem {
  day: string;
  time: string;
  format: 'reel' | 'carousel' | 'story' | 'post' | 'tiktok-video' | 'photo-mode';
  topic: string;
  hook: string;
  cta: string;
  hashtags: string[];
  designNotes: string;
}

export interface AdStrategyConfig {
  recommended: boolean;
  budget: number;
  objective: string;
  audience: string;
  creative: string;
}

export interface GrowthAction {
  action: string;
  priority: 'high' | 'medium' | 'low';
  frequency: string;
  expectedImpact: string;
}

export interface AccountKPI {
  metric: string;
  current: number;
  target30d: number;
  target90d: number;
}

export class MultiAccountOrchestrator {
  /**
   * Build full multi-account plan for a user
   * Each account gets niche-tailored strategy
   */
  async buildUserPlan(
    userId: string,
    accounts: Array<{ handle: string; platform: 'instagram' | 'tiktok' }>,
    brand: BrandProfile,
  ): Promise<MultiAccountPlan> {
    log.info(`[MultiAccount] Building plan for user ${userId}: ${accounts.length} accounts`);

    const accountPlans: AccountPlan[] = [];

    // Profile each account + build tailored plan
    for (const account of accounts) {
      const intelligence = await accountProfiler.profileAccount(account.handle, account.platform, brand);

      const plan = this.buildAccountPlan(intelligence);
      accountPlans.push(plan);
    }

    // Detect cross-account synergies
    const synergies = this.detectSynergies(accountPlans);

    return {
      userId,
      accounts: accountPlans,
      crossAccountSynergies: synergies,
      generatedAt: new Date(),
    };
  }

  private buildAccountPlan(intel: AccountIntelligence): AccountPlan {
    const { strategy, niche, handle, platform, accountId } = intel;

    return {
      accountId,
      handle,
      platform,
      weeklyContentPlan: this.buildWeeklyPlan(intel),
      adStrategy: this.buildAdStrategy(intel),
      growthActions: this.buildGrowthActions(intel),
      kpis: this.buildKPIs(intel),
    };
  }

  private buildWeeklyPlan(intel: AccountIntelligence): WeeklyContentItem[] {
    const { strategy, niche } = intel;
    const { postingSchedule, contentMix, hashtagStrategy } = strategy;
    const items: WeeklyContentItem[] = [];

    const days = postingSchedule.bestDays;
    const times = postingSchedule.bestTimes;

    // Distribute content types across week based on contentMix ratios
    const totalPosts = postingSchedule.postsPerWeek;
    const educationalCount = Math.round((contentMix.educational / 100) * totalPosts);
    const promotionalCount = Math.round((contentMix.promotional / 100) * totalPosts);
    const entertainmentCount = Math.round((contentMix.entertainment / 100) * totalPosts);
    const personalCount = Math.round((contentMix.personal / 100) * totalPosts);

    const templates = this.getContentTemplates(niche.nicheCategory, niche.monetizationModel);

    let i = 0;
    // Educational posts
    for (let e = 0; e < educationalCount && i < days.length; e++, i++) {
      const day = days[i % days.length] || 'Mon';
      const time = times[i % times.length] || '12:00';
      const eduList = templates.educational || [];
      const template = eduList[e % (eduList.length || 1)];
      items.push({
        day,
        time,
        format: postingSchedule.reelsRatio > 60 ? 'reel' : 'carousel',
        topic: template?.topic || 'Educational content',
        hook: template?.hook || 'Did you know...',
        cta: strategy.cta,
        hashtags: niche.topHashtags.slice(0, hashtagStrategy.small + hashtagStrategy.medium),
        designNotes: `Educational style. Colors: ${niche.targetAudience.interests.join(', ')}`,
      });
    }

    // Promotional posts
    for (let p = 0; p < promotionalCount && i < totalPosts; p++, i++) {
      const day = days[i % days.length] || 'Mon';
      const time = times[i % times.length] || '12:00';
      const promoList = templates.promotional || [];
      const template = promoList[p % (promoList.length || 1)];
      items.push({
        day,
        time,
        format: 'reel',
        topic: template?.topic || 'Promotional content',
        hook: template?.hook || 'This is what changed everything...',
        cta: strategy.cta,
        hashtags: niche.topHashtags.slice(0, hashtagStrategy.medium + hashtagStrategy.large),
        designNotes: `Promotional style. CTA prominent. Brand colors.`,
      });
    }

    // Personal posts
    for (let per = 0; per < personalCount && i < totalPosts; per++, i++) {
      const day = days[i % days.length] || 'Mon';
      const time = times[i % times.length] || '12:00';
      const personalList = templates.personal || [];
      const template = personalList[per % (personalList.length || 1)];
      items.push({
        day,
        time,
        format: intel.platform === 'tiktok' ? 'tiktok-video' : 'reel',
        topic: template?.topic || 'Personal story',
        hook: template?.hook || 'Real talk...',
        cta: 'Follow for more',
        hashtags: niche.topHashtags.slice(0, hashtagStrategy.small),
        designNotes: `Authentic, raw. Minimal edits.`,
      });
    }

    return items;
  }

  private getContentTemplates(
    niche: string,
    monetization: string,
  ): Record<string, Array<{ topic: string; hook: string }>> {
    const templates: Record<string, Record<string, Array<{ topic: string; hook: string }>>> = {
      'fitness-products': {
        educational: [
          { topic: 'Why most supplements fail', hook: 'Nobody talks about this ingredient...' },
          { topic: 'Pre-workout timing science', hook: "You've been timing this wrong" },
          { topic: 'Protein absorption myths', hook: 'Stop wasting your protein shakes' },
        ],
        promotional: [
          { topic: 'New product launch', hook: 'This is the product I wish existed 3 years ago' },
          { topic: 'Bundle deal', hook: 'Everything you need for $X (limited time)' },
          { topic: 'Customer transformation', hook: 'She lost 15kg using only our products' },
        ],
        personal: [
          { topic: 'My fitness journey', hook: 'I was embarrassed to go to the gym until...' },
          { topic: 'Behind the scenes', hook: 'What nobody shows you about building this brand' },
        ],
      },
      'fitness-coaching': {
        educational: [
          { topic: '5 mistakes killing your progress', hook: 'I see this mistake every day with new clients' },
          { topic: 'Training myth busted', hook: 'Your trainer has been lying to you about...' },
          { topic: 'Mindset shift for results', hook: "The real reason you're not seeing results" },
        ],
        promotional: [
          { topic: 'Client transformation', hook: 'He told me it was impossible. 90 days later...' },
          { topic: 'Program enrollment', hook: 'Last 5 spots open for my coaching program' },
          { topic: 'Free value offer', hook: 'DM me "READY" and I\'ll send my free guide' },
        ],
        personal: [
          { topic: 'My transformation story', hook: 'This is what made me become a coach' },
          { topic: 'Coaching lesson', hook: 'Client said this and it changed how I teach' },
        ],
      },
      'fitness-b2b': {
        educational: [
          { topic: 'How to get 10 clients in 30 days', hook: 'The system no fitness coach is using' },
          { topic: 'Pricing strategy for coaches', hook: 'Stop undercharging for your services' },
          { topic: 'Social media for fitness pros', hook: "Why your content isn't converting" },
        ],
        promotional: [
          { topic: 'Coaching for coaches program', hook: 'I helped 50 coaches hit $10K/month' },
          { topic: 'Case study', hook: 'From 0 to $5K/month in 60 days' },
          { topic: 'Lead gen system', hook: 'Free webinar: how I get 20 leads/week' },
        ],
        personal: [
          { topic: 'My business journey', hook: 'I failed 3 times before this worked' },
          { topic: 'Industry take', hook: 'Controversial opinion about the fitness industry' },
        ],
      },
    };

    const nicheTemplates = templates[niche] || templates['fitness-coaching']!;
    return {
      educational: nicheTemplates.educational || [],
      promotional: nicheTemplates.promotional || [],
      personal: nicheTemplates.personal || [],
    };
  }

  private buildAdStrategy(intel: AccountIntelligence): AdStrategyConfig {
    const { niche, strategy } = intel;
    const shouldRunAds = niche.monetizationModel !== 'content-only' && niche.growthStage !== 'seed';

    return {
      recommended: shouldRunAds,
      budget: niche.growthStage === 'authority' ? 500 : niche.growthStage === 'established' ? 200 : 50,
      objective: strategy.primaryObjective === 'sell' ? 'conversions' : 'reach',
      audience: niche.targetAudience.interests.join(', '),
      creative: `${strategy.contentTone} style. Hook: ${strategy.cta}`,
    };
  }

  private buildGrowthActions(intel: AccountIntelligence): GrowthAction[] {
    return intel.strategy.growthTactics.map((tactic, i) => ({
      action: tactic,
      priority: i < 2 ? 'high' : i < 4 ? 'medium' : 'low',
      frequency: 'daily',
      expectedImpact: '+50-200 followers/week',
    }));
  }

  private buildKPIs(intel: AccountIntelligence): AccountKPI[] {
    const isGrowing = intel.niche.growthStage === 'growing';

    return [
      {
        metric: 'followers',
        current: 0,
        target30d: isGrowing ? 1000 : 500,
        target90d: isGrowing ? 5000 : 2000,
      },
      {
        metric: 'engagement_rate',
        current: 0,
        target30d: 5,
        target90d: 8,
      },
      {
        metric: 'monthly_reach',
        current: 0,
        target30d: 50000,
        target90d: 200000,
      },
    ];
  }

  private detectSynergies(plans: AccountPlan[]): string[] {
    const synergies: string[] = [];

    if (plans.length < 2) return synergies;

    // Cross-promotion opportunities
    synergies.push('Cross-promote between accounts using story mentions');

    // Content repurposing
    synergies.push('Repurpose educational content across all accounts with different angles');

    // Audience funneling
    if (plans.some((p) => p.kpis.some((k) => k.metric === 'followers'))) {
      synergies.push('Funnel audiences: grow personal account → redirect to product/service accounts');
    }

    // Posting stagger
    synergies.push('Stagger posting times across accounts to avoid audience fatigue');

    return synergies;
  }

  /**
   * Get niche-specific Computer Use prompt context
   * Used to enhance all Computer Use operations with account context
   */
  getNicheContext(accountId: string): string {
    const profile = accountProfiler.getProfile(accountId);
    if (!profile) return '';

    const { niche, strategy } = profile;
    return `
ACCOUNT CONTEXT FOR @${profile.handle}:
- Niche: ${niche.nicheCategory} / ${niche.subNiche}
- Audience: ${niche.targetAudience.ageRange}, ${niche.targetAudience.gender}
- Monetization: ${niche.monetizationModel}
- Content tone: ${strategy.contentTone}
- Primary CTA: ${strategy.cta}
- Pain points: ${niche.targetAudience.painPoints.join(', ')}
- Goals audience has: ${niche.targetAudience.goals.join(', ')}
- Brand voice signals: ${niche.brandVoiceSignals.join(', ')}
- Content pillars: ${niche.contentPillars.join(', ')}
- Growth stage: ${niche.growthStage}
Apply this context to all content decisions.`;
  }
}

export const multiAccountOrchestrator = new MultiAccountOrchestrator();
