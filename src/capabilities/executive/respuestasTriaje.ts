/**
 * Triaje de mensajes de comunidad: detecta la intención, el riesgo (salud, legal, dinero, datos,
 * crisis, reembolsos), el puntaje de lead y la acción recomendada. Además busca la respuesta
 * aprobada que más se parece al mensaje. Función pura: no toca red ni disco.
 */

export type IntencionMensaje = 'pregunta' | 'queja' | 'elogio' | 'lead' | 'spam' | 'otro';
export type AccionMensaje = 'responder' | 'escalar' | 'ocultar' | 'ignorar';
export type TipoCanal = 'comentario' | 'dm';

export interface Triaje {
  intencion: IntencionMensaje;
  leadScore: number;
  riesgos: string[];
  accion: AccionMensaje;
  motivo: string;
}

export interface EntradaConocimiento {
  id: string;
  pregunta: string;
  respuesta: string;
  creadaEn: string;
}

const RIESGOS: Array<{ id: string; patron: RegExp; etiqueta: string }> = [
  {
    id: 'salud',
    patron: /\b(medic|dolor|sintoma|diagnostic|receta|pastilla|tratamiento|enferm|embarazad)/,
    etiqueta: 'tema de salud',
  },
  { id: 'legal', patron: /\b(abogad|demanda|denuncia|juicio|legal|justicia|defensor)/, etiqueta: 'tema legal' },
  {
    id: 'dinero',
    patron: /\b(estafa|estafad|robo|robaron|me cobraron|cobro doble|transferi|tarjeta|deuda)/,
    etiqueta: 'problema de cobro o dinero',
  },
  {
    id: 'reembolso',
    patron: /\b(reembols|devolucion|devuelvan|plata de vuelta|devolver)/,
    etiqueta: 'pedido de reembolso',
  },
  {
    id: 'crisis',
    patron: /\b(escandalo|verguenza|los voy a denunciar|mentirosos|fraude|asco|vergonzoso)/,
    etiqueta: 'posible crisis pública',
  },
  {
    id: 'datos',
    patron: /\b(mi direccion|mi telefono|mi dni|mi cuenta|numero de tarjeta|mi clave|mi contrasena)/,
    etiqueta: 'datos personales',
  },
];

const SPAM =
  /\b(gana (dinero|plata)|desde tu casa|inversion|bitcoin|cripto|haz clic|click aqui|gratis ya|sigueme y te)\b/;
const LEAD =
  /\b(precio|cuanto (cuesta|sale|vale|es)|presupuesto|contratar|comprar|reservar|turno|disponibilidad|cotizacion|asesoria|me interesa|como (compro|contrato|pago)|envian|hacen envios)\b/;
const QUEJA =
  /\b(malo|pesim|horrible|nunca llego|no funciona|no sirve|decepcion|reclamo|mal servicio|no me respondieron)\b/;
const ELOGIO = /\b(gracias|excelente|genial|me encanto|hermos|increible|buenisim|felicit|bravo)\b/;
const PREGUNTA = /\?|\b(como|cuando|donde|que|cual|cuales|puedo|tienen|hay)\b/;
const URGENCIA = /\b(hoy|ya|urgente|cuanto antes|mañana|manana)\b/;
const CONTACTO = /\b(whatsapp|wpp|mail|correo|dm|mensaje directo|llamar)\b/;
const INTERES = /\b(quiero|necesito|busco)\b/;
const STOPWORDS = new Set([
  'de',
  'la',
  'el',
  'que',
  'y',
  'en',
  'un',
  'una',
  'los',
  'las',
  'por',
  'para',
  'con',
  'es',
  'lo',
  'al',
  'del',
  'se',
  'no',
  'si',
  'mi',
  'tu',
  'te',
  'me',
  'a',
  'o',
  'u',
  'como',
  'hay',
  'son',
  'sus',
  'mas',
  'muy',
  'ya',
]);

export const normalizarTexto = (texto: string): string =>
  texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const intencionDe = (t: string): IntencionMensaje => {
  if (SPAM.test(t)) return 'spam';
  if (QUEJA.test(t)) return 'queja';
  if (LEAD.test(t)) return 'lead';
  if (PREGUNTA.test(t)) return 'pregunta';
  if (ELOGIO.test(t)) return 'elogio';
  return 'otro';
};

