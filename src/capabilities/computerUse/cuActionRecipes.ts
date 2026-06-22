/**
 * CU Action Recipes — biblioteca de recetas reutilizables para Computer Use.
 *
 * Cada receta es una secuencia de instrucciones reutilizable
 * (scroll feed, abrir post, ver insights, etc).
 *
 * Sin Anthropic call directo.
 */

import { log } from '../../agent/logger.js';

export type RecipeId =
  | 'scroll-feed-and-engage'
  | 'view-insights-last-post'
  | 'check-story-views'
  | 'reply-to-mention'
  | 'follow-back-followers'
  | 'unfollow-inactive'
  | 'send-bulk-dm-template'
  | 'archive-old-posts'
  | 'edit-bio'
  | 'update-link-in-bio'
  | 'highlight-create-from-stories'
  | 'export-followers-list'
  | 'block-user'
  | 'restrict-user'
  | 'pin-best-comment'
  | 'go-live-with-cohost';

export interface RecipeStep {
  step: number;
  app: 'instagram';
  action: string;
  detail: string;
  expectedResult: string;
  timeoutMs: number;
}

export interface Recipe {
  id: RecipeId;
  name: string;
  description: string;
  estimatedDurationMs: number;
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
  rateLimitNotes: string;
  steps: RecipeStep[];
  params: string[];
  preconditions: string[];
}

