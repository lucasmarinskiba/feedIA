import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

const CATEGORIAS = ['Todas', 'Contenido', 'Estrategia', 'Comunidad', 'Operación'];

const ESTILOS = `<style>
  .hi-wrap{display:flex;flex-direction:column;gap:18px;color:var(--text-primary,#fafafa);}
  .hi-banda{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:18px 20px;border-radius:14px;background:linear-gradient(135deg,rgba(124,58,237,.22),rgba(99,102,241,.08));border:1px solid rgba(124,58,237,.3);}
  .hi-banda h2{margin:0 0 4px;font-size:20px;letter-spacing:-0.02em;}
  .hi-banda p{margin:0;font-size:13px;color:var(--text-tertiary,#a1a1aa);max-width:620px;line-height:1.5;}
  .hi-cifras{display:flex;gap:8px;flex-wrap:wrap;}
  .hi-cifra{padding:8px 12px;border-radius:10px;background:rgba(0,0,0,.25);font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#a1a1aa);text-align:center;}
  .hi-cifra strong{display:block;font-size:18px;color:var(--text-primary,#fafafa);letter-spacing:0;}
  .hi-chips{display:flex;gap:6px;flex-wrap:wrap;}
  .hi-chip{border:1px solid var(--border,rgba(255,255,255,.1));background:transparent;color:var(--text-secondary,#d4d4d8);padding:6px 12px;border-radius:999px;font-size:12px;cursor:pointer;}
  .hi-chip.is-on{background:#fdba74;color:#111;border-color:#fdba74;}
  .hi-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
  .hi-card{text-align:left;padding:16px;border-radius:14px;border:1px solid var(--border,rgba(255,255,255,.08));background:var(--bg-card,#0f0f10);color:inherit;cursor:pointer;display:flex;flex-direction:column;gap:8px;transition:border-color .15s,transform .15s;}
  .hi-card:hover{border-color:rgba(253,186,116,.6);transform:translateY(-1px);}
  .hi-card-cab{display:flex;align-items:center;gap:10px;}
  .hi-icono{font-size:22px;}
  .hi-nombre{font-size:15px;font-weight:700;}
  .hi-cat{font-size:10px;text-transform:uppercase;letter-spacing:.07em;color:var(--text-tertiary,#a1a1aa);}
  .hi-desc{font-size:12.5px;line-height:1.5;color:var(--text-tertiary,#a1a1aa);margin:0;}
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
  .hi-fuente{font-size:10px;text-transform:uppercase;letter-spacing:.07em;padding:3px 9px;border-radius:999px;background:rgba(255,255,255,.07);color:var(--text-tertiary,#a1a1aa);}
  .hi-sec{display:flex;flex-direction:column;gap:6px;}
  .hi-sec h4{margin:0;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary,#a1a1aa);}
  .hi-texto{margin:0;font-size:13.5px;line-height:1.6;white-space:pre-wrap;}
  .hi-lista{margin:0;padding-left:18px;font-size:13.5px;line-height:1.6;}
  .hi-copiable{background:var(--bg-hover,rgba(255,255,255,.04));border-radius:10px;padding:12px;font-size:13px;line-height:1.6;white-space:pre-wrap;}
  .hi-notas{font-size:12px;color:var(--text-tertiary,#a1a1aa);margin:0;padding-left:18px;line-height:1.5;}
  .hi-error{padding:12px 14px;border-radius:10px;background:rgba(248,113,113,.12);color:#fca5a5;font-size:13px;}
  .hi-vacio{padding:24px;text-align:center;color:var(--text-tertiary,#a1a1aa);font-size:13px;}
  @media (max-width:820px){.hi-detalle{grid-template-columns:1fr;}}
</style>`;

const CAMPO_DEFAULT = { cantidad: '10', publicaciones: '3' };

let estado = { catalogo: [], categoria: 'Todas', herramienta: null, resultado: null, error: null, enviando: false };

