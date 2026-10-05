import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const PLATAFORMAS = { instagram: 'Instagram', tiktok: 'TikTok' };
const FORMATOS = { reel: 'Reel', carrusel: 'Carrusel', imagen: 'Imagen', video: 'Video' };
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const CONFIANZA = {
  alta: { label: 'Confianza alta', clase: 'ok' },
  media: { label: 'Confianza media', clase: 'info' },
  baja: { label: 'Confianza baja', clase: 'warn' },
  'sin-datos': { label: 'Sin historial', clase: 'info' },
};
const COLOR = { naranja: '#fdba74', verde: '#6ee7b7', rojo: '#fca5a5', gris: '#a1a1aa', azul: '#93c5fd' };
const VEREDICTO_COLOR = { fuerte: COLOR.verde, promedio: COLOR.naranja, debil: COLOR.rojo, 'sin-datos': COLOR.gris };
const HORA_DE_FRANJA = { madrugada: 3, mañana: 9, mediodía: 13, tarde: 17, noche: 21 };

const ESTILOS = `<style>
  .pr-cab{display:flex;flex-direction:column;gap:8px;margin-bottom:6px;}
  .pr-cab-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .pr-sub{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);margin:0;line-height:1.5;}
  .pr-bloque{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:14px;background:var(--bg-card,rgba(255,255,255,.02));display:flex;flex-direction:column;gap:10px;margin-top:12px;}
  .pr-bloque h4{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .pr-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;}
  .pr-stat{border-radius:10px;padding:10px;background:var(--bg-hover,rgba(255,255,255,.04));display:flex;flex-direction:column;gap:3px;}
  .pr-stat span{font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#a1a1aa);font-weight:600;}
  .pr-stat b{font-size:17px;font-variant-numeric:tabular-nums;}
  .pr-stat small{font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .pr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;}
  .pr-kpi{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px;}
  .pr-kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text-tertiary,#a1a1aa);}
  .pr-kpi-valor{font-size:22px;font-weight:700;letter-spacing:-0.02em;font-variant-numeric:tabular-nums;}
  .pr-kpi-nota{font-size:11.5px;color:var(--text-tertiary,#a1a1aa);}
  .pr-svg{width:100%;height:auto;display:block;}
  .pr-svg text{fill:var(--text-secondary,#d4d4d8);font-size:11px;font-family:inherit;}
  .pr-svg .pr-svg-nota{fill:var(--text-tertiary,#a1a1aa);font-size:10.5px;}
  .pr-svg .pr-svg-titulo{fill:var(--text-primary,#fafafa);font-size:12px;font-weight:600;}
  .pr-fila{display:grid;grid-template-columns:minmax(150px,1.2fr) 2fr;gap:10px;align-items:center;font-size:12.5px;}
  .pr-fila-nombre{line-height:1.35;}
  .pr-fila-ev{display:block;font-size:11px;color:var(--text-tertiary,#a1a1aa);}
  .pr-div{position:relative;height:14px;border-radius:999px;background:rgba(255,255,255,.05);}
  .pr-div::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:var(--border,rgba(255,255,255,.25));}
  .pr-div i{position:absolute;top:0;bottom:0;border-radius:999px;}
  .pr-div .pos{left:50%;background:${COLOR.verde};}
  .pr-div .neg{right:50%;background:${COLOR.rojo};}
  .pr-div b{position:absolute;top:-2px;font-size:11px;font-variant-numeric:tabular-nums;}
  .pr-barra-fila{display:grid;grid-template-columns:minmax(120px,1.1fr) 2fr auto;gap:10px;align-items:center;font-size:12.5px;}
  .pr-barra{height:12px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;}
  .pr-barra i{display:block;height:100%;border-radius:999px;}
  .pr-barra-val{font-variant-numeric:tabular-nums;font-weight:600;}
  .pr-lista{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;}
  .pr-lista li{font-size:13px;line-height:1.5;padding:8px 10px;border-radius:10px;background:var(--bg-hover,rgba(255,255,255,.04));}
  .pr-momentos{display:flex;gap:8px;flex-wrap:wrap;}
  .pr-veredicto{border-radius:14px;padding:16px 18px;background:var(--bg-card,rgba(255,255,255,.02));border:1px solid var(--border,rgba(255,255,255,.08));display:flex;flex-direction:column;gap:6px;margin-top:12px;}
  .pr-veredicto strong{font-size:17px;letter-spacing:-0.01em;}
  .pr-veredicto p{margin:0;font-size:14px;line-height:1.55;color:var(--text-secondary,#d4d4d8);}
  .pr-momento-sugerido{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;border-radius:12px;padding:12px 14px;background:rgba(253,186,116,.08);font-size:13px;margin-top:12px;}
  .pr-detalle{margin-top:12px;border:1px solid var(--border,rgba(255,255,255,.08));border-radius:14px;padding:12px 14px;}
  .pr-detalle summary{cursor:pointer;font-size:13px;font-weight:600;color:var(--text-secondary,#d4d4d8);}
  .pr-fuentes{font-size:12px;color:var(--text-tertiary,#a1a1aa);margin:6px 0 0;}
  .pr-momento{font-size:12px;padding:6px 10px;border-radius:999px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));}
  .pr-vacio{padding:28px 18px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .pr-variantes{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;}
  .pr-variante{border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:10px;display:flex;flex-direction:column;gap:8px;background:var(--bg-hover,rgba(255,255,255,.03));}
  .pr-variante select,.pr-variante input{width:100%;}
  .pr-tabla{width:100%;border-collapse:collapse;font-size:12px;}
  .pr-tabla th,.pr-tabla td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--border,rgba(255,255,255,.06));}
  .pr-tabla th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary,#a1a1aa);font-weight:600;}
  .pr-tabla td.n{text-align:right;font-variant-numeric:tabular-nums;}
  .pr-explica{font-size:12px;color:var(--text-tertiary,#a1a1aa);line-height:1.55;}
</style>`;

