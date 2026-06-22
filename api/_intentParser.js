/**
 * Intent Parser — extrae intent estructurado del input libre del usuario.
 *
 * Combina heurística regex (rápida, $0) + 1 LLM call de fallback si ambigüo.
 *
 * Devuelve:
 *   {
 *     action: 'create' | 'respond' | 'publish' | 'analyze' | 'edit' | 'unknown',
 *     format: 'carousel' | 'reel' | 'story' | 'tiktok' | 'post' | null,
 *     platform: 'instagram' | 'tiktok' | 'sala' | null,
 *     topic: '...',
 *     constraints: {
 *       slideCount?: 5,
 *       textColor?: '#FFF',
 *       bgColor?: '#000',
 *       accentColor?: '#10F2B0',
 *       mood?: 'premium',
 *       style?: 'editorial',
 *       hookOverride?: '...',
 *       useTemplate?: 'canva' | 'capcut' | 'auto',
 *     },
 *     useCanva: bool,    // user pidió explícitamente plantilla Canva
 *     useCapCut: bool,   // user pidió capcut
 *     literal: true|false,  // true si user fue muy preciso → respetar literal
 *     confidence: 0.0..1.0,
 *   }
 */

import { askLLMJson } from './_llm.js';

const COLOR_MAP = {
  negro: '#0A0A0F', blanco: '#FFFFFF', gris: '#6B7280',
  azul: '#3B82F6', celeste: '#38BDF8', verde: '#10B981', menta: '#10F2B0',
  rojo: '#EF4444', naranja: '#F59E0B', amarillo: '#FACC15', dorado: '#D4AF37',
  rosa: '#EC4899', violeta: '#A855F7', morado: '#A855F7', purpura: '#A855F7',
  cyan: '#22D3EE', magenta: '#FF00FF', beige: '#F5DEB3', marron: '#92400E',
};

