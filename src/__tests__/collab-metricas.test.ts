import { describe, it, expect } from 'vitest';
import {
  OPCION_INSTAGRAM,
  OPCIONES_TIKTOK,
  errorDeTransicion,
  opcionesDeRed,
  plantillaOutreach,
  recomendarColabs,
  resumenPipeline,
  siguientesEstados,
  validarPerfilContenido,
  validarProspecto,
  type PerfilColab,
  type Prospecto,
} from '../capabilities/executive/collabMetricas.js';

const perfil = (parcial: Partial<PerfilColab>): PerfilColab => ({
  tipoMarca: 'personal',
  seguidores: null,
  tasaMediana: null,
  nicho: '',
  subnichos: [],
  estilos: [],
  plataforma: 'instagram',
  ...parcial,
});

describe('validarProspecto', () => {
  it('normaliza el usuario y aplica valores por defecto', () => {
    const r = validarProspecto({ handle: 'mi.creador' });
    expect(r).toEqual({
      ok: true,
      valor: {
        handle: '@mi.creador',
        plataforma: 'instagram',
        tipo: 'creador',
        nicho: '',
        seguidores: null,
        notas: '',
      },
    });
  });

  it('rechaza usuarios con caracteres inválidos o muy cortos', () => {
    expect(validarProspecto({ handle: 'a' }).ok).toBe(false);
    expect(validarProspecto({ handle: '@con espacios' }).ok).toBe(false);
  });

  it('valida plataforma, tipo, seguidores y notas', () => {
    expect(validarProspecto({ handle: '@abc', plataforma: 'facebook' }).ok).toBe(false);
    expect(validarProspecto({ handle: '@abc', tipo: 'influencer' }).ok).toBe(false);
    expect(validarProspecto({ handle: '@abc', seguidores: -5 }).ok).toBe(false);
    expect(validarProspecto({ handle: '@abc', seguidores: '12000' })).toMatchObject({
      ok: true,
      valor: { seguidores: 12000 },
    });
    expect(validarProspecto({ handle: '@abc', notas: 'x'.repeat(501) }).ok).toBe(false);
  });

  it('quita bytes nulos del texto', () => {
    const r = validarProspecto({ handle: '@abc', nicho: 'cocina\u0000' });
    expect(r.ok && r.valor.nicho).toBe('cocina');
  });
});

describe('transiciones de prospecto', () => {
  it('permite el recorrido normal y bloquea saltos', () => {
    expect(errorDeTransicion('idea', 'contactado')).toBeNull();
    expect(errorDeTransicion('idea', 'confirmado')).toMatch(/No se puede pasar/);
    expect(errorDeTransicion('completado', 'idea')).toMatch(/No se puede pasar/);
    expect(errorDeTransicion('negociando', 'negociando')).toMatch(/ya está/);
  });

  it('un prospecto descartado solo puede volver a idea', () => {
    expect(siguientesEstados('descartado')).toEqual(['idea']);
  });
});

