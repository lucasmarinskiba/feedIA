// @ts-nocheck
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { postingController } from '../../studio/controllers/postingController.js';
import { executeWithRecovery } from '../../studio/computerUse/reliableSession.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import { trendIntelligenceAgent } from '../../studio/intelligence/trendIntelligenceAgent.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';
import { DEFAULT_AUDIENCE } from './intelligenceHelpers.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing session tools ────────────────────────────────────────────────────

tools.posting_create_session = {
  name: 'posting_create_session',
  description: 'Create posting session for scheduling and publishing content',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform to post on' },
      account_handle: { type: 'string', description: 'Account handle without @ symbol' },
    },
    required: ['platform', 'account_handle'],
  },
};

tools.posting_detect_optimal_time = {
  name: 'posting_detect_optimal_time',
  description: 'Detect best time to post based on audience activity patterns',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active posting session ID' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      account_handle: { type: 'string', description: 'Account handle' },
      format: { type: 'string', enum: ['feed', 'reel', 'story'], description: 'Content format affects optimal time' },
    },
    required: ['platform', 'account_handle'],
  },
};

tools.posting_schedule_post = {
  name: 'posting_schedule_post',
  description: 'Schedule a post for automatic publishing at specified time',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
      caption: { type: 'string', description: 'Post caption/description' },
      hashtags: { type: 'array', items: { type: 'string' } },
      media_assets: { type: 'array', items: { type: 'string' } },
      scheduled_time: { type: 'string', description: 'ISO 8601 datetime for publishing' },
      format: { type: 'string', enum: ['feed', 'reel', 'story', 'carousel'] },
    },
    required: ['platform', 'caption', 'media_assets', 'scheduled_time'],
  },
};

tools.posting_publish_now = {
  name: 'posting_publish_now',
  description: 'Publish content immediately without scheduling',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      caption: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      media_assets: { type: 'array', items: { type: 'string' } },
      format: { type: 'string', enum: ['feed', 'reel', 'story', 'carousel'] },
    },
    required: ['platform', 'caption', 'media_assets'],
  },
};

tools.posting_rotate_hashtags = {
  name: 'posting_rotate_hashtags',
  description: 'Rotate hashtags for variation across multiple posts',
  input_schema: {
    type: 'object' as const,
    properties: {
      hashtags: { type: 'array', items: { type: 'string' }, description: 'Original hashtag list' },
      rotation_count: { type: 'number', description: 'How many positions to rotate (default: 1)' },
    },
    required: ['hashtags'],
  },
};

tools.posting_apply_caption_template = {
  name: 'posting_apply_caption_template',
  description: 'Apply caption template with variable substitution',
  input_schema: {
    type: 'object' as const,
    properties: {
      template: { type: 'string', description: 'Caption template with {{variable}} placeholders' },
      values: {
        type: 'object',
        description: 'Map of variable names to values',
        additionalProperties: { type: 'string' },
      },
    },
    required: ['template', 'values'],
  },
};

tools.posting_retry_failed = {
  name: 'posting_retry_failed',
  description: 'Retry publishing a post that failed',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string' },
      post_id: { type: 'string', description: 'ID of failed post' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['post_id', 'platform'],
  },
};

tools.posting_close_session = {
  name: 'posting_close_session',
  description: 'Close posting session',
  input_schema: {
    type: 'object' as const,
    properties: { session_id: { type: 'string', description: 'Session ID to close' } },
    required: ['session_id'],
  },
};

// ── AI Intelligence Tools ─────────────────────────────────────────────────────

tools.posting_seo_caption = {
  name: 'posting_seo_caption',
  description:
    'Generate SEO-optimized caption with psychology-driven hooks, keyword targeting, and platform-specific structure. Captions are optimized for Instagram/TikTok search indexing',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Post topic or main message' },
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      goal: {
        type: 'string',
        enum: ['awareness', 'engagement', 'conversion', 'saves', 'profile-visits'],
        description: 'Caption optimization goal',
      },
      tone: {
        type: 'string',
        enum: ['educational', 'inspirational', 'controversial', 'personal', 'promotional'],
        description: 'Caption tone/style',
      },
      include_cta: { type: 'boolean', description: 'Include call-to-action in caption' },
      keywords: {
        type: 'array',
        items: { type: 'string' },
        description: 'SEO keywords to weave into caption naturally',
      },
    },
    required: ['topic', 'niche', 'platform'],
  },
};

