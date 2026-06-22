/* ══════════════════════════════════════════════════════════════════════════════
   voiceUI.js — Wires the voice engine to the overlay UI + app navigation
   ──────────────────────────────────────────────────────────────────────────────
   Responsibilities:
     • Manage the full-screen overlay lifecycle (open/close/state)
     • Drive the orb animation states
     • Send transcripts to /api/voice/command and act on the returned action
       (navigate / launch mission / chat) while FeedIA speaks the reply
     • Maintain a short rolling conversation history for context
   ══════════════════════════════════════════════════════════════════════════════ */

import { api } from './api.js';
import { t, getLang, onLangChange } from './i18n.js';
import {
  initVoice,
  isSupported,
  startWakeLoop,
  stopWakeLoop,
  captureCommand,
  cancelCommand,
  speak,
  stopSpeaking,
  getConfig,
  isWakeActive,
} from './voice.js';

// ── Optional advanced engines (lazy-loaded) ────────────────────────────────
let porcupineAvailable = false;
let whisperAvailable = false;
let usePorcupine = false;
let useWhisper = false;

const loadAdvancedEngines = async () => {
  try {
    const [{ initPorcupine, isPorcupineAvailable }, { initWhisperWeb, isWhisperWebAvailable }] = await Promise.all([
      import('./porcupineWake.js'),
      import('./whisperWeb.js'),
    ]);
    porcupineAvailable = isPorcupineAvailable();
    whisperAvailable = isWhisperWebAvailable();
  } catch {
    /* engines not available */
  }
};

let els = {};
let history = []; // [{role:'user'|'assistant', content}]
let navigateFn = () => {}; // injected from app.js
let opened = false;

const $ = (id) => document.getElementById(id);

const setState = (state, detail) => {
  const orb = els.orb;
  if (orb) {
    orb.classList.remove('is-wake', 'is-listening', 'is-processing', 'is-speaking', 'is-error');
    if (state !== 'idle') orb.classList.add(`is-${state}`);
  }
  if (els.stateLabel) {
    const map = {
      idle: t('voice.idle'),
      wake: t('voice.idle'),
      listening: t('voice.listening'),
      processing: t('voice.processing'),
      speaking: t('voice.speaking'),
      error: detail === 'mic-denied' ? t('voice.micDenied') : t('voice.notSupported'),
    };
    els.stateLabel.textContent = map[state] ?? t('voice.idle');
  }
};

const renderSuggestions = () => {
  if (!els.suggestions) return;
  const items = [t('voice.s1'), t('voice.s2'), t('voice.s3'), t('voice.s4')];
  els.suggestions.innerHTML =
    `<div class="voice-sugg-title">${t('voice.suggestions')}</div>` +
    items.map((s) => `<button class="voice-sugg-chip">${s}</button>`).join('');
  els.suggestions.querySelectorAll('.voice-sugg-chip').forEach((chip) => {
    chip.addEventListener('click', () => handleTranscript(chip.textContent));
  });
};

const LS_MIC = 'feedia.voice.micGranted';
const hasMicGrant = () => localStorage.getItem(LS_MIC) === '1';
const markMicGrant = () => {
  try {
    localStorage.setItem(LS_MIC, '1');
  } catch {
    /* ignore */
  }
};

// Request mic permission explicitly so the browser shows a clear dialog.
// Must be called from inside a user-gesture handler (click/tap).
const ensureMicPermission = async () => {
  if (hasMicGrant()) return true;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((t) => t.stop()); // release immediately — SpeechRecognition manages its own stream
    markMicGrant();
    return true;
  } catch {
    return false;
  }
};

export const openVoiceOverlay = async (greet = true) => {
  if (!els.overlay) return;

  // Close chatbot panel if open (prevent overlap)
  window.closeChatbotPanel?.();

  // On first open: request mic permission and auto-arm wake loop if granted.
  if (!hasMicGrant()) {
    const granted = await ensureMicPermission();
    if (granted && !isWakeActive()) {
      startWakeLoop();
      reflectFab();
    }
    if (!granted) {
      // Show brief inline error then bail — can't do anything without mic.
      opened = true;
      els.overlay.classList.add('open');
      els.overlay.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (els.transcript)
        els.transcript.innerHTML =
          '<span style="color:#fca5a5;font-size:14px;">❌ Permiso de micrófono denegado.<br>Habilitalo en la configuración del navegador y recargá la página.</span>';
      setState('error', 'mic-denied');
      return;
    }
  }

  opened = true;
  els.overlay.classList.add('open');
  els.overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  if (els.transcript) els.transcript.textContent = '';
  renderSuggestions();
  setState('idle');

  if (!greet) {
    // No greeting — jump straight into listening.
    setState('listening');
    captureCommand();
  } else if (greet === 'wake') {
    // Wake-word triggered: short ack so user knows FeedIA heard them.
    if (getConfig().ttsEnabled) {
      setState('speaking');
      speak('Dime.').then(() => {
        if (opened) {
          setState('listening');
          captureCommand();
        }
      });
    } else {
      setState('listening');
      captureCommand();
    }
  } else {
    // Manual open (FAB tap): full contextual greeting.
    if (getConfig().ttsEnabled) {
      setState('speaking');
      speak(t('voice.greeting')).then(() => {
        if (opened) {
          setState('listening');
          captureCommand();
        }
      });
    } else {
      setState('listening');
      captureCommand();
    }
  }
};

