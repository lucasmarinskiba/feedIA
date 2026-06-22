import { askJson } from '../../agent/claude.js';
import type { BrandProfile } from '../../config/types.js';
import { getAgent } from './definitions.js';
import { fetchActionContext, formatActionContext } from './actionTools.js';

export interface ActionResultItem {
  label: string;
  value: string;
  detail?: string;
}

export interface ActionResultSection {
  heading: string;
  items: string[] | ActionResultItem[];
}

export interface ActionResult {
  title: string;
  summary: string;
  sections: ActionResultSection[];
  tips: string[];
  cta?: string;
}

export const executeAgentAction = async (
  agentId: string,
  actionId: string,
  brand: BrandProfile,
  params: Record<string, string>,
): Promise<ActionResult> => {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agente no encontrado: ${agentId}`);

  const action = agent.actions.find((a) => a.id === actionId);
  if (!action) throw new Error(`Acción no encontrada: ${actionId} en agente ${agentId}`);

  // Fetch real system data to ground the response in actual state
  const [actionCtx] = await Promise.all([fetchActionContext(agentId, actionId, brand, params)]);
  const ctxBlock = formatActionContext(actionCtx);

  const paramsText = Object.entries(params)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `- ${k}: ${v}`)
    .join('\n');

  const prompt = `${agent.systemPrompt(brand)}

ACCIÓN SOLICITADA: "${action.label}"
Descripción: ${action.description}

PARÁMETROS RECIBIDOS:
${paramsText || '(ninguno — usá los valores del perfil de marca como referencia)'}${ctxBlock}

Generá una respuesta COMPLETA, DETALLADA y 100% ACCIONABLE.
- Mínimo 3 secciones con contenido específico y rico
- Usá los DATOS REALES DEL SISTEMA para dar respuestas grounded en el estado actual de la cuenta
- Incluí ejemplos concretos, copy listo para usar, cifras estimadas cuando aplique
- Sé específico al nicho y marca — NUNCA des respuestas genéricas
- Cada sección debe tener al menos 4-6 items

Respondé EXCLUSIVAMENTE con JSON válido (sin markdown, sin bloques de código):
{
  "title": "título descriptivo y específico del resultado",
  "summary": "resumen ejecutivo de 2-3 oraciones que capture el valor principal",
  "sections": [
    {
      "heading": "nombre de la sección",
      "items": ["item específico 1", "item específico 2", "item específico 3", "item específico 4"]
    }
  ],
  "tips": ["tip pro específico 1", "tip pro específico 2", "tip pro específico 3"],
  "cta": "próximo paso concreto recomendado"
}`;

  return askJson<ActionResult>(prompt, { maxTokens: 3000 });
};