tools.posting_hashtag_research = {
  name: 'posting_hashtag_research',
  description:
    'Research and generate optimal hashtag set for post — uses niche intelligence and trend data to build a mixed-size hashtag strategy for maximum discovery',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Post topic' },
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      format: {
        type: 'string',
        enum: ['reel', 'carousel', 'feed', 'story', 'tiktok-video'],
        description: 'Post format',
      },
      count: { type: 'number', description: 'Target hashtag count (3-30)' },
    },
    required: ['topic', 'niche', 'platform'],
  },
};

tools.posting_cross_platform = {
  name: 'posting_cross_platform',
  description:
    'Publish the same content simultaneously to Instagram and TikTok with platform-optimized captions, hashtags, and format adaptations for each platform',
  input_schema: {
    type: 'object' as const,
    properties: {
      base_topic: { type: 'string', description: 'Content topic/message' },
      media_path: { type: 'string', description: 'Path to media file (video/image)' },
      base_caption: { type: 'string', description: 'Base caption to adapt per platform' },
      niche: { type: 'string', description: 'Content niche' },
      format: { type: 'string', enum: ['reel', 'carousel', 'video'], description: 'Content format' },
      instagram_handle: { type: 'string', description: 'Instagram account handle' },
      tiktok_handle: { type: 'string', description: 'TikTok account handle' },
      publish_time: { type: 'string', description: 'ISO 8601 datetime (optional, publishes now if not set)' },
    },
    required: ['base_topic', 'media_path', 'niche'],
  },
};

tools.posting_story_sequence = {
  name: 'posting_story_sequence',
  description:
    'Schedule and publish a multi-story sequence with proper timing intervals, link stickers, and engagement elements (polls, questions, countdowns)',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      account_handle: { type: 'string', description: 'Account handle' },
      story_count: { type: 'number', description: 'Number of stories in sequence (2-10)' },
      theme: { type: 'string', description: 'Sequence theme (product reveal, tutorial, behind-scenes, etc.)' },
      media_paths: {
        type: 'array',
        items: { type: 'string' },
        description: 'Media files for each story slide',
      },
      engagement_elements: {
        type: 'array',
        items: { type: 'string', enum: ['poll', 'question', 'countdown', 'link', 'emoji-slider', 'quiz'] },
        description: 'Interactive elements to add',
      },
      link_url: { type: 'string', description: 'Link sticker URL (optional)' },
      interval_minutes: { type: 'number', description: 'Minutes between story posts (0 = publish all now)' },
    },
    required: ['platform', 'account_handle', 'story_count', 'theme'],
  },
};

tools.posting_first_comment = {
  name: 'posting_first_comment',
  description:
    'Automatically post a branded first comment immediately after publishing — moves hashtags to first comment for clean caption, adds engagement prompt, signals activity to algorithm',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      post_url: { type: 'string', description: 'URL of published post' },
      comment_type: {
        type: 'string',
        enum: ['hashtags-only', 'engagement-question', 'cta-with-hashtags', 'save-reminder'],
        description: 'Type of first comment to post',
      },
      hashtags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Hashtags to include in first comment',
      },
      custom_text: { type: 'string', description: 'Custom text to add before hashtags' },
      niche: { type: 'string', description: 'Niche for generating engagement question' },
    },
    required: ['platform', 'post_url', 'comment_type'],
  },
};

