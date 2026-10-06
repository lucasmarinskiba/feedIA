import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const CATEGORIAS = ['Todas', 'Contenido', 'Estrategia', 'Comunidad', 'Operación'];

const DESTINO = {
  calendario: { etiqueta: '📅 Enviar al calendario', pestana: 'summary', ver: 'Ver en Programación' },
  proyecto: { etiqueta: '📋 Crear proyecto', pestana: 'summary', ver: 'Ver en Junta ejecutiva' },
  objetivo: { etiqueta: '🏁 Crear OKR', pestana: 'okrs', ver: 'Ver OKRs' },
  experimento: { etiqueta: '🧪 Crear experimento', pestana: 'experiments', ver: 'Ver experimentos' },
  bitacora: { etiqueta: '📒 Registrar en bitácora', pestana: 'logbook', ver: 'Ver bitácora' },
  copiar: { etiqueta: '📄 Copiar todo', pestana: null, ver: null },
};

const ESTILOS = `<style>
  .hi-wrap{display:flex;flex-direction:column;gap:18px;color:var(--text-primary,#fafafa);}
  .hi-banda{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(99,102,241,.08));border:1px solid rgba(124,58,237,.3);}
  .hi-banda h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .hi-banda p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);max-width:620px;line-height:1.5;}
  .hi-tabs{display:flex;gap:6px;}
  .hi-tab{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}
  .hi-tab.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .hi-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .hi-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .hi-chip.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .hi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
  .hi-card{text-align:left;padding:16px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:8px;}
  .hi-card:hover{border-color:rgba(253,186,116,.6);transform:translateY(-1px);}
  .hi-card-cab{display:flex;align-items:center;gap:10px;}
  .hi-icono{font-size:22px;}
  .hi-nombre{font-size:15px;font-weight:700;}
  .hi-cat{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .hi-desc{font-size:12.5px;line-height:1.5;color:var(--text-tertiary,#a1a1aa);margin:0;}
  .hi-tags{display:flex;gap:5px;flex-wrap:wrap;}
  .hi-tag{font-size:10px;text-transform:uppercase;letter-spacing:.06em;padding:3px 8px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text-tertiary,#a1a1aa);}
  .hi-tag.ia{background:rgba(124,58,237,.18);color:#c4b5fd;}
  .hi-detalle{display:grid;grid-template-columns:minmax(260px,380px) 1fr;gap:18px;align-items:start;}
  .hi-form,.hi-salida{border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);padding:18px;display:flex;flex-direction:column;gap:12px;}
  .hi-form h3,.hi-salida h3{margin:0;font-size:16px;}
  .hi-campo{display:flex;flex-direction:column;gap:5px;}
  .hi-campo label{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#a1a1aa);}
  .hi-campo small{font-size:11.5px;color:var(--text-tertiary,#a1a1aa);}
  .hi-input{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 11px;color:inherit;font:inherit;font-size:13.5px;}
  textarea.hi-input{min-height:84px;resize:vertical;}
  .hi-btn{border:0;border-radius:10px;padding:10px 16px;background:#fdba74;color:#111;font-weight:700;font-size:13.5px;cursor:pointer;}
  .hi-btn:disabled{opacity:.6;cursor:wait;}
  .hi-btn-sec{background:transparent;color:var(--text-secondary,#d4d4d8);border:1px solid var(--border,rgba(255,255,255,.12));}
  .hi-btn-chico{padding:6px 10px;font-size:12px;}
  .hi-acciones{display:flex;gap:8px;flex-wrap:wrap;}
  .hi-fuente{font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text-tertiary,#a1a1aa);}
  .hi-sec{display:flex;flex-direction:column;gap:6px;}
  .hi-sec h4{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#a1a1aa);}
  .hi-texto{margin:0;font-size:13.5px;line-height:1.6;white-space:pre-wrap;}
  .hi-lista{margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;}
  .hi-copiable{background:var(--bg-hover,rgba(255,255,255,.04));border-radius:10px;padding:12px;font-size:13px;line-height:1.6;white-space:pre-wrap;}
  .hi-piezas{display:flex;flex-direction:column;gap:8px;}
  .hi-pieza{border-radius:10px;padding:10px 12px;background:var(--bg-hover,rgba(255,255,255,.04));display:flex;flex-direction:column;gap:4px;font-size:13px;}
  .hi-pieza small{color:var(--text-tertiary,#a1a1aa);font-size:12px;}
  .hi-notas{font-size:12px;color:var(--text-tertiary,#a1a1aa);margin:0;padding-left:18px;line-height:1.5;}
  .hi-aplicado{border-radius:10px;padding:10px 12px;background:rgba(16,185,129,.09);font-size:12.5px;line-height:1.5;display:flex;flex-direction:column;gap:4px;}
  .hi-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  .hi-vacio{padding:24px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;}
  @media (max-width:820px){.hi-detalle{grid-template-columns:1fr;}}
</style>`;

