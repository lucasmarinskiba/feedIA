/**
 * Phase 19: Smart Video Generator
 *
 * Uses Pinterest patterns to generate videos (TikTok/Reel/YouTube Short)
 * with: optimal duration, hook-first structure, retention-optimized scenes
 */

import { log } from '../../agent/logger.js';
import {
  selectColorPalette,
  selectNarrativeStructure,
  type PinterestPattern,
} from './pinterestPatternEncoder.js';

export interface VideoBrief {
  topic: string;
  emotion: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  platform: 'tiktok' | 'reel' | 'youtube-short' | 'instagram-story';
  duration?: 15 | 30 | 45 | 60; // seconds, auto-selected if not specified
  contentType?:
    | 'how-to'
    | 'story'
    | 'motivation'
    | 'entertainment'
    | 'educational'
    | 'review'
    | 'trend';
  hasAudio?: boolean; // TTS or voiceover
  subtitlesRequired?: boolean;
}

export interface VideoScene {
  second: number; // 0-based timestamp
  duration: number; // scene length in seconds
  visualType: 'hook' | 'transition' | 'action' | 'proof' | 'cta';
  voiceover: string;
  visualDescription: string;
  musicCue?: string;
  subtitleText?: string;
  retentionTrigger: string; // Why user keeps watching
}

export interface GeneratedVideo {
  id: string;
  topic: string;
  platform: string;
  duration: number;
  optimalDuration: boolean; // true = matches platform best practice
  hook: {
    text: string;
    duration: number; // First 2-3 seconds critical
    visualType: string;
  };
  scenes: VideoScene[];
  voiceoverScript: string;
  cta: {
    text: string;
    action: 'follow' | 'link' | 'dm' | 'save' | 'share';
    urgency?: string;
  };
  designSystem: {
    colorPalette: PinterestPattern;
    narrativeStructure: PinterestPattern;
  };
  metadata: {
    emotion: string;
    retentionCurve: number[]; // per-second retention %
    averageRetention: number;
    coherenceScore: number;
    engagementScore: number;
    estimatedReaches: string; // "Strong hook = likely to reach 50%+"
    generatedAt: string;
  };
}

// ── Optimal Duration per Platform ──────────────────────────────────────

const decideOptimalDuration = (platform: string, contentType?: string): number => {
  // Pinterest pattern: platform + content type determines best duration
  const platformDefaults: Record<string, number> = {
    tiktok: 30, // 30s = sweet spot for TikTok (can be 15-60)
    reel: 30, // 30s = Instagram sweet spot
    'youtube-short': 45, // 45s for YouTube Shorts (15-60 allowed)
    'instagram-story': 15, // 15s for stories
  };

  if (contentType === 'how-to') return 45; // Tutorials need more time
  if (contentType === 'entertainment') return 15; // Snappy content
  if (contentType === 'story') return 30; // Story sweet spot

  return platformDefaults[platform] || 30;
};

// ── Generate Video ─────────────────────────────────────────────────────

export const generateSmartVideo = async (brief: VideoBrief): Promise<GeneratedVideo> => {
  log.info(
    `[Smart Video] Generating ${brief.duration || 'optimal'}s ${brief.platform} video: "${brief.topic}"`,
  );

  const videoId = `video_${Date.now()}`;
  const duration = brief.duration || decideOptimalDuration(brief.platform, brief.contentType);

  // Select patterns
  const colorPalette = selectColorPalette(brief.topic, brief.emotion, 'youth');
  const narrativeStructure = selectNarrativeStructure(Math.ceil(duration / 6), brief.contentType); // ~6s per narrative beat

  log.info(
    `[Smart Video] Selected: ${duration}s duration, palette=${colorPalette.name}, narrative=${narrativeStructure.name}`,
  );

  // Generate hook (first 2-3 seconds CRITICAL)
  const hook = generateHook(brief.topic, brief.emotion, colorPalette);

  // Generate scenes
  const scenes = generateScenes(duration, brief.topic, brief.emotion, colorPalette, brief.contentType);

  // Generate voiceover script
  const voiceoverScript = generateVoiceoverScript(scenes);

  // Generate CTA
  const cta = generateCTA(brief.platform);

  // Calculate retention
  const retentionCurve = calculateVideoRetention(duration, hook.retentionScore);
  const averageRetention = Math.round(retentionCurve.reduce((a, b) => a + b, 0) / retentionCurve.length);

  // Score coherence
  const coherenceScore = scoreVideoCoherence(scenes, colorPalette);
  const engagementScore = scoreVideoEngagement(hook, scenes, cta);

  log.info(
    `[Smart Video] ✓ Generated ${duration}s video: ${scenes.length} scenes, retention=${averageRetention}%, engagement=${engagementScore}`,
  );

  return {
    id: videoId,
    topic: brief.topic,
    platform: brief.platform,
    duration,
    optimalDuration: true,
    hook,
    scenes,
    voiceoverScript,
    cta,
    designSystem: {
      colorPalette,
      narrativeStructure,
    },
    metadata: {
      emotion: brief.emotion,
      retentionCurve,
      averageRetention,
      coherenceScore,
      engagementScore,
      estimatedReaches:
        averageRetention > 70
          ? 'Strong hook & pacing = likely to reach 50%+ of viewers'
          : 'Moderate retention. Optimize hook or pacing.',
      generatedAt: new Date().toISOString(),
    },
  };
};

