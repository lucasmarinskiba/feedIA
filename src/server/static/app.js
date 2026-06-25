import { initVoiceUI } from './lib/voiceUI.js';
import { initChatbotUI } from './lib/chatbotUI.js';
import { toast } from './lib/toast.js';
import { initTopbar, refreshTopbarState } from './lib/topbar.js';
import { initGlobalSearch } from './lib/globalSearch.js';
import { initPlatformSwitcher } from './lib/platform.js';
import { initShortcuts, openShortcuts } from './lib/shortcuts.js';
import { initOfflineBanner } from './lib/offlineBanner.js';
import './lib/sidebarGroups.js';
import './lib/quickPanel.js';
import './lib/uxPolish.js';

/* ══════════════════════════════════════════════════════════
   ROUTE TABLE — carga PEREZOSA (lazy) por vista.
   Solo se descarga/parsea el módulo de la vista al visitarla.
   Esto reduce drásticamente el tiempo de carga inicial.
   ══════════════════════════════════════════════════════════ */
const _modCache = new Map();
/* Cache-bust por deploy: cambia este string en cada release para forzar recarga
   de los módulos de vista (browser cachea el JS con max-age). */
const ASSET_V = '2026-05-29-16';
/* V(path, export) → thunk que resuelve a la función render, cacheado. */
const V = (path, name) => {
  const url = `${path}?v=${ASSET_V}`;
  const loader = () => {
    let p = _modCache.get(url);
    if (!p) {
      p = import(url);
      _modCache.set(url, p);
    }
    return p.then((m) => m[name]);
  };
  loader._path = url; // para prefetch (misma URL versionada)
  return loader;
};

const ROUTES = {
  feed: V('./views/feed.js', 'renderFeed'),
  'studio-carousel': V('./views/studioCarousel.js', 'renderCarouselStudio'),
  'studio-reel': V('./views/studioReel.js', 'renderReelStudio'),
  'studio-stories': V('./views/studioStories.js', 'renderStoriesStudio'),
  vision: V('./views/vision.js', 'renderVision'),
  predictor: V('./views/predictor.js', 'renderPredictor'),
  curator: V('./views/curator.js', 'renderCurator'),
  ugc: V('./views/ugc.js', 'renderUgc'),
  experiments: V('./views/experiments.js', 'renderExperiments'),
  collab: V('./views/collab.js', 'renderCollab'),
  inbox: V('./views/inbox.js', 'renderInbox'),
  crisis: V('./views/crisis.js', 'renderCrisis'),
  scheduler: V('./views/scheduler.js', 'renderScheduler'),
  settings: V('./views/settings.js', 'renderSettings'),
  tools: V('./views/tools.js', 'renderTools'),
  analytics: V('./views/analytics.js', 'renderAnalytics'),
  assistant: V('./views/assistant.js', 'renderAssistant'),
  calendar: V('./views/calendar.js', 'renderCalendar'),
  agents: V('./views/agents.js', 'renderAgents'),
  skills: V('./views/skills.js', 'renderSkills'),
  'studio-tiktok': V('./views/studioReel.js', 'renderTikTokStudio'),
  'studio-tiktok-script': V('./views/studioTikTokScript.js', 'renderTikTokScript'),
  'studio-tiktok-photo': V('./views/studioTikTokPhoto.js', 'renderTikTokPhoto'),
  audit: V('./views/audit.js', 'renderAudit'),
  optimize: V('./views/optimize.js', 'renderOptimize'),
  hooks: V('./views/hooks.js', 'renderHooks'),
  autopilot: V('./views/autopilot.js', 'renderAutopilot'),
  mission: V('./views/mission.js', 'renderMission'),
  inteligencia: V('./views/intelligence.js', 'renderIntelligence'),
  pantalla: V('./views/computeruse.js', 'renderComputerUse'),
  glassbox: V('./views/glassbox.js', 'renderGlassBox'),
  imperio: V('./views/imperio.js', 'renderImperio'),
  forge: V('./views/forge.js', 'renderForge'),
  freeCuDemo: V('./views/freeCuDemo.js', 'renderFreeCuDemo'),
  cuToolbox: V('./views/cuToolbox.js', 'renderCuToolbox'),
  equipo: V('./views/equipo.js', 'renderEquipo'),
  pizarra: V('./views/pizarra.js', 'renderPizarra'),
  agenda: V('./views/agenda.js', 'renderAgenda'),
  approvals: V('./views/workspace.js', 'renderApprovals'),
  bitacora: V('./views/workspace.js', 'renderBitacora'),
  alertas: V('./views/workspace.js', 'renderAlertas'),
  kanban: V('./views/workspace.js', 'renderKanban'),
  moodboard: V('./views/workspace.js', 'renderMoodboard'),
  reportes: V('./views/workspace.js', 'renderReportes'),
  simulador: V('./views/workspace.js', 'renderSimulador'),
  cliente: V('./views/workspace.js', 'renderCliente'),
  welcome: V('./views/welcome.js', 'renderWelcome'),
  home: V('./views/home.js', 'renderHome'),
  brujula: V('./views/brujula.js', 'renderBrujula'),
  handsfree: V('./views/handsfree.js', 'renderHandsFree'),
  brandkit: V('./views/brandkit.js', 'renderBrandKit'),
  achievements: V('./views/achievements.js', 'renderAchievements'),
  memorabilia: V('./views/memorabilia.js', 'renderMemorabilia'),
  personalization: V('./views/personalization.js', 'renderPersonalization'),
  rituals: V('./views/rituals.js', 'renderRituals'),
  community: V('./views/communityHub.js', 'renderCommunityHub'),
  taskboard: V('./views/taskboard.js', 'renderTaskboard'),
  'canva-runner': V('./views/canvaRunner.js', 'renderCanvaRunner'),
  replay: V('./views/replayLog.js', 'renderReplayLog'),
  'scores-history': V('./views/scoresHistory.js', 'renderScoresHistory'),
  'studio-manager': V('./views/studioManager.js', 'renderStudioManager'),
  admin: V('./views/admin.js', 'renderAdmin'),
};

/* Route labels for search */
const ROUTE_LABELS = {
  feed: 'Feed · Inicio · Dashboard',
  brujula: 'Brújula · Estratega del día · Movimiento del día · Plan',
  'studio-carousel': 'Carrusel · Crear carrusel · Slides',
  'studio-reel': 'Reel · Video · Crear reel',
  'studio-stories': 'Stories · Historia · Crear historia',
  vision: 'Vision IA · Analizar imagen · IA visual',
  predictor: 'Predictor · Predecir engagement · Score',
  curator: 'Backlog · Curador · Contenido curado',
  ugc: 'UGC · Contenido de usuarios · Repost',
  experiments: 'Experimentos · A/B test · Tests',
  collab: 'Collabs · Colaboraciones · Prospectos',
  inbox: 'Inbox · Mensajes · DMs · Comentarios',
  crisis: 'Crisis · Reputación · Alertas',
  scheduler: 'Scheduler · Programar · Automatizar',
  settings: 'Ajustes · Configuración · Cuentas · API keys',
  tools: 'Herramientas IA · Caption · Hashtags · Hooks · Repurpose',
  analytics: 'Analytics · Métricas · Estadísticas · Engagement · Seguidores',
  assistant: 'Asistente FeedIA · Chat IA · Estrategia · Consultar',
  calendar: 'Calendario · Planificar · Programar contenido · Semana',
  agents: 'Agentes IA · Especialistas · Algoritmo · Meta Ads · Viral · Humor',
  skills: 'Skills · Habilidades · Generador carrusel · Reel · Story · Catálogo de skills · Canva',
  'studio-tiktok': 'TikTok Video · Studio TikTok · Video vertical · FYP · 9:16 · hook 0-2s · completion',
  'studio-tiktok-script': 'Guion TikTok · Script video · Lenguaje no verbal · Retención · Beat a beat',
  'studio-tiktok-photo': 'Foto TikTok · Photo Mode · Carrusel tiktok · 9:16 · swipe · hook foto 1',
  audit: 'Audit semanal · KPIs · Score del sistema · Prioridades · Chief of Staff',
  optimize: 'Auto-optimización · Loop de aprendizaje · Patrones de éxito · Recomendaciones · Ajustes',
  hooks: 'Hook Library · Ganchos · Scorer · Patrones virales · Generador',
  autopilot: 'Autopilot · Pin Slate · Originality · Templates · Convo Router · Retention · Outreach',
  mission: 'Mission Control · Lanzar goals · Trazas · Knowledge Base · Bus · Multi-agente',
  inteligencia: 'Inteligencia · Presupuesto tokens · Bandits · Caché semántica · Digest · Aprendizaje',
  pantalla: 'Pantalla en vivo · Computer Use · Ver al sistema operar · Cursor · Mirar en vivo · Visual AI Agent',
  glassbox: 'GlassBox · Caja de Cristal · Supervisar acciones · Aprobar · Rechazar · Pausar agente',
  imperio: 'Sala Ejecutiva · Tu imperio · Apalancamiento · Equipo reemplazado · Estatus · Logros · Credencial',
  equipo: 'Tu equipo en vivo · Nova Lía Luca Gard · Actividad humanizada · Staff trabajando',
  pizarra: 'Pizarra · Pizarra virtual · Dibujar · Notas · Mapa conceptual · Indicaciones a la IA',
  agenda: 'Agenda · Cronograma · Qué va a hacer FeedIA · Indicaciones a la IA',
  approvals: 'Aprobaciones · Bandeja · Pendientes · Aprobar rechazar · Checkpoints',
  bitacora: 'Bitácora · Diario de la IA · Decisiones · Por qué · Trazas legibles',
  alertas: 'Alertas · Centro de alertas · Crisis · Compliance · Oportunidades',
  kanban: 'Kanban · Tablero de contenido · Pipeline · Idea Producción Publicado',
  moodboard: 'Moodboard · Brand Board · Identidad · Paleta · Tipografías · Voz',
  reportes: 'Reportes · Reporte ejecutivo · PDF · Resumen del sistema',
  simulador: 'Simulador · Qué pasaría si · Proyección de directiva',
  cliente: 'Modo Cliente · Vista ejecutiva · Solo lectura · Para el dueño de la marca',
  welcome: 'Bienvenida · Onboarding · Empezar acá · Unboxing · Setup inicial',
  home: 'Home · Inicio personalizado · Tu casa · Dashboard · Saludo del día',
  achievements: 'Logros · Trofeos · Galería · Achievements · Desbloqueos · Coleccionables',
  memorabilia: 'Memorabilia · Memorias · Recuerdos · Throwback · Yearbook · Highlight reel',
  personalization: 'Personalización · Tema · Mascot · Voz · Identidad · Apariencia · Setup',
  rituals: 'Rituales · Mañana · Noche · Lunes kickoff · Cierre Viernes · Daily ritual',
  community: 'Community Hub · Inbox · Leads · FAQ · Fans · UGC · Menciones · Soporte',
  taskboard: 'Task Board · Kanban del equipo · Tareas · Workload · Daily standup',
  'canva-runner': 'Canva → Instagram · Pipeline visual · Cursor diseñando · Auto-publish',
  replay: 'Replay · Sesiones grabadas · Computer Use · Paso a paso · Auditoría visual',
  'scores-history': '📊 Historial de Scores · Innovación · Influencer · Coherencia · Tendencias',
  'studio-manager':
    'Studio Manager · CU Brain · Master Brain · Queue · A/B Tests · DMs · Hashtags · Trending · Competidores',
  admin: 'Admin · Monitoreo · Métricas · Logs · Observabilidad · Sistema',
};

