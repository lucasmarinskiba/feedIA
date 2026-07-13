/* ══════════════════════════════════════════════════════════════════════════════
   FREE CU DEMO — User Free ve a FeedIA crear + publicar un carrusel paso a paso.
   ──────────────────────────────────────────────────────────────────────────────
   Sin gastos al dev: usa Llama 3.3 70B (Groq free) + Pollinations Flux (free).
   ══════════════════════════════════════════════════════════════════════════════ */
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const STAGE_LABELS = {
  'strategy:start': '🧠 Pensando estrategia...',
  'strategy:done': '✅ Plan estratégico listo',
  'content:start': '✍️ Escribiendo carrusel con Llama 3.3 70B...',
  'content:done': '✅ Slides + caption + hashtags listos',
  'images:start': '🎨 Generando imágenes con Pollinations Flux...',
  'images:done': '✅ Imágenes listas',
  'predict:start': '📊 Calculando score viral...',
  'predict:done': '✅ Score viral calculado',
  'recipe:start': '🤖 Armando script Computer Use...',
  'recipe:done': '✅ Recipe lista para publicar',
  done: '🎉 Demo completa',
};

const buildBriefForm = () => `
  <div class="fcd-card">
    <h2 class="fcd-title">🎬 Mirá FeedIA crear y publicar tu primer carrusel</h2>
    <p class="fcd-sub">Plan Free. $0. Llama 3.3 70B + Pollinations Flux. Vas a ver TODO el proceso paso a paso.</p>

    <div class="fcd-field">
      <label>¿Sobre qué armamos el carrusel?</label>
      <input id="fcd-topic" type="text" placeholder="Ej: cómo automatizar mi marketing con IA" autocomplete="off" maxlength="120" />
    </div>
    <div class="fcd-field-row">
      <div class="fcd-field">
        <label>Nicho</label>
        <input id="fcd-niche" type="text" placeholder="marketing / fitness / IA" maxlength="40" />
      </div>
      <div class="fcd-field">
        <label>Voz de marca</label>
        <select id="fcd-voice">
          <option value="cercano">Cercano</option>
          <option value="profesional">Profesional</option>
          <option value="humorístico">Humorístico</option>
          <option value="inspirador">Inspirador</option>
        </select>
      </div>
    </div>

    <button class="fcd-cta" id="fcd-start">
      <span class="fcd-cta-icon">▶️</span>
      Empezar la demo (5 min CU)
    </button>
    <p class="fcd-disclaimer">Consume ~5 min del cap diario de 30 min Computer Use. Costo a vos: $0.</p>
  </div>`;

const buildProgressView = () => `
  <div class="fcd-card fcd-progress-card">
    <h2 class="fcd-title">🎬 FeedIA trabajando en vivo...</h2>
    <p class="fcd-sub">Mirá cada paso ejecutándose. Si bloqueás esta pestaña, el proceso sigue en backend.</p>

    <div class="fcd-stages" id="fcd-stages">
      <div class="fcd-stage active" data-stage="strategy">
        <div class="fcd-stage-num">1</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">🧠 Estrategia</div>
          <div class="fcd-stage-detail">Detectando audiencia, formato óptimo, top 5 hooks</div>
        </div>
        <div class="fcd-stage-status"><span class="fcd-spin"></span></div>
      </div>
      <div class="fcd-stage" data-stage="content">
        <div class="fcd-stage-num">2</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">✍️ Contenido</div>
          <div class="fcd-stage-detail">Llama 3.3 70B escribe 7 slides + caption + 12 hashtags</div>
        </div>
        <div class="fcd-stage-status">⏳</div>
      </div>
      <div class="fcd-stage" data-stage="images">
        <div class="fcd-stage-num">3</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">🎨 Imágenes</div>
          <div class="fcd-stage-detail">Pollinations Flux genera 7 imágenes 1080×1350 en paralelo</div>
        </div>
        <div class="fcd-stage-status">⏳</div>
      </div>
      <div class="fcd-stage" data-stage="predict">
        <div class="fcd-stage-num">4</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">📊 Predicción viral</div>
          <div class="fcd-stage-detail">Algoritmo predice reach, engagement, saves, shares</div>
        </div>
        <div class="fcd-stage-status">⏳</div>
      </div>
      <div class="fcd-stage" data-stage="recipe">
        <div class="fcd-stage-num">5</div>
        <div class="fcd-stage-body">
          <div class="fcd-stage-label">🤖 Computer Use Recipe</div>
          <div class="fcd-stage-detail">11 pasos automatizados para subir al Instagram</div>
        </div>
        <div class="fcd-stage-status">⏳</div>
      </div>
    </div>

    <div class="fcd-tip">
      💡 <strong>Sabías que...</strong> <span id="fcd-tip-text">FeedIA usa Llama 3.3 70B vía Groq — el mismo modelo que potencia chatbots de empresas top mundial. Y vos lo usás gratis.</span>
    </div>
  </div>`;

