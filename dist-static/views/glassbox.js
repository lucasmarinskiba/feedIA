/* ══════════════════════════════════════════════════════════════════════════════
   GLASSBOX — Caja de Cristal
   ──────────────────────────────────────────────────────────────────────────────
   Supervisión en tiempo real del agente. Cada acción atómica pasa por un gate
   de aprobación antes de ejecutarse. El supervisor puede pausar, aprobar,
   rechazar o modificar cualquier acción desde esta vista.
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, emptyState, withBtnSpinner } from '../lib/ui.js';

let es = null;
const stop = () => {
  try {
    es && es.close();
  } catch {
    /* noop */
  }
  es = null;
};
window.addEventListener('beforeunload', stop);
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'glassbox') stop();
});

const RISK_COLOR = {
  low: 'ok',
  medium: 'info',
  high: 'warn',
  critical: 'crit',
};

const STATUS_ICON = {
  pending: '⏳',
  approved: '✅',
  rejected: '❌',
  executing: '▶️',
  completed: '✓',
  failed: '⚠️',
  blocked: '🚫',
};

const fmtDate = (iso) => {
  if (!iso) return '-';
  const d = new Date(iso);
  return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const renderModeBadge = (mode) => {
  const colors = {
    autonomous: 'ok',
    supervised: 'warn',
    paused: 'crit',
  };
  return `<span class="tag ${colors[mode] ?? 'info'}">${escape(mode.toUpperCase())}</span>`;
};

const renderPendingAction = (a) => `
  <div class="card gb-action-card" data-id="${escape(a.id)}" data-status="pending">
    <div class="gb-action-header">
      <div class="gb-action-id">${escape(a.id)}</div>
      <div class="gb-action-badges">
        <span class="tag ${RISK_COLOR[a.riskLevel] ?? 'info'}">risk: ${escape(a.riskLevel)}</span>
        <span class="tag info">${escape(a.actionType)}</span>
      </div>
    </div>
    <div class="gb-action-desc">${escape(a.description)}</div>
    ${a.guardianWarning ? `<div class="gb-action-warning">⚠️ ${escape(a.guardianWarning)}</div>` : ''}
    <div class="gb-action-meta small muted">
      Source: ${escape(a.source)} | ${fmtDate(a.createdAt)}
      ${a.timeoutAt ? `| Expira: ${fmtDate(a.timeoutAt)}` : ''}
    </div>
    <div class="gb-action-btns">
      <button class="btn tiny primary gb-approve" data-id="${escape(a.id)}">✅ Aprobar</button>
      <button class="btn tiny gb-reject" data-id="${escape(a.id)}">❌ Rechazar</button>
      <button class="btn tiny gb-modify" data-id="${escape(a.id)}">✏️ Modificar</button>
    </div>
  </div>`;

const renderHistoryAction = (a) => `
  <div class="card gb-action-card gb-action-${a.status}">
    <div class="gb-action-header">
      <div class="gb-action-id">${STATUS_ICON[a.status] ?? '•'} ${escape(a.id)}</div>
      <div class="gb-action-badges">
        <span class="tag ${RISK_COLOR[a.riskLevel] ?? 'info'}">${escape(a.riskLevel)}</span>
        <span class="tag info">${escape(a.actionType)}</span>
        <span class="tag ${a.status === 'completed' ? 'ok' : a.status === 'failed' ? 'crit' : a.status === 'rejected' ? 'warn' : 'info'}">${escape(a.status)}</span>
      </div>
    </div>
    <div class="gb-action-desc">${escape(a.description)}</div>
    ${a.resolutionNote ? `<div class="gb-action-note small">📝 ${escape(a.resolutionNote)}</div>` : ''}
    ${a.executionError ? `<div class="gb-action-error small">⚠️ ${escape(a.executionError)}</div>` : ''}
    <div class="gb-action-meta small muted">${fmtDate(a.resolvedAt || a.createdAt)} | ${escape(a.source)}</div>
  </div>`;

const wirePendingButtons = (root) => {
  root.querySelectorAll('.gb-approve').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      await withBtnSpinner(e.currentTarget, '…', async () => {
        try {
          await api(`/api/glassbox/actions/${encodeURIComponent(id)}/approve`, {
            method: 'POST',
            body: { note: 'Aprobado desde dashboard' },
          });
          toast('Acción aprobada', 'ok');
          refresh(root);
        } catch (err) {
          toast(err.message, 'crit');
        }
      });
    });
  });

  root.querySelectorAll('.gb-reject').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const reason = prompt('¿Por qué rechazás esta acción?');
      if (!reason) return;
      await withBtnSpinner(e.currentTarget, '…', async () => {
        try {
          await api(`/api/glassbox/actions/${encodeURIComponent(id)}/reject`, { method: 'POST', body: { reason } });
          toast('Acción rechazada', 'warn');
          refresh(root);
        } catch (err) {
          toast(err.message, 'crit');
        }
      });
    });
  });

  root.querySelectorAll('.gb-modify').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const id = e.currentTarget.dataset.id;
      const payloadStr = prompt('Payload JSON modificado:');
      if (!payloadStr) return;
      let payload;
      try {
        payload = JSON.parse(payloadStr);
      } catch {
        toast('JSON inválido', 'crit');
        return;
      }
      await withBtnSpinner(e.currentTarget, '…', async () => {
        try {
          await api(`/api/glassbox/actions/${encodeURIComponent(id)}/modify`, { method: 'POST', body: { payload } });
          toast('Acción modificada', 'ok');
          refresh(root);
        } catch (err) {
          toast(err.message, 'crit');
        }
      });
    });
  });
};

