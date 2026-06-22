/**
 * Modelo predictivo v2 (vanilla · heurística determinística + Monte Carlo).
 * Espejo de feedia-next/lib/predictor.ts (sin paso LLM enhancement).
 *
 * v2 incluye:
 *  - 17 señales (algo + comportamiento humano + tendencias)
 *  - Benchmarks por nicho (20 nichos · IG/TT)
 *  - Monte Carlo posterior (p10/p50/p90) con N=400 muestras
 *  - viralProbability (P(score≥80)) y failureRiskPct (P(score<40))
 *  - cold-FYP score independiente de followers
 *  - decisionHint.autoPublishReady para gate de Computer Use (≥70/25/10)
 */

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const round = (n, d = 0) => {
  const p = Math.pow(10, d);
  return Math.round(n * p) / p;
};

// ─── Niche benchmarks ───────────────────────────────────────────────────────
const NICHE_BENCH = {
  general: { ig: { er: 4.5, reachX: 1.0 }, tt: { er: 8.2, reachX: 1.0 }, note: 'media de mercado.' },
  fitness: { ig: { er: 5.5, reachX: 1.15 }, tt: { er: 9.5, reachX: 1.2 }, note: 'transformaciones disparan saves.' },
  coach: { ig: { er: 4.8, reachX: 1.05 }, tt: { er: 8.0, reachX: 1.0 }, note: 'mindset → buen save-rate.' },
  ecom: { ig: { er: 3.2, reachX: 0.85 }, tt: { er: 7.0, reachX: 0.95 }, note: 'ER bajo, conversión alta.' },
  saas: { ig: { er: 2.8, reachX: 0.75 }, tt: { er: 5.5, reachX: 0.8 }, note: 'audiencia niche, ER bajo.' },
  food: { ig: { er: 6.5, reachX: 1.25 }, tt: { er: 11.0, reachX: 1.3 }, note: 'recetas top-save.' },
  finance: { ig: { er: 4.0, reachX: 0.95 }, tt: { er: 7.5, reachX: 0.95 }, note: 'doctrina rey.' },
  travel: { ig: { er: 5.0, reachX: 1.1 }, tt: { er: 8.5, reachX: 1.1 }, note: 'estética + dato.' },
  beauty: { ig: { er: 5.8, reachX: 1.2 }, tt: { er: 10.5, reachX: 1.25 }, note: 'GRWM + tutorial → ER alto.' },
  fashion: { ig: { er: 4.7, reachX: 1.1 }, tt: { er: 8.8, reachX: 1.15 }, note: 'outfit reels.' },
  gaming: { ig: { er: 3.5, reachX: 0.9 }, tt: { er: 9.0, reachX: 1.1 }, note: 'clutch + meta-loops.' },
  edu: { ig: { er: 4.2, reachX: 1.0 }, tt: { er: 7.8, reachX: 0.95 }, note: 'bite-size = saves.' },
  music: { ig: { er: 4.5, reachX: 1.05 }, tt: { er: 12.0, reachX: 1.4 }, note: 'snippets → trend sounds.' },
  comedy: { ig: { er: 6.0, reachX: 1.25 }, tt: { er: 13.0, reachX: 1.45 }, note: 'share-rate dispara cold-FYP.' },
  news: { ig: { er: 3.0, reachX: 0.85 }, tt: { er: 6.0, reachX: 0.85 }, note: 'velocidad > exhaustividad.' },
  auto: { ig: { er: 4.0, reachX: 0.95 }, tt: { er: 7.5, reachX: 1.0 }, note: 'sound del motor = hook nativo.' },
  pets: { ig: { er: 6.8, reachX: 1.3 }, tt: { er: 12.5, reachX: 1.4 }, note: 'cara animal = scroll-stopper.' },
  realestate: { ig: { er: 3.8, reachX: 0.9 }, tt: { er: 6.5, reachX: 0.85 }, note: 'tour + dato concreto.' },
  b2b: { ig: { er: 2.5, reachX: 0.7 }, tt: { er: 4.5, reachX: 0.75 }, note: 'LinkedIn-first, IG/TT spillover.' },
  ngo: { ig: { er: 4.5, reachX: 1.05 }, tt: { er: 8.0, reachX: 1.0 }, note: 'storytelling humano.' },
};

