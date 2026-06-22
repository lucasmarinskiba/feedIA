/**
 * InstagramWorkflows — biblioteca de workflows profesionales para Instagram.
 *
 * Cada workflow es un PlaybookDefinition completo que Talía puede ejecutar
 * de forma autónoma. Representan los procesos de un community manager profesional:
 *
 * - CRECIMIENTO_SEMANAL: estrategia integral de crecimiento orgánico
 * - PRODUCCION_DIARIA: pipeline completo de creación y publicación de contenido
 * - GESTION_COMUNIDAD: gestión de comentarios, DMs y notificaciones
 * - ANALISIS_COMPETENCIA: auditoría de competidores y benchmarking
 * - RESPUESTA_CRISIS: protocolo de crisis en tiempo real
 * - LANZAMIENTO_CAMPAÑA: workflow para lanzar una campaña o producto
 * - AUDITORIA_MENSUAL: revisión completa del mes con ajuste de estrategia
 * - ONBOARDING_CUENTA: configuración inicial de una cuenta nueva
 */

import type { PlaybookDefinition } from '../agent/orchestrator.js';
import type { BrandProfile } from '../config/types.js';
import { ask as routerAsk } from '../agent/tokenRouter.js';

// ── Workflow: Crecimiento Semanal ─────────────────────────────────────────────

export const WORKFLOW_CRECIMIENTO_SEMANAL: PlaybookDefinition = {
  id: 'ig-growth-weekly',
  name: 'Crecimiento Semanal Instagram',
  description:
    'Workflow completo de crecimiento orgánico para ejecutar una vez por semana. Combina análisis, planificación y ejecución.',
  tasks: [
    {
      id: 'analizar-semana-anterior',
      agentId: 'analytics',
      goal: 'Analizar el rendimiento de la semana anterior: posts con mayor alcance, engagement rate, nuevos seguidores, saves. Identificar qué formatos y temas funcionaron mejor.',
    },
    {
      id: 'audit-competidores',
      agentId: 'scout',
      goal: 'Auditar los 3-5 principales competidores esta semana: qué publicaron, qué performance tuvieron, qué tendencias están aprovechando. Identificar oportunidades para la propia cuenta.',
      dependsOn: ['analizar-semana-anterior'],
    },
    {
      id: 'plan-contenido-semanal',
      agentId: 'nova',
      goal: 'Basándose en el análisis de la semana anterior y el audit de competidores, crear el plan de contenido para los próximos 7 días: 3 Reels + 2 Carruseles + Stories diarias. Incluir: tema, formato, hook, mejor horario de publicación.',
      dependsOn: ['analizar-semana-anterior', 'audit-competidores'],
    },
    {
      id: 'investigar-hashtags',
      agentId: 'scout',
      goal: 'Investigar y generar sets de hashtags para esta semana: 3 grupos de 5-7 hashtags para rotar entre los 5 posts planificados. Mix de micro y medio alcance.',
      dependsOn: ['plan-contenido-semanal'],
    },
    {
      id: 'configurar-beacon-accounts',
      agentId: 'lia',
      goal: 'Actualizar la lista de cuentas faro (beacon accounts): revisar si las cuentas actuales siguen siendo relevantes, buscar 2-3 nuevas cuentas faro del niche con audiencia superpuesta a la propia. Listar con @usernames.',
    },
    {
      id: 'producir-reel-principal',
      agentId: 'nova',
      goal: 'Crear el Reel de mayor impacto de la semana: generar el script completo (narración palabra por palabra), las instrucciones de grabación/edición, el caption final con hashtags y CTA. Este es el contenido "Hero" de la semana.',
      dependsOn: ['plan-contenido-semanal', 'investigar-hashtags'],
      checkpointType: 'content_review',
      checkpointDescription: 'Revisar script del Reel principal antes de grabar',
    },
    {
      id: 'producir-carrusel',
      agentId: 'nova',
      goal: 'Crear el carrusel educativo de la semana: 5-7 slides con texto y concepto visual para cada slide, caption final con hashtags. El carrusel debe ser guardable (save bait) y educativo.',
      dependsOn: ['plan-contenido-semanal', 'investigar-hashtags'],
    },
    {
      id: 'programar-contenido',
      agentId: 'talia',
      goal: 'Con el contenido producido esta semana, crear el calendario de publicación: asignar horarios exactos para cada post basándose en los mejores horarios del Insights de la cuenta. Documentar en el plan semanal.',
      dependsOn: ['producir-reel-principal', 'producir-carrusel'],
    },
    {
      id: 'plan-engagement-semanal',
      agentId: 'lia',
      goal: 'Crear el plan de engagement de la semana: qué cuentas faro monitorear cada día, qué tipos de comentarios escribir, horarios de engagement. Objetivo: mínimo 10 comentarios estratégicos por día en cuentas faro.',
      dependsOn: ['configurar-beacon-accounts'],
    },
    {
      id: 'resumen-ejecutivo',
      agentId: 'talia',
      goal: 'Generar el resumen ejecutivo semanal: plan de contenido aprobado, calendario de publicaciones, plan de engagement, hashtag sets, KPIs objetivo para la semana. Formato de briefing para el equipo.',
      dependsOn: ['programar-contenido', 'plan-engagement-semanal'],
    },
  ],
  maxGlobalIterations: 50,
};

// ── Workflow: Producción Diaria ───────────────────────────────────────────────

export const WORKFLOW_PRODUCCION_DIARIA: PlaybookDefinition = {
  id: 'ig-daily-production',
  name: 'Producción de Contenido Diaria',
  description:
    'Pipeline de producción de un post completo: desde el brief hasta el post publicado. Ejecutar para cada pieza de contenido.',
  tasks: [
    {
      id: 'brief-contenido',
      agentId: 'nova',
      goal: 'Crear el brief completo del post de hoy: tema (basado en el plan semanal o tendencias actuales), formato, ángulo narrativo, target emocional (qué debe sentir el usuario al verlo), y el formato más adecuado (Reel/Carrusel/Post).',
    },
    {
      id: 'generar-hooks',
      agentId: 'nova',
      goal: 'Generar 5 opciones de hook para el contenido de hoy. Un hook que detenga el scroll: para Reels (primera frase hablada), para Carruseles (título del slide 1), para Posts (primera línea del caption antes del "ver más"). Elegir el mejor de los 5.',
      dependsOn: ['brief-contenido'],
    },
    {
      id: 'redactar-caption',
      agentId: 'nova',
      goal: 'Redactar el caption completo del post: hook elegido + body de valor (máx 200 palabras) + CTA específica. Incluir 3-5 hashtags estratégicos al final. El caption debe verse natural y humano, no generado por IA.',
      dependsOn: ['generar-hooks'],
    },
    {
      id: 'verificar-originalidad',
      agentId: 'gard',
      goal: 'Verificar que el contenido del caption es original y no reproduce textos de posts anteriores. Revisar que no hay mentions de competidores, información incorrecta, o lenguaje inapropiado.',
      dependsOn: ['redactar-caption'],
    },
    {
      id: 'compliance-check',
      agentId: 'gard',
      goal: 'Revisar el caption por compliance con las políticas de Instagram y la guía de marca: no spam, no claims no probados, hashtags no baneados, tono coherente con la marca. Aprobar o solicitar correcciones.',
      dependsOn: ['verificar-originalidad'],
    },
    {
      id: 'instrucciones-visuales',
      agentId: 'pixel',
      goal: 'Crear las instrucciones de diseño/producción visual para este post: especificaciones de imagen/video, paleta de colores a usar, tipografía, elementos gráficos necesarios, referencia visual si aplica. Listo para ejecutar en Canva o enviarlo al diseñador.',
      dependsOn: ['brief-contenido'],
    },
    {
      id: 'revision-final',
      agentId: 'talia',
      goal: 'Hacer la revisión final del post antes de publicar: caption aprobado + brief visual listo. Verificar que todo está alineado con el plan semanal y los objetivos de la marca. APROBAR para publicación o solicitar ajustes.',
      dependsOn: ['compliance-check', 'instrucciones-visuales'],
      checkpointType: 'publish_approval',
      checkpointDescription: 'Aprobar post antes de publicar en Instagram',
    },
  ],
  maxGlobalIterations: 30,
};

