import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface LeadQualification {
  remitente: string;
  preguntasRecomendadas: string[];
  scoreInicial: number;
  razonScore: string;
  siguientePaso: 'agendar-llamada' | 'enviar-recurso' | 'pedir-mas-info' | 'derivar-humano' | 'descartar';
  textoSiguienteMensaje: string;
}

export const calificarLead = async (
  brand: BrandProfile,
  conversacion: { remitente: string; turnos: Array<{ rol: 'lead' | 'marca'; texto: string }> },
): Promise<LeadQualification> => {
  const prompt = `Actuá como SDR (sales development representative) calificando leads que llegan por DM.

${brandContext(brand)}

CONVERSACIÓN CON @${conversacion.remitente}:
${conversacion.turnos.map((t) => `${t.rol === 'lead' ? 'Lead' : 'Marca'}: ${t.texto}`).join('\n')}

Decidí 2-3 preguntas de calificación faltantes (presupuesto, urgencia, problema concreto, autoridad de decisión). Proponé un score 0-100 con los datos actuales y el siguiente paso.

NO inventes datos, NO confirmes precios, NO firmes nada en nombre de la marca.

JSON:
{
  "remitente": "@${conversacion.remitente}",
  "preguntasRecomendadas": ["...", "...", "..."],
  "scoreInicial": 0,
  "razonScore": "señales que subieron/bajaron el score",
  "siguientePaso": "agendar-llamada|enviar-recurso|pedir-mas-info|derivar-humano|descartar",
  "textoSiguienteMensaje": "mensaje listo para enviar (incluye 1 sola pregunta como máximo)"
}`;
  return askJson<LeadQualification>(prompt, { maxTokens: 2500 });
};
