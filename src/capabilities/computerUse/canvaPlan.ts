/**
 * Canva Plan — guion observable para crear un carrusel desde Canva
 * ─────────────────────────────────────────────────────────────────────────
 * Construye un ComputerPlan listo para reproducir en el Teatro en vivo
 * (Pantalla en vivo): el agente abre el navegador, entra a Canva, elige
 * plantilla de carrusel, tipea cada slide y exporta. El usuario lo mira
 * trabajar paso a paso.
 *
 * Hoy es un guion sintético (animación en el escenario virtual). Si más
 * adelante se conecta Playwright, los mismos pasos pueden ejecutarse de
 * verdad sobre Canva — los selectores son orientativos para esa fase.
 */

import type { ComputerPlan, ComputerAction } from './planner.js';

export interface CanvaSlide {
  titulo: string;
  cuerpo: string;
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
 * Arma el guion para crear un carrusel en Canva.
 *
 * @param slides   contenido a tipear, slide por slide
 * @param opts.titulo  nombre del diseño en Canva
 * @param opts.autoExportar incluye los pasos de exportar PNG
 */
export const planCanvaCarousel = (
  slides: CanvaSlide[],
  opts: { titulo?: string; autoExportar?: boolean } = {},
): ComputerPlan => {
  _seq = 0;
  const titulo = (opts.titulo ?? 'Carrusel FeedIA').slice(0, 80);
  const safeSlides = slides.slice(0, 10); // techo razonable
  const acts: ComputerAction[] = [];

  acts.push(
    step('navigate', 'browser', 'Navegador', [], 'Abrir el navegador y entrar a Canva', {
      url: 'https://www.canva.com/',
    }),
  );
  acts.push(
    step(
      'click',
      'canva-create',
      'Botón "Crear un diseño"',
      ['button:has-text("Crear un diseño")', 'a[href*="/create"]'],
      'Hacer click en "Crear un diseño"',
    ),
  );
  acts.push(
    step(
      'type',
      'canva-template-search',
      'Buscador de plantillas',
      ['input[placeholder*="Buscar"]', 'input[type="search"]'],
      'Buscar plantilla "carrusel de Instagram"',
      { text: 'carrusel de Instagram' },
    ),
  );
  acts.push(step('press', 'enter', 'Tecla Enter', [], 'Confirmar la búsqueda'));
  acts.push(
    step(
      'click',
      'canva-template-first',
      'Primera plantilla de carrusel',
      ['[data-testid="template-card"]:first-of-type', '.template-tile:first-child'],
      'Elegir la primera plantilla de carrusel',
    ),
  );
  acts.push(
    step(
      'click',
      'canva-design-title',
      'Título del diseño',
      ['[data-testid="design-title"]', 'input[aria-label*="título"]'],
      'Renombrar el diseño',
    ),
  );
  acts.push(
    step(
      'type',
      'canva-design-title-input',
      'Input título',
      ['[data-testid="design-title-input"]'],
      `Tipear el título: "${titulo}"`,
      { text: titulo },
    ),
  );

  safeSlides.forEach((s, i) => {
    acts.push(
      step('click', `canva-slide-${i + 1}`, `Slide ${i + 1}`, [`[data-page-index="${i}"]`], `Ir al slide ${i + 1}`),
    );
    acts.push(
      step(
        'double-click',
        `canva-title-${i + 1}`,
        `Caja de título slide ${i + 1}`,
        [`[data-page-index="${i}"] [data-element-role="heading"]`],
        `Editar título del slide ${i + 1}`,
      ),
    );
    acts.push(
      step('type', `canva-title-input-${i + 1}`, 'Input título slide', [], `Tipear título: "${s.titulo}"`, {
        text: s.titulo,
      }),
    );
    acts.push(
      step(
        'double-click',
        `canva-body-${i + 1}`,
        `Caja de cuerpo slide ${i + 1}`,
        [`[data-page-index="${i}"] [data-element-role="body"]`],
        `Editar cuerpo del slide ${i + 1}`,
      ),
    );
    acts.push(
      step(
        'type',
        `canva-body-input-${i + 1}`,
        'Input cuerpo slide',
        [],
        `Tipear cuerpo: "${s.cuerpo.slice(0, 120)}"`,
        { text: s.cuerpo.slice(0, 120) },
      ),
    );
    if (i < safeSlides.length - 1) {
      acts.push(
        step(
          'click',
          'canva-add-page',
          'Botón "Agregar página"',
          ['button[aria-label*="Agregar"]'],
          'Agregar una página nueva',
        ),
      );
    }
  });

  if (opts.autoExportar !== false) {
    acts.push(
      step(
        'click',
        'canva-share',
        'Botón "Compartir"',
        ['button:has-text("Compartir")', '[data-testid="share-button"]'],
        'Abrir el panel Compartir',
      ),
    );
    acts.push(
      step('click', 'canva-download', 'Opción "Descargar"', ['[data-testid="download-button"]'], 'Elegir Descargar'),
    );
    acts.push(
      step('click', 'canva-format-png', 'Formato PNG', ['select[aria-label*="formato"]'], 'Elegir formato PNG'),
    );
    acts.push(
      step(
        'click',
        'canva-download-confirm',
        'Confirmar descarga',
        ['button:has-text("Descargar")'],
        'Confirmar descarga del carrusel',
      ),
    );
  }

  return {
    instruction: `Crear carrusel "${titulo}" en Canva (${safeSlides.length} slides)`,
    surface: 'desktop-app',
    actions: acts,
    requiresApproval: true, // toca app externa con sesión del usuario
    unresolved: [],
    notes: 'Guion de Canva para el Teatro en vivo. Selectores orientativos para un futuro runtime Playwright.',
  };
};
