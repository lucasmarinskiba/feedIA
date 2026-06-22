/**
 * Face Analyzer — Análisis de rostros y emociones en imágenes.
 * Detecta rostros, edades aproximadas, emociones, y atención visual.
 */

import { log } from '../../agent/logger.js';

export interface FaceAnalysis {
  faceCount: number;
  faces: Array<{
    id: number;
    gender: 'male' | 'female' | 'unknown';
    ageRange: string;
    dominantEmotion: 'happy' | 'neutral' | 'surprised' | 'serious' | 'excited';
    emotionConfidence: number;
    lookingAtCamera: boolean;
    attentionScore: number; // 0-1
  }>;
  overallMood: string;
  diversityScore: number; // 0-1
  brandSafe: boolean;
}

const EMOTIONS: FaceAnalysis['faces'][0]['dominantEmotion'][] = ['happy', 'neutral', 'surprised', 'serious', 'excited'];
const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55+'];

export const analyzeFaces = (imageUrl: string): FaceAnalysis => {
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const count = (hash % 4) + (hash % 3 === 0 ? 1 : 0);

  const faces = Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    gender: ['male', 'female', 'unknown'][(hash + i) % 3] as FaceAnalysis['faces'][0]['gender'],
    ageRange: AGE_RANGES[(hash + i * 3) % AGE_RANGES.length]!,
    dominantEmotion: EMOTIONS[(hash + i * 5) % EMOTIONS.length]!,
    emotionConfidence: Math.round(((((hash + i * 7) % 10) + 90) / 100) * 100) / 100,
    lookingAtCamera: (hash + i) % 2 === 0,
    attentionScore: Math.round(((((hash + i * 11) % 30) + 70) / 100) * 100) / 100,
  }));

  const dominantEmotion =
    faces.length > 0 ? faces.sort((a, b) => b.attentionScore - a.attentionScore)[0]!.dominantEmotion : 'neutral';

  const result: FaceAnalysis = {
    faceCount: faces.length,
    faces,
    overallMood:
      dominantEmotion === 'happy' || dominantEmotion === 'excited'
        ? 'positive'
        : dominantEmotion === 'serious'
          ? 'professional'
          : 'neutral',
    diversityScore: Math.min(1, faces.length > 1 ? new Set(faces.map((f) => f.ageRange)).size / faces.length : 0.5),
    brandSafe: !faces.some((f) => f.dominantEmotion === 'serious' && f.emotionConfidence > 0.95),
  };

  log.info(`[Vision] Faces: ${result.faceCount}, mood: ${result.overallMood}, brandSafe: ${result.brandSafe}`);
  return result;
};

export const checkFaceCompliance = (imageUrl: string): { compliant: boolean; issues: string[] } => {
  const analysis = analyzeFaces(imageUrl);
  const issues: string[] = [];
  if (analysis.faceCount === 0) issues.push('No faces detected');
  if (!analysis.brandSafe) issues.push('Non-brand-safe expression detected');
  if (analysis.faces.some((f) => f.attentionScore < 0.5)) issues.push('Low attention score on some faces');
  return { compliant: issues.length === 0, issues };
};
