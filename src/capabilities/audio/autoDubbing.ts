/**
 * Audio AI — Auto-Dubbing
 * Traduce y dobla video a múltiples idiomas para alcance global.
 */

import { log } from '../../agent/logger.js';
import { synthesizeSpeech } from './voiceCloning.js';

export interface DubbingRequest {
  sourceLanguage: string;
  targetLanguage: string;
  script: string;
  videoUrl?: string;
  preserveTone?: boolean;
  voiceId?: string;
}

export interface DubbedTrack {
  dubbingId: string;
  targetLanguage: string;
  translatedScript: string;
  audioUrl: string;
  durationSec: number;
  lipSyncScore?: number; // 0-100
}

export const translateScript = async (script: string, targetLang: string): Promise<string> => {
  // TODO: Integrar con LLM para traducción cultural (no literal)
  // Por ahora, mock
  const translations: Record<string, Record<string, string>> = {
    'es-AR': { 'en-US': 'Translated to English with cultural adaptation' },
    'en-US': { 'es-AR': 'Traducido al español con adaptación cultural' },
    'pt-BR': { 'es-AR': 'Traduzido para o espanhol' },
  };

  const sourceLang = detectLanguage(script);
  return translations[sourceLang]?.[targetLang] ?? `[${targetLang}] ${script.slice(0, 100)}...`;
};

const detectLanguage = (text: string): string => {
  // Simplificado
  if (/[áéíóúñ¿¡]/i.test(text)) return 'es-AR';
  return 'en-US';
};

export const dubVideo = async (req: DubbingRequest): Promise<DubbedTrack> => {
  log.info(`[AutoDubbing] Dubbing from ${req.sourceLanguage} to ${req.targetLanguage}`);

  const translated = await translateScript(req.script, req.targetLanguage);
  const voice = await synthesizeSpeech({
    text: translated,
    voiceId: req.voiceId ?? 'brand-primary',
  });

  return {
    dubbingId: `dub-${Date.now()}`,
    targetLanguage: req.targetLanguage,
    translatedScript: translated,
    audioUrl: voice.url,
    durationSec: voice.durationSec,
    lipSyncScore: 78, // mock
  };
};

export const generateMultiLanguageDubs = async (script: string, targetLanguages: string[]): Promise<DubbedTrack[]> => {
  const results: DubbedTrack[] = [];
  for (const lang of targetLanguages) {
    const dub = await dubVideo({
      sourceLanguage: detectLanguage(script),
      targetLanguage: lang,
      script,
    });
    results.push(dub);
  }
  return results;
};
