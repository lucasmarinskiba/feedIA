/**
 * Respaldo de Respuestas IA sin inteligencia artificial: usa el triaje y la base de respuestas aprobadas
 * para armar la respuesta sugerida, o no responder cuando corresponde. Función pura.
 */

import type { ResultadoHerramienta, SeccionResultado } from './herramientasCatalogo.js';
import type { AccionMensaje, IntencionMensaje, PreparacionRespuestas, TipoCanal } from './respuestasTriaje.js';

const PLANTILLAS: Record<Exclude<IntencionMensaje, 'spam'>, Record<TipoCanal, string>> = {
  pregunta: {
    comentario: '¡Gracias por preguntar! Te respondemos por DM con los detalles.',
    dm: 'Gracias por escribirnos. Contanos un poco más para darte la info exacta.',
  },
  lead: {
    comentario: '¡Qué bueno que te interese! Escribinos por DM y te pasamos la info para avanzar.',
    dm: '¡Gracias por tu interés! Te pasamos la info y los pasos para avanzar cuando quieras.',
  },
  queja: {
    comentario: 'Lamentamos que haya pasado esto. Escribinos por DM para revisar tu caso puntual.',
    dm: 'Lamentamos la experiencia. Contanos qué pasó y lo revisa una persona de nuestro equipo.',
  },
  elogio: {
    comentario: '¡Gracias! Nos alegra que te haya servido.',
    dm: '¡Muchas gracias! Nos alegra un montón leerte.',
  },
  otro: {
    comentario: 'Gracias por pasar por acá. ¿Querés contarnos un poco más por DM?',
    dm: 'Gracias por escribir. ¿Qué necesitás exactamente?',
  },
};

const ESCALAR = 'Gracias por escribirnos. Lo tomamos en serio y lo va a responder una persona de nuestro equipo.';

const ETIQUETA_ACCION: Record<AccionMensaje, string> = {
  responder: 'Responder',
  escalar: 'Escalar a una persona',
  ocultar: 'Ocultar el comentario',
  ignorar: 'No responder (ignorar)',
};

const ETIQUETA_INTENCION: Record<IntencionMensaje, string> = {
  pregunta: 'Pregunta',
  queja: 'Queja',
  elogio: 'Elogio',
  lead: 'Lead (interés de compra)',
  spam: 'Spam',
  otro: 'Otro',
};

const respuestaSugerida = (
  prep: PreparacionRespuestas,
  tipo: TipoCanal,
): { texto: string | null; nota: string | null } => {
  const { triaje, coincidencia } = prep;
  if (triaje.accion === 'ocultar' || triaje.accion === 'ignorar') return { texto: null, nota: null };
  if (triaje.accion === 'escalar') return { texto: ESCALAR, nota: null };
  if (coincidencia) {
    return { texto: coincidencia.respuesta, nota: 'Usa una respuesta que ya aprobaste para una pregunta parecida.' };
  }
  const intencion = triaje.intencion === 'spam' ? 'otro' : triaje.intencion;
  return { texto: PLANTILLAS[intencion][tipo], nota: null };
};

export const respaldoRespuestas = (prep: PreparacionRespuestas, tipo: TipoCanal): ResultadoHerramienta => {
  const { triaje } = prep;
  const { texto, nota } = respuestaSugerida(prep, tipo);
  const triajeLineas = [
    `Intención: ${ETIQUETA_INTENCION[triaje.intencion]}`,
    `Acción: ${ETIQUETA_ACCION[triaje.accion]}`,
    `Puntaje de lead: ${triaje.leadScore}/100`,
    triaje.riesgos.length > 0 ? `Riesgos detectados: ${triaje.riesgos.join(', ')}` : 'Sin riesgos detectados',
  ];
  const secciones: SeccionResultado[] = [
    {
      titulo: 'Respuesta sugerida',
      tipo: 'copiable',
      contenido: texto ?? 'No respondas. Revisá la acción recomendada.',
    },
    { titulo: 'Triaje', tipo: 'lista', contenido: triajeLineas },
    { titulo: 'Motivo', tipo: 'texto', contenido: triaje.motivo },
  ];
  const notas = ['Respaldo por reglas: la IA no respondió. Revisá el texto antes de enviarlo.'];
  if (nota) notas.push(nota);
  if (triaje.leadScore >= 60) notas.push('Lead calificado: conviene pasarlo a Bandeja y responder hoy.');
  if (triaje.accion === 'escalar')
    notas.push('No prometas reembolsos, plazos ni resultados: esto lo resuelve una persona.');
  return {
    titulo: tipo === 'dm' ? 'Respuesta a DM' : 'Respuesta a comentario',
    secciones,
    notas,
  };
};
