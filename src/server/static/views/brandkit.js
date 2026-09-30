/* ══════════════════════════════════════════════════════════════════════════════
   BRAND KIT — onboarding 1 vez. Identidad completa: cuenta + categoría, paleta,
   tipografía, foto protagonista, logo, voz, audiencia, objetivo, personalidad,
   competencia, elementos visuales, estilo visual avanzado.
   Guarda en accountMemory.profile.brandKit. Todos los demás módulos lo leen auto.
   ══════════════════════════════════════════════════════════════════════════════ */
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { apiSafe } from '../lib/api.js';

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
// [id, etiqueta, mood, fuente de preview] — la fuente de preview es la que hay
// como @font-face más abajo (headline de la pairing, o body si el headline es
// una fuente premium que no se puede embeber libremente — ver nota junto a
// FONT_FACES). '' = sin preview disponible, se ve con la fuente por defecto.
const FONT_PAIRINGS = [
  ['tech', 'Tech — Outfit / DM Sans', 'moderno, limpio, profesional', 'Outfit'],
  ['finance', 'Finanzas — Space Grotesk / DM Sans', 'audaz, confiable, moderno', 'Space Grotesk'],
  ['wellness', 'Wellness — Manrope / Fraunces', 'calmo, cálido, en paz', 'Manrope'],
  ['luxury', 'Luxury — Playfair Display / DM Sans', 'elegante, premium, sofisticado', 'Playfair Display'],
  ['education', 'Educación — Work Sans', 'educativo, claro, accesible', 'Work Sans'],
  ['coaching', 'Coaching — Fraunces / Manrope', 'emocional, cálido, reflexivo', 'Fraunces'],
  ['playful', 'Playful — Plus Jakarta / Manrope', 'amigable, cercano, creativo', 'Plus Jakarta Sans'],
  ['minimal', 'Minimal — League Spartan / DM Sans', 'limpio, moderno, geométrico', 'League Spartan'],
  ['bold', 'Bold — Gulfs Display / DM Sans', 'poderoso, confiado, impactante', 'DM Sans'],
  ['vintage', 'Vintage — Offlander / Proxima Nova', 'nostálgico, elegante, atemporal', ''],
  ['developer', 'Developer — Motor / Roboto Mono', 'técnico, preciso, código', 'Roboto Mono'],
  ['streetwear', 'Streetwear — Bernoru Condensed / Work Sans', 'audaz, urbano, compacto', 'Work Sans'],
  ['artisanal', 'Artesanal — Hertical Rough / Manrope', 'hecho a mano, auténtico', 'Manrope'],
  ['statement', 'Statement — Rumble Brave / DM Sans', 'confiado, expresivo, audaz', 'DM Sans'],
  ['compact', 'Compacto — Cubao Narrow / Roboto Mono', 'eficiente, denso, técnico', 'Roboto Mono'],
];

// Fuentes reales autohospedadas (/fonts/*.woff2, mismo origen — el CSP de la
// app no permite cargar fonts.googleapis.com). Solo las que están libres en
// Google Fonts; las premium (Offlander, Proxima Nova, Gulfs Display, Motor,
// Bernoru Condensed, Hertical Rough, Rumble Brave, Cubao Narrow) no se pueden
// embeber legalmente acá — esas opciones se ven con la tipografía por defecto.
const FONT_FACES = [
  ['Outfit', 'outfit-700'],
  ['DM Sans', 'dmsans-700'],
  ['Space Grotesk', 'spacegrotesk-700'],
  ['Manrope', 'manrope-700'],
  ['Fraunces', 'fraunces-700'],
  ['Playfair Display', 'playfairdisplay-700'],
  ['Work Sans', 'worksans-700'],
  ['Plus Jakarta Sans', 'plusjakarta-700'],
  ['League Spartan', 'leaguespartan-700'],
  ['Roboto Mono', 'robotomono-700'],
];
const FONT_FACES_CSS = FONT_FACES.map(
  ([fam, file]) =>
    `@font-face{font-family:'${fam}';font-weight:700;font-style:normal;font-display:swap;src:url('/fonts/${file}.woff2') format('woff2');}`,
).join('');

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

// Mood visual (BrandProfile.visual.mood — string libre, cualquier valor sirve).
const MOODS = [
  ['premium', 'Mood: Premium (oscuro elegante)'],
  ['editorial', 'Mood: Editorial (revista)'],
  ['minimalista', 'Mood: Minimalista'],
  ['brutal', 'Mood: Brutal (amarillo fuerte)'],
  ['luxury', 'Mood: Luxury (dorado)'],
  ['monochrome', 'Mood: Monocromo'],
  ['techno', 'Mood: Techno (neón)'],
  ['organico', 'Mood: Orgánico'],
  ['playful', 'Mood: Lúdico (colorido, divertido)'],
  ['pastel', 'Mood: Pastel (suave, delicado)'],
  ['vintage', 'Mood: Vintage (retro, nostálgico)'],
  ['corporate', 'Mood: Corporativo (serio, institucional)'],
  ['futurista', 'Mood: Futurista (sci-fi, avanzado)'],
  ['maximalista', 'Mood: Maximalista (denso, máximo impacto)'],
];

// Escala tipográfica (BrandProfile.visual.typeScale — src/config/types.ts).
const TYPE_SCALES = [
  ['xs', 'Escala tipográfica: Extra compacta'],
  ['small', 'Escala tipográfica: Compacta'],
  ['medium', 'Escala tipográfica: Estándar'],
  ['large', 'Escala tipográfica: Grande'],
  ['xl', 'Escala tipográfica: Extra grande'],
];

