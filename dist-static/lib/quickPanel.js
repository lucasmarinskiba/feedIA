/* ══════════════════════════════════════════════════════════════════════════════
   quickPanel.js — paleta de comandos (⌘K) + scroll-to-top + breadcrumbs.
   Cero ruido visual hasta que el user lo invoca.
   ══════════════════════════════════════════════════════════════════════════════ */

const COMMANDS = [
  { id: 'home', label: '🏠 Home', kw: 'home inicio empezar', route: 'home' },
  { id: 'brujula', label: '🧭 Brújula del Día', kw: 'brujula plan tema hoy', route: 'brujula' },
  { id: 'handsfree', label: '🎙️ Manos Libres', kw: 'manos libres voz dictar feedia', route: 'handsfree' },
  { id: 'brandkit', label: '🎨 Brand Kit', kw: 'brand kit colores marca tipografia logo', route: 'brandkit' },
  { id: 'studio-carousel', label: '🖼️ Carrusel', kw: 'carrusel slides instagram crear', route: 'studio-carousel' },
  { id: 'studio-reel', label: '🎬 Reel', kw: 'reel video corto vertical', route: 'studio-reel' },
  { id: 'studio-stories', label: '📱 Historia', kw: 'historia stories 9 16 frames', route: 'studio-stories' },
  { id: 'calendar', label: '📅 Calendario', kw: 'calendar agenda planificar', route: 'calendar' },
  { id: 'agents', label: '🤖 Agentes', kw: 'agentes IA equipo', route: 'agents' },
  { id: 'community', label: '💬 Comunidad', kw: 'comunidad community dm comentarios responder', route: 'community' },
  { id: 'analytics', label: '📊 Analytics', kw: 'analytics metricas datos performance', route: 'analytics' },
  { id: 'settings', label: '⚙️ Configuración', kw: 'settings ajustes config cuenta', route: 'settings' },
];

const TPL = `
<div class="qp-overlay" id="qp-overlay">
  <div class="qp-panel">
    <input type="text" class="qp-input" id="qp-input" placeholder="Buscá vista, herramienta o acción…" autocomplete="off" />
    <div class="qp-list" id="qp-list"></div>
    <div class="qp-foot">↑↓ navegar · ↵ abrir · esc cerrar</div>
  </div>
</div>`;

const CSS = `
.qp-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);backdrop-filter:blur(8px);z-index:99999;display:flex;align-items:flex-start;justify-content:center;padding:14vh 16px 0;animation:qp-fade .15s ease-out;}
@keyframes qp-fade{from{opacity:0;}to{opacity:1;}}
.qp-panel{width:100%;max-width:560px;background:#0F0F14;border:1px solid rgba(255,255,255,.12);border-radius:14px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);}
.qp-input{width:100%;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);color:#fff;font-size:15px;padding:16px 18px;font-family:inherit;outline:none;}
.qp-input::placeholder{color:#6B7280;}
.qp-list{max-height:50vh;overflow-y:auto;padding:6px 0;}
.qp-item{display:flex;align-items:center;gap:10px;padding:9px 18px;cursor:pointer;font-size:13.5px;color:#D1D5DB;transition:background .1s;}
.qp-item.active,.qp-item:hover{background:rgba(168,85,247,.12);color:#fff;}
.qp-empty{padding:16px 18px;color:#6B7280;font-size:12.5px;}
.qp-foot{padding:10px 18px;font-size:11px;color:#4B5563;border-top:1px solid rgba(255,255,255,.05);letter-spacing:.5px;}
/* Scroll-to-top button */
.qp-stt{position:fixed;bottom:80px;right:24px;width:38px;height:38px;border-radius:50%;background:rgba(15,15,20,.85);border:1px solid rgba(255,255,255,.12);color:#a78bfa;font-size:16px;cursor:pointer;display:none;align-items:center;justify-content:center;backdrop-filter:blur(8px);z-index:9999;transition:transform .15s;}
.qp-stt.visible{display:flex;}
.qp-stt:hover{transform:translateY(-3px);}
/* Hint chip ⌘K */
.qp-hint{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(15,15,20,.92);color:#9CA3AF;border:1px solid rgba(255,255,255,.08);padding:5px 12px;border-radius:18px;font-size:11px;letter-spacing:.5px;backdrop-filter:blur(8px);z-index:9998;pointer-events:none;opacity:0;transition:opacity .3s ease;}
.qp-hint.show{opacity:1;}
.qp-hint kbd{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:4px;padding:1px 5px;font-family:inherit;margin:0 2px;}
`;

