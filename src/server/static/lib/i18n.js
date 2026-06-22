/* ══════════════════════════════════════════════════════════════════════════════
   i18n — Lightweight client-side internationalization
   ──────────────────────────────────────────────────────────────────────────────
   Zero-dependency. Browser-native. Detects language from the browser, allows
   manual override (persisted in localStorage), and exposes a `t()` helper plus
   a change-subscription so views can re-render on language switch.

   Supported: es (default), en, pt, fr, it, de. Falls back to es for any
   missing key so the UI never shows raw keys.
   ══════════════════════════════════════════════════════════════════════════════ */

export const SUPPORTED_LANGS = [
  { code: 'es', label: 'Español', flag: '🌎', speech: 'es-MX' },
  { code: 'en', label: 'English', flag: '🇺🇸', speech: 'en-US' },
  { code: 'pt', label: 'Português', flag: '🇧🇷', speech: 'pt-BR' },
  { code: 'fr', label: 'Français', flag: '🇫🇷', speech: 'fr-FR' },
  { code: 'it', label: 'Italiano', flag: '🇮🇹', speech: 'it-IT' },
  { code: 'de', label: 'Deutsch', flag: '🇩🇪', speech: 'de-DE' },
];

const DICT = {
  es: {
    'voice.wake': 'Hola FeedIA',
    'voice.listening': 'Escuchando…',
    'voice.processing': 'Procesando…',
    'voice.speaking': 'FeedIA está respondiendo…',
    'voice.idle': 'Decí "Hola FeedIA" para activar',
    'voice.tapToSpeak': 'Tocá para hablar',
    'voice.notSupported': 'Tu navegador no soporta reconocimiento de voz. Usá Chrome o Edge.',
    'voice.micDenied': 'Permiso de micrófono denegado. Habilitalo para usar manos libres.',
    'voice.greeting': 'Hola, soy FeedIA. ¿En qué te ayudo hoy?',
    'voice.didntCatch': 'No te entendí bien. ¿Lo repetís?',
    'voice.suggestions': 'Probá decir:',
    'voice.s1': 'Ayudame a crecer la cuenta',
    'voice.s2': 'Generá un carrusel viral',
    'voice.s3': '¿Cuál es el mejor horario para publicar?',
    'voice.s4': 'Lanzá una misión de autoridad',
    'voice.cancel': 'Cancelar',
    'voice.enable': 'Activar voz manos libres',
    'voice.disable': 'Desactivar voz',
    'voice.openMic': 'Abrir micrófono',
    'settings.voice': 'Voz y manos libres',
    'settings.language': 'Idioma',
    'settings.voiceEnabled': 'Activación por voz ("Hola FeedIA")',
    'settings.ttsEnabled': 'FeedIA responde con voz',
    'settings.voicePick': 'Voz de FeedIA',
    'settings.rate': 'Velocidad',
    'settings.pitch': 'Tono',
    'settings.test': 'Probar voz',
    'common.you': 'Vos',
  },
  en: {
    'voice.wake': 'Hello FeedIA',
    'voice.listening': 'Listening…',
    'voice.processing': 'Processing…',
    'voice.speaking': 'FeedIA is replying…',
    'voice.idle': 'Say "Hello FeedIA" to activate',
    'voice.tapToSpeak': 'Tap to speak',
    'voice.notSupported': 'Your browser does not support speech recognition. Use Chrome or Edge.',
    'voice.micDenied': 'Microphone permission denied. Enable it to use hands-free.',
    'voice.greeting': "Hi, I'm FeedIA. How can I help you today?",
    'voice.didntCatch': "I didn't catch that. Can you repeat?",
    'voice.suggestions': 'Try saying:',
    'voice.s1': 'Help me grow the account',
    'voice.s2': 'Generate a viral carousel',
    'voice.s3': 'What is the best time to post?',
    'voice.s4': 'Launch an authority mission',
    'voice.cancel': 'Cancel',
    'voice.enable': 'Enable hands-free voice',
    'voice.disable': 'Disable voice',
    'voice.openMic': 'Open microphone',
    'settings.voice': 'Voice & hands-free',
    'settings.language': 'Language',
    'settings.voiceEnabled': 'Voice activation ("Hello FeedIA")',
    'settings.ttsEnabled': 'FeedIA replies with voice',
    'settings.voicePick': "FeedIA's voice",
    'settings.rate': 'Speed',
    'settings.pitch': 'Pitch',
    'settings.test': 'Test voice',
    'common.you': 'You',
  },
  pt: {
    'voice.wake': 'Olá FeedIA',
    'voice.listening': 'Ouvindo…',
    'voice.processing': 'Processando…',
    'voice.speaking': 'FeedIA está respondendo…',
    'voice.idle': 'Diga "Olá FeedIA" para ativar',
    'voice.tapToSpeak': 'Toque para falar',
    'voice.notSupported': 'Seu navegador não suporta reconhecimento de voz. Use Chrome ou Edge.',
    'voice.micDenied': 'Permissão de microfone negada. Ative para usar mãos-livres.',
    'voice.greeting': 'Oi, sou a FeedIA. Como posso te ajudar hoje?',
    'voice.didntCatch': 'Não entendi bem. Pode repetir?',
    'voice.suggestions': 'Tente dizer:',
    'voice.s1': 'Me ajude a crescer a conta',
    'voice.s2': 'Gere um carrossel viral',
    'voice.s3': 'Qual o melhor horário para postar?',
    'voice.s4': 'Lance uma missão de autoridade',
    'voice.cancel': 'Cancelar',
    'voice.enable': 'Ativar voz mãos-livres',
    'voice.disable': 'Desativar voz',
    'voice.openMic': 'Abrir microfone',
    'settings.voice': 'Voz e mãos-livres',
    'settings.language': 'Idioma',
    'settings.voiceEnabled': 'Ativação por voz ("Olá FeedIA")',
    'settings.ttsEnabled': 'FeedIA responde com voz',
    'settings.voicePick': 'Voz da FeedIA',
    'settings.rate': 'Velocidade',
    'settings.pitch': 'Tom',
    'settings.test': 'Testar voz',
    'common.you': 'Você',
  },
  fr: {
    'voice.wake': 'Salut FeedIA',
    'voice.listening': 'Écoute…',
    'voice.processing': 'Traitement…',
    'voice.speaking': 'FeedIA répond…',
    'voice.idle': 'Dis "Salut FeedIA" pour activer',
    'voice.tapToSpeak': 'Touchez pour parler',
    'voice.notSupported': 'Votre navigateur ne supporte pas la reconnaissance vocale. Utilisez Chrome ou Edge.',
    'voice.micDenied': 'Permission micro refusée. Activez-la pour le mains-libres.',
    'voice.greeting': 'Bonjour, je suis FeedIA. Comment puis-je vous aider ?',
    'voice.didntCatch': "Je n'ai pas bien compris. Pouvez-vous répéter ?",
    'voice.suggestions': 'Essayez de dire :',
    'voice.s1': 'Aide-moi à faire grandir le compte',
    'voice.s2': 'Génère un carrousel viral',
    'voice.s3': 'Quel est le meilleur moment pour publier ?',
    'voice.s4': "Lance une mission d'autorité",
    'voice.cancel': 'Annuler',
    'voice.enable': 'Activer la voix mains-libres',
    'voice.disable': 'Désactiver la voix',
    'voice.openMic': 'Ouvrir le micro',
    'settings.voice': 'Voix et mains-libres',
    'settings.language': 'Langue',
    'settings.voiceEnabled': 'Activation vocale ("Salut FeedIA")',
    'settings.ttsEnabled': 'FeedIA répond avec la voix',
    'settings.voicePick': 'Voix de FeedIA',
    'settings.rate': 'Vitesse',
    'settings.pitch': 'Tonalité',
    'settings.test': 'Tester la voix',
    'common.you': 'Vous',
  },
  it: {
    'voice.wake': 'Ciao FeedIA',
    'voice.listening': 'In ascolto…',
    'voice.processing': 'Elaborazione…',
    'voice.speaking': 'FeedIA sta rispondendo…',
    'voice.idle': 'Di\' "Ciao FeedIA" per attivare',
    'voice.tapToSpeak': 'Tocca per parlare',
    'voice.notSupported': 'Il tuo browser non supporta il riconoscimento vocale. Usa Chrome o Edge.',
    'voice.micDenied': 'Permesso microfono negato. Abilitalo per il vivavoce.',
    'voice.greeting': 'Ciao, sono FeedIA. Come posso aiutarti oggi?',
    'voice.didntCatch': 'Non ho capito bene. Puoi ripetere?',
    'voice.suggestions': 'Prova a dire:',
    'voice.s1': "Aiutami a far crescere l'account",
    'voice.s2': 'Genera un carosello virale',
    'voice.s3': "Qual è l'orario migliore per pubblicare?",
    'voice.s4': 'Lancia una missione di autorità',
    'voice.cancel': 'Annulla',
    'voice.enable': 'Attiva voce vivavoce',
    'voice.disable': 'Disattiva voce',
    'voice.openMic': 'Apri microfono',
    'settings.voice': 'Voce e vivavoce',
    'settings.language': 'Lingua',
    'settings.voiceEnabled': 'Attivazione vocale ("Ciao FeedIA")',
    'settings.ttsEnabled': 'FeedIA risponde con la voce',
    'settings.voicePick': 'Voce di FeedIA',
    'settings.rate': 'Velocità',
    'settings.pitch': 'Tono',
    'settings.test': 'Prova voce',
    'common.you': 'Tu',
  },
  de: {
    'voice.wake': 'Hallo FeedIA',
    'voice.listening': 'Höre zu…',
    'voice.processing': 'Verarbeite…',
    'voice.speaking': 'FeedIA antwortet…',
    'voice.idle': 'Sag "Hallo FeedIA" zum Aktivieren',
    'voice.tapToSpeak': 'Zum Sprechen tippen',
    'voice.notSupported': 'Dein Browser unterstützt keine Spracherkennung. Nutze Chrome oder Edge.',
    'voice.micDenied': 'Mikrofonberechtigung verweigert. Aktiviere sie für Freisprechen.',
    'voice.greeting': 'Hallo, ich bin FeedIA. Wie kann ich dir heute helfen?',
    'voice.didntCatch': 'Das habe ich nicht verstanden. Kannst du es wiederholen?',
    'voice.suggestions': 'Versuche zu sagen:',
    'voice.s1': 'Hilf mir, das Konto wachsen zu lassen',
    'voice.s2': 'Erstelle ein virales Karussell',
    'voice.s3': 'Wann ist die beste Zeit zum Posten?',
    'voice.s4': 'Starte eine Autoritäts-Mission',
    'voice.cancel': 'Abbrechen',
    'voice.enable': 'Freisprech-Stimme aktivieren',
    'voice.disable': 'Stimme deaktivieren',
    'voice.openMic': 'Mikrofon öffnen',
    'settings.voice': 'Stimme & Freisprechen',
    'settings.language': 'Sprache',
    'settings.voiceEnabled': 'Sprachaktivierung ("Hallo FeedIA")',
    'settings.ttsEnabled': 'FeedIA antwortet mit Stimme',
    'settings.voicePick': 'FeedIAs Stimme',
    'settings.rate': 'Geschwindigkeit',
    'settings.pitch': 'Tonhöhe',
    'settings.test': 'Stimme testen',
    'common.you': 'Du',
  },
};

const LS_KEY = 'feedia.lang';
const listeners = new Set();

const detectLang = () => {
  const stored = localStorage.getItem(LS_KEY);
  if (stored && DICT[stored]) return stored;
  const nav = (navigator.language || 'es').slice(0, 2).toLowerCase();
  return DICT[nav] ? nav : 'es';
};

let currentLang = detectLang();

export const getLang = () => currentLang;

export const getSpeechLang = () => (SUPPORTED_LANGS.find((l) => l.code === currentLang) ?? SUPPORTED_LANGS[0]).speech;

export const setLang = (code) => {
  if (!DICT[code]) return;
  currentLang = code;
  localStorage.setItem(LS_KEY, code);
  document.documentElement.lang = code;
  listeners.forEach((fn) => {
    try {
      fn(code);
    } catch {
      /* ignore */
    }
  });
};

export const onLangChange = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** Translate a key. Falls back to es, then to the raw key. */
export const t = (key, vars) => {
  const table = DICT[currentLang] ?? DICT.es;
  let str = table[key] ?? DICT.es[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return str;
};

// Initialise <html lang> on load.
document.documentElement.lang = currentLang;
