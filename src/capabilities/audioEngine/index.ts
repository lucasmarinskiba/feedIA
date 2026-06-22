/**
 * Audio Engine — producción de audio para video social.
 */

export * from './types.js';
export { generateVoiceover, generateReelVoiceover } from './tts.js';
export { listMusic, recommendMusic, getMusicById, getSfxUrl } from './musicLibrary.js';
export { mixAudio, generateAudioForVideo } from './audioMixer.js';