const num = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : 'sin dato');
const pct = (n, d = 2) => (typeof n === 'number' ? `${n.toFixed(d).replace('.', ',')} %` : 'sin dato');
const pctEntero = (n) => (typeof n === 'number' ? `${Math.round(n)} %` : 'sin dato');
const segundos = (n) => (typeof n === 'number' ? `${n.toFixed(1).replace('.', ',')} s` : 'sin dato');
const rango = (r, f) => (r ? `${f(r.p10)} a ${f(r.p90)}` : 'sin dato');
const decimal = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d).replace('.', ',') : 'sin dato');

const formularioHtml = () => `
  <div class="studio-form">
    <h3>Predictor de performance</h3>
    <p class="small muted" id="pr-nota-historial" style="margin-bottom:14px;">Predicciones calibradas con el historial de tu cuenta: cuanto más publicás, más precisas.</p>

    <div class="field">
      <label class="field-label">Plataforma</label>
      <select class="field-select" id="plataforma">
        ${Object.entries(PLATAFORMAS)
          .map(([v, l]) => `<option value="${v}">${l}</option>`)
          .join('')}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Tipo de contenido</label>
      <select class="field-select" id="formato">
        ${Object.entries(FORMATOS)
          .map(([v, l]) => `<option value="${v}">${l}</option>`)
          .join('')}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Caption completo</label>
      <textarea class="field-textarea" id="caption" rows="4" placeholder="Escribí el caption tal como lo vas a publicar"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hashtags (uno por línea o separados por espacio)</label>
      <textarea class="field-textarea" id="hashtags" rows="2" placeholder="#marketing #IA"></textarea>
    </div>

    <div class="field">
      <label class="field-label">Hora de publicación</label>
      <select class="field-select" id="hora">
        <option value="">Sin definir</option>
        ${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === 19 ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}
      </select>
    </div>

    <div class="field">
      <label class="field-label">Día</label>
      <select class="field-select" id="dia">
        <option value="">Sin definir</option>
        ${DIAS.map((d) => `<option value="${d}">${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}
      </select>
    </div>

    <div class="field" id="campo-duracion">
      <label class="field-label">Duración en segundos (reel o video)</label>
      <input class="field-select" id="duracion" type="number" min="1" max="600" placeholder="ej: 25" />
    </div>

    <button class="btn primary" id="predict-btn" style="width:100%;margin-top:6px;">🎯 Predecir</button>
  </div>`;

/* ── Gráficos (SVG y barras CSS, sin librerías) ───────────────────────── */

const rangoSvg = (titulo, r, referencia, f) => {
  if (!r) return '<p class="pr-explica">Sin rango: hacen falta más posts con este dato.</p>';
  const tope = Math.max(r.p90, referencia ?? 0) * 1.12 || 1;
  const x = (v) => 24 + (Math.max(0, v) / tope) * 372;
  const refLinea =
    referencia === null || referencia === undefined
      ? ''
      : `<line x1="${x(referencia)}" x2="${x(referencia)}" y1="34" y2="74" stroke="${COLOR.gris}" stroke-dasharray="4 3"/>
         <text x="${x(referencia)}" y="28" text-anchor="middle" class="pr-svg-nota">mediana ${escape(f(referencia))}</text>`;
  return `<svg viewBox="0 0 420 118" class="pr-svg" role="img" aria-label="${escape(titulo)}: ${escape(f(r.p50))}, rango ${escape(rango(r, f))}">
    <text x="0" y="12" class="pr-svg-titulo">${escape(titulo)}</text>
    ${refLinea}
    <line x1="${x(r.p10)}" x2="${x(r.p90)}" y1="54" y2="54" stroke="${COLOR.azul}" stroke-width="12" stroke-linecap="round" opacity=".35"/>
    <circle cx="${x(r.p50)}" cy="54" r="8" fill="${COLOR.naranja}"/>
    <text x="${x(r.p10)}" y="92" text-anchor="middle" class="pr-svg-nota">p10 ${escape(f(r.p10))}</text>
    <text x="${x(r.p50)}" y="108" text-anchor="middle">esperado ${escape(f(r.p50))}</text>
    <text x="${x(r.p90)}" y="92" text-anchor="middle" class="pr-svg-nota">p90 ${escape(f(r.p90))}</text>
  </svg>`;
};

const histogramaSvg = (distribucion) => {
  const bins = distribucion?.bins ?? [];
  if (bins.length === 0) return '<p class="pr-explica">Sin historial para dibujar la distribución.</p>';
  const maxN = Math.max(...bins.map((b) => b.n), 1);
  const desde = bins[0].desde;
  const hasta = bins[bins.length - 1].hasta;
  const ancho = 380 / bins.length;
  const x = (v) => 20 + ((v - desde) / (hasta - desde || 1)) * 380;
  const barras = bins
    .map((b, i) => {
      const h = (b.n / maxN) * 80;
      return `<rect x="${20 + i * ancho + 2}" y="${100 - h}" width="${ancho - 4}" height="${h}" rx="3" fill="${COLOR.azul}" opacity=".55"/>
        <text x="${20 + i * ancho + ancho / 2}" y="112" text-anchor="middle" class="pr-svg-nota">${escape(pct(b.desde, 1))}</text>`;
    })
    .join('');
  const pred = distribucion.prediccionTasa;
  const marca =
    typeof pred === 'number'
      ? `<line x1="${x(pred)}" x2="${x(pred)}" y1="14" y2="100" stroke="${COLOR.naranja}" stroke-width="2"/>
         <text x="${x(pred)}" y="10" text-anchor="middle" class="pr-svg-titulo">predicción ${escape(pct(pred))}</text>`
      : '';
  return `<svg viewBox="0 0 420 124" class="pr-svg" role="img" aria-label="Distribución de la tasa en tus posts">
    ${barras}
    ${marca}
  </svg>`;
};

const factoresHtml = (factores) => {
  if (!factores.length)
    return '<p class="pr-explica">Ningún factor pesa lo suficiente como para destacarlo con tus datos actuales.</p>';
  const maxImpacto = Math.max(...factores.map((f) => Math.abs(f.impactoPct)), 1);
  return factores
    .map((f) => {
      const ancho = Math.min(50, (Math.abs(f.impactoPct) / maxImpacto) * 50);
      const signo = f.impactoPct > 0 ? '+' : '';
      const barra =
        f.efecto === 'positivo'
          ? `<i class="pos" style="width:${ancho}%"></i>`
          : `<i class="neg" style="width:${ancho}%"></i>`;
      return `<div class="pr-fila">
        <div class="pr-fila-nombre">${escape(f.factor)}<span class="pr-fila-ev">${escape(f.evidencia)}</span></div>
        <div class="pr-div">${barra}<b style="${f.impactoPct >= 0 ? 'left:calc(50% + 8px)' : 'right:calc(50% + 8px)'}">${signo}${escape(String(f.impactoPct))} %</b></div>
      </div>`;
    })
    .join('');
};

const comparacionSvg = (variantes) => {
  const ok = variantes.filter((v) => v.prediccion.tasaInteraccion);
  if (ok.length === 0) return '<p class="pr-explica">Sin predicción de tasa para comparar: hacen falta más posts.</p>';
  const tope = Math.max(...ok.map((v) => v.prediccion.tasaInteraccion.p90)) * 1.15 || 1;
  const ancho = 420 / ok.length;
  const y = (v) => 150 - (v / tope) * 120;
  const columnas = ok
    .map((v, i) => {
      const r = v.prediccion.tasaInteraccion;
      const cx = i * ancho + ancho / 2;
      const color = i === 0 ? COLOR.naranja : COLOR.azul;
      return `<rect x="${cx - 26}" y="${y(r.p50)}" width="52" height="${150 - y(r.p50)}" rx="6" fill="${color}" opacity=".8"/>
        <line x1="${cx}" x2="${cx}" y1="${y(r.p90)}" y2="${y(r.p10)}" stroke="var(--text-secondary,#d4d4d8)" stroke-width="1.5"/>
        <line x1="${cx - 8}" x2="${cx + 8}" y1="${y(r.p90)}" y2="${y(r.p90)}" stroke="var(--text-secondary,#d4d4d8)" stroke-width="1.5"/>
        <line x1="${cx - 8}" x2="${cx + 8}" y1="${y(r.p10)}" y2="${y(r.p10)}" stroke="var(--text-secondary,#d4d4d8)" stroke-width="1.5"/>
        <text x="${cx}" y="${y(r.p90) - 8}" text-anchor="middle" class="pr-svg-titulo">${escape(pct(r.p50))}</text>
        <text x="${cx}" y="170" text-anchor="middle">${escape(v.nombre)}</text>`;
    })
    .join('');
  return `<svg viewBox="0 0 420 180" class="pr-svg" role="img" aria-label="Comparación de tasa esperada por variante">
    <line x1="0" x2="420" y1="150" y2="150" stroke="var(--border,rgba(255,255,255,.12))"/>
    ${columnas}
  </svg>`;
};

const historialHtml = (resumen) => {
  const plataformas = resumen?.plataformas ?? [];
  if (plataformas.length === 0)
    return '<div class="pr-vacio">Todavía no hay posts con tasa de interacción para mostrar.</div>';
  return plataformas
    .map((p) => {
      const grupo = (titulo, items) => {
        if (!items.length) return '';
        const max = Math.max(...items.map((g) => g.tasaMediana), 0.0001);
        return `<div class="pr-bloque" style="margin-top:0;">
          <h4>${escape(titulo)}</h4>
          ${items
            .map(
              (g) => `<div class="pr-barra-fila">
                <span>${escape(g.etiqueta)} <small class="pr-explica">(n=${escape(String(g.posts))})</small></span>
                <div class="pr-barra"><i style="width:${Math.round((g.tasaMediana / max) * 100)}%;background:${COLOR.naranja};"></i></div>
                <span class="pr-barra-val">${escape(pct(g.tasaMediana))}${g.vsMediana === null ? '' : ` · ${escape(decimal(g.vsMediana, 2))}×`}</span>
              </div>`,
            )
            .join('')}
        </div>`;
      };
      return `<div class="pr-bloque">
        <h4>${escape(PLATAFORMAS[p.plataforma] ?? p.plataforma)} · ${escape(num(p.posts))} posts · mediana ${escape(pct(p.medianaTasa))}</h4>
        ${grupo('Por formato', p.porFormato)}
        ${grupo('Por hook', p.porHook)}
        ${grupo('Por llamado a la acción', p.porCta)}
        ${grupo('Por franja horaria', p.porFranja)}
      </div>`;
    })
    .join('');
};

const estadisticasHtml = (r) => {
  const e = r.estadisticas;
  return `<div class="pr-bloque">
    <h4>Calidad del modelo</h4>
    <div class="pr-stats">
      <div class="pr-stat"><span>Posts usados</span><b>${escape(num(e.n))}</b><small>historial de la cuenta</small></div>
      <div class="pr-stat"><span>R² (Q²)</span><b>${escape(decimal(e.q2, 2))}</b><small>${e.q2 === null ? 'sin datos' : e.q2 > 0 ? 'mejor que el promedio' : 'no supera al promedio'}</small></div>
      <div class="pr-stat"><span>Mejora vs promedio</span><b>${escape(e.mejoraVsPromedioPct === null ? 'sin dato' : `${e.mejoraVsPromedioPct > 0 ? '+' : ''}${e.mejoraVsPromedioPct} %`)}</b><small>error absoluto menor</small></div>
      <div class="pr-stat"><span>Error típico</span><b>${escape(e.errorTipicoPct === null ? 'sin dato' : `±${e.errorTipicoPct} %`)}</b><small>sobre tus posts pasados</small></div>
      <div class="pr-stat"><span>Mediana histórica</span><b>${escape(pct(e.medianaTasa))}</b><small>p25 ${escape(pct(e.p25Tasa))} · p75 ${escape(pct(e.p75Tasa))}</small></div>
    </div>
    <p class="pr-explica">Validado con leave-one-out: cada post se predice sin usarse a sí mismo. Q² arriba de 0 quiere decir que el modelo le gana a predecir siempre el promedio. El rango p10–p90 cubre el 80 % de los casos en tu historial.</p>
  </div>`;
};

const resultadoHtml = (r, formato) => {
  const conf = CONFIANZA[r.confianza] ?? CONFIANZA['sin-datos'];
  const cabecera = `
    <div class="pr-cab">
      <div class="pr-cab-top">
        <span class="tag ${conf.clase}">${escape(conf.label)}</span>
        <span class="pr-sub">${escape(PLATAFORMAS[r.plataforma] ?? r.plataforma)} · basada en ${escape(num(r.postsUsados))} posts de tu cuenta</span>
      </div>
    </div>`;

  if (r.postsUsados === 0) {
    return `${cabecera}
      <div class="pr-vacio">
        Todavía no hay historial de ${escape(PLATAFORMAS[r.plataforma] ?? '')} para predecir.
        <div style="margin-top:12px;">
          <a class="btn" href="/api/auth/${escape(r.plataforma)}/login?redirectAfter=${encodeURIComponent(window.location.origin + '/')}">Conectar ${escape(PLATAFORMAS[r.plataforma] ?? '')}</a>
        </div>
      </div>
      <div class="pr-bloque"><h4>Buenas prácticas (sin medir tu cuenta)</h4>
        <ul class="pr-lista">${r.recomendaciones.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>
      </div>`;
  }

  const kpis = `
    <div class="pr-kpis">
      <div class="pr-kpi">
        <span class="pr-kpi-label">Alcance esperado</span>
        <span class="pr-kpi-valor">${escape(num(r.alcance?.p50))}</span>
        <span class="pr-kpi-nota">rango ${escape(rango(r.alcance, num))}</span>
      </div>
      <div class="pr-kpi">
        <span class="pr-kpi-label">Tasa de interacción</span>
        <span class="pr-kpi-valor">${escape(pct(r.tasaInteraccion?.p50))}</span>
        <span class="pr-kpi-nota">rango ${escape(rango(r.tasaInteraccion, (v) => pct(v)))}</span>
      </div>
      <div class="pr-kpi">
        <span class="pr-kpi-label">Supera tu mediana</span>
        <span class="pr-kpi-valor">${escape(pctEntero(r.probabilidades.superarMediana))}</span>
        <span class="pr-kpi-nota">mediana de tu cuenta: ${escape(pct(r.medianas.tasaInteraccion))}</span>
      </div>
      <div class="pr-kpi">
        <span class="pr-kpi-label">Entre tus mejores 25 %</span>
        <span class="pr-kpi-valor">${escape(pctEntero(r.probabilidades.entreLosMejores25))}</span>
        <span class="pr-kpi-nota">según tus posts pasados</span>
      </div>
    </div>`;

  const graficos = `
    <div class="pr-bloque">
      <h4>Dónde cae tu contenido</h4>
      ${rangoSvg('Tasa de interacción', r.tasaInteraccion, r.medianas.tasaInteraccion, (v) => pct(v))}
      ${r.alcance ? rangoSvg('Alcance', r.alcance, r.medianas.alcance, (v) => num(v)) : ''}
    </div>
    <div class="pr-bloque">
      <h4>Tu historial frente a la predicción</h4>
      ${histogramaSvg(r.distribucion)}
      <p class="pr-explica">Barras: cuántos posts tuyos cayeron en cada rango de tasa. La línea naranja es la predicción.</p>
    </div>`;

  const retencion = r.retencion.disponible
    ? `<div class="pr-bloque"><h4>Retención</h4><div class="pr-kpis" style="grid-template-columns:1fr;">
         <div class="pr-kpi"><span class="pr-kpi-label">Tiempo de visualización esperado</span>
         <span class="pr-kpi-valor">${escape(segundos(r.retencion.tiempoVisualizacionSeg?.p50))}</span>
         <span class="pr-kpi-nota">rango ${escape(rango(r.retencion.tiempoVisualizacionSeg, segundos))} · ${escape(r.retencion.motivo)}</span></div></div></div>`
    : `<p class="pr-explica">Retención: ${escape(r.retencion.motivo)}</p>`;

  const factores = `<div class="pr-bloque">
    <h4>Qué suma y qué resta (impacto en la tasa, modelo multifactor)</h4>
    ${factoresHtml(r.factores)}
    <p class="pr-explica">Cada factor se estima junto con todos los demás, así que el impacto de uno ya descuenta lo que explican los otros.</p>
  </div>`;

  const momentos = r.mejoresMomentos.length
    ? `<div class="pr-bloque"><h4>Tus mejores momentos</h4><div class="pr-momentos">${r.mejoresMomentos
        .map(
          (m) =>
            `<span class="pr-momento">${escape(m.dia)} · ${escape(m.franja)}: ${escape(pct(m.tasaMediana))} (n=${escape(String(m.posts))})</span>`,
        )
        .join('')}</div></div>`
    : '';

  const recomendaciones = `<div class="pr-bloque"><h4>Para que suba mejor</h4><ul class="pr-lista">${r.recomendaciones
    .map((x) => `<li>${escape(x)}</li>`)
    .join('')}</ul></div>`;

  const veredicto = r.veredicto
    ? `<div class="pr-veredicto" style="border-left:4px solid ${VEREDICTO_COLOR[r.veredicto.nivel] ?? COLOR.gris};">
        <strong style="color:${VEREDICTO_COLOR[r.veredicto.nivel] ?? COLOR.gris};">${escape(r.veredicto.titulo)}</strong>
        <p>${escape(r.veredicto.texto)}</p>
      </div>`
    : '';

  const sugerido = r.mejorMomentoFormato
    ? `<div class="pr-momento-sugerido">
        <span>Mejor momento para ${escape(FORMATOS[formato] ?? 'este formato')}: <strong>${escape(r.mejorMomentoFormato.dia)} · ${escape(r.mejorMomentoFormato.franja)}</strong> (mediana ${escape(pct(r.mejorMomentoFormato.tasaMediana))}, n=${escape(String(r.mejorMomentoFormato.posts))})</span>
        <button class="btn" id="pr-aplicar-momento" data-dia="${escape(r.mejorMomentoFormato.dia)}" data-franja="${escape(r.mejorMomentoFormato.franja)}">Usar este horario y recalcular</button>
      </div>`
    : '';

  return `${cabecera}${veredicto}${kpis}${sugerido}${recomendaciones}
    <details class="pr-detalle">
      <summary>Detalle técnico: gráficos, calidad del modelo, factores y retención</summary>
      ${graficos}${estadisticasHtml(r)}${factores}${retencion}${momentos}
    </details>`;
};

const comparadorHtml = (captionPorDefecto) => `
  <div class="pr-bloque" id="pr-comparar">
    <h4>Comparar variantes del mismo contenido</h4>
    <p class="pr-explica">Mismo caption, distinto momento o formato. Te dice cuál de las variantes conviene según tu historial.</p>
    <div class="pr-variantes">
      ${[0, 1, 2]
        .map(
          (i) => `<div class="pr-variante" data-variante="${i}" ${i > 1 ? 'hidden' : ''}>
          <strong>Variante ${i + 1}</strong>
          <input class="field-select" data-campo="nombre" maxlength="40" value="${i === 0 ? 'Original' : `Variante ${i + 1}`}" aria-label="Nombre" />
          <select class="field-select" data-campo="formato">${Object.entries(FORMATOS)
            .map(([v, l]) => `<option value="${v}"${v === 'reel' ? ' selected' : ''}>${l}</option>`)
            .join('')}</select>
          <select class="field-select" data-campo="hora">${Array.from({ length: 24 }, (_, h) => `<option value="${h}"${h === (i === 0 ? 19 : 9) ? ' selected' : ''}>${String(h).padStart(2, '0')}:00</option>`).join('')}</select>
          <select class="field-select" data-campo="dia"><option value="">Sin definir</option>${DIAS.map((d) => `<option value="${d}"${d === (i === 0 ? 'martes' : 'jueves') ? ' selected' : ''}>${d.charAt(0).toUpperCase() + d.slice(1)}</option>`).join('')}</select>
        </div>`,
        )
        .join('')}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn" id="pr-agregar-variante" type="button">+ Agregar variante</button>
      <button class="btn primary" id="pr-comparar-btn" type="button">⚖️ Comparar</button>
    </div>
    <div id="pr-comparar-resultado" data-caption="${escape(captionPorDefecto ?? '')}"></div>
  </div>`;

const comparacionResultadoHtml = (variantes) => {
  const ganadora = [...variantes]
    .filter((v) => v.prediccion.tasaInteraccion)
    .sort((a, b) => b.prediccion.tasaInteraccion.p50 - a.prediccion.tasaInteraccion.p50)[0];
  const filas = variantes
    .map((v) => {
      const t = v.prediccion.tasaInteraccion;
      return `<tr>
        <td>${escape(v.nombre)}</td>
        <td class="n">${escape(pct(t?.p50))}</td>
        <td class="n">${escape(t ? `${pct(t.p10)} a ${pct(t.p90)}` : 'sin dato')}</td>
        <td class="n">${escape(pctEntero(v.prediccion.probabilidades.superarMediana))}</td>
        <td class="n">${escape(num(v.prediccion.alcance?.p50))}</td>
      </tr>`;
    })
    .join('');
  return `
    <div class="pr-bloque" style="margin-top:12px;">
      <h4>Resultado de la comparación</h4>
      ${comparacionSvg(variantes)}
      <table class="pr-tabla"><thead><tr><th>Variante</th><th class="n">Tasa esperada</th><th class="n">Rango p10–p90</th><th class="n">Supera tu mediana</th><th class="n">Alcance esperado</th></tr></thead>
        <tbody>${filas}</tbody></table>
      <p class="pr-explica">${
        ganadora
          ? `Según tu historial, <b>${escape(ganadora.nombre)}</b> es la variante con mayor tasa esperada. La diferencia sólo es firme si los rangos no se pisan.`
          : 'Ninguna variante tiene predicción de tasa todavía: hacen falta más posts.'
      }</p>
    </div>`;
};

const leerFormulario = (root) => {
  const valor = (id) => root.querySelector(`#${id}`)?.value ?? '';
  const hora = valor('hora');
  const duracion = valor('duracion');
  return {
    plataforma: valor('plataforma'),
    formato: valor('formato'),
    caption: valor('caption').trim(),
    hashtags: valor('hashtags')
      .split(/[\s\n]+/)
      .map((h) => h.trim())
      .filter(Boolean),
    hora: hora === '' ? null : Number(hora),
    dia: valor('dia') || null,
    duracionSeg: duracion === '' ? null : Number(duracion),
  };
};

