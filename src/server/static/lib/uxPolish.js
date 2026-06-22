/* ══════════════════════════════════════════════════════════════════════════════
   uxPolish.js — 4 mejoras drop-in:
     1. Esconder topbar items secundarios en pantallas chicas (CSS)
     2. Empty states con guía sutil ("Tu primera vez? Probá Brújula")
     3. Modo enfoque (oculta sidebar al trabajar en herramienta) — F key o ⛶ btn
     4. Tour interactivo 4 pasos primer login
   ══════════════════════════════════════════════════════════════════════════════ */

const STORAGE_TOUR = 'feedia.tourSeen';
const STORAGE_FOCUS = 'feedia.focusMode';

const CSS = `
/* 1) Topbar responsive — ocultar secundarios <768px */
@media (max-width: 767px) {
  .cua-label, .cua-dd-status .small.muted, .topbar-platform-pill,
  .topbar-search, #topbar-help-btn, #topbar-notifications-btn { display: none !important; }
  .cua-btn { padding: 6px 8px !important; }
}
@media (max-width: 480px) {
  .cua-mode-pill[data-mode="observe"] { display: none !important; }
}

/* 2) Empty states */
.feedia-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 48px 24px;
  border: 1px dashed var(--border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.015);
  color: var(--text-secondary, #9ca3af);
  margin: 24px 0;
}
.feedia-empty-emoji { font-size: 42px; opacity: 0.7; margin-bottom: 10px; }
.feedia-empty-title { font-size: 15px; font-weight: 700; color: var(--text-primary, #fff); margin-bottom: 4px; }
.feedia-empty-sub { font-size: 12.5px; line-height: 1.55; max-width: 380px; margin-bottom: 14px; }
.feedia-empty-cta {
  display: inline-block;
  background: linear-gradient(135deg, #10F2B0, #3B82F6);
  color: #0A0A0F;
  padding: 9px 18px;
  border-radius: 8px;
  font-weight: 800;
  font-size: 12.5px;
  text-decoration: none;
  transition: filter .15s;
}
.feedia-empty-cta:hover { filter: brightness(1.1); }

/* 3) Modo enfoque — oculta sidebar + bottom nav + fabs */
body.focus-mode .sidebar,
body.focus-mode .desktop-sidebar,
body.focus-mode .bottom-nav,
body.focus-mode .mobile-bottom-nav,
body.focus-mode #voice-btn,
body.focus-mode #chatbot-fab,
body.focus-mode #assistant-fab {
  display: none !important;
}
body.focus-mode .app-main,
body.focus-mode main,
body.focus-mode .main-content {
  margin-left: 0 !important;
  padding-left: 0 !important;
  width: 100% !important;
  max-width: 1100px;
  margin-right: auto;
}
.focus-toggle {
  position: fixed;
  top: 14px;
  right: 14px;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(15, 15, 20, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #a78bfa;
  font-size: 15px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  z-index: 9997;
  transition: transform .15s, background .15s;
}
.focus-toggle:hover { transform: scale(1.08); background: rgba(168, 85, 247, .18); }
body.focus-mode .focus-toggle { background: rgba(168, 85, 247, .25); }

/* 4) Tour interactivo */
.tour-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.78);
  backdrop-filter: blur(6px);
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: tour-fade .2s ease-out;
}
@keyframes tour-fade { from { opacity: 0; } to { opacity: 1; } }
.tour-card {
  max-width: 480px;
  background: linear-gradient(180deg, #11111A, #0A0A0F);
  border: 1px solid rgba(168, 85, 247, .3);
  border-radius: 16px;
  padding: 28px;
  text-align: center;
  box-shadow: 0 24px 80px rgba(168, 85, 247, .15);
}
.tour-emoji { font-size: 48px; margin-bottom: 14px; }
.tour-title { font-size: 20px; font-weight: 800; color: #fff; margin-bottom: 8px; letter-spacing: -.4px; }
.tour-text { font-size: 13.5px; color: #D1D5DB; line-height: 1.55; margin-bottom: 22px; }
.tour-dots { display: flex; justify-content: center; gap: 6px; margin-bottom: 18px; }
.tour-dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(255, 255, 255, .15); transition: all .2s; }
.tour-dot.active { background: #10F2B0; width: 24px; border-radius: 3px; }
.tour-actions { display: flex; gap: 8px; justify-content: center; }
.tour-btn {
  background: transparent;
  border: 1px solid var(--border);
  color: #9CA3AF;
  padding: 9px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
}
.tour-btn:hover { background: rgba(255, 255, 255, .04); color: #fff; }
.tour-btn.primary {
  background: linear-gradient(135deg, #10F2B0, #3B82F6);
  color: #0A0A0F;
  border: none;
  font-weight: 800;
}
.tour-skip {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  color: #6B7280;
  font-size: 12px;
  cursor: pointer;
  padding: 6px 10px;
}
.tour-skip:hover { color: #fff; }
`;

