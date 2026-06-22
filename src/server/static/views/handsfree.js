/* ══════════════════════════════════════════════════════════════════════════════
   MANOS LIBRES — pantalla terminal-style para Computer Use real
   Modo Manos Libres = 1 textarea (voz o texto) + log de acciones en vivo.
   Sin forms. El cerebro lee brand-kit, intel, archetype del cache automáticamente.
   ══════════════════════════════════════════════════════════════════════════════ */
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let log = []; // {at, icon, text, status}
let lastResult = null;
let recognition = null;
let listening = false;
let continuousMode = false; // si true → reinicia auto al onend
let voiceEnabled = true;   // TTS on/off
let preferredVoice = null;
let userName = '';

// ── TTS · ElevenLabs (premium, opt-in BYOK) → fallback speechSynthesis ───────
let elevenLabsActive = false;     // tiene API key configurada?
let elevenLabsVoiceId = null;
let currentAudio = null;          // <audio> de ElevenLabs en curso

const checkElevenLabs = async () => {
  try {
    const r = await fetch('/api/voice/elevenlabs/status');
    const j = await r.json();
    elevenLabsActive = Boolean(j?.configured);
    elevenLabsVoiceId = j?.voiceId || null;
  } catch { elevenLabsActive = false; }
};

const speakElevenLabs = async (text) => {
  try {
    const r = await fetch('/api/voice/elevenlabs/speak', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId: elevenLabsVoiceId }),
    });
    if (!r.ok) throw new Error(`http ${r.status}`);
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    if (currentAudio) { try { currentAudio.pause(); } catch {} }
    currentAudio = new Audio(url);
    currentAudio.play().catch(() => {});
    currentAudio.onended = () => URL.revokeObjectURL(url);
    return true;
  } catch { return false; }
};

const pickVoice = () => {
  if (!window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const order = [/es-AR/i, /es-MX/i, /es-US/i, /es-419/i, /es-ES/i, /^es/i];
  for (const rx of order) {
    const v = voices.find((vv) => rx.test(vv.lang));
    if (v) return v;
  }
  return voices[0];
};

const speakBrowser = (text, { interrupt = true, rate = 1.05, pitch = 1.02 } = {}) => {
  if (!window.speechSynthesis || !text) return;
  if (interrupt) window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(String(text).slice(0, 280));
  u.lang = 'es-AR'; u.rate = rate; u.pitch = pitch;
  if (!preferredVoice) preferredVoice = pickVoice();
  if (preferredVoice) u.voice = preferredVoice;
  try { window.speechSynthesis.speak(u); } catch {}
};

const speak = async (text, opts = {}) => {
  if (!voiceEnabled || !text) return;
  // Premium primero (ElevenLabs) → fallback browser
  if (elevenLabsActive) {
    if (opts.interrupt !== false && currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
    const ok = await speakElevenLabs(text);
    if (ok) return;
    elevenLabsActive = false; // si falló, cambio a fallback para próximas
  }
  speakBrowser(text, opts);
};

const stopSpeaking = () => {
  try { window.speechSynthesis?.cancel(); } catch {}
  if (currentAudio) { try { currentAudio.pause(); } catch {} currentAudio = null; }
};

// Detectar nombre del usuario (Brand Kit > localStorage > 'creator')
const loadUserName = async () => {
  try {
    let handle = '';
    try { handle = JSON.parse(localStorage.getItem('feedia.brujula.account') || '{}').handle || ''; } catch {}
    const r = await fetch('/api/account/profile', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', accountId: handle }),
    });
    const j = await r.json();
    const bk = j?.profile?.brandKit || j?.profile || {};
    const name = (bk.handle || handle || '').replace(/^@/, '').split(/[._\-]/)[0];
    userName = name && name.length > 1 ? name.charAt(0).toUpperCase() + name.slice(1) : '';
  } catch { userName = ''; }
};

// Wake word detector — "feedia"
const WAKE_WORD = /\bfeedia\b/i;
const stripWakeWord = (txt) => txt.replace(WAKE_WORD, '').trim();

// Frases de saludo aleatorias para responder al wake word
const GREETINGS = ['En seguida', 'Dale', 'Voy', 'Manos a la obra', 'Vamos'];
const greet = () => {
  const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
  return userName ? `${g} ${userName}` : `${g}`;
};

// Auto-activar Computer Use cuando hay tarea creativa/creación
const isCreativeTask = (txt) => /carrusel|reel|historia|stories|post|publicar|generar|crear|hac[eé]/i.test(txt);
const tryActivateCU = async () => {
  try {
    const r = await fetch('/api/cua/state', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mode: 'auto' }) });
    if (r.ok) document.body.dataset.cuMode = 'auto';
  } catch {}
};