/* ══════════════════════════════════════════════════════════
   CORE ELEMENTS (lazy-evaluated to ensure DOM ready)
   ══════════════════════════════════════════════════════════ */
let _$view = null;
const getView = () => {
  if (!_$view) _$view = document.querySelector('#view');
  return _$view;
};
Object.defineProperty(window, '$view', {
  get: getView,
  configurable: true,
});
const $fabMenu = document.querySelector('#fab-menu');
const $fabBtn = document.querySelector('#fab-btn');
const $fabBdrop = document.querySelector('#fab-backdrop');
const $searchOv = document.querySelector('#mobile-search-overlay');
const $searchBtn = document.querySelector('#mobile-search-btn');
const $closeSearch = document.querySelector('#close-search-btn');
const $mobileSearch = document.querySelector('#mobile-search-input');
const $desktopSearch = document.querySelector('#global-search');

/* ══════════════════════════════════════════════════════════
   NAVIGATE
   ══════════════════════════════════════════════════════════ */
let _currentRoute = '';

const navigate = async (route) => {
  if (!ROUTES[route]) route = 'feed';
  _currentRoute = route;

  /* Active state — sidebar + bottom nav (+ a11y aria-current) */
  document.querySelectorAll('[data-route]').forEach((el) => {
    const isNav = el.classList.contains('nav-item') || el.classList.contains('bottom-nav-item');
    if (isNav) {
      const on = el.dataset.route === route;
      el.classList.toggle('active', on);
      if (on) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    }
  });

  /* Close FAB + overlays + desktop search dropdown */
  closeFab();
  closeSearch();
  if ($desktopSearch) {
    $desktopSearch.value = '';
  }
  clearSearchDropdown();

  /* Render view — skeleton coherente + scroll al tope (vista fresca arriba) */
  $view.innerHTML = `<div class="loading-screen" aria-busy="true" aria-label="cargando" style="display:block;padding:4px 2px;">
      <div class="skeleton" style="height:34px;width:42%;border-radius:10px;"></div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:18px;">
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:60%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:80%;margin-top:8px"></div></div>
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:55%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:70%;margin-top:8px"></div></div>
        <div class="card" style="padding:18px;"><div class="skeleton" style="height:20px;width:65%"></div><div class="skeleton" style="height:13px;margin-top:10px"></div><div class="skeleton" style="height:13px;width:75%;margin-top:8px"></div></div>
      </div></div>`;
  try {
    document.querySelector('#main-content')?.scrollTo({ top: 0 });
    window.scrollTo(0, 0);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent('fx:net', { detail: { delta: 1 } }));

  try {
    const render = await ROUTES[route](); // descarga perezosa del módulo (cacheado)
    if ($view) await render($view);
    else console.error('[navigate] $view null — #view not in DOM');
    /* Imágenes: lazy + decode async (no bloquean el primer pintado) */
    try {
      $view.querySelectorAll('img:not([loading])').forEach((i) => {
        i.loading = 'lazy';
        i.decoding = 'async';
      });
    } catch {
      /* noop */
    }
    history.replaceState(null, '', `#${route}`);
  } catch (err) {
    // Detecta el error específico de "import() devolvió HTML en vez de JS"
    // (servidor desactualizado: el cliente pidió /views/foo.js y el server le devolvió index.html).
    const rawMsg = err && err.message ? String(err.message) : 'Error desconocido';
    const looksLikeHtmlImport =
      /Unexpected token '<'|<!doctype|<!DOCTYPE/i.test(rawMsg) ||
      /Failed to fetch dynamically imported module/i.test(rawMsg) ||
      /MIME type \("text\/html"\)/i.test(rawMsg);

    const isCachebuster = sessionStorage.getItem(`__retry_${route}`) === '1';

    if (looksLikeHtmlImport && !isCachebuster) {
      // Intento automático: cache-bust del módulo y reintento UNA vez (silencioso).
      sessionStorage.setItem(`__retry_${route}`, '1');
      const loader = ROUTES[route];
      if (loader && loader._path) {
        try {
          // Forzar fetch fresco evitando cualquier cache HTTP/SW
          const bust = `?bust=${Date.now()}`;
          const mod = await import(loader._path + bust);
          const fnName = Object.keys(mod).find((k) => typeof mod[k] === 'function');
          if (fnName) {
            $view.innerHTML = '';
            await mod[fnName]($view);
            sessionStorage.removeItem(`__retry_${route}`);
            return;
          }
        } catch (retryErr) {
          // El segundo intento también falló → mensaje accionable
          console.error('[navigate] retry failed:', retryErr); // eslint-disable-line no-console
        }
      }
    }
    sessionStorage.removeItem(`__retry_${route}`);

    const isHtmlError = looksLikeHtmlImport;
    const title = isHtmlError ? 'Servidor desactualizado' : 'Error al cargar la vista';
    const explanation = isHtmlError
      ? `La vista "${route}" no está disponible en el servidor (te devolvió HTML donde esperaba JavaScript).<br>Probable causa: el código del backend cambió pero el servidor no se reinició.`
      : rawMsg;
    const action = isHtmlError
      ? `<div class="small muted" style="margin-top:14px;">Solución: <code style="background:var(--bg-card-2,#1a1f25);padding:2px 6px;border-radius:4px;">npm run build &amp;&amp; npm start</code></div>
         <div style="display:flex;gap:8px;justify-content:center;margin-top:18px;">
           <button class="btn" onclick="location.reload(true)">↻ Recargar (hard)</button>
           <button class="btn ghost" onclick="location.hash='feed'">← Volver al Feed</button>
         </div>`
      : `<button class="btn ghost" style="margin-top:20px;" onclick="navigate('${route}')">↻ Reintentar</button>`;

    $view.innerHTML = `
      <div style="padding:40px 24px;text-align:center;max-width:560px;margin:0 auto;">
        <div style="font-size:40px;margin-bottom:16px;">${isHtmlError ? '🔄' : '⚠️'}</div>
        <div class="small" style="color:var(--crit);font-weight:700;margin-bottom:8px;">${title}</div>
        <div class="small muted" style="line-height:1.5;">${explanation}</div>
        ${action}
      </div>`;
    if (!isHtmlError) toast(rawMsg, 'crit');
    console.error('[navigate]', route, err); // eslint-disable-line no-console
  } finally {
    window.dispatchEvent(new CustomEvent('fx:net', { detail: { delta: -1 } }));
  }
};

/* ══════════════════════════════════════════════════════════
   FAB MENU
   ══════════════════════════════════════════════════════════ */
const openFab = () => {
  $fabMenu?.classList.add('open');
  $fabBtn?.classList.add('open');
  document.body.style.overflow = 'hidden';
};
const closeFab = () => {
  $fabMenu?.classList.remove('open');
  $fabBtn?.classList.remove('open');
  document.body.style.overflow = '';
};
const toggleFab = () => ($fabMenu?.classList.contains('open') ? closeFab() : openFab());

$fabBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleFab();
});
$fabBdrop?.addEventListener('click', closeFab);

/* Close FAB on Escape */
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeFab();
    closeSearch();
  }
});

/* ══════════════════════════════════════════════════════════
   MOBILE SEARCH OVERLAY
   ══════════════════════════════════════════════════════════ */
const openSearch = () => {
  $searchOv?.classList.add('open');
  setTimeout(() => $mobileSearch?.focus(), 80);
};
const closeSearch = () => {
  $searchOv?.classList.remove('open');
  if ($mobileSearch) $mobileSearch.value = '';
  clearSearchDropdown();
};

$searchBtn?.addEventListener('click', openSearch);
$closeSearch?.addEventListener('click', closeSearch);

/* ══════════════════════════════════════════════════════════
   SEARCH — shared logic for both desktop & mobile
   ══════════════════════════════════════════════════════════ */
let _searchDropdown = null;

const buildSearchDropdown = (query, anchor) => {
  clearSearchDropdown();
  if (!query.trim()) return;

  const q = query.toLowerCase();
  const matches = Object.entries(ROUTE_LABELS)
    .filter(([, label]) => label.toLowerCase().includes(q))
    .slice(0, 6);

  if (!matches.length) return;

  _searchDropdown = document.createElement('div');
  _searchDropdown.className = 'search-dropdown';
  _searchDropdown.innerHTML = matches
    .map(([route, label]) => {
      const first = label.split(' · ')[0];
      return `<button class="search-dropdown-item" data-route="${route}">${first}</button>`;
    })
    .join('');

  _searchDropdown.querySelectorAll('[data-route]').forEach((btn) => {
    btn.addEventListener('click', () => {
      navigate(btn.dataset.route);
      if (anchor === $desktopSearch) anchor.value = '';
      clearSearchDropdown();
    });
  });

  anchor.parentElement.style.position = 'relative';
  anchor.parentElement.appendChild(_searchDropdown);
};

const clearSearchDropdown = () => {
  _searchDropdown?.remove();
  _searchDropdown = null;
};

$desktopSearch?.addEventListener('input', (e) => buildSearchDropdown(e.target.value, $desktopSearch));
$desktopSearch?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = _searchDropdown?.querySelector('[data-route]');
    if (first) {
      navigate(first.dataset.route);
      $desktopSearch.value = '';
      clearSearchDropdown();
    }
  }
  if (e.key === 'Escape') {
    $desktopSearch.value = '';
    clearSearchDropdown();
  }
});
$desktopSearch?.addEventListener('blur', () => setTimeout(clearSearchDropdown, 200));

$mobileSearch?.addEventListener('input', (e) => buildSearchDropdown(e.target.value, $mobileSearch));
$mobileSearch?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const first = _searchDropdown?.querySelector('[data-route]');
    if (first) {
      navigate(first.dataset.route);
    }
  }
});

/* ══════════════════════════════════════════════════════════
   WIRE ALL [data-route] ELEMENTS
   ══════════════════════════════════════════════════════════ */
const wireNavButtons = () => {
  document.querySelectorAll('[data-route]').forEach((el) => {
    /* Skip FAB toggle button — it has its own listener */
    if (el.id === 'fab-btn') return;
    /* Avoid double-binding */
    if (el.dataset.wired) return;
    el.dataset.wired = '1';

    el.addEventListener('click', () => {
      const route = el.dataset.route;
      if (route) navigate(route);
    });
  });
};

