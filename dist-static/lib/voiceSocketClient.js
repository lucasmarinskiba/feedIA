/**
 * Voice Socket Client — WebSocket bidireccional para voz en tiempo real
 * ─────────────────────────────────────────────────────────────────────────
 * Conecta al servidor vía WebSocket (`ws://host/ws/voice`) para:
 *   • Enviar chunks de audio PCM 16kHz mono
 *   • Recibir resultados STT en tiempo real
 *   • Recibir respuestas TTS habladas del servidor
 *   • Detección de wake word server-side
 *
 * Reemplaza el polling HTTP por streaming continuo.
 */

const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/voice`;

let ws = null;
let reconnectTimer = null;
let sessionId = null;
let messageHandlers = [];
let isConnecting = false;

/* ── Connection ──────────────────────────────────────────────────────────── */

export const connectVoiceSocket = () => {
  if (ws || isConnecting) return Promise.resolve({ ok: true });
  isConnecting = true;

  return new Promise((resolve) => {
    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        isConnecting = false;
        resolve({ ok: true });
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          for (const h of messageHandlers) h(msg);
        } catch {
          /* ignore non-JSON */
        }
      };

      ws.onclose = () => {
        ws = null;
        isConnecting = false;
        // Auto-reconnect after 2s
        reconnectTimer = setTimeout(() => connectVoiceSocket(), 2000);
      };

      ws.onerror = () => {
        isConnecting = false;
        resolve({ ok: false, error: 'WebSocket error' });
      };
    } catch (err) {
      isConnecting = false;
      resolve({ ok: false, error: err.message });
    }
  });
};

export const disconnectVoiceSocket = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.close();
    ws = null;
  }
};

export const isVoiceSocketConnected = () => ws && ws.readyState === WebSocket.OPEN;

/* ── Message API ─────────────────────────────────────────────────────────── */

const send = (msg) => {
  if (isVoiceSocketConnected()) ws.send(JSON.stringify(msg));
};

export const sendAudioChunk = (base64Pcm) => {
  send({ type: 'audio_chunk', sessionId, data: base64Pcm });
};

export const sendCommand = (transcript) => {
  send({ type: 'command', sessionId, transcript });
};

export const startWakeMode = () => {
  send({ type: 'start_wake', sessionId });
};

export const stopWakeMode = () => {
  send({ type: 'stop_wake', sessionId });
};

/* ── Handler Registration ────────────────────────────────────────────────── */

export const onVoiceMessage = (handler) => {
  messageHandlers.push(handler);
  return () => {
    messageHandlers = messageHandlers.filter((h) => h !== handler);
  };
};

/* ── Status ──────────────────────────────────────────────────────────────── */

export const getVoiceSocketStatus = () => ({
  connected: isVoiceSocketConnected(),
  sessionId,
  url: WS_URL,
});
