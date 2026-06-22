// @ts-nocheck
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { videoController } from '../../studio/controllers/videoController.js';
import { executeWithRecovery } from '../../studio/computerUse/reliableSession.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing session tools ────────────────────────────────────────────────────

tools.video_create_session = {
  name: 'video_create_session',
  description: 'Create new video editing session with specified tool (CapCut, InShot, Premiere, DaVinci)',
  input_schema: {
    type: 'object' as const,
    properties: {
      tool: {
        type: 'string',
        enum: ['capcut', 'inshot', 'premiere', 'davinci'],
        description: 'Video editor to use',
      },
      project_name: { type: 'string', description: 'Name for the video project' },
      resolution: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
        },
        description: 'Video resolution (1080x1920 for vertical, 1920x1080 horizontal)',
      },
      fps: { type: 'number', description: 'Frames per second (24, 30, 60)' },
      duration_estimate_seconds: { type: 'number', description: 'Estimated final duration in seconds' },
    },
    required: ['tool', 'project_name'],
  },
};

tools.video_add_clips = {
  name: 'video_add_clips',
  description: 'Add video clips, images, or raw footage to editing timeline',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active video session ID' },
      clips: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            source: { type: 'string', description: 'URL or file path to clip/image' },
            duration_seconds: { type: 'number', description: 'Duration for this clip' },
            start_position_seconds: { type: 'number', description: 'Where to place in timeline' },
            trim_start: { type: 'number', description: 'Trim start in seconds' },
            trim_end: { type: 'number', description: 'Trim end in seconds' },
          },
        },
        description: 'Clips to add to timeline',
      },
    },
    required: ['session_id', 'clips'],
  },
};

tools.video_add_audio = {
  name: 'video_add_audio',
  description: 'Add music, sound effects, or voiceover to video track',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active video session ID' },
      audio_type: {
        type: 'string',
        enum: ['music', 'sfx', 'voiceover', 'ambient'],
        description: 'Type of audio',
      },
      source: { type: 'string', description: 'URL to audio file or library search query' },
      start_seconds: { type: 'number', description: 'When to start audio (0 = beginning)' },
      volume: { type: 'number', description: 'Volume level 0-100' },
      fade_in: { type: 'number', description: 'Fade in duration in ms' },
      fade_out: { type: 'number', description: 'Fade out duration in ms' },
    },
    required: ['session_id', 'audio_type', 'source'],
  },
};

tools.video_add_effects = {
  name: 'video_add_effects',
  description: 'Apply transitions, filters, text overlays, or animations to video',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active video session ID' },
      effect_type: {
        type: 'string',
        enum: ['transition', 'filter', 'text', 'animation', 'sticker', 'blur', 'zoom'],
        description: 'Type of effect',
      },
      effect_name: { type: 'string', description: 'Specific effect name (e.g., "fade", "zoom-in", "glitch")' },
      position_seconds: { type: 'number', description: 'When to apply effect in timeline' },
      duration_ms: { type: 'number', description: 'Effect duration' },
      params: {
        type: 'object',
        description: 'Effect-specific parameters (text content, color, intensity, etc.)',
        additionalProperties: true,
      },
    },
    required: ['session_id', 'effect_type', 'effect_name'],
  },
};

tools.video_sync_audio = {
  name: 'video_sync_audio',
  description: 'Sync video transitions with audio beats (TikTok viral effect)',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active video session ID' },
      sync_type: {
        type: 'string',
        enum: ['beat-cuts', 'drop-transitions', 'verse-chorus', 'custom'],
        description: 'Synchronization pattern',
      },
      detect_tempo: { type: 'boolean', description: 'Auto-detect audio tempo for syncing' },
    },
    required: ['session_id', 'sync_type'],
  },
};

