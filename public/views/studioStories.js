import { api, apiSafe } from '../lib/api.js';
import { escape, openExternal } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { launchCanvaBrain } from '../lib/canvaBrain.js';

let state = { stories: null, previews: [], currentFrame: 0, brand: null };

const OBJETIVOS = [
  { value: 'engagement', label: 'Engagement (polls, preguntas)' },
  { value: 'trafico', label: 'Tráfico a link' },
  { value: 'ventas', label: 'Ventas / oferta' },
  { value: 'comunidad', label: 'Comunidad / behind the scenes' },
  { value: 'educacion', label: 'Educación rápida' },
];

const renderForm = () => `
  <div class="studio-form">
    <h3>Generar historias</h3>
    <div class="field">
      <label class="field-label">Mensaje clave</label>
      <textarea class="field-textarea" id="mensaje" placeholder="ej: lanzamiento de mi nuevo curso de IA"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Objetivo</label>
      <select class="field-select" id="objetivo">
        ${OBJETIVOS.map((o) => `<option value="${o.value}">${o.label}</option>`).join('')}
      </select>
    </div>
    <div class="field">
      <label class="field-label">Cantidad de frames</label>
      <select class="field-select" id="frames">
        <option value="3">3 frames</option>
        <option value="5" selected>5 frames</option>
        <option value="7">7 frames</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        🎯 Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: usar stickers interactivos, que el último frame sea solo CTA, tono urgente…"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">⚡ Generar</button>
      <button class="btn ghost" id="canva-render" disabled>🎨 Render Canva (API)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>🧠 Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain — todo unido para tus stories</span>
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
    <div class="small muted">Preview 9:16 en mockup de teléfono. Tocá un frame en la tira inferior para verlo ampliado.</div>
  </div>`;

const renderStoryGrid = () => {
  if (!state.stories) return '';
  return `
    <div class="stories-strip">
      ${state.previews
        .map(
          (p, i) => `
        <div class="story-thumb ${i === state.currentFrame ? 'active' : ''}" data-i="${i}">
          <img src="${p.dataUrl}" alt="frame ${i + 1}"/>
          <div class="story-thumb-num">${i + 1}</div>
          ${i === state.currentFrame ? '<div class="story-thumb-ring"></div>' : ''}
        </div>`,
        )
        .join('')}
    </div>`;
};

const renderFrameDetail = () => {
  if (!state.stories) return '';
  const frame = state.stories.frames[state.currentFrame];
  return `
    <div class="card" style="margin-top:14px;">
      <div class="meta">
        <span class="tag ${frame.tipo === 'cta' ? 'crit' : frame.tipo === 'gancho' ? 'accent' : 'info'}">${escape(frame.tipo)}</span>
        <span class="tag">frame ${frame.numero}/${state.stories.frames.length}</span>
      </div>
      <h3>${escape(frame.textoPrincipal)}</h3>
      <div class="body">${escape(frame.textoSecundario ?? '')}</div>
      ${frame.sticker ? `<div class="small muted" style="margin-top:8px;">🎯 Sticker: ${escape(frame.sticker)}</div>` : ''}
      ${frame.cta ? `<div class="small muted">👆 CTA: ${escape(frame.cta)}</div>` : ''}
      <div class="small muted" style="margin-top:8px;">🎨 Fondo: ${escape(frame.fondoSugerido)}</div>
    </div>`;
};

const renderPreview = () => {
  if (!state.stories) {
    return `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:560px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">◎</div>
        <div class="muted">Escribí el mensaje y dale "Generar" para ver las historias acá.</div>
      </div>`;
  }
  const preview = state.previews[state.currentFrame] ?? { dataUrl: '' };
  const brandLetter = (state.brand?.name ?? '?').charAt(0).toUpperCase();

  return `
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-9-16">
          <div class="story-topbar">
            <div class="story-progress-bar">
              ${state.previews
                .map(
                  (_, i) => `
                <div class="story-seg ${i < state.currentFrame ? 'done' : i === state.currentFrame ? 'active' : ''}"></div>
              `,
                )
                .join('')}
            </div>
            <div class="phone-topbar" style="background:transparent;">
              <div class="phone-avatar story-avatar"><div>${escape(brandLetter)}</div></div>
              <div class="phone-handle" style="color:#fff;">${escape(state.brand?.name ?? 'marca')}</div>
            </div>
          </div>
          <img src="${preview.dataUrl}" alt="frame ${state.currentFrame + 1}" style="width:100%;height:100%;object-fit:cover;"/>
        </div>
      </div>

      ${renderStoryGrid()}
      ${renderFrameDetail()}

      <div class="card" style="margin-top:10px;">
        <h3>Estrategia de la secuencia</h3>
        <div class="body">${escape(state.stories.estrategia)}</div>
        <div class="divider"></div>
        <div class="tiny muted">🔗 Link sugerido: ${escape(state.stories.linkEnBio ?? 'N/A')}</div>
        <div class="tiny muted">🗓 Mejor horario: ${escape(state.stories.horarioSugerido)}</div>
      </div>
    </div>`;
};

const attachPreviewListeners = (preview) => {
  preview.querySelectorAll('.story-thumb').forEach((el) =>
    el.addEventListener('click', () => {
      state.currentFrame = Number(el.dataset.i);
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
    }),
  );
};