const getPlatform = async () => {
  try {
    const mod = await import('../lib/platform.js');
    return mod.getPlatform();
  } catch {
    return 'instagram';
  }
};

const renderShell = (platform) => `
  <div class="hf-shell">
    <div class="hf-header">
      <div class="hf-hdr-left">
        <span class="hf-dot"></span>
        <span class="hf-title">Manos Libres</span>
        <span class="hf-platform">→ ${escape(platform)}</span>
      </div>
      <div class="hf-hdr-right">
        <button id="hf-cfg" class="hf-iconbtn" title="Configurar voz premium (ElevenLabs)">⚙️</button>
        <button id="hf-tts" class="hf-iconbtn" title="Voz on/off">🔊</button>
        <button id="hf-always" class="hf-iconbtn" title="Modo siempre escuchando (decí 'feedia' + comando)">👂</button>
        <button id="hf-clear" class="hf-iconbtn" title="Limpiar log">⊘</button>
        <button id="hf-close" class="hf-iconbtn" title="Volver a Hola FeedIA">✕</button>
      </div>
    </div>

    <details id="hf-cfg-panel" class="hf-cfg-panel">
      <summary class="hf-cfg-sum">⚙️ Voz premium (ElevenLabs · opcional)</summary>
      <div class="hf-cfg-body">
        <p class="hf-cfg-hint">Por default uso la voz nativa del navegador (gratis). Si pegás tu key de <a href="https://elevenlabs.io" target="_blank" rel="noopener">ElevenLabs</a> (plan free 10k chars/mes), respondo con voz mucho más natural multilenguaje.</p>
        <div class="hf-cfg-row">
          <input id="hf-el-key" type="password" class="hf-input" placeholder="sk-... (tu API key ElevenLabs)" autocomplete="off" />
          <select id="hf-el-voice" class="hf-input" style="max-width:280px;">
            <option value="EXAVITQu4vr4xnSDxMaL">Bella · ES cálida</option>
            <option value="pNInz6obpgDQGcFmaJgB">Adam · ES masculina</option>
            <option value="XB0fDUnXU5powFXDhCwa">Charlotte · ES profesional</option>
            <option value="21m00Tcm4TlvDq8ikWAM">Rachel · ES narrativa</option>
          </select>
        </div>
        <div class="hf-cfg-actions">
          <button id="hf-el-save" class="hf-go" style="padding:6px 14px;font-size:12px;">Guardar key</button>
          <button id="hf-el-test" class="hf-iconbtn" style="width:auto;padding:6px 14px;">🎵 Probar voz</button>
          <button id="hf-el-clear" class="hf-iconbtn" style="width:auto;padding:6px 14px;">🗑 Quitar</button>
          <span id="hf-el-status" class="hf-cfg-status"></span>
        </div>
      </div>
    </details>

    <div class="hf-input-row">
      <textarea id="hf-input" class="hf-input" rows="3" placeholder='Decile a FeedIA qué querés que haga. Ej: "Feedia, creá un carrusel sobre IA" — o tocá 🎙️ y dictá. Activá 👂 para modo manos libres total.'></textarea>
      <button id="hf-mic" class="hf-mic" title="Dictar por voz (tocá para empezar, tocá de nuevo para parar)">🎙️</button>
    </div>
    <div class="hf-row-actions">
      <label class="hf-cb"><input type="checkbox" id="hf-autopublish" /> 🚀 Auto-publicar (requiere cuenta conectada)</label>
      <button id="hf-go" class="hf-go">▶ Ejecutar</button>
    </div>

    <div class="hf-divider"><span>actividad en vivo</span></div>

    <div id="hf-timeline" class="hf-timeline">
      <div class="hf-empty">Esperando tu pedido…</div>
    </div>

    <div id="hf-output" class="hf-output" hidden></div>
  </div>

  <style>
    .hf-shell{max-width:880px;margin:20px auto;padding:0 16px;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,Arial,sans-serif;}
    .hf-header{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border:1px solid var(--border);border-radius:12px 12px 0 0;background:linear-gradient(180deg,#0F0F14,#16161E);}
    .hf-hdr-left{display:flex;align-items:center;gap:10px;}
    .hf-dot{width:10px;height:10px;border-radius:50%;background:#10F2B0;box-shadow:0 0 10px #10F2B0;animation:hf-pulse 1.4s ease-in-out infinite;}
    @keyframes hf-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
    .hf-title{font-weight:800;font-size:14px;color:#fff;letter-spacing:1px;}
    .hf-platform{font-size:11px;color:#a78bfa;}
    .hf-hdr-right{display:flex;gap:6px;}
    .hf-iconbtn{background:rgba(255,255,255,.06);border:1px solid var(--border);color:#fff;width:30px;height:30px;border-radius:8px;font-size:14px;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;text-decoration:none;}
    .hf-iconbtn:hover{background:rgba(255,255,255,.12);}
    .hf-cfg-panel{border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;}
    .hf-cfg-sum{cursor:pointer;list-style:none;padding:10px 14px;font-size:12px;color:#a78bfa;font-weight:700;border-bottom:1px solid var(--border);user-select:none;}
    .hf-cfg-sum::-webkit-details-marker{display:none;}
    .hf-cfg-body{padding:12px 14px;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:8px;}
    .hf-cfg-hint{font-size:11.5px;color:#9CA3AF;line-height:1.5;margin:0;}
    .hf-cfg-hint a{color:#a78bfa;text-decoration:underline;}
    .hf-cfg-row{display:flex;gap:8px;align-items:center;}
    .hf-cfg-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
    .hf-cfg-status{font-size:11px;}
    .hf-input-row{display:flex;gap:8px;padding:14px;border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;align-items:stretch;}
    .hf-input{flex:1;background:rgba(255,255,255,.04);color:#fff;border:1px solid var(--border);border-radius:10px;padding:12px 14px;font-size:14.5px;font-family:inherit;resize:vertical;line-height:1.5;}
    .hf-input:focus{outline:none;border-color:#a855f7;}
    .hf-mic{width:58px;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:none;border-radius:10px;font-size:22px;cursor:pointer;transition:transform .15s;}
    .hf-mic.listening{background:linear-gradient(135deg,#ef4444,#f59e0b);animation:hf-pulse 1s ease-in-out infinite;}
    .hf-mic:hover{transform:scale(1.05);}
    .hf-row-actions{display:flex;justify-content:space-between;align-items:center;padding:10px 14px;border-left:1px solid var(--border);border-right:1px solid var(--border);background:#0A0A0F;border-bottom:1px solid var(--border);}
    .hf-cb{font-size:12px;color:#9CA3AF;display:flex;align-items:center;gap:6px;cursor:pointer;}
    .hf-go{background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;border:none;padding:8px 22px;border-radius:8px;font-weight:900;font-size:13px;cursor:pointer;letter-spacing:1px;}
    .hf-go:hover{filter:brightness(1.1);}
    .hf-go:disabled{opacity:.5;cursor:wait;}
    .hf-divider{display:flex;align-items:center;gap:10px;margin:14px 0 6px;font-size:10.5px;color:#6B7280;letter-spacing:3px;text-transform:uppercase;}
    .hf-divider::before,.hf-divider::after{content:"";flex:1;height:1px;background:var(--border);}
    .hf-timeline{padding:12px 14px;border:1px solid var(--border);border-radius:0 0 12px 12px;background:#070710;min-height:140px;font-family:"SF Mono","Cascadia Mono",Menlo,monospace;font-size:12.5px;line-height:1.7;color:#E5E7EB;}
    .hf-empty{color:#4B5563;font-style:italic;font-family:inherit;font-size:13px;}
    .hf-event{display:grid;grid-template-columns:60px 22px 1fr;gap:10px;padding:3px 0;animation:hf-slide-in .25s ease-out;}
    @keyframes hf-slide-in{from{opacity:0;transform:translateX(-8px);}to{opacity:1;transform:none;}}
    .hf-event-time{color:#6B7280;}
    .hf-event-icon{text-align:center;}
    .hf-event-text{color:#E5E7EB;}
    .hf-event.fail .hf-event-text{color:#FCA5A5;}
    .hf-event.warn .hf-event-text{color:#FBBF24;}
    .hf-event.pending .hf-event-text{color:#A78BFA;}
    .hf-output{margin-top:16px;padding:14px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(180deg,rgba(16,242,176,.05),rgba(59,130,246,.03));}
    .hf-out-title{font-size:11px;font-weight:800;letter-spacing:2px;color:#10F2B0;margin-bottom:10px;text-transform:uppercase;}
    .hf-out-section{margin-bottom:10px;}
    .hf-out-label{font-size:11px;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:3px;}
    .hf-out-text{font-size:13.5px;color:#fff;line-height:1.5;}
    .hf-slides{display:flex;gap:8px;overflow-x:auto;padding:6px 0;scroll-snap-type:x mandatory;margin-top:6px;}
    .hf-slide{flex:0 0 auto;width:140px;cursor:zoom-in;position:relative;transition:transform .15s;}
    .hf-slide:hover{transform:scale(1.04);}
    .hf-slide img{width:140px;height:187px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block;}
    .hf-slide-tag{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.75);color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;}
    .hf-pending-badge{display:inline-block;padding:3px 9px;border-radius:6px;background:rgba(168,85,247,.15);color:#A78BFA;font-size:11px;font-weight:700;letter-spacing:1px;margin-bottom:6px;}
    /* Lightbox WhatsApp-style */
    .hf-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:hf-fade .2s ease-out;}
    @keyframes hf-fade{from{opacity:0;}to{opacity:1;}}
    .hf-lb-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.1);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;}
    .hf-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);color:#fff;border:none;width:54px;height:54px;border-radius:50%;font-size:34px;cursor:pointer;line-height:1;}
    .hf-lb-nav:disabled{opacity:.25;cursor:not-allowed;}
    .hf-lb-prev{left:16px;}.hf-lb-next{right:16px;}
    .hf-lb-stage img{max-width:90vw;max-height:80vh;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.6);}
    .hf-lb-meta{color:rgba(255,255,255,.85);font-size:13px;text-align:center;margin-top:10px;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:8px;display:inline-block;}
    .hf-lb-dl{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#a855f7;color:#fff;text-decoration:none;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:800;}
    .hf-suggest{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px;}
    .hf-chip{font-size:11.5px;background:rgba(168,85,247,.12);color:#C4B5FD;border:1px solid rgba(168,85,247,.3);padding:5px 11px;border-radius:14px;cursor:pointer;transition:all .15s;}
    .hf-chip:hover{background:rgba(168,85,247,.25);}
  </style>`;

