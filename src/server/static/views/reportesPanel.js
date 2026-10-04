import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const PERIODOS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'halfYear', label: '6 meses' },
  { id: 'year', label: 'Año' },
];
const RED = { instagram: 'Instagram', tiktok: 'TikTok' };
const URGENCIA = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};
const ORIGEN = {
  'carousel-factory': 'Carousel Factory',
  'comment-brain': 'Comment Brain',
  'swarm-conductor': 'Swarm Conductor',
  'social-connector': 'Conector de redes',
  'budget-guardian': 'Guardián de presupuesto',
  'okr-tracker': 'Seguimiento OKR',
  'ig-autopilot': 'Instagram Autopilot',
  'tt-autopilot': 'TikTok Autopilot',
};
const ESTADO_OKR = {
  'on-track': 'En meta',
  ahead: 'Adelantado',
  'at-risk': 'En riesgo',
  behind: 'Atrasado',
  completed: 'Completado',
};
const CATEGORIA_OKR = {
  growth: 'Crecimiento',
  engagement: 'Engagement',
  revenue: 'Ingresos',
  brand: 'Marca',
  efficiency: 'Eficiencia',
  community: 'Comunidad',
};
const PERIODO_OKR = { month: 'Mes', quarter: 'Trimestre', year: 'Año' };
const PRIORIDAD = { alta: 'alta', media: 'media', baja: 'baja' };
const FUENTE_MIRA = { ia: 'Interpretado por IA', reglas: 'Reglas automáticas' };

const ESTILOS_HOJA = `
  .rep-hoja{background:#fff;color:#111827;border-radius:14px;padding:32px 36px;max-width:960px;margin:0 auto;font-family:Inter,system-ui,sans-serif;font-size:13px;line-height:1.5;}
  .rep-encabezado{display:flex;justify-content:space-between;gap:16px;align-items:flex-end;border-bottom:2px solid #111827;padding-bottom:14px;margin-bottom:18px;}
  .rep-marca{font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:#6b7280;font-weight:600;}
  .rep-encabezado h2{margin:4px 0 0;font-size:24px;letter-spacing:-0.02em;}
  .rep-meta{font-size:12px;color:#4b5563;text-align:right;}
  .rep-seccion{margin:0 0 20px;break-inside:avoid;}
  .rep-seccion h3{margin:0 0 10px;font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#111827;border-bottom:1px solid #e5e7eb;padding-bottom:6px;}
  .rep-seccion h4{margin:14px 0 6px;font-size:12px;color:#374151;}
  .rep-lista{margin:0;padding-left:18px;}
  .rep-lista li{margin:4px 0;}
  .rep-lista-num{margin:0;padding-left:20px;}
  .rep-lista-num li{margin:6px 0;}
  .rep-nota{margin:4px 0;color:#6b7280;font-size:12px;}
  .rep-kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin:8px 0;}
  .rep-kpi{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px;display:flex;flex-direction:column;gap:2px;}
  .rep-kpi span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;font-weight:600;}
  .rep-kpi strong{font-size:15px;color:#111827;}
  .rep-cuenta,.rep-objetivo{border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;margin-bottom:12px;break-inside:avoid;}
  .rep-cuenta-cab{display:flex;gap:8px;align-items:baseline;}
  .rep-cuenta-cab span{color:#6b7280;}
  .rep-top{margin:6px 0 0;padding-left:18px;}
  .rep-top li{margin:6px 0;}
  .rep-top em{display:block;color:#6b7280;font-style:normal;font-size:12px;}
  .rep-top a{font-size:12px;color:#1d4ed8;}
  .rep-objetivo-cab{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
  .rep-chip{font-size:11px;color:#4b5563;background:#f3f4f6;border-radius:999px;padding:2px 8px;}
  .rep-estado{font-size:11px;font-weight:700;border-radius:999px;padding:2px 9px;margin-left:auto;background:#f3f4f6;color:#374151;}
  .rep-estado[data-estado="on-track"],.rep-estado[data-estado="ahead"],.rep-estado[data-estado="completed"]{background:#dcfce7;color:#166534;}
  .rep-estado[data-estado="at-risk"]{background:#fef3c7;color:#92400e;}
  .rep-estado[data-estado="behind"]{background:#fee2e2;color:#991b1b;}
  .rep-barra{height:8px;border-radius:999px;background:#f3f4f6;overflow:hidden;margin:8px 0 2px;}
  .rep-barra span{display:block;height:100%;background:#111827;}
  .rep-tabla{width:100%;border-collapse:collapse;margin-top:8px;font-size:12px;}
  .rep-tabla th,.rep-tabla td{text-align:left;border-top:1px solid #e5e7eb;padding:5px 6px;}
  .rep-tabla th{color:#6b7280;font-weight:600;font-size:11px;}
  .rep-mira{margin:0;padding:12px 14px;border-left:3px solid #111827;background:#f9fafb;}
  .rep-limitaciones{border-top:1px solid #e5e7eb;padding-top:12px;font-size:11.5px;color:#6b7280;}
  .rep-limitaciones ul{margin:6px 0 0;padding-left:18px;}
  @media (max-width:720px){.rep-hoja{padding:20px;}.rep-encabezado{flex-direction:column;align-items:flex-start;}.rep-meta{text-align:left;}}
`;

