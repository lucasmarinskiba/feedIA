/**
 * Propuestas de los agentes especialistas (Instagram, TikTok, CM y estrategia), para exposición,
 * retención y gusto. Cada propuesta dice qué hacer, con qué gancho, cómo estructurar el contenido
 * para que la gente lo vea, se quede y lo termine, y qué métrica mirar. Si la cuenta tiene datos,
 * la propuesta cita esos datos; si no, queda marcada como buena práctica. Función pura.
 */

export type Objetivo = 'exposicion' | 'retencion' | 'gusto';
export type AgenteEspecialista = 'ada' | 'tomi' | 'cami' | 'max';
export type BaseEspecialista = 'datos' | 'buenas-practicas';
export type PrioridadEspecialista = 'alta' | 'media' | 'baja';

export const AGENTES_ESPECIALISTAS: Record<AgenteEspecialista, { nombre: string; emoji: string; rol: string }> = {
  ada: { nombre: 'Ada', emoji: '📷', rol: 'Especialista Instagram' },
  tomi: { nombre: 'Tomi', emoji: '🎵', rol: 'Especialista TikTok' },
  cami: { nombre: 'Cami', emoji: '💬', rol: 'Agente CM' },
  max: { nombre: 'Max', emoji: '🧠', rol: 'Agente IA · estrategia' },
};

export const OBJETIVOS: Record<Objetivo, string> = {
  exposicion: 'Exposición',
  retencion: 'Retención',
  gusto: 'Gusto',
};

const FORMATO_LABEL: Record<string, string> = {
  reel: 'reels',
  carrusel: 'carruseles',
  imagen: 'imágenes',
  video: 'videos',
};

export interface FormatoDatos {
  formato: string;
  posts: number;
  tasaMediana: number | null;
  alcanceMediano: number | null;
}

export interface DatosPlataformaEspecialista {
  plataforma: 'instagram' | 'tiktok';
  conectado: boolean;
  analizados: number;
  baseSuficiente: boolean;
  tasaMediana: number | null;
  tasaUltimos5: number | null;
  tasaAnteriores: number | null;
  mejorFormato: string | null;
  porFormato: FormatoDatos[];
  mejorHora: number | null;
  duracionMedianaSeg: number | null;
  retencionMedianaSeg: number | null;
}

export interface ContextoEspecialistas {
  marca: string;
  nicho: string;
  plataformas: DatosPlataformaEspecialista[];
}

export interface AccionEspecialista {
  label: string;
  tipo: 'tab' | 'ruta';
  valor: string;
}

export interface PropuestaEspecialista {
  id: string;
  agente: AgenteEspecialista;
  objetivo: Objetivo;
  prioridad: PrioridadEspecialista;
  titulo: string;
  paso: string;
  gancho: string | null;
  estructura: string[];
  senal: string;
  dato: string;
  base: BaseEspecialista;
  accion: AccionEspecialista;
}

const pct = (ratio: number): string => `${(ratio * 100).toFixed(2).replace('.', ',')} %`;
const idDe = (agente: AgenteEspecialista, clave: string): string => `esp-${agente}-${clave}`;

const datosDe = (
  ctx: ContextoEspecialistas,
  plataforma: 'instagram' | 'tiktok',
): DatosPlataformaEspecialista | undefined => ctx.plataformas.find((p) => p.plataforma === plataforma && p.conectado);

const conBase = (d: DatosPlataformaEspecialista | undefined): d is DatosPlataformaEspecialista =>
  d !== undefined && d.baseSuficiente;

const ganchoReel = 'Primer segundo: texto en pantalla con el resultado o la pregunta que resuelve el video.';
const ganchoCarrusel = 'Portada: una promesa concreta con número (por ejemplo, "3 errores que cuestan seguidores").';

const estructuraReel = [
  '0–2 s: gancho visible en pantalla (texto + primera imagen con contraste).',
  '2–8 s: el problema o la promesa que genera tensión.',
  '8–20 s: la solución en pasos cortos, con un corte cada 2–3 s.',
  'Final: cierre que invita a guardar o comentar.',
];

const estructuraCarrusel = [
  'Slide 1: promesa concreta, con número y sin relleno.',
  'Slides 2 a 6: un paso por slide, una idea y una frase.',
  'Último slide: resumen para guardar + pregunta para comentar.',
];