// ── Workflow: Gestión de Comunidad ────────────────────────────────────────────

export const WORKFLOW_GESTION_COMUNIDAD: PlaybookDefinition = {
  id: 'ig-community-management',
  name: 'Gestión Diaria de Comunidad',
  description:
    'Gestión completa de la comunidad: notificaciones, comentarios, DMs, y engagement. Ejecutar 1-2 veces al día.',
  tasks: [
    {
      id: 'revisar-notificaciones',
      agentId: 'lia',
      goal: 'Revisar todas las notificaciones de Instagram: nuevos seguidores, likes, comentarios, menciones. Clasificar y priorizar: urgentes (consultas de venta, crisis), importantes (preguntas, comentarios largos), rutina (likes, follows).',
    },
    {
      id: 'responder-comentarios-propios',
      agentId: 'lia',
      goal: 'Responder todos los comentarios de los últimos 3 posts de la cuenta. Prioridad: preguntas → comentarios largos → comentarios positivos. Respuestas deben ser personalizadas, auténticas y extensas cuando corresponda. Hacer preguntas de vuelta para continuar conversación.',
      dependsOn: ['revisar-notificaciones'],
    },
    {
      id: 'triage-dms',
      agentId: 'lia',
      goal: 'Revisar todos los DMs nuevos y no leídos. Clasificar: leads calientes (pregunta precio/servicio) → leads tibios (interés general) → consultas de soporte → spam/bot. Para cada categoría, dar la respuesta apropiada o escalar al humano.',
      dependsOn: ['revisar-notificaciones'],
    },
    {
      id: 'calificar-leads-dms',
      agentId: 'luca',
      goal: 'Para los DMs clasificados como leads (calientes y tibios): calificar cada uno con el framework BANT (Budget, Authority, Need, Timeline). Preparar la respuesta personalizada que avance la conversación hacia una venta o próximo paso. Identificar cuáles necesitan escalamiento humano.',
      dependsOn: ['triage-dms'],
    },
    {
      id: 'beacon-engagement',
      agentId: 'lia',
      goal: 'Realizar el beacon engagement del día: ir a las 5 cuentas faro del niche y hacer engagement estratégico en sus últimos posts (comentario genuino de 5+ palabras + like). Priorizar las cuentas con más actividad hoy. Registrar qué se comentó en cada cuenta.',
      dependsOn: ['responder-comentarios-propios'],
    },
    {
      id: 'monitoreo-menciones',
      agentId: 'gard',
      goal: 'Buscar menciones de la marca o cuenta en Instagram: buscar el nombre/hashtag de marca en Explorar, revisar comentarios en cuentas faro. Si hay menciones positivas, interactuar. Si hay menciones negativas, evaluar si requiere respuesta o gestión de crisis.',
    },
    {
      id: 'resumen-comunidad',
      agentId: 'lia',
      goal: 'Generar el resumen de gestión de comunidad: estadísticas (cuántos comentarios respondidos, cuántos DMs procesados, leads identificados), acciones de beacon engagement realizadas, menciones detectadas, alertas si las hay.',
      dependsOn: ['responder-comentarios-propios', 'calificar-leads-dms', 'beacon-engagement', 'monitoreo-menciones'],
    },
  ],
  maxGlobalIterations: 30,
};

// ── Workflow: Análisis de Competencia ─────────────────────────────────────────

export const WORKFLOW_ANALISIS_COMPETENCIA: PlaybookDefinition = {
  id: 'ig-competitor-analysis',
  name: 'Análisis de Competencia Instagram',
  description:
    'Auditoría completa de competidores: qué hacen, qué les funciona y cómo superarlos. Ejecutar mensualmente.',
  tasks: [
    {
      id: 'identificar-competidores',
      agentId: 'scout',
      goal: 'Identificar y listar los 5 principales competidores en Instagram del mismo niche. Para cada uno: @username, cantidad de followers, tipo de cuenta, descripción de su propuesta de valor. Si ya existe una lista, actualizarla con novedades.',
    },
    {
      id: 'auditar-perfiles',
      agentId: 'scout',
      goal: 'Para cada competidor identificado, hacer una auditoría completa del perfil: bio, foto de perfil, highlights, frecuencia de posting, formatos que más usan, estética visual, engagement rate aproximado, tono de comunicación.',
      dependsOn: ['identificar-competidores'],
    },
    {
      id: 'analizar-contenido-top',
      agentId: 'scout',
      goal: 'Identificar los 3 posts de mayor engagement de cada competidor en el último mes: qué formato, qué tema, qué hook usaron, cuántos likes/comentarios/saves. Identificar patrones: qué tipos de contenido les funciona mejor.',
      dependsOn: ['auditar-perfiles'],
    },
    {
      id: 'gap-analysis',
      agentId: 'nova',
      goal: 'Basándose en el análisis de competidores, identificar: qué temas NO están cubriendo que nuestra audiencia necesita, qué formatos están subutilizando, qué diferenciadores únicos podemos explotar. Crear una lista de oportunidades concretas.',
      dependsOn: ['analizar-contenido-top'],
    },
    {
      id: 'benchmarks-competitivos',
      agentId: 'analytics',
      goal: 'Comparar las métricas propias versus la competencia: followers, engagement rate, frecuencia de posting, crecimiento estimado. Generar un dashboard comparativo y calificar la posición competitiva actual.',
      dependsOn: ['auditar-perfiles'],
    },
    {
      id: 'estrategia-diferenciacion',
      agentId: 'talia',
      goal: 'Con todo el análisis de competidores, diseñar la estrategia de diferenciación: 3 pilares de contenido únicos que los competidores no están haciendo bien, el ángulo narrativo distintivo de la marca, y las tácticas de crecimiento que más impacto tendrán en los próximos 30 días.',
      dependsOn: ['gap-analysis', 'benchmarks-competitivos'],
      checkpointType: 'strategy_approval',
      checkpointDescription: 'Revisar estrategia de diferenciación competitiva',
    },
  ],
  maxGlobalIterations: 40,
};

// ── Workflow: Respuesta a Crisis ──────────────────────────────────────────────

export const WORKFLOW_RESPUESTA_CRISIS: PlaybookDefinition = {
  id: 'ig-crisis-response',
  name: 'Protocolo de Respuesta a Crisis Instagram',
  description:
    'Activar inmediatamente ante una crisis: comentario viral negativo, error de publicación, ataque coordinado o situación sensible.',
  tasks: [
    {
      id: 'evaluar-crisis',
      agentId: 'gard',
      goal: 'URGENTE: Evaluar la situación de crisis en Instagram. Determinar: nivel de gravedad (1-5), alcance actual (cuántas personas la vieron), naturaleza (error propio, ataque externo, malentendido), si hay contenido publicado por error que deba retirarse. Capturar evidencia (screenshots).',
    },
    {
      id: 'pausar-contenido-programado',
      agentId: 'talia',
      goal: 'ACCIÓN INMEDIATA: Pausar todo el contenido programado para las próximas 24 horas. Ningún post debe publicarse durante la crisis activa. Documentar qué contenido fue pausado y para cuándo debe reprogramarse.',
      dependsOn: ['evaluar-crisis'],
    },
    {
      id: 'redactar-respuesta-oficial',
      agentId: 'nova',
      goal: 'Redactar la respuesta oficial de la marca para la crisis. Debe ser: auténtica, empática, clara, no defensiva. Si hay error propio: reconocer + disculpa + acción correctiva. Si es ataque externo: aclarar + mantener la calma + no confrontar. MULTIPLE OPCIONES para que humano elija.',
      dependsOn: ['evaluar-crisis'],
      checkpointType: 'crisis_response_approval',
      checkpointDescription: 'URGENTE: Aprobar respuesta a crisis antes de publicar',
    },
    {
      id: 'monitoreo-intensivo',
      agentId: 'gard',
      goal: 'Iniciar monitoreo intensivo de la situación: revisar hashtags relacionados, buscar menciones de la marca, monitorear los comentarios del post en cuestión cada 30 minutos. Reportar escalada o de-escalada en tiempo real.',
      dependsOn: ['evaluar-crisis'],
    },
    {
      id: 'plan-recovery',
      agentId: 'talia',
      goal: 'Diseñar el plan de recuperación post-crisis: qué contenido publicar en las próximas 48 horas para reestablecer la narrativa positiva, cómo retomar la comunicación normal, qué aprendizajes documentar para prevenir situaciones similares.',
      dependsOn: ['redactar-respuesta-oficial', 'monitoreo-intensivo'],
    },
  ],
  maxGlobalIterations: 25,
};

