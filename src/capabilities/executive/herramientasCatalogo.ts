/**
 * Herramientas IA: catálogo, rol senior, reglas de oficio, validación de entrada y salida, y
 * respaldos deterministas que usan datos reales de la cuenta. Función pura: no toca red ni disco.
 */

export type CategoriaHerramienta = 'Contenido' | 'Estrategia' | 'Comunidad' | 'Operación';

export interface CampoHerramienta {
  id: string;
  etiqueta: string;
  tipo: 'texto' | 'textarea' | 'select' | 'numero';
  requerido: boolean;
  opciones?: string[];
  min?: number;
  max?: number;
  ayuda?: string;
}

export interface ContextoCuenta {
  totalPosts: number;
  topPosts: Array<{ formato: string; caption: string; tasa: number }>;
  formatos: Array<{ formato: string; posts: number; medianaTasa: number }>;
  momentos: Array<{ dia: string; franja: string; medianaTasa: number; posts: number }>;
  hashtagsTop: string[];
}

export interface SeccionResultado {
  titulo: string;
  tipo: 'texto' | 'lista' | 'copiable';
  contenido: string | string[];
}

export interface ResultadoHerramienta {
  titulo: string;
  secciones: SeccionResultado[];
  notas: string[];
}

export interface HerramientaDef {
  id: string;
  nombre: string;
  categoria: CategoriaHerramienta;
  descripcion: string;
  icono: string;
  rol: string;
  reglas: string[];
  campos: CampoHerramienta[];
  soloReglas?: boolean;
  respaldo?: (valores: Record<string, string | number>, contexto: ContextoCuenta) => ResultadoHerramienta;
}

const MAX_TEXTO = 2000;
const MAX_SECCIONES = 12;
const MAX_CONTENIDO = 3000;
const MAX_ITEMS = 20;
const MAX_ITEM = 400;
const HASHTAGS_GENERICOS = [
  '#love',
  '#instagood',
  '#follow',
  '#like',
  '#like4like',
  '#followme',
  '#photooftheday',
  '#picoftheday',
];
const PATRON_BAIT =
  /(etiquet\S*\s+a\s+(alguien|un amigo|tu)|comparte\s+(para|y)\s+(ganar|participar)|sorteo|gana[rs]?\s+\$|sigu[eé]\s+y\s+te\s+(doy|regalo)|dale\s+like\s+si|comenta\s+(y|para)\s+(ganar|participar))/i;
const PATRON_ABSOLUTO =
  /(\b(garantizad[oa]s?|siempre funciona|resultados seguros|sin esfuerzo|de la noche a la ma[ñn]ana)\b|100\s?%)/i;
const PATRON_LINK = /https?:\/\/|www\./i;

export const validarEntrada = (
  def: HerramientaDef,
  raw: Record<string, unknown>,
): { ok: true; valores: Record<string, string | number> } | { ok: false; error: string } => {
  const valores: Record<string, string | number> = {};
  for (const campo of def.campos) {
    const valor = raw[campo.id];
    if (campo.tipo === 'numero') {
      const n =
        typeof valor === 'number' ? valor : typeof valor === 'string' && valor.trim() !== '' ? Number(valor) : NaN;
      if (!Number.isFinite(n)) {
        if (campo.requerido) return { ok: false, error: `${campo.etiqueta} es obligatorio` };
        continue;
      }
      const min = campo.min ?? -Infinity;
      const max = campo.max ?? Infinity;
      if (!Number.isInteger(n) || n < min || n > max) {
        return { ok: false, error: `${campo.etiqueta} debe ser un número entero entre ${min} y ${max}` };
      }
      valores[campo.id] = n;
      continue;
    }
    const texto =
      typeof valor === 'string'
        ? valor
            .replace(/\u0000/g, '')
            .trim()
            .slice(0, MAX_TEXTO)
        : '';
    if (!texto) {
      if (campo.requerido) return { ok: false, error: `${campo.etiqueta} es obligatorio` };
      continue;
    }
    if (campo.tipo === 'select' && !(campo.opciones ?? []).includes(texto)) {
      return { ok: false, error: `${campo.etiqueta}: opción inválida` };
    }
    valores[campo.id] = texto;
  }
  return { ok: true, valores };
};

