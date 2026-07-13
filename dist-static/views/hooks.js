/* ══════════════════════════════════════════════════════════════════════════════
   HOOK LIBRARY — Pattern browser + score playground + generator
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

const apiSafeImport = async (path, opts) => {
  const { data } = await apiSafe(path, null, opts);
  return data;
};

/* Genera variantes localmente si backend offline */
const localVariants = (pattern, example) => {
  if (!example) return [];
  // Variantes simples: swap palabras, agregar urgencia, agregar números
  const base = example;
  return [
    base.replace(/^/, '🚨 ').replace(/\./, '. Ya.'),
    base.replace(/\b(el|la|los|las)\b/i, 'tu').replace(/\bnadie\b/i, 'el 90%'),
    base.replace(/(\d+)/, (m) => String(Math.round(Number(m) * 1.7))).replace(/^/, '⚠️ '),
  ].slice(0, 3);
};

const CATEGORY_LABELS = {
  educativo: '📚 Educativo',
  controversial: '🔥 Controversial',
  storytelling: '📖 Storytelling',
  entretenimiento: '😂 Entretenimiento',
  transformacion: '🚀 Transformación',
  lista: '📋 Lista',
  'pregunta-abierta': '❓ Pregunta abierta',
  revelacion: '🔓 Revelación',
  comparacion: '⚖️ Comparación',
  callout: '📢 Callout',
};

let activeTab = 'browser';
let activeCategory = null;
let patternsCache = [];

const getFavs = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem('feedia.hooks.favs') ?? '[]'));
  } catch {
    return new Set();
  }
};
const toggleFav = (id) => {
  const s = getFavs();
  s.has(id) ? s.delete(id) : s.add(id);
  try {
    localStorage.setItem('feedia.hooks.favs', JSON.stringify([...s]));
  } catch {
    /* noop */
  }
  return s.has(id);
};

const renderPatternCard = (p) => {
  const fav = getFavs().has(p.id);
  return `
  <div class="card hook-pattern-card" data-id="${escape(p.id)}" data-example="${escape(p.example)}" data-skel="${escape(p.skeleton)}">
    <div class="meta">
      <span class="tag accent tiny">${escape(p.category)}</span>
      <span class="tag tiny">${escape(p.primaryTrigger)}</span>
      <span class="tag info tiny">score ${p.baselineScore}</span>
      <button class="hook-fav-btn ${fav ? 'on' : ''}" data-fav="${escape(p.id)}" title="${fav ? 'Quitar de favoritos' : 'Guardar como favorito'}">${fav ? '⭐' : '☆'}</button>
    </div>
    <h3 style="margin:6px 0 4px;">${escape(p.name)}</h3>
    <div class="small" style="font-family:'SF Mono','Fira Code',monospace;background:var(--bg-card-2,#1c1c22);padding:8px 10px;border-radius:6px;margin:6px 0;">${escape(p.skeleton)}</div>
    <div class="small muted"><strong>Por qué funciona:</strong> ${escape(p.whyItWorks)}</div>
    <div class="small" style="margin-top:6px;"><strong>Ejemplo:</strong> <em>${escape(p.example)}</em></div>
    <div class="meta" style="margin-top:8px;">
      ${p.bestFormats.map((f) => `<span class="tag tiny">${escape(f)}</span>`).join('')}
    </div>
    <div class="btn-row" style="margin-top:10px;gap:6px;">
      <button class="btn ghost tiny" data-copy="${escape(p.example)}" title="Copiar ejemplo al portapapeles">📋 Copiar</button>
      <button class="btn ghost tiny" data-vary="${escape(p.id)}" title="Generar 3 variantes con IA">🎲 Variar</button>
      <button class="btn primary tiny" data-use="${escape(p.id)}" data-text="${escape(p.example)}" title="Usar en una pieza nueva (carrusel/reel/story)">⚡ Usar</button>
    </div>
  </div>`;
};

