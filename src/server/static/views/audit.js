/* ══════════════════════════════════════════════════════════════════════════════
   Auditoría semanal — puntaje por área con datos reales, prioridades e historial
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, emptyState, withBtnSpinner } from '../lib/ui.js';

const BAND_TAG = {
  excelente: 'ok',
  bueno: 'ok',
  aceptable: 'info',
  riesgo: 'warn',
  critico: 'crit',
  'sin-datos': 'info',
};
const BAND_COLOR = {
  excelente: 'ok',
  bueno: 'ok',
  aceptable: 'info',
  riesgo: 'warn',
  critico: 'crit',
};
const BAND_LABEL = {
  excelente: 'excelente',
  bueno: 'bueno',
  aceptable: 'aceptable',
  riesgo: 'en riesgo',
  critico: 'crítico',
  'sin-datos': 'sin datos',
};
const FUENTE_LABEL = { ia: 'Interpretado por IA', reglas: 'Reglas automáticas' };

const fechaHora = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

const accionHtml = (accion, clase = 'btn tiny') =>
  `<button class="${clase}" data-accion-tipo="${escape(accion.tipo)}" data-accion-valor="${escape(accion.valor)}">${escape(accion.label)}</button>`;

const renderTrend = (trend) => {
  if (!trend || trend.current === null) return '';
  const delta = trend.deltaPct;
  if (delta === null || delta === undefined) {
    return '<div class="audit-trend small muted">Primera auditoría con puntaje: todavía no hay comparativo.</div>';
  }
  const flecha = delta > 0 ? '▲' : delta < 0 ? '▼' : '·';
  const clase = delta > 0 ? 'ok' : delta < 0 ? 'crit' : 'muted';
  return `<div class="audit-trend small ${clase}">${flecha} ${Math.abs(delta)}% vs. la auditoría anterior</div>`;
};

const renderHero = (audit, trend) => {
  const tag = BAND_TAG[audit.banda] ?? 'info';
  const conDatos = audit.areas.filter((a) => a.puntaje !== null).length;
  return `
    <div class="audit-hero card">
      <div class="audit-hero-left">
        <div class="muted tiny">Puntaje general — ${escape(fechaHora(audit.generatedAt))}</div>
        <div class="audit-hero-score">
          <span class="audit-hero-num">${audit.puntaje ?? '—'}</span>
          <span class="muted">/100</span>
          <span class="tag ${tag}" style="font-size:12px;">${escape(BAND_LABEL[audit.banda] ?? audit.banda)}</span>
        </div>
        ${renderTrend(trend)}
        <p class="audit-summary">${escape(audit.resumen ?? '')}</p>
        <div class="tiny muted">${escape(FUENTE_LABEL[audit.resumenFuente] ?? '')}</div>
      </div>
      <div class="audit-hero-right">
        <div class="audit-stat">
          <div class="audit-stat-num">${conDatos}/${audit.areas.length}</div>
          <div class="audit-stat-label">Áreas con datos</div>
        </div>
        <div class="audit-stat">
          <div class="audit-stat-num">${audit.prioridades.length}</div>
          <div class="audit-stat-label">Prioridades</div>
        </div>
      </div>
    </div>`;
};

const renderPrioridad = (p) => `
  <div class="card priority-card">
    <div class="priority-rank">#${p.rank}</div>
    <div class="priority-body">
      <h3 style="margin:0 0 4px;">${escape(p.titulo)}</h3>
      <p class="small muted" style="margin:0 0 8px;">${escape(p.porque)}</p>
      <div class="small" style="margin-bottom:8px;"><strong>Resultado esperado:</strong> ${escape(p.resultadoEsperado)}</div>
      <div class="btn-row">${accionHtml(p.accion)}</div>
    </div>
  </div>`;

const renderArea = (a) => {
  const sinDatos = a.puntaje === null;
  const tag = BAND_TAG[a.banda] ?? 'info';
  const color = BAND_COLOR[a.banda] ?? 'info';
  return `
    <div class="card audit-section-card">
      <div class="audit-section-head">
        <div class="audit-section-title">${escape(a.nombre)}</div>
        <div class="audit-section-score">
          ${
            sinDatos
              ? '<span class="muted small">sin datos</span>'
              : `<span class="audit-score-num">${a.puntaje}</span><span class="muted small">/100</span>`
          }
          <span class="tag ${tag}">${escape(BAND_LABEL[a.banda] ?? a.banda)}</span>
        </div>
      </div>
      ${
        sinDatos
          ? ''
          : `<div class="audit-section-bar"><div class="audit-section-bar-fill" style="width:${a.puntaje}%;background:var(--${color})"></div></div>`
      }
      <ul class="audit-observations">
        ${a.observaciones.map((o) => `<li class="small">${escape(o)}</li>`).join('')}
      </ul>
      <div class="btn-row">${accionHtml(a.accion)}</div>
    </div>`;
};

const renderHistorial = (historial) => `
  <div class="col-header" style="margin-top:24px"><h3>📜 Historial de auditorías</h3></div>
  <div class="card" style="padding:8px 0;">
    ${historial
      .map(
        (h) => `<div class="audit-history-row">
          <div class="small muted">${escape(fechaHora(h.generatedAt))}</div>
          <div class="audit-history-score">
            <span style="font-weight:800">${h.puntaje ?? '—'}</span>
            <span class="muted tiny">/100</span>
            <span class="tag ${BAND_TAG[h.banda] ?? 'info'} tiny">${escape(BAND_LABEL[h.banda] ?? h.banda)}</span>
          </div>
          <div class="tiny muted" style="flex:1;">${escape((h.resumen ?? '').slice(0, 140))}${(h.resumen ?? '').length > 140 ? '…' : ''}</div>
        </div>`,
      )
      .join('')}
  </div>`;

const renderSinAuditoria = () => `
  <div class="card" style="padding:28px;text-align:center;">
    ${emptyState('📊', 'Todavía no hay auditorías. Corré la primera para ver el puntaje de cada área con tus datos reales.', 240)}
    <p class="small muted" style="max-width:560px;margin:8px auto 0;">
      Evalúa crecimiento, contenido, objetivos, decisiones, producción, comunidad, economía e IA, y conexiones.
      Un área sin datos no puntúa: no se inventa un número.
    </p>
  </div>`;

const renderContenido = (latest, trend, history) => {
  if (!latest) return renderSinAuditoria();
  return `
    ${renderHero(latest, trend)}
    <div class="col-header"><h3>🎯 Prioridades</h3></div>
    ${
      latest.prioridades.length
        ? `<div class="page-grid">${latest.prioridades.map(renderPrioridad).join('')}</div>`
        : '<div class="card small muted" style="padding:16px;">Ninguna área por debajo de 70 con los datos actuales.</div>'
    }
    <div class="col-header" style="margin-top:24px"><h3>🩺 Salud por área</h3></div>
    <div class="page-grid">${latest.areas.map(renderArea).join('')}</div>
    ${history.length > 1 ? renderHistorial(history.slice(1)) : ''}`;
};

const conectarAcciones = (content) => {
  content.querySelectorAll('[data-accion-tipo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const valor = btn.dataset.accionValor;
      if (btn.dataset.accionTipo === 'tab') {
        document.querySelector(`.v2-tab[data-tab="${valor}"]`)?.click();
        return;
      }
      location.hash = `#${valor}`;
    });
  });
};

const loadData = async (root) => {
  const content = root.querySelector('#audit-content');
  if (!content) return;
  content.innerHTML = loadingScreen();
  const [latest, trend, history] = await Promise.all([
    apiSafe('/api/executive/audit/latest', null),
    apiSafe('/api/executive/audit/trend', null),
    apiSafe('/api/executive/audit/history?limit=10', []),
  ]);
  if (latest.error) {
    content.innerHTML =
      '<div class="alert crit">No se pudo cargar la auditoría: revisá la conexión con el backend.</div>';
    return;
  }
  content.innerHTML = renderContenido(latest.data, trend.data, Array.isArray(history.data) ? history.data : []);
  conectarAcciones(content);
};

export const renderAudit = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📊 Audit semanal</h1>
        <p class="view-subtitle page-subtitle">Puntaje de tu operación con datos reales: crecimiento, contenido, objetivos, decisiones, producción, comunidad, economía y conexiones.</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" id="run-audit-btn">▶ Correr audit ahora</button>
      </div>
    </header>
    <div id="audit-content" class="page-body">${loadingScreen()}</div>`;

  root.querySelector('#run-audit-btn').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'auditando…', async () => {
      try {
        await api('/api/executive/audit/run', { method: 'POST', body: {} });
        toast('Audit semanal completado', 'ok');
        await loadData(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  await loadData(root);
};
