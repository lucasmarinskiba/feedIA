/* ══════════════════════════════════════════════════════════════════════════════
   BRAND KIT — onboarding 1 vez. Logo + foto protagonista + 3 colores + tipografía.
   Guarda en accountMemory.profile.brandKit. Todos los demás módulos lo leen auto.
   ══════════════════════════════════════════════════════════════════════════════ */
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const getPlatform = async () => {
  try {
    const mod = await import('../lib/platform.js');
    return mod.getPlatform();
  } catch {
    return 'instagram';
  }
};

const filesToDataUrls = (fileList) =>
  Promise.all(
    [...(fileList || [])].slice(0, 5).map(
      (f) =>
        new Promise((resolve) => {
          const fr = new FileReader();
          fr.onload = () => resolve(fr.result);
          fr.onerror = () => resolve(null);
          fr.readAsDataURL(f);
        }),
    ),
  ).then((arr) => arr.filter(Boolean));

const shrinkImage = (dataUrl, maxSide = 1024, quality = 0.85) =>
  new Promise((resolve) => {
    if (!dataUrl?.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale),
        h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });

let cached = null;

export const loadBrandKit = async (accountId = '') => {
  try {
    const r = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', accountId }),
    });
    const j = await r.json();
    cached = j?.profile?.brandKit || null;
    return cached;
  } catch {
    return null;
  }
};

export const saveBrandKit = async (accountId, brandKit) => {
  const r = await fetch('/api/account/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'save', accountId, fields: { brandKit } }),
  });
  return r.json();
};