const NICHE_REGEX = [
  ['fitness', /fit|gym|entren|wellness|nutri|transform/i],
  ['coach', /coach|mindset|mentor|terap/i],
  ['ecom', /ecom|tienda|dtc|shopify|drop/i],
  ['saas', /saas|indie|build.in.public|founder|tech/i],
  ['food', /receta|cocina|comida|restaur|food|chef/i],
  ['finance', /finanz|inversi|fintech|ahorro|trading/i],
  ['travel', /viaje|travel|destino|turismo/i],
  ['beauty', /beauty|maquill|skincare|fragancia|grwm|mua/i],
  ['fashion', /fashion|moda|outfit|ootd|haul/i],
  ['gaming', /gaming|gamer|esports|twitch|clutch/i],
  ['edu', /educa|edtech|curso|mooc|tutor|academia/i],
  ['music', /m[uú]sic|musician|sello|dj/i],
  ['comedy', /comedia|standup|sketch|humor/i],
  ['news', /noticia|periodism|medio digital/i],
  ['auto', /auto|moto|tuning|garaje/i],
  ['pets', /mascot|pet|veterinari|rescue|animal/i],
  ['realestate', /inmobili|real estate|propied|broker/i],
  ['b2b', /b2b|enterprise|pipeline|abm/i],
  ['ngo', /ong|causa|advocacy|fundaci/i],
];

const normalizeNiche = (free) => {
  if (!free) return 'general';
  const s = String(free).toLowerCase().trim();
  if (NICHE_BENCH[s]) return s;
  for (const [id, rx] of NICHE_REGEX) if (rx.test(s)) return id;
  return 'general';
};

// ─── Trends curados (Q1-Q2 2026) ────────────────────────────────────────────
const TRENDS_IG = [
  'storytelling-real',
  'pov-niche',
  'b-roll-rapid',
  'voiceover-itinerario',
  'before-after',
  'tutorial-step',
  'save-bait-list',
  'meme-format',
  'green-screen',
];
const TRENDS_TT = [
  'pov-niche',
  'tutorial-step',
  'storytime',
  'duet-react',
  'green-screen',
  'trend-sound',
  'meme-format',
  'transition-snap',
  'silent-trend',
  'before-after',
  'lipsync-niche',
];

const matchTrends = (platform, trendKeywords) => {
  const pool = platform === 'tiktok' ? TRENDS_TT : TRENDS_IG;
  const kws = (trendKeywords || []).map((k) => String(k).toLowerCase());
  return pool.filter((t) => kws.some((k) => t.includes(k) || k.includes(t.split('-')[0])));
};

// ─── Scorers de algoritmo ───────────────────────────────────────────────────
const scoreHook = (hook) => {
  if (!hook) return { score: 0, note: 'Sin hook explícito' };
  const h = String(hook).trim();
  const words = h.split(/\s+/).filter(Boolean).length;
  let s = 0;
  const r = [];
  if (words >= 4 && words <= 12) {
    s += 35;
    r.push('long óptima');
  } else if (words <= 20) {
    s += 18;
    r.push('long OK');
  }
  if (/\d/.test(h)) {
    s += 18;
    r.push('dato');
  }
  if (/^¿|^cómo|^por qué|^pov|^no |^nunca |^paré/i.test(h)) {
    s += 18;
    r.push('apertura potente');
  }
  if (/!|increíble|wow/i.test(h)) {
    s += 10;
    r.push('emoción');
  }
  if (/hoy te traigo|sabías que|en la era/i.test(h)) {
    s -= 25;
    r.push('⚠ débil');
  }
  if (/secreto|truco|hack|nadie te dice/i.test(h)) {
    s += 12;
    r.push('curiosity gap');
  }
  return { score: clamp(s), note: r.join(' · ') };
};

const scoreFormatFit = (platform, format) => {
  const map =
    platform === 'instagram'
      ? { reel: 92, carrusel: 88, 'post-imagen': 55, story: 58, foto: 50, video: 70 }
      : { video: 92, foto: 78, carrusel: 64, reel: 80, story: 50, 'post-imagen': 50 };
  return { score: format ? (map[format] ?? 60) : 60, note: format ? `${format} en ${platform}` : 'sin formato' };
};

const scoreCaptionHook = (caption) => {
  if (!caption) return { score: 30, note: 'Sin caption' };
  const fl = String(caption).split('\n')[0] || '';
  let s = 0;
  if (fl.length > 0 && fl.length <= 85) s += 35;
  if (/[?¿]/.test(fl)) s += 20;
  if (/\d/.test(fl)) s += 18;
  if (caption.length > 200 && caption.length < 1500) s += 12;
  if (/hoy te traigo|sabías/i.test(fl)) s -= 20;
  return { score: clamp(s), note: `1ª línea ${fl.length}c` };
};

