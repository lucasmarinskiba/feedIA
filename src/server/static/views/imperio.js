/* ══════════════════════════════════════════════════════════════════════════════
   SALA EJECUTIVA v2 — Vercel-grade premium minimal
   ──────────────────────────────────────────────────────────────────────────────
   Hub con tabs. Hero hairline, no rainbow gradients. Alto contraste letra/fondo.
   Incluye GrowthMetricsCard inline para Instagram + TikTok (sparkline SVG + KPIs).
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { crearPanelAnalytics } from './analyticsPanel.js';
import { crearPanelReportes } from './reportesPanel.js';

const panelAnalytics = crearPanelAnalytics();
const panelReportes = crearPanelReportes();

const fmtUsd = (n) => '$' + (n || 0).toLocaleString('en-US');
const hace = (iso) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  if (!Number.isFinite(t)) return '';
  const m = Math.max(0, Math.floor((Date.now() - t) / 60000));
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return `hace ${Math.floor(h / 24)} d`;
};
const fmtNum = (n) => {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 10_000) return (n / 1_000).toFixed(1) + 'k';
  if (n >= 1_000) return (n / 1_000).toFixed(2) + 'k';
  return (n || 0).toLocaleString('en-US');
};

const TABS = [
  { id: 'summary', label: '👑 Resumen' },
  { id: 'commandCenter', label: '🎯 Command Center' },
  { id: 'decisions', label: '⚖️ Decisiones' },
  { id: 'okrs', label: '🏁 OKRs' },
  { id: 'igAutopilot', label: '📷 IG Autopilot' },
  { id: 'ttAutopilot', label: '🎵 TT Autopilot' },
  { id: 'proposals', label: '💡 Propuestas' },
  { id: 'posts', label: '📊 Análisis posts' },
  { id: 'analytics', label: '📈 Analytics' },
  { id: 'reports', label: '📄 Reportes' },
  { id: 'audit', label: '✅ Audit' },
  { id: 'predictor', label: '📡 Predictor' },
  { id: 'tools', label: '🧰 Herramientas IA' },
  { id: 'alerts', label: '🚨 Alertas' },
  { id: 'logbook', label: '📒 Bitácora' },
  { id: 'experiments', label: '🧪 Experimentos' },
  { id: 'scheduler', label: '⏰ Scheduler' },
  { id: 'collabs', label: '🤝 Collabs' },
];

const EMBED_VIEWS = {
  logbook: { path: './bitacora.js', name: 'renderBitacora' },
  experiments: { path: './experimentos.js', name: 'renderExperimentos' },
  alerts: { path: './alertas.js', name: 'renderAlertas' },
  audit: { path: './audit.js', name: 'renderAudit' },
  predictor: { path: './predictor.js', name: 'renderPredictor' },
  tools: { path: './tools.js', name: 'renderTools' },
};

let activeTab = 'summary';

/* ──── Sparkline SVG nativo para growth cards ──── */
const sparklineSvg = (data, color) => {
  const W = 320,
    H = 60;
  if (!data || !data.length) return '';
  const max = Math.max(...data),
    min = Math.min(...data);
  const span = Math.max(1, max - min);
  const step = W / (data.length - 1);
  const pts = data.map((v, i) => `${(i * step).toFixed(1)},${(H - ((v - min) / span) * H).toFixed(1)}`).join(' ');
  const last = data[data.length - 1];
  const lastX = (data.length - 1) * step;
  const lastY = H - ((last - min) / span) * H;
  const gid = 'g' + color.replace('#', '');
  const area = `M0,${H} L${pts.replace(/ /g, ' L')} L${W},${H} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:60px;display:block;">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${color}" stop-opacity=".34"/>
      <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${area}" fill="url(#${gid})"/>
    <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="5" fill="${color}" opacity=".22"/>
    <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="2.4" fill="${color}"/>
  </svg>`;
};

/* ──── Growth Metrics Card (IG / TT) — datos reales vía /api/growth/summary ──── */
const PLATFORM_THEME = {
  instagram: {
    name: 'Instagram',
    accent: '#E1306C',
    accent2: '#F77737',
    glyph: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>`,
  },
  tiktok: {
    name: 'TikTok',
    accent: '#25F4EE',
    accent2: '#FE2C55',
    glyph: `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M19.6 6.7c-1.5-.4-2.7-1.5-3.1-3l-.1-.5h-3.6v13.3a2.6 2.6 0 1 1-2.6-2.6c.3 0 .6 0 .8.1V10.4a6.2 6.2 0 0 0-6 6.2 6.2 6.2 0 0 0 12.4 0V9.5c1.1.7 2.4 1.1 3.8 1.1V7c-.6 0-1.2-.1-1.6-.3Z"/></svg>`,
  },
};

const GROWTH_PERIODS = [
  { key: 'week', label: '7D' },
  { key: 'month', label: '30D' },
  { key: 'quarter', label: '90D' },
  { key: 'halfYear', label: '6M' },
  { key: 'year', label: '1A' },
];
const DEFAULT_GROWTH_PERIOD = 'month';

const growthCardHead = (theme, handle, badgeLabel, badgeColor) => `
  <div class="v2-grow-accent" style="background:linear-gradient(90deg,transparent,${theme.accent},transparent);"></div>
  <div class="v2-grow-head">
    <div class="v2-grow-brand">
      <div class="v2-grow-glyph" style="background:${theme.accent}1f;color:${theme.accent};">${theme.glyph}</div>
      <div>
        <div class="v2-eyebrow">${theme.name}</div>
        <div class="v2-grow-handle">${escape(handle || '—')}</div>
      </div>
    </div>
    <span class="v2-badge" style="background:${badgeColor}1a;color:${badgeColor};box-shadow:inset 0 0 0 1px ${badgeColor}3a;">${escape(badgeLabel)}</span>
  </div>`;

/** Card real: followers + tabs de período (deltas ya vienen todos calculados del backend, sin refetch) + métricas reales. */
const growthCard = ({ platform, handle, followers, deltas, spark, metrics }) => {
  const theme = PLATFORM_THEME[platform];
  const deltasAttr = escape(JSON.stringify(deltas || {}));
  return `<div class="v2-card v2-grow-card" data-growth-platform="${platform}" data-growth-deltas="${deltasAttr}">
    ${growthCardHead(theme, handle, 'live', theme.accent)}
    <div class="v2-grow-primary">
      <div class="v2-eyebrow">Followers</div>
      <div class="v2-grow-followers-row">
        <span class="v2-num-xl">${fmtNum(followers)}</span>
        <span class="v2-delta v2-grow-delta-out">—</span>
      </div>
      <div class="v2-hint v2-grow-hint-out">Historial acumulándose desde hoy.</div>
    </div>
    <div class="v2-grow-period-tabs">
      ${GROWTH_PERIODS.map((p) => `<button type="button" class="v2-grow-period-tab ${p.key === DEFAULT_GROWTH_PERIOD ? 'is-active' : ''}" data-growth-period="${p.key}">${p.label}</button>`).join('')}
    </div>
    <div class="v2-grow-spark">${sparklineSvg(spark, theme.accent)}</div>
    <div class="v2-grow-metrics">
      ${metrics
        .map(
          (m) => `<div class="v2-grow-metric">
        <div class="v2-eyebrow">${escape(m.label)}</div>
        <div class="v2-grow-metric-val">
          <span class="v2-num-md">${m.format === 'percent' ? escape(String(m.value)) + '%' : fmtNum(m.value)}</span>
        </div>
        ${m.hint ? `<div class="v2-hint">${escape(m.hint)}</div>` : ''}
      </div>`,
        )
        .join('')}
    </div>
  </div>`;
};

/** Cuenta no conectada — CTA real a /api/auth/{platform}/login, sin números inventados. */
const growthConnectCard = (platform, loginUrl) => {
  const theme = PLATFORM_THEME[platform];
  return `<div class="v2-card v2-grow-card v2-grow-card--empty">
    ${growthCardHead(theme, 'sin conectar', 'desconectado', '#a1a1aa')}
    <div class="v2-grow-connect">
      <p class="v2-hint">Conectá tu cuenta de ${theme.name} para ver followers, alcance y crecimiento reales acá.</p>
      <a class="v2-btn v2-btn-primary" href="${escape(loginUrl)}">Conectar ${theme.name}</a>
    </div>
  </div>`;
};

/** Token vencido o la API no respondió — nunca mostramos un número mock para disimularlo. */
const growthErrorCard = (platform, loginUrl, errorCode) => {
  const theme = PLATFORM_THEME[platform];
  const msg =
    errorCode === 'token_expired'
      ? `La conexión con ${theme.name} venció. Reconectá para seguir viendo datos reales.`
      : `${theme.name} no respondió. Puede ser un límite de rate temporal — probá de nuevo en unos minutos.`;
  return `<div class="v2-card v2-grow-card v2-grow-card--empty">
    ${growthCardHead(theme, 'conexión con problemas', 'error', '#f87171')}
    <div class="v2-grow-connect">
      <p class="v2-hint">${escape(msg)}</p>
      <a class="v2-btn v2-btn-outline" href="${escape(loginUrl)}">Reconectar ${theme.name}</a>
    </div>
  </div>`;
};

const renderGrowthCard = (platform, summary) => {
  if (!summary || !summary.connected) return growthConnectCard(platform, ccLoginUrl(platform));
  if (summary.error) return growthErrorCard(platform, ccLoginUrl(platform), summary.error);
  return growthCard({
    platform,
    handle: summary.handle,
    followers: summary.followers || 0,
    deltas: summary.deltas,
    spark: summary.sparkline || [],
    metrics: summary.metrics || [],
  });
};

/* ──── Resumen ejecutivo (Sala Ejecutiva) ──── */
const renderSummary = async (b) => {
  const staffActivos = (b.staff || []).filter((s) => s.estado === 'operando').length;
  const ascenso = b.ascenso
    ? `<div class="v2-ascenso">🎉 <strong>¡Ascendiste!</strong> Subiste de <strong>${escape(b.ascenso.de)}</strong> a <strong>${escape(b.ascenso.a)}</strong>.</div>`
    : '';
  const { data: growth } = await apiSafe('/api/growth/summary', null);
  return `
    ${ascenso}

    <!-- HERO minimal -->
    <header class="v2-hero">
      <div class="v2-hero-inner">
        <div>
          <div class="v2-hero-tags">
            <span class="v2-badge v2-badge-brand">Sala Ejecutiva</span>
            <span class="v2-badge v2-badge-ok">Tier ${escape(b.tier)}</span>
          </div>
          <h1 class="v2-h1">
            Tu imperio opera a escala
            <span class="v2-h1-dim">sin nómina ni agencia.</span>
          </h1>
          <p class="v2-lead">${escape(b.narrativa || 'FeedIA reemplaza un equipo ejecutivo de contenido. Esta sala muestra la economía real y el crecimiento por red.')}</p>
        </div>
        <div class="v2-hero-cta">
          <button class="v2-btn v2-btn-primary" data-go-route="autopilot">Activar Auto-pilot →</button>
          <button class="v2-btn v2-btn-outline" data-go-route="cliente">Modo Cliente</button>
        </div>
      </div>
      <div class="v2-tier-progress">
        <div class="v2-tier-progress-head">
          <span class="v2-eyebrow">Progreso al siguiente nivel</span>
          <span class="v2-num-sm">${b.tierProgresoPct || 0}%</span>
        </div>
        <div class="v2-tier-progress-bar"><div style="width:${b.tierProgresoPct || 0}%;"></div></div>
      </div>
    </header>

    <!-- KPI grid -->
    <section class="v2-section">
      <div class="v2-section-head">
        <div class="v2-eyebrow">Economía operativa</div>
        <h2 class="v2-h2">Lo que tu equipo IA factura hoy</h2>
        <p class="v2-section-desc">Métricas financieras y de palanca.</p>
      </div>
      <div class="v2-kpi-grid">
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Apalancamiento</div><div class="v2-num-xl">${escape(b.leverage.ratioLabel || '0×')}</div><div class="v2-hint">acciones IA por indicación tuya</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Acciones ejecutadas</div><div class="v2-num-xl">${(b.leverage.accionesEjecutadas || 0).toLocaleString('en-US')}</div><div class="v2-hint">por tu equipo IA</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Gastos en dólares</div><div class="v2-num-xl">${fmtUsd(b.leverage.gastosUsd)}</div><div class="v2-hint">gasto real en IA (texto + video)</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Ahorros estimados</div><div class="v2-num-xl">${fmtUsd(b.leverage.ahorroUsd)}</div><div class="v2-hint">vs. ${fmtUsd(b.leverage.costoHumanoEquivalenteUsd)} de equipo humano</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Horas humanas ahorradas</div><div class="v2-num-xl">${(b.leverage.horasHumanasAhorradas || 0).toLocaleString('en-US')}h</div><div class="v2-hint">${(b.leverage.piezasCreadas?.carruseles || 0).toLocaleString('en-US')} carruseles · ${(b.leverage.piezasCreadas?.videos || 0).toLocaleString('en-US')} videos (edición, guion, calendario, gestión)</div></div>
      </div>
    </section>

    <!-- GROWTH BY NETWORK -->
    <section class="v2-section">
      <div class="v2-section-head">
        <div class="v2-eyebrow">Crecimiento por red</div>
        <h2 class="v2-h2">Instagram &amp; TikTok</h2>
        <p class="v2-section-desc">Audiencia, alcance y conversión por plataforma · sparkline 30d.</p>
      </div>
      <div class="v2-grow-grid">
        ${renderGrowthCard('instagram', growth?.instagram)}
        ${renderGrowthCard('tiktok', growth?.tiktok)}
      </div>
    </section>

    <!-- STAFF + HITOS -->
    <section class="v2-2col">
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head">
          <strong>Staff IA reportándote</strong>
          <span class="v2-badge v2-badge-ok">${staffActivos} de ${(b.staff || []).length} con actividad</span>
        </div>
        <div class="v2-staff">
          ${(b.staff || [])
            .map((s) => {
              const activo = s.estado === 'operando';
              const reporte = s.ultimoReporte
                ? `<div class="v2-hint">“${escape(s.ultimoReporte.texto)}” · ${hace(s.ultimoReporte.cuando)}</div>`
                : '';
              return `
            <div class="v2-staff-row">
              <span class="v2-dot" style="background:${activo ? '#34d399' : '#52525b'};"></span>
              <div class="v2-staff-main">
                <div class="v2-staff-rol">${escape(s.rol)}</div>
                <div class="v2-hint" style="color:${activo ? '#34d399' : 'var(--v2-fg-3)'};">${escape(s.estado)}${activo ? ` · ${s.acciones} acciones reales` : ''}</div>
                ${reporte}
              </div>
            </div>`;
            })
            .join('')}
        </div>
      </div>
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Logros desbloqueados</strong></div>
        ${
          b.hitos && b.hitos.length
            ? `<div class="v2-hitos">
          ${b.hitos
            .map(
              (t) => `
            <div class="v2-hito-row">
              <span class="v2-hito-ic">🏆</span>
              <div>
                <div class="v2-staff-rol">${escape(t.titulo)}</div>
                <div class="v2-hint">${escape(t.detalle)}</div>
              </div>
              <span class="v2-badge v2-badge-warn">${hace(t.logradoEn)}</span>
            </div>`,
            )
            .join('')}
        </div>`
            : '<div class="v2-hint">Tus primeros logros aparecerán acá cuando el equipo haga algo real.</div>'
        }
      </div>
    </section>

    <!-- INTERACCIONES REALES -->
    <section class="v2-section">
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Interacciones recientes</strong><span class="v2-hint">agentes · automatizaciones · redes · piezas</span></div>
        ${
          (b.interacciones || []).length
            ? `<div class="v2-feed">${(b.interacciones || [])
                .map(
                  (i) => `
            <div class="v2-feed-row">
              <span class="v2-feed-when">${hace(i.cuando)}</span>
              <span class="v2-feed-tipo v2-feed-tipo--${escape(i.tipo)}">${escape(i.tipo)}</span>
              <div class="v2-feed-body">
                <div class="v2-feed-route"><strong>${escape(i.de)}</strong> → ${escape(i.a)}</div>
                <div class="v2-hint">${escape(i.texto)}</div>
              </div>
            </div>`,
                )
                .join('')}</div>`
            : '<div class="v2-hint">Todavía no hay interacciones registradas. Aparecen cuando tus agentes, automatizaciones o publicaciones se ejecutan.</div>'
        }
      </div>
    </section>
  `;
};

