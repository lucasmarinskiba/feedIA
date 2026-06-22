import type { BrandProfile } from '../../config/types.js';
import { runComputerUseSession, type ComputerUseResult } from './controller.js';

/**
 * Zonas de la interfaz de Instagram con descripciones para que Claude las identifique visualmente.
 * Se usan como contexto en las sesiones de computer use.
 */
export const INSTAGRAM_UI_ZONES = {
  // ── Navegación principal ──────────────────────────────────────────────────
  menuPrincipal: {
    nombre: 'Menú Principal',
    descripcion:
      'Barra de navegación lateral (desktop) o inferior (móvil). Contiene íconos de: Inicio, Buscar, Explorar, Reels, Mensajes, Notificaciones, Crear (+) y Perfil.',
    elementosClave: [
      'ícono casa (Inicio)',
      'lupa (Buscar)',
      'brújula (Explorar)',
      'claqueta (Reels)',
      'burbuja (Mensajes)',
      'corazón (Notificaciones)',
      'más (+) (Crear)',
      'círculo de perfil (Perfil)',
    ],
  },
  feed: {
    nombre: 'Feed (Inicio)',
    descripcion:
      'Scroll vertical de posts de cuentas seguidas. Cada post tiene: foto/video, ícono de Me gusta (corazón), Comentar (burbuja), Compartir (avión de papel), Guardar (marcador/bandera). Arriba del feed está la barra de historias.',
    elementosClave: [
      'scroll vertical',
      'botón Me gusta (corazón)',
      'botón Comentar',
      'botón Compartir',
      'botón Guardar (marcador)',
      'caption del post',
      'nombre de usuario',
    ],
  },
  barraHistorias: {
    nombre: 'Barra de Historias',
    descripcion:
      'Fila horizontal en la parte superior del feed. Muestra círculos con foto de perfil de cada cuenta. El primero suele ser "Tu historia". Al hacer clic en un círculo se abre la historia de esa cuenta.',
    elementosClave: ['círculos de perfil', '"Tu historia" (primero)', 'scroll horizontal'],
  },
  cabecera: {
    nombre: 'Cabecera / Header',
    descripcion:
      'Barra superior de la aplicación. Contiene: logo de Instagram, ícono de notificaciones (corazón o campanita) y el ícono de mensajes directos (avión de papel o burbuja). En perfil propio muestra el nombre de usuario y opciones de ajustes.',
    elementosClave: [
      'logo Instagram',
      'ícono notificaciones',
      'ícono mensajes directos',
      'menú hamburguesa (en perfil)',
    ],
  },

  // ── Búsqueda y descubrimiento ─────────────────────────────────────────────
  buscador: {
    nombre: 'Buscador',
    descripcion:
      'Pantalla de búsqueda. Tiene un campo de texto arriba donde se escribe el término. Muestra resultados en tabs: Cuentas, Hashtags, Lugares. También sugiere búsquedas recientes.',
    elementosClave: [
      'campo de búsqueda (texto)',
      'tabs Cuentas / Hashtags / Lugares',
      'resultados de búsqueda',
      'historial de búsquedas',
    ],
  },
  explorar: {
    nombre: 'Explorar',
    descripcion:
      'Grid de contenido recomendado por el algoritmo. Posts e imágenes en mosaico de múltiples columnas. Al hacer clic en uno se abre el post completo con opciones de Me gusta, Comentar, Compartir y Guardar.',
    elementosClave: ['grid mosaico de posts', 'sección Reels destacados', 'sección Live'],
  },

  // ── Contenido ─────────────────────────────────────────────────────────────
  reels: {
    nombre: 'Reels',
    descripcion:
      'Scroll vertical de videos cortos en pantalla completa. Botones flotantes a la derecha: Me gusta (corazón), Comentar (burbuja), Compartir (avión), Guardar (marcador), Menú (tres puntos). Abajo: nombre usuario y caption.',
    elementosClave: [
      'video pantalla completa',
      'botón Me gusta flotante',
      'botón Comentar flotante',
      'botón Compartir flotante',
      'botón Guardar flotante',
      'caption y usuario en overlay',
    ],
  },
  historias: {
    nombre: 'Historias (Stories)',
    descripcion:
      'Vista de historia en pantalla completa con barra de progreso arriba. Botones: cerrar (X arriba derecha), opciones (tres puntos), responder (campo de texto abajo), y botón enviar corazón. Swipe para avanzar/retroceder.',
    elementosClave: [
      'barra de progreso (arriba)',
      'botón cerrar X',
      'campo responder historia',
      'botón corazón (reacción rápida)',
      'tres puntos (opciones)',
      'indicador de tiempo',
    ],
  },
  crearPublicacion: {
    nombre: 'Crear Publicación (+)',
    descripcion:
      'Modal o pantalla de creación. Al tocar el + aparecen opciones: Post, Historia, Reel, Live, Guía. Después permite seleccionar multimedia de la galería, recortar, aplicar filtros y escribir caption.',
    elementosClave: [
      'botón + en menú',
      'opciones Post/Historia/Reel',
      'galería de fotos/videos',
      'campo caption',
      'botón Compartir (publicar)',
      'selector de ubicación',
      'etiquetar personas',
    ],
  },

  // ── Perfil ────────────────────────────────────────────────────────────────
  perfil: {
    nombre: 'Perfil',
    descripcion:
      'Página de perfil de una cuenta. Contiene: foto de perfil (círculo), nombre completo, nombre de usuario, biografía (bio), botones de seguir/mensaje/contacto, historias destacadas (highlights), contadores (publicaciones/seguidores/seguidos) y el grid de posts.',
    elementosClave: [
      'foto de perfil (círculo grande)',
      'nombre y usuario',
      'biografía (bio)',
      'botón Seguir / Siguiendo',
      'botón Mensaje',
      'historias destacadas (highlights)',
      'contadores de publicaciones/seguidores/seguidos',
      'grid de posts 3 columnas',
    ],
  },
  fotoDePerfil: {
    nombre: 'Foto de Perfil',
    descripcion:
      'Círculo con la foto de la cuenta. Aparece en el perfil (tamaño grande), en la cabecera del feed, en comentarios (tamaño pequeño) y en la barra de historias.',
    elementosClave: ['círculo de imagen de perfil'],
  },
  biografia: {
    nombre: 'Biografía (Bio)',
    descripcion:
      'Texto descriptivo debajo del nombre en el perfil. Puede contener: descripción, emojis, link en bio, categoría de negocio. Para editarla: ir a Perfil → Editar perfil → campo Biografía.',
    elementosClave: ['texto bio', 'link en bio (URL clicable)', 'botón Editar perfil'],
  },
  historiasDestacadas: {
    nombre: 'Historias Destacadas (Highlights)',
    descripcion:
      'Fila de círculos debajo de la bio en el perfil. Cada círculo es un grupo de historias guardadas. Tienen una miniatura y un nombre. Se pueden crear, editar y eliminar desde el perfil.',
    elementosClave: [
      'círculos de highlights',
      'ícono + para crear nuevo',
      'nombre del highlight',
      'miniatura de portada',
    ],
  },
  contadores: {
    nombre: 'Contadores',
    descripcion:
      'Fila horizontal en el perfil con 3 números: Publicaciones (número de posts), Seguidores (followers) y Seguidos (following). Al tocar Seguidores o Seguidos se abre la lista completa.',
    elementosClave: ['número de publicaciones', 'número de seguidores (clicable)', 'número de seguidos (clicable)'],
  },
  grid: {
    nombre: 'Grid de Posts',
    descripcion:
      'Cuadrícula de 3 columnas con miniaturas de todos los posts del perfil. Al tocar una miniatura se abre el post. Hay tabs para ver posts, videos (Reels), y contenido etiquetado.',
    elementosClave: [
      'miniaturas 3x3',
      'ícono de video (si es reel)',
      'ícono de múltiples fotos (carrusel)',
      'tabs Posts / Videos / Etiquetados',
    ],
  },

  // ── Interacciones ─────────────────────────────────────────────────────────
  botonMeGusta: {
    nombre: 'Botón Me gusta',
    descripcion:
      'Ícono de corazón en cada post. Rojo cuando está marcado. En Reels está flotando a la derecha de la pantalla. Doble tap en la imagen/video también da like.',
    elementosClave: ['ícono corazón vacío (sin like)', 'ícono corazón rojo (con like)', 'contador de likes'],
  },
  botonCompartir: {
    nombre: 'Botón Compartir',
    descripcion:
      'Ícono de avión de papel. Abre un modal con opciones: compartir por DM, agregar a historia, compartir en otra app. En Reels está flotando a la derecha.',
    elementosClave: ['ícono avión de papel', 'modal de opciones de compartir', 'buscador de usuarios para DM'],
  },
  botonGuardar: {
    nombre: 'Botón Guardar',
    descripcion:
      'Ícono de marcador/bandera. Guarda el post en Colecciones. Relleno cuando está guardado. Permite guardar en colecciones específicas.',
    elementosClave: ['ícono marcador vacío', 'ícono marcador relleno (guardado)', 'modal de colecciones'],
  },
  caption: {
    nombre: 'Caption',
    descripcion:
      'Texto descriptivo debajo del post. Muestra: nombre de usuario en negrita seguido del texto. Puede tener hashtags (#), menciones (@) y links. Tiene un botón "más" para expandir si es largo.',
    elementosClave: [
      'nombre usuario en negrita',
      'texto del caption',
      'hashtags (clicables)',
      'menciones @ (clicables)',
      'botón "más"',
    ],
  },
  comentarios: {
    nombre: 'Comentarios',
    descripcion:
      'Sección debajo del caption con lista de comentarios. Muestra: foto de perfil, nombre, texto y tiempo. Se puede dar like a un comentario, responder, o reportar. El campo "Agregar un comentario" está abajo.',
    elementosClave: [
      'lista de comentarios',
      'campo "Agregar un comentario"',
      'ícono like en comentarios',
      'botón Responder',
      'botón Ver respuestas (N respuestas)',
    ],
  },

  // ── Mensajería ────────────────────────────────────────────────────────────
  mensajesDirectos: {
    nombre: 'Mensajes Directos (DMs)',
    descripcion:
      'Bandeja de entrada de mensajes directos. Lista de conversaciones con foto de perfil, nombre y último mensaje. Al tocar una conversación se abre el chat. Tiene campo de texto abajo para escribir.',
    elementosClave: [
      'lista de conversaciones',
      'ícono lápiz (nuevo mensaje)',
      'campo de texto del DM',
      'botón enviar',
      'ícono cámara (foto/video rápido)',
      'icono de reacción (corazón/emoji)',
    ],
  },

  // ── Notificaciones ────────────────────────────────────────────────────────
  notificaciones: {
    nombre: 'Notificaciones',
    descripcion:
      'Centro de actividad. Muestra: nuevos seguidores, likes, comentarios, menciones, etiquetas y solicitudes de seguimiento. Dividida en "Todo" y "Siguiendo". Cada ítem tiene foto de perfil + descripción de la acción + tiempo.',
    elementosClave: [
      'tab "Todo"',
      'tab "Siguiendo"',
      'solicitudes de seguidores (si cuenta privada)',
      'notificaciones de likes/comentarios/menciones',
    ],
  },
} as const;

