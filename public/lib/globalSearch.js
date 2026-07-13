/* ══════════════════════════════════════════════════════════════════════════════
   globalSearch.js — Búsqueda global con autocomplete, scoring y quick actions
   ──────────────────────────────────────────────────────────────────────────────
   Indexa: vistas (ROUTE_LABELS), agentes IA, herramientas, acciones rápidas
   y quick commands (ej. "lanzar misión", "frenar agente", "abrir canva").
   Soporta: keyboard nav (↑↓ Enter Esc), highlight, agrupado por categoría,
   shortcut Ctrl/Cmd+K para abrir.
   ══════════════════════════════════════════════════════════════════════════════ */

import { apiSafe } from './api.js';
import { toast } from './toast.js';

// ── Index estático ────────────────────────────────────────────────────────────
// (las rutas se enriquecen desde ROUTE_LABELS al inicializar)
const STATIC_INDEX = [
  // Quick actions / Commands
  {
    type: 'command',
    icon: '🚀',
    title: 'Lanzar misión nueva',
    desc: 'Abre Mission Control con el input listo',
    route: 'mission',
    priority: 10,
    keywords: 'mision misión goal lanzar objetivo',
  },
  {
    type: 'command',
    icon: '🛑',
    title: 'Frenar al agente',
    desc: 'Stop de emergencia · pausa todo + rechaza pendientes',
    action: 'emergency-stop',
    priority: 10,
    keywords: 'stop frenar parar pausar emergencia cua agente',
  },
  {
    type: 'command',
    icon: '🎨',
    title: 'Abrir Canva → Instagram',
    desc: 'Pipeline visual: Nova diseña y Luca publica',
    route: 'canva-runner',
    priority: 9,
    keywords: 'canva diseño publicar',
  },
  {
    type: 'command',
    icon: '📷',
    title: 'Vision IA · abrir cámara',
    desc: 'Analizar imagen desde cámara o subida',
    route: 'vision',
    priority: 8,
    keywords: 'camara cámara foto imagen analizar vision',
  },
  {
    type: 'command',
    icon: '✨',
    title: 'Hablarle al Asistente FeedIA',
    desc: 'Abre la burbuja de chat (la que está junto al mic)',
    action: 'open-chatbot',
    priority: 9,
    keywords: 'chatbot asistente chat preguntar feedia',
  },
  {
    type: 'command',
    icon: '🎙️',
    title: 'Hola FeedIA · comando por voz',
    desc: 'Abre el overlay de voz hands-free',
    action: 'open-voice',
    priority: 8,
    keywords: 'voz hablar microfono micrófono dictar',
  },
  {
    type: 'command',
    icon: '🔁',
    title: 'Activar Autopilot',
    desc: 'Pasa al modo operación autónoma',
    route: 'autopilot',
    priority: 8,
    keywords: 'autopilot automatico autónomo activar',
  },
  {
    type: 'command',
    icon: '⚡',
    title: 'Skills de FeedIA',
    desc: 'Catálogo de skills + generador real de carrusel/reel/story',
    route: 'skills',
    priority: 9,
    keywords: 'skills habilidades generador carrusel reel story catalogo canva',
  },
  {
    type: 'command',
    icon: '⌨️',
    title: 'Ver atajos de teclado',
    desc: 'Cheatsheet completo (también con tecla "?")',
    action: 'open-shortcuts',
    priority: 8,
    keywords: 'atajos shortcuts teclado keyboard cheatsheet ayuda help',
  },
  {
    type: 'command',
    icon: '🎨',
    title: 'Editar Brand Board',
    desc: 'Definí nombre, paleta, voz, tipografía',
    route: 'moodboard',
    priority: 7,
    keywords: 'brand marca identidad logo paleta colores',
  },
  {
    type: 'command',
    icon: '⚙️',
    title: 'Abrir Configuración',
    desc: 'API keys, voz, accesibilidad, integración Meta',
    route: 'settings',
    priority: 8,
    keywords: 'settings ajustes configuracion config api keys',
  },
  {
    type: 'command',
    icon: '🧬',
    title: 'Ver Medidor de Consumo IA',
    desc: 'Arquitectura del cerebro, memoria, razonamiento',
    route: 'inteligencia',
    priority: 7,
    keywords: 'inteligencia cerebro consumo tokens memoria arquitectura',
  },
  {
    type: 'command',
    icon: '🔔',
    title: 'Abrir notificaciones',
    desc: 'Campanita con aprobaciones, logros, equipo',
    action: 'open-notifications',
    priority: 7,
    keywords: 'notificaciones campanita alertas aprobaciones',
  },
  {
    type: 'command',
    icon: '🎯',
    title: 'Lanzar Predictor de Performance',
    desc: 'Score + recomendaciones para viralizar',
    route: 'predictor',
    priority: 7,
    keywords: 'predictor predecir viralizar score',
  },
  {
    type: 'command',
    icon: '🧪',
    title: 'Hook Library',
    desc: '23+ patrones de hooks + scorer + favoritos',
    route: 'hooks',
    priority: 7,
    keywords: 'hook library biblioteca ganchos patrones',
  },
  {
    type: 'command',
    icon: '👑',
    title: 'Sala Ejecutiva',
    desc: 'Resumen, propuestas, análisis, reportes, etc.',
    route: 'imperio',
    priority: 8,
    keywords: 'sala ejecutiva imperio reunion ejecutivos resumen apalancamiento',
  },
  {
    type: 'command',
    icon: '📒',
    title: 'Ver agenda',
    desc: 'Lo que el equipo va a hacer, día por día',
    route: 'agenda',
    priority: 7,
    keywords: 'agenda cronograma tareas eventos plan',
  },
  {
    type: 'command',
    icon: '📅',
    title: 'Calendario de contenido',
    desc: 'Vista semana / mes / año + IA interpreta',
    route: 'calendar',
    priority: 7,
    keywords: 'calendario calendar contenido publicar planificar',
  },
  {
    type: 'command',
    icon: '📋',
    title: 'Task Board del equipo',
    desc: 'Kanban con Nova, Lía, Gard, Luca, Mira',
    route: 'taskboard',
    priority: 6,
    keywords: 'task board kanban equipo tareas standup workload',
  },
  {
    type: 'command',
    icon: '🤖',
    title: 'Agentes IA',
    desc: 'Dashboard de tu equipo autónomo',
    route: 'agents',
    priority: 7,
    keywords: 'agentes ia inteligencia artificial nova lia gard luca mira',
  },
  {
    type: 'command',
    icon: '🛸',
    title: 'Mission Control',
    desc: 'Lanzar misiones multi-agente en lenguaje natural',
    route: 'mission',
    priority: 7,
    keywords: 'mission control misiones multi agente goal lanzar',
  },
  {
    type: 'command',
    icon: '📜',
    title: 'Replay Log',
    desc: 'Sesiones grabadas paso por paso con screenshots',
    route: 'replay',
    priority: 6,
    keywords: 'replay log historial sesiones screenshots',
  },
  {
    type: 'command',
    icon: '🧠',
    title: 'Cerebro Maestro — carrusel',
    desc: 'Lanza el Master Brain para generar un carrusel completo',
    action: 'master-brain-carousel',
    priority: 9,
    keywords: 'cerebro maestro master brain branding canva carrusel orquestador',
  },
  {
    type: 'command',
    icon: '🧠',
    title: 'Cerebro Maestro — reel',
    desc: 'Lanza el Master Brain para generar un reel',
    action: 'master-brain-reel',
    priority: 9,
    keywords: 'cerebro maestro master brain reel video orquestador',
  },
  {
    type: 'command',
    icon: '🧠',
    title: 'Cerebro Maestro — stories',
    desc: 'Lanza el Master Brain para generar stories',
    action: 'master-brain-stories',
    priority: 9,
    keywords: 'cerebro maestro master brain stories historias orquestador',
  },
  {
    type: 'command',
    icon: '🏛️',
    title: 'Branding Brain',
    desc: 'Construí / refiná la identidad completa de tu marca con 8 especialistas IA',
    route: 'personalization',
    action: 'open-branding-brain',
    priority: 9,
    keywords: 'branding brain identidad marca estrategia voz visual lorenz renata aurora',
  },
  {
    type: 'command',
    icon: '💬',
    title: 'DM Auto-Reply — Construir plantillas',
    desc: 'Genera respuestas automáticas para DMs según la identidad de marca',
    action: 'build-dm-templates',
    priority: 8,
    keywords: 'dm direct message respuesta automatica plantilla inbox',
  },
  {
    type: 'command',
    icon: '#️⃣',
    title: 'Estrategia de Hashtags',
    desc: 'Genera la estrategia óptima de hashtags para tu próximo post',
    action: 'hashtag-strategy',
    priority: 8,
    keywords: 'hashtag estrategia tags etiquetas niche nicho rotacion',
  },
  {
    type: 'command',
    icon: '🧪',
    title: 'Crear A/B Test',
    desc: 'Crea variantes de contenido para medir qué funciona mejor',
    action: 'create-ab-test',
    priority: 7,
    keywords: 'ab test variante split testing engagement caption',
  },
  {
    type: 'command',
    icon: '📅',
    title: 'Cola de Contenido — Programar',
    desc: 'Programa publicaciones en las ventanas óptimas de tu audiencia',
    action: 'schedule-queue',
    priority: 7,
    keywords: 'cola queue programar publicar schedule contenido calendario',
  },
  {
    type: 'command',
    icon: '🧠',
    title: 'Full Takeover — Gestión completa',
    desc: 'Activa TODOS los cerebros: contenido, DMs, comentarios, hashtags, cola',
    action: 'master-full-takeover',
    priority: 9,
    keywords: 'full takeover autopilot piloto automatico todo gestionar completo',
  },
  {
    type: 'command',
    icon: '📈',
    title: 'Detectar tendencias del nicho',
    desc: 'Analiza las tendencias actuales relevantes y genera ideas de contenido',
    action: 'detect-trends',
    priority: 8,
    keywords: 'tendencias trends trending nicho viral novedad oportunidad',
  },
  {
    type: 'command',
    icon: '🔍',
    title: 'Analizar competidores',
    desc: 'Mapea la competencia, extrae gaps y genera ideas únicas para tu marca',
    action: 'analyze-competitors',
    priority: 8,
    keywords: 'competidores competencia analizar gaps mercado diferenciacion',
  },
  {
    type: 'command',
    icon: '🤖',
    title: 'Studio Manager — Panel CU Brain',
    desc: 'Abre el dashboard central con todos los módulos del CU Brain',
    route: 'studio-manager',
    priority: 9,
    keywords: 'studio manager panel cerebro cu brain dashboard queue dms hashtags trending',
  },

  // Agentes (los 10 especialistas)
  {
    type: 'agent',
    icon: '🧠',
    title: 'Algorithm Master',
    desc: 'Ranking, Explore, shadowban, timing óptimo',
    route: 'agents',
    anchor: 'algorithm',
    priority: 7,
    keywords: 'algoritmo algorithm ranking explore shadowban timing',
  },
  {
    type: 'agent',
    icon: '📊',
    title: 'Meta Ads Pro',
    desc: 'Campañas, audiencias, creativos, ROAS',
    route: 'agents',
    anchor: 'meta-ads',
    priority: 7,
    keywords: 'meta ads facebook campañas anuncios roas',
  },
  {
    type: 'agent',
    icon: '😂',
    title: 'Humor Engine',
    desc: 'Memes, comedy hooks, contenido viral',
    route: 'agents',
    anchor: 'humor',
    priority: 7,
    keywords: 'humor meme comedia viral entretenimiento',
  },
  {
    type: 'agent',
    icon: '💰',
    title: 'Sales Machine',
    desc: 'Story selling, DM funnels, CTAs',
    route: 'agents',
    anchor: 'sales',
    priority: 7,
    keywords: 'ventas sales dm funnel cierre',
  },
  {
    type: 'agent',
    icon: '❤️',
    title: 'Community Champion',
    desc: 'Engagement, lives, UGC, comunidad',
    route: 'agents',
    anchor: 'community',
    priority: 7,
    keywords: 'comunidad community engagement lives ugc',
  },

  // Herramientas
  {
    type: 'tool',
    icon: '✍️',
    title: 'Caption IA',
    desc: '3 captions optimizadas con voz de marca',
    route: 'tools',
    anchor: 'caption',
    priority: 6,
    keywords: 'caption pie de foto texto',
  },
  {
    type: 'tool',
    icon: '🔬',
    title: 'Hashtag Lab',
    desc: 'Sets balanceados nicho + tendencia',
    route: 'tools',
    anchor: 'hashtags',
    priority: 6,
    keywords: 'hashtags tags etiquetas',
  },
  {
    type: 'tool',
    icon: '🎣',
    title: 'Hook Factory',
    desc: 'Ganchos virales que paran scroll',
    route: 'tools',
    anchor: 'hooks',
    priority: 6,
    keywords: 'hook gancho viral scroll',
  },
  {
    type: 'tool',
    icon: '♻️',
    title: 'Repurposer',
    desc: 'Reusá contenido en otros formatos',
    route: 'tools',
    anchor: 'repurpose',
    priority: 6,
    keywords: 'repurpose reusar reciclar formatos',
  },
  {
    type: 'tool',
    icon: '🛡️',
    title: 'Safety Check',
    desc: 'Compliance + riesgo shadowban',
    route: 'tools',
    anchor: 'safety',
    priority: 6,
    keywords: 'compliance safety riesgo shadowban',
  },
  {
    type: 'tool',
    icon: '🎯',
    title: 'Predictor de performance',
    desc: 'Score + recomendaciones para viralizar',
    route: 'predictor',
    priority: 6,
    keywords: 'predictor predecir score viral',
  },
  {
    type: 'tool',
    icon: '📚',
    title: 'Hook Library',
    desc: 'Biblioteca de patrones + scorer + generador',
    route: 'hooks',
    priority: 6,
    keywords: 'hook library biblioteca patrones',
  },
];

