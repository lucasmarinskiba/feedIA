/* ══════════════════════════════════════════════════════════════════════════════
   TU EQUIPO EN VIVO — el sistema, humanizado
   ──────────────────────────────────────────────────────────────────────────────
   No son "logs": es Nova escribiendo, Lía atendiendo, Gard validando.
   Refresca cada 6s. Refuerza que el usuario comanda personas, no software.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { loadingScreen } from '../lib/ui.js';

let timer = null;
const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
window.addEventListener('beforeunload', stop);
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'equipo') stop();
});

const paint = (root, items) => {
  const host = root.querySelector('#eq-body');
  if (!host) return;
  if (!items.length) {
    host.innerHTML = `<div class="card" style="text-align:center;padding:30px;"><div class="muted">Tu equipo está esperando tu primera indicación. Pedí algo y miralos trabajar.</div></div>`;
    return;
  }
  // Roster activo (únicos) arriba, como "staff online".
  const seen = new Map();
  for (const i of items) if (!seen.has(i.quien)) seen.set(i.quien, i);
  host.innerHTML = `
    <div class="card">
      <b class="small">Staff en línea</b>
      <div class="meta" style="margin-top:8px;flex-wrap:wrap;gap:6px;">
        ${[...seen.values()].map((m) => `<span class="tag tiny" title="${escape(m.rol)}">${m.emoji} ${escape(m.quien)} · activo</span>`).join('')}
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <b class="small">Actividad del equipo</b>
      <div style="margin-top:10px;display:flex;flex-direction:column;gap:2px;">
        ${items
          .map(
            (i) => `
          <div class="row" style="gap:10px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--border);">
            <span style="font-size:18px;line-height:1.2;">${i.emoji}</span>
            <div style="flex:1;min-width:0;">
              <div class="small"><b>${escape(i.quien)}</b> <span class="muted">${escape(i.rol)}</span></div>
              <div class="small">${escape(i.accion)}</div>
            </div>
            <span class="tiny muted" style="white-space:nowrap;">${fmt.rel(i.cuando)}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
};

export const renderEquipo = async (root) => {
  stop();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">👥 Tu equipo en vivo</h1>
        <p class="view-subtitle page-subtitle">No tenés software corriendo: tenés a Nova, Lía, Luca, Gard y el resto trabajando para vos ahora.</p>
      </div>
    </header>
    <div id="eq-body" class="page-body">${loadingScreen()}</div>`;

  const tick = async () => {
    const { data: items, error } = await apiSafe('/api/experience/activity', []);
    if (items && items.length > 0) {
      paint(root, items);
    } else if (error) {
      const host = root.querySelector('#eq-body');
      if (host) {
        host.innerHTML = `
          <div style="text-align:center;padding:40px 24px;">
            <div style="font-size:48px;margin-bottom:14px;">📡</div>
            <h2 style="margin:0 0 8px;">Tu equipo está en pausa</h2>
            <p class="small muted" style="max-width:480px;margin:0 auto;line-height:1.5;">
              El backend está offline. Cuando vuelva, vas a ver la actividad humanizada del equipo
              (Nova publicando, Lía respondiendo DMs, Luca cerrando leads, etc.).
            </p>
          </div>`;
      }
    } else {
      paint(root, []);
    }
  };
  await tick();
  timer = setInterval(tick, 6000);
};
