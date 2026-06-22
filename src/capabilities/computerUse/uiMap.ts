/**
 * Computer Use — Instagram UI Semantic Map
 * ─────────────────────────────────────────────────────────────────────────
 * Instead of fragile raw-pixel cursor control, FeedIA operates Instagram the
 * way a human would but through a *semantic* map: every actionable surface
 * the user listed (Feed, Buscador, Explorar, Perfil, Menú, DMs, Historias,
 * Reels, Crear +, Notificaciones, Barra de Historias, Cabecera, Me gusta,
 * Compartir, Guardar, Caption, Biografía, Destacadas, Contadores, Grid,
 * Foto/Nombre de perfil, Comentarios…) has a stable target descriptor:
 *
 *   • a human-readable label
 *   • the URL it lives on (when navigable directly)
 *   • robust selectors (role + accessible-name + CSS fallbacks)
 *   • the natural human gesture (click / type / scroll / hover)
 *
 * The executor consumes these targets; the planner reasons over them. The
 * map is the single source of truth so both stay in sync.
 */

export type Gesture = 'click' | 'double-click' | 'type' | 'scroll' | 'hover' | 'press' | 'wait' | 'navigate';

export interface UiTarget {
  id: string;
  label: string;
  /** Direct URL if this surface is addressable (relative to instagram.com). */
  url?: string;
  /** Ordered selector strategies — executor tries each until one resolves. */
  selectors: string[];
  /** The natural gesture a human performs on this target. */
  gesture: Gesture;
  /** Optional ARIA role for accessibility-first matching. */
  role?: string;
  /** Human-facing note about what this does. */
  note: string;
}

const T = (
  id: string,
  label: string,
  selectors: string[],
  gesture: Gesture,
  note: string,
  extra: Partial<UiTarget> = {},
): UiTarget => ({ id, label, selectors, gesture, note, ...extra });

/* ──────────────────────────────────────────────────────────────────────── */

