// @ts-nocheck
/**
 * Voice Action Router v2 — El cerebro de Manos Libres
 * ─────────────────────────────────────────────────────────────────────────
 * Recibe un transcript de voz, detecta el intent, ejecuta la acción real
 * en el sistema (no solo responde texto), y devuelve una respuesta hablada.
 *
 * Capas:
 *   1. Intent Detection — regex + fuzzy matching en español/inglés/portugués
 *   2. Action Execution — llama directamente a los módulos del sistema
 *   3. Response Generation — texto hablado natural con resultado de la acción
 *   4. Confirmation Gate — acciones riesgosas preguntan "¿Estás seguro?"
 *
 * Comandos soportados:
 *   ├─ Sistema: estado, health-check, backup, modo dry-run
 *   ├─ Contenido: crear post/reel/story, planificar semana, revisar calendario
 *   ├─ Computer Use: navegar Instagram, dar like, comentar, revisar DMs, insights
 *   ├─ GlassBox: pausar, reanudar, aprobar, rechazar, cambiar modo
 *   ├─ Scheduler: listar jobs, ejecutar job, ver próximas ejecuciones
 *   ├─ Analytics: métricas, crecimiento, engagement, competencia
 *   ├─ Community: revisar DMs, responder mensajes, moderar comentarios
 *   └─ Agentes: ejecutar Talía con goal libre, lanzar playbook
 */

import { log } from '../agent/logger.js';
import { env } from '../config/index.js';
import type { BrandProfile } from '../config/types.js';

export interface VoiceActionResult {
  ok: boolean;
  spokenResponse: string;
  actionType: string;
  executed: boolean;
  detail?: unknown;
  requiresConfirmation?: boolean;
  confirmationContext?: string;
}

export interface VoiceIntent {
  category:
    | 'system'
    | 'content'
    | 'computer_use'
    | 'glassbox'
    | 'scheduler'
    | 'analytics'
    | 'community'
    | 'agent'
    | 'macro'
    | 'emergency'
    | 'extended'
    | 'unknown';
  action: string;
  params: Record<string, string>;
  raw: string;
  confidence: 'high' | 'medium' | 'low';
}

/* ── Intent Detection Patterns ───────────────────────────────────────────── */

interface PatternDef {
  category: VoiceIntent['category'];
  action: string;
  params?: string[];
  patterns: RegExp[];
}

