/* ══════════════════════════════════════════════════════════════════════════════
   platform.js — Switcher Instagram / TikTok
   ──────────────────────────────────────────────────────────────────────────────
   Estado global de plataforma activa. Filtra nav items por data-platform
   (instagram | tiktok | both). Emite evento 'feedia:platform' al cambiar.
   Persistido en localStorage. Las vistas Studio leen getPlatform() para ajustar
   estrategia (TikTok = 9:16, hook 0-2s, sonido, completion; IG = reel/carrusel/story).
   ══════════════════════════════════════════════════════════════════════════════ */

const KEY = 'feedia.platform';
let current = 'general';
try {
  current = localStorage.getItem(KEY) || 'general';
} catch {
  /* noop */
}

export const PLATFORMS = {
  instagram: {
    id: 'instagram',
    label: 'Instagram',
    emoji: '📷',
    accent: 'linear-gradient(135deg,#f09433,#e6683c,#dc2743,#bc1888)',
  },
  tiktok: { id: 'tiktok', label: 'TikTok', emoji: '🎵', accent: 'linear-gradient(135deg,#25F4EE,#000,#FE2C55)' },
  general: { id: 'general', label: 'Sala', emoji: '👑', accent: 'linear-gradient(135deg,#6366f1,#a855f7,#ec4899)' },
};

export const getPlatform = () => current;

export const setPlatform = (p) => {
  if (!PLATFORMS[p] || p === current) return;
  current = p;
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* noop */
  }
  applyVisibility();
  window.dispatchEvent(new CustomEvent('feedia:platform', { detail: { platform: p } }));
};

/* Oculta nav items que no son de la plataforma activa.
   data-platform="tiktok" → solo TikTok. "instagram" → solo IG. ausente/"both" → siempre. */
const applyVisibility = () => {
  document.querySelectorAll('[data-platform]').forEach((el) => {
    const tag = el.dataset.platform;
    const show = !tag || tag === 'both' || tag === current;
    el.style.display = show ? '' : 'none';
  });
  // Ocultar labels de grupo cuyos items quedaron todos ocultos
  document.querySelectorAll('.side-nav .nav-group-label').forEach((label) => {
    let anyVisible = false;
    let n = label.nextElementSibling;
    while (n && !n.classList.contains('nav-group-label')) {
      if (n.classList.contains('nav-item') && n.style.display !== 'none') {
        anyVisible = true;
        break;
      }
      n = n.nextElementSibling;
    }
    label.style.display = anyVisible ? '' : 'none';
  });
  // Marcar pills activos
  document.querySelectorAll('.plat-pill').forEach((pill) => {
    pill.classList.toggle('active', pill.dataset.plat === current);
  });
  // Clase en body para CSS condicional
  document.body.classList.toggle('platform-tiktok', current === 'tiktok');
  document.body.classList.toggle('platform-instagram', current === 'instagram');
  document.body.classList.toggle('platform-general', current === 'general');
};

export const initPlatformSwitcher = () => {
  // Inyectar estilos
  if (!document.getElementById('plat-style')) {
    const st = document.createElement('style');
    st.id = 'plat-style';
    st.textContent = PLAT_STYLES;
    document.head.appendChild(st);
  }

  // Montar barra horizontal arriba del topbar (si existe contenedor)
  const host = document.getElementById('platform-switcher');
  if (host && !host.dataset.mounted) {
    host.dataset.mounted = '1';
    host.innerHTML = `
      <div class="plat-bar" role="tablist" aria-label="Plataforma">
        ${Object.values(PLATFORMS)
          .map(
            (p) => `
          <button class="plat-pill ${p.id === current ? 'active' : ''}" data-plat="${p.id}" role="tab" aria-selected="${p.id === current}" title="${p.label}">
            <span class="plat-pill-emoji">${p.emoji}</span>
            <span class="plat-pill-label">${p.label}</span>
          </button>`,
          )
          .join('')}
        <span class="plat-bar-hint">Cambia qué red administrás</span>
      </div>`;
    host.querySelectorAll('.plat-pill').forEach((pill) => {
      pill.addEventListener('click', () => setPlatform(pill.dataset.plat));
    });
  }

  applyVisibility();

  // Re-aplicar tras navegación (nav puede re-renderizar)
  window.addEventListener('hashchange', () => setTimeout(applyVisibility, 30));
};

const PLAT_STYLES = `
#platform-switcher { width: 100%; box-sizing: border-box; }
.plat-bar {
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 3px;
  padding: 3px; border-radius: 11px; width: 100%; box-sizing: border-box; overflow: hidden;
  background: var(--bg-card-2, var(--bg-elev, #1c1c22)); border: 1px solid var(--border, #2a2a32);
}
html[data-theme="light"] .plat-bar { background: #eceef2; border-color: rgba(17,18,22,.10); }
html[data-theme="light"] .plat-pill { color: #474a54; }
html[data-theme="light"] .plat-pill:hover { background: rgba(17,18,22,.04); color: #16171c; }
.plat-bar-hint { display: none; }
.plat-pill {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px;
  min-width: 0; width: 100%; padding: 6px 1px; border-radius: 8px; border: 0;
  background: transparent; color: var(--text-muted, #9CA3AF);
  font-weight: 700; cursor: pointer; transition: background .15s, color .15s;
  overflow: hidden;
}
.plat-pill:hover { color: var(--fg, #fff); background: rgba(255,255,255,.05); }
.plat-pill.active { color: #fff; }
.plat-pill[data-plat="instagram"].active { background: linear-gradient(135deg,#f09433,#dc2743,#bc1888); }
.plat-pill[data-plat="tiktok"].active   { background: linear-gradient(135deg,#25F4EE,#111,#FE2C55); }
.plat-pill[data-plat="general"].active  { background: linear-gradient(135deg,#6366f1,#a855f7,#ec4899); }
.plat-pill-emoji { font-size: 16px; line-height: 1; flex-shrink: 0; }
.plat-pill-label { font-size: 10px; line-height: 1.1; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;
