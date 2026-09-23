/* ══════════════════════════════════════════════════════════════════════════════
   BOTS BAR · botón maestro ON/OFF + interruptor por bot, en la barra de cada vista
   ──────────────────────────────────────────────────────────────────────────────
   - Maestro: apaga TODOS los bots de golpe; después se puede reactivar los que se
     quiera uno por uno (no es una compuerta, es una acción en bloque). Encenderlo
     restaura los que estaban prendidos antes de apagarlo.
   - Chips: los bots relevantes a la vista actual (el servidor dice a qué vistas
     pertenece cada uno), con su propio interruptor.
   - Panel: los 8 bots con descripción y cantidad de tareas que gobierna.
   Fuente de verdad: el servidor (GET /api/bots). La UI nunca asume: renderiza lo
   que el servidor devuelve tras cada cambio.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiBust } from './api.js';
import { adminApi } from './adminKey.js';
import { toast } from './toast.js';

const POLL_MS = 30_000;

// Plan → texto corto para el badge de un bot bloqueado.
const TIER_LABEL = { free: 'Free', starter: 'Starter', pro: 'Pro', agency: 'Agency' };

let snapshot = null; // último estado devuelto por el servidor
let unavailable = ''; // el backend no respondió (red caída, 404, 5xx) — no incluye "bloqueado por plan"
let busy = false;
let route = '';
let panelOpen = false;
let pollTimer = null;

const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of [].concat(children)) if (c) node.append(c);
  return node;
};

const $strip = () => document.getElementById('bots-strip');

/**
 * Algunas vistas (inbox, sala ejecutiva) reemplazan TODO #main-content y se llevan por delante el topbar
 * y cualquier cosa que viva ahí. La barra se recrea sola: debajo del topbar si existe; si no, arriba de todo.
 */
const ensureStrip = () => {
  const existing = $strip();
  if (existing) return existing;
  const main = document.getElementById('main-content');
  if (!main) return null;
  const strip = el('div', {
    class: 'bots-strip',
    id: 'bots-strip',
    role: 'toolbar',
    'aria-label': 'Control de bots automáticos',
  });
  // Después del último header pegajoso que exista (topbar de escritorio y/o header móvil): si no, su sticky-top la empujaría encima de él.
  let anchor = null;
  for (const sel of ['#topbar', '.mobile-header', '#mobile-search-overlay']) {
    const n = main.querySelector(`:scope > ${sel}`);
    if (n) anchor = n;
  }
  if (anchor) {
    anchor.after(strip);
  } else {
    // Sin topbar arriba: los botones flotantes fijos (tema, pantalla completa) caerían encima de la barra.
    strip.classList.add('bots-strip-flush');
    main.prepend(strip);
  }
  return strip;
};

/* ── Red ──────────────────────────────────────────────────────────────────── */

/** Errores de backend genuino — YA NO incluye 401/403/503 "falta la clave":
 * el panel se lee siempre (el gate ahora es el plan de la cuenta, evaluado
 * bot por bot vía `locked`, no una puerta a la lista completa). */
const describeError = (err) => {
  const s = err?.status;
  if (s === 404 || err?.code === 'API_NOT_FOUND')
    return 'Este servidor no tiene el panel de bots todavía. Reinicialo para activarlo.';
  return 'Sin conexión con el servidor.';
};

/** Nunca pide la clave de admin acá — eso es solo para el dueño de la instancia (ver comentReview.js).
 * Si ya hay una clave cargada en memoria (desbloqueada desde otra pantalla) se manda igual, como bypass. */
const request = (path, opts = {}) => adminApi(path, opts, { interactive: false });

let loadInFlight = null;

const doLoad = async () => {
  const before = JSON.stringify([snapshot, unavailable]);
  try {
    snapshot = await request('/api/bots');
    unavailable = '';
  } catch (err) {
    unavailable = describeError(err);
  }
  // El polling no debe repintar (ni robar el foco del teclado) si nada cambió.
  if (JSON.stringify([snapshot, unavailable]) !== before) render();
};