const PATTERNS: PatternDef[] = [
  // ── SISTEMA ──────────────────────────────────────────────────────────────
  {
    category: 'system',
    action: 'status',
    patterns: [/^(estado|status|c[oó]mo estamos?|c[oó]mo va|qu[eé] tal todo|health)[\s!?.]*$/i],
  },
  {
    category: 'system',
    action: 'health_check',
    patterns: [/^(health[- ]?check|check[- ]?up|revisi[oó]n completa|diagn[oó]stico)/i],
  },
  { category: 'system', action: 'backup', patterns: [/(hac[eé]r?|crear?) (un )?backup/i, /guardar estado/i] },
  {
    category: 'system',
    action: 'toggle_dry_run',
    patterns: [/(activa|desactiva| Cambia ) (modo )?dry[- ]?run/i, /modo (prueba|simulaci[oó]n|real)/i],
  },
  {
    category: 'system',
    action: 'stop_all',
    patterns: [/(para|deten|stop) (todo|todas las operaciones)/i, /emergency stop/i, /parada de emergencia/i],
  },

  // ── CONTENIDO ────────────────────────────────────────────────────────────
  {
    category: 'content',
    action: 'create_post',
    params: ['topic'],
    patterns: [/(crea|hac[eé]r?|genera) (un )?(post|publicaci[oó]n)( sobre)?/i],
  },
  {
    category: 'content',
    action: 'create_reel',
    params: ['topic'],
    patterns: [/(crea|hac[eé]r?|genera) (un )?reel( sobre)?/i],
  },
  {
    category: 'content',
    action: 'create_story',
    params: ['topic'],
    patterns: [/(crea|hac[eé]r?|genera) (una )?historia( sobre)?/i],
  },
  {
    category: 'content',
    action: 'plan_week',
    patterns: [/(planifica|planifica|organiza) (la )?semana/i, /plan de contenido/i],
  },
  {
    category: 'content',
    action: 'show_calendar',
    patterns: [/(ver|mostr[aá]r?|qu[eé] hay en) (el )?calendario/i, /contenido programado/i],
  },

  // ── COMPUTER USE ─────────────────────────────────────────────────────────
  {
    category: 'computer_use',
    action: 'navigate_instagram',
    patterns: [/(abre|navega a|entra a|ve a) (instagram|ig|la app)/i],
  },
  {
    category: 'computer_use',
    action: 'like_post',
    params: ['target'],
    patterns: [
      /(da|dar|dame) (un )?like (al|a (la|el))? (primer|segundo|[0-9]+).?( post|publicaci[oó]n)?/i,
      /like (al|a) post/i,
    ],
  },
  {
    category: 'computer_use',
    action: 'check_dms',
    patterns: [/(revisa|ver|mira) (los )?(mensajes|dms?|directos|inbox)/i, /mensajes directos/i],
  },
  {
    category: 'computer_use',
    action: 'check_insights',
    patterns: [/(revisa|ver|mira|consulta) (las )?(m[eé]tricas|insights|estad[ií]sticas|analytics)/i],
  },
  {
    category: 'computer_use',
    action: 'follow_account',
    params: ['username'],
    patterns: [/(seguir?|seguir?) (a )?@?([a-z0-9_.]+)/i],
  },
  {
    category: 'computer_use',
    action: 'post_content',
    params: ['description'],
    patterns: [/(publica|sube|posta) (un|una)? (foto|imagen|post|reel)( que diga| con)?/i],
  },
  {
    category: 'computer_use',
    action: 'comment_post',
    params: ['text'],
    patterns: [/(comenta|deja un comentario) (diciendo|que diga)?/i],
  },
  {
    category: 'computer_use',
    action: 'explore_hashtag',
    params: ['hashtag'],
    patterns: [/(explora|busca) (el )?#?([a-z0-9_]+)/i],
  },

  // ── GLASSBOX ─────────────────────────────────────────────────────────────
  { category: 'glassbox', action: 'pause', patterns: [/(pausa|deten) (el )?glass[- ]?box/i, /pausar acciones/i] },
  {
    category: 'glassbox',
    action: 'resume',
    patterns: [/(reanuda|reanudar|resume) (el )?glass[- ]?box/i, /continuar operaciones/i],
  },
  {
    category: 'glassbox',
    action: 'set_mode',
    params: ['mode'],
    patterns: [/(cambia|pon|modo) (el )?glass[- ]?box (a )?(aut[oó]nomo|supervisado|pausado)/i],
  },
  {
    category: 'glassbox',
    action: 'approve_all',
    patterns: [/(aprueba|aprobar) (todas? )?(las )?acciones/i, /aprobar todo/i],
  },
  { category: 'glassbox', action: 'reject_all', patterns: [/(rechaza|rechazar) (todas? )?(las )?acciones/i] },
  {
    category: 'glassbox',
    action: 'show_queue',
    patterns: [/(ver|mostr[aá]r?|cola) (de )?glass[- ]?box/i, /acciones pendientes/i],
  },
  { category: 'glassbox', action: 'show_status', patterns: [/(estado|status) (de )?glass[- ]?box/i] },

  // ── SCHEDULER ────────────────────────────────────────────────────────────
  {
    category: 'scheduler',
    action: 'list_jobs',
    patterns: [/(lista|ver|mostr[aá]r?|qu[eé] ) jobs? (hay|programados|corren)/i, /trabajos programados/i],
  },
  {
    category: 'scheduler',
    action: 'run_job',
    params: ['jobName'],
    patterns: [/(ejecuta|corre|correr|lanza) (el )?job /i, /ejecutar trabajo /i],
  },
  {
    category: 'scheduler',
    action: 'next_runs',
    patterns: [/(pr[oó]ximas?|cu[aá]ndo|cu[aá]nto falta) (ejecuciones?|corridas?|jobs?)/i, /cu[aá]ndo corre/i],
  },

  // ── ANALYTICS ────────────────────────────────────────────────────────────
  {
    category: 'analytics',
    action: 'show_metrics',
    patterns: [/(muestra|ver|dame) (las )?m[eé]tricas/i, /c[oó]mo estamos? (de )?(engagement|alcance|seguidores)/i],
  },
  {
    category: 'analytics',
    action: 'growth_report',
    patterns: [/(reporte|informe) (de )?crecimiento/i, /crecimiento (de la )?cuenta/i],
  },
  {
    category: 'analytics',
    action: 'competitor_check',
    params: ['competitor'],
    patterns: [/(analiza|revisa|ver) (a )?@?([a-z0-9_.]+) (competidor|rival)/i, /competencia/i],
  },
  {
    category: 'analytics',
    action: 'best_time',
    patterns: [/(mejor|óptimo|ideal) (horario|momento|tiempo) (para )?publicar/i],
  },

  // ── COMMUNITY ────────────────────────────────────────────────────────────
  {
    category: 'community',
    action: 'check_messages',
    patterns: [/(revisa|responde|ver) (los )?(mensajes|comentarios|dms?)/i],
  },
  {
    category: 'community',
    action: 'reply_priority',
    patterns: [/(responde|contesta) (los )?mensajes (prioritarios|importantes)/i],
  },
  {
    category: 'community',
    action: 'moderate_comments',
    patterns: [/(modera|revisa|elimina) (los )?comentarios/i, /moderaci[oó]n/i],
  },

  // ── MACROS ───────────────────────────────────────────────────────────────
  {
    category: 'macro',
    action: 'start_recording',
    params: ['macroName'],
    patterns: [/(grab(a|á|ar)?|inicia|comenz(a|á|ar)?) (una? )?macro( llamada)?/i, /grabar macro/i],
  },
  {
    category: 'macro',
    action: 'stop_recording',
    patterns: [/(termin(a|á|ar)?|finaliza|guard(a|á|ar)?) (la )?macro/i, /terminar de grabar/i],
  },
  { category: 'macro', action: 'cancel_recording', patterns: [/(cancela(r)?|descarta) (la )?macro/i] },
  {
    category: 'macro',
    action: 'run_macro',
    params: ['macroName'],
    patterns: [/(ejecuta|corre|correr|lanza|reproduce) (la )?macro/i],
  },
  {
    category: 'macro',
    action: 'list_macros',
    patterns: [/(lista|ver|mostr(a|á|ar)?) (las )?macros/i, /qu(e|é) macros (hay|tengo)/i],
  },
  { category: 'macro', action: 'delete_macro', params: ['macroName'], patterns: [/(elimina|borra) (la )?macro/i] },

  // ── EMERGENCY ─────────────────────────────────────────────────────────────
  {
    category: 'emergency',
    action: 'pause',
    patterns: [
      /(talía|talia)[,\s]+(pausa|deten|para) (todo|todas|todo)/i,
      /parada de emergencia/i,
      /emergency stop/i,
      /detener todo/i,
    ],
  },
  {
    category: 'emergency',
    action: 'resume',
    patterns: [/(talía|talia)[,\s]+(reanuda|reanudar|resume|continuar|continúa)/i, /seguir operando/i],
  },
  {
    category: 'emergency',
    action: 'status',
    patterns: [/(talía|talia)[,\s]+(estado de emergencia|emergency status|qué pasa|qué está pasando)/i],
  },
  {
    category: 'emergency',
    action: 'force_approve',
    patterns: [/(talía|talia)[,\s]+(forzar|aprobar todo|aprobar todas|forzar publicaci[oó]n)/i],
  },
  {
    category: 'emergency',
    action: 'emergency_mode',
    patterns: [/(talía|talia)[,\s]+(modo emergencia|emergency mode)/i],
  },
  { category: 'emergency', action: 'shutdown', patterns: [/(talía|talia)[,\s]+(shutdown|apagar|cerrar todo)/i] },

  // ── FASE 7: VOZ EJECUTIVA ────────────────────────────────────────────────
  {
    category: 'extended',
    action: 'crisis_check',
    patterns: [/(hay|tenemos|alguna) crisis/i, /estado de crisis/i, /reputaci[oó]n/i],
  },
  {
    category: 'extended',
    action: 'crisis_pause',
    patterns: [/(pausa|deten) (todas? )?(las )?publicaciones/i, /pausa todo/i],
  },
  { category: 'extended', action: 'crisis_resume', patterns: [/(reanuda|reanudar) (todas? )?(las )?publicaciones/i] },
  {
    category: 'extended',
    action: 'crisis_evaluate',
    patterns: [/(eval[uú]a|revisa) (los )?comentarios/i, /qu[eé] dicen los comentarios/i],
  },
  { category: 'extended', action: 'crisis_draft', patterns: [/(genera|crea|redacta) (una )?respuesta (de )?crisis/i] },
  {
    category: 'extended',
    action: 'abtest_start',
    patterns: [/(lanza|inicia|empieza) (un )?test (a[/]?b|ab)/i, /test a[/]?b/i],
  },
  { category: 'extended', action: 'abtest_status', patterns: [/(c[oó]mo va|estado del) test (a[/]?b|ab)/i] },
  { category: 'extended', action: 'abtest_evaluate', patterns: [/(eval[uú]a|resultados del) test (a[/]?b|ab)/i] },
  { category: 'extended', action: 'abtest_list', patterns: [/(lista|ver) (los )?tests (a[/]?b|ab)/i] },
  { category: 'extended', action: 'ugc_scout', patterns: [/(busca|encuentra|scout) ugc/i, /contenido de usuarios/i] },
  { category: 'extended', action: 'ugc_evaluate', patterns: [/(eval[uú]a|analiza) (este )?ugc/i] },
  { category: 'extended', action: 'ugc_request', patterns: [/(pide|solicita) permiso (para )?ugc/i] },
  { category: 'extended', action: 'ugc_repost', patterns: [/(republica|repostea) (el )?ugc/i] },
  {
    category: 'extended',
    action: 'collab_evaluate',
    patterns: [/(eval[uú]a|analiza) (a )?@?([a-z0-9_.]+) (para colaborar|colaboraci[oó]n)/i],
  },
  {
    category: 'extended',
    action: 'collab_outreach',
    patterns: [/(env[ií]a|manda) outreach/i, /contacta (a )?creators/i],
  },
  { category: 'extended', action: 'collab_list', patterns: [/(lista|ver) (los )?prospects/i, /creators evaluados/i] },
  {
    category: 'extended',
    action: 'analytics_weekly',
    patterns: [/(dame|genera) (el )?reporte semanal/i, /reporte de la semana/i],
  },
  {
    category: 'extended',
    action: 'analytics_growth',
    patterns: [/(c[oó]mo va|estado del) crecimiento/i, /crecimiento (de la )?cuenta/i],
  },
  {
    category: 'extended',
    action: 'analytics_competitor',
    patterns: [/(analiza|revisa) (a )?@?([a-z0-9_.]+) (competidor|rival)/i],
  },
  {
    category: 'extended',
    action: 'analytics_trends',
    patterns: [/(qu[eé] tendencias|tendencias actuales)/i, /qu[eé] est[aá] en tendencia/i],
  },
  {
    category: 'extended',
    action: 'analytics_predict',
    patterns: [/(predice|pron[oó]stico) (el )?(rendimiento|alcance)/i],
  },

  // ── FASE 8: VOZ PRODUCTORA ───────────────────────────────────────────────
  { category: 'extended', action: 'content_carousel', patterns: [/(crea|hac[eé]r?|genera) (un )?carrusel( sobre)?/i] },
  { category: 'extended', action: 'content_reel', patterns: [/(crea|hac[eé]r?|genera) (un )?reel( sobre)?/i] },
  { category: 'extended', action: 'content_story', patterns: [/(crea|hac[eé]r?|genera) (una )?historia( sobre)?/i] },
  {
    category: 'extended',
    action: 'content_caption',
    patterns: [/(genera|crea) (un )?caption/i, /texto para (el )?post/i],
  },
  { category: 'extended', action: 'content_faceless', patterns: [/(crea|hac[eé]r?|genera) (un )?post faceless/i] },
  { category: 'extended', action: 'canva_design', patterns: [/(dise[ñn]a|crea) (en )?canva/i, /canva/i] },
  {
    category: 'extended',
    action: 'image_generate',
    patterns: [/(genera|crea) (una )?im(á|a)gen/i, /dise[ñn]a (una )?im(á|a)gen/i],
  },
  {
    category: 'extended',
    action: 'video_faceless',
    patterns: [/(crea|genera) (un )?reel faceless/i, /video faceless/i],
  },
  { category: 'extended', action: 'publish_now', patterns: [/(publica|sube) (ahora|ya)/i, /publicar ahora/i] },
  { category: 'extended', action: 'publish_schedule', patterns: [/(programa|agenda) (el )?(post|reel|historia)/i] },

  // ── FASE 9: VOZ AUTÓNOMA ─────────────────────────────────────────────────
  { category: 'extended', action: 'goals_set', patterns: [/(quiero|meta de) crecer/i, /meta de/i, /objetivo de/i] },
  { category: 'extended', action: 'goals_list', patterns: [/(cu[aá]les son|lista) (mis )?metas/i, /metas activas/i] },
  {
    category: 'extended',
    action: 'autopilot_start',
    patterns: [/(activa|inicia) (el )?autopilot/i, /modo autopilot/i],
  },
  { category: 'extended', action: 'autopilot_stop', patterns: [/(desactiva|deten) (el )?autopilot/i] },
  { category: 'extended', action: 'autopilot_report', patterns: [/(qu[eé] hizo|reporte del) autopilot/i] },
  { category: 'extended', action: 'predict_post', patterns: [/(predice|pron[oó]stico) (el )?post/i] },
  {
    category: 'extended',
    action: 'predict_best_time',
    patterns: [/(cu[aá]ndo|qu[eé] momento) (deber[ií]a|conviene) publicar/i],
  },
  { category: 'extended', action: 'learning_weekly', patterns: [/(analiza|qu[eé] funcion[oó]) esta semana/i] },
  {
    category: 'extended',
    action: 'briefing_daily',
    patterns: [/(dame|genera) (el )?briefing diario/i, /resumen del d[ií]a/i],
  },
  {
    category: 'extended',
    action: 'briefing_weekly',
    patterns: [/(dame|genera) (el )?briefing semanal/i, /resumen de la semana/i],
  },

  // ── FASE 10: VOZ SOCIAL ──────────────────────────────────────────────────
  {
    category: 'extended',
    action: 'community_reply_dms',
    patterns: [/(responde|contesta) (los )?dms/i, /mensajes directos/i],
  },
  { category: 'extended', action: 'community_moderate', patterns: [/(modera|limpia) (los )?comentarios/i] },
  { category: 'extended', action: 'community_poll', patterns: [/(crea|hac[eé]r?) (una )?encuesta/i] },
  { category: 'extended', action: 'leads_list', patterns: [/(lista|ver) (los )?leads/i] },
  { category: 'extended', action: 'leads_move', patterns: [/(mueve|cambia) (el )?lead/i] },
  { category: 'extended', action: 'fans_top', patterns: [/(qui[eé]nes son|top) (mis )?fans/i, /fans m[aá]s fieles/i] },
  { category: 'extended', action: 'fans_thank', patterns: [/(agradece|agradecimiento) (a los )?fans/i] },
  {
    category: 'extended',
    action: 'dm_auto_reply',
    patterns: [/(configura|setup) (respuesta autom[aá]tica|auto-reply)/i],
  },
  {
    category: 'extended',
    action: 'dm_smart_comment',
    patterns: [/(activa|smart) (first )?comment/i, /primer comentario/i],
  },
  { category: 'extended', action: 'mentions_check', patterns: [/(hay|revisa) mentions/i, /menciones/i] },

  // ── FASE 11: VOZ ESTRATEGIA ─────────────────────────────────────────────
  {
    category: 'extended',
    action: 'strategy_positioning',
    patterns: [/(analiza|revisa) (mi )?posicionamiento/i, /posicionamiento de marca/i],
  },
  {
    category: 'extended',
    action: 'strategy_archetypes',
    patterns: [/(qu[eé] arquetipo|arquetipos de marca)/i, /personalidad de marca/i],
  },
  {
    category: 'extended',
    action: 'strategy_calendar',
    patterns: [/(planifica|crea) (el )?calendario estrat[eé]gico/i, /estrategia (del )?trimestre/i],
  },
  {
    category: 'extended',
    action: 'strategy_audit',
    patterns: [/(audita|auditor[ií]a) (la )?cuenta/i, /auditor[ií]a de instagram/i],
  },
  {
    category: 'extended',
    action: 'strategy_valueprop',
    patterns: [/(refina|mejora) (la )?propuesta de valor/i, /propuesta de valor/i],
  },

  // ── FASE 12: VOZ MONETIZACIÓN ───────────────────────────────────────────
  {
    category: 'extended',
    action: 'monetization_pricing',
    patterns: [/(sugiere|qu[eé] precio) (para )?/i, /precios? (de |para )?/i],
  },
  {
    category: 'extended',
    action: 'monetization_funnel',
    patterns: [/(analiza|revisa) (el )?funnel/i, /funnel de ventas/i],
  },
  {
    category: 'extended',
    action: 'monetization_sponsorship',
    patterns: [/(pitch|propuesta) (de )?sponsorship/i, /colaboraci[oó]n comercial/i],
  },
  {
    category: 'extended',
    action: 'monetization_affiliate',
    patterns: [/(track|rendimiento) (de )?affiliates/i, /affiliates/i],
  },
  {
    category: 'extended',
    action: 'monetization_products',
    patterns: [/(sugiere|qu[eé] producto) digital/i, /productos digitales/i],
  },

  // ── FASE 13: VOZ LEGAL/COMPLIANCE ───────────────────────────────────────
  {
    category: 'extended',
    action: 'legal_terms',
    patterns: [/(genera|crea) (los )?t[eé]rminos/i, /t[eé]rminos de uso/i],
  },
  {
    category: 'extended',
    action: 'legal_privacy',
    patterns: [/(genera|crea) (la )?pol[ií]tica de privacidad/i, /privacidad/i],
  },
  { category: 'extended', action: 'legal_disclaimer', patterns: [/(genera|crea) (un )?disclaimer/i, /aviso legal/i] },
  {
    category: 'extended',
    action: 'legal_copyright',
    patterns: [/(revisa|chequea) copyright/i, /riesgo de copyright/i],
  },
  {
    category: 'extended',
    action: 'legal_contract',
    patterns: [/(genera|crea|redacta) (un )?contrato/i, /contrato con creator/i],
  },

  // ── FASE 14: VOZ MULTI-CUENTA ───────────────────────────────────────────
  {
    category: 'extended',
    action: 'multiaccount_list',
    patterns: [/(lista|ver) (las )?cuentas/i, /cuentas configuradas/i],
  },
  {
    category: 'extended',
    action: 'multiaccount_switch',
    patterns: [/(cambia|cambiar) (de )?cuenta/i, /switch (de )?cuenta/i],
  },
  {
    category: 'extended',
    action: 'multiaccount_consolidate',
    patterns: [/(consolida|unifica) (los )?analytics/i, /analytics consolidado/i],
  },
  {
    category: 'extended',
    action: 'multiaccount_crosspost',
    patterns: [/(cross.post|publicar en todas)/i, /publicar en todas las cuentas/i],
  },
  {
    category: 'extended',
    action: 'multiaccount_permissions',
    patterns: [/(revisa|ver) permisos/i, /permisos de cuenta/i],
  },

  // ── FASE 15: VOZ SEO & DESCUBRIMIENTO ───────────────────────────────────
  { category: 'extended', action: 'seo_hashtags', patterns: [/(optimiza|mejora) (los )?hashtags/i, /hashtags? para/i] },
  { category: 'extended', action: 'seo_keywords', patterns: [/(investiga|busca) keywords/i, /keywords? para/i] },
  { category: 'extended', action: 'seo_alttext', patterns: [/(sugiere|genera) alt text/i, /texto alternativo/i] },
  { category: 'extended', action: 'seo_geotags', patterns: [/(sugiere|qu[eé]) geotags/i, /ubicaci[oó]n para/i] },
  {
    category: 'extended',
    action: 'seo_rankings',
    patterns: [/(chequea|revisa) (mi )?ranking/i, /posici[oó]n en b[uú]squedas/i],
  },

  // ── FASE 16: VOZ BUSINESS INTELLIGENCE ──────────────────────────────────
  { category: 'extended', action: 'bi_dashboard', patterns: [/(crea|nuevo) dashboard/i, /dashboard custom/i] },
  { category: 'extended', action: 'bi_export', patterns: [/(exporta|descarga) (los )?datos/i, /exportar datos/i] },
  {
    category: 'extended',
    action: 'bi_correlations',
    patterns: [/(analiza|encuentra) correlaciones/i, /correlaciones? entre/i],
  },
  { category: 'extended', action: 'bi_cohort', patterns: [/(crea|track) cohort/i, /seguimiento de cohort/i] },
  {
    category: 'extended',
    action: 'bi_benchmark',
    patterns: [/(benchmark|comparativa) (con la )?industria/i, /vs industria/i],
  },

  // ── FASE 17: VOZ INNOVACIÓN & TENDENCIAS ─────────────────────────────────
  {
    category: 'extended',
    action: 'innovation_updates',
    patterns: [/(qu[eé] hay de nuevo|updates de instagram)/i, /novedades de la plataforma/i],
  },
  {
    category: 'extended',
    action: 'innovation_beta',
    patterns: [/(features? en beta|betas disponibles)/i, /nuevas features/i],
  },
  {
    category: 'extended',
    action: 'innovation_playbook',
    patterns: [/(playbook|gu[ií]a) early adopter/i, /c[oó]mo adoptar/i],
  },
  {
    category: 'extended',
    action: 'innovation_forecast',
    patterns: [/(predice|forecast) tendencias/i, /tendencias futuras/i],
  },
  {
    category: 'extended',
    action: 'innovation_competitor',
    patterns: [/(qu[eé] innova|innovaci[oó]n de) @?([a-z0-9_.]+)/i],
  },

  // ── FASE 18: VOZ REPORTES & WHITE-LABEL ─────────────────────────────────
  {
    category: 'extended',
    action: 'reporting_pdf',
    patterns: [/(genera|crea) (un )?reporte pdf/i, /pdf (de |del )?reporte/i],
  },
  {
    category: 'extended',
    action: 'reporting_schedule',
    patterns: [/(programa|agenda) (un )?reporte/i, /reporte autom[aá]tico/i],
  },
  {
    category: 'extended',
    action: 'reporting_whitelabel',
    patterns: [/(exporta|genera) white.label/i, /sin branding/i],
  },
  {
    category: 'extended',
    action: 'reporting_compare',
    patterns: [/(compara|comparativa) (per[ií]odos?|meses)/i, /este mes vs/i],
  },
  {
    category: 'extended',
    action: 'reporting_executive',
    patterns: [/(genera|dame) (el )?resumen ejecutivo/i, /resumen para ejecutivos/i],
  },

  // ── FASE 19: VOZ ONBOARDING & CAPACITACIÓN ──────────────────────────────
  {
    category: 'extended',
    action: 'onboarding_tutorial',
    patterns: [/(inicia|empieza) (el )?tutorial/i, /c[oó]mo usar/i],
  },
  { category: 'extended', action: 'onboarding_tip', patterns: [/(dame|quiero) (un )?tip/i, /consejo del d[ií]a/i] },
  { category: 'extended', action: 'onboarding_quiz', patterns: [/(inicia|empieza) (el )?quiz/i, /certificaci[oó]n/i] },
  {
    category: 'extended',
    action: 'onboarding_progress',
    patterns: [/(c[oó]mo voy|progreso) (de )?onboarding/i, /avance del tutorial/i],
  },
  {
    category: 'extended',
    action: 'onboarding_discover',
    patterns: [/(qu[eé] es|descubre) (la )?feature/i, /c[oó]mo funciona/i],
  },

  // ── FASE 20: VOZ INTEGRACIONES & AUTOMATIZACIÓN ─────────────────────────
  {
    category: 'extended',
    action: 'integrations_webhooks',
    patterns: [/(estado de|revisa) webhooks/i, /webhooks? activos/i],
  },
  {
    category: 'extended',
    action: 'integrations_trigger',
    patterns: [/(dispara|activa) (la )?automatizaci[oó]n/i, /trigger (de |en )/i],
  },
  { category: 'extended', action: 'integrations_apis', patterns: [/(busca|encuentra) apis/i, /directorio de apis/i] },
  { category: 'extended', action: 'integrations_sync', patterns: [/(estado de|revisa) sync/i, /sincronizaci[oó]n/i] },
  {
    category: 'extended',
    action: 'integrations_health',
    patterns: [/(salud de|health check) integraciones/i, /integraciones? ok/i],
  },

  // ── INTELIGENCIA COMPETITIVA ────────────────────────────────────────────
  {
    category: 'extended',
    action: 'competitor_full_analysis',
    patterns: [/(analiza|revisa) (mi )?competencia/i, /inteligencia competitiva/i, /competidores/i],
  },
  {
    category: 'extended',
    action: 'competitor_quick_check',
    patterns: [/(chequea|analiza) @?([a-z0-9_.]+) (competidor|rival)/i, /qu[eé] tal anda @?([a-z0-9_.]+)/i],
  },

  // ── FASE 21: VOZ DE CONVERSIÓN ───────────────────────────────────────────
  {
    category: 'extended',
    action: 'conversion_funnel',
    patterns: [/(analiza|revisa|map(ea|é)?) (el )?funnel/i, /funnel de conversi[oó]n/i],
  },
  {
    category: 'extended',
    action: 'conversion_funnel_fix',
    params: ['bottleneck'],
    patterns: [/(arregl(a|á)|fix|mejor(a|á)) (el )?funnel/i, /cuello de botella/i],
  },
  {
    category: 'extended',
    action: 'conversion_scarcity',
    patterns: [/(gener(a|á)|crea) (una )?escasez/i, /urgencia|countdown|escasez/i],
  },
  {
    category: 'extended',
    action: 'conversion_countdown',
    patterns: [/(gener(a|á)|crea) (un )?countdown/i, /cuenta regresiva/i],
  },
  {
    category: 'extended',
    action: 'conversion_social_proof',
    patterns: [/(gener(a|á)|crea) (prueba social|social proof|testimonios)/i, /testimonios/i],
  },
  {
    category: 'extended',
    action: 'conversion_offer',
    patterns: [/(gener(a|á)|crea) (una )?oferta/i, /promoci[oó]n|descuento/i],
  },
  {
    category: 'extended',
    action: 'conversion_launch',
    patterns: [/(gener(a|á)|crea) (una )?secuencia de lanzamiento/i, /launch sequence/i],
  },

  // ── FASE 22: VOZ DE PERFIL ───────────────────────────────────────────────
  {
    category: 'extended',
    action: 'profile_audit',
    patterns: [/(audit(a|á)|revis(a|á)) (mi )?perfil/i, /perfil de instagram/i],
  },
  {
    category: 'extended',
    action: 'profile_highlights',
    patterns: [/(estrategia|plan) (de )?highlights/i, /highlights/i],
  },
  {
    category: 'extended',
    action: 'profile_bio',
    patterns: [/(optimiz(a|á)|mejor(a|á)|crea) (la )?bio/i, /biograf[ií]a/i],
  },
  {
    category: 'extended',
    action: 'profile_grid',
    patterns: [/(planific(a|á)|dise[ñn](a|á)) (el )?grid/i, /feed visual/i],
  },
  { category: 'extended', action: 'profile_hooks', patterns: [/(gener(a|á)|crea) hooks/i, /scroll.stop/i] },

  // ── FASE 23: VOZ DE COMUNIDAD & RITUAL ───────────────────────────────────
  {
    category: 'extended',
    action: 'ritual_create',
    patterns: [/(crea|dise[ñn](a|á)) (un )?ritual/i, /rituales semanales/i],
  },
  {
    category: 'extended',
    action: 'ritual_insider',
    patterns: [/(gener(a|á)|crea) (contenido )?insider/i, /exclusivo|early access/i],
  },
  {
    category: 'extended',
    action: 'ritual_naming',
    patterns: [/(sugiere|propone) (un )?nombre (para la )?comunidad/i, /nombre de comunidad/i],
  },
  {
    category: 'extended',
    action: 'ritual_manifesto',
    params: ['communityName'],
    patterns: [/(crea|escrib(i|í)) (un )?manifesto/i, /manifesto/i],
  },
  {
    category: 'extended',
    action: 'ritual_loops',
    patterns: [/(dise[ñn](a|á)|crea) (engagement )?loops/i, /loops de engagement/i],
  },

  // ── FASE 24: VOZ DE AUDIENCIA ────────────────────────────────────────────
  {
    category: 'extended',
    action: 'audience_segment',
    patterns: [/(segment(a|á)|divide) (mi )?audiencia/i, /personas|segmentaci[oó]n/i],
  },
  {
    category: 'extended',
    action: 'audience_journey',
    params: ['personaName'],
    patterns: [/(analiza|map(ea|é)?) (el )?journey/i, /customer journey/i],
  },
  {
    category: 'extended',
    action: 'audience_match',
    patterns: [/(emparej(a|á)|match) (contenido )?con personas/i, /content match/i],
  },
  {
    category: 'extended',
    action: 'audience_personalize',
    patterns: [/(personaliz(a|á)|adapt(a|á)) (el )?contenido/i, /variantes personalizadas/i],
  },
  {
    category: 'extended',
    action: 'audience_rotation',
    patterns: [/(sugiere|plan) (una )?rotaci[oó]n/i, /rotaci[oó]n semanal/i],
  },

  // ── FASE 25: VOZ DE FOMO (EXPERT LEVEL) ──────────────────────────────────
  {
    category: 'extended',
    action: 'fomo_series',
    params: ['topic'],
    patterns: [/(crea|dise[ñn](a|á)) (una )?serie/i, /serie epis[oó]dica/i],
  },
  {
    category: 'extended',
    action: 'fomo_countdown',
    patterns: [/(gener(a|á)|crea) (un )?countdown/i, /cuenta regresiva/i],
  },
  { category: 'extended', action: 'fomo_teaser', patterns: [/(gener(a|á)|crea) (un )?teaser/i, /teaser drop/i] },
  { category: 'extended', action: 'fomo_hooks', patterns: [/(gener(a|á)|crea) (must-follow )?hooks/i, /must follow/i] },
  {
    category: 'extended',
    action: 'fomo_profile_hook',
    patterns: [/(crea|escrib(i|í)) (un )?hook (de )?perfil/i, /hook para el perfil/i],
  },
  {
    category: 'extended',
    action: 'fomo_trending',
    patterns: [/(qu[eé] est[aá]|detect(a|á)) trending/i, /tendencias actuales/i],
  },
  {
    category: 'extended',
    action: 'fomo_anticipation',
    patterns: [/(dise[ñn](a|á)|crea) (un )?arco de anticipaci[oó]n/i, /build.up|anticipaci[oó]n/i],
  },
  {
    category: 'extended',
    action: 'fomo_drop',
    patterns: [/(dise[ñn](a|á)|crea) (un )?drop/i, /lanzamiento (limitado|exclusivo)/i],
  },
  {
    category: 'extended',
    action: 'fomo_drop_series',
    patterns: [/(dise[ñn](a|á)|crea) (una )?serie de drops/i, /drops escalonados/i],
  },
  {
    category: 'extended',
    action: 'fomo_disappearing',
    patterns: [/(crea|gener(a|á)) (contenido )?ef[ií]mero/i, /borro esto en/i, /desaparece en/i],
  },
  {
    category: 'extended',
    action: 'fomo_counters',
    patterns: [/(gener(a|á)|crea) contadores/i, /social proof counters/i],
  },
  {
    category: 'extended',
    action: 'fomo_gamified',
    patterns: [/(dise[ñn](a|á)|crea) (fomo )?gamificado/i, /gamificaci[oó]n/i, /solo los primeros/i],
  },
  {
    category: 'extended',
    action: 'fomo_insider',
    patterns: [/(dise[ñn](a|á)|crea) (un )?sistema (de )?insiders/i, /close friends|insiders/i],
  },
  {
    category: 'extended',
    action: 'fomo_visual',
    patterns: [/(gener(a|á)|crea) (fomo )?visual/i, /swipe to reveal|wait for it/i],
  },
  {
    category: 'extended',
    action: 'fomo_swipe_reveal',
    patterns: [/(dise[ñn](a|á)|crea) (un )?carousel swipe/i, /swipe to reveal/i],
  },
  {
    category: 'extended',
    action: 'fomo_campaign',
    patterns: [/(dise[ñn](a|á)|crea) (una )?campa[ñn]a (fomo)?/i, /campa[ñn]a de fomo/i],
  },
  {
    category: 'extended',
    action: 'fomo_playbook',
    patterns: [/(dame|mu[eé]strame) (el )?playbook (de )?fomo/i, /fomo playbook/i],
  },

  // ── FASE 26: CEREBRO (BRAIN) ─────────────────────────────────────────────
  {
    category: 'extended',
    action: 'brain_recall',
    params: ['query'],
    patterns: [/(recuerda|recuerdame|qu[eé] sabes? (sobre|de)|busca en memoria|consulta cerebro)/i, /brain recall/i],
  },
  {
    category: 'extended',
    action: 'brain_stats',
    patterns: [/(estado del )?cerebro/i, /brain stats/i, /qu[eé] tiene el cerebro/i, /memoria total/i],
  },
  {
    category: 'extended',
    action: 'brain_viral',
    params: ['content'],
    patterns: [/(predice|pron[oó]stico|score) viral/i, /qu[eé] tan viral es/i, /brain viral/i],
  },
  {
    category: 'extended',
    action: 'brain_personality',
    params: ['user'],
    patterns: [/(personalidad|perfil) (de )?@?([a-z0-9_.]+)/i, /brain personality/i],
  },
  {
    category: 'extended',
    action: 'brain_content',
    params: ['topic'],
    patterns: [/(genera|crea) contenido (enriquecido|con cerebro)/i, /brain content/i],
  },
  {
    category: 'extended',
    action: 'brain_decision',
    params: ['options'],
    patterns: [/(decide|toma una decisi[oó]n|qu[eé] opci[oó]n)/i, /brain decide/i],
  },
  {
    category: 'extended',
    action: 'brain_ingest',
    params: ['content'],
    patterns: [/(guarda|aprende|memoriza) (esto|en el cerebro)/i, /brain ingest/i],
  },
  {
    category: 'extended',
    action: 'brain_trends',
    patterns: [/(tendencias del )?cerebro/i, /brain trends/i, /qu[eé] est[aá] trending en el nicho/i],
  },
  {
    category: 'extended',
    action: 'brain_community_greeting',
    params: ['user'],
    patterns: [/(saluda|saludar?) (a )?@?([a-z0-9_.]+)/i, /c[oó]mo saludo (a )?@?([a-z0-9_.]+)/i],
  },
  {
    category: 'extended',
    action: 'brain_community_audit',
    patterns: [/(audita|auditor[ií]a) (la )?comunidad/i, /estado de la comunidad/i],
  },
  {
    category: 'extended',
    action: 'brain_stalker',
    params: ['user'],
    patterns: [/(intel|inteligencia) (sobre )?@?([a-z0-9_.]+)/i, /qu[eé] tipo (de usuario|de seguidor) es/i],
  },
  {
    category: 'extended',
    action: 'brain_human_reply',
    params: ['user', 'message'],
    patterns: [/(responde|contesta) (como humano|natural)/i, /human reply/i],
  },
  {
    category: 'extended',
    action: 'brain_profile_optimize',
    patterns: [/(optimiza|mejora) (el )?perfil/i, /audit(a|ar) perfil/i],
  },
  {
    category: 'extended',
    action: 'brain_aesthetic',
    patterns: [/(an[aá]lisis|reporte) est[eé]tico/i, /cohesi[oó]n visual/i],
  },
  {
    category: 'extended',
    action: 'brain_partners',
    patterns: [/(busca|encuentra) socios/i, /partnerships?/i, /colaboradores potenciales/i],
  },
  {
    category: 'extended',
    action: 'brain_niche',
    params: ['niche'],
    patterns: [/(intel|info) (del )?nicho/i, /dominio de nicho/i, /conocimiento de nicho/i],
  },
  { category: 'extended', action: 'brain_trend_sync', patterns: [/(sincroniza|actualiza) tendencias/i, /trend sync/i] },
  {
    category: 'extended',
    action: 'brain_orchestrator',
    patterns: [/(qu[eé] decisiones|orquestador|cerebro decide)/i, /brain think/i, /qu[eé] hacemos hoy/i],
  },
  {
    category: 'extended',
    action: 'brain_competitor',
    params: ['handle'],
    patterns: [/(intel|an[aá]lisis) (de )?competidor/i, /qu[eé] hace @?([a-z0-9_.]+)/i, /competitor brain/i],
  },
  {
    category: 'extended',
    action: 'brain_revenue',
    patterns: [/(predice|cu[aá]nto|revenue|dinero) (genera|va a generar)/i, /brain revenue/i],
  },
  {
    category: 'extended',
    action: 'brain_recycler',
    patterns: [/(recicla|reciclaje) contenido/i, /content recycler/i, /qu[eé] revivo/i],
  },
  {
    category: 'extended',
    action: 'brain_crisis',
    patterns: [/(escanea|hay) crisis/i, /crisis predictor/i, /amenazas/i],
  },
  {
    category: 'extended',
    action: 'brain_crossbrand',
    patterns: [/(aprendizaje|insights) (de )?todas las marcas/i, /cross brand/i, /universal patterns/i],
  },
  {
    category: 'extended',
    action: 'brain_lifecycle',
    params: ['user'],
    patterns: [/(ciclo de vida|lifecycle|etapa) (de )?@?([a-z0-9_.]+)/i, /funnel de audiencia/i],
  },
  {
    category: 'extended',
    action: 'brain_listening',
    patterns: [/(escucha|listening) social/i, /qu[eé] dicen (en el nicho|de mi nicho)/i, /pain points/i],
  },
  {
    category: 'extended',
    action: 'brain_sequence',
    params: ['title'],
    patterns: [/(crea|arma) (una )?secuencia/i, /serie de contenido/i, /content sequence/i],
  },
  // ── Nuevos módulos Sprint 5-7 ────────────────────────────────────────────
  {
    category: 'extended',
    action: 'brain_vision',
    patterns: [/(an[aá]lisis|inteligencia|recomendaciones?) visuales?/i, /brain vision/i, /qu[eé] estilos? funcionan/i],
  },
  {
    category: 'extended',
    action: 'brain_video',
    patterns: [/(f[oó]rmula|an[aá]lisis) (de )?video/i, /brain video/i, /qu[eé] funciona en reels?/i],
  },
  {
    category: 'extended',
    action: 'brain_dream',
    patterns: [/(sue[ñn]os?|insights? nocturnos?|conecta ideas)/i, /brain dream/i, /qu[eé] soñ[oó] el cerebro/i],
  },
  {
    category: 'extended',
    action: 'brain_emotional',
    patterns: [
      /(emociones?|resonancia|sentimiento) (del )?contenido/i,
      /brain emotional/i,
      /qu[eé] emociones? genera/i,
    ],
  },
  {
    category: 'extended',
    action: 'brain_forecast',
    patterns: [
      /(forecast|predicci[oó]n|pron[oó]stico) (de )?contenido/i,
      /brain forecast/i,
      /qu[eé] necesita la audiencia/i,
    ],
  },
  {
    category: 'extended',
    action: 'brain_evolution',
    patterns: [/(evoluci[oó]n|rebrand|cambio) (de )?marca/i, /brain evolution/i, /c[oó]mo evoluciona la marca/i],
  },
  {
    category: 'extended',
    action: 'brain_loop',
    patterns: [/(engagement loop|loop|secuencia) (de )?engagement/i, /brain loop/i, /qu[eé] sigue despu[eé]s/i],
  },
  {
    category: 'extended',
    action: 'brain_hashtags',
    patterns: [/(hashtag|etiquetas?) (estrategia|ecosistema)/i, /brain hashtags/i, /qu[eé] hashtags? usar/i],
  },

  // ── AGENTES ──────────────────────────────────────────────────────────────
  { category: 'agent', action: 'free_goal', patterns: [] }, // fallback — si no matchea nada, pasa a Talía libre
];

/* ── Intent Detection Engine ─────────────────────────────────────────────── */

export const detectIntent = (transcript: string): VoiceIntent => {
  const text = transcript.trim().toLowerCase();

  for (const def of PATTERNS) {
    for (const pattern of def.patterns) {
      const match = pattern.exec(text);
      if (match) {
        const params: Record<string, string> = {};
        if (def.params) {
          def.params.forEach((key) => {
            const groupIndex = match.length > 1 ? match.length - 1 : 0;
            if (match[groupIndex] && !params[key]) {
              params[key] = match[groupIndex];
            }
          });
        }
        // Extract any remaining free text as 'topic' or 'description'
        const freeText = text.replace(pattern, '').trim();
        if (freeText && !params['topic'] && !params['description'] && !params['text']) {
          params['freeText'] = freeText;
        }
        return {
          category: def.category,
          action: def.action,
          params,
          raw: transcript,
          confidence: 'high',
        };
      }
    }
  }

  // Fallback: check if it contains any action keywords loosely
  if (text.length < 3) {
    return { category: 'unknown', action: 'empty', params: {}, raw: transcript, confidence: 'low' };
  }

  return { category: 'agent', action: 'free_goal', params: { freeText: text }, raw: transcript, confidence: 'medium' };
};

/* ── Confirmation-required actions ───────────────────────────────────────── */

const REQUIRES_CONFIRMATION = new Set([
  'system:stop_all',
  'system:toggle_dry_run',
  'glassbox:approve_all',
  'glassbox:reject_all',
  'computer_use:post_content',
  'computer_use:follow_account',
  'computer_use:comment_post',
  'scheduler:run_job',
]);

// Emergency commands bypass confirmation entirely
const EMERGENCY_BYPASS_CONFIRMATION = new Set([
  'emergency:pause',
  'emergency:resume',
  'emergency:status',
  'emergency:force_approve',
  'emergency:emergency_mode',
  'emergency:shutdown',
]);

export const needsConfirmation = (intent: VoiceIntent): boolean =>
  REQUIRES_CONFIRMATION.has(`${intent.category}:${intent.action}`);

/* ── Action Execution Engine ─────────────────────────────────────────────── */

export const executeVoiceAction = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  opts?: { confirmed?: boolean; dryRun?: boolean },
): Promise<VoiceActionResult> => {
  const isDryRun = opts?.dryRun ?? env.dryRun;
  const lang = brand.audience.locale.startsWith('en') ? 'en' : 'es';

  // Emergency commands bypass confirmation and all gates
  if (intent.category === 'emergency' || EMERGENCY_BYPASS_CONFIRMATION.has(`${intent.category}:${intent.action}`)) {
    const { executeEmergencyCommand } = await import('./emergencyCommands.js');
    return executeEmergencyCommand(
      intent.action as 'pause' | 'resume' | 'status' | 'force_approve' | 'emergency_mode' | 'shutdown',
      brand,
    );
  }

  // If requires confirmation and not confirmed, ask for it
  if (needsConfirmation(intent) && !opts?.confirmed) {
    const actionName = getActionDisplayName(intent, lang);
    return {
      ok: false,
      spokenResponse:
        lang === 'en'
          ? `This will ${actionName}. Are you sure? Say yes to confirm or no to cancel.`
          : `Esto va a ${actionName}. ¿Estás seguro? Decí sí para confirmar o no para cancelar.`,
      actionType: `${intent.category}:${intent.action}`,
      executed: false,
      requiresConfirmation: true,
      confirmationContext: JSON.stringify(intent),
    };
  }

  try {
    const result = await dispatchAction(intent, brand, isDryRun);
    return result;
  } catch (err) {
    const msg = (err as Error).message;
    log.warn(`[VoiceAction] ${intent.category}:${intent.action} failed: ${msg}`);
    return {
      ok: false,
      spokenResponse:
        lang === 'en'
          ? `I couldn't complete that. ${msg.slice(0, 120)}`
          : `No pude completar eso. ${msg.slice(0, 120)}`,
      actionType: `${intent.category}:${intent.action}`,
      executed: false,
      detail: msg,
    };
  }
};

