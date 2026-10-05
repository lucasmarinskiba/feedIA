import { api, apiBust, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const RUTA = '/api/executive/collabs';

const TIPOS_PROSPECTO = { marca: 'Marca', creador: 'Creador', medio: 'Medio', otro: 'Otro' };
const PLATAFORMAS = { instagram: 'Instagram', tiktok: 'TikTok', otra: 'Otra' };
const FILTROS_PIPELINE = [
  { id: 'todos', label: 'Todos' },
  { id: 'idea', label: 'Ideas' },
  { id: 'contactado', label: 'Contactados' },
  { id: 'negociando', label: 'Negociando' },
  { id: 'confirmado', label: 'Confirmados' },
  { id: 'completado', label: 'Completados' },
  { id: 'descartado', label: 'Descartados' },
];

const ESTILOS = `<style>
  .co-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .co-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .co-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .co-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .co-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
  .co-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .co-btn:disabled{opacity:.5;cursor:not-allowed;}
  .co-seg{display:inline-flex;border:1px solid var(--border,rgba(255,255,255,.12));border-radius:10px;overflow:hidden;}
  .co-seg button{border:none;background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;}
  .co-seg button.on{background:#fdba74;color:#111;}
  .co-perfil{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;padding:14px 16px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .co-perfil-datos{display:flex;gap:18px;flex-wrap:wrap;font-size:12.5px;color:var(--text-tertiary,#a1a1aa);}
  .co-perfil-datos b{color:var(--text-primary,#fafafa);font-size:14px;}
  .co-bloque{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,#0f0f10);display:flex;flex-direction:column;gap:12px;}
  .co-bloque h3{margin:0;font-size:14px;}
  .co-ayuda{font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;margin:0;}
  .co-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;}
  .co-item{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
  .co-item strong{font-size:13px;line-height:1.4;}
  .co-item p{margin:0;font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;}
  .co-item .co-pie{margin-top:auto;}
  .co-tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;background:rgba(255,255,255,.06);color:var(--text-secondary,#d4d4d8);}
  .co-prio{color:#fdba74;}
  .co-consejos{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.55;color:var(--text-secondary,#d4d4d8);}
  .co-cifras{display:flex;gap:6px;flex-wrap:wrap;}
  .co-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 11px;border-radius:999px;font-size:12px;cursor:pointer;}
  .co-chip.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .co-chip em{font-style:normal;opacity:.7;margin-left:4px;}
  .co-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}
  .co-campo{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--text-secondary,#d4d4d8);}
  .co-campo.ancho{grid-column:1/-1;}
  .co-campo input,.co-campo select,.co-campo textarea{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 11px;color:inherit;font:inherit;font-size:13px;font-weight:400;}
  .co-lista{display:flex;flex-direction:column;gap:10px;}
  .co-pro{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:14px 16px;background:var(--bg-card,#0f0f10);display:grid;grid-template-columns:minmax(180px,1fr) minmax(200px,1.4fr) auto;gap:14px;align-items:start;}
  .co-pro-handle{font-weight:700;font-size:14px;}
  .co-pro-meta{font-size:12px;color:var(--text-tertiary,#a1a1aa);margin-top:3px;line-height:1.5;}
  .co-pro-notas{font-size:12.5px;color:var(--text-secondary,#d4d4d8);line-height:1.5;}
  .co-pro-acciones{display:flex;flex-direction:column;gap:6px;align-items:flex-end;}
  .co-pro-acciones .co-fila{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
  .co-estado{padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;}
  details.co-plantilla{width:100%;grid-column:1/-1;}
  details.co-plantilla summary{cursor:pointer;font-size:12px;color:var(--text-secondary,#d4d4d8);font-weight:600;}
  details.co-plantilla textarea{width:100%;min-height:110px;margin-top:8px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:10px;color:inherit;font:inherit;font-size:12.5px;line-height:1.5;}
  .co-vacio{padding:24px 16px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .co-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  @media (max-width:820px){ .co-pro{grid-template-columns:1fr;} .co-pro-acciones{align-items:flex-start;} .co-pro-acciones .co-fila{justify-content:flex-start;} }
</style>`;

const state = {
  datos: null,
  error: false,
  cargando: false,
  filtro: 'todos',
  formulario: false,
  ideas: null,
  fuenteIdeas: null,
  pidiendoIdeas: false,
  ocupado: null,
};

const enlazados = new WeakSet();

const razonDe = (err, respaldo) =>
  typeof err?.code === 'string' && !err.code.startsWith('HTTP_') ? err.code : respaldo;

const num = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString('es-AR'));
const pct = (ratio) =>
  ratio === null || ratio === undefined ? '—' : `${(ratio * 100).toFixed(2).replace('.', ',')} %`;

