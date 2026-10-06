/**
 * Conocimiento de estrategia de Forge IA, codificado como datos y funciones puras.
 *
 * Cada regla cita su fuente (skill del repo, pipeline de producción o libro incorporado).
 * Son heurísticas de diseño, no métricas medidas: el historial real de la cuenta
 * (predictorModelo) es la única fuente de cifras de rendimiento.
 */

import type { HookCategory } from '../copywriting/hookLab.js';

export const OBJETIVOS_FORGE = ['engagement', 'alcance', 'conversion', 'comunidad', 'ventas'] as const;
export type ObjetivoForge = (typeof OBJETIVOS_FORGE)[number];

export const FORMATOS_FORGE = ['carrusel', 'reel', 'historia'] as const;
export type FormatoForge = (typeof FORMATOS_FORGE)[number];

export const PLATAFORMAS_FORGE = ['instagram', 'tiktok'] as const;
export type PlataformaForge = (typeof PLATAFORMAS_FORGE)[number];

/* ───────── Objetivos: qué medir, qué pedir y con qué ganchos ───────── */

export interface PlaybookObjetivo {
  meta: string;
  metricaClave: string;
  /** De la CTA más suave a la más directa. Siempre incluir una de transición y una directa (StoryBrand). */
  ctaEscalera: string[];
  /** Palabras que delatan que la pieza pide la acción del objetivo (usadas por los chequeos). */
  patronesCta: RegExp;
  formatosPreferidos: FormatoForge[];
  ganchosPreferidos: HookCategory[];
  fundamento: string;
}

export const PLAYBOOK_OBJETIVO: Record<ObjetivoForge, PlaybookObjetivo> = {
  engagement: {
    meta: 'Conversación y guardados: que la gente responda y vuelva.',
    metricaClave: 'Guardados y comentarios por cada 100 cuentas alcanzadas.',
    ctaEscalera: [
      'Contame tu caso en los comentarios',
      'Guardá esto para cuando lo necesites',
      'Compartilo con alguien que lo necesite',
    ],
    patronesCta: /coment|contame|respond|guard|compart/i,
    formatosPreferidos: ['carrusel', 'reel', 'historia'],
    ganchosPreferidos: ['pregunta', 'opinion-polemica', 'contraste'],
    fundamento:
      'STEPPS (Berger): emoción de alta activación + disparador para comentar. Skill feedia-content-strategist.',
  },
  alcance: {
    meta: 'Llegar a gente que todavía no te sigue.',
    metricaClave: 'Alcance de no seguidores y veces compartido.',
    ctaEscalera: ['Compartilo con alguien que lo necesite', 'Guardalo para después', 'Seguí para la serie completa'],
    patronesCta: /compart|guard|segu/i,
    formatosPreferidos: ['reel', 'carrusel', 'historia'],
    ganchosPreferidos: ['secreto-revelado', 'estadistica-impactante', 'lista-prometida'],
    fundamento:
      'STEPPS: moneda social + valor práctico (lo que se comparte hace quedar bien a quien comparte). Berger.',
  },
  conversion: {
    meta: 'Que hagan clic, escriban o reserven.',
    metricaClave: 'Clics, DMs y consultas por cada 100 alcanzados.',
    ctaEscalera: [
      'Si querés el paso a paso, escribime "GUÍA" por DM',
      'Mirá el enlace de la bio',
      'Reservá tu lugar hoy',
    ],
    patronesCta: /link|enlace|bio|dm|mensaje|escrib|reserv|pedí|pedi/i,
    formatosPreferidos: ['carrusel', 'historia', 'reel'],
    ganchosPreferidos: ['antes-despues', 'error-comun', 'historia-personal'],
    fundamento: 'StoryBrand (Miller): CTA de transición (guía) + CTA directo, siempre ambos. Cialdini: prueba social.',
  },
  comunidad: {
    meta: 'Pertenencia: que la gente participe y vuelva por el grupo.',
    metricaClave: 'Respuestas, menciones y retorno de seguidores activos.',
    ctaEscalera: [
      'Contá cuál es tu caso',
      'Sumate al reto de esta semana',
      'Mandame tu duda y la respondo en la próxima',
    ],
    patronesCta: /contá|conta|sumate|reto|duda|respond|comenta/i,
    formatosPreferidos: ['historia', 'reel', 'carrusel'],
    ganchosPreferidos: ['historia-personal', 'opinion-polemica', 'pov'],
    fundamento: 'Get Together (Richardson) y Business of Belonging (Spinks): construir CON la gente, no PARA ella.',
  },
  ventas: {
    meta: 'Compra o pedido de presupuesto.',
    metricaClave: 'Ventas y consultas calificadas por cada 100 alcanzados.',
    ctaEscalera: [
      'Mirá qué incluye y cuánto cuesta',
      'Pedí tu presupuesto sin compromiso',
      'Reservá con el cupón de esta semana',
    ],
    patronesCta: /precio|cuesta|presupuesto|reserv|compr|cupón|cupon|pedí|pedi/i,
    formatosPreferidos: ['carrusel', 'historia', 'reel'],
    ganchosPreferidos: ['antes-despues', 'estadistica-impactante', 'error-comun'],
    fundamento:
      'Hopkins (Scientific Advertising): prueba + garantía + razón concreta. Escasez sólo si es real (Cialdini).',
  },
};

