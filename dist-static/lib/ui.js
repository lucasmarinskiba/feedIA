/* ════════════════════════════════════════════════════════
   Shared UI helpers — used across all view modules
   ════════════════════════════════════════════════════════ */

/** Bloque skeleton (shimmer) reutilizable. */
export const skeletonBlock = (h = 16, w = '100%', mt = 10, r = 8) =>
  `<div class="skeleton" style="height:${h}px;width:${w};margin-top:${mt}px;border-radius:${r}px;"></div>`;

/**
 * Loading screen. Por defecto muestra un SKELETON (mejor performance
 * percibida que un spinner). `variant='spinner'` mantiene el spinner clásico.
 * Drop-in: conserva la clase .loading-screen y el parámetro msg.
 */
export const loadingScreen = (msg = 'cargando…', variant = 'skeleton') => {
  if (variant === 'spinner') {
    return `<div class="loading-screen"><span class="spinner"></span> ${msg}</div>`;
  }
  return `<div class="loading-screen" aria-busy="true" aria-label="${msg}" style="display:block;padding:4px 2px;">
    <div class="skeleton" style="height:34px;width:42%;border-radius:10px;"></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
      ${[0, 1, 2]
        .map(
          () => `<div class="card" style="padding:18px;">
        ${skeletonBlock(22, '60%', 0)}${skeletonBlock(14, '100%')}${skeletonBlock(14, '85%')}${skeletonBlock(14, '40%')}
      </div>`,
        )
        .join('')}
    </div>
    <div class="card" style="margin-top:14px;padding:18px;">
      ${skeletonBlock(16, '30%', 0)}${skeletonBlock(13, '100%')}${skeletonBlock(13, '92%')}${skeletonBlock(13, '70%')}
    </div>
  </div>`;
};

/** Empty / placeholder state card */
export const emptyState = (icon, msg, minHeight = 420) =>
  `<div class="card" style="display:flex;align-items:center;justify-content:center;min-height:${minHeight}px;flex-direction:column;gap:10px;text-align:center;">
    <div style="font-size:52px;opacity:0.22;line-height:1;">${icon}</div>
    <div class="muted small" style="max-width:280px;line-height:1.5">${msg}</div>
    <button class="btn ghost tiny" onclick="window.openCommandPalette&&window.openCommandPalette()" style="margin-top:6px;">⌘K · Pedile algo a tu equipo</button>
  </div>`;

/** Error alert card */
export const errorAlert = (msg) => `<div class="alert crit" style="margin:20px 0">⚠️ ${msg}</div>`;

/**
 * Disable btn, show spinner, run async fn, restore btn.
 * Stores original innerHTML on btn._html so callers don't need to.
 */
export const withBtnSpinner = async (btn, spinLabel, fn) => {
  const original = btn._html ?? btn.innerHTML;
  btn._html = original;
  btn.disabled = true;
  btn.innerHTML = `<span class="spinner"></span> ${spinLabel}`;
  try {
    await fn();
  } finally {
    btn.disabled = false;
    btn.innerHTML = original;
  }
};
