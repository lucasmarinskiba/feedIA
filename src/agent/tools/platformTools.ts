import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import {
  instagramNativePost,
  tiktokNativePost,
  tiktokStudioAutomate,
  instagramAdsCreate,
  tiktokAdsCreate,
  applyContentEffects,
} from '../../studio/computerUse/platformControllers.js';
import { executeWithRecovery } from '../../studio/computerUse/reliableSession.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';
import { DEFAULT_AUDIENCE } from './intelligenceHelpers.js';
interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing tools ────────────────────────────────────────────────────────────

tools.instagram_post_native = {
  name: 'instagram_post_native',
  description: 'Post directly to Instagram.com with full editor control',
  input_schema: {
    type: 'object' as const,
    properties: {
      media_path: { type: 'string', description: 'Path to image/video file' },
      caption: { type: 'string', description: 'Post caption' },
      hashtags: { type: 'array', items: { type: 'string' } },
    },
    required: ['media_path', 'caption'],
  },
};

tools.tiktok_post_native = {
  name: 'tiktok_post_native',
  description: 'Post directly to TikTok.com with native editor',
  input_schema: {
    type: 'object' as const,
    properties: {
      video_path: { type: 'string' },
      caption: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      is_private: { type: 'boolean', description: 'Private or public' },
    },
    required: ['video_path', 'caption'],
  },
};

tools.tiktok_studio_action = {
  name: 'tiktok_studio_action',
  description: 'TikTok Studio: upload, schedule, analytics, or promote',
  input_schema: {
    type: 'object' as const,
    properties: {
      action: { type: 'string', enum: ['upload', 'schedule', 'analytics', 'promote'] },
      params: { type: 'object', additionalProperties: true },
    },
    required: ['action'],
  },
};

tools.instagram_ads_create = {
  name: 'instagram_ads_create',
  description: 'Create Instagram ad campaign via Ads Manager',
  input_schema: {
    type: 'object' as const,
    properties: {
      campaign_type: { type: 'string', enum: ['awareness', 'traffic', 'conversions', 'engagement'] },
      budget: { type: 'number', description: 'Daily budget in USD' },
      duration_days: { type: 'number' },
      target_audience: { type: 'string', description: 'Audience definition' },
    },
    required: ['campaign_type', 'budget', 'duration_days'],
  },
};

tools.tiktok_ads_create = {
  name: 'tiktok_ads_create',
  description: 'Create TikTok ad campaign',
  input_schema: {
    type: 'object' as const,
    properties: {
      campaign_type: { type: 'string' },
      budget: { type: 'number' },
      target_audience: { type: 'string' },
    },
    required: ['campaign_type', 'budget'],
  },
};

tools.apply_content_effect = {
  name: 'apply_content_effect',
  description: 'Apply filter, text, sticker, or sound in platform editor',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      effect_type: { type: 'string', enum: ['filter', 'text', 'sticker', 'sound'] },
      params: { type: 'object', additionalProperties: true },
    },
    required: ['platform', 'effect_type'],
  },
};

// ── AI Intelligence Platform Tools ───────────────────────────────────────────

tools.instagram_reel_upload = {
  name: 'instagram_reel_upload',
  description:
    'Upload reel to Instagram with cover selection, audio, captions, and full metadata optimization — uses Computer Use for native Instagram reel upload flow',
  input_schema: {
    type: 'object' as const,
    properties: {
      video_path: { type: 'string', description: 'Path to video file' },
      cover_frame_timestamp: { type: 'number', description: 'Second to use as cover thumbnail' },
      caption: { type: 'string', description: 'Reel caption (SEO-optimized)' },
      hashtags: { type: 'array', items: { type: 'string' }, description: 'Hashtags (3-5 in caption)' },
      audio_name: { type: 'string', description: 'Trending audio name to search and apply (optional)' },
      share_to_feed: { type: 'boolean', description: 'Also share to main feed grid' },
      collab_account: { type: 'string', description: 'Handle to invite as collaborator (optional)' },
    },
    required: ['video_path', 'caption'],
  },
};

