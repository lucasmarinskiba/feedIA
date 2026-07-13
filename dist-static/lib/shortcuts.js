/* ══════════════════════════════════════════════════════════════════════════════
   shortcuts.js — Overlay con todos los atajos de teclado del sistema
   ──────────────────────────────────────────────────────────────────────────────
   Trigger: tecla "?" (cuando no estás en input) · Cmd/Ctrl+/  · desde búsqueda
   ══════════════════════════════════════════════════════════════════════════════ */

const SHORTCUT_GROUPS = [
  {
    label: '🔍 Navegación',
    items: [
      { keys: ['⌘', 'K'], alt: ['Ctrl', 'K'], desc: 'Abrir búsqueda global' },
      { keys: ['/'], desc: 'Abrir búsqueda (alternativo)' },
      { keys: ['?'], desc: 'Mostrar este panel de atajos' },
      { keys: ['Esc'], desc: 'Cerrar overlay / panel actual' },
      { keys: ['G', 'H'], desc: 'Ir a Home' },
      { keys: ['G', 'M'], desc: 'Ir a Mission Control' },
      { keys: ['G', 'C'], desc: 'Ir a Calendario' },
      { keys: ['G', 'A'], desc: 'Ir a Agenda' },
      { keys: ['G', 'S'], desc: 'Ir a Sala Ejecutiva' },
      { keys: ['G', 'I'], desc: 'Ir a Agentes IA' },
    ],
  },
  {
    label: '🎙️ Voz y chat',
    items: [
      { keys: ['Hola FeedIA'], desc: 'Wake word (si está activado en Settings)' },
      { keys: ['Click', 'mic FAB'], desc: 'Abrir overlay de voz' },
      { keys: ['Click', '✦ FAB'], desc: 'Abrir chatbot Asistente FeedIA' },
      { keys: ['Enter'], desc: 'En el chat: enviar mensaje' },
      { keys: ['Shift', 'Enter'], desc: 'En el chat: nueva línea' },
      { keys: ['Esc'], desc: 'Cerrar voice / chatbot' },
    ],
  },
  {
    label: '🤖 Computer Use',
    items: [
      { keys: ['Click', 'topbar CUA'], desc: 'Abrir dropdown Computer Use' },
      { keys: ['Click', '🔴/🟢/👁️'], desc: 'Cambiar modo: Off/Auto/Asistente' },
      { keys: ['Click', '🛑 rojo'], desc: 'Frenar al agente (emergencia)' },
    ],
  },
  {
    label: '🔔 Notificaciones',
    items: [
      { keys: ['Click', '🔔'], desc: 'Abrir campanita' },
      { keys: ['Click', 'item'], desc: 'Marcar como leído + navegar' },
      { keys: ['✓ Marcar todo'], desc: 'Marcar todas como leídas' },
    ],
  },
  {
    label: '⚡ Acciones rápidas (vía búsqueda)',
    items: [
      { keys: ['/ → "misión"'], desc: 'Lanzar misión nueva' },
      { keys: ['/ → "frenar"'], desc: 'Stop de emergencia del agente' },
      { keys: ['/ → "canva"'], desc: 'Abrir pipeline Canva → IG' },
      { keys: ['/ → "camara"'], desc: 'Vision IA con cámara' },
      { keys: ['/ → "autopilot"'], desc: 'Activar Autopilot' },
    ],
  },
];

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const renderKeys = (keys) =>
  keys
    .map((k) => {
      if (k.length === 1 || k === '⌘' || k === '⌥' || k === '⇧') return `<kbd>${escapeHtml(k)}</kbd>`;
      if (k === 'Ctrl' || k === 'Enter' || k === 'Esc' || k === 'Shift') return `<kbd>${escapeHtml(k)}</kbd>`;
      return `<span class="sc-token">${escapeHtml(k)}</span>`;
    })
    .join('<span class="sc-plus">+</span>');

let overlayEl = null;

export const openShortcuts = () => {
  if (overlayEl) return;
  overlayEl = document.createElement('div');
  overlayEl.className = 'sc-overlay';
  overlayEl.setAttribute('role', 'dialog');
  overlayEl.setAttribute('aria-label', 'Atajos de teclado');
  overlayEl.innerHTML = `
    <div class="sc-backdrop"></div>
    <div class="sc-card">
      <div class="sc-header">
        <div>
          <div class="sc-title">⌨️ Atajos de teclado</div>
          <div class="sc-sub">Todo lo que podés hacer sin tocar el mouse.</div>
        </div>
        <button class="sc-close" aria-label="Cerrar">✕</button>
      </div>
      <div class="sc-body">
        ${SHORTCUT_GROUPS.map(
          (g) => `
          <div class="sc-group">
            <div class="sc-group-label">${g.label}</div>
            <div class="sc-items">
              ${g.items
                .map(
                  (it) => `
                <div class="sc-item">
                  <div class="sc-keys">${renderKeys(it.keys)}</div>
                  <div class="sc-desc">${escapeHtml(it.desc)}</div>
                  ${it.alt ? `<div class="sc-alt">o ${renderKeys(it.alt)}</div>` : ''}
                </div>`,
                )
                .join('')}
            </div>
          </div>`,
        ).join('')}
      </div>
      <div class="sc-footer">
        <span>Presioná <kbd>Esc</kbd> para cerrar</span>
        <span style="opacity:.6;">·</span>
        <span>Si tu cuenta tiene Mac, ⌘ = <kbd>Cmd</kbd>; en Windows = <kbd>Ctrl</kbd></span>
      </div>
    </div>`;
  document.body.appendChild(overlayEl);

  const close = () => {
    overlayEl?.remove();
    overlayEl = null;
  };
  overlayEl.querySelector('.sc-backdrop').addEventListener('click', close);
  overlayEl.querySelector('.sc-close').addEventListener('click', close);
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
};