const renderBrowser = () => {
  const cats = [...new Set(patternsCache.map((p) => p.category))];
  const favs = getFavs();
  const isFavsView = activeCategory === '__favs';
  const filtered = isFavsView
    ? patternsCache.filter((p) => favs.has(p.id))
    : activeCategory
      ? patternsCache.filter((p) => p.category === activeCategory)
      : patternsCache;
  return `
    <div class="hook-category-filter">
      <button class="tab-btn ${!activeCategory ? 'active' : ''}" data-cat="">Todos (${patternsCache.length})</button>
      <button class="tab-btn ${isFavsView ? 'active' : ''}" data-cat="__favs">⭐ Favoritos (${favs.size})</button>
      ${cats
        .map(
          (c) => `
        <button class="tab-btn ${activeCategory === c ? 'active' : ''}" data-cat="${escape(c)}">
          ${escape(CATEGORY_LABELS[c] ?? c)}
        </button>`,
        )
        .join('')}
    </div>
    ${filtered.length === 0 ? `<div class="card" style="text-align:center;padding:30px;"><div class="muted">${isFavsView ? 'No tenés favoritos todavía. Tocá ☆ en cualquier patrón para guardarlo.' : 'Sin patrones en esta categoría.'}</div></div>` : `<div class="page-grid">${filtered.map(renderPatternCard).join('')}</div>`}`;
};

const renderScoreBreakdown = (s) => {
  const bandClass =
    s.band === 'excelente' ? 'ok' : s.band === 'fuerte' ? 'ok' : s.band === 'aceptable' ? 'info' : 'crit';
  return `
    <div class="card score-result-card">
      <div class="score-result-head">
        <div>
          <div class="score-result-num">${s.total}</div>
          <span class="tag ${bandClass}">${escape(s.band)}</span>
        </div>
        ${
          s.matchedPattern
            ? `
          <div class="score-result-pattern">
            <div class="tiny muted">Patrón detectado</div>
            <div class="small"><strong>${escape(s.matchedPattern.name)}</strong></div>
            <div class="tiny muted">${escape(s.matchedPattern.category)}</div>
          </div>`
            : '<div class="small muted">Sin patrón claro detectado</div>'
        }
      </div>

      <div class="score-signals">
        ${Object.entries(s.signals)
          .map(
            ([k, v]) => `
          <span class="score-signal ${v ? 'on' : 'off'}">${v ? '✓' : '·'} ${escape(k)}</span>
        `,
          )
          .join('')}
      </div>

      ${
        s.penalties.length
          ? `
        <div style="margin-top:12px;">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Penalizaciones</div>
          <ul class="small">${s.penalties.map((p) => `<li>${escape(p)}</li>`).join('')}</ul>
        </div>`
          : ''
      }

      ${
        s.recommendations.length
          ? `
        <div style="margin-top:8px;">
          <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Recomendaciones</div>
          <ul class="small">${s.recommendations.map((r) => `<li>${escape(r)}</li>`).join('')}</ul>
        </div>`
          : ''
      }
    </div>`;
};

const renderScorer = () => `
  <div class="card">
    <h3 style="margin:0 0 8px;">📐 Scorer determinístico</h3>
    <p class="small muted" style="margin:0 0 14px;">Mide la fuerza de tu hook contra los 23 patrones del library. Sub-ms, sin LLM.</p>
    <div class="field">
      <label class="field-label">Hook a evaluar</label>
      <textarea class="field-textarea" id="score-input" rows="3" placeholder="Ej: El 87% de las marcas comete este error en los primeros 90 días"></textarea>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="score-btn">Calcular score</button>
    </div>
    <div id="score-result"></div>
  </div>`;

const renderGenerator = () => `
  <div class="card">
    <h3 style="margin:0 0 8px;">⚡ Generar hooks con patrones probados</h3>
    <p class="small muted" style="margin:0 0 14px;">Elegí 3 patrones óptimos para tu idea, los instancia con voz de marca y los scorea.</p>
    <div class="field">
      <label class="field-label">Idea o tema</label>
      <textarea class="field-textarea" id="gen-input" rows="3" placeholder="Ej: cómo cobrar más sin perder clientes"></textarea>
    </div>
    <div class="field">
      <label class="field-label">Formato (opcional)</label>
      <select class="field-select" id="gen-format">
        <option value="">— cualquiera —</option>
        <option value="reel">Reel</option>
        <option value="carrusel">Carrusel</option>
        <option value="post-imagen">Post imagen</option>
        <option value="historia">Historia</option>
      </select>
    </div>
    <div class="btn-row">
      <button class="btn gradient" id="gen-btn">⚡ Generar 3 hooks</button>
    </div>
    <div id="gen-result"></div>
  </div>`;

