/**
 * Production Seed Data Generator for FeedIA
 * Creates realistic test data for PostgreSQL:
 * - 10 test users (free, pro, agency tiers)
 * - 30 campaigns across platforms
 * - 500+ analytics events with realistic engagement patterns
 * - 50 audience segments
 * - A/B test data with results
 * - ROI data with costs and conversions
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

interface SeedConfig {
  databaseUrl: string;
  users: number;
  campaignsPerUser: number;
  analyticsEventsPerCampaign: number;
  audienceSegments: number;
  abTestsPerUser: number;
}

const config: SeedConfig = {
  databaseUrl: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL || '',
  users: 10,
  campaignsPerUser: 3,
  analyticsEventsPerCampaign: 25,
  audienceSegments: 50,
  abTestsPerUser: 2,
};

// Type definitions
interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'agency';
  plan: 'free' | 'pro' | 'premium';
  storage_used_gb: number;
  analytics_retention_days: number;
  created_at: Date;
}

interface Campaign {
  id: string;
  user_id: string;
  title: string;
  platform: 'instagram' | 'tiktok' | 'youtube';
  format: 'carousel' | 'reel' | 'story';
  metadata: Record<string, unknown>;
  slides: string;
  created_at: Date;
  updated_at: Date;
}

interface AnalyticsEvent {
  id: string;
  carousel_id: string;
  user_id: string;
  event_type: 'view' | 'share' | 'save' | 'like' | 'click';
  source: string;
  user_agent: string;
  referrer: string;
  created_at: Date;
}

interface AudienceSegment {
  id: string;
  user_id: string;
  name: string;
  criteria: Record<string, unknown>;
  size: number;
  created_at: Date;
}

interface ABTest {
  id: string;
  user_id: string;
  campaign_id: string;
  variant_a_id: string;
  variant_b_id: string;
  metric_type: string;
  winner: 'a' | 'b' | 'none';
  confidence_score: number;
  created_at: Date;
}

// Sample data generators
const samplePlatforms = ['instagram', 'tiktok', 'youtube'] as const;
const sampleFormats = ['carousel', 'reel', 'story'] as const;
const sampleEventTypes = ['view', 'share', 'save', 'like', 'click'] as const;
const sampleSources = ['organic', 'explore', 'feed', 'direct', 'hashtag', 'trending'];
const sampleTiers = ['free', 'pro', 'agency'] as const;

const userAgents = [
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
];

const referrers = [
  'https://instagram.com',
  'https://tiktok.com',
  'https://youtube.com',
  'https://google.com',
  'direct',
  'https://facebook.com',
];

const sampleSlides = [
  {
    type: 'text',
    content: 'Transform Your Social Media Strategy',
    design: { font_size: 32, color: '#000000', background: '#FFFFFF' },
  },
  {
    type: 'image',
    url: 'https://via.placeholder.com/1080x1920?text=Slide+1',
    design: { overlay: 'dark' },
  },
  {
    type: 'cta',
    content: 'Learn More →',
    design: { button_color: '#FF6B6B', text_color: '#FFFFFF' },
  },
];

class FeedIASeedGenerator {
  private pool: Pool;
  private users: User[] = [];
  private campaigns: Campaign[] = [];

  constructor(databaseUrl: string) {
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
  }

  async connect(): Promise<void> {
    try {
      await this.pool.query('SELECT NOW()');
      console.log('✓ Connected to PostgreSQL');
    } catch (err) {
      throw new Error(`Failed to connect to database: ${err instanceof Error ? err.message : err}`);
    }
  }

  async generateUsers(): Promise<void> {
    console.log('\n📝 Generating test users...');

    const tierDistribution = {
      free: 4,
      pro: 4,
      agency: 2,
    };

    let userIndex = 1;

    for (const [tier, count] of Object.entries(tierDistribution)) {
      for (let i = 0; i < count; i++) {
        const user: User = {
          id: uuidv4(),
          email: `user.${tier}.${userIndex}@feedia-test.dev`,
          name: `Test User ${tier.toUpperCase()} ${userIndex}`,
          tier: tier as 'free' | 'pro' | 'agency',
          plan: tier === 'agency' ? 'premium' : (tier as 'free' | 'pro'),
          storage_used_gb: tier === 'free' ? 0 : tier === 'pro' ? 2 : 50,
          analytics_retention_days: tier === 'free' ? 30 : tier === 'pro' ? 90 : 365,
          created_at: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Within 30 days
        };

        await this.pool.query(
          `INSERT INTO users (id, email, name, plan, storage_used_gb, analytics_retention_days, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (id) DO NOTHING`,
          [user.id, user.email, user.name, user.plan, user.storage_used_gb, user.analytics_retention_days, user.created_at],
        );

        this.users.push(user);
        userIndex++;
      }
    }

    console.log(`✓ Created ${this.users.length} users`);
  }

  async generateCampaigns(): Promise<void> {
    console.log('\n📊 Generating campaigns...');

    let campaignIndex = 1;

    for (const user of this.users) {
      const numCampaigns = config.campaignsPerUser;

      for (let i = 0; i < numCampaigns; i++) {
        const platform = samplePlatforms[Math.floor(Math.random() * samplePlatforms.length)];
        const format = sampleFormats[Math.floor(Math.random() * sampleFormats.length)];
        const dayOffset = Math.floor(Math.random() * 30);

        const campaign: Campaign = {
          id: uuidv4(),
          user_id: user.id,
          title: `Campaign ${campaignIndex}: ${platform} ${format}`,
          platform,
          format,
          slides: JSON.stringify(sampleSlides),
          metadata: {
            tags: ['test', 'seed-data', platform],
            goal: ['engagement', 'reach', 'conversion'][Math.floor(Math.random() * 3)],
            budget_usd: Math.random() * 500 + 50,
            impressions_target: Math.floor(Math.random() * 50000 + 10000),
            cost_per_thousand: (Math.random() * 3 + 0.5).toFixed(2),
          },
          created_at: new Date(Date.now() - dayOffset * 24 * 60 * 60 * 1000),
          updated_at: new Date(Date.now() - (dayOffset - 5) * 24 * 60 * 60 * 1000),
        };

        await this.pool.query(
          `INSERT INTO carousels (id, user_id, title, platform, format, slides, metadata, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          [
            campaign.id,
            campaign.user_id,
            campaign.title,
            campaign.platform,
            campaign.format,
            campaign.slides,
            JSON.stringify(campaign.metadata),
            campaign.created_at,
            campaign.updated_at,
          ],
        );

        this.campaigns.push(campaign);
        campaignIndex++;
      }
    }

    console.log(`✓ Created ${this.campaigns.length} campaigns`);
  }

  async generateAnalyticsEvents(): Promise<void> {
    console.log('\n📈 Generating analytics events...');

    let eventCount = 0;

    for (const campaign of this.campaigns) {
      const eventsPerCampaign = config.analyticsEventsPerCampaign;
      const createdAtMs = campaign.created_at.getTime();
      const updatedAtMs = campaign.updated_at.getTime();

      // Generate realistic event distribution:
      // 50% views, 25% likes, 10% shares, 10% saves, 5% clicks
      const eventDistribution = {
        view: Math.floor(eventsPerCampaign * 0.5),
        like: Math.floor(eventsPerCampaign * 0.25),
        share: Math.floor(eventsPerCampaign * 0.1),
        save: Math.floor(eventsPerCampaign * 0.1),
        click: Math.floor(eventsPerCampaign * 0.05),
      };

      for (const [eventType, count] of Object.entries(eventDistribution)) {
        for (let i = 0; i < count; i++) {
          const timeSinceCreation = Math.random() * (updatedAtMs - createdAtMs);
          const eventTime = new Date(createdAtMs + timeSinceCreation);

          const event: AnalyticsEvent = {
            id: uuidv4(),
            carousel_id: campaign.id,
            user_id: campaign.user_id,
            event_type: eventType as 'view' | 'share' | 'save' | 'like' | 'click',
            source: sampleSources[Math.floor(Math.random() * sampleSources.length)],
            user_agent: userAgents[Math.floor(Math.random() * userAgents.length)],
            referrer: referrers[Math.floor(Math.random() * referrers.length)],
            created_at: eventTime,
          };

          await this.pool.query(
            `INSERT INTO carousel_analytics (id, carousel_id, user_id, event_type, source, user_agent, referrer, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO NOTHING`,
            [
              event.id,
              event.carousel_id,
              event.user_id,
              event.event_type,
              event.source,
              event.user_agent,
              event.referrer,
              event.created_at,
            ],
          );

          eventCount++;
        }
      }
    }

    console.log(`✓ Created ${eventCount} analytics events`);

    // Generate aggregated daily metrics
    await this.generateDailyMetrics();
  }

  private async generateDailyMetrics(): Promise<void> {
    console.log('  Aggregating daily metrics...');

    for (const campaign of this.campaigns) {
      const startDate = new Date(campaign.created_at);
      const endDate = new Date(campaign.updated_at);

      // Generate metrics for each day from campaign creation to update
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const date = d.toISOString().split('T')[0];

        // Query actual events for this day
        const result = await this.pool.query(
          `SELECT
             COUNT(CASE WHEN event_type = 'view' THEN 1 END) as views,
             COUNT(DISTINCT user_id) as unique_users,
             COUNT(CASE WHEN event_type = 'share' THEN 1 END) as shares,
             COUNT(CASE WHEN event_type = 'save' THEN 1 END) as saves,
             COUNT(CASE WHEN event_type = 'like' THEN 1 END) as likes,
             COUNT(CASE WHEN event_type = 'click' THEN 1 END) as clicks
           FROM carousel_analytics
           WHERE carousel_id = $1 AND DATE(created_at) = $2`,
          [campaign.id, date],
        );

        const row = result.rows[0];
        if (row && row.views > 0) {
          const engagement_rate =
            row.views > 0
              ? (((row.likes + row.shares + row.saves + row.clicks) / row.views) * 100).toFixed(2)
              : '0';

          const metricId = uuidv4();
          await this.pool.query(
            `INSERT INTO carousel_metrics_daily (id, carousel_id, user_id, date, views, views_unique, shares, saves, likes, clicks, engagement_rate, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             ON CONFLICT (carousel_id, date) DO UPDATE SET
               views = EXCLUDED.views,
               views_unique = EXCLUDED.views_unique,
               shares = EXCLUDED.shares,
               saves = EXCLUDED.saves,
               likes = EXCLUDED.likes,
               clicks = EXCLUDED.clicks,
               engagement_rate = EXCLUDED.engagement_rate`,
            [
              metricId,
              campaign.id,
              campaign.user_id,
              date,
              row.views,
              row.unique_users,
              row.shares,
              row.saves,
              row.likes,
              row.clicks,
              engagement_rate,
              new Date(),
            ],
          );
        }
      }
    }

    console.log('  ✓ Daily metrics aggregated');
  }

  async generateAudienceSegments(): Promise<void> {
    console.log('\n👥 Generating audience segments...');

    const interests = [
      'lifestyle',
      'fitness',
      'fashion',
      'technology',
      'travel',
      'food',
      'beauty',
      'education',
      'business',
      'entertainment',
    ];
    const locations = ['USA', 'UK', 'Canada', 'Australia', 'Brazil', 'Germany', 'France', 'India'];
    const ageRanges = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

    let segmentIndex = 1;

    for (let i = 0; i < config.audienceSegments; i++) {
      const user = this.users[i % this.users.length];
      const segment: AudienceSegment = {
        id: uuidv4(),
        user_id: user.id,
        name: `Segment ${segmentIndex}: ${interests[i % interests.length]} audience`,
        criteria: {
          interests: [
            interests[i % interests.length],
            interests[(i + 1) % interests.length],
          ],
          locations: [locations[i % locations.length]],
          age_range: ageRanges[Math.floor(Math.random() * ageRanges.length)],
          engagement_level: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
          followers_min: Math.floor(Math.random() * 1000),
          followers_max: Math.floor(Math.random() * 100000 + 10000),
        },
        size: Math.floor(Math.random() * 50000 + 1000),
        created_at: new Date(),
      };

      // Using a generic audit_events table or creating segments in campaigns metadata
      // For now, we'll store as JSON in a theoretical audience_segments table
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS audience_segments (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          criteria TEXT NOT NULL,
          size INT NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `;

      try {
        await this.pool.query(createTableSQL);
      } catch {
        // Table might already exist
      }

      await this.pool.query(
        `INSERT INTO audience_segments (id, user_id, name, criteria, size, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
        [segment.id, segment.user_id, segment.name, JSON.stringify(segment.criteria), segment.size, segment.created_at],
      );

      segmentIndex++;
    }

    console.log(`✓ Created ${config.audienceSegments} audience segments`);
  }

  async generateABTests(): Promise<void> {
    console.log('\n🧪 Generating A/B tests...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ab_tests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        campaign_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
        variant_a_id VARCHAR(255) NOT NULL,
        variant_b_id VARCHAR(255) NOT NULL,
        metric_type VARCHAR(50) NOT NULL,
        winner VARCHAR(10),
        confidence_score DECIMAL(5, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        completed_at TIMESTAMP,
        results_a TEXT,
        results_b TEXT
      );
    `;

    try {
      await this.pool.query(createTableSQL);
    } catch {
      // Table might already exist
    }

    let testIndex = 1;

    for (const user of this.users) {
      const userCampaigns = this.campaigns.filter((c) => c.user_id === user.id);

      for (let i = 0; i < Math.min(config.abTestsPerUser, userCampaigns.length); i++) {
        const campaign = userCampaigns[i];
        const variantAViews = Math.floor(Math.random() * 5000 + 1000);
        const variantAEngagement = Math.floor(variantAViews * (Math.random() * 0.15 + 0.03));
        const variantBViews = Math.floor(Math.random() * 5000 + 1000);
        const variantBEngagement = Math.floor(variantBViews * (Math.random() * 0.15 + 0.03));

        const test: ABTest = {
          id: uuidv4(),
          user_id: user.id,
          campaign_id: campaign.id,
          variant_a_id: `variant-a-${testIndex}`,
          variant_b_id: `variant-b-${testIndex}`,
          metric_type: 'engagement_rate',
          winner: variantAEngagement / variantAViews > variantBEngagement / variantBViews ? 'a' : 'b',
          confidence_score: Math.random() * 0.4 + 0.6, // 60-100%
          created_at: new Date(campaign.created_at),
        };

        const resultsA = {
          views: variantAViews,
          engagement: variantAEngagement,
          engagement_rate: ((variantAEngagement / variantAViews) * 100).toFixed(2),
          clicks: Math.floor(variantAViews * 0.05),
        };

        const resultsB = {
          views: variantBViews,
          engagement: variantBEngagement,
          engagement_rate: ((variantBEngagement / variantBViews) * 100).toFixed(2),
          clicks: Math.floor(variantBViews * 0.05),
        };

        await this.pool.query(
          `INSERT INTO ab_tests (id, user_id, campaign_id, variant_a_id, variant_b_id, metric_type, winner, confidence_score, created_at, completed_at, results_a, results_b)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           ON CONFLICT (id) DO NOTHING`,
          [
            test.id,
            test.user_id,
            test.campaign_id,
            test.variant_a_id,
            test.variant_b_id,
            test.metric_type,
            test.winner,
            test.confidence_score,
            test.created_at,
            new Date(),
            JSON.stringify(resultsA),
            JSON.stringify(resultsB),
          ],
        );

        testIndex++;
      }
    }

    console.log(`✓ Created ${testIndex - 1} A/B tests`);
  }

  async generateROIData(): Promise<void> {
    console.log('\n💰 Generating ROI and conversion data...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS campaign_roi (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        campaign_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        cost_usd DECIMAL(10, 2) NOT NULL,
        revenue_usd DECIMAL(10, 2),
        conversions INT DEFAULT 0,
        conversion_rate DECIMAL(5, 2),
        roi_percent DECIMAL(7, 2),
        cac_usd DECIMAL(10, 2),
        ltv_usd DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

    try {
      await this.pool.query(createTableSQL);
    } catch {
      // Table might already exist
    }

    for (const campaign of this.campaigns) {
      const costUsd = Math.random() * 500 + 50;
      const conversions = Math.floor(Math.random() * 50 + 5);
      const revenuePerConversion = Math.random() * 150 + 20;
      const revenueUsd = conversions * revenuePerConversion;
      const roiPercent = ((revenueUsd - costUsd) / costUsd) * 100;

      const roi = {
        id: uuidv4(),
        campaign_id: campaign.id,
        user_id: campaign.user_id,
        cost_usd: costUsd.toFixed(2),
        revenue_usd: revenueUsd.toFixed(2),
        conversions,
        conversion_rate: ((conversions / 1000) * 100).toFixed(2), // Assume ~1000 reached
        roi_percent: roiPercent.toFixed(2),
        cac_usd: (costUsd / conversions).toFixed(2),
        ltv_usd: (revenueUsd / conversions).toFixed(2),
        created_at: new Date(campaign.created_at),
      };

      await this.pool.query(
        `INSERT INTO campaign_roi (id, campaign_id, user_id, cost_usd, revenue_usd, conversions, conversion_rate, roi_percent, cac_usd, ltv_usd, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         ON CONFLICT (id) DO NOTHING`,
        [
          roi.id,
          roi.campaign_id,
          roi.user_id,
          roi.cost_usd,
          roi.revenue_usd,
          roi.conversions,
          roi.conversion_rate,
          roi.roi_percent,
          roi.cac_usd,
          roi.ltv_usd,
          roi.created_at,
        ],
      );
    }

    console.log(`✓ Created ROI data for ${this.campaigns.length} campaigns`);
  }

  async generateTrendData(): Promise<void> {
    console.log('\n📊 Generating trend detection data...');

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS trend_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        metric_name VARCHAR(255) NOT NULL,
        metric_value DECIMAL(10, 2),
        category VARCHAR(100),
        platform VARCHAR(50),
        date DATE NOT NULL,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(metric_name, platform, date, user_id)
      );
    `;

    try {
      await this.pool.query(createTableSQL);
    } catch {
      // Table might already exist
    }

    const metrics = [
      { name: 'average_engagement_rate', multiplier: 100 },
      { name: 'peak_posting_time', multiplier: 1 },
      { name: 'follower_growth_rate', multiplier: 1000 },
      { name: 'hashtag_reach', multiplier: 10000 },
    ];

    for (const user of this.users) {
      for (let daysAgo = 0; daysAgo < 30; daysAgo++) {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);

        for (const metric of metrics) {
          for (const platform of samplePlatforms) {
            const metricId = uuidv4();
            const value = Math.random() * metric.multiplier;

            await this.pool.query(
              `INSERT INTO trend_metrics (id, metric_name, metric_value, category, platform, date, user_id, created_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
               ON CONFLICT (metric_name, platform, date, user_id) DO NOTHING`,
              [
                metricId,
                metric.name,
                value.toFixed(2),
                'engagement',
                platform,
                date.toISOString().split('T')[0],
                user.id,
                new Date(),
              ],
            );
          }
        }
      }
    }

    console.log(`✓ Created trend metrics for ${this.users.length} users × 30 days`);
  }

  async run(): Promise<void> {
    try {
      await this.connect();

      console.log('\n🌱 FeedIA Production Seed Data Generator');
      console.log('=========================================\n');

      await this.generateUsers();
      await this.generateCampaigns();
      await this.generateAnalyticsEvents();
      await this.generateAudienceSegments();
      await this.generateABTests();
      await this.generateROIData();
      await this.generateTrendData();

      console.log('\n✅ Seed data generation completed successfully!');
      console.log(`
Summary:
  • Users: ${this.users.length}
  • Campaigns: ${this.campaigns.length}
  • Analytics Events: ${this.campaigns.length * config.analyticsEventsPerCampaign}
  • Audience Segments: ${config.audienceSegments}
  • A/B Tests: ${this.users.length * config.abTestsPerUser}
  • ROI Data: ${this.campaigns.length}
  • Trend Metrics: ${this.users.length * 30 * 4 * 3} (users × days × metrics × platforms)
      `);

      console.log('Verify data with queries like:');
      console.log('  SELECT COUNT(*) FROM users;');
      console.log('  SELECT COUNT(*) FROM carousels;');
      console.log('  SELECT COUNT(*) FROM carousel_analytics;');
      console.log('  SELECT COUNT(*) FROM carousel_metrics_daily;');
      console.log('  SELECT COUNT(*) FROM audience_segments;');
      console.log('  SELECT COUNT(*) FROM ab_tests;');
      console.log('  SELECT COUNT(*) FROM campaign_roi;');
    } catch (err) {
      console.error('❌ Seed generation failed:', err instanceof Error ? err.message : err);
      process.exit(1);
    } finally {
      await this.pool.end();
    }
  }
}

// Run seed generator
const databaseUrl = config.databaseUrl;
if (!databaseUrl) {
  console.error('❌ DATABASE_URL or DATABASE_PRIVATE_URL environment variable not set');
  process.exit(1);
}

const generator = new FeedIASeedGenerator(databaseUrl);
generator.run().catch(console.error);
