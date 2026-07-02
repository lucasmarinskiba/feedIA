/**
 * Phase 11: Subtitle Generator
 *
 * Auto-generates subtitles (SRT format) from voiceover
 * Syncs with video timeline, emoji enhancement
 */

import { log } from '../../agent/logger.js';
import type { VoiceoverSegment, VoiceoverTrack } from './voiceoverEngine.js';

export interface Subtitle {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  emoji?: string;
  style?: string;
}

export interface SubtitleTrack {
  format: 'srt' | 'vtt';
  language: string;
  subtitles: Subtitle[];
  srtContent?: string;
}

export const generateSubtitles = (voicetrack: VoiceoverTrack): SubtitleTrack => {
  log.info(`[Subtitles] Generating SRT for ${voicetrack.segments.length} segments`);

  const subtitles: Subtitle[] = [];
  let index = 1;
  let currentTime = 0;

  voicetrack.segments.forEach((segment) => {
    const startTime = formatTimecode(segment.second);
    const endTime = formatTimecode(segment.second + segment.duration);

    // Split long text into chunks (max 42 chars per line, max 2 lines)
    const chunks = splitSubtitleText(segment.text);

    chunks.forEach((chunk, chunkIdx) => {
      const emoji = selectEmoji(segment, chunkIdx);

      subtitles.push({
        index,
        startTime,
        endTime,
        text: emoji ? `${emoji} ${chunk}` : chunk,
        emoji,
        style: selectSubtitleStyle(segment.second, voicetrack.totalDuration),
      });

      index++;
    });

    currentTime += segment.duration;
  });

  const srtContent = generateSRT(subtitles);

  return {
    format: 'srt',
    language: 'es',
    subtitles,
    srtContent,
  };
};

const formatTimecode = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${pad(hours)}:${pad(minutes)}:${pad(secs)},${pad(ms, 3)}`;
};

const pad = (num: number, digits = 2): string => {
  return String(num).padStart(digits, '0');
};

const splitSubtitleText = (text: string): string[] => {
  // Max 42 chars per line, 2 lines max per subtitle
  const maxChars = 42;
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach((word) => {
    if ((currentLine + word).length > maxChars) {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = currentLine ? `${currentLine} ${word}` : word;
    }
  });

  if (currentLine) lines.push(currentLine);

  // Combine into max 2-line chunks
  const chunks: string[] = [];
  for (let i = 0; i < lines.length; i += 2) {
    chunks.push(lines.slice(i, i + 2).join('\n'));
  }

  return chunks;
};

const selectEmoji = (segment: VoiceoverSegment, index: number): string | undefined => {
  if (segment.voice.tone === 'energetic') return index === 0 ? '⚡' : '🔥';
  if (segment.voice.tone === 'urgent') return '🚨';
  if (segment.voice.tone === 'friendly') return '😊';
  if (segment.voice.tone === 'professional') return '✅';
  return undefined;
};

const selectSubtitleStyle = (second: number, duration: number): string => {
  if (second < 5) return 'hook'; // Bold, large
  if (second < duration - 5) return 'value'; // Medium, white
  return 'cta'; // Bold, accent color
};

const generateSRT = (subtitles: Subtitle[]): string => {
  return subtitles
    .map((sub) => {
      return `${sub.index}\n${sub.startTime} --> ${sub.endTime}\n${sub.text}\n`;
    })
    .join('\n');
};

export const exportSubtitlesAsSRT = (track: SubtitleTrack): string => {
  return track.srtContent || generateSRT(track.subtitles);
};

export const exportSubtitlesAsVTT = (track: SubtitleTrack): string => {
  const vttContent = 'WEBVTT\n\n' + generateSRT(track.subtitles);
  return vttContent;
};
