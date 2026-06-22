// @ts-nocheck
/**
 * Personality Engine — Evolución de personalidad del agente
 * Aprende tono, slang, manías de respuesta del usuario
 * Crea un "mapa de personalidad" por marca/usuario
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
// Reserved for semantic/episodic memory integration
// import * as semantic from '../memory/semanticMemory.js';
// import * as episodic from '../memory/episodicMemory.js';

const PERSONA_PATH = resolve('data/runtime/brain/personalities.json');

export interface PersonalityMap {
  brandOrUser: string;
  traits: Record<string, number>; // trait -> intensity (-1 to 1)
  preferredTone: string[];
  slangUsed: string[];
  responsePatterns: string[];
  emojiFrequency: number;
  sentenceLength: number; // avg words
  formality: number; // 0=casual, 1=formal
  humor: number; // 0=serious, 1=playful
  optimism: number; // 0=pessimistic, 1=optimistic
  updatedAt: string;
}

interface PersonaStore {
  personalities: PersonalityMap[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): PersonaStore => {
  try {
    ensureDir();
    if (!existsSync(PERSONA_PATH)) return { personalities: [] };
    return JSON.parse(readFileSync(PERSONA_PATH, 'utf-8')) as PersonaStore;
  } catch {
    return { personalities: [] };
  }
};

const saveStore = (store: PersonaStore): void => {
  ensureDir();
  writeFileSync(PERSONA_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// Analyze a conversation to update personality map
export const learnPersonality = (
  brandOrUser: string,
  messages: { role: 'user' | 'bot'; text: string }[],
): PersonalityMap => {
  const store = loadStore();
  let persona = store.personalities.find((p) => p.brandOrUser === brandOrUser);

  if (!persona) {
    persona = {
      brandOrUser,
      traits: {},
      preferredTone: [],
      slangUsed: [],
      responsePatterns: [],
      emojiFrequency: 0.3,
      sentenceLength: 12,
      formality: 0.5,
      humor: 0.5,
      optimism: 0.5,
      updatedAt: new Date().toISOString(),
    };
    store.personalities.push(persona);
  }

  const userMessages = messages.filter((m) => m.role === 'user');
  const allText = userMessages.map((m) => m.text).join(' ');

  // Update formality
  const formalMarkers = (allText.match(/\b(por favor|gracias|disculpe|le agradezco|usted|su)\b/gi) ?? []).length;
  const casualMarkers = (allText.match(/\b(holi|oye|dime|jaja|xd|lol|bro|amigo)\b/gi) ?? []).length;
  const totalWords = allText.split(/\s+/).length || 1;
  const formalityRatio = formalMarkers / (formalMarkers + casualMarkers + 1);
  persona.formality = movingAverage(persona.formality, formalityRatio, 0.3);

  // Update humor
  const jokeMarkers = (allText.match(/\b(jaja|xd|lol|😂|🤣|😅|jajaja)\b/gi) ?? []).length;
  const humorRatio = Math.min(1, jokeMarkers / (totalWords * 0.1 + 1));
  persona.humor = movingAverage(persona.humor, humorRatio, 0.3);

  // Update optimism
  const positiveWords = (allText.match(/\b(genial|perfecto|increíble|me encanta|feliz|amor|gracias|💪)\b/gi) ?? [])
    .length;
  const negativeWords = (allText.match(/\b(malo|odio|horrible|triste|decepcionado|problema|error|😤)\b/gi) ?? [])
    .length;
  const optimismRatio = positiveWords / (positiveWords + negativeWords + 1);
  persona.optimism = movingAverage(persona.optimism, optimismRatio, 0.3);

  // Update emoji frequency
  const emojis =
    allText.match(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
    ) ?? [];
  persona.emojiFrequency = movingAverage(persona.emojiFrequency, emojis.length / (totalWords + 1), 0.3);

  // Update sentence length
  const sentences = allText.split(/[.!?]+/).filter(Boolean);
  const avgLen = sentences.reduce((s, sent) => s + sent.split(/\s+/).length, 0) / (sentences.length || 1);
  persona.sentenceLength = movingAverage(persona.sentenceLength, avgLen, 0.3);

  // Extract slang
  const slang = extractSlang(allText);
  for (const s of slang) {
    if (!persona.slangUsed.includes(s)) persona.slangUsed.push(s);
  }
  persona.slangUsed = persona.slangUsed.slice(-20);

  // Detect preferred tone
  if (formalityRatio > 0.5) {
    if (!persona.preferredTone.includes('formal')) persona.preferredTone.push('formal');
  } else {
    if (!persona.preferredTone.includes('casual')) persona.preferredTone.push('casual');
  }
  if (humorRatio > 0.3 && !persona.preferredTone.includes('humoristico')) persona.preferredTone.push('humoristico');
  if (optimismRatio > 0.6 && !persona.preferredTone.includes('optimista')) persona.preferredTone.push('optimista');
  persona.preferredTone = [...new Set(persona.preferredTone)].slice(-5);

  persona.updatedAt = new Date().toISOString();
  saveStore(store);

  log.info(
    `[PersonalityEngine] Updated ${brandOrUser}: formality=${persona.formality.toFixed(2)}, humor=${persona.humor.toFixed(2)}`,
  );
  return persona;
};

// Get personality context for prompting
export const getPersonalityContext = (brandOrUser: string): string => {
  const store = loadStore();
  const persona = store.personalities.find((p) => p.brandOrUser === brandOrUser);
  if (!persona) return '';

  const lines = [
    `PERSONALIDAD DE "${brandOrUser}":`,
    `  - Formalidad: ${(persona.formality * 100).toFixed(0)}% (${persona.formality > 0.6 ? 'formal' : 'casual'})`,
    `  - Humor: ${(persona.humor * 100).toFixed(0)}% (${persona.humor > 0.5 ? 'juguetón' : 'serio'})`,
    `  - Optimismo: ${(persona.optimism * 100).toFixed(0)}%`,
    `  - Emojis: ${(persona.emojiFrequency * 100).toFixed(0)}% frecuencia`,
    `  - Longitud frase: ~${persona.sentenceLength.toFixed(0)} palabras`,
    `  - Tonos preferidos: ${persona.preferredTone.join(', ') || 'neutro'}`,
  ];

  if (persona.slangUsed.length > 0) {
    lines.push(`  - Slang usado: ${persona.slangUsed.join(', ')}`);
  }

  return lines.join('\n');
};

// Apply personality constraints to a response
export const applyPersonality = (text: string, brandOrUser: string): string => {
  const store = loadStore();
  const persona = store.personalities.find((p) => p.brandOrUser === brandOrUser);
  if (!persona) return text;

  let modified = text;

  // Adjust formality
  if (persona.formality > 0.7) {
    modified = modified.replace(/\bholi\b/gi, 'hola');
    modified = modified.replace(/\bxd\b/gi, '');
    modified = modified.replace(/\bbro\b/gi, '');
  } else if (persona.formality < 0.3) {
    // Keep it casual, maybe add warmth
  }

  // Adjust emoji
  if (persona.emojiFrequency < 0.1) {
    modified = modified.replace(
      /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu,
      '',
    );
  }

  // Adjust sentence length (basic trimming)
  const sentences = modified.split(/(?<=[.!?])\s+/);
  if (persona.sentenceLength < 8 && sentences.length > 0) {
    modified = sentences
      .map((s) =>
        s
          .split(/\s+/)
          .slice(0, persona.sentenceLength + 2)
          .join(' '),
      )
      .join(' ');
  }

  return modified.trim();
};

const movingAverage = (current: number, newValue: number, alpha = 0.3): number => {
  return current * (1 - alpha) + newValue * alpha;
};

const extractSlang = (text: string): string[] => {
  const slangPatterns = [
    /\bcringe\b/gi,
    /\bghostear\b/gi,
    /\bslay\b/gi,
    /\bvibes\b/gi,
    /\biconic\b/gi,
    /\bsnatched\b/gi,
    /\bmain character\b/gi,
    /\bred flag\b/gi,
    /\bglow up\b/gi,
    /\bsimp\b/gi,
    /\bcancelar\b/gi,
    /\btoxic\b/gi,
    /\bshippear\b/gi,
    /\bfan de\b/gi,
    /\bno cap\b/gi,
    /\bbased\b/gi,
    /\bstan\b/gi,
    /\btea\b/gi,
    /\bslayed\b/gi,
  ];
  const found: string[] = [];
  for (const pattern of slangPatterns) {
    const match = text.match(pattern);
    if (match) found.push(match[0].toLowerCase());
  }
  return [...new Set(found)];
};

export const getAllPersonalities = (): PersonalityMap[] => {
  return loadStore().personalities;
};
