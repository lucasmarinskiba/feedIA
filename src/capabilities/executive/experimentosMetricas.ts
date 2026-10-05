/**
 * Experimentos A/B sobre publicaciones reales. Cada variante es un conjunto de posts;
 * la métrica es una tasa por alcance (guardados, compartidos, me gusta, interacciones / alcance).
 * Veredicto con z-test de dos proporciones: sólo se declara ganador con confianza ≥ 95 %
 * y una mejora mínima definida al crear el experimento. Función pura: no toca red ni disco.
 */

export type EstadoExperimento = 'borrador' | 'corriendo' | 'cerrado' | 'descartado';
export type MetricaExperimento = 'guardados' | 'compartidos' | 'likes' | 'interacciones';
export type Variante = 'A' | 'B';
export type VeredictoExperimento = 'datos-insuficientes' | 'gana-A' | 'gana-B' | 'sin-diferencia';

export const METRICAS_EXPERIMENTO: Record<MetricaExperimento, { label: string; ayuda: string }> = {
  guardados: { label: 'Guardados', ayuda: 'Guardados por cada persona alcanzada.' },
  compartidos: { label: 'Compartidos', ayuda: 'Veces compartido por cada persona alcanzada.' },
  likes: { label: 'Me gusta', ayuda: 'Me gusta por cada persona alcanzada.' },
  interacciones: {
    label: 'Interacciones',
    ayuda: 'Me gusta + comentarios + compartidos + guardados por persona alcanzada.',
  },
};

export const MIN_PUBLICACIONES_VARIANTE = 2;
export const MIN_ALCANCE_VARIANTE = 300;
export const CONFIANZA_GANADOR = 0.95;
export const LIMITE_HIPOTESIS = 300;

export interface VarianteExperimento {
  nombre: string;
  postIds: string[];
}

export interface Experimento {
  id: string;
  hipotesis: string;
  variable: string;
  metrica: MetricaExperimento;
  umbralMejora: number;
  duracionDias: number;
  estado: EstadoExperimento;
  creadoEn: string;
  iniciadoEn: string | null;
  cerradoEn: string | null;
  motivoDescarte: string | null;
  variantes: Record<Variante, VarianteExperimento>;
  resultadoFinal: ResultadoExperimento | null;
}

export interface PublicacionExperimento {
  id: string;
  plataforma: 'instagram' | 'tiktok';
  formato: string;
  titulo: string;
  url: string | null;
  publicadoEn: string;
  alcance: number | null;
  likes: number;
  guardados: number | null;
  compartidos: number | null;
  interacciones: number;
}

export interface ResumenVariante {
  nombre: string;
  asignadas: number;
  conDatos: number;
  alcance: number;
  valor: number;
  tasa: number | null;
}

export interface ResultadoExperimento {
  variantes: Record<Variante, ResumenVariante>;
  diferenciaPct: number | null;
  probabilidadB: number | null;
  veredicto: VeredictoExperimento;
  explicacion: string;
  faltantes: number;
  calculadoEn: string;
}

export interface EntradaExperimento {
  hipotesis: string;
  variable: string;
  metrica: MetricaExperimento;
  umbralMejora: number;
  duracionDias: number;
  nombreA: string;
  nombreB: string;
}

const sinNulos = (texto: string): string => texto.replace(/\u0000/g, '').trim();

const campoTexto = (valor: unknown, min: number, max: number): string | null => {
  if (typeof valor !== 'string') return null;
  const limpio = sinNulos(valor);
  return limpio.length >= min && limpio.length <= max ? limpio : null;
};

const numeroEnRango = (valor: unknown, defecto: number, min: number, max: number): number | null => {
  if (valor === undefined || valor === null || valor === '') return defecto;
  const n = Number(valor);
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
};