const estadoInicial = () => ({
  catalogo: [],
  creaciones: [],
  conocimiento: [],
  vista: 'herramientas',
  categoria: 'Todas',
  herramienta: null,
  creacion: null,
  base: null,
  valoresIniciales: null,
  ocupado: false,
  error: null,
});

let estado = estadoInicial();

const cuandoLegible = (iso) =>
  new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

const destinosTags = (destinos) =>
  destinos
    .map((d) => `<span class="hi-tag">${escape(DESTINO[d]?.etiqueta.replace(/^\S+\s/, '') ?? d)}</span>`)
    .join('');

const catalogoHtml = () => {
  const visibles = estado.catalogo.filter((h) => estado.categoria === 'Todas' || h.categoria === estado.categoria);
  return `
    <div class="hi-banda">
      <div>
        <h2>🧰 Herramientas IA</h2>
        <p>${estado.catalogo.length} herramientas. Lo que generan se guarda en tu biblioteca y puede enviarse al calendario, a proyectos, OKR, experimentos o la bitácora.</p>
      </div>
      <div class="hi-tabs">
        <button class="hi-tab ${estado.vista === 'herramientas' ? 'is-on' : ''}" data-hi-tab="herramientas">Herramientas</button>
        <button class="hi-tab ${estado.vista === 'biblioteca' ? 'is-on' : ''}" data-hi-tab="biblioteca">Biblioteca (${estado.creaciones.length})</button>
      </div>
    </div>
    <div class="hi-chips">${CATEGORIAS.map(
      (c) =>
        `<button class="hi-chip ${estado.categoria === c ? 'is-on' : ''}" data-hi-cat="${escape(c)}">${escape(c)}</button>`,
    ).join('')}</div>
    <div class="hi-grid">
      ${visibles
        .map(
          (h) => `<button class="hi-card" data-hi-abrir="${escape(h.id)}">
            <div class="hi-card-cab"><span class="hi-icono">${escape(h.icono)}</span><div><div class="hi-cat">${escape(h.categoria)}</div><div class="hi-nombre">${escape(h.nombre)}</div></div></div>
            <p class="hi-desc">${escape(h.descripcion)}</p>
            <div class="hi-tags">${h.soloReglas ? '<span class="hi-tag">Sin IA</span>' : '<span class="hi-tag ia">IA</span>'}${destinosTags(h.destinos)}</div>
          </button>`,
        )
        .join('')}
    </div>`;
};