// ── Workflow: Lanzamiento de Campaña ─────────────────────────────────────────

export const WORKFLOW_LANZAMIENTO_CAMPAÑA: PlaybookDefinition = {
  id: 'ig-campaign-launch',
  name: 'Lanzamiento de Campaña/Producto Instagram',
  description:
    'Workflow completo para lanzar una campaña, producto o servicio en Instagram. De la estrategia a la publicación.',
  tasks: [
    {
      id: 'estrategia-campaña',
      agentId: 'talia',
      goal: 'Diseñar la estrategia completa de la campaña: objetivo principal (ventas/awareness/leads), KPIs a medir, duración recomendada, presupuesto si aplica, segmentación de audiencia, propuesta de valor del lanzamiento.',
      checkpointType: 'strategy_approval',
      checkpointDescription: 'Revisar y aprobar la estrategia de campaña',
    },
    {
      id: 'calendario-campaña',
      agentId: 'nova',
      goal: 'Crear el calendario editorial de la campaña: todos los posts, stories, y reels con fechas y horarios exactos. Incluir el contenido de "calentamiento" (7 días antes), "lanzamiento" (día D), y "seguimiento" (7 días después). Formato: tabla por día con tipo, formato y tema.',
      dependsOn: ['estrategia-campaña'],
    },
    {
      id: 'producir-piezas-principales',
      agentId: 'nova',
      goal: 'Crear el contenido de las 5 piezas principales de la campaña: Reel de lanzamiento + 2 carruseles + post de prueba social + story de countdown. Para cada uno: script/copy completo, brief visual, caption final con hashtags.',
      dependsOn: ['calendario-campaña'],
    },
    {
      id: 'hashtag-campaña',
      agentId: 'scout',
      goal: 'Crear el hashtag específico de la campaña y la estrategia de hashtags: hashtag de marca de la campaña (#NombreCampaña), sets de hashtags para cada tipo de post, estrategia de posicionamiento en el niche.',
      dependsOn: ['estrategia-campaña'],
    },
    {
      id: 'brief-visual',
      agentId: 'pixel',
      goal: 'Crear el brief visual completo de la campaña: paleta de colores específica, tipografías, elementos gráficos, mood board de referencia, plantillas de Canva recomendadas, guía de consistencia visual para toda la campaña.',
      dependsOn: ['estrategia-campaña'],
    },
    {
      id: 'revisar-compliance',
      agentId: 'gard',
      goal: 'Revisar todas las piezas por compliance: claims legales, uso correcto del lenguaje publicitario, políticas de Instagram, derechos de imagen/música, políticas de la industria del cliente. Aprobar o solicitar correcciones.',
      dependsOn: ['producir-piezas-principales'],
    },
    {
      id: 'aprobacion-final',
      agentId: 'talia',
      goal: 'Revisión final de todo el material de campaña: estrategia + calendario + piezas + hashtags + brief visual. Generar el deck de presentación del lanzamiento. Todo listo para ejecutar.',
      dependsOn: ['revisar-compliance', 'hashtag-campaña', 'brief-visual'],
      checkpointType: 'campaign_launch_approval',
      checkpointDescription: 'APROBACIÓN FINAL: Revisar todo el material antes del lanzamiento',
    },
  ],
  maxGlobalIterations: 50,
};

// ── Workflow: Auditoría Mensual ───────────────────────────────────────────────

export const WORKFLOW_AUDITORIA_MENSUAL: PlaybookDefinition = {
  id: 'ig-monthly-audit',
  name: 'Auditoría Mensual Instagram',
  description:
    'Revisión completa del mes: métricas, contenido, comunidad, competidores. Genera la estrategia del mes siguiente.',
  tasks: [
    {
      id: 'kpis-del-mes',
      agentId: 'analytics',
      goal: 'Compilar todos los KPIs del mes: followers inicio vs fin (crecimiento), alcance total, impresiones totales, engagement rate promedio, posts publicados, mejores y peores posts, DMs recibidos, leads generados si aplica.',
    },
    {
      id: 'analisis-contenido',
      agentId: 'analytics',
      goal: 'Análisis profundo del contenido del mes: clasificar todos los posts por formato (Reel/Carrusel/Post/Story), engagement rate de cada uno, save rate, reach. Identificar los patrones: qué formatos, temas y horarios generaron mejores resultados.',
      dependsOn: ['kpis-del-mes'],
    },
    {
      id: 'analisis-audiencia',
      agentId: 'analytics',
      goal: 'Analizar el crecimiento y comportamiento de la audiencia del mes: de dónde vienen los nuevos followers (Reels/Explorar/Hashtags/Perfil), demografía si cambió, horarios de actividad, tipo de contenido con más saves.',
      dependsOn: ['kpis-del-mes'],
    },
    {
      id: 'analisis-comunidad',
      agentId: 'lia',
      goal: 'Auditoría de la gestión de comunidad del mes: tiempo de respuesta promedio, volumen de comentarios/DMs, % respondidos, leads generados de DMs, casos de crisis o situaciones especiales manejadas.',
    },
    {
      id: 'analisis-competidores-mensual',
      agentId: 'scout',
      goal: 'Resumen mensual del panorama competitivo: cómo crecieron los competidores principales vs la propia cuenta, qué tendencias del niche emergieron este mes, qué competidor tuvo el mejor contenido y por qué.',
    },
    {
      id: 'lecciones-aprendidas',
      agentId: 'talia',
      goal: 'Documentar las lecciones aprendidas del mes: qué funcionó bien y debe repetirse, qué no funcionó y debe ajustarse, qué experimentos (A/B tests) se realizaron y cuáles fueron los resultados, insights clave para el mes siguiente.',
      dependsOn: ['analisis-contenido', 'analisis-audiencia', 'analisis-comunidad', 'analisis-competidores-mensual'],
    },
    {
      id: 'estrategia-mes-siguiente',
      agentId: 'talia',
      goal: 'Diseñar la estrategia para el mes siguiente: objetivos cuantitativos (followers objetivo, engagement rate objetivo), pilares de contenido, formatos a priorizar, tácticas de crecimiento a implementar, calendar de temas, presupuesto si aplica.',
      dependsOn: ['lecciones-aprendidas'],
      checkpointType: 'monthly_strategy_approval',
      checkpointDescription: 'Revisar y aprobar la estrategia del mes siguiente',
    },
    {
      id: 'reporte-ejecutivo',
      agentId: 'talia',
      goal: 'Generar el reporte ejecutivo mensual completo: resumen de KPIs vs objetivos, highlights del mes, análisis de competencia, lecciones, y estrategia aprobada del mes siguiente. Formato profesional listo para presentar.',
      dependsOn: ['estrategia-mes-siguiente'],
    },
  ],
  maxGlobalIterations: 60,
};

// ── Workflow: Onboarding de Cuenta Nueva ──────────────────────────────────────