/* ── Catálogos curados (deterministas) para Visuales y Títulos ─────────── */
const VISUAL_HOOKS = [
  {
    cat: 'apertura',
    emoji: '👋',
    titulo: 'Mirada directa a cámara',
    desc: 'Plano cerrado, ojos a lente. Conexión humana inmediata (+3-5% retention en los 3s).',
  },
  {
    cat: 'apertura',
    emoji: '✋',
    titulo: 'Pattern interrupt',
    desc: 'Empezá con un gesto inesperado (tapate la boca, gritá bajo, mostrá objeto raro). Rompe el scroll.',
  },
  {
    cat: 'apertura',
    emoji: '🎨',
    titulo: 'Texto BIG en pantalla',
    desc: 'Una sola palabra/frase enorme (PARÁ / NO / OJO) los primeros 1.5s. Funciona sin audio.',
  },
  {
    cat: 'apertura',
    emoji: '🔄',
    titulo: 'Antes/Después en 2s',
    desc: 'Split screen o cut rápido: estado A → estado B. Promesa visual de transformación.',
  },
  {
    cat: 'desarrollo',
    emoji: '📊',
    titulo: 'Gráfico que se dibuja solo',
    desc: 'Una métrica subiendo en vivo (overlay), ancla el "vale la pena seguir mirando".',
  },
  {
    cat: 'desarrollo',
    emoji: '🖍️',
    titulo: 'Anotación a mano alzada',
    desc: 'Subrayados/flechas hechos a mano sobre la imagen. Sensación de demo personal.',
  },
  {
    cat: 'desarrollo',
    emoji: '🎞️',
    titulo: 'Jump cuts cada 1.5s',
    desc: 'Cortes secos sin transición → ritmo. Ideal para listas o consejos rápidos.',
  },
  {
    cat: 'retencion',
    emoji: '🔁',
    titulo: 'Loop perfecto',
    desc: 'Último frame matchea al primero → el viewer no nota el corte y mira 2x.',
  },
  {
    cat: 'retencion',
    emoji: '🤐',
    titulo: 'Reveal pendiente',
    desc: 'Mostrá el resultado tapado/blureado al inicio: "esto es lo que vamos a hacer".',
  },
  {
    cat: 'retencion',
    emoji: '🎯',
    titulo: 'Caption interactivo',
    desc: 'Texto en pantalla que invita a pausar y leer ("pausá si te pasa esto").',
  },
  {
    cat: 'cta',
    emoji: '👇',
    titulo: 'Flecha al swipe-up/comments',
    desc: 'Flecha animada al final apuntando a la siguiente acción esperada.',
  },
  {
    cat: 'cta',
    emoji: '💬',
    titulo: 'Pregunta directa cierre',
    desc: 'Última frame: pregunta concreta para forzar comentario.',
  },
];

