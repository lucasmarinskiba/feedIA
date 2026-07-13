/* ══════════════════════════════════════════════════════════════════════════════
   INTELIGENCIA — panel en vivo del sistema autónomo
   ──────────────────────────────────────────────────────────────────────────────
   Presupuesto de tokens + bandits de aprendizaje + caché semántica + digest
   determinista. Refresca cada 5s. Render-first + apiSafe (tolerante a offline).
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { loadingScreen } from '../lib/ui.js';

let timer = null;
const stop = () => {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
};
window.addEventListener('beforeunload', stop);
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'inteligencia') stop();
});

const DEFAULTS = {
  budget: {
    spentUsd: 0,
    capUsd: 0,
    usedPct: 0,
    breaker: 'closed',
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    byModel: {},
  },
  cache: { hitRatePct: 0, entries: 0, hits: 0, misses: 0, topReused: [] },
  bandits: [],
  digest: {
    resumenEjecutivo: 'Sin datos aún. El sistema empieza a aprender en cuanto reciba la primera misión.',
    data: {
      intel: {
        misiones: { ok: 0, parciales: 0, fallidas: 0 },
        trazas: { tasaExito: 0 },
        carruseles: { publicados: 0, retenidos: 0 },
        riesgos: [],
      },
    },
    cosasQueRequierenAtencion: [],
  },
};

const bar = (pct, danger) => {
  const p = Math.max(0, Math.min(100, pct));
  const col = danger ? 'var(--crit)' : p >= 80 ? 'var(--warn)' : 'var(--ok)';
  return `<div style="background:var(--border);border-radius:6px;height:10px;overflow:hidden;">
    <div style="width:${p}%;height:100%;background:${col};"></div></div>`;
};

const renderBudget = (b) => `
  <div class="card">
    <div class="row spread"><b>💰 Presupuesto de tokens (hoy)</b>
      <span class="tag ${b.breaker === 'open' ? 'crit' : 'ok'} tiny">breaker ${b.breaker}</span></div>
    <div style="margin:10px 0 6px;font-size:22px;font-weight:800;">$${b.spentUsd} <span class="muted" style="font-size:13px;font-weight:500;">/ $${b.capUsd} (${b.usedPct}%)</span></div>
    ${bar(b.usedPct, b.breaker === 'open')}
    <div class="meta" style="margin-top:10px;">
      <span class="tag tiny">${b.calls} llamadas</span>
      <span class="tag tiny">in ${(b.inputTokens / 1000).toFixed(0)}k tok</span>
      <span class="tag tiny">out ${(b.outputTokens / 1000).toFixed(0)}k tok</span>
    </div>
    <div class="meta" style="margin-top:6px;">
      ${
        Object.entries(b.byModel || {})
          .map(([m, v]) => `<span class="tag accent tiny">${escape(m)}: $${v.usd} (${v.calls})</span>`)
          .join('') || '<span class="tiny muted">sin uso aún</span>'
      }
    </div>
  </div>`;

const renderBandits = (bandits) => `
  <div class="card">
    <b>🎰 Aprendizaje (bandits Thompson)</b>
    ${
      !bandits.length
        ? '<div class="tiny muted" style="margin-top:8px;">Sin experimentos aún. El sistema aprende de sus outcomes.</div>'
        : bandits
            .map(
              (bd) => `
      <div style="margin-top:10px;">
        <div class="small" style="font-weight:700;margin-bottom:4px;">${escape(bd.experimentId)} ${bd.best ? `<span class="tag ok tiny">mejor: ${escape(bd.best)}</span>` : ''}</div>
        ${bd.arms
          .map(
            (a) => `
          <div class="row" style="gap:8px;align-items:center;margin:3px 0;">
            <span class="tiny" style="width:120px;">${escape(a.armId)}</span>
            <div style="flex:1;">${bar(a.mean * 100, false)}</div>
            <span class="tiny muted" style="width:90px;text-align:right;">${(a.mean * 100).toFixed(0)}% · ${a.pulls}p</span>
          </div>`,
          )
          .join('')}
      </div>`,
            )
            .join('')
    }
  </div>`;

const renderCache = (c) => `
  <div class="card">
    <div class="row spread"><b>🧠 Caché semántica</b><span class="tag ok tiny">${c.hitRatePct}% hit</span></div>
    <div class="meta" style="margin-top:8px;">
      <span class="tag tiny">${c.entries} entradas</span>
      <span class="tag tiny">${c.hits} hits</span>
      <span class="tag tiny">${c.misses} misses</span>
      <span class="tag accent tiny">${c.hits} llamadas ahorradas</span>
    </div>
    ${c.topReused?.length ? `<div style="margin-top:8px;">${c.topReused.map((t) => `<div class="tiny muted">• [${escape(t.taskType)}] ${escape(t.prompt)} — ${t.hits} reusos</div>`).join('')}</div>` : ''}
  </div>`;

const renderDigest = (d) => {
  const i = d.data?.intel ?? DEFAULTS.digest.data.intel;
  return `
  <div class="card">
    <b>📊 Digest del sistema</b>
    <p class="small" style="margin:8px 0;">${escape(d.resumenEjecutivo ?? '')}</p>
    <div class="meta">
      <span class="tag tiny">misiones ${i.misiones.ok}✓/${i.misiones.parciales}~/${i.misiones.fallidas}✗</span>
      <span class="tag tiny">trazas éxito ${i.trazas.tasaExito}%</span>
      <span class="tag tiny">carruseles ${i.carruseles.publicados} pub/${i.carruseles.retenidos} ret</span>
    </div>
    ${i.riesgos?.length ? `<div style="margin-top:10px;"><div class="small" style="font-weight:700;color:var(--warn);">⚠️ Riesgos / atención</div>${i.riesgos.map((r) => `<div class="tiny muted">• ${escape(r)}</div>`).join('')}</div>` : ''}
    ${d.cosasQueRequierenAtencion?.length ? `<div style="margin-top:8px;">${d.cosasQueRequierenAtencion.map((x) => `<div class="tiny">• ${escape(x)}</div>`).join('')}</div>` : ''}
  </div>`;
};

/* ── Arquitectura del cerebro: visualización de capas + agentes + flujos ── */
const BRAIN_LAYERS = [
  {
    id: 'sensors',
    emoji: '👁️',
    name: 'Sensores',
    desc: 'IG API, Vision, Voz, comentarios, DMs, métricas en tiempo real',
  },
  {
    id: 'memory',
    emoji: '🧠',
    name: 'Memoria',
    desc: 'Brand profile, caché semántica, historial de decisiones, embeddings',
  },
  {
    id: 'reason',
    emoji: '⚖️',
    name: 'Razonamiento',
    desc: 'LLM (Claude/Ollama), bandits Thompson, scoring, descomposición de goals',
  },
  {
    id: 'agents',
    emoji: '🤖',
    name: 'Agentes',
    desc: 'Nova, Lía, Gard, Luca, Mira + 10 especialistas (Algorithm, Meta Ads…)',
  },
  {
    id: 'actuators',
    emoji: '✋',
    name: 'Actuadores',
    desc: 'Computer Use cursor/teclado, IG Graph API, Canva, Upload Post, Meta Ads',
  },
  {
    id: 'governance',
    emoji: '🛡️',
    name: 'Gobernanza',
    desc: 'CUA mode gate, Approval gate, Compliance check, Budget breaker, GlassBox audit',
  },
];