// ── Generate Hook (First 2-3 seconds) ──────────────────────────────────

interface HookData {
  text: string;
  duration: number;
  visualType: string;
  retentionScore: number; // 0-100
}

const generateHook = (topic: string, emotion: string, palette: PinterestPattern): HookData => {
  const hooks: Record<string, string[]> = {
    fear: [
      `Wait... you're doing this wrong`,
      `Stop. Don't waste money on...`,
      `This one mistake costs you...`,
    ],
    hope: [
      `I went from... to... and here's how`,
      `You won't believe what I just discovered`,
      `This changed everything for me`,
    ],
    joy: [
      `POV: You just realized...`,
      `This is the funniest thing ever`,
      `Wait for the plot twist`,
    ],
    curiosity: [
      `Nobody's talking about this`,
      `This is illegal in 3 countries`,
      `This is crazy, watch till the end`,
    ],
    anger: [
      `They've been LYING about this`,
      `Big companies don't want you to know`,
      `This SECRET they hide from you`,
    ],
  };

  const hookText = (hooks[emotion] ?? hooks.curiosity ?? [])[Math.floor(Math.random() * 3)] ?? '';

  return {
    text: hookText,
    duration: 3, // First 3 seconds = critical attention
    visualType: 'pattern-interrupt',
    retentionScore: 85, // Strong hook = 85% continue watching
  };
};

// ── Generate Scenes ───────────────────────────────────────────────────

const generateScenes = (
  duration: number,
  topic: string,
  emotion: string,
  palette: PinterestPattern,
  contentType?: string,
): VideoScene[] => {
  const scenes: VideoScene[] = [];

  // Scene 1: Hook (0-3s)
  scenes.push({
    second: 0,
    duration: 3,
    visualType: 'hook',
    voiceover: "Wait... you're doing this wrong",
    visualDescription: 'Pattern interrupt visual. Quick cut, high contrast colors from palette.',
    musicCue: 'upbeat-notification',
    subtitleText: 'WAIT...',
    retentionTrigger: 'Pattern interrupt. Must watch next.',
  });

  // Scene 2: Setup / Problem (3-6s or 3-9s)
  const setupDuration = duration <= 15 ? 3 : 6;
  scenes.push({
    second: 3,
    duration: setupDuration,
    visualType: 'transition',
    voiceover: `Most people do this without realizing... Here's the problem:`,
    visualDescription: `Show problem visually. Illustration or quick montage.`,
    musicCue: 'building-tension',
    subtitleText: 'THE PROBLEM',
    retentionTrigger: 'Relatable problem. Emotional connection. Must see solution.',
  });

  // Scene 3: Solution / Value (6-12s or 9-18s)
  const solutionStart = 3 + setupDuration;
  const solutionDuration = Math.min(6, duration - solutionStart - 3);
  if (solutionDuration > 0) {
    scenes.push({
      second: solutionStart,
      duration: solutionDuration,
      visualType: 'action',
      voiceover: "Here's what actually works...",
      visualDescription: 'Show solution in action. Step-by-step or before-after.',
      musicCue: 'positive-resolve',
      subtitleText: 'THE SOLUTION',
      retentionTrigger: 'Clear method. Actionable. Desire to implement.',
    });
  }

  // Scene 4: Proof / Result (12-15s or 18-27s)
  const proofStart = solutionStart + solutionDuration;
  const proofDuration = Math.min(4, duration - proofStart - 2);
  if (proofDuration > 0) {
    scenes.push({
      second: proofStart,
      duration: proofDuration,
      visualType: 'proof',
      voiceover: '87% of people saw results within...',
      visualDescription: 'Testimonial, stat, before-after, or case study.',
      musicCue: 'success-chime',
      subtitleText: 'PROOF',
      retentionTrigger: 'Social proof. FOMO. Credibility.',
    });
  }

  // Scene 5: CTA (last 2-3s)
  const ctaStart = proofStart + proofDuration;
  const ctaDuration = Math.max(2, duration - ctaStart);
  scenes.push({
    second: ctaStart,
    duration: ctaDuration,
    visualType: 'cta',
    voiceover: 'Follow for more tips. Link in bio for full guide.',
    visualDescription: 'CTA visual. Button, text overlay, social icons.',
    musicCue: 'upbeat-outro',
    subtitleText: 'FOLLOW FOR MORE',
    retentionTrigger: 'Clear next action. Low friction.',
  });

  return scenes;
};