describe('recomendarColabs', () => {
  it('para empresa recomienda marcas complementarias primero', () => {
    const recs = recomendarColabs(perfil({ tipoMarca: 'empresa', seguidores: 5000, tasaMediana: 0.03, nicho: 'cafe' }));
    expect(recs[0]?.titulo).toMatch(/Marcas complementarias/);
    expect(recs[0]?.dondeBuscar).toMatch(/cafe/);
  });

  it('para marca personal sugiere creadores de tamaño parecido', () => {
    const recs = recomendarColabs(perfil({ seguidores: 2000, tasaMediana: 0.03, nicho: 'fitness' }));
    expect(recs.some((r) => /tamaño parecido/.test(r.titulo))).toBe(true);
  });

  it('antepone subir interacción cuando la tasa es muy baja', () => {
    const recs = recomendarColabs(perfil({ seguidores: 2000, tasaMediana: 0.004, nicho: 'fitness' }));
    expect(recs[0]?.titulo).toBe('Primero subí la interacción');
  });

  it('sin datos de tasa no agrega esa recomendación', () => {
    const recs = recomendarColabs(perfil({}));
    expect(recs.some((r) => /interacción/.test(r.titulo))).toBe(false);
  });

  it('cada subnicho genera especialistas y el puente desde el nicho amplio', () => {
    const recs = recomendarColabs(
      perfil({ nicho: 'Inteligencia artificial', subnichos: ['Automatización para PyMEs'] }),
    );
    const especialista = recs.find((r) => r.titulo === 'Especialistas en Automatización para PyMEs');
    expect(especialista?.prioridad).toBe(1);
    expect(especialista?.dondeBuscar).toMatch(/Automatización para PyMEs/);
    expect(recs.some((r) => r.titulo === 'Del nicho general a Automatización para PyMEs')).toBe(true);
  });

  it('no arma el puente cuando el subnicho es igual al nicho amplio', () => {
    const recs = recomendarColabs(perfil({ nicho: 'Fitness', subnichos: ['Fitness'] }));
    expect(recs.some((r) => /Del nicho general/.test(r.titulo))).toBe(false);
  });

  it('cada estilo elegido genera una colaboración con su formato', () => {
    const recs = recomendarColabs(perfil({ nicho: 'Inteligencia artificial', estilos: ['humor', 'vlog'] }));
    const humor = recs.find((r) => r.titulo === 'Colaboración: Humor');
    expect(humor?.dondeBuscar).toMatch(/Inteligencia artificial/);
    expect(recs.some((r) => r.titulo === 'Colaboración: Vlog')).toBe(true);
  });

  it('el estilo busca alrededor del subnicho cuando existe', () => {
    const recs = recomendarColabs(perfil({ nicho: 'IA', subnichos: ['Prompts para marketing'], estilos: ['ugc'] }));
    const ugc = recs.find((r) => r.titulo === 'Colaboración: UGC');
    expect(ugc?.dondeBuscar).toMatch(/Prompts para marketing/);
  });

  it('indica la red donde buscar según la red principal', () => {
    const ig = recomendarColabs(perfil({ nicho: 'cafe', plataforma: 'instagram' }))[0];
    const tt = recomendarColabs(perfil({ nicho: 'cafe', plataforma: 'tiktok' }))[0];
    const ambas = recomendarColabs(perfil({ nicho: 'cafe', plataforma: 'ambas' }))[0];
    expect(ig?.dondeBuscar).toMatch(/^En Instagram, buscá/);
    expect(tt?.dondeBuscar).toMatch(/^En TikTok, buscá/);
    expect(ambas?.dondeBuscar).toMatch(/^En Instagram o TikTok, buscá/);
  });

  it('la recomendación de publicación en colaboración cambia según la red', () => {
    const tt = recomendarColabs(perfil({ plataforma: 'tiktok' })).find(
      (r) => r.titulo === 'Publicación en colaboración con otro creador',
    );
    expect(tt?.porQue).toMatch(/TikTok/);
  });

  it('nunca devuelve más de 8 recomendaciones', () => {
    const recs = recomendarColabs(
      perfil({
        tipoMarca: 'empresa',
        seguidores: 500,
        tasaMediana: 0.001,
        nicho: 'IA',
        subnichos: ['A', 'B', 'C', 'D', 'E'],
        estilos: ['humor', 'vlog', 'ugc', 'tutorial', 'retos', 'noticias'],
      }),
    );
    expect(recs.length).toBeLessThanOrEqual(8);
  });
});

