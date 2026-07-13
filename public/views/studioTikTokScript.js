/* ══════════════════════════════════════════════════════════════════════════════
   STUDIO TIKTOK SCRIPT — Guion de video TikTok beat a beat (elocuencia + no verbal)
   ──────────────────────────────────────────────────────────────────────────────
   Input → guion con hook 0-2s, beats (guion/voz/lenguaje no verbal/on-screen/visual),
   caption + hashtags + sonido. Backend /api/skills/tiktok/script si existe; si no,
   guía + plantilla local. Refleja la skill /feedIA-tiktok-script.
   Recuadros blancos (panel claro), audiencia personalizada (edad/género/región/idioma/
   nivel con opción Todos) y más opciones de guion.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const FORMATS = [
  { v: 'talking-head', l: '🎤 Talking head' },
  { v: 'pov', l: '👁️ POV' },
  { v: 'storytime', l: '📖 Storytime' },
  { v: 'tutorial', l: '🛠️ Tutorial 30s' },
  { v: 'trend', l: '🔥 Trend / sound' },
  { v: 'listicle', l: '🔢 Listicle (top X)' },
  { v: 'reaction', l: '😮 Reacción' },
  { v: 'duet-stitch', l: '🔗 Duet / Stitch' },
  { v: 'mythbusting', l: '❌ Mito vs realidad' },
  { v: 'before-after', l: '↔️ Antes / después' },
  { v: 'day-in-life', l: '🌅 Día en mi vida' },
  { v: 'unboxing', l: '📦 Unboxing / demo' },
  { v: 'green-screen', l: '🟩 Green screen (noticia)' },
  { v: 'voiceover-broll', l: '🎙️ Voz en off + b-roll' },
  { v: 'skit', l: '🎭 Skit / sketch' },
  { v: 'challenge', l: '🏆 Challenge' },
  { v: 'asmr', l: '🤫 ASMR / satisfying' },
  { v: 'street-interview', l: '🎤 Entrevista en calle' },
];
const MODES = [
  { v: 'entretener', l: '😂 Entretener' },
  { v: 'educar', l: '🎓 Educar' },
  { v: 'emocionar', l: '❤️ Emocionar' },
  { v: 'vender', l: '🛒 Vender (soft sell)' },
  { v: 'inspirar', l: '🚀 Inspirar' },
];
const TONOS = [
  { v: 'cercano', l: '🫶 Cercano / amigo' },
  { v: 'autoridad', l: '🎓 Autoridad experta' },
  { v: 'humor', l: '😂 Humor' },
  { v: 'contrarian', l: '🔥 Polémico / contrarian' },
  { v: 'inspirador', l: '✨ Inspirador' },
  { v: 'directo', l: '⚡ Directo / sin vueltas' },
];
const GANCHOS = [
  { v: 'auto', l: '🤖 Auto (mejor según tema)' },
  { v: 'numero', l: '🔢 Número / dato' },
  { v: 'contradiccion', l: '🤯 Contradicción' },
  { v: 'pov', l: '👁️ POV' },
  { v: 'pregunta', l: '❓ Pregunta directa' },
  { v: 'error', l: '🚫 Error común' },
  { v: 'resultado', l: '🎯 Promesa de resultado' },
  { v: 'curiosidad', l: '🕳️ Curiosity gap' },
  { v: 'storytime', l: '📖 "Te cuento qué pasó"' },
];
const CTAS = [
  { v: 'comentar', l: '💬 Comentarios' },
  { v: 'seguir', l: '➕ Seguir' },
  { v: 'guardar', l: '🔖 Guardar' },
  { v: 'compartir', l: '↗️ Compartir / send' },
  { v: 'link', l: '🔗 Link / bio' },
  { v: 'vender', l: '🛒 Venta' },
];
const RITMOS = [
  { v: 'rapido', l: '⚡ Rápido (cortes 1-2s)' },
  { v: 'medio', l: '🎵 Medio (2-4s)' },
  { v: 'lento', l: '🌊 Lento / narrativo' },
];

const PLATAFORMAS = [
  { v: 'tiktok', l: '🎵 TikTok' },
  { v: 'reels', l: '📸 Reels (IG)' },
  { v: 'shorts', l: '▶️ Shorts (YT)' },
  { v: 'todas', l: '🌐 Las 3 (adaptar)' },
];
const SUBS = [
  { v: 'si', l: '✅ Sí (recomendado)' },
  { v: 'no', l: '❌ No' },
];
const BROLL = [
  { v: 'si', l: '🎞️ Sí, sugerir b-roll' },
  { v: 'no', l: '➖ No' },
];
const DENSIDAD = [
  { v: 'media', l: '◧ Media' },
  { v: 'minima', l: '▫️ Mínima' },
  { v: 'alta', l: '▦ Alta' },
];

// ── Audiencia (opción "Todos" en todos) ──────────────────────────────────────
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

const localGuide = (tema, dur, fmt, modo) => `
  <div class="card">
    <h3>📋 Plantilla de guion · ${escape(tema || 'tu tema')}</h3>
    <p class="small muted">${escape(modo)} · ${escape(fmt)} · ${dur}s · 9:16. Completá cada beat con las 5 capas.</p>
    <div class="ttk-beats">
      ${[
        {
          t: 'HOOK (0-2s)',
          g: 'Frase que detiene el scroll (número/contradicción/POV). 6-10 palabras.',
          nv: 'cejas arriba, mano que frena, mirada fija a lente',
          os: 'gancho escrito grande',
        },
        {
          t: 'PROMESA (2-5s)',
          g: 'Qué gana si se queda. Abre un loop.',
          nv: 'acercarse a cámara, ritmo sube',
          os: '"esperá al paso 3"',
        },
        {
          t: 'DESARROLLO 1',
          g: '1 idea concreta. Micro-cliffhanger.',
          nv: 'gesto que enumera, corte de plano',
          os: 'palabra clave',
        },
        {
          t: 'DESARROLLO 2',
          g: 'Segunda idea. Sube tensión.',
          nv: 'cambio de encuadre, energía',
          os: 'dato/cifra real',
        },
        {
          t: 'PAYOFF',
          g: 'El insight/giro que prometiste.',
          nv: 'pausa, baja la voz, mirada directa',
          os: 'la revelación',
        },
        {
          t: 'CTA + LOOP',
          g: 'Invitá a comentar/seguir. Última línea reconecta con el hook (rewatch).',
          nv: 'señalar comentarios, sonrisa',
          os: 'CTA corto',
        },
      ]
        .map(
          (b, i) => `
        <div class="ttk-beat">
          <div class="ttk-beat-num">${i + 1}</div>
          <div>
            <div class="ttk-beat-title">${b.t}</div>
            <div class="small"><strong>Guion:</strong> ${escape(b.g)}</div>
            <div class="small muted"><strong>No verbal:</strong> ${escape(b.nv)}</div>
            <div class="small muted"><strong>On-screen:</strong> ${escape(b.os)}</div>
          </div>
        </div>`,
        )
        .join('')}
    </div>
    <div class="small muted" style="margin-top:12px;">💡 Para guion completo redactado por IA con tu voz de marca, conectá backend o pedilo por voz: <code>/feedIA-tiktok-script</code>.</div>
  </div>`;

export const renderTikTokScript = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">✍️ Guion TikTok</h1>
        <p class="view-subtitle page-subtitle">Guion beat a beat con elocuencia, lenguaje no verbal (gestos/expresiones/mirada) y ganchos de retención. Pensado para completion rate.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="gx-panel">
        <label class="gx-label">Tema del Video</label>
        <textarea id="ttk-tema" class="gx-input" rows="2" placeholder="p. ej., 'Abriendo un gadget tecnológico misterioso'"></textarea>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">👥</span> Audiencia Personalizada <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Edad</label><select id="ttk-edad" class="gx-input">${opts(EDADES)}</select></div>
              <div><label class="gx-mini">Género</label><select id="ttk-genero" class="gx-input">${opts(GENEROS)}</select></div>
              <div><label class="gx-mini">Región</label><select id="ttk-region" class="gx-input">${opts(REGIONES)}</select></div>
              <div><label class="gx-mini">Idioma / variante</label><select id="ttk-idioma" class="gx-input">${opts(IDIOMAS)}</select></div>
              <div><label class="gx-mini">Nivel del público</label><select id="ttk-nivel" class="gx-input">${opts(NIVELES)}</select></div>
              <div><label class="gx-mini">Intereses (opcional)</label><input id="ttk-intereses" class="gx-input" placeholder="ej: IA, fitness, finanzas"></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse" open>
          <summary class="gx-summary"><span class="gx-sum-ico">🎬</span> Opciones del Video <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div style="margin-bottom:12px;">
              <label class="gx-mini">Duración</label>
              <div class="gx-seg" id="ttk-dur-seg">
                ${[
                  ['7', '7s'],
                  ['15', '15s'],
                  ['30', '30s'],
                  ['45', '45s'],
                  ['60', '60s'],
                  ['90', '90s'],
                  ['180', '3 min'],
                ]
                  .map(
                    ([v, l]) =>
                      `<button type="button" class="gx-seg-btn${v === '30' ? ' on' : ''}" data-v="${v}">${l}</button>`,
                  )
                  .join('')}
              </div>
              <input type="hidden" id="ttk-dur" value="30">
            </div>
            <div class="gx-grid">
              <div><label class="gx-mini">Tipo de video</label><select id="ttk-fmt" class="gx-input">${opts(FORMATS)}</select></div>
              <div><label class="gx-mini">Objetivo</label><select id="ttk-modo" class="gx-input">${opts(MODES)}</select></div>
              <div><label class="gx-mini">Tono</label><select id="ttk-tono" class="gx-input">${opts(TONOS)}</select></div>
              <div><label class="gx-mini">Tipo de gancho</label><select id="ttk-gancho" class="gx-input">${opts(GANCHOS)}</select></div>
              <div><label class="gx-mini">Objetivo del CTA</label><select id="ttk-cta" class="gx-input">${opts(CTAS)}</select></div>
              <div><label class="gx-mini">Ritmo de edición</label><select id="ttk-ritmo" class="gx-input">${opts(RITMOS)}</select></div>
            </div>
          </div>
        </details>

        <details class="gx-collapse">
          <summary class="gx-summary"><span class="gx-sum-ico">⚙️</span> Opciones Avanzadas <span class="gx-chev">⌄</span></summary>
          <div class="gx-body">
            <div class="gx-grid">
              <div><label class="gx-mini">Plataforma destino</label><select id="ttk-plat" class="gx-input">${opts(PLATAFORMAS)}</select></div>
              <div><label class="gx-mini">Subtítulos</label><select id="ttk-subs" class="gx-input">${opts(SUBS)}</select></div>
              <div><label class="gx-mini">B-roll sugerido</label><select id="ttk-broll" class="gx-input">${opts(BROLL)}</select></div>
              <div><label class="gx-mini">Densidad texto en pantalla</label><select id="ttk-dens" class="gx-input">${opts(DENSIDAD)}</select></div>
              <div><label class="gx-mini">CTA exacto (opcional)</label><input id="ttk-ctatxt" class="gx-input" placeholder='ej: "Comentá IA y te paso la lista"'></div>
              <div><label class="gx-mini">Palabras / temas a evitar</label><input id="ttk-evitar" class="gx-input" placeholder="ej: política, precios"></div>
            </div>
          </div>
        </details>

        <button class="btn primary" id="ttk-go" style="margin-top:14px;width:100%;">✍️ Armar guion inteligente</button>
        <div class="btn-row" style="margin-top:8px;gap:6px;flex-wrap:wrap;">
          <button class="btn ghost tiny" id="ttk-hooks">🪝 10 hooks 0-2s</button>
          <button class="btn ghost tiny" id="ttk-retention">🎯 Checklist retención</button>
          <button class="btn ghost tiny" id="ttk-capcut">🎬 Editar en CapCut (CU)</button>
        </div>
      </div>
      <div id="ttk-result"></div>
    </div>
    <style>
      /* Panel claro estilo referencia (recuadros blancos, bordes suaves) */
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
      .gx-seg-btn{flex:1;min-width:52px;border:0;background:transparent;color:#475067;font-size:13px;font-weight:700;padding:9px 6px;border-radius:9px;cursor:pointer;transition:all .15s;}
      .gx-seg-btn:hover{background:#E7EAF0;}
      .gx-seg-btn.on{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      /* Beats (resultado) — se mantienen en tema oscuro de la app */
      .ttk-beats{display:flex;flex-direction:column;gap:8px;margin-top:10px;}
      .ttk-beat{display:flex;gap:12px;padding:10px;background:var(--bg-elev,#1c1c22);border:1px solid var(--border);border-radius:10px;}
      .ttk-beat-num{width:24px;height:24px;border-radius:50%;background:linear-gradient(135deg,#25F4EE,#FE2C55);color:#fff;font-size:12px;font-weight:800;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .ttk-beat-title{font-weight:700;font-size:13px;margin-bottom:3px;}
    </style>`;

  const HOOKS = [
    'El 90% lo hace mal (y ni lo sabe)',
    'Dejá de [error común] ya',
    'POV: sos [situación]',
    'Esto nadie te lo dice',
    'Perdí [X] para aprender esto',
    'Cómo [resultado] en [tiempo]',
    'Si sos [nicho], parate',
    'NO hagas [X] hasta ver esto',
    'La verdad sobre [tema]',
    'Mirá lo que pasa cuando [acción]',
  ];
  root.querySelector('#ttk-hooks').addEventListener('click', () => {
    const tema = root.querySelector('#ttk-tema').value.trim() || 'tu tema';
    root.querySelector('#ttk-result').innerHTML =
      `<div class="card"><h3>🪝 Hooks 0-2s (verbal + visual + on-screen)</h3>
      ${HOOKS.map(
        (h, i) => `<div class="ttk-beat"><div class="ttk-beat-num">${i + 1}</div><div>
        <div class="ttk-beat-title">${escape(h.replace('[tema]', tema.slice(0, 30)))}</div>
        <div class="small muted"><strong>Visual:</strong> pattern interrupt (zoom/corte) segundo 0 · <strong>On-screen:</strong> el hook escrito grande</div>
      </div></div>`,
      ).join('')}
      <div class="small muted" style="margin-top:10px;">Más: <code>/feedIA-tiktok-hooks</code></div></div>`;
    toast('10 hooks listos', 'ok');
  });
  root.querySelector('#ttk-retention').addEventListener('click', () => {
    root.querySelector('#ttk-result').innerHTML =
      `<div class="card"><h3>🎯 Checklist de retención (completion rate)</h3>
      <ul class="small" style="line-height:1.9;">
        <li>✅ Hook 0-2s: verbal + visual + on-screen text juntos</li>
        <li>✅ Open loop en el hook ("al final te digo…")</li>
        <li>✅ 1 idea por beat + micro-cliffhanger</li>
        <li>✅ Corte / pattern interrupt cada 2-4s</li>
        <li>✅ Ritmo creciente hacia el payoff</li>
        <li>✅ On-screen text que adelanta ("esperá al paso 3")</li>
        <li>✅ Loop de cierre: última línea reconecta con el hook → rewatch</li>
        <li>✅ Sonido trending + subtítulos (consumo sin audio)</li>
        <li>✅ Export limpio sin watermark (penaliza FYP)</li>
      </ul>
      <div class="small muted">Algoritmo: <code>/feedIA-tiktok-algorithm</code></div></div>`;
  });
  root.querySelector('#ttk-capcut').addEventListener('click', () => {
    root.querySelector('#ttk-result').innerHTML = `<div class="card" style="border-left:3px solid #FE2C55;">
      <h3>🎬 Editar en CapCut vía Computer Use</h3>
      <p class="small muted">FeedIA opera CapCut: importa clips → corta al ritmo → subtítulos auto → sonido trending → loop → export 1080×1920 limpio. Requiere CUA en <strong>Auto</strong> o <strong>Asistente</strong>.</p>
      <div class="btn-row" style="gap:8px;">
        <button class="btn primary tiny" id="ttk-capcut-go">▶ Lanzar edición CU</button>
        <a class="btn ghost tiny" href="#pantalla">👀 Pantalla en vivo</a>
      </div>
      <div class="small muted" style="margin-top:8px;">Skill: <code>/feedIA-tiktok-editing</code></div></div>`;
    root.querySelector('#ttk-capcut-go')?.addEventListener('click', async () => {
      const { error } = await apiSafe('/api/cu/apps/launch', null, { method: 'POST', body: { app: 'capcut' } });
      toast(
        error ? 'Backend offline · CU no disponible en demo' : '🎬 CapCut abierto · CU operando',
        error ? 'warn' : 'ok',
      );
    });
  });

  const val = (id) => root.querySelector(id)?.value ?? '';

  // Segmented control de duración
  root.querySelector('#ttk-dur-seg')?.addEventListener('click', (e) => {
    const btn = e.target.closest('.gx-seg-btn');
    if (!btn) return;
    root.querySelectorAll('#ttk-dur-seg .gx-seg-btn').forEach((b) => b.classList.remove('on'));
    btn.classList.add('on');
    root.querySelector('#ttk-dur').value = btn.dataset.v;
  });

  root.querySelector('#ttk-go').addEventListener('click', async () => {
    const tema = root.querySelector('#ttk-tema').value.trim();
    if (!tema) {
      toast('Escribí un tema o idea', 'warn');
      return;
    }
    const dur = val('#ttk-dur');
    const fmt = val('#ttk-fmt');
    const modo = val('#ttk-modo');
    const audiencia = {
      edad: val('#ttk-edad'),
      genero: val('#ttk-genero'),
      region: val('#ttk-region'),
      idioma: val('#ttk-idioma'),
      nivel: val('#ttk-nivel'),
      intereses: val('#ttk-intereses').trim(),
    };
    const resultEl = root.querySelector('#ttk-result');
    resultEl.innerHTML = `<div class="card"><span class="spinner"></span> Armando guion…</div>`;

    const { data, error } = await apiSafe('/api/skills/tiktok/script', null, {
      method: 'POST',
      body: {
        tema,
        duracion: Number(dur),
        formato: fmt,
        modo,
        tono: val('#ttk-tono'),
        gancho: val('#ttk-gancho'),
        cta: val('#ttk-cta'),
        ritmo: val('#ttk-ritmo'),
        audiencia,
        plataforma: val('#ttk-plat'),
        subtitulos: val('#ttk-subs'),
        broll: val('#ttk-broll'),
        densidad: val('#ttk-dens'),
        ctaTexto: val('#ttk-ctatxt').trim(),
        evitar: val('#ttk-evitar').trim(),
      },
    });
    if (error || !data) {
      resultEl.innerHTML = localGuide(tema, dur, fmt, modo);
      toast('Plantilla local lista (backend offline)', 'info');
      return;
    }
    if (data.beatsHtml) {
      resultEl.innerHTML = `<div class="card">${data.beatsHtml}</div>`;
    } else if (data.beats) {
      resultEl.innerHTML = `<div class="card"><h3>${escape(data.title ?? 'Guion')}</h3>${data.beats
        .map(
          (b, i) => `
        <div class="ttk-beat"><div class="ttk-beat-num">${i + 1}</div><div>
          <div class="ttk-beat-title">${escape(b.tipo ?? '')} ${b.duracion ? `· ${escape(String(b.duracion))}s` : ''}</div>
          <div class="small"><strong>Guion:</strong> ${escape(b.guion ?? b.vozEnOff ?? '')}</div>
          <div class="small muted"><strong>No verbal:</strong> ${escape(b.noVerbal ?? '—')}</div>
          <div class="small muted"><strong>On-screen:</strong> ${escape(b.onScreen ?? b.textoEnPantalla ?? '')}</div>
        </div></div>`,
        )
        .join('')}
        ${data.caption ? `<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${escape(data.caption)}</div></div>` : ''}
        ${data.hashtags ? `<div class="small muted" style="margin-top:6px;">${escape(data.hashtags)}</div>` : ''}
        ${data.sonido ? `<div class="small muted" style="margin-top:4px;">🎵 ${escape(data.sonido)}</div>` : ''}</div>`;
    } else {
      resultEl.innerHTML = localGuide(tema, dur, fmt, modo);
    }
    toast('Guion listo 🎬', 'ok');
  });
};
