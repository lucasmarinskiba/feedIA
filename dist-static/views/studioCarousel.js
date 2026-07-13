import { api, apiSafe } from '../lib/api.js';
import { escape, openExternal } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { launchCanvaBrain } from '../lib/canvaBrain.js';

const ROLE_COLORS = {
  gancho: 'accent',
  tension: 'warn',
  desarrollo: 'info',
  climax: 'crit',
  resolucion: 'ok',
  cta: 'accent',
};

let state = { carrusel: null, previews: [], currentSlide: 0, brand: null };

const renderForm = () => `
  <div class="studio-form">
    <h3>Generar carrusel</h3>
    <div class="field">
      <label class="field-label">Idea</label>
      <textarea class="field-textarea" id="idea" placeholder="ej: 5 errores al automatizar con IA"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Longitud</label>
      <select class="field-select" id="longitud">
        <option value="corto">Corto (5-6 slides)</option>
        <option value="medio" selected>Medio (7-8 slides)</option>
        <option value="largo">Largo (9-10 slides)</option>
      </select>
    </div>
    <div class="field">
      <label class="field-label" style="display:flex;align-items:center;gap:6px;">
        🎯 Indicaciones extra para la IA
        <span class="tag tiny" id="brand-hint-pill" style="display:none;background:rgba(168,85,247,.15);color:#a855f7;border:1px solid rgba(168,85,247,.3);">marca detectada</span>
      </label>
      <textarea class="field-textarea" id="indicaciones" rows="2"
        placeholder="Ej: enfocate en el ángulo de autoridad, usá ejemplos concretos, no usar la palabra 'increíble'…"
        style="font-size:12px;"></textarea>
      <div class="small muted" id="brand-hint-text" style="margin-top:4px;display:none;"></div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="generate">⚡ Generar</button>
      <button class="btn ghost" id="canva-render" disabled>🎨 Render Canva (API)</button>
      <button class="btn ghost" id="canva-live" disabled title="Mirá cómo el agente abre Canva y arma el carrusel en vivo">🖥️ Crear en vivo en Canva (mirar)</button>
    </div>
    <button class="btn accent" id="master-brain" style="margin-top:10px;width:100%;padding:14px;font-weight:600;background:linear-gradient(135deg,#7928ca,#e1306c);color:#fff;border:0;border-radius:10px;cursor:pointer;white-space:normal;display:flex;flex-direction:column;align-items:center;gap:4px;line-height:1.35;">
      <span>🧠 Activar Cerebro Maestro</span>
      <span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain + Anti-genérico — todo unido</span>
    </button>
    <button class="canva-cta-btn" id="canva-open" style="margin-top:8px;">
      <span class="canva-cta-emoji">🎨</span>
      <span class="canva-cta-body">
        <span class="canva-cta-title">Diseñar en Canva ahora</span>
        <span class="canva-cta-sub">Si no hay API key, Nova lo abre con el cursor (CUA)</span>
      </span>
      <span class="canva-cta-arrow">→</span>
    </button>
    <div class="divider"></div>
    <div class="small muted">Preview SVG local con voz de marca. <strong>Render Canva (API)</strong> requiere Canva Connect API. <strong>Diseñar en Canva</strong> prioriza CUA si no hay API.</div>
  </div>`;

