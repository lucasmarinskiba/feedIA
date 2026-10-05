import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { loadingScreen } from '../lib/ui.js';

const CATEGORIAS = {
  decision: {
    label: 'Decisiones',
    emoji: '✋',
    descripcion: 'Aprobaciones y rechazos sobre lo que propusieron tus agentes.',
  },
  cuentas: { label: 'Cuentas', emoji: '🔌', descripcion: 'Cuentas de Instagram y TikTok conectadas o desconectadas.' },
  okr: { label: 'OKR', emoji: '🏁', descripcion: 'Objetivos creados o actualizados con sus resultados clave.' },
  autopilot: {
    label: 'Autopilot',
    emoji: '🤖',
    descripcion: 'Corridas de los autopilots de Instagram y TikTok y sus señales.',
  },
  auditoria: { label: 'Auditoría', emoji: '🩺', descripcion: 'Auditorías semanales y su puntaje general.' },
  ia: { label: 'Herramientas IA', emoji: '🧰', descripcion: 'Herramientas IA que generaron un resultado para vos.' },
  experimento: {
    label: 'Experimentos',
    emoji: '🧪',
    descripcion: 'Experimentos A/B creados, iniciados, cerrados o descartados, con su veredicto.',
  },
};
const ACTOR = { vos: 'Vos', sistema: 'Sistema', 'sistema (expiró)': 'Sistema' };

const ESTILOS = `<style>
  .bi-wrap{display:flex;flex-direction:column;gap:16px;color:var(--text-primary,#fafafa);}
  .bi-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .bi-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .bi-barra{display:flex;gap:10px;flex-wrap:wrap;align-items:center;justify-content:space-between;}
  .bi-buscar{flex:1;min-width:200px;max-width:380px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:9px 12px;color:inherit;font:inherit;font-size:13.5px;}
  .bi-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .bi-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 11px;border-radius:999px;font-size:12px;cursor:pointer;}
  .bi-chip.on{background:#fdba74;color:#111;border-color:#fdba74;}
  .bi-chip em{font-style:normal;opacity:.7;margin-left:4px;}
  .bi-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:8px 14px;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;cursor:pointer;}
  .bi-leyenda{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px 14px;font-size:12.5px;color:var(--text-tertiary,#a1a1aa);}
  .bi-leyenda summary{cursor:pointer;color:var(--text-secondary,#d4d4d8);font-weight:600;}
  .bi-leyenda ul{margin:8px 0 0;padding-left:18px;line-height:1.6;}
  .bi-dia{font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:var(--text-tertiary,#a1a1aa);margin:14px 0 6px;font-weight:700;}
  .bi-linea{display:flex;flex-direction:column;gap:8px;border-left:2px solid var(--border,rgba(255,255,255,.08));padding-left:14px;}
  .bi-ev{display:grid;grid-template-columns:52px 1fr;gap:10px;padding:10px 12px;border-radius:12px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);}
  .bi-hora{font-size:12px;color:var(--text-tertiary,#a1a1aa);font-variant-numeric:tabular-nums;padding-top:2px;}
  .bi-titulo{font-size:13.5px;font-weight:700;line-height:1.4;}
  .bi-detalle{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;margin-top:2px;}
  .bi-meta{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-top:6px;font-size:11px;}
  .bi-tag{padding:2px 8px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text-secondary,#d4d4d8);}
  .bi-res{padding:2px 8px;border-radius:999px;background:rgba(16,185,129,.14);color:#6ee7b7;}
  .bi-vacio{padding:32px 20px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .bi-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
</style>`;

let estado = { categoria: null, texto: '', dias: [], total: 0, porCategoria: {}, error: false, cargando: false };

const etiquetaDia = (dia) => {
  const hoy = new Date();
  const ayer = new Date(Date.now() - 86400000);
  const aISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (dia === aISO(hoy)) return 'Hoy';
  if (dia === aISO(ayer)) return 'Ayer';
  const [y, m, d] = dia.split('-');
  return y && m && d ? `${d}/${m}/${y}` : dia;
};

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const urlExport = () => {
  const p = new URLSearchParams({ formato: 'csv' });
  if (estado.categoria) p.set('categoria', estado.categoria);
  if (estado.texto) p.set('q', estado.texto);
  return `/api/executive/bitacora?${p.toString()}`;
};

const chipsHtml = () => {
  const todas = `<button class="bi-chip${estado.categoria === null ? ' on' : ''}" data-bi-cat="">Todas<em>${escape(String(estado.porCategoria && Object.values(estado.porCategoria).reduce((s, n) => s + n, 0)))}</em></button>`;
  const resto = Object.entries(CATEGORIAS)
    .map(
      ([id, c]) =>
        `<button class="bi-chip${estado.categoria === id ? ' on' : ''}" data-bi-cat="${id}">${c.emoji} ${escape(c.label)}<em>${escape(String(estado.porCategoria[id] ?? 0))}</em></button>`,
    )
    .join('');
  return todas + resto;
};

