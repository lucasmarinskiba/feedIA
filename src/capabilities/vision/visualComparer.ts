/**
 * Visual Comparer — Compara imágenes para detectar similitud y duplicados.
 * Usa hash perceptual simulado para comparación rápida.
 */

import { log } from '../../agent/logger.js';

export interface ComparisonResult {
  similarity: number; // 0-1
  isDuplicate: boolean;
  isSimilar: boolean;
  differences: string[];
  recommendedAction: 'keep_both' | 'keep_newer' | 'merge' | 'reject_duplicate';
}

const djb2Hash = (str: string): number => {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return Math.abs(hash);
};

const perceptualHash = (url: string): string => {
  const h = djb2Hash(url);
  return Array.from({ length: 16 }, (_, i) => ((h >> i) & 1).toString()).join('');
};

const hammingDistance = (a: string, b: string): number => {
  let dist = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] !== b[i]) dist++;
  }
  return dist;
};

export const compareImages = (urlA: string, urlB: string): ComparisonResult => {
  const hashA = perceptualHash(urlA);
  const hashB = perceptualHash(urlB);
  const dist = hammingDistance(hashA, hashB);
  const similarity = Math.max(0, 1 - dist / 16);

  const isDuplicate = similarity > 0.95;
  const isSimilar = similarity > 0.75;

  const differences: string[] = [];
  if (similarity < 0.5) differences.push('Significant visual differences');
  if (similarity > 0.8 && similarity < 0.95) differences.push('Minor variations detected');

  let recommendedAction: ComparisonResult['recommendedAction'] = 'keep_both';
  if (isDuplicate) recommendedAction = 'reject_duplicate';
  else if (isSimilar) recommendedAction = 'merge';

  log.info(`[Vision] Compare: ${similarity.toFixed(2)} similarity`);

  return { similarity, isDuplicate, isSimilar, differences, recommendedAction };
};

export const findSimilarImages = (
  queryUrl: string,
  candidates: string[],
  threshold = 0.75,
): Array<{ url: string; similarity: number }> => candidates
    .map((url) => ({ url, similarity: compareImages(queryUrl, url).similarity }))
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