export const validarEntrada = (
  body: unknown,
): { ok: true; valor: EntradaExperimento } | { ok: false; error: string } => {
  const datos = (body ?? {}) as Record<string, unknown>;
  const hipotesis = campoTexto(datos['hipotesis'], 10, LIMITE_HIPOTESIS);
  if (!hipotesis) return { ok: false, error: 'La hipótesis debe tener entre 10 y 300 caracteres.' };
  const variable = campoTexto(datos['variable'], 2, 120);
  if (!variable) return { ok: false, error: 'Indicá qué variable cambia (2 a 120 caracteres).' };
  const metrica = datos['metrica'];
  if (typeof metrica !== 'string' || !(metrica in METRICAS_EXPERIMENTO)) {
    return { ok: false, error: 'Elegí una métrica válida.' };
  }
  const umbralMejora = numeroEnRango(datos['umbralMejora'], 10, 1, 100);
  if (umbralMejora === null) return { ok: false, error: 'El umbral de mejora debe estar entre 1 y 100 %.' };
  const duracionDias = numeroEnRango(datos['duracionDias'], 14, 1, 60);
  if (duracionDias === null || !Number.isInteger(duracionDias)) {
    return { ok: false, error: 'La duración debe ser de 1 a 60 días.' };
  }
  const nombreA = campoTexto(datos['nombreA'] ?? 'Original', 1, 60);
  const nombreB = campoTexto(datos['nombreB'] ?? 'Variante', 1, 60);
  if (!nombreA || !nombreB) return { ok: false, error: 'Los nombres de las variantes deben tener 1 a 60 caracteres.' };
  return {
    ok: true,
    valor: {
      hipotesis,
      variable,
      metrica: metrica as MetricaExperimento,
      umbralMejora,
      duracionDias,
      nombreA,
      nombreB,
    },
  };
};

export const normalCdf = (z: number): number => {
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const poli = ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t;
  const erf = 1 - poli * Math.exp(-x * x);
  return 0.5 * (1 + (z < 0 ? -erf : erf));
};

export const valorDePublicacion = (p: PublicacionExperimento, metrica: MetricaExperimento): number | null => {
  switch (metrica) {
    case 'guardados':
      return p.guardados;
    case 'compartidos':
      return p.compartidos;
    case 'likes':
      return p.likes;
    case 'interacciones':
      return p.interacciones;
  }
};

const variantesVacias = (): Record<Variante, VarianteExperimento> => ({
  A: { nombre: 'Original', postIds: [] },
  B: { nombre: 'Variante', postIds: [] },
});

export const crearExperimentoBorrador = (id: string, entrada: EntradaExperimento, ahora: string): Experimento => {
  const variantes = variantesVacias();
  variantes.A.nombre = entrada.nombreA;
  variantes.B.nombre = entrada.nombreB;
  return {
    id,
    hipotesis: entrada.hipotesis,
    variable: entrada.variable,
    metrica: entrada.metrica,
    umbralMejora: entrada.umbralMejora,
    duracionDias: entrada.duracionDias,
    estado: 'borrador',
    creadoEn: ahora,
    iniciadoEn: null,
    cerradoEn: null,
    motivoDescarte: null,
    variantes,
    resultadoFinal: null,
  };
};

export const asignarPublicacion = (exp: Experimento, postId: string, variante: Variante | null): void => {
  for (const v of ['A', 'B'] as const) {
    exp.variantes[v].postIds = exp.variantes[v].postIds.filter((id) => id !== postId);
  }
  if (variante) exp.variantes[variante].postIds.push(postId);
};

export const errorAlIniciar = (exp: Experimento): string | null => {
  if (exp.estado !== 'borrador') return 'Solo se puede iniciar un experimento en borrador.';
  for (const v of ['A', 'B'] as const) {
    if (exp.variantes[v].postIds.length < MIN_PUBLICACIONES_VARIANTE) {
      return `La variante ${exp.variantes[v].nombre} necesita al menos ${MIN_PUBLICACIONES_VARIANTE} publicaciones.`;
    }
  }
  return null;
};

const pct = (n: number): string => n.toFixed(1).replace('.', ',');

const resumirVariante = (
  exp: Experimento,
  v: Variante,
  pool: Map<string, PublicacionExperimento>,
): { resumen: ResumenVariante; faltantes: number } => {
  const { nombre, postIds } = exp.variantes[v];
  let conDatos = 0;
  let alcance = 0;
  let valor = 0;
  let faltantes = 0;
  for (const id of postIds) {
    const p = pool.get(id);
    if (!p) {
      faltantes += 1;
      continue;
    }
    const x = valorDePublicacion(p, exp.metrica);
    if (p.alcance === null || p.alcance <= 0 || x === null) continue;
    conDatos += 1;
    alcance += p.alcance;
    valor += x;
  }
  return {
    resumen: {
      nombre,
      asignadas: postIds.length,
      conDatos,
      alcance,
      valor,
      tasa: alcance > 0 ? valor / alcance : null,
    },
    faltantes,
  };
};

