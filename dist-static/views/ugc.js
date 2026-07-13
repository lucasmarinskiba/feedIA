import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { items: [], tab: 'pending', autoMode: false };

/* ── Ideas UGC determinísticas (mostradas siempre, accionables) ────────── */
const UGC_IDEAS = [
  {
    emoji: '📸',
    titulo: 'Repost del Top 3 de mentions de la semana',
    desc: 'Tu equipo elige las 3 mentions con mejor sentimiento y arma carrusel "Lo que dice nuestra gente".',
    cta: '🎨 Armar en Canva',
    action: 'canva',
  },
  {
    emoji: '🎬',
    titulo: 'Reel "Reaccionando a UGC"',
    desc: 'Un reel donde reaccionás (texto+música) a un UGC top del mes. Alto retention.',
    cta: '🖥️ Editar en CapCut',
    action: 'capcut',
  },
  {
    emoji: '⭐',
    titulo: 'Testimonio destacado',
    desc: 'Convertí un comentario o DM en una pieza de social proof branded.',
    cta: '🎨 Armar en Canva',
    action: 'canva',
  },
  {
    emoji: '🤝',
    titulo: 'Colaboración con creator',
    desc: 'Detectá creators que ya te mencionan ≥3 veces y abrí conversación de colab.',
    cta: '💬 Iniciar outreach',
    action: 'outreach',
  },
];

const renderAutoMode = () => `
  <div class="card ugc-auto" style="background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.04));">
    <div class="row spread" style="align-items:center;flex-wrap:wrap;gap:12px;">
      <div>
        <div style="font-size:14px;font-weight:700;">⚡ Modo Automático UGC</div>
        <div class="tiny muted" style="margin-top:2px;">Cuando está ON: el equipo escanea menciones cada 6h, pide permisos por DM automático, y te avisa cuando hay UGC listo para publicar.</div>
      </div>
      <label class="ugc-switch" title="Modo Automático">
        <input type="checkbox" id="ugc-auto-toggle" ${state.autoMode ? 'checked' : ''}/><span class="ugc-slider"></span>
      </label>
    </div>
  </div>`;

const renderIdeas = () => `
  <div class="card" style="margin-top:12px;">
    <div class="row spread"><b>💡 Ideas UGC accionables</b><span class="tiny muted">${UGC_IDEAS.length} sugerencias</span></div>
    <div class="ugc-ideas">
      ${UGC_IDEAS.map(
        (idea, i) => `
        <div class="ugc-idea">
          <div class="ugc-idea-emoji">${idea.emoji}</div>
          <div style="flex:1;min-width:0;">
            <div class="small" style="font-weight:700;">${escape(idea.titulo)}</div>
            <div class="tiny muted" style="margin-top:3px;line-height:1.4;">${escape(idea.desc)}</div>
            <button class="btn ghost tiny ugc-idea-btn" data-action="${idea.action}" data-i="${i}" style="margin-top:8px;">${escape(idea.cta)}</button>
          </div>
        </div>`,
      ).join('')}
    </div>
  </div>`;

const STATUS_COLORS = {
  pending: 'warn',
  approved: 'ok',
  rejected: 'crit',
  expired: 'muted',
};

const renderItem = (item) => `
  <div class="ugc-item card">
    <div class="meta">
      <span class="tag ${STATUS_COLORS[item.status] ?? 'info'}">${escape(item.status ?? 'pending')}</span>
      <span class="tiny muted">${fmt.rel(item.createdAt)}</span>
      ${item.expiresAt ? `<span class="tiny muted">expira ${fmt.rel(item.expiresAt)}</span>` : ''}
    </div>
    <div class="ugc-creator">
      <div class="ugc-avatar">${escape((item.creatorHandle ?? '@?').charAt(1).toUpperCase())}</div>
      <div>
        <div class="small">${escape(item.creatorHandle ?? 'desconocido')}</div>
        ${item.creatorFollowers ? `<div class="tiny muted">${fmt.num(item.creatorFollowers)} seguidores</div>` : ''}
      </div>
    </div>
    ${item.contentUrl ? `<div class="ugc-thumb"><img src="${escape(item.contentUrl)}" alt="ugc" onerror="this.style.display='none'"/></div>` : ''}
    <div class="body" style="margin-top:8px;">${escape(item.description ?? '')}</div>
    ${
      item.permissionMessage
        ? `
      <div class="ugc-permission-msg small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;">
        "${escape(item.permissionMessage)}"
      </div>`
        : ''
    }
    ${
      item.status === 'pending'
        ? `
      <div class="btn-row" style="margin-top:12px;">
        <button class="btn primary tiny ugc-approve-btn" data-id="${escape(item.id ?? '')}">✓ Aprobar uso</button>
        <button class="btn ghost tiny ugc-reject-btn" data-id="${escape(item.id ?? '')}">✗ Rechazar</button>
        <button class="btn ghost tiny ugc-contact-btn" data-id="${escape(item.id ?? '')}" data-handle="${escape(item.creatorHandle ?? '')}">💬 Contactar</button>
      </div>`
        : ''
    }
  </div>`;

