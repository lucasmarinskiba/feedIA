/**
 * Feedback Loop — Memoria activa.
 *
 * Convierte _accountMemory en motor de aprendizaje:
 *   1. Lee últimas N métricas + historia
 *   2. Clustering heurístico SIN LLM (format/hour/hookStyle ganadores)
 *   3. 1 LLM call que sintetiza "learnings" en ≤500 tokens
 *   4. Mergea en cache de _nicheIntelligence (KV) → loadIntelligencePriming lo lee auto
 *   5. _gstack.scoreArchetypeMood consume winningArchetype/winningFormat
 *
 * Endpoints:
 *   POST /api/feedback/run         (on-demand desde UI)
 *   GET  /api/cron/feedback-daily  (Vercel cron, recorre cuentas activas)
 */

import * as store from './_store.js';
import { getMetrics, getHistory } from './_accountMemory.js';
import { askLLMJson } from './_llm.js';
import { igSyncInsights, connectionStatus } from './_socialConnect.js';

const INTEL_KEY = (scope, accountId) => `feedia:intel:${scope || 'anon'}:${accountId || 'general'}`;

// ── Clustering heurístico ────────────────────────────────────────────────────
const safeNum = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

const scorePost = (m) => {
  // Score compuesto: reach + 5x saves + 4x shares + 3x comments + 0.5x likes + 2x follows
  return (
    safeNum(m.reach) +
    5 * safeNum(m.saves) +
    4 * safeNum(m.shares) +
    3 * safeNum(m.comments) +
    0.5 * safeNum(m.likes) +
    2 * safeNum(m.follows)
  );
};

const groupTop = (entries, keyFn) => {
  const map = new Map();
  entries.forEach((e) => {
    const k = keyFn(e);
    if (!k) return;
    const cur = map.get(k) || { key: k, totalScore: 0, count: 0 };
    cur.totalScore += scorePost(e);
    cur.count++;
    map.set(k, cur);
  });
  const arr = [...map.values()].map((x) => ({ ...x, avgScore: Math.round(x.totalScore / x.count) }));
  return arr.sort((a, b) => b.avgScore - a.avgScore);
};

const hourFromIso = (iso) => {
  try {
    return String(new Date(iso).getHours()).padStart(2, '0') + ':00';
  } catch {
    return null;
  }
};

const detectHookStyle = (topic = '') => {
  const t = topic.toLowerCase();
  if (/\?$|^¿|saber|por qu[eé]|c[oó]mo/.test(t)) return 'pregunta/curiosidad';
  if (/^\d|\b\d+ (cosas|tips|errores|formas|claves)/.test(t)) return 'lista/número';
  if (/error|nunca|no hagas|para[á]/.test(t)) return 'warning/error';
  if (/secreto|nadie|verdad/.test(t)) return 'curiosity-gap';
  if (/antes|despu[eé]s|cambio/.test(t)) return 'transformación';
  return 'declarativo';
};

export const extractWinningPatterns = (metrics = []) => {
  if (!metrics.length) return { hasData: false, totalAnalyzed: 0 };
  const enriched = metrics.map((m) => ({
    ...m,
    hookStyle: detectHookStyle(m.topic || ''),
    hour: hourFromIso(m.postedAt || m.at),
  }));
  const sorted = [...enriched].sort((a, b) => scorePost(b) - scorePost(a));
  const top20 = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.2)));
  return {
    hasData: true,
    totalAnalyzed: enriched.length,
    bestFormat: groupTop(enriched, (e) => e.format)[0]?.key || null,
    bestHookStyle: groupTop(enriched, (e) => e.hookStyle)[0]?.key || null,
    bestHour:
      groupTop(
        enriched.filter((e) => e.hour),
        (e) => e.hour,
      )[0]?.key || null,
    formatRanking: groupTop(enriched, (e) => e.format).slice(0, 4),
    hookStyleRanking: groupTop(enriched, (e) => e.hookStyle).slice(0, 4),
    hourRanking: groupTop(
      enriched.filter((e) => e.hour),
      (e) => e.hour,
    ).slice(0, 4),
    topPosts: top20.map((p) => ({ topic: p.topic, format: p.format, score: Math.round(scorePost(p)) })),
    avgScore: Math.round(enriched.reduce((s, e) => s + scorePost(e), 0) / enriched.length),
  };
};

// ── LLM sintetizador: learnings de ≤500 tokens ──────────────────────────────
const synthesizeLearnings = async ({ patterns, niche, history }) => {
  if (!patterns.hasData) return null;
  const prompt = `Sos analista senior de social media. Una cuenta del nicho "${niche || 'general'}" trajo estos datos reales:
- ${patterns.totalAnalyzed} posts analizados, score promedio: ${patterns.avgScore}
- Mejor formato: ${patterns.bestFormat} (${patterns.formatRanking.map((r) => `${r.key}:${r.avgScore}`).join(', ')})
- Mejor estilo de hook: ${patterns.bestHookStyle}
- Mejor horario: ${patterns.bestHour}
- Top 3 posts: ${patterns.topPosts
    .slice(0, 3)
    .map((p) => `"${(p.topic || '').slice(0, 40)}" [${p.format}] score ${p.score}`)
    .join(' | ')}
${
  history.length
    ? `- Últimas tareas creadas: ${history
        .slice(-3)
        .map((h) => h.topic || h.format)
        .filter(Boolean)
        .join(', ')}`
    : ''
}

Devolvé SOLO JSON con learnings accionables (sin BS, sin métricas inventadas):
{
  "summary": "1-2 oraciones con el INSIGHT central (qué hace ganar esta cuenta)",
  "winningArchetype": "uno de: educador|autoridad|vendedor|inspirador|humorista|contrario|storyteller|analista|cercano (basado en patrones)",
  "winningFormat": "${patterns.bestFormat}",
  "winningHookStyle": "${patterns.bestHookStyle}",
  "recommendations": ["acción concreta 1 para próximos 7 días", "acción 2", "acción 3"],
  "redFlags": ["qué dejó de funcionar y NO repetir"],
  "doubleDownOn": "el patrón específico que más conviene amplificar"
}`;
  return await askLLMJson(prompt).catch(() => null);
};