const ESTILOS_PANEL = `<style>
  .rp-wrap{display:flex;flex-direction:column;gap:18px;color:var(--v2-fg,#fafafa);--v2-line:var(--border,rgba(255,255,255,.08));--v2-fg-2:var(--text-secondary,#d4d4d8);--v2-fg-3:var(--text-tertiary,#a1a1aa);--v2-hover:var(--bg-hover,rgba(255,255,255,.04));}
  .rp-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;color:var(--v2-fg-3);}
  .rp-h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;}
  .rp-desc{margin:0;font-size:13px;line-height:1.55;color:var(--v2-fg-3);max-width:760px;}
  .rp-controles{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
  .rp-periodos{display:flex;gap:6px;flex-wrap:wrap;}
  .rp-chip{border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .rp-chip.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .rp-acciones{display:flex;gap:8px;flex-wrap:wrap;}
  .rp-btn{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:9px;border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);font-size:13px;font-weight:600;cursor:pointer;}
  .rp-btn:hover{background:var(--v2-hover);color:var(--v2-fg,#fafafa);}
  .rp-btn.rp-btn-primary{background:#fdba74;color:#111;border-color:#fdba74;}
  .rp-btn.rp-btn-primary:hover{background:#fb923c;color:#111;}
  .rp-aviso{color:#fbbf24;font-size:13px;}
  .rp-cargando{display:flex;justify-content:center;padding:40px;}
  .rp-vacio{border:1px dashed var(--v2-line);border-radius:14px;padding:32px 24px;text-align:center;color:var(--v2-fg-3);font-size:13px;}
</style>`;

const num = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : 'sin dato');
const pct = (n) => (typeof n === 'number' ? `${n.toFixed(1)}%` : 'sin dato');
const signo = (n) => `${n > 0 ? '+' : ''}${Math.round(n).toLocaleString('es-AR')}`;
const usd = (n) => `USD ${Math.round(n).toLocaleString('es-AR')}`;
const acotar = (n) => Math.max(0, Math.min(100, Number(n) || 0));
const fecha = (iso) => new Date(iso).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' });
const fechaHora = (iso) => new Date(iso).toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' });

const kpis = (items) =>
  `<div class="rep-kpis">${items
    .map(
      ([etiqueta, valor]) =>
        `<div class="rep-kpi"><span>${escape(etiqueta)}</span><strong>${escape(valor)}</strong></div>`,
    )
    .join('')}</div>`;

