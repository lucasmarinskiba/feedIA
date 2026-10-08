/**
 * Predictor de contenido: estima alcance, tasa de interacción y tiempo de visualización de un
 * contenido nuevo a partir del historial real de la cuenta.
 *
 * Regresión ridge en escala logarítmica sobre todas las características a la vez (formato,
 * franja, día, hook, CTA, largo, hashtags, emojis, duración, números y recencia). Ajustar una
 * característica por vez contaría dos veces señales correlacionadas; ridge reparte el efecto entre
 * ellas y encoge los grupos con pocos posts. La fuerza de la regularización se elige por validación
 * cruzada (5 pliegues), no a mano.
 *
 * La calidad se mide contra un baseline honesto: el promedio de los posts anteriores. Q² y la
 * mejora porcentual en error absoluto dicen cuánto mejor que "adivinar la media" es el modelo en
 * esta cuenta (leave-one-out). Rangos y probabilidades salen de esos mismos errores.
 * Función pura: no toca red ni disco.
 */

import { horaLocalDe, mediana, tasaDeInteraccion, type PostCrudo } from './postsMetricas.js';

export type FormatoContenido = 'reel' | 'carrusel' | 'imagen' | 'video';
export type PlataformaContenido = 'instagram' | 'tiktok';
export type Confianza = 'alta' | 'media' | 'baja' | 'sin-datos';

export interface PostHistorial {
  id: string;
  plataforma: PlataformaContenido;
  formato: FormatoContenido;
  captionCompleto: string;
  publicadoEn: string;
  duracionSeg: number | null;
  tasaInteraccion: number | null;
  alcance: number | null;
  tiempoVisualizacionSeg: number | null;
}

export interface EntradaContenido {
  plataforma: PlataformaContenido;
  formato: FormatoContenido;
  caption: string;
  hashtags: string[];
  hora: number | null;
  dia: string | null;
  duracionSeg: number | null;
}

export interface RangoPrediccion {
  p10: number;
  p50: number;
  p90: number;
}

export interface FactorPrediccion {
  factor: string;
  efecto: 'positivo' | 'negativo';
  impactoPct: number;
  evidencia: string;
}

export interface EstadisticasModelo {
  n: number;
  lambda: number;
  medianaTasa: number | null;
  p25Tasa: number | null;
  p75Tasa: number | null;
  q2: number | null;
  mejoraVsPromedioPct: number | null;
  errorTipicoPct: number | null;
  intervalo: string;
}

export interface Distribucion {
  bins: Array<{ desde: number; hasta: number; n: number }>;
  prediccionTasa: number | null;
  medianaTasa: number | null;
}

export interface GrupoResumen {
  clave: string;
  etiqueta: string;
  posts: number;
  tasaMediana: number;
  vsMediana: number | null;
}

export type NivelVeredicto = 'fuerte' | 'promedio' | 'debil' | 'sin-datos';

export interface Veredicto {
  nivel: NivelVeredicto;
  titulo: string;
  texto: string;
}

export interface PrediccionContenido {
  plataforma: PlataformaContenido;
  veredicto: Veredicto;
  postsUsados: number;
  confianza: Confianza;
  exactitud: { tasaErrorTipicoPct: number | null; alcanceErrorTipicoPct: number | null };
  estadisticas: EstadisticasModelo;
  tasaInteraccion: RangoPrediccion | null;
  alcance: RangoPrediccion | null;
  probabilidades: { superarMediana: number | null; entreLosMejores25: number | null };
  medianas: { tasaInteraccion: number | null; alcance: number | null };
  retencion: {
    disponible: boolean;
    motivo: string;
    tiempoVisualizacionSeg: RangoPrediccion | null;
    postsConDato: number;
  };
  factores: FactorPrediccion[];
  recomendaciones: string[];
  mejoresMomentos: Array<{ dia: string; franja: string; tasaMediana: number; posts: number }>;
  mejorMomentoFormato: { dia: string; franja: string; tasaMediana: number; posts: number } | null;
  distribucion: Distribucion;
}

export interface ResumenHistorial {
  plataformas: Array<{
    plataforma: PlataformaContenido;
    posts: number;
    medianaTasa: number | null;
    porFormato: GrupoResumen[];
    porFranja: GrupoResumen[];
    porHook: GrupoResumen[];
    porCta: GrupoResumen[];
  }>;
}

type Caracteristicas = Record<string, string>;

const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';
const DIA_MS = 86_400_000;
export const MIN_POSTS_PREDICCION = 8;
export const MIN_POSTS_ALTA = 21;
const MIN_POSTS_RETENCION = 6;
const MIN_GRUPO = 2;
const MIN_GRUPO_RECOMENDACION = 3;
const LAMBDAS_CANDIDATAS = [0.5, 1, 3, 8, 20];
const LAMBDA_POR_DEFECTO = 3;
const PLIEGUES = 5;
const UMBRAL_EFECTO = 0.05;
const MEJORA_MINIMA = 1.15;
const EPSILON_TASA = 0.01;
const MAX_FACTORES = 6;
const MAX_RECOMENDACIONES = 4;
const BINS_DISTRIBUCION = 8;