const buildResultView = (result) => {
  const slides = result.content?.slides || [];
  const pred = result.prediction || {};
  const recipe = result.publishRecipe || {};
  const viralColor = pred.viralScore >= 70 ? '#10b981' : pred.viralScore >= 55 ? '#3b82f6' : '#f59e0b';

  return `
    <div class="fcd-card fcd-result-hero">
      <div class="fcd-hero-badge">✅ Carrusel completo en ${(result.timing?.totalMs / 1000).toFixed(1)}s</div>
      <h2 class="fcd-title">"${escape(result.topic)}"</h2>
      <p class="fcd-sub">${slides.length} slides + caption + ${result.content?.hashtags?.length || 0} hashtags + recipe Computer Use lista. Costo a vos: <strong>$0</strong>.</p>
    </div>

    <div class="fcd-card">
      <div class="fcd-section-head">
        <h3>📊 Predicción viral</h3>
        <div class="fcd-viral-badge" style="background:${viralColor}22;color:${viralColor};">${pred.viralScore}/100 · ${escape(pred.virality || 'solid')}</div>
      </div>
      <div class="fcd-pred-grid">
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(pred.predicted?.reach || 0).toLocaleString('es-AR')}</div><div class="fcd-pred-lbl">alcance</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${((pred.predicted?.engagementRate || 0) * 100).toFixed(1)}%</div><div class="fcd-pred-lbl">engagement</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(pred.predicted?.saves || 0).toLocaleString('es-AR')}</div><div class="fcd-pred-lbl">saves</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(pred.predicted?.shares || 0).toLocaleString('es-AR')}</div><div class="fcd-pred-lbl">shares</div></div>
        <div class="fcd-pred-stat"><div class="fcd-pred-num">${(pred.predicted?.comments || 0).toLocaleString('es-AR')}</div><div class="fcd-pred-lbl">comments</div></div>
      </div>
    </div>

    <div class="fcd-card">
      <h3>🎬 Slides generados (${slides.length})</h3>
      <div class="fcd-slides-grid">
        ${slides
          .map(
            (s) => `
          <div class="fcd-slide-card">
            ${s.imageUrl ? `<img src="${escape(s.imageUrl)}" alt="Slide ${s.n}" loading="lazy" />` : '<div class="fcd-slide-placeholder">Imagen pendiente</div>'}
            <div class="fcd-slide-body">
              <div class="fcd-slide-num">Slide ${s.n}/${slides.length}</div>
              <div class="fcd-slide-headline">${escape(s.headline || '')}</div>
              ${s.body ? `<div class="fcd-slide-body-text">${escape(s.body)}</div>` : ''}
            </div>
          </div>`,
          )
          .join('')}
      </div>
    </div>

    <div class="fcd-card">
      <div class="fcd-section-head">
        <h3>📝 Caption + Hashtags</h3>
        <button class="fcd-copy-btn" data-copy="${encodeURIComponent(`${result.content?.caption || ''}\n\n${(result.content?.hashtags || []).join(' ')}`)}">📋 Copiar todo</button>
      </div>
      <pre class="fcd-caption">${escape(result.content?.caption || '')}</pre>
      <div class="fcd-tags">
        ${(result.content?.hashtags || []).map((t) => `<span class="fcd-tag">${escape(t)}</span>`).join('')}
      </div>
    </div>

    <div class="fcd-card fcd-recipe-card">
      <h3>🤖 Computer Use Recipe — Publicar en Instagram</h3>
      <p class="fcd-sub">${recipe.totalSteps} pasos · ${recipe.estimatedMinutes} min estimado · Sin gasto adicional</p>
      <div class="fcd-recipe-steps">
        ${(recipe.steps || [])
          .map(
            (step) => `
          <div class="fcd-step">
            <div class="fcd-step-num">${step.n}</div>
            <div class="fcd-step-icon">${step.icon}</div>
            <div class="fcd-step-body">
              <div class="fcd-step-label">${escape(step.label)}</div>
              <div class="fcd-step-detail">${escape(typeof step.detail === 'string' ? step.detail : `${(step.detail || []).length} items`)}</div>
            </div>
            <div class="fcd-step-time">${step.estimatedSec}s</div>
          </div>`,
          )
          .join('')}
      </div>
      <div class="fcd-actions">
        <button class="fcd-action-btn primary" id="fcd-execute-cu">🚀 Ejecutar Computer Use ahora</button>
        <button class="fcd-action-btn secondary" id="fcd-download-zip">📦 Descargar paquete (imágenes + caption)</button>
        <button class="fcd-action-btn ghost" id="fcd-new-demo">🔄 Nueva demo</button>
      </div>
    </div>

    <div class="fcd-card fcd-upgrade-card">
      <h3>🚀 ¿Te gustó lo que viste?</h3>
      <p>Free es un sneak peek. En <strong>Starter $7</strong> tenés:</p>
      <ul>
        <li>✨ Claude Sonnet 4.6 (calidad agencia) en lugar de Llama free</li>
        <li>🖼️ Imágenes Full HD garantizadas con Flux-Dev en lugar de Pollinations</li>
        <li>🎯 Viral score ≥65 obligatorio (regenera hasta cumplir)</li>
        <li>🤖 Computer Use 90 min/día + autopilot auto-execute</li>
        <li>📊 20 publicaciones PREMIUM/mes garantizadas</li>
      </ul>
      <a class="fcd-action-btn primary" href="/pricing.html">Ver todos los planes →</a>
    </div>
  `;
};

