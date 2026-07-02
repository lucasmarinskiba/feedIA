/**
 * Phase 11: Video Content Orchestrator
 *
 * Master orchestrator for video generation
 * Script → Scenes → Voiceover → Subtitles → Full video spec
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { generateVideoScript, type VideoScriptBrief } from './videoScriptGenerator.js';
import { generateSceneBreakdown } from './sceneBreakdownEngine.js';
import { generateVoiceoverTrack } from './voiceoverEngine.js';
import { generateSubtitles } from './subtitleGenerator.js';

export interface VideoBrief {
  topic: string;
  duration: 15 | 30 | 45 | 60;
  platform: 'tiktok' | 'reel' | 'youtube-short' | 'instagram-story';
  tone: string[];
  emotionalHook?: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  audience?: string;
}

export interface GeneratedVideo {
  id: string;
  topic: string;
  duration: number;
  platform: string;
  script: {
    hook: string;
    scenes: Array<{
      second: number;
      voiceover: string;
      visual: string;
    }>;
    cta: string;
    hashtags: string[];
  };
  visuals: {
    frames: number;
    transitions: string[];
    keyframes: Array<{second: number; action: string}>;
  };
  audio: {
    segments: number;
    totalDuration: number;
    voiceProfile: {gender: string; tone: string};
  };
  subtitles: {
    format: string;
    count: number;
    srtUrl?: string;
  };
  specs: {
    resolution: string;
    fps: number;
    bitrate: string;
    codec: string;
    format: string;
  };
  metadata: {
    generatedAt: string;
    emotion: string;
    retentionScore: number;
  };
}

export const generateVideoContent = async (
  brief: VideoBrief,
  brand?: BrandProfile,
): Promise<GeneratedVideo> => {
  log.info(`[Video Orchestrator] Starting ${brief.duration}s ${brief.platform} video: ${brief.topic}`);

  try {
    // Step 1: Generate script
    const scriptBrief: VideoScriptBrief = {
      topic: brief.topic,
      duration: brief.duration,
      tone: brief.tone,
      emotionalHook: brief.emotionalHook || 'curiosity',
      audience: brief.audience,
    };

    const script = await generateVideoScript(scriptBrief, brand);
    log.info(`[Video] ✓ Script generated: ${script.hook}`);

    // Step 2: Scene breakdown
    const sceneBreakdown = generateSceneBreakdown(script);
    log.info(`[Video] ✓ Scene breakdown: ${sceneBreakdown.totalFrames} frames`);

    // Step 3: Voiceover track
    const voiceoverTrack = generateVoiceoverTrack(script, {
      gender: brand?.voice?.tone?.includes('male') ? 'male' : 'female',
      tone: brief.tone[0] || 'energetic',
    });
    log.info(`[Video] ✓ Voiceover: ${voiceoverTrack.segments.length} segments`);

    // Step 4: Subtitles
    const subtitleTrack = generateSubtitles(voiceoverTrack);
    log.info(`[Video] ✓ Subtitles: ${subtitleTrack.subtitles.length} lines`);

    // Step 5: Compile specs
    const specs = getVideoSpecs(brief.platform, brief.duration);

    // Step 6: Retention score
    const retentionScore = calculateRetentionScore(script, brief.duration);

    const video: GeneratedVideo = {
      id: `video_${Date.now()}`,
      topic: brief.topic,
      duration: brief.duration,
      platform: brief.platform,
      script: {
        hook: script.hook,
        scenes: script.scenes,
        cta: script.cta,
        hashtags: script.hashtags,
      },
      visuals: {
        frames: sceneBreakdown.totalFrames,
        transitions: sceneBreakdown.transitions.map((t) => t.effect),
        keyframes: sceneBreakdown.frames.map((f) => ({
          second: f.second,
          action: f.action,
        })),
      },
      audio: {
        segments: voiceoverTrack.segments.length,
        totalDuration: voiceoverTrack.totalDuration,
        voiceProfile: {
          gender: voiceoverTrack.segments[0]?.voice.gender || 'female',
          tone: voiceoverTrack.segments[0]?.voice.tone || 'energetic',
        },
      },
      subtitles: {
        format: subtitleTrack.format,
        count: subtitleTrack.subtitles.length,
      },
      specs,
      metadata: {
        generatedAt: new Date().toISOString(),
        emotion: brief.emotionalHook || 'curiosity',
        retentionScore,
      },
    };

    log.info(`[Video Orchestrator] ✓ Complete ${brief.duration}s video spec generated`);
    return video;
  } catch (error) {
    log.error(`[Video Orchestrator] Error: ${error}`);
    throw error;
  }
};

const getVideoSpecs = (
  platform: string,
  duration: number,
): GeneratedVideo['specs'] => {
  const platformSpecs: Record<string, GeneratedVideo['specs']> = {
    tiktok: {
      resolution: '1080x1920',
      fps: 30,
      bitrate: '6-8 Mbps',
      codec: 'H.264',
      format: 'mp4',
    },
    reel: {
      resolution: '1080x1920',
      fps: 30,
      bitrate: '6-8 Mbps',
      codec: 'H.264',
      format: 'mp4',
    },
    'youtube-short': {
      resolution: '1440x2560',
      fps: 60,
      bitrate: '10-15 Mbps',
      codec: 'VP9',
      format: 'webm',
    },
    'instagram-story': {
      resolution: '1080x1920',
      fps: 30,
      bitrate: '6-8 Mbps',
      codec: 'H.264',
      format: 'mp4',
    },
  };

  return platformSpecs[platform] || platformSpecs.tiktok;
};

const calculateRetentionScore = (script: VideoScriptBrief, duration: number): number => {
  // Score based on hook strength, scene count, and CTA presence
  let score = 40; // Base

  // Hook bonus
  if (script.emotionalHook === 'curiosity') score += 15;
  if (script.emotionalHook === 'fear' || script.emotionalHook === 'joy') score += 12;

  // Scene variety bonus
  const sceneCount = Math.ceil(duration / 5);
  score += Math.min(sceneCount * 2, 25);

  // CTA bonus
  score += 10;

  // Duration efficiency
  if (duration <= 30) score += 5;

  return Math.min(100, score);
};
