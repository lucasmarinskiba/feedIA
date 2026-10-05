import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const SEVERIDAD = {
  critica: { label: 'Crítica', color: '#f87171', fondo: 'rgba(248,113,113,.14)', emoji: '🔴' },
  alta: { label: 'Alta', color: '#fbbf24', fondo: 'rgba(251,191,36,.14)', emoji: '🟠' },
  media: { label: 'Media', color: '#60a5fa', fondo: 'rgba(96,165,250,.14)', emoji: '🟡' },
  info: { label: 'Info', color: '#a1a1aa', fondo: 'rgba(161,161,170,.14)', emoji: '🔵' },
};
const PLATAFORMA = { instagram: 'Instagram', tiktok: 'TikTok' };
const FUENTE = {
  cuentas: 'Cuentas',
  decisiones: 'Decisiones',
  okr: 'Objetivos',
  comunidad: 'Comunidad',
  produccion: 'Producción',
  economia: 'Economía',
  auditoria: 'Auditoría',
  autopilot: 'Autopilot',
  programacion: 'Programación',
  plan: 'Plan',
};
const FILTROS = [
  { id: 'todas', label: 'Todas' },
  { id: 'urgentes', label: 'Críticas y altas' },
  { id: 'resto', label: 'Medias e info' },
  { id: 'silenciadas', label: 'Silenciadas' },
];
const SILENCIOS = [
  { horas: 24, label: 'Silenciar 24 h' },
  { horas: 168, label: 'Silenciar 1 semana' },
];

const ESTILOS = `<style>
  .al-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .al-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;flex-wrap:wrap;}
  .al-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .al-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:620px;}
  .al-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;cursor:pointer;}
  .al-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .al-btn.chico{padding:5px 10px;font-size:12px;}
  .al-btn:disabled{opacity:.6;cursor:wait;}
  .al-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;}
  .al-cifra{padding:12px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .al-cifra span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .al-cifra strong{font-size:22px;letter-spacing:-0.02em;}
  .al-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .al-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .al-chip.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .al-lista{display:flex;flex-direction:column;gap:10px;}
  .al-item{display:flex;gap:14px;align-items:flex-start;padding:14px 16px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .al-item .al-emoji{font-size:18px;line-height:1.2;}
  .al-item .al-cuerpo{flex:1;display:flex;flex-direction:column;gap:4px;min-width:0;}
  .al-item.silenciada{opacity:.75;}
  .al-titulo{font-size:14px;font-weight:700;line-height:1.35;}
  .al-detalle{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;}
  .al-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:4px;}
  .al-sev{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;padding:3px 8px;border-radius:999px;}
  .al-plat{font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .al-acciones{display:flex;gap:6px;flex-wrap:wrap;margin-left:auto;}
  .al-vacio{padding:32px 20px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .al-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  @media (max-width:720px){.al-item{flex-direction:column;}.al-acciones{margin-left:0;}}
</style>`;

let estado = { alertas: [], silenciadas: [], generadoEn: null, error: false, filtro: 'todas' };

const hace = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (Number.isNaN(m)) return '';
  if (m < 1) return 'recién';
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
};

const hasta = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const visibles = () => {
  if (estado.filtro === 'urgentes')
    return estado.alertas.filter((a) => a.severidad === 'critica' || a.severidad === 'alta');
  if (estado.filtro === 'resto') return estado.alertas.filter((a) => a.severidad === 'media' || a.severidad === 'info');
  return estado.alertas;
};

const cifrasHtml = () => {
  const cuenta = (s) => estado.alertas.filter((a) => a.severidad === s).length;
  return `<div class="al-cifras">
    ${Object.entries(SEVERIDAD)
      .map(
        ([id, s]) =>
          `<div class="al-cifra"><span>${escape(s.label)}</span><strong style="color:${s.color}">${cuenta(id)}</strong></div>`,
      )
      .join('')}
  </div>`;
};

const accionesHtml = (a) => `
  <div class="al-acciones">
    <button class="al-btn" data-al-tipo="${escape(a.accion.tipo)}" data-al-valor="${escape(a.accion.valor)}">${escape(a.accion.label)}</button>
    ${SILENCIOS.map(
      (s) =>
        `<button class="al-btn chico" data-al-silenciar="${escape(a.id)}" data-al-horas="${s.horas}">${escape(s.label)}</button>`,
    ).join('')}
  </div>`;

const itemHtml = (a) => {
  const s = SEVERIDAD[a.severidad] ?? SEVERIDAD.info;
  const plataforma = a.plataforma ? PLATAFORMA[a.plataforma] : 'Sala';
  return `<article class="al-item">
    <span class="al-emoji">${s.emoji}</span>
    <div class="al-cuerpo">
      <div class="al-titulo">${escape(a.titulo)}</div>
      ${a.detalle ? `<div class="al-detalle">${escape(a.detalle)}</div>` : ''}
      <div class="al-meta">
        <span class="al-sev" style="color:${s.color};background:${s.fondo};">${escape(s.label)}</span>
        <span class="al-plat">${escape(plataforma)} · ${escape(FUENTE[a.fuente] ?? a.fuente)}</span>
      </div>
      ${accionesHtml(a)}
    </div>
  </article>`;
};

