/* ══════════════════════════════════════════════════════════════════════════════
   CANVA RUNNER — Pipeline visual Canva → Instagram (Computer Use Agent)
   ──────────────────────────────────────────────────────────────────────────────
   Diseño humanizado: muestra el equipo IA detrás (Nova, Lía, Gard, Luca),
   capabilities en vivo, formulario claro y resultado con timeline.
   Render-first + apiSafe (no rompe sin backend).
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { launchCanvaBrain } from '../lib/canvaBrain.js';

const AGENTS = [
  { emoji: '🎨', name: 'Nova', role: 'Diseñadora', task: 'crea el visual en Canva' },
  { emoji: '✍️', name: 'Lía', role: 'Copywriter', task: 'escribe el caption con voz de marca' },
  { emoji: '🛡️', name: 'Gard', role: 'Compliance', task: 'valida tono, hashtags y riesgo' },
  { emoji: '🚀', name: 'Luca', role: 'Publisher', task: 'sube el post a Instagram' },
  { emoji: '📈', name: 'Mira', role: 'Boost & métrica', task: 'programa el boost y mide retención' },
];

const PIPELINE_STEPS = [
  { key: 'design', emoji: '🎨', label: 'Diseño en Canva' },
  { key: 'caption', emoji: '✍️', label: 'Caption + tono' },
  { key: 'publish', emoji: '📷', label: 'Publicación IG' },
  { key: 'boost', emoji: '⚡', label: 'Boost programado' },
];

const renderAgentsStrip = () => `
  <div class="canva-agents">
    ${AGENTS.map(
      (a) => `
      <div class="canva-agent">
        <div class="canva-agent-emoji">${a.emoji}</div>
        <div class="canva-agent-name">${escape(a.name)}</div>
        <div class="canva-agent-role">${escape(a.role)}</div>
        <div class="canva-agent-task">${escape(a.task)}</div>
      </div>`,
    ).join('')}
  </div>`;

const renderCapabilityRow = (status) => {
  if (!status) {
    return `<div class="canva-status-offline">
      📡 <strong>Backend offline</strong> — el pipeline no puede ejecutarse hasta reconectar.
      Igual podés usar el formulario y se enviará cuando vuelva.
    </div>`;
  }
  const caps = status.capabilitiesAvailable ?? {};
  const enabled = Object.entries(caps)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const disabled = Object.entries(caps)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  const dry = status.dryRun === true;
  return `
    <div class="canva-status">
      <div class="canva-status-row">
        <span class="tag ${dry ? 'warn' : 'ok'} tiny">${dry ? '⚠️ DRY RUN' : '🟢 Live'}</span>
        <span class="tag ok tiny">${enabled.length} capabilities activas</span>
        ${disabled.length ? `<span class="tag muted tiny">${disabled.length} desactivadas</span>` : ''}
      </div>
      <div class="canva-caps-grid">
        ${enabled.map((c) => `<span class="canva-cap on">✓ ${escape(c)}</span>`).join('')}
        ${disabled.map((c) => `<span class="canva-cap off">✗ ${escape(c)}</span>`).join('')}
      </div>
    </div>`;
};

const renderPipelineTimeline = (r) => {
  const steps = [
    { ok: r.designStep?.ok, info: r.designStep?.filePath ?? '—' },
    {
      ok: !!r.captionGeneration?.caption,
      info: r.captionGeneration?.toneScore != null ? `tono ${r.captionGeneration.toneScore}/100` : '—',
    },
    { ok: r.publishStep?.ok, info: r.publishStep?.postUrl ?? '—' },
    { ok: r.boostScheduled, info: r.boostScheduled ? 'programado' : '—' },
  ];
  return `
    <div class="canva-timeline">
      ${PIPELINE_STEPS.map(
        (s, i) => `
        <div class="canva-step ${steps[i].ok ? 'done' : 'fail'}">
          <div class="canva-step-emoji">${s.emoji}</div>
          <div class="canva-step-label">${escape(s.label)}</div>
          <div class="canva-step-state">${steps[i].ok ? '✓' : '✗'}</div>
          <div class="canva-step-info">${escape(String(steps[i].info)).slice(0, 80)}</div>
        </div>
        ${i < PIPELINE_STEPS.length - 1 ? '<div class="canva-step-arrow">→</div>' : ''}
      `,
      ).join('')}
    </div>`;
};

export const renderCanvaRunner = async (container) => {
  container.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🎨 Canva → Instagram</h1>
        <p class="view-subtitle page-subtitle">Pipeline end-to-end. El cursor diseña, escribe, valida y publica solo. Vos mirás.</p>
      </div>
    </header>

    <div class="page-body">
      <!-- Hero: capabilities + acciones rápidas -->
      <div class="canva-hero">
        <div id="cu-status" class="canva-hero-status">
          <div class="canva-status-loading">Cargando estado del agente…</div>
        </div>
        <div class="canva-hero-actions">
          <button class="btn ghost" id="open-canva">📐 Abrir Canva</button>
          <button class="btn ghost" id="open-ig">📷 Abrir Instagram</button>
          <a class="btn ghost" href="#pantalla">👀 Pantalla en vivo</a>
        </div>
      </div>

      <!-- Equipo IA que opera el pipeline -->
      <div class="canva-section">
        <h3 class="canva-section-title">Tu equipo IA en este pipeline</h3>
        <p class="small muted" style="margin:0 0 12px;">No es un script: es Nova diseñando, Lía escribiendo, Gard validando, Luca publicando. Cada uno reporta lo que hace.</p>
        ${renderAgentsStrip()}
      </div>

      <!-- Form pipeline -->
      <div class="canva-grid-2">
        <div class="card canva-form">
          <h3>📝 Nueva pieza</h3>
          <label class="form-label">Tema del post</label>
          <input id="topic" class="input" placeholder="Disciplina, hábitos, marketing IA…">

          <div class="canva-form-row">
            <div>
              <label class="form-label">Intent</label>
              <select id="intent" class="input">
                <option value="educar">Educar</option>
                <option value="inspirar">Inspirar</option>
                <option value="vender">Vender</option>
                <option value="entretener">Entretener</option>
                <option value="reflexionar">Reflexionar</option>
              </select>
            </div>
            <div>
              <label class="form-label">Formato</label>
              <select id="postType" class="input">
                <option value="feed-post">📸 Feed post</option>
                <option value="reel">🎬 Reel</option>
                <option value="story">📲 Story</option>
                <option value="carousel">🃏 Carrusel</option>
              </select>
            </div>
          </div>

          <label class="form-label" style="margin-top:12px;">Método de publicación</label>
          <select id="publishMethod" class="input">
            <option value="upload-post-api">⚡ Upload-Post API (rápido · device puede estar off)</option>
            <option value="computer-use">🖱️ Computer Use (cursor visible · más confiable)</option>
            <option value="preview-only">👁️ Solo preview (no publica)</option>
          </select>

          <label class="form-label canva-form-check" style="margin-top:12px;">
            <input type="checkbox" id="generateCaption" checked>
            <span>Lía escribe el caption automáticamente</span>
          </label>

          <button class="btn primary" id="run-pipeline" style="margin-top:16px;width:100%;font-size:15px;padding:12px;">
            ▶ Lanzar pipeline completo
          </button>
          <div class="small muted" style="margin-top:8px;text-align:center;">
            Toma 2–5 min · seguilo en vivo en <a href="#pantalla" class="accent">Pantalla en vivo</a>
          </div>
        </div>

        <div class="card canva-tips">
          <h3>💡 Cómo funciona</h3>
          <ol class="canva-tips-list">
            <li><strong>Nova</strong> abre Canva y arma el diseño con tu marca cargada.</li>
            <li><strong>Lía</strong> escribe el caption respetando voz, intent y hashtags.</li>
            <li><strong>Gard</strong> valida tono, riesgo y compliance antes de subir.</li>
            <li><strong>Luca</strong> publica vía API o vía cursor (según método).</li>
            <li><strong>Mira</strong> programa boost si corresponde y mide retención.</li>
          </ol>
          <div class="canva-tip-cta">
            <strong>Modo Asistente activado?</strong>
            <p class="small muted">Cada paso importante te va a pedir aprobación. Frenalo cuando quieras desde el botón "🛑 Frenar al agente" del topbar.</p>
          </div>
        </div>
      </div>

      <div id="result" class="canva-result"></div>
    </div>

    <style>
      .canva-hero{display:grid;grid-template-columns:1fr auto;gap:14px;align-items:start;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(99,102,241,.08),rgba(168,85,247,.05));border:1px solid var(--border);margin-bottom:18px;}
      .canva-hero-actions{display:flex;flex-direction:column;gap:6px;flex-shrink:0;}
      .canva-status-loading{padding:8px 0;color:var(--text-muted,#9CA3AF);font-size:13px;}
      .canva-status-offline{color:#fbbf24;font-size:13px;line-height:1.5;}
      .canva-status-row{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;}
      .canva-caps-grid{display:flex;gap:6px;flex-wrap:wrap;}
      .canva-cap{font-size:11px;padding:3px 8px;border-radius:6px;border:1px solid var(--border);}
      .canva-cap.on{color:#4ade80;border-color:rgba(74,222,128,.4);background:rgba(74,222,128,.08);}
      .canva-cap.off{color:#9CA3AF;opacity:.55;text-decoration:line-through;}

      .canva-section{margin-bottom:22px;}
      .canva-section-title{font-size:15px;margin:0 0 6px;}
      .canva-agents{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
      .canva-agent{background:var(--surface,#141418);border:1px solid var(--border);border-radius:12px;padding:12px;text-align:center;}
      .canva-agent-emoji{font-size:30px;line-height:1;margin-bottom:6px;}
      .canva-agent-name{font-weight:800;font-size:14px;}
      .canva-agent-role{font-size:11px;color:var(--text-muted,#9CA3AF);}
      .canva-agent-task{font-size:11px;margin-top:6px;opacity:.85;line-height:1.4;}

      .canva-grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px;}
      .canva-form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;}
      .canva-form-check{display:flex;align-items:center;gap:8px;cursor:pointer;}
      .canva-form-check input{margin:0;}
      .canva-tips-list{margin:8px 0 0;padding-left:20px;font-size:13px;line-height:1.7;}
      .canva-tips-list li{margin-bottom:4px;}
      .canva-tip-cta{margin-top:14px;padding:10px 12px;border-radius:10px;background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.3);}

      .canva-result{margin-top:14px;}
      .canva-timeline{display:flex;align-items:stretch;gap:6px;flex-wrap:wrap;}
      .canva-step{flex:1;min-width:140px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;padding:10px;text-align:center;}
      .canva-step.done{border-color:rgba(74,222,128,.5);background:rgba(74,222,128,.05);}
      .canva-step.fail{border-color:rgba(239,68,68,.35);opacity:.7;}
      .canva-step-emoji{font-size:22px;}
      .canva-step-label{font-size:12px;font-weight:700;margin-top:4px;}
      .canva-step-state{font-size:18px;margin-top:2px;}
      .canva-step.done .canva-step-state{color:#4ade80;}
      .canva-step.fail .canva-step-state{color:#ef4444;}
      .canva-step-info{font-size:10px;color:var(--text-muted,#9CA3AF);margin-top:4px;word-break:break-word;}
      .canva-step-arrow{display:flex;align-items:center;color:var(--text-muted,#9CA3AF);}

      @media (max-width: 900px){
        .canva-hero{grid-template-columns:1fr;}
        .canva-hero-actions{flex-direction:row;flex-wrap:wrap;}
        .canva-grid-2{grid-template-columns:1fr;}
        .canva-form-row{grid-template-columns:1fr;}
      }
    </style>
  `;

  const { data: status, error: statusErr } = await apiSafe('/api/cu/desktop-status', null);
  document.getElementById('cu-status').innerHTML = renderCapabilityRow(statusErr ? null : status);

  document.getElementById('run-pipeline').addEventListener('click', async () => {
    const topic = document.getElementById('topic').value.trim();
    if (!topic) {
      toast('Falta el tema del post', 'error');
      return;
    }

    // Lanzar el Cerebro Computer Use (modal in-app con equipo visible)
    await launchCanvaBrain({
      topic,
      format: document.getElementById('postType').value,
      contentPayload: {
        designIntent: document.getElementById('intent').value,
        publishMethod: document.getElementById('publishMethod').value,
        generateCaption: document.getElementById('generateCaption').checked,
      },
    });

    // Backend pipeline call (best-effort) para historial
    const body = {
      topic,
      designIntent: document.getElementById('intent').value,
      postType: document.getElementById('postType').value,
      publishMethod: 'computer-use',
      generateCaption: document.getElementById('generateCaption').checked,
    };
    const { data: r, error: pipeErr } = await apiSafe('/api/cu/canva/to-instagram', null, { method: 'POST', body });
    if (pipeErr || !r) {
      const resultEl = document.getElementById('result');
      resultEl.innerHTML = `<div class="card"><div class="small muted">📡 Backend offline · pipeline corrió en modo simulación. Conectá el server para historial real.</div></div>`;
      return;
    }
    const resultEl = document.getElementById('result');
    resultEl.innerHTML = `
      <div class="card">
        <div class="row spread" style="margin-bottom:10px;">
          <h3 style="margin:0;">${r.ok ? '✅ Pipeline completado' : '⚠️ Pipeline parcial'}</h3>
          <span class="small muted">replay <code>${escape(r.replayId ?? '—')}</code></span>
        </div>
        ${renderPipelineTimeline(r)}
        ${
          r.captionGeneration?.caption
            ? `
          <div style="margin-top:14px;padding:12px;background:var(--bg-elev,#1c1c22);border-radius:10px;">
            <div class="small muted" style="margin-bottom:4px;">Caption generado por Lía</div>
            <div class="body" style="white-space:pre-wrap;">${escape(r.captionGeneration.caption)}</div>
          </div>`
            : ''
        }
        <div class="btn-row" style="margin-top:14px;gap:8px;">
          ${r.publishStep?.postUrl ? `<a class="btn primary" href="${escape(r.publishStep.postUrl)}" target="_blank" rel="noopener">Ver post →</a>` : ''}
          <a class="btn ghost" href="#replay">📜 Replay completo</a>
          <a class="btn ghost" href="#pantalla">👀 Pantalla en vivo</a>
        </div>
      </div>`;
    toast(r.ok ? 'Pipeline completado 🎉' : 'Pipeline parcial', r.ok ? 'success' : 'warn');
  });

  document.getElementById('open-canva').addEventListener('click', async () => {
    const { error } = await apiSafe('/api/cu/canva/open', null, { method: 'POST', body: {} });
    if (error) {
      toast('Backend offline. No se puede abrir Canva.', 'error');
      return;
    }
    toast('Canva abierto en navegador', 'success');
  });
  document.getElementById('open-ig').addEventListener('click', async () => {
    const { error } = await apiSafe('/api/cu/apps/launch', null, {
      method: 'POST',
      body: { app: 'chrome', url: 'https://instagram.com' },
    });
    if (error) {
      toast('Backend offline.', 'error');
      return;
    }
    toast('Instagram abierto', 'success');
  });
};
