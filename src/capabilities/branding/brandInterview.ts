/**
 * Brand Interview de FeedIA — entrevista estructurada de 9 preguntas que reemplaza
 * a un especialista de branding tradicional.
 *
 * Inspirado en metodología de IA Masters Academy (content-engine):
 *   1. Identidad y posicionamiento
 *   2. Cliente ideal
 *   3. Diferenciación
 *   4. Convicciones fuertes
 *   5. Tono y voz
 *   6. Temas core + anti-temas
 *   7. Pruebas y casos reales
 *   8. Llamada a la acción
 *   9. Redes activas
 *
 * Output: brief YAML reutilizable que actualiza BrandProfile automáticamente.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import type { BrandProfile } from '../../config/types.js';

const INTERVIEW_PATH = join(process.cwd(), 'data', 'branding', 'interviews.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BrandInterviewQuestion {
  id: string;
  order: number;
  category: string;
  question: string;
  why: string; // por qué importa
  followUps: string[]; // preguntas de seguimiento si la respuesta es pobre
  examples: string[]; // ejemplos de buena respuesta (one-liner)
  required: boolean;
  minWordCount: number;
}

export interface BrandInterviewAnswer {
  questionId: string;
  answer: string;
  answeredAt: string;
  wordCount: number;
  qualityScore: number; // 0-100, calculado por IA
  followUpUsed: boolean;
}

export interface BrandInterview {
  id: string;
  startedAt: string;
  completedAt?: string;
  source: 'voice' | 'chat' | 'form' | 'canvas';
  answers: BrandInterviewAnswer[];
  brandBrief?: BrandBrief; // output final
  status: 'in-progress' | 'completed' | 'paused';
}

// El brief final consolidado que va a BrandProfile
export interface BrandBrief {
  identidad: {
    nombre: string;
    promesa: string;
    posicionamiento: string;
    arquetipo: string;
  };
  clienteIdeal: {
    descripcion: string;
    dolores: string[];
    deseos: string[];
    objeciones: string[];
    contextoVida: string;
  };
  diferenciacion: {
    edge: string; // ventaja única
    competidoresDirectos: string[];
    lo_que_la_marca_es: string;
    lo_que_la_marca_NO_es: string;
  };
  convicciones: string[]; // creencias fuertes que la marca defiende
  tonoYVoz: {
    tono: string[]; // ej: ['cercano', 'directo', 'irreverente']
    palabrasAEvitar: string[];
    frasesReferencia: string[];
  };
  temas: {
    core: string[]; // temas centrales
    antiTopics: string[]; // de qué NO hablar
  };
  pruebas: {
    casosReales: string[];
    testimonios: string[];
    datosMetricas: string[];
  };
  cta: {
    principal: string;
    variantes: string[];
  };
  redes: Array<{ platform: string; handle: string; isMain: boolean }>;
}

interface InterviewStore {
  version: number;
  interviews: BrandInterview[];
  lastUpdated: string;
}

const DEFAULT_STORE: InterviewStore = { version: 1, interviews: [], lastUpdated: new Date().toISOString() };

// ── Banco de 9 preguntas ──────────────────────────────────────────────────────

export const INTERVIEW_QUESTIONS: BrandInterviewQuestion[] = [
  {
    id: 'identidad',
    order: 1,
    category: 'Identidad y posicionamiento',
    question:
      '¿Qué hacés (o qué hace tu negocio) en una sola frase, sin tecnicismos y sin jerga interna? Imaginá que se lo explicás a un amigo en un bar.',
    why: 'Si vos no podés decir qué hacés en una sola frase clara, tu audiencia tampoco lo va a entender.',
    followUps: [
      'OK, ahora decime: ¿quién te paga por eso?',
      '¿En qué momento de la vida de tu cliente entrás vos?',
      'Si no existieras, ¿qué problema concreto seguiría sin resolverse?',
    ],
    examples: [
      '"Ayudo a coaches a venderse sin sonar como vendedores."',
      '"Diseño ecommerces que cargan en menos de 2 segundos."',
      '"Enseño inglés conversacional a profesionales sin tiempo."',
    ],
    required: true,
    minWordCount: 8,
  },
  {
    id: 'cliente-ideal',
    order: 2,
    category: 'Cliente ideal',
    question:
      'Pensá en el último cliente que te dio enorme satisfacción. ¿Cómo es? Edad aproximada, contexto, qué le pesa, qué quiere lograr.',
    why: 'Las marcas que crecen le hablan a UNA persona específica, no a "todos". Si le hablás a todos, no le hablás a nadie.',
    followUps: [
      '¿Qué le quita el sueño a las 3 AM?',
      '¿Qué frase típica diría que muestre su frustración?',
      '¿En qué Instagram pasa su tiempo cuando no trabaja?',
    ],
    examples: [
      '"Mujer 32-45, dueña de marca propia, factura entre 5-15K USD/mes, le pesa estar atada al negocio sin escalar."',
      '"Hombre 25-35, trabaja en tecnología, gana bien pero no tiene cuerpo, prueba dietas y abandona."',
    ],
    required: true,
    minWordCount: 25,
  },
  {
    id: 'diferenciacion',
    order: 3,
    category: 'Diferenciación',
    question:
      'Tu competencia hace X. ¿Qué hacés vos que NINGUNO de ellos hace? No me digas "más calidad" ni "mejor atención". Decime algo concreto y verificable.',
    why: 'La diferenciación vaga no diferencia. Si tu cliente no puede explicarle a otro POR QUÉ vos, vas a competir solo por precio.',
    followUps: [
      '¿Qué hacés que tus competidores nunca harían porque les parece extremo?',
      '¿Qué creés que la mayoría de tu industria hace mal?',
      'Si te clonaran mañana, ¿qué sería lo más difícil de copiar?',
    ],
    examples: [
      '"Doy mi número personal a cada cliente, contesto en 5 minutos cualquier hora."',
      '"Garantizo el resultado o devuelvo el doble."',
      '"Solo trabajo con 12 clientes por año. Si entrás, tenés acceso ilimitado."',
    ],
    required: true,
    minWordCount: 15,
  },
  {
    id: 'convicciones',
    order: 4,
    category: 'Convicciones fuertes',
    question: '¿Qué 2-3 ideas defendés con fuego sobre tu rubro, incluso si parte de tu audiencia no las comparte?',
    why: 'Las marcas que crecen tienen opinión. Las opiniones polarizan, pero también te traen seguidores leales, no curiosos.',
    followUps: [
      '¿De qué te pelearías a muerte en una mesa de café?',
      '¿Qué consejo "estándar" de tu rubro te parece basura?',
      '¿En qué te has equivocado por hacer lo "correcto"?',
    ],
    examples: [
      '"El 90% de los reels son ruido. Es mejor 1 carrusel pensado que 10 reels improvisados."',
      '"Las dietas de moda destruyen la relación con la comida. La consistencia gana siempre."',
    ],
    required: true,
    minWordCount: 20,
  },
  {
    id: 'tono-voz',
    order: 5,
    category: 'Tono y voz',
    question: 'Si tu marca fuera una persona, ¿cómo hablaría? Dame 3 palabras y 1 frase que JAMÁS diría.',
    why: 'El tono es lo que hace que la gente reconozca tu marca SIN VER el logo. Sin un tono claro, sos un commodity.',
    followUps: [
      '¿Usás "vos" o "tú"? ¿Sos más formal o más cercano?',
      '¿Usás humor? ¿Qué tipo: irónico, absurdo, slapstick?',
      'Mostrame 2-3 frases típicas que dirías textualmente.',
    ],
    examples: [
      '"Cercano, directo, irreverente. Nunca diría: \'Buenos días querida comunidad\'."',
      '"Profesional pero sin acartonar. Nunca diría: \'En el día de la fecha procedemos a...\'."',
    ],
    required: true,
    minWordCount: 15,
  },
  {
    id: 'temas-core',
    order: 6,
    category: 'Temas core + anti-temas',
    question:
      'Decime 4-5 temas centrales (los que vas a hablar SIEMPRE) y 2-3 anti-temas (los que JAMÁS vas a tocar aunque generen tráfico).',
    why: 'Sin temas core hablás de todo y de nada. Sin anti-temas te tientan los virales que no te ayudan.',
    followUps: [
      '¿Qué tema podrías hablar mañana sin preparación 30 minutos seguidos?',
      '¿Qué tema viral en tu rubro NO tocarías ni con un palo?',
      '¿Qué tema parece off-topic pero en realidad es parte de tu marca?',
    ],
    examples: [
      'Core: hábitos de productividad, herramientas pro, mindset de fundador, automatización. Anti: política, criptomonedas, religión.',
    ],
    required: true,
    minWordCount: 20,
  },
  {
    id: 'pruebas',
    order: 7,
    category: 'Pruebas y casos reales',
    question:
      'Contame 2-3 casos REALES de clientes/proyectos con números concretos. Si no tenés casos cerrados, decime los métricos que tenés.',
    why: 'Las pruebas tangibles son lo que convierte. Sin pruebas, todo lo que decís suena a opinión.',
    followUps: [
      '¿Tenés screenshots, métricas o testimonios?',
      '¿Cuál fue el caso más extremo que resolviste?',
      'Si no tenés casos: ¿qué experimentos personales tenés?',
    ],
    examples: [
      '"Cliente X pasó de 200 a 8000 seguidores en 4 meses con el método Y."',
      '"Mi último carrusel hizo 350 saves con 1200 seguidores totales."',
    ],
    required: true,
    minWordCount: 25,
  },
  {
    id: 'cta',
    order: 8,
    category: 'Llamada a la acción',
    question: '¿Cuál es el ÚNICO siguiente paso que querés que tu audiencia dé? (Hacé uno, no varios)',
    why: 'CTAs múltiples confunden. Una CTA clara y específica convierte 5x más que 3 CTAs débiles.',
    followUps: [
      '¿Lead magnet gratis, agendar llamada, comprar directo, suscribirse a newsletter?',
      '¿Cuánto se demora alguien en convertirse desde que te descubre?',
      '¿Cuál es el cuello de botella ahora: tráfico o conversión?',
    ],
    examples: [
      '"Agendá una llamada de 15 min."',
      '"Suscribite a mi newsletter semanal."',
      '"Comprá el curso (link en bio)."',
    ],
    required: true,
    minWordCount: 5,
  },
  {
    id: 'redes',
    order: 9,
    category: 'Redes activas',
    question:
      '¿Qué redes mantenés ACTIVAS hoy y cuál es la prioritaria? No me digas todas — quiero saber dónde realmente publicás cada semana.',
    why: 'No se puede crecer en 5 redes a la vez con calidad. La marca decide UNA red principal y 1-2 secundarias.',
    followUps: [
      '¿En cuál tu cliente ideal realmente pasa el tiempo?',
      '¿Cuál te funciona mejor históricamente para conseguir clientes?',
      '¿Cuáles tenés "porque hay que tenerlas" pero no usás?',
    ],
    examples: ['Principal: Instagram (@cuenta). Secundaria: LinkedIn. Resto: tengo abandonadas.'],
    required: true,
    minWordCount: 10,
  },
];

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'branding');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): InterviewStore => {
  try {
    ensureDir();
    if (!existsSync(INTERVIEW_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(INTERVIEW_PATH, 'utf8')) as InterviewStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: InterviewStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(INTERVIEW_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── CRUD de entrevista ────────────────────────────────────────────────────────

export const startInterview = (source: BrandInterview['source']): BrandInterview => {
  const store = loadStore();
  const interview: BrandInterview = {
    id: `interview-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    startedAt: new Date().toISOString(),
    source,
    answers: [],
    status: 'in-progress',
  };
  store.interviews.push(interview);
  saveStore(store);
  log.info(`[BrandInterview] Entrevista iniciada (${source})`);
  return interview;
};

export const getActiveInterview = (): BrandInterview | null => {
  const store = loadStore();
  return store.interviews.find((i) => i.status === 'in-progress') ?? null;
};

export const getNextQuestion = (interview: BrandInterview): BrandInterviewQuestion | null => {
  const answered = new Set(interview.answers.map((a) => a.questionId));
  return INTERVIEW_QUESTIONS.find((q) => !answered.has(q.id)) ?? null;
};

// ── Scoring de la respuesta ──────────────────────────────────────────────────

const scoreAnswer = async (question: BrandInterviewQuestion, answer: string): Promise<number> => {
  const wordCount = answer.trim().split(/\s+/).length;
  if (wordCount < question.minWordCount) return 30;

  const prompt = `Evaluá la calidad de esta respuesta a una entrevista de branding (0-100).

PREGUNTA: ${question.question}
POR QUÉ IMPORTA: ${question.why}
EJEMPLOS DE BUENA RESPUESTA: ${question.examples.join(' | ')}

RESPUESTA DEL USUARIO: "${answer}"

Criterios:
- Especificidad (concreto vs vago): 40 pts
- Coherencia con la pregunta: 30 pts
- Diferenciación (no genérica): 30 pts

Respondé SOLO con un número de 0 a 100.`;

  try {
    const result = await routerAsk(prompt, { taskType: 'analysis', maxTokens: 50, freeOnly: true });
    const n = parseInt(result.text.trim().match(/\d+/)?.[0] ?? '50', 10);
    return Math.max(0, Math.min(100, n));
  } catch {
    return 70;
  }
};

export const submitAnswer = async (
  interviewId: string,
  questionId: string,
  answer: string,
): Promise<{ accepted: boolean; score: number; needsFollowUp: boolean; followUp?: string }> => {
  const store = loadStore();
  const interview = store.interviews.find((i) => i.id === interviewId);
  if (!interview) throw new Error(`Entrevista ${interviewId} no encontrada`);
  const question = INTERVIEW_QUESTIONS.find((q) => q.id === questionId);
  if (!question) throw new Error(`Pregunta ${questionId} no existe`);

  const score = await scoreAnswer(question, answer);
  const wordCount = answer.trim().split(/\s+/).length;
  const needsFollowUp = score < 60 && question.followUps.length > 0;
  const followUp = needsFollowUp ? question.followUps[0] : undefined;

  const answerRecord: BrandInterviewAnswer = {
    questionId,
    answer,
    answeredAt: new Date().toISOString(),
    wordCount,
    qualityScore: score,
    followUpUsed: needsFollowUp,
  };

  // Reemplazar respuesta previa si existe (en caso de follow-up)
  const existingIdx = interview.answers.findIndex((a) => a.questionId === questionId);
  if (existingIdx >= 0) interview.answers[existingIdx] = answerRecord;
  else interview.answers.push(answerRecord);

  saveStore(store);
  return { accepted: true, score, needsFollowUp, followUp };
};

// ── Consolidación final: del set de respuestas a un BrandBrief ──────────────

export const consolidateInterview = async (interviewId: string): Promise<BrandBrief> => {
  const store = loadStore();
  const interview = store.interviews.find((i) => i.id === interviewId);
  if (!interview) throw new Error(`Entrevista ${interviewId} no encontrada`);

  const answersByQ = Object.fromEntries(interview.answers.map((a) => [a.questionId, a.answer]));

  const prompt = `Consolidá las 9 respuestas de esta entrevista de branding en un brief completo y profesional.

RESPUESTAS:
1. Identidad: ${answersByQ['identidad'] ?? '(sin respuesta)'}
2. Cliente ideal: ${answersByQ['cliente-ideal'] ?? '(sin respuesta)'}
3. Diferenciación: ${answersByQ['diferenciacion'] ?? '(sin respuesta)'}
4. Convicciones: ${answersByQ['convicciones'] ?? '(sin respuesta)'}
5. Tono y voz: ${answersByQ['tono-voz'] ?? '(sin respuesta)'}
6. Temas core + anti-temas: ${answersByQ['temas-core'] ?? '(sin respuesta)'}
7. Pruebas: ${answersByQ['pruebas'] ?? '(sin respuesta)'}
8. CTA: ${answersByQ['cta'] ?? '(sin respuesta)'}
9. Redes: ${answersByQ['redes'] ?? '(sin respuesta)'}

Generá un brief consolidado en JSON exacto (todas las arrays deben tener mínimo 2-3 ítems aunque tengas que inferir):

{
  "identidad": {
    "nombre": "...",
    "promesa": "1 frase clara de qué hace y para quién",
    "posicionamiento": "cómo se diferencia en el mercado",
    "arquetipo": "Sabio | Héroe | Cuidador | Creador | Rebelde | Explorador | Amante | Bufón | Mago | Inocente | Hombre Común | Gobernante"
  },
  "clienteIdeal": {
    "descripcion": "perfil detallado en 2-3 líneas",
    "dolores": ["dolor 1", "dolor 2", "dolor 3"],
    "deseos": ["deseo 1", "deseo 2", "deseo 3"],
    "objeciones": ["objeción 1 a comprar/contratar", "objeción 2"],
    "contextoVida": "cómo es su día a día"
  },
  "diferenciacion": {
    "edge": "ventaja única en 1 frase",
    "competidoresDirectos": ["competidor 1", "competidor 2"],
    "lo_que_la_marca_es": "afirmación positiva",
    "lo_que_la_marca_NO_es": "afirmación negativa para contraste"
  },
  "convicciones": ["creencia 1 fuerte", "creencia 2", "creencia 3"],
  "tonoYVoz": {
    "tono": ["palabra 1", "palabra 2", "palabra 3"],
    "palabrasAEvitar": ["palabra 1", "palabra 2"],
    "frasesReferencia": ["frase típica 1", "frase típica 2"]
  },
  "temas": {
    "core": ["tema 1", "tema 2", "tema 3", "tema 4"],
    "antiTopics": ["anti-tema 1", "anti-tema 2"]
  },
  "pruebas": {
    "casosReales": ["caso 1 con número", "caso 2 con número"],
    "testimonios": ["testimonio 1"],
    "datosMetricas": ["dato 1", "dato 2"]
  },
  "cta": {
    "principal": "la única acción principal",
    "variantes": ["variante 1", "variante 2"]
  },
  "redes": [
    { "platform": "Instagram", "handle": "@cuenta", "isMain": true }
  ]
}`;

  const brief = await routerAskJson<BrandBrief>(prompt, {
    taskType: 'strategy',
    maxTokens: 4000,
    systemPrompt:
      'Sos un especialista de branding senior. Consolidás briefs claros y accionables. No inventás datos: si falta info, hacé inferencias conservadoras.',
  });

  // Marcar entrevista como completa
  interview.brandBrief = brief;
  interview.status = 'completed';
  interview.completedAt = new Date().toISOString();
  saveStore(store);

  log.info(`[BrandInterview] Brief consolidado para entrevista ${interviewId}`);
  return brief;
};

// ── Conversión a BrandProfile (compatible con config/types.ts) ───────────────

export const briefToBrandProfile = (brief: BrandBrief, existing?: Partial<BrandProfile>): BrandProfile => ({
  name: brief.identidad.nombre || existing?.name || 'Mi Marca',
  type: existing?.type ?? 'marca-personal',
  niche: existing?.niche ?? brief.identidad.posicionamiento,
  audience: {
    description: brief.clienteIdeal.descripcion,
    pains: brief.clienteIdeal.dolores,
    desires: brief.clienteIdeal.deseos,
    locale: existing?.audience?.locale ?? 'es-AR',
  },
  voice: {
    tone: brief.tonoYVoz.tono,
    forbidden: brief.tonoYVoz.palabrasAEvitar,
    referenceQuotes: brief.tonoYVoz.frasesReferencia,
  },
  visual: existing?.visual ?? {
    palette: [],
    typography: [],
    style: 'minimalista',
    mood: 'profesional',
    photographyStyle: 'natural',
    compositionRules: [],
    allowedIconography: [],
    forbiddenIconography: [],
    moodboardUrls: [],
    density: 'medium',
    imageTextRatio: 'balanced',
  },
  goals: {
    primary: existing?.goals?.primary ?? 'autoridad',
    metricsToWatch: existing?.goals?.metricsToWatch ?? ['followers', 'engagement_rate', 'saves'],
  },
  competitors: brief.diferenciacion.competidoresDirectos,
  hashtagPools: existing?.hashtagPools ?? {},
  brandStrategy: {
    vision: '',
    mission: brief.identidad.promesa,
    values: brief.convicciones,
    promise: brief.identidad.promesa,
    positioning: brief.identidad.posicionamiento,
    story: '',
    personality: brief.tonoYVoz.tono,
    archetype: brief.identidad.arquetipo,
    architecture: 'master-brand',
    differentiators: [brief.diferenciacion.edge, brief.diferenciacion.lo_que_la_marca_es],
    experiencePrinciples: brief.convicciones,
    targetPersonas: [],
    brandVoiceRules: [],
    visualUsageRules: [],
  },
  contentPillars: existing?.contentPillars ?? [],
  complianceRules: existing?.complianceRules ?? [],
});

// ── Status / progreso de la entrevista ───────────────────────────────────────

export const getInterviewProgress = (
  interviewId: string,
): {
  interview: BrandInterview;
  totalQuestions: number;
  answeredCount: number;
  averageScore: number;
  remainingQuestions: BrandInterviewQuestion[];
} | null => {
  const store = loadStore();
  const interview = store.interviews.find((i) => i.id === interviewId);
  if (!interview) return null;

  const answered = new Set(interview.answers.map((a) => a.questionId));
  const remaining = INTERVIEW_QUESTIONS.filter((q) => !answered.has(q.id));
  const averageScore =
    interview.answers.length > 0
      ? interview.answers.reduce((s, a) => s + a.qualityScore, 0) / interview.answers.length
      : 0;

  return {
    interview,
    totalQuestions: INTERVIEW_QUESTIONS.length,
    answeredCount: interview.answers.length,
    averageScore,
    remainingQuestions: remaining,
  };
};

export const listInterviews = (): BrandInterview[] => loadStore().interviews;
