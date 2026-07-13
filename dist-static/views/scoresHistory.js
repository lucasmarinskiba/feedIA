/* ══════════════════════════════════════════════════════════════════════════════
   SCORES HISTORY — Dashboard de historial de scores del Master Brain
   ══════════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'feedia.scores.history';

const escTxt = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

const fmtDate = (ts) => {
  try {
    return new Date(ts).toLocaleString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '—';
  }
};

const buildSVGChart = (entries) => {
  if (!entries.length)
    return '<div class="muted" style="text-align:center;padding:20px;">Sin datos para graficar</div>';

  const W = 600;
  const H = 140;
  const PAD_L = 30;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const points = entries.slice().reverse(); // cronológico ascendente
  const n = points.length;

  const xOf = (i) => PAD_L + (n <= 1 ? chartW / 2 : (i / (n - 1)) * chartW);
  const yOf = (v) => PAD_T + chartH - (Math.min(100, Math.max(0, v)) / 100) * chartH;

  const lineFor = (key, color) => {
    const coords = points.map((p, i) => `${xOf(i).toFixed(1)},${yOf(p[key] ?? 0).toFixed(1)}`).join(' ');
    return `<polyline points="${coords}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  };

  const dotsFor = (key, color) =>
    points
      .map((p, i) => `<circle cx="${xOf(i).toFixed(1)}" cy="${yOf(p[key] ?? 0).toFixed(1)}" r="3" fill="${color}"/>`)
      .join('');

  // Grid lines
  const gridLines = [0, 25, 50, 75, 100]
    .map((v) => {
      const y = yOf(v).toFixed(1);
      return `<line x1="${PAD_L}" y1="${y}" x2="${W - PAD_R}" y2="${y}" stroke="#333" stroke-width="1"/>
            <text x="${PAD_L - 4}" y="${y}" text-anchor="end" fill="#666" font-size="9" dominant-baseline="middle">${v}</text>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block;">
      ${gridLines}
      ${lineFor('innovationScore', '#a855f7')}
      ${lineFor('influencerScore', '#22d3ee')}
      ${lineFor('brandCoherenceScore', '#10b981')}
      ${dotsFor('innovationScore', '#a855f7')}
      ${dotsFor('influencerScore', '#22d3ee')}
      ${dotsFor('brandCoherenceScore', '#10b981')}
    </svg>
    <div style="display:flex;gap:16px;justify-content:center;margin-top:6px;font-size:11px;">
      <span><span style="color:#a855f7;">●</span> Innovación</span>
      <span><span style="color:#22d3ee;">●</span> Influencer</span>
      <span><span style="color:#10b981;">●</span> Coherencia</span>
    </div>`;
};

const buildCards = (entries) => {
  if (!entries.length)
    return '<div class="empty-state">Aún no hay scores registrados. Activá el Cerebro Maestro en Carrusel Studio para generar el primero.</div>';
  return entries
    .slice(0, 5)
    .map(
      (e) => `
    <div class="card" style="display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;">
      <div>
        <div class="meta" style="margin-bottom:4px;">
          <span class="tag tiny">${escTxt(e.contentFormat ?? 'carousel')}</span>
          ${e.jobId ? `<span class="tag tiny info">${escTxt(String(e.jobId).slice(0, 10))}</span>` : ''}
          <span class="small muted">${fmtDate(e.ts)}</span>
        </div>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#a855f7;">${e.innovationScore ?? '—'}</div>
          <div style="font-size:9px;opacity:0.6;">innov</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#22d3ee;">${e.influencerScore ?? '—'}</div>
          <div style="font-size:9px;opacity:0.6;">infl</div>
        </div>
        <div style="text-align:center;">
          <div style="font-size:18px;font-weight:800;color:#10b981;">${e.brandCoherenceScore ?? '—'}</div>
          <div style="font-size:9px;opacity:0.6;">coher</div>
        </div>
      </div>
    </div>`,
    )
    .join('');
};

const render = (container) => {
  const history = loadHistory();

  container.innerHTML = `
    <div class="page-header">
      <h1>📊 Historial de Scores</h1>
      <p class="muted">Evolución de los scores del Cerebro Maestro a lo largo del tiempo.</p>
    </div>

    <div class="card" style="margin-bottom:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <div style="font-weight:700;">Líneas de tendencia (últimas ${Math.min(history.length, 50)} sesiones)</div>
        <button class="btn ghost tiny" id="sh-clear">🗑️ Limpiar historial</button>
      </div>
      <div id="sh-chart">${buildSVGChart(history)}</div>
    </div>

    <h3 style="margin-bottom:10px;">Últimas 5 sesiones</h3>
    <div id="sh-cards">${buildCards(history)}</div>
  `;

  container.querySelector('#sh-clear')?.addEventListener('click', () => {
    if (!confirm('¿Limpiar todo el historial de scores?')) return;
    localStorage.removeItem(STORAGE_KEY);
    render(container);
  });
};

export const renderScoresHistory = (container) => {
  render(container);
};