/* ───────── Formatos: estructura probada por los pipelines de producción ───────── */

export interface PlaybookFormato {
  estructura: string[];
  reglaClave: string;
  fuente: string;
}

export const PLAYBOOK_FORMATO: Record<FormatoForge, PlaybookFormato> = {
  carrusel: {
    estructura: [
      'Slide 1: hook de hasta 8 palabras',
      'Slides 2 a N-1: un punto por slide, máximo 30 palabras',
      'Última slide: CTA',
    ],
    reglaClave: 'Cada slide se entiende sola. La slide 1 decide si se abre el carrusel.',
    fuente: 'Pipeline carrusel (produceCarousel): reglas de slide 1, slides de valor y CTA final.',
  },
  reel: {
    estructura: [
      '0-2 s: hook dicho con energía',
      '3-8 s: problema o promesa',
      '9-22 s: payoff con 2-3 beats visuales',
      '23-28 s: CTA',
      '29-30 s: loop que invita a volver a verlo',
    ],
    reglaClave: 'El hook va en los primeros 2 segundos: si no frena el scroll, el resto no se ve.',
    fuente: 'Pipeline reel (produceReelScript): estructura por tiempos. Skill tiktok-hooks.',
  },
  historia: {
    estructura: [
      'Frame 1: sticker de encuesta',
      'Frames 2-3: quiz o pregunta que revela valor',
      'Frame 4: prueba social',
      'Frame 5: CTA con enlace',
    ],
    reglaClave: 'Cada frame pide una respuesta: la interacción es la métrica, no el "me gusta".',
    fuente: 'Pipeline historia (produceStorySeries): stickers por frame y CTA con enlace.',
  },
};

/* ───────── Ángulos: de un tema a una promesa concreta ───────── */

export interface AnguloSugerido {
  categoria: HookCategory;
  texto: string;
}

const PLANTILLA_ANGULO: Record<HookCategory, (tema: string) => string> = {
  pregunta: (t) => `Pregunta que incomoda sobre ${t}`,
  contraste: (t) => `Lo que creías sobre ${t} vs lo que de verdad funciona`,
  'lista-prometida': (t) => `3 cosas sobre ${t} que casi nadie te dice`,
  'error-comun': (t) => `El error más común con ${t} y cómo evitarlo`,
  'secreto-revelado': (t) => `Lo que hacen los que dominan ${t}`,
  'antes-despues': (t) => `De cero a resultados con ${t}: el antes y el después`,
  'estadistica-impactante': (t) => `Un dato sobre ${t} que cambia cómo lo pensás (usar un dato real)`,
  'imperativo-stop': (t) => `Dejá de hacer esto con ${t} hoy mismo`,
  'historia-personal': (t) => `Lo que me pasó con ${t} y lo que aprendí`,
  'opinion-polemica': (t) => `Por qué ${t} está mal planteado en la mayoría de los casos`,
  pov: (t) => `POV: estás empezando con ${t}`,
};

/**
 * Ángulos para un tema, en el orden de los ganchos que mejor sirven al objetivo.
 * Devuelve como mucho `max` ángulos y nunca repite categoría.
 */
export const angulosPara = (tema: string, objetivo: ObjetivoForge, max = 4): AnguloSugerido[] =>
  PLAYBOOK_OBJETIVO[objetivo].ganchosPreferidos.slice(0, max).map((categoria) => ({
    categoria,
    texto: PLANTILLA_ANGULO[categoria](tema),
  }));

/* ───────── Ruta de fundación: rotación de 30 días ───────── */

export interface BloqueRuta {
  tipo: string;
  piezas: number;
  categoriaHook: HookCategory;
}

/** Skill feedia-content-strategist, 30 días: 5 tipos de pieza × 4 publicaciones = 20. */
export const RUTA_FUNDACION_30_DIAS: BloqueRuta[] = [
  { tipo: 'Problema → agitación → solución (PAS)', piezas: 4, categoriaHook: 'error-comun' },
  { tipo: 'Brecha de curiosidad', piezas: 4, categoriaHook: 'pregunta' },
  { tipo: 'Prueba social (resultado de alguien)', piezas: 4, categoriaHook: 'antes-despues' },
  { tipo: 'Detrás de escena', piezas: 4, categoriaHook: 'historia-personal' },
  { tipo: 'Viral (STEPPS): lista compartible', piezas: 4, categoriaHook: 'lista-prometida' },
];

/* ───────── Detección de CTA y chequeos de estrategia ───────── */