const formatT = (ms) => `+${(ms / 1000).toFixed(1)}s`;

const renderTimeline = (root) => {
  const host = root.querySelector('#hf-timeline');
  if (!host) return;
  if (!log.length) {
    host.innerHTML = '<div class="hf-empty">Esperando tu pedido…</div>';
    return;
  }
  host.innerHTML = log
    .map(
      (ev) => `
    <div class="hf-event ${ev.status || 'done'}">
      <span class="hf-event-time">${escape(formatT(ev.at))}</span>
      <span class="hf-event-icon">${escape(ev.icon || '·')}</span>
      <span class="hf-event-text">${escape(ev.text || '')}</span>
    </div>`,
    )
    .join('');
  host.scrollTop = host.scrollHeight;
};

const renderOutput = (root, result) => {
  const host = root.querySelector('#hf-output');
  if (!host) return;
  if (!result) {
    host.hidden = true;
    return;
  }
  const o = result.output || {};
  const d = result.decision || {};
  const slides = Array.isArray(o.carouselSlides)
    ? o.carouselSlides
    : o.image?.url
      ? [{ n: 1, role: 'output', dataUrl: o.image.url }]
      : [];
  host.hidden = false;
  host.innerHTML = `
    <div class="hf-out-title">Resultado</div>
    ${o.pending ? `<div class="hf-pending-badge">${escape(o.reason || 'PENDIENTE')}</div>` : ''}
    ${d.archetype ? `<div class="hf-out-section"><div class="hf-out-label">Voz · Estética · Roles</div><div class="hf-out-text"><b>${escape(d.archetype)}</b> · ${escape(d.mood || '')} · ${(d.roles || []).join(' + ')}</div></div>` : ''}
    ${o.content?.hook ? `<div class="hf-out-section"><div class="hf-out-label">Hook</div><div class="hf-out-text">${escape(o.content.hook)}</div></div>` : ''}
    ${o.content?.caption ? `<div class="hf-out-section"><div class="hf-out-label">Caption</div><div class="hf-out-text">${escape(o.content.caption.slice(0, 400))}${o.content.caption.length > 400 ? '…' : ''}</div></div>` : ''}
    ${o.reply ? `<div class="hf-out-section"><div class="hf-out-label">Respuesta</div><div class="hf-out-text">${escape(o.reply)}</div></div>` : ''}
    ${
      slides.length
        ? `
      <div class="hf-out-section">
        <div class="hf-out-label">${slides.length} slide${slides.length > 1 ? 's' : ''}</div>
        <div class="hf-slides">
          ${slides.map((sl, idx) => `<div class="hf-slide" data-idx="${idx}"><img src="${escape(sl.dataUrl)}" alt="slide ${sl.n}" loading="lazy" /><span class="hf-slide-tag">${sl.n}</span></div>`).join('')}
        </div>
      </div>`
        : ''
    }
    ${o.publish?.ok ? `<div class="hf-out-section"><div class="hf-out-label">Publicado</div><div class="hf-out-text" style="color:#10F2B0;">✓ ${escape(o.publish.mediaId || 'OK')}</div></div>` : ''}`;

  // Lightbox
  const allSlides = slides;
  const openLB = (startIdx) => {
    let i = startIdx;
    const ov = document.createElement('div');
    ov.className = 'hf-lightbox';
    const render = () => {
      const sl = allSlides[i];
      if (!sl) return;
      ov.innerHTML = `<button class="hf-lb-close">✕</button><button class="hf-lb-nav hf-lb-prev" ${i === 0 ? 'disabled' : ''}>‹</button><div class="hf-lb-stage"><img src="${escape(sl.dataUrl)}" /><div class="hf-lb-meta">Slide ${sl.n} / ${allSlides.length}</div></div><button class="hf-lb-nav hf-lb-next" ${i === allSlides.length - 1 ? 'disabled' : ''}>›</button><a class="hf-lb-dl" href="${escape(sl.dataUrl)}" download="hf-slide-${sl.n}.svg">⬇ Descargar</a>`;
      ov.querySelector('.hf-lb-close').onclick = () => ov.remove();
      ov.querySelector('.hf-lb-prev').onclick = () => {
        if (i > 0) {
          i--;
          render();
        }
      };
      ov.querySelector('.hf-lb-next').onclick = () => {
        if (i < allSlides.length - 1) {
          i++;
          render();
        }
      };
    };
    ov.addEventListener('click', (ev) => {
      if (ev.target === ov) ov.remove();
    });
    document.addEventListener('keydown', function onKey(ev) {
      if (!document.body.contains(ov)) {
        document.removeEventListener('keydown', onKey);
        return;
      }
      if (ev.key === 'Escape') ov.remove();
      if (ev.key === 'ArrowLeft' && i > 0) {
        i--;
        render();
      }
      if (ev.key === 'ArrowRight' && i < allSlides.length - 1) {
        i++;
        render();
      }
    });
    render();
    document.body.appendChild(ov);
  };
  host
    .querySelectorAll('.hf-slide')
    .forEach((el) => el.addEventListener('click', () => openLB(parseInt(el.dataset.idx, 10) || 0)));
};

