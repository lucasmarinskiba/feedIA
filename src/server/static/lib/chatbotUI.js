/* ══════════════════════════════════════════════════════════════════════════════
   chatbotUI.js — Asistente FeedIA en burbuja flotante (junto al micrófono)
   ──────────────────────────────────────────────────────────────────────────────
   Vive al lado del botón "Hola FeedIA". Conversación enriquecida vía
   /api/assistant/chat: conoce marca, métricas, automatizaciones y agentes IA.
   Renderiza HTML, chips de herramientas para navegación, sugerencias y welcome
   con logo. Tolerante a backend offline (apiSafe).
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from './api.js';

const $ = (id) => document.getElementById(id);

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// ── Knowledge: equipo IA, dominio, sugerencias ────────────────────────────────
const SUGGESTIONS = [
  { emoji: '⏰', text: '¿Cuál es la mejor hora para publicar?' },
  { emoji: '🃏', text: 'Dame una idea de carrusel viral sobre IA' },
  { emoji: '📊', text: 'Analizá mi marca en Instagram' },
  { emoji: '🎬', text: '5 hooks para un reel de automatización' },
  { emoji: '📈', text: '¿Cómo subo mi engagement rate?' },
  { emoji: '🗓️', text: 'Estrategia de contenido para 30 días' },
  { emoji: '🎯', text: '¿Qué formato me funciona mejor?' },
  { emoji: '🛡️', text: '¿Hay algún riesgo de shadowban hoy?' },
];

const TEAM_HINT = [
  { e: '🎨', n: 'Nova', t: 'Diseñadora — arma carruseles, reels y stories con tu marca' },
  { e: '✍️', n: 'Lía', t: 'Copywriter — escribe captions, hooks y respuestas con voz de marca' },
  { e: '🛡️', n: 'Gard', t: 'Compliance — valida tono, riesgo, hashtags y políticas antes de publicar' },
  { e: '🚀', n: 'Luca', t: 'Publisher — sube los posts a Instagram (API o Computer Use)' },
  { e: '📈', n: 'Mira', t: 'Métricas — analiza performance y programa boosts cuando conviene' },
];

// ── Logo (mismo que assistant.js) ─────────────────────────────────────────────
let _iconSeq = 0;
const logoSvg = (w, h, rx = 8) => {
  const uid = `cblg-${++_iconSeq}`;
  return `
  <svg viewBox="0 0 40 40" width="${w}" height="${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="${uid}g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#6366f1"/><stop offset="100%" stop-color="#a855f7"/>
      </linearGradient>
      <clipPath id="${uid}"><rect width="40" height="40" rx="${rx}"/></clipPath>
    </defs>
    <rect width="40" height="40" rx="${rx}" fill="url(#${uid}g)"/>
    <g clip-path="url(#${uid})" stroke="rgba(255,255,255,.85)" stroke-width="0.85" stroke-linecap="round">
      <line x1="20" y1="6"  x2="30" y2="9"/><line x1="30" y1="9"  x2="35" y2="18"/>
      <line x1="35" y1="18" x2="33" y2="28"/><line x1="33" y1="28" x2="25" y2="35"/>
      <line x1="25" y1="35" x2="14" y2="35"/><line x1="14" y1="35" x2="6"  y2="28"/>
      <line x1="6"  y1="28" x2="5"  y2="18"/><line x1="5"  y1="18" x2="11" y2="9"/>
      <line x1="11" y1="9"  x2="20" y2="6"/><line x1="20" y1="22" x2="24" y2="14"/>
      <line x1="20" y1="22" x2="30" y2="23"/><line x1="20" y1="22" x2="23" y2="31"/>
      <line x1="20" y1="22" x2="13" y2="31"/><line x1="20" y1="22" x2="11" y2="21"/>
    </g>
    <g fill="white" clip-path="url(#${uid})">
      <circle cx="20" cy="6"  r="1.7"/><circle cx="30" cy="9"  r="1.7"/>
      <circle cx="35" cy="18" r="1.7"/><circle cx="33" cy="28" r="1.7"/>
      <circle cx="25" cy="35" r="1.7"/><circle cx="14" cy="35" r="1.7"/>
      <circle cx="6"  cy="28" r="1.7"/><circle cx="5"  cy="18" r="1.7"/>
      <circle cx="11" cy="9"  r="1.7"/><circle cx="20" cy="22" r="1.9"/>
    </g>
  </svg>`;
};

// ── Estado ────────────────────────────────────────────────────────────────────
let messages = []; // { role, content, html?, tools?, ts }
let opened = false;
let thinking = false;
let navigateFn = () => {};

// ── Render ────────────────────────────────────────────────────────────────────
const renderWelcome = () => `
  <div class="chatbot-welcome">
    <!-- Hero card: fondo claro con texto oscuro, contrasta sobre el panel dark -->
    <div class="chatbot-hero-card">
      <div class="chatbot-hero-orbs">
        <span class="chatbot-orb chatbot-orb-1"></span>
        <span class="chatbot-orb chatbot-orb-2"></span>
        <span class="chatbot-orb chatbot-orb-3"></span>
      </div>
      <div class="chatbot-hero-logo-wrap">
        <div class="chatbot-hero-logo">${logoSvg(54, 54, 14)}</div>
        <div class="chatbot-hero-pulse"></div>
      </div>
      <div class="chatbot-hero-eyebrow">
        <span class="chatbot-status-dot"></span>
        Asistente IA · en línea
      </div>
      <h2 class="chatbot-hero-title">
        Hola, soy <span class="chatbot-grad">FeedIA</span> <span class="chatbot-sparkle">✦</span>
      </h2>
      <p class="chatbot-hero-sub">
        Tu agente IA especialista en Instagram. Conozco tu marca, tus métricas y manejo a tu equipo IA.
      </p>
      <div class="chatbot-hero-hint">
        <span>💡</span> Probá una sugerencia abajo o escribime libre.
      </div>
    </div>

    <details class="chatbot-team-details">
      <summary>👥 ¿Quiénes son Nova, Lía, Gard, Luca y Mira?</summary>
      <div class="chatbot-team-list">
        ${TEAM_HINT.map(
          (m) => `
          <div class="chatbot-team-row">
            <span class="chatbot-team-emoji">${m.e}</span>
            <div>
              <div class="chatbot-team-name">${escapeHtml(m.n)}</div>
              <div class="chatbot-team-desc">${escapeHtml(m.t)}</div>
            </div>
          </div>`,
        ).join('')}
        <div class="chatbot-team-foot">Son los agentes IA internos. Vos comandás, ellos ejecutan.</div>
      </div>
    </details>
  </div>`;

const renderMessage = (msg) => {
  const isUser = msg.role === 'user';
  const toolsHtml = msg.tools?.length
    ? `
    <div class="chatbot-tools-row">
      ${msg.tools.map((t) => `<a class="chatbot-tool-chip" href="#${escapeHtml(t.route ?? '')}" data-route="${escapeHtml(t.route ?? '')}">${t.icon ?? '→'} ${escapeHtml(t.label)}</a>`).join('')}
    </div>`
    : '';
  const body = msg.html ?? escapeHtml(msg.content ?? '');
  const ts = new Date(msg.ts ?? Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  return `
    <div class="chatbot-msg-row ${isUser ? 'user' : 'bot'}">
      ${!isUser ? `<div class="chatbot-msg-avatar">${logoSvg(26, 26, 6)}</div>` : ''}
      <div class="chatbot-msg-bubble ${isUser ? 'user' : 'bot'}">
        <div class="chatbot-msg-text">${body}</div>
        ${toolsHtml}
        <div class="chatbot-msg-ts">${ts}</div>
      </div>
    </div>`;
};

const renderThinking = () => `
  <div class="chatbot-msg-row bot">
    <div class="chatbot-msg-avatar">${logoSvg(26, 26, 6)}</div>
    <div class="chatbot-msg-bubble bot">
      <div class="chatbot-typing-row"><span></span><span></span><span></span></div>
    </div>
  </div>`;

const renderSuggestions = () => `
  <div class="chatbot-sugg-grid">
    ${SUGGESTIONS.map((s) => `<button class="chatbot-sugg" data-q="${escapeHtml(s.text)}">${s.emoji} ${escapeHtml(s.text)}</button>`).join('')}
  </div>`;

const repaintLog = () => {
  const log = $('chatbot-log');
  if (!log) return;
  if (!messages.length) {
    log.innerHTML = renderWelcome();
    return;
  }
  log.innerHTML = messages.map(renderMessage).join('');
  if (thinking) log.insertAdjacentHTML('beforeend', renderThinking());
  log.scrollTop = log.scrollHeight;
  // Offline retry buttons
  log.querySelectorAll('.chatbot-offline-retry[data-q]').forEach((btn) => {
    btn.addEventListener('click', () => {
      // Borrar la última respuesta offline y reintentar
      if (messages.at(-1)?.content === 'Sin conexión') messages.pop();
      void sendMessage(btn.dataset.q);
    });
  });
  // Tool chip navigation
  log.querySelectorAll('.chatbot-tool-chip[data-route]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const route = chip.dataset.route;
      if (route) {
        closePanel();
        navigateFn(route);
      }
    });
  });
};

const repaintSuggestions = () => {
  const box = $('chatbot-sugg-box');
  if (!box) return;
  // Hide suggestions once conversation starts
  box.style.display = messages.length === 0 ? 'block' : 'none';
};

// ── Acciones ──────────────────────────────────────────────────────────────────
const openPanel = () => {
  const panel = $('chatbot-panel');
  if (!panel) return;
  opened = true;
  panel.classList.add('open');
  panel.setAttribute('aria-hidden', 'false');
  repaintLog();
  repaintSuggestions();
  setTimeout(() => $('chatbot-input')?.focus(), 60);
};

const closePanel = () => {
  opened = false;
  const panel = $('chatbot-panel');
  if (!panel) return;
  panel.classList.remove('open');
  panel.setAttribute('aria-hidden', 'true');
  // Close voice overlay if open (prevent overlap)
  window.closeVoiceOverlay?.();
};

const clearChat = () => {
  messages = [];
  repaintLog();
  repaintSuggestions();
};

const sendMessage = async (text) => {
  const txt = (text ?? '').trim();
  if (!txt || thinking) return;
  messages.push({ role: 'user', content: txt, ts: Date.now() });
  const input = $('chatbot-input');
  if (input) {
    input.value = '';
    input.style.height = 'auto';
  }
  const sendBtn = $('chatbot-send');
  if (sendBtn) sendBtn.disabled = true;
  thinking = true;
  repaintSuggestions();
  repaintLog();

  // Usa /api/assistant/chat (mismo backend que la vista assistant, con conocimiento de marca)
  const { data, error } = await apiSafe('/api/assistant/chat', null, {
    method: 'POST',
    body: { message: txt, history: messages.slice(-10, -1) },
  });

  thinking = false;
  if (sendBtn) sendBtn.disabled = false;

  if (error || !data) {
    messages.push({
      role: 'assistant',
      html: `<div class="chatbot-offline-msg">
        <div class="chatbot-offline-title">📡 Estoy temporalmente sin conexión</div>
        <div class="chatbot-offline-sub">El servidor de FeedIA no responde en este momento. Cuando vuelva, vas a poder consultarme sobre tu marca, métricas y lanzar misiones.</div>
        <button class="chatbot-offline-retry" data-q="${escapeHtml(txt)}">↻ Reintentar</button>
      </div>`,
      content: 'Sin conexión',
      ts: Date.now(),
    });
  } else {
    messages.push({
      role: 'assistant',
      content: data.reply ?? '',
      html: data.replyHtml,
      tools: data.tools ?? [],
      ts: Date.now(),
    });
  }
  repaintLog();
};

// ── Init ──────────────────────────────────────────────────────────────────────
export const initChatbotUI = ({ navigate }) => {
  navigateFn =
    navigate ||
    ((route) => {
      window.location.hash = `#${route}`;
    });

  $('chatbot-fab')?.addEventListener('click', () => {
    opened ? closePanel() : openPanel();
  });
  $('chatbot-close')?.addEventListener('click', closePanel);
  $('chatbot-clear')?.addEventListener('click', clearChat);

  $('chatbot-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    void sendMessage($('chatbot-input')?.value ?? '');
  });

  // Suggestions (delegated, since they re-render)
  document.addEventListener('click', (e) => {
    const sugg = e.target.closest?.('.chatbot-sugg');
    if (sugg && sugg.dataset.q) void sendMessage(sugg.dataset.q);
  });

  // Auto-resize input
  const input = $('chatbot-input');
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 100) + 'px';
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage(input.value);
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && opened) closePanel();
  });

  // ── Mic button — hands-free chat input ────────────────────────────────────
  const micBtn = $('chatbot-mic-btn');
  const SR = typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null;

  if (micBtn && SR) {
    let micRec = null;
    let micActive = false;

    const stopMic = () => {
      micActive = false;
      micBtn.classList.remove('recording');
      micBtn.setAttribute('aria-label', 'Dictar mensaje');
      try {
        micRec?.stop();
      } catch {
        /* ignore */
      }
    };

    micBtn.addEventListener('click', () => {
      if (micActive) {
        stopMic();
        return;
      }

      micActive = true;
      micBtn.classList.add('recording');
      micBtn.setAttribute('aria-label', 'Grabando… tocá para parar');
      const chatInput = $('chatbot-input');

      micRec = new SR();
      micRec.lang = navigator.language || 'es-AR';
      micRec.continuous = false;
      micRec.interimResults = true;
      micRec.maxAlternatives = 1;

      let finalText = '';
      let silenceTimer = null;

      const resetSilence = () => {
        clearTimeout(silenceTimer);
        // Auto-commit after 1.8s silence
        silenceTimer = setTimeout(() => {
          try {
            micRec?.stop();
          } catch {
            /* ignore */
          }
        }, 1800);
      };

      micRec.onresult = (e) => {
        resetSilence();
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' ';
          else interim = e.results[i][0].transcript;
        }
        if (chatInput) chatInput.value = (finalText + interim).trim();
      };

      micRec.onend = () => {
        clearTimeout(silenceTimer);
        stopMic();
        const text = (finalText || chatInput?.value || '').trim();
        // Noise gate: require ≥2 words
        if (text && text.split(/\s+/).filter(Boolean).length >= 2) {
          void sendMessage(text);
        }
      };

      micRec.onerror = (e) => {
        clearTimeout(silenceTimer);
        if (e.error !== 'aborted') {
          // Show inline error hint in placeholder
          if (chatInput) chatInput.placeholder = 'Error de micrófono — verificá permisos';
          setTimeout(() => {
            if (chatInput) chatInput.placeholder = 'Preguntale lo que quieras a FeedIA…';
          }, 3000);
        }
        stopMic();
      };

      resetSilence();
      try {
        micRec.start();
      } catch {
        stopMic();
      }
    });
  } else if (micBtn) {
    // No SR support — hide mic button gracefully
    micBtn.style.display = 'none';
  }
};

export const openChatbot = openPanel;

// Export global close function for voice sync
window.closeChatbotPanel = closePanel;
