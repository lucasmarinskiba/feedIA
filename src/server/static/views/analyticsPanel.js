import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const PLATAFORMAS = { instagram: 'Instagram', tiktok: 'TikTok' };
const PERIODOS = [
  { id: 'week', label: 'Semana' },
  { id: 'month', label: 'Mes' },
  { id: 'quarter', label: 'Trimestre' },
  { id: 'halfYear', label: '6 meses' },
  { id: 'year', label: 'Año' },
];
const FORMATO = { reel: 'Reel', carrusel: 'Carrusel', imagen: 'Imagen', video: 'Video' };
const VEREDICTO = {
  destacado: { label: 'Destacado', color: '#6ee7b7', fondo: 'rgba(16,185,129,.12)' },
  escondido: { label: 'Escondido', color: '#d8b4fe', fondo: 'rgba(168,85,247,.14)' },
  normal: { label: 'Normal', color: '#e4e4e7', fondo: 'rgba(255,255,255,.07)' },
  bajo: { label: 'Bajo', color: '#fca5a5', fondo: 'rgba(248,113,113,.12)' },
  'sin-base': { label: 'Sin base', color: '#a1a1aa', fondo: 'rgba(161,161,170,.12)' },
  'sin-datos': { label: 'Sin datos', color: '#a1a1aa', fondo: 'rgba(161,161,170,.12)' },
};

const ESTILOS = `<style>
  .an-wrap{display:flex;flex-direction:column;gap:18px;--v2-line:var(--border,rgba(255,255,255,.08));--v2-fg:var(--text-primary,#fafafa);--v2-fg-2:var(--text-secondary,#d4d4d8);--v2-fg-3:var(--text-tertiary,#a1a1aa);--v2-hover:var(--bg-hover,rgba(255,255,255,.04));--v2-surface-2:var(--bg-card,#0f0f0f);color:var(--v2-fg);}
  .an-eyebrow{font-size:11px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;color:var(--v2-fg-3);}
  .an-h2{margin:0;font-size:22px;font-weight:700;letter-spacing:-0.02em;color:var(--v2-fg);}
  .an-desc{margin:0;font-size:13px;line-height:1.55;color:var(--v2-fg-3);max-width:760px;}
  .an-hint{font-size:13px;color:var(--v2-fg-3);line-height:1.5;}
  .an-card{background:var(--v2-surface-2);border:1px solid var(--v2-line);border-radius:14px;}
  .an-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 14px;border-radius:9px;border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;}
  .an-btn:hover{background:var(--v2-hover);color:var(--v2-fg);}
  .an-wrap .an-btn.an-btn-primary{background:#fdba74;color:#111;border-color:#fdba74;text-decoration:none;}
  .an-wrap .an-btn.an-btn-primary:hover{background:#fb923c;color:#111;}
  .an-cabecera{display:flex;flex-direction:column;gap:6px;}
  .an-aviso{color:#fbbf24;}
  .an-plataformas{display:flex;gap:8px;flex-wrap:wrap;}
  .an-plat{border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;display:inline-flex;gap:8px;align-items:center;}
  .an-plat em{font-style:normal;font-size:11px;font-weight:500;color:var(--v2-fg-3);}
  .an-plat.is-on{background:var(--v2-hover);color:var(--v2-fg);border-color:var(--v2-fg-3);}
  .an-cuerpo{display:flex;flex-direction:column;gap:18px;}
  .an-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
  .an-kpi{background:var(--v2-hover);border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:4px;}
  .an-kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
  .an-kpi-valor{font-size:20px;font-weight:700;color:var(--v2-fg);letter-spacing:-0.02em;}
  .an-kpi-nota{font-size:11.5px;color:var(--v2-fg-3);}
  .an-bloque{display:flex;flex-direction:column;gap:12px;}
  .an-bloque h3{margin:0;font-size:14px;font-weight:600;color:var(--v2-fg);}
  .an-cabecera-bloque{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;}
  .an-periodos{display:flex;gap:6px;flex-wrap:wrap;}
  .an-chip{border:1px solid var(--v2-line);background:transparent;color:var(--v2-fg-2);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .an-chip.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .an-delta{display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;}
  .an-delta-valor{font-size:28px;font-weight:700;letter-spacing:-0.02em;color:var(--v2-fg);}
  .an-delta.up .an-delta-valor{color:#6ee7b7;}
  .an-delta.down .an-delta-valor{color:#fca5a5;}
  .an-delta-pct{font-size:13px;color:var(--v2-fg-3);}
  .an-grafico{width:100%;height:auto;max-height:220px;overflow:visible;}
  .an-nota{margin:0;font-size:13px;color:var(--v2-fg-3);line-height:1.5;}
  .an-totales{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px;}
  .an-total{background:var(--v2-hover);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:2px;font-size:11px;color:var(--v2-fg-3);}
  .an-total strong{font-size:16px;color:var(--v2-fg);}
  .an-barra-fila{display:grid;grid-template-columns:110px 1fr 64px;gap:10px;align-items:center;font-size:13px;color:var(--v2-fg-2);margin-bottom:6px;}
  .an-barra-track{height:8px;border-radius:999px;background:var(--v2-hover);overflow:hidden;}
  .an-barra-fill{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#fdba74,#fb923c);}
  .an-barra-valor{text-align:right;font-weight:600;color:var(--v2-fg);}
  .an-top{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
  .an-post{padding:16px;display:flex;flex-direction:column;gap:8px;}
  .an-post-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:11px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--v2-fg-3);}
  .an-post-head span:last-child{margin-left:auto;}
  .an-post-titulo{margin:0;font-size:14px;font-weight:600;line-height:1.35;color:var(--v2-fg);}
  .an-post-stats{font-size:12px;color:var(--v2-fg-3);}
  .an-veredicto{font-size:10px;padding:3px 9px;border-radius:999px;font-weight:700;}
  .an-wrap a.an-enlace{font-size:12px;color:#fdba74;text-decoration:none;}
  .an-audiencia{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px;}
  .an-dist h4{margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--v2-fg-3);}
  .an-vacio{text-align:center;padding:32px 24px;display:flex;flex-direction:column;align-items:center;gap:8px;}
  @media (max-width:720px){.an-barra-fila{grid-template-columns:90px 1fr 52px;}.an-top{grid-template-columns:1fr;}}
</style>`;

