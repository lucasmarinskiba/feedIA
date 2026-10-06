/**
 * Planificación determinista de las herramientas IA: fechas y horarios en hora de Buenos Aires,
 * huecos libres del calendario y movimientos de piezas. La IA escribe los textos; las fechas las
 * calcula este módulo, así que no dependen de lo que devuelva el modelo. Función pura.
 */

export type FormatoPieza = 'reel' | 'carrusel' | 'imagen' | 'historia';
export type PlataformaPieza = 'instagram' | 'tiktok';

export interface MomentoPlan {
  dia: string;
  franja: string;
}

export interface PiezaCreacion {
  titulo: string;
  formato: FormatoPieza;
  plataforma: PlataformaPieza;
  caption: string;
  hashtags: string[];
  scheduledAt: string | null;
}

export interface MovimientoCalendario {
  postId: string;
  plataforma: PlataformaPieza;
  caption: string;
  actual: string | null;
  propuesto: string;
  motivo: string;
}

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_SIN_HISTORIAL = ['martes', 'miércoles', 'jueves', 'lunes', 'viernes', 'sábado', 'domingo'];
const HORA_MS = 3_600_000;
const DIA_MS = 86_400_000;
const OFFSET_ART_H = 3;
const MAX_MOVIMIENTOS = 10;
const MAX_HUECOS = 300;
const MAX_DESFASE_HORAS = 3;

const FRANJA_HORA: Record<string, number> = { madrugada: 6, mañana: 9, mediodía: 13, tarde: 18, noche: 20 };

export const horaDeFranja = (franja: string): number => FRANJA_HORA[franja] ?? 19;

const indiceDia = (dia: string): number => DIAS.indexOf(dia.toLowerCase());

/** Próxima ocurrencia de un día y hora de Buenos Aires, estrictamente después de desdeMs. */
export const proximaOcurrencia = (dia: string, hora: number, desdeMs: number): string | null => {
  const idx = indiceDia(dia);
  if (idx < 0 || !Number.isInteger(hora) || hora < 0 || hora > 23) return null;
  const local = new Date(desdeMs - OFFSET_ART_H * HORA_MS);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth();
  const d = local.getUTCDate();
  for (let k = 0; k <= 8; k++) {
    const candidato = Date.UTC(y, m, d + k, hora + OFFSET_ART_H);
    const diaLocal = new Date(candidato - OFFSET_ART_H * HORA_MS).getUTCDay();
    if (diaLocal === idx && candidato > desdeMs + HORA_MS) return new Date(candidato).toISOString();
  }
  return null;
};

/** Día y hora de Buenos Aires de un instante ISO, para comparar con los momentos de la cuenta. */
export const momentoDeIso = (iso: string): MomentoPlan | null => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const local = new Date(t - OFFSET_ART_H * HORA_MS);
  const hora = local.getUTCHours();
  const franja = hora < 6 ? 'madrugada' : hora < 12 ? 'mañana' : hora < 15 ? 'mediodía' : hora < 19 ? 'tarde' : 'noche';
  return { dia: DIAS[local.getUTCDay()] ?? '', franja };
};

const fuentesDeMomentos = (momentos: MomentoPlan[]): MomentoPlan[] =>
  momentos.length > 0 ? momentos : DIAS_SIN_HISTORIAL.map((dia) => ({ dia, franja: 'tarde' }));

/**
 * Reparte `semanas * porSemana` publicaciones en los mejores momentos de la cuenta, sin repetir
 * un mismo instante. Sin historial usa tardes distribuidas por la semana.
 */
export const planificarSlots = (entrada: {
  semanas: number;
  porSemana: number;
  momentos: MomentoPlan[];
  desdeMs: number;
}): Array<string | null> => {
  const fuentes = fuentesDeMomentos(entrada.momentos);
  const usados = new Set<string>();
  const salida: Array<string | null> = [];
  for (let s = 0; s < entrada.semanas; s++) {
    const inicioSemana = entrada.desdeMs + s * 7 * DIA_MS;
    for (let p = 0; p < entrada.porSemana; p++) {
      const indice = s * entrada.porSemana + p;
      let asignado: string | null = null;
      for (let desfase = 0; desfase < MAX_DESFASE_HORAS && asignado === null; desfase++) {
        for (let intento = 0; intento < fuentes.length && asignado === null; intento++) {
          const momento = fuentes[(indice + intento) % fuentes.length];
          if (!momento) break;
          const iso = proximaOcurrencia(momento.dia, horaDeFranja(momento.franja) + desfase, inicioSemana);
          if (iso && !usados.has(iso)) asignado = iso;
        }
      }
      if (asignado) usados.add(asignado);
      salida.push(asignado);
    }
  }
  return salida;
};