const PROP_PRIORIDAD = {
  alta: { label: 'Alta', color: '#fbbf24', fondo: 'rgba(251,191,36,.14)' },
  media: { label: 'Media', color: '#60a5fa', fondo: 'rgba(96,165,250,.14)' },
  baja: { label: 'Baja', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)' },
};

const renderProposals = async () => {
  const { data, error } = await apiSafe('/api/executive/proposals', []);
  const propuestas = Array.isArray(data) ? data : [];
  const cabecera = `
    <div class="prop-cabecera">
      <div class="v2-eyebrow">Propuestas del equipo</div>
      <h2 class="v2-h2">${propuestas.length ? `${propuestas.length} oportunidad(es) detectada(s)` : 'Sin oportunidades por ahora'}</h2>
      <p class="v2-section-desc">Tus agentes proponen crecer a partir de tus datos reales: el formato que rinde, la hora de publicar, leads que esperan respuesta y metas atrasadas. Elegís cuáles hacer.${error ? ' <span class="prop-aviso">No se pudo cargar: revisá la conexión con el backend.</span>' : ''}</p>
    </div>`;

  if (propuestas.length === 0) {
    return `
      <div class="prop-wrap">
        ${cabecera}
        <div class="v2-card v2-card-pad prop-vacio">
          <div class="v2-hint">Cuando tus datos muestren una oportunidad (un formato que rinde, un lead calificado sin responder o un OKR atrasado), aparece acá con el dato que la originó.</div>
        </div>
      </div>`;
  }

  return `
    <div class="prop-wrap">
      ${cabecera}
      <div class="prop-grid">
        ${propuestas
          .map((p) => {
            const pr = PROP_PRIORIDAD[p.prioridad] || PROP_PRIORIDAD.media;
            return `
          <article class="v2-card prop-card" data-prop-id="${escape(p.id)}">
            <header class="prop-head">
              <span class="prop-agente"><span class="prop-emoji">${escape(p.emoji)}</span>${escape(p.agente)}</span>
              <span class="prop-prio" style="color:${pr.color};background:${pr.fondo};">${escape(pr.label)}</span>
            </header>
            <h3 class="prop-titulo">${escape(p.titulo)}</h3>
            <p class="prop-detalle">${escape(p.detalle)}</p>
            <div class="prop-dato"><span>Dato</span>${escape(p.dato)}</div>
            <footer class="prop-acciones">
              <button class="v2-btn v2-btn-ghost v2-btn-sm" data-prop-descartar="${escape(p.id)}">Descartar</button>
              <button class="v2-btn v2-btn-primary v2-btn-sm" data-prop-aceptar="${escape(p.id)}"
                data-accion-tipo="${escape(p.accion.tipo)}" data-accion-valor="${escape(p.accion.valor)}">${escape(p.accion.label)}</button>
            </footer>
          </article>`;
          })
          .join('')}
      </div>
      <style>
        .prop-wrap{display:flex;flex-direction:column;gap:18px;}
        .prop-cabecera{display:flex;flex-direction:column;gap:6px;}
        .prop-aviso{color:#fbbf24;}
        .prop-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
        .prop-card{padding:20px;display:flex;flex-direction:column;gap:12px;}
        .prop-head{display:flex;justify-content:space-between;align-items:center;gap:10px;}
        .prop-agente{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--v2-fg-2);}
        .prop-emoji{font-size:16px;}
        .prop-prio{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:4px 10px;border-radius:999px;}
        .prop-titulo{margin:0;font-size:16px;font-weight:600;letter-spacing:-0.015em;color:var(--v2-fg);line-height:1.3;}
        .prop-detalle{margin:0;font-size:13px;color:var(--v2-fg-2);line-height:1.5;}
        .prop-dato{padding:10px 12px;border-radius:10px;background:var(--v2-hover);font-size:12.5px;color:var(--v2-fg-2);line-height:1.45;display:flex;flex-direction:column;gap:3px;}
        .prop-dato span{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
        .prop-acciones{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--v2-line);margin-top:auto;}
        .prop-vacio{text-align:center;padding:36px 24px;}
        @media (max-width:720px){.prop-grid{grid-template-columns:1fr;}}
      </style>
    </div>`;
};

const wireProposals = (body, root, repaint) => {
  body.querySelectorAll('[data-prop-descartar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await fetch('/api/executive/proposals/resolver', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: btn.dataset.propDescartar, estado: 'descartada' }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const tarjeta = btn.closest('.prop-card');
        toast('Propuesta descartada', 'info');
        if (body.querySelectorAll('.prop-card').length <= 1) void repaint();
        else tarjeta?.remove();
      } catch (err) {
        btn.disabled = false;
        toast(`No se pudo descartar: ${err.message}`, 'err');
      }
    });
  });

  body.querySelectorAll('[data-prop-aceptar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await fetch('/api/executive/proposals/resolver', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ id: btn.dataset.propAceptar, estado: 'aceptada' }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const tipo = btn.dataset.accionTipo;
        const valor = btn.dataset.accionValor;
        if (tipo === 'conectar') {
          window.location.href = ccLoginUrl(valor);
          return;
        }
        if (tipo === 'tab') {
          root.querySelector(`.v2-tab[data-tab="${valor}"]`)?.click();
          return;
        }
        window.location.hash = `#${valor}`;
      } catch (err) {
        btn.disabled = false;
        toast(`No se pudo aceptar: ${err.message}`, 'err');
      }
    });
  });
};
const PA_FORMATO = { reel: 'Reel', carrusel: 'Carrusel', imagen: 'Imagen', video: 'Video' };
const PA_VEREDICTO = {
  destacado: { label: 'Destacado', color: '#6ee7b7', fondo: 'rgba(16,185,129,.12)' },
  escondido: { label: 'Escondido', color: '#d8b4fe', fondo: 'rgba(168,85,247,.14)' },
  normal: { label: 'Normal', color: '#e4e4e7', fondo: 'rgba(255,255,255,.07)' },
  bajo: { label: 'Bajo', color: '#fca5a5', fondo: 'rgba(248,113,113,.12)' },
  'sin-base': { label: 'Sin base', color: '#a1a1aa', fondo: 'rgba(161,161,170,.12)' },
  'sin-datos': { label: 'Sin datos', color: '#a1a1aa', fondo: 'rgba(161,161,170,.12)' },
};
const PA_ORDEN = {
  recientes: 'Más recientes',
  interaccion: 'Mejor interacción',
  peor: 'Peor interacción',
  alcance: 'Mayor alcance',
};
const PA_PLATAFORMA = { instagram: 'Instagram', tiktok: 'TikTok' };
const PA_FUENTE = { ia: 'Interpretado por IA', reglas: 'Reglas automáticas' };
const PA_ESTILOS = `<style>
  .pa-wrap{display:flex;flex-direction:column;gap:18px;}
  .pa-cabecera{display:flex;flex-direction:column;gap:6px;}
  .pa-aviso{color:#fbbf24;}
  .pa-plataformas{display:flex;gap:8px;flex-wrap:wrap;}
  .pa-plat{border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;gap:8px;align-items:center;}
  .pa-plat em{font-style:normal;font-size:11px;font-weight:500;color:var(--v2-fg-3);}
  .pa-plat.is-on{background:var(--v2-hover);color:var(--v2-fg);border-color:var(--v2-fg-3);}
  .pa-cuerpo{display:flex;flex-direction:column;gap:18px;}
  .pa-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
  .pa-kpi{background:var(--v2-hover);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px;}
  .pa-kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
  .pa-kpi-valor{font-size:20px;font-weight:700;color:var(--v2-fg);letter-spacing:-0.02em;}
  .pa-kpi-nota{font-size:11.5px;color:var(--v2-fg-3);}
  .pa-mira{border-radius:14px;padding:18px;background:rgba(168,85,247,.08);display:flex;flex-direction:column;gap:10px;}
  .pa-mira-head{display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;}
  .pa-mira-agente{font-size:13px;font-weight:600;color:var(--v2-fg);}
  .pa-mira-fuente{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--v2-fg-3);}
  .pa-mira-texto{margin:0;font-size:14px;line-height:1.6;color:var(--v2-fg-2);}
  .pa-bloque{display:flex;flex-direction:column;gap:12px;}
  .pa-subtitulo{margin:0;font-size:14px;font-weight:600;color:var(--v2-fg);}
  .pa-barras{display:flex;flex-direction:column;gap:8px;}
  .pa-barra-fila{display:grid;grid-template-columns:140px 1fr 64px;gap:12px;align-items:center;font-size:13px;color:var(--v2-fg-2);}
  .pa-barra-nombre em{font-style:normal;color:var(--v2-fg-3);}
  .pa-barra-track{height:8px;border-radius:999px;background:var(--v2-hover);overflow:hidden;}
  .pa-barra-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#fdba74,#fb923c);}
  .pa-barra-valor{text-align:right;font-weight:600;color:var(--v2-fg);}
  .pa-filtros{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
  .pa-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .pa-chip{border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .pa-chip.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .pa-orden{display:flex;align-items:center;gap:8px;font-size:12px;color:var(--v2-fg-3);}
  .pa-orden select{background:var(--v2-hover);color:var(--v2-fg);border:1px solid var(--v2-line);border-radius:8px;padding:6px 8px;font-size:12px;}
  .pa-lista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:14px;}
  .pa-post{padding:18px;display:flex;flex-direction:column;gap:10px;}
  .pa-post-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .pa-post-formato{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--v2-fg-3);}
  .pa-post-fecha{font-size:12px;color:var(--v2-fg-3);margin-right:auto;}
  .pa-veredicto{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:4px 10px;border-radius:999px;}
  .pa-post-titulo{margin:0;font-size:15px;font-weight:600;line-height:1.35;color:var(--v2-fg);}
  .pa-metricas{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px;}
  .pa-metrica{background:var(--v2-hover);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--v2-fg-3);}
  .pa-metrica strong{font-size:15px;color:var(--v2-fg);}
  .pa-motivo{margin:0;font-size:12px;color:var(--v2-fg-3);line-height:1.45;}
  .pa-consejo{padding:10px 12px;border-radius:10px;background:rgba(168,85,247,.08);font-size:13px;line-height:1.5;color:var(--v2-fg-2);display:flex;flex-direction:column;gap:3px;}
  .pa-consejo span{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
  .pa-enlace{font-size:12px;color:#fdba74;text-decoration:none;margin-top:auto;}
  .pa-vacio{text-align:center;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:6px;}
  @media (max-width:720px){.pa-barra-fila{grid-template-columns:110px 1fr 56px;}.pa-lista{grid-template-columns:1fr;}}
</style>`;

const paEstado = { plataforma: 'instagram', formato: 'todos', orden: 'recientes' };
let paDatos = null;

const paPct = (n) => (typeof n === 'number' ? `${n.toFixed(1)}%` : '—');
const paNum = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : '—');
const paHora = (h) => (typeof h === 'number' ? `${h}h` : '—');
const paFecha = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
};
const paEtiquetaAlcance = (plataforma) => (plataforma === 'tiktok' ? 'Vistas' : 'Alcance');

const paElegirPlataforma = () => {
  if (!paDatos || paDatos[paEstado.plataforma]?.conectado) return;
  const otra = ['instagram', 'tiktok'].find((p) => paDatos[p]?.conectado);
  if (otra) paEstado.plataforma = otra;
};

const paOrdenar = (posts, orden) => {
  const tasa = (p) => p.tasaInteraccion ?? -1;
  const copia = [...posts];
  if (orden === 'interaccion') return copia.sort((a, b) => tasa(b) - tasa(a));
  if (orden === 'peor') return copia.sort((a, b) => tasa(a) - tasa(b));
  if (orden === 'alcance') return copia.sort((a, b) => (b.alcance ?? -1) - (a.alcance ?? -1));
  return copia;
};

const paKpi = (etiqueta, valor, nota = '') => `
  <div class="pa-kpi">
    <span class="pa-kpi-label">${escape(etiqueta)}</span>
    <span class="pa-kpi-valor">${escape(valor)}</span>
    ${nota ? `<span class="pa-kpi-nota">${escape(nota)}</span>` : ''}
  </div>`;

const paResumenHtml = (b) => {
  const r = b.resumen;
  const alcance = paEtiquetaAlcance(b.plataforma);
  const tendencia =
    r.tasaUltimos5 !== null && r.tasaAnteriores !== null
      ? paKpi('Últimos 5 posts', paPct(r.tasaUltimos5), `Los anteriores: ${paPct(r.tasaAnteriores)}`)
      : '';
  return `<div class="pa-kpis">
    ${paKpi('Posts analizados', String(r.analizados))}
    ${paKpi('Tasa mediana', paPct(r.tasaMediana), `interacción sobre ${alcance.toLowerCase()}`)}
    ${paKpi(`${alcance} mediano`, paNum(r.alcanceMediano))}
    ${r.mejorFormato ? paKpi('Formato que más rinde', PA_FORMATO[r.mejorFormato] ?? r.mejorFormato) : ''}
    ${typeof r.mejorHora === 'number' ? paKpi('Mejor hora', paHora(r.mejorHora), 'hora de Argentina') : ''}
    ${tendencia}
  </div>`;
};

const paDevolucionHtml = (b) => {
  const d = b.devolucion;
  if (!d) return '';
  return `<section class="pa-mira">
    <div class="pa-mira-head">
      <span class="pa-mira-agente">${escape(d.agente)} · lectura de tus posts</span>
      <span class="pa-mira-fuente">${escape(PA_FUENTE[d.fuente] ?? '')}</span>
    </div>
    <p class="pa-mira-texto">${escape(d.general)}</p>
  </section>`;
};

const paFormatosHtml = (r) => {
  const filas = r.porFormato.filter((f) => typeof f.tasaMediana === 'number');
  if (filas.length === 0) return '';
  const max = Math.max(...filas.map((f) => f.tasaMediana));
  return `<section class="pa-bloque">
    <h3 class="pa-subtitulo">Tasa de interacción por formato</h3>
    <div class="pa-barras">${filas
      .map((f) => {
        const ancho = max > 0 ? Math.max(4, (f.tasaMediana / max) * 100) : 0;
        return `<div class="pa-barra-fila">
          <span class="pa-barra-nombre">${escape(PA_FORMATO[f.formato] ?? f.formato)} <em>(${f.posts})</em></span>
          <span class="pa-barra-track"><span class="pa-barra-fill" style="width:${ancho.toFixed(1)}%"></span></span>
          <span class="pa-barra-valor">${escape(paPct(f.tasaMediana))}</span>
        </div>`;
      })
      .join('')}</div>
  </section>`;
};

const paFiltrosHtml = (posts) => {
  const formatos = [...new Set(posts.map((p) => p.formato))];
  const chips = ['todos', ...formatos]
    .map(
      (f) =>
        `<button class="pa-chip${paEstado.formato === f ? ' is-on' : ''}" data-pa-formato="${escape(f)}">${f === 'todos' ? 'Todos' : escape(PA_FORMATO[f] ?? f)}</button>`,
    )
    .join('');
  const opciones = Object.entries(PA_ORDEN)
    .map(([k, v]) => `<option value="${escape(k)}"${paEstado.orden === k ? ' selected' : ''}>${escape(v)}</option>`)
    .join('');
  return `<div class="pa-filtros">
    <div class="pa-chips">${chips}</div>
    <label class="pa-orden"><span>Ordenar por</span><select data-pa-orden>${opciones}</select></label>
  </div>`;
};

