/* ══════════════════════════════════════════════════════════════════════════════
   TASKS WIDGET · Tareas activas del equipo (standup + workload + kanban) en topbar
   Bubble interactiva en el topbar, mismo patrón que usageWidget.js — no navega
   a #taskboard. Permite filtrar por stat/agente y mover tareas sin salir del bubble.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from './api.js';
import { toast } from './toast.js';

const STATUS_ICON = { todo: '📋', doing: '🔄', done: '✅', blocked: '⛔' };
const PRIORITY_DOT = { critical: '#EF4444', high: '#F59E0B', normal: '#3B82F6', low: '#9CA3AF' };
const FILTER_TITLE = { doing: '🔄 En progreso', blocked: '⛔ Bloqueadas', critical: '⚠️ Críticas hoy' };

let pollTimer = null;
let lastInfo = null; // { standup, workload, kanban }
let filter = null; // { type: 'doing'|'blocked'|'critical'|'agent', agent?: string }

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const renderWorkloadRow = (w, isActive) => `
  <div class="tasks-dd-row tasks-dd-row-clickable${isActive ? ' active' : ''}" data-agent="${escapeHtml(w.agent)}">
    <span class="tasks-dd-label">@${escapeHtml(w.name)}</span>
    <span class="tasks-dd-count">${w.activeTasks} activas${w.blockedTasks > 0 ? ` · ${w.blockedTasks} bloqueadas` : ''}</span>
  </div>`;

const renderTaskCard = (t) => `
  <div class="tasks-dd-card">
    <div class="tasks-dd-card-top">
      <span class="tasks-dd-card-dot" style="background:${PRIORITY_DOT[t.priority] ?? '#9CA3AF'}"></span>
      <span class="tasks-dd-card-title">${escapeHtml(t.title)}</span>
    </div>
    <div class="tasks-dd-card-meta">@${escapeHtml(t.assignedTo)} · ${t.estimatedHours}h${t.dueDate ? ` · 📅 ${escapeHtml(t.dueDate)}` : ''}</div>
    <div class="tasks-dd-card-actions">
      ${['todo', 'doing', 'done', 'blocked']
        .filter((s) => s !== t.status)
        .map(
          (s) =>
            `<button class="tasks-dd-chip" data-move="${escapeHtml(t.id)}" data-status="${s}" title="Mover a ${s}">${STATUS_ICON[s]}</button>`,
        )
        .join('')}
    </div>
  </div>`;

const tasksForFilter = ({ kanban, standup }) => {
  if (!filter) return [];
  if (filter.type === 'critical') return standup.criticalDueToday ?? [];
  if (filter.type === 'doing') return kanban.doing ?? [];
  if (filter.type === 'blocked') return kanban.blocked ?? [];
  if (filter.type === 'agent') {
    return [...(kanban.todo ?? []), ...(kanban.doing ?? []), ...(kanban.blocked ?? [])].filter(
      (t) => t.assignedTo === filter.agent,
    );
  }
  return [];
};

const render = (info) => {
  const dd = document.getElementById('tasks-dropdown');
  if (!dd) return;
  lastInfo = info;

  if (!info) {
    dd.innerHTML = `
      <div class="tasks-dd-header"><strong>Tareas activas del equipo</strong></div>
      <div class="tasks-dd-empty">📡 Sin conexión al backend.<br>Se cargará cuando el servidor vuelva.</div>`;
    return;
  }

  const { standup, workload, kanban } = info;
  const topWorkload = (workload ?? []).slice(0, 5);
  const filteredTasks = tasksForFilter(info);
  const filterLabel =
    filter?.type === 'agent'
      ? `@${escapeHtml(topWorkload.find((w) => w.agent === filter.agent)?.name ?? filter.agent)}`
      : (FILTER_TITLE[filter?.type] ?? '');

  dd.innerHTML = `
    <div class="tasks-dd-header">
      <strong>Tareas activas del equipo</strong>
      <button class="tasks-dd-refresh" data-action="refresh" title="Actualizar">↻</button>
    </div>
    <div class="tasks-dd-summary">
      <button class="tasks-dd-stat${filter?.type === 'doing' ? ' active' : ''}" data-stat="doing"><strong>${standup.totalDoing}</strong> en progreso</button>
      <button class="tasks-dd-stat${filter?.type === 'blocked' ? ' active' : ''}" data-stat="blocked"><strong>${standup.totalBlocked}</strong> bloqueadas</button>
      <button class="tasks-dd-stat${filter?.type === 'critical' ? ' active' : ''}" data-stat="critical"><strong>${standup.criticalDueToday.length}</strong> críticas hoy</button>
    </div>
    ${
      topWorkload.length
        ? `<div class="tasks-dd-rows">${topWorkload.map((w) => renderWorkloadRow(w, filter?.type === 'agent' && filter.agent === w.agent)).join('')}</div>`
        : `<div class="tasks-dd-empty">Sin tareas activas ahora.</div>`
    }
    ${
      filter
        ? `
      <div class="tasks-dd-filtered">
        <div class="tasks-dd-filtered-header">
          <span>${filterLabel}</span>
          <button class="tasks-dd-clear" data-action="clear-filter">✕</button>
        </div>
        ${
          filteredTasks.length
            ? filteredTasks.map(renderTaskCard).join('')
            : `<div class="tasks-dd-empty">Nada acá.</div>`
        }
      </div>`
        : ''
    }
    <a class="tasks-dd-link" href="#taskboard">Ver tablero completo →</a>
  `;
};

const load = async () => {
  const [stR, wR, kR] = await Promise.all([
    apiSafe('/api/tasks/standup', null),
    apiSafe('/api/tasks/workload', null),
    apiSafe('/api/tasks/kanban', null),
  ]);
  if (stR.error && wR.error && kR.error) return render(null);
  const stDef = { date: '', totalDoing: 0, totalBlocked: 0, criticalDueToday: [] };
  const standup =
    stR.data && typeof stR.data === 'object'
      ? {
          ...stDef,
          ...stR.data,
          criticalDueToday: Array.isArray(stR.data.criticalDueToday) ? stR.data.criticalDueToday : [],
        }
      : stDef;
  const workload = Array.isArray(wR.data) ? wR.data : [];
  const kanban = kR.data && typeof kR.data === 'object' ? kR.data : { todo: [], doing: [], done: [], blocked: [] };
  render({ standup, workload, kanban });
};

const closeDropdown = () => {
  const dd = document.getElementById('tasks-dropdown');
  const btn = document.getElementById('topbar-tasks');
  if (dd) dd.hidden = true;
  if (btn) btn.classList.remove('open');
};

const openDropdown = () => {
  const dd = document.getElementById('tasks-dropdown');
  const btn = document.getElementById('topbar-tasks');
  if (dd) dd.hidden = false;
  if (btn) btn.classList.add('open');
  load();
};

const moveTask = async (id, status) => {
  apiBust('/api/tasks');
  const { error } = await apiSafe(`/api/tasks/${id}/status`, null, { method: 'POST', body: { status } });
  if (error) {
    toast('No se pudo mover: backend offline', 'error');
    return;
  }
  toast(`Tarea movida a ${status}`, 'success');
  await load();
};

export const initTasksWidget = () => {
  const btn = document.getElementById('topbar-tasks');
  const dd = document.getElementById('tasks-dropdown');
  if (!btn || !dd) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (dd.hidden) openDropdown();
    else closeDropdown();
  });

  dd.addEventListener('click', (e) => {
    e.stopPropagation();

    const moveBtn = e.target.closest('[data-move]');
    if (moveBtn) {
      moveTask(moveBtn.dataset.move, moveBtn.dataset.status);
      return;
    }

    const statBtn = e.target.closest('[data-stat]');
    if (statBtn) {
      const type = statBtn.dataset.stat;
      filter = filter?.type === type ? null : { type };
      render(lastInfo);
      return;
    }

    const agentRow = e.target.closest('[data-agent]');
    if (agentRow) {
      const agent = agentRow.dataset.agent;
      filter = filter?.type === 'agent' && filter.agent === agent ? null : { type: 'agent', agent };
      render(lastInfo);
      return;
    }

    if (e.target.closest('[data-action="clear-filter"]')) {
      filter = null;
      render(lastInfo);
      return;
    }

    if (e.target.closest('[data-action="refresh"]')) {
      load();
    }
  });

  document.addEventListener('click', (e) => {
    if (!dd.hidden && !dd.contains(e.target) && !btn.contains(e.target)) closeDropdown();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!dd.hidden) load();
  }, 30000);
};