const RECIPES: Record<RecipeId, Recipe> = {
  'scroll-feed-and-engage': {
    id: 'scroll-feed-and-engage',
    name: 'Scroll feed + engagement orgánico',
    description: 'Scrollea feed, dale like + comment a posts relevantes para warming algoritmo',
    estimatedDurationMs: 300000,
    riskLevel: 'low',
    rateLimitNotes: 'Max 30 likes / 10 comments por hora para evitar shadowban',
    params: ['maxPosts', 'commentTemplates', 'targetNiches'],
    preconditions: ['Logueado'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate',
        detail: 'Ir a Home feed',
        expectedResult: 'Feed visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'scroll',
        detail: 'Scroll lento (mimetizar humano)',
        expectedResult: 'Posts cargando',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'like-relevant',
        detail: 'Like en posts con keywords del nicho',
        expectedResult: 'Like aplicado',
        timeoutMs: 2000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'comment-occasional',
        detail: 'Comment cada 5-7 posts con template no spam',
        expectedResult: 'Comment publicado',
        timeoutMs: 5000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'pause-between',
        detail: 'Esperar 30-90s entre acciones (anti-bot detection)',
        expectedResult: 'Pausa OK',
        timeoutMs: 90000,
      },
    ],
  },

  'view-insights-last-post': {
    id: 'view-insights-last-post',
    name: 'Ver insights del último post',
    description: 'Captura métricas (alcance, engagement, saves) del post más reciente',
    estimatedDurationMs: 45000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: [],
    preconditions: ['Cuenta business o creator'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate',
        detail: 'Ir al perfil propio',
        expectedResult: 'Perfil cargado',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'tap-first-post',
        detail: 'Tap primer post en grid',
        expectedResult: 'Post abierto',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-view-insights',
        detail: 'Tap "Ver estadísticas" debajo del post',
        expectedResult: 'Modal insights abierto',
        timeoutMs: 5000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'screenshot-overview',
        detail: 'Capturar sección overview (alcance, impresiones)',
        expectedResult: 'Screenshot guardado',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'scroll-engagement',
        detail: 'Scroll a engagement (likes, comments, saves, shares)',
        expectedResult: 'Métricas visibles',
        timeoutMs: 3000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'screenshot-engagement',
        detail: 'Capturar sección engagement',
        expectedResult: 'Screenshot guardado',
        timeoutMs: 3000,
      },
      {
        step: 7,
        app: 'instagram',
        action: 'scroll-audience',
        detail: 'Scroll a audiencia (followers nuevos, profile visits)',
        expectedResult: 'Métricas audience visibles',
        timeoutMs: 3000,
      },
      {
        step: 8,
        app: 'instagram',
        action: 'extract-numbers',
        detail: 'Leer y reportar números: alcance, likes, comments, saves, shares, profile-visits, new-followers',
        expectedResult: 'Datos extraídos',
        timeoutMs: 5000,
      },
    ],
  },

  'check-story-views': {
    id: 'check-story-views',
    name: 'Chequear vistas de stories',
    description: 'Lee viewers de cada story activa',
    estimatedDurationMs: 60000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: [],
    preconditions: ['Stories activas en últimas 24h'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate',
        detail: 'Ir al perfil propio',
        expectedResult: 'Perfil cargado',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'tap-own-story',
        detail: 'Tap círculo de story propia en avatar',
        expectedResult: 'Story abierta',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'swipe-up-viewers',
        detail: 'Swipe up para ver lista de viewers',
        expectedResult: 'Lista visible',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'capture-viewer-count',
        detail: 'Capturar número total + handles top 10',
        expectedResult: 'Datos capturados',
        timeoutMs: 5000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'navigate-next-story',
        detail: 'Tap derecha para siguiente story',
        expectedResult: 'Siguiente story',
        timeoutMs: 3000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'repeat-for-all',
        detail: 'Repetir pasos 3-5 hasta última story',
        expectedResult: 'Todas analizadas',
        timeoutMs: 30000,
      },
    ],
  },

  'reply-to-mention': {
    id: 'reply-to-mention',
    name: 'Responder mención en story',
    description: 'Detecta y responde menciones en stories ajenas',
    estimatedDurationMs: 30000,
    riskLevel: 'low',
    rateLimitNotes: 'Max 50 replies/día',
    params: ['replyTemplate'],
    preconditions: ['Notification de mención'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'open-notifications',
        detail: 'Tap heart icon → Notifications',
        expectedResult: 'Notificaciones visibles',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'find-mention',
        detail: 'Buscar mention en story más reciente',
        expectedResult: 'Mención encontrada',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-mention',
        detail: 'Tap notification para abrir story con mención',
        expectedResult: 'Story abierta',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'tap-share-to-story',
        detail: 'Tap "Compartir a tu story" abajo izquierda',
        expectedResult: 'Editor abierto',
        timeoutMs: 5000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'add-text-thanks',
        detail: 'Agregar texto agradeciendo',
        expectedResult: 'Texto agregado',
        timeoutMs: 5000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'tap-your-story',
        detail: 'Tap "Tu story" para publicar',
        expectedResult: 'Publicado',
        timeoutMs: 5000,
      },
    ],
  },

  'follow-back-followers': {
    id: 'follow-back-followers',
    name: 'Follow back a followers nuevos',
    description: 'Sigue de vuelta a los followers nuevos relevantes',
    estimatedDurationMs: 180000,
    riskLevel: 'medium',
    rateLimitNotes: 'Max 50 follows/día, 100/semana',
    params: ['maxToFollow', 'minFollowerCount', 'relevanceCheck'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate',
        detail: 'Ir al perfil → Followers',
        expectedResult: 'Lista followers visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'identify-new',
        detail: 'Identificar followers nuevos (sin botón "Siguiendo")',
        expectedResult: 'Lista filtrada',
        timeoutMs: 5000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'check-relevance',
        detail: 'Para cada follower: tap perfil, verificar bio + posts (relevancia al nicho)',
        expectedResult: 'Filtro aplicado',
        timeoutMs: 10000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'follow-back',
        detail: 'Si relevante, tap "Seguir"',
        expectedResult: 'Seguido',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'wait-between',
        detail: 'Esperar 60-120s entre follows (anti-bot)',
        expectedResult: 'Pausa OK',
        timeoutMs: 120000,
      },
    ],
  },

  'unfollow-inactive': {
    id: 'unfollow-inactive',
    name: 'Unfollow a cuentas inactivas o que no siguen',
    description: 'Limpieza de following list',
    estimatedDurationMs: 240000,
    riskLevel: 'medium',
    rateLimitNotes: 'Max 50 unfollows/día',
    params: ['inactiveDays', 'maxToUnfollow'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-following',
        detail: 'Perfil → Siguiendo',
        expectedResult: 'Lista visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'filter-not-follow-back',
        detail: 'Filtrar quienes no nos siguen de vuelta',
        expectedResult: 'Filtro aplicado',
        timeoutMs: 5000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'check-last-post-date',
        detail: 'Para cada cuenta: ver último post → si >X días sin postear, marcar',
        expectedResult: 'Inactivos identificados',
        timeoutMs: 10000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'unfollow',
        detail: 'Tap "Siguiendo" → "Dejar de seguir"',
        expectedResult: 'Unfollowed',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'wait-between',
        detail: 'Esperar 60-120s entre unfollows',
        expectedResult: 'Pausa OK',
        timeoutMs: 120000,
      },
    ],
  },

  'send-bulk-dm-template': {
    id: 'send-bulk-dm-template',
    name: 'Enviar DM template a lista',
    description: 'Envía mismo DM personalizado a lista de contactos',
    estimatedDurationMs: 600000,
    riskLevel: 'high',
    rateLimitNotes: 'Max 20 DMs/hora, 50/día. Personalizar cada uno para evitar spam flag',
    params: ['contactList', 'messageTemplate', 'personalizeVars'],
    preconditions: ['Lista de handles válidos'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-inbox',
        detail: 'Tap ícono avión (inbox)',
        expectedResult: 'Inbox visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'compose-new',
        detail: 'Tap "Nuevo mensaje"',
        expectedResult: 'Modal compose',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'search-contact',
        detail: 'Buscar handle del contacto',
        expectedResult: 'Contacto encontrado',
        timeoutMs: 5000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'select-contact',
        detail: 'Tap para seleccionar',
        expectedResult: 'Seleccionado',
        timeoutMs: 2000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'tap-chat',
        detail: 'Tap "Chat" para abrir conversación',
        expectedResult: 'Chat abierto',
        timeoutMs: 3000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'type-personalized',
        detail: 'Escribir mensaje con vars sustituidas',
        expectedResult: 'Texto listo',
        timeoutMs: 10000,
      },
      { step: 7, app: 'instagram', action: 'send', detail: 'Tap enviar', expectedResult: 'Enviado', timeoutMs: 3000 },
      {
        step: 8,
        app: 'instagram',
        action: 'wait-long',
        detail: 'Esperar 180-300s entre DMs (crítico para evitar bloqueo)',
        expectedResult: 'Pausa OK',
        timeoutMs: 300000,
      },
      {
        step: 9,
        app: 'instagram',
        action: 'repeat-next-contact',
        detail: 'Volver al paso 1 con próximo contacto',
        expectedResult: 'Loop hasta fin de lista',
        timeoutMs: 5000,
      },
    ],
  },

  'archive-old-posts': {
    id: 'archive-old-posts',
    name: 'Archivar posts antiguos sin engagement',
    description: 'Mueve a archivo posts con <50 likes y >6 meses',
    estimatedDurationMs: 120000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['minLikes', 'minAgeMonths'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-profile',
        detail: 'Ir al perfil',
        expectedResult: 'Grid visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'scroll-to-old',
        detail: 'Scroll al final del grid (posts antiguos)',
        expectedResult: 'Posts antiguos visibles',
        timeoutMs: 10000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-post',
        detail: 'Tap post con bajo engagement',
        expectedResult: 'Post abierto',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'tap-menu',
        detail: 'Tap "..." arriba derecha',
        expectedResult: 'Menú abierto',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'tap-archive',
        detail: 'Tap "Archivar"',
        expectedResult: 'Post archivado',
        timeoutMs: 3000,
      },
    ],
  },

  'edit-bio': {
    id: 'edit-bio',
    name: 'Editar bio del perfil',
    description: 'Actualiza texto de bio',
    estimatedDurationMs: 30000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['newBioText'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-profile',
        detail: 'Ir al perfil',
        expectedResult: 'Perfil visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'tap-edit-profile',
        detail: 'Tap "Editar perfil"',
        expectedResult: 'Form abierto',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'clear-bio',
        detail: 'Limpiar campo bio',
        expectedResult: 'Bio vacía',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'type-new-bio',
        detail: 'Escribir nuevo texto',
        expectedResult: 'Bio escrita',
        timeoutMs: 5000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'tap-done',
        detail: 'Tap "Listo" o ✓',
        expectedResult: 'Guardado',
        timeoutMs: 5000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'verify-saved',
        detail: 'Volver al perfil, verificar nueva bio visible',
        expectedResult: 'Bio actualizada',
        timeoutMs: 5000,
      },
    ],
  },

  'update-link-in-bio': {
    id: 'update-link-in-bio',
    name: 'Actualizar link en bio',
    description: 'Cambia el link único o agrega múltiples links',
    estimatedDurationMs: 30000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['newUrl', 'linkLabel'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-profile',
        detail: 'Ir al perfil',
        expectedResult: 'Perfil visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'tap-edit-profile',
        detail: 'Tap "Editar perfil"',
        expectedResult: 'Form abierto',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-links-section',
        detail: 'Tap "Links" o "Sitio web"',
        expectedResult: 'Sección links abierta',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'clear-old-link',
        detail: 'Eliminar link viejo',
        expectedResult: 'Vacío',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'add-new-link',
        detail: 'Tap "Agregar link" → pegar URL',
        expectedResult: 'Link agregado',
        timeoutMs: 5000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'add-label',
        detail: 'Agregar label si soporta',
        expectedResult: 'Label agregado',
        timeoutMs: 3000,
      },
      {
        step: 7,
        app: 'instagram',
        action: 'tap-done',
        detail: 'Tap "Listo"',
        expectedResult: 'Guardado',
        timeoutMs: 5000,
      },
    ],
  },

  'highlight-create-from-stories': {
    id: 'highlight-create-from-stories',
    name: 'Crear highlight desde stories archivadas',
    description: 'Crea highlight permanente desde stories pasadas',
    estimatedDurationMs: 90000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['highlightName', 'storyIds', 'coverImagePath'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-profile',
        detail: 'Perfil → tap "+" debajo de bio (highlights)',
        expectedResult: 'Picker stories archivadas',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'select-stories',
        detail: 'Seleccionar N stories del archivo',
        expectedResult: 'Stories seleccionadas',
        timeoutMs: 10000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-next',
        detail: 'Tap "Siguiente"',
        expectedResult: 'Paso cover',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'set-cover',
        detail: 'Tap "Editar tapa" → subir imagen custom o elegir frame',
        expectedResult: 'Cover seleccionada',
        timeoutMs: 10000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'set-name',
        detail: 'Escribir nombre del highlight (max 16 chars)',
        expectedResult: 'Nombre escrito',
        timeoutMs: 5000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'tap-add',
        detail: 'Tap "Agregar"',
        expectedResult: 'Highlight creado',
        timeoutMs: 5000,
      },
    ],
  },

  'export-followers-list': {
    id: 'export-followers-list',
    name: 'Exportar lista de followers',
    description: 'Scroll completo y captura handles de followers',
    estimatedDurationMs: 600000,
    riskLevel: 'low',
    rateLimitNotes: 'Scroll lento para evitar trigger anti-scraping',
    params: ['maxFollowersToCapture'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'navigate-profile',
        detail: 'Perfil → Followers',
        expectedResult: 'Lista visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'extract-visible-handles',
        detail: 'Extraer handles del DOM/screenshot',
        expectedResult: 'Handles capturados',
        timeoutMs: 5000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'scroll-down',
        detail: 'Scroll lento (mimick humano, 1-2s)',
        expectedResult: 'Más followers cargados',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'repeat',
        detail: 'Loop pasos 2-3 hasta llegar a maxFollowersToCapture o fin',
        expectedResult: 'Captura completa',
        timeoutMs: 300000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'save-csv',
        detail: 'Guardar handles a archivo CSV',
        expectedResult: 'CSV creado',
        timeoutMs: 5000,
      },
    ],
  },

  'block-user': {
    id: 'block-user',
    name: 'Bloquear usuario',
    description: 'Bloquea usuario específico',
    estimatedDurationMs: 20000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['userHandle'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'search-user',
        detail: 'Buscar @handle',
        expectedResult: 'Perfil encontrado',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'open-profile',
        detail: 'Tap para abrir perfil',
        expectedResult: 'Perfil abierto',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-menu',
        detail: 'Tap "..." arriba derecha',
        expectedResult: 'Menú abierto',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'tap-block',
        detail: 'Tap "Bloquear"',
        expectedResult: 'Confirmación',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'confirm-block',
        detail: 'Confirmar bloqueo',
        expectedResult: 'Usuario bloqueado',
        timeoutMs: 3000,
      },
    ],
  },

  'restrict-user': {
    id: 'restrict-user',
    name: 'Restringir usuario (suave)',
    description: 'Restringir comentarios sin bloquear',
    estimatedDurationMs: 20000,
    riskLevel: 'safe',
    rateLimitNotes: 'Sin rate limit',
    params: ['userHandle'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'open-profile',
        detail: 'Abrir perfil del usuario',
        expectedResult: 'Perfil abierto',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'tap-menu',
        detail: 'Tap "..."',
        expectedResult: 'Menú abierto',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'tap-restrict',
        detail: 'Tap "Restringir"',
        expectedResult: 'Confirmación',
        timeoutMs: 3000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'confirm-restrict',
        detail: 'Confirmar',
        expectedResult: 'Usuario restringido',
        timeoutMs: 3000,
      },
    ],
  },

  'pin-best-comment': {
    id: 'pin-best-comment',
    name: 'Pin mejor comentario',
    description: 'Fija comentario destacado en post',
    estimatedDurationMs: 30000,
    riskLevel: 'safe',
    rateLimitNotes: 'Max 3 pins por post',
    params: ['postUrl', 'commentText'],
    preconditions: [],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'open-post',
        detail: 'Abrir post',
        expectedResult: 'Post visible',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'scroll-comments',
        detail: 'Scroll a sección comentarios',
        expectedResult: 'Comments visibles',
        timeoutMs: 5000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'find-comment',
        detail: 'Buscar comentario por texto matching',
        expectedResult: 'Comment encontrado',
        timeoutMs: 5000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'swipe-left-comment',
        detail: 'Swipe izquierda sobre el comment',
        expectedResult: 'Opciones visibles',
        timeoutMs: 3000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'tap-pin',
        detail: 'Tap ícono "Pin" (chincheta)',
        expectedResult: 'Comentario fijado arriba',
        timeoutMs: 3000,
      },
    ],
  },

  'go-live-with-cohost': {
    id: 'go-live-with-cohost',
    name: 'Iniciar Live con co-host',
    description: 'Inicia transmisión Live invitando a co-host',
    estimatedDurationMs: 90000,
    riskLevel: 'low',
    rateLimitNotes: 'Sin rate limit',
    params: ['liveTitle', 'cohostHandle', 'scheduledForLater'],
    preconditions: ['Co-host disponible y siguiendo cuenta'],
    steps: [
      {
        step: 1,
        app: 'instagram',
        action: 'tap-new-post',
        detail: 'Tap "+" abajo centro',
        expectedResult: 'Menú creación',
        timeoutMs: 5000,
      },
      {
        step: 2,
        app: 'instagram',
        action: 'select-live',
        detail: 'Seleccionar "Live"',
        expectedResult: 'Editor live',
        timeoutMs: 3000,
      },
      {
        step: 3,
        app: 'instagram',
        action: 'add-title',
        detail: 'Escribir título del live',
        expectedResult: 'Título visible',
        timeoutMs: 5000,
      },
      {
        step: 4,
        app: 'instagram',
        action: 'add-cohost',
        detail: 'Tap "Agregar invitado" → buscar @cohostHandle',
        expectedResult: 'Invitado seleccionado',
        timeoutMs: 10000,
      },
      {
        step: 5,
        app: 'instagram',
        action: 'tap-go-live',
        detail: 'Tap botón "Iniciar transmisión"',
        expectedResult: 'Live iniciado',
        timeoutMs: 5000,
      },
      {
        step: 6,
        app: 'instagram',
        action: 'wait-cohost-accept',
        detail: 'Esperar que co-host acepte',
        expectedResult: 'Co-host conectado',
        timeoutMs: 30000,
      },
    ],
  },
};

