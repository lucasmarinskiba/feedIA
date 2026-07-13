import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { prospects: [], tab: 'prospects' };

const STATUS_COLORS = {
  nuevo: 'info',
  contactado: 'warn',
  negociando: 'accent',
  confirmado: 'ok',
  rechazado: 'crit',
  completado: 'muted',
};

const renderProspect = (p) => `
  <div class="collab-card card">
    <div class="meta">
      <span class="tag ${STATUS_COLORS[p.status] ?? 'info'}">${escape(p.status ?? 'nuevo')}</span>
      ${p.nicho ? `<span class="tag">${escape(p.nicho)}</span>` : ''}
      <span class="tiny muted">${fmt.rel(p.creadoEn)}</span>
    </div>
    <div class="collab-header">
      <div class="collab-avatar">${escape((p.handle ?? '@?').charAt(1).toUpperCase())}</div>
      <div>
        <div class="small" style="font-weight:600;">${escape(p.handle ?? 'desconocido')}</div>
        ${p.seguidores ? `<div class="tiny muted">${fmt.num(p.seguidores)} seguidores</div>` : ''}
        ${p.engagementRate ? `<div class="tiny muted">ER: ${p.engagementRate}%</div>` : ''}
      </div>
      ${
        p.score
          ? `
        <div class="collab-score" style="margin-left:auto;">
          <div class="score-num-sm">${p.score}</div>
          <div class="tiny muted">score</div>
        </div>`
          : ''
      }
    </div>
    ${
      p.propuesta
        ? `
      <div class="small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;">
        ${escape(p.propuesta)}
      </div>`
        : ''
    }
    ${p.notas ? `<div class="tiny muted" style="margin-top:6px;">📝 ${escape(p.notas)}</div>` : ''}
    <div class="btn-row" style="margin-top:12px;">
      ${p.status === 'nuevo' ? `<button class="btn primary tiny outreach-btn" data-id="${escape(p.id ?? '')}">📬 Enviar outreach</button>` : ''}
      ${p.status === 'negociando' ? `<button class="btn primary tiny respond-btn" data-id="${escape(p.id ?? '')}">💬 Responder negociación</button>` : ''}
      ${p.status === 'contactado' ? `<button class="btn ghost tiny mark-neg-btn" data-id="${escape(p.id ?? '')}">→ Marcar en negociación</button>` : ''}
      ${p.status === 'negociando' ? `<button class="btn ghost tiny confirm-btn" data-id="${escape(p.id ?? '')}">✓ Confirmar collab</button>` : ''}
    </div>
  </div>`;

const renderList = () => {
  const filtered =
    state.tab === 'all'
      ? state.prospects
      : state.tab === 'active'
        ? state.prospects.filter((p) => ['nuevo', 'contactado', 'negociando'].includes(p.status))
        : state.prospects.filter((p) => p.status === state.tab);
  if (!filtered.length) return `<div class="empty">Sin collabs con estado "${state.tab}".</div>`;
  return filtered.map(renderProspect).join('');
};

const renderTabs = () => {
  const active = state.prospects.filter((p) => ['nuevo', 'contactado', 'negociando'].includes(p.status)).length;
  return `
    <div class="tab-bar">
      <button class="tab-btn ${state.tab === 'active' ? 'active' : ''}" data-tab="active">⚡ Activos (${active})</button>
      <button class="tab-btn ${state.tab === 'confirmado' ? 'active' : ''}" data-tab="confirmado">✅ Confirmados</button>
      <button class="tab-btn ${state.tab === 'all' ? 'active' : ''}" data-tab="all">📋 Todos (${state.prospects.length})</button>
    </div>`;
};

const render = (root) => {
  const content = root.querySelector('#collab-content');
  if (!content) return;
  content.innerHTML = `
    ${renderTabs()}
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="find-btn">🔍 Encontrar creadores</button>
      <button class="btn ghost" id="refresh-btn">↻ Refrescar</button>
    </div>
    <div id="collab-list">${renderList()}</div>`;
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

  content.querySelector('#find-btn')?.addEventListener('click', async () => {
    const nicho = prompt('¿Nicho o tema para buscar creadores? (ej: marketing digital, fitness, finanzas)');
    if (!nicho) return;
    const btn = content.querySelector('#find-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> buscando…';
    try {
      const res = await api('/api/collab/find', { body: { nicho } });
      toast(`${res.found ?? 0} creadores encontrados`, 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Encontrar creadores';
    }
  });

  content.querySelectorAll('.outreach-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/collab/outreach', { body: { prospectId: id } });
        const p = state.prospects.find((x) => x.id === id);
        if (p) p.status = 'contactado';
        render(root);
        toast('Outreach enviado', 'ok');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  content.querySelectorAll('.respond-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const observaciones = prompt('¿Alguna observación sobre la negociación?') ?? '';
      btn.disabled = true;
      try {
        await api('/api/collab/respond', { body: { prospectId: id, observaciones } });
        toast('Respuesta de negociación enviada', 'ok');
        await loadData(root);
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  content.querySelectorAll('.confirm-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/collab/confirm', { body: { prospectId: id } });
        const p = state.prospects.find((x) => x.id === id);
        if (p) p.status = 'confirmado';
        render(root);
        toast('Collab confirmado', 'ok');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );
};

const loadData = async (root) => {
  try {
    const res = await api('/api/collab/prospects');
    state.prospects = res.prospects ?? [];
    render(root);
  } catch {
    const content = root.querySelector('#collab-content');
    if (content) content.innerHTML = `<div class="empty muted">Sin datos de collabs disponibles todavía.</div>`;
  }
};

export const renderCollab = async (root) => {
  state = { prospects: [], tab: 'active' };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Collab Manager</h1>
        <p class="view-subtitle page-subtitle">Gestioná colaboraciones con creadores e influencers de tu nicho.</p>
      </div>
    </header>
    <div id="collab-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;
  await loadData(root);
};
