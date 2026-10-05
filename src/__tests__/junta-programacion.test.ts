import { describe, it, expect } from 'vitest';
import {
  asignacionSugerida,
  capacidadPlan,
  efectoArrastre,
  franjasPorPlataforma,
  mejoresDias,
  resumenProgramacion,
  type DiagnosticoProgramacion,
  type PostJunta,
  type ProgramadoJunta,
} from '../capabilities/executive/juntaMetricas.js';

const DIA = 86_400_000;
const AHORA = Date.UTC(2026, 9, 10, 12, 0, 0);

const post = (
  plataforma: 'instagram' | 'tiktok',
  minutos: number,
  tasa: number | null,
  formato = 'reel',
  hora = 17,
): PostJunta => ({
  plataforma,
  publicadoEn: new Date(AHORA - minutos * 60_000).toISOString(),
  formato,
  tasa,
  horaLocal: hora,
});

const diagnostico = (parcial: Partial<DiagnosticoProgramacion>): DiagnosticoProgramacion => ({
  proximos14Dias: 0,
  vencidos: 0,
  fallidosUltimos14Dias: 0,
  disciplinaPct: null,
  porDia: [],
  porFormato: [],
  ...parcial,
});

const sinFranjas = { instagram: [], tiktok: [] };

describe('capacidadPlan', () => {
  it('usa el mes calendario en plan gratuito y marca el ritmo por formato', () => {
    const cap = capacidadPlan(
      {
        plan: 'free',
        precioUsd: 0,
        cicloInicio: null,
        cicloFin: null,
        limites: { carrusel: 3, historia: 2, video: 0 },
        usados: { carrusel: 2, historia: 0, video: 0 },
      },
      AHORA,
    );
    const carrusel = cap.cupos.find((c) => c.formato === 'carrusel');
    const video = cap.cupos.find((c) => c.formato === 'video');
    expect(cap.diasRestantes).toBe(22);
    expect(carrusel).toMatchObject({ limite: 3, usados: 2, restantes: 1, pctUsado: 67, ritmoDiario: 0.21 });
    expect(carrusel?.diasParaAgotar).toBe(5);
    expect(video?.diasParaAgotar).toBeNull();
  });

  it('marca el cupo agotado con cero días para agotar', () => {
    const cap = capacidadPlan(
      {
        plan: 'starter',
        precioUsd: 19,
        cicloInicio: new Date(AHORA - 10 * DIA),
        cicloFin: new Date(AHORA + 20 * DIA),
        limites: { carrusel: 3, historia: 2, video: 2 },
        usados: { carrusel: 3, historia: 0, video: 0 },
      },
      AHORA,
    );
    const carrusel = cap.cupos.find((c) => c.formato === 'carrusel');
    expect(carrusel).toMatchObject({ restantes: 0, diasParaAgotar: 0 });
    expect(cap.diasRestantes).toBe(20);
  });
});

describe('asignacionSugerida', () => {
  it('reparte el cupo de la ventana, prioriza por tasa y cuenta lo ya programado', () => {
    const cap = capacidadPlan(
      {
        plan: 'starter',
        precioUsd: 19,
        cicloInicio: new Date(AHORA - 10 * DIA),
        cicloFin: new Date(AHORA + 20 * DIA),
        limites: { carrusel: 12, historia: 6, video: 2 },
        usados: { carrusel: 2, historia: 0, video: 1 },
      },
      AHORA,
    );
    const historial: PostJunta[] = [
      post('instagram', 100, 0.02, 'carrusel'),
      post('instagram', 200, 0.02, 'carrusel'),
      post('instagram', 300, 0.02, 'carrusel'),
      post('instagram', 400, 0.05, 'reel'),
      post('instagram', 500, 0.05, 'reel'),
      post('instagram', 600, 0.05, 'reel'),
    ];
    const programados: ProgramadoJunta[] = [
      {
        plataforma: 'instagram',
        formato: 'reel',
        scheduledAt: new Date(AHORA + 2 * DIA).toISOString(),
        status: 'scheduled',
      },
      {
        plataforma: 'instagram',
        formato: 'reel',
        scheduledAt: new Date(AHORA + 3 * DIA).toISOString(),
        status: 'scheduled',
      },
      {
        plataforma: 'instagram',
        formato: 'carrusel',
        scheduledAt: new Date(AHORA + 3 * DIA).toISOString(),
        status: 'scheduled',
      },
      {
        plataforma: 'instagram',
        formato: 'reel',
        scheduledAt: new Date(AHORA + 4 * DIA).toISOString(),
        status: 'failed',
      },
    ];
    const asignacion = asignacionSugerida(cap, programados, historial, AHORA);
    const fila = (f: string) => asignacion.filas.find((x) => x.formato === f);
    expect(fila('carrusel')).toMatchObject({ sugerido: 7, programados: 1, prioridad: 2 });
    expect(fila('historia')).toMatchObject({ sugerido: 4, tasaHistorica: null, prioridad: 3 });
    expect(fila('video')).toMatchObject({ sugerido: 1, programados: 2, tasaHistorica: 0.05, prioridad: 1 });
    expect(asignacion.totalSugerido).toBe(12);
    expect(asignacion.totalProgramado).toBe(3);
  });

  it('no sugiere piezas en formatos sin cupo en el plan', () => {
    const cap = capacidadPlan(
      {
        plan: 'free',
        precioUsd: 0,
        cicloInicio: null,
        cicloFin: null,
        limites: { carrusel: 3, historia: 2, video: 0 },
        usados: { carrusel: 0, historia: 0, video: 0 },
      },
      AHORA,
    );
    const video = asignacionSugerida(cap, [], [], AHORA).filas.find((f) => f.formato === 'video');
    expect(video).toMatchObject({ sugerido: 0, sinCupo: true, prioridad: null });
  });
});