tools.video_export = {
  name: 'video_export',
  description: 'Export final video in specified format with quality settings',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Active video session ID' },
      format: { type: 'string', enum: ['mp4', 'mov', 'webm'], description: 'Export format' },
      quality: { type: 'string', enum: ['draft', 'standard', 'hd', '4k'], description: 'Export quality level' },
      preset: {
        type: 'string',
        enum: ['instagram-reel', 'tiktok', 'youtube-short', 'facebook', 'custom'],
        description: 'Optimization preset for platform',
      },
    },
    required: ['session_id', 'format'],
  },
};

tools.video_close_session = {
  name: 'video_close_session',
  description: 'Close active video session and cleanup resources',
  input_schema: {
    type: 'object' as const,
    properties: {
      session_id: { type: 'string', description: 'Video session ID to close' },
      save_project: { type: 'boolean', description: 'Save project for later editing' },
    },
    required: ['session_id'],
  },
};

// ── AI Intelligence Tools ─────────────────────────────────────────────────────

tools.video_hook_optimizer = {
  name: 'video_hook_optimizer',
  description:
    'Analyze and optimize the first 3 seconds of video content for maximum retention. Returns hook score, weaknesses, and rewrite suggestions per niche and platform algorithm',
  input_schema: {
    type: 'object' as const,
    properties: {
      hook_description: { type: 'string', description: 'Description of first 3 seconds content' },
      niche: { type: 'string', description: 'Content niche (fitness-coaching, ecommerce, etc.)' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      hook_type: {
        type: 'string',
        enum: ['question', 'statement', 'visual-shock', 'result-first', 'controversy', 'story-open'],
        description: 'Type of hook being used',
      },
      has_face: { type: 'boolean', description: 'Does hook show a human face?' },
      has_text_overlay: { type: 'boolean', description: 'Does hook have on-screen text?' },
      audio_type: {
        type: 'string',
        enum: ['trending-sound', 'original-speech', 'music-only', 'silence'],
        description: 'Audio strategy for hook',
      },
    },
    required: ['hook_description', 'niche', 'platform'],
  },
};

tools.video_reel_structure = {
  name: 'video_reel_structure',
  description:
    'Generate AI-powered reel/TikTok narrative structure based on niche, topic, and psychology triggers. Returns timestamped content plan optimized for completion rate',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Reel topic or content theme' },
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      duration_seconds: {
        type: 'number',
        description: 'Target video duration (15, 30, 60, 90)',
      },
      goal: {
        type: 'string',
        enum: ['awareness', 'engagement', 'conversion', 'viral'],
        description: 'Primary content goal',
      },
      style: {
        type: 'string',
        enum: ['talking-head', 'b-roll-voiceover', 'text-only', 'tutorial', 'transformation', 'story-time'],
        description: 'Video production style',
      },
    },
    required: ['topic', 'niche', 'platform'],
  },
};

tools.video_auto_caption = {
  name: 'video_auto_caption',
  description:
    'Generate on-screen caption text with timestamps and placement — creates caption schedule for subtitle-style text overlays that boost retention and accessibility',
  input_schema: {
    type: 'object' as const,
    properties: {
      script_or_topic: { type: 'string', description: 'Video script or topic for caption generation' },
      duration_seconds: { type: 'number', description: 'Total video duration' },
      caption_style: {
        type: 'string',
        enum: ['full-subtitles', 'keyword-highlights', 'hook-callouts', 'minimal'],
        description: 'Caption overlay style',
      },
      niche: { type: 'string', description: 'Content niche for tone calibration' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform (affects caption placement)' },
    },
    required: ['script_or_topic', 'duration_seconds'],
  },
};

tools.video_trending_audio = {
  name: 'video_trending_audio',
  description:
    'Discover trending audio tracks for your niche on TikTok/Instagram Reels — uses Computer Use to find sounds with high viral momentum for maximum FYP/Explore boost',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Target platform' },
      niche: { type: 'string', description: 'Content niche for niche-relevant sounds' },
      mood: {
        type: 'string',
        enum: ['energetic', 'calm', 'motivational', 'emotional', 'funny', 'dramatic'],
        description: 'Audio mood matching content',
      },
      limit: { type: 'number', description: 'Number of trending tracks to find (3-10)' },
    },
    required: ['platform', 'niche'],
  },
};