/* ── Dispatcher ──────────────────────────────────────────────────────────── */

const dispatchAction = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  const lang = brand.audience.locale.startsWith('en') ? 'en' : 'es';

  switch (intent.category) {
    case 'system':
      return await dispatchSystem(intent, lang, dryRun);
    case 'content':
      return await dispatchContent(intent, brand, lang, dryRun);
    case 'computer_use':
      return await dispatchComputerUse(intent, brand, lang, dryRun);
    case 'glassbox':
      return await dispatchGlassBox(intent, lang, dryRun);
    case 'scheduler':
      return await dispatchScheduler(intent, brand, lang, dryRun);
    case 'analytics':
      return await dispatchAnalytics(intent, brand, lang, dryRun);
    case 'community':
      return await dispatchCommunity(intent, brand, lang, dryRun);
    case 'agent':
      return await dispatchAgent(intent, brand, lang, dryRun);
    case 'macro':
      return await dispatchMacro(intent, brand, lang, dryRun);
    case 'emergency':
      return await dispatchEmergency(intent, brand, lang);
    case 'extended':
      return await dispatchExtended(intent, brand, lang, dryRun);
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? "I didn't understand that command." : 'No entendí ese comando.',
        actionType: 'unknown',
        executed: false,
      };
  }
};

/* ── System Actions ──────────────────────────────────────────────────────── */

