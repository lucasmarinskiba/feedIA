/* ══════════════════════════════════════════════════════════════════════════════
   FORGE IA — Herramienta clave: estrategia + producción + predicción viral
   ──────────────────────────────────────────────────────────────────────────────
   Pipeline end-to-end visible:
     1. Brief → strategy (audience + format + hooks)
     2. Forge → carousel/reel/story con assets
     3. Predict → viral score + métricas predichas
     4. Iterate → regenera hasta breakout-potential

   Funciona para Instagram + TikTok según platform switcher.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let lastResult = null;

const getActivePlatform = () => {
  try {
    const v = localStorage.getItem('feedia.platform');
    return v === 'tiktok' ? 'tiktok' : 'instagram';
  } catch {
    return 'instagram';
  }
};

const VIRALITY_COLORS = {
  'breakout-potential': '#10b981',
  'high-potential': '#3b82f6',
  solid: '#a855f7',
  mediocre: '#f59e0b',
  low: '#ef4444',
};

const VIRALITY_LABELS = {
  'breakout-potential': '🚀 Breakout potential',
  'high-potential': '🎯 High potential',
  solid: '💪 Solid',
  mediocre: '⚠️ Mediocre',
  low: '🚨 Bajo',
};

const buildForm = (platform) => `
  <div class="fg-card">
    <h2 class="fg-section-title">1. Decile a Forge qué crear</h2>
    <p class="fg-section-sub">Strategist + 12 hook formulas + viral predictor analizan ANTES de generar. Cero tokens malgastados.</p>

    <div class="fg-form-grid">
      <label class="fg-field fg-field-wide">
        <span class="fg-label">¿Sobre qué?</span>
        <input class="fg-input" id="fg-topic" placeholder="Ej: cómo automatizar tu marketing con IA" autocomplete="off" />
      </label>

      <label class="fg-field">
        <span class="fg-label">Plataforma</span>
        <select class="fg-input" id="fg-platform">
          <option value="instagram" ${platform === 'instagram' ? 'selected' : ''}>📷 Instagram</option>
          <option value="tiktok" ${platform === 'tiktok' ? 'selected' : ''}>🎵 TikTok</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Formato</span>
        <select class="fg-input" id="fg-format">
          <option value="carousel">🗂️ Carrusel</option>
          <option value="reel" selected>🎬 Reel / Video</option>
          <option value="story">◎ Story</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Goal</span>
        <select class="fg-input" id="fg-goal">
          <option value="engagement" selected>💜 Engagement</option>
          <option value="awareness">📡 Alcance</option>
          <option value="conversion">💰 Conversión</option>
          <option value="community">👥 Comunidad</option>
          <option value="sales">🛒 Ventas</option>
        </select>
      </label>

      <label class="fg-field">
        <span class="fg-label">Nicho</span>
        <input class="fg-input" id="fg-niche" placeholder="Ej: marketing, fitness, IA" autocomplete="off" />
      </label>

      <label class="fg-field">
        <span class="fg-label">Voz de marca</span>
        <select class="fg-input" id="fg-voice">
          <option value="cercano">Cercano</option>
          <option value="profesional">Profesional</option>
          <option value="autoritativo">Autoritativo</option>
          <option value="humorístico">Humorístico</option>
          <option value="inspirador">Inspirador</option>
        </select>
      </label>

      <label class="fg-field fg-field-wide">
        <span class="fg-label">Ángulos competidores (opcional)</span>
        <input class="fg-input" id="fg-competitors" placeholder="Ej: tutorial paso a paso, tips de productividad" autocomplete="off" />
      </label>
    </div>

    <div class="fg-actions">
      <button class="fg-btn fg-btn-secondary" id="fg-strategy-only">📋 Solo estrategia</button>
      <button class="fg-btn fg-btn-primary" id="fg-forge-go">
        <span class="fg-btn-icon">✨</span>
        Forge contenido completo
      </button>
    </div>
    <p class="fg-disclaimer">Free: Llama 3.3 70B + Pollinations Flux. Paid: Claude Sonnet/Opus + fal.ai Flux-Pro. <a href="/pricing.html">Ver planes →</a></p>
  </div>`;

const renderStrategy = (s) => {
  if (!s) return '';
  const score = s.strategicScore || 0;
  const scoreColor = score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : '#f59e0b';
  return `
    <div class="fg-card">
      <div class="fg-strategy-head">
        <div>
          <h3 class="fg-section-title">2. Plan estratégico</h3>
          <p class="fg-section-sub">${escape(s.brandVoiceGuideline || '')}</p>
        </div>
        <div class="fg-score-circle" style="background:${scoreColor};">
          <div class="fg-score-val">${score}</div>
          <div class="fg-score-lbl">strategic</div>
        </div>
      </div>

      <div class="fg-strategy-grid">
        <div class="fg-strategy-block">
          <strong>🎯 Formato recomendado</strong>
          <div class="fg-strategy-val">${escape(s.recommendedFormat?.format || '')} <span class="fg-muted">(fit ${((s.recommendedFormat?.fit || 0) * 100).toFixed(0)}%)</span></div>
          <div class="fg-tiny-muted">${escape(s.recommendedFormat?.reason || '')}</div>
        </div>

        <div class="fg-strategy-block">
          <strong>👥 Audiencia</strong>
          <div class="fg-strategy-val">${escape(s.input?.audience || '')}</div>
          <div class="fg-tiny-muted">Triggers: ${(s.audienceProfile?.triggers || []).slice(0, 3).join(', ')}</div>
        </div>

        <div class="fg-strategy-block">
          <strong>⏰ Mejor ventana</strong>
          <div class="fg-strategy-val">${escape((s.postingWindows || [])[0] || 'cualquier hora')}</div>
          <div class="fg-tiny-muted">Atención: ${s.attentionBudgetSec || 2}s</div>
        </div>
      </div>

      <div class="fg-hooks">
        <strong>🎣 Top 5 hooks predichos:</strong>
        <div class="fg-hook-list">
          ${(s.hookCandidates || [])
            .map(
              (h, i) => `
            <div class="fg-hook ${i === 0 ? 'best' : ''}">
              <div class="fg-hook-head">
                <span class="fg-hook-formula">${escape(h.formula)}</span>
                <span class="fg-hook-strength" style="color:${h.predictedStrength >= 0.85 ? '#10b981' : '#a855f7'};">
                  ${(h.predictedStrength * 100).toFixed(0)}% strength
                </span>
              </div>
              <div class="fg-hook-text">${escape(h.hook)}</div>
              ${i === 0 ? '<div class="fg-hook-badge">RECOMENDADO</div>' : ''}
            </div>`,
            )
            .join('')}
        </div>
      </div>

      ${
        (s.algorithmChecklist || []).length
          ? `
        <div class="fg-checklist">
          <strong>🧠 Optimización algorítmica (${s.input?.platform || 'IG'}):</strong>
          <ul>
            ${(s.algorithmChecklist || [])
              .map(
                (c) => `
              <li><strong>${escape(c.signal)}:</strong> ${escape(c.tactic)}</li>`,
              )
              .join('')}
          </ul>
        </div>`
          : ''
      }

      ${
        (s.riskFlags || []).length
          ? `
        <div class="fg-flags">
          <strong>⚠️ Risk flags:</strong>
          ${(s.riskFlags || []).map((f) => `<div class="fg-flag">${escape(f)}</div>`).join('')}
        </div>`
          : ''
      }
    </div>`;
};

const renderPrediction = (p) => {
  if (!p) return '';
  const color = VIRALITY_COLORS[p.virality] || '#a855f7';
  return `
    <div class="fg-card">
      <h3 class="fg-section-title">3. Viral predictor</h3>
      <p class="fg-section-sub">Modelo determinístico 0-100 con benchmarks reales IG/TT.</p>

      <div class="fg-viral-hero">
        <div class="fg-viral-score" style="border-color:${color};">
          <div class="fg-viral-num" style="color:${color};">${p.viralScore}</div>
          <div class="fg-viral-lbl">viral score</div>
        </div>
        <div class="fg-viral-body">
          <div class="fg-viral-class" style="background:${color}22;color:${color};">${VIRALITY_LABELS[p.virality] || p.virality}</div>
          <div class="fg-tiny-muted">Techo si optimizás: ${p.ceilingScore} (gap ${p.optimizationGap}pts)</div>
        </div>
      </div>

      <div class="fg-pred-metrics">
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${p.predicted?.reach?.toLocaleString('es-AR') || 0}</div>
          <div class="fg-pred-lbl">alcance predicho</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${((p.predicted?.engagementRate || 0) * 100).toFixed(1)}%</div>
          <div class="fg-pred-lbl">engagement rate</div>
        </div>
        ${
          p.predicted?.completion !== null
            ? `
          <div class="fg-pred-metric">
            <div class="fg-pred-num">${(p.predicted?.completion * 100).toFixed(0)}%</div>
            <div class="fg-pred-lbl">completion</div>
          </div>`
            : ''
        }
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${p.predicted?.saves?.toLocaleString('es-AR') || 0}</div>
          <div class="fg-pred-lbl">saves</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${p.predicted?.shares?.toLocaleString('es-AR') || 0}</div>
          <div class="fg-pred-lbl">shares</div>
        </div>
        <div class="fg-pred-metric">
          <div class="fg-pred-num">${p.predicted?.comments?.toLocaleString('es-AR') || 0}</div>
          <div class="fg-pred-lbl">comments</div>
        </div>
      </div>

      <div class="fg-breakdown">
        <strong>Breakdown:</strong>
        <div class="fg-breakdown-grid">
          ${Object.entries(p.breakdown || {})
            .map(
              ([k, v]) => `
            <div class="fg-break-row">
              <div class="fg-break-name">${escape(k)} <span class="fg-tiny-muted">(${v.weight}%)</span></div>
              <div class="fg-break-bar"><div class="fg-break-fill" style="width:${v.score}%;background:${v.score >= 75 ? '#10b981' : v.score >= 50 ? '#a855f7' : '#f59e0b'};"></div></div>
              <div class="fg-break-score">${v.score}</div>
            </div>`,
            )
            .join('')}
        </div>
      </div>

      ${
        (p.improvements || []).length
          ? `
        <div class="fg-improvements">
          <strong>💡 Mejoras sugeridas:</strong>
          <ul>${(p.improvements || []).map((i) => `<li>${escape(i)}</li>`).join('')}</ul>
        </div>`
          : ''
      }

      ${
        (p.flags || []).length
          ? `
        <div class="fg-flags">
          <strong>🚨 Risk flags:</strong>
          ${(p.flags || []).map((f) => `<div class="fg-flag">${escape(f)}</div>`).join('')}
        </div>`
          : ''
      }
    </div>`;
};

const renderContent = (c, assets, meta) => {
  if (!c) return '';
  const isCarousel = Array.isArray(c.slides);
  const isReel = Array.isArray(c.beats);
  const isStory = Array.isArray(c.frames);

  return `
    <div class="fg-card">
      <h3 class="fg-section-title">4. Contenido generado</h3>
      <p class="fg-section-sub">Provider: ${escape(meta?.llm?.provider || 'free')} · Modelo: ${escape(meta?.llm?.model || 'auto')}</p>

      ${
        assets?.coverImage
          ? `
        <div class="fg-cover">
          <img src="${escape(assets.coverImage.url)}" alt="Cover" loading="lazy" />
          <div class="fg-cover-meta">Cover ${assets.coverImage.width}×${assets.coverImage.height} · ${escape(assets.coverImage.provider)}</div>
        </div>`
          : ''
      }

      ${
        isCarousel
          ? `
        <div class="fg-slides">
          ${c.slides
            .map(
              (s) => `
            <div class="fg-slide">
              <div class="fg-slide-num">Slide ${s.n}</div>
              <div class="fg-slide-headline">${escape(s.headline || '')}</div>
              ${s.body ? `<div class="fg-slide-body">${escape(s.body)}</div>` : ''}
              ${s.imagePrompt ? `<div class="fg-slide-prompt"><strong>Image prompt:</strong> ${escape(s.imagePrompt)}</div>` : ''}
            </div>`,
            )
            .join('')}
        </div>`
          : ''
      }

      ${
        isReel
          ? `
        <div class="fg-beats">
          ${c.beats
            .map(
              (b) => `
            <div class="fg-beat">
              <div class="fg-beat-time">${escape(b.sec)}s</div>
              <div class="fg-beat-body">
                <div class="fg-beat-visual">🎬 ${escape(b.visual || '')}</div>
                ${b.text ? `<div class="fg-beat-text">📝 ${escape(b.text)}</div>` : ''}
                ${b.voiceover ? `<div class="fg-beat-vo">🎤 "${escape(b.voiceover)}"</div>` : ''}
              </div>
            </div>`,
            )
            .join('')}
        </div>
        ${c.suggestedAudio ? `<div class="fg-audio-hint">🎵 Audio: ${escape(c.suggestedAudio)}</div>` : ''}`
          : ''
      }

      ${
        isStory
          ? `
        <div class="fg-frames">
          ${c.frames
            .map(
              (f, i) => `
            <div class="fg-frame">
              ${assets?.frameImages?.[i] ? `<img src="${escape(assets.frameImages[i].url)}" alt="Frame ${f.n}" loading="lazy" />` : ''}
              <div class="fg-frame-body">
                <div class="fg-frame-num">Frame ${f.n} · ${escape(f.stickerType || 'none')}</div>
                <div class="fg-frame-text">${escape(f.overlayText || '')}</div>
              </div>
            </div>`,
            )
            .join('')}
        </div>`
          : ''
      }

      ${
        c.caption
          ? `
        <div class="fg-caption">
          <div class="fg-caption-head">
            <strong>📝 Caption</strong>
            <button class="fg-tiny-btn" data-copy="${encodeURIComponent(c.caption)}">Copiar</button>
          </div>
          <pre>${escape(c.caption)}</pre>
        </div>`
          : ''
      }

      ${
        (c.hashtags || []).length
          ? `
        <div class="fg-hashtags">
          <strong>#️⃣ Hashtags (${c.hashtags.length})</strong>
          <div class="fg-tag-list">
            ${c.hashtags.map((t) => `<span class="fg-tag">${escape(t)}</span>`).join('')}
          </div>
          <button class="fg-tiny-btn" data-copy="${encodeURIComponent((c.hashtags || []).join(' '))}">Copiar todos</button>
        </div>`
          : ''
      }

      <div class="fg-final-actions">
        <button class="fg-btn fg-btn-secondary" id="fg-regenerate">🔄 Regenerar</button>
        <button class="fg-btn fg-btn-primary" id="fg-publish">📤 Enviar a publicar</button>
      </div>
    </div>`;
};

const wireForm = (root) => {
  const get = (id) => root.querySelector(`#${id}`);

  const collectInputs = () => ({
    topic: get('fg-topic')?.value.trim() || 'tu producto',
    platform: get('fg-platform')?.value || 'instagram',
    format: get('fg-format')?.value || 'reel',
    goal: get('fg-goal')?.value || 'engagement',
    brandNiche: get('fg-niche')?.value.trim() || '',
    brandVoice: get('fg-voice')?.value || 'cercano',
    competitorAngles: (get('fg-competitors')?.value || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  });

  const setLoading = (label) => {
    const out = root.querySelector('#fg-output');
    if (out) out.innerHTML = `<div class="fg-loading"><div class="fg-spin"></div><div>${escape(label)}</div></div>`;
  };

  const renderOutput = (result) => {
    const out = root.querySelector('#fg-output');
    if (!out) return;
    out.innerHTML = [
      renderStrategy(result.strategy),
      renderContent(result.content, result.assets, result.meta),
      renderPrediction(result.prediction),
    ].join('');
    wireOutput(root);
  };

  get('fg-strategy-only')?.addEventListener('click', async () => {
    setLoading('Pensando estrategia (sin gastar tokens)...');
    const { data, error } = await apiSafe('/api/strategy/plan', null, { method: 'POST', body: collectInputs() });
    if (error || !data) {
      toast('No se pudo generar estrategia', 'err');
      return;
    }
    const out = root.querySelector('#fg-output');
    out.innerHTML = renderStrategy(data);
    toast('Estrategia generada (gratis)', 'ok');
  });

  get('fg-forge-go')?.addEventListener('click', async () => {
    const inputs = collectInputs();
    if (!inputs.topic || inputs.topic === 'tu producto') {
      toast('Decile sobre qué crear contenido', 'warn');
      get('fg-topic')?.focus();
      return;
    }
    setLoading('Forge en proceso · strategy → produce → predict (10-30s)...');
    try {
      const r = await fetch('/api/forge/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(inputs),
      });
      const data = await r.json();
      if (r.status === 402) {
        toast(data.reason || 'Límite alcanzado', 'warn');
        window.dispatchEvent(new CustomEvent('feedia:quotaExceeded', { detail: data }));
        const out = root.querySelector('#fg-output');
        out.innerHTML = `<div class="fg-card" style="text-align:center;padding:40px;"><h3>🔒 Llegaste al límite</h3><p>${escape(data.reason)}</p><a href="/pricing.html" class="fg-btn fg-btn-primary" style="display:inline-block;margin-top:14px;text-decoration:none;">Ver planes →</a></div>`;
        return;
      }
      if (!r.ok) {
        toast(data.message || 'Error al forge', 'err');
        return;
      }
      lastResult = data;
      renderOutput(data);
      toast(`Score viral: ${data.prediction?.viralScore || 0}/100`, data.prediction?.viralScore >= 70 ? 'ok' : 'info');
    } catch (err) {
      toast('Error de red', 'err');
    }
  });
};

const wireOutput = (root) => {
  root.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = decodeURIComponent(btn.dataset.copy || '');
      try {
        navigator.clipboard.writeText(text);
        toast('Copiado', 'ok');
      } catch {
        toast('No se pudo copiar', 'err');
      }
    });
  });
  root.querySelector('#fg-regenerate')?.addEventListener('click', () => {
    root.querySelector('#fg-forge-go')?.click();
  });
  root.querySelector('#fg-publish')?.addEventListener('click', () => {
    if (!lastResult) return;
    try {
      localStorage.setItem('feedia.forge.lastDraft', JSON.stringify(lastResult));
      toast('Borrador guardado. Abriendo Studio…', 'ok');
      setTimeout(() => {
        window.location.hash = '#studio-carousel';
      }, 500);
    } catch {
      toast('No se pudo guardar', 'err');
    }
  });
};

export const renderForge = async (root) => {
  const platform = getActivePlatform();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">✨ Forge IA</h1>
        <p class="view-subtitle page-subtitle">Estrategia → producción → predicción viral · Para Instagram + TikTok</p>
      </div>
    </header>
    <div class="page-body">
      ${buildForm(platform)}
      <div id="fg-output"></div>
    </div>
    <style>
      .fg-card{background:var(--bg-card,#fff);border:1px solid var(--border);border-radius:16px;padding:22px;margin-bottom:16px;color:var(--text-primary,var(--fg));box-shadow:var(--shadow-card,0 1px 4px rgba(0,0,0,.05));}
      .fg-section-title{font-size:18px;letter-spacing:-0.015em;margin:0 0 4px;}
      .fg-section-sub{font-size:13px;color:var(--text-tertiary,var(--text-muted,#888));margin:0 0 16px;}
      .fg-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
      .fg-field-wide{grid-column:1 / -1;}
      .fg-field{display:flex;flex-direction:column;gap:5px;}
      .fg-label{font-size:12px;font-weight:600;color:var(--text-secondary,#666);}
      .fg-input{padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border-soft,rgba(17,18,22,.08));border-radius:9px;color:var(--text-primary,var(--fg));font-size:14px;font-family:inherit;outline:none;transition:border-color .15s,background .15s;}
      .fg-input:focus{background:var(--bg-card,#fff);border-color:rgba(225,48,108,.45);box-shadow:0 0 0 3px rgba(225,48,108,.08);}
      .fg-actions{display:flex;gap:10px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap;}
      .fg-btn{padding:11px 18px;border-radius:10px;border:0;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:8px;transition:filter .15s,transform .12s;}
      .fg-btn-primary{background:linear-gradient(135deg,#f09433,#e1306c 40%,#a855f7);color:#fff;}
      .fg-btn-primary:hover{filter:brightness(1.08);} .fg-btn-primary:active{transform:scale(.985);}
      .fg-btn-secondary{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));border:1px solid var(--border-soft);}
      .fg-btn-secondary:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .fg-btn-icon{font-size:16px;}
      .fg-disclaimer{font-size:11.5px;color:var(--text-tertiary);text-align:center;margin-top:10px;}
      .fg-disclaimer a{color:#a855f7;text-decoration:none;font-weight:700;}

      .fg-loading{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px;color:var(--text-secondary);}
      .fg-spin{width:36px;height:36px;border:3px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:fgSpin .9s linear infinite;}
      @keyframes fgSpin{to{transform:rotate(360deg);}}

      .fg-strategy-head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:16px;}
      .fg-score-circle{flex-shrink:0;width:72px;height:72px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;}
      .fg-score-val{font-size:22px;font-weight:800;line-height:1;}
      .fg-score-lbl{font-size:9px;opacity:.85;letter-spacing:.05em;text-transform:uppercase;}
      .fg-strategy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:18px;}
      .fg-strategy-block{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-strategy-block strong{font-size:11.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;}
      .fg-strategy-val{font-size:15px;font-weight:700;margin:4px 0 2px;}
      .fg-tiny-muted{font-size:11px;color:var(--text-tertiary);}
      .fg-muted{color:var(--text-tertiary);font-weight:500;}

      .fg-hooks{margin-top:14px;}
      .fg-hook-list{display:flex;flex-direction:column;gap:8px;margin-top:8px;}
      .fg-hook{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;border-left:3px solid var(--border);position:relative;}
      .fg-hook.best{border-left-color:#a855f7;background:linear-gradient(90deg,rgba(168,85,247,.08),transparent);}
      .fg-hook-head{display:flex;justify-content:space-between;font-size:11px;margin-bottom:4px;}
      .fg-hook-formula{color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;font-weight:700;}
      .fg-hook-strength{font-weight:700;}
      .fg-hook-text{font-size:14px;line-height:1.4;}
      .fg-hook-badge{position:absolute;top:8px;right:10px;font-size:9px;font-weight:800;background:#a855f7;color:#fff;padding:2px 6px;border-radius:4px;letter-spacing:.05em;}

      .fg-checklist{margin-top:14px;font-size:13px;}
      .fg-checklist ul{margin:6px 0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px;}
      .fg-checklist li{line-height:1.5;}

      .fg-flags{margin-top:14px;}
      .fg-flag{font-size:12.5px;padding:8px 12px;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:8px;margin-top:6px;color:#dc2626;}
      [data-theme="dark"] .fg-flag{color:#fca5a5;}

      .fg-viral-hero{display:flex;align-items:center;gap:16px;padding:18px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:12px;margin-bottom:16px;}
      .fg-viral-score{width:80px;height:80px;border-radius:50%;border:4px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0;}
      .fg-viral-num{font-size:30px;font-weight:800;line-height:1;}
      .fg-viral-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.05em;opacity:.7;}
      .fg-viral-class{display:inline-block;padding:5px 12px;border-radius:999px;font-size:12px;font-weight:800;margin-bottom:4px;}

      .fg-pred-metrics{display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:8px;margin-bottom:18px;}
      .fg-pred-metric{padding:10px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;text-align:center;}
      .fg-pred-num{font-size:20px;font-weight:800;letter-spacing:-0.01em;}
      .fg-pred-lbl{font-size:10.5px;color:var(--text-tertiary);margin-top:2px;}

      .fg-breakdown{margin-bottom:14px;}
      .fg-breakdown-grid{display:flex;flex-direction:column;gap:6px;margin-top:8px;}
      .fg-break-row{display:grid;grid-template-columns:130px 1fr 40px;gap:10px;align-items:center;font-size:12.5px;}
      .fg-break-bar{height:5px;background:var(--border);border-radius:99px;overflow:hidden;}
      .fg-break-fill{height:100%;transition:width .5s ease;}
      .fg-break-score{text-align:right;font-weight:700;}

      .fg-improvements{margin-top:14px;font-size:13px;}
      .fg-improvements ul{margin:6px 0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px;}

      .fg-cover{margin-bottom:14px;}
      .fg-cover img{width:100%;max-width:520px;border-radius:12px;display:block;}
      .fg-cover-meta{font-size:11px;color:var(--text-tertiary);margin-top:6px;}

      .fg-slides,.fg-beats,.fg-frames{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
      .fg-slide,.fg-beat,.fg-frame{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-slide-num,.fg-beat-time,.fg-frame-num{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
      .fg-slide-headline{font-size:15px;font-weight:700;margin-bottom:4px;}
      .fg-slide-body{font-size:13px;line-height:1.45;color:var(--text-secondary);}
      .fg-slide-prompt{font-size:11px;color:var(--text-tertiary);margin-top:6px;padding:6px 8px;background:rgba(168,85,247,.06);border-radius:6px;}
      .fg-beat{display:flex;gap:14px;align-items:flex-start;}
      .fg-beat-time{flex-shrink:0;min-width:50px;}
      .fg-beat-body{flex:1;display:flex;flex-direction:column;gap:4px;font-size:13px;}
      .fg-frame{display:flex;gap:12px;align-items:flex-start;}
      .fg-frame img{width:80px;height:142px;object-fit:cover;border-radius:8px;flex-shrink:0;}
      .fg-frame-text{font-size:13px;line-height:1.4;}
      .fg-audio-hint{font-size:12.5px;padding:8px 12px;background:rgba(34,211,238,.08);border-radius:8px;color:var(--text-secondary);}

      .fg-caption{margin-bottom:14px;}
      .fg-caption-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
      .fg-caption pre{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}
      .fg-tiny-btn{padding:4px 10px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:6px;cursor:pointer;}
      .fg-tiny-btn:hover{background:var(--bg-soft);color:var(--text-primary);}

      .fg-hashtags{margin-bottom:14px;}
      .fg-hashtags strong{display:block;margin-bottom:6px;}
      .fg-tag-list{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}
      .fg-tag{padding:3px 9px;background:rgba(168,85,247,.10);color:#a855f7;font-size:12px;font-weight:600;border-radius:999px;}

      .fg-final-actions{display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--border-soft);padding-top:14px;margin-top:14px;flex-wrap:wrap;}

      @media (max-width: 640px){
        .fg-form-grid{grid-template-columns:1fr;}
        .fg-break-row{grid-template-columns:90px 1fr 35px;}
      }
    </style>`;

  wireForm(root);

  const platformSelect = root.querySelector('#fg-platform');
  window.addEventListener('feedia:platform', (e) => {
    if (platformSelect) platformSelect.value = e.detail?.platform === 'tiktok' ? 'tiktok' : 'instagram';
  });
};
