import { describe, it, expect } from 'vitest';
import type { AccionCreacion, Destino } from '../capabilities/executive/herramientasCatalogo.js';
import {
  aplicarCreacion,
  estadoDePieza,
  type DepsAplicar,
  type NuevaPublicacion,
} from '../capabilities/executive/herramientasAplicar.js';
import type { CreacionGuardada } from '../capabilities/executive/herramientasCreaciones.js';
import type { PiezaCreacion } from '../capabilities/executive/herramientasPlanificacion.js';

const AHORA = Date.UTC(2026, 9, 5, 12, 0, 0);
const FUTURO = new Date(AHORA + 2 * 86_400_000).toISOString();
const OPCIONES = { accountId: 'cuenta-1', conexiones: { instagram: true, tiktok: true }, ahora: AHORA };

const pieza = (parcial: Partial<PiezaCreacion> = {}): PiezaCreacion => ({
  titulo: 'Pieza',
  formato: 'reel',
  plataforma: 'instagram',
  caption: 'Un caption normal',
  hashtags: ['#marca'],
  scheduledAt: FUTURO,
  ...parcial,
});

const creacion = (accion: AccionCreacion): CreacionGuardada => ({
  id: 'cre-1',
  herramientaId: 'plan',
  nombre: 'Plan semanal',
  creadaEn: new Date(AHORA).toISOString(),
  valores: {},
  fuente: 'reglas',
  resultado: { titulo: 'Plan', secciones: [{ titulo: 'Calendario', tipo: 'lista', contenido: ['uno'] }], notas: [] },
  accion,
  aplicaciones: [],
});

const depsFalsos = () => {
  const insertadas: NuevaPublicacion[] = [];
  const movidas: Array<{ id: string; iso: string }> = [];
  const llamadas: string[] = [];
  const deps: DepsAplicar = {
    insertarPublicacion: async (p) => {
      insertadas.push(p);
      return { id: `pub-${insertadas.length}` };
    },
    moverPublicacion: async (id, iso) => {
      movidas.push({ id, iso });
      return id !== 'inexistente';
    },
    crearProyecto: async (body) => {
      llamadas.push(`proyecto:${String(body['nombre'])}`);
      return { id: 'pro-1' };
    },
    crearObjetivo: async (body) => {
      llamadas.push(`objetivo:${String(body['titulo'])}`);
      return { id: 'obj-1' };
    },
    crearExperimento: async (body) => {
      llamadas.push(`experimento:${String(body['hipotesis'])}`);
      return { id: 'exp-1' };
    },
    registrarBitacora: async (titulo) => {
      llamadas.push(`bitacora:${titulo}`);
    },
  };
  return { deps, insertadas, movidas, llamadas };
};

const herramienta = (destinos: Destino[]) => ({ destinos });

describe('estadoDePieza: cuándo algo queda programado y cuándo en borrador', () => {
  it('programa una pieza con fecha futura en una red conectada', () => {
    expect(estadoDePieza(pieza(), OPCIONES)).toEqual({ status: 'scheduled', motivo: null });
  });

  it('nunca programa una pieza sin texto, aunque tenga fecha y red conectada', () => {
    expect(estadoDePieza(pieza({ caption: '   ' }), OPCIONES)).toMatchObject({ status: 'draft', motivo: 'sin texto' });
  });

  it('deja en borrador lo que no tiene fecha', () => {
    expect(estadoDePieza(pieza({ scheduledAt: null }), OPCIONES).status).toBe('draft');
  });

  it('deja en borrador lo que tiene una fecha que ya pasó', () => {
    const pasada = new Date(AHORA - 60_000).toISOString();
    expect(estadoDePieza(pieza({ scheduledAt: pasada }), OPCIONES)).toMatchObject({
      status: 'draft',
      motivo: 'la fecha ya pasó',
    });
  });

  it('deja en borrador lo que va a una red sin conectar', () => {
    const sinTiktok = { ...OPCIONES, conexiones: { instagram: true, tiktok: false } };
    expect(estadoDePieza(pieza({ plataforma: 'tiktok' }), sinTiktok)).toMatchObject({ status: 'draft' });
  });

  it('deja en borrador un texto con riesgo alto de seguridad, aunque la fecha sea válida', () => {
    const riesgo = pieza({ caption: 'Sorteo: comparte para ganar un premio' });
    expect(estadoDePieza(riesgo, OPCIONES)).toMatchObject({
      status: 'draft',
      motivo: 'el texto tiene riesgo alto de seguridad',
    });
  });
});

describe('aplicarCreacion · piezas al calendario', () => {
  it('guarda cada pieza y cuenta programadas y borradores', async () => {
    const { deps, insertadas } = depsFalsos();
    const piezas = [pieza(), pieza({ scheduledAt: null }), pieza({ plataforma: 'tiktok', scheduledAt: FUTURO })];
    const r = await aplicarCreacion(
      creacion({ tipo: 'piezas', piezas }),
      'calendario',
      herramienta(['calendario']),
      deps,
      OPCIONES,
    );
    expect('aplicacion' in r && r.aplicacion.resumen).toBe('3 pieza(s): 2 programada(s) y 1 en borrador');
    expect(insertadas.map((p) => p.status)).toEqual(['scheduled', 'draft', 'scheduled']);
    expect(insertadas[0]?.caption).toBe('Un caption normal\n\n#marca');
    expect(insertadas[0]?.metadata).toMatchObject({ platform: 'instagram', origenCreacion: 'cre-1' });
  });

  it('no aplica si el destino no está entre los de la herramienta', async () => {
    const { deps } = depsFalsos();
    const r = await aplicarCreacion(
      creacion({ tipo: 'piezas', piezas: [pieza()] }),
      'proyecto',
      herramienta(['calendario']),
      deps,
      OPCIONES,
    );
    expect(r).toEqual({ error: 'Esta herramienta no se envía a proyecto.' });
  });

  it('no aplica una lista de piezas vacía', async () => {
    const { deps } = depsFalsos();
    const r = await aplicarCreacion(
      creacion({ tipo: 'piezas', piezas: [] }),
      'calendario',
      herramienta(['calendario']),
      deps,
      OPCIONES,
    );
    expect(r).toEqual({ error: 'No hay piezas para programar.' });
  });
});

