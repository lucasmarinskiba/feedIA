/**
 * Edición de video a partir de una transcripción con tiempos: detecta silencios y muletillas, arma los
 * cortes, los subtítulos (SRT) ajustados al video editado y el comando de FFmpeg que aplica los cortes.
 * Función pura: no lee ni escribe ningún video.
 */

export interface Segmento {
  inicio: number;
  fin: number;
  texto: string;
}

export interface Intervalo {
  inicio: number;
  fin: number;
}

export interface Corte extends Intervalo {
  motivo: 'silencio' | 'muletilla';
}

export interface PlanEdicion {
  cortes: Corte[];
  conservado: Intervalo[];
  duracionOriginal: number;
  duracionFinal: number;
  muletillas: number;
  silencios: number;
  subtitulosSrt: string;
  ffmpeg: string | null;
}

const MULETILLAS = new Set(['eh', 'ehh', 'ehm', 'em', 'emm', 'mm', 'mmm', 'ah', 'ahh', 'uh', 'umm', 'ammm']);
const UMBRAL_SILENCIO = 0.7;
const PAUSA_MANTENIDA = 0.3;
const MIN_CONSERVADO = 0.05;
const MAX_CARACTERES_LINEA = 42;
const MAX_LINEAS_SUBTITULO = 2;
const MIN_DURACION_SUBTITULO = 0.8;
const MAX_INTERVALOS = 150;
const MAX_SEGMENTOS = 2000;
const SEGUNDOS_POR_PALABRA = 0.45;
const DURACION_MINIMA_SEGMENTO = 1.5;

const TIEMPO = /^(?:(\d+):)?(\d{1,2}):(\d{2})(?:[,.](\d{1,3}))?$/;
const LINEA_CON_TIEMPO = /^\[?\s*(\d{1,2}(?::\d{2}){1,2}(?:[,.]\d{1,3})?)\s*\]?\s*[-–:]?\s*(.+)$/;

const parseTiempo = (valor: string): number | null => {
  const m = TIEMPO.exec(valor.trim());
  if (!m) return null;
  const horas = m[1] ? Number(m[1]) : 0;
  const milesimas = m[4] ? Number(m[4].padEnd(3, '0')) / 1000 : 0;
  return horas * 3600 + Number(m[2]) * 60 + Number(m[3]) + milesimas;
};

const parsearSrt = (texto: string): Segmento[] => {
  const segmentos: Segmento[] = [];
  for (const bloque of texto.replace(/\r/g, '').split(/\n\s*\n/)) {
    const lineas = bloque
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    const indice = lineas.findIndex((l) => l.includes('-->'));
    if (indice < 0) continue;
    const partes = (lineas[indice] ?? '').split('-->');
    const inicio = parseTiempo(partes[0] ?? '');
    const fin = parseTiempo((partes[1] ?? '').trim().split(/\s+/)[0] ?? '');
    const contenido = lineas.slice(indice + 1).join(' ');
    if (inicio === null || fin === null || fin <= inicio || !contenido) continue;
    segmentos.push({ inicio, fin, texto: contenido });
  }
  return segmentos;
};

const estimarDuracion = (texto: string): number =>
  Math.max(DURACION_MINIMA_SEGMENTO, texto.split(/\s+/).length * SEGUNDOS_POR_PALABRA);

const parsearLineas = (texto: string): Segmento[] => {
  const entradas: Array<{ inicio: number; texto: string }> = [];
  for (const linea of texto.split('\n')) {
    const m = LINEA_CON_TIEMPO.exec(linea.trim());
    if (!m) continue;
    const inicio = parseTiempo(m[1] ?? '');
    const contenido = (m[2] ?? '').trim();
    if (inicio === null || !contenido) continue;
    entradas.push({ inicio, texto: contenido });
  }
  return entradas.map((entrada, i) => {
    const siguiente = entradas[i + 1]?.inicio;
    const estimado = entrada.inicio + estimarDuracion(entrada.texto);
    const fin = siguiente !== undefined && siguiente > entrada.inicio ? Math.min(siguiente, estimado) : estimado;
    return { inicio: entrada.inicio, fin, texto: entrada.texto };
  });
};