let routeIndex = []; // poblado desde ROUTE_LABELS

const buildRouteIndex = (routeLabels) => {
  routeIndex = Object.entries(routeLabels ?? {}).map(([id, label]) => {
    const parts = label.split('·').map((s) => s.trim());
    const title = parts[0] ?? id;
    const desc = parts.slice(1).join(' · ');
    return {
      type: 'view',
      icon: '📂',
      title,
      desc,
      route: id,
      priority: 5,
      keywords: label.toLowerCase(),
    };
  });
};

// ── Scoring & matching ────────────────────────────────────────────────────────
const normalize = (s) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // sin tildes

const score = (item, query) => {
  if (!query) return item.priority ?? 0;
  const q = normalize(query);
  const title = normalize(item.title);
  const keywords = normalize(item.keywords ?? '');
  const desc = normalize(item.desc ?? '');
  let s = 0;
  if (title === q) s += 100;
  if (title.startsWith(q)) s += 50;
  if (title.includes(q)) s += 30;
  if (keywords.includes(q)) s += 20;
  if (desc.includes(q)) s += 10;
  // Bonus por tokens (queries multi-palabra)
  const tokens = q.split(/\s+/).filter(Boolean);
  for (const t of tokens) {
    if (t.length < 2) continue;
    if (title.includes(t)) s += 8;
    if (keywords.includes(t)) s += 5;
    if (desc.includes(t)) s += 2;
  }
  if (s > 0) s += item.priority ?? 0;
  return s;
};

