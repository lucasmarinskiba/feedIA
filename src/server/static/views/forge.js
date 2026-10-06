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

const buildForm = (platform) => `
  <div class="fg-card">
    <h2 class="fg-section-title">Decile a Forge qué crear</h2>
    <p class="fg-section-sub">Estrategia usa tu historial real y genera hooks con IA · Producción consume tu cuota del plan · Predicción calibra con tus posts guardados.</p>

    <div class="fg-form-grid">
      <label class="fg-field fg-field-wide">
        <span class="fg-label">¿Sobre qué?</span>
        <input class="fg-input" id="fg-topic" placeholder="Ej: cómo automatizar tu marketing con IA" autocomplete="off" />
      </label>
      <label class="fg-field">
        <span class="fg-label">Plataforma</span>
        <select class="fg-input" id="fg-platform">${opciones(PLATAFORMAS, platform)}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Formato</span>
        <select class="fg-input" id="fg-format">${opciones(FORMATOS, 'reel')}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Objetivo</span>
        <select class="fg-input" id="fg-goal">${opciones(OBJETIVOS, 'engagement')}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Nicho</span>
        <input class="fg-input" id="fg-niche" placeholder="Ej: marketing, fitness, IA" autocomplete="off" />
      </label>
      <label class="fg-field">
        <span class="fg-label">Voz de marca</span>
        <select class="fg-input" id="fg-voice">${VOCES.map((v) => `<option value="${v}">${v.charAt(0).toUpperCase() + v.slice(1)}</option>`).join('')}</select>
      </label>
      <label class="fg-field fg-field-wide">
        <span class="fg-label">Ángulos que ya usa la competencia (opcional, separados por coma)</span>
        <input class="fg-input" id="fg-competitors" placeholder="Ej: tutorial paso a paso, tips de productividad" autocomplete="off" />
      </label>
    </div>

    <div class="fg-actions">
      <button class="fg-btn fg-btn-secondary" data-action="estrategia">1 · Estrategia</button>
      <button class="fg-btn fg-btn-secondary" data-action="producir">2 · Producir</button>
      <button class="fg-btn fg-btn-primary" data-action="todo"><span class="fg-btn-icon">✨</span>Generar todo</button>
    </div>
    <p class="fg-disclaimer">Estrategia y predicción usan tus posts guardados (sincronizalos desde Predictor). Si la cuenta no tiene historial, Forge lo dice en vez de inventar cifras.</p>
  </div>`;

const leerEntrada = () => {
  const val = (id) => document.querySelector(`#${id}`)?.value ?? '';
  return {
    tema: val('fg-topic').trim(),
    plataforma: val('fg-platform') || 'instagram',
    formato: val('fg-format') || 'reel',
    objetivo: val('fg-goal') || 'engagement',
    nicho: val('fg-niche').trim(),
    voz: val('fg-voice') || 'cercano',
    competidores: val('fg-competitors')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
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
  const filas = estado.intentos
    .map((it, i) => {
      const anterior = i > 0 ? estado.intentos[i - 1].prediccion.contenido.puntaje : null;
      const diff = anterior === null ? null : it.prediccion.contenido.puntaje - anterior;
      const cambio =
        diff === null
          ? ''
          : diff === 0
            ? ' · sin cambio vs anterior'
            : ` · ${diff > 0 ? '↑' : '↓'} ${Math.abs(diff)} pts vs anterior`;
      return `
      <div class="fg-attempt ${i === estado.activo ? 'best' : ''}">
        <div>
          <strong>Intento ${it.n}</strong>
          <span class="fg-tiny-muted">contenido ${it.prediccion.contenido.puntaje}/100 · hook ${it.prediccion.hook.puntaje}/100${cambio}</span>
        </div>
        <button class="fg-tiny-btn" data-action="ver-intento" data-idx="${i}">${i === estado.activo ? '✔ En uso' : 'Usar este'}</button>
      </div>`;
    })
    .join('');
  return `<div class="fg-card"><h3 class="fg-section-title">Intentos</h3><p class="fg-section-sub">Elegí cuál versión usar. Los intentos quedan guardados mientras no generes algo nuevo.</p>${filas}</div>`;
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
  if (entrada.tema) return true;
  toast('Decile sobre qué crear contenido', 'warn');
  root.querySelector('#fg-topic')?.focus();
  return false;
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
    default:
      return undefined;
  }
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
      .fg-attempt{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px;background:var(--bg-soft,rgba(17,18,22,.03));border-radius:10px;margin-top:8px;border-left:3px solid transparent;}
      .fg-attempt.best{border-left-color:#a855f7;}

      @media (max-width: 640px){
        .fg-form-grid{grid-template-columns:1fr;}
        .fg-final-actions .fg-btn{flex:1 1 100%;justify-content:center;}
      }
    </style>`;

  root.onclick = (ev) => {
    const btn = ev.target instanceof Element ? ev.target.closest('[data-action]') : null;
    if (!btn) return;
    manejarAccion(root, btn.dataset.action, btn.dataset.idx);
  };

  window.removeEventListener('feedia:platform', sincronizarPlataforma);
  window.addEventListener('feedia:platform', sincronizarPlataforma);

  renderOutput(root);
};