tools.instagram_story_sequence = {
  name: 'instagram_story_sequence',
  description:
    'Post a multi-story sequence on Instagram with interactive elements: polls, questions, link stickers, countdown timers, and emoji sliders — uses Computer Use for native story upload',
  input_schema: {
    type: 'object' as const,
    properties: {
      story_slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            media_path: { type: 'string' },
            text_overlay: { type: 'string' },
            interactive_element: {
              type: 'string',
              enum: ['none', 'poll', 'question', 'link', 'countdown', 'emoji-slider', 'quiz'],
            },
            interactive_params: { type: 'object', additionalProperties: true },
            link_url: { type: 'string' },
          },
          required: ['media_path'],
        },
        description: 'Story slides to upload in sequence',
      },
      close_friends_only: { type: 'boolean', description: 'Post to close friends only' },
      archive_highlight: { type: 'string', description: 'Highlight folder to add stories to after 24h' },
    },
    required: ['story_slides'],
  },
};

tools.tiktok_fyp_optimize = {
  name: 'tiktok_fyp_optimize',
  description:
    'Optimize TikTok post for FYP algorithm: select trending sound, optimize caption keywords, add FYP hashtags, set location tags, and configure algorithm-boosting settings before upload',
  input_schema: {
    type: 'object' as const,
    properties: {
      video_path: { type: 'string', description: 'Path to video file' },
      niche: { type: 'string', description: 'Content niche for FYP targeting' },
      caption: { type: 'string', description: 'Base caption to optimize' },
      trending_audio: { type: 'string', description: 'Trending audio name to apply (optional)' },
      location: { type: 'string', description: 'Location tag for local discovery (optional)' },
      schedule_time: {
        type: 'string',
        description: 'ISO 8601 for scheduled post (optional, publishes now if not set)',
      },
      allow_duet: { type: 'boolean', description: 'Allow duets (boosts discovery)' },
      allow_stitch: { type: 'boolean', description: 'Allow stitches (boosts discovery)' },
    },
    required: ['video_path', 'niche'],
  },
};

tools.tiktok_duet_stitch = {
  name: 'tiktok_duet_stitch',
  description:
    'Create a duet or stitch response to a trending TikTok video — uses Computer Use to open the source video and trigger the duet/stitch creation flow in TikTok Studio',
  input_schema: {
    type: 'object' as const,
    properties: {
      source_video_url: { type: 'string', description: 'URL of TikTok video to duet/stitch' },
      response_type: {
        type: 'string',
        enum: ['duet', 'stitch'],
        description: 'Duet (side-by-side) or Stitch (clip + response)',
      },
      response_video_path: { type: 'string', description: 'Path to your response video (optional for duet)' },
      response_caption: { type: 'string', description: 'Caption for your duet/stitch response' },
      stitch_seconds: { type: 'number', description: 'How many seconds of source to include in stitch (1-5)' },
    },
    required: ['source_video_url', 'response_type', 'response_caption'],
  },
};

tools.platform_engagement_monitor = {
  name: 'platform_engagement_monitor',
  description:
    'Monitor recent comments and DMs on Instagram or TikTok — fetches newest interactions, identifies engagement opportunities, flags comments needing response, and returns priority interaction queue',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform to monitor' },
      monitor_type: {
        type: 'string',
        enum: ['comments', 'dms', 'mentions', 'all'],
        description: 'What to monitor',
      },
      post_count: { type: 'number', description: 'Number of recent posts to check (default: 5)' },
      respond_to_questions: { type: 'boolean', description: 'Automatically identify unanswered questions' },
    },
    required: ['platform', 'monitor_type'],
  },
};

