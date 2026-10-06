/**
 * Herramientas IA: catálogo, rol senior, reglas de oficio, validación de entrada y salida, y
 * respaldos deterministas que usan datos reales de la cuenta. Función pura: no toca red ni disco.
 */

import type {
  MovimientoCalendario,
  MomentoPlan,
  PiezaCreacion,
  PostCalendarioPlan,
} from './herramientasPlanificacion.js';
import { ENSAMBLAR_HERRAMIENTA } from './herramientasAcciones.js';
import { NUEVAS_HERRAMIENTAS } from './herramientasNuevas.js';
import type { EntradaConocimiento, PreparacionRespuestas } from './respuestasTriaje.js';

export type CategoriaHerramienta = 'Contenido' | 'Estrategia' | 'Comunidad' | 'Operación';

export interface CampoHerramienta {
  id: string;
  etiqueta: string;
  tipo: 'texto' | 'textarea' | 'select' | 'numero';
  requerido: boolean;
  opciones?: string[];
  min?: number;
  max?: number;
  ayuda?: string;
  maxCaracteres?: number;
}

export interface MaterialPrevio {
  creacionId: string;
  herramientaId: string;
  nombre: string;
  titulo: string;
  texto: string;
}

export interface ComplementoResultado {
  secciones: SeccionResultado[];
  notas: string[];
}

export interface ContextoCuenta {
  totalPosts: number;
  topPosts: Array<{ formato: string; caption: string; tasa: number }>;
  formatos: Array<{ formato: string; posts: number; medianaTasa: number }>;
  momentos: Array<{ dia: string; franja: string; medianaTasa: number; posts: number }>;
  hashtagsTop: string[];
}

export interface SeccionResultado {
  titulo: string;
  tipo: 'texto' | 'lista' | 'copiable';
  contenido: string | string[];
}

export interface ResultadoHerramienta {
  titulo: string;
  secciones: SeccionResultado[];
  notas: string[];
  textosPiezas?: TextoPieza[];
}

export type Destino = 'calendario' | 'proyecto' | 'objetivo' | 'experimento' | 'bitacora' | 'copiar';

export interface TextoPieza {
  titulo: string;
  caption: string;
  hashtags: string[];
}

export interface KeyResultPropuesto {
  descripcion: string;
  fuente: string;
  metricType: 'count' | 'percent' | 'currency' | 'ratio' | 'time-minutes';
  unidad: string;
  direccion: 'increase' | 'decrease';
  baseline: number | null;
  target: number;
}

export type AccionCreacion =
  | { tipo: 'piezas'; piezas: PiezaCreacion[] }
  | {
      tipo: 'movimientos';
      modo: 'optimizar' | 'reprogramar';
      calendarioDisponible: boolean;
      movimientos: MovimientoCalendario[];
    }
  | {
      tipo: 'proyecto';
      nombre: string;
      objetivo: string;
      plataforma: 'instagram' | 'tiktok' | 'ambas';
      tareas: string[];
      inicio: string | null;
      fin: string | null;
    }
  | {
      tipo: 'objetivo';
      titulo: string;
      porque: string;
      categoria: string;
      periodo: 'month' | 'quarter' | 'year';
      keyResults: KeyResultPropuesto[];
    }
  | {
      tipo: 'experimento';
      hipotesis: string;
      variable: string;
      metrica: string;
      umbralMejora: number;
      duracionDias: number;
      nombreA: string;
      nombreB: string;
    }
  | { tipo: 'bitacora'; titulo: string; detalle: string }
  | { tipo: 'ninguna' };

export interface ContextoAccion {
  valores: Record<string, string | number>;
  contexto: ContextoCuenta;
  conexiones: { instagram: boolean; tiktok: boolean };
  ahora: number;
  calendario: { disponible: boolean; posts: PostCalendarioPlan[]; momentos: MomentoPlan[] };
  bandeja: {
    disponible: boolean;
    sinResponder: number;
    escaladas: number;
    leadsSinResponder: number;
    ejemplos: string[];
  };
  marca: { nombre: string; nicho: string };
  material?: MaterialPrevio | null;
  respuestas?: PreparacionRespuestas | null;
  conocimiento?: EntradaConocimiento[];
}

