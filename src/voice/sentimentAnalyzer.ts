/**
 * Sentiment Analyzer — Adapta el tono de respuesta según el estado emocional
 * del usuario detectado en comandos de voz.
 * ─────────────────────────────────────────────────────────────────────────
 * Capas:
 *   1. Lexicon local (es/en/pt) — palabras positivas/negativas/intensas
 *   2. Intensidad — mayúsculas, signos de exclamación, repetición
 *   3. API fallback (opcional) — Claude/Groq para análisis nuanced
 *
 * Resultado: sentiment score (-1 a +1) + emotion label + tone recommendation
 */

export interface SentimentResult {
  score: number; // -1.0 (muy negativo) → +1.0 (muy positivo)
  magnitude: number; // 0.0 → 1.0 intensidad
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive' | 'urgent' | 'frustrated';
  tone: 'empathetic' | 'professional' | 'enthusiastic' | 'calm' | 'urgent' | 'reassuring';
  keywords: string[];
}

/* ── Lexicons ────────────────────────────────────────────────────────────── */

const POSITIVE_ES = [
  'bien',
  'excelente',
  'genial',
  'gracias',
  'feliz',
  'contento',
  'me gusta',
  'perfecto',
  'increíble',
  'brillante',
  'maravilloso',
  'espectacular',
  'fantástico',
];
const NEGATIVE_ES = [
  'mal',
  'malo',
  'horrible',
  'terrible',
  'odio',
  'enojado',
  'frustrado',
  'estúpido',
  'inepto',
  'basura',
  'peor',
  'no sirve',
  'no funciona',
  'qué pasa',
  'qué onda',
];
const URGENT_ES = [
  'urgente',
  'ya',
  'ahora',
  'inmediato',
  'rápido',
  'apúrate',
  'date prisa',
  'esperando',
  'demora',
  'tarda',
];
const FRUSTRATED_ES = [
  'de nuevo',
  'otra vez',
  'siempre',
  'nunca',
  'cansado',
  'harto',
  'podrías',
  'deberías',
  'por qué no',
];

const POSITIVE_EN = [
  'good',
  'great',
  'awesome',
  'thanks',
  'happy',
  'like',
  'perfect',
  'amazing',
  'brilliant',
  'wonderful',
  'fantastic',
  'love',
  'excellent',
];
const NEGATIVE_EN = [
  'bad',
  'horrible',
  'terrible',
  'hate',
  'angry',
  'frustrated',
  'stupid',
  'useless',
  'garbage',
  'worst',
  'broken',
  'not working',
];
const URGENT_EN = ['urgent', 'now', 'immediately', 'quickly', 'hurry', 'waiting', 'delay', 'slow'];
const FRUSTRATED_EN = ['again', 'always', 'never', 'tired', 'fed up', 'could you', 'should', 'why not'];

const getLexicon = (lang: string): { pos: string[]; neg: string[]; urg: string[]; frust: string[] } => {
  const l = lang.slice(0, 2);
  if (l === 'es') return { pos: POSITIVE_ES, neg: NEGATIVE_ES, urg: URGENT_ES, frust: FRUSTRATED_ES };
  if (l === 'pt') return { pos: POSITIVE_ES, neg: NEGATIVE_ES, urg: URGENT_ES, frust: FRUSTRATED_ES }; // similar enough
  return { pos: POSITIVE_EN, neg: NEGATIVE_EN, urg: URGENT_EN, frust: FRUSTRATED_EN };
};

/* ── Analysis Engine ─────────────────────────────────────────────────────── */

