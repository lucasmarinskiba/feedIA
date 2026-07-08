/**
 * Gemini Vision Client
 * Real model integration for vision analysis + text embeddings.
 *
 * Reuses GEMINI_API_KEY — already configured elsewhere in this project for
 * nano-banana image generation (api/_brandStudio.js). No new provider account
 * needed. This replaces the hash-based/hardcoded placeholders in
 * facial-identity-preservation.ts, image-upload-handler.ts, and
 * neural-embedding-service.ts with real model output.
 *
 * Degrades gracefully: every function returns `null` (never throws) when
 * GEMINI_API_KEY is unset or the API call fails, so callers can fall back to
 * their existing placeholder defaults instead of crashing the pipeline.
 */

import { readFile } from 'node:fs/promises';
import { log } from '../agent/logger.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// gemini-2.0-flash returned 429 (quota=0 on free tier) when tested live;
// gemini-2.5-flash works correctly for both vision + JSON response mode.
const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-2.5-flash';
// text-embedding-004 is deprecated; gemini-embedding-001 is the current model
// (verified live: returns 3072-dim vectors, not 768 — see neural-embedding-service.ts)
const EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001';

export const isGeminiConfigured = (): boolean => Boolean(GEMINI_API_KEY);

const mimeFromExt = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
};

/**
 * Call Gemini's vision model with an image + a JSON-schema instruction,
 * parse the model's JSON response. Returns null on any failure so callers
 * can fall back to placeholder defaults.
 */
async function callGeminiVisionJSON<T>(
  imagePathOrBase64: string,
  instructionPrompt: string
): Promise<T | null> {
  if (!GEMINI_API_KEY) {
    log.warn('[GeminiVision] GEMINI_API_KEY not set — skipping real vision analysis, caller will use placeholder');
    return null;
  }

  try {
    let base64Data: string;
    let mimeType: string;

    if (imagePathOrBase64.startsWith('data:')) {
      const match = /^data:([^;]+);base64,(.+)$/s.exec(imagePathOrBase64);
      if (!match) return null;
      mimeType = match[1]!;
      base64Data = match[2]!;
    } else {
      const buffer = await readFile(imagePathOrBase64);
      base64Data = buffer.toString('base64');
      mimeType = mimeFromExt(imagePathOrBase64);
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: instructionPrompt },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            },
          ],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      log.warn('[GeminiVision] API call failed', { status: response.status, body: body.slice(0, 200) });
      return null;
    }

    const json = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      log.warn('[GeminiVision] No text in response');
      return null;
    }

    return JSON.parse(text) as T;
  } catch (error) {
    log.warn('[GeminiVision] Vision analysis threw', { error: String(error) });
    return null;
  }
}

/**
 * Real facial landmark extraction via Gemini vision, matching the shape
 * consumed by facial-identity-preservation.ts's FacialLandmarks interface.
 */
export interface RealFacialAnalysis {
  faceShape: string;
  eyeShape: string;
  eyeColor: string;
  eyeSpacing: string;
  eyebrowShape: string;
  noseShape: string;
  lipShape: string;
  jawline: string;
  cheekbones: string;
  skinTone: string;
  skinTexture: string;
  distinguishingMarks: string[];
  facialHair: string | null;
  hairColor: string;
  hairTexture: string;
  hairLength: string;
  estimatedAge: string;
  estimatedGender: string;
  confidence: number; // 0-100, model's own confidence in the read
}

export async function analyzeFacialFeatures(imagePathOrBase64: string): Promise<RealFacialAnalysis | null> {
  const prompt = `Analyze the face in this photo with precision. Respond ONLY with JSON matching exactly this shape (no markdown, no explanation):
{
  "faceShape": "oval|round|square|heart|diamond|oblong",
  "eyeShape": "almond|round|monolid|hooded|downturned|upturned",
  "eyeColor": "<observed color>",
  "eyeSpacing": "close-set|average|wide-set",
  "eyebrowShape": "straight|arched|curved|angled",
  "noseShape": "straight|aquiline|button|wide|narrow",
  "lipShape": "full|thin|wide|heart-shaped|downturned",
  "jawline": "sharp|soft|square|round|pointed",
  "cheekbones": "high|low|prominent|subtle",
  "skinTone": "<descriptive tone, e.g. 'warm medium-brown'>",
  "skinTexture": "smooth|freckled|textured",
  "distinguishingMarks": ["<any moles, scars, freckle patterns, dimples visible — empty array if none>"],
  "facialHair": "<style or null if none/not applicable>",
  "hairColor": "<observed color>",
  "hairTexture": "straight|wavy|curly|coily",
  "hairLength": "short|medium|long",
  "estimatedAge": "<age range like '25-35'>",
  "estimatedGender": "<observed presentation>",
  "confidence": <0-100 integer, how clearly the face was visible/analyzable>
}
If no face is clearly visible, set confidence to 0 and use your best guess for other fields.`;

  const result = await callGeminiVisionJSON<RealFacialAnalysis>(imagePathOrBase64, prompt);

  if (result) {
    log.info('[GeminiVision] Real facial analysis complete', {
      faceShape: result.faceShape,
      confidence: result.confidence,
    });
  }

  return result;
}

