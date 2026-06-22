/**
 * Canva UI Map — Selectores semánticos para canva.com/editor y canva.com/templates
 * Canva usa mucho canvas y Shadow DOM; estos selectores son heurísticos con fallback chains.
 */
import { createUiMap, T } from '../core/uiMapEngine.js';

export const CANVA_UI = createUiMap('canva', 'https://www.canva.com', [
  // ── Navegación principal ──────────────────────────────────────────
  T(
    'create-design',
    'Crear diseño',
    [
      'button:has-text("Crear un diseño")',
      '[data-testid="create-design-button"]',
      'button:has-text("Create a design")',
    ],
    'click',
    'Abre el selector de formato de diseño',
  ),
  T(
    'search-templates',
    'Buscar templates',
    ['input[placeholder*="Buscar"]', 'input[placeholder*="Search"]', '[data-testid="search-input"]'],
    'type',
    'Campo de búsqueda de templates',
  ),
  T(
    'home',
    'Inicio / Home',
    ['a[href="/"]', 'a:has-text("Inicio")', 'a:has-text("Home")'],
    'navigate',
    'Página de inicio de Canva',
    { url: '/' },
  ),
  T(
    'templates-tab',
    'Pestaña Templates',
    ['button:has-text("Templates")', 'button:has-text("Plantillas")', '[data-testid="templates-tab"]'],
    'click',
    'Muestra la galería de templates',
  ),
  T(
    'projects-tab',
    'Pestaña Proyectos',
    ['button:has-text("Proyectos")', 'button:has-text("Projects")', '[data-testid="projects-tab"]'],
    'click',
    'Muestra los proyectos guardados',
  ),

  // ── Editor ────────────────────────────────────────────────────────
  T(
    'text-tool',
    'Herramienta Texto',
    ['button:has-text("Texto")', 'button:has-text("Text")', '[aria-label="Text"]', '[data-testid="text-panel-button"]'],
    'click',
    'Abre el panel de texto',
  ),
  T(
    'elements-tool',
    'Herramienta Elementos',
    [
      'button:has-text("Elementos")',
      'button:has-text("Elements")',
      '[aria-label="Elements"]',
      '[data-testid="elements-panel-button"]',
    ],
    'click',
    'Abre el panel de elementos',
  ),
  T(
    'uploads-tool',
    'Herramienta Subidas',
    [
      'button:has-text("Subidas")',
      'button:has-text("Uploads")',
      '[aria-label="Uploads"]',
      '[data-testid="uploads-panel-button"]',
    ],
    'click',
    'Abre el panel de uploads',
  ),
  T(
    'brand-kit-tool',
    'Brand Kit',
    ['button:has-text("Brand Kit")', '[data-testid="brand-kit-panel-button"]'],
    'click',
    'Abre el panel de Brand Kit',
  ),
  T(
    'add-text-box',
    'Agregar cuadro de texto',
    [
      'button:has-text("Agregar un encabezado")',
      'button:has-text("Add a heading")',
      '[data-testid="add-heading-button"]',
    ],
    'click',
    'Agrega un cuadro de texto al canvas',
  ),
  T(
    'text-editor',
    'Editor de texto',
    ['div[contenteditable="true"]', '[data-testid="text-editor"]', 'textarea[class*="text"]'],
    'type',
    'Área editable de texto en el canvas',
  ),
  T(
    'font-dropdown',
    'Selector de fuente',
    ['button[data-testid="font-dropdown"]', 'button:has-text("Arial")', '[aria-label="Font"]'],
    'click',
    'Abre el selector de fuentes',
  ),
  T(
    'color-picker',
    'Selector de color',
    ['button[data-testid="color-picker"]', '[aria-label="Color"]', 'button:has-text("Color")'],
    'click',
    'Abre el selector de colores',
  ),
  T(
    'color-hex-input',
    'Input de color HEX',
    ['input[placeholder="#000000"]', '[data-testid="color-hex-input"]'],
    'type',
    'Campo para ingresar color HEX',
  ),

  // ── Canvas acciones ───────────────────────────────────────────────
  T(
    'canvas-area',
    'Área de diseño (canvas)',
    ['[data-testid="editor-canvas"]', 'canvas', '.editor-canvas'],
    'click',
    'Área principal de diseño',
  ),
  T('select-all', 'Seleccionar todo', ['body'], 'press', 'Ctrl+A para seleccionar todo'),
  T('delete-selection', 'Eliminar selección', ['body'], 'press', 'Delete para eliminar selección'),
  T('undo', 'Deshacer', ['body'], 'press', 'Ctrl+Z para deshacer'),
  T('redo', 'Rehacer', ['body'], 'press', 'Ctrl+Y para rehacer'),

  // ── Export / Download ─────────────────────────────────────────────
  T(
    'share-button',
    'Botón Compartir',
    ['button:has-text("Compartir")', 'button:has-text("Share")', '[data-testid="share-button"]'],
    'click',
    'Abre el menú de compartir/exportar',
  ),
  T(
    'download-button',
    'Botón Descargar',
    ['button:has-text("Descargar")', 'button:has-text("Download")', '[data-testid="download-button"]'],
    'click',
    'Abre el panel de descarga',
  ),
  T(
    'download-png',
    'Formato PNG',
    ['button:has-text("PNG")', '[data-testid="format-png"]'],
    'click',
    'Selecciona formato PNG',
  ),
  T(
    'download-jpg',
    'Formato JPG',
    ['button:has-text("JPG")', 'button:has-text("JPEG")', '[data-testid="format-jpg"]'],
    'click',
    'Selecciona formato JPG',
  ),
  T(
    'download-pdf',
    'Formato PDF',
    ['button:has-text("PDF")', '[data-testid="format-pdf"]'],
    'click',
    'Selecciona formato PDF',
  ),
  T(
    'download-mp4',
    'Formato MP4',
    ['button:has-text("MP4")', '[data-testid="format-mp4"]'],
    'click',
    'Selecciona formato MP4 (video)',
  ),
  T(
    'download-confirm',
    'Confirmar descarga',
    ['button:has-text("Descargar")', 'button:has-text("Download")', '[data-testid="download-confirm-button"]'],
    'click',
    'Inicia la descarga del archivo',
  ),
]);
