/**
 * TikTok Platform Compliance Rules
 *
 * Basado en las Normas de la Comunidad de TikTok y los Términos de Servicio:
 * - Prohibido: "engagement falso" (interacción inauténtica) — inflar métricas,
 *   automatizar acciones que imitan a un humano, granjas de clics/dispositivos.
 * - Permitido: automatización vía API oficial de Cuenta de Empresa (TikTok
 *   Business) para mensajería/catálogo/citas, y herramientas de moderación o
 *   lectura de chat en TikTok LIVE que asisten al creador sin actuar en su
 *   nombre de forma engañosa.
 *
 * ESTE ARCHIVO ES LA FUENTE DE VERDAD SOBRE QUÉ ESTÁ PERMITIDO EN TIKTOK.
 * Ninguna acción del sistema debe contradecir estas reglas. Mismo formato que
 * src/compliance/instagramRules.ts — mismo gatekeeper, plataforma distinta.
 */

export type TikTokRuleSeverity = 'critica' | 'alta' | 'media' | 'baja';
export type TikTokRuleCategory =
  | 'engagement-falso'
  | 'automatizacion'
  | 'live'
  | 'mensajeria'
  | 'publicacion'
  | 'shop'
  | 'creacion';

export interface TikTokRule {
  code: string;
  category: TikTokRuleCategory;
  description: string;
  severity: TikTokRuleSeverity;
  examples: string[];
  allowedExamples: string[];
}