const cuentaHtml = (c) => {
  const cabecera = `<div class="rep-cuenta-cab"><strong>${escape(RED[c.plataforma] ?? c.plataforma)}</strong><span>${escape(c.handle ?? '')}</span></div>`;
  if (!c.conectado) {
    const motivo =
      c.error === 'token_expired'
        ? 'La conexión venció: no hay métricas nuevas.'
        : 'Sin conectar: no hay métricas en este reporte.';
    return `<article class="rep-cuenta">${cabecera}<p class="rep-nota">${escape(motivo)}</p></article>`;
  }
  const crecimiento =
    c.crecimiento.valor !== null ? `${signo(c.crecimiento.valor)} (${pct(c.crecimiento.pct)})` : 'sin historial';
  const top = c.topPosts.length
    ? `<h4>Mejores publicaciones del período</h4><ol class="rep-top">${c.topPosts
        .map(
          (t) => `<li>${escape(t.texto)}
            <em>${escape(t.formato)} · ${escape(num(t.interacciones))} interacciones · tasa ${escape(pct(t.tasaInteraccion))}</em>
            ${t.url ? `<a href="${escape(t.url)}" target="_blank" rel="noopener noreferrer">Ver publicación</a>` : ''}
          </li>`,
        )
        .join('')}</ol>`
    : '';
  return `<article class="rep-cuenta">
    ${cabecera}
    ${kpis([
      ['Seguidores', num(c.seguidores)],
      ['Crecimiento del período', crecimiento],
      [`${c.alcanceEtiqueta} 30 días`, num(c.alcance30d)],
      ['Tasa mediana', pct(c.tasaMediana)],
      ['Publicaciones 30 días', num(c.publicaciones30d)],
      ['Interacciones 30 días', num(c.interacciones30d)],
      ['Mejor formato', c.mejorFormato ?? 'sin dato'],
      ['Mejor hora', typeof c.mejorHora === 'number' ? `${c.mejorHora}h` : 'sin dato'],
    ])}
    ${top}
  </article>`;
};

const objetivosHtml = (o) => {
  if (o.total === 0) {
    return '<p class="rep-nota">Todavía no hay objetivos activos. Creá uno en OKRs para verlo acá.</p>';
  }
  const resumen = kpis([
    ['Activos', num(o.total)],
    ['En meta', num(o.enMeta)],
    ['En riesgo', num(o.enRiesgo)],
    ['Atrasados', num(o.atrasados)],
    ['Progreso promedio', pct(o.progresoPromedioPct)],
  ]);
  const lista = o.lista
    .map(
      (obj) => `<div class="rep-objetivo">
        <div class="rep-objetivo-cab">
          <strong>${escape(obj.titulo)}</strong>
          <span class="rep-chip">${escape(CATEGORIA_OKR[obj.categoria] ?? obj.categoria)} · ${escape(PERIODO_OKR[obj.periodo] ?? obj.periodo)}</span>
          <span class="rep-estado" data-estado="${escape(obj.estado)}">${escape(ESTADO_OKR[obj.estado] ?? obj.estado)}</span>
        </div>
        ${obj.porque ? `<p class="rep-nota">Por qué: ${escape(obj.porque)}</p>` : ''}
        <div class="rep-barra"><span style="width:${acotar(obj.progresoPct)}%"></span></div>
        <small class="rep-nota">${escape(pct(obj.progresoPct))} del objetivo</small>
        ${
          obj.resultados.length
            ? `<table class="rep-tabla"><thead><tr><th>Resultado clave</th><th>Actual</th><th>Meta</th><th>Progreso</th></tr></thead><tbody>${obj.resultados
                .map(
                  (r) =>
                    `<tr><td>${escape(r.descripcion)}</td><td>${escape(num(r.actual))} ${escape(r.unidad)}</td><td>${escape(num(r.meta))} ${escape(r.unidad)}</td><td>${escape(pct(r.progresoPct))}</td></tr>`,
                )
                .join('')}</tbody></table>`
            : ''
        }
      </div>`,
    )
    .join('');
  return resumen + lista;
};