export const WORKFLOW_ONBOARDING_CUENTA: PlaybookDefinition = {
  id: 'ig-account-onboarding',
  name: 'Configuración Inicial de Cuenta Instagram',
  description: 'Setup completo de una cuenta nueva o reactivación: perfil, estrategia, primeros contenidos.',
  tasks: [
    {
      id: 'auditoria-estado-actual',
      agentId: 'scout',
      goal: 'Auditar el estado actual de la cuenta de Instagram: foto de perfil, nombre, bio, links, categoría de cuenta, tipo (personal/creador/empresa), si tiene verificación, highlights actuales, últimos posts (si los hay), métricas base si hay Insights disponibles.',
    },
    {
      id: 'definir-posicionamiento',
      agentId: 'talia',
      goal: 'Definir el posicionamiento estratégico de la cuenta: nicho específico, propuesta de valor única, arquetipo de marca, audiencia ideal detallada (demografía, psicografía, dolores y deseos), voz y tono de comunicación, pilares de contenido (4-5 temas core).',
      dependsOn: ['auditoria-estado-actual'],
      checkpointType: 'positioning_approval',
      checkpointDescription: 'Aprobar el posicionamiento estratégico de la cuenta',
    },
    {
      id: 'optimizar-perfil',
      agentId: 'nova',
      goal: 'Redactar todos los elementos del perfil optimizados: bio (150 chars con keywords + CTA + emoji), nombre con keywords del niche, highlights recomendados con nombres, link en bio strategy (qué poner y por qué).',
      dependsOn: ['definir-posicionamiento'],
    },
    {
      id: 'identidad-visual',
      agentId: 'pixel',
      goal: 'Definir la identidad visual para Instagram: paleta de colores (3-4 colores hex), tipografías (primaria y secundaria), estilo de fotografía, filtro o preset recomendado, moodboard de referencias, guía de plantillas de Canva. Todo debe ser coherente y reconocible.',
      dependsOn: ['definir-posicionamiento'],
    },
    {
      id: 'primeros-9-posts',
      agentId: 'nova',
      goal: 'Planificar los primeros 9 posts del grid (el "first impression grid"): estos posts deben comunicar inmediatamente de qué trata la cuenta y convencer al visitante a seguir. Brief completo para cada uno: formato, tema, hook, visual.',
      dependsOn: ['definir-posicionamiento', 'identidad-visual'],
      checkpointType: 'content_approval',
      checkpointDescription: 'Aprobar los primeros 9 posts del grid',
    },
    {
      id: 'estrategia-lanzamiento',
      agentId: 'talia',
      goal: 'Crear la estrategia de lanzamiento de los primeros 30 días: plan de publicación (qué publicar cada día), plan de engagement (beacon accounts, hashtags a usar, comunidades a unirse), objetivo de followers al día 30, métricas a trackear semanalmente.',
      dependsOn: ['primeros-9-posts'],
    },
  ],
  maxGlobalIterations: 45,
};

// ── Workflow: Growth Sprint (3-7 días de aceleración intensiva) ─────────────

export const WORKFLOW_GROWTH_SPRINT: PlaybookDefinition = {
  id: 'ig-growth-sprint',
  name: 'Growth Sprint Intensivo',
  description:
    'Sprint de 3-7 días para acelerar el crecimiento: detecta virales del nicho, produce con hooks A/B testados, programa boost post-publicación, ejecuta beacon engagement coordinado y reporta crecimiento diario.',
  tasks: [
    {
      id: 'sprint-snapshot',
      agentId: 'analytics',
      goal: 'Capturar snapshot inicial del estado de la cuenta: seguidores actuales, engagement rate de la última semana, alcance promedio, top posts, formato ganador. Usar performance_patterns y performance_recent. Este snapshot es la línea base del sprint para medir crecimiento real.',
    },
    {
      id: 'sprint-meta-clara',
      agentId: 'talia',
      goal: 'Definir la meta concreta del sprint: cuántos seguidores nuevos, qué engagement rate y qué alcance se quieren lograr al final del período. Usar growth_set_goal con valores realistas pero ambiciosos (10-30% más que el ritmo actual).',
      dependsOn: ['sprint-snapshot'],
    },
    {
      id: 'sprint-detectar-virales',
      agentId: 'scout',
      goal: 'Ejecutar viral_ride_wave para detectar las 3-5 oportunidades virales más fuertes del nicho RIGHT NOW. Documentar la mejor estructura para replicar. Usar viral_scan + viral_decompose + viral_adapt.',
      dependsOn: ['sprint-meta-clara'],
    },
    {
      id: 'sprint-content-ladder',
      agentId: 'nova',
      goal: 'Producir 4-6 piezas para los próximos 3-7 días combinando: 2 reels surfando virales detectados, 1 carrusel "save-bait" con valor accionable, 1 reel original con hook de Hook Lab (mejor categoría). Para CADA pieza: usar hook_pick_for_ab para elegir el mejor hook, pasar por content_score, no publicar hasta score >= 70.',
      dependsOn: ['sprint-detectar-virales'],
    },
    {
      id: 'sprint-timing-plan',
      agentId: 'analytics',
      goal: 'Para cada pieza producida, asignar el slot óptimo de publicación usando timing_best_time según el formato. Devolver un calendario de publicación día por día con horarios exactos.',
      dependsOn: ['sprint-content-ladder'],
    },
    {
      id: 'sprint-checkpoint-aprobacion',
      agentId: 'talia',
      goal: 'CHECKPOINT HUMANO: presentar al usuario las piezas producidas con sus scores, hooks elegidos y horarios. Esperar aprobación antes de pasar a ejecución.',
      checkpointType: 'human_review',
      checkpointDescription: 'Revisar y aprobar las piezas del sprint antes de publicar',
      dependsOn: ['sprint-timing-plan'],
    },
    {
      id: 'sprint-ejecutar-publicaciones',
      agentId: 'talia',
      goal: 'Publicar cada pieza en su slot asignado usando publicar_post / publicar_reel / publicar_carrusel. INMEDIATAMENTE después de cada publicación, llamar a boost_schedule para activar el plan de boost de la primera hora.',
      dependsOn: ['sprint-checkpoint-aprobacion'],
    },
    {
      id: 'sprint-beacon-coordinado',
      agentId: 'lia',
      goal: 'Durante todo el sprint, ejecutar beacon_engagement con las cuentas faro 2 veces al día (mañana y tarde). Enfocar comentarios en aportar valor real (no genéricos). Track de las cuentas que más responden recíprocamente.',
      dependsOn: ['sprint-ejecutar-publicaciones'],
    },
    {
      id: 'sprint-comunidad-intensiva',
      agentId: 'lia',
      goal: 'Responder TODOS los comentarios y DMs dentro de los primeros 60 minutos de cada publicación. Usar events_process_queue cada 30 min durante el sprint. Priorizar respuestas que generen otras respuestas (preguntas conversacionales).',
      dependsOn: ['sprint-ejecutar-publicaciones'],
    },
    {
      id: 'sprint-medicion-diaria',
      agentId: 'analytics',
      goal: 'Cada día del sprint capturar growth_record_daily con: seguidores, alcance 24h, engagement, posts. Comparar contra el snapshot inicial y la meta. Si el crecimiento se desvía 20%+ del plan, alertar para ajustar táctica.',
      dependsOn: ['sprint-ejecutar-publicaciones'],
    },
    {
      id: 'sprint-cierre-narrativa',
      agentId: 'talia',
      goal: 'Cerrar el sprint con un reporte completo: seguidores ganados vs meta, mejor post del sprint, lift promedio del post-boost, hashtags que más alcance generaron, qué viral funcionó. Generar la narrativa con growth_narrative y enviar al usuario.',
      dependsOn: ['sprint-medicion-diaria', 'sprint-beacon-coordinado', 'sprint-comunidad-intensiva'],
    },
  ],
  maxGlobalIterations: 80,
};

// ── Workflow: Kickoff de Lunes (ritual semanal) ──────────────────────────────

