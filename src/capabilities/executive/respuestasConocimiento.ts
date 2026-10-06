/**
 * Base de respuestas aprobadas por marca: cada respuesta que el dueño aprueba en Respuestas IA se guarda como
 * FAQ aprobada de su marca. El orquestador de respuestas de DMs y comentarios consulta esa misma base.
 */

import { createFAQ, deleteFAQ, listFAQs } from '../community/faqDatabase.js';
import type { EntradaConocimiento } from './respuestasTriaje.js';

type FAQ = ReturnType<typeof listFAQs>[number];

const aEntrada = (faq: FAQ): EntradaConocimiento => ({
  id: faq.id,
  pregunta: faq.question,
  respuesta: faq.answer,
  creadaEn: faq.createdAt,
});

const sinAcentos = (texto: string): string => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

export const leerConocimiento = (marca: string): EntradaConocimiento[] =>
  listFAQs({}, marca)
    .filter((faq) => faq.approvedByHuman)
    .map(aEntrada);

export const agregarConocimiento = (
  marca: string,
  datos: { pregunta: string; respuesta: string },
): EntradaConocimiento =>
  aEntrada(
    createFAQ(
      {
        question: datos.pregunta,
        answer: datos.respuesta,
        category: 'general',
        patterns: [...new Set([datos.pregunta, sinAcentos(datos.pregunta)])],
        approvedByHuman: true,
      },
      marca,
    ),
  );

export const eliminarConocimiento = (marca: string, id: string): boolean => {
  const aprobada = leerConocimiento(marca).some((e) => e.id === id);
  return aprobada && deleteFAQ(id, marca);
};