const paPostHtml = (p, b) => {
  const v = PA_VEREDICTO[p.veredicto] ?? PA_VEREDICTO.normal;
  const metricas = [
    [paEtiquetaAlcance(b.plataforma), paNum(p.alcance)],
    ['Interacciones', paNum(p.interacciones)],
    ['Tasa', paPct(p.tasaInteraccion)],
    ['Likes', paNum(p.likes)],
    ['Comentarios', paNum(p.comentarios)],
  ];
  if (typeof p.compartidos === 'number') metricas.push(['Compartidos', paNum(p.compartidos)]);
  if (typeof p.guardados === 'number') metricas.push(['Guardados', paNum(p.guardados)]);
  const duracion = typeof p.duracionSeg === 'number' ? ` · ${p.duracionSeg} s` : '';
  const consejo = b.devolucion?.porPost?.[p.id];
  return `<article class="v2-card pa-post">
    <header class="pa-post-head">
      <span class="pa-post-formato">${escape(PA_FORMATO[p.formato] ?? p.formato)}</span>
      <span class="pa-post-fecha">${escape(paFecha(p.publicadoEn))} · ${escape(paHora(p.horaLocal))}${escape(duracion)}</span>
      <span class="pa-veredicto" style="color:${v.color};background:${v.fondo};">${escape(v.label)}</span>
    </header>
    <h4 class="pa-post-titulo">${escape(p.texto)}</h4>
    <div class="pa-metricas">${metricas
      .map(
        ([etiqueta, valor]) =>
          `<div class="pa-metrica"><span>${escape(etiqueta)}</span><strong>${escape(valor)}</strong></div>`,
      )
      .join('')}</div>
    <p class="pa-motivo">${escape(p.motivo)}</p>
    ${consejo ? `<div class="pa-consejo"><span>${escape(b.devolucion.agente)}</span>${escape(consejo)}</div>` : ''}
    ${p.url ? `<a class="pa-enlace" href="${escape(p.url)}" target="_blank" rel="noopener noreferrer">Ver publicación →</a>` : ''}
  </article>`;
};

const paAviso = (texto, clase = 'v2-card v2-card-pad pa-vacio') =>
  `<div class="${clase}"><div class="v2-hint">${texto}</div></div>`;

const paCuerpo = () => {
  const b = paDatos?.[paEstado.plataforma];
  const nombre = PA_PLATAFORMA[paEstado.plataforma];
  if (!b) return paAviso('No hay datos del análisis por ahora.');
  if (!b.conectado) {
    const mensaje =
      b.error === 'token_expired'
        ? `La conexión de ${escape(nombre)} venció. Volvé a conectarla para seguir analizando.`
        : `Conectá ${escape(nombre)} para analizar tus posts con datos reales.`;
    return `<div class="v2-card v2-card-pad pa-vacio">
      <div class="v2-hint">${mensaje}</div>
      <a class="v2-btn v2-btn-primary" href="${escape(ccLoginUrl(paEstado.plataforma))}" style="margin-top:10px;">Conectar ${escape(nombre)}</a>
    </div>`;
  }
  if (b.error === 'lectura_fallida') {
    return paAviso(`No pudimos leer tu cuenta de ${escape(nombre)} en este momento. Probá actualizar en un rato.`);
  }
  if (b.posts.length === 0) {
    return paAviso(`Todavía no hay posts publicados en ${escape(nombre)} para analizar.`);
  }
  if (paEstado.formato !== 'todos' && !b.posts.some((p) => p.formato === paEstado.formato)) {
    paEstado.formato = 'todos';
  }
  const visibles = paOrdenar(
    b.posts.filter((p) => paEstado.formato === 'todos' || p.formato === paEstado.formato),
    paEstado.orden,
  );
  const aviso = b.resumen.baseSuficiente
    ? ''
    : `<div class="v2-hint pa-aviso">Hacen falta al menos 3 posts con métricas para comparar. Mostramos los números sin veredicto de tendencia.</div>`;
  return `${aviso}${paResumenHtml(b)}${paDevolucionHtml(b)}${paFormatosHtml(b.resumen)}
    <section class="pa-bloque">
      <h3 class="pa-subtitulo">Posts</h3>
      ${paFiltrosHtml(b.posts)}
      <div class="pa-lista">${
        visibles.length
          ? visibles.map((p) => paPostHtml(p, b)).join('')
          : paAviso('No hay posts de ese formato en esta lista.', 'v2-card v2-card-pad pa-vacio')
      }</div>
    </section>`;
};

const paPestanasHtml = () =>
  `<div class="pa-plataformas">${['instagram', 'tiktok']
    .map((p) => {
      const b = paDatos?.[p];
      const estado = !b ? 'sin datos' : b.conectado ? `${b.posts.length} posts` : 'sin conectar';
      return `<button class="pa-plat${paEstado.plataforma === p ? ' is-on' : ''}" data-pa-plat="${p}">${escape(PA_PLATAFORMA[p])} <em>${escape(estado)}</em></button>`;
    })
    .join('')}</div>`;

const paCabecera = (error) => `
  <div class="pa-cabecera">
    <div class="v2-eyebrow">Análisis de tus posts</div>
    <h2 class="v2-h2">Qué funciona en tu contenido</h2>
    <p class="v2-section-desc">Cada post se compara con la mediana de tu propia cuenta. Tasa de interacción = (likes + comentarios + compartidos + guardados) ÷ alcance (Instagram) o vistas (TikTok). Los datos vienen de la API de cada red y se actualizan cada 30 minutos.${error ? ' <span class="pa-aviso">No se pudo cargar el análisis: revisá la conexión con el backend.</span>' : ''}</p>
    <div><button class="v2-btn v2-btn-ghost v2-btn-sm" data-pa-refrescar>Actualizar datos</button></div>
  </div>`;

const renderPostsAnalysis = async () => {
  const { data, error } = await apiSafe('/api/executive/posts-analysis', null);
  paDatos = data && typeof data === 'object' ? data : null;
  paElegirPlataforma();
  return `<div class="pa-wrap">
    ${paCabecera(Boolean(error))}
    ${paPestanasHtml()}
    <div class="pa-cuerpo">${paCuerpo()}</div>
    ${PA_ESTILOS}
  </div>`;
};

const wirePostsAnalysis = (body) => {
  const wrap = body.querySelector('.pa-wrap');
  if (!wrap) return;
  const pintar = () => {
    wrap.querySelector('.pa-plataformas').outerHTML = paPestanasHtml();
    wrap.querySelector('.pa-cuerpo').innerHTML = paCuerpo();
  };
  wrap.addEventListener('click', async (e) => {
    const t = e.target.closest('[data-pa-plat],[data-pa-formato],[data-pa-refrescar]');
    if (!t || !wrap.contains(t)) return;
    if (t.dataset.paPlat) {
      paEstado.plataforma = t.dataset.paPlat;
      pintar();
      return;
    }
    if (t.dataset.paFormato) {
      paEstado.formato = t.dataset.paFormato;
      pintar();
      return;
    }
    t.disabled = true;
    const { data, error: err } = await apiSafe('/api/executive/posts-analysis?refrescar=1', null);
    t.disabled = false;
    if (err || !data) {
      toast('No se pudieron actualizar los datos', 'err');
      return;
    }
    paDatos = data;
    paElegirPlataforma();
    pintar();
  });
  wrap.addEventListener('change', (e) => {
    const sel = e.target.closest('[data-pa-orden]');
    if (!sel) return;
    paEstado.orden = sel.value;
    pintar();
  });
};

const renderTabLink = (route, title, desc) => `
  <div class="v2-card v2-card-pad v2-link-card">
    <h3 class="v2-h2" style="margin:0 0 8px;">${escape(title)}</h3>
    <p class="v2-section-desc" style="margin:0 0 18px;">${escape(desc)}</p>
    <button class="v2-btn v2-btn-primary" data-go-route="${escape(route)}">Abrir vista completa →</button>
  </div>`;

const CC_SALUD = {
  'sin-datos': { label: 'Sin datos', color: '#a1a1aa' },
  estable: { label: 'Estable', color: '#34d399' },
  atencion: { label: 'Atención', color: '#fbbf24' },
  critica: { label: 'Crítica', color: '#f87171' },
};
const CC_NIVEL = {
  critica: { color: '#f87171', label: 'Crítica' },
  alta: { color: '#fbbf24', label: 'Alta' },
  info: { color: '#60a5fa', label: 'Info' },
};

const ccLoginUrl = (plataforma) =>
  `/api/auth/${plataforma}/login?redirectAfter=${encodeURIComponent(window.location.origin + '/')}`;

const ccAccionHtml = (accion, extraClass = 'v2-btn v2-btn-outline') => {
  if (!accion) return '';
  if (accion.tipo === 'tab')
    return `<button class="${extraClass}" data-cc-tab="${escape(accion.tab)}">${escape(accion.label)}</button>`;
  if (accion.tipo === 'ruta')
    return `<button class="${extraClass}" data-cc-ruta="${escape(accion.ruta)}">${escape(accion.label)}</button>`;
  return `<a class="${extraClass}" href="${escape(ccLoginUrl(accion.plataforma))}">${escape(accion.label)}</a>`;
};

const renderCommandCenter = async () => {
  const { data, error } = await apiSafe('/api/executive/command-center', null);
  if (!data)
    return `<div class="alert warn">Centro de comandos sin datos. ${escape(error?.message || 'Conectá el backend.')}</div>`;
  const d = data;
  const salud = CC_SALUD[d.salud?.nivel] || CC_SALUD['sin-datos'];
  const p = d.pulso || {};
  const alertas = d.alertas || [];
  const pendientes = d.decisionesPendientes || [];
  const okr = d.okr || { totalActive: 0, onTrack: 0, atRisk: 0, behind: 0 };
  const insights = d.insights || [];

  return `
    <div class="cc-head">
      <div>
        <div class="v2-eyebrow">Centro de comandos</div>
        <h2 class="v2-h2">${escape(d.salud?.titulo || '')}</h2>
        <p class="v2-section-desc">${escape(d.salud?.detalle || '')}</p>
      </div>
      <span class="cc-salud" style="color:${salud.color};box-shadow:inset 0 0 0 1px ${salud.color}55;background:${salud.color}1a;">${escape(salud.label)}</span>
    </div>

    <div class="v2-kpi-grid cc-pulso">
      <div class="v2-card v2-kpi"><div class="v2-eyebrow">Agentes activos · 7 días</div><div class="v2-num-xl">${p.agentesActivos7d ?? 0}</div><div class="v2-hint">con actividad registrada</div></div>
      <div class="v2-card v2-kpi"><div class="v2-eyebrow">Acciones hoy</div><div class="v2-num-xl">${p.accionesUltimas24h ?? 0}</div><div class="v2-hint">${p.acciones7d ?? 0} en los últimos 7 días</div></div>
      <div class="v2-card v2-kpi"><div class="v2-eyebrow">Decisiones pendientes</div><div class="v2-num-xl">${p.decisionesPendientes ?? 0}</div><div class="v2-hint">${p.decisionesCriticas ? `${p.decisionesCriticas} crítica(s)` : 'ninguna crítica'}</div></div>
      <div class="v2-card v2-kpi"><div class="v2-eyebrow">Redes conectadas</div><div class="v2-num-xl">${p.redesConectadas ?? 0}/${p.redesTotal ?? 2}</div><div class="v2-hint">Instagram · TikTok</div></div>
    </div>

    <section class="v2-section">
      <div class="v2-section-head"><div class="v2-eyebrow">Requiere tu atención</div><h2 class="v2-h2">${alertas.length ? `${alertas.length} alerta(s)` : 'Sin alertas'}</h2></div>
      ${
        alertas.length
          ? `<div class="cc-alertas">${alertas
              .map(
                (a) => `
            <div class="v2-card cc-alerta">
              <span class="cc-alerta-dot" style="background:${CC_NIVEL[a.nivel]?.color || '#60a5fa'};"></span>
              <div class="cc-alerta-body">
                <div class="cc-alerta-titulo"><span class="cc-alerta-nivel" style="color:${CC_NIVEL[a.nivel]?.color || '#60a5fa'};">${escape(CC_NIVEL[a.nivel]?.label || '')}</span> ${escape(a.titulo)}</div>
                <div class="v2-hint">${escape(a.detalle)}</div>
              </div>
              ${ccAccionHtml(a.accion)}
            </div>`,
              )
              .join('')}</div>`
          : '<div class="v2-card v2-card-pad"><div class="v2-hint">Nada que revisar. Cuando el equipo necesite una decisión o algo falle, aparece acá.</div></div>'
      }
    </section>

    <section class="v2-section">
      <div class="v2-section-head"><div class="v2-eyebrow">Decisiones</div><h2 class="v2-h2">Esperando tu aprobación (${pendientes.length})</h2></div>
      ${
        pendientes.length
          ? `<div class="cc-decisiones">${pendientes
              .map(
                (dec) => `
            <div class="v2-card cc-decision" data-cc-decision="${escape(dec.id)}">
              <div class="cc-decision-body">
                <div class="cc-decision-titulo">${escape(dec.title)}</div>
                <div class="v2-hint">${escape((dec.context || '').slice(0, 180))}</div>
              </div>
              <div class="cc-decision-acciones">
                <button class="v2-btn v2-btn-primary" data-cc-resolve="approved" data-cc-id="${escape(dec.id)}">Aprobar</button>
                <button class="v2-btn v2-btn-outline" data-cc-resolve="rejected" data-cc-id="${escape(dec.id)}">Rechazar</button>
              </div>
            </div>`,
              )
              .join('')}</div>`
          : '<div class="v2-card v2-card-pad"><div class="v2-hint">Sin decisiones pendientes.</div></div>'
      }
    </section>

    <section class="v2-section">
      <div class="v2-section-head"><div class="v2-eyebrow">Acciones rápidas</div><h2 class="v2-h2">Operá desde acá</h2></div>
      <div class="cc-acciones">
        ${(d.accionesRapidas || [])
          .map(
            (a) => `
          <div class="v2-card cc-accion">
            <div class="cc-accion-emoji">${escape(a.emoji)}</div>
            <div class="cc-accion-body">
              <div class="cc-accion-label">${escape(a.label)}</div>
              <div class="v2-hint">${escape(a.descripcion)}</div>
            </div>
            ${ccAccionHtml(a.accion, 'v2-btn v2-btn-outline cc-accion-btn')}
          </div>`,
          )
          .join('')}
      </div>
    </section>

    <section class="v2-2col">
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Metas (OKR)</strong><span class="v2-badge">${okr.totalActive} activos</span></div>
        <div class="cc-okr-row"><span>En camino</span><strong>${okr.onTrack}</strong></div>
        <div class="cc-okr-row"><span>En riesgo</span><strong>${okr.atRisk}</strong></div>
        <div class="cc-okr-row"><span>Atrasados</span><strong>${okr.behind}</strong></div>
        ${okr.topConcern ? `<div class="v2-hint" style="margin-top:10px;">Más atrasado: ${escape(okr.topConcern.objectiveTitle)} — ${escape(okr.topConcern.krDescription)}</div>` : ''}
      </div>
      <div class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Lo que dicen los datos</strong></div>
        ${
          insights.length
            ? `<ul class="cc-insights">${insights.map((i) => `<li>${escape(i.icon)} ${escape(i.texto)}</li>`).join('')}</ul>`
            : '<div class="v2-hint">Sin señales destacadas por ahora.</div>'
        }
      </div>
    </section>

    <style>
      .cc-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:18px;}
      .cc-salud{padding:6px 14px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;white-space:nowrap;}
      .cc-pulso{margin-bottom:8px;}
      .cc-alertas,.cc-decisiones{display:flex;flex-direction:column;gap:10px;margin-top:12px;}
      .cc-alerta,.cc-decision{display:flex;align-items:center;gap:14px;padding:14px 16px;flex-wrap:wrap;}
      .cc-alerta-dot{width:8px;height:8px;border-radius:999px;flex-shrink:0;}
      .cc-alerta-body,.cc-decision-body{flex:1;min-width:200px;}
      .cc-alerta-titulo,.cc-decision-titulo{font-size:14px;font-weight:600;color:var(--v2-fg);}
      .cc-alerta-nivel{font-size:10px;text-transform:uppercase;letter-spacing:.08em;margin-right:6px;}
      .cc-decision-acciones{display:flex;gap:8px;}
      .cc-acciones{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:12px;}
      .cc-accion{display:flex;flex-direction:column;gap:10px;padding:16px;}
      .cc-accion-emoji{font-size:22px;}
      .cc-accion-label{font-size:14px;font-weight:600;color:var(--v2-fg);}
      .cc-accion-btn{margin-top:auto;align-self:flex-start;text-decoration:none;}
      .cc-okr-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--v2-line);font-size:13px;color:var(--v2-fg-2);}
      .cc-insights{list-style:none;padding:0;margin:12px 0 0;}
      .cc-insights li{padding:9px 12px;border-radius:9px;background:var(--v2-hover);margin-bottom:6px;font-size:13px;color:var(--v2-fg-2);}
      .cc-decision-acciones .v2-btn,.cc-alerta .v2-btn{text-decoration:none;}
    </style>`;
};