export type InstagramZone = keyof typeof INSTAGRAM_UI_ZONES;

export interface InstagramNavigationOptions {
  destino: InstagramZone | string;
  accionEspecifica?: string;
  cuentaObjetivo?: string;
  maxIterations?: number;
}

const buildInstagramContext = (zona: string, accion?: string): string => {
  const zoneInfo = INSTAGRAM_UI_ZONES[zona as InstagramZone];
  const base = zoneInfo
    ? `Zona objetivo: "${zoneInfo.nombre}"\nDescripción: ${zoneInfo.descripcion}\nElementos clave a identificar: ${zoneInfo.elementosClave.join(', ')}`
    : `Zona objetivo: "${zona}"`;

  return `
Estás navegando Instagram en un navegador de escritorio (Chrome/Edge/Firefox) o en la app de Windows.
${base}
${accion ? `\nAcción específica a realizar: ${accion}` : ''}

Guía de navegación en Instagram desktop:
- Para ir al Feed: clic en el ícono de casa en la barra lateral izquierda
- Para ir a Buscar: clic en la lupa en la barra lateral
- Para ir a Explorar: clic en la brújula (después de abrir Buscar)
- Para ir a Reels: clic en el ícono de claqueta/play en la barra lateral
- Para ir a Mensajes: clic en el ícono de burbuja o avión en la barra lateral
- Para ir a Notificaciones: clic en el ícono de corazón en la barra lateral
- Para Crear (+): clic en el ícono + o "Crear" en la barra lateral
- Para ir al Perfil: clic en el círculo de perfil en la barra lateral
- Para buscar una cuenta: Buscar → escribir nombre → seleccionar de resultados
- La barra de historias está arriba del feed, scroll horizontal

Si Instagram no está abierto, abrí el navegador y navegá a instagram.com.
`.trim();
};