wireNavButtons();

/* ══════════════════════════════════════════════════════════
   HASH-BASED NAVIGATION (back/forward + deep links)
   ══════════════════════════════════════════════════════════ */
window.addEventListener('popstate', () => {
  const r = location.hash.replace('#', '') || 'feed';
  if (ROUTES[r] && r !== _currentRoute) navigate(r);
});

/* ══════════════════════════════════════════════════════════
   LIVE BADGES — inbox count, crisis alert
   ══════════════════════════════════════════════════════════ */
const refreshBadges = async () => {
  try {
    const r = await fetch('/api/crisis/status');
    if (r.ok) {
      const crisis = await r.json();
      const badge = document.querySelector('#nb-crisis');
      if (badge) badge.style.display = crisis?.publicacionesPausadas ? '' : 'none';
    }
  } catch {
    /* non-blocking */
  }
  try {
    const a = await fetch('/api/approvals');
    if (a.ok) {
      const q = await a.json();
      const b = document.querySelector('#nb-approvals');
      if (b) {
        b.textContent = q.count > 0 ? String(q.count) : '';
        b.style.display = q.count > 0 ? '' : 'none';
      }
    }
  } catch {
    /* non-blocking */
  }
  try {
    const al = await fetch('/api/alerts');
    if (al.ok) {
      const d = await al.json();
      const b = document.querySelector('#nb-alertas');
      if (b) b.style.display = d.critical > 0 ? '' : 'none';
    }
  } catch {
    /* non-blocking */
  }
};

/* ══════════════════════════════════════════════════════════
   BRAND FOOTER
   ══════════════════════════════════════════════════════════ */
const loadBrand = async () => {
  try {
    const r = await fetch('/api/brand');
    if (!r.ok) return;
    const brand = await r.json();
    const footer = document.querySelector('#brand-footer');
    if (!footer) return;
    const initial = (brand.name || '?').charAt(0).toUpperCase();
    const av = footer.querySelector('.brand-avatar');
    if (av) {
      av.setAttribute('data-letter', initial);
      av.textContent = initial;
    }
    const nm = footer.querySelector('.brand-name');
    if (nm) nm.textContent = brand.name ?? 'Mi marca';
    const ni = footer.querySelector('.brand-niche');
    if (ni) ni.textContent = brand.niche ?? '';
  } catch {
    /* ignore */
  }
};

/* ══════════════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════════════ */
loadBrand();
refreshBadges();
const _badgeInterval = setInterval(refreshBadges, 60_000);
// Stored so environments can clear it if needed
window._badgeInterval = _badgeInterval;

/* Hands-free voice engine ("Hola FeedIA") — aislado para no tirar el chatbot si falla */
try {
  initVoiceUI({ navigate });
} catch (err) {
  console.error('[voiceUI] init falló:', err);
}

/* Asistente FeedIA — chatbot flotante junto al micrófono */
try {
  initChatbotUI({ navigate });
} catch (err) {
  console.error('[chatbotUI] init falló:', err);
}

/* Account menu — dropdown del brand-footer (agregar cuenta, logout, close account) */
try {
  const { initAccountMenu } = await import('./lib/accountMenu.js');
  await initAccountMenu();
} catch (err) {
  console.error('[accountMenu] init falló:', err);
}

/* Topbar · CUA Mode + global search + voice narrator toggle */
window.__feediaRouteSearch = (q) => {
  const match = Object.entries(ROUTE_LABELS).find(([_id, label]) => label.toLowerCase().includes(q));
  if (match) navigate(match[0]);
};
initTopbar();
window.__refreshTopbar = refreshTopbarState;

/* Global search · autocomplete + keyboard nav + quick actions */
try {
  initGlobalSearch({ routeLabels: ROUTE_LABELS });
} catch (err) {
  console.error('[globalSearch] init falló:', err);
}

/* Switcher de plataforma Instagram / TikTok */
try {
  initPlatformSwitcher();
} catch (err) {
  console.error('[platform] init falló:', err);
}

/* Keyboard shortcuts overlay · "?" o Cmd/Ctrl+/ */
try {
  initShortcuts();
  window.__openShortcuts = openShortcuts;
} catch (err) {
  console.error('[shortcuts] init falló:', err);
}

/* Banner offline · ping cada 30s, banner persistente cuando 2+ fallos */
try {
  initOfflineBanner();
} catch (err) {
  console.error('[offlineBanner] init falló:', err);
}

/* Toast global exponer para que offlineBanner pueda usarlo */
window.__feediaToast = toast;

/* Owner-only: inyecta acceso al admin panel en la sidebar si role === 'owner' */
(async () => {
  try {
    const r = await fetch('/api/auth/me');
    if (!r.ok) return;
    const { user } = await r.json();
    if (!user || (user.role !== 'owner' && user.plan !== 'owner')) return;
    // Inyectar botón admin al final del sidebar (antes del brand-footer)
    const sidebar = document.querySelector('#sidebar nav, aside nav, .sidebar nav, nav.sidebar');
    if (!sidebar) return;
    if (sidebar.querySelector('[data-route="admin"]')) return; // ya existe
    const btn = document.createElement('button');
    btn.className = 'nav-item';
    btn.dataset.route = 'admin';
    btn.title = 'Admin · Solo owner';
    btn.innerHTML = `<span class="nav-icon">⚙️</span><span class="nav-label">Admin</span>`;
    btn.addEventListener('click', () => navigate('admin'));
    sidebar.appendChild(btn);
  } catch {
    /* non-blocking */
  }
})();

/* Initial route from hash or default feed */
const _initial = location.hash.replace('#', '') || 'feed';
navigate(ROUTES[_initial] ? _initial : 'feed');

/* ══════════════════════════════════════════════════════════
   EXPERIENCIA DE ENTRADA — ritual de bienvenida + ribbon ambiente
   ══════════════════════════════════════════════════════════ */
const bootExperience = async () => {
  let w;
  try {
    const r = await fetch('/api/experience/welcome');
    if (!r.ok) return;
    w = await r.json();
  } catch {
    return;
  }

  if (!document.querySelector('#fx-style')) {
    const st = document.createElement('style');
    st.id = 'fx-style';
    st.textContent = `
      .fx-ribbon{display:flex;align-items:center;gap:10px;padding:8px 16px;font-size:13px;
        background:linear-gradient(90deg,rgba(225,48,108,.14),rgba(168,85,247,.10),transparent);
        border-bottom:1px solid var(--border);color:var(--text-primary,var(--fg));}
      .fx-pulse{width:9px;height:9px;border-radius:50%;background:#4ade80;box-shadow:0 0 0 0 rgba(74,222,128,.7);animation:fxp 2s infinite;}
      @keyframes fxp{70%{box-shadow:0 0 0 9px rgba(74,222,128,0)}100%{box-shadow:0 0 0 0 rgba(74,222,128,0)}}
      .fx-tier{margin-left:auto;font-weight:800;letter-spacing:.08em;font-size:11px;padding:3px 10px;border-radius:999px;background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;cursor:pointer;}
      .fx-ov{position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;
        background:rgba(6,6,8,.86);backdrop-filter:blur(6px);animation:fxf .4s ease;}
      @keyframes fxf{from{opacity:0}to{opacity:1}}
      .fx-card{max-width:520px;width:92%;background:var(--bg-card,#15151b);
        border:1px solid var(--border);border-radius:20px;padding:34px 30px;text-align:center;
        color:var(--text-primary,var(--fg));box-shadow:var(--shadow-lg,0 18px 50px rgba(0,0,0,.5));}
      .fx-card h2{font-size:24px;margin:0 0 6px;color:var(--text-primary,var(--fg));}
      .fx-card .fx-sub{color:var(--text-secondary,var(--fg));opacity:.85;font-size:15px;line-height:1.6;margin:8px 0 18px;}
      .fx-stats{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0 20px;}
      .fx-chip{background:var(--bg-card-2,var(--bg-elevated,#15151b));border:1px solid var(--border);border-radius:12px;padding:10px 14px;min-width:84px;color:var(--text-primary,var(--fg));}
      .fx-chip b{display:block;font-size:22px;background:linear-gradient(90deg,#e1306c,#22d3ee);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      .fx-chip span{font-size:11px;opacity:.65;color:var(--text-tertiary,var(--fg));}
      .fx-next{background:rgba(168,85,247,.12);border:1px solid rgba(168,85,247,.35);border-radius:12px;padding:12px 14px;font-size:14px;margin-bottom:18px;color:var(--text-primary,var(--fg));}
      .fx-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}

      /* Light mode overrides — sin negros pesados */
      html[data-theme="light"] .fx-card{background:#ffffff;border-color:rgba(17,18,22,.10);box-shadow:0 18px 50px rgba(20,22,30,.18);}
      html[data-theme="light"] .fx-card h2{color:#16171c;background:linear-gradient(90deg,#16171c,#a83a7e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;}
      html[data-theme="light"] .fx-card .fx-sub{color:#474a54;}
      html[data-theme="light"] .fx-chip{background:#f5f6f8;border-color:rgba(17,18,22,.10);color:#16171c;}
      html[data-theme="light"] .fx-chip span{color:#7c7f8a;}
      html[data-theme="light"] .fx-next{background:rgba(168,85,247,.08);border-color:rgba(168,85,247,.25);color:#16171c;}
      html[data-theme="light"] .fx-ov{background:rgba(235,237,240,.65);}
      html[data-theme="light"] .fx-ribbon{background:linear-gradient(90deg,rgba(225,48,108,.07),rgba(168,85,247,.05),transparent);color:#16171c;}`;
    document.head.appendChild(st);
  }

  // Ribbon ambiente (siempre presente, en cada pantalla).
  const main = document.querySelector('#main-content');
  const viewEl = document.querySelector('#view');
  if (main && viewEl && !document.querySelector('#fx-ribbon')) {
    const rb = document.createElement('div');
    rb.id = 'fx-ribbon';
    rb.className = 'fx-ribbon';
    rb.innerHTML = `<span class="fx-pulse"></span>
      <span><b>${(w.saludo || 'Hola').replace(/</g, '')}</b> · tu equipo de ${w.equipoActivo || 0} está operando para vos</span>
      <span class="fx-tier" id="fx-tier" title="Ir a tu Sala Ejecutiva">${(w.tier || 'Bronce').toUpperCase()}</span>`;
    main.insertBefore(rb, viewEl);
    rb.querySelector('#fx-tier')?.addEventListener('click', () => navigate('imperio'));
  }

  // Ritual de bienvenida — una vez por sesión de navegador.
  if (sessionStorage.getItem('fx_welcomed') === '1') return;
  sessionStorage.setItem('fx_welcomed', '1');

  const d = w.desdeUltimaVisita || {};
  const ov = document.createElement('div');
  ov.className = 'fx-ov';
  ov.innerHTML = `
    <div class="fx-card">
      <div style="font-size:34px;margin-bottom:6px;">${w.primeraVez ? '👑' : '☕'}</div>
      <h2>${w.primeraVez ? `Bienvenido, ${escapeHtml(w.marca || '')}` : `${escapeHtml(w.saludo || 'Hola')}`}</h2>
      <div class="fx-sub">${escapeHtml(d.titular || 'Tu equipo está listo.')}</div>
      ${
        w.primeraVez
          ? ''
          : `<div class="fx-stats">
        <div class="fx-chip"><b>${d.misiones ?? 0}</b><span>misiones</span></div>
        <div class="fx-chip"><b>${d.carruseles ?? 0}</b><span>carruseles</span></div>
        <div class="fx-chip"><b>${d.decisiones ?? 0}</b><span>decisiones</span></div>
        <div class="fx-chip"><b>${d.horas ?? 0}h</b><span>sin vos</span></div>
      </div>`
      }
      <div class="fx-next">💡 ${escapeHtml(w.proximaIndicacion || '')}</div>
      <div class="fx-btns">
        <button class="btn primary" id="fx-go">${w.primeraVez ? 'Empezar a comandar' : 'Ver mi imperio'}</button>
        <button class="btn ghost" id="fx-close">Entrar al panel</button>
      </div>
    </div>`;
  document.body.appendChild(ov);
  const close = () => ov.remove();
  ov.querySelector('#fx-close')?.addEventListener('click', close);
  ov.querySelector('#fx-go')?.addEventListener('click', () => {
    close();
    navigate('imperio');
  });
  ov.addEventListener('click', (e) => {
    if (e.target === ov) close();
  });
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
}

