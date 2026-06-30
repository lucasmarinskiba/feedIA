/* ══════════════════════════════════════════════════════════════════════════════
   VISIÓN IA — Computer Vision integrado con Computer Use
   ──────────────────────────────────────────────────────────────────────────────
   4 modos de visión:
   1. Analizar    → interpreta cualquier screenshot (estado de pantalla)
   2. Spy          → análisis profundo de perfil competidor
   3. Extraer      → extrae métricas numéricas de capturas IG/TT
   4. Loop         → ciclo see→decide→actuar multi-step con historial
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { withBtnSpinner } from '../lib/ui.js';

let _activeTab = 'analyze';
let _root = null;
let _status = null;

const $ = (sel, ctx = _root) => ctx?.querySelector(sel);
const $$ = (sel, ctx = _root) => [...(ctx?.querySelectorAll(sel) || [])];

const fileToDataUrl = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });

const filesToDataUrls = async (files) => {
  const arr = Array.from(files || []).slice(0, 8);
  return Promise.all(arr.map(fileToDataUrl));
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.vis-wrap { display:flex;flex-direction:column;gap:0;height:100%;overflow:hidden }
.vis-header { padding:24px 28px 0;flex-shrink:0 }
.vis-title { font-size:22px;font-weight:800;color:var(--text);margin:0 0 4px }
.vis-sub { font-size:13px;color:var(--text-muted);margin:0 0 20px }
.vis-badge { display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px }
.vis-badge.ok { background:rgba(16,185,129,.15);color:#10b981 }
.vis-badge.err { background:rgba(239,68,68,.12);color:#ef4444 }
.vis-tabs { display:flex;gap:4px;padding:0 28px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto }
.vis-tab { padding:10px 16px;font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s }
.vis-tab.active { color:var(--accent);border-bottom-color:var(--accent) }
.vis-tab:hover:not(.active) { color:var(--text) }
.vis-body { flex:1;overflow-y:auto;padding:24px 28px }
.vis-panel { display:none }
.vis-panel.active { display:flex;flex-direction:column;gap:20px }
.vis-card { background:var(--surface2);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px }
.vis-label { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted) }
.vis-input { width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:14px;outline:none;box-sizing:border-box }
.vis-input:focus { border-color:var(--accent) }
.vis-select { width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:14px;outline:none;appearance:none }
.vis-btn { display:inline-flex;align-items:center;gap:8px;padding:11px 22px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:all .15s }
.vis-btn.primary { background:var(--accent);color:#fff }
.vis-btn.primary:hover { filter:brightness(1.1) }
.vis-btn.secondary { background:var(--surface);border:1px solid var(--border);color:var(--text) }
.vis-btn.secondary:hover { background:var(--surface2) }
.vis-drop { border:2px dashed var(--border);border-radius:14px;padding:32px;text-align:center;cursor:pointer;transition:all .2s;color:var(--text-muted) }
.vis-drop:hover,.vis-drop.drag { border-color:var(--accent);background:rgba(99,102,241,.06) }
.vis-drop .vis-drop-icon { font-size:36px;margin-bottom:8px }
.vis-drop p { margin:4px 0;font-size:13px }
.vis-drop strong { color:var(--text);font-weight:700 }
.vis-previews { display:flex;flex-wrap:wrap;gap:10px }
.vis-preview-thumb { position:relative;width:80px;height:80px;border-radius:10px;overflow:hidden;border:2px solid var(--border) }
.vis-preview-thumb img { width:100%;height:100%;object-fit:cover }
.vis-preview-thumb .rm { position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:rgba(0,0,0,.7);color:#fff;border:none;font-size:10px;cursor:pointer;display:flex;align-items:center;justify-content:center }
.vis-result { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px }
.vis-result-title { font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--accent);margin-bottom:10px }
.vis-json { font-family:monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all;color:var(--text);max-height:500px;overflow-y:auto }
.vis-grid { display:grid;grid-template-columns:1fr 1fr;gap:14px }
.vis-stat { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px }
.vis-stat-label { font-size:11px;color:var(--text-muted);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px }
.vis-stat-val { font-size:20px;font-weight:800;color:var(--text) }
.vis-chip { display:inline-block;background:var(--surface2);border:1px solid var(--border);border-radius:20px;padding:3px 10px;font-size:12px;margin:2px }
.vis-chip.green { background:rgba(16,185,129,.12);border-color:#10b981;color:#10b981 }
.vis-chip.red { background:rgba(239,68,68,.1);border-color:#ef4444;color:#ef4444 }
.vis-chip.yellow { background:rgba(234,179,8,.1);border-color:#eab308;color:#eab308 }
.vis-section { margin-top:10px }
.vis-section h4 { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--text-muted);margin:0 0 8px }
.vis-list { list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:4px }
.vis-list li { font-size:13px;color:var(--text);padding:6px 10px;background:var(--surface2);border-radius:8px }
.vis-history { display:flex;flex-direction:column;gap:12px }
.vis-step { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:14px }
.vis-step-num { font-size:11px;font-weight:700;color:var(--accent);margin-bottom:6px }
.vis-step-obs { font-size:12px;color:var(--text-muted);margin-bottom:6px }
.vis-step-action { background:var(--surface2);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text) }
.vis-instruction { background:rgba(99,102,241,.1);border:1px solid var(--accent);border-radius:12px;padding:16px;font-size:14px;color:var(--text) }
.vis-instruction strong { color:var(--accent) }
@media(max-width:600px){.vis-grid{grid-template-columns:1fr}}
`;

// ── Drop zone helper ─────────────────────────────────────────────────────────
const makeDropZone = (el, onFiles) => {
  el.addEventListener('click', () => {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = 'image/*';
    inp.multiple = true;
    inp.onchange = () => onFiles(inp.files);
    inp.click();
  });
  el.addEventListener('dragover', (e) => { e.preventDefault(); el.classList.add('drag'); });
  el.addEventListener('dragleave', () => el.classList.remove('drag'));
  el.addEventListener('drop', (e) => { e.preventDefault(); el.classList.remove('drag'); onFiles(e.dataTransfer.files); });
};

// ── Preview thumbnails strip ─────────────────────────────────────────────────
const renderPreviews = (container, dataUrls, onRemove) => {
  container.innerHTML = '';
  dataUrls.forEach((url, i) => {
    const wrap = document.createElement('div');
    wrap.className = 'vis-preview-thumb';
    wrap.innerHTML = `<img src="${url}" alt="img ${i + 1}"><button class="rm" title="Quitar">×</button>`;
    wrap.querySelector('.rm').onclick = () => onRemove(i);
    container.appendChild(wrap);
  });
};

// ── Tab 1: Analizar screenshot ─────────────────────────────────────────────
const panelAnalyze = () => `
<div class="vis-card">
  <div class="vis-label">Captura a analizar</div>
  <div class="vis-drop" id="an-drop">
    <div class="vis-drop-icon">🖥️</div>
    <p><strong>Arrastrá o hacé clic</strong> para subir captura de pantalla</p>
    <p>IG · TikTok · Canva · cualquier herramienta</p>
  </div>
  <div class="vis-previews" id="an-previews"></div>
</div>
<div class="vis-card">
  <div class="vis-label">Contexto (opcional)</div>
  <input class="vis-input" id="an-goal" placeholder="Ej: Verificar si el post se publicó correctamente">
  <div style="display:flex;gap:10px">
    <select class="vis-select" id="an-platform" style="flex:1">
      <option value="auto">Plataforma automática</option>
      <option value="instagram">Instagram</option>
      <option value="tiktok">TikTok</option>
      <option value="canva">Canva</option>
      <option value="capcut">CapCut</option>
      <option value="chrome">Chrome / Web</option>
      <option value="other">Otra</option>
    </select>
  </div>
  <button class="vis-btn primary" id="an-btn">🔍 Analizar pantalla</button>
</div>
<div id="an-result"></div>`;

const renderAnalysisResult = (data, container) => {
  if (data.error) { container.innerHTML = `<div class="vis-result"><div class="vis-result-title">Error</div><pre class="vis-json">${JSON.stringify(data, null, 2)}</pre></div>`; return; }

  const elements = (data.elements_visible || []).map((e) => `<span class="vis-chip">${e}</span>`).join('');
  const texts = (data.text_visible || []).map((t) => `<li>${t}</li>`).join('');
  const actions = (data.actionable_next || []).map((a) => `<li>${a}</li>`).join('');
  const metrics = data.metrics ? Object.entries(data.metrics).filter(([, v]) => v).map(([k, v]) => `<div class="vis-stat"><div class="vis-stat-label">${k}</div><div class="vis-stat-val">${v}</div></div>`).join('') : '';

  container.innerHTML = `
<div class="vis-result">
  <div class="vis-result-title">📊 Análisis de pantalla</div>
  <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <span class="vis-chip green">${data.platform || '?'}</span>
    <span class="vis-chip yellow">${data.screen || '?'}</span>
    <span class="vis-chip">Progreso goal: ${data.goal_progress ?? 0}%</span>
  </div>
  <div class="vis-section"><h4>Estado actual</h4><p style="font-size:14px;color:var(--text)">${data.state || '—'}</p></div>
  ${elements ? `<div class="vis-section"><h4>Elementos visibles</h4>${elements}</div>` : ''}
  ${texts ? `<div class="vis-section"><h4>Texto en pantalla</h4><ul class="vis-list">${texts}</ul></div>` : ''}
  ${metrics ? `<div class="vis-section"><h4>Métricas detectadas</h4><div class="vis-grid">${metrics}</div></div>` : ''}
  ${actions ? `<div class="vis-section"><h4>Acciones posibles</h4><ul class="vis-list">${actions}</ul></div>` : ''}
</div>`;
};

const setupAnalyze = () => {
  const imgs = [];
  const drop = $('#an-drop');
  const previews = $('#an-previews');
  const result = $('#an-result');
  const btn = $('#an-btn');

  const refresh = () => renderPreviews(previews, imgs, (i) => { imgs.splice(i, 1); refresh(); });

  makeDropZone(drop, async (files) => {
    const urls = await filesToDataUrls(files);
    imgs.push(...urls.slice(0, 8 - imgs.length));
    refresh();
  });

  withBtnSpinner(btn, async () => {
    if (!imgs.length) { toast('Subí al menos 1 captura.', 'warn'); return; }
    result.innerHTML = '';
    const data = await api('/api/vision/analyze', 'POST', {
      imageUrl: imgs[0],
      goal: $('#an-goal')?.value || '',
      platform: $('#an-platform')?.value || 'auto',
    });
    renderAnalysisResult(data, result);
  });
};

// ── Tab 2: Spy competidor ─────────────────────────────────────────────────
const panelSpy = () => `
<div class="vis-card">
  <div class="vis-label">Capturas del competidor (hasta 8)</div>
  <div class="vis-drop" id="spy-drop">
    <div class="vis-drop-icon">🕵️</div>
    <p><strong>Arrastrá</strong> perfil, feed, posts, reels — todo suma</p>
    <p>Más capturas = análisis más profundo</p>
  </div>
  <div class="vis-previews" id="spy-previews"></div>
</div>
<div class="vis-card">
  <div class="vis-label">Nicho del competidor</div>
  <input class="vis-input" id="spy-niche" placeholder="Ej: fitness, emprendimiento, moda sostenible">
  <button class="vis-btn primary" id="spy-btn">🕵️ Analizar competidor</button>
</div>
<div id="spy-result"></div>`;

const renderSpyResult = (data, container) => {
  if (data.error) { container.innerHTML = `<div class="vis-result"><pre class="vis-json">${JSON.stringify(data, null, 2)}</pre></div>`; return; }

  const p = data.profile || {};
  const vi = data.visual_identity || {};
  const cs = data.content_strategy || {};
  const ms = data.metrics_snapshot || {};
  const replicate = (data.what_to_replicate || []);
  const avoid = (data.what_to_avoid || []);

  const threatClass = { low: 'green', medium: 'yellow', high: 'red' }[data.threat_level] || 'yellow';

  container.innerHTML = `
<div class="vis-result">
  <div class="vis-result-title">🕵️ Análisis de competidor</div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
    ${p.username ? `<span class="vis-chip green">@${p.username}</span>` : ''}
    ${p.verified ? '<span class="vis-chip green">✓ Verificado</span>' : ''}
    <span class="vis-chip ${threatClass}">Amenaza: ${data.threat_level || '?'}</span>
    <span style="font-size:12px;color:var(--text-muted)">${data.imagesAnalyzed || 1} captura(s)</span>
  </div>

  ${p.followers || ms.est_engagement_rate ? `
  <div class="vis-section"><h4>Métricas</h4><div class="vis-grid">
    ${p.followers ? `<div class="vis-stat"><div class="vis-stat-label">Seguidores</div><div class="vis-stat-val">${p.followers}</div></div>` : ''}
    ${p.following ? `<div class="vis-stat"><div class="vis-stat-label">Siguiendo</div><div class="vis-stat-val">${p.following}</div></div>` : ''}
    ${ms.est_engagement_rate ? `<div class="vis-stat"><div class="vis-stat-label">Engagement est.</div><div class="vis-stat-val">${ms.est_engagement_rate}</div></div>` : ''}
    ${p.posts_count ? `<div class="vis-stat"><div class="vis-stat-label">Posts</div><div class="vis-stat-val">${p.posts_count}</div></div>` : ''}
  </div></div>` : ''}

  ${data.summary ? `<div class="vis-section"><h4>Resumen ejecutivo</h4><p style="font-size:14px;color:var(--text);line-height:1.5">${data.summary}</p></div>` : ''}

  ${vi.style ? `<div class="vis-section"><h4>Identidad visual</h4>
    <p style="font-size:13px;color:var(--text)">${vi.style}</p>
    <div style="margin-top:6px">${(vi.dominant_colors || []).map((c) => `<span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:${c};margin-right:4px;vertical-align:middle;border:1px solid var(--border)" title="${c}"></span>`).join('')}</div>
    ${vi.consistency_score ? `<p style="font-size:12px;color:var(--text-muted);margin-top:4px">Consistencia visual: <strong>${vi.consistency_score}/100</strong></p>` : ''}
  </div>` : ''}

  ${cs.hook_patterns?.length ? `<div class="vis-section"><h4>Patrones de hook</h4>${cs.hook_patterns.map((h) => `<span class="vis-chip">${h}</span>`).join('')}</div>` : ''}

  ${data.gap_opportunity ? `<div class="vis-section"><h4>🎯 Tu oportunidad de brecha</h4><p style="font-size:14px;color:var(--text);background:rgba(99,102,241,.08);padding:12px;border-radius:10px;line-height:1.5">${data.gap_opportunity}</p></div>` : ''}

  ${replicate.length ? `<div class="vis-section"><h4>✅ Qué replicar</h4><ul class="vis-list">${replicate.map((r) => `<li><strong>${r.tactic}</strong> — ${r.how} <span class="vis-chip ${r.impact === 'high' ? 'green' : 'yellow'}">${r.impact} impact</span></li>`).join('')}</ul></div>` : ''}

  ${avoid.length ? `<div class="vis-section"><h4>❌ Qué evitar</h4><ul class="vis-list">${avoid.map((a) => `<li>${a}</li>`).join('')}</ul></div>` : ''}
</div>`;
};

const setupSpy = () => {
  const imgs = [];
  const drop = $('#spy-drop');
  const previews = $('#spy-previews');
  const result = $('#spy-result');
  const btn = $('#spy-btn');
  const refresh = () => renderPreviews(previews, imgs, (i) => { imgs.splice(i, 1); refresh(); });

  makeDropZone(drop, async (files) => {
    const urls = await filesToDataUrls(files);
    imgs.push(...urls.slice(0, 8 - imgs.length));
    refresh();
  });

  withBtnSpinner(btn, async () => {
    if (!imgs.length) { toast('Subí capturas del competidor.', 'warn'); return; }
    result.innerHTML = '';
    const data = await api('/api/vision/profile', 'POST', {
      images: imgs,
      niche: $('#spy-niche')?.value || 'general',
    });
    renderSpyResult(data, result);
  });
};

// ── Tab 3: Extraer métricas ─────────────────────────────────────────────────
const panelExtract = () => `
<div class="vis-card">
  <div class="vis-label">Captura de la que extraer datos</div>
  <div class="vis-drop" id="ext-drop">
    <div class="vis-drop-icon">📊</div>
    <p><strong>Subí captura</strong> de perfil, post, o analytics</p>
  </div>
  <div class="vis-previews" id="ext-previews"></div>
</div>
<div class="vis-card">
  <div class="vis-label">Plataforma</div>
  <select class="vis-select" id="ext-platform">
    <option value="instagram">Instagram</option>
    <option value="tiktok">TikTok</option>
    <option value="canva">Canva</option>
    <option value="generic">Genérica</option>
  </select>
  <div class="vis-label" style="margin-top:4px">Campos extra a extraer (uno por línea, opcional)</div>
  <textarea class="vis-input" id="ext-fields" rows="3" placeholder="engagement_rate&#10;pinned_post&#10;highlights_count"></textarea>
  <button class="vis-btn primary" id="ext-btn">📊 Extraer métricas</button>
</div>
<div id="ext-result"></div>`;

const setupExtract = () => {
  const imgs = [];
  const drop = $('#ext-drop');
  const previews = $('#ext-previews');
  const result = $('#ext-result');
  const btn = $('#ext-btn');
  const refresh = () => renderPreviews(previews, imgs, (i) => { imgs.splice(i, 1); refresh(); });

  makeDropZone(drop, async (files) => {
    const urls = await filesToDataUrls(files);
    imgs.length = 0;
    imgs.push(urls[0]);
    refresh();
  });

  withBtnSpinner(btn, async () => {
    if (!imgs.length) { toast('Subí una captura.', 'warn'); return; }
    result.innerHTML = '';
    const rawFields = ($('#ext-fields')?.value || '').split('\n').map((s) => s.trim()).filter(Boolean);
    const data = await api('/api/vision/extract', 'POST', {
      imageUrl: imgs[0],
      platform: $('#ext-platform')?.value || 'instagram',
      fields: rawFields,
    });

    if (data.error) { result.innerHTML = `<div class="vis-result"><pre class="vis-json">${JSON.stringify(data, null, 2)}</pre></div>`; return; }

    const rows = Object.entries(data)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => `<div class="vis-stat"><div class="vis-stat-label">${k.replace(/_/g, ' ')}</div><div class="vis-stat-val" style="font-size:16px">${v ?? '—'}</div></div>`)
      .join('');

    result.innerHTML = `<div class="vis-result"><div class="vis-result-title">📊 Métricas extraídas</div><div class="vis-grid">${rows}</div></div>`;
  });
};

// ── Tab 4: Vision Loop (see→decide→act) ──────────────────────────────────────
const panelLoop = () => `
<div class="vis-card">
  <div class="vis-label">Goal del loop</div>
  <input class="vis-input" id="lp-goal" placeholder="Ej: Encontrar el botón de 'Publicar' y confirmarlo">
  <div class="vis-label" style="margin-top:4px">Screenshots (subí 1 o más, en orden cronológico)</div>
  <div class="vis-drop" id="lp-drop">
    <div class="vis-drop-icon">🔄</div>
    <p><strong>Subí capturas</strong> del flujo que querés ejecutar</p>
    <p>Podés subir capturas adicionales después de cada acción</p>
  </div>
  <div class="vis-previews" id="lp-previews"></div>
  <div style="display:flex;gap:10px;align-items:center">
    <label class="vis-label" style="margin:0">Máx. pasos:</label>
    <select class="vis-select" id="lp-maxsteps" style="width:auto">
      <option value="3">3</option>
      <option value="5" selected>5</option>
      <option value="8">8</option>
      <option value="12">12</option>
    </select>
  </div>
  <button class="vis-btn primary" id="lp-btn">🔄 Ejecutar loop de visión</button>
</div>
<div id="lp-result"></div>`;

const renderLoopResult = (data, container) => {
  const statusColors = { complete: 'green', awaiting_screenshot: 'yellow', max_steps_reached: 'yellow', error: 'red' };
  const cls = statusColors[data.status] || 'yellow';

  let html = `<div class="vis-result">
  <div class="vis-result-title">🔄 Vision Loop — <span class="vis-chip ${cls}">${data.status}</span></div>`;

  if (data.status === 'awaiting_screenshot') {
    html += `<div class="vis-instruction">
      <strong>📸 Acción requerida:</strong><br><br>
      ${(data.instruction || '').replace(/\n/g, '<br>')}
      <br><br><em style="color:var(--text-muted)">Ejecutá la acción, tomá screenshot, y agregála arriba para continuar el loop.</em>
    </div>`;
  }

  if (data.summary) html += `<p style="font-size:14px;color:var(--text);margin:12px 0">${data.summary}</p>`;

  const history = data.history || [];
  if (history.length) {
    html += `<div class="vis-section"><h4>Historial de pasos</h4><div class="vis-history">`;
    for (const step of history) {
      const obs = step.observation || {};
      const dec = step.decision || {};
      html += `<div class="vis-step">
        <div class="vis-step-num">Paso ${step.step}</div>
        <div class="vis-step-obs">📍 ${obs.platform || '?'} / ${obs.screen || '?'} — ${obs.state || ''}</div>
        <div class="vis-step-action">
          <strong>${dec.action || '?'}</strong>${dec.target ? ` → ${dec.target}` : ''}
          ${dec.reasoning ? `<br><span style="font-size:12px;color:var(--text-muted)">${dec.reasoning}</span>` : ''}
          ${dec.expected_result ? `<br><span style="font-size:12px;color:var(--text-muted)">Esperar: ${dec.expected_result}</span>` : ''}
          <span class="vis-chip" style="margin-left:4px">${dec.confidence ?? '?'}% conf.</span>
        </div>
      </div>`;
    }
    html += `</div></div>`;
  }

  html += '</div>';
  container.innerHTML = html;
};

const setupLoop = () => {
  const imgs = [];
  const drop = $('#lp-drop');
  const previews = $('#lp-previews');
  const result = $('#lp-result');
  const btn = $('#lp-btn');
  const refresh = () => renderPreviews(previews, imgs, (i) => { imgs.splice(i, 1); refresh(); });

  makeDropZone(drop, async (files) => {
    const urls = await filesToDataUrls(files);
    imgs.push(...urls.slice(0, 8 - imgs.length));
    refresh();
  });

  withBtnSpinner(btn, async () => {
    if (!imgs.length) { toast('Subí al menos 1 captura para iniciar el loop.', 'warn'); return; }
    const goal = $('#lp-goal')?.value?.trim();
    if (!goal) { toast('Escribí el goal del loop.', 'warn'); return; }
    result.innerHTML = '';
    const data = await api('/api/vision/loop', 'POST', {
      goal,
      screenshots: imgs,
      maxSteps: Number($('#lp-maxsteps')?.value || 5),
    });
    renderLoopResult(data, result);
  });
};

// ── Tab routing ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'analyze', label: '🔍 Analizar', panel: panelAnalyze, setup: setupAnalyze },
  { id: 'spy', label: '🕵️ Spy', panel: panelSpy, setup: setupSpy },
  { id: 'extract', label: '📊 Extraer', panel: panelExtract, setup: setupExtract },
  { id: 'loop', label: '🔄 Loop', panel: panelLoop, setup: setupLoop },
];

const switchTab = (id) => {
  _activeTab = id;
  $$('.vis-tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === id));
  $$('.vis-panel').forEach((p) => p.classList.toggle('active', p.dataset.panel === id));
  const found = TABS.find((t) => t.id === id);
  if (found) found.setup();
};

// ── Status banner ─────────────────────────────────────────────────────────────
const renderStatus = (st) => {
  const ok = st?.hasVision;
  const providers = (st?.providers || []).join(', ') || 'ninguno';
  return `<span class="vis-badge ${ok ? 'ok' : 'err'}">${ok ? `👁 Vision activa · ${providers}` : '⚠ Sin proveedor de visión — configurar GEMINI_API_KEY'}</span>`;
};

// ── Main render ───────────────────────────────────────────────────────────────
export const renderVisión = async (root) => {
  _root = root;

  // Inject CSS once
  if (!document.getElementById('vis-styles')) {
    const style = document.createElement('style');
    style.id = 'vis-styles';
    style.textContent = CSS;
    document.head.appendChild(style);
  }

  // Fetch vision status
  try { _status = await api('/api/vision/status', 'GET'); } catch { _status = { hasVision: false, providers: [] }; }

  const tabsHtml = TABS.map((t) => `<div class="vis-tab${t.id === _activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('');
  const panelsHtml = TABS.map((t) => `<div class="vis-panel${t.id === _activeTab ? ' active' : ''}" data-panel="${t.id}">${t.panel()}</div>`).join('');

  root.innerHTML = `
<div class="vis-wrap">
  <div class="vis-header">
    <h2 class="vis-title">Visión IA</h2>
    <p class="vis-sub">Computer Vision integrado · Interpreta pantallas · Analiza competidores · Ciclo see→decide→act</p>
    ${renderStatus(_status)}
  </div>
  <div class="vis-tabs">${tabsHtml}</div>
  <div class="vis-body">${panelsHtml}</div>
</div>`;

  // Tab click
  $$('.vis-tab').forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));

  // Setup active tab
  const activeT = TABS.find((t) => t.id === _activeTab);
  if (activeT) activeT.setup();
};