const FLOW_PATHS = [
  { from: 'sensors', to: 'memory', label: 'datos crudos → embeddings' },
  { from: 'memory', to: 'reason', label: 'contexto recuperado' },
  { from: 'reason', to: 'agents', label: 'tarea decompuesta' },
  { from: 'agents', to: 'governance', label: 'acción propuesta' },
  { from: 'governance', to: 'actuators', label: 'OK → ejecutar' },
  { from: 'actuators', to: 'sensors', label: 'feedback loop' },
];

const renderArchitecture = (data) => {
  return `
    <div class="brain-arch">
      <div class="brain-arch-head">
        <h3>🧠 Arquitectura del cerebro</h3>
        <p class="small muted">Las 6 capas del sistema y cómo se comunican entre sí.</p>
      </div>
      <div class="brain-layers">
        ${BRAIN_LAYERS.map(
          (l) => `
          <div class="brain-layer" data-layer="${l.id}">
            <div class="brain-layer-emoji">${l.emoji}</div>
            <div class="brain-layer-content">
              <div class="brain-layer-name">${l.name}</div>
              <div class="brain-layer-desc">${escape(l.desc)}</div>
            </div>
            <span class="brain-layer-pulse"></span>
          </div>`,
        ).join('')}
      </div>
      <div class="brain-flow">
        <h4 style="margin:14px 0 8px;font-size:13px;">⚡ Flujos de información</h4>
        ${FLOW_PATHS.map(
          (f) => `
          <div class="brain-flow-row">
            <span class="brain-flow-from">${BRAIN_LAYERS.find((l) => l.id === f.from).emoji} ${BRAIN_LAYERS.find((l) => l.id === f.from).name}</span>
            <span class="brain-flow-arrow">→</span>
            <span class="brain-flow-label">${escape(f.label)}</span>
            <span class="brain-flow-arrow">→</span>
            <span class="brain-flow-to">${BRAIN_LAYERS.find((l) => l.id === f.to).emoji} ${BRAIN_LAYERS.find((l) => l.id === f.to).name}</span>
          </div>`,
        ).join('')}
      </div>
    </div>`;
};

