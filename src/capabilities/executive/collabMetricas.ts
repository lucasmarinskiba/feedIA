/**
 * Collabs: consejos, colaboraciones adaptadas al nicho amplio, subnichos, estilos de contenido y red
 * principal de la cuenta, opciones de cada red y pipeline de prospectos. Función pura: no toca red ni disco.
 */

export type TipoMarca = 'personal' | 'empresa';
export type EstadoProspecto = 'idea' | 'contactado' | 'negociando' | 'confirmado' | 'completado' | 'descartado';
export type TipoProspecto = 'marca' | 'creador' | 'medio' | 'otro';
export type PlataformaProspecto = 'instagram' | 'tiktok' | 'otra';
export type PlataformaPrincipal = 'instagram' | 'tiktok' | 'ambas';
export type EstiloId =
  | 'vlog'
  | 'humor'
  | 'ugc'
  | 'tutorial'
  | 'resenas'
  | 'entrevistas'
  | 'detras'
  | 'noticias'
  | 'testimonios'
  | 'historias'
  | 'retos';

export interface EstiloContenido {
  label: string;
  colab: string;
  buscar: string;
}

export const ESTILOS_CONTENIDO: Record<EstiloId, EstiloContenido> = {
  vlog: {
    label: 'Vlog',
    colab:
      'Se graban un día juntos y cada uno muestra su parte de la rutina. La audiencia conoce a alguien nuevo sin sentir publicidad.',
    buscar: 'creadores de vlogs que cuenten su día a día cerca de {nicho}.',
  },
  humor: {
    label: 'Humor',
    colab: 'Un sketch o un desafío conjunto. El humor se comparte solo, así que llega a audiencias que no te seguían.',
    buscar: 'creadores de humor que bromeen sobre {nicho} o sobre la vida cotidiana de tu público.',
  },
  ugc: {
    label: 'UGC',
    colab:
      'El creador muestra cómo usa tu producto o tu idea en su vida real. Funciona como prueba social y se ve más natural que un anuncio.',
    buscar: 'creadores UGC con reseñas honestas, interacción alta y que todavía no trabajen con marcas de {nicho}.',
  },
  tutorial: {
    label: 'Tutorial',
    colab:
      'Cada uno enseña una parte del mismo tema: uno la teoría, el otro la práctica. Cada audiencia sale con algo útil.',
    buscar: 'educadores que expliquen temas vecinos a {nicho} (no el mismo) para no competir.',
  },
  resenas: {
    label: 'Reseñas',
    colab:
      'Prueban juntos una herramienta o producto y dan veredicto cada uno desde su audiencia. Los dos ganan credibilidad.',
    buscar: 'creadores que reseñen herramientas de {nicho} con criterio y no solo listas de recomendaciones.',
  },
  entrevistas: {
    label: 'Entrevistas',
    colab: 'Uno entrevista al otro. Cada audiencia conoce a un creador nuevo y lo sigue por la conversación.',
    buscar: 'profesionales o creadores de {nicho} con historias concretas para contar.',
  },
  detras: {
    label: 'Detrás de escena',
    colab: 'Se muestra cómo se hace el contenido o el negocio. La transparencia genera confianza.',
    buscar: 'equipos o emprendedores de {nicho} dispuestos a mostrar sus procesos.',
  },
  noticias: {
    label: 'Noticias',
    colab: 'Reaccionan juntos a una novedad del sector. Sirve para entrar rápido en la conversación.',
    buscar: 'creadores de tendencias de {nicho} que publiquen al menos tres veces por semana.',
  },
  testimonios: {
    label: 'Testimonios',
    colab: 'Usuarios o clientes reales cuentan su resultado. Es el formato con más credibilidad para una marca.',
    buscar: 'clientes o usuarios de {nicho} con resultados medibles y dispuestos a contarlos.',
  },
  historias: {
    label: 'Historias personales',
    colab: 'Dos caminos con un mismo hilo. Cada audiencia se identifica con una de las dos historias.',
    buscar: 'creadores de {nicho} con un recorrido personal parecido al tuyo.',
  },
  retos: {
    label: 'Retos',
    colab: 'Un reto que se publica en las dos cuentas y se replica en comentarios. Genera participación real.',
    buscar: 'creadores de {nicho} con comunidades que responden a retos (mirá sus comentarios).',
  },
};

export const ESTILOS_IDS = Object.keys(ESTILOS_CONTENIDO) as EstiloId[];
export const LIMITE_SUBNICHOS = 5;
export const LIMITE_ESTILOS = 6;