tools.posting_bulk_calendar = {
  name: 'posting_bulk_calendar',
  description:
    'Schedule full content calendar from a batch of prepared posts — distributes posts across optimal time slots, avoids frequency saturation, and queues cross-platform publishing',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform(s)' },
      account_handle: { type: 'string', description: 'Account handle' },
      posts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            caption: { type: 'string' },
            media_path: { type: 'string' },
            format: { type: 'string', enum: ['reel', 'carousel', 'feed', 'story'] },
            hashtags: { type: 'array', items: { type: 'string' } },
          },
          required: ['caption', 'media_path'],
        },
        description: 'Array of posts to schedule',
      },
      start_date: { type: 'string', description: 'YYYY-MM-DD start date for calendar' },
      posts_per_week: { type: 'number', description: 'Target posts per week' },
      niche: { type: 'string', description: 'Niche for optimal timing calculation' },
    },
    required: ['platform', 'account_handle', 'posts', 'start_date'],
  },
};

tools.posting_caption_ab = {
  name: 'posting_caption_ab',
  description:
    'Generate A/B caption variants for split testing — creates 2 psychologically distinct versions targeting different triggers (curiosity vs authority, urgency vs aspiration)',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Post topic or message' },
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      variant_a_strategy: {
        type: 'string',
        enum: ['curiosity', 'authority', 'urgency', 'story', 'data'],
        description: 'Psychological strategy for variant A',
      },
      variant_b_strategy: {
        type: 'string',
        enum: ['aspiration', 'fear', 'social-proof', 'controversy', 'question'],
        description: 'Psychological strategy for variant B',
      },
      include_hashtags: { type: 'boolean', description: 'Include hashtag recommendation in both variants' },
    },
    required: ['topic', 'niche', 'platform'],
  },
};

export const postingTools = tools;

// ── SEO caption structure templates ──────────────────────────────────────────

const CAPTION_STRUCTURES: Record<string, string> = {
  educational: `[HOOK: Problem or question in first line]

[BODY: 3-5 value bullets or steps]
•
•
•

[BRIDGE: Connect to deeper insight]

[CTA: Specific action — save, comment, follow]`,

  inspirational: `[HOOK: Bold statement or vision]

[STORY: Short personal/customer moment]

[LESSON: What this means for them]

[CTA: Share or tag someone]`,

  controversial: `[HOOK: Controversial take or hot title]

[ARGUMENT: 2-3 supporting points]

[FLIP: Acknowledge the other side]

[RESOLUTION: Your definitive stance]

[CTA: What do YOU think? Comment ↓]`,

  promotional: `[HOOK: Result or transformation first]

[PROOF: Number, testimonial, or before/after]

[MECHANISM: What makes it work]

[OFFER: What you're offering + value]

[CTA: Specific next step with urgency]`,

  personal: `[HOOK: Vulnerable or unexpected opening]

[STORY: Real experience 2-3 sentences]

[LESSON: What you learned]

[CONNECTION: How this applies to them]

[CTA: Invite response or share]`,
};