tools.platform_auto_reply = {
  name: 'platform_auto_reply',
  description:
    'Post automated replies to comments on Instagram or TikTok — uses brand voice templates and psychology-driven responses to engage followers, answer questions, and drive profile visits',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      post_url: { type: 'string', description: 'Post URL to reply on' },
      reply_strategy: {
        type: 'string',
        enum: ['engage-questions', 'thank-compliments', 'handle-objections', 'drive-to-bio', 'custom'],
        description: 'Reply strategy',
      },
      custom_replies: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            trigger_keyword: { type: 'string' },
            reply_text: { type: 'string' },
          },
        },
        description: 'Custom keyword → reply mappings (for custom strategy)',
      },
      niche: { type: 'string', description: 'Niche for context-aware reply generation' },
    },
    required: ['platform', 'post_url', 'reply_strategy'],
  },
};

tools.platform_profile_optimize = {
  name: 'platform_profile_optimize',
  description:
    'Optimize Instagram or TikTok profile: update bio with SEO keywords and psychological hooks, update profile photo guidance, optimize link in bio, and configure story highlights — returns optimization brief and executes changes via Computer Use',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform to optimize' },
      niche: { type: 'string', description: 'Content niche for SEO keyword optimization' },
      value_proposition: { type: 'string', description: 'What you help your audience achieve' },
      target_audience: { type: 'string', description: 'Who your content is for' },
      cta_link: { type: 'string', description: 'Link in bio URL' },
      cta_description: { type: 'string', description: 'What the link leads to (e.g., free guide, booking)' },
      highlight_categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Story highlight categories to create/update (Instagram only)',
      },
      execute_changes: {
        type: 'boolean',
        description: 'Actually execute changes via Computer Use (default: plan only)',
      },
    },
    required: ['platform', 'niche', 'value_proposition'],
  },
};

export const platformTools = tools;

