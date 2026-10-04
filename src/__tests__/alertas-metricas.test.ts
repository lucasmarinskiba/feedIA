import { describe, it, expect } from 'vitest';
import { alertasDe, type DatosAlertas } from '../capabilities/executive/alertasMetricas.js';

const CUANDO = '2026-10-04T12:00:00.000Z';

const sana = (): DatosAlertas => ({
  cuentas: [
    {
      plataforma: 'instagram',
      conectado: true,
      error: null,
      seguidoresSemanaPct: 2.5,
      tasaMediana: 6,
      publicaciones30d: 9,
    },
    {
      plataforma: 'tiktok',
      conectado: false,
      error: null,
      seguidoresSemanaPct: null,
      tasaMediana: null,
      publicaciones30d: 0,
    },
  ],
  decisiones: { pendientesCriticas: 0, pendientesAltas: 0, expiradas7d: 0, primeraPendiente: null },
  okr: { atrasados: 0, enRiesgo: 0, primerAtrasado: null },
  comunidad: { sinResponder: 0, escaladas: 0, leadsSinResponder: 0 },
  produccion: { misionesFallidas7d: 0, carruselesEnRevision: 0 },
  economia: { ahorroUsd: 1000, gastosUsd: 100 },
  auditoria: [{ nombre: 'Crecimiento de cuentas', puntaje: 80 }],
  autopilot: [],
});

const codigos = (datos: DatosAlertas) => alertasDe(datos, CUANDO).map((a) => a.codigo);

describe('alertasDe', () => {
  it('no genera alertas cuando la operación está sana (salvo que falte una cuenta)', () => {
    const alertas = alertasDe(sana(), CUANDO);
    expect(alertas.map((a) => a.codigo)).toEqual([]);
  });

  it('avisa cuando no hay ninguna cuenta conectada', () => {
    const d = sana();
    d.cuentas = d.cuentas.map((c) => ({ ...c, conectado: false }));
    expect(codigos(d)).toContain('sin-cuentas');
  });

  it('una conexión vencida es alerta alta y apunta a settings', () => {
    const d = sana();
    d.cuentas[0] = {
      plataforma: 'instagram',
      conectado: false,
      error: 'token_expired',
      seguidoresSemanaPct: null,
      tasaMediana: null,
      publicaciones30d: 0,
    };
    const a = alertasDe(d, CUANDO).find((x) => x.codigo === 'conexion-vencida-instagram');
    expect(a?.severidad).toBe('alta');
    expect(a?.accion).toEqual({ label: 'Revisar cuentas', tipo: 'ruta', valor: 'settings' });
  });

  it('caída de seguidores de 2% o más es alta y el título incluye el porcentaje', () => {
    const d = sana();
    d.cuentas[0] = { ...d.cuentas[0]!, seguidoresSemanaPct: -3.2 };
    const a = alertasDe(d, CUANDO).find((x) => x.codigo === 'seguidores-caen-instagram');
    expect(a?.severidad).toBe('alta');
    expect(a?.titulo).toContain('-3.2%');
  });

  it('interacción baja sólo cuenta con suficientes publicaciones', () => {
    const d = sana();
    d.cuentas[0] = { ...d.cuentas[0]!, tasaMediana: 1.2, publicaciones30d: 3 };
    expect(codigos(d)).not.toContain('interaccion-baja-instagram');
    d.cuentas[0] = { ...d.cuentas[0]!, publicaciones30d: 6 };
    expect(codigos(d)).toContain('interaccion-baja-instagram');
  });

  it('ordena por severidad: crítica antes que alta, media e info', () => {
    const d = sana();
    d.produccion = { misionesFallidas7d: 1, carruselesEnRevision: 9 };
    d.decisiones = { pendientesCriticas: 1, pendientesAltas: 0, expiradas7d: 0, primeraPendiente: 'Publicar campaña' };
    d.comunidad = { sinResponder: 0, escaladas: 2, leadsSinResponder: 0 };
    const severidades = alertasDe(d, CUANDO).map((a) => a.severidad);
    const orden = { critica: 0, alta: 1, media: 2, info: 3 } as const;
    const numeros = severidades.map((s) => orden[s]);
    expect(numeros).toEqual([...numeros].sort((x, y) => x - y));
    expect(severidades[0]).toBe('critica');
  });

  it('un objetivo atrasado es alta y nombra el primero', () => {
    const d = sana();
    d.okr = { atrasados: 2, enRiesgo: 0, primerAtrasado: 'Crecer en reels' };
    const a = alertasDe(d, CUANDO).find((x) => x.codigo === 'atrasado');
    expect(a?.severidad).toBe('alta');
    expect(a?.detalle).toContain('Crecer en reels');
  });

  it('una auditoría con un área crítica genera alerta, con puntaje menor a 40', () => {
    const d = sana();
    d.auditoria = [{ nombre: 'Comunidad y leads', puntaje: 35 }];
    expect(codigos(d)).toContain('area-critica-comunidad-y-leads');
    d.auditoria = [{ nombre: 'Comunidad y leads', puntaje: 40 }];
    expect(codigos(d)).not.toContain('area-critica-comunidad-y-leads');
  });

  it('una señal crítica de autopilot apunta al autopilot de su red', () => {
    const d = sana();
    d.autopilot = [
      { plataforma: 'tiktok', senal: 'views-drop', severidad: 'critical', evidencia: 'Las vistas bajaron 45%' },
    ];
    const a = alertasDe(d, CUANDO).find((x) => x.fuente === 'autopilot');
    expect(a?.severidad).toBe('critica');
    expect(a?.accion).toEqual({ label: 'Ver autopilot', tipo: 'tab', valor: 'ttAutopilot' });
    expect(a?.plataforma).toBe('tiktok');
  });

  it('los ids son estables y no se repiten', () => {
    const d = sana();
    d.okr = { atrasados: 1, enRiesgo: 1, primerAtrasado: 'X' };
    const ids = alertasDe(d, CUANDO).map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(alertasDe(d, CUANDO).map((a) => a.id)).toEqual(ids);
  });
});
