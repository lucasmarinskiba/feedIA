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

const ESTILOS = `<style>
  .pr-cab{display:flex;flex-direction:column;gap:8px;margin-bottom:6px;}
  .pr-cab-top{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .pr-titulo{font-size:15px;font-weight:700;margin:0;}
  .pr-sub{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);margin:0;}
  .pr-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin:12px 0;}
  .pr-kpi{background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));border-radius:12px;padding:12px;display:flex;flex-direction:column;gap:4px;}
  .pr-kpi-label{font-size:10px;text-transform:uppercase;letter-spacing:.07em;font-weight:600;color:var(--text-tertiary,#a1a1aa);}
  .pr-kpi-valor{font-size:20px;font-weight:700;letter-spacing:-0.02em;}
  .pr-kpi-nota{font-size:11.5px;color:var(--text-tertiary,#a1a1aa);}
  .pr-seccion{margin:14px 0 6px;}
  .pr-seccion h4{margin:0 0 8px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .pr-lista{margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px;}
  .pr-lista li{font-size:13px;line-height:1.5;padding:8px 10px;border-radius:10px;background:var(--bg-hover,rgba(255,255,255,.04));}
  .pr-lista li b{font-weight:600;}
  .pr-pos{color:#6ee7b7;}
  .pr-neg{color:#fca5a5;}
  .pr-ev{display:block;font-size:12px;color:var(--text-tertiary,#a1a1aa);margin-top:2px;}
  .pr-nota{font-size:12.5px;color:var(--text-tertiary,#a1a1aa);line-height:1.5;margin:0;}
  .pr-vacio{padding:28px 18px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;line-height:1.6;}
  .pr-momentos{display:flex;gap:8px;flex-wrap:wrap;}
  .pr-momento{font-size:12px;padding:6px 10px;border-radius:999px;background:var(--bg-hover,rgba(255,255,255,.04));border:1px solid var(--border,rgba(255,255,255,.08));}
</style>`;

const num = (n) => (typeof n === 'number' ? Math.round(n).toLocaleString('es-AR') : 'sin dato');
const pct = (n) => (typeof n === 'number' ? `${n.toFixed(1)}%` : 'sin dato');
const entero = (n) => (typeof n === 'number' ? `${Math.round(n)}%` : 'sin dato');
const segundos = (n) => (typeof n === 'number' ? `${n.toFixed(1)} s` : 'sin dato');
const rango = (r, f) => (r ? `${f(r.p10)} a ${f(r.p90)}` : 'sin dato');