const refresh = async (root) => {
  const statusEl = root.querySelector('#gb-status');
  const pendingEl = root.querySelector('#gb-pending');
  const historyEl = root.querySelector('#gb-history');
  if (statusEl) statusEl.innerHTML = loadingScreen();
  if (pendingEl) pendingEl.innerHTML = loadingScreen();
  if (historyEl) historyEl.innerHTML = loadingScreen();

  try {
    const [status, pending, history] = await Promise.allSettled([
      api('/api/glassbox/status'),
      api('/api/glassbox/pending'),
      api('/api/glassbox/history?limit=20'),
    ]);

    const s = status.status === 'fulfilled' ? status.value : null;
    const p = pending.status === 'fulfilled' ? (pending.value?.pending ?? []) : [];
    const h = history.status === 'fulfilled' ? (history.value?.history ?? []) : [];

    if (statusEl && s) {
      statusEl.innerHTML = `
        <div class="gb-status-bar">
          <div class="gb-status-mode">Modo: ${renderModeBadge(s.mode)}</div>
          <div class="gb-status-counts">
            <div class="gb-status-count"><b>${s.pendingCount}</b> <span class="small muted">pendientes</span></div>
            <div class="gb-status-count"><b>${s.historyCount}</b> <span class="small muted">en historial</span></div>
          </div>
          <div class="gb-status-actions">
            <button class="btn ${s.mode === 'paused' ? 'primary' : ''}" id="gb-pause-btn">⏸ Pausar</button>
            <button class="btn ${s.mode === 'supervised' ? 'primary' : ''}" id="gb-resume-btn">▶ Supervisado</button>
            <button class="btn ${s.mode === 'autonomous' ? 'primary' : ''}" id="gb-auto-btn">⚡ Autónomo</button>
          </div>
        </div>`;

      const pauseBtn = statusEl.querySelector('#gb-pause-btn');
      const resumeBtn = statusEl.querySelector('#gb-resume-btn');
      const autoBtn = statusEl.querySelector('#gb-auto-btn');

      pauseBtn?.addEventListener('click', async () => {
        await withBtnSpinner(pauseBtn, '…', async () => {
          await api('/api/glassbox/pause', { method: 'POST' });
          toast('GlassBox pausado', 'warn');
          refresh(root);
        });
      });
      resumeBtn?.addEventListener('click', async () => {
        await withBtnSpinner(resumeBtn, '…', async () => {
          await api('/api/glassbox/resume', { method: 'POST' });
          toast('GlassBox en modo supervisado', 'ok');
          refresh(root);
        });
      });
      autoBtn?.addEventListener('click', async () => {
        await withBtnSpinner(autoBtn, '…', async () => {
          await api('/api/glassbox/mode', { method: 'POST', body: { mode: 'autonomous' } });
          toast('GlassBox en modo autónomo', 'ok');
          refresh(root);
        });
      });
    }

    const bulkBtns = root.querySelector('#gb-bulk-btns');
    if (bulkBtns) bulkBtns.style.display = p.length > 1 ? 'flex' : 'none';

    if (pendingEl) {
      pendingEl.innerHTML = p.length
        ? `<div class="page-grid">${p.map(renderPendingAction).join('')}</div>`
        : emptyState('✅', 'No hay acciones pendientes. El agente está operando libremente.', 280);
      wirePendingButtons(pendingEl);
    }

    if (historyEl) {
      historyEl.innerHTML = h.length
        ? `<div class="page-grid">${h.map(renderHistoryAction).join('')}</div>`
        : emptyState('📜', 'Sin historial de acciones todavía.', 280);
    }
  } catch (err) {
    toast(err.message, 'crit');
  }
};

