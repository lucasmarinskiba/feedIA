/**
 * Command Router — "decile a FeedIA" en una sola frase
 * ─────────────────────────────────────────────────────────────────────────
 * El corazón de la promesa de experiencia: con pocas indicaciones, todo pasa.
 * Toma texto libre desde cualquier pantalla (paleta Ctrl/Cmd+K) y lo enruta
 * a la acción correcta, mapeada a un endpoint existente que la UI dispara en
 * un paso. Determinista (instantáneo, gratis, confiable) — sin esperar al LLM
 * para el ruteo; el trabajo pesado lo hace el endpoint destino.
 */

import type { BrandProfile } from '../../config/types.js';

export type CommandKind = 'fire' | 'navigate';

export interface CommandAction {
  label: string;
  kind: CommandKind;
  /** Para kind='fire': llamada HTTP que la UI ejecuta. */
  method?: 'POST' | 'GET';
  endpoint?: string;
  body?: Record<string, unknown>;
  /** Para kind='navigate': ruta del dashboard. */
  route?: string;
}

export interface CommandRoute {
  intent: string;
  confidence: number; // 0–1
  reply: string; // confirmación humana
  action: CommandAction;
}

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

interface Rule {
  intent: string;
  test: RegExp;
  build: (raw: string, brand: BrandProfile) => { reply: string; action: CommandAction };
}

const RULES: Rule[] = [
  {
    intent: 'publicar-carrusel',
    test: /\b(carrusel|carousel|carrousel)\b/,
    build: (raw) => ({
      reply: 'Le digo a tu equipo de diseño que arme y publique un carrusel branded.',
      action: {
        label: '🎨 Producir y subir carrusel',
        kind: 'fire',
        method: 'POST',
        endpoint: '/api/carousel/run',
        body: { tema: raw, autoPublicar: true },
      },
    }),
  },
  {
    intent: 'responder-comunidad',
    test: /\b(responde|responder|contesta|contestar|atende|atender)\b.*\b(dm|dms|mensaje|mensajes|privad|comentario|comentarios|comunidad)\b/,
    build: (raw) => ({
      reply: 'Despacho una misión para que tu Community Manager atienda DMs y comentarios.',
      action: {
        label: '💬 Atender DMs y comentarios',
        kind: 'fire',
        method: 'POST',
        endpoint: '/api/swarm/mission',
        body: { objetivo: raw },
      },
    }),
  },
  {
    intent: 'mirar-pantalla',
    test: /\b(mira|mirar|ver|observa|observar|mostra|mostrar|pantalla en vivo)\b.*\b(hace|haga|operar|trabaj|pantalla)\b|computer use/,
    build: (raw) => ({
      reply: 'Inicio una sesión observable: vas a ver al sistema operar en vivo.',
      action: {
        label: '🖥️ Mirar al sistema operar',
        kind: 'fire',
        method: 'POST',
        endpoint: '/api/computer/watch',
        body: { instruction: raw },
      },
    }),
  },
  {
    intent: 'reporte-ejecutivo',
    test: /\b(reporte|recap|resumen|inversor|inversores|imperio|estatus|como voy|cómo voy|logros)\b/,
    build: () => ({
      reply: 'Te llevo a tu Sala Ejecutiva con el resumen de tu imperio.',
      action: { label: '👑 Ver Sala Ejecutiva', kind: 'navigate', route: 'imperio' },
    }),
  },
  {
    intent: 'estado-sistema',
    test: /\b(estado|salud|presupuesto|tokens|gasto|inteligencia|aprendizaje|metricas del sistema)\b/,
    build: () => ({
      reply: 'Abro el panel de inteligencia (presupuesto, aprendizaje, caché).',
      action: { label: '🧬 Ver Inteligencia', kind: 'navigate', route: 'inteligencia' },
    }),
  },
  {
    intent: 'ver-equipo',
    test: /\b(equipo|staff|quien|quién|que estan haciendo|qué están haciendo|en vivo)\b/,
    build: () => ({
      reply: 'Te muestro a tu equipo trabajando en vivo.',
      action: { label: '👥 Ver equipo en vivo', kind: 'navigate', route: 'equipo' },
    }),
  },
  {
    intent: 'agendar-directiva',
    test: /\b(todos los dias|todos los días|cada dia|cada día|por dia|por día|por semana|cada semana|siempre|recurrente|automatiza|automatizá)\b/,
    build: (raw) => ({
      reply: 'Lo convierto en una directiva permanente que tu equipo ejecuta solo.',
      action: {
        label: '🔁 Crear directiva recurrente',
        kind: 'fire',
        method: 'POST',
        endpoint: '/api/directives',
        body: { text: raw, source: 'texto' },
      },
    }),
  },
];

/** Fallback: objetivo general → misión autónoma multi-agente. */
const fallback = (raw: string): { reply: string; action: CommandAction } => ({
  reply: 'Lo tomo como un objetivo y despacho una misión autónoma multi-agente.',
  action: {
    label: '🚀 Lanzar misión autónoma',
    kind: 'fire',
    method: 'POST',
    endpoint: '/api/swarm/mission',
    body: { objetivo: raw },
  },
});

export const routeCommand = (brand: BrandProfile, text: string): CommandRoute => {
  const raw = text.trim();
  if (!raw) {
    return {
      intent: 'vacio',
      confidence: 0,
      reply: 'Decime en una frase qué querés que haga tu equipo.',
      action: { label: 'Escribí una indicación', kind: 'navigate', route: 'mission' },
    };
  }
  const t = norm(raw);
  for (const r of RULES) {
    if (r.test.test(t)) {
      const { reply, action } = r.build(raw, brand);
      return { intent: r.intent, confidence: 0.9, reply, action };
    }
  }
  const fb = fallback(raw);
  return { intent: 'objetivo-general', confidence: 0.5, reply: fb.reply, action: fb.action };
};
