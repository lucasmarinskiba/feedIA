import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let messages = [];
let isThinking = false;

const SUGGESTIONS = [
  '¿Cuál es la mejor hora para publicar en mi nicho?',
  'Generame una idea de carrusel viral sobre IA',
  'Analizá el estado actual de mi marca en Instagram',
  '¿Qué tipo de contenido debo priorizar esta semana?',
  'Dame 5 ideas de hooks para un reel de automatización',
  '¿Cómo puedo mejorar mi engagement rate?',
  'Creá una estrategia de contenido para los próximos 30 días',
  '¿Cuáles son mis formatos con mejor rendimiento?',
];

/* Shared network icon — same geometry as sidebar logo, scales via width/height */
let _iconSeq = 0;
const logoSvg = (w, h, rx = 8) => {
  const uid = `clp-${++_iconSeq}`;
  return `
  <svg viewBox="0 0 40 40" width="${w}" height="${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <clipPath id="${uid}"><rect width="40" height="40" rx="${rx}"/></clipPath>
    </defs>
    <rect width="40" height="40" rx="${rx}" fill="url(#lg)"/>
    <g clip-path="url(#${uid})" stroke="rgba(255,255,255,.82)" stroke-width="0.85" stroke-linecap="round">
      <line x1="20" y1="6"  x2="30" y2="9"/>  <line x1="30" y1="9"  x2="35" y2="18"/>
      <line x1="35" y1="18" x2="33" y2="28"/> <line x1="33" y1="28" x2="25" y2="35"/>
      <line x1="25" y1="35" x2="14" y2="35"/> <line x1="14" y1="35" x2="6"  y2="28"/>
      <line x1="6"  y1="28" x2="5"  y2="18"/> <line x1="5"  y1="18" x2="11" y2="9"/>
      <line x1="11" y1="9"  x2="20" y2="6"/>
      <line x1="24" y1="14" x2="30" y2="23"/> <line x1="30" y1="23" x2="23" y2="31"/>
      <line x1="23" y1="31" x2="13" y2="31"/> <line x1="13" y1="31" x2="11" y2="21"/>
      <line x1="11" y1="21" x2="24" y2="14"/>
      <line x1="20" y1="6"  x2="24" y2="14"/> <line x1="30" y1="9"  x2="24" y2="14"/>
      <line x1="30" y1="9"  x2="30" y2="23"/> <line x1="35" y1="18" x2="30" y2="23"/>
      <line x1="33" y1="28" x2="30" y2="23"/> <line x1="33" y1="28" x2="23" y2="31"/>
      <line x1="25" y1="35" x2="23" y2="31"/> <line x1="14" y1="35" x2="13" y2="31"/>
      <line x1="6"  y1="28" x2="13" y2="31"/> <line x1="6"  y1="28" x2="11" y2="21"/>
      <line x1="5"  y1="18" x2="11" y2="21"/> <line x1="11" y1="9"  x2="11" y2="21"/>
      <line x1="11" y1="9"  x2="24" y2="14"/>
      <line x1="20" y1="22" x2="24" y2="14"/> <line x1="20" y1="22" x2="30" y2="23"/>
      <line x1="20" y1="22" x2="23" y2="31"/> <line x1="20" y1="22" x2="13" y2="31"/>
      <line x1="20" y1="22" x2="11" y2="21"/>
    </g>
    <g fill="white" clip-path="url(#${uid})">
      <circle cx="20" cy="6"  r="1.9"/> <circle cx="30" cy="9"  r="1.9"/>
      <circle cx="35" cy="18" r="1.9"/> <circle cx="33" cy="28" r="1.9"/>
      <circle cx="25" cy="35" r="1.9"/> <circle cx="14" cy="35" r="1.9"/>
      <circle cx="6"  cy="28" r="1.9"/> <circle cx="5"  cy="18" r="1.9"/>
      <circle cx="11" cy="9"  r="1.9"/> <circle cx="24" cy="14" r="1.9"/>
      <circle cx="30" cy="23" r="1.9"/> <circle cx="23" cy="31" r="1.9"/>
      <circle cx="13" cy="31" r="1.9"/> <circle cx="11" cy="21" r="1.9"/>
      <circle cx="20" cy="22" r="1.9"/>
    </g>
  </svg>`;
};

const renderMessage = (msg) => {
  const isUser = msg.role === 'user';
  return `
    <div class="chat-message ${isUser ? 'user' : 'assistant'}">
      ${!isUser ? `<div class="chat-avatar">${logoSvg(32, 32)}</div>` : ''}
      <div class="chat-bubble ${isUser ? 'user' : 'assistant'}">
        <div class="chat-text">${msg.html ?? escape(msg.content ?? '')}</div>
        ${
          msg.tools?.length
            ? `
          <div class="chat-tools-row">
            ${msg.tools.map((t) => `<a class="chat-tool-chip" href="#${t.route ?? ''}" data-route="${t.route ?? ''}">${t.icon ?? '→'} ${escape(t.label)}</a>`).join('')}
          </div>`
            : ''
        }
        <div class="chat-meta">${new Date(msg.ts ?? Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
      </div>
      ${isUser ? `<div class="chat-user-avatar">🧑</div>` : ''}
    </div>`;
};