/* ── Memoria: caché + brand + decisiones ── */
const renderMemoryView = (data) => {
  const c = data.cache ?? DEFAULTS.cache;
  return `
    <div class="brain-mem">
      <h3>🧠 Memoria del sistema</h3>
      <p class="small muted" style="margin:4px 0 14px;">Qué recuerda el cerebro: caché semántica, brand profile, embeddings de tu historial.</p>
      <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;">
        <div class="brain-mem-card">
          <div class="brain-mem-icon">⚡</div>
          <div class="brain-mem-num">${c.entries}</div>
          <div class="brain-mem-lbl">Entradas en caché</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">🎯</div>
          <div class="brain-mem-num">${c.hitRatePct}%</div>
          <div class="brain-mem-lbl">Hit rate (ahorro)</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">💰</div>
          <div class="brain-mem-num">${c.hits}</div>
          <div class="brain-mem-lbl">Llamadas LLM ahorradas</div>
        </div>
        <div class="brain-mem-card">
          <div class="brain-mem-icon">📚</div>
          <div class="brain-mem-num">${(data.digest?.data?.intel?.carruseles?.publicados ?? 0) + (data.digest?.data?.intel?.misiones?.ok ?? 0)}</div>
          <div class="brain-mem-lbl">Producciones aprendidas</div>
        </div>
      </div>
      ${
        c.topReused?.length
          ? `
        <h4 style="margin:18px 0 8px;font-size:13px;">🔁 Top reusos de la memoria</h4>
        <div class="brain-mem-list">
          ${c.topReused
            .map(
              (t) => `
            <div class="brain-mem-row">
              <span class="brain-mem-row-task">${escape(t.taskType)}</span>
              <span class="brain-mem-row-prompt">${escape(String(t.prompt).slice(0, 80))}</span>
              <span class="brain-mem-row-hits">${t.hits}× reusos</span>
            </div>`,
            )
            .join('')}
        </div>`
          : '<div class="tiny muted" style="margin-top:14px;">Sin reusos registrados aún.</div>'
      }
    </div>`;
};