const TITLE_HOOKS = [
  {
    cat: 'curiosidad',
    emoji: '❓',
    plantilla: 'Lo que nadie te dice sobre [X]',
    ejemplo: 'Lo que nadie te dice sobre crecer en Instagram en 2026',
  },
  {
    cat: 'curiosidad',
    emoji: '🕵️',
    plantilla: 'El error #1 al [hacer X]',
    ejemplo: 'El error #1 al automatizar tu Instagram (y cómo evitarlo)',
  },
  {
    cat: 'curiosidad',
    emoji: '🎁',
    plantilla: 'Lo que descubrí después de [N] [unidades]',
    ejemplo: 'Lo que descubrí después de 100 carruseles publicados',
  },
  { cat: 'contraste', emoji: '⚖️', plantilla: 'No es [X], es [Y]', ejemplo: 'No es contenido, es distribución' },
  {
    cat: 'contraste',
    emoji: '🔃',
    plantilla: 'Pará de [X]. Empezá a [Y]',
    ejemplo: 'Pará de publicar todos los días. Empezá a iterar.',
  },
  {
    cat: 'contraste',
    emoji: '🪞',
    plantilla: 'Pensás que es [X], en realidad es [Y]',
    ejemplo: 'Pensás que falta talento, en realidad falta sistema',
  },
  {
    cat: 'autoridad',
    emoji: '📚',
    plantilla: '[N] cosas que aprendí [haciendo X]',
    ejemplo: '5 cosas que aprendí gestionando 12 cuentas a la vez',
  },
  {
    cat: 'autoridad',
    emoji: '🧠',
    plantilla: 'Cómo [meta] sin [obstáculo]',
    ejemplo: 'Cómo crecer en IG sin postear todos los días',
  },
  {
    cat: 'autoridad',
    emoji: '⚙️',
    plantilla: 'Mi sistema para [X] en [Y]',
    ejemplo: 'Mi sistema para escribir 30 captions en 1 hora',
  },
  {
    cat: 'urgencia',
    emoji: '⏰',
    plantilla: 'Antes de [hacer X], leé esto',
    ejemplo: 'Antes de invertir en ads, leé esto',
  },
  {
    cat: 'urgencia',
    emoji: '🚨',
    plantilla: '[X] cambió. Esto es lo que tenés que saber',
    ejemplo: 'El algoritmo cambió. Esto es lo que tenés que saber',
  },
  {
    cat: 'social',
    emoji: '👥',
    plantilla: '[N] personas hicieron [X]. Esto fue lo que pasó',
    ejemplo: '50 marcas usaron este formato. Esto fue lo que pasó',
  },
];

const renderVisuals = () => {
  const cats = [...new Set(VISUAL_HOOKS.map((v) => v.cat))];
  return `
    <div class="card">
      <div class="row spread"><b>🎬 Ganchos visuales</b><span class="tiny muted">${VISUAL_HOOKS.length} patrones · listos para usar en Reels/Carruseles</span></div>
      <div class="meta" style="margin-top:10px;">
        ${cats.map((c) => `<span class="tag accent tiny">${escape(c)}</span>`).join('')}
      </div>
      <div class="hl-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:14px;">
        ${VISUAL_HOOKS.map(
          (v) => `
          <div class="hl-card" style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;">
            <div style="display:flex;gap:8px;align-items:center;">
              <span style="font-size:18px;">${v.emoji}</span>
              <b class="small">${escape(v.titulo)}</b>
            </div>
            <div class="tiny muted" style="margin-top:6px;line-height:1.5;">${escape(v.desc)}</div>
            <div class="meta" style="margin-top:8px;"><span class="tag tiny">${escape(v.cat)}</span></div>
          </div>`,
        ).join('')}
      </div>
    </div>`;
};

const renderTitles = () => {
  const cats = [...new Set(TITLE_HOOKS.map((t) => t.cat))];
  return `
    <div class="card">
      <div class="row spread"><b>📰 Títulos gancho</b><span class="tiny muted">${TITLE_HOOKS.length} plantillas · click en ✂ para copiar el ejemplo</span></div>
      <div class="meta" style="margin-top:10px;">
        ${cats.map((c) => `<span class="tag accent tiny">${escape(c)}</span>`).join('')}
      </div>
      <div class="hl-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-top:14px;">
        ${TITLE_HOOKS.map(
          (t, i) => `
          <div class="hl-card" style="background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:12px;">
            <div style="display:flex;gap:8px;align-items:flex-start;">
              <span style="font-size:16px;">${t.emoji}</span>
              <div style="flex:1;">
                <div class="small" style="font-weight:700;font-family:ui-monospace,monospace;">${escape(t.plantilla)}</div>
                <div class="tiny muted" style="margin-top:4px;font-style:italic;">"${escape(t.ejemplo)}"</div>
              </div>
              <button class="btn ghost tiny th-copy" data-i="${i}" title="Copiar ejemplo">✂</button>
            </div>
            <div class="meta" style="margin-top:8px;"><span class="tag tiny">${escape(t.cat)}</span></div>
          </div>`,
        ).join('')}
      </div>
    </div>`;
};