const campoHtml = (c, valores) => {
  const id = `hi-${c.id}`;
  const ayuda = c.ayuda ? `<small>${escape(c.ayuda)}</small>` : '';
  const requerido = c.requerido ? ' *' : '';
  const valor = valores[c.id];
  if (c.tipo === 'select')
    return `<div class="hi-campo"><label for="${id}">${escape(c.etiqueta)}${requerido}</label><select class="hi-input" id="${id}" data-campo="${escape(c.id)}">${c.opciones
      .map((o) => `<option value="${escape(o)}" ${String(valor) === o ? 'selected' : ''}>${escape(o)}</option>`)
      .join('')}</select>${ayuda}</div>`;
  if (c.tipo === 'textarea')
    return `<div class="hi-campo"><label for="${id}">${escape(c.etiqueta)}${requerido}</label><textarea class="hi-input" id="${id}" data-campo="${escape(c.id)}" maxlength="${c.maxCaracteres ?? 2000}">${escape(valor ?? '')}</textarea>${ayuda}</div>`;
  const tipo = c.tipo === 'numero' ? 'number' : 'text';
  const minMax = c.tipo === 'numero' ? ` min="${c.min ?? 1}" max="${c.max ?? 100}"` : '';
  const valorAttr = valor === undefined ? '' : ` value="${escape(valor)}"`;
  return `<div class="hi-campo"><label for="${id}">${escape(c.etiqueta)}${requerido}</label><input class="hi-input" id="${id}" type="${tipo}"${minMax}${valorAttr} data-campo="${escape(c.id)}" />${ayuda}</div>`;
};

const conocimientoHtml = () => {
  if (estado.conocimiento.length === 0)
    return '<p class="hi-desc">Todavía no hay respuestas aprobadas. Cuando un resultado te sirva, guardalo como respuesta aprobada y la próxima vez se usa para preguntas parecidas.</p>';
  return `<div class="hi-piezas">${estado.conocimiento
    .map(
      (e) => `<div class="hi-pieza">
        <strong>${escape(e.pregunta)}</strong>
        <span>${escape(e.respuesta)}</span>
        <button type="button" class="hi-btn hi-btn-sec hi-btn-chico" data-hi-borrar-kb="${escape(e.id)}">Quitar</button>
      </div>`,
    )
    .join('')}</div>`;
};

const formularioHtml = (h) => {
  const valores = estado.valoresIniciales ?? {};
  const base = estado.base
    ? `<div class="hi-aplicado">Usa como base: <strong>${escape(estado.base.titulo)}</strong>
        <span>${escape(estado.base.nombre)}</span>
        <button type="button" class="hi-btn hi-btn-sec hi-btn-chico" data-hi-quitar-base>Quitar base</button></div>`
    : '';
  const conocimiento =
    h.id === 'respuestas'
      ? `<div class="hi-sec"><h4>Respuestas aprobadas (${estado.conocimiento.length})</h4>${conocimientoHtml()}</div>`
      : '';
  return `
  <form class="hi-form" id="hi-form">
    <h3>${escape(h.icono)} ${escape(h.nombre)}</h3>
    <p class="hi-desc">${escape(h.descripcion)}</p>
    ${base}
    ${h.campos.map((c) => campoHtml(c, valores)).join('')}
    ${conocimiento}
    <button class="hi-btn" type="submit" ${estado.ocupado ? 'disabled' : ''}>${estado.ocupado ? 'Generando…' : 'Generar'}</button>
  </form>`;
};

const cargarConocimiento = async () => {
  const { data } = await apiSafe('/api/executive/tools/conocimiento/respuestas', [], { noCache: true });
  estado.conocimiento = Array.isArray(data) ? data : [];
};

const aprobarRespuesta = async (root, creacionId) => {
  const respuesta = root.querySelector('#hi-aprobar-texto')?.value.trim() ?? '';
  try {
    await api(`/api/executive/tools/creaciones/${encodeURIComponent(creacionId)}/aprobar`, { body: { respuesta } });
    await cargarConocimiento();
    toast('Guardada como respuesta aprobada', 'ok');
  } catch (err) {
    toast(err?.message?.replace(/^.*→\s*/, '') || 'No se pudo guardar', 'err');
  }
};

const borrarRespuestaAprobada = async (root, id) => {
  try {
    await api(`/api/executive/tools/conocimiento/respuestas/${encodeURIComponent(id)}`, { method: 'DELETE' });
    await cargarConocimiento();
    toast('Respuesta quitada de la base', 'ok');
    pintar(root);
  } catch (err) {
    toast(err?.message?.replace(/^.*→\s*/, '') || 'No se pudo quitar', 'err');
  }
};

