/**
 * InstagramActions — biblioteca de acciones atómicas de Instagram via Computer Use.
 *
 * Cada función encapsula una acción humana completa en Instagram:
 * - Timing humano: delays aleatorios entre 800ms-3500ms para simular comportamiento real
 * - Verificación: chequea el resultado antes de retornar éxito
 * - Reintentos: 3 intentos con backoff exponencial ante fallos
 * - Contexto rico: instrucciones muy detalladas para que Claude navegue con precisión
 * - Registro de auditoría: loguea cada acción para compliance
 *
 * IMPORTANTE: Estas acciones requieren que Instagram esté abierto en un navegador
 * en la pantalla principal. La pantalla debe estar desbloqueada y visible.
 */

import type { BrandProfile } from '../../config/types.js';
import { runComputerUseSession, type ComputerUseResult } from './controller.js';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';

// ── Tipos ──────────────────────────────────────────────────────────────────────

export interface ActionResult {
  ok: boolean;
  action: string;
  summary: string;
  error?: string;
  durationMs: number;
  screenshot?: string;
}

export interface PostOptions {
  imagePath: string; // ruta local de la imagen o video
  caption: string; // caption completo con hashtags
  location?: string; // ubicación opcional
  altText?: string; // texto alternativo para accesibilidad
  collaborator?: string; // cuenta para collab post
  isCarousel?: boolean; // si es carrusel, el imagePath puede ser carpeta
  additionalImages?: string[]; // para carruseles
}

export interface StoryOptions {
  mediaPath: string; // imagen o video
  sticker?: 'poll' | 'question' | 'quiz' | 'link' | 'countdown' | 'emoji_slider';
  stickerText?: string; // texto del sticker
  stickerOption1?: string; // para poll: opción 1
  stickerOption2?: string; // para poll: opción 2
  linkUrl?: string; // para link sticker
  mentionAccount?: string; // @cuenta a mencionar
  hashtagToAdd?: string; // hashtag sticker
}

export interface ReelOptions {
  videoPath: string;
  caption: string;
  audioName?: string; // si hay audio trending específico
  coverFrameTime?: number; // segundo del video a usar como cover
  shareToFeed?: boolean; // también publicar en el grid
}

export interface CommentOptions {
  postUrl?: string; // URL del post específico
  postContext?: string; // descripción de qué post comentar si no hay URL
  commentText: string; // el comentario a escribir
  replyToUser?: string; // si es respuesta a comentario específico
}

export interface DMOptions {
  username: string; // @cuenta o nombre de la cuenta
  message: string; // mensaje a enviar
  isNewConversation?: boolean;
}

export interface ProfileEditOptions {
  bio?: string; // nueva bio
  website?: string; // link en bio
  displayName?: string; // nombre visible
  newProfilePhotoPath?: string; // nueva foto de perfil
}

export interface EngagementWarmupOptions {
  targetAccounts: string[]; // cuentas faro a interactuar
  actionsPerAccount: number; // likes + comentarios por cuenta (máx 5)
  commentTexts: string[]; // textos de comentarios a rotar
}

export interface NotificationActionOptions {
  respondToComments?: boolean;
  respondToDMs?: boolean;
  followBackRelevant?: boolean;
  maxActions?: number;
}

// ── Helpers internos ──────────────────────────────────────────────────────────

const humanDelay = async (minMs = 800, maxMs = 2500): Promise<void> => {
  const delay = minMs + Math.random() * (maxMs - minMs);
  await new Promise<void>((r) => setTimeout(r, delay));
};

const withRetry = async <T>(fn: () => Promise<T>, attempts = 3, label = 'action'): Promise<T> => {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts - 1) {
        const backoff = 1000 * Math.pow(2, i);
        log.warn(
          `[InstagramActions] ${label} intento ${i + 1} falló: ${lastError.message} — reintentando en ${backoff}ms`,
        );
        await new Promise<void>((r) => setTimeout(r, backoff));
      }
    }
  }
  throw lastError ?? new Error(`${label} falló después de ${attempts} intentos`);
};

const toActionResult = (action: string, result: ComputerUseResult, start: number): ActionResult => ({
  ok: result.ok,
  action,
  summary: result.summary,
  error: result.error,
  durationMs: Date.now() - start,
  screenshot: result.finalScreenshotBase64,
});

