import { describe, it, expect } from 'vitest';
import {
  diagnosticoProgramacion,
  efectoArrastre,
  franjaDeHora,
  mejoresFranjas,
  mensajesJunta,
  resumenDecisiones,
  serieSemanal,
  type PostJunta,
  type ProgramadoJunta,
} from '../capabilities/executive/juntaMetricas.js';
import { progresoProyecto, validarProyecto, type Proyecto } from '../capabilities/executive/proyectosEjecutivo.js';

const AHORA = Date.UTC(2026, 9, 5, 12, 0, 0);
const H = 3_600_000;

const post = (
  plataforma: 'instagram' | 'tiktok',
  minutos: number,
  tasa: number | null,
  formato = 'reel',
  hora = 19,
): PostJunta => ({
  plataforma,
  publicadoEn: new Date(AHORA - minutos * 60_000).toISOString(),
  formato,
  tasa,
  horaLocal: hora,
});

describe('franjaDeHora', () => {
  it('clasifica la hora en franjas', () => {
    expect(franjaDeHora(3)).toBe('madrugada');
    expect(franjaDeHora(9)).toBe('mañana');
    expect(franjaDeHora(13)).toBe('mediodía');
    expect(franjaDeHora(17)).toBe('tarde');
    expect(franjaDeHora(22)).toBe('noche');
  });
});

describe('efectoArrastre', () => {
  it('mide si rinde más lo que sigue a un post fuerte dentro de 24 h', () => {
    const posts: PostJunta[] = [
      post('instagram', 60 * 30, 0.02),
      post('instagram', 60 * 29, 0.09),
      post('instagram', 60 * 20, 0.08),
      post('instagram', 60 * 200, 0.01),
      post('instagram', 60 * 500, 0.012),
      post('instagram', 60 * 800, 0.011),
      post('instagram', 60 * 1200, 0.013),
    ];
    const r = efectoArrastre(posts);
    expect(r.conArrastre.n).toBeGreaterThan(0);
    expect(r.sinArrastre.n).toBeGreaterThan(0);
    expect(r.lectura).toMatch(/.+/);
  });

  it('sin posts devuelve lectura de falta de datos', () => {
    const r = efectoArrastre([]);
    expect(r.diferenciaPct).toBeNull();
    expect(r.lectura).toMatch(/Sin datos/);
  });

  it('no mezcla plataformas al encadenar posts', () => {
    const posts: PostJunta[] = [post('instagram', 100, 0.09), post('tiktok', 90, 0.01)];
    expect(efectoArrastre(posts).conArrastre.n).toBe(0);
  });
});

describe('mejoresFranjas', () => {
  it('ordena las franjas por mediana de tasa y exige al menos 2 posts', () => {
    const posts = [
      post('instagram', 10, 0.05, 'reel', 19),
      post('instagram', 20, 0.06, 'reel', 20),
      post('instagram', 30, 0.01, 'imagen', 9),
      post('instagram', 40, 0.02, 'imagen', 10),
      post('instagram', 50, 0.2, 'reel', 3),
    ];
    const r = mejoresFranjas(posts);
    expect(r[0]?.franja).toBe('noche');
    expect(r.find((f) => f.franja === 'madrugada')).toBeUndefined();
  });
});

