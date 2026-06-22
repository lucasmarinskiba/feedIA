import type { NicheCategory, MonetizationModel } from './nicheAnalyzer.js';
import type { AccountIntelligence } from './accountProfiler.js';

/**
 * Revenue Optimization Agent
 * Forecasts monetization potential, identifies revenue gaps, optimizes offer stack
 */

export interface RevenueProfile {
  accountId: string;
  niche: NicheCategory;
  monetizationModel: MonetizationModel;
  currentEstimate: RevenueEstimate;
  optimizedEstimate: RevenueEstimate;
  offerStack: OfferTier[];
  revenueLevers: RevenueLever[];
  conversionFunnelMap: FunnelStage[];
  monthlyProjection: MonthlyProjection[];
  recommendations: RevenueRecommendation[];
}

export interface RevenueEstimate {
  monthly: number;
  currency: string;
  confidence: 'low' | 'medium' | 'high';
  breakdown: Record<string, number>;
}

export interface OfferTier {
  name: string;
  type: 'free' | 'low-ticket' | 'mid-ticket' | 'high-ticket' | 'subscription' | 'physical';
  priceRange: string;
  conversionRate: number;
  audienceSize: string;
  purpose: 'lead-gen' | 'trust-builder' | 'main-offer' | 'upsell' | 'continuity';
  currentlyExists: boolean;
}

export interface RevenueLever {
  lever: string;
  currentState: string;
  optimizedState: string;
  estimatedRevenueImpact: string;
  effort: 'quick-win' | 'medium-term' | 'long-term';
}

export interface FunnelStage {
  stage: string;
  metric: string;
  currentConversion: string;
  targetConversion: string;
  bottleneck: boolean;
  fix: string;
}

export interface MonthlyProjection {
  month: number;
  conservative: number;
  realistic: number;
  optimistic: number;
  keyDriver: string;
}

export interface RevenueRecommendation {
  priority: number;
  action: string;
  expectedImpact: string;
  timeToImplement: string;
  effort: 'low' | 'medium' | 'high';
}

// Niche revenue benchmarks (monthly, in USD)
const NICHE_REVENUE_BENCHMARKS: Record<
  string,
  {
    seed: [number, number];
    growing: [number, number];
    established: [number, number];
    authority: [number, number];
  }
> = {
  'fitness-products': {
    seed: [0, 500],
    growing: [500, 5000],
    established: [5000, 30000],
    authority: [30000, 200000],
  },
  'fitness-coaching': {
    seed: [0, 1000],
    growing: [1000, 8000],
    established: [8000, 40000],
    authority: [40000, 300000],
  },
  'fitness-b2b': {
    seed: [0, 2000],
    growing: [2000, 15000],
    established: [15000, 80000],
    authority: [80000, 500000],
  },
  'personal-brand': {
    seed: [0, 500],
    growing: [500, 5000],
    established: [5000, 30000],
    authority: [30000, 500000],
  },
  ecommerce: {
    seed: [0, 2000],
    growing: [2000, 20000],
    established: [20000, 100000],
    authority: [100000, 1000000],
  },
};