export const WORKFLOW_KICKOFF_LUNES: PlaybookDefinition = {
  id: 'ig-kickoff-lunes',
  name: 'Kickoff Semanal (Lunes)',
  description:
    'Procesa las indicaciones del usuario (voz/texto/canvas/calendario), parsea intent, crea metas + tareas + eventos y entrega un plan operativo de la semana.',
  tasks: [
    {
      id: 'kickoff-recibir-input',
      agentId: 'talia',
      goal: 'Recibir el input del usuario y normalizar. Si es voz, transcribir. Si es canvas, parsear nodos. Si es texto, usarlo directamente. Si es calendario, leer entradas estructuradas.',
    },
    {
      id: 'kickoff-parsear-intent',
      agentId: 'talia',
      goal: 'Usar el intent parser (parseUserIntent) para extraer: metas, eventos, tareas sueltas, restricciones, ambigüedades. Validar coherencia.',
      dependsOn: ['kickoff-recibir-input'],
    },
    {
      id: 'kickoff-aclarar-ambiguedades',
      agentId: 'talia',
      goal: 'Si hay ambigüedades críticas (ej: meta sin número, evento sin fecha), preguntar al usuario antes de avanzar. Si todo está claro, continuar.',
      dependsOn: ['kickoff-parsear-intent'],
      checkpointType: 'human_review',
      checkpointDescription: 'Confirmar interpretación del intent con el usuario',
    },
    {
      id: 'kickoff-crear-metas',
      agentId: 'talia',
      goal: 'Crear metas en el goalManager con horizontes correctos. Si hay meta anual, hacer cascade automático a trimestrales y mensuales.',
      dependsOn: ['kickoff-aclarar-ambiguedades'],
    },
    {
      id: 'kickoff-descomponer-tareas',
      agentId: 'talia',
      goal: 'Para cada meta semanal/mensual, ejecutar decomposeGoalIntoTasks. Las tareas se asignan automáticamente a Nova, Lía, Scout, Pixel, Luca, etc.',
      dependsOn: ['kickoff-crear-metas'],
    },
    {
      id: 'kickoff-cargar-calendario',
      agentId: 'talia',
      goal: 'Registrar los eventos detectados (lanzamientos, campañas, fechas clave) en el calendarBoard. Para cada evento, generar tareas de preparación automáticamente.',
      dependsOn: ['kickoff-aclarar-ambiguedades'],
    },
    {
      id: 'kickoff-aplicar-restricciones',
      agentId: 'gard',
      goal: 'Aplicar las restricciones detectadas: blackout dates, anti-temas, frecuencias máximas. Configurar también events_configure si hay reglas de comunicación.',
      dependsOn: ['kickoff-parsear-intent'],
    },
    {
      id: 'kickoff-entregar-plan',
      agentId: 'talia',
      goal: 'Construir el acknowledgment final: qué entendí, qué metas creé, qué tareas asigné a cada agente del equipo, qué eventos están en el calendario, qué pasa ahora. Enviar al usuario por canal preferido.',
      dependsOn: ['kickoff-crear-metas', 'kickoff-descomponer-tareas', 'kickoff-cargar-calendario'],
    },
  ],
  maxGlobalIterations: 30,
};

// ── Workflow: Brand Interview (descubrimiento de marca) ──────────────────────

export const WORKFLOW_BRAND_INTERVIEW: PlaybookDefinition = {
  id: 'ig-brand-interview',
  name: 'Entrevista de Marca (9 preguntas)',
  description:
    'Conduce la entrevista de 9 preguntas estructuradas para construir el brand brief completo de una marca nueva o relanzamiento. Actualiza BrandProfile al final.',
  tasks: [
    {
      id: 'brand-interview-start',
      agentId: 'talia',
      goal: 'Iniciar la entrevista de marca (startInterview). Presentarse como el especialista de branding del usuario y explicar el proceso: 9 preguntas, 15-20 min, respuestas que se pueden refinar.',
    },
    {
      id: 'brand-interview-conduct',
      agentId: 'talia',
      goal: 'Conducir las 9 preguntas una por una. Para cada respuesta: scoring automático, si score < 60 usar follow-up. Persistir cada respuesta en el storage.',
      dependsOn: ['brand-interview-start'],
    },
    {
      id: 'brand-interview-consolidate',
      agentId: 'talia',
      goal: 'Consolidar las 9 respuestas en un BrandBrief completo (consolidateInterview). Convertir el brief en BrandProfile con briefToBrandProfile.',
      dependsOn: ['brand-interview-conduct'],
    },
    {
      id: 'brand-interview-review',
      agentId: 'talia',
      goal: 'Presentar al usuario el brief consolidado y pedir confirmación. Ajustar lo que el usuario corrija.',
      dependsOn: ['brand-interview-consolidate'],
      checkpointType: 'human_review',
      checkpointDescription: 'Validar el brand brief consolidado antes de aplicarlo',
    },
    {
      id: 'brand-interview-apply',
      agentId: 'talia',
      goal: 'Aplicar el BrandProfile actualizado. Confirmar al usuario que toda la operación posterior (contenido, diseños, voz) va a respetar el nuevo brief.',
      dependsOn: ['brand-interview-review'],
    },
  ],
  maxGlobalIterations: 35,
};

// ── Workflow: Brand Renewal (renovación de marca) ────────────────────────────

export const WORKFLOW_BRAND_RENEWAL: PlaybookDefinition = {
  id: 'ig-brand-renewal',
  name: 'Renovación de Marca',
  description:
    'Audita la salud de la marca actual, propone evolución (visual / voz / posicionamiento) y ejecuta la renovación con nuevos assets visuales.',
  tasks: [
    {
      id: 'renewal-audit',
      agentId: 'scout',
      goal: 'Ejecutar auditBrand: evaluar fatiga, posicionamiento, voz, visual. Detectar señales como declining engagement, topic saturation, visual monotony.',
    },
    {
      id: 'renewal-propose',
      agentId: 'talia',
      goal: 'Si el audit recomienda evolucionar (no "mantener"), generar propuesta con proposeEvolution: cambios concretos en posicionamiento/voz/visual, rollout en 3-4 fases, riesgos y mitigaciones.',
      dependsOn: ['renewal-audit'],
    },
    {
      id: 'renewal-human-approve',
      agentId: 'talia',
      goal: 'Presentar la propuesta al usuario con explicación detallada. Esperar aprobación o ajustes.',
      dependsOn: ['renewal-propose'],
      checkpointType: 'human_review',
      checkpointDescription: 'Aprobar propuesta de renovación de marca antes de ejecutar',
    },
    {
      id: 'renewal-generate-assets',
      agentId: 'pixel',
      goal: 'Ejecutar generateRenewalAssets: nuevo profile photo, set de highlight covers, style board. Entregar URLs al usuario para review.',
      dependsOn: ['renewal-human-approve'],
    },
    {
      id: 'renewal-rollout-content',
      agentId: 'nova',
      goal: 'Adaptar la voz/tono en próximas piezas según la propuesta. Generar 3 posts de "transición" que comuniquen el cambio sin estridencia.',
      dependsOn: ['renewal-generate-assets'],
    },
    {
      id: 'renewal-comunicacion',
      agentId: 'talia',
      goal: 'Publicar el post de anuncio de renovación de marca con honestidad: por qué cambia, qué queda, qué evoluciona. Configurar boost post-publicación.',
      dependsOn: ['renewal-rollout-content'],
    },
    {
      id: 'renewal-monitor-impact',
      agentId: 'analytics',
      goal: 'Monitorear los próximos 30 días: engagement rate, follower delta, sentimiento de comentarios. Reportar impacto vs predicción.',
      dependsOn: ['renewal-comunicacion'],
    },
  ],
  maxGlobalIterations: 50,
};

// ── Workflow: Auto Design (producción visual a escala) ───────────────────────

export const WORKFLOW_AUTO_DESIGN: PlaybookDefinition = {
  id: 'ig-auto-design',
  name: 'Diseño Automático con AI',
  description:
    'Genera piezas visuales profesionales con Fal.ai siguiendo principios de composición, tipografía y color del KB de diseñador.',
  tasks: [
    {
      id: 'design-brief',
      agentId: 'pixel',
      goal: 'Construir el brief visual: target (feed/reel/carousel/story), concepto, mood, text overlay, paleta de marca, estilo. Usar buildPromptFromBrief.',
    },
    {
      id: 'design-generate',
      agentId: 'pixel',
      goal: 'Llamar a generateDesign con el brief. Si es carrusel, usar generateCarouselDeliverable para producir todas las slides con copy + visual coherentes.',
      dependsOn: ['design-brief'],
    },
    {
      id: 'design-audit',
      agentId: 'pixel',
      goal: 'Auditar las variantes generadas con auditDesign. Si alguna tiene score < 70, regenerar con feedback.',
      dependsOn: ['design-generate'],
    },
    {
      id: 'design-deliver',
      agentId: 'talia',
      goal: 'Entregar al usuario las URLs de las piezas finales con su costUsd, prompt usado y score de calidad. Si está conforme, registrar para publicación.',
      dependsOn: ['design-audit'],
    },
  ],
  maxGlobalIterations: 20,
};

// ── Workflow: Cross-Platform Publishing (publicar en N redes a la vez) ─────

