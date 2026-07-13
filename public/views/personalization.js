/* ══════════════════════════════════════════════════════════════════════════════
   PERSONALIZATION — UI render-first (catálogos hardcoded), guarda al backend si está vivo
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

// ── Catálogos seed (UI no depende del backend para renderizar) ────────────────

const DEFAULT_CATALOGS = {
  mascots: [
    {
      id: 'talia',
      name: 'Talía',
      emoji: '🦊',
      description: 'Estratega cálida, te empuja sin ser autoritaria',
      personality: ['estratega', 'cómplice', 'cálida'],
    },
    {
      id: 'nova',
      name: 'Nova',
      emoji: '✨',
      description: 'Creativa, llena de ideas frescas',
      personality: ['creativa', 'curiosa', 'rápida'],
    },
    {
      id: 'luca',
      name: 'Luca',
      emoji: '🐺',
      description: 'Comercial, directo al grano para vender',
      personality: ['cerrador', 'directo', 'enfocado'],
    },
    {
      id: 'lia',
      name: 'Lía',
      emoji: '🌸',
      description: 'Empática, perfecta para gestión de comunidad',
      personality: ['empática', 'cuidadora', 'cercana'],
    },
    {
      id: 'scout',
      name: 'Scout',
      emoji: '🦅',
      description: 'Investigadora, detecta tendencias y oportunidades',
      personality: ['analítica', 'curiosa', 'precisa'],
    },
    {
      id: 'pixel',
      name: 'Pixel',
      emoji: '🎨',
      description: 'Diseñador visual, obsesivo con la estética',
      personality: ['creativo', 'detallista', 'visual'],
    },
  ],
  themes: [
    {
      id: 'sunrise',
      name: 'Sunrise',
      palette: ['#FBE7C6', '#FFD6A5', '#FFAD86', '#FF8E72'],
      vibe: 'Cálido y optimista, energía de mañana',
    },
    { id: 'ocean', name: 'Ocean', palette: ['#3FB8C9', '#2A8A98', '#1E5F73', '#0D3B4F'], vibe: 'Sereno y profesional' },
    {
      id: 'midnight',
      name: 'Midnight',
      palette: ['#1A1C1E', '#2D3033', '#6366F1', '#A855F7'],
      vibe: 'Sofisticado, vibe nocturna',
    },
    {
      id: 'forest',
      name: 'Forest',
      palette: ['#0F3D2E', '#16A085', '#52BE80', '#82E0AA'],
      vibe: 'Orgánico, sostenible',
    },
    {
      id: 'sunset',
      name: 'Sunset',
      palette: ['#FF6B6B', '#FFD93D', '#FF8E53', '#C44569'],
      vibe: 'Vibrante, lleno de vida',
    },
    { id: 'mono', name: 'Mono', palette: ['#0A0A0A', '#262626', '#737373', '#FAFAFA'], vibe: 'Minimalista absoluto' },
  ],
  soundPacks: [
    { id: 'gentle', name: 'Gentle', vibe: 'Notificaciones suaves, casi inaudibles' },
    { id: 'energetic', name: 'Energetic', vibe: 'Sonidos vibrantes, te suben el ánimo' },
    { id: 'retro', name: 'Retro', vibe: '8-bit nostalgia' },
    { id: 'natural', name: 'Natural', vibe: 'Sonidos orgánicos: agua, pájaros, viento' },
    { id: 'silent', name: 'Silent', vibe: 'Sin sonidos, solo visual' },
  ],
  densities: [
    { id: 'compact', name: 'Compacto', description: 'Más info por pantalla' },
    { id: 'comfortable', name: 'Cómodo', description: 'Equilibrio (default)' },
    { id: 'spacious', name: 'Espacioso', description: 'Mucho aire, fácil de leer' },
  ],
  fonts: [
    { id: 'inter', name: 'Inter', description: 'Moderna, neutral' },
    { id: 'merriweather', name: 'Merriweather', description: 'Editorial, profesional' },
    { id: 'jetbrains', name: 'JetBrains Mono', description: 'Mono, tech' },
    { id: 'system', name: 'Sistema', description: 'La fuente nativa del OS' },
  ],
};

const DEFAULT_CONFIG = {
  systemName: 'Talía',
  ownerNickname: '',
  mascot: 'talia',
  theme: 'sunrise',
  soundPack: 'gentle',
  voicePersonality: 'amistosa',
  density: 'comfortable',
  fontStyle: 'inter',
  enableCelebrations: true,
  enableNarration: true,
  enableEasterEggs: true,
  morningRitualEnabled: true,
  eveningRitualEnabled: true,
  curseWordsAllowed: false,
  morningTime: '09:00',
  eveningTime: '21:00',
  privateNotes: '',
};

// ── Render ───────────────────────────────────────────────────────────────────

const buildHTML = (config, catalogs, isOffline) => `
  <header class="pz-hero">
    <div class="pz-hero-inner">
      <div class="pz-hero-icon">🎨</div>
      <div>
        <h1 class="pz-hero-title">Personalización</h1>
        <p class="pz-hero-sub">Hacé que <strong>${escape(config.systemName ?? 'FeedIA')}</strong> se sienta tuyo. Nombre, tema, voz, rituales — todo a tu medida.</p>
      </div>
      ${isOffline ? '<span class="pz-offline-pill">📡 offline · cambios locales</span>' : ''}
    </div>
  </header>

  <!-- Tab navigation -->
  <nav class="pz-tabs" id="pz-tabs">
    <button class="pz-tab active" data-tab="identity">👤 Identidad</button>
    <button class="pz-tab" data-tab="mascot">🤝 Mascot</button>
    <button class="pz-tab" data-tab="theme">🎨 Tema</button>
    <button class="pz-tab" data-tab="voice">🗣️ Voz & sonido</button>
    <button class="pz-tab" data-tab="appearance">📐 Apariencia</button>
    <button class="pz-tab" data-tab="behavior">⚙️ Comportamiento</button>
    <button class="pz-tab" data-tab="notes">📝 Notas privadas</button>
    <button class="pz-tab pz-tab-brain" data-tab="branding">🧠 Branding IA</button>
  </nav>

  <section class="pz-panel" data-panel="identity">
    <div class="pz-card">
      <h3 class="pz-card-title">Identidad del sistema</h3>
      <p class="pz-card-sub">Definí cómo se llama el sistema y cómo te llama a vos.</p>
      <div class="pz-form-grid">
        <div>
          <label class="pz-label">¿Cómo querés llamarme?</label>
          <input id="systemName" class="pz-input" value="${escape(config.systemName)}" placeholder="Talía, FeedIA, Aurora…">
          <div class="pz-hint">El nombre aparece en saludos, narrador de voz y notificaciones.</div>
        </div>
        <div>
          <label class="pz-label">¿Cómo querés que te llame?</label>
          <input id="ownerNickname" class="pz-input" value="${escape(config.ownerNickname ?? '')}" placeholder="Lucas, capi, jefa…">
          <div class="pz-hint">Se usa en saludos personalizados y notificaciones.</div>
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="mascot" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Tu compañero (mascot)</h3>
      <p class="pz-card-sub">El mascot define la personalidad por defecto y el avatar del sistema.</p>
      <div class="pz-mascot-grid" id="mascot-grid">
        ${catalogs.mascots
          .map(
            (m) => `
          <button type="button" class="pz-mascot ${config.mascot === m.id ? 'selected' : ''}" data-id="${escape(m.id)}">
            <div class="pz-mascot-emoji">${escape(m.emoji)}</div>
            <div class="pz-mascot-name">${escape(m.name)}</div>
            <div class="pz-mascot-desc">${escape(m.description)}</div>
            <div class="pz-mascot-tags">
              ${m.personality.map((p) => `<span class="pz-tag">${escape(p)}</span>`).join('')}
            </div>
          </button>`,
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="theme" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Tema visual</h3>
      <p class="pz-card-sub">Paleta de colores y vibe general del sistema.</p>
      <div class="pz-theme-grid" id="theme-grid">
        ${catalogs.themes
          .map(
            (t) => `
          <button type="button" class="pz-theme ${config.theme === t.id ? 'selected' : ''}" data-id="${escape(t.id)}">
            <div class="pz-theme-palette">
              ${t.palette.map((c) => `<div class="pz-theme-swatch" style="background:${c};"></div>`).join('')}
            </div>
            <div class="pz-theme-name">${escape(t.name)}</div>
            <div class="pz-theme-vibe">${escape(t.vibe)}</div>
          </button>`,
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="voice" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Voz y tono</h3>
      <p class="pz-card-sub">Personalidad de las respuestas y sonido del sistema.</p>
      <label class="pz-label">Personalidad de voz</label>
      <select id="voicePersonality" class="pz-input">
        ${['amistosa', 'profesional', 'pícara', 'mentora', 'cómplice'].map((v) => `<option value="${v}" ${config.voicePersonality === v ? 'selected' : ''}>${v}</option>`).join('')}
      </select>

      <label class="pz-label" style="margin-top:16px;">Sound pack</label>
      <div class="pz-sound-grid" id="sound-grid">
        ${catalogs.soundPacks
          .map(
            (s) => `
          <button type="button" class="pz-sound ${config.soundPack === s.id ? 'selected' : ''}" data-id="${escape(s.id)}">
            <div class="pz-sound-name">${escape(s.name)}</div>
            <div class="pz-sound-vibe">${escape(s.vibe)}</div>
          </button>`,
          )
          .join('')}
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="appearance" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Apariencia</h3>
      <p class="pz-card-sub">Densidad de la interfaz y familia tipográfica.</p>
      <div class="pz-form-grid">
        <div>
          <label class="pz-label">Densidad</label>
          <select id="density" class="pz-input">
            ${catalogs.densities.map((d) => `<option value="${d.id}" ${config.density === d.id ? 'selected' : ''}>${d.name} — ${d.description}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="pz-label">Familia tipográfica</label>
          <select id="fontStyle" class="pz-input">
            ${catalogs.fonts.map((f) => `<option value="${f.id}" ${config.fontStyle === f.id ? 'selected' : ''}>${f.name} — ${f.description}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="behavior" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Comportamiento</h3>
      <p class="pz-card-sub">Qué hace el sistema, qué te avisa, qué celebra.</p>
      <div class="pz-toggle-list">
        <label class="pz-toggle">
          <span><strong>🎉 Celebraciones</strong><div class="pz-hint">Confetti + sonido al lograr hitos</div></span>
          <input type="checkbox" id="enableCelebrations" ${config.enableCelebrations ? 'checked' : ''}>
        </label>
        <label class="pz-toggle">
          <span><strong>🗣️ Narración por voz</strong><div class="pz-hint">El sistema te cuenta lo que hace ("Abriendo Canva...")</div></span>
          <input type="checkbox" id="enableNarration" ${config.enableNarration ? 'checked' : ''}>
        </label>
        <label class="pz-toggle">
          <span><strong>🥚 Easter eggs</strong><div class="pz-hint">Sorpresas ocasionales para alegrar la sesión</div></span>
          <input type="checkbox" id="enableEasterEggs" ${config.enableEasterEggs ? 'checked' : ''}>
        </label>
        <label class="pz-toggle">
          <span><strong>☀️ Ritual matutino</strong><div class="pz-hint">Briefing diario con plan y métricas</div></span>
          <input type="checkbox" id="morningRitualEnabled" ${config.morningRitualEnabled ? 'checked' : ''}>
        </label>
        <label class="pz-toggle">
          <span><strong>🌙 Ritual nocturno</strong><div class="pz-hint">Cierre del día con resumen y aprendizajes</div></span>
          <input type="checkbox" id="eveningRitualEnabled" ${config.eveningRitualEnabled ? 'checked' : ''}>
        </label>
        <label class="pz-toggle">
          <span><strong>🤬 Lenguaje fuerte</strong><div class="pz-hint">Permite que el sistema se exprese sin filtros</div></span>
          <input type="checkbox" id="curseWordsAllowed" ${config.curseWordsAllowed ? 'checked' : ''}>
        </label>
      </div>

      <div class="pz-form-grid" style="margin-top:16px;">
        <div>
          <label class="pz-label">Hora ritual matutino</label>
          <input id="morningTime" type="time" class="pz-input" value="${escape(config.morningTime)}">
        </div>
        <div>
          <label class="pz-label">Hora ritual nocturno</label>
          <input id="eveningTime" type="time" class="pz-input" value="${escape(config.eveningTime)}">
        </div>
      </div>
    </div>
  </section>

  <section class="pz-panel" data-panel="notes" hidden>
    <div class="pz-card">
      <h3 class="pz-card-title">Notas privadas</h3>
      <p class="pz-card-sub">Cosas que querés que el sistema tenga presente. No se publican: solo se usan como contexto.</p>
      <textarea id="privateNotes" class="pz-input pz-textarea" rows="6" placeholder="Ej: prefiero publicar martes y jueves, mi mejor amigo se llama Mati, no quiero hablar de política…">${escape(config.privateNotes ?? '')}</textarea>
      <div class="pz-hint">Tip: cuanto más específico, mejor adapta las respuestas el asistente.</div>
    </div>
  </section>

  <section class="pz-panel" data-panel="branding" hidden>
    <div id="bb-panel-inner">
      <div class="pz-card" style="text-align:center;padding:32px;">
        <div style="font-size:32px;margin-bottom:8px;">🧠</div>
        <div class="small muted">Cargando Branding Brain…</div>
      </div>
    </div>
  </section>

  <div class="pz-actions">
    <button class="btn primary" id="save-btn">💾 Guardar cambios</button>
    <button class="btn ghost" id="reset-btn">🔄 Restaurar defaults</button>
    ${isOffline ? '<div class="small muted" style="align-self:center;">⚠️ Los cambios se guardarán cuando el servidor vuelva</div>' : ''}
  </div>
`;

const wireEvents = (container) => {
  // Tabs — con lazy-load del panel Branding Brain
  let brandingPanelLoaded = false;
  container.querySelectorAll('.pz-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      container.querySelectorAll('.pz-tab').forEach((t) => t.classList.toggle('active', t === tab));
      container.querySelectorAll('.pz-panel').forEach((p) => {
        p.hidden = p.dataset.panel !== target;
      });
      // Lazy-load del panel Branding Brain la primera vez que se abre el tab
      if (target === 'branding' && !brandingPanelLoaded) {
        brandingPanelLoaded = true;
        void renderBrandingBrainPanel(container);
      }
    });
  });

  // Selectores (cards)
  const wireSelect = (selector) => {
    container.querySelectorAll(selector).forEach((el) => {
      el.addEventListener('click', () => {
        container.querySelectorAll(selector).forEach((x) => x.classList.remove('selected'));
        el.classList.add('selected');
      });
    });
  };
  wireSelect('.pz-mascot');
  wireSelect('.pz-theme');
  wireSelect('.pz-sound');

  // Save
  document.getElementById('save-btn')?.addEventListener('click', async () => {
    const updates = {
      systemName: document.getElementById('systemName').value,
      ownerNickname: document.getElementById('ownerNickname').value || undefined,
      mascot: container.querySelector('.pz-mascot.selected')?.dataset.id,
      theme: container.querySelector('.pz-theme.selected')?.dataset.id,
      soundPack: container.querySelector('.pz-sound.selected')?.dataset.id,
      voicePersonality: document.getElementById('voicePersonality').value,
      density: document.getElementById('density').value,
      fontStyle: document.getElementById('fontStyle').value,
      enableCelebrations: document.getElementById('enableCelebrations').checked,
      enableNarration: document.getElementById('enableNarration').checked,
      enableEasterEggs: document.getElementById('enableEasterEggs').checked,
      morningRitualEnabled: document.getElementById('morningRitualEnabled').checked,
      eveningRitualEnabled: document.getElementById('eveningRitualEnabled').checked,
      curseWordsAllowed: document.getElementById('curseWordsAllowed').checked,
      morningTime: document.getElementById('morningTime').value,
      eveningTime: document.getElementById('eveningTime').value,
      privateNotes: document.getElementById('privateNotes').value,
    };
    // Guardar localmente siempre (sobrevive a backend caído)
    try {
      localStorage.setItem('feedia.personalization', JSON.stringify(updates));
    } catch {
      /* noop */
    }
    const { error } = await apiSafe('/api/personalization', null, { method: 'PUT', body: updates });
    apiBust('/api/personalization');
    if (error) {
      toast('💾 Guardado localmente. Se sincronizará con el server cuando vuelva.', 'warn');
    } else {
      toast('✨ Personalización guardada', 'success');
      const cssLink = document.getElementById('personalization-css');
      if (cssLink) cssLink.href = `/api/personalization/css?ts=${Date.now()}`;
    }
  });

  // Reset
  document.getElementById('reset-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Restaurar defaults?')) return;
    try {
      localStorage.removeItem('feedia.personalization');
    } catch {
      /* noop */
    }
    await apiSafe('/api/personalization/reset', null, { method: 'POST', body: {} });
    apiBust('/api/personalization');
    toast('Restaurado a defaults', 'info');
    renderPersonalization(container);
  });
};