// ── 2) EMPTY STATES ─────────────────────────────────────────────────────────
// Detecta vistas vacías comunes y reemplaza con guía minimalista
const EMPTY_STATES = {
  // Selector → contenido empty
  '#bj-result-host:empty': {
    emoji: '🧭', title: '¿Tu primera vez?',
    sub: 'Escribí cualquier tema arriba (ej: "marketing para emprendedores") y apretá <b>Analizar y generar mi plan</b>. Te armo 9 ideas en 30 segundos.',
    cta: null,
  },
  '#hf-timeline:has(.hf-empty)': {
    emoji: '🎙️', title: 'Decí algo y arranco',
    sub: 'Ejemplo: <i>"Feedia, hacé un carrusel sobre IA con 5 slides azul y negro"</i>. Tocá el mic o escribí abajo.',
    cta: null,
  },
};

const renderEmptyState = (host, cfg, ctaHref) => {
  const cta = ctaHref ? `<a href="${ctaHref}" class="feedia-empty-cta">${cfg.ctaText || 'Empezar'}</a>` : '';
  host.innerHTML = `
    <div class="feedia-empty">
      <div class="feedia-empty-emoji">${cfg.emoji}</div>
      <div class="feedia-empty-title">${cfg.title}</div>
      <div class="feedia-empty-sub">${cfg.sub}</div>
      ${cta}
    </div>`;
};

// Helper público: las vistas pueden llamar esto si su contenedor está vacío
export const showEmptyIfBlank = (selector, cfg) => {
  const el = document.querySelector(selector);
  if (el && !el.children.length && !el.textContent.trim()) {
    renderEmptyState(el, cfg, cfg.cta);
  }
};

// ── 3) MODO ENFOQUE ─────────────────────────────────────────────────────────
const initFocusMode = () => {
  // Restaurar estado guardado
  try {
    if (localStorage.getItem(STORAGE_FOCUS) === '1') document.body.classList.add('focus-mode');
  } catch {}

  // Botón flotante
  const btn = document.createElement('button');
  btn.className = 'focus-toggle';
  btn.setAttribute('aria-label', 'Modo enfoque (F)');
  btn.title = 'Modo enfoque (F)';
  btn.innerHTML = '⛶';
  btn.addEventListener('click', () => toggleFocus());
  document.body.appendChild(btn);

  // Atajo teclado F (solo si no escribiendo)
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'f' && e.key !== 'F') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const tag = (document.activeElement?.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || document.activeElement?.isContentEditable) return;
    e.preventDefault();
    toggleFocus();
  });
};

const toggleFocus = () => {
  const on = document.body.classList.toggle('focus-mode');
  try { localStorage.setItem(STORAGE_FOCUS, on ? '1' : '0'); } catch {}
};

// ── 4) TOUR INTERACTIVO ─────────────────────────────────────────────────────
const TOUR_STEPS = [
  {
    emoji: '👋',
    title: 'Bienvenido a FeedIA',
    text: 'Sistema autónomo que crea, optimiza y publica tu contenido en Instagram y TikTok. Te lo muestro en 4 pasos rápidos.',
  },
  {
    emoji: '🎨',
    title: 'Paso 1 · Tu Brand Kit',
    text: 'Cargá UNA vez: colores, tipografía, foto y nicho. Todas las herramientas leen de ahí — no volvés a configurar nada.',
    cta: { label: 'Ir a Brand Kit', route: 'brandkit' },
  },
  {
    emoji: '🎙️',
    title: 'Paso 2 · Manos Libres',
    text: 'Decí "Feedia, hacé un carrusel sobre IA" y respondo con voz mientras lo armo. Voz premium opcional con ElevenLabs.',
    cta: { label: 'Probar Manos Libres', route: 'handsfree' },
  },
  {
    emoji: '🤖',
    title: 'Paso 3 · Run All',
    text: 'En Brújula, 1 botón verde corre todo el semanal: análisis del nicho, 3 carruseles, plantillas de respuesta DM. Listo.',
    cta: { label: 'Empezar a crear', route: 'brujula' },
  },
];