export const WORKFLOW_CROSS_PLATFORM_PUBLISH: PlaybookDefinition = {
  id: 'ig-cross-platform-publish',
  name: 'Publicación Cross-Platform',
  description:
    'Publica una pieza en Instagram + LinkedIn + X + TikTok + Threads vía Upload-Post, adaptando caption a cada plataforma. Funciona desde server (dispositivo apagado).',
  tasks: [
    {
      id: 'publish-prepare-asset',
      agentId: 'pixel',
      goal: 'Asegurar que el asset visual está disponible como URL pública (subir si está en local). Adaptar formato si la plataforma lo requiere (ej: video horizontal para LinkedIn).',
    },
    {
      id: 'publish-adapt-captions',
      agentId: 'nova',
      goal: 'Tomar el caption original y adaptarlo a cada plataforma usando adaptCaptionFor: Instagram (full), X (280 chars), LinkedIn (largo profesional), Threads (500), TikTok (hashtags). Verificar límites con validateAll.',
      dependsOn: ['publish-prepare-asset'],
    },
    {
      id: 'publish-confirm',
      agentId: 'talia',
      goal: 'Mostrar al usuario: asset visual + caption por plataforma + horario sugerido. Pedir confirmación.',
      dependsOn: ['publish-adapt-captions'],
      checkpointType: 'human_review',
      checkpointDescription: 'Confirmar publicación cross-platform antes de ejecutar',
    },
    {
      id: 'publish-execute',
      agentId: 'talia',
      goal: 'Llamar a uploadToSocial con el payload completo (todas las plataformas). Funciona desde server, no requiere dispositivo abierto. Recibir uploadId.',
      dependsOn: ['publish-confirm'],
    },
    {
      id: 'publish-monitor',
      agentId: 'analytics',
      goal: 'Trackear getUploadStatus hasta que todas las plataformas confirmen "posted". Si alguna falla, alertar.',
      dependsOn: ['publish-execute'],
    },
    {
      id: 'publish-post-boost',
      agentId: 'talia',
      goal: 'En Instagram específicamente: llamar a boost_schedule inmediatamente después de confirmada la publicación para activar la ventana del algoritmo (anchor comment, community prime, beacon).',
      dependsOn: ['publish-execute'],
    },
  ],
  maxGlobalIterations: 25,
};

// ── Workflow: Canva → Instagram (cursor moviéndose visualmente) ─────────────

export const WORKFLOW_CANVA_TO_INSTAGRAM: PlaybookDefinition = {
  id: 'ig-canva-to-instagram',
  name: 'Canva → Instagram (Computer Use)',
  description:
    'Pipeline end-to-end: abre Chrome → entra a Canva → busca template → diseña con el cursor moviéndose → exporta → publica en Instagram. El usuario ve todo en tiempo real (live session) y queda registrado en replay log.',
  tasks: [
    {
      id: 'canva-replay-start',
      agentId: 'pixel',
      goal: 'Iniciar sesión de replay con startReplaySession para que cada paso quede registrado con screenshots. Suscribir al usuario al live SSE feed para que vea el cursor en tiempo real.',
    },
    {
      id: 'canva-launch-browser',
      agentId: 'pixel',
      goal: 'Llamar a openCanva (o launchApp con chrome y URL https://canva.com). Esperar 5s para que cargue. Verificar con screenshot que estamos en Canva.',
      dependsOn: ['canva-replay-start'],
    },
    {
      id: 'canva-search-template',
      agentId: 'pixel',
      goal: 'Usar runComputerUseSession para: hacer clic en la barra de búsqueda de Canva, escribir la query del template (ej: "Instagram post motivacional minimalista"), elegir el primer template profesional y abrirlo en el editor.',
      dependsOn: ['canva-launch-browser'],
    },
    {
      id: 'canva-customize',
      agentId: 'pixel',
      goal: 'Customizar el template con textos, colores e imágenes de la marca: doble clic en cada texto y reemplazar; aplicar paleta brand.visual.palette; reemplazar imágenes con búsqueda de stock o upload de archivo de marca.',
      dependsOn: ['canva-search-template'],
    },
    {
      id: 'canva-tone-check-on-design-texts',
      agentId: 'gard',
      goal: 'Cada texto agregado al diseño pasa por cm_tone_guard con context "story-text" para asegurar consistencia tonal con la marca.',
      dependsOn: ['canva-customize'],
    },
    {
      id: 'canva-export',
      agentId: 'pixel',
      goal: 'Hacer clic en Share / Download → elegir PNG quality high → hacer clic en Download. Esperar a que el archivo aparezca en ~/Downloads.',
      dependsOn: ['canva-tone-check-on-design-texts'],
    },
    {
      id: 'canva-file-register',
      agentId: 'pixel',
      goal: 'Llamar a captureLatestDownload con extension png. Validar con validateAsset que cumple specs de Instagram (1080x1080, <30MB, formato OK). Mover a data/assets/designs.',
      dependsOn: ['canva-export'],
    },
    {
      id: 'canva-generate-caption',
      agentId: 'nova',
      goal: 'Generar caption + hashtags + CTA para el diseño usando generateFullCaption del tokenRouter. Pasar por cm_tone_guard con context "caption" antes de avanzar.',
      dependsOn: ['canva-file-register'],
    },
    {
      id: 'canva-checkpoint-approve',
      agentId: 'talia',
      goal: 'Mostrar al usuario: preview del diseño + caption + hashtags + horario sugerido. Esperar aprobación humana antes de publicar.',
      dependsOn: ['canva-generate-caption'],
      checkpointType: 'human_review',
      checkpointDescription: 'Aprobar diseño + caption antes de publicar en Instagram',
    },
    {
      id: 'canva-publish-to-instagram',
      agentId: 'talia',
      goal: 'Publicar: opción A) Upload-Post API (server, device puede estar off) o B) Computer Use abriendo IG con publicarPost y arrastrando el archivo. Default: Upload-Post para no requerir display abierto.',
      dependsOn: ['canva-checkpoint-approve'],
    },
    {
      id: 'canva-schedule-boost',
      agentId: 'max',
      goal: 'INMEDIATAMENTE después de publicar, llamar a boost_schedule para activar la ventana de algoritmo (anchor comment, community prime, beacon engagement, métricas T+120min).',
      dependsOn: ['canva-publish-to-instagram'],
    },
    {
      id: 'canva-replay-end',
      agentId: 'pixel',
      goal: 'Cerrar la sesión de replay con endReplaySession outcome=success. Generar narrativa con generateNarrative y enviársela al usuario como resumen del workflow ejecutado.',
      dependsOn: ['canva-schedule-boost'],
    },
  ],
  maxGlobalIterations: 80,
};

// ── Workflow: Multi-Carousel Canva (varias slides con cursor) ───────────────

export const WORKFLOW_CANVA_CAROUSEL: PlaybookDefinition = {
  id: 'ig-canva-carousel',
  name: 'Carrusel Completo via Canva (N slides)',
  description:
    'Diseña un carrusel de N slides en Canva (cada una customizada coherentemente), las exporta todas, las junta y publica como carrusel en Instagram.',
  tasks: [
    {
      id: 'carousel-plan-slides',
      agentId: 'nova',
      goal: 'Generar el plan del carrusel: N slides con title + body + visualConcept cada una. Slide 1=portada hook, slides intermedios=valor, slide N=CTA. Usar design_carousel del graphicDesigner para definir designSystem.',
    },
    {
      id: 'carousel-design-each-slide',
      agentId: 'pixel',
      goal: 'Iterar sobre las slides planificadas. Para cada una, llamar a createCarouselSlide del canvaStudio que abre Canva, busca template, customiza con el title/body, exporta PNG. Mantener consistencia visual entre slides.',
      dependsOn: ['carousel-plan-slides'],
    },
    {
      id: 'carousel-validate-set',
      agentId: 'pixel',
      goal: 'Validar que todas las slides están exportadas, tienen mismas dimensiones (1080x1080) y son coherentes visualmente. Si falla alguna, regenerar.',
      dependsOn: ['carousel-design-each-slide'],
    },
    {
      id: 'carousel-generate-caption',
      agentId: 'nova',
      goal: 'Caption del carrusel completo + hashtags. Mencionar "deslizá →" para invitar al swipe.',
      dependsOn: ['carousel-validate-set'],
    },
    {
      id: 'carousel-publish',
      agentId: 'talia',
      goal: 'Publicar las N slides como carrusel en Instagram via Upload-Post (platforms=instagram, mediaType=carousel, mediaUrls=array de paths). Aplicar boost después.',
      dependsOn: ['carousel-generate-caption'],
      checkpointType: 'human_review',
      checkpointDescription: 'Aprobar el carrusel completo antes de publicar',
    },
  ],
  maxGlobalIterations: 100,
};

