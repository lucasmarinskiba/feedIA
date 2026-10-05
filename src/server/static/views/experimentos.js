import { api, apiBust, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const RUTA = '/api/executive/experiments';

const ESTADOS = {
  borrador: { label: 'Borrador', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)' },
  corriendo: { label: 'Corriendo', color: '#fbbf24', fondo: 'rgba(251,191,36,.14)' },
  cerrado: { label: 'Cerrado', color: '#6ee7b7', fondo: 'rgba(16,185,129,.14)' },
  descartado: { label: 'Descartado', color: '#fca5a5', fondo: 'rgba(248,113,113,.12)' },
};

const ESTILOS = `<style>
  .ex-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .ex-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .ex-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .ex-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .ex-acciones-top{display:flex;gap:8px;flex-wrap:wrap;}
  .ex-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}
  .ex-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .ex-btn:disabled{opacity:.5;cursor:not-allowed;}
  .ex-btn.peligro{color:#fca5a5;border-color:rgba(248,113,113,.35);}
  .ex-aviso{padding:12px 14px;border-radius:12px;background:rgba(251,191,36,.1);color:#fcd34d;font-size:13px;line-height:1.5;}
  .ex-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;}
  .ex-cifra{padding:12px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .ex-cifra span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .ex-cifra strong{font-size:22px;letter-spacing:-0.02em;}
  .ex-bloque{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,#0f0f10);display:flex;flex-direction:column;gap:12px;}
  .ex-bloque h3{margin:0;font-size:14px;}
  .ex-sug-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;}
  .ex-sug{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
  .ex-sug strong{font-size:13px;line-height:1.4;}
  .ex-sug p{margin:0;font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;}
  .ex-form-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;}
  .ex-campo{display:flex;flex-direction:column;gap:6px;font-size:12px;font-weight:600;color:var(--text-secondary,#d4d4d8);}
  .ex-campo.ancho{grid-column:1/-1;}
  .ex-campo span{font-weight:400;color:var(--text-tertiary,#a1a1aa);}
  .ex-campo input,.ex-campo select,.ex-campo textarea{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 11px;color:inherit;font:inherit;font-size:13px;font-weight:400;}
  .ex-ayuda{margin:0;font-size:12px;color:var(--text-tertiary,#a1a1aa);}
  .ex-lista{display:flex;flex-direction:column;gap:14px;}
  .ex-card{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,#0f0f10);display:flex;flex-direction:column;gap:12px;}
  .ex-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;font-size:11px;}
  .ex-tag{padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text-secondary,#d4d4d8);font-size:11px;}
  .ex-estado{padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;}
  .ex-card h4{margin:0;font-size:15px;line-height:1.4;}
  .ex-card .ex-sub{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;}
  .ex-vars{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;}
  .ex-var{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:10px;}
  .ex-var.ganadora{border-color:rgba(16,185,129,.55);background:rgba(16,185,129,.06);}
  .ex-var-cab{display:flex;align-items:center;gap:8px;font-size:13px;}
  .ex-letra{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:6px;background:#fdba74;color:#111;font-weight:800;font-size:12px;}
  .ex-var-cifras{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .ex-var-cifras span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,#a1a1aa);}
  .ex-var-cifras b{font-size:15px;font-variant-numeric:tabular-nums;}
  .ex-veredicto{border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.5;}
  .ex-veredicto strong{font-size:14px;}
  .ex-barra{height:8px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;}
  .ex-barra i{display:block;height:100%;background:#fdba74;border-radius:999px;}
  .ex-progreso{font-size:12px;color:var(--text-tertiary,#a1a1aa);}
  .ex-picker{display:flex;flex-direction:column;gap:6px;max-height:420px;overflow:auto;padding-right:4px;}
  .ex-pub{display:flex;justify-content:space-between;gap:10px;align-items:center;padding:9px 10px;border-radius:10px;border:1px solid var(--border,rgba(255,255,255,.07));}
  .ex-pub-info{display:flex;flex-direction:column;gap:3px;min-width:0;}
  .ex-pub-titulo{font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .ex-pub-meta{font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .ex-seg{display:flex;gap:4px;flex-shrink:0;}
  .ex-seg button{min-width:34px;height:30px;border-radius:8px;border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);font-weight:700;font-size:12px;cursor:pointer;}
  .ex-seg button.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .ex-seg button.sin.on{background:rgba(255,255,255,.12);color:inherit;border-color:rgba(255,255,255,.2);}
  .ex-tabla{width:100%;border-collapse:collapse;font-size:12px;}
  .ex-tabla th,.ex-tabla td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));}
  .ex-tabla th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,#a1a1aa);font-weight:600;}
  .ex-tabla td.n{text-align:right;font-variant-numeric:tabular-nums;}
  .ex-acciones{display:flex;gap:8px;flex-wrap:wrap;}
  .ex-vacio{padding:24px 16px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .ex-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
</style>`;

const VEREDICTO_TONO = {
  'gana-A': { fondo: 'rgba(16,185,129,.12)', color: '#6ee7b7' },
  'gana-B': { fondo: 'rgba(16,185,129,.12)', color: '#6ee7b7' },
  'sin-diferencia': { fondo: 'rgba(161,161,170,.12)', color: '#d4d4d8' },
  'datos-insuficientes': { fondo: 'rgba(251,191,36,.1)', color: '#fcd34d' },
};

const state = {
  datos: null,
  error: false,
  cargando: false,
  sugerencias: null,
  fuenteSugerencias: null,
  pidiendoSugerencias: false,
};

const razonDe = (err, respaldo) =>
  typeof err?.code === 'string' && !err.code.startsWith('HTTP_') ? err.code : respaldo;

const enlazados = new WeakSet();

const num = (n) => (Number(n) || 0).toLocaleString('es-AR');
const pct = (ratio, decimales = 2) => `${(ratio * 100).toFixed(decimales).replace('.', ',')} %`;
const fechaCorta = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-AR');
};
const recortar = (texto, max) => (texto.length > max ? `${texto.slice(0, max - 1)}…` : texto);

