import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { SUPPORTED_LANGS, getLang, setLang, t } from '../lib/i18n.js';
import { getConfig, setConfig, getVoices, speak, isSupported } from '../lib/voice.js';

/* ─── State ──────────────────────────────────────────────────────────────────── */
let state = {
  section: 'accounts',
  connections: {},
  automations: [],
  brand: null,
  apiKeys: {},
};

/* ─── Section config ──────────────────────────────────────────────────────────── */
const SECTIONS = [
  {
    id: 'accounts',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
    label: 'Cuentas',
  },
  {
    id: 'apikeys',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    label: 'API Keys',
  },
  {
    id: 'consumo',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 3v18h18"/><path d="M7 17l4-6 4 3 6-9"/></svg>`,
    label: 'Consumo',
  },
  {
    id: 'automations',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
    label: 'Automatizaciones',
  },
  {
    id: 'brand',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    label: 'Perfil de Marca',
  },
  {
    id: 'notifications',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
    label: 'Notificaciones',
  },
  {
    id: 'voice',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"/></svg>`,
    label: 'Voz e idioma',
  },
];

/* ─── Section: Voice & language ──────────────────────────────────────────────── */
const renderVoice = () => {
  const cfg = getConfig();
  const lang = getLang();
  const sttOk = isSupported();
  const voices = getVoices();
  const speechLang = (SUPPORTED_LANGS.find((l) => l.code === lang) ?? SUPPORTED_LANGS[0]).speech;
  const langVoices = voices.filter((v) => v.lang && v.lang.toLowerCase().startsWith(lang));
  const voiceOpts = (langVoices.length ? langVoices : voices)
    .map(
      (v) =>
        `<option value="${escape(v.voiceURI)}" ${v.voiceURI === cfg.voiceURI ? 'selected' : ''}>${escape(v.name)} (${escape(v.lang)})</option>`,
    )
    .join('');

  return `
    <div class="settings-section" id="section-voice">
      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:6px;">🌐 ${escape(t('settings.language'))}</h3>
        <p class="small muted" style="margin-bottom:14px;">El idioma afecta la interfaz, el reconocimiento de voz y cómo responde FeedIA.</p>
        <div class="lang-pills" id="lang-pills">
          ${SUPPORTED_LANGS.map(
            (l) => `
            <button class="lang-pill ${l.code === lang ? 'active' : ''}" data-lang="${l.code}">
              <span>${l.flag}</span> ${escape(l.label)}
            </button>`,
          ).join('')}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:6px;">🎙 ${escape(t('settings.voice'))}</h3>
        ${!sttOk ? `<div class="alert crit" style="margin-bottom:14px;">${escape(t('voice.notSupported'))}</div>` : ''}
        <p class="small muted" style="margin-bottom:18px;">FeedIA usa la Web Speech API del navegador: sin tokens, sin costo, ilimitado. Decí <strong>"${escape(t('voice.wake'))}"</strong> y empezá a hablar.</p>

        <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);margin-bottom:18px;">
          <div class="automation-row">
            <div class="automation-info">
              <div class="automation-name">${escape(t('settings.voiceEnabled'))}</div>
              <div class="automation-desc">Escucha continua en segundo plano para activarse con la palabra clave.</div>
            </div>
            <div class="automation-control">${toggleHtml('voice-wake-toggle', cfg.wakeEnabled, !sttOk)}</div>
          </div>
          <div class="automation-row">
            <div class="automation-info">
              <div class="automation-name">${escape(t('settings.ttsEnabled'))}</div>
              <div class="automation-desc">FeedIA lee sus respuestas en voz alta con voz humana.</div>
            </div>
            <div class="automation-control">${toggleHtml('voice-tts-toggle', cfg.ttsEnabled)}</div>
          </div>
        </div>

        <div class="voice-settings-grid">
          <div class="field-group">
            <label class="field-label">${escape(t('settings.voicePick'))}</label>
            <select class="input" id="voice-pick">
              <option value="">Auto (mejor para el idioma)</option>
              ${voiceOpts}
            </select>
          </div>
          <div class="voice-range-row">
            <label>${escape(t('settings.rate'))}</label>
            <input type="range" id="voice-rate" min="0.6" max="1.6" step="0.02" value="${cfg.rate}">
            <span id="voice-rate-val" class="small muted">${cfg.rate.toFixed(2)}×</span>
          </div>
          <div class="voice-range-row">
            <label>${escape(t('settings.pitch'))}</label>
            <input type="range" id="voice-pitch" min="0.6" max="1.6" step="0.02" value="${cfg.pitch}">
            <span id="voice-pitch-val" class="small muted">${cfg.pitch.toFixed(2)}</span>
          </div>
          <div class="btn-row">
            <button class="btn primary small" id="voice-test-btn">▶ ${escape(t('settings.test'))}</button>
            <button class="btn ghost small" id="voice-open-btn">🎙 ${escape(t('voice.openMic'))}</button>
          </div>
        </div>
      </div>
    </div>`;
};

const wireVoiceSection = (root, content) => {
  content.querySelectorAll('[data-lang]').forEach((pill) => {
    pill.addEventListener('click', () => {
      setLang(pill.dataset.lang);
      state.section = 'voice';
      render(root);
    });
  });

  const wakeToggle = content.querySelector('#voice-wake-toggle');
  wakeToggle?.addEventListener('change', () => {
    if (wakeToggle.checked) {
      window.__feediaVoice?.enableWake();
      toast('Voz manos libres activada — decí "' + t('voice.wake') + '"', 'ok');
    } else {
      window.__feediaVoice?.disableWake();
      toast('Voz manos libres desactivada', 'info');
    }
  });

  const ttsToggle = content.querySelector('#voice-tts-toggle');
  ttsToggle?.addEventListener('change', () => setConfig({ ttsEnabled: ttsToggle.checked }));

  const pick = content.querySelector('#voice-pick');
  pick?.addEventListener('change', () => setConfig({ voiceURI: pick.value }));

  const rate = content.querySelector('#voice-rate');
  const rateVal = content.querySelector('#voice-rate-val');
  rate?.addEventListener('input', () => {
    setConfig({ rate: Number(rate.value) });
    if (rateVal) rateVal.textContent = Number(rate.value).toFixed(2) + '×';
  });

  const pitch = content.querySelector('#voice-pitch');
  const pitchVal = content.querySelector('#voice-pitch-val');
  pitch?.addEventListener('input', () => {
    setConfig({ pitch: Number(pitch.value) });
    if (pitchVal) pitchVal.textContent = Number(pitch.value).toFixed(2);
  });

  content.querySelector('#voice-test-btn')?.addEventListener('click', () => {
    speak(t('voice.greeting'));
  });
  content.querySelector('#voice-open-btn')?.addEventListener('click', () => {
    window.__feediaVoice?.open();
  });
};

/* ─── Toggle helper ───────────────────────────────────────────────────────────── */
const toggleHtml = (id, checked, disabled = false) => `
  <label class="toggle-switch">
    <input class="toggle-input" type="checkbox" id="${id}" ${checked ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
    <span class="toggle-track"></span>
  </label>`;

