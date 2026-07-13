/* ══════════════════════════════════════════════════════════════════════════════
   STUDIO TIKTOK FOTO — Photo Mode de TikTok (9:16, swipe-driven, sonido)
   ──────────────────────────────────────────────────────────────────────────────
   Distinto al carrusel IG: vertical, foto 1 = hook, 1 idea/foto, sonido obligatorio,
   loop. Equipo de agentes IA internos (estratega viral + equipo de IMAGEN: director de
   foto, prompt engineer, tipógrafo on-screen, color, consistencia de serie) perfecciona
   el prompt de cada foto. Render vía /api/skills (9:16). Refleja /feedIA-tiktok-photo.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape, openExternal } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let pollTimer = null;
const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const TIPOS = [
  { v: 'photo set', l: '📸 Photo set' },
  { v: 'carrusel', l: '🃏 Carrusel' },
  { v: 'album', l: '📚 Álbum' },
];
const MODELOS = [
  { v: 'nano-banana-2', l: '🍌 Nano Banana (rápido, texto)' },
  { v: 'gpt-image-2', l: '🎨 gpt-image-2 (calidad)' },
  { v: 'flux', l: '🌀 Flux (estética)' },
];
const MODES = [
  { v: 'educar', l: '🎓 Educar' },
  { v: 'entretener', l: '😂 Entretener' },
  { v: 'vender', l: '🛒 Vender (soft sell)' },
  { v: 'inspirar', l: '🚀 Inspirar' },
];
const ESTILOS = [
  { v: 'realista', l: '📷 Realista nativo' },
  { v: 'minimal', l: '⬜ Minimal' },
  { v: 'bold-tipo', l: '🔠 Bold tipográfico' },
  { v: 'cinematico', l: '🎬 Cinemático' },
  { v: 'editorial', l: '📰 Editorial / revista' },
  { v: 'retro', l: '📼 Retro / analógico' },
  { v: '3d', l: '🧊 3D / render' },
  { v: 'collage', l: '✂️ Collage / meme' },
  { v: 'ilustrado', l: '🖍️ Ilustrado / mano' },
];
const PALETAS = [
  { v: 'marca', l: '🎨 De la marca' },
  { v: 'alto-contraste-bn', l: '⬛ Alto contraste B&N' },
  { v: 'vibrante', l: '🌈 Vibrante' },
  { v: 'pastel', l: '🩰 Pastel' },
  { v: 'neon', l: '💡 Neón' },
  { v: 'tierra', l: '🏜️ Tierra / cálida' },
  { v: 'frio', l: '🧊 Frío / azulado' },
];
const MOODS = [
  { v: 'energetico', l: '⚡ Energético' },
  { v: 'autoridad', l: '🎓 Serio / autoridad' },
  { v: 'aspiracional', l: '✨ Aspiracional' },
  { v: 'divertido', l: '😄 Divertido' },
  { v: 'misterioso', l: '🕶️ Misterioso' },
  { v: 'cercano', l: '🫶 Cercano' },
];
const DENSIDAD = [
  { v: 'media', l: '◧ Media' },
  { v: 'minima', l: '▫️ Mínima' },
  { v: 'alta', l: '▦ Alta' },
];

// Audiencia (opción "Todos")
const EDADES = ['Todos', '13-17', '18-24', '25-34', '35-44', '45-54', '55+'];
const GENEROS = ['Todos', 'Mujeres', 'Hombres', 'No binario'];
const REGIONES = ['Todos', 'LatAm', 'Argentina', 'México', 'Colombia', 'Chile', 'España', 'USA hispano'];
const IDIOMAS = ['Español neutro', 'Rioplatense (AR/UY)', 'Mexicano', 'España', 'Colombiano'];
const NIVELES = ['Todos', 'Principiante', 'Intermedio', 'Avanzado'];

const opts = (arr) =>
  arr
    .map((o) =>
      typeof o === 'string'
        ? `<option value="${escape(o)}">${escape(o)}</option>`
        : `<option value="${o.v}">${o.l}</option>`,
    )
    .join('');

const localPlan = (tema, n) =>
  Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    role: i === 0 ? 'HOOK' : i === n - 1 ? 'REMATE + CTA' : `Revelación ${i}`,
    text:
      i === 0
        ? `Hook brutal: "${tema.slice(0, 40)}"`
        : i === n - 1
          ? 'Punch final + "volvé a la 1ª / comentá"'
          : `Una idea nueva (${i})`,
    prompt: `[SUJETO] escena sobre "${tema.slice(0, 50)}", foto ${i + 1}/${n}. [PLANO] ${i === 0 ? 'impactante que obliga a deslizar' : 'idea clara'}. [LUZ] direccional alto contraste. [ESTILO] crudo real nativo TikTok. [ON-SCREEN] texto grande en safe-area. [CALIDAD] 1080x1920 9:16 sin watermark.`,
    alt: `Foto ${i + 1} sobre ${tema.slice(0, 40)}`,
  }));

const _photoSlotSvg = (n, role, text) => {
  const isHook = /hook/i.test(role);
  const isCta = /cta|remate/i.test(role);
  const bg = isHook ? '#FE2C55' : isCta ? '#7928CA' : '#25F4EE';
  const labelColor = bg === '#25F4EE' ? '#0d0d12' : '#fff';
  const fg = '#fff';
  const esc = (s) =>
    String(s).replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
  const safeRole = esc(role.length > 16 ? role.slice(0, 16) + '…' : role);
  const safeText = esc(text.length > 32 ? text.slice(0, 32) + '…' : text);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 270 480" width="270" height="480"><rect width="270" height="480" fill="${bg}"/><defs><linearGradient id="pg${n}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#000" stop-opacity="0"/><stop offset="100%" stop-color="#000" stop-opacity="0.55"/></linearGradient></defs><rect width="270" height="480" fill="url(#pg${n})"/><circle cx="135" cy="100" r="32" fill="rgba(255,255,255,0.18)"/><text x="135" y="108" text-anchor="middle" font-family="system-ui,sans-serif" font-size="24" font-weight="900" fill="${fg}">${n}</text><text x="135" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${labelColor}">${safeRole}</text><text x="135" y="260" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="${fg}" opacity="0.8">${safeText}</text><text x="135" y="440" text-anchor="middle" font-family="system-ui,sans-serif" font-size="10" fill="${fg}" opacity="0.45">TikTok Photo · 9:16</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const renderTikTokPhoto = async (root) => {
  stopPoll();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🖼️ Foto TikTok · Photo Mode</h1>
        <p class="view-subtitle page-subtitle">Carrusel de fotos NATIVO de TikTok: 9:16 vertical, foto 1 = hook, 1 idea por foto, sonido obligatorio, loop para rewatch. Equipo de IA interno perfecciona el prompt de cada imagen.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="card" style="margin-bottom:14px;border-left:3px solid #FE2C55;background:linear-gradient(135deg,rgba(37,244,238,.06),rgba(254,44,85,.06));">
        <div class="small"><strong>TikTok Photo ≠ IG Carrusel</strong> · vertical 9:16 · foto 1 obliga a deslizar · texto corto sobre imagen · sonido trending · swipe completion + replays mandan.</div>
      </div>

      <div class="gx-panel">
        <label class="gx-label">Tema / idea / URL</label>
        <textarea id="ph-tema" class="gx-input" rows="2" placeholder="Ej: '5 apps de IA que cambian el juego' · una idea · link"></textarea>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">👥</span> Audiencia Personalizada <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Edad</label><select id="ph-edad" class="gx-input">${opts(EDADES)}</select></div>
              <div><label class="gx-mini">Género</label><select id="ph-genero" class="gx-input">${opts(GENEROS)}</select></div>
              <div><label class="gx-mini">Región</label><select id="ph-region" class="gx-input">${opts(REGIONES)}</select></div>
              <div><label class="gx-mini">Idioma / variante</label><select id="ph-idioma" class="gx-input">${opts(IDIOMAS)}</select></div>
              <div><label class="gx-mini">Nivel del público</label><select id="ph-nivel" class="gx-input">${opts(NIVELES)}</select></div>
              <div><label class="gx-mini">Intereses (opcional)</label><input id="ph-intereses" class="gx-input" placeholder="ej: IA, fitness, finanzas"></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse" open>
          <summary class="gx-summary"><span class="gx-sum-ico">📸</span> Opciones del Photo set <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div style="margin-bottom:12px;">
              <label class="gx-mini">Cantidad de fotos</label>
              <div class="gx-seg" id="ph-n-seg">
                ${['3', '4', '5', '6', '7', '8', '10'].map((v) => `<button type="button" class="gx-seg-btn${v === '6' ? ' on' : ''}" data-v="${v}">${v}</button>`).join('')}
              </div>
              <input type="hidden" id="ph-n" value="6">
            </div>
            <div class="gx-grid">
              <div><label class="gx-mini">Tipo</label><select id="ph-tipo" class="gx-input">${opts(TIPOS)}</select></div>
              <div><label class="gx-mini">Objetivo</label><select id="ph-modo" class="gx-input">${opts(MODES)}</select></div>
              <div><label class="gx-mini">Modelo de imagen</label><select id="ph-model" class="gx-input">${opts(MODELOS)}</select></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">🎨</span> Estética avanzada <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Estilo visual</label><select id="ph-estilo" class="gx-input">${opts(ESTILOS)}</select></div>
              <div><label class="gx-mini">Paleta</label><select id="ph-paleta" class="gx-input">${opts(PALETAS)}</select></div>
              <div><label class="gx-mini">Mood</label><select id="ph-mood" class="gx-input">${opts(MOODS)}</select></div>
              <div><label class="gx-mini">Densidad de texto</label><select id="ph-dens" class="gx-input">${opts(DENSIDAD)}</select></div>
            </div>
          </div>
        </details>

        <div class="btn-row" style="margin-top:14px;gap:8px;">
          <button class="btn primary" id="ph-plan">📋 Planear photo set</button>
          <button class="btn" id="ph-render">🎨 Generar imágenes (IA)</button>
        </div>

        <div class="ph-tools">
          <div class="ph-tools-label">O que FeedIA edite por vos (Computer Use / web):</div>
          <div class="ph-tools-row">
            <button class="btn ghost tiny ph-tool" data-tool="canva" data-kind="app">🎨 Canva (CU)</button>
            <button class="btn ghost tiny ph-tool" data-tool="photopea" data-kind="web" data-url="https://www.photopea.com">🖼️ Editor imagen (Photopea)</button>
            <button class="btn ghost tiny ph-tool" data-tool="nano-banana" data-kind="web" data-url="https://fal.ai/models/fal-ai/nano-banana">🍌 Nano Banana</button>
            <button class="btn ghost tiny ph-tool" data-tool="gpt-image" data-kind="web" data-url="https://fal.ai/models/fal-ai/gpt-image-1">🎨 gpt-image</button>
          </div>
        </div>
      </div>

      <!-- Lienzo: recuadro 9:16 que muestra la imagen generada por IA -->
      <div class="ph-canvas-wrap">
        <div class="ph-canvas-head">
          <span>🖼️ Lienzo · vista previa 9:16</span>
          <span class="small muted" id="ph-canvas-meta">vacío</span>
        </div>
        <div class="ph-frame" id="ph-frame">
          <div class="ph-frame-empty" id="ph-frame-empty">
            <div style="font-size:34px;">🖼️</div>
            <div class="small muted" style="margin-top:8px;text-align:center;">Tu imagen 9:16 aparece acá.<br>Usá "Generar imágenes (IA)" o editá en Canva/Photopea.</div>
          </div>
          <img id="ph-frame-img" alt="imagen generada" style="display:none;">
        </div>
        <div class="ph-thumbs" id="ph-thumbs"></div>
      </div>

      <div id="ph-result"></div>
    </div>
    <style>
      /* Panel claro (mismas reglas que Guion) */
      .gx-panel{background:#fff;border:1px solid #E3E6EB;border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .gx-label{display:block;font-size:14px;font-weight:700;color:#15181E;margin-bottom:8px;}
      .gx-mini{display:block;font-size:12px;font-weight:600;color:#475067;margin-bottom:5px;}
      .gx-input{width:100%;box-sizing:border-box;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:13px 15px;font-size:15px;font-family:inherit;outline:none;transition:border-color .15s,box-shadow .15s;}
      .gx-input::placeholder{color:#98A1B3;}
      .gx-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      textarea.gx-input{resize:vertical;line-height:1.5;}
      select.gx-input{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:40px;
        background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2398A1B3' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");
        background-repeat:no-repeat;background-position:right 14px center;}
      .gx-collapse{margin-top:12px;border:1px solid #E3E6EB;border-radius:12px;background:#fff;overflow:hidden;}
      .gx-summary{display:flex;align-items:center;gap:10px;padding:14px 15px;font-size:15px;font-weight:700;color:#15181E;cursor:pointer;list-style:none;user-select:none;}
      .gx-summary::-webkit-details-marker{display:none;}
      .gx-sum-ico{font-size:16px;}
      .gx-chev{margin-left:auto;color:#98A1B3;font-size:18px;transition:transform .2s;line-height:1;}
      .gx-collapse[open] .gx-chev{transform:rotate(180deg);}
      .gx-body{padding:0 15px 16px;}
      .gx-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;}
      .gx-seg{display:flex;flex-wrap:wrap;gap:6px;background:#F2F4F7;border:1px solid #E3E6EB;border-radius:12px;padding:5px;}
      .gx-seg-btn{flex:1;min-width:42px;border:0;background:transparent;color:#475067;font-size:14px;font-weight:700;padding:9px 6px;border-radius:9px;cursor:pointer;transition:all .15s;}
      .gx-seg-btn:hover{background:#E7EAF0;}
      .gx-seg-btn.on{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      /* Herramientas CU / web — chips modernos */
      .ph-tools{margin-top:16px;border-top:1px solid #EEF0F4;padding-top:14px;}
      .ph-tools-label{font-size:11px;font-weight:600;color:#667085;margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
      .ph-tools-row{display:flex;gap:8px;flex-wrap:wrap;}
      .ph-tool{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#15181E !important;background:#fff !important;border:1px solid #E3E6EB !important;border-radius:999px !important;padding:9px 14px !important;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s;}
      .ph-tool:hover{transform:translateY(-2px);border-color:#FE2C55 !important;box-shadow:0 5px 14px rgba(254,44,85,.18);background:linear-gradient(135deg,rgba(37,244,238,.08),rgba(254,44,85,.08)) !important;}
      /* Lienzo 9:16 */
      .ph-canvas-wrap{background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:14px;padding:14px;margin-bottom:14px;}
      .ph-canvas-head{display:flex;justify-content:space-between;align-items:center;font-weight:700;font-size:14px;margin-bottom:10px;}
      .ph-frame{position:relative;width:100%;max-width:300px;margin:0 auto;aspect-ratio:9/16;border-radius:18px;overflow:hidden;background:#0c0c10;border:2px solid #2a2a33;box-shadow:0 8px 30px rgba(0,0,0,.35);}
      .ph-frame img{width:100%;height:100%;object-fit:cover;display:block;}
      .ph-frame-empty{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px;}
      .ph-thumbs{display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:12px;}
      .ph-thumb{width:46px;aspect-ratio:9/16;border-radius:7px;overflow:hidden;border:2px solid transparent;cursor:pointer;background:#0c0c10;}
      .ph-thumb.on{border-color:#FE2C55;}
      .ph-thumb img{width:100%;height:100%;object-fit:cover;display:block;}
      /* Resultado (tema oscuro de la app) */
      .ph-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:10px;}
      .ph-slot{background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:10px;overflow:hidden;}
      .ph-slot img{width:100%;aspect-ratio:9/16;object-fit:cover;display:block;}
      .ph-slot-body{padding:8px;}
      .ph-role{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#FE2C55;}
      .ph-text{font-size:12px;margin-top:2px;}
      .ph-skel{aspect-ratio:9/16;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(45deg,rgba(255,255,255,.03),rgba(255,255,255,.03) 10px,transparent 10px,transparent 20px);}
      .ph-prompt{margin-top:6px;}
      .ph-prompt summary{font-size:10px;color:var(--text-dim,#9CA3AF);cursor:pointer;}
      .ph-prompt .small{font-size:11px;white-space:pre-wrap;color:var(--text-dim,#9CA3AF);margin-top:4px;}
    </style>`;

  const val = (id) => root.querySelector(id)?.value ?? '';
  const temaEl = () => val('#ph-tema').trim();
  const getAudiencia = () => ({
    edad: val('#ph-edad'),
    genero: val('#ph-genero'),
    region: val('#ph-region'),
    idioma: val('#ph-idioma'),
    nivel: val('#ph-nivel'),
    intereses: val('#ph-intereses').trim(),
  });

  // Segmented cantidad de fotos
  root.querySelector('#ph-n-seg')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.gx-seg-btn');
    if (!btn) return;
    root.querySelectorAll('#ph-n-seg .gx-seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    root.querySelector('#ph-n').value = btn.dataset.v;
  });

  // Herramientas: Canva (Computer Use) o editores web
  root.querySelectorAll('.ph-tool').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tool = btn.dataset.tool;
      if (btn.dataset.kind === 'app') {
        const { error } = await apiSafe('/api/cu/apps/launch', null, { method: 'POST', body: { app: tool } });
        toast(
          error
            ? `📡 CU no disponible (demo). Activá Computer Use para operar ${tool}.`
            : `${tool} abierto · Computer Use editando 🖱️`,
          error ? 'warn' : 'ok',
        );
      } else {
        const o = await openExternal(btn.dataset.url);
        toast(o.shownModal ? `🔗 ${tool} abierto en otra pestaña` : `${tool} abierto`, 'info');
      }
    });
  });

  // Lienzo 9:16: muestra la imagen generada + thumbs para cambiar
  const frameImg = root.querySelector('#ph-frame-img');
  const frameEmpty = root.querySelector('#ph-frame-empty');
  const thumbsEl = root.querySelector('#ph-thumbs');
  const metaEl = root.querySelector('#ph-canvas-meta');
  const srcOf = (s, jobId) =>
    s.url ? s.url : `/api/skills/carousel/slide/${encodeURIComponent(jobId ?? '')}/${encodeURIComponent(s.name ?? s)}`;
  const setFrame = (src) => {
    frameImg.src = src;
    frameImg.style.display = 'block';
    frameEmpty.style.display = 'none';
  };
  const showCanvas = (slides, jobId) => {
    const list = (slides ?? []).map((s) => srcOf(s, jobId)).filter(Boolean);
    if (!list.length) return;
    setFrame(list[0]);
    metaEl.textContent = `${list.length} foto${list.length > 1 ? 's' : ''} · 9:16`;
    thumbsEl.innerHTML = list
      .map(
        (src, i) =>
          `<div class="ph-thumb${i === 0 ? ' on' : ''}" data-i="${i}"><img src="${escape(src)}" alt="foto ${i + 1}" onerror="this.parentElement.style.display='none'"></div>`,
      )
      .join('');
    thumbsEl.querySelectorAll('.ph-thumb').forEach((t) =>
      t.addEventListener('click', () => {
        thumbsEl.querySelectorAll('.ph-thumb').forEach((x) => x.classList.remove('on'));
        t.classList.add('on');
        setFrame(list[Number(t.dataset.i)]);
      }),
    );
  };

  const renderPlan = (photos, tipo, tema, data, error) => {
    const tag = error
      ? '<span class="tag tiny warn">local</span>'
      : data?.simulated
        ? '<span class="tag tiny warn">sin ANTHROPIC_API_KEY</span>'
        : '<span class="tag tiny ok">agentes IA</span>';
    return `
      <div class="card">
        <div class="row spread" style="margin-bottom:6px;"><h3 style="margin:0;">📋 ${escape(tipo)} · ${escape(tema)}</h3>${tag}</div>
        <div class="ph-grid">
          ${photos
            .map(
              (s) => `
            <div class="ph-slot">
              <img src="${_photoSlotSvg(s.n, s.role, s.text)}" style="width:100%;aspect-ratio:9/16;object-fit:cover;display:block;border-radius:4px 4px 0 0;">
              <div class="ph-slot-body">
                <div class="ph-role">${s.n}. ${escape(s.role)}</div>
                <div class="ph-text">${escape(s.text)}</div>
                ${s.prompt ? `<details class="ph-prompt"><summary>🎨 prompt perfeccionado</summary><div class="small">${escape(s.prompt)}</div></details>` : ''}
              </div>
            </div>`,
            )
            .join('')}
        </div>
        ${data?.caption ? `<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${escape(data.caption)}</div></div>` : ''}
        ${data?.hashtags ? `<div class="small muted" style="margin-top:6px;">${escape(data.hashtags)}</div>` : ''}
        ${data?.sonido ? `<div class="small muted" style="margin-top:4px;">🎵 Sonido: ${escape(data.sonido)}</div>` : ''}
        <div class="small muted" style="margin-top:10px;">💡 "Generar imágenes" produce los PNG 9:16 desde estos prompts. Skill: <code>/feedIA-tiktok-photo</code></div>
      </div>`;
  };

  root.querySelector('#ph-plan').addEventListener('click', async () => {
    const tema = temaEl();
    if (!tema) {
      toast('Escribí un tema', 'warn');
      return;
    }
    const n = Number(val('#ph-n'));
    const tipo = val('#ph-tipo');
    const resultEl = root.querySelector('#ph-result');
    resultEl.innerHTML = `<div class="card"><span class="spinner"></span> El equipo TikTok + imagen está planeando…</div>`;
    const { data, error } = await apiSafe('/api/skills/tiktok/photo', null, {
      method: 'POST',
      body: {
        tema,
        fotos: n,
        tipo,
        modelo: val('#ph-model'),
        modo: val('#ph-modo'),
        estilo: val('#ph-estilo'),
        paleta: val('#ph-paleta'),
        mood: val('#ph-mood'),
        densidad: val('#ph-dens'),
        audiencia: getAudiencia(),
      },
    });
    const photos = (data?.photos ?? []).length ? data.photos : localPlan(tema, n);
    resultEl.innerHTML = renderPlan(photos, tipo, tema, data, error);
    if (photos.length) {
      setFrame(_photoSlotSvg(photos[0].n, photos[0].role, photos[0].text));
      metaEl.textContent = `${photos.length} foto${photos.length > 1 ? 's' : ''} · plan IA`;
    }
    toast('Photo set listo', 'ok');
  });

  root.querySelector('#ph-render').addEventListener('click', async () => {
    const tema = temaEl();
    if (!tema) {
      toast('Escribí un tema', 'warn');
      return;
    }
    const model = val('#ph-model');
    const resultEl = root.querySelector('#ph-result');
    resultEl.innerHTML = `<div class="card"><span class="spinner"></span> Generando fotos 9:16…</div>`;
    const { data: r, error } = await apiSafe('/api/skills/carousel/generate', null, {
      method: 'POST',
      body: { input: tema, model, format: 'historia' },
    });
    if (error || !r) {
      resultEl.innerHTML = `<div class="card"><div class="small muted">📡 Backend offline. Usá "Planear photo set" o Canva (Computer Use).</div></div>`;
      return;
    }
    if (r.hasFalKey === false || r.status === 'plan-only') {
      resultEl.innerHTML = `<div class="card" style="border-color:rgba(245,158,11,.4);"><strong>⚠️ Falta FAL_KEY</strong><div class="small muted" style="margin-top:6px;">Configurá FAL_KEY para render real, o usá camino Canva.</div></div>`;
      return;
    }
    const renderImgs = (slides) =>
      `<div class="ph-grid">${(slides ?? [])
        .map((s) => {
          const src = s.url
            ? s.url
            : `/api/skills/carousel/slide/${encodeURIComponent(r.jobId ?? '')}/${encodeURIComponent(s.name ?? s)}`;
          return `<div class="ph-slot"><img src="${escape(src)}" alt="foto ${escape(String(s.num ?? ''))}" onerror="this.parentElement.style.display='none'"></div>`;
        })
        .join('')}</div>`;

    if (r.status) {
      resultEl.innerHTML = `<div class="card"><div class="row spread" style="margin-bottom:8px;"><strong>${r.status === 'done' ? '✅ Fotos listas' : r.status === 'error' ? '⚠️ Error' : '🔄 ' + escape(r.status)}</strong><span class="small muted">9:16 · ${escape(model)}</span></div>${r.error ? `<div class="small crit">${escape(r.error)}</div>` : ''}${renderImgs(r.slides)}${r.caption ? `<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${escape(r.caption)}</div></div>` : ''}</div>`;
      showCanvas(r.slides, r.jobId);
      toast(r.status === 'done' ? '🎉 Fotos generadas' : 'Generación con error', r.status === 'error' ? 'warn' : 'ok');
      return;
    }
    if (r.jobId) {
      stopPoll();
      const t0 = Date.now();
      pollTimer = setInterval(async () => {
        if (Date.now() - t0 > 180000) {
          stopPoll();
          return;
        }
        const { data: st } = await apiSafe(`/api/skills/carousel/status/${r.jobId}`, null);
        if (!st) return;
        resultEl.innerHTML = `<div class="card"><strong>${st.status === 'done' ? '✅ Fotos listas' : '🔄 ' + escape(st.status)}</strong>${renderImgs(st.slides)}</div>`;
        if (st.slides?.length) showCanvas(st.slides, r.jobId);
        if (['done', 'error', 'plan-only'].includes(st.status)) stopPoll();
      }, 2000);
    }
  });
};
