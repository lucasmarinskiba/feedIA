import { describe, it, expect } from 'vitest';
import {
  aplicarSilencios,
  alertasDe,
  silenciadaHasta,
  type Alerta,
  type DatosAlertas,
} from '../capabilities/executive/alertasMetricas.js';

const CUANDO = '2026-10-05T12:00:00.000Z';
const AHORA = Date.parse(CUANDO);

const base = (parcial: Partial<DatosAlertas> = {}): DatosAlertas => ({
  cuentas: [
    {
      plataforma: 'instagram',
      conectado: true,
      error: null,
      seguidoresSemanaPct: null,
      tasaMediana: 3,
      publicaciones30d: 10,
    },
    {
      plataforma: 'tiktok',
      conectado: true,
      error: null,
      seguidoresSemanaPct: null,
      tasaMediana: 4,
      publicaciones30d: 10,
    },
  ],
  decisiones: { pendientesCriticas: 0, pendientesAltas: 0, expiradas7d: 0, primeraPendiente: null },
  okr: { atrasados: 0, enRiesgo: 0, primerAtrasado: null },
  comunidad: { sinResponder: 0, escaladas: 0, leadsSinResponder: 0 },
  produccion: { misionesFallidas7d: 0, carruselesEnRevision: 0 },
  economia: { ahorroUsd: 100, gastosUsd: 10 },
  auditoria: [],
  autopilot: [],
  programacion: { disponible: true, vencidas: 0, fallidas14d: 0, proximos14d: 5 },
  plan: [],
  interaccion: [],
  ...parcial,
});

const porId = (alertas: Alerta[], id: string): Alerta | undefined => alertas.find((a) => a.id === id);

describe('alertas de programación', () => {
  it('avisa de publicaciones vencidas y fallidas con severidad alta', () => {
    const alertas = alertasDe(
      base({ programacion: { disponible: true, vencidas: 2, fallidas14d: 1, proximos14d: 4 } }),
      CUANDO,
    );
    expect(porId(alertas, 'programacion:vencidas')).toMatchObject({ severidad: 'alta', fuente: 'programacion' });
    expect(porId(alertas, 'programacion:fallidas')).toMatchObject({ severidad: 'alta' });
  });

  it('avisa de agenda vacía solo si la agenda está disponible', () => {
    const vacia = alertasDe(
      base({ programacion: { disponible: true, vencidas: 0, fallidas14d: 0, proximos14d: 0 } }),
      CUANDO,
    );
    expect(porId(vacia, 'programacion:agenda-vacia')).toMatchObject({ severidad: 'media' });
    const sinAgenda = alertasDe(
      base({ programacion: { disponible: false, vencidas: 0, fallidas14d: 0, proximos14d: 0 } }),
      CUANDO,
    );
    expect(sinAgenda.filter((a) => a.fuente === 'programacion')).toEqual([]);
  });
});

describe('alertas de plan', () => {
  const cupo = (formato: string, etiqueta: string, limite: number, restantes: number, pctUsado: number) => ({
    formato,
    etiqueta,
    limite,
    restantes,
    pctUsado,
  });

  it('marca el cupo agotado como alta y el casi agotado como media', () => {
    const alertas = alertasDe(
      base({ plan: [cupo('carrusel', 'Carruseles', 3, 0, 100), cupo('historia', 'Historias', 6, 1, 83)] }),
      CUANDO,
    );
    expect(porId(alertas, 'plan:agotado-carrusel')).toMatchObject({
      severidad: 'alta',
      titulo: 'Se agotó tu cupo de carruseles este ciclo',
    });
    expect(porId(alertas, 'plan:casi-agotado-historia')).toMatchObject({
      severidad: 'media',
      titulo: 'Te quedan 1 historias este ciclo',
    });
  });

  it('no alerta sobre formatos que el plan no incluye', () => {
    const alertas = alertasDe(base({ plan: [cupo('video', 'Videos', 0, 0, 0)] }), CUANDO);
    expect(alertas.filter((a) => a.fuente === 'plan')).toEqual([]);
  });
});

describe('caída de interacción', () => {
  it('alerta cuando la tasa cae 15 % o más con publicaciones suficientes', () => {
    const alertas = alertasDe(
      base({ interaccion: [{ plataforma: 'instagram', variacionTasaPct: -20, publicaciones30d: 8 }] }),
      CUANDO,
    );
    expect(porId(alertas, 'cuentas:interaccion-cae-instagram')).toMatchObject({
      severidad: 'media',
      titulo: 'Instagram: la interacción bajó 20 % frente al mes anterior',
      plataforma: 'instagram',
    });
  });

  it('ignora caídas con pocas publicaciones', () => {
    const alertas = alertasDe(
      base({ interaccion: [{ plataforma: 'tiktok', variacionTasaPct: -50, publicaciones30d: 2 }] }),
      CUANDO,
    );
    expect(porId(alertas, 'cuentas:interaccion-cae-tiktok')).toBeUndefined();
  });
});

describe('silencios de alertas', () => {
  const alerta = (id: string): Alerta => ({
    id,
    codigo: id,
    fuente: 'programacion',
    severidad: 'alta',
    titulo: id,
    detalle: '',
    plataforma: null,
    accion: { label: 'x', tipo: 'tab', valor: 'summary' },
    cuando: CUANDO,
  });

  it('oculta la alerta mientras dura el silencio y la devuelve al vencer', () => {
    const silencios = {
      'programacion:vencidas': { silenciadaHasta: silenciadaHasta(24, AHORA) },
      'plan:agotado-video': { silenciadaHasta: silenciadaHasta(-1, AHORA) },
    };
    const { activas, silenciadas } = aplicarSilencios(
      [alerta('programacion:vencidas'), alerta('plan:agotado-video'), alerta('plan:otra')],
      silencios,
      AHORA,
    );
    expect(activas.map((a) => a.id)).toEqual(['plan:agotado-video', 'plan:otra']);
    expect(silenciadas.map((a) => a.id)).toEqual(['programacion:vencidas']);
  });

  it('calcula el vencimiento a partir de la hora de consulta', () => {
    expect(silenciadaHasta(24, AHORA)).toBe('2026-10-06T12:00:00.000Z');
  });
});
