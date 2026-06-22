import { AGENTS as DashboardAgents } from './definitions.js';
import { PRODUCTION_AGENTS } from './productionAgents.js';
import { registerAgent } from '../../agent/registry.js';

/**
 * Register existing dashboard-oriented agents into the orchestration registry
 * so they can be used by playbooks and the orchestrator.
 */
export const registerDashboardAgents = (): void => {
  for (const da of DashboardAgents) {
    registerAgent({
      id: da.id,
      name: da.name,
      emoji: da.emoji,
      gradient: da.gradient,
      tagline: da.tagline,
      description: da.description,
      specialties: da.specialties,
      systemPrompt: da.systemPrompt,
      // Default tool subset for dashboard agents — they get broad access
      toolNames: [
        'analyze_nicho',
        'generate_hooks',
        'optimizar_retencion',
        'crear_carrusel',
        'crear_reel',
        'crear_stories',
        'crear_caption',
        'crear_faceless_triple',
        'scout_tendencias',
        'validar_angulos',
        'engineer_hooks',
        'comentar_cuentas_faro',
        'plan_fan_nurturing',
        'responder_comentarios_ajenos',
        'moderar_comentarios',
        'analizar_sentimiento',
        'decidir_ab_variant',
        'sugerir_reciclaje_evergreen',
        'planificar_semana',
        'investigar_hashtags',
        'pickear_hashtags',
        'auditar_hashtags',
        'analizar_competidores',
        'comparar_con_competidores',
        'repurpose_long_form',
        'evaluar_ugc',
        'brief_to_publish',
        'autopilot_semanal',
        'enviar_alerta',
        'exportar_calendario_ics',
        'crisis_check',
        'crisis_estado',
        'crisis_reanudar',
        'experimentos_disenar',
        'experimentos_listar',
        'curator_add_source',
        'curator_procesar_todas',
        'curator_backlog',
        'safety_audit',
        'profile_optimizar',
        'nurture_disenar',
        'nurture_listar',
        'localizar_contenido',
        'digest_diario',
        'collab_evaluar',
        'collab_listar',
        'arc_disenar',
        'scheduler_listar_jobs',
        'scheduler_correr_job',
        'ejecutar_playbook',
        'delegar_a_agente',
        'listar_agentes',
        'render_with_engine',
        'run_recipe',
        'evaluate_aesthetic',
        'ethical_audit',
        'adapt_format',
        'generate_asset',
        'curate_moodboard',
        'video_generate_reel',
        'ab_test_start',
        'ab_test_evaluate',
        'ab_test_list',
        'trends_scout_real',
        'competitor_track_real',
        'email_send_notification',
        'account_list',
        'account_set_active',
      ],
      autonomyLevel: 'checkpoint',
      humanCheckpoints: ['publish', 'crisis_response', 'strategy_change'],
      triggers: ['AgentTaskRequest'],
      maxIterations: 10,
      preferFastModel: false,
    });
  }
};

export const registerProductionAgents = (): void => {
  for (const pa of PRODUCTION_AGENTS) {
    registerAgent({
      id: pa.id,
      name: pa.name,
      emoji: pa.emoji,
      gradient: pa.gradient,
      tagline: pa.tagline,
      description: pa.description,
      specialties: pa.specialties,
      systemPrompt: pa.systemPrompt,
      toolNames: pa.toolNames,
      autonomyLevel: pa.autonomyLevel,
      humanCheckpoints: pa.humanCheckpoints as import('../../agent/registry.js').CheckpointType[],
      triggers: ['ContentProductionRequest', 'AgentTaskRequest'],
      maxIterations: 8,
      preferFastModel: pa.id === 'aesthetic-judge' || pa.id === 'ethical-guardian',
    });
  }
};