const search = (query, limit = 12) => {
  const all = [...STATIC_INDEX, ...routeIndex];
  if (!query || !query.trim()) {
    // Sin query: mostrar top commands + 4 agentes + 4 vistas más relevantes
    return all
      .filter((i) => (i.priority ?? 0) >= 6 || i.type === 'view')
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
      .slice(0, limit);
  }
  return all
    .map((i) => ({ item: i, s: score(i, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.item);
};

// ── Resaltado del match ───────────────────────────────────────────────────────
const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

const highlight = (text, query) => {
  if (!query || !query.trim()) return escapeHtml(text);
  const q = normalize(query.trim());
  const orig = escapeHtml(text);
  const normText = normalize(text);
  const idx = normText.indexOf(q);
  if (idx < 0 || q.length < 2) return orig;
  // Devolvemos con highlight aproximado sin alterar mucho
  return orig.replace(
    new RegExp(
      `(${q
        .split('')
        .map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('')})`,
      'i',
    ),
    '<mark>$1</mark>',
  );
};

// ── DOM ───────────────────────────────────────────────────────────────────────
let dropdownEl = null;
let activeIndex = -1;
let currentResults = [];
let inputEl = null;

const ensureDropdown = (anchorEl) => {
  if (dropdownEl) return dropdownEl;
  dropdownEl = document.createElement('div');
  dropdownEl.className = 'gs-dropdown';
  dropdownEl.setAttribute('role', 'listbox');
  document.body.appendChild(dropdownEl);
  positionDropdown(anchorEl);
  window.addEventListener('resize', () => positionDropdown(anchorEl), { passive: true });
  window.addEventListener('scroll', () => positionDropdown(anchorEl), { passive: true, capture: true });
  return dropdownEl;
};

const positionDropdown = (anchor) => {
  if (!dropdownEl || !anchor) return;
  const r = anchor.getBoundingClientRect();
  dropdownEl.style.top = `${Math.round(r.bottom + 6)}px`;
  dropdownEl.style.left = `${Math.round(r.left)}px`;
  dropdownEl.style.width = `${Math.max(420, r.width)}px`;
};

const CATEGORY_LABEL = {
  command: '⚡ Acciones rápidas',
  agent: '🤖 Agentes IA',
  tool: '🧰 Herramientas',
  view: '📂 Vistas',
};

const renderResults = (results, query) => {
  if (!dropdownEl) return;
  if (!results.length) {
    dropdownEl.innerHTML = `
      <div class="gs-empty">
        <div class="gs-empty-icon">🔍</div>
        <div class="gs-empty-text">Nada encontrado para "<strong>${escapeHtml(query)}</strong>"</div>
        <div class="gs-empty-hint">Probá: <em>lanzar misión, frenar agente, abrir canva, ver analytics…</em></div>
      </div>`;
    return;
  }
  // Agrupar por tipo manteniendo orden por score
  const groups = {};
  for (const r of results) {
    (groups[r.type] ||= []).push(r);
  }
  const order = ['command', 'agent', 'tool', 'view'];
  let i = 0;
  let html = '';
  for (const cat of order) {
    if (!groups[cat]?.length) continue;
    html += `<div class="gs-group-label">${CATEGORY_LABEL[cat]}</div>`;
    for (const r of groups[cat]) {
      const isActive = i === activeIndex;
      html += `
        <button class="gs-item ${isActive ? 'active' : ''}" role="option" data-idx="${i}">
          <span class="gs-item-icon">${r.icon ?? '·'}</span>
          <span class="gs-item-body">
            <span class="gs-item-title">${highlight(r.title, query)}</span>
            ${r.desc ? `<span class="gs-item-desc">${escapeHtml(r.desc)}</span>` : ''}
          </span>
          <span class="gs-item-enter">↵</span>
        </button>`;
      i++;
    }
  }
  html += `
    <div class="gs-footer">
      <span><kbd>↑↓</kbd> navegar</span>
      <span><kbd>↵</kbd> abrir</span>
      <span><kbd>Esc</kbd> cerrar</span>
      <span style="margin-left:auto;opacity:.6;">${results.length} resultados</span>
    </div>`;
  dropdownEl.innerHTML = html;
  dropdownEl.querySelectorAll('.gs-item').forEach((el) => {
    el.addEventListener('mouseenter', () => {
      activeIndex = Number(el.dataset.idx);
      updateActiveVisual();
    });
    el.addEventListener('click', () => {
      activeIndex = Number(el.dataset.idx);
      executeActive();
    });
  });
};

const updateActiveVisual = () => {
  if (!dropdownEl) return;
  dropdownEl.querySelectorAll('.gs-item').forEach((el, i) => {
    el.classList.toggle('active', Number(el.dataset.idx) === activeIndex);
  });
  // scrollIntoView del activo
  const activeEl = dropdownEl.querySelector('.gs-item.active');
  if (activeEl) activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
};

// ── Ejecución de un resultado ─────────────────────────────────────────────────
const executeItem = async (item) => {
  if (!item) return;
  closeDropdown();
  if (inputEl) {
    inputEl.value = '';
    inputEl.blur();
  }

  // Action handlers
  if (item.action === 'emergency-stop') {
    const btn = document.getElementById('cua-emergency-stop');
    if (btn) {
      btn.click();
      return;
    }
    // Fallback directo
    const { data: pending } = await apiSafe('/api/cu/mode/pending-approvals', []);
    await Promise.all(
      (pending ?? []).map((a) =>
        apiSafe(`/api/cu/mode/reject/${a.id}`, null, { method: 'POST', body: { reason: 'emergency-stop' } }),
      ),
    );
    await apiSafe('/api/cu/mode', null, {
      method: 'PUT',
      body: { mode: 'off', reason: 'Emergency stop search', changedBy: 'user' },
    });
    toast('🛑 Agente frenado', 'ok');
    return;
  }
  if (item.action === 'open-chatbot') {
    const fab = document.getElementById('chatbot-fab');
    fab?.click();
    return;
  }
  if (item.action === 'open-voice') {
    const fab = document.getElementById('voice-fab');
    fab?.click();
    return;
  }
  if (item.action === 'open-shortcuts') {
    if (typeof window.__openShortcuts === 'function') window.__openShortcuts();
    return;
  }
  if (item.action === 'open-notifications') {
    const bell = document.getElementById('fxn-bell') || document.getElementById('topbar-notif');
    bell?.click();
    return;
  }

  // ── Cerebro Maestro desde ⌘K ─────────────────────────────────────────────
  if (
    item.action === 'master-brain-carousel' ||
    item.action === 'master-brain-reel' ||
    item.action === 'master-brain-stories'
  ) {
    const format =
      item.action === 'master-brain-carousel' ? 'carousel' : item.action === 'master-brain-reel' ? 'reel' : 'stories';
    const topic = window.prompt('🧠 Cerebro Maestro — ¿sobre qué tema querés crear contenido?');
    if (!topic?.trim()) return;
    toast('🧠 Activando Cerebro Maestro…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/cu/master', null, {
        method: 'POST',
        body: { userInput: topic, intent: 'create-content', mode: 'supervisor', contentFormat: format, topic },
      });
      if (error) {
        toast('❌ Master Brain: ' + error, 'error');
        return;
      }
      toast(
        `✅ ${(data?.brainsActivated ?? []).length} cerebros · innovación ${data?.innovationScore ?? '?'}/100`,
        'ok',
      );
      // Navegar al studio correspondiente para ver los resultados
      window.location.hash =
        format === 'carousel' ? '#studio-carousel' : format === 'reel' ? '#studio-reel' : '#studio-stories';
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Branding Brain desde ⌘K ──────────────────────────────────────────────
  if (item.action === 'open-branding-brain') {
    window.location.hash = '#personalization';
    try {
      sessionStorage.setItem('feedia.open-tab', 'branding');
    } catch {
      /* noop */
    }
    toast('🏛️ Abriendo Branding Brain…', 'ok');
    return;
  }

  // ── DM Templates desde ⌘K ────────────────────────────────────────────────
  if (item.action === 'build-dm-templates') {
    toast('💬 Construyendo plantillas de DM con IA…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/dm/templates/build', null, { method: 'POST', body: {} });
      if (error) {
        toast('❌ DM Templates: ' + error, 'error');
        return;
      }
      const count = Object.keys(data?.templates ?? {}).length;
      toast(`✅ ${count} plantillas de auto-respuesta listas para tus DMs`, 'ok');
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Hashtag Strategy desde ⌘K ─────────────────────────────────────────────
  if (item.action === 'hashtag-strategy') {
    const topic = window.prompt('#️⃣ Estrategia de Hashtags — ¿sobre qué tema es el post?');
    if (!topic?.trim()) return;
    toast('#️⃣ Generando estrategia de hashtags…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/hashtags/strategy', null, {
        method: 'POST',
        body: { topic, format: 'carrusel', hook: topic },
      });
      if (error) {
        toast('❌ Hashtag Engine: ' + error, 'error');
        return;
      }
      toast(`✅ ${data?.total?.length ?? 0} hashtags · ${data?.rationale?.slice(0, 60) ?? ''}`, 'ok');
      // Copiar al clipboard
      try {
        await navigator.clipboard.writeText((data?.total ?? []).join(' '));
        toast('📋 Hashtags copiados al portapapeles', 'ok');
      } catch {
        /* noop */
      }
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── A/B Test desde ⌘K ────────────────────────────────────────────────────
  if (item.action === 'create-ab-test') {
    const topic = window.prompt('🧪 A/B Test — ¿sobre qué tema querés testear variantes de contenido?');
    if (!topic?.trim()) return;
    toast('🧪 Creando variantes A/B con IA…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/ab-tests', null, {
        method: 'POST',
        body: { topic, contentType: 'carrusel', metric: 'engagement_rate', variantCount: 2 },
      });
      if (error) {
        toast('❌ A/B Test: ' + error, 'error');
        return;
      }
      toast(`✅ Test creado: ${data?.test?.variants?.length ?? 0} variantes para "${topic}"`, 'ok');
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Schedule Queue desde ⌘K ──────────────────────────────────────────────
  if (item.action === 'schedule-queue') {
    toast('📅 Programando contenido en ventanas óptimas…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/queue/schedule', null, { method: 'POST', body: {} });
      if (error) {
        toast('❌ Queue: ' + error, 'error');
        return;
      }
      toast(`✅ ${data?.scheduled ?? 0} piezas programadas en horarios prime`, 'ok');
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Full Takeover desde ⌘K ───────────────────────────────────────────────
  if (item.action === 'master-full-takeover') {
    const confirmed = window.confirm(
      '🧠 Full Takeover activará TODOS los cerebros del sistema:\n• Canva Brain (diseño)\n• DM Engine (respuestas)\n• Comment Orchestrator\n• Hashtag Engine\n• Content Queue\n• Caption Generator\n\n¿Confirmar Full Takeover?',
    );
    if (!confirmed) return;
    toast('🧠 Full Takeover iniciado — activando todos los cerebros…', 'ok');
    try {
      const { data, error } = await apiSafe('/api/cu/master', null, {
        method: 'POST',
        body: {
          userInput: 'Gestión completa de la cuenta',
          intent: 'full-takeover',
          mode: 'supervisor',
          contentFormat: 'carrusel',
          topic: 'contenido de marca',
        },
      });
      if (error) {
        toast('❌ Full Takeover: ' + error, 'error');
        return;
      }
      const brains = data?.brainsActivated?.length ?? 0;
      const deliverables = data?.finalOutput?.deliverables?.length ?? 0;
      toast(`✅ Full Takeover completo · ${brains} cerebros · ${deliverables} entregables`, 'ok');
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Detect Trends desde ⌘K ──────────────────────────────────────────────
  if (item.action === 'detect-trends') {
    toast('📈 Detectando tendencias del nicho con IA…', 'ok');
    try {
      const res = await apiSafe('/api/trends/detect', 'POST', {});
      if (res.error) {
        toast('❌ ' + res.error, 'error');
        return;
      }
      const count = res.trends?.length ?? 0;
      const top = res.topPicks?.[0]?.name ?? '—';
      toast(`✅ ${count} tendencias detectadas · Top: "${top}" · Abriendo Studio Manager`, 'ok');
      window.location.hash = '#studio-manager';
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  // ── Analyze Competitors desde ⌘K ─────────────────────────────────────────
  if (item.action === 'analyze-competitors') {
    toast('🔍 Analizando competidores del nicho con IA…', 'ok');
    try {
      const res = await apiSafe('/api/competitors/analyze', 'POST', { handles: [] });
      if (res.error) {
        toast('❌ ' + res.error, 'error');
        return;
      }
      const count = res.competitors?.length ?? 0;
      const opps = res.topOpportunities?.length ?? 0;
      toast(`✅ ${count} competidores analizados · ${opps} oportunidades top · Abriendo Studio Manager`, 'ok');
      window.location.hash = '#studio-manager';
    } catch (err) {
      toast('❌ ' + err.message, 'error');
    }
    return;
  }

  if (item.route) {
    window.location.hash = `#${item.route}`;
    if (item.anchor) {
      // sessionStorage hint para que la vista destino enfoque el ancla
      try {
        sessionStorage.setItem('feedia.search.anchor', item.anchor);
      } catch {
        /* noop */
      }
    }
  }
};

const executeActive = () => {
  if (activeIndex < 0 || activeIndex >= currentResults.length) return;
  void executeItem(currentResults[activeIndex]);
};

// ── Open / Close ──────────────────────────────────────────────────────────────
const openDropdown = (query = '') => {
  ensureDropdown(inputEl);
  dropdownEl.style.display = 'block';
  activeIndex = 0;
  currentResults = search(query);
  renderResults(currentResults, query);
};

const closeDropdown = () => {
  if (dropdownEl) dropdownEl.style.display = 'none';
  activeIndex = -1;
};

// ── Init ──────────────────────────────────────────────────────────────────────
export const initGlobalSearch = ({ routeLabels }) => {
  buildRouteIndex(routeLabels);
  inputEl = document.getElementById('global-search');
  if (!inputEl) return;

  // Inyectar estilos una sola vez
  if (!document.getElementById('gs-style')) {
    const style = document.createElement('style');
    style.id = 'gs-style';
    style.textContent = GS_STYLES;
    document.head.appendChild(style);
  }

  inputEl.setAttribute('autocomplete', 'off');
  inputEl.setAttribute('spellcheck', 'false');
  inputEl.placeholder = 'Buscar: misión, agente, herramienta, vista… (⌘K)';

  // Input → buscar
  inputEl.addEventListener('input', () => {
    const q = inputEl.value;
    activeIndex = 0;
    currentResults = search(q);
    if (!dropdownEl) ensureDropdown(inputEl);
    dropdownEl.style.display = 'block';
    renderResults(currentResults, q);
  });

  // Focus → abrir dropdown vacío (top commands)
  inputEl.addEventListener('focus', () => {
    openDropdown(inputEl.value);
  });

  // Keyboard nav
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(currentResults.length - 1, activeIndex + 1);
      updateActiveVisual();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
      updateActiveVisual();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (currentResults.length > 0) {
        executeActive();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      inputEl.blur();
    }
  });

  // Click fuera → cerrar
  document.addEventListener('click', (e) => {
    if (!dropdownEl) return;
    if (e.target === inputEl || dropdownEl.contains(e.target)) return;
    closeDropdown();
  });

  // Cmd/Ctrl+K → abrir
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      inputEl.focus();
      inputEl.select();
    }
    // / como shortcut también (si no estás en input)
    if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
      e.preventDefault();
      inputEl.focus();
    }
  });
};

const GS_STYLES = `
.gs-dropdown {
  position: fixed; display: none; z-index: 10000;
  max-height: 480px; overflow-y: auto;
  background: var(--surface, #141418);
  border: 1px solid var(--border, #2a2a32);
  border-radius: 14px;
  box-shadow: 0 18px 50px rgba(0,0,0,.55), 0 0 0 1px rgba(168,85,247,.08);
  padding: 6px;
  animation: gsIn .14s cubic-bezier(.16,.84,.44,1);
}
@keyframes gsIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
.gs-group-label {
  padding: 8px 10px 4px; font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: .06em;
  color: var(--text-muted, #9CA3AF);
}
.gs-item {
  display: flex; align-items: center; gap: 12px; width: 100%;
  padding: 10px 12px; border: 0; border-radius: 8px;
  background: transparent; color: var(--fg, #fff);
  cursor: pointer; text-align: left; transition: background .1s;
}
.gs-item:hover, .gs-item.active {
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(168,85,247,.12));
}
.gs-item.active { box-shadow: 0 0 0 1px rgba(168,85,247,.4) inset; }
.gs-item-icon { font-size: 20px; line-height: 1; flex-shrink: 0; width: 26px; text-align: center; }
.gs-item-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.gs-item-title { font-size: 13.5px; font-weight: 600; line-height: 1.3; }
.gs-item-title mark { background: rgba(168,85,247,.35); color: #fff; border-radius: 3px; padding: 0 2px; }
.gs-item-desc {
  font-size: 11.5px; color: var(--text-muted, #9CA3AF); line-height: 1.4;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.gs-item-enter {
  font-size: 12px; color: var(--text-muted, #9CA3AF); opacity: 0;
  transition: opacity .12s; flex-shrink: 0;
}
.gs-item:hover .gs-item-enter, .gs-item.active .gs-item-enter { opacity: 1; }
.gs-footer {
  display: flex; gap: 12px; padding: 8px 10px; margin-top: 4px;
  border-top: 1px solid var(--border, #2a2a32);
  font-size: 11px; color: var(--text-muted, #9CA3AF);
}
.gs-footer kbd {
  background: var(--bg-elev, #1c1c22); border: 1px solid var(--border);
  border-radius: 4px; padding: 1px 5px; font-family: ui-monospace, monospace;
  font-size: 10px; box-shadow: 0 1px 0 var(--border);
}
.gs-empty { padding: 24px 16px; text-align: center; }
.gs-empty-icon { font-size: 32px; margin-bottom: 8px; opacity: .5; }
.gs-empty-text { font-size: 13px; margin-bottom: 6px; }
.gs-empty-hint { font-size: 11.5px; color: var(--text-muted, #9CA3AF); }
`;