/** Varios disparadores casi simultáneos (arranque, visibilitychange, polling) comparten UNA sola consulta en vuelo. */
const load = () => {
  if (!loadInFlight) {
    loadInFlight = doLoad().finally(() => {
      loadInFlight = null;
    });
  }
  return loadInFlight;
};

/* ── Acciones ─────────────────────────────────────────────────────────────── */

const mutate = async (path, enabled, okMessage) => {
  if (busy) return;
  busy = true;
  render();
  try {
    snapshot = await request(path, { method: 'POST', body: { enabled } });
    unavailable = '';
    apiBust('/api/bots');
    toast(okMessage(snapshot), 'info');
    window.dispatchEvent(new CustomEvent('feedia:bots-changed', { detail: snapshot }));
  } catch (err) {
    if (err?.code === 'tier-required') {
      const need = TIER_LABEL[err.payload?.requiredTier] ?? err.payload?.requiredTier ?? 'superior';
      toast(`Este bot necesita el plan ${need} o superior.`, 'warn');
    } else {
      unavailable = describeError(err);
      toast(unavailable, 'error');
    }
  } finally {
    busy = false;
    render();
  }
};

const toggleBot = (bot) => {
  if (bot.locked) {
    const need = TIER_LABEL[bot.requiredTier] ?? bot.requiredTier;
    toast(`${bot.label} necesita el plan ${need} o superior.`, 'warn');
    return;
  }
  return mutate(
    `/api/bots/${encodeURIComponent(bot.id)}/state`,
    !bot.enabled,
    () => `${bot.label}: ${!bot.enabled ? 'encendido' : 'apagado'}`,
  );
};

/** Clic en el maestro: si está todo apagado → restaura (solo lo que el plan permite); en cualquier otro estado → apaga todo. */
const toggleMaster = () => {
  const turnOn = snapshot?.master?.state === 'all-off';
  return mutate('/api/bots/master', turnOn, (s) => {
    if (!turnOn) return 'Todos los bots apagados. Podés reactivar los que quieras.';
    const skipped = s.skippedLocked?.length ?? 0;
    return skipped > 0
      ? `${s.master.enabled}/${s.master.total} bots encendidos — ${skipped} necesitan un plan superior.`
      : `Bots restaurados (${s.master.enabled}/${s.master.total} encendidos)`;
  });
};

/* ── Render ───────────────────────────────────────────────────────────────── */

const masterLabel = () => {
  if (unavailable) return 'Bots';
  if (!snapshot) return 'Bots…';
  const { state, enabled, total, locked } = snapshot.master;
  if (state === 'all-on') return locked > 0 ? `Bots ON (${locked} 🔒)` : 'Bots ON';
  if (state === 'all-off') return 'Bots OFF';
  return `Bots ${enabled}/${total - locked}`;
};

const masterState = () => (unavailable ? 'unavailable' : (snapshot?.master?.state ?? 'loading'));

const switchButton = ({ label, checked, disabled, extraClass = '', title = '', key = '' }) =>
  el(
    'button',
    {
      type: 'button',
      role: 'switch',
      class: `bots-switch ${extraClass}`.trim(),
      'aria-checked': String(!!checked),
      'data-bots-key': key,
      disabled: disabled || busy,
      title,
    },
    [
      el('span', { class: 'bots-switch-track', 'aria-hidden': 'true' }, [el('span', { class: 'bots-switch-thumb' })]),
      el('span', { class: 'bots-switch-label', text: label }),
    ],
  );

const wire = (node, handler) => {
  node.addEventListener('click', handler);
  return node;
};