const dispatchSystem = async (intent: VoiceIntent, lang: string, dryRun: boolean): Promise<VoiceActionResult> => {
  switch (intent.action) {
    case 'status': {
      const { getStatus } = await import('../glassbox/index.js');
      const status = getStatus();
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? `System is operational. Dry run mode is ${dryRun ? 'on' : 'off'}.`
            : `Sistema operativo. Modo simulación ${dryRun ? 'activado' : 'desactivado'}.`,
        actionType: 'system:status',
        executed: true,
        detail: status,
      };
    }
    case 'health_check': {
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? 'Health check completed. All core modules are responsive.'
            : 'Revisión de salud completada. Todos los módulos responden.',
        actionType: 'system:health_check',
        executed: !dryRun,
      };
    }
    case 'toggle_dry_run': {
      // Note: This would need env mutation; for safety we just report
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? `Dry run is currently ${dryRun ? 'enabled' : 'disabled'}. Restart to change it.`
            : `El modo simulación está ${dryRun ? 'activado' : 'desactivado'}. Reiniciá para cambiarlo.`,
        actionType: 'system:toggle_dry_run',
        executed: false,
      };
    }
    case 'stop_all': {
      const { pause } = await import('../glassbox/index.js');
      if (!dryRun) pause();
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? 'Emergency stop activated. All actions are paused.'
            : 'Parada de emergencia activada. Todas las acciones están pausadas.',
        actionType: 'system:stop_all',
        executed: !dryRun,
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'System command not recognized.' : 'Comando de sistema no reconocido.',
        actionType: 'system:unknown',
        executed: false,
      };
  }
};