// Offer stack templates per niche
const OFFER_STACKS: Record<string, OfferTier[]> = {
  'fitness-coaching': [
    {
      name: 'Free workout guide',
      type: 'free',
      priceRange: '$0',
      conversionRate: 0.2,
      audienceSize: 'All followers',
      purpose: 'lead-gen',
      currentlyExists: false,
    },
    {
      name: 'Online training program',
      type: 'low-ticket',
      priceRange: '$27-97',
      conversionRate: 0.03,
      audienceSize: 'Warmed leads',
      purpose: 'trust-builder',
      currentlyExists: false,
    },
    {
      name: '1:1 Coaching (3 months)',
      type: 'high-ticket',
      priceRange: '$997-2997',
      conversionRate: 0.05,
      audienceSize: 'DM leads',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Group coaching program',
      type: 'mid-ticket',
      priceRange: '$297-997',
      conversionRate: 0.08,
      audienceSize: 'Email/DM list',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Membership / app',
      type: 'subscription',
      priceRange: '$19-49/mo',
      conversionRate: 0.1,
      audienceSize: 'Past clients',
      purpose: 'continuity',
      currentlyExists: false,
    },
  ],
  'fitness-b2b': [
    {
      name: 'Free webinar/masterclass',
      type: 'free',
      priceRange: '$0',
      conversionRate: 0.15,
      audienceSize: 'All followers',
      purpose: 'lead-gen',
      currentlyExists: false,
    },
    {
      name: 'Business starter guide',
      type: 'low-ticket',
      priceRange: '$47-197',
      conversionRate: 0.04,
      audienceSize: 'Webinar attendees',
      purpose: 'trust-builder',
      currentlyExists: false,
    },
    {
      name: 'Business coaching program',
      type: 'high-ticket',
      priceRange: '$2000-8000',
      conversionRate: 0.03,
      audienceSize: 'Qualified leads',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Group mastermind',
      type: 'mid-ticket',
      priceRange: '$497-1997',
      conversionRate: 0.05,
      audienceSize: 'Email list',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Monthly business community',
      type: 'subscription',
      priceRange: '$97-297/mo',
      conversionRate: 0.08,
      audienceSize: 'Past clients',
      purpose: 'continuity',
      currentlyExists: false,
    },
  ],
  'fitness-products': [
    {
      name: 'Sample/trial product',
      type: 'free',
      priceRange: '$0 + shipping',
      conversionRate: 0.3,
      audienceSize: 'Paid traffic',
      purpose: 'lead-gen',
      currentlyExists: false,
    },
    {
      name: 'Single product',
      type: 'low-ticket',
      priceRange: '$29-79',
      conversionRate: 0.02,
      audienceSize: 'Website traffic',
      purpose: 'trust-builder',
      currentlyExists: false,
    },
    {
      name: 'Bundle/stack',
      type: 'mid-ticket',
      priceRange: '$97-199',
      conversionRate: 0.03,
      audienceSize: 'Repeat buyers',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Monthly subscription',
      type: 'subscription',
      priceRange: '$49-99/mo',
      conversionRate: 0.15,
      audienceSize: 'Past buyers',
      purpose: 'continuity',
      currentlyExists: false,
    },
  ],
  ecommerce: [
    {
      name: 'Lead magnet / discount code',
      type: 'free',
      priceRange: '$0',
      conversionRate: 0.25,
      audienceSize: 'All traffic',
      purpose: 'lead-gen',
      currentlyExists: false,
    },
    {
      name: 'Entry product',
      type: 'low-ticket',
      priceRange: '$15-49',
      conversionRate: 0.02,
      audienceSize: 'Website traffic',
      purpose: 'trust-builder',
      currentlyExists: false,
    },
    {
      name: 'Core product',
      type: 'mid-ticket',
      priceRange: '$50-200',
      conversionRate: 0.03,
      audienceSize: 'Warmed audience',
      purpose: 'main-offer',
      currentlyExists: false,
    },
    {
      name: 'Premium collection',
      type: 'high-ticket',
      priceRange: '$200-500',
      conversionRate: 0.01,
      audienceSize: 'Loyal customers',
      purpose: 'upsell',
      currentlyExists: false,
    },
    {
      name: 'VIP subscription box',
      type: 'subscription',
      priceRange: '$49-99/mo',
      conversionRate: 0.08,
      audienceSize: 'Past buyers',
      purpose: 'continuity',
      currentlyExists: false,
    },
  ],
};

export class RevenueOptimizationAgent {
  buildRevenueProfile(intel: AccountIntelligence): RevenueProfile {
    const { niche, strategy, accountId } = intel;
    const benchmark = NICHE_REVENUE_BENCHMARKS[niche.nicheCategory]?.[niche.growthStage];
    const offerStack = OFFER_STACKS[niche.nicheCategory] ?? OFFER_STACKS['fitness-coaching']!;

    const currentEstimate = this.estimateCurrentRevenue(intel, benchmark);
    const optimizedEstimate = this.estimateOptimizedRevenue(intel, offerStack, benchmark);
    const revenueLevers = this.identifyRevenueLevers(intel, offerStack);
    const funnelMap = this.buildFunnelMap(niche.nicheCategory, niche.monetizationModel);
    const projection = this.buildMonthlyProjection(currentEstimate.monthly, optimizedEstimate.monthly);

    return {
      accountId,
      niche: niche.nicheCategory,
      monetizationModel: niche.monetizationModel,
      currentEstimate,
      optimizedEstimate,
      offerStack,
      revenueLevers,
      conversionFunnelMap: funnelMap,
      monthlyProjection: projection,
      recommendations: this.generateRecommendations(revenueLevers, funnelMap),
    };
  }