const heuristicParse = (raw) => {
  const txt = (raw || '').toLowerCase();

  // Action (sin \b para soportar tildes — usa lookahead simple)
  let action = 'unknown';
  if (/(?:^|\W)(hac[eé]|crea[rsl]?|gener[ae]|arm[áa]|dise[ñn]á?|hacer|quiero|necesito|dame)/i.test(txt)) action = 'create';
  else if (/(?:^|\W)(responde[r]?|contesta[r]?|repli|contesta)/.test(txt)) action = 'respond';
  else if (/(?:^|\W)(publica[rd]?|subir|postear|publi)/.test(txt)) action = 'publish';
  else if (/(?:^|\W)(anali[sz]a[r]?|estudia[r]?|investig)/.test(txt)) action = 'analyze';
  else if (/(?:^|\W)(edita[r]?|cambia[r]?|modif|ajusta)/.test(txt)) action = 'edit';

  // Format
  let format = null;
  if (/carrusel|carousel|slides?/.test(txt)) format = 'carousel';
  else if (/reel/.test(txt) && !/tiktok/.test(txt)) format = 'reel';
  else if (/historia|stories|story\b/.test(txt)) format = 'story';
  else if (/tiktok|tik tok|tt\b/.test(txt)) format = 'tiktok';
  else if (/\bpost\b|publicaci[oó]n/.test(txt)) format = 'post';

  // Platform
  let platform = null;
  if (/instagram|\big\b/.test(txt)) platform = 'instagram';
  else if (/tiktok|tik tok/.test(txt)) platform = 'tiktok';
  else if (/linkedin|sala|b2b|ejecutiv/.test(txt)) platform = 'sala';

  // Slide count
  const slideMatch = txt.match(/(\d+)\s*(?:slides?|diapositiv)/);
  const slideCount = slideMatch ? Math.max(3, Math.min(10, parseInt(slideMatch[1], 10))) : null;

  // Colors
  const constraints = {};
  for (const [name, hex] of Object.entries(COLOR_MAP)) {
    const rx = new RegExp(`\\b${name}\\b`, 'i');
    if (rx.test(txt)) {
      if (!constraints.bgColor) constraints.bgColor = hex;
      else if (!constraints.accentColor) constraints.accentColor = hex;
      else if (!constraints.textColor) constraints.textColor = hex;
    }
  }
  // Hex directo
  const hexMatches = txt.match(/#[0-9a-f]{6}/gi);
  if (hexMatches) {
    if (!constraints.bgColor) constraints.bgColor = hexMatches[0];
    if (hexMatches[1] && !constraints.accentColor) constraints.accentColor = hexMatches[1];
  }

  // Mood / estilo
  const moodKw = {
    premium: /premium|elegante|lujoso/i, brutal: /brutal|fuerte|impacto/i,
    editorial: /editorial|revista/i, minimalista: /minimal|simple|limpio/i,
    luxury: /luxury|dorado|oro/i, monochrome: /monocrom|blanco y negro|b\/n/i,
    techno: /techno|neon|cyber|futur/i, organico: /orgánico|natural|tierra/i,
    pastel: /pastel|suave|claro/i,
  };
  for (const [m, rx] of Object.entries(moodKw)) {
    if (rx.test(txt)) { constraints.mood = m; break; }
  }

  // Plantillas explícitas
  const useCanva = /canva|plantilla canva/i.test(txt);
  const useCapCut = /capcut|cap cut/i.test(txt);

  // Hook explícito ("con el título X" o "que diga X")
  const hookMatch = raw.match(/(?:t[ií]tulo|hook|que diga|frase)[:\s"'`]+([^."\n]{5,80})/i);
  if (hookMatch) constraints.hookOverride = hookMatch[1].trim();

  // Topic = limpiar comandos. Extrae "sobre X" o "de X" si existe
  let topic = raw;
  const aboutMatch = raw.match(/\bsobre\s+([^,.]+?)(?:\s+con|\s+para|\s+de\s+\d|[,.\n]|$)/i);
  if (aboutMatch) {
    topic = aboutMatch[1].trim();
  } else {
    topic = raw
      .replace(/feedia[,!?:\s]+/gi, '')
      .replace(/(?:^|\W)(hac[eé]|crea[rsl]?|gener[ae]|arm[áa]|dise[ñn]á?|hacer|quiero|necesito|dame|responde[r]?|publica[rd]?)\s/gi, ' ')
      .replace(/\b(un|una|el|la|los|las|para|sobre|de|en|con|que|y|o)\b/gi, ' ')
      .replace(/\b(instagram|ig|tiktok|tt|reel|reels|carrusel|carousel|historia|stories|story|post|tiktoks)\b/gi, '')
      .replace(/\b\d+\s*(slides?|diapositiv)\b/gi, '')
      .replace(/colores?\s+[a-zñáéíóú,\s]+(premium|elegante|brutal|minimal|editorial|luxury|monocrom|techno|orgán|pastel|neon)?/gi, '')
      .replace(/#[0-9a-f]{6}/gi, '')
      .replace(/\s+/g, ' ').trim();
  }

  if (slideCount) constraints.slideCount = slideCount;

  // Literal: user dio constraints concretos → respetar
  const constraintCount = Object.keys(constraints).length;
  const literal = constraintCount >= 2 || Boolean(hookMatch) || Boolean(slideCount);

  // Confidence
  let confidence = 0;
  if (action !== 'unknown') confidence += 0.3;
  if (format) confidence += 0.25;
  if (platform) confidence += 0.15;
  if (topic.length > 3) confidence += 0.2;
  if (constraintCount > 0) confidence += 0.1;

  return {
    action, format, platform, topic,
    constraints, useCanva, useCapCut, literal,
    confidence: Math.min(1, confidence),
    raw,
  };
};

// Si confidence baja → enriquecer con LLM
const llmEnrich = async (raw, partial) => {
  const prompt = `Sos parser de intent para sistema de creación de contenido social.
Input del usuario (puede ser en español, voz transcrita): "${raw}"
Parseo heurístico previo: ${JSON.stringify(partial)}

Devolvé SOLO JSON enriquecido (NO inventes — si no hay info, dejá null):
{
  "action": "create" | "respond" | "publish" | "analyze" | "edit",
  "format": "carousel" | "reel" | "story" | "tiktok" | "post" | null,
  "platform": "instagram" | "tiktok" | "sala" | null,
  "topic": "tema central limpio (sin comandos)",
  "constraints": {
    "slideCount": null | número,
    "mood": "premium|editorial|minimalista|brutal|luxury|monochrome|techno|organico|pastel" | null,
    "hookOverride": "texto exacto si user lo pidió" | null,
    "tone": "didáctico|vendedor|humorista|inspirador|autoridad" | null
  },
  "literal": true | false,
  "userExpectation": "1 frase describiendo qué espera ver el usuario (para confirmar)"
}`;
  try {
    const out = await askLLMJson(prompt);
    if (out && typeof out === 'object') return { ...partial, ...out, constraints: { ...partial.constraints, ...(out.constraints || {}) } };
  } catch {}
  return partial;
};

export const parseIntent = async (raw, { useLLM = true } = {}) => {
  const partial = heuristicParse(raw || '');
  if (!useLLM || partial.confidence >= 0.7) return partial;
  return await llmEnrich(raw, partial);
};

// ── HTTP handler ─────────────────────────────────────────────────────────────
export const handleIntentParser = async (req, res, path, m, body) => {
  const json = (code, obj) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(obj)); return true; };
  if (path === '/api/intent/parse' && m === 'POST') {
    try {
      const result = await parseIntent(body?.input || '', { useLLM: body?.useLLM !== false });
      return json(200, { ok: true, intent: result });
    } catch (e) { return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) }); }
  }
  return false;
};