const renderPanel = () => {
  const panel = el('div', { class: 'bots-panel', id: 'bots-panel', role: 'dialog', 'aria-label': 'Bots automáticos' });
  panel.append(
    el('div', { class: 'bots-panel-head' }, [
      el('strong', { text: 'Bots automáticos' }),
      el('span', {
        class: 'bots-panel-sub',
        text: 'Cada bot gasta solo cuando está encendido. Apagalos para frenar el gasto.',
      }),
    ]),
  );

  if (unavailable) {
    panel.append(el('div', { class: 'bots-note bots-note-warn', role: 'alert', text: unavailable }));
    return panel;
  }
  if (!snapshot) {
    panel.append(el('div', { class: 'bots-note', text: 'Cargando…' }));
    return panel;
  }
  if (snapshot.corrupt) {
    panel.append(
      el('div', {
        class: 'bots-note bots-note-warn',
        role: 'alert',
        text: 'El archivo de estado estaba dañado: por seguridad todos los bots quedaron apagados. Reactivá los que necesites.',
      }),
    );
  }

  const list = el('ul', { class: 'bots-list' });
  for (const bot of snapshot.bots) {
    const need = TIER_LABEL[bot.requiredTier] ?? bot.requiredTier;
    const meta = [
      bot.jobs != null ? `${bot.jobs} tarea${bot.jobs === 1 ? '' : 's'}` : '',
      bot.costly ? 'gasta IA' : '',
      bot.locked ? `plan ${need}+` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    list.append(
      el('li', { class: `bots-row${bot.locked ? ' bots-row-locked' : ''}` }, [
        el('div', { class: 'bots-row-text' }, [
          el('span', { class: 'bots-row-name' }, [
            bot.label,
            bot.locked ? el('span', { class: 'bots-row-badge', text: `Plan ${need}+` }) : null,
          ]),
          el('span', { class: 'bots-row-desc', text: bot.description }),
          meta ? el('span', { class: 'bots-row-meta', text: meta }) : null,
        ]),
        wire(
          switchButton({
            key: `row:${bot.id}`,
            label: bot.locked ? '🔒' : bot.enabled ? 'ON' : 'OFF',
            checked: bot.enabled,
            extraClass: `bots-switch-sm${bot.locked ? ' bots-switch-locked' : ''}`,
            title: bot.locked
              ? `Necesita el plan ${need} o superior`
              : `${bot.label}: ${bot.enabled ? 'apagar' : 'encender'}`,
          }),
          () => toggleBot(bot),
        ),
      ]),
    );
    list.lastChild
      .querySelector('button')
      ?.setAttribute(
        'aria-label',
        bot.locked ? `${bot.label}: requiere plan ${need}` : `${bot.label}: ${bot.enabled ? 'encendido' : 'apagado'}`,
      );
  }
  panel.append(list);

  if (snapshot.infraJobs != null) {
    panel.append(
      el('div', {
        class: 'bots-note',
        text: `${snapshot.infraJobs} tareas de infraestructura (publicar lo ya programado, salud, control de gasto) siguen activas siempre.`,
      }),
    );
  }
  return panel;
};

const render = () => {
  const strip = ensureStrip();
  if (!strip) return;
  // Re-renderizar reemplaza los botones: se recuerda cuál tenía el foco para devolvérselo.
  const focusKey = document.activeElement?.getAttribute?.('data-bots-key') ?? '';
  strip.replaceChildren();
  strip.hidden = false;

  const state = masterState();
  const master = wire(
    switchButton({
      key: 'master',
      label: masterLabel(),
      checked: state !== 'all-off' && state !== 'unavailable' && state !== 'loading',
      disabled: !!unavailable || !snapshot,
      extraClass: `bots-master bots-master-${state}`,
      title:
        unavailable ||
        (state === 'all-off'
          ? 'Restaurar los bots que tu plan permite'
          : 'Apagar todos los bots (después podés reactivar los que quieras)'),
    }),
    toggleMaster,
  );
  master.dataset.state = state;
  master.setAttribute('aria-label', unavailable ? `Bots: ${unavailable}` : 'Bots automáticos: encender o apagar todos');
  strip.append(master);

  const chips = el('div', { class: 'bots-chips', role: 'group', 'aria-label': 'Bots de esta vista' });
  if (snapshot && !unavailable) {
    for (const bot of snapshot.bots.filter((b) => b.views.includes(route))) {
      const need = TIER_LABEL[bot.requiredTier] ?? bot.requiredTier;
      const chip = wire(
        switchButton({
          key: `chip:${bot.id}`,
          label: bot.locked ? `${bot.label} 🔒` : bot.label,
          checked: bot.enabled,
          extraClass: `bots-chip${bot.locked ? ' bots-chip-locked' : ''}`,
          title: bot.locked
            ? `Necesita el plan ${need} o superior`
            : `${bot.label}: ${bot.enabled ? 'apagar' : 'encender'}`,
        }),
        () => toggleBot(bot),
      );
      chip.setAttribute(
        'aria-label',
        bot.locked ? `${bot.label}: requiere plan ${need}` : `${bot.label}: ${bot.enabled ? 'encendido' : 'apagado'}`,
      );
      chips.append(chip);
    }
  }
  strip.append(chips);

  const panelBtn = wire(
    el('button', {
      type: 'button',
      class: 'bots-panel-btn',
      'data-bots-key': 'panel',
      'aria-expanded': String(panelOpen),
      'aria-controls': 'bots-panel',
      text: 'Todos los bots ▾',
    }),
    () => {
      panelOpen = !panelOpen;
      render();
    },
  );
  strip.append(panelBtn);
  if (panelOpen) strip.append(renderPanel());

  if (unavailable) strip.append(el('span', { class: 'bots-inline-warn', role: 'status', text: unavailable }));

  if (focusKey) {
    for (const n of strip.querySelectorAll('[data-bots-key]')) {
      if (n.getAttribute('data-bots-key') === focusKey && !n.disabled) {
        n.focus();
        break;
      }
    }
  }
};

/* ── Sincronía con la barra superior y ciclo de vida ──────────────────────── */

/** La barra queda pegada justo debajo del topbar (o del header móvil): se mide, no se adivina. */
const syncOffset = () => {
  const visible = [document.getElementById('topbar'), document.querySelector('.mobile-header')].find(
    (n) => n && n.getBoundingClientRect().height > 0,
  );
  document.documentElement.style.setProperty(
    '--bots-bar-top',
    `${visible ? Math.round(visible.getBoundingClientRect().height) : 0}px`,
  );
};

export const setBotsBarRoute = (nextRoute) => {
  route = nextRoute;
  panelOpen = false;
  render();
};

export const initBotsBar = () => {
  if (!ensureStrip()) return;
  syncOffset();
  // Si una vista borra la barra (reemplaza todo el <main>), se vuelve a dibujar.
  const main = document.getElementById('main-content');
  if (main && typeof MutationObserver !== 'undefined') {
    new MutationObserver(() => {
      if (!$strip()) {
        syncOffset();
        render();
      }
    }).observe(main, { childList: true });
  }
  window.addEventListener('resize', syncOffset);
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(syncOffset);
    for (const n of [document.getElementById('topbar'), document.querySelector('.mobile-header')]) if (n) ro.observe(n);
  }

  document.addEventListener('click', (e) => {
    if (!panelOpen) return;
    // Un clic dentro de la barra re-renderiza y deja `e.target` desconectado: `closest()` diría "afuera" y cerraría el
    // panel al instante. composedPath() se captura al despachar el evento, antes de que el DOM cambie.
    const strip = $strip();
    if (strip && e.composedPath().includes(strip)) return;
    panelOpen = false;
    render();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && panelOpen) {
      panelOpen = false;
      render();
      $strip()?.querySelector('.bots-panel-btn')?.focus();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void load();
  });
  // Otros módulos (o pestañas de la misma app) pueden avisar que cambió algo.
  window.addEventListener('feedia:bots-refresh', () => void load());

  render();
  void load();
  clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (!document.hidden && !busy) void load();
  }, POLL_MS);
};
