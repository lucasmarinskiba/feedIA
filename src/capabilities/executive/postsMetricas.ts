/**
 * Métricas de posts: tasa de interacción por post, comparación contra la mediana de la
 * propia cuenta y resúmenes por formato, hora y tendencia. Función pura: no toca red ni disco.
 *
 * Tasa de interacción = (likes + comentarios + compartidos + guardados) / alcance × 100.
 * Alcance = reach en Instagram, vistas en TikTok. Un post sin alcance no entra a ninguna mediana.
 */

export type PostPlataforma = 'instagram' | 'tiktok';
export type PostFormato = 'reel' | 'carrusel' | 'imagen' | 'video';
export type PostVeredicto = 'destacado' | 'escondido' | 'normal' | 'bajo' | 'sin-base' | 'sin-datos';

export interface PostCrudo {
  id: string;
  plataforma: PostPlataforma;
  formato: PostFormato;
  texto: string;
  url: string | null;
  publicadoEn: string;
  likes: number;
  comentarios: number;
  compartidos: number | null;
  guardados: number | null;
  alcance: number | null;
  duracionSeg: number | null;
}

export interface PostAnalizado extends PostCrudo {
  interacciones: number;
  tasaInteraccion: number | null;
  horaLocal: number | null;
  veredicto: PostVeredicto;
  motivo: string;
}

export interface ResumenFormato {
  formato: PostFormato;
  posts: number;
  tasaMediana: number | null;
  alcanceMediano: number | null;
}

export interface ResumenPosts {
  analizados: number;
  baseSuficiente: boolean;
  tasaMediana: number | null;
  alcanceMediano: number | null;
  porFormato: ResumenFormato[];
  mejorFormato: PostFormato | null;
  mejorHora: number | null;
  tasaUltimos5: number | null;
  tasaAnteriores: number | null;
  mejorPostId: string | null;
  peorPostId: string | null;
}

export const MIN_POSTS_BASE = 3;
const FACTOR_DESTACADO = 1.5;
const FACTOR_BAJO = 0.6;
const ULTIMOS_RECIENTES = 5;
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

const esNumero = (v: number | null): v is number => v !== null;

export const mediana = (valores: number[]): number | null => {
  if (valores.length === 0) return null;
  const orden = [...valores].sort((a, b) => a - b);
  const medio = Math.floor(orden.length / 2);
  if (orden.length % 2 === 1) return orden[medio] ?? null;
  return ((orden[medio - 1] ?? 0) + (orden[medio] ?? 0)) / 2;
};

export const tasaDeInteraccion = (
  p: Pick<PostCrudo, 'likes' | 'comentarios' | 'compartidos' | 'guardados' | 'alcance'>,
): number | null => {
  if (p.alcance === null || p.alcance <= 0) return null;
  const interacciones = p.likes + p.comentarios + (p.compartidos ?? 0) + (p.guardados ?? 0);
  return (interacciones / p.alcance) * 100;
};

export const horaLocalDe = (iso: string): number | null => {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const hora = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: ZONA_HORARIA, hour: 'numeric', hour12: false }).format(ms),
  );
  return hora % 24;
};

const veredicto = (
  tasa: number,
  tasaMed: number,
  alcance: number,
  alcanceMed: number | null,
): { veredicto: PostVeredicto; motivo: string } => {
  const comparacion = `${tasa.toFixed(1)}% frente a una mediana de ${tasaMed.toFixed(1)}%`;
  if (tasa >= tasaMed * FACTOR_DESTACADO) {
    if (alcanceMed !== null && alcance < alcanceMed) {
      return {
        veredicto: 'escondido',
        motivo: `Interacción alta (${comparacion}) pero alcance por debajo de tu mediana.`,
      };
    }
    return { veredicto: 'destacado', motivo: `Interacción alta: ${comparacion}.` };
  }
  if (tasa <= tasaMed * FACTOR_BAJO) {
    return { veredicto: 'bajo', motivo: `Interacción baja: ${comparacion}.` };
  }
  return { veredicto: 'normal', motivo: `Dentro de tu rango habitual: ${comparacion}.` };
};

