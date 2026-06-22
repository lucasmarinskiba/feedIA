import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

/* ── state ── */
let activeTab = 'caption';

const TABS = [
  {
    id: 'caption',
    icon: '✍️',
    label: 'Caption IA',
    desc: '3 captions optimizadas',
    gradient: 'linear-gradient(135deg,#6366f1,#a855f7)',
  },
  {
    id: 'hashtags',
    icon: '🔬',
    label: 'Hashtag Lab',
    desc: 'Sets balanceados nicho + tendencia',
    gradient: 'linear-gradient(135deg,#ec4899,#f59e0b)',
  },
  {
    id: 'hooks',
    icon: '🎣',
    label: 'Hook Factory',
    desc: 'Ganchos virales que paran scroll',
    gradient: 'linear-gradient(135deg,#22d3ee,#3b82f6)',
  },
  {
    id: 'repurpose',
    icon: '♻️',
    label: 'Repurposer',
    desc: 'Reusá contenido en otros formatos',
    gradient: 'linear-gradient(135deg,#10b981,#22d3ee)',
  },
  {
    id: 'safety',
    icon: '🛡️',
    label: 'Safety Check',
    desc: 'Compliance + riesgo de shadowban',
    gradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
  },
  {
    id: 'profile',
    icon: '✨',
    label: 'Profile AI',
    desc: 'Bio, link in bio, highlights',
    gradient: 'linear-gradient(135deg,#a855f7,#ec4899)',
  },
];

/* ── shared spinner helper ── */
const setLoading = (btn, text = 'Generando…') => {
  btn.disabled = true;
  btn._originalHtml = btn.innerHTML;
  btn.innerHTML = `<span class="spinner"></span> ${text}`;
};
const clearLoading = (btn) => {
  btn.disabled = false;
  btn.innerHTML = btn._originalHtml ?? btn.innerHTML;
};

/* ══════════════════════════
   CAPTION TOOL
══════════════════════════ */
const captionPanel = () => `
  <div class="tool-panel" id="panel-caption">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon gradient">✍️</div>
        <div>
          <div class="tool-card-title">Caption IA</div>
          <div class="tool-card-desc">Generá 3 versiones de caption optimizadas para Instagram con hashtags incluidos</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Contexto del post</label>
        <textarea class="input" id="cap-context" rows="3"
          placeholder="Describí qué querés publicar. Ej: foto en oficina mostrando el proceso de trabajo detrás de una automatización…"></textarea>
      </div>
      <div class="tool-row">
        <div class="field-group" style="flex:1">
          <label class="field-label">Formato</label>
          <select class="input" id="cap-format">
            <option value="reel">Reel</option>
            <option value="carrusel" selected>Carrusel</option>
            <option value="post-imagen">Post imagen</option>
            <option value="historia">Historia</option>
          </select>
        </div>
        <div class="field-group" style="flex:1">
          <label class="field-label">Objetivo</label>
          <select class="input" id="cap-goal">
            <option value="engagement" selected>Engagement</option>
            <option value="leads">Leads</option>
            <option value="awareness">Awareness</option>
            <option value="ventas">Ventas</option>
          </select>
        </div>
      </div>
      <button class="btn gradient" id="cap-generate-btn" style="width:100%">⚡ Generar 3 captions</button>
    </div>
    <div id="cap-results" style="display:none"></div>
  </div>`;

