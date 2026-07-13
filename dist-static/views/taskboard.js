/* ══════════════════════════════════════════════════════════════════════════════
   TASKBOARD — Kanban del equipo + workload + daily standup
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const STATUS_LABEL = {
  todo: '📋 Por hacer',
  doing: '🔄 En progreso',
  done: '✅ Hecho',
  blocked: '⛔ Bloqueado',
  cancelled: '🚫 Cancelado',
};
const PRIORITY_COLOR = { critical: '#EF4444', high: '#F59E0B', normal: '#3B82F6', low: '#9CA3AF' };

const renderTaskCard = (t) => `
  <div class="card" style="margin-bottom:8px;padding:10px;border-left:3px solid ${PRIORITY_COLOR[t.priority] ?? '#9CA3AF'};">
    <div class="small"><strong>${escape(t.title)}</strong></div>
    <div class="small muted" style="margin:4px 0;">@${escape(t.assignedTo)} · ${t.estimatedHours}h · ${escape(t.priority)}</div>
    ${t.dueDate ? `<div class="small">📅 ${escape(t.dueDate)}</div>` : ''}
    <div style="display:flex;gap:4px;margin-top:6px;">
      ${['todo', 'doing', 'done', 'blocked']
        .filter((s) => s !== t.status)
        .map(
          (s) =>
            `<button class="btn tiny" data-move="${escape(t.id)}" data-status="${s}">${STATUS_LABEL[s].split(' ')[0]}</button>`,
        )
        .join('')}
    </div>
  </div>`;

export const renderTaskboard = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>📋 Task Board</h1>
      <p class="muted">Kanban del equipo. Lo que hace cada agente.</p>
    </div>
    <div id="standup" class="card" style="margin-bottom:18px;"></div>
    <div id="workload" class="stats-grid" style="margin-bottom:18px;"></div>
    <div id="kanban" style="overflow-x:auto;"></div>
  `;

  const [kR, wR, stR] = await Promise.all([
    apiSafe('/api/tasks/kanban', {}),
    apiSafe('/api/tasks/workload', []),
    apiSafe('/api/tasks/standup', {
      date: new Date().toISOString().split('T')[0],
      totalDoing: 0,
      totalBlocked: 0,
      criticalDueToday: [],
    }),
  ]);
  const kanban = kR.data && typeof kR.data === 'object' && !kR.data.demoMode ? kR.data : {};
  const workload = Array.isArray(wR.data) ? wR.data : [];
  const stDef = { date: new Date().toISOString().split('T')[0], totalDoing: 0, totalBlocked: 0, criticalDueToday: [] };
  const standup =
    stR.data && typeof stR.data === 'object' && !stR.data.demoMode
      ? {
          ...stDef,
          ...stR.data,
          criticalDueToday: Array.isArray(stR.data.criticalDueToday) ? stR.data.criticalDueToday : [],
        }
      : stDef;
  const isOffline = !!kR.error && !!wR.error;
  if (isOffline) {
    container.innerHTML = `
      <div class="page-header"><h1>📋 Task Board</h1></div>
      <div style="text-align:center;padding:40px 24px;">
        <div style="font-size:48px;margin-bottom:14px;">📡</div>
        <h2>Sin conexión al backend</h2>
        <p class="small muted">El Task Board se cargará cuando el servidor vuelva.</p>
      </div>`;
    return;
  }

  // Standup
  document.getElementById('standup').innerHTML = `
    <h3>☀️ Standup de hoy (${standup.date})</h3>
    <div class="small">
      <strong>${standup.totalDoing}</strong> en progreso ·
      <strong>${standup.totalBlocked}</strong> bloqueadas ·
      <strong>${standup.criticalDueToday.length}</strong> críticas para hoy
    </div>
    ${
      standup.criticalDueToday.length
        ? `
      <div class="small crit" style="margin-top:8px;">
        <strong>⚠️ Críticas hoy:</strong>
        ${standup.criticalDueToday.map((t) => escape(t.title)).join(', ')}
      </div>`
        : ''
    }
  `;

  // Workload
  document.getElementById('workload').innerHTML = workload
    .slice(0, 10)
    .map(
      (w) => `
    <div class="card stat-card">
      <div class="stat-label">@${escape(w.name)}</div>
      <div class="stat-value">${w.activeTasks}</div>
      <div class="small muted">${w.load}h estimadas</div>
      ${w.blockedTasks > 0 ? `<div class="small crit">${w.blockedTasks} bloqueadas</div>` : ''}
    </div>`,
    )
    .join('');

  // Kanban
  const cols = ['todo', 'doing', 'blocked', 'done'];
  document.getElementById('kanban').innerHTML = `
    <div style="display:grid;grid-template-columns:repeat(${cols.length}, minmax(260px, 1fr));gap:12px;">
      ${cols
        .map(
          (s) => `
        <div class="card kanban-col">
          <h4 style="margin:0 0 10px;">${STATUS_LABEL[s]} (${(kanban[s] ?? []).length})</h4>
          ${(kanban[s] ?? []).slice(0, 20).map(renderTaskCard).join('')}
        </div>`,
        )
        .join('')}
    </div>`;

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-move]');
    if (!btn) return;
    apiBust('/api/tasks');
    const { error } = await apiSafe(`/api/tasks/${btn.dataset.move}/status`, null, {
      method: 'POST',
      body: { status: btn.dataset.status },
    });
    if (error) {
      toast('Backend offline', 'warn');
      return;
    }
    toast(`Tarea movida a ${btn.dataset.status}`, 'success');
    renderTaskboard(container);
  });
};