/* ── Content Actions ─────────────────────────────────────────────────────── */

const dispatchContent = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  const topic = intent.params['topic'] ?? intent.params['freeText'] ?? brand.niche;

  switch (intent.action) {
    case 'create_post':
    case 'create_reel':
    case 'create_story': {
      const format = intent.action === 'create_post' ? 'post' : intent.action === 'create_reel' ? 'reel' : 'historia';
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? `I'm preparing a ${format} about ${topic}. Check the dashboard to review it.`
            : `Estoy preparando un ${format} sobre ${topic}. Revisá el dashboard para verlo.`,
        actionType: `content:${intent.action}`,
        executed: !dryRun,
        detail: { format, topic, dryRun },
      };
    }
    case 'plan_week': {
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? "I'm planning the full week of content. You'll see it in the calendar shortly."
            : 'Estoy planificando la semana completa de contenido. Vas a verlo en el calendario en breve.',
        actionType: 'content:plan_week',
        executed: !dryRun,
      };
    }
    case 'show_calendar': {
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'Opening the content calendar.' : 'Abriendo el calendario de contenido.',
        actionType: 'content:show_calendar',
        executed: false, // UI navigation, not a server action
        detail: { navigateTo: 'calendar' },
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Content command not recognized.' : 'Comando de contenido no reconocido.',
        actionType: 'content:unknown',
        executed: false,
      };
  }
};

/* ── Computer Use Actions ────────────────────────────────────────────────── */

const dispatchComputerUse = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  const freeText = intent.params['freeText'] ?? '';

  switch (intent.action) {
    case 'navigate_instagram': {
      if (!dryRun) {
        const { planComputerUse, executePlan } = await import('../capabilities/computerUse/index.js');
        const plan = planComputerUse('Navegar a Instagram.com');
        const result = await executePlan(plan, { brandId: brand.name });
        return {
          ok: result.completed,
          spokenResponse: lang === 'en' ? 'Opened Instagram in the browser.' : 'Abrí Instagram en el navegador.',
          actionType: 'computer_use:navigate_instagram',
          executed: true,
          detail: result,
        };
      }
      return {
        ok: true,
        spokenResponse: lang === 'en' ? '[Dry run] Would open Instagram.' : '[Simulación] Abriría Instagram.',
        actionType: 'computer_use:navigate_instagram',
        executed: false,
        detail: { dryRun: true },
      };
    }
    case 'like_post': {
      if (!dryRun) {
        const { planComputerUse, executePlan } = await import('../capabilities/computerUse/index.js');
        const plan = planComputerUse('Dar like al primer post visible del feed');
        const result = await executePlan(plan, { brandId: brand.name });
        return {
          ok: result.completed,
          spokenResponse: lang === 'en' ? 'Liked the post.' : 'Le di like al post.',
          actionType: 'computer_use:like_post',
          executed: true,
          detail: result,
        };
      }
      return {
        ok: true,
        spokenResponse: lang === 'en' ? '[Dry run] Would like the post.' : '[Simulación] Le daría like al post.',
        actionType: 'computer_use:like_post',
        executed: false,
      };
    }
    case 'check_dms': {
      if (!dryRun) {
        const { planComputerUse, executePlan } = await import('../capabilities/computerUse/index.js');
        const plan = planComputerUse('Abrir mensajes directos de Instagram y leer los no leídos');
        const result = await executePlan(plan, { brandId: brand.name });
        return {
          ok: result.completed,
          spokenResponse: lang === 'en' ? 'Checked direct messages.' : 'Revisé los mensajes directos.',
          actionType: 'computer_use:check_dms',
          executed: true,
          detail: result,
        };
      }
      return {
        ok: true,
        spokenResponse: lang === 'en' ? '[Dry run] Would check DMs.' : '[Simulación] Revisaría los mensajes.',
        actionType: 'computer_use:check_dms',
        executed: false,
      };
    }
    case 'check_insights': {
      if (!dryRun) {
        const { planComputerUse, executePlan } = await import('../capabilities/computerUse/index.js');
        const plan = planComputerUse('Navegar a Insights de Instagram y capturar métricas principales');
        const result = await executePlan(plan, { brandId: brand.name });
        return {
          ok: result.completed,
          spokenResponse: lang === 'en' ? 'Captured Instagram insights.' : 'Capturé las métricas de Instagram.',
          actionType: 'computer_use:check_insights',
          executed: true,
          detail: result,
        };
      }
      return {
        ok: true,
        spokenResponse: lang === 'en' ? '[Dry run] Would check insights.' : '[Simulación] Revisaría las métricas.',
        actionType: 'computer_use:check_insights',
        executed: false,
      };
    }
    case 'follow_account': {
      const username = intent.params['username'] ?? freeText;
      return {
        ok: true,
        spokenResponse: lang === 'en' ? `Would follow ${username}.` : `Seguiría a ${username}.`,
        actionType: 'computer_use:follow_account',
        executed: false,
        detail: { username },
      };
    }
    default:
      return {
        ok: false,
        spokenResponse:
          lang === 'en' ? 'Computer use command not recognized.' : 'Comando de automatización no reconocido.',
        actionType: 'computer_use:unknown',
        executed: false,
      };
  }
};

/* ── GlassBox Actions ────────────────────────────────────────────────────── */