// ── Generate Voiceover Script ──────────────────────────────────────────

const generateVoiceoverScript = (scenes: VideoScene[]): string => {
  return scenes.map((scene, i) => `[${scene.second}s - ${scene.duration}s] ${scene.voiceover}`).join('\n');
};

// ── Generate CTA ───────────────────────────────────────────────────────

const generateCTA = (
  platform: string,
): {
  text: string;
  action: 'follow' | 'link' | 'dm' | 'save' | 'share';
  urgency?: string;
} => {
  const ctas: Record<
    string,
    {
      text: string;
      action: 'follow' | 'link' | 'dm' | 'save' | 'share';
      urgency?: string;
    }
  > = {
    tiktok: {
      text: 'Follow for more tips 🔥',
      action: 'follow',
      urgency: 'Last 3 spots available',
    },
    reel: {
      text: 'Save this. Link in bio for full guide.',
      action: 'link',
      urgency: undefined,
    },
    'youtube-short': {
      text: 'Subscribe for daily content',
      action: 'follow',
      urgency: undefined,
    },
    'instagram-story': {
      text: 'Tap to learn more →',
      action: 'link',
      urgency: undefined,
    },
  };

  return ctas[platform] ?? ctas.tiktok!;
};

// ── Retention Curve (per-second) ────────────────────────────────────────

const calculateVideoRetention = (durationSeconds: number, hookScore: number): number[] => {
  const curve: number[] = [];

  for (let second = 0; second < durationSeconds; second++) {
    if (second < 3) {
      // Hook phase: high retention
      curve.push(hookScore);
    } else if (second < 10) {
      // Setup phase: slight drop
      curve.push(Math.max(40, hookScore - 10));
    } else if (second < 20) {
      // Solution phase: re-engagement
      curve.push(Math.max(50, hookScore - 20));
    } else {
      // Fatigue: drop to CTA
      curve.push(Math.max(30, hookScore - 40));
    }
  }

  return curve.slice(0, durationSeconds);
};

// ── Score Video Coherence ──────────────────────────────────────────────

const scoreVideoCoherence = (scenes: VideoScene[], palette: PinterestPattern): number => {
  let score = 100;

  // Check for clear structure
  const hasHook = scenes.some((s) => s.visualType === 'hook');
  const hasAction = scenes.some((s) => s.visualType === 'action');
  const hasCTA = scenes.some((s) => s.visualType === 'cta');

  if (!hasHook || !hasAction || !hasCTA) {
    score -= 30; // Missing key elements
  }

  // Check scene pacing
  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);
  const avgSceneDuration = totalDuration / scenes.length;
  if (avgSceneDuration < 2 || avgSceneDuration > 8) {
    score -= 15; // Pacing off
  }

  return Math.max(0, score);
};

// ── Score Video Engagement ─────────────────────────────────────────────

const scoreVideoEngagement = (
  hook: HookData,
  scenes: VideoScene[],
  cta: { text: string; action: string },
): number => {
  let score = 75;

  // Strong hook
  if (hook.retentionScore > 80) {
    score += 15;
  }

  // Retention triggers per scene
  const retentionTriggers = scenes.filter((s) =>
    s.retentionTrigger.toLowerCase().includes('must'),
  ).length;
  score += retentionTriggers * 3;

  // Clear CTA
  if (cta.action !== 'share') {
    score += 5;
  }

  return Math.min(100, score);
};

log.info('[Phase 19] Smart Video Generator initialized');
