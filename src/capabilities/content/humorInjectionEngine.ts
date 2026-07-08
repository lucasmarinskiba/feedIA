/**
 * Phase 12: Humor Injection Engine
 *
 * Adds comedy timing, delivery, meme-style humor
 * Balances emotion with entertainment value
 */

import { log } from '../../agent/logger.js';

export interface HumorPoint {
  type: 'punchline' | 'wordplay' | 'contrast' | 'absurdity' | 'relatable-fail';
  text: string;
  timing: 'immediate' | 'delayed' | 'buildup';
  deliveryNote: string;
  intensity: 'light' | 'medium' | 'strong';
}

export interface HumorMap {
  comedyStyle: 'dry' | 'absurd' | 'relatable' | 'dark' | 'pun-heavy';
  humorPoints: HumorPoint[];
  totalLaughs: number;
  timing: 'good' | 'excellent' | 'risky';
}

// ── Comedy Styles ────────────────────────────────────────────────────

export const comedyStyles = {
  dry: {
    name: "Deadpan / Dry Wit",
    markers: ["understated", "matter-of-fact", "unexpected juxtaposition"],
    examples: [
      "We tried productivity apps. Spoiler: we're still lazy.",
      "This marketing strategy is simple. Spoiler: nothing works.",
    ],
  },
  absurd: {
    name: "Absurdist Humor",
    markers: ["exaggeration", "surreal logic", "emoji chaos"],
    examples: [
      "Your boss: 'let's synergize our paradigm' | Translation: nobody knows",
      "🎯 Goal: be productive. Reality: doom-scroll for 3 hours. (Same energy)",
    ],
  },
  relatable: {
    name: 'Relatable Self-Deprecation',
    markers: ['self-aware fail', 'we-all-know-this', 'validating struggle'],
    examples: [
      "If you've done this, raise your hand. (I see you from 2025)",
      "POV: You're reading this instead of doing your actual work.",
    ],
  },
  dark: {
    name: "Dark / Sarcasm-Heavy",
    markers: ["ironic observations", "tragic humor", "cynical twist"],
    examples: [
      "Capitalism: Hustle so you can afford to rest someday.",
      "They said 'follow your passion.' I did. Now I'm broke and passionate.",
    ],
  },
  "pun-heavy": {
    name: "Wordplay / Puns",
    markers: ["double meaning", "sound-alike", "clever twist"],
    examples: [
      "We're not saying the system is broken. We're saying it's *fractured*.",
      "This tool? It's *literally* a game-changer. (It's a game).",
    ],
  },
};

// ── Humor Formulas ────────────────────────────────────────────────────

export const humorFormulas: Record<string, string[]> = {
  // Punchline structure: Setup → Twist
  punchline: [
    '[Setup about common belief]. [Unexpected truth]. Plot twist.',
    "Everyone does [X]. Everyone fails at [Y]. You're not alone.",
    'I tried [X]. Spoiler: [embarrassing result].',
  ],

  // Wordplay structure
  wordplay: [
    "It's called '[punny name]' because [explanation]. (Yes, really).",
    '[Word] vs. [similar word]: Let me explain this 3 times.',
  ],

  // Contrast structure: Expectation ≠ Reality
  contrast: [
    'Expect: [perfect fantasy]. Reality: [messy truth]. Relatable.',
    'Theory: [ideal]. Practice: [disaster]. Welcome to life.',
  ],

  // Absurdity structure: Exaggeration for effect
  absurdity: [
    '[Exaggerated statement]. Obviously. [Self-aware deflate].',
    'This one weird trick [absurd outcome]. Doctors hate him.',
  ],

  // Relatable fail structure
  relatable: [
    "POV: You're [specific situation]. Yeah, we've all been there.",
    "If this is you, stop. (Actually, keep going. I'm entertained).",
  ],
};

// ── Insert humor into copy ────────────────────────────────────────────

export const injectHumor = (
  text: string,
  comedyStyle: keyof typeof comedyStyles,
  intensity: 'light' | 'medium' | 'strong' = 'medium',
): string => {
  log.info(`[Humor] Injecting ${intensity} ${comedyStyle} humor`);

  const style = comedyStyles[comedyStyle];
  const formulas = humorFormulas[comedyStyle] || humorFormulas.relatable!;

  if (intensity === 'light') {
    return addEmoji(text, 2);
  }

  if (intensity === 'medium') {
    return addRelatable(text, formulas);
  }

  // Strong: Add structure + emoji + delivery note
  return addStructuredHumor(text, formulas);
};

const addEmoji = (text: string, count: number): string => {
  const emojis = ['😂', '🔥', '💀', '🎯', '✨', '👀', '💯', '🚀'];
  let result = text;

  for (let i = 0; i < count; i++) {
    const emoji = emojis[Math.floor(Math.random() * emojis.length)];
    const insertPos = Math.floor(result.length / count) * (i + 1);
    result = result.slice(0, insertPos) + ` ${emoji} ` + result.slice(insertPos);
  }

  return result;
};

