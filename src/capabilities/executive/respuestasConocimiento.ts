/**
 * Base de respuestas aprobadas: cada respuesta que el dueño aprueba en Respuestas IA se guarda como FAQ
 * aprobada, la misma base que consulta el orquestador de respuestas de DMs y comentarios.
 */

import { createFAQ, deleteFAQ, listFAQs } from '../community/faqDatabase.js';
import type { EntradaConocimiento } from './respuestasTriaje.js';

const aEntrada = (faq: ReturnType<typeof listFAQs>[number]): EntradaConocimiento => ({
  id: faq.id,
  pregunta: faq.question,
  respuesta: faq.answer,
  creadaEn: faq.createdAt,
});

export const leerConocimiento = (): EntradaConocimiento[] =>
  listFAQs()
    .filter((faq) => faq.approvedByHuman)
    .map(aEntrada);

export const agregarConocimiento = (datos: { pregunta: string; respuesta: string }): EntradaConocimiento =>
  aEntrada(
    createFAQ({
      question: datos.pregunta,
      answer: datos.respuesta,
      category: 'general',
      patterns: [datos.pregunta],
      approvedByHuman: true,
    }),
  );

export const eliminarConocimiento = (id: string): boolean => {
  const aprobada = leerConocimiento().some((e) => e.id === id);
  return aprobada && deleteFAQ(id);
};
