import { describe, it, expect } from 'vitest';
import {
  OPCIONES_TIKTOK,
  errorDeTransicion,
  plantillaOutreach,
  recomendarColabs,
  resumenPipeline,
  siguientesEstados,
  validarProspecto,
  type Prospecto,
} from '../capabilities/executive/collabMetricas.js';

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
    const recs = recomendarColabs({ tipoMarca: 'empresa', seguidores: 5000, tasaMediana: 0.03, nicho: 'cafe' });
    expect(recs[0]?.titulo).toMatch(/Marcas complementarias/);
    expect(recs[0]?.dondeBuscar).toMatch(/cafe/);
  });

  it('para marca personal sugiere creadores de tamaño parecido', () => {
    const recs = recomendarColabs({ tipoMarca: 'personal', seguidores: 2000, tasaMediana: 0.03, nicho: 'fitness' });
    expect(recs.some((r) => /tamaño parecido/.test(r.titulo))).toBe(true);
  });

  it('antepone subir interacción cuando la tasa es muy baja', () => {
    const recs = recomendarColabs({ tipoMarca: 'personal', seguidores: 2000, tasaMediana: 0.004, nicho: 'fitness' });
    expect(recs[0]?.titulo).toBe('Primero subí la interacción');
  });

  it('sin datos de tasa no agrega esa recomendación', () => {
    const recs = recomendarColabs({ tipoMarca: 'personal', seguidores: null, tasaMediana: null, nicho: '' });
    expect(recs.some((r) => /interacción/.test(r.titulo))).toBe(false);
  });
});

describe('plantillaOutreach', () => {
  it('usa la marca, el nicho y el tipo de cuenta', () => {
    const p = plantillaOutreach(
      { tipoMarca: 'empresa', seguidores: null, tasaMediana: null, nicho: 'cafe' },
      'Paithon',
    );
    expect(p.asunto).toBe('Propuesta de colaboración con Paithon');
    expect(p.cuerpo).toMatch(/cafe/);
    expect(p.cuerpo).toMatch(/lado práctico del tema/);
    expect(p.cuerpo).toMatch(/Paithon/);
  });
});

describe('opciones de TikTok', () => {
  it('cada opción tiene un enlace https', () => {
    for (const op of OPCIONES_TIKTOK) expect(op.url.startsWith('https://')).toBe(true);
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