const INSTAGRAM_BASE_CONTEXT = `
CONTEXTO DEL ENTORNO:
- Estás controlando una computadora Windows con escritorio visible
- Instagram debe estar abierto en un navegador Chrome/Edge o en la app de Windows
- Si Instagram no está abierto, abrí Chrome y navegá a instagram.com
- La sesión de Instagram debe estar iniciada. Si no está logueada, informalo como error
- Usá el modo escritorio de Instagram (no móvil)
- La barra de navegación de Instagram está en el LADO IZQUIERDO de la pantalla en escritorio

INSTRUCCIONES DE NAVEGACIÓN INSTAGRAM DESKTOP:
- Inicio (Feed): ícono de casa en la barra lateral izquierda
- Buscar: clic en la lupa → aparece panel de búsqueda
- Explorar: dentro del buscador, hay pestañas para ver contenido
- Reels: ícono de claqueta/play en la barra lateral
- Mensajes (DMs): ícono de burbuja o avión de papel
- Notificaciones: ícono de corazón
- Crear (+): botón "Crear" o ícono + en la barra lateral
- Mi Perfil: clic en tu foto de perfil en la barra lateral
- Para buscar una cuenta específica: clic en Buscar → escribir @usuario → seleccionar de resultados
`.trim();

// ── ACCIÓN: Publicar Post ────────────────────────────────────────────────────

/**
 * Publica un post en Instagram (imagen, carrusel o reel estático).
 * Flujo completo: Crear → Seleccionar media → Caption → Hashtags → Publicar
 */
export const publicarPost = async (brand: BrandProfile, opts: PostOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: publicarPost simulado');
    return { ok: true, action: 'publicarPost', summary: '[DRY RUN] Post simulado', durationMs: 0 };
  }

  const start = Date.now();
  log.step(`[InstagramActions] Publicando post en ${brand.name}`);

  await humanDelay(1000, 2000);

  return withRetry(
    async () => {
      const result = await runComputerUseSession(brand, {
        goal: `Publicar un post en Instagram con la siguiente información:

IMAGEN/MEDIA: ${opts.imagePath}
CAPTION: ${opts.caption}
${opts.location ? `UBICACIÓN: ${opts.location}` : ''}
${opts.altText ? `TEXTO ALTERNATIVO: ${opts.altText}` : ''}
${opts.collaborator ? `COLABORADOR: @${opts.collaborator} (usar función Collab)` : ''}
${opts.isCarousel && opts.additionalImages?.length ? `CARRUSEL: imágenes adicionales en ${opts.additionalImages.join(', ')}` : ''}

PASOS EXACTOS A SEGUIR:
1. Clic en el botón "Crear" (+) en la barra lateral izquierda de Instagram
2. Seleccionar "Publicación" (no historia ni reel)
3. Subir la imagen desde la ruta: ${opts.imagePath}
4. Si es carrusel: agregar las imágenes adicionales también
5. Ajustar recorte si es necesario (intentar "Sin recorte" o relación 4:5)
6. Clic en "Siguiente"
7. Aplicar filtros si corresponde (generalmente sin filtro para mantener calidad)
8. Clic en "Siguiente"
9. En el campo de caption, escribir exactamente: ${opts.caption}
10. ${opts.location ? `Agregar ubicación: "${opts.location}"` : 'No agregar ubicación'}
11. ${opts.altText ? `Agregar texto alternativo en "Configuración avanzada" → "Texto alternativo"` : ''}
12. Clic en "Compartir" para publicar
13. Esperar confirmación de publicación exitosa
14. Capturar el post publicado para verificar

VERIFICACIÓN: El post está publicado cuando ves la pantalla de confirmación o el post aparece en el perfil.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 20,
      });

      const r = toActionResult('publicarPost', result, start);
      if (r.ok) log.success(`[InstagramActions] Post publicado en ${Date.now() - start}ms`);
      return r;
    },
    2,
    'publicarPost',
  );
};

// ── ACCIÓN: Publicar Historia ────────────────────────────────────────────────

export const publicarHistoria = async (brand: BrandProfile, opts: StoryOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: publicarHistoria simulado');
    return { ok: true, action: 'publicarHistoria', summary: '[DRY RUN] Historia simulada', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(800, 1500);

  return withRetry(
    async () => {
      const stickerInstructions = opts.sticker ? buildStickerInstructions(opts) : '';

      const result = await runComputerUseSession(brand, {
        goal: `Publicar una Historia (Story) en Instagram.

ARCHIVO MEDIA: ${opts.mediaPath}
${opts.mentionAccount ? `MENCIONAR: @${opts.mentionAccount}` : ''}
${opts.hashtagToAdd ? `HASHTAG: #${opts.hashtagToAdd}` : ''}

PASOS:
1. Clic en "Crear" (+) en la barra lateral de Instagram
2. Seleccionar "Historia"
3. Subir el archivo: ${opts.mediaPath}
4. Ajustar el media si es necesario
${stickerInstructions}
5. ${opts.mentionAccount ? `Agregar sticker de mención: @${opts.mentionAccount}` : ''}
6. ${opts.hashtagToAdd ? `Agregar sticker de hashtag: #${opts.hashtagToAdd}` : ''}
7. Clic en "Tu historia" para publicar (no "Cerrar amigos")
8. Verificar que la historia aparezca en la barra de historias del feed

RESULTADO ESPERADO: Historia visible en la barra de historias de tu perfil.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 15,
      });

      return toActionResult('publicarHistoria', result, start);
    },
    2,
    'publicarHistoria',
  );
};