const renderShell = (kit = {}) => `
  <div class="bk-shell">
    <div class="bk-hero">
      <div class="bk-emoji">🎨</div>
      <div>
        <h1 class="bk-title">Tu Brand Kit</h1>
        <p class="bk-sub">Definí 1 sola vez: colores, tipografía, foto protagonista, elementos visuales. Todas las herramientas (Manos Libres, Piloto, Carruseles, Reels, Historias) lo leen automáticamente.</p>
      </div>
    </div>

    <div class="bk-grid">
      <div class="bk-card">
        <div class="bk-card-label">👤 Cuenta principal</div>
        <input id="bk-handle" type="text" class="bk-input" placeholder="@tucuenta" value="${escape(kit.handle || '')}" />
        <input id="bk-niche" type="text" class="bk-input" placeholder="Nicho (ej: marketing digital, fitness, finanzas)" value="${escape(kit.niche || '')}" />
        <select id="bk-brandtype" class="bk-input">
          <option value="personal" ${kit.brandType === 'personal' ? 'selected' : ''}>Marca personal</option>
          <option value="business" ${kit.brandType === 'business' ? 'selected' : ''}>Marca empresarial</option>
        </select>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🎨 Paleta de marca (3 colores)</div>
        <div class="bk-color-row">
          <div class="bk-color-cell"><span>Texto</span><input id="bk-c-text" type="color" value="${kit.textColor || '#FFFFFF'}" /><input id="bk-c-text-h" type="text" class="bk-input bk-input-sm" value="${kit.textColor || '#FFFFFF'}" /></div>
          <div class="bk-color-cell"><span>Fondo</span><input id="bk-c-bg" type="color" value="${kit.bgColor || '#0B0B0F'}" /><input id="bk-c-bg-h" type="text" class="bk-input bk-input-sm" value="${kit.bgColor || '#0B0B0F'}" /></div>
          <div class="bk-color-cell"><span>Acento</span><input id="bk-c-accent" type="color" value="${kit.accentColor || '#10F2B0'}" /><input id="bk-c-accent-h" type="text" class="bk-input bk-input-sm" value="${kit.accentColor || '#10F2B0'}" /></div>
        </div>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">✍️ Tipografía</div>
        <select id="bk-font" class="bk-input">
          <option value="serif-editorial" ${kit.font === 'serif-editorial' || !kit.font ? 'selected' : ''}>Serif Editorial (Georgia/Playfair) — elegante</option>
          <option value="sans-modern" ${kit.font === 'sans-modern' ? 'selected' : ''}>Sans Moderno (Inter/Helvetica) — limpio</option>
          <option value="serif-luxury" ${kit.font === 'serif-luxury' ? 'selected' : ''}>Serif Luxury (Cormorant) — premium</option>
          <option value="sans-bold" ${kit.font === 'sans-bold' ? 'selected' : ''}>Sans Bold (Inter Black) — impacto</option>
          <option value="mono-numbers" ${kit.font === 'mono-numbers' ? 'selected' : ''}>Mono (SF Mono) — data</option>
        </select>
        <select id="bk-mood" class="bk-input">
          <option value="premium" ${kit.mood === 'premium' || !kit.mood ? 'selected' : ''}>Mood: Premium (oscuro elegante)</option>
          <option value="editorial" ${kit.mood === 'editorial' ? 'selected' : ''}>Mood: Editorial (revista)</option>
          <option value="minimalista" ${kit.mood === 'minimalista' ? 'selected' : ''}>Mood: Minimalista</option>
          <option value="brutal" ${kit.mood === 'brutal' ? 'selected' : ''}>Mood: Brutal (amarillo fuerte)</option>
          <option value="luxury" ${kit.mood === 'luxury' ? 'selected' : ''}>Mood: Luxury (dorado)</option>
          <option value="monochrome" ${kit.mood === 'monochrome' ? 'selected' : ''}>Mood: Monocromo</option>
          <option value="techno" ${kit.mood === 'techno' ? 'selected' : ''}>Mood: Techno (neón)</option>
          <option value="organico" ${kit.mood === 'organico' ? 'selected' : ''}>Mood: Orgánico</option>
        </select>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">📷 Foto protagonista (vos / producto)</div>
        ${kit.photo ? `<img src="${escape(kit.photo)}" alt="foto" class="bk-photo-preview" />` : '<div class="bk-photo-empty">Arrastra una foto aquí<br><span style="font-size:11px;font-style:italic;">o haz clic para seleccionar</span></div>'}
        <input id="bk-photo" type="file" class="bk-file" accept="image/*" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🏷️ Logo de marca</div>
        ${kit.logo ? `<img src="${escape(kit.logo)}" alt="logo" class="bk-photo-preview" style="max-height:80px;background:#fff;padding:10px;" />` : '<div class="bk-photo-empty">Arrastra logo aquí<br><span style="font-size:11px;font-style:italic;">o haz clic para seleccionar</span></div>'}
        <input id="bk-logo" type="file" class="bk-file" accept="image/*" />
      </div>

      <div class="bk-card bk-full">
        <div class="bk-card-label">✨ Elementos visuales de tu nicho</div>
        <input id="bk-elements" type="text" class="bk-input" placeholder="ej: laptop, gráficos, dashboards, plantas, mockups" value="${escape((kit.elements || []).join(', '))}" />
        <div class="bk-card-label" style="margin-top:10px;">🗣️ Frase / claim de marca (opcional)</div>
        <input id="bk-tagline" type="text" class="bk-input" placeholder="ej: Sistemas que escalan tu marca personal" value="${escape(kit.tagline || '')}" />
      </div>
    </div>

    <div class="bk-actions">
      <button id="bk-save" class="bk-btn bk-btn-primary">💾 Guardar Brand Kit</button>
      <span id="bk-status" class="bk-status"></span>
    </div>

    <div class="bk-info">
      <strong>📌 Esto se lee automáticamente desde:</strong> Manos Libres · Piloto automático · Brújula · Carrusel Builder · Brand Studio · Gstack. No tenés que volver a cargarlo en ningún lado.
    </div>
  </div>

  <style>
    .bk-shell{max-width:100%;margin:0;padding:0 8px;}
    #view{padding:0!important;}
    .bk-hero{display:flex;gap:8px;align-items:center;margin-bottom:6px;padding:6px 8px;border-radius:6px;background:transparent;}
    .bk-emoji{font-size:36px;}
    .bk-title{margin:0;font-size:20px;font-weight:900;color:var(--text-primary,var(--fg));}
    .bk-sub{margin:3px 0 0;font-size:12px;color:var(--text-secondary,var(--fg-2));}
    .bk-grid{display:grid;grid-template-columns:repeat(3, 1fr);gap:12px;}
    @media(max-width:1000px){.bk-grid{grid-template-columns:1fr 1fr;}}
    @media(max-width:640px){.bk-grid{grid-template-columns:1fr;}}
    .bk-card{padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--card,rgba(255,255,255,.02));display:flex;flex-direction:column;gap:8px;}
    .bk-full{grid-column:1/-1;}
    .bk-card-label{font-size:12px;font-weight:700;color:var(--text-secondary,var(--fg-2));letter-spacing:0.5px;}
    .bk-input{background:var(--bg,#0a0a0a);color:var(--text-primary,var(--fg));border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-size:13.5px;font-family:inherit;}
    .bk-input:focus{outline:none;border-color:var(--accent,#10F2B0);box-shadow:0 0 0 2px rgba(16,242,176,.1);}
    .bk-input-sm{padding:6px 10px;font-size:12px;}
    .bk-color-row{display:flex;flex-direction:column;gap:10px;}
    .bk-color-cell{display:flex;align-items:center;gap:12px;}
    .bk-color-cell span{font-size:12px;font-weight:600;width:50px;color:var(--text-secondary,var(--fg-2));}
    .bk-color-cell input[type=color]{width:56px;height:56px;padding:2px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;}
    .bk-color-cell .bk-input-sm{flex:1;}
    .bk-photo-preview{max-width:100%;max-height:180px;border-radius:10px;border:1px solid var(--border);object-fit:cover;}
    .bk-photo-empty{font-size:13px;color:var(--text-tertiary,var(--fg-3));padding:32px 16px;text-align:center;border:2px dashed var(--border);border-radius:10px;background:rgba(16,242,176,.03);display:flex;align-items:center;justify-content:center;min-height:120px;flex-direction:column;gap:8px;}
    .bk-photo-empty::before{content:'📤';font-size:28px;}
    .bk-file{font-size:12px;color:var(--text-secondary,var(--fg-2));}
    .bk-actions{display:flex;justify-content:flex-end;align-items:center;gap:12px;margin-top:16px;}
    .bk-btn{padding:10px 22px;border:none;border-radius:10px;font-weight:800;font-size:13.5px;cursor:pointer;font-family:inherit;}
    .bk-btn-primary{background:linear-gradient(135deg,#10F2B0,#3B82F6);color:#0A0A0F;}
    .bk-status{font-size:12px;color:var(--text-tertiary,var(--fg-3));}
    .bk-info{margin-top:16px;padding:12px;border-radius:10px;background:rgba(16,242,176,.06);border:1px solid rgba(16,242,176,.2);font-size:12px;color:var(--text-secondary,var(--fg-2));}
  </style>`;

