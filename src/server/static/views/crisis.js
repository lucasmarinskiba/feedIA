import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { crisis: null, historial: [] };

const SEVERITY_COLORS = { baja: 'ok', media: 'warn', alta: 'crit', critica: 'crit' };
const SEVERITY_ICONS = { baja: '🟡', media: '🟠', alta: '🔴', critica: '🚨' };

const renderStatusBanner = (crisis) => {
  if (!crisis?.publicacionesPausadas) {
    return `
      <div class="crisis-ok-banner">
        <div class="crisis-ok-icon">✅</div>
        <div>
          <div class="small" style="font-weight:600;">Sin crisis activa</div>
          <div class="tiny muted">Las publicaciones se procesan con normalidad.</div>
        </div>
      </div>`;
  }
  return `
    <div class="crisis-alert-banner severity-${crisis.severidad ?? 'alta'}">
      <div class="crisis-alert-icon">${SEVERITY_ICONS[crisis.severidad] ?? '🔴'}</div>
      <div style="flex:1;">
        <div class="small" style="font-weight:600;">CRISIS ACTIVA — ${escape((crisis.severidad ?? 'alta').toUpperCase())}</div>
        <div class="tiny" style="margin-top:2px;">${escape(crisis.descripcion ?? '')}</div>
        <div class="tiny muted" style="margin-top:2px;">Detectada ${fmt.rel(crisis.detectadaEn)}</div>
      </div>
      <span class="tag crit blink">PUBLICACIONES PAUSADAS</span>
    </div>`;
};

const renderTriggers = (crisis) => {
  if (!crisis?.triggers?.length) return '';
  return `
    <div class="card" style="margin-bottom:14px;">
      <h3>⚠️ Disparadores detectados</h3>
      ${crisis.triggers
        .map(
          (t) => `
        <div class="factor-row">
          <span class="tag ${SEVERITY_COLORS[t.severidad] ?? 'warn'}">${escape(t.severidad ?? 'media')}</span>
          <div>
            <div class="small">${escape(t.descripcion)}</div>
            <div class="tiny muted">${fmt.rel(t.detectadoEn)}</div>
          </div>
        </div>`,
        )
        .join('')}
    </div>`;
};

const renderActions = (crisis) => {
  if (!crisis?.acciones?.length) return '';
  return `
    <div class="card" style="margin-bottom:14px;">
      <h3>📋 Plan de acción</h3>
      <ol style="margin:0;padding-left:18px;">
        ${crisis.acciones
          .map(
            (a) => `
          <li class="small" style="margin-bottom:6px;">
            <span class="small">${escape(a.descripcion)}</span>
            ${a.completada ? '<span class="tag ok tiny" style="margin-left:6px;">✓ hecho</span>' : ''}
          </li>`,
          )
          .join('')}
      </ol>
    </div>`;
};

const renderHistorial = (historial) => {
  if (!historial.length) return `<div class="empty muted small">Sin historial de crisis previas.</div>`;
  return historial
    .map(
      (h) => `
    <div class="list-item">
      <div class="list-item-icon">${SEVERITY_ICONS[h.severidad] ?? '🔴'}</div>
      <div class="list-item-body">
        <div class="small">${escape(h.descripcion ?? 'Crisis')}</div>
        <div class="tiny muted">${fmt.date(h.detectadaEn)} — resuelto ${fmt.rel(h.resueltaEn)}</div>
      </div>
      <span class="tag ${SEVERITY_COLORS[h.severidad] ?? 'warn'}">${escape(h.severidad ?? 'media')}</span>
    </div>`,
    )
    .join('');
};

const render = (root) => {
  const crisis = state.crisis;
  const content = root.querySelector('#crisis-content');
  if (!content) return;

  content.innerHTML = `
    ${renderStatusBanner(crisis)}

    ${
      crisis?.publicacionesPausadas
        ? `
      ${renderTriggers(crisis)}
      ${renderActions(crisis)}
      <div class="card" style="margin-bottom:14px;">
        <h3>🔄 Control de crisis</h3>
        <p class="small muted" style="margin-bottom:12px;">Cuando la situación esté bajo control, podés reanudar las publicaciones programadas.</p>
        <div class="btn-row">
          <button class="btn primary" id="resume-btn">▶ Reanudar publicaciones</button>
          <button class="btn ghost" id="check-btn">🔍 Re-evaluar situación</button>
        </div>
      </div>`
        : `
      <div class="card" style="margin-bottom:14px;">
        <h3>🔍 Monitoreo preventivo</h3>
        <p class="small muted" style="margin-bottom:12px;">Ejecutá un chequeo manual para detectar señales de alerta antes de que escalen.</p>
        <div class="btn-row">
          <button class="btn ghost" id="check-btn">🔍 Chequear ahora</button>
          <button class="btn ghost crit" id="simulate-btn">⚠️ Simular crisis (test)</button>
        </div>
      </div>`
    }

    <div class="card" style="margin-top:8px;">
      <h3>📜 Historial</h3>
      <div id="historial-list">${renderHistorial(state.historial)}</div>
    </div>`;

  attachListeners(root, content);
};

const attachListeners = (root, content) => {
  content.querySelector('#resume-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Confirmás que querés reanudar todas las publicaciones?')) return;
    const btn = content.querySelector('#resume-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> reanudando…';
    try {
      await api('/api/crisis/resume', { body: {} });
      toast('Publicaciones reanudadas', 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
      btn.disabled = false;
      btn.innerHTML = '▶ Reanudar publicaciones';
    }
  });

  content.querySelector('#check-btn')?.addEventListener('click', async () => {
    const btn = content.querySelector('#check-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> evaluando…';
    try {
      const res = await api('/api/crisis/check', { body: {} });
      toast(res.crisisDetectada ? '⚠️ Crisis detectada' : 'Sin señales de crisis', res.crisisDetectada ? 'crit' : 'ok');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Re-evaluar situación';
    }
  });

  content.querySelector('#simulate-btn')?.addEventListener('click', async () => {
    if (!confirm('Esto simulará una crisis activa (solo para pruebas). ¿Continuar?')) return;
    try {
      await api('/api/crisis/simulate', { body: {} });
      toast('Crisis de prueba activada', 'warn');
      await loadData(root);
    } catch (err) {
      toast(err.message, 'crit');
    }
  });
};

const loadData = async (root) => {
  try {
    const [crisisRes, histRes] = await Promise.allSettled([api('/api/crisis/status'), api('/api/crisis/historial')]);
    state.crisis = crisisRes.status === 'fulfilled' ? crisisRes.value : null;
    state.historial = histRes.status === 'fulfilled' ? (histRes.value.historial ?? []) : [];
    render(root);
  } catch (err) {
    toast(err.message, 'crit');
  }
};

export const renderCrisis = async (root) => {
  state = { crisis: null, historial: [] };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Crisis Manager</h1>
        <p class="view-subtitle page-subtitle">Monitoreo de reputación y control de crisis en tiempo real.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="refresh-top-btn">↻ Actualizar</button>
      </div>
    </header>
    <div id="crisis-content" class="page-body"><div class="page-loading"><span class="spinner"></span> cargando…</div></div>`;

  root.querySelector('#refresh-top-btn')?.addEventListener('click', () => loadData(root));
  await loadData(root);
};