const esEstilo = (v: unknown): v is EstiloId => typeof v === 'string' && (ESTILOS_IDS as string[]).includes(v);

export const ESTADOS_PROSPECTO: Record<EstadoProspecto, { label: string; color: string }> = {
  idea: { label: 'Idea', color: '#a1a1aa' },
  contactado: { label: 'Contactado', color: '#93c5fd' },
  negociando: { label: 'Negociando', color: '#fcd34d' },
  confirmado: { label: 'Confirmado', color: '#6ee7b7' },
  completado: { label: 'Completado', color: '#c4b5fd' },
  descartado: { label: 'Descartado', color: '#fca5a5' },
};

const SIGUIENTES: Record<EstadoProspecto, EstadoProspecto[]> = {
  idea: ['contactado', 'descartado'],
  contactado: ['negociando', 'descartado'],
  negociando: ['confirmado', 'descartado'],
  confirmado: ['completado', 'descartado'],
  completado: [],
  descartado: ['idea'],
};

export const siguientesEstados = (estado: EstadoProspecto): EstadoProspecto[] => SIGUIENTES[estado];

export const transicionesPermitidas = (): Record<EstadoProspecto, EstadoProspecto[]> => SIGUIENTES;

export const LIMITE_PROSPECTOS = 300;

export interface Prospecto {
  id: string;
  handle: string;
  plataforma: PlataformaProspecto;
  tipo: TipoProspecto;
  nicho: string;
  seguidores: number | null;
  notas: string;
  estado: EstadoProspecto;
  creadoEn: string;
  actualizadoEn: string;
}

export interface PerfilColab {
  tipoMarca: TipoMarca;
  seguidores: number | null;
  tasaMediana: number | null;
  nicho: string;
  subnichos: string[];
  estilos: EstiloId[];
  plataforma: PlataformaPrincipal;
}

export interface Recomendacion {
  titulo: string;
  prioridad: 1 | 2 | 3;
  porQue: string;
  dondeBuscar: string;
}

export interface OpcionColab {
  id: string;
  red: 'instagram' | 'tiktok';
  nombre: string;
  descripcion: string;
  paso: string;
  url: string;
}

export const OPCIONES_TIKTOK: OpcionColab[] = [
  {
    id: 'creator-marketplace',
    red: 'tiktok',
    nombre: 'Campañas pagas con marcas (TikTok One · Creator Marketplace)',
    descripcion:
      'Marcas que buscan creadores para campañas pagas. Se postula desde la cuenta de creador. Los requisitos de elegibilidad cambian: confirmalos en la plataforma antes de postularte.',
    paso: 'Abrí TikTok One, revisá tu elegibilidad y postulate a las campañas que coincidan con tu nicho.',
    url: 'https://creatormarketplace.tiktok.com/',
  },
  {
    id: 'collab-publicacion',
    red: 'tiktok',
    nombre: 'Publicación en colaboración',
    descripcion:
      'Un mismo video aparece en tu perfil y en el del otro creador. Sirve para crecer con audiencia ajena sin pagar.',
    paso: 'Al publicar, tocá Más opciones → Invitar colaborador, elegí al creador y enviá la invitación antes de publicar.',
    url: 'https://www.tiktok.com/',
  },
];

export const OPCION_INSTAGRAM: OpcionColab = {
  id: 'instagram-colaborador',
  red: 'instagram',
  nombre: 'Publicación con colaborador (Instagram)',
  descripcion:
    'Una misma publicación aparece en tu perfil y en el del otro creador, y cada uno la comparte con su audiencia.',
  paso: 'Al crear la publicación, buscá la opción para invitar colaboradores en la configuración de la publicación, elegí al creador y esperá que acepte. Mientras no acepte, la publicación queda pendiente.',
  url: 'https://www.instagram.com/',
};

export const opcionesDeRed = (plataforma: PlataformaPrincipal): OpcionColab[] => {
  if (plataforma === 'instagram') return [OPCION_INSTAGRAM];
  if (plataforma === 'tiktok') return OPCIONES_TIKTOK;
  return [...OPCIONES_TIKTOK, OPCION_INSTAGRAM];
};

export const redDe = (plataforma: PlataformaPrincipal): string => {
  if (plataforma === 'instagram') return 'Instagram';
  if (plataforma === 'tiktok') return 'TikTok';
  return 'Instagram o TikTok';
};