bootExperience();

/* ══════════════════════════════════════════════════════════
   QUOTA EXCEEDED MODAL — Listener global 402 → upgrade prompt
   ══════════════════════════════════════════════════════════ */
window.addEventListener('feedia:quotaExceeded', (e) => {
  const p = e.detail || {};
  if (document.getElementById('feedia-quota-modal')) return; // ya abierto
  const modal = document.createElement('div');
  modal.id = 'feedia-quota-modal';
  modal.innerHTML = `
    <div class="qm-backdrop"></div>
    <div class="qm-card">
      <div class="qm-emoji">🔒</div>
      <h2 class="qm-title">Llegaste al límite</h2>
      <p class="qm-reason">${(p.reason || 'Quota excedida en tu plan actual.').replace(/</g, '&lt;')}</p>
      ${
        p.used !== undefined && p.limit !== undefined
          ? `
        <div class="qm-bar"><div class="qm-bar-fill" style="width:100%;"></div></div>
        <div class="qm-stats"><span>Usado ${p.used}</span><span>Límite ${p.limit === -1 ? '∞' : p.limit}</span></div>
      `
          : ''
      }
      <p class="qm-plan">Plan actual: <strong>${(p.currentPlan || 'free').toUpperCase()}</strong></p>
      <div class="qm-actions">
        <button class="qm-btn ghost" id="qm-close">Cerrar</button>
        <a class="qm-btn primary" href="${p.upgradeUrl || '/pricing.html'}">Ver planes →</a>
      </div>
    </div>`;
  document.body.appendChild(modal);
  if (!document.getElementById('qm-style')) {
    const st = document.createElement('style');
    st.id = 'qm-style';
    st.textContent = `
      #feedia-quota-modal{position:fixed;inset:0;z-index:10080;display:flex;align-items:center;justify-content:center;}
      .qm-backdrop{position:absolute;inset:0;background:rgba(6,6,8,.7);backdrop-filter:blur(4px);animation:qmf .25s ease;}
      @keyframes qmf{from{opacity:0}to{opacity:1}}
      .qm-card{position:relative;background:var(--bg-card,#15161B);border:1px solid var(--border);border-radius:18px;padding:30px 28px;max-width:420px;width:92%;text-align:center;box-shadow:0 24px 60px rgba(0,0,0,.5);animation:qmu .3s cubic-bezier(.16,.84,.44,1);color:var(--text-primary,#fff);}
      @keyframes qmu{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
      .qm-emoji{font-size:40px;margin-bottom:8px;}
      .qm-title{font-size:22px;letter-spacing:-0.02em;margin:0 0 6px;}
      .qm-reason{font-size:14px;color:var(--text-secondary,#aab);line-height:1.5;margin-bottom:16px;}
      .qm-bar{height:6px;background:rgba(239,68,68,.15);border-radius:99px;overflow:hidden;margin:12px 0 6px;}
      .qm-bar-fill{height:100%;background:linear-gradient(90deg,#f59e0b,#ef4444);}
      .qm-stats{display:flex;justify-content:space-between;font-size:11px;color:var(--text-secondary,#aab);margin-bottom:12px;}
      .qm-plan{font-size:13px;margin-bottom:18px;color:var(--text-secondary,#aab);}
      .qm-plan strong{color:var(--text-primary,#fff);}
      .qm-actions{display:flex;gap:8px;}
      .qm-btn{flex:1;padding:11px 16px;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;text-decoration:none;text-align:center;border:0;font-family:inherit;}
      .qm-btn.ghost{background:rgba(255,255,255,.06);color:var(--text-primary,#fff);}
      .qm-btn.primary{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .qm-btn.primary:hover{filter:brightness(1.08);}`;
    document.head.appendChild(st);
  }
  const close = () => modal.remove();
  modal.querySelector('#qm-close').addEventListener('click', close);
  modal.querySelector('.qm-backdrop').addEventListener('click', close);
});

/* ══════════════════════════════════════════════════════════
   COMMAND PALETTE — Ctrl/Cmd+K · "decile a FeedIA" en una frase
   ══════════════════════════════════════════════════════════ */
