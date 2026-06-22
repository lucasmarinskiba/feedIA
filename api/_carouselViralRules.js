/**
 * Carousel Viral Rules — reglas codificadas de carruseles que funcionan vs los que no.
 *
 * Basado en principios de carruseles virales (do/don't):
 *   1. NO llenar de texto (fatiga cognitiva) → patrón de lectura + jerarquía
 *   2. NO medidas viejas (1080x1080/1350) → 1080x1440 vertical, márgenes 50/50/180
 *   3. NO formato sin validar → formato validado de 10 slides con roles
 *   4. NO texto pequeño + imágenes aburridas → texto e imágenes GRANDES
 *
 * Inyecta reglas en prompts de generación (nano-banana) + valida estructura.
 * GET /api/agency/carousel-rules
 */

import { getSpec } from './_canvasSpecs.js';

// ── DO / DON'T ────────────────────────────────────────────────────────────────
export const CAROUSEL_DOS = [
  { do: 'Texto grande y jerárquico', why: 'el usuario escanea, no lee. Título enorme → subtítulo → cuerpo mínimo' },
  {
    do: 'Patrón de lectura (Z / F)',
    why: 'guiá el ojo: "primero leés esto, después esto". Flechas y números ordenan el recorrido',
  },
  { do: 'Formato 1080x1440 (3:4)', why: 'aprovecha el espacio vertical del móvil, ocupa más pantalla en el feed' },
  { do: 'Una idea por slide', why: 'reduce carga cognitiva, cada swipe = un concepto digerible' },
  {
    do: 'Imágenes grandes y de calidad',
    why: 'imagen protagonista que ocupa el slide, no logos chiquitos ni stock aburrido',
  },
  { do: 'Razón para deslizar en cada slide', why: 'cliffhanger / continuación → "pero esto es lo importante 👉"' },
  { do: 'Valor antes que venta', why: 'slides 1-9 enseñan, recién slide 10 vende. Generosidad primero' },
  { do: 'Diagramas y visuales para explicar', why: 'un diagrama retiene más que un párrafo, especialmente slides 4-5' },
  { do: 'Alto contraste', why: 'texto legible en pantalla pequeña, fondo oscuro + texto claro o viceversa' },
];

export const CAROUSEL_DONTS = [
  {
    dont: 'Llenar el slide de párrafos',
    why: 'fatiga cognitiva → el cerebro es ahorrador y decide ignorar. En móvil un párrafo se vuelve mancha ilegible',
  },
  {
    dont: 'Usar medidas viejas 1080x1080 o 1080x1350',
    why: 'desaprovecha espacio vertical, se ve chico en el feed actual',
  },
  { dont: 'Gancho aburrido en slide 1', why: 'sin hook fuerte no hay swipe, el 80% decide en el primer slide' },
  { dont: 'Vender antes de dar valor', why: 'vender en slide 3-4 espanta, el usuario no te dio confianza todavía' },
  { dont: 'Información aleatoria sin orden', why: 'sin estructura validada el usuario se pierde y abandona' },
  { dont: 'Texto pequeño', why: 'ilegible en móvil → scroll inmediato' },
  { dont: 'Imágenes aburridas (logos, stock genérico)', why: 'no detienen el scroll, no generan emoción' },
  { dont: 'Sin razón para deslizar', why: 'si el slide se siente "completo" el usuario no sigue' },
];

// ── DIMENSIONES correctas ─────────────────────────────────────────────────────
export const CAROUSEL_DIMENSIONS = {
  recommended: { w: 1080, h: 1440, aspect: '3:4', label: 'Vertical (aprovecha espacio)' },
  margins: { left: 50, right: 50, bottom: 180, top: 120 },
  deprecated: [
    { w: 1080, h: 1080, why: 'cuadrado viejo, desaprovecha vertical' },
    { w: 1080, h: 1350, why: '4:5, mejor que cuadrado pero 3:4 ocupa más pantalla' },
  ],
  note: 'Márgenes: 50px laterales, 180px abajo (íconos IG), 120px arriba (header perfil).',
};

