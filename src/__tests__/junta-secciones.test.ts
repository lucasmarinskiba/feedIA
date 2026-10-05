import { describe, it, expect } from 'vitest';
import {
  analizarProyecto,
  comparativaPlataformas,
  etiquetasOKR,
  lecturasDecisiones,
  progresoEsperado,
  resumenDecisiones,
  resumenProyectos,
  type PostJunta,
} from '../capabilities/executive/juntaMetricas.js';

const DIA = 86_400_000;
const AHORA = Date.UTC(2026, 9, 10, 12, 0, 0);

const post = (plataforma: 'instagram' | 'tiktok', diasAtras: number, tasa: number | null): PostJunta => ({
  plataforma,
  publicadoEn: new Date(AHORA - diasAtras * DIA).toISOString(),
  formato: 'reel',
  tasa,
  horaLocal: 18,
});

describe('progresoEsperado', () => {
  it('devuelve el porcentaje del período transcurrido, acotado a 0-100', () => {
    expect(progresoEsperado('2026-10-01T00:00:00Z', '2026-10-31T00:00:00Z', AHORA)).toBe(32);
    expect(progresoEsperado('2026-09-01T00:00:00Z', '2026-09-30T00:00:00Z', AHORA)).toBe(100);
    expect(progresoEsperado('2026-11-01T00:00:00Z', '2026-11-30T00:00:00Z', AHORA)).toBe(0);
    expect(progresoEsperado(null, '2026-11-30', AHORA)).toBeNull();
  });
});

describe('analizarProyecto', () => {
  const base = { inicio: '2026-10-01', fin: '2026-10-31', estado: 'en-curso' };

  it('marca como atrasado un proyecto que va muy por debajo del calendario', () => {
    const a = analizarProyecto(
      {
        ...base,
        tareas: [
          { texto: 'Guion', hecha: false },
          { texto: 'Grabar', hecha: false },
          { texto: 'Editar', hecha: false },
        ],
      },
      AHORA,
    );
    expect(a.etiqueta).toBe('Atrasado');
    expect(a.tono).toBe('alerta');
    expect(a.proximaTarea).toBe('Guion');
  });

  it('marca como vencido un proyecto con fecha de fin pasada y tareas pendientes', () => {
    const a = analizarProyecto(
      { inicio: '2026-09-01', fin: '2026-10-01', estado: 'en-curso', tareas: [{ texto: 'Publicar', hecha: false }] },
      AHORA,
    );
    expect(a.etiqueta).toBe('Vencido');
    expect(a.diasRestantes).toBeLessThan(0);
  });

  it('considera al día un proyecto con avance acorde a las fechas', () => {
    const a = analizarProyecto(
      {
        ...base,
        tareas: [
          { texto: 'A', hecha: true },
          { texto: 'B', hecha: false },
          { texto: 'C', hecha: false },
        ],
      },
      AHORA,
    );
    expect(a.etiqueta).toBe('Al día');
    expect(a.progresoRealPct).toBe(33);
  });

  it('no compara con el calendario si el proyecto no tiene fechas completas', () => {
    const a = analizarProyecto({ inicio: null, fin: null, estado: 'planificado', tareas: [] }, AHORA);
    expect(a.etiqueta).toBe('Sin tareas');
  });
});

describe('resumenProyectos', () => {
  it('cuenta vencidos, atrasados y el porcentaje de tareas hechas', () => {
    const lista = [
      {
        estado: 'en-curso',
        tareas: [
          { texto: 'a', hecha: true },
          { texto: 'b', hecha: false },
        ],
        analisis: analizarProyecto({ inicio: '2026-09-01', fin: '2026-10-01', estado: 'en-curso', tareas: [] }, AHORA),
      },
      {
        estado: 'completado',
        tareas: [{ texto: 'c', hecha: true }],
        analisis: analizarProyecto({ inicio: null, fin: null, estado: 'completado', tareas: [] }, AHORA),
      },
    ];
    const r = resumenProyectos(lista);
    expect(r).toMatchObject({ total: 2, enCurso: 1, completados: 1, tareasPct: 67 });
  });
});

