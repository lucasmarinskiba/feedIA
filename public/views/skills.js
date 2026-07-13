/* ══════════════════════════════════════════════════════════════════════════════
   SKILLS — catálogo de skills FeedIA + Generador real de carrusel (run.py)
   ──────────────────────────────────────────────────────────────────────────────
   Lista todas las skills (.claude/commands/feedIA-*.md) vía /api/skills/list.
   Generador carrusel/story/reel hookeado a /api/skills/carousel/generate (corre
   run.py con FAL_KEY) + camino Canva-CU vía launchCanvaBrain. Tolerante a offline.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { launchCanvaBrain } from '../lib/canvaBrain.js';

// Fallback: si /api/skills/list no responde, lista mínima de las visuales clave.
const FALLBACK_SKILLS = [
  {
    id: 'feedIA-canva',
    title: 'Canva · Generador',
    category: 'Creación visual',
    description: 'Carruseles/stories/reels desde YouTube, artículo, idea, PDF o post IG. IA-render o Canva-CU.',
  },
  {
    id: 'feedIA-canvas-design',
    title: 'Canvas Design',
    category: 'Creación visual',
    description: 'Cerebro de diseño compartido: reglas visuales, hooks, paleta brand-aware.',
  },
  {
    id: 'feedIA-reel-generator',
    title: 'Reel Generator',
    category: 'Creación visual',
    description: 'Reels multi-fuente: guion beat a beat + hook 0.3s + cover.',
  },
  {
    id: 'feedIA-story-generator',
    title: 'Story Generator',
    category: 'Creación visual',
    description: 'Stories 9:16 + stickers interactivos + CTA.',
  },
  {
    id: 'feedIA-cu-brain',
    title: 'Computer Use Brain',
    category: 'Cerebro / Computer Use',
    description: 'CU brain-aware: memoria + safety + RL operando Canva/IG.',
  },
  {
    id: 'feedIA-quick-carousel',
    title: 'Quick Carousel',
    category: 'Creación visual',
    description: 'Carrusel completo desde 1 prompt mínimo.',
  },
];

const CAT_ICON = {
  'Creación visual': '🎨',
  'Cerebro / Computer Use': '🧠',
  'Copy & estrategia': '✍️',
  'Ventas & ads': '💰',
  Comunidad: '❤️',
  Operación: '⚙️',
  General: '⚡',
};

let pollTimer = null;
const stopPoll = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'skills') stopPoll();
});

const renderGenerator = () => `
  <div class="skills-gen">
    <div class="skills-gen-head">
      <div class="skills-gen-emoji">🎨</div>
      <div>
        <h2>Generador de contenido con IA</h2>
        <p class="small muted">Pegá una URL de YouTube/artículo o escribí una idea. FeedIA lo transforma en carrusel listo: estrategia + PNGs 1080×1350, o lo diseña en Canva con Computer Use.</p>
      </div>
    </div>
    <textarea id="sk-input" class="skills-gen-input" rows="2"
      placeholder="Ej: https://youtu.be/... · 'errores al automatizar con IA' · pegá el link del artículo"></textarea>
    <div class="skills-gen-row">
      <select id="sk-format" class="input">
        <option value="carrusel">🃏 Carrusel</option>
        <option value="reel">▶️ Reel</option>
        <option value="historia">◎ Story</option>
      </select>
      <select id="sk-model" class="input">
        <option value="gpt-image-2">gpt-image-2 (calidad)</option>
        <option value="nano-banana-2">nano-banana-2 (rápido)</option>
      </select>
    </div>
    <div class="skills-gen-actions">
      <button class="btn primary" id="sk-generate">⚡ Generar con IA-render</button>
      <button class="btn canva-cta-btn" id="sk-canva">
        <span class="canva-cta-emoji">🎨</span>
        <span class="canva-cta-body">
          <span class="canva-cta-title">Diseñar en Canva (Computer Use)</span>
          <span class="canva-cta-sub">Equipo de especialistas opera Canva</span>
        </span>
        <span class="canva-cta-arrow">→</span>
      </button>
    </div>
    <div id="sk-result" class="skills-gen-result"></div>
  </div>`;

const renderCatalog = (data) => {
  const skills = data?.skills?.length ? data.skills : FALLBACK_SKILLS;
  const cats = data?.categories?.length ? data.categories : [...new Set(skills.map((s) => s.category))];
  return `
    <div class="skills-catalog">
      <div class="skills-cat-head">
        <h3>Catálogo de skills · ${skills.length}</h3>
        <input id="sk-search" class="input" placeholder="Buscar skill…" style="max-width:260px;">
      </div>
      ${cats
        .map(
          (cat) => `
        <div class="skills-cat" data-cat="${escape(cat)}">
          <div class="skills-cat-label">${CAT_ICON[cat] ?? '⚡'} ${escape(cat)}</div>
          <div class="skills-grid">
            ${skills
              .filter((s) => s.category === cat)
              .map(
                (s) => `
              <div class="skills-card" data-skill="${escape(s.id)}" data-name="${escape(s.title.toLowerCase())} ${escape(s.description.toLowerCase())}">
                <div class="skills-card-title">${escape(s.title)}</div>
                <div class="skills-card-desc">${escape((s.description ?? '').slice(0, 160))}</div>
                <code class="skills-card-id">/${escape(s.id)}</code>
              </div>`,
              )
              .join('')}
          </div>
        </div>`,
        )
        .join('')}
    </div>`;
};

export const renderSkills = async (root) => {
  stopPoll();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">⚡ Skills de FeedIA</h1>
        <p class="view-subtitle page-subtitle">Todas las habilidades del sistema. Generá carruseles/reels/stories reales o explorá el catálogo completo.</p>
      </div>
    </header>
    <div class="page-body">
      ${renderGenerator()}
      <div id="sk-catalog">${'<div class="loading-screen"><span class="spinner lg"></span></div>'}</div>
    </div>
    <style>
      /* enterprise look: cards blancas + texto oscuro legible */
      .skills-gen{background:linear-gradient(135deg,#F8FAFF,#FFF);border:1px solid #E3E6EB;border-radius:18px;padding:22px;margin-bottom:22px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .skills-gen-head{display:flex;gap:14px;align-items:flex-start;margin-bottom:14px;}
      .skills-gen-emoji{font-size:36px;line-height:1;}
      .skills-gen-head h2{margin:0 0 4px;font-size:18px;color:#15181E;}
      .skills-gen-head p{color:#475067;}
      .skills-gen-input{width:100%;box-sizing:border-box;background:#fff;border:1px solid #E3E6EB;border-radius:12px;padding:12px 14px;color:#15181E;font-size:14px;resize:vertical;font-family:inherit;}
      .skills-gen-input::placeholder{color:#98A1B3;}
      .skills-gen-input:focus{border-color:#9da9ff;outline:none;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      .skills-gen-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;}
      .skills-gen-row .input{flex:1;min-width:140px;background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:12px;padding:11px 13px;}
      .skills-gen-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;}
      .skills-gen-actions .btn{border-radius:999px !important;font-weight:700;}
      .skills-gen-result{margin-top:14px;}
      .skills-log{background:#0F1115;color:#E8E9EC;border-radius:10px;padding:12px;font-family:ui-monospace,Consolas,monospace;font-size:11.5px;max-height:240px;overflow-y:auto;line-height:1.5;}
      .skills-log-line{color:rgba(255,255,255,.82);padding:1px 0;}
      .skills-slides{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-top:10px;}
      .skills-slides img{width:100%;border-radius:10px;border:1px solid #E6E8EE;}
      .skills-cat-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap;}
      .skills-cat-head h3{margin:0;color:#15181E;}
      .skills-cat-head .input{background:#fff;color:#15181E;border:1px solid #E3E6EB;border-radius:999px;padding:10px 16px;min-width:240px;}
      .skills-cat-head .input::placeholder{color:#98A1B3;}
      .skills-cat{margin-bottom:24px;}
      .skills-cat-label{font-size:12px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.06em;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
      .skills-cat-label::before{content:'';width:24px;height:2px;background:linear-gradient(90deg,#7C3AED,transparent);}
      .skills-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;}
      .skills-card{background:#fff;border:1px solid #E6E8EE;border-radius:14px;padding:16px;transition:border-color .15s,transform .15s,box-shadow .15s;cursor:default;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .skills-card:hover{border-color:#9da9ff;transform:translateY(-2px);box-shadow:0 8px 24px rgba(124,58,237,.12);}
      .skills-card-title{font-weight:800;font-size:14px;margin-bottom:6px;color:#15181E;}
      .skills-card-desc{font-size:12px;color:#475067;line-height:1.5;margin-bottom:10px;}
      .skills-card-id{font-size:10.5px;font-weight:700;color:#7C3AED;background:rgba(124,58,237,.1);padding:3px 9px;border-radius:999px;letter-spacing:.02em;}
      .skills-card.hidden{display:none;}
    </style>`;

  // Catálogo (con fallback)
  const { data } = await apiSafe('/api/skills/list', null);
  root.querySelector('#sk-catalog').innerHTML = renderCatalog(data);

  // Búsqueda en catálogo
  const search = root.querySelector('#sk-search');
  search?.addEventListener('input', () => {
    const q = search.value.toLowerCase().trim();
    root.querySelectorAll('.skills-card').forEach((c) => {
      c.classList.toggle('hidden', q && !c.dataset.name.includes(q));
    });
    root.querySelectorAll('.skills-cat').forEach((cat) => {
      const anyVisible = [...cat.querySelectorAll('.skills-card')].some((c) => !c.classList.contains('hidden'));
      cat.style.display = anyVisible ? '' : 'none';
    });
  });

  // Camino Canva-CU
  root.querySelector('#sk-canva')?.addEventListener('click', async () => {
    const input = root.querySelector('#sk-input').value.trim();
    const format = root.querySelector('#sk-format').value;
    await launchCanvaBrain({ topic: input || 'Contenido sin tema', format });
  });

  // Camino IA-render (run.py)
  root.querySelector('#sk-generate')?.addEventListener('click', async () => {
    const input = root.querySelector('#sk-input').value.trim();
    const model = root.querySelector('#sk-model').value;
    if (!input) {
      toast('Pegá una URL o escribí una idea', 'warn');
      return;
    }
    const resultEl = root.querySelector('#sk-result');
    resultEl.innerHTML = `<div class="card"><div class="row" style="gap:10px;align-items:center;"><span class="spinner"></span><div><strong>Generando…</strong><div class="small muted">FeedIA está analizando la fuente y produciendo el contenido.</div></div></div></div>`;

    const format = root.querySelector('#sk-format').value;
    const { data: r, error } = await apiSafe('/api/skills/carousel/generate', null, {
      method: 'POST',
      body: { input, model, format },
    });
    if (error || !r) {
      resultEl.innerHTML = `<div class="card"><div class="small muted">📡 Backend del generador offline. Usá el camino Canva (Computer Use) o reintentá cuando el server vuelva.</div></div>`;
      return;
    }

    const renderResult = (st) => {
      const slidesHtml = (st.slides ?? []).length
        ? `<div class="skills-slides">${st.slides
            .map((s) => {
              const src = s.url
                ? s.url
                : `/api/skills/carousel/slide/${encodeURIComponent(st.jobId ?? '')}/${encodeURIComponent(s.name ?? s)}`;
              return `<img src="${escape(src)}" alt="slide ${escape(String(s.num ?? ''))}" onerror="this.style.display='none'">`;
            })
            .join('')}</div>`
        : '';
      resultEl.innerHTML = `
        <div class="card">
          <div class="row spread" style="margin-bottom:8px;">
            <strong>${st.status === 'done' ? '✅ Listo' : st.status === 'error' ? '⚠️ Error' : st.status === 'plan-only' ? '📋 Solo estrategia' : '🔄 ' + escape(st.status ?? '')}</strong>
            <span class="small muted">${escape(st.format ?? '')} · ${escape(st.model ?? model)}</span>
          </div>
          ${st.error ? `<div class="small crit" style="margin-bottom:8px;">${escape(st.error)}</div>` : ''}
          ${st.status === 'plan-only' ? `<div class="small muted" style="margin-bottom:8px;">⚠️ Falta <code>FAL_KEY</code> para render real. Estrategia generada (${(st.strategy?.slides ?? []).length} slides). Usá el camino <strong>Canva (Computer Use)</strong> o configurá FAL_KEY.</div>` : ''}
          ${(st.log ?? []).length ? `<div class="skills-log">${st.log.map((l) => `<div class="skills-log-line">${escape(l)}</div>`).join('')}</div>` : ''}
          ${slidesHtml}
          ${st.caption ? `<div style="margin-top:10px;"><div class="small muted">Caption</div><div class="body" style="white-space:pre-wrap;">${escape(st.caption)}</div></div>` : ''}
          ${st.hashtags ? `<div class="small muted" style="margin-top:8px;">${escape(st.hashtags)}</div>` : ''}
        </div>`;
    };

    // Respuesta SÍNCRONA (Vercel): ya trae slides/plan-only/error
    if (r.status) {
      renderResult(r);
      toast(
        r.status === 'done'
          ? '🎉 Imágenes generadas'
          : r.status === 'plan-only'
            ? 'Estrategia lista (sin FAL_KEY)'
            : 'Error en generación',
        r.status === 'error' ? 'warn' : 'ok',
      );
      return;
    }

    // Respuesta ASYNC (backend local con job + poll)
    if (r.jobId) {
      resultEl.innerHTML = `<div class="card"><div class="row" style="gap:10px;align-items:center;"><span class="spinner"></span><div><strong>Generando…</strong></div></div></div>`;
      stopPoll();
      const t0 = Date.now();
      pollTimer = setInterval(async () => {
        if (Date.now() - t0 > 180000) {
          stopPoll();
          toast('Tardó demasiado · revisá logs', 'warn');
          return;
        }
        const { data: st } = await apiSafe(`/api/skills/carousel/status/${r.jobId}`, null);
        if (!st) return;
        st.jobId = r.jobId;
        renderResult(st);
        if (['done', 'error', 'plan-only'].includes(st.status)) {
          stopPoll();
          toast(
            st.status === 'done' ? '🎉 Contenido generado' : st.status === 'plan-only' ? 'Estrategia lista' : 'Error',
            st.status === 'error' ? 'warn' : 'ok',
          );
        }
      }, 2000);
      return;
    }

    resultEl.innerHTML = `<div class="card"><div class="small muted">Respuesta inesperada del generador.</div></div>`;
  });
};