const metricaLabel = (metrica) => state.datos?.metricas?.[metrica]?.label ?? metrica;

const contar = (experimentos) => ({
  borradores: experimentos.filter((e) => e.estado === 'borrador').length,
  corriendo: experimentos.filter((e) => e.estado === 'corriendo').length,
  cerrados: experimentos.filter((e) => e.estado === 'cerrado').length,
  ganadores: experimentos.filter((e) => e.estado === 'cerrado' && e.resultado?.veredicto?.startsWith('gana')).length,
});

const avisoConexion = () => {
  const c = state.datos?.conectado;
  if (!c || c.instagram || c.tiktok) return '';
  return '<div class="ex-aviso">No hay cuentas conectadas: los experimentos usan publicaciones reales. Conectá Instagram o TikTok para empezar.</div>';
};

const cifrasHtml = (experimentos) => {
  const c = contar(experimentos);
  return `
    <div class="ex-cifra"><span>Borradores</span><strong>${c.borradores}</strong></div>
    <div class="ex-cifra"><span>Corriendo</span><strong>${c.corriendo}</strong></div>
    <div class="ex-cifra"><span>Cerrados</span><strong>${c.cerrados}</strong></div>
    <div class="ex-cifra"><span>Con ganador</span><strong>${c.ganadores}</strong></div>`;
};

const sugerenciasHtml = () => {
  if (!state.sugerencias) return '';
  const origen =
    state.fuenteSugerencias === 'ia'
      ? 'Sugerencias de los agentes IA según tus publicaciones.'
      : 'Plantillas base de la industria (la IA no respondió en este momento).';
  return `
    <div class="ex-bloque">
      <h3>Ideas para testear</h3>
      <p class="ex-ayuda">${escape(origen)}</p>
      <div class="ex-sug-grid">
        ${state.sugerencias
          .map(
            (s, i) => `
          <div class="ex-sug">
            <strong>${escape(s.hipotesis)}</strong>
            <p>${escape(s.razon)}</p>
            <p><span class="ex-tag">${escape(s.variable)}</span> <span class="ex-tag">${escape(metricaLabel(s.metrica))}</span></p>
            <button class="ex-btn primario" data-ex-accion="usar-sugerencia" data-idx="${i}">Usar esta idea</button>
          </div>`,
          )
          .join('')}
      </div>
    </div>`;
};

