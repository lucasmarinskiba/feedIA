import { api, apiBust, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const RUTA = '/api/executive/junta';

const SECCIONES = [
  { id: 'decisiones', label: '⚖️ Decisiones' },
  { id: 'programacion', label: '🗓️ Programación' },
  { id: 'proyectos', label: '🎬 Proyectos' },
  { id: 'estrategias', label: '🏁 Estrategias' },
  { id: 'numeros', label: '📊 Números' },
];

const URGENCIA = {
  critical: { label: 'Crítica', color: '#f87171' },
  high: { label: 'Alta', color: '#fbbf24' },
  medium: { label: 'Media', color: '#60a5fa' },
  low: { label: 'Baja', color: '#a1a1aa' },
};

const TONO = {
  alerta: { color: '#fca5a5', fondo: 'rgba(248,113,113,.12)', icono: '🔴' },
  atencion: { color: '#fcd34d', fondo: 'rgba(251,191,36,.1)', icono: '🟡' },
  bien: { color: '#6ee7b7', fondo: 'rgba(16,185,129,.1)', icono: '🟢' },
};

const ESTADOS_PROYECTO = [
  { id: 'planificado', label: 'Planificado' },
  { id: 'en-curso', label: 'En curso' },
  { id: 'pausado', label: 'Pausado' },
  { id: 'completado', label: 'Completado' },
];

const ESTILOS = `<style>
  .jt-wrap{display:flex;flex-direction:column;gap:18px;color:var(--text-primary,#fafafa);margin-top:24px;}
  .jt-cab{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;}
  .jt-cab h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .jt-cab p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;max-width:640px;}
  .jt-nav{display:flex;gap:6px;flex-wrap:wrap;position:sticky;top:0;z-index:2;padding:8px 0;background:var(--bg,transparent);}
  .jt-nav a{border:1px solid var(--border,rgba(255,255,255,.12));color:var(--text-secondary,#d4d4d8);padding:6px 12px;border-radius:999px;font-size:12.5px;text-decoration:none;}
  .jt-nav a:hover{border-color:#fdba74;color:#fdba74;}
  .jt-btn{border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:var(--text-secondary,#d4d4d8);padding:7px 13px;border-radius:10px;font-size:12.5px;font-weight:600;cursor:pointer;}
  .jt-btn.primario{background:#fdba74;color:#111;border-color:#fdba74;}
  .jt-btn.peligro{color:#fca5a5;border-color:rgba(248,113,113,.35);}
  .jt-btn:disabled{opacity:.5;cursor:not-allowed;}
  .jt-bloque{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:16px;background:var(--bg-card,rgba(255,255,255,.02));display:flex;flex-direction:column;gap:12px;scroll-margin-top:60px;}
  .jt-bloque h3{margin:0;font-size:15px;}
  .jt-ayuda{font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;margin:0;}
  .jt-cifras{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;}
  .jt-cifra{border-radius:12px;padding:12px;background:var(--bg-hover,rgba(255,255,255,.04));border-top:3px solid #60a5fa;display:flex;flex-direction:column;gap:4px;}
  .jt-cifra span{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text-tertiary,#a1a1aa);}
  .jt-cifra b{font-size:22px;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
  .jt-cifra small{font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .jt-mensajes{display:flex;flex-direction:column;gap:6px;}
  .jt-mensaje{font-size:13px;line-height:1.5;padding:9px 12px;border-radius:10px;}
  .jt-grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;}
  .jt-fila{display:grid;grid-template-columns:minmax(120px,1fr) 2fr auto;gap:10px;align-items:center;font-size:12.5px;}
  .jt-fila-nombre small{display:block;color:var(--text-tertiary,#a1a1aa);font-size:11px;}
  .jt-barra{height:10px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;}
  .jt-barra i{display:block;height:100%;border-radius:999px;}
  .jt-val{font-variant-numeric:tabular-nums;font-weight:600;white-space:nowrap;}
  .jt-tags{display:flex;gap:5px;flex-wrap:wrap;}
  .jt-tag{font-size:10.5px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.06);color:var(--text-secondary,#d4d4d8);}
  .jt-item{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:8px;}
  .jt-item-cab{display:flex;justify-content:space-between;gap:8px;align-items:flex-start;flex-wrap:wrap;}
  .jt-item strong{font-size:14px;line-height:1.35;}
  .jt-acciones{display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end;}
  .jt-tabla{width:100%;border-collapse:collapse;font-size:12px;}
  .jt-tabla th,.jt-tabla td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));}
  .jt-tabla th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,#a1a1aa);font-weight:600;}
  .jt-form{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;}
  .jt-campo{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:600;color:var(--text-secondary,#d4d4d8);}
  .jt-campo.ancho{grid-column:1/-1;}
  .jt-campo input,.jt-campo select,.jt-campo textarea{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.1));border-radius:10px;padding:8px 10px;color:inherit;font:inherit;font-size:13px;font-weight:400;}
  .jt-tareas{display:flex;flex-direction:column;gap:6px;}
  .jt-tarea{display:flex;gap:8px;align-items:center;font-size:12.5px;}
  .jt-tarea.hecha span{text-decoration:line-through;color:var(--text-tertiary,#a1a1aa);}
  .jt-vacio{padding:18px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .jt-error{padding:10px 12px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:12.5px;}
  .jt-cal{max-width:340px;border:1px solid var(--border,rgba(255,255,255,.08));border-radius:18px;padding:12px;display:flex;flex-direction:column;gap:8px;background:var(--bg-hover,rgba(255,255,255,.03));}
  .jt-cal-cab{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:13px;}
  .jt-cal-nav{width:28px;height:28px;border-radius:50%;border:1px solid var(--border,rgba(255,255,255,.12));background:transparent;color:inherit;cursor:pointer;font-size:16px;line-height:1;}
  .jt-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px;}
  .jt-cal-sem{font-size:10px;text-align:center;color:var(--text-tertiary,#a1a1aa);padding:2px 0;}
  .jt-cal-vacia{display:block;}
  .jt-cal-dia{aspect-ratio:1;border:none;border-radius:9px;background:transparent;color:inherit;font-size:12px;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:0;}
  .jt-cal-dia:hover{background:rgba(255,255,255,.06);}
  .jt-cal-dia.hoy{box-shadow:inset 0 0 0 1px #fdba74;}
  .jt-cal-dia.con{font-weight:700;}
  .jt-cal-dia.sel{background:#fdba74;color:#111;}
  .jt-cal-puntos{display:flex;gap:2px;}
  .jt-cal-puntos i{display:inline-block;width:5px;height:5px;border-radius:50%;}
  .jt-cal-leyenda{display:flex;gap:10px;justify-content:center;font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .jt-cal-leyenda i,.jt-punto{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:6px;}
  .jt-agenda-dia{font-size:11px;text-transform:uppercase;letter-spacing:.06em;font-weight:700;color:var(--text-tertiary,#a1a1aa);margin-top:6px;}
  .jt-agenda-item{display:grid;grid-template-columns:52px 1fr auto;gap:8px;align-items:center;font-size:12.5px;padding:8px 10px;border-radius:10px;background:var(--bg-hover,rgba(255,255,255,.04));}
  .jt-agenda-hora{font-weight:700;font-variant-numeric:tabular-nums;color:#fdba74;}
  @media (max-width:720px){ .jt-fila{grid-template-columns:1fr;} .jt-acciones{justify-content:flex-start;} .jt-agenda-item{grid-template-columns:52px 1fr;} }
</style>`;

const state = {
  datos: null,
  error: false,
  cargando: false,
  ocupado: null,
  mostrarFormProyecto: false,
  mes: null,
  diaSel: null,
};
const enlazados = new WeakSet();

const razonDe = (err, respaldo) =>
  typeof err?.code === 'string' && !err.code.startsWith('HTTP_') ? err.code : respaldo;
const num = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : 'sin dato');
const pct = (n, d = 2) => (typeof n === 'number' ? `${(n * 100).toFixed(d).replace('.', ',')} %` : 'sin dato');
const porcentaje = (n) => (typeof n === 'number' ? `${n > 0 ? '+' : ''}${Math.round(n)} %` : 'sin dato');
const fecha = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
};
const fechaHora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const barra = (valor, max, color) => {
  const ancho = max > 0 ? Math.max(2, Math.min(100, Math.round((valor / max) * 100))) : 0;
  return `<div class="jt-barra"><i style="width:${ancho}%;background:${color};"></i></div>`;
};