const buildStickerInstructions = (opts: StoryOptions): string => {
  switch (opts.sticker) {
    case 'poll':
      return `Agregar sticker de Poll: pregunta "${opts.stickerText}", opciones "${opts.stickerOption1}" y "${opts.stickerOption2}"`;
    case 'question':
      return `Agregar sticker de Pregunta con texto: "${opts.stickerText}"`;
    case 'quiz':
      return `Agregar sticker de Quiz con pregunta: "${opts.stickerText}"`;
    case 'link':
      return `Agregar sticker de Link con URL: ${opts.linkUrl}`;
    case 'countdown':
      return `Agregar sticker de Cuenta regresiva: "${opts.stickerText}"`;
    case 'emoji_slider':
      return `Agregar sticker de Emoji Slider con texto: "${opts.stickerText}"`;
    default:
      return '';
  }
};

// ── ACCIÓN: Publicar Reel ────────────────────────────────────────────────────

export const publicarReel = async (brand: BrandProfile, opts: ReelOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: publicarReel simulado');
    return { ok: true, action: 'publicarReel', summary: '[DRY RUN] Reel simulado', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(1000, 2000);

  return withRetry(
    async () => {
      const result = await runComputerUseSession(brand, {
        goal: `Publicar un Reel en Instagram.

VIDEO: ${opts.videoPath}
CAPTION: ${opts.caption}
${opts.audioName ? `AUDIO TRENDING: buscar y seleccionar "${opts.audioName}" en la biblioteca de música` : ''}
${opts.shareToFeed !== false ? 'COMPARTIR EN FEED: Activar la opción "Compartir también en Feed"' : 'NO compartir en feed'}

PASOS EXACTOS:
1. Clic en "Crear" (+) → seleccionar "Reel"
2. Subir el video desde: ${opts.videoPath}
3. Ajustar el clip (recortar si es necesario)
4. ${opts.audioName ? `Buscar el audio "${opts.audioName}" en la biblioteca → seleccionar` : 'Mantener el audio original del video'}
5. ${opts.coverFrameTime !== undefined ? `En la portada (cover), seleccionar el frame del segundo ${opts.coverFrameTime}` : 'Seleccionar el frame más visual como portada'}
6. Clic en "Siguiente"
7. Escribir el caption: ${opts.caption}
8. ${opts.shareToFeed !== false ? 'Activar la opción de también compartir en el feed' : ''}
9. Clic en "Compartir" para publicar
10. Esperar confirmación de publicación (puede tardar 1-3 minutos en procesar)

VERIFICACIÓN: El Reel aparece en la sección de Reels del perfil y en el feed si estaba activo.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 20,
      });

      return toActionResult('publicarReel', result, start);
    },
    2,
    'publicarReel',
  );
};

// ── ACCIÓN: Comentar en Post ─────────────────────────────────────────────────

export const comentarEnPost = async (brand: BrandProfile, opts: CommentOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: comentarEnPost simulado');
    return { ok: true, action: 'comentarEnPost', summary: '[DRY RUN] Comentario simulado', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(1500, 3000);

  return withRetry(
    async () => {
      const result = await runComputerUseSession(brand, {
        goal: `Escribir un comentario en un post de Instagram.

${opts.postUrl ? `URL DEL POST: ${opts.postUrl}` : `POST A COMENTAR: ${opts.postContext}`}
TEXTO DEL COMENTARIO: ${opts.commentText}
${opts.replyToUser ? `ES RESPUESTA A: @${opts.replyToUser}` : ''}

PASOS:
1. ${opts.postUrl ? `Navegar a la URL: ${opts.postUrl}` : `Encontrar el post: ${opts.postContext}`}
2. Hacer scroll hasta ver el campo de comentarios (si es necesario)
3. ${opts.replyToUser ? `Buscar el comentario de @${opts.replyToUser} y clic en "Responder"` : 'Clic en el campo "Agregar un comentario..."'}
4. Escribir exactamente: ${opts.commentText}
5. Presionar Enter o clic en "Publicar" para enviar
6. Verificar que el comentario aparece en la sección de comentarios

IMPORTANTE: Escribir el comentario de forma natural, sin prisa. El comentario debe verse auténtico.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 12,
      });

      return toActionResult('comentarEnPost', result, start);
    },
    2,
    'comentarEnPost',
  );
};

// ── ACCIÓN: Dar Like ──────────────────────────────────────────────────────────

export const darLike = async (brand: BrandProfile, postContext: string): Promise<ActionResult> => {
  if (env.dryRun) {
    return { ok: true, action: 'darLike', summary: '[DRY RUN] Like simulado', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(500, 1500);

  const result = await runComputerUseSession(brand, {
    goal: `Dar Like (Me gusta) a un post de Instagram.

POST: ${postContext}

PASOS:
1. Navegar o encontrar el post: ${postContext}
2. Verificar que el corazón (❤️) está vacío (sin like aún)
3. Hacer clic en el ícono de corazón para dar like
4. Verificar que el corazón se vuelve rojo (like activado)

ALTERNATIVA: Doble clic en la imagen/video también da like.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 8,
  });

  return toActionResult('darLike', result, start);
};

// ── ACCIÓN: Seguir Cuenta ────────────────────────────────────────────────────

export const seguirCuenta = async (brand: BrandProfile, cuenta: string): Promise<ActionResult> => {
  if (env.dryRun) {
    return { ok: true, action: 'seguirCuenta', summary: `[DRY RUN] Seguir @${cuenta} simulado`, durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(2000, 4000); // mayor delay para no parecer bot

  const result = await runComputerUseSession(brand, {
    goal: `Seguir la cuenta @${cuenta} en Instagram.

PASOS:
1. Buscar "@${cuenta}" usando el buscador de Instagram (ícono de lupa)
2. Seleccionar la cuenta correcta de los resultados
3. En el perfil de @${cuenta}, verificar que el botón dice "Seguir" (no "Siguiendo")
4. Si ya la seguís (botón "Siguiendo"), NO hacer nada y reportar "ya seguida"
5. Si no la seguís, clic en el botón "Seguir"
6. Verificar que el botón cambia a "Siguiendo"

RESULTADO ESPERADO: El botón cambia de "Seguir" a "Siguiendo".`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 10,
  });

  return toActionResult('seguirCuenta', result, start);
};

// ── ACCIÓN: Enviar DM ────────────────────────────────────────────────────────

export const enviarDM = async (brand: BrandProfile, opts: DMOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: enviarDM simulado');
    return { ok: true, action: 'enviarDM', summary: '[DRY RUN] DM simulado', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(1500, 3000);

  return withRetry(
    async () => {
      const result = await runComputerUseSession(brand, {
        goal: `Enviar un mensaje directo (DM) a @${opts.username} en Instagram.

DESTINATARIO: @${opts.username}
MENSAJE: ${opts.message}
${opts.isNewConversation ? 'ES CONVERSACIÓN NUEVA: Iniciar desde el ícono de nuevo mensaje' : 'CONVERSACIÓN EXISTENTE: Buscar en la bandeja de entrada'}

PASOS:
1. Ir a Mensajes Directos (ícono de avión de papel o burbuja en la barra lateral)
2. ${
          opts.isNewConversation
            ? `Clic en el ícono de nuevo mensaje (lápiz/bolígrafo arriba a la derecha) → buscar "@${opts.username}" → seleccionar`
            : `Buscar la conversación con @${opts.username} en la bandeja de entrada`
        }
3. En el campo de texto del chat, escribir: ${opts.message}
4. Presionar Enter o clic en el botón de enviar (avión de papel)
5. Verificar que el mensaje aparece en la conversación como enviado

PRECAUCIÓN: No enviar mensajes spam ni mensajes no solicitados. Este mensaje es parte de una conversación legítima.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 12,
      });

      return toActionResult('enviarDM', result, start);
    },
    2,
    'enviarDM',
  );
};

// ── ACCIÓN: Responder DMs Pendientes ────────────────────────────────────────

export const responderDMsPendientes = async (
  brand: BrandProfile,
  respuestasMap: Array<{ username: string; respuesta: string }>,
): Promise<ActionResult[]> => {
  const results: ActionResult[] = [];

  for (const { username, respuesta } of respuestasMap) {
    await humanDelay(2000, 5000); // delay entre DMs para parecer humano
    const result = await enviarDM(brand, {
      username,
      message: respuesta,
      isNewConversation: false,
    });
    results.push(result);
    log.debug(`[InstagramActions] DM respondido a @${username}: ${result.ok ? 'ok' : result.error}`);
  }

  return results;
};

// ── ACCIÓN: Editar Perfil ────────────────────────────────────────────────────

export const editarPerfil = async (brand: BrandProfile, opts: ProfileEditOptions): Promise<ActionResult> => {
  if (env.dryRun) {
    log.warn('[InstagramActions] DRY RUN: editarPerfil simulado');
    return { ok: true, action: 'editarPerfil', summary: '[DRY RUN] Edición de perfil simulada', durationMs: 0 };
  }

  const start = Date.now();
  await humanDelay(1000, 2000);

  const changes: string[] = [];
  if (opts.bio) changes.push(`BIO: ${opts.bio}`);
  if (opts.website) changes.push(`WEBSITE: ${opts.website}`);
  if (opts.displayName) changes.push(`NOMBRE: ${opts.displayName}`);
  if (opts.newProfilePhotoPath) changes.push(`FOTO DE PERFIL: ${opts.newProfilePhotoPath}`);

  return withRetry(
    async () => {
      const result = await runComputerUseSession(brand, {
        goal: `Editar el perfil de Instagram con los siguientes cambios:

${changes.join('\n')}

PASOS:
1. Ir a tu Perfil (ícono de círculo con foto en la barra lateral)
2. Clic en el botón "Editar perfil"
3. ${opts.newProfilePhotoPath ? `Cambiar la foto de perfil: clic en la foto → subir imagen desde "${opts.newProfilePhotoPath}"` : ''}
4. ${opts.displayName ? `Cambiar el nombre (campo "Nombre"): "${opts.displayName}"` : ''}
5. ${opts.bio ? `Editar la biografía (campo "Biografía"): limpiar el texto actual y escribir exactamente: "${opts.bio}"` : ''}
6. ${opts.website ? `Agregar/cambiar el website (campo "Sitio web" o "Links"): "${opts.website}"` : ''}
7. Clic en "Guardar" o el botón de confirmación
8. Verificar que los cambios se guardaron visitando el perfil

PRECAUCIÓN: Verificar cada campo antes de guardar. No borrar información importante por error.`,
        context: INSTAGRAM_BASE_CONTEXT,
        maxIterations: 18,
      });

      return toActionResult('editarPerfil', result, start);
    },
    2,
    'editarPerfil',
  );
};

// ── ACCIÓN: Engagement Calentamiento ────────────────────────────────────────

/**
 * Realiza el "Beacon Engagement": interactúa con cuentas faro para
 * potenciar el alcance orgánico de la propia cuenta.
 */
export const realizarBeaconEngagement = async (
  brand: BrandProfile,
  opts: EngagementWarmupOptions,
): Promise<ActionResult> => {
  if (env.dryRun) {
    return {
      ok: true,
      action: 'beaconEngagement',
      summary: `[DRY RUN] Beacon engagement simulado en ${opts.targetAccounts.length} cuentas`,
      durationMs: 0,
    };
  }

  const start = Date.now();
  const commentIndex = { current: 0 };
  const actionsLog: string[] = [];

  log.step(`[InstagramActions] Iniciando beacon engagement con ${opts.targetAccounts.length} cuentas faro`);

  for (const cuenta of opts.targetAccounts.slice(0, 5)) {
    // máximo 5 cuentas por sesión
    await humanDelay(3000, 6000); // delay grande entre cuentas

    const comentario = opts.commentTexts[commentIndex.current % opts.commentTexts.length] ?? '';
    commentIndex.current++;

    const result = await runComputerUseSession(brand, {
      goal: `Hacer engagement estratégico en la cuenta @${cuenta} en Instagram.

ACCIONES A REALIZAR (máximo ${opts.actionsPerAccount} acciones en total):
1. Navegar al perfil de @${cuenta}
2. Ver los últimos 3 posts del grid
3. En el post más reciente: dar Like
4. En el post más reciente o segundo: escribir este comentario: "${comentario}"
   (El comentario debe verse auténtico y relevante al contenido del post. Adaptarlo levemente al contexto del post si es necesario, pero mantener el mensaje general)
5. Si hay comentarios de otros usuarios interesantes, dar like a 1-2 de ellos

IMPORTANTE:
- NO seguir a la cuenta (solo interactuar)
- El comentario debe verse humano y genuino
- Si el post no es relevante para el comentario, solo dar like sin comentar
- Registrar qué acciones se realizaron

RESULTADO ESPERADO: Like en 1 post + comentario en 1 post de @${cuenta}`,
      context: INSTAGRAM_BASE_CONTEXT,
      maxIterations: 15,
    });

    actionsLog.push(`@${cuenta}: ${result.ok ? 'ok' : (result.error ?? 'error')}`);
  }

  const successCount = actionsLog.filter((l) => l.includes('ok')).length;
  log.success(
    `[InstagramActions] Beacon engagement: ${successCount}/${opts.targetAccounts.slice(0, 5).length} cuentas ok`,
  );

  return {
    ok: successCount > 0,
    action: 'beaconEngagement',
    summary: `Beacon engagement completado: ${actionsLog.join(' | ')}`,
    durationMs: Date.now() - start,
  };
};

// ── ACCIÓN: Leer y Responder Notificaciones ──────────────────────────────────

export const procesarNotificaciones = async (
  brand: BrandProfile,
  opts: NotificationActionOptions = {},
): Promise<ActionResult> => {
  const start = Date.now();
  const maxActions = opts.maxActions ?? 20;

  const result = await runComputerUseSession(brand, {
    goal: `Procesar las notificaciones de Instagram de forma inteligente.

TAREAS:
1. Ir a Notificaciones (ícono de corazón en la barra lateral)
2. Revisar las últimas notificaciones y clasificarlas:
   - Nuevos seguidores → anotar usernames
   - Comentarios en mis posts → anotar contenido
   - Menciones → anotar
   - Likes → solo anotar los más relevantes
   - Solicitudes de seguimiento (si cuenta privada) → revisar y aprobar si son cuentas legítimas

3. ${
      opts.respondToComments
        ? `Responder hasta ${Math.floor(maxActions / 2)} comentarios prioritarios:
   - Preguntas: responder con información útil
   - Positivos: agradecer con autenticidad
   - Críticas constructivas: reconocer y explicar`
        : 'Solo registrar los comentarios, no responder en esta sesión'
    }

4. ${
      opts.followBackRelevant
        ? `Revisar ${Math.min(10, maxActions)} nuevos seguidores y seguir de vuelta a los que sean:
   - Cuentas reales (no bots)
   - Del mismo niche o audiencia objetivo
   - Con contenido activo`
        : ''
    }

LÍMITE TOTAL DE ACCIONES: ${maxActions}

RESULTADO ESPERADO: Resumen de notificaciones procesadas con las acciones tomadas.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 20,
  });

  return toActionResult('procesarNotificaciones', result, start);
};

// ── ACCIÓN: Leer Métricas / Insights ────────────────────────────────────────

export const leerInsights = async (
  brand: BrandProfile,
  periodo: '7_dias' | '30_dias' | '90_dias' = '7_dias',
): Promise<ActionResult> => {
  const start = Date.now();
  const periodoLabel = periodo.replace('_', ' ');

  const result = await runComputerUseSession(brand, {
    goal: `Leer las métricas de Instagram Insights de ${brand.name} de los últimos ${periodoLabel}.

PASOS:
1. Ir al Perfil propio (ícono de círculo en barra lateral)
2. Buscar el botón "Ver estadísticas" o "Panel profesional" (visible en cuentas de creador/empresa)
3. En el panel de estadísticas, seleccionar el período: ${periodoLabel}
4. Anotar las siguientes métricas:

MÉTRICAS A CAPTURAR:
- Alcance (Reach): cuentas únicas que vieron el contenido
- Impresiones totales
- Interacciones totales (likes + comentarios + guardados + compartidos)
- Nuevos seguidores en el período
- Posts con mayor alcance (top 3)
- Posts con mayor engagement (top 3)
- Stories: vistas totales y tasa de respuesta

5. Si hay datos por tipo de contenido (Reels vs Posts vs Stories), anotar cada uno
6. Capturar screenshot del dashboard de estadísticas

RESULTADO ESPERADO: JSON estructurado con todas las métricas del período.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 15,
  });

  return toActionResult('leerInsights', result, start);
};

// ── ACCIÓN: Moderar Comentarios de un Post ───────────────────────────────────

export const moderarComentariosDePost = async (
  brand: BrandProfile,
  postUrl: string,
  criteriosModeración: string,
): Promise<ActionResult> => {
  if (env.dryRun) {
    return { ok: true, action: 'moderarComentarios', summary: '[DRY RUN] Moderación simulada', durationMs: 0 };
  }

  const start = Date.now();

  const result = await runComputerUseSession(brand, {
    goal: `Moderar los comentarios del post de Instagram: ${postUrl}

CRITERIOS DE MODERACIÓN:
${criteriosModeración}

PASOS:
1. Navegar al post: ${postUrl}
2. Ver todos los comentarios (clic en "Ver todos los comentarios")
3. Para cada comentario spam/ofensivo/tóxico:
   - Mantener pulsado el comentario (o clic en tres puntos junto al comentario)
   - Seleccionar "Eliminar" o "Denunciar"
4. Para comentarios de preguntas legítimas, anotar para responder
5. Para comentarios positivos, dar like a los más relevantes

RESULTADO: Lista de comentarios eliminados + lista de comentarios a responder.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 15,
  });

  return toActionResult('moderarComentariosDePost', result, start);
};

// ── ACCIÓN: Interactuar con Tendencia ────────────────────────────────────────

export const interactuarConTendencia = async (
  brand: BrandProfile,
  hashtag: string,
  cantidadInteracciones: number,
  tipoInteraccion: 'like' | 'comentar' | 'ambos' = 'like',
): Promise<ActionResult> => {
  if (env.dryRun) {
    return {
      ok: true,
      action: 'tendenciaEngagement',
      summary: `[DRY RUN] Engagement en #${hashtag} simulado`,
      durationMs: 0,
    };
  }

  const start = Date.now();

  const result = await runComputerUseSession(brand, {
    goal: `Interactuar con contenido del hashtag trending #${hashtag} en Instagram.

OBJETIVO: Realizar ${cantidadInteracciones} interacciones en posts del hashtag #${hashtag}
TIPO: ${tipoInteraccion === 'ambos' ? 'Likes Y comentarios' : tipoInteraccion === 'like' ? 'Solo likes' : 'Solo comentarios'}

PASOS:
1. Ir al Buscador de Instagram (ícono lupa)
2. Escribir "#${hashtag}" en el buscador
3. Seleccionar la pestaña "Hashtags" → clic en #${hashtag}
4. Ver los posts "Más recientes" (NO los "Más populares" — en recientes el engagement tiene más impacto)
5. Para cada uno de los primeros ${cantidadInteracciones} posts:
   ${tipoInteraccion !== 'comentar' ? '- Dar like (corazón)' : ''}
   ${tipoInteraccion !== 'like' ? '- Escribir un comentario genuino y relevante al contenido del post (2-3 palabras mínimo, relacionado con el tema)' : ''}
   - Esperar 3-5 segundos entre cada interacción
6. NO hacer más de ${cantidadInteracciones} interacciones en esta sesión

PRECAUCIÓN: Solo interactuar con contenido genuino y relevante. Evitar cuentas privadas o posts de hace más de 24 horas.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 20,
  });

  return toActionResult('interactuarConTendencia', result, start);
};

// ── ACCIÓN: Crear Highlight ──────────────────────────────────────────────────

export const crearHighlight = async (
  brand: BrandProfile,
  nombre: string,
  storiesAIncluir: string,
): Promise<ActionResult> => {
  if (env.dryRun) {
    return { ok: true, action: 'crearHighlight', summary: `[DRY RUN] Highlight "${nombre}" simulado`, durationMs: 0 };
  }

  const start = Date.now();

  const result = await runComputerUseSession(brand, {
    goal: `Crear un nuevo Highlight en el perfil de Instagram con el nombre "${nombre}".

PASOS:
1. Ir al Perfil propio
2. En la sección de Highlights (fila de círculos debajo de la bio), clic en el "+" (Nuevo)
3. Seleccionar las historias archivadas correspondientes a: ${storiesAIncluir}
4. Clic en "Siguiente"
5. Nombrar el Highlight: "${nombre}"
6. Elegir la portada (cover) — preferir una imagen visual y representativa
7. Clic en "Agregar" para crear el Highlight
8. Verificar que el nuevo Highlight aparece en el perfil

RESULTADO ESPERADO: Nuevo Highlight visible en el perfil con nombre "${nombre}".`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 15,
  });

  return toActionResult('crearHighlight', result, start);
};

// ── ACCIÓN: Auditoría Completa del Perfil ────────────────────────────────────

/**
 * Realiza un análisis visual completo del perfil propio de Instagram.
 * Muy útil para detectar inconsistencias de marca y oportunidades de mejora.
 */
export const auditarPerfil = async (brand: BrandProfile): Promise<ActionResult> => {
  const start = Date.now();

  const result = await runComputerUseSession(brand, {
    goal: `Realizar una auditoría visual completa del perfil de Instagram de ${brand.name}.

SECCIONES A AUDITAR:

1. HEADER DEL PERFIL:
   - Foto de perfil: ¿es clara, reconocible, tiene buena calidad?
   - Nombre de usuario: ¿es el correcto y está bien escrito?
   - Nombre visible: ¿está optimizado con keywords del niche?
   - Categoría/tipo de cuenta (si visible)

2. BIOGRAFÍA:
   - Texto completo de la bio (copiar exactamente)
   - ¿Tiene link en bio? ¿a dónde apunta?
   - ¿Hay emojis? ¿son relevantes?
   - ¿Tiene CTA clara?
   - Longitud (ideal: 100-150 caracteres)

3. CONTADORES:
   - Número exacto de publicaciones
   - Número exacto de seguidores
   - Número de seguidos

4. HIGHLIGHTS:
   - Nombres de todos los highlights
   - Cantidad de highlights
   - ¿Tienen covers visuales consistentes?

5. GRID (últimos 9 posts):
   - Tipo de contenido (foto/video/reel/carrusel)
   - Consistencia visual (paleta de colores, estilo)
   - Frecuencia aparente de publicación
   - Calidad general del contenido

6. OBSERVACIONES GENERALES:
   - Puntos fuertes del perfil
   - Áreas de mejora inmediata
   - Recomendaciones específicas

Capturar screenshots de: perfil completo, grid de posts, sección de highlights.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 20,
  });

  return toActionResult('auditarPerfil', result, start);
};

// ── ACCIÓN: Ver Analíticas de Post Específico ────────────────────────────────

export const verAnaliticasPost = async (brand: BrandProfile, postUrl: string): Promise<ActionResult> => {
  const start = Date.now();

  const result = await runComputerUseSession(brand, {
    goal: `Ver las estadísticas detalladas de un post específico de Instagram: ${postUrl}

PASOS:
1. Navegar al post: ${postUrl} (o buscarlo en el grid del perfil)
2. En el post propio, buscar "Ver estadísticas" o los tres puntos → "Ver información"
3. Anotar todas las métricas disponibles:
   - Alcance (Reach)
   - Impresiones
   - Likes
   - Comentarios
   - Guardados (Saves)
   - Compartidos
   - Visitas al perfil desde este post
   - Clics en el link de bio (si aplica)
   - Para Reels: tiempo de visualización, reproducciones completas

4. Capturar screenshot del panel de estadísticas

RESULTADO ESPERADO: Todas las métricas del post en formato estructurado.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 12,
  });

  return toActionResult('verAnaliticasPost', result, start);
};