const seccionesHtml = (r) =>
  r.secciones
    .map((s) => {
      const cuerpo =
        s.tipo === 'lista'
          ? `<ul class="hi-lista">${s.contenido.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`
          : s.tipo === 'copiable'
            ? `<div class="hi-copiable">${escape(s.contenido)}</div>`
            : `<p class="hi-texto">${escape(s.contenido)}</p>`;
      return `<div class="hi-sec"><h4>${escape(s.titulo)}</h4>${cuerpo}</div>`;
    })
    .join('');

const accionHtml = (c) => {
  const accion = c.accion;
  if (!accion) return '';
  if (accion.tipo === 'piezas')
    return `<div class="hi-sec"><h4>Piezas que se crean (${accion.piezas.length})</h4><div class="hi-piezas">${accion.piezas
      .map(
        (p, i) => `<div class="hi-pieza">
          <strong>${escape(p.titulo)}</strong>
          <small>${escape(p.plataforma)} · ${escape(p.formato)} · ${p.scheduledAt ? escape(cuandoLegible(p.scheduledAt)) : 'sin fecha: quedará en borrador'}</small>
          <textarea class="hi-input" data-hi-caption="${i}" maxlength="2200" placeholder="Escribí el texto. Sin texto, la pieza queda en borrador.">${escape(p.caption)}</textarea>
        </div>`,
      )
      .join('')}</div></div>`;
  if (accion.tipo === 'movimientos')
    return `<div class="hi-sec"><h4>Movimientos en el calendario (${accion.movimientos.length})</h4>${
      accion.movimientos.length
        ? `<div class="hi-piezas">${accion.movimientos
            .map(
              (m) => `<div class="hi-pieza"><strong>${escape(m.caption.slice(0, 80) || 'Pieza sin texto')}</strong>
                <small>${m.actual ? `${escape(cuandoLegible(m.actual))} → ` : 'sin fecha → '}${escape(cuandoLegible(m.propuesto))}</small>
                <small>${escape(m.motivo)}</small></div>`,
            )
            .join('')}</div>`
        : '<p class="hi-texto">No hay movimientos que proponer en esta ventana.</p>'
    }</div>`;
  return '';
};

const aplicacionesHtml = (c) =>
  c.aplicaciones.length
    ? `<div class="hi-sec"><h4>Enviado</h4>${c.aplicaciones
        .map(
          (
            a,
          ) => `<div class="hi-aplicado"><strong>${escape(DESTINO[a.destino]?.etiqueta.replace(/^\S+\s/, '') ?? a.destino)}</strong>
            <span>${escape(a.resumen)} · ${escape(cuandoLegible(a.aplicadoEn))}</span>
            ${DESTINO[a.destino]?.pestana ? `<button class="hi-btn hi-btn-sec hi-btn-chico" data-hi-ver="${escape(DESTINO[a.destino].pestana)}">${escape(DESTINO[a.destino].ver)}</button>` : ''}</div>`,
        )
        .join('')}</div>`
    : '';

const accionesDestinoHtml = (c, herramienta) => {
  const destinos = (herramienta?.destinos ?? []).filter((d) => d !== 'copiar');
  const botones = destinos
    .map((d) => {
      const yaEnviado = c.aplicaciones.some((a) => a.destino === d);
      const puedeEnviar = c.accion?.tipo !== 'ninguna' || d === 'bitacora';
      const etiqueta = yaEnviado ? `${DESTINO[d].etiqueta} (repetir)` : DESTINO[d].etiqueta;
      return puedeEnviar
        ? `<button class="hi-btn hi-btn-chico" data-hi-aplicar="${escape(d)}" ${estado.ocupado ? 'disabled' : ''}>${escape(etiqueta)}</button>`
        : '';
    })
    .join('');
  return `<div class="hi-acciones">${botones}<button class="hi-btn hi-btn-sec hi-btn-chico" data-hi-copiar>${DESTINO.copiar.etiqueta}</button></div>`;
};

