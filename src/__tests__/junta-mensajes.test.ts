import { describe, it, expect } from 'vitest';
import {
  analizarProyecto,
  lecturasEstrategias,
  lecturasNumeros,
  lecturasProyectos,
  mensajesJunta,
  resumenProyectos,
} from '../capabilities/executive/juntaMetricas.js';

const DIA = 86_400_000;
const AHORA = Date.UTC(2026, 9, 10, 12, 0, 0);

describe('mensajesJunta', () => {
  it('ordena cada área por urgencia y limita a cuatro mensajes', () => {
    const msgs = mensajesJunta({
      programacion: [
        { tono: 'bien', texto: 'b' },
        { tono: 'atencion', texto: 'a1' },
        { tono: 'alerta', texto: 'x1' },
        { tono: 'atencion', texto: 'a2' },
        { tono: 'alerta', texto: 'x2' },
        { tono: 'neutral', texto: 'n' },
      ],
    });
    const grupo = msgs.grupos[0];
    expect(grupo?.mensajes.map((m) => m.texto)).toEqual(['x1', 'x2', 'a1', 'a2']);
  });

  it('muestra un titular en orden cuando no hay nada urgente ni pendiente', () => {
    const msgs = mensajesJunta({ numeros: [{ tono: 'bien', texto: 'ok' }] });
    expect(msgs.tono).toBe('bien');
    expect(msgs.titular).toBe('Todo en orden: no hay nada urgente ni pendiente.');
  });

  it('no incluye áreas sin mensajes', () => {
    const msgs = mensajesJunta({ proyectos: [], estrategias: [{ tono: 'atencion', texto: 'riesgo' }] });
    expect(msgs.grupos.map((g) => g.etiqueta)).toEqual(['Estrategias y objetivos']);
    expect(msgs.titular).toBe('Nada urgente: 1 asunto(s) para revisar.');
  });
});

describe('lecturasProyectos', () => {
  it('avisa de vencidos, atrasados y de un portafolio sin proyectos en curso', () => {
    const vencido = {
      nombre: 'Campaña',
      analisis: analizarProyecto(
        { inicio: '2026-08-01', fin: '2026-09-01', estado: 'en-curso', tareas: [{ texto: 'x', hecha: false }] },
        AHORA,
      ),
    };
    const resumen = resumenProyectos([
      { estado: 'en-curso', tareas: [{ texto: 'x', hecha: false }], analisis: vencido.analisis },
    ]);
    const lecturas = lecturasProyectos([vencido], resumen);
    expect(lecturas[0]).toEqual({
      tono: 'alerta',
      texto: '«Campaña» venció con tareas sin hacer: cerralo o reprogramalo.',
    });
  });

  it('pide crear un proyecto cuando no hay ninguno', () => {
    const lecturas = lecturasProyectos([], resumenProyectos([]));
    expect(lecturas).toEqual([
      { tono: 'neutral', texto: 'No tenés proyectos. Creá una serie o campaña para organizar tareas y fechas.' },
    ]);
  });
});

describe('lecturasEstrategias', () => {
  it('nombra el objetivo atrasado y propone una recomendación', () => {
    const lecturas = lecturasEstrategias([
      {
        titulo: 'Crecer en TikTok',
        estado: 'behind',
        progresoPct: 20,
        progresoEsperadoPct: 50,
        recomendaciones: ['Publicá dos series por semana'],
      },
    ]);
    expect(lecturas.map((l) => l.texto)).toEqual([
      '«Crecer en TikTok» está atrasado: 20 % frente a 50 % esperado.',
      'Para «Crecer en TikTok»: Publicá dos series por semana',
    ]);
  });

  it('confirma cuando todos van en camino', () => {
    const lecturas = lecturasEstrategias([
      { titulo: 'x', estado: 'on-track', progresoPct: 40, progresoEsperadoPct: 40, recomendaciones: [] },
    ]);
    expect(lecturas).toEqual([{ tono: 'bien', texto: 'Todos los objetivos van en camino o adelantados.' }]);
  });
});

describe('lecturasNumeros', () => {
  it('suma el crecimiento de seguidores a las lecturas de plataformas', () => {
    const lecturas = lecturasNumeros([{ tono: 'bien', texto: 'TikTok rinde más.' }], -2);
    expect(lecturas[1]).toEqual({ tono: 'alerta', texto: 'Seguidores: -2 % en el período.' });
  });

  it('no agrega crecimiento cuando no hay dato', () => {
    expect(lecturasNumeros([], null)).toEqual([]);
  });
});