const wireUp = (root) => {
  const form = root.querySelector('.studio-form');
  const preview = root.querySelector('.studio-preview');

  form.querySelector('#generate').addEventListener('click', async () => {
    const mensaje = form.querySelector('#mensaje').value.trim();
    const objetivo = form.querySelector('#objetivo').value;
    const cantidadFrames = Number(form.querySelector('#frames').value);
    const indicaciones = form.querySelector('#indicaciones')?.value?.trim() || undefined;
    if (!mensaje) {
      toast('Escribí un mensaje clave primero', 'crit');
      return;
    }
    const btn = form.querySelector('#generate');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> generando…';
    try {
      const result = await api('/api/studio/stories', {
        body: { mensaje, objetivo, cantidadFrames, extraInstructions: indicaciones },
      });
      const storiesData = result.stories || result;
      if (!storiesData?.frames?.length) {
        toast('No se generaron frames', 'crit');
        return;
      }
      state.stories = storiesData;
      state.previews = result.previews || [];
      state.currentFrame = 0;
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
      form.querySelector('#canva-render').disabled = false;
      toast(`${storiesData.frames.length} frames generados`, 'ok');

      // ── Caption variants + hashtag strategy en paralelo ──────────────────
      void generateCaptionAndHashtagPanel(root, mensaje, storiesData);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '⚡ Generar';
    }
  });

  form.querySelector('#canva-open').addEventListener('click', async () => {
    const mensaje = form.querySelector('#mensaje')?.value?.trim() ?? '';
    await launchCanvaBrain({
      topic: mensaje || state.stories?.estrategia?.slice(0, 80) || 'Stories sin tema',
      format: 'historia',
      brand: state.brand,
      contentPayload: state.stories,
    });
  });

  form.querySelector('#canva-render').addEventListener('click', async () => {
    if (!state.stories) return;
    const btn = form.querySelector('#canva-render');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> renderizando…';
    try {
      const r = await api('/api/studio/canva/stories', {
        body: { stories: state.stories, titulo: `Stories ${new Date().toISOString().split('T')[0]}` },
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
    const mensaje = form.querySelector('#mensaje').value.trim();
    if (!mensaje) {
      toast('Escribí un mensaje primero', 'crit');
      return;
    }
    const btn = form.querySelector('#master-brain');
    btn.disabled = true;
    btn.innerHTML = '🧠 Cerebros trabajando...';
    try {
      const { data, error } = await apiSafe('/api/cu/master', null, {
        method: 'POST',
        body: {
          userInput: mensaje,
          intent: 'create-content',
          mode: 'supervisor',
          contentFormat: 'stories',
          topic: mensaje,
        },
      });
      if (error) {
        toast('Master Brain: ' + error, 'crit');
        return;
      }
      toast(
        `🧠 ${(data?.brainsActivated ?? []).length} cerebros · innovación ${data?.innovationScore ?? '?'}/100`,
        'ok',
      );
    } catch (err) {
      toast('Master Brain: ' + err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<span>🧠 Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain — todo unido para tus stories</span>';
    }
  });
};

/** Inyecta contexto de marca en el campo Indicaciones del stories studio */
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

export const renderStoriesStudio = async (root) => {
  state = { stories: null, previews: [], currentFrame: 0, brand: null };
  try {
    state.brand = await api('/api/brand');
  } catch {
    /* ignore */
  }
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Stories Studio</h1>
        <p class="view-subtitle page-subtitle">Secuencias de historias 9:16 con preview real en mockup de teléfono.</p>
      </div>
    </header>
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
      const input = root.querySelector('#mensaje');
      if (input) input.value = preload;
      sessionStorage.removeItem('feedia.hook.preload');
      toast('🎣 Hook precargado desde Hook Library', 'ok');
    }
  } catch {
    /* noop */
  }
};

// ── Caption variants + hashtag strategy inline panel ─────────────────────────
const generateCaptionAndHashtagPanel = async (root, mensaje, stories) => {
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
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">✍️ Caption para la Historia · #️⃣ Hashtags</div>
      <div class="small muted">Generando con IA…<span class="spinner" style="margin-left:8px;"></span></div>
    </div>`;

  const hook = stories?.frames?.[0]?.texto ?? mensaje;
  const caption = stories?.frames?.map((f) => f.texto).join(' ') ?? mensaje;

  const [variantsRes, hashtagRes] = await Promise.allSettled([
    apiSafe('/api/caption/variants', null, {
      method: 'POST',
      body: { topic: mensaje, format: 'historia', baseCaption: caption },
    }),
    apiSafe('/api/hashtags/strategy', null, { method: 'POST', body: { topic: mensaje, format: 'historia', hook } }),
  ]);

  const variants = variantsRes.status === 'fulfilled' ? variantsRes.value.data : null;
  const hashtags = hashtagRes.status === 'fulfilled' ? hashtagRes.value.data : null;

  const variantTabs = variants
    ? ['primary', 'casual', 'short']
        .map((key) => {
          const v = variants[key];
          if (!v) return '';
          const label = { primary: '🎯 Principal', casual: '😊 Casual', short: '⚡ Corta' }[key];
          return `
      <div style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${label}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(v.hook ?? '').replace(/"/g, '&quot;')}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${escape(v.hook ?? '')}</div>
      </div>`;
        })
        .join('')
    : '<div class="small muted">No se pudieron generar variantes</div>';

  const hashtagHtml = hashtags
    ? `
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#️⃣ Hashtags para la historia</div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;">
        ${(hashtags.primarySet ?? []).map((h) => `<span style="background:rgba(168,85,247,.2);border:1px solid rgba(168,85,247,.4);border-radius:20px;padding:2px 8px;font-size:11px;">${escape(h)}</span>`).join('')}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;">
        ${(hashtags.secondarySet ?? []).map((h) => `<span style="background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.3);border-radius:20px;padding:2px 7px;font-size:10px;">${escape(h)}</span>`).join('')}
      </div>
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${[...(hashtags.primarySet ?? []), ...(hashtags.secondarySet ?? [])].join(' ').replace(/"/g, '&quot;')}">📋 Copiar hashtags</button>
    </div>`
    : '';

  panel.innerHTML = `
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">✍️ Caption para la Historia</div>
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
