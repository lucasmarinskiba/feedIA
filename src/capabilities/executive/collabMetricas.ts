/**
 * Collabs: consejos, tipos de colaboración recomendados según la cuenta (marca personal o empresa),
 * opciones de colaboración de TikTok y pipeline de prospectos. Función pura: no toca red ni disco.
 */

export type TipoMarca = 'personal' | 'empresa';
export type EstadoProspecto = 'idea' | 'contactado' | 'negociando' | 'confirmado' | 'completado' | 'descartado';
export type TipoProspecto = 'marca' | 'creador' | 'medio' | 'otro';
export type PlataformaProspecto = 'instagram' | 'tiktok' | 'otra';

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
}

export interface Recomendacion {
  titulo: string;
  prioridad: 1 | 2 | 3;
  porQue: string;
  dondeBuscar: string;
}

export interface OpcionTikTok {
  id: string;
  nombre: string;
  descripcion: string;
  paso: string;
  url: string;
}

export const OPCIONES_TIKTOK: OpcionTikTok[] = [
  {
    id: 'creator-marketplace',
    nombre: 'Campañas pagas con marcas (TikTok One · Creator Marketplace)',
    descripcion:
      'Marcas que buscan creadores para campañas pagas. Se postula desde la cuenta de creador. Los requisitos de elegibilidad cambian: confirmalos en la plataforma antes de postularte.',
    paso: 'Abrí TikTok One, revisá tu elegibilidad y postulate a las campañas que coincidan con tu nicho.',
    url: 'https://creatormarketplace.tiktok.com/',
  },
  {
    id: 'collab-publicacion',
    nombre: 'Publicación en colaboración',
    descripcion:
      'Un mismo video aparece en tu perfil y en el del otro creador. Sirve para crecer con audiencia ajena sin pagar.',
    paso: 'Al publicar, tocá Más opciones → Invitar colaborador, elegí al creador y enviá la invitación antes de publicar.',
    url: 'https://www.tiktok.com/',
  },
];

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

export const plantillaOutreach = (perfil: PerfilColab, marca: string): { asunto: string; cuerpo: string } => ({
  asunto: PLANTILLA_OUTREACH.asunto.replace('{marca}', marca),
  cuerpo: PLANTILLA_OUTREACH.cuerpo
    .replace('{nicho}', perfil.nicho || 'tu sector')
    .replace('{presentacion}', PRESENTACION[perfil.tipoMarca].replace('{marca}', marca))
    .replace('{formato}', 'reel'),
});

export const recomendarColabs = (perfil: PerfilColab): Recomendacion[] => {
  const recs: Recomendacion[] = [];
  const seguidores = perfil.seguidores ?? 0;
  const tamanio = seguidores < 1000 ? 'pequeña' : seguidores < 10000 ? 'mediana' : 'grande';

  if (perfil.tipoMarca === 'empresa') {
    recs.push({
      titulo: 'Marcas complementarias de tu nicho',
      prioridad: 1,
      porQue:
        'Una empresa gana más con marcas que venden a la misma persona sin competir: cada una presta audiencia a la otra.',
      dondeBuscar: `Marcas de ${perfil.nicho || 'tu sector'} que vendan un producto complementario (no sustituto).`,
    });
    recs.push({
      titulo: 'Creadores micro del nicho con audiencia activa',
      prioridad: seguidores < 10000 ? 1 : 2,
      porQue:
        'Los creadores de 1 mil a 50 mil seguidores suelen tener comunidades que responden y cobran menos que los grandes.',
      dondeBuscar: 'Creadores con comentarios reales en sus últimos posts y una audiencia de tu mismo país o idioma.',
    });
    recs.push({
      titulo: 'Medios y newsletters del sector',
      prioridad: seguidores >= 10000 ? 2 : 3,
      porQue: 'Aportan credibilidad y tráfico calificado. Suelen pedir contenido exclusivo o una nota a cambio.',
      dondeBuscar: `Newsletters o cuentas de noticias de ${perfil.nicho || 'tu sector'} con lectores activos.`,
    });
  } else {
    recs.push({
      titulo: 'Creadores de tu nicho con tamaño parecido',
      prioridad: 1,
      porQue: 'Con una audiencia parecida a la tuya, el intercambio es justo y ambos ganan alcance sin pagar.',
      dondeBuscar: `Creadores de ${perfil.nicho || 'tu nicho'} con entre la mitad y el doble de tus seguidores.`,
    });
    recs.push({
      titulo: 'Publicación en colaboración con otro creador',
      prioridad: 2,
      porQue: 'Es la forma más directa de crecer en TikTok e Instagram sin depender de marcas.',
      dondeBuscar: 'Creadores que ya publicaron contenido parecido al tuyo y tengan una propuesta de formato.',
    });
    recs.push({
      titulo: 'Marcas afines que buscan tu tipo de audiencia',
      prioridad: seguidores >= 10000 ? 1 : 3,
      porQue:
        'Las marcas pagan por audiencia cuyo perfil coincide con su cliente. Con números claros tenés más chances.',
      dondeBuscar: 'Marcas de tu nicho con campañas de creadores activas (revisá sus publicaciones patrocinadas).',
    });
  }

  if (perfil.tasaMediana !== null && perfil.tasaMediana < 0.01) {
    recs.unshift({
      titulo: 'Primero subí la interacción',
      prioridad: 1,
      porQue: 'Tu tasa de interacción está baja. Los otros perfiles van a mirar tus números antes de aceptar.',
      dondeBuscar: 'Revisá Análisis posts: formato y horario con mejor tasa. Aplicalos antes de pedir colaboraciones.',
    });
  }

  return recs.sort((a, b) => a.prioridad - b.prioridad);
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
