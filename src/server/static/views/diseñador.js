/* ══════════════════════════════════════════════════════════════════════════════
   DISEÑADOR IA — Estudio de diseño gráfico para Instagram y TikTok
   ──────────────────────────────────────────────────────────────────────────────
   6 herramientas integradas:
   1. Carrusel completo   → multi-slide con LLM planning
   2. PHASE 1 Composición → crop + colorize + blur-bg + frame
   3. Quitar fondo        → fal.ai BiRefNet
   4. Mejorar calidad     → fal.ai clarity-upscaler
   5. Paleta de marca     → extracción dominante de imagen
   6. Tipografías         → AI font pairing por estilo/nicho
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { toast } from '../lib/toast.js';
import { withBtnSpinner } from '../lib/ui.js';

// ── State ─────────────────────────────────────────────────────────────────────
let _activeTab = 'carousel';
let _status = null;
let _root = null;

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = (sel, ctx = _root) => ctx?.querySelector(sel);
const $$ = (sel, ctx = _root) => [...(ctx?.querySelectorAll(sel) || [])];

const fileToDataUrl = (file) =>
  new Promise((res) => {
    const r = new FileReader();
    r.onload = (e) => res(e.target.result);
    r.readAsDataURL(file);
  });

const downloadUrl = (url, name) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
};

const downloadHtml = (html, name) => {
  const blob = new Blob([html], { type: 'text/html' });
  downloadUrl(URL.createObjectURL(blob), name);
};

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.dis-wrap { display:flex;flex-direction:column;gap:0;height:100%;overflow:hidden }
.dis-header { padding:24px 28px 0;flex-shrink:0 }
.dis-title { font-size:22px;font-weight:800;color:var(--text);margin:0 0 4px }
.dis-sub { font-size:13px;color:var(--text-muted);margin:0 0 20px }
.dis-tabs { display:flex;gap:4px;padding:0 28px;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto }
.dis-tab { padding:10px 16px;font-size:13px;font-weight:600;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap;transition:all .15s }
.dis-tab.active { color:var(--accent);border-bottom-color:var(--accent) }
.dis-tab:hover:not(.active) { color:var(--text) }
.dis-body { flex:1;overflow-y:auto;padding:24px 28px }
.dis-panel { display:none }
.dis-panel.active { display:flex;flex-direction:column;gap:20px }
.dis-card { background:var(--surface2);border-radius:16px;padding:20px;display:flex;flex-direction:column;gap:14px }
.dis-label { font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:var(--text-muted) }
.dis-input { width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:14px;outline:none }
.dis-input:focus { border-color:var(--accent) }
.dis-input select { appearance:none }
.dis-upload { border:2px dashed var(--border);border-radius:14px;padding:32px 20px;text-align:center;cursor:pointer;transition:border-color .15s;background:var(--surface) }
.dis-upload:hover { border-color:var(--accent) }
.dis-upload-icon { font-size:32px;margin-bottom:8px }
.dis-upload-text { font-size:13px;color:var(--text-muted) }
.dis-btn { padding:10px 20px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;border:none;transition:opacity .15s }
.dis-btn:hover { opacity:.85 }
.dis-btn-primary { background:var(--accent);color:#fff }
.dis-btn-secondary { background:var(--surface);border:1px solid var(--border);color:var(--text) }
.dis-btn-row { display:flex;gap:10px;flex-wrap:wrap }
.dis-result { margin-top:8px;display:flex;flex-direction:column;gap:12px }
.dis-result img { max-width:100%;border-radius:12px;max-height:400px;object-fit:contain;background:#111 }
.dis-result-url { font-size:12px;color:var(--text-muted);word-break:break-all }
.dis-colors { display:flex;gap:10px;flex-wrap:wrap }
.dis-swatch { width:52px;height:52px;border-radius:10px;position:relative;cursor:pointer;border:2px solid transparent;transition:transform .1s }
.dis-swatch:hover { transform:scale(1.08) }
.dis-swatch-hex { position:absolute;bottom:-22px;left:50%;transform:translateX(-50%);font-size:11px;color:var(--text-muted);white-space:nowrap }
.dis-font-pair { background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;cursor:pointer;transition:border-color .15s }
.dis-font-pair:hover { border-color:var(--accent) }
.dis-font-pair.selected { border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)22 }
.dis-font-heading { font-size:26px;font-weight:900;color:var(--text);line-height:1.1;margin-bottom:4px }
.dis-font-body { font-size:15px;color:var(--text-muted);margin-bottom:8px }
.dis-font-mood { font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--accent) }
.dis-slide-preview { width:100%;border-radius:16px;overflow:hidden;border:1px solid var(--border);background:#000 }
.dis-slide-preview iframe { width:100%;height:500px;border:none;display:block }
.dis-status-dot { display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px }
.dis-status-ok { background:#22c55e }
.dis-status-off { background:#ef4444 }
.dis-row2 { display:grid;grid-template-columns:1fr 1fr;gap:12px }
@media(max-width:600px){ .dis-row2 { grid-template-columns:1fr } }
.dis-select { width:100%;background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:10px 14px;color:var(--text);font-size:14px;appearance:none;outline:none;cursor:pointer }
.dis-select:focus { border-color:var(--accent) }
`;

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { id: 'carousel',   label: '🎠 Carrusel completo', statusKey: 'slideSeries' },
  { id: 'phase1',     label: '✨ Phase 1 Composición', statusKey: 'phase1'     },
  { id: 'remove-bg',  label: '✂️ Quitar fondo',      statusKey: 'removeBg'   },
  { id: 'upscale',    label: '🔍 Mejorar calidad',    statusKey: 'upscale'    },
  { id: 'palette',    label: '🎨 Paleta de marca',    statusKey: 'palette'    },
  { id: 'font-pair',  label: '✍️ Tipografías',        statusKey: 'fontPair'   },
  { id: 'slide-html', label: '📐 Slide individual',   statusKey: 'slideHtml'  },
];

const PALETTES = [
  { id: 'dark-premium',    label: '🌑 Dark Premium',     desc: 'Lujo · educación · profesional' },
  { id: 'clean-editorial', label: '⬜ Clean Editorial',  desc: 'Noticias · tutoriales · how-to' },
  { id: 'warm-organic',    label: '🌿 Warm Organic',     desc: 'Lifestyle · wellness · natural' },
  { id: 'bold-playful',    label: '🎆 Bold Playful',     desc: 'Entretenimiento · viral · joven' },
];

const LAYOUTS = [
  { id: 'left-right', label: 'Texto izq + acento der' },
  { id: 'full-bleed', label: 'Imagen full + texto centrado' },
  { id: 'grid',       label: 'Grilla 2x2 (tips/lista)' },
  { id: 'asymmetric', label: 'Asimétrico + whitespace' },
];

// ── Panel renderers ───────────────────────────────────────────────────────────
const renderStatus = (key, subkey = null) => {
  if (!_status) return '';
  let s = _status[key];
  if (!s) return '';
  if (subkey && typeof s === 'object' && !(s.active !== undefined)) {
    s = s[subkey];
    if (!s) return '';
  }
  return s.active
    ? `<span class="dis-status-dot dis-status-ok"></span>${s.provider || 'activo'}`
    : `<span class="dis-status-dot dis-status-off"></span>sin proveedor`;
};

// ── Carousel panel ────────────────────────────────────────────────────────────
const panelCarousel = () => `
  <div class="dis-card">
    <p class="dis-label">Generá un carrusel completo de IG (3-10 slides) con IA</p>
    <div>
      <div class="dis-label">Tema del carrusel *</div>
      <input class="dis-input" id="csrTopic" placeholder="Cómo duplicar seguidores en 30 días" />
    </div>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Cantidad de slides</div>
        <select class="dis-select" id="csrCount">
          <option value="3">3 slides (mínimo)</option>
          <option value="5" selected>5 slides (recomendado)</option>
          <option value="7">7 slides</option>
          <option value="10">10 slides (completo)</option>
        </select>
      </div>
      <div>
        <div class="dis-label">Nicho / industria</div>
        <input class="dis-input" id="csrNiche" placeholder="fitness · moda · negocios…" />
      </div>
    </div>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Paleta visual</div>
        <select class="dis-select" id="csrPalette">
          ${PALETTES.map(p => `<option value="${p.id}">${p.label}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="dis-label">Formato</div>
        <select class="dis-select" id="csrFormat">
          <option value="carousel">Carrusel IG (1080×1350)</option>
          <option value="reel">Reel/Story (1080×1920)</option>
        </select>
      </div>
    </div>
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="csrRun">🎠 Generar carrusel completo</button>
    </div>
  </div>
  <div class="dis-result" id="csrResult" style="display:none"></div>`;

const setupCarousel = () => {
  $('#csrRun')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const topic = $('#csrTopic')?.value?.trim();
    if (!topic) { toast('Escribí el tema del carrusel', 'error'); return; }

    await withBtnSpinner(btn, 'Generando carrusel con IA…', async () => {
      const result = await api('/api/design/slide-series', {
        method: 'POST',
        body: {
          topic,
          slideCount: Number($('#csrCount')?.value || 5),
          niche:      $('#csrNiche')?.value?.trim(),
          palette:    $('#csrPalette')?.value,
          format:     $('#csrFormat')?.value,
        },
      });

      const panel = $('#csrResult');
      if (!panel) return;
      panel.style.display = 'flex';

      const slidesHtml = result.slides?.map((s, i) => {
        const blobUrl = URL.createObjectURL(new Blob([s.html], { type: 'text/html' }));
        const roleLabel = { hook: '🎣 Hook', content: '📖 Content', cta: '🎯 CTA' }[s.role] || s.role;
        return `
          <div class="dis-card" style="gap:12px">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div>
                <span style="font-size:12px;font-weight:700;color:var(--accent);text-transform:uppercase;letter-spacing:1px">${roleLabel}</span>
                <div style="font-size:14px;font-weight:600;color:var(--text);margin-top:2px">${s.title || `Slide ${s.num}`}</div>
              </div>
              <div style="display:flex;gap:8px">
                <button class="dis-btn dis-btn-secondary" style="padding:6px 12px;font-size:12px" onclick="window.open('${blobUrl}','_blank')">↗️ Ver</button>
                <button class="dis-btn dis-btn-secondary" style="padding:6px 12px;font-size:12px" data-dl-idx="${i}">⬇️</button>
              </div>
            </div>
            <div style="border-radius:12px;overflow:hidden;border:1px solid var(--border);background:#000">
              <iframe src="${blobUrl}" style="width:100%;height:340px;border:none;display:block" sandbox="allow-same-origin"></iframe>
            </div>
          </div>`;
      }).join('') || '<p style="color:var(--text-muted)">Sin slides generados.</p>';

      panel.innerHTML = `
        <div class="dis-card">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
            <div>
              <div class="dis-label">Carrusel generado · ${result.total} slides · ${result.palette}</div>
              <div style="font-size:13px;color:var(--text-muted);margin-top:2px">${topic}</div>
            </div>
            <button class="dis-btn dis-btn-primary" id="csrDownloadAll">⬇️ Descargar todos</button>
          </div>
        </div>
        <div id="csrSlidesGrid" style="display:flex;flex-direction:column;gap:16px">${slidesHtml}</div>`;

      // Per-slide download buttons
      panel.querySelectorAll('[data-dl-idx]').forEach(btn => {
        const idx = Number(btn.dataset.dlIdx);
        const s = result.slides[idx];
        btn.addEventListener('click', () => {
          const blob = new Blob([s.html], { type: 'text/html' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `slide-${String(idx + 1).padStart(2, '0')}-${(s.title || 'slide').slice(0, 20).replace(/\s+/g, '-').toLowerCase()}.html`;
          a.click();
        });
      });

      // Download all as ZIP (sequential download fallback — no JSZip dependency)
      panel.querySelector('#csrDownloadAll')?.addEventListener('click', () => {
        result.slides?.forEach((s, i) => {
          setTimeout(() => {
            const blob = new Blob([s.html], { type: 'text/html' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `slide-${String(i + 1).padStart(2, '0')}.html`;
            a.click();
          }, i * 300);
        });
        toast(`Descargando ${result.slides.length} slides…`);
      });
    });
  });
};

// ── PHASE 1: Image Composition
const panelPhase1 = () => `
  <div class="dis-card">
    <div class="dis-label">Estado <small>${renderStatus('phase1', 'crop')}</small></div>
    <p style="font-size:13px;color:var(--text-muted);margin:0">Subí imagen para acceder a 4 herramientas de composición</p>
  </div>
  <div class="dis-card">
    <div class="dis-label">Imagen de trabajo</div>
    <div class="dis-upload" id="p1Dropzone">
      <div class="dis-upload-icon">📸</div>
      <p class="dis-upload-text">Arrastrá o hacé clic para subir imagen</p>
      <input type="file" id="p1File" accept="image/*" style="display:none">
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px" id="p1ToolBtns" style="display:none">
      <button class="dis-btn dis-btn-secondary" id="p1CropBtn">✂️ Crop inteligente</button>
      <button class="dis-btn dis-btn-secondary" id="p1ColorizeBtn">🎨 Colorize</button>
      <button class="dis-btn dis-btn-secondary" id="p1BlurBgBtn">💨 Blur fondo</button>
      <button class="dis-btn dis-btn-secondary" id="p1FrameBtn">🖼️ Frames</button>
    </div>
  </div>
  <div class="dis-result" id="p1Result" style="display:none;gap:16px"></div>`;

const panelRemoveBg = () => `
  <div class="dis-card">
    <p class="dis-label">Estado <small>${renderStatus('removeBg')}</small></p>
    <div class="dis-upload" id="rbDropzone">
      <div class="dis-upload-icon">🖼️</div>
      <p class="dis-upload-text">Arrastrá o hacé clic para subir imagen (JPG/PNG)</p>
      <input type="file" id="rbFile" accept="image/*" style="display:none">
    </div>
    <div class="dis-label">O pegá URL de imagen</div>
    <input class="dis-input" id="rbUrl" placeholder="https://..." />
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="rbRun">✂️ Quitar fondo</button>
    </div>
  </div>
  <div class="dis-result" id="rbResult" style="display:none"></div>`;

const panelUpscale = () => `
  <div class="dis-card">
    <p class="dis-label">Estado <small>${renderStatus('upscale')}</small></p>
    <div class="dis-upload" id="upDropzone">
      <div class="dis-upload-icon">🔍</div>
      <p class="dis-upload-text">Arrastrá o hacé clic para subir imagen</p>
      <input type="file" id="upFile" accept="image/*" style="display:none">
    </div>
    <div class="dis-label">O pegá URL de imagen</div>
    <input class="dis-input" id="upUrl" placeholder="https://..." />
    <div class="dis-label">Escala</div>
    <select class="dis-select" id="upScale">
      <option value="2">×2 (recomendado)</option>
      <option value="4">×4 (alta definición)</option>
    </select>
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="upRun">🔍 Mejorar calidad</button>
    </div>
  </div>
  <div class="dis-result" id="upResult" style="display:none"></div>`;

const panelPalette = () => `
  <div class="dis-card">
    <p class="dis-label">Extraé los colores dominantes de cualquier imagen</p>
    <div class="dis-upload" id="paDropzone">
      <div class="dis-upload-icon">🎨</div>
      <p class="dis-upload-text">Subí logo, foto de perfil o referencia visual</p>
      <input type="file" id="paFile" accept="image/*" style="display:none">
    </div>
    <div class="dis-label">O pegá URL de imagen</div>
    <input class="dis-input" id="paUrl" placeholder="https://..." />
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="paRun">🎨 Extraer paleta</button>
    </div>
  </div>
  <div class="dis-result" id="paResult" style="display:none"></div>`;

const panelFontPair = () => `
  <div class="dis-card">
    <p class="dis-label">Describí tu marca y obtenés 3 pares tipográficos</p>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Estilo de marca</div>
        <input class="dis-input" id="fpStyle" placeholder="moderno · lujoso · playful…" />
      </div>
      <div>
        <div class="dis-label">Nicho / industria</div>
        <input class="dis-input" id="fpNiche" placeholder="fitness · moda · gastronomía…" />
      </div>
    </div>
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="fpRun">✍️ Generar tipografías</button>
    </div>
  </div>
  <div class="dis-result" id="fpResult" style="display:none"></div>`;

const panelSlideHtml = () => `
  <div class="dis-card">
    <p class="dis-label">Generá slides HTML/CSS listos para IG o TikTok</p>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Título del slide *</div>
        <input class="dis-input" id="shTitle" placeholder="Cómo duplicar tus seguidores" />
      </div>
      <div>
        <div class="dis-label">Subtítulo / categoría</div>
        <input class="dis-input" id="shSubtitle" placeholder="Tip #1 · Estrategia IG" />
      </div>
    </div>
    <div>
      <div class="dis-label">Cuerpo (bullets separados por punto)</div>
      <textarea class="dis-input" id="shBody" rows="3" placeholder="Publicá 5x por semana. Usá Reels en las primeras horas. El hook primero." style="resize:vertical"></textarea>
    </div>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Emoji del slide</div>
        <input class="dis-input" id="shEmoji" placeholder="🚀" maxlength="4" />
      </div>
      <div>
        <div class="dis-label">Rol del slide</div>
        <select class="dis-select" id="shRole">
          <option value="hook">Hook (slide 1 — gancho)</option>
          <option value="content" selected>Content (desarrollo)</option>
          <option value="cta">CTA (último slide)</option>
        </select>
      </div>
    </div>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Paleta</div>
        <select class="dis-select" id="shPalette">
          ${PALETTES.map(p => `<option value="${p.id}">${p.label} — ${p.desc}</option>`).join('')}
        </select>
      </div>
      <div>
        <div class="dis-label">Layout</div>
        <select class="dis-select" id="shLayout">
          ${LAYOUTS.map(l => `<option value="${l.id}">${l.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="dis-row2">
      <div>
        <div class="dis-label">Formato</div>
        <select class="dis-select" id="shFormat">
          <option value="carousel">Carrusel IG (1080×1350)</option>
          <option value="reel">Reel/Story (1080×1920)</option>
        </select>
      </div>
      <div>
        <div class="dis-label">Slide # / Total</div>
        <div style="display:flex;gap:8px">
          <input class="dis-input" id="shNum" type="number" min="1" max="10" value="1" style="width:80px" />
          <span style="padding:10px 4px;color:var(--text-muted)">/</span>
          <input class="dis-input" id="shTotal" type="number" min="1" max="10" value="5" style="width:80px" />
        </div>
      </div>
    </div>
    <div class="dis-btn-row">
      <button class="dis-btn dis-btn-primary" id="shRun">📐 Generar slide</button>
    </div>
  </div>
  <div class="dis-result" id="shResult" style="display:none"></div>`;

// ── Upload dropzone helper ─────────────────────────────────────────────────────
const setupDropzone = (zoneId, fileId, onFile) => {
  const zone = $(`#${zoneId}`);
  const input = $(`#${fileId}`);
  if (!zone || !input) return;

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.style.borderColor = 'var(--accent)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.style.borderColor = '';
    const file = e.dataTransfer?.files?.[0];
    if (file) onFile(file);
  });
  input.addEventListener('change', () => { if (input.files?.[0]) onFile(input.files[0]); });
};

// ── Image tool setup (remove-bg & upscale share same logic) ──────────────────
const setupImageTool = ({ prefix, endpoint, extraBody = () => ({}) }) => {
  let uploadedUrl = null;

  setupDropzone(`${prefix}Dropzone`, `${prefix}File`, async (file) => {
    const du = await fileToDataUrl(file);
    $(`#${prefix}DropzoneIcon`)?.remove?.();
    const zone = $(`#${prefix}Dropzone`);
    if (zone) {
      zone.style.backgroundImage = `url(${du})`;
      zone.style.backgroundSize = 'contain';
      zone.style.backgroundRepeat = 'no-repeat';
      zone.style.backgroundPosition = 'center';
      zone.style.minHeight = '120px';
    }
    uploadedUrl = du; // data URL (base64) — for display only; send as URL param or upload first
    $(`#${prefix}Url`).value = '';
  });

  $(`#${prefix}Run`)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const imageUrl = $(`#${prefix}Url`)?.value?.trim() || uploadedUrl;
    if (!imageUrl) { toast('Subí una imagen o pegá una URL', 'error'); return; }
    if (imageUrl.startsWith('data:')) {
      toast('Para imágenes subidas, primero publicala en la web o usá una URL pública', 'warn');
      return;
    }
    await withBtnSpinner(btn, 'Procesando…', async () => {
      const result = await api(endpoint, { method: 'POST', body: { imageUrl, ...extraBody() } });
      const panel = $(`#${prefix}Result`);
      if (!panel) return;
      panel.style.display = 'flex';
      panel.innerHTML = `
        <div class="dis-card">
          <img src="${result.resultUrl}" alt="resultado" />
          <div class="dis-btn-row">
            <button class="dis-btn dis-btn-primary" onclick="window.open('${result.resultUrl}','_blank')">⬇️ Abrir imagen</button>
            <small class="dis-result-url">${result.provider || ''}</small>
          </div>
        </div>`;
    });
  });
};

// ── Palette tool ──────────────────────────────────────────────────────────────
const setupPalette = () => {
  let uploadedUrl = null;

  setupDropzone('paDropzone', 'paFile', async (file) => {
    uploadedUrl = await fileToDataUrl(file);
    $('#paUrl').value = '';
    const zone = $('#paDropzone');
    if (zone) {
      zone.style.backgroundImage = `url(${uploadedUrl})`;
      zone.style.backgroundSize = 'contain';
      zone.style.backgroundRepeat = 'no-repeat';
      zone.style.backgroundPosition = 'center';
      zone.style.minHeight = '120px';
    }
  });

  $('#paRun')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const imageUrl = $('#paUrl')?.value?.trim() || uploadedUrl;
    if (!imageUrl) { toast('Subí una imagen o pegá una URL', 'error'); return; }
    if (imageUrl.startsWith('data:')) {
      toast('La paleta funciona con URLs públicas. Subí la imagen a un hosting gratuito primero.', 'warn');
      return;
    }
    await withBtnSpinner(btn, 'Analizando…', async () => {
      const result = await api('/api/design/palette', { method: 'POST', body: { imageUrl } });
      const panel = $('#paResult');
      if (!panel) return;
      panel.style.display = 'flex';

      const swatches = result.colors?.map(hex =>
        `<div style="position:relative;margin-bottom:26px">
          <div class="dis-swatch" style="background:${hex}" title="${hex}" onclick="navigator.clipboard?.writeText('${hex}').then(()=>window._toast?.('${hex} copiado!'))"></div>
          <div class="dis-swatch-hex">${hex}</div>
        </div>`
      ).join('') || '';

      const paletteRoles = result.palette
        ? Object.entries(result.palette).map(([k, v]) =>
            `<div style="display:flex;align-items:center;gap:10px;font-size:13px">
              <div style="width:20px;height:20px;border-radius:4px;background:${v};border:1px solid var(--border);flex-shrink:0"></div>
              <span style="color:var(--text-muted);text-transform:capitalize">${k}:</span>
              <strong style="color:var(--text)">${v}</strong>
            </div>`
          ).join('') : '';

      panel.innerHTML = `
        <div class="dis-card">
          <div class="dis-label">Colores dominantes (clic para copiar)</div>
          <div class="dis-colors" style="padding-bottom:8px">${swatches}</div>
          ${paletteRoles ? `<div class="dis-label" style="margin-top:8px">Roles sugeridos</div><div style="display:flex;flex-direction:column;gap:8px">${paletteRoles}</div>` : ''}
        </div>`;
    });
  });
};

// ── Font pair tool ────────────────────────────────────────────────────────────
const setupFontPair = () => {
  let selectedPair = null;

  const renderPairs = (pairs, container) => {
    container.innerHTML = `<div class="dis-card" id="fpPairsCard">
      <div class="dis-label">Elegí tu combinación tipográfica</div>
      <div style="display:flex;flex-direction:column;gap:12px">
        ${pairs.map((p, i) => `
          <div class="dis-font-pair" id="fpPair${i}" data-idx="${i}" onclick="selectFontPair(${i})">
            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(p.googleFonts)}&display=swap">
            <div class="dis-font-heading" style="font-family:'${p.heading}',sans-serif">${p.heading}</div>
            <div class="dis-font-body" style="font-family:'${p.body}',sans-serif">${p.body} · cuerpo de texto</div>
            <div class="dis-font-mood">${p.mood}</div>
          </div>`).join('')}
      </div>
      <div class="dis-btn-row" id="fpApplyRow" style="display:none">
        <button class="dis-btn dis-btn-primary" id="fpCopyBtn">📋 Copiar Google Fonts URL</button>
      </div>
    </div>`;

    window.selectFontPair = (idx) => {
      selectedPair = pairs[idx];
      $$('.dis-font-pair').forEach(el => el.classList.remove('selected'));
      $(`#fpPair${idx}`)?.classList.add('selected');
      $('#fpApplyRow').style.display = 'flex';
    };

    $('#fpCopyBtn')?.addEventListener('click', () => {
      if (!selectedPair) return;
      const url = `https://fonts.googleapis.com/css2?family=${selectedPair.googleFonts}&display=swap`;
      navigator.clipboard?.writeText(url).then(() => toast('URL copiada al portapapeles ✓'));
    });
  };

  $('#fpRun')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const style = $('#fpStyle')?.value?.trim();
    const niche = $('#fpNiche')?.value?.trim();
    await withBtnSpinner(btn, 'Generando…', async () => {
      const result = await api('/api/design/font-pair', { method: 'POST', body: { style, niche } });
      const panel = $('#fpResult');
      if (!panel) return;
      panel.style.display = 'flex';
      renderPairs(result.pairs || [], panel);
    });
  });
};

// ── PHASE 1 tool ──────────────────────────────────────────────────────────────
const setupPhase1 = () => {
  const dropzone = $('#p1Dropzone');
  const fileInput = $('#p1File');
  const toolsDiv = $('#p1ToolBtns');
  const resultDiv = $('#p1Result');
  let currentUrl = null;

  // Upload handler
  const handleFiles = async (files) => {
    if (!files?.length) return;
    const file = files[0];
    if (!file.type.startsWith('image/')) { toast('Solo imágenes', 'warn'); return; }
    const dataUrl = await fileToDataUrl(file);
    currentUrl = dataUrl;
    toolsDiv.style.display = 'flex';
    resultDiv.style.display = 'none';
  };

  dropzone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => handleFiles(e.target.files));
  dropzone?.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--accent)'; });
  dropzone?.addEventListener('dragleave', () => { dropzone.style.borderColor = 'var(--border)'; });
  dropzone?.addEventListener('drop', (e) => { e.preventDefault(); dropzone.style.borderColor = 'var(--border)'; handleFiles(e.dataTransfer.files); });

  // Crop
  $('#p1CropBtn')?.addEventListener('click', async () => {
    if (!currentUrl) { toast('Cargá imagen primero', 'warn'); return; }
    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = '<div style="color:var(--text-muted)">Analizando para crop óptimo…</div>';
    const res = await api('/api/design/crop', 'POST', { imageUrl: currentUrl, aspectRatio: '1:1' });
    const html = res.error
      ? `<div class="dis-card"><p style="color:var(--text-muted)">Error: ${res.error}</p></div>`
      : `<div class="dis-card">
          <div class="dis-label">✂️ Crop recomendado (${res.suggestedRatio})</div>
          <p style="font-size:13px;color:var(--text);margin:8px 0">${res.reasoning || ''}</p>
          <p style="font-size:11px;color:var(--text-muted);margin:0">Coordenadas: x=${res.cropCoords?.x}, y=${res.cropCoords?.y}, w=${res.cropCoords?.width}, h=${res.cropCoords?.height}</p>
          <p style="font-size:11px;color:var(--accent);margin:6px 0 0">Sujeto: ${res.estimatedSubject || '?'} · Rule of Thirds: ${res.ruleOfThirds?.intersection || '?'}</p>
        </div>`;
    resultDiv.innerHTML = html;
  });

  // Colorize
  $('#p1ColorizeBtn')?.addEventListener('click', async () => {
    if (!currentUrl) { toast('Cargá imagen primero', 'warn'); return; }
    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = '<div style="color:var(--text-muted)">Sugiriendo colores…</div>';
    const res = await api('/api/design/colorize', 'POST', { imageUrl: currentUrl, mood: 'vibrant', intensity: 0.8 });
    const colors = res.suggestedColors ? Object.entries(res.suggestedColors).map(([k, v]) => `<div style="display:flex;align-items:center;gap:8px;font-size:12px"><div style="width:32px;height:32px;border-radius:8px;background:${v};border:1px solid var(--border)"></div><span>${k}: ${v}</span></div>`).join('') : '';
    const html = res.error
      ? `<div class="dis-card"><p style="color:var(--text-muted)">Error: ${res.error}</p></div>`
      : `<div class="dis-card">
          <div class="dis-label">🎨 Paleta sugerida (${res.mood || 'vibrant'})</div>
          <div style="display:flex;flex-direction:column;gap:6px;margin:8px 0">${colors}</div>
          <div style="background:var(--surface);border-radius:8px;padding:12px;margin-top:8px;font-family:monospace;font-size:11px;color:var(--text)">filter: ${res.cssFilter?.replace(/; /g, ';<br>')}</div>
        </div>`;
    resultDiv.innerHTML = html;
  });

  // Blur BG
  $('#p1BlurBgBtn')?.addEventListener('click', async () => {
    if (!currentUrl) { toast('Cargá imagen primero', 'warn'); return; }
    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = '<div style="color:var(--text-muted)">Analizando sujeto…</div>';
    const res = await api('/api/design/blur-bg', 'POST', { imageUrl: currentUrl, blurStrength: 'medium' });
    const html = res.error
      ? `<div class="dis-card"><p style="color:var(--text-muted)">Error: ${res.error}</p></div>`
      : `<div class="dis-card">
          <div class="dis-label">💨 Fondo desenfocado</div>
          <p style="font-size:12px;color:var(--text-muted);margin:8px 0">Técnica: ${res.technique || ''}</p>
          ${res.subjectUrl ? `<img src="${res.subjectUrl}" style="max-width:100%;border-radius:12px;max-height:300px;margin:8px 0"/>` : ''}
          <div style="background:var(--surface);border-radius:8px;padding:12px;margin-top:8px;font-family:monospace;font-size:11px">/* Sujeto removido, blur original. Blur: ${res.blurPx}px */</div>
        </div>`;
    resultDiv.innerHTML = html;
  });

  // Frame
  $('#p1FrameBtn')?.addEventListener('click', async () => {
    if (!currentUrl) { toast('Cargá imagen primero', 'warn'); return; }
    resultDiv.style.display = 'flex';
    resultDiv.innerHTML = '<div style="color:var(--text-muted)">Generando frames…</div>';
    const frames = ['minimal', 'shadow', 'vintage', 'neon'];
    const frameHtml = await Promise.all(frames.map(async (style) => {
      const res = await api('/api/design/frame', 'POST', { imageUrl: currentUrl, style, color: '#999', thickness: 8 });
      return `<div class="dis-card">
        <div class="dis-label">${res.description || style}</div>
        <img src="${currentUrl}" style="max-width:100%;border-radius:8px;${res.css}margin:8px 0;max-height:200px;object-fit:cover"/>
        <div style="background:var(--surface);border-radius:8px;padding:8px;font-family:monospace;font-size:10px;color:var(--text)">${res.css?.replace(/;/g, ';<br>')}</div>
      </div>`;
    }));
    resultDiv.innerHTML = frameHtml.join('');
  });
};

// ── Slide HTML tool ───────────────────────────────────────────────────────────
const setupSlideHtml = () => {
  $('#shRun')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const body = {
      title:      $('#shTitle')?.value?.trim(),
      subtitle:   $('#shSubtitle')?.value?.trim(),
      body:       $('#shBody')?.value?.trim(),
      emoji:      $('#shEmoji')?.value?.trim(),
      role:       $('#shRole')?.value,
      palette:    $('#shPalette')?.value,
      layout:     $('#shLayout')?.value,
      format:     $('#shFormat')?.value,
      slideNum:   Number($('#shNum')?.value || 1),
      totalSlides:Number($('#shTotal')?.value || 5),
    };
    if (!body.title) { toast('Escribí el título del slide', 'error'); return; }

    await withBtnSpinner(btn, 'Generando slide…', async () => {
      const result = await api('/api/design/slide-html', { method: 'POST', body });
      const panel = $('#shResult');
      if (!panel) return;
      panel.style.display = 'flex';

      const safeName = body.title.slice(0, 30).replace(/\s+/g, '-').toLowerCase();
      const blobUrl = URL.createObjectURL(new Blob([result.html], { type: 'text/html' }));

      panel.innerHTML = `
        <div class="dis-card" style="gap:16px">
          <div class="dis-label">Vista previa (${result.width}×${result.height}px · ${body.palette} · ${body.layout})</div>
          <div class="dis-slide-preview">
            <iframe src="${blobUrl}" id="shIframe" sandbox="allow-same-origin"></iframe>
          </div>
          <div class="dis-btn-row">
            <button class="dis-btn dis-btn-primary" id="shDownload">⬇️ Descargar HTML</button>
            <button class="dis-btn dis-btn-secondary" id="shOpenNew">↗️ Abrir en nueva pestaña</button>
            <button class="dis-btn dis-btn-secondary" id="shCopyHtml">📋 Copiar HTML</button>
          </div>
          <p style="font-size:12px;color:var(--text-muted)">Abrí en nueva pestaña → Ctrl+P (imprimir) → PDF/imagen para exportar. O tomá captura de pantalla del slide centrado.</p>
        </div>`;

      $('#shDownload')?.addEventListener('click', () => downloadHtml(result.html, `slide-${safeName}.html`));
      $('#shOpenNew')?.addEventListener('click', () => window.open(blobUrl, '_blank'));
      $('#shCopyHtml')?.addEventListener('click', () => {
        navigator.clipboard?.writeText(result.html).then(() => toast('HTML copiado ✓'));
      });
    });
  });
};

// ── Tab switching ─────────────────────────────────────────────────────────────
const switchTab = (id) => {
  _activeTab = id;
  $$('.dis-tab').forEach(el => el.classList.toggle('active', el.dataset.tab === id));
  $$('.dis-panel').forEach(el => el.classList.toggle('active', el.dataset.panel === id));
};

// ── Main render ───────────────────────────────────────────────────────────────
export const renderDiseñador = async (root) => {
  _root = root;

  // Inject CSS
  if (!document.getElementById('dis-styles')) {
    const s = document.createElement('style');
    s.id = 'dis-styles';
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Fetch status
  const { data: statusData } = await apiSafe('/api/design/status', null);
  _status = statusData;

  root.innerHTML = `
    <div class="dis-wrap">
      <div class="dis-header">
        <h2 class="dis-title">🎨 Diseñador IA</h2>
        <p class="dis-sub">Herramientas de diseño gráfico para Instagram y TikTok — quitar fondo, mejorar calidad, paleta, tipografías y slides.</p>
      </div>
      <div class="dis-tabs">
        ${TABS.map(t => `<div class="dis-tab${t.id === _activeTab ? ' active' : ''}" data-tab="${t.id}">${t.label}</div>`).join('')}
      </div>
      <div class="dis-body">
        <div class="dis-panel${_activeTab === 'carousel' ? ' active' : ''}" data-panel="carousel">${panelCarousel()}</div>
        <div class="dis-panel${_activeTab === 'phase1' ? ' active' : ''}" data-panel="phase1">${panelPhase1()}</div>
        <div class="dis-panel${_activeTab === 'remove-bg' ? ' active' : ''}" data-panel="remove-bg">${panelRemoveBg()}</div>
        <div class="dis-panel${_activeTab === 'upscale' ? ' active' : ''}" data-panel="upscale">${panelUpscale()}</div>
        <div class="dis-panel${_activeTab === 'palette' ? ' active' : ''}" data-panel="palette">${panelPalette()}</div>
        <div class="dis-panel${_activeTab === 'font-pair' ? ' active' : ''}" data-panel="font-pair">${panelFontPair()}</div>
        <div class="dis-panel${_activeTab === 'slide-html' ? ' active' : ''}" data-panel="slide-html">${panelSlideHtml()}</div>
      </div>
    </div>`;

  // Tab click handlers
  $$('.dis-tab').forEach(el => el.addEventListener('click', () => switchTab(el.dataset.tab)));

  // Wire up tools
  setupCarousel();
  setupPhase1();
  setupImageTool({ prefix: 'rb', endpoint: '/api/design/remove-bg' });
  setupImageTool({ prefix: 'up', endpoint: '/api/design/upscale', extraBody: () => ({ scale: Number($('#upScale')?.value || 2) }) });
  setupPalette();
  setupFontPair();
  setupSlideHtml();
};