const renderTab = (root) => {
  const content = root.querySelector('#hook-content');
  if (!content) return;
  if (activeTab === 'browser') content.innerHTML = renderBrowser();
  else if (activeTab === 'score') content.innerHTML = renderScorer();
  else if (activeTab === 'generate') content.innerHTML = renderGenerator();
  else if (activeTab === 'visuals') content.innerHTML = renderVisuals();
  else if (activeTab === 'titles') {
    content.innerHTML = renderTitles();
    content.querySelectorAll('.th-copy').forEach((b) =>
      b.addEventListener('click', async (e) => {
        const i = Number(e.currentTarget.dataset.i);
        const t = TITLE_HOOKS[i];
        if (!t) return;
        try {
          await navigator.clipboard.writeText(t.ejemplo);
          toast('Copiado: ' + t.ejemplo, 'ok');
        } catch {
          toast('No se pudo copiar', 'warn');
        }
      }),
    );
  }
  wireTab(root);
};

const wireTab = (root) => {
  root.querySelectorAll('[data-cat]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeCategory = btn.dataset.cat || null;
      renderTab(root);
    });
  });

  // Favoritos
  root.querySelectorAll('[data-fav]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.fav;
      const isFav = toggleFav(id);
      btn.classList.toggle('on', isFav);
      btn.textContent = isFav ? '⭐' : '☆';
      btn.title = isFav ? 'Quitar de favoritos' : 'Guardar como favorito';
    });
  });

  // Copy al clipboard
  root.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        const orig = btn.innerHTML;
        btn.innerHTML = '✓ Copiado';
        setTimeout(() => {
          btn.innerHTML = orig;
        }, 1100);
      } catch {
        toast('No se pudo copiar', 'warn');
      }
    });
  });

  // Variar (3 variantes con IA o local)
  root.querySelectorAll('[data-vary]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const card = btn.closest('.hook-pattern-card');
      const example = card?.dataset.example ?? '';
      const id = btn.dataset.vary;
      const pattern = patternsCache.find((p) => p.id === id);
      btn.disabled = true;
      btn.innerHTML = '⏳';
      const result = await apiSafeImport('/api/hooks/vary', { method: 'POST', body: { hookId: id, example } });
      btn.disabled = false;
      btn.innerHTML = '🎲 Variar';
      const variants = result?.variants ?? localVariants(pattern, example);
      const wrap = document.createElement('div');
      wrap.className = 'hook-variants-pop';
      wrap.innerHTML = `
        <div class="hook-variants-head">3 variantes del patrón "${escape(pattern?.name ?? 'hook')}"</div>
        ${variants
          .map(
            (v, i) => `
          <div class="hook-variant-row">
            <div class="hook-variant-text">${escape(v)}</div>
            <button class="btn ghost tiny" data-copy-variant="${escape(v)}">📋</button>
          </div>`,
          )
          .join('')}
        <button class="btn ghost tiny" data-close-variants style="margin-top:8px;width:100%;">Cerrar</button>`;
      card.appendChild(wrap);
      wrap.querySelectorAll('[data-copy-variant]').forEach((b) => {
        b.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          try {
            await navigator.clipboard.writeText(b.dataset.copyVariant);
            b.textContent = '✓';
          } catch {
            /* noop */
          }
        });
      });
      wrap.querySelector('[data-close-variants]').addEventListener('click', () => wrap.remove());
    });
  });

  // Usar hook → ir a Studio Carrusel/Reel/Story con el hook precargado
  root.querySelectorAll('[data-use]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const text = btn.dataset.text;
      try {
        sessionStorage.setItem('feedia.hook.preload', text);
      } catch {
        /* noop */
      }
      // Mini-modal para elegir destino
      const modal = document.createElement('div');
      modal.className = 'hook-use-modal';
      modal.innerHTML = `
        <div class="hook-use-backdrop"></div>
        <div class="hook-use-card">
          <h3>¿Dónde usás este hook?</h3>
          <p class="small muted">Te llevo al Studio con el hook precargado.</p>
          <div class="btn-row" style="gap:6px;justify-content:center;flex-wrap:wrap;">
            <button class="btn primary" data-go="studio-carousel">🎠 Carrusel</button>
            <button class="btn primary" data-go="studio-reel">▶️ Reel</button>
            <button class="btn primary" data-go="studio-stories">◎ Story</button>
            <button class="btn ghost" data-close-modal>Cancelar</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.querySelector('.hook-use-backdrop').addEventListener('click', () => modal.remove());
      modal.querySelector('[data-close-modal]').addEventListener('click', () => modal.remove());
      modal.querySelectorAll('[data-go]').forEach((b) => {
        b.addEventListener('click', () => {
          modal.remove();
          window.location.hash = `#${b.dataset.go}`;
        });
      });
    });
  });

  const scoreBtn = root.querySelector('#score-btn');
  if (scoreBtn) {
    scoreBtn.addEventListener('click', async (e) => {
      const input = root.querySelector('#score-input');
      if (!input?.value.trim()) {
        toast('Pegá un hook para scorear', 'warn');
        return;
      }
      await withBtnSpinner(e.currentTarget, 'calculando…', async () => {
        try {
          const result = await api('/api/hooks/score', { method: 'POST', body: { hook: input.value.trim() } });
          root.querySelector('#score-result').innerHTML = renderScoreBreakdown(result);
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });
  }

  const genBtn = root.querySelector('#gen-btn');
  if (genBtn) {
    genBtn.addEventListener('click', async (e) => {
      const idea = root.querySelector('#gen-input')?.value.trim();
      const format = root.querySelector('#gen-format')?.value;
      if (!idea) {
        toast('Escribí una idea', 'warn');
        return;
      }
      await withBtnSpinner(e.currentTarget, 'generando…', async () => {
        try {
          const result = await api('/api/hooks/generate', {
            method: 'POST',
            body: { idea, format: format || undefined },
          });
          const html = `
            <div style="margin-top:14px;">
              <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">3 hooks generados, rankeados por score</div>
              ${(result.hooks ?? [])
                .map(
                  (h, i) => `
                <div class="card" style="margin-bottom:10px;${i === 0 ? 'border-color:var(--accent);' : ''}">
                  <div class="meta">
                    <span class="tag ${i === 0 ? 'accent' : ''} tiny">#${i + 1}</span>
                    <span class="tag info tiny">${escape(h.patternName)}</span>
                    <span class="tag ${h.score.band === 'excelente' || h.score.band === 'fuerte' ? 'ok' : 'warn'} tiny">${h.score.total}/100 · ${escape(h.score.band)}</span>
                  </div>
                  <div style="font-size:15px;font-weight:600;margin-top:8px;">${escape(h.text)}</div>
                </div>`,
                )
                .join('')}
            </div>`;
          root.querySelector('#gen-result').innerHTML = html;
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });
  }
};

export const renderHooks = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🎣 Hook Library</h1>
        <p class="view-subtitle page-subtitle">Biblioteca curada de patrones de hooks virales · scorer determinístico · generador con voz de marca.</p>
      </div>
    </header>
    <div class="page-toolbar">
      <div class="page-toolbar-tabs">
        <button class="tool-tab-btn ${activeTab === 'browser' ? 'active' : ''}" data-tab="browser">📚 Librería</button>
        <button class="tool-tab-btn ${activeTab === 'visuals' ? 'active' : ''}" data-tab="visuals">🎬 Visuales</button>
        <button class="tool-tab-btn ${activeTab === 'titles' ? 'active' : ''}" data-tab="titles">📰 Títulos</button>
        <button class="tool-tab-btn ${activeTab === 'score' ? 'active' : ''}" data-tab="score">📐 Scorer</button>
        <button class="tool-tab-btn ${activeTab === 'generate' ? 'active' : ''}" data-tab="generate">⚡ Generador</button>
      </div>
    </div>
    <div id="hook-content" class="page-body">${loadingScreen()}</div>`;

  try {
    const data = await api('/api/hooks/patterns');
    patternsCache = data.patterns ?? [];
  } catch (err) {
    toast('Error cargando librería: ' + err.message, 'crit');
    return;
  }

  renderTab(root);

  root.querySelectorAll('.tool-tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      root.querySelectorAll('.tool-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      renderTab(root);
    });
  });
};