export const TIKTOK_RULES: TikTokRule[] = [
  {
    code: 'TT-AUTO-001',
    category: 'engagement-falso',
    description: 'No comprar ni generar artificialmente vistas, likes, compartidos o seguidores.',
    severity: 'critica',
    examples: [
      'Comprar paquetes de "1000 seguidores por $X"',
      'Bots que generan vistas o likes falsos en un video',
      'Servicios de "engagement pod" que intercambian likes automáticamente',
    ],
    allowedExamples: [
      'Promoción paga a través de TikTok Ads (oficial)',
      'Pedir a la audiencia real que interactúe orgánicamente',
    ],
  },
  {
    code: 'TT-AUTO-002',
    category: 'automatizacion',
    description:
      'No usar software que imite a un humano para seguir masivamente cuentas, dar likes automáticos o dejar comentarios repetitivos para llamar la atención (mass follow, scraping, auto-like).',
    severity: 'critica',
    examples: [
      'Auto-follow/auto-unfollow masivo para ganar seguidores',
      'Scrapers que extraen seguidores o datos de perfiles sin la API oficial',
      'Comentarios repetitivos o genéricos en videos ajenos para ganar visibilidad',
    ],
    allowedExamples: [
      'Responder comentarios/DMs propios vía TikTok Business API oficial',
      'Analizar tendencias públicas (hashtags/sonidos) sin tocar cuentas ajenas',
    ],
  },
  {
    code: 'TT-AUTO-003',
    category: 'engagement-falso',
    description:
      'No operar ni depender de granjas de clics o de dispositivos (redes de teléfonos modificados controlados en masa) para alterar el algoritmo de un video. TikTok detecta tráfico repetitivo por patrón HTTP e IPs inusuales.',
    severity: 'critica',
    examples: [
      'Redes de dispositivos que reproducen/likean el mismo video en bucle',
      'Tráfico automatizado con IPs rotadas para simular vistas orgánicas',
    ],
    allowedExamples: ['Ninguna automatización de tráfico es aceptable bajo ningún esquema'],
  },
  {
    code: 'TT-BIZ-001',
    category: 'mensajeria',
    description:
      'Mensajería automatizada permitida SOLO con Cuenta de Empresa (TikTok Business) a través de plataformas de automatización autorizadas (ej. SendPulse, Respond.io) para responder DMs, enviar catálogo/precios/links a TikTok Shop, o agendar citas.',
    severity: 'alta',
    examples: [
      'Enviar DMs masivos no solicitados a cuentas que nunca contactaron primero',
      'Usar la mensajería automatizada para hacer spam de "seguime y te sigo"',
    ],
    allowedExamples: [
      'Responder automáticamente a alguien que ya escribió primero',
      'Enviar catálogo/precio cuando el usuario lo pide',
      'Ofrecer agendar una cita/llamada vía integración de calendario',
    ],
  },
  {
    code: 'TT-LIVE-001',
    category: 'live',
    description:
      'Moderación y lectura de chat en TikTok LIVE permitidas cuando asisten al creador (filtrar palabras clave, sugerir qué leer en voz alta) sin ejecutar acciones de moderación reales en nombre del creador de forma no autorizada (banear/eliminar requiere la sesión/API propia del creador).',
    severity: 'media',
    examples: [
      'Autoban/autoeliminación de usuarios simulando ser el creador sin su sesión autorizada',
      'Generar comentarios falsos en el propio LIVE para simular actividad',
    ],
    allowedExamples: [
      'Marcar comentarios como spam/ofensivos para que el creador los oculte',
      'Elegir qué comentarios leer en voz alta (texto a voz) para el creador',
    ],
  },
  {
    code: 'TT-AUTO-004',
    category: 'mensajeria',
    description:
      'TikTok NO tiene API abierta para leer comentarios públicos en tiempo real y disparar un DM automático a partir de ellos ("comentá LINK y te lo mando por privado"). Cualquier herramienta que prometa esto usa automatización de navegador o scraping en segundo plano — detectable por huella de dispositivo/IP y bannea la cuenta. El único flujo seguro es guiar al usuario a escribir por DM primero (vía link en bio o palabra clave), nunca automatizar la lectura del comentario en sí.',
    severity: 'critica',
    examples: [
      'Bot que lee comentarios públicos en tiempo real y envía un DM automático a quien comentó',
      'Automatización de navegador/headless que simula abrir cada comentario para responder por privado',
    ],
    allowedExamples: [
      'Pedir en el video/bio que escriban una palabra clave por DM directamente',
      'Responder automáticamente SOLO una vez que el DM ya llegó (ver TT-BIZ-001)',
    ],
  },
  {
    code: 'TT-SCHED-001',
    category: 'publicacion',
    description:
      'Programar y publicar contenido de forma automática está permitido SOLO vía la Content Posting API oficial de TikTok, a través de un partner autorizado (ej. Later, Buffer, Hootsuite, Metricool). El propio sistema oficial limita a los partners externos a un máximo de 15 publicaciones por cuenta cada 24 horas.',
    severity: 'alta',
    examples: [
      'Publicar más de 15 videos en 24h por cuenta a través de la API de un partner',
      'Publicar sin pasar por un partner/API oficial (upload manual automatizado por scraping del panel web)',
    ],
    allowedExamples: [
      'Subir y programar videos vía Content Posting API (o un agregador certificado que la use)',
      'Redactar caption/hashtags de antemano y dejarlos programados para su hora',
    ],
  },
  {
    code: 'TT-SHOP-001',
    category: 'shop',
    description:
      'Bots de respuestas frecuentes (FAQ) en el chat de TikTok Shop están permitidos (saludo automático, menú interactivo). En mercados regulados (ej. UE) sus respuestas NO cuentan para la tasa de respuesta obligatoria de 24h y deben etiquetarse visiblemente como generadas por IA.',
    severity: 'media',
    examples: [
      'FAQ bot sin etiqueta de IA visible en mercados que la exigen',
      'Contar respuestas del bot como si fueran respuesta humana para la métrica de 24h',
    ],
    allowedExamples: [
      'Saludo/menú automático claramente etiquetado como bot/IA',
      'Responder precio/stock/horarios desde un catálogo fijo',
    ],
  },
  {
    code: 'TT-SHOP-002',
    category: 'shop',
    description:
      'Sincronización automática de inventario, pedidos y pagos (ej. conector con Shopify/ERP) está permitida: actualizar stock, procesar pagos, enviar número de seguimiento — es infraestructura de e-commerce, no interacción social simulada.',
    severity: 'baja',
    examples: ['Ninguno — esta categoría es infraestructura, no interacción, y no tiene forma prohibida per se'],
    allowedExamples: ['Actualizar stock en tiempo real', 'Enviar tracking automáticamente al confirmarse el envío'],
  },
  {
    code: 'TT-CREATE-001',
    category: 'creacion',
    description:
      'Herramientas de creación/edición automatizada de contenido (subtitulado automático, adaptar horizontal→9:16, TikTok Symphony para doblaje/avatares) están permitidas sin restricción: no simulan usuarios ni interactúan con cuentas ajenas, solo producen el archivo que después el creador (o un partner de TT-SCHED-001) publica.',
    severity: 'baja',
    examples: ['Ninguno — la edición/creación de contenido nunca es, por sí sola, "engagement falso"'],
    allowedExamples: ['Subtitulado automático', 'Reencuadre 16:9 → 9:16', 'Doblaje/traducción automática vía Symphony'],
  },
];