const scoreSaveSend = (platform, format, caption) => {
  let s = 30;
  const c = (caption || '').toLowerCase();
  if (platform === 'instagram') {
    if (format === 'carrusel') s += 25;
    if (/guarda|guardalo/.test(c)) s += 15;
    if (/comparti|mandáselo/.test(c)) s += 15;
    if (/^\s*[1-9][.)]/m.test(caption || '')) s += 10;
  } else {
    if (/esperá|al final/.test(c)) s += 18;
    if (/comentá/.test(c)) s += 12;
  }
  return { score: clamp(s), note: 'triggers' };
};

const scoreHashtags = (platform, hashtags) => {
  const tags = (hashtags || []).filter((t) => String(t).startsWith('#'));
  if (platform === 'instagram') {
    if (!tags.length) return { score: 40, note: 'Sin hashtags' };
    if (tags.length > 25) return { score: 25, note: 'Spam-risk' };
    if (tags.length >= 5 && tags.length <= 12) return { score: 85, note: `${tags.length} pirámide OK` };
    return { score: 60, note: `${tags.length} subóptimo` };
  }
  if (tags.length >= 2 && tags.length <= 6) return { score: 80, note: `${tags.length} TT-search` };
  if (!tags.length) return { score: 55, note: 'Sin keyword-tag' };
  return { score: 50, note: `${tags.length} muchos para TT` };
};

const scoreSound = (platform, sound, trendSound) => {
  if (platform !== 'tiktok') return { score: trendSound ? 80 : 70, note: 'IG menos relevante' };
  if (trendSound) return { score: 92, note: 'Trending sound (cold-FYP boost)' };
  if (!sound) return { score: 35, note: 'Sin sonido' };
  if (/trending|trend/i.test(sound)) return { score: 90, note: 'Trending' };
  return { score: 65, note: 'Original' };
};

const scoreLength = (platform, format, dur) => {
  if (!dur) return { score: 60, note: 'No provista' };
  if (platform === 'tiktok') {
    if (dur <= 15) return { score: 85, note: `${dur}s óptimo` };
    if (dur <= 30) return { score: 90, note: `${dur}s sweet spot` };
    if (dur <= 60) return { score: 70, note: `${dur}s OK` };
    if (dur <= 90) return { score: 55, note: `${dur}s riesgo` };
    return { score: 40, note: `${dur}s largo` };
  }
  if (format === 'reel') {
    if (dur >= 7 && dur <= 30) return { score: 88, note: `${dur}s ideal Reel` };
    if (dur <= 60) return { score: 70, note: `${dur}s OK` };
    return { score: 50, note: `${dur}s largo` };
  }
  return { score: 65, note: 'No-video' };
};

const scoreSubtitles = (platform, format, has, hasOnScreenText) => {
  if (!format || !['reel', 'video'].includes(format)) return { score: 75, note: 'N/A' };
  if (has === true && hasOnScreenText === true) return { score: 95, note: 'Subs + texto pantalla' };
  if (has === true) return { score: 88, note: 'Subs ok' };
  if (has === undefined) return { score: 60, note: 'No confirmado' };
  return { score: 30, note: '⚠ Sin subs (mute mata)' };
};

const scoreTiming = (postingTime) => {
  if (!postingTime) return { score: 60, note: 'Sin horario' };
  const m = String(postingTime).match(/(\d{1,2}):/);
  if (!m) return { score: 60, note: 'Formato no parseable' };
  const h = parseInt(m[1], 10);
  if ((h >= 8 && h <= 10) || (h >= 12 && h <= 14) || (h >= 19 && h <= 22))
    return { score: 90, note: `${h}h banda top` };
  return { score: 55, note: `${h}h fuera de top` };
};

const scoreLoop = (hasLoopClose, format) => {
  if (!['reel', 'video'].includes(format)) return { score: 70, note: 'N/A' };
  return hasLoopClose ? { score: 92, note: 'Loop cierra → rewatch' } : { score: 45, note: 'Sin loop' };
};

const scoreFaceVisible = (hasFaceVisible) =>
  hasFaceVisible === true
    ? { score: 85, note: 'Rostro visible → trust' }
    : hasFaceVisible === false
      ? { score: 50, note: 'Sin cara' }
      : { score: 65, note: 'No confirmado' };