let activeIdx = 0;
let filtered = COMMANDS;

const filterCommands = (q) => {
  const query = (q || '').toLowerCase().trim();
  if (!query) return COMMANDS;
  return COMMANDS.filter((c) => c.label.toLowerCase().includes(query) || c.kw.includes(query));
};

const renderList = () => {
  const list = document.getElementById('qp-list');
  if (!list) return;
  if (!filtered.length) {
    list.innerHTML = '<div class="qp-empty">No encontré nada · probá "carrusel", "voz", "brand kit"…</div>';
    return;
  }
  list.innerHTML = filtered.map((c, i) => `<div class="qp-item ${i === activeIdx ? 'active' : ''}" data-route="${c.route}">${c.label}</div>`).join('');
  list.querySelectorAll('.qp-item').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      activeIdx = [...list.children].indexOf(el);
      list.querySelectorAll('.qp-item').forEach((e, i) => e.classList.toggle('active', i === activeIdx));
    });
    el.addEventListener('click', () => navigate(el.dataset.route));
  });
};

const navigate = (route) => {
  closePanel();
  window.location.hash = '#' + route;
};

const openPanel = () => {
  if (document.getElementById('qp-overlay')) return;
  document.body.insertAdjacentHTML('beforeend', TPL);
  activeIdx = 0;
  filtered = COMMANDS;
  renderList();
  const input = document.getElementById('qp-input');
  input.focus();
  input.addEventListener('input', (e) => {
    filtered = filterCommands(e.target.value);
    activeIdx = 0;
    renderList();
  });
  document.getElementById('qp-overlay').addEventListener('click', (e) => {
    if (e.target.id === 'qp-overlay') closePanel();
  });
};

const closePanel = () => { document.getElementById('qp-overlay')?.remove(); };

document.addEventListener('keydown', (e) => {
  // ⌘K / Ctrl+K → abrir
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    if (document.getElementById('qp-overlay')) closePanel();
    else openPanel();
    return;
  }
  if (!document.getElementById('qp-overlay')) return;
  if (e.key === 'Escape') { e.preventDefault(); closePanel(); }
  if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(filtered.length - 1, activeIdx + 1); renderList(); document.querySelectorAll('.qp-item')[activeIdx]?.scrollIntoView({ block: 'nearest' }); }
  if (e.key === 'ArrowUp')   { e.preventDefault(); activeIdx = Math.max(0, activeIdx - 1); renderList(); document.querySelectorAll('.qp-item')[activeIdx]?.scrollIntoView({ block: 'nearest' }); }
  if (e.key === 'Enter') { e.preventDefault(); const c = filtered[activeIdx]; if (c) navigate(c.route); }
});

export const initQuickPanel = () => {
  if (document.getElementById('qp-style')) return;
  const style = document.createElement('style'); style.id = 'qp-style'; style.textContent = CSS;
  document.head.appendChild(style);

  // Scroll-to-top
  const stt = document.createElement('button');
  stt.className = 'qp-stt'; stt.setAttribute('aria-label', 'Subir');
  stt.innerHTML = '↑';
  stt.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  document.body.appendChild(stt);
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      stt.classList.toggle('visible', window.scrollY > 600);
      ticking = false;
    });
  }, { passive: true });

  // Hint chip (3 seg al cargar primera vez)
  try {
    const seen = localStorage.getItem('feedia.qpHintSeen') === '1';
    if (!seen) {
      const hint = document.createElement('div');
      hint.className = 'qp-hint';
      const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
      hint.innerHTML = `tip · <kbd>${isMac ? '⌘' : 'Ctrl'}</kbd><kbd>K</kbd> para buscar vista al instante`;
      document.body.appendChild(hint);
      setTimeout(() => hint.classList.add('show'), 800);
      setTimeout(() => { hint.classList.remove('show'); setTimeout(() => hint.remove(), 400); }, 5500);
      localStorage.setItem('feedia.qpHintSeen', '1');
    }
  } catch {}
};

if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(initQuickPanel, 100);
else document.addEventListener('DOMContentLoaded', initQuickPanel);
