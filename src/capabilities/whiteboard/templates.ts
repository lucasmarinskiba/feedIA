/**
 * Whiteboard Templates — lienzos pre-armados
 * ─────────────────────────────────────────────────────────────────────────
 * Plantillas que cargan una estructura de elementos lista para editar:
 * embudo, calendario editorial, mapa de pilares, customer journey, etc.
 */

import type { WbElement } from './store.js';

export interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  build: () => WbElement[];
}

let _t = 0;
const nid = (p: string): string => `${p}-${++_t}`;
const note = (x: number, y: number, t: string, color = '#fce38a'): WbElement => ({
  id: nid('n'),
  type: 'note',
  x,
  y,
  w: 180,
  h: 90,
  text: t,
  color,
});
const txt = (x: number, y: number, t: string, color = '#ffffff'): WbElement => ({
  id: nid('t'),
  type: 'text',
  x,
  y,
  w: 280,
  h: 30,
  text: t,
  color,
});
const conn = (from: string, to: string): WbElement => ({ id: nid('c'), type: 'connector', from, to, color: '#9be7b4' });

const TEMPLATES: BoardTemplate[] = [
  {
    id: 'pillars',
    name: 'Mapa de pilares de contenido',
    description: '3 pilares con sub-temas conectados — base de tu estrategia editorial.',
    build: (): WbElement[] => {
      const center = txt(360, 40, 'PILARES DE CONTENIDO', '#ffe08a');
      const p1 = note(80, 160, 'Pilar 1: Educar (cómo-hacer)');
      const p2 = note(360, 160, 'Pilar 2: Inspirar (casos reales)');
      const p3 = note(640, 160, 'Pilar 3: Vender (oferta/CTA)');
      return [
        center,
        p1,
        p2,
        p3,
        conn(center.id, p1.id),
        conn(center.id, p2.id),
        conn(center.id, p3.id),
        note(80, 300, 'Sub: tutoriales, frameworks', '#9be7b4'),
        note(360, 300, 'Sub: behind-the-scenes', '#9be7b4'),
        note(640, 300, 'Sub: testimonios, demos', '#9be7b4'),
      ];
    },
  },
  {
    id: 'editorial',
    name: 'Calendario editorial semanal',
    description: 'Una nota por día con el formato sugerido — completá y FeedIA lo agenda.',
    build: (): WbElement[] => {
      const days = [
        'Lun · Reel',
        'Mar · Carrusel',
        'Mié · Historia',
        'Jue · Reel',
        'Vie · Carrusel',
        'Sáb · Post',
        'Dom · Descanso',
      ];
      return [
        txt(40, 30, 'CALENDARIO EDITORIAL — SEMANA', '#ffe08a'),
        ...days.map((d, i) => note(40 + (i % 4) * 220, 90 + Math.floor(i / 4) * 130, d)),
      ];
    },
  },
  {
    id: 'funnel',
    name: 'Embudo de conversión',
    description: 'Awareness → Consideración → Conversión, con la acción de cada etapa.',
    build: (): WbElement[] => {
      const a = note(320, 60, 'AWARENESS: contenido que detiene el scroll', '#9bd3ff');
      const b = note(320, 200, 'CONSIDERACIÓN: caso real / framework', '#fce38a');
      const c = note(320, 340, 'CONVERSIÓN: oferta + CTA + DM', '#ff9bb3');
      return [txt(320, 20, 'EMBUDO', '#ffe08a'), a, b, c, conn(a.id, b.id), conn(b.id, c.id)];
    },
  },
  {
    id: 'journey',
    name: 'Customer Journey',
    description: 'El recorrido del seguidor desde que te descubre hasta que compra.',
    build: (): WbElement[] => [
      txt(40, 30, 'CUSTOMER JOURNEY', '#ffe08a'),
      {
        id: nid('tl'),
        type: 'timeline',
        x: 40,
        y: 110,
        w: 640,
        h: 60,
        text: 'Recorrido',
        color: '#ffffff',
        milestones: [
          { label: 'Descubre' },
          { label: 'Sigue' },
          { label: 'Confía' },
          { label: 'Consulta' },
          { label: 'Compra' },
        ],
      },
      note(40, 200, '¿Qué siente en cada etapa? Anotá fricciones'),
      note(280, 200, '¿Qué contenido necesita en cada etapa?', '#9be7b4'),
    ],
  },
  {
    id: 'brainstorm',
    name: 'Lluvia de ideas libre',
    description: 'Lienzo con un disparador central — soltá todas las ideas alrededor.',
    build: (): WbElement[] => {
      const c = txt(380, 240, '💡 IDEA CENTRAL', '#ffe08a');
      return [
        c,
        note(120, 80, 'Idea A'),
        note(640, 80, 'Idea B'),
        note(120, 400, 'Idea C'),
        note(640, 400, 'Idea D'),
        conn(c.id, c.id),
      ];
    },
  },
  {
    id: 'launch',
    name: 'Playbook de lanzamiento',
    description: 'Pre-lanzamiento → Lanzamiento → Post. Listo para que FeedIA lo ejecute.',
    build: (): WbElement[] => {
      const a = note(60, 120, 'PRE: 5 días de teasers + lista de espera', '#9bd3ff');
      const b = note(320, 120, 'LANZAMIENTO: reel + carrusel + stories con CTA', '#fce38a');
      const cc = note(580, 120, 'POST: testimonios + recordatorio + cierre', '#ff9bb3');
      return [
        txt(60, 70, 'PLAYBOOK DE LANZAMIENTO', '#ffe08a'),
        a,
        b,
        cc,
        conn(a.id, b.id),
        conn(b.id, cc.id),
        note(60, 280, 'Indicación: "Subí 1 teaser por día esta semana"', '#9be7b4'),
      ];
    },
  },
  {
    id: 'growth-30',
    name: 'Plan de crecimiento 30 días',
    description: 'Objetivo + cadencia + pilares para crecer un mes completo.',
    build: (): WbElement[] => [
      txt(40, 30, 'CRECIMIENTO — 30 DÍAS', '#ffe08a'),
      note(40, 90, 'Objetivo: +X seguidores reales del nicho'),
      note(260, 90, 'Cadencia: 1 carrusel/día + 3 reels/sem', '#9bd3ff'),
      note(480, 90, 'Responder TODOS los DMs y comentarios', '#ff9bb3'),
      {
        id: nid('tl'),
        type: 'timeline',
        x: 40,
        y: 230,
        w: 640,
        h: 60,
        text: 'Hitos',
        color: '#ffffff',
        milestones: [
          { label: 'Semana 1' },
          { label: 'Semana 2' },
          { label: 'Auditoría' },
          { label: 'Semana 4' },
          { label: 'Balance' },
        ],
      },
    ],
  },
  {
    id: 'reactivation',
    name: 'Reactivar audiencia dormida',
    description: 'Secuencia para volver a enganchar seguidores inactivos.',
    build: (): WbElement[] => {
      const a = note(80, 120, 'Detectar dormidos (sin interacción 30d)', '#9bd3ff');
      const b = note(360, 120, 'Contenido "te extrañamos" + encuesta stories', '#fce38a');
      const cc = note(640, 120, 'DM cálido a los que reaccionen', '#9be7b4');
      return [txt(80, 70, 'REACTIVACIÓN', '#ffe08a'), a, b, cc, conn(a.id, b.id), conn(b.id, cc.id)];
    },
  },
  {
    id: 'always-on',
    name: 'Operación siempre activa',
    description: 'Las directivas base para que FeedIA gestione todo solo.',
    build: (): WbElement[] => [
      txt(40, 30, 'OPERACIÓN SIEMPRE ACTIVA', '#ffe08a'),
      note(40, 90, 'Subí 1 carrusel por día', '#fce38a'),
      note(260, 90, 'Subí 3 reels por semana', '#fce38a'),
      note(480, 90, 'Respondé todos los mensajes', '#ff9bb3'),
      note(40, 220, 'Respondé todos los comentarios en 1h', '#ff9bb3'),
      note(260, 220, 'Auditá KPIs cada semana', '#9bd3ff'),
      note(480, 220, 'Detectá tendencias del nicho a diario', '#9be7b4'),
    ],
  },
];

export const listBoardTemplates = (): Array<Pick<BoardTemplate, 'id' | 'name' | 'description'>> =>
  TEMPLATES.map(({ id: tid, name, description }) => ({ id: tid, name, description }));

export const buildBoardTemplate = (tid: string): WbElement[] | null => {
  const t = TEMPLATES.find((x) => x.id === tid);
  if (!t) return null;
  _t = 0;
  return t.build();
};