/**
 * Real image feature extraction (person/scene/emotion/palette/quality),
 * matching the shape consumed by image-upload-handler.ts's extractImageFeatures.
 */
export interface RealImageAnalysis {
  person: {
    detected: boolean;
    age_range: string;
    gender: string;
    ethnicity: string;
    expression: string;
  };
  scene: {
    location_type: string;
    lighting: string;
    time_of_day: string;
  };
  emotion: {
    primary: string;
    secondary: string | null;
    confidence: number;
  };
  palette: {
    dominant_colors: string[]; // hex codes
    temperature: 'warm' | 'cool' | 'neutral';
    saturation: 'low' | 'medium' | 'high';
  };
  quality: {
    blur_score: number; // 0-1, 0=sharp
    brightness: number; // 0-1
    contrast: number; // 0-1
  };
}

export async function analyzeImageFeatures(imagePathOrBase64: string): Promise<RealImageAnalysis | null> {
  const prompt = `Analyze this image and respond ONLY with JSON matching exactly this shape (no markdown, no explanation):
{
  "person": {
    "detected": <boolean>,
    "age_range": "<e.g. '25-35' or 'unknown' if no person>",
    "gender": "<observed presentation or 'unknown'>",
    "ethnicity": "<observed or 'unknown'>",
    "expression": "<e.g. 'smiling', 'neutral', 'serious'>"
  },
  "scene": {
    "location_type": "indoor|outdoor|studio|unknown",
    "lighting": "<e.g. 'natural', 'studio', 'golden-hour', 'low-light'>",
    "time_of_day": "<e.g. 'day', 'evening', 'unknown'>"
  },
  "emotion": {
    "primary": "<dominant emotion conveyed>",
    "secondary": "<secondary emotion or null>",
    "confidence": <0-1 float>
  },
  "palette": {
    "dominant_colors": ["#hex1", "#hex2", "#hex3"],
    "temperature": "warm|cool|neutral",
    "saturation": "low|medium|high"
  },
  "quality": {
    "blur_score": <0-1 float, 0=perfectly sharp, 1=very blurry>,
    "brightness": <0-1 float>,
    "contrast": <0-1 float>
  }
}`;

  return callGeminiVisionJSON<RealImageAnalysis>(imagePathOrBase64, prompt);
}

/**
 * Real text embedding via Gemini's gemini-embedding-001 model.
 * Returns a 3072-dimension vector (verified live against the real API — the
 * older text-embedding-004 name is deprecated and returns 404), or null on
 * failure (caller falls back to the deterministic hash-based simulation in
 * neural-embedding-service.ts).
 */
export async function generateRealTextEmbedding(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) {
    log.warn('[GeminiVision] GEMINI_API_KEY not set — skipping real embedding, caller will simulate');
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${EMBEDDING_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${EMBEDDING_MODEL}`,
          content: { parts: [{ text }] },
        }),
      }
    );

    if (!response.ok) {
      const body = await response.text();
      log.warn('[GeminiVision] Embedding call failed', { status: response.status, body: body.slice(0, 200) });
      return null;
    }

    const json = (await response.json()) as { embedding?: { values?: number[] } };
    const values = json.embedding?.values;
    if (!Array.isArray(values)) {
      log.warn('[GeminiVision] No embedding values in response');
      return null;
    }

    return values as number[];
  } catch (error) {
    log.warn('[GeminiVision] Embedding call threw', { error: String(error) });
    return null;
  }
}

/**
 * Real image "embedding" via caption-then-embed: Gemini vision describes the
 * image richly, then that description is embedded with the real text
 * embedding model. This is NOT a true joint image/text embedding space like
 * CLIP — captions lose some visual nuance — but it is real model output
 * (not simulated), works with the API already configured in this project,
 * and is a well-established pattern when a dedicated CLIP deployment isn't
 * available. Documented honestly so this isn't mistaken for CLIP-equivalent.
 */
export async function generateRealImageEmbeddingViaCaption(
  imagePathOrBase64: string
): Promise<{ embedding: number[]; caption: string } | null> {
  if (!GEMINI_API_KEY) return null;

  const captionPrompt = `Describe this image in rich visual detail for a semantic search index: subjects, composition, colors, mood, setting, notable objects. Respond ONLY with JSON: {"caption": "<detailed description, 2-4 sentences>"}`;

  const captionResult = await callGeminiVisionJSON<{ caption: string }>(imagePathOrBase64, captionPrompt);
  if (!captionResult?.caption) return null;

  const embedding = await generateRealTextEmbedding(captionResult.caption);
  if (!embedding) return null;

  return { embedding, caption: captionResult.caption };
}