const eventoHtml = (e) => {
  const c = CATEGORIAS[e.categoria] ?? { label: e.categoria, emoji: '•' };
  return `<article class="bi-ev">
    <div class="bi-hora">${escape(hora(e.cuando))}</div>
    <div>
      <div class="bi-titulo">${c.emoji} ${escape(e.titulo)}</div>
      ${e.detalle ? `<div class="bi-detalle">${escape(e.detalle)}</div>` : ''}
      <div class="bi-meta">
        <span class="bi-tag">${escape(c.label)}</span>
        <span class="bi-tag">${escape(ACTOR[e.actor] ?? e.actor)}</span>
        ${e.resultado ? `<span class="bi-res">${escape(e.resultado)}</span>` : ''}
      </div>
    </div>
  </article>`;
};

const contenidoHtml = () => {
  if (estado.error)
    return '<div class="bi-error">No se pudo cargar la bitácora: revisá la conexión con el backend.</div>';
  if (estado.cargando) return loadingScreen();
  if (estado.total === 0) {
    return `<div class="bi-vacio">
      ${estado.categoria || estado.texto ? 'No hay acciones con estos filtros.' : 'Todavía no hay acciones registradas.'}
      <br>Cada decisión que aprobás o rechazás, cada auditoría, objetivo, corrida de autopilot, conexión de cuenta o herramienta IA queda anotada acá con su resultado.
    </div>`;
  }
  return estado.dias
    .map(
      (d) => `<div class="bi-dia">${escape(etiquetaDia(d.dia))} · ${d.eventos.length} acción(es)</div>
      <div class="bi-linea">${d.eventos.map(eventoHtml).join('')}</div>`,
    )
    .join('');
};

const pintar = (root) => {
  const chips = root.querySelector('#bi-chips');
  if (chips) chips.innerHTML = chipsHtml();
  const cuerpo = root.querySelector('#bi-cuerpo');
  if (cuerpo) cuerpo.innerHTML = contenidoHtml();
  const exportar = root.querySelector('#bi-exportar');
  if (exportar) exportar.setAttribute('href', urlExport());
};

const cargar = async () => {
  estado.cargando = true;
  const p = new URLSearchParams({ limit: '200' });
  if (estado.categoria) p.set('categoria', estado.categoria);
  if (estado.texto) p.set('q', estado.texto);
  const { data, error } = await apiSafe(`/api/executive/bitacora?${p.toString()}`, null);
  estado.cargando = false;
  estado.error = Boolean(error);
  estado.total = data?.total ?? 0;
  estado.dias = Array.isArray(data?.dias) ? data.dias : [];
  estado.porCategoria = data?.porCategoria ?? {};
};

export const renderBitacora = async (root) => {
  estado = { categoria: null, texto: '', dias: [], total: 0, porCategoria: {}, error: false, cargando: true };
  root.innerHTML = `${ESTILOS}
    <div class="bi-wrap">
      <div class="bi-cab">
        <h2>📒 Bitácora</h2>
        <p>Lo que hizo FeedIA y lo que aprobaste, en orden y con su resultado. Filtrá por tipo o buscá una palabra para encontrar algo sin revisar nada técnico.</p>
      </div>
      <div class="bi-barra">
        <input class="bi-buscar" id="bi-buscar" type="search" placeholder="Buscar en la bitácora…" value="" />
        <a class="bi-btn" id="bi-exportar" href="#" download>⬇ Exportar CSV</a>
      </div>
      <div class="bi-chips" id="bi-chips"></div>
      <details class="bi-leyenda">
        <summary>¿Qué significa cada categoría?</summary>
        <ul>${Object.values(CATEGORIAS)
          .map((c) => `<li><strong>${c.emoji} ${escape(c.label)}:</strong> ${escape(c.descripcion)}</li>`)
          .join('')}</ul>
      </details>
      <div id="bi-cuerpo">${loadingScreen()}</div>
    </div>`;
  await cargar();
  pintar(root);

  let temporizador = null;
  root.addEventListener('click', async (e) => {
    const chip = e.target.closest('[data-bi-cat]');
    if (!chip) return;
    estado.categoria = chip.dataset.biCat || null;
    estado.cargando = true;
    pintar(root);
    await cargar();
    pintar(root);
  });
  root.addEventListener('input', (e) => {
    if (e.target.id !== 'bi-buscar') return;
    clearTimeout(temporizador);
    temporizador = setTimeout(async () => {
      estado.texto = e.target.value.trim();
      estado.cargando = true;
      pintar(root);
      await cargar();
      pintar(root);
    }, 300);
  });
};
