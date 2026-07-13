/* ══════════════════════════════════════════════════════════════════════════════
   SIAMESE SWITCHER — botón flotante para saltar al gemelo (feedia-next).
   ──────────────────────────────────────────────────────────────────────────────
   - Detecta hash actual y traduce a path del gemelo
   - Emite passport (one-shot) → redirige con session attached
   - Pulsa estado de salud del gemelo cada 60s
   ══════════════════════════════════════════════════════════════════════════════ */

const NEXT_HOST = 'https://feedia-next.vercel.app';

const HASH_TO_PATH = {
  home: '/welcome',
  imperio: '/imperio',
  mission: '/dashboard',
  agenda: '/agenda',
  calendar: '/calendar',
  feed: '/feed',
  predictor: '/predictor',
  'brand-os': '/brand-os',
  'cu-queue': '/cu-queue',
  brain: '/brain',
  approvals: '/approvals',
  equipo: '/growth-team',
  computeruse: '/cu-queue',
  simulator: '/simulator',
  tiktok: '/studio/tiktok-script',
};

const targetPathFromHash = () => {
  const h = (location.hash || '#home').replace(/^#/, '').split('?')[0];
  return HASH_TO_PATH[h] || '/welcome';
};

const issuePassport = async (targetPath) => {
  try {
    const r = await fetch('/api/bridge/passport', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ targetRoute: targetPath }),
    });
    if (!r.ok) throw new Error(`passport ${r.status}`);
    const j = await r.json();
    return j.redirect;
  } catch {
    // fallback: sin passport, solo redirect plano
    return `${NEXT_HOST}${targetPath}`;
  }
};

const pingTwin = async () => {
  try {
    const r = await fetch('/api/bridge/twin-status', { cache: 'no-store' });
    const j = await r.json();
    return j.twinAlive === true;
  } catch {
    return false;
  }
};

const mount = () => {
  if (document.querySelector('#siamese-switcher')) return;
  const el = document.createElement('div');
  el.id = 'siamese-switcher';
  el.innerHTML = `
    <button class="ss-btn" id="ss-go" title="Abrir vista equivalente en FeedIA Next (sesión compartida)">
      <span class="ss-dot" data-state="check"></span>
      <span class="ss-text">Next ↗</span>
    </button>
    <style>
      #siamese-switcher{position:fixed;bottom:18px;left:18px;z-index:9998;font-family:inherit;}
      .ss-btn{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:rgba(10,10,10,.85);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12), 0 8px 24px rgba(0,0,0,.4);color:#fafafa;font-size:12px;font-weight:600;letter-spacing:-.005em;cursor:pointer;border:0;transition:box-shadow .15s, transform .12s;}
      .ss-btn:hover{box-shadow:inset 0 0 0 1px rgba(255,255,255,.22), 0 10px 28px rgba(0,0,0,.5);transform:translateY(-1px);}
      .ss-dot{width:7px;height:7px;border-radius:50%;background:#a1a1aa;box-shadow:0 0 8px rgba(161,161,170,.5);transition:background .2s,box-shadow .2s;}
      .ss-dot[data-state="ok"]{background:#10b981;box-shadow:0 0 10px rgba(16,185,129,.7);}
      .ss-dot[data-state="off"]{background:#ef4444;box-shadow:0 0 10px rgba(239,68,68,.6);}
      :root[data-theme="light"] .ss-btn{background:rgba(255,255,255,.92);color:#16171c;box-shadow:inset 0 0 0 1px rgba(17,18,22,.14), 0 8px 24px rgba(20,22,30,.15);}
      :root[data-theme="light"] .ss-btn:hover{box-shadow:inset 0 0 0 1px rgba(17,18,22,.28), 0 10px 28px rgba(20,22,30,.22);}
      @media (max-width: 720px){ #siamese-switcher{bottom:18px;left:12px;} }
    </style>
  `;
  document.body.appendChild(el);

  const dot = el.querySelector('.ss-dot');
  const btn = el.querySelector('#ss-go');
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const path = targetPathFromHash();
    const url = await issuePassport(path);
    window.open(url, '_blank', 'noopener');
    btn.disabled = false;
  });

  const refresh = async () => {
    const alive = await pingTwin();
    dot.setAttribute('data-state', alive ? 'ok' : 'off');
    btn.title = alive ? 'Abrir vista equivalente en FeedIA Next' : 'FeedIA Next no responde — reintentando…';
  };
  refresh();
  setInterval(refresh, 60000);
};

// Passport consumer — si llega ?passport=psp_xxx del gemelo, lo resuelve via twin proxy.
const consumePassport = async () => {
  const u = new URL(location.href);
  const id = u.searchParams.get('passport');
  if (!id) return;
  try {
    const r = await fetch(`/api/twin/bridge/passport?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!r.ok) return;
    const j = await r.json();
    if (j.brandSnapshot)
      try {
        localStorage.setItem('feedia.brand', JSON.stringify(j.brandSnapshot));
      } catch {
        /* noop */
      }
    if (j.identitySnapshot)
      try {
        localStorage.setItem('feedia.identity', JSON.stringify(j.identitySnapshot));
      } catch {
        /* noop */
      }
    try {
      sessionStorage.setItem('feedia.siamese.synced', JSON.stringify({ at: Date.now(), from: j.from }));
    } catch {
      /* noop */
    }
  } catch {
    /* noop */
  } finally {
    u.searchParams.delete('passport');
    history.replaceState({}, '', u.toString());
  }
};

// Auto-mount on DOMReady
if (document.readyState === 'loading')
  document.addEventListener('DOMContentLoaded', () => {
    mount();
    consumePassport();
  });
else {
  mount();
  consumePassport();
}