/* ── Razonamiento: bandits + decisiones ── */
const renderReasoning = (data) => {
  const bandits = data.bandits ?? [];
  const i = data.digest?.data?.intel ?? DEFAULTS.digest.data.intel;
  return `
    <div class="brain-reason">
      <h3>⚖️ Razonamiento del sistema</h3>
      <p class="small muted" style="margin:4px 0 14px;">Cómo decide: Thompson Sampling, scoring de contenido, tasas de éxito.</p>
      <div class="brain-reason-stats">
        <div class="brain-reason-stat">
          <div class="num" style="color:var(--ok);">${i.trazas.tasaExito}%</div>
          <div class="lbl">tasa de acierto</div>
        </div>
        <div class="brain-reason-stat">
          <div class="num">${i.misiones.ok}</div>
          <div class="lbl">misiones OK</div>
        </div>
        <div class="brain-reason-stat" style="color:var(--warn);">
          <div class="num">${i.misiones.parciales}</div>
          <div class="lbl">parciales</div>
        </div>
        <div class="brain-reason-stat" style="color:var(--crit);">
          <div class="num">${i.misiones.fallidas}</div>
          <div class="lbl">fallidas</div>
        </div>
      </div>
      ${
        bandits.length
          ? `
        <h4 style="margin:18px 0 8px;font-size:13px;">🎰 Experimentos activos (bandits Thompson)</h4>
        ${bandits
          .map(
            (bd) => `
          <div class="brain-bandit">
            <div class="brain-bandit-head">
              <strong>${escape(bd.experimentId)}</strong>
              ${bd.best ? `<span class="tag ok tiny">mejor: ${escape(bd.best)}</span>` : ''}
            </div>
            ${bd.arms
              .map(
                (a) => `
              <div class="brain-bandit-arm">
                <span class="arm-id">${escape(a.armId)}</span>
                <div class="arm-bar"><div class="arm-fill" style="width:${(a.mean * 100).toFixed(0)}%;"></div></div>
                <span class="arm-num">${(a.mean * 100).toFixed(0)}% · ${a.pulls}p</span>
              </div>`,
              )
              .join('')}
          </div>`,
          )
          .join('')}
        `
          : '<div class="tiny muted" style="margin-top:14px;">Sin experimentos activos todavía. El sistema empieza a aprender cuando recibe outcomes.</div>'
      }
    </div>`;
};

const TABS = [
  { id: 'consumption', emoji: '⚡', label: 'Consumo' },
  { id: 'architecture', emoji: '🧠', label: 'Arquitectura' },
  { id: 'memory', emoji: '📚', label: 'Memoria' },
  { id: 'reasoning', emoji: '⚖️', label: 'Razonamiento' },
];

let activeTab = 'consumption';

const renderTabContent = (data) => {
  if (activeTab === 'consumption')
    return `
    <div class="grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;">
      ${renderBudget(data.budget ?? DEFAULTS.budget)}
      ${renderCache(data.cache ?? DEFAULTS.cache)}
      ${renderBandits(data.bandits ?? DEFAULTS.bandits)}
      ${renderDigest(data.digest ?? DEFAULTS.digest)}
    </div>`;
  if (activeTab === 'architecture') return renderArchitecture(data);
  if (activeTab === 'memory') return renderMemoryView(data);
  if (activeTab === 'reasoning') return renderReasoning(data);
  return '';
};