const cifra = (titulo, valor, detalle = '', color = '#60a5fa') =>
  `<div class="jt-cifra" style="border-top-color:${color};"><span>${escape(titulo)}</span><b>${escape(String(valor))}</b>${detalle ? `<small>${escape(detalle)}</small>` : ''}</div>`;

const mensajesHtml = (mensajes) => {
  if (!mensajes?.length) return '<div class="jt-vacio">Sin novedades que destacar por ahora.</div>';
  return `<div class="jt-mensajes">${mensajes
    .map((m) => {
      const t = TONO[m.tono] ?? TONO.atencion;
      return `<div class="jt-mensaje" style="color:${t.color};background:${t.fondo};">${t.icono} ${escape(m.texto)}</div>`;
    })
    .join('')}</div>`;
};

const decisionesHtml = (d) => {
  const r = d.resumen;
  const cifras = r
    ? [
        cifra(
          'Pendientes',
          r.pendientes,
          r.criticas ? `${r.criticas} críticas` : 'sin críticas',
          r.criticas ? '#f87171' : '#60a5fa',
        ),
        cifra('Aprobadas (30 d)', r.aprobadasUltimos30, '', '#34d399'),
        cifra('Rechazadas (30 d)', r.rechazadasUltimos30, '', '#a1a1aa'),
        cifra(
          'Tasa de aprobación',
          r.tasaAprobacionPct === null ? 'sin dato' : `${r.tasaAprobacionPct} %`,
          'sobre decididas',
          '#fdba74',
        ),
      ].join('')
    : '';
  const pendientes = d.pendientes.length
    ? d.pendientes
        .map((x) => {
          const u = URGENCIA[x.urgencia] ?? URGENCIA.medium;
          const ocupado = state.ocupado === x.id;
          return `<article class="jt-item">
            <div class="jt-item-cab">
              <strong>${escape(x.titulo)}</strong>
              <span class="jt-tag" style="color:${u.color};">${escape(u.label)}</span>
            </div>
            <div class="jt-ayuda">Origen: ${escape(x.origen)} · ${escape(fechaHora(x.creadoEn))}${x.resultadoEsperado ? ` · Resultado esperado: ${escape(x.resultadoEsperado)}` : ''}</div>
            <div class="jt-acciones">
              <button class="jt-btn peligro" data-jt-accion="decidir" data-id="${escape(x.id)}" data-estado="rejected" ${ocupado ? 'disabled' : ''}>Rechazar</button>
              <button class="jt-btn primario" data-jt-accion="decidir" data-id="${escape(x.id)}" data-estado="approved" ${ocupado ? 'disabled' : ''}>${x.accion ? escape(x.accion) : 'Aprobar'}</button>
            </div>
          </article>`;
        })
        .join('')
    : '<div class="jt-vacio">No hay decisiones esperando tu respuesta.</div>';
  return `
    <section class="jt-bloque" id="jt-decisiones">
      <h3>⚖️ Decisiones</h3>
      <p class="jt-ayuda">Lo que los agentes proponen y necesita tu aprobación. Aprobar ejecuta la acción; rechazar la descarta.</p>
      ${cifras ? `<div class="jt-cifras">${cifras}</div>` : ''}
      <div style="display:flex;flex-direction:column;gap:10px;">${pendientes}</div>
    </section>`;
};

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const DIAS_CORTOS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const ESTADO_CAL = {
  scheduled: { label: 'Programado', color: '#93c5fd' },
  publishing: { label: 'Publicando', color: '#fcd34d' },
  published: { label: 'Publicado', color: '#6ee7b7' },
  failed: { label: 'Fallido', color: '#fca5a5' },
  draft: { label: 'Borrador', color: '#a1a1aa' },
  cancelled: { label: 'Cancelado', color: '#a1a1aa' },
};
const COLOR_PLATAFORMA = { instagram: '#fdba74', tiktok: '#93c5fd' };

