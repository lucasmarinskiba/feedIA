/* ══════════════════════════════════════════════════════════════════════════════
   WORKSPACE TOOLS — 7 herramientas que componen datos ya existentes
   Aprobaciones · Bitácora · Alertas · Kanban · Moodboard · Reportes · Simulador
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';
import { speak, stopSpeaking } from '../lib/voice.js';

let _narrating = false;
const narrate = async (btn, text) => {
  if (_narrating) {
    stopSpeaking();
    _narrating = false;
    btn.textContent = '🔊 Escuchar';
    return;
  }
  _narrating = true;
  btn.textContent = '⏹ Detener';
  await speak(text);
  _narrating = false;
  btn.textContent = '🔊 Escuchar';
};

const shell = (root, title, sub, bodyId) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">${title}</h1>
        <p class="view-subtitle page-subtitle">${sub}</p>
      </div>
    </header>
    <div id="${bodyId}" class="page-body">${loadingScreen()}</div>`;
  return root.querySelector('#' + bodyId);
};

/* ── Bandeja de Aprobaciones ─────────────────────────────────────────────── */
export const renderApprovals = async (root) => {
  const host = shell(
    root,
    '✅ Bandeja de Aprobaciones',
    'Todo lo que FeedIA dejó esperando tu OK, en un solo lugar.',
    'ap-body',
  );
  const load = async () => {
    // Combina /api/approvals (legacy) con /api/cu/mode/pending-approvals (CUA mode)
    const [genericRes, cuaRes] = await Promise.all([
      apiSafe('/api/approvals', { count: 0, items: [] }),
      apiSafe('/api/cu/mode/pending-approvals', []),
    ]);
    const generic = genericRes.data ?? { count: 0, items: [] };
    const cuaPending = Array.isArray(cuaRes.data) ? cuaRes.data : [];
    const isOffline = !!genericRes.error && !!cuaRes.error;

    // Normalizo CUA approvals al formato genérico
    const cuaItems = cuaPending.map((a) => ({
      kind: 'cua',
      title: a.action || 'Acción del Computer Use Agent',
      detail: a.context || a.workflow || 'Esperando aprobación',
      createdAt: a.createdAt || new Date().toISOString(),
      actionableId: a.id,
      _cua: true,
    }));
    const allItems = [...cuaItems, ...(generic.items ?? [])];
    const total = allItems.length;

    host.innerHTML = `
      ${
        isOffline
          ? `<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">📡 Backend offline · mostrando bandeja vacía. Volvemos cuando el server responda.</span>
      </div>`
          : ''
      }
      ${
        total === 0
          ? '<div class="card" style="text-align:center;padding:36px;"><div style="font-size:42px;margin-bottom:10px;">🎉</div><div class="muted">Nada pendiente. FeedIA está al día.</div></div>'
          : `<div class="col-header"><h3 style="margin-left:12px;margin-top:12px;">Pendientes (${total})</h3></div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">` +
            allItems
              .map(
                (it) => `
          <div class="card ws-row" style="min-height:80px;display:flex;flex-direction:column;justify-content:space-between;padding:10px;${it._cua ? 'border-left:3px solid #a855f7;' : ''}">
            <div style="overflow:hidden;">
              <div class="meta">
                <span class="tag ${it.kind === 'checkpoint' ? 'warn' : it.kind === 'cua' ? 'accent' : 'info'} tiny">${escape(it.kind)}</span>
                <span class="tiny muted">${fmt.rel(it.createdAt)}</span>
              </div>
              <div class="small" style="font-weight:600;margin:6px 0 2px;">${escape(it.title)}</div>
              <div class="tiny muted">${escape(it.detail)}</div>
            </div>
            ${
              it.actionableId
                ? `<div style="display:flex;gap:6px;margin-top:10px;">
              <button class="btn primary tiny" style="flex:1;" data-ap="${escape(it.actionableId)}" data-d="approve" data-cua="${it._cua ? '1' : '0'}">✓</button>
              <button class="btn ghost tiny" style="flex:1;" data-ap="${escape(it.actionableId)}" data-d="reject" data-cua="${it._cua ? '1' : '0'}">✗</button>
            </div>`
                : '<span class="tag tiny muted">revisar en su sección</span>'
            }
          </div>`,
              )
              .join('')
          + `</div>`
      }`;

    host.querySelectorAll('[data-ap]').forEach((b) =>
      b.addEventListener('click', async () => {
        const path =
          b.dataset.cua === '1'
            ? `/api/cu/mode/${b.dataset.d === 'approve' ? 'approve' : 'reject'}/${b.dataset.ap}`
            : `/api/approvals/${b.dataset.ap}/${b.dataset.d}`;
        const { error } = await apiSafe(path, null, { method: 'POST', body: {} });
        if (error) toast('Backend offline. Lo procesamos cuando vuelva.', 'warn');
        else toast(b.dataset.d === 'approve' ? '✓ Aprobado' : '✗ Rechazado', 'ok');
        await load();
      }),
    );
  };
  await load();
};

/* ── Bitácora / Diario de la IA ──────────────────────────────────────────── */
const BITACORA_DEFAULT = { entries: [], stats: { totalTraces: 0, withOutcomes: 0, successRate: 0 } };
export const renderBitacora = async (root) => {
  const host = shell(
    root,
    '📓 Bitácora de FeedIA',
    'El diario en lenguaje humano: qué decidió, por qué y con qué resultado.',
    'bi-body',
  );
  const { data, error } = await apiSafe('/api/bitacora?limit=80', BITACORA_DEFAULT);
  const d = data ?? BITACORA_DEFAULT;
  const isOffline = !!error;
  try {
    const speech =
      d.entries.length === 0
        ? 'La bitácora está vacía. Todavía no tomé decisiones registradas.'
        : `Tengo ${d.stats.totalTraces} decisiones registradas, con ${(d.stats.successRate * 100).toFixed(0)} por ciento de acierto. Las últimas: ` +
          d.entries
            .slice(0, 6)
            .map((e) => `${e.what}. ${e.why}`)
            .join('. ');
    host.innerHTML = `
      ${
        isOffline
          ? `<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">📡 Backend offline · bitácora vacía.</span>
      </div>`
          : ''
      }
      <div class="btn-row" style="margin-bottom:12px;"><button class="btn ghost" id="bi-voice">🔊 Escuchar</button></div>
      <div class="autopilot-stat-row" style="margin-bottom:14px;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${d.stats.totalTraces}</div><div class="autopilot-stat-label">decisiones</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${d.stats.withOutcomes}</div><div class="autopilot-stat-label">con resultado</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${(d.stats.successRate * 100).toFixed(0)}%</div><div class="autopilot-stat-label">acierto</div></div>
      </div>
      ${
        d.entries.length === 0
          ? '<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin entradas todavía. A medida que FeedIA opere, su diario se llena solo.</div></div>'
          : d.entries
              .map(
                (e) => `
          <div class="card ws-log">
            <div class="meta"><span class="tag accent tiny">${escape(e.agent)}</span><span class="tiny muted">${fmt.rel(e.at)}</span>${e.outcome ? `<span class="tag ok tiny">${escape(e.outcome)}</span>` : ''}</div>
            <div class="small" style="margin:6px 0 2px;font-weight:600;">${escape(e.what)}</div>
            <div class="tiny muted">${escape(e.why)}</div>
          </div>`,
              )
              .join('')
      }`;
    host.querySelector('#bi-voice')?.addEventListener('click', (ev) => narrate(ev.currentTarget, speech));
  } catch (e) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(e.message)}</div>`;
  }
};