const varianteHtml = (letra, v, ganadora) => `
  <div class="ex-var ${ganadora ? 'ganadora' : ''}">
    <div class="ex-var-cab"><span class="ex-letra">${letra}</span><strong>${escape(v.nombre)}</strong>${ganadora ? '<span class="ex-tag">Ganadora</span>' : ''}</div>
    <div class="ex-var-cifras">
      <div><span>Con datos</span><b>${v.conDatos}/${v.asignadas}</b></div>
      <div><span>Alcance</span><b>${num(v.alcance)}</b></div>
      <div><span>Tasa</span><b>${v.tasa === null ? '—' : pct(v.tasa)}</b></div>
    </div>
  </div>`;

const veredictoHtml = (exp) => {
  const r = exp.resultado;
  if (!r) return '';
  const tono = VEREDICTO_TONO[r.veredicto] ?? VEREDICTO_TONO['sin-diferencia'];
  const titulo = {
    'gana-A': `Gana ${escape(r.variantes.A.nombre)}`,
    'gana-B': `Gana ${escape(r.variantes.B.nombre)}`,
    'sin-diferencia': 'Sin ganador',
    'datos-insuficientes': 'Faltan datos',
  }[r.veredicto];
  const confianza =
    r.probabilidadB === null
      ? ''
      : `
    <div>Confianza de que ${escape(r.variantes.B.nombre)} supera a ${escape(r.variantes.A.nombre)}: <b>${pct(r.probabilidadB, 1)}</b></div>
    <div class="ex-barra"><i style="width:${Math.round(r.probabilidadB * 100)}%"></i></div>`;
  const diferencia =
    r.diferenciaPct === null
      ? ''
      : `<div>Diferencia de tasa vs. ${escape(r.variantes.A.nombre)}: <b>${r.diferenciaPct > 0 ? '+' : ''}${r.diferenciaPct.toFixed(1).replace('.', ',')} %</b></div>`;
  const faltantes =
    r.faltantes > 0
      ? `<div class="ex-progreso">${r.faltantes} publicación(es) asignadas ya no están entre tus últimas publicaciones y no cuentan.</div>`
      : '';
  return `
    <div class="ex-veredicto" style="background:${tono.fondo};color:${tono.color};">
      <strong>${titulo}</strong>
      <div>${escape(r.explicacion)}</div>
      ${confianza}${diferencia}${faltantes}
    </div>`;
};

const progresoHtml = (exp) => {
  if (!exp.progreso) return '';
  const { diasTranscurridos, diasTotales, listoParaCerrar } = exp.progreso;
  const avance = Math.min(100, Math.round((diasTranscurridos / diasTotales) * 100));
  return `
    <div class="ex-progreso">Día ${Math.min(diasTranscurridos, diasTotales)} de ${diasTotales}${listoParaCerrar ? ' · listo para cerrar' : ''}</div>
    <div class="ex-barra"><i style="width:${avance}%"></i></div>`;
};

const selectorHtml = (exp, publicaciones) => {
  if (publicaciones.length === 0) {
    return '<div class="ex-vacio">No hay publicaciones para asignar. Conectá Instagram o TikTok y publicá contenido.</div>';
  }
  const asignada = new Map();
  for (const letra of ['A', 'B']) {
    for (const id of exp.variantes[letra].postIds) asignada.set(id, letra);
  }
  return `<div class="ex-picker">${publicaciones
    .map((p) => {
      const actual = asignada.get(p.id) ?? null;
      const boton = (letra) =>
        `<button class="${actual === letra ? 'on' : ''}" data-ex-accion="asignar" data-id="${escape(exp.id)}" data-pub="${escape(p.id)}" data-var="${actual === letra ? '' : letra}" aria-label="Variante ${letra}">${letra}</button>`;
      return `
        <div class="ex-pub">
          <div class="ex-pub-info">
            <span class="ex-pub-titulo">${escape(recortar(p.titulo || 'Sin texto', 90))}</span>
            <span class="ex-pub-meta">${escape(p.plataforma === 'tiktok' ? 'TikTok' : 'Instagram')} · ${escape(p.formato)} · ${fechaCorta(p.publicadoEn)} · alcance ${p.alcance === null ? 'sin medir' : num(p.alcance)}</span>
          </div>
          <div class="ex-seg">${boton('A')}${boton('B')}<button class="sin ${actual === null ? 'on' : ''}" data-ex-accion="asignar" data-id="${escape(exp.id)}" data-pub="${escape(p.id)}" data-var="" aria-label="Sin variante">—</button></div>
        </div>`;
    })
    .join('')}</div>`;
};