export const CONSEJOS_COLAB: string[] = [
  'Elegí colaboradores con audiencia parecida a la tuya pero que no sean competencia directa. Eso multiplica el alcance sin canibalizar.',
  'Antes de escribir, mirá sus últimas 10 publicaciones: si sus comentarios son reales y su audiencia responde, es un buen candidato. Si los números no cierran, descartalo.',
  'Proponé algo concreto: qué publican, en qué formato, en qué fecha y qué recibe cada uno. Una propuesta específica se responde más que un "¿colaboramos?".',
  'Las colaboraciones de contenido funcionan mejor cuando el resultado le sirve a la audiencia de ambos. Pensá en un tutorial, un antes y después o un desafío, no en un anuncio.',
  'Pedí el compromiso por escrito: fecha de publicación, formato, cantidad de publicaciones y qué pasa si alguno no cumple.',
  'Después de cada colab, medí alcance, guardados y seguidores nuevos. Repetí solo lo que demostró resultado.',
  'Si tu tasa de interacción está por debajo de la de tu nicho, mejorá tus publicaciones antes de pedir colaboraciones: el otro perfil va a revisar tus números.',
];

export const PLANTILLA_OUTREACH = {
  asunto: 'Propuesta de colaboración con {marca}',
  cuerpo:
    'Hola {handle}, sigo tu contenido sobre {nicho} y me gustó tu forma de contarlo. {presentacion} Te propongo una colaboración: un {formato} conjunto que le sirva a las dos audiencias, publicado en simultáneo. ¿Te interesa que te mande una idea más concreta?',
};

const PRESENTACION: Record<TipoMarca, string> = {
  personal: 'Yo comparto lo que aprendo en {marca}.',
  empresa: 'Desde {marca} mostramos el lado práctico del tema.',
};

const nichoFoco = (perfil: PerfilColab): string => perfil.subnichos[0] ?? (perfil.nicho || 'tu sector');

const buscarEn = (perfil: PerfilColab, texto: string): string => `En ${redDe(perfil.plataforma)}, buscá ${texto}`;

const porQuePublicacion = (plataforma: PlataformaPrincipal): string => {
  if (plataforma === 'tiktok') {
    return 'En TikTok la publicación en colaboración muestra el mismo video en ambos perfiles: crecés con audiencia ajena sin pagar.';
  }
  if (plataforma === 'instagram') {
    return 'En Instagram la publicación con colaborador aparece en el feed de los dos: es la forma más directa de crecer sin depender de marcas.';
  }
  return 'Es la forma más directa de crecer sin depender de marcas: el mismo contenido aparece en los dos perfiles.';
};

export const plantillaOutreach = (perfil: PerfilColab, marca: string): { asunto: string; cuerpo: string } => ({
  asunto: PLANTILLA_OUTREACH.asunto.replace('{marca}', marca),
  cuerpo: PLANTILLA_OUTREACH.cuerpo
    .replace('{nicho}', nichoFoco(perfil))
    .replace('{presentacion}', PRESENTACION[perfil.tipoMarca].replace('{marca}', marca))
    .replace('{formato}', perfil.plataforma === 'tiktok' ? 'video' : 'reel'),
});

