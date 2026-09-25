/**
 * InstagramActions — acciones de Computer Use para OPERAR LA CUENTA PROPIA de
 * Instagram cuando no existe alternativa de API oficial: perfil, highlights,
 * moderar comentarios del propio post, leer notificaciones/insights.
 *
 * Publicar contenido (post/story/reel) NO pasa por acá: usa la Content
 * Publishing API real vía el agregador certificado Upload-Post
 * (integrations/uploadPost.ts), el mismo camino que ya usa TikTok — ver
 * capabilities/computerUse/desktopWorkflows.ts, que orquesta la parte
 * creativa (editar en Canva/CapCut, redactar caption, elegir hashtags) y
 * entrega el archivo final a uploadToSocial() para el paso de publicación.
 *
 * Se ELIMINARON las acciones que interactuaban con cuentas AJENAS o
 * duplicaban un sistema ya compliant vía API — cada una es exactamente lo
 * que Meta prohíbe (instagramRules.ts) o lo que ya resuelve otro módulo:
 * - comentarEnPost / darLike / seguirCuenta: engagement automatizado sobre
 *   posts/cuentas de terceros (AUTO-001/002, INT-001/003).
 * - enviarDM / responderDMsPendientes: duplicaba capabilities/community/
 *   dmInbox.ts, que ya respeta la ventana de 24h (INT-005) y el disclosure
 *   de IA (INT-006) vía la Graph API real — esto los saltaba por completo.
 * - realizarBeaconEngagement / interactuarConTendencia: bots de "engagement
 *   pod" (like+comentario automático en cuentas faro/hashtags de terceros
 *   para inflar alcance) — el ejemplo de libro de INT-003/AUTO-001.
 * - publicarPost / publicarHistoria / publicarReel: controlaban el navegador
 *   para publicar en vez de usar la API — ver header de arriba.
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

export interface ProfileEditOptions {
  bio?: string; // nueva bio
  website?: string; // link en bio
  displayName?: string; // nombre visible
  newProfilePhotoPath?: string; // nueva foto de perfil
}

export interface NotificationActionOptions {
  respondToComments?: boolean;
  respondToDMs?: boolean;
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
- ALCANCE: esta sesión solo opera sobre la CUENTA PROPIA (perfil, highlights,
  comentarios del propio post, notificaciones, estadísticas). Nunca interactúes
  con el contenido o perfil de otra cuenta.

INSTRUCCIONES DE NAVEGACIÓN INSTAGRAM DESKTOP:
- Inicio (Feed): ícono de casa en la barra lateral izquierda
- Buscar: clic en la lupa → aparece panel de búsqueda
- Notificaciones: ícono de corazón
- Mi Perfil: clic en tu foto de perfil en la barra lateral
`.trim();

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
        goal: `Editar el perfil PROPIO de Instagram con los siguientes cambios:

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

// ── ACCIÓN: Leer y Responder Notificaciones (solo comentarios/DMs propios) ──

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
   - Nuevos seguidores → solo anotar usernames (NO seguir de vuelta: eso lo maneja
     un flujo aparte, nunca esta sesión)
   - Comentarios en mis posts → anotar contenido
   - Menciones → anotar
   - Likes → solo anotar los más relevantes

3. ${
      opts.respondToComments
        ? `Responder hasta ${Math.floor(maxActions / 2)} comentarios prioritarios EN MIS PROPIOS POSTS:
   - Preguntas: responder con información útil
   - Positivos: agradecer con autenticidad
   - Críticas constructivas: reconocer y explicar`
        : 'Solo registrar los comentarios, no responder en esta sesión'
    }

LÍMITE TOTAL DE ACCIONES: ${maxActions}
ALCANCE: solo comentarios en posts PROPIOS. Nunca interactuar con cuentas ajenas.

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

// ── ACCIÓN: Moderar Comentarios de un Post Propio ────────────────────────────

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
    goal: `Moderar los comentarios de un post PROPIO de Instagram: ${postUrl}

CRITERIOS DE MODERACIÓN:
${criteriosModeración}

PASOS:
1. Navegar al post: ${postUrl}
2. Ver todos los comentarios (clic en "Ver todos los comentarios")
3. Para cada comentario spam/ofensivo/tóxico:
   - Mantener pulsado el comentario (o clic en tres puntos junto al comentario)
   - Seleccionar "Eliminar" o "Denunciar"
4. Para comentarios de preguntas legítimas, anotar para responder

RESULTADO: Lista de comentarios eliminados + lista de comentarios a responder.`,
    context: INSTAGRAM_BASE_CONTEXT,
    maxIterations: 15,
  });

  return toActionResult('moderarComentariosDePost', result, start);
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