// Web Speech API (gratis, browser nativo) — STT continuo con wake word
const setupVoice = (root) => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    root.querySelector('#hf-mic')?.setAttribute('disabled', 'true');
    root.querySelector('#hf-mic').title = 'Voz no disponible en este navegador (probá Chrome)';
    return;
  }
  recognition = new SR();
  recognition.lang = 'es-AR';
  recognition.continuous = true; // siempre escuchando en modo continuo
  recognition.interimResults = true;

  let finalBuffer = '';
  let silenceTimer = null;

  recognition.onresult = (e) => {
    let interim = '';
    let final = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    if (final) finalBuffer += ' ' + final;
    const fullText = (finalBuffer + ' ' + interim).trim();
    const input = root.querySelector('#hf-input');
    if (input) input.value = fullText;

    // Si llega final con wake word → arrancar pipeline
    if (final && WAKE_WORD.test(fullText)) {
      clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        const cleanTxt = stripWakeWord(fullText);
        if (cleanTxt.length > 5) {
          // Saludo inmediato por voz
          speak(greet() + '. Empezando.');
          finalBuffer = '';
          if (input) input.value = cleanTxt;
          execute(root, { spoken: true });
        }
      }, 900); // espera 900ms de silencio para asumir fin de comando
    }
  };

  recognition.onend = () => {
    if (continuousMode) {
      // Reiniciar auto
      try { recognition.start(); } catch {}
    } else {
      listening = false;
      root.querySelector('#hf-mic')?.classList.remove('listening');
    }
  };
  recognition.onerror = (e) => {
    if (e.error === 'no-speech' || e.error === 'aborted') return;
    listening = false;
    continuousMode = false;
    root.querySelector('#hf-mic')?.classList.remove('listening');
    toast(`Voz: ${e.error || 'error'}`, 'warn');
  };

  // Pre-cargar voices
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = () => { preferredVoice = pickVoice(); };
    setTimeout(() => { preferredVoice = pickVoice(); }, 200);
  }
};