export const compararVariantes = (
  resA: ResumenVariante,
  resB: ResumenVariante,
  umbralMejora: number,
): {
  diferenciaPct: number | null;
  probabilidadB: number | null;
  veredicto: VeredictoExperimento;
  explicacion: string;
} => {
  if (resA.asignadas === 0 || resB.asignadas === 0) {
    return {
      diferenciaPct: null,
      probabilidadB: null,
      veredicto: 'datos-insuficientes',
      explicacion: 'Asigná publicaciones a las dos variantes para poder compararlas.',
    };
  }
  for (const r of [resA, resB]) {
    if (r.conDatos < MIN_PUBLICACIONES_VARIANTE) {
      return {
        diferenciaPct: null,
        probabilidadB: null,
        veredicto: 'datos-insuficientes',
        explicacion: `Faltan datos en ${r.nombre}: ${r.conDatos} de ${MIN_PUBLICACIONES_VARIANTE} publicaciones con alcance medido.`,
      };
    }
    if (r.alcance < MIN_ALCANCE_VARIANTE) {
      return {
        diferenciaPct: null,
        probabilidadB: null,
        veredicto: 'datos-insuficientes',
        explicacion: `${r.nombre} llegó a ${r.alcance} personas; hacen falta al menos ${MIN_ALCANCE_VARIANTE} para comparar.`,
      };
    }
  }
  const tasaA = resA.tasa ?? 0;
  const tasaB = resB.tasa ?? 0;
  const diferenciaPct = tasaA > 0 ? ((tasaB - tasaA) / tasaA) * 100 : null;
  const sumaValor = resA.valor + resB.valor;
  const sumaAlcance = resA.alcance + resB.alcance;
  const tasaConjunta = sumaAlcance > 0 ? sumaValor / sumaAlcance : 0;
  const se = Math.sqrt(tasaConjunta * (1 - tasaConjunta) * (1 / resA.alcance + 1 / resB.alcance));
  const z = se > 0 ? (tasaB - tasaA) / se : 0;
  const probabilidadB = normalCdf(z);
  const umbral = umbralMejora / 100;

  if (probabilidadB >= CONFIANZA_GANADOR && tasaB > tasaA && tasaB >= tasaA * (1 + umbral)) {
    return {
      diferenciaPct,
      probabilidadB,
      veredicto: 'gana-B',
      explicacion: `${resB.nombre} supera a ${resA.nombre} con ${pct(probabilidadB * 100)} % de confianza.`,
    };
  }
  if (probabilidadB <= 1 - CONFIANZA_GANADOR && tasaA > tasaB && tasaA >= tasaB * (1 + umbral)) {
    return {
      diferenciaPct,
      probabilidadB,
      veredicto: 'gana-A',
      explicacion: `${resA.nombre} supera a ${resB.nombre} con ${pct((1 - probabilidadB) * 100)} % de confianza.`,
    };
  }
  const dif = diferenciaPct === null ? 'sin base para medir' : `${pct(diferenciaPct)} %`;
  return {
    diferenciaPct,
    probabilidadB,
    veredicto: 'sin-diferencia',
    explicacion: `Sin ganador: no hay al menos ${umbralMejora} % de mejora con 95 % de confianza (diferencia observada: ${dif}).`,
  };
};

export const resultadoDe = (
  exp: Experimento,
  publicaciones: PublicacionExperimento[],
  ahora: string,
): ResultadoExperimento => {
  const pool = new Map(publicaciones.map((p) => [p.id, p]));
  const a = resumirVariante(exp, 'A', pool);
  const b = resumirVariante(exp, 'B', pool);
  const comparacion = compararVariantes(a.resumen, b.resumen, exp.umbralMejora);
  return {
    variantes: { A: a.resumen, B: b.resumen },
    ...comparacion,
    faltantes: a.faltantes + b.faltantes,
    calculadoEn: ahora,
  };
};

const DIA_MS = 86_400_000;

export const progresoDe = (
  exp: Experimento,
  ahora: Date,
): { diasTranscurridos: number; diasTotales: number; listoParaCerrar: boolean } | null => {
  if (!exp.iniciadoEn) return null;
  const inicio = Date.parse(exp.iniciadoEn);
  if (Number.isNaN(inicio)) return null;
  const diasTranscurridos = Math.max(0, Math.floor((ahora.getTime() - inicio) / DIA_MS));
  return {
    diasTranscurridos,
    diasTotales: exp.duracionDias,
    listoParaCerrar: diasTranscurridos >= exp.duracionDias,
  };
};