const prospectosFiltrados = () => {
  const lista = state.datos?.prospectos ?? [];
  return state.filtro === 'todos' ? lista : lista.filter((p) => p.estado === state.filtro);
};

const perfilHtml = () => {
  const perfil = state.datos?.perfil;
  if (!perfil) return '';
  const tipo = perfil.tipoMarca;
  return `
    <div class="co-perfil">
      <div>
        <div class="co-ayuda" style="margin-bottom:6px;">Tipo de cuenta: las recomendaciones cambian según sea marca personal o empresa.</div>
        <div class="co-seg" role="group" aria-label="Tipo de cuenta">
          <button data-co-accion="tipo" data-tipo="personal" class="${tipo === 'personal' ? 'on' : ''}">Marca personal</button>
          <button data-co-accion="tipo" data-tipo="empresa" class="${tipo === 'empresa' ? 'on' : ''}">Empresa</button>
        </div>
      </div>
      <div class="co-perfil-datos">
        <div>Seguidores<br><b>${num(perfil.seguidores)}</b></div>
        <div>Interacción mediana<br><b>${pct(perfil.tasaMediana)}</b></div>
        <div>Nicho<br><b>${escape(perfil.nicho || 'sin definir')}</b></div>
      </div>
    </div>`;
};

const recomendacionesHtml = () => {
  const recs = state.datos?.recomendaciones ?? [];
  if (recs.length === 0) return '<div class="co-vacio">Sin recomendaciones todavía.</div>';
  return `<div class="co-grid">${recs
    .map(
      (r) => `
      <div class="co-item">
        <div><span class="co-prio">Prioridad ${r.prioridad}</span></div>
        <strong>${escape(r.titulo)}</strong>
        <p>${escape(r.porQue)}</p>
        <p class="co-pie"><b>Dónde buscar:</b> ${escape(r.dondeBuscar)}</p>
      </div>`,
    )
    .join('')}</div>`;
};

const ideasHtml = () => {
  if (!state.ideas) return '';
  const origen =
    state.fuenteIdeas === 'ia'
      ? 'Ideas de la IA según tu cuenta. Revisá cada perfil antes de escribirle.'
      : 'Ideas de reglas (la IA no respondió en este momento).';
  return `
    <p class="co-ayuda">${escape(origen)}</p>
    <div class="co-grid">${state.ideas
      .map(
        (i) => `
        <div class="co-item">
          <strong>${escape(i.titulo)}</strong>
          <p>${escape(i.criterio)}</p>
          <p class="co-pie"><b>Buscá:</b> ${escape(i.busqueda)}</p>
        </div>`,
      )
      .join('')}</div>`;
};

const tiktokHtml = () => {
  const opciones = state.datos?.tiktok ?? [];
  return `<div class="co-grid">${opciones
    .map(
      (o) => `
      <div class="co-item">
        <strong>${escape(o.nombre)}</strong>
        <p>${escape(o.descripcion)}</p>
        <p><b>Cómo:</b> ${escape(o.paso)}</p>
        <a class="co-btn primario co-pie" href="${escape(o.url)}" target="_blank" rel="noopener noreferrer">Abrir en TikTok ↗</a>
      </div>`,
    )
    .join('')}</div>`;
};