export const getRecipe = (id: RecipeId): Recipe => RECIPES[id];

export const listRecipes = (filter?: { riskLevel?: Recipe['riskLevel'] }): Recipe[] => {
  const all = Object.values(RECIPES);
  return filter?.riskLevel ? all.filter((r) => r.riskLevel === filter.riskLevel) : all;
};

export const renderRecipeAsScript = (id: RecipeId, params: Record<string, unknown> = {}): string => {
  const recipe = RECIPES[id];
  const lines: string[] = [];
  lines.push(`RECIPE: ${recipe.name}`);
  lines.push(`DESCRIPCIÓN: ${recipe.description}`);
  lines.push(`RIESGO: ${recipe.riskLevel} · ${recipe.rateLimitNotes}`);
  lines.push(`DURACIÓN ESTIMADA: ${(recipe.estimatedDurationMs / 1000).toFixed(0)}s`);
  if (recipe.preconditions.length > 0) {
    lines.push('');
    lines.push('PRECONDICIONES:');
    for (const p of recipe.preconditions) lines.push(`- ${p}`);
  }
  if (recipe.params.length > 0) {
    lines.push('');
    lines.push('PARÁMETROS:');
    for (const p of recipe.params) lines.push(`- ${p}: ${JSON.stringify(params[p] ?? 'PENDING')}`);
  }
  lines.push('');
  lines.push('PASOS:');
  for (const s of recipe.steps) {
    lines.push(`${s.step}. [${s.app}] ${s.action} — ${s.detail} → ${s.expectedResult} (timeout ${s.timeoutMs}ms)`);
  }
  return lines.join('\n');
};

export const composeMultiRecipeRoutine = (
  recipeIds: RecipeId[],
  paramsPerRecipe: Record<string, Record<string, unknown>> = {},
): string => {
  const lines: string[] = [];
  lines.push(`ROUTINE COMPUESTA: ${recipeIds.length} recetas en secuencia`);
  lines.push('');
  for (let i = 0; i < recipeIds.length; i++) {
    const id = recipeIds[i]!;
    lines.push(`════ RECETA ${i + 1}/${recipeIds.length}: ${id} ════`);
    lines.push(renderRecipeAsScript(id, paramsPerRecipe[id] ?? {}));
    lines.push('');
  }
  return lines.join('\n');
};

log.info('[cuActionRecipes] loaded', { recipeCount: Object.keys(RECIPES).length });