const num = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : '—');
const pct = (n) => (typeof n === 'number' ? `${n.toFixed(1)}%` : '—');
const conSigno = (n) => `${n > 0 ? '+' : ''}${num(n)}`;
const fechaCorta = (iso) => {
  const [, mes = '', dia = ''] = iso.split('-');
  return `${dia}/${mes}`;
};
const loginUrl = (plataforma) =>
  `/api/auth/${plataforma}/login?redirectAfter=${encodeURIComponent(window.location.origin + '/')}`;

const kpi = (etiqueta, valor, nota = '') => `
  <div class="an-kpi">
    <span class="an-kpi-label">${escape(etiqueta)}</span>
    <span class="an-kpi-valor">${escape(valor)}</span>
    ${nota ? `<span class="an-kpi-nota">${escape(nota)}</span>` : ''}
  </div>`;

const graficoHtml = (historial) => {
  if (historial.length < 2) {
    return '<p class="an-nota">El gráfico de seguidores aparece cuando hay al menos dos días de registro.</p>';
  }
  const W = 600;
  const H = 180;
  const PAD = 24;
  const valores = historial.map((p) => p.seguidores);
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const xs = historial.map((_, i) => PAD + (i / (historial.length - 1)) * (W - PAD * 2));
  const ys = valores.map((v) => PAD + (1 - (v - min) / rango) * (H - PAD * 2 - 16));
  const linea = xs.map((x, i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${ys[i].toFixed(1)}`).join(' ');
  const area = `${linea} L${xs[xs.length - 1].toFixed(1)},${H - 16} L${xs[0].toFixed(1)},${H - 16} Z`;
  const puntos = xs
    .map((x, i) => `<circle cx="${x.toFixed(1)}" cy="${ys[i].toFixed(1)}" r="3" fill="#fb923c"/>`)
    .join('');
  const primero = historial[0];
  const ultimo = historial[historial.length - 1];
  return `
    <svg viewBox="0 0 ${W} ${H}" class="an-grafico" role="img" aria-label="Seguidores en el tiempo">
      <defs>
        <linearGradient id="an-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#fdba74" stop-opacity=".35"/>
          <stop offset="100%" stop-color="#fdba74" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="${area}" fill="url(#an-area)"/>
      <path d="${linea}" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${puntos}
      <text x="${PAD}" y="${H - 2}" font-size="11" fill="#a1a1aa">${escape(fechaCorta(primero.fecha))}</text>
      <text x="${W - PAD}" y="${H - 2}" font-size="11" fill="#a1a1aa" text-anchor="end">${escape(fechaCorta(ultimo.fecha))}</text>
      <text x="${W - PAD}" y="14" font-size="12" fill="#fdba74" text-anchor="end">${escape(num(ultimo.seguidores))}</text>
    </svg>`;
};

const distribucionHtml = (titulo, items) => {
  if (items.length === 0) return '';
  return `<div class="an-dist"><h4>${escape(titulo)}</h4>${items
    .map(
      (i) => `<div class="an-barra-fila">
        <span>${escape(i.etiqueta)}</span>
        <span class="an-barra-track"><span class="an-barra-fill" style="width:${Number(i.pct) || 0}%"></span></span>
        <span class="an-barra-valor">${escape(pct(i.pct))}</span>
      </div>`,
    )
    .join('')}</div>`;
};

export const crearPanelAnalytics = () => {
  let datos = null;
  let huboError = false;
  let plataforma = 'instagram';
  let periodo = 'month';

  const elegirPlataforma = () => {
    if (!datos || datos[plataforma]?.conectado) return;
    const otra = Object.keys(PLATAFORMAS).find((p) => datos[p]?.conectado);
    if (otra) plataforma = otra;
  };

  const cabecera = () => `
    <div class="an-cabecera">
      <div class="an-eyebrow">Analytics</div>
      <h2 class="an-h2">Métricas de tu cuenta</h2>
      <p class="an-desc">Seguidores, crecimiento, posts, audiencia y evolución histórica. Todo sale de tus cuentas conectadas; lo que una red no entrega aparece marcado, sin estimar.${huboError ? ' <span class="an-aviso">No se pudo cargar el análisis: revisá la conexión con el backend.</span>' : ''}</p>
      <div><button class="an-btn" data-an-refrescar>Actualizar datos</button></div>
    </div>`;

  const pestanas = () =>
    `<div class="an-plataformas">${Object.entries(PLATAFORMAS)
      .map(([id, nombre]) => {
        const b = datos?.[id];
        const estado = !b ? 'sin datos' : b.conectado ? `${b.posts.analizados} posts` : 'sin conectar';
        return `<button class="an-plat${plataforma === id ? ' is-on' : ''}" data-an-plat="${id}">${escape(nombre)} <em>${escape(estado)}</em></button>`;
      })
      .join('')}</div>`;

  const crecimientoHtml = (b) => {
    const delta = b.cuenta.crecimiento?.[periodo];
    const etiqueta = (PERIODOS.find((p) => p.id === periodo)?.label ?? '').toLowerCase();
    const selector = `<div class="an-periodos">${PERIODOS.map(
      (p) =>
        `<button class="an-chip${p.id === periodo ? ' is-on' : ''}" data-an-periodo="${p.id}">${escape(p.label)}</button>`,
    ).join('')}</div>`;
    const resumen =
      delta?.available && typeof delta.value === 'number'
        ? `<div class="an-delta ${delta.value >= 0 ? 'up' : 'down'}">
            <span class="an-delta-valor">${delta.value >= 0 ? '▲' : '▼'} ${escape(conSigno(delta.value))}</span>
            <span class="an-delta-pct">${escape(pct(delta.pct))} en ${escape(etiqueta)}</span>
          </div>`
        : `<p class="an-nota">Todavía no hay historial de ${escape(etiqueta)}. Se mide con una foto diaria de tus seguidores y se completa con el tiempo.</p>`;
    return `<section class="an-bloque">
      <div class="an-cabecera-bloque"><h3>Crecimiento de seguidores</h3>${selector}</div>
      ${resumen}
      ${graficoHtml(b.historial)}
    </section>`;
  };

  const postsHtml = (b) => {
    const p = b.posts;
    const v = p.ventana30d;
    const alcance = b.plataforma === 'tiktok' ? 'Vistas' : 'Alcance';
    const totales = [
      ['Publicaciones', num(v.publicaciones)],
      ['Interacciones', num(v.interacciones)],
      ['Likes', num(v.likes)],
      ['Comentarios', num(v.comentarios)],
      ['Compartidos', v.compartidos === null ? 'No disponible' : num(v.compartidos)],
      ['Guardados', v.guardados === null ? 'No disponible' : num(v.guardados)],
      [`${alcance} (30 días)`, v.alcance === null ? 'No disponible' : num(v.alcance)],
    ];
    if (p.analizados === 0) {
      return `<section class="an-bloque"><h3>Posts</h3><p class="an-nota">Todavía no hay posts publicados para analizar.</p></section>`;
    }
    const maxTasa = Math.max(0, ...p.porFormato.map((f) => f.tasaMediana ?? 0));
    const formatos = p.porFormato.length
      ? `<div class="an-bloque"><h3>Tasa de interacción por formato</h3>${p.porFormato
          .map((f) => {
            const ancho = maxTasa > 0 && typeof f.tasaMediana === 'number' ? (f.tasaMediana / maxTasa) * 100 : 0;
            return `<div class="an-barra-fila">
              <span>${escape(FORMATO[f.formato] ?? f.formato)} <em>(${f.posts})</em></span>
              <span class="an-barra-track"><span class="an-barra-fill" style="width:${ancho.toFixed(1)}%"></span></span>
              <span class="an-barra-valor">${escape(pct(f.tasaMediana))}</span>
            </div>`;
          })
          .join('')}</div>`
      : '';
    const top = p.top.length
      ? `<div class="an-bloque"><h3>Mejores posts por interacción</h3><div class="an-top">${p.top
          .map((t) => {
            const v2 = VEREDICTO[t.veredicto] ?? VEREDICTO.normal;
            return `<article class="an-card an-post">
              <div class="an-post-head"><span>${escape(FORMATO[t.formato] ?? t.formato)}</span><span class="an-veredicto" style="color:${v2.color};background:${v2.fondo};">${escape(v2.label)}</span></div>
              <p class="an-post-titulo">${escape(t.texto)}</p>
              <div class="an-post-stats">${escape(num(t.interacciones))} interacciones · tasa ${escape(pct(t.tasaInteraccion))} · ${escape(fechaCorta(t.publicadoEn.slice(0, 10)))}</div>
              ${t.url ? `<a class="an-enlace" href="${escape(t.url)}" target="_blank" rel="noopener noreferrer">Ver publicación →</a>` : ''}
            </article>`;
          })
          .join('')}</div></div>`
      : '';
    return `<section class="an-bloque">
      <h3>Posts de los últimos 30 días</h3>
      <div class="an-totales">${totales
        .map(
          ([etiqueta, valor]) =>
            `<div class="an-total"><span>${escape(etiqueta)}</span><strong>${escape(valor)}</strong></div>`,
        )
        .join('')}</div>
      ${formatos}
      ${top}
    </section>`;
  };

  const audienciaHtml = (b) => {
    const a = b.audiencia;
    if (!a.disponible) {
      return `<section class="an-bloque"><h3>Audiencia</h3><p class="an-nota">${escape(a.motivo ?? 'Sin datos de audiencia por ahora.')}</p></section>`;
    }
    return `<section class="an-bloque"><h3>Audiencia</h3><div class="an-audiencia">
      ${distribucionHtml('Edad', a.edad)}
      ${distribucionHtml('Género', a.genero)}
      ${distribucionHtml('Ciudades', a.ciudades)}
      ${distribucionHtml('Países', a.paises)}
    </div></section>`;
  };

  const kpisHtml = (b) => {
    const seguidoresDelta = b.cuenta.crecimiento?.week;
    const tiles = b.cuenta.metricas.map((m) =>
      kpi(m.label, m.format === 'percent' ? pct(m.value) : num(m.value), m.hint ?? ''),
    );
    return `<div class="an-kpis">
      ${kpi('Seguidores', num(b.cuenta.seguidores), seguidoresDelta?.available ? `${conSigno(seguidoresDelta.value)} en la última semana` : 'Sin historial semanal todavía')}
      ${tiles.join('')}
      ${kpi('Tasa mediana', pct(b.posts.tasaMediana), 'interacción sobre alcance')}
      ${kpi('Frecuencia', b.posts.frecuenciaSemanal === null ? '—' : `${b.posts.frecuenciaSemanal}/sem`, 'publicaciones por semana (30 días)')}
      ${typeof b.posts.mejorHora === 'number' ? kpi('Mejor hora', `${b.posts.mejorHora}h`, 'hora de Argentina') : ''}
      ${b.posts.mejorFormato ? kpi('Formato que más rinde', FORMATO[b.posts.mejorFormato] ?? b.posts.mejorFormato) : ''}
    </div>`;
  };

  const cuerpo = () => {
    const b = datos?.[plataforma];
    const nombre = PLATAFORMAS[plataforma];
    if (!b)
      return '<div class="an-card an-vacio"><div class="an-hint">No hay datos del análisis por ahora.</div></div>';
    if (!b.conectado) {
      const mensaje =
        b.error === 'token_expired'
          ? `La conexión de ${nombre} venció. Volvé a conectarla para seguir viendo tus métricas.`
          : `Conectá ${nombre} para ver tus métricas reales.`;
      return `<div class="an-card an-vacio">
        <div class="an-hint">${escape(mensaje)}</div>
        <button class="an-btn an-btn-primary" data-an-login="${escape(plataforma)}">Conectar ${escape(nombre)}</button>
      </div>`;
    }
    const aviso =
      b.error === 'metrics_unavailable' || b.error === 'lectura_fallida'
        ? `<div class="an-hint an-aviso">No pudimos leer las métricas de ${escape(nombre)} en este momento. Probá actualizar en un rato.</div>`
        : '';
    return `${aviso}${kpisHtml(b)}${crecimientoHtml(b)}${postsHtml(b)}${audienciaHtml(b)}`;
  };

  const pintar = (wrap) => {
    wrap.querySelector('.an-cabecera').outerHTML = cabecera();
    wrap.querySelector('.an-plataformas').outerHTML = pestanas();
    wrap.querySelector('.an-cuerpo').innerHTML = cuerpo();
  };

  const cargar = async () => {
    const { data, error } = await apiSafe('/api/executive/analytics', null);
    datos = data && typeof data === 'object' ? data : null;
    huboError = Boolean(error);
    elegirPlataforma();
    return !error;
  };

  return {
    cargar,
    html: () => `<div class="an-wrap">
      ${cabecera()}
      ${pestanas()}
      <div class="an-cuerpo">${cuerpo()}</div>
      ${ESTILOS}
    </div>`,
    wire: (contenedor) => {
      const wrap = contenedor.querySelector('.an-wrap');
      if (!wrap) return;
      wrap.addEventListener('click', async (e) => {
        const t = e.target.closest('[data-an-plat],[data-an-periodo],[data-an-refrescar],[data-an-login]');
        if (!t || !wrap.contains(t)) return;
        if (t.dataset.anLogin) {
          window.location.href = loginUrl(t.dataset.anLogin);
          return;
        }
        if (t.dataset.anPlat) {
          plataforma = t.dataset.anPlat;
          pintar(wrap);
          return;
        }
        if (t.dataset.anPeriodo) {
          periodo = t.dataset.anPeriodo;
          pintar(wrap);
          return;
        }
        t.disabled = true;
        const ok = await cargar();
        if (ok) pintar(wrap);
        else toast('No se pudieron actualizar los datos', 'err');
      });
    },
  };
};