const wireBrief = (root) => {
  const startBtn = root.querySelector('#fcd-start');
  if (!startBtn) return;
  startBtn.addEventListener('click', async () => {
    const topic = root.querySelector('#fcd-topic')?.value.trim();
    if (!topic || topic.length < 5) {
      toast('Decile un tema de al menos 5 caracteres', 'warn');
      return;
    }
    const niche = root.querySelector('#fcd-niche')?.value.trim() || '';
    const voice = root.querySelector('#fcd-voice')?.value || 'cercano';

    root.innerHTML = buildProgressView();
    animateProgress(root);

    try {
      const r = await fetch('/api/free-cu/carousel-demo', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          brandNiche: niche,
          brandVoice: voice,
          platform: 'instagram',
          goal: 'engagement',
        }),
      });
      const data = await r.json();
      if (!r.ok) {
        toast(data.message || 'No se pudo correr la demo', 'err');
        if (r.status === 402) {
          setTimeout(() => {
            location.href = data.upgradeUrl || '/pricing.html';
          }, 1500);
        } else {
          setTimeout(() => render(root), 1500);
        }
        return;
      }
      data.topic = topic;
      root.innerHTML = buildResultView(data);
      wireResult(root, data);
    } catch {
      toast('Error de red', 'err');
      setTimeout(() => render(root), 1500);
    }
  });
};

const animateProgress = (root) => {
  const stageOrder = ['strategy', 'content', 'images', 'predict', 'recipe'];
  const tips = [
    'FeedIA usa Llama 3.3 70B vía Groq — el mismo modelo que potencia chatbots de empresas top mundial. Y vos lo usás gratis.',
    'Pollinations Flux genera imágenes con calidad similar a Midjourney sin gastar tokens.',
    'El viral predictor usa heurísticas calibradas contra patrones reales de IG/TikTok virales.',
    'Computer Use recipe = pasos deterministas para publicar sin pagar Claude Computer Use real.',
    'Plan Pro $19 desbloquea Sonnet 4.6 + viral score ≥72 garantizado + autopilot cada 30 min.',
  ];
  let stageIdx = 0;
  let tipIdx = 0;
  const tipEl = root.querySelector('#fcd-tip-text');
  const stageEls = Array.from(root.querySelectorAll('.fcd-stage'));

  const rotateTip = setInterval(() => {
    if (!tipEl) return;
    tipIdx = (tipIdx + 1) % tips.length;
    tipEl.textContent = tips[tipIdx];
  }, 4000);

  const advance = setInterval(() => {
    if (stageIdx >= stageOrder.length) {
      clearInterval(advance);
      return;
    }
    const cur = stageEls.find((el) => el.dataset.stage === stageOrder[stageIdx]);
    if (cur) {
      cur.classList.remove('active');
      cur.classList.add('done');
      cur.querySelector('.fcd-stage-status').innerHTML = '✅';
    }
    stageIdx++;
    const next = stageEls.find((el) => el.dataset.stage === stageOrder[stageIdx]);
    if (next) {
      next.classList.add('active');
      next.querySelector('.fcd-stage-status').innerHTML = '<span class="fcd-spin"></span>';
    }
  }, 2000);

  root._fcdIntervals = [rotateTip, advance];
};