const bootCommandPalette = () => {
  if (!document.querySelector('#cmdk-style')) {
    const st = document.createElement('style');
    st.id = 'cmdk-style';
    st.textContent = `
      .cmdk-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:flex-start;justify-content:center;
        padding-top:14vh;background:rgba(6,6,8,.7);backdrop-filter:blur(8px);animation:cmf .18s ease;}
      @keyframes cmf{from{opacity:0}to{opacity:1}}
      .cmdk{width:min(620px,92%);background:#15151b;border:1px solid #2c2c38;border-radius:16px;
        box-shadow:0 24px 70px rgba(0,0,0,.6);overflow:hidden;animation:cms .2s cubic-bezier(.2,.8,.2,1);}
      @keyframes cms{from{transform:translateY(-12px) scale(.98);opacity:.6}to{transform:none;opacity:1}}
      .cmdk input{width:100%;border:0;background:transparent;color:#fff;font-size:18px;padding:20px 22px;outline:none;}
      .cmdk-hint{padding:0 22px 12px;color:#7a7a88;font-size:12px;display:flex;gap:8px;align-items:center;}
      .cmdk-kbd{border:1px solid #3a3a46;border-radius:6px;padding:1px 6px;font-size:11px;color:#aab;}
      .cmdk-res{border-top:1px solid #24242e;padding:16px 22px;display:none;}
      .cmdk-res.on{display:block;}
      .cmdk-act{display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,rgba(225,48,108,.16),rgba(168,85,247,.10));
        border:1px solid rgba(168,85,247,.4);border-radius:12px;padding:14px 16px;cursor:pointer;transition:filter .15s;}
      .cmdk-act:hover{filter:brightness(1.15);}
      .cmdk-act b{font-size:15px;}
      .cmdk-reply{color:#aab;font-size:13px;margin:0 22px 8px;line-height:1.5;}
      .cmdk-go{margin-left:auto;font-size:12px;color:#fff;background:linear-gradient(90deg,#e1306c,#a855f7);
        border-radius:999px;padding:5px 12px;font-weight:700;}
      .cmdk-list{border-top:1px solid #24242e;max-height:46vh;overflow:auto;padding:8px;}
      .cmdk-sec{font-size:11px;letter-spacing:.1em;color:#6a6a78;padding:10px 14px 4px;text-transform:uppercase;}
      .cmdk-row{display:flex;align-items:center;gap:12px;padding:11px 14px;border-radius:10px;cursor:pointer;}
      .cmdk-row .cr-ic{font-size:16px;width:20px;text-align:center;}
      .cmdk-row .cr-tx{flex:1;min-width:0;font-size:14px;color:#e8e8ef;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .cmdk-row .cr-tag{font-size:10px;color:#8a8a98;border:1px solid #33333f;border-radius:6px;padding:1px 7px;}
      .cmdk-row.sel,.cmdk-row:hover{background:linear-gradient(90deg,rgba(225,48,108,.16),rgba(168,85,247,.10));}
      .cmdk-row.sel .cr-tag{border-color:rgba(168,85,247,.5);color:#cbb6f5;}
      /* ── loading skeleton ── */
      .cmdk-loading{padding:18px 22px;display:flex;align-items:center;gap:12px;border-top:1px solid #24242e;}
      .cmdk-spin{width:18px;height:18px;border:2px solid #33333f;border-top-color:#a855f7;border-radius:50%;animation:cmspin .6s linear infinite;flex-shrink:0;}
      @keyframes cmspin{to{transform:rotate(360deg)}}
      .cmdk-spin-txt{font-size:13px;color:#7a7a88;}
      /* ── rich AI response ── */
      .cmdk-ai{border-top:1px solid #24242e;padding:16px 22px 4px;}
      .cmdk-ai-reply{font-size:14px;color:#d0d0e0;line-height:1.55;margin-bottom:10px;}
      .cmdk-ai-steps{margin:0 0 10px;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;}
      .cmdk-ai-steps li{font-size:12px;color:#6a6a78;padding-left:16px;position:relative;}
      .cmdk-ai-steps li::before{content:'→';position:absolute;left:0;color:#5a5a68;}
      .cmdk-ai-actions{display:flex;flex-wrap:wrap;gap:8px;padding-bottom:14px;}
      .cmdk-action-chip{display:inline-flex;align-items:center;gap:6px;padding:8px 14px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;border:1.5px solid;transition:filter .12s,transform .12s;}
      .cmdk-action-chip:hover{filter:brightness(1.12);transform:translateY(-1px);}
      .cmdk-action-chip.primary{background:linear-gradient(90deg,rgba(225,48,108,.18),rgba(168,85,247,.18));border-color:rgba(168,85,247,.5);color:#cbb6f5;}
      .cmdk-action-chip.secondary{background:transparent;border-color:#33333f;color:#9a9aa8;}
      .cmdk-action-chip.confirm{background:rgba(234,179,8,.1);border-color:rgba(234,179,8,.4);color:#fcd34d;}
      /* ── cmdk-hint-global: LEFT of the FAB column, same z-layer ── */
      .cmdk-hint-global{
        position:fixed !important; right:90px !important; bottom:22px !important; z-index:370 !important;
        font-size:13px; font-weight:600; color:var(--text-primary,#e8e8ef);
        background:var(--bg-elevated,#1a1a2e); border:1.5px solid var(--border-focus,#6366f1);
        border-radius:999px; padding:10px 18px; cursor:pointer; white-space:nowrap;
        box-shadow:0 4px 16px rgba(0,0,0,.3);
        transition:background .15s,color .15s,transform .15s,box-shadow .15s;
      }
      .cmdk-hint-global:hover{
        background:#a855f7 !important; color:#fff !important; border-color:transparent !important;
        transform:translateY(-2px); box-shadow:0 8px 24px rgba(168,85,247,.45);
      }
      @media(max-width:640px){
        .cmdk-hint-global{ right:80px !important; bottom:calc(var(--bottom-nav-h,60px) + 16px) !important; }
      }`;
    document.head.appendChild(st);
  }
  let ov = null;
  let t = null;
  let rows = []; // {ic,tx,kind:'suggest'|'route',text?,route?}
  let sel = 0;

  const RKEY = 'fx_cmd_recent';
  const getRecent = () => {
    try {
      return JSON.parse(localStorage.getItem(RKEY) || '[]');
    } catch {
      return [];
    }
  };
  const pushRecent = (text) => {
    if (!text || text.length < 3) return;
    const list = getRecent().filter((x) => x !== text);
    list.unshift(text);
    try {
      localStorage.setItem(RKEY, JSON.stringify(list.slice(0, 6)));
    } catch {
      /* ignore */
    }
  };

  const SUGGEST = {
    feed: ['subí un carrusel sobre lo último del nicho', 'hacé crecer la cuenta esta semana'],
    imperio: ['mostrame el reporte de mi imperio', 'generá el one-pager para inversores'],
    equipo: ['¿qué está haciendo mi equipo ahora?', 'respondé los DMs y comentarios'],
    inteligencia: ['¿cómo va el presupuesto de tokens?', 'mostrame el aprendizaje del sistema'],
    pantalla: ['mirá cómo armás un carrusel y lo subís', 'observá al sistema responder mensajes'],
    mission: ['lanzá una misión de crecimiento', 'planificá el contenido de la semana'],
  };
  const baseSuggest = [
    'subí un carrusel sobre X',
    'respondé los DMs',
    'subí 1 carrusel por día siempre',
    'mostrame mi imperio',
  ];

  const IMPACT = ['/api/carousel/run', '/api/swarm/mission', '/api/computer/watch', '/api/directives'];

  const doExec = async (route) => {
    const bid = window.fxBeacon && window.fxBeacon.start(`Tu equipo está en eso… ${route.action.label}`);
    try {
      const a = route.action;
      const r = await fetch(a.endpoint, {
        method: a.method || 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(a.body || {}),
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      if (window.fxBeacon) window.fxBeacon.done(bid, '✅ ' + route.reply);
      else toast('✅ ' + route.reply, 'ok');
    } catch (e) {
      if (window.fxBeacon) window.fxBeacon.fail(bid, '⚠️ No se pudo: ' + e.message);
      else toast('Error: ' + e.message, 'crit');
    }
  };

  const confirmThen = (route, onYes) => {
    const a = route.action;
    const detalle = a.body
      ? Object.entries(a.body)
          .filter(([, v]) => v !== undefined && v !== '' && typeof v !== 'object')
          .map(([k, v]) => `<div class="cfm-kv"><span>${escapeHtml(k)}</span><b>${escapeHtml(String(v))}</b></div>`)
          .join('')
      : '';
    const cf = document.createElement('div');
    cf.className = 'cmdk-ov';
    cf.style.zIndex = '10003';
    cf.innerHTML = `
      <div class="cmdk" style="padding:22px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:4px;">Confirmás esta acción?</div>
        <div style="color:#9aa;font-size:13px;margin-bottom:14px;line-height:1.5;">${escapeHtml(route.reply)}</div>
        <div style="background:#0f0f15;border:1px solid #2c2c38;border-radius:10px;padding:12px 14px;margin-bottom:16px;">
          <div style="font-weight:700;font-size:14px;margin-bottom:6px;">${escapeHtml(a.label)}</div>
          <div class="cfm-kv"><span>destino</span><b>${escapeHtml(a.method || 'POST')} ${escapeHtml(a.endpoint)}</b></div>
          ${detalle}
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="cfm-no" class="btn ghost">Cancelar</button>
          <button id="cfm-yes" class="btn primary">Sí, ejecutalo</button>
        </div>
      </div>
      <style>.cfm-kv{display:flex;justify-content:space-between;gap:14px;font-size:12px;color:#8a8a98;padding:2px 0;}
        .cfm-kv b{color:#dfe;font-weight:600;text-align:right;word-break:break-word;}</style>`;
    document.body.appendChild(cf);
    const kill = () => cf.remove();
    cf.addEventListener('click', (e) => {
      if (e.target === cf) kill();
    });
    cf.querySelector('#cfm-no').addEventListener('click', kill);
    cf.querySelector('#cfm-yes').addEventListener('click', () => {
      kill();
      onYes();
    });
    cf.querySelector('#cfm-yes').focus();
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape') {
        kill();
        document.removeEventListener('keydown', esc);
      }
    });
  };

  const exec = async (route, typed) => {
    if (typed) pushRecent(typed);
    if (route.action.kind === 'navigate') {
      close();
      navigate(route.action.route);
      return;
    }
    close();
    // Transparencia: las acciones de impacto piden confirmación explícita
    // mostrando qué se va a ejecutar y con qué datos.
    if (IMPACT.includes(route.action.endpoint)) {
      confirmThen(route, () => doExec(route));
      return;
    }
    await doExec(route);
  };

  const showLoading = (msg = 'FeedIA está pensando…') => {
    const box = ov.querySelector('#cmdk-main');
    box.innerHTML = `<div class="cmdk-loading"><div class="cmdk-spin"></div><span class="cmdk-spin-txt">${escapeHtml(msg)}</span></div>`;
  };

  const renderRichResult = (route, typed) => {
    ov._route = route;
    ov._typed = typed;
    const actions = route.actions?.length ? route.actions : route.action ? [route.action] : [];
    const stepsHtml = route.steps?.length
      ? `<ul class="cmdk-ai-steps">${route.steps.map((s) => `<li>${escapeHtml(s)}</li>`).join('')}</ul>`
      : '';
    const chipsHtml = actions
      .map((a, i) => {
        const cls = a.kind === 'confirm' ? 'confirm' : i === 0 ? 'primary' : 'secondary';
        return `<button class="cmdk-action-chip ${cls}" data-ai="${i}">${a.icon || '⚡'} ${escapeHtml(a.label)}</button>`;
      })
      .join('');
    const box = ov.querySelector('#cmdk-main');
    box.innerHTML = `
      <div class="cmdk-ai">
        <div class="cmdk-ai-reply">${escapeHtml(route.reply || '')}</div>
        ${stepsHtml}
        <div class="cmdk-ai-actions">${chipsHtml}</div>
      </div>`;
    box.querySelectorAll('.cmdk-action-chip').forEach((btn) => {
      btn.addEventListener('click', () => execAction(actions[Number(btn.dataset.ai)], typed));
    });
  };

  const execAction = async (a, typed) => {
    if (typed) pushRecent(typed);
    if (!a) return;
    if (a.kind === 'navigate') {
      close();
      navigate(a.route);
      return;
    }
    close();
    const routeObj = { reply: a.label, action: a };
    if (a.kind === 'confirm' || IMPACT.includes(a.endpoint)) {
      confirmThen(routeObj, () => doExec(routeObj));
    } else {
      await doExec(routeObj);
    }
  };

  const routeText = async (v) => {
    showLoading('FeedIA está pensando…');
    try {
      const r = await fetch('/api/command/route', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: v }),
      });
      if (!r.ok) {
        buildIdle();
        return;
      }
      const route = await r.json();
      renderRichResult(route, v);
    } catch {
      buildIdle();
    }
  };

  const buildIdle = () => {
    ov._route = null;
    const cur = location.hash.replace('#', '') || 'feed';
    const recent = getRecent();
    rows = [];
    recent.forEach((x) => rows.push({ ic: '🕘', tx: x, tag: 'reciente', kind: 'suggest', text: x }));
    (SUGGEST[cur] || baseSuggest).forEach((x) =>
      rows.push({ ic: '✨', tx: x, tag: 'sugerido', kind: 'suggest', text: x }),
    );
    sel = 0;
    paintRows();
  };

  const paintRows = () => {
    const box = ov.querySelector('#cmdk-main');
    box.innerHTML = `<div class="cmdk-list" id="cmdk-list">${rows
      .map(
        (r, i) => `
      <div class="cmdk-row ${i === sel ? 'sel' : ''}" data-i="${i}">
        <span class="cr-ic">${r.ic}</span>
        <span class="cr-tx">${escapeHtml(r.tx)}</span>
        <span class="cr-tag">${escapeHtml(r.tag)}</span>
      </div>`,
      )
      .join('')}</div>`;
    box.querySelectorAll('.cmdk-row').forEach((el) => {
      el.addEventListener('click', () => activate(Number(el.dataset.i)));
    });
  };

  const activate = (i) => {
    const r = rows[i];
    if (!r) return;
    const input = ov.querySelector('#cmdk-in');
    input.value = r.text;
    clearTimeout(t);
    routeText(r.text);
  };

  const open = () => {
    if (ov) return;
    ov = document.createElement('div');
    ov.className = 'cmdk-ov';
    ov.innerHTML = `
      <div class="cmdk" role="dialog" aria-label="Command palette">
        <input id="cmdk-in" placeholder="¿Qué querés hacer? Ej: subí un carrusel sobre productividad…" autocomplete="off" />
        <div class="cmdk-hint"><span class="cmdk-kbd">↑↓</span> elegir · <span class="cmdk-kbd">Enter</span> ejecutar · <span class="cmdk-kbd">Esc</span> cerrar</div>
        <div id="cmdk-main"></div>
      </div>`;
    document.body.appendChild(ov);
    const input = ov.querySelector('#cmdk-in');
    input.focus();
    buildIdle();
    ov.addEventListener('click', (e) => {
      if (e.target === ov) close();
    });
    input.addEventListener('input', () => {
      clearTimeout(t);
      const v = input.value.trim();
      if (v.length < 3) {
        buildIdle();
        return;
      }
      t = setTimeout(() => routeText(v), 260);
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        sel = Math.min(sel + 1, rows.length - 1);
        paintRows();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        sel = Math.max(sel - 1, 0);
        paintRows();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        // If LLM result is showing — fire primary action
        if (ov._route?.actions?.length) {
          execAction(ov._route.actions[0], ov._typed);
        } else if (rows.length) {
          activate(sel);
        }
      }
    });
  };
  function close() {
    if (ov) {
      ov.remove();
      ov = null;
      rows = [];
      sel = 0;
    }
  }

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      ov ? close() : open();
    }
  });
  window.openCommandPalette = open;

  if (!document.querySelector('#cmdk-fab')) {
    const fab = document.createElement('div');
    fab.id = 'cmdk-fab';
    fab.className = 'cmdk-hint-global';
    fab.innerHTML = '⌘K · Decile a FeedIA';
    fab.addEventListener('click', () => open());
    document.body.appendChild(fab);
  }
};

