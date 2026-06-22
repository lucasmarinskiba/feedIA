export default {
  lang: 'es-AR',
  name: 'Español (Argentina)',
  // Sistema
  system_name: 'FeedIA',
  agent_name: 'Talía',
  // Activación
  wake_prompt: 'Decí "Hola Talía" para activar el modo manos libres',
  wake_activated: '¡Acá estoy! ¿Qué necesitás?',
  wake_deactivated: '¡Hasta luego! Llamame cuando me necesitás.',
  // Comandos
  cmd_grow: 'Crecer cuenta',
  cmd_content: 'Crear contenido',
  cmd_analytics: 'Ver métricas',
  cmd_dms: 'Revisar DMs',
  cmd_autopilot: 'Modo automático',
  cmd_help: '¿Qué podés hacer?',
  cmd_stop: 'Detener',
  // Respuestas comunes
  processing: 'Procesando tu solicitud...',
  done: '¡Listo!',
  error: 'Algo salió mal. Revisá los logs.',
  checkpoint_required: 'Esta acción requiere tu aprobación antes de continuar.',
  // Onboarding
  onboarding_welcome: '¡Bienvenido a FeedIA! Soy Talía, tu agente de Instagram.',
  onboarding_setup: 'Primero configuremos tu cuenta.',
  // Agentes
  agent_types_title: 'Tipos de agentes IA',
  agent_manager: 'Gerente de Agentes',
  // Métricas
  metrics_saves: 'Guardados',
  metrics_shares: 'Compartidos',
  metrics_reach: 'Alcance',
  metrics_engagement: 'Engagement',
  metrics_followers: 'Seguidores',
  // Contenido
  content_carousel: 'Carrusel',
  content_reel: 'Reel',
  content_story: 'Historia',
  content_caption: 'Caption',
  // Estado del sistema
  os_running: 'Sistema FeedIA en funcionamiento',
  os_agents_active: 'agentes activos',
  os_last_run: 'Última ejecución',
  // Proveedores IA
  provider_primary: 'Proveedor principal',
  provider_fallback: 'Proveedor alternativo',
  provider_free: 'gratuito',
  provider_local: 'local (sin internet)',
} as const;