const decisionesHtml = (d) => {
  const resumen = kpis([
    ['Pendientes ahora', num(d.pendientes)],
    ['Decisiones del período', num(d.enPeriodo)],
    ['Aprobadas', num(d.aprobadas)],
    ['Rechazadas', num(d.rechazadas)],
    ['Ejecutadas automáticamente', num(d.autoEjecutadas)],
    ['Tasa de aprobación', pct(d.tasaAprobacionPct)],
    [
      'Tiempo medio de resolución',
      typeof d.tiempoResolucionMin === 'number' ? `${num(d.tiempoResolucionMin)} min` : 'sin dato',
    ],
  ]);
  const pendientes = d.ultimasPendientes.length
    ? `<h4>Esperando tu aprobación</h4><ul class="rep-lista">${d.ultimasPendientes
        .map(
          (p) =>
            `<li><strong>${escape(p.titulo)}</strong> <span class="rep-nota">${escape(ORIGEN[p.origen] ?? p.origen)} · urgencia ${escape(URGENCIA[p.urgencia] ?? p.urgencia)} · ${escape(fecha(p.creada))}</span></li>`,
        )
        .join('')}</ul>`
    : '<p class="rep-nota">No hay decisiones pendientes.</p>';
  return resumen + pendientes;
};

const propuestasHtml = (lista) =>
  lista.length
    ? `<ul class="rep-lista">${lista
        .map(
          (p) =>
            `<li><strong>${escape(p.titulo)}</strong> <span class="rep-nota">${escape(p.agente)} · prioridad ${escape(PRIORIDAD[p.prioridad] ?? p.prioridad)}</span><p class="rep-nota">${escape(p.detalle)} Dato: ${escape(p.dato)}.</p></li>`,
        )
        .join('')}</ul>`
    : '<p class="rep-nota">No hay propuestas abiertas.</p>';

const hojaHtml = (r) => `
  <article class="rep-hoja">
    <header class="rep-encabezado">
      <div>
        <span class="rep-marca">FeedIA · Reporte ejecutivo</span>
        <h2>${escape(r.marca)}</h2>
      </div>
      <div class="rep-meta">Período: ${escape(r.periodoEtiqueta)} (${escape(String(r.dias))} días)<br>Generado: ${escape(fechaHora(r.generadoEn))}</div>
    </header>

    <section class="rep-seccion"><h3>1. Resumen</h3>
      <ul class="rep-lista">${r.resumen.map((l) => `<li>${escape(l)}</li>`).join('')}</ul>
    </section>

    <section class="rep-seccion"><h3>2. Cuentas y publicaciones</h3>
      ${r.cuentas.map(cuentaHtml).join('')}
    </section>

    <section class="rep-seccion"><h3>3. Objetivos (OKR)</h3>
      ${objetivosHtml(r.objetivos)}
    </section>

    <section class="rep-seccion"><h3>4. Decisiones</h3>
      ${decisionesHtml(r.decisiones)}
    </section>

    <section class="rep-seccion"><h3>5. Propuestas del equipo</h3>
      ${propuestasHtml(r.propuestas)}
    </section>

    <section class="rep-seccion"><h3>6. Economía operativa (acumulada desde el inicio)</h3>
      ${kpis([
        ['Piezas creadas', num(r.economia.piezas)],
        ['Carruseles / videos', `${num(r.economia.piezasCarruseles)} / ${num(r.economia.piezasVideos)}`],
        ['Horas humanas ahorradas', num(r.economia.horasAhorradas)],
        ['Costo humano equivalente', usd(r.economia.costoHumanoUsd)],
        ['Gasto de IA', usd(r.economia.gastosIaUsd)],
        ['Ahorro estimado', usd(r.economia.ahorroUsd)],
      ])}
    </section>

    <section class="rep-seccion"><h3>7. Actividad del equipo</h3>
      ${kpis([
        ['Acciones últimas 24 h', num(r.actividad.acciones24h)],
        ['Acciones últimos 7 días', num(r.actividad.acciones7d)],
        ['Agentes activos (7 días)', num(r.actividad.agentesActivos7d)],
        ['Misiones fallidas (7 días)', num(r.actividad.misionesFallidas7d)],
        ['Carruseles en revisión', num(r.actividad.carruselesEnRevision)],
        ['Piezas producidas', num(r.actividad.piezas)],
        ['Comentarios revisados', num(r.actividad.comentariosRevisados)],
        ['Respuestas preparadas', num(r.actividad.respuestasPreparadas)],
      ])}
    </section>

    <section class="rep-seccion"><h3>8. Lectura de Mira</h3>
      ${
        r.mira
          ? `<p class="rep-mira">${escape(r.mira.general)}</p><p class="rep-nota">${escape(RED[r.mira.plataforma] ?? '')} · ${escape(FUENTE_MIRA[r.mira.fuente] ?? '')}</p>`
          : '<p class="rep-nota">Todavía no hay lectura de posts: hace falta una cuenta conectada con publicaciones.</p>'
      }
    </section>

    <section class="rep-seccion"><h3>9. Recomendaciones</h3>
      <ol class="rep-lista-num">${r.recomendaciones.map((x) => `<li>${escape(x)}</li>`).join('')}</ol>
    </section>

    <footer class="rep-limitaciones">
      <strong>Limitaciones de los datos</strong>
      <ul>${r.limitaciones.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>
    </footer>
  </article>`;

