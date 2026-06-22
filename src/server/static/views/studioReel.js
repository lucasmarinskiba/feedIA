import { api, apiSafe } from '../lib/api.js';
import { escape, openExternal } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { launchCanvaBrain } from '../lib/canvaBrain.js';

let state = { reel: null, previews: [], currentBeat: 0, brand: null };

const DURACIONES = [
  { value: '15', label: '15 s — TikTok hook' },
  { value: '20', label: '20 s — Micro-story' },
  { value: '30', label: '30 s — Estándar' },
  { value: '45', label: '45 s — Tutorial rápido' },
  { value: '60', label: '60 s — Showcase' },
];

const renderForm = () => `
  <div class="studio-form">
    <h3>Generar reel</h3>
    <div class="field">
      <label class="field-label">Tema / Idea</label>
      <textarea class="field-textarea" id="tema" placeholder="ej: cómo triplicar engagement en 7 días"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Duración</label>
      <select class="field-select" id="duracion">
        ${DURACIONES.map((d) => `<option value="${d.value}"${d.value === '30' ? ' selected' : ''}>${d.label}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label class="field-label">Estilo visual</label>
      <select class="field-select" id="estilo">
        <option value="facecam">Facecam talking-head</option>
        <option value="broll" selected>B-roll + texto</option>
        <option value="screencast">Screencast</option>
        <option value="animacion">Animación / motion</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        🎯 Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: énfasis en datos reales, ritmo rápido, no usar música de moda…"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">⚡ Generar</button>
      <button class="btn ghost" id="canva-render" disabled>🎨 Render Canva (API)</button>
      <button class="btn ghost" id="capcut-live" disabled title="Mirá cómo el agente abre CapCut Web y edita el reel en vivo">🖥️ Editar en vivo en CapCut (mirar)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>🧠 Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain — todo unido para tu reel</span>
    </button>
    <button class="canva-cta-btn" id="canva-open" style="margin-top:8px;">
      <span class="canva-cta-emoji">🎨</span>
      <span class="canva-cta-body">
        <span class="canva-cta-title">Diseñar en Canva ahora</span>
        <span class="canva-cta-sub">Sin API, Nova lo abre con el cursor (CUA)</span>
      </span>
      <span class="canva-cta-arrow">→</span>
    </button>
    <div class="divider"></div>
    <div id="beat-nav" style="display:none;">
      <div class="small muted" style="margin-bottom:6px;">Beats</div>
      <div id="beat-pills"></div>
    </div>
    <div class="divider" id="beat-divider" style="display:none;"></div>
    <div class="small muted">El preview SVG se genera localmente. "Render Canva" solicita los archivos finales con autofill.</div>
  </div>`;

const renderBeat = (beat, preview) => {
  if (!beat) return '';
  return `
    <div class="reel-beat-detail card">
      <div class="meta">
        <span class="tag crit">beat ${beat.numero}</span>
        <span class="tag info">${escape(beat.tipo)}</span>
        <span class="tag">${beat.duracionSegundos}s</span>
      </div>
      <div class="reel-frame-wrapper">
        <img src="${preview?.dataUrl || ''}" alt="beat ${beat.numero}" class="reel-frame-img"/>
      </div>
      <div style="margin-top:12px;">
        <div class="small muted" style="margin-bottom:2px;">🎙 Voz en off</div>
        <div class="body">${escape(beat.vozEnOff)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">📺 Texto en pantalla</div>
        <div class="body">${escape(beat.textoEnPantalla)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">🎬 B-roll / Visual</div>
        <div class="body">${escape(beat.bRoll)}</div>
      </div>
      <div style="margin-top:10px;">
        <div class="small muted" style="margin-bottom:2px;">✂️ Transición</div>
        <div class="body">${escape(beat.transicion)}</div>
      </div>
    </div>`;
};

const renderTimeline = () => {
  if (!state.reel) return '';
  return `
    <div class="reel-timeline-wrapper">
      <div class="reel-timeline">
        ${state.reel.beats
          .map(
            (b, i) => `
          <div class="reel-timeline-beat ${i === state.currentBeat ? 'active' : ''}" data-i="${i}">
            <img src="${state.previews[i]?.dataUrl || ''}" alt="beat ${i + 1}"/>
            <div class="reel-timeline-label">${escape(b.tipo)}</div>
            <div class="reel-timeline-time">${b.duracionSegundos}s</div>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
};

const renderPreview = () => {
  if (!state.reel) {
    return `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:560px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">▶</div>
        <div class="muted">Escribí el tema y dale "Generar" para ver el reel acá.</div>
      </div>`;
  }
  const beat = state.reel.beats[state.currentBeat];
  const preview = state.previews?.[state.currentBeat] ?? { dataUrl: '' };
  const brandLetter = (state.brand?.name ?? '?').charAt(0).toUpperCase();

  return `
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-9-16">
          <div class="phone-topbar">
            <div class="phone-avatar"><div>${escape(brandLetter)}</div></div>
            <div class="phone-handle">${escape(state.brand?.name ?? 'marca')}</div>
          </div>
          <img src="${preview.dataUrl}" alt="beat ${state.currentBeat + 1}" style="width:100%;height:100%;object-fit:cover;"/>
          <div class="reel-overlay-badge">${escape(beat.tipo)} · ${beat.duracionSegundos}s</div>
        </div>
      </div>

      ${renderTimeline()}
      ${renderBeat(beat, preview)}

      <div class="card" style="margin-top:14px;">
        <h3>Caption</h3>
        <div class="body" style="white-space:pre-wrap;">${escape(state.reel.caption)}</div>
        <div class="meta">${state.reel.hashtags.map((h) => `<span class="tag info">${escape(h)}</span>`).join('')}</div>
        <div class="divider"></div>
        <div class="tiny muted">🎵 Audio sugerido: ${escape(state.reel.audioSugerido)}</div>
        <div class="tiny muted">🎣 Hook: ${escape(state.reel.hook)}</div>
        <div class="tiny muted">📌 Retención: ${escape(state.reel.estrategiaRetencion)}</div>
      </div>
    </div>`;
};

const attachPreviewListeners = (preview) => {
  preview.querySelectorAll('.reel-timeline-beat').forEach((el) =>
    el.addEventListener('click', () => {
      state.currentBeat = Number(el.dataset.i);
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
    }),
  );
};

const wireUp = (root) => {
  const form = root.querySelector('.studio-form');
  const preview = root.querySelector('.studio-preview');

  form.querySelector('#generate').addEventListener('click', async () => {
    const tema = form.querySelector('#tema').value.trim();
    const duracion = Number(form.querySelector('#duracion').value);
    const estilo = form.querySelector('#estilo').value;
    const indicaciones = form.querySelector('#indicaciones')?.value?.trim() || undefined;
    if (!tema) {
      toast('Escribí un tema primero', 'crit');
      return;
    }
    const btn = form.querySelector('#generate');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> generando…';
    try {
      const result = await api('/api/studio/reel', {
        body: { tema, duracion, estilo, extraInstructions: indicaciones },
      });
      const reelData = result.reel || result;
      const beats = reelData?.beats;
      if (!beats?.length) {
        toast('No se pudo generar el reel — configurá una API key en Ajustes para generación real', 'crit');
        return;
      }
      state.reel = reelData;
      state.previews = result.previews || [];
      state.currentBeat = 0;
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
      form.querySelector('#canva-render').disabled = false;
      form.querySelector('#capcut-live').disabled = false;

      // beat pills
      const nav = form.querySelector('#beat-nav');
      const pills = form.querySelector('#beat-pills');
      nav.style.display = 'block';
      form.querySelector('#beat-divider').style.display = 'block';
      pills.innerHTML = beats
        .map(
          (b, i) =>
            `<button class="btn ghost tiny beat-pill" data-i="${i}">${escape(b.tipo || `beat ${i + 1}`)}</button>`,
        )
        .join('');
      pills.querySelectorAll('.beat-pill').forEach((p) =>
        p.addEventListener('click', () => {
          state.currentBeat = Number(p.dataset.i);
          preview.innerHTML = renderPreview();
          attachPreviewListeners(preview);
        }),
      );

      toast(`Reel generado con ${beats.length} beats`, 'ok');

      // ── Caption variants + hashtag strategy en paralelo ──────────────────
      void generateCaptionAndHashtagPanel(root, tema, result.reel);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '⚡ Generar';
    }
  });

  form.querySelector('#canva-open').addEventListener('click', async () => {
    const tema = form.querySelector('#tema')?.value?.trim() ?? '';
    await launchCanvaBrain({
      topic: tema || state.reel?.hook?.slice(0, 80) || 'Reel sin tema',
      format: 'reel',
      brand: state.brand,
      contentPayload: state.reel,
    });
  });

  // TikTok: launcher de herramientas (CapCut/Canva/editor TikTok vía CU · generadores IA)
  root.querySelectorAll('.ttv-tool').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const tool = btn.dataset.tool;
      const kind = btn.dataset.kind;
      if (kind === 'app') {
        const { error } = await apiSafe('/api/cu/apps/launch', null, { method: 'POST', body: { app: tool } });
        toast(
          error
            ? `📡 CU no disponible (demo). Activá Computer Use para operar ${tool}.`
            : `${tool} abierto · Computer Use operando 🖱️`,
          error ? 'warn' : 'ok',
        );
      } else {
        const url = btn.dataset.url;
        const o = await openExternal(url);
        if (o.shownModal) toast(`🔗 Abrí ${tool} en otra pestaña`, 'info');
        else toast(`${tool} abierto`, 'ok');
      }
    });
  });

  form.querySelector('#capcut-live').addEventListener('click', async () => {
    if (!state.reel) return;
    const btn = form.querySelector('#capcut-live');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> iniciando…';
    try {
      const beats = state.reel.beats.map((b) => ({
        texto: b.textoEnPantalla || b.vozEnOff || '',
        segundos: b.duracionSegundos,
        notaVisual: b.bRoll,
      }));
      const titulo = `Reel ${new Date().toISOString().split('T')[0]}`;
      const r = await api('/api/computer/watch-capcut', {
        body: { beats, titulo, relacion: '9:16', speed: 1, autoExportar: true },
      });
      if (!r?.sessionId) throw new Error('no llegó sessionId');
      sessionStorage.setItem('fx_cu_session', r.sessionId);
      toast('🖥️ Pasame a Pantalla en vivo: el agente está abriendo CapCut…', 'ok');
      location.hash = 'pantalla';
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🖥️ Editar en vivo en CapCut (mirar)';
    }
  });

  form.querySelector('#canva-render').addEventListener('click', async () => {
    if (!state.reel) return;
    const btn = form.querySelector('#canva-render');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> renderizando…';
    try {
      const r = await api('/api/studio/canva/reel', {
        body: { reel: state.reel, titulo: `Reel ${new Date().toISOString().split('T')[0]}` },
      });
      if (r.ok) toast(`Canva ok: ${r.designUrl ?? r.designId ?? 'listo'}`, 'ok');
      else toast(`Canva: ${r.error}`, 'crit');
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🎨 Render Canva';
    }
  });

  // 🧠 Master Brain
  form.querySelector('#master-brain')?.addEventListener('click', async () => {
    const tema = form.querySelector('#tema').value.trim();
    if (!tema) {
      toast('Escribí un tema primero', 'crit');
      return;
    }
    const btn = form.querySelector('#master-brain');
    btn.disabled = true;
    btn.innerHTML = '🧠 Cerebros trabajando...';
    try {
      const r = await apiSafe('/api/cu/master', null, {
        method: 'POST',
        body: { userInput: tema, intent: 'create-content', mode: 'supervisor', contentFormat: 'reel', topic: tema },
      });
      if (r.error) {
        toast('Master Brain: ' + r.error, 'crit');
        return;
      }
      toast(
        `🧠 ${(r.data?.brainsActivated ?? []).length} cerebros · innovación ${r.data?.innovationScore ?? '?'}/100`,
        'ok',
      );
    } catch (err) {
      toast('Master Brain: ' + err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<span>🧠 Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain — todo unido para tu reel</span>';
    }
  });
};

/** Inyecta contexto de marca en el campo Indicaciones del reel studio */
const injectBrandHint = (root, brand) => {
  const pill = root.querySelector('#brand-hint-pill');
  const hintText = root.querySelector('#brand-hint-text');
  const indicacionesField = root.querySelector('#indicaciones');
  if (!pill || !hintText || !indicacionesField) return;
  pill.style.display = 'inline-flex';
  const tone = Array.isArray(brand?.voice?.tone) ? brand.voice.tone.join(', ') : '';
  const forbidden =
    Array.isArray(brand?.voice?.forbidden) && brand.voice.forbidden.length
      ? `Prohibidas: ${brand.voice.forbidden.join(', ')}.`
      : '';
  const positioning = brand?.brandStrategy?.positioning
    ? `Posicionamiento: ${brand.brandStrategy.positioning.slice(0, 80)}.`
    : '';
  const hints = [tone && `Tono: ${tone}`, forbidden, positioning].filter(Boolean);
  if (!hints.length) return;
  const hintStr = hints.join(' ');
  hintText.textContent = `✦ Contexto de marca: ${hintStr}`;
  hintText.style.display = 'block';
  if (!indicacionesField.value.trim())
    indicacionesField.placeholder = hintStr.length > 120 ? hintStr.slice(0, 120) + '…' : hintStr;
};

export const renderTikTokStudio = (root) => renderReelStudio(root, 'tiktok');

export const renderReelStudio = async (root, platformOverride) => {
  let platform = platformOverride || 'instagram';
  try {
    const { getPlatform } = await import('../lib/platform.js');
    platform = platformOverride || getPlatform();
  } catch {
    /* noop */
  }
  const isTT = platform === 'tiktok';
  state = { reel: null, previews: [], currentBeat: 0, brand: null };
  try {
    state.brand = await api('/api/brand');
  } catch {
    /* ignore */
  }
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">${isTT ? '🎵 TikTok Video Studio' : 'Reel Studio'}</h1>
        <p class="view-subtitle page-subtitle">${
          isTT
            ? 'Guion 9:16 nativo TikTok: hook 0-2s, completion rate, lenguaje no verbal, sonido y loop. Algoritmo FYP (interés puro), no followers.'
            : 'Guionizá reels beat a beat con preview en mockup de teléfono. Optimizado para Explore IG.'
        }</p>
      </div>
    </header>
    ${
      isTT
        ? `<div class="card" style="margin-bottom:14px;border-left:3px solid #FE2C55;background:linear-gradient(135deg,rgba(37,244,238,.06),rgba(254,44,85,.06));">
      <div class="small"><strong>Modo TikTok</strong> · hook 0-2s, ritmo nativo, trending sound, loop para rewatch. Guion completo: botón Guion TikTok.</div>
      <div class="ttv-tools">
        <div class="ttv-tools-label">Herramientas (FeedIA las opera vía Computer Use / API):</div>
        <div class="ttv-tools-row">
          <button class="btn ghost tiny ttv-tool" data-tool="capcut" data-kind="app">🎬 CapCut</button>
          <button class="btn ghost tiny ttv-tool" data-tool="canva" data-kind="app">🎨 Canva</button>
          <button class="btn ghost tiny ttv-tool" data-tool="tiktok" data-kind="app">📱 Editor TikTok</button>
          <button class="btn ghost tiny ttv-tool" data-tool="sora" data-kind="gen" data-url="https://sora.com">🎥 Sora</button>
          <button class="btn ghost tiny ttv-tool" data-tool="seedance" data-kind="gen" data-url="https://fal.ai">💃 Seedance</button>
          <button class="btn ghost tiny ttv-tool" data-tool="pika" data-kind="gen" data-url="https://pika.art">✨ Pika</button>
          <button class="btn ghost tiny ttv-tool" data-tool="nano-banana" data-kind="gen" data-url="https://fal.ai">🍌 Nano Banana</button>
        </div>
      </div>
    </div>
    <style>
      .ttv-tools{margin-top:12px;}
      .ttv-tools-label{font-size:11px;font-weight:600;color:var(--text-muted,#9CA3AF);margin-bottom:8px;text-transform:uppercase;letter-spacing:.04em;}
      .ttv-tools-row{display:flex;gap:8px;flex-wrap:wrap;}
      .ttv-tool{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;border:1px solid var(--border) !important;border-radius:999px !important;padding:9px 14px !important;cursor:pointer;transition:transform .15s,border-color .15s,box-shadow .15s,background .15s;}
      .ttv-tool:hover{transform:translateY(-2px);border-color:#FE2C55 !important;box-shadow:0 5px 14px rgba(254,44,85,.2);background:linear-gradient(135deg,rgba(37,244,238,.08),rgba(254,44,85,.08)) !important;}
    </style>`
        : ''
    }
    <div class="page-body">
      <div class="studio-layout studio-shell">
        ${renderForm()}
        <div class="studio-preview">${renderPreview()}</div>
      </div>
    </div>`;
  wireUp(root);
  if (state.brand) injectBrandHint(root, state.brand);
  try {
    const preload = sessionStorage.getItem('feedia.hook.preload');
    if (preload) {
      const input = root.querySelector('#tema');
      if (input) input.value = preload;
      sessionStorage.removeItem('feedia.hook.preload');
      toast('🎣 Hook precargado desde Hook Library', 'ok');
    }
  } catch {
    /* noop */
  }
};

// ── Caption variants + hashtag strategy inline panel ─────────────────────────
const generateCaptionAndHashtagPanel = async (root, tema, reel) => {
  let panel = root.querySelector('#cu-intelligence-panel');
  if (!panel) {
    const preview = root.querySelector('.studio-preview');
    panel = document.createElement('div');
    panel.id = 'cu-intelligence-panel';
    panel.style.cssText = 'margin-top:16px;display:grid;gap:12px;';
    preview?.after(panel);
  }
  panel.innerHTML = `
    <div style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">✍️ Variantes de Caption · #️⃣ Hashtags</div>
      <div class="small muted">Generando con IA…<span class="spinner" style="margin-left:8px;"></span></div>
    </div>`;

  const hook = reel?.beats?.[0]?.texto ?? tema;
  const caption = reel?.beats?.map((b) => b.texto).join(' ') ?? tema;

  const [variantsRes, hashtagRes] = await Promise.allSettled([
    apiSafe('/api/caption/variants', null, {
      method: 'POST',
      body: { topic: tema, format: 'reel', baseCaption: caption },
    }),
    apiSafe('/api/hashtags/strategy', null, { method: 'POST', body: { topic: tema, format: 'reel', hook } }),
  ]);

  const variants = variantsRes.status === 'fulfilled' ? variantsRes.value.data : null;
  const hashtags = hashtagRes.status === 'fulfilled' ? hashtagRes.value.data : null;

  const variantTabs = variants
    ? ['primary', 'casual', 'formal', 'short']
        .map((key) => {
          const v = variants[key];
          if (!v) return '';
          const label = { primary: '🎯 Principal', casual: '😊 Casual', formal: '💼 Formal', short: '⚡ Corta' }[key];
          return `
      <div style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${label}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(v.hook ?? '').replace(/"/g, '&quot;')}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${escape(v.hook ?? '')}</div>
        <div style="font-size:10px;color:var(--text-secondary,#aab);margin-top:4px;">${v.characterCount ?? 0} chars</div>
      </div>`;
        })
        .join('')
    : '<div class="small muted">No se pudieron generar variantes</div>';

  const hashtagHtml = hashtags
    ? `
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#️⃣ ${(hashtags.primarySet?.length ?? 0) + (hashtags.secondarySet?.length ?? 0) + (hashtags.contextualSet?.length ?? 0)} hashtags</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(hashtags.primarySet ?? []).map((h) => `<span style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:2px 8px;font-size:11px;">${escape(h)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(hashtags.secondarySet ?? []).map((h) => `<span style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:2px 7px;font-size:10px;">${escape(h)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${(hashtags.contextualSet ?? [])
          .slice(0, 6)
          .map(
            (h) =>
              `<span style="background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:20px;padding:2px 7px;font-size:10px;color:var(--text-secondary,#aab);">${escape(h)}</span>`,
          )
          .join('')}
      </div>
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${[...(hashtags.primarySet ?? []), ...(hashtags.secondarySet ?? []), ...(hashtags.contextualSet ?? [])].join(' ').replace(/"/g, '&quot;')}">📋 Copiar todos los hashtags</button>
    </div>`
    : '';

  panel.innerHTML = `
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">✍️ Variantes de Caption — Reel</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">${variantTabs}</div>
      ${hashtagHtml}
    </div>`;

  panel.querySelectorAll('.cu-copy-caption').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.text ?? '');
        toast('📋 Caption copiado', 'ok');
      } catch {
        toast('No se pudo copiar', 'warn');
      }
    });
  });

  panel.querySelector('#cu-copy-all-hashtags')?.addEventListener('click', async (e) => {
    try {
      await navigator.clipboard.writeText(e.currentTarget.dataset.tags ?? '');
      toast('📋 Hashtags copiados', 'ok');
    } catch {
      toast('No se pudo copiar', 'warn');
    }
  });
};