const detalleHtml = (exp, publicaciones) => {
  const porId = new Map(publicaciones.map((p) => [p.id, p]));
  const filas = ['A', 'B']
    .flatMap((letra) =>
      exp.variantes[letra].postIds.map((id) => {
        const p = porId.get(id);
        const valor = p ? p[exp.metrica] : null;
        return `<tr>
          <td>${letra} · ${escape(exp.variantes[letra].nombre)}</td>
          <td>${p ? escape(recortar(p.titulo || 'Sin texto', 70)) : '<i>Ya no está entre tus últimas publicaciones</i>'}</td>
          <td class="n">${p && p.alcance !== null ? num(p.alcance) : '—'}</td>
          <td class="n">${p && valor !== null && valor !== undefined ? num(valor) : '—'}</td>
        </tr>`;
      }),
    )
    .join('');
  if (!filas) return '';
  return `
    <table class="ex-tabla">
      <thead><tr><th>Variante</th><th>Publicación</th><th class="n">Alcance</th><th class="n">${escape(metricaLabel(exp.metrica))}</th></tr></thead>
      <tbody>${filas}</tbody>
    </table>`;
};

const accionesHtml = (exp) => {
  const id = escape(exp.id);
  if (exp.estado === 'borrador') {
    return `
      <button class="ex-btn primario" data-ex-accion="iniciar" data-id="${id}">▶ Iniciar experimento</button>
      <button class="ex-btn peligro" data-ex-accion="descartar" data-id="${id}">Descartar</button>`;
  }
  if (exp.estado === 'corriendo') {
    return `
      <button class="ex-btn primario" data-ex-accion="cerrar" data-id="${id}">✓ Cerrar y registrar resultado</button>
      <button class="ex-btn peligro" data-ex-accion="descartar" data-id="${id}">Descartar</button>`;
  }
  return '';
};

const tarjetaHtml = (exp, publicaciones) => {
  const estado = ESTADOS[exp.estado] ?? ESTADOS.borrador;
  const ganadora = exp.resultado?.veredicto === 'gana-A' ? 'A' : exp.resultado?.veredicto === 'gana-B' ? 'B' : null;
  const cuerpo =
    exp.estado === 'borrador'
      ? `<div class="ex-bloque" style="border:none;padding:0;"><h3>Elegí publicaciones para cada variante</h3>
           <p class="ex-ayuda">Mínimo 2 por variante. Una publicación no puede estar en las dos. Al iniciar, la selección queda fija.</p>
           ${selectorHtml(exp, publicaciones)}</div>`
      : exp.estado === 'descartado'
        ? `<div class="ex-sub">Motivo: ${escape(exp.motivoDescarte ?? 'sin motivo indicado')}</div>`
        : `${progresoHtml(exp)}
           <div class="ex-vars">${varianteHtml('A', exp.resultado.variantes.A, ganadora === 'A')}${varianteHtml('B', exp.resultado.variantes.B, ganadora === 'B')}</div>
           ${veredictoHtml(exp)}
           ${detalleHtml(exp, publicaciones)}`;
  return `
    <article class="ex-card">
      <div class="ex-meta">
        <span class="ex-estado" style="color:${estado.color};background:${estado.fondo};">${escape(estado.label)}</span>
        <span class="ex-tag">${escape(metricaLabel(exp.metrica))}</span>
        <span class="ex-tag">Mejora mínima ${exp.umbralMejora} %</span>
        <span class="ex-tag">${exp.duracionDias} días</span>
        <span class="ex-progreso">Creado ${fechaCorta(exp.creadoEn)}</span>
      </div>
      <div>
        <h4>${escape(exp.hipotesis)}</h4>
        <div class="ex-sub">Variable: ${escape(exp.variable)}</div>
      </div>
      ${cuerpo}
      ${accionesHtml(exp) ? `<div class="ex-acciones">${accionesHtml(exp)}</div>` : ''}
    </article>`;
};

const listaHtml = () => {
  if (state.error)
    return '<div class="ex-error">No se pudieron cargar los experimentos. Revisá la conexión con el backend.</div>';
  if (state.cargando && !state.datos) return loadingScreen();
  const experimentos = state.datos?.experimentos ?? [];
  if (experimentos.length === 0) {
    return '<div class="ex-vacio">Todavía no hay experimentos. Creá uno o pedí ideas a los agentes: cada test compara publicaciones reales y te dice si hay ganador.</div>';
  }
  return experimentos.map((exp) => tarjetaHtml(exp, state.datos.publicaciones ?? [])).join('');
};