const renderCaptionResults = (data, root) => {
  const el = root.querySelector('#cap-results');
  el.style.display = '';
  const variants = [
    { label: 'Corto — impacto máximo', key: 'captionCorto', icon: '⚡' },
    { label: 'Medio — con valor', key: 'captionMedio', icon: '📝' },
    { label: 'Largo — storytelling', key: 'captionLargo', icon: '📖' },
  ];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px;">
      ${variants
        .map(
          ({ label, key, icon }) => `
        <div class="result-card">
          <div class="result-card-head">
            <span>${icon} <strong>${label}</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${escape(data[key])}">📋 Copiar</button>
          </div>
          <div class="result-text">${escape(data[key])}</div>
        </div>`,
        )
        .join('')}
      <div class="result-card">
        <div class="result-card-head"><span>🔖 Hashtags sugeridos</span>
          <button class="btn ghost small copy-btn" data-copy="${escape((data.hashtags ?? []).join(' '))}">📋 Copiar</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
          ${(data.hashtags ?? []).map((h) => `<span class="tag accent">${escape(h)}</span>`).join('')}
        </div>
      </div>
      <div class="result-card">
        <div class="result-card-head"><span>🎣 Hooks alternativos</span></div>
        <ol style="margin:0;padding-left:18px;">
          ${(data.hooksAlternativos ?? []).map((h) => `<li class="small" style="margin-bottom:4px">${escape(h)}</li>`).join('')}
        </ol>
      </div>
      <div class="result-card" style="border-color:var(--accent);border-width:1.5px">
        <div class="result-card-head"><span>📣 CTA propuesta</span></div>
        <div class="result-text">${escape(data.ctaPropuesta ?? '')}</div>
      </div>
    </div>`;
  el.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy ?? '').then(() => toast('Copiado ✓', 'ok'));
    });
  });
};

/* ══════════════════════════
   HASHTAG TOOL
══════════════════════════ */
const hashtagPanel = () => `
  <div class="tool-panel" id="panel-hashtags">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#405de6,#5851db)">🔬</div>
        <div>
          <div class="tool-card-title">Hashtag Lab</div>
          <div class="tool-card-desc">Investigá y construí sets de hashtags estratégicos para maximizar alcance orgánico</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Tema o nicho</label>
        <input class="input" id="ht-topic" placeholder="ej: automatización con IA para negocios" />
      </div>
      <div class="tool-row">
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="ht-rotate" checked>
          <span class="toggle-track"></span>
          <span class="small">Rotación automática</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="ht-niche" checked>
          <span class="toggle-track"></span>
          <span class="small">Incluir hashtags de nicho</span>
        </label>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#405de6,#5851db);border:0;color:#fff;width:100%" id="ht-generate-btn">🔬 Investigar hashtags</button>
    </div>
    <div id="ht-results" style="display:none"></div>
  </div>`;

const renderHashtagResults = (data, root) => {
  const el = root.querySelector('#ht-results');
  el.style.display = '';
  const pools = data.pools ?? {};
  const poolOrder = [
    ['mega', 'Mega (>10M)', '🌊'],
    ['grande', 'Grande (1M-10M)', '🏄'],
    ['medio', 'Medio (100K-1M)', '🎯'],
    ['nicho', 'Nicho (<100K)', '🔬'],
    ['marca', 'Marca', '🏷️'],
  ];
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      ${poolOrder
        .map(([key, label, icon]) => {
          const tags = (pools[key] ?? []).map((t) => t.tag ?? t).filter(Boolean);
          if (!tags.length) return '';
          return `
          <div class="result-card">
            <div class="result-card-head">
              <span>${icon} <strong>${label}</strong> <span class="tag muted tiny">${tags.length}</span></span>
              <button class="btn ghost small copy-btn" data-copy="${escape(tags.join(' '))}">📋 Copiar set</button>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
              ${tags.map((t) => `<span class="tag">${escape(t)}</span>`).join('')}
            </div>
          </div>`;
        })
        .join('')}
      ${
        data.seleccionOptima
          ? `
        <div class="result-card" style="border-color:var(--ok);border-width:1.5px">
          <div class="result-card-head">
            <span>✅ <strong>Set óptimo (${(data.seleccionOptima ?? []).length} tags)</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${escape((data.seleccionOptima ?? []).join(' '))}">📋 Copiar</button>
          </div>
          <div style="display:flex;flex-wrap:wrap;gap:6px;padding:4px 0">
            ${(data.seleccionOptima ?? []).map((t) => `<span class="tag ok">${escape(t)}</span>`).join('')}
          </div>
        </div>`
          : ''
      }
    </div>`;
  el.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy ?? '').then(() => toast('Copiado ✓', 'ok'));
    });
  });
};