const ETIQUETAS: Record<string, Record<string, string>> = {
  formato: { reel: 'Formato reel', carrusel: 'Formato carrusel', imagen: 'Formato imagen', video: 'Formato video' },
  franja: {
    madrugada: 'Publicar de madrugada',
    mañana: 'Publicar a la mañana',
    mediodía: 'Publicar al mediodía',
    tarde: 'Publicar a la tarde',
    noche: 'Publicar a la noche',
  },
  dia: {
    lunes: 'Publicar el lunes',
    martes: 'Publicar el martes',
    miércoles: 'Publicar el miércoles',
    jueves: 'Publicar el jueves',
    viernes: 'Publicar el viernes',
    sábado: 'Publicar el sábado',
    domingo: 'Publicar el domingo',
  },
  hook: {
    pregunta: 'Hook en forma de pregunta',
    numero: 'Hook con número',
    contraste: 'Hook de contraste (nadie, error, secreto)',
    otro: 'Hook directo',
  },
  cta: { 'con-cta': 'Llamado a la acción (guardá, comentá, compartí)', 'sin-cta': 'Sin llamado a la acción' },
  largo: { corto: 'Caption corto', medio: 'Caption medio', largo: 'Caption largo', 'muy-largo': 'Caption muy largo' },
  hashtags: { '0': 'Sin hashtags', '1-4': '1 a 4 hashtags', '5-12': '5 a 12 hashtags', '13+': '13 o más hashtags' },
  emojis: { '0': 'Sin emojis', '1-3': '1 a 3 emojis', '4+': '4 o más emojis' },
  duracion: {
    '≤15s': 'Duración de hasta 15 s',
    '16-30s': 'Duración de 16 a 30 s',
    '31-60s': 'Duración de 31 a 60 s',
    '>60s': 'Duración de más de 60 s',
  },
  numeros: { 'con-numeros': 'Caption con números', 'sin-numeros': 'Caption sin números' },
  recencia: {
    '≤1d': 'Publicar con 1 día o menos desde el anterior',
    '2-3d': 'Publicar 2 o 3 días después del anterior',
    '4-7d': 'Publicar entre 4 y 7 días después del anterior',
    '8d+': 'Publicar 8 días o más después del anterior',
  },
};

const CARACTERISTICAS_ACCIONABLES = ['hook', 'cta', 'largo', 'hashtags', 'emojis', 'numeros', 'franja', 'dia'] as const;
const CARACTERISTICAS_NO_APLICA = new Set(['sin-dato', 'no-aplica']);

const redondear = (n: number, decimales = 1): number => {
  const f = 10 ** decimales;
  return Math.round(n * f) / f;
};

const franjaDe = (hora: number): string => {
  if (hora < 6) return 'madrugada';
  if (hora < 12) return 'mañana';
  if (hora < 15) return 'mediodía';
  if (hora < 19) return 'tarde';
  return 'noche';
};

export const diaDeIso = (iso: string): string | null => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat('es-AR', { timeZone: ZONA_HORARIA, weekday: 'long' }).format(ms).toLowerCase();
};

const PREGUNTA = /^\s*(¿|cómo|como|por qué|porque|qué|que|cuál|cual|cuándo|cuando|dónde|donde|sabías|sabias)\b/i;
const CONTRASTE =
  /\b(nadie|nunca|error|errores|mito|mitos|secreto|verdad|honesto|deja de|dejá de|pará|basta|cuidado)\b/i;
const CTA =
  /\b(guard[aá]|guardalo|guárdalo|comenta|coment[aá]|compart[ií]|etiqueta|etiquet[aá]|escrib[ií]|descarg[aá]|link|enlace|tocá|seguime|suscrib)/i;

const hookDe = (caption: string): string => {
  const hook = caption.trim().split(/\s+/).slice(0, 12).join(' ');
  if (PREGUNTA.test(hook) || hook.includes('?')) return 'pregunta';
  if (/^\s*\d/.test(caption) || /\b\d+\b/.test(hook)) return 'numero';
  if (CONTRASTE.test(hook)) return 'contraste';
  return 'otro';
};

const largoDe = (caption: string): string => {
  const n = caption.length;
  if (n < 80) return 'corto';
  if (n <= 220) return 'medio';
  if (n <= 600) return 'largo';
  return 'muy-largo';
};

const bucketHashtags = (n: number): string => {
  if (n === 0) return '0';
  if (n <= 4) return '1-4';
  if (n <= 12) return '5-12';
  return '13+';
};

const bucketEmojis = (n: number): string => {
  if (n === 0) return '0';
  if (n <= 3) return '1-3';
  return '4+';
};