export const INSTAGRAM_UI: UiTarget[] = [
  // ── Navegación principal / Menú ─────────────────────────────────────
  T(
    'home',
    'Feed / Inicio',
    ['a[href="/"]', 'svg[aria-label="Inicio"]', 'svg[aria-label="Home"]'],
    'click',
    'Va al feed principal.',
    { url: '/', role: 'link' },
  ),
  T(
    'search',
    'Buscador',
    ['a[href="#"] svg[aria-label="Buscar"]', 'svg[aria-label="Search"]', 'input[placeholder*="Buscar"]'],
    'click',
    'Abre el panel de búsqueda.',
    { role: 'link' },
  ),
  T(
    'explore',
    'Explorar',
    ['a[href="/explore/"]', 'svg[aria-label="Explorar"]', 'svg[aria-label="Explore"]'],
    'click',
    'Abre la pestaña Explorar.',
    { url: '/explore/', role: 'link' },
  ),
  T('reels', 'Reels', ['a[href="/reels/"]', 'svg[aria-label="Reels"]'], 'click', 'Abre el feed de Reels.', {
    url: '/reels/',
    role: 'link',
  }),
  T(
    'messages',
    'Mensajes Directos (DMs)',
    ['a[href="/direct/inbox/"]', 'svg[aria-label="Mensajes"]', 'svg[aria-label="Messenger"]'],
    'click',
    'Abre la bandeja de DMs.',
    { url: '/direct/inbox/', role: 'link' },
  ),
  T(
    'notifications',
    'Notificaciones',
    ['svg[aria-label="Notificaciones"]', 'svg[aria-label="Notifications"]', 'a[href="/accounts/activity/"]'],
    'click',
    'Abre el panel de notificaciones.',
    { role: 'link' },
  ),
  T(
    'create',
    'Crear + (publicar)',
    ['svg[aria-label="Nueva publicación"]', 'svg[aria-label="New post"]', 'svg[aria-label="Crear"]'],
    'click',
    'Abre el flujo de creación de publicación/reel/historia.',
    { role: 'button' },
  ),
  T(
    'profile',
    'Perfil propio',
    ['a[href*="/"][role="link"] img[alt*="perfil"]', 'svg[aria-label="Perfil"]', 'a[href$="/"][tabindex]'],
    'click',
    'Abre el perfil propio.',
    { role: 'link' },
  ),
  T(
    'main-menu',
    'Menú Principal (Más)',
    [
      'svg[aria-label="Configuración"]',
      'svg[aria-label="Settings"]',
      'svg[aria-label="More"]',
      'svg[aria-label="Más"]',
    ],
    'click',
    'Abre el menú principal (Más / Configuración).',
    { role: 'button' },
  ),

  // ── Barra de Historias / Historias ──────────────────────────────────
  T(
    'story-bar',
    'Barra de Historias',
    ['div[role="menu"] canvas', 'ul[role="presentation"]'],
    'scroll',
    'La fila superior de historias en el feed.',
  ),
  T(
    'story-first',
    'Primera Historia',
    ['ul[role="presentation"] li:first-child button', 'div[role="menuitem"]:first-child'],
    'click',
    'Abre la primera historia de la barra.',
    { role: 'button' },
  ),
  T(
    'story-next',
    'Siguiente Historia',
    ['button[aria-label="Siguiente"]', 'button[aria-label="Next"]'],
    'click',
    'Avanza a la siguiente historia.',
    { role: 'button' },
  ),
  T(
    'story-reply',
    'Responder Historia',
    ['textarea[placeholder*="Responder"]', 'textarea[placeholder*="Reply"]'],
    'type',
    'Escribe una respuesta a la historia abierta.',
  ),

  // ── Post / acciones sobre publicación ───────────────────────────────
  T(
    'like',
    'Botón Me gusta',
    ['svg[aria-label="Me gusta"]', 'svg[aria-label="Like"]', 'span[role="button"] svg[aria-label="Me gusta"]'],
    'click',
    'Da me gusta al post enfocado.',
    { role: 'button' },
  ),
  T(
    'comment-open',
    'Abrir Comentarios',
    ['svg[aria-label="Comentar"]', 'svg[aria-label="Comment"]'],
    'click',
    'Enfoca el área de comentarios del post.',
    { role: 'button' },
  ),
  T(
    'comment-input',
    'Campo de Comentario',
    [
      'textarea[aria-label="Agrega un comentario..."]',
      'textarea[placeholder*="comentario"]',
      'textarea[placeholder*="comment"]',
    ],
    'type',
    'Escribe un comentario.',
  ),
  T(
    'comment-post',
    'Publicar Comentario',
    ['div[role="button"]:has-text("Publicar")', 'button[type="submit"]'],
    'click',
    'Envía el comentario escrito.',
    { role: 'button' },
  ),
  T(
    'share',
    'Botón Compartir',
    ['svg[aria-label="Compartir publicación"]', 'svg[aria-label="Share Post"]', 'svg[aria-label="Compartir"]'],
    'click',
    'Abre el panel de compartir (envía por DM).',
    { role: 'button' },
  ),
  T(
    'save',
    'Botón Guardar',
    ['svg[aria-label="Guardar"]', 'svg[aria-label="Save"]'],
    'click',
    'Guarda el post en una colección.',
    { role: 'button' },
  ),
  T(
    'caption',
    'Caption del post',
    ['div[data-testid="post-comment-root"] h1', 'article span[dir="auto"]'],
    'hover',
    'El texto del caption del post enfocado.',
  ),
  T(
    'post-grid-item',
    'Ítem del Grid',
    ['article a[href*="/p/"]', 'div[style*="flex"] a[href*="/p/"]'],
    'click',
    'Abre una publicación desde el grid del perfil.',
    { role: 'link' },
  ),

  // ── Cabecera de perfil ──────────────────────────────────────────────
  T(
    'profile-pic',
    'Foto de Perfil',
    ['header img[alt*="foto del perfil"]', 'header img[alt*="profile picture"]'],
    'hover',
    'La foto de perfil en la cabecera.',
  ),
  T(
    'profile-name',
    'Nombre / Usuario',
    ['header h2', 'header h1', 'header section h2'],
    'hover',
    'El nombre de usuario en la cabecera.',
  ),
  T(
    'bio',
    'Biografía',
    ['header > section > div span[dir="auto"]', 'div._aa_c'],
    'hover',
    'El texto de la biografía del perfil.',
  ),
  T(
    'follow-counter',
    'Contador de Seguidores',
    ['a[href*="/followers/"]', 'li:has-text("seguidores")'],
    'hover',
    'El contador de seguidores.',
    { role: 'link' },
  ),
  T(
    'following-counter',
    'Contador de Seguidos',
    ['a[href*="/following/"]', 'li:has-text("seguidos")'],
    'hover',
    'El contador de cuentas seguidas.',
    { role: 'link' },
  ),
  T(
    'posts-counter',
    'Contador de Publicaciones',
    ['header li:first-child span', 'header ul li:first-child'],
    'hover',
    'El contador de publicaciones totales.',
  ),
  T(
    'highlights',
    'Historias Destacadas',
    ['div[role="button"][aria-label*="Destacada"]', 'ul li canvas'],
    'click',
    'Abre una historia destacada.',
    { role: 'button' },
  ),
  T(
    'edit-profile',
    'Editar Perfil',
    ['a[href="/accounts/edit/"]', 'div[role="button"]:has-text("Editar perfil")'],
    'click',
    'Abre la edición del perfil (bio, nombre, link).',
    { url: '/accounts/edit/', role: 'link' },
  ),
  T(
    'follow-btn',
    'Botón Seguir',
    ['button:has-text("Seguir")', 'button:has-text("Follow")'],
    'click',
    'Sigue a la cuenta del perfil abierto.',
    { role: 'button' },
  ),

  // ── Creación de contenido ───────────────────────────────────────────
  T(
    'create-select-file',
    'Seleccionar archivo',
    ['input[type="file"]', 'button:has-text("Seleccionar")'],
    'click',
    'Selecciona el archivo a subir en el flujo Crear +.',
    { role: 'button' },
  ),
  T(
    'create-next',
    'Siguiente (crear)',
    ['div[role="button"]:has-text("Siguiente")', 'button:has-text("Next")'],
    'click',
    'Avanza un paso en el flujo de creación.',
    { role: 'button' },
  ),
  T(
    'create-caption',
    'Caption (crear)',
    ['textarea[aria-label*="leyenda"]', 'div[contenteditable="true"]'],
    'type',
    'Escribe el caption de la nueva publicación.',
  ),
  T(
    'create-share',
    'Compartir (publicar)',
    ['div[role="button"]:has-text("Compartir")', 'button:has-text("Share")'],
    'click',
    'Publica la pieza creada.',
    { role: 'button' },
  ),
];

/** Direct-navigable surfaces, addressable by URL. */
export const INSTAGRAM_ROUTES: Record<string, string> = {
  feed: '/',
  explore: '/explore/',
  reels: '/reels/',
  dms: '/direct/inbox/',
  activity: '/accounts/activity/',
  editProfile: '/accounts/edit/',
};

export const getTarget = (id: string): UiTarget | undefined => INSTAGRAM_UI.find((t) => t.id === id);

export const listTargets = (): UiTarget[] => [...INSTAGRAM_UI];

/** Fuzzy resolve a Spanish/English surface name to a UI target id. */
export const resolveTargetByName = (name: string): UiTarget | undefined => {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return INSTAGRAM_UI.find((t) => {
    const label = t.label.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return label.includes(n) || n.includes(t.id) || t.id === n;
  });
};
