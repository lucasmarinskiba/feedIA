/* ══════════════════════════════════════════════════════════════════════════════
   sidebarGroups.js — colapsa los grupos del sidebar (`nav-group-label`)
   sin tocar el HTML. Tu Casa abierto por default; resto colapsado.
   Estado persiste en localStorage.
   ══════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'feedia.sidebarGroups';
// Reorg semántica: outcome-first
const RELABEL = {
  'Tu Casa': '🎯 Hoy',
  'Studio': '🎨 Crear',
  'Indicaciones a la IA': '🧠 Pensar con IA',
  'Inteligencia IA': '🤖 Auto-Pilot',
  'Gestión': '📊 Mi cuenta',
  'Operaciones': '⚙️ Ajustes',
};
const DEFAULT_OPEN = ['🎯 Hoy']; // resto colapsa por default

const loadState = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
};
const saveState = (state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
};

export const initSidebarGroups = () => {
  const nav = document.querySelector('.side-nav');
  if (!nav) return;

  const state = loadState();
  const labels = [...nav.querySelectorAll('.nav-group-label')];
  if (!labels.length) return;

  labels.forEach((label) => {
    const original = label.textContent.trim();
    // Re-etiquetar a outcome-first
    if (RELABEL[original]) {
      label.textContent = RELABEL[original];
      label.dataset.original = original;
    }
    const name = label.textContent.trim();
    if (label.dataset.wired) return; // idempotente
    label.dataset.wired = '1';

    // recolectar todos los siguientes nodos (items + comments) hasta el próximo label
    const items = [];
    let cur = label.nextElementSibling;
    while (cur && !cur.classList.contains('nav-group-label')) {
      items.push(cur);
      cur = cur.nextElementSibling;
    }

    // estado inicial
    const isOpen = state[name] !== undefined ? state[name] : DEFAULT_OPEN.includes(name);
    const setOpen = (open) => {
      items.forEach((el) => {
        el.style.display = open ? '' : 'none';
      });
      label.classList.toggle('collapsed', !open);
      label.dataset.open = open ? '1' : '0';
      state[name] = open;
      saveState(state);
    };

    // Wrap label con caret + clickable
    label.style.cursor = 'pointer';
    label.style.userSelect = 'none';
    label.style.display = 'flex';
    label.style.alignItems = 'center';
    label.style.gap = '6px';
    if (!label.querySelector('.sg-caret')) {
      const caret = document.createElement('span');
      caret.className = 'sg-caret';
      caret.textContent = '▾';
      caret.style.fontSize = '9px';
      caret.style.transition = 'transform .15s';
      caret.style.opacity = '0.55';
      label.prepend(caret);
    }
    label.addEventListener('click', () => setOpen(label.dataset.open !== '1'));
    setOpen(isOpen);
  });

  // CSS
  if (!document.querySelector('#sg-style')) {
    const css = document.createElement('style');
    css.id = 'sg-style';
    css.textContent = `
      .nav-group-label.collapsed .sg-caret{transform:rotate(-90deg);}
      .nav-group-label:hover{color:var(--text-primary, var(--fg));}
    `;
    document.head.appendChild(css);
  }
};

// Auto-init si DOM ya está listo (la nav existe siempre al load)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  setTimeout(initSidebarGroups, 50);
} else {
  document.addEventListener('DOMContentLoaded', initSidebarGroups);
}