const aprobarHtml = (c) => {
  const sugerida = c.resultado.secciones.find((s) => s.tipo === 'copiable');
  const texto = typeof sugerida?.contenido === 'string' ? sugerida.contenido : '';
  return `<div class="hi-sec"><h4>Guardar como respuesta aprobada</h4>
    <small class="hi-desc">Corregí el texto si hace falta: se guarda tal como lo dejes y se usa para preguntas parecidas.</small>
    <textarea class="hi-input" id="hi-aprobar-texto" maxlength="600">${escape(texto)}</textarea>
    <div class="hi-acciones"><button class="hi-btn hi-btn-sec hi-btn-chico" data-hi-aprobar="${escape(c.id)}">✅ Guardar como respuesta aprobada</button></div>
  </div>`;
};

const seguirHtml = (c, herramienta) => {
  const siguientes = (herramienta?.continuaCon ?? [])
    .map((id) => estado.catalogo.find((h) => h.id === id))
    .filter(Boolean);
  if (siguientes.length === 0) return '';
  return `<div class="hi-sec"><h4>Seguir con</h4><div class="hi-acciones">${siguientes
    .map(
      (h) =>
        `<button class="hi-btn hi-btn-sec hi-btn-chico" data-hi-seguir="${escape(h.id)}" data-hi-base="${escape(c.id)}">${escape(h.icono)} ${escape(h.nombre)}</button>`,
    )
    .join('')}</div></div>`;
};

const resultadoHtml = (c) => {
  const herramienta = estado.catalogo.find((h) => h.id === c.herramientaId);
  return `
    <div class="hi-salida">
      <div class="hi-card-cab"><h3>${escape(c.resultado.titulo)}</h3></div>
      <span class="hi-fuente">${c.fuente === 'ia' ? 'Generado con IA' : 'Generado con reglas automáticas'}</span>
      ${c.origen ? `<span class="hi-fuente">Partió de: ${escape(c.origen.nombre)}</span>` : ''}
      ${seccionesHtml(c.resultado)}
      ${accionHtml(c)}
      ${c.resultado.notas.length ? `<ul class="hi-notas">${c.resultado.notas.map((n) => `<li>${escape(n)}</li>`).join('')}</ul>` : ''}
      ${aplicacionesHtml(c)}
      ${seguirHtml(c, herramienta)}
      ${accionesDestinoHtml(c, herramienta)}
      ${c.herramientaId === 'respuestas' ? aprobarHtml(c) : ''}
      <div><button class="hi-btn hi-btn-sec hi-btn-chico" data-hi-volver>← Volver</button></div>
    </div>`;
};

const detalleHtml = () => (estado.creacion ? resultadoHtml(estado.creacion) : formularioHtml(estado.herramienta));

const herramientaDe = (id) =>
  estado.catalogo.find((h) => h.id === id) ?? { campos: [], nombre: id, icono: '🧰', descripcion: '', destinos: [] };

const bibliotecaHtml = () => {
  if (estado.creaciones.length === 0)
    return '<div class="hi-vacio">Todavía no generaste nada. Lo que crees con las herramientas queda guardado acá para reabrirlo y enviarlo cuando quieras.</div>';
  return `<div class="hi-grid">${estado.creaciones
    .map(
      (c) => `<button class="hi-card" data-hi-creacion="${escape(c.id)}">
        <div class="hi-card-cab"><span class="hi-icono">${escape(herramientaDe(c.herramientaId).icono)}</span><div><div class="hi-cat">${escape(c.nombre)}</div><div class="hi-nombre">${escape(c.resultado.titulo)}</div></div></div>
        <div class="hi-tags">
          <span class="hi-tag">${escape(cuandoLegible(c.creadaEn))}</span>
          <span class="hi-tag ${c.fuente === 'ia' ? 'ia' : ''}">${c.fuente === 'ia' ? 'IA' : 'Reglas'}</span>
          ${c.origen ? `<span class="hi-tag">Desde ${escape(c.origen.nombre)}</span>` : ''}
          ${c.aplicaciones.length ? `<span class="hi-tag">Enviada a ${c.aplicaciones.length} destino(s)</span>` : '<span class="hi-tag">Sin enviar</span>'}
        </div>
      </button>`,
    )
    .join('')}</div>`;
};