const actualizarCamposFormato = (root) => {
  const formato = root.querySelector('#formato')?.value;
  const campo = root.querySelector('#campo-duracion');
  if (campo) campo.style.display = formato === 'reel' || formato === 'video' ? '' : 'none';
};

const leerVariantes = (root, caption, plataforma) =>
  [...root.querySelectorAll('.pr-variante:not([hidden])')].map((el) => {
    const campo = (nombre) => el.querySelector(`[data-campo="${nombre}"]`)?.value ?? '';
    return {
      nombre: campo('nombre').trim() || 'Variante',
      plataforma,
      formato: campo('formato'),
      caption,
      hashtags: [],
      hora: Number(campo('hora')),
      dia: campo('dia') || null,
      duracionSeg: null,
    };
  });

const cargarHistorial = async (root) => {
  const { data: estado } = await apiSafe('/api/executive/predictor/estado', null);
  if (!estado) return;
  const nota = root.querySelector('#pr-nota-historial');
  if (nota) {
    const red = (nombre, posts, estadoRed) => {
      if (estadoRed && !estadoRed.conectado) return `${nombre}: no conectado`;
      if (estadoRed?.error) return `${nombre}: no se pudo actualizar (usamos ${posts} posts guardados)`;
      return `${nombre}: ${posts} posts`;
    };
    const visualizacion = estado.reelsConTiempoVisualizacion
      ? `, ${estado.reelsConTiempoVisualizacion} con tiempo de visualización`
      : '';
    nota.textContent = `Historial: ${red('Instagram', estado.instagram, estado.redes?.instagram)} · ${red('TikTok', estado.tiktok, estado.redes?.tiktok)}${visualizacion}.`;
  }
  const hist = root.querySelector('#pr-historial');
  if (hist) hist.innerHTML = historialHtml(estado.resumen);
};

