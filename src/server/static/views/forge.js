/* ══════════════════════════════════════════════════════════════════════════════
   FORGE IA — estrategia → producción → predicción
   ──────────────────────────────────────────────────────────────────────────────
   Tres etapas que se corren de a una o encadenadas ("Generar todo"):
     1. Estrategia  → hooks rankeados + lo que tu cuenta ya demostró (historial real).
     2. Producción  → carrusel, reel o historia con los pipelines de Studio.
     3. Predicción  → veredicto calibrado con tus posts guardados + señales de contenido y hook.
   "Mejorar con la predicción" vuelve a producir aplicando las correcciones y deja
   los intentos lado a lado para que elijas cuál usar.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const FORMATOS = [
  ['carrusel', '🗂️ Carrusel'],
  ['reel', '🎬 Reel / Video'],
  ['historia', '◎ Historia'],
];
const PLATAFORMAS = [
  ['instagram', '📷 Instagram'],
  ['tiktok', '🎵 TikTok'],
];
const OBJETIVOS = [
  ['engagement', '💜 Engagement'],
  ['alcance', '📡 Alcance'],
  ['conversion', '💰 Conversión'],
  ['comunidad', '👥 Comunidad'],
  ['ventas', '🛒 Ventas'],
];
const VOCES = ['cercano', 'profesional', 'autoritativo', 'humorístico', 'inspirador'];

const DECISION = {
  listo: { label: '✅ Listo para publicar', color: '#10b981' },
  mejorar: { label: '🔁 Conviene mejorar', color: '#f59e0b' },
};
const NIVEL_COLOR = { fuerte: '#10b981', promedio: '#3b82f6', debil: '#ef4444', 'sin-datos': '#94a3b8' };
const BANDA_LABEL = {
  'viral-candidate': '🚀 Candidato viral',
  fuerte: '💪 Fuerte',
  aceptable: '👍 Aceptable',
  mejorable: '⚠️ Mejorable',
  debil: '🚨 Débil',
};

const estado = {
  entrada: null,
  angulo: null,
  estrategia: null,
  hookElegido: null,
  intentos: [],
  activo: 0,
  ocupado: false,
};

const getActivePlatform = () => {
  try {
    return localStorage.getItem('feedia.platform') === 'tiktok' ? 'tiktok' : 'instagram';
  } catch {
    return 'instagram';
  }
};

const opciones = (lista, actual) =>
  lista.map(([v, l]) => `<option value="${v}" ${v === actual ? 'selected' : ''}>${l}</option>`).join('');

const pct = (v) => (v === null || v === undefined ? '—' : `${(v * 100).toFixed(1)}%`);
const vsTxt = (v) => (v === null || v === undefined ? '' : `(${v.toFixed(1)}× la mediana)`);
const colorPuntaje = (n) => (n >= 75 ? '#10b981' : n >= 60 ? '#3b82f6' : n >= 45 ? '#a855f7' : '#f59e0b');

const mensajeDe = (err) => {
  if (err?.status === 402) return err.payload?.reason ?? 'Llegaste al límite de tu plan.';
  if (err?.code === 'API_NOT_FOUND') return 'Forge no está disponible en este servidor. Recargá la página.';
  if (err?.payload?.error === 'forge-failed') return 'Forge falló al generar. Probá de nuevo en un momento.';
  return err?.payload?.error || err?.message || 'Error inesperado';
};

const llamar = async (path, body) => {
  const { data, error } = await apiSafe(path, null, { method: 'POST', body });
  if (error) throw error;
  return data;
};

/* ───────── Formulario ───────── */

const sugerenciasTemaPorNicho = {
  marketing: [
    'cómo hacer viral un post',
    'estrategia de contenido 2026',
    'growth hacking con IA',
    'email marketing que convierte',
  ],
  fitness: ['rutina de 15 minutos', 'nutrición para definir', 'antes y después real', 'cómo empezar a entrenar'],
  tech: ['app que cambió mi vida', 'setup de programador', 'AI tools que no conocés', 'cómo aprender a programar'],
  negocio: ['lanzar un producto', 'vender en redes', 'automatizar el negocio', 'aumentar conversión'],
  emprendimiento: ['historia de cómo empecé', 'primeros 100 clientes', 'métricas que importan', 'errores que cometí'],
};

const buildForm = (platform) => `
  <div class="fg-card">
    <h2 class="fg-section-title">🎬 Decile a Forge qué crear</h2>
    <p class="fg-section-sub">
      <strong>Entrada clara</strong> = mejor análisis.<br/>
      Strateg usa historial real + genera hooks calibrados · Producción consume cuota · Predicción es pre-publish.
    </p>

    <div class="fg-form-grid">
      <label class="fg-field fg-field-wide">
        <span class="fg-label">🎯 ¿Sobre qué EXACTAMENTE? (lo más importante)</span>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
          Sé específico: no "marketing" → "cómo vender más con email marketing"
        </div>
        <input
          class="fg-input"
          id="fg-topic"
          placeholder="Ej: cómo automatizar tu marketing con IA"
          autocomplete="off"
          style="font-size: 14px; padding: 12px;"
        />
        <div id="fg-topic-suggestions" style="margin-top: 8px; display: none;">
          <div style="font-size: 11px; color: #64748b; margin-bottom: 4px;">💡 Sugerencias por nicho:</div>
          <div id="fg-topic-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
        </div>
      </label>

      <label class="fg-field">
        <span class="fg-label">📱 Plataforma</span>
        <select class="fg-input" id="fg-platform">${opciones(PLATAFORMAS, platform)}</select>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Dónde vas a publicar</div>
      </label>

      <label class="fg-field">
        <span class="fg-label">🎬 Formato</span>
        <select class="fg-input" id="fg-format">${opciones(FORMATOS, 'reel')}</select>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Tipo de contenido</div>
      </label>

      <label class="fg-field">
        <span class="fg-label">🎯 Objetivo principal</span>
        <select class="fg-input" id="fg-goal">${opciones(OBJETIVOS, 'engagement')}</select>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">¿Qué buscás lograr?</div>
      </label>

      <label class="fg-field">
        <span class="fg-label">🔍 Nicho/Industria</span>
        <input
          class="fg-input"
          id="fg-niche"
          placeholder="Ej: marketing, fitness, IA, emprendimiento"
          autocomplete="off"
          list="nicho-suggestions"
        />
        <datalist id="nicho-suggestions">
          ${Object.keys(sugerenciasTemaPorNicho)
            .map((n) => `<option>${n}</option>`)
            .join('')}
        </datalist>
      </label>

      <label class="fg-field">
        <span class="fg-label">🎤 Voz de marca</span>
        <select class="fg-input" id="fg-voice">${VOCES.map((v) => `<option value="${v}">${v.charAt(0).toUpperCase() + v.slice(1)}</option>`).join('')}</select>
        <div style="font-size: 11px; color: #64748b; margin-top: 4px;">Tono del mensaje</div>
      </label>

      <label class="fg-field fg-field-wide">
        <span class="fg-label">🚫 Ángulos competencia (opcional)</span>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">
          Qué ya hace la competencia (para evitar repetir)
        </div>
        <input
          class="fg-input"
          id="fg-competitors"
          placeholder="Ej: tutorial paso a paso, tips de productividad"
          autocomplete="off"
        />
      </label>
    </div>

    <div class="fg-actions">
      <!-- Decision Engine: Predict + Verdict en 16 fases -->
      <button class="fg-btn fg-btn-primary" data-action="decision-engine-flow" style="width: 100%; padding: 16px 24px; font-size: 15px; margin-bottom: 16px; line-height: 1.4;">
        <span class="fg-btn-icon">🎯</span>
        <div style="text-align: left;">
          <strong>¿Deberías Publicar Esto?</strong>
          <div style="font-size: 12px; opacity: 0.85;">Analiza 16 factores: predicción viral + crecimiento + repurposing</div>
        </div>
      </button>

      <!-- Herramientas Individuales (EXPANDIDO por defecto) -->
      <div style="width: 100%; margin-bottom: 16px;">
        <div style="padding: 12px; background: #fff7ed; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 12px; font-size: 13px; color: #92400e;">
          ⓘ <strong>Nota:</strong> Herramientas de análisis individual (benchmark, personas, hashtags, etc.) están disponibles en <strong>Sala Ejecutiva → Analytics</strong> para investigación profunda.
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 12px; background: #f1f5f9; border-radius: 6px;">
          <button class="fg-btn fg-btn-secondary" data-action="estrategia" style="font-size: 13px;">1 · Estrategia</button>
          <button class="fg-btn fg-btn-secondary" data-action="producir" style="font-size: 13px;">2 · Producir</button>
          <button class="fg-btn fg-btn-secondary" data-action="todo" style="font-size: 13px;">✨ Generar todo</button>
          <button class="fg-btn fg-btn-secondary" data-action="cargar-historico" style="font-size: 13px;">📊 Histórico</button>
          <button class="fg-btn fg-btn-secondary" data-action="analizar-predictor" style="font-size: 13px;">🔬 Analizar</button>
          <button class="fg-btn fg-btn-secondary" data-action="batch-comparison" style="font-size: 13px;">📈 Trends</button>
          <button class="fg-btn fg-btn-secondary" data-action="content-suggestions" style="font-size: 13px;">✍️ Sugerencias</button>
          <button class="fg-btn fg-btn-secondary" data-action="performance-forecast" style="font-size: 13px;">🔮 Forecast</button>
          <button class="fg-btn fg-btn-secondary" data-action="abtest" style="font-size: 13px;">🧪 A/B Test</button>
          <button class="fg-btn fg-btn-secondary" data-action="benchmark" style="font-size: 13px;">📊 Benchmark</button>
          <button class="fg-btn fg-btn-secondary" data-action="seasonality" style="font-size: 13px;">📈 Seasonality</button>
          <button class="fg-btn fg-btn-secondary" data-action="persona" style="font-size: 13px;">👥 Personas</button>
          <button class="fg-btn fg-btn-secondary" data-action="hashtag" style="font-size: 13px;">#️⃣ Hashtags</button>
          <button class="fg-btn fg-btn-secondary" data-action="calendar" style="font-size: 13px;">📅 Calendario</button>
          <button class="fg-btn fg-btn-secondary" data-action="revenue" style="font-size: 13px;">💰 Revenue</button>
          <button class="fg-btn fg-btn-secondary" data-action="health" style="font-size: 13px;">🏥 Health</button>
          <button class="fg-btn fg-btn-secondary" data-action="viral" style="font-size: 13px;">🚀 Viral (Phase 14)</button>
          <button class="fg-btn fg-btn-secondary" data-action="repurpose" style="font-size: 13px;">♻️ Repurpose (P15)</button>
          <button class="fg-btn fg-btn-secondary" data-action="growth" style="font-size: 13px;">📈 Growth (Phase 16)</button>
        </div>
      </div>
    </div>
    <p class="fg-disclaimer">Estrategia y predicción usan tus posts guardados (sincronizalos desde Predictor). Si la cuenta no tiene historial, Forge lo dice en vez de inventar cifras.</p>
  </div>`;