  private estimateCurrentRevenue(intel: AccountIntelligence, benchmark?: [number, number]): RevenueEstimate {
    if (!benchmark) {
      return { monthly: 0, currency: 'USD', confidence: 'low', breakdown: {} };
    }

    const [min, max] = benchmark;
    const growthProgress = 0.4;
    const monthly = Math.round(min + (max - min) * growthProgress);

    return {
      monthly,
      currency: 'USD',
      confidence: 'medium',
      breakdown: {
        [`${intel.niche.monetizationModel}`]: monthly,
      },
    };
  }

  private estimateOptimizedRevenue(
    intel: AccountIntelligence,
    offerStack: OfferTier[],
    benchmark?: [number, number],
  ): RevenueEstimate {
    const followers = 10000;
    let totalMonthly = 0;
    const breakdown: Record<string, number> = {};

    for (const offer of offerStack) {
      const audiencePool = followers * 0.1;
      const monthlyConversions = audiencePool * offer.conversionRate;

      const priceMatch = offer.priceRange.match(/\$(\d+)/);
      const price = priceMatch ? parseInt(priceMatch[1]!, 10) : 0;

      const revenue = Math.round(monthlyConversions * price);
      if (revenue > 0) {
        breakdown[offer.name] = revenue;
        totalMonthly += revenue;
      }
    }

    const benchmarkMax = benchmark?.[1] ?? totalMonthly;
    const realistic = Math.min(totalMonthly, benchmarkMax);

    return {
      monthly: realistic,
      currency: 'USD',
      confidence: 'medium',
      breakdown,
    };
  }

  private identifyRevenueLevers(intel: AccountIntelligence, offerStack: OfferTier[]): RevenueLever[] {
    const levers: RevenueLever[] = [];
    const niche = intel.niche.nicheCategory;

    // Offer stack completeness
    const missingOffers = offerStack.filter((o) => !o.currentlyExists);
    if (missingOffers.length > 0) {
      const firstMissing = missingOffers[0]!;
      levers.push({
        lever: 'Offer stack gap',
        currentState: `Missing ${missingOffers.length} offer tiers`,
        optimizedState: `Add ${firstMissing.name} (${firstMissing.priceRange})`,
        estimatedRevenueImpact: `+$${firstMissing.conversionRate * 10000 * 50}/month`,
        effort: 'medium-term',
      });
    }

    // Recurring revenue
    const hasSubscription = offerStack.some((o) => o.type === 'subscription');
    if (!hasSubscription) {
      levers.push({
        lever: 'No recurring revenue',
        currentState: 'All one-time sales',
        optimizedState: 'Add monthly subscription/membership',
        estimatedRevenueImpact: '+40-80% revenue stability',
        effort: 'medium-term',
      });
    }

    // Price point optimization
    if (niche === 'fitness-coaching' || niche === 'fitness-b2b') {
      levers.push({
        lever: 'High-ticket offer',
        currentState: 'Likely missing premium 1:1 or group coaching',
        optimizedState: '$2K-8K program with clear transformation promise',
        estimatedRevenueImpact: '1-2 sales/month = $2K-16K',
        effort: 'quick-win',
      });
    }

    // Email/DM list
    levers.push({
      lever: 'Owned audience building',
      currentState: 'Platform-dependent (Instagram/TikTok can disappear)',
      optimizedState: 'Email list + ManyChat DM list as safety net',
      estimatedRevenueImpact: 'Protect existing revenue + 20-30% launch boost',
      effort: 'quick-win',
    });

    // Ads ROI
    if (intel.niche.growthStage !== 'seed') {
      levers.push({
        lever: 'Paid traffic not optimized',
        currentState: 'Organic only or unoptimized ads',
        optimizedState: 'Retargeting ads for warm audience ($5-20 ROAS)',
        estimatedRevenueImpact: '+30-100% revenue with positive ROAS',
        effort: 'medium-term',
      });
    }

    return levers;
  }

