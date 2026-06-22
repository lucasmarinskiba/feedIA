import { runAgentTask } from './orchestrator.js';
import { getAgent } from './registry.js';
import { log } from './logger.js';
import type { BrandProfile } from '../config/types.js';

export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  agentIds: string[];
  coordinationPrompt: string;
}

export const AGENT_TEAMS: AgentTeam[] = [
  {
    id: 'content-strike-team',
    name: 'Content Strike Team',
    description: 'Equipo rápido para producir contenido de alta calidad en 24h. Ideal para oportunidades de trending.',
    agentIds: ['market-intelligence', 'content-creator', 'copywriter', 'video-producer', 'brand-guardian'],
    coordinationPrompt: `Sos el líder del Content Strike Team. Tu objetivo es coordinar a 5 agentes especialistas para producir contenido de alta calidad en menos de 24 horas.

FLUJO DE TRABAJO:
1. market-intelligence: Scoutear tendencias y oportunidades
2. content-creator: Diseñar concepto y estructura
3. copywriter: Escribir hooks, captions y CTAs
4. video-producer: Generar assets visuales y video si aplica
5. brand-guardian: Validar coherencia de marca antes de entregar

REGLAS:
- Cada agente debe recibir el output del anterior como input
- El copywriter recibe el concepto del content-creator
- El video-producer recibe el guion del copywriter
- El brand-guardian valida TODO antes de la entrega final
- Si hay conflictos entre agentes, priorizá la voz de brand-guardian`,
  },
  {
    id: 'growth-squad',
    name: 'Growth Squad',
    description: 'Equipo dedicado a crecimiento: analiza datos, testea hipótesis, optimiza y escala.',
    agentIds: ['analytics-inspector', 'ab-test-manager', 'growth-hacker', 'community-manager', 'sales-closer'],
    coordinationPrompt: `Sos el líder del Growth Squad. Tu objetivo es hacer crecer la cuenta de forma sostenible usando datos y experimentación.

FLUJO DE TRABAJO:
1. analytics-inspector: Diagnosticar estado actual y detectar oportunidades
2. ab-test-manager: Diseñar experimentos para validar hipótesis de crecimiento
3. growth-hacker: Implementar tácticas de growth basadas en datos
4. community-manager: Convertir nuevos seguidores en comunidad leal
5. sales-closer: Monetizar engagement convertiendo leads en ventas

REGLAS:
- Todo debe basarse en datos, no en intuición
- Cada táctica de growth debe tener métricas de éxito definidas
- El community-manager debe nutrir a los nuevos seguidores dentro de las primeras 48hs
- El sales-closer solo actúa cuando un lead califica >70`,
  },
  {
    id: 'brand-war-room',
    name: 'Brand War Room',
    description:
      'Equipo de crisis y reputación. Activa cuando hay sentiment negativo, competencia agresiva, o crisis de marca.',
    agentIds: ['crisis-manager', 'reputation-guardian', 'pr-agent', 'brand-guardian', 'email-campaign-manager'],
    coordinationPrompt: `Sos el líder del Brand War Room. Tu objetivo es proteger y restaurar la reputación de la marca en situaciones de crisis.

FLUJO DE TRABAJO:
1. crisis-manager: Evaluar severidad y escala de la crisis
2. reputation-guardian: Monitorear sentiment y detectar amplificación
3. pr-agent: Preparar comunicación oficial y respuestas
4. brand-guardian: Asegurar que toda comunicación proteja la marca
5. email-campaign-manager: Notificar a stakeholders internos

REGLAS:
- Velocidad > perfección en las primeras 2 horas
- Nunca mintamos. Transparencia controlada.
- Toda comunicación pública debe ser aprobada por brand-guardian
- Si la crisis involucra a un cliente, sales-closer debe preparar retención
- Documentar TODO para lecciones aprendidas`,
  },
  {
    id: 'product-launch-unit',
    name: 'Product Launch Unit',
    description: 'Equipo especializado en lanzamientos: desde anuncio hasta conversión.',
    agentIds: [
      'content-creator',
      'video-producer',
      'copywriter',
      'ab-test-manager',
      'sales-closer',
      'email-campaign-manager',
    ],
    coordinationPrompt: `Sos el líder del Product Launch Unit. Tu objetivo es coordinar un lanzamiento de producto/servicio desde el anuncio hasta la primera venta.

FLUJO DE TRABAJO:
1. content-creator: Diseñar narrativa del lanzamiento (storytelling del producto)
2. video-producer: Crear reel de lanzamiento y assets visuales
3. copywriter: Escribir copy de ventas, landing, captions, CTAs
4. ab-test-manager: Testear mensajes y creatividades antes del lanzamiento
5. sales-closer: Preparar funnel y secuencia de ventas
6. email-campaign-manager: Notificar a lista de espera y stakeholders

REGLAS:
- El video-producer debe entregar el reel 48hs antes del lanzamiento
- El ab-test-manager debe validar el mensaje principal con al menos 100 impresiones
- El sales-closer debe tener el funnel listo antes de que el primer post salga
- Todo el equipo debe conocer la fecha y hora exacta del lanzamiento`,
  },
  {
    id: 'weekly-ops-crew',
    name: 'Weekly Ops Crew',
    description: 'Equipo de operaciones semanal: reporta, planifica, optimiza y comunica.',
    agentIds: [
      'analytics-inspector',
      'market-intelligence',
      'content-creator',
      'email-campaign-manager',
      'account-manager',
    ],
    coordinationPrompt: `Sos el líder del Weekly Ops Crew. Tu objetivo es ejecutar el ritual semanal de operaciones: analizar, planificar y comunicar.

FLUJO DE TRABAJO:
1. analytics-inspector: Generar reporte de métricas de la semana
2. market-intelligence: Actualizar inteligencia competitiva y de tendencias
3. content-creator: Planificar calendario de contenido para la próxima semana
4. email-campaign-manager: Enviar reporte ejecutivo a stakeholders
5. account-manager: Verificar salud de todas las cuentas gestionadas

REGLAS:
- El reporte debe salir los lunes antes de las 10am
- El calendario de contenido debe estar listo 72hs antes del lunes siguiente
- Si hay anomalías críticas, email-campaign-manager envía alerta inmediata
- account-manager debe detectar cuentas que necesiten atención especial`,
  },
];