// ─── Scorers de comportamiento humano ───────────────────────────────────────
const scoreNovelty = (n) => {
  const v = Number.isFinite(n) ? clamp(n) : 50;
  return { score: v, note: v >= 70 ? 'novedad alta' : v >= 40 ? 'novedad media' : 'visto antes' };
};
const scoreEmotion = (peak) => {
  const map = {
    humor: 85,
    asombro: 80,
    indignacion: 78,
    ternura: 75,
    miedo: 72,
    'envidia-aspiracional': 70,
    ninguno: 35,
  };
  const v = map[peak] ?? 50;
  return { score: v, note: `emoción: ${peak || 'no marcada'}` };
};
const scoreContrast = (c) => {
  const v = Number.isFinite(c) ? clamp(c) : 55;
  return { score: v, note: v >= 70 ? 'contraste fuerte' : v >= 40 ? 'contraste medio' : 'plano visual' };
};
const scoreCliffhanger = (has, hasPI) => {
  if (has && hasPI) return { score: 92, note: 'Cliffhanger + pattern interrupt' };
  if (has) return { score: 80, note: 'Cliffhanger' };
  if (hasPI) return { score: 72, note: 'Pattern interrupt' };
  return { score: 40, note: 'Sin ganchos de retención' };
};

const scoreTrendBoost = (platform, trendKeywords, trendSound) => {
  const matched = matchTrends(platform, trendKeywords);
  let s = 40 + matched.length * 12;
  if (trendSound) s += 15;
  return { score: clamp(s), note: matched.length ? `match: ${matched.join(', ')}` : 'sin trend-match', matched };
};

// ─── Tiers + Posterior ──────────────────────────────────────────────────────
const tierFromScore = (s) => {
  if (s >= 82) return 'viral-potential';
  if (s >= 65) return 'alta';
  if (s >= 45) return 'media';
  return 'baja';
};

// ─── Reach / engagement ─────────────────────────────────────────────────────
const reachRange = (platform, score, coldScore, followers, nicheId) => {
  const b = NICHE_BENCH[nicheId][platform === 'tiktok' ? 'tt' : 'ig'];
  const f = score / 50;
  const coldF = coldScore / 50;
  const warm = followers > 0 ? followers * 0.35 * f * b.reachX : 0;
  const coldBase = platform === 'tiktok' ? 1800 * coldF * b.reachX : 600 * coldF * b.reachX;
  const mid = Math.round(warm + coldBase);
  return {
    low: Math.round(mid * 0.45),
    mid,
    high: Math.round(mid * (platform === 'tiktok' ? 6.5 : 4.2)),
  };
};

const engRange = (platform, score, nicheId) => {
  const b = NICHE_BENCH[nicheId][platform === 'tiktok' ? 'tt' : 'ig'];
  const f = Math.max(0.4, Math.min(2.2, score / 50));
  const mid = b.er * f;
  return { ratePct: { low: +(mid * 0.6).toFixed(1), mid: +mid.toFixed(1), high: +(mid * 1.5).toFixed(1) } };
};

const followersGained = (platform, reach, score) => {
  const profileViewRate = (platform === 'tiktok' ? 0.045 : 0.038) * (score / 60);
  const followRate = 0.18 * (score / 70);
  const mid = Math.round(reach.mid * profileViewRate * followRate);
  return { low: Math.round(mid * 0.4), mid, high: Math.round(mid * 3.2) };
};

// ─── Monte Carlo posterior (N=400) ──────────────────────────────────────────
const monteCarloPosterior = (signals, N = 400, noise = 0.12) => {
  const totalW = signals.reduce((a, s) => a + s.weight, 0);
  const out = new Array(N);
  for (let i = 0; i < N; i++) {
    let s = 0;
    for (const sig of signals) {
      const j = (Math.random() - 0.5) * 2 * noise * sig.score;
      s += clamp(sig.score + j) * sig.weight;
    }
    out[i] = s / totalW;
  }
  out.sort((a, b) => a - b);
  const q = (p) => out[Math.max(0, Math.min(N - 1, Math.floor(p * N)))];
  const viralCount = out.filter((x) => x >= 80).length;
  const failCount = out.filter((x) => x < 40).length;
  return {
    p10: round(q(0.1)),
    p50: round(q(0.5)),
    p90: round(q(0.9)),
    viralProbability: round((viralCount / N) * 100),
    failureRiskPct: round((failCount / N) * 100),
  };
};