export const closeShortcuts = () => {
  overlayEl?.remove();
  overlayEl = null;
};

export const initShortcuts = () => {
  if (!document.getElementById('sc-style')) {
    const style = document.createElement('style');
    style.id = 'sc-style';
    style.textContent = SC_STYLES;
    document.head.appendChild(style);
  }

  document.addEventListener('keydown', (e) => {
    // No disparar dentro de inputs/textareas
    const tag = (document.activeElement?.tagName ?? '').toUpperCase();
    if (['INPUT', 'TEXTAREA'].includes(tag) || document.activeElement?.isContentEditable) return;
    if (e.key === '?') {
      e.preventDefault();
      openShortcuts();
      return;
    }
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      openShortcuts();
    }
  });
};

const SC_STYLES = `
.sc-overlay { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; animation: scIn .14s ease; }
@keyframes scIn { from { opacity: 0; } to { opacity: 1; } }
.sc-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.7); backdrop-filter: blur(4px); }
.sc-card {
  position: relative; width: min(680px, calc(100% - 32px)); max-height: 86vh; display: flex; flex-direction: column;
  background: var(--surface, #141418); border: 1px solid var(--border, #2a2a32);
  border-radius: 18px; overflow: hidden; box-shadow: 0 24px 60px rgba(0,0,0,.55);
  animation: scSlide .22s cubic-bezier(.16,.84,.44,1);
}
@keyframes scSlide { from { opacity: 0; transform: translateY(10px) scale(.98); } to { opacity: 1; transform: none; } }
.sc-header {
  display: flex; align-items: center; justify-content: space-between; gap: 14px;
  padding: 18px 20px; border-bottom: 1px solid var(--border, #2a2a32);
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(168,85,247,.1));
}
.sc-title { font-size: 18px; font-weight: 800; }
.sc-sub { font-size: 12.5px; color: var(--text-muted, #9CA3AF); margin-top: 2px; }
.sc-close {
  background: transparent; border: 0; color: var(--fg, #fff); cursor: pointer;
  font-size: 18px; width: 32px; height: 32px; border-radius: 8px;
}
.sc-close:hover { background: rgba(255,255,255,.08); }
.sc-body { padding: 14px 16px; overflow-y: auto; flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
@media (max-width: 640px) { .sc-body { grid-template-columns: 1fr; } }
.sc-group-label { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--text-muted, #9CA3AF); margin-bottom: 8px; }
.sc-items { display: flex; flex-direction: column; gap: 6px; }
.sc-item {
  display: grid; grid-template-columns: auto 1fr; gap: 10px; padding: 7px 10px;
  background: rgba(255,255,255,.02); border: 1px solid rgba(255,255,255,.04);
  border-radius: 8px; align-items: center;
}
.sc-keys { display: flex; gap: 4px; align-items: center; flex-wrap: wrap; }
.sc-desc { font-size: 12.5px; line-height: 1.4; }
.sc-alt { grid-column: 1 / -1; font-size: 11px; color: var(--text-muted, #9CA3AF); margin-top: 2px; display: flex; gap: 4px; align-items: center; }
.sc-overlay kbd {
  background: var(--bg-elev, #1c1c22); border: 1px solid var(--border, #2a2a32);
  border-radius: 5px; padding: 2px 7px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  font-size: 11px; font-weight: 600; box-shadow: 0 1px 0 var(--border, #2a2a32);
  min-width: 18px; text-align: center;
}
.sc-token {
  background: rgba(168,85,247,.15); color: #d8b4fe; border: 1px solid rgba(168,85,247,.3);
  border-radius: 5px; padding: 1px 7px; font-size: 11px; font-weight: 600;
}
.sc-plus { color: var(--text-muted, #9CA3AF); font-size: 11px; padding: 0 2px; }
.sc-footer {
  display: flex; gap: 8px; align-items: center; padding: 12px 18px;
  border-top: 1px solid var(--border, #2a2a32); font-size: 11.5px; color: var(--text-muted, #9CA3AF);
}
`;