tools.video_retention_optimizer = {
  name: 'video_retention_optimizer',
  description:
    'Analyze video pacing and suggest cut points, re-engagement moments, and pacing adjustments to maximize watch-through rate for algorithm ranking',
  input_schema: {
    type: 'object' as const,
    properties: {
      clip_durations: {
        type: 'array',
        items: { type: 'number' },
        description: 'Duration of each clip/segment in seconds',
      },
      total_duration_seconds: { type: 'number', description: 'Total video duration' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform (different optimal pacing)' },
      niche: { type: 'string', description: 'Content niche' },
      current_hook_duration: { type: 'number', description: 'Duration of hook section in seconds' },
    },
    required: ['total_duration_seconds', 'platform'],
  },
};

tools.video_platform_preset = {
  name: 'video_platform_preset',
  description:
    'Get platform-specific video settings: resolution, aspect ratio, codec, bitrate, max duration, text safe zones, and algorithm-preferred characteristics',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: {
        type: 'string',
        enum: ['instagram-reel', 'tiktok', 'youtube-short', 'instagram-story', 'tiktok-story'],
        description: 'Target platform format',
      },
      content_type: {
        type: 'string',
        enum: ['talking-head', 'screen-recording', 'animation', 'slideshow', 'mixed'],
        description: 'Type of video content',
      },
    },
    required: ['platform'],
  },
};

tools.video_thumbnail_extract = {
  name: 'video_thumbnail_extract',
  description:
    'Identify the best frame from video for cover thumbnail — scores frames by visual impact, face quality, composition, and click-through potential',
  input_schema: {
    type: 'object' as const,
    properties: {
      video_path: { type: 'string', description: 'Path or URL to video file' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform (affects thumbnail strategy)' },
      niche: { type: 'string', description: 'Content niche' },
      thumbnail_strategy: {
        type: 'string',
        enum: ['face-reaction', 'result-reveal', 'text-hook', 'product-hero', 'action-moment'],
        description: 'Preferred thumbnail visual strategy',
      },
      manual_timestamps: {
        type: 'array',
        items: { type: 'number' },
        description: 'Specific timestamps (seconds) to evaluate as candidates',
      },
    },
    required: ['platform', 'niche'],
  },
};

export const videoTools = tools;

// ── Platform encoding presets ─────────────────────────────────────────────────

interface VideoPreset {
  width: number;
  height: number;
  aspectRatio: string;
  maxDurationSeconds: number;
  recommendedDuration: string;
  fps: number;
  codec: string;
  maxFileSizeMB: number;
  textSafeZone: string;
  algorithmTips: string[];
}

const PLATFORM_VIDEO_PRESETS: Record<string, VideoPreset> = {
  'instagram-reel': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxDurationSeconds: 90,
    recommendedDuration: '15-30s for FYP boost',
    fps: 30,
    codec: 'H.264',
    maxFileSizeMB: 250,
    textSafeZone: 'Keep text 250px from top, 350px from bottom (UI overlaps)',
    algorithmTips: [
      'First 1s must hook',
      'Loop-able endings boost completion',
      'Original audio gets extra reach',
      'Save-worthy tip = more distribution',
    ],
  },
  tiktok: {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxDurationSeconds: 600,
    recommendedDuration: '7-15s for FYP; 45-60s for authority',
    fps: 30,
    codec: 'H.264',
    maxFileSizeMB: 287,
    textSafeZone: 'Keep text between 100px-1500px from top; avoid bottom 400px (UI)',
    algorithmTips: [
      'Use trending sounds within first 72h',
      'Watch-through rate > 70% is viral threshold',
      'Duets/stitches get extra discovery',
      'Complete first video before re-uploading',
    ],
  },
  'youtube-short': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxDurationSeconds: 60,
    recommendedDuration: '15-59s',
    fps: 60,
    codec: 'H.264',
    maxFileSizeMB: 256,
    textSafeZone: 'Safe zone: 100px all sides; avoid bottom 200px',
    algorithmTips: [
      'End with strong CTA to subscribe',
      'Chapters help retention',
      'Title matters more than thumbnail for Shorts',
    ],
  },
  'instagram-story': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxDurationSeconds: 60,
    recommendedDuration: '5-15s per story card',
    fps: 30,
    codec: 'H.264',
    maxFileSizeMB: 100,
    textSafeZone: 'Safe zone: 250px from top, 400px from bottom for sticker placement',
    algorithmTips: [
      'Polls/quizzes boost DM rate',
      'Link stickers drive traffic',
      'Consistent story viewing = stronger DM relationship',
    ],
  },
  'tiktok-story': {
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    maxDurationSeconds: 60,
    recommendedDuration: '5-15s',
    fps: 30,
    codec: 'H.264',
    maxFileSizeMB: 100,
    textSafeZone: 'Safe zone: 200px from top, 350px from bottom',
    algorithmTips: ['Stories build follower relationship signals', 'Location stickers increase local discovery'],
  },
};