export interface TeamRunResult {
  teamId: string;
  results: Array<{ agentId: string; agentName: string; summary: string; status: 'success' | 'failed' }>;
  overallStatus: 'success' | 'partial' | 'failed';
}

export const runAgentTeam = async (teamId: string, brand: BrandProfile, context?: string): Promise<TeamRunResult> => {
  const team = AGENT_TEAMS.find((t) => t.id === teamId);
  if (!team) throw new Error(`Team ${teamId} no encontrado`);

  log.info(`[Team] Ejecutando ${team.name} (${team.agentIds.length} agentes)`);

  const results: TeamRunResult['results'] = [];
  let overallStatus: TeamRunResult['overallStatus'] = 'success';

  // Ejecutar agentes en serie (cada uno recibe el contexto acumulado)
  let accumulatedContext = context ?? team.coordinationPrompt;

  for (const agentId of team.agentIds) {
    const agent = getAgent(agentId);
    if (!agent) {
      log.warn(`[Team] Agente ${agentId} no encontrado`);
      results.push({ agentId, agentName: '??', summary: 'Agente no encontrado', status: 'failed' });
      overallStatus = overallStatus === 'success' ? 'partial' : 'failed';
      continue;
    }

    const goal = `${accumulatedContext}\n\nTu tarea específica como ${agent.name}: ${
      team.coordinationPrompt
        .split('FLUJO DE TRABAJO:')[1]
        ?.split(agent.name + ':')[1]
        ?.split('\n')[0] ?? 'Contribuir al objetivo del equipo.'
    }`;

    try {
      const result = await runAgentTask(brand, agent, goal, `team-${teamId}-${Date.now()}`);
      results.push({ agentId, agentName: agent.name, summary: result.summary, status: 'success' });
      accumulatedContext += `\n\n[${agent.name}] ${result.summary}`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ agentId, agentName: agent.name, summary: msg, status: 'failed' });
      overallStatus = overallStatus === 'success' ? 'partial' : 'failed';
    }
  }

  log.info(`[Team] ${team.name} completado: ${overallStatus}`);
  return { teamId, results, overallStatus };
};

export const listTeams = (): AgentTeam[] => [...AGENT_TEAMS];

export const getTeam = (teamId: string): AgentTeam | undefined => AGENT_TEAMS.find((t) => t.id === teamId);