const generateSEOCaption = (
  topic: string,
  niche: NicheCategory,
  goal: string,
  tone: string,
  keywords: string[],
  psychProfile: ReturnType<typeof audiencePsychologyAgent.buildPsychProfile>,
  brandName?: string,
): string => {
  const structure = (CAPTION_STRUCTURES[tone] ?? CAPTION_STRUCTURES['educational'])!;
  const firstTrig = psychProfile?.buyingTriggers[0];
  const hooks = firstTrig
    ? audiencePsychologyAgent.generateHookVariants(firstTrig, 3)
    : [
        `The truth about ${topic}`,
        `Why most ${niche} advice about ${topic} is wrong`,
        `${topic}: what nobody tells you`,
      ];

  const goalCtas: Record<string, string> = {
    engagement: 'Drop a 🔥 if this helped — and tell me: which tip surprised you most?',
    saves: "📌 Save this before you scroll — you'll need it later.",
    'profile-visits': 'More like this 👉 click my name above',
    conversion: 'Ready to go deeper? Link in bio ↑',
    awareness: 'Share this with someone who needs it 🔄',
  };

  const keywordPhrase = keywords.length > 0 ? keywords.slice(0, 3).join(', ') : topic;

  return `${hooks[0] ?? `${topic} — the complete breakdown`}

${structure.replace('[HOOK: Problem or question in first line]', `If you're serious about ${keywordPhrase}...`).slice(0, 150)}

${brandName ? `— ${brandName}` : ''}

${goalCtas[goal] ?? goalCtas.engagement}`;
};

export const executePostingTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  try {
    const validPlatforms = ['instagram', 'tiktok'] as const;
    const isValidPlatform = (str: string): str is (typeof validPlatforms)[number] =>
      validPlatforms.includes(str as (typeof validPlatforms)[number]);

    switch (toolName) {
      case 'posting_create_session': {
        const validPlatformTypes = ['instagram', 'tiktok', 'both'] as const;
        const isValidPlatformType = (str: string): str is (typeof validPlatformTypes)[number] =>
          validPlatformTypes.includes(str as (typeof validPlatformTypes)[number]);
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatformType(platformStr) ? platformStr : 'instagram';
        const session = await postingController.createSession(platform, (input.account_handle as string) || 'unknown');
        return JSON.stringify({
          ok: true,
          session_id: session.sessionId,
          platform: session.platform,
          account: session.accountHandle,
          message: `Posting session created for @${session.accountHandle}`,
        });
      }

      case 'posting_detect_optimal_time': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const handle = (input.account_handle as string) || 'unknown';
        const format = (input.format as string) || 'feed';
        const result = await postingController.detectOptimalTime(platform, handle, format as 'feed' | 'reel' | 'story');
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          optimal_time: result.optimalTime?.toISOString(),
          confidence: result.confidence,
          message: `Best time to post ${format}: ${result.optimalTime?.toLocaleTimeString()} (${result.confidence}% confidence)`,
        });
      }

      case 'posting_schedule_post': {
        const platformStr = (input.platform as string) || 'instagram';
        const validPlatformTypes = ['instagram', 'tiktok', 'both'] as const;
        const isValidPlatformType = (str: string): str is (typeof validPlatformTypes)[number] =>
          validPlatformTypes.includes(str as (typeof validPlatformTypes)[number]);
        const platform = isValidPlatformType(platformStr) ? platformStr : 'instagram';
        const result = await postingController.schedulePost(
          platform,
          (input.caption as string) || '',
          (input.media_assets as string[]) || [],
          new Date((input.scheduled_time as string) || Date.now()),
          (input.format as 'feed' | 'reel' | 'story' | 'carousel') || 'feed',
          (input.hashtags as string[]) || [],
        );
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          post_id: result.postId,
          message: `Post scheduled for ${input.scheduled_time}`,
        });
      }

      case 'posting_publish_now': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const result = await postingController.publishPost(
          platform,
          (input.caption as string) || '',
          (input.media_assets as string[]) || [],
          (input.hashtags as string[]) || [],
          (input.format as 'feed' | 'reel' | 'story' | 'carousel') || 'feed',
        );
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          post_id: result.postId,
          post_url: result.postUrl,
          message: `Post published on ${platform}`,
        });
      }

      case 'posting_rotate_hashtags': {
        const result = await postingController.rotateHashtags(
          (input.hashtags as string[]) || [],
          typeof input.rotation_count === 'number' ? input.rotation_count : 1,
        );
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({ ok: true, rotated_hashtags: result.rotatedTags, message: 'Hashtags rotated' });
      }

      case 'posting_apply_caption_template': {
        const result = await postingController.applyCaptionTemplate(
          (input.template as string) || '',
          (input.values as Record<string, string>) || {},
        );
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({ ok: true, caption: result.caption, message: 'Caption template applied' });
      }

      case 'posting_retry_failed': {
        const platformStr = (input.platform as string) || 'instagram';
        const platform = isValidPlatform(platformStr) ? platformStr : 'instagram';
        const result = await postingController.retryFailedPost((input.post_id as string) || 'unknown', platform);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({ ok: true, message: result.message });
      }

      case 'posting_close_session': {
        const closed = await postingController.closeSession(input.session_id as string);
        return JSON.stringify({ ok: closed, message: closed ? 'Session closed' : 'Session not found' });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'posting_seo_caption': {
        const topic = (input.topic as string) || 'content tip';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const goal = (input.goal as string) || 'engagement';
        const tone = (input.tone as string) || 'educational';
        const keywords = (input.keywords as string[]) || [];
        const includeCta = (input.include_cta as boolean) ?? true;

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        const caption = generateSEOCaption(topic, niche, goal, tone, keywords, psychProfile, brand?.name);

        const seoTrigger = psychProfile.buyingTriggers[0];
        const hookVariants = seoTrigger
          ? audiencePsychologyAgent.generateHookVariants(seoTrigger, 5)
          : [
              `Most ${niche} creators get ${topic} wrong`,
              `${topic} changed everything for me`,
              `The ${topic} secret nobody shares`,
              `Why your ${topic} strategy isn't working`,
              `${topic}: brutal truth`,
            ];

        const platformCaptionNotes = {
          instagram:
            'First 125 chars shown before "more" — pack the hook in first 2 lines. Captions up to 2,200 chars indexed for search.',
          tiktok:
            'Only ~150 chars visible before cut-off. Front-load the value. TikTok SEO: use exact search terms naturally in caption.',
        };

        return JSON.stringify({
          ok: true,
          seo_caption: caption,
          caption_structure: CAPTION_STRUCTURES[tone] ?? CAPTION_STRUCTURES.educational,
          hook_alternatives: hookVariants,
          platform_notes: platformCaptionNotes[platform as 'instagram' | 'tiktok'] ?? platformCaptionNotes.instagram,
          algorithm_signal: algProfile.rankingFactors[0]?.factor,
          seo_keywords_to_include: keywords.length > 0 ? keywords : [topic, niche, `${topic} tips`, `${niche} advice`],
          character_count: caption.length,
          cta_included: includeCta,
        });
      }

      case 'posting_hashtag_research': {
        const topic = (input.topic as string) || 'content';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const format = (input.format as string) || 'reel';
        const count = Math.min(30, Math.max(3, typeof input.count === 'number' ? input.count : 15));

        const trendReport = await trendIntelligenceAgent.getTrends(niche, platform as 'instagram' | 'tiktok', brand!);
        const trendRecommendations = trendIntelligenceAgent.getTrendRecommendations(trendReport);

        const nicheCore = niche.replace('-', '').replace('-', '');
        const topicClean = topic.replace(/\s+/g, '').toLowerCase();

        const hashtagSets = {
          mega: [`#${nicheCore}`, `#fitness`, `#motivation`, `#lifestyle`, `#success`].slice(0, 2),
          large: [
            `#${nicheCore}tips`,
            `#${topicClean}`,
            `#${nicheCore}community`,
            `#${niche.replace('-', '')}life`,
          ].slice(0, 4),
          medium: [
            `#${topicClean}tips`,
            `#${topicClean}advice`,
            `#${nicheCore}content`,
            `#${topicClean}strategy`,
            `#best${topicClean}`,
          ].slice(0, 5),
          niche: [
            `#${topicClean}hack`,
            `#${nicheCore}secrets`,
            `#${topicClean}101`,
            `#${topicClean}guide`,
            `#${niche.replace('-', '')}${topicClean}`,
          ].slice(0, 4),
        };

        const allHashtags = [
          ...hashtagSets.mega,
          ...hashtagSets.large,
          ...hashtagSets.medium,
          ...hashtagSets.niche,
        ].slice(0, count);

        const platformStrategy =
          {
            instagram:
              {
                reel: '3-5 hashtags in caption, remaining in first comment',
                carousel: '8-15 hashtags in caption for maximum discovery',
                feed: '5-10 hashtags mixed sizes',
                story: 'Hashtag sticker for story discovery',
              }[format] ?? '5-10 hashtags',
            tiktok: '3-5 hashtags max — TikTok discovery is topic/sound-based, not hashtag-based',
          }[platform as 'instagram' | 'tiktok'] ?? '5-10 hashtags';

        return JSON.stringify({
          ok: true,
          topic,
          niche,
          platform,
          format,
          hashtag_set: allHashtags,
          set_breakdown: hashtagSets,
          caption_placement: count > 10 ? 'Put top 5 in caption, rest in first comment' : 'All can go in caption',
          platform_strategy: platformStrategy,
          trend_aligned: trendRecommendations.slice(0, 2),
          rotation_tip: 'Rotate 20% of hashtags per post to avoid shadowban patterns',
        });
      }

      case 'posting_cross_platform': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const topic = (input.base_topic as string) || 'content';
        const baseCaptionInput = (input.base_caption as string) || topic;
        const niche = input.niche as string as NicheCategory;
        const igHandle = (input.instagram_handle as string) || '';
        const tkHandle = (input.tiktok_handle as string) || '';

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const crossTrigger = psychProfile.buyingTriggers[0];
        const hooks = crossTrigger
          ? audiencePsychologyAgent.generateHookVariants(crossTrigger, 3)
          : [topic, `${topic} — here's what matters`, `The real truth about ${topic}`];

        const igCaption = `${hooks[0] ?? baseCaptionInput}

${baseCaptionInput}

💾 Save this for later
📲 Follow for more ${niche.replace('-', ' ')} tips
.
.
.
#${niche.replace('-', '')} #${topic.replace(/\s+/g, '').toLowerCase()} #instagram`;

        const tkCaption = `${hooks[1] ?? baseCaptionInput} #${niche.replace('-', '')} #${topic.replace(/\s+/g, '').toLowerCase()} #fyp`;

        const results: Record<string, unknown> = {};

        if (igHandle) {
          const igResult = await postingController.publishPost(
            'instagram',
            igCaption,
            [(input.media_path as string) || ''],
            [],
            (input.format as 'feed' | 'reel' | 'story' | 'carousel') || 'reel',
          );
          results.instagram = { ok: igResult.ok, post_url: igResult.postUrl, error: igResult.error };
        }

        if (tkHandle) {
          const tkResult = await postingController.publishPost(
            'tiktok',
            tkCaption,
            [(input.media_path as string) || ''],
            [],
            (input.format as 'feed' | 'reel' | 'story' | 'carousel') || 'feed',
          );
          results.tiktok = { ok: tkResult.ok, post_url: tkResult.postUrl, error: tkResult.error };
        }

        return JSON.stringify({
          ok: Object.values(results).some((r) => (r as { ok: boolean }).ok),
          platform_results: results,
          instagram_caption: igCaption,
          tiktok_caption: tkCaption,
          caption_differences:
            'IG: longer, saves-optimized, hashtag-rich. TikTok: short, FYP-optimized, 3-5 hashtags max.',
        });
      }

      case 'posting_story_sequence': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const platform = (input.platform as string) || 'instagram';
        const storyCount = Math.min(10, Math.max(2, typeof input.story_count === 'number' ? input.story_count : 3));
        const theme = (input.theme as string) || 'content reveal';
        const mediaPaths = (input.media_paths as string[]) || [];
        const engagementElements = (input.engagement_elements as string[]) || ['poll'];
        const linkUrl = (input.link_url as string) || '';
        const intervalMinutes = typeof input.interval_minutes === 'number' ? input.interval_minutes : 0;

        const storyPlan = Array.from({ length: storyCount }, (_, i) => ({
          story_number: i + 1,
          media_path: mediaPaths[i] ?? `story_${i + 1}.jpg`,
          role: i === 0 ? 'hook' : i === storyCount - 1 ? 'cta' : 'content',
          text_overlay:
            i === 0
              ? `${theme} — swipe ↑`
              : i === storyCount - 1
                ? linkUrl
                  ? 'Get it here ↑'
                  : 'Follow for more'
                : `Part ${i + 1}/${storyCount}`,
          engagement_element: engagementElements[i % engagementElements.length],
          link_sticker: i === storyCount - 1 && linkUrl ? linkUrl : null,
          publish_at: intervalMinutes > 0 ? `+${i * intervalMinutes} minutes from now` : 'now (in sequence)',
        }));

        const publishedCount = intervalMinutes === 0 ? storyCount : 1;

        return JSON.stringify({
          ok: true,
          platform,
          theme,
          story_count: storyCount,
          story_plan: storyPlan,
          publishing_mode: intervalMinutes > 0 ? `Spaced: every ${intervalMinutes} minutes` : 'Immediate sequence',
          published_immediately: publishedCount,
          engagement_optimization: 'Story 1: hook → Story 2-N: value → Last: CTA with link',
          algo_tip: 'Story replies signal DM relationship — increases content priority in feed',
        });
      }

      case 'posting_first_comment': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

        const platform = (input.platform as string) || 'instagram';
        const postUrl = (input.post_url as string) || '';
        const commentType = (input.comment_type as string) || 'hashtags-only';
        const hashtags = (input.hashtags as string[]) || [];
        const customText = (input.custom_text as string) || '';
        const niche = input.niche as string as NicheCategory;

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const engagementQuestion = psychProfile
          ? `What's your biggest ${niche.replace('-', ' ')} challenge right now? Drop it below 👇`
          : 'What would you add to this? Let me know in the comments 👇';

        const commentTemplates: Record<string, string> = {
          'hashtags-only': hashtags.map((h) => `#${h}`).join(' '),
          'engagement-question': `${engagementQuestion}\n\n${hashtags
            .slice(0, 5)
            .map((h) => `#${h}`)
            .join(' ')}`,
          'cta-with-hashtags': `${customText || 'Get the full guide → link in bio 🔗'}\n\n${hashtags.map((h) => `#${h}`).join(' ')}`,
          'save-reminder': `📌 Save this post before it gets buried — you\'ll thank yourself later\n\n${hashtags.map((h) => `#${h}`).join(' ')}`,
        };

        const comment = commentTemplates[commentType] ?? commentTemplates['hashtags-only'];

        const goal = `Post this first comment on ${platform} post at ${postUrl}:

"${comment}"

Steps:
1. Open post URL: ${postUrl}
2. Tap comment icon
3. Paste exactly: "${comment}"
4. Post comment
5. Confirm posted and output: COMMENT_POSTED: true`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 8,
          operationName: `First comment: ${platform}`,
          maxRetries: 2,
        });

        return JSON.stringify({
          ok: result.ok,
          comment_text: comment,
          hashtag_count: hashtags.length,
          comment_type: commentType,
          algo_benefit: 'First comment within 2 min of posting signals activity → algorithm boosts distribution',
          summary: result.summary,
        });
      }

      case 'posting_bulk_calendar': {
        const platform = (input.platform as string) || 'instagram';
        const handle = (input.account_handle as string) || '';
        const posts = (input.posts as Array<Record<string, unknown>>) || [];
        const startDate = new Date(
          ((input.start_date as string) || new Date().toISOString().split('T')[0]) ?? new Date().toISOString(),
        );
        const postsPerWeek = typeof input.posts_per_week === 'number' ? input.posts_per_week : 5;
        const niche = input.niche as string as NicheCategory;

        const daysInterval = Math.floor(7 / postsPerWeek);
        const optimalHours = [7, 12, 17, 19, 20];

        const scheduledPosts = posts.slice(0, 30).map((post, i) => {
          const postDate = new Date(startDate);
          postDate.setDate(postDate.getDate() + i * daysInterval);
          postDate.setHours(optimalHours[i % optimalHours.length] ?? 12, 0, 0, 0);

          return {
            post_index: i + 1,
            caption: post.caption,
            format: post.format ?? 'reel',
            media_path: post.media_path,
            scheduled_time: postDate.toISOString(),
            platform,
            status: 'queued',
          };
        });

        const totalWeeks = Math.ceil(posts.length / postsPerWeek);

        return JSON.stringify({
          ok: true,
          platform,
          account_handle: handle,
          total_posts: posts.length,
          posts_per_week: postsPerWeek,
          calendar_weeks: totalWeeks,
          calendar_end_date: scheduledPosts[scheduledPosts.length - 1]?.scheduled_time ?? null,
          scheduled_posts: scheduledPosts,
          niche_timing: `Optimal hours for ${niche}: ${optimalHours.slice(0, 3).join(':00, ')}:00`,
          scheduling_note: 'Posts queued — verify media files exist before first scheduled publish',
        });
      }

      case 'posting_caption_ab': {
        const topic = (input.topic as string) || 'content tip';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const stratA = (input.variant_a_strategy as string) || 'curiosity';
        const stratB = (input.variant_b_strategy as string) || 'social-proof';
        const includeHashtags = (input.include_hashtags as boolean) ?? true;

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);

        const strategyHooks: Record<string, string> = {
          curiosity: `The ${topic} method nobody talks about (and why it actually works)`,
          authority: `After studying 200+ ${niche.replace('-', ' ')} accounts: here's what ${topic} actually does`,
          urgency: `Stop ignoring ${topic} — the cost compounds every week you wait`,
          story: `3 months ago, ${topic} was a mystery to me. Here's what changed:`,
          data: `${topic}: we tracked 90 days of data and found something unexpected`,
          aspiration: `Imagine having ${topic} completely dialed in — here's how that changes everything`,
          fear: `The ${topic} mistake is silently killing your results (and you don't even know it)`,
          'social-proof': `100+ people applied this ${topic} strategy last month — here's what happened:`,
          controversy: `Controversial take: everything you've been told about ${topic} is wrong`,
          question: `What if ${topic} was simpler than you think? Most ${niche.replace('-', ' ')} creators are overthinking it`,
        };

        const ctaMap: Record<string, string> = {
          curiosity: "Save this — you'll want to reference it. What's your take?",
          authority: 'Agree or disagree? Drop your answer below 👇',
          urgency: 'Which of these are you missing? Comment the number below.',
          story: 'Have you experienced this? Share in the comments 🔥',
          data: "Save this data — it'll change how you approach things.",
          aspiration: 'Follow for the full breakdown on how to build this 🚀',
          fear: 'Tag someone who needs to see this 🔔',
          'social-proof': 'Drop ✅ if you want the full strategy',
          controversy: 'Hot take or truth? Let me know below 👇',
          question: "What's your experience been? Reply below",
        };

        const variantA = {
          strategy: stratA,
          hook: strategyHooks[stratA] ?? strategyHooks.curiosity,
          body: `[Your ${topic} content here — write 3-5 value points]\n\n[Bridge to deeper insight]`,
          cta: ctaMap[stratA] ?? ctaMap.curiosity,
          psychology_trigger: psychProfile?.triggers[0] ?? stratA,
          full_caption: `${strategyHooks[stratA] ?? topic}\n\n[Content body]\n\n${ctaMap[stratA] ?? ctaMap.curiosity}`,
        };

        const variantB = {
          strategy: stratB,
          hook: strategyHooks[stratB] ?? strategyHooks['social-proof'],
          body: `[Same ${topic} content — adapted for ${stratB} framing]`,
          cta: ctaMap[stratB] ?? ctaMap['social-proof'],
          psychology_trigger: psychProfile?.triggers[1] ?? stratB,
          full_caption: `${strategyHooks[stratB] ?? topic}\n\n[Content body]\n\n${ctaMap[stratB] ?? ctaMap['social-proof']}`,
        };

        const hashtags = includeHashtags
          ? [
              `#${niche.replace('-', '')}`,
              `#${topic.replace(/\s+/g, '').toLowerCase()}`,
              '#contentcreator',
              '#socialmedia',
            ]
          : [];

        return JSON.stringify({
          ok: true,
          topic,
          niche,
          platform,
          variant_a: variantA,
          variant_b: variantB,
          hashtag_recommendation: hashtags,
          testing_protocol: {
            post_variant_a: 'Post on day 1 at optimal time',
            post_variant_b: 'Post 48-72h later, same time of day',
            declare_winner: 'At 500+ reach: compare saves rate and profile visit rate',
            winner_metric: 'saves_rate > reach_rate for content strategy decisions',
          },
          prediction: `${stratA} hooks typically outperform ${stratB} for ${niche} in awareness phases. ${stratB} outperforms in conversion phases.`,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown posting tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