describe('aplicarCreacion · movimientos de calendario', () => {
  it('reubica las piezas indicadas y omite las que ya no existen', async () => {
    const { deps, movidas } = depsFalsos();
    const accion: AccionCreacion = {
      tipo: 'movimientos',
      modo: 'reprogramar',
      calendarioDisponible: true,
      movimientos: [
        { postId: 'p1', plataforma: 'instagram', caption: 'a', actual: null, propuesto: FUTURO, motivo: 'x' },
        { postId: 'inexistente', plataforma: 'instagram', caption: 'b', actual: null, propuesto: FUTURO, motivo: 'x' },
      ],
    };
    const r = await aplicarCreacion(creacion(accion), 'calendario', herramienta(['calendario']), deps, OPCIONES);
    expect(movidas.map((m) => m.id)).toEqual(['p1', 'inexistente']);
    expect('aplicacion' in r && r.aplicacion.resumen).toBe('1 de 2 pieza(s) reubicada(s)');
  });

  it('avisa si el calendario no está disponible en el servidor', async () => {
    const { deps } = depsFalsos();
    const accion: AccionCreacion = {
      tipo: 'movimientos',
      modo: 'optimizar',
      calendarioDisponible: false,
      movimientos: [],
    };
    const r = await aplicarCreacion(creacion(accion), 'calendario', herramienta(['calendario']), deps, OPCIONES);
    expect(r).toEqual({ error: 'El calendario no está disponible en este servidor.' });
  });
});

describe('aplicarCreacion · proyectos, OKR, experimentos y bitácora', () => {
  it('crea el proyecto con su nombre y tareas', async () => {
    const { deps, llamadas } = depsFalsos();
    const accion: AccionCreacion = {
      tipo: 'proyecto',
      nombre: 'Campaña de otoño',
      objetivo: 'Lanzar el curso',
      plataforma: 'ambas',
      tareas: ['Definir mensaje'],
      inicio: '2026-10-05',
      fin: '2026-11-02',
    };
    const r = await aplicarCreacion(creacion(accion), 'proyecto', herramienta(['proyecto']), deps, OPCIONES);
    expect(llamadas).toEqual(['proyecto:Campaña de otoño']);
    expect('aplicacion' in r && r.aplicacion.referencias).toEqual(['pro-1']);
  });

  it('muestra el error del objetivo cuando la validación lo rechaza', async () => {
    const { deps } = depsFalsos();
    deps.crearObjetivo = async () => ({ error: 'La meta no es alcanzable en el periodo.' });
    const accion: AccionCreacion = {
      tipo: 'objetivo',
      titulo: 'Crecer',
      porque: 'Porque sí',
      categoria: 'growth',
      periodo: 'month',
      keyResults: [],
    };
    const r = await aplicarCreacion(creacion(accion), 'objetivo', herramienta(['objetivo']), deps, OPCIONES);
    expect(r).toEqual({ error: 'La meta no es alcanzable en el periodo.' });
  });

  it('registra el experimento con su hipótesis', async () => {
    const { deps, llamadas } = depsFalsos();
    const accion: AccionCreacion = {
      tipo: 'experimento',
      hipotesis: 'Un hook con pregunta sube los guardados',
      variable: 'hook',
      metrica: 'guardados',
      umbralMejora: 10,
      duracionDias: 7,
      nombreA: 'A',
      nombreB: 'B',
    };
    const r = await aplicarCreacion(creacion(accion), 'experimento', herramienta(['experimento']), deps, OPCIONES);
    expect(llamadas[0]).toBe('experimento:Un hook con pregunta sube los guardados');
    expect('aplicacion' in r && r.aplicacion.referencias).toEqual(['exp-1']);
  });

  it('registra en la bitácora el título y el resumen del resultado', async () => {
    const { deps, llamadas } = depsFalsos();
    const r = await aplicarCreacion(
      creacion({ tipo: 'ninguna' }),
      'bitacora',
      herramienta(['bitacora']),
      deps,
      OPCIONES,
    );
    expect(llamadas).toEqual(['bitacora:Plan']);
    expect('aplicacion' in r && r.aplicacion.resumen).toBe('Registrado en la bitácora');
  });

  it('no envía una creación a un destino que no corresponde a su acción', async () => {
    const { deps } = depsFalsos();
    const r = await aplicarCreacion(
      creacion({ tipo: 'ninguna' }),
      'calendario',
      herramienta(['calendario']),
      deps,
      OPCIONES,
    );
    expect(r).toEqual({ error: 'Esta creación no tiene nada que enviar a ese destino.' });
  });
});
