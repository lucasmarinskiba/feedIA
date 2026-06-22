import { askJson } from '../../agent/claude.js';
import type { BrandProfile } from '../../config/types.js';
import { getAgent } from './definitions.js';
import { getCrisisState, isPausado } from '../crisis/index.js';
import { listarBacklog } from '../curator/index.js';
import { listarExperimentos } from '../experiments/index.js';
import { listCheckpoints } from '../../agent/checkpoints.js';
import { topPerformers } from '../../agent/memory.js';

export interface AgentMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AgentChatResponse {
  reply: string;
  replyHtml?: string;
  suggestions?: string[];
}

/** Builds a compact live-state block so the agent can answer grounded questions */
const buildLiveContext = (): string => {
  try {
    const crisis = getCrisisState();
    const pendingCp = listCheckpoints('pending').length;
    const backlogCount = listarBacklog(undefined).length;
    const experimentos = listarExperimentos().filter((e) => e.status === 'corriendo').length;
    const best = topPerformers(3);

    const lines: string[] = [
      `Estado: ${isPausado() ? '⚠️ publicaciones PAUSADAS' : '✅ activo'} | Posts en observación: ${crisis.postsEnObservacion?.length ?? 0}`,
      `Checkpoints pendientes de aprobación: ${pendingCp}`,
      `Ítems en backlog de contenido: ${backlogCount}`,
      `Experimentos A/B corriendo: ${experimentos}`,
    ];
    if (best.length) {
      lines.push(
        `Top performers recientes: ${best.map((p) => `${p.format}("${p.hookFirstLine.slice(0, 40)}…") saves=${p.metrics.saves}`).join(' | ')}`,
      );
    }
    return `\n\nESTADO ACTUAL DEL SISTEMA:\n${lines.map((l) => `• ${l}`).join('\n')}`;
  } catch {
    return '';
  }
};

export const agentChat = async (
  agentId: string,
  brand: BrandProfile,
  message: string,
  history: AgentMessage[] = [],
): Promise<AgentChatResponse> => {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agente no encontrado: ${agentId}`);

  const historyText = history.map((m) => `${m.role === 'user' ? 'Usuario' : agent.name}: ${m.content}`).join('\n');

  const liveCtx = buildLiveContext();

  const prompt = `${agent.systemPrompt(brand)}${liveCtx}

${historyText ? `Historial de conversación:\n${historyText}\n\n` : ''}Usuario: ${message}

Respondé de forma conversacional, concreta y orientada a resultados.
Usá listas cuando ayude a la claridad. Sé específico con ejemplos del nicho de la marca.
Cuando el usuario pregunte sobre el estado de la cuenta, usá los datos del ESTADO ACTUAL.
Al final, incluí 2-3 preguntas de seguimiento que el usuario podría querer hacer.

Respondé EXCLUSIVAMENTE con JSON válido:
{
  "reply": "tu respuesta en texto plano",
  "replyHtml": "versión con formato HTML: <strong>, <ul>, <li>, <br>, <em> donde corresponda",
  "suggestions": ["pregunta sugerida 1", "pregunta sugerida 2", "pregunta sugerida 3"]
}`;

  return askJson<AgentChatResponse>(prompt, { maxTokens: 2000 });
};