const DEC_ORIGEN = {
  'carousel-factory': 'Carousel Factory',
  'comment-brain': 'Comment Brain',
  'swarm-conductor': 'Swarm Conductor',
  'social-connector': 'Conector de redes',
  'budget-guardian': 'Guardián de presupuesto',
  'okr-tracker': 'Seguimiento OKR',
  'ig-autopilot': 'Instagram Autopilot',
  'tt-autopilot': 'TikTok Autopilot',
  'proactive-agent': 'Agente proactivo',
  'anomaly-detector': 'Detector de anomalías',
  council: 'Consejo de agentes',
  'goal-replan': 'Replanificación de metas',
  'ad-spend': 'Inversión publicitaria',
  'content-safety': 'Seguridad de contenido',
  'community-crisis': 'Crisis en comunidad',
  'opportunity-window': 'Ventana de oportunidad',
  'experiment-result': 'Resultado de experimento',
};

const DEC_URGENCIA = {
  critical: { label: 'Crítica', color: '#f87171', fondo: 'rgba(248,113,113,.14)' },
  high: { label: 'Alta', color: '#fbbf24', fondo: 'rgba(251,191,36,.14)' },
  medium: { label: 'Media', color: '#60a5fa', fondo: 'rgba(96,165,250,.14)' },
  low: { label: 'Baja', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)' },
};

const renderDecisions = async () => {
  const { data } = await apiSafe('/api/executive/decisions/pending', []);
  const decisions = Array.isArray(data) ? data : [];
  const cabecera = `
    <div class="dec-cabecera">
      <div class="v2-eyebrow">Decisiones</div>
      <h2 class="v2-h2">${decisions.length ? `${decisions.length} sugerencia(s) esperando tu aprobación` : 'Sin decisiones pendientes'}</h2>
      <p class="v2-section-desc">Los agentes y automatizaciones de FeedIA proponen acá lo que necesita tu aprobación. Aceptar registra la decisión; ejecuta solo lo que es conectar una red o abrir una vista.</p>
    </div>`;

  if (decisions.length === 0) {
    return `
      <div class="dec-wrap">
        ${cabecera}
        <div class="v2-card v2-card-pad dec-vacio">
          <div class="dec-vacio-icono">✨</div>
          <div class="v2-hint">Cuando un agente detecte algo que requiera tu aprobación (una misión fallida, un carrusel retenido, una cuenta sin conectar, un borrador de respuesta, el gasto de IA cerca del tope, un OKR atrasado o una señal de Instagram o TikTok), aparece acá.</div>
        </div>
      </div>`;
  }

  return `
    <div class="dec-wrap">
      ${cabecera}
      <div class="dec-lista">
        ${decisions
          .map((d) => {
            const urg = DEC_URGENCIA[d.urgency] || DEC_URGENCIA.medium;
            const payload = d.recommendedAction?.payload || {};
            return `
          <article class="v2-card dec-card" data-urgency="${escape(d.urgency)}">
            <header class="dec-head">
              <span class="dec-origen">${escape(DEC_ORIGEN[d.source] || d.source)}</span>
              <span class="dec-urg" style="color:${urg.color};background:${urg.fondo};">${escape(urg.label)}</span>
            </header>
            <h3 class="dec-titulo">${escape(d.title)}</h3>
            ${d.context ? `<p class="dec-contexto">${escape(d.context)}</p>` : ''}
            <div class="dec-bloques">
              <div class="dec-bloque">
                <span>Por qué</span>
                <p>${escape(d.reasoning)}</p>
              </div>
              <div class="dec-bloque dec-bloque-ok">
                <span>Si aceptás</span>
                <p>${escape(d.expectedOutcome)}</p>
              </div>
              ${
                d.risks?.length
                  ? `<div class="dec-bloque dec-bloque-warn dec-bloque-ancho">
                      <span>Riesgos</span>
                      <p>${d.risks.map((r) => escape(r)).join(' · ')}</p>
                    </div>`
                  : ''
              }
            </div>
            <footer class="dec-acciones">
              <button class="v2-btn v2-btn-ghost v2-btn-sm" data-resolve="rejected" data-id="${escape(d.id)}">Rechazar</button>
              <button class="v2-btn v2-btn-primary v2-btn-sm" data-resolve="approved" data-id="${escape(d.id)}"
                data-accion-tipo="${escape(payload.tipo || '')}" data-accion-valor="${escape(payload.plataforma || payload.tab || '')}">${escape(d.recommendedAction?.label || 'Aceptar')}</button>
            </footer>
          </article>`;
          })
          .join('')}
      </div>
      <style>
        .dec-wrap{display:flex;flex-direction:column;gap:18px;}
        .dec-cabecera{display:flex;flex-direction:column;gap:6px;}
        .dec-lista{display:flex;flex-direction:column;gap:14px;}
        .dec-card{padding:20px;display:flex;flex-direction:column;gap:12px;}
        .dec-head{display:flex;justify-content:space-between;align-items:center;gap:10px;}
        .dec-origen{font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;color:var(--v2-fg-3);}
        .dec-urg{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;padding:4px 10px;border-radius:999px;white-space:nowrap;}
        .dec-titulo{margin:0;font-size:17px;font-weight:600;letter-spacing:-0.015em;color:var(--v2-fg);line-height:1.3;}
        .dec-contexto{margin:0;font-size:13px;color:var(--v2-fg-2);line-height:1.5;}
        .dec-bloques{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .dec-bloque{padding:12px 14px;border-radius:12px;background:var(--v2-hover);display:flex;flex-direction:column;gap:4px;}
        .dec-bloque span{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
        .dec-bloque p{margin:0;font-size:13px;line-height:1.5;color:var(--v2-fg-2);}
        .dec-bloque-ok{background:rgba(52,211,153,.08);}
        .dec-bloque-warn{background:rgba(251,191,36,.08);}
        .dec-bloque-ancho{grid-column:1 / -1;}
        .dec-acciones{display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--v2-line);}
        .dec-vacio{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:36px 24px;}
        .dec-vacio-icono{font-size:28px;}
        @media (max-width:720px){.dec-bloques{grid-template-columns:1fr;}.dec-acciones{flex-direction:column-reverse;}.dec-acciones .v2-btn{width:100%;}}
      </style>
    </div>`;
};
const OKR_CATEGORIAS = {
  growth: 'Crecimiento',
  engagement: 'Engagement',
  revenue: 'Ingresos',
  brand: 'Marca',
  efficiency: 'Eficiencia',
  community: 'Comunidad',
};
const OKR_PERIODOS = { month: 'Mes · 30 días', quarter: 'Trimestre · 90 días', year: 'Año' };
const OKR_FUENTES = {
  manual: 'Manual · lo registrás vos',
  'seguidores-instagram': 'Automático · seguidores de Instagram',
  'seguidores-tiktok': 'Automático · seguidores de TikTok',
  'piezas-creadas': 'Automático · piezas creadas',
  'carruseles-publicados': 'Automático · carruseles publicados',
  'comentarios-revisados': 'Automático · comentarios revisados',
};
const OKR_METRICAS = { count: 'cantidad', percent: '%', currency: 'US$', ratio: 'ratio', 'time-minutes': 'minutos' };
const OKR_ESTADOS = {
  'on-track': { label: 'En camino', color: '#34d399' },
  ahead: { label: 'Adelantado', color: '#22d3ee' },
  'at-risk': { label: 'En riesgo', color: '#fbbf24' },
  behind: { label: 'Atrasado', color: '#f87171' },
  completed: { label: 'Completado', color: '#a855f7' },
};
const OKR_TENDENCIAS = {
  accelerating: 'acelera',
  steady: 'estable',
  decelerating: 'se frena',
  stalled: 'estancada',
};
const OKR_PLANTILLAS = {
  crecimiento: {
    title: 'Crecer en redes sociales',
    porque: 'Más personas nos siguen, confían en la marca y se convierten en clientes.',
    category: 'growth',
    period: 'quarter',
    krs: [
      {
        desc: 'Seguidores en Instagram',
        fuente: 'seguidores-instagram',
        unidad: 'seguidores',
        direccion: 'increase',
        metrica: 'count',
      },
      {
        desc: 'Seguidores en TikTok',
        fuente: 'seguidores-tiktok',
        unidad: 'seguidores',
        direccion: 'increase',
        metrica: 'count',
      },
    ],
  },
  contenido: {
    title: 'Producir contenido de forma constante',
    porque: 'Una cadencia constante de piezas de calidad mantiene a la audiencia y libera tiempo del equipo.',
    category: 'efficiency',
    period: 'month',
    krs: [
      {
        desc: 'Piezas creadas en el mes',
        fuente: 'piezas-creadas',
        unidad: 'piezas',
        direccion: 'increase',
        metrica: 'count',
      },
      {
        desc: 'Carruseles publicados',
        fuente: 'carruseles-publicados',
        unidad: 'carruseles',
        direccion: 'increase',
        metrica: 'count',
      },
    ],
  },
  comunidad: {
    title: 'Responder bien a la comunidad',
    porque: 'Cada comentario atendido a tiempo convierte curiosidad en confianza y en ventas.',
    category: 'community',
    period: 'month',
    krs: [
      {
        desc: 'Comentarios revisados',
        fuente: 'comentarios-revisados',
        unidad: 'comentarios',
        direccion: 'increase',
        metrica: 'count',
      },
      {
        desc: 'Conversaciones atendidas a mano',
        fuente: 'manual',
        unidad: 'conversaciones',
        direccion: 'increase',
        metrica: 'count',
      },
    ],
  },
};

const okrOpciones = (mapa, seleccionado) =>
  Object.entries(mapa)
    .map(
      ([k, v]) =>
        `<option value="${escape(k)}" ${k === seleccionado ? 'selected' : ''}>${escape(typeof v === 'string' ? v : v.label)}</option>`,
    )
    .join('');