/* ── Centro de Alertas ───────────────────────────────────────────────────── */
const ALV = { critica: 'crit', alta: 'warn', media: 'info', info: 'muted' };
const ALERTAS_DEFAULT = { count: 0, critical: 0, alerts: [] };
export const renderAlertas = async (root) => {
  const host = shell(
    root,
    '🚨 Centro de Alertas',
    'Crisis, límites de cumplimiento y oportunidades, todo consolidado.',
    'al-body',
  );
  const { data, error } = await apiSafe('/api/alerts', ALERTAS_DEFAULT);
  const d = data ?? ALERTAS_DEFAULT;
  const isOffline = !!error;
  try {
    const speech =
      d.count === 0
        ? 'No hay alertas activas. Todo en orden.'
        : `Tenés ${d.count} alertas, ${d.critical} críticas. ` +
          d.alerts
            .slice(0, 6)
            .map((a) => `${a.source}: ${a.message}`)
            .join('. ');
    host.innerHTML = `
      ${
        isOffline
          ? `<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
        <span class="small">📡 Backend offline · sin alertas que mostrar.</span>
      </div>`
          : ''
      }
      <div class="btn-row" style="margin-bottom:12px;"><button class="btn ghost" id="al-voice">🔊 Escuchar</button></div>
      <div class="autopilot-stat-row" style="margin-bottom:14px;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${d.count}</div><div class="autopilot-stat-label">alertas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num" style="color:var(--crit)">${d.critical}</div><div class="autopilot-stat-label">críticas</div></div>
      </div>
      ${d.alerts
        .map(
          (a) => `
        <div class="card ws-row" style="border-left:3px solid var(--${ALV[a.level] === 'crit' ? 'crit' : ALV[a.level] === 'warn' ? 'warn' : ALV[a.level] === 'info' ? 'info' : 'border'});">
          <div style="flex:1;">
            <div class="meta"><span class="tag ${ALV[a.level]} tiny">${escape(a.level)}</span><span class="tag tiny">${escape(a.source)}</span><span class="tiny muted">${fmt.rel(a.at)}</span></div>
            <div class="small" style="margin-top:6px;">${escape(a.message)}</div>
          </div>
        </div>`,
        )
        .join('')}`;
    host.querySelector('#al-voice')?.addEventListener('click', (ev) => narrate(ev.currentTarget, speech));
  } catch (e) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(e.message)}</div>`;
  }
};

/* ── Tablero Kanban ──────────────────────────────────────────────────────── */
const KANBAN_DEFAULT = {
  columns: [
    { title: '💡 Idea', cards: [] },
    { title: '✍️ Producción', cards: [] },
    { title: '👀 Revisión', cards: [] },
    { title: '⏰ Programado', cards: [] },
    { title: '✅ Publicado', cards: [] },
  ],
};

export const renderKanban = async (root) => {
  const host = shell(root, '🗂 Tablero de Contenido', 'El pipeline de tus piezas: de la idea al publicado.', 'kb-body');
  const { data, error } = await apiSafe('/api/kanban', KANBAN_DEFAULT);
  const d = data && Array.isArray(data.columns) ? data : KANBAN_DEFAULT;
  const isOffline = !!error;
  const totalCards = d.columns.reduce((sum, c) => sum + (c.cards?.length ?? 0), 0);

  host.innerHTML = `
    ${
      isOffline
        ? `<div class="alert" style="background:var(--bg-elev,#1c1c22);border:1px dashed var(--border);padding:10px 14px;border-radius:10px;margin-bottom:12px;">
      <span class="small">📡 Backend offline · tablero vacío. Volverá cuando el server responda.</span>
    </div>`
        : ''
    }
    ${
      totalCards === 0 && !isOffline
        ? `<div class="card" style="text-align:center;padding:30px;margin-bottom:14px;">
      <div style="font-size:42px;margin-bottom:8px;">🗂</div>
      <div class="muted">Sin piezas en el pipeline. Lanzá una misión o creá contenido para empezar.</div>
    </div>`
        : ''
    }
    <div class="kanban-grid">
      ${d.columns
        .map(
          (col) => `
        <div class="kanban-col">
          <div class="kanban-col-head">${escape(col.title)} <span class="tag tiny">${(col.cards ?? []).length}</span></div>
          <div class="kanban-col-body">
            ${
              (col.cards ?? []).length === 0
                ? '<div class="tiny muted" style="padding:14px;text-align:center;">vacío</div>'
                : col.cards
                    .map(
                      (c) =>
                        `<div class="kanban-card"><div class="small" style="font-weight:600;">${escape(c.title ?? '—')}</div><div class="tiny muted">${escape(c.meta ?? '')}</div></div>`,
                    )
                    .join('')
            }
          </div>
        </div>`,
        )
        .join('')}
    </div>`;
};

/* ── Brand Board — herramienta interactiva de branding ────────────────────── */
const BRAND_PALETTES = {
  warm: ['#F59E0B', '#EF4444', '#FBBF24', '#FEF3C7'],
  cool: ['#3B82F6', '#06B6D4', '#A5B4FC', '#E0E7FF'],
  bold: ['#EC4899', '#A855F7', '#6366F1', '#22D3EE'],
  earth: ['#78350F', '#A16207', '#D4D4AA', '#FDE68A'],
  mono: ['#0A0A0A', '#262626', '#737373', '#FAFAFA'],
  pastel: ['#FBCFE8', '#FDE68A', '#A7F3D0', '#BFDBFE'],
  cyberpunk: ['#FF00FF', '#00FFFF', '#FFFF00', '#0F0F23'],
};

const BRAND_FONTS = ['Inter', 'Merriweather', 'Poppins', 'Playfair Display', 'JetBrains Mono', 'Sistema'];
const BRAND_VOICE_TONES = [
  'amistosa',
  'profesional',
  'cómplice',
  'pícara',
  'mentora',
  'enérgica',
  'sofisticada',
  'rebelde',
  'cálida',
  'directa',
];

const DEFAULT_BRAND = {
  name: 'Mi Marca',
  niche: '',
  style: 'moderno',
  mood: '',
  palette: BRAND_PALETTES.bold,
  typography: ['Inter'],
  voiceTone: ['amistosa', 'cómplice'],
  forbidden: [],
  allowedIconography: ['minimalista', 'líneas finas'],
  forbiddenIconography: ['clipart', 'emojis grandes'],
  values: '',
  mission: '',
  tagline: '',
};

export const renderMoodboard = async (root) => {
  const host = shell(
    root,
    '🎨 Brand Board',
    'Definí, mejorá y aplicá la identidad de tu marca. FeedIA usa este brand en cada pieza que genera.',
    'mb-body',
  );
  // Cargar brand desde API o usar default
  let m = DEFAULT_BRAND;
  try {
    m = { ...DEFAULT_BRAND, ...(await api('/api/moodboard')) };
  } catch {
    /* offline → defaults */
  }
  // localStorage merge para sobrevivir offline
  try {
    const local = JSON.parse(localStorage.getItem('feedia.brand') ?? 'null');
    if (local) m = { ...m, ...local };
  } catch {
    /* noop */
  }

  const renderPalettePicker = (selected) =>
    Object.entries(BRAND_PALETTES)
      .map(
        ([name, colors]) => `
    <button type="button" class="bb-palette-card ${JSON.stringify(colors) === JSON.stringify(selected) ? 'selected' : ''}" data-palette="${name}">
      <div class="bb-palette-swatches">${colors.map((c) => `<div style="background:${c};"></div>`).join('')}</div>
      <div class="bb-palette-name">${name}</div>
    </button>`,
      )
      .join('');

  host.innerHTML = `
    <div class="bb-hero">
      <div style="font-size:36px;">🎨</div>
      <div>
        <h2 class="bb-name">${escape(m.name)}</h2>
        <p class="bb-tagline">${escape(m.tagline || 'Definí tu tagline para que FeedIA lo use en cada pieza.')}</p>
      </div>
      <button class="btn primary" id="bb-ai-suggest" style="margin-left:auto;">✨ Sugerir mejora con IA</button>
    </div>

    <div class="bb-tabs" id="bb-tabs">
      <button class="bb-tab active" data-tab="identity">📛 Identidad</button>
      <button class="bb-tab" data-tab="palette">🎨 Paleta</button>
      <button class="bb-tab" data-tab="typography">🔤 Tipografía</button>
      <button class="bb-tab" data-tab="voice">🗣️ Voz</button>
      <button class="bb-tab" data-tab="preview">👁️ Preview</button>
    </div>

    <div class="bb-panel" data-panel="identity">
      <div class="card">
        <h3>Identidad de marca</h3>
        <div class="bb-form">
          <label class="form-label">Nombre</label>
          <input id="bb-name" class="input" value="${escape(m.name)}" placeholder="Tu marca">
          <label class="form-label" style="margin-top:10px;">Nicho / Industria</label>
          <input id="bb-niche" class="input" value="${escape(m.niche || '')}" placeholder="Ej: emprendimiento, fitness, marketing IA">
          <label class="form-label" style="margin-top:10px;">Tagline (frase memorable)</label>
          <input id="bb-tagline" class="input" value="${escape(m.tagline || '')}" placeholder="Ej: 'Automatización con alma'">
          <label class="form-label" style="margin-top:10px;">Misión</label>
          <textarea id="bb-mission" class="input" rows="3" placeholder="¿Qué resolvés y para quién?">${escape(m.mission || '')}</textarea>
          <label class="form-label" style="margin-top:10px;">Valores (separados por coma)</label>
          <input id="bb-values" class="input" value="${escape(m.values || '')}" placeholder="Honestidad, claridad, velocidad">
          <label class="form-label" style="margin-top:10px;">Mood (energía visual)</label>
          <input id="bb-mood" class="input" value="${escape(m.mood || '')}" placeholder="Ej: enérgico, sereno, técnico, cálido">
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="palette" hidden>
      <div class="card">
        <h3>Paleta de colores</h3>
        <p class="small muted" style="margin:4px 0 14px;">Elegí una paleta base. FeedIA la usará en todos los diseños generados.</p>
        <div class="bb-palette-grid">${renderPalettePicker(m.palette)}</div>
        <div style="margin-top:18px;">
          <label class="form-label">Colores personalizados (HEX, separados por coma)</label>
          <input id="bb-custom-palette" class="input" placeholder="#FF0080, #6366F1, #FBBF24" value="${escape((m.palette || []).join(', '))}">
          <div class="bb-current-palette" id="bb-current-palette">
            ${(m.palette || []).map((c) => `<div class="bb-swatch-big" style="background:${escape(c)};" title="${escape(c)}"><span>${escape(c)}</span></div>`).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="typography" hidden>
      <div class="card">
        <h3>Tipografía</h3>
        <p class="small muted" style="margin:4px 0 14px;">Hasta 2 familias: una para títulos (display) y otra para cuerpo.</p>
        <div class="bb-fonts-grid">
          ${BRAND_FONTS.map(
            (f) => `
            <button type="button" class="bb-font ${(m.typography || []).includes(f) ? 'selected' : ''}" data-font="${escape(f)}">
              <div class="bb-font-sample" style="font-family:'${escape(f)}', sans-serif;">${escape(f)}</div>
              <div class="bb-font-name">${escape(f)}</div>
            </button>`,
          ).join('')}
        </div>
      </div>
    </div>

    <div class="bb-panel" data-panel="voice" hidden>
      <div class="card">
        <h3>Voz de marca</h3>
        <p class="small muted" style="margin:4px 0 14px;">Cómo se "siente" la marca cuando escribe. Lía respeta esto en cada caption.</p>
        <div class="bb-tones">
          ${BRAND_VOICE_TONES.map(
            (t) => `
            <button type="button" class="bb-tone ${(m.voiceTone || []).includes(t) ? 'selected' : ''}" data-tone="${escape(t)}">${escape(t)}</button>`,
          ).join('')}
        </div>
        <label class="form-label" style="margin-top:16px;">Palabras prohibidas (separadas por coma)</label>
        <input id="bb-forbidden" class="input" value="${escape((m.forbidden || []).join(', '))}" placeholder="Ej: barato, urgente, último">
      </div>
    </div>

    <div class="bb-panel" data-panel="preview" hidden>
      <div class="card">
        <h3>Preview de marca aplicada</h3>
        <p class="small muted">Así se ve tu marca en una pieza ejemplo.</p>
        <div class="bb-preview" id="bb-preview">
          <div class="bb-preview-card" style="background:linear-gradient(135deg, ${(m.palette || ['#000'])[0]}, ${(m.palette || ['#000', '#000'])[1]});">
            <div class="bb-preview-title" style="font-family:'${escape((m.typography || ['Inter'])[0])}', sans-serif;">${escape(m.name)}</div>
            <div class="bb-preview-tag" style="font-family:'${escape((m.typography || ['Inter'])[1] || (m.typography || ['Inter'])[0])}', sans-serif;">${escape(m.tagline || 'Tu tagline acá')}</div>
            <div class="bb-preview-tone">${(m.voiceTone || [])
              .slice(0, 3)
              .map((t) => `<span>${escape(t)}</span>`)
              .join('')}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="bb-actions">
      <button class="btn primary" id="bb-save">💾 Guardar branding</button>
      <button class="btn ghost" id="bb-reset">🔄 Restaurar default</button>
    </div>

    <style>
      .bb-hero{display:flex;align-items:center;gap:16px;padding:18px;background:linear-gradient(135deg,rgba(99,102,241,.1),rgba(168,85,247,.06));border:1px solid rgba(168,85,247,.3);border-radius:14px;margin-bottom:16px;flex-wrap:wrap;}
      .bb-name{margin:0;font-size:24px;font-weight:800;}
      .bb-tagline{margin:4px 0 0;font-size:13px;color:var(--text-muted,#9CA3AF);}
      .bb-tabs{display:flex;gap:4px;padding:4px;background:var(--surface,#141418);border:1px solid var(--border);border-radius:10px;margin-bottom:14px;overflow-x:auto;}
      .bb-tab{flex-shrink:0;padding:8px 14px;border-radius:7px;border:0;background:transparent;color:var(--text-muted,#9CA3AF);font-size:13px;font-weight:600;cursor:pointer;white-space:nowrap;}
      .bb-tab.active{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;}
      .bb-form{display:flex;flex-direction:column;}
      .bb-palette-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
      .bb-palette-card{background:var(--bg-elev,#1c1c22);border:2px solid var(--border);border-radius:10px;padding:8px;cursor:pointer;color:inherit;}
      .bb-palette-card:hover{border-color:rgba(168,85,247,.5);}
      .bb-palette-card.selected{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.18);}
      .bb-palette-swatches{display:flex;gap:3px;height:36px;margin-bottom:6px;border-radius:6px;overflow:hidden;}
      .bb-palette-swatches div{flex:1;}
      .bb-palette-name{font-size:11px;text-transform:capitalize;font-weight:600;}
      .bb-current-palette{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
      .bb-swatch-big{width:80px;height:60px;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding:4px;}
      .bb-swatch-big span{background:rgba(0,0,0,.5);color:#fff;font-size:10px;padding:2px 5px;border-radius:4px;font-family:monospace;}
      .bb-fonts-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
      .bb-font{background:var(--bg-elev,#1c1c22);border:2px solid var(--border);border-radius:10px;padding:14px;cursor:pointer;color:inherit;text-align:center;}
      .bb-font:hover{border-color:rgba(168,85,247,.5);}
      .bb-font.selected{border-color:#a855f7;}
      .bb-font-sample{font-size:22px;font-weight:700;margin-bottom:6px;}
      .bb-font-name{font-size:11px;color:var(--text-muted,#9CA3AF);}
      .bb-tones{display:flex;flex-wrap:wrap;gap:8px;}
      .bb-tone{padding:8px 16px;border-radius:999px;border:1px solid var(--border);background:var(--bg-elev,#1c1c22);color:var(--fg,#fff);cursor:pointer;font-size:13px;}
      .bb-tone:hover{border-color:rgba(168,85,247,.5);}
      .bb-tone.selected{background:linear-gradient(135deg,#6366f1,#a855f7);border-color:transparent;color:#fff;}
      .bb-preview{padding:24px;background:var(--bg-elev,#1c1c22);border-radius:12px;display:flex;justify-content:center;}
      .bb-preview-card{width:280px;height:280px;border-radius:18px;padding:24px;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;color:#fff;}
      .bb-preview-title{font-size:28px;font-weight:800;margin-bottom:8px;}
      .bb-preview-tag{font-size:14px;opacity:.9;margin-bottom:16px;}
      .bb-preview-tone{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;}
      .bb-preview-tone span{font-size:10px;background:rgba(0,0,0,.3);padding:3px 8px;border-radius:999px;}
      .bb-actions{display:flex;gap:10px;margin-top:18px;}
    </style>
  `;

  // Tabs
  host.querySelectorAll('.bb-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      host.querySelectorAll('.bb-tab').forEach((t) => t.classList.toggle('active', t === tab));
      host.querySelectorAll('.bb-panel').forEach((p) => (p.hidden = p.dataset.panel !== target));
    });
  });

  // Palette selection
  host.querySelectorAll('.bb-palette-card').forEach((card) => {
    card.addEventListener('click', () => {
      host.querySelectorAll('.bb-palette-card').forEach((c) => c.classList.toggle('selected', c === card));
      const pal = BRAND_PALETTES[card.dataset.palette];
      m.palette = pal;
      const input = host.querySelector('#bb-custom-palette');
      const display = host.querySelector('#bb-current-palette');
      if (input) input.value = pal.join(', ');
      if (display)
        display.innerHTML = pal
          .map((c) => `<div class="bb-swatch-big" style="background:${escape(c)};"><span>${escape(c)}</span></div>`)
          .join('');
    });
  });

  // Font multi-select (max 2)
  host.querySelectorAll('.bb-font').forEach((btn) => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected');
      const selected = [...host.querySelectorAll('.bb-font.selected')].map((b) => b.dataset.font);
      if (selected.length > 2) {
        btn.classList.remove('selected');
      }
    });
  });

  // Tones multi-select
  host.querySelectorAll('.bb-tone').forEach((btn) => {
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
  });

  // Save
  host.querySelector('#bb-save')?.addEventListener('click', async () => {
    const palStr = host.querySelector('#bb-custom-palette')?.value.trim();
    const palette = palStr
      ? palStr
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : m.palette;
    const updates = {
      name: host.querySelector('#bb-name').value.trim() || 'Mi Marca',
      niche: host.querySelector('#bb-niche').value.trim(),
      tagline: host.querySelector('#bb-tagline').value.trim(),
      mission: host.querySelector('#bb-mission').value.trim(),
      values: host.querySelector('#bb-values').value.trim(),
      mood: host.querySelector('#bb-mood').value.trim(),
      palette,
      typography: [...host.querySelectorAll('.bb-font.selected')].map((b) => b.dataset.font),
      voiceTone: [...host.querySelectorAll('.bb-tone.selected')].map((b) => b.dataset.tone),
      forbidden: (host.querySelector('#bb-forbidden').value || '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    try {
      localStorage.setItem('feedia.brand', JSON.stringify(updates));
    } catch {
      /* noop */
    }
    try {
      await api('/api/moodboard', { method: 'PUT', body: updates });
      toast('💾 Branding guardado', 'ok');
    } catch {
      toast('Guardado localmente. Sincronizá cuando el backend vuelva.', 'warn');
    }
  });

  host.querySelector('#bb-reset')?.addEventListener('click', () => {
    try {
      localStorage.removeItem('feedia.brand');
    } catch {
      /* noop */
    }
    toast('Restaurado a default. Recargá la vista.', 'info');
  });

  host.querySelector('#bb-ai-suggest')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> generando…';
    try {
      const suggestion = await api('/api/moodboard/ai-suggest', { method: 'POST', body: {} });
      if (suggestion?.tagline) host.querySelector('#bb-tagline').value = suggestion.tagline;
      if (suggestion?.mission) host.querySelector('#bb-mission').value = suggestion.mission;
      if (suggestion?.values) host.querySelector('#bb-values').value = suggestion.values;
      toast('✨ Sugerencia generada — revisá y guardá si te gusta', 'ok');
    } catch {
      toast('Backend offline — no se puede generar ahora', 'warn');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '✨ Sugerir mejora con IA';
    }
  });
};

/* ── Reportes (imprimible → PDF con el navegador) ────────────────────────── */
export const renderReportes = async (root) => {
  const host = shell(root, '📊 Reportes', 'Resumen ejecutivo del sistema. Imprimí o exportá a PDF.', 'rp-body');
  try {
    const r = await api('/api/report');
    host.innerHTML = `
      <div class="btn-row" style="margin-bottom:14px;"><button class="btn primary" id="rp-print">🖨 Imprimir / PDF</button></div>
      <div class="card report-sheet" id="rp-sheet">
        <h2 style="margin:0 0 4px;">${escape(r.brand)} — Reporte FeedIA</h2>
        <div class="small muted" style="margin-bottom:18px;">Generado: ${new Date(r.generatedAt).toLocaleString('es-AR')}</div>
        <h3>Directivas</h3>
        <p class="small">Total: <strong>${r.directives.total}</strong> · Activas: <strong>${r.directives.active}</strong></p>
        <h3>Ejecuciones</h3>
        <p class="small">Total: <strong>${r.runs.total}</strong> · OK: <strong style="color:var(--ok)">${r.runs.ok}</strong> · En revisión: <strong style="color:var(--warn)">${r.runs.partial}</strong> · Fallidas: <strong style="color:var(--crit)">${r.runs.failed}</strong></p>
        <h3>Decisiones autónomas</h3>
        <p class="small">Total: <strong>${r.decisions.totalTraces}</strong> · Con resultado medido: <strong>${r.decisions.withOutcomes}</strong> · Tasa de acierto: <strong>${(r.decisions.successRate * 100).toFixed(0)}%</strong> · Score promedio: <strong>${r.decisions.avgChosenScore}</strong></p>
        <h3>Estado operativo</h3>
        <p class="small">Aprobaciones pendientes: <strong>${r.approvalsPending}</strong> · Crisis: <strong>${r.crisisActive ? '⚠️ activa' : '✅ ninguna'}</strong></p>
      </div>`;
    host.querySelector('#rp-print').addEventListener('click', () => window.print());
  } catch (e) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(e.message)}</div>`;
  }
};

/* ── Simulador "¿Qué pasaría si...?" ─────────────────────────────────────── */
export const renderSimulador = async (root) => {
  const host = shell(root, '🔮 Simulador', 'Probá una directiva y mirá la proyección antes de activarla.', 'sm-body');
  host.innerHTML = `
    <style>
      .sm-panel{background:#fff;border:1px solid #E3E6EB;border-radius:16px;padding:18px;color:#15181E;box-shadow:0 1px 2px rgba(16,24,40,.04);margin-bottom:14px;}
      .sm-input{width:100%;box-sizing:border-box;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;}
      .sm-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      .sm-btn{border:0;border-radius:999px;padding:12px 22px;font-weight:700;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;}
      .sm-hero{background:linear-gradient(135deg,rgba(124,58,237,.10),rgba(99,102,241,.05));border:1px solid rgba(124,58,237,.25);}
      .sm-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-top:14px;}
      .sm-kpi{background:#F7F8FB;border:1px solid #E6E8EE;border-radius:12px;padding:12px;}
      .sm-kpi-num{font-size:28px;font-weight:800;color:#15181E;line-height:1;}
      .sm-kpi-lbl{font-size:11px;font-weight:600;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;}
      .sm-chip{display:inline-flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;font-size:12px;font-weight:700;}
      .sm-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
      .sm-scen{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:14px;border-top:3px solid var(--c,#6366F1);}
      .sm-scen-title{font-weight:800;color:#15181E;font-size:14px;}
      .sm-scen-x{font-size:24px;font-weight:800;color:var(--c,#6366F1);margin:6px 0;}
      .sm-list{margin:0;padding:0;list-style:none;}
      .sm-list li{display:flex;gap:8px;font-size:13px;color:#344054;line-height:1.5;padding:6px 0;border-top:1px solid #EEF0F4;}
      .sm-list li:first-child{border-top:0;}
      .sm-svg{width:100%;height:180px;display:block;}
      .sm-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:#475067;margin-top:8px;}
      .sm-legend-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:5px;vertical-align:middle;}
      /* 📺 Pantalla de simulación */
      .sm-screen{background:#0F1115;border:1px solid #2A2E36;border-radius:18px;padding:0;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.35),inset 0 0 0 1px rgba(255,255,255,.04);margin-bottom:14px;}
      .sm-screen-bar{display:flex;align-items:center;gap:10px;padding:11px 16px;background:linear-gradient(180deg,#1A1D26,#13161D);border-bottom:1px solid #2A2E36;color:#E8E9EC;}
      .sm-screen-dots{display:flex;gap:5px;}
      .sm-screen-dots i{width:9px;height:9px;border-radius:50%;display:block;}
      .sm-screen-dots i:nth-child(1){background:#FF5F57;}
      .sm-screen-dots i:nth-child(2){background:#FEBC2E;}
      .sm-screen-dots i:nth-child(3){background:#28C840;}
      .sm-screen-title{font-size:13px;font-weight:700;color:#E8E9EC;letter-spacing:.02em;}
      .sm-screen-live{font-size:10px;font-weight:800;color:#10B981;background:rgba(16,185,129,.12);padding:3px 8px;border-radius:999px;display:inline-flex;align-items:center;gap:5px;}
      .sm-screen-live::before{content:'';width:6px;height:6px;border-radius:50%;background:#10B981;animation:smPulse 1.4s ease-in-out infinite;}
      @keyframes smPulse{0%,100%{opacity:1;}50%{opacity:.3;}}
      .sm-screen-body{padding:18px;background:#fff;}
      .sm-replay{border:0;border-radius:999px;padding:7px 14px;background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;font-weight:700;font-size:12px;cursor:pointer;margin-left:auto;}
      .sm-replay:disabled{opacity:.6;cursor:wait;}
      .sm-svg path{stroke-linecap:round;stroke-linejoin:round;}
    </style>
    <div class="sm-panel">
      <h3 style="margin:0 0 6px;color:#15181E;">¿Qué pasaría si le digo a FeedIA…?</h3>
      <p style="color:#667085;font-size:13px;margin:0 0 10px;">Escribí la directiva y FeedIA proyecta 12 semanas con escenarios, riesgos y recomendaciones.</p>
      <textarea class="sm-input" id="sm-in" rows="2" placeholder='Ej: "Subí 2 carruseles por día sobre IA"'></textarea>
      <button class="sm-btn" id="sm-go" style="margin-top:10px;">🔮 Simular</button>
      <div id="sm-out" style="margin-top:14px;"></div>
    </div>`;

  // SVG sparkline: trayectoria 12 semanas (alcance/engagement/seguidores)
  const renderChart = (tray) => {
    if (!Array.isArray(tray) || !tray.length) return '';
    const alc = tray.map((t) => t.alcance || 0);
    const eng = tray.map((t) => t.engagement || 0);
    const seg = tray.map((t) => t.seguidores || 0);
    const max = Math.max(...alc, ...eng, ...seg, 100) * 1.1;
    const W = 560,
      H = 140,
      P = 18;
    const xs = (i, n) => P + (i * (W - P * 2)) / (n - 1);
    const ys = (v) => H - P - (v / max) * (H - P * 2);
    const line = (arr) =>
      arr.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs(i, arr.length).toFixed(1)},${ys(v).toFixed(1)}`).join(' ');
    const aPath = line(alc);
    const aArea = `${aPath} L${xs(alc.length - 1, alc.length).toFixed(1)},${H - P} L${P},${H - P} Z`;
    return `<svg class="sm-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#7C3AED" stop-opacity=".25"/><stop offset="100%" stop-color="#7C3AED" stop-opacity="0"/></linearGradient></defs>
      ${[0, 0.25, 0.5, 0.75, 1].map((f) => `<line x1="${P}" x2="${W - P}" y1="${(P + f * (H - P * 2)).toFixed(1)}" y2="${(P + f * (H - P * 2)).toFixed(1)}" stroke="#EEF0F4" stroke-width="1"/>`).join('')}
      <path d="${aArea}" fill="url(#gA)"/>
      <path d="${aPath}" stroke="#7C3AED" stroke-width="2.4" fill="none"/>
      <path d="${line(eng)}" stroke="#10B981" stroke-width="2.2" fill="none"/>
      <path d="${line(seg)}" stroke="#F59E0B" stroke-width="2.2" fill="none" stroke-dasharray="4 3"/>
      ${tray.map((t, i) => (i % 3 === 0 ? `<text x="${xs(i, tray.length).toFixed(1)}" y="${H - 4}" font-size="10" fill="#98A1B3" text-anchor="middle">S${t.semana}</text>` : '')).join('')}
    </svg>
    <div class="sm-legend">
      <span><span class="sm-legend-dot" style="background:#7C3AED;"></span>Alcance</span>
      <span><span class="sm-legend-dot" style="background:#10B981;"></span>Engagement</span>
      <span><span class="sm-legend-dot" style="background:#F59E0B;"></span>Seguidores</span>
    </div>`;
  };

  const COL = ['#10B981', '#7C3AED', '#F59E0B'];

  host.querySelector('#sm-go').addEventListener('click', async (e) => {
    const instruction = host.querySelector('#sm-in').value.trim();
    if (!instruction) {
      toast('Escribí una indicación', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'simulando…', async () => {
      try {
        const s = await api('/api/simulate', { method: 'POST', body: { instruction } });
        const pj = s.projection || {};
        const esfChip = { bajo: '#10B981', medio: '#F59E0B', alto: '#EF4444' }[pj.esfuerzo] || '#6366F1';
        const virChip = { baja: '#94A3B8', media: '#6366F1', alta: '#FE2C55' }[pj.viralidad] || '#6366F1';
        host.querySelector('#sm-out').innerHTML = `
          <div class="sm-panel sm-hero">
            <div style="font-size:13px;color:#475067;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">FeedIA entendió</div>
            <div style="font-size:17px;font-weight:700;color:#15181E;margin:4px 0 10px;">${escape(s.understood || '—')}</div>
            <div style="display:flex;gap:7px;flex-wrap:wrap;">
              <span class="sm-chip" style="background:rgba(99,102,241,.12);color:#6366F1;">⚙️ ${escape(s.action || 'acción')}</span>
              <span class="sm-chip" style="background:rgba(124,58,237,.12);color:#7C3AED;">🔁 ${escape(s.recurrence || 'cadencia')}</span>
              ${pj.autoPublish ? '<span class="sm-chip" style="background:rgba(16,185,129,.14);color:#10B981;">🤖 Auto-publica</span>' : '<span class="sm-chip" style="background:rgba(245,158,11,.14);color:#F59E0B;">✋ Requiere tu OK</span>'}
              ${pj.esfuerzo ? `<span class="sm-chip" style="background:${esfChip}22;color:${esfChip};">💪 Esfuerzo ${escape(pj.esfuerzo)}</span>` : ''}
              ${pj.viralidad ? `<span class="sm-chip" style="background:${virChip}22;color:${virChip};">🚀 Viralidad ${escape(pj.viralidad)}</span>` : ''}
            </div>
            <div class="sm-kpis">
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${pj.perWeek ?? 0}">0</div><div class="sm-kpi-lbl">por semana</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${pj.perMonth ?? 0}">0</div><div class="sm-kpi-lbl">por mes</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num sm-tick" data-to="${(pj.perMonth ?? 0) * 3}">0</div><div class="sm-kpi-lbl">90 días</div></div>
              <div class="sm-kpi"><div class="sm-kpi-num">12s</div><div class="sm-kpi-lbl">proyección</div></div>
            </div>
            <p style="margin-top:12px;color:#475067;font-size:13px;line-height:1.5;">${escape(pj.estImpact || '')}</p>
          </div>

          <div class="sm-screen">
            <div class="sm-screen-bar">
              <span class="sm-screen-dots"><i></i><i></i><i></i></span>
              <span class="sm-screen-title">📺 Pantalla de simulación · 12 semanas</span>
              <span class="sm-screen-live">EN VIVO</span>
              <button class="sm-replay" id="sm-replay">▶ Reproducir</button>
            </div>
            <div class="sm-screen-body">
              ${renderChart(s.trayectoria)}
            </div>
          </div>

          <div class="sm-grid2">
            ${(s.escenarios || [])
              .map(
                (sc, i) => `
              <div class="sm-scen" style="--c:${COL[i] || '#6366F1'};">
                <div class="sm-scen-title">${escape(sc.nombre || 'Escenario')}</div>
                <div class="sm-scen-x">×${(Number(sc.alcanceX) || 1).toFixed(1)}</div>
                <div style="font-size:13px;color:#475067;line-height:1.5;">${escape(sc.resumen || '')}</div>
              </div>`,
              )
              .join('')}
          </div>

          <div class="sm-grid2" style="margin-top:12px;">
            ${
              s.riesgos && s.riesgos.length
                ? `<div class="sm-panel" style="border-top:3px solid #EF4444;margin-bottom:0;">
              <strong style="color:#15181E;">⚠️ Riesgos</strong>
              <ul class="sm-list" style="margin-top:8px;">${s.riesgos.map((r) => `<li>⚠️ ${escape(r)}</li>`).join('')}</ul>
            </div>`
                : ''
            }
            ${
              s.recomendaciones && s.recomendaciones.length
                ? `<div class="sm-panel" style="border-top:3px solid #10B981;margin-bottom:0;">
              <strong style="color:#15181E;">✅ Recomendaciones</strong>
              <ul class="sm-list" style="margin-top:8px;">${s.recomendaciones.map((r) => `<li>✓ ${escape(r)}</li>`).join('')}</ul>
            </div>`
                : ''
            }
          </div>`;
        // Animar: reveal de paths SVG (12 semanas) + tick-up de KPIs.
        const playAnim = () => {
          const paths = host.querySelectorAll('.sm-svg path[stroke]');
          paths.forEach((p) => {
            try {
              const L = p.getTotalLength();
              p.style.transition = 'none';
              p.style.strokeDasharray = L;
              p.style.strokeDashoffset = L;
              // force reflow
              void p.getBoundingClientRect();
              p.style.transition = 'stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)';
              p.style.strokeDashoffset = 0;
            } catch {
              /* ignore */
            }
          });
          host.querySelectorAll('.sm-tick').forEach((el) => {
            const to = Number(el.dataset.to) || 0;
            const t0 = performance.now();
            const dur = 1400;
            const step = (now) => {
              const p = Math.min(1, (now - t0) / dur);
              const v = Math.round(to * (1 - Math.pow(1 - p, 3)));
              el.textContent = String(v);
              if (p < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          });
        };
        // Replay
        const rp = host.querySelector('#sm-replay');
        if (rp)
          rp.addEventListener('click', () => {
            rp.disabled = true;
            playAnim();
            setTimeout(() => {
              rp.disabled = false;
            }, 1700);
          });
        // Auto-play al primer render
        playAnim();
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });
};

/* ── Modo Cliente — vista solo-lectura, sin exponer la operación ─────────── */
export const renderCliente = async (root) => {
  const host = shell(
    root,
    '👔 Modo Cliente',
    'Vista ejecutiva de solo lectura para mostrarle al dueño de la marca.',
    'cl-body',
  );
  try {
    const [c, profiles] = await Promise.all([api('/api/client-view'), api('/api/brand-profiles')]);
    const estadoTag = c.estado === 'saludable' ? 'ok' : 'crit';
    host.innerHTML = `
      <div class="card" style="padding:22px;">
        <h2 style="margin:0 0 4px;">${escape(c.brand)}</h2>
        <div class="small muted">${escape(c.niche)} · al ${new Date(c.generatedAt).toLocaleDateString('es-AR')}</div>
        <div class="meta" style="margin-top:10px;"><span class="tag ${estadoTag}">${c.estado === 'saludable' ? '✅ Saludable' : '⚠️ Requiere atención'}</span></div>
      </div>
      <div class="autopilot-stat-row" style="margin-top:16px;flex-wrap:wrap;">
        <div class="autopilot-stat"><div class="autopilot-stat-num">${c.contenidoActivo}</div><div class="autopilot-stat-label">líneas de contenido activas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${c.piezasPublicadas}</div><div class="autopilot-stat-label">piezas publicadas</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${c.enRevision}</div><div class="autopilot-stat-label">en revisión</div></div>
        <div class="autopilot-stat"><div class="autopilot-stat-num">${c.pendientesDeTuOk}</div><div class="autopilot-stat-label">esperan tu OK</div></div>
      </div>
      <div class="card" style="margin-top:16px;">
        <h3 style="margin:0 0 8px;">Cuentas gestionadas <span class="tag accent tiny">multi-cuenta en caliente</span></h3>
        ${
          (profiles.profiles || []).length
            ? profiles.profiles
                .map(
                  (p) => `<div class="ws-row" style="padding:8px 0;align-items:center;">
              <div style="flex:1;min-width:0;"><strong>${escape(p.name)}</strong>${p.niche ? `<div class="tiny muted">${escape(p.niche)}</div>` : ''}</div>
              ${
                p.active
                  ? '<span class="tag ok tiny">activa</span>'
                  : `<button class="btn ghost tiny" data-activate="${escape(p.file)}">Cambiar a esta →</button>`
              }
            </div>`,
                )
                .join('')
            : '<div class="muted small">1 cuenta activa.</div>'
        }
        <p class="tiny muted" style="margin:10px 0 0;">${escape(profiles.note || '')}</p>
      </div>
      <p class="tiny muted" style="margin-top:14px;">🔒 Esta vista es de solo lectura. No expone agentes, decisiones internas ni arquitectura del sistema.</p>`;
    host.querySelectorAll('[data-activate]').forEach((b) =>
      b.addEventListener('click', async (ev) => {
        let pv;
        try {
          pv = await api(`/api/brand-profiles/${encodeURIComponent(b.dataset.activate)}/preview`);
        } catch (err) {
          toast('Error al previsualizar: ' + err.message, 'crit');
          return;
        }
        const msg =
          `Vas a cambiar a:\n\n` +
          `  ${pv.name}\n  ${pv.niche}\n\n` +
          `IMPACTO de la cuenta destino:\n` +
          `  • Directivas activas: ${pv.impacto.directivasActivas}\n` +
          `  • Aprobaciones pendientes: ${pv.impacto.aprobacionesPendientes}\n` +
          `  • Pizarras: ${pv.impacto.pizarras}\n\n` +
          `${pv.aviso}\n\n¿Confirmás el cambio EN CALIENTE?`;
        if (!confirm(msg)) return;
        await withBtnSpinner(ev.currentTarget, 'cambiando…', async () => {
          try {
            const r = await api('/api/brand-profiles/activate', { method: 'POST', body: { file: b.dataset.activate } });
            if (r.ok) {
              toast(`Cuenta activa: ${r.brand.name}`, 'ok');
              await renderCliente(root);
            } else toast('Error: ' + (r.error || 'no se pudo activar'), 'crit');
          } catch (err) {
            toast('Error: ' + err.message, 'crit');
          }
        });
      }),
    );
  } catch (e) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(e.message)}</div>`;
  }
};
