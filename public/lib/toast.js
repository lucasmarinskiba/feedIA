/* ════════════════════════════════════════════════════════
   Toast — notificaciones accesibles, profesionales y amigables
   API compatible: toast(msg, kind?, opts?)
     kind: 'info' | 'ok' | 'warn' | 'crit'  (alias: success→ok, error→crit)
     opts: { duration?:number, action?:{label, onClick} }
   ════════════════════════════════════════════════════════ */

const ICON = { info: 'ℹ️', ok: '✅', warn: '⚠️', crit: '⛔' };
const ALIAS = { success: 'ok', error: 'crit', danger: 'crit', warning: 'warn' };
const DEFAULT_MS = { info: 4200, ok: 4200, warn: 6000, crit: 8000 };

let booted = false;
const boot = () => {
  if (booted) return;
  booted = true;
  if (!document.querySelector('#toast-stack')) {
    const s = document.createElement('div');
    s.id = 'toast-stack';
    s.setAttribute('role', 'status');
    s.setAttribute('aria-live', 'polite');
    document.body.appendChild(s);
  }
  if (!document.querySelector('#toast-style')) {
    const st = document.createElement('style');
    st.id = 'toast-style';
    st.textContent = `
      #toast-stack{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:10050;
        display:flex;flex-direction:column;gap:10px;align-items:center;pointer-events:none;width:max-content;max-width:92vw;}
      .toast{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;min-width:260px;max-width:440px;
        background:#17171f;color:#eef;border:1px solid #2c2c38;border-left:3px solid #5b9bff;
        border-radius:12px;padding:13px 14px 13px 15px;box-shadow:0 14px 40px rgba(0,0,0,.5);
        font-size:14px;line-height:1.45;position:relative;overflow:hidden;
        animation:tin .26s cubic-bezier(.2,.8,.2,1);}
      @keyframes tin{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}
      .toast.tout{animation:tout .22s ease forwards}
      @keyframes tout{to{transform:translateY(10px);opacity:0}}
      .toast.ok{border-left-color:#4ade80}.toast.warn{border-left-color:#fbbf24}
      .toast.crit{border-left-color:#f87171}.toast.info{border-left-color:#5b9bff}
      .toast .t-ic{font-size:15px;line-height:1.3;flex-shrink:0;}
      .toast .t-tx{flex:1;min-width:0;word-break:break-word;}
      .toast .t-x{background:none;border:0;color:#8a8a98;cursor:pointer;font-size:15px;
        line-height:1;padding:2px 4px;border-radius:6px;flex-shrink:0;}
      .toast .t-x:hover{color:#fff;background:rgba(255,255,255,.08);}
      .toast .t-act{background:none;border:0;color:#cbb6f5;font-weight:700;cursor:pointer;
        font-size:13px;padding:4px 0;margin-top:4px;text-align:left;}
      .toast .t-bar{position:absolute;left:0;bottom:0;height:2px;width:100%;
        background:linear-gradient(90deg,#e1306c,#a855f7);transform-origin:left;animation:tbar linear forwards;}
      .toast:hover .t-bar{animation-play-state:paused;}
      @keyframes tbar{from{transform:scaleX(1)}to{transform:scaleX(0)}}
      @media (prefers-reduced-motion:reduce){.toast,.toast .t-bar{animation:none!important}}`;
    document.head.appendChild(st);
  }
};

export const toast = (msg, kind = 'info', opts = {}) => {
  boot();
  const k = ALIAS[kind] || kind;
  const stack = document.querySelector('#toast-stack');
  if (!stack) return;
  // Tope de 4 visibles: saca el más viejo.
  while (stack.children.length >= 4) stack.firstElementChild?.remove();

  const ms = opts.duration ?? DEFAULT_MS[k] ?? 4200;
  const el = document.createElement('div');
  el.className = `toast ${k}`;
  const safe = String(msg);
  el.innerHTML = `
    <span class="t-ic">${ICON[k] || ICON.info}</span>
    <div class="t-tx"></div>
    <button class="t-x" aria-label="Cerrar">✕</button>
    <span class="t-bar" style="animation-duration:${ms}ms"></span>`;
  el.querySelector('.t-tx').textContent = safe;

  if (opts.action && typeof opts.action.onClick === 'function') {
    const a = document.createElement('button');
    a.className = 't-act';
    a.textContent = opts.action.label || 'Ver';
    a.addEventListener('click', () => {
      try {
        opts.action.onClick();
      } finally {
        dismiss();
      }
    });
    el.querySelector('.t-tx').appendChild(document.createElement('br'));
    el.querySelector('.t-tx').appendChild(a);
  }

  let timer = null;
  const dismiss = () => {
    clearTimeout(timer);
    el.classList.add('tout');
    setTimeout(() => el.remove(), 220);
  };
  el.querySelector('.t-x').addEventListener('click', dismiss);
  // Pausa al pasar el mouse (control del usuario).
  el.addEventListener('mouseenter', () => clearTimeout(timer));
  el.addEventListener('mouseleave', () => {
    timer = setTimeout(dismiss, 1400);
  });

  stack.appendChild(el);
  timer = setTimeout(dismiss, ms);
  return dismiss;
};