/* ══════════════════════════
   HOOK FACTORY
══════════════════════════ */
const hooksPanel = () => `
  <div class="tool-panel" id="panel-hooks">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#f09433,#e6683c)">🎣</div>
        <div>
          <div class="tool-card-title">Hook Factory</div>
          <div class="tool-card-desc">Generá 10 hooks de alta retención para cualquier tema usando frameworks probados</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Tema o idea del contenido</label>
        <input class="input" id="hk-idea" placeholder="ej: los errores más comunes al automatizar procesos con IA" />
      </div>
      <div class="field-group">
        <label class="field-label">Tipo de hook</label>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px" id="hk-types">
          ${['pregunta', 'dato', 'controversia', 'historia', 'lista', 'misterio', 'problema', 'resultado']
            .map(
              (t) =>
                `<button class="action-chip ${t === 'pregunta' || t === 'dato' ? 'active' : ''}" data-type="${t}">${t}</button>`,
            )
            .join('')}
        </div>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#f09433,#e6683c);border:0;color:#fff;width:100%" id="hk-generate-btn">🎣 Generar 10 hooks</button>
    </div>
    <div id="hk-results" style="display:none"></div>
  </div>`;

const renderHookResults = (hooks, root) => {
  const el = root.querySelector('#hk-results');
  el.style.display = '';
  el.innerHTML = `
    <div class="result-card">
      <div class="result-card-head"><span>🎣 <strong>${hooks.length} hooks generados</strong></span>
        <button class="btn ghost small copy-btn" data-copy="${escape(hooks.join('\n\n'))}">📋 Copiar todos</button>
      </div>
      <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:10px">
        ${hooks
          .map(
            (h, i) => `
          <li style="margin-bottom:0">
            <div style="display:flex;align-items:flex-start;gap:10px">
              <span class="small" style="flex:1">${escape(h)}</span>
              <button class="btn ghost small copy-btn" style="flex-shrink:0" data-copy="${escape(h)}">📋</button>
            </div>
          </li>`,
          )
          .join('')}
      </ol>
    </div>`;
  el.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy ?? '').then(() => toast('Copiado ✓', 'ok'));
    });
  });
};

/* ══════════════════════════
   REPURPOSER
══════════════════════════ */
const repurposePanel = () => `
  <div class="tool-panel" id="panel-repurpose">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#4ade80,#22c55e)">♻️</div>
        <div>
          <div class="tool-card-title">Content Repurposer</div>
          <div class="tool-card-desc">Convertí contenido existente (blog, video, hilo) en formatos Instagram listos para publicar</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Título del contenido original</label>
        <input class="input" id="rp-title" placeholder="ej: Cómo automatizar tu negocio con IA en 2024" />
      </div>
      <div class="field-group">
        <label class="field-label">Tipo de contenido</label>
        <select class="input" id="rp-type">
          <option value="blog">Artículo / Blog</option>
          <option value="video">Video / YouTube</option>
          <option value="transcripcion">Transcripción</option>
          <option value="twitter">Hilo de Twitter/X</option>
          <option value="linkedin">Post de LinkedIn</option>
        </select>
      </div>
      <div class="field-group">
        <label class="field-label">Texto o transcripción</label>
        <textarea class="input" id="rp-text" rows="4" placeholder="Pegá el contenido original acá…"></textarea>
      </div>
      <div class="tool-row">
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-carousel" checked>
          <span class="toggle-track"></span>
          <span class="small">Carrusel</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-reel" checked>
          <span class="toggle-track"></span>
          <span class="small">Reel</span>
        </label>
        <label class="toggle-switch" style="flex:1">
          <input class="toggle-input" type="checkbox" id="rp-stories">
          <span class="toggle-track"></span>
          <span class="small">Stories</span>
        </label>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#4ade80,#16a34a);border:0;color:#fff;width:100%" id="rp-generate-btn">♻️ Repurposear contenido</button>
    </div>
    <div id="rp-results" style="display:none"></div>
  </div>`;