// ── Workflow: CM Replacement (reemplazo total del Community Manager) ────────

export const WORKFLOW_CM_REPLACEMENT: PlaybookDefinition = {
  id: 'ig-cm-replacement',
  name: 'Community Manager Replacement (Full)',
  description:
    'Workflow integral que reemplaza 100% al CM humano: inbox + soporte + FAQ + leads + UGC + menciones + bienvenidas + stories diarias + reconocimiento de fans. Diseñado para correr autonomamente y cubrir todas las funciones de un CM senior.',
  tasks: [
    {
      id: 'cm-inbox-triage',
      agentId: 'lia',
      goal: 'Procesar el DM Inbox: triage de conversaciones nuevas, clasificar intent, generar respuestas con suggestReply usando contexto multi-turn. Auto-responder con confidence >= 0.7 si no requiere humano. Escalar las críticas.',
    },
    {
      id: 'cm-support-cases',
      agentId: 'lia',
      goal: 'Para conversaciones con intent "soporte" o "comercial", abrir caso en customerSupport con openCaseFromConversation. Avanzar cada caso activo con advanceSupportCase. Respetar SLA por flow type.',
      dependsOn: ['cm-inbox-triage'],
    },
    {
      id: 'cm-faq-match',
      agentId: 'lia',
      goal: 'Antes de generar respuesta custom, intentar matchear con FAQ existente usando tryAnswerWithFAQ. Si hay match con confidence >= 0.7, usar respuesta FAQ personalizada. Si no, generar respuesta nueva y candidatear como nueva FAQ después.',
      dependsOn: ['cm-inbox-triage'],
    },
    {
      id: 'cm-lead-qualify',
      agentId: 'luca',
      goal: 'Para conversaciones con intent "comercial", crear lead con createLead. Extraer BANT automáticamente, scoring 0-100. Si es hot, agendar follow-up en 3 días. Si warm, en 7 días. Si cold, agregar a nurture.',
      dependsOn: ['cm-inbox-triage'],
    },
    {
      id: 'cm-mentions-acknowledge',
      agentId: 'lia',
      goal: 'Procesar menciones nuevas: para positivas, comentar/agradecer públicamente; para negativas, abrir caso de soporte; para influencers (>10k), alertar al usuario. Auto-promover a UGC las menciones positivas con media.',
    },
    {
      id: 'cm-ugc-permissions',
      agentId: 'vero',
      goal: 'Para UGC con qualityScore >= 60 en stage "detected", enviar pedido de permiso para repostear con requestRepostPermission. Si hay permisos otorgados, generar caption con generateRepostCaption y publicar. Mandar thank-you post-repost.',
      dependsOn: ['cm-mentions-acknowledge'],
    },
    {
      id: 'cm-welcome-new-followers',
      agentId: 'lia',
      goal: 'Procesar la queue de nuevos seguidores con processNewFollowersQueue. Generar bienvenida personalizada y enviar DM auténtico (no template). Marcar como welcomeSent.',
    },
    {
      id: 'cm-stories-daily',
      agentId: 'nova',
      goal: 'Si no se publicaron 3 stories hoy, ejecutar planDailyStories: 1 engagement (mañana) + 1 valor educativo (mediodía) + 1 community/BTS (noche). Cada secuencia con stickers interactivos (poll/question/quiz).',
    },
    {
      id: 'cm-tone-guard',
      agentId: 'gard',
      goal: 'Antes de cualquier respuesta auto-generada saliendo, pasar el texto por guardOutput con minScore 70. Si no pasa, reescribir o escalar a humano.',
    },
    {
      id: 'cm-fan-recognition',
      agentId: 'lia',
      goal: 'Detectar fans churning (detectChurningFans) y enviar reengagement DM. Identificar fan de la semana (proposeFanOfTheWeek) y preparar shoutout en story.',
    },
    {
      id: 'cm-followups',
      agentId: 'luca',
      goal: 'Procesar follow-ups del lead pipeline con processFollowUpsDue. Cada follow-up se genera contextualizado, no template, considerando objections y promises pasadas.',
    },
    {
      id: 'cm-snapshot-report',
      agentId: 'analytics',
      goal: 'Generar snapshot del estado de la comunidad: getInboxSnapshot + getSupportSnapshot + getFAQSnapshot + getPipelineSnapshot + getMentionsSnapshot + getFanSnapshot. Enviar al usuario si hay algo crítico (slaBreaches, hot leads, mentions negativas).',
      dependsOn: [
        'cm-inbox-triage',
        'cm-support-cases',
        'cm-lead-qualify',
        'cm-mentions-acknowledge',
        'cm-fan-recognition',
      ],
    },
  ],
  maxGlobalIterations: 80,
};

// ── Workflow: Daily Stories Production ───────────────────────────────────────

export const WORKFLOW_DAILY_STORIES: PlaybookDefinition = {
  id: 'ig-daily-stories',
  name: 'Producción Diaria de Stories',
  description:
    'Genera y publica 3-5 stories al día con interactividad (polls, questions, quizzes) para mantener la cuenta visible en el top del algoritmo.',
  tasks: [
    {
      id: 'stories-plan',
      agentId: 'nova',
      goal: 'Ejecutar planDailyStories para el brand actual: 3 secuencias con intents distintos (engagement, value, community) para distribuir a lo largo del día.',
    },
    {
      id: 'stories-generate-visuals',
      agentId: 'pixel',
      goal: 'Para cada secuencia planificada, asegurar que los visuales se generaron con Fal.ai. Si falló alguno, regenerar con buildPromptFromBrief.',
      dependsOn: ['stories-plan'],
    },
    {
      id: 'stories-polls-suggest',
      agentId: 'lia',
      goal: 'Para cada slide con role "interaction", verificar que tiene sticker apropiado. Si necesita poll/quiz, generar con generatePoll del PollQuizEngine.',
      dependsOn: ['stories-generate-visuals'],
    },
    {
      id: 'stories-tone-check',
      agentId: 'gard',
      goal: 'Pasar cada texto overlay de cada slide por guardOutput. Asegurar coherencia tonal.',
      dependsOn: ['stories-polls-suggest'],
    },
    {
      id: 'stories-publish',
      agentId: 'talia',
      goal: 'Programar las 3 secuencias con publishSequence en los horarios óptimos del día (10am, 14h, 19h). Funciona desde server via Upload-Post.',
      dependsOn: ['stories-tone-check'],
    },
  ],
  maxGlobalIterations: 25,
};

// ── Workflow: FAQ Mining (semanal) ───────────────────────────────────────────

export const WORKFLOW_FAQ_MINING: PlaybookDefinition = {
  id: 'ig-faq-mining',
  name: 'Detección y Curación de FAQ',
  description:
    'Cada semana analiza el histórico de DMs/comentarios y detecta nuevas preguntas frecuentes. Genera draft de respuesta y deja pendiente de aprobación humana.',
  tasks: [
    {
      id: 'faq-detect-patterns',
      agentId: 'scout',
      goal: 'Ejecutar detectFAQPatterns para identificar nuevas preguntas recurrentes desde el histórico de conversaciones del DM Inbox.',
    },
    {
      id: 'faq-propose-answers',
      agentId: 'nova',
      goal: 'Para cada pattern detectado, ejecutar proposeFAQFromPattern: generar la respuesta canónica + variaciones de la pregunta + categoría. Dejar pendiente como draftEntry.',
      dependsOn: ['faq-detect-patterns'],
    },
    {
      id: 'faq-human-approve',
      agentId: 'talia',
      goal: 'Presentar al usuario los drafts FAQ generados para validación. Aplicar approveAndAddFAQ para los aprobados.',
      dependsOn: ['faq-propose-answers'],
      checkpointType: 'human_review',
      checkpointDescription: 'Aprobar respuestas FAQ generadas antes de usarlas en auto-replies',
    },
    {
      id: 'faq-update-bank',
      agentId: 'talia',
      goal: 'Confirmar al usuario qué FAQs nuevas se agregaron al banco. A partir de ahora, esas respuestas se usarán automáticamente en DMs/comentarios que matcheen.',
      dependsOn: ['faq-human-approve'],
    },
  ],
  maxGlobalIterations: 20,
};