bootCommandPalette();

/* ══════════════════════════════════════════════════════════
   AYUDA DE ATAJOS — tecla "?" (descubribilidad)
   ══════════════════════════════════════════════════════════ */
const bootShortcutsHelp = () => {
  const SHORTCUTS = [
    ['⌘K / Ctrl+K', 'Abrir el command palette — decile algo a tu equipo'],
    ['↑ ↓', 'Navegar sugerencias / acciones'],
    ['Enter', 'Ejecutar la acción seleccionada'],
    ['?', 'Mostrar / ocultar esta ayuda'],
    ['Esc', 'Cerrar cualquier panel'],
  ];
  let ov = null;
  const close = () => {
    if (ov) {
      ov.remove();
      ov = null;
    }
  };
  const open = () => {
    if (ov) {
      close();
      return;
    }
    ov = document.createElement('div');
    ov.className = 'cmdk-ov';
    ov.innerHTML = `
      <div class="cmdk" style="padding:24px;">
        <div style="font-size:17px;font-weight:800;margin-bottom:4px;">⌨️ Atajos de teclado</div>
        <div style="color:#8a8a98;font-size:13px;margin-bottom:16px;">Manejá todo sin tocar el mouse.</div>
        ${SHORTCUTS.map(
          ([k, d]) => `
          <div style="display:flex;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid #20202a;">
            <span class="cmdk-kbd" style="min-width:96px;text-align:center;">${k}</span>
            <span style="font-size:14px;color:#e8e8ef;">${d}</span>
          </div>`,
        ).join('')}
        <div style="text-align:center;margin-top:16px;display:flex;gap:10px;justify-content:center;align-items:center;">
          <button id="fxt-replay" class="cmdk-kbd" style="cursor:pointer;background:none;">▶ Repetir tour guiado</button>
          <span style="color:#8a8a98;font-size:12px;"><span class="cmdk-kbd">Esc</span> cerrar</span>
        </div>
      </div>`;
    document.body.appendChild(ov);
    const rp = ov.querySelector('#fxt-replay');
    if (rp)
      rp.addEventListener('click', () => {
        close();
        if (window.startTour) window.startTour();
      });
    ov.addEventListener('click', (e) => {
      if (e.target === ov) close();
    });
  };
  document.addEventListener('keydown', (e) => {
    const tag = (e.target && e.target.tagName) || '';
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable);
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (e.key === '?' && !typing && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      open();
    }
  });
};

bootShortcutsHelp();

/* ══════════════════════════════════════════════════════════
   BEACON — feedback de "tu equipo está en eso" (cierra el loop)
   ══════════════════════════════════════════════════════════ */
const bootBeacon = () => {
  if (!document.querySelector('#fxb-style')) {
    const st = document.createElement('style');
    st.id = 'fxb-style';
    st.textContent = `
      #fxb-stack{position:fixed;right:16px;bottom:64px;z-index:9998;display:flex;flex-direction:column;gap:10px;max-width:360px;}
      .fxb{display:flex;gap:10px;align-items:flex-start;background:#15151b;border:1px solid #2c2c38;
        border-radius:12px;padding:12px 14px;box-shadow:0 12px 34px rgba(0,0,0,.5);animation:fxbin .25s ease;}
      @keyframes fxbin{from{transform:translateY(10px);opacity:0}to{transform:none;opacity:1}}
      .fxb.ok{border-color:rgba(74,222,128,.45)}.fxb.err{border-color:rgba(248,113,113,.5)}
      .fxb .fxb-sp{width:15px;height:15px;border-radius:50%;border:2px solid #44445a;border-top-color:#e1306c;animation:fxbsp .8s linear infinite;flex-shrink:0;margin-top:2px;}
      @keyframes fxbsp{to{transform:rotate(360deg)}}
      .fxb .fxb-tx{font-size:13px;color:#e8e8ef;line-height:1.45;}
      .fxb .fxb-ic{font-size:15px;}`;
    document.head.appendChild(st);
  }
  const stack = document.createElement('div');
  stack.id = 'fxb-stack';
  document.body.appendChild(stack);
  let n = 0;
  const mk = (id, cls, html) => {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      stack.appendChild(el);
    }
    el.className = 'fxb ' + cls;
    el.innerHTML = html;
    return el;
  };
  window.fxBeacon = {
    start(text) {
      const id = 'fxb-' + ++n;
      mk(id, '', `<span class="fxb-sp"></span><span class="fxb-tx">${escapeHtml(text)}</span>`);
      return id;
    },
    done(id, text) {
      if (!id) return;
      const el = mk(id, 'ok', `<span class="fxb-ic">✅</span><span class="fxb-tx">${escapeHtml(text)}</span>`);
      setTimeout(() => el && el.remove(), 4200);
    },
    fail(id, text) {
      if (!id) return;
      const el = mk(id, 'err', `<span class="fxb-ic">⚠️</span><span class="fxb-tx">${escapeHtml(text)}</span>`);
      setTimeout(() => el && el.remove(), 6500);
    },
  };
};
bootBeacon();

/* ══════════════════════════════════════════════════════════
   ONBOARDING TOUR — coachmarks guiados (1ª vez · reejecutable)
   ══════════════════════════════════════════════════════════ */
const bootTour = () => {
  const STEPS = [
    {
      sel: '#cmdk-fab',
      t: 'Acá empieza todo',
      d: 'Tocá esto (o apretá ⌘K) y pedile cualquier cosa a tu equipo en una sola frase. Pocas indicaciones, todo pasa.',
    },
    {
      sel: '[data-route="imperio"]',
      t: 'Tu Sala Ejecutiva',
      d: 'El resultado de tu imperio: apalancamiento, equipo que reemplazás y tu estatus.',
    },
    {
      sel: '[data-route="equipo"]',
      t: 'Tu equipo en vivo',
      d: 'Mirá a Nova, Lía, Luca y el resto trabajando para vos en tiempo real.',
    },
    {
      sel: '[data-route="pantalla"]',
      t: 'Pantalla en vivo',
      d: 'Cruzate de brazos y mirá al sistema operar solo: cursor, apps, todo.',
    },
  ];
  if (!document.querySelector('#fxt-style')) {
    const st = document.createElement('style');
    st.id = 'fxt-style';
    st.textContent = `
      #fxt-ov{position:fixed;inset:0;z-index:99999;}
      #fxt-hole{position:absolute;border-radius:12px;box-shadow:0 0 0 9999px rgba(6,6,10,.82);
        transition:all .18s cubic-bezier(.2,.8,.2,1);pointer-events:none;border:2px solid var(--accent,#e1306c);
        z-index:99999;}
      #fxt-pop{position:absolute;max-width:300px;background:#15151b;border:1px solid #2c2c38;border-radius:14px;
        padding:16px 18px;box-shadow:0 18px 50px rgba(0,0,0,.6);animation:fxtin .14s ease;z-index:100000;}
      @keyframes fxtin{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
      /* Mientras el tour está activo, esconder los FABs que tapan los spotlights */
      body.tour-active .voice-fab,
      body.tour-active .chatbot-fab,
      body.tour-active .bottom-nav-fab,
      body.tour-active .fab-menu{opacity:.12 !important;pointer-events:none !important;filter:grayscale(.6);}
      #fxt-pop h4{margin:0 0 6px;font-size:15px;}
      #fxt-pop p{margin:0 0 14px;font-size:13px;color:#aab;line-height:1.5;}
      #fxt-pop .row{display:flex;justify-content:space-between;align-items:center;}
      #fxt-skip{background:none;border:0;color:#7a7a88;font-size:12px;cursor:pointer;}
      #fxt-next{background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;border:0;border-radius:999px;
        padding:7px 16px;font-weight:700;font-size:13px;cursor:pointer;}
      #fxt-dots{display:flex;gap:5px;}#fxt-dots i{width:6px;height:6px;border-radius:50%;background:#3a3a46;}
      #fxt-dots i.on{background:var(--accent,#e1306c);}`;
    document.head.appendChild(st);
  }
  let i = 0;
  let ov = null;
  const finish = (mark) => {
    if (mark) {
      try {
        localStorage.setItem('fx_tour_v1', '1');
      } catch {
        /* ignore */
      }
    }
    if (ov) {
      ov.remove();
      ov = null;
    }
    document.body.classList.remove('tour-active');
  };
  const visible = (el) => {
    const r = el && el.getBoundingClientRect();
    return r && r.width > 4 && r.height > 4;
  };
  const show = () => {
    while (i < STEPS.length) {
      const el = document.querySelector(STEPS[i].sel);
      if (el && visible(el)) break;
      i++;
    }
    if (i >= STEPS.length) {
      finish(true);
      return;
    }
    const el = document.querySelector(STEPS[i].sel);
    const r = el.getBoundingClientRect();
    const hole = ov.querySelector('#fxt-hole');
    const pad = 6;
    hole.style.left = r.left - pad + 'px';
    hole.style.top = r.top - pad + 'px';
    hole.style.width = r.width + pad * 2 + 'px';
    hole.style.height = r.height + pad * 2 + 'px';
    const pop = ov.querySelector('#fxt-pop');
    pop.querySelector('h4').textContent = STEPS[i].t;
    pop.querySelector('p').textContent = STEPS[i].d;
    ov.querySelector('#fxt-next').textContent = i === STEPS.length - 1 ? 'Listo' : 'Siguiente';
    ov.querySelector('#fxt-dots').innerHTML = STEPS.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('');
    pop.style.visibility = 'hidden';
    requestAnimationFrame(() => {
      const pr = pop.getBoundingClientRect();
      let top = r.bottom + 14;
      if (top + pr.height > window.innerHeight - 12) top = Math.max(12, r.top - pr.height - 14);
      let left = Math.min(Math.max(12, r.left), window.innerWidth - pr.width - 12);
      pop.style.top = top + 'px';
      pop.style.left = left + 'px';
      pop.style.visibility = 'visible';
    });
  };
  const start = () => {
    i = 0;
    if (ov) ov.remove();
    ov = document.createElement('div');
    ov.id = 'fxt-ov';
    ov.innerHTML = `
      <div id="fxt-hole"></div>
      <div id="fxt-pop">
        <h4></h4><p></p>
        <div class="row">
          <button id="fxt-skip">Saltar</button>
          <div id="fxt-dots"></div>
          <button id="fxt-next">Siguiente</button>
        </div>
      </div>`;
    document.body.appendChild(ov);
    document.body.classList.add('tour-active');
    ov.querySelector('#fxt-skip').addEventListener('click', () => finish(true));
    ov.querySelector('#fxt-next').addEventListener('click', () => {
      i++;
      show();
    });
    window.addEventListener('resize', show, { passive: true });
    show();
  };
  window.startTour = start;
  let done = false;
  try {
    done = localStorage.getItem('fx_tour_v1') === '1';
  } catch {
    /* ignore */
  }
  if (!done) setTimeout(start, 450);
};
bootTour();

