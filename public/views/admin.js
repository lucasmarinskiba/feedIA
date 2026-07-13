/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — solo owner
   Stats: hits 24h, errores 24h, error rate. Logs: últimos 100 errores.
   Deep health: KV ping + LLM providers + versión.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { loadingScreen } from '../lib/ui.js';

const fmtDate = (ts) => {
  const d = new Date(ts);
  return d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'medium' });
};

const renderStats = (stats) => {
  if (!stats) return '';
  const errorRateNum = parseFloat(stats.errorRate || 0);
  const rateColor = errorRateNum > 5 ? '#ef4444' : errorRateNum > 1 ? '#f59e0b' : '#10b981';
  return `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">📊 Métricas últimas 24h</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px">
        <div style="background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Hits 24h</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px">${stats.hits24h}</div>
        </div>
        <div style="background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Errores 24h</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px">${stats.errors24h}</div>
        </div>
        <div style="background:rgba(168,85,247,.07);border:1px solid rgba(168,85,247,.18);border-radius:12px;padding:14px">
          <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase">Error rate</div>
          <div style="font-size:24px;font-weight:800;margin-top:4px;color:${rateColor}">${stats.errorRate}</div>
        </div>
      </div>
    </div>`;
};

const renderHealth = (health) => {
  if (!health) return '';
  const kvStatus = health.kv?.ok ? `✅ ${health.kv.latencyMs}ms (${health.kv.mode})` : `❌ ${health.kv.mode}`;
  const llmStatus = health.llm?.configured ? '✅ Configurado' : '❌ Sin API keys';
  const providers = Object.entries(health.llm?.providers || {})
    .map(([k, v]) => `${v ? '✅' : '⚪'} ${k}`)
    .join(' · ');
  return `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">🔧 Health checks</h3>
      <div style="font-size:13px;line-height:1.8">
        <div><strong>KV:</strong> ${kvStatus}</div>
        <div><strong>LLM:</strong> ${llmStatus} <span class="tiny muted">(${providers})</span></div>
        <div><strong>Versión:</strong> <code>${escape(health.version || '?')}</code></div>
      </div>
    </div>`;
};

const renderLogs = (errors) => {
  if (!errors?.length)
    return `
    <div class="card"><h3 style="margin:0 0 8px">📜 Errores recientes</h3><p class="small muted">Sin errores en el ring buffer.</p></div>`;
  return `
    <div class="card">
      <h3 style="margin:0 0 14px">📜 Últimos ${errors.length} errores</h3>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:520px;overflow-y:auto">
        ${errors
          .map(
            (e) => `
          <div style="background:var(--bg-soft,rgba(17,18,22,.03));border-left:3px solid #ef4444;border-radius:6px;padding:10px 12px">
            <div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-tertiary)">
              <span>${escape(fmtDate(e.ts))}</span>
              <span>${escape(e.method || '?')} ${escape(e.path || '?')}</span>
            </div>
            ${e.userId ? `<div style="font-size:11px;color:var(--text-tertiary)">user: <code>${escape(e.userId)}</code></div>` : ''}
            <pre style="margin:6px 0 0;font-size:11px;white-space:pre-wrap;color:var(--text-secondary);font-family:ui-monospace,monospace">${escape((e.error || '').slice(0, 600))}</pre>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
};

const loadData = async (root) => {
  const c = root.querySelector('#admin-content');
  if (c) c.innerHTML = loadingScreen();
  const [statsR, logsR, healthR] = await Promise.all([
    apiSafe('/api/admin/stats'),
    apiSafe('/api/admin/logs?limit=100'),
    apiSafe('/api/admin/health/deep'),
  ]);
  if (statsR.error?.status === 403 || logsR.error?.status === 403) {
    if (c)
      c.innerHTML = `<div class="card" style="text-align:center;padding:40px">
      <div style="font-size:40px;margin-bottom:10px">🔒</div>
      <h3 style="margin:0 0 8px">Acceso restringido</h3>
      <p class="small muted">Esta vista es solo para el owner del sistema (lucasdmarin@gmail.com).</p>
    </div>`;
    return;
  }
  const stats = statsR.data?.stats;
  const errors = logsR.data?.errors || [];
  const health = healthR.data;
  if (c)
    c.innerHTML = `
    ${renderStats(stats)}
    ${renderHealth(health)}
    ${renderLogs(errors)}
  `;
};

export const renderAdmin = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🛡️ Admin</h1>
        <p class="view-subtitle page-subtitle">Métricas, logs y health checks del sistema (owner-only).</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="admin-refresh-btn">↻ Refrescar</button>
      </div>
    </header>
    <div id="admin-content" class="page-body">${loadingScreen()}</div>`;
  root.querySelector('#admin-refresh-btn')?.addEventListener('click', () => loadData(root));
  await loadData(root);
};