const estructuraTikTok = [
  '0–1 s: movimiento o texto que dice de qué va el video.',
  '1–5 s: el problema, en voz o texto, sin presentaciones.',
  '5–20 s: el contenido en un solo punto clave, con cortes rápidos.',
  'Final: una línea que hace volver a verlo (loop o respuesta a la pregunta del inicio).',
];

export const reglasEspecialistas = (ctx: ContextoEspecialistas): PropuestaEspecialista[] => {
  const props: PropuestaEspecialista[] = [];
  const ig = datosDe(ctx, 'instagram');
  const tt = datosDe(ctx, 'tiktok');
  const nicho = ctx.nicho || 'tu nicho';

  if (conBase(ig) && ig.mejorFormato) {
    const f = ig.mejorFormato;
    const fila = ig.porFormato.find((x) => x.formato === f);
    const resto = ig.porFormato.filter((x) => x.formato !== f && x.tasaMediana !== null);
    const otrosTasa = resto.length > 0 ? resto.reduce((s, x) => s + (x.tasaMediana ?? 0), 0) / resto.length : null;
    const datoTasa =
      fila?.tasaMediana !== null && fila?.tasaMediana !== undefined ? pct(fila.tasaMediana) : 'sin medir';
    const comparacion = otrosTasa !== null ? ` frente a ${pct(otrosTasa)} del resto` : '';
    const esReel = f === 'reel';
    props.push({
      id: idDe('ada', `formato-${f}`),
      agente: 'ada',
      objetivo: 'exposicion',
      prioridad: 'alta',
      titulo: `Subí más ${FORMATO_LABEL[f] ?? f}: es lo que mejor rinde en tu cuenta`,
      paso: `Planificá 2 de cada 3 publicaciones en ${FORMATO_LABEL[f] ?? f} durante 2 semanas y mirá la tasa de interacción.`,
      gancho: esReel ? ganchoReel : ganchoCarrusel,
      estructura: esReel ? estructuraReel : estructuraCarrusel,
      senal: 'Alcance mediano y guardados por publicación: meta, superar la mediana actual en 20 %.',
      dato: `Tasa mediana de ${FORMATO_LABEL[f] ?? f}: ${datoTasa}${comparacion}`,
      base: 'datos',
      accion: { label: 'Crear pieza', tipo: 'ruta', valor: esReel ? 'studio-reel' : 'studio-carousel' },
    });
  }

  if (conBase(ig) && ig.retencionMedianaSeg !== null && ig.duracionMedianaSeg && ig.duracionMedianaSeg > 0) {
    const ratio = ig.retencionMedianaSeg / ig.duracionMedianaSeg;
    if (ratio < 0.5) {
      props.push({
        id: idDe('ada', 'retencion-reels'),
        agente: 'ada',
        objetivo: 'retencion',
        prioridad: 'alta',
        titulo: 'La gente deja tus reels a la mitad: adelantá el payoff',
        paso: 'Mostrá el resultado o la respuesta en los primeros 3 segundos y después explicalo, en lugar de dejarlo para el final.',
        gancho: ganchoReel,
        estructura: [
          '0–3 s: el resultado o la respuesta, en texto y en imagen.',
          '3–10 s: cómo se llega, en un solo paso.',
          'Resto: detalles, en cortes de 2–3 s; si no suma, cortalo.',
        ],
        senal: 'Tiempo medio de visualización: meta, pasar del 50 % de la duración.',
        dato: `Se ve ${Math.round(ratio * 100)} % de la duración en promedio (${ig.retencionMedianaSeg.toFixed(1)} s de ${ig.duracionMedianaSeg.toFixed(1)} s)`,
        base: 'datos',
        accion: { label: 'Crear reel', tipo: 'ruta', valor: 'studio-reel' },
      });
    }
  }

  if (conBase(ig) && ig.mejorHora !== null) {
    props.push({
      id: idDe('ada', `hora-${ig.mejorHora}`),
      agente: 'ada',
      objetivo: 'exposicion',
      prioridad: 'media',
      titulo: `Publicá alrededor de las ${ig.mejorHora}h`,
      paso: 'Dejá programada la publicación en esa franja y revisá los primeros 60 minutos de respuesta.',
      gancho: null,
      estructura: [],
      senal: 'Alcance en la primera hora frente a tu promedio.',
      dato: `Tu mejor franja según tus publicaciones: ${ig.mejorHora}h`,
      base: 'datos',
      accion: { label: 'Ver calendario', tipo: 'ruta', valor: 'calendar' },
    });
  }

  if (!conBase(ig)) {
    props.push({
      id: idDe('ada', 'base-reels'),
      agente: 'ada',
      objetivo: 'retencion',
      prioridad: 'media',
      titulo: 'Reels: que se entienda en el primer segundo',
      paso: 'Usá la primera imagen con texto grande que dice el resultado, y no una presentación.',
      gancho: ganchoReel,
      estructura: estructuraReel,
      senal: 'Tiempo medio de visualización sobre la duración del reel.',
      dato: 'Buena práctica general. Conectá Instagram para personalizarla con tus datos.',
      base: 'buenas-practicas',
      accion: { label: 'Crear reel', tipo: 'ruta', valor: 'studio-reel' },
    });
  }

  if (conBase(tt) && tt.duracionMedianaSeg && tt.duracionMedianaSeg > 30) {
    props.push({
      id: idDe('tomi', 'duracion'),
      agente: 'tomi',
      objetivo: 'retencion',
      prioridad: 'alta',
      titulo: 'Acortá tus videos a 15–25 segundos',
      paso: 'Cortá lo que no suma, deja un solo punto clave por video y cerrá antes del minuto.',
      gancho: 'Primer segundo: movimiento o texto que dice de qué va el video.',
      estructura: estructuraTikTok,
      senal: 'Porcentaje de videos vistos completos, y vistas a los 3 segundos.',
      dato: `Duración mediana de tus videos: ${tt.duracionMedianaSeg.toFixed(0)} s`,
      base: 'datos',
      accion: { label: 'Crear video', tipo: 'ruta', valor: 'studio-tiktok' },
    });
  }

  if (conBase(tt) && tt.mejorFormato) {
    props.push({
      id: idDe('tomi', `serie-${tt.mejorFormato}`),
      agente: 'tomi',
      objetivo: 'exposicion',
      prioridad: 'media',
      titulo: `Convertí tus ${FORMATO_LABEL[tt.mejorFormato] ?? tt.mejorFormato} en serie numerada`,
      paso: 'Titulá cada video como "Parte 1", "Parte 2"… y cerrá con un anticipo del siguiente.',
      gancho: 'Primer segundo: "Parte 2 de…" con el tema en texto grande.',
      estructura: estructuraTikTok,
      senal: 'Vistas de los videos de la serie y cuántos ven el siguiente.',
      dato: `Tu formato con mejor tasa en TikTok: ${FORMATO_LABEL[tt.mejorFormato] ?? tt.mejorFormato}`,
      base: 'datos',
      accion: { label: 'Crear video', tipo: 'ruta', valor: 'studio-tiktok' },
    });
  }

  if (
    conBase(tt) &&
    tt.tasaUltimos5 !== null &&
    tt.tasaAnteriores !== null &&
    tt.tasaAnteriores > 0 &&
    tt.tasaUltimos5 < tt.tasaAnteriores * 0.8
  ) {
    props.push({
      id: idDe('tomi', 'caida-reciente'),
      agente: 'tomi',
      objetivo: 'gusto',
      prioridad: 'alta',
      titulo: 'Tus últimos videos rinden menos: volvé al gancho que sí funcionó',
      paso: 'Reusá el primer segundo y el tema de tu mejor video de las últimas semanas, con un ángulo nuevo.',
      gancho: null,
      estructura: estructuraTikTok,
      senal: 'Tasa de interacción de los próximos 5 videos, contra el promedio anterior.',
      dato: `Últimos 5: ${pct(tt.tasaUltimos5)} frente a ${pct(tt.tasaAnteriores)} de los anteriores`,
      base: 'datos',
      accion: { label: 'Ver análisis de posts', tipo: 'tab', valor: 'posts' },
    });
  }

  if (!conBase(tt)) {
    props.push({
      id: idDe('tomi', 'base-tiktok'),
      agente: 'tomi',
      objetivo: 'retencion',
      prioridad: 'media',
      titulo: 'TikTok: que el video se termine de ver',
      paso: 'Diseñá el final para que lleve a volver a verlo: una respuesta que cambia si lo vuelven a mirar.',
      gancho: 'Primer segundo: movimiento o texto que dice de qué va el video.',
      estructura: estructuraTikTok,
      senal: 'Porcentaje de videos vistos completos.',
      dato: 'Buena práctica general. Conectá TikTok para personalizarla con tus datos.',
      base: 'buenas-practicas',
      accion: { label: 'Crear video', tipo: 'ruta', valor: 'studio-tiktok' },
    });
  }

  const tasaRef = ig ?? tt;
  const cayendo =
    conBase(tasaRef) &&
    tasaRef.tasaUltimos5 !== null &&
    tasaRef.tasaAnteriores !== null &&
    tasaRef.tasaUltimos5 < tasaRef.tasaAnteriores;
  props.push({
    id: idDe('cami', 'responder-rapido'),
    agente: 'cami',
    objetivo: 'gusto',
    prioridad: cayendo ? 'alta' : 'media',
    titulo: 'Respondé los comentarios en la primera hora',
    paso: 'Dejá un bloque fijo de 15 minutos después de cada publicación para responder cada comentario con nombre y una pregunta.',
    gancho: null,
    estructura: [],
    senal: 'Comentarios por publicación en la primera hora, y respuestas enviadas.',
    dato: cayendo
      ? 'La interacción de tus últimas publicaciones bajó frente a las anteriores.'
      : `Buena práctica para ${nicho}. Hacelo también cuando la interacción esté estable.`,
    base: cayendo ? 'datos' : 'buenas-practicas',
    accion: { label: 'Responder a la comunidad', tipo: 'ruta', valor: 'inbox' },
  });
  props.push({
    id: idDe('cami', 'pregunta-cierre'),
    agente: 'cami',
    objetivo: 'gusto',
    prioridad: 'media',
    titulo: 'Cerrá cada publicación con una pregunta que se responda con una palabra',
    paso: 'Preguntá "¿cuál elegís, A o B?" o "¿te pasó?" en lugar de "¿qué opinan?".',
    gancho: null,
    estructura: [],
    senal: 'Comentarios por publicación frente a tu promedio.',
    dato: `Pensado para ${nicho}, donde la gente opina con una palabra.`,
    base: 'buenas-practicas',
    accion: { label: 'Crear pieza', tipo: 'ruta', valor: 'studio-carousel' },
  });

  props.push({
    id: idDe('max', 'colaboraciones'),
    agente: 'max',
    objetivo: 'exposicion',
    prioridad: 'media',
    titulo: 'Sumá colaboraciones con cuentas de audiencia parecida',
    paso: 'Invitá a un creador a un post en colaboración: el contenido aparece en los dos perfiles.',
    gancho: null,
    estructura: [],
    senal: 'Alcance del post colaborativo frente a tu alcance mediano.',
    dato: 'Buena práctica general para crecer sin pagar. Revisá la sección Collabs.',
    base: 'buenas-practicas',
    accion: { label: 'Ver Collabs', tipo: 'tab', valor: 'collabs' },
  });
  props.push({
    id: idDe('max', 'probar-ganchos'),
    agente: 'max',
    objetivo: 'retencion',
    prioridad: 'media',
    titulo: 'Probá dos ganchos distintos con el mismo tema y medí cuál retiene más',
    paso: 'Publicá el mismo tema con dos primeros segundos distintos (resultado vs pregunta) y compará la retención.',
    gancho: null,
    estructura: [],
    senal: 'Diferencia de tiempo de visualización o de tasa entre las dos variantes.',
    dato: 'Buena práctica: el experimento te dice qué funciona en tu audiencia, no lo que se ve bien en general.',
    base: 'buenas-practicas',
    accion: { label: 'Abrir experimentos', tipo: 'tab', valor: 'experiments' },
  });
  props.push({
    id: idDe('max', 'pilares'),
    agente: 'max',
    objetivo: 'gusto',
    prioridad: 'baja',
    titulo: 'Definí 3 pilares de contenido y repetilos',
    paso: 'Elegí tres temas que tu audiencia asocia con vos y alterná entre ellos; la gente vuelve por el tema, no por un post suelto.',
    gancho: null,
    estructura: [],
    senal: 'Seguidores nuevos por mes y proporción de seguidores que interactúan.',
    dato: 'Buena práctica general para construir gusto sostenido.',
    base: 'buenas-practicas',
    accion: { label: 'Ver Analytics', tipo: 'tab', valor: 'analytics' },
  });

  const orden: Record<PrioridadEspecialista, number> = { alta: 0, media: 1, baja: 2 };
  return props.sort((a, b) => orden[a.prioridad] - orden[b.prioridad]).slice(0, 12);
};

