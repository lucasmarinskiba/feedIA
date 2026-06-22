/**
 * Professional Handoff — genera resumen ejecutivo cuando el bot escala a humano.
 */

import { z } from 'zod';
import { createCheckpoint } from '../../agent/checkpoints.js';
import { sendAlert } from '../../integrations/notifications.js';
import type { ClientMemory } from './clientMemory.js';
import { buildMemoryContext, getClientMemory } from './clientMemory.js';
import { buildKnowledgeContext } from './knowledgeRag.js';

export const HandoffPayloadSchema = z.object({
  userId: z.string(),
  userHandle: z.string().optional(),
  channel: z.enum(['dm', 'comment', 'story_reply']),
  originalMessage: z.string(),
  intent: z.string(),
  confidence: z.number(),
  botReplies: z.array(z.string()).default([]),
  reason: z.string(), // por qué escala
  estimatedLeadValue: z.enum(['bajo', 'medio', 'alto']).default('medio'),
});

export type HandoffPayload = z.infer<typeof HandoffPayloadSchema>;

export interface ProfessionalHandoffResult {
  checkpointId: string;
  summary: string;
  priority: 'info' | 'warn' | 'crisis' | 'lead';
}

const estimateValue = (intent: string, memory: ClientMemory): HandoffPayload['estimatedLeadValue'] => {
  if (['lead-caliente', 'consulta-precio', 'demo-request'].includes(intent)) return 'alto';
  if (memory.stage === 'negociacion' || memory.stage === 'interesado') return 'alto';
  if (['pregunta-info', 'colaboracion'].includes(intent)) return 'medio';
  return 'bajo';
};

export const createProfessionalHandoff = (payload: HandoffPayload): ProfessionalHandoffResult => {
  const memory = getClientMemory(payload.userId);
  const leadValue =
    payload.estimatedLeadValue === 'medio' ? estimateValue(payload.intent, memory) : payload.estimatedLeadValue;

  const knowledgeContext = buildKnowledgeContext(payload.originalMessage, 2);
  const memoryContext = buildMemoryContext(payload.userId);

  const summaryLines: string[] = [];
  summaryLines.push(`## 🎯 Resumen de escalación`);
  summaryLines.push(`**Usuario:** ${payload.userHandle ?? payload.userId}`);
  summaryLines.push(`**Canal:** ${payload.channel}`);
  summaryLines.push(`**Intent detectado:** ${payload.intent} (confianza: ${Math.round(payload.confidence * 100)}%)`);
  summaryLines.push(`**Valor estimado del lead:** ${leadValue.toUpperCase()}`);
  summaryLines.push(`**Motivo de escalación:** ${payload.reason}`);
  summaryLines.push('');
  summaryLines.push('### Último mensaje del usuario');
  summaryLines.push(payload.originalMessage);
  summaryLines.push('');

  if (memoryContext) {
    summaryLines.push('### Contexto del cliente');
    summaryLines.push(memoryContext);
    summaryLines.push('');
  }

  if (knowledgeContext) {
    summaryLines.push('### Conocimiento relevante');
    summaryLines.push(knowledgeContext);
    summaryLines.push('');
  }

  if (payload.botReplies.length > 0) {
    summaryLines.push('### Respuestas previas del bot');
    payload.botReplies.forEach((r, i) => summaryLines.push(`${i + 1}. ${r}`));
    summaryLines.push('');
  }

  summaryLines.push('### Próximo paso sugerido');
  if (leadValue === 'alto') {
    summaryLines.push('Contactar en menos de 2 horas. Ofrecer llamada/demo corta.');
  } else if (leadValue === 'medio') {
    summaryLines.push('Responder en el día con información específica solicitada.');
  } else {
    summaryLines.push('Responder en 24-48h con recursos útiles.');
  }

  const summary = summaryLines.join('\n');

  const checkpoint = createCheckpoint(
    leadValue === 'alto' ? 'lead_hot' : 'human_handoff',
    summary.slice(0, 500),
    payload.userId,
    {
      userId: payload.userId,
      userHandle: payload.userHandle,
      channel: payload.channel,
      intent: payload.intent,
      leadValue,
      confidence: payload.confidence,
      originalMessage: payload.originalMessage,
    },
    leadValue === 'alto' ? 120 : 1440, // 2h para leads calientes, 24h para otros
  );

  const priority: ProfessionalHandoffResult['priority'] = leadValue === 'alto' ? 'lead' : 'warn';

  sendAlert({
    severity: priority,
    title: `${leadValue === 'alto' ? '🔥' : '👋'} Handoff profesional — ${payload.userHandle ?? payload.userId}`,
    body: summary.slice(0, 2500),
    metadata: { checkpointId: checkpoint.id, leadValue, intent: payload.intent },
  }).catch(() => undefined);

  return {
    checkpointId: checkpoint.id,
    summary,
    priority,
  };
};