// Objetivo primario (BrandProfile.goals.primary — src/config/types.ts).
const GOALS = [
  ['awareness', 'Awareness (alcance)'],
  ['engagement', 'Engagement (interacción)'],
  ['leads', 'Leads (contactos)'],
  ['ventas', 'Ventas'],
  ['autoridad', 'Autoridad (marca personal)'],
  ['trafico', 'Tráfico (llevar gente a tu sitio/tienda)'],
  ['comunidad', 'Comunidad (pertenencia, conversación)'],
  ['retencion', 'Retención (fidelizar audiencia existente)'],
];

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

// Estilo fotográfico (BrandProfile.visual.photographyStyle — texto libre en el
// schema, pero se ofrece como preset acá para no forzar a escribir a mano).
const PHOTO_STYLES = [
  ['natural', 'Fotografía: Natural'],
  ['staged', 'Fotografía: Producida / staged'],
  ['product-macro', 'Fotografía: Producto macro'],
  ['lifestyle', 'Fotografía: Lifestyle'],
  ['editorial', 'Fotografía: Editorial'],
  ['street', 'Fotografía: Street / documental'],
  ['flat-lay', 'Fotografía: Flat lay (cenital)'],
  ['studio-fondo-liso', 'Fotografía: Estudio, fondo liso'],
  ['retrato-close-up', 'Fotografía: Retrato / close-up'],
  ['arquitectonico', 'Fotografía: Arquitectónico / interiores'],
  ['moody-cinematico', 'Fotografía: Moody / cinemático'],
  ['alto-contraste-bn', 'Fotografía: Alto contraste B&N'],
  ['aereo-dron', 'Fotografía: Aéreo / dron'],
  ['ilustrado-3d', 'Fotografía: Ilustrado / 3D render'],
  ['ugc-casual', 'Fotografía: UGC casual (celular, sin pulir)'],
];

// Densidad visual (BrandProfile.visual.density — src/config/types.ts).
const DENSITIES = [
  ['minimal', 'Densidad: Mínima (casi vacío, máximo aire)'],
  ['low', 'Densidad: Baja (mucho espacio)'],
  ['medium', 'Densidad: Media'],
  ['high', 'Densidad: Alta'],
  ['maximal', 'Densidad: Máxima (saturado, maximalista)'],
];

// Ratio imagen/texto (BrandProfile.visual.imageTextRatio — src/config/types.ts).
const RATIOS = [
  ['full-image', 'Ratio: Full image (casi sin texto)'],
  ['image-heavy', 'Ratio: Imagen-heavy'],
  ['balanced', 'Ratio: Balanceado'],
  ['text-heavy', 'Ratio: Texto-heavy'],
  ['text-driven', 'Ratio: Texto-driven (tipográfico, tipo quote-card)'],
];

// Fuente de imagen (BrandProfile.visual.imageSource — src/config/types.ts).
const IMAGE_SOURCES = [
  ['ai-generated', 'Imágenes: Generadas con IA'],
  ['stock-internet', 'Imágenes: Stock / internet'],
  ['hero-photo-first', 'Imágenes: Priorizar foto protagonista'],
  ['mixed-ai-stock', 'Imágenes: Mezcla IA + stock'],
  ['brand-library', 'Imágenes: Banco propio de marca (uploads)'],
  ['user-generated', 'Imágenes: UGC (clientes / comunidad)'],
];

const opts = (list, selected) =>
  list
    .map(([v, l]) => `<option value="${escape(v)}" ${v === (selected || '') ? 'selected' : ''}>${escape(l)}</option>`)
    .join('');

// ── Asesor de Marca IA ────────────────────────────────────────────────────
// Front door hacia capacidades que YA existen y están montadas en producción
// (src/server/brandSetupRoutes.ts) pero que hasta ahora vivían sólo en la
// vista de Personalización: auditoría de marca con conocimiento profesional
// de branding (src/capabilities/branding/brandRenewal.ts) y un equipo de 8
// especialistas IA (src/capabilities/branding/brandingBrain.ts) que puede
// aplicar sus resultados directo a este mismo Brand Kit.

// Copia estática de BRANDING_BRAIN_AGENTS (brandingBrain.ts) — se usa sólo si
// GET /api/branding/brain/agents falla, para que el roster nunca se vea roto.
const ADVISOR_AGENTS_FALLBACK = [
  {
    id: 'brand-strategist-senior',
    name: 'Lorenzo Vidal',
    emoji: '🏛️',
    role: 'Estratega de Marca Senior',
    specialty: 'Visión, misión, valores, posicionamiento competitivo',
  },
  {
    id: 'audience-researcher',
    name: 'Renata Ibáñez',
    emoji: '🔬',
    role: 'Investigador de Audiencia',
    specialty: 'Avatar del cliente ideal, jobs-to-be-done, dolores, deseos',
  },
  {
    id: 'naming-voice',
    name: 'Tomás Quiroga',
    emoji: '📣',
    role: 'Naming & Voz de Marca',
    specialty: 'Tono de voz, vocabulario, palabras prohibidas, naming',
  },
  {
    id: 'visual-identity',
    name: 'Aurora Blanchet',
    emoji: '🎨',
    role: 'Identidad Visual',
    specialty: 'Paleta, tipografía, mood visual, iconografía',
  },
  {
    id: 'narrative-architect',
    name: 'Joaquín Bressan',
    emoji: '📖',
    role: 'Arquitecto de Narrativa',
    specialty: 'Historia de marca, arcos narrativos, mensajes clave',
  },
  {
    id: 'differential-strategist',
    name: 'Mariela Costa',
    emoji: '⚡',
    role: 'Estratega Diferencial',
    specialty: 'Anti-genérico, takes contrarios, innovación, ángulos únicos',
  },
  {
    id: 'influencer-positioner',
    name: 'Bautista Roldán',
    emoji: '🌟',
    role: 'Posicionador Influencer',
    specialty: 'Convertir cuenta en autoridad de nicho',
  },
  {
    id: 'coherence-guardian',
    name: 'Helena Saavedra',
    emoji: '🛡️',
    role: 'Guardian de Coherencia',
    specialty: 'Validación de identidad y consistencia',
  },
];