const catalogoHtml = () => {
  const visibles = estado.catalogo.filter((h) => estado.categoria === 'Todas' || h.categoria === estado.categoria);
  const totalCategorias = new Set(estado.catalogo.map((h) => h.categoria)).size;
  return `
    <div class="hi-banda">
      <div>
        <h2>🧰 Herramientas IA</h2>
        <p>${estado.catalogo.length} herramientas con rol de especialista senior y reglas de oficio. Cuando hay historial, usan tus posts reales: lo que ya rindió en tu cuenta, tus momentos y tus hashtags.</p>
      </div>
      <div class="hi-cifras">
        <div class="hi-cifra"><strong>${estado.catalogo.length}</strong>herramientas</div>
        <div class="hi-cifra"><strong>${totalCategorias}</strong>áreas</div>
      </div>
    </div>
    <div class="hi-chips">${CATEGORIAS.map(
      (c) =>
        `<button class="hi-chip${estado.categoria === c ? ' is-on' : ''}" data-hi-categoria="${escape(c)}">${escape(c)}</button>`,
    ).join('')}</div>
    <div class="hi-grid">${visibles
      .map(
        (h) => `<button class="hi-card" data-hi-abrir="${escape(h.id)}">
          <div class="hi-card-cab"><span class="hi-icono">${escape(h.icono)}</span>
            <div><div class="hi-nombre">${escape(h.nombre)}</div><div class="hi-cat">${escape(h.categoria)}</div></div></div>
          <p class="hi-desc">${escape(h.descripcion)}</p>
        </button>`,
      )
      .join('')}</div>`;
};

const campoHtml = (c) => {
  const id = `hi-campo-${c.id}`;
  const req = c.requerido ? ' *' : '';
  const valorDefault = CAMPO_DEFAULT[c.id] ?? '';
  let control;
  if (c.tipo === 'select') {
    control = `<select class="hi-input" id="${id}">${c.opciones
      .map((o) => `<option value="${escape(o)}">${escape(o)}</option>`)
      .join('')}</select>`;
  } else if (c.tipo === 'textarea') {
    control = `<textarea class="hi-input" id="${id}" placeholder="${escape(c.ayuda ?? '')}"></textarea>`;
  } else if (c.tipo === 'numero') {
    control = `<input class="hi-input" id="${id}" type="number" min="${c.min ?? ''}" max="${c.max ?? ''}" value="${escape(valorDefault)}" />`;
  } else {
    control = `<input class="hi-input" id="${id}" type="text" placeholder="${escape(c.ayuda ?? '')}" />`;
  }
  return `<div class="hi-campo"><label for="${id}">${escape(c.etiqueta)}${req}</label>${control}${c.ayuda && c.tipo !== 'textarea' ? `<small>${escape(c.ayuda)}</small>` : ''}</div>`;
};

const detalleHtml = (h) => `
  <div class="hi-wrap">
    <div><button class="hi-btn hi-btn-sec" data-hi-volver="1">← Volver al catálogo</button></div>
    <div class="hi-detalle">
      <form class="hi-form" id="hi-form">
        <div><h3>${escape(h.icono)} ${escape(h.nombre)}</h3><p class="hi-desc">${escape(h.descripcion)}</p></div>
        ${h.campos.map(campoHtml).join('')}
        <button type="button" class="hi-btn" id="hi-generar" data-hi-generar="${escape(h.id)}">Generar</button>
      </form>
      <div class="hi-salida" id="hi-salida">${salidaHtml()}</div>
    </div>
  </div>`;

const seccionHtml = (s) => {
  const cuerpo = Array.isArray(s.contenido)
    ? s.tipo === 'lista'
      ? `<ul class="hi-lista">${s.contenido.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`
      : `<div class="hi-texto">${s.contenido.map((i) => escape(i)).join('\n')}</div>`
    : s.tipo === 'copiable'
      ? `<div class="hi-copiable">${escape(s.contenido)}</div><button class="hi-btn hi-btn-sec" data-hi-copiar="1" style="align-self:flex-start;">Copiar</button>`
      : `<p class="hi-texto">${escape(s.contenido)}</p>`;
  return `<div class="hi-sec"><h4>${escape(s.titulo)}</h4>${cuerpo}</div>`;
};