const consejosHtml = () => {
  const consejos = state.datos?.consejos ?? [];
  return `<ol class="co-consejos">${consejos.map((c) => `<li>${escape(c)}</li>`).join('')}</ol>`;
};

const pipelineResumenHtml = () => {
  const resumen = state.datos?.resumen ?? {};
  const total = Object.values(resumen).reduce((s, n) => s + n, 0);
  const chips = FILTROS_PIPELINE.map((f) => {
    const n = f.id === 'todos' ? total : (resumen[f.id] ?? 0);
    return `<button class="co-chip ${state.filtro === f.id ? 'on' : ''}" data-co-accion="filtro" data-filtro="${f.id}">${escape(f.label)}<em>${n}</em></button>`;
  }).join('');
  return `<div class="co-cifras">${chips}</div>`;
};

const formularioHtml = () => `
  <form class="co-bloque" id="co-form" novalidate ${state.formulario ? '' : 'hidden'}>
    <h3>Nuevo prospecto</h3>
    <div class="co-form">
      <label class="co-campo">Usuario <input name="handle" maxlength="61" placeholder="@usuario" required /></label>
      <label class="co-campo">Plataforma
        <select name="plataforma">${Object.entries(PLATAFORMAS)
          .map(([v, l]) => `<option value="${v}">${l}</option>`)
          .join('')}</select>
      </label>
      <label class="co-campo">Tipo
        <select name="tipo">${Object.entries(TIPOS_PROSPECTO)
          .map(([v, l]) => `<option value="${v}">${l}</option>`)
          .join('')}</select>
      </label>
      <label class="co-campo">Nicho <input name="nicho" maxlength="80" /></label>
      <label class="co-campo">Seguidores <input name="seguidores" type="number" min="0" /></label>
      <label class="co-campo ancho">Notas <textarea name="notas" rows="2" maxlength="500"></textarea></label>
    </div>
    <div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;">
      <button type="button" class="co-btn" data-co-accion="cerrar-formulario">Cancelar</button>
      <button type="submit" class="co-btn primario">Guardar prospecto</button>
    </div>
  </form>`;

const prospectoHtml = (p) => {
  const estado = state.datos.estados?.[p.estado] ?? { label: p.estado, color: '#a1a1aa' };
  const siguientes = state.datos.transiciones?.[p.estado] ?? [];
  const ocupado = state.ocupado === p.id;
  const plantilla = state.datos.plantilla ?? { asunto: '', cuerpo: '' };
  const texto = `${plantilla.asunto}\n\n${plantilla.cuerpo.replace('{handle}', p.handle)}`;
  return `
    <article class="co-pro" data-prospecto="${escape(p.id)}">
      <div>
        <div class="co-pro-handle">${escape(p.handle)}</div>
        <div class="co-pro-meta">${escape(PLATAFORMAS[p.plataforma] ?? p.plataforma)} · ${escape(TIPOS_PROSPECTO[p.tipo] ?? p.tipo)}${p.nicho ? ` · ${escape(p.nicho)}` : ''}${p.seguidores !== null && p.seguidores !== undefined ? ` · ${num(p.seguidores)} seguidores` : ''}</div>
        <span class="co-estado" style="margin-top:8px;display:inline-block;color:${estado.color};background:rgba(255,255,255,.06);">${escape(estado.label)}</span>
      </div>
      <div class="co-pro-notas">${p.notas ? escape(p.notas) : '<span class="co-ayuda">Sin notas.</span>'}</div>
      <div class="co-pro-acciones">
        <div class="co-fila">
          ${
            siguientes
              .map((e) => {
                const info = state.datos.estados?.[e] ?? { label: e };
                return `<button class="co-btn" data-co-accion="estado" data-id="${escape(p.id)}" data-estado="${e}" ${ocupado ? 'disabled' : ''}>→ ${escape(info.label)}</button>`;
              })
              .join('') || '<span class="co-ayuda">Sin pasos pendientes.</span>'
          }
        </div>
      </div>
      <details class="co-plantilla">
        <summary>Mensaje sugerido para ${escape(p.handle)}</summary>
        <textarea readonly aria-label="Mensaje sugerido">${escape(texto)}</textarea>
      </details>
    </article>`;
};

