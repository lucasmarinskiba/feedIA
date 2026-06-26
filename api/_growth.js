/**
 * Loop de crecimiento de FeedIA (serverless P0): datos → análisis → plan → schedule → cron.
 *
 * Endpoints:
 *   GET  /api/insights/:platform        → perfil + métricas reales (si hay tokens) o demo
 *   POST /api/growth/plan               → análisis growth + próxima acción (LLM si hay key)
 *   GET  /api/schedule                  → posts programados
 *   POST /api/schedule                  → programa un post {platform,when,caption,mediaUrl}
 *   POST /api/cron/tick                 → procesa posts vencidos + refresca métricas (Vercel Cron)
 *   GET  /api/system/p0-status          → qué está conectado (store/IG/TikTok/LLM)
 */
import * as store from './_store.js';
import { STORE_REAL as KV_REAL } from './_store.js';
import { igProfile, igInsights, igMedia, ttProfile, ttVideos, igConnected, ttConnected } from './_social.js';
import { askLLM, HAS_LLM, LLM_PROVIDER } from './_llm.js';
import {
  GROWTH_SPECIALISTS,
  findAgent,
  agentsForPlatform,
  agentSystemPrompt,
  pickAgentsForGoal,
} from './_growth-agents.js';

const GROWTH_SYS = `Sos el analista de crecimiento de FeedIA (reemplaza analista de cuentas + growth + KPIs).
Leé las métricas y devolvé decisiones, no descripciones. Detectá el cuello de botella del embudo (alcance < retención < engagement < conversión) y proponé la acción de mayor ROI.
IG: señal madre sends/saves, Reels = alcance frío, primeros 30min. TikTok: completion + rewatch en FYP, sonido trending, cadencia.
No inventes cifras: si faltan datos, decilo. Español, concreto, accionable.`;

const anthropic = (prompt, maxTokens = 2000) => askLLM(prompt, { system: GROWTH_SYS, maxTokens, temperature: 0.5 });

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

// Snapshot de datos reales (o demo) por plataforma.
const snapshot = async (platform) => {
  if (platform === 'instagram') {
    const [p, ins, md] = await Promise.all([igProfile(), igInsights(), igMedia(8)]);
    return { platform, profile: p, insights: ins, media: md.media || [], real: p.real };
  }
  const [p, vids] = await Promise.all([ttProfile(), ttVideos(8)]);
  return { platform, profile: p, videos: vids.videos || [], real: p.real };
};

// Plan de crecimiento determinístico (sin LLM) — siempre devuelve algo útil.
const fallbackPlan = (platform, snap) => {
  const ig = platform === 'instagram';
  return {
    cuelloDeBotella: snap.real
      ? 'Definí objetivo y medí 7 días para ubicar el cuello real.'
      : 'Sin datos reales: conectá la API para diagnóstico preciso.',
    acciones: ig
      ? [
          'Subí 4-5 Reels/semana con hook visual 0-1s (alcance frío).',
          'Carrusel 2x/semana con slide 1 que promete + última con CTA de guardado.',
          'Stories diarias con sticker (poll/quiz) para subir relación.',
          'Respondé comentarios en los primeros 30min para empujar velocidad.',
        ]
      : [
          'Subí 1-2 videos/día, hook 0-2s triple capa (verbal+visual+texto).',
          'Usá 1 sonido trending temprano por video.',
          'Armá una serie con nombre que la audiencia espere.',
          'Loop de cierre para rewatch + sembrá comentarios con pregunta.',
        ],
    metricaReina: ig ? 'sends/saves + reach rate de Reels' : 'completion % + rewatch + shares',
    proximoPaso: ig ? 'Elegí 1 formato y sostené cadencia 30 días.' : 'Cadencia alta 14 días + medir completion.',
  };
};

