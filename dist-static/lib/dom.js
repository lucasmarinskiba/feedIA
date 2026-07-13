export const h = (tag, props = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (v === false || v === null || v === undefined) return;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else el.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null || c === false) return;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  });
  return el;
};

export const escape = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );

export const empty = (msg) => `<div class="empty">${escape(msg)}</div>`;

export const fmt = {
  num: (n) => (typeof n === 'number' ? n.toLocaleString() : '—'),
  date: (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString();
  },
  rel: (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h}h`;
    const d = Math.floor(h / 24);
    return `hace ${d}d`;
  },
};

export const setView = (root, html) => {
  root.innerHTML = html;
};

/* Detecta si estamos en un iframe sandbox (Claude Preview, etc.) que bloquea
   window.open hacia dominios externos. */
const isInSandboxedIframe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  } // cross-origin frame: asumir sandbox
};

/* Muestra un modal in-app con la URL para que el usuario la abra/copie sin
   depender de window.open (que el iframe bloquea). Se usa cuando openExternal
   detecta sandbox o cuando window.open devuelve null. */
const showExternalLinkModal = async (url) => {
  // Evitar duplicados
  document.querySelectorAll('.feedia-extlink-modal').forEach((m) => m.remove());

  const wrap = document.createElement('div');
  wrap.className = 'feedia-extlink-modal';
  wrap.innerHTML = `
    <div class="feedia-extlink-backdrop"></div>
    <div class="feedia-extlink-card">
      <div class="feedia-extlink-icon">🔗</div>
      <h3 class="feedia-extlink-title">Abrir en otra pestaña</h3>
      <p class="feedia-extlink-sub">Este entorno bloquea aperturas automáticas. Tocá el link para abrirlo en una pestaña nueva, o copialo.</p>
      <a class="feedia-extlink-url" href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
      <div class="feedia-extlink-actions">
        <button class="feedia-extlink-copy">📋 Copiar URL</button>
        <button class="feedia-extlink-close">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);

  const close = () => wrap.remove();
  wrap.querySelector('.feedia-extlink-backdrop').addEventListener('click', close);
  wrap.querySelector('.feedia-extlink-close').addEventListener('click', close);
  wrap.querySelector('.feedia-extlink-copy').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(url);
      const btn = wrap.querySelector('.feedia-extlink-copy');
      btn.textContent = '✓ Copiado';
      setTimeout(close, 800);
    } catch {
      /* noop */
    }
  });
  document.addEventListener('keydown', function onKey(e) {
    if (e.key === 'Escape') {
      close();
      document.removeEventListener('keydown', onKey);
    }
  });
};

/* Abre una URL externa con UX adaptado al entorno:
   - Si estamos en iframe sandboxeado: SIEMPRE muestra modal in-app (no intenta
     window.open porque sabemos que va a fallar y mostrar el banner de error).
   - Si no estamos en iframe: intenta window.open normal; si es bloqueado por
     popup blocker, muestra el modal como fallback.
   Devuelve { opened:true } si abrió en pestaña, { shownModal:true } si fallback. */
export const openExternal = async (url) => {
  if (!url) return { opened: false, shownModal: false, url };

  // Si estamos en iframe sandbox, NO intentar window.open (causa el banner).
  // Vamos directo al modal in-app.
  if (isInSandboxedIframe()) {
    await showExternalLinkModal(url);
    return { opened: false, shownModal: true, url };
  }

  // Entorno normal: intentar abrir en pestaña nueva
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer');
    if (w) return { opened: true, shownModal: false, url };
  } catch {
    /* popup bloqueado */
  }

  // Fallback final: modal
  await showExternalLinkModal(url);
  return { opened: false, shownModal: true, url };
};