/* ══════════════════════════════════════════════════════════
   CENTRO DE NOTIFICACIONES — qué hizo tu equipo, humanizado
   ══════════════════════════════════════════════════════════ */
const bootNotifications = () => {
  if (!document.querySelector('#fxn-style')) {
    const st = document.createElement('style');
    st.id = 'fxn-style';
    st.textContent = `
      #fxn-bell{position:fixed;top:14px;right:16px;z-index:9997;width:38px;height:38px;border-radius:50%;
        background:#15151b;border:1px solid var(--border,#2c2c38);color:#cfcfe0;display:flex;align-items:center;
        justify-content:center;cursor:pointer;transition:border-color .15s,transform .15s;}
      #fxn-bell:hover{border-color:var(--border-focus,#555);transform:translateY(-1px);}
      #fxn-badge{position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;border-radius:99px;
        background:linear-gradient(90deg,#e1306c,#a855f7);color:#fff;font-size:11px;font-weight:800;
        display:none;align-items:center;justify-content:center;padding:0 5px;}
      #fxn-badge.on{display:flex;}
      #fxn-ov{position:fixed;inset:0;z-index:10002;background:rgba(6,6,10,.5);backdrop-filter:blur(3px);
        display:flex;justify-content:flex-end;animation:cmf .18s ease;}
      #fxn-panel{width:min(420px,94%);height:100%;background:#121218;border-left:1px solid #2c2c38;
        display:flex;flex-direction:column;animation:fxnsl .26s cubic-bezier(.2,.8,.2,1);}
      @keyframes fxnsl{from{transform:translateX(30px);opacity:.4}to{transform:none;opacity:1}}
      #fxn-panel header{padding:18px 20px;border-bottom:1px solid #24242e;display:flex;align-items:center;gap:10px;}
      #fxn-panel header b{font-size:16px;flex:1;}
      #fxn-mark{background:none;border:0;color:#8a8a98;font-size:12px;cursor:pointer;}
      #fxn-mark:hover{color:#fff;}
      #fxn-list{flex:1;overflow:auto;padding:8px;}
      .fxn-it{display:flex;gap:11px;align-items:flex-start;padding:11px 13px;border-radius:10px;
        cursor:pointer;position:relative;transition:background .12s;}
      .fxn-it:hover{background:rgba(255,255,255,.04);}
      .fxn-it.un{background:linear-gradient(90deg,rgba(225,48,108,.12),transparent);}
      .fxn-it.un::before{content:'';position:absolute;left:4px;top:50%;transform:translateY(-50%);
        width:6px;height:6px;border-radius:50%;background:#e1306c;box-shadow:0 0 6px rgba(225,48,108,.6);}
      .fxn-it .fxn-e{font-size:17px;line-height:1.2;flex-shrink:0;}
      .fxn-it .fxn-q{font-size:13px;color:#e8e8ef;}
      .fxn-it .fxn-a{font-size:12px;color:#9aa;line-height:1.45;}
      .fxn-it .fxn-w{font-size:11px;color:#6a6a78;white-space:nowrap;margin-left:auto;}
      .fxn-cat{display:inline-block;font-size:9.5px;text-transform:uppercase;letter-spacing:.06em;
        font-weight:800;padding:1px 6px;border-radius:4px;margin-right:6px;}
      .fxn-cat-approval{background:rgba(245,158,11,.18);color:#fbbf24;}
      .fxn-cat-report{background:rgba(99,102,241,.18);color:#a5b4fc;}
      .fxn-cat-analysis{background:rgba(168,85,247,.18);color:#d8b4fe;}
      .fxn-cat-goal{background:rgba(34,211,238,.18);color:#67e8f9;}
      .fxn-cat-achievement{background:rgba(234,179,8,.18);color:#facc15;}
      .fxn-cat-team{background:rgba(16,185,129,.18);color:#6ee7b7;}
      .fxn-filters{display:flex;gap:4px;padding:8px;border-bottom:1px solid #24242e;overflow-x:auto;}
      .fxn-filter{padding:5px 10px;border-radius:6px;border:0;background:transparent;color:#9aa;
        font-size:11.5px;font-weight:600;cursor:pointer;white-space:nowrap;}
      .fxn-filter.active{background:linear-gradient(135deg,#e1306c,#a855f7);color:#fff;}
      .fxn-platsw{display:flex;gap:6px;padding:10px;border-bottom:1px solid #24242e;background:rgba(255,255,255,.02);}
      .fxn-plat{flex:1;padding:8px 6px;border-radius:9px;border:1px solid #2c2c38;background:transparent;color:#cfcfe0;font-size:12px;font-weight:700;cursor:pointer;transition:all .12s;}
      .fxn-plat:hover{border-color:#444;}
      .fxn-plat.active{background:#fff;color:#15181E;border-color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);}`;
    document.head.appendChild(st);
  }
  const RKEY = 'fx_notif_read';
  const RIKEY = 'fx_notif_read_ids';
  const getRead = () => {
    try {
      return Date.parse(localStorage.getItem(RKEY) || '') || 0;
    } catch {
      return 0;
    }
  };
  const setRead = (ts) => {
    try {
      localStorage.setItem(RKEY, new Date(ts).toISOString());
    } catch {
      /* ignore */
    }
  };
  const getReadIds = () => {
    try {
      return new Set(JSON.parse(localStorage.getItem(RIKEY) || '[]'));
    } catch {
      return new Set();
    }
  };
  const addReadId = (id) => {
    try {
      const s = getReadIds();
      s.add(id);
      localStorage.setItem(RIKEY, JSON.stringify([...s].slice(-500)));
    } catch {
      /* noop */
    }
  };
  const isRead = (id, ts) => {
    if (getReadIds().has(id)) return true;
    return (Date.parse(ts) || 0) <= getRead();
  };

  let activeFilter = 'all';
  let activePlatform = 'all'; // 'all' | 'instagram' | 'tiktok' | 'sala'

  // Heurística para sectorizar notificaciones por red.
  const inferPlatform = (txt) => {
    const t = (txt || '').toLowerCase();
    if (/\btiktok\b|\bfyp\b|9:16|tt\b/.test(t)) return 'tiktok';
    if (/\binstagram\b|\big\b|\breel\b|\bcarrusel\b|\bstor(y|ies|ia)\b|explore/.test(t)) return 'instagram';
    return 'sala';
  };

  const bell = document.createElement('div');
  bell.id = 'fxn-bell';
  bell.title = 'Notificaciones de tu equipo';
  bell.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg><span id="fxn-badge"></span>`;
  document.body.appendChild(bell);

  let items = [];
  const rel = (iso) => {
    const d = Date.now() - Date.parse(iso);
    if (isNaN(d)) return '';
    const m = Math.round(d / 60000);
    if (m < 1) return 'recién';
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    if (h < 24) return `hace ${h} h`;
    return `hace ${Math.round(h / 24)} d`;
  };
  const refreshBadge = () => {
    const n = items.filter((i) => !isRead(i.id, i.cuando)).length;
    const b = document.querySelector('#fxn-badge');
    const tbBadge = document.querySelector('#topbar-notif-badge');
    if (b) {
      b.textContent = n > 9 ? '9+' : String(n);
      b.classList.toggle('on', n > 0);
    }
    if (tbBadge) {
      tbBadge.textContent = n > 9 ? '9+' : String(n);
      tbBadge.hidden = n === 0;
    }
  };

  const mergeActivity = (acts = []) =>
    acts.map((a) => ({
      id: 'act-' + (a.id ?? a.cuando + (a.quien || '')),
      category: 'team',
      emoji: a.emoji || '🤖',
      quien: a.quien || '',
      rol: a.rol || '',
      accion: a.accion || '',
      cuando: a.cuando,
      platform: a.platform || inferPlatform(`${a.quien} ${a.rol} ${a.accion}`),
    }));
  const mergeApprovals = (apps = []) =>
    apps.map((a) => ({
      id: 'app-' + a.id,
      category: 'approval',
      emoji: '✋',
      quien: 'Aprobación pendiente',
      rol: a.workflow || 'Computer Use',
      accion: (a.action || '').slice(0, 120),
      cuando: a.createdAt || new Date().toISOString(),
      route: 'pantalla',
      platform: a.platform || inferPlatform(`${a.workflow} ${a.action}`),
    }));
  const mergeAchievements = (hitos = []) =>
    hitos.map((h, i) => ({
      id: 'ach-' + (h.id ?? h.titulo + i),
      category: 'achievement',
      emoji: '🏆',
      quien: 'Logro desbloqueado',
      rol: 'sistema',
      accion: `${h.titulo} — ${h.detalle ?? ''}`.trim(),
      cuando: h.cuando || new Date().toISOString(),
      route: 'achievements',
      platform: h.platform || inferPlatform(`${h.titulo} ${h.detalle}`),
    }));
  const mergeReports = (reports = []) =>
    reports.map((r, i) => ({
      id: 'rep-' + (r.id ?? i),
      category: 'report',
      emoji: '📄',
      quien: 'Reporte nuevo',
      rol: r.tipo || 'semanal',
      accion: r.resumen || r.titulo || 'Reporte generado',
      cuando: r.cuando || new Date().toISOString(),
      route: 'reportes',
      platform: r.platform || inferPlatform(`${r.tipo} ${r.resumen} ${r.titulo}`),
    }));

  const load = async () => {
    try {
      const [actR, appR, briefR] = await Promise.allSettled([
        fetch('/api/experience/activity'),
        fetch('/api/cu/mode/pending-approvals'),
        fetch('/api/experience/brief'),
      ]);
      const acts = actR.status === 'fulfilled' && actR.value.ok ? await actR.value.json() : [];
      const apps = appR.status === 'fulfilled' && appR.value.ok ? await appR.value.json() : [];
      const brief = briefR.status === 'fulfilled' && briefR.value.ok ? await briefR.value.json() : null;
      const hitos = brief?.hitos ?? [];
      items = [...mergeApprovals(apps), ...mergeAchievements(hitos), ...mergeActivity(acts)]
        .sort((a, b) => (Date.parse(b.cuando) || 0) - (Date.parse(a.cuando) || 0))
        .slice(0, 80);
      refreshBadge();
    } catch {
      /* silencioso */
    }
  };

  const CAT_LABEL = {
    approval: 'aprobación',
    report: 'reporte',
    analysis: 'análisis',
    goal: 'meta',
    achievement: 'logro',
    team: 'equipo',
  };
  const FILTERS = [
    { id: 'all', label: 'Todo' },
    { id: 'approval', label: '✋ Aprobaciones' },
    { id: 'achievement', label: '🏆 Logros' },
    { id: 'report', label: '📄 Reportes' },
    { id: 'team', label: '👥 Equipo' },
  ];

  let ov = null;
  const close = () => {
    if (ov) {
      ov.remove();
      ov = null;
    }
  };

  const renderList = () => {
    const list = ov?.querySelector('#fxn-list');
    if (!list) return;
    const byPlat = activePlatform === 'all' ? items : items.filter((i) => i.platform === activePlatform);
    const filtered = activeFilter === 'all' ? byPlat : byPlat.filter((i) => i.category === activeFilter);
    list.innerHTML = filtered.length
      ? filtered
          .map((i) => {
            const un = !isRead(i.id, i.cuando);
            return `<div class="fxn-it ${un ? 'un' : ''}" data-id="${escapeHtml(i.id)}" ${i.route ? `data-route="${escapeHtml(i.route)}"` : ''}>
        <span class="fxn-e">${i.emoji || '🤖'}</span>
        <div style="flex:1;min-width:0;">
          <div class="fxn-q">
            <span class="fxn-cat fxn-cat-${escapeHtml(i.category)}">${escapeHtml(CAT_LABEL[i.category] || i.category)}</span>
            <b>${escapeHtml(i.quien || '')}</b>
            ${i.rol ? `<span style="color:#8a8a98;">· ${escapeHtml(i.rol)}</span>` : ''}
          </div>
          <div class="fxn-a">${escapeHtml(i.accion || '')}</div>
        </div><span class="fxn-w">${rel(i.cuando)}</span></div>`;
          })
          .join('')
      : '<div class="muted small" style="text-align:center;padding:40px 20px;">Sin notificaciones en esta categoría.</div>';

    // Click individual → marcar como leído + opcional navegar
    list.querySelectorAll('.fxn-it').forEach((it) => {
      it.addEventListener('click', () => {
        const id = it.dataset.id;
        addReadId(id);
        it.classList.remove('un');
        refreshBadge();
        const route = it.dataset.route;
        if (route) {
          close();
          window.location.hash = `#${route}`;
        }
      });
    });
  };

  const open = async () => {
    if (ov) {
      close();
      return;
    }
    await load();
    ov = document.createElement('div');
    ov.id = 'fxn-ov';
    ov.innerHTML = `
      <div id="fxn-panel" role="dialog" aria-label="Notificaciones">
        <header>
          <b>🔔 Notificaciones de tu equipo</b>
          <button id="fxn-mark" title="Marcar todo como leído">✓ Marcar todo</button>
        </header>
        <div class="fxn-platsw" id="fxn-platsw">
          ${[
            ['all', 'Todo'],
            ['instagram', '📷 Instagram'],
            ['tiktok', '🎵 TikTok'],
            ['sala', '👑 Sala'],
          ]
            .map(
              ([id, label]) =>
                `<button class="fxn-plat ${id === activePlatform ? 'active' : ''}" data-plat="${id}">${label}</button>`,
            )
            .join('')}
        </div>
        <div class="fxn-filters" id="fxn-filters">
          ${FILTERS.map((f) => `<button class="fxn-filter ${f.id === activeFilter ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`).join('')}
        </div>
        <div id="fxn-list"></div>
      </div>`;
    document.body.appendChild(ov);
    renderList();

    ov.addEventListener('click', (e) => {
      if (e.target === ov) close();
    });
    ov.querySelector('#fxn-mark').addEventListener('click', () => {
      items.forEach((i) => addReadId(i.id));
      setRead(Date.now());
      refreshBadge();
      renderList();
    });
    ov.querySelectorAll('.fxn-filter').forEach((b) => {
      b.addEventListener('click', () => {
        activeFilter = b.dataset.filter;
        ov.querySelectorAll('.fxn-filter').forEach((x) => x.classList.toggle('active', x === b));
        renderList();
      });
    });
    ov.querySelectorAll('.fxn-plat').forEach((b) => {
      b.addEventListener('click', () => {
        activePlatform = b.dataset.plat;
        ov.querySelectorAll('.fxn-plat').forEach((x) => x.classList.toggle('active', x === b));
        renderList();
      });
    });
  };

  bell.addEventListener('click', open);
  // Unificar: si existe la campana del topbar, ocultar la flotante.
  const tbNotif = document.querySelector('#topbar-notif');
  if (tbNotif) {
    bell.style.display = 'none';
    tbNotif.addEventListener('click', (e) => {
      e.preventDefault?.();
      e.stopPropagation?.();
      open();
    });
  }
  const mob = document.querySelector('#mobile-notif-btn');
  if (mob) mob.addEventListener('click', open);

  load();
  setInterval(() => {
    if (!document.hidden) load();
  }, 60000);
};
bootNotifications();

/* ══════════════════════════════════════════════════════════
   ACCESIBILIDAD — skip link + foco al contenido (intuitivo)
   ══════════════════════════════════════════════════════════ */
const bootA11y = () => {
  const view = document.querySelector('#view');
  if (view && !view.hasAttribute('tabindex')) view.setAttribute('tabindex', '-1');
  if (!document.querySelector('#skip-link')) {
    const a = document.createElement('a');
    a.id = 'skip-link';
    a.href = '#view';
    a.textContent = 'Saltar al contenido';
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const v = document.querySelector('#view');
      if (v) {
        v.focus();
        v.scrollIntoView();
      }
    });
    document.body.insertBefore(a, document.body.firstChild);
  }
};
bootA11y();

/* ══════════════════════════════════════════════════════════
   TOGGLE DE TEMA — claro/oscuro persistente
   ══════════════════════════════════════════════════════════ */
const bootThemeToggle = () => {
  const root = document.documentElement;
  const cur = () => (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const dark = cur() === 'dark';
    if (btn) {
      btn.textContent = dark ? '☀️' : '🌙';
      btn.title = dark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
      btn.setAttribute('aria-label', btn.title);
    }
    if (meta) meta.setAttribute('content', dark ? '#000000' : '#f5f6f8');
  };
  let btn = document.querySelector('#fx-theme-toggle');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'fx-theme-toggle';
    document.body.appendChild(btn);
  }
  btn.addEventListener('click', () => {
    const next = cur() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try {
      localStorage.setItem('fx_theme', next);
    } catch {
      /* ignore */
    }
    sync();
  });
  sync();
};
bootThemeToggle();

/* Ripple de botón siguiendo el punto de click (microinteracción) */
document.addEventListener(
  'pointerdown',
  (e) => {
    const b = e.target && e.target.closest && e.target.closest('.btn');
    if (!b) return;
    const r = b.getBoundingClientRect();
    b.style.setProperty('--rx', `${((e.clientX - r.left) / r.width) * 100}%`);
    b.style.setProperty('--ry', `${((e.clientY - r.top) / r.height) * 100}%`);
  },
  { passive: true },
);

/* ══════════════════════════════════════════════════════════
   BARRA DE PROGRESO GLOBAL — velocidad percibida (estilo top-bar)
   ══════════════════════════════════════════════════════════ */
const bootProgressBar = () => {
  const bar = document.createElement('div');
  bar.id = 'fx-progress';
  document.body.appendChild(bar);
  let pending = 0;
  let val = 0;
  let raf = null;
  let hideT = null;
  const paint = () => {
    bar.style.width = val + '%';
  };
  const tick = () => {
    if (pending > 0 && val < 90) {
      val += (90 - val) * 0.06 + 0.4;
      paint();
      raf = requestAnimationFrame(tick);
    }
  };
  const start = () => {
    clearTimeout(hideT);
    bar.style.opacity = '1';
    if (val === 0) {
      val = 8;
      paint();
    }
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
  };
  const done = () => {
    cancelAnimationFrame(raf);
    val = 100;
    paint();
    hideT = setTimeout(() => {
      bar.style.opacity = '0';
      setTimeout(() => {
        val = 0;
        paint();
      }, 250);
    }, 200);
  };
  window.addEventListener('fx:net', (e) => {
    pending = Math.max(0, pending + (e.detail?.delta || 0));
    if (pending > 0) start();
    else done();
  });
};
bootProgressBar();

/* ══════════════════════════════════════════════════════════
   PREFETCH — al pasar el mouse por el nav y en idle (navegación instantánea)
   ══════════════════════════════════════════════════════════ */
const bootPrefetch = () => {
  const warm = (r) => {
    try {
      ROUTES[r] && ROUTES[r]();
    } catch {
      /* noop */
    }
  };
  document.addEventListener(
    'mouseover',
    (e) => {
      const el = e.target && e.target.closest && e.target.closest('[data-route]');
      if (el && el.dataset.route && ROUTES[el.dataset.route]) warm(el.dataset.route);
    },
    { passive: true },
  );
  const idle = window.requestIdleCallback || ((fn) => setTimeout(fn, 1200));
  idle(() => ['feed', 'imperio', 'equipo', 'mission', 'inteligencia'].forEach(warm));
};
bootPrefetch();

/* ══════════════════════════════════════════════════════════
   BANNER DE ESTADO DE IA — aviso proactivo si falta API key
   ══════════════════════════════════════════════════════════ */
const bootAiStatusBanner = () => {
  let el = null;
  const remove = () => {
    if (el) {
      el.remove();
      el = null;
    }
  };
  const show = (msg) => {
    if (el || sessionStorage.getItem('fx_ai_banner_off') === '1') return;
    el = document.createElement('div');
    el.id = 'fx-ai-banner';
    el.innerHTML = `
      <span class="fx-aib-ic">⚠️</span>
      <span class="fx-aib-tx">${escapeHtml(msg)}</span>
      <button class="fx-aib-cta" id="fx-aib-go">Ir a Ajustes</button>
      <button class="fx-aib-x" id="fx-aib-x" aria-label="Ocultar">✕</button>`;
    const main = document.querySelector('#main-content');
    const ref = document.querySelector('#fx-ribbon') || document.querySelector('#view');
    if (main && ref) main.insertBefore(el, ref);
    else document.body.prepend(el);
    el.querySelector('#fx-aib-go').addEventListener('click', () => navigate('settings'));
    el.querySelector('#fx-aib-x').addEventListener('click', () => {
      sessionStorage.setItem('fx_ai_banner_off', '1');
      remove();
    });
  };
  const check = async () => {
    try {
      const s = await fetch('/api/system/ai-status').then((r) => r.json());
      if (s && s.aiReady === false) show(s.message || 'IA desactivada: falta API key.');
      else remove(); // se resolvió → sacar el banner solo
    } catch {
      /* sin red: no molestar */
    }
  };
  check();
  setInterval(() => {
    if (!document.hidden) check();
  }, 60000);
};
bootAiStatusBanner();
// build cache bust - 1782166612