/* ─── Section: Accounts ─────────────────────────────────────────────────────── */
const renderAccounts = () => {
  const ig = state.connections.instagram ?? {};
  const tt = state.connections.tiktok ?? {};
  const canva = state.connections.canva ?? {};
  const meta = state.connections.meta ?? {};
  const hf = state.connections.higgsfield ?? {};

  return `
    <div class="settings-section" id="section-accounts">
      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo instagram">📷</div>
          <div class="connection-info">
            <div class="connection-name">Instagram</div>
            <div class="connection-desc">Publica, programa y analiza tu cuenta de Instagram</div>
          </div>
          <div class="connection-status">
            ${ig.connected ? `<div class="connected">Conectado</div>` : `<div class="disconnected">No conectado</div>`}
          </div>
        </div>
        ${
          ig.connected
            ? `
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${escape(ig.username ?? '@—')}</div>
                <div class="connection-stat-label">Usuario</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${(ig.followers ?? 0).toLocaleString()}</div>
                <div class="connection-stat-label">Seguidores</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${ig.mediaCount ?? 0}</div>
                <div class="connection-stat-label">Publicaciones</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="ig-reconnect-btn">🔄 Reconectar</button>
              <button class="btn ghost small crit" id="ig-disconnect-btn">✕ Desconectar</button>
            </div>
          </div>`
            : `
          <div class="connection-body">
            <p class="small muted">Conectá tu cuenta para publicar directamente, programar posts y ver métricas reales.</p>
            <button class="btn gradient" id="ig-connect-btn">
              <span style="font-size:16px;">📷</span> Conectar Instagram
            </button>
          </div>`
        }
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo tiktok" style="background:#010101;">🎵</div>
          <div class="connection-info">
            <div class="connection-name">TikTok</div>
            <div class="connection-desc">Publica videos, foto-carruseles y analiza tu cuenta TikTok</div>
          </div>
          <div class="connection-status">
            ${tt.connected ? `<div class="connected">Conectado</div>` : `<div class="disconnected">No conectado</div>`}
          </div>
        </div>
        ${
          tt.connected
            ? `
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${escape(tt.username ?? '@—')}</div>
                <div class="connection-stat-label">Usuario</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${(tt.followers ?? 0).toLocaleString()}</div>
                <div class="connection-stat-label">Seguidores</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${tt.videoCount ?? 0}</div>
                <div class="connection-stat-label">Videos</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="tt-reconnect-btn">🔄 Reconectar</button>
              <button class="btn ghost small crit" id="tt-disconnect-btn">✕ Desconectar</button>
            </div>
          </div>`
            : `
          <div class="connection-body">
            <p class="small muted">Conectá tu cuenta para publicar videos 9:16, photo sets y ver métricas reales.</p>
            <button class="btn" style="background:linear-gradient(135deg,#010101,#FE2C55);color:#fff;" id="tt-connect-btn">
              <span style="font-size:16px;">🎵</span> Conectar TikTok
            </button>
          </div>`
        }
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo canva">🎨</div>
          <div class="connection-info">
            <div class="connection-name">Canva</div>
            <div class="connection-desc">Generá y exportá diseños desde el Studio directamente</div>
          </div>
          <div class="connection-status">
            ${
              canva.connected
                ? `<div class="connected">Conectado</div>`
                : `<div class="disconnected">No conectado</div>`
            }
          </div>
        </div>
        ${
          canva.connected
            ? `
          <div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${escape(canva.teamName ?? '—')}</div>
                <div class="connection-stat-label">Equipo</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${canva.designsCreated ?? 0}</div>
                <div class="connection-stat-label">Diseños creados</div>
              </div>
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="canva-reconnect-btn">🔄 Reconectar</button>
              <button class="btn ghost small crit" id="canva-disconnect-btn">✕ Desconectar</button>
            </div>
          </div>`
            : `
          <div class="connection-body">
            <p class="small muted">Conectá Canva para renderizar carruseles, reels y stories con tus plantillas de marca.</p>
            <button class="btn" style="background:linear-gradient(135deg,#8957e5,#00c4cc);color:#fff;" id="canva-connect-btn">
              <span style="font-size:16px;">🎨</span> Conectar Canva
            </button>
          </div>`
        }
      </div>

      <div class="connection-card" id="higgsfield-card">
        <div class="connection-header">
          <div class="connection-logo" style="background:linear-gradient(135deg,#0d0d0d,#1a1a2e);font-size:18px;display:flex;align-items:center;justify-content:center;">🎬</div>
          <div class="connection-info">
            <div class="connection-name">Higgsfield</div>
            <div class="connection-desc">Generación de video con SeeDance, Wan 2.1, Kling y más — un solo billing</div>
          </div>
          <div class="connection-status">
            ${hf.connected ? `<div class="connected">Conectado</div>` : `<div class="disconnected">No conectado</div>`}
          </div>
        </div>
        ${
          hf.connected
            ? `<div class="connection-body">
            <div class="connection-stats">
              <div class="connection-stat">
                <div class="connection-stat-num">${escape(hf.plan ?? 'Standard')}</div>
                <div class="connection-stat-label">Plan</div>
              </div>
              <div class="connection-stat">
                <div class="connection-stat-num">${(hf.availableModels ?? []).length || '6+'}</div>
                <div class="connection-stat-label">Modelos</div>
              </div>
            </div>
            <div class="connection-models" style="margin:8px 0;font-size:11px;color:var(--text-muted);">
              Modelos: ${(hf.availableModels ?? ['seedance-v1-lite','wan-2.1-t2v','kling-v1']).slice(0,4).join(' · ')}
            </div>
            <div style="margin:10px 0 4px;font-size:12px;font-weight:600;color:var(--text-secondary);">Modo de generación</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;" id="hf-mode-selector">
              ${['auto','higgsfield-first','speed','quality'].map(m => {
                const labels = { auto: '🤖 Auto', 'higgsfield-first': '🎬 Higgsfield Primero', speed: '⚡ Velocidad', quality: '✨ Calidad' };
                const descs = { auto: 'FeedIA elige', 'higgsfield-first': 'Siempre Higgsfield', speed: 'Más rápido', quality: 'Mejor calidad' };
                const active = (hf.providerMode ?? 'auto') === m;
                return `<button data-mode="${m}" class="btn ghost small${active ? ' active' : ''}" title="${descs[m]}" style="${active ? 'border-color:var(--accent);color:var(--accent);' : ''}">${labels[m]}</button>`;
              }).join('')}
            </div>
            <div class="btn-row">
              <button class="btn ghost small" id="hf-reconnect-btn">🔄 Reconectar</button>
              <button class="btn ghost small crit" id="hf-disconnect-btn">✕ Desconectar</button>
            </div>
          </div>`
            : `<div class="connection-body">
            <p class="small muted">Conectá tu API key de Higgsfield para generar videos con SeeDance, Wan 2.1, Kling y otros modelos. Un solo pago, múltiples proveedores.</p>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
              <button class="btn" style="background:linear-gradient(135deg,#0d0d0d,#6c47ff);color:#fff;" id="hf-connect-btn">
                🎬 Conectar Higgsfield
              </button>
              <a href="https://app.higgsfield.ai/settings/api" target="_blank" class="btn ghost small" style="font-size:11px;">
                Obtener API key ↗
              </a>
            </div>
          </div>`
        }
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo meta">💼</div>
          <div class="connection-info">
            <div class="connection-name">Meta Business Suite</div>
            <div class="connection-desc">Acceso a métricas avanzadas, Ads y gestión de páginas</div>
          </div>
          <div class="connection-status">
            ${
              meta.connected ? `<div class="connected">Conectado</div>` : `<div class="disconnected">No conectado</div>`
            }
          </div>
        </div>
        <div class="connection-body">
          ${
            meta.connected
              ? `
            <div class="btn-row">
              <button class="btn ghost small crit" id="meta-disconnect-btn">✕ Desconectar</button>
            </div>`
              : `
            <p class="small muted">Requerido para programación avanzada, anuncios y análisis de audiencia profundo.</p>
            <button class="btn ghost" id="meta-connect-btn">
              <span style="font-size:16px;">💼</span> Conectar Meta
            </button>`
          }
        </div>
      </div>
    </div>`;
};