const pintar = (root) => {
  const cuerpo = root.querySelector('#hi-cuerpo');
  if (!cuerpo) return;
  if (estado.error) {
    cuerpo.innerHTML = `<div class="hi-error">${escape(estado.error)}</div>`;
    return;
  }
  if (estado.vista === 'biblioteca') {
    cuerpo.innerHTML = bibliotecaHtml();
    return;
  }
  cuerpo.innerHTML = estado.herramienta || estado.creacion ? detalleHtml() : catalogoHtml();
};

const leerValores = (root) => {
  const valores = {};
  for (const el of root.querySelectorAll('[data-campo]')) {
    const valor = el.value.trim();
    if (valor !== '') valores[el.dataset.campo] = el.type === 'number' ? Number(valor) : valor;
  }
  return valores;
};

const cargarCreaciones = async () => {
  const { data } = await apiSafe('/api/executive/tools/creaciones', [], { noCache: true });
  estado.creaciones = Array.isArray(data) ? data : [];
};

const copiarTexto = async (texto) => {
  try {
    await navigator.clipboard.writeText(texto);
    toast('Copiado', 'ok');
  } catch {
    toast('No se pudo copiar: seleccioná el texto a mano', 'err');
  }
};

const textoCompletoDe = (c) =>
  [
    c.resultado.titulo,
    ...c.resultado.secciones.map(
      (s) => `${s.titulo}\n${Array.isArray(s.contenido) ? s.contenido.join('\n') : s.contenido}`,
    ),
  ].join('\n\n');

const aplicarDestino = async (root, destino) => {
  if (!estado.creacion) return;
  if (destino === 'copiar') {
    await copiarTexto(textoCompletoDe(estado.creacion));
    return;
  }
  const piezas =
    destino === 'calendario'
      ? [...root.querySelectorAll('[data-hi-caption]')].map((el) => ({ caption: el.value }))
      : null;
  estado.ocupado = true;
  pintar(root);
  try {
    const respuesta = await api(`/api/executive/tools/creaciones/${encodeURIComponent(estado.creacion.id)}/aplicar`, {
      body: piezas?.length ? { destino, piezas } : { destino },
    });
    estado.creacion = respuesta.creacion ?? estado.creacion;
    await cargarCreaciones();
    toast(`Enviado: ${respuesta.aplicacion?.resumen ?? 'listo'}`, 'ok');
  } catch (err) {
    toast(err?.message?.replace(/^.*→\s*/, '') || 'No se pudo enviar', 'err');
  } finally {
    estado.ocupado = false;
    pintar(root);
  }
};

const abrirCreacion = async (id) => {
  const c = estado.creaciones.find((x) => x.id === id);
  if (!c) return;
  estado.creacion = c;
  estado.herramienta = null;
  estado.vista = 'herramientas';
};

const continuarCon = async (root, herramientaId, creacionId) => {
  const def = estado.catalogo.find((h) => h.id === herramientaId);
  const origen = estado.creaciones.find((c) => c.id === creacionId);
  if (!def || !origen) return;
  const { data } = await apiSafe(
    `/api/executive/tools/creaciones/${encodeURIComponent(creacionId)}/para/${encodeURIComponent(herramientaId)}`,
    { valores: {} },
    { noCache: true },
  );
  estado.herramienta = def;
  estado.creacion = null;
  estado.valoresIniciales = data?.valores ?? {};
  estado.base = { creacionId, nombre: origen.nombre, titulo: origen.resultado.titulo };
  estado.error = null;
  pintar(root);
};

