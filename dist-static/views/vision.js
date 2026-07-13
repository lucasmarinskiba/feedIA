import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

let state = { result: null, imagePreview: null, mode: 'upload' };

const renderTabs = () => `
  <div class="tab-bar">
    <button class="tab-btn ${state.mode === 'upload' ? 'active' : ''}" data-mode="upload">📎 Subir imagen</button>
    <button class="tab-btn ${state.mode === 'camera' ? 'active' : ''}" data-mode="camera">📷 Cámara</button>
    <button class="tab-btn ${state.mode === 'url' ? 'active' : ''}" data-mode="url">🔗 URL</button>
  </div>`;

const renderInputPanel = () => `
  <div class="studio-form">
    <h3>Vision AI</h3>
    <p class="small muted" style="margin-bottom:16px;">Usá Claude multimodal para analizar imágenes, generar captions y alt text con la voz de tu marca.</p>
    ${renderTabs()}
    <div id="input-area" style="margin-top:14px;">
      ${
        state.mode === 'upload'
          ? `
        <div class="field">
          <label class="field-label">Imagen</label>
          <div class="upload-zone" id="upload-zone">
            <div class="upload-icon">🖼️</div>
            <div class="small muted">Arrastrá o hacé click para subir</div>
            <input type="file" id="file-input" accept="image/*" style="display:none;"/>
          </div>
          <div id="image-preview-wrap" style="display:none;margin-top:8px;">
            <img id="image-preview-img" style="max-width:100%;border-radius:8px;border:1px solid var(--border);"/>
          </div>
        </div>`
          : state.mode === 'camera'
            ? `
        <div class="field">
          <label class="field-label">📷 Cámara en vivo</label>
          <div id="camera-wrap" style="position:relative;border-radius:12px;overflow:hidden;background:#000;min-height:240px;display:flex;align-items:center;justify-content:center;">
            <video id="camera-video" autoplay playsinline muted style="width:100%;display:none;border-radius:12px;"></video>
            <canvas id="camera-canvas" style="display:none;"></canvas>
            <div id="camera-placeholder" style="text-align:center;padding:30px;">
              <div style="font-size:48px;opacity:.5;">📷</div>
              <div class="small muted" style="margin-top:8px;">Presioná "Activar cámara" para empezar</div>
            </div>
            <img id="camera-snapshot" style="display:none;width:100%;border-radius:12px;"/>
          </div>
          <div class="btn-row" style="margin-top:10px;gap:6px;flex-wrap:wrap;">
            <button class="btn" id="camera-start">📷 Activar cámara</button>
            <button class="btn primary" id="camera-capture" disabled>📸 Tomar foto</button>
            <button class="btn ghost" id="camera-retake" style="display:none;">↻ Repetir</button>
            <button class="btn ghost" id="camera-switch" disabled title="Cambiar entre cámara frontal/trasera">🔄</button>
          </div>
          <div class="small muted" style="margin-top:6px;">⚠️ Necesita permisos de cámara del navegador.</div>
        </div>`
            : `
        <div class="field">
          <label class="field-label">URL de la imagen</label>
          <input class="field-input" type="url" id="img-url" placeholder="https://..."/>
        </div>`
      }
    </div>
    <div class="field">
      <label class="field-label">Análisis a realizar</label>
      <div class="checkbox-group" id="analysis-opts">
        <label class="checkbox-label"><input type="checkbox" value="analisis" checked/> Análisis visual completo</label>
        <label class="checkbox-label"><input type="checkbox" value="caption" checked/> Caption para Instagram</label>
        <label class="checkbox-label"><input type="checkbox" value="altText" checked/> Alt text accesible</label>
        <label class="checkbox-label"><input type="checkbox" value="hashtags"/> Hashtags sugeridos</label>
      </div>
    </div>
    <div class="btn-row">
      <button class="btn primary" id="analyze-btn">🔍 Analizar</button>
    </div>
  </div>`;