describe('plantillaOutreach', () => {
  it('usa la marca, el nicho y el tipo de cuenta', () => {
    const p = plantillaOutreach(perfil({ tipoMarca: 'empresa', nicho: 'cafe' }), 'Paithon');
    expect(p.asunto).toBe('Propuesta de colaboración con Paithon');
    expect(p.cuerpo).toMatch(/cafe/);
    expect(p.cuerpo).toMatch(/lado práctico del tema/);
    expect(p.cuerpo).toMatch(/Paithon/);
  });

  it('prioriza el subnicho y adapta el formato a TikTok', () => {
    const p = plantillaOutreach(
      perfil({ nicho: 'IA', subnichos: ['Automatización'], plataforma: 'tiktok' }),
      'Paithon',
    );
    expect(p.cuerpo).toMatch(/Automatización/);
    expect(p.cuerpo).toMatch(/un video conjunto/);
  });
});

describe('opciones por red', () => {
  it('cada opción tiene un enlace https', () => {
    for (const op of [...OPCIONES_TIKTOK, OPCION_INSTAGRAM]) expect(op.url.startsWith('https://')).toBe(true);
  });

  it('Instagram solo ofrece su opción, TikTok las suyas y ambas juntas', () => {
    expect(opcionesDeRed('instagram')).toEqual([OPCION_INSTAGRAM]);
    expect(opcionesDeRed('tiktok')).toEqual(OPCIONES_TIKTOK);
    expect(opcionesDeRed('ambas')).toHaveLength(OPCIONES_TIKTOK.length + 1);
  });
});

describe('validarPerfilContenido', () => {
  it('acepta un cambio parcial y lo devuelve normalizado', () => {
    const r = validarPerfilContenido({
      nicho: '  Inteligencia   artificial ',
      subnichos: ['IA', ' IA ', 'Prompts'],
      estilos: ['humor', 'humor'],
      plataforma: 'ambas',
    });
    expect(r).toEqual({
      ok: true,
      valor: {
        nicho: 'Inteligencia artificial',
        subnichos: ['IA', 'Prompts'],
        estilos: ['humor'],
        plataforma: 'ambas',
      },
    });
  });

  it('rechaza un cuerpo sin cambios', () => {
    expect(validarPerfilContenido({})).toEqual({ ok: false, error: 'No hay cambios para guardar.' });
    expect(validarPerfilContenido(null).ok).toBe(false);
  });

  it('rechaza tipo, nicho, red y estilos inválidos', () => {
    expect(validarPerfilContenido({ tipoMarca: 'influencer' }).ok).toBe(false);
    expect(validarPerfilContenido({ nicho: '   ' }).ok).toBe(false);
    expect(validarPerfilContenido({ nicho: 'x'.repeat(81) }).ok).toBe(false);
    expect(validarPerfilContenido({ plataforma: 'facebook' }).ok).toBe(false);
    expect(validarPerfilContenido({ estilos: ['constructor'] }).ok).toBe(false);
    expect(
      validarPerfilContenido({ estilos: ['humor', 'vlog', 'ugc', 'tutorial', 'retos', 'noticias', 'historias'] }).ok,
    ).toBe(false);
  });

  it('limita los subnichos a cinco y a sesenta caracteres', () => {
    expect(validarPerfilContenido({ subnichos: ['a', 'b', 'c', 'd', 'e', 'f'] }).ok).toBe(false);
    expect(validarPerfilContenido({ subnichos: ['x'.repeat(61)] }).ok).toBe(false);
    expect(validarPerfilContenido({ subnichos: [42] }).ok).toBe(false);
  });
});

describe('resumenPipeline', () => {
  it('cuenta prospectos por estado', () => {
    const base = {
      handle: '@a',
      plataforma: 'instagram',
      tipo: 'creador',
      nicho: '',
      seguidores: null,
      notas: '',
      creadoEn: '',
      actualizadoEn: '',
    } as const;
    const lista: Prospecto[] = [
      { ...base, id: '1', estado: 'idea' },
      { ...base, id: '2', estado: 'idea' },
      { ...base, id: '3', estado: 'confirmado' },
    ];
    const r = resumenPipeline(lista);
    expect(r.idea).toBe(2);
    expect(r.confirmado).toBe(1);
    expect(r.descartado).toBe(0);
  });
});