/* ─── Section: API Keys ──────────────────────────────────────────────────────── */
const renderApiKeys = () => `
  <div class="settings-section" id="section-apikeys">
    <div class="card">
      <h3 style="margin-bottom:6px;">🤖 Modelos de IA</h3>
      <p class="small muted" style="margin-bottom:20px;">Las claves se guardan localmente en el servidor. Nunca se transmiten al cliente.</p>

      <div class="connection-card" style="margin-bottom:14px;">
        <div class="connection-header">
          <div class="connection-logo openai">✨</div>
          <div class="connection-info">
            <div class="connection-name">OpenAI</div>
            <div class="connection-desc">GPT-4o para generación de imágenes y embeddings</div>
          </div>
          <div class="connection-status">
            ${
              state.apiKeys.openai
                ? `<div class="connected">Configurado</div>`
                : `<div class="disconnected">Sin configurar</div>`
            }
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Key</label>
            <div class="api-key-field">
              <input class="input" type="password" id="openai-key" placeholder="sk-…" value="${escape(state.apiKeys.openai ?? '')}">
              <button class="api-key-toggle" data-target="openai-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="openai">Guardar</button>
        </div>
      </div>

      <div class="connection-card" style="margin-bottom:14px;">
        <div class="connection-header">
          <div class="connection-logo replicate">🔮</div>
          <div class="connection-info">
            <div class="connection-name">Replicate</div>
            <div class="connection-desc">Flux, SDXL y otros modelos de imagen</div>
          </div>
          <div class="connection-status">
            ${
              state.apiKeys.replicate
                ? `<div class="connected">Configurado</div>`
                : `<div class="disconnected">Sin configurar</div>`
            }
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Token</label>
            <div class="api-key-field">
              <input class="input" type="password" id="replicate-key" placeholder="r8_…" value="${escape(state.apiKeys.replicate ?? '')}">
              <button class="api-key-toggle" data-target="replicate-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="replicate">Guardar</button>
        </div>
      </div>

      <div class="connection-card">
        <div class="connection-header">
          <div class="connection-logo" style="background:linear-gradient(135deg,#f09433,#bc1888);">🧠</div>
          <div class="connection-info">
            <div class="connection-name">Anthropic (Claude)</div>
            <div class="connection-desc">Motor principal del agente IA</div>
          </div>
          <div class="connection-status">
            ${
              state.apiKeys.anthropic
                ? `<div class="connected">Configurado</div>`
                : `<div class="disconnected">Sin configurar</div>`
            }
          </div>
        </div>
        <div class="connection-body">
          <div class="field-group">
            <label class="field-label">API Key</label>
            <div class="api-key-field">
              <input class="input" type="password" id="anthropic-key" placeholder="sk-ant-…" value="${escape(state.apiKeys.anthropic ?? '')}">
              <button class="api-key-toggle" data-target="anthropic-key" title="Mostrar/ocultar">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
            </div>
          </div>
          <button class="btn primary small" data-save-key="anthropic">Guardar</button>
        </div>
      </div>
    </div>
  </div>`;

/* ─── Section: Automations ───────────────────────────────────────────────────── */
const AUTOMATION_META = {
  'bot-cycle': {
    icon: '🤖',
    name: 'Bot de respuestas',
    desc: 'Responde automáticamente a DMs y comentarios según el contexto',
  },
  'digest-diario': {
    icon: '📰',
    name: 'Digest diario',
    desc: 'Resumen de métricas, tendencias y sugerencias cada mañana',
  },
  'curator-fetch': {
    icon: '🔍',
    name: 'Curación de contenido',
    desc: 'Busca y clasifica contenido relevante de tus fuentes',
  },
  'reel-weekly': {
    icon: '🎬',
    name: 'Reel semanal automático',
    desc: 'Genera guión + storyboard de un reel cada semana',
  },
  'ugc-scan': { icon: '📸', name: 'Scanner de UGC', desc: 'Detecta menciones y contenido de usuarios para reposts' },
  'crisis-watch': {
    icon: '🛡️',
    name: 'Monitoreo de crisis',
    desc: 'Evalúa reputación en tiempo real y pausa si detecta riesgo',
  },
  'competitor-spy': {
    icon: '👀',
    name: 'Análisis de competencia',
    desc: 'Monitorea competidores y detecta oportunidades de contenido',
  },
  'hashtag-trends': {
    icon: '📈',
    name: 'Tendencias de hashtags',
    desc: 'Actualiza tu banco de hashtags según lo que rankea hoy',
  },
};

