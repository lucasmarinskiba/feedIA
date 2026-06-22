/**
 * ElevenLabs TTS — voz premium (opt-in, BYOK).
 *
 * Usuario pega su API key en /settings → se guarda en KV → handsfree usa TTS ElevenLabs
 * en lugar del browser nativo. Si no hay key → fallback automático al speechSynthesis.
 *
 * Costo: $5/mes mínimo de ElevenLabs (10k chars). FeedIA NO paga, el user usa SU key.
 *
 * Endpoints:
 *   POST /api/voice/elevenlabs/key  → guarda/borra key (body: {apiKey, voiceId?})
 *   GET  /api/voice/elevenlabs/status → tiene key configurada?
 *   GET  /api/voice/elevenlabs/voices → lista voces disponibles para esa key
 *   POST /api/voice/elevenlabs/speak  → genera audio MP3 (body: {text, voiceId?}) → bytes
 */

import * as store from './_store.js';

const ELEVEN_BASE = 'https://api.elevenlabs.io/v1';
const KEY_KEY = (scope) => `feedia:voice:el:${scope || 'anon'}:cfg`;

const getCfg = async (scope) => {
  try { return await store.get(KEY_KEY(scope)); } catch { return null; }
};
const setCfg = async (scope, cfg) => {
  try { await store.set(KEY_KEY(scope), cfg); } catch {}
};

// Voces ES recomendadas (multilingual v2 las soporta)
const DEFAULT_VOICES_ES = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella · ES neutro · cálida' },
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam · ES neutro · masculina' },
  { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte · ES · profesional' },
  { id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel · ES · narrativa' },
];

export const elStatus = async (scope) => {
  const cfg = await getCfg(scope);
  return {
    configured: Boolean(cfg?.apiKey),
    voiceId: cfg?.voiceId || DEFAULT_VOICES_ES[0].id,
    voicesPreset: DEFAULT_VOICES_ES,
  };
};

export const elListVoices = async (scope) => {
  const cfg = await getCfg(scope);
  if (!cfg?.apiKey) return { error: 'no-key' };
  try {
    const r = await fetch(`${ELEVEN_BASE}/voices`, { headers: { 'xi-api-key': cfg.apiKey } });
    if (!r.ok) return { error: `eleven-${r.status}` };
    const j = await r.json();
    return { ok: true, voices: (j.voices || []).map((v) => ({ id: v.voice_id, name: v.name, lang: v.labels?.language || 'multi' })) };
  } catch (e) { return { error: String(e?.message || e).slice(0, 200) }; }
};

export const elSpeak = async (scope, { text, voiceId }) => {
  const cfg = await getCfg(scope);
  if (!cfg?.apiKey) return { error: 'no-key' };
  if (!text) return { error: 'no-text' };
  const vid = voiceId || cfg.voiceId || DEFAULT_VOICES_ES[0].id;
  try {
    const r = await fetch(`${ELEVEN_BASE}/text-to-speech/${vid}?optimize_streaming_latency=2`, {
      method: 'POST',
      headers: { 'xi-api-key': cfg.apiKey, 'content-type': 'application/json', 'accept': 'audio/mpeg' },
      body: JSON.stringify({
        text: String(text).slice(0, 1200),
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.25, use_speaker_boost: true },
      }),
    });
    if (!r.ok) return { error: `eleven-${r.status}` };
    const buf = Buffer.from(await r.arrayBuffer());
    return { ok: true, mp3: buf, voiceId: vid };
  } catch (e) { return { error: String(e?.message || e).slice(0, 200) }; }
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleElevenLabs = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); return true; };

  if (path === '/api/voice/elevenlabs/status' && m === 'GET') {
    return json(200, await elStatus(scope));
  }
  if (path === '/api/voice/elevenlabs/key' && m === 'POST') {
    if (!body?.apiKey) { await setCfg(scope, null); return json(200, { ok: true, cleared: true }); }
    await setCfg(scope, { apiKey: body.apiKey, voiceId: body.voiceId || DEFAULT_VOICES_ES[0].id, savedAt: new Date().toISOString() });
    return json(200, { ok: true });
  }
  if (path === '/api/voice/elevenlabs/voices' && m === 'GET') {
    return json(200, await elListVoices(scope));
  }
  if (path === '/api/voice/elevenlabs/speak' && m === 'POST') {
    const r = await elSpeak(scope, { text: body?.text || '', voiceId: body?.voiceId });
    if (r.error) return json(400, { error: r.error });
    res.statusCode = 200;
    res.setHeader('content-type', 'audio/mpeg');
    res.setHeader('cache-control', 'no-store');
    res.end(r.mp3);
    return true;
  }
  return false;
};