const renderResult = () => {
  if (!state.result) {
    return `
      <div class="card" style="display:flex;align-items:center;justify-content:center;min-height:500px;flex-direction:column;gap:8px;">
        <div style="font-size:48px;opacity:0.3;">👁</div>
        <div class="muted">Subí una imagen para ver el análisis de Claude Vision acá.</div>
      </div>`;
  }
  const r = state.result;
  return `
    <div>
      ${
        state.imagePreview
          ? `
        <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden;">
          <img src="${state.imagePreview}" style="width:100%;max-height:320px;object-fit:cover;display:block;border-radius:12px;"/>
        </div>`
          : ''
      }

      ${
        r.analisis
          ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>🔍 Análisis visual</h3>
          <div class="body">${escape(r.analisis.descripcion ?? '')}</div>
          ${
            r.analisis.elementosDestacados?.length
              ? `
            <div class="divider"></div>
            <div class="small muted" style="margin-bottom:6px;">Elementos destacados</div>
            <div class="tag-row">${r.analisis.elementosDestacados.map((e) => `<span class="tag">${escape(e)}</span>`).join('')}</div>
          `
              : ''
          }
          ${
            r.analisis.paleta?.length
              ? `
            <div class="palette-row" style="margin-top:10px;display:flex;gap:6px;">
              ${r.analisis.paleta.map((c) => `<div class="color-swatch" style="background:${escape(c)};width:28px;height:28px;border-radius:6px;border:1px solid var(--border);" title="${escape(c)}"></div>`).join('')}
            </div>
          `
              : ''
          }
          ${
            r.analisis.puntuacionCalidad
              ? `
            <div class="divider"></div>
            <div class="gauge-row">
              <span class="small muted">Calidad estimada</span>
              <div class="gauge-bar"><div class="gauge-fill" style="width:${r.analisis.puntuacionCalidad}%;background:var(--ok);"></div></div>
              <span class="small">${r.analisis.puntuacionCalidad}/100</span>
            </div>
          `
              : ''
          }
        </div>`
          : ''
      }

      ${
        r.caption
          ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>📝 Caption</h3>
          <div class="body" style="white-space:pre-wrap;">${escape(r.caption.texto)}</div>
          ${
            r.caption.hashtags?.length
              ? `
            <div class="divider"></div>
            <div class="meta">${r.caption.hashtags.map((h) => `<span class="tag info">${escape(h)}</span>`).join('')}</div>
          `
              : ''
          }
          <div class="btn-row" style="margin-top:10px;">
            <button class="btn ghost tiny" id="copy-caption">📋 Copiar caption</button>
          </div>
        </div>`
          : ''
      }

      ${
        r.altText
          ? `
        <div class="card" style="margin-bottom:14px;">
          <h3>♿ Alt text</h3>
          <div class="body">${escape(r.altText)}</div>
          <div class="btn-row" style="margin-top:10px;">
            <button class="btn ghost tiny" id="copy-alt">📋 Copiar alt text</button>
          </div>
        </div>`
          : ''
      }

      ${
        r.hashtags?.length
          ? `
        <div class="card">
          <h3>#️⃣ Hashtags</h3>
          <div class="meta">${r.hashtags.map((h) => `<span class="tag info">${escape(h)}</span>`).join('')}</div>
        </div>`
          : ''
      }
    </div>`;
};