const addRelatable = (text: string, formulas: string[]): string => {
  const relatableMarkers = ["(relatable)", "(same energy)", "(we've all been there)"];
  const marker = relatableMarkers[Math.floor(Math.random() * relatableMarkers.length)]!;

  return `${text} ${marker}`;
};

const addStructuredHumor = (text: string, formulas: string[]): string => {
  // Build 2-part structure: Setup + Twist
  const parts = text.split('.').filter((p) => p.trim());

  if (parts.length < 2) return text;

  const setup = parts[0];
  const twist = parts.slice(1).join('.').trim();

  return `${setup}. (Spoiler: ${twist}). Plot twist.`;
};

// ── Generate comedy timing ────────────────────────────────────────────

export const generateHumorMap = (
  topic: string,
  contentLength: number, // seconds or word count
  comedyStyle: keyof typeof comedyStyles,
): HumorMap => {
  log.info(`[Humor] Generating ${comedyStyle} humor map for: ${topic}`);

  const humorPoints: HumorPoint[] = [];
  const pointCount = Math.ceil(contentLength / 15); // ~1 laugh per 15s

  // Distribute humor across timeline
  for (let i = 0; i < pointCount; i++) {
    const point: HumorPoint = {
      type: selectHumorType(i, pointCount),
      text: generateHumorLine(topic, comedyStyle),
      timing: selectTiming(i, pointCount),
      deliveryNote: selectDeliveryNote(comedyStyle),
      intensity: i === 0 ? 'strong' : i === pointCount - 1 ? 'medium' : 'light',
    };

    humorPoints.push(point);
  }

  const timing = evaluateTiming(humorPoints);

  return {
    comedyStyle,
    humorPoints,
    totalLaughs: humorPoints.length,
    timing,
  };
};

const selectHumorType = (index: number, total: number): HumorPoint['type'] => {
  const types: HumorPoint['type'][] = ['punchline', 'wordplay', 'contrast', 'absurdity', 'relatable-fail'];

  // First is strong punchline, rest vary
  if (index === 0) return 'punchline';

  return types[index % types.length]!;
};

const generateHumorLine = (_topic: string, _style: keyof typeof comedyStyles): string => {
  const lines = [
    "(We're all thinking it, someone had to say it)",
    "(Yes, this works. Somehow.)",
    "(Spoiler: everyone messes this up)",
    "(POV: you're reading this at 2am)",
    "(This part never gets old)",
  ];

  return lines[Math.floor(Math.random() * lines.length)]!;
};

const selectTiming = (index: number, total: number): HumorPoint['timing'] => {
  if (index === 0) return 'immediate'; // Hook humor = fast
  if (index === Math.floor(total / 2)) return 'delayed'; // Mid-video = build tension
  return 'buildup';
};

const selectDeliveryNote = (_style: keyof typeof comedyStyles): string => {
  const notes = [
    'Fast delivery, straight face',
    'Pause for effect. Then punchline.',
    'Hand gesture. Self-aware smirk.',
    'Zoom-in on face. Eyebrow raise.',
    'Text overlay pops up. Exaggerated timing.',
  ];

  return notes[Math.floor(Math.random() * notes.length)]!;
};

const evaluateTiming = (points: HumorPoint[]): HumorMap['timing'] => {
  // Check spacing: 4+ seconds between jokes? Good pacing
  // 2-3 seconds? Excellent (relentless energy)
  // < 2 seconds? Risky (might feel forced)

  if (points.length <= 2) return 'good';

  const avgSpacing = 100 / points.length; // Placeholder scoring

  if (avgSpacing > 25) return 'good';
  if (avgSpacing > 15) return 'excellent';
  return 'risky';
};

// ── Validate humor appropriateness ────────────────────────────────────

export const validateHumorFit = (
  topic: string,
  humor: HumorMap,
  audience: string,
): {appropriate: boolean; warnings: string[]} => {
  const warnings: string[] = [];

  // Some topics need less humor
  const seriousTopics = ['death', 'trauma', 'crisis', 'loss', 'disease'];
  const isSeriousTopic = seriousTopics.some((t) => topic.toLowerCase().includes(t));

  if (isSeriousTopic && humor.comedyStyle === 'dark') {
    warnings.push('Dark humor on serious topic: risky. Consider lighter style.');
  }

  // Young audience: Avoid dark, absurd OK
  if (audience.includes('teen') && (humor.comedyStyle === 'dark' || humor.comedyStyle === 'absurd')) {
    warnings.push('Absurd/dark humor may not land with teen audience.');
  }

  // Professional audience: Dry > Absurd
  if (audience.includes('professional') && humor.comedyStyle === 'absurd') {
    warnings.push('Absurd humor risky for professional audience. Dry better.');
  }

  if (humor.timing === 'risky') {
    warnings.push('Humor timing is aggressive. May feel forced.');
  }

  return {
    appropriate: warnings.length === 0,
    warnings,
  };
};