const pipelineListaHtml = () => {
  const lista = prospectosFiltrados();
  if ((state.datos?.prospectos ?? []).length === 0) {
    return '<div class="co-vacio">Todavía no hay prospectos. Sumá marcas o creadores que te interesen y seguí cada paso hasta confirmar la colaboración.</div>';
  }
  if (lista.length === 0) return '<div class="co-vacio">Ningún prospecto en este estado.</div>';
  return lista.map(prospectoHtml).join('');
};

const pintar = (root) => {
  const perfil = root.querySelector('#co-perfil');
  if (perfil) perfil.innerHTML = perfilHtml();
  const recs = root.querySelector('#co-recs');
  if (recs) recs.innerHTML = recomendacionesHtml();
  const ideas = root.querySelector('#co-ideas');
  if (ideas) ideas.innerHTML = ideasHtml();
  const tt = root.querySelector('#co-tiktok');
  if (tt) tt.innerHTML = tiktokHtml();
  const cons = root.querySelector('#co-consejos');
  if (cons) cons.innerHTML = consejosHtml();
  const resumen = root.querySelector('#co-pipeline-resumen');
  if (resumen) resumen.innerHTML = pipelineResumenHtml();
  const lista = root.querySelector('#co-pipeline-lista');
  if (lista) lista.innerHTML = pipelineListaHtml();
  const form = root.querySelector('#co-form');
  if (form) form.hidden = !state.formulario;
};

const cargar = async (root, refrescar = false) => {
  state.cargando = true;
  if (refrescar) apiBust(RUTA);
  const { data, error } = await apiSafe(RUTA, null, { noCache: true });
  state.cargando = false;
  state.error = Boolean(error);
  if (data) state.datos = data;
  if (state.error) {
    const aviso = '<div class="co-error">No se pudo cargar Collabs. Revisá la conexión con el backend.</div>';
    root.querySelector('#co-perfil').innerHTML = aviso;
    root.querySelector('#co-pipeline-lista').innerHTML = '';
    return;
  }
  pintar(root);
};

const mutar = async (root, path, body, okMsg, metodo = 'POST') => {
  try {
    const salida = await api(path, { method: metodo, body });
    apiBust(RUTA);
    if (okMsg) toast(okMsg, 'ok');
    await cargar(root);
    return salida;
  } catch (err) {
    toast(razonDe(err, 'No se pudo completar la acción'), 'crit');
    return null;
  }
};

const pedirIdeas = async (root) => {
  if (state.pidiendoIdeas) return;
  state.pidiendoIdeas = true;
  const boton = root.querySelector('#co-btn-ideas');
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Pensando…';
  }
  try {
    const res = await api(`${RUTA}/ideas`, { body: {} });
    state.ideas = res.ideas ?? [];
    state.fuenteIdeas = res.fuente ?? 'reglas';
    pintar(root);
  } catch (err) {
    toast(razonDe(err, 'No se pudieron generar ideas'), 'crit');
  } finally {
    state.pidiendoIdeas = false;
    if (boton) {
      boton.disabled = false;
      boton.textContent = '✨ Ideas con IA';
    }
  }
};

