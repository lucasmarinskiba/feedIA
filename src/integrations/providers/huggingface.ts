/**
 * Hugging Face Inference API — acceso a miles de modelos open-source.
 * Docs: https://huggingface.co/docs/api-inference
 * Free tier: requests limitadas, sin GPU dedicada.
 */

const HF_API_BASE = 'https://api-inference.huggingface.co/models';

const getToken = (): string | null => process.env['HUGGINGFACE_TOKEN'] ?? null;

export const isHuggingFaceAvailable = (): boolean => Boolean(getToken());

// ── Modelos recomendados por tarea ─────────────────────────────────────────
export const HF_MODELS = {
  // Texto → Texto (chat / instrucciones)
  chat: [
    'mistralai/Mistral-7B-Instruct-v0.3',
    'meta-llama/Llama-3.2-3B-Instruct',
    'google/gemma-2-2b-it',
    'microsoft/Phi-3.5-mini-instruct',
  ],
  // Análisis de sentimiento
  sentiment: [
    'cardiffnlp/twitter-roberta-base-sentiment-latest',
    'lxyuan/distilbert-base-multilingual-cased-sentiments-student',
  ],
  // Clasificación de texto
  classification: ['facebook/bart-large-mnli', 'typeform/distilbert-base-uncased-mnli'],
  // Generación de imágenes
  imageGen: [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'runwayml/stable-diffusion-v1-5',
  ],
  // Embeddings
  embeddings: ['sentence-transformers/all-MiniLM-L6-v2', 'BAAI/bge-small-en-v1.5'],
  // OCR/Vision
  vision: ['Salesforce/blip-image-captioning-large', 'google/vit-base-patch16-224'],
} as const;

export interface HFTextGenOptions {
  model?: string;
  maxNewTokens?: number;
  temperature?: number;
  returnFullText?: boolean;
}

export interface HFResult<T = string> {
  ok: boolean;
  data: T | null;
  model: string;
  durationMs: number;
  error?: string;
}

const hfRequest = async <T>(model: string, payload: unknown, timeoutMs = 30000): Promise<HFResult<T>> => {
  const token = getToken();
  if (!token) return { ok: false, data: null, model, durationMs: 0, error: 'HUGGINGFACE_TOKEN no configurado' };

  const start = Date.now();
  try {
    const response = await fetch(`${HF_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!response.ok) {
      const err = await response.text();
      // 503 = modelo cargando, puede reintentar
      return {
        ok: false,
        data: null,
        model,
        durationMs: Date.now() - start,
        error: `HF ${response.status}: ${err.slice(0, 200)}`,
      };
    }

    const data = (await response.json()) as T;
    return { ok: true, data, model, durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, data: null, model, durationMs: Date.now() - start, error: (err as Error).message };
  }
};

export const hfGenerateText = async (prompt: string, opts: HFTextGenOptions = {}): Promise<HFResult<string>> => {
  const model = opts.model ?? HF_MODELS.chat[0];
  const result = await hfRequest<Array<{ generated_text: string }>>(model, {
    inputs: prompt,
    parameters: {
      max_new_tokens: opts.maxNewTokens ?? 512,
      temperature: opts.temperature ?? 0.7,
      return_full_text: opts.returnFullText ?? false,
    },
  });

  if (!result.ok || !result.data) return { ...result, data: null };
  const text = result.data[0]?.generated_text ?? '';
  return { ...result, data: text };
};

export const hfSentimentAnalysis = async (
  text: string,
  model = HF_MODELS.sentiment[0],
): Promise<HFResult<Array<{ label: string; score: number }>>> => hfRequest(model, { inputs: text });

export const hfZeroShotClassification = async (
  text: string,
  labels: string[],
  model = HF_MODELS.classification[0],
): Promise<HFResult<{ sequence: string; labels: string[]; scores: number[] }>> =>
  hfRequest(model, {
    inputs: text,
    parameters: { candidate_labels: labels },
  });

export const hfGenerateImage = async (prompt: string, model = HF_MODELS.imageGen[0]): Promise<HFResult<string>> => {
  const token = getToken();
  if (!token) return { ok: false, data: null, model, durationMs: 0, error: 'HUGGINGFACE_TOKEN no configurado' };

  const start = Date.now();
  try {
    const response = await fetch(`${HF_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
        'x-wait-for-model': 'true',
      },
      body: JSON.stringify({ inputs: prompt }),
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const err = await response.text();
      return {
        ok: false,
        data: null,
        model,
        durationMs: Date.now() - start,
        error: `HF Image ${response.status}: ${err.slice(0, 200)}`,
      };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const base64 = `data:image/png;base64,${buffer.toString('base64')}`;
    return { ok: true, data: base64, model, durationMs: Date.now() - start };
  } catch (err) {
    return { ok: false, data: null, model, durationMs: Date.now() - start, error: (err as Error).message };
  }
};

export const hfEmbeddings = async (text: string, model = HF_MODELS.embeddings[0]): Promise<HFResult<number[]>> => {
  const result = await hfRequest<number[]>(model, { inputs: text });
  return result;
};