const cortar = (texto: string, max: number): string => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

export const validarResultado = (raw: unknown): ResultadoHerramienta | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.titulo !== 'string' || !Array.isArray(r.secciones)) return null;
  const secciones: SeccionResultado[] = [];
  for (const s of r.secciones.slice(0, MAX_SECCIONES)) {
    if (typeof s !== 'object' || s === null) continue;
    const sec = s as Record<string, unknown>;
    const titulo = typeof sec.titulo === 'string' ? cortar(sec.titulo, 120) : '';
    const tipo = sec.tipo === 'lista' || sec.tipo === 'copiable' ? sec.tipo : 'texto';
    if (tipo === 'lista' && Array.isArray(sec.contenido)) {
      const items = sec.contenido
        .filter((i): i is string => typeof i === 'string' && i.trim().length > 0)
        .slice(0, MAX_ITEMS)
        .map((i) => cortar(i.trim(), MAX_ITEM));
      if (items.length > 0) secciones.push({ titulo, tipo, contenido: items });
      continue;
    }
    if (typeof sec.contenido === 'string' && sec.contenido.trim()) {
      secciones.push({ titulo, tipo, contenido: cortar(sec.contenido.trim(), MAX_CONTENIDO) });
    }
  }
  if (secciones.length === 0) return null;
  const notas = Array.isArray(r.notas)
    ? r.notas
        .filter((n): n is string => typeof n === 'string')
        .slice(0, MAX_ITEMS)
        .map((n) => cortar(n, MAX_ITEM))
    : [];
  return { titulo: cortar(r.titulo, 160), secciones, notas };
};

export interface HallazgoSeguridad {
  severidad: 'alta' | 'media' | 'baja';
  texto: string;
  correccion: string;
}

export const auditoriaReglas = (
  caption: string,
  hashtags: string[],
): { nivel: 'alto' | 'medio' | 'bajo' | 'ninguno'; hallazgos: HallazgoSeguridad[] } => {
  const hallazgos: HallazgoSeguridad[] = [];
  if (PATRON_BAIT.test(caption)) {
    hallazgos.push({
      severidad: 'alta',
      texto: 'Engagement bait: pedir etiquetas, likes o compartidos a cambio de algo puede limitar el alcance.',
      correccion: 'Reemplazalo por una invitación genuina, por ejemplo: "Si te pasó algo parecido, contalo abajo".',
    });
  }
  if (PATRON_ABSOLUTO.test(caption)) {
    hallazgos.push({
      severidad: 'media',
      texto: 'Promesa absoluta o garantía: la audiencia la percibe como exagerada y la plataforma la puede marcar.',
      correccion: 'Describí el resultado con condiciones reales: "pensado para", "en nuestra experiencia".',
    });
  }
  const total = new Set(hashtags.map((h) => h.toLowerCase())).size;
  if (total > 30) {
    hallazgos.push({
      severidad: 'alta',
      texto: `${total} hashtags: Instagram admite hasta 30 por publicación.`,
      correccion: 'Quedate con 5 a 12 relevantes y sacá los que no describen el contenido.',
    });
  }
  const genericos = hashtags.filter((h) => HASHTAGS_GENERICOS.includes(h.toLowerCase()));
  if (genericos.length > 0) {
    hallazgos.push({
      severidad: 'media',
      texto: `Hashtags genéricos saturados: ${genericos.join(' ')}.`,
      correccion: 'Cambialos por hashtags de nicho más específicos.',
    });
  }
  if (PATRON_LINK.test(caption)) {
    hallazgos.push({
      severidad: 'baja',
      texto: 'Los links en el caption no son clickeables en Instagram.',
      correccion: 'Usá "link en bio" y dejá el enlace en el perfil.',
    });
  }
  const palabras = caption.split(/\s+/).filter((p) => p.length > 3);
  const mayusculas = palabras.filter((p) => p === p.toUpperCase() && /[A-ZÁÉÍÓÚÑ]/.test(p)).length;
  if (palabras.length >= 6 && mayusculas / palabras.length > 0.4) {
    hallazgos.push({
      severidad: 'baja',
      texto: 'Demasiadas palabras en mayúsculas: cuesta leer y se ve como grito.',
      correccion: 'Dejá mayúsculas solo para una palabra clave.',
    });
  }
  const nivel = hallazgos.some((h) => h.severidad === 'alta')
    ? 'alto'
    : hallazgos.some((h) => h.severidad === 'media')
      ? 'medio'
      : hallazgos.length > 0
        ? 'bajo'
        : 'ninguno';
  return { nivel, hallazgos };
};