export const navegarInstagram = async (
  brand: BrandProfile,
  opts: InstagramNavigationOptions,
): Promise<ComputerUseResult> => {
  const context = buildInstagramContext(opts.destino, opts.accionEspecifica);
  const goal = opts.cuentaObjetivo
    ? `Navegar a la sección "${opts.destino}" de Instagram, específicamente en la cuenta @${opts.cuentaObjetivo}. ${opts.accionEspecifica ?? ''}`
    : `Navegar a la sección "${opts.destino}" de Instagram y ${opts.accionEspecifica ?? 'observar el estado actual'}.`;

  return runComputerUseSession(brand, {
    goal,
    context,
    maxIterations: opts.maxIterations ?? 15,
  });
};

export const interactuarConPost = async (
  brand: BrandProfile,
  accion: 'like' | 'comentar' | 'guardar' | 'compartir',
  contexto: string,
): Promise<ComputerUseResult> => {
  const accionDescripcion: Record<typeof accion, string> = {
    like: `dar Me gusta (clic en el ícono de corazón) en ${contexto}`,
    comentar: `escribir un comentario en ${contexto}. ${contexto}`,
    guardar: `guardar el post (clic en el ícono de marcador) de ${contexto}`,
    compartir: `compartir el post (clic en el ícono de avión de papel) de ${contexto}`,
  };

  return runComputerUseSession(brand, {
    goal: accionDescripcion[accion],
    context: buildInstagramContext('feed'),
    maxIterations: 10,
  });
};

