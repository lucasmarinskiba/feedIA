/* ══════════════════════════════════════════════════════════════════════════════
   offlineBanner.js — Banner persistente cuando el backend está caído
   ──────────────────────────────────────────────────────────────────────────────
   Hace ping a /api/health (o /api/home/identity como fallback) cada 30s.
   Si N fallos consecutivos → muestra banner. Cuando vuelve → desaparece con fade.
   ══════════════════════════════════════════════════════════════════════════════ */

const PING_INTERVAL_MS = 60_000;
const FAIL_THRESHOLD = 4; // 4 fallos consecutivos (≈4min) para considerar offline
let failures = 0;
let bannerEl = null;
let timer = null;
let isOnline = true;

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const showBanner = () => {
  if (bannerEl) return;
  bannerEl = document.createElement('div');
  bannerEl.id = 'feedia-offline-banner';
  bannerEl.innerHTML = `
    <div class="ob-icon">📡</div>
    <div class="ob-body">
      <strong>Sin conexión al backend</strong>
      <div class="ob-sub">La UI sigue funcionando con datos locales. Cuando vuelva el servidor, se sincroniza automáticamente.</div>
    </div>
    <button class="ob-retry" id="ob-retry">↻ Reintentar</button>
    <button class="ob-close" id="ob-close" aria-label="Ocultar">✕</button>`;
  document.body.appendChild(bannerEl);

  bannerEl.querySelector('#ob-retry').addEventListener('click', () => {
    void ping(true);
  });
  bannerEl.querySelector('#ob-close').addEventListener('click', () => {
    bannerEl?.remove();
    bannerEl = null;
  });

  // Estilos una sola vez
  if (!document.getElementById('ob-style')) {
    const style = document.createElement('style');
    style.id = 'ob-style';
    style.textContent = OB_STYLES;
    document.head.appendChild(style);
  }
};

const hideBanner = () => {
  if (!bannerEl) return;
  bannerEl.classList.add('ob-fade-out');
  setTimeout(() => {
    bannerEl?.remove();
    bannerEl = null;
  }, 280);
};

const ping = async (manual = false) => {
  try {
    // Probamos /api/health primero. Si no existe, fallback a /api/home/identity.
    let res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
      res = await fetch('/api/home/identity', { method: 'GET', cache: 'no-store' });
    }
    if (!res.ok) throw new Error('not ok');
    if (!res.headers.get('content-type')?.includes('json')) throw new Error('html response');
    // Online
    failures = 0;
    if (!isOnline) {
      isOnline = true;
      // Toast suave de "volvió"
      if (typeof window.__feediaToast === 'function') {
        window.__feediaToast('✓ Backend conectado', 'ok');
      }
    }
    hideBanner();
  } catch {
    failures++;
    if (failures >= FAIL_THRESHOLD) {
      isOnline = false;
      showBanner();
    }
    if (manual && failures > 0) {
      // Sin toast, el botón Reintentar ya da feedback visual
    }
  }
};

export const initOfflineBanner = () => {
  // Primer ping después de 4s (no apurar el boot)
  setTimeout(() => void ping(), 4000);
  timer = setInterval(() => {
    if (!document.hidden) void ping();
  }, PING_INTERVAL_MS);

  // Cuando la pestaña vuelve a estar visible, ping inmediato
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void ping();
  });

  // Listener removido — apiSafe ya maneja errores localmente con fallbacks.
  // El ping a /api/health es la única señal de health del banner.
};

export const stopOfflineBanner = () => {
  if (timer) clearInterval(timer);
  hideBanner();
};

const OB_STYLES = `
#feedia-offline-banner {
  position: fixed; top: 14px; left: 50%; transform: translateX(-50%);
  z-index: 9990; display: flex; align-items: center; gap: 12px;
  padding: 10px 14px 10px 12px;
  background: linear-gradient(135deg, #1a1f3a, #2a1f3a);
  border: 1px solid rgba(245,158,11,.4);
  border-radius: 14px;
  box-shadow: 0 12px 36px rgba(0,0,0,.45), 0 0 0 1px rgba(245,158,11,.18);
  color: #fff; max-width: 92vw; animation: obSlide .26s cubic-bezier(.16,.84,.44,1);
}
@keyframes obSlide { from { opacity: 0; transform: translate(-50%, -8px); } to { opacity: 1; transform: translate(-50%, 0); } }
#feedia-offline-banner.ob-fade-out { animation: obFadeOut .26s ease forwards; }
@keyframes obFadeOut { to { opacity: 0; transform: translate(-50%, -8px); } }
.ob-icon { font-size: 22px; line-height: 1; flex-shrink: 0; animation: obPulse 1.6s ease-in-out infinite; }
@keyframes obPulse { 0%,100% { opacity: 1; } 50% { opacity: .55; } }
.ob-body strong { font-size: 13.5px; }
.ob-sub { font-size: 11.5px; color: rgba(255,255,255,.7); margin-top: 2px; line-height: 1.4; max-width: 460px; }
.ob-retry, .ob-close {
  background: transparent; border: 1px solid rgba(255,255,255,.15);
  color: #fff; cursor: pointer; padding: 6px 10px; border-radius: 8px;
  font-size: 12px; font-weight: 600; flex-shrink: 0;
}
.ob-retry { background: linear-gradient(135deg, #6366f1, #a855f7); border-color: transparent; }
.ob-retry:hover { filter: brightness(1.12); }
.ob-close { padding: 5px 8px; border: 0; font-size: 14px; opacity: .6; }
.ob-close:hover { opacity: 1; background: rgba(255,255,255,.08); }
@media (max-width: 640px) {
  #feedia-offline-banner { left: 8px; right: 8px; transform: none; max-width: calc(100vw - 16px); }
  .ob-sub { display: none; }
  @keyframes obSlide { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: none; } }
  #feedia-offline-banner.ob-fade-out { animation: obFadeOutMobile .26s ease forwards; }
  @keyframes obFadeOutMobile { to { opacity: 0; transform: translateY(-8px); } }
}
`;