export const recomendarColabs = (perfil: PerfilColab): Recomendacion[] => {
  const recs: Recomendacion[] = [];
  const seguidores = perfil.seguidores ?? 0;
  const general = perfil.nicho || 'tu nicho';
  const principal = nichoFoco(perfil);

  if (perfil.tipoMarca === 'empresa') {
    recs.push({
      titulo: 'Marcas complementarias de tu nicho',
      prioridad: 1,
      porQue:
        'Una empresa gana más con marcas que venden a la misma persona sin competir: cada una presta audiencia a la otra.',
      dondeBuscar: buscarEn(perfil, `marcas de ${principal} que vendan un producto complementario (no sustituto).`),
    });
    recs.push({
      titulo: 'Creadores micro del nicho con audiencia activa',
      prioridad: seguidores < 10000 ? 1 : 2,
      porQue:
        'Los creadores de 1 mil a 50 mil seguidores suelen tener comunidades que responden y cobran menos que los grandes.',
      dondeBuscar: buscarEn(
        perfil,
        `creadores de ${principal} con comentarios reales en sus últimos posts y audiencia de tu mismo país o idioma.`,
      ),
    });
    recs.push({
      titulo: 'Medios y newsletters del sector',
      prioridad: seguidores >= 10000 ? 2 : 3,
      porQue: 'Aportan credibilidad y tráfico calificado. Suelen pedir contenido exclusivo o una nota a cambio.',
      dondeBuscar: `Newsletters o cuentas de noticias de ${principal} con lectores activos.`,
    });
  } else {
    recs.push({
      titulo: 'Creadores de tu nicho con tamaño parecido',
      prioridad: 1,
      porQue: 'Con una audiencia parecida a la tuya, el intercambio es justo y ambos ganan alcance sin pagar.',
      dondeBuscar: buscarEn(perfil, `creadores de ${principal} con entre la mitad y el doble de tus seguidores.`),
    });
    recs.push({
      titulo: 'Publicación en colaboración con otro creador',
      prioridad: 2,
      porQue: porQuePublicacion(perfil.plataforma),
      dondeBuscar: buscarEn(perfil, `creadores que ya publicaron contenido parecido al tuyo en ${principal}.`),
    });
    recs.push({
      titulo: 'Marcas afines que buscan tu tipo de audiencia',
      prioridad: seguidores >= 10000 ? 1 : 3,
      porQue:
        'Las marcas pagan por audiencia cuyo perfil coincide con su cliente. Con números claros tenés más chances.',
      dondeBuscar: buscarEn(
        perfil,
        `marcas de ${principal} con campañas de creadores activas (revisá sus publicaciones patrocinadas).`,
      ),
    });
  }

  perfil.subnichos.slice(0, 2).forEach((sub, i) => {
    recs.push({
      titulo: `Especialistas en ${sub}`,
      prioridad: i === 0 ? 1 : 2,
      porQue: `Tu contenido apunta a ${sub}. Un creador que ya tiene audiencia ahí te acerca a ese público sin empezar de cero.`,
      dondeBuscar: buscarEn(
        perfil,
        `creadores que publiquen sobre ${sub} con regularidad y respondan a sus comentarios.`,
      ),
    });
  });

  const sub = perfil.subnichos[0];
  if (sub && perfil.nicho && sub !== perfil.nicho) {
    recs.push({
      titulo: `Del nicho general a ${sub}`,
      prioridad: 2,
      porQue: `Empezaste en ${general} y querés llegar a ${sub}. Creadores de ${general} que todavía no tocan ${sub} ganan contenido nuevo con tu tema y te presentan su audiencia.`,
      dondeBuscar: buscarEn(perfil, `creadores de ${general} que todavía no hablen de ${sub}.`),
    });
  }

  perfil.estilos.slice(0, 2).forEach((id) => {
    const estilo = ESTILOS_CONTENIDO[id];
    recs.push({
      titulo: `Colaboración: ${estilo.label}`,
      prioridad: 2,
      porQue: estilo.colab,
      dondeBuscar: buscarEn(perfil, estilo.buscar.replace('{nicho}', principal)),
    });
  });

  if (perfil.tasaMediana !== null && perfil.tasaMediana < 0.01) {
    recs.unshift({
      titulo: 'Primero subí la interacción',
      prioridad: 1,
      porQue: 'Tu tasa de interacción está baja. Los otros perfiles van a mirar tus números antes de aceptar.',
      dondeBuscar: 'Revisá Análisis posts: formato y horario con mejor tasa. Aplicalos antes de pedir colaboraciones.',
    });
  }

  return recs.sort((a, b) => a.prioridad - b.prioridad).slice(0, 8);
};

export interface EntradaPerfilColab {
  tipoMarca?: TipoMarca;
  nicho?: string;
  subnichos?: string[];
  estilos?: EstiloId[];
  plataforma?: PlataformaPrincipal;
}

