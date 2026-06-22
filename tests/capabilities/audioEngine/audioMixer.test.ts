/**
 * Tests del mixer de audio.
 */
import { describe, it, expect } from 'vitest';
import { mixAudio, generateAudioForVideo } from '../../../src/capabilities/audioEngine/audioMixer.js';

describe('AudioMixer (DRY_RUN)', () => {
  it('devuelve voiceover como proxy si solo hay voiceover', async () => {
    const result = await mixAudio({
      voiceover: { ok: true, audioUrl: 'https://cdn.test/voice.mp3', provider: 'elevenlabs' },
      targetDurationSec: 15,
    });
    expect(result.ok).toBe(true);
    expect(result.audioUrl).toBe('https://cdn.test/voice.mp3');
    expect(result.provider).toBe('voiceover-proxy');
  });

  it('genera audio completo para video en dry run', async () => {
    const result = await generateAudioForVideo({
      scriptText: 'Esto es un test de voz',
      contentType: 'education',
      durationSec: 10,
      mood: 'upbeat',
      sfx: ['pop', 'whoosh'],
    });
    expect(result.ok).toBe(true);
    expect(result.audioUrl).toBeDefined();
  });
});