const generar = async (root, herramientaId) => {
  const valores = leerValores(root);
  if (estado.base) valores.desdeCreacion = estado.base.creacionId;
  const boton = root.querySelector('#hi-form button[type="submit"]');
  if (boton) {
    boton.disabled = true;
    boton.textContent = 'Generando…';
  }
  try {
    const respuesta = await api(`/api/executive/tools/${encodeURIComponent(herramientaId)}`, { body: valores });
    estado.creacion = respuesta.creacion;
    estado.herramienta = null;
    estado.base = null;
    estado.valoresIniciales = null;
    await cargarCreaciones();
    toast('Listo: quedó guardado en tu biblioteca', 'ok');
    pintar(root);
  } catch (err) {
    toast(err?.message?.replace(/^.*→\s*/, '') || 'No se pudo generar', 'err');
    if (boton) {
      boton.disabled = false;
      boton.textContent = 'Generar';
    }
  }
};

const irAPestana = (pestana) => {
  if (!pestana) return;
  document.querySelector(`.v2-tab[data-tab="${pestana}"]`)?.click();
};

export const renderTools = async (root) => {
  estado = estadoInicial();
  root.innerHTML = `${ESTILOS}<div class="hi-wrap"><div id="hi-cuerpo">${loadingScreen()}</div></div>`;
  const [catalogo] = await Promise.all([apiSafe('/api/executive/tools', []), cargarCreaciones()]);
  estado.catalogo = Array.isArray(catalogo.data) ? catalogo.data : [];
  if (catalogo.error)
    estado.error = 'No se pudo cargar el catálogo de herramientas. Revisá la conexión con el backend.';
  pintar(root);

  root.addEventListener('click', async (e) => {
    const tab = e.target.closest('[data-hi-tab]');
    if (tab) {
      estado.vista = tab.dataset.hiTab;
      estado.creacion = null;
      estado.herramienta = null;
      if (estado.vista === 'biblioteca') await cargarCreaciones();
      pintar(root);
      return;
    }
    const cat = e.target.closest('[data-hi-cat]');
    if (cat) {
      estado.categoria = cat.dataset.hiCat;
      pintar(root);
      return;
    }
    const abrir = e.target.closest('[data-hi-abrir]');
    if (abrir) {
      estado.herramienta = estado.catalogo.find((h) => h.id === abrir.dataset.hiAbrir) ?? null;
      estado.creacion = null;
      estado.base = null;
      estado.valoresIniciales = null;
      if (estado.herramienta?.id === 'respuestas') await cargarConocimiento();
      pintar(root);
      return;
    }
    const aprobar = e.target.closest('[data-hi-aprobar]');
    if (aprobar) {
      await aprobarRespuesta(root, aprobar.dataset.hiAprobar);
      return;
    }
    const borrarKb = e.target.closest('[data-hi-borrar-kb]');
    if (borrarKb) {
      await borrarRespuestaAprobada(root, borrarKb.dataset.hiBorrarKb);
      return;
    }
    const creacion = e.target.closest('[data-hi-creacion]');
    if (creacion) {
      await abrirCreacion(creacion.dataset.hiCreacion);
      pintar(root);
      return;
    }
    if (e.target.closest('[data-hi-volver]')) {
      estado.herramienta = null;
      estado.creacion = null;
      estado.base = null;
      estado.valoresIniciales = null;
      pintar(root);
      return;
    }
    const seguir = e.target.closest('[data-hi-seguir]');
    if (seguir) {
      await continuarCon(root, seguir.dataset.hiSeguir, seguir.dataset.hiBase);
      return;
    }
    if (e.target.closest('[data-hi-quitar-base]')) {
      estado.base = null;
      estado.valoresIniciales = null;
      pintar(root);
      return;
    }
    const aplicar = e.target.closest('[data-hi-aplicar]');
    if (aplicar) {
      await aplicarDestino(root, aplicar.dataset.hiAplicar);
      return;
    }
    const ver = e.target.closest('[data-hi-ver]');
    if (ver) {
      irAPestana(ver.dataset.hiVer);
      return;
    }
    if (e.target.closest('[data-hi-copiar]')) {
      if (estado.creacion) await copiarTexto(textoCompletoDe(estado.creacion));
    }
  });

  root.addEventListener('submit', async (e) => {
    if (e.target.id !== 'hi-form' || !estado.herramienta) return;
    e.preventDefault();
    await generar(root, estado.herramienta.id);
  });
};
