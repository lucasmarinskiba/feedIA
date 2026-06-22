import type { BrandRule, BrandRuleContext, BrandRuleViolation } from './types.js';

function v(
  ruleId: string,
  category: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  description: string,
  checker: (ctx: BrandRuleContext) => BrandRuleViolation | null,
): BrandRule {
  return { id: ruleId, category, severity, description, condition: description, checker };
}

// ========================================================================
// REGLAS VISUALES (V-001 a V-020)
// ========================================================================

const VISUAL_RULES: BrandRule[] = [
  v('V-001', 'visual', 'high', 'Logo debe aparecer en todos los reels', (ctx) => {
    if (ctx.content?.format === 'reel' && !ctx.content.description?.toLowerCase().includes('logo')) {
      return {
        ruleId: 'V-001',
        category: 'visual',
        severity: 'high',
        message: 'El logo no está presente en el reel',
        suggestion: 'Agregar el logo en esquina inferior derecha con 10% opacidad',
        field: 'logo',
      };
    }
    return null;
  }),
  v('V-002', 'visual', 'high', 'Paleta primaria solo para CTAs y elementos de acción', (ctx) => {
    const primary = ctx.brand.visual.palette[2]; // asumiendo que el tercero es el acento
    if (!primary) return null;
    const colors = ctx.content?.colorsUsed ?? [];
    const usedPrimary = colors.find((c) => c.toLowerCase() === primary.toLowerCase());
    if (usedPrimary && ctx.content?.format === 'carrusel') {
      const text = ctx.content.description?.toLowerCase() ?? '';
      if (!text.includes('cta') && !text.includes('acción') && !text.includes('botón')) {
        return {
          ruleId: 'V-002',
          category: 'visual',
          severity: 'medium',
          message: `El color primario ${primary} se usa pero no en un elemento de acción`,
          suggestion: 'Usar el color primario solo para CTAs, botones o elementos de acción',
          field: 'palette',
        };
      }
    }
    return null;
  }),
  v('V-003', 'visual', 'medium', 'No más de 3 fuentes distintas en una misma pieza', (ctx) => {
    const fonts = ctx.content?.fontsUsed ?? [];
    const unique = new Set(fonts.map((f) => f.toLowerCase()));
    if (unique.size > 3) {
      return {
        ruleId: 'V-003',
        category: 'visual',
        severity: 'medium',
        message: `Se usan ${unique.size} fuentes distintas (máximo 3)`,
        suggestion: 'Reducir a máximo 3 fuentes: una para headings, una para body, una para acentos',
        field: 'typography',
      };
    }
    return null;
  }),
  v('V-004', 'visual', 'critical', 'No usar colores fuera de la paleta de marca', (ctx) => {
    const palette = ctx.brand.visual.palette.map((c) => c.toLowerCase());
    const colors = ctx.content?.colorsUsed ?? [];
    for (const color of colors) {
      if (!palette.includes(color.toLowerCase())) {
        return {
          ruleId: 'V-004',
          category: 'visual',
          severity: 'critical',
          message: `El color ${color} no pertenece a la paleta de marca`,
          suggestion: `Usar un color de la marca: ${palette.join(', ')}`,
          field: 'palette',
        };
      }
    }
    return null;
  }),
  v('V-005', 'visual', 'medium', 'Highlight covers deben usar iconografía permitida', (ctx) => {
    if (ctx.asset?.type === 'highlight-cover') {
      const name = ctx.asset.name?.toLowerCase() ?? '';
      const allowed = ctx.brand.visual.allowedIconography.map((i) => i.toLowerCase());
      if (allowed.length > 0 && !allowed.some((a) => name.includes(a))) {
        return {
          ruleId: 'V-005',
          category: 'visual',
          severity: 'medium',
          message: 'El highlight cover no usa iconografía permitida',
          suggestion: `Usar iconografía de la lista permitida: ${allowed.join(', ')}`,
          field: 'iconography',
        };
      }
    }
    return null;
  }),
  v('V-006', 'visual', 'high', 'Watermark debe aparecer en posts de producto', (ctx) => {
    const desc = ctx.content?.description?.toLowerCase() ?? '';
    const isProduct =
      desc.includes('producto') || desc.includes('servicio') || desc.includes('oferta') || desc.includes('precio');
    if (isProduct && !desc.includes('watermark')) {
      return {
        ruleId: 'V-006',
        category: 'visual',
        severity: 'high',
        message: 'Falta watermark en post de producto/servicio',
        suggestion: 'Agregar watermark en esquina inferior derecha con 10-15% opacidad',
        field: 'watermark',
      };
    }
    return null;
  }),
  v('V-007', 'visual', 'medium', 'Contraste mínimo entre texto y fondo', (ctx) => {
    const colors = ctx.content?.colorsUsed ?? [];
    if (colors.length >= 2) {
      // Simplificación: si hay un color oscuro y claro juntos, asumimos contraste OK
      // En una implementación real haríamos cálculo WCAG real
    }
    return null;
  }),
  v('V-008', 'visual', 'high', 'No usar colores de marca de competidores', (ctx) => {
    // Simplificación: competidores conocidos por color
    const forbiddenColors = ['#1877F2']; // Meta blue
    const colors = ctx.content?.colorsUsed ?? [];
    for (const color of colors) {
      if (forbiddenColors.includes(color.toUpperCase())) {
        return {
          ruleId: 'V-008',
          category: 'visual',
          severity: 'high',
          message: `El color ${color} está asociado a competidores`,
          suggestion: 'Evitar colores asociados a competidores directos',
          field: 'palette',
        };
      }
    }
    return null;
  }),
  v('V-009', 'visual', 'medium', 'No más del 20% de área con color primario', (ctx) => {
    const primary = ctx.brand.visual.palette[2];
    const colors = ctx.content?.colorsUsed ?? [];
    const primaryCount = colors.filter((c) => c.toLowerCase() === primary?.toLowerCase()).length;
    if (colors.length > 0 && primaryCount / colors.length > 0.5) {
      return {
        ruleId: 'V-009',
        category: 'visual',
        severity: 'medium',
        message: 'El color primario ocupa más del 50% de los elementos visuales',
        suggestion: 'Reducir uso de color primario a máximo 20% del área. Usar neutros como base.',
        field: 'palette',
      };
    }
    return null;
  }),
  v('V-010', 'visual', 'low', 'Fotografía debe respetar el estilo de marca', (ctx) => {
    const style = ctx.brand.visual.style?.toLowerCase() ?? '';
    const desc = ctx.content?.description?.toLowerCase() ?? '';
    if (
      style.includes('minimal') &&
      (desc.includes('recargado') || desc.includes('caótico') || desc.includes('clutter'))
    ) {
      return {
        ruleId: 'V-010',
        category: 'visual',
        severity: 'low',
        message: 'La composición parece contradecir el estilo minimalista de marca',
        suggestion: `Simplificar la composición. Estilo de marca: ${style}`,
        field: 'composition',
      };
    }
    return null;
  }),
];