const renderList = () => {
  const filtered = state.items.filter((i) => (state.tab === 'all' ? true : i.status === state.tab));
  if (!filtered.length) return `<div class="empty">Sin UGC con estado "${state.tab}".</div>`;
  return filtered.map(renderItem).join('');
};

const renderTabs = () => {
  const counts = { pending: 0, approved: 0, rejected: 0, all: state.items.length };
  state.items.forEach((i) => {
    if (counts[i.status] !== undefined) counts[i.status]++;
  });
  return `
    <div class="tab-bar">
      ${['pending', 'approved', 'rejected', 'all']
        .map(
          (t) => `
        <button class="tab-btn ${state.tab === t ? 'active' : ''}" data-tab="${t}">
          ${t === 'pending' ? '⏳' : t === 'approved' ? '✅' : t === 'rejected' ? '❌' : '📋'} ${t.charAt(0).toUpperCase() + t.slice(1)} (${counts[t]})
        </button>`,
        )
        .join('')}
    </div>`;
};

const render = (root) => {
  const content = root.querySelector('#ugc-content');
  if (!content) return;
  content.innerHTML = `
    ${renderAutoMode()}
    ${renderIdeas()}
    <div style="margin-top:18px;">${renderTabs()}</div>
    <div class="btn-row" style="margin:14px 0;">
      <button class="btn primary" id="scan-btn">🔍 Escanear menciones</button>
      <button class="btn ghost" id="refresh-btn">↻ Refrescar</button>
    </div>
    <div id="ugc-list">${renderList()}</div>
    <style>
      .ugc-ideas{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:10px;}
      .ugc-idea{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;display:flex;gap:10px;align-items:flex-start;transition:border-color .15s;}
      .ugc-idea:hover{border-color:var(--border-focus,#444);}
      .ugc-idea-emoji{font-size:20px;line-height:1;}
      .ugc-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer;}
      .ugc-switch input{opacity:0;width:0;height:0;}
      .ugc-slider{position:absolute;inset:0;background:#2c2c38;border-radius:24px;transition:background .2s;}
      .ugc-slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .22s cubic-bezier(.2,.8,.2,1);}
      .ugc-switch input:checked + .ugc-slider{background:linear-gradient(135deg,#e1306c,#a855f7);}
      .ugc-switch input:checked + .ugc-slider::before{transform:translateX(20px);}
    </style>`;
  attachListeners(root);
  wireUgcExtras(root);
};

