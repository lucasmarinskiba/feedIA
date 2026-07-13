import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { sources: [], backlog: [], tab: 'backlog' };

const renderSourcesList = (sources) => {
  if (!sources.length) return `<div class="empty">Sin fuentes configuradas. Agregá una URL para empezar.</div>`;
  return sources
    .map(
      (s) => `
    <div class="list-item">
      <div class="list-item-icon">🌐</div>
      <div class="list-item-body">
        <div class="small">${escape(s.name ?? s.url)}</div>
        <div class="tiny muted">${escape(s.url)}</div>
      </div>
      <span class="tag ${s.active ? 'ok' : 'warn'}">${s.active ? 'activa' : 'pausada'}</span>
    </div>`,
    )
    .join('');
};

const renderBacklog = (items) => {
  if (!items.length) return `<div class="empty">Backlog vacío. Hacé fetch de fuentes para llenar el backlog.</div>`;
  return items
    .map(
      (item) => `
    <div class="curator-item card" data-id="${escape(item.id ?? '')}">
      <div class="meta">
        <span class="tag">${escape(item.source ?? 'web')}</span>
        <span class="tiny muted">${fmt.rel(item.fetchedAt)}</span>
        ${item.approved ? '<span class="tag ok">aprobado</span>' : ''}
      </div>
      <h3 class="curator-title">${escape(item.title ?? item.url)}</h3>
      ${item.summary ? `<div class="body">${escape(item.summary)}</div>` : ''}
      <div class="btn-row" style="margin-top:10px;">
        ${!item.approved ? `<button class="btn primary tiny approve-btn" data-id="${escape(item.id ?? '')}">✓ Aprobar</button>` : ''}
        <a href="${escape(item.url)}" target="_blank" rel="noopener" class="btn ghost tiny">🔗 Ver fuente</a>
      </div>
    </div>`,
    )
    .join('');
};

const renderTabs = () => `
  <div class="tab-bar" style="margin-bottom:16px;">
    <button class="tab-btn ${state.tab === 'backlog' ? 'active' : ''}" data-tab="backlog">📥 Backlog (${state.backlog.length})</button>
    <button class="tab-btn ${state.tab === 'sources' ? 'active' : ''}" data-tab="sources">🌐 Fuentes (${state.sources.length})</button>
  </div>`;

const render = (root) => {
  const contentEl = root.querySelector('#curator-content');
  if (!contentEl) return;

  const tabsHtml = renderTabs();
  let mainHtml = '';

  if (state.tab === 'backlog') {
    mainHtml = `
      <div class="curator-actions btn-row" style="margin-bottom:16px;">
        <button class="btn primary" id="fetch-btn">🔄 Fetch fuentes</button>
        <button class="btn ghost" id="refresh-backlog-btn">↻ Refrescar</button>
      </div>
      <div id="backlog-list">${renderBacklog(state.backlog)}</div>`;
  } else {
    mainHtml = `
      <div class="card" style="margin-bottom:16px;">
        <h3>Agregar fuente</h3>
        <div class="field">
          <input class="field-input" id="source-url" type="url" placeholder="https://blog.ejemplo.com/feed"/>
        </div>
        <div class="field">
          <input class="field-input" id="source-name" type="text" placeholder="Nombre de la fuente"/>
        </div>
        <button class="btn primary" id="add-source-btn">+ Agregar</button>
      </div>
      <div id="sources-list">${renderSourcesList(state.sources)}</div>`;
  }

  contentEl.innerHTML = tabsHtml + mainHtml;
  attachListeners(root);
};

const attachListeners = (root) => {
  const contentEl = root.querySelector('#curator-content');

  contentEl.querySelectorAll('.tab-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      render(root);
    }),
  );

  contentEl.querySelector('#fetch-btn')?.addEventListener('click', async () => {
    const btn = contentEl.querySelector('#fetch-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> fetching…';
    try {
      const res = await api('/api/curator/fetch', { body: {} });
      toast(`Fetch ok: ${res.added ?? 0} ítems nuevos`, 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔄 Fetch fuentes';
    }
  });

  contentEl.querySelector('#refresh-backlog-btn')?.addEventListener('click', () => loadData(root));

  contentEl.querySelectorAll('.approve-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/curator/approve', { body: { id } });
        const item = state.backlog.find((b) => b.id === id);
        if (item) item.approved = true;
        render(root);
        toast('Ítem aprobado', 'ok');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  contentEl.querySelector('#add-source-btn')?.addEventListener('click', async () => {
    const url = contentEl.querySelector('#source-url')?.value.trim();
    const name = contentEl.querySelector('#source-name')?.value.trim();
    if (!url) {
      toast('Ingresá una URL', 'crit');
      return;
    }
    const btn = contentEl.querySelector('#add-source-btn');
    btn.disabled = true;
    try {
      await api('/api/curator/sources', { body: { url, name: name || url } });
      toast('Fuente agregada', 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
      btn.disabled = false;
    }
  });
};

const loadData = async (root) => {
  try {
    const [sourcesRes, backlogRes] = await Promise.allSettled([
      api('/api/curator/sources'),
      api('/api/curator/backlog'),
    ]);
    state.sources = sourcesRes.status === 'fulfilled' ? (sourcesRes.value.sources ?? []) : [];
    state.backlog = backlogRes.status === 'fulfilled' ? (backlogRes.value.items ?? []) : [];
    render(root);
  } catch (err) {
    toast(err.message, 'crit');
  }
};

export const renderCurator = async (root) => {
  state = { sources: [], backlog: [], tab: 'backlog' };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Content Curator</h1>
        <p class="view-subtitle page-subtitle">Monitoreá fuentes, aprobá contenido inspiracional para el backlog.</p>
      </div>
    </header>
    <div id="curator-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;
  await loadData(root);
};