const renderThinking = () => `
  <div class="chat-message assistant" id="thinking-bubble">
    <div class="chat-avatar">${logoSvg(32, 32)}</div>
    <div class="chat-bubble assistant">
      <div class="chat-dots"><span></span><span></span><span></span></div>
    </div>
  </div>`;

const scrollToBottom = (chatEl) => {
  chatEl.scrollTop = chatEl.scrollHeight;
};

const renderMessages = (chatEl) => {
  if (!messages.length) {
    chatEl.innerHTML = `
      <div class="chat-welcome">
        <div class="chat-welcome-icon">${logoSvg(64, 64, 16)}</div>
        <div class="chat-welcome-title">Hola, soy <span class="gradient-text">FeedIA</span> 👋</div>
        <div class="chat-welcome-sub">Tu agente IA especialista en Instagram.<br>Preguntame lo que quieras sobre tu marca, estrategia y contenido.</div>
      </div>`;
    return;
  }
  chatEl.innerHTML = messages.map(renderMessage).join('');
  if (isThinking) chatEl.insertAdjacentHTML('beforeend', renderThinking());
  scrollToBottom(chatEl);
};

const sendMessage = async (root, text) => {
  if (!text.trim() || isThinking) return;
  messages.push({ role: 'user', content: text, ts: Date.now() });
  isThinking = true;

  const chatEl = root.querySelector('#chat-messages');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send-btn');

  if (input) input.value = '';
  if (sendBtn) sendBtn.disabled = true;
  renderMessages(chatEl);

  try {
    const res = await api('/api/assistant/chat', {
      body: { message: text, history: messages.slice(-10, -1) },
    });
    messages.push({
      role: 'assistant',
      content: res.reply ?? '',
      html: res.replyHtml,
      tools: res.tools ?? [],
      ts: Date.now(),
    });
  } catch (err) {
    messages.push({
      role: 'assistant',
      content: `Lo siento, hubo un error: ${err.message}`,
      ts: Date.now(),
    });
    toast(err.message, 'crit');
  } finally {
    isThinking = false;
    if (sendBtn) sendBtn.disabled = false;
    renderMessages(chatEl);

    /* Wire tool chips to navigation */
    chatEl.querySelectorAll('.chat-tool-chip[data-route]').forEach((chip) => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const route = chip.dataset.route;
        if (route) document.querySelector(`[data-route="${route}"]`)?.click();
      });
    });
  }
};

export const renderAssistant = async (root) => {
  messages = [];
  isThinking = false;
  _iconSeq = 0;

  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title gradient-text">✦ Asistente FeedIA</h1>
        <p class="view-subtitle page-subtitle">Agente IA conversacional — conoce tu marca, estrategia y datos.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost small" id="clear-chat-btn">🗑 Limpiar chat</button>
      </div>
    </header>

    <div class="page-body chat-page-body">
    <div class="chat-layout">
      <!-- Suggestions sidebar -->
      <div class="chat-sidebar">
        <div class="small" style="font-weight:700;margin-bottom:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.5px;font-size:11px">Sugerencias</div>
        <div class="chat-suggestions">
          ${SUGGESTIONS.map(
            (s) => `
            <button class="suggestion-chip">${escape(s)}</button>`,
          ).join('')}
        </div>
        <div class="chat-sidebar-footer">
          <div class="tiny muted" style="margin-top:16px;border-top:1px solid var(--border-soft);padding-top:12px">
            💡 <strong>Tip:</strong> FeedIA tiene acceso a tu perfil de marca, métricas y todo el historial de contenido.
          </div>
        </div>
      </div>

      <!-- Chat area -->
      <div class="chat-main">
        <div id="chat-messages" class="chat-messages"></div>

        <div class="chat-input-area">
          <div class="chat-input-row">
            <textarea class="chat-input" id="chat-input" placeholder="Preguntale cualquier cosa a FeedIA…" rows="1"></textarea>
            <button class="btn gradient chat-send-btn" id="chat-send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
          <div class="tiny muted" style="margin-top:6px;text-align:center">
            FeedIA usa tu perfil de marca y datos de sesión. Las respuestas son sugerencias, siempre revisá antes de publicar.
          </div>
        </div>
      </div>
    </div>
    </div>`;

  const chatEl = root.querySelector('#chat-messages');
  const input = root.querySelector('#chat-input');
  const sendBtn = root.querySelector('#chat-send-btn');
  renderMessages(chatEl);

  /* Send on button click */
  sendBtn?.addEventListener('click', () => sendMessage(root, input?.value ?? ''));

  /* Send on Enter (Shift+Enter = newline) */
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(root, input.value);
    }
  });

  /* Auto-resize textarea */
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  /* Suggestion chips */
  root.querySelectorAll('.suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => sendMessage(root, chip.textContent ?? ''));
  });

  /* Clear chat */
  root.querySelector('#clear-chat-btn')?.addEventListener('click', () => {
    messages = [];
    renderMessages(chatEl);
  });
};