const renderRepurposeResults = (data, root) => {
  const el = root.querySelector('#rp-results');
  el.style.display = '';
  const items = [
    ...(data.carruseles ?? []).map((c) => ({ tipo: 'Carrusel', icon: '🎠', data: c })),
    ...(data.reels ?? []).map((r) => ({ tipo: 'Reel', icon: '▶️', data: r })),
    ...(data.stories ?? []).map((s) => ({ tipo: 'Stories', icon: '◎', data: s })),
  ];
  el.innerHTML =
    items
      .map(
        ({ tipo, icon, data: d }) => `
    <div class="result-card" style="margin-bottom:14px">
      <div class="result-card-head"><span>${icon} <strong>${tipo}</strong></span></div>
      <div class="small">${escape(d.hook ?? d.titulo ?? '')}</div>
      <div class="tiny muted">${escape(d.caption ?? d.cta ?? '')}</div>
    </div>`,
      )
      .join('') || '<div class="empty muted small">Sin resultados aún.</div>';
};

/* ══════════════════════════
   SAFETY CHECK
══════════════════════════ */
const safetyPanel = () => `
  <div class="tool-panel" id="panel-safety">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:linear-gradient(135deg,#f04747,#dc2626)">🛡️</div>
        <div>
          <div class="tool-card-title">Safety Auditor</div>
          <div class="tool-card-desc">Auditá contenido antes de publicar: riesgos de marca, shadow ban, lenguaje problemático</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Caption completo</label>
        <textarea class="input" id="sf-caption" rows="4" placeholder="Pegá el caption completo con hashtags…"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Hooks (opcional, uno por línea)</label>
        <textarea class="input" id="sf-hooks" rows="2" placeholder="Hook principal&#10;Gancho alternativo…"></textarea>
      </div>
      <button class="btn" style="background:linear-gradient(135deg,#f04747,#dc2626);border:0;color:#fff;width:100%" id="sf-check-btn">🛡️ Auditar contenido</button>
    </div>
    <div id="sf-results" style="display:none"></div>
  </div>`;

const renderSafetyResults = (data, root) => {
  const el = root.querySelector('#sf-results');
  el.style.display = '';
  const score = data.score ?? 80;
  const scoreColor = score >= 80 ? 'ok' : score >= 60 ? 'warn' : 'crit';
  el.innerHTML = `
    <div class="result-card">
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:12px">
        <div class="score-ring-sm">
          <svg viewBox="0 0 60 60" style="width:60px;height:60px">
            <circle cx="30" cy="30" r="24" stroke="rgba(255,255,255,.1)" stroke-width="6" fill="none"/>
            <circle cx="30" cy="30" r="24" stroke="var(--${scoreColor})" stroke-width="6" fill="none"
              stroke-dasharray="${2 * Math.PI * 24}" stroke-dashoffset="${2 * Math.PI * 24 * (1 - score / 100)}"
              stroke-linecap="round" transform="rotate(-90 30 30)"/>
            <text x="30" y="35" text-anchor="middle" font-size="14" font-weight="800" fill="white">${score}</text>
          </svg>
        </div>
        <div>
          <div class="small" style="font-weight:700">Score de seguridad</div>
          <div class="tiny muted">${data.resumen ?? ''}</div>
        </div>
      </div>
      ${
        (data.problemas ?? []).length
          ? `
        <div style="margin-bottom:10px">
          <div class="small" style="font-weight:700;margin-bottom:6px">⚠️ Problemas detectados</div>
          ${(data.problemas ?? []).map((p) => `<div class="small muted" style="margin-bottom:4px">• ${escape(p)}</div>`).join('')}
        </div>`
          : '<div class="tag ok" style="display:inline-flex">✅ Sin problemas detectados</div>'
      }
      ${
        (data.sugerencias ?? []).length
          ? `
        <div>
          <div class="small" style="font-weight:700;margin-bottom:6px">💡 Sugerencias</div>
          ${(data.sugerencias ?? []).map((s) => `<div class="small muted" style="margin-bottom:4px">• ${escape(s)}</div>`).join('')}
        </div>`
          : ''
      }
    </div>`;
};