const wireUp = (root) => {
  const form = root.querySelector('.studio-form');
  const preview = root.querySelector('.studio-preview');
  let currentFile = null;

  const rebindTabs = () => {
    root.querySelectorAll('.tab-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        form.outerHTML; // force re-render
        root.querySelector('.studio-form').outerHTML;
        // Re-render left panel
        const leftCol = root.querySelector('.studio-layout > :first-child');
        leftCol.outerHTML = renderInputPanel();
        const newLeft = root.querySelector('.studio-layout > :first-child');
        wireUpForm(newLeft, preview);
      }),
    );
  };

  const wireUpForm = (formEl, previewEl) => {
    // Tab switching
    formEl.querySelectorAll('.tab-btn').forEach((btn) =>
      btn.addEventListener('click', () => {
        state.mode = btn.dataset.mode;
        const newForm = document.createElement('div');
        newForm.innerHTML = renderInputPanel();
        formEl.replaceWith(newForm.firstElementChild);
        wireUpForm(root.querySelector('.studio-form'), previewEl);
      }),
    );

    // Upload zone
    const zone = formEl.querySelector('#upload-zone');
    const fileInput = formEl.querySelector('#file-input');
    if (zone && fileInput) {
      zone.addEventListener('click', () => fileInput.click());
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file, formEl);
      });
      fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) handleFile(fileInput.files[0], formEl);
      });
    }

    // Cámara
    const video = formEl.querySelector('#camera-video');
    const canvas = formEl.querySelector('#camera-canvas');
    const snap = formEl.querySelector('#camera-snapshot');
    const placeholder = formEl.querySelector('#camera-placeholder');
    const startBtn = formEl.querySelector('#camera-start');
    const captureBtn = formEl.querySelector('#camera-capture');
    const retakeBtn = formEl.querySelector('#camera-retake');
    const switchBtn = formEl.querySelector('#camera-switch');
    let stream = null;
    let facing = 'environment'; // 'user' (frontal) | 'environment' (trasera)

    const stopStream = () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        stream = null;
      }
    };
    const openStream = async () => {
      try {
        stopStream();
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (video) {
          video.srcObject = stream;
          video.style.display = 'block';
          if (placeholder) placeholder.style.display = 'none';
          if (snap) snap.style.display = 'none';
          if (captureBtn) captureBtn.disabled = false;
          if (switchBtn) switchBtn.disabled = false;
          if (retakeBtn) retakeBtn.style.display = 'none';
        }
      } catch (err) {
        toast('No se pudo abrir la cámara: ' + (err.message ?? 'permiso denegado'), 'crit');
      }
    };

    startBtn?.addEventListener('click', () => {
      void openStream();
    });
    switchBtn?.addEventListener('click', () => {
      facing = facing === 'environment' ? 'user' : 'environment';
      void openStream();
    });
    captureBtn?.addEventListener('click', () => {
      if (!video || !canvas || !stream) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      // Si es cámara frontal, espejar
      if (facing === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      state.imagePreview = dataUrl;
      // Convertir a Blob para tener "file"-like
      canvas.toBlob(
        (blob) => {
          if (blob) currentFile = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
        },
        'image/jpeg',
        0.85,
      );
      // Mostrar snapshot, ocultar video
      if (snap) {
        snap.src = dataUrl;
        snap.style.display = 'block';
      }
      video.style.display = 'none';
      if (retakeBtn) retakeBtn.style.display = 'inline-block';
      if (captureBtn) captureBtn.disabled = true;
      toast('📸 Foto capturada · ahora seleccioná análisis y dale "Analizar"', 'ok');
    });
    retakeBtn?.addEventListener('click', () => {
      state.imagePreview = null;
      currentFile = null;
      if (snap) snap.style.display = 'none';
      if (video) video.style.display = 'block';
      if (captureBtn) captureBtn.disabled = false;
      if (retakeBtn) retakeBtn.style.display = 'none';
    });
    // Cleanup al cambiar de tab o destruir
    formEl.addEventListener('DOMNodeRemovedFromDocument', stopStream);
    window.addEventListener('hashchange', stopStream, { once: true });

    formEl.querySelector('#analyze-btn').addEventListener('click', () => runAnalysis(formEl, previewEl, currentFile));
  };

  const handleFile = (file, formEl) => {
    currentFile = file;
    const reader = new FileReader();
    reader.onload = (e) => {
      state.imagePreview = e.target.result;
      const wrap = formEl.querySelector('#image-preview-wrap');
      const img = formEl.querySelector('#image-preview-img');
      if (wrap && img) {
        img.src = e.target.result;
        wrap.style.display = 'block';
      }
    };
    reader.readAsDataURL(file);
  };

  const runAnalysis = async (formEl, previewEl, file) => {
    const checkedOpts = [...formEl.querySelectorAll('#analysis-opts input:checked')].map((c) => c.value);
    if (!checkedOpts.length) {
      toast('Seleccioná al menos un tipo de análisis', 'crit');
      return;
    }

    let imageData = null;
    if (state.mode === 'upload') {
      if (!file) {
        toast('Subí una imagen primero', 'crit');
        return;
      }
      imageData = state.imagePreview;
    } else if (state.mode === 'camera') {
      if (!state.imagePreview) {
        toast('Tomá una foto primero', 'crit');
        return;
      }
      imageData = state.imagePreview;
    } else {
      const url = formEl.querySelector('#img-url')?.value.trim();
      if (!url) {
        toast('Ingresá una URL de imagen', 'crit');
        return;
      }
      imageData = url;
      state.imagePreview = url;
    }

    const btn = formEl.querySelector('#analyze-btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> analizando…';
    try {
      const result = await api('/api/studio/vision', {
        body: {
          imageData,
          analisis: checkedOpts.includes('analisis'),
          caption: checkedOpts.includes('caption'),
          altText: checkedOpts.includes('altText'),
          hashtags: checkedOpts.includes('hashtags'),
        },
      });
      state.result = result;
      previewEl.innerHTML = renderResult();
      attachResultListeners(previewEl);
      toast('Análisis completado', 'ok');
    } catch (err) {
      toast(err.message, 'crit');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '🔍 Analizar';
    }
  };

  wireUpForm(form, preview);
};

const attachResultListeners = (preview) => {
  preview.querySelector('#copy-caption')?.addEventListener('click', () => {
    const text = state.result?.caption?.texto ?? '';
    navigator.clipboard.writeText(text).then(() => toast('Caption copiado', 'ok'));
  });
  preview.querySelector('#copy-alt')?.addEventListener('click', () => {
    const text = state.result?.altText ?? '';
    navigator.clipboard.writeText(text).then(() => toast('Alt text copiado', 'ok'));
  });
};

export const renderVision = async (root) => {
  state = { result: null, imagePreview: null, mode: 'upload' };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">Vision AI</h1>
        <p class="view-subtitle page-subtitle">Claude multimodal analiza imágenes y genera captions con la voz de tu marca.</p>
      </div>
    </header>
    <div class="page-body">
      <div class="studio-layout">
        ${renderInputPanel()}
        <div class="studio-preview">${renderResult()}</div>
      </div>
    </div>`;
  wireUp(root);
};