const renderPreview = () => {
  if (!state.carrusel) {
    return `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:540px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">◐</div>
        <div class="muted">Escribí una idea y dale "Generar" para ver el carrusel acá.</div>
      </div>`;
  }
  const slide = state.carrusel.slides[state.currentSlide];
  const preview = state.previews[state.currentSlide] ?? { dataUrl: '' };
  const dotsHtml = state.previews
    .map((_, i) => `<span class="carousel-dot ${i === state.currentSlide ? 'active' : ''}" data-i="${i}"></span>`)
    .join('');
  const thumbsHtml = state.previews
    .map(
      (p, i) =>
        `<div class="carousel-thumb ${i === state.currentSlide ? 'active' : ''}" data-i="${i}"><img src="${p?.dataUrl || ''}" alt="slide ${i + 1}"/></div>`,
    )
    .join('');
  const brandLetter = (state.brand?.name ?? '?').charAt(0).toUpperCase();
  return `
    <div>
      <div class="phone-frame">
        <div class="phone-screen aspect-4-5">
          <div class="phone-topbar">
            <div class="phone-avatar"><div>${escape(brandLetter)}</div></div>
            <div class="phone-handle">${escape(state.brand?.name ?? 'marca')}</div>
          </div>
          <img src="${preview.dataUrl}" alt="slide ${state.currentSlide + 1}"/>
        </div>
      </div>
      <div class="carousel-dots">${dotsHtml}</div>
      <div class="carousel-thumbs">${thumbsHtml}</div>

      <div class="card" style="margin-top:24px;">
        <div class="meta">
          <span class="tag ${ROLE_COLORS[slide.rolEnNarrativa] ?? 'info'}">${escape(slide.rolEnNarrativa)}</span>
          <span class="tag">slide ${slide.numero}/${state.carrusel.slides.length}</span>
        </div>
        <h3>${escape(slide.titulo)}</h3>
        <div class="body">${escape(slide.cuerpo)}</div>
        <div class="tiny muted">${escape(slide.direccionVisual)}</div>
      </div>

      <div class="card" style="margin-top:14px;">
        <h3>Caption</h3>
        <div class="body" style="white-space:pre-wrap;">${escape(state.carrusel.caption)}</div>
        <div class="meta">${state.carrusel.hashtags.map((h) => `<span class="tag info">${escape(h)}</span>`).join('')}</div>
        <div class="divider"></div>
        <div class="tiny muted">CTA: ${escape(state.carrusel.cta)}</div>
        <div class="tiny muted">Formato óptimo: ${escape(state.carrusel.formatoOptimo)}</div>
      </div>
    </div>`;
};

