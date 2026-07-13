/* ══════════════════════════════════════════════════════════════════════════════
   RITUALS — Rituales diarios (mañana, noche, lunes, viernes)
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const TYPE_EMOJI = { morning: '☀️', evening: '🌙', 'monday-kickoff': '🎯', 'friday-close': '🍻' };
const TYPE_LABEL = {
  morning: 'Mañana',
  evening: 'Noche',
  'monday-kickoff': 'Lunes Kickoff',
  'friday-close': 'Cierre Viernes',
};

const renderRitualCard = (r) => `
  <div class="card">
    <div class="meta">
      <span style="font-size:24px;">${TYPE_EMOJI[r.type] ?? '✨'}</span>
      <span class="tag tiny">${TYPE_LABEL[r.type] ?? r.type}</span>
      <span class="small muted">${new Date(r.deliveredAt).toLocaleString('es-AR')}</span>
    </div>
    <h3 style="margin:8px 0 4px;">${escape(r.headline ?? '')}</h3>
    <p style="font-style:italic;color:var(--text-muted);">${escape(r.body ?? '')}</p>
    ${r.tipOfTheDay ? `<div class="small accent" style="margin-top:8px;"><strong>💡 Tip:</strong> ${escape(r.tipOfTheDay)}</div>` : ''}
    ${r.actionItems?.length ? `<ul style="margin-top:8px;padding-left:20px;">${r.actionItems.map((a) => `<li>${escape(a)}</li>`).join('')}</ul>` : ''}
    ${r.kpiHighlight ? `<div class="small" style="margin-top:8px;"><strong>${escape(r.kpiHighlight.label)}:</strong> ${escape(r.kpiHighlight.value)}</div>` : ''}
    ${!r.acknowledged ? `<button class="btn small" data-ack="${escape(r.id)}" style="margin-top:10px;">✓ Vi esto</button>` : '<div class="small ok" style="margin-top:8px;">✓ Acknowledged</div>'}
  </div>`;

export const renderRituals = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>☀️ Rituales</h1>
      <p class="muted">Mañana, noche, lunes y viernes. El ritmo de tu casa.</p>
    </div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px;">
      <button class="btn" data-trigger="morning">☀️ Generar ritual matutino</button>
      <button class="btn" data-trigger="evening">🌙 Generar ritual nocturno</button>
      <button class="btn" data-trigger="monday">🎯 Generar Monday kickoff</button>
      <button class="btn" data-trigger="friday">🍻 Generar cierre del viernes</button>
    </div>
    <div id="snapshot" class="stats-grid" style="margin-bottom:20px;"></div>
    <div id="rituals-grid"></div>
  `;

  const [snapRes, ritRes] = await Promise.all([
    apiSafe('/api/rituals/snapshot', { totalDelivered: 0, thisWeekCount: 0, streak: 0, ackRate: 0 }),
    apiSafe('/api/rituals?limit=14', []),
  ]);
  const snapshot = snapRes.data ?? { totalDelivered: 0, thisWeekCount: 0, streak: 0, ackRate: 0 };
  const rituals = ritRes.data ?? [];
  const isOffline = !!snapRes.error && !!ritRes.error;

  document.getElementById('snapshot').innerHTML = `
    <div class="card stat-card"><div class="stat-label">Total entregados</div><div class="stat-value">${snapshot.totalDelivered}</div></div>
    <div class="card stat-card"><div class="stat-label">Esta semana</div><div class="stat-value">${snapshot.thisWeekCount}</div></div>
    <div class="card stat-card"><div class="stat-label">Streak</div><div class="stat-value">${snapshot.streak} días</div></div>
    <div class="card stat-card"><div class="stat-label">Acknowledgment</div><div class="stat-value">${snapshot.ackRate?.toFixed(0) ?? 0}%</div></div>
  `;

  document.getElementById('rituals-grid').innerHTML =
    rituals.length > 0
      ? rituals.map(renderRitualCard).join('')
      : isOffline
        ? '<div class="empty-state">📡 Sin conexión al backend. Los rituales se cargarán cuando el servidor vuelva.</div>'
        : '<div class="empty-state">Aún no hay rituales. Generá uno con los botones arriba.</div>';

  container.addEventListener('click', async (e) => {
    const triggerBtn = e.target.closest('[data-trigger]');
    if (triggerBtn) {
      const type = triggerBtn.dataset.trigger;
      toast(`Generando ritual ${type}...`, 'info');
      apiBust('/api/rituals');
      const { error: genErr } = await apiSafe(`/api/rituals/${type}`, null, { method: 'POST', body: {} });
      if (genErr) {
        toast('No se pudo generar el ritual (offline)', 'warn');
        return;
      }
      renderRituals(container);
      return;
    }
    const ackBtn = e.target.closest('[data-ack]');
    if (ackBtn) {
      await apiSafe(`/api/rituals/${ackBtn.dataset.ack}/ack`, null, { method: 'POST', body: {} });
      ackBtn.replaceWith(
        Object.assign(document.createElement('div'), {
          className: 'small ok',
          textContent: '✓ Acknowledged',
          style: 'margin-top:8px;',
        }),
      );
    }
  });
};