export const crearPanelReportes = () => {
  let datos = null;
  let huboError = false;
  let periodo = 'month';

  const cargar = async () => {
    const { data, error } = await apiSafe(`/api/executive/report?periodo=${encodeURIComponent(periodo)}`, null);
    datos = data && typeof data === 'object' ? data : null;
    huboError = Boolean(error);
    return !error;
  };

  const cabecera = () => `
    <div>
      <div class="rp-eyebrow">Reportes</div>
      <h2 class="rp-h2">Resumen ejecutivo</h2>
      <p class="rp-desc">Cuentas, publicaciones, objetivos, decisiones, economía y actividad del equipo, con datos reales. Imprimí o guardá como PDF.${huboError ? ' <span class="rp-aviso">No se pudo generar el reporte: revisá la conexión con el backend.</span>' : ''}</p>
    </div>`;

  const controles = () => `
    <div class="rp-controles">
      <div class="rp-periodos">${PERIODOS.map(
        (p) =>
          `<button class="rp-chip${p.id === periodo ? ' is-on' : ''}" data-rep-periodo="${p.id}">${escape(p.label)}</button>`,
      ).join('')}</div>
      <div class="rp-acciones">
        <button class="rp-btn" data-rep-refrescar>Actualizar</button>
        <button class="rp-btn rp-btn-primary" data-rep-imprimir>Imprimir / guardar PDF</button>
      </div>
    </div>`;

  const cuerpo = () => (datos ? hojaHtml(datos) : '<div class="rp-vacio">Todavía no hay datos para el reporte.</div>');

  const imprimir = () => {
    if (!datos) {
      toast('Todavía no hay reporte para imprimir', 'warn');
      return;
    }
    const ventana = window.open('', '_blank');
    if (!ventana) {
      toast('Permití las ventanas emergentes para imprimir el reporte', 'warn');
      return;
    }
    ventana.document.write(
      `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reporte ejecutivo · ${escape(datos.marca)}</title><style>${ESTILOS_HOJA}@page{size:A4;margin:14mm}body{margin:0;background:#fff;}</style></head><body>${hojaHtml(datos)}</body></html>`,
    );
    ventana.document.close();
    ventana.focus();
    setTimeout(() => ventana.print(), 300);
  };

  const pintar = (wrap) => {
    wrap.querySelector('.rp-controles').outerHTML = controles();
    wrap.querySelector('.rp-cuerpo').innerHTML = cuerpo();
  };

  return {
    cargar,
    html: () => `<div class="rp-wrap">
      ${cabecera()}
      ${controles()}
      <div class="rp-cuerpo">${cuerpo()}</div>
      ${ESTILOS_PANEL}
      <style>${ESTILOS_HOJA}</style>
    </div>`,
    wire: (contenedor) => {
      const wrap = contenedor.querySelector('.rp-wrap');
      if (!wrap) return;
      wrap.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-rep-periodo],[data-rep-refrescar],[data-rep-imprimir]');
        if (!t || !wrap.contains(t)) return;
        if (t.hasAttribute('data-rep-imprimir')) {
          imprimir();
          return;
        }
        if (t.dataset.repPeriodo) {
          periodo = t.dataset.repPeriodo;
          wrap.querySelector('.rp-cuerpo').innerHTML =
            '<div class="rp-cargando"><span class="spinner lg"></span></div>';
        }
        t.disabled = true;
        const ok = await cargar();
        pintar(wrap);
        if (!ok) toast('No se pudo generar el reporte', 'err');
      });
    },
  };
};