/** Acepta SRT o líneas que empiecen con [mm:ss]. Sin tiempos devuelve []. */
export const parsearTranscripcion = (texto: string): Segmento[] => {
  const segmentos = texto.includes('-->') ? parsearSrt(texto) : parsearLineas(texto);
  return segmentos.slice(0, MAX_SEGMENTOS);
};

const quitarMuletillas = (texto: string): { texto: string; quitadas: number } => {
  let quitadas = 0;
  const limpias = texto.split(/\s+/).filter((palabra) => {
    const plana = palabra.toLowerCase().replace(/[.,;:¿?¡!…"'()]/g, '');
    if (!MULETILLAS.has(plana)) return true;
    quitadas += 1;
    return false;
  });
  const unido = limpias.join(' ').replace(/^[,;:\s]+/, '');
  const capitalizado = unido.charAt(0).toUpperCase() + unido.slice(1);
  return { texto: capitalizado, quitadas };
};

const combinar = (intervalos: Intervalo[]): Intervalo[] => {
  const salida: Intervalo[] = [];
  for (const actual of [...intervalos].sort((a, b) => a.inicio - b.inicio)) {
    const ultimo = salida[salida.length - 1];
    if (ultimo && actual.inicio <= ultimo.fin) {
      salida[salida.length - 1] = { inicio: ultimo.inicio, fin: Math.max(ultimo.fin, actual.fin) };
    } else {
      salida.push({ inicio: actual.inicio, fin: actual.fin });
    }
  }
  return salida;
};

const complementario = (cortes: Intervalo[], total: number): Intervalo[] => {
  const salida: Intervalo[] = [];
  let cursor = 0;
  for (const corte of cortes) {
    if (corte.inicio > cursor) salida.push({ inicio: cursor, fin: corte.inicio });
    cursor = Math.max(cursor, corte.fin);
  }
  if (total > cursor) salida.push({ inicio: cursor, fin: total });
  return salida.filter((i) => i.fin - i.inicio >= MIN_CONSERVADO);
};

/** Pasa un tiempo original al tiempo del video editado. Un tiempo dentro de un corte cae al inicio del siguiente tramo. */
const mapear = (t: number, conservado: Intervalo[]): number => {
  let acumulado = 0;
  for (const tramo of conservado) {
    if (t <= tramo.inicio) return acumulado;
    if (t < tramo.fin) return acumulado + (t - tramo.inicio);
    acumulado += tramo.fin - tramo.inicio;
  }
  return acumulado;
};

const partirTexto = (texto: string): string[][] => {
  const lineas: string[] = [];
  let actual = '';
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const candidata = actual ? `${actual} ${palabra}` : palabra;
    if (candidata.length > MAX_CARACTERES_LINEA && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = candidata;
    }
  }
  if (actual) lineas.push(actual);
  const subtitulos: string[][] = [];
  for (let i = 0; i < lineas.length; i += MAX_LINEAS_SUBTITULO) {
    subtitulos.push(lineas.slice(i, i + MAX_LINEAS_SUBTITULO));
  }
  return subtitulos;
};

const dosDigitos = (n: number): string => String(n).padStart(2, '0');

const formatoSrt = (segundos: number): string => {
  const ms = Math.round(segundos * 1000);
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  const seg = Math.floor((ms % 60_000) / 1000);
  return `${dosDigitos(horas)}:${dosDigitos(minutos)}:${dosDigitos(seg)},${String(ms % 1000).padStart(3, '0')}`;
};

const subtitulosSrt = (limpios: Segmento[], conservado: Intervalo[]): string => {
  const bloques: string[] = [];
  for (const segmento of limpios) {
    const inicio = mapear(segmento.inicio, conservado);
    const fin = Math.max(mapear(segmento.fin, conservado), inicio + MIN_DURACION_SUBTITULO);
    const subtitulos = partirTexto(segmento.texto);
    const pesos = subtitulos.map((lineas) => lineas.join(' ').length);
    const total = pesos.reduce((a, b) => a + b, 0) || 1;
    let cursor = inicio;
    subtitulos.forEach((lineas, i) => {
      const hasta = i === subtitulos.length - 1 ? fin : cursor + ((fin - inicio) * (pesos[i] ?? 0)) / total;
      bloques.push(`${formatoSrt(cursor)} --> ${formatoSrt(hasta)}\n${lineas.join('\n')}`);
      cursor = hasta;
    });
  }
  return bloques.map((bloque, i) => `${i + 1}\n${bloque}`).join('\n\n');
};

const comandoFfmpeg = (conservado: Intervalo[]): string | null => {
  if (conservado.length === 0 || conservado.length > MAX_INTERVALOS) return null;
  const t = (valor: number): string => valor.toFixed(3);
  const pistas = conservado.map(
    (tramo, n) =>
      `[0:v]trim=start=${t(tramo.inicio)}:end=${t(tramo.fin)},setpts=PTS-STARTPTS[v${n}];[0:a]atrim=start=${t(tramo.inicio)}:end=${t(tramo.fin)},asetpts=PTS-STARTPTS[a${n}]`,
  );
  const uniones = conservado.map((_, n) => `[v${n}][a${n}]`).join('');
  return `ffmpeg -i entrada.mp4 -filter_complex "${pistas.join(';')};${uniones}concat=n=${conservado.length}:v=1:a=1[v][a]" -map "[v]" -map "[a]" salida_editada.mp4`;
};

const redondear2 = (n: number): number => Math.round(n * 100) / 100;

export const planEdicion = (segmentos: Segmento[]): PlanEdicion | null => {
  if (segmentos.length === 0) return null;
  const ordenados = [...segmentos].sort((a, b) => a.inicio - b.inicio);
  const cortes: Corte[] = [];
  const limpios: Segmento[] = [];
  let muletillas = 0;
  for (const segmento of ordenados) {
    const limpio = quitarMuletillas(segmento.texto);
    muletillas += limpio.quitadas;
    if (limpio.texto === '') {
      cortes.push({ inicio: segmento.inicio, fin: segmento.fin, motivo: 'muletilla' });
      continue;
    }
    limpios.push({ inicio: segmento.inicio, fin: segmento.fin, texto: limpio.texto });
  }
  if (limpios.length === 0) return null;

  let silencios = 0;
  const primero = limpios[0];
  if (primero && primero.inicio > UMBRAL_SILENCIO) {
    cortes.push({ inicio: 0, fin: primero.inicio - PAUSA_MANTENIDA / 2, motivo: 'silencio' });
    silencios += 1;
  }
  for (let i = 1; i < limpios.length; i += 1) {
    const previo = limpios[i - 1];
    const actual = limpios[i];
    if (!previo || !actual) continue;
    if (actual.inicio - previo.fin > UMBRAL_SILENCIO) {
      cortes.push({
        inicio: previo.fin + PAUSA_MANTENIDA / 2,
        fin: actual.inicio - PAUSA_MANTENIDA / 2,
        motivo: 'silencio',
      });
      silencios += 1;
    }
  }

  const total = Math.max(...ordenados.map((s) => s.fin));
  const conservado = complementario(combinar(cortes), total);
  if (conservado.length === 0) return null;
  const duracionFinal = conservado.reduce((acc, tramo) => acc + (tramo.fin - tramo.inicio), 0);

  return {
    cortes: [...cortes].sort((a, b) => a.inicio - b.inicio),
    conservado,
    duracionOriginal: redondear2(total),
    duracionFinal: redondear2(duracionFinal),
    muletillas,
    silencios,
    subtitulosSrt: subtitulosSrt(limpios, conservado),
    ffmpeg: comandoFfmpeg(conservado),
  };
};