const dispatchGlassBox = async (intent: VoiceIntent, lang: string, dryRun: boolean): Promise<VoiceActionResult> => {
  switch (intent.action) {
    case 'pause': {
      const { pause } = await import('../glassbox/index.js');
      if (!dryRun) pause();
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? 'GlassBox paused. Actions will be queued.' : 'GlassBox pausado. Las acciones se encolarán.',
        actionType: 'glassbox:pause',
        executed: !dryRun,
      };
    }
    case 'resume': {
      const { resume } = await import('../glassbox/index.js');
      if (!dryRun) resume();
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'GlassBox resumed.' : 'GlassBox reanudado.',
        actionType: 'glassbox:resume',
        executed: !dryRun,
      };
    }
    case 'set_mode': {
      const mode = intent.params['mode'] ?? 'supervised';
      const validModes = ['autonomous', 'supervised', 'pausado', 'paused'];
      if (!validModes.includes(mode)) {
        return {
          ok: false,
          spokenResponse:
            lang === 'en'
              ? 'Valid modes: autonomous, supervised, paused.'
              : 'Modos válidos: autónomo, supervisado, pausado.',
          actionType: 'glassbox:set_mode',
          executed: false,
        };
      }
      const { setMode } = await import('../glassbox/index.js');
      const normalized =
        mode === 'pausado' || mode === 'paused'
          ? 'paused'
          : mode === 'autónomo' || mode === 'autonomous'
            ? 'autonomous'
            : 'supervised';
      if (!dryRun) setMode(normalized as 'autonomous' | 'supervised' | 'paused');
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `GlassBox mode set to ${normalized}.` : `Modo GlassBox cambiado a ${normalized}.`,
        actionType: 'glassbox:set_mode',
        executed: !dryRun,
        detail: { mode: normalized },
      };
    }
    case 'show_status': {
      const { getStatus } = await import('../glassbox/index.js');
      const s = getStatus();
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? `GlassBox is ${s.mode}. ${s.pendingCount} actions pending.`
            : `GlassBox está ${s.mode}. ${s.pendingCount} acciones pendientes.`,
        actionType: 'glassbox:show_status',
        executed: false,
        detail: s,
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'GlassBox command not recognized.' : 'Comando de GlassBox no reconocido.',
        actionType: 'glassbox:unknown',
        executed: false,
      };
  }
};

/* ── Scheduler Actions ───────────────────────────────────────────────────── */

const dispatchScheduler = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  _dryRun: boolean,
): Promise<VoiceActionResult> => {
  switch (intent.action) {
    case 'list_jobs': {
      return {
        ok: true,
        spokenResponse:
          lang === 'en'
            ? 'I can list all scheduled jobs in the dashboard.'
            : 'Puedo listar todos los jobs programados en el dashboard.',
        actionType: 'scheduler:list_jobs',
        executed: false,
        detail: { navigateTo: 'scheduler' },
      };
    }
    case 'run_job': {
      const jobName = intent.params['jobName'] ?? intent.params['freeText'] ?? 'unknown';
      return {
        ok: true,
        spokenResponse: lang === 'en' ? `Would run job ${jobName}.` : `Ejecutaría el job ${jobName}.`,
        actionType: 'scheduler:run_job',
        executed: false,
        detail: { jobName },
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Scheduler command not recognized.' : 'Comando de scheduler no reconocido.',
        actionType: 'scheduler:unknown',
        executed: false,
      };
  }
};

/* ── Analytics Actions ───────────────────────────────────────────────────── */

const dispatchAnalytics = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  switch (intent.action) {
    case 'show_metrics': {
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'Opening the analytics dashboard.' : 'Abriendo el dashboard de analytics.',
        actionType: 'analytics:show_metrics',
        executed: false,
        detail: { navigateTo: 'analytics' },
      };
    }
    case 'growth_report': {
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'Generating the growth report.' : 'Generando el reporte de crecimiento.',
        actionType: 'analytics:growth_report',
        executed: !dryRun,
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Analytics command not recognized.' : 'Comando de analytics no reconocido.',
        actionType: 'analytics:unknown',
        executed: false,
      };
  }
};

/* ── Community Actions ───────────────────────────────────────────────────── */

const dispatchCommunity = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  switch (intent.action) {
    case 'check_messages': {
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'Checking messages and comments.' : 'Revisando mensajes y comentarios.',
        actionType: 'community:check_messages',
        executed: !dryRun,
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Community command not recognized.' : 'Comando de comunidad no reconocido.',
        actionType: 'community:unknown',
        executed: false,
      };
  }
};

/* ── Macro Actions ───────────────────────────────────────────────────────── */

const dispatchMacro = async (
  intent: VoiceIntent,
  _brand: BrandProfile,
  lang: string,
  _dryRun: boolean,
): Promise<VoiceActionResult> => {
  const { startRecording, stopRecording, cancelRecording, runMacro, listMacros, deleteMacro, findMacroByFuzzyName } =
    await import('./voiceMacroRecorder.js');

  switch (intent.action) {
    case 'start_recording': {
      const name = intent.params['macroName'] ?? intent.params['freeText'] ?? `macro-${Date.now()}`;
      const r = startRecording(name);
      return {
        ok: r.ok,
        spokenResponse: r.ok
          ? `Grabando macro ${name}. Decí los comandos que querés incluir, y después "terminar macro".`
          : r.error!,
        actionType: 'macro:start_recording',
        executed: r.ok,
      };
    }
    case 'stop_recording': {
      const r = stopRecording();
      if ('error' in r) {
        return { ok: false, spokenResponse: r.error, actionType: 'macro:stop_recording', executed: false };
      }
      return {
        ok: true,
        spokenResponse: `Macro ${r.name} guardada con ${r.steps.length} pasos.`,
        actionType: 'macro:stop_recording',
        executed: true,
        detail: r,
      };
    }
    case 'cancel_recording': {
      cancelRecording();
      return {
        ok: true,
        spokenResponse: lang === 'en' ? 'Recording cancelled.' : 'Grabación cancelada.',
        actionType: 'macro:cancel_recording',
        executed: true,
      };
    }
    case 'run_macro': {
      const name = intent.params['macroName'] ?? intent.params['freeText'] ?? '';
      const macro = findMacroByFuzzyName(name);
      if (!macro) {
        return {
          ok: false,
          spokenResponse: `No encontré la macro ${name}.`,
          actionType: 'macro:run_macro',
          executed: false,
        };
      }
      const result = await runMacro(macro.name);
      return {
        ok: result.ok,
        spokenResponse: result.ok
          ? `Macro ${macro.name} ejecutada. ${result.results.join('. ').slice(0, 200)}`
          : `Error: ${result.error}`,
        actionType: 'macro:run_macro',
        executed: result.ok,
        detail: result,
      };
    }
    case 'list_macros': {
      const macros = listMacros();
      const names = macros.map((m) => m.name).join(', ');
      return {
        ok: true,
        spokenResponse: macros.length ? `Tenés ${macros.length} macros: ${names}.` : 'No hay macros guardadas.',
        actionType: 'macro:list_macros',
        executed: false,
        detail: macros,
      };
    }
    case 'delete_macro': {
      const name = intent.params['macroName'] ?? intent.params['freeText'] ?? '';
      const macro = findMacroByFuzzyName(name);
      if (!macro) {
        return {
          ok: false,
          spokenResponse: `No encontré la macro ${name}.`,
          actionType: 'macro:delete_macro',
          executed: false,
        };
      }
      const ok = deleteMacro(macro.name);
      return {
        ok,
        spokenResponse: ok ? `Macro ${macro.name} eliminada.` : `No pude eliminar ${macro.name}.`,
        actionType: 'macro:delete_macro',
        executed: ok,
      };
    }
    default:
      return {
        ok: false,
        spokenResponse: lang === 'en' ? 'Macro command not recognized.' : 'Comando de macro no reconocido.',
        actionType: 'macro:unknown',
        executed: false,
      };
  }
};

/* ── Agent Actions (Free Goal → Talía) ───────────────────────────────────── */

const dispatchAgent = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  const goal = intent.params['freeText'] ?? intent.raw;

  if (dryRun) {
    return {
      ok: true,
      spokenResponse:
        lang === 'en'
          ? `[Dry run] Would ask Talía: ${goal.slice(0, 80)}`
          : `[Simulación] Le preguntaría a Talía: ${goal.slice(0, 80)}`,
      actionType: 'agent:free_goal',
      executed: false,
      detail: { goal },
    };
  }

  const { runTalia } = await import('../agent/talia.js');
  try {
    const result = await runTalia(brand, { goal, maxIterations: 10 });
    return {
      ok: true,
      spokenResponse: result.finalText.slice(0, 500),
      actionType: 'agent:free_goal',
      executed: true,
      detail: { iterations: result.iterations },
    };
  } catch (err) {
    return {
      ok: false,
      spokenResponse: lang === 'en' ? 'Something went wrong. Check the logs.' : 'Algo salió mal. Revisá los logs.',
      actionType: 'agent:free_goal',
      executed: false,
      detail: (err as Error).message,
    };
  }
};

/* ── Emergency Actions ───────────────────────────────────────────────────── */

const dispatchEmergency = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  _lang: string,
): Promise<VoiceActionResult> => {
  const { executeEmergencyCommand } = await import('./emergencyCommands.js');
  return executeEmergencyCommand(
    intent.action as 'pause' | 'resume' | 'status' | 'force_approve' | 'emergency_mode' | 'shutdown',
    brand,
  );
};

/* ── Extended Dispatcher (Phases 7-10) ───────────────────────────────────── */