const resumenDe = (
  analizados: PostAnalizado[],
  baseSuficiente: boolean,
  tasaMed: number | null,
  alcanceMed: number | null,
): ResumenPosts => {
  const conTasa = analizados.filter((p) => p.tasaInteraccion !== null);
  const porFormatoMap = new Map<PostFormato, PostAnalizado[]>();
  for (const p of analizados) {
    porFormatoMap.set(p.formato, [...(porFormatoMap.get(p.formato) ?? []), p]);
  }
  const porFormato: ResumenFormato[] = [...porFormatoMap.entries()]
    .map(([formato, ps]) => ({
      formato,
      posts: ps.length,
      tasaMediana: mediana(ps.map((p) => p.tasaInteraccion).filter(esNumero)),
      alcanceMediano: mediana(ps.map((p) => p.alcance).filter(esNumero)),
    }))
    .sort((a, b) => (b.tasaMediana ?? -1) - (a.tasaMediana ?? -1));

  const mejorFormato = baseSuficiente
    ? (porFormato.find((f) => f.posts >= 2 && f.tasaMediana !== null)?.formato ?? null)
    : null;

  const porHora = new Map<number, number[]>();
  for (const p of conTasa) {
    if (p.horaLocal === null || p.tasaInteraccion === null) continue;
    porHora.set(p.horaLocal, [...(porHora.get(p.horaLocal) ?? []), p.tasaInteraccion]);
  }
  let mejorHora: number | null = null;
  let mejorPromedio = -1;
  for (const [hora, tasas] of porHora) {
    if (tasas.length < 2) continue;
    const promedio = tasas.reduce((s, t) => s + t, 0) / tasas.length;
    if (promedio > mejorPromedio) {
      mejorPromedio = promedio;
      mejorHora = hora;
    }
  }

  const cronologico = [...conTasa].sort((a, b) => Date.parse(b.publicadoEn) - Date.parse(a.publicadoEn));
  const recientes = cronologico
    .slice(0, ULTIMOS_RECIENTES)
    .map((p) => p.tasaInteraccion)
    .filter(esNumero);
  const anteriores = cronologico
    .slice(ULTIMOS_RECIENTES)
    .map((p) => p.tasaInteraccion)
    .filter(esNumero);

  const ordenPorTasa = [...conTasa].sort((a, b) => (b.tasaInteraccion ?? 0) - (a.tasaInteraccion ?? 0));

  return {
    analizados: analizados.length,
    baseSuficiente,
    tasaMediana: tasaMed,
    alcanceMediano: alcanceMed,
    porFormato,
    mejorFormato,
    mejorHora: baseSuficiente ? mejorHora : null,
    tasaUltimos5: baseSuficiente ? mediana(recientes) : null,
    tasaAnteriores: baseSuficiente && anteriores.length >= MIN_POSTS_BASE ? mediana(anteriores) : null,
    mejorPostId: baseSuficiente ? (ordenPorTasa[0]?.id ?? null) : null,
    peorPostId: baseSuficiente ? (ordenPorTasa[ordenPorTasa.length - 1]?.id ?? null) : null,
  };
};

export const analizarPosts = (posts: PostCrudo[]): { posts: PostAnalizado[]; resumen: ResumenPosts } => {
  const tasas = posts.map((p) => tasaDeInteraccion(p)).filter(esNumero);
  const alcances = posts.map((p) => p.alcance).filter(esNumero);
  const tasaMed = mediana(tasas);
  const alcanceMed = mediana(alcances);
  const baseSuficiente = tasas.length >= MIN_POSTS_BASE && tasaMed !== null && tasaMed > 0;

  const analizados: PostAnalizado[] = posts
    .map((p): PostAnalizado => {
      const tasa = tasaDeInteraccion(p);
      const base = {
        ...p,
        interacciones: p.likes + p.comentarios + (p.compartidos ?? 0) + (p.guardados ?? 0),
        tasaInteraccion: tasa,
        horaLocal: horaLocalDe(p.publicadoEn),
      };
      if (tasa === null || p.alcance === null) {
        return { ...base, veredicto: 'sin-datos', motivo: 'La red no devolvió el alcance de este post.' };
      }
      if (!baseSuficiente || tasaMed === null) {
        return {
          ...base,
          veredicto: 'sin-base',
          motivo: `Hacen falta al menos ${MIN_POSTS_BASE} posts con métricas para comparar.`,
        };
      }
      return { ...base, ...veredicto(tasa, tasaMed, p.alcance, alcanceMed) };
    })
    .sort((a, b) => Date.parse(b.publicadoEn) - Date.parse(a.publicadoEn));

  return { posts: analizados, resumen: resumenDe(analizados, baseSuficiente, tasaMed, alcanceMed) };
};
