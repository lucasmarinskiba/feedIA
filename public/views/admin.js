/* ══════════════════════════════════════════════════════════════════════════════
   ADMIN DASHBOARD — solo owner
   Stats: hits 24h, errores 24h, error rate. Logs: últimos 100 errores.
   Deep health: KV ping + LLM providers + versión.
   Grant/Revoke plan, Feature Flags (releases), Users (grants) — sección de gestión.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { loadingScreen } from '../lib/ui.js';

const VALID_PLANS = ['free', 'pro', 'premium', 'owner', 'promo', 'partner'];

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

const renderGrantForm = () => `
  <div class="card" style="margin-bottom:20px">
    <h3 style="margin:0 0 14px">🎟️ Asignar / revocar plan</h3>
    <form id="admin-grant-form" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end;margin-bottom:10px">
      <div style="flex:1;min-width:200px">
        <label class="tiny muted" style="display:block;margin-bottom:4px">Email</label>
        <input type="email" name="email" required placeholder="usuario@ejemplo.com" class="input" style="width:100%" />
      </div>
      <div>
        <label class="tiny muted" style="display:block;margin-bottom:4px">Plan</label>
        <select name="plan" class="input">
          ${VALID_PLANS.map((p) => `<option value="${p}">${p}</option>`).join('')}
        </select>
      </div>
      <div style="flex:1;min-width:160px">
        <label class="tiny muted" style="display:block;margin-bottom:4px">Nota (opcional)</label>
        <input type="text" name="note" placeholder="motivo" class="input" style="width:100%" />
      </div>
      <button type="submit" class="btn primary">Asignar</button>
      <button type="button" id="admin-revoke-btn" class="btn ghost">Revocar (→ free)</button>
    </form>
    <div id="admin-grant-result" class="tiny muted"></div>
  </div>`;

const renderGrantsList = (grants) => {
  if (!grants?.length) {
    return `<div class="card" style="margin-bottom:20px"><h3 style="margin:0 0 8px">👥 Usuarios con plan asignado</h3><p class="small muted">Sin grants activos todavía.</p></div>`;
  }
  return `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">👥 Usuarios con plan asignado (${grants.length})</h3>
      <div style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto">
        ${grants
          .map(
            (g) => `
          <div style="display:flex;justify-content:space-between;font-size:13px;padding:8px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px">
            <span>${escape(g.email || g.userId || '?')}</span>
            <span><strong>${escape(g.plan || '?')}</strong> ${g.grantedAt ? `<span class="tiny muted">· ${escape(fmtDate(g.grantedAt))}</span>` : ''}</span>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
};

const renderFlags = (flags) => {
  return `
    <div class="card" style="margin-bottom:20px">
      <h3 style="margin:0 0 14px">🚦 Feature flags</h3>
      ${
        flags?.length
          ? `<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px">
        ${flags
          .map(
            (f) => `
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;padding:8px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px">
            <div>
              <strong>${escape(f.key)}</strong>
              ${f.description ? `<span class="tiny muted"> — ${escape(f.description)}</span>` : ''}
              ${f.rollout_percent ? `<span class="tiny muted"> · rollout ${f.rollout_percent}%</span>` : ''}
            </div>
            <button class="btn ghost tiny admin-flag-toggle" data-key="${escape(f.key)}" data-enabled="${f.enabled ? '1' : '0'}">
              ${f.enabled ? '✅ ON' : '⚪ OFF'}
            </button>
          </div>`,
          )
          .join('')}
      </div>`
          : `<p class="small muted" style="margin:0 0 14px">Sin feature flags creados todavía.</p>`
      }
      <form id="admin-flag-create-form" style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div style="flex:1;min-width:160px">
          <label class="tiny muted" style="display:block;margin-bottom:4px">Nueva flag (key)</label>
          <input type="text" name="key" required placeholder="mi_feature_nueva" class="input" style="width:100%" />
        </div>
        <div style="flex:1;min-width:160px">
          <label class="tiny muted" style="display:block;margin-bottom:4px">Descripción</label>
          <input type="text" name="description" class="input" style="width:100%" />
        </div>
        <button type="submit" class="btn ghost">+ Crear (OFF)</button>
      </form>
    </div>`;
};

const wireGrantForm = (root) => {
  const form = root.querySelector('#admin-grant-form');
  const resultEl = root.querySelector('#admin-grant-result');
  const revokeBtn = root.querySelector('#admin-revoke-btn');
  if (!form) return;

  const showResult = (msg, ok) => {
    if (!resultEl) return;
    resultEl.textContent = msg;
    resultEl.style.color = ok ? '#10b981' : '#ef4444';
  };

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(form);
    const email = String(fd.get('email') || '').trim();
    const plan = String(fd.get('plan') || 'free');
    const note = String(fd.get('note') || '');
    if (!email) return;
    const { data, error } = await apiSafe('/api/admin/grant', null, { body: { email, plan, note } });
    if (error) return showResult(`Error: ${error.message}`, false);
    showResult(`✅ ${data.email} → ${data.plan}`, true);
    apiBust('/api/admin/');
    await loadData(root);
  });

  revokeBtn?.addEventListener('click', async () => {
    const email = String(new FormData(form).get('email') || '').trim();
    if (!email) return showResult('Ingresá un email para revocar', false);
    const { data, error } = await apiSafe('/api/admin/revoke', null, { body: { email } });
    if (error) return showResult(`Error: ${error.message}`, false);
    showResult(`✅ ${data.email} → free`, true);
    apiBust('/api/admin/');
    await loadData(root);
  });
};

const wireFlags = (root) => {
  root.querySelectorAll('.admin-flag-toggle').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.key;
      const enabled = btn.dataset.enabled !== '1';
      const { error } = await apiSafe('/api/admin/releases', null, { body: { key, enabled } });
      if (error) return;
      apiBust('/api/admin/releases');
      await loadData(root);
    });
  });

  const createForm = root.querySelector('#admin-flag-create-form');
  createForm?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const fd = new FormData(createForm);
    const key = String(fd.get('key') || '').trim();
    const description = String(fd.get('description') || '');
    if (!key) return;
    const { error } = await apiSafe('/api/admin/releases', null, {
      body: { key, enabled: false, description },
    });
    if (error) return;
    apiBust('/api/admin/releases');
    await loadData(root);
  });
};

const loadData = async (root) => {
  const c = root.querySelector('#admin-content');
  if (c) c.innerHTML = loadingScreen();
  const [statsR, logsR, healthR, usersR, flagsR] = await Promise.all([
    apiSafe('/api/admin/stats'),
    apiSafe('/api/admin/logs?limit=100'),
    apiSafe('/api/admin/health/deep'),
    apiSafe('/api/admin/users'),
    apiSafe('/api/admin/releases'),
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
  const grants = usersR.data?.grants || [];
  const flags = flagsR.data?.flags || [];
  if (c) {
    c.innerHTML = `
      ${renderStats(stats)}
      ${renderHealth(health)}
      ${renderGrantForm()}
      ${renderGrantsList(grants)}
      ${renderFlags(flags)}
      ${renderLogs(errors)}
    `;
    wireGrantForm(root);
    wireFlags(root);
  }
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