export interface ChequeoEstrategia {
  id: string;
  ok: boolean;
  titulo: string;
  detalle: string;
}

export const detectaCta = (texto: string, objetivo: ObjetivoForge): boolean =>
  PLAYBOOK_OBJETIVO[objetivo].patronesCta.test(texto);

export interface EntradaChequeo {
  objetivo: ObjetivoForge;
  formato: FormatoForge;
  hook: string;
  caption: string;
  cuerpoTexto: string;
  partes: number;
  hashtagsCount: number;
  /** Notas de sticker o interacción de cada parte (sólo historias). */
  notasInteractivas: string;
}

/** Chequeos deterministas sobre la pieza. Cada uno indica la regla y su fuente en el detalle. */
export const chequeosEstrategia = (e: EntradaChequeo): ChequeoEstrategia[] => {
  const largoHook = e.hook.trim().length;
  const textoCta = `${e.caption} ${e.cuerpoTexto}`;
  const chequeos: ChequeoEstrategia[] = [
    {
      id: 'hook-largo',
      ok: largoHook >= 40 && largoHook <= 90,
      titulo: 'Largo del hook',
      detalle: `${largoHook} caracteres. Rango 40-90 (hookLab: ideal para scroll-stop).`,
    },
    {
      id: 'cta-del-objetivo',
      ok: detectaCta(textoCta, e.objetivo),
      titulo: 'CTA alineada al objetivo',
      detalle: `Para ${e.objetivo} la pieza debe pedir: ${PLAYBOOK_OBJETIVO[e.objetivo].ctaEscalera[0]}.`,
    },
  ];

  if (e.formato !== 'historia') {
    const ok = e.hashtagsCount >= 5 && e.hashtagsCount <= 12;
    chequeos.push({
      id: 'hashtags',
      ok,
      titulo: 'Cantidad de hashtags',
      detalle: `${e.hashtagsCount} hashtags. Rango 5-12 relevantes (recomendación del predictor), no genéricos.`,
    });
  }

  if (e.formato === 'carrusel') {
    chequeos.push({
      id: 'slides',
      ok: e.partes >= 5 && e.partes <= 10,
      titulo: 'Largo del carrusel',
      detalle: `${e.partes} slides. Heurística de Forge: 5-10 para que se complete sin cansar.`,
    });
  }

  if (e.formato === 'historia') {
    const ok = /encuesta|poll|quiz|pregunta|question|slider/i.test(e.notasInteractivas);
    chequeos.push({
      id: 'interaccion',
      ok,
      titulo: 'Interacción en la historia',
      detalle: 'Cada historia pide una respuesta (sticker de encuesta, quiz o pregunta).',
    });
  }

  return chequeos;
};

/* ───────── Plan completo que devuelve la etapa de estrategia ───────── */

export interface PlanEstrategia {
  objetivo: {
    meta: string;
    metricaClave: string;
    ctaEscalera: string[];
    fundamento: string;
  };
  formato: PlaybookFormato & { formato: FormatoForge };
  angulos: AnguloSugerido[];
  rutaFundacion: BloqueRuta[];
  cadencia: string;
  hashtags: string;
  avisos: string[];
}

export const planEstrategia = (args: {
  tema: string;
  objetivo: ObjetivoForge;
  formato: FormatoForge;
  mejorFormatoCuenta: string | null;
}): PlanEstrategia => {
  const playbook = PLAYBOOK_OBJETIVO[args.objetivo];
  const avisos: string[] = [];
  const mejorFormato = (FORMATOS_FORGE as readonly string[]).includes(args.mejorFormatoCuenta ?? '')
    ? args.mejorFormatoCuenta
    : null;
  const principal = playbook.formatosPreferidos[0];
  if (principal && principal !== args.formato) {
    avisos.push(
      `Para ${args.objetivo} el formato que más sirve es ${principal} (orden: ${playbook.formatosPreferidos.join(' > ')}). Tu formato elegido es ${args.formato}.`,
    );
  }
  if (mejorFormato && mejorFormato !== args.formato) {
    avisos.push(`Tu cuenta rindió mejor con ${mejorFormato} según tu historial: considéralo.`);
  }
  return {
    objetivo: {
      meta: playbook.meta,
      metricaClave: playbook.metricaClave,
      ctaEscalera: playbook.ctaEscalera,
      fundamento: playbook.fundamento,
    },
    formato: { ...PLAYBOOK_FORMATO[args.formato], formato: args.formato },
    angulos: angulosPara(args.tema, args.objetivo),
    rutaFundacion: RUTA_FUNDACION_30_DIAS,
    cadencia:
      'Fundación de 30 días: 1 pieza por día, preparando el lote por adelantado (skill feedia-content-strategist). Después, sostené la cadencia que la cuenta pueda cumplir: la constancia pesa más que el pico.',
    hashtags: 'Entre 5 y 12 hashtags relevantes al tema, mezclando uno amplio con varios de nicho.',
    avisos,
  };
};