describe('resumenProgramacion', () => {
  it('pone primero las publicaciones vencidas y las marca como alerta', () => {
    const resumen = resumenProgramacion({
      disponible: true,
      diagnostico: diagnostico({ vencidos: 2, proximos14Dias: 4 }),
      capacidad: null,
      asignacion: null,
      arrastre: efectoArrastre([]),
      franjas: sinFranjas,
    });
    expect(resumen.tono).toBe('alerta');
    expect(resumen.titular).toBe('Hay publicaciones con problemas que atender');
    expect(resumen.acciones[0]?.texto).toContain('Reprogramá 2 publicación');
  });

  it('avisa cuando la agenda está por debajo de lo que permite el plan', () => {
    const resumen = resumenProgramacion({
      disponible: true,
      diagnostico: diagnostico({ proximos14Dias: 0 }),
      capacidad: null,
      asignacion: {
        ventanaDias: 14,
        totalSugerido: 5,
        totalProgramado: 0,
        filas: [],
      },
      arrastre: efectoArrastre([]),
      franjas: sinFranjas,
    });
    expect(resumen.tono).toBe('atencion');
    expect(resumen.acciones[0]?.texto).toBe(
      'No hay piezas programadas para los próximos 14 días. Tu plan permite hasta 5.',
    );
  });

  it('queda en verde cuando no hay nada que atender', () => {
    const resumen = resumenProgramacion({
      disponible: true,
      diagnostico: diagnostico({ proximos14Dias: 5 }),
      capacidad: null,
      asignacion: null,
      arrastre: efectoArrastre([]),
      franjas: sinFranjas,
    });
    expect(resumen).toEqual({ tono: 'bien', titular: 'Tu programación está al día', acciones: [] });
  });
});

describe('mejoresDias', () => {
  it('ordena los días de la semana por tasa mediana en hora de Buenos Aires', () => {
    const lunes = (h: number, tasa: number): PostJunta => ({
      plataforma: 'instagram',
      publicadoEn: new Date(Date.UTC(2026, 9, 5, h)).toISOString(),
      formato: 'reel',
      tasa,
      horaLocal: 9,
    });
    const martes = (h: number, tasa: number): PostJunta => ({
      ...lunes(h, tasa),
      publicadoEn: new Date(Date.UTC(2026, 9, 6, h)).toISOString(),
    });
    const dias = mejoresDias([lunes(15, 0.05), lunes(16, 0.06), martes(15, 0.02), martes(16, 0.01)]);
    expect(dias[0]).toMatchObject({ dia: 'lunes', posts: 2, medianaTasa: 0.055 });
    expect(dias[1]).toMatchObject({ dia: 'martes', posts: 2 });
  });
});

describe('franjasPorPlataforma', () => {
  it('no mezcla las franjas de Instagram y TikTok', () => {
    const franjas = franjasPorPlataforma([
      post('instagram', 100, 0.05, 'reel', 17),
      post('instagram', 200, 0.04, 'reel', 17),
      post('tiktok', 300, 0.03, 'video', 8),
      post('tiktok', 400, 0.02, 'video', 8),
    ]);
    expect(franjas.instagram.map((f) => f.franja)).toEqual(['tarde']);
    expect(franjas.tiktok.map((f) => f.franja)).toEqual(['mañana']);
  });
});

describe('efectoArrastre · mejorSeguidor', () => {
  it('identifica el formato que rinde después de un post fuerte', () => {
    const posts = [
      post('instagram', 3000, 0.1, 'reel'),
      post('instagram', 2990, 0.09, 'carrusel'),
      post('instagram', 1500, 0.1, 'reel'),
      post('instagram', 1490, 0.09, 'carrusel'),
      post('instagram', 300, 0.1, 'reel'),
      post('instagram', 290, 0.09, 'carrusel'),
    ];
    const arrastre = efectoArrastre(posts);
    expect(arrastre.mejorSeguidor).toMatchObject({ formato: 'carrusel', n: 3, medianaTasa: 0.09 });
  });
});
