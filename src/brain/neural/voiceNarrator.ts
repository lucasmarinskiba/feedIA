/**
 * Voice Narrator — genera respuestas + narración en voz alta.
 *
 * Convierte cualquier output de skill/action en script optimizado para TTS:
 *   - Sin caracteres especiales que arruinan TTS
 *   - Cadencia natural (pausas, énfasis)
 *   - Vocabulario hablado (no escrito)
 *   - Acortado para audio (audio se cansa rápido)
 *
 * No invoca TTS engine — produce el script. Endpoint externo (Eleven Labs,
 * OpenAI TTS, Web Speech API) lo convierte a audio.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const VOICE_DIR = path.resolve('data/neural/voice');

export type VoicePersona =
  | 'profesional-cercano'
  | 'amigo-experto'
  | 'asistente-discreto'
  | 'entrenador-energico'
  | 'analista-frio';

export type VoiceContext = 'briefing' | 'action-announcement' | 'response' | 'alert' | 'celebration' | 'warning';

export interface VoiceScript {
  id: string;
  brandId: string;
  text: string; // texto original (puede tener markdown)
  voiceText: string; // optimizado para TTS
  estimatedDurationSec: number;
  persona: VoicePersona;
  context: VoiceContext;
  ssmlMarkup?: string; // opcional para TTS avanzados
  emotionalTone: 'neutral' | 'positive' | 'urgent' | 'cautious' | 'celebratory';
  generatedAt: string;
}

const WORDS_PER_MINUTE = 150;

const PERSONA_STYLES: Record<
  VoicePersona,
  { greetings: string[]; closers: string[]; fillerStyle: 'sparse' | 'natural' | 'expressive' }
> = {
  'profesional-cercano': {
    greetings: ['Listo,', 'Hecho,', 'Te cuento:', 'Mirá:'],
    closers: ['Cualquier cosa avisame.', 'Sigamos.', 'Listos para el próximo paso.'],
    fillerStyle: 'natural',
  },
  'amigo-experto': {
    greetings: ['Eh, escuchá esto:', 'Mirá lo que pasó:', 'Buenas noticias:', 'Atención:'],
    closers: ['Después seguimos.', 'Vamos por más.', 'Todo bajo control.'],
    fillerStyle: 'expressive',
  },
  'asistente-discreto': {
    greetings: ['', 'Actualización:', 'Reporte:', 'Estado:'],
    closers: ['Fin del reporte.', '.', 'Continúo trabajando.'],
    fillerStyle: 'sparse',
  },
  'entrenador-energico': {
    greetings: ['¡Vamos!', '¡Buenísimo!', '¡Atento a esto!', '¡Foco!'],
    closers: ['¡A por más!', '¡Seguimos a fondo!', '¡No paramos!'],
    fillerStyle: 'expressive',
  },
  'analista-frio': {
    greetings: ['Datos:', 'Resultado:', 'Análisis:', 'Conclusión:'],
    closers: ['Fin del análisis.', 'Próxima medición pendiente.', 'Esperando nuevos datos.'],
    fillerStyle: 'sparse',
  },
};

const sanitizeForTTS = (text: string): string => {
  return text
    .replace(/[*_`~#>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/@(\w+)/g, 'arroba $1')
    .replace(/#(\w+)/g, 'numeral $1')
    .replace(/(\d+),(\d+)/g, '$1 punto $2')
    .replace(/(\d+)%/g, '$1 por ciento')
    .replace(/\$(\d+)/g, '$1 dólares')
    .replace(/\bUSD\b/g, 'dólares')
    .replace(/\bIG\b/g, 'Instagram')
    .replace(/\bTT\b/g, 'TikTok')
    .replace(/\bDM\b/g, 'mensaje directo')
    .replace(/\bCTA\b/g, 'llamada a la acción')
    .replace(/\bROI\b/g, 'retorno de inversión')
    .replace(/\bKPI\b/g, 'indicador')
    .replace(/\bCM\b/g, 'community manager')
    .replace(/\s+/g, ' ')
    .replace(/([.!?])\s+/g, '$1 ')
    .trim();
};

const estimateDuration = (voiceText: string): number => {
  const wordCount = voiceText.split(/\s+/).length;
  return Math.ceil((wordCount / WORDS_PER_MINUTE) * 60);
};

const buildSSML = (text: string, tone: VoiceScript['emotionalTone'], persona: VoicePersona): string => {
  const rate = tone === 'urgent' ? 'fast' : tone === 'cautious' ? 'slow' : 'medium';
  const pitch = tone === 'celebratory' ? '+5%' : tone === 'urgent' ? '+3%' : 'default';
  const emphasis = persona === 'entrenador-energico' ? 'strong' : 'moderate';
  return `<speak><prosody rate="${rate}" pitch="${pitch}"><emphasis level="${emphasis}">${text}</emphasis></prosody></speak>`;
};

export const composeVoiceScript = async (
  brandId: string,
  params: {
    text: string;
    context: VoiceContext;
    persona?: VoicePersona;
    emotionalTone?: VoiceScript['emotionalTone'];
    maxDurationSec?: number;
    includeSSML?: boolean;
  },
): Promise<VoiceScript> => {
  const persona = params.persona ?? 'profesional-cercano';
  const style = PERSONA_STYLES[persona];
  const greeting = style.greetings[Math.floor(Math.random() * style.greetings.length)] ?? '';
  const closer =
    params.context === 'briefing' || params.context === 'response'
      ? (style.closers[Math.floor(Math.random() * style.closers.length)] ?? '')
      : '';

  let voiceText = sanitizeForTTS(params.text);

  // Trim si excede maxDurationSec
  if (params.maxDurationSec) {
    const maxWords = Math.floor((params.maxDurationSec / 60) * WORDS_PER_MINUTE);
    const words = voiceText.split(/\s+/);
    if (words.length > maxWords) {
      voiceText = words.slice(0, maxWords - 5).join(' ') + '... resumen acá.';
    }
  }

  const composed = [greeting, voiceText, closer].filter(Boolean).join(' ');
  const finalText = composed.trim();
  const duration = estimateDuration(finalText);
  const tone = params.emotionalTone ?? 'neutral';

  const script: VoiceScript = {
    id: `voice-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId,
    text: params.text,
    voiceText: finalText,
    estimatedDurationSec: duration,
    persona,
    context: params.context,
    ssmlMarkup: params.includeSSML ? buildSSML(finalText, tone, persona) : undefined,
    emotionalTone: tone,
    generatedAt: new Date().toISOString(),
  };

  await fs.mkdir(VOICE_DIR, { recursive: true });
  const file = path.join(VOICE_DIR, `${brandId}-${script.id}.json`);
  await fs.writeFile(file, JSON.stringify(script, null, 2), 'utf-8');
  log.info('[voiceNarrator] script composed', { brandId, id: script.id, durationSec: duration });
  return script;
};

export const composeActionAnnouncement = async (
  brandId: string,
  params: { actionEmoji: string; actionDescription: string; urgent?: boolean },
): Promise<VoiceScript> => {
  return composeVoiceScript(brandId, {
    text: `${params.actionEmoji} ${params.actionDescription}`,
    context: 'action-announcement',
    persona: 'asistente-discreto',
    emotionalTone: params.urgent ? 'urgent' : 'neutral',
    maxDurationSec: 15,
  });
};

export const composeAlert = async (
  brandId: string,
  message: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
): Promise<VoiceScript> => {
  const tone: VoiceScript['emotionalTone'] = severity === 'critical' || severity === 'high' ? 'urgent' : 'cautious';
  const prefix = severity === 'critical' ? 'Atención crítica:' : severity === 'high' ? 'Importante:' : 'Aviso:';
  return composeVoiceScript(brandId, {
    text: `${prefix} ${message}`,
    context: 'alert',
    persona: 'profesional-cercano',
    emotionalTone: tone,
    maxDurationSec: 20,
    includeSSML: true,
  });
};

export const composeCelebration = async (brandId: string, achievement: string): Promise<VoiceScript> => {
  return composeVoiceScript(brandId, {
    text: `¡Logramos algo grande! ${achievement}`,
    context: 'celebration',
    persona: 'entrenador-energico',
    emotionalTone: 'celebratory',
    maxDurationSec: 12,
    includeSSML: true,
  });
};

export const composeResponseToUser = async (
  brandId: string,
  userQuestion: string,
  systemAnswer: string,
  persona?: VoicePersona,
): Promise<VoiceScript> => {
  return composeVoiceScript(brandId, {
    text: systemAnswer,
    context: 'response',
    persona: persona ?? 'amigo-experto',
    emotionalTone: 'positive',
    maxDurationSec: 60,
    includeSSML: true,
  });
};