const salidaHtml = () => {
  if (estado.enviando) return loadingScreen();
  if (estado.error) return `<div class="hi-error">${escape(estado.error)}</div>`;
  if (!estado.resultado) {
    return '<div class="hi-vacio">Completá los campos y tocá Generar. El resultado aparece acá, con la fuente que lo produjo.</div>';
  }
  const r = estado.resultado;
  const fuente = r.fuente === 'ia' ? 'Generado con IA' : 'Reglas automáticas';
  return `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;">
      <h3>${escape(r.resultado.titulo)}</h3>
      <span class="hi-fuente">${escape(fuente)}</span>
    </div>
    ${r.resultado.secciones.map(seccionHtml).join('')}
    ${r.resultado.notas.length ? `<ul class="hi-notas">${r.resultado.notas.map((n) => `<li>${escape(n)}</li>`).join('')}</ul>` : ''}`;
};

const pintar = (root) => {
  const cuerpo = root.querySelector('#hi-cuerpo');
  if (!cuerpo) return;
  const herramienta = estado.catalogo.find((h) => h.id === estado.herramienta);
  cuerpo.innerHTML = herramienta ? detalleHtml(herramienta) : catalogoHtml();
};

const leerCampos = (herramienta, root) => {
  const valores = {};
  for (const c of herramienta.campos) {
    const el = root.querySelector(`#hi-campo-${c.id}`);
    const valor = el?.value ?? '';
    valores[c.id] = c.tipo === 'numero' ? (valor === '' ? undefined : Number(valor)) : valor;
  }
  return valores;
};

const generar = async (root, herramientaId) => {
  const herramienta = estado.catalogo.find((h) => h.id === herramientaId);
  if (!herramienta) return;
  const faltante = herramienta.campos.find(
    (c) => c.requerido && !String(root.querySelector(`#hi-campo-${c.id}`)?.value ?? '').trim(),
  );
  if (faltante) {
    estado.error = `${faltante.etiqueta} es obligatorio.`;
    estado.resultado = null;
    root.querySelector('#hi-salida').innerHTML = salidaHtml();
    return;
  }
  estado.enviando = true;
  estado.error = null;
  estado.resultado = null;
  root.querySelector('#hi-salida').innerHTML = salidaHtml();
  try {
    const respuesta = await api(`/api/executive/tools/${encodeURIComponent(herramientaId)}`, {
      method: 'POST',
      body: leerCampos(herramienta, root),
    });
    estado.resultado = respuesta;
  } catch (err) {
    estado.error = err.message || 'No se pudo generar el resultado.';
  } finally {
    estado.enviando = false;
    root.querySelector('#hi-salida').innerHTML = salidaHtml();
  }
};

export const renderTools = async (root) => {
  estado = { catalogo: [], categoria: 'Todas', herramienta: null, resultado: null, error: null, enviando: false };
  root.innerHTML = `${ESTILOS}<div class="hi-wrap"><div id="hi-cuerpo">${loadingScreen()}</div></div>`;
  const { data, error } = await apiSafe('/api/executive/tools', []);
  if (error) {
    root.querySelector('#hi-cuerpo').innerHTML =
      '<div class="hi-error">No se pudo cargar el catálogo: revisá la conexión con el backend.</div>';
    return;
  }
  estado.catalogo = Array.isArray(data) ? data : [];
  pintar(root);

  root.addEventListener('click', async (e) => {
    const categoria = e.target.closest('[data-hi-categoria]');
    if (categoria) {
      estado.categoria = categoria.dataset.hiCategoria;
      pintar(root);
      return;
    }
    const abrir = e.target.closest('[data-hi-abrir]');
    if (abrir) {
      estado.herramienta = abrir.dataset.hiAbrir;
      estado.resultado = null;
      estado.error = null;
      pintar(root);
      return;
    }
    if (e.target.closest('[data-hi-volver]')) {
      estado.herramienta = null;
      estado.resultado = null;
      estado.error = null;
      pintar(root);
      return;
    }
    const generarBtn = e.target.closest('[data-hi-generar]');
    if (generarBtn) {
      await generar(root, generarBtn.dataset.hiGenerar);
      return;
    }
    const copiar = e.target.closest('[data-hi-copiar]');
    if (copiar) {
      const texto = copiar.previousElementSibling?.textContent ?? '';
      try {
        await navigator.clipboard.writeText(texto);
        toast('Copiado', 'ok');
      } catch {
        toast('No se pudo copiar: seleccionalo a mano', 'warn');
      }
    }
  });
};