const bucketDuracion = (formato: FormatoContenido, duracionSeg: number | null): string => {
  if (formato !== 'reel' && formato !== 'video') return 'no-aplica';
  if (duracionSeg === null) return 'sin-dato';
  if (duracionSeg <= 15) return '≤15s';
  if (duracionSeg <= 30) return '16-30s';
  if (duracionSeg <= 60) return '31-60s';
  return '>60s';
};

const bucketRecencia = (dias: number | null | undefined): string => {
  if (dias === null || dias === undefined || !Number.isFinite(dias)) return 'sin-dato';
  if (dias <= 1) return '≤1d';
  if (dias <= 3) return '2-3d';
  if (dias <= 7) return '4-7d';
  return '8d+';
};

interface ContenidoParaCaracteristicas {
  formato: FormatoContenido;
  caption: string;
  hashtagsExtra: string[];
  hora: number | null;
  dia: string | null;
  duracionSeg: number | null;
  diasDesdeAnterior?: number | null;
}

export const caracteristicasDe = (p: ContenidoParaCaracteristicas): Caracteristicas => {
  const hashtags = new Set(
    [
      ...(p.caption.match(/#[\p{L}\p{N}_]+/gu) ?? []),
      ...p.hashtagsExtra.map((h) => (h.startsWith('#') ? h : `#${h}`)),
    ].map((h) => h.toLowerCase()),
  );
  const emojis = (p.caption.match(/\p{Extended_Pictographic}/gu) ?? []).length;
  return {
    formato: p.formato,
    franja: p.hora === null ? 'sin-dato' : franjaDe(p.hora),
    dia: p.dia ?? 'sin-dato',
    hook: hookDe(p.caption),
    cta: CTA.test(p.caption) ? 'con-cta' : 'sin-cta',
    largo: largoDe(p.caption),
    hashtags: bucketHashtags(hashtags.size),
    emojis: bucketEmojis(emojis),
    duracion: bucketDuracion(p.formato, p.duracionSeg),
    numeros: /\d/.test(p.caption) ? 'con-numeros' : 'sin-numeros',
    recencia: bucketRecencia(p.diasDesdeAnterior),
  };
};

interface Fila {
  x: Caracteristicas;
  y: number;
}

interface Ajuste {
  mu: number;
  indice: Map<string, number>;
  beta: number[];
}

const resolverSistema = (A: number[][], b: number[]): number[] => {
  const n = b.length;
  const M = A.map((fila, i) => [...fila, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let pivote = c;
    for (let r = c + 1; r < n; r++) {
      if (Math.abs(M[r]?.[c] ?? 0) > Math.abs(M[pivote]?.[c] ?? 0)) pivote = r;
    }
    [M[c], M[pivote]] = [M[pivote] ?? [], M[c] ?? []];
    const fc = M[c];
    const pv = fc?.[c] ?? 0;
    if (!fc || Math.abs(pv) < 1e-12) continue;
    for (let r = c + 1; r < n; r++) {
      const fr = M[r];
      if (!fr) continue;
      const f = (fr[c] ?? 0) / pv;
      for (let k = c; k <= n; k++) fr[k] = (fr[k] ?? 0) - f * (fc[k] ?? 0);
    }
  }
  const x = new Array<number>(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    const fr = M[r];
    if (!fr) continue;
    let s = fr[n] ?? 0;
    for (let k = r + 1; k < n; k++) s -= (fr[k] ?? 0) * (x[k] ?? 0);
    const d = fr[r] ?? 0;
    x[r] = Math.abs(d) < 1e-12 ? 0 : s / d;
  }
  return x;
};

const ajustar = (filas: Fila[], lambda: number): Ajuste => {
  const mu = filas.reduce((s, f) => s + f.y, 0) / filas.length;
  const indice = new Map<string, number>();
  for (const f of filas) {
    for (const [clave, valor] of Object.entries(f.x)) {
      const k = `${clave}=${valor}`;
      if (!indice.has(k)) indice.set(k, indice.size);
    }
  }
  const p = indice.size;
  const A = Array.from({ length: p }, () => new Array<number>(p).fill(0));
  const b = new Array<number>(p).fill(0);
  for (const f of filas) {
    const posiciones = Object.entries(f.x).map(([clave, valor]) => indice.get(`${clave}=${valor}`) ?? 0);
    const yc = f.y - mu;
    for (const i of posiciones) {
      b[i] = (b[i] ?? 0) + yc;
      for (const j of posiciones) A[i]![j] = (A[i]![j] ?? 0) + 1;
    }
  }
  for (let i = 0; i < p; i++) A[i]![i] = (A[i]![i] ?? 0) + lambda;
  return { mu, indice, beta: resolverSistema(A, b) };
};

const efectoDe = (aj: Ajuste, clave: string, valor: string): number => {
  const i = aj.indice.get(`${clave}=${valor}`);
  return i === undefined ? 0 : (aj.beta[i] ?? 0);
};

const predecirLog = (aj: Ajuste, x: Caracteristicas): number => {
  let total = aj.mu;
  for (const [clave, valor] of Object.entries(x)) total += efectoDe(aj, clave, valor);
  return total;
};

const residuosLoo = (filas: Fila[], lambda: number): number[] =>
  filas.map(
    (f, i) =>
      f.y -
      predecirLog(
        ajustar(
          filas.filter((_, j) => j !== i),
          lambda,
        ),
        f.x,
      ),
  );

/** Elige la regularización que menor error absoluto da en validación cruzada de 5 pliegues. */
const elegirLambda = (filas: Fila[]): number => {
  if (filas.length < PLIEGUES * 2) return LAMBDA_POR_DEFECTO;
  let mejor = { lambda: LAMBDA_POR_DEFECTO, error: Infinity };
  for (const lambda of LAMBDAS_CANDIDATAS) {
    let error = 0;
    for (let k = 0; k < PLIEGUES; k++) {
      const entrenamiento = filas.filter((_, i) => i % PLIEGUES !== k);
      const prueba = filas.filter((_, i) => i % PLIEGUES === k);
      const aj = ajustar(entrenamiento, lambda);
      for (const f of prueba) error += Math.abs(f.y - predecirLog(aj, f.x));
    }
    if (error < mejor.error) mejor = { lambda, error };
  }
  return mejor.lambda;
};

const cuantil = (ordenados: number[], q: number): number => {
  if (ordenados.length === 1) return ordenados[0] ?? 0;
  const pos = q * (ordenados.length - 1);
  const bajo = Math.floor(pos);
  const alto = Math.ceil(pos);
  const a = ordenados[bajo] ?? 0;
  const b = ordenados[alto] ?? a;
  return a + (b - a) * (pos - bajo);
};

const rangoDe = (logPred: number, residuos: number[]): RangoPrediccion => {
  const ordenados = [...residuos].sort((a, b) => a - b);
  return {
    p10: redondear(Math.exp(logPred + cuantil(ordenados, 0.1)), 2),
    p50: redondear(Math.exp(logPred), 2),
    p90: redondear(Math.exp(logPred + cuantil(ordenados, 0.9)), 2),
  };
};

const probabilidadSobre = (logPred: number, residuos: number[], umbral: number): number => {
  const logU = Math.log(umbral);
  const cumplen = residuos.filter((r) => logPred + r >= logU).length;
  return Math.round((cumplen / residuos.length) * 100);
};

const errorTipico = (residuos: number[]): number => {
  const errores = residuos.map((r) => Math.abs(Math.exp(r) - 1) * 100);
  return redondear(mediana(errores) ?? 0, 0);
};

/** Q² y mejora frente a predecir el promedio de los demás posts (leave-one-out, escala log). */
const calidadFrenteAPromedio = (
  filas: Fila[],
  residuos: number[],
): { q2: number | null; mejoraVsPromedioPct: number | null } => {
  const n = filas.length;
  if (n < 3) return { q2: null, mejoraVsPromedioPct: null };
  const suma = filas.reduce((s, f) => s + f.y, 0);
  const base = filas.map((f) => f.y - (suma - f.y) / (n - 1));
  const sse = residuos.reduce((s, r) => s + r * r, 0);
  const ssb = base.reduce((s, r) => s + r * r, 0);
  const maeModelo = residuos.reduce((s, r) => s + Math.abs(r), 0) / n;
  const maeBase = base.reduce((s, r) => s + Math.abs(r), 0) / n;
  return {
    q2: ssb > 0 ? redondear(1 - sse / ssb, 2) : null,
    mejoraVsPromedioPct: maeBase > 0 ? redondear((1 - maeModelo / maeBase) * 100, 0) : null,
  };
};

const confianzaDe = (n: number, errorPct: number | null, q2: number | null): Confianza => {
  if (n === 0) return 'sin-datos';
  if (n < MIN_POSTS_PREDICCION) return 'baja';
  if (n >= MIN_POSTS_ALTA && errorPct !== null && errorPct <= 50 && q2 !== null && q2 > 0.1) return 'alta';
  if (q2 !== null && q2 <= 0) return 'baja';
  return 'media';
};

const medianaDeGrupo = (filas: Fila[]): number | null => mediana(filas.map((f) => Math.exp(f.y)));

const etiquetaDe = (clave: string, valor: string): string => ETIQUETAS[clave]?.[valor] ?? valor;

const recomendacionesSinDatos = (): string[] => [
  'Empezá con un hook de pregunta o con un número: son los tipos que más suelen frenar el scroll.',
  'Sumá un llamado a la acción concreto (guardá, comentá o compartí).',
  'Usá entre 5 y 12 hashtags relevantes en vez de muchos genéricos.',
  'Conectá tu cuenta para reemplazar estas buenas prácticas por recomendaciones basadas en tu historial.',
];

const recomendacionesConDatos = (filas: Fila[], x: Caracteristicas, medianaGeneral: number): string[] => {
  const candidatos: Array<{ mejora: number; texto: string }> = [];
  for (const clave of CARACTERISTICAS_ACCIONABLES) {
    const grupos = new Map<string, Fila[]>();
    for (const f of filas) {
      const valor = f.x[clave] ?? 'sin-dato';
      if (CARACTERISTICAS_NO_APLICA.has(valor)) continue;
      grupos.set(valor, [...(grupos.get(valor) ?? []), f]);
    }
    const actual = x[clave] ?? 'sin-dato';
    const medianaActual = grupos.has(actual) ? medianaDeGrupo(grupos.get(actual) ?? []) : null;
    const base = medianaActual ?? medianaGeneral;
    let mejor: { valor: string; mediana: number; n: number } | null = null;
    for (const [valor, miembros] of grupos) {
      if (valor === actual || miembros.length < MIN_GRUPO_RECOMENDACION) continue;
      const med = medianaDeGrupo(miembros);
      if (med !== null && (mejor === null || med > mejor.mediana)) {
        mejor = { valor, mediana: med, n: miembros.length };
      }
    }
    if (mejor === null || base <= 0) continue;
    const mejora = mejor.mediana / base;
    if (mejora < MEJORA_MINIMA) continue;
    candidatos.push({
      mejora,
      texto: `Probá «${etiquetaDe(clave, mejor.valor)}» en vez de «${etiquetaDe(clave, actual)}»: tus posts con eso rinden ${redondear(mejora)}× tu mediana (n=${mejor.n}).`,
    });
  }
  const top = candidatos
    .sort((a, b) => b.mejora - a.mejora)
    .slice(0, MAX_RECOMENDACIONES)
    .map((c) => c.texto);
  return top.length > 0 ? top : ['Tu contenido ya coincide con lo que mejor rinde en tu cuenta en estos factores.'];
};

const factoresDe = (filas: Fila[], aj: Ajuste, x: Caracteristicas, medianaGeneral: number): FactorPrediccion[] => {
  const factores: Array<FactorPrediccion & { peso: number }> = [];
  for (const [clave, valor] of Object.entries(x)) {
    if (CARACTERISTICAS_NO_APLICA.has(valor)) continue;
    const efecto = efectoDe(aj, clave, valor);
    if (Math.abs(efecto) < UMBRAL_EFECTO) continue;
    const miembros = filas.filter((f) => (f.x[clave] ?? 'sin-dato') === valor);
    const med = medianaDeGrupo(miembros);
    const evidencia =
      med !== null && miembros.length >= MIN_GRUPO && medianaGeneral > 0
        ? `Tus posts con esto rinden ${redondear(med / medianaGeneral)}× tu mediana (n=${miembros.length}).`
        : 'Hay pocos posts con esta característica para medir su efecto.';
    factores.push({
      factor: etiquetaDe(clave, valor),
      efecto: efecto > 0 ? 'positivo' : 'negativo',
      impactoPct: redondear((Math.exp(efecto) - 1) * 100, 0),
      evidencia,
      peso: Math.abs(efecto),
    });
  }
  return factores
    .sort((a, b) => b.peso - a.peso)
    .slice(0, MAX_FACTORES)
    .map(({ factor, efecto, impactoPct, evidencia }) => ({ factor, efecto, impactoPct, evidencia }));
};

const mejoresMomentosDe = (filas: Fila[]): PrediccionContenido['mejoresMomentos'] => {
  const grupos = new Map<string, Fila[]>();
  for (const f of filas) {
    const dia = f.x.dia ?? 'sin-dato';
    const franja = f.x.franja ?? 'sin-dato';
    if (CARACTERISTICAS_NO_APLICA.has(dia) || CARACTERISTICAS_NO_APLICA.has(franja)) continue;
    const clave = `${dia}|${franja}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  return [...grupos.entries()]
    .filter(([, miembros]) => miembros.length >= MIN_GRUPO)
    .map(([clave, miembros]) => {
      const [dia = '', franja = ''] = clave.split('|');
      return { dia, franja, tasaMediana: redondear(medianaDeGrupo(miembros) ?? 0, 2), posts: miembros.length };
    })
    .sort((a, b) => b.tasaMediana - a.tasaMediana)
    .slice(0, 3);
};

const distribucionDe = (tasas: number[], prediccion: number | null): Distribucion => {
  if (tasas.length === 0) return { bins: [], prediccionTasa: prediccion, medianaTasa: null };
  const min = Math.min(...tasas);
  const max = Math.max(...tasas);
  const ancho = max > min ? (max - min) / BINS_DISTRIBUCION : 1;
  const bins = Array.from({ length: BINS_DISTRIBUCION }, (_, i) => ({
    desde: redondear(min + i * ancho, 4),
    hasta: redondear(min + (i + 1) * ancho, 4),
    n: 0,
  }));
  for (const t of tasas) {
    const idx = max > min ? Math.min(BINS_DISTRIBUCION - 1, Math.floor((t - min) / ancho)) : 0;
    const bin = bins[idx];
    if (bin) bin.n += 1;
  }
  return {
    bins,
    prediccionTasa: prediccion === null ? null : redondear(prediccion, 4),
    medianaTasa: redondear(mediana(tasas) ?? 0, 4),
  };
};

const filasDe = (historial: PostHistorial[]): { tasa: Fila[]; alcance: Fila[]; tiempo: Fila[] } => {
  const orden = historial
    .map((p, i) => ({ i, t: Date.parse(p.publicadoEn) }))
    .filter((o) => Number.isFinite(o.t))
    .sort((a, b) => a.t - b.t);
  const diasPorIndice = new Array<number | null>(historial.length).fill(null);
  let previo: number | null = null;
  for (const { i, t } of orden) {
    diasPorIndice[i] = previo === null ? null : (t - previo) / DIA_MS;
    previo = t;
  }
  const tasa: Fila[] = [];
  const alcance: Fila[] = [];
  const tiempo: Fila[] = [];
  historial.forEach((p, i) => {
    const x = caracteristicasDe({
      formato: p.formato,
      caption: p.captionCompleto,
      hashtagsExtra: [],
      hora: horaLocalDe(p.publicadoEn),
      dia: diaDeIso(p.publicadoEn),
      duracionSeg: p.duracionSeg,
      diasDesdeAnterior: diasPorIndice[i] ?? null,
    });
    if (p.tasaInteraccion !== null) tasa.push({ x, y: Math.log(Math.max(p.tasaInteraccion, EPSILON_TASA)) });
    if (p.alcance !== null && p.alcance > 0) alcance.push({ x, y: Math.log(p.alcance) });
    if (p.tiempoVisualizacionSeg !== null && p.tiempoVisualizacionSeg > 0) {
      tiempo.push({ x, y: Math.log(p.tiempoVisualizacionSeg) });
    }
  });
  return { tasa, alcance, tiempo };
};

export const historialDesdePosts = (posts: PostCrudo[]): PostHistorial[] =>
  posts.map((p) => ({
    id: p.id,
    plataforma: p.plataforma,
    formato: p.formato,
    captionCompleto: p.captionCompleto ?? p.texto,
    publicadoEn: p.publicadoEn,
    duracionSeg: p.duracionSeg,
    tasaInteraccion: tasaDeInteraccion(p),
    alcance: p.alcance,
    tiempoVisualizacionSeg: p.tiempoVisualizacionSeg ?? null,
  }));

const retencionDe = (
  entrada: EntradaContenido,
  filas: Fila[],
  x: Caracteristicas,
  lambda: number,
): PrediccionContenido['retencion'] => {
  if (entrada.formato !== 'reel' && entrada.formato !== 'video') {
    return {
      disponible: false,
      motivo: 'El tiempo de visualización aplica a reels y videos.',
      tiempoVisualizacionSeg: null,
      postsConDato: 0,
    };
  }
  if (entrada.plataforma === 'tiktok') {
    return {
      disponible: false,
      motivo: 'TikTok no expone tiempo de visualización ni retención en su API pública.',
      tiempoVisualizacionSeg: null,
      postsConDato: 0,
    };
  }
  if (filas.length === 0) {
    return {
      disponible: false,
      motivo: 'Instagram no devolvió tiempo de visualización para tus reels: no hay dato para predecirlo.',
      tiempoVisualizacionSeg: null,
      postsConDato: 0,
    };
  }
  if (filas.length < MIN_POSTS_RETENCION) {
    return {
      disponible: false,
      motivo: `Hacen falta al menos ${MIN_POSTS_RETENCION} reels con tiempo de visualización (tenés ${filas.length}).`,
      tiempoVisualizacionSeg: null,
      postsConDato: filas.length,
    };
  }
  const aj = ajustar(filas, lambda);
  const logPred = predecirLog(aj, x);
  return {
    disponible: true,
    motivo: `Basado en ${filas.length} reels con tiempo de visualización.`,
    tiempoVisualizacionSeg: rangoDe(logPred, residuosLoo(filas, lambda)),
    postsConDato: filas.length,
  };
};

const estadisticasVacias = (): EstadisticasModelo => ({
  n: 0,
  lambda: LAMBDA_POR_DEFECTO,
  medianaTasa: null,
  p25Tasa: null,
  p75Tasa: null,
  q2: null,
  mejoraVsPromedioPct: null,
  errorTipicoPct: null,
  intervalo: 'p10 a p90 (80 % de los casos)',
});

const prediccionVacia = (plataforma: PlataformaContenido): PrediccionContenido => ({
  plataforma,
  veredicto: veredictoDe({
    postsUsados: 0,
    tasaInteraccion: null,
    probabilidades: { superarMediana: null },
    medianas: { tasaInteraccion: null },
    confianza: 'sin-datos',
  }),
  postsUsados: 0,
  confianza: 'sin-datos',
  exactitud: { tasaErrorTipicoPct: null, alcanceErrorTipicoPct: null },
  estadisticas: estadisticasVacias(),
  tasaInteraccion: null,
  alcance: null,
  probabilidades: { superarMediana: null, entreLosMejores25: null },
  medianas: { tasaInteraccion: null, alcance: null },
  retencion: {
    disponible: false,
    motivo: 'Conectá tu cuenta y publicá para tener historial con el que predecir.',
    tiempoVisualizacionSeg: null,
    postsConDato: 0,
  },
  factores: [],
  recomendaciones: recomendacionesSinDatos(),
  mejoresMomentos: [],
  mejorMomentoFormato: null,
  distribucion: { bins: [], prediccionTasa: null, medianaTasa: null },
});

/** Lectura en lenguaje directo de la predicción: qué esperar y qué tan seguro es. */
export const veredictoDe = (p: {
  postsUsados?: number;
  tasaInteraccion: RangoPrediccion | null;
  probabilidades: { superarMediana: number | null };
  medianas: { tasaInteraccion: number | null };
  confianza: Confianza;
}): Veredicto => {
  const prob = p.probabilidades.superarMediana;
  if (!p.tasaInteraccion || prob === null)
    return {
      nivel: 'sin-datos',
      titulo: 'Todavía no puedo predecir este post',
      texto: `Necesito al menos ${MIN_POSTS_PREDICCION} publicaciones de esta plataforma en tu historial. Conectá la cuenta o publicá unas semanas más.`,
    };
  const rango = `entre ${redondear(p.tasaInteraccion.p10, 1)} % y ${redondear(p.tasaInteraccion.p90, 1)} % de interacción`;
  const mediana =
    p.medianas.tasaInteraccion === null ? '' : ` (tu mediana es ${redondear(p.medianas.tasaInteraccion, 1)} %)`;
  const nota =
    p.confianza === 'baja' ? ' La predicción es poco firme: tu historial tiene pocos datos o mucha dispersión.' : '';
  if (prob >= 60)
    return {
      nivel: 'fuerte',
      titulo: 'Va a rendir por encima de tu mediana',
      texto: `Esperá ${rango}${mediana}. Hay ${prob} % de chances de superarla.${nota}`,
    };
  if (prob >= 40)
    return {
      nivel: 'promedio',
      titulo: 'Va a rendir como tu promedio',
      texto: `Esperá ${rango}${mediana}. Hay ${prob} % de chances de superar tu mediana.${nota}`,
    };
  return {
    nivel: 'debil',
    titulo: 'Probablemente rinda por debajo de tu mediana',
    texto: `Esperá ${rango}${mediana}. Solo ${prob} % de chances de superarla: revisá los factores antes de publicar.${nota}`,
  };
};

const diasDesdeUltimoPost = (historial: PostHistorial[], ahora: number): number | null => {
  const tiempos = historial.map((p) => Date.parse(p.publicadoEn)).filter((t) => Number.isFinite(t));
  if (tiempos.length === 0) return null;
  return Math.max(0, (ahora - Math.max(...tiempos)) / DIA_MS);
};

export const predecirContenido = (historial: PostHistorial[], entrada: EntradaContenido): PrediccionContenido => {
  const delTipo = historial.filter((p) => p.plataforma === entrada.plataforma);
  const { tasa, alcance, tiempo } = filasDe(delTipo);
  if (tasa.length === 0) return prediccionVacia(entrada.plataforma);

  const x = caracteristicasDe({
    formato: entrada.formato,
    caption: entrada.caption,
    hashtagsExtra: entrada.hashtags,
    hora: entrada.hora,
    dia: entrada.dia,
    duracionSeg: entrada.duracionSeg,
    diasDesdeAnterior: diasDesdeUltimoPost(delTipo, Date.now()),
  });

  const lambda = elegirLambda(tasa);
  const ajTasa = ajustar(tasa, lambda);
  const logTasa = predecirLog(ajTasa, x);
  const residuosTasa = residuosLoo(tasa, lambda);
  const tasasHistoricas = tasa.map((f) => Math.exp(f.y));
  const ordenadas = [...tasasHistoricas].sort((a, b) => a - b);
  const medianaTasa = mediana(tasasHistoricas) ?? 0;
  const p75Tasa = cuantil(ordenadas, 0.75);
  const errorTasaPct = errorTipico(residuosTasa);
  const calidad = calidadFrenteAPromedio(tasa, residuosTasa);

  let alcanceRango: RangoPrediccion | null = null;
  let errorAlcancePct: number | null = null;
  let medianaAlcance: number | null = null;
  if (alcance.length >= MIN_POSTS_PREDICCION) {
    const ajAlcance = ajustar(alcance, lambda);
    const residuosAlcance = residuosLoo(alcance, lambda);
    alcanceRango = rangoDe(predecirLog(ajAlcance, x), residuosAlcance);
    errorAlcancePct = errorTipico(residuosAlcance);
    medianaAlcance = mediana(alcance.map((f) => Math.exp(f.y)));
  }

  const probabilidades =
    tasa.length >= MIN_POSTS_PREDICCION
      ? {
          superarMediana: probabilidadSobre(logTasa, residuosTasa, medianaTasa),
          entreLosMejores25: probabilidadSobre(logTasa, residuosTasa, p75Tasa),
        }
      : { superarMediana: null, entreLosMejores25: null };

  const enModelo = tasa.length >= MIN_POSTS_PREDICCION;

  const base: Omit<PrediccionContenido, 'veredicto'> = {
    plataforma: entrada.plataforma,
    postsUsados: tasa.length,
    confianza: confianzaDe(tasa.length, errorTasaPct, calidad.q2),
    exactitud: { tasaErrorTipicoPct: errorTasaPct, alcanceErrorTipicoPct: errorAlcancePct },
    estadisticas: {
      n: tasa.length,
      lambda,
      medianaTasa: redondear(medianaTasa, 4),
      p25Tasa: redondear(cuantil(ordenadas, 0.25), 4),
      p75Tasa: redondear(p75Tasa, 4),
      q2: calidad.q2,
      mejoraVsPromedioPct: calidad.mejoraVsPromedioPct,
      errorTipicoPct: errorTasaPct,
      intervalo: 'p10 a p90 (80 % de los casos)',
    },
    tasaInteraccion: enModelo ? rangoDe(logTasa, residuosTasa) : null,
    alcance: alcanceRango,
    probabilidades,
    medianas: {
      tasaInteraccion: redondear(medianaTasa, 4),
      alcance: medianaAlcance === null ? null : Math.round(medianaAlcance),
    },
    retencion: retencionDe(entrada, tiempo, x, lambda),
    factores: enModelo ? factoresDe(tasa, ajTasa, x, medianaTasa) : [],
    recomendaciones: enModelo
      ? recomendacionesConDatos(tasa, x, medianaTasa)
      : ['Todavía hay pocos posts para medir efectos: publicá unas semanas más y la predicción se calibra sola.'],
    mejoresMomentos: mejoresMomentosDe(tasa),
    mejorMomentoFormato: mejoresMomentosDe(tasa.filter((f) => f.x.formato === entrada.formato))[0] ?? null,
    distribucion: distribucionDe(tasasHistoricas, enModelo ? Math.exp(logTasa) : null),
  };
  return { ...base, veredicto: veredictoDe(base) };
};

const resumenDeGrupos = (
  posts: Array<{ x: Caracteristicas; tasa: number }>,
  clave: string,
  medianaGeneral: number,
): GrupoResumen[] => {
  const grupos = new Map<string, number[]>();
  for (const p of posts) {
    const valor = p.x[clave] ?? 'sin-dato';
    if (CARACTERISTICAS_NO_APLICA.has(valor)) continue;
    grupos.set(valor, [...(grupos.get(valor) ?? []), p.tasa]);
  }
  return [...grupos.entries()]
    .filter(([, tasas]) => tasas.length >= MIN_GRUPO)
    .map(([valor, tasas]) => {
      const med = mediana(tasas) ?? 0;
      return {
        clave: valor,
        etiqueta: etiquetaDe(clave, valor),
        posts: tasas.length,
        tasaMediana: redondear(med, 4),
        vsMediana: medianaGeneral > 0 ? redondear(med / medianaGeneral, 2) : null,
      };
    })
    .sort((a, b) => b.tasaMediana - a.tasaMediana);
};

/** Qué formato, franja, hook y CTA rindieron mejor en el historial, con su mediana y n. */
export const resumenHistorial = (historial: PostHistorial[]): ResumenHistorial => ({
  plataformas: (['instagram', 'tiktok'] as const)
    .map((plataforma) => {
      const posts = historial.filter((p) => p.plataforma === plataforma && p.tasaInteraccion !== null);
      const conX = posts.map((p) => ({
        x: caracteristicasDe({
          formato: p.formato,
          caption: p.captionCompleto,
          hashtagsExtra: [],
          hora: horaLocalDe(p.publicadoEn),
          dia: diaDeIso(p.publicadoEn),
          duracionSeg: p.duracionSeg,
        }),
        tasa: p.tasaInteraccion ?? 0,
      }));
      const medianaTasa = posts.length > 0 ? mediana(conX.map((p) => p.tasa)) : null;
      const general = medianaTasa ?? 0;
      return {
        plataforma,
        posts: posts.length,
        medianaTasa: medianaTasa === null ? null : redondear(medianaTasa, 4),
        porFormato: resumenDeGrupos(conX, 'formato', general),
        porFranja: resumenDeGrupos(conX, 'franja', general),
        porHook: resumenDeGrupos(conX, 'hook', general),
        porCta: resumenDeGrupos(conX, 'cta', general),
      };
    })
    .filter((p) => p.posts > 0),
});