export const leerFeed = async (brand: BrandProfile, cantidadPosts = 5): Promise<ComputerUseResult> =>
  runComputerUseSession(brand, {
    goal: `Leer y analizar los primeros ${cantidadPosts} posts del feed de Instagram. Para cada post anotá: nombre de usuario, caption (o resumen), cantidad de likes si está visible, y tipo de contenido (foto, video, carrusel, reel).`,
    context: buildInstagramContext('feed'),
    maxIterations: 12,
  });

export const buscarCuentaOHashtag = async (
  brand: BrandProfile,
  termino: string,
  tipo: 'cuenta' | 'hashtag' = 'cuenta',
): Promise<ComputerUseResult> =>
  runComputerUseSession(brand, {
    goal: `Buscar "${termino}" en Instagram (tipo: ${tipo}). Navegar al buscador, escribir el término y seleccionar el resultado más relevante.`,
    context: buildInstagramContext('buscador'),
    maxIterations: 10,
  });

export const leerDMs = async (brand: BrandProfile, limite = 10): Promise<ComputerUseResult> =>
  runComputerUseSession(brand, {
    goal: `Abrir la bandeja de Mensajes Directos de Instagram y leer los últimos ${limite} mensajes. Para cada conversación anotá: nombre del usuario, primer línea del último mensaje, y si parece una consulta de venta/soporte/otro.`,
    context: buildInstagramContext('mensajesDirectos'),
    maxIterations: 15,
  });

export const verPerfil = async (brand: BrandProfile, cuenta: string): Promise<ComputerUseResult> =>
  runComputerUseSession(brand, {
    goal: `Buscar y visitar el perfil completo de @${cuenta} en Instagram. Anotar: foto de perfil, nombre, bio completa, cantidad de seguidores/seguidos/publicaciones, historias destacadas (nombres), y los últimos 6 posts del grid.`,
    context: buildInstagramContext('perfil', `Ver perfil de @${cuenta}`),
    maxIterations: 12,
  });

export const verNotificaciones = async (brand: BrandProfile): Promise<ComputerUseResult> =>
  runComputerUseSession(brand, {
    goal: 'Abrir el centro de notificaciones de Instagram y leer las últimas 20 notificaciones. Clasificar por tipo: nuevo seguidor, like, comentario, mención, etiqueta. Devolver resumen estructurado.',
    context: buildInstagramContext('notificaciones'),
    maxIterations: 10,
  });