export const closeVoiceOverlay = () => {
  opened = false;
  if (els.overlay) {
    els.overlay.classList.remove('open');
    els.overlay.setAttribute('aria-hidden', 'true');
  }
  document.body.style.overflow = '';
  cancelCommand();
  setState('idle');
};

const handleTranscript = async (text) => {
  if (!text || !text.trim()) {
    setState('idle');
    return;
  }
  // Interrupt any ongoing TTS when user speaks
  stopSpeaking();
  history.push({ role: 'user', content: text });
  if (els.transcript) els.transcript.innerHTML = `<span class="voice-tx-user">${escapeHtml(text)}</span>`;
  setState('processing');

  try {
    const r = await api('/api/voice/command', {
      method: 'POST',
      body: { transcript: text, lang: getLang(), history: history.slice(-6) },
    });

    const spoken = r.spokenReply || r.reply || '';
    history.push({ role: 'assistant', content: r.reply || spoken });
    if (els.transcript) {
      els.transcript.innerHTML =
        `<span class="voice-tx-user">${escapeHtml(text)}</span>` +
        `<span class="voice-tx-feedia">${escapeHtml(spoken)}</span>`;
    }

    // Speak first; then perform the action so the user hears confirmation.
    setState('speaking');
    await speak(spoken);

    const act = r.action || { type: 'none' };
    if (act.type === 'navigate' && act.route) {
      closeVoiceOverlay();
      navigateFn(act.route);
      return;
    }
    if (act.type === 'mission' && act.freeIntent) {
      try {
        await api('/api/missions/launch', {
          method: 'POST',
          body: { freeIntent: act.freeIntent, runNow: true },
        });
      } catch {
        /* non-blocking */
      }
      closeVoiceOverlay();
      navigateFn('mission');
      return;
    }
    // chat / none → stay in overlay, listen again for follow-up.
    if (opened) {
      setState('listening');
      captureCommand();
    }
  } catch (err) {
    if (els.transcript) {
      els.transcript.innerHTML += `<span class="voice-tx-feedia">${t('voice.didntCatch')}</span>`;
    }
    setState('speaking');
    await speak(t('voice.didntCatch'));
    if (opened) {
      setState('listening');
      captureCommand();
    }
  }
};

