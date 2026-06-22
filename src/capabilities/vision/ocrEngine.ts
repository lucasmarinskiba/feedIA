/**
 * OCR Engine — Reconocimiento de texto en imágenes.
 * Extrae texto visible, detecta idioma, y estructura el contenido.
 */

import { log } from '../../agent/logger.js';

export interface OcrResult {
  rawText: string;
  structuredBlocks: Array<{
    text: string;
    confidence: number;
    type: 'headline' | 'body' | 'cta' | 'hashtag' | 'handle';
  }>;
  detectedLanguage: string;
  wordCount: number;
  hasCTA: boolean;
  hashtags: string[];
  mentions: string[];
  confidence: number;
}

const detectType = (text: string): OcrResult['structuredBlocks'][0]['type'] => {
  if (text.startsWith('#')) return 'hashtag';
  if (text.startsWith('@')) return 'handle';
  if (/^(comprar|click|link|swipe|desliza|cta|más info|shop now)/i.test(text)) return 'cta';
  if (text.length < 20) return 'headline';
  return 'body';
};

export const extractText = (imageUrl: string): OcrResult => {
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);

  // Simulated text extraction
  const texts = [
    'Descubrí el secreto del engagement',
    '#MarketingDigital #Crecimiento',
    '@tuMarca',
    'Swipe up para más',
    'El algoritmo premia la consistencia y el valor real.',
  ];

  const selected = texts.slice(0, (hash % 4) + 1);
  const rawText = selected.join('\n');

  const blocks = selected.map((text) => ({
    text,
    confidence: Math.round((((hash % 10) + 90) / 100) * 100) / 100,
    type: detectType(text),
  }));

  const hashtags = blocks.filter((b) => b.type === 'hashtag').map((b) => b.text);
  const mentions = blocks.filter((b) => b.type === 'handle').map((b) => b.text);

  const result: OcrResult = {
    rawText,
    structuredBlocks: blocks,
    detectedLanguage: 'es',
    wordCount: rawText.split(/\s+/).length,
    hasCTA: blocks.some((b) => b.type === 'cta'),
    hashtags,
    mentions,
    confidence: Math.round((blocks.reduce((s, b) => s + b.confidence, 0) / blocks.length) * 100) / 100,
  };

  log.info(`[OCR] Extracted ${result.wordCount} words, ${hashtags.length} hashtags from ${imageUrl.slice(0, 40)}...`);
  return result;
};

export const extractTextBatch = (urls: string[]): OcrResult[] => urls.map(extractText);
