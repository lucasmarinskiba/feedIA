/* ══════════════════════════════════════════════════════════════════════════════
   USAGE WIDGET · Cupo mensual (carruseles / videos) en el topbar
   Lee GET /api/user/tier?userId=X (mismo endpoint que ya usa el resto de la app
   para tier/límites) y renderiza barras estilo panel de uso de Claude.
   Colores 100% vía var() tokens de style.css — se adaptan solos a claro/oscuro,
   sin lógica de tema acá.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, getUserId } from './api.js';

// createCarrusel(brand, idea, longitud='medio') genera 7-8 slides en 'medio'
// (ver SLIDE_COUNT_GUIDE en src/capabilities/content/carrusel.ts) — 7 como
// estimador conservador. Es un aproximado, se muestra como tal en la UI.
const AVG_SLIDES_PER_CAROUSEL = 7;

let pollTimer = null;

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const fmtRemaining = (resetsAt) => {
  const ms = new Date(resetsAt).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return 'muy pronto';
  const totalHours = Math.ceil(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days === 0) return `${hours}h`;
  if (hours === 0) return `${days}d`;
  return `${days}d ${hours}h`;
};

const barClass = (used, limit) => {
  if (limit <= 0) return '';
  const remainingPct = 1 - used / limit;
  if (remainingPct <= 0) return 'crit';
  if (remainingPct < 0.3) return 'warn';
  return '';
};

const renderRow = ({ icon, label, used, limit, sub }) => {
  if (limit <= 0) {
    return `
      <div class="usage-dd-row">
        <div class="usage-dd-row-top">
          <span class="usage-dd-label">${icon} ${escapeHtml(label)}</span>
          <span class="usage-dd-count">no incluido</span>
        </div>
      </div>`;
  }
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const cls = barClass(used, limit);
  return `
    <div class="usage-dd-row">
      <div class="usage-dd-row-top">
        <span class="usage-dd-label">${icon} ${escapeHtml(label)}</span>
        <span class="usage-dd-count">${used}/${limit}</span>
      </div>
      <div class="usage-dd-bar-track"><div class="usage-dd-bar-fill ${cls}" style="width:${pct}%"></div></div>
      ${sub ? `<div class="usage-dd-sub">${escapeHtml(sub)}</div>` : ''}
    </div>`;
};

const render = (info) => {
  const dd = document.getElementById('usage-dropdown');
  if (!dd) return;

  if (!info) {
    dd.innerHTML = `<div class="usage-dd-empty">No se pudo cargar tu cupo.</div>`;
    return;
  }

  const remainingCarousels = Math.max(0, (info.carouselsLimit ?? 0) - (info.carouselsUsed ?? 0));
  const estSlides = remainingCarousels * AVG_SLIDES_PER_CAROUSEL;

  // Subscription status badge
  const statusBadge =
    info.subscriptionStatus && info.subscriptionStatus !== 'active'
      ? `<div class="usage-dd-status-badge ${info.subscriptionStatus}">⚠️ ${escapeHtml(info.subscriptionStatus)}</div>`
      : '';

  // Renewal info from subscription cycle
  const renewalDate = info.subscriptionCycleEnd || info.resetsAt;
  const renewalText = renewalDate ? fmtRemaining(renewalDate) : 'N/A';

  dd.innerHTML = `
    <div class="usage-dd-header">
      <strong>Cupo mensual</strong>
      <span class="usage-dd-plan">${escapeHtml(info.tier || 'free')}</span>
    </div>
    ${statusBadge}
    ${renderRow({
      icon: '🖼️',
      label: 'Carruseles',
      used: info.carouselsUsed ?? 0,
      limit: info.carouselsLimit ?? 0,
      sub:
        remainingCarousels > 0 ? `≈ ${estSlides} slides estimados disponibles` : 'Sin carruseles disponibles este mes',
    })}
    ${renderRow({
      icon: '🎬',
      label: 'Videos (Reels/TikTok)',
      used: info.videosUsed ?? 0,
      limit: info.videosLimit ?? 0,
    })}
    <div class="usage-dd-reset">
      <span>🔄</span>
      <span>Se reinicia en ${escapeHtml(renewalText)}</span>
    </div>
    ${
      info.subscriptionStatus === 'failed_payment'
        ? `
      <div class="usage-dd-warning">
        <p>❌ Pago fallido</p>
        <a href="/api/subscription/subscription/retry-payment" class="usage-dd-action">Reintentar pago</a>
      </div>
    `
        : ''
    }
    ${
      info.subscriptionStatus === 'canceled'
        ? `
      <div class="usage-dd-warning">
        <p>📍 Suscripción cancelada</p>
        <a href="/api/subscription/subscription/reactivate" class="usage-dd-action">Reactivar</a>
      </div>
    `
        : ''
    }
    ${info.tier === 'free' || info.tier === 'starter' ? `<a class="usage-dd-upgrade" href="/pricing">Ver planes →</a>` : ''}
    ${
      info.paymentProvider && info.paymentProvider !== 'none'
        ? `
      <div class="usage-dd-footer">
        <small>Próximo pago: ${info.nextBillingDate ? escapeHtml(new Date(info.nextBillingDate).toLocaleDateString('es-AR')) : 'N/A'}</small>
      </div>
    `
        : ''
    }
  `;
};

const load = async () => {
  const userId = getUserId();
  if (!userId) return render(null);
  const { data } = await apiSafe(`/api/billing/tier?userId=${encodeURIComponent(userId)}`, null);
  render(data);
};

const closeDropdown = () => {
  const dd = document.getElementById('usage-dropdown');
  const btn = document.getElementById('topbar-usage');
  if (dd) dd.hidden = true;
  if (btn) btn.classList.remove('open');
};

const openDropdown = () => {
  const dd = document.getElementById('usage-dropdown');
  const btn = document.getElementById('topbar-usage');
  if (dd) dd.hidden = false;
  if (btn) btn.classList.add('open');
  load();
};

export const initUsageWidget = () => {
  const btn = document.getElementById('topbar-usage');
  const dd = document.getElementById('usage-dropdown');
  if (!btn || !dd) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dd.hidden) openDropdown();
    else closeDropdown();
  });

  dd.addEventListener('click', (e) => e.stopPropagation());

  document.addEventListener('click', (e) => {
    if (!dd.hidden && !dd.contains(e.target) && !btn.contains(e.target)) closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  // Refresca silenciosamente mientras está abierto, para que si el usuario
  // genera contenido en otra pestaña/vista el número no quede stale.
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!dd.hidden) load();
  }, 30000);
};