const limpiarTexto = (valor: string): string =>
  valor
    .replace(/\u0000/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const esPlataformaPrincipal = (v: unknown): v is PlataformaPrincipal =>
  v === 'instagram' || v === 'tiktok' || v === 'ambas';

export const validarPerfilContenido = (
  body: unknown,
): { ok: true; valor: EntradaPerfilColab } | { ok: false; error: string } => {
  const datos = (body ?? {}) as Record<string, unknown>;
  const valor: EntradaPerfilColab = {};

  const tipo = datos['tipoMarca'];
  if (tipo !== undefined) {
    if (tipo !== 'personal' && tipo !== 'empresa') {
      return { ok: false, error: 'El tipo debe ser marca personal o empresa.' };
    }
    valor.tipoMarca = tipo;
  }

  const nicho = datos['nicho'];
  if (nicho !== undefined) {
    const texto = typeof nicho === 'string' ? limpiarTexto(nicho) : '';
    if (texto.length === 0 || texto.length > 80) {
      return { ok: false, error: 'El nicho debe tener entre 1 y 80 caracteres.' };
    }
    valor.nicho = texto;
  }

  const subnichos = datos['subnichos'];
  if (subnichos !== undefined) {
    if (!Array.isArray(subnichos) || subnichos.length > LIMITE_SUBNICHOS) {
      return { ok: false, error: `Podés elegir hasta ${LIMITE_SUBNICHOS} subnichos.` };
    }
    const textos = subnichos.map((s: unknown) => (typeof s === 'string' ? limpiarTexto(s) : null));
    if (textos.some((t) => t === null || t.length > 60)) {
      return { ok: false, error: 'Cada subnicho puede tener hasta 60 caracteres.' };
    }
    valor.subnichos = [...new Set(textos.filter((t): t is string => t !== null && t.length > 0))];
  }

  const estilos = datos['estilos'];
  if (estilos !== undefined) {
    if (!Array.isArray(estilos) || estilos.length > LIMITE_ESTILOS || !estilos.every(esEstilo)) {
      return { ok: false, error: `Elegí estilos de la lista, hasta ${LIMITE_ESTILOS}.` };
    }
    valor.estilos = [...new Set(estilos.filter(esEstilo))];
  }

  const plataforma = datos['plataforma'];
  if (plataforma !== undefined) {
    if (!esPlataformaPrincipal(plataforma)) {
      return { ok: false, error: 'La red principal debe ser Instagram, TikTok o ambas.' };
    }
    valor.plataforma = plataforma;
  }

  if (Object.keys(valor).length === 0) return { ok: false, error: 'No hay cambios para guardar.' };
  return { ok: true, valor };
};

export const validarProspecto = (
  body: unknown,
):
  | { ok: true; valor: Omit<Prospecto, 'id' | 'estado' | 'creadoEn' | 'actualizadoEn'> }
  | { ok: false; error: string } => {
  const datos = (body ?? {}) as Record<string, unknown>;
  const handleRaw = typeof datos['handle'] === 'string' ? datos['handle'].replace(/\u0000/g, '').trim() : '';
  const handle = handleRaw.startsWith('@') ? handleRaw : `@${handleRaw}`;
  if (!/^@[A-Za-z0-9._]{2,60}$/.test(handle)) {
    return { ok: false, error: 'El usuario debe tener entre 2 y 60 caracteres (letras, números, punto o guion bajo).' };
  }
  const plataforma = datos['plataforma'] ?? 'instagram';
  if (plataforma !== 'instagram' && plataforma !== 'tiktok' && plataforma !== 'otra') {
    return { ok: false, error: 'Plataforma no válida.' };
  }
  const tipo = datos['tipo'] ?? 'creador';
  if (tipo !== 'marca' && tipo !== 'creador' && tipo !== 'medio' && tipo !== 'otro') {
    return { ok: false, error: 'Tipo de prospecto no válido.' };
  }
  const nicho = typeof datos['nicho'] === 'string' ? datos['nicho'].replace(/\u0000/g, '').trim() : '';
  if (nicho.length > 80) return { ok: false, error: 'El nicho no puede superar 80 caracteres.' };
  const seguidoresRaw = datos['seguidores'];
  let seguidores: number | null = null;
  if (seguidoresRaw !== undefined && seguidoresRaw !== null && seguidoresRaw !== '') {
    const n = Number(seguidoresRaw);
    if (!Number.isInteger(n) || n < 0 || n > 1_000_000_000) return { ok: false, error: 'Seguidores no válidos.' };
    seguidores = n;
  }
  const notas = typeof datos['notas'] === 'string' ? datos['notas'].replace(/\u0000/g, '').trim() : '';
  if (notas.length > 500) return { ok: false, error: 'Las notas no pueden superar 500 caracteres.' };
  return { ok: true, valor: { handle, plataforma, tipo, nicho, seguidores, notas } };
};

export const errorDeTransicion = (actual: EstadoProspecto, nuevo: EstadoProspecto): string | null => {
  if (actual === nuevo) return 'El prospecto ya está en ese estado.';
  if (!SIGUIENTES[actual].includes(nuevo)) {
    return `No se puede pasar de ${ESTADOS_PROSPECTO[actual].label} a ${ESTADOS_PROSPECTO[nuevo].label}.`;
  }
  return null;
};

export const resumenPipeline = (prospectos: Prospecto[]): Record<EstadoProspecto, number> => {
  const conteo: Record<EstadoProspecto, number> = {
    idea: 0,
    contactado: 0,
    negociando: 0,
    confirmado: 0,
    completado: 0,
    descartado: 0,
  };
  for (const p of prospectos) conteo[p.estado] += 1;
  return conteo;
};