const paint = (root, data, offline) => {
  const host = root.querySelector('#intel-body');
  if (!host) return;
  host.innerHTML = `
    ${
      offline
        ? `<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
      <span class="small">📡 Backend offline · mostrando valores por defecto. Reconectá para ver datos en vivo.</span>
    </div>`
        : ''
    }
    <div class="brain-tabs">
      ${TABS.map((t) => `<button class="brain-tab ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${t.emoji} ${t.label}</button>`).join('')}
    </div>
    <div id="brain-body">${renderTabContent(data)}</div>

    <style>
      .brain-tabs{display:flex;gap:4px;padding:4px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;overflow-x:auto;}
      .brain-tab{flex-shrink:0;padding:8px 14px;border-radius:7px;border:0;background:transparent;color:var(--text-muted,#9CA3AF);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s;}
      .brain-tab:hover{background:rgba(255,255,255,.04);color:var(--fg,#fff);}
      .brain-tab.active{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;}

      .brain-arch-head h3{margin:0 0 4px;}
      .brain-layers{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:18px;}
      .brain-layer{position:relative;display:flex;gap:14px;align-items:center;padding:14px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;overflow:hidden;}
      .brain-layer::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#6366f1,#a855f7);}
      .brain-layer-emoji{font-size:30px;line-height:1;flex-shrink:0;}
      .brain-layer-name{font-weight:700;font-size:14px;}
      .brain-layer-desc{font-size:12px;color:var(--text-muted,#9CA3AF);line-height:1.45;margin-top:2px;}
      .brain-layer-pulse{position:absolute;top:10px;right:10px;width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 8px rgba(16,185,129,.7);animation:brainPulse 2s ease-in-out infinite;}
      @keyframes brainPulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(.85);}}

      .brain-flow{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;}
      .brain-flow-row{display:flex;gap:8px;align-items:center;padding:6px 0;font-size:12.5px;flex-wrap:wrap;}
      .brain-flow-from,.brain-flow-to{padding:3px 9px;border-radius:6px;background:rgba(168,85,247,.12);font-weight:600;}
      .brain-flow-arrow{color:var(--text-muted,#9CA3AF);}
      .brain-flow-label{color:var(--text-muted,#9CA3AF);font-style:italic;font-size:11.5px;}

      .brain-mem h3{margin:0 0 4px;}
      .brain-mem-card{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
      .brain-mem-icon{font-size:24px;margin-bottom:6px;}
      .brain-mem-num{font-size:24px;font-weight:800;}
      .brain-mem-lbl{font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:4px;}
      .brain-mem-list{display:flex;flex-direction:column;gap:4px;}
      .brain-mem-row{display:flex;gap:10px;align-items:center;padding:8px 12px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:8px;font-size:12px;}
      .brain-mem-row-task{font-weight:700;color:#a855f7;flex-shrink:0;}
      .brain-mem-row-prompt{flex:1;color:var(--text-muted,#9CA3AF);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .brain-mem-row-hits{font-size:11px;color:var(--ok);flex-shrink:0;font-weight:600;}

      .brain-reason h3{margin:0 0 4px;}
      .brain-reason-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}
      .brain-reason-stat{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:14px;text-align:center;}
      .brain-reason-stat .num{font-size:28px;font-weight:800;line-height:1.1;}
      .brain-reason-stat .lbl{font-size:11px;color:var(--text-muted,#9CA3AF);margin-top:4px;}

      .brain-bandit{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:8px;}
      .brain-bandit-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:13px;}
      .brain-bandit-arm{display:flex;gap:8px;align-items:center;margin:4px 0;font-size:11.5px;}
      .arm-id{width:110px;flex-shrink:0;font-family:monospace;}
      .arm-bar{flex:1;height:8px;background:rgba(255,255,255,.06);border-radius:4px;overflow:hidden;}
      .arm-fill{height:100%;background:linear-gradient(90deg,#10b981,#22d3ee);}
      .arm-num{width:80px;text-align:right;color:var(--text-muted,#9CA3AF);}
    </style>
  `;

  // Wire tabs
  host.querySelectorAll('.brain-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      activeTab = tab.dataset.tab;
      host.querySelectorAll('.brain-tab').forEach((t) => t.classList.toggle('active', t === tab));
      const body = host.querySelector('#brain-body');
      if (body) body.innerHTML = renderTabContent(data);
    });
  });
};

export const renderIntelligence = async (root) => {
  stop();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">⚡ Medidor de Consumo de IA</h1>
        <p class="view-subtitle page-subtitle">Cuánto consume tu sistema · presupuesto de tokens · aprendizaje (bandits) · caché semántica · digest — en vivo.</p>
      </div>
    </header>
    <div id="intel-body" class="page-body">${loadingScreen()}</div>`;

  const tick = async () => {
    const { data, error } = await apiSafe('/api/intelligence', DEFAULTS);
    paint(root, data ?? DEFAULTS, !!error);
  };
  await tick();
  timer = setInterval(tick, 5000);
};
