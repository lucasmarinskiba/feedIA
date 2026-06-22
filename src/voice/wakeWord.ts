/**
 * Patrones de activación de voz para Talía en 20+ idiomas.
 * El usuario dice una frase y el sistema se activa en modo manos libres.
 */

export interface WakeWordMatch {
  matched: boolean;
  language: string;
  phrase: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface WakePhrase {
  pattern: RegExp;
  language: string;
  displayText: string;
}

// ── Frases de activación en múltiples idiomas ──────────────────────────────
export const WAKE_PHRASES: WakePhrase[] = [
  // Español (Argentina / LATAM)
  {
    pattern: /\b(hola\s+tal[ií]a|hey\s+tal[ií]a|ok\s+tal[ií]a|eh\s+tal[ií]a|ey\s+tal[ií]a)\b/i,
    language: 'es-AR',
    displayText: 'Hola Talía',
  },
  {
    pattern: /\b(tal[ií]a[,\s]+(ayud[aá]me|necesito|quiero|por\s+favor))\b/i,
    language: 'es-AR',
    displayText: 'Talía, ayúdame',
  },
  {
    pattern: /\b(activ[aá](te|r(se)?)\s+tal[ií]a|despierta\s+tal[ií]a)\b/i,
    language: 'es-AR',
    displayText: 'Actívate Talía',
  },
  {
    pattern: /\btal[ií]a\s+modo\s+(auto(m[aá]tico)?|manos\s+libres)\b/i,
    language: 'es-AR',
    displayText: 'Talía modo automático',
  },

  // Español (España)
  { pattern: /\b(hola\s+tal[ií]a|oye\s+tal[ií]a|venga\s+tal[ií]a)\b/i, language: 'es-ES', displayText: 'Hola Talía' },

  // English
  {
    pattern: /\b(hey\s+talia|hi\s+talia|ok\s+talia|okay\s+talia|hello\s+talia)\b/i,
    language: 'en-US',
    displayText: 'Hey Talia',
  },
  { pattern: /\b(talia[,\s]+(help|i\s+need|please|can\s+you))\b/i, language: 'en-US', displayText: 'Talia, help' },
  {
    pattern: /\b(wake\s+up\s+talia|activate\s+talia|talia\s+mode)\b/i,
    language: 'en-US',
    displayText: 'Wake up Talia',
  },

  // Português (Brasil)
  { pattern: /\b(ol[aá]\s+t[aá]lia|ei\s+t[aá]lia|hey\s+t[aá]lia)\b/i, language: 'pt-BR', displayText: 'Olá Tália' },
  { pattern: /\bt[aá]lia[,\s]+(me\s+ajud[ae]|preciso|quero)\b/i, language: 'pt-BR', displayText: 'Tália, me ajuda' },

  // Français
  {
    pattern: /\b(bonjour\s+talia|salut\s+talia|hey\s+talia|all[oô]\s+talia)\b/i,
    language: 'fr-FR',
    displayText: 'Bonjour Talia',
  },

  // Italiano
  { pattern: /\b(ciao\s+talia|ehi\s+talia|hey\s+talia)\b/i, language: 'it-IT', displayText: 'Ciao Talia' },

  // Deutsch
  { pattern: /\b(hallo\s+talia|hey\s+talia|hej\s+talia)\b/i, language: 'de-DE', displayText: 'Hallo Talia' },

  // 中文 (Mandarin - pinyin fallback)
  {
    pattern: /\b(n[ií]\s*h[aā]o?\s+talia|talia\s+[nǎnh][ǐi]?\s*h[aā]o?)\b/i,
    language: 'zh-CN',
    displayText: 'Nǐ hǎo Talia',
  },

  // 日本語 (romaji fallback)
  { pattern: /\b(konnichiwa\s+talia|ossu\s+talia|hey\s+talia)\b/i, language: 'ja-JP', displayText: 'こんにちは Talia' },

  // 한국어 (romaji fallback)
  { pattern: /\b(annyeong\s+talia|talia\s+annyeong)\b/i, language: 'ko-KR', displayText: '안녕 Talia' },

  // Русский (transliteration)
  { pattern: /\b(privet\s+talia|hey\s+talia\s+privet)\b/i, language: 'ru-RU', displayText: 'Привет Талия' },

  // العربية (transliteration)
  { pattern: /\b(marhaba\s+talia|ahlan\s+talia)\b/i, language: 'ar-SA', displayText: 'مرحبا تاليا' },

  // हिन्दी (transliteration)
  { pattern: /\b(namaste\s+talia|hello\s+talia)\b/i, language: 'hi-IN', displayText: 'नमस्ते Talia' },

  // Generic fallback - just "talia" alone
  { pattern: /^\s*tal[ií]a\s*$/i, language: 'es-AR', displayText: 'Talía' },
  { pattern: /^\s*talia\s*$/i, language: 'en-US', displayText: 'Talia' },
];

/**
 * Comandos post-activación (manos libres).
 * Después de activar Talía, el usuario puede decir estos comandos sin nombre.
 */
export const HANDS_FREE_COMMANDS: Record<string, { patterns: RegExp[]; intent: string; language: string }[]> = {
  grow: [
    {
      patterns: [/crecer?\s+(la\s+)?cuenta/i, /m[aá]s\s+seguidores/i, /crecimiento/i],
      intent: 'grow_account',
      language: 'es',
    },
    { patterns: [/grow\s+(the\s+)?account/i, /more\s+followers/i, /growth/i], intent: 'grow_account', language: 'en' },
    { patterns: [/crescer?\s+(a\s+)?conta/i, /mais\s+seguidores/i], intent: 'grow_account', language: 'pt' },
  ],
  content: [
    {
      patterns: [/crear?\s+contenido/i, /planif(icar)?/i, /semana\s+(de\s+)?contenido/i, /publicar/i],
      intent: 'create_content',
      language: 'es',
    },
    {
      patterns: [/create\s+content/i, /plan\s+(the\s+)?week/i, /post\s+something/i],
      intent: 'create_content',
      language: 'en',
    },
  ],
  analytics: [
    {
      patterns: [/analiza(r)?|m[eé]tricas|estad[ií]sticas|c[oó]mo\s+(estamos?|vamos?)/i],
      intent: 'show_analytics',
      language: 'es',
    },
    { patterns: [/analytics|metrics|stats|how\s+are\s+we\s+doing/i], intent: 'show_analytics', language: 'en' },
  ],
  dms: [
    { patterns: [/mensajes|dms?|inbox|responder?\s+mensajes/i], intent: 'check_dms', language: 'es' },
    { patterns: [/messages|dms?|check\s+inbox/i], intent: 'check_dms', language: 'en' },
  ],
  help: [
    { patterns: [/ayuda|ayud[aá]me|qu[eé]\s+pod[eé]s?\s+hacer/i], intent: 'help', language: 'es' },
    { patterns: [/help|what\s+can\s+you\s+do/i], intent: 'help', language: 'en' },
  ],
  stop: [
    { patterns: [/para(r)?|detener?|stop|suficiente|listo|gracias\s+tal[ií]a/i], intent: 'stop', language: 'es' },
    { patterns: [/stop|enough|done|thanks?\s+talia/i], intent: 'stop', language: 'en' },
  ],
};

/**
 * Detecta si un texto activa a Talía.
 */
export const detectWakeWord = (transcript: string): WakeWordMatch => {
  const text = transcript.trim().toLowerCase();

  for (const phrase of WAKE_PHRASES) {
    if (phrase.pattern.test(text)) {
      const wordCount = text.split(/\s+/).length;
      const confidence = wordCount <= 2 ? 'medium' : 'high';
      return {
        matched: true,
        language: phrase.language,
        phrase: phrase.displayText,
        confidence,
      };
    }
  }

  return { matched: false, language: 'es-AR', phrase: '', confidence: 'low' };
};

/**
 * Detecta el intent de un comando post-activación.
 */
export const detectHandsFreeIntent = (transcript: string): { intent: string; language: string } | null => {
  const text = transcript.trim();

  for (const intentGroup of Object.values(HANDS_FREE_COMMANDS)) {
    for (const entry of intentGroup) {
      if (entry.patterns.some((p) => p.test(text))) {
        return { intent: entry.intent, language: entry.language };
      }
    }
  }
  return null;
};

/**
 * Mapa de respuestas de activación por idioma.
 */
export const WAKE_RESPONSES: Record<string, string[]> = {
  'es-AR': [
    '¡Hola! Soy Talía. ¿Cómo puedo ayudarte hoy?',
    '¡Acá estoy! ¿Qué necesitás?',
    'Listo para trabajar. ¿Qué hacemos hoy?',
    '¡Hola! Decime qué necesitás y lo resuelvo.',
  ],
  'es-ES': ['¡Hola! Soy Talía. ¿En qué puedo ayudarte?', '¡Aquí estoy! ¿Qué necesitas?'],
  'en-US': ["Hi! I'm Talia. How can I help you today?", 'Ready! What do you need?', "I'm here. What can I do for you?"],
  'pt-BR': ['Olá! Sou a Tália. Como posso te ajudar?', 'Aqui estou! O que você precisa?'],
  'fr-FR': ['Bonjour! Je suis Talia. Comment puis-je vous aider?'],
  'de-DE': ['Hallo! Ich bin Talia. Wie kann ich helfen?'],
};

export const getWakeResponse = (language: string): string => {
  const responses = WAKE_RESPONSES[language] ?? WAKE_RESPONSES['es-AR']!;
  return responses[Math.floor(Math.random() * responses.length)]!;
};

/**
 * Opciones de menú manos libres para mostrar en UI.
 */
export const HANDS_FREE_MENU = [
  { icon: '🚀', label: 'Crecer cuenta', command: 'Talía, ayúdame a crecer la cuenta', intent: 'grow_account' },
  { icon: '📅', label: 'Planificar semana', command: 'Planificá la semana completa', intent: 'create_content' },
  { icon: '📊', label: 'Ver métricas', command: 'Mostrá las métricas de esta semana', intent: 'show_analytics' },
  { icon: '💬', label: 'Revisar DMs', command: 'Revisá los mensajes directos', intent: 'check_dms' },
  { icon: '🎨', label: 'Crear contenido', command: 'Creá 3 reels para esta semana', intent: 'create_content' },
  {
    icon: '🔍',
    label: 'Analizar competencia',
    command: 'Analizá qué está haciendo la competencia',
    intent: 'analytics',
  },
  { icon: '🤖', label: 'Modo automático', command: 'Activá el autopilot semanal', intent: 'autopilot' },
  { icon: '❓', label: '¿Qué podés hacer?', command: '¿Qué podés hacer?', intent: 'help' },
];