let tourIdx = 0;
let tourOverlay = null;

const renderTour = () => {
  const step = TOUR_STEPS[tourIdx];
  if (!step) { closeTour(); return; }
  tourOverlay.innerHTML = `
    <div class="tour-card" style="position:relative;">
      <button class="tour-skip" data-act="skip">saltar</button>
      <div class="tour-emoji">${step.emoji}</div>
      <div class="tour-title">${step.title}</div>
      <div class="tour-text">${step.text}</div>
      <div class="tour-dots">${TOUR_STEPS.map((_, i) => `<div class="tour-dot ${i === tourIdx ? 'active' : ''}"></div>`).join('')}</div>
      <div class="tour-actions">
        ${tourIdx > 0 ? '<button class="tour-btn" data-act="back">‹ Atrás</button>' : ''}
        ${step.cta ? `<button class="tour-btn primary" data-act="cta" data-route="${step.cta.route}">${step.cta.label}</button>` : ''}
        <button class="tour-btn ${step.cta ? '' : 'primary'}" data-act="next">${tourIdx === TOUR_STEPS.length - 1 ? 'Listo' : 'Siguiente ›'}</button>
      </div>
    </div>`;
  tourOverlay.querySelectorAll('[data-act]').forEach((el) => {
    el.addEventListener('click', () => {
      const a = el.dataset.act;
      if (a === 'skip') closeTour();
      else if (a === 'back') { tourIdx--; renderTour(); }
      else if (a === 'next') {
        if (tourIdx === TOUR_STEPS.length - 1) closeTour();
        else { tourIdx++; renderTour(); }
      } else if (a === 'cta') {
        const r = el.dataset.route;
        closeTour();
        if (r) window.location.hash = '#' + r;
      }
    });
  });
};

const closeTour = () => {
  if (tourOverlay) { tourOverlay.remove(); tourOverlay = null; }
  try { localStorage.setItem(STORAGE_TOUR, '1'); } catch {}
};

const openTour = () => {
  tourIdx = 0;
  tourOverlay = document.createElement('div');
  tourOverlay.className = 'tour-overlay';
  document.body.appendChild(tourOverlay);
  renderTour();
};

const initTour = () => {
  try {
    if (localStorage.getItem(STORAGE_TOUR) === '1') return; // ya visto
  } catch {}
  // Esperar a que la app esté renderizada
  setTimeout(openTour, 1200);
};

// Re-abrir tour manualmente (botón en Help/settings)
export const restartTour = () => {
  try { localStorage.removeItem(STORAGE_TOUR); } catch {}
  openTour();
};
window.feediaRestartTour = restartTour;

// ── INIT ────────────────────────────────────────────────────────────────────
export const initUxPolish = () => {
  if (document.getElementById('ux-polish-style')) return;
  const s = document.createElement('style');
  s.id = 'ux-polish-style';
  s.textContent = CSS;
  document.head.appendChild(s);
  initFocusMode();
  initTour();

  // Empty states — observa cambios en main view
  const tryEmpty = () => {
    Object.entries(EMPTY_STATES).forEach(([sel, cfg]) => {
      try {
        const el = document.querySelector(sel.replace(':has(.hf-empty)', '').replace(':empty', ''));
        if (!el) return;
        const isEmpty = !el.children.length || (el.children.length === 1 && el.firstElementChild.classList?.contains('hf-empty'));
        if (isEmpty && !el.querySelector('.feedia-empty')) renderEmptyState(el, cfg);
      } catch {}
    });
  };
  setTimeout(tryEmpty, 800);
  window.addEventListener('hashchange', () => setTimeout(tryEmpty, 600));
};

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initUxPolish, 150);
else document.addEventListener('DOMContentLoaded', initUxPolish);