const wireUp = (root) => {
  const form = root.querySelector('.studio-form');
  const preview = root.querySelector('.studio-preview');

  form.querySelector('#generate').addEventListener('click', async () => {
    const idea = form.querySelector('#idea').value.trim();
    const longitud = form.querySelector('#longitud').value;
    const indicaciones = form.querySelector('#indicaciones')?.value?.trim() || undefined;
    if (!idea) {
      toast('Escribí una idea primero', 'crit');
      return;
    }
    const btn = form.querySelector('#generate');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> generando…';
    try {
      const result = await api('/api/studio/carrusel', {
        body: { idea, longitud, extraInstructions: indicaciones },
      });
      const carruselData = result.carrusel || result;
      if (!carruselData?.slides?.length) {
        toast('No se pudo generar el carrusel — configurá una API key en Ajustes para generación real', 'crit');
        return;
      }
      state.carrusel = carruselData;
      state.previews = result.previews || [];
      state.currentSlide = 0;
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
      form.querySelector('#canva-render').disabled = false;
      form.querySelector('#canva-live').disabled = false;
      toast(`Carrusel generado con ${carruselData.slides.length} slides`, 'ok');

      // ── Caption variants + hashtag strategy en paralelo ──────────────────
      void generateCaptionAndHashtagPanel(root, idea, result.carrusel);
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '⚡ Generar';
    }
  });

  // 🧠 Master Brain — orquestador unificado
  form.querySelector('#master-brain')?.addEventListener('click', async () => {
    const idea = form.querySelector('#idea').value.trim();
    if (!idea) {
      toast('Escribí una idea primero', 'crit');
      return;
    }
    const btn = form.querySelector('#master-brain');
    btn.disabled = true;
    btn.innerHTML = '🧠 Cerebros trabajando...';
    try {
      const r = await api('/api/cu/master', {
        body: {
          userInput: idea,
          intent: 'create-content',
          mode: 'supervisor',
          contentFormat: 'carousel',
          topic: idea,
        },
      });
      const recsHtml = (r.recommendations ?? [])
        .map(
          (rec) =>
            `<div style="background:#1a1a1a;border-left:3px solid ${rec.type === 'warning' ? '#ef4444' : rec.type === 'innovation' ? '#a855f7' : rec.type === 'opportunity' ? '#22d3ee' : '#10b981'};padding:10px;margin:6px 0;border-radius:6px;">
          <div style="font-weight:600;font-size:13px;">${escape(rec.title)}</div>
          <div style="font-size:11px;opacity:0.7;margin-top:4px;">${escape(rec.rationale)}</div>
        </div>`,
        )
        .join('');
      const stepsHtml = (r.steps ?? [])
        .map(
          (s) =>
            `<div style="display:flex;gap:8px;padding:8px;border-bottom:1px solid #222;">
          <span style="font-size:18px;">${s.emoji}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:600;font-size:12px;">${escape(s.brainLabel)} · ${escape(s.phase)}</div>
            <div style="font-size:11px;opacity:0.7;">${escape(s.output)}</div>
          </div>
        </div>`,
        )
        .join('');
      const briefHtml = r.brief
        ? `
        <details style="margin-bottom:16px;" open>
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">📄 Brief generado</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;margin-top:8px;white-space:pre-wrap;">${escape(r.brief)}</div>
        </details>`
        : '';
      const copyHtml =
        r.copywriting?.headline || r.copywriting?.subheadline
          ? `
        <details style="margin-bottom:16px;" open>
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">✍️ Copywriting</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;margin-top:8px;">
            ${r.copywriting?.headline ? `<div style="font-size:16px;font-weight:700;margin-bottom:6px;">${escape(r.copywriting.headline)}</div>` : ''}
            ${r.copywriting?.subheadline ? `<div style="font-size:13px;opacity:0.8;">${escape(r.copywriting.subheadline)}</div>` : ''}
          </div>
        </details>`
          : '';
      const templateHtml = r.visualPlan?.templateHint
        ? `
        <details style="margin-bottom:16px;">
          <summary style="cursor:pointer;font-weight:600;padding:8px 0;">🎨 Plan visual</summary>
          <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;margin-top:8px;">${escape(r.visualPlan.templateHint)}</div>
        </details>`
        : '';
      const approvalBtns = r.approvalRequired
        ? `
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;">
          <button style="flex:1;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:600;" id="mb-approve">✅ Aprobar y ejecutar en Canva</button>
          <button style="flex:1;background:#1a1a1a;color:#fff;border:1px solid #333;padding:10px 16px;border-radius:8px;cursor:pointer;" id="mb-changes">✏️ Pedir cambios</button>
          <button style="background:#1a1a1a;color:#ef4444;border:1px solid #ef4444;padding:10px 16px;border-radius:8px;cursor:pointer;" id="mb-reject">❌ Rechazar</button>
        </div>`
        : '';
      const html = `
        <div style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:9999;overflow:auto;padding:20px;" id="master-brain-modal">
          <div style="max-width:720px;margin:30px auto;background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h2 style="margin:0;background:linear-gradient(135deg,#7928ca,#e1306c);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">🧠 Cerebro Maestro</h2>
              <button style="background:#222;color:#fff;border:0;padding:6px 12px;border-radius:6px;cursor:pointer;" id="mb-close">✕</button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#a855f7;">${r.innovationScore}</div><div style="font-size:11px;opacity:0.7;">Innovación</div></div>
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#22d3ee;">${r.influencerScore}</div><div style="font-size:11px;opacity:0.7;">Influencer</div></div>
              <div style="background:#1a1a1a;padding:12px;border-radius:8px;text-align:center;"><div style="font-size:24px;font-weight:700;color:#10b981;">${r.brandCoherenceScore}</div><div style="font-size:11px;opacity:0.7;">Coherencia</div></div>
            </div>
            <div style="font-size:12px;opacity:0.7;margin-bottom:8px;">${(r.brainsActivated ?? []).length} cerebros activados · ${(r.steps ?? []).length} pasos</div>
            ${briefHtml}
            ${copyHtml}
            ${templateHtml}
            <details style="margin-bottom:16px;" open><summary style="cursor:pointer;font-weight:600;padding:8px 0;">📋 Pasos ejecutados</summary>${stepsHtml}</details>
            <details style="margin-bottom:16px;" open><summary style="cursor:pointer;font-weight:600;padding:8px 0;">💡 Recomendaciones (${(r.recommendations ?? []).length})</summary>${recsHtml}</details>
            <div style="background:#1a1a1a;padding:12px;border-radius:8px;font-size:12px;">${escape(r.finalOutput?.summary ?? '')}</div>
            ${approvalBtns}
          </div>
        </div>`;
      document.body.insertAdjacentHTML('beforeend', html);
      document
        .getElementById('mb-close')
        ?.addEventListener('click', () => document.getElementById('master-brain-modal')?.remove());
      document.getElementById('mb-approve')?.addEventListener('click', async () => {
        const jobId = r.jobId;
        if (!jobId) {
          toast('Sin jobId para aprobar', 'crit');
          return;
        }
        try {
          await api(`/api/cu/canva/brain/${jobId}/approve`, { method: 'POST', body: {} });
          toast('✅ Aprobado — ejecutando en Canva', 'ok');
          document.getElementById('master-brain-modal')?.remove();
        } catch (err) {
          toast('Error al aprobar: ' + err.message, 'crit');
        }
      });
      document.getElementById('mb-changes')?.addEventListener('click', () => {
        toast('✏️ Enviá tus cambios en el campo de indicaciones', 'ok');
        document.getElementById('master-brain-modal')?.remove();
      });
      document.getElementById('mb-reject')?.addEventListener('click', () => {
        toast('❌ Job rechazado', 'warn');
        document.getElementById('master-brain-modal')?.remove();
      });
      document.getElementById('master-brain-modal')?.addEventListener('click', (ev) => {
        if (ev.target === document.getElementById('master-brain-modal'))
          document.getElementById('master-brain-modal')?.remove();
      });
      document.addEventListener('keydown', function escHandler(ev) {
        if (ev.key === 'Escape') {
          document.getElementById('master-brain-modal')?.remove();
          document.removeEventListener('keydown', escHandler);
        }
      });

      // Persistir score entry en historial (Item 1)
      if (r.scoreEntry) {
        try {
          const scoresHist = JSON.parse(localStorage.getItem('feedia.scores.history') || '[]');
          scoresHist.unshift(r.scoreEntry);
          localStorage.setItem('feedia.scores.history', JSON.stringify(scoresHist.slice(0, 50)));
        } catch {
          /* noop */
        }
      }

      // Persistir brain session en replay log (Item 4)
      try {
        const sessions = JSON.parse(localStorage.getItem('feedia.brain.sessions') || '[]');
        sessions.unshift({
          jobId: r.jobId ?? Date.now().toString(36),
          ts: Date.now(),
          contentFormat: 'carousel',
          steps: r.steps ?? [],
          scores: { innovation: r.innovationScore, influencer: r.influencerScore, coherence: r.brandCoherenceScore },
        });
        localStorage.setItem('feedia.brain.sessions', JSON.stringify(sessions.slice(0, 20)));
      } catch {
        /* noop */
      }

      toast(`🧠 ${(r.brainsActivated ?? []).length} cerebros activados · innovación ${r.innovationScore}/100`, 'ok');
    } catch (err) {
      toast('Master Brain: ' + err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML =
        '<span>🧠 Activar Cerebro Maestro</span><span style="font-weight:400;font-size:12px;opacity:0.9;">Branding Brain + 10 agentes IA + Canva Brain + Anti-genérico — todo unido</span>';
    }
  });

  form.querySelector('#canva-open').addEventListener('click', async () => {
    const idea = form.querySelector('#idea')?.value?.trim() ?? '';
    await launchCanvaBrain({
      topic: idea || state.carrusel?.caption?.slice(0, 80) || 'Carrusel sin tema',
      format: 'carrusel',
      brand: state.brand,
      contentPayload: state.carrusel,
    });
  });

  form.querySelector('#canva-live').addEventListener('click', async () => {
    if (!state.carrusel) return;
    const btn = form.querySelector('#canva-live');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> iniciando…';
    try {
      const slides = state.carrusel.slides.map((s) => ({ titulo: s.titulo, cuerpo: s.cuerpo }));
      const titulo = `Carrusel ${new Date().toISOString().split('T')[0]}`;
      const r = await api('/api/computer/watch-canva', {
        body: { slides, titulo, speed: 1, autoExportar: true },
      });
      if (!r?.sessionId) throw new Error('no llegó sessionId');
      sessionStorage.setItem('fx_cu_session', r.sessionId);
      toast('🖥️ Pasame a Pantalla en vivo: el agente está abriendo Canva…', 'ok');
      location.hash = 'pantalla';
    } catch (err) {
      toast('Error: ' + err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🖥️ Crear en vivo en Canva (mirar)';
    }
  });

  form.querySelector('#canva-render').addEventListener('click', async () => {
    if (!state.carrusel) return;
    const btn = form.querySelector('#canva-render');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> renderizando…';
    try {
      const r = await api('/api/studio/canva/carrusel', {
        body: { carrusel: state.carrusel, titulo: `Carrusel ${new Date().toISOString().split('T')[0]}` },
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
};

// ── Caption variants + hashtag strategy inline panel ─────────────────────────
const generateCaptionAndHashtagPanel = async (root, idea, carrusel) => {
  // Crear o reutilizar el panel lateral de IA
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

  const hook = carrusel?.slides?.[0]?.titulo ?? idea;
  const caption = carrusel?.caption ?? carrusel?.slides?.map((s) => s.cuerpo).join(' ') ?? idea;

  const [variantsRes, hashtagRes] = await Promise.allSettled([
    apiSafe('/api/caption/variants', null, {
      method: 'POST',
      body: { topic: idea, format: 'carrusel', baseCaption: caption },
    }),
    apiSafe('/api/hashtags/strategy', null, { method: 'POST', body: { topic: idea, format: 'carrusel', hook } }),
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
      <div class="cu-variant-card" style="background:#0d0d12;border:1px solid var(--border);border-radius:10px;padding:12px;cursor:pointer;" data-variant-key="${key}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-weight:700;font-size:12px;">${label}</span>
          <button class="btn ghost tiny cu-copy-caption" data-text="${(v.hook ?? '').replace(/"/g, '&quot;')}" style="padding:2px 8px;font-size:10px;">Copiar</button>
        </div>
        <div style="font-size:12px;opacity:0.85;line-height:1.5;max-height:80px;overflow:hidden;">${escape(v.hook ?? '')}</div>
        <div style="font-size:10px;color:var(--text-secondary,#aab);margin-top:4px;">${v.characterCount ?? 0} chars · ${v.readingTimeSeconds ?? 0}s</div>
      </div>`;
        })
        .join('')
    : '<div class="small muted">No se pudieron generar variantes</div>';

  const hashtagHtml = hashtags
    ? `
    <div style="margin-top:12px;">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:var(--text-secondary,#aab);margin-bottom:6px;">#️⃣ ${hashtags.total?.length ?? 0} hashtags · ${hashtags.rationale?.slice(0, 60) ?? ''}</div>
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
      <button class="btn ghost tiny" id="cu-copy-all-hashtags" style="margin-top:8px;" data-tags="${(hashtags.total ?? []).join(' ').replace(/"/g, '&quot;')}">📋 Copiar todos los hashtags</button>
    </div>`
    : '';

  panel.innerHTML = `
    <div style="background:var(--bg-card,#15151b);border:1px solid rgba(168,85,247,.25);border-radius:12px;padding:16px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:12px;">✍️ Variantes de Caption</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;">
        ${variantTabs}
      </div>
      ${hashtagHtml}
    </div>`;

  // Wire copy buttons
  panel.querySelectorAll('.cu-copy-caption').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const text = btn.dataset.text ?? '';
      try {
        await navigator.clipboard.writeText(text);
        toast('📋 Caption copiado', 'ok');
      } catch {
        toast('No se pudo copiar', 'warn');
      }
    });
  });

  panel.querySelector('#cu-copy-all-hashtags')?.addEventListener('click', async (e) => {
    const tags = e.currentTarget.dataset.tags ?? '';
    try {
      await navigator.clipboard.writeText(tags);
      toast('📋 Hashtags copiados', 'ok');
    } catch {
      toast('No se pudo copiar', 'warn');
    }
  });
};

const attachPreviewListeners = (preview) => {
  preview.querySelectorAll('.carousel-dot, .carousel-thumb').forEach((el) =>
    el.addEventListener('click', () => {
      state.currentSlide = Number(el.dataset.i);
      preview.innerHTML = renderPreview();
      attachPreviewListeners(preview);
    }),
  );
};

/**
 * injectBrandHint — Inyecta contexto de marca en el campo "Indicaciones extra".
 * Muestra la pill "marca detectada" y un hint con tono + palabras prohibidas +
 * posicionamiento. Si el campo ya tiene texto del usuario, solo muestra la pill
 * (no sobreescribe). El AI recibe esto como `extraInstructions` en el request.
 */
const injectBrandHint = (root, brand) => {
  const pill = root.querySelector('#brand-hint-pill');
  const hintText = root.querySelector('#brand-hint-text');
  const indicacionesField = root.querySelector('#indicaciones');
  if (!pill || !hintText || !indicacionesField) return;

  pill.style.display = 'inline-flex';

  const tone = Array.isArray(brand?.voice?.tone) ? brand.voice.tone.join(', ') : '';
  const forbidden =
    Array.isArray(brand?.voice?.forbidden) && brand.voice.forbidden.length
      ? `Palabras prohibidas: ${brand.voice.forbidden.join(', ')}.`
      : '';
  const positioning = brand?.brandStrategy?.positioning
    ? `Posicionamiento: ${brand.brandStrategy.positioning.slice(0, 80)}.`
    : '';
  const differentiator = brand?.brandStrategy?.differentiator
    ? `Diferenciador: ${brand.brandStrategy.differentiator.slice(0, 60)}.`
    : '';

  const hints = [tone && `Tono: ${tone}`, forbidden, positioning, differentiator].filter(Boolean);
  if (!hints.length) return;

  const hintStr = hints.join(' ');
  hintText.textContent = `✦ Contexto de marca detectado: ${hintStr}`;
  hintText.style.display = 'block';

  // Solo pre-popula si el campo está vacío (no sobreescribir al usuario)
  if (!indicacionesField.value.trim()) {
    indicacionesField.placeholder = hintStr.length > 120 ? hintStr.slice(0, 120) + '…' : hintStr;
  }
};

export const renderCarouselStudio = async (root) => {
  state = { carrusel: null, previews: [], currentSlide: 0, brand: null };
  try {
    state.brand = await api('/api/brand');
  } catch {
    /* ignore */
  }
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Carrusel Studio</h1>
        <p class="view-subtitle page-subtitle">Generá carruseles con preview real en mockup de teléfono.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout studio-shell">
        ${renderForm()}
        <div class="studio-preview">${renderPreview()}</div>
      </div>
    </div>`;
  wireUp(root);

  // ── Inyectar contexto de marca en el campo Indicaciones ──────────────────
  if (state.brand) {
    injectBrandHint(root, state.brand);
  }

  // Precargar hook si vino del Hook Library
  try {
    const preload = sessionStorage.getItem('feedia.hook.preload');
    if (preload) {
      const input = root.querySelector('#idea');
      if (input) input.value = preload;
      sessionStorage.removeItem('feedia.hook.preload');
      toast('🎣 Hook precargado desde Hook Library', 'ok');
    }
  } catch {
    /* noop */
  }
};