/* ══════════════════════════
   PROFILE AI
══════════════════════════ */
const profilePanel = () => `
  <div class="tool-panel" id="panel-profile">
    <div class="tool-card">
      <div class="tool-card-header">
        <div class="tool-card-icon" style="background:var(--ig-gradient)">✨</div>
        <div>
          <div class="tool-card-title">Profile AI Optimizer</div>
          <div class="tool-card-desc">Optimizá tu bio, nombre de usuario y propuesta de valor para maximizar conversiones</div>
        </div>
      </div>
      <div class="field-group">
        <label class="field-label">Bio actual</label>
        <textarea class="input" id="pf-bio" rows="3" placeholder="Pegá tu bio actual de Instagram…"></textarea>
      </div>
      <div class="field-group">
        <label class="field-label">Nombre de usuario actual</label>
        <input class="input" id="pf-handle" placeholder="@tuusuario" />
      </div>
      <div class="field-group">
        <label class="field-label">Objetivo principal</label>
        <select class="input" id="pf-goal">
          <option value="leads">Conseguir leads</option>
          <option value="ventas">Generar ventas</option>
          <option value="autoridad">Construir autoridad</option>
          <option value="comunidad">Crecer comunidad</option>
        </select>
      </div>
      <button class="btn gradient" style="width:100%" id="pf-optimize-btn">✨ Optimizar perfil</button>
    </div>
    <div id="pf-results" style="display:none"></div>
  </div>`;