export interface HerramientaDef {
  id: string;
  nombre: string;
  categoria: CategoriaHerramienta;
  descripcion: string;
  icono: string;
  rol: string;
  reglas: string[];
  campos: CampoHerramienta[];
  destinos: Destino[];
  soloReglas?: boolean;
  accion?: (ctx: ContextoAccion) => AccionCreacion;
  respaldo?: (
    valores: Record<string, string | number>,
    contexto: ContextoCuenta,
    ctx: ContextoAccion,
    accion: AccionCreacion,
  ) => ResultadoHerramienta;
  complemento?: (valores: Record<string, string | number>) => ComplementoResultado | null;
}

export type DefinicionBase = Omit<HerramientaDef, 'destinos' | 'accion'>;

const MAX_TEXTO = 2000;
const MAX_SECCIONES = 12;
const MAX_CONTENIDO = 3000;
const MAX_ITEMS = 20;
const MAX_ITEM = 400;

export const validarEntrada = (
  def: HerramientaDef,
  raw: Record<string, unknown>,
): { ok: true; valores: Record<string, string | number> } | { ok: false; error: string } => {
  const valores: Record<string, string | number> = {};
  for (const campo of def.campos) {
    const valor = raw[campo.id];
    if (campo.tipo === 'numero') {
      const n =
        typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN;
      if (!Number.isFinite(n)) {
        if (campo.requerido) return { ok: false, error: `${campo.etiqueta} es obligatorio` };
        continue;
      }
      const min = campo.min ?? -Infinity;
      const max = campo.max ?? Infinity;
      if (!Number.isInteger(n) || n < min || n > max) {
        return { ok: false, error: `${campo.etiqueta} debe ser un número entero entre ${min} y ${max}` };
      }
      valores[campo.id] = n;
      continue;
    }
    const texto =
      typeof valor === 'string'
        ? valor
            .replace(/\u0000/g, '')
            .trim()
            .slice(0, campo.maxCaracteres ?? MAX_TEXTO)
        : '';
    if (!texto) {
      if (campo.requerido) return { ok: false, error: `${campo.etiqueta} es obligatorio` };
      continue;
    }
    if (campo.tipo === 'select' && !(campo.opciones ?? []).includes(texto)) {
      return { ok: false, error: `${campo.etiqueta}: opción inválida` };
    }
    valores[campo.id] = texto;
  }
  return { ok: true, valores };
};

const cortar = (texto: string, max: number): string => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

export const validarResultado = (raw: unknown): ResultadoHerramienta | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.titulo !== 'string' || !Array.isArray(r.secciones)) return null;
  const secciones: SeccionResultado[] = [];
  for (const s of r.secciones.slice(0, MAX_SECCIONES)) {
    if (typeof s !== 'object' || s === null) continue;
    const sec = s as Record<string, unknown>;
    const titulo = typeof sec.titulo === 'string' ? cortar(sec.titulo, 120) : '';
    const tipo = sec.tipo === 'lista' || sec.tipo === 'copiable' ? sec.tipo : 'texto';
    if (tipo === 'lista' && Array.isArray(sec.contenido)) {
      const items = sec.contenido
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .slice(0, MAX_ITEMS)
        .map((i) => cortar(i.trim(), MAX_ITEM));
      if (items.length > 0) secciones.push({ titulo, tipo, contenido: items });
      continue;
    }
    if (typeof sec.contenido === 'string' && sec.contenido.trim()) {
      secciones.push({ titulo, tipo, contenido: cortar(sec.contenido.trim(), MAX_CONTENIDO) });
    }
  }
  if (secciones.length === 0) return null;
  const notas = Array.isArray(r.notas)
    ? r.notas
        .filter((n): n is string => typeof n === 'string')
        .slice(0, MAX_ITEMS)
        .map((n) => cortar(n, MAX_ITEM))
    : [];
  const textosPiezas: TextoPieza[] = Array.isArray(r.piezas)
    ? r.piezas.flatMap((p) => {
        if (typeof p !== 'object' || p === null) return [];
        const pieza = p as Record<string, unknown>;
        const caption = typeof pieza.caption === 'string' ? cortar(pieza.caption.trim(), MAX_CONTENIDO) : '';
        if (!caption) return [];
        const titulo = typeof pieza.titulo === 'string' ? cortar(pieza.titulo.trim(), 120) : '';
        const hashtags = Array.isArray(pieza.hashtags)
          ? pieza.hashtags.filter((h): h is string => typeof h === 'string').slice(0, MAX_ITEMS)
          : [];
        return [{ titulo, caption, hashtags }];
      })
    : [];
  return { titulo: cortar(r.titulo, 160), secciones, notas, textosPiezas: textosPiezas.slice(0, MAX_ITEMS) };
};