const renderAutomations = () => {
  const autoList = state.automations.length
    ? state.automations
    : Object.keys(AUTOMATION_META).map((id) => ({ id, enabled: false, lastRun: null, nextRun: null }));

  return `
    <div class="settings-section" id="section-automations">
      <div class="card" style="margin-bottom:14px;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h3>⚡ Automatizaciones activas</h3>
          <span class="tag ok">${autoList.filter((a) => a.enabled).length} activas</span>
        </div>
        <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);">
          ${autoList
            .map((auto) => {
              const meta = AUTOMATION_META[auto.id] ?? { icon: '⚙️', name: auto.id, desc: '' };
              return `
              <div class="automation-row">
                <div class="automation-icon">${meta.icon}</div>
                <div class="automation-info">
                  <div class="automation-name">${escape(meta.name)}</div>
                  <div class="automation-desc">${escape(meta.desc)}</div>
                  ${auto.lastRun ? `<div class="tiny muted" style="margin-top:3px;">Última ejecución: ${new Date(auto.lastRun).toLocaleString('es-AR')}</div>` : ''}
                </div>
                <div class="automation-control">
                  ${toggleHtml(`auto-${auto.id}`, auto.enabled)}
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </div>

      <div class="card">
        <h3 style="margin-bottom:16px;">🕐 Programación global</h3>
        <div class="field-row" style="display:flex;gap:14px;align-items:flex-end;flex-wrap:wrap;">
          <div class="field-group" style="flex:1;min-width:160px;">
            <label class="field-label">Zona horaria</label>
            <select class="input" id="timezone-select">
              <option value="America/Argentina/Buenos_Aires" selected>Buenos Aires (UTC-3)</option>
              <option value="America/New_York">New York (UTC-5)</option>
              <option value="America/Los_Angeles">Los Angeles (UTC-8)</option>
              <option value="Europe/Madrid">Madrid (UTC+1)</option>
              <option value="Europe/London">London (UTC+0)</option>
            </select>
          </div>
          <div class="field-group" style="flex:1;min-width:160px;">
            <label class="field-label">Hora del digest diario</label>
            <input class="input" type="time" id="digest-time" value="08:00">
          </div>
          <button class="btn primary" id="save-schedule-btn">Guardar horario</button>
        </div>
      </div>
    </div>`;
};

/* ─── Section: Brand Profile ────────────────────────────────────────────────── */
const renderBrand = () => {
  const b = state.brand ?? {};
  const voice = b.voice ?? {};
  const visual = b.visual ?? {};
  const tones = voice.tone ?? [];
  const palette = visual.palette ?? [];

  return `
    <div class="settings-section" id="section-brand">
      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">🏷️ Identidad de marca</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Nombre de marca</label>
          <input class="input" id="brand-name" value="${escape(b.name ?? '')}" placeholder="Ej: Somos Paithon Labs">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Nicho / Industria</label>
          <input class="input" id="brand-niche" value="${escape(b.niche ?? '')}" placeholder="Ej: Tecnología, Salud, Moda…">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Handle de Instagram</label>
          <input class="input" id="brand-handle" value="${escape(b.handle ?? '')}" placeholder="@tuusuario">
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Bio / Descripción</label>
          <textarea class="input" id="brand-bio" rows="3" placeholder="Describí tu marca en 2-3 oraciones…">${escape(b.bio ?? '')}</textarea>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">🎙️ Voz de marca</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Tono de comunicación</label>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;" id="tone-chips">
            ${[
              'profesional',
              'cercano',
              'inspirador',
              'divertido',
              'educativo',
              'provocador',
              'empático',
              'aspiracional',
            ]
              .map(
                (t) => `
              <button class="action-chip ${tones.includes(t) ? 'active' : ''}" data-tone="${t}">${t}</button>
            `,
              )
              .join('')}
          </div>
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Público objetivo</label>
          <input class="input" id="brand-audience" value="${escape(b.targetAudience ?? '')}" placeholder="Ej: Emprendedores 25-40 años en LATAM">
        </div>
        <div class="field-group">
          <label class="field-label">Propuesta de valor</label>
          <textarea class="input" id="brand-value-prop" rows="2" placeholder="¿Qué hace única a tu marca?">${escape(b.valueProp ?? '')}</textarea>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin-bottom:20px;">🎨 Identidad visual</h3>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Estilo visual</label>
          <select class="input" id="brand-style">
            ${['minimalista', 'colorido', 'oscuro', 'elegante', 'urbano', 'natural', 'tecnológico', 'retro']
              .map(
                (s) => `
              <option value="${s}" ${visual.style === s ? 'selected' : ''}>${s}</option>
            `,
              )
              .join('')}
          </select>
        </div>
        <div class="field-group" style="margin-bottom:14px;">
          <label class="field-label">Paleta de colores (hex, separados por coma)</label>
          <input class="input" id="brand-palette" value="${escape(palette.join(', '))}" placeholder="#e1306c, #405de6, #ffffff">
          <div style="display:flex;gap:8px;margin-top:10px;" id="palette-preview">
            ${palette.map((c) => `<div style="width:28px;height:28px;border-radius:50%;background:${escape(c)};border:2px solid var(--border);"></div>`).join('')}
          </div>
        </div>
        <div class="field-group">
          <label class="field-label">Tipografías</label>
          <input class="input" id="brand-typography" value="${escape((visual.typography ?? []).join(', '))}" placeholder="Inter, Playfair Display…">
        </div>
      </div>

      <div class="btn-row">
        <button class="btn gradient" id="save-brand-btn">💾 Guardar perfil de marca</button>
        <button class="btn ghost" id="preview-brand-btn">👁️ Vista previa</button>
      </div>
    </div>`;
};

/* ─── Section: Notifications ────────────────────────────────────────────────── */
const NOTIF_OPTIONS = [
  {
    id: 'n-crisis',
    icon: '🚨',
    name: 'Alertas de crisis',
    desc: 'Cuando se detecte una situación de reputación crítica',
    default: true,
  },
  {
    id: 'n-digest',
    icon: '📰',
    name: 'Digest diario',
    desc: 'Resumen matutino de métricas y agenda del día',
    default: true,
  },
  {
    id: 'n-publish',
    icon: '✅',
    name: 'Publicaciones exitosas',
    desc: 'Cuando un post se publique correctamente en Instagram',
    default: false,
  },
  {
    id: 'n-ugc',
    icon: '📸',
    name: 'Nuevo UGC detectado',
    desc: 'Cuando se encuentre contenido nuevo de usuarios',
    default: true,
  },
  {
    id: 'n-experiments',
    icon: '🧪',
    name: 'Resultados de experimentos',
    desc: 'Cuando finalice un A/B test con resultados',
    default: false,
  },
  {
    id: 'n-collab',
    icon: '🤝',
    name: 'Nuevos prospectos de collab',
    desc: 'Cuando el agente identifique nuevas oportunidades',
    default: true,
  },
  {
    id: 'n-trending',
    icon: '🔥',
    name: 'Tendencias detectadas',
    desc: 'Cuando haya un tema trending relevante para tu nicho',
    default: true,
  },
];

const renderNotifications = () => `
  <div class="settings-section" id="section-notifications">
    <div class="card" style="margin-bottom:14px;">
      <h3 style="margin-bottom:6px;">🔔 Preferencias de notificación</h3>
      <p class="small muted" style="margin-bottom:20px;">Controlá qué eventos generan alertas en el dashboard.</p>
      <div class="list-inner" style="border:1px solid var(--border-soft);border-radius:var(--radius-lg);">
        ${NOTIF_OPTIONS.map(
          (n) => `
          <div class="automation-row">
            <div class="automation-icon">${n.icon}</div>
            <div class="automation-info">
              <div class="automation-name">${escape(n.name)}</div>
              <div class="automation-desc">${escape(n.desc)}</div>
            </div>
            <div class="automation-control">
              ${toggleHtml(n.id, n.default)}
            </div>
          </div>`,
        ).join('')}
      </div>
    </div>

    <div class="card">
      <h3 style="margin-bottom:16px;">📬 Canal de notificaciones</h3>
      <div class="field-group" style="margin-bottom:14px;">
        <label class="field-label">Email de alertas</label>
        <input class="input" id="notif-email" type="email" placeholder="tu@email.com" value="">
      </div>
      <div class="field-group" style="margin-bottom:14px;">
        <label class="field-label">Webhook (Slack / Discord / n8n)</label>
        <input class="input" id="notif-webhook" type="url" placeholder="https://hooks.slack.com/…">
      </div>
      <button class="btn primary small" id="save-notif-btn">Guardar configuración</button>
    </div>
  </div>`;

/* ─── Section: Consumo (4 subtabs) ────────────────────────────────────────── */
let consumoTab = 'cost';

const renderConsumo = () => `
  <div class="settings-section" id="section-consumo">
    <div class="card" style="margin-bottom:14px;">
      <h3 style="margin-bottom:6px;">📊 Consumo</h3>
      <p class="small muted" style="margin-bottom:14px;">Tu uso del sistema, calidad de las respuestas, plan recomendado y guía de onboarding.</p>
      <div class="hook-category-filter" id="consumo-tabs">
        <button class="tab-btn ${consumoTab === 'cost' ? 'active' : ''}" data-ctab="cost">💸 Cost Attribution</button>
        <button class="tab-btn ${consumoTab === 'quality' ? 'active' : ''}" data-ctab="quality">✓ Quality Gate</button>
        <button class="tab-btn ${consumoTab === 'plan' ? 'active' : ''}" data-ctab="plan">📦 Plan Recommendation</button>
        <button class="tab-btn ${consumoTab === 'onboarding' ? 'active' : ''}" data-ctab="onboarding">🎓 Smart Onboarding</button>
      </div>
    </div>
    <div id="consumo-body"><div class="loading">Cargando...</div></div>
  </div>`;

const renderCostTab = async (host) => {
  const d = await api('/api/consumption/cost/dashboard');
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Hoy</div><div class="stat-value">$${d.today.spentUsd}</div><div class="small muted">de $${d.today.capUsd} (${d.today.usedPct}%)</div></div>
      <div class="card stat-card"><div class="stat-label">Llamadas hoy</div><div class="stat-value">${d.today.calls}</div></div>
      <div class="card stat-card"><div class="stat-label">7 días</div><div class="stat-value">$${d.last7Days.totalCostUsd}</div><div class="small muted">${d.last7Days.totalCalls} calls</div></div>
      <div class="card stat-card"><div class="stat-label">30 días</div><div class="stat-value">$${d.last30Days.totalCostUsd}</div><div class="small muted">${d.last30Days.totalCalls} calls</div></div>
      <div class="card stat-card"><div class="stat-label">Breaker</div><div class="stat-value" style="color:${d.today.breaker === 'open' ? '#EF4444' : '#10B981'}">${d.today.breaker === 'open' ? '⛔' : '✓'}</div></div>
    </div>
    ${
      d.optimizationHints?.length
        ? `
      <div class="card accent-border" style="margin-bottom:14px;">
        <h4 style="margin:0 0 8px;">💡 Hints de optimización</h4>
        <ul style="margin:0;padding-left:18px;">${d.optimizationHints.map((h) => `<li class="small">${escape(h)}</li>`).join('')}</ul>
      </div>`
        : ''
    }
    <div class="page-grid">
      <div class="card">
        <h4>Por Workflow</h4>
        ${
          (d.byWorkflow ?? [])
            .slice(0, 8)
            .map(
              (e) =>
                `<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${escape(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`,
            )
            .join('') || '<div class="small muted">Sin datos</div>'
        }
      </div>
      <div class="card">
        <h4>Por Agente</h4>
        ${
          (d.byAgent ?? [])
            .slice(0, 8)
            .map(
              (e) =>
                `<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>@${escape(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`,
            )
            .join('') || '<div class="small muted">Sin datos</div>'
        }
      </div>
      <div class="card">
        <h4>Por Tipo de Tarea</h4>
        ${
          (d.byTaskType ?? [])
            .slice(0, 8)
            .map(
              (e) =>
                `<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${escape(e.key)}</span><strong>$${e.totalCostUsd} <span class="muted">(${e.pctOfTotal}%)</span></strong></div>`,
            )
            .join('') || '<div class="small muted">Sin datos</div>'
        }
      </div>
      <div class="card">
        <h4>Por Modelo (hoy)</h4>
        ${(d.byModel ?? []).map((m) => `<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border);"><span>${escape(m.model)}</span><strong>$${m.costUsdToday} <span class="muted">(${m.callsToday} calls)</span></strong></div>`).join('') || '<div class="small muted">Sin datos hoy</div>'}
      </div>
    </div>
    ${
      d.topCostlyEvents?.length
        ? `
      <div class="card" style="margin-top:14px;">
        <h4>Top 10 eventos más caros</h4>
        ${d.topCostlyEvents.map((e) => `<div class="small" style="padding:4px 0;border-bottom:1px solid var(--border);">${escape(new Date(e.at).toLocaleString('es-AR'))} · ${escape(e.model)} · <strong>$${e.costUsd}</strong> ${e.workflow ? `· wf:${escape(e.workflow)}` : ''} ${e.agent ? `· ag:${escape(e.agent)}` : ''}</div>`).join('')}
      </div>`
        : ''
    }`;
};

const renderQualityTab = async (host) => {
  const d = await api('/api/consumption/quality/dashboard');
  host.innerHTML = `
    <div class="stats-grid" style="margin-bottom:14px;">
      <div class="card stat-card"><div class="stat-label">Total 24h</div><div class="stat-value">${d.rollingMetrics.last24h.total}</div></div>
      <div class="card stat-card"><div class="stat-label">Pass rate 24h</div><div class="stat-value">${d.rollingMetrics.last24h.total > 0 ? Math.round((d.rollingMetrics.last24h.passed / d.rollingMetrics.last24h.total) * 100) : 0}%</div></div>
      <div class="card stat-card"><div class="stat-label">Score promedio 7d</div><div class="stat-value">${d.rollingMetrics.last7d.avgScore.toFixed(0)}</div></div>
      <div class="card stat-card"><div class="stat-label">Bloqueadas 7d</div><div class="stat-value">${d.rollingMetrics.last7d.blocked}</div></div>
    </div>
    ${d.degradationAlert ? `<div class="card crit" style="margin-bottom:14px;"><strong>⚠️ Degradación detectada:</strong> ${escape(d.degradationAlert)}</div>` : ''}
    <div class="card" style="margin-bottom:14px;">
      <h4>Por superficie</h4>
      ${d.bySurface
        .map(
          (s) => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border);">
          <div style="display:flex;justify-content:space-between;">
            <strong>${escape(s.surface)}</strong>
            <span class="small">Threshold: ${d.thresholds[s.surface]}</span>
          </div>
          <div class="small muted">${s.total} checks · Pass ${s.passRate}% · Avg ${s.avgScore.toFixed(0)} · Block ${s.blockRate}%</div>
        </div>`,
        )
        .join('')}
    </div>
    ${
      d.topIssues?.length
        ? `
      <div class="card" style="margin-bottom:14px;">
        <h4>Top issues</h4>
        ${d.topIssues
          .slice(0, 6)
          .map(
            (i) =>
              `<div class="small" style="display:flex;justify-content:space-between;padding:4px 0;"><span>${escape(i.dimension)}</span><strong>${i.count}× · severidad ${i.avgSeverityScore.toFixed(1)}/3</strong></div>`,
          )
          .join('')}
      </div>`
        : ''
    }
    ${
      d.worstChecks?.length
        ? `
      <div class="card">
        <h4>Peores checks recientes</h4>
        ${d.worstChecks
          .slice(0, 5)
          .map(
            (c) => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border);">
            <div class="small"><strong>${escape(c.surface)}</strong> · score <span class="crit">${c.score.overall}</span></div>
            <div class="small muted" style="margin-top:4px;font-style:italic;">"${escape(c.responseText.slice(0, 120))}..."</div>
            <div class="small">${escape(c.score.reasoning)}</div>
          </div>`,
          )
          .join('')}
      </div>`
        : ''
    }`;
};

const renderPlanTab = async (host) => {
  const r = await api('/api/consumption/plan/recommend');
  host.innerHTML = `
    <div class="card accent-border" style="margin-bottom:14px;">
      <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;">Plan recomendado para vos</div>
      <h3 style="margin:6px 0;">${escape(r.recommendedPlan.name)} · $${r.recommendedPlan.monthlyUsd}/mes</h3>
      <div class="small muted">${escape(r.recommendedPlan.bestFor)}</div>
      <div style="margin-top:10px;"><strong>Estimado real:</strong> $${r.estimatedMonthlyCostUsd}/mes · Headroom ${r.headroomPct}%</div>
      <ul style="margin-top:10px;padding-left:18px;">${r.reasoning.map((x) => `<li class="small">${escape(x)}</li>`).join('')}</ul>
      ${r.warnings?.length ? `<div class="small warn" style="margin-top:8px;"><strong>⚠️</strong> ${r.warnings.map(escape).join(' · ')}</div>` : ''}
    </div>
    <h4 style="margin:18px 0 10px;">Comparativa</h4>
    <div class="page-grid">
      ${r.comparison
        .map(
          (c) => `
        <div class="card" style="border:2px solid ${c.plan.id === r.recommendedPlan.id ? 'var(--accent)' : 'var(--border)'};">
          <div class="meta"><span class="tag tiny ${c.fits ? 'ok' : 'crit'}">${c.fits ? '✓ Te sirve' : '✗ Te queda chico'}</span><span class="tag tiny">Match ${c.matchScore}/100</span></div>
          <h3 style="margin:8px 0 4px;">${escape(c.plan.name)}</h3>
          <div class="small muted">$${c.plan.monthlyUsd}/mes base · $${c.monthlyEstimateUsd}/mes estimado</div>
          <div class="small" style="margin-top:6px;">${c.plan.includedCallsPerMonth.toLocaleString('es-AR')} llamadas/mes</div>
          <div class="small muted" style="margin-top:6px;">${escape(c.plan.bestFor)}</div>
          ${c.notes.length ? `<div class="small warn" style="margin-top:6px;">${c.notes.map(escape).join(' · ')}</div>` : ''}
          <div class="meta" style="margin-top:8px;">${c.plan.features
            .slice(0, 4)
            .map((f) => `<span class="tag tiny">${escape(f)}</span>`)
            .join('')}</div>
        </div>`,
        )
        .join('')}
    </div>`;
};

const renderOnboardingTab = async (host) => {
  const next = await api('/api/consumption/onboarding/next');
  host.innerHTML = `
    <div class="card accent-border" style="margin-bottom:14px;">
      <div class="small muted" style="text-transform:uppercase;letter-spacing:1px;">Etapa actual</div>
      <h3 style="margin:6px 0;">${escape(next.progress.currentStage)} · ${next.completionPct}% completado</h3>
      <p style="margin:6px 0;">${escape(next.stageMessage)}</p>
      <p class="small accent" style="margin:6px 0;"><em>${escape(next.encouragement)}</em></p>
    </div>
    <h4 style="margin:18px 0 10px;">Próximos pasos sugeridos</h4>
    <div class="page-grid">
      ${next.nextSteps
        .map(
          (s) => `
        <div class="card">
          <div class="meta">
            <span class="tag tiny ${s.impactLevel === 'game-changer' ? 'accent' : s.impactLevel === 'high' ? 'ok' : ''}">${escape(s.impactLevel)}</span>
            <span class="tag tiny">${escape(s.category)}</span>
            <span class="tag tiny">${s.estimatedMinutes} min</span>
          </div>
          <h4 style="margin:8px 0 4px;">${escape(s.title)}</h4>
          <p class="small">${escape(s.description)}</p>
          <div class="small accent" style="margin-top:8px;"><strong>👉</strong> ${escape(s.cta)}</div>
          <div style="margin-top:10px;display:flex;gap:6px;">
            <button class="btn small" data-step-done="${escape(s.id)}">✓ Ya lo hice</button>
            <button class="btn small" data-step-skip="${escape(s.id)}">Saltar</button>
          </div>
        </div>`,
        )
        .join('')}
    </div>
    ${next.nextSteps.length === 0 ? '<div class="empty-state">🎉 Completaste todos los pasos sugeridos. Sos un graduado del sistema.</div>' : ''}
    <div class="card" style="margin-top:14px;">
      <h4>Progreso total</h4>
      <div class="progress-bar" style="height:10px;background:var(--bg-card-2);border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${next.completionPct}%;background:linear-gradient(90deg, var(--accent), var(--secondary));transition:width 0.5s;"></div>
      </div>
      <div class="small muted" style="margin-top:6px;">${next.progress.completedStepIds.length} de los pasos catalogados · Etapa: ${escape(next.progress.currentStage)}</div>
    </div>`;
};

const wireConsumoSection = async (root) => {
  const body = root.querySelector('#consumo-body');
  if (!body) return;
  const tabs = { cost: renderCostTab, quality: renderQualityTab, plan: renderPlanTab, onboarding: renderOnboardingTab };
  await tabs[consumoTab](body);
  root.querySelectorAll('[data-ctab]').forEach((b) => {
    b.addEventListener('click', async () => {
      consumoTab = b.dataset.ctab;
      root.querySelectorAll('[data-ctab]').forEach((x) => x.classList.toggle('active', x.dataset.ctab === consumoTab));
      body.innerHTML = '<div class="loading">Cargando...</div>';
      await tabs[consumoTab](body);
    });
  });
  body.addEventListener('click', async (e) => {
    const done = e.target.closest('[data-step-done]');
    if (done) {
      await api(`/api/consumption/onboarding/step/${done.dataset.stepDone}/done`, { method: 'POST', body: {} });
      toast('Paso marcado como hecho', 'success');
      await renderOnboardingTab(body);
      return;
    }
    const skip = e.target.closest('[data-step-skip]');
    if (skip) {
      await api(`/api/consumption/onboarding/step/${skip.dataset.stepSkip}/skip`, { method: 'POST', body: {} });
      await renderOnboardingTab(body);
    }
  });
};

/* ─── Section switcher ───────────────────────────────────────────────────────── */
const renderSection = () => {
  switch (state.section) {
    case 'accounts':
      return renderAccounts();
    case 'apikeys':
      return renderApiKeys();
    case 'consumo':
      return renderConsumo();
    case 'automations':
      return renderAutomations();
    case 'brand':
      return renderBrand();
    case 'notifications':
      return renderNotifications();
    case 'voice':
      return renderVoice();
    default:
      return renderAccounts();
  }
};

/* ─── Full layout render ─────────────────────────────────────────────────────── */
const render = (root) => {
  const content = root.querySelector('#settings-content');
  if (!content) return;

  content.innerHTML = `
    <div class="settings-grid">
      <aside class="settings-nav">
        ${SECTIONS.map(
          (s) => `
          <div class="settings-nav-item ${state.section === s.id ? 'active' : ''}" data-section="${s.id}">
            ${s.icon}
            <span>${s.label}</span>
          </div>`,
        ).join('')}
        <div style="margin-top:auto;padding:12px 14px 8px;border-top:1px solid var(--border-soft);margin-top:16px;">
          <div class="small" style="color:var(--text-tertiary);font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;">Versión</div>
          <div class="small muted" style="margin-top:2px;">FeedIA v1.0</div>
        </div>
      </aside>
      <div class="settings-main">
        ${renderSection()}
      </div>
    </div>`;

  attachListeners(root, content);
};

/* ─── Listeners ─────────────────────────────────────────────────────────────── */
const attachListeners = (root, content) => {
  // Section nav
  content.querySelectorAll('.settings-nav-item').forEach((item) => {
    item.addEventListener('click', () => {
      state.section = item.dataset.section;
      render(root);
    });
  });

  // Voice & language section
  if (state.section === 'voice') wireVoiceSection(root, content);

  // Consumo section
  if (state.section === 'consumo') wireConsumoSection(content);

  // API key eye toggle
  content.querySelectorAll('.api-key-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = content.querySelector(`#${btn.dataset.target}`);
      if (!input) return;
      input.type = input.type === 'password' ? 'text' : 'password';
    });
  });

  // Save API key
  content.querySelectorAll('[data-save-key]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const service = btn.dataset.saveKey;
      const input = content.querySelector(`#${service}-key`);
      if (!input) return;
      const key = input.value.trim();
      if (!key) {
        toast('Ingresá una clave válida', 'warn');
        return;
      }
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span>';
      try {
        await api('/api/settings/apikeys', { body: { service, key } });
        state.apiKeys[service] = key;
        toast(`Clave de ${service} guardada`, 'ok');
        render(root);
      } catch (err) {
        toast(err.message, 'crit');
        btn.disabled = false;
        btn.innerHTML = 'Guardar';
      }
    });
  });

  // OAuth connect / disconnect buttons — table-driven to avoid copy-paste
  const oauthButtons = [
    ['ig-connect-btn', 'instagram', 'connect'],
    ['ig-reconnect-btn', 'instagram', 'connect'],
    ['ig-disconnect-btn', 'instagram', 'disconnect'],
    ['tt-connect-btn', 'tiktok', 'connect'],
    ['tt-reconnect-btn', 'tiktok', 'connect'],
    ['tt-disconnect-btn', 'tiktok', 'disconnect'],
    ['canva-connect-btn', 'canva', 'connect'],
    ['canva-reconnect-btn', 'canva', 'connect'],
    ['canva-disconnect-btn', 'canva', 'disconnect'],
    ['meta-connect-btn', 'meta', 'connect'],
    ['meta-disconnect-btn', 'meta', 'disconnect'],
  ];
  for (const [id, service, action] of oauthButtons) {
    content.querySelector(`#${id}`)?.addEventListener('click', async () => {
      await (action === 'connect' ? initiateOAuth(service, root) : disconnect(service, root));
    });
  }

  // Higgsfield API-key connect (not OAuth)
  content.querySelector('#hf-connect-btn')?.addEventListener('click', () => connectHiggsfield(root));
  content.querySelector('#hf-reconnect-btn')?.addEventListener('click', () => connectHiggsfield(root));
  content.querySelector('#hf-disconnect-btn')?.addEventListener('click', async () => {
    if (!confirm('¿Desconectar Higgsfield? Se eliminará tu API key.')) return;
    try {
      await api('/api/settings/higgsfield/disconnect', { body: {} });
      state.connections.higgsfield = { connected: false };
      toast('Higgsfield desconectado', 'warn');
      render(root);
    } catch (err) {
      toast(err.message, 'crit');
    }
  });

  // Higgsfield provider mode selector
  content.querySelector('#hf-mode-selector')?.querySelectorAll('[data-mode]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const mode = btn.getAttribute('data-mode');
      if (!mode) return;
      try {
        await api('/api/settings/provider-mode', { body: { mode } });
        if (!state.connections.higgsfield) state.connections.higgsfield = { connected: true };
        state.connections.higgsfield.providerMode = mode;
        toast(`Modo: ${mode}`, 'ok');
        render(root);
      } catch (err) {
        toast(err.message ?? 'Error al cambiar modo', 'crit');
      }
    });
  });

  // Automation toggles
  content.querySelectorAll('[id^="auto-"]').forEach((toggle) => {
    toggle.addEventListener('change', async () => {
      const id = toggle.id.replace('auto-', '');
      try {
        await api('/api/settings/automations/toggle', { body: { id, enabled: toggle.checked } });
        const existing = state.automations.find((a) => a.id === id);
        if (existing) existing.enabled = toggle.checked;
        toast(
          `${toggle.checked ? '▶ Activado' : '⏸ Pausado'}: ${AUTOMATION_META[id]?.name ?? id}`,
          toggle.checked ? 'ok' : 'warn',
        );
      } catch (err) {
        toast(err.message, 'crit');
        toggle.checked = !toggle.checked;
      }
    });
  });

  // Save schedule
  content.querySelector('#save-schedule-btn')?.addEventListener('click', async () => {
    const tz = content.querySelector('#timezone-select')?.value;
    const digestTime = content.querySelector('#digest-time')?.value;
    try {
      await api('/api/settings/schedule', { body: { timezone: tz, digestTime } });
      toast('Horario guardado', 'ok');
    } catch (err) {
      toast(err.message, 'crit');
    }
  });

  // Tone chips (brand)
  content.querySelectorAll('[data-tone]').forEach((chip) => {
    chip.addEventListener('click', () => chip.classList.toggle('active'));
  });

  // Brand palette preview
  content.querySelector('#brand-palette')?.addEventListener('input', (e) => {
    const preview = content.querySelector('#palette-preview');
    if (!preview) return;
    const colors = e.target.value
      .split(',')
      .map((c) => c.trim())
      .filter((c) => /^#[0-9a-fA-F]{3,6}$/.test(c));
    preview.innerHTML = colors
      .map(
        (c) =>
          `<div style="width:28px;height:28px;border-radius:50%;background:${c};border:2px solid var(--border);"></div>`,
      )
      .join('');
  });

  // Save brand
  content.querySelector('#save-brand-btn')?.addEventListener('click', async () => {
    const btn = content.querySelector('#save-brand-btn');
    const tones = [...content.querySelectorAll('[data-tone].active')].map((c) => c.dataset.tone);
    const palette =
      content
        .querySelector('#brand-palette')
        ?.value.split(',')
        .map((c) => c.trim())
        .filter(Boolean) ?? [];
    const typography =
      content
        .querySelector('#brand-typography')
        ?.value.split(',')
        .map((c) => c.trim())
        .filter(Boolean) ?? [];

    const payload = {
      name: content.querySelector('#brand-name')?.value.trim(),
      niche: content.querySelector('#brand-niche')?.value.trim(),
      handle: content.querySelector('#brand-handle')?.value.trim(),
      bio: content.querySelector('#brand-bio')?.value.trim(),
      targetAudience: content.querySelector('#brand-audience')?.value.trim(),
      valueProp: content.querySelector('#brand-value-prop')?.value.trim(),
      voice: { tone: tones },
      visual: { style: content.querySelector('#brand-style')?.value, palette, typography },
    };

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> guardando…';
    try {
      await api('/api/brand', { method: 'PUT', body: payload });
      state.brand = { ...state.brand, ...payload };
      toast('Perfil de marca actualizado', 'ok');
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar perfil de marca';
    } catch (err) {
      toast(err.message, 'crit');
      btn.disabled = false;
      btn.innerHTML = '💾 Guardar perfil de marca';
    }
  });

  // Save notifications
  content.querySelector('#save-notif-btn')?.addEventListener('click', async () => {
    const prefs = {};
    NOTIF_OPTIONS.forEach((n) => {
      prefs[n.id] = content.querySelector(`#${n.id}`)?.checked ?? false;
    });
    const email = content.querySelector('#notif-email')?.value.trim();
    const webhook = content.querySelector('#notif-webhook')?.value.trim();
    try {
      await api('/api/settings/notifications', { body: { prefs, email, webhook } });
      toast('Notificaciones guardadas', 'ok');
    } catch (err) {
      toast(err.message, 'crit');
    }
  });
};

