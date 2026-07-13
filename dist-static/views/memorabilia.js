/* ══════════════════════════════════════════════════════════════════════════════
   MEMORABILIA — Museo del journey
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const TYPE_EMOJI = {
  'first-post': '🎬',
  'first-milestone': '🏔️',
  'viral-post': '🚀',
  'first-sale': '💰',
  'best-week': '⭐',
  comeback: '🔥',
  'meaningful-comment': '💬',
  'collab-moment': '🤝',
  'launch-day': '🎉',
  anniversary: '🎂',
  breakthrough: '💡',
  'community-love': '💛',
};

let activeFilter = null;

const renderMemoryCard = (m) => `
  <div class="card memory-card" data-id="${escape(m.id)}" style="${m.pinned ? 'border-top:3px solid var(--accent);' : ''}">
    <div class="meta">
      <span style="font-size:24px;">${TYPE_EMOJI[m.type] ?? '📌'}</span>
      <span class="tag tiny">${escape(m.type)}</span>
      <span class="tag tiny">★ ${m.emotionalWeight}/5</span>
      ${m.pinned ? '<span class="tag accent tiny">📌 PIN</span>' : ''}
    </div>
    <h3 style="margin:8px 0 4px;">${escape(m.title)}</h3>
    <div class="small muted">${new Date(m.happenedAt).toLocaleDateString('es-AR')}</div>
    <p style="margin-top:10px;font-style:italic;color:var(--text-muted);">${escape(m.storyText || m.description)}</p>
    ${m.associatedData?.quote ? `<div class="small" style="margin-top:6px;padding:6px 10px;border-left:2px solid var(--accent);background:var(--bg-card-2);">"${escape(m.associatedData.quote)}"</div>` : ''}
    ${m.associatedData?.metric ? `<div class="small accent" style="margin-top:6px;"><strong>${escape(m.associatedData.metric.name)}:</strong> ${m.associatedData.metric.value.toLocaleString('es-AR')}</div>` : ''}
    <div style="margin-top:10px;display:flex;gap:6px;">
      <button class="btn small" data-act="pin" data-id="${escape(m.id)}">${m.pinned ? 'Despinear' : '📌 Pin'}</button>
      <button class="btn small" data-act="revisit" data-id="${escape(m.id)}">👁️ Revisitar (${m.revisitCount})</button>
    </div>
  </div>`;

export const renderMemorabilia = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>📖 Memorabilia</h1>
      <p class="muted">El álbum de tu journey. Momentos que se quedan.</p>
    </div>

    <div id="snapshot" class="stats-grid" style="margin-bottom:20px;"></div>

    <div id="on-this-day-section" style="margin-bottom:20px;"></div>
    <div id="throwback-section" style="margin-bottom:20px;"></div>

    <div style="display:flex;gap:10px;margin:10px 0;flex-wrap:wrap;">
      <button class="btn small" id="auto-detect">🔍 Auto-detectar memorias</button>
      <button class="btn small" id="highlight-reel-btn">🎞️ Highlight reel</button>
      <button class="btn small" id="yearbook-btn">📚 Yearbook ${new Date().getFullYear()}</button>
    </div>

    <div class="hook-category-filter" id="type-filter"></div>
    <div id="memorabilia-grid" class="page-grid"></div>
  `;

  const [memRes, snapRes, throwRes, todayRes, ybRes] = await Promise.all([
    apiSafe('/api/memorabilia', []),
    apiSafe('/api/memorabilia/snapshot', { totalMemories: 0, pinnedCount: 0, yearbooks: 0, totalRevisits: 0 }),
    apiSafe('/api/memorabilia/throwback', null),
    apiSafe('/api/memorabilia/on-this-day', []),
    apiSafe('/api/memorabilia/yearbooks', []),
  ]);
  const memories = memRes.data ?? [];
  const snapshot = snapRes.data ?? { totalMemories: 0, pinnedCount: 0, yearbooks: 0, totalRevisits: 0 };
  const throwback = throwRes.data;
  const today = todayRes.data ?? [];
  const yearbooks = ybRes.data ?? [];
  const isOffline = !!memRes.error && !!snapRes.error;

  if (isOffline) {
    container.innerHTML +=
      '<div class="empty-state" style="margin:20px 0;">📡 Sin conexión al backend. Las memorias aparecerán cuando el servidor vuelva.</div>';
  }
  void yearbooks;

  // Snapshot
  document.getElementById('snapshot').innerHTML = `
    <div class="card stat-card">
      <div class="stat-label">Total memorias</div>
      <div class="stat-value">${snapshot.totalMemories}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Pineadas</div>
      <div class="stat-value">${snapshot.pinnedCount}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Yearbooks</div>
      <div class="stat-value">${snapshot.yearbooks}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Total revisitas</div>
      <div class="stat-value">${snapshot.totalRevisits}</div>
    </div>
  `;

  // On this day
  if (today.length > 0) {
    document.getElementById('on-this-day-section').innerHTML = `
      <div class="card accent-border">
        <h3>📅 Un día como hoy...</h3>
        ${today.map(renderMemoryCard).join('')}
      </div>`;
  }

  // Throwback
  if (throwback) {
    document.getElementById('throwback-section').innerHTML = `
      <div class="card" style="background:linear-gradient(135deg, #FBE7C6 0%, #FFD6A5 100%);color:#1A1A1A;">
        <div class="small" style="opacity:0.7;text-transform:uppercase;letter-spacing:1px;">Recuerdo aleatorio</div>
        <h3 style="margin:6px 0;">${escape(throwback.title)}</h3>
        <p style="font-style:italic;">${escape(throwback.storyText || throwback.description)}</p>
        <div class="small" style="margin-top:6px;opacity:0.8;">${new Date(throwback.happenedAt).toLocaleDateString('es-AR')}</div>
      </div>`;
  }

  // Filter
  const types = [...new Set(memories.map((m) => m.type))];
  document.getElementById('type-filter').innerHTML = `
    <button class="tab-btn ${!activeFilter ? 'active' : ''}" data-type="">Todas (${memories.length})</button>
    ${types.map((t) => `<button class="tab-btn ${activeFilter === t ? 'active' : ''}" data-type="${escape(t)}">${TYPE_EMOJI[t] ?? '📌'} ${escape(t)}</button>`).join('')}
  `;

  // Grid
  let visible = memories;
  if (activeFilter) visible = visible.filter((m) => m.type === activeFilter);
  document.getElementById('memorabilia-grid').innerHTML =
    visible.length > 0
      ? visible.map(renderMemoryCard).join('')
      : '<div class="empty-state">Aún no hay memorias capturadas. Hacé clic en "Auto-detectar" para que el sistema busque las importantes.</div>';

  // Listeners
  document.getElementById('type-filter').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    activeFilter = btn.dataset.type || null;
    renderMemorabilia(container);
  });

  document.getElementById('auto-detect').addEventListener('click', async () => {
    toast('Buscando memorias del journey...', 'info');
    apiBust('/api/memorabilia');
    const { data: detected = [] } = await apiSafe('/api/memorabilia/auto-detect', [], { method: 'POST', body: {} });
    toast(`${detected.length} memorias nuevas capturadas`, 'success');
    renderMemorabilia(container);
  });

  document.getElementById('highlight-reel-btn').addEventListener('click', async () => {
    const { data: reel } = await apiSafe('/api/memorabilia/highlight-reel?count=10', null);
    if (!reel) {
      toast('No se pudo cargar el highlight reel', 'warn');
      return;
    }
    const modal = `
      <div class="modal-backdrop" id="reel-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:700px;max-height:80vh;overflow-y:auto;">
          <h2>🎞️ Highlight Reel</h2>
          <p class="muted">Desde ${reel.spanFromTo.from?.split('T')[0] ?? '?'} hasta hoy · ${reel.totalMemories} memorias</p>
          <p style="font-style:italic;margin:15px 0;">${escape(reel.summary)}</p>
          ${reel.highlights.map(renderMemoryCard).join('')}
          <button class="btn" onclick="document.getElementById('reel-modal').remove()" style="margin-top:15px;">Cerrar</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  });

  document.getElementById('yearbook-btn').addEventListener('click', async () => {
    const year = new Date().getFullYear();
    toast(`Generando yearbook ${year}...`, 'info');
    const { data: yb } = await apiSafe(`/api/memorabilia/yearbook/${year}`, null, { method: 'POST', body: {} });
    if (!yb) {
      toast('No se pudo generar el yearbook', 'warn');
      return;
    }
    const modal = `
      <div class="modal-backdrop" id="yb-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:800px;max-height:85vh;overflow-y:auto;">
          <div style="text-align:center;font-size:64px;">${yb.coverEmoji}</div>
          <pre style="white-space:pre-wrap;font-family:inherit;">${escape(yb.markdown)}</pre>
          <button class="btn" onclick="document.getElementById('yb-modal').remove()" style="margin-top:15px;">Cerrar</button>
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  });

  container.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const id = btn.dataset.id;
    const act = btn.dataset.act;
    apiBust('/api/memorabilia');
    if (act === 'pin') {
      const memory = memories.find((m) => m.id === id);
      await apiSafe(`/api/memorabilia/${id}/${memory.pinned ? 'unpin' : 'pin'}`, null, { method: 'POST', body: {} });
      renderMemorabilia(container);
    }
    if (act === 'revisit') {
      await apiSafe(`/api/memorabilia/${id}/revisit`, null, { method: 'POST', body: {} });
      renderMemorabilia(container);
    }
  });
};
