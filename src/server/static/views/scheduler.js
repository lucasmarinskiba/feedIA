import { api, apiBust, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const RUTA = '/api/executive/scheduler';

const ESTADOS = {
  activo: { label: 'Activo', color: '#6ee7b7', fondo: 'rgba(16,185,129,.14)' },
  pausado: { label: 'Pausado', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)' },
  'con-error': { label: 'Con error', color: '#fca5a5', fondo: 'rgba(248,113,113,.14)' },
  'sin-ejecuciones': { label: 'Sin ejecuciones', color: '#fcd34d', fondo: 'rgba(251,191,36,.12)' },
};

const FILTROS = [
  { id: 'todos', label: 'Todos' },
  { id: 'activos', label: 'Activos' },
  { id: 'pausados', label: 'Pausados' },
  { id: 'error', label: 'Con error' },
];

const ESTILOS = `<style>
  .sc-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .sc-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .sc-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .sc-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .sc-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}
  .sc-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .sc-btn.peligro{color:#fca5a5;border-color:rgba(248,113,113,.35);}
  .sc-btn:disabled{opacity:.5;cursor:not-allowed;}
  .sc-aviso{padding:12px 14px;border-radius:12px;background:rgba(251,191,36,.1);color:#fcd34d;font-size:13px;line-height:1.5;}
  .sc-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;}
  .sc-cifra{padding:12px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .sc-cifra span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .sc-cifra strong{display:block;font-size:24px;line-height:1.1;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;margin-top:6px;}
  .sc-cifra small{display:block;margin-top:6px;font-size:11.5px;color:var(--text-tertiary,#a1a1aa);}
  .sc-cifra{border-top:3px solid transparent;}
  .sc-acento-verde{border-top-color:#34d399 !important;}
  .sc-acento-rojo{border-top-color:#f87171 !important;}
  .sc-acento-gris{border-top-color:#a1a1aa !important;}
  .sc-acento-naranja{border-top-color:#fdba74 !important;}
  .sc-acento-neutro{border-top-color:#60a5fa !important;}
  .sc-prox{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
  .sc-prox li{display:grid;grid-template-columns:150px minmax(160px,auto) 1fr;gap:12px;align-items:center;padding:8px 10px;border-radius:10px;background:var(--bg-hover,rgba(255,255,255,.03));font-size:12.5px;}
  .sc-prox-hora{font-weight:700;font-variant-numeric:tabular-nums;color:#fdba74;}
  .sc-prox code{font-size:12.5px;}
  @media (max-width:820px){ .sc-prox li{grid-template-columns:1fr;gap:4px;} }
  .sc-barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;}
  .sc-barra .sc-chips{flex:1 1 auto;justify-content:flex-end;min-width:0;}
  .sc-buscar{flex:1 1 220px;min-width:180px;max-width:340px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 12px;color:inherit;font:inherit;font-size:13.5px;}
  .sc-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .sc-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 11px;border-radius:999px;font-size:12px;cursor:pointer;}
  .sc-chip.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .sc-lista{display:flex;flex-direction:column;gap:10px;}
  .sc-job{border:1px solid var(--border,rgba(255,255,255,.08));border-left:3px solid var(--sc-color,transparent);border-radius:14px;padding:14px 16px;background:var(--bg-card,#0f0f10);display:grid;grid-template-columns:minmax(200px,1.4fr) minmax(180px,1fr) minmax(160px,1fr) auto;gap:14px;align-items:center;}
  .sc-job.pausado{opacity:.7;}
  .sc-nombre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;font-weight:700;word-break:break-all;}
  .sc-desc{font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;margin-top:3px;}
  .sc-horario{font-size:13px;font-weight:600;}
  .sc-cron{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;color:var(--text-tertiary,#a1a1aa);margin-top:2px;}
  .sc-meta{font-size:12px;color:var(--text-secondary,#d4d4d8);line-height:1.5;}
  .sc-meta small{display:block;color:var(--text-tertiary,#a1a1aa);font-size:11px;}
  .sc-tag{display:inline-block;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700;}
  .sc-acciones{display:flex;flex-direction:column;gap:8px;align-items:flex-end;}
  .sc-acciones-fila{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
  .sc-switch{position:relative;width:42px;height:24px;border-radius:999px;border:none;cursor:pointer;background:rgba(255,255,255,.14);padding:0;}
  .sc-switch.on{background:#fdba74;}
  .sc-switch i{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .15s;}
  .sc-switch.on i{transform:translateX(18px);}
  .sc-editor{grid-column:1/-1;display:flex;flex-direction:column;gap:8px;border-top:1px solid var(--border,rgba(255,255,255,.08));padding-top:12px;}
  .sc-editor-fila{display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
  .sc-editor input{flex:1;min-width:200px;max-width:320px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 12px;color:inherit;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:13px;}
  .sc-ayuda{font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;}
  .sc-error{font-size:12px;color:#fca5a5;}
  .sc-bloque{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,#0f0f10);display:flex;flex-direction:column;gap:10px;}
  .sc-bloque h3{margin:0;font-size:14px;}
  .sc-tabla{width:100%;border-collapse:collapse;font-size:12px;}
  .sc-tabla th,.sc-tabla td{text-align:left;padding:7px 8px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));vertical-align:top;}
  .sc-tabla th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,#a1a1aa);font-weight:600;}
  .sc-tabla td.n{text-align:right;font-variant-numeric:tabular-nums;}
  .sc-vacio{padding:24px 16px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .sc-error-bloque{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  @media (max-width:820px){ .sc-job{grid-template-columns:1fr;} .sc-acciones{align-items:flex-start;} .sc-acciones-fila{justify-content:flex-start;} }
</style>`;

const EJEMPLOS = ['*/15 * * * *', '0 9 * * *', '30 8 * * 1-5', '0 */2 * * *'];

const state = {
  datos: null,
  error: false,
  cargando: false,
  filtro: 'todos',
  texto: '',
  editando: null,
  borradorCron: '',
  errorEdicion: '',
  ocupado: null,
};

const enlazados = new WeakSet();

const motivo = (err, respaldo) =>
  typeof err?.code === 'string' && !err.code.startsWith('HTTP_') ? err.code : respaldo;

const fechaHora = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('es-AR', {
    timeZone: state.datos?.zona ?? 'America/Argentina/Buenos_Aires',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const hace = (iso) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'recién';
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} días`;
};

const duracion = (ms) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace('.', ',')} s`);

const jobsFiltrados = () => {
  const jobs = state.datos?.jobs ?? [];
  const texto = state.texto.trim().toLowerCase();
  return jobs.filter((j) => {
    if (state.filtro === 'activos' && !j.habilitado) return false;
    if (state.filtro === 'pausados' && j.habilitado) return false;
    if (state.filtro === 'error' && j.estado !== 'con-error') return false;
    if (!texto) return true;
    return `${j.nombre} ${j.descripcion} ${j.cronLegible}`.toLowerCase().includes(texto);
  });
};

const avisoHtml = () => {
  if (!state.datos || state.datos.activo) return '';
  return `<div class="sc-aviso">Este servidor no ejecuta los jobs automáticos. Corren en el scheduler de FeedIA, así que los cambios de horario y estado se aplican cuando ese scheduler arranque de nuevo. Podés ejecutar cualquier job a mano desde acá.</div>`;
};

const cifrasHtml = () => {
  const r = state.datos?.resumen;
  if (!r) return '';
  const tarjeta = (titulo, valor, detalle, acento) =>
    `<div class="sc-cifra sc-acento-${acento}"><span>${titulo}</span><strong>${valor}</strong><small>${detalle}</small></div>`;
  return [
    tarjeta('Jobs', r.total, `${r.activos} activos`, 'neutro'),
    tarjeta('Pausados', r.pausados, r.pausados ? 'no se ejecutan' : 'todos activos', r.pausados ? 'gris' : 'verde'),
    tarjeta(
      'Con error',
      r.conError,
      r.conError ? 'revisá el historial' : 'sin fallas recientes',
      r.conError ? 'rojo' : 'verde',
    ),
    tarjeta(
      'Ejecuciones 24 h',
      r.ejecuciones24h,
      r.ejecuciones24h === 0 ? 'sin ejecuciones' : r.errores24h ? `${r.errores24h} con error` : 'todas OK',
      r.errores24h ? 'rojo' : 'verde',
    ),
    tarjeta('Próxima', escape(fechaHora(r.proximaEjecucion)), 'en la zona de la marca', 'naranja'),
  ].join('');
};

const proximasHtml = () => {
  const jobs = (state.datos?.jobs ?? [])
    .filter((j) => j.habilitado && j.proximaEjecucion)
    .sort((a, b) => Date.parse(a.proximaEjecucion) - Date.parse(b.proximaEjecucion))
    .slice(0, 8);
  if (jobs.length === 0) return '<div class="sc-vacio">No hay ejecuciones programadas.</div>';
  return `<ol class="sc-prox">${jobs
    .map(
      (j) => `<li>
        <span class="sc-prox-hora">${escape(fechaHora(j.proximaEjecucion))}</span>
        <code>${escape(j.nombre)}</code>
        <span class="sc-ayuda">${escape(j.cronLegible)}</span>
      </li>`,
    )
    .join('')}</ol>`;
};

const editorHtml = (job) => `
  <div class="sc-editor">
    <div class="sc-editor-fila">
      <input id="sc-cron-input" value="${escape(state.borradorCron || job.cronEfectivo)}" maxlength="100" aria-label="Expresión cron" />
      <button class="sc-btn primario" data-sc-accion="guardar-cron" data-nombre="${escape(job.nombre)}">Guardar horario</button>
      <button class="sc-btn" data-sc-accion="cancelar-edicion">Cancelar</button>
    </div>
    <div class="sc-ayuda">Cinco campos: minuto hora día mes día-de-semana. Ejemplos: ${EJEMPLOS.map((e) => `<code>${escape(e)}</code>`).join(' · ')}</div>
    ${state.errorEdicion ? `<div class="sc-error">${escape(state.errorEdicion)}</div>` : ''}
  </div>`;

const jobHtml = (job) => {
  const estado = ESTADOS[job.estado] ?? ESTADOS.activo;
  const ocupado = state.ocupado === job.nombre;
  const ultimo = job.ultimaEjecucion;
  const ultimoTxt = ultimo
    ? `<span class="sc-tag" style="color:${ultimo.ok ? '#6ee7b7' : '#fca5a5'};background:${ultimo.ok ? 'rgba(16,185,129,.12)' : 'rgba(248,113,113,.12)'};">${ultimo.ok ? 'OK' : 'Error'}</span> ${escape(hace(ultimo.cuando))} · ${duracion(ultimo.duracionMs)}${ultimo.error ? `<small>${escape(ultimo.error.slice(0, 120))}</small>` : ''}`
    : 'Sin ejecuciones registradas';
  const editando = state.editando === job.nombre;
  return `
    <article class="sc-job ${job.habilitado ? '' : 'pausado'}" data-job="${escape(job.nombre)}" style="--sc-color:${estado.color}">
      <div>
        <div class="sc-nombre">${escape(job.nombre)}</div>
        <div class="sc-desc">${escape(job.descripcion)}</div>
      </div>
      <div>
        <div class="sc-horario">${escape(job.cronLegible)}${job.personalizado ? ' <span class="sc-tag" style="background:rgba(253,186,116,.16);color:#fdba74;">personalizado</span>' : ''}</div>
        <div class="sc-cron">${escape(job.cronEfectivo)}</div>
      </div>
      <div class="sc-meta">
        <div>${job.habilitado ? `Próxima: <b>${escape(fechaHora(job.proximaEjecucion))}</b>` : 'No se ejecuta'}</div>
        <small>Última: ${ultimoTxt}</small>
      </div>
      <div class="sc-acciones">
        <span class="sc-tag" style="color:${estado.color};background:${estado.fondo};">${escape(estado.label)}</span>
        <div class="sc-acciones-fila">
          <button class="sc-switch ${job.habilitado ? 'on' : ''}" role="switch" aria-checked="${job.habilitado}" aria-label="${job.habilitado ? 'Pausar' : 'Activar'} ${escape(job.nombre)}" data-sc-accion="alternar" data-nombre="${escape(job.nombre)}" data-habilitado="${job.habilitado ? '0' : '1'}" ${ocupado ? 'disabled' : ''}><i></i></button>
          <button class="sc-btn" data-sc-accion="editar" data-nombre="${escape(job.nombre)}" ${ocupado ? 'disabled' : ''}>Editar horario</button>
          <button class="sc-btn primario" data-sc-accion="ejecutar" data-nombre="${escape(job.nombre)}" ${ocupado ? 'disabled' : ''}>${ocupado ? 'Ejecutando…' : '▶ Ejecutar ahora'}</button>
          ${job.personalizado ? `<button class="sc-btn" data-sc-accion="restaurar" data-nombre="${escape(job.nombre)}" ${ocupado ? 'disabled' : ''}>Restaurar</button>` : ''}
        </div>
      </div>
      ${editando ? editorHtml(job) : ''}
    </article>`;
};

const listaHtml = () => {
  if (state.error)
    return '<div class="sc-error-bloque">No se pudo cargar el scheduler. Revisá la conexión con el backend.</div>';
  if (state.cargando && !state.datos) return loadingScreen();
  const jobs = jobsFiltrados();
  if (jobs.length === 0) return '<div class="sc-vacio">Ningún job coincide con el filtro o la búsqueda.</div>';
  return jobs.map(jobHtml).join('');
};

const historialHtml = () => {
  const historial = state.datos?.historial ?? [];
  if (historial.length === 0) {
    return '<div class="sc-vacio">Todavía no hay ejecuciones registradas. Aparecen acá cuando un job corre, automático o a mano.</div>';
  }
  return `
    <table class="sc-tabla">
      <thead><tr><th>Cuándo</th><th>Job</th><th>Resultado</th><th class="n">Duración</th><th>Detalle</th></tr></thead>
      <tbody>${historial
        .map(
          (r) => `<tr>
            <td>${escape(fechaHora(r.startedAt))}<br><small class="sc-ayuda">${escape(hace(r.startedAt))}</small></td>
            <td><code>${escape(r.name)}</code></td>
            <td>${r.ok ? '<span style="color:#6ee7b7;">OK</span>' : '<span style="color:#fca5a5;">Error</span>'}</td>
            <td class="n">${duracion(r.durationMs)}</td>
            <td>${r.error ? escape(r.error.slice(0, 160)) : '—'}</td>
          </tr>`,
        )
        .join('')}</tbody>
    </table>`;
};

const pintar = (root) => {
  const aviso = root.querySelector('#sc-aviso');
  if (aviso) aviso.innerHTML = avisoHtml();
  const cifras = root.querySelector('#sc-cifras');
  if (cifras) cifras.innerHTML = cifrasHtml();
  const chips = root.querySelector('#sc-chips');
  if (chips) {
    chips.innerHTML = FILTROS.map(
      (f) =>
        `<button class="sc-chip ${state.filtro === f.id ? 'on' : ''}" data-sc-accion="filtro" data-filtro="${f.id}">${escape(f.label)}</button>`,
    ).join('');
  }
  const proximas = root.querySelector('#sc-proximas');
  if (proximas) proximas.innerHTML = proximasHtml();
  const lista = root.querySelector('#sc-lista');
  if (lista) lista.innerHTML = listaHtml();
  const historial = root.querySelector('#sc-historial');
  if (historial) historial.innerHTML = historialHtml();
  const editor = root.querySelector('#sc-cron-input');
  if (editor) editor.focus();
};

const cargar = async (root, refrescar = false) => {
  state.cargando = true;
  if (refrescar) apiBust(RUTA);
  const { data, error } = await apiSafe(RUTA, null, { noCache: true });
  state.cargando = false;
  state.error = Boolean(error);
  if (data) state.datos = data;
  pintar(root);
};

const reemplazarJob = (vista) => {
  if (!state.datos) return;
  state.datos.jobs = state.datos.jobs.map((j) => (j.nombre === vista.nombre ? vista : j));
};

const actualizarJob = async (root, nombre, cuerpo, okMsg) => {
  state.ocupado = nombre;
  pintar(root);
  try {
    const vista = await api(`${RUTA}/jobs/${encodeURIComponent(nombre)}`, { method: 'PUT', body: cuerpo });
    reemplazarJob(vista);
    apiBust(RUTA);
    if (okMsg) toast(okMsg, 'ok');
    return true;
  } catch (err) {
    toast(motivo(err, 'No se pudo guardar el cambio'), 'crit');
    return false;
  } finally {
    state.ocupado = null;
    await cargar(root, true);
  }
};

const ejecutar = async (root, nombre) => {
  if (!window.confirm(`¿Ejecutar "${nombre}" ahora? Puede publicar contenido o gastar en IA.`)) return;
  state.ocupado = nombre;
  pintar(root);
  try {
    const registro = await api(`${RUTA}/jobs/${encodeURIComponent(nombre)}/ejecutar`, { body: {} });
    if (registro.ok) toast(`${nombre}: ejecutado (${duracion(registro.durationMs)})`, 'ok');
    else toast(`${nombre} falló: ${registro.error ?? 'error desconocido'}`, 'crit');
  } catch (err) {
    toast(motivo(err, `No se pudo ejecutar ${nombre}`), 'crit');
  } finally {
    state.ocupado = null;
    await cargar(root, true);
  }
};

const montarEstructura = (root) => {
  root.innerHTML = `${ESTILOS}
    <div class="sc-wrap">
      <div class="sc-cab">
        <div>
          <h2>⏰ Scheduler</h2>
          <p>Jobs automáticos de FeedIA: cuándo corren, si están activos y qué pasó en cada ejecución. Podés pausar, cambiar el horario o ejecutar uno a mano.</p>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="sc-btn" data-sc-accion="refrescar">↻ Actualizar</button>
        </div>
      </div>
      <div id="sc-aviso"></div>
      <div class="sc-cifras" id="sc-cifras">${loadingScreen()}</div>
      <div class="sc-barra">
        <input class="sc-buscar" id="sc-buscar" type="search" placeholder="Buscar job…" value="" aria-label="Buscar job" />
        <div class="sc-chips" id="sc-chips"></div>
      </div>
      <section class="sc-bloque">
        <h3>Próximas ejecuciones</h3>
        <div id="sc-proximas"></div>
      </section>
      <div class="sc-lista" id="sc-lista"></div>
      <section class="sc-bloque">
        <h3>Historial de ejecuciones</h3>
        <div id="sc-historial"></div>
      </section>
    </div>`;
};

const enlazar = (root) => {
  if (enlazados.has(root)) return;
  enlazados.add(root);
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-sc-accion]');
    if (!el || !root.contains(el)) return;
    e.preventDefault();
    const nombre = el.dataset.nombre;
    switch (el.dataset.scAccion) {
      case 'refrescar':
        await cargar(root, true);
        return;
      case 'filtro':
        state.filtro = el.dataset.filtro;
        pintar(root);
        return;
      case 'alternar':
        await actualizarJob(
          root,
          nombre,
          { habilitado: el.dataset.habilitado === '1' },
          el.dataset.habilitado === '1' ? 'Job activado' : 'Job pausado',
        );
        return;
      case 'editar':
        state.editando = nombre;
        state.borradorCron = '';
        state.errorEdicion = '';
        pintar(root);
        return;
      case 'cancelar-edicion':
        state.editando = null;
        state.borradorCron = '';
        state.errorEdicion = '';
        pintar(root);
        return;
      case 'guardar-cron': {
        const valor = root.querySelector('#sc-cron-input')?.value ?? '';
        state.errorEdicion = '';
        state.borradorCron = valor;
        const ok = await actualizarJob(root, nombre, { cron: valor }, 'Horario guardado');
        if (ok) {
          state.editando = null;
          state.borradorCron = '';
        } else {
          state.errorEdicion = 'La expresión no es válida o el servidor no la aceptó.';
        }
        pintar(root);
        return;
      }
      case 'restaurar':
        await actualizarJob(root, nombre, { restaurar: true }, 'Horario y estado restaurados');
        return;
      case 'ejecutar':
        await ejecutar(root, nombre);
        return;
      default:
        return;
    }
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'sc-buscar') return;
    state.texto = e.target.value;
    pintar(root);
  });
};

export const renderScheduler = async (root) => {
  state.datos = null;
  state.error = false;
  state.filtro = 'todos';
  state.texto = '';
  state.editando = null;
  state.errorEdicion = '';
  state.ocupado = null;
  montarEstructura(root);
  enlazar(root);
  await cargar(root);
};