const montarEstructura = (root) => {
  root.innerHTML = `${ESTILOS}
    <div class="co-wrap">
      <div class="co-cab">
        <div>
          <h2>🤝 Collabs</h2>
          <p>Qué colaboraciones conviene para tu cuenta, con quién hacerlas y dónde buscarlas. Seguí cada prospecto desde la primera idea hasta la colaboración confirmada.</p>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button class="co-btn" data-co-accion="refrescar">↻ Actualizar</button>
        </div>
      </div>
      <div id="co-perfil">${loadingScreen()}</div>
      <section class="co-bloque">
        <h3>Colaboraciones recomendadas</h3>
        <div id="co-recs"></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
          <button class="co-btn primario" id="co-btn-ideas" data-co-accion="ideas">✨ Ideas con IA</button>
          <span class="co-ayuda">Busca tipos de colaborador concretos según tu cuenta. No inventa perfiles.</span>
        </div>
        <div id="co-ideas"></div>
      </section>
      <section class="co-bloque">
        <h3>Colaboraciones de TikTok</h3>
        <p class="co-ayuda">Los botones llevan a TikTok. Los requisitos y el alcance de cada opción los define la plataforma; revisalos antes de postularte.</p>
        <div id="co-tiktok"></div>
      </section>
      <section class="co-bloque">
        <h3>Consejos para colaborar</h3>
        <div id="co-consejos"></div>
      </section>
      <section class="co-bloque">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
          <h3>Pipeline de prospectos</h3>
          <button class="co-btn primario" data-co-accion="nuevo-prospecto">+ Nuevo prospecto</button>
        </div>
        <div id="co-pipeline-resumen"></div>
        ${formularioHtml()}
        <div class="co-lista" id="co-pipeline-lista"></div>
      </section>
    </div>`;
};

const enlazar = (root) => {
  if (enlazados.has(root)) return;
  enlazados.add(root);
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-co-accion]');
    if (!el || !root.contains(el)) return;
    const accion = el.dataset.coAccion;
    if (accion === 'filtro') {
      state.filtro = el.dataset.filtro;
      pintar(root);
      return;
    }
    if (accion === 'refrescar') {
      await cargar(root, true);
      return;
    }
    if (accion === 'ideas') {
      await pedirIdeas(root);
      return;
    }
    if (accion === 'nuevo-prospecto') {
      state.formulario = !state.formulario;
      pintar(root);
      root.querySelector('#co-form input[name="handle"]')?.focus();
      return;
    }
    if (accion === 'cerrar-formulario') {
      state.formulario = false;
      pintar(root);
      return;
    }
    if (accion === 'tipo') {
      await mutar(root, `${RUTA}/perfil`, { tipoMarca: el.dataset.tipo }, 'Tipo de cuenta actualizado', 'PUT');
      return;
    }
    if (accion === 'estado') {
      state.ocupado = el.dataset.id;
      pintar(root);
      await mutar(
        root,
        `${RUTA}/prospectos/${encodeURIComponent(el.dataset.id)}/estado`,
        { estado: el.dataset.estado },
        'Estado actualizado',
      );
      state.ocupado = null;
      pintar(root);
    }
  });
  root.addEventListener('submit', async (e) => {
    if (e.target.id !== 'co-form') return;
    e.preventDefault();
    const form = e.target;
    const datos = Object.fromEntries(new FormData(form).entries());
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await api(`${RUTA}/prospectos`, { body: datos });
      apiBust(RUTA);
      toast('Prospecto guardado', 'ok');
      state.formulario = false;
      form.reset();
      await cargar(root);
    } catch (err) {
      toast(razonDe(err, 'No se pudo guardar el prospecto'), 'crit');
    } finally {
      boton.disabled = false;
    }
  });
};

export const renderCollab = async (root) => {
  state.datos = null;
  state.error = false;
  state.filtro = 'todos';
  state.formulario = false;
  state.ideas = null;
  state.fuenteIdeas = null;
  state.ocupado = null;
  montarEstructura(root);
  enlazar(root);
  await cargar(root);
};
