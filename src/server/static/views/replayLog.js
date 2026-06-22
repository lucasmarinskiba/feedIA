/* ══════════════════════════════════════════════════════════════════════════════
   REPLAY LOG — Revisar sesiones de Computer Use paso por paso
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';

const OUTCOME_COLOR = { success: 'ok', partial: 'warn', failed: 'crit', cancelled: '', 'in-progress': '' };

export const renderReplayLog = async (container) => {
  container.innerHTML = `
    <div class="page-header">
      <h1>📜 Replay Log</h1>
      <p class="muted">Cada sesión de Computer Use queda grabada paso por paso.</p>
    </div>
    <div id="replay-stats" class="stats-grid" style="margin-bottom:18px;"></div>
    <div id="replay-list"></div>
  `;

  const DEFAULT_STATS = { totalSessions: 0, byOutcome: {}, avgStepsPerSession: 0, avgDurationMs: 0, diskUsageMB: 0 };
  const [statsRes, sessRes] = await Promise.all([
    apiSafe('/api/cu/replay-stats', DEFAULT_STATS),
    apiSafe('/api/cu/replay', []),
  ]);
  const stats = statsRes.data ?? DEFAULT_STATS;
  const sessions = sessRes.data ?? [];
  const isOffline = !!statsRes.error && !!sessRes.error;

  document.getElementById('replay-stats').innerHTML = `
    <div class="card stat-card"><div class="stat-label">Total sesiones</div><div class="stat-value">${stats.totalSessions}</div></div>
    <div class="card stat-card"><div class="stat-label">Success</div><div class="stat-value">${stats.byOutcome?.success ?? 0}</div></div>
    <div class="card stat-card"><div class="stat-label">Avg pasos</div><div class="stat-value">${Math.round(stats.avgStepsPerSession ?? 0)}</div></div>
    <div class="card stat-card"><div class="stat-label">Avg duración</div><div class="stat-value">${Math.round((stats.avgDurationMs ?? 0) / 1000)}s</div></div>
    <div class="card stat-card"><div class="stat-label">Disco</div><div class="stat-value">${stats.diskUsageMB} MB</div></div>
  `;

  document.getElementById('replay-list').innerHTML =
    sessions.length > 0
      ? sessions
          .map(
            (s) => `

    <div class="card" style="cursor:pointer;" data-replay="${escape(s.id)}">
      <div class="meta">
        <span class="tag tiny ${OUTCOME_COLOR[s.outcome] ?? ''}">${escape(s.outcome)}</span>
        <span class="tag tiny">${escape(s.workflowName)}</span>
        <span class="small muted">${new Date(s.startedAt).toLocaleString('es-AR')}</span>
      </div>
      <div class="small" style="margin-top:6px;">${s.stepCount} pasos · @${escape(s.brandName)}</div>
    </div>`,
          )
          .join('')
      : isOffline
        ? '<div class="empty-state">📡 Sin conexión al backend. Los replays se cargarán cuando el servidor vuelva.</div>'
        : '<div class="empty-state">Aún no hay replays. Ejecutá un pipeline en "Canva → IG" para generar tu primer replay.</div>';

  // ── Brain Sessions (localStorage) ─────────────────────────────────────────
  const brainSessions = (() => {
    try {
      return JSON.parse(localStorage.getItem('feedia.brain.sessions') || '[]');
    } catch {
      return [];
    }
  })();

  const brainSection = document.createElement('div');
  brainSection.innerHTML = `
    <h2 style="margin-top:24px;margin-bottom:10px;">🧠 Brain Sessions</h2>
    ${
      brainSessions.length === 0
        ? '<div class="empty-state">Aún no hay brain sessions. Activá el Cerebro Maestro en Carrusel Studio para registrar una.</div>'
        : brainSessions
            .map(
              (s) => `
        <div class="card" style="margin-bottom:8px;">
          <div class="meta">
            <span class="tag tiny info">${escape(s.contentFormat ?? 'carousel')}</span>
            <span class="tag tiny">${escape(String(s.jobId ?? '').slice(0, 12))}</span>
            <span class="small muted">${new Date(s.ts).toLocaleString('es-AR')}</span>
          </div>
          <div style="display:flex;gap:12px;margin-top:8px;">
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#a855f7;">${s.scores?.innovation ?? '—'}</div><div style="font-size:9px;opacity:0.6;">innovación</div></div>
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#22d3ee;">${s.scores?.influencer ?? '—'}</div><div style="font-size:9px;opacity:0.6;">influencer</div></div>
            <div style="text-align:center;"><div style="font-size:18px;font-weight:800;color:#10b981;">${s.scores?.coherence ?? '—'}</div><div style="font-size:9px;opacity:0.6;">coherencia</div></div>
            <div class="small muted" style="margin-left:auto;align-self:center;">${(s.steps ?? []).length} pasos</div>
          </div>
        </div>`,
            )
            .join('')
    }
  `;
  container.appendChild(brainSection);

  container.addEventListener('click', async (e) => {
    const card = e.target.closest('[data-replay]');
    if (!card) return;
    const { data, error: detailErr } = await apiSafe(`/api/cu/replay/${card.dataset.replay}`, null);
    if (detailErr || !data) return;
    const session = data.session;
    const modal = `
      <div class="modal-backdrop" id="rep-modal" style="position:fixed;inset:0;background:rgba(0,0,0,0.88);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div class="card" style="max-width:900px;max-height:90vh;overflow-y:auto;">
          <button class="btn small" onclick="document.getElementById('rep-modal').remove()" style="float:right;">✕</button>
          <h2>📜 ${escape(session.workflowName)}</h2>
          <div class="small muted">${session.steps.length} pasos · ${Math.round((session.totalDurationMs ?? 0) / 1000)}s · ${escape(session.outcome)}</div>
          ${session.summary ? `<p style="margin-top:10px;font-style:italic;">${escape(session.summary)}</p>` : ''}
          <h3 style="margin-top:18px;">Pasos</h3>
          ${session.steps
            .map(
              (step) => `
            <div class="card" style="margin-bottom:8px;padding:10px;${step.ok ? '' : 'border-left:3px solid var(--crit);'}">
              <div class="meta">
                <span class="tag tiny">${escape(step.actionType)}</span>
                <span class="small muted">${new Date(step.at).toLocaleTimeString('es-AR')}</span>
              </div>
              <div class="small" style="margin-top:6px;"><strong>#${step.stepNumber}.</strong> ${escape(step.description)}</div>
              ${step.rationale ? `<div class="small muted" style="margin-top:4px;font-style:italic;">${escape(step.rationale)}</div>` : ''}
              ${step.error ? `<div class="small crit">❌ ${escape(step.error)}</div>` : ''}
            </div>`,
            )
            .join('')}
          ${
            session.outputs?.publishedUrls?.length
              ? `
            <h3>URLs publicadas</h3>
            <ul>${session.outputs.publishedUrls.map((u) => `<li><a href="${escape(u)}" target="_blank">${escape(u)}</a></li>`).join('')}</ul>`
              : ''
          }
        </div>
      </div>`;
    document.body.insertAdjacentHTML('beforeend', modal);
  });
};