describe('resumenDecisiones y lecturas', () => {
  const pendiente = (source: string, horasAtras: number) => ({
    id: `${source}-${horasAtras}`,
    urgency: 'medium',
    source,
    createdAt: new Date(AHORA - horasAtras * 3_600_000).toISOString(),
  });

  it('separa por agente y marca las decisiones que llevan más de 24 h', () => {
    const r = resumenDecisiones(
      {
        pending: 2,
        approved: 4,
        rejected: 1,
        avgResolutionMinutes: 360,
        byUrgency: { critical: 0, high: 0 },
        bySourceResolution: { 'comment-brain': { approved: 4, rejected: 1 } },
      },
      [pendiente('comment-brain', 5), pendiente('comment-brain', 48)],
      AHORA,
    );
    expect(r.esperandoMas24h).toBe(1);
    expect(r.porOrigen[0]).toMatchObject({
      origen: 'comment-brain',
      origenLabel: 'Comment Brain',
      pendientes: 2,
      tasaAprobacionPct: 80,
    });
    const lecturas = lecturasDecisiones(r).map((x) => x.texto);
    expect(lecturas).toContain('1 decisión(es) llevan más de 24 h sin respuesta.');
    expect(lecturas).toContain(
      'Tardás unas 6 h en responder de media: respondé el mismo día para que las propuestas sigan vigentes.',
    );
    expect(lecturas).toContain('Comment Brain acierta: aprobás el 80 % de sus propuestas.');
  });

  it('avisa cuando un agente casi nunca acierta', () => {
    const r = resumenDecisiones(
      {
        pending: 0,
        approved: 1,
        rejected: 4,
        avgResolutionMinutes: 10,
        byUrgency: {},
        bySourceResolution: { 'ad-spend': { approved: 1, rejected: 4 } },
      },
      [],
      AHORA,
    );
    expect(lecturasDecisiones(r).map((x) => x.texto)).toContain(
      'Inversión publicitaria acierta poco: aprobás solo el 20 % de sus propuestas. Revisá sus umbrales.',
    );
  });
});

describe('comparativaPlataformas', () => {
  it('compara los últimos 30 días contra los 30 anteriores y lo explica', () => {
    const posts: PostJunta[] = [
      post('instagram', 5, 0.02),
      post('instagram', 10, 0.02),
      post('instagram', 40, 0.04),
      post('instagram', 45, 0.04),
      post('tiktok', 3, 0.06),
      post('tiktok', 8, 0.06),
      post('tiktok', 50, 0.03),
    ];
    const c = comparativaPlataformas(
      posts,
      {
        instagram: { seguidores: 1000, crecimientoPct: 2 },
        tiktok: { seguidores: 4000, crecimientoPct: 12 },
      },
      AHORA,
    );
    const ig = c.filas.find((f) => f.plataforma === 'instagram');
    const tt = c.filas.find((f) => f.plataforma === 'tiktok');
    expect(ig).toMatchObject({
      publicaciones30d: 2,
      publicacionesPrev30d: 2,
      tasaMediana30d: 0.02,
      variacionTasaPct: -50,
    });
    expect(tt).toMatchObject({
      publicaciones30d: 2,
      publicacionesPrev30d: 1,
      tasaMediana30d: 0.06,
      variacionTasaPct: 100,
    });
    expect(c.lecturas.map((x) => x.texto)).toContain(
      'TikTok rinde 200 % más que Instagram en tasa de interacción por publicación.',
    );
    expect(c.lecturas.map((x) => x.texto)).toContain('La tasa de Instagram bajó 50 % frente a los 30 días anteriores.');
    expect(c.lecturas.map((x) => x.texto)).toContain('TikTok crece 10 puntos más que Instagram en seguidores.');
  });

  it('marca una plataforma que dejó de publicar', () => {
    const c = comparativaPlataformas(
      [post('instagram', 2, 0.02)],
      { instagram: { seguidores: null, crecimientoPct: null }, tiktok: { seguidores: null, crecimientoPct: null } },
      AHORA,
    );
    expect(c.lecturas.map((x) => x.texto)).toContain('TikTok no publicó en los últimos 30 días.');
  });
});

describe('etiquetasOKR', () => {
  it('traduce fuentes, tendencias y estados, y deja pasar los desconocidos', () => {
    expect(etiquetasOKR.fuente('seguidores-instagram')).toBe('Seguidores de Instagram (automático)');
    expect(etiquetasOKR.tendencia('stalled')).toBe('Estancado');
    expect(etiquetasOKR.estado('at-risk')).toBe('En riesgo');
    expect(etiquetasOKR.periodo('quarter')).toBe('Trimestre');
    expect(etiquetasOKR.fuente('otra-cosa')).toBe('otra-cosa');
  });
});