  private buildFunnelMap(niche: NicheCategory, monetization: MonetizationModel): FunnelStage[] {
    const isServicesB2C = monetization === 'services-b2c';
    const isProducts = monetization === 'physical-products';

    return [
      {
        stage: 'Reach / Impressions',
        metric: 'Monthly reach',
        currentConversion: '100%',
        targetConversion: 'Maximize',
        bottleneck: false,
        fix: 'Consistency + trend alignment',
      },
      {
        stage: 'Profile Visit',
        metric: '% of reach that visits profile',
        currentConversion: '5-15%',
        targetConversion: '>15%',
        bottleneck: false,
        fix: 'Strong hook → curiosity → profile visit',
      },
      {
        stage: 'Follow',
        metric: '% of profile visitors that follow',
        currentConversion: '10-30%',
        targetConversion: '>25%',
        bottleneck: false,
        fix: 'Clear bio value prop + pinned transformation post',
      },
      {
        stage: 'Engaged Follower',
        metric: '% of followers that engage',
        currentConversion: '3-10%',
        targetConversion: '>6%',
        bottleneck: true,
        fix: 'Post more saves/shares content + reply to comments',
      },
      {
        stage: isServicesB2C ? 'DM / Lead' : 'Website Click',
        metric: isServicesB2C ? 'DM inquiries/month' : 'Bio link clicks',
        currentConversion: isServicesB2C ? '0.5-2%' : '1-5%',
        targetConversion: isServicesB2C ? '>2%' : '>5%',
        bottleneck: true,
        fix: isServicesB2C ? 'Stronger CTA in captions + story swipe-ups' : 'Link in bio optimizer + UTM tracking',
      },
      {
        stage: 'Purchase / Client',
        metric: isProducts ? 'Add-to-cart rate' : 'Discovery call booked',
        currentConversion: isProducts ? '1-3%' : '20-40% of DMs',
        targetConversion: isProducts ? '>2%' : '>30%',
        bottleneck: true,
        fix: isProducts ? 'Retargeting ads + abandoned cart emails' : 'DM qualification script + urgency offer',
      },
    ];
  }

  private buildMonthlyProjection(current: number, optimized: number): MonthlyProjection[] {
    const growthRate = optimized / Math.max(current, 1) - 1;
    const monthlyGrowth = Math.pow(1 + growthRate, 1 / 6);

    return Array.from({ length: 6 }, (_, i) => {
      const month = i + 1;
      const conservative = Math.round(current * Math.pow(1.05, month));
      const realistic = Math.round(current * Math.pow(monthlyGrowth, month));
      const optimistic = Math.round(current * Math.pow(monthlyGrowth * 1.3, month));

      const drivers = [
        'Consistent content',
        'Offer launch',
        'Email list',
        'First ad campaign',
        'High-ticket offer',
        'Recurring revenue',
      ];

      return {
        month,
        conservative,
        realistic,
        optimistic,
        keyDriver: drivers[i] ?? 'Growth compound',
      };
    });
  }

  private generateRecommendations(levers: RevenueLever[], funnel: FunnelStage[]): RevenueRecommendation[] {
    const recs: RevenueRecommendation[] = [];
    let priority = 1;

    // Quick wins first
    levers
      .filter((l) => l.effort === 'quick-win')
      .forEach((l) => {
        recs.push({
          priority: priority++,
          action: l.optimizedState,
          expectedImpact: l.estimatedRevenueImpact,
          timeToImplement: '1-2 weeks',
          effort: 'low',
        });
      });

    // Fix bottlenecks
    funnel
      .filter((f) => f.bottleneck)
      .forEach((f) => {
        recs.push({
          priority: priority++,
          action: f.fix,
          expectedImpact: `Fix ${f.stage} bottleneck → improve ${f.metric}`,
          timeToImplement: '1-4 weeks',
          effort: 'medium',
        });
      });

    // Medium-term levers
    levers
      .filter((l) => l.effort === 'medium-term')
      .slice(0, 2)
      .forEach((l) => {
        recs.push({
          priority: priority++,
          action: l.optimizedState,
          expectedImpact: l.estimatedRevenueImpact,
          timeToImplement: '1-3 months',
          effort: 'medium',
        });
      });

    return recs.slice(0, 8);
  }
}

export const revenueOptimizationAgent = new RevenueOptimizationAgent();