const silenciadaHtml = (a) => {
  const s = SEVERIDAD[a.severidad] ?? SEVERIDAD.info;
  return `<article class="al-item silenciada">
    <span class="al-emoji">🔕</span>
    <div class="al-cuerpo">
      <div class="al-titulo">${escape(a.titulo)}</div>
      <div class="al-meta">
        <span class="al-sev" style="color:${s.color};background:${s.fondo};">${escape(s.label)}</span>
        <span class="al-plat">Silenciada hasta ${escape(hasta(a.silenciadaHasta))}</span>
      </div>
      <div class="al-acciones">
        <button class="al-btn chico" data-al-reactivar="${escape(a.id)}">Reactivar ahora</button>
      </div>
    </div>
  </article>`;
};

const chipsHtml = () =>
  `<div class="al-chips">${FILTROS.map((f) => {
    const etiqueta = f.id === 'silenciadas' ? `${f.label} (${estado.silenciadas.length})` : f.label;
    return `<button class="al-chip${estado.filtro === f.id ? ' on' : ''}" data-al-filtro="${f.id}">${escape(etiqueta)}</button>`;
  }).join('')}</div>`;

const listaHtml = () => {
  if (estado.filtro === 'silenciadas') {
    return estado.silenciadas.length
      ? `<div class="al-lista">${estado.silenciadas.map(silenciadaHtml).join('')}</div>`
      : '<div class="al-vacio">No hay alertas silenciadas.</div>';
  }
  const lista = visibles();
  return lista.length
    ? `<div class="al-lista">${lista.map(itemHtml).join('')}</div>`
    : '<div class="al-vacio">Sin alertas con los datos actuales. Se calculan solas a partir de tus cuentas, decisiones, objetivos, programación, plan, bandeja y producción.</div>';
};

const contenidoHtml = () => {
  if (estado.error)
    return '<div class="al-error">No se pudieron cargar las alertas: revisá la conexión con el backend.</div>';
  return `${cifrasHtml()}${chipsHtml()}${listaHtml()}`;
};

const pintar = (root) => {
  const cuerpo = root.querySelector('#al-cuerpo');
  if (cuerpo) cuerpo.innerHTML = contenidoHtml();
  const actualizado = root.querySelector('#al-actualizado');
  if (actualizado) actualizado.textContent = estado.generadoEn ? `Actualizado ${hace(estado.generadoEn)}` : '';
};

const cargar = async (refrescar) => {
  const { data, error } = await apiSafe(`/api/executive/alerts${refrescar ? '?refrescar=1' : ''}`, null, {
    noCache: true,
  });
  estado.error = Boolean(error);
  estado.alertas = Array.isArray(data?.alertas) ? data.alertas : [];
  estado.silenciadas = Array.isArray(data?.silenciadas) ? data.silenciadas : [];
  estado.generadoEn = data?.generadoEn ?? null;
};

const mutarSilencio = async (root, ruta, cuerpo, mensaje) => {
  try {
    await api(ruta, { method: 'POST', body: cuerpo });
    toast(mensaje, 'ok');
  } catch {
    toast('No se pudo guardar el cambio. Probá de nuevo.', 'err');
    return;
  }
  await cargar(false);
  pintar(root);
};

const ejecutarAccion = (tipo, valor) => {
  if (tipo === 'tab') {
    const boton = document.querySelector(`.v2-tab[data-tab="${valor}"]`);
    if (boton) {
      boton.click();
      return;
    }
    window.__fxTabPendiente = valor;
    window.location.hash = '#imperio';
    return;
  }
  window.location.hash = `#${valor}`;
};

export const renderAlertas = async (root) => {
  estado = { alertas: [], silenciadas: [], generadoEn: null, error: false, filtro: 'todas' };
  root.innerHTML = `${ESTILOS}
    <div class="al-wrap">
      <div class="al-cab">
        <div>
          <h2>🚨 Alertas</h2>
          <p>Lo que requiere tu atención ahora, con los datos reales de la operación. Podés silenciar una alerta por 24 horas o una semana: vuelve sola cuando vence el plazo.</p>
          <div class="tiny muted" id="al-actualizado" style="margin-top:6px;"></div>
        </div>
        <button class="al-btn primario" id="al-refrescar">↻ Actualizar</button>
      </div>
      <div id="al-cuerpo">${loadingScreen()}</div>
    </div>`;
  await cargar(false);
  pintar(root);

  root.addEventListener('click', async (e) => {
    const filtro = e.target.closest('[data-al-filtro]');
    if (filtro) {
      estado.filtro = filtro.dataset.alFiltro;
      pintar(root);
      return;
    }
    const silenciar = e.target.closest('[data-al-silenciar]');
    if (silenciar) {
      const id = silenciar.dataset.alSilenciar;
      await mutarSilencio(
        root,
        `/api/executive/alerts/${encodeURIComponent(id)}/silenciar`,
        { horas: Number(silenciar.dataset.alHoras) },
        'Alerta silenciada',
      );
      return;
    }
    const reactivar = e.target.closest('[data-al-reactivar]');
    if (reactivar) {
      const id = reactivar.dataset.alReactivar;
      await mutarSilencio(root, `/api/executive/alerts/${encodeURIComponent(id)}/reactivar`, {}, 'Alerta reactivada');
      return;
    }
    const accion = e.target.closest('[data-al-tipo]');
    if (accion) {
      ejecutarAccion(accion.dataset.alTipo, accion.dataset.alValor);
      return;
    }
    if (e.target.closest('#al-refrescar')) {
      const boton = e.target.closest('#al-refrescar');
      boton.disabled = true;
      await cargar(true);
      boton.disabled = false;
      pintar(root);
      if (estado.error) toast('No se pudieron actualizar las alertas', 'err');
    }
  });
};
