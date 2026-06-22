/**
 * TikTok Sound Sync — Detección de beat drops y sincronización de video a música
 * Crítico para FYP: videos sincronizados a beat tienen +40% completion rate.
 */

import { log } from '../../agent/logger.js';

export interface BeatMap {
  bpm: number;
  durationSec: number;
  beats: Array<{ time: number; intensity: 'low' | 'medium' | 'high' }>;
  drops: Array<{ time: number; type: 'build' | 'drop' | 'break' }>;
}

export interface SyncPoint {
  time: number;
  action: 'cut' | 'zoom' | 'text_appear' | 'transition' | 'flash' | 'slowmo';
  intensity: number; // 0-1
  reason: string;
}

export const detectBeats = async (audioUrlOrId: string): Promise<BeatMap> => {
  log.info(`[SoundSync] Analyzing beats for ${audioUrlOrId}`);

  // TODO: Integrar con real audio analysis (Essentia, Librosa, or API)
  // Simulation for now
  const bpm = 128;
  const durationSec = 15;
  const beatInterval = 60 / bpm;
  const beats: BeatMap['beats'] = [];
  const drops: BeatMap['drops'] = [];

  for (let t = 0; t < durationSec; t += beatInterval) {
    const intensity = t < 2 ? 'low' : t > 10 ? 'high' : 'medium';
    beats.push({ time: Number(t.toFixed(2)), intensity });
  }

  // Simulate drop at 3.5s and 8s
  drops.push({ time: 3.5, type: 'drop' });
  drops.push({ time: 8.0, type: 'break' });

  return { bpm, durationSec, beats, drops };
};

export const generateSyncPoints = (beatMap: BeatMap): SyncPoint[] => {
  const points: SyncPoint[] = [];

  // Always cut on drops
  for (const drop of beatMap.drops) {
    points.push({
      time: drop.time,
      action: drop.type === 'drop' ? 'transition' : 'cut',
      intensity: 0.9,
      reason: `${drop.type === 'drop' ? 'Beat drop' : 'Break'} at ${drop.time}s — momento de corte visual`,
    });
  }

  // Cut every 2-4 beats for fast-paced content
  const beatTimes = beatMap.beats.map((b) => b.time);
  for (let i = 2; i < beatTimes.length; i += 3) {
    const time = beatTimes[i];
    if (!time) continue;
    if (points.some((p) => Math.abs(p.time - time) < 0.3)) continue;
    points.push({
      time,
      action: 'cut',
      intensity: 0.5,
      reason: `Beat ${i + 1} — corte para mantener ritmo`,
    });
  }

  // Text appear on medium-intensity beats
  for (const beat of beatMap.beats) {
    if (beat.intensity === 'medium' && !points.some((p) => Math.abs(p.time - beat.time) < 0.3)) {
      points.push({
        time: beat.time,
        action: 'text_appear',
        intensity: 0.4,
        reason: `Beat en ${beat.time}s — aparecer texto sync`,
      });
    }
  }

  return points.sort((a, b) => a.time - b.time);
};

export interface EdlEntry {
  clipStart: number;
  clipEnd: number;
  timelineStart: number;
  speed?: number;
  effect?: string;
}

export const generateEDL = (videoDuration: number, syncPoints: SyncPoint[]): EdlEntry[] => {
  const edl: EdlEntry[] = [];
  let lastCut = 0;

  for (const point of syncPoints.filter((p) => p.action === 'cut' || p.action === 'transition')) {
    if (point.time > videoDuration) break;
    if (point.time - lastCut > 0.5) {
      edl.push({
        clipStart: lastCut,
        clipEnd: point.time,
        timelineStart: lastCut,
        effect: point.action === 'transition' ? 'cross_zoom' : undefined,
      });
      lastCut = point.time;
    }
  }

  if (lastCut < videoDuration) {
    edl.push({
      clipStart: lastCut,
      clipEnd: videoDuration,
      timelineStart: lastCut,
    });
  }

  return edl;
};

export const suggestSoundForContent = (
  contentType: string,
  _targetDuration: number,
): {
  soundName: string;
  bpm: number;
  why: string;
} => {
  const suggestions: Record<string, { soundName: string; bpm: number; why: string }> = {
    dance: { soundName: 'Trending Dance Beat 128bpm', bpm: 128, why: '128bpm = ritmo óptimo para FYP dance' },
    comedy: { soundName: 'Comedy Sound Effect Buildup', bpm: 90, why: '90bpm da tiempo para setup/punchline' },
    education: { soundName: 'Lo-fi Study Beat 85bpm', bpm: 85, why: '85bpm = atención sin agobio' },
    fashion: { soundName: 'Hype Beat 140bpm', bpm: 140, why: '140bpm = energía para transiciones rápidas' },
    storytelling: { soundName: 'Emotional Piano Buildup', bpm: 70, why: '70bpm = emoción, espacio para narrativa' },
  };

  return (
    suggestions[contentType.toLowerCase()] ?? {
      soundName: 'Trending Pop Beat 120bpm',
      bpm: 120,
      why: '120bpm = versátil para mayoría de contenidos',
    }
  );
};
