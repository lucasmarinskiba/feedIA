/* ══════════════════════════════════════════════════════════════════════════════
   AUTO-OPTIMIZATION — Success pattern loop + recommendations + adjustments
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, emptyState, withBtnSpinner } from '../lib/ui.js';

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const renderExtraction = (e) => {
  if (!e || e.sampleSize === 0) {
    return emptyState(
      '🔁',
      'Datos insuficientes (n=0). Publicá más contenido para activar el loop de auto-optimización.',
      240,
    );
  }
  return `
    <div class="card">
      <div class="row spread" style="margin-bottom:14px;">
        <h3 style="margin:0;">📐 Patrones detectados</h3>
        <span class="tag info">n=${e.sampleSize} · ventana ${e.windowDays}d</span>
      </div>

      <div class="optimize-extraction-grid">
        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Formatos ganadores</div>
          ${(e.formatPerformance ?? [])
            .slice(0, 4)
            .map(
              (f) => `
            <div class="optimize-format-row">
              <div class="optimize-format-name">${escape(f.format)}</div>
              <div class="optimize-format-bar"><div class="optimize-format-bar-fill" style="width:${Math.min(100, (f.weightedScore / Math.max(1, e.formatPerformance[0].weightedScore)) * 100)}%"></div></div>
              <div class="optimize-format-stats tiny muted">saves ${f.avgSaves.toFixed(0)} · shares ${f.avgShares.toFixed(0)} · n=${f.count}</div>
            </div>`,
            )
            .join('')}
        </div>

        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Hooks que funcionan</div>
          ${(e.hookPatternHits ?? [])
            .slice(0, 5)
            .map(
              (h) => `
            <div class="optimize-hook-row">
              <span class="tag info tiny">${escape(h.category)}</span>
              <span class="small">${escape(h.patternName)}</span>
              <span class="muted tiny" style="margin-left:auto;">${h.hits} hits · score ${h.avgScore.toFixed(0)}</span>
            </div>`,
            )
            .join('')}
          ${!e.hookPatternHits?.length ? '<div class="small muted">Sin patrones clasificables aún.</div>' : ''}
        </div>

        <div>
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Mejores ventanas horarias</div>
          ${(e.bestPostingWindows ?? [])
            .map(
              (t) => `
            <div class="optimize-window-row">
              <span class="small">${DAY_NAMES[t.dayOfWeek]} ${String(t.hour).padStart(2, '0')}:00</span>
              <span class="muted tiny" style="margin-left:auto;">peso ${t.avgWeightedScore.toFixed(0)} (n=${t.count})</span>
            </div>`,
            )
            .join('')}
          ${!e.bestPostingWindows?.length ? '<div class="small muted">Sin ventanas estables.</div>' : ''}
        </div>
      </div>

      <div style="margin-top:14px;padding-top:14px;border-top:1px solid var(--border-soft);">
        <div class="small">
          <strong>Multiplicador del formato ganador vs tu propio baseline:</strong>
          <span class="tag ok">saves ×${e.baselineMultipliers.saves}</span>
          <span class="tag ok">shares ×${e.baselineMultipliers.shares}</span>
        </div>
      </div>
    </div>`;
};

const renderRecommendation = (r) => `
  <div class="card recommendation-card">
    <div class="meta">
      <span class="tag accent">${escape(r.format)}</span>
      <span class="tag info">×${r.expectedSavesMultiplier} saves</span>
      ${r.recommendedSlot ? `<span class="tag tiny">${DAY_NAMES[r.recommendedSlot.dayOfWeek]} ${String(r.recommendedSlot.hour).padStart(2, '0')}:00</span>` : ''}
      <span class="tag ${r.status === 'producido' ? 'ok' : r.status === 'descartado' ? 'crit' : 'warn'} tiny">${escape(r.status)}</span>
    </div>
    <h3 style="margin:6px 0 4px;">${escape(r.hookText)}</h3>
    <div class="body small"><strong>Ángulo:</strong> ${escape(r.topicAngle)}</div>
    <div class="small muted">${escape(r.whyThisWillWin)}</div>
    ${
      r.status === 'propuesto'
        ? `
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn primary tiny" data-action="produce" data-id="${escape(r.id)}">🤖 Producir</button>
        <button class="btn ghost tiny" data-action="discard" data-id="${escape(r.id)}">Descartar</button>
      </div>`
        : ''
    }
  </div>`;

const renderAdjustment = (a) => `
  <div class="card adjustment-card">
    <div class="meta">
      <span class="tag info">${escape(a.parameter)}</span>
      <span class="tag ${a.confidence === 'alta' ? 'ok' : a.confidence === 'media' ? 'warn' : 'muted'}">${escape(a.confidence)}</span>
      <span class="tag ${
        a.status === 'aprobado' || a.status === 'aplicado'
          ? 'ok'
          : a.status === 'rechazado'
            ? 'crit'
            : a.status === 'reverted'
              ? 'warn'
              : ''
      } tiny">${escape(a.status)}</span>
    </div>
    <div class="small" style="margin-top:6px;">
      <span class="muted">de</span> <code style="background:var(--bg-card-2);padding:2px 6px;border-radius:4px;">${escape(a.currentValue)}</code>
      <span class="muted">→</span> <code style="background:var(--accent-soft);padding:2px 6px;border-radius:4px;color:var(--accent);">${escape(a.recommendedValue)}</code>
    </div>
    <div class="small muted" style="margin-top:6px;">${escape(a.rationale)}</div>
    ${
      a.status === 'propuesto'
        ? `
      <div class="btn-row" style="margin-top:10px;">
        <button class="btn primary tiny" data-adj-action="aprobado" data-id="${escape(a.id)}">✓ Aprobar</button>
        <button class="btn ghost tiny" data-adj-action="rechazado" data-id="${escape(a.id)}">✕ Rechazar</button>
      </div>`
        : ''
    }
  </div>`;

const loadData = async (root) => {
  const content = root.querySelector('#optimize-content');
  if (!content) return;
  try {
    const [patternsR, recsR, adjR, summaryR] = await Promise.allSettled([
      api('/api/optimize/patterns?windowDays=60'),
      api('/api/optimize/recommendations'),
      api('/api/optimize/adjustments'),
      api('/api/optimize/summary'),
    ]);
    const extraction = patternsR.status === 'fulfilled' ? patternsR.value : null;
    const recs = recsR.status === 'fulfilled' && Array.isArray(recsR.value) ? recsR.value : [];
    const adjs = adjR.status === 'fulfilled' && Array.isArray(adjR.value) ? adjR.value : [];
    const summary = summaryR.status === 'fulfilled' ? summaryR.value : null;

    const openRecs = recs.filter((r) => r.status === 'propuesto');
    const openAdjs = adjs.filter((a) => a.status === 'propuesto');

    content.innerHTML = `
      ${
        summary?.summary
          ? `
        <div class="alert">
          <div class="tiny muted" style="margin-bottom:4px;">Último resumen ejecutivo · ${fmt.rel(summary.ranAt)}</div>
          <div>${escape(summary.summary)}</div>
        </div>`
          : ''
      }

      ${renderExtraction(extraction)}

      <div class="col-header" style="margin-top:20px"><h3>🎯 Próximas piezas recomendadas <span class="muted tiny">${openRecs.length} pendientes</span></h3></div>
      ${
        openRecs.length
          ? `<div class="page-grid">${openRecs.map(renderRecommendation).join('')}</div>`
          : emptyState('🔮', 'Sin recomendaciones abiertas. Corré el loop para generar nuevas.', 180)
      }

      <div class="col-header" style="margin-top:20px"><h3>⚙️ Ajustes de estrategia <span class="muted tiny">${openAdjs.length} pendientes</span></h3></div>
      ${
        openAdjs.length
          ? `<div class="page-grid">${openAdjs.map(renderAdjustment).join('')}</div>`
          : emptyState('🛠️', 'Sin ajustes pendientes. El loop propondrá nuevos en el próximo run.', 180)
      }`;

    // Wire produce buttons.
    content.querySelectorAll('[data-action="produce"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await withBtnSpinner(btn, 'produciendo…', async () => {
          try {
            const result = await api('/api/autonomous/produce', {
              method: 'POST',
              body: { kind: 'recommendation', recommendationId: btn.dataset.id },
            });
            toast(`Pieza producida — score ${result.scoreCard?.combinedScore ?? '?'}/100`, 'ok');
            await loadData(root);
          } catch (err) {
            toast('Error: ' + err.message, 'crit');
          }
        });
      });
    });

    content.querySelectorAll('[data-action="discard"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/optimize/recommendations/${btn.dataset.id}/status`, {
          method: 'POST',
          body: { status: 'descartado' },
        });
        await loadData(root);
      });
    });

    content.querySelectorAll('[data-adj-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/optimize/adjustments/${btn.dataset.id}/status`, {
          method: 'POST',
          body: { status: btn.dataset.adjAction },
        });
        await loadData(root);
      });
    });
  } catch (err) {
    content.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
    toast(err.message, 'crit');
  }
};

export const renderOptimize = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🔁 Auto-Optimization</h1>
        <p class="view-subtitle page-subtitle">Bucle de aprendizaje: el sistema extrae qué funciona en tu cuenta y propone próximas piezas.</p>
      </div>
      <div class="page-actions">
        <button class="btn primary" id="run-opt-btn">▶ Correr loop</button>
        <button class="btn" id="produce-batch-btn">🤖 Producir lote (3)</button>
      </div>
    </header>
    <div id="optimize-content" class="page-body">${loadingScreen()}</div>`;

  root.querySelector('#run-opt-btn').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'analizando…', async () => {
      try {
        await api('/api/optimize/run', { method: 'POST', body: { windowDays: 60, persist: true } });
        toast('Loop ejecutado con éxito', 'ok');
        await loadData(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  root.querySelector('#produce-batch-btn').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'produciendo lote…', async () => {
      try {
        const result = await api('/api/autonomous/produce-batch', { method: 'POST', body: { count: 3 } });
        toast(`${result.count} piezas producidas`, 'ok');
        await loadData(root);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  await loadData(root);
};
