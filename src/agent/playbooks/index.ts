import type { PlaybookDefinition } from '../orchestrator.js';

export const PLAYBOOKS: PlaybookDefinition[] = [
  {
    id: 'viral-engine',
    name: 'Viral Engine',
    description: 'Detecta oportunidad de viralización → crea contenido → publica → impulsa → monetiza.',
    tasks: [
      { id: 've-1', agentId: 'trend-radar', goal: 'Detectar ángulo viral y tendencia actual en el nicho' },
      {
        id: 've-2',
        agentId: 'audience-dive',
        goal: 'Validar que el ángulo resuena con la audiencia objetivo',
        dependsOn: ['ve-1'],
      },
      {
        id: 've-3',
        agentId: 'viral-architect',
        goal: 'Diseñar fórmula viral para el ángulo detectado',
        dependsOn: ['ve-2'],
      },
      {
        id: 've-4',
        agentId: 'content-creator',
        goal: 'Generar reel/carrusel viral con guion detallado',
        dependsOn: ['ve-3'],
      },
      {
        id: 've-5',
        agentId: 'communicator',
        goal: 'Pulir copy, hooks y CTA del contenido generado',
        dependsOn: ['ve-4'],
      },
      { id: 've-6', agentId: 'good-person', goal: 'Validar ética y honestidad del contenido', dependsOn: ['ve-5'] },
      {
        id: 've-7',
        agentId: 'discipline',
        goal: 'Solicitar aprobación humana del contenido antes de publicar',
        dependsOn: ['ve-6'],
        checkpointType: 'publish',
        checkpointDescription: 'Aprobación del contenido viral antes de publicar',
      },
      { id: 've-8', agentId: 'algorithm-master', goal: 'Calcular timing óptimo de publicación', dependsOn: ['ve-7'] },
      {
        id: 've-9',
        agentId: 'community-manager',
        goal: 'Preparar respuestas rápidas para primeros comentarios post-publicación',
        dependsOn: ['ve-8'],
      },
      { id: 've-10', agentId: 'ad-agent', goal: 'Evaluar si amerita boost orgánico/pago', dependsOn: ['ve-9'] },
      {
        id: 've-11',
        agentId: 'sales-closer',
        goal: 'Preparar lead capture y funnel post-viral',
        dependsOn: ['ve-10'],
      },
    ],
  },
  {
    id: 'lead-to-sale',
    name: 'Lead Magnet to Sale',
    description: 'Convierte engagement en lead, lead en conversación, conversación en venta.',
    tasks: [
      {
        id: 'ls-1',
        agentId: 'content-creator',
        goal: 'Crear contenido de valor con CTA claro (ej: DM con palabra clave)',
      },
      { id: 'ls-2', agentId: 'communicator', goal: 'Pulir CTA y copy para maximizar respuestas', dependsOn: ['ls-1'] },
      {
        id: 'ls-3',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del contenido lead magnet',
        dependsOn: ['ls-2'],
        checkpointType: 'publish',
        checkpointDescription: 'Aprobar contenido lead magnet antes de publicar',
      },
      {
        id: 'ls-4',
        agentId: 'funnel-optimizer',
        goal: 'Configurar secuencia de nurturing para leads entrantes',
        dependsOn: ['ls-3'],
      },
      {
        id: 'ls-5',
        agentId: 'audience-dive',
        goal: 'Analizar quién respondió y extraer insights',
        dependsOn: ['ls-4'],
      },
      {
        id: 'ls-6',
        agentId: 'sales-closer',
        goal: 'Preparar propuesta personalizada cuando lead califica >70',
        dependsOn: ['ls-5'],
      },
      {
        id: 'ls-7',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de propuesta de venta',
        dependsOn: ['ls-6'],
        checkpointType: 'pricing_disclosure',
        checkpointDescription: 'Aprobar propuesta de venta antes de enviar al lead',
      },
      {
        id: 'ls-8',
        agentId: 'relationship-builder',
        goal: 'Mantener relación a largo plazo si no compra',
        dependsOn: ['ls-7'],
      },
    ],
  },
  {
    id: 'community-sprint',
    name: 'Community Sprint',
    description: '7 días de intensificación de comunidad y engagement.',
    tasks: [
      { id: 'cs-1', agentId: 'strategist', goal: 'Definir tema central de la semana y pilares' },
      { id: 'cs-2', agentId: 'story-arc', goal: 'Diseñar arco narrativo de 7 días', dependsOn: ['cs-1'] },
      {
        id: 'cs-3',
        agentId: 'community-manager',
        goal: 'Planificar interacciones diarias y respuestas',
        dependsOn: ['cs-2'],
      },
      { id: 'cs-4', agentId: 'content-creator', goal: 'Generar contenido diario para 7 días', dependsOn: ['cs-3'] },
      { id: 'cs-5', agentId: 'humor-engine', goal: 'Insertar momentos de humor y relatability', dependsOn: ['cs-4'] },
      {
        id: 'cs-6',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del plan semanal de community sprint',
        dependsOn: ['cs-5'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar plan semanal de community sprint',
      },
      {
        id: 'cs-7',
        agentId: 'retention-architect',
        goal: 'Proponer serie guardable para fin de semana',
        dependsOn: ['cs-6'],
      },
      { id: 'cs-8', agentId: 'audience-dive', goal: 'Reporte de insights de la semana', dependsOn: ['cs-7'] },
    ],
  },
  {
    id: 'crisis-to-opportunity',
    name: 'Crisis to Opportunity',
    description: 'Detecta crisis temprana → contiene → convierte en demostración de valores.',
    tasks: [
      { id: 'ct-1', agentId: 'crisis-manager', goal: 'Detectar pile-on o sentiment negativo crítico' },
      {
        id: 'ct-2',
        agentId: 'discipline',
        goal: 'Checkpoint inmediato: alerta humana de crisis',
        dependsOn: ['ct-1'],
        checkpointType: 'crisis_response',
        checkpointDescription: 'Alerta de crisis detectada — requiere atención inmediata',
      },
      { id: 'ct-3', agentId: 'pr-agent', goal: 'Preparar respuesta pública oficial', dependsOn: ['ct-2'] },
      {
        id: 'ct-4',
        agentId: 'good-person',
        goal: 'Validar que la respuesta sea genuina y no corporativa vacía',
        dependsOn: ['ct-3'],
      },
      {
        id: 'ct-5',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de respuesta pública',
        dependsOn: ['ct-4'],
        checkpointType: 'crisis_response',
        checkpointDescription: 'Aprobar respuesta pública antes de publicar',
      },
      {
        id: 'ct-6',
        agentId: 'community-manager',
        goal: 'Responder comentarios individuales con empatía',
        dependsOn: ['ct-5'],
      },
      {
        id: 'ct-7',
        agentId: 'content-creator',
        goal: 'Crear contenido de transparencia/aprendizaje',
        dependsOn: ['ct-6'],
      },
      {
        id: 'ct-8',
        agentId: 'relationship-builder',
        goal: 'Contactar directamente a los afectados más importantes',
        dependsOn: ['ct-7'],
      },
    ],
  },
  {
    id: 'autopilot-plus',
    name: 'Autopilot Semanal Plus',
    description: 'Semana completa planificada, creada y agenda automáticamente.',
    tasks: [
      { id: 'ap-1', agentId: 'strategist', goal: 'Analizar objetivos trimestrales y ajustar pilares' },
      { id: 'ap-2', agentId: 'audience-dive', goal: 'Revisar insights recientes de audiencia', dependsOn: ['ap-1'] },
      {
        id: 'ap-3',
        agentId: 'trend-radar',
        goal: 'Detectar tendencias y llenar backlog de ideas',
        dependsOn: ['ap-2'],
      },
      { id: 'ap-4', agentId: 'content-creator', goal: 'Generar 7 posts + stories diarias', dependsOn: ['ap-3'] },
      { id: 'ap-5', agentId: 'communicator', goal: 'Pulir todos los copies', dependsOn: ['ap-4'] },
      { id: 'ap-6', agentId: 'viral-architect', goal: 'Optimizar hooks virales', dependsOn: ['ap-5'] },
      { id: 'ap-7', agentId: 'retention-architect', goal: 'Optimizar retención y guardados', dependsOn: ['ap-6'] },
      { id: 'ap-8', agentId: 'good-person', goal: 'Validar ética de todo el contenido', dependsOn: ['ap-7'] },
      {
        id: 'ap-9',
        agentId: 'discipline',
        goal: 'Checkpoint: revisión humana del plan semanal completo',
        dependsOn: ['ap-8'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar plan semanal completo antes de agendar',
      },
      { id: 'ap-10', agentId: 'algorithm-master', goal: 'Calcular timing óptimo por pieza', dependsOn: ['ap-9'] },
      { id: 'ap-11', agentId: 'ad-agent', goal: 'Evaluar boost para posts clave', dependsOn: ['ap-10'] },
      { id: 'ap-12', agentId: 'discipline', goal: 'Agendar todo en scheduler y exportar iCal', dependsOn: ['ap-11'] },
    ],
  },
  {
    id: 'brand-kit-setup',
    name: 'Brand Kit Setup',
    description: 'Configura todo el kit de marca desde cero: bio, avatar, highlights, logo, watermark.',
    tasks: [
      {
        id: 'bks-1',
        agentId: 'brand-orchestrator',
        goal: 'Descomponer la configuración del Brand Kit en subtareas y coordinar el equipo',
      },
      { id: 'bks-2', agentId: 'bio-master', goal: 'Escribir y optimizar la bio del perfil', dependsOn: ['bks-1'] },
      {
        id: 'bks-3',
        agentId: 'avatar-designer',
        goal: 'Diseñar la foto de perfil optimizada para la marca',
        dependsOn: ['bks-1'],
      },
      {
        id: 'bks-4',
        agentId: 'highlight-designer',
        goal: 'Diseñar los covers de historias destacadas (mínimo 4)',
        dependsOn: ['bks-1'],
      },
      { id: 'bks-5', agentId: 'logo-keeper', goal: 'Crear y validar las variantes del logo', dependsOn: ['bks-1'] },
      {
        id: 'bks-6',
        agentId: 'watermark-designer',
        goal: 'Diseñar watermarks y firmas digitales',
        dependsOn: ['bks-1'],
      },
      {
        id: 'bks-7',
        agentId: 'brand-kit-guardian',
        goal: 'Auditar el Brand Kit completo y generar reporte de salud',
        dependsOn: ['bks-2', 'bks-3', 'bks-4', 'bks-5', 'bks-6'],
      },
      {
        id: 'bks-8',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación humana del Brand Kit completo',
        dependsOn: ['bks-7'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar Brand Kit completo antes de activar',
      },
    ],
  },
  {
    id: 'content-production-pipeline',
    name: 'Content Production Pipeline',
    description:
      'Pipeline de producción con gates de coherencia: estrategia → visual → copy → producción → voz → estética → auditoría.',
    tasks: [
      {
        id: 'cpp-1',
        agentId: 'brand-orchestrator',
        goal: 'Crear el Shared Production Context y descomponer la campaña en tareas',
      },
      {
        id: 'cpp-2',
        agentId: 'content-strategist-emprendedor',
        goal: 'Definir estrategia de contenido para la campaña',
        dependsOn: ['cpp-1'],
      },
      {
        id: 'cpp-3',
        agentId: 'visual-director',
        goal: 'Definir dirección visual y assets necesarios',
        dependsOn: ['cpp-2'],
      },
      {
        id: 'cpp-4',
        agentId: 'copywriter-emprendedor',
        goal: 'Escribir copy, captions, hooks y CTAs',
        dependsOn: ['cpp-3'],
      },
      {
        id: 'cpp-5',
        agentId: 'reels-creator-emprendedor',
        goal: 'Producir reels según dirección visual y copy',
        dependsOn: ['cpp-4'],
      },
      {
        id: 'cpp-6',
        agentId: 'carrusel-designer-emprendedor',
        goal: 'Producir carruseles según dirección visual y copy',
        dependsOn: ['cpp-4'],
      },
      {
        id: 'cpp-7',
        agentId: 'voice-keeper',
        goal: 'Auditar que todo copy respete el tono de marca',
        dependsOn: ['cpp-5', 'cpp-6'],
      },
      {
        id: 'cpp-8',
        agentId: 'aesthetic-judge',
        goal: 'Auditar coherencia visual de todas las piezas',
        dependsOn: ['cpp-7'],
      },
      {
        id: 'cpp-9',
        agentId: 'content-auditor',
        goal: 'Auditoría final: brand consistency + safety + ethics + compliance',
        dependsOn: ['cpp-8'],
        checkpointType: 'publish',
        checkpointDescription: 'Aprobación final del contenido antes de publicar',
      },
    ],
  },
  {
    id: 'profile-refresh',
    name: 'Profile Refresh',
    description:
      'Renueva el perfil completo: bio, foto, highlights, y planifica las primeras 9 publicaciones para coherencia de grilla.',
    tasks: [
      { id: 'pr-1', agentId: 'brand-orchestrator', goal: 'Coordinar la renovación completa del perfil' },
      { id: 'pr-2', agentId: 'bio-master', goal: 'Reescribir la bio con mensaje actualizado', dependsOn: ['pr-1'] },
      { id: 'pr-3', agentId: 'avatar-designer', goal: 'Diseñar nueva foto de perfil', dependsOn: ['pr-1'] },
      { id: 'pr-4', agentId: 'highlight-designer', goal: 'Rediseñar covers de highlights', dependsOn: ['pr-1'] },
      {
        id: 'pr-5',
        agentId: 'feed-planner',
        goal: 'Planificar las primeras 9 publicaciones para coherencia de grilla',
        dependsOn: ['pr-2', 'pr-3', 'pr-4'],
      },
      {
        id: 'pr-6',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de la renovación de perfil',
        dependsOn: ['pr-5'],
        checkpointType: 'cambiar_estética',
        checkpointDescription: 'Aprobar cambios de imagen del perfil',
      },
    ],
  },
  {
    id: 'brand-strategy-workshop',
    name: 'Brand Strategy Workshop',
    description: 'Define visión, misión, valores, posicionamiento, promesa, arquetipo y personalidad de marca.',
    tasks: [
      { id: 'bsw-1', agentId: 'brand-strategist', goal: 'Definir visión, misión y valores de marca' },
      {
        id: 'bsw-2',
        agentId: 'brand-differentiation-analyst',
        goal: 'Analizar diferenciación vs competidores y definir posicionamiento',
        dependsOn: ['bsw-1'],
      },
      {
        id: 'bsw-3',
        agentId: 'brand-personality-designer',
        goal: 'Definir arquetipo y rasgos de personalidad',
        dependsOn: ['bsw-2'],
      },
      {
        id: 'bsw-4',
        agentId: 'brand-storyteller-strategic',
        goal: 'Construir origin story y narrativa de marca',
        dependsOn: ['bsw-3'],
      },
      {
        id: 'bsw-5',
        agentId: 'brand-experience-designer',
        goal: 'Definir principios de experiencia del cliente',
        dependsOn: ['bsw-4'],
      },
      {
        id: 'bsw-6',
        agentId: 'brand-promise-keeper',
        goal: 'Definir promesa de valor verificable',
        dependsOn: ['bsw-5'],
      },
      {
        id: 'bsw-7',
        agentId: 'naming-specialist',
        goal: 'Revisar nombre, tagline y nomenclatura',
        dependsOn: ['bsw-6'],
      },
      { id: 'bsw-8', agentId: 'brand-rule-engineer', goal: 'Crear reglas de branding iniciales', dependsOn: ['bsw-7'] },
      {
        id: 'bsw-9',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de la estrategia de marca completa',
        dependsOn: ['bsw-8'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar estrategia de marca completa',
      },
    ],
  },
  {
    id: 'brand-audit-complete',
    name: 'Brand Audit Complete',
    description: 'Audita marca completa: visual, voz, estrategia, experiencia, assets, y reglas.',
    tasks: [
      { id: 'bac-1', agentId: 'brand-kit-guardian', goal: 'Auditar salud del Brand Kit' },
      { id: 'bac-2', agentId: 'brand-health-tracker', goal: 'Generar reporte de salud de marca', dependsOn: ['bac-1'] },
      {
        id: 'bac-3',
        agentId: 'voice-keeper',
        goal: 'Auditar coherencia de voz en últimos 20 posts',
        dependsOn: ['bac-2'],
      },
      { id: 'bac-4', agentId: 'brand-guardian', goal: 'Ejecutar Brand Rule Engine completo', dependsOn: ['bac-3'] },
      {
        id: 'bac-5',
        agentId: 'competitive-brand-auditor',
        goal: 'Auditar 3 competidores principales',
        dependsOn: ['bac-4'],
      },
      {
        id: 'bac-6',
        agentId: 'brand-metrics-analyst',
        goal: 'Analizar métricas de percepción de marca',
        dependsOn: ['bac-5'],
      },
      { id: 'bac-7', agentId: 'brand-strategist', goal: 'Recomendar acciones estratégicas', dependsOn: ['bac-6'] },
      {
        id: 'bac-8',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de acciones correctivas',
        dependsOn: ['bac-7'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar acciones correctivas del brand audit',
      },
    ],
  },
  {
    id: 'competitive-brand-analysis',
    name: 'Competitive Brand Analysis',
    description: 'Analiza 5 competidores en profundidad: identidad, posicionamiento, storytelling, debilidades.',
    tasks: [
      {
        id: 'cba-1',
        agentId: 'competitive-brand-auditor',
        goal: 'Identificar 5 competidores principales y auditar su identidad visual',
      },
      {
        id: 'cba-2',
        agentId: 'brand-differentiation-analyst',
        goal: 'Analizar posicionamiento de cada competidor vs nuestra marca',
        dependsOn: ['cba-1'],
      },
      {
        id: 'cba-3',
        agentId: 'brand-storyteller-strategic',
        goal: 'Analizar storytelling y narrativa de cada competidor',
        dependsOn: ['cba-2'],
      },
      {
        id: 'cba-4',
        agentId: 'brand-experience-designer',
        goal: 'Auditar experiencia del cliente de cada competidor',
        dependsOn: ['cba-3'],
      },
      {
        id: 'cba-5',
        agentId: 'brand-strategist',
        goal: 'Sintetizar hallazgos y proponer tácticas de diferenciación',
        dependsOn: ['cba-4'],
      },
      {
        id: 'cba-6',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de tácticas competitivas',
        dependsOn: ['cba-5'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar tácticas de diferenciación competitiva',
      },
    ],
  },
  {
    id: 'brand-evolution',
    name: 'Brand Evolution',
    description: 'Gestiona transición o evolución de marca sin perder coherencia ni confundir a la audiencia.',
    tasks: [
      { id: 'be-1', agentId: 'brand-evolution-manager', goal: 'Planificar fases de transición de marca' },
      {
        id: 'be-2',
        agentId: 'brand-strategist',
        goal: 'Definir nueva estrategia manteniendo elementos valiosos',
        dependsOn: ['be-1'],
      },
      {
        id: 'be-3',
        agentId: 'brand-personality-designer',
        goal: 'Definir evolución de personalidad y arquetipo',
        dependsOn: ['be-2'],
      },
      {
        id: 'be-4',
        agentId: 'brand-kit-guardian',
        goal: 'Auditar qué assets se mantienen, cuáles se actualizan',
        dependsOn: ['be-3'],
      },
      {
        id: 'be-5',
        agentId: 'stakeholder-aligner',
        goal: 'Crear plan de comunicación interna y externa',
        dependsOn: ['be-4'],
      },
      {
        id: 'be-6',
        agentId: 'brand-rule-engineer',
        goal: 'Actualizar reglas de branding para la nueva era',
        dependsOn: ['be-5'],
      },
      {
        id: 'be-7',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del plan de evolución',
        dependsOn: ['be-6'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar plan de evolución de marca',
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NUEVOS PLAYBOOKS — Usan los 6 agentes de integración
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: 'video-dominance',
    name: 'Video Dominance Pipeline',
    description:
      'Investiga tendencias → diseña reel → genera video → A/B test → publica → analiza. Pipeline completo de video.',
    tasks: [
      {
        id: 'vd-1',
        agentId: 'market-intelligence',
        goal: 'Scoutear tendencias virales en el nicho y detectar ángulos de reel con potencial',
      },
      {
        id: 'vd-2',
        agentId: 'content-creator',
        goal: 'Diseñar script de reel con hook potente basado en tendencias detectadas',
        dependsOn: ['vd-1'],
      },
      {
        id: 'vd-3',
        agentId: 'video-producer',
        goal: 'Generar reel completo: imágenes, renderizado, caption y hashtags',
        dependsOn: ['vd-2'],
      },
      {
        id: 'vd-4',
        agentId: 'brand-guardian',
        goal: 'Validar que el reel cumple todas las reglas de branding',
        dependsOn: ['vd-3'],
      },
      {
        id: 'vd-5',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del reel antes de publicar',
        dependsOn: ['vd-4'],
        checkpointType: 'publish',
        checkpointDescription: 'Aprobar reel generado antes de publicar',
      },
      {
        id: 'vd-6',
        agentId: 'ab-test-manager',
        goal: 'Diseñar variante A/B del hook o CTA para testear en próximo reel',
        dependsOn: ['vd-5'],
      },
      {
        id: 'vd-7',
        agentId: 'algorithm-master',
        goal: 'Calcular timing óptimo de publicación para máximo alcance',
        dependsOn: ['vd-5'],
      },
      {
        id: 'vd-8',
        agentId: 'analytics-inspector',
        goal: 'Preparar dashboard de métricas para medir performance del reel',
        dependsOn: ['vd-7'],
      },
      {
        id: 'vd-9',
        agentId: 'community-manager',
        goal: 'Preparar respuestas para primeros comentarios del reel',
        dependsOn: ['vd-7'],
      },
    ],
  },

  {
    id: 'data-driven-optimization',
    name: 'Data-Driven Optimization',
    description:
      'Analiza métricas → detecta anomalías → diseña A/B test → implementa → mide → itera. Ciclo de mejora continua.',
    tasks: [
      {
        id: 'ddo-1',
        agentId: 'analytics-inspector',
        goal: 'Analizar métricas de los últimos 30 días: identificar top performers y underperformers',
      },
      {
        id: 'ddo-2',
        agentId: 'analytics-inspector',
        goal: 'Detectar anomalías y patrones (mejor horario, formato, longitud)',
        dependsOn: ['ddo-1'],
      },
      {
        id: 'ddo-3',
        agentId: 'market-intelligence',
        goal: 'Comparar performance vs competidores principales',
        dependsOn: ['ddo-2'],
      },
      {
        id: 'ddo-4',
        agentId: 'ab-test-manager',
        goal: 'Diseñar 2 experimentos A/B basados en insights del análisis',
        dependsOn: ['ddo-3'],
      },
      {
        id: 'ddo-5',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación de experimentos A/B',
        dependsOn: ['ddo-4'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar diseño de experimentos A/B',
      },
      {
        id: 'ddo-6',
        agentId: 'content-creator',
        goal: 'Generar contenido para las variantes A/B aprobadas',
        dependsOn: ['ddo-5'],
      },
      {
        id: 'ddo-7',
        agentId: 'ab-test-manager',
        goal: 'Publicar variantes y monitorear métricas iniciales',
        dependsOn: ['ddo-6'],
      },
      {
        id: 'ddo-8',
        agentId: 'email-campaign-manager',
        goal: 'Enviar reporte de insights y experimentos a stakeholders',
        dependsOn: ['ddo-7'],
      },
    ],
  },

  {
    id: 'competitive-intelligence-sprint',
    name: 'Competitive Intelligence Sprint',
    description: 'Monitorea competidores → analiza gaps → crea contenido diferenciado → publica. Sprint de 3 días.',
    tasks: [
      {
        id: 'cis-1',
        agentId: 'market-intelligence',
        goal: 'Trackear 3-5 competidores principales: followers, engagement, top posts, hashtags',
      },
      {
        id: 'cis-2',
        agentId: 'analytics-inspector',
        goal: 'Comparar nuestro performance vs competidores (benchmarking)',
        dependsOn: ['cis-1'],
      },
      {
        id: 'cis-3',
        agentId: 'brand-differentiation-analyst',
        goal: 'Identificar gaps de contenido: qué hacen los competidores que nosotros no',
        dependsOn: ['cis-2'],
      },
      {
        id: 'cis-4',
        agentId: 'content-creator',
        goal: 'Diseñar 3 piezas de contenido que cubran los gaps identificados',
        dependsOn: ['cis-3'],
      },
      {
        id: 'cis-5',
        agentId: 'brand-storyteller-strategic',
        goal: 'Crear ángulo narrativo que diferencie claramente de competidores',
        dependsOn: ['cis-4'],
      },
      {
        id: 'cis-6',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del contenido diferenciado',
        dependsOn: ['cis-5'],
        checkpointType: 'publish',
        checkpointDescription: 'Aprobar contenido diferenciado antes de publicar',
      },
      {
        id: 'cis-7',
        agentId: 'ab-test-manager',
        goal: 'Diseñar test para validar que el nuevo ángulo resuena mejor',
        dependsOn: ['cis-6'],
      },
      {
        id: 'cis-8',
        agentId: 'market-intelligence',
        goal: 'Configurar monitoreo continuo de competidores (alertas semanales)',
        dependsOn: ['cis-7'],
      },
    ],
  },

  {
    id: 'automated-reporting',
    name: 'Automated Reporting',
    description:
      'Genera reportes automáticos de analytics → envía por email → alerta anomalías. Ejecutar semanalmente.',
    tasks: [
      { id: 'ar-1', agentId: 'analytics-inspector', goal: 'Generar snapshot completo de métricas de la semana' },
      {
        id: 'ar-2',
        agentId: 'analytics-inspector',
        goal: 'Detectar anomalías y cambios significativos (>20% vs semana anterior)',
        dependsOn: ['ar-1'],
      },
      {
        id: 'ar-3',
        agentId: 'analytics-inspector',
        goal: 'Identificar top 3 posts y analizar qué tuvieron en común',
        dependsOn: ['ar-1'],
      },
      {
        id: 'ar-4',
        agentId: 'analytics-inspector',
        goal: 'Identificar bottom 3 posts y diagnosticar causas',
        dependsOn: ['ar-1'],
      },
      {
        id: 'ar-5',
        agentId: 'email-campaign-manager',
        goal: 'Enviar reporte ejecutivo semanal por email a stakeholders',
        dependsOn: ['ar-2', 'ar-3', 'ar-4'],
      },
      {
        id: 'ar-6',
        agentId: 'email-campaign-manager',
        goal: 'Si hay anomalías críticas, enviar alerta inmediata',
        dependsOn: ['ar-5'],
      },
      {
        id: 'ar-7',
        agentId: 'ab-test-manager',
        goal: 'Revisar experimentos en curso y reportar estado',
        dependsOn: ['ar-1'],
      },
    ],
  },

  {
    id: 'multi-account-launch',
    name: 'Multi-Account Launch',
    description: 'Onboarding completo de una nueva marca/cuenta: setup, brand kit, estrategia y primer contenido.',
    tasks: [
      {
        id: 'mal-1',
        agentId: 'account-manager',
        goal: 'Verificar que la nueva cuenta esté configurada en data/brands/ y sincronizada a SQLite',
      },
      {
        id: 'mal-2',
        agentId: 'brand-strategist',
        goal: 'Definir estrategia de marca para la nueva cuenta (visión, misión, valores, posicionamiento)',
        dependsOn: ['mal-1'],
      },
      {
        id: 'mal-3',
        agentId: 'brand-kit-guardian',
        goal: 'Crear Brand Kit inicial: logo, paleta, tipografía, avatar, highlight covers',
        dependsOn: ['mal-2'],
      },
      {
        id: 'mal-4',
        agentId: 'market-intelligence',
        goal: 'Analizar competidores del nuevo nicho y detectar oportunidades',
        dependsOn: ['mal-2'],
      },
      {
        id: 'mal-5',
        agentId: 'content-creator',
        goal: 'Generar 5 piezas de contenido seed para lanzamiento (mix de formatos)',
        dependsOn: ['mal-3', 'mal-4'],
      },
      {
        id: 'mal-6',
        agentId: 'brand-guardian',
        goal: 'Validar que todo el contenido cumple reglas de branding',
        dependsOn: ['mal-5'],
      },
      {
        id: 'mal-7',
        agentId: 'discipline',
        goal: 'Checkpoint: aprobación del lanzamiento',
        dependsOn: ['mal-6'],
        checkpointType: 'strategy_change',
        checkpointDescription: 'Aprobar contenido y estrategia de lanzamiento de nueva cuenta',
      },
      {
        id: 'mal-8',
        agentId: 'content-creator',
        goal: 'Programar calendario de publicación para las primeras 2 semanas',
        dependsOn: ['mal-7'],
      },
      {
        id: 'mal-9',
        agentId: 'email-campaign-manager',
        goal: 'Notificar a stakeholders que la cuenta está lista para lanzar',
        dependsOn: ['mal-8'],
      },
    ],
  },

  // ── Playbooks end-to-end Sprint 2 ─────────────────────────────────

  {
    id: 'canva-to-instagram',
    name: 'Canva → Instagram Pipeline',
    description: 'Diseña en Canva → exporta → publica en Instagram con la mejor vía.',
    tasks: [
      {
        id: 'cti-1',
        agentId: 'market-intelligence',
        goal: 'Detectar tendencia actual en el nicho para el diseño',
        dependsOn: [],
      },
      {
        id: 'cti-2',
        agentId: 'content-creator',
        goal: 'Escribir caption y hooks para el post basado en la tendencia',
        dependsOn: ['cti-1'],
      },
      {
        id: 'cti-3',
        agentId: 'canva-operator',
        goal: 'Crear diseño en Canva: elegir formato Instagram Post, aplicar brand kit, editar textos',
        dependsOn: ['cti-2'],
      },
      { id: 'cti-4', agentId: 'canva-operator', goal: 'Exportar diseño en PNG de alta calidad', dependsOn: ['cti-3'] },
      {
        id: 'cti-5',
        agentId: 'instagram-publisher',
        goal: 'Publicar el diseño exportado en Instagram con el caption generado',
        dependsOn: ['cti-4'],
      },
    ],
  },

  {
    id: 'ai-video-to-reel',
    name: 'AI Video → Reel Pipeline',
    description: 'Genera video con IA (Runway/HeyGen) → edita en CapCut → publica como Reel.',
    tasks: [
      {
        id: 'avr-1',
        agentId: 'market-intelligence',
        goal: 'Detectar audio/trending topic para el reel',
        dependsOn: [],
      },
      {
        id: 'avr-2',
        agentId: 'content-creator',
        goal: 'Escribir script viral de 15-30 segundos con hook potente',
        dependsOn: ['avr-1'],
      },
      {
        id: 'avr-3',
        agentId: 'video-generation-operator',
        goal: 'Generar video con IA: elegir Runway (escenas) o HeyGen (avatar) según el script',
        dependsOn: ['avr-2'],
      },
      {
        id: 'avr-4',
        agentId: 'capcut-operator',
        goal: 'Editar video en CapCut: agregar captions automáticos, música trending, transiciones',
        dependsOn: ['avr-3'],
      },
      { id: 'avr-5', agentId: 'capcut-operator', goal: 'Exportar reel en 1080p MP4', dependsOn: ['avr-4'] },
      {
        id: 'avr-6',
        agentId: 'instagram-publisher',
        goal: 'Publicar reel en Instagram con caption optimizado',
        dependsOn: ['avr-5'],
      },
    ],
  },

  // ── Playbooks end-to-end Sprint 3 ─────────────────────────────────

  {
    id: 'post-engagement-loop',
    name: 'Post-Engagement Loop',
    description: 'Monitorea comentarios de un post → responde → triagea DMs → califica leads → sincroniza CRM.',
    tasks: [
      {
        id: 'pel-1',
        agentId: 'community-manager',
        goal: 'Revisar comentarios del post en las primeras 2 horas y responder los prioritarios',
        dependsOn: [],
      },
      {
        id: 'pel-2',
        agentId: 'dm-operator',
        goal: 'Triagear DMs recibidos tras la publicación y clasificar por categoría',
        dependsOn: ['pel-1'],
      },
      {
        id: 'pel-3',
        agentId: 'dm-operator',
        goal: 'Calificar leads detectados en el triage con score 0-100',
        dependsOn: ['pel-2'],
      },
      { id: 'pel-4', agentId: 'dm-operator', goal: 'Sincronizar leads calificados (>60) al CRM', dependsOn: ['pel-3'] },
      {
        id: 'pel-5',
        agentId: 'community-manager',
        goal: 'Ejecutar beacon engagement con 3-5 cuentas faro del nicho',
        dependsOn: ['pel-4'],
      },
      {
        id: 'pel-6',
        agentId: 'analytics-inspector',
        goal: 'Registrar métricas del post en performance DB para aprendizaje',
        dependsOn: ['pel-5'],
      },
    ],
  },

  {
    id: 'weekly-performance-review',
    name: 'Weekly Performance Review',
    description: 'Lee insights → detecta anomalías → genera reporte semanal accionable → propone ajustes.',
    tasks: [
      {
        id: 'wpr-1',
        agentId: 'analytics-inspector',
        goal: 'Construir snapshot de performance de los últimos 7 días',
        dependsOn: [],
      },
      {
        id: 'wpr-2',
        agentId: 'analytics-inspector',
        goal: 'Detectar anomalías en el snapshot (pérdida de followers, bajo reach, posts bajo benchmark)',
        dependsOn: ['wpr-1'],
      },
      {
        id: 'wpr-3',
        agentId: 'analytics-inspector',
        goal: 'Generar reporte semanal ejecutivo con victorias, patrones y experimentos propuestos',
        dependsOn: ['wpr-2'],
      },
      {
        id: 'wpr-4',
        agentId: 'analytics-inspector',
        goal: 'Extraer patrones de performance: top topics, hooks ganadores, mejores formatos, hashtags',
        dependsOn: ['wpr-3'],
      },
      {
        id: 'wpr-5',
        agentId: 'strategist',
        goal: 'Proponer ajustes de estrategia para la semana próxima basados en el reporte',
        dependsOn: ['wpr-4'],
      },
    ],
  },

  {
    id: 'full-autopilot-week',
    name: 'Full Autopilot Week',
    description: 'Pipeline completo: planificación → creación → publicación → engagement → análisis → optimización.',
    tasks: [
      {
        id: 'faw-1',
        agentId: 'autopilot-orchestrator',
        goal: 'Planificar contenido de la semana: 5 posts, 3 reels, 7 stories',
        dependsOn: [],
      },
      {
        id: 'faw-2',
        agentId: 'content-creator',
        goal: 'Generar captions, hooks y scripts para todo el contenido planificado',
        dependsOn: ['faw-1'],
      },
      {
        id: 'faw-3',
        agentId: 'canva-operator',
        goal: 'Crear diseños para posts y stories de la semana',
        dependsOn: ['faw-2'],
      },
      {
        id: 'faw-4',
        agentId: 'video-generation-operator',
        goal: 'Generar videos para reels de la semana (Runway o HeyGen)',
        dependsOn: ['faw-2'],
      },
      {
        id: 'faw-5',
        agentId: 'instagram-publisher',
        goal: 'Publicar todo el contenido según el calendario óptimo',
        dependsOn: ['faw-3', 'faw-4'],
      },
      {
        id: 'faw-6',
        agentId: 'community-manager',
        goal: 'Ejecutar engagement loop para cada publicación (comentarios, DMs, beacon)',
        dependsOn: ['faw-5'],
      },
      {
        id: 'faw-7',
        agentId: 'analytics-inspector',
        goal: 'Analizar performance de la semana y generar reporte',
        dependsOn: ['faw-6'],
      },
      {
        id: 'faw-8',
        agentId: 'autopilot-orchestrator',
        goal: 'Optimizar plan de la semana siguiente basado en insights',
        dependsOn: ['faw-7'],
      },
    ],
  },

  // ── Playbooks end-to-end Sprint 4 ─────────────────────────────────

  {
    id: 'instagram-to-everywhere',
    name: 'Instagram → Everywhere',
    description: 'Toma un post de Instagram → repurposea → publica en TikTok, YouTube Shorts, LinkedIn y X.',
    tasks: [
      {
        id: 'ite-1',
        agentId: 'repurposing-specialist',
        goal: 'Analizar el post original y elegir las plataformas destino más adecuadas',
        dependsOn: [],
      },
      {
        id: 'ite-2',
        agentId: 'repurposing-specialist',
        goal: 'Adaptar caption y hashtags para TikTok',
        dependsOn: ['ite-1'],
      },
      {
        id: 'ite-3',
        agentId: 'repurposing-specialist',
        goal: 'Adaptar caption y hashtags para YouTube Shorts',
        dependsOn: ['ite-1'],
      },
      {
        id: 'ite-4',
        agentId: 'repurposing-specialist',
        goal: 'Adaptar caption y hashtags para LinkedIn',
        dependsOn: ['ite-1'],
      },
      {
        id: 'ite-5',
        agentId: 'repurposing-specialist',
        goal: 'Adaptar caption y hashtags para X (Twitter)',
        dependsOn: ['ite-1'],
      },
      {
        id: 'ite-6',
        agentId: 'multi-platform-publisher',
        goal: 'Publicar en TikTok si el contenido es video',
        dependsOn: ['ite-2'],
      },
      {
        id: 'ite-7',
        agentId: 'multi-platform-publisher',
        goal: 'Publicar en YouTube Shorts si el contenido es video',
        dependsOn: ['ite-3'],
      },
      { id: 'ite-8', agentId: 'multi-platform-publisher', goal: 'Publicar en LinkedIn', dependsOn: ['ite-4'] },
      { id: 'ite-9', agentId: 'multi-platform-publisher', goal: 'Publicar en X', dependsOn: ['ite-5'] },
      {
        id: 'ite-10',
        agentId: 'multi-platform-publisher',
        goal: 'Verificar estado de todas las publicaciones y reportar URLs',
        dependsOn: ['ite-6', 'ite-7', 'ite-8', 'ite-9'],
      },
    ],
  },

  {
    id: 'daily-repurpose-queue',
    name: 'Daily Repurpose Queue',
    description: 'Procesa el mejor contenido del día anterior y lo repurposea para otras plataformas.',
    tasks: [
      {
        id: 'drq-1',
        agentId: 'analytics-inspector',
        goal: 'Identificar el top performer del día anterior desde performance DB',
        dependsOn: [],
      },
      {
        id: 'drq-2',
        agentId: 'repurposing-specialist',
        goal: 'Analizar el top performer y decidir en qué plataformas repurposearlo',
        dependsOn: ['drq-1'],
      },
      {
        id: 'drq-3',
        agentId: 'repurposing-specialist',
        goal: 'Generar versiones adaptadas para cada plataforma destino',
        dependsOn: ['drq-2'],
      },
      {
        id: 'drq-4',
        agentId: 'multi-platform-publisher',
        goal: 'Validar y publicar cada versión en su plataforma correspondiente',
        dependsOn: ['drq-3'],
      },
      {
        id: 'drq-5',
        agentId: 'analytics-inspector',
        goal: 'Registrar las publicaciones multiplataforma para tracking de ROI',
        dependsOn: ['drq-4'],
      },
    ],
  },

  // ── Playbooks end-to-end Sprint 5 ─────────────────────────────────

  {
    id: 'smart-boost-loop',
    name: 'Smart Boost Loop',
    description: 'Detecta top performer → evalúa si amerita boost → crea campaña → monitorea → optimiza o pausa.',
    tasks: [
      {
        id: 'sbl-1',
        agentId: 'analytics-inspector',
        goal: 'Identificar el top performer de los últimos 7 días desde performance DB',
        dependsOn: [],
      },
      {
        id: 'sbl-2',
        agentId: 'analytics-inspector',
        goal: 'Evaluar si el post merece boost: score > 70, engagement > 5%, formato adecuado',
        dependsOn: ['sbl-1'],
      },
      {
        id: 'sbl-3',
        agentId: 'paid-media-manager',
        goal: 'Crear campaña de boost con presupuesto y duración optimizados',
        dependsOn: ['sbl-2'],
      },
      {
        id: 'sbl-4',
        agentId: 'paid-media-manager',
        goal: 'Monitorear ROAS y métricas de la campaña diariamente',
        dependsOn: ['sbl-3'],
      },
      {
        id: 'sbl-5',
        agentId: 'paid-media-manager',
        goal: 'Optimizar presupuesto o pausar campaña según performance',
        dependsOn: ['sbl-4'],
      },
      {
        id: 'sbl-6',
        agentId: 'analytics-inspector',
        goal: 'Registrar resultados del boost para aprendizaje futuro',
        dependsOn: ['sbl-5'],
      },
    ],
  },

  {
    id: 'paid-media-weekly-review',
    name: 'Paid Media Weekly Review',
    description: 'Revisa todas las campañas activas → evalúa ROAS → ajusta presupuestos → propone optimizaciones.',
    tasks: [
      {
        id: 'pmwr-1',
        agentId: 'paid-media-manager',
        goal: 'Listar todas las campañas activas y sus métricas',
        dependsOn: [],
      },
      {
        id: 'pmwr-2',
        agentId: 'paid-media-manager',
        goal: 'Obtener insights detallados de cada campaña (CPM, CPC, CTR, ROAS)',
        dependsOn: ['pmwr-1'],
      },
      {
        id: 'pmwr-3',
        agentId: 'paid-media-manager',
        goal: 'Optimizar presupuestos de campañas con ROAS > 2.0',
        dependsOn: ['pmwr-2'],
      },
      {
        id: 'pmwr-4',
        agentId: 'paid-media-manager',
        goal: 'Pausar campañas con ROAS < 1.5 por más de 3 días',
        dependsOn: ['pmwr-2'],
      },
      {
        id: 'pmwr-5',
        agentId: 'growth-experimenter',
        goal: 'Proponer 2-3 experimentos A/B para mejorar ROAS de campañas activas',
        dependsOn: ['pmwr-3', 'pmwr-4'],
      },
      {
        id: 'pmwr-6',
        agentId: 'analytics-inspector',
        goal: 'Generar reporte semanal de paid media con aprendizajes y próximos pasos',
        dependsOn: ['pmwr-5'],
      },
    ],
  },

  // ── Playbooks Sprint 6: TikTok Native + Audio AI ────────────────────

  {
    id: 'tiktok-viral-factory',
    name: 'TikTok Viral Factory',
    description:
      'Detecta trends → elige template → genera script → produce video con audio AI → optimiza para FYP → publica.',
    tasks: [
      {
        id: 'tvf-1',
        agentId: 'tiktok-native-specialist',
        goal: 'Detectar trending sounds, hashtags y challenges de los últimos 24h',
        dependsOn: [],
      },
      {
        id: 'tvf-2',
        agentId: 'tiktok-native-specialist',
        goal: 'Elegir el trend más relevante para el nicho y recomendar ángulo de contenido',
        dependsOn: ['tvf-1'],
      },
      {
        id: 'tvf-3',
        agentId: 'tiktok-native-specialist',
        goal: 'Seleccionar template nativo de TikTok y generar blueprint de video',
        dependsOn: ['tvf-2'],
      },
      {
        id: 'tvf-4',
        agentId: 'sound-curator',
        goal: 'Curar sound trending y generar sync points/EDL para edición',
        dependsOn: ['tvf-2'],
      },
      {
        id: 'tvf-5',
        agentId: 'audio-producer',
        goal: 'Generar música AI y SFX para el video según recipe de sound design',
        dependsOn: ['tvf-4'],
      },
      {
        id: 'tvf-6',
        agentId: 'video-producer',
        goal: 'Producir video TikTok siguiendo blueprint con fast cuts y text-on-screen',
        dependsOn: ['tvf-3', 'tvf-5'],
      },
      {
        id: 'tvf-7',
        agentId: 'tiktok-native-specialist',
        goal: 'Calcular FYP score estimado y generar plan de optimización',
        dependsOn: ['tvf-6'],
      },
      {
        id: 'tvf-8',
        agentId: 'multi-platform-publisher',
        goal: 'Publicar en TikTok con hashtags optimizados y duet/stitch habilitado',
        dependsOn: ['tvf-7'],
      },
    ],
  },

  {
    id: 'audio-production-pipeline',
    name: 'Audio Production Pipeline',
    description: 'Genera audio completo para un video: música AI + voiceover + SFX + mix final.',
    tasks: [
      {
        id: 'app-1',
        agentId: 'voice-brand-manager',
        goal: 'Verificar voz de marca disponible o clonar si es necesario',
        dependsOn: [],
      },
      {
        id: 'app-2',
        agentId: 'audio-producer',
        goal: 'Generar música AI original según tema, mood y duración del video',
        dependsOn: [],
      },
      {
        id: 'app-3',
        agentId: 'voice-brand-manager',
        goal: 'Generar voiceover con voz de marca para el script',
        dependsOn: ['app-1'],
      },
      {
        id: 'app-4',
        agentId: 'audio-producer',
        goal: 'Generar SFX pack (whoosh, pop, bass drop) para transiciones',
        dependsOn: [],
      },
      {
        id: 'app-5',
        agentId: 'audio-producer',
        goal: 'Crear proyecto de sound design con layers de música, voz y SFX',
        dependsOn: ['app-2', 'app-3', 'app-4'],
      },
      {
        id: 'app-6',
        agentId: 'audio-producer',
        goal: 'Validar mix: voice clara > SFX > música de fondo',
        dependsOn: ['app-5'],
      },
    ],
  },

  // ── Sprint 7: Neural Brain + Vector DB ──────────────────────────────

  {
    id: 'neural-memory-cycle',
    name: 'Neural Memory Cycle',
    description:
      'Consolida memoria episódica, enriquece semántica, y actualiza el learning loop con outcomes recientes.',
    tasks: [
      {
        id: 'nmc-1',
        agentId: 'memory-curator',
        goal: 'Consolidar memorias episódicas de las últimas 24h en abstracciones semánticas',
        dependsOn: [],
      },
      {
        id: 'nmc-2',
        agentId: 'memory-curator',
        goal: 'Limpiar recuerdos con importance < 0.1 y más de 30 días de antigüedad',
        dependsOn: ['nmc-1'],
      },
      {
        id: 'nmc-3',
        agentId: 'neural-brain-operator',
        goal: 'Ejecutar learning loop: analizar outcomes recientes y detectar patrones de éxito/fracaso',
        dependsOn: ['nmc-1'],
      },
      {
        id: 'nmc-4',
        agentId: 'neural-brain-operator',
        goal: 'Generar recomendaciones de mejora basadas en patrones detectados',
        dependsOn: ['nmc-3'],
      },
      {
        id: 'nmc-5',
        agentId: 'attention-router',
        goal: 'Recalcular attention scores de tareas pendientes con nuevo conocimiento',
        dependsOn: ['nmc-4'],
      },
      {
        id: 'nmc-6',
        agentId: 'brand-memory-keeper',
        goal: 'Ingestar nuevas lecciones aprendidas a la knowledge base de marca',
        dependsOn: ['nmc-4'],
      },
    ],
  },

  {
    id: 'rag-knowledge-ops',
    name: 'RAG Knowledge Ops',
    description: 'Ingesta conocimiento nuevo, indexa contenido, y valida la calidad del knowledge base RAG.',
    tasks: [
      {
        id: 'rko-1',
        agentId: 'brand-memory-keeper',
        goal: 'Ingestar nuevo conocimiento: FAQs, product updates, o documentos de marca',
        dependsOn: [],
      },
      {
        id: 'rko-2',
        agentId: 'brand-memory-keeper',
        goal: 'Indexar contenido nuevo para búsqueda semántica',
        dependsOn: ['rko-1'],
      },
      {
        id: 'rko-3',
        agentId: 'brand-memory-keeper',
        goal: 'Validar calidad del knowledge base: cobertura, duplicados, y gaps',
        dependsOn: ['rko-2'],
      },
      {
        id: 'rko-4',
        agentId: 'brand-memory-keeper',
        goal: 'Ejecutar 3 queries de prueba y medir confidence > 0.7',
        dependsOn: ['rko-3'],
      },
      {
        id: 'rko-5',
        agentId: 'memory-curator',
        goal: 'Sincronizar vector store con estado actual de la memoria',
        dependsOn: ['rko-4'],
      },
    ],
  },

  // ── Sprint 8: Agent Swarm + Predictive ML ───────────────────────────

  {
    id: 'swarm-content-strike',
    name: 'Swarm Content Strike',
    description: 'Múltiples agentes crean contenido en paralelo: trend research, copy, visuals, audio, y scheduling.',
    tasks: [
      {
        id: 'scs-1',
        agentId: 'swarm-coordinator',
        goal: 'Descomponer la meta de contenido en sub-tareas paralelas',
        dependsOn: [],
      },
      { id: 'scs-2', agentId: 'trend-radar', goal: 'Scoutear trends y ángulos virales para el nicho', dependsOn: [] },
      {
        id: 'scs-3',
        agentId: 'content-creator',
        goal: 'Generar 3 ideas de contenido basadas en trends detectados',
        dependsOn: ['scs-2'],
      },
      { id: 'scs-4', agentId: 'communicator', goal: 'Escribir hooks y captions para cada idea', dependsOn: ['scs-3'] },
      {
        id: 'scs-5',
        agentId: 'predictive-analyst',
        goal: 'Predecir performance de cada idea y rankearlas',
        dependsOn: ['scs-4'],
      },
      {
        id: 'scs-6',
        agentId: 'swarm-coordinator',
        goal: 'Consensuar la mejor idea con votación de agentes',
        dependsOn: ['scs-5'],
      },
      {
        id: 'scs-7',
        agentId: 'audio-producer',
        goal: 'Generar audio para el contenido elegido (música + SFX)',
        dependsOn: ['scs-6'],
      },
      { id: 'scs-8', agentId: 'algorithm-master', goal: 'Calcular timing óptimo de publicación', dependsOn: ['scs-6'] },
      {
        id: 'scs-9',
        agentId: 'instagram-publisher',
        goal: 'Preparar el post para publicación',
        dependsOn: ['scs-7', 'scs-8'],
      },
    ],
  },

  {
    id: 'predictive-weekly-review',
    name: 'Predictive Weekly Review',
    description: 'Revisa métricas de la semana, detecta anomalías, predice tendencias, y propone plan de acción.',
    tasks: [
      {
        id: 'pwr-1',
        agentId: 'analytics-inspector',
        goal: 'Recolectar métricas de la semana: reach, engagement, saves, shares',
        dependsOn: [],
      },
      {
        id: 'pwr-2',
        agentId: 'anomaly-hunter',
        goal: 'Detectar anomalías en métricas semanales',
        dependsOn: ['pwr-1'],
      },
      {
        id: 'pwr-3',
        agentId: 'predictive-analyst',
        goal: 'Calcular engagement score y comparar con benchmark del nicho',
        dependsOn: ['pwr-1'],
      },
      {
        id: 'pwr-4',
        agentId: 'trend-forecaster',
        goal: 'Predecir tendencias emergentes para la próxima semana',
        dependsOn: [],
      },
      {
        id: 'pwr-5',
        agentId: 'predictive-analyst',
        goal: 'Predecir performance de contenido planificado para la próxima semana',
        dependsOn: ['pwr-4'],
      },
      {
        id: 'pwr-6',
        agentId: 'strategist',
        goal: 'Generar plan de contenido basado en predicciones y anomalías',
        dependsOn: ['pwr-2', 'pwr-3', 'pwr-5'],
      },
      {
        id: 'pwr-7',
        agentId: 'swarm-coordinator',
        goal: 'Priorizar tareas del plan con attention scores',
        dependsOn: ['pwr-6'],
      },
    ],
  },

  // ── Sprint 9: Real-Time Infrastructure ──────────────────────────────

  {
    id: 'realtime-crisis-response',
    name: 'Realtime Crisis Response',
    description: 'Detecta crisis en tiempo real, alerta inmediatamente, y ejecuta respuesta coordinada multi-agente.',
    tasks: [
      {
        id: 'rcr-1',
        agentId: 'live-monitor',
        goal: 'Monitorear streams en tiempo real y detectar señales de crisis',
        dependsOn: [],
      },
      {
        id: 'rcr-2',
        agentId: 'anomaly-hunter',
        goal: 'Validar anomalías detectadas y clasificar severidad',
        dependsOn: ['rcr-1'],
      },
      {
        id: 'rcr-3',
        agentId: 'realtime-operator',
        goal: 'Publicar evento de crisis al bus real-time',
        dependsOn: ['rcr-2'],
      },
      {
        id: 'rcr-4',
        agentId: 'event-dispatcher',
        goal: 'Notificar a todos los agentes relevantes vía push',
        dependsOn: ['rcr-3'],
      },
      {
        id: 'rcr-5',
        agentId: 'crisis-manager',
        goal: 'Ejecutar protocolo de crisis según severidad',
        dependsOn: ['rcr-4'],
      },
      {
        id: 'rcr-6',
        agentId: 'community-manager',
        goal: 'Pausar interacciones automáticas y preparar respuestas humanas',
        dependsOn: ['rcr-5'],
      },
      {
        id: 'rcr-7',
        agentId: 'live-monitor',
        goal: 'Continuar monitoreo post-respuesta y reportar estabilización',
        dependsOn: ['rcr-6'],
      },
    ],
  },

  {
    id: 'live-launch-monitor',
    name: 'Live Launch Monitor',
    description:
      'Monitorea un lanzamiento de producto/campaña en vivo con métricas real-time, alertas, y ajustes automáticos.',
    tasks: [
      {
        id: 'llm-1',
        agentId: 'realtime-operator',
        goal: 'Iniciar streams real-time y configurar dashboards',
        dependsOn: [],
      },
      {
        id: 'llm-2',
        agentId: 'live-monitor',
        goal: 'Monitorear métricas cada 60 segundos durante el lanzamiento',
        dependsOn: ['llm-1'],
      },
      {
        id: 'llm-3',
        agentId: 'predictive-analyst',
        goal: 'Predecir performance del lanzamiento en tiempo real',
        dependsOn: ['llm-2'],
      },
      {
        id: 'llm-4',
        agentId: 'analytics-inspector',
        goal: 'Comparar métricas actuales vs objetivos del lanzamiento',
        dependsOn: ['llm-2'],
      },
      {
        id: 'llm-5',
        agentId: 'anomaly-hunter',
        goal: 'Detectar anomalías en métricas de lanzamiento',
        dependsOn: ['llm-4'],
      },
      {
        id: 'llm-6',
        agentId: 'paid-media-manager',
        goal: 'Ajustar presupuesto de campaña si performance > 120% o < 80%',
        dependsOn: ['llm-3', 'llm-5'],
      },
      {
        id: 'llm-7',
        agentId: 'event-dispatcher',
        goal: 'Enviar push digest cada 2 horas con estado del lanzamiento',
        dependsOn: ['llm-2'],
      },
      {
        id: 'llm-8',
        agentId: 'realtime-operator',
        goal: 'Generar reporte post-lanzamiento con métricas y learnings',
        dependsOn: ['llm-7'],
      },
    ],
  },

  // ── Sprint 10: Computer Vision ──────────────────────────────────────

  {
    id: 'visual-content-audit',
    name: 'Visual Content Audit',
    description: 'Audita todo el contenido visual de la marca: calidad, paleta, OCR, moderación, y similitud.',
    tasks: [
      {
        id: 'vca-1',
        agentId: 'vision-analyst',
        goal: 'Analizar calidad visual de todo el contenido planificado',
        dependsOn: [],
      },
      { id: 'vca-2', agentId: 'ocr-specialist', goal: 'Extraer texto de todas las imágenes vía OCR', dependsOn: [] },
      {
        id: 'vca-3',
        agentId: 'visual-optimizer',
        goal: 'Verificar consistencia de paleta de marca',
        dependsOn: ['vca-1'],
      },
      {
        id: 'vca-4',
        agentId: 'content-moderator',
        goal: 'Moderar todo el contenido visual por brand safety',
        dependsOn: ['vca-1', 'vca-2'],
      },
      {
        id: 'vca-5',
        agentId: 'vision-analyst',
        goal: 'Detectar contenido duplicado o muy similar',
        dependsOn: ['vca-1'],
      },
      {
        id: 'vca-6',
        agentId: 'vision-analyst',
        goal: 'Verificar compliance de rostros y consentimiento',
        dependsOn: ['vca-4'],
      },
      {
        id: 'vca-7',
        agentId: 'visual-optimizer',
        goal: 'Generar reporte de audit con recomendaciones',
        dependsOn: ['vca-3', 'vca-5', 'vca-6'],
      },
    ],
  },

  {
    id: 'auto-moderation-pipeline',
    name: 'Auto Moderation Pipeline',
    description: 'Pipeline automático de moderación visual: escanea, flaggea, y decide approve/review/reject.',
    tasks: [
      {
        id: 'amp-1',
        agentId: 'content-moderator',
        goal: 'Escaneo inicial de moderación de todas las imágenes',
        dependsOn: [],
      },
      {
        id: 'amp-2',
        agentId: 'vision-analyst',
        goal: 'Análisis facial: brand safety y compliance',
        dependsOn: ['amp-1'],
      },
      {
        id: 'amp-3',
        agentId: 'ocr-specialist',
        goal: 'Verificar texto: banned words, legibilidad, brand voice',
        dependsOn: ['amp-1'],
      },
      {
        id: 'amp-4',
        agentId: 'content-moderator',
        goal: 'Consolidar flags y decidir acción final',
        dependsOn: ['amp-2', 'amp-3'],
      },
      {
        id: 'amp-5',
        agentId: 'event-dispatcher',
        goal: 'Notificar aprobadas y escalar las que necesitan review',
        dependsOn: ['amp-4'],
      },
      {
        id: 'amp-6',
        agentId: 'memory-curator',
        goal: 'Registrar decisiones de moderación para aprendizaje',
        dependsOn: ['amp-5'],
      },
    ],
  },

  // ── Sprint 11: Self-Improvement + AR ────────────────────────────────

  {
    id: 'self-improvement-cycle',
    name: 'Self Improvement Cycle',
    description: 'Ciclo de mejora continua: recolecta feedback, analiza performance, sugiere ajustes, y aplica tuning.',
    tasks: [
      {
        id: 'sic-1',
        agentId: 'feedback-collector',
        goal: 'Recolectar feedback de agentes y métricas del período',
        dependsOn: [],
      },
      {
        id: 'sic-2',
        agentId: 'self-improvement-engine',
        goal: 'Analizar performance y detectar cuellos de botella',
        dependsOn: ['sic-1'],
      },
      {
        id: 'sic-3',
        agentId: 'strategy-tuner',
        goal: 'Sugerir ajustes de parámetros basados en análisis',
        dependsOn: ['sic-2'],
      },
      {
        id: 'sic-4',
        agentId: 'self-improvement-engine',
        goal: 'Evaluar impacto de los ajustes propuestos',
        dependsOn: ['sic-3'],
      },
      {
        id: 'sic-5',
        agentId: 'strategy-tuner',
        goal: 'Aplicar tuning aprobado y registrar cambios',
        dependsOn: ['sic-4'],
      },
    ],
  },

  {
    id: 'ar-campaign-launch',
    name: 'AR Campaign Launch',
    description:
      'Lanza una campaña AR completa: diseña filtros, compone efectos, genera previews, y planifica distribución.',
    tasks: [
      { id: 'arcl-1', agentId: 'ar-creator', goal: 'Diseñar filtros AR alineados con la marca', dependsOn: [] },
      {
        id: 'arcl-2',
        agentId: 'ar-creator',
        goal: 'Construir efectos interactivos con triggers',
        dependsOn: ['arcl-1'],
      },
      {
        id: 'arcl-3',
        agentId: 'ar-creator',
        goal: 'Previsualizar efectos en múltiples perfiles de dispositivo',
        dependsOn: ['arcl-2'],
      },
      {
        id: 'arcl-4',
        agentId: 'ar-creator',
        goal: 'Gestionar assets 3D y texturas con versionado',
        dependsOn: ['arcl-2'],
      },
      {
        id: 'arcl-5',
        agentId: 'ar-creator',
        goal: 'Planificar campaña de distribución cross-platform',
        dependsOn: ['arcl-3', 'arcl-4'],
      },
      {
        id: 'arcl-6',
        agentId: 'ar-creator',
        goal: 'Exportar efectos en formato correcto por plataforma',
        dependsOn: ['arcl-5'],
      },
    ],
  },
];

export const getPlaybook = (id: string): PlaybookDefinition | undefined => PLAYBOOKS.find((p) => p.id === id);

export const listPlaybooks = (): PlaybookDefinition[] => [...PLAYBOOKS];
