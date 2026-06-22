export type AgentTypeCategory = 'simple_reflex' | 'model_based_reflex' | 'goal_based' | 'utility_based' | 'learning';

export interface AgentTypeDefinition {
  id: AgentTypeCategory;
  nombre: string;
  descripcion: string;
  caracteristicas: string[];
  casosDeUso: string[];
  limitaciones: string[];
}

/**
 * Clasificación técnica tradicional de agentes de IA según IBM (5 categorías).
 * Referencia: IBM Research — "Types of AI Agents"
 */
export const AGENT_TYPES: Record<AgentTypeCategory, AgentTypeDefinition> = {
  simple_reflex: {
    id: 'simple_reflex',
    nombre: 'Reflejo Simple',
    descripcion: 'Actúa únicamente bajo reglas predefinidas de "si ocurre X, haz Y", ignorando el historial pasado.',
    caracteristicas: [
      'Sin memoria de interacciones previas',
      'Reglas condition-action fijas e inmutables',
      'Respuesta determinista e inmediata',
      'Bajo costo computacional',
      'Fácil de auditar y predecir',
    ],
    casosDeUso: [
      'Moderación automática por palabras prohibidas',
      'Rate limiting por tipo de acción',
      'Alertas cuando una métrica supera un umbral fijo',
      'Filtros de contenido por categoría',
      'Validaciones de formato antes de publicar',
    ],
    limitaciones: [
      'No aprende ni mejora con el tiempo',
      'No puede manejar situaciones no previstas en las reglas',
      'Ignora el contexto histórico de una conversación',
    ],
  },

  model_based_reflex: {
    id: 'model_based_reflex',
    nombre: 'Reflejo Basado en Modelos',
    descripcion:
      'Mantiene un estado interno para seguir la pista de aspectos del entorno que no pueden ver directamente.',
    caracteristicas: [
      'Estado interno persistente entre interacciones',
      'Modelo del mundo actualizable en tiempo real',
      'Puede razonar sobre lo que no está directamente visible',
      'Memoria limitada de contexto reciente',
      'Combina percepción actual + modelo interno',
    ],
    casosDeUso: [
      'Seguimiento del historial de publicaciones y engagement',
      'Monitoreo de métricas con baseline acumulado',
      'Detección de anomalías respecto a patrones anteriores',
      'Bot conversacional con memoria de sesión',
      'Triage de DMs con historial del usuario',
    ],
    limitaciones: [
      'El modelo interno puede desactualizarse si el entorno cambia rápido',
      'Requiere más almacenamiento y procesamiento que reflejo simple',
    ],
  },

  goal_based: {
    id: 'goal_based',
    nombre: 'Basado en Objetivos',
    descripcion: 'Evalúa diferentes caminos de acción para elegir el que mejor ayude a cumplir la meta asignada.',
    caracteristicas: [
      'Planificación multi-paso antes de actuar',
      'Evaluación de alternativas contra la meta',
      'Orientado a metas explícitas y medibles',
      'Puede replanificar si el entorno cambia',
      'Razonamiento sobre consecuencias futuras',
    ],
    casosDeUso: [
      'Planificación de contenido semanal con coherencia narrativa',
      'Pipeline brief-to-publish con múltiples etapas',
      'Estrategia de crecimiento a 30/60/90 días',
      'Diseño de experimentos de growth con control/variante',
      'Orquestación de playbooks multi-agente',
    ],
    limitaciones: [
      'Computacionalmente más costoso que reflejo simple/modelo',
      'Requiere metas bien definidas para funcionar correctamente',
    ],
  },

  utility_based: {
    id: 'utility_based',
    nombre: 'Basado en Utilidad',
    descripcion: 'Mide el grado de "felicidad" o eficiencia de un resultado para optimizar su comportamiento.',
    caracteristicas: [
      'Función de utilidad/score definida y cuantificable',
      'Optimización multi-objetivo con trade-offs explícitos',
      'Selecciona la acción que maximiza el valor esperado',
      'Puede comparar alternativas con diferentes dimensiones',
      'Toma decisiones bajo incertidumbre',
    ],
    casosDeUso: [
      'Selección del mejor horario de publicación según engagement histórico',
      'Predicción de rendimiento de contenido (guardados/compartidos/alcance)',
      'A/B testing con scoring y selección de variante ganadora',
      'Selección de hashtags optimizando reach vs riesgo de shadowban',
      'Priorización de tareas según impacto en objetivos de negocio',
    ],
    limitaciones: [
      'La función de utilidad puede ser difícil de definir correctamente',
      'Puede optimizar métricas equivocadas si la función está mal calibrada',
    ],
  },

  learning: {
    id: 'learning',
    nombre: 'Agente de Aprendizaje',
    descripcion:
      'Se adapta y mejora con la experiencia mediante la retroalimentación continua de sus aciertos y errores.',
    caracteristicas: [
      'Retroalimentación continua que modifica el comportamiento',
      'Actualización de estrategias basada en resultados reales',
      'Mejora cuantificable con el tiempo',
      'Performance history como fuente de verdad',
      'Generalización de aprendizajes a situaciones nuevas',
    ],
    casosDeUso: [
      'Optimización de hooks según engagement real (guardados, comentarios)',
      'Ajuste dinámico de estrategia de hashtags por rendimiento',
      'Personalización de voz y tono según respuestas de la audiencia',
      'Adaptación del calendario de publicaciones a los picos de actividad reales',
      'Mejora iterativa del scoring de leads según conversiones',
    ],
    limitaciones: [
      'Requiere volumen de datos suficiente para aprender patrones útiles',
      'Puede aprender sesgos si los datos de entrenamiento están sesgados',
      'El ciclo de aprendizaje puede ser lento al inicio',
    ],
  },
};

export const getAgentType = (id: AgentTypeCategory): AgentTypeDefinition => AGENT_TYPES[id];

export const listAgentTypes = (): AgentTypeDefinition[] => Object.values(AGENT_TYPES);

export const describeAgentType = (id: AgentTypeCategory): string => {
  const t = AGENT_TYPES[id];
  return [
    `**${t.nombre}** (${t.id})`,
    `Descripción: ${t.descripcion}`,
    `Características: ${t.caracteristicas.join(' · ')}`,
    `Casos de uso en Instagram: ${t.casosDeUso.join(' · ')}`,
    `Limitaciones: ${t.limitaciones.join(' · ')}`,
  ].join('\n');
};

export const describeAllAgentTypes = (): string =>
  listAgentTypes()
    .map((t) => describeAgentType(t.id))
    .join('\n\n---\n\n');
