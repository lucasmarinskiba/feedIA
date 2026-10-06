import { describe, it, expect } from 'vitest';
import {
  buscarRespuestaAprobada,
  prepararRespuestas,
  similitud,
  triajarMensaje,
  validarRespuestaAprobada,
  MAX_RESPUESTA,
  type EntradaConocimiento,
} from '../capabilities/executive/respuestasTriaje.js';
import { respaldoRespuestas } from '../capabilities/executive/respuestasRespaldo.js';

const base: EntradaConocimiento = {
  id: 'kb-1',
  pregunta: '¿Cuánto cuesta la consulta?',
  respuesta: 'La consulta inicial cuesta $10.000 y la podés reservar por DM.',
  creadaEn: '2026-10-01T00:00:00.000Z',
};

describe('triajarMensaje', () => {
  it('escala cuando el mensaje habla de salud, legal, dinero o datos', () => {
    const t = triajarMensaje('Me duele mucho después del tratamiento, ¿qué hago?', 'comentario');
    expect(t.accion).toBe('escalar');
    expect(t.riesgos).toContain('salud');
  });

  it('escala un pedido de reembolso aunque tenga intención de queja', () => {
    const t = triajarMensaje('Quiero que me devuelvan la plata, esto es pésimo', 'dm');
    expect(t.accion).toBe('escalar');
    expect(t.riesgos).toContain('reembolso');
  });

  it('marca spam y lo oculta en comentarios o lo ignora en DM', () => {
    const texto = 'Gana dinero desde tu casa, haz clic ahora';
    expect(triajarMensaje(texto, 'comentario')).toMatchObject({ intencion: 'spam', accion: 'ocultar' });
    expect(triajarMensaje(texto, 'dm')).toMatchObject({ intencion: 'spam', accion: 'ignorar' });
  });

  it('detecta un lead con puntaje alto por intención de compra', () => {
    const t = triajarMensaje('Hola, quiero saber cuánto cuesta reservar un turno hoy?', 'dm');
    expect(t.intencion).toBe('lead');
    expect(t.leadScore).toBeGreaterThanOrEqual(60);
    expect(t.accion).toBe('responder');
  });

  it('una queja no suma puntaje de lead', () => {
    expect(triajarMensaje('Es malo, nunca llegó mi pedido', 'comentario')).toMatchObject({
      intencion: 'queja',
      leadScore: 0,
    });
  });

  it('una pregunta sin otra señal queda como pregunta', () => {
    expect(triajarMensaje('¿Dónde están ubicados?', 'comentario').intencion).toBe('pregunta');
  });

  it('un elogio queda como elogio', () => {
    expect(triajarMensaje('¡Gracias, excelente trabajo!', 'comentario').intencion).toBe('elogio');
  });

  it('la intención elegida a mano pisa la detectada', () => {
    expect(prepararRespuestas('Gracias por todo', 'dm', 'lead', []).triaje.intencion).toBe('lead');
  });
});

describe('coincidencia con respuestas aprobadas', () => {
  it('encuentra la respuesta aprobada para una pregunta parecida', () => {
    expect(buscarRespuestaAprobada('cuanto cuesta la consulta por favor', [base])?.id).toBe('kb-1');
  });

  it('no devuelve nada si el mensaje no se parece', () => {
    expect(buscarRespuestaAprobada('hacen envíos a Córdoba?', [base])).toBeNull();
  });

  it('la similitud ignora palabras vacías', () => {
    expect(similitud('de la que', 'el que de')).toBe(0);
  });
});

describe('validarRespuestaAprobada', () => {
  it('rechaza textos vacíos o demasiado largos', () => {
    expect(validarRespuestaAprobada('', 'algo').ok).toBe(false);
    expect(validarRespuestaAprobada('algo', '').ok).toBe(false);
    expect(validarRespuestaAprobada('algo', 'x'.repeat(MAX_RESPUESTA + 1)).ok).toBe(false);
  });

  it('acepta un par válido y quita bytes nulos', () => {
    expect(validarRespuestaAprobada('precio\u0000', 'Respuesta')).toEqual({
      ok: true,
      valor: { pregunta: 'precio', respuesta: 'Respuesta' },
    });
  });
});

describe('respaldoRespuestas', () => {
  it('ante un riesgo no sugiere una respuesta de venta y pide una persona', () => {
    const prep = prepararRespuestas('Me duele después del tratamiento', 'dm', 'auto', []);
    const r = respaldoRespuestas(prep, 'dm');
    const sugerida = r.secciones.find((s) => s.titulo === 'Respuesta sugerida');
    expect(sugerida?.contenido).toMatch(/persona de nuestro equipo/);
    expect(r.notas.join(' ')).toMatch(/No prometas/);
  });

  it('para spam en comentario indica no responder', () => {
    const prep = prepararRespuestas('Gana dinero desde tu casa', 'comentario', 'auto', []);
    const sugerida = respaldoRespuestas(prep, 'comentario').secciones.find((s) => s.titulo === 'Respuesta sugerida');
    expect(sugerida?.contenido).toMatch(/No respondas/);
  });

  it('usa la respuesta aprobada cuando la pregunta coincide', () => {
    const prep = prepararRespuestas('¿Cuánto cuesta la consulta?', 'comentario', 'auto', [base]);
    const r = respaldoRespuestas(prep, 'comentario');
    expect(r.secciones.find((s) => s.titulo === 'Respuesta sugerida')?.contenido).toBe(base.respuesta);
    expect(r.notas.join(' ')).toMatch(/respuesta que ya aprobaste/);
  });

  it('una plantilla de lead invita a seguir por DM', () => {
    const prep = prepararRespuestas('Quiero contratar, ¿cuánto sale?', 'comentario', 'auto', []);
    const sugerida = respaldoRespuestas(prep, 'comentario').secciones.find((s) => s.titulo === 'Respuesta sugerida');
    expect(sugerida?.contenido).toMatch(/DM/);
  });
});