const startStream = (root) => {
  stop();
  es = new EventSource('/api/glassbox/stream');
  es.addEventListener('gb', (e) => {
    let d;
    try {
      d = JSON.parse(e.data);
    } catch {
      return;
    }
    const logEl = root.querySelector('#gb-stream-log');
    if (!logEl) return;

    const line = document.createElement('div');
    line.className = 'gb-stream-line';
    const time = new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (d.kind === 'action-pending') {
      line.innerHTML = `<span class="muted">[${time}]</span> ⏳ <b>${escape(d.action?.actionType ?? 'acción')}</b> esperando aprobación <span class="tag ${RISK_COLOR[d.action?.riskLevel] ?? 'info'} tiny">${escape(d.action?.riskLevel ?? '')}</span>`;
      refresh(root);
    } else if (d.kind === 'action-approved') {
      line.innerHTML = `<span class="muted">[${time}]</span> ✅ Acción <b>${escape(d.actionId)}</b> aprobada`;
      refresh(root);
    } else if (d.kind === 'action-rejected') {
      line.innerHTML = `<span class="muted">[${time}]</span> ❌ Acción <b>${escape(d.actionId)}</b> rechazada`;
      refresh(root);
    } else if (d.kind === 'action-executing') {
      line.innerHTML = `<span class="muted">[${time}]</span> ▶️ Ejecutando <b>${escape(d.actionId)}</b>`;
    } else if (d.kind === 'mode-changed') {
      line.innerHTML = `<span class="muted">[${time}]</span> 🎛️ Modo cambiado: <b>${escape(d.previous)}</b> → <b>${escape(d.mode)}</b>`;
      refresh(root);
    } else {
      line.innerHTML = `<span class="muted">[${time}]</span> ${escape(d.kind)}`;
    }

    logEl.prepend(line);
    while (logEl.children.length > 60) logEl.lastChild.remove();
  });
  es.onerror = () => {
    /* reconexión automática del navegador */
  };
};

export const renderGlassBox = async (root) => {
  stop();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🔍 GlassBox</h1>
        <p class="view-subtitle page-subtitle">Caja de Cristal — supervisá cada acción del agente en tiempo real.</p>
      </div>
    </header>

    <div class="page-body">
      <div id="gb-status" class="card">${loadingScreen()}</div>

      <div class="col-header" style="margin-top:20px;display:flex;justify-content:space-between;align-items:center;">
        <h3>⏳ Acciones Pendientes</h3>
        <div class="btn-row" id="gb-bulk-btns" style="display:none;">
          <button class="btn tiny primary" id="gb-approve-all">✅ Aprobar todas</button>
          <button class="btn tiny" id="gb-reject-all">❌ Rechazar todas</button>
        </div>
      </div>
      <div id="gb-pending">${loadingScreen()}</div>

      <div class="col-header" style="margin-top:20px;"><h3>📜 Historial Reciente</h3></div>
      <div id="gb-history">${loadingScreen()}</div>

      <div class="col-header" style="margin-top:20px;"><h3>📡 Stream en vivo</h3></div>
      <div class="card" style="padding:0;overflow:hidden;">
        <div id="gb-stream-log" class="gb-stream-log"></div>
      </div>
    </div>

    <style>
      .gb-status-bar{display:flex;align-items:center;gap:16px;flex-wrap:wrap;justify-content:space-between;}
      .gb-status-mode{font-size:18px;font-weight:700;}
      .gb-status-counts{display:flex;gap:16px;}
      .gb-status-count{text-align:center;}
      .gb-status-actions{display:flex;gap:8px;}
      .gb-action-card{padding:14px 16px;}
      .gb-action-header{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
      .gb-action-id{font-family:ui-monospace,monospace;font-size:12px;color:var(--muted);}
      .gb-action-badges{display:flex;gap:6px;flex-wrap:wrap;}
      .gb-action-desc{font-size:15px;margin-bottom:8px;line-height:1.5;}
      .gb-action-warning{font-size:13px;color:var(--warn);background:rgba(245,158,11,.08);padding:6px 10px;border-radius:6px;margin-bottom:8px;}
      .gb-action-meta{margin-bottom:10px;}
      .gb-action-btns{display:flex;gap:8px;flex-wrap:wrap;}
      .gb-action-note{color:var(--info);background:rgba(59,130,246,.08);padding:4px 10px;border-radius:6px;margin-top:6px;}
      .gb-action-error{color:var(--crit);background:rgba(239,68,68,.08);padding:4px 10px;border-radius:6px;margin-top:6px;}
      .gb-stream-log{max-height:240px;overflow:auto;padding:12px 16px;font-family:ui-monospace,monospace;font-size:13px;}
      .gb-stream-line{padding:3px 0;}
    </style>`;

  root.querySelector('#gb-approve-all')?.addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, '…', async () => {
      try {
        await api('/api/glassbox/actions/approve-all', {
          method: 'POST',
          body: { note: 'Aprobadas en bulk desde dashboard' },
        });
        toast('Todas las acciones pendientes fueron aprobadas', 'ok');
        refresh(root);
      } catch (err) {
        toast(err.message, 'crit');
      }
    });
  });

  root.querySelector('#gb-reject-all')?.addEventListener('click', async (e) => {
    const reason = prompt('¿Por qué rechazás TODAS las acciones pendientes?');
    if (!reason) return;
    await withBtnSpinner(e.currentTarget, '…', async () => {
      try {
        await api('/api/glassbox/actions/reject-all', { method: 'POST', body: { reason } });
        toast('Todas las acciones pendientes fueron rechazadas', 'warn');
        refresh(root);
      } catch (err) {
        toast(err.message, 'crit');
      }
    });
  });

  await refresh(root);
  startStream(root);
};