const okrFmt = (n) => (Number.isFinite(n) ? Number(n).toLocaleString('es-AR', { maximumFractionDigits: 2 }) : '—');
const okrFecha = (iso) => (iso ? new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' }) : '');

const okrFormHtml = () => `
  <form id="okr-form" class="v2-card v2-card-pad okr-form" hidden>
    <div class="okr-form-cabecera">
      <div class="v2-eyebrow" data-okr-form-titulo>Nuevo OKR</div>
      <span class="v2-hint">1) Objetivo y porqué · 2) Resultados medibles · 3) Revisá la calidad antes de guardar</span>
    </div>
    <input type="hidden" name="okrId">
    <div class="okr-plantillas">
      <span class="v2-hint">Empezar con una plantilla:</span>
      <button type="button" class="v2-btn v2-btn-outline v2-btn-sm" data-okr-plantilla="crecimiento">Crecer en redes</button>
      <button type="button" class="v2-btn v2-btn-outline v2-btn-sm" data-okr-plantilla="contenido">Producir contenido</button>
      <button type="button" class="v2-btn v2-btn-outline v2-btn-sm" data-okr-plantilla="comunidad">Comunidad</button>
    </div>
    <div class="okr-paso">
      <strong>1 · Objetivo</strong>
      <label class="okr-campo">¿Qué querés lograr? Cualitativo e inspirador
        <input name="title" maxlength="120" placeholder="Ej.: Ser la cuenta de referencia en IA para PyMEs">
      </label>
      <label class="okr-campo">¿Por qué es importante? El porqué del objetivo
        <textarea name="porque" rows="2" maxlength="400" placeholder="Qué cambia para el negocio si lo lográs"></textarea>
      </label>
      <div class="okr-fila">
        <label class="okr-campo">Categoría<select name="category">${okrOpciones(OKR_CATEGORIAS, 'growth')}</select></label>
        <label class="okr-campo">Período<select name="period">${okrOpciones(OKR_PERIODOS, 'quarter')}</select></label>
      </div>
    </div>
    <div class="okr-paso">
      <strong>2 · Resultados clave (medibles)</strong>
      <span class="v2-hint">Un resultado describe lo que cambia, no la tarea. Con meta y dirección claras, el progreso se mide solo.</span>
      ${[1, 2, 3, 4]
        .map(
          (i) => `
        <fieldset class="okr-kr-campo">
          <legend>Resultado ${i}${i === 1 ? ' (al menos uno)' : ' (opcional)'}</legend>
          <input type="hidden" name="kr${i}_id">
          <label class="okr-campo">Qué resultado querés ver
            <input name="kr${i}_desc" maxlength="140" placeholder="Ej.: Seguidores en Instagram">
          </label>
          <div class="okr-fila3">
            <label class="okr-campo">Fuente de datos<select name="kr${i}_fuente">${okrOpciones(OKR_FUENTES, 'manual')}</select></label>
            <label class="okr-campo">Dirección<select name="kr${i}_direccion"><option value="increase" selected>Aumentar</option><option value="decrease">Reducir</option></select></label>
            <label class="okr-campo">Unidad<input name="kr${i}_unidad" maxlength="30" placeholder="seguidores, piezas, horas…"></label>
          </div>
          <div class="okr-fila3">
            <label class="okr-campo">Tipo de métrica<select name="kr${i}_metrica">${okrOpciones(OKR_METRICAS, 'count')}</select></label>
            <label class="okr-campo">Valor inicial<input name="kr${i}_baseline" type="number" step="any" placeholder="Vacío = valor actual"></label>
            <label class="okr-campo">Meta<input name="kr${i}_target" type="number" step="any" placeholder="Ej.: 20000"></label>
          </div>
        </fieldset>`,
        )
        .join('')}
    </div>
    <div class="okr-feedback" hidden></div>
    <div class="okr-form-acciones">
      <button type="button" class="v2-btn v2-btn-outline" data-okr-revisar>Revisar calidad</button>
      <button type="submit" class="v2-btn v2-btn-primary" data-okr-guardar>Crear OKR</button>
      <button type="button" class="v2-btn v2-btn-ghost" data-okr-toggle-form>Cancelar</button>
    </div>
  </form>`;

const okrLeerForm = (form) => {
  const keyResults = [];
  for (const i of [1, 2, 3, 4]) {
    const desc = form.elements[`kr${i}_desc`].value.trim();
    if (!desc) continue;
    const id = form.elements[`kr${i}_id`].value || undefined;
    const baselineRaw = form.elements[`kr${i}_baseline`].value;
    const targetRaw = form.elements[`kr${i}_target`].value;
    keyResults.push({
      id,
      description: desc,
      fuente: form.elements[`kr${i}_fuente`].value,
      metricType: form.elements[`kr${i}_metrica`].value,
      unidad: form.elements[`kr${i}_unidad`].value.trim(),
      direccion: form.elements[`kr${i}_direccion`].value,
      baseline: baselineRaw === '' ? null : Number(baselineRaw),
      target: targetRaw === '' ? null : Number(targetRaw),
    });
  }
  return {
    title: form.elements.title.value.trim(),
    porque: form.elements.porque.value.trim(),
    category: form.elements.category.value,
    period: form.elements.period.value,
    keyResults,
  };
};

const okrLlenarForm = (form, datos) => {
  form.elements.okrId.value = datos.okrId || '';
  form.elements.title.value = datos.title || '';
  form.elements.porque.value = datos.porque || '';
  form.elements.category.value = datos.category || 'growth';
  form.elements.period.value = datos.period || 'quarter';
  for (let i = 1; i <= 4; i++) {
    const kr = (datos.keyResults || [])[i - 1];
    form.elements[`kr${i}_id`].value = kr?.id || '';
    form.elements[`kr${i}_desc`].value = kr?.desc || '';
    form.elements[`kr${i}_fuente`].value = kr?.fuente || 'manual';
    form.elements[`kr${i}_metrica`].value = kr?.metrica || 'count';
    form.elements[`kr${i}_unidad`].value = kr?.unidad || '';
    form.elements[`kr${i}_direccion`].value = kr?.direccion || 'increase';
    form.elements[`kr${i}_baseline`].value = kr?.baseline ?? '';
    form.elements[`kr${i}_target`].value = kr?.target ?? '';
  }
};

const okrPintarFeedback = (box, calidad, mensaje) => {
  box.hidden = false;
  const bloq = calidad?.bloqueantes || [];
  const obs = calidad?.observaciones || [];
  box.innerHTML = `
    ${mensaje ? `<div class="okr-feedback-msg">${escape(mensaje)}</div>` : ''}
    ${calidad ? `<div class="okr-puntaje">Calidad del OKR: <strong>${calidad.puntaje}/100</strong>${bloq.length === 0 ? ' · listo para guardar' : ''}</div>` : ''}
    ${bloq.length ? `<ul class="okr-bloq">${bloq.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}
    ${obs.length ? `<ul class="okr-obs">${obs.map((o) => `<li>${escape(o)}</li>`).join('')}</ul>` : ''}`;
};

const okrPlantillaAplicar = (form, p) => {
  okrLlenarForm(form, {
    okrId: '',
    title: p.title,
    porque: p.porque,
    category: p.category,
    period: p.period,
    keyResults: p.krs.map((kr) => ({ ...kr, id: '', baseline: '', target: '' })),
  });
};

const renderOKRs = async () => {
  const { data } = await apiSafe('/api/executive/okr/active', {
    objectives: [],
    summary: { totalActive: 0, onTrack: 0, atRisk: 0, behind: 0, ahead: 0, overallScore: 0 },
  });
  const objectives = data?.objectives ?? [];
  const summary = data?.summary ?? {};
  const explicacion = `
    <section class="v2-card v2-card-pad okr-explica">
      <div class="v2-eyebrow">Marco de trabajo</div>
      <h2 class="v2-h2">¿Qué son los OKR?</h2>
      <p class="v2-lead">Objetivos y Resultados Clave: un método para fijar metas ambiciosas y medir, sin ambigüedad, si se cumplen. Lo usan equipos desde Intel y Google hasta startups, y sirve igual para una empresa, un equipo o una persona.</p>
      <div class="okr-tres">
        <div><strong>Objetivo</strong><span>A dónde querés llegar, en una frase inspiradora. Cualitativo.<em>Ej.: "Ser la cuenta de referencia en IA para PyMEs".</em></span></div>
        <div><strong>Resultados clave</strong><span>De 2 a 4 números que prueban que lo lograste. Medibles, con meta y fecha.<em>Ej.: "Llegar a 20.000 seguidores en Instagram".</em></span></div>
        <div><strong>Iniciativas</strong><span>Las tareas que mueven los resultados. Las hace el equipo; no son el OKR.<em>Ej.: "Publicar 3 carruseles por semana".</em></span></div>
      </div>
      <ul class="okr-reglas">
        <li><strong>Ciclo:</strong> definilos por trimestre y revisá el avance cada semana.</li>
        <li><strong>Ambición:</strong> apuntá a cerrar cerca del 70%. Si siempre llegás al 100%, las metas eran chicas.</li>
        <li><strong>OKR vs KPI:</strong> un KPI vigila la salud del negocio; un OKR mueve algo concreto en un período.</li>
        <li><strong>Tarea ≠ resultado:</strong> "publicar 10 posts" es una tarea; "duplicar el alcance" es un resultado.</li>
      </ul>
    </section>`;

  const barra = `
    <div class="okr-barra">
      <div class="okr-barra-botones">
        <button class="v2-btn v2-btn-primary v2-btn-sm" data-okr-nuevo>+ Nuevo OKR</button>
        <button class="v2-btn v2-btn-outline v2-btn-sm" data-okr-sync>Sincronizar con datos reales</button>
      </div>
    </div>`;

  if (objectives.length === 0) {
    return `
      <div class="okr-wrap">
        ${explicacion}
        ${barra}
        <div class="v2-card v2-card-pad"><div class="v2-hint">Todavía no tenés OKR activos. Creá el primero: escribí el objetivo y su porqué, definí resultados medibles y revisá la calidad antes de guardar.</div></div>
        ${okrFormHtml().replace('hidden>', '>')}
      </div>`;
  }

  const progresoPromedio = Math.round(summary.overallScore || 0);
  return `
    <div class="okr-wrap">
      ${explicacion}
      ${barra}
      <div class="v2-kpi-grid">
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">OKR activos</div><div class="v2-num-xl">${summary.totalActive || 0}</div><div class="v2-hint">este período</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">En camino</div><div class="v2-num-xl" style="color:#34d399;">${(summary.onTrack || 0) + (summary.ahead || 0)}</div><div class="v2-hint">incluye adelantados</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">En riesgo</div><div class="v2-num-xl" style="color:#fbbf24;">${summary.atRisk || 0}</div><div class="v2-hint">conviene revisar</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Atrasados</div><div class="v2-num-xl" style="color:#f87171;">${summary.behind || 0}</div><div class="v2-hint">replanificar</div></div>
        <div class="v2-card v2-kpi"><div class="v2-eyebrow">Progreso promedio</div><div class="v2-num-xl">${progresoPromedio}%</div><div class="v2-hint">sobre el 70% de ambición</div></div>
      </div>
      ${okrFormHtml()}
      <div class="okr-lista">
        ${objectives
          .map((obj) => {
            const est = OKR_ESTADOS[obj.status] || { label: obj.status, color: 'var(--v2-fg-3)' };
            const dias = Math.max(0, Math.ceil((Date.parse(obj.periodEnd) - Date.now()) / 86400000));
            const pct = Math.max(0, Math.min(100, Math.round(obj.overallProgressPct || 0)));
            const puntaje = obj.calidad?.puntaje ?? null;
            const datosEditar = {
              okrId: obj.id,
              title: obj.title,
              porque: obj.porque || '',
              category: obj.category,
              period: obj.period,
              keyResults: (obj.keyResults || []).map((k) => ({
                id: k.id,
                desc: k.description,
                fuente: k.fuente,
                metrica: k.metricType,
                unidad: k.unidad,
                direccion: k.direccion,
                baseline: k.baseline,
                target: k.target,
              })),
            };
            return `
          <article class="v2-card okr-card">
            <header class="okr-card-head">
              <div>
                <div class="v2-eyebrow">${escape(OKR_CATEGORIAS[obj.category] || obj.category)} · ${escape(OKR_PERIODOS[obj.period] || obj.period)} · quedan ${dias} días</div>
                <h3>${escape(obj.title)}</h3>
                <p class="okr-porque"><strong>Por qué:</strong> ${escape(obj.porque || 'Sin porqué registrado')}</p>
              </div>
              <span class="okr-estado" style="color:${est.color};box-shadow:inset 0 0 0 1px ${est.color}55;">${escape(est.label)}</span>
            </header>
            <div class="okr-progreso">
              <div class="okr-barra-progreso"><div style="width:${pct}%;"></div></div>
              <div class="v2-hint">${pct}% del objetivo${puntaje !== null ? ` · calidad del OKR ${puntaje}/100` : ''}</div>
            </div>
            <div class="okr-krs">
              ${(obj.keyResults || [])
                .map((kr) => {
                  const kest = OKR_ESTADOS[kr.status] || { label: kr.status, color: 'var(--v2-fg-3)' };
                  const kpct = Math.max(0, Math.min(100, Math.round(kr.progressPct || 0)));
                  const esManual = (kr.fuente || 'manual') === 'manual';
                  const flecha = kr.direccion === 'decrease' ? '↓ reducir' : '↑ aumentar';
                  const notas = (kr.checkIns || []).slice(-3).reverse();
                  return `
              <div class="okr-kr">
                <div class="okr-kr-head">
                  <span class="okr-kr-desc">${escape(kr.description)} <span class="okr-dir">${flecha}</span></span>
                  <span class="okr-kr-estado" style="color:${kest.color};">${escape(kest.label)}</span>
                </div>
                <div class="okr-kr-valores"><strong>${okrFmt(kr.current)}</strong> de meta ${okrFmt(kr.target)} ${escape(kr.unidad || OKR_METRICAS[kr.metricType] || '')} <span class="v2-hint">(inicio ${okrFmt(kr.baseline)})</span></div>
                <div class="okr-barra-progreso fina"><div style="width:${kpct}%;"></div></div>
                <div class="okr-kr-pie">
                  <span class="v2-hint">${escape(OKR_FUENTES[kr.fuente || 'manual'] || '')}</span>
                  ${
                    esManual
                      ? `<form class="okr-avance" data-okr-avance-obj="${escape(obj.id)}" data-okr-avance-kr="${escape(kr.id)}">
                          <input name="valor" type="number" step="any" placeholder="Valor actual" required>
                          <input name="nota" maxlength="200" placeholder="Nota (opcional)">
                          <button class="v2-btn v2-btn-outline v2-btn-sm" type="submit">Registrar</button>
                        </form>`
                      : '<span class="v2-hint">Se actualiza sola</span>'
                  }
                </div>
                <div class="v2-hint">Tendencia: ${escape(OKR_TENDENCIAS[kr.trend] || kr.trend)} · al cierre llegaría a ${okrFmt(kr.projectedFinal)} ${kr.projectedHitsTarget ? '(llega a la meta)' : '(no llega a la meta)'}</div>
                ${
                  notas.length
                    ? `<ul class="okr-checkins">${notas
                        .map(
                          (c) =>
                            `<li><span>${escape(okrFecha(c.fecha))}</span> ${okrFmt(c.valor)}${c.nota ? ` · ${escape(c.nota)}` : ''}</li>`,
                        )
                        .join('')}</ul>`
                    : ''
                }
              </div>`;
                })
                .join('')}
            </div>
            ${
              (obj.recommendations || []).length
                ? `<ul class="okr-recs">${obj.recommendations.map((r) => `<li>${escape(r)}</li>`).join('')}</ul>`
                : ''
            }
            ${
              (obj.calidad?.observaciones || []).length
                ? `<ul class="okr-obs">${obj.calidad.observaciones.map((o) => `<li>${escape(o)}</li>`).join('')}</ul>`
                : ''
            }
            <footer class="okr-card-foot">
              <button class="v2-btn v2-btn-outline v2-btn-sm" data-okr-editar="${escape(JSON.stringify(datosEditar))}">Editar</button>
              <button class="v2-btn v2-btn-ghost v2-btn-sm" data-okr-archivar="${escape(obj.id)}">Archivar</button>
            </footer>
          </article>`;
          })
          .join('')}
      </div>
    </div>`;
};

const wireOKRs = (body, root, repaint) => {
  const form = () => body.querySelector('#okr-form');
  const abrirForm = (titulo) => {
    const f = form();
    if (!f) return null;
    f.hidden = false;
    f.querySelector('[data-okr-form-titulo]').textContent = titulo;
    f.querySelector('[data-okr-guardar]').textContent = f.elements.okrId.value ? 'Guardar cambios' : 'Crear OKR';
    f.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return f;
  };

  body.querySelectorAll('[data-okr-nuevo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = form();
      if (!f) return;
      okrLlenarForm(f, { okrId: '', title: '', porque: '', category: 'growth', period: 'quarter', keyResults: [] });
      abrirForm('Nuevo OKR');
    });
  });
  body.querySelectorAll('[data-okr-toggle-form]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = form();
      if (f) f.hidden = !f.hidden;
    });
  });
  body.querySelectorAll('[data-okr-plantilla]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = form();
      const p = OKR_PLANTILLAS[btn.dataset.okrPlantilla];
      if (!f || !p) return;
      okrPlantillaAplicar(f, p);
      abrirForm('Nuevo OKR · desde plantilla');
    });
  });
  body.querySelectorAll('[data-okr-editar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const f = form();
      if (!f) return;
      okrLlenarForm(f, JSON.parse(btn.dataset.okrEditar));
      abrirForm('Editar OKR');
    });
  });
  body.querySelectorAll('[data-okr-revisar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const f = form();
      if (!f) return;
      const entrada = okrLeerForm(f);
      try {
        const r = await fetch('/api/executive/okr/validate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(entrada),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        okrPintarFeedback(f.querySelector('.okr-feedback'), await r.json());
      } catch (err) {
        okrPintarFeedback(f.querySelector('.okr-feedback'), null, `No se pudo revisar: ${err.message}`);
      }
    });
  });
  form()?.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const f = ev.currentTarget;
    const entrada = okrLeerForm(f);
    const editando = Boolean(f.elements.okrId.value);
    const url = editando ? '/api/executive/okr/edit' : '/api/executive/okr/create';
    const payload = editando ? { ...entrada, objectiveId: f.elements.okrId.value } : entrada;
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const e = await r.json().catch(() => ({}));
        return okrPintarFeedback(
          f.querySelector('.okr-feedback'),
          e.bloqueantes ? e : null,
          e.error || `HTTP ${r.status}`,
        );
      }
      toast(editando ? '✅ OKR actualizado' : '✅ OKR creado', 'ok');
      void repaint();
    } catch (err) {
      okrPintarFeedback(f.querySelector('.okr-feedback'), null, `No se pudo guardar: ${err.message}`);
    }
  });
  body.querySelectorAll('[data-okr-avance-obj]').forEach((frm) => {
    frm.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const valor = Number(frm.elements.valor.value);
      if (!Number.isFinite(valor)) return;
      try {
        const r = await fetch('/api/executive/okr/update-kr', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            objectiveId: frm.dataset.okrAvanceObj,
            krId: frm.dataset.okrAvanceKr,
            newValue: valor,
            nota: frm.elements.nota.value.trim(),
          }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        toast('Avance registrado', 'ok');
        void repaint();
      } catch (err) {
        toast(`No se pudo registrar: ${err.message}`, 'err');
      }
    });
  });
  body.querySelectorAll('[data-okr-sync]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await fetch('/api/executive/okr/sync', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const { actualizados } = await r.json();
        toast(
          actualizados
            ? `✅ ${actualizados} resultado(s) actualizados con datos reales`
            : 'No hubo datos nuevos para sincronizar',
          'ok',
        );
        void repaint();
      } catch (err) {
        btn.disabled = false;
        toast(`No se pudo sincronizar: ${err.message}`, 'err');
      }
    });
  });
  body.querySelectorAll('[data-okr-archivar]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!window.confirm('¿Archivar este OKR? Deja de contar en el resumen.')) return;
      try {
        const r = await fetch('/api/executive/okr/archive', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ objectiveId: btn.dataset.okrArchivar }),
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        toast('OKR archivado', 'info');
        void repaint();
      } catch (err) {
        toast(`No se pudo archivar: ${err.message}`, 'err');
      }
    });
  });
};
const AP_SENAL_NOMBRE = {
  'reach-drop': 'El alcance está cayendo',
  'engagement-drop': 'El engagement bajó',
  'follower-stall': 'Poca cadencia de publicación',
  'follower-decline': 'Estás perdiendo seguidores',
  'hashtag-burnt': 'Hashtags quemados',
  'story-cadence-low': 'Pocas stories',
  'dm-backlog': 'DMs sin responder',
  'comment-backlog': 'Comentarios pendientes',
  'best-time-shift': 'Cambió tu mejor horario',
  'algorithm-favor': 'Un formato rinde más',
};
const AP_ACCION = {
  'post-now': 'Publicar ahora',
  'rotate-hashtag': 'Rotar hashtags',
  'reply-comments-batch': 'Responder comentarios',
  'reply-dms-batch': 'Responder DMs',
  'cross-post-to-stories': 'Publicar en stories',
  'change-format': 'Cambiar de formato',
  'reactivate-cold-followers': 'Reactivar seguidores fríos',
};
const AP_SEVERIDAD = {
  critical: { label: 'Crítica', color: '#f87171' },
  high: { label: 'Alta', color: '#fbbf24' },
  medium: { label: 'Media', color: '#60a5fa' },
  low: { label: 'Baja', color: '#a1a1aa' },
};
const AP_FUENTES = {
  alcance: 'Alcance',
  engagement: 'Engagement',
  seguidores: 'Seguidores',
  publicaciones: 'Publicaciones',
  formatos: 'Formatos',
  horarios: 'Horarios',
  dms: 'DMs',
  comentarios: 'Comentarios',
  stories: 'Stories',
  hashtags: 'Hashtags',
};

const apNum = (n, sufijo = '') => (n === null || n === undefined ? '—' : `${okrFmt(n)}${sufijo}`);
const apSigno = (n) => (n === null || n === undefined ? '—' : `${n > 0 ? '+' : ''}${okrFmt(n)}`);

const renderIGAutopilot = async () => {
  const { data } = await apiSafe('/api/autopilot/instagram/latest', null);
  const { data: historial } = await apiSafe('/api/autopilot/instagram/history', []);
  const barra = `
    <div class="okr-barra">
      <div class="okr-barra-botones">
        <button class="v2-btn v2-btn-primary v2-btn-sm" data-ap-run="instagram">Generar reporte ahora</button>
      </div>
    </div>`;

  if (!data) {
    return `
      <div class="apig-wrap">
        ${barra}
        <div class="v2-card v2-card-pad">
          <div class="v2-eyebrow">Instagram Autopilot</div>
          <h2 class="v2-h2">Todavía no hay reportes</h2>
          <p class="v2-section-desc">El autopilot lee tu cuenta conectada: alcance y engagement de los últimos 7 días contra los 7 anteriores, seguidores, publicaciones por formato, horarios, DMs y comentarios sin responder. Con eso detecta señales y propone acciones en Decisiones.</p>
        </div>
      </div>`;
  }

  const m = data.observation?.metrics || {};
  const fuentes = data.observation?.fuentes || {};
  const formatos = data.observation?.formatos || {};
  const score = Number(data.autopilotScore || 0);
  const sinCuenta =
    data.observation?.metrics?.postsLast7d === null || data.observation?.metrics?.postsLast7d === undefined;
  const scoreClase = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'crit';
  const senales = data.signals || [];
  const reales = Object.values(fuentes).filter((v) => v === 'real').length;

  const datos = [
    {
      k: 'alcance',
      titulo: 'Alcance 7 días',
      valor: apNum(m.reachLast7d),
      sub: m.reachPrev7d !== null && m.reachPrev7d !== undefined ? `vs ${apNum(m.reachPrev7d)} la semana anterior` : '',
    },
    {
      k: 'engagement',
      titulo: 'Engagement 7 días',
      valor: apNum(m.engagementRateLast7d, '%'),
      sub:
        m.engagementRatePrev7d !== null && m.engagementRatePrev7d !== undefined
          ? `vs ${okrFmt(m.engagementRatePrev7d)}% antes`
          : '',
    },
    {
      k: 'seguidores',
      titulo: 'Seguidores · semana',
      valor: apSigno(m.followerDeltaLast7d),
      sub: 'Neto desde el historial propio',
    },
    {
      k: 'publicaciones',
      titulo: 'Publicaciones 7 días',
      valor: apNum(m.postsLast7d),
      sub: m.reelsLast7d !== null && m.reelsLast7d !== undefined ? `${m.reelsLast7d} reels` : '',
    },
    {
      k: 'dms',
      titulo: 'DMs sin responder',
      valor: apNum(m.dmBacklog),
      sub:
        m.avgDmResponseMinutes !== null && m.avgDmResponseMinutes !== undefined
          ? `espera promedio ${Math.round(m.avgDmResponseMinutes)} min`
          : '',
    },
    {
      k: 'comentarios',
      titulo: 'Comentarios pendientes',
      valor: apNum(m.commentBacklog),
      sub: 'Sin decisión del comment-brain',
    },
    {
      k: 'horarios',
      titulo: 'Horario',
      valor:
        data.observation?.postingHourLast7d !== null && data.observation?.postingHourLast7d !== undefined
          ? `${data.observation.postingHourLast7d}h`
          : '—',
      sub:
        data.observation?.bestPostingHourLast30d !== null && data.observation?.bestPostingHourLast30d !== undefined
          ? `Tu mejor hora (30 días): ${data.observation.bestPostingHourLast30d}h`
          : '',
    },
    {
      k: 'formatos',
      titulo: 'Interacciones por post',
      valor:
        formatos.reels || formatos.carruseles
          ? `Reels ${apNum(formatos.reels?.interaccionesPromedio)} · Carruseles ${apNum(formatos.carruseles?.interaccionesPromedio)}`
          : '—',
      sub: 'Promedio de los últimos 30 días',
    },
  ];

  return `
    <div class="apig-wrap">
      ${barra}
      <div class="apig-hero">
        <div class="apig-score apig-score-${sinCuenta ? 'neutral' : scoreClase}">${sinCuenta ? '—' : score}</div>
        <div class="apig-hero-texto">
          <div class="v2-eyebrow">Instagram Autopilot · ${escape(okrFecha(data.generatedAt))}</div>
          <h2 class="v2-h2">${sinCuenta ? 'Sin datos de la cuenta' : senales.length ? `${senales.length} señal(es) detectada(s)` : 'Sin señales de alerta'}</h2>
          <p class="v2-section-desc">${escape(data.didacticInsight || '')}</p>
        </div>
      </div>

      <section class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Datos reales usados</strong><span class="v2-badge">${reales} de ${Object.keys(fuentes).length} fuentes</span></div>
        <div class="apig-datos">
          ${datos
            .map(
              (d) => `
            <div class="apig-dato">
              <div class="v2-eyebrow">${escape(d.titulo)}</div>
              <div class="apig-dato-valor">${escape(String(d.valor))}</div>
              ${d.sub ? `<div class="v2-hint">${escape(d.sub)}</div>` : ''}
              <span class="apig-fuente apig-fuente-${fuentes[d.k] === 'real' ? 'real' : 'no'}">${escape(fuentes[d.k] || 'no disponible')}</span>
            </div>`,
            )
            .join('')}
        </div>
        ${
          fuentes.stories === 'no disponible' || fuentes.hashtags === 'no disponible'
            ? `<p class="v2-hint" style="margin-top:12px;">No medido: ${[fuentes.stories === 'no disponible' ? 'stories (la API solo las da de las últimas 24 h)' : null, fuentes.hashtags === 'no disponible' ? 'salud de hashtags (requiere histórico propio)' : null].filter(Boolean).map(escape).join(' · ')}. Esas reglas no se evalúan.</p>`
            : ''
        }
      </section>

      <section class="v2-section">
        <div class="v2-section-head"><div class="v2-eyebrow">Señales y acciones</div><h2 class="v2-h2">Lo que el autopilot propone</h2></div>
        ${
          senales.length
            ? `<div class="apig-senales">${senales
                .map((s) => {
                  const sev = AP_SEVERIDAD[s.severity] || AP_SEVERIDAD.low;
                  return `
              <div class="v2-card apig-senal" style="box-shadow:inset 3px 0 0 ${sev.color};">
                <div class="apig-senal-head">
                  <span class="apig-senal-titulo">${escape(AP_SENAL_NOMBRE[s.signal] || s.signal)}</span>
                  <span class="apig-senal-sev" style="color:${sev.color};">${escape(sev.label)}</span>
                </div>
                <div class="v2-hint">${escape(s.evidence)}</div>
                <p class="apig-senal-razon">${escape(s.reasoning)}</p>
                <div class="apig-senal-accion"><strong>Acción:</strong> ${escape(AP_ACCION[s.recommendedAction] || s.recommendedAction)}</div>
                <div class="v2-hint">Impacto esperado: ${escape(s.expectedImpact)}</div>
                <div class="v2-hint">Propuesta en <strong>Decisiones</strong>: aceptás o rechazás ahí.</div>
              </div>`;
                })
                .join('')}</div>`
            : '<div class="v2-card v2-card-pad"><div class="v2-hint">Ninguna regla se disparó con los datos de esta semana.</div></div>'
        }
      </section>

      ${
        (historial || []).length
          ? `<section class="v2-card v2-card-pad">
              <div class="v2-card-head"><strong>Historial de reportes</strong></div>
              <ul class="apig-historial">${historial
                .map(
                  (h) =>
                    `<li><span>${escape(okrFecha(h.generatedAt))}</span> Score ${h.autopilotScore} · ${h.signals.length} señal(es)${h.criticalCount ? ` · ${h.criticalCount} crítica(s)` : ''}</li>`,
                )
                .join('')}</ul>
            </section>`
          : ''
      }
    </div>`;
};

const wireAutopilot = (body, repaint) => {
  body.querySelectorAll('[data-ap-run]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      btn.disabled = true;
      try {
        const r = await fetch(`/api/autopilot/${btn.dataset.apRun}/run`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: '{}',
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const reporte = await r.json();
        const n = reporte.propuestasEncoladas ?? 0;
        toast(
          n
            ? `✅ Reporte listo · ${n} propuesta(s) nueva(s) en Decisiones`
            : '✅ Reporte listo · sin propuestas nuevas',
          'ok',
        );
        void repaint();
      } catch (err) {
        btn.disabled = false;
        toast(`No se pudo generar el reporte: ${err.message}`, 'err');
      }
    });
  });
};

const AP_TT_SENAL = {
  'views-drop': 'Las vistas están cayendo',
  'follower-decline': 'Estás perdiendo seguidores',
  'cadence-low': 'Pocos videos por semana',
  'comments-low': 'Poca conversación en los videos',
  'shares-low': 'Nadie comparte los videos',
  'series-momentum': 'Un formato rinde muy por encima',
};
const AP_TT_ACCION = {
  'experiment-format': 'Probar un formato nuevo',
  'upload-batch': 'Subir un lote de videos',
  'reply-comments': 'Responder comentarios',
  'post-series-next': 'Publicar el siguiente de la serie',
};
const AP_TT_FUENTES = {
  vistas: 'Vistas',
  engagement: 'Engagement',
  comentarios: 'Comentarios',
  compartidos: 'Compartidos',
  seguidores: 'Seguidores',
  publicaciones: 'Publicaciones',
  horarios: 'Horarios',
  completion: 'Completion',
  retencion: 'Retención',
  alcance_fyp: 'Alcance FYP',
  rewatch: 'Rewatch',
  sonidos: 'Sonidos',
};

const renderTTAutopilot = async () => {
  const { data } = await apiSafe('/api/autopilot/tiktok/latest', null);
  const { data: historial } = await apiSafe('/api/autopilot/tiktok/history', []);
  const barra = `
    <div class="okr-barra">
      <div class="okr-barra-botones">
        <button class="v2-btn v2-btn-primary v2-btn-sm" data-ap-run="tiktok">Generar reporte ahora</button>
      </div>
    </div>`;

  if (!data) {
    return `
      <div class="apig-wrap">
        ${barra}
        <div class="v2-card v2-card-pad">
          <div class="v2-eyebrow">TikTok Autopilot</div>
          <h2 class="v2-h2">Todavía no hay reportes</h2>
          <p class="v2-section-desc">El autopilot lee tus videos de TikTok: vistas, engagement, comentarios, compartidos, seguidores y cadencia. Con eso detecta señales y propone acciones en Decisiones. Completion, retención y alcance FYP no los expone la API de TikTok: se marcan como no disponibles.</p>
        </div>
      </div>`;
  }

  const m = data.observation?.metrics || {};
  const fuentes = data.observation?.fuentes || {};
  const score = Number(data.healthScore || 0);
  const sinCuenta =
    data.observation?.metrics?.videosLast7d === null || data.observation?.metrics?.videosLast7d === undefined;
  const scoreClase = score >= 70 ? 'ok' : score >= 40 ? 'warn' : 'crit';
  const senales = data.signals || [];
  const reales = Object.keys(AP_TT_FUENTES).filter((k) => fuentes[k] === 'real').length;
  const pct = (n, dec = 2) => (n === null || n === undefined ? '—' : `${(n * 100).toFixed(dec)}%`);

  const datos = [
    {
      k: 'vistas',
      titulo: 'Vistas de la semana',
      valor: apNum(m.viewsLast7d),
      sub: m.viewsPrev7d !== null && m.viewsPrev7d !== undefined ? `vs ${apNum(m.viewsPrev7d)} la semana anterior` : '',
    },
    {
      k: 'engagement',
      titulo: 'Engagement',
      valor: apNum(m.engagementRateLast7d, '%'),
      sub: 'Likes, comentarios y compartidos sobre vistas',
    },
    {
      k: 'comentarios',
      titulo: 'Comentarios sobre vistas',
      valor: pct(m.commentRateLast7d),
      sub: 'Mínimo recomendado 0,5%',
    },
    {
      k: 'compartidos',
      titulo: 'Compartidos sobre vistas',
      valor: pct(m.shareRateLast7d),
      sub: 'Mínimo recomendado 0,2%',
    },
    {
      k: 'seguidores',
      titulo: 'Seguidores · semana',
      valor: apSigno(m.followerDeltaLast7d),
      sub: 'Neto desde el historial propio',
    },
    {
      k: 'publicaciones',
      titulo: 'Videos esta semana',
      valor: apNum(m.videosLast7d),
      sub: m.videosLast30d !== null && m.videosLast30d !== undefined ? `${m.videosLast30d} en 30 días` : '',
    },
    {
      k: 'horarios',
      titulo: 'Último video',
      valor:
        data.observation?.horaUltimoVideo !== null && data.observation?.horaUltimoVideo !== undefined
          ? `${data.observation.horaUltimoVideo}h`
          : '—',
      sub: 'Hora local de publicación',
    },
    { k: 'completion', titulo: 'Completion', valor: '—', sub: 'La API de TikTok no la expone' },
  ];

  return `
    <div class="apig-wrap">
      ${barra}
      <div class="apig-hero">
        <div class="apig-score apig-score-${sinCuenta ? 'neutral' : scoreClase}">${sinCuenta ? '—' : score}</div>
        <div class="apig-hero-texto">
          <div class="v2-eyebrow">TikTok Autopilot · ${escape(okrFecha(data.generatedAt))}</div>
          <h2 class="v2-h2">${sinCuenta ? 'Sin datos de la cuenta' : senales.length ? `${senales.length} señal(es) detectada(s)` : 'Sin señales de alerta'}</h2>
          <p class="v2-section-desc">${escape(data.didacticInsight || '')}</p>
        </div>
      </div>

      <section class="v2-card v2-card-pad">
        <div class="v2-card-head"><strong>Datos reales usados</strong><span class="v2-badge">${reales} de ${Object.keys(AP_TT_FUENTES).length} fuentes</span></div>
        <div class="apig-datos">
          ${datos
            .map(
              (d) => `
            <div class="apig-dato">
              <div class="v2-eyebrow">${escape(d.titulo)}</div>
              <div class="apig-dato-valor">${escape(String(d.valor))}</div>
              ${d.sub ? `<div class="v2-hint">${escape(d.sub)}</div>` : ''}
              <span class="apig-fuente ${fuentes[d.k] === 'real' ? 'apig-fuente-real' : 'apig-fuente-no'}">${escape(fuentes[d.k] || 'no disponible')}</span>
            </div>`,
            )
            .join('')}
        </div>
        <p class="v2-hint" style="margin-top:12px;">No medido por la API de TikTok: completion, retención por segundo, alcance FYP, rewatch y tendencia de sonidos. Esas reglas no se evalúan.</p>
      </section>

      <section class="v2-section">
        <div class="v2-section-head"><div class="v2-eyebrow">Señales y acciones</div><h2 class="v2-h2">Lo que el autopilot propone</h2></div>
        ${
          senales.length
            ? `<div class="apig-senales">${senales
                .map((s) => {
                  const sev = AP_SEVERIDAD[s.severity] || AP_SEVERIDAD.low;
                  return `
              <div class="v2-card apig-senal" style="box-shadow:inset 3px 0 0 ${sev.color};">
                <div class="apig-senal-head">
                  <span class="apig-senal-titulo">${escape(AP_TT_SENAL[s.signal] || s.signal)}</span>
                  <span class="apig-senal-sev" style="color:${sev.color};">${escape(sev.label)}</span>
                </div>
                <div class="v2-hint">${escape(s.evidence)}</div>
                <p class="apig-senal-razon">${escape(s.reasoning)}</p>
                <div class="apig-senal-accion"><strong>Acción:</strong> ${escape(AP_TT_ACCION[s.recommendedAction] || s.recommendedAction)}</div>
                <div class="v2-hint">Impacto esperado: ${escape(s.expectedImpact)}</div>
                <div class="v2-hint">Propuesta en <strong>Decisiones</strong>: aceptás o rechazás ahí.</div>
              </div>`;
                })
                .join('')}</div>`
            : '<div class="v2-card v2-card-pad"><div class="v2-hint">Ninguna regla se disparó con los datos de esta semana.</div></div>'
        }
      </section>

      ${
        (historial || []).length
          ? `<section class="v2-card v2-card-pad">
              <div class="v2-card-head"><strong>Historial de reportes</strong></div>
              <ul class="apig-historial">${historial
                .map(
                  (h) =>
                    `<li><span>${escape(okrFecha(h.generatedAt))}</span> Salud ${h.healthScore} · ${h.signals.length} señal(es)${h.criticalCount ? ` · ${h.criticalCount} crítica(s)` : ''}</li>`,
                )
                .join('')}</ul>
            </section>`
          : ''
      }
    </div>`;
};

const renderAutopilotReport = async (platform) =>
  platform === 'instagram' ? renderIGAutopilot() : renderTTAutopilot();
const renderTabContent = async (b) => {
  if (activeTab === 'summary') return renderSummary(b);
  if (activeTab === 'commandCenter') return renderCommandCenter();
  if (activeTab === 'decisions') return renderDecisions();
  if (activeTab === 'okrs') return renderOKRs();
  if (activeTab === 'igAutopilot') return renderAutopilotReport('instagram');
  if (activeTab === 'ttAutopilot') return renderAutopilotReport('tiktok');
  if (activeTab === 'proposals') return renderProposals();
  if (activeTab === 'posts') return renderPostsAnalysis();
  if (activeTab === 'analytics') {
    await panelAnalytics.cargar();
    return panelAnalytics.html();
  }
  if (activeTab === 'reports') {
    await panelReportes.cargar();
    return panelReportes.html();
  }
  if (activeTab === 'scheduler')
    return renderTabLink('scheduler', 'Scheduler', 'Jobs programados y próximas ejecuciones.');
  if (activeTab === 'collabs') return renderTabLink('collab', 'Collabs', 'Colaboraciones, brand deals y partnerships.');
  if (EMBED_VIEWS[activeTab]) {
    return `<div id="exec-embed" data-embed="${activeTab}"><div class="loading-screen"><span class="spinner lg"></span></div></div>`;
  }
  return '';
};

export const renderImperio = async (root) => {
  activeTab = window.__fxTabPendiente ?? 'summary';
  window.__fxTabPendiente = null;

  // El callback de /api/auth/{instagram,tiktok}/callback redirige de vuelta
  // acá con ?connected=... o ?oauth_error=... — avisamos y limpiamos la URL.
  try {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const oauthError = params.get('oauth_error');
    if (connected === 'instagram' || connected === 'tiktok') {
      toast(`✅ ${connected === 'instagram' ? 'Instagram' : 'TikTok'} conectado`, 'ok');
    } else if (oauthError) {
      toast(`Error al conectar: ${oauthError}`, 'err');
    }
    if (connected || oauthError) {
      params.delete('connected');
      params.delete('brandId');
      params.delete('oauth_error');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash);
    }
  } catch {
    /* noop */
  }

  root.innerHTML = `
    <div class="v2-tabs">
      ${TABS.map((t) => `<button class="v2-tab ${t.id === 'summary' ? 'is-active' : ''}" data-tab="${t.id}">${escape(t.label)}</button>`).join('')}
    </div>
    <div id="exec-body" class="v2-body"><div class="loading-screen"><span class="spinner lg"></span></div></div>

    <style>
      /* ═════════ Sala Ejecutiva v2 · Vercel-grade · THEME-AWARE ═════════
         Usamos los tokens globales del proyecto (--text-primary, --bg-elevated, etc.)
         que ya cambian con data-theme="light". Cualquier hardcoded color que no
         dependa de los tokens rompe modo claro. */
      .v2-body{
        --v2-line: var(--border, rgba(255,255,255,.08));
        --v2-line-strong: var(--border-focus, rgba(255,255,255,.18));
        --v2-fg: var(--text-primary, #fafafa);
        --v2-fg-2: var(--text-secondary, #d4d4d8);
        --v2-fg-3: var(--text-tertiary, #a1a1aa);
        --v2-surface: var(--bg-elevated, #0a0a0a);
        --v2-surface-2: var(--bg-card, #0f0f0f);
        --v2-hover: var(--bg-hover, rgba(255,255,255,.04));
        font-feature-settings:"tnum" 1,"ss01" 1;
        letter-spacing:-0.011em;
        color:var(--v2-fg);
      }

      /* Tabs grid 6x3 */
      .v2-tabs{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;padding:12px;background:var(--v2-surface);box-shadow:inset 0 0 0 1px var(--v2-line);border-radius:10px;margin-bottom:24px;}
      .v2-tab{padding:12px 14px;border-radius:8px;border:1.5px solid #fbbf7a;background:#ffc98a;color:#000;font-size:12.5px;font-weight:600;letter-spacing:-0.01em;cursor:pointer;white-space:normal;text-align:center;min-height:48px;display:flex;align-items:center;justify-content:center;transition:background .15s,color .15s,border-color .15s;}
      .v2-tab:hover{background:#ffb75e;border-color:#f59e0b;color:#000;}
      .v2-tab.is-active{background:#ff9f33;border-color:#c2680a;color:#000;box-shadow:inset 0 0 0 1px #c2680a;}

      /* Eyebrow / nums / hint */
      .v2-eyebrow{font-size:10.5px;text-transform:uppercase;letter-spacing:.14em;font-weight:600;color:var(--v2-fg-2);}
      .v2-h1{font-size:42px;line-height:1.04;letter-spacing:-0.04em;font-weight:600;color:var(--v2-fg);margin:14px 0 16px;}
      .v2-h1-dim{color:var(--v2-fg-3);display:block;}
      .v2-h2{font-size:22px;line-height:1.2;letter-spacing:-0.02em;font-weight:700;color:var(--v2-fg);margin:6px 0 0;}
      .v2-lead{font-size:14px;color:var(--v2-fg-2);max-width:60ch;line-height:1.55;margin:14px 0 0;}
      .v2-section-desc{font-size:13px;color:var(--v2-fg-3);margin:6px 0 0;}
      .v2-hint{font-size:11px;color:var(--v2-fg-3);letter-spacing:-0.005em;line-height:1.4;}
      .v2-num-xl{font-size:32px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.04em;line-height:1;font-variant-numeric:tabular-nums;}
      .v2-num-md{font-size:16px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
      .v2-num-sm{font-size:12px;font-weight:600;color:var(--v2-fg);font-variant-numeric:tabular-nums;}
      .v2-delta{font-size:11.5px;font-weight:600;font-variant-numeric:tabular-nums;letter-spacing:-0.005em;}
      .v2-delta-sm{font-size:10.5px;font-weight:600;font-variant-numeric:tabular-nums;}

      /* Cards · hairline border, no shadow blob */
      .v2-card{background:var(--v2-surface);border-radius:14px;box-shadow:inset 0 0 0 1px var(--v2-line);transition:box-shadow .2s;position:relative;overflow:hidden;}
      .v2-card:hover{box-shadow:inset 0 0 0 1px var(--v2-line-strong);}
      .v2-card-pad{padding:18px;}
      .v2-card-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:14px;}
      .v2-card-head strong{font-size:13px;font-weight:600;letter-spacing:-0.01em;color:var(--v2-fg);}

      /* Badges */
      .v2-badge{display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:5px;font-size:10.5px;font-weight:600;letter-spacing:-0.005em;line-height:1.5;}
      .v2-badge-brand{background:rgba(124,58,237,.12);color:#7c3aed;box-shadow:inset 0 0 0 1px rgba(124,58,237,.32);}
      .v2-badge-ok{background:rgba(16,185,129,.12);color:#059669;box-shadow:inset 0 0 0 1px rgba(16,185,129,.32);}
      .v2-badge-warn{background:rgba(217,119,6,.14);color:#b45309;box-shadow:inset 0 0 0 1px rgba(217,119,6,.32);}
      :root[data-theme="dark"] .v2-badge-brand,
      html:not([data-theme="light"]) .v2-badge-brand{color:#c4b5fd;}
      :root[data-theme="dark"] .v2-badge-ok,
      html:not([data-theme="light"]) .v2-badge-ok{color:#6ee7b7;}
      :root[data-theme="dark"] .v2-badge-warn,
      html:not([data-theme="light"]) .v2-badge-warn{color:#fbcb6b;}

      /* Buttons */
      .v2-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 14px;height:34px;border-radius:7px;font-size:13px;font-weight:600;letter-spacing:-0.01em;cursor:pointer;border:0;transition:background .15s,color .15s,box-shadow .15s;font-family:inherit;}
      .v2-btn-sm{height:28px;padding:0 10px;font-size:12px;}
      .v2-btn-primary{background:var(--v2-fg);color:var(--v2-surface);}
      .v2-btn-primary:hover{opacity:.88;}
      .v2-btn-outline{background:transparent;color:var(--v2-fg);box-shadow:inset 0 0 0 1px var(--v2-line-strong);}
      .v2-btn-outline:hover{background:var(--v2-hover);}
      .v2-btn-ghost{background:transparent;color:var(--v2-fg-2);}
      .v2-btn-ghost:hover{background:var(--v2-hover);color:var(--v2-fg);}

      /* HERO */
      .v2-hero{position:relative;background:var(--v2-surface);border-radius:18px;box-shadow:inset 0 0 0 1px var(--v2-line);padding:32px;overflow:hidden;}
      .v2-hero::before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle, var(--v2-line-strong) 1px, transparent 1px);background-size:24px 24px;opacity:.5;pointer-events:none;}
      .v2-hero-inner{position:relative;display:flex;justify-content:space-between;align-items:flex-start;gap:24px;flex-wrap:wrap;}
      .v2-hero-tags{display:flex;gap:6px;margin-bottom:6px;}
      .v2-hero-cta{display:flex;flex-direction:column;gap:8px;min-width:200px;}
      .v2-tier-progress{position:relative;margin-top:28px;max-width:540px;}
      .v2-tier-progress-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;}
      .v2-tier-progress-bar{height:3px;background:var(--v2-line);border-radius:99px;overflow:hidden;}
      .v2-tier-progress-bar > div{height:100%;background:linear-gradient(90deg,var(--v2-fg),var(--v2-fg-2));transition:width .8s;}

      /* Sections + KPI grid */
      .v2-section{margin-top:36px;}
      .v2-section-head{margin-bottom:18px;}
      .v2-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;}
      .v2-kpi{padding:18px;}
      .v2-kpi .v2-eyebrow{margin-bottom:12px;}
      .v2-kpi .v2-num-xl{margin-bottom:8px;}

      /* Growth Card */
      .v2-grow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:16px;}
      .v2-grow-card{padding:20px;}
      .v2-grow-accent{position:absolute;top:0;left:0;right:0;height:1px;opacity:.7;}
      .v2-grow-head{display:flex;justify-content:space-between;align-items:center;gap:8px;}
      .v2-grow-brand{display:flex;align-items:center;gap:10px;}
      .v2-grow-glyph{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;}
      .v2-grow-handle{font-size:13px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.01em;margin-top:2px;}
      .v2-grow-primary{margin-top:18px;}
      .v2-grow-followers-row{display:flex;align-items:baseline;gap:10px;margin-top:6px;}
      .v2-grow-followers-row .v2-num-xl{font-size:38px;}
      .v2-grow-spark{margin-top:10px;}
      .v2-grow-tier{margin-top:14px;}
      .v2-grow-tier-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
      .v2-grow-tier-bar{height:3px;background:var(--v2-line);border-radius:99px;overflow:hidden;}
      .v2-grow-tier-bar > div{height:100%;border-radius:99px;}
      .v2-grow-period-tabs{display:flex;gap:6px;margin-top:12px;}
      .v2-grow-period-tab{flex:1;padding:6px 0;border-radius:7px;border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-3);font-size:11px;font-weight:600;cursor:pointer;transition:background .15s,color .15s,border-color .15s;}
      .v2-grow-period-tab:hover{background:var(--v2-hover);color:var(--v2-fg);}
      .v2-grow-period-tab.is-active{background:var(--v2-fg);color:var(--v2-surface);border-color:var(--v2-fg);}
      .v2-grow-metrics{margin-top:18px;display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--v2-line);border-radius:10px;overflow:hidden;}
      .v2-grow-metric{background:var(--v2-surface);padding:12px;}
      .v2-grow-metric-val{display:flex;align-items:baseline;gap:6px;margin-top:4px;}
      .v2-feed{display:flex;flex-direction:column;gap:2px;margin-top:12px;max-height:420px;overflow:auto;}
      .v2-feed-row{display:grid;grid-template-columns:72px 96px 1fr;gap:12px;align-items:start;padding:10px 6px;border-top:1px solid var(--v2-line);}
      .v2-feed-when{font-size:11px;color:var(--v2-fg-3);padding-top:2px;}
      .v2-feed-tipo{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:600;padding:3px 8px;border-radius:999px;justify-self:start;background:var(--v2-hover);color:var(--v2-fg-2);}
      .v2-feed-tipo--red-social{background:rgba(225,48,108,.12);color:#e1306c;}
      .v2-feed-tipo--agente{background:rgba(168,85,247,.12);color:#a855f7;}
      .v2-feed-tipo--automatizacion{background:rgba(34,211,238,.12);color:#22d3ee;}
      .v2-feed-tipo--pieza{background:rgba(245,158,11,.12);color:#f59e0b;}
      .v2-feed-tipo--mision{background:rgba(52,211,153,.12);color:#34d399;}
      .v2-feed-route{font-size:13px;color:var(--v2-fg);}
      @media (max-width: 720px){.v2-feed-row{grid-template-columns:1fr;gap:4px;}}
      .apig-wrap{display:flex;flex-direction:column;gap:16px;}
      .apig-hero{display:flex;gap:18px;align-items:center;}
      .apig-score{width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;color:#fff;flex-shrink:0;}
      .apig-score-ok{background:linear-gradient(135deg,#10b981,#3b82f6);}
      .apig-score-warn{background:linear-gradient(135deg,#f59e0b,#ef4444);}
      .apig-score-crit{background:linear-gradient(135deg,#ef4444,#7f1d1d);}
      .apig-score-neutral{background:#52525b;}
      .apig-datos{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:12px;margin-top:14px;}
      .apig-dato{padding:14px;border-radius:12px;background:var(--v2-hover);display:flex;flex-direction:column;gap:4px;}
      .apig-dato-valor{font-size:20px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.02em;}
      .apig-fuente{align-self:flex-start;font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border-radius:999px;margin-top:4px;}
      .apig-fuente-real{background:rgba(52,211,153,.12);color:#34d399;}
      .apig-fuente-no{background:rgba(161,161,170,.15);color:var(--v2-fg-3);}
      .apig-senales{display:flex;flex-direction:column;gap:12px;margin-top:12px;}
      .apig-senal{padding:16px;display:flex;flex-direction:column;gap:6px;}
      .apig-senal-head{display:flex;justify-content:space-between;align-items:center;gap:8px;}
      .apig-senal-titulo{font-size:15px;font-weight:600;color:var(--v2-fg);}
      .apig-senal-sev{font-size:10px;text-transform:uppercase;letter-spacing:.08em;font-weight:700;}
      .apig-senal-razon{margin:4px 0;font-size:13px;color:var(--v2-fg-2);}
      .apig-senal-accion{font-size:13px;padding:8px 10px;border-radius:8px;background:var(--v2-hover);color:var(--v2-fg-2);}
      .apig-historial{margin:12px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--v2-fg-2);}
      .apig-historial span{color:var(--v2-fg-3);margin-right:6px;}
      @media (max-width:720px){.apig-hero{flex-direction:column;align-items:flex-start;}}
      .okr-wrap{display:flex;flex-direction:column;gap:16px;}
      .okr-explica .v2-lead{margin-top:10px;}
      .okr-tres{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:16px;}
      .okr-tres>div{padding:14px;border-radius:12px;background:var(--v2-hover);display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--v2-fg-2);}
      .okr-tres strong{color:var(--v2-fg);font-size:14px;}
      .okr-tres em{display:block;color:var(--v2-fg-3);font-size:12px;margin-top:4px;}
      .okr-reglas{margin:16px 0 0;padding-left:18px;font-size:13px;color:var(--v2-fg-2);display:flex;flex-direction:column;gap:6px;}
      .okr-barra{display:flex;justify-content:flex-end;}
      .okr-barra-botones{display:flex;gap:8px;flex-wrap:wrap;}
      .okr-form[hidden],[hidden].okr-form{display:none !important;}
      .okr-form{display:flex;flex-direction:column;gap:12px;}
      .okr-plantillas{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .okr-campo{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--v2-fg-2);flex:1;}
      .okr-fila{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
      .okr-campo input,.okr-campo select,.okr-campo textarea,.okr-kr-campo input,.okr-kr-campo select,.okr-avance input{padding:8px 10px;border-radius:8px;border:1px solid var(--v2-line);background:var(--v2-surface-2);color:var(--v2-fg);font:inherit;font-size:13px;}
      .okr-kr-campo{border:1px solid var(--v2-line);border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:8px;}
      .okr-kr-campo legend{font-size:11px;color:var(--v2-fg-3);padding:0 6px;text-transform:uppercase;letter-spacing:.06em;}
      .okr-form-acciones{display:flex;gap:8px;}
      .okr-form-error{color:#f87171;}
      .okr-lista{display:flex;flex-direction:column;gap:14px;}
      .okr-card{padding:18px;display:flex;flex-direction:column;gap:14px;}
      .okr-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;}
      .okr-card-head h3{margin:4px 0 0;font-size:17px;color:var(--v2-fg);}
      .okr-estado{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;padding:4px 10px;border-radius:999px;white-space:nowrap;}
      .okr-progreso{display:flex;flex-direction:column;gap:6px;}
      .okr-barra-progreso{height:6px;border-radius:99px;background:var(--v2-line);overflow:hidden;}
      .okr-barra-progreso>div{height:100%;border-radius:99px;background:linear-gradient(90deg,#a855f7,#22d3ee);transition:width .6s;}
      .okr-barra-progreso.fina{height:4px;}
      .okr-krs{display:flex;flex-direction:column;gap:12px;}
      .okr-kr{display:flex;flex-direction:column;gap:6px;padding:12px;border-radius:10px;background:var(--v2-hover);}
      .okr-kr-head{display:flex;justify-content:space-between;gap:8px;align-items:center;}
      .okr-kr-desc{font-size:13px;font-weight:600;color:var(--v2-fg);}
      .okr-kr-estado{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;}
      .okr-kr-valores{font-size:13px;color:var(--v2-fg-2);}
      .okr-kr-pie{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px;}
      .okr-avance{display:flex;gap:6px;align-items:center;}
      .okr-avance input{width:120px;}
      .okr-recs{margin:0;padding-left:18px;font-size:12px;color:var(--v2-fg-2);display:flex;flex-direction:column;gap:4px;}
      .okr-card-foot{display:flex;justify-content:flex-end;gap:8px;}
      .okr-form-cabecera{display:flex;justify-content:space-between;align-items:baseline;gap:12px;flex-wrap:wrap;}
      .okr-paso{display:flex;flex-direction:column;gap:10px;padding-top:6px;}
      .okr-paso>strong{font-size:14px;color:var(--v2-fg);}
      .okr-fila3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
      .okr-fila3 select,.okr-fila3 input{width:100%;}
      .okr-feedback{border-radius:10px;padding:12px 14px;background:var(--v2-hover);display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--v2-fg-2);}
      .okr-feedback-msg{color:#f87171;font-weight:600;}
      .okr-puntaje{color:var(--v2-fg);}
      .okr-bloq{margin:0;padding-left:18px;color:#f87171;display:flex;flex-direction:column;gap:4px;}
      .okr-obs{margin:0;padding-left:18px;color:#fbbf24;display:flex;flex-direction:column;gap:4px;font-size:12px;}
      .okr-porque{margin:6px 0 0;font-size:13px;color:var(--v2-fg-2);}
      .okr-dir{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--v2-fg-3);margin-left:6px;}
      .okr-checkins{margin:4px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:3px;font-size:12px;color:var(--v2-fg-2);}
      .okr-checkins span{color:var(--v2-fg-3);margin-right:4px;}
      @media (max-width:720px){.okr-fila3{grid-template-columns:1fr;}}
      @media (max-width:720px){.okr-fila,.okr-tres{grid-template-columns:1fr;}}
      .v2-grow-card--empty{display:flex;flex-direction:column;}
      .v2-grow-connect{margin-top:20px;display:flex;flex-direction:column;gap:12px;align-items:flex-start;}
      .v2-grow-connect .v2-btn{align-self:flex-start;}

      /* Staff + Hitos */
      .v2-2col{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-top:36px;}
      .v2-staff{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;}
      .v2-staff-row{display:flex;gap:10px;align-items:center;background:var(--v2-surface-2);padding:10px 12px;border-radius:9px;box-shadow:inset 0 0 0 1px var(--v2-line);}
      .v2-dot{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.55);flex-shrink:0;}
      .v2-staff-main{min-width:0;}
      .v2-staff-rol{font-size:12.5px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.005em;}
      .v2-hitos{display:flex;flex-direction:column;gap:6px;}
      .v2-hito-row{display:flex;gap:10px;align-items:center;background:var(--v2-surface-2);padding:10px 12px;border-radius:9px;box-shadow:inset 0 0 0 1px var(--v2-line);}
      .v2-hito-ic{font-size:16px;}

      /* Propuestas */
      .v2-prop-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
      .v2-prop{padding:16px;}
      .v2-prop-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px;}
      .v2-prop-agent{font-size:13px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.01em;}
      .v2-prop-title{font-size:14px;font-weight:600;color:var(--v2-fg);margin:0 0 6px;letter-spacing:-0.015em;}
      .v2-prop-actions{display:flex;gap:6px;margin-top:14px;}
      .v2-prop-actions .v2-btn{flex:1;}

      /* Posts */
      .v2-posts{display:flex;flex-direction:column;gap:10px;}
      .v2-post{padding:14px 16px;display:flex;gap:14px;}
      .v2-post-ic{font-size:22px;color:var(--v2-fg-3);width:30px;text-align:center;flex-shrink:0;}
      .v2-post-main{flex:1;min-width:0;}
      .v2-post-title{font-size:14px;font-weight:600;color:var(--v2-fg);letter-spacing:-0.015em;margin-bottom:6px;}
      .v2-post-stats{display:flex;gap:14px;font-size:11.5px;color:var(--v2-fg-3);margin-bottom:10px;flex-wrap:wrap;align-items:center;}
      .v2-post-recom{font-size:12px;line-height:1.55;color:var(--v2-fg-2);background:rgba(168,85,247,.08);padding:8px 12px;border-radius:8px;border-left:2px solid #a855f7;}

      .v2-link-card{padding:36px 24px;text-align:center;}

      .v2-ascenso{margin-bottom:16px;padding:14px 18px;border-radius:12px;text-align:center;font-size:14px;color:#fff;background:linear-gradient(90deg,#e1306c,#a855f7,#22d3ee);}

      @media (max-width: 720px){
        .v2-h1{font-size:30px;}
        .v2-hero{padding:22px;}
        .v2-hero-cta{width:100%;}
        .v2-card-pad{padding:14px;}
      }
    </style>
  `;

  const { data: b } = await apiSafe('/api/experience/brief', null);
  const briefData = b ?? {
    tier: 'Bronce',
    tierProgresoPct: 12,
    saludo: 'Bienvenido a tu Sala Ejecutiva',
    narrativa: 'Conectá el backend para ver tu apalancamiento real, equipo trabajando y trofeos.',
    leverage: {
      ratioLabel: '0×',
      accionesEjecutadas: 0,
      indicacionesDadas: 0,
      piezasCreadas: { carruseles: 0, videos: 0, total: 0 },
      gastosUsd: 0,
      costoHumanoEquivalenteUsd: 0,
      ahorroUsd: 0,
      horasHumanasAhorradas: 0,
    },
    staff: [{ rol: 'Equipo en pausa', estado: 'esperando conexión', acciones: 0, ultimoReporte: null }],
    hitos: [],
    interacciones: [],
    credencial: 'FeedIA · founder mode',
  };

  const repaint = async () => {
    const body = root.querySelector('#exec-body');
    body.innerHTML = '<div style="text-align:center;padding:40px;"><span class="spinner lg"></span></div>';
    body.innerHTML = await renderTabContent(briefData);
    const embed = body.querySelector('[data-embed]');
    if (embed) {
      const tabId = embed.dataset.embed;
      const spec = EMBED_VIEWS[tabId];
      if (spec) {
        try {
          const mod = await import(spec.path);
          const fn = mod[spec.name];
          if (typeof fn === 'function') await fn(embed);
        } catch (err) {
          embed.innerHTML = `<div class="alert crit">No se pudo cargar ${escape(tabId)}: ${escape(err.message)}</div>`;
        }
      }
    }
    body.querySelectorAll('[data-go-route]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.hash = `#${btn.dataset.goRoute}`;
      });
    });
    wireProposals(body, root, repaint);
    wirePostsAnalysis(body);
    panelAnalytics.wire(body);
    panelReportes.wire(body);
    body.querySelectorAll('[data-resolve]').forEach((bt) => {
      bt.addEventListener('click', async () => {
        const status = bt.dataset.resolve;
        const id = bt.dataset.id;
        try {
          const r = await fetch('/api/executive/decisions/resolve', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ decisionId: id, status }),
          });
          if (r.ok) {
            bt.closest('.dec-card').style.opacity = '.35';
            toast(status === 'approved' ? '✅ Aprobada' : 'Rechazada', status === 'approved' ? 'ok' : 'info');
            if (status === 'approved' && bt.dataset.accionTipo === 'conectar' && bt.dataset.accionValor) {
              window.location.href = ccLoginUrl(bt.dataset.accionValor);
            } else if (status === 'approved' && bt.dataset.accionTipo === 'tab' && bt.dataset.accionValor) {
              root.querySelector(`.v2-tab[data-tab="${bt.dataset.accionValor}"]`)?.click();
            }
          } else {
            toast('Error al resolver', 'err');
          }
        } catch {
          toast('Backend offline', 'warn');
        }
      });
    });

    wireOKRs(body, root, repaint);
    wireAutopilot(body, repaint);

    body.querySelectorAll('[data-cc-tab]').forEach((btn) => {
      btn.addEventListener('click', () => {
        root.querySelector(`.v2-tab[data-tab="${btn.dataset.ccTab}"]`)?.click();
      });
    });
    body.querySelectorAll('[data-cc-ruta]').forEach((btn) => {
      btn.addEventListener('click', () => {
        window.location.hash = `#${btn.dataset.ccRuta}`;
      });
    });
    body.querySelectorAll('[data-cc-resolve]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const row = btn.closest('[data-cc-decision]');
        const botones = row ? row.querySelectorAll('button') : [];
        botones.forEach((b) => (b.disabled = true));
        try {
          const r = await fetch('/api/executive/decisions/resolve', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ decisionId: btn.dataset.ccId, status: btn.dataset.ccResolve }),
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          toast(btn.dataset.ccResolve === 'approved' ? '✅ Decisión aprobada' : 'Decisión rechazada', 'ok');
          void repaint();
        } catch (err) {
          botones.forEach((b) => (b.disabled = false));
          toast(`No se pudo resolver: ${err.message}`, 'err');
        }
      });
    });

    // Tabs de período (7D/30D/90D/6M/1A) de "Crecimiento por red" — los 5
    // deltas ya vienen calculados del backend en data-growth-deltas, así que
    // cambiar de período es instantáneo (sin refetch).
    body.querySelectorAll('.v2-grow-card[data-growth-deltas]').forEach((card) => {
      let deltas = {};
      try {
        deltas = JSON.parse(card.dataset.growthDeltas || '{}');
      } catch {
        deltas = {};
      }
      const deltaOut = card.querySelector('.v2-grow-delta-out');
      const hintOut = card.querySelector('.v2-grow-hint-out');
      const applyPeriod = (key) => {
        const d = deltas[key];
        if (!d || !d.available) {
          if (deltaOut) {
            deltaOut.textContent = '—';
            deltaOut.style.color = 'var(--v2-fg-3)';
          }
          if (hintOut) hintOut.textContent = 'Todavía no hay suficiente historial para este período.';
          return;
        }
        const positive = (d.value ?? 0) >= 0;
        const pctText = typeof d.pct === 'number' ? `${Math.abs(d.pct).toFixed(1)}%` : `${Math.abs(d.value)}`;
        if (deltaOut) {
          deltaOut.textContent = `${positive ? '↑' : '↓'} ${pctText}`;
          deltaOut.style.color = positive ? '#34d399' : '#f87171';
        }
        if (hintOut) {
          const since = d.sinceIso ? new Date(d.sinceIso).toLocaleDateString('es-AR') : '';
          hintOut.textContent = since ? `vs ${since}` : '';
        }
      };
      card.querySelectorAll('[data-growth-period]').forEach((btn) => {
        btn.addEventListener('click', () => {
          card.querySelectorAll('[data-growth-period]').forEach((b) => b.classList.toggle('is-active', b === btn));
          applyPeriod(btn.dataset.growthPeriod);
        });
      });
      const initial = card.querySelector('[data-growth-period].is-active');
      applyPeriod(initial ? initial.dataset.growthPeriod : 'month');
    });
  };

  root.querySelectorAll('.v2-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      root.querySelectorAll('.v2-tab').forEach((t) => t.classList.toggle('is-active', t === tab));
      void repaint();
    });
  });
  await repaint();
};