const HEALTH_COLOR = { sólida: '#10F2B0', estable: '#3B82F6', fatigada: '#F59E0B', crítica: '#EF4444' };

// Cada especialista cita qué framework (de los 36 libros de CLAUDE.md) usó en
// cada decisión — esto renderiza esa cita como chip compacto (headline antes
// del primer " — ", cita completa en el title) para que "excelencia de
// conocimiento" sea verificable en la UI, no una afirmación sin sustento.
const citationChips = (result, fields) => {
  const all = fields.flatMap((f) => result[f]?.frameworksCited ?? []);
  const unique = [...new Set(all)];
  if (!unique.length) return '';
  return `
    <div class="bk-citations">
      <span class="bk-citations-label">📚 Frameworks aplicados:</span>
      ${unique
        .map((c) => {
          const headline = c.split(' — ')[0] || c;
          return `<span class="bk-citation-chip" title="${escape(c)}">${escape(headline)}</span>`;
        })
        .join('')}
    </div>`;
};

const renderAdvisorSection = (agents) => `
  <div class="bk-advisor">
    <div class="bk-advisor-head">
      <div class="bk-advisor-emoji">🧠</div>
      <div>
        <div class="bk-advisor-title">Asesor de Marca IA</div>
        <div class="bk-advisor-sub">Conocimiento profesional de branding aplicado a TU marca — auditá lo que ya tenés o consultá a tu equipo de 8 especialistas IA. Lo que decidan se puede aplicar directo al Brand Kit de abajo.</div>
      </div>
    </div>

    <div class="bk-advisor-row">
      <div class="bk-advisor-card">
        <div class="bk-card-label">🔍 Auditoría rápida</div>
        <div class="bk-hint">Un brand strategist senior audita tu marca actual: salud, señales de fatiga, qué funciona y qué no — en base a tu Brand Kit y tu performance reciente.</div>
        <button id="bk-audit-run" type="button" class="bk-btn bk-btn-ghost">🔍 Analizar mi marca</button>
        <div id="bk-audit-result"></div>
      </div>

      <div class="bk-advisor-card bk-advisor-card-wide">
        <div class="bk-card-label">🧠 Equipo de especialistas en Branding IA</div>
        <div class="bk-agents-roster" id="bk-adv-agents">
          ${agents
            .map(
              (a) =>
                `<div class="bk-agent-chip" data-agent="${escape(a.id)}" title="${escape(a.specialty)}"><span>${a.emoji}</span>${escape(a.name)} <span class="bk-agent-role">· ${escape(a.role)}</span></div>`,
            )
            .join('')}
        </div>
        <input id="bk-adv-goal" type="text" class="bk-input" placeholder="Objetivo para el equipo (ej: definir posicionamiento para el próximo trimestre)" />
        <input id="bk-adv-ideas" type="text" class="bk-input" placeholder="Tus ideas (opcional)" />
        <input id="bk-adv-constraints" type="text" class="bk-input" placeholder="Restricciones (opcional)" />
        <div class="bk-adv-grid">
          <select id="bk-adv-tier" class="bk-input">
            <option value="starting">Recién empezando</option>
            <option value="growing" selected>Creciendo</option>
            <option value="established">Establecida</option>
            <option value="influencer">Referente / influencer</option>
          </select>
          <select id="bk-adv-mode" class="bk-input">
            <option value="discovery">Descubrimiento (desde cero)</option>
            <option value="refinement" selected>Refinamiento</option>
            <option value="evolution">Evolución</option>
            <option value="autopilot">Autopilot</option>
          </select>
        </div>
        <button id="bk-adv-run" type="button" class="bk-btn bk-btn-primary">🧠 Consultar equipo</button>
        <div class="bk-hint">Puede tardar 30–60s — 8 especialistas trabajando en secuencia.</div>
        <div id="bk-adv-results"></div>
      </div>
    </div>
  </div>`;