const pintar = (root) => {
  const metrica = root.querySelector('select[name="metrica"]');
  if (metrica && !metrica.options.length && state.datos?.metricas) metrica.innerHTML = opcionesMetricas();
  const aviso = root.querySelector('#ex-aviso');
  if (aviso) aviso.innerHTML = avisoConexion();
  const cifras = root.querySelector('#ex-cifras');
  if (cifras) cifras.innerHTML = cifrasHtml(state.datos?.experimentos ?? []);
  const sug = root.querySelector('#ex-sugerencias');
  if (sug) sug.innerHTML = sugerenciasHtml();
  const lista = root.querySelector('#ex-lista');
  if (lista) lista.innerHTML = listaHtml();
};

const cargar = async (root, refrescar = false) => {
  state.cargando = true;
  pintar(root);
  const { data, error } = await apiSafe(`${RUTA}${refrescar ? '?refrescar=1' : ''}`, null, { noCache: true });
  state.cargando = false;
  state.error = Boolean(error);
  if (data) state.datos = data;
  pintar(root);
};

const mutar = async (root, path, body, okMsg) => {
  try {
    await api(path, { body: body ?? {} });
    apiBust(RUTA);
    if (okMsg) toast(okMsg, 'ok');
    await cargar(root);
    return true;
  } catch (err) {
    toast(razonDe(err, 'No se pudo completar la acción'), 'crit');
    return false;
  }
};

const formulario = (root) => root.querySelector('#ex-form-wrap');

const abrirFormulario = (root, valores = null) => {
  const wrap = formulario(root);
  if (!wrap) return;
  const form = wrap.querySelector('form');
  form.reset();
  if (valores) {
    for (const [campo, valor] of Object.entries(valores)) {
      if (form.elements[campo]) form.elements[campo].value = valor;
    }
  }
  wrap.hidden = false;
  form.elements.hipotesis.focus();
  wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const cerrarFormulario = (root) => {
  const wrap = formulario(root);
  if (wrap) wrap.hidden = true;
};

const opcionesMetricas = () =>
  Object.entries(state.datos?.metricas ?? {})
    .map(([id, m]) => `<option value="${escape(id)}">${escape(m.label)} — ${escape(m.ayuda)}</option>`)
    .join('');

const formHtml = () => `
    <form class="ex-bloque" id="ex-form" novalidate>
      <h3>Nuevo experimento</h3>
      <div class="ex-form-grid">
        <label class="ex-campo ancho">Hipótesis <span>Si cambio X, entonces Y, porque Z.</span>
          <textarea name="hipotesis" rows="2" maxlength="300" required></textarea></label>
        <label class="ex-campo">Variable que cambia <input name="variable" maxlength="120" required></label>
        <label class="ex-campo">Métrica principal <select name="metrica"></select></label>
        <label class="ex-campo">Mejora mínima (%) <input name="umbralMejora" type="number" min="1" max="100" value="10" required></label>
        <label class="ex-campo">Duración (días) <input name="duracionDias" type="number" min="1" max="60" value="14" required></label>
        <label class="ex-campo">Nombre variante A (base) <input name="nombreA" maxlength="60" value="Original"></label>
        <label class="ex-campo">Nombre variante B (prueba) <input name="nombreB" maxlength="60" value="Variante"></label>
      </div>
      <p class="ex-ayuda">Después de crear, asigná publicaciones reales a cada variante. Al iniciar, la selección queda fija y se mide con el alcance de cada post.</p>
      <div class="ex-acciones">
        <button type="button" class="ex-btn" data-ex-accion="cancelar-formulario">Cancelar</button>
        <button type="submit" class="ex-btn primario">Crear borrador</button>
      </div>
    </form>`;

const montarEstructura = (root) => {
  root.innerHTML = `${ESTILOS}
    <div class="ex-wrap">
      <div class="ex-cab">
        <div>
          <h2>🧪 Experimentos</h2>
          <p>Compará dos variantes de contenido con publicaciones reales. FeedIA mide la tasa por alcance y declara ganador solo con 95 % de confianza.</p>
        </div>
        <div class="ex-acciones-top">
          <button class="ex-btn primario" data-ex-accion="nuevo">+ Nuevo experimento</button>
          <button class="ex-btn" data-ex-accion="sugerir" id="ex-btn-sugerir">✨ Sugerir ideas</button>
          <button class="ex-btn" data-ex-accion="refrescar">↻ Actualizar</button>
        </div>
      </div>
      <div id="ex-aviso"></div>
      <div class="ex-cifras" id="ex-cifras"></div>
      <div id="ex-sugerencias"></div>
      <div id="ex-form-wrap" hidden>${formHtml()}</div>
      <div class="ex-lista" id="ex-lista">${loadingScreen()}</div>
    </div>`;
};

const pedirSugerencias = async (root) => {
  const boton = root.querySelector('#ex-btn-sugerir');
  if (state.pidiendoSugerencias) return;
  state.pidiendoSugerencias = true;
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Pensando…';
  }
  try {
    const res = await api(`${RUTA}/sugerir`, { body: {} });
    state.sugerencias = res.sugerencias ?? [];
    state.fuenteSugerencias = res.fuente ?? 'plantilla';
    pintar(root);
  } catch (err) {
    toast(razonDe(err, 'No se pudieron generar ideas'), 'crit');
  } finally {
    state.pidiendoSugerencias = false;
    if (boton) {
      boton.disabled = false;
      boton.textContent = '✨ Sugerir ideas';
    }
  }
};

