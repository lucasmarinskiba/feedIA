/**
 * Workspace real (serverless): Calendario, Pizarra y Simulador conectados al store.
 * Vacío por defecto (sin datos inventados). La IA solo agrega si el usuario lo pide.
 *
 *   GET  /api/scheduler/jobs            → {jobs:[]}  (slots del calendario)
 *   POST /api/calendar/slots            → agrega slot
 *   POST /api/calendar/interpret        → LLM: texto → slot(s)
 *   POST /api/calendar/ai-plan          → LLM: plan de semana → slots
 *   GET/PUT /api/whiteboard             → elementos de la pizarra (persistentes)
 *   GET  /api/whiteboard/boards|templates|oplog
 *   POST /api/whiteboard/snapshot|revert-last|invite
 *   POST /api/simulate                  → LLM: proyección de una directiva
 */
import * as store from './_store.js';
import { askLLM } from './_llm.js';
import { pickAgentsForGoal, agentSystemPrompt } from './_growth-agents.js';
import { heuristicPredict } from './_predictor.js';

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};
const arr = (x) => (Array.isArray(x) ? x : []);
const parseJson = (txt) => {
  if (!txt) return null;
  try {
    return JSON.parse(
      txt
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/```\s*$/i, ''),
    );
  } catch {
    return null;
  }
};

const CAL_KEY = 'feedia:calendar';
const WB_KEY = 'feedia:whiteboard:elements';

export const handleWorkspace = async (req, res, path, m, body, search) => {
  // ── Calendario / scheduler ────────────────────────────────────────────
  if (path === '/api/scheduler/jobs' && m === 'GET') {
    json(res, 200, { jobs: arr(await store.get(CAL_KEY)) });
    return true;
  }
  if (path === '/api/calendar/slots' && m === 'POST') {
    const items = arr(await store.get(CAL_KEY));
    const slot = {
      id: `c_${Date.now()}`,
      titulo: String(body.titulo || body.title || 'Contenido').slice(0, 120),
      formato: body.formato || 'post-imagen',
      tipo: body.tipo || 'publicacion',
      status: body.status || 'borrador',
      scheduledFor: body.scheduledFor || new Date().toISOString(),
      platform: body.platform || 'general',
    };
    const next = [...items, slot].sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    await store.set(CAL_KEY, next);
    json(res, 200, { ok: true, slot });
    return true;
  }
  if ((path === '/api/calendar/interpret' || path === '/api/calendar/ai-plan') && m === 'POST') {
    const isPlan = path.endsWith('ai-plan');
    const prompt = isPlan
      ? `Planificador editorial. Armá una semana de contenido (5-10 slots) para una cuenta. Hoy: ${new Date().toISOString()}. Devolvé SOLO JSON: {"created":[{"titulo":"idea","formato":"reel|carrusel|story|video|foto","status":"borrador","scheduledFor":"ISO futuro","platform":"instagram|tiktok"}]}`
      : `Convertí este texto en slots de calendario. Texto: "${String(body.text || '').slice(0, 400)}". Hoy: ${new Date().toISOString()}. Devolvé SOLO JSON: {"created":[{"titulo":"","formato":"reel|carrusel|story|video|foto|post-imagen","status":"borrador","scheduledFor":"ISO","platform":"instagram|tiktok|general"}]}`;
    const out = parseJson(await askLLM(prompt, { maxTokens: 2500, temperature: 0.6, json: true }));
    if (!out?.created?.length) {
      json(res, 200, { created: [] });
      return true;
    }
    const items = arr(await store.get(CAL_KEY));
    const created = out.created.map((s, k) => ({
      id: `c_${Date.now()}_${k}`,
      titulo: String(s.titulo || 'Contenido').slice(0, 120),
      formato: s.formato || 'post-imagen',
      status: s.status || 'borrador',
      scheduledFor: s.scheduledFor || new Date(Date.now() + (k + 1) * 86400e3).toISOString(),
      platform: s.platform || 'general',
    }));
    const next = [...items, ...created].sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor));
    await store.set(CAL_KEY, next);
    json(res, 200, { created });
    return true;
  }

  // ── Pizarra (whiteboard) ──────────────────────────────────────────────
  if (path === '/api/whiteboard' && m === 'GET') {
    json(res, 200, { board: 'main', name: 'Pizarra', elements: arr(await store.get(WB_KEY)) });
    return true;
  }
  if (path === '/api/whiteboard' && m === 'PUT') {
    await store.set(WB_KEY, arr(body.elements));
    json(res, 200, { ok: true, count: arr(body.elements).length });
    return true;
  }
  if (path === '/api/whiteboard/boards' && m === 'GET') {
    json(res, 200, { activeBoardId: 'main', boards: [{ id: 'main', name: 'Pizarra' }] });
    return true;
  }
  if (path === '/api/whiteboard/templates' && m === 'GET') {
    json(res, 200, []);
    return true;
  }
  if (path.startsWith('/api/whiteboard/templates/') && m === 'GET') {
    json(res, 200, { elements: [] });
    return true;
  }
  if (path === '/api/whiteboard/oplog' && m === 'GET') {
    json(res, 200, []);
    return true;
  }
  if (path.startsWith('/api/whiteboard/') && (m === 'POST' || m === 'PUT')) {
    json(res, 200, { ok: true });
    return true;
  }

  // ── Predictor de publicaciones ────────────────────────────────────────
  if ((path === '/api/predict/instagram' || path === '/api/predict/tiktok') && m === 'POST') {
    const platform = path.endsWith('tiktok') ? 'tiktok' : 'instagram';
    const pred = heuristicPredict({ ...body, platform });
    json(res, 200, pred);
    return true;
  }

  // ── Autopilot gate (Computer Use) ─────────────────────────────────────
  if (path === '/api/autopilot/should-publish' && m === 'POST') {
    if (!body.post?.platform) {
      json(res, 400, { error: 'missing-post-platform' });
      return true;
    }
    const mode = body.mode || 'supervised';
    const threshold = Number(body.threshold ?? 70);
    const viralProbMin = Number(body.viralProbMin ?? 25);
    const failureRiskMax = Number(body.failureRiskMax ?? 10);
    const pred = heuristicPredict(body.post);
    const gates = {
      scoreOk: pred.score >= threshold,
      viralProbOk: pred.viralProbability >= viralProbMin,
      failureRiskOk: pred.failureRiskPct <= failureRiskMax,
    };
    const allOk = gates.scoreOk && gates.viralProbOk && gates.failureRiskOk;
    let decision, rationale, nextAction;
    if (mode === 'off') {
      decision = 'block';
      rationale = 'Autopilot mode=off. Computer Use no publica.';
      nextAction = 'Pasar a mode=supervised o auto para habilitar.';
    } else if (mode === 'supervised') {
      decision = 'queue-for-approval';
      rationale = `Supervisado: el CMO revisa. Score ${pred.score} · viral ${pred.viralProbability}% · flop ${pred.failureRiskPct}%.`;
      nextAction = 'Notificar al CMO con preview + score + fixes.';
    } else if (allOk) {
      decision = 'publish';
      rationale = `Auto-pilot OK: ${pred.score}≥${threshold} · ${pred.viralProbability}%≥${viralProbMin}% · ${pred.failureRiskPct}%≤${failureRiskMax}%.`;
      nextAction = `CU abre ${body.targetTool || 'Canva/CapCut'} → arma → publica en ${pred.platform}.`;
    } else if (pred.score < threshold && pred.score >= threshold - 12) {
      decision = 'improve-first';
      rationale = `Cerca del gate (score ${pred.score}/${threshold}). Aplicar top fixes.`;
      nextAction = 'Ejecutar fix #1 y #2 → re-predecir.';
    } else {
      decision = 'block';
      rationale =
        `No pasa gate. ${!gates.scoreOk ? `score ${pred.score}<${threshold} ` : ''}${!gates.viralProbOk ? `· viralProb ${pred.viralProbability}%<${viralProbMin}% ` : ''}${!gates.failureRiskOk ? `· flopRisk ${pred.failureRiskPct}%>${failureRiskMax}%` : ''}`.trim();
      nextAction = 'Pasar a supervised o mejorar la pieza.';
    }
    json(res, 200, {
      decision,
      mode,
      rationale,
      nextAction,
      thresholds: { score: threshold, viralProb: viralProbMin, failureRisk: failureRiskMax },
      gates,
      prediction: {
        score: pred.score,
        tier: pred.tier,
        viralProbability: pred.viralProbability,
        failureRiskPct: pred.failureRiskPct,
        coldDistributionScore: pred.coldDistributionScore,
        expectedReach: pred.expectedReach,
        expectedEngagement: pred.expectedEngagement,
        expectedFollowersGained: pred.expectedFollowersGained,
        topFixes: pred.topFixes,
        decisionHint: pred.decisionHint,
        meta: pred.meta,
      },
      cuPayload:
        decision === 'publish'
          ? {
              tool: body.targetTool || 'canva',
              platform: pred.platform,
              action: 'compose-and-publish',
              asset: {
                format: body.post.format,
                hook: body.post.hook,
                caption: body.post.caption,
                hashtags: body.post.hashtags,
                sound: body.post.sound,
                durationSec: body.post.durationSec,
              },
            }
          : null,
    });
    return true;
  }

  // ── Simulador ─────────────────────────────────────────────────────────
  if (path === '/api/simulate' && m === 'POST') {
    const instruction = String(body.instruction || '').slice(0, 300);
    // Auto-routing: 2 especialistas según la directiva (proyectan con su doctrina).
    const specs = pickAgentsForGoal(instruction, null, 2);
    const specSystem = specs.length
      ? `\n--- ESPECIALISTAS QUE PROYECTAN ---\n${specs.map(agentSystemPrompt).join('\n---\n')}\n`
      : '';
    const pickedMeta = specs.map((a) => ({ id: a.id, role: a.role, emoji: a.emoji, northStar: a.northStar }));
    const out = parseJson(
      await askLLM(
        `${specSystem}Simulá el impacto de esta directiva de contenido y devolvé proyección REALISTA (sin inventar cifras absolutas, usá índices relativos base 100). Directiva: "${instruction}".\nDevolvé SOLO JSON: {
  "understood":"qué entendiste en 1 frase",
  "action":"create-content|engage|analyze|publish",
  "recurrence":"once|daily|weekly|monthly",
  "projection":{"autoPublish":true|false,"perWeek":0,"perMonth":0,"estImpact":"impacto en 1 frase","esfuerzo":"bajo|medio|alto","viralidad":"baja|media|alta"},
  "trayectoria":[{"semana":1,"alcance":0,"engagement":0,"seguidores":0}],
  "escenarios":[
    {"nombre":"Optimista","alcanceX":1.6,"resumen":"qué pasa si todo sale bien"},
    {"nombre":"Esperado","alcanceX":1.0,"resumen":"escenario probable"},
    {"nombre":"Conservador","alcanceX":0.6,"resumen":"si la cadencia falla"}
  ],
  "riesgos":["1 frase","1 frase"],
  "recomendaciones":["1 frase accionable","1 frase","1 frase"]
}
trayectoria: 12 semanas con índices crecientes desde 100 (alcance), 50 (engagement), 0 (seguidores nuevos acumulados).`,
        { maxTokens: 2500, temperature: 0.4, json: true },
      ),
    );
    if (out?.projection) {
      const t = instruction.toLowerCase();
      const inferP = /tiktok|fyp|9:16/.test(t)
        ? 'tiktok'
        : /instagram|reels|carrusel|story/.test(t)
          ? 'instagram'
          : 'both';
      const mkInput = (p) => ({
        platform: p,
        format: p === 'tiktok' ? 'video' : 'reel',
        hook: instruction.slice(0, 90),
        caption: instruction,
        durationSec: p === 'tiktok' ? 22 : 28,
        hasSubtitles: true,
        sound: p === 'tiktok' ? 'trending' : null,
      });
      const predictions =
        inferP === 'both'
          ? { instagram: heuristicPredict(mkInput('instagram')), tiktok: heuristicPredict(mkInput('tiktok')) }
          : { [inferP]: heuristicPredict(mkInput(inferP)) };
      json(res, 200, { ...out, picked: pickedMeta, predictions });
      return true;
    }
    // Fallback determinístico (sin LLM): estima cadencia desde el texto + trayectoria sintética.
    const t = instruction.toLowerCase();
    const perDay = (t.match(/(\d+)\s*(por d[ií]a|\/d[ií]a|diario)/) || [])[1];
    const n = perDay ? parseInt(perDay, 10) : /diari|cada d[ií]a/.test(t) ? 1 : 0;
    const perWeek = n ? n * 7 : /semanal|por semana/.test(t) ? 1 : 0;
    const intensity = Math.min(perWeek || 1, 14);
    const trayectoria = Array.from({ length: 12 }, (_, i) => ({
      semana: i + 1,
      alcance: Math.round(100 + i * intensity * 8),
      engagement: Math.round(50 + i * intensity * 3),
      seguidores: Math.round(i * intensity * 6),
    }));
    json(res, 200, {
      understood: instruction || 'Directiva vacía',
      action: 'create-content',
      recurrence: n ? 'daily' : perWeek ? 'weekly' : 'once',
      projection: {
        autoPublish: false,
        perWeek: perWeek || 0,
        perMonth: (perWeek || 0) * 4,
        estImpact: 'Proyección estimada — conectá LLM para detalle por nicho.',
        esfuerzo: intensity > 7 ? 'alto' : intensity > 3 ? 'medio' : 'bajo',
        viralidad: 'media',
      },
      trayectoria,
      escenarios: [
        { nombre: 'Optimista', alcanceX: 1.6, resumen: 'Cadencia sostenida + hooks que retienen.' },
        { nombre: 'Esperado', alcanceX: 1.0, resumen: 'Resultado probable manteniendo el plan.' },
        { nombre: 'Conservador', alcanceX: 0.6, resumen: 'Si la cadencia baja o los hooks no rinden.' },
      ],
      riesgos: ['Quemar audiencia si el contenido se repite.', 'Bajar calidad por volumen.'],
      recomendaciones: [
        'Reservar 30 min/día para responder comentarios.',
        'A/B test del hook cada semana.',
        'Loop de cierre en cada pieza.',
      ],
    });
    return true;
  }

  return false;
};