const esAgente = (v: unknown): v is AgenteEspecialista => v === 'ada' || v === 'tomi' || v === 'cami' || v === 'max';
const esObjetivo = (v: unknown): v is Objetivo => v === 'exposicion' || v === 'retencion' || v === 'gusto';

export const validarIdeasIA = (raw: unknown, ctx: ContextoEspecialistas): PropuestaEspecialista[] => {
  if (!Array.isArray(raw)) return [];
  const hayDatos = ctx.plataformas.some((p) => p.conectado && p.baseSuficiente);
  const salida: PropuestaEspecialista[] = [];
  raw.forEach((item, i) => {
    if (typeof item !== 'object' || item === null) return;
    const o = item as Record<string, unknown>;
    if (!esAgente(o['agente']) || !esObjetivo(o['objetivo'])) return;
    const titulo = typeof o['titulo'] === 'string' ? o['titulo'].slice(0, 140) : '';
    const paso = typeof o['paso'] === 'string' ? o['paso'].slice(0, 400) : '';
    const senal = typeof o['senal'] === 'string' ? o['senal'].slice(0, 200) : '';
    if (!titulo || !paso || !senal) return;
    const estructura = Array.isArray(o['estructura'])
      ? o['estructura']
          .filter((x): x is string => typeof x === 'string')
          .slice(0, 6)
          .map((x) => x.slice(0, 200))
      : [];
    const gancho = typeof o['gancho'] === 'string' && o['gancho'].length > 0 ? o['gancho'].slice(0, 240) : null;
    salida.push({
      id: idDe(o['agente'], `ia-${i}-${titulo.slice(0, 24).replace(/\W+/g, '-').toLowerCase()}`),
      agente: o['agente'],
      objetivo: o['objetivo'],
      prioridad: 'media',
      titulo,
      paso,
      gancho,
      estructura,
      senal,
      dato: hayDatos
        ? 'Propuesta generada por IA a partir de tus datos.'
        : 'Propuesta generada por IA como buena práctica. Conectá tus cuentas para personalizarla.',
      base: hayDatos ? 'datos' : 'buenas-practicas',
      accion: { label: 'Crear pieza', tipo: 'ruta', valor: 'studio-reel' },
    });
  });
  return salida.slice(0, 8);
};