/** Huecos libres en la ventana, en los mejores momentos de la cuenta, ordenados cronológicamente. */
export const huecosLibres = (
  momentos: MomentoPlan[],
  desdeMs: number,
  ventanaDias: number,
  ocupados: Set<string>,
): string[] => {
  const fuentes = fuentesDeMomentos(momentos);
  const huecos = new Set<string>();
  for (let k = 0; k < ventanaDias; k++) {
    const base = desdeMs + k * DIA_MS;
    for (const momento of fuentes) {
      const iso = proximaOcurrencia(momento.dia, horaDeFranja(momento.franja), base);
      if (iso && Date.parse(iso) <= desdeMs + ventanaDias * DIA_MS && !ocupados.has(iso)) huecos.add(iso);
    }
  }
  return [...huecos].sort((a, b) => Date.parse(a) - Date.parse(b)).slice(0, MAX_HUECOS);
};

export interface PostCalendarioPlan {
  id: string;
  plataforma: PlataformaPieza;
  caption: string;
  status: 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';
  scheduledAt: string | null;
}

const enVentana = (iso: string | null, desdeMs: number, ventanaDias: number): boolean => {
  if (!iso) return false;
  const t = Date.parse(iso);
  return Number.isFinite(t) && t >= desdeMs && t <= desdeMs + ventanaDias * DIA_MS;
};

/** Mueve piezas programadas o en borrador a horarios de mayor interacción, sin pisar otras piezas. */
export const movimientosOptimizar = (
  posts: PostCalendarioPlan[],
  momentos: MomentoPlan[],
  desdeMs: number,
  ventanaDias: number,
): MovimientoCalendario[] => {
  const ocupados = new Set(posts.flatMap((p) => (p.scheduledAt && p.status === 'scheduled' ? [p.scheduledAt] : [])));
  const mejores = new Set(momentos.map((m) => `${m.dia}|${m.franja}`));
  const candidatos = posts.filter(
    (p) =>
      (p.status === 'draft' && p.scheduledAt === null) ||
      (p.status === 'scheduled' && enVentana(p.scheduledAt, desdeMs, ventanaDias)),
  );
  const huecos = huecosLibres(momentos, desdeMs, ventanaDias, ocupados);
  const movimientos: MovimientoCalendario[] = [];
  for (const post of candidatos) {
    if (movimientos.length >= MAX_MOVIMIENTOS) break;
    const actual = post.scheduledAt ? momentoDeIso(post.scheduledAt) : null;
    if (actual && mejores.has(`${actual.dia}|${actual.franja}`)) continue;
    const propuesto = huecos.shift();
    if (!propuesto) break;
    ocupados.add(propuesto);
    movimientos.push({
      postId: post.id,
      plataforma: post.plataforma,
      caption: post.caption,
      actual: post.scheduledAt,
      propuesto,
      motivo: post.scheduledAt
        ? 'Pasa de un horario con menos interacción a uno de los mejores de tu cuenta.'
        : 'Borrador sin fecha: se le asigna uno de los mejores horarios de tu cuenta.',
    });
  }
  return movimientos;
};

/** Piezas programadas que ya vencieron sin publicarse, reubicadas en el próximo hueco libre. */
export const movimientosReprogramar = (
  posts: PostCalendarioPlan[],
  momentos: MomentoPlan[],
  desdeMs: number,
  ventanaDias: number,
): MovimientoCalendario[] => {
  const vencidas = posts
    .filter((p) => p.status === 'scheduled' && p.scheduledAt !== null && Date.parse(p.scheduledAt) < desdeMs - HORA_MS)
    .sort((a, b) => Date.parse(a.scheduledAt ?? '') - Date.parse(b.scheduledAt ?? ''));
  const ocupados = new Set(posts.flatMap((p) => (p.scheduledAt && p.status === 'scheduled' ? [p.scheduledAt] : [])));
  const huecos = huecosLibres(momentos, desdeMs, ventanaDias, ocupados);
  const movimientos: MovimientoCalendario[] = [];
  for (const post of vencidas.slice(0, MAX_MOVIMIENTOS)) {
    const propuesto = huecos.shift();
    if (!propuesto) break;
    movimientos.push({
      postId: post.id,
      plataforma: post.plataforma,
      caption: post.caption,
      actual: post.scheduledAt,
      propuesto,
      motivo: 'Venció sin publicarse: se reubica en el próximo mejor horario libre.',
    });
  }
  return movimientos;
};

/** Pieza de una sola publicación para herramientas que entregan un texto (caption, guion, carrusel). */
export const piezaUnica = (entrada: {
  titulo: string;
  formato: FormatoPieza;
  plataforma: PlataformaPieza;
  caption: string;
  hashtags?: string[];
}): PiezaCreacion => ({
  titulo: entrada.titulo.slice(0, 120),
  formato: entrada.formato,
  plataforma: entrada.plataforma,
  caption: entrada.caption,
  hashtags: entrada.hashtags ?? [],
  scheduledAt: null,
});
