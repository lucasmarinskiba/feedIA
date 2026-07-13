/* ══════════════════════════════════════════════════════════════════════════════
   COMMUNITY HUB — Inbox + Leads + FAQ + Fans + UGC + Mentions
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let activeTab = 'inbox';

const renderTabs = () => `
  <div class="hook-category-filter">
    ${[
      ['inbox', '📬 Inbox'],
      ['leads', '💼 Leads'],
      ['faq', '❓ FAQ'],
      ['fans', '💛 Fans'],
      ['ugc', '🎬 UGC'],
      ['mentions', '📢 Menciones'],
    ]
      .map(
        ([id, label]) =>
          `<button class="tab-btn ${activeTab === id ? 'active' : ''}" data-tab="${id}">${label}</button>`,
      )
      .join('')}
  </div>`;

const renderInbox = async (host) => {
  const [snapRes, convsRes] = await Promise.all([
    apiSafe('/api/cm/inbox/snapshot', { needingResponse: 0, escalatedToHuman: 0, avgSentiment: 0, totalActive: 0 }),
    apiSafe('/api/cm/inbox', []),
  ]);
  const snapDefault = { needingResponse: 0, escalatedToHuman: 0, avgSentiment: 0, totalActive: 0 };
  const snapshot =
    snapRes.data && typeof snapRes.data === 'object' && !snapRes.data.demoMode
      ? { ...snapDefault, ...snapRes.data }
      : snapDefault;
  const convs = Array.isArray(convsRes.data) ? convsRes.data : [];
  if (snapRes.error && convsRes.error) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend. El inbox se cargará cuando vuelva.</div>';
    return;
  }
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Necesitan respuesta</div><div class="stat-value">${snapshot.needingResponse}</div></div>
      <div class="card stat-card"><div class="stat-label">Escalados</div><div class="stat-value">${snapshot.escalatedToHuman}</div></div>
      <div class="card stat-card"><div class="stat-label">Sentiment promedio</div><div class="stat-value">${snapshot.avgSentiment?.toFixed(2) ?? '—'}</div></div>
      <div class="card stat-card"><div class="stat-label">Total activos</div><div class="stat-value">${snapshot.totalActive}</div></div>
    </div>
    <div style="display:flex;gap:10px;margin-bottom:14px;">
      <button class="btn" id="tick-inbox">▶ Procesar cola</button>
    </div>
    <div id="conv-list" class="page-grid">
      ${convs
        .slice(0, 30)
        .map(
          (c) => `
        <div class="card">
          <div class="meta">
            <span class="tag tiny">${escape(c.intent)}</span>
            <span class="tag tiny ${c.priority === 'critical' ? 'crit' : c.priority === 'high' ? 'warn' : ''}">${escape(c.priority)}</span>
            <span class="tag tiny">${escape(c.status)}</span>
          </div>
          <h4 style="margin:8px 0 4px;">@${escape(c.contact.username)}</h4>
          <div class="small muted">${c.messages.length} mensajes · sentiment ${c.sentiment?.toFixed(2) ?? '—'}</div>
          <p class="small" style="margin:8px 0;">${escape(c.messages[c.messages.length - 1]?.text?.slice(0, 140) ?? '')}</p>
          <button class="btn small" data-suggest="${escape(c.id)}">💡 Sugerir respuesta</button>
        </div>`,
        )
        .join('')}
    </div>
  `;
  host.querySelector('#tick-inbox').addEventListener('click', async () => {
    toast('Procesando inbox...', 'info');
    apiBust('/api/cm/inbox');
    const { data: result, error } = await apiSafe('/api/cm/inbox/tick', null, { method: 'POST', body: {} });
    if (error || !result) {
      toast('Backend offline', 'warn');
      return;
    }
    toast(`${result.processed} procesadas, ${result.responded} respondidas`, 'success');
    renderInbox(host);
  });
  host.querySelectorAll('[data-suggest]').forEach((b) => {
    b.addEventListener('click', async () => {
      toast('Generando sugerencia...', 'info');
      const { data: s, error } = await apiSafe(`/api/cm/inbox/${b.dataset.suggest}/suggest-reply`, null, {
        method: 'POST',
        body: {},
      });
      if (error || !s) {
        toast('Backend offline', 'warn');
        return;
      }
      alert(`Sugerencia:\n\n${s.text}\n\nConfidence: ${s.confidence}\nIntent: ${s.intent}`);
    });
  });
};

const renderLeads = async (host) => {
  const { data: kanban, error: kanbanErr } = await apiSafe('/api/cm/leads/kanban', {});
  if (kanbanErr && !kanban) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend. Los leads se cargarán cuando vuelva.</div>';
    return;
  }
  const stages = ['new', 'qualified', 'engaged', 'proposal', 'negotiation', 'won', 'lost', 'nurture'];
  host.innerHTML = `
    <div style="overflow-x:auto;">
      <div style="display:grid;grid-template-columns:repeat(${stages.length}, minmax(220px, 1fr));gap:10px;">
        ${stages
          .map(
            (s) => `
          <div class="card kanban-col">
            <h4 style="margin:0 0 8px;text-transform:capitalize;">${s} (${(kanban[s] ?? []).length})</h4>
            ${(kanban[s] ?? [])
              .slice(0, 6)
              .map(
                (l) => `
              <div class="card" style="margin-bottom:8px;padding:10px;">
                <div class="small"><strong>@${escape(l.contactUsername)}</strong></div>
                <div class="small muted">Score: ${l.score.total}/100 (${l.score.classification})</div>
                <div class="small">${escape(l.productInterest)}</div>
              </div>`,
              )
              .join('')}
          </div>`,
          )
          .join('')}
      </div>
    </div>
  `;
};

const renderFAQ = async (host) => {
  const [sR, fR, pR] = await Promise.all([
    apiSafe('/api/cm/faq/snapshot', { totalFAQs: 0, approvedFAQs: 0, pendingPatterns: 0 }),
    apiSafe('/api/cm/faq', []),
    apiSafe('/api/cm/faq/pending', []),
  ]);
  const sDef = { totalFAQs: 0, approvedFAQs: 0, pendingPatterns: 0 };
  const snapshot = sR.data && typeof sR.data === 'object' && !sR.data.demoMode ? { ...sDef, ...sR.data } : sDef;
  const faqs = Array.isArray(fR.data) ? fR.data : [];
  const pending = Array.isArray(pR.data) ? pR.data : [];
  if (sR.error && fR.error) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend.</div>';
    return;
  }
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total FAQs</div><div class="stat-value">${snapshot.totalFAQs}</div></div>
      <div class="card stat-card"><div class="stat-label">Aprobadas</div><div class="stat-value">${snapshot.approvedFAQs}</div></div>
      <div class="card stat-card"><div class="stat-label">Pendientes</div><div class="stat-value">${snapshot.pendingPatterns}</div></div>
    </div>
    <button class="btn" id="detect-patterns">🔍 Detectar nuevos patrones</button>
    ${
      pending.length
        ? `
      <h3 style="margin-top:20px;">Pendientes de aprobación</h3>
      <div class="page-grid">
        ${pending
          .map(
            (p) => `
          <div class="card">
            <h4>${escape(p.detectedQuestion)}</h4>
            <div class="small muted">${p.occurrences} apariciones</div>
            <ul class="small">${p.examples
              .slice(0, 3)
              .map((e) => `<li>${escape(e)}</li>`)
              .join('')}</ul>
          </div>`,
          )
          .join('')}
      </div>`
        : ''
    }
    <h3 style="margin-top:20px;">FAQs aprobadas</h3>
    <div class="page-grid">
      ${faqs
        .slice(0, 20)
        .map(
          (f) => `
        <div class="card">
          <h4>${escape(f.question)}</h4>
          <p class="small">${escape(f.answer)}</p>
          <div class="meta"><span class="tag tiny">${escape(f.category)}</span><span class="tag tiny">${f.popularity} usos</span></div>
        </div>`,
        )
        .join('')}
    </div>
  `;
  host.querySelector('#detect-patterns').addEventListener('click', async () => {
    toast('Detectando patrones...', 'info');
    const { error } = await apiSafe('/api/cm/faq/detect-patterns', null, { method: 'POST', body: {} });
    if (error) {
      toast('Backend offline', 'warn');
      return;
    }
    apiBust('/api/cm/faq');
    renderFAQ(host);
  });
};

const renderFans = async (host) => {
  const [sR, tR] = await Promise.all([
    apiSafe('/api/cm/fans/snapshot', { total: 0, byTier: {}, pendingWelcomes: 0 }),
    apiSafe('/api/cm/fans/top', []),
  ]);
  const def = { total: 0, byTier: {}, pendingWelcomes: 0 };
  const snapshot = sR.data && typeof sR.data === 'object' && !sR.data.demoMode ? { ...def, ...sR.data } : def;
  const top = Array.isArray(tR.data) ? tR.data : [];
  if (sR.error && tR.error) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend.</div>';
    return;
  }
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total fans</div><div class="stat-value">${snapshot.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Embajadores</div><div class="stat-value">${snapshot.byTier?.embajador ?? 0}</div></div>
      <div class="card stat-card"><div class="stat-label">Super fans</div><div class="stat-value">${snapshot.byTier?.['super-fan'] ?? 0}</div></div>
      <div class="card stat-card"><div class="stat-label">Welcomes pendientes</div><div class="stat-value">${snapshot.pendingWelcomes}</div></div>
    </div>
    <button class="btn" id="fan-of-week">⭐ Fan de la semana</button>
    <button class="btn" id="refresh-fans">🔄 Refresh perfiles</button>
    <h3 style="margin-top:20px;">Top fans</h3>
    <div class="page-grid">
      ${top
        .slice(0, 12)
        .map(
          (f) => `
        <div class="card">
          <h4>@${escape(f.username)}</h4>
          <div class="meta"><span class="tag tiny">${escape(f.tier)}</span><span class="tag tiny">${f.engagementScore}/100</span></div>
          <div class="small">DMs: ${f.signals.dmsExchanged} · Comments: ${f.signals.commentsCount} · Mentions: ${f.signals.mentionsCount}</div>
        </div>`,
        )
        .join('')}
    </div>
  `;
  host.querySelector('#fan-of-week').addEventListener('click', async () => {
    const { data: result, error } = await apiSafe('/api/cm/fans/fan-of-week', null);
    if (error) {
      toast('Backend offline', 'warn');
      return;
    }
    if (result) alert(`Fan de la semana: @${result.fan.username}\n\n${result.shoutoutText}`);
    else toast('Sin fans suficientes para feature', 'info');
  });
  host.querySelector('#refresh-fans').addEventListener('click', async () => {
    toast('Refresh perfiles...', 'info');
    const { error } = await apiSafe('/api/cm/fans/refresh', null, { method: 'POST', body: {} });
    if (error) {
      toast('Backend offline', 'warn');
      return;
    }
    apiBust('/api/cm/fans');
    renderFans(host);
  });
};

const renderUGC = async (host) => {
  const [sR, iR] = await Promise.all([
    apiSafe('/api/cm/ugc/snapshot', { total: 0, readyToRepost: [], reposted: 0 }),
    apiSafe('/api/cm/ugc', []),
  ]);
  const def = { total: 0, readyToRepost: [], reposted: 0 };
  const snapshot =
    sR.data && typeof sR.data === 'object' && !sR.data.demoMode
      ? { ...def, ...sR.data, readyToRepost: Array.isArray(sR.data.readyToRepost) ? sR.data.readyToRepost : [] }
      : def;
  const items = Array.isArray(iR.data) ? iR.data : [];
  if (sR.error && iR.error) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend.</div>';
    return;
  }
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total UGC</div><div class="stat-value">${snapshot.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Listos repost</div><div class="stat-value">${snapshot.readyToRepost.length}</div></div>
      <div class="card stat-card"><div class="stat-label">Reposted</div><div class="stat-value">${snapshot.reposted}</div></div>
    </div>
    <div class="page-grid">
      ${items
        .slice(0, 20)
        .map(
          (u) => `
        <div class="card">
          <div class="meta"><span class="tag tiny">${escape(u.ugcType)}</span><span class="tag tiny">${escape(u.stage)}</span><span class="tag tiny">★ ${u.qualityScore}</span></div>
          <h4 style="margin:6px 0;">@${escape(u.authorUsername)}</h4>
          <p class="small">${escape(u.caption?.slice(0, 160) ?? '')}</p>
          ${u.stage === 'detected' ? `<button class="btn small" data-ugc-req="${escape(u.id)}">📤 Pedir permiso</button>` : ''}
          ${u.stage === 'permission-granted' ? `<button class="btn small" data-ugc-cap="${escape(u.id)}">✍️ Generar caption</button>` : ''}
        </div>`,
        )
        .join('')}
    </div>
  `;
  host.querySelectorAll('[data-ugc-req]').forEach((b) => {
    b.addEventListener('click', async () => {
      toast('Enviando pedido...', 'info');
      const { data: r, error } = await apiSafe(`/api/cm/ugc/${b.dataset.ugcReq}/request`, null, {
        method: 'POST',
        body: {},
      });
      if (error) {
        toast('Backend offline', 'warn');
        return;
      }
      toast(r?.ok ? 'Pedido enviado' : 'Falló', r?.ok ? 'success' : 'error');
      apiBust('/api/cm/ugc');
      renderUGC(host);
    });
  });
  host.querySelectorAll('[data-ugc-cap]').forEach((b) => {
    b.addEventListener('click', async () => {
      const { data: r, error } = await apiSafe(`/api/cm/ugc/${b.dataset.ugcCap}/caption`, null, {
        method: 'POST',
        body: {},
      });
      if (error || !r) {
        toast('Backend offline', 'warn');
        return;
      }
      alert(`Caption generado:\n\n${r.caption}`);
    });
  });
};

const renderMentions = async (host) => {
  const [sR, mR] = await Promise.all([
    apiSafe('/api/cm/mentions/snapshot', {
      totalLast7Days: 0,
      sentimentLast7Days: { positive: 0, critical: 0 },
      estimatedReachLast30Days: 0,
    }),
    apiSafe('/api/cm/mentions', []),
  ]);
  const def = { totalLast7Days: 0, sentimentLast7Days: { positive: 0, critical: 0 }, estimatedReachLast30Days: 0 };
  const snapshot =
    sR.data && typeof sR.data === 'object' && !sR.data.demoMode
      ? { ...def, ...sR.data, sentimentLast7Days: sR.data.sentimentLast7Days || def.sentimentLast7Days }
      : def;
  const mentions = Array.isArray(mR.data) ? mR.data : [];
  if (sR.error && mR.error) {
    host.innerHTML = '<div class="empty-state">📡 Sin conexión al backend.</div>';
    return;
  }
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Últimos 7d</div><div class="stat-value">${snapshot.totalLast7Days}</div></div>
      <div class="card stat-card"><div class="stat-label">Positivas 7d</div><div class="stat-value">${snapshot.sentimentLast7Days?.positive ?? 0}</div></div>
      <div class="card stat-card"><div class="stat-label">Críticas 7d</div><div class="stat-value">${snapshot.sentimentLast7Days?.critical ?? 0}</div></div>
      <div class="card stat-card"><div class="stat-label">Reach 30d</div><div class="stat-value">${(snapshot.estimatedReachLast30Days ?? 0).toLocaleString('es-AR')}</div></div>
    </div>
    <div class="page-grid">
      ${mentions
        .slice(0, 20)
        .map(
          (m) => `
        <div class="card">
          <div class="meta">
            <span class="tag tiny">${escape(m.type)}</span>
            <span class="tag tiny ${m.sentiment === 'critical' ? 'crit' : m.sentiment === 'negative' ? 'warn' : m.sentiment === 'positive' ? 'ok' : ''}">${escape(m.sentiment)}</span>
            <span class="tag tiny">${escape(m.importance)}</span>
          </div>
          <h4 style="margin:6px 0;">@${escape(m.authorUsername)} ${m.authorFollowerCount ? `(${m.authorFollowerCount.toLocaleString('es-AR')})` : ''}</h4>
          <p class="small">${escape(m.context.slice(0, 200))}</p>
          ${!m.acknowledged ? `<button class="btn small" data-mention-ack="${escape(m.id)}">✓ Acknowledge</button>` : ''}
        </div>`,
        )
        .join('')}
    </div>
  `;
  host.querySelectorAll('[data-mention-ack]').forEach((b) => {
    b.addEventListener('click', async () => {
      await apiSafe(`/api/cm/mentions/${b.dataset.mentionAck}/ack`, null, { method: 'POST', body: {} });
      apiBust('/api/cm/mentions');
      renderMentions(host);
    });
  });
};

const TAB_RENDERERS = {
  inbox: renderInbox,
  leads: renderLeads,
  faq: renderFAQ,
  fans: renderFans,
  ugc: renderUGC,
  mentions: renderMentions,
};

export const renderCommunityHub = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>💬 Community Hub</h1>
      <p class="muted">Toda la operación de community en un solo lugar.</p>
    </div>
    ${renderTabs()}
    <div id="cm-tab-body" style="margin-top:18px;"></div>
  `;
  const body = container.querySelector('#cm-tab-body');
  await TAB_RENDERERS[activeTab](body);

  container.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-tab]');
    if (!tab) return;
    activeTab = tab.dataset.tab;
    container.querySelectorAll('[data-tab]').forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));
    body.innerHTML = '<div class="loading">Cargando...</div>';
    await TAB_RENDERERS[activeTab](body);
  });
};