const execute = async (root, { spoken = false } = {}) => {
  const input = root.querySelector('#hf-input');
  const goBtn = root.querySelector('#hf-go');
  const autoPub = Boolean(root.querySelector('#hf-autopublish')?.checked);
  const rawTxt = (input?.value || '').trim();
  const txt = stripWakeWord(rawTxt);
  if (!txt) {
    if (spoken) speak('No te escuché bien. Repetí, por favor.');
    else toast('Escribí o dictá qué querés que haga', 'warn');
    return;
  }
  log = [{ at: 0, icon: '🎙️', text: `Vos: "${txt}"`, status: 'done' }];
  renderTimeline(root);
  goBtn.disabled = true;
  goBtn.textContent = '⏳ Procesando…';

  // Si tarea creativa → auto-activar Computer Use para visualización
  if (isCreativeTask(txt)) {
    log.push({ at: 1, icon: '🤖', text: 'Activando Computer Use para visualizar la creación…', status: 'done' });
    renderTimeline(root);
    void tryActivateCU();
    if (spoken) speak(`${greet()}. Activé el modo automático y empiezo el carrusel.`, { interrupt: true });
  } else if (spoken) {
    speak(`${greet()}. Procesando.`);
  }

  try {
    // Account context — lee localStorage si existe
    let accountId = '';
    try {
      accountId = JSON.parse(localStorage.getItem('feedia.brujula.account') || '{}').handle || '';
    } catch {}
    const platform = await getPlatform();
    const r = await fetch('/api/handsfree/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: txt, accountId, platform, autoPublish: autoPub, goal: 'engagement' }),
    });
    const j = await r.json();
    if (!j.ok) {
      log.push({
        at: 0,
        icon: '✗',
        text: j.message || j.error || 'Error desconocido',
        status: 'fail',
      });
      renderTimeline(root);
      if (spoken) speak('Hubo un problema. ' + (j.message || j.error || 'reintenta'));
      return;
    }
    // Merge timeline backend con narración por voz de pasos clave
    (j.timeline || []).forEach((ev, idx) => {
      log.push(ev);
      // Narrar solo eventos importantes (no todos)
      if (spoken && idx < 4 && ev.text && ev.status !== 'fail') {
        // Solo el primero y un par de hitos
        if (idx === 1 || /carrusel|reel|publicado|listo/i.test(ev.text)) {
          setTimeout(() => speak(ev.text.replace(/[…✓✗🎨🧠🤖💬📊]/g, '').trim().slice(0, 120)), idx * 800);
        }
      }
    });
    renderTimeline(root);
    lastResult = j;
    renderOutput(root, j);

    // Resumen final por voz
    if (spoken) {
      const o = j.output || {};
      const slidesN = (o.carouselSlides || []).length;
      const hook = o.content?.hook || '';
      let summary = userName ? `Listo ${userName}. ` : 'Listo. ';
      if (slidesN) summary += `Generé ${slidesN} slides. El hook dice: ${hook}`;
      else if (o.reply) summary += `Te preparé la respuesta.`;
      else if (j.action) summary += `Acción ${j.action} completada.`;
      else summary += 'Revisa el resultado abajo.';
      setTimeout(() => speak(summary), 1200);
    }
  } catch (err) {
    log.push({ at: 0, icon: '✗', text: `Error de red: ${err?.message || 'sin respuesta'}`, status: 'fail' });
    renderTimeline(root);
    if (spoken) speak('Error de red. Volvé a probar.');
  } finally {
    goBtn.disabled = false;
    goBtn.textContent = '▶ Ejecutar';
  }
};

