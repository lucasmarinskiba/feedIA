/* ══════════════════════════════════════════════════════════════════════════════
   BRÚJULA DEL DÍA — Herramienta clave Tu Casa
   ──────────────────────────────────────────────────────────────────────────────
   Estratega diario: lee platform switcher (IG/TT), genera el mejor próximo
   movimiento del día, predice virality, da 3 hook variants, ventana óptima
   de publicación, y CTA directo a Studio para crear.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const GOAL_PRESETS = [
  { id: 'awareness', emoji: '👁️', label: 'Llegar a más gente', desc: 'Maximizar alcance' },
  { id: 'engagement', emoji: '💜', label: 'Más interacción', desc: 'Comentarios + saves' },
  { id: 'conversion', emoji: '💰', label: 'Vender', desc: 'Convertir a cliente' },
  { id: 'community', emoji: '🤝', label: 'Comunidad', desc: 'Conectar con seguidores' },
  { id: 'sales', emoji: '🛒', label: 'Lanzar producto', desc: 'Push a oferta' },
];

const getPlatform = async () => {
  try {
    const mod = await import('../lib/platform.js');
    return mod.getPlatform();
  } catch {
    return 'instagram';
  }
};

let activeGoal = 'engagement';
let activeTopic = '';
let activeAccountId = '';
let activeNiche = '';
let activeBrandType = 'personal';
let cachedPlan = null;
let cachedPrediction = null;

const renderHero = (platform) => {
  const isIg = platform === 'instagram';
  const isTt = platform === 'tiktok';
  const platformLabel = isIg ? 'Instagram' : isTt ? 'TikTok' : 'tu marca';
  const accent = isIg
    ? 'linear-gradient(135deg,#f09433,#dc2743,#bc1888)'
    : isTt
      ? 'linear-gradient(135deg,#25F4EE,#000,#FE2C55)'
      : 'linear-gradient(135deg,#6366f1,#a855f7)';
  return `
    <div class="bj-hero" style="background:${accent};">
      <div class="bj-hero-emoji">🧭</div>
      <div>
        <h1>Brújula del Día</h1>
        <p>El movimiento más inteligente para tu cuenta de ${escape(platformLabel)}, hoy.</p>
      </div>
    </div>`;
};

const renderInputForm = (platform) => {
  const isIg = platform === 'instagram';
  const placeholder = isIg
    ? 'Ej: "mi nuevo curso de productividad", "mi error más grande", "3 tips de IA"'
    : 'Ej: "rutina de mañana de 5 min", "secreto que nadie cuenta", "viral challenge"';
  return `
  <div class="bj-card">
    <div class="bj-step-label">¿Sobre qué vas a publicar hoy?</div>
    <input id="bj-topic" class="bj-input" type="text"
      placeholder='${placeholder}' value="${escape(activeTopic)}" />
    <div id="bj-topic-hint" class="bj-topic-hint" style="display:none;"></div>
    <div class="bj-step-label" style="margin-top:16px;">¿Cuál es tu objetivo?</div>
    <div class="bj-goals">
      ${GOAL_PRESETS.map(
        (g) => `
        <button class="bj-goal ${g.id === activeGoal ? 'active' : ''}" data-goal="${g.id}">
          <span class="bj-goal-emoji">${g.emoji}</span>
          <span class="bj-goal-label">${escape(g.label)}</span>
          <span class="bj-goal-desc">${escape(g.desc)}</span>
        </button>`,
      ).join('')}
    </div>
    <details class="bj-account-box">
      <summary class="bj-account-sum">👤 Mi cuenta <span class="bj-account-hint">— opcional: el sistema recuerda tu nicho y aprende de tus resultados</span></summary>
      <div class="bj-account-fields">
        <input id="bj-account" class="bj-input bj-input-sm" type="text" placeholder='@tucuenta (para activar memoria y aprendizaje)' value="${escape(activeAccountId)}" />
        <div class="bj-account-row">
          <input id="bj-niche" class="bj-input bj-input-sm" type="text" placeholder='Nicho (ej: fitness, finanzas, humor)' value="${escape(activeNiche)}" />
          <select id="bj-brandtype" class="bj-input bj-input-sm">
            <option value="personal"${activeBrandType === 'personal' ? ' selected' : ''}>Marca personal</option>
            <option value="business"${activeBrandType === 'business' ? ' selected' : ''}>Marca empresarial</option>
          </select>
        </div>
      </div>
    </details>
    <button class="bj-btn bj-btn-primary" id="bj-go">🧭 Analizar y generar mi plan</button>
  </div>`;
};

const AUTOMATION_MAP = {
  carousel: { label: '🎨 Crear carrusel', route: 'studio-carousel' },
  reel: { label: '🎬 Crear Reel', route: 'studio-reel' },
  stories: { label: '📱 Crear Stories', route: 'studio-stories' },
  schedule: { label: '📅 Programar post', route: 'scheduler' },
  hashtags: { label: '#️⃣ Estrategia hashtags', endpoint: '/api/hashtags/strategy' },
  'ab-test': { label: '🧪 A/B Test hooks', endpoint: '/api/ab-tests' },
  'dm-template': { label: '💬 Auto DM', route: 'inbox' },
  competitor: { label: '🔍 Ver competidores', route: 'studio-manager' },
};

// Fallback dims (Instagram) — backend sends platform-specific matrixDims
const MATRIX_DIMS_IG = [
  { key: 'hook', label: 'Hook', weight: 25 },
  { key: 'saves', label: 'Saves signal', weight: 20 },
  { key: 'algorithm', label: 'Algoritmo IG', weight: 18 },
  { key: 'audience', label: 'Audiencia', weight: 15 },
  { key: 'conversion', label: 'Conversión', weight: 12 },
  { key: 'production', label: 'Producción', weight: 7 },
  { key: 'timing', label: 'Timing', weight: 3 },
];
const MATRIX_DIMS_TT = [
  { key: 'hook', label: 'Hook (3s)', weight: 30 },
  { key: 'completion', label: 'Completion %', weight: 28 },
  { key: 'sound', label: 'Audio trend', weight: 15 },
  { key: 'shareability', label: 'Shareability', weight: 12 },
  { key: 'audience', label: 'Audiencia', weight: 10 },
  { key: 'production', label: 'Producción', weight: 3 },
  { key: 'timing', label: 'Timing FYP', weight: 2 },
];

const fmtNum = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : String(n));

// Simplified minimal predictions card — shown AFTER the full plan
const renderPredictionsCard = (pred) => {
  if (!pred) return '';
  const {
    viralScore,
    ceilingScore,
    contentScore,
    contentDecision,
    monteCarlo,
    improvements,
    predicted,
    optimizationGap = 0,
    platform: predPlat,
    disclaimer,
    honestAnalysis,
    confidence,
  } = pred;
  const isTT = predPlat === 'tiktok';
  const viralCls =
    viralScore >= 85
      ? 'bj-vclass-breakout'
      : viralScore >= 70
        ? 'bj-vclass-high'
        : viralScore >= 55
          ? 'bj-vclass-solid'
          : 'bj-vclass-low';
  const decisionCls =
    contentDecision === 'GO' ? 'bj-d-go' : contentDecision === 'CONDITIONAL' ? 'bj-d-cond' : 'bj-d-nogo';

  // Reach range — single bar p10→p90
  const p10 = monteCarlo?.p10 || 0;
  const p50 = monteCarlo?.p50 || 0;
  const p90 = monteCarlo?.p90 || 1;
  const pct50 = p90 > 0 ? Math.round((p50 / p90) * 100) : 50;

  // Top 2 critical/high improvements only
  const topImps = (improvements || [])
    .filter((i) => typeof i === 'object' && ['CRÍTICA', 'alta'].includes(i.priority))
    .slice(0, 2);

  const impHtml = topImps.length
    ? topImps
        .map((i) => {
          const priCls = i.priority === 'CRÍTICA' ? 'bj-imp-critical' : 'bj-imp-high';
          return `<div class="bj-pred-imp ${priCls}"><span class="bj-imp-pri">${escape(i.priority)}</span><span class="bj-imp-body">${escape(i.action)}</span>${i.impact ? `<span class="bj-imp-impact">${escape(i.impact)}</span>` : ''}</div>`;
        })
        .join('')
    : '';

  const verdictHtml = honestAnalysis?.honestVerdict
    ? `<div class="bj-pred-verdict-simple">"${escape(honestAnalysis.honestVerdict)}"</div>`
    : '';

  return `
    <div class="bj-pred-minimal">
      <div class="bj-pred-min-header">
        <span class="bj-pred-min-title">📊 Predicciones</span>
        <span class="bj-pred-min-sub">${isTT ? 'modelo TikTok FYP' : 'modelo Instagram'} · confianza ${confidence != null ? Math.round(confidence * 100) + '%' : '~55%'}</span>
      </div>

      <div class="bj-pred-min-row">
        <div class="bj-pred-min-score">
          <div class="bj-pred-gauge" style="--vs:${viralScore}%;width:64px;height:64px;">
            <span class="bj-pred-vn" style="width:50px;height:50px;font-size:18px;">${viralScore}</span>
          </div>
          <span class="bj-pred-vlbl ${viralCls}" style="font-size:9px;">viral score</span>
        </div>
        <div class="bj-pred-dbox ${decisionCls}" style="min-width:70px;">
          <span class="bj-pred-dbadge">${contentDecision}</span>
          <span class="bj-pred-dscore">${contentScore}/100</span>
          <span class="bj-pred-dtitle">score</span>
        </div>
        <div class="bj-pred-min-metrics">
          <div class="bj-pred-min-met"><strong>${fmtNum(predicted?.reach || 0)}</strong><span>👁️ alcance</span></div>
          ${predicted?.completion != null ? `<div class="bj-pred-min-met"><strong>${(predicted.completion * 100).toFixed(0)}%</strong><span>▶️ completion</span></div>` : `<div class="bj-pred-min-met"><strong>${((predicted?.engagementRate || 0) * 100).toFixed(1)}%</strong><span>💜 engagement</span></div>`}
          ${predicted?.likes != null ? `<div class="bj-pred-min-met"><strong>${fmtNum(predicted.likes)}</strong><span>❤️ likes</span></div>` : ''}
          ${predicted?.saves != null ? `<div class="bj-pred-min-met"><strong>${fmtNum(predicted.saves)}</strong><span>🔖 guardados</span></div>` : ''}
          ${predicted?.comments != null ? `<div class="bj-pred-min-met"><strong>${fmtNum(predicted.comments)}</strong><span>💬 comentarios</span></div>` : ''}
          ${predicted?.shares != null ? `<div class="bj-pred-min-met"><strong>${fmtNum(predicted.shares)}</strong><span>🔁 compartidos</span></div>` : ''}
          ${predicted?.follows != null ? `<div class="bj-pred-min-met"><strong>${fmtNum(predicted.follows)}</strong><span>➕ follows</span></div>` : ''}
        </div>
      </div>

      <div class="bj-pred-range">
        <span class="bj-pred-range-lbl">Rango de alcance</span>
        <div class="bj-pred-range-bar">
          <div class="bj-pred-range-fill" style="width:${pct50}%;"></div>
          <div class="bj-pred-range-dot" style="left:${pct50}%;"></div>
        </div>
        <div class="bj-pred-range-vals">
          <span style="color:#ef4444;">${fmtNum(p10)} mín</span>
          <span style="color:#a855f7;">${fmtNum(p50)} probable</span>
          <span style="color:#10b981;">${fmtNum(p90)} óptimo</span>
        </div>
      </div>

      ${verdictHtml}
      ${impHtml ? `<div class="bj-pred-imps" style="margin-top:10px;">${impHtml}</div>` : ''}
      ${disclaimer ? `<div class="bj-pred-disclaimer">${escape(disclaimer)}</div>` : ''}
    </div>`;
};

const renderIgPlans = (igPlans, plan, enriched) => {
  const score = igPlans?._viralScore ?? plan?.strategicScore ?? 80;
  const scoreCls = score >= 85 ? 'bj-hp-s-hot' : score >= 70 ? 'bj-hp-s-good' : 'bj-hp-s-ok';

  // ── Carrusel ──
  const carousel = igPlans?.carousel || null;
  const carousels = Array.isArray(igPlans?.carousels) && igPlans.carousels.length >= 1 ? igPlans.carousels : null;

  const renderSlideList = (slsList) => {
    const total = slsList.length;
    const roleColor = (role) => (role === 'hook' ? 'bj-ig-slide-hook' : role === 'cta' ? 'bj-ig-slide-cta' : '');
    const roleLabel = (role, idx) => {
      if (idx === 0 || role === 'hook') return '🎣 Título';
      if (idx === total - 1 || role === 'cta') return '📣 CTA';
      return '📌';
    };
    return slsList
      .map(
        (sl, idx) => `
      <div class="bj-ig-slide ${roleColor(sl.role)}">
        <div class="bj-ig-slide-num">
          <div class="bj-ig-slide-n">${idx + 1}</div>
          <div class="bj-ig-slide-nof">${idx + 1}/${total}</div>
          <div class="bj-ig-slide-role-badge">${roleLabel(sl.role, idx)}</div>
        </div>
        <div class="bj-ig-slide-body">
          ${sl.title ? `<div class="bj-ig-slide-title">${escape(sl.title)}</div>` : ''}
          ${sl.subtitle || sl.body ? `<div class="bj-ig-slide-subtitle">${escape(sl.subtitle || sl.body)}</div>` : ''}
          ${sl.bodyText ? `<div class="bj-ig-slide-bodytext">${escape(sl.bodyText)}</div>` : ''}
          ${sl.imageText ? `<div class="bj-ig-slide-imgtext">✏️ ${escape(sl.imageText)}</div>` : ''}
          ${sl.visual ? `<div class="bj-ig-slide-visual">🖼️ ${escape(sl.visual)}</div>` : ''}
        </div>
      </div>`,
      )
      .join('');
  };

  const renderCarouselCol = (cv, colIdx) => {
    const sls = cv?.slides || [];
    const hook = cv?.captionHook || cv?.hook || '';
    const cta = cv?.captionCTA || '';
    const angle = cv?.angle || `Opción ${colIdx + 1}`;
    return `
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${colIdx + 1}</span>
          <span class="bj-car-col-angle">${escape(angle)}</span>
          <span class="bj-car-col-count">${sls.length} slides</span>
        </div>
        ${
          hook
            ? `<div class="bj-ig-caption-block bj-car-caption">
          <div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">📢 Hook</span><span class="bj-ig-caption-text">${escape(hook)}</span></div>
          ${cta ? `<div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">📣 CTA</span><span class="bj-ig-caption-cta">${escape(cta)}</span></div>` : ''}
        </div>`
            : ''
        }
        <div class="bj-ig-slides">${renderSlideList(sls)}</div>
      </div>`;
  };

  const renderCarousel = () => {
    if (carousels) {
      return `
        <div class="bj-ig-tab-panel" id="bj-ig-carousel">
          <div class="bj-car-grid">
            ${carousels.map((cv, i) => renderCarouselCol(cv, i)).join('')}
          </div>
        </div>`;
    }
    // Fallback — single carousel
    const sls = carousel?.slides || [];
    const hook = carousel?.captionHook || carousel?.hook || '';
    const cta = carousel?.captionCTA || '';
    return `
      <div class="bj-ig-tab-panel" id="bj-ig-carousel">
        <div class="bj-ig-carousel-header">
          <div class="bj-ig-slide-count">${sls.length} slides</div>
        </div>
        ${
          hook
            ? `<div class="bj-ig-caption-block">
          <div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">📢 Caption hook</span><span class="bj-ig-caption-text">${escape(hook)}</span></div>
          ${cta ? `<div class="bj-ig-caption-row"><span class="bj-ig-caption-tag">📣 CTA caption</span><span class="bj-ig-caption-cta">${escape(cta)}</span></div>` : ''}
        </div>`
            : ''
        }
        <div class="bj-ig-slides">${renderSlideList(sls)}</div>
      </div>`;
  };

  // ── Reel ──
  const reel = igPlans?.reel || null;
  const reels = Array.isArray(igPlans?.reels) && igPlans.reels.length >= 1 ? igPlans.reels : null;

  const renderBeat = (b, bi) => {
    const text = typeof b === 'string' ? b : b?.text || '';
    const onScreen = typeof b === 'object' ? b.onScreen || '' : '';
    const visual = typeof b === 'object' ? b.visual || '' : '';
    return `<div class="bj-reel-beat">
      <span class="bj-hp-bn">${bi + 1}</span>
      <div class="bj-reel-beat-body">
        <div class="bj-reel-beat-text">${escape(text)}</div>
        ${onScreen ? `<div class="bj-reel-beat-onscreen">📝 ${escape(onScreen)}</div>` : ''}
        ${visual ? `<div class="bj-reel-beat-visual">🎬 ${escape(visual)}</div>` : ''}
      </div>
    </div>`;
  };

  const renderSingleReel = (rv, colIdx) => {
    const hl = rv?.hookLayer || {};
    const sc = rv?.script || {};
    const hooks = Array.isArray(rv?.hooks) ? rv.hooks : rv?.hook ? [{ text: rv.hook, style: '' }] : [];
    const angle = rv?.angle || `Opción ${colIdx + 1}`;
    return `
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${colIdx + 1}</span>
          <span class="bj-car-col-angle">${escape(angle)}</span>
        </div>
        ${
          hooks.length
            ? `<div class="bj-reel-hooks-sec">
          <div class="bj-hp-sec-h">🎣 Hook</div>
          <div class="bj-reel-hooks-list">
            ${hooks
              .map(
                (h, hi) => `
              <div class="bj-reel-hook-opt${hi === 0 ? ' best' : ''}">
                <div class="bj-reel-hook-opt-body">
                  <div class="bj-reel-hook-text">${escape(h.text || h)}</div>
                  ${h.style ? `<div class="bj-reel-hook-style">${escape(h.style)}</div>` : ''}
                </div>
              </div>`,
              )
              .join('')}
          </div>
        </div>`
            : ''
        }
        ${
          hl.videoText || hl.openingFrame || hl.imageDescription || hl.poseExpression
            ? `
        <div class="bj-hp-layers">
          <div class="bj-hp-sec-h">🎬 Primer frame</div>
          ${hl.videoText ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">📝 Pantalla</span><span class="bj-hp-screen">${escape(hl.videoText)}</span></div>` : ''}
          ${hl.openingFrame || hl.imageDescription ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">🖼️ Frame</span><span>${escape(hl.openingFrame || hl.imageDescription)}</span></div>` : ''}
          ${hl.poseExpression ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">🎭 Pose</span><span>${escape(hl.poseExpression)}</span></div>` : ''}
        </div>`
            : ''
        }
        ${
          sc.apertura || sc.beats?.length
            ? `
        <div class="bj-hp-script-sec">
          <div class="bj-hp-sec-h">📜 Guión</div>
          ${sc.apertura ? `<div class="bj-hp-apertura"><span class="bj-reel-time">0–3s</span>${escape(sc.apertura)}</div>` : ''}
          <div class="bj-reel-beats">${(sc.beats || []).map(renderBeat).join('')}</div>
          ${sc.cierre ? `<div class="bj-hp-cierre">🏁 ${escape(sc.cierre)}</div>` : ''}
        </div>`
            : ''
        }
        ${rv?.cta ? `<div class="bj-hp-cta-box">📣 ${escape(rv.cta)}</div>` : ''}
      </div>`;
  };

  const renderReel = () => {
    if (reels) {
      return `
        <div class="bj-ig-tab-panel" id="bj-ig-reel" hidden>
          <div class="bj-reel-score-row">
            <div class="bj-hp-score ${scoreCls}" style="--vs:${score}%;"><span class="bj-hp-score-n">${score}</span></div>
            <div class="bj-reel-label">Viral Score Reel</div>
          </div>
          <div class="bj-car-grid">
            ${reels.map((rv, i) => renderSingleReel(rv, i)).join('')}
          </div>
        </div>`;
    }
    // Fallback — single reel old style
    return `
      <div class="bj-ig-tab-panel" id="bj-ig-reel" hidden>
        <div class="bj-reel-score-row">
          <div class="bj-hp-score ${scoreCls}" style="--vs:${score}%;"><span class="bj-hp-score-n">${score}</span></div>
          <div class="bj-reel-label">Viral Score Reel</div>
        </div>
        ${reel ? renderSingleReel(reel, 0).replace('<div class="bj-car-col">', '<div class="bj-car-col" style="max-width:none;">') : '<div style="color:#7878a0;padding:12px;">No hay plan de Reel disponible.</div>'}
      </div>`;
  };

  // ── Stories ──
  const stories = igPlans?.stories || null;
  const storiesVariants =
    Array.isArray(igPlans?.storiesVariants) && igPlans.storiesVariants.length >= 1 ? igPlans.storiesVariants : null;

  const renderSingleStories = (sv, colIdx) => {
    const frames = sv?.frames || [];
    const angle = sv?.angle || `Opción ${colIdx + 1}`;
    const frameColor = (role) => (role === 'hook' ? 'bj-ig-frame-hook' : role === 'cta' ? 'bj-ig-frame-cta' : '');
    const mediaIcon = (type) => ({ video: '🎬', foto: '📷', texto: '📝', boomerang: '🔁' })[type] || '🖼️';
    return `
      <div class="bj-car-col">
        <div class="bj-car-col-header">
          <span class="bj-car-col-num">${colIdx + 1}</span>
          <span class="bj-car-col-angle">${escape(angle)}</span>
          <span class="bj-car-col-count">${frames.length} frames</span>
        </div>
        <div class="bj-ig-frames">
          ${frames
            .map(
              (fr) => `
            <div class="bj-ig-frame ${frameColor(fr.role)}">
              <div class="bj-ig-frame-num">
                <div class="bj-ig-frame-n">${fr.n}</div>
                ${fr.mediaType ? `<div class="bj-frame-mediatype">${mediaIcon(fr.mediaType)}${escape(fr.mediaType)}</div>` : ''}
                ${fr.duration ? `<div class="bj-frame-duration">${escape(fr.duration)}</div>` : ''}
              </div>
              <div class="bj-ig-frame-body">
                ${fr.onScreenText || fr.text ? `<div class="bj-frame-onscreen">${escape(fr.onScreenText || fr.text)}</div>` : ''}
                ${fr.supportText ? `<div class="bj-frame-support">${escape(fr.supportText)}</div>` : ''}
                ${fr.mediaDescription || fr.visual ? `<div class="bj-frame-mediadesc">🖼️ ${escape(fr.mediaDescription || fr.visual)}</div>` : ''}
                ${fr.sticker && fr.sticker !== 'ninguno' ? `<div class="bj-ig-frame-sticker">🎯 ${escape(fr.sticker)}</div>` : ''}
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
  };

  const renderStories = () => {
    if (storiesVariants) {
      return `
        <div class="bj-ig-tab-panel" id="bj-ig-stories" hidden>
          <div class="bj-car-grid">
            ${storiesVariants.map((sv, i) => renderSingleStories(sv, i)).join('')}
          </div>
        </div>`;
    }
    // Fallback — single stories
    return `
      <div class="bj-ig-tab-panel" id="bj-ig-stories" hidden>
        ${stories ? renderSingleStories(stories, 0) : '<div style="color:#7878a0;padding:12px;">No hay plan de Historia disponible.</div>'}
      </div>`;
  };

  return `
    <div class="bj-ig-plans-wrap">
      ${renderStrategyPanel(plan)}
      <div class="bj-block-label" style="margin-bottom:12px;">📱 Formatos Instagram — elegí cómo publicar</div>
      <div class="bj-ig-tabs">
        <button class="bj-ig-tab active" data-tab="carousel">🎠 Carrusel</button>
        <button class="bj-ig-tab" data-tab="reel">🎬 Reel</button>
        <button class="bj-ig-tab" data-tab="stories">📱 Historia</button>
      </div>
      ${renderCarousel()}
      ${renderReel()}
      ${renderStories()}
      ${renderCarouselBuilder(plan)}
    </div>`;
};

// ── Builder de carrusel — usa el plan/ángulo elegido + estética premium ──
const renderCarouselBuilder = (plan) => {
  const plans = (plan?.hookPlans || []).slice(0, 3);
  const fmt = plan?.recommendedFormat?.format || 'carrusel';
  return `
    <div class="bj-cb-card" id="bj-cb-card">
      <div class="bj-cb-head">
        <span class="bj-cb-emoji">🎨</span>
        <div>
          <div class="bj-cb-title">Generar carrusel con tu estética</div>
          <div class="bj-cb-sub">Elegí qué plan(es) usar · colores · tipografía · fondo · archivos · elementos. Formato base: <b>${escape(fmt)}</b></div>
        </div>
      </div>

      ${
        plans.length
          ? `
      <div class="bj-cb-plans">
        <div class="bj-cb-label">📋 Elegí 1 o más planes (cada uno = 1 carrusel generado)</div>
        <div class="bj-cb-plan-grid">
          ${plans
            .map(
              (p, i) => `
            <label class="bj-cb-plan ${i === 0 ? 'selected' : ''}">
              <input type="checkbox" class="bj-cb-plan-cb" data-idx="${i}" ${i === 0 ? 'checked' : ''} />
              <div class="bj-cb-plan-head">
                <span class="bj-cb-plan-badge">PLAN ${i + 1}${i === 0 ? ' · TOP' : ''}</span>
                <span class="bj-cb-plan-score">${p.viralScore || 80}/100</span>
              </div>
              <div class="bj-cb-plan-hook">${escape((p.hook || '').slice(0, 100))}</div>
            </label>`,
            )
            .join('')}
        </div>
      </div>`
          : ''
      }

      <div class="bj-cb-grid">
        <label class="bj-cb-field">
          <span>🎨 Color de letra</span>
          <div class="bj-cb-color-row">
            <input id="cb-text-color" type="color" value="#FFFFFF" />
            <input id="cb-text-color-text" type="text" class="bj-input bj-input-sm" placeholder="#FFFFFF" value="#FFFFFF" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>🖼️ Color de fondo</span>
          <div class="bj-cb-color-row">
            <input id="cb-bg-color" type="color" value="#0B0B0F" />
            <input id="cb-bg-color-text" type="text" class="bj-input bj-input-sm" placeholder="#0B0B0F" value="#0B0B0F" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>✨ Color de acento</span>
          <div class="bj-cb-color-row">
            <input id="cb-accent-color" type="color" value="#10F2B0" />
            <input id="cb-accent-color-text" type="text" class="bj-input bj-input-sm" placeholder="#10F2B0" value="#10F2B0" />
          </div>
        </label>
        <label class="bj-cb-field">
          <span>🖼️ Imagen de fondo (opcional)</span>
          <input id="cb-bg-image" type="file" class="bj-file" accept="image/*" />
        </label>
        <label class="bj-cb-field">
          <span>📷 Foto protagonista (slide 1)</span>
          <input id="cb-files" type="file" class="bj-file" accept="image/*" multiple />
        </label>
        <label class="bj-cb-field">
          <span>✍️ Tipografía</span>
          <select id="cb-font" class="bj-input bj-input-sm">
            <option value="serif-editorial" selected>Serif editorial (Georgia/Playfair)</option>
            <option value="sans-modern">Sans moderno (Inter/Helvetica)</option>
            <option value="serif-luxury">Serif luxury (Cormorant)</option>
            <option value="sans-bold">Sans bold (Inter Black)</option>
            <option value="mono-numbers">Mono (SF Mono) — data</option>
          </select>
        </label>
        <label class="bj-cb-field">
          <span>🎭 Mood (opcional, sobre-escribe colores)</span>
          <select id="cb-mood" class="bj-input bj-input-sm">
            <option value="">— usar mis colores —</option>
            <option value="premium">Premium (oscuro elegante)</option>
            <option value="editorial">Editorial (revista)</option>
            <option value="minimalista">Minimalista (blanco amplio)</option>
            <option value="brutal">Brutal (amarillo fuerte)</option>
            <option value="luxury">Luxury (dorado)</option>
            <option value="monochrome">Monocromo</option>
            <option value="organico">Orgánico</option>
            <option value="techno">Techno (neón)</option>
          </select>
        </label>
        <label class="bj-cb-field">
          <span>🎨 Paleta marca (texto extra)</span>
          <input id="cb-colors" type="text" class="bj-input bj-input-sm" placeholder="ej: negro, verde menta" />
        </label>
        <label class="bj-cb-field bj-cb-full">
          <span>✨ Elementos visuales del nicho</span>
          <input id="cb-elements" type="text" class="bj-input bj-input-sm" placeholder="ej: laptop, gráficos, plantas, mockups, ondas neón..." />
        </label>
      </div>
      <button class="bj-btn bj-btn-primary bj-cb-go" id="bj-cb-go">🎠 Generar carrusel(es)</button>
      <div id="bj-cb-result" class="bj-cb-result"></div>
    </div>
    <style>
      .bj-cb-card{margin-top:18px;padding:18px;border-radius:14px;border:1px solid var(--border);background:linear-gradient(180deg,rgba(168,85,247,0.08),rgba(99,102,241,0.04));}
      .bj-cb-head{display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;}
      .bj-cb-emoji{font-size:30px;}
      .bj-cb-title{font-weight:800;font-size:15px;color:var(--text-primary,var(--fg));}
      .bj-cb-sub{font-size:12px;color:var(--text-secondary,var(--fg-2));margin-top:2px;}
      .bj-cb-label{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));margin-bottom:6px;}
      .bj-cb-plans{margin-bottom:14px;padding:12px;border-radius:10px;background:rgba(0,0,0,0.18);}
      .bj-cb-plan-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;}
      .bj-cb-plan{display:flex;flex-direction:column;gap:6px;padding:10px;border-radius:8px;border:1.5px solid var(--border);cursor:pointer;transition:all .15s;background:var(--bg,#0a0a0a);}
      .bj-cb-plan:hover{border-color:#a855f7;}
      .bj-cb-plan.selected{border-color:#a855f7;background:linear-gradient(180deg,rgba(168,85,247,0.15),rgba(99,102,241,0.05));}
      .bj-cb-plan-head{display:flex;justify-content:space-between;align-items:center;font-size:10px;font-weight:800;}
      .bj-cb-plan-badge{color:#a855f7;letter-spacing:1px;}
      .bj-cb-plan-score{color:#10b981;}
      .bj-cb-plan-hook{font-size:12px;color:var(--text-primary,var(--fg));line-height:1.35;}
      .bj-cb-plan-cb{position:absolute;opacity:0;pointer-events:none;}
      .bj-cb-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;}
      .bj-cb-field{display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text-secondary,var(--fg-2));}
      .bj-cb-field span{font-weight:600;}
      .bj-cb-full{grid-column:1/-1;}
      .bj-cb-color-row{display:flex;gap:6px;align-items:center;}
      .bj-cb-color-row input[type=color]{width:44px;height:34px;padding:0;border-radius:6px;border:1px solid var(--border);background:none;cursor:pointer;}
      .bj-cb-color-row input[type=text]{flex:1;}
      @media(max-width:560px){.bj-cb-grid{grid-template-columns:1fr;}}
      .bj-cb-go{margin-top:6px;width:100%;}
      .bj-cb-result{margin-top:14px;}
    </style>`;
};

// Panel de estrategia account-aware — nicho, algoritmo, cadencia, hashtags, distribución, KPIs.
const renderStrategyPanel = (plan) => {
  const s = plan?.strategy;
  if (!s) return '';
  const chips = (arr, cls = '') =>
    (arr || [])
      .filter(Boolean)
      .map((x) => `<span class="bj-st-chip ${cls}">${escape(String(x))}</span>`)
      .join('');
  const ht = s.hashtagStrategy || {};
  const allTags = [...(ht.core || []), ...(ht.niche || []), ...(ht.trending || [])];
  const list = (arr) =>
    (arr || [])
      .filter(Boolean)
      .map((x) => `<li>${escape(String(x))}</li>`)
      .join('');
  return `
    <details class="bj-strategy">
      <summary class="bj-strategy-sum">
        🧭 Estrategia de cuenta
        <span class="bj-st-niche">nicho: ${escape(s.niche || 'general')}${s.brandType ? ` · ${escape(s.brandType)}` : ''}</span>
      </summary>
      <div class="bj-strategy-body">
        ${s.contentStyle ? `<div class="bj-st-row"><span class="bj-st-k">🎭 Estilo del nicho</span><span class="bj-st-v">${escape(s.contentStyle)}</span></div>` : ''}
        ${s.cadence ? `<div class="bj-st-row"><span class="bj-st-k">📅 Cadencia</span><span class="bj-st-v">${escape(s.cadence)}</span></div>` : ''}
        ${(s.weekPlan || []).length ? `<div class="bj-st-row col"><span class="bj-st-k">🗓️ Calendario 7 días</span><div class="bj-week">${s.weekPlan.map((d) => `<div class="bj-week-day"><span class="bj-week-d">${escape(d.day)}</span><span class="bj-week-f">${escape(d.format)}</span><span class="bj-week-a">${escape(d.angle)}</span><span class="bj-week-w">${escape(d.window)}</span></div>`).join('')}</div></div>` : ''}
        ${s.calendarMonthly?.slots?.length ? `<div class="bj-st-row col"><span class="bj-st-k">📆 Calendario mensual (${s.calendarMonthly.totalSlots} posts)</span><details class="bj-month"><summary>Ver 4 semanas</summary><div class="bj-month-grid">${s.calendarMonthly.slots.map((sl) => `<div class="bj-month-slot"><span class="bj-month-date">${escape(sl.date || '')}${sl.time ? ' · ' + escape(sl.time) : ''}</span><span class="bj-month-fmt">${escape(sl.format || sl.type || '')}</span>${sl.theme || sl.idea ? `<span class="bj-month-theme">${escape(sl.theme || sl.idea)}</span>` : ''}</div>`).join('')}</div></details></div>` : ''}
        ${(s.algorithmSignals || []).length ? `<div class="bj-st-row"><span class="bj-st-k">⚙️ Señales algoritmo</span><span class="bj-st-v">${chips(s.algorithmSignals, 'algo')}</span></div>` : ''}
        ${(s.postingWindows || []).length ? `<div class="bj-st-row"><span class="bj-st-k">⏰ Mejores horarios</span><span class="bj-st-v">${chips(s.postingWindows)}</span></div>` : ''}
        ${allTags.length ? `<div class="bj-st-row"><span class="bj-st-k">#️⃣ Hashtags</span><span class="bj-st-v">${chips(allTags, 'tag')}</span></div>` : ''}
        ${(s.contentPillars || []).length ? `<div class="bj-st-row"><span class="bj-st-k">🏛️ Pilares</span><span class="bj-st-v">${chips(s.contentPillars)}</span></div>` : ''}
        ${(s.ctaLadder || []).length ? `<div class="bj-st-row"><span class="bj-st-k">📣 Escalera CTA</span><span class="bj-st-v">${chips(s.ctaLadder)}</span></div>` : ''}
        ${(s.distribution || []).length ? `<div class="bj-st-row col"><span class="bj-st-k">🚀 Distribución</span><ul class="bj-st-ul">${list(s.distribution)}</ul></div>` : ''}
        ${(s.kpis || []).length ? `<div class="bj-st-row col"><span class="bj-st-k">📊 KPIs objetivo</span><ul class="bj-st-ul">${list(s.kpis)}</ul></div>` : ''}
        ${(s.riskFlags || []).length ? `<div class="bj-st-row col"><span class="bj-st-k">⚠️ Evitar (riesgo algoritmo)</span><ul class="bj-st-ul risk">${list(s.riskFlags)}</ul></div>` : ''}
        ${(s.monetization || []).length ? `<div class="bj-st-row"><span class="bj-st-k">💰 Monetización</span><span class="bj-st-v">${chips(s.monetization)}</span></div>` : ''}
        ${(s.topPlayersHint || []).length ? `<div class="bj-st-row"><span class="bj-st-k">👀 Referentes del nicho</span><span class="bj-st-v">${chips(s.topPlayersHint)}</span><span class="bj-st-note">referencias, no garantía de handles vigentes</span></div>` : ''}
      </div>
    </details>`;
};

const renderHookPlans = (hookPlans) => {
  if (!hookPlans?.length) return '';
  const plans = hookPlans.slice(0, 3);
  return `
    <div class="bj-hp-grid-wrap">
      <div class="bj-block-label" style="margin-bottom:10px;">🎣 Planes de contenido — hook · guión · cta</div>
      <div class="bj-hp-grid">
        ${plans
          .map((hp, i) => {
            const score = hp.viralScore ?? Math.round((0.88 - i * 0.04) * 100);
            const hl = hp.hookLayer || {};
            const sc = hp.script || {};
            const scoreCls = score >= 85 ? 'bj-hp-s-hot' : score >= 70 ? 'bj-hp-s-good' : 'bj-hp-s-ok';
            return `
          <div class="bj-hp-card${i === 0 ? ' top' : ''}">
            <!-- score + hook -->
            <div class="bj-hp-card-top">
              <div class="bj-hp-score ${scoreCls}" style="--vs:${score}%;">
                <span class="bj-hp-score-n">${score}</span>
              </div>
              <div class="bj-hp-hook-text">${escape(hp.hook)}${i === 0 ? ' <span class="bj-best-badge" style="font-size:9px;">★ TOP</span>' : ''}</div>
            </div>
            <!-- hook layer -->
            ${
              hl.videoText || hl.imageDescription || hl.poseExpression
                ? `
            <div class="bj-hp-layers">
              ${hl.videoText ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">📝</span><span class="bj-hp-screen">${escape(hl.videoText)}</span></div>` : ''}
              ${hl.imageDescription ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">🖼️</span><span>${escape(hl.imageDescription)}</span></div>` : ''}
              ${hl.poseExpression ? `<div class="bj-hp-lrow"><span class="bj-hp-ltag">🎭</span><span>${escape(hl.poseExpression)}</span></div>` : ''}
            </div>`
                : ''
            }
            <!-- guión -->
            ${
              sc.apertura || sc.beats?.length
                ? `
            <div class="bj-hp-script-sec">
              <div class="bj-hp-sec-h">📜 Guión</div>
              ${sc.apertura ? `<div class="bj-hp-apertura">${escape(sc.apertura)}</div>` : ''}
              ${(sc.beats || []).map((b, bi) => `<div class="bj-hp-beat"><span class="bj-hp-bn">${bi + 1}</span><span>${escape(b)}</span></div>`).join('')}
              ${sc.cierre ? `<div class="bj-hp-cierre">${escape(sc.cierre)}</div>` : ''}
            </div>`
                : ''
            }
            <!-- cta -->
            ${hp.cta ? `<div class="bj-hp-cta-box">📣 ${escape(hp.cta)}</div>` : ''}
          </div>`;
          })
          .join('')}
      </div>
    </div>`;
};

const renderPlanResult = (plan, platform) => {
  if (!plan) return '';
  const fmt = plan.recommendedFormat;
  const hooks = plan.hookCandidates || [];
  const windows = plan.postingWindows || [];
  const checklist = plan.algorithmChecklist || [];
  const enriched = plan.enriched || {};
  const ctaLadder = enriched.ctaOptions?.length ? enriched.ctaOptions : plan.ctaLadder || [];
  const angles = plan.differentiationAngles || [];
  const isIg = platform === 'instagram';

  const autoList = enriched.automations?.length
    ? enriched.automations.map((a) => ({
        ...(AUTOMATION_MAP[a.action] || {}),
        label: a.label || AUTOMATION_MAP[a.action]?.label,
        desc: a.desc,
        action: a.action,
      }))
    : [
        AUTOMATION_MAP[isIg ? 'carousel' : 'reel'],
        AUTOMATION_MAP.schedule,
        AUTOMATION_MAP.hashtags,
        AUTOMATION_MAP['ab-test'],
      ];

  return `
    <div class="bj-result">

      <!-- Score strip -->
      <div class="bj-score-strip">
        <div class="bj-score-num">${plan.strategicScore}</div>
        <div class="bj-score-label">
          <strong>Score estratégico · ${escape(fmt.format.toUpperCase())}</strong>
          <span>${plan.strategicScore >= 80 ? '🔥 Alta probabilidad de alcance' : plan.strategicScore >= 60 ? '✅ Plan sólido' : '⚠️ Mejorable — probá otro ángulo'}</span>
          <span style="font-size:11px;opacity:.75;">Fit ${(fmt.fit * 100).toFixed(0)}% · ${isIg ? 'Agente Instagram' : 'Agente TikTok'}</span>
        </div>
      </div>

      ${enriched.platformTip ? `<div class="bj-tip-bar"><span class="bj-tip-icon">${isIg ? '📸' : '🎵'}</span><span>${escape(enriched.platformTip)}</span></div>` : ''}
      ${enriched.quickWin ? `<div class="bj-quickwin">⚡ <strong>Quick win:</strong> ${escape(enriched.quickWin)}</div>` : ''}

      <!-- Formatos por plataforma -->
      ${
        isIg
          ? renderIgPlans(
              plan.igPlans ||
                (() => {
                  const topHook = hooks[0]?.hook || '';
                  const g = enriched.guion || {};
                  const beats = (g.desarrollo || []).map((d, i) => ({
                    n: i + 1,
                    text: d,
                    onScreen: enriched.onScreenText?.[i] || '',
                    visual: enriched.cameraAngles?.[i + 1] || '',
                  }));
                  return {
                    _viralScore: hooks[0]?.viralScore ?? Math.round((hooks[0]?.predictedStrength || 0.8) * 100),
                    carousel: {
                      captionHook: topHook,
                      captionCTA: enriched.ctaOptions?.[0] || '',
                      slideCount: (g.desarrollo?.length || 3) + 2,
                      slides: [
                        {
                          n: 1,
                          role: 'hook',
                          title: topHook,
                          subtitle: g.apertura || '',
                          bodyText: '',
                          imageText: enriched.onScreenText?.[0] || '',
                          visual: enriched.cameraAngles?.[0] || '',
                        },
                        ...(g.desarrollo || []).map((d, i) => ({
                          n: i + 2,
                          role: 'content',
                          title: `Punto ${i + 1}`,
                          subtitle: d,
                          bodyText: '',
                          imageText: '',
                          visual: enriched.cameraAngles?.[i + 1] || '',
                        })),
                        {
                          n: (g.desarrollo?.length || 0) + 2,
                          role: 'cta',
                          title: 'Guardalo 👇',
                          subtitle: enriched.ctaOptions?.[0] || '',
                          bodyText: enriched.ctaOptions?.[1] || '',
                          imageText: 'Guardalo · Compartilo · Seguime',
                          visual: '',
                        },
                      ],
                    },
                    reel: {
                      hooks: hooks
                        .slice(0, 3)
                        .map((h, i) => ({ text: h.hook, style: i === 0 ? 'mejor opción' : `opción ${i + 1}` })),
                      hookLayer: {
                        videoText: enriched.onScreenText?.[0]?.split('—')[0]?.trim() || '',
                        openingFrame: enriched.cameraAngles?.[0] || '',
                        poseExpression: enriched.cameraAngles?.[1] || '',
                      },
                      script: { apertura: g.apertura || '', beats, cierre: g.cierre || '' },
                      cta: enriched.ctaOptions?.[0] || '',
                    },
                    stories: {
                      frames: [
                        {
                          n: 1,
                          role: 'hook',
                          mediaType: 'video',
                          mediaDescription: enriched.cameraAngles?.[0] || '',
                          onScreenText: topHook,
                          supportText: '',
                          sticker: 'Encuesta',
                          duration: '5s',
                        },
                        ...(g.desarrollo || []).slice(0, 2).map((d, i) => ({
                          n: i + 2,
                          role: 'content',
                          mediaType: 'foto',
                          mediaDescription: '',
                          onScreenText: d,
                          supportText: '',
                          sticker: 'ninguno',
                          duration: '5s',
                        })),
                        {
                          n: Math.min(g.desarrollo?.length || 0, 2) + 2,
                          role: 'cta',
                          mediaType: 'video',
                          mediaDescription: '',
                          onScreenText: enriched.ctaOptions?.[0] || 'Link en bio 👆',
                          supportText: '',
                          sticker: 'Link',
                          duration: '7s',
                        },
                      ],
                    },
                  };
                })(),
              plan,
              enriched,
            )
          : renderHookPlans(
              plan.hookPlans?.length
                ? plan.hookPlans
                : (() => {
                    const _deriveVideoText = (hookText) => {
                      const words = String(hookText || '')
                        .trim()
                        .split(/\s+/);
                      return words.slice(0, 3).join(' ').toUpperCase();
                    };
                    const _synthBeats = (hookText, guionDesarrollo, idx) => {
                      if (idx === 0 && guionDesarrollo?.length) return guionDesarrollo;
                      return [
                        `Contexto que valida el hook: por qué esto importa ahora`,
                        `Desarrollo central — dato, demostración o historia que sostiene la promesa`,
                        `Prueba o resultado concreto — el payoff de lo que prometió el hook`,
                        `Cierre narrativo: qué hacer con esta información → CTA natural`,
                      ];
                    };
                    const _cameraAngle =
                      enriched.cameraAngles?.[0] || 'Plano medio frontal mirando a cámara — transmite autoridad';
                    const _poseBase =
                      enriched.cameraAngles?.[1] || 'Directo a cámara, energía confiada, gesticulá hacia la pantalla';
                    return hooks.slice(0, 3).map((h, i) => ({
                      hook: h.hook,
                      viralScore: h.viralScore ?? Math.round((h.predictedStrength || 0.8) * 100),
                      hookLayer: {
                        videoText:
                          i === 0 && enriched.onScreenText?.[0]
                            ? (enriched.onScreenText[0] || '').split('—')[0].trim()
                            : _deriveVideoText(h.hook),
                        imageDescription: _cameraAngle,
                        poseExpression: _poseBase,
                      },
                      script: {
                        apertura:
                          i === 0 && enriched.guion?.apertura
                            ? enriched.guion.apertura
                            : `Arrancá con energía: "${h.hook.slice(0, 50)}${h.hook.length > 50 ? '...' : ''}" — mirá a cámara los primeros 2s`,
                        beats: _synthBeats(h.hook, enriched.guion?.desarrollo, i),
                        cierre:
                          i === 0 && enriched.guion?.cierre
                            ? enriched.guion.cierre
                            : enriched.ctaOptions?.[0] || 'Guardá este video si te sirvió 👇',
                      },
                      cta: enriched.ctaOptions?.[i] || enriched.ctaOptions?.[0] || null,
                    }));
                  })(),
            )
      }

      <!-- Guía de producción -->
      ${
        enriched.cameraAngles?.length || enriched.onScreenText?.length || enriched.visualElements?.length
          ? `
      <div class="bj-block">
        <div class="bj-block-label">🎥 Guía de producción</div>
        <div class="bj-prod-grid">
          ${enriched.cameraAngles?.length ? `<div class="bj-prod-col"><div class="bj-prod-col-h">📷 Ángulos de cámara</div>${enriched.cameraAngles.map((a) => `<div class="bj-prod-item">${escape(a)}</div>`).join('')}</div>` : ''}
          ${enriched.onScreenText?.length ? `<div class="bj-prod-col"><div class="bj-prod-col-h">📝 Texto en pantalla</div>${enriched.onScreenText.map((t) => `<div class="bj-prod-item">${escape(t)}</div>`).join('')}</div>` : ''}
          ${enriched.visualElements?.length ? `<div class="bj-prod-col"><div class="bj-prod-col-h">✨ Elementos visuales</div>${enriched.visualElements.map((v) => `<div class="bj-prod-item">${escape(v)}</div>`).join('')}</div>` : ''}
        </div>
      </div>`
          : ''
      }

      <!-- Caption + Outline -->
      ${
        enriched.captionDraft
          ? `
      <div class="bj-block">
        <div class="bj-block-label" style="display:flex;justify-content:space-between;align-items:center;">
          <span>📝 Caption listo para publicar</span>
          <button class="bj-copy-btn" data-copy="${escape(enriched.captionDraft)}">📋 Copiar</button>
        </div>
        <div class="bj-caption-draft">${escape(enriched.captionDraft)}</div>
        ${enriched.contentOutline?.length ? `<div class="bj-block-label" style="margin-top:12px;">🗂️ Estructura</div>${enriched.contentOutline.map((s, i) => `<div class="bj-outline-step"><span class="bj-outline-n">${i + 1}</span><span>${escape(s)}</span></div>`).join('')}` : ''}
      </div>`
          : ''
      }

      <!-- Hashtags -->
      ${
        enriched.hashtags
          ? `
      <div class="bj-block">
        <div class="bj-block-label">#️⃣ Hashtags</div>
        <div class="bj-hashtag-section"><span class="bj-ht-cat">Core</span>${(enriched.hashtags.core || []).map((h) => `<span class="bj-ht-chip core">${escape(h)}</span>`).join('')}</div>
        <div class="bj-hashtag-section"><span class="bj-ht-cat">Nicho</span>${(enriched.hashtags.niche || []).map((h) => `<span class="bj-ht-chip niche">${escape(h)}</span>`).join('')}</div>
        ${enriched.hashtags.trending?.length ? `<div class="bj-hashtag-section"><span class="bj-ht-cat">Trending</span>${enriched.hashtags.trending.map((h) => `<span class="bj-ht-chip trending">${escape(h)}</span>`).join('')}</div>` : ''}
        <button class="bj-copy-btn" style="margin-top:8px;" data-copy="${escape([...(enriched.hashtags.core || []), ...(enriched.hashtags.niche || []), ...(enriched.hashtags.trending || [])].join(' '))}">📋 Copiar todos</button>
      </div>`
          : ''
      }

      <!-- Timing + Señales -->
      <div class="bj-grid">
        <div class="bj-block"><div class="bj-block-label">⏰ Publicar hoy</div>${
          windows.length
            ? windows
                .slice(0, 3)
                .map((w) => `<div class="bj-window">${escape(w)}</div>`)
                .join('')
            : '<div class="bj-muted">Cualquier momento</div>'
        }</div>
        <div class="bj-block"><div class="bj-block-label">🧠 Señales a optimizar</div>${checklist
          .slice(0, 3)
          .map(
            (c) =>
              `<div class="bj-checklist-item"><strong>${escape(c.signal)}</strong><span>${escape(c.tactic)}</span></div>`,
          )
          .join('')}</div>
      </div>

      <!-- CTAs + Ángulos -->
      <div class="bj-grid">
        <div class="bj-block">
          <div class="bj-block-label">📣 CTAs</div>
          ${(enriched.ctaOptions?.length ? enriched.ctaOptions : ctaLadder).map((c) => `<div class="bj-cta">${escape(c)}</div>`).join('')}
        </div>
        <div class="bj-block">
          <div class="bj-block-label">🎯 Ángulos diferenciados</div>
          ${angles.map((a) => `<div class="bj-angle">${escape(a)}</div>`).join('')}
        </div>
      </div>

      ${plan.riskFlags?.length ? `<div class="bj-warning"><strong>⚠️ Riesgos:</strong><ul>${plan.riskFlags.map((r) => `<li>${escape(r)}</li>`).join('')}</ul></div>` : ''}

      <!-- PREDICCIONES — al final, minimalistas -->
      ${plan.predictions ? renderPredictionsCard(plan.predictions) : ''}

      <!-- Acciones -->
      <div class="bj-block">
        <div class="bj-block-label">🚀 Crear y publicar</div>
        <div class="bj-auto-grid">
          <button class="bj-btn bj-btn-primary bj-auto-primary" id="bj-forge">✨ Generar ${escape(fmt.format)} completo</button>
          ${autoList
            .filter((a) => a?.label)
            .map(
              (a) =>
                `<button class="bj-btn bj-btn-ghost bj-auto-action" data-route="${escape(a?.route || '')}" data-endpoint="${escape(a?.endpoint || '')}">${escape(a?.label || '')}</button>`,
            )
            .join('')}
          <button class="bj-btn bj-btn-ghost" id="bj-recalc">↻ Recalcular</button>
        </div>
      </div>
    </div>
    <div id="bj-agency-host" class="ab-loading">🏛️ Cargando análisis completo de agencia…</div>`;
};

const renderPredictionDetail = (pred) => {
  if (!pred) return '';
  const cls =
    pred.virality === 'breakout-potential'
      ? 'breakout'
      : pred.virality === 'high-potential'
        ? 'high'
        : pred.virality === 'solid'
          ? 'solid'
          : 'mediocre';
  return `
    <div class="bj-pred-overlay" id="bj-pred-overlay">
      <div class="bj-pred-card">
        <button class="bj-pred-close" id="bj-pred-close">✕</button>
        <div class="bj-pred-score bj-pred-${cls}">
          <div class="bj-pred-num">${pred.viralScore}</div>
          <div class="bj-pred-label">Viral Score</div>
          <div class="bj-pred-class">${escape(pred.virality.replace('-', ' '))}</div>
        </div>
        <div class="bj-pred-grid">
          <div class="bj-pred-metric"><strong>${pred.predicted.reach.toLocaleString('es-AR')}</strong><span>alcance predicho</span></div>
          <div class="bj-pred-metric"><strong>${(pred.predicted.engagementRate * 100).toFixed(2)}%</strong><span>engagement rate</span></div>
          ${pred.predicted.completion !== null ? `<div class="bj-pred-metric"><strong>${(pred.predicted.completion * 100).toFixed(0)}%</strong><span>completion</span></div>` : ''}
          <div class="bj-pred-metric"><strong>${pred.predicted.saves}</strong><span>saves</span></div>
          <div class="bj-pred-metric"><strong>${pred.predicted.shares}</strong><span>shares</span></div>
          <div class="bj-pred-metric"><strong>${pred.predicted.comments}</strong><span>comments</span></div>
        </div>
        ${
          pred.improvements?.length
            ? `
          <div class="bj-pred-improve">
            <strong>💡 Mejoras posibles (techo ${pred.ceilingScore}):</strong>
            <ul>${pred.improvements.map((i) => `<li>${escape(typeof i === 'string' ? i : `[${i.priority}] ${i.action} → ${i.impact}`)}</li>`).join('')}</ul>
          </div>`
            : ''
        }
      </div>
    </div>`;
};

// ── Agency Brain renderer ────────────────────────────────────────────────────
const copyBtn = (text, label = '📋') =>
  `<button class="ab-copy" data-copy="${escape(text)}" title="Copiar">${label}</button>`;

// Diagrama SVG de safe-zones (escala el canvas real a ~150px de alto)
const renderSafeZoneDiagram = (spec) => {
  if (!spec?.canvas) return '';
  const { w, h } = spec.canvas;
  const maxH = 170;
  const scale = maxH / h;
  const sw = Math.round(w * scale);
  const sh = Math.round(h * scale);
  const noGo = spec.zones?.noGo || [];
  const good = spec.zones?.good || [];
  const ml = (spec.margin?.left || 0) * scale;
  const mr = (spec.margin?.right || 0) * scale;

  const zoneRect = (z, fill, label) => {
    let x = 0,
      y = 0,
      rw = sw,
      rh = sh;
    if (z.edge === 'top') {
      rh = z.px * scale;
    } else if (z.edge === 'bottom') {
      y = sh - z.px * scale;
      rh = z.px * scale;
    } else if (z.edge === 'left') {
      rw = z.px * scale;
    } else if (z.edge === 'right') {
      x = sw - z.px * scale;
      rw = z.px * scale;
    }
    return `<rect x="${x}" y="${y}" width="${rw}" height="${rh}" fill="${fill}" opacity="0.55"/>
      <text x="${x + rw / 2}" y="${y + rh / 2}" fill="#fff" font-size="7" text-anchor="middle" dominant-baseline="middle">${label} ${z.px}</text>`;
  };

  // safe central area
  const safeX = ml;
  const safeY = (noGo.find((z) => z.edge === 'top')?.px || good.find((z) => z.edge === 'top')?.px || 0) * scale;
  const safeBottom =
    (noGo.find((z) => z.edge === 'bottom')?.px || good.find((z) => z.edge === 'bottom')?.px || 0) * scale;
  const safeW = sw - ml - mr;
  const safeH = sh - safeY - safeBottom;

  return `
  <div class="cs-diagram-wrap">
    <svg viewBox="0 0 ${sw} ${sh}" width="${sw}" height="${sh}" class="cs-svg">
      <rect x="0" y="0" width="${sw}" height="${sh}" fill="#1a1a2e" stroke="var(--border)" stroke-width="1"/>
      ${good.length ? `<rect x="${safeX}" y="${safeY}" width="${safeW}" height="${safeH}" fill="#10b981" opacity="0.18"/>` : `<rect x="${safeX}" y="${safeY}" width="${safeW}" height="${safeH}" fill="#10b981" opacity="0.22"/>`}
      <text x="${safeX + safeW / 2}" y="${safeY + safeH / 2}" fill="#6ee7b7" font-size="8" font-weight="bold" text-anchor="middle" dominant-baseline="middle">SAFE</text>
      ${noGo.map((z) => zoneRect(z, '#ef4444', 'NO-GO')).join('')}
      ${good.map((z) => zoneRect(z, '#f59e0b', 'GOOD')).join('')}
      ${spec.visibleArea ? `<rect x="1" y="1" width="${sw - 2}" height="${spec.visibleArea.h * scale - 2}" fill="none" stroke="#3b82f6" stroke-width="1.5" stroke-dasharray="4 3"/>` : ''}
    </svg>
    <div class="cs-dims">
      <div class="cs-dim-main">${w}×${h}</div>
      <div class="cs-dim-aspect">${escape(spec.aspect || '')}</div>
    </div>
  </div>`;
};

const renderCanvasSpecs = (specs, platform) => {
  if (!specs) return '';
  const entries = Object.entries(specs);
  if (!entries.length) return '';
  return `
  <details class="ab-section">
    <summary>📐 Medidas exactas + Safe-Zones (${platform === 'tiktok' ? 'TikTok' : 'Instagram'})</summary>
    <div class="ab-section-body">
      <div class="cs-legend">
        <span><i class="cs-dot cs-red"></i> No-Go (no poner texto)</span>
        <span><i class="cs-dot cs-amber"></i> Good Zone</span>
        <span><i class="cs-dot cs-green"></i> Safe</span>
        <span><i class="cs-dot cs-blue"></i> Área visible en feed</span>
      </div>
      <div class="cs-grid">
        ${entries
          .map(
            ([key, s]) => `
        <div class="cs-card">
          <div class="cs-card-title">${escape(s.label || key)}</div>
          ${renderSafeZoneDiagram(s)}
          ${s.tip ? `<div class="cs-tip">${escape(s.tip)}</div>` : ''}
          ${s.visibleArea ? `<div class="cs-visible">👁️ Visible en feed: ${s.visibleArea.w}×${s.visibleArea.h}</div>` : ''}
          <div class="cs-margins">Márgenes: ${s.margin?.left || 0}px / ${s.margin?.right || 0}px</div>
        </div>`,
          )
          .join('')}
      </div>
    </div>
  </details>`;
};

const renderAgencyBrain = (d) => {
  if (!d || d.error) return `<div class="ab-error">⚠️ ${escape(d?.error || 'Error cargando análisis')}</div>`;

  const hookRows = (d.hooks || [])
    .map(
      (h, i) => `
    <div class="ab-hook-row${i === 0 ? ' ab-hook-top' : ''}">
      <div class="ab-hook-verbal">${escape(h.verbal || '')}
        ${copyBtn(h.verbal || '', '📋')}
        ${i === 0 ? '<span class="ab-badge">★ MEJOR</span>' : ''}
      </div>
      <div class="ab-hook-meta">
        ${h.onScreenText ? `<span class="ab-hook-screen">"${escape(h.onScreenText)}"</span>` : ''}
        ${h.visual ? `<span class="ab-hook-visual">📹 ${escape(h.visual)}</span>` : ''}
        <span class="ab-hook-score">${h.score || 0}/100</span>
      </div>
    </div>`,
    )
    .join('');

  const cap = d.captions || {};
  const captionRows = [
    cap.carousel && { fmt: '🎠 Carrusel', text: cap.carousel },
    cap.reel && { fmt: '🎬 Reel', text: cap.reel },
    cap.story && { fmt: '📱 Historia', text: cap.story },
  ]
    .filter(Boolean)
    .map(
      (c) => `
    <div class="ab-caption-block">
      <div class="ab-caption-fmt">${c.fmt} ${copyBtn(c.text)}</div>
      <div class="ab-caption-text">${escape(c.text)}</div>
    </div>`,
    )
    .join('');

  const ht = d.hashtags || {};
  const hashtagBlock = (label, tags) =>
    tags?.length
      ? `<div class="ab-ht-group"><span class="ab-ht-label">${label}</span>
        <div class="ab-ht-tags">${tags.map((t) => `<span class="ab-ht">${escape(t)}</span>`).join('')}</div>
        ${copyBtn(tags.join(' '), '📋 Copiar bloque')}
       </div>`
      : '';

  const ideaRows = (d.viralIdeas || [])
    .map(
      (v, i) => `
    <div class="ab-idea">
      <span class="ab-idea-n">${i + 1}</span>
      <div>
        <div class="ab-idea-concept">${escape(v.concept || '')}</div>
        <div class="ab-idea-meta">
          <span class="ab-tag">${escape(v.format || '')}</span>
          <span class="ab-tag">⏱ ${v.creationMin || '?'} min</span>
          <span class="ab-tag">🔥 ${v.shareability || 0}% share</span>
        </div>
      </div>
    </div>`,
    )
    .join('');

  const weekRows = (d.weekPlan || [])
    .map(
      (w) => `
    <div class="ab-week-row">
      <span class="ab-week-day">${escape(w.day)}</span>
      <span class="ab-week-fmt">${escape(w.format)}</span>
      <span class="ab-week-angle">${escape(w.angle)}</span>
    </div>`,
    )
    .join('');

  const aud = d.audience || {};
  const storytelling = d.storytelling?.structure || [];

  return `
  <details class="ab-brain ab-brain-outer">
    <summary class="ab-brain-summary">
      <span class="ab-brain-title">🏛️ Más opciones · Paquete completo de agencia</span>
      <span class="ab-brain-sub">hooks · captions · hashtags · ideas virales · audiencia · calendario · medidas · copywriting · matriz creativa</span>
    </summary>
    <div class="ab-brain-body">

    <details class="ab-section">
      <summary>🎣 Hooks Virales (${(d.hooks || []).length} variantes)</summary>
      <div class="ab-section-body">${hookRows || '<em>Sin hooks</em>'}</div>
    </details>

    <details class="ab-section">
      <summary>✍️ Captions Listos para Publicar</summary>
      <div class="ab-section-body">
        ${captionRows || '<em>Sin captions</em>'}
        ${cap.hook_caption ? `<div class="ab-caption-block"><div class="ab-caption-fmt">🎯 Hook de apertura ${copyBtn(cap.hook_caption)}</div><div class="ab-caption-text ab-hook-highlight">${escape(cap.hook_caption)}</div></div>` : ''}
        ${cap.dm_script ? `<div class="ab-caption-block"><div class="ab-caption-fmt">💬 Script DM ${copyBtn(cap.dm_script)}</div><div class="ab-caption-text">${escape(cap.dm_script)}</div></div>` : ''}
        ${(cap.ctas || []).length ? `<div class="ab-caption-block"><div class="ab-caption-fmt">📢 CTAs ${copyBtn((cap.ctas || []).join(' | '))}</div><div class="ab-cta-list">${(cap.ctas || []).map((c) => `<span class="ab-cta">${escape(c)}</span>`).join('')}</div></div>` : ''}
      </div>
    </details>

    <details class="ab-section">
      <summary>#️⃣ Estrategia de Hashtags</summary>
      <div class="ab-section-body">
        ${hashtagBlock('Nicho (alta relevancia)', ht.niche)}
        ${hashtagBlock('Broad (más alcance)', ht.broad)}
        ${hashtagBlock('Mega (trending)', ht.mega)}
        ${ht.recommended?.length ? `<div class="ab-ht-group ab-ht-recommended"><span class="ab-ht-label">✅ Mix recomendado ${copyBtn(ht.recommended.join(' '), '📋 Copiar todo')}</span><div class="ab-ht-tags">${(ht.recommended || []).map((t) => `<span class="ab-ht">${escape(t)}</span>`).join('')}</div></div>` : ''}
        ${ht.strategy ? `<div class="ab-ht-strategy">${escape(ht.strategy)}</div>` : ''}
      </div>
    </details>

    <details class="ab-section">
      <summary>💡 Ideas Virales de la Semana</summary>
      <div class="ab-section-body">${ideaRows || '<em>Sin ideas</em>'}</div>
    </details>

    <details class="ab-section">
      <summary>📅 Plan 7 Días</summary>
      <div class="ab-section-body ab-week">${weekRows}</div>
    </details>

    <details class="ab-section">
      <summary>🧠 Audiencia & Psicografía</summary>
      <div class="ab-section-body">
        ${aud.painPoints?.length ? `<div class="ab-aud-block"><strong>Dolores:</strong> ${aud.painPoints.map((p) => `<span class="ab-tag">${escape(p)}</span>`).join('')}</div>` : ''}
        ${aud.dreamOutcomes?.length ? `<div class="ab-aud-block"><strong>Sueños:</strong> ${aud.dreamOutcomes.map((p) => `<span class="ab-tag ab-tag-green">${escape(p)}</span>`).join('')}</div>` : ''}
        ${aud.triggers?.length ? `<div class="ab-aud-block"><strong>Triggers:</strong> ${aud.triggers.map((p) => `<span class="ab-tag ab-tag-blue">${escape(p)}</span>`).join('')}</div>` : ''}
        ${aud.contentThatConverts?.length ? `<div class="ab-aud-block"><strong>Qué convierte:</strong> ${aud.contentThatConverts.map((p) => `<span class="ab-tag ab-tag-purple">${escape(p)}</span>`).join('')}</div>` : ''}
        ${aud.angle ? `<div class="ab-aud-angle">${escape(aud.angle)}</div>` : ''}
      </div>
    </details>

    ${
      d.niche?.trends2026?.length
        ? `
    <details class="ab-section">
      <summary>📈 Tendencias 2026 en tu Nicho</summary>
      <div class="ab-section-body">
        <div class="ab-trends">${(d.niche.trends2026 || []).map((t) => `<span class="ab-trend">${escape(t)}</span>`).join('')}</div>
        ${d.niche.topPlayers?.length ? `<div class="ab-aud-block"><strong>Top cuentas:</strong> ${d.niche.topPlayers.map((p) => `<span class="ab-tag">${escape(p)}</span>`).join('')}</div>` : ''}
        ${d.niche.monetization?.length ? `<div class="ab-aud-block"><strong>Monetización:</strong> ${d.niche.monetization.map((p) => `<span class="ab-tag ab-tag-green">${escape(p)}</span>`).join('')}</div>` : ''}
      </div>
    </details>`
        : ''
    }

    ${
      storytelling.length
        ? `
    <details class="ab-section">
      <summary>🎬 Guión Storytelling (reel/vídeo)</summary>
      <div class="ab-section-body">
        ${storytelling.map((b) => `<div class="ab-beat"><span class="ab-beat-label">${escape(b.beat)} <em>${escape(b.sec || '')}</em></span><span class="ab-beat-text">${escape(b.text)}</span></div>`).join('')}
      </div>
    </details>`
        : ''
    }

    ${
      d.copy?.frameworks
        ? `
    <details class="ab-section">
      <summary>✍️ Copywriting Persuasivo — PAS · AIDA · BAB</summary>
      <div class="ab-section-body">
        ${['PAS', 'AIDA', 'BAB']
          .map((fw) => {
            const f = d.copy.frameworks[fw];
            if (!f) return '';
            return `<div class="ab-fw-block">
            <div class="ab-fw-name">${fw}</div>
            ${f.caption_completo ? `<div class="ab-caption-block"><div class="ab-caption-fmt">${fw} completo ${copyBtn(f.caption_completo)}</div><div class="ab-caption-text">${escape(f.caption_completo)}</div></div>` : ''}
            <div class="ab-fw-steps">
              ${fw === 'PAS' && f.problema ? `<div class="ab-fw-step"><span class="ab-fw-step-label">P — Problema</span><span>${escape(f.problema)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A — Agitación</span><span>${escape(f.agitacion || '')}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">S — Solución</span><span>${escape(f.solucion || '')}</span></div>` : ''}
              ${fw === 'AIDA' && f.atencion ? `<div class="ab-fw-step"><span class="ab-fw-step-label">A — Atención</span><span>${escape(f.atencion)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">I — Interés</span><span>${escape(f.interes || '')}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">D — Deseo</span><span>${escape(f.deseo || '')}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A — Acción</span><span>${escape(f.accion || '')}</span></div>` : ''}
              ${fw === 'BAB' && f.antes ? `<div class="ab-fw-step"><span class="ab-fw-step-label">B — Antes</span><span>${escape(f.antes)}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">A — Después</span><span>${escape(f.despues || '')}</span></div><div class="ab-fw-step"><span class="ab-fw-step-label">B — Puente</span><span>${escape(f.puente || '')}</span></div>` : ''}
            </div>
          </div>`;
          })
          .join('')}
        ${d.copy.frameworks.headline_options?.length ? `<div class="ab-caption-block"><div class="ab-caption-fmt">🎯 Headlines ${copyBtn((d.copy.frameworks.headline_options || []).join('\n'))}</div><div class="ab-cta-list">${(d.copy.frameworks.headline_options || []).map((h) => `<span class="ab-cta">${escape(h)}</span>`).join('')}</div></div>` : ''}
        ${d.copy.frameworks.micro_ctas?.length ? `<div class="ab-caption-block"><div class="ab-caption-fmt">⚡ Micro-CTAs ${copyBtn((d.copy.frameworks.micro_ctas || []).join('\n'))}</div><div class="ab-cta-list">${(d.copy.frameworks.micro_ctas || []).map((c) => `<span class="ab-cta">${escape(c)}</span>`).join('')}</div></div>` : ''}
        ${
          d.copy.frameworks.objeciones_y_respuestas?.length
            ? `
        <div class="ab-caption-block">
          <div class="ab-caption-fmt">🛡️ Objeciones + respuestas</div>
          ${(d.copy.frameworks.objeciones_y_respuestas || []).map((o) => `<div class="ab-fw-step"><span class="ab-fw-step-label ab-obj">❝ ${escape(o.objecion)}</span><span class="ab-obj-flip">→ ${escape(o.flip)}</span></div>`).join('')}
        </div>`
            : ''
        }
      </div>
    </details>`
        : ''
    }

    ${
      d.copy?.contentPillars?.length
        ? `
    <details class="ab-section">
      <summary>🏛️ Pilares de Contenido de tu Nicho</summary>
      <div class="ab-section-body">
        ${(d.copy.contentPillars || [])
          .map(
            (p) => `
          <div class="ab-pillar">
            <div class="ab-pillar-name">${escape(p.pillar)} <span class="ab-tag">${escape(p.format || '')}</span></div>
            <div class="ab-pillar-sub">${(p.sub || []).map((s) => `<span class="ab-tag ab-tag-blue">${escape(s)}</span>`).join('')}</div>
          </div>`,
          )
          .join('')}
        <div class="ab-ht-strategy">${escape(d.copy.funnel?.regla || '80/20 — 80% valor, 20% pitch')}</div>
      </div>
    </details>`
        : ''
    }

    ${
      d.copy?.contentPlan?.serie_educativa
        ? `
    <details class="ab-section">
      <summary>📚 Serie de Contenido Educativo + Entretenimiento</summary>
      <div class="ab-section-body">
        <div class="ab-caption-block">
          <div class="ab-caption-fmt">📺 ${escape(d.copy.contentPlan.serie_educativa.nombre || '')}</div>
          <div class="ab-caption-text">${escape(d.copy.contentPlan.serie_educativa.descripcion || '')}</div>
          <div class="ab-week" style="margin-top:8px;">
            ${(d.copy.contentPlan.serie_educativa.episodios || [])
              .map(
                (ep) => `
              <div class="ab-week-row">
                <span class="ab-week-day">Ep ${ep.n}</span>
                <span class="ab-week-fmt">${escape(ep.formato || '')}</span>
                <span class="ab-week-angle">${escape(ep.titulo || '')} — ${escape(ep.idea || '')}</span>
              </div>`,
              )
              .join('')}
          </div>
        </div>
        ${d.copy.contentPlan.contenido_educativo?.length ? `<div class="ab-aud-block" style="flex-direction:column;gap:5px;"><strong>Educativo:</strong>${(d.copy.contentPlan.contenido_educativo || []).map((c) => `<div class="ab-fw-step"><span class="ab-fw-step-label">${escape(c.tipo)}</span><span>${escape(c.titulo)} — ${escape(c.descripcion)}</span></div>`).join('')}</div>` : ''}
        ${d.copy.contentPlan.contenido_entretenimiento?.length ? `<div class="ab-aud-block" style="flex-direction:column;gap:5px;"><strong>Entretenimiento:</strong>${(d.copy.contentPlan.contenido_entretenimiento || []).map((c) => `<div class="ab-fw-step"><span class="ab-fw-step-label">${escape(c.tipo)}</span><span>${escape(c.titulo)} — ${escape(c.descripcion)}</span></div>`).join('')}</div>` : ''}
        ${d.copy.contentPlan.lead_magnet_sugerido ? `<div class="ab-caption-block"><div class="ab-caption-fmt">🎁 Lead Magnet</div><div class="ab-caption-text"><strong>${escape(d.copy.contentPlan.lead_magnet_sugerido.nombre || '')}</strong> (${escape(d.copy.contentPlan.lead_magnet_sugerido.formato || '')}) — ${escape(d.copy.contentPlan.lead_magnet_sugerido.promesa || '')}</div></div>` : ''}
        ${d.copy.contentPlan.angulo_diferencial ? `<div class="ab-aud-angle">🎯 Ángulo diferencial: ${escape(d.copy.contentPlan.angulo_diferencial)}</div>` : ''}
      </div>
    </details>`
        : ''
    }

    ${
      d.copy?.funnel?.stages?.length
        ? `
    <details class="ab-section">
      <summary>🔻 Embudo de Contenido (Awareness → Conversion)</summary>
      <div class="ab-section-body">
        ${(d.copy.funnel.stages || [])
          .map(
            (s) => `
          <div class="ab-pillar">
            <div class="ab-pillar-name">${escape(s.stage)} <span class="ab-tag">${escape(s.ratio || '')}</span></div>
            <div class="ab-pillar-sub" style="margin-bottom:4px;">${(s.content || []).map((c) => `<span class="ab-tag">${escape(c)}</span>`).join('')}</div>
            <div style="font-size:11px;color:var(--text-tertiary,var(--fg-3));">KPIs: ${(s.kpis || []).join(' · ')}</div>
          </div>`,
          )
          .join('')}
        <div class="ab-aud-angle">Mezcla recomendada → ${Object.entries(d.copy.funnel.mixRecommendado || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join(' · ')}</div>
      </div>
    </details>`
        : ''
    }

    ${
      d.copy?.rules?.length
        ? `
    <details class="ab-section">
      <summary>📏 Reglas de Oro del Copy</summary>
      <div class="ab-section-body">
        ${(d.copy.rules || []).map((r) => `<div class="ab-fw-step" style="border-color:#a855f730"><span class="ab-fw-step-label" style="color:#a855f7">✓</span><span>${escape(r)}</span></div>`).join('')}
      </div>
    </details>`
        : ''
    }

    ${
      d.andromeda?.featured?.length
        ? `
    <details class="ab-section">
      <summary>🌌 Andrómeda — Matriz Creativa (${d.andromeda.total || 0} combinaciones únicas)</summary>
      <div class="ab-section-body">
        <div class="and-insight">${escape(d.andromeda.insight || '')}</div>

        <div class="and-featured-title">⭐ Top combinaciones para objetivo "${escape(d.andromeda.goal || '')}"</div>
        ${(d.andromeda.featured || [])
          .map(
            (c, i) => `
        <div class="and-combo${i === 0 ? ' and-combo-top' : ''}">
          <div class="and-combo-header">
            <span class="and-angle">${escape(c.angle)}</span>
            <span class="and-sep">×</span>
            <span class="and-persona">${escape(c.persona)}</span>
            <span class="and-sep">×</span>
            <span class="and-format">${escape(c.format)}</span>
            ${i === 0 ? '<span class="ab-badge">★ BEST</span>' : ''}
          </div>
          <div class="and-meta">
            <span class="ab-tag">Awareness: ${escape(c.awareness)}</span>
            <span class="ab-tag">Estado: ${escape(c.emotionalState)}</span>
            <span class="ab-tag and-conv">Conversión: ${escape(c.conversionPotential || '')}</span>
          </div>
          ${c.hook_final || c.hook ? `<div class="and-hook">"${escape(c.hook_final || c.hook)}" ${copyBtn(c.hook_final || c.hook)}</div>` : ''}
          ${c.copy_body ? `<div class="and-body">${escape(c.copy_body)}</div>` : ''}
          <div class="and-details">
            <span><strong>Dolor:</strong> ${escape(c.painAddressed || '')}</span>
            <span><strong>Trigger:</strong> ${escape(c.triggerUsed || '')}</span>
          </div>
          <div class="and-cta">
            <strong>CTA:</strong> ${escape(c.cta_final || c.cta || '')} ${copyBtn(c.cta_final || c.cta || '')}
          </div>
          ${c.why_this_works ? `<div class="and-why">💡 ${escape(c.why_this_works)}</div>` : ''}
          ${c.formatHook ? `<div class="and-fmt-hint">📹 Formato tip: ${escape(c.formatHook)}</div>` : ''}
        </div>`,
          )
          .join('')}

        ${
          d.andromeda.extras?.length
            ? `
        <details class="and-extras">
          <summary>+ ${d.andromeda.extras.length} combinaciones extra (sin expandir)</summary>
          <div class="and-extras-grid">
            ${(d.andromeda.extras || [])
              .map(
                (c) => `
            <div class="and-extra-pill">
              <span class="and-angle-sm">${escape(c.angle)}</span>
              <span class="and-sep">×</span>
              <span class="and-persona-sm">${escape(c.persona)}</span>
              <span class="and-sep">×</span>
              <span class="and-format-sm">${escape(c.format)}</span>
            </div>`,
              )
              .join('')}
          </div>
        </details>`
            : ''
        }

        <details class="and-extras" style="margin-top:8px;">
          <summary>📖 Ver todos los ángulos disponibles (${d.andromeda.allAngles?.length || 0})</summary>
          <div class="and-angles-grid">
            ${(d.andromeda.allAngles || [])
              .map(
                (a) => `
            <div class="and-angle-card">
              <div class="and-angle-name">${escape(a.name)}</div>
              <div class="and-angle-desc">${escape(a.desc)}</div>
              <div class="ab-pillar-sub">${(a.tags || []).map((t) => `<span class="ab-tag">${escape(t)}</span>`).join('')}</div>
            </div>`,
              )
              .join('')}
          </div>
        </details>

        <details class="and-extras" style="margin-top:8px;">
          <summary>👥 Ver todas las Buyer Personas (${d.andromeda.allPersonas?.length || 0})</summary>
          <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px;">
            ${(d.andromeda.allPersonas || [])
              .map(
                (p) => `
            <div class="and-persona-card">
              <div class="and-angle-name">${escape(p.name)} <span class="ab-tag">Awareness: ${escape(p.awareness)}</span> <span class="ab-tag and-conv">Conv: ${escape(p.conversion)}</span></div>
              <div class="ab-pillar-sub" style="margin-top:4px;">${(p.pains || []).map((pain) => `<span class="ab-tag ab-tag-blue">${escape(pain)}</span>`).join('')}</div>
              <div class="and-cta" style="margin-top:4px;"><strong>CTA ideal:</strong> ${escape(p.ctaStyle)}</div>
            </div>`,
              )
              .join('')}
          </div>
        </details>
      </div>
    </details>`
        : ''
    }

    ${
      d.timing
        ? `
    <details class="ab-section">
      <summary>⏰ Mejores horarios de publicación</summary>
      <div class="ab-section-body">
        <div class="ab-timing">
          <span><strong>Horarios:</strong> ${(d.timing.best || []).join(' · ')}</span>
          <span><strong>Días:</strong> ${(d.timing.days || []).join(', ')}</span>
          <span><strong>Cadencia:</strong> ${d.timing.cadence || ''}</span>
        </div>
      </div>
    </details>`
        : ''
    }

    ${renderCanvasSpecs(d.canvasSpecs, d._meta?.platform)}

    ${
      d.carouselRules
        ? `
    <details class="ab-section">
      <summary>🎯 Carrusel Viral — Qué hacer vs Qué NO</summary>
      <div class="ab-section-body">
        <div class="cr-cols">
          <div class="cr-col cr-do">
            <div class="cr-col-title">✅ VIRAL</div>
            ${(d.carouselRules.dos || []).map((r) => `<div class="cr-item"><span class="cr-head">${escape(r.do)}</span><span class="cr-why">${escape(r.why)}</span></div>`).join('')}
          </div>
          <div class="cr-col cr-dont">
            <div class="cr-col-title">❌ PÉSIMO</div>
            ${(d.carouselRules.donts || []).map((r) => `<div class="cr-item"><span class="cr-head">${escape(r.dont)}</span><span class="cr-why">${escape(r.why)}</span></div>`).join('')}
          </div>
        </div>
        <div class="cr-format-title">📐 Formato validado de ${(d.carouselRules.validatedFormat || []).length} slides</div>
        <div class="cr-slides">
          ${(d.carouselRules.validatedFormat || [])
            .map(
              (s) => `
            <div class="cr-slide cr-role-${escape(s.role)}">
              <span class="cr-slide-n">${s.slide}</span>
              <span class="cr-slide-purpose">${escape(s.purpose)}</span>
              <span class="cr-slide-w">${escape(s.textWeight)}</span>
            </div>`,
            )
            .join('')}
        </div>
        ${d.carouselRules.dimensions ? `<div class="ab-aud-angle">📏 ${escape(d.carouselRules.dimensions.note || '')} Recomendado: ${d.carouselRules.dimensions.recommended.w}×${d.carouselRules.dimensions.recommended.h} (${escape(d.carouselRules.dimensions.recommended.aspect)})</div>` : ''}
      </div>
    </details>`
        : ''
    }

    </div>
  </details>
  <style>
    .ab-brain-outer{background:var(--card,var(--bg-2,#111));border:1px solid var(--border);border-radius:14px;margin-top:16px;overflow:hidden;}
    .ab-brain-outer > summary{cursor:pointer;list-style:none;padding:14px 16px;user-select:none;display:flex;flex-direction:column;gap:2px;}
    .ab-brain-outer > summary::-webkit-details-marker{display:none;}
    .ab-brain-outer > summary:hover{background:var(--bg,rgba(255,255,255,.03));}
    .ab-brain-outer[open] > summary{border-bottom:1px solid var(--border);}
    .ab-brain-body{padding:14px 16px;}
    .ab-brain-title{font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));}
    .ab-brain-sub{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .ab-error{color:#f87171;padding:10px;font-size:13px;}
    .ab-section{border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;}
    .ab-section > summary{cursor:pointer;list-style:none;padding:10px 13px;font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;display:flex;align-items:center;gap:6px;}
    .ab-section > summary::-webkit-details-marker{display:none;}
    .ab-section-body{padding:4px 13px 13px;display:flex;flex-direction:column;gap:9px;}
    /* Hooks */
    .ab-hook-row{padding:8px 10px;border-radius:8px;background:var(--bg,var(--bg-1,#0a0a0a));border:1px solid var(--border);}
    .ab-hook-top{border-color:#a855f7;box-shadow:0 0 0 1px #a855f760;}
    .ab-hook-verbal{font-size:14px;font-weight:700;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .ab-hook-meta{margin-top:5px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
    .ab-hook-screen{font-size:11.5px;background:#1e1b4b;color:#a5b4fc;padding:2px 7px;border-radius:5px;}
    .ab-hook-visual{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .ab-hook-score{font-size:11.5px;font-weight:800;color:#a855f7;margin-left:auto;}
    .ab-badge{font-size:10px;background:#a855f7;color:#fff;padding:1px 6px;border-radius:5px;font-weight:800;}
    /* Captions */
    .ab-caption-block{padding:8px 10px;border-radius:8px;background:var(--bg,var(--bg-1,#0a0a0a));border:1px solid var(--border);}
    .ab-caption-fmt{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));margin-bottom:4px;display:flex;align-items:center;gap:8px;}
    .ab-caption-text{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.55;white-space:pre-wrap;}
    .ab-hook-highlight{color:#a855f7;font-weight:700;}
    .ab-cta-list{display:flex;flex-direction:column;gap:5px;margin-top:4px;}
    .ab-cta{font-size:12.5px;background:var(--border);padding:4px 10px;border-radius:6px;color:var(--text-primary,var(--fg));}
    /* Copy */
    .ab-copy{background:none;border:1px solid var(--border);border-radius:5px;padding:2px 7px;font-size:11px;cursor:pointer;color:var(--text-secondary,var(--fg-2));transition:background .15s;}
    .ab-copy:hover{background:var(--border);}
    /* Hashtags */
    .ab-ht-group{display:flex;flex-direction:column;gap:5px;}
    .ab-ht-label{font-size:11.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:8px;}
    .ab-ht-recommended{padding:8px;background:var(--bg,#0a0a0a);border-radius:8px;border:1px solid #a855f740;}
    .ab-ht-tags{display:flex;flex-wrap:wrap;gap:5px;}
    .ab-ht{font-size:11.5px;background:var(--border);padding:2px 8px;border-radius:5px;color:var(--text-primary,var(--fg));}
    .ab-ht-strategy{font-size:11px;color:var(--text-tertiary,var(--fg-3));margin-top:4px;}
    /* Ideas */
    .ab-idea{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-bottom:1px solid var(--border);}
    .ab-idea:last-child{border-bottom:none;}
    .ab-idea-n{font-size:18px;font-weight:900;color:#a855f7;min-width:22px;}
    .ab-idea-concept{font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));margin-bottom:4px;}
    .ab-idea-meta{display:flex;gap:6px;flex-wrap:wrap;}
    /* Tags */
    .ab-tag{font-size:11px;background:var(--border);padding:2px 7px;border-radius:5px;color:var(--text-primary,var(--fg));}
    .ab-tag-green{background:#064e3b;color:#6ee7b7;}
    .ab-tag-blue{background:#1e3a5f;color:#93c5fd;}
    .ab-tag-purple{background:#2e1065;color:#c4b5fd;}
    /* Week */
    .ab-week{display:flex;flex-direction:column;gap:5px;}
    .ab-week-row{display:grid;grid-template-columns:90px 80px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .ab-week-row:last-child{border-bottom:none;}
    .ab-week-day{font-weight:800;color:var(--text-primary,var(--fg));}
    .ab-week-fmt{color:#a855f7;font-weight:700;}
    .ab-week-angle{color:var(--text-secondary,var(--fg-2));}
    /* Audience */
    .ab-aud-block{display:flex;flex-wrap:wrap;gap:5px;align-items:center;}
    .ab-aud-block strong{font-size:12px;color:var(--text-secondary,var(--fg-2));min-width:80px;}
    .ab-aud-angle{font-size:12.5px;color:var(--text-secondary,var(--fg-2));font-style:italic;padding:6px 8px;border-left:2px solid #a855f7;margin-top:4px;}
    /* Trends */
    .ab-trends{display:flex;flex-wrap:wrap;gap:6px;}
    .ab-trend{font-size:12px;background:linear-gradient(135deg,#2e1065,#1e1b4b);color:#c4b5fd;padding:3px 10px;border-radius:6px;}
    /* Storytelling beats */
    .ab-beat{display:grid;grid-template-columns:100px 1fr;gap:8px;padding:5px 0;border-bottom:1px solid var(--border);font-size:12.5px;}
    .ab-beat:last-child{border-bottom:none;}
    .ab-beat-label{font-weight:800;color:#a855f7;}
    .ab-beat-label em{font-weight:400;color:var(--text-tertiary,var(--fg-3));font-style:normal;}
    .ab-beat-text{color:var(--text-primary,var(--fg));}
    /* Timing */
    .ab-timing{display:flex;flex-direction:column;gap:5px;font-size:12.5px;color:var(--text-primary,var(--fg));}
    /* Loading placeholder */
    .ab-loading{padding:14px;text-align:center;font-size:13px;color:var(--text-secondary,var(--fg-2));}
    /* Copywriting frameworks */
    .ab-fw-block{border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:8px;background:var(--bg,#0a0a0a);}
    .ab-fw-name{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#a855f7;margin-bottom:7px;}
    .ab-fw-steps{display:flex;flex-direction:column;gap:5px;margin-top:6px;}
    .ab-fw-step{display:grid;grid-template-columns:110px 1fr;gap:8px;font-size:12.5px;padding:4px 0;border-bottom:1px solid var(--border);}
    .ab-fw-step:last-child{border-bottom:none;}
    .ab-fw-step-label{font-weight:800;color:var(--text-secondary,var(--fg-2));font-size:11px;}
    .ab-obj{color:#f87171;}
    .ab-obj-flip{color:#6ee7b7;font-size:12px;}
    /* Pillars */
    .ab-pillar{padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg,#0a0a0a);}
    .ab-pillar-name{font-size:13.5px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:5px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .ab-pillar-sub{display:flex;flex-wrap:wrap;gap:5px;}
    /* Andrómeda */
    .and-insight{font-size:12px;color:var(--text-secondary,var(--fg-2));background:var(--bg,#0a0a0a);padding:8px 10px;border-radius:8px;border-left:3px solid #a855f7;margin-bottom:10px;}
    .and-featured-title{font-size:11.5px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#a855f7;margin-bottom:8px;}
    .and-combo{border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--bg,#0a0a0a);display:flex;flex-direction:column;gap:6px;}
    .and-combo-top{border-color:#a855f7;box-shadow:0 0 0 1px #a855f750;}
    .and-combo-header{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .and-angle{font-size:12.5px;font-weight:800;color:#c4b5fd;background:#2e1065;padding:2px 8px;border-radius:5px;}
    .and-persona{font-size:12.5px;font-weight:800;color:#6ee7b7;background:#064e3b;padding:2px 8px;border-radius:5px;}
    .and-format{font-size:12.5px;font-weight:800;color:#93c5fd;background:#1e3a5f;padding:2px 8px;border-radius:5px;}
    .and-sep{font-size:10px;color:var(--text-tertiary,var(--fg-3));font-weight:900;}
    .and-meta{display:flex;gap:6px;flex-wrap:wrap;}
    .and-conv{background:#78350f;color:#fde68a;}
    .and-hook{font-size:13.5px;font-weight:800;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-style:italic;}
    .and-body{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.55;}
    .and-details{display:flex;gap:12px;font-size:11.5px;color:var(--text-tertiary,var(--fg-3));flex-wrap:wrap;}
    .and-cta{font-size:12px;color:var(--text-primary,var(--fg));display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
    .and-why{font-size:11.5px;color:#6ee7b7;background:#064e3b30;padding:4px 8px;border-radius:5px;}
    .and-fmt-hint{font-size:11px;color:var(--text-tertiary,var(--fg-3));font-style:italic;}
    .and-extras{border:1px solid var(--border);border-radius:8px;overflow:hidden;}
    .and-extras > summary{cursor:pointer;list-style:none;padding:8px 12px;font-size:12.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));user-select:none;}
    .and-extras > summary::-webkit-details-marker{display:none;}
    .and-extras-grid{padding:8px 12px;display:flex;flex-wrap:wrap;gap:5px;}
    .and-extra-pill{display:flex;align-items:center;gap:4px;background:var(--bg,#0a0a0a);border:1px solid var(--border);border-radius:6px;padding:3px 8px;}
    .and-angle-sm{font-size:11px;color:#c4b5fd;}
    .and-persona-sm{font-size:11px;color:#6ee7b7;}
    .and-format-sm{font-size:11px;color:#93c5fd;}
    .and-angles-grid{padding:8px;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
    .and-angle-card,.and-persona-card{border:1px solid var(--border);border-radius:8px;padding:8px;background:var(--bg,#0a0a0a);}
    .and-angle-name{font-size:12.5px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:3px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
    .and-angle-desc{font-size:11.5px;color:var(--text-secondary,var(--fg-2));margin-bottom:5px;line-height:1.4;}
    /* Canvas Specs */
    .cs-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:var(--text-secondary,var(--fg-2));margin-bottom:10px;}
    .cs-legend span{display:flex;align-items:center;gap:4px;}
    .cs-dot{width:9px;height:9px;border-radius:2px;display:inline-block;}
    .cs-red{background:#ef4444;}.cs-amber{background:#f59e0b;}.cs-green{background:#10b981;}.cs-blue{background:transparent;border:1.5px dashed #3b82f6;}
    .cs-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
    .cs-card{border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg,#0a0a0a);display:flex;flex-direction:column;gap:6px;align-items:center;}
    .cs-card-title{font-size:12px;font-weight:800;color:var(--text-primary,var(--fg));text-align:center;}
    .cs-diagram-wrap{display:flex;align-items:center;gap:8px;}
    .cs-svg{border-radius:4px;flex-shrink:0;}
    .cs-dims{display:flex;flex-direction:column;}
    .cs-dim-main{font-size:13px;font-weight:900;color:#a855f7;}
    .cs-dim-aspect{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
    .cs-tip{font-size:10.5px;color:var(--text-secondary,var(--fg-2));line-height:1.4;text-align:center;}
    .cs-visible{font-size:10.5px;color:#93c5fd;}
    .cs-margins{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
    /* Carousel viral rules */
    .cr-cols{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
    @media(max-width:560px){.cr-cols{grid-template-columns:1fr;}}
    .cr-col{border-radius:10px;padding:10px;}
    .cr-do{background:#064e3b22;border:1px solid #10b98150;}
    .cr-dont{background:#7f1d1d22;border:1px solid #ef444450;}
    .cr-col-title{font-size:12px;font-weight:900;margin-bottom:8px;}
    .cr-do .cr-col-title{color:#6ee7b7;}.cr-dont .cr-col-title{color:#fca5a5;}
    .cr-item{margin-bottom:8px;}
    .cr-head{display:block;font-size:12.5px;font-weight:700;color:var(--text-primary,var(--fg));}
    .cr-why{display:block;font-size:11px;color:var(--text-secondary,var(--fg-2));line-height:1.4;}
    .cr-format-title{font-size:12px;font-weight:800;color:#a855f7;margin:12px 0 8px;}
    .cr-slides{display:flex;flex-direction:column;gap:4px;}
    .cr-slide{display:grid;grid-template-columns:28px 1fr 44px;gap:8px;align-items:center;padding:5px 8px;border-radius:6px;background:var(--bg,#0a0a0a);border-left:3px solid var(--border);font-size:12px;}
    .cr-role-hook{border-left-color:#10b981;}.cr-role-interes{border-left-color:#3b82f6;}
    .cr-role-atencion{border-left-color:#a855f7;}.cr-role-practica{border-left-color:#f59e0b;}.cr-role-cta{border-left-color:#ef4444;}
    .cr-slide-n{font-weight:900;color:#a855f7;text-align:center;}
    .cr-slide-purpose{color:var(--text-primary,var(--fg));}
    .cr-slide-w{font-size:9.5px;font-weight:800;color:var(--text-tertiary,var(--fg-3));text-align:right;}
  </style>`;
};

const wireResultEvents = (root, platform) => {
  // Instagram format tabs
  root.querySelectorAll('.bj-ig-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      root.querySelectorAll('.bj-ig-tab').forEach((t) => t.classList.toggle('active', t === tab));
      root.querySelectorAll('.bj-ig-tab-panel').forEach((p) => {
        p.hidden = p.id !== `bj-ig-${target}`;
      });
    });
  });

  // Copy buttons (brujula plan + agency brain)
  const wireCopy = (selector) =>
    root.querySelectorAll(selector).forEach((btn) => {
      btn.addEventListener('click', async () => {
        const txt = btn.dataset.copy || '';
        try {
          await navigator.clipboard.writeText(txt);
          toast('📋 Copiado', 'ok');
        } catch {
          toast('No se pudo copiar', 'warn');
        }
      });
    });
  wireCopy('.bj-copy-btn');
  wireCopy('.ab-copy');

  // Auto-action chips (navigate or API call)
  root.querySelectorAll('.bj-auto-action').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const route = btn.dataset.route;
      const endpoint = btn.dataset.endpoint;
      if (route) {
        window.location.hash = `#${route}`;
        return;
      }
      if (endpoint) {
        btn.disabled = true;
        const topic = activeTopic || '';
        try {
          const body = endpoint.includes('hashtags')
            ? { topic, format: cachedPlan?.recommendedFormat?.format || 'carrusel', hook: topic }
            : endpoint.includes('ab-tests')
              ? { topic, contentType: cachedPlan?.recommendedFormat?.format || 'carrusel', variantCount: 2 }
              : {};
          const r = await fetch(endpoint, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          const data = await r.json().catch(() => ({}));
          if (endpoint.includes('hashtags') && data.total) {
            try {
              await navigator.clipboard.writeText(data.total.join(' '));
            } catch {
              /* noop */
            }
            toast(`✅ ${data.total.length} hashtags copiados`, 'ok');
          } else {
            toast('✅ Listo', 'ok');
          }
        } catch {
          toast('Error al ejecutar acción', 'err');
        }
        btn.disabled = false;
      }
    });
  });

  const recalc = root.querySelector('#bj-recalc');
  if (recalc)
    recalc.addEventListener('click', () => {
      cachedPlan = null;
      cachedPrediction = null;
      void compute(root, platform);
    });

  const forge = root.querySelector('#bj-forge');
  if (forge)
    forge.addEventListener('click', async () => {
      if (!activeTopic) {
        toast('Escribí un tema primero', 'warn');
        return;
      }
      forge.disabled = true;
      forge.textContent = '✨ Generando contenido...';
      try {
        const fmtMap = {
          reels: 'reel',
          stories: 'story',
          video: 'reel',
          photo: 'carousel',
          carousel: 'carousel',
          feed: 'carousel',
        };
        const format = fmtMap[cachedPlan?.recommendedFormat?.format] || 'carousel';
        const r = await fetch('/api/forge/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ format, topic: activeTopic, platform, goal: activeGoal }),
        });
        if (!r.ok) {
          const data = await r.json().catch(() => ({}));
          toast(
            data.error === 'quota-exceeded'
              ? 'Llegaste al límite — upgrade en /pricing'
              : data.message || 'Falló generación',
            'err',
          );
          forge.disabled = false;
          forge.textContent = '✨ Generar contenido completo';
          return;
        }
        const data = await r.json();
        cachedPrediction = data.prediction;
        toast(`✅ Contenido generado · Score viral ${data.prediction.viralScore}/100`, 'ok');
        // Inyectar prediction detail
        const existing = root.querySelector('#bj-pred-overlay');
        if (existing) existing.remove();
        root.insertAdjacentHTML('beforeend', renderPredictionDetail(data.prediction));
        const overlay = root.querySelector('#bj-pred-overlay');
        overlay?.querySelector('#bj-pred-close')?.addEventListener('click', () => overlay.remove());
        forge.disabled = false;
        forge.textContent = '✨ Generar otro';
      } catch (err) {
        toast('Error de red', 'err');
        forge.disabled = false;
        forge.textContent = '✨ Generar contenido completo';
      }
    });

  const predBtn = root.querySelector('#bj-predict');
  if (predBtn)
    predBtn.addEventListener('click', async () => {
      // Prefer inline predictions already computed by brujula plan endpoint
      const pred = cachedPlan?.predictions;
      if (pred) {
        cachedPrediction = pred;
        const existing = root.querySelector('#bj-pred-overlay');
        if (existing) existing.remove();
        root.insertAdjacentHTML('beforeend', renderPredictionDetail(pred));
        const overlay = root.querySelector('#bj-pred-overlay');
        overlay?.querySelector('#bj-pred-close')?.addEventListener('click', () => overlay.remove());
        return;
      }
      // Fallback: call API directly if predictions not in plan
      if (!cachedPlan?.topHook) return;
      const r = await fetch('/api/predict/virality', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hook: cachedPlan.topHook.hook,
          caption: `${cachedPlan.topHook.hook}\n\n${cachedPlan.ctaLadder[0] || ''}`,
          hashtags: [
            '#marketing',
            '#ia',
            '#contenido',
            '#growth',
            '#viral',
            '#tips',
            `#${activeTopic.replace(/\s+/g, '')}`,
          ],
          format: cachedPlan.recommendedFormat.format === 'reels' ? 'reels' : cachedPlan.recommendedFormat.format,
          platform,
          thumbnail: { hasFace: true, hasText: true, highContrast: true, brightColors: true },
        }),
      });
      if (!r.ok) return;
      const apiPred = await r.json();
      cachedPrediction = apiPred;
      const existing = root.querySelector('#bj-pred-overlay');
      if (existing) existing.remove();
      root.insertAdjacentHTML('beforeend', renderPredictionDetail(apiPred));
      const overlay = root.querySelector('#bj-pred-overlay');
      overlay?.querySelector('#bj-pred-close')?.addEventListener('click', () => overlay.remove());
    });
};

const AGENT_MSGS = {
  instagram: [
    '📸 Agente Instagram analizando algoritmo IG…',
    '🎣 Generando hooks para saves + shares…',
    '⏰ Calculando ventanas óptimas de publicación…',
    '🧠 Enriqueciendo con IA especialista Instagram…',
    '📊 Corriendo modelos predictivos (Monte Carlo)…',
    '🎯 Calculando score de viralidad y análisis honesto…',
  ],
  tiktok: [
    '🎵 Agente TikTok analizando señales FYP…',
    '🎣 Generando hooks para completion rate máximo…',
    '🔊 Evaluando formatos trending y audio…',
    '🧠 Enriqueciendo con IA especialista TikTok…',
    '📊 Simulando distribución FYP (alta varianza)…',
    '🎯 Calculando probabilidad real de viralidad…',
  ],
};

const compute = async (root, platform) => {
  const resultHost = root.querySelector('#bj-result-host');
  if (!resultHost) return;

  const msgs = AGENT_MSGS[platform] || AGENT_MSGS.instagram;
  let msgIdx = 0;
  resultHost.innerHTML = `<div class="bj-loading"><span class="spinner lg"></span><span id="bj-load-msg">${msgs[0]}</span></div>`;
  const loadTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % msgs.length;
    const el = root.querySelector('#bj-load-msg');
    if (el) el.textContent = msgs[msgIdx];
  }, 1200);

  try {
    const brandRes = await apiSafe('/api/brand', null);
    const brand = brandRes.data || {};

    const r = await fetch('/api/brujula/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: activeTopic || 'tu producto',
        platform,
        goal: activeGoal,
        brandNiche: activeNiche || brand.niche || '',
        brandVoice: brand.voice || 'cercano',
        brandType: activeBrandType || 'personal',
        accountId: activeAccountId || '',
      }),
    });
    clearInterval(loadTimer);
    if (!r.ok) {
      resultHost.innerHTML = '<div class="bj-warning">Error generando plan. Reintentá.</div>';
      return;
    }
    cachedPlan = await r.json();
    resultHost.innerHTML = renderPlanResult(cachedPlan, platform);
    wireResultEvents(root, platform);

    // Agency Brain — carga en background, no bloquea el plan
    const brandRes2 = await apiSafe('/api/brand', null).catch(() => ({ data: {} }));
    const brand2 = brandRes2.data || {};
    fetch('/api/agency/brain/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        topic: activeTopic || 'tu producto',
        platform,
        goal: activeGoal,
        niche: activeNiche || brand2.niche || cachedPlan?._debug?.niche || '',
        brandVoice: brand2.voice || '',
        briefSnippet: cachedPlan?.briefText || '',
        accountId: activeAccountId || '',
      }),
    })
      .then((res) => res.json())
      .then((ab) => {
        const host = root.querySelector('#bj-agency-host');
        if (!host) return;
        host.innerHTML = renderAgencyBrain(ab);
        host.querySelectorAll('.ab-copy').forEach((btn) => {
          btn.addEventListener('click', async () => {
            try {
              await navigator.clipboard.writeText(btn.dataset.copy || '');
              toast('📋 Copiado', 'ok');
            } catch {
              toast('No se pudo copiar', 'warn');
            }
          });
        });
      })
      .catch(() => {
        const host = root.querySelector('#bj-agency-host');
        if (host) host.innerHTML = '';
      });
  } catch {
    clearInterval(loadTimer);
    resultHost.innerHTML = '<div class="bj-warning">Error de red. Reintentá.</div>';
  }
};

// Run All Banner — botón gigante "Trabajar mi cuenta esta semana"
const renderRunAllBanner = () => `
  <div class="ra-card" id="ra-card">
    <div class="ra-head">
      <div class="ra-emoji">🤖</div>
      <div>
        <div class="ra-title">Trabajar mi cuenta esta semana</div>
        <div class="ra-sub">1 click → análisis del nicho + aprendizaje de métricas + 3 carruseles + drafts de respuestas DM</div>
      </div>
    </div>
    <button class="ra-btn" id="ra-go">▶ Ejecutar todo</button>
    <div id="ra-result" class="ra-result"></div>
  </div>
  <style>
    .ra-card{margin:18px 0;padding:20px;border-radius:16px;background:linear-gradient(135deg,rgba(16,242,176,.10),rgba(59,130,246,.06));border:1px solid rgba(16,242,176,.3);}
    .ra-head{display:flex;gap:14px;align-items:center;margin-bottom:14px;}
    .ra-emoji{font-size:36px;}
    .ra-title{font-weight:900;font-size:16px;color:var(--text-primary,var(--fg));}
    .ra-sub{font-size:12.5px;color:var(--text-secondary,var(--fg-2));margin-top:3px;line-height:1.45;}
    .ra-btn{width:100%;padding:14px;background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;border:none;border-radius:10px;font-weight:900;font-size:14px;cursor:pointer;letter-spacing:1px;}
    .ra-btn:hover{filter:brightness(1.08);}
    .ra-btn:disabled{opacity:.6;cursor:wait;}
    .ra-result{margin-top:14px;}
    .ra-timeline{padding:10px 12px;border-radius:8px;background:#070710;border:1px solid var(--border);font-family:"SF Mono",Menlo,monospace;font-size:12px;line-height:1.65;color:#E5E7EB;max-height:240px;overflow-y:auto;}
    .ra-tl-row{display:grid;grid-template-columns:50px 20px 1fr;gap:8px;padding:2px 0;}
    .ra-tl-row.warn{color:#FBBF24;}.ra-tl-row.fail{color:#FCA5A5;}
    .ra-grp{margin-top:14px;}
    .ra-grp-title{font-size:13px;font-weight:800;color:#a855f7;margin-bottom:8px;display:flex;align-items:center;gap:6px;}
    .ra-day{padding:12px;border:1px solid var(--border);border-radius:10px;margin-bottom:10px;background:var(--bg,rgba(255,255,255,.02));}
    .ra-day-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
    .ra-day-name{font-weight:800;color:#10F2B0;font-size:12.5px;}
    .ra-day-score{font-size:11.5px;color:#a78bfa;}
    .ra-day-hook{font-size:13.5px;color:var(--text-primary,var(--fg));font-weight:600;margin-bottom:8px;}
    .ra-dm{padding:10px;border:1px solid var(--border);border-radius:8px;margin-bottom:8px;background:var(--bg,rgba(255,255,255,.02));}
    .ra-dm-intent{display:inline-block;padding:2px 8px;background:rgba(168,85,247,.15);color:#A78BFA;font-size:10.5px;font-weight:800;border-radius:5px;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px;}
    .ra-dm-reply{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.5;}
  </style>`;

// Account Studio — Computer Vision (audit feed / aprender de referentes) + loop de métricas reales.
const renderAccountStudio = () => `
  ${renderRunAllBanner()}
  <details class="bj-card bj-studio bj-studio-collapsed">
    <summary class="bj-studio-summary">🛠️ Más herramientas <span class="bj-studio-sub">visión de feed · auto-publicar · métricas · conectar IG/TikTok</span></summary>

    <details class="bj-studio-panel">
      <summary>👁️ Analizar mi feed (Computer Vision)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Subí 1-9 capturas de tu feed/posts. La IA evalúa coherencia visual, detecta huecos y te dice qué publicar.</p>
        <input type="file" id="bj-vision-files" class="bj-file" accept="image/*" multiple />
        <button class="bj-btn bj-btn-secondary" id="bj-vision-go">Analizar feed</button>
        <div id="bj-vision-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🔍 Aprender de una cuenta exitosa</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Subí captura del perfil/feed de un referente de tu nicho. Extrae patrones replicables (sin copiar literal).</p>
        <input type="file" id="bj-learn-files" class="bj-file" accept="image/*" multiple />
        <button class="bj-btn bj-btn-secondary" id="bj-learn-go">Analizar referente</button>
        <div id="bj-learn-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🔗 Conectar Instagram / TikTok (publicar + métricas reales)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Conectá tus cuentas vía API oficial para auto-publicar y traer métricas reales automáticamente. Requiere apps de Meta/TikTok configuradas.</p>
        <div id="bj-connect-status" class="bj-studio-result">⏳ Cargando estado…</div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>📊 Cargar resultados de un post (loop de aprendizaje)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Cargá las métricas reales de un post publicado. El sistema aprende qué funciona y ajusta tu estrategia.</p>
        <input id="bj-m-topic" class="bj-input bj-input-sm" type="text" placeholder="Tema del post" />
        <div class="bj-metric-grid">
          <select id="bj-m-format" class="bj-input bj-input-sm">
            <option value="reel">Reel</option><option value="carousel">Carrusel</option><option value="story">Historia</option>
          </select>
          <input id="bj-m-reach" class="bj-input bj-input-sm" type="number" placeholder="Alcance" />
          <input id="bj-m-saves" class="bj-input bj-input-sm" type="number" placeholder="Guardados" />
          <input id="bj-m-shares" class="bj-input bj-input-sm" type="number" placeholder="Compartidos" />
          <input id="bj-m-comments" class="bj-input bj-input-sm" type="number" placeholder="Comentarios" />
          <input id="bj-m-follows" class="bj-input bj-input-sm" type="number" placeholder="Follows" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="bj-m-go">Guardar y aprender</button>
        <div id="bj-m-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🎨 Brand Studio — Imagen de marca con tu foto</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Subí tu(s) foto(s) autorizada(s). La IA las usa como protagonista, aplica tu estilo, colores de marca y elementos del nicho. Motor: Gemini nano-banana (foto→imagen).</p>
        <input type="file" id="bs-files" class="bj-file" accept="image/*" multiple />
        <select id="bs-template" class="bj-input bj-input-sm">
          <option value="anuncio-ganador">🏆 Anuncio ganador</option>
          <option value="carrusel">🎠 Carrusel seamless</option>
          <option value="portada-reel">🎬 Portada de Reel</option>
          <option value="branding">🎨 Identidad visual / Branding</option>
          <option value="producto-mockup">📦 Mockup de producto</option>
        </select>
        <input id="bs-titulo" class="bj-input bj-input-sm" type="text" placeholder="Título principal / producto (ej: CarouselCode)" />
        <div class="bj-metric-grid">
          <select id="bs-estilo" class="bj-input bj-input-sm">
            <option value="premium">Premium</option>
            <option value="moderno">Moderno</option>
            <option value="minimalista">Minimalista</option>
            <option value="editorial">Editorial</option>
            <option value="oscuro-glow">Oscuro con glow</option>
            <option value="colorido-genz">Colorido Gen-Z</option>
            <option value="corporativo">Corporativo</option>
            <option value="organico">Orgánico</option>
          </select>
          <input id="bs-colores" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (ej: verde menta, negro)" />
          <select id="bs-formato" class="bj-input bj-input-sm">
            <option value="carousel">Carrusel 3:4</option>
            <option value="reel">Reel/Portada 9:16</option>
            <option value="sponsored-feed">Sponsored 4:5</option>
            <option value="profile">Perfil 1:1</option>
          </select>
        </div>
        <input id="bs-elementos" class="bj-input bj-input-sm" type="text" placeholder="Elementos visibles del nicho (ej: laptop, gráficos, dashboards)" />
        <label style="font-size:12px;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="bs-refine" /> ✨ Refinar calidad (FAL upscaler 2x — más nítido, tarda más)</label>
        <button class="bj-btn bj-btn-secondary" id="bs-build">👁️ Ver prompt</button>
        <button class="bj-btn bj-btn-secondary" id="bs-go">✨ Generar imagen</button>
        <div id="bs-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🧠 Aprender de mi cuenta (sin subir nada)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema <b>se conecta a tu Instagram</b> (via Meta Graph API) y <b>TikTok</b> (si están conectados en el panel "🔗 Conectar Instagram/TikTok"), trae los últimos posts con sus métricas reales, detecta <b>patrones ganadores</b> (formato, hook, horario) y los inyecta automáticamente en TODAS las próximas generaciones. NO necesitás subir nada manualmente.</p>
        <button class="bj-btn bj-btn-secondary" id="fb-go">🧠 Analizar y aprender</button>
        <div id="fb-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🧬 Gstack — Decisión inteligente (meta-controller)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Describí tu objetivo en lenguaje libre. El meta-controller elige <b>archetype + mood + roles IA</b> óptimos y ejecuta el módulo correcto (carrusel/reel/historia/comunidad).</p>
        <textarea id="gs-task" class="bj-input bj-input-sm" rows="2" placeholder='Ej: "Lanzá un carrusel para vender mi curso" o "Respondé este DM"'></textarea>
        <div class="bj-metric-grid">
          <select id="gs-format" class="bj-input bj-input-sm">
            <option value="">Auto-detectar formato</option>
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel</option>
            <option value="story">Historia</option>
          </select>
          <input id="gs-colors" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (opcional)" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="gs-go">🧬 Ejecutar Gstack</button>
        <div id="gs-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>💬 Community Brain — CM inteligente (cultura · hilo · humor · contexto)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema <b>analiza profundo en 5 pasos</b>: autor (país, hilo previo), contexto del post, intent + emoción + complejidad, razona la respuesta y la ajusta a la cultura regional. Usa humor solo cuando corresponde. Spam/troll → ignora sin gastar IA.</p>
        <div class="bj-tabs" style="display:flex;gap:6px;margin-bottom:6px;">
          <button class="bj-btn bj-btn-secondary bj-tab-btn" data-ce="dm" style="flex:1;padding:6px;font-size:12px;">📨 DM</button>
          <button class="bj-btn bj-btn-ghost bj-tab-btn" data-ce="comment" style="flex:1;padding:6px;font-size:12px;">💭 Comentario</button>
        </div>
        <input id="ce-sender" class="bj-input bj-input-sm" type="text" placeholder="@handle del autor (opcional pero mejora análisis y hilo)" />
        <textarea id="ce-input" class="bj-input bj-input-sm" rows="3" placeholder="Pegá el DM/comentario recibido…"></textarea>
        <input id="ce-context" class="bj-input bj-input-sm" type="text" placeholder="Contexto del post (solo comentarios, opcional)" style="display:none;" />
        <button class="bj-btn bj-btn-secondary" id="ce-go">🧠 Analizar y responder</button>
        <div id="ce-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>📱 Historias visuales (5 frames 9:16 con stickers)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Genera <b>5 frames visuales</b> (1080×1920) con texto vectorial, stickers (encuesta/pregunta/slider/quiz/link) y good-zones de IG respetadas. Tocá un frame para ampliar.</p>
        <input type="file" id="se-file" class="bj-file" accept="image/*" />
        <div class="bj-metric-grid">
          <input id="se-colors" class="bj-input bj-input-sm" type="text" placeholder="Colores marca (ej: negro, menta)" />
          <select id="se-archetype" class="bj-input bj-input-sm">
            <option value="cercano">Cercano</option>
            <option value="educador">Educador</option>
            <option value="humorista">Humorista</option>
            <option value="autoridad">Autoridad</option>
            <option value="vendedor">Vendedor</option>
          </select>
          <input id="se-count" class="bj-input bj-input-sm" type="number" min="3" max="8" placeholder="Cantidad (3-8)" value="5" />
        </div>
        <button class="bj-btn bj-btn-secondary" id="se-go">📱 Generar historias</button>
        <div id="se-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🧬 Niche Intelligence (estudio profundo del nicho + audiencia)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El sistema corre <b>5 análisis encadenados</b> (nicho profundo + perfil audiencia + mapa competitivo + oportunidades + síntesis con 3 roles IA) y cachea 7 días. Después se inyecta automáticamente en cada generación.</p>
        <button class="bj-btn bj-btn-secondary" id="bj-intel-go">🧬 Correr análisis profundo</button>
        <div id="bj-intel-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🎨 Conectar Canva (slides PRO con brand template)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Si conectás Canva, el carrusel usa tu <b>brand template oficial</b> (calidad pro, fuentes reales) en vez del composer SVG. Si no, el sistema usa el composer interno (también legible, auto-fit safe-zones).</p>
        <div id="bj-canva-status" class="bj-studio-result">⏳ Cargando estado de Canva…</div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🤖 Piloto automático (crear + publicar solo)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">El cerebro elige el mejor ángulo, escribe el copy, genera la imagen (con reglas virales) y — si tu cuenta está conectada — <b>publica vía API oficial sin que hagas nada</b>. Sin foto = imagen IA; con foto = vos de protagonista.</p>
        <input type="file" id="ap-files" class="bj-file" accept="image/*" multiple />
        <div class="bj-metric-grid">
          <select id="ap-format" class="bj-input bj-input-sm">
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel/Portada</option>
          </select>
          <input id="ap-colores" class="bj-input bj-input-sm" type="text" placeholder="Colores marca" />
          <input id="ap-elementos" class="bj-input bj-input-sm" type="text" placeholder="Elementos del nicho" />
        </div>
        <label style="font-size:12px;color:var(--text-secondary,var(--fg-2));display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="ap-publish" /> 🚀 Auto-publicar (requiere cuenta conectada arriba)</label>
        <button class="bj-btn bj-btn-secondary" id="ap-go">🤖 Crear post autónomo</button>
        <div id="ap-result" class="bj-studio-result"></div>
      </div>
    </details>

    <details class="bj-studio-panel">
      <summary>🏛️ Consejo de agencia (6 agentes IA)</summary>
      <div class="bj-studio-body">
        <p class="bj-studio-hint">Orquesta 6 especialistas (research de nicho, audiencia, hooks, sonidos, visuales, estrategia) sobre el tema de arriba. Más profundo, usa más IA.</p>
        <button class="bj-btn bj-btn-secondary" id="bj-council-go">Convocar consejo</button>
        <div id="bj-council-result" class="bj-studio-result"></div>
      </div>
    </details>
  </details>
  <style>
    .bj-studio{margin-top:12px;}
    .bj-studio-collapsed{padding:0;overflow:hidden;}
    .bj-studio-summary{cursor:pointer;list-style:none;padding:14px 16px;font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));user-select:none;display:flex;flex-direction:column;gap:2px;}
    .bj-studio-summary::-webkit-details-marker{display:none;}
    .bj-studio-summary:hover{background:var(--bg,rgba(255,255,255,.03));}
    .bj-studio-collapsed[open] > .bj-studio-summary{border-bottom:1px solid var(--border);}
    .bj-studio-collapsed > *:not(.bj-studio-summary){padding:14px 16px;}
    .bj-studio-title{font-size:15px;font-weight:800;color:var(--text-primary,var(--fg));margin-bottom:12px;}
    .bj-studio-sub{font-weight:400;font-size:12px;color:var(--text-tertiary,var(--fg-3));}
    .bj-studio-panel{border:1px solid var(--border);border-radius:10px;margin-bottom:8px;overflow:hidden;}
    .bj-studio-panel > summary{cursor:pointer;list-style:none;padding:11px 13px;font-size:13.5px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;}
    .bj-studio-panel > summary::-webkit-details-marker{display:none;}
    .bj-studio-body{padding:0 13px 13px;display:flex;flex-direction:column;gap:9px;}
    .bj-studio-hint{font-size:12px;color:var(--text-secondary,var(--fg-2));margin:0;line-height:1.45;}
    .bj-file{font-size:12px;color:var(--text-secondary,var(--fg-2));}
    .bj-btn-secondary{align-self:flex-start;background:linear-gradient(135deg,#a855f7,#6366f1);color:#fff;border:none;border-radius:9px;padding:9px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;}
    .bj-btn-secondary:disabled{opacity:.6;cursor:wait;}
    .bj-metric-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px;}
    @media(max-width:600px){.bj-metric-grid{grid-template-columns:repeat(2,1fr);}}
    .bj-studio-result{font-size:13px;color:var(--text-primary,var(--fg));line-height:1.55;}
    .bj-vr-score{display:inline-block;font-weight:800;color:#a855f7;font-size:18px;}
    .bj-vr-block{margin-top:8px;}
    .bj-vr-block b{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,var(--fg-3));margin-bottom:3px;}
    .bj-vr-block ul{margin:0;padding-left:18px;}
    .bj-conn-row{display:flex;align-items:center;gap:10px;padding:6px 0;flex-wrap:wrap;}
    .bj-conn-name{font-weight:700;min-width:90px;}
    .bj-conn-ok{color:#10b981;font-size:12.5px;}
    .bj-conn-warn{color:#f59e0b;font-size:12px;}
    .bj-conn-btn{text-decoration:none;padding:6px 14px;font-size:12.5px;}
    .ap-slides{display:flex;gap:8px;overflow-x:auto;padding:6px 0 10px;scroll-snap-type:x mandatory;}
    .ap-slide{position:relative;flex:0 0 auto;width:135px;scroll-snap-align:start;}
    .ap-slide{cursor:zoom-in;transition:transform .15s;}
    .ap-slide:hover{transform:scale(1.03);}
    .ap-slide img{width:135px;height:180px;object-fit:cover;border-radius:8px;border:1px solid var(--border);display:block;}
    .ap-slide-tag{position:absolute;top:4px;left:4px;background:rgba(0,0,0,.7);color:#fff;font-size:9.5px;font-weight:700;padding:2px 6px;border-radius:4px;}
    /* Lightbox WhatsApp-style */
    .ap-lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;animation:apFade .15s ease-out;}
    @keyframes apFade{from{opacity:0;}to{opacity:1;}}
    .ap-lb-close{position:absolute;top:16px;right:18px;background:rgba(255,255,255,.1);color:#fff;border:none;width:42px;height:42px;border-radius:50%;font-size:20px;cursor:pointer;font-weight:700;}
    .ap-lb-close:hover{background:rgba(255,255,255,.2);}
    .ap-lb-nav{position:absolute;top:50%;transform:translateY(-50%);background:rgba(255,255,255,.1);color:#fff;border:none;width:54px;height:54px;border-radius:50%;font-size:34px;cursor:pointer;line-height:1;}
    .ap-lb-nav:hover:not(:disabled){background:rgba(255,255,255,.25);}
    .ap-lb-nav:disabled{opacity:.25;cursor:not-allowed;}
    .ap-lb-prev{left:16px;}.ap-lb-next{right:16px;}
    .ap-lb-stage{display:flex;flex-direction:column;align-items:center;gap:12px;max-width:90vw;max-height:90vh;}
    .ap-lb-stage img{max-width:90vw;max-height:78vh;width:auto;height:auto;border-radius:14px;box-shadow:0 8px 40px rgba(0,0,0,.6);}
    .ap-lb-meta{color:rgba(255,255,255,.85);font-size:13px;font-weight:600;background:rgba(0,0,0,.5);padding:6px 14px;border-radius:8px;text-align:center;}
    .ap-lb-dl{position:absolute;bottom:20px;left:50%;transform:translateX(-50%);background:#a855f7;color:#fff;text-decoration:none;padding:10px 22px;border-radius:24px;font-size:13px;font-weight:800;}
    .ap-lb-dl:hover{background:#9333ea;}
    @media(max-width:600px){.ap-lb-nav{width:44px;height:44px;font-size:28px;}.ap-lb-stage img{max-height:72vh;}}
  </style>`;

export const renderBrujula = async (container) => {
  const platform = await getPlatform();
  container.innerHTML = `
    ${renderHero(platform)}
    <div class="bj-shell">
      ${renderInputForm(platform)}
      <div id="bj-result-host"></div>
      ${renderAccountStudio()}
    </div>
    <style>
      .bj-topic-hint{margin-top:8px;padding:8px 12px;background:rgba(168,85,247,.07);border-left:3px solid #a855f7;border-radius:0 8px 8px 0;font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.5;}
      .bj-tip-bar{display:flex;gap:10px;align-items:flex-start;background:rgba(99,102,241,.07);border:1px solid rgba(99,102,241,.20);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--text-primary,var(--fg));line-height:1.45;}
      .bj-tip-icon{font-size:16px;flex-shrink:0;margin-top:1px;}
      .bj-quickwin{background:rgba(16,185,129,.07);border:1px solid rgba(16,185,129,.25);border-radius:12px;padding:10px 14px;font-size:13px;color:var(--text-primary,var(--fg));}
      .bj-caption-draft{font-size:14px;line-height:1.6;color:var(--text-primary,var(--fg));white-space:pre-wrap;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:10px 12px;margin-top:4px;}
      .bj-copy-btn{font-size:11px;font-weight:700;color:#a855f7;background:transparent;border:1px solid rgba(168,85,247,.3);border-radius:6px;padding:3px 9px;cursor:pointer;font-family:inherit;transition:background .12s;}
      .bj-copy-btn:hover{background:rgba(168,85,247,.08);}
      .bj-outline-step{display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-outline-step:last-child{border:0;}
      .bj-outline-n{font-size:11px;font-weight:800;color:#a855f7;background:rgba(168,85,247,.12);width:20px;height:20px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .bj-outline-step span{font-size:13px;color:var(--text-secondary,var(--fg-2));line-height:1.4;}
      .bj-hashtag-section{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px;}
      .bj-ht-cat{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,var(--fg-3));min-width:48px;}
      .bj-ht-chip{font-size:12px;padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-ht-chip.core{background:rgba(99,102,241,.12);color:#818cf8;border:1px solid rgba(99,102,241,.25);}
      .bj-ht-chip.niche{background:rgba(168,85,247,.10);color:#c084fc;border:1px solid rgba(168,85,247,.25);}
      .bj-ht-chip.trending{background:rgba(16,185,129,.10);color:#34d399;border:1px solid rgba(16,185,129,.25);}
      .bj-auto-grid{display:flex;flex-wrap:wrap;gap:8px;}
      .bj-auto-primary{flex:1;min-width:200px;margin-top:0;}
      .bj-auto-action{font-size:13px;padding:9px 14px;}
    </style>
    <style>
      .bj-hero{display:flex;gap:16px;align-items:center;padding:24px 28px;border-radius:18px;color:#fff;margin-bottom:18px;box-shadow:0 12px 40px rgba(0,0,0,.18);}
      .bj-hero-emoji{font-size:48px;line-height:1;}
      .bj-hero h1{margin:0;font-size:26px;letter-spacing:-0.02em;}
      .bj-hero p{margin:4px 0 0;font-size:14px;opacity:.92;}
      .bj-shell{display:flex;flex-direction:column;gap:16px;}
      .bj-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:20px 22px;}
      .bj-step-label{font-size:12.5px;font-weight:700;color:var(--text-secondary,var(--fg-2));letter-spacing:-0.005em;margin-bottom:8px;text-transform:uppercase;}
      .bj-input{width:100%;box-sizing:border-box;padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border);border-radius:10px;color:var(--text-primary,var(--fg));font-size:15px;font-family:inherit;outline:none;transition:border-color .15s;}
      .bj-input:focus{border-color:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.12);}
      .bj-input-sm{padding:9px 12px;font-size:13px;}
      .bj-account-box{margin-top:14px;border:1px dashed var(--border);border-radius:10px;padding:0;overflow:hidden;}
      .bj-account-sum{cursor:pointer;list-style:none;padding:10px 12px;font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));user-select:none;}
      .bj-account-sum::-webkit-details-marker{display:none;}
      .bj-account-hint{font-weight:400;font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-account-fields{padding:0 12px 12px;display:flex;flex-direction:column;gap:8px;}
      .bj-account-row{display:flex;gap:8px;}
      .bj-account-row > *{flex:1;}
      .bj-goals{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;}
      .bj-goal{display:flex;flex-direction:column;gap:3px;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border:1.5px solid var(--border);border-radius:10px;cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s,background .15s;}
      .bj-goal:hover{border-color:rgba(168,85,247,.5);}
      .bj-goal.active{border-color:#a855f7;background:rgba(168,85,247,.06);}
      .bj-goal-emoji{font-size:18px;line-height:1;}
      .bj-goal-label{font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));}
      .bj-goal-desc{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-btn{padding:12px 18px;border-radius:10px;border:0;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;transition:filter .15s,transform .12s;}
      .bj-btn-primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;width:100%;margin-top:14px;}
      .bj-btn-primary:hover{filter:brightness(1.08);} .bj-btn-primary:active{transform:scale(.985);} .bj-btn-primary:disabled{opacity:.6;cursor:wait;}
      .bj-btn-ghost{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));border:1px solid var(--border);}
      .bj-btn-ghost:hover{background:rgba(17,18,22,.06);}
      .bj-loading{display:flex;align-items:center;gap:10px;padding:30px;justify-content:center;color:var(--text-secondary,var(--fg-2));}
      .bj-result{display:flex;flex-direction:column;gap:14px;}
      .bj-score-strip{display:flex;gap:18px;align-items:center;background:linear-gradient(135deg,rgba(168,85,247,.10),rgba(225,48,108,.08));border:1px solid rgba(168,85,247,.30);border-radius:14px;padding:16px 20px;}
      .bj-score-num{font-size:48px;font-weight:800;background:linear-gradient(135deg,#e1306c,#a855f7);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;line-height:1;}
      .bj-score-label strong{display:block;font-size:14px;color:var(--text-primary,var(--fg));}
      .bj-score-label span{font-size:12.5px;color:var(--text-secondary,var(--fg-2));}
      .bj-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
      @media (max-width:740px){.bj-grid{grid-template-columns:1fr;}}
      .bj-block{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:14px;padding:16px 18px;}
      .bj-block-label{font-size:11px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-tertiary,var(--fg-3));margin-bottom:10px;}
      .bj-format-name{font-size:22px;font-weight:800;letter-spacing:-0.02em;}
      .bj-format-fit{font-size:13px;color:#10b981;font-weight:700;margin:4px 0 6px;}
      .bj-format-reason{font-size:12px;color:var(--text-secondary,var(--fg-2));line-height:1.5;}
      .bj-window{font-size:13px;padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;margin-bottom:4px;color:var(--text-primary,var(--fg));}
      .bj-hook{display:flex;gap:12px;align-items:center;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;margin-bottom:6px;position:relative;}
      .bj-hook.best{background:linear-gradient(90deg,rgba(168,85,247,.10),transparent);border-left:3px solid #a855f7;}
      .bj-hook-strength{width:36px;height:36px;border-radius:50%;background:conic-gradient(#a855f7 var(--w),rgba(168,85,247,.15) 0);display:grid;place-items:center;flex-shrink:0;font-size:11px;font-weight:800;color:#a855f7;}
      .bj-hook-strength span{background:var(--bg-card,#fff);width:28px;height:28px;border-radius:50%;display:grid;place-items:center;}
      .bj-hook-text{flex:1;font-size:14px;line-height:1.4;color:var(--text-primary,var(--fg));}
      .bj-best-badge{font-size:10px;background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;padding:3px 8px;border-radius:999px;font-weight:800;}
      .bj-checklist-item{display:flex;flex-direction:column;gap:2px;padding:8px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-checklist-item:last-child{border-bottom:0;}
      .bj-checklist-item strong{font-size:12px;color:#a855f7;text-transform:uppercase;letter-spacing:0.03em;}
      .bj-checklist-item span{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.45;}
      .bj-cta,.bj-angle{font-size:13px;padding:7px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;margin-bottom:4px;color:var(--text-primary,var(--fg));}
      .bj-warning{background:rgba(245,158,11,.08);border:1px solid rgba(245,158,11,.35);border-radius:12px;padding:12px 16px;color:var(--text-primary,var(--fg));font-size:13px;}
      .bj-warning ul{margin:6px 0 0 18px;padding:0;}
      .bj-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .bj-actions .bj-btn-primary{width:auto;margin-top:0;flex:1;min-width:220px;}
      .bj-muted{color:var(--text-tertiary,var(--fg-3));font-size:13px;}
      .bj-pred-overlay{position:fixed;inset:0;z-index:10070;background:rgba(0,0,0,.65);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;animation:bjf .25s ease;}
      @keyframes bjf{from{opacity:0}to{opacity:1}}
      .bj-pred-card{position:relative;background:var(--bg-card,#fff);border-radius:18px;padding:30px;max-width:520px;width:92%;color:var(--text-primary,var(--fg));max-height:88vh;overflow:auto;animation:bju .3s cubic-bezier(.16,.84,.44,1);}
      @keyframes bju{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      .bj-pred-close{position:absolute;top:14px;right:14px;background:transparent;border:0;font-size:18px;cursor:pointer;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-score{display:flex;flex-direction:column;align-items:center;padding:20px;border-radius:14px;margin-bottom:18px;color:#fff;}
      .bj-pred-breakout{background:linear-gradient(135deg,#10b981,#a855f7);}
      .bj-pred-high{background:linear-gradient(135deg,#3b82f6,#a855f7);}
      .bj-pred-solid{background:linear-gradient(135deg,#6366f1,#22d3ee);}
      .bj-pred-mediocre{background:linear-gradient(135deg,#f59e0b,#ef4444);}
      .bj-pred-num{font-size:56px;font-weight:800;letter-spacing:-0.03em;}
      .bj-pred-label{font-size:13px;opacity:.9;}
      .bj-pred-class{font-size:11px;text-transform:uppercase;font-weight:800;letter-spacing:0.08em;margin-top:4px;}
      .bj-pred-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;}
      .bj-pred-metric{background:var(--bg-soft,rgba(17,18,22,.03));padding:12px;border-radius:10px;text-align:center;}
      .bj-pred-metric strong{display:block;font-size:18px;color:var(--text-primary,var(--fg));}
      .bj-pred-metric span{font-size:11px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-improve{background:rgba(168,85,247,.06);border-left:3px solid #a855f7;border-radius:8px;padding:12px;font-size:12.5px;line-height:1.55;}
      .bj-pred-improve ul{margin:6px 0 0 18px;padding:0;}
      .bj-pred-inline{border:1px solid rgba(168,85,247,.22);background:linear-gradient(135deg,rgba(168,85,247,.04),rgba(99,102,241,.03));}
      .bj-pred-row{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;align-items:flex-start;}
      .bj-pred-gbox{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:90px;}
      .bj-pred-gauge{width:72px;height:72px;border-radius:50%;background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.15) 0);display:grid;place-items:center;}
      .bj-pred-vn{font-size:20px;font-weight:800;color:#a855f7;background:var(--bg-card,#fff);width:56px;height:56px;border-radius:50%;display:grid;place-items:center;}
      .bj-pred-vlbl{font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;}
      .bj-vclass-breakout{color:#10b981;} .bj-vclass-high{color:#3b82f6;} .bj-vclass-solid{color:#a855f7;} .bj-vclass-low{color:#f59e0b;}
      .bj-pred-vceiling{font-size:10px;color:var(--text-tertiary,var(--fg-3));text-align:center;}
      .bj-pred-dbox{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:10px 14px;border-radius:12px;gap:3px;min-width:80px;}
      .bj-d-go{background:rgba(16,185,129,.10);border:1.5px solid rgba(16,185,129,.35);}
      .bj-d-cond{background:rgba(245,158,11,.10);border:1.5px solid rgba(245,158,11,.35);}
      .bj-d-nogo{background:rgba(239,68,68,.10);border:1.5px solid rgba(239,68,68,.35);}
      .bj-pred-dbadge{font-size:15px;font-weight:900;letter-spacing:0.04em;}
      .bj-d-go .bj-pred-dbadge{color:#10b981;} .bj-d-cond .bj-pred-dbadge{color:#f59e0b;} .bj-d-nogo .bj-pred-dbadge{color:#ef4444;}
      .bj-pred-dscore{font-size:13px;font-weight:700;color:var(--text-primary,var(--fg));}
      .bj-pred-dtitle{font-size:9px;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:0.04em;}
      .bj-pred-qm{display:flex;gap:8px;flex-wrap:wrap;flex:1;}
      .bj-pred-qmet{display:flex;flex-direction:column;gap:2px;background:var(--bg-soft,rgba(17,18,22,.03));padding:10px 12px;border-radius:10px;min-width:78px;flex:1;}
      .bj-pred-qmet strong{font-size:17px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-qmet span{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-mc{margin-bottom:14px;}
      .bj-pred-mc-title{font-size:10px;font-weight:800;letter-spacing:0.04em;text-transform:uppercase;color:var(--text-tertiary,var(--fg-3));margin-bottom:8px;}
      .bj-pred-mcrow{display:flex;align-items:center;gap:8px;margin-bottom:5px;}
      .bj-pred-mclbl{font-size:11px;color:var(--text-secondary,var(--fg-2));min-width:114px;}
      .bj-pred-mcbar{flex:1;height:6px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:3px;overflow:hidden;}
      .bj-pred-mcfill{height:100%;border-radius:3px;transition:width .6s ease;}
      .bj-pred-mcval{font-size:12px;font-weight:700;min-width:50px;text-align:right;}
      .bj-pred-matrix{display:flex;flex-direction:column;gap:5px;margin-bottom:12px;}
      .bj-pred-dim{display:flex;align-items:center;gap:8px;}
      .bj-pred-dimlbl{font-size:11px;color:var(--text-secondary,var(--fg-2));min-width:80px;display:flex;gap:4px;align-items:center;}
      .bj-pred-dimw{font-size:9px;color:var(--text-tertiary,var(--fg-3));background:var(--bg-soft,rgba(17,18,22,.06));padding:1px 4px;border-radius:3px;}
      .bj-pred-dimbar{flex:1;height:8px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:4px;overflow:hidden;}
      .bj-pred-dimsc{font-size:11px;font-weight:700;color:var(--text-secondary,var(--fg-2));min-width:28px;text-align:right;}
      .bj-pred-imps{background:rgba(168,85,247,.05);border-left:3px solid #a855f7;border-radius:0 8px 8px 0;padding:10px 12px;margin-top:10px;}
      .bj-pred-imps-h{display:block;font-size:11px;font-weight:800;color:#a855f7;margin-bottom:6px;}
      .bj-pred-imp{display:flex;flex-wrap:wrap;gap:6px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(168,85,247,.08);}
      .bj-pred-imp:last-child{border-bottom:0;}
      .bj-imp-pri{font-size:9px;font-weight:900;padding:2px 6px;border-radius:999px;flex-shrink:0;text-transform:uppercase;letter-spacing:.04em;}
      .bj-imp-critical .bj-imp-pri{background:rgba(239,68,68,.15);color:#ef4444;}
      .bj-imp-high .bj-imp-pri{background:rgba(245,158,11,.15);color:#f59e0b;}
      .bj-imp-med .bj-imp-pri{background:rgba(99,102,241,.12);color:#818cf8;}
      .bj-imp-body{font-size:12.5px;color:var(--text-secondary,var(--fg-2));line-height:1.4;flex:1;min-width:180px;}
      .bj-imp-impact{font-size:10px;font-weight:700;color:#10b981;white-space:nowrap;}
      .bj-pred-metrics-row{display:flex;flex-wrap:wrap;gap:7px;margin:10px 0;}
      .bj-pred-mchip{display:flex;flex-direction:column;align-items:center;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border);border-radius:10px;padding:8px 12px;min-width:70px;flex:1;}
      .bj-pred-mchip strong{font-size:16px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-mchip span{font-size:10px;color:var(--text-tertiary,var(--fg-3));margin-top:2px;}
      .bj-pred-conf{font-size:10.5px;color:var(--text-tertiary,var(--fg-3));background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:6px 10px;margin-bottom:8px;}
      .bj-pred-honest{margin-top:12px;background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.20);border-radius:10px;padding:12px 14px;}
      .bj-pred-honest-h{font-size:11px;font-weight:800;color:#10b981;text-transform:uppercase;letter-spacing:.04em;margin-bottom:8px;}
      .bj-pred-verdict{font-size:13px;line-height:1.5;color:var(--text-primary,var(--fg));margin-bottom:10px;font-style:italic;border-left:3px solid #10b981;padding-left:10px;}
      .bj-pred-hgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:10px;}
      .bj-pred-hmet{background:var(--bg-soft,rgba(17,18,22,.03));padding:8px 10px;border-radius:8px;text-align:center;}
      .bj-pred-hmet strong{display:block;font-size:14px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-hmet span{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-factors{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:6px;}
      .bj-pred-factor{font-size:11px;background:rgba(16,185,129,.10);color:#10b981;border:1px solid rgba(16,185,129,.25);padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-pred-risks{display:flex;flex-wrap:wrap;gap:6px;}
      .bj-pred-risk{font-size:11px;background:rgba(245,158,11,.08);color:#f59e0b;border:1px solid rgba(245,158,11,.25);padding:3px 9px;border-radius:999px;font-weight:600;}
      .bj-pred-disclaimer{margin-top:10px;font-size:11px;color:var(--text-tertiary,var(--fg-3));line-height:1.5;font-style:italic;text-align:center;padding-top:8px;border-top:1px solid var(--border-soft,rgba(17,18,22,.06));}
      /* ── HookPlans 3-col grid ── */
      .bj-hp-grid-wrap{background:var(--bg-card,#16171c);border:1px solid rgba(168,85,247,.25);border-radius:16px;padding:16px 18px;}
      .bj-hp-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
      @media(max-width:900px){.bj-hp-grid{grid-template-columns:1fr;}}
      .bj-hp-card{border:1.5px solid rgba(255,255,255,.10);border-radius:13px;padding:14px 15px;display:flex;flex-direction:column;gap:10px;background:rgba(255,255,255,.03);}
      .bj-hp-card.top{border-color:rgba(168,85,247,.55);background:linear-gradient(160deg,rgba(168,85,247,.09),rgba(225,48,108,.04));}
      .bj-hp-card-top{display:flex;gap:11px;align-items:flex-start;}
      .bj-hp-score{width:48px;height:48px;border-radius:50%;background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.18) 0);display:grid;place-items:center;flex-shrink:0;}
      .bj-hp-s-hot{background:conic-gradient(#e1306c var(--vs),rgba(225,48,108,.18) 0);}
      .bj-hp-s-good{background:conic-gradient(#a855f7 var(--vs),rgba(168,85,247,.18) 0);}
      .bj-hp-s-ok{background:conic-gradient(#818cf8 var(--vs),rgba(129,140,248,.18) 0);}
      .bj-hp-score-n{font-size:14px;font-weight:900;color:#c084fc;background:var(--bg-card,#16171c);width:36px;height:36px;border-radius:50%;display:grid;place-items:center;}
      .bj-hp-s-hot .bj-hp-score-n{color:#f472b6;}
      .bj-hp-hook-text{flex:1;font-size:15px;font-weight:700;line-height:1.4;color:#f1f1f5;}
      .bj-hp-layers{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:9px 11px;display:flex;flex-direction:column;gap:7px;}
      .bj-hp-lrow{display:flex;gap:7px;align-items:baseline;line-height:1.45;}
      .bj-hp-ltag{font-size:14px;flex-shrink:0;}
      .bj-hp-lrow span:last-child{font-size:13px;color:#c4c4d0;}
      .bj-hp-screen{font-size:12px!important;font-weight:900;color:#e879f9!important;letter-spacing:.07em;text-transform:uppercase;}
      .bj-hp-script-sec{display:flex;flex-direction:column;gap:4px;}
      .bj-hp-sec-h{font-size:10px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#a78bfa;margin-bottom:4px;}
      .bj-hp-apertura{font-size:13px;color:#d4d4e8;background:rgba(99,102,241,.12);border-left:3px solid #818cf8;border-radius:0 8px 8px 0;padding:7px 10px;line-height:1.5;}
      .bj-hp-beat{display:flex;gap:8px;align-items:baseline;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.06);}
      .bj-hp-beat:last-of-type{border:0;}
      .bj-hp-bn{font-size:10px;font-weight:900;color:#c084fc;background:rgba(168,85,247,.20);width:20px;height:20px;border-radius:50%;display:grid;place-items:center;flex-shrink:0;}
      .bj-hp-beat span:last-child{font-size:13px;color:#c4c4d0;line-height:1.45;}
      .bj-hp-cierre{font-size:13px;color:#d4d4e8;background:rgba(16,185,129,.10);border-left:3px solid #34d399;border-radius:0 8px 8px 0;padding:7px 10px;line-height:1.5;}
      .bj-hp-cta-box{font-size:13px;background:rgba(16,185,129,.10);border:1.5px solid rgba(52,211,153,.35);border-radius:9px;padding:8px 11px;color:#6ee7b7;font-weight:600;line-height:1.45;margin-top:2px;}
      /* ── Instagram format tabs ── */
      .bj-ig-plans-wrap{background:var(--bg-card,#16171c);border:1px solid rgba(225,48,108,.25);border-radius:16px;padding:16px 18px;}
      .bj-ig-tabs{display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap;}
      .bj-ig-tab{padding:8px 18px;border-radius:999px;border:1.5px solid rgba(255,255,255,.12);background:transparent;color:#c4c4d0;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;transition:all .15s;}
      .bj-ig-tab:hover{border-color:rgba(225,48,108,.45);color:#f9a8d4;}
      .bj-ig-tab.active{background:linear-gradient(135deg,#e1306c,#a855f7);border-color:transparent;color:#fff;}
      .bj-ig-tab-panel{display:block;}
      .bj-ig-tab-panel[hidden]{display:none;}
      /* Strategy panel (account-aware) */
      .bj-strategy{margin-bottom:16px;border:1px solid rgba(168,85,247,.25);border-radius:14px;background:linear-gradient(135deg,rgba(168,85,247,.06),rgba(225,48,108,.04));overflow:hidden;}
      .bj-strategy-sum{cursor:pointer;list-style:none;padding:12px 14px;font-size:14px;font-weight:800;color:#f1f1f5;display:flex;align-items:center;gap:10px;flex-wrap:wrap;user-select:none;}
      .bj-strategy-sum::-webkit-details-marker{display:none;}
      .bj-strategy-sum::after{content:'▾';margin-left:auto;color:#a78bfa;font-size:12px;transition:transform .2s;}
      .bj-strategy[open] .bj-strategy-sum::after{transform:rotate(180deg);}
      .bj-st-niche{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#a78bfa;background:rgba(168,85,247,.16);border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 10px;}
      .bj-strategy-body{padding:4px 14px 14px;display:flex;flex-direction:column;gap:9px;}
      .bj-st-row{display:flex;gap:10px;align-items:baseline;flex-wrap:wrap;font-size:12.5px;}
      .bj-st-row.col{flex-direction:column;gap:5px;}
      .bj-st-k{flex-shrink:0;min-width:140px;font-weight:800;color:#c9b8f0;}
      .bj-st-v{color:#d4d4e8;line-height:1.5;display:flex;gap:5px;flex-wrap:wrap;}
      .bj-st-chip{font-size:11px;font-weight:600;color:#d4d4e8;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:7px;padding:2px 8px;}
      .bj-st-chip.algo{color:#7dd3fc;border-color:rgba(125,211,252,.3);background:rgba(125,211,252,.08);}
      .bj-st-chip.tag{color:#f9a8d4;border-color:rgba(249,168,212,.3);background:rgba(249,168,212,.08);}
      .bj-st-ul{margin:0;padding-left:18px;color:#c4c4d0;line-height:1.55;font-size:12.5px;}
      .bj-st-ul.risk{color:#fca5a5;}
      .bj-st-note{font-size:10px;color:#7878a0;font-style:italic;width:100%;}
      .bj-week{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;width:100%;}
      @media(max-width:700px){.bj-week{grid-template-columns:repeat(2,1fr);}}
      .bj-week-day{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:7px 8px;}
      .bj-week-d{font-size:11px;font-weight:800;color:#a78bfa;}
      .bj-week-f{font-size:11px;font-weight:700;color:#f9a8d4;}
      .bj-week-a{font-size:10.5px;color:#c4c4d0;line-height:1.3;}
      .bj-week-w{font-size:10px;color:#7878a0;}
      .bj-month summary{cursor:pointer;font-size:12px;font-weight:700;color:#a78bfa;}
      .bj-month-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:6px;margin-top:8px;}
      .bj-month-slot{display:flex;flex-direction:column;gap:2px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:7px;padding:6px 8px;}
      .bj-month-date{font-size:10.5px;font-weight:700;color:#a78bfa;}
      .bj-month-fmt{font-size:11px;font-weight:700;color:#f9a8d4;}
      .bj-month-theme{font-size:10px;color:#c4c4d0;line-height:1.3;}
      @media(max-width:700px){.bj-st-k{min-width:100%;}}
      .bj-ig-fmt-hook{font-size:14px;font-weight:700;color:#f1f1f5;background:rgba(225,48,108,.10);border-left:3px solid #e1306c;border-radius:0 9px 9px 0;padding:8px 12px;margin-bottom:12px;line-height:1.4;}
      .bj-ig-fh-tag{display:block;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#f9a8d4;margin-bottom:3px;}
      /* Carrusel header */
      .bj-ig-carousel-header{display:flex;align-items:center;gap:10px;margin-bottom:10px;flex-wrap:wrap;}
      .bj-ig-slide-count{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.08em;color:#a78bfa;background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.35);border-radius:20px;padding:3px 10px;white-space:nowrap;flex-shrink:0;}
      /* 3-column carousel grid */
      .bj-car-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;align-items:start;}
      @media(max-width:900px){.bj-car-grid{grid-template-columns:1fr;}}
      .bj-car-col{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
      .bj-car-col-header{display:flex;align-items:center;gap:6px;flex-wrap:wrap;}
      .bj-car-col-num{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.18);border:1px solid rgba(168,85,247,.3);border-radius:20px;padding:2px 8px;flex-shrink:0;}
      .bj-car-col-angle{font-size:12px;font-weight:700;color:#d4d4e8;flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .bj-car-col-count{font-size:10px;color:#5a5a78;font-weight:600;flex-shrink:0;}
      .bj-car-caption{margin-bottom:0;}
      /* Slides */
      .bj-ig-slides{display:flex;flex-direction:column;gap:6px;}
      .bj-ig-slide{display:flex;gap:8px;align-items:flex-start;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;padding:8px 10px;}
      .bj-ig-slide-hook{border-color:rgba(225,48,108,.35);background:rgba(225,48,108,.06);}
      .bj-ig-slide-cta{border-color:rgba(52,211,153,.30);background:rgba(16,185,129,.06);}
      .bj-ig-slide-num{display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;min-width:36px;}
      .bj-ig-slide-n{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.15);width:24px;height:24px;border-radius:50%;display:grid;place-items:center;}
      .bj-ig-slide-hook .bj-ig-slide-n{color:#f9a8d4;background:rgba(225,48,108,.18);}
      .bj-ig-slide-cta .bj-ig-slide-n{color:#6ee7b7;background:rgba(16,185,129,.18);}
      .bj-ig-slide-nof{font-size:8px;color:#4a4a60;font-weight:600;}
      .bj-ig-slide-role-badge{font-size:8px;font-weight:700;color:#5a5a78;text-align:center;line-height:1.3;max-width:36px;}
      .bj-ig-slide-hook .bj-ig-slide-role-badge{color:#f9a8d4;}
      .bj-ig-slide-cta .bj-ig-slide-role-badge{color:#6ee7b7;}
      .bj-ig-slide-body{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
      .bj-ig-slide-title{font-size:13px;font-weight:800;color:#f1f1f5;line-height:1.3;letter-spacing:-.01em;}
      .bj-ig-slide-hook .bj-ig-slide-title{color:#fce7f3;}
      .bj-ig-slide-cta .bj-ig-slide-title{color:#6ee7b7;}
      .bj-ig-slide-subtitle{font-size:12px;color:#9898b8;line-height:1.4;}
      .bj-ig-slide-bodytext{font-size:11px;color:#7878a0;line-height:1.5;}
      .bj-ig-slide-imgtext{font-size:10px;color:#e879f9;background:rgba(232,121,249,.10);border:1px solid rgba(232,121,249,.20);border-radius:5px;padding:2px 6px;margin-top:2px;font-weight:600;display:inline-block;}
      .bj-ig-slide-visual{font-size:10px;color:#4a4a68;margin-top:1px;font-style:italic;display:block;}
      /* Caption block */
      .bj-ig-caption-block{background:rgba(225,48,108,.06);border:1px solid rgba(225,48,108,.20);border-radius:10px;padding:10px 12px;margin-bottom:12px;display:flex;flex-direction:column;gap:6px;}
      .bj-ig-caption-row{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;}
      .bj-ig-caption-tag{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#f9a8d4;white-space:nowrap;flex-shrink:0;}
      .bj-ig-caption-text{font-size:14px;font-weight:700;color:#fce7f3;line-height:1.4;}
      .bj-ig-caption-cta{font-size:13px;color:#e9a8c4;line-height:1.4;}
      /* Reel */
      .bj-reel-score-row{display:flex;align-items:center;gap:12px;margin-bottom:12px;}
      .bj-reel-label{font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.06em;}
      .bj-reel-hooks-sec{margin-bottom:10px;}
      .bj-reel-hooks-list{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
      .bj-reel-hook-opt{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:9px;padding:9px 12px;}
      .bj-reel-hook-opt.best{border-color:rgba(168,85,247,.50);background:rgba(168,85,247,.08);}
      .bj-reel-hook-opt-n{font-size:13px;flex-shrink:0;width:22px;text-align:center;margin-top:1px;}
      .bj-reel-hook-opt-body{flex:1;display:flex;flex-direction:column;gap:2px;}
      .bj-reel-hook-text{font-size:14px;font-weight:800;color:#f1f1f5;line-height:1.3;}
      .bj-reel-hook-opt.best .bj-reel-hook-text{color:#e9d5ff;}
      .bj-reel-hook-style{font-size:11px;color:#9ca3af;font-style:italic;}
      .bj-reel-beats{display:flex;flex-direction:column;gap:6px;margin-top:6px;}
      .bj-reel-beat{display:flex;gap:10px;align-items:flex-start;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;border:1px solid rgba(255,255,255,.06);}
      .bj-reel-beat-body{flex:1;display:flex;flex-direction:column;gap:3px;}
      .bj-reel-beat-text{font-size:13px;color:#d1d5db;line-height:1.45;}
      .bj-reel-beat-onscreen{font-size:11px;color:#e879f9;font-weight:700;background:rgba(232,121,249,.10);border:1px solid rgba(232,121,249,.20);border-radius:5px;padding:2px 7px;display:inline-block;margin-top:2px;}
      .bj-reel-beat-visual{font-size:11px;color:#6b7280;font-style:italic;}
      .bj-reel-time{font-size:9px;font-weight:800;text-transform:uppercase;color:#818cf8;background:rgba(99,102,241,.15);border-radius:4px;padding:1px 5px;margin-right:6px;}
      /* Stories frames */
      .bj-ig-frames{display:flex;flex-direction:column;gap:7px;}
      .bj-ig-frame{display:flex;gap:10px;align-items:flex-start;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;padding:10px 12px;}
      .bj-ig-frame-hook{border-color:rgba(225,48,108,.40);background:rgba(225,48,108,.07);}
      .bj-ig-frame-cta{border-color:rgba(52,211,153,.35);background:rgba(16,185,129,.07);}
      .bj-ig-frame-num{display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0;}
      .bj-ig-frame-n{font-size:11px;font-weight:900;color:#a78bfa;background:rgba(168,85,247,.18);width:26px;height:26px;border-radius:50%;display:grid;place-items:center;}
      .bj-ig-frame-hook .bj-ig-frame-n{color:#f9a8d4;background:rgba(225,48,108,.20);}
      .bj-ig-frame-cta .bj-ig-frame-n{color:#6ee7b7;background:rgba(16,185,129,.20);}
      .bj-frame-mediatype{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;color:#9ca3af;text-align:center;max-width:36px;line-height:1.2;}
      .bj-frame-duration{font-size:9px;font-weight:700;color:#6b7280;background:rgba(255,255,255,.07);border-radius:4px;padding:1px 5px;white-space:nowrap;}
      .bj-ig-frame-body{flex:1;display:flex;flex-direction:column;gap:4px;}
      .bj-frame-onscreen{font-size:17px;font-weight:900;color:#f1f1f5;line-height:1.25;letter-spacing:-.01em;}
      .bj-ig-frame-hook .bj-frame-onscreen{color:#fce7f3;}
      .bj-ig-frame-cta .bj-frame-onscreen{color:#d1fae5;}
      .bj-frame-support{font-size:13px;color:#b4b4c8;line-height:1.4;margin-top:2px;}
      .bj-frame-mediadesc{font-size:12px;color:#7c7c90;font-style:italic;margin-top:3px;}
      .bj-ig-frame-sticker{font-size:12px;color:#c084fc;font-weight:700;}
      /* ── Guion ── */
      .bj-guion-apertura,.bj-guion-cierre{display:flex;flex-direction:column;gap:4px;padding:10px 12px;border-radius:10px;margin-bottom:6px;font-size:13px;color:var(--text-primary,var(--fg));line-height:1.5;}
      .bj-guion-apertura{background:rgba(99,102,241,.06);border:1px solid rgba(99,102,241,.18);}
      .bj-guion-cierre{background:rgba(16,185,129,.05);border:1px solid rgba(16,185,129,.20);}
      .bj-guion-badge{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#818cf8;margin-bottom:3px;}
      .bj-guion-badge.bj-guion-cta{color:#10b981;}
      .bj-guion-step{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--border-soft,rgba(17,18,22,.05));}
      .bj-guion-step:last-child{border:0;}
      .bj-guion-n{font-size:11px;font-weight:800;color:#a855f7;background:rgba(168,85,247,.12);width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px;}
      .bj-guion-step span{font-size:13px;color:var(--text-secondary,var(--fg-2));line-height:1.45;}
      /* ── Producción ── */
      .bj-prod-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px;}
      .bj-prod-col{display:flex;flex-direction:column;gap:6px;}
      .bj-prod-col-h{font-size:10px;font-weight:800;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:.04em;margin-bottom:2px;}
      .bj-prod-item{font-size:12.5px;color:var(--text-secondary,var(--fg-2));padding:6px 10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;line-height:1.4;}
      /* ── Predicciones minimalistas ── */
      .bj-pred-minimal{background:var(--bg-card,#fff);border:1px solid rgba(168,85,247,.20);border-radius:14px;padding:16px 18px;}
      .bj-pred-min-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px;}
      .bj-pred-min-title{font-size:13px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-min-sub{font-size:10px;color:var(--text-tertiary,var(--fg-3));}
      .bj-pred-min-row{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:12px;}
      .bj-pred-min-score{display:flex;flex-direction:column;align-items:center;gap:3px;}
      .bj-pred-min-metrics{display:flex;flex-wrap:wrap;gap:6px;flex:1;}
      .bj-pred-min-met{display:flex;flex-direction:column;align-items:center;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:8px;padding:7px 10px;min-width:60px;flex:1;}
      .bj-pred-min-met strong{font-size:15px;font-weight:800;color:var(--text-primary,var(--fg));}
      .bj-pred-min-met span{font-size:10px;color:var(--text-tertiary,var(--fg-3));margin-top:2px;}
      .bj-pred-range{margin-bottom:10px;}
      .bj-pred-range-lbl{font-size:10px;font-weight:700;color:var(--text-tertiary,var(--fg-3));text-transform:uppercase;letter-spacing:.04em;display:block;margin-bottom:6px;}
      .bj-pred-range-bar{position:relative;height:6px;background:var(--bg-soft,rgba(17,18,22,.06));border-radius:3px;margin-bottom:5px;}
      .bj-pred-range-fill{height:100%;background:linear-gradient(90deg,#ef4444,#a855f7);border-radius:3px;}
      .bj-pred-range-dot{position:absolute;top:-3px;width:12px;height:12px;background:#a855f7;border-radius:50%;transform:translateX(-50%);box-shadow:0 0 0 3px rgba(168,85,247,.2);}
      .bj-pred-range-vals{display:flex;justify-content:space-between;font-size:10px;font-weight:700;}
      .bj-pred-verdict-simple{font-size:12.5px;font-style:italic;color:var(--text-secondary,var(--fg-2));border-left:3px solid #10b981;padding-left:10px;margin:10px 0;line-height:1.5;}
    </style>`;

  const root = container;
  root.querySelectorAll('.bj-goal').forEach((b) => {
    b.addEventListener('click', () => {
      activeGoal = b.dataset.goal;
      root.querySelectorAll('.bj-goal').forEach((x) => x.classList.toggle('active', x === b));
    });
  });

  const topicInput = root.querySelector('#bj-topic');
  const topicHint = root.querySelector('#bj-topic-hint');
  let hintTimer = null;

  const PLATFORM_FORMAT_HINTS = {
    instagram: {
      awareness: 'Reels',
      engagement: 'Carrusel',
      conversion: 'Carrusel + Stories',
      community: 'Stories',
      sales: 'Carrusel + Stories',
    },
    tiktok: {
      awareness: 'Video',
      engagement: 'Video',
      conversion: 'Video + Stitch',
      community: 'Video',
      sales: 'Video + LIVE',
    },
  };

  topicInput?.addEventListener('input', (e) => {
    activeTopic = e.target.value.trim();
    clearTimeout(hintTimer);
    if (activeTopic.length >= 3 && topicHint) {
      hintTimer = setTimeout(() => {
        const fmt = PLATFORM_FORMAT_HINTS[platform]?.[activeGoal] || (platform === 'instagram' ? 'Carrusel' : 'Video');
        topicHint.textContent = `Para "${activeTopic}" en ${platform === 'instagram' ? 'Instagram' : 'TikTok'} con objetivo "${activeGoal}" → formato recomendado: ${fmt}`;
        topicHint.style.display = 'block';
      }, 400);
    } else if (topicHint) {
      topicHint.style.display = 'none';
    }
  });

  root.querySelector('#bj-go')?.addEventListener('click', () => {
    if (!activeTopic) {
      toast('Escribí el tema sobre el cual vas a publicar', 'warn');
      topicInput?.focus();
      return;
    }
    activeAccountId = (root.querySelector('#bj-account')?.value || '').trim();
    activeNiche = (root.querySelector('#bj-niche')?.value || '').trim();
    activeBrandType = root.querySelector('#bj-brandtype')?.value || 'personal';
    void compute(root, platform);
  });

  // Enter key on topic input triggers compute
  topicInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      root.querySelector('#bj-go')?.click();
    }
  });

  // ── Account Studio wiring (vision + metrics) ──
  const filesToDataUrls = (fileList) =>
    Promise.all(
      [...(fileList || [])].slice(0, 9).map(
        (f) =>
          new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => resolve(null);
            fr.readAsDataURL(f);
          }),
      ),
    ).then((arr) => arr.filter(Boolean));

  const studioAccount = () => ({
    accountId: (root.querySelector('#bj-account')?.value || '').trim(),
    niche: (root.querySelector('#bj-niche')?.value || '').trim(),
  });
  const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
  const ul = (arr) =>
    `<ul>${(arr || []).map((x) => `<li>${esc(typeof x === 'string' ? x : x.idea || x.tactic || JSON.stringify(x))}</li>`).join('')}</ul>`;

  const runVision = async (endpoint, filesSel, outSel, btn, renderFn) => {
    const files = root.querySelector(filesSel)?.files;
    const out = root.querySelector(outSel);
    if (!files?.length) {
      out.innerHTML = '<span style="color:#f59e0b;">Subí al menos 1 imagen.</span>';
      return;
    }
    btn.disabled = true;
    out.innerHTML = '⏳ Analizando con visión IA…';
    try {
      const images = await filesToDataUrls(files);
      const { accountId, niche } = studioAccount();
      const r = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, niche, images }),
      });
      const j = await r.json();
      if (j.error) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.message || j.error)}</span>`;
        return;
      }
      out.innerHTML = renderFn(j);
    } catch {
      out.innerHTML = '<span style="color:#ef4444;">Error de red. Reintentá.</span>';
    } finally {
      btn.disabled = false;
    }
  };

  root.querySelector('#bj-vision-go')?.addEventListener('click', (e) =>
    runVision(
      '/api/account/audit-feed',
      '#bj-vision-files',
      '#bj-vision-result',
      e.target,
      (
        j,
      ) => `<div><span class="bj-vr-score">${j.coherenceScore ?? '–'}/100</span> coherencia · ${esc(j.visualStyle || '')} <em style="color:#7878a0;">(${esc(j._provider || 'ia')})</em></div>
      ${j.weaknesses?.length ? `<div class="bj-vr-block"><b>Debilidades</b>${ul(j.weaknesses)}</div>` : ''}
      ${j.gaps?.length ? `<div class="bj-vr-block"><b>Huecos en el feed</b>${ul(j.gaps)}</div>` : ''}
      ${j.whatToAdd?.length ? `<div class="bj-vr-block"><b>Qué agregar</b>${ul(j.whatToAdd.map((w) => `${w.idea} (${w.format})`))}</div>` : ''}`,
    ),
  );

  root.querySelector('#bj-learn-go')?.addEventListener('click', (e) =>
    runVision(
      '/api/account/learn-competitor',
      '#bj-learn-files',
      '#bj-learn-result',
      e.target,
      (
        j,
      ) => `${j.visualPatterns?.length ? `<div class="bj-vr-block"><b>Patrones visuales</b>${ul(j.visualPatterns)}</div>` : ''}
      ${j.hookPatterns?.length ? `<div class="bj-vr-block"><b>Patrones de hook</b>${ul(j.hookPatterns)}</div>` : ''}
      ${j.whatYouCanApply?.length ? `<div class="bj-vr-block"><b>Aplicá a tu cuenta</b>${ul(j.whatYouCanApply.map((w) => `${w.tactic}: ${w.how}`))}</div>` : ''}
      ${j.avoid?.length ? `<div class="bj-vr-block"><b>No copies</b>${ul(j.avoid)}</div>` : ''}`,
    ),
  );

  root.querySelector('#bj-m-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bj-m-result');
    const { accountId } = studioAccount();
    if (!accountId) {
      out.innerHTML =
        '<span style="color:#f59e0b;">Poné tu @cuenta arriba (en "Mi cuenta") para activar la memoria.</span>';
      return;
    }
    const num = (sel) => {
      const v = root.querySelector(sel)?.value;
      return v === '' || v == null ? null : Number(v);
    };
    const entry = {
      topic: root.querySelector('#bj-m-topic')?.value || '',
      format: root.querySelector('#bj-m-format')?.value || 'reel',
      reach: num('#bj-m-reach'),
      saves: num('#bj-m-saves'),
      shares: num('#bj-m-shares'),
      comments: num('#bj-m-comments'),
      follows: num('#bj-m-follows'),
    };
    e.target.disabled = true;
    out.innerHTML = '⏳ Guardando…';
    try {
      const r = await fetch('/api/account/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, entry }),
      });
      const j = await r.json();
      const ins = j.insights || {};
      out.innerHTML = `<div style="color:#10b981;">✓ Guardado. Posts trackeados: ${ins.postsTracked ?? 0}</div>
        ${ins.bestFormat ? `<div class="bj-vr-block"><b>Mejor formato</b>${esc(ins.bestFormat)} · tendencia: ${esc(ins.trend || '')}</div>` : ''}
        ${ins.recommendations?.length ? `<div class="bj-vr-block"><b>Recomendaciones</b>${ul(ins.recommendations)}</div>` : ''}`;
    } catch {
      out.innerHTML = '<span style="color:#ef4444;">Error de red. Reintentá.</span>';
    } finally {
      e.target.disabled = false;
    }
  });

  root.querySelector('#bj-council-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bj-council-result');
    if (!activeTopic) {
      out.innerHTML = '<span style="color:#f59e0b;">Escribí un tema arriba primero.</span>';
      return;
    }
    const { niche } = studioAccount();
    e.target.disabled = true;
    out.innerHTML = '⏳ Convocando 6 agentes… (puede tardar)';
    try {
      const r = await fetch('/api/growth/council/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: activeTopic, niche, platform, goal: activeGoal }),
      });
      const j = await r.json();
      const parts = j.parts || j.result || j;
      const strat = j.strategy || parts?.strategy || {};
      // Render textual de TODOS los agentes (sin JSON crudo)
      const agents = parts?.agents || j.agents || {};
      const agentRows = Object.entries(agents)
        .map(([role, data]) => {
          const txt =
            data?.summary ||
            data?.insight ||
            data?.recommendation ||
            data?.output ||
            (typeof data === 'string' ? data : '');
          if (!txt) return '';
          return `<div class="bj-vr-block"><b>👤 ${esc(role)}</b>${esc(String(txt).slice(0, 400))}${String(txt).length > 400 ? '…' : ''}</div>`;
        })
        .join('');
      out.innerHTML = `<div style="color:#10b981;">✓ Consejo completado${j.runId ? ' (' + esc(j.runId) + ')' : ''}</div>
        ${strat.summary ? `<div class="bj-vr-block"><b>📋 Síntesis del consejo</b>${esc(strat.summary)}</div>` : ''}
        ${strat.northStar ? `<div class="bj-vr-block"><b>⭐ North star</b>${esc(strat.northStar)}</div>` : ''}
        ${Array.isArray(strat.priorities) && strat.priorities.length ? `<div class="bj-vr-block"><b>🎯 Prioridades</b>${ul(strat.priorities)}</div>` : ''}
        ${agentRows || '<div style="font-size:11.5px;color:var(--text-tertiary,var(--fg-3));font-style:italic;">Sin detalle por agente disponible.</div>'}`;
    } catch {
      out.innerHTML = '<span style="color:#ef4444;">Error. Reintentá.</span>';
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Community Engine ──
  let ceMode = 'dm';
  root.querySelectorAll('.bj-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      ceMode = btn.dataset.ce;
      root.querySelectorAll('.bj-tab-btn').forEach((b) => {
        b.classList.toggle('bj-btn-secondary', b.dataset.ce === ceMode);
        b.classList.toggle('bj-btn-ghost', b.dataset.ce !== ceMode);
      });
      const ctxInput = root.querySelector('#ce-context');
      if (ctxInput) ctxInput.style.display = ceMode === 'comment' ? '' : 'none';
      const ta = root.querySelector('#ce-input');
      if (ta) ta.placeholder = ceMode === 'dm' ? 'Pegá el DM recibido…' : 'Pegá el comentario recibido…';
    });
  });

  root.querySelector('#ce-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#ce-result');
    const text = (root.querySelector('#ce-input')?.value || '').trim();
    if (!text) {
      out.innerHTML = '<span style="color:#f59e0b;">Pegá el mensaje primero.</span>';
      return;
    }
    const { accountId } = studioAccount();
    const sender = (root.querySelector('#ce-sender')?.value || '').trim().replace(/^@/, '');
    e.target.disabled = true;
    e.target.textContent = '🧠 Pensando (5 pasos)…';
    out.innerHTML = '<div style="color:#a78bfa;font-size:12px;">🧠 Paso 1/5: analizando autor (@' + esc(sender || 'anon') + ')…<br>📂 Paso 2/5: contexto del hilo…<br>🎯 Paso 3/5: intent profundo + emoción…<br>💭 Paso 4/5: razonando respuesta (calibrando humor/registro al país)…<br>✨ Paso 5/5: ajustes finales…</div>';
    try {
      const r = await fetch('/api/community/brain/respond', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId, sender,
          message: text,
          postContext: (root.querySelector('#ce-context')?.value || '').trim(),
          channel: ceMode || 'dm',
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'error')}</span>`;
        return;
      }
      // Adaptar al render existente (mapeo brain → format viejo)
      j.intent = j.analysis?.intent;
      j.confidence = (j.analysis?.complexity || 1) / 5;
      j.method = `5-step · ${j.author?.country || 'GLOBAL'} · ${j.thinkingMs}ms`;
      j.reply = j.response?.reply;
      j.suggestedAction = j.response?.action;
      j.tone = j.response?.tone;
      j.archetype = j.response?.tone || '';
      j.personalization_used = `${j.author?.country || ''} · ${j.author?.isReturning ? `${j.author.previousInteractions} interacciones previas` : 'primera vez'} · ${j.analysis?.humor_used ? 'humor activado' : 'sin humor'} · emoción: ${j.analysis?.emotion}`;
      const intentColor =
        {
          lead_warm: '#10b981',
          curiosity: '#3b82f6',
          support: '#f59e0b',
          compliment: '#a855f7',
          spam: '#ef4444',
          troll: '#ef4444',
          neutral: '#9ca3af',
        }[j.intent] || '#9ca3af';
      out.innerHTML = `
        <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px;">
          <span style="background:${intentColor};color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;font-weight:800;text-transform:uppercase;">${esc(j.intent)}</span>
          <span style="font-size:10.5px;color:var(--text-tertiary,var(--fg-3));">conf: ${j.confidence?.toFixed(2) || '?'} · método: ${esc(j.method || '')}</span>
          ${j.archetype ? `<span class="ab-tag">${esc(j.archetype)}</span>` : ''}
        </div>
        ${
          j.reply
            ? `
          <div class="bj-vr-block"><b>📝 Respuesta sugerida</b>
            <div style="background:var(--bg,#0a0a0a);padding:10px;border-radius:8px;font-size:13px;line-height:1.55;border-left:3px solid ${intentColor};">${esc(j.reply)}</div>
            <button class="bj-copy-btn" data-copy="${esc(j.reply)}" style="margin-top:6px;">📋 Copiar</button>
          </div>`
            : ''
        }
        <div class="bj-vr-block"><b>🎯 Acción sugerida</b>${esc(j.suggestedAction || 'ninguna')}${j.tone ? ` · tono: ${esc(j.tone)}` : ''}</div>
        ${j.personalization_used ? `<div class="bj-vr-block"><b>✨ Personalización usada</b>${esc(j.personalization_used)}</div>` : ''}`;
      out.querySelector('.bj-copy-btn')?.addEventListener('click', async (ev) => {
        try {
          await navigator.clipboard.writeText(ev.target.dataset.copy);
          toast('📋 Copiado', 'ok');
        } catch {}
      });
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
      e.target.textContent = '🧠 Analizar y responder';
    }
  });

  // ── Stories Engine ──
  root.querySelector('#se-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#se-result');
    if (!activeTopic) {
      out.innerHTML = '<span style="color:#f59e0b;">Escribí un tema arriba primero.</span>';
      return;
    }
    const file = root.querySelector('#se-file')?.files?.[0];
    const colors = (root.querySelector('#se-colors')?.value || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const archetype = root.querySelector('#se-archetype')?.value || 'cercano';
    const framesCount = parseInt(root.querySelector('#se-count')?.value || '5', 10);
    const { accountId, niche } = studioAccount();
    e.target.disabled = true;
    out.innerHTML = '📱 Generando frames visuales…';
    try {
      let photoDataUrl = null;
      if (file) {
        const list = await filesToDataUrls([file]);
        photoDataUrl = list[0];
      }
      const r = await fetch('/api/stories/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic,
          niche,
          goal: activeGoal,
          archetype,
          framesCount,
          brandColors: colors,
          photoDataUrl,
          accountId,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'error')}</span>`;
        return;
      }
      const fr = j.frames || [];
      out.innerHTML = `
        <div style="color:#10b981;font-size:12px;">✓ ${fr.length} frames generados (1080×1920)</div>
        <div class="ap-slides">
          ${fr.map((f, idx) => `<div class="ap-slide" data-idx="${idx}"><img src="${esc(f.dataUrl)}" alt="frame ${f.n}" loading="lazy" /><span class="ap-slide-tag">${f.n}·${esc(f.role)}</span></div>`).join('')}
        </div>
        <button class="bj-btn bj-btn-secondary" id="se-dl-all" style="margin-top:8px;">⬇️ Descargar todos los frames</button>`;

      out.querySelector('#se-dl-all')?.addEventListener('click', () => {
        fr.forEach((f, i) =>
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = f.dataUrl;
            a.download = `story-${f.n}.svg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }, i * 250),
        );
      });

      // Lightbox (reuse del autopilot)
      const openLightbox = (startIdx) => {
        let idx = startIdx;
        const overlay = document.createElement('div');
        overlay.className = 'ap-lightbox';
        const render = () => {
          const f = fr[idx];
          overlay.innerHTML = `
            <button class="ap-lb-close">✕</button>
            <button class="ap-lb-nav ap-lb-prev" ${idx === 0 ? 'disabled' : ''}>‹</button>
            <div class="ap-lb-stage"><img src="${esc(f.dataUrl)}" /><div class="ap-lb-meta">Frame ${f.n} / ${fr.length} · ${esc(f.role)}${f.text ? ' · ' + esc(f.text) : ''}</div></div>
            <button class="ap-lb-nav ap-lb-next" ${idx === fr.length - 1 ? 'disabled' : ''}>›</button>
            <a class="ap-lb-dl" href="${esc(f.dataUrl)}" download="story-${f.n}.svg">⬇️ Descargar</a>`;
          overlay.querySelector('.ap-lb-close').onclick = () => overlay.remove();
          overlay.querySelector('.ap-lb-prev').onclick = () => {
            if (idx > 0) {
              idx--;
              render();
            }
          };
          overlay.querySelector('.ap-lb-next').onclick = () => {
            if (idx < fr.length - 1) {
              idx++;
              render();
            }
          };
        };
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) overlay.remove();
        });
        render();
        document.body.appendChild(overlay);
      };
      out
        .querySelectorAll('.ap-slide')
        .forEach((el) => el.addEventListener('click', () => openLightbox(parseInt(el.dataset.idx, 10) || 0)));
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Feedback Loop (memoria activa) ──
  root.querySelector('#fb-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#fb-result');
    const { accountId, niche } = studioAccount();
    if (!accountId) {
      out.innerHTML =
        '<span style="color:#f59e0b;">Poné @cuenta arriba para que el sistema cachee aprendizajes.</span>';
      return;
    }
    e.target.disabled = true;
    out.innerHTML = '🧠 Analizando métricas + sintetizando learnings…';
    try {
      const r = await fetch('/api/feedback/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, niche }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'error')}</span>`;
        return;
      }
      if (!j.hasData) {
        out.innerHTML = `<span style="color:#f59e0b;">${esc(j.message)}</span>`;
        return;
      }
      const p = j.patterns || {};
      const l = j.learnings || {};
      out.innerHTML = `
        <div style="color:#10b981;font-size:12px;">✓ Aprendido en ${Math.round(j.durationMs / 1000)}s · ${p.totalAnalyzed} posts · score promedio ${p.avgScore}${j.nicheCacheUpdated ? ' · cache de Inteligencia actualizada' : ''}</div>
        ${l.summary ? `<div class="bj-vr-block"><b>💡 Insight central</b>${esc(l.summary)}</div>` : ''}
        ${l.doubleDownOn ? `<div class="bj-vr-block"><b>🚀 Doblar la apuesta en</b>${esc(l.doubleDownOn)}</div>` : ''}
        <div class="bj-vr-block"><b>🏆 Patrones ganadores</b>
          <div>Formato: <span style="color:#10b981;font-weight:700;">${esc(p.bestFormat || '-')}</span> · Hook: <span style="color:#3b82f6;font-weight:700;">${esc(p.bestHookStyle || '-')}</span> · Horario: <span style="color:#a855f7;font-weight:700;">${esc(p.bestHour || '-')}</span></div>
          ${l.winningArchetype ? `<div>Archetype recomendado: <span class="ab-tag ab-tag-purple">${esc(l.winningArchetype)}</span></div>` : ''}
        </div>
        ${l.recommendations?.length ? `<div class="bj-vr-block"><b>📋 Recomendaciones (próximos 7 días)</b>${ul(l.recommendations)}</div>` : ''}
        ${l.redFlags?.length ? `<div class="bj-vr-block"><b>🚩 Red flags (no repetir)</b>${ul(l.redFlags)}</div>` : ''}
        ${p.topPosts?.length ? `<div class="bj-vr-block"><b>🥇 Top posts</b>${ul(p.topPosts.slice(0, 3).map((t) => `"${(t.topic || '').slice(0, 60)}" · ${t.format} · score ${t.score}`))}</div>` : ''}
        ${j.syncLog?.length ? `<div class="bj-vr-block"><b>🔌 Sincronización con cuentas conectadas</b>${ul(j.syncLog)}</div>` : ''}`;
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Gstack meta-controller ──
  root.querySelector('#gs-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#gs-result');
    const task = (root.querySelector('#gs-task')?.value || '').trim();
    if (!task) {
      out.innerHTML =
        '<span style="color:#f59e0b;">Escribí qué querés que haga (ej: "lanzá un carrusel sobre IA").</span>';
      return;
    }
    const { accountId, niche } = studioAccount();
    const colors = (root.querySelector('#gs-colors')?.value || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const format = root.querySelector('#gs-format')?.value || null;
    e.target.disabled = true;
    out.innerHTML = '🧬 Gstack decidiendo + ejecutando…';
    try {
      const r = await fetch('/api/gstack/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task,
          format,
          accountId,
          niche,
          topic: activeTopic || task,
          goal: activeGoal,
          platform,
          brandColors: colors,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'error')}: ${esc(j.message || '')}</span>`;
        return;
      }
      const d = j.decision || {};
      const o = j.output || {};
      const slidesG = Array.isArray(o.carouselSlides) ? o.carouselSlides : [];
      out.innerHTML = `
        <div style="color:#10b981;font-size:12px;">✓ Gstack ejecutado en ${Math.round(j.durationMs / 1000)}s</div>
        <div class="bj-vr-block"><b>🎯 Decisión del sistema</b>
          <div>Voz elegida: <span style="color:#a855f7;font-weight:700;">${esc(d.archetype)}</span> · Estética: <span style="color:#3b82f6;font-weight:700;">${esc(d.mood)}</span></div>
          <div>Roles IA activos: ${(d.roles || []).map((r) => `<span class="ab-tag ab-tag-purple">${esc(r)}</span>`).join(' ')}</div>
          <div>Formato: ${esc(d.format || 'estrategia general')} · Intención: ${esc(d.intent || 'crear contenido')} · Nicho: ${esc(d.niche)}</div>
        </div>
        ${(d.reasoning || []).length ? `<div class="bj-vr-block"><b>🧠 Por qué decidió esto</b>${ul(d.reasoning)}</div>` : ''}
        ${o.pending ? `<div style="color:#f59e0b;">⏳ ${esc(o.reason)}</div>` : ''}
        ${
          o.content
            ? `<div class="bj-vr-block"><b>📝 Contenido generado</b>
          ${o.content.hook ? `<div><strong>Hook:</strong> ${esc(o.content.hook)}</div>` : ''}
          ${o.content.caption ? `<div style="margin-top:4px;"><strong>Caption:</strong> ${esc(o.content.caption.slice(0, 300))}${o.content.caption.length > 300 ? '…' : ''}</div>` : ''}
          ${o.content.angle ? `<div style="margin-top:4px;"><strong>Ángulo:</strong> ${esc(o.content.angle)}</div>` : ''}
        </div>`
            : ''
        }
        ${
          slidesG.length
            ? `
          <div class="bj-vr-block"><b>🖼️ Carrusel · ${slidesG.length} slides</b> <span style="font-size:10.5px;color:#a78bfa;">(tocá uno para ampliar)</span></div>
          <div class="ap-slides" id="gs-slides">${slidesG.map((sl, idx) => `<div class="ap-slide" data-idx="${idx}"><img src="${esc(sl.dataUrl)}" alt="slide ${sl.n}" loading="lazy" /><span class="ap-slide-tag">${sl.n}${sl.role ? '·' + esc(sl.role) : ''}</span></div>`).join('')}</div>
        `
            : o.image?.url
              ? `<div class="bj-vr-block"><b>🖼️ Imagen</b></div><div class="ap-slides"><div class="ap-slide" data-idx="0"><img src="${esc(o.image.url)}" alt="output" loading="lazy" /><span class="ap-slide-tag">1</span></div></div>`
              : ''
        }`;
      // Lightbox
      const allSlides = slidesG.length ? slidesG : o.image?.url ? [{ n: 1, role: 'output', dataUrl: o.image.url }] : [];
      const openLB = (startIdx) => {
        let i = startIdx;
        const ov = document.createElement('div');
        ov.className = 'ap-lightbox';
        const render = () => {
          const sl = allSlides[i];
          if (!sl) return;
          ov.innerHTML = `<button class="ap-lb-close">✕</button><button class="ap-lb-nav ap-lb-prev" ${i === 0 ? 'disabled' : ''}>‹</button><div class="ap-lb-stage"><img src="${esc(sl.dataUrl)}" /><div class="ap-lb-meta">Slide ${sl.n} / ${allSlides.length}${sl.role ? ' · ' + esc(sl.role) : ''}</div></div><button class="ap-lb-nav ap-lb-next" ${i === allSlides.length - 1 ? 'disabled' : ''}>›</button><a class="ap-lb-dl" href="${esc(sl.dataUrl)}" download="gstack-slide-${sl.n}.svg">⬇️ Descargar</a>`;
          ov.querySelector('.ap-lb-close').onclick = () => ov.remove();
          ov.querySelector('.ap-lb-prev').onclick = () => {
            if (i > 0) {
              i--;
              render();
            }
          };
          ov.querySelector('.ap-lb-next').onclick = () => {
            if (i < allSlides.length - 1) {
              i++;
              render();
            }
          };
        };
        ov.addEventListener('click', (ev) => {
          if (ev.target === ov) ov.remove();
        });
        render();
        document.body.appendChild(ov);
      };
      out
        .querySelectorAll('.ap-slide')
        .forEach((el) => el.addEventListener('click', () => openLB(parseInt(el.dataset.idx, 10) || 0)));
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Niche Intelligence ──
  root.querySelector('#bj-intel-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bj-intel-result');
    const { accountId, niche } = studioAccount();
    if (!accountId) {
      out.innerHTML =
        '<span style="color:#f59e0b;">Poné @cuenta arriba (en "Mi cuenta") para cachear el análisis.</span>';
      return;
    }
    e.target.disabled = true;
    out.innerHTML = '🧬 Corriendo 5 análisis (nicho → audiencia → competencia → oportunidades → síntesis)…';
    try {
      const r = await fetch('/api/intelligence/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: activeTopic,
          accountId,
          accountHandle: accountId,
          brandNiche: niche,
          goal: activeGoal,
          force: true,
        }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'error')}</span>`;
        return;
      }
      out.innerHTML = `
        <div style="color:#10b981;font-size:12px;">✓ Intelligence cacheada (${Math.round(j.durationMs / 1000)}s)${j.fromCache ? ' · cache hit' : ''}</div>
        <div class="bj-vr-block"><b>Nicho detectado</b>${esc(j.niche?.primaryNiche || '')} (saturación: ${esc(j.niche?.saturationLevel || '')} · monetización: ${esc(j.niche?.monetizationPotential || '')})</div>
        ${j.summary?.mainAngle ? `<div class="bj-vr-block"><b>🎯 Posicionamiento</b>${esc(j.summary.mainAngle)}</div>` : ''}
        ${j.summary?.differentiationPlay ? `<div class="bj-vr-block"><b>⚡ Jugada diferenciación</b>${esc(j.summary.differentiationPlay)}</div>` : ''}
        ${j.audience?.decisionTriggers?.length ? `<div class="bj-vr-block"><b>🎁 Triggers audiencia</b>${ul(j.audience.decisionTriggers)}</div>` : ''}
        ${j.competitive?.contentGaps?.length ? `<div class="bj-vr-block"><b>💎 Gaps de contenido</b>${ul(j.competitive.contentGaps)}</div>` : ''}
        ${j.opportunities?.top3Opportunities?.length ? `<div class="bj-vr-block"><b>🚀 Top 3 oportunidades</b>${ul(j.opportunities.top3Opportunities.map((o) => `${o.opportunity} → ${o.action}`))}</div>` : ''}
        ${j.opportunities?.redFlags?.length ? `<div class="bj-vr-block"><b>⚠️ NO hacer</b>${ul(j.opportunities.redFlags)}</div>` : ''}
        ${j.audience?.icp ? `<div class="bj-vr-block"><b>👥 Audiencia ideal (ICP)</b><div>Edad: ${esc(j.audience.icp.ageRange || '-')} · Género: ${esc(j.audience.icp.gender || '-')} · Geo: ${(j.audience.icp.geo || []).map(esc).join(', ')}</div>${j.audience.icp.lifestyle ? `<div>Estilo de vida: ${esc(j.audience.icp.lifestyle)}</div>` : ''}</div>` : ''}
        ${j.audience?.psychographics?.fears?.length ? `<div class="bj-vr-block"><b>😰 Miedos de la audiencia</b>${ul(j.audience.psychographics.fears)}</div>` : ''}
        ${j.audience?.psychographics?.aspirations?.length ? `<div class="bj-vr-block"><b>🌟 Aspiraciones</b>${ul(j.audience.psychographics.aspirations)}</div>` : ''}
        ${j.competitive?.differentiationPlay ? `<div class="bj-vr-block"><b>🎯 Cómo diferenciarte</b>${esc(j.competitive.differentiationPlay)}</div>` : ''}
        ${j.opportunities?.contentPillars?.length ? `<div class="bj-vr-block"><b>🏛️ Pilares de contenido</b>${ul(j.opportunities.contentPillars.map((p) => `${p.pillar} (${p['%mix'] || ''})`))}</div>` : ''}`;
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Carousel Builder (planes seleccionables + color pickers + bg image) ──
  // Toggle plan card visual selection
  root.querySelectorAll('.bj-cb-plan-cb').forEach((cb) => {
    cb.addEventListener('change', () => cb.closest('.bj-cb-plan')?.classList.toggle('selected', cb.checked));
  });
  // Sync color picker ↔ text input
  ['text', 'bg', 'accent'].forEach((k) => {
    const picker = root.querySelector(`#cb-${k}-color`);
    const text = root.querySelector(`#cb-${k}-color-text`);
    if (picker && text) {
      picker.addEventListener('input', () => {
        text.value = picker.value.toUpperCase();
      });
      text.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(text.value)) picker.value = text.value;
      });
    }
  });

  root.querySelector('#bj-cb-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bj-cb-result');
    if (!activeTopic) {
      out.innerHTML = '<span style="color:#f59e0b;">Escribí un tema arriba primero.</span>';
      return;
    }
    // Planes seleccionados
    const checked = [...root.querySelectorAll('.bj-cb-plan-cb:checked')].map((c) => parseInt(c.dataset.idx, 10));
    const selectedPlans = (checked.length ? checked : [0]).map((i) => cachedPlan?.hookPlans?.[i]).filter(Boolean);
    if (!selectedPlans.length && !cachedPlan?.hookPlans?.length) {
      // Sin planes cargados → usar topic directo
      selectedPlans.push({ hook: activeTopic, cta: 'Comentá si te sirvió' });
    }
    e.target.disabled = true;
    out.innerHTML = `🎨 Componiendo ${selectedPlans.length} carrusel(es) con tu estética…`;
    try {
      const files = root.querySelector('#cb-files')?.files;
      const raws = files?.length ? await filesToDataUrls(files) : [];
      const images = [];
      for (const r of raws) {
        try {
          images.push(await shrinkImage(r));
        } catch {}
      }
      const bgFile = root.querySelector('#cb-bg-image')?.files?.[0];
      let bgImage = null;
      if (bgFile) {
        const dataUrls = await filesToDataUrls([bgFile]);
        if (dataUrls[0]) bgImage = await shrinkImage(dataUrls[0]);
      }
      const { accountId, niche } = studioAccount();
      const colors = (root.querySelector('#cb-colors')?.value || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const elements = (root.querySelector('#cb-elements')?.value || '')
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const textColor = root.querySelector('#cb-text-color-text')?.value || null;
      const bgColor = root.querySelector('#cb-bg-color-text')?.value || null;
      const accentColor = root.querySelector('#cb-accent-color-text')?.value || null;
      const mood = root.querySelector('#cb-mood')?.value || '';
      const fontStyle = root.querySelector('#cb-font')?.value || 'serif-editorial';

      // Por cada plan seleccionado → 1 carrusel
      const allResults = [];
      for (const p of selectedPlans) {
        const payload = {
          topic: activeTopic,
          niche,
          goal: activeGoal,
          platform,
          format: 'carousel',
          accountId,
          images,
          brandColors: colors,
          extraElements: elements,
          textColor,
          bgColor,
          accentColor,
          bgImage,
          hookOverride: p?.hook || '',
          ctaOverride: p?.cta || '',
          mood: mood || 'premium',
          fontStyle,
          autoPublish: false,
        };
        try {
          const r = await fetch('/api/autopilot/create-post', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          const j = await r.json();
          if (j.ok) allResults.push(j);
        } catch {}
      }

      if (!allResults.length) {
        out.innerHTML = '<span style="color:#ef4444;">No se pudo generar ningún carrusel.</span>';
        return;
      }

      out.innerHTML = `<div style="color:#10b981;font-size:12px;margin-bottom:10px;">✓ ${allResults.length} carrusel(es) generado(s) · tipografía: ${esc(fontStyle)} · texto: ${esc(textColor || '')} · fondo: ${esc(bgColor || '')} · acento: ${esc(accentColor || '')}</div>`;
      allResults.forEach((j, planIdx) => {
        const slides = j.carouselSlides || [];
        const sec = document.createElement('div');
        sec.style.marginBottom = '18px';
        sec.innerHTML = `<div style="font-size:13px;font-weight:800;color:#a855f7;margin-bottom:6px;">📋 Carrusel del Plan ${planIdx + 1}</div>
          ${
            slides.length
              ? `<div class="ap-slides" data-plan="${planIdx}">${slides.map((sl, idx) => `<div class="ap-slide" data-idx="${idx}"><img src="${esc(sl.dataUrl)}" alt="slide ${sl.n}" loading="lazy" /><span class="ap-slide-tag">${sl.n}${sl.role ? '·' + esc(sl.role) : ''}</span></div>`).join('')}</div>
            <button class="bj-btn bj-btn-secondary cb-dl-plan" data-plan="${planIdx}" style="margin-top:6px;font-size:11.5px;">⬇️ Descargar slides del Plan ${planIdx + 1}</button>`
              : '<em>Sin slides</em>'
          }`;
        out.appendChild(sec);
        // Lightbox por plan
        const openLB = (startIdx) => {
          let i = startIdx;
          const ov = document.createElement('div');
          ov.className = 'ap-lightbox';
          const render = () => {
            const sl = slides[i];
            if (!sl) return;
            ov.innerHTML = `<button class="ap-lb-close">✕</button><button class="ap-lb-nav ap-lb-prev" ${i === 0 ? 'disabled' : ''}>‹</button><div class="ap-lb-stage"><img src="${esc(sl.dataUrl)}" /><div class="ap-lb-meta">Plan ${planIdx + 1} · Slide ${sl.n}/${slides.length}${sl.role ? ' · ' + esc(sl.role) : ''}</div></div><button class="ap-lb-nav ap-lb-next" ${i === slides.length - 1 ? 'disabled' : ''}>›</button><a class="ap-lb-dl" href="${esc(sl.dataUrl)}" download="plan${planIdx + 1}-slide-${sl.n}.svg">⬇️ Descargar</a>`;
            ov.querySelector('.ap-lb-close').onclick = () => ov.remove();
            ov.querySelector('.ap-lb-prev').onclick = () => {
              if (i > 0) {
                i--;
                render();
              }
            };
            ov.querySelector('.ap-lb-next').onclick = () => {
              if (i < slides.length - 1) {
                i++;
                render();
              }
            };
          };
          ov.addEventListener('click', (ev) => {
            if (ev.target === ov) ov.remove();
          });
          render();
          document.body.appendChild(ov);
        };
        sec
          .querySelectorAll('.ap-slide')
          .forEach((el) => el.addEventListener('click', () => openLB(parseInt(el.dataset.idx, 10) || 0)));
        sec.querySelector('.cb-dl-plan')?.addEventListener('click', () =>
          slides.forEach((sl, i) =>
            setTimeout(() => {
              const a = document.createElement('a');
              a.href = sl.dataUrl;
              a.download = `plan${planIdx + 1}-slide-${sl.n}.svg`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            }, i * 250),
          ),
        );
      });
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'error')}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Run All — Trabajar mi cuenta esta semana ──
  root.querySelector('#ra-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#ra-result');
    const { accountId, niche } = studioAccount();
    e.target.disabled = true;
    e.target.textContent = '⏳ Ejecutando todo (puede tardar 30-50s)…';
    out.innerHTML = '';
    try {
      const r = await fetch('/api/runall/week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, topic: activeTopic, platform, goal: activeGoal, carouselCount: 3 }),
      });
      const j = await r.json();
      if (!j.ok) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error || 'Error')}</span>`;
        return;
      }
      const tl = (j.timeline || [])
        .map(
          (ev) =>
            `<div class="ra-tl-row ${esc(ev.status || 'done')}"><span>+${(ev.at / 1000).toFixed(1)}s</span><span>${esc(ev.icon || '·')}</span><span>${esc(ev.text)}</span></div>`,
        )
        .join('');
      const carouselsHtml = (j.carousels || [])
        .map(
          (c) => `
        <div class="ra-day">
          <div class="ra-day-head">
            <span class="ra-day-name">📅 ${esc(c.day)} · ${esc(c.theme)}</span>
            ${c.score ? `<span class="ra-day-score">${c.score}/100</span>` : ''}
          </div>
          ${c.hook ? `<div class="ra-day-hook">"${esc(c.hook)}"</div>` : ''}
          ${(c.slides || []).length ? `<div class="ap-slides">${c.slides.map((sl, idx) => `<div class="ap-slide" data-c-idx="${c.day}-${idx}"><img src="${esc(sl.dataUrl)}" alt="slide ${sl.n}" loading="lazy" /><span class="ap-slide-tag">${sl.n}</span></div>`).join('')}</div>` : '<em style="font-size:11.5px;color:#FBBF24;">Sin slides (timeout o error)</em>'}
        </div>`,
        )
        .join('');
      const dmsHtml = (j.dmTemplates || [])
        .map(
          (d) => `
        <div class="ra-dm">
          <span class="ra-dm-intent">${esc(d.intent)}</span>
          <div class="ra-dm-reply">${esc(d.reply)}</div>
          <button class="bj-copy-btn" data-copy="${esc(d.reply)}" style="margin-top:6px;font-size:10.5px;">📋 Copiar</button>
        </div>`,
        )
        .join('');
      out.innerHTML = `
        <div class="ra-grp">
          <div class="ra-grp-title">📊 Resumen ejecución (${Math.round(j.durationMs / 1000)}s)</div>
          <div class="ra-timeline">${tl}</div>
        </div>
        ${j.intel?.mainAngle ? `<div class="ra-grp"><div class="ra-grp-title">🎯 Posicionamiento</div><div style="font-size:13px;color:var(--text-primary,var(--fg));">${esc(j.intel.mainAngle)}</div></div>` : ''}
        ${j.feedback?.learnings?.summary ? `<div class="ra-grp"><div class="ra-grp-title">🧠 Aprendizaje</div><div style="font-size:13px;color:var(--text-primary,var(--fg));">${esc(j.feedback.learnings.summary)}</div></div>` : ''}
        ${j.carousels?.length ? `<div class="ra-grp"><div class="ra-grp-title">🎨 ${j.carousels.length} carruseles generados</div>${carouselsHtml}</div>` : ''}
        ${j.dmTemplates?.length ? `<div class="ra-grp"><div class="ra-grp-title">💬 Templates DM listos</div>${dmsHtml}</div>` : ''}`;
      // Wire copy
      out.querySelectorAll('.bj-copy-btn').forEach((b) =>
        b.addEventListener('click', async () => {
          try {
            await navigator.clipboard.writeText(b.dataset.copy);
            toast('📋 Copiado', 'ok');
          } catch {}
        }),
      );
      // Lightbox slides
      const allMap = {};
      (j.carousels || []).forEach((c) => {
        (c.slides || []).forEach((sl, idx) => {
          allMap[`${c.day}-${idx}`] = { ...sl, day: c.day };
        });
      });
      out.querySelectorAll('.ap-slide').forEach((el) => {
        el.addEventListener('click', () => {
          const sl = allMap[el.dataset.cIdx];
          if (!sl) return;
          const ov = document.createElement('div');
          ov.className = 'ap-lightbox';
          ov.innerHTML = `<button class="ap-lb-close">✕</button><div class="ap-lb-stage"><img src="${esc(sl.dataUrl)}" /><div class="ap-lb-meta">${esc(sl.day)} · slide ${sl.n}</div></div><a class="ap-lb-dl" href="${esc(sl.dataUrl)}" download="${esc(sl.day)}-slide-${sl.n}.svg">⬇️ Descargar</a>`;
          ov.querySelector('.ap-lb-close').onclick = () => ov.remove();
          ov.addEventListener('click', (ev) => {
            if (ev.target === ov) ov.remove();
          });
          document.body.appendChild(ov);
        });
      });
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">${esc(err?.message || 'Error de red')}</span>`;
    } finally {
      e.target.disabled = false;
      e.target.textContent = '▶ Ejecutar todo';
    }
  });

  // ── Brand Studio (imagen con foto autorizada) ──
  const bsPayload = async () => {
    const files = root.querySelector('#bs-files')?.files;
    const images = files?.length ? await filesToDataUrls(files) : [];
    const { niche } = studioAccount();
    const colores = (root.querySelector('#bs-colores')?.value || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const templateKey = root.querySelector('#bs-template')?.value || 'anuncio-ganador';
    const titulo = root.querySelector('#bs-titulo')?.value || '';
    const estilo = root.querySelector('#bs-estilo')?.value || 'premium';
    const formato = root.querySelector('#bs-formato')?.value || 'carousel';
    const elementos = (root.querySelector('#bs-elementos')?.value || '')
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);
    const refine = Boolean(root.querySelector('#bs-refine')?.checked);
    return {
      templateKey,
      images,
      brandColors: colores,
      niche,
      platform,
      format: formato,
      refine,
      extraElements: elementos,
      vars: {
        producto: titulo,
        titulo,
        marca: titulo,
        estilo,
        tema: activeTopic || titulo,
        hook: titulo,
        colores: colores.join(', '),
      },
    };
  };

  root.querySelector('#bs-build')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bs-result');
    e.target.disabled = true;
    out.innerHTML = '⏳ Armando prompt…';
    try {
      const p = await bsPayload();
      const r = await fetch('/api/brand-studio/build-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const j = await r.json();
      out.innerHTML = j.prompt
        ? `<div class="bj-vr-block"><b>Prompt generado</b><div style="background:var(--bg,#0a0a0a);padding:8px;border-radius:6px;font-size:12px;line-height:1.5;">${esc(j.prompt)}</div></div>
           <button class="bj-copy-btn" data-copy="${esc(j.prompt)}">📋 Copiar prompt</button>`
        : `<span style="color:#ef4444;">${esc(j.error || 'error')}</span>`;
      out.querySelector('.bj-copy-btn')?.addEventListener('click', async (ev) => {
        try {
          await navigator.clipboard.writeText(ev.target.dataset.copy);
          toast('📋 Copiado', 'ok');
        } catch {}
      });
    } catch {
      out.innerHTML = '<span style="color:#ef4444;">Error de red.</span>';
    } finally {
      e.target.disabled = false;
    }
  });

  root.querySelector('#bs-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#bs-result');
    e.target.disabled = true;
    out.innerHTML = '🎨 Generando imagen… (puede tardar 10-30s)';
    try {
      const p = await bsPayload();
      const r = await fetch('/api/brand-studio/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      });
      const j = await r.json();
      if (j.url) {
        out.innerHTML = `
          <div style="color:#10b981;font-size:12px;">✓ Generado · ${esc(j.provider || '')} · modo: ${esc(j.mode || '')}${j.usedPhotos ? ` · usó ${j.usedPhotos} foto(s)` : ''}${j.refined ? ` · ✨ refinado (${esc(j.refineProvider || '')})` : ''}</div>
          ${j.warning ? `<div style="color:#f59e0b;font-size:11.5px;">${esc(j.warning)}</div>` : ''}
          <img src="${esc(j.url)}" alt="generada" style="max-width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--border);" />
          <a href="${esc(j.url)}" download="feedia-marca.png" class="bj-btn bj-btn-secondary" style="margin-top:8px;text-decoration:none;display:inline-block;">⬇️ Descargar</a>`;
      } else {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.message || j.error || 'No se pudo generar')}</span>`;
      }
    } catch {
      out.innerHTML = '<span style="color:#ef4444;">Error de red. Reintentá.</span>';
    } finally {
      e.target.disabled = false;
    }
  });

  // ── Piloto automático (crear + publicar autónomo) ──
  // Comprime imagen grande antes de mandar (evita Vercel 4.5MB body limit)
  const shrinkImage = (dataUrl, maxSide = 1080, quality = 0.82) =>
    new Promise((resolve) => {
      if (!dataUrl?.startsWith('data:image')) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale),
          h = Math.round(img.height * scale);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

  root.querySelector('#ap-go')?.addEventListener('click', async (e) => {
    const out = root.querySelector('#ap-result');
    if (!activeTopic) {
      out.innerHTML = '<span style="color:#f59e0b;">Escribí un tema arriba primero.</span>';
      return;
    }
    e.target.disabled = true;
    out.innerHTML = '🤖 El cerebro está trabajando… (cerebro → imagen → validación → publicar)';
    try {
      const files = root.querySelector('#ap-files')?.files;
      const rawImages = files?.length ? await filesToDataUrls(files) : [];
      // Comprimí cada foto a max 1080px lado, 82% jpeg
      const images = [];
      for (const r of rawImages) {
        try {
          images.push(await shrinkImage(r));
        } catch {
          /* skip */
        }
      }
      const { accountId, niche } = studioAccount();
      const payload = {
        topic: activeTopic,
        niche,
        goal: activeGoal,
        platform,
        format: root.querySelector('#ap-format')?.value || 'carousel',
        accountId,
        images,
        brandColors: (root.querySelector('#ap-colores')?.value || '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        extraElements: (root.querySelector('#ap-elementos')?.value || '')
          .split(',')
          .map((c) => c.trim())
          .filter(Boolean),
        autoPublish: Boolean(root.querySelector('#ap-publish')?.checked),
      };
      const ctrl = new AbortController();
      const tHandle = setTimeout(() => ctrl.abort(), 70000);
      let r, j;
      try {
        r = await fetch('/api/autopilot/create-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });
      } catch (netErr) {
        clearTimeout(tHandle);
        out.innerHTML = `<span style="color:#ef4444;">Error de red: ${esc(netErr.message || 'sin respuesta')}. Probá sin foto o con foto más chica.</span>`;
        return;
      }
      clearTimeout(tHandle);
      if (r.status === 413) {
        out.innerHTML =
          '<span style="color:#f59e0b;">⚠️ Imagen demasiado pesada (>4.5MB). Vercel rechazó el body. La comprimimos pero probá una foto más chica.</span>';
        return;
      }
      if (r.status === 504) {
        out.innerHTML =
          '<span style="color:#f59e0b;">⏰ Timeout del servidor (Vercel 60s). Hicimos demasiado en una sola llamada. Reintentá sin foto o con formato más simple.</span>';
        return;
      }
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        out.innerHTML = `<span style="color:#ef4444;">HTTP ${r.status}: ${esc(txt.slice(0, 200))}</span>`;
        return;
      }
      try {
        j = await r.json();
      } catch {
        out.innerHTML = '<span style="color:#ef4444;">Respuesta inválida del servidor.</span>';
        return;
      }
      if (!j.ok && j.error) {
        out.innerHTML = `<span style="color:#ef4444;">${esc(j.error)}: ${esc(j.message || '')}</span>`;
        return;
      }
      const c = j.content || {};
      const v = j.validation || {};
      const statusColor =
        j.status === 'published' ? '#10b981' : j.status === 'ready-for-review' ? '#a855f7' : '#f59e0b';
      out.innerHTML = `
        <div style="color:${statusColor};font-weight:700;font-size:13px;">● ${esc(j.status)}${j.publish?.ok ? ' — ✓ publicado (mediaId ' + esc(j.publish.mediaId || '') + ')' : ''}</div>
        <div style="font-size:11.5px;color:var(--text-tertiary,var(--fg-3));">${esc(j.note || '')}</div>
        ${c.angle ? `<div class="bj-vr-block"><b>Ángulo × Persona</b>${esc(c.angle)} × ${esc(c.persona || '')}</div>` : ''}
        ${c.hook ? `<div class="bj-vr-block"><b>Hook</b>${esc(c.hook)}</div>` : ''}
        ${c.caption ? `<div class="bj-vr-block"><b>Caption</b>${esc(c.caption)}</div>` : ''}
        ${c.hashtags?.length ? `<div class="bj-vr-block"><b>Hashtags</b>${esc(c.hashtags.join(' '))}</div>` : ''}
        ${v.prediction ? `<div class="bj-vr-block"><b>Predicción</b><span class="bj-vr-score">${v.prediction.viralScore ?? '–'}/100</span> · ${esc(v.prediction.virality || '')} · carrusel: ${esc(v.carousel?.verdict || '')}</div>` : ''}
        ${
          Array.isArray(j.carouselSlides) && j.carouselSlides.length
            ? `
          <div class="bj-vr-block"><b>Carrusel · ${j.carouselSlides.length} slides</b> <span style="font-size:10.5px;color:#a78bfa;">(tocá uno para ampliar)</span></div>
          <div class="ap-slides">
            ${j.carouselSlides
              .map(
                (sl, idx) => `
              <div class="ap-slide" data-idx="${idx}">
                <img src="${esc(sl.dataUrl)}" alt="slide ${sl.n}" loading="lazy" />
                <span class="ap-slide-tag">${sl.n} · ${esc(sl.role)}</span>
              </div>`,
              )
              .join('')}
          </div>
          <button class="bj-btn bj-btn-secondary" id="ap-dl-all" style="margin-top:8px;">⬇️ Descargar todos los slides</button>
        `
            : j.image?.url
              ? `<img src="${esc(j.image.url)}" alt="post" onerror="this.style.display='none';this.nextElementSibling.style.display='block';" style="max-width:100%;border-radius:10px;margin-top:8px;border:1px solid var(--border);" />
          <div style="display:none;color:#f59e0b;font-size:11.5px;">⚠️ La imagen no cargó (modo: ${esc(j.image.mode || '')}). Probá de nuevo o sin foto.</div>
          <a href="${esc(j.image.url)}" download="feedia-post.png" class="bj-btn bj-btn-secondary" style="margin-top:8px;text-decoration:none;display:inline-block;">⬇️ Descargar</a>`
              : `<div style="color:#f59e0b;font-size:11.5px;">⚠️ ${esc(j.image?.error || 'sin imagen')}</div>`
        }
        <details style="margin-top:8px;"><summary style="cursor:pointer;font-size:11px;color:#a78bfa;">📋 Ver paso a paso de lo que hizo el sistema</summary><div style="font-size:11.5px;color:var(--text-secondary,var(--fg-2));padding:8px 0;line-height:1.6;">${(j.log || []).map((line) => `<div>${esc(line)}</div>`).join('')}</div></details>`;
      // Descargar todos los slides
      root.querySelector('#ap-dl-all')?.addEventListener('click', () => {
        (j.carouselSlides || []).forEach((sl, i) => {
          setTimeout(() => {
            const a = document.createElement('a');
            a.href = sl.dataUrl;
            a.download = `slide-${sl.n}.svg`;
            document.body.appendChild(a);
            a.click();
            a.remove();
          }, i * 250);
        });
      });
      // Lightbox WhatsApp-style
      const slidesArr = j.carouselSlides || [];
      const openLightbox = (startIdx) => {
        let idx = startIdx;
        const overlay = document.createElement('div');
        overlay.className = 'ap-lightbox';
        const render = () => {
          const sl = slidesArr[idx];
          overlay.innerHTML = `
            <button class="ap-lb-close" aria-label="cerrar">✕</button>
            <button class="ap-lb-nav ap-lb-prev" aria-label="anterior" ${idx === 0 ? 'disabled' : ''}>‹</button>
            <div class="ap-lb-stage">
              <img src="${esc(sl.dataUrl)}" alt="slide ${sl.n}" />
              <div class="ap-lb-meta">Slide ${sl.n} / ${slidesArr.length} · ${esc(sl.role)} ${sl.title ? '· ' + esc(sl.title) : ''}</div>
            </div>
            <button class="ap-lb-nav ap-lb-next" aria-label="siguiente" ${idx === slidesArr.length - 1 ? 'disabled' : ''}>›</button>
            <a class="ap-lb-dl" href="${esc(sl.dataUrl)}" download="slide-${sl.n}.svg">⬇️ Descargar</a>`;
          overlay.querySelector('.ap-lb-close').onclick = () => overlay.remove();
          overlay.querySelector('.ap-lb-prev').onclick = () => {
            if (idx > 0) {
              idx--;
              render();
            }
          };
          overlay.querySelector('.ap-lb-next').onclick = () => {
            if (idx < slidesArr.length - 1) {
              idx++;
              render();
            }
          };
        };
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) overlay.remove();
        });
        document.addEventListener('keydown', function onKey(ev) {
          if (!document.body.contains(overlay)) {
            document.removeEventListener('keydown', onKey);
            return;
          }
          if (ev.key === 'Escape') overlay.remove();
          if (ev.key === 'ArrowLeft' && idx > 0) {
            idx--;
            render();
          }
          if (ev.key === 'ArrowRight' && idx < slidesArr.length - 1) {
            idx++;
            render();
          }
        });
        render();
        document.body.appendChild(overlay);
      };
      out.querySelectorAll('.ap-slide').forEach((el) => {
        el.addEventListener('click', () => openLightbox(parseInt(el.dataset.idx, 10) || 0));
      });
    } catch (err) {
      out.innerHTML = `<span style="color:#ef4444;">Error inesperado: ${esc(err?.message || String(err))}</span>`;
    } finally {
      e.target.disabled = false;
    }
  });

  // Conexiones IG/TikTok — carga estado + botones
  const loadConnections = async () => {
    const host = root.querySelector('#bj-connect-status');
    if (!host) return;
    try {
      const r = await fetch('/api/connect/status');
      const s = await r.json();
      const row = (name, key, c, extra) => {
        if (!c.configured)
          return `<div class="bj-conn-row"><span class="bj-conn-name">${name}</span><span class="bj-conn-warn">no configurado (faltan credenciales de la app)</span></div>`;
        if (c.connected)
          return `<div class="bj-conn-row"><span class="bj-conn-name">${name}</span><span class="bj-conn-ok">✓ conectado${c.username ? ' @' + esc(c.username) : ''}</span>${extra || ''}</div>`;
        return `<div class="bj-conn-row"><span class="bj-conn-name">${name}</span><a class="bj-btn bj-btn-secondary bj-conn-btn" href="/api/connect/${key}/start">Conectar</a></div>`;
      };
      host.innerHTML =
        row(
          'Instagram',
          'instagram',
          s.instagram,
          s.instagram.connected ? '<button class="bj-copy-btn" id="bj-ig-sync">Traer métricas</button>' : '',
        ) + row('TikTok', 'tiktok', s.tiktok, '');
      root.querySelector('#bj-ig-sync')?.addEventListener('click', async (e) => {
        e.target.disabled = true;
        e.target.textContent = '⏳';
        const { accountId } = studioAccount();
        try {
          const rr = await fetch('/api/connect/instagram/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          });
          const jj = await rr.json();
          e.target.textContent = jj.ok ? `✓ ${jj.synced} posts` : jj.message || 'error';
        } catch {
          e.target.textContent = 'error';
        }
      });
    } catch {
      host.innerHTML = '<span style="color:#ef4444;">No se pudo cargar el estado.</span>';
    }
  };
  void loadConnections();

  // Canva status
  (async () => {
    const ch = root.querySelector('#bj-canva-status');
    if (!ch) return;
    try {
      const r = await fetch('/api/canva/status');
      const s = await r.json();
      if (!s.configured)
        ch.innerHTML = `<span style="color:#f59e0b;font-size:12px;">no configurado · admin debe setear CANVA_CLIENT_ID/SECRET/REDIRECT_URI en Vercel (registrar app en canva.dev)</span>`;
      else if (s.connected)
        ch.innerHTML = `<span style="color:#10b981;">✓ Canva conectado · expira ${s.expiresAt ? new Date(s.expiresAt).toLocaleString() : 'pronto'}</span>`;
      else ch.innerHTML = `<a class="bj-btn bj-btn-secondary bj-conn-btn" href="/api/canva/start">Conectar Canva</a>`;
    } catch {
      ch.innerHTML = '<span style="color:#ef4444;">No se pudo cargar Canva.</span>';
    }
  })();

  // Re-render if platform changes
  window.addEventListener(
    'feedia:platform',
    () => {
      void renderBrujula(container);
    },
    { once: true },
  );
};
