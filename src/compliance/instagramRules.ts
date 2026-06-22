/**
 * Instagram Platform Compliance Rules
 *
 * Basado en:
 * - Instagram Terms of Use (https://help.instagram.com/581066165581870)
 * - Meta Platform Terms and Developer Policies
 * - Instagram Community Standards
 *
 * ESTE ARCHIVO ES LA FUENTE DE VERDAD SOBRE QUÉ ESTÁ PERMITIDO.
 * Ninguna acción del sistema debe contradecir estas reglas.
 */

export type RuleSeverity = 'critica' | 'alta' | 'media' | 'baja';
export type RuleCategory = 'automatizacion' | 'contenido' | 'interaccion' | 'datos' | 'cuenta' | 'tecnica';

export interface InstagramRule {
  /** Código único de la regla */
  code: string;
  /** Categoría */
  category: RuleCategory;
  /** Descripción de la restricción */
  description: string;
  /** Fuente en los términos de Instagram */
  source: string;
  /** Severidad de la violación */
  severity: RuleSeverity;
  /** Ejemplos de comportamientos prohibidos */
  examples: string[];
  /** Ejemplos de comportamientos permitidos */
  allowedExamples: string[];
}

export const INSTAGRAM_RULES: InstagramRule[] = [
  // === AUTOMATIZACIÓN ===
  {
    code: 'AUTO-001',
    category: 'automatizacion',
    description:
      'No crear cuentas, acceder a información ni recolectar datos de Instagram de forma automatizada sin permiso expreso por escrito de Meta.',
    source:
      'Instagram Terms §4.2: "You can\'t attempt to create accounts or access or collect information in unauthorized ways."',
    severity: 'critica',
    examples: [
      'Web scraping de perfiles sin usar la API oficial',
      'Bots que crean cuentas automáticamente',
      'Extracción masiva de seguidores/email/telefonos',
      'Uso de scripts para "likear" o comentar masivamente',
    ],
    allowedExamples: [
      'Usar Meta Graph API oficial con permisos válidos',
      'Responder DMs mediante webhook autorizado de Meta',
      'Publicar contenido via Content Publishing API',
    ],
  },
  {
    code: 'AUTO-002',
    category: 'automatizacion',
    description:
      'No realizar acciones que simulen comportamiento humano de forma engañosa o que eludan medidas de seguridad.',
    source:
      'Instagram Terms §4.2: "You can\'t do... anything to circumvent, by-pass, or override any technological measures."',
    severity: 'critica',
    examples: [
      'Evadir límites de rate de la API',
      'Usar múltiples IPs/proxies para ocultar automatización',
      'Simular actividad humana con delays aleatorios para engañar a Instagram',
      'Bypass de CAPTCHA o verificaciones',
    ],
    allowedExamples: [
      'Respetar los rate limits oficiales de la API',
      'Usar webhooks oficiales para recibir eventos',
      'Implementar delays razonables entre acciones para no saturar servidores',
    ],
  },

  // === CONTENIDO ===
  {
    code: 'CONT-001',
    category: 'contenido',
    description:
      'No publicar contenido que viole los estándares de la comunidad de Instagram (violencia, desnudez, discurso de odio, desinformación).',
    source: 'Instagram Community Standards',
    severity: 'critica',
    examples: [
      'Contenido que incita al odio',
      'Desinformación dañina sobre salud',
      'Contenido sexual explícito',
      'Violencia gráfica',
    ],
    allowedExamples: [
      'Contenido educativo dentro de las políticas de la plataforma',
      'Opiniones respetuosas y constructivas',
      'Contenido de marca apropiado para todas las audiencias',
    ],
  },
  {
    code: 'CONT-002',
    category: 'contenido',
    description: 'No publicar información privada o confidencial de terceros sin permiso.',
    source: 'Instagram Terms §4.2',
    severity: 'alta',
    examples: [
      'Compartir DNI, direcciones o teléfonos de personas',
      'Publicar capturas de conversaciones privadas sin consentimiento',
      'Doxxeo de usuarios',
    ],
    allowedExamples: [
      'Publicar testimonios con consentimiento explícito por escrito',
      'Compartir información de contacto de negocio propio',
    ],
  },
  {
    code: 'CONT-003',
    category: 'contenido',
    description: 'No prometer resultados garantizados ni usar lenguaje engañoso (clickbait).',
    source: 'Instagram Terms + Community Standards sobre spam y comportamiento engañoso',
    severity: 'alta',
    examples: [
      '"Gana $10,000 en 7 días garantizado"',
      '"Este secreto te hará millonario"',
      'Promesas médicas sin fundamento',
    ],
    allowedExamples: [
      '"Resultados típicos varían según dedicación"',
      '"Basado en nuestro estudio interno de 100 clientes"',
      'Expectativas realistas con disclaimers',
    ],
  },
  {
    code: 'CONT-004',
    category: 'contenido',
    description:
      'Respetar derechos de propiedad intelectual. No usar música, imágenes o videos sin los derechos correspondientes.',
    source: 'Instagram Terms §4.2',
    severity: 'alta',
    examples: [
      'Usar canciones comerciales en Reels sin licencia',
      'Repostear contenido de otros sin permiso',
      'Usar imágenes de stock sin licencia válida',
    ],
    allowedExamples: [
      'Usar biblioteca de música de Instagram/Reels',
      'Contenido original creado por la marca',
      'UGC con permiso explícito del creador',
    ],
  },

  // === INTERACCIÓN ===
  {
    code: 'INT-001',
    category: 'interaccion',
    description: 'No enviar spam ni mensajes no solicitados masivos. Cada mensaje debe ser personalizado y relevante.',
    source: 'Instagram Terms §4.2 + Community Standards',
    severity: 'alta',
    examples: [
      'Enviar el mismo DM a 100 personas',
      'Comentarios genéricos como "¡Súper! 🔥" en miles de posts',
      'Seguir y dejar de seguir masivamente para ganar seguidores',
    ],
    allowedExamples: [
      'Responder DMs de personas que contactaron primero',
      'Comentarios personalizados y aportando valor en posts relevantes',
      'Mensajes de nurture a usuarios que optaron-in explícitamente',
    ],
  },
  {
    code: 'INT-002',
    category: 'interaccion',
    description: 'No usar Instagram para acosar, intimidar o enviar mensajes amenazantes.',
    source: 'Instagram Terms §4.2',
    severity: 'critica',
    examples: [
      'Enviar mensajes amenazantes',
      'Acoso repetido a un usuario',
      'Comentarios ofensivos dirigidos a personas',
    ],
    allowedExamples: ['Debates constructivos y respetuosos', 'Feedback profesional sobre productos/servicios'],
  },
  {
    code: 'INT-003',
    category: 'interaccion',
    description: 'No comprar, vender ni transferir cuentas, seguidores, likes o engagement.',
    source: 'Instagram Terms §4.2: "You can\'t sell, license, or purchase any account or data obtained from us."',
    severity: 'critica',
    examples: ['Comprar seguidores falsos', 'Vender cuentas de Instagram', 'Usar farms de likes'],
    allowedExamples: [
      'Crecimiento orgánico mediante contenido de valor',
      'Colaboraciones legítimas con creadores',
      'Publicidad pagada a través de Meta Ads Manager',
    ],
  },
  {
    code: 'INT-004',
    category: 'interaccion',
    description: 'No suplantar la identidad de otras personas o entidades.',
    source: 'Instagram Terms §4.2: "You can\'t impersonate others or provide inaccurate information."',
    severity: 'critica',
    examples: [
      'Crear cuenta falsa de una persona real',
      'Hacerse pasar por marca reconocida sin autorización',
      'Usar fotos de otra persona como propias',
    ],
    allowedExamples: ['Cuentas de parodia claramente identificadas', 'Cuentas oficiales verificadas de la marca'],
  },

  // === DATOS ===
  {
    code: 'DATA-001',
    category: 'datos',
    description:
      'No solicitar ni almacenar credenciales de usuario de Instagram (contraseñas, tokens de acceso de terceros).',
    source: 'Instagram Terms §4.2',
    severity: 'critica',
    examples: [
      'Pedir la contraseña de Instagram a un cliente',
      'Almacenar tokens de sesión de usuarios finales',
      'Solicitar 2FA codes',
    ],
    allowedExamples: [
      'Usar OAuth oficial de Meta con scopes aprobados',
      'Solicitar Business ID y Access Token generado por el cliente',
      'Usar webhooks verificados con app secret',
    ],
  },
  {
    code: 'DATA-002',
    category: 'datos',
    description: 'No vender ni compartir datos obtenidos de Instagram con terceros no autorizados.',
    source: 'Instagram Terms §4.2',
    severity: 'critica',
    examples: [
      'Vender lista de seguidores a terceros',
      'Compartir métricas de Instagram con competidores',
      'Transferir datos a plataformas no aprobadas por Meta',
    ],
    allowedExamples: [
      'Exportar métricas para reportes internos del cliente',
      'Sincronizar leads a CRM del cliente con su consentimiento',
    ],
  },

  // === CUENTA ===
  {
    code: 'ACCT-001',
    category: 'cuenta',
    description: 'Cada usuario debe tener al menos 13 años (o la edad mínima legal en su país).',
    source: 'Instagram Terms §4.1',
    severity: 'alta',
    examples: ['Crear cuenta para menores de 13 años', 'Dirigir contenido sexual o inapropiado a menores'],
    allowedExamples: [
      'Verificar edad antes de crear cuentas administradas',
      'Contenido family-friendly cuando la audiencia incluye menores',
    ],
  },
  {
    code: 'ACCT-002',
    category: 'cuenta',
    description: 'No usar dominios o URLs en el nombre de usuario sin consentimiento previo por escrito de Meta.',
    source: 'Instagram Terms §4.2',
    severity: 'media',
    examples: ['Usuario @miempresa.com', 'Usuario con URL comercial sin autorización'],
    allowedExamples: ['Nombres de usuario basados en la marca registrada'],
  },

  // === TÉCNICA ===
  {
    code: 'TECH-001',
    category: 'tecnica',
    description: 'Respetar los rate limits de la Meta Graph API. No hacer más requests de los permitidos.',
    source: 'Meta Platform Terms + Developer Policies',
    severity: 'alta',
    examples: [
      'Hacer 1000 requests por minuto',
      'No implementar backoff exponencial ante errores 429',
      'Polling agresivo a endpoints',
    ],
    allowedExamples: [
      'Máximo 200 llamadas por hora por usuario (conservador)',
      'Implementar backoff exponencial',
      'Usar webhooks en lugar de polling cuando sea posible',
    ],
  },
  {
    code: 'TECH-002',
    category: 'tecnica',
    description:
      'No modificar, traducir, crear obras derivadas ni hacer ingeniería inversa de los productos de Instagram/Meta.',
    source: 'Instagram Terms §4.2 + §5',
    severity: 'critica',
    examples: [
      'Decompilar la app de Instagram',
      'Crear clones no autorizados de Instagram',
      'Modificar la API de Meta',
    ],
    allowedExamples: ['Usar la API pública documentada', 'Crear dashboards con datos exportados oficialmente'],
  },
];

/** Reglas que bloquean inmediatamente la acción si se violan */
export const CRITICAL_RULE_CODES = INSTAGRAM_RULES.filter((r) => r.severity === 'critica').map((r) => r.code);

/** Obtener reglas por categoría */
export const getRulesByCategory = (category: RuleCategory): InstagramRule[] =>
  INSTAGRAM_RULES.filter((r) => r.category === category);