// ── FORMATO VALIDADO de 10 slides ─────────────────────────────────────────────
export const VALIDATED_10_SLIDE_FORMAT = [
  {
    slide: 1,
    role: 'hook',
    purpose: 'Detén el scroll y engánchalos',
    textWeight: 'XXL',
    guide: 'Frase impactante + curiosidad. Imagen protagonista. NADA de venta.',
  },
  {
    slide: 2,
    role: 'interes',
    purpose: 'Genera interés con un ejemplo',
    textWeight: 'XL',
    guide: 'Ejemplo concreto o dato que valida el hook',
  },
  {
    slide: 3,
    role: 'interes',
    purpose: 'Profundiza el interés',
    textWeight: 'XL',
    guide: 'Continúa el ejemplo / amplía el contexto',
  },
  {
    slide: 4,
    role: 'atencion',
    purpose: 'Mantén la atención con diagramas',
    textWeight: 'L',
    guide: 'Diagrama o visual que explica el concepto',
  },
  {
    slide: 5,
    role: 'atencion',
    purpose: 'Sostén con visual',
    textWeight: 'L',
    guide: 'Segundo diagrama / paso visual',
  },
  { slide: 6, role: 'practica', purpose: 'Información práctica', textWeight: 'L', guide: 'Tip aplicable #1' },
  { slide: 7, role: 'practica', purpose: 'Información práctica', textWeight: 'L', guide: 'Tip aplicable #2' },
  { slide: 8, role: 'practica', purpose: 'Información práctica', textWeight: 'L', guide: 'Tip aplicable #3' },
  {
    slide: 9,
    role: 'practica',
    purpose: 'Información práctica',
    textWeight: 'L',
    guide: 'Resumen / último tip de valor',
  },
  {
    slide: 10,
    role: 'cta',
    purpose: 'Llamada a la acción simple',
    textWeight: 'XL',
    guide: 'UN solo CTA claro: comentá / guardá / seguí. Sin opciones múltiples.',
  },
];

// Adapta el formato validado a un número arbitrario de slides (3-10)
export const buildValidatedStructure = (slideCount = 5) => {
  const n = Math.max(3, Math.min(10, slideCount));
  if (n === 10) return VALIDATED_10_SLIDE_FORMAT;
  // Siempre: 1 hook, último CTA, resto distribuido interes→atencion→practica
  const out = [
    {
      slide: 1,
      role: 'hook',
      purpose: 'Detén el scroll y engánchalos',
      textWeight: 'XXL',
      guide: 'Frase impactante + curiosidad. Imagen protagonista. Sin venta.',
    },
  ];
  const middle = n - 2;
  const roles = ['interes', 'atencion', 'practica'];
  for (let i = 0; i < middle; i++) {
    const role = roles[Math.min(roles.length - 1, Math.floor((i / middle) * roles.length))];
    const purposeMap = {
      interes: 'Genera interés con un ejemplo',
      atencion: 'Mantén la atención con un visual/diagrama',
      practica: 'Información práctica aplicable',
    };
    out.push({
      slide: i + 2,
      role,
      purpose: purposeMap[role],
      textWeight: role === 'interes' ? 'XL' : 'L',
      guide: purposeMap[role],
    });
  }
  out.push({
    slide: n,
    role: 'cta',
    purpose: 'Llamada a la acción simple',
    textWeight: 'XL',
    guide: 'UN solo CTA claro. Sin opciones múltiples.',
  });
  return out;
};

// Tamaños de texto (px sobre canvas 1080 de ancho)
export const TEXT_WEIGHTS = {
  XXL: { px: 120, use: 'Hook principal', maxWords: 8 },
  XL: { px: 84, use: 'Título de slide', maxWords: 10 },
  L: { px: 60, use: 'Subtítulo / idea', maxWords: 14 },
  M: { px: 42, use: 'Cuerpo breve', maxWords: 22 },
};