const normalizarTema = (tema) => {
  // Limpiar espacios extras
  let t = tema.trim().toLowerCase();
  // Quitar artículos comunes si es necesario
  t = t.replace(/^(el|la|los|las|un|una|unos|unas)\s+/i, '');
  // Asegurar que empiece con mayúscula
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const validarEntrada = (entrada) => {
  const errores = [];

  if (!entrada.tema || entrada.tema.length < 5) {
    errores.push('Tema muy corto. Sé más específico (ej: "cómo vender más con email marketing")');
  }

  if (entrada.tema.split(' ').length === 1) {
    errores.push('Tema muy genérico. Necesito más contexto (ej: "marketing" → "estrategia de email marketing")');
  }

  if (entrada.tema.length > 150) {
    errores.push('Tema muy largo (máx 150 caracteres)');
  }

  return errores;
};

const leerEntrada = () => {
  const val = (id) => document.querySelector(`#${id}`)?.value ?? '';
  const tema = val('fg-topic').trim();
  const nicho = val('fg-niche').trim();

  return {
    tema: normalizarTema(tema),
    temaOriginal: tema,
    plataforma: val('fg-platform') || 'instagram',
    formato: val('fg-format') || 'reel',
    objetivo: val('fg-goal') || 'engagement',
    nicho: nicho || 'general',
    voz: val('fg-voice') || 'cercano',
    competidores: val('fg-competitors')
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .slice(0, 5), // Máx 5 competidores
    hook: estado.hookElegido,
    angulo: estado.angulo,
    ajustes: [],
  };
};

/* ───────── Render de etapas ───────── */

const renderPlan = (plan) => {
  if (!plan) return '';
  const lista = (items, tag = 'ul') => `<${tag}>${items.map((s) => `<li>${escape(s)}</li>`).join('')}</${tag}>`;
  const avisos = plan.avisos.map((a) => `<div class="fg-warn-line">⚠️ ${escape(a)}</div>`).join('');
  const angulos = plan.angulos
    .map(
      (a, i) => `
      <button class="fg-angle ${estado.angulo === a.texto ? 'best' : ''}" data-action="usar-angulo" data-idx="${i}">
        <span class="fg-tiny-muted">${escape(a.categoria)}</span>
        <span class="fg-angle-text">${escape(a.texto)}</span>
      </button>`,
    )
    .join('');
  return `
    <div class="fg-plan">
      <div class="fg-plan-block"><strong>🎯 Objetivo</strong>
        <div class="fg-tiny-muted">${escape(plan.objetivo.meta)} Medí: ${escape(plan.objetivo.metricaClave)}</div>
        <div class="fg-tiny-muted">Fundamento: ${escape(plan.objetivo.fundamento)}</div>
      </div>
      <div class="fg-plan-block"><strong>📐 Estructura del ${escape(plan.formato.formato)}</strong>
        ${lista(plan.formato.estructura, 'ol')}
        <div class="fg-tiny-muted">${escape(plan.formato.reglaClave)}</div>
      </div>
      <div class="fg-plan-block"><strong>👉 Escalera de CTA (de suave a directa)</strong>
        ${lista(plan.objetivo.ctaEscalera, 'ol')}
      </div>
      ${avisos}
    </div>
    <div class="fg-angles">
      <strong>🧩 Elegí un ángulo: le da a la pieza una promesa concreta</strong>
      <div class="fg-angle-grid">${angulos}</div>
      ${estado.angulo ? '' : '<div class="fg-tiny-muted">Sin ángulo elegido, Forge usa sólo el tema.</div>'}
    </div>
    <div class="fg-plan-block fg-routine">
      <strong>🧭 Ruta de fundación de 30 días</strong>
      <ul>${plan.rutaFundacion.map((b) => `<li>${escape(b.tipo)} · ${b.piezas} piezas</li>`).join('')}</ul>
      <div class="fg-tiny-muted">${escape(plan.cadencia)}</div>
      <div class="fg-tiny-muted">Hashtags: ${escape(plan.hashtags)}</div>
    </div>`;
};

const renderEstrategia = (e) => {
  const r = e.recomendacion;
  const bloque = (g) =>
    g
      ? `<div class="fg-strategy-val">${escape(g.etiqueta)} <span class="fg-muted">${vsTxt(g.vsMediana)}</span></div>
         <div class="fg-tiny-muted">${g.posts} posts</div>`
      : '<div class="fg-tiny-muted">Sin datos suficientes</div>';

  const hooks = e.hooks.length
    ? e.hooks
        .map(
          (h, i) => `
        <div class="fg-hook ${h.hook === estado.hookElegido ? 'best' : ''}">
          <div class="fg-hook-head">
            <span class="fg-hook-formula">${escape(h.categoria || 'hook')}</span>
            <span class="fg-hook-strength" style="color:${colorPuntaje(h.puntaje)};">${h.puntaje}/100</span>
          </div>
          <div class="fg-hook-text">${escape(h.hook)}</div>
          <button class="fg-tiny-btn fg-hook-pick" data-action="usar-hook" data-idx="${i}">
            ${h.hook === estado.hookElegido ? '✔ Elegido' : 'Usar este'}
          </button>
        </div>`,
        )
        .join('')
    : `<div class="fg-tiny-muted">${escape(e.avisoHooks || 'Sin hooks generados.')}</div>`;

  const elegido = r.elegido
    ? `<div class="fg-tiny-muted">Tu formato elegido (${escape(r.elegido.etiqueta)}) ${vsTxt(r.elegido.vsMediana) || 'sin comparación'} · ${r.elegido.posts} posts</div>`
    : '';

  return `
    <div class="fg-card">
      <h3 class="fg-section-title">1 · Estrategia</h3>
      <p class="fg-section-sub ${r.disponible ? '' : 'fg-warn'}">${escape(r.motivo)}</p>
      <div class="fg-strategy-grid">
        <div class="fg-strategy-block"><strong>🎬 Formato que más rinde</strong>${bloque(r.mejorFormato)}</div>
        <div class="fg-strategy-block"><strong>⏰ Franja que más rinde</strong>${bloque(r.mejorFranja)}</div>
        <div class="fg-strategy-block"><strong>🎣 Hook que más rinde</strong>${bloque(r.mejorHook)}</div>
        <div class="fg-strategy-block"><strong>👉 CTA que más rinde</strong>${bloque(r.mejorCta)}</div>
      </div>
      ${elegido}
      ${renderPlan(e.plan)}
      <div class="fg-hooks">
        <strong>🎣 Hooks para tu tema (elegí uno para producir):</strong>
        <div class="fg-hook-list">${hooks}</div>
      </div>
    </div>`;
};

const renderPieza = (p, n) => {
  const caption = p.caption
    ? `
    <div class="fg-caption">
      <div class="fg-caption-head">
        <strong>📝 Caption</strong>
        <button class="fg-tiny-btn" data-action="copiar-caption">Copiar</button>
      </div>
      <pre>${escape(p.caption)}</pre>
    </div>`
    : '<div class="fg-tiny-muted">Las historias no llevan caption: copiá el texto de cada frame.</div>';

  const hashtags = p.hashtags.length
    ? `<div class="fg-hashtags">
         <strong>#️⃣ Hashtags (${p.hashtags.length})</strong>
         <div class="fg-tag-list">${p.hashtags.map((t) => `<span class="fg-tag">${escape(t)}</span>`).join('')}</div>
         <button class="fg-tiny-btn" data-action="copiar-hashtags">Copiar todos</button>
       </div>`
    : '';

  const partes = p.cuerpo
    .map(
      (x) => `
    <div class="fg-part">
      <div class="fg-part-title">${escape(x.titulo)}</div>
      <div class="fg-part-text">${escape(x.texto)}</div>
      ${x.nota ? `<div class="fg-part-note">🎨 ${escape(x.nota)}</div>` : ''}
    </div>`,
    )
    .join('');

  const duracion = p.duracionSeg ? ` · ${p.duracionSeg}s` : '';
  return `
    <div class="fg-card">
      <h3 class="fg-section-title">2 · Producción${estado.intentos.length > 1 ? ` · intento ${n}` : ''}</h3>
      <p class="fg-section-sub">${escape(FORMATOS.find(([v]) => v === p.formato)?.[1] ?? p.formato)}${duracion} · ${p.cuerpo.length} partes</p>

      <div class="fg-hook best">
        <div class="fg-hook-head"><span class="fg-hook-formula">Hook</span></div>
        <div class="fg-hook-text">${escape(p.hook)}</div>
      </div>
      ${p.portada ? `<div class="fg-cover-line"><strong>Portada:</strong> ${escape(p.portada)}</div>` : ''}

      <div class="fg-parts">${partes}</div>
      ${caption}
      ${hashtags}

      <div class="fg-final-actions">
        <button class="fg-btn fg-btn-secondary" data-action="descargar-md">⬇️ Descargar .md</button>
        <button class="fg-btn fg-btn-secondary" data-action="copiar-paquete">📋 Copiar paquete</button>
        <button class="fg-btn fg-btn-secondary" data-action="mejorar">🔁 Mejorar</button>
        <button class="fg-btn fg-btn-primary" data-action="enviar-publicar"><span class="fg-btn-icon">📅</span>Enviar a publicar</button>
      </div>
    </div>`;
};

const renderChequeos = (chequeos) => {
  if (!chequeos?.length) return '';
  const filas = chequeos
    .map(
      (c) => `
      <div class="fg-check ${c.ok ? 'ok' : 'no'}">
        <span class="fg-check-icon">${c.ok ? '✔' : '✖'}</span>
        <div><div class="fg-check-title">${escape(c.titulo)}</div><div class="fg-tiny-muted">${escape(c.detalle)}</div></div>
      </div>`,
    )
    .join('');
  return `<div class="fg-checks"><strong>✅ Chequeos de estrategia</strong>${filas}</div>`;
};

const renderPrediccion = (r) => {
  const dec = DECISION[r.decision] ?? DECISION.mejorar;
  const cuenta = r.cuenta.prediccion;
  const rango = cuenta?.tasaInteraccion;
  const mejorMomento = cuenta?.mejorMomentoFormato;
  const accionables = r.accionables.length
    ? `<div class="fg-improvements"><strong>${r.decision === 'listo' ? '💡 Mejoras opcionales:' : '💡 Qué cambiar:'}</strong><ul>${r.accionables.map((a) => `<li>${escape(a)}</li>`).join('')}</ul></div>`
    : '';

  const bandaTxt = BANDA_LABEL[r.contenido.banda] ?? r.contenido.banda;
  return `
    <div class="fg-card">
      <div class="fg-head-row">
        <h3 class="fg-section-title">3 · Predicción</h3>
        <span class="fg-decision" style="background:${dec.color}22;color:${dec.color};">${dec.label}</span>
      </div>
      <p class="fg-section-sub">Cada señal se mide por separado. Ninguna es un número mágico ni un promedio de benchmarks ajenos.</p>

      <div class="fg-signals">
        <div class="fg-signal">
          <div class="fg-signal-lbl">Tu cuenta</div>
          ${
            cuenta
              ? `<div class="fg-signal-val" style="color:${NIVEL_COLOR[cuenta.veredicto.nivel] ?? '#94a3b8'};">${escape(cuenta.veredicto.titulo)}</div>
                 <div class="fg-tiny-muted">${escape(cuenta.veredicto.texto)}</div>
                 ${rango ? `<div class="fg-tiny-muted">Interacción esperada ${pct(rango.p10)} – ${pct(rango.p90)} · tu mediana ${pct(cuenta.medianas.tasaInteraccion)}</div>` : ''}
                 ${cuenta.probabilidades.superarMediana !== null ? `<div class="fg-tiny-muted">Probabilidad de superar tu mediana: ${cuenta.probabilidades.superarMediana}%</div>` : ''}`
              : `<div class="fg-tiny-muted">${escape(r.cuenta.motivo)}</div>`
          }
        </div>
        <div class="fg-signal">
          <div class="fg-signal-lbl">Contenido</div>
          <div class="fg-signal-val" style="color:${colorPuntaje(r.contenido.puntaje)};">${r.contenido.puntaje}/100 · ${escape(bandaTxt)}</div>
          <div class="fg-tiny-muted">Compartir ${r.contenido.compartir}/100 · Guardar ${r.contenido.guardar}/100</div>
        </div>
        <div class="fg-signal">
          <div class="fg-signal-lbl">Hook</div>
          <div class="fg-signal-val" style="color:${colorPuntaje(r.hook.puntaje)};">${r.hook.puntaje}/100</div>
          <div class="fg-tiny-muted">${r.hook.categoria ? escape(r.hook.categoria) : 'Sin categoría reconocida'}</div>
        </div>
      </div>

      ${mejorMomento ? `<div class="fg-tiny-muted">⏰ Mejor momento para tu formato: ${escape(mejorMomento.dia)} ${escape(mejorMomento.franja)} (mediana ${pct(mejorMomento.tasaMediana)}, ${mejorMomento.posts} posts)</div>` : ''}
      ${renderChequeos(r.chequeos)}
      ${accionables}
    </div>`;
};

const renderIntentos = () => {
  const calcularScoreTotal = (pred) => {
    const contenido = pred.contenido.puntaje || 0;
    const hook = pred.hook.puntaje || 0;
    const cuenta = pred.cuenta.disponible ? 75 : 50;
    return Math.round((contenido * 0.45 + hook * 0.35 + cuenta * 0.2) / 10) * 10;
  };

  const filas = estado.intentos
    .map((it, i) => {
      const anterior = i > 0 ? estado.intentos[i - 1].prediccion : null;
      const diffContenido = anterior ? it.prediccion.contenido.puntaje - anterior.contenido.puntaje : null;
      const diffHook = anterior ? it.prediccion.hook.puntaje - anterior.hook.puntaje : null;
      const scoreAnterior = anterior ? calcularScoreTotal(anterior) : null;
      const scoreActual = calcularScoreTotal(it.prediccion);
      const diffScore = scoreAnterior !== null ? scoreActual - scoreAnterior : null;

      const ajustesMostrados = it.ajustes.length
        ? `<div class="fg-tiny-muted">✓ ${it.ajustes.length} ajustes aplicados</div>`
        : '';

      const deltaTexto =
        diffScore === null
          ? ''
          : diffScore === 0
            ? '<span class="fg-delta">→ igual</span>'
            : `<span class="fg-delta ${diffScore > 0 ? 'up' : 'down'}">${diffScore > 0 ? '↑' : '↓'} ${Math.abs(diffScore)} pts</span>`;

      return `
      <div class="fg-attempt ${i === estado.activo ? 'best' : ''}">
        <div class="fg-attempt-info">
          <strong>Intento ${it.n}</strong>
          <div class="fg-tiny-muted">
            Contenido: ${it.prediccion.contenido.puntaje}/100${diffContenido !== null ? ` ${diffContenido > 0 ? '+' : ''}${diffContenido}` : ''}
            · Hook: ${it.prediccion.hook.puntaje}/100${diffHook !== null ? ` ${diffHook > 0 ? '+' : ''}${diffHook}` : ''}
            ${deltaTexto}
          </div>
          ${ajustesMostrados}
        </div>
        <button class="fg-tiny-btn" data-action="ver-intento" data-idx="${i}">${i === estado.activo ? '✔ En uso' : 'Usar'}</button>
      </div>`;
    })
    .join('');
  return `<div class="fg-card"><h3 class="fg-section-title">Comparar Intentos</h3><p class="fg-section-sub">Score total = 45% contenido + 35% hook + 20% cuenta. Elige el mejor.</p>${filas}</div>`;
};

const renderHistorico = (historial) => {
  if (!historial || historial.length === 0)
    return '<div class="fg-card"><p class="fg-section-sub">Sin histórico de intentos aún.</p></div>';

  const items = historial
    .map((att, idx) => {
      const scoreColor = colorPuntaje(att.scoreTotal);
      const fecha = new Date(att.createdAt).toLocaleString('es-AR', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `
      <div class="fg-history-item" style="border-left: 4px solid ${scoreColor}">
        <div class="fg-history-header">
          <span class="fg-history-fecha">${fecha}</span>
          <span class="fg-history-tema">${escape(att.tema)}</span>
        </div>
        <div class="fg-history-scores">
          <span class="fg-history-score" style="--score: ${att.contenidoScore}%">
            <span class="fg-score-label">Contenido</span>
            <span class="fg-score-value">${att.contenidoScore}</span>
          </span>
          <span class="fg-history-score" style="--score: ${att.hookScore}%">
            <span class="fg-score-label">Hook</span>
            <span class="fg-score-value">${att.hookScore}</span>
          </span>
          <span class="fg-history-score" style="--score: ${att.cuentaScore}%">
            <span class="fg-score-label">Cuenta</span>
            <span class="fg-score-value">${att.cuentaScore}</span>
          </span>
          <span class="fg-history-score-total" style="--score: ${att.scoreTotal}%">
            <span class="fg-score-label">Total</span>
            <span class="fg-score-value" style="color: ${scoreColor}">${att.scoreTotal}</span>
          </span>
        </div>
        <div class="fg-history-hook">"${escape(att.hook.substring(0, 100))}${att.hook.length > 100 ? '...' : ''}"</div>
      </div>
    `;
    })
    .join('');

  return `<div class="fg-card">
    <h3 class="fg-section-title">📊 Histórico de Intentos</h3>
    <p class="fg-section-sub">Heatmap de scores. Rojo = débil, verde = fuerte.</p>
    <div class="fg-history-timeline">${items}</div>
  </div>`;
};

const renderOutput = (root) => {
  const out = root.querySelector('#fg-output');
  if (!out) return;
  const activo = estado.intentos[estado.activo];
  out.innerHTML = [
    estado.estrategia ? renderEstrategia(estado.estrategia) : '',
    activo ? renderPieza(activo.pieza, activo.n) : '',
    activo ? renderPrediccion(activo.prediccion) : '',
    estado.intentos.length > 1 ? renderIntentos() : '',
  ].join('');
};

const mostrarCarga = (root, texto) => {
  const out = root.querySelector('#fg-output');
  if (out) out.innerHTML = `<div class="fg-loading"><div class="fg-spin"></div><div>${escape(texto)}</div></div>`;
};

/* ───────── Etapas ───────── */

const validarTema = (entrada, root) => {
  const errores = validarEntrada(entrada);

  if (errores.length > 0) {
    toast(errores[0], 'warn');
    root.querySelector('#fg-topic')?.focus();
    return false;
  }

  if (!entrada.tema) {
    toast('Describí qué contenido querés crear', 'warn');
    root.querySelector('#fg-topic')?.focus();
    return false;
  }

  return true;
};

const correrEstrategia = async (root, entrada) => {
  mostrarCarga(root, 'Analizando tu historial y generando hooks (10-20 s)…');
  const data = await llamar('/api/forge/estrategia', entrada);
  estado.entrada = entrada;
  estado.estrategia = data;
  estado.hookElegido = data.hooks[0]?.hook ?? null;
  estado.angulo = null;
  estado.intentos = [];
  estado.activo = 0;
  return data;
};

const correrProduccion = async (root, entrada, etiqueta) => {
  mostrarCarga(root, etiqueta);
  const { pieza } = await llamar('/api/forge/producir', entrada);
  return pieza;
};

const correrPrediccion = async (root, pieza, plataforma, etiqueta) => {
  mostrarCarga(root, etiqueta);
  return llamar('/api/forge/predecir', { pieza, plataforma });
};

const agregarIntento = (pieza, prediccion, ajustes) => {
  estado.intentos.push({ n: estado.intentos.length + 1, pieza, prediccion, ajustes });
  estado.activo = estado.intentos.length - 1;
};

const producirYPredecir = async (root, entrada, etiquetaProd) => {
  try {
    const pieza = await correrProduccion(root, entrada, etiquetaProd);
    const prediccion = await correrPrediccion(root, pieza, entrada.plataforma, 'Prediciendo con tu historial…');
    agregarIntento(pieza, prediccion, entrada.ajustes);
    return true;
  } catch (err) {
    // El 402 también dispara el modal global de cuota (lo hace apiSafe).
    toast(mensajeDe(err), err?.status === 402 ? 'warn' : 'err');
    return false;
  }
};

const conBusy = async (root, fn) => {
  if (estado.ocupado) return;
  estado.ocupado = true;
  try {
    await fn();
  } finally {
    estado.ocupado = false;
  }
};

const accionEstrategia = (root) =>
  conBusy(root, async () => {
    const entrada = leerEntrada();
    if (!validarTema(entrada, root)) return;
    try {
      await correrEstrategia(root, entrada);
      toast('Estrategia lista', 'ok');
    } catch (err) {
      toast(mensajeDe(err), 'err');
    }
    renderOutput(root);
  });

const accionProducir = (root) =>
  conBusy(root, async () => {
    const entrada = leerEntrada();
    if (!validarTema(entrada, root)) return;
    estado.entrada = entrada;
    const ok = await producirYPredecir(root, entrada, '🗂️ Produciendo la pieza con IA (10-40 s)…');
    if (ok) {
      const decision = estado.intentos[estado.activo].prediccion.decision;
      toast(decision === 'listo' ? 'Pieza lista para publicar' : 'Pieza generada: conviene mejorar', 'ok');
    }
    renderOutput(root);
  });

const accionTodo = (root) =>
  conBusy(root, async () => {
    const entrada = leerEntrada();
    if (!validarTema(entrada, root)) return;
    try {
      await correrEstrategia(root, entrada);
      const conHook = { ...entrada, hook: estado.hookElegido };
      estado.entrada = conHook;
      const ok = await producirYPredecir(root, conHook, '2/3 · Produciendo la pieza con IA (10-40 s)…');
      if (ok) toast('Listo: estrategia, producción y predicción', 'ok');
    } catch (err) {
      toast(mensajeDe(err), 'err');
    }
    renderOutput(root);
  });

const accionMejorar = (root) =>
  conBusy(root, async () => {
    const actual = estado.intentos[estado.activo];
    if (!actual || !estado.entrada) return;
    const ajustes = actual.prediccion.accionables;
    if (ajustes.length === 0) {
      toast('La predicción no tiene correcciones que aplicar', 'info');
      return;
    }
    const entrada = { ...estado.entrada, ajustes };
    const ok = await producirYPredecir(root, entrada, '🔁 Regenerando con las correcciones de la predicción…');
    if (ok) {
      const nuevo = estado.intentos[estado.intentos.length - 1];
      const diff = nuevo.prediccion.contenido.puntaje - actual.prediccion.contenido.puntaje;
      toast(`Intento ${nuevo.n}: contenido ${diff >= 0 ? '+' : ''}${diff} pts`, diff >= 0 ? 'ok' : 'warn');
    }
    renderOutput(root);
  });

/* ───────── Acciones de salida ───────── */

const obtenerAccountId = () => {
  try {
    const brujula = JSON.parse(localStorage.getItem('feedia.brujula.account') || '{}');
    return brujula.handle || '';
  } catch {
    return '';
  }
};

const enviarAPublicar = async (root) => {
  const actual = estado.intentos[estado.activo];
  if (!actual) return;
  const accountId = obtenerAccountId();
  if (!accountId) {
    toast('Necesitás sincronizar tu cuenta en Brújula primero', 'warn');
    return;
  }
  return conBusy(root, async () => {
    try {
      const datos = await llamar('/api/calendar/draft', {
        accountId,
        pieza: {
          formato: actual.pieza.formato,
          caption: actual.pieza.caption,
          hashtags: actual.pieza.hashtags,
          metadata: { hook: actual.pieza.hook, objetivo: estado.entrada.objetivo },
        },
      });
      toast(`Post guardado en Calendario. Programalo en el <a href="#calendar">Calendario</a>.`, 'ok');
    } catch (err) {
      toast(mensajeDe(err), 'err');
    }
  });
};

const paqueteMd = (p) =>
  [
    `# ${p.hook}`,
    '',
    `Formato: ${p.formato}${p.duracionSeg ? ` · ${p.duracionSeg}s` : ''}`,
    '',
    p.portada ? `## Portada\n${p.portada}\n` : '',
    ...p.cuerpo.map((x) => `## ${x.titulo}\n${x.texto}${x.nota ? `\n\n> ${x.nota}` : ''}\n`),
    p.caption ? `## Caption\n${p.caption}\n` : '',
    p.hashtags.length ? p.hashtags.join(' ') : '',
  ]
    .filter((l) => l !== '')
    .join('\n');

const copiar = async (texto, ok) => {
  try {
    await navigator.clipboard.writeText(texto);
    toast(ok, 'ok');
  } catch {
    toast('No se pudo copiar', 'err');
  }
};

const descargar = (nombre, contenido) => {
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const manejarAccion = (root, action, idx) => {
  const actual = estado.intentos[estado.activo];
  switch (action) {
    case 'estrategia':
      return accionEstrategia(root);
    case 'producir':
      return accionProducir(root);
    case 'todo':
      return accionTodo(root);
    case 'mejorar':
      return accionMejorar(root);
    case 'usar-angulo': {
      const a = estado.estrategia?.plan?.angulos[Number(idx)];
      if (!a) return undefined;
      estado.angulo = a.texto;
      renderOutput(root);
      toast('Ángulo elegido. Se usa al producir.', 'ok');
      return undefined;
    }
    case 'usar-hook': {
      const h = estado.estrategia?.hooks[Number(idx)];
      if (!h) return undefined;
      estado.hookElegido = h.hook;
      renderOutput(root);
      toast('Hook elegido. Producí la pieza con él.', 'ok');
      return undefined;
    }
    case 'ver-intento':
      estado.activo = Number(idx);
      renderOutput(root);
      return undefined;
    case 'copiar-caption':
      return actual && copiar(actual.pieza.caption, 'Caption copiado');
    case 'copiar-hashtags':
      return actual && copiar(actual.pieza.hashtags.join(' '), 'Hashtags copiados');
    case 'copiar-paquete':
      return actual && copiar(paqueteMd(actual.pieza), 'Paquete copiado');
    case 'descargar-md':
      if (actual) descargar(`forge-${actual.pieza.paqueteId || 'pieza'}.md`, paqueteMd(actual.pieza));
      return undefined;
    case 'enviar-publicar':
      return enviarAPublicar(root);
    case 'viral':
      return cargarViralCoefficient(root);
    case 'repurpose':
      return cargarRepurposingPlan(root);
    case 'growth':
      return cargarGrowthTrajectory(root);
    case 'decision-engine-flow': {
      const entrada = leerEntrada();
      if (!validarTema(entrada, root)) {
        toast('Necesitás describir qué contenido querés crear', 'warn');
        return undefined;
      }

      const containerId = `progress-${Date.now()}`;
      const fases = [
        { n: 1, nombre: 'Entrada', desc: 'Leyendo tu tema y contexto' },
        { n: 2, nombre: 'Análisis Histórico', desc: 'Revisando tus posts pasados' },
        { n: 3, nombre: 'Engagement Patterns', desc: 'Identificando qué funciona' },
        { n: 4, nombre: 'Hooks Calibrados', desc: 'Generando 3 direcciones de hooks' },
        { n: 5, nombre: 'Estrategia Final', desc: 'Armando estrategia con tu historial (PREDICT completo)' },
        { n: 6, nombre: 'Personas Audiencia', desc: 'Identificando tu audiencia dominante' },
        { n: 7, nombre: 'Hashtags Óptimos', desc: 'Sugiriendo hashtags trending + nicho' },
        { n: 8, nombre: 'Timing Óptimo', desc: 'Calculando mejor hora para publicar' },
        { n: 9, nombre: 'Benchmark Nicho', desc: 'Comparando vs competencia' },
        { n: 10, nombre: 'Oportunidades', desc: 'Detectando gaps en el mercado' },
        { n: 11, nombre: 'Health Score', desc: 'Evaluando salud de la cuenta' },
        { n: 12, nombre: 'Monetización', desc: 'Calculando potencial de ingresos' },
        { n: 13, nombre: 'Revenue Potential', desc: 'Proyectando oportunidades de venta' },
        { n: 14, nombre: 'Viral Coefficient', desc: 'Prediciendo probabilidad de viralidad (VERDICT 1/3)' },
        { n: 15, nombre: 'Repurposing Plan', desc: 'Diseñando cómo reutilizar (VERDICT 2/3)' },
        { n: 16, nombre: 'Growth Trajectory', desc: 'Proyectando crecimiento 30/60/90 días (VERDICT 3/3)' },
      ];

      // Renderizar contenedor de progreso
      const progressHtml = `<div id="${containerId}" style="padding: 24px; background: linear-gradient(135deg, #3b82f6 0%, #10b981 100%); border-radius: 12px; color: white; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
          <div class="fg-spin" style="width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%;"></div>
          <div>
            <h3 style="margin: 0; font-size: 18px;">🎯 Decision Engine en ejecución</h3>
            <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Analizando 16 factores críticos...</p>
          </div>
        </div>
        <div id="${containerId}-phases" style="background: rgba(0,0,0,0.2); border-radius: 8px; padding: 12px; max-height: 300px; overflow-y: auto; font-size: 12px; line-height: 1.5;">
        </div>
      </div>`;

      root.insertAdjacentHTML('beforeend', progressHtml);
      const phasesContainer = document.querySelector(`#${containerId}-phases`);

      const updatePhase = (fase) => {
        const phaseHtml = `<div style="padding: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; margin-bottom: 6px; border-left: 3px solid #10b981;">
          <strong>Fase ${fase.n}/16:</strong> ${fase.nombre}
          <div style="opacity: 0.85; font-size: 11px; margin-top: 2px;">${fase.desc}</div>
        </div>`;
        phasesContainer.insertAdjacentHTML('beforeend', phaseHtml);
        phasesContainer.scrollTop = phasesContainer.scrollHeight;
      };

      // Log cada fase
      fases.slice(0, 5).forEach((f) => updatePhase(f));

      return correrEstrategia(root, entrada)
        .then(() => {
          fases.slice(5, 14).forEach((f) => updatePhase(f));
          return cargarViralCoefficient(root);
        })
        .then(() => {
          updatePhase(fases[13]);
          return cargarRepurposingPlan(root);
        })
        .then(() => {
          updatePhase(fases[14]);
          return cargarGrowthTrajectory(root);
        })
        .then(() => {
          updatePhase(fases[15]);
          const finalHtml = `<div style="padding: 16px; background: #f0fdf4; border-radius: 12px; border: 2px solid #10b981; margin-top: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #16a34a; font-size: 16px;">✅ Decision Engine Completado</h3>
            <p style="margin: 0; font-size: 13px; color: #166534;">
              <strong>Análisis de 16 factores completado:</strong> Estrategia (fases 1-5) → Optimización (6-13) → Veredicto (14-16)
              <br/>Reviá los resultados arriba. ¿La decisión es publicar o mejorar primero?
            </p>
          </div>`;
          document.querySelector(`#${containerId}`).insertAdjacentHTML('afterend', finalHtml);
          toast('success', '✅ Decision Engine: 16 fases completadas');
        })
        .catch((err) => {
          toast('error', `Error: ${err.message || 'Decision Engine interrupted'}`);
        });
    }
    default:
      return undefined;
  }
};

/* ───────── Phase 2: Predictor Breakdown ───────── */

const colorPuntajePred = (score) => {
  if (score >= 80) return '#10b981'; // verde
  if (score >= 60) return '#3b82f6'; // azul
  if (score >= 40) return '#f59e0b'; // naranja
  return '#ef4444'; // rojo
};

const renderPredictorAnalysis = (root, analysis) => {
  const { contentBreakdown, hookBreakdown, accountBreakdown, overallScore, bottleneck, recommendations } = analysis;

  const sectoresHtml = [
    { bd: contentBreakdown, title: '📝 Contenido' },
    { bd: hookBreakdown, title: '🎣 Hook' },
    { bd: accountBreakdown, title: '📊 Cuenta' },
  ]
    .map(
      ({ bd, title }) =>
        `<div class="fg-pred-breakdown" style="border-left: 4px solid ${colorPuntajePred(bd.score)}">
      <h4>${title}</h4>
      <p class="fg-pred-score">${bd.score}/100</p>
      <p class="fg-pred-summary">${bd.summary}</p>
      <div class="fg-pred-factors">
        ${bd.factors
          .map(
            (f) =>
              `<div class="fg-pred-factor">
          <div class="fg-pred-factor-name">${f.name}</div>
          <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin: 4px 0;">
            <div style="width: ${f.value}%; height: 100%; background: ${colorPuntajePred(f.value)}; border-radius: 2px;"></div>
          </div>
          <div class="fg-pred-factor-value">${f.value}/100</div>
        </div>`,
          )
          .join('')}
      </div>
    </div>`,
    )
    .join('');

  const recsHtml = recommendations
    .map(
      (r) =>
        `<div class="fg-rec" data-priority="${r.priority}">
      <span class="fg-rec-priority">${r.priority === 'high' ? '🔴' : r.priority === 'medium' ? '🟡' : '🟢'}</span>
      <div class="fg-rec-content">
        <strong>${r.action}</strong>
        <div class="fg-rec-meta">Impacto estimado: +${r.impact}% · Dificultad: ${r.difficulty}</div>
      </div>
    </div>`,
    )
    .join('');

  const html = `<div class="fg-analysis-panel">
    <h3>📊 Análisis de Predicción</h3>

    <div class="fg-overall">
      <div style="text-align: center;">
        <div style="font-size: 48px; font-weight: 700; color: ${colorPuntajePred(overallScore)};">${overallScore}</div>
        <div style="font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Puntuación Total</div>
      </div>
      <div style="border-left: 1px solid #e5e7eb; padding-left: 20px;">
        <div style="font-size: 12px; margin-bottom: 8px;">Cuello de botella:</div>
        <div style="font-size: 14px; font-weight: 600; color: #ef4444;">
          ${bottleneck.charAt(0).toUpperCase() + bottleneck.slice(1)} (prioridad #1)
        </div>
      </div>
    </div>

    <div class="fg-breakdowns">
      ${sectoresHtml}
    </div>

    <div class="fg-recommendations">
      <h4>💡 Recomendaciones Priorizadas</h4>
      ${recsHtml}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 3: Batch Comparison ───────── */

const trendArrow = (direction) => (direction === 'up' ? '📈' : direction === 'down' ? '📉' : '→');

const renderBatchComparison = (root, comparison) => {
  const { attempts, trends, impactfulChanges, bestAttempt, worstAttempt, averageScore, improvementRate } = comparison;

  const trendsHtml = trends
    .map(
      (t) =>
        `<div class="fg-trend">
      <div class="fg-trend-category">${t.category === 'contenido' ? '📝' : t.category === 'hook' ? '🎣' : '📊'} ${t.category}</div>
      <div class="fg-trend-data">
        <span class="fg-trend-arrow">${trendArrow(t.direction)}</span>
        <span class="fg-trend-delta">${t.delta > 0 ? '+' : ''}${t.delta}</span>
        <span class="fg-trend-momentum">(Momentum: ${t.momentum > 0 ? '+' : ''}${t.momentum}%)</span>
      </div>
    </div>`,
    )
    .join('');

  const changesHtml = impactfulChanges
    .map(
      (c) =>
        `<div class="fg-change" data-score="${c.scoreDelta}">
      <div class="fg-change-title">${c.estimatedCause}</div>
      <div class="fg-change-score" style="color: ${c.scoreDelta > 0 ? '#10b981' : '#ef4444'};">
        ${c.scoreDelta > 0 ? '+' : ''}${c.scoreDelta}
      </div>
      <div class="fg-change-detail">
        ${c.hookChanged ? '🎣 Hook changed · ' : ''}Content: ${c.categoryDeltas.contenido > 0 ? '+' : ''}${Math.round(c.categoryDeltas.contenido)}
        · Hook: ${c.categoryDeltas.hook > 0 ? '+' : ''}${Math.round(c.categoryDeltas.hook)}
        · Account: ${c.categoryDeltas.cuenta > 0 ? '+' : ''}${Math.round(c.categoryDeltas.cuenta)}
      </div>
    </div>`,
    )
    .join('');

  const html = `<div class="fg-batch-panel">
    <h3>📊 Batch Comparison: ${attempts.length} intentos</h3>

    <div class="fg-batch-stats">
      <div class="fg-stat">
        <div class="fg-stat-label">Promedio</div>
        <div class="fg-stat-value">${averageScore}/100</div>
      </div>
      <div class="fg-stat">
        <div class="fg-stat-label">Mejora</div>
        <div class="fg-stat-value" style="color: ${improvementRate >= 0 ? '#10b981' : '#ef4444'};">
          ${improvementRate > 0 ? '+' : ''}${improvementRate}%
        </div>
      </div>
      <div class="fg-stat">
        <div class="fg-stat-label">Mejor</div>
        <div class="fg-stat-value" style="font-size: 14px;">
          ${Math.round(bestAttempt.contenidoScore * 0.45 + bestAttempt.hookScore * 0.35 + bestAttempt.cuentaScore * 0.2)}/100
        </div>
      </div>
    </div>

    <h4>📈 Trends</h4>
    <div class="fg-trends">
      ${trendsHtml}
    </div>

    ${impactfulChanges.length > 0 ? `<h4>⚡ Cambios Impactantes</h4><div class="fg-changes">${changesHtml}</div>` : '<p style="color: #94a3b8; font-size: 12px;">Sin cambios significativos detectados</p>'}
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 4: Content Suggestions ───────── */

const renderContentSuggestions = (root, suggestions) => {
  const html = `<div class="fg-suggestions-panel">
    <h3>💡 Sugerencias Detalladas</h3>
    <div class="fg-suggestions-list">
      ${suggestions
        .map(
          (s) =>
            `<div class="fg-suggestion" data-category="${s.category}">
        <div class="fg-sugg-header">
          <h4>${s.title}</h4>
          <span class="fg-sugg-impact">+${s.estimatedImpact}%</span>
        </div>
        <p class="fg-sugg-desc">${s.description}</p>

        <div class="fg-sugg-section">
          <strong style="font-size: 12px; text-transform: uppercase; color: #94a3b8;">Ejemplos</strong>
          <ul style="margin: 6px 0; padding-left: 16px; font-size: 12px;">
            ${s.examples.map((ex) => `<li style="margin: 3px 0; line-height: 1.3;">${ex}</li>`).join('')}
          </ul>
        </div>

        <div class="fg-sugg-section">
          <strong style="font-size: 12px; text-transform: uppercase; color: #94a3b8;">Cómo Implementar</strong>
          <ol style="margin: 6px 0; padding-left: 16px; font-size: 12px;">
            ${s.implementationSteps.map((step) => `<li style="margin: 3px 0; line-height: 1.3;">${step}</li>`).join('')}
          </ol>
        </div>

        <div class="fg-sugg-outcome">
          <span style="font-weight: 600;">Resultado esperado:</span> ${s.expectedOutcome}
        </div>
      </div>`,
        )
        .join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 5: Performance Forecasting ───────── */

const renderPerformanceForecast = (root, forecast) => {
  const { baseline, scenarios, mostLikely } = forecast;

  const scenarioHtml = scenarios
    .map(
      (s) =>
        `<div class="fg-forecast-scenario" data-delta="${s.overallDelta}">
      <div class="fg-scenario-title">${s.name}</div>
      <div class="fg-scenario-scores">
        <span class="fg-scenario-score" style="color: #8b5cf6;">📝 ${s.projectedScores.contenido}</span>
        <span class="fg-scenario-score" style="color: #f59e0b;">🎣 ${s.projectedScores.hook}</span>
        <span class="fg-scenario-score" style="color: #10b981;">📊 ${s.projectedScores.cuenta}</span>
      </div>
      <div class="fg-scenario-overall" style="color: ${s.overallDelta >= 10 ? '#10b981' : s.overallDelta >= 5 ? '#3b82f6' : '#94a3b8'};">
        Overall: ${Math.round(
          s.projectedScores.contenido * 0.45 + s.projectedScores.hook * 0.35 + s.projectedScores.cuenta * 0.2,
        )}/100 (${s.overallDelta > 0 ? '+' : ''}${s.overallDelta})
      </div>
      <div class="fg-scenario-meta">${s.timeframe} · ${s.confidence}% confianza</div>
    </div>`,
    )
    .join('');

  const html = `<div class="fg-forecast-panel">
    <h3>🔮 Performance Forecast</h3>

    <div class="fg-forecast-baseline">
      <h4>Baseline Actual</h4>
      <div class="fg-baseline-scores">
        <span>📝 Contenido: ${baseline.contenido}</span>
        <span>🎣 Hook: ${baseline.hook}</span>
        <span>📊 Cuenta: ${baseline.cuenta}</span>
      </div>
      <div class="fg-baseline-overall">Overall: ${baseline.overall}/100</div>
    </div>

    <h4>Escenarios Proyectados</h4>
    <div class="fg-forecast-scenarios">
      ${scenarioHtml}
    </div>

    <div class="fg-forecast-likely">
      <h4>📊 Escenario Más Probable</h4>
      <p class="fg-likely-desc">Aplicar hook + content suggestions en paralelo (estrategia de velocidad)</p>
      <div class="fg-likely-score" style="font-size: 28px; font-weight: 700; color: #3b82f6;">
        +${mostLikely.overallDelta} pts
      </div>
      <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">
        Timeframe: ${mostLikely.timeframe} · Confianza: ${mostLikely.confidence}%
      </p>
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 6: A/B Testing ───────── */

const renderABTestResult = (root, result) => {
  const { variantA, variantB, winner, scoreDelta, percentLift, confidence, recommendations } = result;
  const winnerVar = winner === 'A' ? variantA : variantB;
  const loserVar = winner === 'A' ? variantB : variantA;

  const html = `<div class="fg-abtest-panel">
    <h3>🧪 A/B Test Result</h3>

    <div class="fg-abtest-winner">
      <div class="fg-ab-badge">🏆 Ganador: ${winnerVar.label}</div>
      <div class="fg-ab-score" style="font-size: 32px; font-weight: 700; color: #10b981;">
        ${winnerVar.overallScore}/100
      </div>
      <div class="fg-ab-detail">+${percentLift}% sobre perdedor · ${confidence}% confianza</div>
    </div>

    <div class="fg-abtest-comparison">
      <div class="fg-ab-card fg-ab-winner" style="border-color: #10b981;">
        <div class="fg-ab-card-label">${winnerVar.label}</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; margin: 8px 0;">
          <div>📝 ${winnerVar.scores.contenido}</div>
          <div>🎣 ${winnerVar.scores.hook}</div>
          <div>📊 ${winnerVar.scores.cuenta}</div>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #10b981;">
          ${winnerVar.overallScore}/100
        </div>
        <div class="fg-ab-rec" style="background: rgba(16, 185, 129, 0.08); color: #10b981;">
          ✅ ${recommendations.forWinner}
        </div>
      </div>

      <div class="fg-ab-card fg-ab-loser" style="border-color: #ef4444;">
        <div class="fg-ab-card-label">${loserVar.label}</div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; font-size: 12px; margin: 8px 0;">
          <div>📝 ${loserVar.scores.contenido}</div>
          <div>🎣 ${loserVar.scores.hook}</div>
          <div>📊 ${loserVar.scores.cuenta}</div>
        </div>
        <div style="font-size: 13px; font-weight: 600; color: #ef4444;">
          ${loserVar.overallScore}/100 (-${scoreDelta})
        </div>
        <div class="fg-ab-recs" style="background: rgba(239, 68, 68, 0.08);">
          ${recommendations.forLoser.map((r) => `<div style="color: #ef4444; font-size: 11px; margin: 4px 0;">💡 ${r}</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="fg-ab-recommendation" style="background: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; padding: 12px; border-radius: 6px; margin-top: 16px;">
      <strong style="color: #3b82f6;">Recomendación:</strong>
      <p style="margin: 6px 0 0 0; font-size: 12px; color: #1f2937;">
        Usa ${winnerVar.label} como versión principal. Si quieres mejorar ${loserVar.label},
        ${recommendations.forLoser[0] || 'aplica los cambios sugeridos'}.
      </p>
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 7: Competitor Benchmarking ───────── */

const renderBenchmark = (root, comparison) => {
  const { userScores, niche, gaps, topQuartileGaps, percentileRank, recommendations } = comparison;
  const userOverall = Math.round(userScores.contenido * 0.45 + userScores.hook * 0.35 + userScores.cuenta * 0.2);
  const nicheAvgOverall = Math.round(
    niche.avgContentScore * 0.45 + niche.avgHookScore * 0.35 + niche.avgAccountScore * 0.2,
  );

  const html = `<div class="fg-benchmark-panel">
    <h3>📊 Benchmark vs Mercado: ${niche.name}</h3>

    <div class="fg-bench-overall">
      <div class="fg-bench-stat">
        <div class="fg-bench-label">Tu Score</div>
        <div class="fg-bench-value" style="font-size: 32px; color: ${userOverall > nicheAvgOverall ? '#10b981' : '#f59e0b'};">
          ${userOverall}/100
        </div>
      </div>
      <div class="fg-bench-stat">
        <div class="fg-bench-label">Promedio Niche</div>
        <div class="fg-bench-value" style="font-size: 28px; color: #94a3b8;">
          ${nicheAvgOverall}/100
        </div>
      </div>
      <div class="fg-bench-stat">
        <div class="fg-bench-label">Top 25%</div>
        <div class="fg-bench-value" style="font-size: 28px; color: #3b82f6;">
          ${Math.round(niche.p75ContentScore * 0.45 + niche.p75HookScore * 0.35 + niche.p75AccountScore * 0.2)}/100
        </div>
      </div>
    </div>

    <div class="fg-bench-comparison">
      <div class="fg-bench-cat">
        <div class="fg-cat-label">📝 Contenido</div>
        <div class="fg-cat-scores">
          <span>Tú: ${userScores.contenido}</span>
          <span>Promedio: ${niche.avgContentScore}</span>
          <span>Gap: ${gaps.contenido > 0 ? '+' : ''}${gaps.contenido}</span>
        </div>
        <div class="fg-cat-percentile">Percentil: ${percentileRank.contenido}%</div>
      </div>

      <div class="fg-bench-cat">
        <div class="fg-cat-label">🎣 Hook</div>
        <div class="fg-cat-scores">
          <span>Tú: ${userScores.hook}</span>
          <span>Promedio: ${niche.avgHookScore}</span>
          <span>Gap: ${gaps.hook > 0 ? '+' : ''}${gaps.hook}</span>
        </div>
        <div class="fg-cat-percentile">Percentil: ${percentileRank.hook}%</div>
      </div>

      <div class="fg-bench-cat">
        <div class="fg-cat-label">📊 Cuenta</div>
        <div class="fg-cat-scores">
          <span>Tú: ${userScores.cuenta}</span>
          <span>Promedio: ${niche.avgAccountScore}</span>
          <span>Gap: ${gaps.cuenta > 0 ? '+' : ''}${gaps.cuenta}</span>
        </div>
        <div class="fg-cat-percentile">Percentil: ${percentileRank.cuenta}%</div>
      </div>
    </div>

    <div class="fg-bench-recs">
      <h4>Acciones Prioritarias</h4>
      ${recommendations.map((r) => `<div class="fg-bench-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 8: Seasonality & Trend Analysis ───────── */

const renderSeasonality = (root, analysis) => {
  const {
    monthlyPatterns,
    dayOfWeekAnalysis,
    trendPatterns,
    optimalPostingDays,
    optimalPostingTimes,
    seasonalRecommendations,
  } = analysis;

  const html = `<div class="fg-seasonality-panel">
    <h3>📈 Seasonality & Trend Analysis</h3>

    <div class="fg-season-trends">
      <div class="fg-trend-card">
        <div class="fg-trend-label">📅 Patrones Mensuales</div>
        <div class="fg-trend-content">
          ${monthlyPatterns.map((m) => `<div class="fg-month-stat"><span>${m.month}:</span> <strong>${m.avgEngagement}</strong> avg (${m.postCount} posts)</div>`).join('')}
        </div>
      </div>

      <div class="fg-trend-card">
        <div class="fg-trend-label">📊 Mejores Días</div>
        <div class="fg-trend-content">
          ${dayOfWeekAnalysis.map((d) => `<div class="fg-day-stat"><span>${d.day}:</span> <strong>${d.avgEngagement}</strong> avg</div>`).join('')}
        </div>
      </div>

      <div class="fg-trend-card">
        <div class="fg-trend-label">📈 Tendencias Detectadas</div>
        <div class="fg-trend-content">
          ${trendPatterns.map((t) => `<div class="fg-trend-stat"><span>${t.period}:</span> <strong>${t.trend.toUpperCase()}</strong> (${t.confidence}% confianza)</div>`).join('')}
        </div>
      </div>
    </div>

    <div class="fg-season-optimal">
      <div class="fg-optimal-box">
        <div class="fg-optimal-label">🎯 Postear en estos días:</div>
        <div class="fg-optimal-value">${optimalPostingDays.join(', ') || 'Datos insuficientes'}</div>
      </div>
      <div class="fg-optimal-box">
        <div class="fg-optimal-label">⏰ Horarios óptimos:</div>
        <div class="fg-optimal-value">${optimalPostingTimes.join(', ') || 'Datos insuficientes'}</div>
      </div>
    </div>

    <div class="fg-season-recs">
      <h4>Recomendaciones</h4>
      ${seasonalRecommendations.map((r) => `<div class="fg-season-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 9: Audience Persona Analysis ───────── */

const renderPersonaAnalysis = (root, result) => {
  const {
    personas,
    dominantPersona,
    personaGap,
    contentAllocationByPersona,
    crossPersonaOpportunity,
    recommendations,
  } = result;

  const html = `<div class="fg-persona-panel">
    <h3>👥 Audience Persona Analysis</h3>

    <div class="fg-persona-header">
      <div class="fg-dominant-persona">
        <div class="fg-persona-label">Persona Dominante</div>
        <div class="fg-persona-name">${dominantPersona.name}</div>
        <div class="fg-persona-pct">${dominantPersona.percentOfAudience}% de tu audiencia</div>
        <div class="fg-persona-ltv">LTV: ${dominantPersona.estimatedLTV}/10</div>
      </div>
    </div>

    <div class="fg-personas-grid">
      ${personas
        .map(
          (p) => `<div class="fg-persona-card">
        <div class="fg-persona-card-name">${p.name}</div>
        <div class="fg-persona-card-desc">${p.description}</div>
        <div class="fg-persona-card-pct"><strong>${p.percentOfAudience}%</strong> of audience</div>
        <div class="fg-persona-card-pain">
          <strong>Pain points:</strong>
          ${p.primaryPainPoints.map((pp) => `<div>• ${pp}</div>`).join('')}
        </div>
        <div class="fg-persona-card-cta">CTA: "${p.callToAction}"</div>
      </div>`,
        )
        .join('')}
    </div>

    ${
      personaGap
        ? `<div class="fg-persona-gap">
      <div class="fg-gap-label">🎯 Opportunity Persona (Not Yet Served):</div>
      <div class="fg-gap-name">${personaGap.name}</div>
      <div class="fg-gap-desc">${personaGap.description}</div>
      <div class="fg-gap-pain">Pain: ${personaGap.primaryPainPoints.join(', ')}</div>
    </div>`
        : ''
    }

    <div class="fg-persona-cross">
      <div class="fg-cross-label">🔗 Cross-Persona Opportunity</div>
      <div class="fg-cross-content">${crossPersonaOpportunity}</div>
    </div>

    <div class="fg-persona-recs">
      <h4>Recomendaciones</h4>
      ${recommendations.map((r) => `<div class="fg-persona-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 10: Hashtag Strategy ───────── */

const renderHashtagStrategy = (root, strategy) => {
  const { mixBreakdown, hashtagRotationStrategy, recommendations_text, optimalHashtagCount } = strategy;

  const html = `<div class="fg-hashtag-panel">
    <h3>#️⃣ Hashtag Strategy</h3>

    <div class="fg-hashtag-optimal">
      <div class="fg-optimal-label">Hashtags recomendados</div>
      <div class="fg-optimal-number">${optimalHashtagCount}</div>
    </div>

    <div class="fg-hashtag-mix">
      <div class="fg-mix-category">
        <div class="fg-mix-label">🔴 Primary (Broad)</div>
        <div class="fg-mix-tags">${mixBreakdown.primary.map((t) => `<span class="fg-tag fg-tag-primary">${t}</span>`).join('')}</div>
      </div>
      <div class="fg-mix-category">
        <div class="fg-mix-label">🟡 Secondary (Medium)</div>
        <div class="fg-mix-tags">${mixBreakdown.secondary.map((t) => `<span class="fg-tag fg-tag-secondary">${t}</span>`).join('')}</div>
      </div>
      <div class="fg-mix-category">
        <div class="fg-mix-label">🟢 Niche (Specific)</div>
        <div class="fg-mix-tags">${mixBreakdown.niche.map((t) => `<span class="fg-tag fg-tag-niche">${t}</span>`).join('')}</div>
      </div>
      <div class="fg-mix-category">
        <div class="fg-mix-label">⭐ Trending</div>
        <div class="fg-mix-tags">${mixBreakdown.trending.map((t) => `<span class="fg-tag fg-tag-trending">${t}</span>`).join('')}</div>
      </div>
    </div>

    <div class="fg-hashtag-rotation">
      <h4>Estrategia de Rotación</h4>
      ${hashtagRotationStrategy.map((week) => `<div class="fg-rotation-week">📅 ${week}</div>`).join('')}
    </div>

    <div class="fg-hashtag-recs">
      <h4>Recomendaciones</h4>
      ${recommendations_text.map((r) => `<div class="fg-hashtag-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 11: Content Calendar Planner ───────── */

const renderContentCalendar = (root, plan) => {
  const { weekPlan, contentBalance, monthlyThemes, contentGaps, recommendations } = plan;

  const html = `<div class="fg-calendar-panel">
    <h3>📅 Content Calendar Plan</h3>

    <div class="fg-balance-visual">
      <div class="fg-balance-label">Distribución Semanal</div>
      <div class="fg-balance-bars">
        <div class="fg-balance-bar" style="width: ${contentBalance.educational}%; background: #3b82f6;">
          <span class="fg-bar-label">${contentBalance.educational}%</span>
        </div>
        <div class="fg-balance-bar" style="width: ${contentBalance.inspirational}%; background: #f59e0b;">
          <span class="fg-bar-label">${contentBalance.inspirational}%</span>
        </div>
        <div class="fg-balance-bar" style="width: ${contentBalance.promotional}%; background: #10b981;">
          <span class="fg-bar-label">${contentBalance.promotional}%</span>
        </div>
        <div class="fg-balance-bar" style="width: ${contentBalance.entertainment}%; background: #ef4444;">
          <span class="fg-bar-label">${contentBalance.entertainment}%</span>
        </div>
        <div class="fg-balance-bar" style="width: ${contentBalance.behindTheScenes}%; background: #8b5cf6;">
          <span class="fg-bar-label">${contentBalance.behindTheScenes}%</span>
        </div>
      </div>
      <div class="fg-balance-legend">
        <span>📚 Educativo</span> <span>💡 Inspiracional</span> <span>🛍️ Promocional</span> <span>🎬 Entretenimiento</span> <span>👁️ BTS</span>
      </div>
    </div>

    <div class="fg-week-schedule">
      <h4>Calendario Semanal</h4>
      ${weekPlan
        .map(
          (slot) => `<div class="fg-slot">
        <div class="fg-slot-day"><strong>${slot.day}</strong></div>
        <div class="fg-slot-time">⏰ ${slot.optimalTime}</div>
        <div class="fg-slot-type">${slot.contentType.toUpperCase()}</div>
        <div class="fg-slot-format">📱 ${slot.format}</div>
        <div class="fg-slot-persona">👥 ${slot.persona}</div>
      </div>`,
        )
        .join('')}
    </div>

    <div class="fg-monthly-themes">
      <h4>Temas Mensuales</h4>
      ${monthlyThemes.map((theme) => `<div class="fg-theme">📍 ${theme}</div>`).join('')}
    </div>

    <div class="fg-content-gaps">
      <h4>Gaps Detectados</h4>
      ${contentGaps.map((gap) => `<div class="fg-gap">⚠️ ${gap}</div>`).join('')}
    </div>

    <div class="fg-calendar-recs">
      <h4>Recomendaciones</h4>
      ${recommendations.map((r) => `<div class="fg-calendar-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 12: Revenue Potential Estimate ───────── */

const renderRevenueEstimate = (root, estimate) => {
  const {
    followerCount,
    avgEngagementRate,
    cpmEstimate,
    monetizationChannels,
    totalMonthlyPotential,
    bestChannel,
    recommendations,
  } = estimate;

  const html = `<div class="fg-revenue-panel">
    <h3>💰 Revenue Potential Estimate</h3>

    <div class="fg-revenue-summary">
      <div class="fg-summary-metric">
        <div class="fg-metric-label">Followers</div>
        <div class="fg-metric-value">${followerCount.toLocaleString()}</div>
      </div>
      <div class="fg-summary-metric">
        <div class="fg-metric-label">Engagement Rate</div>
        <div class="fg-metric-value">${(avgEngagementRate * 100).toFixed(1)}%</div>
      </div>
      <div class="fg-summary-metric">
        <div class="fg-metric-label">CPM Estimate</div>
        <div class="fg-metric-value">$${cpmEstimate}/1K</div>
      </div>
    </div>

    <div class="fg-revenue-potential">
      <div class="fg-potential-label">Potencial Mensual</div>
      <div class="fg-potential-range">
        <div class="fg-range-bar">
          <div class="fg-range-low">
            <span class="fg-range-label">Conservador</span>
            <span class="fg-range-value">$${totalMonthlyPotential.conservative.toLocaleString()}</span>
          </div>
          <div class="fg-range-realistic">
            <span class="fg-range-label">Realista</span>
            <span class="fg-range-value">$${totalMonthlyPotential.realistic.toLocaleString()}</span>
          </div>
          <div class="fg-range-high">
            <span class="fg-range-label">Optimista</span>
            <span class="fg-range-value">$${totalMonthlyPotential.optimistic.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="fg-channels-grid">
      <h4>Canales de Monetización</h4>
      ${monetizationChannels
        .map(
          (ch) => `<div class="fg-channel-card ${ch.channel === bestChannel.channel ? 'fg-channel-best' : ''}">
        <div class="fg-channel-name">${ch.channel.replace('-', ' ').toUpperCase()}</div>
        <div class="fg-channel-range">$${ch.monthlyRevenue.toLocaleString()} - $${ch.monthlyRevenuePeak.toLocaleString()}</div>
        <div class="fg-channel-effort">⚡ Esfuerzo: ${ch.effort}</div>
        <div class="fg-channel-setup">⏱️ Setup: ${ch.timeToSetup}w</div>
        <div class="fg-channel-scale">📈 Escalabilidad: ${ch.scalability}</div>
        ${ch.channel === bestChannel.channel ? '<div class="fg-channel-badge">⭐ MEJOR</div>' : ''}
      </div>`,
        )
        .join('')}
    </div>

    <div class="fg-revenue-recs">
      <h4>Recomendaciones</h4>
      ${recommendations.map((r) => `<div class="fg-revenue-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* ───────── Phase 13: Account Health Scorecard ───────── */

const renderHealthScorecard = (root, scorecard) => {
  const { overallScore, overallStatus, factors, percentile, topWeaknesses, roadmapPhases, recommendations } = scorecard;

  const getScoreColor = (score) => {
    if (score < 40) return '#ef4444';
    if (score < 55) return '#f59e0b';
    if (score < 70) return '#eab308';
    if (score < 85) return '#10b981';
    return '#06b6d4';
  };

  const html = `<div class="fg-health-panel">
    <h3>🏥 Account Health Scorecard</h3>

    <div class="fg-health-overall">
      <div class="fg-overall-gauge">
        <div class="fg-gauge-score" style="color: ${getScoreColor(overallScore)};">
          <div class="fg-gauge-number">${overallScore}</div>
          <div class="fg-gauge-label">/100</div>
        </div>
        <div class="fg-gauge-status">
          <div class="fg-status-text">${overallStatus.toUpperCase()}</div>
          <div class="fg-percentile">Percentil ${percentile}th vs industria</div>
        </div>
      </div>
    </div>

    <div class="fg-factors-grid">
      <h4>8 Factores de Salud</h4>
      ${factors
        .map(
          (f) => `<div class="fg-factor-card">
        <div class="fg-factor-name">${f.name}</div>
        <div class="fg-factor-score" style="color: ${getScoreColor(f.score)};">${f.score}/100</div>
        <div class="fg-factor-bar">
          <div class="fg-bar-fill" style="width: ${f.score}%; background: ${getScoreColor(f.score)};"></div>
        </div>
        <div class="fg-factor-status">${f.status}</div>
      </div>`,
        )
        .join('')}
    </div>

    <div class="fg-weaknesses">
      <h4>🎯 Top 3 Debilidades</h4>
      ${topWeaknesses
        .map(
          (w, idx) => `<div class="fg-weakness-item">
        <div class="fg-weakness-rank">#${idx + 1}</div>
        <div class="fg-weakness-content">
          <div class="fg-weakness-factor">${w.factor} (Prioridad: ${w.priority.toUpperCase()})</div>
          <div class="fg-weakness-action">Acción: ${w.actionable}</div>
          <div class="fg-weakness-impact">Impacto: ${w.expectedImpact}</div>
        </div>
      </div>`,
        )
        .join('')}
    </div>

    <div class="fg-roadmap">
      <h4>📍 Roadmap Priorizado (12 semanas)</h4>
      ${roadmapPhases.map((phase) => `<div class="fg-roadmap-phase">✓ ${phase}</div>`).join('')}
    </div>

    <div class="fg-health-recs">
      <h4>Recomendaciones</h4>
      ${recommendations.map((r) => `<div class="fg-health-rec">💡 ${r}</div>`).join('')}
    </div>
  </div>`;

  root.insertAdjacentHTML('beforeend', html);
};

/* Phase 14, 15, 16 */
const cargarViralCoefficient = async (root) => {
  const result = await apiSafe(`/api/forge/viral/coefficient`, {
    method: 'POST',
    body: JSON.stringify({
      hookScore: 72,
      engagementHealth: 68,
      growthTrajectory: 70,
      audienceFit: 75,
      engagementTrend: 65,
      hashtagStrength: 68,
      accountHealth: 72,
      trendAlignment: 60,
    }),
  });
  if (!result.ok) {
    toast('error', 'Error viral');
    return;
  }
  const html = `<div style="padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;">
    <h3>🚀 Viral Coefficient: ${result.result.overallViralScore}/100 (${result.result.viralProbability})</h3>
    <div style="font-size:12px;color:#64748b;margin:12px 0;">Confianza: ${result.result.confidence}%</div>
    <div>${result.result.recommendation}</div>
    <div style="margin-top:12px;">${result.result.topViraDrivers.map((d) => `<div>✓ ${d}</div>`).join('')}</div>
  </div>`;
  root.insertAdjacentHTML('beforeend', html);
  toast('success', 'Viral score cargado');
};

const cargarRepurposingPlan = async (root) => {
  const result = await apiSafe(`/api/forge/repurpose/plan`, {
    method: 'POST',
    body: JSON.stringify({ engagementRate: 0.08, reach: 5000 }),
  });
  if (!result.ok) {
    toast('error', 'Error repurpose');
    return;
  }
  const html = `<div style="padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;">
    <h3>♻️ Repurposing Plan: ${result.plan.variations.length} Variaciones</h3>
    <div style="font-size:12px;color:#64748b;margin:12px 0;">${Math.round(result.plan.totalReachMultiplier)}x Reach Multiplier</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;">
    ${result.plan.variations
      .map(
        (
          v,
        ) => `<div style="padding:8px;background:white;border-radius:6px;border:1px solid rgba(17,18,22,.1);font-size:11px;">
      <strong>${v.format}</strong><br/>${v.angle}<br/>📅 ${v.publishDay}
    </div>`,
      )
      .join('')}
    </div>
  </div>`;
  root.insertAdjacentHTML('beforeend', html);
  toast('success', 'Repurposing plan cargado');
};

const cargarGrowthTrajectory = async (root) => {
  const result = await apiSafe(`/api/forge/growth/trajectory`, {
    method: 'POST',
    body: JSON.stringify({ currentFollowers: 12000, currentGrowthRate: 0.15 }),
  });
  if (!result.ok) {
    toast('error', 'Error growth');
    return;
  }
  const traj = result.trajectory;
  const html = `<div style="padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;">
    <h3>📈 Growth Trajectory: ${traj.optimisticCaseFollowers90.toLocaleString()} @ 90d (Optimistic)</h3>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:12px 0;">
    ${traj.scenarios
      .map(
        (s) => `<div style="padding:12px;background:white;border-radius:6px;border:1px solid rgba(17,18,22,.1);">
      <div style="font-weight:600;font-size:12px;">${s.label}</div>
      <div style="font-size:16px;color:#10b981;margin-top:6px;">${s.projectedFollowers['90days'].toLocaleString()}</div>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">+${s.followerGain['90days'].toLocaleString()}</div>
    </div>`,
      )
      .join('')}
    </div>
  </div>`;
  root.insertAdjacentHTML('beforeend', html);
  toast('success', 'Growth trajectory cargado');
};

/* ───────── Vista ───────── */

/* Referencia estable: así removeEventListener quita el mismo listener en cada render. */
const sincronizarPlataforma = (e) => {
  const select = document.querySelector('#fg-platform');
  if (select) select.value = e.detail?.platform === 'tiktok' ? 'tiktok' : 'instagram';
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
      .fg-warn{color:#b45309;}
      .fg-head-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
      .fg-form-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;}
      .fg-field-wide{grid-column:1 / -1;}
      .fg-field{display:flex;flex-direction:column;gap:5px;}
      .fg-label{font-size:12px;font-weight:600;color:var(--text-secondary,#666);}
      .fg-input{padding:10px 12px;background:var(--bg-soft,rgba(17,18,22,.04));border:1px solid var(--border-soft,rgba(17,18,22,.08));border-radius:9px;color:var(--text-primary,var(--fg));font-size:14px;font-family:inherit;outline:none;transition:border-color .15s,background .15s;}
      .fg-input:focus{background:var(--bg-card,#fff);border-color:rgba(225,48,108,.45);box-shadow:0 0 0 3px rgba(225,48,108,.08);}
      .fg-actions{display:flex;gap:10px;margin-top:18px;justify-content:flex-end;flex-wrap:wrap;}
      .fg-btn{padding:11px 18px;border-radius:10px;border:0;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;display:inline-flex;align-items:center;gap:8px;transition:filter .15s,transform .12s;text-decoration:none;}
      .fg-btn-primary{background:linear-gradient(135deg,#f09433,#e1306c 40%,#a855f7);color:#fff;}
      .fg-btn-primary:hover{filter:brightness(1.08);} .fg-btn-primary:active{transform:scale(.985);}
      .fg-btn-secondary{background:var(--bg-soft,rgba(17,18,22,.04));color:var(--text-primary,var(--fg));border:1px solid var(--border-soft);}
      .fg-btn-secondary:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .fg-btn-icon{font-size:16px;}
      .fg-disclaimer{font-size:11.5px;color:var(--text-tertiary);text-align:center;margin-top:10px;}

      .fg-loading{display:flex;flex-direction:column;align-items:center;gap:14px;padding:40px;color:var(--text-secondary);}
      .fg-spin{width:36px;height:36px;border:3px solid var(--border);border-top-color:#a855f7;border-radius:50%;animation:fgSpin .9s linear infinite;}
      @keyframes fgSpin{to{transform:rotate(360deg);}}

      .fg-strategy-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px;}
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
      .fg-hook-text{font-size:14px;line-height:1.4;margin-bottom:8px;}
      .fg-hook-pick{margin-top:2px;}

      .fg-cover-line{font-size:13px;margin-bottom:12px;}
      .fg-parts{display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
      .fg-part{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-part-title{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
      .fg-part-text{font-size:13.5px;line-height:1.45;white-space:pre-wrap;}
      .fg-part-note{font-size:11.5px;color:var(--text-tertiary);margin-top:6px;}

      .fg-caption{margin-bottom:14px;}
      .fg-caption-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
      .fg-caption pre{padding:12px 14px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:9px;font-family:inherit;font-size:13.5px;line-height:1.5;white-space:pre-wrap;word-wrap:break-word;}
      .fg-tiny-btn{padding:4px 10px;font-size:11px;font-weight:700;background:transparent;border:1px solid var(--border);color:var(--text-secondary);border-radius:6px;cursor:pointer;font-family:inherit;}
      .fg-tiny-btn:hover{background:var(--bg-soft);color:var(--text-primary);}
      .fg-hashtags{margin-bottom:14px;}
      .fg-hashtags strong{display:block;margin-bottom:6px;}
      .fg-tag-list{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:8px;}
      .fg-tag{padding:3px 9px;background:rgba(168,85,247,.10);color:#a855f7;font-size:12px;font-weight:600;border-radius:999px;}
      .fg-final-actions{display:flex;gap:10px;justify-content:flex-end;border-top:1px solid var(--border-soft);padding-top:14px;margin-top:14px;flex-wrap:wrap;}

      .fg-decision{padding:6px 12px;border-radius:999px;font-size:12.5px;font-weight:800;}
      .fg-signals{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin:14px 0;}
      .fg-signal{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;}
      .fg-signal-lbl{font-size:11px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
      .fg-signal-val{font-size:15px;font-weight:800;margin-bottom:2px;}
      .fg-improvements{margin-top:14px;font-size:13px;}
      .fg-improvements ul{margin:6px 0 0 16px;padding:0;display:flex;flex-direction:column;gap:6px;}

      .fg-plan{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin:12px 0;}
      .fg-plan-block{padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;font-size:13px;}
      .fg-plan-block strong{display:block;font-size:11.5px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px;}
      .fg-plan-block ol,.fg-plan-block ul{margin:4px 0 6px 18px;padding:0;display:flex;flex-direction:column;gap:4px;}
      .fg-routine{grid-column:1 / -1;}
      .fg-warn-line{grid-column:1 / -1;font-size:12.5px;padding:8px 12px;background:rgba(245,158,11,.10);border:1px solid rgba(245,158,11,.3);border-radius:8px;color:#b45309;}
      .fg-angles{margin:14px 0;}
      .fg-angle-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:8px;margin-top:8px;}
      .fg-angle{text-align:left;display:flex;flex-direction:column;gap:4px;padding:12px;border-radius:10px;border:1px solid var(--border-soft);background:var(--bg-soft,rgba(17,18,22,.03));color:var(--text-primary,var(--fg));cursor:pointer;font-family:inherit;font-size:13.5px;}
      .fg-angle:hover{background:var(--bg-hover,rgba(17,18,22,.08));}
      .fg-angle.best{border-color:#a855f7;background:linear-gradient(90deg,rgba(168,85,247,.10),transparent);}
      .fg-angle-text{font-weight:700;line-height:1.35;}
      .fg-checks{margin:14px 0;display:flex;flex-direction:column;gap:8px;}
      .fg-check{display:flex;gap:10px;align-items:flex-start;padding:10px 12px;border-radius:9px;font-size:13px;}
      .fg-check.ok{background:rgba(16,185,129,.08);}
      .fg-check.no{background:rgba(245,158,11,.10);}
      .fg-check-icon{font-weight:800;}
      .fg-check.ok .fg-check-icon{color:#10b981;}
      .fg-check.no .fg-check-icon{color:#f59e0b;}
      .fg-check-title{font-weight:700;}
      .fg-attempt{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;margin-top:8px;border-left:3px solid transparent;}
      .fg-attempt.best{border-left-color:#a855f7;background:linear-gradient(90deg,rgba(168,85,247,.08),transparent);}
      .fg-attempt-info{flex:1;display:flex;flex-direction:column;gap:4px;}
      .fg-delta{font-weight:700;display:inline-block;margin-left:6px;}
      .fg-delta.up{color:#10b981;}
      .fg-delta.down{color:#f59e0b;}

      /* Histórico + Heatmap */
      .fg-history-timeline{display:flex;flex-direction:column;gap:10px;margin-top:12px;}
      .fg-history-item{padding:12px;border-radius:10px;background:var(--bg-soft,rgba(17,18,22,.03));border-left:4px solid transparent;}
      .fg-history-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;gap:12px;}
      .fg-history-fecha{font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;}
      .fg-history-tema{font-weight:700;font-size:14px;flex:1;}
      .fg-history-scores{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0;}
      .fg-history-score{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:8px 6px;border-radius:6px;background:rgba(17,18,22,.05);min-height:50px;position:relative;}
      .fg-history-score::after{content:'';position:absolute;bottom:0;left:0;right:0;height:calc(var(--score, 0) * 1%);background:linear-gradient(to top,#10b981,#a855f7,#f59e0b,#ef4444);border-radius:0 0 6px 6px;opacity:.5;}
      .fg-history-score-total{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:8px 6px;border-radius:6px;background:rgba(17,18,22,.08);min-height:50px;font-weight:700;border:2px solid rgba(17,18,22,.2);}
      .fg-score-label{font-size:10px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px;}
      .fg-score-value{font-size:16px;font-weight:700;color:var(--text-primary);}
      .fg-history-hook{font-size:12px;color:var(--text-secondary);font-style:italic;padding:6px 0;border-top:1px solid rgba(17,18,22,.1);}

      /* Phase 2: Predictor Breakdown */
      .fg-analysis-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-analysis-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-analysis-panel h4{font-size:14px;font-weight:600;color:var(--text-primary);margin-top:16px;margin-bottom:12px;}
      .fg-overall{display:grid;grid-template-columns:1fr auto 1fr;gap:20px;padding:16px;background:rgba(17,18,22,.05);border-radius:8px;margin-bottom:20px;}
      .fg-breakdowns{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;margin-bottom:20px;}
      .fg-pred-breakdown{padding:12px;border-radius:8px;background:rgba(17,18,22,.03);}
      .fg-pred-breakdown h4{margin:0 0 8px 0;font-size:13px;}
      .fg-pred-score{font-size:20px;font-weight:700;margin:4px 0;}
      .fg-pred-summary{font-size:12px;color:var(--text-secondary);margin:8px 0;line-height:1.4;}
      .fg-pred-factors{display:flex;flex-direction:column;gap:8px;}
      .fg-pred-factor{font-size:11px;}
      .fg-pred-factor-name{font-weight:500;margin-bottom:2px;}
      .fg-pred-factor-value{font-size:10px;color:var(--text-secondary);}
      .fg-recommendations{background:rgba(17,18,22,.03);border-radius:8px;padding:12px;}
      .fg-rec{display:flex;gap:12px;padding:10px;border-radius:6px;background:white;margin-bottom:8px;border-left:4px solid #94a3b8;}
      .fg-rec[data-priority="high"]{border-left-color:#ef4444;}
      .fg-rec[data-priority="medium"]{border-left-color:#f59e0b;}
      .fg-rec[data-priority="low"]{border-left-color:#10b981;}
      .fg-rec-priority{font-size:18px;}
      .fg-rec-content{flex:1;}
      .fg-rec-content strong{font-size:13px;color:var(--text-primary);}
      .fg-rec-meta{font-size:11px;color:var(--text-secondary);margin-top:4px;}

      /* Phase 3: Batch Comparison */
      .fg-batch-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-batch-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-batch-panel h4{font-size:14px;font-weight:600;color:var(--text-primary);margin-top:16px;margin-bottom:12px;}
      .fg-batch-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;}
      .fg-stat{padding:12px;background:rgba(17,18,22,.05);border-radius:8px;text-align:center;}
      .fg-stat-label{font-size:11px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;}
      .fg-stat-value{font-size:20px;font-weight:700;color:var(--text-primary);}
      .fg-trends{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;}
      .fg-trend{padding:12px;background:rgba(17,18,22,.03);border-radius:8px;border-left:4px solid #94a3b8;}
      .fg-trend-category{font-weight:600;font-size:13px;margin-bottom:8px;}
      .fg-trend-data{display:flex;gap:8px;align-items:center;font-size:14px;}
      .fg-trend-arrow{font-size:18px;}
      .fg-trend-delta{font-weight:700;}
      .fg-trend-momentum{font-size:11px;color:var(--text-secondary);}
      .fg-changes{display:flex;flex-direction:column;gap:10px;}
      .fg-change{padding:12px;background:rgba(17,18,22,.05);border-radius:8px;border-left:4px solid #94a3b8;}
      .fg-change[data-score="0"]{border-left-color:#94a3b8;}
      .fg-change[data-score="-1"]{border-left-color:#ef4444;}
      .fg-change[data-score="1"]{border-left-color:#10b981;}
      .fg-change-title{font-weight:600;font-size:13px;margin-bottom:6px;}
      .fg-change-score{font-size:16px;font-weight:700;margin-bottom:6px;}
      .fg-change-detail{font-size:11px;color:var(--text-secondary);}

      /* Phase 4: Content Suggestions */
      .fg-suggestions-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-suggestions-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-suggestions-list{display:flex;flex-direction:column;gap:16px;}
      .fg-suggestion{padding:16px;background:white;border-radius:8px;border-left:4px solid #3b82f6;}
      .fg-suggestion[data-category="contenido"]{border-left-color:#8b5cf6;}
      .fg-suggestion[data-category="hook"]{border-left-color:#f59e0b;}
      .fg-suggestion[data-category="cuenta"]{border-left-color:#10b981;}
      .fg-sugg-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;}
      .fg-sugg-header h4{margin:0;font-size:14px;font-weight:600;color:var(--text-primary);flex:1;}
      .fg-sugg-impact{font-size:12px;font-weight:700;color:#10b981;background:rgba(16,185,129,.1);padding:2px 8px;border-radius:4px;white-space:nowrap;}
      .fg-sugg-desc{margin:8px 0;font-size:13px;color:var(--text-secondary);line-height:1.5;}
      .fg-sugg-section{margin:12px 0;font-size:12px;}
      .fg-sugg-outcome{margin-top:10px;padding-top:10px;border-top:1px solid rgba(17,18,22,.1);font-size:12px;color:var(--text-secondary);font-style:italic;}

      /* Phase 5: Performance Forecasting */
      .fg-forecast-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-forecast-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-forecast-panel h4{font-size:14px;font-weight:600;color:var(--text-primary);margin-top:16px;margin-bottom:12px;}
      .fg-forecast-baseline{padding:12px;background:rgba(17,18,22,.05);border-radius:8px;margin-bottom:20px;border-left:4px solid #94a3b8;}
      .fg-baseline-scores{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:8px 0;font-size:12px;}
      .fg-baseline-overall{font-size:16px;font-weight:700;margin-top:8px;color:var(--text-primary);}
      .fg-forecast-scenarios{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;}
      .fg-forecast-scenario{padding:12px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);}
      .fg-scenario-title{font-weight:600;font-size:13px;margin-bottom:8px;}
      .fg-scenario-scores{display:flex;gap:8px;margin-bottom:8px;font-size:12px;}
      .fg-scenario-score{font-weight:600;}
      .fg-scenario-overall{font-size:12px;font-weight:600;margin-bottom:4px;}
      .fg-scenario-meta{font-size:10px;color:#94a3b8;text-align:right;}
      .fg-forecast-likely{padding:16px;background:rgba(59,130,246,.08);border-radius:8px;border-left:4px solid #3b82f6;}
      .fg-likely-desc{margin:8px 0 12px 0;font-size:13px;color:var(--text-secondary);}

      /* Phase 6: A/B Testing */
      .fg-abtest-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-abtest-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-abtest-winner{padding:16px;background:rgba(16,185,129,.08);border-radius:8px;border-left:4px solid #10b981;margin-bottom:20px;}
      .fg-ab-badge{font-size:13px;font-weight:600;color:#10b981;margin-bottom:8px;}
      .fg-ab-detail{font-size:12px;color:#94a3b8;margin-top:6px;}
      .fg-abtest-comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:16px;margin-bottom:20px;}
      .fg-ab-card{padding:14px;border-radius:8px;background:white;border:2px solid;display:flex;flex-direction:column;}
      .fg-ab-card-label{font-weight:600;font-size:13px;margin-bottom:8px;}
      .fg-ab-winner{border-color:#10b981;}
      .fg-ab-loser{border-color:#ef4444;}
      .fg-ab-rec{padding:8px;border-radius:6px;margin-top:8px;font-size:11px;font-weight:500;}
      .fg-ab-recs{padding:8px;border-radius:6px;margin-top:8px;}
      .fg-ab-recommendation{font-size:13px;}

      /* Phase 7: Competitor Benchmarking */
      .fg-benchmark-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-benchmark-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-benchmark-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-bench-overall{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:16px;margin-bottom:24px;}
      .fg-bench-stat{padding:16px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);text-align:center;}
      .fg-bench-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;}
      .fg-bench-value{font-size:28px;font-weight:700;color:#10b981;}
      .fg-bench-comparison{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-bottom:20px;}
      .fg-bench-cat{padding:14px;border-radius:8px;background:white;border:1px solid rgba(17,18,22,.1);}
      .fg-cat-label{font-weight:600;font-size:13px;margin-bottom:8px;color:var(--text-primary);}
      .fg-cat-scores{display:flex;flex-direction:column;gap:6px;margin-bottom:8px;font-size:12px;color:#64748b;}
      .fg-cat-percentile{font-size:11px;font-weight:600;color:#3b82f6;background:rgba(59,130,246,.08);padding:6px;border-radius:4px;}
      .fg-bench-recs{padding:16px;background:rgba(59,130,246,.05);border-radius:8px;border-left:4px solid #3b82f6;}
      .fg-bench-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-bench-rec:last-child{margin-bottom:0;}

      /* Phase 8: Seasonality & Trends */
      .fg-seasonality-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-seasonality-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-seasonality-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-season-trends{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;margin-bottom:20px;}
      .fg-trend-card{padding:14px;border-radius:8px;background:white;border:1px solid rgba(17,18,22,.1);}
      .fg-trend-label{font-weight:600;font-size:12px;color:#64748b;margin-bottom:8px;}
      .fg-trend-content{display:flex;flex-direction:column;gap:6px;}
      .fg-month-stat,.fg-day-stat,.fg-trend-stat{font-size:11px;color:var(--text-primary);display:flex;justify-content:space-between;}
      .fg-season-optimal{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:20px;}
      .fg-optimal-box{padding:12px;background:rgba(16,185,129,.08);border-radius:8px;border-left:3px solid #10b981;}
      .fg-optimal-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:6px;}
      .fg-optimal-value{font-size:13px;font-weight:600;color:#10b981;}
      .fg-season-recs{padding:16px;background:rgba(59,130,246,.05);border-radius:8px;border-left:4px solid #3b82f6;}
      .fg-season-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-season-rec:last-child{margin-bottom:0;}

      /* Phase 9: Audience Personas */
      .fg-persona-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-persona-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-persona-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-persona-header{padding:16px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(59,130,246,.08));border-radius:8px;margin-bottom:20px;}
      .fg-dominant-persona{text-align:center;}
      .fg-persona-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;}
      .fg-persona-name{font-size:16px;font-weight:700;color:var(--text-primary);margin-bottom:4px;}
      .fg-persona-pct{font-size:13px;color:#10b981;font-weight:600;}
      .fg-persona-ltv{font-size:12px;color:#64748b;margin-top:4px;}
      .fg-personas-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-bottom:20px;}
      .fg-persona-card{padding:12px;border-radius:8px;background:white;border:1px solid rgba(17,18,22,.1);font-size:12px;}
      .fg-persona-card-name{font-weight:600;font-size:13px;margin-bottom:6px;color:var(--text-primary);}
      .fg-persona-card-desc{font-size:11px;color:#64748b;margin-bottom:8px;}
      .fg-persona-card-pct{color:#3b82f6;font-weight:600;margin-bottom:8px;}
      .fg-persona-card-pain{font-size:11px;color:#64748b;margin-bottom:6px;}
      .fg-persona-card-cta{font-size:11px;font-weight:600;color:#10b981;font-style:italic;}
      .fg-persona-gap{padding:12px;background:rgba(245,158,11,.05);border-radius:8px;border-left:3px solid #f59e0b;margin-bottom:16px;}
      .fg-gap-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;}
      .fg-gap-name{font-size:13px;font-weight:600;color:var(--text-primary);margin-bottom:4px;}
      .fg-gap-desc{font-size:11px;color:#64748b;margin-bottom:4px;}
      .fg-gap-pain{font-size:11px;color:#f59e0b;}
      .fg-persona-cross{padding:12px;background:rgba(59,130,246,.05);border-radius:8px;border-left:3px solid #3b82f6;margin-bottom:16px;}
      .fg-cross-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:6px;}
      .fg-cross-content{font-size:12px;color:var(--text-primary);}
      .fg-persona-recs{padding:16px;background:rgba(16,185,129,.05);border-radius:8px;border-left:4px solid #10b981;}
      .fg-persona-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-persona-rec:last-child{margin-bottom:0;}

      /* Phase 10: Hashtag Strategy */
      .fg-hashtag-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-hashtag-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-hashtag-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-hashtag-optimal{text-align:center;padding:16px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(59,130,246,.08));border-radius:8px;margin-bottom:20px;}
      .fg-optimal-label{font-size:12px;font-weight:600;color:#64748b;}
      .fg-optimal-number{font-size:32px;font-weight:700;color:#10b981;}
      .fg-hashtag-mix{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px;}
      .fg-mix-category{padding:12px;border-radius:8px;background:white;border:1px solid rgba(17,18,22,.1);}
      .fg-mix-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;}
      .fg-mix-tags{display:flex;flex-wrap:wrap;gap:6px;}
      .fg-tag{display:inline-block;font-size:11px;padding:4px 8px;border-radius:4px;font-weight:600;}
      .fg-tag-primary{background:#3b82f6;color:white;}
      .fg-tag-secondary{background:#f59e0b;color:white;}
      .fg-tag-niche{background:#10b981;color:white;}
      .fg-tag-trending{background:#ef4444;color:white;}
      .fg-hashtag-rotation{padding:12px;background:rgba(59,130,246,.05);border-radius:8px;border-left:3px solid #3b82f6;margin-bottom:16px;}
      .fg-rotation-week{font-size:12px;color:var(--text-primary);margin-bottom:6px;}
      .fg-rotation-week:last-child{margin-bottom:0;}
      .fg-hashtag-recs{padding:16px;background:rgba(16,185,129,.05);border-radius:8px;border-left:4px solid #10b981;}
      .fg-hashtag-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-hashtag-rec:last-child{margin-bottom:0;}

      /* Phase 11: Content Calendar */
      .fg-calendar-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-calendar-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-calendar-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-balance-visual{margin-bottom:20px;padding:12px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);}
      .fg-balance-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:8px;}
      .fg-balance-bars{display:flex;height:24px;border-radius:4px;overflow:hidden;margin-bottom:8px;}
      .fg-balance-bar{display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;color:white;}
      .fg-bar-label{display:none;}
      .fg-balance-legend{display:flex;flex-wrap:wrap;gap:12px;font-size:11px;color:#64748b;}
      .fg-week-schedule{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:20px;}
      .fg-slot{padding:10px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);font-size:11px;}
      .fg-slot-day{font-weight:600;color:var(--text-primary);margin-bottom:4px;}
      .fg-slot-time,.fg-slot-type,.fg-slot-format,.fg-slot-persona{font-size:10px;color:#64748b;margin-bottom:3px;}
      .fg-monthly-themes{margin-bottom:16px;padding:12px;background:rgba(59,130,246,.05);border-radius:8px;border-left:3px solid #3b82f6;}
      .fg-theme{font-size:12px;color:var(--text-primary);margin-bottom:6px;}
      .fg-theme:last-child{margin-bottom:0;}
      .fg-content-gaps{margin-bottom:16px;padding:12px;background:rgba(245,158,11,.05);border-radius:8px;border-left:3px solid #f59e0b;}
      .fg-gap{font-size:12px;color:var(--text-primary);margin-bottom:6px;}
      .fg-gap:last-child{margin-bottom:0;}
      .fg-calendar-recs{padding:16px;background:rgba(16,185,129,.05);border-radius:8px;border-left:4px solid #10b981;}
      .fg-calendar-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-calendar-rec:last-child{margin-bottom:0;}

      /* Phase 12: Revenue Potential */
      .fg-revenue-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-revenue-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-revenue-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-revenue-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-bottom:20px;}
      .fg-summary-metric{padding:12px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);text-align:center;}
      .fg-metric-label{font-size:11px;font-weight:600;color:#64748b;margin-bottom:6px;}
      .fg-metric-value{font-size:16px;font-weight:700;color:#10b981;}
      .fg-revenue-potential{padding:16px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(59,130,246,.08));border-radius:8px;margin-bottom:20px;}
      .fg-potential-label{font-size:12px;font-weight:600;color:#64748b;margin-bottom:12px;}
      .fg-potential-range{display:flex;gap:12px;}
      .fg-range-bar{display:flex;gap:12px;width:100%;}
      .fg-range-low,.fg-range-realistic,.fg-range-high{flex:1;padding:10px;background:white;border-radius:6px;border:1px solid rgba(17,18,22,.1);}
      .fg-range-label{display:block;font-size:10px;font-weight:600;color:#64748b;margin-bottom:4px;}
      .fg-range-value{display:block;font-size:14px;font-weight:700;color:#10b981;}
      .fg-channels-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:20px;}
      .fg-channel-card{padding:12px;background:white;border-radius:8px;border:1px solid rgba(17,18,22,.1);font-size:11px;position:relative;}
      .fg-channel-best{border-color:#f59e0b;border-width:2px;background:rgba(245,158,11,.05);}
      .fg-channel-name{font-weight:600;font-size:12px;color:var(--text-primary);margin-bottom:6px;}
      .fg-channel-range{color:#10b981;font-weight:600;margin-bottom:6px;}
      .fg-channel-effort,.fg-channel-setup,.fg-channel-scale{color:#64748b;margin-bottom:3px;}
      .fg-channel-badge{position:absolute;top:6px;right:6px;background:#f59e0b;color:white;padding:2px 6px;border-radius:3px;font-weight:600;font-size:9px;}
      .fg-revenue-recs{padding:16px;background:rgba(16,185,129,.05);border-radius:8px;border-left:4px solid #10b981;}
      .fg-revenue-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-revenue-rec:last-child{margin-bottom:0;}

      /* Phase 13: Account Health */
      .fg-health-panel{padding:20px;background:rgba(17,18,22,.02);border-radius:12px;margin-top:20px;border:1px solid rgba(17,18,22,.1);}
      .fg-health-panel h3{font-size:18px;font-weight:700;margin-bottom:16px;color:var(--text-primary);}
      .fg-health-panel h4{font-size:14px;font-weight:600;margin-top:16px;margin-bottom:12px;}
      .fg-health-overall{padding:20px;background:linear-gradient(135deg,rgba(16,185,129,.08),rgba(59,130,246,.08));border-radius:8px;margin-bottom:20px;}
      .fg-overall-gauge{display:flex;align-items:center;gap:16px;justify-content:center;}
      .fg-gauge-score{text-align:center;}
      .fg-gauge-number{font-size:48px;font-weight:700;}
      .fg-gauge-label{font-size:14px;color:#64748b;margin-top:4px;}
      .fg-gauge-status{text-align:center;}
      .fg-status-text{font-size:16px;font-weight:700;color:var(--text-primary);}
      .fg-percentile{font-size:12px;color:#64748b;margin-top:4px;}
      .fg-factors-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;margin-bottom:20px;}
      .fg-factor-card{padding:10px;background:white;border-radius:6px;border:1px solid rgba(17,18,22,.1);}
      .fg-factor-name{font-size:11px;font-weight:600;color:#64748b;margin-bottom:4px;}
      .fg-factor-score{font-size:16px;font-weight:700;margin-bottom:6px;}
      .fg-factor-bar{height:4px;background:rgba(17,18,22,.1);border-radius:2px;overflow:hidden;margin-bottom:4px;}
      .fg-bar-fill{height:100%;}
      .fg-factor-status{font-size:10px;color:#64748b;}
      .fg-factor-gap{font-size:10px;color:#ef4444;font-weight:600;margin-top:4px;}
      .fg-weaknesses{padding:12px;background:rgba(239,68,68,.05);border-radius:8px;border-left:3px solid #ef4444;margin-bottom:16px;}
      .fg-weakness-item{display:flex;gap:12px;margin-bottom:12px;padding:10px;background:white;border-radius:6px;}
      .fg-weakness-rank{font-weight:700;color:#ef4444;font-size:18px;}
      .fg-weakness-content{flex:1;font-size:11px;}
      .fg-weakness-factor{font-weight:600;color:var(--text-primary);margin-bottom:4px;}
      .fg-weakness-action,.fg-weakness-impact{color:#64748b;margin-bottom:3px;}
      .fg-roadmap{padding:12px;background:rgba(59,130,246,.05);border-radius:8px;border-left:3px solid #3b82f6;margin-bottom:16px;}
      .fg-roadmap-phase{font-size:12px;color:var(--text-primary);margin-bottom:6px;}
      .fg-roadmap-phase:last-child{margin-bottom:0;}
      .fg-health-recs{padding:16px;background:rgba(16,185,129,.05);border-radius:8px;border-left:4px solid #10b981;}
      .fg-health-rec{font-size:12px;color:var(--text-primary);margin-bottom:8px;line-height:1.4;}
      .fg-health-rec:last-child{margin-bottom:0;}

      @media (max-width: 640px){
        .fg-form-grid{grid-template-columns:1fr;}
        .fg-final-actions .fg-btn{flex:1 1 100%;justify-content:center;}
      }
    </style>`;

  // Event listeners para sugerencias dinámicas
  setTimeout(() => {
    const nichoInput = root.querySelector('#fg-niche');
    const topicInput = root.querySelector('#fg-topic');
    const suggestionsContainer = root.querySelector('#fg-topic-suggestions');
    const suggestionsList = root.querySelector('#fg-topic-list');

    if (nichoInput && topicInput && suggestionsContainer && suggestionsList) {
      nichoInput.addEventListener('change', () => {
        const nicho = nichoInput.value.toLowerCase();
        const sugerencias = sugerenciasTemaPorNicho[nicho];

        if (sugerencias && sugerencias.length > 0) {
          suggestionsContainer.style.display = 'block';
          suggestionsList.innerHTML = sugerencias
            .map(
              (s) => `
              <button
                type="button"
                style="
                  padding: 4px 8px;
                  background: #e0f2fe;
                  border: 1px solid #0284c7;
                  border-radius: 4px;
                  color: #0c4a6e;
                  font-size: 11px;
                  cursor: pointer;
                "
                onclick="document.querySelector('#fg-topic').value='${s.replace(/'/g, "\\'")}'; document.querySelector('#fg-topic-suggestions').style.display='none';"
              >
                ${escape(s)}
              </button>
            `,
            )
            .join('');
        } else {
          suggestionsContainer.style.display = 'none';
        }
      });
    }
  }, 100);

  root.onclick = (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-action]') : null;
    if (!btn) return;
    manejarAccion(root, btn.dataset.action, btn.dataset.idx);
  };

  window.removeEventListener('feedia:platform', sincronizarPlataforma);
  window.addEventListener('feedia:platform', sincronizarPlataforma);

  renderOutput(root);
};