export const analyzeSentiment = (text: string, lang = 'es'): SentimentResult => {
  const lower = text.toLowerCase();
  const lex = getLexicon(lang);
  const keywords: string[] = [];

  let score = 0;
  let magnitude = 0;

  // Word-level scoring
  for (const word of lex.pos) {
    if (lower.includes(word)) {
      score += 0.25;
      magnitude += 0.15;
      keywords.push(word);
    }
  }
  for (const word of lex.neg) {
    if (lower.includes(word)) {
      score -= 0.3;
      magnitude += 0.2;
      keywords.push(word);
    }
  }
  for (const word of lex.urg) {
    if (lower.includes(word)) {
      magnitude += 0.35;
      keywords.push(word);
    }
  }
  for (const word of lex.frust) {
    if (lower.includes(word)) {
      score -= 0.15;
      magnitude += 0.2;
      keywords.push(word);
    }
  }

  // Intensity markers
  const capsRatio = (text.match(/[A-Z]/g) || []).length / Math.max(1, text.length);
  if (capsRatio > 0.3) magnitude += 0.2;

  const exclCount = (text.match(/!/g) || []).length;
  magnitude += Math.min(0.3, exclCount * 0.1);

  const questionCount = (text.match(/\?/g) || []).length;
  if (questionCount > 1) magnitude += 0.1;

  // Repeated letters (stretching)
  if (/([a-z])\1{2,}/i.test(text)) magnitude += 0.15;

  // Clamp
  score = Math.max(-1, Math.min(1, score));
  magnitude = Math.max(0, Math.min(1, magnitude));

  // Label selection
  let label: SentimentResult['label'] = 'neutral';
  if (magnitude > 0.5 && keywords.some((k) => lex.urg.includes(k))) {
    label = 'urgent';
  } else if (magnitude > 0.4 && score < -0.2) {
    label = keywords.some((k) => lex.frust.includes(k)) ? 'frustrated' : 'very_negative';
  } else if (score < -0.5) {
    label = 'very_negative';
  } else if (score < -0.15) {
    label = 'negative';
  } else if (score > 0.5) {
    label = 'very_positive';
  } else if (score > 0.15) {
    label = 'positive';
  }

  // Tone recommendation
  const toneMap: Record<string, SentimentResult['tone']> = {
    very_negative: 'empathetic',
    negative: 'empathetic',
    frustrated: 'reassuring',
    neutral: 'professional',
    positive: 'enthusiastic',
    very_positive: 'enthusiastic',
    urgent: 'urgent',
  };

  return {
    score,
    magnitude,
    label,
    tone: toneMap[label] ?? 'professional',
    keywords: [...new Set(keywords)],
  };
};

/**
 * Adapta un texto de respuesta según el tono recomendado.
 */
export const adaptTone = (text: string, tone: SentimentResult['tone'], lang = 'es'): string => {
  const prefixes: Record<string, Record<string, string>> = {
    empathetic: {
      es: 'Entiendo, ',
      en: 'I understand, ',
    },
    reassuring: {
      es: 'No te preocupes, ',
      en: "Don't worry, ",
    },
    urgent: {
      es: '¡Listo! ',
      en: 'Done! ',
    },
    enthusiastic: {
      es: '¡Genial! ',
      en: 'Great! ',
    },
  };

  const prefix = prefixes[tone]?.[lang.slice(0, 2)] ?? '';
  if (!prefix || text.startsWith(prefix)) return text;
  return prefix + text;
};

/**
 * Análisis enriquecido vía API (opcional, si hay API key disponible).
 */
export const analyzeSentimentWithAPI = async (text: string, lang = 'es'): Promise<SentimentResult> => {
  const local = analyzeSentiment(text, lang);

  // Si no hay API key, devolvemos local
  if (!process.env['ANTHROPIC_API_KEY']) return local;

  try {
    const { claude } = await import('../agent/claude.js');
    const response = await claude.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 100,
      system:
        'You are a sentiment analyzer. Respond ONLY with a JSON object: {"score": number -1 to 1, "label": string, "tone": string}',
      messages: [{ role: 'user', content: `Analyze sentiment: "${text}"` }],
    });
    const content = response.content[0];
    if (content && content.type === 'text') {
      const parsed = JSON.parse((content as unknown as { text: string }).text) as {
        score: number;
        label: string;
        tone: string;
      };
      return {
        score: Math.max(-1, Math.min(1, parsed.score)),
        magnitude: local.magnitude,
        label: parsed.label as SentimentResult['label'],
        tone: parsed.tone as SentimentResult['tone'],
        keywords: local.keywords,
      };
    }
  } catch {
    // Fallback to local
  }

  return local;
};