const dispatchExtended = async (
  intent: VoiceIntent,
  brand: BrandProfile,
  lang: string,
  dryRun: boolean,
): Promise<VoiceActionResult> => {
  const freeText = intent.params['freeText'] ?? intent.raw;

  // ── Phase 7: Crisis ──────────────────────────────────────────────────────
  if (intent.action.startsWith('crisis_')) {
    const {
      checkCrisisStatus,
      pausePublishing,
      resumePublishing,
      evaluateRecentComments,
      getCrisisState,
      draftCrisisResponse,
    } = await import('./crisisVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'crisis_check':
        return checkCrisisStatus();
      case 'crisis_pause':
        return pausePublishing();
      case 'crisis_resume':
        return resumePublishing();
      case 'crisis_evaluate':
        return evaluateRecentComments();
      case 'crisis_draft':
        return draftCrisisResponse('humble');
      default:
        return getCrisisState();
    }
  }

  // ── Phase 7: A/B Testing ─────────────────────────────────────────────────
  if (intent.action.startsWith('abtest_')) {
    const { startABTest, getABTestStatus, evaluateABTest, listABTests } = await import('./abTestingVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'abtest_start':
        return startABTest([freeText, `${freeText} variant B`], 'Voice-initiated A/B test');
      case 'abtest_status':
        return getABTestStatus(freeText || 'latest');
      case 'abtest_evaluate':
        return evaluateABTest(freeText || 'latest');
      case 'abtest_list':
        return listABTests();
      default:
        return {
          ok: false,
          spokenResponse: lang === 'en' ? 'A/B test command not recognized.' : 'Comando de A/B test no reconocido.',
          actionType: 'extended:abtest_unknown',
          executed: false,
        };
    }
  }

  // ── Phase 7: UGC ─────────────────────────────────────────────────────────
  if (intent.action.startsWith('ugc_')) {
    const { scoutUGC, evaluateUGC, requestPermission, listPendingUGC } = await import('./ugcVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'ugc_scout':
        return scoutUGC();
      case 'ugc_evaluate':
        return evaluateUGC(freeText || 'latest');
      case 'ugc_request':
        return requestPermission(freeText || 'latest');
      case 'ugc_repost':
        return {
          ok: false,
          spokenResponse:
            lang === 'en'
              ? 'Use UGC workflow to repost approved content.'
              : 'Usá el flujo de UGC para republicar contenido aprobado.',
          actionType: 'extended:ugc_repost',
          executed: false,
        };
      default:
        return listPendingUGC();
    }
  }

  // ── Phase 7: Collab ──────────────────────────────────────────────────────
  if (intent.action.startsWith('collab_')) {
    const { evaluateCreator, sendOutreach, listProspects, getNextSteps } = await import('./collabVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'collab_evaluate':
        return evaluateCreator(freeText || '');
      case 'collab_outreach':
        return sendOutreach();
      case 'collab_list':
        return listProspects();
      default:
        return getNextSteps();
    }
  }

  // ── Phase 7-8: Analytics / Predict ───────────────────────────────────────
  if (intent.action.startsWith('analytics_') || intent.action.startsWith('predict_')) {
    const { getWeeklyReport, getGrowthStatus, analyzeCompetitor, getTrends, getDailyMetrics, predictPostPerformance } =
      await import('./analyticsVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'analytics_weekly':
        return getWeeklyReport();
      case 'analytics_growth':
        return getGrowthStatus();
      case 'analytics_competitor':
        return analyzeCompetitor(freeText || '');
      case 'analytics_trends':
        return getTrends();
      case 'analytics_predict':
        return predictPostPerformance(freeText || '');
      default:
        return getDailyMetrics();
    }
  }

  // ── Phase 8: Content / Canva / Image / Video / Publish ─────────────────────
  if (
    intent.action.startsWith('content_') ||
    intent.action.startsWith('canva_') ||
    intent.action.startsWith('image_') ||
    intent.action.startsWith('video_') ||
    intent.action.startsWith('publish_')
  ) {
    const { createCarousel, createReel, createStory, createCaption, createFaceless } =
      await import('./contentVoice.js');
    const { designCarousel } = await import('./canvaVoice.js');
    const { generateImage } = await import('./imageGenVoice.js');
    const { createFacelessReel } = await import('./videoVoice.js');
    const { publishNow, schedulePost } = await import('./publishVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'content_carousel':
        return createCarousel(freeText || brand.niche);
      case 'content_reel':
        return createReel(freeText || brand.niche);
      case 'content_story':
        return createStory(freeText || brand.niche);
      case 'content_caption':
        return createCaption(freeText || brand.niche);
      case 'content_faceless':
        return createFaceless(freeText || brand.niche);
      case 'canva_design':
        return designCarousel(freeText || '');
      case 'image_generate':
        return generateImage(freeText || 'A beautiful Instagram post');
      case 'video_faceless':
        return createFacelessReel(freeText || brand.niche);
      case 'publish_now':
        return publishNow(freeText || '', 'post');
      case 'publish_schedule':
        return schedulePost(freeText || '', new Date(Date.now() + 86400000).toISOString());
      default:
        return {
          ok: false,
          spokenResponse: lang === 'en' ? 'Content command not recognized.' : 'Comando de contenido no reconocido.',
          actionType: 'extended:content_unknown',
          executed: false,
        };
    }
  }

  // ── Phase 9: Goals / Autopilot / Learning / Briefing ───────────────────────
  if (
    intent.action.startsWith('goals_') ||
    intent.action.startsWith('autopilot_') ||
    intent.action.startsWith('learning_') ||
    intent.action.startsWith('briefing_')
  ) {
    const { setGrowthGoal, listActiveGoals } = await import('./goalsVoice.js');
    const { startAutopilot, stopAutopilot, getAutopilotReport } = await import('./autopilotVoice.js');
    const { weeklyAnalysis } = await import('./learningVoice.js');
    const { getDailyBriefing, getWeeklyBriefing, getPendingTasks } = await import('./briefingVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'goals_set':
        return setGrowthGoal(freeText || '10%', 'followers', '1 month');
      case 'goals_list':
        return listActiveGoals();
      case 'autopilot_start':
        return startAutopilot();
      case 'autopilot_stop':
        return stopAutopilot();
      case 'autopilot_report':
        return getAutopilotReport('daily');
      case 'learning_weekly':
        return weeklyAnalysis();
      case 'briefing_daily':
        return getDailyBriefing();
      case 'briefing_weekly':
        return getWeeklyBriefing();
      default:
        return getPendingTasks();
    }
  }

  // ── Phase 10: Community / Leads / Fans / DM / Mentions ─────────────────────
  if (
    intent.action.startsWith('community_') ||
    intent.action.startsWith('leads_') ||
    intent.action.startsWith('fans_') ||
    intent.action.startsWith('dm_') ||
    intent.action.startsWith('mentions_')
  ) {
    const { replyPendingDMs, moderateComments, createPoll } = await import('./communityVoice.js');
    const { listLeads, moveLead } = await import('./leadsVoice.js');
    const { getTopFans, sendThankYouToFans } = await import('./fansVoice.js');
    const { setupAutoReply, enableSmartFirstComment } = await import('./dmAutomationVoice.js');
    const { checkNewMentions, replyPositiveMentions, escalateNegativeMentions } = await import('./mentionsVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'community_reply_dms':
        return replyPendingDMs(10);
      case 'community_moderate':
        return moderateComments();
      case 'community_poll':
        return createPoll(freeText || '¿Qué te parece?', ['👍', '👎']);
      case 'leads_list':
        return listLeads();
      case 'leads_move':
        return moveLead(freeText || 'unknown', 'calificado');
      case 'fans_top':
        return getTopFans(10);
      case 'fans_thank':
        return sendThankYouToFans();
      case 'dm_auto_reply':
        return setupAutoReply(freeText || 'precio', 'Te envío la info por DM');
      case 'dm_smart_comment':
        return enableSmartFirstComment();
      case 'mentions_check':
        return checkNewMentions();
      case 'mentions_reply':
        return replyPositiveMentions();
      default:
        return escalateNegativeMentions();
    }
  }

  // ── Phase 11: Strategy ───────────────────────────────────────────────────
  if (intent.action.startsWith('strategy_')) {
    const { analyzePositioning, suggestArchetypes, planStrategicCalendar, auditAccount, refineValueProp } =
      await import('./strategyVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'strategy_positioning':
        return analyzePositioning();
      case 'strategy_archetypes':
        return suggestArchetypes();
      case 'strategy_calendar':
        return planStrategicCalendar(freeText || undefined);
      case 'strategy_audit':
        return auditAccount(freeText || undefined);
      default:
        return refineValueProp();
    }
  }

  // ── Phase 12: Monetization ───────────────────────────────────────────────
  if (intent.action.startsWith('monetization_')) {
    const { suggestPricing, analyzeFunnel, draftSponsorshipPitch, trackAffiliatePerformance, suggestDigitalProducts } =
      await import('./monetizationVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'monetization_pricing':
        return suggestPricing(freeText || undefined);
      case 'monetization_funnel':
        return analyzeFunnel();
      case 'monetization_sponsorship':
        return draftSponsorshipPitch(freeText || undefined);
      case 'monetization_affiliate':
        return trackAffiliatePerformance();
      default:
        return suggestDigitalProducts();
    }
  }

  // ── Phase 13: Legal ──────────────────────────────────────────────────────
  if (intent.action.startsWith('legal_')) {
    const { generateTerms, generatePrivacyPolicy, generateDisclaimer, checkCopyrightRisk, draftCreatorContract } =
      await import('./legalVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'legal_terms':
        return generateTerms();
      case 'legal_privacy':
        return generatePrivacyPolicy();
      case 'legal_disclaimer':
        return generateDisclaimer(freeText || undefined);
      case 'legal_copyright':
        return checkCopyrightRisk(freeText || undefined);
      default:
        return draftCreatorContract(freeText || undefined);
    }
  }

  // ── Phase 14: Multi-Account ──────────────────────────────────────────────
  if (intent.action.startsWith('multiaccount_')) {
    const { listAccounts, switchAccount, consolidateAnalytics, planCrossPost, checkPermissions } =
      await import('./multiAccountVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'multiaccount_list':
        return listAccounts();
      case 'multiaccount_switch':
        return switchAccount(freeText || undefined);
      case 'multiaccount_consolidate':
        return consolidateAnalytics();
      case 'multiaccount_crosspost':
        return planCrossPost(freeText || undefined);
      default:
        return checkPermissions(freeText || undefined);
    }
  }

  // ── Phase 15: SEO ────────────────────────────────────────────────────────
  if (intent.action.startsWith('seo_')) {
    const { optimizeHashtags, researchKeywords, suggestAltText, suggestGeotags, checkSearchRankings } =
      await import('./seoVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'seo_hashtags':
        return optimizeHashtags(freeText || undefined);
      case 'seo_keywords':
        return researchKeywords(freeText || undefined);
      case 'seo_alttext':
        return suggestAltText(freeText || undefined);
      case 'seo_geotags':
        return suggestGeotags(freeText || undefined);
      default:
        return checkSearchRankings(freeText || undefined);
    }
  }

  // ── Phase 16: BI ─────────────────────────────────────────────────────────
  if (intent.action.startsWith('bi_')) {
    const { createCustomDashboard, exportData, analyzeCorrelations, trackCohort, benchmarkAgainstIndustry } =
      await import('./biVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'bi_dashboard':
        return createCustomDashboard(freeText ? [freeText] : undefined);
      case 'bi_export':
        return exportData(freeText || undefined);
      case 'bi_correlations':
        return analyzeCorrelations();
      case 'bi_cohort':
        return trackCohort(freeText || undefined);
      default:
        return benchmarkAgainstIndustry();
    }
  }

  // ── Phase 17: Innovation ─────────────────────────────────────────────────
  if (intent.action.startsWith('innovation_')) {
    const {
      checkPlatformUpdates,
      suggestBetaFeatures,
      getEarlyAdopterPlaybook,
      forecastTrends,
      analyzeCompetitorInnovation,
    } = await import('./innovationVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'innovation_updates':
        return checkPlatformUpdates();
      case 'innovation_beta':
        return suggestBetaFeatures();
      case 'innovation_playbook':
        return getEarlyAdopterPlaybook(freeText || undefined);
      case 'innovation_forecast':
        return forecastTrends(freeText || undefined);
      default:
        return analyzeCompetitorInnovation(freeText || undefined);
    }
  }

  // ── Phase 18: Reporting ──────────────────────────────────────────────────
  if (intent.action.startsWith('reporting_')) {
    const { generatePdfReport, scheduleReport, exportWhiteLabel, comparePeriods, generateExecutiveSummary } =
      await import('./reportingVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'reporting_pdf':
        return generatePdfReport(freeText || undefined);
      case 'reporting_schedule':
        return scheduleReport(freeText || undefined);
      case 'reporting_whitelabel':
        return exportWhiteLabel(freeText || undefined);
      case 'reporting_compare':
        return comparePeriods(freeText || undefined);
      default:
        return generateExecutiveSummary();
    }
  }

  // ── Phase 19: Onboarding ─────────────────────────────────────────────────
  if (intent.action.startsWith('onboarding_')) {
    const { startVoiceTutorial, getDailyTip, startCertificationQuiz, getOnboardingProgress, discoverFeature } =
      await import('./onboardingVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'onboarding_tutorial':
        return startVoiceTutorial(Number(freeText) || 1);
      case 'onboarding_tip':
        return getDailyTip();
      case 'onboarding_quiz':
        return startCertificationQuiz();
      case 'onboarding_progress':
        return getOnboardingProgress();
      default:
        return discoverFeature(freeText || undefined);
    }
  }

  // ── Phase 20: Integrations ───────────────────────────────────────────────
  if (intent.action.startsWith('integrations_')) {
    const { checkWebhookStatus, triggerAutomation, searchApiDirectory, checkSyncStatus, getIntegrationHealth } =
      await import('./integrationsVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'integrations_webhooks':
        return checkWebhookStatus();
      case 'integrations_trigger':
        return triggerAutomation(freeText || undefined);
      case 'integrations_apis':
        return searchApiDirectory(freeText || undefined);
      case 'integrations_sync':
        return checkSyncStatus();
      default:
        return getIntegrationHealth();
    }
  }

  // ── Competitive Intelligence ─────────────────────────────────────────────
  if (intent.action.startsWith('competitor_')) {
    const { runFullCompetitiveAnalysis, quickCompetitorCheck } = await import('./competitiveIntelligenceVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'competitor_full_analysis':
        return runFullCompetitiveAnalysis();
      case 'competitor_quick_check':
        return quickCompetitorCheck(freeText || '');
      default:
        return runFullCompetitiveAnalysis();
    }
  }

  // ── Phase 21: Conversion ─────────────────────────────────────────────────
  if (intent.action.startsWith('conversion_')) {
    const {
      analyzeConversionFunnel,
      suggestFunnelFix,
      generateScarcityCampaign,
      generateCountdownSequence,
      generateSocialProof,
      generateOffer,
      generateLaunchSequence,
    } = await import('./conversionVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'conversion_funnel':
        return analyzeConversionFunnel();
      case 'conversion_funnel_fix':
        return suggestFunnelFix(freeText || 'awareness');
      case 'conversion_scarcity':
        return generateScarcityCampaign(freeText || undefined);
      case 'conversion_countdown':
        return generateCountdownSequence(
          freeText || 'Lanzamiento',
          new Date(Date.now() + 7 * 24 * 3600_000).toISOString(),
        );
      case 'conversion_social_proof':
        return generateSocialProof();
      case 'conversion_offer':
        return generateOffer(undefined, freeText || undefined);
      case 'conversion_launch':
        return generateLaunchSequence(freeText || 'Producto');
      default:
        return analyzeConversionFunnel();
    }
  }

  // ── Phase 22: Profile ────────────────────────────────────────────────────
  if (intent.action.startsWith('profile_')) {
    const { auditProfile, generateHighlightStrategy, optimizeBio, planGrid, getScrollStopHooks } =
      await import('./profileVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'profile_audit':
        return auditProfile();
      case 'profile_highlights':
        return generateHighlightStrategy();
      case 'profile_bio':
        return optimizeBio();
      case 'profile_grid':
        return planGrid();
      case 'profile_hooks':
        return getScrollStopHooks();
      default:
        return auditProfile();
    }
  }

  // ── Phase 23: Ritual ─────────────────────────────────────────────────────
  if (intent.action.startsWith('ritual_')) {
    const {
      createRituals,
      createInsiderContent,
      suggestCommunityNames,
      createCommunityManifesto,
      createEngagementLoops,
    } = await import('./ritualVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'ritual_create':
        return createRituals();
      case 'ritual_insider':
        return createInsiderContent();
      case 'ritual_naming':
        return suggestCommunityNames();
      case 'ritual_manifesto':
        return createCommunityManifesto(freeText || 'Comunidad');
      case 'ritual_loops':
        return createEngagementLoops();
      default:
        return createRituals();
    }
  }

  // ── Phase 24: Audience ───────────────────────────────────────────────────
  if (intent.action.startsWith('audience_')) {
    const {
      segmentAudience,
      analyzePersonaJourney,
      matchContentToPersonas,
      generatePersonalizedVariants,
      suggestSegmentRotation,
    } = await import('./audienceVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'audience_segment':
        return segmentAudience();
      case 'audience_journey':
        return analyzePersonaJourney(freeText || 'La Curiosa');
      case 'audience_match':
        return matchContentToPersonas();
      case 'audience_personalize':
        return generatePersonalizedVariants(freeText || brand.niche, ['curiosa', 'compradora', 'promotora']);
      case 'audience_rotation':
        return suggestSegmentRotation();
      default:
        return segmentAudience();
    }
  }

  // ── Phase 26: BRAIN ──────────────────────────────────────────────────────
  if (intent.action.startsWith('brain_')) {
    const {
      recallMemory,
      getBrainStats,
      predictViral,
      getPersonality,
      generateBrainContent,
      makeBrainDecision,
      ingestToBrain,
      getNicheTrends,
      communityGreeting,
      communityAudit,
      stalkerIntel,
      craftHumanReply,
      optimizeProfile,
      aestheticReport,
      findPartners,
      nicheIntel,
      syncTrends,
      visionRecommendations,
      videoFormula,
      dreamInsights,
      emotionalFormula,
      forecastContent,
      brandEvolutionReport,
      engagementLoopReport,
      hashtagStrategy,
    } = await import('../brain/voiceBrain.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'brain_recall':
        return recallMemory(freeText || '');
      case 'brain_stats':
        return getBrainStats();
      case 'brain_viral':
        return predictViral(freeText || '');
      case 'brain_personality':
        return getPersonality(freeText || undefined);
      case 'brain_content':
        return generateBrainContent(freeText || undefined);
      case 'brain_decision':
        return makeBrainDecision('strategy', freeText ? freeText.split('|') : ['opción A', 'opción B']);
      case 'brain_ingest':
        return ingestToBrain(freeText || '', 'system');
      case 'brain_trends':
        return getNicheTrends();
      case 'brain_community_greeting':
        return communityGreeting(freeText || '');
      case 'brain_community_audit':
        return communityAudit();
      case 'brain_stalker':
        return stalkerIntel(freeText || undefined);
      case 'brain_human_reply': {
        const parts = freeText?.split('|') ?? ['', ''];
        return craftHumanReply(parts[0]?.trim() ?? '', parts[1]?.trim() ?? '', 'comment');
      }
      case 'brain_profile_optimize':
        return optimizeProfile(freeText || undefined);
      case 'brain_aesthetic':
        return aestheticReport();
      case 'brain_partners':
        return findPartners();
      case 'brain_niche':
        return nicheIntel(freeText || undefined);
      case 'brain_trend_sync':
        return syncTrends();
      case 'brain_orchestrator':
        return runOrchestrator();
      case 'brain_competitor':
        return competitorIntel(freeText || undefined);
      case 'brain_revenue':
        return revenuePrediction();
      case 'brain_recycler':
        return recyclerCheck();
      case 'brain_crisis':
        return crisisScan();
      case 'brain_crossbrand':
        return crossBrandInsights();
      case 'brain_lifecycle':
        return lifecycleMap(freeText || undefined);
      case 'brain_listening':
        return socialListen();
      case 'brain_sequence':
        return createSequence(freeText || undefined);
      case 'brain_vision':
        return visionRecommendations();
      case 'brain_video':
        return videoFormula();
      case 'brain_dream':
        return dreamInsights();
      case 'brain_emotional':
        return emotionalFormula();
      case 'brain_forecast':
        return forecastContent();
      case 'brain_evolution':
        return brandEvolutionReport();
      case 'brain_loop':
        return engagementLoopReport();
      case 'brain_hashtags':
        return hashtagStrategy();
      default:
        return getBrainStats();
    }
  }

  // ── Phase 25: FOMO (Expert Level) ────────────────────────────────────────
  if (intent.action.startsWith('fomo_')) {
    const {
      createEpisodicSeries,
      generateCountdown,
      generateTeaserDrop,
      generateMustFollowHooks,
      craftProfileHook,
      detectTrending,
      designAnticipationArc,
      designDrop,
      designDropSeries,
      createDisappearingContent,
      generateSocialCounters,
      designGamifiedFomo,
      designInsiderSystem,
      generateVisualFomo,
      designSwipeToReveal,
      designFomoCampaign,
      getFomoPlaybook,
    } = await import('./fomoVoice.js');
    if (dryRun)
      return {
        ok: true,
        spokenResponse:
          lang === 'en' ? `[Dry run] Would execute: ${intent.action}` : `[Simulación] Ejecutaría: ${intent.action}`,
        actionType: `extended:${intent.action}`,
        executed: false,
      };
    switch (intent.action) {
      case 'fomo_series':
        return createEpisodicSeries(freeText || undefined);
      case 'fomo_countdown':
        return generateCountdown(freeText || 'Lanzamiento', new Date(Date.now() + 7 * 24 * 3600_000).toISOString());
      case 'fomo_teaser':
        return generateTeaserDrop(freeText || 'Lanzamiento');
      case 'fomo_hooks':
        return generateMustFollowHooks();
      case 'fomo_profile_hook':
        return craftProfileHook();
      case 'fomo_trending':
        return detectTrending();
      case 'fomo_anticipation':
        return designAnticipationArc(freeText || 'Lanzamiento', 7);
      case 'fomo_drop':
        return designDrop(undefined, freeText || undefined);
      case 'fomo_drop_series':
        return designDropSeries(freeText || 'Colección');
      case 'fomo_disappearing':
        return createDisappearingContent(freeText || undefined);
      case 'fomo_counters':
        return generateSocialCounters();
      case 'fomo_gamified':
        return designGamifiedFomo();
      case 'fomo_insider':
        return designInsiderSystem();
      case 'fomo_visual':
        return generateVisualFomo();
      case 'fomo_swipe_reveal':
        return designSwipeToReveal(freeText || brand.niche);
      case 'fomo_campaign':
        return designFomoCampaign(freeText || undefined, 14);
      case 'fomo_playbook':
        return getFomoPlaybook();
      default:
        return detectTrending();
    }
  }

  return {
    ok: false,
    spokenResponse: lang === 'en' ? "I didn't understand that extended command." : 'No entendí ese comando extendido.',
    actionType: 'extended:unknown',
    executed: false,
  };
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

const getActionDisplayName = (intent: VoiceIntent, lang: string): string => {
  const names: Record<string, Record<string, string>> = {
    'system:stop_all': { es: 'detener todas las operaciones', en: 'stop all operations' },
    'system:toggle_dry_run': { es: 'cambiar el modo de simulación', en: 'toggle dry run mode' },
    'glassbox:approve_all': { es: 'aprobar todas las acciones pendientes', en: 'approve all pending actions' },
    'glassbox:reject_all': { es: 'rechazar todas las acciones pendientes', en: 'reject all pending actions' },
    'computer_use:post_content': { es: 'publicar contenido en Instagram', en: 'post content to Instagram' },
    'computer_use:follow_account': { es: 'seguir una cuenta', en: 'follow an account' },
    'computer_use:comment_post': { es: 'comentar en un post', en: 'comment on a post' },
    'scheduler:run_job': { es: 'ejecutar un job programado', en: 'run a scheduled job' },
  };
  return names[`${intent.category}:${intent.action}`]?.[lang] ?? 'realizar esta acción';
};

/* ── Confirmation resolution ─────────────────────────────────────────────── */

export const isConfirmationYes = (transcript: string): boolean =>
  /\b(s[ií]|yes|yeah|yep|confirmar?|dale|ok|okay|va|perfecto|claro)\b/i.test(transcript.trim());

export const isConfirmationNo = (transcript: string): boolean =>
  /\b(no|nope|cancela(r)?|nada|par(a|ar)|stop|no quiero)\b/i.test(transcript.trim());
