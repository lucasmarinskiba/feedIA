/**
 * Phase 11: Scene Breakdown Engine
 *
 * Converts voiceover into visual/action specs per second
 * Defines what user sees & when
 */

import { log } from '../../agent/logger.js';
import type { VideoScript } from './videoScriptGenerator.js';

export interface VisualFrame {
  second: number;
  voiceover: string;
  visualType: 'broll' | 'text-overlay' | 'transition' | 'title' | 'demo' | 'screen-record';
  action: string;
  duration: number;
  transitionEffect?: string;
}

export interface SceneBreakdown {
  totalFrames: number;
  frames: VisualFrame[];
  transitions: Array<{
    from: number;
    to: number;
    effect: string;
  }>;
}

export const generateSceneBreakdown = (script: VideoScript): SceneBreakdown => {
  log.info(`[Scene Breakdown] Analyzing ${script.duration}s video structure`);

  const frames: VisualFrame[] = [];
  const transitions: Array<{from: number; to: number; effect: string}> = [];

  // Frame 0-3s: Hook (intro + title)
  frames.push({
    second: 0,
    voiceover: script.hook,
    visualType: 'title',
    action: 'FULL SCREEN TEXT: ${topic}. Zoom in. Pulse effect.',
    duration: 3,
    transitionEffect: 'zoom-in',
  });

  // Scenes mapped to frames
  script.scenes.forEach((scene, idx) => {
    const visualType = selectVisualType(scene.second, script.duration);

    frames.push({
      second: scene.second,
      voiceover: scene.voiceover,
      visualType,
      action: scene.action || selectDefaultAction(scene.second, script.duration),
      duration: idx < script.scenes.length - 1 ? script.scenes[idx + 1]!.second - scene.second : 5,
      transitionEffect: selectTransition(idx),
    });

    // Add transition
    if (idx < script.scenes.length - 1) {
      transitions.push({
        from: scene.second,
        to: script.scenes[idx + 1]!.second,
        effect: selectTransition(idx),
      });
    }
  });

  // Final frame: CTA (last 3-5s)
  const ctaStart = Math.max(script.duration - 5, script.scenes[script.scenes.length - 1]?.second || 0);
  frames.push({
    second: ctaStart,
    voiceover: script.cta,
    visualType: 'text-overlay',
    action: 'CTA SCREEN: Follow, Subscribe, DM. Animated buttons.',
    duration: script.duration - ctaStart,
    transitionEffect: 'fade-out',
  });

  return {
    totalFrames: frames.length,
    frames,
    transitions,
  };
};

const selectVisualType = (second: number, duration: number): VisualFrame['visualType'] => {
  if (second === 0) return 'title';
  if (second < 5) return 'broll'; // Hook section
  if (second < duration - 5) {
    // Value section alternates
    return second % 10 < 5 ? 'screen-record' : 'demo';
  }
  return 'text-overlay'; // CTA section
};

const selectDefaultAction = (second: number, duration: number): string => {
  const actions = [
    'Cut to fast-paced b-roll. High energy cuts every 1s.',
    'Screen recording: Show tool/app in action.',
    'Person talking to camera: Hand gestures, expressions.',
    'Zoom on important text/diagram. Highlight key points.',
    'Before/after comparison. Split screen, 2-second display.',
    'Animated counter/stat. Text flies in, numbers tick up.',
  ];

  const idx = Math.floor(second / 5) % actions.length;
  return actions[idx]!;
};

const selectTransition = (frameIndex: number): string => {
  const transitions = ['fade', 'slide-left', 'zoom-in', 'cut', 'dissolve'];
  return transitions[frameIndex % transitions.length]!;
};