// ── Texto para inyectar en prompt de nano-banana ──────────────────────────────
export const carouselRulesPromptText = (slideCount = 5) => {
  const structure = buildValidatedStructure(slideCount);
  return `REGLAS DE CARRUSEL VIRAL (obligatorias):
- Formato 1080x1440 vertical (3:4). Márgenes: 50px laterales, 180px abajo, 120px arriba.
- Texto GRANDE y jerárquico: hook a ~120px, títulos ~84px, cuerpo ~60px. NUNCA párrafos largos (fatiga cognitiva).
- Una sola idea por slide. Alto contraste. Imagen protagonista grande (no logos ni stock aburrido).
- Patrón de lectura claro (de arriba-izquierda hacia abajo). Razón para deslizar en cada slide.
- Estructura validada de ${structure.length} slides:
${structure.map((s) => `  Slide ${s.slide} (${s.role}): ${s.purpose}. ${s.guide}`).join('\n')}
- Valor en slides 1-${structure.length - 1}, venta SOLO en el último (CTA simple).`;
};

// ── Validación heurística de un carrusel generado ─────────────────────────────
export const validateCarousel = ({ slides = [], dimensions = {} } = {}) => {
  const issues = [];
  const wins = [];

  // Dimensiones
  if (dimensions.w && dimensions.h) {
    if (dimensions.w === 1080 && dimensions.h === 1440) wins.push('✓ Formato 1080x1440 óptimo');
    else if (dimensions.h === 1080 || dimensions.h === 1350)
      issues.push('⚠️ Medida vieja → usar 1080x1440 (3:4 vertical)');
  }

  // Cantidad de slides
  if (slides.length < 3) issues.push('⚠️ Muy pocos slides (mínimo 3, ideal 5-10)');
  if (slides.length > 10) issues.push('⚠️ Demasiados slides (máx 10, el usuario abandona)');

  // Por slide: longitud de texto
  slides.forEach((s, i) => {
    const text = (s.text || s.headline || s.body || '').trim();
    const words = text.split(/\s+/).filter(Boolean).length;
    if (i === 0) {
      // hook
      if (words > 12) issues.push(`⚠️ Slide 1 (hook) muy largo (${words} palabras) → máx 8-10, debe parar el scroll`);
      else wins.push('✓ Hook conciso');
    } else if (words > 35) {
      issues.push(`⚠️ Slide ${i + 1} sobrecargado (${words} palabras) → fatiga cognitiva, reducí texto`);
    }
  });

  // CTA en último slide
  const last = slides[slides.length - 1];
  if (last) {
    const lt = (last.text || last.headline || last.body || '').toLowerCase();
    if (/comentá|guardá|seguí|seguime|dm|link|comenta|guarda/.test(lt)) wins.push('✓ CTA presente en último slide');
    else issues.push('⚠️ Falta CTA claro en el último slide');
  }

  const score = Math.max(0, Math.min(100, 100 - issues.length * 12 + Math.min(wins.length * 4, 20)));
  return { score, issues, wins, verdict: score >= 75 ? 'VIRAL ✅' : score >= 50 ? 'MEJORABLE' : 'PÉSIMO ❌' };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleCarouselRules = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/agency/carousel-rules' && m === 'GET') {
    return json(200, {
      ok: true,
      dos: CAROUSEL_DOS,
      donts: CAROUSEL_DONTS,
      dimensions: CAROUSEL_DIMENSIONS,
      validatedFormat: VALIDATED_10_SLIDE_FORMAT,
      textWeights: TEXT_WEIGHTS,
    });
  }
  if (path === '/api/agency/carousel-validate' && m === 'POST') {
    return json(200, {
      ok: true,
      ...validateCarousel({ slides: body?.slides || [], dimensions: body?.dimensions || {} }),
    });
  }
  return false;
};