export const renderHandsFree = async (container, { navigate } = {}) => {
  const platform = await getPlatform();
  container.innerHTML = renderShell(platform);
  await Promise.all([loadUserName(), checkElevenLabs()]);
  setupVoice(container);
  renderTimeline(container);
  renderOutput(container, lastResult);

  // Saludo inicial por voz (silencioso si TTS está off por user)
  setTimeout(() => {
    if (voiceEnabled) {
      const hello = userName
        ? `Hola ${userName}. Activá el modo manos libres tocando el oído arriba. O decime "Feedia" y tu pedido.`
        : 'Hola. Activá el modo manos libres tocando el oído arriba. O decime "Feedia" y tu pedido.';
      speak(hello, { interrupt: false });
    }
  }, 600);

  // Botón cerrar (volver a Hola FeedIA)
  container.querySelector('#hf-close')?.addEventListener('click', () => {
    stopSpeaking();
    navigate?.('feed') || (window.location.hash = '#feed');
  });

  container.querySelector('#hf-go')?.addEventListener('click', () => execute(container));
  container.querySelector('#hf-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      execute(container);
    }
  });

  // Mic toggle simple (dictado puntual)
  container.querySelector('#hf-mic')?.addEventListener('click', () => {
    if (!recognition) return;
    if (listening) {
      try { recognition.stop(); } catch {}
      continuousMode = false;
      return;
    }
    try {
      continuousMode = false;
      recognition.start();
      listening = true;
      container.querySelector('#hf-mic').classList.add('listening');
    } catch (e) {
      toast(`No pude activar el mic: ${e?.message || ''}`, 'warn');
    }
  });

  // 👂 modo siempre escuchando (wake word "feedia")
  const alwaysBtn = container.querySelector('#hf-always');
  alwaysBtn?.addEventListener('click', () => {
    if (!recognition) return;
    continuousMode = !continuousMode;
    alwaysBtn.classList.toggle('active', continuousMode);
    alwaysBtn.style.background = continuousMode ? 'linear-gradient(135deg,#10F2B0,#3B82F6)' : '';
    alwaysBtn.style.color = continuousMode ? '#0A0A0F' : '';
    if (continuousMode) {
      try { recognition.start(); listening = true; container.querySelector('#hf-mic').classList.add('listening'); } catch {}
      speak(userName ? `Modo manos libres activado ${userName}. Decime "Feedia" y tu pedido.` : 'Modo manos libres activado. Decime "Feedia" y tu pedido.');
      toast('👂 Escuchando siempre. Decí "Feedia" + comando.', 'ok');
    } else {
      try { recognition.stop(); } catch {}
      listening = false;
      container.querySelector('#hf-mic').classList.remove('listening');
      stopSpeaking();
      toast('👂 Modo continuo desactivado', 'info');
    }
  });

  // 🔊 TTS on/off
  const ttsBtn = container.querySelector('#hf-tts');
  ttsBtn?.addEventListener('click', () => {
    voiceEnabled = !voiceEnabled;
    ttsBtn.textContent = voiceEnabled ? '🔊' : '🔇';
    ttsBtn.title = voiceEnabled ? 'Voz ON · click para silenciar' : 'Voz OFF · click para activar';
    if (!voiceEnabled) stopSpeaking();
    else speak('Voz activada');
  });

  container.querySelector('#hf-clear')?.addEventListener('click', () => {
    log = [];
    lastResult = null;
    renderTimeline(container);
    renderOutput(container, null);
  });

  // ⚙️ ElevenLabs config
  const cfgPanel = container.querySelector('#hf-cfg-panel');
  const cfgBtn = container.querySelector('#hf-cfg');
  cfgBtn?.addEventListener('click', () => { cfgPanel.open = !cfgPanel.open; });
  const elStatus = container.querySelector('#hf-el-status');
  const updateElStatusUI = () => {
    if (!elStatus) return;
    elStatus.textContent = elevenLabsActive ? '✓ ElevenLabs activo' : '○ usando voz nativa del browser';
    elStatus.style.color = elevenLabsActive ? '#10F2B0' : '#9CA3AF';
  };
  updateElStatusUI();
  container.querySelector('#hf-el-save')?.addEventListener('click', async (e) => {
    const key = container.querySelector('#hf-el-key')?.value.trim();
    const voiceId = container.querySelector('#hf-el-voice')?.value;
    if (!key) { toast('Pegá tu API key primero', 'warn'); return; }
    e.target.disabled = true; e.target.textContent = '⏳';
    try {
      const r = await fetch('/api/voice/elevenlabs/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: key, voiceId }) });
      const j = await r.json();
      if (j.ok) {
        await checkElevenLabs();
        updateElStatusUI();
        toast('✓ Voz premium guardada', 'ok');
        container.querySelector('#hf-el-key').value = '';
        speak(userName ? `Listo ${userName}. Voz premium activa.` : 'Listo. Voz premium activa.');
      } else toast('Error al guardar', 'err');
    } catch { toast('Error de red', 'err'); }
    finally { e.target.disabled = false; e.target.textContent = 'Guardar key'; }
  });
  container.querySelector('#hf-el-test')?.addEventListener('click', () => {
    speak(userName ? `Hola ${userName}, así suena mi voz premium.` : 'Hola, así suena mi voz premium.');
  });
  container.querySelector('#hf-el-clear')?.addEventListener('click', async () => {
    try {
      await fetch('/api/voice/elevenlabs/key', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ apiKey: '' }) });
      elevenLabsActive = false;
      updateElStatusUI();
      toast('Key removida · usando voz nativa', 'info');
    } catch {}
  });

  // Limpia voz al salir de la vista
  window.addEventListener('hashchange', () => { stopSpeaking(); continuousMode = false; try { recognition?.stop(); } catch {} }, { once: true });
};
