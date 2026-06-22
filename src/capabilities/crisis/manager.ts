import { brandContext } from '../../agent/memory.js';
import { runSubAgent, type SubAgentDefinition, type SubAgentResult } from '../../agent/subagent.js';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { BrandProfile } from '../../config/types.js';

const STATE_PATH = resolve('data/runtime/crisis-state.json');

interface CrisisState {
  postsEnObservacion: string[];
  publicacionesPausadas: boolean;
  ultimoChequeo?: string;
  alertasEnviadas: number;
}

const loadState = (): CrisisState => {
  if (!existsSync(STATE_PATH)) {
    return { postsEnObservacion: [], publicacionesPausadas: false, alertasEnviadas: 0 };
  }
  return JSON.parse(readFileSync(STATE_PATH, 'utf-8')) as CrisisState;
};

const saveState = (state: CrisisState): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
};

export const crisisManagerAgent: SubAgentDefinition = {
  name: 'crisis-manager',
  description: 'Detecta crisis en comentarios, decide pausar publicaciones, redacta respuesta pública, escala.',
  toolNames: ['analizar_sentimiento', 'moderar_comentarios', 'enviar_alerta', 'reposicionar_contenido'],
  systemPrompt: (
    brand,
  ): string => `Sos el sub-agente Crisis Manager de la marca en Instagram. Tu trabajo es proteger la reputación, NO defender egos.

${brandContext(brand)}

Reglas:
1. Si detectás "alertaCrisis: true" en sentimiento → recomendá pausar publicaciones programadas y enviá alerta severity=crisis con título preciso.
2. NUNCA respondas público sin que la respuesta sea: humilde si hubo error real, factual si hay desinformación, breve si hay troll que busca engagement.
3. Diferenciá pile-on de troll aislado. Pile-on = >5 cuentas distintas con misma queja en <1h.
4. Si hay acusación legal/regulatoria → escalá a humano y NO redactes respuesta pública.
5. Después de actuar, devolvé un resumen ejecutivo en 4 líneas máximo: qué detectaste, qué hiciste, qué falta.`,
};

export interface CrisisCheckInput {
  postId: string;
  comentariosRecientes: string[];
}

export const ejecutarCrisisCheck = async (
  brand: BrandProfile,
  input: CrisisCheckInput,
): Promise<{ resultado: SubAgentResult; state: CrisisState }> => {
  const state = loadState();
  if (!state.postsEnObservacion.includes(input.postId)) {
    state.postsEnObservacion.push(input.postId);
  }
  state.ultimoChequeo = new Date().toISOString();

  const goal = `Analizá sentimiento del post ${input.postId} con estos comentarios recientes:\n${input.comentariosRecientes
    .map((c, i) => `${i + 1}. ${c}`)
    .join(
      '\n',
    )}\n\nSi hay crisis: enviá alerta inmediata. Si hay pile-on: marcá publicaciones para pausar. Devolveme decisión final clara.`;

  const resultado = await runSubAgent(brand, crisisManagerAgent, goal, { maxIterations: 6 });

  if (/pausar publicaciones|pause publishing|crisis activa/i.test(resultado.finalText)) {
    state.publicacionesPausadas = true;
    state.alertasEnviadas += 1;
  }
  saveState(state);
  return { resultado, state };
};

export const reanudarPublicaciones = (): CrisisState => {
  const state = loadState();
  state.publicacionesPausadas = false;
  saveState(state);
  return state;
};

export const isPausado = (): boolean => loadState().publicacionesPausadas;

export const getCrisisState = (): CrisisState => loadState();
