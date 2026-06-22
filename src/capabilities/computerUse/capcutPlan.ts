/**
 * CapCut Plan — guion observable para editar un reel/video en CapCut Web
 * ─────────────────────────────────────────────────────────────────────────
 * Misma idea que `canvaPlan.ts` pero para CapCut for Web. CapCut no tiene
 * API pública: el camino real es operar la app por el navegador (Playwright)
 * o el escritorio (Anthropic Computer Use). Acá se arma el guion para que el
 * Teatro en vivo lo reproduzca, y queda listo para correr "de verdad" cuando
 * el operador tenga el runtime.
 */

import type { ComputerPlan, ComputerAction } from './planner.js';

export interface CapCutBeat {
  /** Texto del subtítulo / on-screen text para esta toma. */
  texto: string;
  /** Duración aproximada en segundos (para narrar el pacing). */
  segundos?: number;
  /** B-roll/transición sugerida (sólo narrativa, no se ejecuta). */
  notaVisual?: string;
}

const PACING = {
  navigate: 1400,
  click: 650,
  type: 1200,
  scroll: 500,
  hover: 300,
  press: 250,
  wait: 800,
  'double-click': 800,
} as const;

let _seq = 0;
const step = (
  gesture: ComputerAction['gesture'],
  targetId: string,
  targetLabel: string,
  selectors: string[],
  humanAction: string,
  extra: Partial<ComputerAction> = {},
): ComputerAction => ({
  step: ++_seq,
  gesture,
  targetId,
  targetLabel,
  selectors,
  humanAction,
  pacingMs: PACING[gesture],
  ...extra,
});

/**
 * Arma el guion para editar un reel en CapCut Web a partir de un beat-sheet.
 *
 * @param beats   guion del video (texto + duración)
 * @param opts.titulo nombre del proyecto
 * @param opts.relacion aspecto: '9:16' (default reel) | '1:1' | '16:9'
 * @param opts.autoExportar incluye los pasos de exportar 1080p
 */
export const planCapCutVideo = (
  beats: CapCutBeat[],
  opts: { titulo?: string; relacion?: '9:16' | '1:1' | '16:9'; autoExportar?: boolean } = {},
): ComputerPlan => {
  _seq = 0;
  const titulo = (opts.titulo ?? 'Reel FeedIA').slice(0, 80);
  const relacion = opts.relacion ?? '9:16';
  const safeBeats = beats.slice(0, 12);
  const acts: ComputerAction[] = [];

  acts.push(
    step('navigate', 'browser', 'Navegador', [], 'Abrir el navegador y entrar a CapCut Web', {
      url: 'https://www.capcut.com/editor',
    }),
  );
  acts.push(
    step(
      'click',
      'capcut-new',
      'Botón "Nuevo proyecto"',
      ['button:has-text("Nuevo proyecto")', 'a[href*="/new"]'],
      'Crear un nuevo proyecto',
    ),
  );
  acts.push(
    step(
      'click',
      'capcut-aspect',
      `Aspecto ${relacion}`,
      ['button[aria-label*="aspecto"]', 'select[name="aspect"]'],
      `Setear aspecto del proyecto a ${relacion}`,
    ),
  );
  acts.push(
    step('click', 'capcut-title', 'Nombre del proyecto', ['[data-testid="project-name"]'], 'Renombrar el proyecto'),
  );
  acts.push(step('type', 'capcut-title-input', 'Input nombre', [], `Tipear título: "${titulo}"`, { text: titulo }));

  safeBeats.forEach((b, i) => {
    const idx = i + 1;
    acts.push(
      step(
        'click',
        `capcut-track-add-${idx}`,
        `Track · agregar clip ${idx}`,
        ['button[aria-label*="agregar clip"]', '[data-testid="add-clip"]'],
        `Agregar clip ${idx} a la línea de tiempo`,
      ),
    );
    acts.push(
      step(
        'click',
        `capcut-stock-${idx}`,
        `Stock / B-roll para clip ${idx}`,
        ['[data-testid="stock-library"]'],
        `Elegir b-roll: ${b.notaVisual ?? 'genérico'}`,
      ),
    );
    acts.push(
      step(
        'click',
        `capcut-text-${idx}`,
        `Botón "Texto" clip ${idx}`,
        ['button[aria-label*="Texto"]'],
        `Agregar texto sobre clip ${idx}`,
      ),
    );
    acts.push(
      step('type', `capcut-text-input-${idx}`, `Input texto clip ${idx}`, [], `Tipear: "${b.texto}"`, {
        text: b.texto,
      }),
    );
    if (b.segundos && b.segundos > 0) {
      acts.push(
        step(
          'click',
          `capcut-trim-${idx}`,
          `Trim clip ${idx}`,
          ['[data-testid="clip-trim"]'],
          `Ajustar duración a ~${b.segundos}s`,
        ),
      );
    }
    if (i < safeBeats.length - 1) {
      acts.push(
        step(
          'click',
          `capcut-transition-${idx}`,
          `Transición ${idx}→${idx + 1}`,
          ['[data-testid="transition-add"]'],
          'Insertar transición entre clips',
        ),
      );
    }
  });

  acts.push(
    step('click', 'capcut-music', 'Panel "Audio"', ['button[aria-label*="Audio"]'], 'Abrir panel de música/SFX'),
  );
  acts.push(
    step(
      'click',
      'capcut-music-pick',
      'Música sugerida',
      ['[data-testid="music-suggested"]:first-of-type'],
      'Elegir música sugerida',
    ),
  );
  acts.push(
    step(
      'click',
      'capcut-captions',
      'Auto-captions',
      ['button[aria-label*="Subtítulos automáticos"]'],
      'Generar subtítulos automáticos',
    ),
  );

  if (opts.autoExportar !== false) {
    acts.push(
      step('click', 'capcut-export', 'Botón "Exportar"', ['button:has-text("Exportar")'], 'Abrir panel Exportar'),
    );
    acts.push(step('click', 'capcut-quality-1080', 'Calidad 1080p', ['[data-testid="quality-1080"]'], 'Elegir 1080p'));
    acts.push(
      step(
        'click',
        'capcut-export-confirm',
        'Confirmar exportación',
        ['button:has-text("Descargar")'],
        'Confirmar exportación del video',
      ),
    );
  }

  return {
    instruction: `Editar reel "${titulo}" en CapCut Web (${safeBeats.length} clips, ${relacion})`,
    surface: 'desktop-app',
    actions: acts,
    requiresApproval: true,
    unresolved: [],
    notes: 'Guion de CapCut Web para el Teatro en vivo. Selectores orientativos para un runtime real (Playwright).',
  };
};