export const executePlatformTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

  try {
    switch (toolName) {
      case 'instagram_post_native': {
        const result = await instagramNativePost(
          brand,
          (input.media_path as string) || '',
          (input.caption as string) || '',
          (input.hashtags as string[]) || [],
        );
        return JSON.stringify({ ok: result.ok, post_url: result.postUrl, duration_ms: result.durationMs });
      }

      case 'tiktok_post_native': {
        const result = await tiktokNativePost(
          brand,
          (input.video_path as string) || '',
          (input.caption as string) || '',
          (input.hashtags as string[]) || [],
          (input.is_private as boolean) || false,
        );
        return JSON.stringify({ ok: result.ok, video_url: result.videoUrl, duration_ms: result.durationMs });
      }

      case 'tiktok_studio_action': {
        const action = input.action as 'upload' | 'schedule' | 'analytics' | 'promote';
        const result = await tiktokStudioAutomate(brand, action, (input.params as Record<string, unknown>) || {});
        return JSON.stringify({ ok: result.ok, action, duration_ms: result.durationMs });
      }

      case 'instagram_ads_create': {
        const result = await instagramAdsCreate(
          brand,
          (input.campaign_type as 'awareness' | 'traffic' | 'conversions' | 'engagement') || 'awareness',
          (input.budget as number) || 100,
          (input.duration_days as number) || 7,
          (input.target_audience as string) || 'Broad',
        );
        return JSON.stringify({ ok: result.ok, campaign_id: result.campaignId, duration_ms: result.durationMs });
      }

      case 'tiktok_ads_create': {
        const result = await tiktokAdsCreate(
          brand,
          (input.campaign_type as string) || 'awareness',
          (input.budget as number) || 100,
          (input.target_audience as string) || 'Broad',
        );
        return JSON.stringify({ ok: result.ok, campaign_id: result.campaignId, duration_ms: result.durationMs });
      }

      case 'apply_content_effect': {
        const result = await applyContentEffects(
          brand,
          (input.platform as 'instagram' | 'tiktok') || 'instagram',
          (input.effect_type as 'filter' | 'text' | 'sticker' | 'sound') || 'filter',
          (input.params as Record<string, unknown>) || {},
        );
        return JSON.stringify({ ok: result.ok, duration_ms: result.durationMs });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'instagram_reel_upload': {
        const videoPath = (input.video_path as string) || '';
        const caption = (input.caption as string) || '';
        const hashtags = (input.hashtags as string[]) || [];
        const coverTimestamp = typeof input.cover_frame_timestamp === 'number' ? input.cover_frame_timestamp : 0;
        const audioName = (input.audio_name as string) || '';
        const shareToFeed = (input.share_to_feed as boolean) ?? true;
        const collabAccount = (input.collab_account as string) || '';

        const hashtagsStr = hashtags
          .slice(0, 5)
          .map((h) => `#${h}`)
          .join(' ');

        const goal = `Upload a Reel to Instagram with the following settings:

VIDEO: ${videoPath}
CAPTION: "${caption}

${hashtagsStr}"
COVER: Select frame at ${coverTimestamp}s
AUDIO: ${audioName ? `Search and apply trending audio: "${audioName}"` : 'Keep original audio'}
SHARE TO FEED: ${shareToFeed ? 'Yes' : 'No'}
COLLAB: ${collabAccount ? `Invite @${collabAccount} as collaborator` : 'No collab'}

STEPS:
1. Open instagram.com → Create → Reel
2. Upload video: ${videoPath}
3. Select cover frame at ${coverTimestamp}s
4. ${audioName ? `Add audio: search "${audioName}"` : 'Keep original audio'}
5. Add caption with hashtags (shown above)
6. ${collabAccount ? `Add collaborator: @${collabAccount}` : 'Skip collaborator'}
7. ${shareToFeed ? 'Enable "Share to feed"' : 'Uncheck "Share to feed"'}
8. Post the reel
9. Output: REEL_URL: [url]`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 20,
          operationName: 'Instagram reel upload',
          maxRetries: 2,
        });

        const urlMatch = result.summary.match(/REEL_URL:\s*(https?:\/\/[^\s]+)/);
        return JSON.stringify({
          ok: result.ok,
          reel_url: urlMatch?.[1] ?? null,
          cover_timestamp: coverTimestamp,
          audio_applied: audioName || 'original',
          summary: result.summary,
        });
      }

      case 'instagram_story_sequence': {
        const slides = (input.story_slides as Array<Record<string, unknown>>) || [];
        const closeFriendsOnly = (input.close_friends_only as boolean) ?? false;
        const archiveHighlight = (input.archive_highlight as string) || '';

        const slideGoals = slides
          .map((slide, i) => {
            const interactive = (slide.interactive_element as string) ?? 'none';
            const interactiveInstruction =
              interactive === 'poll'
                ? `Add poll: "${String((slide.interactive_params && (slide.interactive_params as Record<string, unknown>).question) ?? 'Which one?')}" with options`
                : interactive === 'question'
                  ? 'Add question sticker'
                  : interactive === 'link'
                    ? `Add link sticker → ${String(slide.link_url ?? '')}`
                    : interactive === 'countdown'
                      ? 'Add countdown sticker'
                      : '';
            return `SLIDE ${i + 1}: Upload "${String(slide.media_path ?? '')}"${slide.text_overlay ? ` → Add text: "${String(slide.text_overlay)}"` : ''}${interactiveInstruction ? ` → ${interactiveInstruction}` : ''}`;
          })
          .join('\n');

        const goal = `Post Instagram Story sequence (${slides.length} stories):

${slideGoals}

OPTIONS:
- Close friends only: ${closeFriendsOnly ? 'Yes' : 'No'}
- Archive to highlights: ${archiveHighlight ? `"${archiveHighlight}"` : 'No'}

STEPS:
1. Open instagram.com → Story camera
2. For each slide: upload media, add elements as specified
3. Post all slides in sequence
4. ${archiveHighlight ? `Archive to "${archiveHighlight}" highlight` : ''}
5. Output: STORIES_POSTED: ${slides.length}`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 15 + slides.length * 3,
          operationName: `Instagram story sequence (${slides.length} slides)`,
          maxRetries: 2,
        });

        return JSON.stringify({
          ok: result.ok,
          slides_posted: slides.length,
          close_friends: closeFriendsOnly,
          archived_to: archiveHighlight || null,
          interactive_elements: slides.filter((s) => s.interactive_element && s.interactive_element !== 'none').length,
          summary: result.summary,
        });
      }

      case 'tiktok_fyp_optimize': {
        const videoPath = (input.video_path as string) || '';
        const niche = input.niche as string as NicheCategory;
        const caption = (input.caption as string) || '';
        const trendingAudio = (input.trending_audio as string) || '';
        const location = (input.location as string) || '';
        const scheduleTime = (input.schedule_time as string) || '';
        const allowDuet = (input.allow_duet as boolean) ?? true;
        const allowStitch = (input.allow_stitch as boolean) ?? true;

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile('tiktok', niche);
        const topSignal = algProfile.rankingFactors[0];

        const fypHashtags = ['#fyp', '#foryou', '#foryoupage', `#${niche.replace('-', '')}`];
        const optimizedCaption = `${caption}\n\n${fypHashtags.join(' ')}`;

        const goal = `Upload and optimize TikTok video for FYP:

VIDEO: ${videoPath}
CAPTION: "${optimizedCaption}"
AUDIO: ${trendingAudio ? `Search and apply: "${trendingAudio}"` : 'Keep original (original audio gets extra reach)'}
LOCATION: ${location || 'Skip location tag'}
SCHEDULE: ${scheduleTime || 'Post now'}
ALLOW DUET: ${allowDuet ? 'Yes' : 'No'}
ALLOW STITCH: ${allowStitch ? 'Yes' : 'No'}

STEPS:
1. Open TikTok Studio (studio.tiktok.com)
2. Upload video: ${videoPath}
3. ${trendingAudio ? `Search sounds for "${trendingAudio}" and apply` : 'Keep original audio'}
4. Set caption with FYP hashtags
5. ${location ? `Add location: ${location}` : 'Skip location'}
6. Enable: Duet=${allowDuet}, Stitch=${allowStitch}
7. ${scheduleTime ? `Schedule for: ${scheduleTime}` : 'Post immediately'}
8. Output: VIDEO_URL: [url]

FYP PRIORITY: Optimize for "${topSignal?.factor ?? 'completion'}" — top ranking signal (${((topSignal?.weight ?? 0.35) * 100).toFixed(0)}%)`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 20,
          operationName: `TikTok FYP upload: ${niche}`,
          maxRetries: 2,
        });

        const urlMatch = result.summary.match(/VIDEO_URL:\s*(https?:\/\/[^\s]+)/);
        return JSON.stringify({
          ok: result.ok,
          video_url: urlMatch?.[1] ?? null,
          fyp_optimizations: {
            audio: trendingAudio || 'original',
            duet_enabled: allowDuet,
            stitch_enabled: allowStitch,
            hashtags_added: fypHashtags,
            top_algorithm_signal: topSignal?.factor,
          },
          summary: result.summary,
        });
      }

      case 'tiktok_duet_stitch': {
        const sourceUrl = (input.source_video_url as string) || '';
        const responseType = (input.response_type as string) || 'stitch';
        const responseCaption = (input.response_caption as string) || '';
        const stitch_secs = typeof input.stitch_seconds === 'number' ? input.stitch_seconds : 5;

        const goal = `Create a TikTok ${responseType} of: ${sourceUrl}

TYPE: ${responseType}
CAPTION: "${responseCaption}"
${responseType === 'stitch' ? `STITCH_SECONDS: ${stitch_secs} seconds from source` : 'DUET: Side-by-side layout'}

STEPS:
1. Open TikTok app/studio
2. Navigate to source video: ${sourceUrl}
3. Tap the "${responseType}" button (share menu → ${responseType})
4. ${responseType === 'stitch' ? `Select ${stitch_secs}s clip from source` : 'Set up side-by-side layout'}
5. Record or upload your response video
6. Add caption: "${responseCaption}"
7. Post and output: ${responseType.toUpperCase()}_URL: [url]`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 18,
          operationName: `TikTok ${responseType}`,
          maxRetries: 2,
        });

        const urlMatch = result.summary.match(/(?:DUET|STITCH)_URL:\s*(https?:\/\/[^\s]+)/i);
        return JSON.stringify({
          ok: result.ok,
          response_type: responseType,
          source_url: sourceUrl,
          response_url: urlMatch?.[1] ?? null,
          discovery_boost: `${responseType}s get 2-3x extra algorithmic distribution vs. original posts`,
          summary: result.summary,
        });
      }

      case 'platform_engagement_monitor': {
        const platform = (input.platform as string) || 'instagram';
        const monitorType = (input.monitor_type as string) || 'comments';
        const postCount = Math.min(10, typeof input.post_count === 'number' ? input.post_count : 5);
        const respondToQuestions = (input.respond_to_questions as boolean) ?? true;

        const goal = `Monitor ${monitorType} on ${platform}:

SCOPE: Last ${postCount} posts
FOCUS: ${respondToQuestions ? 'Identify all unanswered questions + engagement opportunities' : 'Log all new interactions'}

STEPS:
1. Open ${platform} account
2. Check last ${postCount} posts for new ${monitorType}
3. For each post, log:
   - New comments count
   - Questions needing response (marked with ?)
   - Positive feedback to amplify
   - Potential DM conversations
4. Output structured report:
TOTAL_INTERACTIONS: [n]
QUESTIONS_PENDING: [list]
HIGH_VALUE_COMMENTS: [list]
DM_OPPORTUNITIES: [list]`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 15,
          operationName: `Engagement monitor: ${platform}`,
          maxRetries: 1,
        });

        const totalMatch = result.summary.match(/TOTAL_INTERACTIONS:\s*(\d+)/);
        const questionsMatch = result.summary.match(/QUESTIONS_PENDING:\s*([^\n]+)/);

        return JSON.stringify({
          ok: result.ok,
          platform,
          monitor_type: monitorType,
          posts_checked: postCount,
          total_interactions: totalMatch ? parseInt(totalMatch[1] ?? '0') : null,
          questions_pending: questionsMatch?.[1]?.trim() ?? null,
          summary: result.summary,
          engagement_tip:
            'Reply within 30min of posting — early replies boost comment velocity and algorithm distribution',
        });
      }

      case 'platform_auto_reply': {
        const platform = (input.platform as string) || 'instagram';
        const postUrl = (input.post_url as string) || '';
        const replyStrategy = (input.reply_strategy as string) || 'engage-questions';
        const niche = input.niche as string as NicheCategory;
        const customReplies = (input.custom_replies as Array<{ trigger_keyword: string; reply_text: string }>) || [];

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const trustSignal = psychProfile?.psychographics.trustSignals[0] ?? 'results';

        const replyTemplates: Record<string, string[]> = {
          'engage-questions': [
            'Great question! [Answer]. Want me to go deeper on this? Let me know 👇',
            '[Answer in 1-2 sentences]. I actually covered this more in-depth in my [highlight/post] — check it out!',
          ],
          'thank-compliments': [
            "Thank you so much 🙏 This means a lot! More coming — make sure you're following for updates.",
            'Appreciate you! 🔥 This is exactly why I create this content. Save this post for later reference!',
          ],
          'handle-objections': [
            "I totally understand that concern! [Address objection]. Here's why it's actually easier than it looks:",
            "Valid point — and here's how I handle that: [Solution]. Does that help clarify?",
          ],
          'drive-to-bio': [
            `The full breakdown is in my bio link! [Value statement based on "${trustSignal}"] → Link above ↑`,
            'I made a free resource exactly for this — grab it in my bio! 🎯',
          ],
        };

        const strategyReplies: string[] = replyTemplates[replyStrategy] ?? replyTemplates['engage-questions'] ?? [];

        const goal = `Post replies to comments on ${platform} post: ${postUrl}

STRATEGY: ${replyStrategy}
NICHE CONTEXT: ${niche}

Reply templates to use:
1. "${strategyReplies[0] ?? 'Great question! Thanks for asking.'}"
2. "${strategyReplies[1] ?? 'Thanks for the comment!'}"
${customReplies.map((r, i) => `3${i + 1}. When comment contains "${r.trigger_keyword}": "${r.reply_text}"`).join('\n')}

STEPS:
1. Open post: ${postUrl}
2. Find comments matching the ${replyStrategy} pattern
3. Reply using appropriate template
4. Like all replied-to comments
5. Output: REPLIES_POSTED: [count]`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 15,
          operationName: `Auto reply: ${platform}`,
          maxRetries: 1,
        });

        const repliesMatch = result.summary.match(/REPLIES_POSTED:\s*(\d+)/);
        return JSON.stringify({
          ok: result.ok,
          platform,
          reply_strategy: replyStrategy,
          replies_posted: repliesMatch ? parseInt(repliesMatch[1] ?? '0') : null,
          templates_used: strategyReplies,
          summary: result.summary,
        });
      }

      case 'platform_profile_optimize': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const valueProp = (input.value_proposition as string) || 'help you grow';
        const targetAudience = (input.target_audience as string) || 'creators';
        const ctaLink = (input.cta_link as string) || '';
        const ctaDesc = (input.cta_description as string) || 'free resource';
        const highlights = (input.highlight_categories as string[]) || [];
        const execute = (input.execute_changes as boolean) ?? false;

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const desire = psychProfile?.psychographics.coreDesire ?? 'achieve results';

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        const nicheKeywords = niche.replace('-', ' ').split(' ');
        const bioTemplate =
          platform === 'instagram'
            ? `${nicheKeywords[0]?.charAt(0).toUpperCase()}${nicheKeywords[0]?.slice(1) ?? ''} ${nicheKeywords[1] ?? 'creator'} helping ${targetAudience} ${valueProp} 🔥
│
→ ${ctaDesc} ↓`
            : `${valueProp} for ${targetAudience} 🔥 ${niche.replace('-', ' ')} creator`;

        const seoKeywords = [
          niche,
          niche.replace('-', ' '),
          `${niche.replace('-', ' ')} coach`,
          `${niche.replace('-', ' ')} tips`,
        ];

        const optimizationPlan = {
          bio: bioTemplate,
          seo_keywords_in_bio: seoKeywords.slice(0, 3),
          link_in_bio: ctaLink,
          link_description: ctaDesc,
          profile_photo_note: 'Clear face shot (if personal brand) or clean logo. High contrast on small thumbnail.',
          username_note: `Include "${nicheKeywords[0] ?? niche}" keyword in username for search SEO`,
          highlights:
            platform === 'instagram'
              ? highlights.map((h, i) => ({
                  name: h,
                  cover_icon: `${h.toLowerCase()}-icon`,
                  suggested_stories: `Best ${h.toLowerCase()} content`,
                  order: i + 1,
                }))
              : null,
          algorithm_note: algProfile.boostSignals[0] ?? 'Post consistently for algorithm trust signals',
        };

        if (execute && ctaLink) {
          const goal = `Update ${platform} profile with optimized settings:

BIO: "${bioTemplate}"
LINK IN BIO: ${ctaLink}
${highlights.length > 0 && platform === 'instagram' ? `HIGHLIGHTS: Create/update: ${highlights.join(', ')}` : ''}

STEPS:
1. Open ${platform} account settings → Edit profile
2. Set bio to exactly: "${bioTemplate}"
3. Set link in bio to: ${ctaLink}
4. ${highlights.length > 0 ? `Create story highlights: ${highlights.join(', ')}` : 'Skip highlights'}
5. Save changes
6. Output: PROFILE_UPDATED: true`;

          const result = await executeWithRecovery(brand, {
            goal,
            maxIterations: 15,
            operationName: `Profile optimize: ${platform}`,
            maxRetries: 2,
          });

          return JSON.stringify({
            ok: result.ok,
            platform,
            executed: true,
            optimization_plan: optimizationPlan,
            summary: result.summary,
          });
        }

        return JSON.stringify({
          ok: true,
          platform,
          executed: false,
          optimization_plan: optimizationPlan,
          seo_impact: `Bio keywords "${seoKeywords[0]}" increase profile discovery in ${platform} search`,
          desire_alignment: `Bio triggers core desire: "${desire}"`,
          note: 'Set execute_changes: true to apply changes via Computer Use',
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown platform tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