export const renderBrandKit = async (container) => {
  // Cargar profile actual para pre-llenar
  const accountId = (() => {
    try {
      return JSON.parse(localStorage.getItem('feedia.brujula.account') || '{}').handle || '';
    } catch {
      return '';
    }
  })();
  let kit = {};
  try {
    const r = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'get', accountId }),
    });
    const j = await r.json();
    kit = j?.profile?.brandKit || j?.profile || {};
  } catch {}

  container.innerHTML = renderShell(kit);

  // Sync color picker ↔ hex input
  ['text', 'bg', 'accent'].forEach((k) => {
    const picker = container.querySelector(`#bk-c-${k}`);
    const hex = container.querySelector(`#bk-c-${k}-h`);
    if (picker && hex) {
      picker.addEventListener('input', () => {
        hex.value = picker.value.toUpperCase();
      });
      hex.addEventListener('input', () => {
        if (/^#[0-9A-Fa-f]{6}$/.test(hex.value)) picker.value = hex.value;
      });
    }
  });

  container.querySelector('#bk-save')?.addEventListener('click', async (e) => {
    const status = container.querySelector('#bk-status');
    status.textContent = '⏳ Guardando…';
    e.target.disabled = true;
    try {
      const handle = (container.querySelector('#bk-handle')?.value || '').trim();
      // Cache cuenta principal en localStorage para que todas las vistas la lean
      try {
        localStorage.setItem('feedia.brujula.account', JSON.stringify({ handle }));
      } catch {}

      const photoFile = container.querySelector('#bk-photo')?.files?.[0];
      const logoFile = container.querySelector('#bk-logo')?.files?.[0];
      let photo = kit.photo,
        logo = kit.logo;
      if (photoFile) {
        const arr = await filesToDataUrls([photoFile]);
        if (arr[0]) photo = await shrinkImage(arr[0]);
      }
      if (logoFile) {
        const arr = await filesToDataUrls([logoFile]);
        if (arr[0]) logo = await shrinkImage(arr[0], 512, 0.92);
      }

      const newKit = {
        handle,
        niche: (container.querySelector('#bk-niche')?.value || '').trim(),
        brandType: container.querySelector('#bk-brandtype')?.value || 'personal',
        textColor: container.querySelector('#bk-c-text-h')?.value || '#FFFFFF',
        bgColor: container.querySelector('#bk-c-bg-h')?.value || '#0B0B0F',
        accentColor: container.querySelector('#bk-c-accent-h')?.value || '#10F2B0',
        colors: [
          container.querySelector('#bk-c-bg-h')?.value || '',
          container.querySelector('#bk-c-accent-h')?.value || '',
        ].filter(Boolean),
        font: container.querySelector('#bk-font')?.value || 'serif-editorial',
        mood: container.querySelector('#bk-mood')?.value || 'premium',
        elements: (container.querySelector('#bk-elements')?.value || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        tagline: (container.querySelector('#bk-tagline')?.value || '').trim(),
        photo,
        logo,
        updatedAt: new Date().toISOString(),
      };

      const j = await saveBrandKit(handle, newKit);
      if (j?.profile) {
        cached = newKit;
        status.textContent = '✅ Guardado. Ya disponible en todas las herramientas.';
        toast('💾 Brand Kit guardado', 'ok');
      } else {
        status.textContent = '⚠️ Guardado parcial.';
      }
    } catch (err) {
      status.textContent = `❌ Error: ${err?.message || 'sin respuesta'}`;
    } finally {
      e.target.disabled = false;
    }
  });
};