const puntajeLeadDe = (t: string, intencion: IntencionMensaje): number => {
  if (intencion === 'queja' || intencion === 'spam') return 0;
  let puntaje = 0;
  if (LEAD.test(t)) puntaje += 50;
  if (INTERES.test(t)) puntaje += 15;
  if (URGENCIA.test(t)) puntaje += 10;
  if (CONTACTO.test(t)) puntaje += 5;
  if (t.includes('?')) puntaje += 10;
  return Math.min(100, puntaje);
};

export const triajarMensaje = (mensaje: string, tipo: TipoCanal, intencionElegida?: IntencionMensaje): Triaje => {
  const t = normalizarTexto(mensaje);
  const intencion = intencionElegida ?? intencionDe(t);
  const riesgos = RIESGOS.filter((r) => r.patron.test(t)).map((r) => r.id);
  const leadScore = puntajeLeadDe(t, intencion);
  const etiquetasRiesgo = RIESGOS.filter((r) => riesgos.includes(r.id)).map((r) => r.etiqueta);

  if (riesgos.length > 0) {
    return {
      intencion,
      leadScore,
      riesgos,
      accion: 'escalar',
      motivo: `Hay ${etiquetasRiesgo.join(', ')}: lo tiene que responder una persona.`,
    };
  }
  if (intencion === 'spam') {
    return {
      intencion,
      leadScore,
      riesgos,
      accion: tipo === 'dm' ? 'ignorar' : 'ocultar',
      motivo: 'Parece spam o estafa: no respondas.',
    };
  }
  return {
    intencion,
    leadScore,
    riesgos,
    accion: 'responder',
    motivo:
      intencion === 'lead'
        ? 'Hay interés de compra: respondé e invitá a seguir por DM.'
        : 'Se puede responder con la plantilla de la marca.',
  };
};

const tokens = (texto: string): Set<string> =>
  new Set(
    normalizarTexto(texto)
      .replace(/\?/g, ' ')
      .split(' ')
      .filter((p) => p.length > 2 && !STOPWORDS.has(p)),
  );

export const similitud = (a: string, b: string): number => {
  const ta = tokens(a);
  const tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let comunes = 0;
  for (const p of ta) if (tb.has(p)) comunes += 1;
  return comunes / (ta.size + tb.size - comunes);
};

export const buscarRespuestaAprobada = (
  mensaje: string,
  entradas: EntradaConocimiento[],
  umbral = 0.5,
): EntradaConocimiento | null => {
  let mejor: EntradaConocimiento | null = null;
  let puntajeMejor = umbral;
  for (const entrada of entradas) {
    const puntaje = similitud(mensaje, entrada.pregunta);
    if (puntaje >= puntajeMejor) {
      mejor = entrada;
      puntajeMejor = puntaje;
    }
  }
  return mejor;
};

export interface PreparacionRespuestas {
  triaje: Triaje;
  coincidencia: EntradaConocimiento | null;
}

const INTENCIONES: readonly IntencionMensaje[] = ['pregunta', 'queja', 'elogio', 'lead', 'spam', 'otro'];

export const prepararRespuestas = (
  mensaje: string,
  tipo: TipoCanal,
  intencionValor: string | number | undefined,
  entradas: EntradaConocimiento[],
): PreparacionRespuestas => {
  const elegida = INTENCIONES.find((i) => i === intencionValor);
  const triaje = triajarMensaje(mensaje, tipo, elegida);
  const coincidencia = triaje.accion === 'responder' ? buscarRespuestaAprobada(mensaje, entradas) : null;
  return { triaje, coincidencia };
};

export const MAX_PREGUNTA = 300;
export const MAX_RESPUESTA = 600;
export const LIMITE_CONOCIMIENTO = 200;

export const validarRespuestaAprobada = (
  pregunta: unknown,
  respuesta: unknown,
): { ok: true; valor: { pregunta: string; respuesta: string } } | { ok: false; error: string } => {
  const p = typeof pregunta === 'string' ? pregunta.replace(/\u0000/g, '').trim() : '';
  const r = typeof respuesta === 'string' ? respuesta.replace(/\u0000/g, '').trim() : '';
  if (!p) return { ok: false, error: 'Falta el mensaje que recibiste.' };
  if (!r) return { ok: false, error: 'Falta la respuesta aprobada.' };
  if (p.length > MAX_PREGUNTA) return { ok: false, error: `El mensaje no puede superar ${MAX_PREGUNTA} caracteres.` };
  if (r.length > MAX_RESPUESTA)
    return { ok: false, error: `La respuesta no puede superar ${MAX_RESPUESTA} caracteres.` };
  return { ok: true, valor: { pregunta: p, respuesta: r } };
};