// ========================================================================
// REGLAS DE VOZ (VO-001 a VO-020)
// ========================================================================

const VOICE_RULES: BrandRule[] = [
  v('VO-001', 'voice', 'critical', 'Nunca usar palabras prohibidas de la marca', (ctx) => {
    const forbidden = ctx.brand.voice.forbidden.map((f) => f.toLowerCase());
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    for (const word of forbidden) {
      if (text.includes(word)) {
        return {
          ruleId: 'VO-001',
          category: 'voice',
          severity: 'critical',
          message: `Palabra prohibida detectada: "${word}"`,
          suggestion: `Reemplazar por sinónimo apropiado. Palabras prohibidas: ${forbidden.join(', ')}`,
          field: 'voice',
        };
      }
    }
    return null;
  }),
  v('VO-002', 'voice', 'high', 'Promesas deben ser cuantificables y verificables', (ctx) => {
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`;
    const promiseWords = ['garantizado', '100%', 'siempre', 'nunca falla', 'resultados inmediatos', 'dinero fácil'];
    for (const word of promiseWords) {
      if (text.toLowerCase().includes(word.toLowerCase())) {
        return {
          ruleId: 'VO-002',
          category: 'voice',
          severity: 'high',
          message: `Promesa no verificable detectada: "${word}"`,
          suggestion:
            'Reemplazar por promesas cuantificables y medibles. Ej: "Te devolvemos 10 horas" en vez de "resultados inmediatos"',
          field: 'voice',
        };
      }
    }
    return null;
  }),
  v('VO-003', 'voice', 'medium', 'No usar superlativos sin evidencia', (ctx) => {
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    const superlatives = ['el mejor', 'la mejor', 'número 1', 'top 1', 'líder indiscutible', 'sin comparación'];
    for (const sup of superlatives) {
      if (text.includes(sup)) {
        return {
          ruleId: 'VO-003',
          category: 'voice',
          severity: 'medium',
          message: `Superlativo sin evidencia: "${sup}"`,
          suggestion:
            'Reemplazar por datos concretos o testimonios. Ej: "Nuestros clientes ahorran 10h/semana" en vez de "el mejor"',
          field: 'voice',
        };
      }
    }
    return null;
  }),
  v('VO-004', 'voice', 'medium', 'Respuestas a comentarios deben ser personalizadas', (ctx) => {
    if (ctx.interaction?.channel === 'comment' || ctx.interaction?.channel === 'dm') {
      if (ctx.interaction.personalized === false) {
        return {
          ruleId: 'VO-004',
          category: 'voice',
          severity: 'medium',
          message: 'La respuesta parece ser un template genérico',
          suggestion: 'Personalizar la respuesta usando el nombre del usuario y referenciando su comentario específico',
          field: 'interaction',
        };
      }
    }
    return null;
  }),
  v('VO-005', 'voice', 'high', 'Tono en crisis debe ser calmado, factual, empático', (ctx) => {
    if (ctx.interaction?.channel === 'crisis' || ctx.interaction?.channel === 'complaint') {
      const tone = ctx.interaction.tone?.toLowerCase() ?? '';
      if (tone.includes('agresivo') || tone.includes('defensivo') || tone.includes('sarcástico')) {
        return {
          ruleId: 'VO-005',
          category: 'voice',
          severity: 'high',
          message: `Tono inapropiado en situación de crisis: ${tone}`,
          suggestion: 'Usar tono calmado, factual y empático. Validar primero, explicar después.',
          field: 'tone',
        };
      }
    }
    return null;
  }),
  v('VO-006', 'voice', 'low', 'Cada caption debe tener un CTA claro', (ctx) => {
    const caption = ctx.content?.caption ?? '';
    const ctas = ['comentá', 'guardá', 'compartí', 'mandame dm', 'link en bio', 'agendá', 'descargá', 'etiquetá'];
    const hasCta = ctas.some((cta) => caption.toLowerCase().includes(cta));
    if (!hasCta && caption.length > 50) {
      return {
        ruleId: 'VO-006',
        category: 'voice',
        severity: 'low',
        message: 'El caption no tiene un CTA claro',
        suggestion: 'Agregar un CTA específico: "Guardá esto", "Mandame DM con INFO", "Comentá si te pasó"',
        field: 'cta',
      };
    }
    return null;
  }),
  v('VO-007', 'voice', 'medium', 'No usar jerga técnica en stories', (ctx) => {
    if (ctx.content?.format === 'historia') {
      const text = `${ctx.content.caption ?? ''} ${ctx.content.description ?? ''}`;
      const jargon = ['API', 'webhook', 'trigger', 'pipeline', 'JSON', 'endpoint', 'middleware', 'callback'];
      for (const word of jargon) {
        if (text.includes(word)) {
          return {
            ruleId: 'VO-007',
            category: 'voice',
            severity: 'medium',
            message: `Jerga técnica detectada en story: "${word}"`,
            suggestion: 'Traducir a lenguaje simple. Ej: "conexión automática" en vez de "webhook"',
            field: 'voice',
          };
        }
      }
    }
    return null;
  }),
  v('VO-008', 'voice', 'medium', 'Cada pieza debe reflejar al menos 1 valor de marca', (ctx) => {
    const values = ctx.brand.strategy.values.map((v) => v.toLowerCase());
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    const reflected = values.some((v) => {
      const first = v.split(':')[0];
      return first ? text.includes(first.trim()) : false;
    });
    if (!reflected && values.length > 0) {
      return {
        ruleId: 'VO-008',
        category: 'voice',
        severity: 'medium',
        message: 'El contenido no refleja ningún valor de marca',
        suggestion: `Conectar el contenido con un valor: ${values.slice(0, 3).join(', ')}...`,
        field: 'values',
      };
    }
    return null;
  }),
  v('VO-009', 'voice', 'high', 'No publicar contenido que contradiga la misión', (ctx) => {
    const mission = ctx.brand.strategy.mission?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    if (mission.includes('automatizar') && text.includes('hacerlo manual')) {
      return {
        ruleId: 'VO-009',
        category: 'voice',
        severity: 'high',
        message: 'El contenido contradice la misión de la marca',
        suggestion: `Revisar para alinear con la misión: ${ctx.brand.strategy.mission}`,
        field: 'mission',
      };
    }
    return null;
  }),
  v('VO-010', 'voice', 'low', 'Evitar frases genéricas que podrían ser de cualquier marca', (ctx) => {
    const generic = [
      'calidad garantizada',
      'servicio excepcional',
      'nuestro compromiso',
      'la mejor experiencia',
      'confía en nosotros',
    ];
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    for (const phrase of generic) {
      if (text.includes(phrase)) {
        return {
          ruleId: 'VO-010',
          category: 'voice',
          severity: 'low',
          message: `Frase genérica detectada: "${phrase}"`,
          suggestion:
            'Reemplazar por algo específico de la marca. Ej: "10 horas devueltas o tu dinero" en vez de "calidad garantizada"',
          field: 'voice',
        };
      }
    }
    return null;
  }),
];

// ========================================================================
// REGLAS DE ESTRATEGIA (S-001 a S-015)
// ========================================================================

const STRATEGY_RULES: BrandRule[] = [
  v('S-001', 'strategy', 'high', 'Cada pieza debe reforzar el posicionamiento diferencial', (ctx) => {
    const positioning = ctx.brand.strategy.positioning?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    const diffWords = positioning.split(' ').filter((w) => w.length > 5);
    const hasDiff = diffWords.some((w) => text.includes(w));
    if (!hasDiff && positioning.length > 0) {
      return {
        ruleId: 'S-001',
        category: 'strategy',
        severity: 'high',
        message: 'El contenido no refuerza el posicionamiento diferencial',
        suggestion: `Conectar con el posicionamiento: ${ctx.brand.strategy.positioning}`,
        field: 'positioning',
      };
    }
    return null;
  }),
  v(
    'S-002',
    'strategy',
    'medium',
    'Al menos 60% del contenido debe reflejar valores de marca',
    (_ctx) =>
      // Esta regla se evalúa a nivel de lote, no individual
      null,
  ),
  v('S-003', 'strategy', 'medium', 'La promesa debe mencionarse implícita o explícitamente cada 5 posts', (ctx) => {
    const promise = ctx.brand.strategy.promise?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    const promiseWords = promise.split(' ').filter((w) => w.length > 4);
    const hasPromise = promiseWords.some((w) => text.includes(w));
    if (!hasPromise && promise.length > 0) {
      return {
        ruleId: 'S-003',
        category: 'strategy',
        severity: 'low',
        message: 'El contenido no refuerza la promesa de marca',
        suggestion: `Incluir la promesa: ${ctx.brand.strategy.promise}`,
        field: 'promise',
      };
    }
    return null;
  }),
  v('S-004', 'strategy', 'high', 'No publicar contenido que contradiga los valores', (ctx) => {
    const values = ctx.brand.strategy.values;
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    for (const value of values) {
      const val = value.toLowerCase();
      if (val.includes('transparencia') && (text.includes('ocultamos') || text.includes('secreto'))) {
        return {
          ruleId: 'S-004',
          category: 'strategy',
          severity: 'high',
          message: 'El contenido contradice el valor de transparencia',
          suggestion: 'Evitar lenguaje que sugiera ocultar información',
          field: 'values',
        };
      }
      if (val.includes('empoderamiento') && text.includes('dejá que nosotros')) {
        return {
          ruleId: 'S-004',
          category: 'strategy',
          severity: 'high',
          message: 'El contenido contradice el valor de empoderamiento',
          suggestion: 'Enfatizar que el cliente controla y entiende, no que depende de nosotros',
          field: 'values',
        };
      }
    }
    return null;
  }),
  v('S-005', 'strategy', 'medium', 'El arquetipo debe reflejarse en el tono y estética', (ctx) => {
    const archetype = ctx.brand.strategy.archetype?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    if (archetype.includes('rebel') && (text.includes('tradicional') || text.includes('siempre se hace así'))) {
      return {
        ruleId: 'S-005',
        category: 'strategy',
        severity: 'medium',
        message: 'El contenido no refleja el arquetipo Rebelde',
        suggestion: 'Usar lenguaje desafiante, cuestionar el status quo, proponer alternativas',
        field: 'archetype',
      };
    }
    return null;
  }),
  v('S-006', 'strategy', 'medium', 'Cada post debe responder a un dolor o deseo de la audiencia', (ctx) => {
    const pains = ctx.brand.strategy.targetPersonas.flatMap((p) => p.pains.map((pain) => pain.toLowerCase()));
    const desires = ctx.brand.strategy.targetPersonas.flatMap((p) => p.desires.map((d) => d.toLowerCase()));
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    const hasPain = pains.some((p) => {
      const first = p.split(' ')[0];
      return first ? text.includes(first) : false;
    });
    const hasDesire = desires.some((d) => {
      const first = d.split(' ')[0];
      return first ? text.includes(first) : false;
    });
    if (!hasPain && !hasDesire && ctx.content?.caption) {
      return {
        ruleId: 'S-006',
        category: 'strategy',
        severity: 'low',
        message: 'El contenido no conecta con un dolor o deseo de la audiencia',
        suggestion: 'Enlazar el contenido con un dolor o deseo específico de la persona objetivo',
        field: 'audience',
      };
    }
    return null;
  }),
  v('S-007', 'strategy', 'high', 'No mencionar competidores directos negativamente', (ctx) => {
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    const negative = ['mentirosos', 'estafadores', 'inútiles', 'peores', 'basura'];
    for (const word of negative) {
      if (text.includes(word)) {
        return {
          ruleId: 'S-007',
          category: 'strategy',
          severity: 'high',
          message: `Lenguaje negativo detectado: "${word}"`,
          suggestion:
            'Diferenciarse por valor propio, no atacando a otros. Mostrar lo que hacemos mejor, no lo que ellos hacen mal.',
          field: 'strategy',
        };
      }
    }
    return null;
  }),
  v('S-008', 'strategy', 'medium', 'El contenido debe alinearse con la visión a largo plazo', (ctx) => {
    const vision = ctx.brand.strategy.vision?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    const visionWords = vision.split(' ').filter((w) => w.length > 5);
    const hasVision = visionWords.some((w) => text.includes(w));
    if (!hasVision && vision.length > 0 && ctx.content?.format === 'carrusel') {
      return {
        ruleId: 'S-008',
        category: 'strategy',
        severity: 'low',
        message: 'El contenido no conecta con la visión de marca',
        suggestion: `Relacionar con la visión: ${ctx.brand.strategy.vision}`,
        field: 'vision',
      };
    }
    return null;
  }),
  v('S-009', 'strategy', 'low', 'La historia de marca debe resonar en contenido de storytelling', (ctx) => {
    const story = ctx.brand.strategy.story?.toLowerCase() ?? '';
    const text = `${ctx.content?.caption ?? ''}`.toLowerCase();
    if (text.includes('historia') || text.includes('cómo empezamos') || text.includes('por qué existe')) {
      const storyWords = story.split(' ').filter((w) => w.length > 5);
      const hasStory = storyWords.some((w) => text.includes(w));
      if (!hasStory) {
        return {
          ruleId: 'S-009',
          category: 'strategy',
          severity: 'low',
          message: 'El storytelling no conecta con la historia real de marca',
          suggestion: 'Incluir elementos de la historia de marca para autenticidad',
          field: 'story',
        };
      }
    }
    return null;
  }),
  v('S-010', 'strategy', 'medium', 'Los diferenciadores deben aparecer en contenido de venta', (ctx) => {
    const text = `${ctx.content?.caption ?? ''} ${ctx.content?.description ?? ''}`.toLowerCase();
    const isSales =
      text.includes('comprar') || text.includes('precio') || text.includes('oferta') || text.includes('servicio');
    if (isSales) {
      const differentiators = ctx.brand.strategy.differentiators.map((d) => d.toLowerCase());
      const hasDiff = differentiators.some((d) => {
        const first = d.split(' ')[0];
        return first ? text.includes(first) : false;
      });
      if (!hasDiff) {
        return {
          ruleId: 'S-010',
          category: 'strategy',
          severity: 'medium',
          message: 'El contenido de venta no menciona diferenciadores clave',
          suggestion: `Incluir al menos un diferenciador: ${ctx.brand.strategy.differentiators[0]}`,
          field: 'differentiators',
        };
      }
    }
    return null;
  }),
];

// ========================================================================
// REGLAS DE EXPERIENCIA (E-001 a E-010)
// ========================================================================

const EXPERIENCE_RULES: BrandRule[] = [
  v('E-001', 'experience', 'high', 'Tiempo de respuesta a DMs < 1 hora en horario comercial', (ctx) => {
    if (ctx.interaction?.channel === 'dm') {
      const responseTime = ctx.interaction.responseTime ?? 999;
      if (responseTime > 60) {
        return {
          ruleId: 'E-001',
          category: 'experience',
          severity: 'high',
          message: `Tiempo de respuesta a DM: ${responseTime} minutos (máximo 60)`,
          suggestion: 'Responder DMs en menos de 1 hora durante horario comercial',
          field: 'responseTime',
        };
      }
    }
    return null;
  }),
  v('E-002', 'experience', 'medium', 'Cada comentario debe recibir respuesta personalizada', (ctx) => {
    if (ctx.interaction?.channel === 'comment') {
      if (ctx.interaction.personalized === false) {
        return {
          ruleId: 'E-002',
          category: 'experience',
          severity: 'medium',
          message: 'Respuesta a comentario parece ser un template',
          suggestion: 'Personalizar usando el nombre del usuario y referenciando su comentario específico',
          field: 'interaction',
        };
      }
    }
    return null;
  }),
  v(
    'E-003',
    'experience',
    'low',
    'Stories deben tener interactividad al menos 3 veces por semana',
    (_ctx) =>
      // Regla a nivel de lote, no individual
      null,
  ),
  v(
    'E-004',
    'experience',
    'medium',
    'Bio debe actualizarse si cambia la promesa o CTA principal',
    (_ctx) =>
      // Regla que se evalúa periódicamente, no por pieza
      null,
  ),
  v(
    'E-005',
    'experience',
    'low',
    'Highlights deben organizarse por prioridad de conversión',
    (_ctx) =>
      // Regla de auditoría, no por pieza
      null,
  ),
  v('E-006', 'experience', 'high', 'No ignorar comentarios negativos', (ctx) => {
    if (ctx.interaction?.channel === 'comment' && ctx.interaction.tone === 'negative') {
      if (!ctx.interaction.responseTime) {
        return {
          ruleId: 'E-006',
          category: 'experience',
          severity: 'high',
          message: 'Comentario negativo sin respuesta',
          suggestion: 'Responder comentarios negativos en menos de 30 minutos con empatía y solución',
          field: 'interaction',
        };
      }
    }
    return null;
  }),
  v('E-007', 'experience', 'medium', 'CTA debe ser claro y accionable en cada post', (ctx) => {
    const caption = ctx.content?.caption ?? '';
    const actionableCt = ['comentá', 'guardá', 'compartí', 'mandame dm', 'link en bio', 'agendá', 'descargá'];
    const hasCta = actionableCt.some((cta) => caption.toLowerCase().includes(cta));
    if (!hasCta && (ctx.content?.format === 'carrusel' || ctx.content?.format === 'reel')) {
      return {
        ruleId: 'E-007',
        category: 'experience',
        severity: 'medium',
        message: 'Falta un CTA claro y accionable',
        suggestion: 'Agregar un CTA específico que indique exactamente qué hacer',
        field: 'cta',
      };
    }
    return null;
  }),
  v(
    'E-008',
    'experience',
    'low',
    'Contenido debe ser accesible (alt text en imágenes)',
    (_ctx) =>
      // Regla de auditoría
      null,
  ),
  v(
    'E-009',
    'experience',
    'medium',
    'Links en bio deben funcionar y llevar a landing coherente',
    (_ctx) =>
      // Regla de auditoría periódica
      null,
  ),
  v(
    'E-010',
    'experience',
    'low',
    'El nombre visible del perfil debe ser consistente',
    (_ctx) =>
      // Regla de auditoría
      null,
  ),
];

// ========================================================================
// REGLAS DE USO DE ASSETS (A-001 a A-010)
// ========================================================================

const ASSET_USAGE_RULES: BrandRule[] = [
  v('A-001', 'asset-usage', 'high', 'Logo debe aparecer en TODOS los reels', (ctx) => {
    if (ctx.content?.format === 'reel') {
      const desc = ctx.content.description?.toLowerCase() ?? '';
      if (!desc.includes('logo')) {
        return {
          ruleId: 'A-001',
          category: 'asset-usage',
          severity: 'high',
          message: 'Logo no detectado en el reel',
          suggestion: 'Agregar logo en esquina inferior derecha, 10% opacidad',
          field: 'logo',
        };
      }
    }
    return null;
  }),
  v('A-002', 'asset-usage', 'high', 'Logo debe aparecer en TODOS los carruseles (última slide)', (ctx) => {
    if (ctx.content?.format === 'carrusel') {
      const desc = ctx.content.description?.toLowerCase() ?? '';
      if (!desc.includes('logo')) {
        return {
          ruleId: 'A-002',
          category: 'asset-usage',
          severity: 'high',
          message: 'Logo no detectado en el carrusel',
          suggestion: 'Agregar logo en la última slide del carrusel',
          field: 'logo',
        };
      }
    }
    return null;
  }),
  v('A-003', 'asset-usage', 'medium', 'Watermark debe aparecer en posts de producto', (ctx) => {
    const desc = ctx.content?.description?.toLowerCase() ?? '';
    const isProduct = desc.includes('producto') || desc.includes('servicio') || desc.includes('oferta');
    if (isProduct && !desc.includes('watermark')) {
      return {
        ruleId: 'A-003',
        category: 'asset-usage',
        severity: 'medium',
        message: 'Watermark no detectado en post de producto',
        suggestion: 'Agregar watermark en esquina inferior derecha, 10-15% opacidad',
        field: 'watermark',
      };
    }
    return null;
  }),
  v(
    'A-004',
    'asset-usage',
    'medium',
    'Avatar debe coincidir con el registrado en Brand Kit',
    (_ctx) =>
      // Regla de auditoría periódica
      null,
  ),
  v(
    'A-005',
    'asset-usage',
    'low',
    'Highlight covers deben actualizarse si cambia la paleta',
    (_ctx) =>
      // Regla de auditoría
      null,
  ),
  v('A-006', 'asset-usage', 'medium', 'No usar assets de marca en contextos prohibidos', (ctx) => {
    const desc = ctx.content?.description?.toLowerCase() ?? '';
    if (desc.includes('logo') && (desc.includes('fondo complejo') || desc.includes('foto de fiesta'))) {
      return {
        ruleId: 'A-006',
        category: 'asset-usage',
        severity: 'medium',
        message: 'Logo usado en contexto visual prohibido',
        suggestion: 'No usar logo sobre fondos complejos, fotos de fiesta, o colores que no contrasten',
        field: 'logo',
      };
    }
    return null;
  }),
  v('A-007', 'asset-usage', 'high', 'No distorsionar el logo', (ctx) => {
    const desc = ctx.content?.description?.toLowerCase() ?? '';
    if (
      desc.includes('logo') &&
      (desc.includes('estirado') ||
        desc.includes('rotado') ||
        desc.includes('distorsionado') ||
        desc.includes('efecto'))
    ) {
      return {
        ruleId: 'A-007',
        category: 'asset-usage',
        severity: 'high',
        message: 'El logo parece estar distorsionado o modificado',
        suggestion: 'Usar logo sin distorsionar, rotar, ni aplicar efectos. Solo escalar proporcionalmente.',
        field: 'logo',
      };
    }
    return null;
  }),
  v('A-008', 'asset-usage', 'low', 'Fuentes deben ser las autorizadas por la marca', (ctx) => {
    const brandFonts = ctx.brand.visual.typography.map((f) => f.toLowerCase());
    const usedFonts = (ctx.content?.fontsUsed ?? []).map((f) => f.toLowerCase());
    for (const font of usedFonts) {
      if (brandFonts.length > 0 && !brandFonts.some((bf) => font.includes(bf) || bf.includes(font))) {
        return {
          ruleId: 'A-008',
          category: 'asset-usage',
          severity: 'low',
          message: `Fuente no autorizada: ${font}`,
          suggestion: `Usar fuentes de marca: ${brandFonts.join(', ')}`,
          field: 'typography',
        };
      }
    }
    return null;
  }),
  v('A-009', 'asset-usage', 'medium', 'Iconografía prohibida no debe usarse', (ctx) => {
    const forbidden = ctx.brand.visual.forbiddenIconography.map((i) => i.toLowerCase());
    const desc = `${ctx.content?.description ?? ''} ${ctx.content?.caption ?? ''}`.toLowerCase();
    for (const icon of forbidden) {
      if (desc.includes(icon)) {
        return {
          ruleId: 'A-009',
          category: 'asset-usage',
          severity: 'medium',
          message: `Iconografía prohibida: ${icon}`,
          suggestion: `Evitar ${icon}. Usar iconografía permitida: ${ctx.brand.visual.allowedIconography.join(', ')}`,
          field: 'iconography',
        };
      }
    }
    return null;
  }),
  v(
    'A-010',
    'asset-usage',
    'low',
    'Assets obsoletos no deben usarse',
    (_ctx) =>
      // Regla de auditoría
      null,
  ),
];

export const ALL_BRAND_RULES: BrandRule[] = [
  ...VISUAL_RULES,
  ...VOICE_RULES,
  ...STRATEGY_RULES,
  ...EXPERIENCE_RULES,
  ...ASSET_USAGE_RULES,
];

export const getRulesByCategory = (category: string): BrandRule[] =>
  ALL_BRAND_RULES.filter((r) => r.category === category);

export const getRulesBySeverity = (severity: string): BrandRule[] =>
  ALL_BRAND_RULES.filter((r) => r.severity === severity);

export const getRuleById = (id: string): BrandRule | undefined => ALL_BRAND_RULES.find((r) => r.id === id);
