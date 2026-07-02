/**
 * Phase 11: Video Script Generator
 *
 * Generates TikTok/Reel scripts (15-60s)
 * Hook-driven, high-retention structure
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface VideoScriptBrief {
  topic: string;
  duration: 15 | 30 | 45 | 60; // seconds
  tone: string[];
  emotionalHook: 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';
  audience?: string;
}

export interface VideoScript {
  duration: number;
  hook: string;
  scenes: Array<{
    second: number;
    voiceover: string;
    visual: string;
    action?: string;
  }>;
  cta: string;
  hashtags: string[];
}

export const generateVideoScript = async (
  brief: VideoScriptBrief,
  _brand?: BrandProfile,
): Promise<VideoScript> => {
  log.info(`[Video Script] Generating ${brief.duration}s script: ${brief.topic}`);

  const hookText = generateHook(brief.topic, brief.emotionalHook);
  const scenes = generateScenes(brief.topic, brief.duration, brief.emotionalHook);
  const cta = generateCTA(brief.topic);
  const hashtags = generateHashtags(brief.topic);

  return {
    duration: brief.duration,
    hook: hookText,
    scenes,
    cta,
    hashtags,
  };
};

const generateHook = (topic: string, emotion: string): string => {
  const hooks: Record<string, string> = {
    fear: `🚨 Stop! Everything you know about ${topic} is WRONG. Watch this... →`,
    hope: `✨ Imagine ${topic}... but ACTUALLY working. Here's how →`,
    joy: `😂 POV: You just discovered the secret to ${topic}. Let me show you →`,
    anger: `🔥 They don't want you to know this about ${topic}. But here it is →`,
    curiosity: `👀 ${topic} hack that nobody talks about (watch till end) →`,
  };

  return hooks[emotion] || hooks['curiosity'];
};

const generateScenes = (
  topic: string,
  duration: number,
  emotion: string,
): VideoScript['scenes'] => {
  const scenes: VideoScript['scenes'] = [];
  const sceneCount = Math.ceil(duration / 5); // ~5s per scene

  // Scene 1: Hook (0-5s)
  scenes.push({
    second: 0,
    voiceover: `Wait, did you know about ${topic}?`,
    visual: 'Fast-paced B-roll, quick cuts, high energy',
    action: 'ZOOM IN on face, intense expression',
  });

  // Scenes 2+: Value (5-end)
  for (let i = 1; i < sceneCount; i++) {
    const start = i * 5;
    const isEnd = start + 5 >= duration;

    scenes.push({
      second: start,
      voiceover: `Here's what most people get wrong... ${i}. ${generateFactoid(topic, i)}`,
      visual: `Screen recording, diagram, or b-roll showing ${topic}`,
      action: isEnd ? 'CTA: Follow for more tips' : undefined,
    });
  }

  return scenes;
};

const generateFactoid = (topic: string, order: number): string => {
  const templates = [
    `${topic} is actually way simpler than you think`,
    `Most people skip this ONE thing with ${topic}`,
    `The ${topic} trick nobody knows`,
    `Why ${topic} is so misunderstood`,
    `The ${topic} secret that changes everything`,
  ];

  return templates[order % templates.length];
};

const generateCTA = (topic: string): string => {
  const ctas = [
    `Follow for more ${topic} hacks 🔥`,
    `Save this ${topic} guide 📌`,
    `DM me for ${topic} tips 👇`,
    `Share this with someone who needs to know ${topic}`,
  ];

  return ctas[Math.floor(Math.random() * ctas.length)];
};

const generateHashtags = (topic: string): string[] => {
  return [
    `#${topic.replace(/\s+/g, '')}`,
    '#ReelsOfTheDay',
    '#VoiceTok',
    '#FYP',
    '#ForYou',
    '#MustWatch',
  ];
};