const TONO = ['cercano', 'experto', 'divertido', 'inspirador'];

const BASE_HERRAMIENTAS: DefinicionBase[] = [
  {
    id: 'caption',
    nombre: 'Caption IA',
    categoria: 'Contenido',
    descripcion: 'Caption con hook, cuerpo y CTA, afinado a la voz de la marca y a lo que ya rinde en tu cuenta.',
    icono: '✍️',
    rol: 'copywriter senior de redes sociales con experiencia en marcas de servicios y de producto',
    reglas: [
      'El hook va en las primeras 125 caracteres: es lo único visible antes del "más".',
      'Una idea por caption; cortá lo que no ayuda a decidir al lector.',
      'El CTA es una acción concreta y única: guardar, comentar una palabra o escribir por DM.',
      'No prometas resultados ni cifras que la marca no pueda sostener.',
      'Si hay historial, reutilizá la estructura de los captions que mejor rinden, sin copiarlos.',
      'Hashtags: 5 relevantes como máximo en el caption; Instagram admite hasta 30 por publicación.',
    ],
    campos: [
      {
        id: 'formato',
        etiqueta: 'Formato',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'imagen', 'video'],
      },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'leads', 'ventas'],
      },
      {
        id: 'idea',
        etiqueta: 'Idea del contenido',
        tipo: 'textarea',
        requerido: true,
        ayuda: 'De qué trata y qué querés que haga la gente',
      },
    ],
  },
  {
    id: 'hooks',
    nombre: 'Hook Factory',
    categoria: 'Contenido',
    descripcion: 'Cinco ganchos de los primeros 3 segundos, cada uno con su estructura y su versión para pantalla.',
    icono: '🪝',
    rol: 'especialista en retención de los primeros tres segundos de video y en titulares de carrusel',
    reglas: [
      'Un hook promete algo específico que el contenido entrega.',
      'Estructuras: contraste (lo que se cree vs lo que pasa), número concreto, pregunta con tensión, consecuencia y curiosidad abierta.',
      'Máximo 12 palabras; en video el hook se lee en 2 segundos.',
      'Sin prueba social con cifras inventadas: si no hay dato real, no se usa.',
      'Para cada hook indicá el tipo y por qué funciona.',
    ],
    campos: [
      { id: 'idea', etiqueta: 'Idea del contenido', tipo: 'textarea', requerido: true },
      { id: 'formato', etiqueta: 'Formato', tipo: 'select', requerido: true, opciones: ['reel', 'carrusel', 'video'] },
    ],
  },
  {
    id: 'hashtags',
    nombre: 'Hashtag Lab',
    categoria: 'Contenido',
    descripcion: 'Mezcla de hashtags por tamaño de nicho, con los que ya usaste en tus posts que mejor rinden.',
    icono: '#️⃣',
    rol: 'estratega de discovery en redes, con foco en alcance fuera de tus seguidores',
    reglas: [
      'Mezcla: 40% nicho específico, 40% nicho medio y 20% amplio o de tendencia relevante.',
      'Evitá los hashtags genéricos saturados (#love, #instagood, #follow, #like).',
      'No inventes volúmenes ni métricas de hashtags: no tenemos esa data.',
      'Priorizá los que ya aparecen en tus posts con mejor interacción.',
      'Sin espacios ni tildes; en minúsculas.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema o nicho', tipo: 'texto', requerido: true },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      { id: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: false, min: 3, max: 30 },
    ],
  },
  {
    id: 'guion',
    nombre: 'Guion de video',
    categoria: 'Contenido',
    descripcion: 'Guion con hook de 2 segundos, desarrollo con ritmo y cierre con CTA, listo para grabar.',
    icono: '🎬',
    rol: 'director de guiones para Reels y TikTok especializado en retención',
    reglas: [
      'Hook de 0 a 2 segundos: texto en pantalla y frase de voz que plantea la promesa.',
      'Un beat cada 2 o 3 segundos, con un cambio visual o de texto en cada uno.',
      'Diálogo corto y oral; sin saludos ni relleno.',
      'Cierre con una pregunta o un CTA concreto.',
      'Indicá la duración objetivo y el B-roll necesario.',
      'No prometas alcances ni resultados en el guion.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema', tipo: 'textarea', requerido: true },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      {
        id: 'duracion',
        etiqueta: 'Duración (segundos)',
        tipo: 'select',
        requerido: true,
        opciones: ['15', '30', '45', '60'],
      },
      { id: 'tono', etiqueta: 'Tono', tipo: 'select', requerido: true, opciones: TONO },
      {
        id: 'transcripcion',
        etiqueta: 'Transcripción del video grabado (opcional)',
        tipo: 'textarea',
        requerido: false,
        maxCaracteres: 8000,
        ayuda:
          'Pegá el SRT o líneas que empiecen con [mm:ss]. Sirve para recortar silencios y muletillas y generar subtítulos y el comando de edición.',
      },
    ],
  },
  {
    id: 'carrusel',
    nombre: 'Carrusel Builder',
    categoria: 'Contenido',
    descripcion: 'Estructura completa de un carrusel educativo: portada, una idea por slide y cierre con CTA.',
    icono: '🧩',
    rol: 'diseñador de contenido educativo para carruseles de redes sociales',
    reglas: [
      'La portada es una promesa concreta, con número o contraste.',
      'Una idea por slide; máximo 30 palabras por slide.',
      'Progresión lógica: problema, método, ejemplos y resumen.',
      'El último slide tiene un único CTA.',
      'Sugerí el texto de cada slide, no el diseño visual.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema', tipo: 'textarea', requerido: true },
      { id: 'slides', etiqueta: 'Cantidad de slides', tipo: 'select', requerido: true, opciones: ['5', '7', '10'] },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['educar', 'convertir', 'guardados', 'debate'],
      },
    ],
  },
  {
    id: 'repurpose',
    nombre: 'Repurposer',
    categoria: 'Contenido',
    descripcion: 'Adapta una pieza a otro formato sin perder el mensaje, indicando qué se gana y qué se pierde.',
    icono: '♻️',
    rol: 'editor multiformato con experiencia en reciclar contenido sin que se note',
    reglas: [
      'Reel: hook en 2 segundos, beats cortos y cierre con CTA.',
      'Carrusel: una idea por slide y portada con promesa.',
      'Post de imagen: una sola idea y un caption que se entiende solo.',
      'Respetá la tesis original; cambiá el envase, no el mensaje.',
      'Indicá explícitamente qué información se pierde al adaptar.',
    ],
    campos: [
      { id: 'contenido', etiqueta: 'Contenido original', tipo: 'textarea', requerido: true },
      {
        id: 'formato_origen',
        etiqueta: 'Formato original',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'post', 'video', 'blog', 'texto'],
      },
      {
        id: 'formato_destino',
        etiqueta: 'Formato destino',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'post', 'historia'],
      },
      {
        id: 'plataforma',
        etiqueta: 'Plataforma destino',
        tipo: 'select',
        requerido: false,
        opciones: ['instagram', 'tiktok'],
      },
    ],
  },
  {
    id: 'safety',
    nombre: 'Safety Check',
    categoria: 'Operación',
    descripcion: 'Revisa el caption antes de publicar: engagement bait, promesas absolutas, hashtags y links.',
    icono: '🛡️',
    rol: 'auditor de riesgo para cuentas de redes sociales; no das asesoría legal',
    reglas: [
      'Engagement bait (pedir etiquetas, likes o compartir a cambio de algo) es riesgo alto.',
      'Promesas absolutas o garantías son riesgo medio.',
      'Hasta 30 hashtags en Instagram; más es un error.',
      'Hashtags genéricos saturados son riesgo medio.',
      'Los links del caption no son clickeables en Instagram: usá "link en bio".',
      'Explicá cada hallazgo y dá una corrección concreta.',
    ],
    campos: [
      { id: 'caption', etiqueta: 'Caption', tipo: 'textarea', requerido: true },
      { id: 'hashtags', etiqueta: 'Hashtags', tipo: 'textarea', requerido: false },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
    ],
    soloReglas: true,
  },
  {
    id: 'perfil',
    nombre: 'Profile AI',
    categoria: 'Estrategia',
    descripcion: 'Bio, highlights y link en bio pensados para convertir visitas de perfil en seguidores o consultas.',
    icono: '✨',
    rol: 'especialista en perfiles de negocio y en convertir visitas de perfil',
    reglas: [
      'La bio dice qué hacés, para quién y con qué prueba; máximo 150 caracteres.',
      'Un solo CTA en la bio y uno en el link.',
      'Highlights por intención: empezar, resultados, servicios o precio, contacto.',
      'El nombre visible incluye una palabra clave del nicho.',
      'Sin promesas absolutas y con emojis mínimos.',
    ],
    campos: [
      { id: 'propuesta', etiqueta: 'Qué hace la marca y para quién', tipo: 'textarea', requerido: true },
      { id: 'bio_actual', etiqueta: 'Bio actual', tipo: 'textarea', requerido: false },
      { id: 'nombre_visible', etiqueta: 'Nombre visible', tipo: 'texto', requerido: false },
      { id: 'link', etiqueta: 'Link en bio', tipo: 'texto', requerido: false },
    ],
  },
  {
    id: 'respuestas',
    nombre: 'Respuestas IA',
    categoria: 'Comunidad',
    descripcion: 'Respuestas a comentarios y DMs con tono de marca, y criterio para escalar a una persona.',
    icono: '💬',
    rol: 'community manager senior con criterio de crisis y de ventas',
    reglas: [
      'Reconocé lo que la persona dijo antes de responder.',
      'Si el triaje detectó un lead, invitá a seguir por DM o al canal de contacto sin presionar.',
      'Si hay riesgo (salud, legal, dinero, datos, crisis o reembolso), la acción es escalar: no des una respuesta de venta.',
      'Si una respuesta aprobada por la marca aplica, usala sin cambiar lo esencial y sin inventar datos.',
      'Nunca prometas reembolsos, plazos ni resultados.',
      'Respuestas de una a tres frases, sin jerga.',
      'Spam: no respondas; el triaje ya indica si ocultar o ignorar.',
    ],
    campos: [
      { id: 'mensaje', etiqueta: 'Mensaje recibido', tipo: 'textarea', requerido: true, maxCaracteres: 2000 },
      { id: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: ['comentario', 'dm'] },
      {
        id: 'intencion',
        etiqueta: 'Intención',
        tipo: 'select',
        requerido: true,
        opciones: ['auto', 'pregunta', 'queja', 'elogio', 'lead', 'spam', 'otro'],
        ayuda: 'Auto: la herramienta la detecta del mensaje.',
      },
    ],
  },
  {
    id: 'plan',
    nombre: 'Plan semanal',
    categoria: 'Estrategia',
    descripcion: 'Calendario de publicación con formatos y horarios según lo que ya rinde en tu cuenta.',
    icono: '🗓️',
    rol: 'planner de contenido con experiencia en cadencias de publicación',
    reglas: [
      'Repartí los formatos según lo que mejor rinde en tu cuenta.',
      'Publicá en las franjas de mejor interacción cuando hay historial.',
      'No pongas dos piezas pesadas (video largo, carrusel complejo) el mismo día.',
      'Dejá un día de respiro entre piezas del mismo tema.',
      'Si no hay historial, indicá que los horarios son sugeridos.',
    ],
    campos: [
      { id: 'semanas', etiqueta: 'Semanas', tipo: 'select', requerido: true, opciones: ['1', '2', '4'] },
      { id: 'publicaciones', etiqueta: 'Publicaciones por semana', tipo: 'numero', requerido: true, min: 1, max: 7 },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'leads'],
      },
    ],
  },
  {
    id: 'metricas',
    nombre: 'Métricas explicadas',
    categoria: 'Estrategia',
    descripcion: 'Explica en lenguaje claro por qué cambió un número y qué mirar para confirmarlo.',
    icono: '📈',
    rol: 'analista de datos de redes sociales que separa correlación de causa y explica sin jerga',
    reglas: [
      'Separá lo que se observa de lo que se supone.',
      'Ordená las causas probables de la más a la menos probable.',
      'Para cada causa indicá cómo verificarla con tus posts.',
      'Si faltan datos, decilo y pedí lo que falta.',
      'No inventes cifras: usá solo las del pedido y del contexto.',
    ],
    campos: [
      {
        id: 'metrica',
        etiqueta: 'Métrica',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'seguidores', 'compartidos'],
      },
      { id: 'cambio', etiqueta: 'Qué cambió y en cuánto tiempo', tipo: 'textarea', requerido: true },
      { id: 'contexto', etiqueta: 'Contexto (opcional)', tipo: 'textarea', requerido: false },
    ],
  },
];

export const HERRAMIENTAS: HerramientaDef[] = [...BASE_HERRAMIENTAS, ...NUEVAS_HERRAMIENTAS].map(ENSAMBLAR_HERRAMIENTA);

export const herramientaPorId = (id: string): HerramientaDef | undefined => HERRAMIENTAS.find((h) => h.id === id);