const wireResult = (root, data) => {
  // Cleanup intervals from progress
  (root._fcdIntervals || []).forEach((i) => clearInterval(i));

  root.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = decodeURIComponent(btn.dataset.copy);
      try {
        navigator.clipboard.writeText(text);
        toast('📋 Copiado', 'ok');
      } catch {
        toast('No se pudo copiar', 'err');
      }
    });
  });

  root.querySelector('#fcd-execute-cu')?.addEventListener('click', () => {
    toast('🚀 Para ejecutar CU real: upgrade a Starter ($7/mes)', 'info');
    setTimeout(() => {
      location.href = '/pricing.html';
    }, 1200);
  });

  root.querySelector('#fcd-download-zip')?.addEventListener('click', () => {
    toast('📦 Generando paquete...', 'info');
    // En implementación real: server side ZIP gen, por ahora abre primer slide
    const firstImg = data.content?.slides?.[0]?.imageUrl;
    if (firstImg) window.open(firstImg, '_blank');
  });

  root.querySelector('#fcd-new-demo')?.addEventListener('click', () => render(root));
};

const render = (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🎬 Free Carousel Demo</h1>
        <p class="view-subtitle page-subtitle">Mirá FeedIA crear y publicar un carrusel paso a paso · 100% gratis · 0 setup</p>
      </div>
    </header>
    <div class="page-body" id="fcd-container">
      ${buildBriefForm()}
    </div>
    <style>
      .fcd-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:16px;color:var(--text-primary,var(--fg));}
      .fcd-title{font-size:22px;letter-spacing:-0.02em;margin:0 0 6px;}
      .fcd-sub{font-size:13.5px;color:var(--text-tertiary,#888);margin:0 0 18px;line-height:1.5;}
      .fcd-field{display:flex;flex-direction:column;gap:5px;margin-bottom:14px;}
      .fcd-field label{font-size:12px;font-weight:600;color:var(--text-secondary,#666);}
      .fcd-field input,.fcd-field select{padding:11px 13px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border-soft,rgba(17,18,22,.08));border-radius:10px;color:var(--text-primary,var(--fg));font-size:14px;font-family:inherit;outline:none;transition:border-color .15s;}
      .fcd-field input:focus,.fcd-field select:focus{border-color:rgba(225,48,108,.45);box-shadow:0 0 0 3px rgba(225,48,108,.08);}
      .fcd-field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
      .fcd-cta{width:100%;padding:16px 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#f09433,#e1306c 40%,#a855f7);color:#fff;font-size:15px;font-weight:800;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:10px;transition:filter .15s,transform .12s;}
      .fcd-cta:hover{filter:brightness(1.08);} .fcd-cta:active{transform:scale(.985);}
      .fcd-cta-icon{font-size:18px;}
      .fcd-disclaimer{font-size:11.5px;color:var(--text-tertiary);text-align:center;margin-top:10px;}

      .fcd-progress-card{background:linear-gradient(135deg,rgba(225,48,108,.04),rgba(168,85,247,.03));}
      .fcd-stages{display:flex;flex-direction:column;gap:10px;margin-bottom:16px;}
      .fcd-stage{display:flex;gap:12px;align-items:center;padding:14px;background:var(--bg-soft,rgba(17,18,22,.03));border:1px solid var(--border-soft);border-radius:12px;opacity:.5;transition:all .3s;}
      .fcd-stage.active{opacity:1;border-color:rgba(168,85,247,.4);background:linear-gradient(90deg,rgba(168,85,247,.06),rgba(168,85,247,.02));}
      .fcd-stage.done{opacity:.8;border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04);}
      .fcd-stage-num{width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;flex-shrink:0;}
      .fcd-stage.done .fcd-stage-num{background:#10b981;}
      .fcd-stage-body{flex:1;}
      .fcd-stage-label{font-weight:700;font-size:14px;margin-bottom:2px;}
      .fcd-stage-detail{font-size:11.5px;color:var(--text-tertiary);}
      .fcd-stage-status{font-size:18px;flex-shrink:0;}
      .fcd-spin{display:inline-block;width:16px;height:16px;border:2px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:fcdSpin .9s linear infinite;}
      @keyframes fcdSpin{to{transform:rotate(360deg);}}
      .fcd-tip{padding:12px 14px;background:rgba(34,211,238,.06);border:1px solid rgba(34,211,238,.2);border-radius:10px;font-size:12.5px;line-height:1.5;color:var(--text-secondary);}

      .fcd-result-hero{background:linear-gradient(135deg,rgba(16,185,129,.05),rgba(168,85,247,.03));}
      .fcd-hero-badge{display:inline-block;padding:5px 11px;background:rgba(16,185,129,.12);color:#10b981;font-size:11.5px;font-weight:700;border-radius:999px;margin-bottom:6px;}
      .fcd-section-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
      .fcd-section-head h3{margin:0;font-size:16px;}
      .fcd-viral-badge{padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;}
      .fcd-pred-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;}
      .fcd-pred-stat{padding:10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;text-align:center;}
      .fcd-pred-num{font-size:18px;font-weight:800;letter-spacing:-0.01em;}
      .fcd-pred-lbl{font-size:10.5px;color:var(--text-tertiary);margin-top:2px;}

      .fcd-slides-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;}
      .fcd-slide-card{background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;overflow:hidden;}
      .fcd-slide-card img{width:100%;aspect-ratio:4/5;object-fit:cover;display:block;}
      .fcd-slide-placeholder{aspect-ratio:4/5;display:flex;align-items:center;justify-content:center;background:var(--border);color:var(--text-tertiary);font-size:12px;}
      .fcd-slide-body{padding:10px;}
      .fcd-slide-num{font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;}
      .fcd-slide-headline{font-weight:700;font-size:13px;margin:3px 0 4px;line-height:1.3;}
      .fcd-slide-body-text{font-size:11.5px;color:var(--text-secondary);line-height:1.4;}

      .fcd-copy-btn{padding:6px 12px;font-size:12px;font-weight:700;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:7px;cursor:pointer;}
      .fcd-copy-btn:hover{background:var(--bg-soft);color:var(--text-primary);}
      .fcd-caption{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-family:inherit;font-size:13px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;margin:0 0 10px;}
      .fcd-tags{display:flex;flex-wrap:wrap;gap:4px;}
      .fcd-tag{padding:3px 9px;background:rgba(168,85,247,.10);color:#a855f7;font-size:11.5px;font-weight:600;border-radius:999px;}

      .fcd-recipe-card{background:linear-gradient(135deg,rgba(225,48,108,.03),rgba(168,85,247,.02));}
      .fcd-recipe-steps{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
      .fcd-step{display:flex;gap:10px;align-items:center;padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-size:13px;}
      .fcd-step-num{width:24px;height:24px;border-radius:50%;background:rgba(168,85,247,.15);color:#a855f7;display:flex;align-items:center;justify-content:center;font-size:11.5px;font-weight:800;flex-shrink:0;}
      .fcd-step-icon{font-size:16px;flex-shrink:0;}
      .fcd-step-body{flex:1;min-width:0;}
      .fcd-step-label{font-weight:700;font-size:12.5px;}
      .fcd-step-detail{font-size:11px;color:var(--text-tertiary);}
      .fcd-step-time{font-size:11px;color:var(--text-tertiary);flex-shrink:0;font-weight:600;}

      .fcd-actions{display:flex;gap:8px;flex-wrap:wrap;}
      .fcd-action-btn{padding:11px 18px;border-radius:10px;border:0;font-size:13.5px;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;display:inline-flex;align-items:center;}
      .fcd-action-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .fcd-action-btn.primary:hover{filter:brightness(1.08);}
      .fcd-action-btn.secondary{background:var(--bg-soft);color:var(--text-primary);border:1px solid var(--border);}
      .fcd-action-btn.ghost{background:transparent;color:var(--text-secondary);border:1px solid var(--border);}

      .fcd-upgrade-card{background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.05));border-color:rgba(168,85,247,.3);}
      .fcd-upgrade-card ul{margin:10px 0 16px;padding-left:18px;display:flex;flex-direction:column;gap:6px;font-size:13.5px;}
      .fcd-upgrade-card li{line-height:1.5;}
    </style>`;

  wireBrief(root);
};

export const renderFreeCuDemo = async (root) => {
  render(root);
};