const loadLocalConfig = () => {
  try {
    const raw = localStorage.getItem('feedia.personalization');
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  return null;
};

/* ── Brand Board (ex-moodboard) integrado a Personalización ─────────────── */
const escAttr = (s) =>
  String(s ?? '')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
const escTxt = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const renderBrandBoard = (brand) => {
  if (!brand) return '';
  const palette = Array.isArray(brand?.visual?.palette) ? brand.visual.palette : [];
  const fonts = Array.isArray(brand?.visual?.typography) ? brand.visual.typography : [];
  const tone = Array.isArray(brand?.voice?.tone) ? brand.voice.tone : [];
  const forbidden = Array.isArray(brand?.voice?.forbidden) ? brand.voice.forbidden : [];
  const style = brand?.visual?.style ?? '';
  const mood = brand?.visual?.mood ?? '';
  const name = brand?.name ?? 'Tu marca';
  const niche = brand?.niche ?? '';
  return `
    <section id="brand-board-section" class="card brand-board" style="margin-top:18px;">
      <div class="row spread" style="align-items:flex-start;gap:14px;flex-wrap:wrap;">
        <div>
          <h2 style="margin:0 0 4px;font-size:18px;">🎨 Brand Board · ${escTxt(name)}</h2>
          <p class="small muted" style="margin:0;">Identidad viva de tu marca — paleta, tipografías, voz y mood, todo en un lugar.</p>
        </div>
        <a class="btn ghost tiny" href="#moodboard" title="Vista clásica completa de Moodboard">↗ Vista clásica</a>
      </div>

      <div class="bb-grid">
        <div class="bb-tile">
          <div class="bb-tile-h">🎨 Paleta</div>
          ${
            palette.length
              ? `<div class="bb-swatches">${palette
                  .slice(0, 8)
                  .map(
                    (c) => `
            <div class="bb-swatch" title="${escAttr(c)}">
              <div class="bb-color" style="background:${escAttr(c)};"></div>
              <div class="bb-hex">${escTxt(c)}</div>
            </div>`,
                  )
                  .join('')}</div>`
              : '<div class="tiny muted">Sin paleta cargada todavía.</div>'
          }
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">🔤 Tipografía</div>
          ${
            fonts.length
              ? fonts
                  .slice(0, 3)
                  .map(
                    (f, i) => `
            <div class="bb-font" style="font-family:'${escAttr(f)}', ui-sans-serif, system-ui;">
              <div style="font-size:${i === 0 ? '28px' : '20px'};font-weight:${i === 0 ? 800 : 600};line-height:1.05;">Aa</div>
              <div class="tiny muted">${escTxt(f)}</div>
            </div>`,
                  )
                  .join('')
              : '<div class="tiny muted">Sin tipografías configuradas.</div>'
          }
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">🎙️ Voz</div>
          ${tone.length ? `<div class="meta" style="margin-bottom:8px;">${tone.map((t) => `<span class="tag tiny accent">${escTxt(t)}</span>`).join('')}</div>` : ''}
          ${forbidden.length ? `<div class="tiny muted" style="margin-top:6px;"><b>Prohibido:</b> ${forbidden.map(escTxt).join(' · ')}</div>` : ''}
          ${!tone.length && !forbidden.length ? '<div class="tiny muted">Sin voz definida aún.</div>' : ''}
        </div>

        <div class="bb-tile">
          <div class="bb-tile-h">✨ Mood & estilo</div>
          ${style ? `<div class="small"><b>Estilo:</b> ${escTxt(style)}</div>` : ''}
          ${mood ? `<div class="small" style="margin-top:4px;"><b>Mood:</b> ${escTxt(mood)}</div>` : ''}
          ${niche ? `<div class="small muted" style="margin-top:6px;">Nicho · ${escTxt(niche)}</div>` : ''}
          ${!style && !mood ? '<div class="tiny muted">Sin mood definido.</div>' : ''}
        </div>

        <div class="bb-tile bb-canva" id="canva-connect-tile">
          <div class="bb-tile-h">🎨 Canva Connect</div>
          <div class="tiny muted" id="canva-status">verificando…</div>
          <div id="canva-actions" style="margin-top:10px;"></div>
        </div>
      </div>

      <style>
        .brand-board{background:linear-gradient(135deg,rgba(225,48,108,.05),rgba(168,85,247,.03));}
        .bb-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-top:14px;}
        .bb-tile{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:14px;}
        .bb-tile-h{font-size:12px;font-weight:700;letter-spacing:.02em;color:var(--text-secondary,#aab);margin-bottom:10px;text-transform:uppercase;}
        .bb-swatches{display:flex;flex-wrap:wrap;gap:8px;}
        .bb-swatch{display:flex;flex-direction:column;align-items:center;gap:4px;}
        .bb-color{width:42px;height:42px;border-radius:10px;border:1px solid var(--border);box-shadow:inset 0 1px 0 rgba(255,255,255,.05);}
        .bb-hex{font-size:10px;font-family:ui-monospace,monospace;color:var(--text-tertiary,#8a8a98);}
        .bb-font{display:flex;align-items:baseline;gap:10px;padding:6px 0;border-top:1px solid var(--border-soft,#222);}
        .bb-font:first-of-type{border-top:0;padding-top:0;}
      </style>
    </section>`;
};

const wireCanvaConnect = async (container) => {
  const statusEl = container.querySelector('#canva-status');
  const actionsEl = container.querySelector('#canva-actions');
  if (!statusEl || !actionsEl) return;
  // Prefiere el health check (más informativo); cae a /users si no existe.
  const health = await apiSafe('/api/canva/health', null);
  if (health.data) {
    const h = health.data;
    if (h.apiReachable) {
      statusEl.innerHTML = `<span class="tag tiny ok">operativo</span> ${escTxt(h.message ?? '')}`;
    } else if (h.connected) {
      statusEl.innerHTML = `<span class="tag tiny warn">conectado · API caída</span> ${escTxt(h.reason ?? '')}`;
    } else if (h.oauthConfigured) {
      statusEl.innerHTML = `<span class="tag tiny warn">desconectado</span> Sin cuentas Canva conectadas.`;
    } else {
      statusEl.innerHTML = `<span class="tag tiny crit">no configurado</span> ${escTxt(h.reason ?? '')}`;
    }
    actionsEl.innerHTML = h.connected
      ? `<div class="tiny" style="margin-bottom:6px;">${h.tokens} cuenta(s) conectada(s).</div>
         <div class="btn-row">
           <a class="btn ghost tiny" href="/connect/canva">+ Conectar otra</a>
           <button class="btn ghost tiny" id="canva-disconnect-btn">Desconectar</button>
         </div>`
      : h.oauthConfigured
        ? `<a class="btn primary tiny" href="/connect/canva">🔗 Conectar Canva</a>
           <div class="tiny muted" style="margin-top:6px;">Habilita "Render Canva (API)" en Carrusel Studio.</div>`
        : `<div class="tiny muted">Configurá <code>CANVA_CLIENT_ID</code> y <code>CANVA_CLIENT_SECRET</code> en <code>.env</code> y reiniciá el servidor.</div>`;
    actionsEl.querySelector('#canva-disconnect-btn')?.addEventListener('click', async () => {
      if (!confirm('¿Desconectar todas las cuentas Canva conectadas?')) return;
      const r = await apiSafe('/api/canva/disconnect', null, { method: 'POST', body: {} });
      if (!r.error) wireCanvaConnect(container);
    });
    return;
  }
  // Fallback: servidor viejo sin /health → usar /users.
  const { data, error } = await apiSafe('/api/canva/users', { users: [] });
  if (error) {
    statusEl.textContent = '📡 endpoint no disponible (servidor desactualizado)';
    actionsEl.innerHTML = '';
    return;
  }
  const users = Array.isArray(data?.users) ? data.users : [];
  statusEl.innerHTML = users.length
    ? `<span class="tag tiny ok">conectado</span> ${users.length} cuenta(s).`
    : '<span class="tag tiny warn">desconectado</span> Sin cuentas Canva.';
  actionsEl.innerHTML = users.length
    ? `<a class="btn ghost tiny" href="/connect/canva">+ Conectar otra</a>`
    : `<a class="btn primary tiny" href="/connect/canva">🔗 Conectar Canva</a>`;
};

const appendBrandBoard = async (container) => {
  // Idempotente: si ya está, lo reemplazamos.
  const existing = container.querySelector('#brand-board-section');
  if (existing) existing.remove();
  const { data: brand } = await apiSafe('/api/brand', null);
  const html = renderBrandBoard(brand);
  if (!html) return;
  container.insertAdjacentHTML('beforeend', html);
  void wireCanvaConnect(container);
};

// ── Branding Brain panel ──────────────────────────────────────────────────────

const BB_AGENTS_STATIC = [
  {
    id: 'brand-strategist-senior',
    name: 'Lorenzo Vidal',
    emoji: '🏛️',
    role: 'Estratega Senior',
    specialty: 'Visión, misión, valores, posicionamiento',
  },
  {
    id: 'audience-researcher',
    name: 'Renata Ibáñez',
    emoji: '🔬',
    role: 'Investigador Audiencia',
    specialty: 'Avatar, JTBD, dolores, deseos',
  },
  {
    id: 'naming-voice',
    name: 'Tomás Quiroga',
    emoji: '📣',
    role: 'Naming & Voz',
    specialty: 'Tono, vocabulario, hooks de marca',
  },
  {
    id: 'visual-identity',
    name: 'Aurora Blanchet',
    emoji: '🎨',
    role: 'Identidad Visual',
    specialty: 'Paleta, tipografía, mood, iconografía',
  },
  {
    id: 'narrative-architect',
    name: 'Joaquín Bressan',
    emoji: '📖',
    role: 'Narrativa',
    specialty: 'Origin story, mensajes clave, arcos',
  },
  {
    id: 'differential-strategist',
    name: 'Mariela Costa',
    emoji: '⚡',
    role: 'Estratega Diferencial',
    specialty: 'Anti-genérico, takes únicos, innovación',
  },
  {
    id: 'influencer-positioner',
    name: 'Bautista Roldán',
    emoji: '🌟',
    role: 'Posicionador Influencer',
    specialty: 'Autoridad de nicho, signature pieces',
  },
  {
    id: 'coherence-guardian',
    name: 'Helena Saavedra',
    emoji: '🛡️',
    role: 'Guardian Coherencia',
    specialty: 'Auditoría de identidad y consistencia',
  },
];

const buildBrandingBrainHTML = (brand, nichePacks = []) => {
  const hasStrategy = brand?.brandStrategy?.positioning;
  const activeNichePackId = brand?.nichePackId ?? null;

  // Group packs by account category for the selector UI
  /** @type {Record<string, Array<{id:string,label:string,emoji:string,description:string}>>} */
  const packsByCategory = nichePacks.reduce((acc, p) => {
    if (!acc[p.accountCategory]) acc[p.accountCategory] = [];
    acc[p.accountCategory].push(p);
    return acc;
  }, {});

  const CATEGORY_LABELS = {
    'marca-personal': '👤 Marca Personal',
    empresa: '🏢 Empresa',
    agencia: '🏛️ Agencia',
    'creador-de-contenido': '🎬 Creador de Contenido',
    'profesional-independiente': '💼 Profesional Independiente',
    'comercio-local': '🏪 Comercio Local',
    influencer: '🌟 Influencer',
    educador: '🎓 Educador',
    artista: '🎨 Artista',
  };

  const nicheOptionsHtml = Object.entries(packsByCategory)
    .map(
      ([cat, packs]) => `
    <optgroup label="${CATEGORY_LABELS[cat] ?? cat}">
      ${packs.map((p) => `<option value="${escAttr(p.id)}" ${p.id === activeNichePackId ? 'selected' : ''}>${p.emoji} ${escTxt(p.label)}</option>`).join('')}
    </optgroup>
  `,
    )
    .join('');

  return `
    <style>
      .pz-tab-brain { background: linear-gradient(135deg,rgba(168,85,247,.15),rgba(59,130,246,.1)); }
      .pz-tab-brain.active { background: linear-gradient(135deg,rgba(168,85,247,.35),rgba(59,130,246,.2)); }
      .bb-agents { display:grid; grid-template-columns:repeat(auto-fit,minmax(200px,1fr)); gap:10px; margin:14px 0; }
      .bb-agent { background:var(--bg-card,#15151b); border:1px solid var(--border); border-radius:12px; padding:12px 14px; display:flex; gap:10px; align-items:flex-start; }
      .bb-agent-emoji { font-size:22px; line-height:1; flex-shrink:0; margin-top:2px; }
      .bb-agent-info { min-width:0; }
      .bb-agent-name { font-weight:700; font-size:13px; }
      .bb-agent-role { font-size:11px; color:var(--text-secondary,#aab); margin-top:1px; }
      .bb-agent-spec { font-size:11px; color:var(--text-tertiary,#888); margin-top:4px; line-height:1.4; }
      .bb-agent.active-agent { border-color:rgba(168,85,247,.6); background:rgba(168,85,247,.07); animation:bb-pulse 1.5s ease-in-out infinite; }
      @keyframes bb-pulse { 0%,100%{opacity:1} 50%{opacity:.7} }
      .bb-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
      @media(max-width:600px){ .bb-form-grid{grid-template-columns:1fr;} }
      .bb-score-ring { display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:50%; border:3px solid; font-size:18px; font-weight:800; flex-shrink:0; }
      .bb-step { border-left:2px solid var(--border); padding:0 0 16px 14px; margin-left:11px; position:relative; }
      .bb-step::before { content:''; position:absolute; left:-5px; top:4px; width:8px; height:8px; border-radius:50%; background:var(--accent,#a855f7); }
      .bb-step-header { display:flex; gap:8px; align-items:center; margin-bottom:6px; }
      .bb-step-agent { font-weight:700; font-size:13px; }
      .bb-step-phase { font-size:11px; color:var(--text-secondary,#aab); }
      .bb-step-output { font-size:12px; color:var(--text-secondary,#aab); line-height:1.5; white-space:pre-wrap; }
      .bb-cache-bar { height:6px; border-radius:3px; background:var(--border); overflow:hidden; margin-top:4px; }
      .bb-cache-fill { height:100%; border-radius:3px; background:linear-gradient(90deg,#10b981,#34d399); transition:width .6s; }
      .bb-results-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(220px,1fr)); gap:10px; margin-top:14px; }
      .bb-result-tile { background:var(--bg-card,#15151b); border:1px solid var(--border); border-radius:12px; padding:14px; }
      .bb-result-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.04em; color:var(--text-secondary,#aab); margin-bottom:8px; }
      /* Niche pack selector */
      .bb-niche-banner { display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:10px; border:1px solid rgba(168,85,247,.35); background:rgba(168,85,247,.06); margin-bottom:10px; }
      .bb-niche-emoji { font-size:24px; flex-shrink:0; }
      .bb-niche-info { flex:1; min-width:0; }
      .bb-niche-name { font-weight:700; font-size:13px; }
      .bb-niche-desc { font-size:11px; color:var(--text-secondary,#aab); margin-top:2px; }
      .bb-niche-pillars { display:flex; gap:6px; flex-wrap:wrap; margin-top:6px; }
      .bb-pillar-tag { font-size:10px; background:rgba(168,85,247,.15); border:1px solid rgba(168,85,247,.3); border-radius:20px; padding:2px 8px; color:var(--text-secondary,#aab); }
    </style>

    <div class="pz-card" style="background:linear-gradient(135deg,rgba(168,85,247,.08),rgba(59,130,246,.04));border-color:rgba(168,85,247,.25);">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;">
        <span style="font-size:28px;">🧠</span>
        <div>
          <h3 class="pz-card-title" style="margin:0;">Branding Brain</h3>
          <p class="pz-card-sub" style="margin:0;">8 especialistas IA construyen y refinan la identidad completa de tu marca en un solo job.</p>
        </div>
        ${hasStrategy ? '<span class="tag tiny ok" style="margin-left:auto;flex-shrink:0;">Estrategia activa</span>' : '<span class="tag tiny warn" style="margin-left:auto;flex-shrink:0;">Sin estrategia aún</span>'}
      </div>
    </div>

    <!-- Agentes -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:10px;">El equipo</div>
      <div class="bb-agents" id="bb-agents-grid">
        ${BB_AGENTS_STATIC.map(
          (a) => `
          <div class="bb-agent" data-agent-id="${escAttr(a.id)}">
            <div class="bb-agent-emoji">${escTxt(a.emoji)}</div>
            <div class="bb-agent-info">
              <div class="bb-agent-name">${escTxt(a.name)}</div>
              <div class="bb-agent-role">${escTxt(a.role)}</div>
              <div class="bb-agent-spec">${escTxt(a.specialty)}</div>
            </div>
          </div>`,
        ).join('')}
      </div>
    </div>

    <!-- Niche Pack selector -->
    <div class="pz-card" style="margin-top:10px;" id="bb-niche-card">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
        <div class="pz-card-title" style="font-size:13px;margin:0;">🗂️ Tipo de cuenta</div>
        <span class="tiny muted">Pre-configura la estrategia para tu industria</span>
        ${activeNichePackId ? `<span class="tag tiny ok" style="margin-left:auto;">Pack activo</span>` : ''}
      </div>

      <div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;">
        <div style="flex:1;min-width:220px;">
          <label class="pz-label">Seleccioná tu tipo de cuenta</label>
          <select id="bb-niche-select" class="pz-input">
            <option value="">— Sin pack (modo libre) —</option>
            ${nicheOptionsHtml}
          </select>
        </div>
        <button class="btn ghost" id="bb-niche-apply-btn" style="flex-shrink:0;height:38px;">
          Aplicar pack
        </button>
      </div>

      <!-- Preview del pack seleccionado -->
      <div id="bb-niche-preview" style="margin-top:10px;display:none;"></div>
    </div>

    <!-- Presets rápidos -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;">⚡ Presets rápidos</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
        <button class="btn ghost tiny bb-preset" data-goal="Quiero convertir mi cuenta en una autoridad de nicho y construir una audiencia masiva que confíe en mi criterio" data-tier="established">🚀 Convertirme en influencer</button>
        <button class="btn ghost tiny bb-preset" data-goal="Necesito construir mi identidad de marca desde cero — no sé por dónde empezar" data-tier="starting" data-mode="discovery">🌱 Arrancar desde cero</button>
        <button class="btn ghost tiny bb-preset" data-goal="Mi marca ya existe pero necesita un salto de calidad en posicionamiento, voz y visual" data-tier="growing" data-mode="evolution">⚡ Evolucionar mi marca actual</button>
        <button class="btn ghost tiny bb-preset" data-goal="Quiero construir la identidad digital de mi negocio local para atraer clientes de la zona" data-tier="starting">🏢 Marca para mi negocio local</button>
        <button class="btn ghost tiny bb-preset" data-goal="Soy profesional y quiero que mi Instagram refleje mi expertise y atraiga clientes o empleadores" data-tier="growing">🎓 Autoridad en mi nicho profesional</button>
      </div>
    </div>

    <!-- Formulario -->
    <div class="pz-card" style="margin-top:10px;" id="bb-form-card">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:12px;">Nuevo job de branding</div>
      <div>
        <label class="pz-label">🎯 Objetivo principal <span style="color:#f87171;">*</span></label>
        <textarea id="bb-goal" class="pz-input pz-textarea" rows="2" placeholder="Ej: Quiero construir mi marca personal como referente de marketing digital en Argentina…"></textarea>
      </div>
      <div class="bb-form-grid" style="margin-top:10px;">
        <div>
          <label class="pz-label">💡 Tus ideas (opcional)</label>
          <textarea id="bb-ideas" class="pz-input pz-textarea" rows="2" placeholder="Ideas, intuiciones o elementos que sí o sí querés incluir…"></textarea>
        </div>
        <div>
          <label class="pz-label">🚫 Restricciones (opcional)</label>
          <textarea id="bb-constraints" class="pz-input pz-textarea" rows="2" placeholder="Cosas que no querés, limitaciones de presupuesto, etc…"></textarea>
        </div>
      </div>
      <div class="bb-form-grid" style="margin-top:10px;">
        <div>
          <label class="pz-label">📊 Tier actual</label>
          <select id="bb-tier" class="pz-input">
            <option value="starting">🌱 Starting — arrancando de cero</option>
            <option value="growing" selected>🌿 Growing — creciendo (default)</option>
            <option value="established">🌳 Established — ya tengo audiencia</option>
            <option value="influencer">⭐ Influencer — referente del nicho</option>
          </select>
        </div>
        <div>
          <label class="pz-label">🔄 Modo</label>
          <select id="bb-mode" class="pz-input">
            <option value="discovery">🔍 Discovery — construir desde cero</option>
            <option value="refinement" selected>✨ Refinement — mejorar lo existente</option>
            <option value="evolution">🚀 Evolution — next level</option>
            <option value="autopilot">🤖 Autopilot — full auto</option>
          </select>
        </div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
        <button class="btn primary" id="bb-run-btn" style="background:linear-gradient(135deg,#a855f7,#3b82f6);border:none;">
          🧠 Activar Branding Brain
        </button>
        <div class="small muted">~2-3 min · 8 agentes · Opus 4.7 + Sonnet 4.6</div>
      </div>
    </div>

    <!-- Resultados (oculto hasta que corra) -->
    <div id="bb-results" style="display:none;margin-top:10px;"></div>
  `;
};

const renderBrandingResults = (container, result) => {
  const resultsEl = container.querySelector('#bb-results');
  if (!resultsEl) return;

  const score = result.coherenceReport?.score ?? 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  const cacheTotal = result.totalCacheReadTokens + result.totalCacheWriteTokens;
  const cachePct = cacheTotal > 0 ? Math.round((result.totalCacheReadTokens / cacheTotal) * 100) : 0;
  const savedPct = Math.round(cachePct * 0.8); // estimado: 80% de ahorro en los tokens cacheados

  resultsEl.style.display = 'block';
  resultsEl.innerHTML = `
    <!-- Header de resultados -->
    <div class="pz-card" style="background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(168,85,247,.05));border-color:rgba(16,185,129,.3);">
      <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
        <div class="bb-score-ring" style="border-color:${escAttr(scoreColor)};color:${escAttr(scoreColor)};">${score}</div>
        <div style="flex:1;min-width:160px;">
          <div style="font-weight:700;font-size:15px;">Coherencia de marca: ${score}/100</div>
          <div class="small muted" style="margin-top:2px;">${result.coherenceReport?.conflicts?.length ? result.coherenceReport.conflicts.length + ' conflicto(s) detectado(s)' : '✅ Sin conflictos críticos'}</div>
          <div style="margin-top:6px;">
            <div style="font-size:11px;color:var(--text-secondary,#aab);margin-bottom:3px;">Ahorro de caché estimado: ${savedPct}%</div>
            <div class="bb-cache-bar"><div class="bb-cache-fill" style="width:${cachePct}%;"></div></div>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="btn ghost tiny" id="bb-apply-btn">💾 Aplicar a marca</button>
          <button class="btn ghost tiny" id="bb-rerun-btn">🔄 Reejecutar</button>
        </div>
      </div>
    </div>

    <!-- Key outputs grid -->
    <div class="bb-results-grid">
      <div class="bb-result-tile">
        <div class="bb-result-label">🏛️ Posicionamiento</div>
        <div class="small">${escTxt(result.brandStrategy?.positioning ?? '—')}</div>
        <div class="tiny muted" style="margin-top:6px;">${escTxt(result.brandStrategy?.differentiator ?? '')}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">🎙️ Voz de marca</div>
        <div class="small">${(result.voice?.tone ?? []).map((t) => `<span class="tag tiny">${escTxt(t)}</span>`).join(' ')}</div>
        ${result.voice?.sampleHooks?.length ? `<div class="tiny muted" style="margin-top:6px;font-style:italic;">"${escTxt(result.voice.sampleHooks[0])}"</div>` : ''}
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">🎨 Identidad Visual</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px;">
          ${(result.visualIdentity?.palette ?? [])
            .slice(0, 5)
            .map(
              (c) =>
                `<div style="width:24px;height:24px;border-radius:6px;background:${escAttr(c)};border:1px solid var(--border);" title="${escAttr(c)}"></div>`,
            )
            .join('')}
        </div>
        <div class="tiny muted">${escTxt(result.visualIdentity?.mood ?? '')}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">⚡ Ángulo diferencial</div>
        <div class="small">${(result.differentialAngles?.contraTakes ?? [])
          .slice(0, 2)
          .map((t) => `<div style="margin-bottom:4px;">↯ ${escTxt(t)}</div>`)
          .join('')}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">🌟 Plan Influencer</div>
        <div class="small">${(result.influencerPlan?.authorityPillars ?? [])
          .slice(0, 3)
          .map((p) => `<div style="margin-bottom:3px;">▸ ${escTxt(p)}</div>`)
          .join('')}</div>
      </div>
      <div class="bb-result-tile">
        <div class="bb-result-label">🛡️ Recomendaciones</div>
        <div class="small">${(result.coherenceReport?.recommendations ?? [])
          .slice(0, 3)
          .map((r) => `<div style="margin-bottom:3px;">• ${escTxt(r)}</div>`)
          .join('')}</div>
      </div>
    </div>

    <!-- Steps trace acordeón -->
    <div class="pz-card" style="margin-top:10px;">
      <div class="pz-card-title" style="font-size:13px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
        Traza de agentes
        <button class="btn ghost tiny" id="bb-toggle-steps">Expandir todo</button>
      </div>
      <div id="bb-steps-list">
        ${(result.steps ?? [])
          .map(
            (s, i) => `
          <div class="bb-step" style="${i === result.steps.length - 1 ? 'padding-bottom:0;' : ''}">
            <div class="bb-step-header">
              <span style="font-size:16px;">${escTxt(s.emoji)}</span>
              <span class="bb-step-agent">${escTxt(s.agentName)}</span>
              <span class="bb-step-phase">${escTxt(s.phase)}</span>
              <span class="tiny muted" style="margin-left:auto;">${(s.durationMs / 1000).toFixed(1)}s${s.cacheReadTokens ? ' · 🟢 cache' : ''}</span>
            </div>
            <div class="bb-step-output">${escTxt(s.output)}</div>
          </div>`,
          )
          .join('')}
      </div>
    </div>
  `;

  // Wire apply button
  resultsEl.querySelector('#bb-apply-btn')?.addEventListener('click', async () => {
    const payload = {
      brandStrategy: result.brandStrategy,
      audienceAvatar: result.audienceAvatar,
      voice: result.voice,
      visualIdentity: result.visualIdentity,
      narrative: result.narrative,
    };
    const { error } = await apiSafe('/api/brand/apply-branding-brain', null, { method: 'POST', body: payload });
    if (error) {
      toast('⚠️ No se pudo aplicar. Guardando localmente…', 'warn');
      try {
        localStorage.setItem('feedia.brandingBrainResult', JSON.stringify(payload));
      } catch {
        /* noop */
      }
    } else {
      toast('✅ Identidad de marca actualizada con los resultados del Branding Brain', 'success');
    }
  });

  // Wire rerun button
  resultsEl.querySelector('#bb-rerun-btn')?.addEventListener('click', () => {
    resultsEl.style.display = 'none';
    container.querySelector('#bb-form-card')?.scrollIntoView({ behavior: 'smooth' });
  });
};

const wireBrandingBrainPanel = (container, nichePacks = []) => {
  // ── Niche pack selector ──────────────────────────────────────────────────
  const nicheSelect = container.querySelector('#bb-niche-select');
  const nichePreview = container.querySelector('#bb-niche-preview');
  const nicheApplyBtn = container.querySelector('#bb-niche-apply-btn');

  const renderNichePreview = (packId) => {
    if (!nichePreview) return;
    const pack = nichePacks.find((p) => p.id === packId);
    if (!pack) {
      nichePreview.style.display = 'none';
      nichePreview.innerHTML = '';
      return;
    }
    nichePreview.style.display = 'block';
    nichePreview.innerHTML = `
      <div class="bb-niche-banner">
        <div class="bb-niche-emoji">${pack.emoji}</div>
        <div class="bb-niche-info">
          <div class="bb-niche-name">${escTxt(pack.label)}</div>
          <div class="bb-niche-desc">${escTxt(pack.description)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-top:8px;">
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Voz</div>
          <div class="bb-niche-pillars">${(pack.tone ?? [])
            .slice(0, 4)
            .map((t) => `<span class="bb-pillar-tag">${escTxt(t)}</span>`)
            .join('')}</div>
        </div>
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Pilares de contenido</div>
          <div class="bb-niche-pillars">${(pack.pillars ?? [])
            .slice(0, 4)
            .map((p) => `<span class="bb-pillar-tag">${escTxt(p)}</span>`)
            .join('')}</div>
        </div>
        <div class="bb-result-tile" style="padding:10px;">
          <div class="bb-result-label">Objetivo principal</div>
          <div class="small" style="margin-top:4px;">${escTxt(pack.goal ?? '')}</div>
        </div>
      </div>
    `;
  };

  nicheSelect?.addEventListener('change', () => renderNichePreview(nicheSelect.value));

  nicheApplyBtn?.addEventListener('click', async () => {
    const packId = nicheSelect?.value;
    if (!packId) {
      toast('Seleccioná un tipo de cuenta primero', 'warn');
      return;
    }
    nicheApplyBtn.disabled = true;
    nicheApplyBtn.textContent = 'Aplicando…';
    const { error } = await apiSafe(`/api/niche-packs/${packId}/apply`, null, { method: 'POST', body: {} });
    nicheApplyBtn.disabled = false;
    nicheApplyBtn.textContent = 'Aplicar pack';
    if (error) {
      toast('⚠️ Error al aplicar el pack: ' + error, 'error');
    } else {
      toast('✅ Pack de nicho aplicado. Los valores de tu marca se actualizaron como punto de partida.', 'success');
      // Re-render to show "Pack activo" badge
      void renderBrandingBrainPanel(container.closest('.pz-panel') ?? container.parentElement ?? container);
    }
  });

  // ── Wire preset buttons ──────────────────────────────────────────────────
  container.querySelectorAll('.bb-preset').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goal = btn.dataset.goal ?? '';
      const tier = btn.dataset.tier ?? 'growing';
      const mode = btn.dataset.mode ?? '';
      const goalEl = container.querySelector('#bb-goal');
      const tierEl = container.querySelector('#bb-tier');
      const modeEl = container.querySelector('#bb-mode');
      if (goalEl) goalEl.value = goal;
      if (tierEl) tierEl.value = tier;
      if (mode && modeEl) modeEl.value = mode;
      container.querySelector('#bb-form-card')?.scrollIntoView({ behavior: 'smooth' });
    });
  });

  const runBtn = container.querySelector('#bb-run-btn');
  if (!runBtn) return;

  runBtn.addEventListener('click', async () => {
    const goal = container.querySelector('#bb-goal')?.value?.trim();
    if (!goal) {
      toast('⚠️ El objetivo es obligatorio', 'warn');
      return;
    }

    const userIdeas = container.querySelector('#bb-ideas')?.value?.trim() || undefined;
    const constraints = container.querySelector('#bb-constraints')?.value?.trim() || undefined;
    const targetTier = container.querySelector('#bb-tier')?.value || 'growing';
    const mode = container.querySelector('#bb-mode')?.value || 'refinement';

    // UX: deshabilitar botón + activar agente pulsante
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Ejecutando…';
    const agentsGrid = container.querySelector('#bb-agents-grid');

    let agentIdx = 0;
    const highlightAgent = () => {
      if (!agentsGrid) return;
      agentsGrid.querySelectorAll('.bb-agent').forEach((el, i) => {
        el.classList.toggle('active-agent', i === agentIdx);
      });
      agentIdx = (agentIdx + 1) % BB_AGENTS_STATIC.length;
    };
    const pulse = setInterval(highlightAgent, 4000);
    highlightAgent();

    try {
      const { data, error } = await apiSafe('/api/branding/brain', null, {
        method: 'POST',
        body: { goal, userIdeas, constraints, targetTier, mode },
      });

      clearInterval(pulse);
      agentsGrid?.querySelectorAll('.bb-agent').forEach((el) => el.classList.remove('active-agent'));
      runBtn.disabled = false;
      runBtn.textContent = '🧠 Activar Branding Brain';

      if (error || !data) {
        toast('❌ Error al ejecutar Branding Brain: ' + (error ?? 'respuesta vacía'), 'error');
        return;
      }

      toast('✅ Branding Brain completado · coherencia: ' + (data.coherenceReport?.score ?? '?') + '/100', 'success');
      renderBrandingResults(container, data);
    } catch (err) {
      clearInterval(pulse);
      agentsGrid?.querySelectorAll('.bb-agent').forEach((el) => el.classList.remove('active-agent'));
      runBtn.disabled = false;
      runBtn.textContent = '🧠 Activar Branding Brain';
      toast('❌ ' + err.message, 'error');
    }
  });
};

