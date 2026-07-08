/**
 * Script Writer Engine — genera guiones escena-por-escena para reels/stories/
 * TikTok, con hook, desarrollo y CTA cronometrados. Corre cada línea de
 * guion por Quality Validator + Creativity Engine para evitar ortografía
 * pobre y hooks cliché, coherente con el resto del pipeline de FeedIA.
 */

import { log } from '../agent/logger.js';
import { qualityValidator } from './quality-validator.js';
import { creativityWitEngine } from './creativity-wit-engine.js';
import { textToSpeech, isElevenLabsAvailable } from '../integrations/elevenlabs.js';

export interface ScriptScene {
  sceneNumber: number;
  timestampStart: number; // seconds
  timestampEnd: number;
  visualDirection: string; // what's on screen
  voiceoverOrText: string; // spoken line or on-screen text
  cameraNote: string; // angle/movement
  qualityScore: number;
}

export interface ContentScript {
  topic: string;
  format: 'reel' | 'story' | 'tiktok-video';
  totalDurationSeconds: number;
  scenes: ScriptScene[];
  hookScore: number;
  overallQualityScore: number;
}

/** Standard 3-act pacing for short-form: hook (first ~20%), build (~60%), CTA (~20%). */
const actBoundaries = (totalSeconds: number): { hookEnd: number; buildEnd: number } => ({
  hookEnd: Math.max(2, Math.round(totalSeconds * 0.2)),
  buildEnd: Math.max(4, Math.round(totalSeconds * 0.8)),
});

class ScriptWriterEngine {
  /**
   * Generate a full scene-by-scene script for a short-form video.
   * sceneCount controls granularity (more scenes = tighter cuts).
   */
  async generateScript(
    topic: string,
    format: 'reel' | 'story' | 'tiktok-video',
    totalDurationSeconds: number = 15,
    sceneCount: number = 4,
  ): Promise<ContentScript> {
    const { hookEnd, buildEnd } = actBoundaries(totalDurationSeconds);
    const scenes: ScriptScene[] = [];

    const sceneLength = totalDurationSeconds / sceneCount;

    for (let i = 0; i < sceneCount; i++) {
      const start = Math.round(i * sceneLength);
      const end = Math.round((i + 1) * sceneLength);
      const isHook = start < hookEnd;
      const isCta = start >= buildEnd;

      let voiceoverOrText: string;
      let visualDirection: string;
      let cameraNote: string;

      if (isHook) {
        voiceoverOrText = `[HOOK] ${topic} — pattern interrupt in first 2 seconds, no slow intro`;
        visualDirection = 'Close-up, high energy, direct eye contact with camera or bold text overlay';
        cameraNote = 'Handheld, slight shake for authenticity, or quick zoom-in for emphasis';
      } else if (isCta) {
        voiceoverOrText = `[CTA] Clear, single next action related to ${topic} — no vague "link in bio" filler`;
        visualDirection = 'Product/result reveal, or direct-to-camera close with confident tone';
        cameraNote = 'Static or slow push-in, let the CTA text breathe (min 2s on screen)';
      } else {
        voiceoverOrText = `[BUILD] Deliver value/proof point ${i} about ${topic}, one idea per scene, no rambling`;
        visualDirection = 'Demonstration, b-roll, or supporting visual proof — avoid talking-head only';
        cameraNote = 'Match cut or whip pan into next scene to maintain momentum';
      }

      // Wit boost the hook/CTA lines specifically — those are what get remembered
      let finalLine = voiceoverOrText;
      if (isHook || isCta) {
        const boost = await creativityWitEngine.boostWit(voiceoverOrText);
        finalLine = boost.enhancedPrompt;
      }

      const validation = await qualityValidator.validatePrompt(finalLine);

      scenes.push({
        sceneNumber: i + 1,
        timestampStart: start,
        timestampEnd: end,
        visualDirection,
        voiceoverOrText: finalLine,
        cameraNote,
        qualityScore: validation.score,
      });
    }

    const hookScene = scenes[0];
    const hookScore = hookScene ? hookScene.qualityScore : 0;
    const overallQualityScore = Math.round(scenes.reduce((sum, s) => sum + s.qualityScore, 0) / (scenes.length || 1));

    log.info('[ScriptWriter] Script generated', {
      topic,
      format,
      scenes: scenes.length,
      overallQualityScore,
    });

    return {
      topic,
      format,
      totalDurationSeconds,
      scenes,
      hookScore,
      overallQualityScore,
    };
  }

  /**
   * Batch-generate scripts for a list of topics (e.g. one per content-calendar
   * item that resolved to a reel/story format).
   */
  async generateScriptBatch(
    topics: string[],
    format: 'reel' | 'story' | 'tiktok-video',
    totalDurationSeconds: number = 15,
  ): Promise<ContentScript[]> {
    const scripts: ContentScript[] = [];
    for (const topic of topics) {
      scripts.push(await this.generateScript(topic, format, totalDurationSeconds));
    }
    return scripts;
  }

  /**
   * Render a script as plain text — useful for handing to a human presenter
   * or feeding as a single string into voiceover TTS.
   */
  renderScriptAsText(script: ContentScript): string {
    return script.scenes
      .map(
        (s) =>
          `[${s.timestampStart}s-${s.timestampEnd}s] Scene ${s.sceneNumber}\n` +
          `  Visual: ${s.visualDirection}\n` +
          `  Camera: ${s.cameraNote}\n` +
          `  Line: ${s.voiceoverOrText}`,
      )
      .join('\n\n');
  }

  /**
   * Generate real voiceover audio for every scene via ElevenLabs TTS.
   * Strips the [HOOK]/[BUILD]/[CTA] act markers before synthesis — those are
   * internal pacing labels for the script, not meant to be spoken aloud.
   * Falls back to ElevenLabs' own mock (no key/DRY_RUN) automatically —
   * textToSpeech() never throws, so this always returns a result per scene.
   */
  async generateScriptAudio(
    script: ContentScript,
    voiceId?: string,
  ): Promise<Array<{ sceneNumber: number; audioUrl?: string; audioBase64?: string; provider: string }>> {
    const results = [];

    for (const scene of script.scenes) {
      const cleanLine = scene.voiceoverOrText.replace(/^\[(HOOK|BUILD|CTA)\]\s*/, '').trim();

      const tts = await textToSpeech({ text: cleanLine, voiceId });

      results.push({
        sceneNumber: scene.sceneNumber,
        audioUrl: tts.audioUrl,
        audioBase64: tts.audioBase64,
        provider: tts.provider,
      });
    }

    log.info('[ScriptWriter] Scene audio generated', {
      topic: script.topic,
      scenes: results.length,
      realTTS: isElevenLabsAvailable(),
    });

    return results;
  }
}

export const scriptWriterEngine = new ScriptWriterEngine();
