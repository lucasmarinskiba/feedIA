/**
 * Bitácora: formato, filtros, agrupación por día y exportación de las acciones registradas.
 * Función pura: no toca red ni disco.
 */

export type CategoriaBitacora = 'decision' | 'cuentas' | 'okr' | 'autopilot' | 'auditoria' | 'ia' | 'experimento';

export interface EventoBitacora {
  id: string;
  cuando: string;
  categoria: CategoriaBitacora;
  titulo: string;
  detalle: string;
  actor: string;
  resultado: string | null;
}

export const CATEGORIAS_BITACORA: Record<CategoriaBitacora, { label: string; emoji: string; descripcion: string }> = {
  decision: {
    label: 'Decisiones',
    emoji: '✋',
    descripcion: 'Aprobaciones y rechazos sobre lo que propusieron tus agentes.',
  },
  cuentas: { label: 'Cuentas', emoji: '🔌', descripcion: 'Cuentas de Instagram y TikTok conectadas o desconectadas.' },
  okr: { label: 'OKR', emoji: '🏁', descripcion: 'Objetivos creados o actualizados con sus resultados clave.' },
  autopilot: {
    label: 'Autopilot',
    emoji: '🤖',
    descripcion: 'Corridas de los autopilots de Instagram y TikTok y sus señales.',
  },
  auditoria: { label: 'Auditoría', emoji: '🩺', descripcion: 'Auditorías semanales y su puntaje general.' },
  ia: { label: 'Herramientas IA', emoji: '🧰', descripcion: 'Herramientas IA que generaron un resultado para vos.' },
  experimento: {
    label: 'Experimentos',
    emoji: '🧪',
    descripcion: 'Experimentos A/B creados, iniciados, cerrados o descartados, con su veredicto.',
  },
};

const MAX_LIMITE = 500;

export const filtrarEventos = (
  eventos: EventoBitacora[],
  filtros: { categoria?: CategoriaBitacora | null; texto?: string | null },
): EventoBitacora[] => {
  const q = (filtros.texto ?? '').trim().toLowerCase();
  return eventos.filter((e) => {
    if (filtros.categoria && e.categoria !== filtros.categoria) return false;
    if (!q) return true;
    return `${e.titulo} ${e.detalle} ${e.actor} ${e.resultado ?? ''}`.toLowerCase().includes(q);
  });
};

export const ordenarRecientes = (eventos: EventoBitacora[]): EventoBitacora[] =>
  [...eventos].sort((a, b) => (Date.parse(b.cuando) || 0) - (Date.parse(a.cuando) || 0));

export const diaLocal = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'sin fecha';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dia}`;
};

export const agruparPorDia = (eventos: EventoBitacora[]): Array<{ dia: string; eventos: EventoBitacora[] }> => {
  const grupos = new Map<string, EventoBitacora[]>();
  for (const e of ordenarRecientes(eventos)) {
    const dia = diaLocal(e.cuando);
    grupos.set(dia, [...(grupos.get(dia) ?? []), e]);
  }
  return [...grupos.entries()].map(([dia, lista]) => ({ dia, eventos: lista }));
};

export const contarPorCategoria = (eventos: EventoBitacora[]): Record<CategoriaBitacora, number> => {
  const conteo: Record<CategoriaBitacora, number> = {
    decision: 0,
    cuentas: 0,
    okr: 0,
    autopilot: 0,
    auditoria: 0,
    ia: 0,
    experimento: 0,
  };
  for (const e of eventos) conteo[e.categoria] += 1;
  return conteo;
};

export const limitarEventos = (limite: number): number => Math.min(MAX_LIMITE, Math.max(1, Math.floor(limite) || 1));

const celdaCsv = (valor: string): string => {
  const limpio = valor.replace(/\r?\n/g, ' ');
  return /[",;]/.test(limpio) ? `"${limpio.replace(/"/g, '""')}"` : limpio;
};

export const aCsv = (eventos: EventoBitacora[]): string => {
  const cabecera = ['cuando', 'categoria', 'titulo', 'detalle', 'actor', 'resultado'];
  const filas = ordenarRecientes(eventos).map((e) =>
    [e.cuando, CATEGORIAS_BITACORA[e.categoria].label, e.titulo, e.detalle, e.actor, e.resultado ?? '']
      .map(celdaCsv)
      .join(','),
  );
  return [cabecera.join(','), ...filas].join('\n');
};