const defaultFix = (name, platform) => {
  const t = {
    'Hook 0-2s':
      platform === 'tiktok'
        ? 'Triple capa hook (verbal + visual + texto on-screen). Pattern interrupt en frame 0.'
        : 'Hook visual primer 0.3s + texto. Promesa concreta en 6-12 palabras.',
    'Format-platform fit':
      platform === 'tiktok' ? 'Pasá a 9:16 nativo TT.' : 'Carrusel para saves, Reel para alcance frío.',
    'Caption 1ª línea': 'Idea fuerte en primeros 85c antes de "…más".',
    'Save/Send triggers': 'CTA explícito de guardar/compartir + pregunta concreta.',
    'Hashtags / Search keywords':
      platform === 'instagram'
        ? 'Pirámide 3 nicho + 3 medio + 2 amplio.'
        : '2-4 keywords del nicho en caption + on-screen.',
    'Sonido / Audio': 'Trending de las 48h del trend, adaptado al nicho.',
    Duración: platform === 'tiktok' ? '15-30s para max completion.' : 'Reel 15-30s.',
    'Subtítulos + texto pantalla': 'Quemar subs + texto pantalla on-frame.',
    'Horario de publicación': 'Banda 8-10 / 12-14 / 19-22.',
    'Loop de cierre': 'Última línea reconecta con frame 0.',
    'Rostro visible': 'Cara en frame 0-3s genera trust.',
    'Novedad / Originalidad': 'Buscá ángulo no visto en últimas 2 sem del nicho.',
    'Emoción pico': 'Detoná 1 emoción fuerte (humor/asombro/indignación) en el clímax.',
    'Contraste visual': 'Más cortes, color, escala dramática.',
    'Cliffhanger + Pattern Interrupt': 'Abrir un loop en seg 3 que cierre al final.',
    'Trend match (sound + keywords)': 'Subite a 1 trend del nicho en su ventana de 48-72h.',
  };
  return t[name] || 'Optimizá esta señal según doctrina.';
};

const predictedLift = (score, weight) => {
  if (score >= 70) return '+3-6%';
  if (score >= 50) return '+8-15%';
  return weight > 1.3 ? '+18-35%' : '+10-20%';
};

const COLD_FYP_SIGNALS = new Set([
  'Hook 0-2s',
  'Format-platform fit',
  'Sonido / Audio',
  'Duración',
  'Subtítulos + texto pantalla',
  'Loop de cierre',
  'Rostro visible',
  'Novedad / Originalidad',
  'Emoción pico',
  'Contraste visual',
  'Cliffhanger + Pattern Interrupt',
  'Trend match (sound + keywords)',
  'Caption 1ª línea',
]);

const computeColdScore = (signals) => {
  const sub = signals.filter((s) => COLD_FYP_SIGNALS.has(s.name));
  const w = sub.reduce((a, s) => a + s.weight, 0);
  if (!w) return 0;
  return Math.round(clamp(sub.reduce((a, s) => a + s.score * s.weight, 0) / w));
};