const formularioHtml = () => `
  <div class="studio-form">
    <h3>Predictor de performance</h3>
    <p class="small muted" style="margin-bottom:14px;">Predicciones calibradas con el historial de tu cuenta: cuanto más publicás, más precisas.</p>

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

const resultadoHtml = (r) => {
  const conf = CONFIANZA[r.confianza] ?? CONFIANZA['sin-datos'];
  const cabecera = `
    <div class="pr-cab">
      <div class="pr-cab-top">
        <span class="tag ${conf.clase}">${escape(conf.label)}</span>
        <span class="pr-sub">${escape(PLATAFORMAS[r.plataforma] ?? r.plataforma)} · basada en ${escape(num(r.postsUsados))} posts de tu cuenta</span>
      </div>
      <p class="pr-sub">${r.exactitud.tasaErrorTipicoPct === null ? 'Todavía no hay error histórico para medir la exactitud.' : `Error típico del modelo sobre tus posts pasados: ±${escape(num(r.exactitud.tasaErrorTipicoPct))}%.`}</p>
    </div>`;

  if (r.postsUsados === 0) {
    return `${cabecera}
      <div class="pr-vacio">
        Todavía no hay historial de ${escape(PLATAFORMAS[r.plataforma] ?? '')} para predecir.
        <div style="margin-top:12px;">
          <a class="btn" href="/api/auth/${escape(r.plataforma)}/login?redirectAfter=${encodeURIComponent(window.location.origin + '/')}">Conectar ${escape(PLATAFORMAS[r.plataforma] ?? '')}</a>
        </div>
      </div>
      <div class="pr-seccion"><h4>Buenas prácticas (sin medir tu cuenta)</h4>
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
        <span class="pr-kpi-nota">rango ${escape(rango(r.tasaInteraccion, pct))}</span>
      </div>
      <div class="pr-kpi">
        <span class="pr-kpi-label">Supera tu mediana</span>
        <span class="pr-kpi-valor">${escape(entero(r.probabilidades.superarMediana))}</span>
        <span class="pr-kpi-nota">mediana de tu cuenta: ${escape(pct(r.medianas.tasaInteraccion))}</span>
      </div>
      <div class="pr-kpi">
        <span class="pr-kpi-label">Entre tus mejores 25%</span>
        <span class="pr-kpi-valor">${escape(entero(r.probabilidades.entreLosMejores25))}</span>
        <span class="pr-kpi-nota">según tus posts pasados</span>
      </div>
    </div>`;

  const retencion = r.retencion.disponible
    ? `<div class="pr-kpi"><span class="pr-kpi-label">Tiempo de visualización esperado</span>
         <span class="pr-kpi-valor">${escape(segundos(r.retencion.tiempoVisualizacionSeg?.p50))}</span>
         <span class="pr-kpi-nota">rango ${escape(rango(r.retencion.tiempoVisualizacionSeg, segundos))} · ${escape(r.retencion.motivo)}</span></div>`
    : `<p class="pr-nota">Retención: ${escape(r.retencion.motivo)}</p>`;

  const factores = r.factores.length
    ? `<div class="pr-seccion"><h4>Qué suma y qué resta</h4><ul class="pr-lista">${r.factores
        .map(
          (
            f,
          ) => `<li><b class="${f.efecto === 'positivo' ? 'pr-pos' : 'pr-neg'}">${f.efecto === 'positivo' ? '▲' : '▼'} ${escape(f.factor)}</b>
            <span class="pr-ev">${escape(f.evidencia)}</span></li>`,
        )
        .join('')}</ul></div>`
    : '';

  const momentos = r.mejoresMomentos.length
    ? `<div class="pr-seccion"><h4>Tus mejores momentos</h4><div class="pr-momentos">${r.mejoresMomentos
        .map(
          (m) =>
            `<span class="pr-momento">${escape(m.dia)} · ${escape(m.franja)}: ${escape(pct(m.tasaMediana))} (n=${escape(String(m.posts))})</span>`,
        )
        .join('')}</div></div>`
    : '';

  const recomendaciones = `<div class="pr-seccion"><h4>Para que suba mejor</h4><ul class="pr-lista">${r.recomendaciones
    .map((x) => `<li>${escape(x)}</li>`)
    .join('')}</ul></div>`;

  return `${cabecera}${kpis}${retencion}${factores}${momentos}${recomendaciones}`;
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

export const renderPredictor = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Predictor de performance</h1>
        <p class="view-subtitle page-subtitle">Estimá el alcance, la interacción y el tiempo de visualización de tu próximo contenido antes de publicarlo.</p>
      </div>
    </header>
    ${ESTILOS}
    <div class="page-body">
      <div class="studio-layout">
        ${formularioHtml()}
        <div class="studio-preview">
          <div class="pr-vacio">Completá el contenido y tocá Predecir: vas a ver rangos, probabilidades y qué cambiar, calculados con el historial de tu cuenta.</div>
        </div>
      </div>
    </div>`;

  actualizarCamposFormato(root);
  root.querySelector('#formato')?.addEventListener('change', () => actualizarCamposFormato(root));

  const { data: estado } = await apiSafe('/api/executive/predictor/estado', null);
  if (estado) {
    const nota = root.querySelector('.studio-form .small.muted');
    if (nota) {
      nota.textContent = `Historial disponible: ${estado.instagram} posts de Instagram y ${estado.tiktok} de TikTok${estado.reelsConTiempoVisualizacion ? `, ${estado.reelsConTiempoVisualizacion} con tiempo de visualización` : ''}.`;
    }
  }

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
    preview.innerHTML = resultadoHtml(data);
    toast('Predicción lista', 'ok');
  });
};