const renderAuditResult = (container, audit) => {
  const el = container.querySelector('#bk-audit-result');
  if (!el) return;
  const color = HEALTH_COLOR[audit.overallHealth] || '#8888aa';
  el.innerHTML = `
    <div class="bk-audit-box" style="border-color:${color};">
      <div class="bk-audit-head">
        <div class="bk-score-ring" style="border-color:${color};color:${color};">${audit.score}</div>
        <div>
          <div style="font-weight:800;font-size:13.5px;text-transform:capitalize;">${escape(audit.overallHealth)}</div>
          <div class="tiny muted">Urgencia de evolución: ${escape(audit.evolutionUrgency)} · Recomendación: ${escape(audit.recommendation)}</div>
        </div>
      </div>
      ${audit.whatWorks?.length ? `<div class="bk-audit-list"><strong>✅ Funciona:</strong> ${audit.whatWorks.map((t) => escape(t)).join(' · ')}</div>` : ''}
      ${audit.whatDoesntWork?.length ? `<div class="bk-audit-list"><strong>⚠️ No funciona:</strong> ${audit.whatDoesntWork.map((t) => escape(t)).join(' · ')}</div>` : ''}
      ${audit.detectedIssues?.length ? `<div class="bk-audit-list"><strong>🔎 Detectado:</strong> ${audit.detectedIssues.map((t) => escape(t)).join(' · ')}</div>` : ''}
      <button id="bk-audit-to-goal" type="button" class="bk-btn bk-btn-ghost bk-btn-tiny">↓ Usar esto como objetivo del equipo</button>
    </div>`;

  el.querySelector('#bk-audit-to-goal')?.addEventListener('click', () => {
    const goalEl = container.querySelector('#bk-adv-goal');
    if (goalEl) {
      goalEl.value = `${audit.recommendation === 'mantener' ? 'Reforzar' : 'Resolver'}: ${audit.detectedIssues?.[0] || audit.whatDoesntWork?.[0] || 'mejorar coherencia de marca'}`;
    }
    container.querySelector('.bk-advisor-card-wide')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const renderBrandingBrainResults = (container, renderSelf, result) => {
  const el = container.querySelector('#bk-adv-results');
  if (!el) return;
  const score = result.coherenceReport?.score ?? 0;
  const scoreColor = score >= 80 ? '#10F2B0' : score >= 60 ? '#F59E0B' : '#EF4444';

  el.innerHTML = `
    <div class="bk-audit-box" style="border-color:${scoreColor};">
      <div class="bk-audit-head">
        <div class="bk-score-ring" style="border-color:${scoreColor};color:${scoreColor};">${score}</div>
        <div style="flex:1;">
          <div style="font-weight:800;font-size:13.5px;">Coherencia de equipo: ${score}/100</div>
          <div class="tiny muted">${result.coherenceReport?.conflicts?.length ? result.coherenceReport.conflicts.length + ' conflicto(s) detectado(s)' : '✅ Sin conflictos críticos'}</div>
        </div>
        <div style="display:flex;gap:6px;">
          <button id="bk-adv-apply" type="button" class="bk-btn bk-btn-primary bk-btn-tiny">💾 Aplicar a mi Brand Kit</button>
          <button id="bk-adv-rerun" type="button" class="bk-btn bk-btn-ghost bk-btn-tiny">🔄 Ajustar y reejecutar</button>
        </div>
      </div>
    </div>

    <div class="bk-adv-tiles">
      <div class="bk-adv-tile">
        <div class="bk-card-label">🏛️ Posicionamiento</div>
        <div class="small">${escape(result.brandStrategy?.positioning ?? '—')}</div>
        <div class="tiny muted" style="margin-top:4px;">${escape(result.brandStrategy?.differentiator ?? '')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">🎙️ Voz</div>
        <div class="small">${(result.voice?.tone ?? []).map((t) => `<span class="tag tiny">${escape(t)}</span>`).join(' ')}</div>
        ${result.voice?.sampleHooks?.length ? `<div class="tiny muted" style="margin-top:4px;font-style:italic;">"${escape(result.voice.sampleHooks[0])}"</div>` : ''}
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">🎨 Identidad visual</div>
        <div style="display:flex;gap:5px;margin-bottom:4px;">
          ${(result.visualIdentity?.palette ?? [])
            .slice(0, 5)
            .map(
              (c) =>
                `<div style="width:20px;height:20px;border-radius:5px;background:${escape(c)};border:1px solid var(--border);" title="${escape(c)}"></div>`,
            )
            .join('')}
        </div>
        <div class="tiny muted">${escape(result.visualIdentity?.mood ?? '')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">📖 Narrativa</div>
        <div class="tiny">${escape((result.narrative?.coreMessages ?? [])[0] ?? '—')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">⚡ Diferencial</div>
        <div class="tiny">${(result.differentialAngles?.contraTakes ?? [])
          .slice(0, 2)
          .map((t) => `↯ ${escape(t)}`)
          .join('<br>')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">🛡️ Recomendaciones</div>
        <div class="tiny">${(result.coherenceReport?.recommendations ?? [])
          .slice(0, 2)
          .map((t) => `• ${escape(t)}`)
          .join('<br>')}</div>
      </div>
    </div>
    ${citationChips(result, [
      'brandStrategy',
      'audienceAvatar',
      'voice',
      'visualIdentity',
      'narrative',
      'differentialAngles',
      'influencerPlan',
      'coherenceReport',
    ])}`;

  el.querySelector('#bk-adv-apply')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = '⏳ Aplicando…';
    const payload = {
      brandStrategy: result.brandStrategy,
      audienceAvatar: result.audienceAvatar,
      voice: result.voice,
      visualIdentity: result.visualIdentity,
      narrative: result.narrative,
    };
    const { error } = await apiSafe('/api/brand/apply-branding-brain', null, { method: 'POST', body: payload });
    if (error) {
      toast('❌ No se pudo aplicar: ' + error.message, 'error');
      e.target.disabled = false;
      e.target.textContent = '💾 Aplicar a mi Brand Kit';
      return;
    }
    toast('✅ Tu equipo de branding actualizó el Brand Kit', 'ok');
    await renderSelf(container);
    container.querySelector('.bk-advisor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  el.querySelector('#bk-adv-rerun')?.addEventListener('click', () => {
    el.innerHTML = '';
    container.querySelector('#bk-adv-goal')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const wireAdvisor = (container, renderSelf) => {
  container.querySelector('#bk-audit-run')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = '⏳ Analizando…';
    const { data, error } = await apiSafe('/api/brand/audit', null, { method: 'POST', body: {} });
    e.target.disabled = false;
    e.target.textContent = '🔍 Analizar mi marca';
    if (error || !data) {
      toast('❌ No se pudo auditar: ' + (error?.message || 'sin respuesta'), 'error');
      return;
    }
    renderAuditResult(container, data);
  });

  const runBtn = container.querySelector('#bk-adv-run');
  runBtn?.addEventListener('click', async () => {
    const goal = container.querySelector('#bk-adv-goal')?.value?.trim();
    if (!goal) {
      toast('⚠️ El objetivo es obligatorio', 'warn');
      return;
    }
    const userIdeas = container.querySelector('#bk-adv-ideas')?.value?.trim() || undefined;
    const constraints = container.querySelector('#bk-adv-constraints')?.value?.trim() || undefined;
    const targetTier = container.querySelector('#bk-adv-tier')?.value || 'growing';
    const mode = container.querySelector('#bk-adv-mode')?.value || 'refinement';

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Consultando…';
    const chips = [...container.querySelectorAll('#bk-adv-agents .bk-agent-chip')];
    let idx = 0;
    const pulse = setInterval(() => {
      chips.forEach((c, i) => c.classList.toggle('bk-agent-active', i === idx));
      idx = (idx + 1) % chips.length;
    }, 3500);

    const { data, error } = await apiSafe('/api/branding/brain', null, {
      method: 'POST',
      body: { goal, userIdeas, constraints, targetTier, mode },
    });

    clearInterval(pulse);
    chips.forEach((c) => c.classList.remove('bk-agent-active'));
    runBtn.disabled = false;
    runBtn.textContent = '🧠 Consultar equipo';

    if (error || !data) {
      toast('❌ Error al consultar al equipo: ' + (error?.message || 'sin respuesta'), 'error');
      return;
    }
    toast(`✅ Equipo completo · coherencia ${data.coherenceReport?.score ?? '?'}/100`, 'ok');
    renderBrandingBrainResults(container, renderSelf, data);
  });
};

// ── Especialistas de Plataforma (Instagram / TikTok) ──────────────────────
// Front door hacia src/capabilities/branding/platformBrain.ts — mismo motor
// que la Branding Brain de arriba, pero 2 rosters de 4 especialistas cada
// uno, específicos de cómo rankea/descubre cada plataforma (no consejos
// genéricos). También es lo que le da uso real al selector Instagram/TikTok
// de la barra lateral (src/server/static/lib/platform.js) — hasta ahora sólo
// mostraba/ocultaba menú, nunca cambiaba qué IA se consulta.

const PLATFORM_AGENTS_FALLBACK = {
  instagram: [
    {
      id: 'ig-algorithm-strategist',
      name: 'Valentina Roig',
      emoji: '📊',
      role: 'Estratega de Algoritmo de Instagram',
      specialty: 'Ranking de Explore/Búsqueda, mix Reel/Carrusel/Historia',
    },
    {
      id: 'ig-growth-hacker',
      name: 'Nicolás Farina',
      emoji: '🚀',
      role: 'Growth Hacker de Instagram',
      specialty: 'Crecimiento de seguidores, collabs, funnel de DMs',
    },
    {
      id: 'ig-hashtag-scientist',
      name: 'Delfina Otero',
      emoji: '🔬',
      role: 'Científica de Hashtags & Descubrimiento',
      specialty: 'Pirámide de hashtags, SEO de búsqueda, shadowban',
    },
    {
      id: 'ig-format-strategist',
      name: 'Franco Miele',
      emoji: '🗓️',
      role: 'Estratega de Formato & Timing',
      specialty: 'Mix de formatos, cadencia, horarios',
    },
  ],
  tiktok: [
    {
      id: 'tt-fyp-strategist',
      name: 'Camila Suárez',
      emoji: '🎯',
      role: 'Estratega de Algoritmo FYP',
      specialty: 'Completion rate, watch time, ranking del For You',
    },
    {
      id: 'tt-sound-curator',
      name: 'Bruno Kessler',
      emoji: '🎵',
      role: 'Curador de Sonido & Tendencias',
      specialty: 'Sonidos trending, challenges, timing',
    },
    {
      id: 'tt-native-specialist',
      name: 'Mía Boccardo',
      emoji: '🎬',
      role: 'Especialista en Contenido Nativo',
      specialty: 'Hook en 0-1s, edición nativa cruda',
    },
    {
      id: 'tt-growth-shop',
      name: 'Ignacio Prados',
      emoji: '🛍️',
      role: 'Growth & TikTok Shop',
      specialty: 'Duetos/stitches, TikTok Shop, comentarios',
    },
  ],
};

const PLATFORM_LABEL = { instagram: '📸 Instagram', tiktok: '🎵 TikTok' };
const DISCOVERY_LABEL = {
  instagram: { primary: 'Hashtags principales', rule: 'Regla de rotación' },
  tiktok: { primary: 'Tipos de sonido', rule: 'Regla de timing' },
};

const renderPlatformAgentChips = (agents) =>
  agents
    .map(
      (a) =>
        `<div class="bk-agent-chip" title="${escape(a.specialty)}"><span>${a.emoji}</span>${escape(a.name)} <span class="bk-agent-role">· ${escape(a.role)}</span></div>`,
    )
    .join('');

const renderPlatformSection = (agentsByPlatform, initialPlatform) => `
  <div class="bk-advisor">
    <div class="bk-advisor-head">
      <div class="bk-advisor-emoji">📲</div>
      <div>
        <div class="bk-advisor-title">Especialistas de Plataforma</div>
        <div class="bk-advisor-sub">Instagram y TikTok rankean distinto, se descubren distinto y premian formatos distintos — consultá al equipo de 4 especialistas de cada plataforma por separado y aplicá lo que sirva.</div>
      </div>
    </div>

    <div class="bk-plat-tabs">
      <button type="button" class="bk-plat-tab${initialPlatform === 'instagram' ? ' bk-plat-tab-active' : ''}" data-platform="instagram">📸 Instagram</button>
      <button type="button" class="bk-plat-tab${initialPlatform === 'tiktok' ? ' bk-plat-tab-active' : ''}" data-platform="tiktok">🎵 TikTok</button>
    </div>

    <div class="bk-advisor-card bk-advisor-card-wide">
      <div class="bk-agents-roster" id="bk-plat-agents">${renderPlatformAgentChips(agentsByPlatform[initialPlatform])}</div>
      <input id="bk-plat-goal" type="text" class="bk-input" placeholder="Objetivo para el equipo (ej: crecer seguidores este trimestre)" />
      <input id="bk-plat-ideas" type="text" class="bk-input" placeholder="Tus ideas (opcional)" />
      <input id="bk-plat-constraints" type="text" class="bk-input" placeholder="Restricciones (opcional)" />
      <button id="bk-plat-run" type="button" class="bk-btn bk-btn-primary" data-platform="${initialPlatform}">🧠 Consultar equipo de ${escape(PLATFORM_LABEL[initialPlatform])}</button>
      <div class="bk-hint">Puede tardar 20–40s — 4 especialistas trabajando en secuencia.</div>
      <div id="bk-plat-results"></div>
    </div>
  </div>`;

const renderPlatformResults = (container, renderSelf, platform, result) => {
  const el = container.querySelector('#bk-plat-results');
  if (!el) return;
  const dl = DISCOVERY_LABEL[platform];
  el.innerHTML = `
    <div class="bk-adv-tiles" style="margin-top:10px;">
      <div class="bk-adv-tile">
        <div class="bk-card-label">📊 Algoritmo</div>
        <div class="tiny"><strong>Métrica clave:</strong> ${escape(result.algorithmStrategy.keyMetric)}</div>
        <div class="tiny muted" style="margin-top:3px;">${escape(result.algorithmStrategy.postingCadence)}</div>
        <div class="tiny" style="margin-top:4px;">${result.algorithmStrategy.formatMix.map((f) => `${escape(f.format)} ${f.weight}%`).join(' · ')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">🚀 Growth</div>
        <div class="tiny">${result.growthPlaybook.quickWins
          .slice(0, 3)
          .map((t) => `• ${escape(t)}`)
          .join('<br>')}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">${platform === 'instagram' ? '🔬 Hashtags' : '🎵 Sonido & Trends'}</div>
        <div class="tiny"><strong>${escape(dl.primary)}:</strong> ${result.discoveryStrategy.primary.map((t) => escape(t)).join(', ')}</div>
        <div class="tiny muted" style="margin-top:3px;">${escape(dl.rule)}: ${escape(result.discoveryStrategy.rule)}</div>
      </div>
      <div class="bk-adv-tile">
        <div class="bk-card-label">🎬 Formato nativo</div>
        <div class="tiny"><strong>Hook:</strong> ${escape(result.nativeFormatRules.hookRule)}</div>
        <div class="tiny muted" style="margin-top:3px;">${escape(result.nativeFormatRules.lengthGuidance)}</div>
      </div>
    </div>
    ${citationChips(result, ['algorithmStrategy', 'growthPlaybook', 'discoveryStrategy', 'nativeFormatRules'])}
    <div style="display:flex;gap:6px;margin-top:10px;">
      <button id="bk-plat-apply" type="button" class="bk-btn bk-btn-primary bk-btn-tiny">💾 Aplicar a mi Brand Kit</button>
      <button id="bk-plat-rerun" type="button" class="bk-btn bk-btn-ghost bk-btn-tiny">🔄 Ajustar y reejecutar</button>
    </div>`;

  el.querySelector('#bk-plat-apply')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = '⏳ Aplicando…';
    const payload = {
      discoveryStrategy: result.discoveryStrategy,
      algorithmStrategy: { keyMetric: result.algorithmStrategy.keyMetric },
      nativeFormatRules: { editingRules: result.nativeFormatRules.editingRules },
    };
    const { error } = await apiSafe(`/api/platform-brain/${platform}/apply`, null, { method: 'POST', body: payload });
    if (error) {
      toast('❌ No se pudo aplicar: ' + error.message, 'error');
      e.target.disabled = false;
      e.target.textContent = '💾 Aplicar a mi Brand Kit';
      return;
    }
    toast(`✅ Estrategia de ${PLATFORM_LABEL[platform]} aplicada al Brand Kit`, 'ok');
    await renderSelf(container);
    container.querySelector('.bk-advisor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  el.querySelector('#bk-plat-rerun')?.addEventListener('click', () => {
    el.innerHTML = '';
    container.querySelector('#bk-plat-goal')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
};

const wirePlatformSection = (container, renderSelf, agentsByPlatform) => {
  container.querySelectorAll('.bk-plat-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const platform = tab.dataset.platform;
      container.querySelectorAll('.bk-plat-tab').forEach((t) => t.classList.toggle('bk-plat-tab-active', t === tab));
      const roster = container.querySelector('#bk-plat-agents');
      if (roster) roster.innerHTML = renderPlatformAgentChips(agentsByPlatform[platform]);
      const runBtn = container.querySelector('#bk-plat-run');
      if (runBtn) {
        runBtn.dataset.platform = platform;
        runBtn.textContent = `🧠 Consultar equipo de ${PLATFORM_LABEL[platform]}`;
      }
      const results = container.querySelector('#bk-plat-results');
      if (results) results.innerHTML = '';
    });
  });

  const runBtn = container.querySelector('#bk-plat-run');
  runBtn?.addEventListener('click', async () => {
    const platform = runBtn.dataset.platform || 'instagram';
    const goal = container.querySelector('#bk-plat-goal')?.value?.trim();
    if (!goal) {
      toast('⚠️ El objetivo es obligatorio', 'warn');
      return;
    }
    const userIdeas = container.querySelector('#bk-plat-ideas')?.value?.trim() || undefined;
    const constraints = container.querySelector('#bk-plat-constraints')?.value?.trim() || undefined;

    runBtn.disabled = true;
    runBtn.textContent = '⏳ Consultando…';
    const chips = [...container.querySelectorAll('#bk-plat-agents .bk-agent-chip')];
    let idx = 0;
    const pulse = setInterval(() => {
      chips.forEach((c, i) => c.classList.toggle('bk-agent-active', i === idx));
      idx = (idx + 1) % chips.length;
    }, 3000);

    const { data, error } = await apiSafe(`/api/platform-brain/${platform}`, null, {
      method: 'POST',
      body: { goal, userIdeas, constraints },
    });

    clearInterval(pulse);
    chips.forEach((c) => c.classList.remove('bk-agent-active'));
    runBtn.disabled = false;
    runBtn.textContent = `🧠 Consultar equipo de ${PLATFORM_LABEL[platform]}`;

    if (error || !data) {
      toast('❌ Error al consultar al equipo: ' + (error?.message || 'sin respuesta'), 'error');
      return;
    }
    toast(`✅ Equipo de ${PLATFORM_LABEL[platform]} completo`, 'ok');
    renderPlatformResults(container, renderSelf, platform, data);
  });
};

const renderShell = (
  kit = {},
  agents = ADVISOR_AGENTS_FALLBACK,
  platformAgents = PLATFORM_AGENTS_FALLBACK,
  initialPlatform = 'instagram',
) => `
  <div class="bk-shell">
    <div class="bk-hero">
      <div class="bk-emoji">🎨</div>
      <div>
        <h1 class="bk-title">Tu Brand Kit</h1>
        <p class="bk-sub">Definí 1 sola vez toda tu identidad de marca. Todas las herramientas (Manos Libres, Piloto, Carruseles, Reels, Historias) lo leen automáticamente.</p>
      </div>
    </div>

    ${renderAdvisorSection(agents)}

    ${renderPlatformSection(platformAgents, initialPlatform)}

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
          ([v, l, mood, previewFont]) =>
            `<option value="${v}" ${(kit.font || 'tech') === v ? 'selected' : ''}${previewFont ? ` style="font-family:'${previewFont}',sans-serif;font-weight:700;"` : ''}>${escape(l)} — ${escape(mood)}</option>`,
        ).join('')}</select>
        <select id="bk-mood" class="bk-input">${opts(MOODS, kit.mood || 'premium')}</select>
        <input id="bk-style" type="text" class="bk-input" placeholder="Estilo general (ej: minimalismo técnico con acentos cálidos)" value="${escape(kit.style || '')}" />
        <select id="bk-type-scale" class="bk-input">${opts(TYPE_SCALES, kit.typeScale || 'medium')}</select>
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
        <select id="bk-goal-primary" class="bk-input">${opts(GOALS, kit.goalPrimary || 'engagement')}</select>
        <input id="bk-goal-metrics" type="text" class="bk-input" placeholder="Métricas a vigilar (ej: guardados, DMs)" value="${escape(fromTags(kit.goalMetrics))}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🧬 Personalidad de marca</div>
        <select id="bk-archetype" class="bk-input">${opts(ARCHETYPES, kit.archetype)}</select>
        <input id="bk-personality" type="text" class="bk-input" placeholder="Rasgos (ej: directo, cercano, audaz)" value="${escape(fromTags(kit.personality))}" />
      </div>

      <div class="bk-card">
        <div class="bk-card-label">🏁 Competencia</div>
        <textarea id="bk-competitors" class="bk-input bk-textarea" rows="3" placeholder="1 por línea — @handle de Instagram, link del perfil (instagram.com/... o el sitio web de la empresa), o nombre de marca">${escape(fromLines(kit.competitors))}</textarea>
        <div class="bk-hint">Se usa para diferenciar tu copy — y cuando cargás un @handle o link de Instagram, el sistema también puede analizar su actividad (posts, engagement).</div>
      </div>

      <div class="bk-card bk-full">
        <div class="bk-card-label">⚙️ Estilo visual avanzado</div>
        <div class="bk-adv-grid">
          <select id="bk-photo-style" class="bk-input">${opts(PHOTO_STYLES, kit.photographyStyle || 'natural')}</select>
          <select id="bk-density" class="bk-input">${opts(DENSITIES, kit.density || 'medium')}</select>
          <select id="bk-image-text-ratio" class="bk-input">${opts(RATIOS, kit.imageTextRatio || 'balanced')}</select>
          <select id="bk-image-source" class="bk-input">${opts(IMAGE_SOURCES, kit.imageSource || 'ai-generated')}</select>
        </div>
        <div class="bk-hint">La fuente de imagen se lee en todas las herramientas que generan piezas — decide si arrancan generando con IA, buscando stock, priorizando tu foto protagonista, o combinando.</div>
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
    ${FONT_FACES_CSS}
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
    .bk-hint{font-size:11px;color:var(--text-tertiary,var(--fg-3));line-height:1.4;}
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

    .bk-advisor{margin-bottom:14px;padding:14px;border-radius:12px;border:1px solid rgba(139,92,246,.3);background:linear-gradient(135deg,rgba(139,92,246,.08),rgba(16,242,176,.04));}
    .bk-advisor-head{display:flex;gap:10px;align-items:flex-start;margin-bottom:12px;}
    .bk-advisor-emoji{font-size:26px;line-height:1;}
    .bk-advisor-title{font-weight:900;font-size:15px;color:var(--text-primary,var(--fg));}
    .bk-advisor-sub{margin-top:2px;font-size:12px;color:var(--text-secondary,var(--fg-2));line-height:1.4;max-width:720px;}
    .bk-advisor-row{display:grid;grid-template-columns:1fr 2fr;gap:12px;}
    @media(max-width:900px){.bk-advisor-row{grid-template-columns:1fr;}}
    .bk-advisor-card{padding:12px;border:1px solid var(--border);border-radius:10px;background:var(--card,rgba(255,255,255,.02));display:flex;flex-direction:column;gap:8px;}
    .bk-btn-ghost{background:transparent;border:1px solid var(--border);color:var(--text-primary,var(--fg));}
    .bk-btn-tiny{padding:6px 12px;font-size:12px;border-radius:8px;}
    .bk-agents-roster{display:flex;flex-wrap:wrap;gap:6px;}
    .bk-agent-chip{display:flex;align-items:center;gap:5px;padding:5px 10px;border:1px solid var(--border);border-radius:20px;font-size:11px;color:var(--text-secondary,var(--fg-2));cursor:default;transition:border-color .2s,color .2s;}
    .bk-agent-role{color:var(--text-tertiary,var(--fg-3));}
    .bk-agent-chip.bk-agent-active{border-color:#8B5CF6;color:var(--text-primary,var(--fg));box-shadow:0 0 0 2px rgba(139,92,246,.15);}
    .bk-score-ring{width:46px;height:46px;border-radius:50%;border:3px solid;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:15px;flex-shrink:0;}
    .bk-audit-box{padding:10px;border:1px solid var(--border);border-left-width:3px;border-radius:8px;display:flex;flex-direction:column;gap:8px;}
    .bk-audit-head{display:flex;gap:10px;align-items:center;}
    .bk-audit-list{font-size:11.5px;line-height:1.5;color:var(--text-secondary,var(--fg-2));}
    .bk-adv-tiles{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px;}
    @media(max-width:900px){.bk-adv-tiles{grid-template-columns:1fr 1fr;}}
    @media(max-width:640px){.bk-adv-tiles{grid-template-columns:1fr;}}
    .bk-adv-tile{padding:9px;border:1px solid var(--border);border-radius:8px;background:rgba(255,255,255,.02);}
    .bk-plat-tabs{display:flex;gap:6px;margin-bottom:10px;}
    .bk-plat-tab{padding:7px 16px;border:1px solid var(--border);border-radius:20px;background:transparent;color:var(--text-secondary,var(--fg-2));font-size:12.5px;font-weight:700;font-family:inherit;cursor:pointer;}
    .bk-plat-tab-active{border-color:#8B5CF6;color:var(--text-primary,var(--fg));background:rgba(139,92,246,.12);}
    .bk-citations{margin-top:10px;padding-top:10px;border-top:1px dashed var(--border);display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
    .bk-citations-label{font-size:10.5px;font-weight:700;color:var(--text-tertiary,var(--fg-3));letter-spacing:.3px;}
    .bk-citation-chip{font-size:10.5px;padding:3px 9px;border-radius:12px;background:rgba(139,92,246,.1);color:#C4B5FD;border:1px solid rgba(139,92,246,.25);cursor:help;}
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
  const [kit, agentsRes, igAgentsRes, ttAgentsRes, platformDefault] = await Promise.all([
    loadBrandKit(accountId).then((k) => k || {}),
    apiSafe('/api/branding/brain/agents', { agents: ADVISOR_AGENTS_FALLBACK }),
    apiSafe('/api/platform-brain/instagram/agents', { agents: PLATFORM_AGENTS_FALLBACK.instagram }),
    apiSafe('/api/platform-brain/tiktok/agents', { agents: PLATFORM_AGENTS_FALLBACK.tiktok }),
    getPlatform(),
  ]);
  const agents = agentsRes.data?.agents?.length ? agentsRes.data.agents : ADVISOR_AGENTS_FALLBACK;
  const platformAgents = {
    instagram: igAgentsRes.data?.agents?.length ? igAgentsRes.data.agents : PLATFORM_AGENTS_FALLBACK.instagram,
    tiktok: ttAgentsRes.data?.agents?.length ? ttAgentsRes.data.agents : PLATFORM_AGENTS_FALLBACK.tiktok,
  };
  const initialPlatform = platformDefault === 'tiktok' ? 'tiktok' : 'instagram';

  container.innerHTML = renderShell(kit, agents, platformAgents, initialPlatform);
  wireAdvisor(container, renderBrandKit);
  wirePlatformSection(container, renderBrandKit, platformAgents);

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
        style: val('#bk-style'),
        typeScale: val('#bk-type-scale') || 'medium',
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
        competitors: toLines(container.querySelector('#bk-competitors')?.value || ''),
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
