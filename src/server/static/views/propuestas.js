import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const RUTA = '/api/executive/proposals';

const PRIORIDAD = {
  alta: { label: 'Alta', color: '#fbbf24', fondo: 'rgba(251,191,36,.14)' },
  media: { label: 'Media', color: '#60a5fa', fondo: 'rgba(96,165,250,.14)' },
  baja: { label: 'Baja', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)' },
};

const OBJETIVOS = ['Exposición', 'Retención', 'Gusto'];

const FILTROS_OBJETIVO = [
  { id: 'todas', label: 'Todas' },
  { id: 'Exposición', label: 'Exposición' },
  { id: 'Retención', label: 'Retención' },
  { id: 'Gusto', label: 'Gusto' },
  { id: 'operativas', label: 'Operativas' },
];

const ESTILOS = `<style>
  .pr-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .pr-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .pr-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .pr-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .pr-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}
  .pr-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .pr-btn.peligro{color:#fca5a5;border-color:rgba(248,113,113,.35);}
  .pr-btn:disabled{opacity:.5;cursor:not-allowed;}
  .pr-chips{display:flex;gap:6px;flex-wrap:wrap;align-items:center;}
  .pr-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 11px;border-radius:999px;font-size:12px;cursor:pointer;}
  .pr-chip.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .pr-select{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:7px 10px;color:inherit;font:inherit;font-size:12.5px;}
  .pr-aviso{padding:12px 14px;border-radius:12px;background:rgba(251,191,36,.1);color:#fcd34d;font-size:13px;line-height:1.5;}
  .pr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px;}
  .pr-card{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,#0f0f10);display:flex;flex-direction:column;gap:10px;}
  .pr-head{display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;}
  .pr-agente{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:var(--text-secondary,#d4d4d8);}
  .pr-tags{display:flex;gap:5px;flex-wrap:wrap;}
  .pr-tag{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text-secondary,#d4d4d8);}
  .pr-titulo{margin:0;font-size:15px;font-weight:600;letter-spacing:-0.01em;line-height:1.35;}
  .pr-paso{margin:0;font-size:13px;color:var(--text-secondary,#d4d4d8);line-height:1.5;}
  .pr-gancho{margin:0;padding:9px 11px;border-radius:10px;background:rgba(253,186,116,.08);border-left:3px solid #fdba74;font-size:12.5px;line-height:1.5;}
  .pr-gancho span,.pr-dato span,.pr-senal span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:var(--text-tertiary,#a1a1aa);margin-bottom:3px;}
  .pr-estructura{margin:0;padding-left:18px;font-size:12.5px;line-height:1.55;color:var(--text-secondary,#d4d4d8);display:flex;flex-direction:column;gap:3px;}
  .pr-dato{padding:9px 11px;border-radius:10px;background:var(--bg-hover,rgba(255,255,255,.04));font-size:12px;line-height:1.45;color:var(--text-secondary,#d4d4d8);}
  .pr-senal{font-size:12px;color:var(--text-secondary,#d4d4d8);line-height:1.45;}
  .pr-base{font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .pr-acciones{display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid var(--border,rgba(255,255,255,.08));margin-top:auto;}
  .pr-vacio{padding:28px 18px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;border:1px dashed var(--border,rgba(255,255,255,.1));border-radius:14px;}
  .pr-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  @media (max-width:720px){ .pr-grid{grid-template-columns:1fr;} }
</style>`;

const state = { datos: [], error: false, cargando: false, objetivo: 'todas', agente: 'todos', ocupado: null };
const enlazados = new WeakSet();

const razonDe = (err, respaldo) =>
  typeof err?.code === 'string' && !err.code.startsWith('HTTP_') ? err.code : respaldo;

const esOperativa = (p) => !p.objetivo;