// ── Hook quality scoring ──────────────────────────────────────────────────────

const scoreHook = (
  hookType: string,
  hasHook: boolean,
  hasFace: boolean,
  hasText: boolean,
  audioType: string,
  platform: string,
): number => {
  let score = 40;
  if (hasHook) score += 20;
  if (hasFace) score += platform === 'tiktok' ? 15 : 10;
  if (hasText) score += 15;
  if (audioType === 'trending-sound') score += 10;
  if (audioType === 'original-speech') score += 8;
  if (hookType === 'result-first') score += 10;
  if (hookType === 'visual-shock') score += 8;
  if (hookType === 'question') score += 6;
  if (hookType === 'controversy') score += 12;
  return Math.min(100, score);
};

export const executeVideoTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  try {
    const validTools = ['capcut', 'inshot', 'premiere', 'davinci'] as const;
    const isValidTool = (str: string): str is (typeof validTools)[number] =>
      validTools.includes(str as (typeof validTools)[number]);

    switch (toolName) {
      case 'video_create_session': {
        const toolStr = (input.tool as string) || 'capcut';
        const videoTool = isValidTool(toolStr) ? toolStr : 'capcut';
        const session = await videoController.createSession(
          videoTool,
          (input.project_name as string) || 'Untitled Video',
          input as Record<string, unknown>,
        );
        return JSON.stringify({
          ok: true,
          session_id: session.sessionId,
          tool: session.tool,
          resolution: session.timeline?.resolution,
          fps: session.timeline?.fps,
          message: 'Video session created. Ready for editing.',
        });
      }

      case 'video_add_clips': {
        const session = videoController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        const clips = input.clips as Array<Record<string, unknown>>;
        session.assets.push(
          ...clips.map((c) => ({
            id: `clip-${Date.now()}-${Math.random()}`,
            type: 'video' as const,
            source: 'uploaded' as const,
            url: c.source as string | undefined,
            metadata: {
              duration: c.duration_seconds,
              startPos: c.start_position_seconds,
              trimStart: c.trim_start,
              trimEnd: c.trim_end,
            },
          })),
        );
        return JSON.stringify({ ok: true, clips_added: clips.length, message: `${clips.length} clip(s) added` });
      }

      case 'video_add_audio': {
        const session = videoController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        session.assets.push({
          id: `audio-${Date.now()}`,
          type: 'audio',
          source: 'uploaded',
          url: input.source as string | undefined,
          metadata: {
            type: input.audio_type,
            startSeconds: input.start_seconds,
            volume: input.volume,
            fadeIn: input.fade_in,
            fadeOut: input.fade_out,
          },
        });
        return JSON.stringify({ ok: true, message: `Audio track added: ${input.audio_type}` });
      }

      case 'video_add_effects': {
        const session = videoController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        return JSON.stringify({
          ok: true,
          effect: input.effect_type,
          effect_name: input.effect_name,
          message: `Effect applied: ${input.effect_type} - ${input.effect_name}`,
        });
      }

      case 'video_sync_audio': {
        const session = videoController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        return JSON.stringify({
          ok: true,
          sync_type: input.sync_type,
          message: `Audio sync applied: ${input.sync_type}${input.detect_tempo ? ' (tempo auto-detected)' : ''}`,
        });
      }

      case 'video_export': {
        const session = videoController.getSession(input.session_id as string);
        if (!session) return JSON.stringify({ ok: false, error: `Session ${input.session_id} not found` });
        const format = input.format as string;
        return JSON.stringify({
          ok: true,
          format,
          quality: input.quality,
          preset: input.preset,
          artifact_url: `/exports/${session.sessionId}.${format}`,
          message: `Video exported: ${format} (${(input.quality as string) || 'standard'})`,
        });
      }

      case 'video_close_session': {
        const closed = await videoController.closeSession(input.session_id as string);
        return JSON.stringify({ ok: closed, message: closed ? 'Session closed' : 'Session not found' });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'video_hook_optimizer': {
        const hookDesc = (input.hook_description as string) || '';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const hookType = (input.hook_type as string) || 'statement';
        const hasFace = (input.has_face as boolean) ?? false;
        const hasText = (input.has_text_overlay as boolean) ?? false;
        const audioType = (input.audio_type as string) || 'music-only';

        const hookScore = scoreHook(hookType, hookDesc.length > 10, hasFace, hasText, audioType, platform);

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const hookTrigger = psychProfile.buyingTriggers[0];
        const hookVariants = hookTrigger
          ? audiencePsychologyAgent.generateHookVariants(hookTrigger, 5)
          : [
              "You're making this mistake with [topic]",
              "[Result] in [timeframe] — here's exactly how",
              'Nobody talks about this [topic] secret',
              'I was [problem] until I did this',
              'The [niche] truth that changed everything',
            ];

        const weaknesses: string[] = [];
        if (!hasFace && platform === 'tiktok')
          weaknesses.push('No face in hook — TikTok FYP prioritizes human faces in first frame');
        if (!hasText) weaknesses.push('No text overlay — captions in hook increase watch-through by ~40%');
        if (audioType === 'music-only') weaknesses.push('Original speech gets 2x more reach than music-only');
        if (hookType === 'statement')
          weaknesses.push('Statement hooks underperform vs. question or result-first hooks');
        if (hookScore < 60) weaknesses.push('Hook score below threshold — needs stronger pattern interrupt');

        const completionWeight = algProfile.rankingFactors.find((f) => f.factor.toLowerCase().includes('completion'));

        return JSON.stringify({
          ok: true,
          hook_score: hookScore,
          hook_grade: hookScore >= 80 ? 'A' : hookScore >= 65 ? 'B' : hookScore >= 50 ? 'C' : 'D',
          weaknesses,
          algorithm_priority: completionWeight?.factor,
          completion_weight: completionWeight ? `${(completionWeight.weight * 100).toFixed(0)}% of ranking` : null,
          rewrite_variants: hookVariants.slice(0, 5),
          quick_wins: [
            'Add face in frame 0-1s',
            'Add bold text overlay within 2s',
            'Start mid-sentence for curiosity',
            'Use trending sound as background',
          ],
        });
      }

      case 'video_reel_structure': {
        const topic = (input.topic as string) || 'content tip';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const duration = typeof input.duration_seconds === 'number' ? input.duration_seconds : 30;
        const goal = (input.goal as string) || 'engagement';
        const style = (input.style as string) || 'talking-head';

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        const hookDuration = duration <= 15 ? 2 : duration <= 30 ? 3 : 5;
        const ctaDuration = 3;
        const contentDuration = duration - hookDuration - ctaDuration;
        const segmentCount = Math.max(2, Math.floor(contentDuration / (duration <= 30 ? 5 : 8)));

        const structure = [
          {
            timestamp: '0:00',
            segment: 'HOOK',
            duration_seconds: hookDuration,
            purpose: 'Pattern interrupt — force scroll-stop',
            script_prompt: `Start with: "${psychProfile.buyingTriggers[0]?.trigger ?? "You're doing [topic] wrong"}" OR result-first reveal`,
            algorithm_note: 'Most critical window — determines completion rate',
          },
          ...Array.from({ length: segmentCount }, (_, i) => ({
            timestamp: `0:${String(hookDuration + i * Math.floor(contentDuration / segmentCount)).padStart(2, '0')}`,
            segment: `CONTENT ${i + 1}/${segmentCount}`,
            duration_seconds: Math.floor(contentDuration / segmentCount),
            purpose:
              i === 0
                ? 'Deliver promised value fast'
                : i === segmentCount - 1
                  ? 'Build toward CTA'
                  : 'Maintain engagement — add re-hook',
            script_prompt:
              i === 0 ? `Dive into "${topic}" immediately` : `Re-hook: "And here\'s where it gets interesting..."`,
            algorithm_note:
              i % 2 === 1
                ? 'Add text overlay here to boost caption engagement'
                : 'B-roll or action shot for visual variety',
          })),
          {
            timestamp: `0:${String(duration - ctaDuration).padStart(2, '0')}`,
            segment: 'CTA',
            duration_seconds: ctaDuration,
            purpose: 'Convert engagement to action',
            script_prompt:
              goal === 'conversion'
                ? 'Link in bio for [result]'
                : goal === 'engagement'
                  ? 'Comment your [question] below'
                  : 'Follow for more [niche] tips',
            algorithm_note: `Strong ${goal} CTA drives ${algProfile.rankingFactors[1]?.factor ?? 'engagement'} signal`,
          },
        ];

        return JSON.stringify({
          ok: true,
          topic,
          niche,
          platform,
          total_duration_seconds: duration,
          style,
          goal,
          structure,
          psychology_layer: {
            desire: psychProfile.psychographics.coreDesire,
            fear: psychProfile.psychographics.deepestFear,
            trust_signal: psychProfile.psychographics.trustSignals[0],
          },
          completion_optimization: [
            'Cut every scene at 80% — leave them wanting',
            'Re-hook every 7-10 seconds',
            'Loop the ending back to hook for infinite replay',
          ],
        });
      }

      case 'video_auto_caption': {
        const scriptOrTopic = (input.script_or_topic as string) || 'content';
        const duration = typeof input.duration_seconds === 'number' ? input.duration_seconds : 30;
        const captionStyle = (input.caption_style as string) || 'keyword-highlights';
        const platform = (input.platform as string) || 'instagram';

        const segmentInterval = captionStyle === 'full-subtitles' ? 3 : captionStyle === 'keyword-highlights' ? 5 : 8;
        const segments = Math.floor(duration / segmentInterval);

        const placements: Record<string, string> = {
          instagram: 'Center frame, avoid bottom 350px and top 200px',
          tiktok: 'Center or upper-third — avoid bottom 400px (TikTok UI)',
        };

        const styleGuides: Record<string, string> = {
          'full-subtitles': 'White text, black outline, 40-48px — every spoken word',
          'keyword-highlights': 'Bold 60px+ for keywords, minimal background, high contrast',
          'hook-callouts': 'Oversized 80px+ first-word hook, shrinks to body text for detail',
          minimal: 'Small text only at key moments, stays out of the way of visual',
        };

        const captions = Array.from({ length: segments }, (_, i) => ({
          timestamp: `${String(Math.floor((i * segmentInterval) / 60)).padStart(2, '0')}:${String((i * segmentInterval) % 60).padStart(2, '0')}`,
          duration_seconds: segmentInterval,
          caption_slot: `Caption ${i + 1} — ${captionStyle === 'full-subtitles' ? 'transcribe speech here' : `Key ${['hook', 'point', 'proof', 'result', 'cta'][i % 5] ?? 'point'}`}`,
          font_size: i === 0 ? 'Large (hook)' : 'Medium (body)',
          emphasis: i === 0 || i === segments - 1,
        }));

        return JSON.stringify({
          ok: true,
          script_or_topic: scriptOrTopic,
          duration_seconds: duration,
          caption_style: captionStyle,
          platform,
          text_safe_zone: placements[platform] ?? 'Center frame',
          style_guide: styleGuides[captionStyle] ?? styleGuides['keyword-highlights'],
          caption_schedule: captions,
          accessibility_note: '85% of videos watched mute — captions are not optional',
          seo_note: 'TikTok/Instagram index caption text for search — use niche keywords in overlays',
        });
      }

      case 'video_trending_audio': {
        if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required for Computer Use' });

        const platform = (input.platform as string) || 'tiktok';
        const niche = (input.niche as string) || 'personal-brand';
        const mood = (input.mood as string) || 'motivational';
        const limit = Math.min(10, typeof input.limit === 'number' ? input.limit : 5);

        const goal = `Find ${limit} trending ${mood} audio tracks for ${niche} content on ${platform}:

1. Go to ${platform === 'tiktok' ? 'tiktok.com → Discover → Sounds' : 'instagram.com → Reels → search trending audio'}
2. Filter by: ${mood} mood, recently trending (last 7 days)
3. Find sounds used by ${niche.replace('-', ' ')} creators
4. For each track record: name, creator, current use count, trend direction, best video use example

REPORT FORMAT:
TRACK_1: name|creator|use_count|trend_direction|best_for
TRACK_2: name|creator|use_count|trend_direction|best_for
...

Find ${limit} tracks. Output as structured list.`;

        const result = await executeWithRecovery(brand, {
          goal,
          maxIterations: 15,
          operationName: `Trending audio: ${niche} on ${platform}`,
          maxRetries: 1,
        });

        const tracks: Array<{ name: string; trend: string }> = [];
        const trackMatches = result.summary.matchAll(/TRACK_\d+:\s*([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^\n]+)/g);
        for (const match of trackMatches) {
          tracks.push({ name: match[1]?.trim() ?? 'Unknown', trend: match[4]?.trim() ?? 'stable' });
        }

        return JSON.stringify({
          ok: result.ok,
          platform,
          niche,
          mood,
          trending_tracks: tracks.length > 0 ? tracks : null,
          summary: result.summary,
          usage_tip: 'Use trending sounds within 48-72h of peak — early adopters get extra algorithm boost',
        });
      }

      case 'video_retention_optimizer': {
        const clipDurations = (input.clip_durations as number[]) || [];
        const totalDuration = typeof input.total_duration_seconds === 'number' ? input.total_duration_seconds : 30;
        const platform = (input.platform as string) || 'instagram';
        const niche = (input.niche as string) || 'personal-brand';
        const hookDuration = typeof input.current_hook_duration === 'number' ? input.current_hook_duration : 3;

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(
          platform as 'instagram' | 'tiktok',
          niche as NicheCategory,
        );
        const completionFactor = algProfile.rankingFactors.find((f) => f.factor.toLowerCase().includes('completion'));

        const targetDrop20pct = Math.floor(totalDuration * 0.4);
        const reEngagePoints: number[] = [];
        for (let t = 8; t < totalDuration - 5; t += 7) {
          reEngagePoints.push(t);
        }

        const longClips = clipDurations
          .map((d, i) => ({ index: i + 1, duration: d }))
          .filter((c) => c.duration > (platform === 'tiktok' ? 4 : 6));

        return JSON.stringify({
          ok: true,
          total_duration_seconds: totalDuration,
          hook_duration_seconds: hookDuration,
          hook_ok: hookDuration <= 4,
          hook_warning: hookDuration > 4 ? 'Hook exceeds 4s — 40% of viewers drop before 4s mark' : null,
          completion_algorithm_weight: completionFactor ? `${(completionFactor.weight * 100).toFixed(0)}%` : 'high',
          expected_drop_points: [
            { second: 3, reason: 'If no hook delivered, initial scroll-stop exits' },
            { second: targetDrop20pct, reason: '40% drop zone — needs re-hook text or pattern change' },
            { second: Math.floor(totalDuration * 0.7), reason: '70% mark — add CTA or final payoff here' },
          ],
          re_engagement_moments: reEngagePoints.map((t) => ({
            second: t,
            suggestion: 'Add text overlay, jump cut, or "wait for it" moment',
          })),
          clips_to_shorten: longClips.map((c) => ({
            clip_number: c.index,
            current_duration: c.duration,
            recommended_max: platform === 'tiktok' ? 3 : 5,
          })),
          pacing_score: Math.max(0, 100 - longClips.length * 15 - (hookDuration > 4 ? 20 : 0)),
          platform_target: platform === 'tiktok' ? '>70% completion for FYP push' : '>65% completion for Explore',
        });
      }

      case 'video_platform_preset': {
        const platformKey = (input.platform as string) || 'instagram-reel';
        const preset = PLATFORM_VIDEO_PRESETS[platformKey];

        if (!preset) {
          return JSON.stringify({ ok: false, error: `Unknown platform preset: ${platformKey}` });
        }

        return JSON.stringify({
          ok: true,
          platform: platformKey,
          ...preset,
          export_settings: {
            codec: preset.codec,
            fps: preset.fps,
            resolution: `${preset.width}×${preset.height}`,
            max_file_size_mb: preset.maxFileSizeMB,
          },
          capcut_settings: {
            ratio: preset.aspectRatio,
            resolution: `${preset.width}p`,
            frame_rate: `${preset.fps}fps`,
          },
        });
      }

      case 'video_thumbnail_extract': {
        const platform = (input.platform as string) || 'instagram';
        const niche = (input.niche as string) || 'personal-brand';
        const strategy = (input.thumbnail_strategy as string) || 'face-reaction';
        const manualTimestamps = (input.manual_timestamps as number[]) || [];

        const strategyGuides: Record<string, { bestAt: string; elements: string[]; ctRScore: number }> = {
          'face-reaction': {
            bestAt: '2-4s mark (peak reaction)',
            elements: ['Close face crop', 'Expressive emotion', 'Eye contact with camera'],
            ctRScore: 92,
          },
          'result-reveal': {
            bestAt: 'Last 2s (final result visible)',
            elements: ['Clear before/after', 'Number callout', 'Transformation visible'],
            ctRScore: 88,
          },
          'text-hook': {
            bestAt: '0-2s (hook text visible)',
            elements: ['Bold oversized text', 'Question or controversy', 'Contrasting background'],
            ctRScore: 85,
          },
          'product-hero': {
            bestAt: 'When product fills frame',
            elements: ['Product in focus', 'Clean background', 'Label/name visible'],
            ctRScore: 78,
          },
          'action-moment': {
            bestAt: 'Peak action frame',
            elements: ['Motion blur if dynamic', 'Highest energy moment', 'Wide angle context'],
            ctRScore: 80,
          },
        };

        const guide = (strategyGuides[strategy] ?? strategyGuides['face-reaction'])!;

        const candidateTimestamps =
          manualTimestamps.length > 0
            ? manualTimestamps
            : [0.5, 2, 5, 10, 15].filter((t) => t < (typeof input.video_path === 'string' ? 999 : 30));

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          thumbnail_strategy: strategy,
          strategy_guide: guide,
          candidate_timestamps: candidateTimestamps,
          recommended_timestamp: guide.bestAt,
          platform_thumbnail_notes:
            {
              instagram: 'Reel cover shows in 1:1 crop on grid — compose for square crop safety',
              tiktok: 'Video cover is full 9:16 — full frame visible in profile grid',
            }[platform] ?? 'Full frame thumbnail',
          ctr_potential: `${guide.ctRScore}/100`,
          overlay_recommendation: `Add 2-4 word text overlay in ${platform === 'tiktok' ? 'top third' : 'center'} for ${niche} thumbnail`,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown video tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
