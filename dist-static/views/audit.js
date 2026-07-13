/* ══════════════════════════════════════════════════════════════════════════════
   KPI AUDIT — Weekly autonomous system audit + strategic priorities
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, emptyState, withBtnSpinner } from '../lib/ui.js';

const BAND_TAG = {
  excelente: 'ok',
  bueno: 'ok',
  aceptable: 'info',
  riesgo: 'warn',
  critico: 'crit',
};

const renderSectionCard = (section) => {
  const tagClass = BAND_TAG[section.band] ?? 'info';
  return `
    <div class="card audit-section-card">
      <div class="audit-section-head">
        <div class="audit-section-title">${escape(section.section)}</div>
        <div class="audit-section-score">
          <span class="audit-score-num">${section.score}</span>
          <span class="muted small">/100</span>
          <span class="tag ${tagClass}">${escape(section.band)}</span>
        </div>
      </div>
      <div class="audit-section-bar"><div class="audit-section-bar-fill" style="width:${section.score}%;background:var(--${
        section.band === 'excelente' || section.band === 'bueno'
          ? 'ok'
          : section.band === 'aceptable'
            ? 'info'
            : section.band === 'riesgo'
              ? 'warn'
              : 'crit'
      })"></div></div>
      <ul class="audit-observations">
        ${(section.observations ?? []).map((o) => `<li class="small">${escape(o)}</li>`).join('')}
      </ul>
    </div>`;
};

const renderPriorityCard = (p) => `
  <div class="card priority-card">
    <div class="priority-rank">#${p.rank}</div>
    <div class="priority-body">
      <h3 style="margin:0 0 4px;">${escape(p.title)}</h3>
      <p class="small muted" style="margin:0 0 8px;">${escape(p.rationale)}</p>
      <div class="small" style="margin-bottom:8px;"><strong>Resultado esperado:</strong> ${escape(p.expectedOutcome)}</div>
      <div class="btn-row">
        <button class="btn tiny" data-route="agents" data-agent="${escape(p.ownerHint)}">→ ${escape(p.ownerHint)}</button>
      </div>
    </div>
  </div>`;

const renderTrend = (trend) => {
  if (!trend?.current) return '';
  const delta = trend.deltaPct;
  const deltaStr =
    delta === null ? 'sin comparativo' : `${delta > 0 ? '▲' : delta < 0 ? '▼' : '·'} ${Math.abs(delta)}%`;
  const deltaClass = delta === null ? 'muted' : delta > 0 ? 'ok' : delta < 0 ? 'crit' : 'muted';
  return `
    <div class="audit-trend small ${deltaClass}">
      ${deltaStr} vs. semana pasada
    </div>`;
};

const renderAuditBody = (audit, trend) => {
  if (!audit) {
    return emptyState('📊', 'Sin auditorías todavía. Corré la primera para arrancar el ciclo semanal.', 360);
  }
  const overallTag = BAND_TAG[audit.overallBand] ?? 'info';
  return `
    <div class="audit-hero card">
      <div class="audit-hero-left">
        <div class="muted tiny">Score general — semana del ${fmt.date(audit.generatedAt)}</div>
        <div class="audit-hero-score">
          <span class="audit-hero-num">${audit.overallScore}</span>
          <span class="muted">/100</span>
          <span class="tag ${overallTag}" style="font-size:12px;">${escape(audit.overallBand)}</span>
        </div>
        ${renderTrend(trend)}
        <p class="audit-summary">${escape(audit.executiveSummary ?? '')}</p>
      </div>
      <div class="audit-hero-right">
        <div class="audit-stat">
          <div class="audit-stat-num">${audit.priorities?.length ?? 0}</div>
          <div class="audit-stat-label">Prioridades</div>
        </div>
        <div class="audit-stat">
          <div class="audit-stat-num">${audit.appliedAdjustments ?? 0}</div>
          <div class="audit-stat-label">Ajustes auto-aplicados</div>
        </div>
        <div class="audit-stat">
          <div class="audit-stat-num">${audit.sections?.length ?? 0}</div>
          <div class="audit-stat-label">Áreas auditadas</div>
        </div>
      </div>
    </div>

    <div class="col-header"><h3>🎯 Prioridades de la semana</h3></div>
    <div class="page-grid">${(audit.priorities ?? []).map(renderPriorityCard).join('')}</div>

    <div class="col-header"><h3>🩺 Salud por área</h3></div>
    <div class="page-grid">${(audit.sections ?? []).map(renderSectionCard).join('')}</div>`;
};

const renderHistoryRow = (a) => `
  <div class="audit-history-row">
    <div class="small muted">${fmt.date(a.generatedAt)}</div>
    <div class="audit-history-score">
      <span style="font-weight:800">${a.overallScore}</span>
      <span class="muted tiny">/100</span>
      <span class="tag ${BAND_TAG[a.overallBand] ?? 'info'} tiny">${escape(a.overallBand)}</span>
    </div>
    <div class="tiny muted" style="flex:1;">${escape((a.executiveSummary ?? '').slice(0, 120))}…</div>
  </div>`;

const loadData = async (root) => {
  const content = root.querySelector('#audit-content');
  if (!content) return;
  try {
    const [latest, trend, history] = await Promise.allSettled([
      api('/api/audit/latest'),
      api('/api/audit/trend'),
      api('/api/audit/history?limit=10'),
    ]);
    const audit = latest.status === 'fulfilled' ? latest.value : null;
    const trendData = trend.status === 'fulfilled' ? trend.value : null;
    const historyData = history.status === 'fulfilled' ? history.value : [];

    content.innerHTML = `
      ${renderAuditBody(audit, trendData)}
      ${
        historyData.length > 1
          ? `
        <div class="col-header" style="margin-top:24px"><h3>📜 Historial</h3></div>
        <div class="card" style="padding:8px 0;">
          ${historyData.slice(1).map(renderHistoryRow).join('')}
        </div>`
          : ''
      }`;

    // Wire priority CTAs that route to agents.
    content.querySelectorAll('[data-agent]').forEach((btn) => {
      btn.addEventListener('click', () => {
        location.hash = 'agents';
      });
    });
  } catch (err) {
    content.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
    toast(err.message, 'crit');
  }
};

export const renderAudit = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📊 Audit semanal</h1>
        <p class="view-subtitle page-subtitle">Auditoría completa del sistema operativo. El Chief of Staff autónomo de tu cuenta.</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" id="run-audit-btn">▶ Correr audit ahora</button>
      </div>
    </header>
    <div id="audit-content" class="page-body">${loadingScreen()}</div>`;

  root.querySelector('#run-audit-btn').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'auditando…', async () => {
      try {
        await api('/api/audit/run', { method: 'POST', body: { windowDays: 7 } });
        toast('Audit semanal completado', 'ok');
        await loadData(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  await loadData(root);
};