/* ─── OAuth helpers ─────────────────────────────────────────────────────────── */
const initiateOAuth = async (service, root) => {
  try {
    const res = await api('/api/settings/connect', { body: { service } });
    if (res.authUrl) {
      // Open OAuth popup
      const w = 600;
      const h = 700;
      const left = (screen.width - w) / 2;
      const top = (screen.height - h) / 2;
      const popup = window.open(
        res.authUrl,
        `${service}-oauth`,
        `width=${w},height=${h},top=${top},left=${left},toolbar=no,menubar=no,scrollbars=yes`,
      );

      // Poll for completion
      const poll = setInterval(async () => {
        if (popup?.closed) {
          clearInterval(poll);
          await loadData(root);
          toast(`Verificando conexión con ${service}…`, 'info');
        }
      }, 800);
    } else if (res.connected) {
      state.connections[service] = res;
      toast(`${service} conectado`, 'ok');
      render(root);
    }
  } catch (err) {
    toast(err.message, 'crit');
  }
};

/* ─── Higgsfield API-key modal ──────────────────────────────────────────────── */
const connectHiggsfield = (root) => {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:32px;width:min(420px,90vw);box-shadow:0 8px 40px rgba(0,0,0,.4);">
      <h2 style="margin:0 0 8px;font-size:18px;">🎬 Conectar Higgsfield</h2>
      <p style="color:var(--text-muted);font-size:13px;margin:0 0 20px;">
        Ingresá tu API key de Higgsfield para acceder a SeeDance, Wan 2.1, Kling y más modelos de video/imagen desde FeedIA.
        <br><a href="https://app.higgsfield.ai/settings/api" target="_blank" style="color:var(--accent);">Obtener API key ↗</a>
      </p>
      <input id="hf-apikey-input" type="password" placeholder="hf-sk-xxxxxxxxxxxx"
        style="width:100%;box-sizing:border-box;padding:10px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-size:14px;margin-bottom:16px;" />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button id="hf-modal-cancel" class="btn ghost small">Cancelar</button>
        <button id="hf-modal-save" class="btn" style="background:linear-gradient(135deg,#0d0d0d,#6c47ff);color:#fff;">Conectar</button>
      </div>
      <p id="hf-modal-error" style="color:#f55;font-size:12px;margin:8px 0 0;display:none;"></p>
    </div>`;
  document.body.appendChild(overlay);

  const close = () => document.body.removeChild(overlay);
  overlay.querySelector('#hf-modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  overlay.querySelector('#hf-modal-save').addEventListener('click', async () => {
    const apiKey = overlay.querySelector('#hf-apikey-input').value.trim();
    if (!apiKey) return;
    const saveBtn = overlay.querySelector('#hf-modal-save');
    const errEl = overlay.querySelector('#hf-modal-error');
    saveBtn.disabled = true;
    saveBtn.textContent = 'Validando…';
    errEl.style.display = 'none';
    try {
      const res = await api('/api/settings/higgsfield/connect', { body: { apiKey } });
      state.connections.higgsfield = {
        connected: true,
        plan: res.plan,
        availableModels: res.availableModels ?? [],
      };
      toast('Higgsfield conectado ✓', 'ok');
      close();
      render(root);
    } catch (err) {
      errEl.textContent = err.message ?? 'API key inválida';
      errEl.style.display = 'block';
      saveBtn.disabled = false;
      saveBtn.textContent = 'Conectar';
    }
  });

  setTimeout(() => overlay.querySelector('#hf-apikey-input')?.focus(), 50);
};

const disconnect = async (service, root) => {
  if (!confirm(`¿Desconectar ${service}? Perderás acceso a las funciones integradas.`)) return;
  try {
    await api('/api/settings/disconnect', { body: { service } });
    state.connections[service] = { connected: false };
    toast(`${service} desconectado`, 'warn');
    render(root);
  } catch (err) {
    toast(err.message, 'crit');
  }
};

/* ─── Load data ─────────────────────────────────────────────────────────────── */
const loadData = async (root) => {
  const [connRes, autoRes, brandRes, keysRes] = await Promise.allSettled([
    api('/api/settings/connections'),
    api('/api/settings/automations'),
    api('/api/brand'),
    api('/api/settings/apikeys'),
  ]);

  state.connections = connRes.status === 'fulfilled' ? (connRes.value ?? {}) : {};
  state.automations = autoRes.status === 'fulfilled' ? (autoRes.value.automations ?? []) : [];
  state.brand = brandRes.status === 'fulfilled' ? brandRes.value : null;
  state.apiKeys = keysRes.status === 'fulfilled' ? (keysRes.value ?? {}) : {};

  render(root);
};

/* ─── Entry point ────────────────────────────────────────────────────────────── */
export const renderSettings = async (root) => {
  state = { section: 'accounts', connections: {}, automations: [], brand: null, apiKeys: {} };

  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Configuración</h1>
        <p class="view-subtitle page-subtitle">Conectá tus cuentas, gestioná las automatizaciones y personalizá el agente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="settings-refresh-btn">↻ Actualizar</button>
      </div>
    </header>
    <div id="settings-content" class="page-body">
      <div class="page-loading"><span class="spinner"></span> cargando…</div>
    </div>`;

  root.querySelector('#settings-refresh-btn')?.addEventListener('click', () => loadData(root));
  await loadData(root);
};