const renderProfileResults = (data, root) => {
  const el = root.querySelector('#pf-results');
  el.style.display = '';
  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:14px">
      ${(data.bios ?? [])
        .map(
          (bio, i) => `
        <div class="result-card">
          <div class="result-card-head">
            <span>📝 <strong>Opción ${i + 1}</strong> ${bio.estrategia ? `<span class="tag muted tiny">${escape(bio.estrategia)}</span>` : ''}</span>
            <button class="btn ghost small copy-btn" data-copy="${escape(bio.bio ?? '')}">📋 Copiar</button>
          </div>
          <div class="result-text">${escape(bio.bio ?? '')}</div>
          ${bio.razon ? `<div class="tiny muted">${escape(bio.razon)}</div>` : ''}
        </div>`,
        )
        .join('')}
      ${
        data.nombreSugerido
          ? `
        <div class="result-card">
          <div class="result-card-head"><span>🏷️ <strong>Nombre sugerido</strong></span>
            <button class="btn ghost small copy-btn" data-copy="${escape(data.nombreSugerido)}">📋 Copiar</button>
          </div>
          <div class="result-text">${escape(data.nombreSugerido)}</div>
        </div>`
          : ''
      }
      ${
        data.linkTreeSugerido
          ? `
        <div class="result-card">
          <div class="result-card-head"><span>🔗 <strong>Link in bio sugerido</strong></span></div>
          <div class="tiny muted">${escape(data.linkTreeSugerido)}</div>
        </div>`
          : ''
      }
    </div>`;
  el.querySelectorAll('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigator.clipboard.writeText(btn.dataset.copy ?? '').then(() => toast('Copiado ✓', 'ok'));
    });
  });
};

/* ══════════════════════════
   PANEL RENDERER
══════════════════════════ */
const PANELS = {
  caption: captionPanel,
  hashtags: hashtagPanel,
  hooks: hooksPanel,
  repurpose: repurposePanel,
  safety: safetyPanel,
  profile: profilePanel,
};

const renderPanel = (content, root) => {
  const panelEl = content.querySelector('#tool-panel-area');
  panelEl.innerHTML = PANELS[activeTab]?.() ?? '';
  attachPanelListeners(content, root);
};

/* ══════════════════════════
   LISTENERS PER PANEL
══════════════════════════ */
const attachPanelListeners = (content, root) => {
  /* Tab nav */
  content.querySelectorAll('.tool-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      content
        .querySelectorAll('.tool-tab-btn')
        .forEach((b) => b.classList.toggle('active', b.dataset.tab === activeTab));
      renderPanel(content, root);
    });
  });

  /* Hook type chips */
  content.querySelectorAll('#hk-types .action-chip').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  /* Caption generate */
  content.querySelector('#cap-generate-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const ctx = content.querySelector('#cap-context')?.value.trim();
    const fmt = content.querySelector('#cap-format')?.value;
    if (!ctx) {
      toast('Escribí el contexto del post', 'warn');
      return;
    }
    setLoading(btn);
    try {
      const res = await api('/api/tools/caption', { body: { contexto: ctx, formato: fmt } });
      renderCaptionResults(res, content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });

  /* Hashtag generate */
  content.querySelector('#ht-generate-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const topic = content.querySelector('#ht-topic')?.value.trim();
    if (!topic) {
      toast('Ingresá un tema', 'warn');
      return;
    }
    setLoading(btn, 'Investigando…');
    try {
      const res = await api('/api/tools/hashtags', { body: { tema: topic } });
      renderHashtagResults(res, content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });

  /* Hooks generate */
  content.querySelector('#hk-generate-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const idea = content.querySelector('#hk-idea')?.value.trim();
    if (!idea) {
      toast('Ingresá una idea', 'warn');
      return;
    }
    const tipos = [...content.querySelectorAll('#hk-types .action-chip.active')].map((c) => c.dataset.type);
    setLoading(btn);
    try {
      const res = await api('/api/tools/hooks', { body: { idea, tipos } });
      renderHookResults(res.hooks ?? [], content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });

  /* Repurpose */
  content.querySelector('#rp-generate-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const title = content.querySelector('#rp-title')?.value.trim();
    const text = content.querySelector('#rp-text')?.value.trim();
    const type = content.querySelector('#rp-type')?.value;
    if (!title || !text) {
      toast('Completá título y texto', 'warn');
      return;
    }
    const opts = {
      carruseles: content.querySelector('#rp-carousel')?.checked ? 1 : 0,
      reels: content.querySelector('#rp-reel')?.checked ? 1 : 0,
      stories: content.querySelector('#rp-stories')?.checked ? 1 : 0,
    };
    setLoading(btn, 'Repurposeando…');
    try {
      const res = await api('/api/tools/repurpose', { body: { titulo: title, tipo: type, texto: text, ...opts } });
      renderRepurposeResults(res, content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });

  /* Safety */
  content.querySelector('#sf-check-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const caption = content.querySelector('#sf-caption')?.value.trim();
    if (!caption) {
      toast('Pegá el caption a auditar', 'warn');
      return;
    }
    const hooksRaw = content.querySelector('#sf-hooks')?.value.trim();
    const hooks = hooksRaw ? hooksRaw.split('\n').filter(Boolean) : [];
    setLoading(btn, 'Auditando…');
    try {
      const res = await api('/api/tools/safety', { body: { caption, hooks } });
      renderSafetyResults(res, content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });

  /* Profile */
  content.querySelector('#pf-optimize-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const bio = content.querySelector('#pf-bio')?.value.trim();
    if (!bio) {
      toast('Pegá tu bio actual', 'warn');
      return;
    }
    setLoading(btn, 'Analizando…');
    try {
      const res = await api('/api/tools/profile', {
        body: {
          bio,
          handle: content.querySelector('#pf-handle')?.value.trim(),
          objetivo: content.querySelector('#pf-goal')?.value,
        },
      });
      renderProfileResults(res, content);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      clearLoading(btn);
    }
  });
};

/* ══════════════════════════
   ENTRY
══════════════════════════ */
export const renderTools = async (root) => {
  activeTab = 'caption';
  root.innerHTML = `
    <!-- Hero gradient -->
    <header class="tools-hero">
      <div class="tools-hero-content">
        <div class="tools-hero-emoji">🧰</div>
        <div>
          <h1 class="tools-hero-title">AI Toolbox</h1>
          <p class="tools-hero-sub">6 herramientas de IA especializadas para cada etapa de tu contenido. Generá, mejorá, validá.</p>
        </div>
      </div>
      <div class="tools-hero-stats">
        <div class="tools-hero-stat"><div class="num">${TABS.length}</div><div class="lbl">herramientas</div></div>
        <div class="tools-hero-stat"><div class="num">∞</div><div class="lbl">generaciones</div></div>
        <div class="tools-hero-stat"><div class="num">⚡</div><div class="lbl">tiempo real</div></div>
      </div>
    </header>

    <!-- Grid de tools — visual cards -->
    <div class="tools-grid" id="tools-grid">
      ${TABS.map(
        (t) => `
        <button class="tools-card ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}" style="--tool-grad:${t.gradient}">
          <div class="tools-card-icon">${t.icon}</div>
          <div class="tools-card-info">
            <div class="tools-card-name">${t.label}</div>
            <div class="tools-card-desc">${t.desc}</div>
          </div>
          <div class="tools-card-arrow">→</div>
        </button>`,
      ).join('')}
    </div>

    <!-- Active panel -->
    <div id="tool-panel-area" class="page-body tools-panel-area"></div>

    <style>
      .tools-hero {
        display: flex; align-items: center; justify-content: space-between; gap: 18px;
        padding: 22px 24px; margin-bottom: 18px;
        background: linear-gradient(135deg, #1a1a2e, #2a1a3e 50%, #1a2a3e);
        border-radius: 18px; position: relative; overflow: hidden;
        flex-wrap: wrap;
      }
      .tools-hero::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at 0% 100%, rgba(168,85,247,.25), transparent 50%),
                    radial-gradient(circle at 100% 0%, rgba(236,72,153,.18), transparent 50%);
        pointer-events: none;
      }
      .tools-hero-content { display: flex; align-items: center; gap: 16px; position: relative; }
      .tools-hero-emoji { font-size: 48px; line-height: 1; filter: drop-shadow(0 4px 12px rgba(168,85,247,.4)); }
      .tools-hero-title { font-size: 28px; font-weight: 800; margin: 0; }
      .tools-hero-sub { font-size: 13.5px; color: rgba(255,255,255,.75); margin: 4px 0 0; max-width: 520px; line-height: 1.5; }
      .tools-hero-stats { display: flex; gap: 14px; position: relative; }
      .tools-hero-stat {
        background: rgba(255,255,255,.06); backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,.1); border-radius: 12px;
        padding: 10px 16px; text-align: center; min-width: 80px;
      }
      .tools-hero-stat .num { font-size: 22px; font-weight: 800; }
      .tools-hero-stat .lbl { font-size: 10px; opacity: .7; text-transform: uppercase; letter-spacing: .05em; margin-top: 2px; }

      .tools-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;
        margin-bottom: 22px;
      }
      .tools-card {
        position: relative; display: flex; align-items: center; gap: 12px; padding: 14px;
        border-radius: 14px; border: 1px solid var(--border, #2a2a32);
        background: var(--surface, #141418); color: var(--fg, #fff);
        cursor: pointer; text-align: left;
        transition: transform .15s, border-color .15s, box-shadow .2s;
        overflow: hidden;
      }
      .tools-card::before {
        content: ''; position: absolute; inset: 0; opacity: 0;
        background: var(--tool-grad); transition: opacity .2s;
      }
      .tools-card > * { position: relative; z-index: 1; }
      .tools-card:hover { transform: translateY(-2px); border-color: transparent; box-shadow: 0 8px 24px rgba(168,85,247,.25); }
      .tools-card:hover::before { opacity: .15; }
      .tools-card.active { border-color: transparent; box-shadow: 0 8px 24px rgba(168,85,247,.4); }
      .tools-card.active::before { opacity: 1; }
      .tools-card.active .tools-card-desc { color: rgba(255,255,255,.85); }
      .tools-card-icon { font-size: 28px; line-height: 1; flex-shrink: 0; }
      .tools-card-info { flex: 1; min-width: 0; }
      .tools-card-name { font-weight: 700; font-size: 14px; margin-bottom: 2px; }
      .tools-card-desc { font-size: 11.5px; color: var(--text-muted, #9CA3AF); line-height: 1.4; }
      .tools-card-arrow { font-size: 18px; opacity: .5; transition: transform .15s, opacity .15s; }
      .tools-card:hover .tools-card-arrow { opacity: 1; transform: translateX(2px); }
      .tools-card.active .tools-card-arrow { opacity: 1; }

      .tools-panel-area .tool-card {
        background: var(--surface, #141418); border: 1px solid var(--border, #2a2a32);
        border-radius: 14px; padding: 20px;
      }
    </style>`;

  // Listener para cards (delegación)
  root.querySelector('#tools-grid')?.addEventListener('click', (e) => {
    const card = e.target.closest('.tools-card');
    if (!card) return;
    activeTab = card.dataset.tab;
    root.querySelectorAll('.tools-card').forEach((c) => c.classList.toggle('active', c === card));
    renderPanel(root, root);
    root.querySelector('#tool-panel-area')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  renderPanel(root, root);
};