const wireUgcExtras = (root) => {
  const content = root.querySelector('#ugc-content');
  content.querySelector('#ugc-auto-toggle')?.addEventListener('change', async (e) => {
    state.autoMode = e.target.checked;
    try {
      localStorage.setItem('fx_ugc_auto', state.autoMode ? '1' : '0');
    } catch {
      /* noop */
    }
    toast(
      state.autoMode ? '⚡ Modo Automático ON · escaneará cada 6h' : 'Modo Automático apagado',
      state.autoMode ? 'ok' : 'info',
    );
  });
  content.querySelectorAll('.ugc-idea-btn').forEach((btn) =>
    btn.addEventListener('click', async (e) => {
      const action = e.currentTarget.dataset.action;
      const idea = UGC_IDEAS[Number(e.currentTarget.dataset.i)];
      if (!idea) return;
      if (action === 'canva') {
        // Slide simple basado en la idea
        const slides = [
          { titulo: 'LO QUE DICE NUESTRA GENTE', cuerpo: idea.desc },
          { titulo: idea.titulo, cuerpo: 'Top mentions de la semana.' },
        ];
        try {
          const r = await api('/api/computer/watch-canva', {
            body: { slides, titulo: `UGC ${new Date().toISOString().split('T')[0]}`, speed: 1, autoExportar: true },
          });
          if (r?.sessionId) {
            sessionStorage.setItem('fx_cu_session', r.sessionId);
            toast('🎨 Abriendo Canva…', 'ok');
            location.hash = 'pantalla';
          }
        } catch (err) {
          toast(err.message, 'crit');
        }
      } else if (action === 'capcut') {
        const beats = [
          { texto: idea.titulo, segundos: 3, notaVisual: 'B-roll del UGC' },
          { texto: '¿Te pasa?', segundos: 2, notaVisual: 'Texto grande' },
          { texto: idea.desc, segundos: 5 },
          { texto: 'Mandanos el tuyo →', segundos: 3 },
        ];
        try {
          const r = await api('/api/computer/watch-capcut', {
            body: { beats, titulo: `UGC Reel`, relacion: '9:16', speed: 1, autoExportar: true },
          });
          if (r?.sessionId) {
            sessionStorage.setItem('fx_cu_session', r.sessionId);
            toast('🖥️ Abriendo CapCut…', 'ok');
            location.hash = 'pantalla';
          }
        } catch (err) {
          toast(err.message, 'crit');
        }
      } else if (action === 'outreach') {
        toast('Te llevo a Pantalla en vivo para que el equipo abra DMs de outreach.', 'info');
        location.hash = 'pantalla';
      }
    }),
  );
};

const attachListeners = (root) => {
  const content = root.querySelector('#ugc-content');

  content.querySelectorAll('.tab-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      render(root);
    }),
  );

  content.querySelector('#scan-btn')?.addEventListener('click', async () => {
    const btn = content.querySelector('#scan-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> escaneando…';
    try {
      const res = await api('/api/ugc/scan', { body: {} });
      toast(`Escaneo ok: ${res.found ?? 0} menciones nuevas`, 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Escanear menciones';
    }
  });

  content.querySelector('#refresh-btn')?.addEventListener('click', () => loadData(root));

  content.querySelectorAll('.ugc-approve-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/ugc/approve', { body: { id } });
        const item = state.items.find((i) => i.id === id);
        if (item) item.status = 'approved';
        render(root);
        toast('UGC aprobado', 'ok');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  content.querySelectorAll('.ugc-reject-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      btn.disabled = true;
      try {
        await api('/api/ugc/reject', { body: { id } });
        const item = state.items.find((i) => i.id === id);
        if (item) item.status = 'rejected';
        render(root);
        toast('UGC rechazado', 'crit');
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
      }
    }),
  );

  content.querySelectorAll('.ugc-contact-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      const handle = btn.dataset.handle;
      btn.disabled = true;
      try {
        await api('/api/ugc/contact', { body: { id, handle } });
        toast(`Mensaje de contacto enviado a ${handle}`, 'ok');
      } catch (err) {
        toast(err.message, 'crit');
      } finally {
        btn.disabled = false;
      }
    }),
  );
};

const loadData = async (root) => {
  try {
    const res = await api('/api/ugc/list');
    state.items = res.items ?? [];
    render(root);
  } catch (err) {
    const content = root.querySelector('#ugc-content');
    if (content)
      content.innerHTML = `<div class="empty muted">Sin datos UGC disponibles (conectá Meta API para ver menciones reales).</div>`;
  }
};

export const renderUgc = async (root) => {
  let autoMode = false;
  try {
    autoMode = localStorage.getItem('fx_ugc_auto') === '1';
  } catch {
    /* noop */
  }
  state = { items: [], tab: 'pending', autoMode };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">UGC Manager</h1>
        <p class="view-subtitle page-subtitle">Gestioná permisos de User Generated Content y menciones de tu marca.</p>
      </div>
    </header>
    <div id="ugc-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;
  await loadData(root);
};