// ── Merge en cache de niche intelligence ────────────────────────────────────
export const updateNicheCache = async (scope, accountId, learnings) => {
  const key = INTEL_KEY(scope, accountId);
  const cur = (await store.get(key).catch(() => null)) || {};
  const merged = {
    ...cur,
    summary: {
      ...(cur.summary || {}),
      ...(learnings?.summary ? { learningsSummary: learnings.summary } : {}),
      ...(learnings?.winningArchetype ? { winningArchetype: learnings.winningArchetype } : {}),
      ...(learnings?.winningFormat ? { winningFormat: learnings.winningFormat } : {}),
      ...(learnings?.winningHookStyle ? { winningHookStyle: learnings.winningHookStyle } : {}),
      ...(learnings?.doubleDownOn ? { doubleDownOn: learnings.doubleDownOn } : {}),
    },
    learnings: {
      builtAt: new Date().toISOString(),
      recommendations: learnings?.recommendations || [],
      redFlags: learnings?.redFlags || [],
    },
    builtAt: cur.builtAt || new Date().toISOString(),
  };
  await store.set(key, merged).catch(() => {});
  return merged;
};

// ── Pipeline principal ──────────────────────────────────────────────────────
export const analyzeAccount = async ({ scope = 'anon', accountId = '', niche = '', autoSync = true } = {}) => {
  const startedAt = Date.now();
  const syncLog = [];

  // PASO 1: Auto-sync desde Instagram/TikTok API si están conectados
  if (autoSync) {
    try {
      const conn = await connectionStatus(scope);
      if (conn?.instagram?.connected) {
        const sync = await igSyncInsights(scope, accountId).catch((e) => ({
          error: String(e?.message || e).slice(0, 100),
        }));
        if (sync?.ok) syncLog.push(`Instagram: ${sync.synced} posts sincronizados desde Graph API`);
        else if (sync?.error) syncLog.push(`Instagram: ${sync.error}`);
      } else if (conn?.instagram?.configured) syncLog.push('Instagram configurado pero no conectado (autorizá la app)');
      else syncLog.push('Instagram no configurado (faltan env vars META_*)');
      if (conn?.tiktok?.connected) syncLog.push('TikTok conectado (sync de insights pendiente — TT Display API)');
      else if (conn?.tiktok?.configured) syncLog.push('TikTok configurado pero no conectado');
    } catch (e) {
      syncLog.push(`Sync error: ${String(e?.message || e).slice(0, 80)}`);
    }
  }

  const [metrics, history] = await Promise.all([
    getMetrics(scope, accountId, 30).catch(() => []),
    getHistory(scope, accountId, 30).catch(() => []),
  ]);

  const patterns = extractWinningPatterns(metrics);
  if (!patterns.hasData) {
    return {
      ok: true,
      hasData: false,
      message: syncLog.some((l) => /sincronizados/.test(l))
        ? 'Sync OK pero la cuenta es nueva o no hay posts con métricas aún. Publicá 3-5 posts y volvé a analizar.'
        : 'Sin métricas. Conectá tu cuenta de Instagram (panel "Conectar Instagram/TikTok") o cargá métricas manuales para que el sistema aprenda.',
      metricsCount: 0,
      historyCount: history.length,
      syncLog,
    };
  }

  const learnings = await synthesizeLearnings({ patterns, niche, history });
  const merged = learnings ? await updateNicheCache(scope, accountId, learnings) : null;

  return {
    ok: true,
    hasData: true,
    durationMs: Date.now() - startedAt,
    patterns,
    learnings: learnings || {
      summary: 'Sin LLM disponible. Patrones extraídos heurísticamente.',
      recommendations: [],
      redFlags: [],
    },
    nicheCacheUpdated: Boolean(merged),
    syncLog,
    autoSyncUsed: autoSync,
  };
};

// ── Cron: recorre cuentas activas (top 20 por última actividad) ──────────────
const listActiveAccounts = async () => {
  try {
    const keys = await store.keys('feedia:acct:');
    // pattern: feedia:acct:{scope}:{accountId}:history
    const ids = new Set();
    for (const k of keys) {
      const m = /^feedia:acct:([^:]+):([^:]+):history$/.exec(k);
      if (m) ids.add(`${m[1]}::${m[2]}`);
    }
    return [...ids].slice(0, 20);
  } catch {
    return [];
  }
};

export const runDailyCron = async () => {
  const accounts = await listActiveAccounts();
  const results = [];
  for (const id of accounts) {
    const [scope, accountId] = id.split('::');
    try {
      const r = await analyzeAccount({ scope, accountId });
      results.push({ scope, accountId, ok: r.ok, hasData: r.hasData });
    } catch (e) {
      results.push({ scope, accountId, ok: false, error: String(e?.message || e).slice(0, 100) });
    }
  }
  return { ranAt: new Date().toISOString(), accountsProcessed: results.length, results };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleFeedbackLoop = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/feedback/run' && m === 'POST') {
    try {
      const result = await analyzeAccount({
        scope: ctx.userId || 'anon',
        accountId: body?.accountId || '',
        niche: body?.niche || '',
      });
      return json(200, result);
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  if (path === '/api/cron/feedback-daily' && (m === 'GET' || m === 'POST')) {
    try {
      const r = await runDailyCron();
      return json(200, { ok: true, ...r });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }

  return false;
};