const escapeHtml = (s) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export const initVoiceUI = ({ navigate }) => {
  navigateFn = navigate;
  els = {
    overlay: $('voice-overlay'),
    orb: $('voice-orb'),
    stateLabel: $('voice-state-label'),
    transcript: $('voice-transcript'),
    suggestions: $('voice-suggestions'),
    fab: $('voice-fab'),
    close: $('voice-close'),
    micBtn: $('voice-mic-btn'),
    micLabel: $('voice-mic-label'),
    wakeToggle: $('voice-wake-toggle'),
    wakeIcon: $('voice-wake-icon'),
    wakeLabel: $('voice-wake-label'),
  };

  if (!els.overlay) return;

  // Hide the FAB entirely if speech recognition is unavailable.
  if (!isSupported()) {
    if (els.fab) els.fab.style.display = 'none';
  }

  initVoice({
    onWake: () => {
      if (!opened) openVoiceOverlay('wake');
    },
    onState: (s, d) => setState(s, d),
    onPartial: (txt) => {
      if (els.transcript) {
        els.transcript.innerHTML = `<span class="voice-tx-user voice-tx-interim">${escapeHtml(txt)}</span>`;
      }
    },
    onCommand: handleTranscript,
    onError: (kind) => setState('error', kind),
  });

  // Load advanced engines in background
  void loadAdvancedEngines();

  // Reflect wake state on FAB + toggle button.
  const reflectFab = () => {
    const armed = isWakeActive();
    if (els.fab) els.fab.classList.toggle('is-armed', armed);
    if (els.wakeToggle) els.wakeToggle.classList.toggle('is-armed', armed);
    if (els.wakeIcon) els.wakeIcon.textContent = armed ? '🔴' : '🎤';
    if (els.wakeLabel) els.wakeLabel.textContent = armed ? 'En escucha — di "Hola FeedIA"' : 'Activar "Hola FeedIA"';
  };
  reflectFab();

  // WebSocket streaming integration
  let useWebSocket = false;
  const initWebSocket = async () => {
    const { connectVoiceSocket, onVoiceMessage } = await import('./voiceSocketClient.js');
    const r = await connectVoiceSocket();
    if (!r.ok) return;
    useWebSocket = true;
    onVoiceMessage((msg) => {
      if (msg.type === 'command_result') {
        if (els.transcript) {
          els.transcript.innerHTML =
            `<span class="voice-tx-user">${escapeHtml(msg.transcript || '')}</span>` +
            `<span class="voice-tx-feedia">${escapeHtml(msg.response || '')}</span>`;
        }
        setState('speaking');
        speak(msg.response || '').then(() => {
          if (opened) {
            setState('listening');
            captureCommand();
          }
        });
      }
      if (msg.type === 'tts_start') setState('speaking', msg.text);
      if (msg.type === 'tts_end') {
        if (opened) {
          setState('listening');
          captureCommand();
        }
      }
      if (msg.type === 'error') setState('error', msg.message);
    });
  };
  void initWebSocket();

  // Load custom Porcupine keywords from server
  const loadCustomKeywords = async () => {
    try {
      const r = await api('/api/voice/custom-wake-words');
      return r.wakeWords?.filter((w) => w.active && w.type === 'porcupine') ?? [];
    } catch {
      return [];
    }
  };

  // Inicializar el namespace ANTES de asignarle métodos (sino TypeError y se rompe todo initVoiceUI)
  window.__feediaVoice = window.__feediaVoice || {};

  // Expose engine toggles
  window.__feediaVoice.enablePorcupine = async () => {
    if (!porcupineAvailable) return { ok: false, error: 'Porcupine no disponible' };
    const { initPorcupine, startPorcupineWake, setDetectionCallback } = await import('./porcupineWake.js');
    const customKeywords = await loadCustomKeywords();
    const r = await initPorcupine({ accessKey: window.__env?.PORCUPINE_ACCESS_KEY, customKeywords });
    if (!r.ok) return r;
    setDetectionCallback(() => {
      if (!opened) openVoiceOverlay(true);
    });
    await startPorcupineWake();
    usePorcupine = true;
    return { ok: true };
  };
  window.__feediaVoice.enableWhisper = async () => {
    if (!whisperAvailable) return { ok: false, error: 'Whisper Web no disponible' };
    const { initWhisperWeb } = await import('./whisperWeb.js');
    const r = await initWhisperWeb();
    if (!r.ok) return r;
    useWhisper = true;
    return { ok: true };
  };
  window.__feediaVoice.getEngineStatus = () => ({
    porcupine: usePorcupine,
    whisper: useWhisper,
    websocket: useWebSocket,
  });
  window.__feediaVoice.detectedLanguage = 'es'; // Updated by translation pipeline

  // FAB: tap → open overlay / long-press (500ms) → toggle wake loop without opening overlay.
  let fabPressTimer = null;
  els.fab?.addEventListener('pointerdown', () => {
    fabPressTimer = setTimeout(() => {
      fabPressTimer = null;
      if (isWakeActive()) {
        stopWakeLoop();
        reflectFab();
      } else {
        startWakeLoop();
        reflectFab();
      }
    }, 500);
  });
  els.fab?.addEventListener('pointerup', () => {
    if (fabPressTimer) {
      clearTimeout(fabPressTimer);
      fabPressTimer = null;
      if (opened) {
        closeVoiceOverlay();
        return;
      }
      openVoiceOverlay(true);
    }
  });
  els.fab?.addEventListener('pointercancel', () => {
    clearTimeout(fabPressTimer);
    fabPressTimer = null;
  });

  els.close?.addEventListener('click', () => closeVoiceOverlay());
  els.micBtn?.addEventListener('click', () => {
    setState('listening');
    captureCommand();
  });

  // Modo Manos Libres button
  const manosLibresBtn = $('voice-manos-libres-btn');
  manosLibresBtn?.addEventListener('click', () => {
    closeVoiceOverlay();
    navigateFn('handsfree');
  });

  // Wake toggle inside overlay.
  els.wakeToggle?.addEventListener('click', () => {
    if (isWakeActive()) {
      stopWakeLoop();
    } else {
      startWakeLoop(); // triggers browser mic permission dialog if not yet granted
    }
    reflectFab();
  });

  // Escape closes the overlay.
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && opened) closeVoiceOverlay();
  });

  // Re-render labels on language change.
  onLangChange(() => {
    if (els.micLabel) els.micLabel.textContent = t('voice.tapToSpeak');
    if (opened) {
      renderSuggestions();
      setState('idle');
    }
  });
  if (els.micLabel) els.micLabel.textContent = t('voice.tapToSpeak');

  // Expose programmatic control for settings toggles. (NO sobreescribir el objeto,
  // sino asignar campos — porque arriba ya añadimos enablePorcupine/enableWhisper/etc.)
  window.__feediaVoice.enableWake = () => {
    startWakeLoop();
    reflectFab();
  };
  window.__feediaVoice.disableWake = () => {
    stopWakeLoop();
    reflectFab();
  };
  window.__feediaVoice.open = () => openVoiceOverlay(true);

  // Export global close function for chatbot sync
  window.closeVoiceOverlay = closeVoiceOverlay;
};