const filtradas = () =>
  state.datos.filter((p) => {
    if (state.objetivo === 'operativas' && !esOperativa(p)) return false;
    if (state.objetivo !== 'todas' && state.objetivo !== 'operativas' && p.objetivo !== state.objetivo) return false;
    if (state.agente !== 'todos' && p.agente !== state.agente) return false;
    return true;
  });

const agentesDisponibles = () => [...new Set(state.datos.map((p) => p.agente))];

const baseHtml = (p) =>
  p.base === 'datos'
    ? '<span class="pr-tag" style="color:#6ee7b7;background:rgba(16,185,129,.12);">Basado en tus datos</span>'
    : p.base === 'buenas-practicas'
      ? '<span class="pr-tag">Buena práctica</span>'
      : '';

const tarjetaHtml = (p) => {
  const pr = PRIORIDAD[p.prioridad] ?? PRIORIDAD.media;
  const ocupado = state.ocupado === p.id;
  const estructura =
    Array.isArray(p.estructura) && p.estructura.length > 0
      ? `<div><span class="pr-tag" style="margin-bottom:4px;display:inline-block;">Estructura</span><ol class="pr-estructura">${p.estructura.map((x) => `<li>${escape(x)}</li>`).join('')}</ol></div>`
      : '';
  return `
    <article class="pr-card" data-prop-id="${escape(p.id)}">
      <header class="pr-head">
        <span class="pr-agente"><span>${escape(p.emoji ?? '')}</span>${escape(p.agente)}</span>
        <div class="pr-tags">
          ${p.objetivo ? `<span class="pr-tag">${escape(p.objetivo)}</span>` : ''}
          <span class="pr-tag" style="color:${pr.color};background:${pr.fondo};">${escape(pr.label)}</span>
        </div>
      </header>
      <h3 class="pr-titulo">${escape(p.titulo)}</h3>
      <p class="pr-paso">${escape(p.detalle)}</p>
      ${p.gancho ? `<div class="pr-gancho"><span>Primeros segundos</span>${escape(p.gancho)}</div>` : ''}
      ${estructura}
      ${p.senal ? `<div class="pr-senal"><span>Mirá</span>${escape(p.senal)}</div>` : ''}
      <div class="pr-dato"><span>Dato</span>${escape(p.dato)}</div>
      <div class="pr-base">${baseHtml(p)}</div>
      <footer class="pr-acciones">
        <button class="pr-btn peligro" data-pr-accion="descartar" data-id="${escape(p.id)}" ${ocupado ? 'disabled' : ''}>Descartar</button>
        <button class="pr-btn primario" data-pr-accion="aceptar" data-id="${escape(p.id)}" data-tipo="${escape(p.accion?.tipo ?? '')}" data-valor="${escape(p.accion?.valor ?? '')}" ${ocupado ? 'disabled' : ''}>${escape(p.accion?.label ?? 'Aceptar')}</button>
      </footer>
    </article>`;
};

const filtrosHtml = () => `
  ${FILTROS_OBJETIVO.map((f) => `<button class="pr-chip ${state.objetivo === f.id ? 'on' : ''}" data-pr-accion="objetivo" data-valor="${escape(f.id)}">${escape(f.label)}</button>`).join('')}`;

const opcionesAgentes = () =>
  `<option value="todos">Todos los agentes</option>${agentesDisponibles()
    .map((a) => `<option value="${escape(a)}">${escape(a)}</option>`)
    .join('')}`;

const listaHtml = () => {
  if (state.error)
    return '<div class="pr-error">No se pudieron cargar las propuestas. Revisá la conexión con el backend.</div>';
  if (state.cargando && state.datos.length === 0) return loadingScreen();
  if (state.datos.length === 0) {
    return '<div class="pr-vacio">Sin propuestas por ahora. Cuando tus agentes tengan algo que sugerirte, aparece acá con el dato que lo originó. Conectá Instagram o TikTok para que las propuestas usen tus números.</div>';
  }
  const lista = filtradas();
  if (lista.length === 0) return '<div class="pr-vacio">Ninguna propuesta coincide con el filtro.</div>';
  return `<div class="pr-grid">${lista.map(tarjetaHtml).join('')}</div>`;
};