const renderBrandingBrainPanel = async (container) => {
  const inner = container.querySelector('#bb-panel-inner');
  if (!inner) return;

  const [{ data: brand }, { data: nicheData }] = await Promise.all([
    apiSafe('/api/brand', null),
    apiSafe('/api/niche-packs', null),
  ]);
  inner.innerHTML = buildBrandingBrainHTML(brand ?? {}, nicheData?.packs ?? []);
  wireBrandingBrainPanel(inner, nicheData?.packs ?? []);
};

export const renderPersonalization = async (container) => {
  // PASO 1: render inmediato con catálogos seed + config local o defaults
  const localConfig = loadLocalConfig();
  const initialConfig = { ...DEFAULT_CONFIG, ...(localConfig ?? {}) };
  container.innerHTML = buildHTML(initialConfig, DEFAULT_CATALOGS, false);
  wireEvents(container);
  void appendBrandBoard(container);

  // Auto-abrir tab si viene desde ⌘K (globalSearch hint)
  try {
    const openTab = sessionStorage.getItem('feedia.open-tab');
    if (openTab) {
      sessionStorage.removeItem('feedia.open-tab');
      const targetTab = container.querySelector(`.pz-tab[data-tab="${openTab}"]`);
      if (targetTab) targetTab.click();
    }
  } catch {
    /* noop */
  }

  // PASO 2: intentar pedir config + catálogos al backend (silencioso)
  const [cfgRes, catRes] = await Promise.all([
    apiSafe('/api/personalization', null),
    apiSafe('/api/personalization/catalogs', null),
  ]);

  // Si hay datos del server, re-renderizar enriquecido
  if (cfgRes.data || catRes.data) {
    const finalConfig = { ...DEFAULT_CONFIG, ...(localConfig ?? {}), ...(cfgRes.data ?? {}) };
    const finalCatalogs = { ...DEFAULT_CATALOGS, ...(catRes.data ?? {}) };
    container.innerHTML = buildHTML(finalConfig, finalCatalogs, false);
    wireEvents(container);
    void appendBrandBoard(container);
  } else if (cfgRes.error) {
    // Mostrar badge offline en el header (re-render con flag)
    const header = container.querySelector('h1');
    if (header && !header.innerHTML.includes('offline')) {
      header.innerHTML +=
        ' <span class="small muted" style="font-weight:400;font-size:12px;background:rgba(0,0,0,0.2);padding:3px 8px;border-radius:12px;margin-left:8px;">📡 offline</span>';
    }
  }
};
