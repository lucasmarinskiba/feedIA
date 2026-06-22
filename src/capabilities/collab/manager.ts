import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { sendDm } from '../../integrations/meta.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { upsertProspect, setStatus, loadProspects, type CreatorProspect } from './prospects.js';

export interface CreatorObservation {
  handle: string;
  followersAprox?: number;
  nichoDeclarado: string;
  ejemplosContenido: string[];
  audienciaAproxLatam?: number;
  notasUsuario?: string;
}

interface CreatorEvaluation {
  alineacion: number;
  riesgoMarca: 'bajo' | 'medio' | 'alto';
  motivacion: string;
  formatoColabSugerido: CreatorProspect['formatoColabSugerido'];
  borradorOutreach: string;
  veredicto: 'avanzar' | 'monitorear' | 'descartar';
  razonVeredicto: string;
}

const evaluarCreador = async (brand: BrandProfile, obs: CreatorObservation): Promise<CreatorEvaluation> => {
  const prompt = `Actuá como manager de colaboraciones evaluando un creador para una potencial alianza.

${brandContext(brand)}

CREADOR:
- Handle: @${obs.handle}
- Followers aprox: ${obs.followersAprox ?? 'N/A'}
- Nicho declarado: ${obs.nichoDeclarado}
- Audiencia LATAM aprox: ${obs.audienciaAproxLatam ?? 'N/A'}
- Ejemplos de contenido:
${obs.ejemplosContenido.map((e, i) => `  ${i + 1}. ${e}`).join('\n')}
${obs.notasUsuario ? `- Notas del equipo: ${obs.notasUsuario}` : ''}

Evaluá:
- Alineación 0-100 con marca/audiencia.
- Riesgo de marca (¿hay drama, desinformación, controversia política activa?).
- Motivación: por qué esta colab sería buena para ambos (no para vanidad de seguidores).
- Formato de colab sugerido.
- Borrador de outreach (DM corto, ≤4 oraciones, sin "hola, espero que estés bien"). Lo más cálido y específico posible: mencionar UN post o idea concreta del creador.

Veredicto:
- "avanzar" si alineación ≥ 70, riesgo bajo o medio, motivación clara.
- "monitorear" si alineación 50-70 o riesgo medio.
- "descartar" si alineación < 50 o riesgo alto.

JSON:
{
  "alineacion": 0,
  "riesgoMarca": "bajo|medio|alto",
  "motivacion": "...",
  "formatoColabSugerido": "co-creacion|menciones-cruzadas|live-conjunto|paid-partnership|guest-post",
  "borradorOutreach": "DM listo para enviar",
  "veredicto": "avanzar|monitorear|descartar",
  "razonVeredicto": "..."
}`;
  return askJson<CreatorEvaluation>(prompt, { maxTokens: 2500 });
};

const newId = (): string => `pro-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

export const procesarObservaciones = async (
  brand: BrandProfile,
  observaciones: CreatorObservation[],
): Promise<CreatorProspect[]> => {
  const out: CreatorProspect[] = [];
  for (const obs of observaciones) {
    const evalu = await evaluarCreador(brand, obs);
    const status: CreatorProspect['status'] = evalu.veredicto === 'descartar' ? 'descartado' : 'evaluado';
    const prospect: CreatorProspect = {
      id: newId(),
      handle: obs.handle,
      ...(obs.followersAprox !== undefined ? { followersAprox: obs.followersAprox } : {}),
      nicho: obs.nichoDeclarado,
      alineacion: evalu.alineacion,
      riesgoMarca: evalu.riesgoMarca,
      motivacion: evalu.motivacion,
      formatoColabSugerido: evalu.formatoColabSugerido,
      status,
      borradorOutreach: evalu.borradorOutreach,
      notas: `Veredicto inicial: ${evalu.veredicto}. ${evalu.razonVeredicto}`,
      capturadoEn: new Date().toISOString(),
    };
    upsertProspect(prospect);
    out.push(prospect);
  }
  return out;
};

export interface NegotiationResponse {
  resumen: string;
  sentimiento: 'interesado' | 'tibio' | 'rechazo' | 'pidiendo-mas-info';
  contraOferta?: string;
  siguientePaso: 'enviar-condiciones' | 'agendar-llamada' | 'pedir-rev-humana' | 'cerrar';
  borradorRespuesta: string;
}

export const responderNegociacion = async (
  brand: BrandProfile,
  prospect: CreatorProspect,
  mensajeRecibido: string,
): Promise<NegotiationResponse> => {
  const prompt = `Actuás como manager de colaboraciones respondiendo a una conversación.

${brandContext(brand)}

PROSPECT @${prospect.handle} (${prospect.formatoColabSugerido}, alineación ${prospect.alineacion}):
- Motivación: ${prospect.motivacion}
- Notas previas: ${prospect.notas.slice(0, 500)}

MENSAJE QUE NOS ENVIÓ:
"${mensajeRecibido}"

Reglas:
- Nunca confirmar precio ni condiciones contractuales en DM. Si el creador pide cifra, "agendar-llamada" o "pedir-rev-humana".
- Si hay drama o demanda agresiva → "pedir-rev-humana".
- Tono: profesional cálido, no hype.
- Respuesta máx 5 oraciones.

JSON:
{
  "resumen": "qué dice el mensaje",
  "sentimiento": "interesado|tibio|rechazo|pidiendo-mas-info",
  "contraOferta": "solo si aplica y es razonable",
  "siguientePaso": "enviar-condiciones|agendar-llamada|pedir-rev-humana|cerrar",
  "borradorRespuesta": "DM listo para enviar"
}`;
  return askJson<NegotiationResponse>(prompt, { maxTokens: 2000 });
};

export const enviarOutreach = async (prospectId: string): Promise<{ ok: boolean; error?: string }> => {
  const prospect = loadProspects().find((p) => p.id === prospectId);
  if (!prospect) return { ok: false, error: 'Prospect no encontrado' };
  if (!prospect.borradorOutreach) return { ok: false, error: 'Sin borradorOutreach' };
  if (prospect.status !== 'evaluado') {
    return { ok: false, error: `Status ${prospect.status} no permite outreach` };
  }
  const r = await sendDm(prospect.handle, prospect.borradorOutreach);
  if (!r.ok) return { ok: false, ...(r.error ? { error: r.error } : {}) };
  setStatus(prospectId, 'outreach-enviado', 'Outreach inicial enviado');
  log.success(`Outreach colab enviado a @${prospect.handle}`);
  return { ok: true };
};
