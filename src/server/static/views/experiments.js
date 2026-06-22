import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { experiments: [], tab: 'active' };

const STATUS_COLORS = {
  active: 'ok',
  pendiente: 'warn',
  completado: 'info',
  cancelado: 'crit',
};

const renderExperiment = (exp) => {
  const winner = exp.ganador ? `<span class="tag ok">Ganador: ${escape(exp.ganador)}</span>` : '';
  return `
    <div class="experiment-card card">
      <div class="meta">
        <span class="tag ${STATUS_COLORS[exp.status] ?? 'info'}">${escape(exp.status ?? 'pendiente')}</span>
        <span class="tag">${escape(exp.tipo ?? 'A/B')}</span>
        ${winner}
        <span class="tiny muted">${fmt.rel(exp.creadoEn)}</span>
      </div>
      <h3>${escape(exp.nombre ?? 'Experimento sin nombre')}</h3>
      <div class="body" style="margin-bottom:12px;">${escape(exp.hipotesis ?? '')}</div>

      ${
        exp.variantes?.length
          ? `
        <div class="variants-grid">
          ${exp.variantes
            .map(
              (v) => `
            <div class="variant-card ${v.id === exp.ganador ? 'winner' : ''}">
              <div class="small" style="font-weight:600;">${escape(v.nombre ?? v.id)}</div>
              ${
                v.metricas
                  ? `
                <div class="variant-metrics">
                  ${v.metricas.engagementRate !== undefined ? `<div class="tiny"><span class="muted">ER</span> ${v.metricas.engagementRate}%</div>` : ''}
                  ${v.metricas.alcance !== undefined ? `<div class="tiny"><span class="muted">Alcance</span> ${fmt.num(v.metricas.alcance)}</div>` : ''}
                  ${v.metricas.saves !== undefined ? `<div class="tiny"><span class="muted">Saves</span> ${fmt.num(v.metricas.saves)}</div>` : ''}
                </div>`
                  : '<div class="tiny muted">Sin datos aún</div>'
              }
            </div>`,
            )
            .join('')}
        </div>`
          : ''
      }

      ${
        exp.status === 'active' || exp.status === 'pendiente'
          ? `
        <div class="btn-row" style="margin-top:12px;">
          ${exp.status === 'pendiente' ? `<button class="btn primary tiny launch-btn" data-id="${escape(exp.id ?? '')}">▶ Lanzar</button>` : ''}
          ${exp.status === 'active' ? `<button class="btn ghost tiny complete-btn" data-id="${escape(exp.id ?? '')}">✓ Completar</button>` : ''}
        </div>`
          : ''
      }
    </div>`;
};

const renderList = () => {
  const filtered = state.experiments.filter((e) =>
    state.tab === 'all'
      ? true
      : state.tab === 'active'
        ? e.status === 'active' || e.status === 'pendiente'
        : e.status === state.tab,
  );
  if (!filtered.length) return `<div class="empty">Sin experimentos con estado "${state.tab}".</div>`;
  return filtered.map(renderExperiment).join('');
};

const renderTabs = () => {
  const counts = {
    active: state.experiments.filter((e) => e.status === 'active' || e.status === 'pendiente').length,
    completado: state.experiments.filter((e) => e.status === 'completado').length,
    all: state.experiments.length,
  };
  return `
    <div class="tab-bar">
      <button class="tab-btn ${state.tab === 'active' ? 'active' : ''}" data-tab="active">🔬 Activos (${counts.active})</button>
      <button class="tab-btn ${state.tab === 'completado' ? 'active' : ''}" data-tab="completado">✅ Completados (${counts.completado})</button>
      <button class="tab-btn ${state.tab === 'all' ? 'active' : ''}" data-tab="all">📋 Todos (${counts.all})</button>
    </div>`;
};

const render = (root) => {
  const content = root.querySelector('#exp-content');
  if (!content) return;
  content.innerHTML = `
    ${renderTabs()}
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="design-btn">🧪 Diseñar experimento</button>
      <button class="btn ghost" id="refresh-btn">↻ Refrescar</button>
    </div>
    <div id="exp-list">${renderList()}</div>`;
  attachListeners(root, content);
};

const attachListeners = (root, content) => {
  content.querySelectorAll('.tab-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      render(root);
    }),
  );

  content.querySelector('#refresh-btn')?.addEventListener('click', () => loadData(root));

  content.querySelector('#design-btn')?.addEventListener('click', async () => {
    const objetivo = prompt('¿Qué querés mejorar? (ej: tasa de guardados en carruseles de tips)');
    if (!objetivo) return;
    const btn = content.querySelector('#design-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> diseñando…';
    try {
      const res = await api('/api/experiments/design', { body: { objetivo } });
      toast(`Experimento diseñado: ${res.experiment?.nombre ?? 'listo'}`, 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🧪 Diseñar experimento';
    }
  });

  content.querySelectorAll('.launch-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/experiments/launch', { body: { experimentId: id } });
        const exp = state.experiments.find((e) => e.id === id);
        if (exp) exp.status = 'active';
        render(root);
        toast('Experimento lanzado', 'ok');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  content.querySelectorAll('.complete-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        const res = await api('/api/experiments/complete', { body: { experimentId: id } });
        toast(`Experimento completado. Ganador: ${res.ganador ?? 'N/A'}`, 'ok');
        await loadData(root);
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );
};

const loadData = async (root) => {
  try {
    const res = await api('/api/experiments/list');
    state.experiments = res.experiments ?? [];
    render(root);
  } catch {
    const content = root.querySelector('#exp-content');
    if (content) content.innerHTML = `<div class="empty muted">Sin experimentos disponibles todavía.</div>`;
  }
};

export const renderExperiments = async (root) => {
  state = { experiments: [], tab: 'active' };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Growth Experiments</h1>
        <p class="view-subtitle page-subtitle">Diseñá y seguí experimentos A/B para optimizar tu crecimiento.</p>
      </div>
    </header>
    <div id="exp-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;
  await loadData(root);
};