const pintar = (root) => {
  const chips = root.querySelector('#pr-chips');
  if (chips) chips.innerHTML = filtrosHtml();
  const agentes = root.querySelector('#pr-agente');
  if (agentes) {
    const opciones = opcionesAgentes();
    if (agentes.dataset.opciones !== opciones) {
      agentes.innerHTML = opciones;
      agentes.dataset.opciones = opciones;
    }
    agentes.value = state.agente;
  }
  const lista = root.querySelector('#pr-lista');
  if (lista) lista.innerHTML = listaHtml();
  const cuenta = root.querySelector('#pr-cuenta');
  if (cuenta) cuenta.textContent = state.datos.length ? `${state.datos.length} propuesta(s)` : '';
};

const cargar = async (root) => {
  state.cargando = true;
  pintar(root);
  const { data, error } = await apiSafe(RUTA, [], { noCache: true });
  state.cargando = false;
  state.error = Boolean(error);
  state.datos = Array.isArray(data) ? data : [];
  pintar(root);
};

const resolver = async (root, id, estado) => {
  state.ocupado = id;
  pintar(root);
  try {
    await api(`${RUTA}/resolver`, { body: { id, estado } });
    state.datos = state.datos.filter((p) => p.id !== id);
    return true;
  } catch (err) {
    toast(razonDe(err, 'No se pudo guardar la decisión'), 'crit');
    return false;
  } finally {
    state.ocupado = null;
    pintar(root);
  }
};

const ejecutarAccion = (tipo, valor) => {
  if (tipo === 'tab') {
    document.querySelector(`.v2-tab[data-tab="${valor}"]`)?.click();
    return;
  }
  if (valor) window.location.hash = `#${valor}`;
};

const montarEstructura = (root) => {
  root.innerHTML = `${ESTILOS}
    <div class="pr-wrap">
      <div class="pr-cab">
        <div>
          <h2>💡 Propuestas del equipo</h2>
          <p>Ideas de los agentes para que más gente vea tu contenido, se quede hasta el final y le guste. Cada una dice qué hacer, cómo empezar y qué mirar para saber si funcionó.</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span id="pr-cuenta" class="pr-tag"></span>
          <button class="pr-btn" data-pr-accion="refrescar">↻ Actualizar</button>
        </div>
      </div>
      <div class="pr-chips" id="pr-filtros">
        <span id="pr-chips" style="display:contents;"></span>
        <select class="pr-select" id="pr-agente" aria-label="Agente"></select>
      </div>
      <div id="pr-lista">${loadingScreen()}</div>
    </div>`;
};

const enlazar = (root) => {
  if (enlazados.has(root)) return;
  enlazados.add(root);
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-pr-accion]');
    if (!el || !root.contains(el)) return;
    const accion = el.dataset.prAccion;
    if (accion === 'objetivo') {
      state.objetivo = el.dataset.valor;
      pintar(root);
      return;
    }
    if (accion === 'refrescar') {
      await cargar(root);
      return;
    }
    if (accion === 'descartar') {
      if (await resolver(root, el.dataset.id, 'descartada')) toast('Propuesta descartada', 'info');
      return;
    }
    if (accion === 'aceptar') {
      if (await resolver(root, el.dataset.id, 'aceptada')) ejecutarAccion(el.dataset.tipo, el.dataset.valor);
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target.id !== 'pr-agente') return;
    state.agente = e.target.value;
    pintar(root);
  });
};

export const renderPropuestas = async (root) => {
  state.datos = [];
  state.error = false;
  state.objetivo = 'todas';
  state.agente = 'todos';
  state.ocupado = null;
  montarEstructura(root);
  enlazar(root);
  await cargar(root);
};
