import { describe, it, expect } from 'vitest';
import type { BloqueAnalytics } from '../capabilities/experience/analyticsResumen.js';
import type { Objective } from '../capabilities/executive/executiveOKR.js';
import type { ExecutiveDecision } from '../capabilities/executive/executiveDecisionQueue.js';
import {
  armarLimitaciones,
  armarRecomendaciones,
  armarResumen,
  esPeriodoReporte,
  mapearCuenta,
  mapearDecisiones,
  mapearObjetivos,
  type CuentaReporte,
  type SeccionesReporte,
} from '../capabilities/executive/reporteMetricas.js';

const bloqueIg = (overrides: Partial<BloqueAnalytics> = {}): BloqueAnalytics =>
  ({
    plataforma: 'instagram',
    conectado: true,
    error: undefined,
    cuenta: {
      handle: '@paithon',
      seguidores: 1528,
      crecimiento: {
        week: { available: true, value: 54, pct: 3.7 },
        month: { available: true, value: 212, pct: 16.1 },
        quarter: { available: false },
        halfYear: { available: false },
        year: { available: false },
      },
      metricas: [{ label: 'Alcance 30d', value: 18400, format: 'number' }],
    },
    historial: [],
    posts: {
      analizados: 9,
      ventana30d: {
        publicaciones: 9,
        interacciones: 2140,
        likes: 1820,
        comentarios: 160,
        compartidos: 310,
        guardados: 540,
        alcance: 18400,
      },
      frecuenciaSemanal: 2.1,
      tasaMediana: 6.24,
      mejorFormato: 'reel',
      mejorHora: 19,
      porFormato: [],
      top: [
        {
          id: 't1',
          texto: 'Cómo automatizo mi marketing',
          formato: 'reel',
          url: 'https://www.instagram.com/p/t1/',
          publicadoEn: '2026-10-01T19:00:00Z',
          interacciones: 330,
          tasaInteraccion: 13.04,
          alcance: 12400,
          veredicto: 'destacado',
        },
      ],
    },
    audiencia: { disponible: false, motivo: null, edad: [], genero: [], ciudades: [], paises: [] },
    ...overrides,
  }) as BloqueAnalytics;

const cuentaDesconectada = (plataforma: 'instagram' | 'tiktok', error?: string): CuentaReporte =>
  mapearCuenta(
    bloqueIg({
      plataforma,
      conectado: false,
      error,
      cuenta: { handle: null, seguidores: null, crecimiento: null, metricas: [] },
      posts: {
        ...bloqueIg().posts,
        analizados: 0,
        ventana30d: {
          publicaciones: 0,
          interacciones: 0,
          likes: 0,
          comentarios: 0,
          compartidos: null,
          guardados: null,
          alcance: null,
        },
        tasaMediana: null,
        mejorFormato: null,
        mejorHora: null,
        top: [],
      },
    }),
    'month',
  );

const secciones = (cuentas: CuentaReporte[], extra: Partial<SeccionesReporte> = {}): SeccionesReporte => ({
  cuentas,
  objetivos: { total: 0, enMeta: 0, enRiesgo: 0, atrasados: 0, progresoPromedioPct: null, lista: [] },
  decisiones: {
    pendientes: 0,
    enPeriodo: 0,
    aprobadas: 0,
    rechazadas: 0,
    autoEjecutadas: 0,
    expiradas: 0,
    tasaAprobacionPct: null,
    tiempoResolucionMin: null,
    pendientesPorUrgencia: { critical: 0, high: 0, medium: 0, low: 0 },
    ultimasPendientes: [],
  },
  propuestas: [],
  economia: {
    piezas: 0,
    piezasCarruseles: 0,
    piezasVideos: 0,
    horasAhorradas: 0,
    costoHumanoUsd: 0,
    gastosIaUsd: 0,
    ahorroUsd: 0,
  },
  actividad: {
    acciones24h: 0,
    acciones7d: 0,
    agentesActivos7d: 0,
    misionesFallidas7d: 0,
    carruselesEnRevision: 0,
    piezas: 0,
    comentariosRevisados: 0,
    respuestasPreparadas: 0,
  },
  mira: null,
  ...extra,
});

describe('esPeriodoReporte', () => {
  it('acepta solo los cinco períodos conocidos', () => {
    expect(esPeriodoReporte('week')).toBe(true);
    expect(esPeriodoReporte('halfYear')).toBe(true);
    expect(esPeriodoReporte('constructor')).toBe(false);
    expect(esPeriodoReporte('toString')).toBe(false);
    expect(esPeriodoReporte(undefined)).toBe(false);
  });
});

describe('mapearCuenta', () => {
  it('toma el crecimiento del período pedido y usa "Vistas" en TikTok', () => {
    const ig = mapearCuenta(bloqueIg(), 'month');
    expect(ig.crecimiento).toEqual({ disponible: true, valor: 212, pct: 16.1 });
    expect(ig.alcanceEtiqueta).toBe('Alcance');
    expect(ig.alcance30d).toBe(18400);
    expect(ig.mejorFormato).toBe('reels');
    expect(ig.tasaMediana).toBe(6.2);

    const tt = mapearCuenta(bloqueIg({ plataforma: 'tiktok' }), 'month');
    expect(tt.alcanceEtiqueta).toBe('Vistas');
  });

  it('marca el crecimiento como no disponible cuando el historial no alcanza', () => {
    const q = mapearCuenta(bloqueIg(), 'quarter');
    expect(q.crecimiento).toEqual({ disponible: false, valor: null, pct: null });
  });
});