describe('diagnosticoProgramacion', () => {
  const programado = (
    dias: number,
    formato: string,
    status: ProgramadoJunta['status'] = 'scheduled',
  ): ProgramadoJunta => ({
    plataforma: 'instagram',
    formato,
    scheduledAt: new Date(AHORA + dias * 24 * H).toISOString(),
    status,
  });

  it('cuenta agenda, vencidos y fallidos', () => {
    const programados: ProgramadoJunta[] = [
      programado(1, 'reel'),
      programado(3, 'carrusel'),
      { ...programado(-3, 'imagen'), status: 'scheduled' },
      { ...programado(-2, 'reel', 'failed') },
    ];
    const d = diagnosticoProgramacion(programados, [], AHORA);
    expect(d.proximos14Dias).toBe(2);
    expect(d.vencidos).toBe(1);
    expect(d.fallidosUltimos14Dias).toBe(1);
  });

  it('calcula la disciplina sobre publicaciones cerradas de 30 días', () => {
    const programados: ProgramadoJunta[] = [
      { ...programado(-1, 'reel', 'published') },
      { ...programado(-2, 'reel', 'published') },
      { ...programado(-3, 'reel', 'failed') },
    ];
    expect(diagnosticoProgramacion(programados, [], AHORA).disciplinaPct).toBe(67);
  });

  it('recomienda sumar el formato que más rinde si está poco en la agenda', () => {
    const historial = [
      post('instagram', 10, 0.09, 'reel'),
      post('instagram', 20, 0.08, 'reel'),
      post('instagram', 30, 0.01, 'imagen'),
      post('instagram', 40, 0.012, 'imagen'),
    ];
    const programados = [
      programado(1, 'imagen'),
      programado(2, 'imagen'),
      programado(3, 'imagen'),
      programado(4, 'reel'),
    ];
    const reel = diagnosticoProgramacion(programados, historial, AHORA).porFormato.find((f) => f.formato === 'reel');
    expect(reel?.recomendacion).toMatch(/reel/);
  });

  it('agenda vacía no da recomendaciones de formato', () => {
    const d = diagnosticoProgramacion([], [], AHORA);
    expect(d.proximos14Dias).toBe(0);
    expect(d.porFormato.every((f) => f.recomendacion === null)).toBe(true);
  });
});

describe('serieSemanal', () => {
  it('devuelve una fila por semana con la mediana de cada plataforma', () => {
    const serie = serieSemanal(
      [post('instagram', 60, 0.04), post('instagram', 120, 0.06), post('tiktok', 60, 0.02)],
      4,
      AHORA,
    );
    expect(serie).toHaveLength(4);
    const ultima = serie[serie.length - 1];
    expect(ultima?.instagram.posts).toBe(2);
    expect(ultima?.tiktok.posts).toBe(1);
    expect(ultima?.instagram.medianaTasa).toBeCloseTo(0.05, 6);
  });
});

describe('resumenDecisiones y mensajes', () => {
  it('calcula tasa de aprobación sobre decididas', () => {
    const r = resumenDecisiones(
      {
        pending: 3,
        approved: 6,
        rejected: 2,
        avgResolutionMinutes: 0,
        byUrgency: { critical: 1, high: 2 },
        bySourceResolution: {},
      },
      [],
      AHORA,
    );
    expect(r.tasaAprobacionPct).toBe(75);
    expect(r.criticas).toBe(1);
  });

  it('agrupa las lecturas por área y titula según urgencia', () => {
    const msgs = mensajesJunta({
      decisiones: [{ tono: 'alerta', texto: 'x' }],
      programacion: [{ tono: 'atencion', texto: 'y' }],
    });
    expect(msgs.tono).toBe('alerta');
    expect(msgs.titular).toBe('1 asunto(s) urgente(s) y 1 para revisar.');
    expect(msgs.grupos.map((g) => g.area)).toEqual(['decisiones', 'programacion']);
  });
});

describe('proyectos', () => {
  it('valida nombre, plataforma y fechas', () => {
    expect(validarProyecto({ nombre: 'ab' }).ok).toBe(false);
    expect(validarProyecto({ nombre: 'Serie tips', plataforma: 'facebook' }).ok).toBe(false);
    expect(validarProyecto({ nombre: 'Serie tips', inicio: '2026-10-10', fin: '2026-10-01' }).ok).toBe(false);
  });

  it('crea tareas sin texto vacío y con límite', () => {
    const r = validarProyecto({ nombre: 'Serie tips', tareas: ['  guion  ', '', 'grabar'] });
    expect(r.ok && r.valor.tareas.map((t) => t.texto)).toEqual(['guion', 'grabar']);
  });

  it('calcula el progreso por tareas hechas', () => {
    const p = {
      id: 'x',
      nombre: 'p',
      plataforma: 'ambas',
      objetivo: '',
      inicio: null,
      fin: null,
      estado: 'en-curso',
      tareas: [
        { id: '1', texto: 'a', hecha: true },
        { id: '2', texto: 'b', hecha: false },
      ],
      creadoEn: '',
      actualizadoEn: '',
    } as Proyecto;
    expect(progresoProyecto(p)).toEqual({ hechas: 1, total: 2, pct: 50 });
  });
});