// ── Índice de workflows por intención ─────────────────────────────────────────

const WORKFLOW_INDEX: Record<string, PlaybookDefinition> = {
  crecimiento: WORKFLOW_CRECIMIENTO_SEMANAL,
  'crecimiento-semanal': WORKFLOW_CRECIMIENTO_SEMANAL,
  'growth-sprint': WORKFLOW_GROWTH_SPRINT,
  sprint: WORKFLOW_GROWTH_SPRINT,
  'crecer-rapido': WORKFLOW_GROWTH_SPRINT,
  acelerar: WORKFLOW_GROWTH_SPRINT,
  produccion: WORKFLOW_PRODUCCION_DIARIA,
  contenido: WORKFLOW_PRODUCCION_DIARIA,
  comunidad: WORKFLOW_GESTION_COMUNIDAD,
  gestion: WORKFLOW_GESTION_COMUNIDAD,
  competidores: WORKFLOW_ANALISIS_COMPETENCIA,
  competencia: WORKFLOW_ANALISIS_COMPETENCIA,
  crisis: WORKFLOW_RESPUESTA_CRISIS,
  campaña: WORKFLOW_LANZAMIENTO_CAMPAÑA,
  lanzamiento: WORKFLOW_LANZAMIENTO_CAMPAÑA,
  auditoria: WORKFLOW_AUDITORIA_MENSUAL,
  'auditoria-mensual': WORKFLOW_AUDITORIA_MENSUAL,
  onboarding: WORKFLOW_ONBOARDING_CUENTA,
  'cuenta-nueva': WORKFLOW_ONBOARDING_CUENTA,
  kickoff: WORKFLOW_KICKOFF_LUNES,
  'kickoff-lunes': WORKFLOW_KICKOFF_LUNES,
  lunes: WORKFLOW_KICKOFF_LUNES,
  'planificacion-semanal': WORKFLOW_KICKOFF_LUNES,
  objetivos: WORKFLOW_KICKOFF_LUNES,
  'brand-interview': WORKFLOW_BRAND_INTERVIEW,
  'entrevista-marca': WORKFLOW_BRAND_INTERVIEW,
  'nueva-marca': WORKFLOW_BRAND_INTERVIEW,
  'brand-renewal': WORKFLOW_BRAND_RENEWAL,
  'renovacion-marca': WORKFLOW_BRAND_RENEWAL,
  rebrand: WORKFLOW_BRAND_RENEWAL,
  'evolucion-marca': WORKFLOW_BRAND_RENEWAL,
  'auto-design': WORKFLOW_AUTO_DESIGN,
  diseñar: WORKFLOW_AUTO_DESIGN,
  diseno: WORKFLOW_AUTO_DESIGN,
  imagen: WORKFLOW_AUTO_DESIGN,
  'carrusel-diseno': WORKFLOW_AUTO_DESIGN,
  'cross-platform': WORKFLOW_CROSS_PLATFORM_PUBLISH,
  'publicar-redes': WORKFLOW_CROSS_PLATFORM_PUBLISH,
  'multi-red': WORKFLOW_CROSS_PLATFORM_PUBLISH,
  'cm-replacement': WORKFLOW_CM_REPLACEMENT,
  'community-manager': WORKFLOW_CM_REPLACEMENT,
  'reemplazar-cm': WORKFLOW_CM_REPLACEMENT,
  'gestionar-comunidad': WORKFLOW_CM_REPLACEMENT,
  'daily-stories': WORKFLOW_DAILY_STORIES,
  'stories-diarias': WORKFLOW_DAILY_STORIES,
  'producir-stories': WORKFLOW_DAILY_STORIES,
  'faq-mining': WORKFLOW_FAQ_MINING,
  'detectar-faq': WORKFLOW_FAQ_MINING,
  'curar-faq': WORKFLOW_FAQ_MINING,
  'canva-to-instagram': WORKFLOW_CANVA_TO_INSTAGRAM,
  'diseñar-en-canva': WORKFLOW_CANVA_TO_INSTAGRAM,
  'cursor-canva': WORKFLOW_CANVA_TO_INSTAGRAM,
  'canva-y-publicar': WORKFLOW_CANVA_TO_INSTAGRAM,
  'canva-carousel': WORKFLOW_CANVA_CAROUSEL,
  'carrusel-canva': WORKFLOW_CANVA_CAROUSEL,
};

/**
 * Retorna el workflow más relevante para una intención dada.
 */
export const getWorkflowByIntent = (intent: string): PlaybookDefinition | null => {
  const normalized = intent
    .toLowerCase()
    .trim()
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u')
    .replace(/ñ/g, 'n');

  for (const [key, workflow] of Object.entries(WORKFLOW_INDEX)) {
    if (normalized.includes(key)) return workflow;
  }

  return null;
};

/**
 * Lista todos los workflows disponibles.
 */
export const listWorkflows = (): Array<{ id: string; name: string; description: string; taskCount: number }> =>
  Object.values(WORKFLOW_INDEX)
    .filter((w, i, arr) => arr.findIndex((x) => x.id === w.id) === i) // deduplicar
    .map((w) => ({
      id: w.id,
      name: w.name,
      description: w.description,
      taskCount: w.tasks.length,
    }));

/**
 * Genera un workflow dinámico personalizado usando IA para un objetivo específico.
 * Útil cuando ningún workflow predefinido encaja exactamente.
 */
export const buildDynamicWorkflow = async (objetivo: string, brand: BrandProfile): Promise<PlaybookDefinition> => {
  const prompt = `Sos un experto en Instagram y gestión de redes sociales. Creá un workflow de agentes de IA para este objetivo:

MARCA: ${brand.name}
OBJETIVO: ${objetivo}

AGENTES DISPONIBLES:
- talia: orquestadora, estrategia general, planificación
- nova: creación de contenido (captions, scripts, carruseles, Reels)
- scout: investigación (competidores, tendencias, hashtags, audiencia)
- lia: gestión de comunidad (comentarios, DMs, engagement)
- luca: ventas y leads (calificación, seguimiento, conversión)
- gard: compliance, moderación, protección de marca
- pixel: diseño y producción visual (briefs, identidad, Canva)
- analytics: análisis de métricas, KPIs, reportes
- max: optimización de conversión y growth hacking
- vero: gestión de UGC y colaboraciones

Creá el workflow en formato JSON exactamente así:
{
  "id": "custom-workflow-[timestamp]",
  "name": "Nombre del workflow",
  "description": "Descripción breve",
  "tasks": [
    {
      "id": "task-id-unico",
      "agentId": "id-del-agente",
      "goal": "Instrucción detallada para el agente (2-5 líneas con pasos específicos)",
      "dependsOn": ["id-tarea-anterior"] // opcional
    }
  ],
  "maxGlobalIterations": 40
}

El workflow debe tener 5-10 tareas ordenadas lógicamente con dependencias correctas.
Ser específico y accionable. Incluir checkpoints humanos donde haya decisiones importantes (agregar checkpointType: "human_review" y checkpointDescription).`;

  const result = await routerAsk(prompt, {
    taskType: 'strategy',
    systemPrompt: 'Respondé SOLO con JSON válido, sin markdown ni texto adicional.',
  });

  try {
    const clean = result.text
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const workflow = JSON.parse(clean) as PlaybookDefinition;
    // Asegurar un ID único
    workflow.id = `custom-${Date.now()}`;
    return workflow;
  } catch {
    // Si falla el parsing, retornar un workflow genérico de análisis
    return {
      id: `custom-${Date.now()}`,
      name: `Workflow: ${objetivo.slice(0, 50)}`,
      description: objetivo,
      tasks: [
        {
          id: 'analizar',
          agentId: 'talia',
          goal: `Analizar y planificar la ejecución del siguiente objetivo en Instagram: ${objetivo}. Generar un plan detallado con pasos específicos y métricas de éxito.`,
        },
        {
          id: 'ejecutar',
          agentId: 'talia',
          goal: `Basándote en el análisis anterior, ejecutar el plan para: ${objetivo}. Usar los agentes del equipo según corresponda.`,
          dependsOn: ['analizar'],
        },
      ],
      maxGlobalIterations: 20,
    };
  }
};