export const handleGrowth = async (req, res, path, m, body, search) => {
  // GET /api/insights/:platform
  if (path.startsWith('/api/insights/') && m === 'GET') {
    const platform = path.split('/')[3] === 'tiktok' ? 'tiktok' : 'instagram';
    const snap = await snapshot(platform);
    json(res, 200, snap);
    // Persist per-user snapshot + trigger achievement evaluation async
    try {
      const { getSessionFromReq } = await import('./_users.js');
      const ctx = await getSessionFromReq(req);
      if (ctx?.user?.id) {
        const userId = ctx.user.id;
        const profile = snap.profile ?? {};
        const metricSnap = platform === 'instagram'
          ? { followers: profile.followers ?? 0, totalLikes: profile.likes ?? 0, maxSaves: profile.maxSaves ?? 0, engagementRate: profile.engagementRate ?? 0 }
          : { followers: profile.followers ?? 0, totalLikes: profile.likes ?? 0 };
        import('./_achievements.js').then(a =>
          a.updateMetricSnapshot(userId, platform, metricSnap)
        ).catch(() => {});
      }
    } catch { /* non-blocking */ }
    return true;
  }

  // POST /api/growth/plan
  if (path === '/api/growth/plan' && m === 'POST') {
    const platform = body.platform === 'tiktok' ? 'tiktok' : 'instagram';
    const goal = body.goal || 'crecer alcance y seguidores';
    const snap = await snapshot(platform);
    const llm = await anthropic(
      `Plataforma: ${platform}. Objetivo: ${goal}.\nDatos: ${JSON.stringify(snap).slice(0, 4000)}\nDevolvé: 1) cuello de botella, 2) 3-5 acciones priorizadas, 3) métrica reina, 4) próximo paso. Conciso.`,
    );
    json(res, 200, {
      platform,
      goal,
      real: snap.real,
      llm: Boolean(llm),
      analysis: llm || null,
      plan: llm ? null : fallbackPlan(platform, snap),
      snapshot: snap,
    });
    return true;
  }

  // GET /api/schedule
  if (path === '/api/schedule' && m === 'GET') {
    const items = await store.lrange('feedia:schedule', 0, 50);
    json(res, 200, { items, store: KV_REAL ? 'persistent' : 'ephemeral' });
    return true;
  }

  // POST /api/schedule
  if (path === '/api/schedule' && m === 'POST') {
    const item = {
      id: `s_${Date.now()}`,
      platform: body.platform === 'tiktok' ? 'tiktok' : 'instagram',
      when: body.when || new Date(Date.now() + 3600e3).toISOString(),
      caption: body.caption || '',
      mediaUrl: body.mediaUrl || '',
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    await store.lpush('feedia:schedule', item);
    json(res, 200, { ok: true, item, store: KV_REAL ? 'persistent' : 'ephemeral' });
    return true;
  }

  // POST /api/cron/tick — Vercel Cron: procesa vencidos + refresca snapshot
  if (path === '/api/cron/tick' && (m === 'POST' || m === 'GET')) {
    const secret = process.env.CRON_SECRET;
    const given = (req.headers?.authorization || '').replace('Bearer ', '') || search.get('secret') || '';
    if (secret && given !== secret) {
      json(res, 401, { error: 'unauthorized' });
      return true;
    }
    const items = await store.lrange('feedia:schedule', 0, 100);
    const now = Date.now();
    const due = items.filter((i) => i.status === 'scheduled' && new Date(i.when).getTime() <= now);
    const ttOn = await ttConnected();
    const igOn = await igConnected();
    const processed = [];
    for (const it of due) {
      // Publicación real requiere scopes aprobados; sin token marcamos pendiente sin romper.
      const canPublish = it.platform === 'instagram' ? igOn : ttOn;
      processed.push({ id: it.id, platform: it.platform, action: canPublish ? 'publish-attempt' : 'skipped-no-token' });
    }
    // Snapshot de métricas para alimentar el loop de aprendizaje.
    const igSnap = igOn ? await snapshot('instagram') : null;
    const ttSnap = ttOn ? await snapshot('tiktok') : null;
    if (igSnap) await store.set('feedia:last_snapshot:instagram', igSnap);
    if (ttSnap) await store.set('feedia:last_snapshot:tiktok', ttSnap);
    json(res, 200, {
      ok: true,
      due: due.length,
      processed,
      refreshed: { instagram: Boolean(igSnap), tiktok: Boolean(ttSnap) },
      ts: new Date().toISOString(),
    });
    return true;
  }

  // ── GROWTH SPECIALISTS (20 agentes IA de crecimiento) ─────────────────
  if (path === '/api/growth/agents' && m === 'GET') {
    const plat = search.get('platform') || 'both';
    const list = agentsForPlatform(plat);
    json(res, 200, { total: GROWTH_SPECIALISTS.length, platform: plat, count: list.length, agents: list });
    return true;
  }
  if (path === '/api/growth/auto' && m === 'POST') {
    if (!body.goal) {
      json(res, 400, { error: 'missing-goal' });
      return true;
    }
    const max = Math.min(Math.max(Number(body.maxAgents) || 3, 1), 6);
    const picked = pickAgentsForGoal(body.goal, body.platform, max);
    if (!HAS_LLM) {
      json(res, 200, {
        ok: false,
        llm: false,
        picked: picked.map((a) => ({ id: a.id, role: a.role, emoji: a.emoji, northStar: a.northStar })),
        note: 'Sin LLM (set GROQ_API_KEY).',
      });
      return true;
    }
    const system = picked.map(agentSystemPrompt).join('\n\n---\n\n');
    const ctxStr = body.context ? `\nContexto: ${JSON.stringify(body.context).slice(0, 1500)}` : '';
    const platCtx = plat ? `\nPlataforma: ${plat}.` : '';
    const prompt = `Objetivo del usuario: "${body.goal}".${platCtx}${ctxStr}\n\nCada especialista contribuye con su doctrina. Devolvé SOLO JSON combinado:\n{"diagnostico":"síntesis","acciones":["6-10 priorizadas con qué especialista las propone"],"metricaReina":"","primerExperimento":"","plan30dias":["s1:","s2:","s3:","s4:"]}`;
    const txt = await askLLM(prompt, { system, maxTokens: 3000, temperature: 0.5, json: true });
    let out = null;
    if (txt) {
      try {
        out = JSON.parse(
          txt
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/i, ''),
        );
      } catch {
        /* noop */
      }
    }
    json(res, 200, {
      ok: Boolean(out),
      llm: true,
      provider: LLM_PROVIDER,
      picked: picked.map((a) => ({ id: a.id, role: a.role, emoji: a.emoji, northStar: a.northStar })),
      output: out,
    });
    return true;
  }
  if (path === '/api/growth/expert' && m === 'POST') {
    if (!body.agentId || !body.topic) {
      json(res, 400, {
        error: 'missing-fields',
        required: ['agentId', 'topic'],
        availableAgents: GROWTH_SPECIALISTS.map((a) => a.id),
      });
      return true;
    }
    const agent = findAgent(body.agentId);
    if (!agent) {
      json(res, 404, {
        error: 'agent-not-found',
        agentId: body.agentId,
        availableAgents: GROWTH_SPECIALISTS.map((a) => a.id),
      });
      return true;
    }
    if (!HAS_LLM) {
      json(res, 200, {
        ok: false,
        llm: false,
        agent,
        note: 'Conectá un LLM (GROQ_API_KEY gratis) para consultar al especialista.',
      });
      return true;
    }
    const platCtx = body.platform ? `\nPlataforma objetivo: ${body.platform}.` : '';
    const ctxStr = body.context ? `\nContexto: ${JSON.stringify(body.context).slice(0, 1500)}` : '';
    const prompt = `Tema/situación: "${body.topic}".${platCtx}${ctxStr}\n\nDevolvé SOLO JSON:\n{\n  "diagnostico": "1-2 frases · qué pasa según tu doctrina",\n  "acciones": ["3-6 acciones concretas, accionables, en orden de impacto"],\n  "ejemplos": ["2-4 ejemplos breves aplicables"],\n  "metricaReina": "cuál métrica medir para validar",\n  "primerExperimento": "el primer A/B o acción que ejecutarías esta semana"\n}`;
    const txt = await askLLM(prompt, {
      system: agentSystemPrompt(agent),
      maxTokens: 2000,
      temperature: 0.5,
      json: true,
    });
    let out = null;
    if (txt) {
      try {
        out = JSON.parse(
          txt
            .trim()
            .replace(/^```(?:json)?\s*/i, '')
            .replace(/```\s*$/i, ''),
        );
      } catch {
        /* noop */
      }
    }
    if (!out) {
      json(res, 200, { ok: false, llm: true, provider: LLM_PROVIDER, agent, note: 'LLM no respondió / parse falló.' });
      return true;
    }
    json(res, 200, {
      ok: true,
      llm: true,
      provider: LLM_PROVIDER,
      agent: { id: agent.id, role: agent.role, emoji: agent.emoji, northStar: agent.northStar },
      output: out,
    });
    return true;
  }

  // ── AGENDA (persistente en store) ──────────────────────────────────────
  if (path === '/api/agenda' && m === 'GET') {
    const items = (await store.get('feedia:agenda')) || [];
    json(res, 200, Array.isArray(items) ? items : []);
    return true;
  }
  if (path === '/api/agenda' && m === 'POST') {
    const items = (await store.get('feedia:agenda')) || [];
    const item = {
      id: `a_${Date.now()}`,
      title: String(body.title || '').slice(0, 120),
      at: body.at || new Date().toISOString(),
      notes: body.notes || '',
      platform: body.platform || 'general',
      format: body.format || '',
      done: false,
      fromDirective: false,
    };
    const next = [...(Array.isArray(items) ? items : []), item].sort((a, b) => new Date(a.at) - new Date(b.at));
    await store.set('feedia:agenda', next);
    json(res, 200, { ok: true, item });
    return true;
  }
  if (path.startsWith('/api/agenda/') && path.endsWith('/done') && m === 'POST') {
    const id = path.split('/')[3];
    const items = (await store.get('feedia:agenda')) || [];
    const next = (Array.isArray(items) ? items : []).map((i) =>
      i.id === id ? { ...i, done: body.done !== false } : i,
    );
    await store.set('feedia:agenda', next);
    json(res, 200, { ok: true });
    return true;
  }
  if (path.startsWith('/api/agenda/') && path.endsWith('/delete') && m === 'POST') {
    const id = path.split('/')[3];
    const items = (await store.get('feedia:agenda')) || [];
    await store.set(
      'feedia:agenda',
      (Array.isArray(items) ? items : []).filter((i) => i.id !== id),
    );
    json(res, 200, { ok: true });
    return true;
  }
  if (path === '/api/agenda/interpret' && m === 'POST') {
    const text = String(body.text || '').slice(0, 500);
    const out = await (async () => {
      const txt = await anthropic(
        `Convertí esto en ítems de agenda. Texto: "${text}". Fecha base: ${new Date().toISOString()}.\nDevolvé SOLO JSON: {"items":[{"title":"corto","at":"ISO 8601","notes":"opcional","recurrence":"none|daily|weekly|monthly"}]}`,
        1200,
      );
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
    })();
    if (!out?.items?.length) {
      json(res, 200, { created: [], note: 'no-llm-or-parse' });
      return true;
    }
    const items = (await store.get('feedia:agenda')) || [];
    const created = out.items.map((it, k) => ({
      id: `a_${Date.now()}_${k}`,
      title: String(it.title || text).slice(0, 120),
      at: it.at || new Date().toISOString(),
      notes: it.notes || '',
      platform: it.platform || 'general',
      format: it.format || '',
      recurrence: it.recurrence || 'none',
      done: false,
      fromDirective: false,
    }));
    const next = [...(Array.isArray(items) ? items : []), ...created].sort((a, b) => new Date(a.at) - new Date(b.at));
    await store.set('feedia:agenda', next);
    json(res, 200, { created });
    return true;
  }

  // POST /api/agenda/plan — agente planificador editorial: arma semana sincronizada con la cuenta
  if (path === '/api/agenda/plan' && m === 'POST') {
    const platform = body.platform === 'tiktok' ? 'tiktok' : body.platform === 'both' ? 'both' : 'instagram';
    const dias = Math.min(Math.max(Number(body.dias) || 7, 1), 30);
    const nicho = String(body.nicho || '').slice(0, 200);
    // Contexto real de la cuenta si está conectada (mejores horarios, qué rinde).
    let ctx = '';
    if (platform !== 'tiktok') {
      const s = await snapshot('instagram');
      if (s.real) ctx += `\nDatos IG: ${JSON.stringify({ profile: s.profile, insights: s.insights }).slice(0, 1500)}`;
    }
    if (platform !== 'instagram') {
      const s = await snapshot('tiktok');
      if (s.real)
        ctx += `\nDatos TikTok: ${JSON.stringify({ profile: s.profile, videos: (s.videos || []).slice(0, 5) }).slice(0, 1500)}`;
    }
    const sys = `Sos el planificador editorial de FeedIA (agente). Armás un calendario de contenido por días, sincronizado con la(s) cuenta(s).
Reglas: IG = mix Reels (alcance frío) + carrusel (saves) + stories (relación); TikTok = cadencia alta, 1-2 videos/día, sonido trending, series. Asigná horarios realistas (mejores ventanas: mañana 8-10, mediodía 12-14, noche 19-22 hora local) y NO repitas el mismo formato seguido. Cada ítem: una idea concreta accionable del nicho.`;
    const specs = pickAgentsForGoal(`plan de contenido ${platform} ${nicho}`, platform === 'both' ? null : platform, 3);
    const specSystem = specs.length
      ? `\n\n--- ESPECIALISTAS ACTIVADOS ---\n\n${specs.map(agentSystemPrompt).join('\n\n---\n\n')}`
      : '';
    const prompt = `${sys}${specSystem}\nPlataforma: ${platform}. Días: ${dias}. Nicho: "${nicho || 'general'}". Hoy: ${new Date().toISOString()}.${ctx}\nDevolvé SOLO JSON: {"items":[{"title":"idea concreta","at":"ISO 8601 futuro","platform":"instagram|tiktok","format":"reel|carrusel|story|video|foto","notes":"hook o ángulo"}]}. Entre ${dias * 1} y ${dias * 2} ítems.`;
    const out = await (async () => {
      const txt = await askLLM(prompt, { maxTokens: 3000, temperature: 0.6, json: true });
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
    })();
    if (!out?.items?.length) {
      json(res, 200, { created: [], note: 'no-llm', llm: HAS_LLM });
      return true;
    }
    const items = (await store.get('feedia:agenda')) || [];
    const created = out.items
      .map((it, k) => ({
        id: `a_${Date.now()}_${k}`,
        title: String(it.title || 'Contenido').slice(0, 120),
        at: it.at || new Date(Date.now() + (k + 1) * 86400e3).toISOString(),
        notes: it.notes || '',
        platform: it.platform === 'tiktok' ? 'tiktok' : 'instagram',
        format: it.format || '',
        done: false,
        fromDirective: true,
      }))
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    const next = [...(Array.isArray(items) ? items : []), ...created].sort((a, b) => new Date(a.at) - new Date(b.at));
    await store.set('feedia:agenda', next);
    json(res, 200, { created, real: ctx.length > 0 });
    return true;
  }

  // GET /api/system/p0-status — qué está conectado para encender el loop
  if (path === '/api/system/p0-status' && m === 'GET') {
    const ttOn = await ttConnected();
    const igOn = await igConnected();
    json(res, 200, {
      store: KV_REAL
        ? 'connected (persistent)'
        : 'in-memory (ephemeral) — set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN',
      instagram: igOn
        ? 'connected'
        : 'demo — autorizá en /api/auth/instagram/login (creá app Meta + IG_CLIENT_ID/SECRET)',
      tiktok: ttOn ? 'connected (OAuth)' : 'demo — autorizá en /api/auth/tiktok/login (tras aprobar app)',
      llm: HAS_LLM
        ? `connected (${LLM_PROVIDER})`
        : 'off — set GROQ_API_KEY (gratis) / GEMINI_API_KEY / ANTHROPIC_API_KEY',
      images: process.env.FAL_KEY ? 'connected' : 'off — set FAL_KEY',
      loop: HAS_LLM
        ? `ARMED (LLM ${LLM_PROVIDER}) — genera/analiza/planea ya${KV_REAL && (igOn || ttOn) ? ' + datos reales + schedule persistente' : KV_REAL ? ' + schedule persistente. Sumá IG/TikTok para datos reales' : '. Sumá KV + IG/TikTok'}`
        : 'off — set GROQ_API_KEY (gratis) para encender',
    });
    return true;
  }

  return false;
};