const manejarAccion = async (root, accion, el) => {
  const id = el.dataset.id;
  switch (accion) {
    case 'nuevo':
      abrirFormulario(root);
      return;
    case 'cancelar-formulario':
      cerrarFormulario(root);
      return;
    case 'refrescar':
      await cargar(root, true);
      return;
    case 'sugerir':
      await pedirSugerencias(root);
      return;
    case 'usar-sugerencia': {
      const s = state.sugerencias?.[Number(el.dataset.idx)];
      if (s) abrirFormulario(root, { ...s });
      return;
    }
    case 'asignar':
      await mutar(root, `${RUTA}/${encodeURIComponent(id)}/publicaciones`, {
        publicacionId: el.dataset.pub,
        variante: el.dataset.var || null,
      });
      return;
    case 'iniciar':
      await mutar(root, `${RUTA}/${encodeURIComponent(id)}/iniciar`, {}, 'Experimento iniciado');
      return;
    case 'cerrar':
      if (!window.confirm('¿Cerrar el experimento y registrar el veredicto con los datos actuales?')) return;
      await mutar(root, `${RUTA}/${encodeURIComponent(id)}/cerrar`, {}, 'Experimento cerrado');
      return;
    case 'descartar': {
      const motivo = window.prompt('Motivo del descarte (opcional):');
      if (motivo === null) return;
      await mutar(root, `${RUTA}/${encodeURIComponent(id)}/descartar`, { motivo }, 'Experimento descartado');
      return;
    }
    default:
      return;
  }
};

const enlazar = (root) => {
  if (enlazados.has(root)) return;
  enlazados.add(root);
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-ex-accion]');
    if (!el || !root.contains(el)) return;
    e.preventDefault();
    el.disabled = true;
    try {
      await manejarAccion(root, el.dataset.exAccion, el);
    } finally {
      el.disabled = false;
    }
  });
  root.addEventListener('submit', async (e) => {
    if (e.target.id !== 'ex-form') return;
    e.preventDefault();
    const form = e.target;
    const datos = Object.fromEntries(new FormData(form).entries());
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      const creado = await api(RUTA, {
        body: {
          ...datos,
          umbralMejora: Number(datos.umbralMejora),
          duracionDias: Number(datos.duracionDias),
        },
      });
      apiBust(RUTA);
      toast('Borrador creado: elegí las publicaciones de cada variante', 'ok');
      cerrarFormulario(root);
      await cargar(root);
      root
        .querySelector(`[data-id="${CSS.escape(creado.id)}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch (err) {
      toast(razonDe(err, 'No se pudo crear el experimento'), 'crit');
    } finally {
      boton.disabled = false;
    }
  });
};

export const renderExperimentos = async (root) => {
  state.error = false;
  state.sugerencias = null;
  montarEstructura(root);
  enlazar(root);
  await cargar(root);
};
