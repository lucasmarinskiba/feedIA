/**
 * Phase 12: Emotion + Psychology Engine
 *
 * Injects psychological triggers + emotion mapping
 * Hook formulas, pattern interrupts, curiosity loops
 */

import { log } from '../../agent/logger.js';

export type Emotion = 'fear' | 'hope' | 'joy' | 'anger' | 'curiosity';

export interface PsychologicalTrigger {
  emotion: Emotion;
  trigger: string;
  intensity: 'low' | 'medium' | 'high';
  impact: string;
}

export interface EmotionMap {
  primary: Emotion;
  secondary?: Emotion;
  triggers: PsychologicalTrigger[];
  hookStrength: number; // 0-100
  retentionPotential: number; // 0-100
}

// ── Hook Formulas ────────────────────────────────────────────────────

export const hookFormulas: Record<Emotion, string[]> = {
  fear: [
    "Stop! [problem] is silently destroying your [goal]. Here's why...",
    "⚠️ Most [audience] make this critical mistake... (you probably are too)",
    "WAIT. Before you [common action], you NEED to know this...",
    "If you're doing [X], you're doing it wrong. [Consequence] waiting...",
  ],
  hope: [
    "What if [desired outcome] was actually possible? Here's proof...",
    "✨ [audience] just discovered a way to [result]. Here's how...",
    "Imagine [best-case scenario]. Not fantasy. Real. Watch...",
    "The secret to [goal]: nobody talks about this one thing...",
  ],
  joy: [
    "😂 POV: You just discovered the [thing] hack that changes everything",
    "Wait till you see this. You're gonna laugh AND win.",
    "No way this is this simple... but it IS. Proof →",
    "🎉 [audience] just pulled off [result]. The method is *chef's kiss*",
  ],
  anger: [
    "🔥 They don't want you to know this about [topic]...",
    "STOP. They've been LYING to you about [topic].",
    "Basta. Here's what the [industry] doesn't want you to see...",
    "This [industry] SECRET is finally exposed. [consequence]...",
  ],
  curiosity: [
    "👀 [topic] hack that literally nobody talks about (watch till end)",
    "This [thing] is so [adjective], even [authority] doesn't know...",
    "❓ What [audience] gets wrong about [topic] (you too probably)",
    "The #1 [goal] method everyone misses. It's so [adjective]...",
  ],
};

// ── Pattern Interrupts ────────────────────────────────────────────────

export const patternInterrupts: Record<Emotion, string[]> = {
  fear: ["But here's the catch...", "The twist nobody sees coming...", "That's when [bad thing] hits..."],
  hope: ["Then this one thing changed everything...", "The breakthrough moment...", "That's when it clicked..."],
  joy: ["The punchline:", "But wait, it gets better...", "Here's the best part..."],
  anger: ["The REAL reason...", "What actually happened...", "The truth they hide..."],
  curiosity: ["Nope, it's actually...", "Plot twist:", "But here's the secret..."],
};

// ── Emotional Keywords ────────────────────────────────────────────────

export const emotionalKeywords: Record<Emotion, string[]> = {
  fear: ["danger", "mistake", "avoid", "warning", "disaster", "fail", "lose", "risk", "trap"],
  hope: ["possible", "breakthrough", "achieve", "win", "success", "future", "better", "transform"],
  joy: ["love", "laugh", "celebrate", "amazing", "incredible", "perfect", "vibe", "energy"],
  anger: ["unfair", "lie", "exposed", "truth", "justice", "action", "demand", "finally"],
  curiosity: ["secret", "discover", "unknown", "hidden", "reveal", "uncover", "mystery", "wait"],
};

// ── Map emotion to psychological triggers ────────────────────────────

export const createEmotionMap = (emotion: Emotion, topic: string, audience: string): EmotionMap => {
  log.info(`[Emotion] Mapping ${emotion} for: ${topic} (${audience})`);

  const triggers: PsychologicalTrigger[] = [];

  // Primary trigger
  const primaryTrigger = selectPrimaryTrigger(emotion, topic, audience);
  triggers.push({
    emotion,
    trigger: primaryTrigger,
    intensity: 'high',
    impact: `Immediate pattern interrupt. ${emotion} activation high.`,
  });

  // Secondary triggers (scene-level)
  const secondaryTriggers = selectSecondaryTriggers(emotion);
  secondaryTriggers.forEach((t, idx) => {
    triggers.push({
      emotion,
      trigger: t,
      intensity: idx === 0 ? 'high' : 'medium',
      impact: `Sustained ${emotion}. Prevents scroll exit.`,
    });
  });

  // Secondary emotion for texture
  const secondary = pickSecondaryEmotion(emotion);

  const hookStrength = calculateHookStrength(emotion, topic, audience);
  const retentionPotential = calculateRetentionPotential(emotion);

  return {
    primary: emotion,
    secondary,
    triggers,
    hookStrength,
    retentionPotential,
  };
};

const selectPrimaryTrigger = (emotion: Emotion, _topic: string, _audience: string): string => {
  const formulas = hookFormulas[emotion];
  return formulas[Math.floor(Math.random() * formulas.length)] ?? '';
};

const selectSecondaryTriggers = (emotion: Emotion): string[] => {
  const interrupts = patternInterrupts[emotion];
  return interrupts.slice(0, 2);
};

const pickSecondaryEmotion = (primary: Emotion): Emotion => {
  const pairs: Record<Emotion, Emotion> = {
    fear: 'hope',
    hope: 'joy',
    joy: 'curiosity',
    anger: 'curiosity',
    curiosity: 'hope',
  };
  return pairs[primary];
};

export const calculateHookStrength = (_emotion: Emotion, _topic: string, _audience: string): number => {
  // Base 60. Formula strength + topic relevance + audience fit
  let score = 60;

  // Emotional weight
  const emotionScore: Record<Emotion, number> = {
    fear: 85, // Highest engagement
    curiosity: 82,
    anger: 80,
    hope: 75,
    joy: 70,
  };

  score += (emotionScore[_emotion] - 75) / 2; // Boost by emotion strength

  return Math.min(100, Math.max(40, score));
};

export const calculateRetentionPotential = (emotion: Emotion): number => {
  // How well emotion sustains through full video
  const retention: Record<Emotion, number> = {
    fear: 78, // Sustains well if resolved
    curiosity: 85, // Naturally sustains (need to know)
    anger: 72, // Risk of fade mid-video
    hope: 80, // Sustains if proven
    joy: 75, // Works but decays
  };

  return retention[emotion];
};

// ── Validate emotion coherence ────────────────────────────────────────

export const validateEmotionCoherence = (emotionMap: EmotionMap): {valid: boolean; issues: string[]} => {
  const issues: string[] = [];

  if (emotionMap.hookStrength < 50) {
    issues.push(`Hook strength too low (${emotionMap.hookStrength}). Use stronger primary emotion.`);
  }

  if (emotionMap.triggers.length < 3) {
    issues.push('Need min 3 emotional triggers for coherence.');
  }

  if (!emotionMap.secondary) {
    issues.push('Secondary emotion missing. Adds texture.');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