// ─── Predict principal v2 ───────────────────────────────────────────────────
export const heuristicPredict = (input) => {
  const p = input.platform === 'tiktok' ? 'tiktok' : 'instagram';
  const nicheId = normalizeNiche(input.niche);

  const trendOut = scoreTrendBoost(p, input.trendKeywords || [], !!input.trendSound);

  const signals = [
    { ...scoreHook(input.hook), name: 'Hook 0-2s', weight: 2.0, category: 'algo' },
    { ...scoreFormatFit(p, input.format), name: 'Format-platform fit', weight: 1.5, category: 'algo' },
    { ...scoreCaptionHook(input.caption), name: 'Caption 1ª línea', weight: 1.2, category: 'algo' },
    { ...scoreSaveSend(p, input.format, input.caption), name: 'Save/Send triggers', weight: 1.6, category: 'algo' },
    { ...scoreHashtags(p, input.hashtags), name: 'Hashtags / Search keywords', weight: 1.0, category: 'algo' },
    {
      ...scoreSound(p, input.sound, !!input.trendSound),
      name: 'Sonido / Audio',
      weight: p === 'tiktok' ? 1.6 : 0.5,
      category: 'algo',
    },
    { ...scoreLength(p, input.format, input.durationSec), name: 'Duración', weight: 1.2, category: 'algo' },
    {
      ...scoreSubtitles(p, input.format, input.hasSubtitles, input.hasOnScreenText),
      name: 'Subtítulos + texto pantalla',
      weight: 1.0,
      category: 'production',
    },
    { ...scoreTiming(input.postingTime), name: 'Horario de publicación', weight: 0.8, category: 'algo' },
    { ...scoreLoop(input.hasLoopClose, input.format), name: 'Loop de cierre', weight: 1.4, category: 'retention' },
    { ...scoreFaceVisible(input.hasFaceVisible), name: 'Rostro visible', weight: 1.0, category: 'production' },
    // human behavior
    { ...scoreNovelty(input.novelty), name: 'Novedad / Originalidad', weight: 1.5, category: 'human' },
    { ...scoreEmotion(input.emotionPeak), name: 'Emoción pico', weight: 1.5, category: 'human' },
    { ...scoreContrast(input.contrastVisual), name: 'Contraste visual', weight: 1.0, category: 'human' },
    {
      ...scoreCliffhanger(input.hasCliffhanger, input.hasPatternInterrupt),
      name: 'Cliffhanger + Pattern Interrupt',
      weight: 1.4,
      category: 'human',
    },
    // trend
    {
      score: trendOut.score,
      note: trendOut.note,
      name: 'Trend match (sound + keywords)',
      weight: 1.3,
      category: 'trend',
    },
  ];

  const totalW = signals.reduce((a, s) => a + s.weight, 0);
  const overall = clamp(signals.reduce((a, s) => a + s.score * s.weight, 0) / totalW);
  const score = Math.round(overall);

  const posterior = monteCarloPosterior(signals);
  const coldScore = computeColdScore(signals);
  const reach = reachRange(p, score, coldScore, input.followers || 0, nicheId);
  const eng = engRange(p, score, nicheId);
  const followers = followersGained(p, reach, score);

  const ranked = [...signals].sort((a, b) => a.score * a.weight - b.score * b.weight);
  const topFixes = ranked.slice(0, 4).map((s) => ({
    issue: `${s.name}: ${s.score}/100 · ${s.note}`,
    recommendation: defaultFix(s.name, p),
    predictedLift: predictedLift(s.score, s.weight),
  }));

  const presentCount = [
    'hook',
    'caption',
    'hashtags',
    'format',
    'durationSec',
    'followers',
    'emotionPeak',
    'novelty',
    'contrastVisual',
  ].filter((k) => input[k] != null && input[k] !== '' && !(Array.isArray(input[k]) && input[k].length === 0)).length;
  const confidence = presentCount >= 7 ? 'alta' : presentCount >= 4 ? 'media' : 'baja';

  const autoPublishReady = score >= 70 && posterior.viralProbability >= 25 && posterior.failureRiskPct <= 10;
  const decisionHint = {
    autoPublishReady,
    rationale: autoPublishReady
      ? `Listo para auto-publicar (score ${score}, viral ${posterior.viralProbability}%, flop ${posterior.failureRiskPct}%).`
      : `No pasa gate auto: ${score < 70 ? `score ${score}<70 ` : ''}${posterior.viralProbability < 25 ? `· viral ${posterior.viralProbability}%<25% ` : ''}${posterior.failureRiskPct > 10 ? `· flop ${posterior.failureRiskPct}%>10% ` : ''}`.trim(),
  };

  const nicheB = NICHE_BENCH[nicheId][p === 'tiktok' ? 'tt' : 'ig'];

  return {
    v: 2,
    platform: p,
    score,
    tier: tierFromScore(score),
    signals,
    expectedReach: reach,
    expectedEngagement: eng,
    expectedFollowersGained: followers,
    topFixes,
    confidence,
    viralProbability: posterior.viralProbability,
    failureRiskPct: posterior.failureRiskPct,
    coldDistributionScore: coldScore,
    distributionPosterior: { p10: posterior.p10, p50: posterior.p50, p90: posterior.p90 },
    nicheCalibration: {
      niche: nicheId,
      benchmarkER: nicheB.er,
      reachMultiplier: nicheB.reachX,
      note: NICHE_BENCH[nicheId].note,
    },
    trendBoosts: { matched: trendOut.matched, soundTrend: !!input.trendSound, bonus: trendOut.score - 40 },
    humanBehaviorBreakdown: {
      novelty: scoreNovelty(input.novelty).score,
      contrast: scoreContrast(input.contrastVisual).score,
      emotion: scoreEmotion(input.emotionPeak).score,
      cliffhanger: scoreCliffhanger(input.hasCliffhanger, input.hasPatternInterrupt).score,
      loop: scoreLoop(input.hasLoopClose, input.format).score,
    },
    decisionHint,
    meta: {
      benchmarks: nicheB,
      mcSamples: 400,
      note: 'Predictor v2 · heurística + Monte Carlo + niche benchmarks + trends + comportamiento humano.',
    },
  };
};