const respaldoSafety = (valores: Record<string, string | number>): ResultadoHerramienta => {
  const hashtags = String(valores.hashtags ?? '')
    .split(/[\s\n]+/)
    .map((h) => h.trim())
    .filter(Boolean);
  const { nivel, hallazgos } = auditoriaReglas(String(valores.caption ?? ''), hashtags);
  const etiqueta = { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo', ninguno: 'Sin hallazgos' }[nivel];
  return {
    titulo: 'Revisión previa a publicar',
    secciones: [
      { titulo: 'Nivel de riesgo', tipo: 'texto', contenido: etiqueta },
      {
        titulo: 'Hallazgos',
        tipo: 'lista',
        contenido: hallazgos.length
          ? hallazgos.map((h) => `[${h.severidad}] ${h.texto} Corrección: ${h.correccion}`)
          : ['No se detectaron patrones de riesgo en este caption.'],
      },
    ],
    notas: ['Revisión por reglas: no reemplaza el criterio de quien conoce tu cuenta ni es asesoría legal.'],
  };
};

const respaldoHashtags = (valores: Record<string, string | number>, contexto: ContextoCuenta): ResultadoHerramienta => {
  const tema = String(valores.tema ?? '');
  const cantidad = typeof valores.cantidad === 'number' ? valores.cantidad : 10;
  const secciones: SeccionResultado[] = [
    {
      titulo: 'Mezcla recomendada',
      tipo: 'lista',
      contenido: [
        `40% nicho específico (${Math.max(1, Math.round(cantidad * 0.4))}): términos exactos de "${tema}".`,
        `40% nicho medio (${Math.max(1, Math.round(cantidad * 0.4))}): categorías cercanas a "${tema}".`,
        `20% amplio o tendencia relevante (${Math.max(1, Math.round(cantidad * 0.2))}).`,
      ],
    },
  ];
  if (contexto.hashtagsTop.length > 0) {
    secciones.push({
      titulo: 'De tus posts que mejor rinden',
      tipo: 'copiable',
      contenido: contexto.hashtagsTop.slice(0, cantidad).join(' '),
    });
  }
  return {
    titulo: `Hashtags para ${tema}`,
    secciones,
    notas: [
      'No tenemos volumen por hashtag: la mezcla es una heurística de discovery, no una medición.',
      contexto.hashtagsTop.length > 0
        ? 'Los hashtags de tus posts salen de tu historial real: medí cuáles siguen rindiendo.'
        : 'Todavía no hay historial de posts para tomar hashtags de tu cuenta.',
    ],
  };
};

const respaldoHooks = (valores: Record<string, string | number>): ResultadoHerramienta => {
  const idea = String(valores.idea ?? '');
  return {
    titulo: `Hooks para ${idea}`,
    secciones: [
      {
        titulo: 'Ganchos',
        tipo: 'lista',
        contenido: [
          `Contraste: Nadie te cuenta esto sobre ${idea}.`,
          `Número: 3 errores frecuentes con ${idea} y cómo evitarlos.`,
          `Pregunta: ¿Por qué ${idea} sigue sin funcionarte?`,
          `Consecuencia: Si seguís ignorando ${idea}, te va a costar más de lo que creés.`,
          `Curiosidad: Lo que aprendí sobre ${idea} cuando dejé de hacerlo igual.`,
        ],
      },
    ],
    notas: ['Plantillas de respaldo: la IA no respondió. Reemplazá los ejemplos por tu caso concreto.'],
  };
};

const FRANJA_HORA: Record<string, number> = { madrugada: 6, mañana: 9, mediodía: 13, tarde: 18, noche: 20 };

const respaldoPlan = (valores: Record<string, string | number>, contexto: ContextoCuenta): ResultadoHerramienta => {
  const semanas = Number(valores.semanas) || 1;
  const publicaciones = typeof valores.publicaciones === 'number' ? valores.publicaciones : 3;
  const objetivo = String(valores.objetivo ?? 'alcance');
  const momentos = contexto.momentos.length > 0 ? contexto.momentos : [];
  const formatos = contexto.formatos.length > 0 ? contexto.formatos.map((f) => f.formato) : ['reel', 'carrusel'];
  const items: string[] = [];
  for (let s = 1; s <= semanas; s++) {
    for (let p = 0; p < publicaciones; p++) {
      const momento = momentos[p % Math.max(1, momentos.length)];
      const formato = formatos[p % formatos.length] ?? 'reel';
      const hora = momento ? (FRANJA_HORA[momento.franja] ?? 19) : 19;
      const dia = momento
        ? momento.dia
        : ['martes', 'miércoles', 'jueves', 'lunes', 'viernes', 'sábado', 'domingo'][p % 7];
      items.push(`Semana ${s} · ${dia} ${String(hora).padStart(2, '0')}:00 · ${formato} · objetivo: ${objetivo}`);
    }
  }
  return {
    titulo: `Plan de ${semanas} semana(s), ${publicaciones} publicaciones por semana`,
    secciones: [{ titulo: 'Calendario', tipo: 'lista', contenido: items }],
    notas: momentos.length
      ? ['Días y horas salen de tus posts con mejor interacción; el tema de cada pieza queda a definir.']
      : ['Sin historial: los horarios son sugeridos, no medidos en tu cuenta.'],
  };
};

const TONO = ['cercano', 'experto', 'divertido', 'inspirador'];

export const HERRAMIENTAS: HerramientaDef[] = [
  {
    id: 'caption',
    nombre: 'Caption IA',
    categoria: 'Contenido',
    descripcion: 'Caption con hook, cuerpo y CTA, afinado a la voz de la marca y a lo que ya rinde en tu cuenta.',
    icono: '✍️',
    rol: 'copywriter senior de redes sociales con experiencia en marcas de servicios y de producto',
    reglas: [
      'El hook va en las primeras 125 caracteres: es lo único visible antes del "más".',
      'Una idea por caption; cortá lo que no ayuda a decidir al lector.',
      'El CTA es una acción concreta y única: guardar, comentar una palabra o escribir por DM.',
      'No prometas resultados ni cifras que la marca no pueda sostener.',
      'Si hay historial, reutilizá la estructura de los captions que mejor rinden, sin copiarlos.',
      'Hashtags: 5 relevantes como máximo en el caption; Instagram admite hasta 30 por publicación.',
    ],
    campos: [
      {
        id: 'formato',
        etiqueta: 'Formato',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'imagen', 'video'],
      },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'leads', 'ventas'],
      },
      {
        id: 'idea',
        etiqueta: 'Idea del contenido',
        tipo: 'textarea',
        requerido: true,
        ayuda: 'De qué trata y qué querés que haga la gente',
      },
    ],
  },
  {
    id: 'hooks',
    nombre: 'Hook Factory',
    categoria: 'Contenido',
    descripcion: 'Cinco ganchos de los primeros 3 segundos, cada uno con su estructura y su versión para pantalla.',
    icono: '🪝',
    rol: 'especialista en retención de los primeros tres segundos de video y en titulares de carrusel',
    reglas: [
      'Un hook promete algo específico que el contenido entrega.',
      'Estructuras: contraste (lo que se cree vs lo que pasa), número concreto, pregunta con tensión, consecuencia y curiosidad abierta.',
      'Máximo 12 palabras; en video el hook se lee en 2 segundos.',
      'Sin prueba social con cifras inventadas: si no hay dato real, no se usa.',
      'Para cada hook indicá el tipo y por qué funciona.',
    ],
    campos: [
      { id: 'idea', etiqueta: 'Idea del contenido', tipo: 'textarea', requerido: true },
      { id: 'formato', etiqueta: 'Formato', tipo: 'select', requerido: true, opciones: ['reel', 'carrusel', 'video'] },
    ],
    respaldo: (valores) => respaldoHooks(valores),
  },
  {
    id: 'hashtags',
    nombre: 'Hashtag Lab',
    categoria: 'Contenido',
    descripcion: 'Mezcla de hashtags por tamaño de nicho, con los que ya usaste en tus posts que mejor rinden.',
    icono: '#️⃣',
    rol: 'estratega de discovery en redes, con foco en alcance fuera de tus seguidores',
    reglas: [
      'Mezcla: 40% nicho específico, 40% nicho medio y 20% amplio o de tendencia relevante.',
      'Evitá los hashtags genéricos saturados (#love, #instagood, #follow, #like).',
      'No inventes volúmenes ni métricas de hashtags: no tenemos esa data.',
      'Priorizá los que ya aparecen en tus posts con mejor interacción.',
      'Sin espacios ni tildes; en minúsculas.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema o nicho', tipo: 'texto', requerido: true },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      { id: 'cantidad', etiqueta: 'Cantidad', tipo: 'numero', requerido: false, min: 3, max: 30 },
    ],
    respaldo: (valores, contexto) => respaldoHashtags(valores, contexto),
  },
  {
    id: 'guion',
    nombre: 'Guion de video',
    categoria: 'Contenido',
    descripcion: 'Guion con hook de 2 segundos, desarrollo con ritmo y cierre con CTA, listo para grabar.',
    icono: '🎬',
    rol: 'director de guiones para Reels y TikTok especializado en retención',
    reglas: [
      'Hook de 0 a 2 segundos: texto en pantalla y frase de voz que plantea la promesa.',
      'Un beat cada 2 o 3 segundos, con un cambio visual o de texto en cada uno.',
      'Diálogo corto y oral; sin saludos ni relleno.',
      'Cierre con una pregunta o un CTA concreto.',
      'Indicá la duración objetivo y el B-roll necesario.',
      'No prometas alcances ni resultados en el guion.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema', tipo: 'textarea', requerido: true },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
      {
        id: 'duracion',
        etiqueta: 'Duración (segundos)',
        tipo: 'select',
        requerido: true,
        opciones: ['15', '30', '45', '60'],
      },
      { id: 'tono', etiqueta: 'Tono', tipo: 'select', requerido: true, opciones: TONO },
    ],
  },
  {
    id: 'carrusel',
    nombre: 'Carrusel Builder',
    categoria: 'Contenido',
    descripcion: 'Estructura completa de un carrusel educativo: portada, una idea por slide y cierre con CTA.',
    icono: '🧩',
    rol: 'diseñador de contenido educativo para carruseles de redes sociales',
    reglas: [
      'La portada es una promesa concreta, con número o contraste.',
      'Una idea por slide; máximo 30 palabras por slide.',
      'Progresión lógica: problema, método, ejemplos y resumen.',
      'El último slide tiene un único CTA.',
      'Sugerí el texto de cada slide, no el diseño visual.',
    ],
    campos: [
      { id: 'tema', etiqueta: 'Tema', tipo: 'textarea', requerido: true },
      { id: 'slides', etiqueta: 'Cantidad de slides', tipo: 'select', requerido: true, opciones: ['5', '7', '10'] },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['educar', 'convertir', 'guardados', 'debate'],
      },
    ],
  },
  {
    id: 'repurpose',
    nombre: 'Repurposer',
    categoria: 'Contenido',
    descripcion: 'Adapta una pieza a otro formato sin perder el mensaje, indicando qué se gana y qué se pierde.',
    icono: '♻️',
    rol: 'editor multiformato con experiencia en reciclar contenido sin que se note',
    reglas: [
      'Reel: hook en 2 segundos, beats cortos y cierre con CTA.',
      'Carrusel: una idea por slide y portada con promesa.',
      'Post de imagen: una sola idea y un caption que se entiende solo.',
      'Respetá la tesis original; cambiá el envase, no el mensaje.',
      'Indicá explícitamente qué información se pierde al adaptar.',
    ],
    campos: [
      { id: 'contenido', etiqueta: 'Contenido original', tipo: 'textarea', requerido: true },
      {
        id: 'formato_origen',
        etiqueta: 'Formato original',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'post', 'video', 'blog', 'texto'],
      },
      {
        id: 'formato_destino',
        etiqueta: 'Formato destino',
        tipo: 'select',
        requerido: true,
        opciones: ['reel', 'carrusel', 'post', 'historia'],
      },
    ],
  },
  {
    id: 'safety',
    nombre: 'Safety Check',
    categoria: 'Operación',
    descripcion: 'Revisa el caption antes de publicar: engagement bait, promesas absolutas, hashtags y links.',
    icono: '🛡️',
    rol: 'auditor de riesgo para cuentas de redes sociales; no das asesoría legal',
    reglas: [
      'Engagement bait (pedir etiquetas, likes o compartir a cambio de algo) es riesgo alto.',
      'Promesas absolutas o garantías son riesgo medio.',
      'Hasta 30 hashtags en Instagram; más es un error.',
      'Hashtags genéricos saturados son riesgo medio.',
      'Los links del caption no son clickeables en Instagram: usá "link en bio".',
      'Explicá cada hallazgo y dá una corrección concreta.',
    ],
    campos: [
      { id: 'caption', etiqueta: 'Caption', tipo: 'textarea', requerido: true },
      { id: 'hashtags', etiqueta: 'Hashtags', tipo: 'textarea', requerido: false },
      { id: 'plataforma', etiqueta: 'Plataforma', tipo: 'select', requerido: true, opciones: ['instagram', 'tiktok'] },
    ],
    soloReglas: true,
    respaldo: (valores) => respaldoSafety(valores),
  },
  {
    id: 'perfil',
    nombre: 'Profile AI',
    categoria: 'Estrategia',
    descripcion: 'Bio, highlights y link en bio pensados para convertir visitas de perfil en seguidores o consultas.',
    icono: '✨',
    rol: 'especialista en perfiles de negocio y en convertir visitas de perfil',
    reglas: [
      'La bio dice qué hacés, para quién y con qué prueba; máximo 150 caracteres.',
      'Un solo CTA en la bio y uno en el link.',
      'Highlights por intención: empezar, resultados, servicios o precio, contacto.',
      'El nombre visible incluye una palabra clave del nicho.',
      'Sin promesas absolutas y con emojis mínimos.',
    ],
    campos: [
      { id: 'propuesta', etiqueta: 'Qué hace la marca y para quién', tipo: 'textarea', requerido: true },
      { id: 'bio_actual', etiqueta: 'Bio actual', tipo: 'textarea', requerido: false },
      { id: 'nombre_visible', etiqueta: 'Nombre visible', tipo: 'texto', requerido: false },
      { id: 'link', etiqueta: 'Link en bio', tipo: 'texto', requerido: false },
    ],
  },
  {
    id: 'respuestas',
    nombre: 'Respuestas IA',
    categoria: 'Comunidad',
    descripcion: 'Respuestas a comentarios y DMs con tono de marca, y criterio para escalar a una persona.',
    icono: '💬',
    rol: 'community manager senior con criterio de crisis y de ventas',
    reglas: [
      'Reconocé lo que la persona dijo antes de responder.',
      'Si es un lead, invitá a DM o al canal de contacto sin presionar.',
      'Quejas graves o temas médicos, legales o financieros: escalar a una persona.',
      'Nunca prometas reembolsos, plazos ni resultados.',
      'Respuestas de una a tres frases, sin jerga.',
      'Spam: no respondas; sugerí ocultar o reportar.',
    ],
    campos: [
      { id: 'mensaje', etiqueta: 'Mensaje recibido', tipo: 'textarea', requerido: true },
      { id: 'tipo', etiqueta: 'Tipo', tipo: 'select', requerido: true, opciones: ['comentario', 'dm'] },
      {
        id: 'intencion',
        etiqueta: 'Intención',
        tipo: 'select',
        requerido: true,
        opciones: ['pregunta', 'queja', 'elogio', 'lead', 'spam', 'otro'],
      },
    ],
  },
  {
    id: 'plan',
    nombre: 'Plan semanal',
    categoria: 'Estrategia',
    descripcion: 'Calendario de publicación con formatos y horarios según lo que ya rinde en tu cuenta.',
    icono: '🗓️',
    rol: 'planner de contenido con experiencia en cadencias de publicación',
    reglas: [
      'Repartí los formatos según lo que mejor rinde en tu cuenta.',
      'Publicá en las franjas de mejor interacción cuando hay historial.',
      'No pongas dos piezas pesadas (video largo, carrusel complejo) el mismo día.',
      'Dejá un día de respiro entre piezas del mismo tema.',
      'Si no hay historial, indicá que los horarios son sugeridos.',
    ],
    campos: [
      { id: 'semanas', etiqueta: 'Semanas', tipo: 'select', requerido: true, opciones: ['1', '2', '4'] },
      { id: 'publicaciones', etiqueta: 'Publicaciones por semana', tipo: 'numero', requerido: true, min: 1, max: 7 },
      {
        id: 'objetivo',
        etiqueta: 'Objetivo',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'leads'],
      },
    ],
    respaldo: (valores, contexto) => respaldoPlan(valores, contexto),
  },
  {
    id: 'metricas',
    nombre: 'Métricas explicadas',
    categoria: 'Estrategia',
    descripcion: 'Explica en lenguaje claro por qué cambió un número y qué mirar para confirmarlo.',
    icono: '📈',
    rol: 'analista de datos de redes sociales que separa correlación de causa y explica sin jerga',
    reglas: [
      'Separá lo que se observa de lo que se supone.',
      'Ordená las causas probables de la más a la menos probable.',
      'Para cada causa indicá cómo verificarla con tus posts.',
      'Si faltan datos, decilo y pedí lo que falta.',
      'No inventes cifras: usá solo las del pedido y del contexto.',
    ],
    campos: [
      {
        id: 'metrica',
        etiqueta: 'Métrica',
        tipo: 'select',
        requerido: true,
        opciones: ['alcance', 'engagement', 'guardados', 'seguidores', 'compartidos'],
      },
      { id: 'cambio', etiqueta: 'Qué cambió y en cuánto tiempo', tipo: 'textarea', requerido: true },
      { id: 'contexto', etiqueta: 'Contexto (opcional)', tipo: 'textarea', requerido: false },
    ],
  },
];

export const herramientaPorId = (id: string): HerramientaDef | undefined => HERRAMIENTAS.find((h) => h.id === id);
