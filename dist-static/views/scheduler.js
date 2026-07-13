import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { jobs: [], runs: [] };

const JOB_ICONS = {
  'digest-diario': '📰',
  'curator-fetch': '🌐',
  'nurture-ejecutar': '💌',
  'bot-poll': '🤖',
  'ugc-expirar': '📸',
  'autopilot-semanal': '🚀',
};

const renderJobCard = (job) => {
  const icon = JOB_ICONS[job.name] ?? '⚙️';
  const lastRun = state.runs
    .filter((r) => r.job === job.name)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))[0];
  return `
    <div class="job-card card">
      <div class="job-header">
        <div class="job-icon">${icon}</div>
        <div class="job-info">
          <div class="small" style="font-weight:600;">${escape(job.name)}</div>
          <div class="tiny muted">${escape(job.cronExpr ?? '')}</div>
          ${lastRun ? `<div class="tiny muted">Última ejecución: ${fmt.rel(lastRun.startedAt)} — <span class="tag tiny ${lastRun.status === 'ok' ? 'ok' : 'crit'}">${escape(lastRun.status)}</span></div>` : '<div class="tiny muted">Sin ejecuciones registradas</div>'}
        </div>
        <div class="job-actions">
          <span class="tag ${job.running ? 'warn' : 'ok'}">${job.running ? 'ejecutando' : 'listo'}</span>
          <button class="btn ghost tiny run-btn" data-name="${escape(job.name)}" ${job.running ? 'disabled' : ''}>▶ Ejecutar</button>
        </div>
      </div>
      ${job.description ? `<div class="tiny muted" style="margin-top:6px;">${escape(job.description)}</div>` : ''}
    </div>`;
};

const renderRunsLog = () => {
  if (!state.runs.length) return `<div class="empty muted small">Sin ejecuciones registradas todavía.</div>`;
  return `
    <div class="runs-log">
      ${state.runs
        .slice(0, 20)
        .map(
          (r) => `
        <div class="run-row">
          <span class="run-icon">${JOB_ICONS[r.job] ?? '⚙️'}</span>
          <span class="small run-job">${escape(r.job)}</span>
          <span class="tag tiny ${r.status === 'ok' ? 'ok' : r.status === 'running' ? 'warn' : 'crit'}">${escape(r.status)}</span>
          <span class="tiny muted">${fmt.rel(r.startedAt)}</span>
          ${r.duration ? `<span class="tiny muted">${r.duration}ms</span>` : ''}
          ${r.error ? `<span class="tiny crit" title="${escape(r.error)}">⚠️</span>` : ''}
        </div>`,
        )
        .join('')}
    </div>`;
};

const renderOverridePanel = () => `
  <div class="card" style="margin-bottom:14px;">
    <h3>⚙️ Override de jobs</h3>
    <p class="small muted" style="margin-bottom:12px;">Modificá temporalmente la expresión cron de un job sin reiniciar el servidor.</p>
    <div class="field-row">
      <select class="field-select" id="override-job" style="flex:1;">
        ${state.jobs.map((j) => `<option value="${escape(j.name)}">${escape(j.name)}</option>`).join('')}
      </select>
      <input class="field-input" id="override-cron" type="text" placeholder="*/5 * * * *" style="flex:1;"/>
      <button class="btn ghost" id="apply-override-btn">Aplicar</button>
    </div>
  </div>`;

const render = (root) => {
  const content = root.querySelector('#scheduler-content');
  if (!content) return;
  content.innerHTML = `
    <div class="scheduler-grid">
      <div>
        <div class="col-header" style="margin-bottom:12px;"><h3>📋 Jobs configurados</h3></div>
        ${state.jobs.map(renderJobCard).join('')}
        ${renderOverridePanel()}
      </div>
      <div>
        <div class="col-header" style="margin-bottom:12px;"><h3>📜 Log de ejecuciones</h3></div>
        <div class="card" style="padding:0;">
          <div class="list-inner">${renderRunsLog()}</div>
        </div>
      </div>
    </div>`;
  attachListeners(root, content);
};

const attachListeners = (root, content) => {
  content.querySelectorAll('.run-btn').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const name = btn.dataset.name;
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await api('/api/scheduler/run', { body: { jobName: name } });
        toast(`Job "${name}" ejecutado`, 'ok');
        await loadData(root);
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
        btn.innerHTML = '▶ Ejecutar';
      }
    }),
  );

  content.querySelector('#apply-override-btn')?.addEventListener('click', async () => {
    const jobName = content.querySelector('#override-job')?.value;
    const cronExpr = content.querySelector('#override-cron')?.value.trim();
    if (!cronExpr) {
      toast('Ingresá una expresión cron', 'crit');
      return;
    }
    const btn = content.querySelector('#apply-override-btn');
    btn.disabled = true;
    try {
      await api('/api/scheduler/override', { body: { jobName, cronExpr } });
      toast(`Override aplicado a "${jobName}"`, 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
    }
  });
};

const loadData = async (root) => {
  try {
    const [jobsRes, runsRes] = await Promise.allSettled([api('/api/scheduler/jobs'), api('/api/scheduler/runs')]);
    state.jobs = jobsRes.status === 'fulfilled' ? (jobsRes.value.jobs ?? []) : [];
    state.runs = runsRes.status === 'fulfilled' ? (runsRes.value.runs ?? []) : [];
    render(root);
  } catch (err) {
    toast(err.message, 'crit');
  }
};

export const renderScheduler = async (root) => {
  state = { jobs: [], runs: [] };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Scheduler</h1>
        <p class="view-subtitle page-subtitle">Gestioná y ejecutá jobs cron del agente manualmente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-sch-btn">↻ Actualizar</button>
      </div>
    </header>
    <div id="scheduler-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;

  root.querySelector('#refresh-sch-btn')?.addEventListener('click', () => loadData(root));
  await loadData(root);
};