describe('mapearObjetivos', () => {
  it('cuenta estados y promedia el progreso', () => {
    const objetivos = [
      {
        title: 'A',
        category: 'growth',
        period: 'month',
        overallProgressPct: 80,
        status: 'on-track',
        porque: 'p',
        keyResults: [],
      },
      {
        title: 'B',
        category: 'brand',
        period: 'quarter',
        overallProgressPct: 20,
        status: 'behind',
        porque: 'p',
        keyResults: [],
      },
      {
        title: 'C',
        category: 'revenue',
        period: 'month',
        overallProgressPct: 50,
        status: 'at-risk',
        porque: 'p',
        keyResults: [],
      },
    ] as unknown as Objective[];
    const r = mapearObjetivos(objetivos);
    expect(r.total).toBe(3);
    expect(r.enMeta).toBe(1);
    expect(r.enRiesgo).toBe(1);
    expect(r.atrasados).toBe(1);
    expect(r.progresoPromedioPct).toBe(50);
  });
});

describe('mapearDecisiones', () => {
  it('calcula tasa de aprobación sobre decisiones resueltas y cuenta pendientes por urgencia', () => {
    const pendientes = [
      { title: 'x', source: 'ig-autopilot', urgency: 'high', createdAt: '2026-10-01T00:00:00Z' },
      { title: 'y', source: 'okr-tracker', urgency: 'low', createdAt: '2026-10-02T00:00:00Z' },
    ] as unknown as ExecutiveDecision[];
    const r = mapearDecisiones(
      { total: 10, approved: 3, rejected: 1, autoExecuted: 2, expired: 1, avgResolutionMinutes: 42.4 },
      pendientes,
    );
    expect(r.tasaAprobacionPct).toBe(75);
    expect(r.tiempoResolucionMin).toBe(42);
    expect(r.pendientesPorUrgencia).toEqual({ critical: 0, high: 1, medium: 0, low: 1 });
  });

  it('deja tasa y tiempo en null sin decisiones resueltas', () => {
    const r = mapearDecisiones(
      { total: 0, approved: 0, rejected: 0, autoExecuted: 0, expired: 0, avgResolutionMinutes: 0 },
      [],
    );
    expect(r.tasaAprobacionPct).toBeNull();
    expect(r.tiempoResolucionMin).toBeNull();
  });
});

describe('armarResumen', () => {
  it('avisa cuando ninguna red está conectada', () => {
    const lineas = armarResumen(secciones([cuentaDesconectada('instagram'), cuentaDesconectada('tiktok')]));
    expect(lineas[0]).toContain('Ninguna red está conectada');
  });

  it('describe seguidores, crecimiento y publicaciones de cada red conectada', () => {
    const lineas = armarResumen(secciones([mapearCuenta(bloqueIg(), 'month'), cuentaDesconectada('tiktok')]));
    expect(lineas).toContain('Instagram: 1.528 seguidores, +212 en el período.');
    expect(lineas.some((l) => l.startsWith('Instagram: 9 publicaciones'))).toBe(true);
    expect(lineas.some((l) => l.includes('TikTok'))).toBe(false);
  });
});

describe('armarRecomendaciones', () => {
  it('pide atención cuando los seguidores bajan en el período', () => {
    const caida = mapearCuenta(
      bloqueIg({
        cuenta: {
          handle: '@x',
          seguidores: 900,
          crecimiento: {
            week: { available: true, value: -30, pct: -3 },
            month: { available: true, value: -120, pct: -11 },
            quarter: { available: false },
            halfYear: { available: false },
            year: { available: false },
          },
          metricas: [],
        },
      }),
      'month',
    );
    const reco = armarRecomendaciones(secciones([caida, cuentaDesconectada('tiktok')]));
    expect(reco.some((r) => r.includes('bajaron 120'))).toBe(true);
  });

  it('invita a conectar cuando no hay ninguna red', () => {
    const reco = armarRecomendaciones(secciones([cuentaDesconectada('instagram'), cuentaDesconectada('tiktok')]));
    expect(reco).toEqual(['Conectá Instagram o TikTok para recibir recomendaciones basadas en tus datos reales.']);
  });

  it('dice que no hay alertas cuando hay datos y nada urgente', () => {
    const reco = armarRecomendaciones(
      secciones([
        mapearCuenta(bloqueIg({ posts: { ...bloqueIg().posts, mejorFormato: null, mejorHora: null } }), 'month'),
      ]),
    );
    expect(reco).toEqual(['Sin señales de alerta en los datos disponibles.']);
  });
});

describe('armarLimitaciones', () => {
  it('explica token vencido y red sin conectar, y siempre aclara que la economía es acumulada', () => {
    const notas = armarLimitaciones([cuentaDesconectada('instagram', 'token_expired'), cuentaDesconectada('tiktok')]);
    expect(notas[0]).toContain('La conexión de Instagram venció');
    expect(notas[1]).toContain('TikTok no está conectado');
    expect(notas.some((n) => n.includes('acumulada'))).toBe(true);
  });
});