const claveDia = (ms) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const hora = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
};

const widgetCalendarioHtml = (agenda, mes, diaSel) => {
  const primero = new Date(mes.y, mes.m, 1);
  const offset = (primero.getDay() + 6) % 7;
  const dias = new Date(mes.y, mes.m + 1, 0).getDate();
  const conteo = new Map();
  for (const it of agenda) {
    const t = it.cuando ? Date.parse(it.cuando) : NaN;
    if (!Number.isFinite(t)) continue;
    const k = claveDia(t);
    const c = conteo.get(k) ?? { instagram: 0, tiktok: 0 };
    c[it.plataforma] += 1;
    conteo.set(k, c);
  }
  const hoy = claveDia(Date.now());
  const celdas = [];
  for (let i = 0; i < offset; i++) celdas.push('<span class="jt-cal-vacia"></span>');
  for (let d = 1; d <= dias; d++) {
    const k = `${mes.y}-${String(mes.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const c = conteo.get(k);
    const clases = ['jt-cal-dia', k === hoy ? 'hoy' : '', k === diaSel ? 'sel' : '', c ? 'con' : '']
      .filter(Boolean)
      .join(' ');
    const puntos = c
      ? `<span class="jt-cal-puntos">${c.instagram ? `<i style="background:${COLOR_PLATAFORMA.instagram}"></i>` : ''}${c.tiktok ? `<i style="background:${COLOR_PLATAFORMA.tiktok}"></i>` : ''}</span>`
      : '';
    celdas.push(
      `<button class="${clases}" data-jt-accion="dia" data-dia="${k}" aria-label="${d} de ${MESES[mes.m]}${c ? `, ${c.instagram + c.tiktok} publicaciones` : ''}">${d}${puntos}</button>`,
    );
  }
  return `<div class="jt-cal" role="group" aria-label="Calendario de publicaciones">
    <div class="jt-cal-cab">
      <button class="jt-cal-nav" data-jt-accion="mes" data-paso="-1" aria-label="Mes anterior">‹</button>
      <strong>${MESES[mes.m]} ${mes.y}</strong>
      <button class="jt-cal-nav" data-jt-accion="mes" data-paso="1" aria-label="Mes siguiente">›</button>
    </div>
    <div class="jt-cal-grid">${DIAS_CORTOS.map((d) => `<span class="jt-cal-sem">${d}</span>`).join('')}${celdas.join('')}</div>
    <div class="jt-cal-leyenda"><span><i style="background:${COLOR_PLATAFORMA.instagram}"></i> Instagram</span><span><i style="background:${COLOR_PLATAFORMA.tiktok}"></i> TikTok</span></div>
    ${diaSel ? `<button class="jt-btn" data-jt-accion="dia" data-dia="" style="width:100%;">Ver todos los próximos días</button>` : ''}
  </div>`;
};

const agendaHtml = (agenda, diaSel) => {
  const ahora = Date.now();
  const items = agenda
    .filter((it) => {
      const t = it.cuando ? Date.parse(it.cuando) : NaN;
      if (!Number.isFinite(t)) return false;
      if (diaSel) return claveDia(t) === diaSel;
      return t >= ahora - 86_400_000 && t <= ahora + 14 * 86_400_000;
    })
    .sort((a, b) => Date.parse(a.cuando) - Date.parse(b.cuando));
  if (items.length === 0) {
    return `<div class="jt-vacio">${diaSel ? 'Nada programado para este día.' : 'No hay publicaciones en los próximos 14 días. Programá desde el calendario para llenar la agenda.'}</div>`;
  }
  const grupos = new Map();
  for (const it of items) {
    const k = claveDia(Date.parse(it.cuando));
    grupos.set(k, [...(grupos.get(k) ?? []), it]);
  }
  return [...grupos.entries()]
    .map(
      ([dia, lista]) => `<div class="jt-agenda-dia">${escape(fecha(dia))}</div>
        ${lista
          .map((it) => {
            const est = ESTADO_CAL[it.estado] ?? { label: it.estado, color: '#a1a1aa' };
            return `<div class="jt-agenda-item">
              <span class="jt-agenda-hora">${escape(hora(it.cuando))}</span>
              <span><i class="jt-punto" style="background:${COLOR_PLATAFORMA[it.plataforma]};"></i>${escape(it.formato)} · ${escape(it.texto || 'Sin texto')}</span>
              <span class="jt-tag" style="color:${est.color};">${escape(est.label)}</span>
            </div>`;
          })
          .join('')}`,
    )
    .join('');
};

const programacionHtml = (p) => {
  if (!p)
    return '<section class="jt-bloque" id="jt-programacion"><h3>🗓️ Programación</h3><div class="jt-vacio">No hay calendario disponible.</div></section>';
  const g = p.diagnostico;
  const agenda = p.agenda ?? [];
  const avisoDisp = p.disponible
    ? ''
    : `<div class="jt-error">${escape(p.motivoNoDisponible ?? 'El calendario no está disponible en este servidor.')} Mientras tanto no hay agenda ni control de desvíos.</div>`;
  const mes = state.mes ?? { y: new Date().getFullYear(), m: new Date().getMonth() };
  const porDia = g?.porDia ?? [];
  const maxDia = Math.max(1, ...porDia.map((x) => x.posts));
  const formatos = g?.porFormato ?? [];
  const maxShare = Math.max(1, ...formatos.map((f) => f.sharePlanPct));
  const balance = formatos.length
    ? formatos
        .map(
          (f) => `<div class="jt-fila">
            <div class="jt-fila-nombre">${escape(f.formato)}<small>${f.tasaHistorica === null ? 'sin tasa histórica' : `rinde ${pct(f.tasaHistorica)}`}</small></div>
            ${barra(f.sharePlanPct, maxShare, '#fdba74')}
            <span class="jt-val">${f.planificados} · ${f.sharePlanPct} %</span>
          </div>${f.recomendacion ? `<div class="jt-ayuda" style="color:#fcd34d;">${escape(f.recomendacion)}</div>` : ''}`,
        )
        .join('')
    : '';
  const arr = p.arrastre;
  const max = Math.max(arr.conArrastre.medianaTasa ?? 0, arr.sinArrastre.medianaTasa ?? 0, 0.0001);
  const arrastre = `
    <div style="display:flex;flex-direction:column;gap:8px;">
      <div class="jt-fila"><div class="jt-fila-nombre">Después de un post fuerte<small>n=${num(arr.conArrastre.n)}</small></div>${barra(arr.conArrastre.medianaTasa ?? 0, max, '#34d399')}<span class="jt-val">${pct(arr.conArrastre.medianaTasa)}</span></div>
      <div class="jt-fila"><div class="jt-fila-nombre">Resto de publicaciones<small>n=${num(arr.sinArrastre.n)}</small></div>${barra(arr.sinArrastre.medianaTasa ?? 0, max, '#a1a1aa')}<span class="jt-val">${pct(arr.sinArrastre.medianaTasa)}</span></div>
    </div>
    <p class="jt-ayuda">${escape(arr.lectura)}</p>`;
  const franjas = p.mejoresFranjas ?? [];
  const maxF = Math.max(0.0001, ...franjas.map((f) => f.medianaTasa));
  const franjasHtml = franjas.length
    ? franjas
        .map(
          (f) =>
            `<div class="jt-fila"><div class="jt-fila-nombre">${escape(f.franja)}<small>n=${num(f.posts)}</small></div>${barra(f.medianaTasa, maxF, '#c4b5fd')}<span class="jt-val">${pct(f.medianaTasa)}</span></div>`,
        )
        .join('')
    : '<div class="jt-vacio">Hacen falta al menos 2 posts por franja para comparar.</div>';
  return `
    <section class="jt-bloque" id="jt-programacion">
      <h3>🗓️ Programación</h3>
      <p class="jt-ayuda">Calendario, agenda y control de desvíos de tus publicaciones.</p>
      ${avisoDisp}
      <div class="jt-cifras">
        ${cifra('Próximos 14 días', num(g?.proximos14Dias ?? 0), 'programadas', '#60a5fa')}
        ${cifra('Vencidas sin publicar', num(g?.vencidos ?? 0), 'desvíos a corregir', g?.vencidos ? '#f87171' : '#34d399')}
        ${cifra('Fallidas (14 d)', num(g?.fallidosUltimos14Dias ?? 0), '', g?.fallidosUltimos14Dias ? '#f87171' : '#34d399')}
        ${cifra('Disciplina (30 d)', g?.disciplinaPct === null || g?.disciplinaPct === undefined ? 'sin dato' : `${g.disciplinaPct} %`, 'publicado vs. cerrado', '#fdba74')}
      </div>
      <div class="jt-grid2">
        <div class="jt-bloque" style="border:none;padding:0;">
          <h3 style="font-size:13px;">Calendario</h3>
          ${widgetCalendarioHtml(agenda, mes, state.diaSel)}
        </div>
        <div class="jt-bloque" style="border:none;padding:0;">
          <h3 style="font-size:13px;">Agenda ${state.diaSel ? `· ${escape(fecha(state.diaSel))}` : '· próximos 14 días'}</h3>
          ${agendaHtml(agenda, state.diaSel)}
        </div>
        <div class="jt-bloque" style="border:none;padding:0;"><h3 style="font-size:13px;">Agenda por día</h3>${porDia.length ? `<div style="display:flex;flex-direction:column;gap:6px;">${porDia.map((x) => `<div class="jt-fila"><div class="jt-fila-nombre">${escape(fecha(x.dia))}</div>${barra(x.posts, maxDia, '#60a5fa')}<span class="jt-val">${num(x.posts)}</span></div>`).join('')}</div>` : '<div class="jt-vacio">No hay publicaciones programadas en los próximos 14 días.</div>'}</div>
        <div class="jt-bloque" style="border:none;padding:0;"><h3 style="font-size:13px;">Asignación de recursos por formato</h3>${balance || '<div class="jt-vacio">Sin agenda para repartir.</div>'}</div>
        <div class="jt-bloque" style="border:none;padding:0;"><h3 style="font-size:13px;">Efecto de arrastre (lead-in)</h3>${arrastre}</div>
        <div class="jt-bloque" style="border:none;padding:0;"><h3 style="font-size:13px;">Optimización de tiempos: mejores franjas</h3>${franjasHtml}</div>
      </div>
    </section>`;
};

const proyectoHtml = (p) => {
  const pr = p.progreso;
  const ocupado = state.ocupado === p.id;
  const tareas = p.tareas.length
    ? p.tareas
        .map(
          (t) => `<label class="jt-tarea ${t.hecha ? 'hecha' : ''}">
            <input type="checkbox" data-jt-accion="tarea" data-id="${escape(p.id)}" data-tarea="${escape(t.id)}" ${t.hecha ? 'checked' : ''} ${ocupado ? 'disabled' : ''} />
            <span>${escape(t.texto)}</span></label>`,
        )
        .join('')
    : '<div class="jt-ayuda">Sin tareas todavía.</div>';
  return `
    <article class="jt-item">
      <div class="jt-item-cab">
        <strong>${escape(p.nombre)}</strong>
        <div class="jt-tags"><span class="jt-tag">${escape(p.plataforma)}</span><span class="jt-tag">${pr.hechas}/${pr.total} · ${pr.pct} %</span></div>
      </div>
      ${p.objetivo ? `<div class="jt-ayuda">Objetivo: ${escape(p.objetivo)}</div>` : ''}
      ${p.inicio || p.fin ? `<div class="jt-ayuda">${p.inicio ? `Desde ${escape(fecha(p.inicio))}` : ''}${p.fin ? ` hasta ${escape(fecha(p.fin))}` : ''}</div>` : ''}
      ${barra(pr.pct, 100, '#34d399')}
      <div class="jt-tareas">${tareas}</div>
      <div class="jt-acciones">
        <select class="jt-btn" data-jt-accion="estado" data-id="${escape(p.id)}" aria-label="Estado del proyecto" ${ocupado ? 'disabled' : ''}>
          ${ESTADOS_PROYECTO.map((e) => `<option value="${e.id}" ${e.id === p.estado ? 'selected' : ''}>${escape(e.label)}</option>`).join('')}
        </select>
      </div>
    </article>`;
};

const proyectosHtml = (proyectos) => `
  <section class="jt-bloque" id="jt-proyectos">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
      <h3>🎬 Proyectos de contenido</h3>
      <button class="jt-btn primario" data-jt-accion="nuevo-proyecto">${state.mostrarFormProyecto ? 'Cerrar' : '+ Nuevo proyecto'}</button>
    </div>
    <p class="jt-ayuda">Campañas y series para TikTok e Instagram: tareas, fechas y avance.</p>
    <form id="jt-form-proyecto" class="jt-bloque" style="${state.mostrarFormProyecto ? '' : 'display:none;'}">
      <div class="jt-form">
        <label class="jt-campo">Nombre <input name="nombre" maxlength="80" required /></label>
        <label class="jt-campo">Plataforma
          <select name="plataforma"><option value="ambas">Ambas</option><option value="instagram">Instagram</option><option value="tiktok">TikTok</option></select>
        </label>
        <label class="jt-campo">Inicio <input name="inicio" type="date" /></label>
        <label class="jt-campo">Fin <input name="fin" type="date" /></label>
        <label class="jt-campo ancho">Objetivo <input name="objetivo" maxlength="200" /></label>
        <label class="jt-campo ancho">Tareas (una por línea)<textarea name="tareas" rows="4" placeholder="Guion de la serie&#10;Grabar episodio 1&#10;Publicar y medir"></textarea></label>
      </div>
      <div class="jt-acciones"><button type="submit" class="jt-btn primario">Crear proyecto</button></div>
    </form>
    ${proyectos.length ? `<div class="jt-grid2">${proyectos.map(proyectoHtml).join('')}</div>` : '<div class="jt-vacio">Todavía no hay proyectos. Creá una serie o una campaña para organizar tareas y medir avance.</div>'}
  </section>`;

const estrategiasHtml = (e) => {
  const r = e?.resumen;
  const cifras = r
    ? [
        cifra('Objetivos activos', r.totalActive, '', '#60a5fa'),
        cifra('En camino', r.onTrack, `${r.ahead} adelantados`, '#34d399'),
        cifra('En riesgo', r.atRisk, '', '#fcd34d'),
        cifra('Atrasados', r.behind, '', r.behind ? '#f87171' : '#34d399'),
        cifra('Puntaje general', `${Math.round(r.overallScore ?? 0)} %`, '', '#fdba74'),
      ].join('')
    : '';
  const objetivos = (e?.objetivos ?? []).length
    ? e.objetivos
        .map(
          (o) => `<article class="jt-item">
            <div class="jt-item-cab"><strong>${escape(o.titulo)}</strong><span class="jt-tag">${escape(o.categoria ?? '')}</span></div>
            <div class="jt-ayuda">Cierra ${escape(fecha(o.fin))} · ${escape(o.estado)}</div>
            ${barra(o.progresoPct, 100, '#fdba74')}
            <div class="jt-ayuda">${o.progresoPct} % del objetivo</div>
            ${o.resultados
              .map(
                (k) => `<div class="jt-fila" style="grid-template-columns:minmax(120px,1.4fr) 2fr auto;">
                  <div class="jt-fila-nombre">${escape(k.descripcion)}<small>${num(k.actual)} de ${num(k.meta)} ${escape(k.unidad ?? '')}</small></div>
                  ${barra(k.progresoPct, 100, k.progresoPct >= 70 ? '#34d399' : k.progresoPct >= 40 ? '#fbbf24' : '#f87171')}
                  <span class="jt-val">${k.progresoPct} %</span></div>`,
              )
              .join('')}
          </article>`,
        )
        .join('')
    : '<div class="jt-vacio">No hay objetivos activos. Definí OKR en la sección OKRs para medir la estrategia.</div>';
  return `
    <section class="jt-bloque" id="jt-estrategias">
      <h3>🏁 Estrategias y objetivos</h3>
      <p class="jt-ayuda">Los OKR que sostienen la estrategia, con su avance real.</p>
      ${cifras ? `<div class="jt-cifras">${cifras}</div>` : ''}
      <div class="jt-grid2">${objetivos}</div>
    </section>`;
};

const seriesSvg = (semanas) => {
  if (!semanas?.length) return '<div class="jt-vacio">Sin posts en las últimas semanas.</div>';
  const valores = semanas
    .flatMap((s) => [s.instagram.medianaTasa, s.tiktok.medianaTasa])
    .filter((v) => typeof v === 'number');
  if (valores.length === 0) return '<div class="jt-vacio">Sin tasa medida en las últimas semanas.</div>';
  const tope = Math.max(...valores) * 1.15 || 1;
  const W = 520;
  const H = 180;
  const paso = W / Math.max(1, semanas.length - 1);
  const y = (v) => H - 24 - (v / tope) * (H - 40);
  const linea = (clave, color) => {
    const pts = semanas
      .map((s, i) => (typeof s[clave].medianaTasa === 'number' ? `${i * paso},${y(s[clave].medianaTasa)}` : null))
      .filter(Boolean);
    const puntos = semanas
      .map((s, i) =>
        typeof s[clave].medianaTasa === 'number'
          ? `<circle cx="${i * paso}" cy="${y(s[clave].medianaTasa)}" r="3.5" fill="${color}"/>`
          : '',
      )
      .join('');
    return `${pts.length > 1 ? `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>` : ''}${puntos}`;
  };
  const etiquetas = semanas
    .map(
      (s, i) =>
        `<text x="${i * paso}" y="${H - 6}" text-anchor="middle" font-size="10" fill="#a1a1aa">${escape(fecha(s.semana))}</text>`,
    )
    .join('');
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;" role="img" aria-label="Tasa mediana semanal, Instagram frente a TikTok">
    <line x1="0" x2="${W}" y1="${H - 24}" y2="${H - 24}" stroke="rgba(255,255,255,.12)"/>
    ${linea('instagram', '#fdba74')}
    ${linea('tiktok', '#93c5fd')}
    ${etiquetas}
  </svg>
  <div class="jt-tags"><span class="jt-tag" style="color:#fdba74;">● Instagram</span><span class="jt-tag" style="color:#93c5fd;">● TikTok</span></div>`;
};

const numerosHtml = (n) => {
  if (!n)
    return '<section class="jt-bloque" id="jt-numeros"><h3>📊 Números</h3><div class="jt-vacio">Sin números disponibles.</div></section>';
  const max = Math.max(n.tasaMediana.instagram ?? 0, n.tasaMediana.tiktok ?? 0, 0.0001);
  const maxPub = Math.max(n.publicaciones30d.instagram, n.publicaciones30d.tiktok, 1);
  return `
    <section class="jt-bloque" id="jt-numeros">
      <h3>📊 Números comparativos</h3>
      <div class="jt-cifras">
        ${cifra('Seguidores Instagram', num(n.seguidores.instagram), '', '#fdba74')}
        ${cifra('Seguidores TikTok', num(n.seguidores.tiktok), '', '#93c5fd')}
        ${cifra('Crecimiento', porcentaje(n.crecimientoPct), 'en el período', n.crecimientoPct !== null && n.crecimientoPct < 0 ? '#f87171' : '#34d399')}
      </div>
      <div class="jt-grid2">
        <div class="jt-bloque" style="border:none;padding:0;">
          <h3 style="font-size:13px;">Tasa mediana por plataforma</h3>
          <div class="jt-fila"><div class="jt-fila-nombre">Instagram</div>${barra(n.tasaMediana.instagram ?? 0, max, '#fdba74')}<span class="jt-val">${pct(n.tasaMediana.instagram)}</span></div>
          <div class="jt-fila"><div class="jt-fila-nombre">TikTok</div>${barra(n.tasaMediana.tiktok ?? 0, max, '#93c5fd')}<span class="jt-val">${pct(n.tasaMediana.tiktok)}</span></div>
        </div>
        <div class="jt-bloque" style="border:none;padding:0;">
          <h3 style="font-size:13px;">Publicaciones últimos 30 días</h3>
          <div class="jt-fila"><div class="jt-fila-nombre">Instagram</div>${barra(n.publicaciones30d.instagram, maxPub, '#fdba74')}<span class="jt-val">${num(n.publicaciones30d.instagram)}</span></div>
          <div class="jt-fila"><div class="jt-fila-nombre">TikTok</div>${barra(n.publicaciones30d.tiktok, maxPub, '#93c5fd')}<span class="jt-val">${num(n.publicaciones30d.tiktok)}</span></div>
        </div>
      </div>
      <div class="jt-bloque" style="border:none;padding:0;">
        <h3 style="font-size:13px;">Tendencia semanal de la tasa, Instagram frente a TikTok</h3>
        ${seriesSvg(state.datos?.programacion?.semanas)}
      </div>
    </section>`;
};

const navHtml = () =>
  `<nav class="jt-nav" aria-label="Secciones de la junta">${SECCIONES.map((s) => `<a href="#jt-${s.id}" data-jt-ancla="${s.id}">${escape(s.label)}</a>`).join('')}</nav>`;

const pintar = (root) => {
  const d = state.datos;
  const cab = root.querySelector('#jt-cabecera');
  if (cab) {
    cab.innerHTML = `<div class="jt-bloque" style="border-left:3px solid #fdba74;">
      <h3>Mensajes de la junta</h3>
      ${mensajesHtml(d?.mensajes)}
      ${d?.errores?.length ? `<div class="jt-error">Algunas secciones no cargaron: ${escape(d.errores.join(', '))}. El resto sale igual.</div>` : ''}
    </div>`;
  }
  const cont = root.querySelector('#jt-contenido');
  if (!cont) return;
  if (state.error && !d) {
    cont.innerHTML = '<div class="jt-error">No se pudo cargar la junta. Revisá la conexión con el backend.</div>';
    return;
  }
  if (!d) {
    cont.innerHTML = loadingScreen();
    return;
  }
  cont.innerHTML = [
    decisionesHtml(d.decisiones),
    programacionHtml(d.programacion),
    proyectosHtml(d.proyectos ?? []),
    estrategiasHtml(d.estrategias),
    numerosHtml(d.numeros),
  ].join('');
};

const cargar = async (root, refrescar = false) => {
  state.cargando = true;
  if (refrescar) apiBust(RUTA);
  const { data, error } = await apiSafe(`${RUTA}${refrescar ? '?refrescar=1' : ''}`, null, { noCache: true });
  state.cargando = false;
  state.error = Boolean(error);
  if (data) state.datos = data;
  pintar(root);
};

const mutar = async (root, path, body, okMsg, metodo = 'POST') => {
  state.ocupado = body?.id ?? body?.decisionId ?? null;
  pintar(root);
  try {
    await api(path, { method: metodo, body });
    apiBust(RUTA);
    if (okMsg) toast(okMsg, 'ok');
    return true;
  } catch (err) {
    toast(razonDe(err, 'No se pudo completar la acción'), 'crit');
    return false;
  } finally {
    state.ocupado = null;
    await cargar(root, true);
  }
};

const montarEstructura = (root) => {
  root.innerHTML = `${ESTILOS}
    <section class="jt-wrap" id="jt-raiz">
      <div class="jt-cab">
        <div>
          <h2>🧭 Junta ejecutiva</h2>
          <p>Lo que la junta de tu marca necesita ver: decisiones pendientes, cómo está la programación, proyectos, estrategia y números.</p>
        </div>
        <button class="jt-btn" data-jt-accion="refrescar">↻ Actualizar</button>
      </div>
      ${navHtml()}
      <div id="jt-cabecera"></div>
      <div id="jt-contenido"></div>
    </section>`;
};

const refrescarProgramacion = (root) => {
  const sec = root.querySelector('#jt-programacion');
  if (sec && state.datos) sec.outerHTML = programacionHtml(state.datos.programacion);
};

const enlazar = (root) => {
  if (enlazados.has(root)) return;
  enlazados.add(root);
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-jt-accion]');
    if (!el || !root.contains(el)) return;
    const accion = el.dataset.jtAccion;
    if (accion === 'mes') {
      const base = state.mes ?? { y: new Date().getFullYear(), m: new Date().getMonth() };
      const total = base.y * 12 + base.m + Number(el.dataset.paso);
      state.mes = { y: Math.floor(total / 12), m: total % 12 };
      refrescarProgramacion(root);
      return;
    }
    if (accion === 'dia') {
      state.diaSel = el.dataset.dia || null;
      refrescarProgramacion(root);
      return;
    }
    if (accion === 'refrescar') {
      await cargar(root, true);
      return;
    }
    if (accion === 'nuevo-proyecto') {
      state.mostrarFormProyecto = !state.mostrarFormProyecto;
      pintar(root);
      return;
    }
    if (accion === 'decidir') {
      const ok = await mutar(
        root,
        '/api/executive/decisions/resolve',
        { decisionId: el.dataset.id, status: el.dataset.estado },
        el.dataset.estado === 'approved' ? 'Decisión aprobada' : 'Decisión rechazada',
      );
      if (!ok) return;
    }
  });
  root.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.dataset?.jtAccion === 'tarea') {
      await mutar(
        root,
        `/api/executive/proyectos/${encodeURIComponent(el.dataset.id)}/tareas/${encodeURIComponent(el.dataset.tarea)}`,
        { id: el.dataset.id },
        null,
      );
      return;
    }
    if (el.dataset?.jtAccion === 'estado') {
      await mutar(
        root,
        `/api/executive/proyectos/${encodeURIComponent(el.dataset.id)}/estado`,
        { id: el.dataset.id, estado: el.value },
        'Estado actualizado',
      );
    }
  });
  root.addEventListener('submit', async (e) => {
    if (e.target.id !== 'jt-form-proyecto') return;
    e.preventDefault();
    const form = e.target;
    const datos = Object.fromEntries(new FormData(form).entries());
    const tareas = String(datos.tareas ?? '')
      .split(/\n/)
      .map((t) => t.trim())
      .filter(Boolean);
    const boton = form.querySelector('button[type="submit"]');
    boton.disabled = true;
    try {
      await api(`${RUTA.replace('/junta', '')}/proyectos`, { body: { ...datos, tareas } });
      apiBust(RUTA);
      toast('Proyecto creado', 'ok');
      state.mostrarFormProyecto = false;
      form.reset();
      await cargar(root, true);
    } catch (err) {
      toast(razonDe(err, 'No se pudo crear el proyecto'), 'crit');
    } finally {
      boton.disabled = false;
    }
  });
  root.addEventListener('click', (e) => {
    const ancla = e.target.closest('[data-jt-ancla]');
    if (!ancla) return;
    e.preventDefault();
    root.querySelector(`#jt-${ancla.dataset.jtAncla}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
};

export const renderJunta = async (root) => {
  state.datos = null;
  state.error = false;
  state.ocupado = null;
  state.mostrarFormProyecto = false;
  state.mes = null;
  state.diaSel = null;
  montarEstructura(root);
  enlazar(root);
  await cargar(root);
};
