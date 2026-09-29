/* ══════════════════════════════════════════════════════════════════════════════
   BRAND KIT — onboarding 1 vez. Identidad completa: cuenta + categoría, paleta,
   tipografía, foto protagonista, logo, voz, audiencia, objetivo, personalidad,
   competencia, elementos visuales, estilo visual avanzado.
   Guarda en accountMemory.profile.brandKit. Todos los demás módulos lo leen auto.
   ══════════════════════════════════════════════════════════════════════════════ */
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

/**
 * Otros componentes (home.js, handsfree.js) llaman a /api/account/profile
 * al mismo tiempo que esta vista al cargar la página — un 429 pasajero de
 * ese choque no debe vaciar el formulario y borrar lo que el usuario ya
 * guardó. Un reintento corto alcanza (la marca es 1 sola, no cambia entre
 * llamadas).
 */
const fetchProfileWithRetry = async (payload, retries = 2) => {
  for (let attempt = 0; ; attempt++) {
    const r = await fetch('/api/account/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (r.ok || attempt >= retries) return r;
    await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
  }
};

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

// Listas → texto separado por comas (y viceversa), consistente en todo el form.
const toTags = (v) =>
  (v || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
const fromTags = (arr) => (arr || []).join(', ');
const toLines = (v) =>
  (v || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
const fromLines = (arr) => (arr || []).join('\n');

let cached = null;

export const loadBrandKit = async (accountId = '') => {
  try {
    const r = await fetchProfileWithRetry({ action: 'get', accountId });
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

// Categoría de cuenta (BrandProfile.accountCategory — src/config/types.ts ACCOUNT_CATEGORIES).
const ACCOUNT_CATEGORIES = [
  ['', '— sin definir —'],
  ['marca-personal', 'Marca personal'],
  ['empresa', 'Empresa'],
  ['agencia', 'Agencia'],
  ['creador-de-contenido', 'Creador de contenido'],
  ['profesional-independiente', 'Profesional independiente'],
  ['comercio-local', 'Comercio local'],
  ['influencer', 'Influencer'],
  ['educador', 'Educador'],
  ['artista', 'Artista'],
  ['servicio-hogar', 'Servicio para el hogar'],
  ['salud-bienestar', 'Salud y bienestar'],
  ['gastronomia', 'Gastronomía'],
  ['moda-belleza', 'Moda y belleza'],
  ['inmobiliaria', 'Inmobiliaria'],
  ['tecnologia', 'Tecnología'],
  ['deporte-fitness', 'Deporte y fitness'],
  ['viajes-turismo', 'Viajes y turismo'],
  ['finanzas', 'Finanzas'],
  ['entretenimiento', 'Entretenimiento'],
  ['ong-causa-social', 'ONG / causa social'],
];

// Rubro (BrandProfile.industryCategory — src/config/types.ts INDUSTRY_CATEGORIES).
const INDUSTRY_CATEGORIES = [
  ['', '— sin definir —'],
  ['modelaje-agencia', 'Modelaje / agencia'],
  ['kiosco-minimercado', 'Kiosco / minimercado'],
  ['agencia-contenido', 'Agencia de contenido'],
  ['ingenieria', 'Ingeniería'],
  ['inteligencia-artificial', 'Inteligencia artificial'],
  ['marca-personal-general', 'Marca personal (general)'],
  ['influencer-lifestyle', 'Influencer lifestyle'],
  ['youtuber-video', 'YouTuber / video'],
  ['cursos-educacion', 'Cursos / educación'],
  ['plomeria-gas-electricidad', 'Plomería / gas / electricidad'],
  ['gastronomia-cocina', 'Gastronomía / cocina'],
  ['fitness-entrenamiento', 'Fitness / entrenamiento'],
  ['fotografia', 'Fotografía'],
  ['musica', 'Música'],
  ['moda-ropa', 'Moda / ropa'],
  ['belleza-estetica', 'Belleza / estética'],
  ['psicologia-coaching', 'Psicología / coaching'],
  ['arquitectura-diseno', 'Arquitectura / diseño'],
  ['legal-abogacia', 'Legal / abogacía'],
  ['salud-medicina', 'Salud / medicina'],
  ['inmobiliaria-propiedades', 'Inmobiliaria / propiedades'],
  ['finanzas-inversion', 'Finanzas / inversión'],
  ['viajes-turismo', 'Viajes / turismo'],
  ['mascotas-veterinaria', 'Mascotas / veterinaria'],
  ['ninos-familia', 'Niños / familia'],
  ['deportes', 'Deportes'],
  ['arte-ilustracion', 'Arte / ilustración'],
  ['podcast', 'Podcast'],
  ['politica-social', 'Política / social'],
  ['ong-voluntariado', 'ONG / voluntariado'],
];

// Tipografía corporativa: mismos 10 pairings reales de Phase 25 (src/capabilities/branding/typographySystem.ts).
const FONT_PAIRINGS = [
  ['tech', 'Tech — Outfit / DM Sans', 'moderno, limpio, profesional'],
  ['finance', 'Finanzas — Space Grotesk / DM Sans', 'audaz, confiable, moderno'],
  ['wellness', 'Wellness — Manrope / Fraunces', 'calmo, cálido, en paz'],
  ['luxury', 'Luxury — Playfair Display / DM Sans', 'elegante, premium, sofisticado'],
  ['education', 'Educación — Work Sans', 'educativo, claro, accesible'],
  ['coaching', 'Coaching — Fraunces / Manrope', 'emocional, cálido, reflexivo'],
  ['playful', 'Playful — Plus Jakarta / Manrope', 'amigable, cercano, creativo'],
  ['minimal', 'Minimal — League Spartan / DM Sans', 'limpio, moderno, geométrico'],
  ['bold', 'Bold — Gulfs Display / DM Sans', 'poderoso, confiado, impactante'],
  ['vintage', 'Vintage — Offlander / Proxima Nova', 'nostálgico, elegante, atemporal'],
];

// Paletas predefinidas (CLAUDE.md § Pinterest Design Patterns) — punto de partida de 1 click.
const PALETTE_PRESETS = {
  'warm-organic': {
    label: '🌿 Cálido orgánico',
    bg: '#F5EEE0',
    accent: '#C65911',
    text: '#2B2013',
    sec1: '#6B8E71',
    sec2: '#D4AF37',
  },
  'bold-playful': {
    label: '🎉 Audaz y lúdico',
    bg: '#FFF8DC',
    accent: '#E91E8C',
    text: '#4B0082',
    sec1: '#00D9FF',
    sec2: '#7FFF00',
  },
  'dark-premium': {
    label: '⚫ Oscuro premium',
    bg: '#1A1A1A',
    accent: '#E6D5B8',
    text: '#FFFFFF',
    sec1: '#36454F',
    sec2: '#001F3F',
  },
  'clean-editorial': {
    label: '📰 Limpio editorial',
    bg: '#FFFFFF',
    accent: '#001F3F',
    text: '#000000',
    sec1: '#E8E8E8',
    sec2: '#001F3F',
  },
};

// 12 arquetipos de marca (Mark & Pearson) — personalidad consistente en todo el copy.
const ARCHETYPES = [
  ['', '— sin definir —'],
  ['heroe', 'Héroe — supera desafíos, inspira'],
  ['fuera_de_la_ley', 'Forajido — rompe reglas, libertad'],
  ['mago', 'Mago — transforma lo imposible'],
  ['todos', 'Persona Común — cercanía, pertenencia'],
  ['amante', 'Amante — pasión, conexión'],
  ['bufon', 'Bufón — diversión, humor'],
  ['cuidador', 'Cuidador — protección, servicio'],
  ['creador', 'Creador — innovación, visión'],
  ['gobernante', 'Gobernante — control, liderazgo'],
  ['inocente', 'Inocente — optimismo, simpleza'],
  ['explorador', 'Explorador — aventura, descubrimiento'],
  ['sabio', 'Sabio — conocimiento, expertise'],
];

const opts = (list, selected) =>
  list
    .map(([v, l]) => `<option value="${escape(v)}" ${v === (selected || '') ? 'selected' : ''}>${escape(l)}</option>`)
    .join('');

const renderShell = (kit = {}) => `
  <div class="bk-shell">
    <div class="bk-hero">
      <div class="bk-emoji">🎨</div>
      <div>
        <h1 class="bk-title">Tu Brand Kit</h1>
        <p class="bk-sub">Definí 1 sola vez toda tu identidad de marca. Todas las herramientas (Manos Libres, Piloto, Carruseles, Reels, Historias) lo leen automáticamente.</p>
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
        <select id="bk-account-category" class="bk-input">${opts(ACCOUNT_CATEGORIES, kit.accountCategory)}</select>
        <select id="bk-industry-category" class="bk-input">${opts(INDUSTRY_CATEGORIES, kit.industryCategory)}</select>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🎨 Paleta de marca</div>
        <div class="bk-preset-row">
          ${Object.entries(PALETTE_PRESETS)
            .map(
              ([id, p]) =>
                `<button type="button" class="bk-preset-btn" data-preset="${id}" title="${escape(p.label)}"><span class="bk-preset-swatch" style="background:${p.bg};box-shadow: 14px 0 0 -4px ${p.accent}, 26px 0 0 -4px ${p.sec1};"></span>${escape(p.label)}</button>`,
            )
            .join('')}
        </div>
        <div class="bk-color-row">
          <div class="bk-color-cell"><span>Texto</span><input id="bk-c-text" type="color" value="${kit.textColor || '#FFFFFF'}" /><input id="bk-c-text-h" type="text" class="bk-input bk-input-sm" value="${kit.textColor || '#FFFFFF'}" /></div>
          <div class="bk-color-cell"><span>Fondo</span><input id="bk-c-bg" type="color" value="${kit.bgColor || '#0B0B0F'}" /><input id="bk-c-bg-h" type="text" class="bk-input bk-input-sm" value="${kit.bgColor || '#0B0B0F'}" /></div>
          <div class="bk-color-cell"><span>Acento</span><input id="bk-c-accent" type="color" value="${kit.accentColor || '#10F2B0'}" /><input id="bk-c-accent-h" type="text" class="bk-input bk-input-sm" value="${kit.accentColor || '#10F2B0'}" /></div>
          <div class="bk-color-cell"><span>Sec. 1</span><input id="bk-c-sec1" type="color" value="${kit.secondaryColor1 || '#888888'}" /><input id="bk-c-sec1-h" type="text" class="bk-input bk-input-sm" value="${kit.secondaryColor1 || ''}" placeholder="opcional" /></div>
          <div class="bk-color-cell"><span>Sec. 2</span><input id="bk-c-sec2" type="color" value="${kit.secondaryColor2 || '#888888'}" /><input id="bk-c-sec2-h" type="text" class="bk-input bk-input-sm" value="${kit.secondaryColor2 || ''}" placeholder="opcional" /></div>
        </div>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">✍️ Tipografía corporativa</div>
        <select id="bk-font" class="bk-input">${FONT_PAIRINGS.map(
          ([v, l, mood]) =>
            `<option value="${v}" ${(kit.font || 'tech') === v ? 'selected' : ''}>${escape(l)} — ${escape(mood)}</option>`,
        ).join('')}</select>
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
        <input id="bk-elements" type="text" class="bk-input" placeholder="ej: laptop, gráficos, dashboards, plantas, mockups" value="${escape(fromTags(kit.elements))}" />
        <div class="bk-card-label" style="margin-top:10px;">🗣️ Frase / claim de marca (opcional)</div>
        <input id="bk-tagline" type="text" class="bk-input" placeholder="ej: Sistemas que escalan tu marca personal" value="${escape(kit.tagline || '')}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🎙️ Voz de marca</div>
        <input id="bk-voice-tone" type="text" class="bk-input" placeholder="Tono (ej: directo, cálido, técnico)" value="${escape(fromTags(kit.voiceTone))}" />
        <input id="bk-voice-forbidden" type="text" class="bk-input" placeholder="Palabras/frases prohibidas" value="${escape(fromTags(kit.voiceForbidden))}" />
        <textarea id="bk-reference-quotes" class="bk-input bk-textarea" placeholder="Frases de referencia (1 por línea)" rows="3">${escape(fromLines(kit.referenceQuotes))}</textarea>
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🎯 Audiencia</div>
        <textarea id="bk-audience-desc" class="bk-input bk-textarea" placeholder="Descripción de tu audiencia ideal" rows="2">${escape(kit.audienceDescription || '')}</textarea>
        <input id="bk-audience-pains" type="text" class="bk-input" placeholder="Dolores (separados por coma)" value="${escape(fromTags(kit.audiencePains))}" />
        <input id="bk-audience-desires" type="text" class="bk-input" placeholder="Deseos (separados por coma)" value="${escape(fromTags(kit.audienceDesires))}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">📈 Objetivo</div>
        <select id="bk-goal-primary" class="bk-input">
          <option value="awareness" ${kit.goalPrimary === 'awareness' ? 'selected' : ''}>Awareness (alcance)</option>
          <option value="engagement" ${kit.goalPrimary === 'engagement' || !kit.goalPrimary ? 'selected' : ''}>Engagement (interacción)</option>
          <option value="leads" ${kit.goalPrimary === 'leads' ? 'selected' : ''}>Leads (contactos)</option>
          <option value="ventas" ${kit.goalPrimary === 'ventas' ? 'selected' : ''}>Ventas</option>
          <option value="autoridad" ${kit.goalPrimary === 'autoridad' ? 'selected' : ''}>Autoridad (marca personal)</option>
        </select>
        <input id="bk-goal-metrics" type="text" class="bk-input" placeholder="Métricas a vigilar (ej: guardados, DMs)" value="${escape(fromTags(kit.goalMetrics))}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🧬 Personalidad de marca</div>
        <select id="bk-archetype" class="bk-input">${opts(ARCHETYPES, kit.archetype)}</select>
        <input id="bk-personality" type="text" class="bk-input" placeholder="Rasgos (ej: directo, cercano, audaz)" value="${escape(fromTags(kit.personality))}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🏁 Competencia</div>
        <input id="bk-competitors" type="text" class="bk-input" placeholder="@competidor1, @competidor2 (para diferenciarte)" value="${escape(fromTags(kit.competitors))}" />
      </div>

      <div class="bk-card bk-full">
        <div class="bk-card-label">⚙️ Estilo visual avanzado</div>
        <div class="bk-adv-grid">
          <select id="bk-photo-style" class="bk-input">
            <option value="natural" ${kit.photographyStyle === 'natural' || !kit.photographyStyle ? 'selected' : ''}>Fotografía: Natural</option>
            <option value="staged" ${kit.photographyStyle === 'staged' ? 'selected' : ''}>Fotografía: Producida / staged</option>
            <option value="product-macro" ${kit.photographyStyle === 'product-macro' ? 'selected' : ''}>Fotografía: Producto macro</option>
            <option value="lifestyle" ${kit.photographyStyle === 'lifestyle' ? 'selected' : ''}>Fotografía: Lifestyle</option>
            <option value="editorial" ${kit.photographyStyle === 'editorial' ? 'selected' : ''}>Fotografía: Editorial</option>
          </select>
          <select id="bk-density" class="bk-input">
            <option value="low" ${kit.density === 'low' ? 'selected' : ''}>Densidad: Baja (mucho espacio)</option>
            <option value="medium" ${kit.density === 'medium' || !kit.density ? 'selected' : ''}>Densidad: Media</option>
            <option value="high" ${kit.density === 'high' ? 'selected' : ''}>Densidad: Alta</option>
          </select>
          <select id="bk-image-text-ratio" class="bk-input">
            <option value="image-heavy" ${kit.imageTextRatio === 'image-heavy' ? 'selected' : ''}>Ratio: Imagen-heavy</option>
            <option value="balanced" ${kit.imageTextRatio === 'balanced' || !kit.imageTextRatio ? 'selected' : ''}>Ratio: Balanceado</option>
            <option value="text-heavy" ${kit.imageTextRatio === 'text-heavy' ? 'selected' : ''}>Ratio: Texto-heavy</option>
          </select>
          <select id="bk-image-source" class="bk-input">
            <option value="ai-generated" ${kit.imageSource === 'ai-generated' || !kit.imageSource ? 'selected' : ''}>Imágenes: Generadas con IA</option>
            <option value="stock-internet" ${kit.imageSource === 'stock-internet' ? 'selected' : ''}>Imágenes: Stock / internet</option>
            <option value="hero-photo-first" ${kit.imageSource === 'hero-photo-first' ? 'selected' : ''}>Imágenes: Priorizar foto protagonista</option>
          </select>
        </div>
        <input id="bk-icons-allowed" type="text" class="bk-input" placeholder="Iconografía permitida (ej: line-icons, minimal)" value="${escape(fromTags(kit.allowedIconography))}" />
        <input id="bk-icons-forbidden" type="text" class="bk-input" placeholder="Iconografía / temas prohibidos" value="${escape(fromTags(kit.forbiddenIconography))}" />
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
    .bk-shell{width:100vw;margin:0 calc(-50vw + 50%);padding:0 8px;}
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
    .bk-textarea{resize:vertical;font-family:inherit;line-height:1.4;}
    .bk-color-row{display:flex;flex-direction:column;gap:10px;}
    .bk-color-cell{display:flex;align-items:center;gap:12px;}
    .bk-color-cell span{font-size:12px;font-weight:600;width:50px;color:var(--text-secondary,var(--fg-2));}
    .bk-color-cell input[type=color]{width:56px;height:56px;padding:2px;border-radius:8px;border:1px solid var(--border);background:none;cursor:pointer;}
    .bk-color-cell .bk-input-sm{flex:1;}
    .bk-preset-row{display:flex;flex-wrap:wrap;gap:6px;}
    .bk-preset-btn{display:flex;align-items:center;gap:8px;padding:6px 10px 6px 6px;border:1px solid var(--border);border-radius:20px;background:transparent;color:var(--text-secondary,var(--fg-2));font-size:11px;font-family:inherit;cursor:pointer;}
    .bk-preset-btn:hover{border-color:var(--accent,#10F2B0);color:var(--text-primary,var(--fg));}
    .bk-preset-swatch{width:16px;height:16px;border-radius:50%;display:inline-block;border:1px solid rgba(255,255,255,.15);}
    .bk-adv-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;}
    @media(max-width:640px){.bk-adv-grid{grid-template-columns:1fr;}}
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
  const kit = (await loadBrandKit(accountId)) || {};

  container.innerHTML = renderShell(kit);

  // Sync color picker ↔ hex input
  ['text', 'bg', 'accent', 'sec1', 'sec2'].forEach((k) => {
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

  // Paletas predefinidas: 1 click llena los 5 swatches (sigue editable después)
  container.querySelectorAll('.bk-preset-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const preset = PALETTE_PRESETS[btn.dataset.preset];
      if (!preset) return;
      const apply = (key, value) => {
        const picker = container.querySelector(`#bk-c-${key}`);
        const hex = container.querySelector(`#bk-c-${key}-h`);
        if (picker) picker.value = value;
        if (hex) hex.value = value.toUpperCase();
      };
      apply('bg', preset.bg);
      apply('accent', preset.accent);
      apply('text', preset.text);
      apply('sec1', preset.sec1);
      apply('sec2', preset.sec2);
      toast(`🎨 Paleta "${preset.label}" aplicada`, 'ok');
    });
  });

  container.querySelector('#bk-save')?.addEventListener('click', async (e) => {
    const status = container.querySelector('#bk-status');
    status.textContent = '⏳ Guardando…';
    e.target.disabled = true;
    try {
      const val = (id) => (container.querySelector(id)?.value || '').trim();
      const handle = val('#bk-handle');
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
        niche: val('#bk-niche'),
        brandType: val('#bk-brandtype') || 'personal',
        accountCategory: val('#bk-account-category'),
        industryCategory: val('#bk-industry-category'),
        textColor: val('#bk-c-text-h') || '#FFFFFF',
        bgColor: val('#bk-c-bg-h') || '#0B0B0F',
        accentColor: val('#bk-c-accent-h') || '#10F2B0',
        secondaryColor1: val('#bk-c-sec1-h'),
        secondaryColor2: val('#bk-c-sec2-h'),
        font: val('#bk-font') || 'tech',
        mood: val('#bk-mood') || 'premium',
        elements: toTags(val('#bk-elements')),
        tagline: val('#bk-tagline'),
        photo,
        logo,
        voiceTone: toTags(val('#bk-voice-tone')),
        voiceForbidden: toTags(val('#bk-voice-forbidden')),
        referenceQuotes: toLines(container.querySelector('#bk-reference-quotes')?.value || ''),
        audienceDescription: container.querySelector('#bk-audience-desc')?.value.trim() || '',
        audiencePains: toTags(val('#bk-audience-pains')),
        audienceDesires: toTags(val('#bk-audience-desires')),
        goalPrimary: val('#bk-goal-primary') || 'engagement',
        goalMetrics: toTags(val('#bk-goal-metrics')),
        archetype: val('#bk-archetype'),
        personality: toTags(val('#bk-personality')),
        competitors: toTags(val('#bk-competitors')),
        photographyStyle: val('#bk-photo-style') || 'natural',
        density: val('#bk-density') || 'medium',
        imageTextRatio: val('#bk-image-text-ratio') || 'balanced',
        imageSource: val('#bk-image-source') || 'ai-generated',
        allowedIconography: toTags(val('#bk-icons-allowed')),
        forbiddenIconography: toTags(val('#bk-icons-forbidden')),
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
