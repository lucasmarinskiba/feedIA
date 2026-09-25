import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import {
  instagramNativePost,
  tiktokNativePost,
  tiktokStudioAutomate,
  instagramAdsCreate,
  tiktokAdsCreate,
  applyContentEffects,
} from '../../studio/computerUse/platformControllers.js';
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

// Estos tools armaban un goal en lenguaje natural y se lo pasaban a
// executeWithRecovery()/runComputerUseSession() — Computer Use real (cursor +
// teclado vía la API de Claude) contra Instagram/TikTok, sin ningún chequeo
// de compliance — la publicación de contenido propio ya tiene un camino
// compliant real (integrations/uploadPost.ts, ver desktopWorkflows.ts), y
// like/reply automatizado en comentarios (platform_auto_reply) es
// automatización de engagement prohibida sin importar de quién sea el post.
// Ver platformControllers.ts para el mismo tratamiento en los tools que
// llaman ahí en vez de acá directamente.
const CU_DISABLED_REASON =
  'Automatización de Instagram/TikTok vía navegador (Computer Use) deshabilitada por riesgo de baneo de cuenta — no se ejecuta.';

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
        const coverTimestamp = typeof input.cover_frame_timestamp === 'number' ? input.cover_frame_timestamp : 0;
        const audioName = (input.audio_name as string) || '';

        return JSON.stringify({
          ok: false,
          reel_url: null,
          cover_timestamp: coverTimestamp,
          audio_applied: audioName || 'original',
          error: CU_DISABLED_REASON,
          note: 'Usá upload_to_social (integrations/uploadPost.ts) para publicar el reel vía la API oficial.',
        });
      }

      case 'instagram_story_sequence': {
        const slides = (input.story_slides as Array<Record<string, unknown>>) || [];
        const closeFriendsOnly = (input.close_friends_only as boolean) ?? false;
        const archiveHighlight = (input.archive_highlight as string) || '';

        // Stories con stickers interactivos (poll/quiz/link/countdown) no
        // existen en ninguna API oficial — publicarlas requeriría Computer
        // Use real, que quedó deshabilitado por riesgo de baneo. Un story
        // simple (sin stickers) SÍ puede ir por upload_to_social.
        return JSON.stringify({
          ok: false,
          slides_posted: 0,
          close_friends: closeFriendsOnly,
          archived_to: archiveHighlight || null,
          interactive_elements: slides.filter((s) => s.interactive_element && s.interactive_element !== 'none').length,
          error: CU_DISABLED_REASON,
          note: 'Para stories sin stickers interactivos, usá upload_to_social (mediaType: "story"). Con stickers, no hay automatización disponible — hacelo manualmente.',
        });
      }

      case 'tiktok_fyp_optimize': {
        const niche = input.niche as string as NicheCategory;
        const trendingAudio = (input.trending_audio as string) || '';
        const allowDuet = (input.allow_duet as boolean) ?? true;
        const allowStitch = (input.allow_stitch as boolean) ?? true;

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile('tiktok', niche);
        const topSignal = algProfile.rankingFactors[0];
        const fypHashtags = ['#fyp', '#foryou', '#foryoupage', `#${niche.replace('-', '')}`];

        return JSON.stringify({
          ok: false,
          video_url: null,
          fyp_optimizations: {
            audio: trendingAudio || 'original',
            duet_enabled: allowDuet,
            stitch_enabled: allowStitch,
            hashtags_added: fypHashtags,
            top_algorithm_signal: topSignal?.factor,
          },
          error: CU_DISABLED_REASON,
          note: 'Usá upload_to_social (mediaType: "reel", platform: "tiktok") para publicar vía la Content Posting API oficial.',
        });
      }

      case 'tiktok_duet_stitch': {
        const sourceUrl = (input.source_video_url as string) || '';
        const responseType = (input.response_type as string) || 'stitch';

        // Duet/stitch de un video AJENO vía Computer Use — automatización de
        // TikTok fuera de la API oficial, no soportada por ninguna Content
        // Posting API. No se ejecuta.
        return JSON.stringify({
          ok: false,
          response_type: responseType,
          source_url: sourceUrl,
          response_url: null,
          error: CU_DISABLED_REASON,
          note: 'Duet/stitch requiere la app de TikTok — no hay automatización disponible. Hacelo manualmente.',
        });
      }

      case 'platform_engagement_monitor': {
        const platform = (input.platform as string) || 'instagram';
        const monitorType = (input.monitor_type as string) || 'comments';
        const postCount = Math.min(10, typeof input.post_count === 'number' ? input.post_count : 5);

        // Ver comment-brain / dmInbox.ts / instagramActions.ts.procesarNotificaciones
        // para el camino real y compliant de leer comentarios/DMs. Esto
        // controlaba el navegador para hacer lo mismo sin ningún beneficio.
        return JSON.stringify({
          ok: false,
          platform,
          monitor_type: monitorType,
          posts_checked: postCount,
          total_interactions: null,
          questions_pending: null,
          error: CU_DISABLED_REASON,
          note: 'Usá ig_procesar_notificaciones (cuenta propia) o el sistema de Comment Brain / DM Inbox para esto.',
        });
      }

      case 'platform_auto_reply': {
        const platform = (input.platform as string) || 'instagram';
        const postUrl = (input.post_url as string) || '';
        const replyStrategy = (input.reply_strategy as string) || 'engage-questions';

        // Auto-reply + "like all replied-to comments" vía Computer Use —
        // automatización de engagement en comentarios sin chequeo de
        // compliance, rate limit ni disclosure de IA. Prohibido sin importar
        // de quién sea el post. Ver Comment Brain (capabilities/commentBrain)
        // para el sistema real con revisión humana.
        return JSON.stringify({
          ok: false,
          platform,
          reply_strategy: replyStrategy,
          replies_posted: null,
          error: CU_DISABLED_REASON,
          note: 'Usá el sistema de Comment Brain (capabilities/commentBrain) — respuestas con revisión humana, nunca auto-post + auto-like sin control.',
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

        // execute_changes ya no dispara Computer Use acá — instagramActions.ts
        // ya tiene editarPerfil() para esto (mismo tipo de acción, cuenta
        // propia, sin alternativa de API), revisado y con dryRun. Este tool
        // quedó como generador del plan de optimización solamente, para no
        // mantener dos caminos de automatización del mismo perfil.
        if (execute && ctaLink) {
          return JSON.stringify({
            ok: true,
            platform,
            executed: false,
            optimization_plan: optimizationPlan,
            note: 'No se ejecuta acá — usá editarPerfil (capabilities/computerUse/instagramActions.ts) con este plan.',
          });
        }

        return JSON.stringify({
          ok: true,
          platform,
          executed: false,
          optimization_plan: optimizationPlan,
          seo_impact: `Bio keywords "${seoKeywords[0]}" increase profile discovery in ${platform} search`,
          desire_alignment: `Bio triggers core desire: "${desire}"`,
          note: 'Plan only — no auto-execution here. Use editarPerfil (instagramActions.ts) to apply it.',
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