export const renderPredictor = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Predictor de performance</h1>
        <p class="view-subtitle page-subtitle">Estimá alcance, interacción y tiempo de visualización de tu próximo contenido, y compará variantes antes de publicar.</p>
      </div>
    </header>
    ${ESTILOS}
    <div class="page-body">
      <div class="studio-layout">
        ${formularioHtml()}
        <div class="studio-preview">
          <div class="pr-vacio">Completá el contenido y tocá Predecir: vas a ver rangos, gráficos y qué cambiar, calculados con el historial de tu cuenta.</div>
        </div>
      </div>
      <div class="pr-bloque" style="margin-top:18px;">
        <h4>Tu historial: qué rinde en tu cuenta</h4>
        <div id="pr-historial"></div>
      </div>
    </div>`;

  actualizarCamposFormato(root);
  root.querySelector('#formato')?.addEventListener('change', () => actualizarCamposFormato(root));
  void cargarHistorial(root);

  root.querySelector('#predict-btn')?.addEventListener('click', async (e) => {
    const datos = leerFormulario(root);
    if (!datos.caption) {
      toast('Escribí el caption para predecir', 'crit');
      return;
    }
    const btn = e.currentTarget;
    const preview = root.querySelector('.studio-preview');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> prediciendo…';
    const { data, error } = await apiSafe('/api/executive/predictor', null, { method: 'POST', body: datos });
    btn.disabled = false;
    btn.innerHTML = '🎯 Predecir';
    if (error || !data) {
      preview.innerHTML = '<div class="pr-vacio">No pudimos predecir ahora: revisá la conexión con el backend.</div>';
      toast('No se pudo predecir', 'crit');
      return;
    }
    preview.innerHTML = `${resultadoHtml(data, datos.formato)}${comparadorHtml(datos.caption)}`;
    toast('Predicción lista', 'ok');
  });

  root.addEventListener('click', async (e) => {
    const aplicar = e.target.closest('#pr-aplicar-momento');
    if (aplicar) {
      const horaSel = root.querySelector('#hora');
      const diaSel = root.querySelector('#dia');
      if (horaSel) horaSel.value = String(HORA_DE_FRANJA[aplicar.dataset.franja] ?? 19);
      if (diaSel) diaSel.value = aplicar.dataset.dia ?? '';
      root.querySelector('#predict-btn')?.click();
      return;
    }
    const agregar = e.target.closest('#pr-agregar-variante');
    if (agregar) {
      const ocultas = [...root.querySelectorAll('.pr-variante[hidden]')];
      ocultas[0]?.removeAttribute('hidden');
      if (ocultas.length <= 1) agregar.disabled = true;
      return;
    }
    const comparar = e.target.closest('#pr-comparar-btn');
    if (!comparar) return;
    const resultado = root.querySelector('#pr-comparar-resultado');
    const caption = resultado?.dataset.caption ?? '';
    const plataforma = root.querySelector('#plataforma')?.value ?? 'instagram';
    const variantes = leerVariantes(root, caption, plataforma);
    comparar.disabled = true;
    const { data, error } = await apiSafe('/api/executive/predictor/comparar', null, {
      method: 'POST',
      body: { variantes },
    });
    comparar.disabled = false;
    if (error || !data?.variantes) {
      toast('No se pudo comparar: revisá el caption y las variantes', 'crit');
      return;
    }
    resultado.innerHTML = comparacionResultadoHtml(data.variantes);
  });
};