export const promptEspecialistas = (ctx: ContextoEspecialistas): string => {
  const resumen = ctx.plataformas.map((p) => ({
    plataforma: p.plataforma,
    conectado: p.conectado,
    baseSuficiente: p.baseSuficiente,
    analizados: p.analizados,
    tasaMedianaPct: p.tasaMediana === null ? null : Number((p.tasaMediana * 100).toFixed(2)),
    tendencia:
      p.tasaUltimos5 !== null && p.tasaAnteriores !== null
        ? p.tasaUltimos5 < p.tasaAnteriores
          ? 'bajando'
          : 'estable o subiendo'
        : null,
    mejorFormato: p.mejorFormato,
    porFormato: p.porFormato.map((f) => ({
      formato: f.formato,
      posts: f.posts,
      tasaMedianaPct: f.tasaMediana === null ? null : Number((f.tasaMediana * 100).toFixed(2)),
    })),
    mejorHora: p.mejorHora,
    duracionMedianaSeg: p.duracionMedianaSeg,
    retencionMedianaSeg: p.retencionMedianaSeg,
  }));
  return `Sos el equipo de especialistas de la cuenta "${ctx.marca}" (nicho: ${ctx.nicho || 'sin definir'}).
Datos reales de la cuenta: ${JSON.stringify(resumen)}

Generá entre 5 y 8 propuestas para lograr exposición (que la gente lo vea), retención (que se quede y lo termine) y gusto (que le guste y vuelva).
Agentes: ada (Instagram), tomi (TikTok), cami (comunidad), max (estrategia).
Reglas:
- Cada propuesta dice qué hacer en concreto, con el gancho de los primeros segundos y la estructura del contenido paso a paso.
- Si hay datos, citá el dato que la origina. Si no hay, marcala como buena práctica.
- No inventes cifras ni cuentas. No prometas resultados.
- Español rioplatense neutro, sin relleno.

JSON: array de objetos con keys agente, objetivo (exposicion|retencion|gusto), titulo, paso, gancho, estructura (array de strings), senal.`;
};
