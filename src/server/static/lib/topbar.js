/* ══════════════════════════════════════════════════════════════════════════════
   TOPBAR · Computer Use Agents access + state polling
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiBust, apiSafe } from './api.js';
import { toast } from './toast.js';

let pollTimer = null;
let lastState = 'idle';

/** Detecta el estado del CUA agent. Usa apiSafe (nunca tira). */
const detectCuaState = async () => {
  const [desktopRes, voiceRes, replayRes, modeRes, pendingRes] = await Promise.all([
    apiSafe('/api/cu/desktop-status'),
    apiSafe('/api/cu/voice/config'),
    apiSafe('/api/cu/replay-stats'),
    apiSafe('/api/cu/mode'),
    apiSafe('/api/cu/mode/pending-approvals', []),
  ]);

  const desktopStatus = desktopRes.data;
  const voiceCfg = voiceRes.data;
  const replayStats = replayRes.data;
  const modeData = modeRes.data;
  const pending = pendingRes.data ?? [];
  const offline = !!desktopRes.error && !!modeRes.error;

  const dryRun = desktopStatus?.dryRun === true;
  const replayInProgress = replayStats?.byOutcome?.['in-progress'] ?? 0;
  const computerUseAvailable = desktopStatus?.capabilitiesAvailable?.computerUse === true;
  const mode = modeData?.mode ?? 'off';

  let state = 'idle';
  let stateText = 'Idle';

  if (offline) {
    state = 'error';
    stateText = 'Offline';
  } else if (mode === 'off') {
    state = 'idle';
    stateText = 'Off';
  } else if (pending.length > 0) {
    state = 'busy';
    stateText = `${pending.length} esperan`;
  } else if (replayInProgress > 0) {
    state = 'streaming';
    stateText = `Activo · ${replayInProgress}`;
  } else if (mode === 'supervised') {
    state = 'active';
    stateText = 'Asistente';
  } else if (mode === 'auto') {
    state = 'active';
    stateText = dryRun ? 'Activado · Dry' : 'Activado';
  } else if (!computerUseAvailable) {
    state = 'error';
    stateText = 'Sin API key';
  }

  return { state, stateText, desktopStatus, voiceCfg, replayInProgress, mode, pending, offline };
};

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[c],
  );

const updateUI = (info) => {
  const dot = document.getElementById('cua-dot');
  const stateText = document.getElementById('cua-state-text');
  const statusBox = document.getElementById('cua-dd-status');
  const narratorCheckbox = document.getElementById('cua-narrator-checkbox');
  const pendingBox = document.getElementById('cua-pending-approvals');
  const pendingList = document.getElementById('cua-pending-list');
  const pendingCount = document.getElementById('cua-pending-count');

  if (dot) dot.dataset.state = info.state;
  if (stateText) stateText.textContent = info.stateText;
  if (info.state !== lastState && info.state === 'streaming') {
    toast('🤖 Computer Use Agent operando en vivo', 'info');
  }
  if (info.pending && info.pending.length > 0 && lastState !== 'busy') {
    toast(`⏳ ${info.pending.length} acción${info.pending.length > 1 ? 'es' : ''} esperan tu aprobación`, 'warn');
  }
  lastState = info.state;

  // Marcar pill activo según el modo
  const pills = document.querySelectorAll('.cua-mode-pill');
  pills.forEach((p) => p.classList.toggle('active', p.dataset.mode === (info.mode ?? 'off')));

  // Broadcast modo al body — CSS oculta forms manuales cuando CU está activo
  const mode = info.mode ?? 'off';
  if (document.body.dataset.cuMode !== mode) {
    document.body.dataset.cuMode = mode;
    document.dispatchEvent(new CustomEvent('feedia:cu-mode', { detail: { mode } }));
  }

  // Estado box dentro del dropdown
  if (statusBox) {
    if (info.offline) {
      statusBox.innerHTML = `<div class="small" style="color:#EF4444;"><strong>📡 Sin conexión al backend</strong></div>
        <div class="small muted" style="margin-top:4px;">El topbar funciona pero no puede controlar el agente hasta reconectar.</div>`;
    } else {
      const caps = info.desktopStatus?.capabilitiesAvailable ?? {};
      const enabledCount = Object.values(caps).filter(Boolean).length;
      const modeDescr = {
        off: '🔴 Desactivado · ninguna acción se ejecuta automáticamente',
        auto: '🟢 Activado · el agente ejecuta libremente (mirá Pantalla en vivo)',
        supervised: '👁️ Asistente · cada acción importante requiere tu OK · podés frenarlo',
      }[info.mode ?? 'off'];
      statusBox.innerHTML = `
        <div><strong>${escapeHtml(modeDescr)}</strong></div>
        <div style="margin-top:4px;font-size:11px;color:var(--text-muted, #9CA3AF);">
          ${enabledCount} capabilities activas · ${info.replayInProgress > 0 ? `${info.replayInProgress} sesión en curso` : 'sin sesión en curso'}
        </div>
      `;
    }
  }

  // Lista de pending approvals
  if (pendingBox && pendingList && pendingCount) {
    const items = info.pending ?? [];
    if (items.length > 0) {
      pendingBox.hidden = false;
      pendingCount.textContent = String(items.length);
      pendingList.innerHTML = items
        .slice(0, 3)
        .map(
          (a) => `
        <div class="cua-pending-item" data-approval-id="${escapeHtml(a.id)}">
          <div class="small"><strong>${escapeHtml(a.action.slice(0, 60))}</strong></div>
          <div class="small muted">${escapeHtml(a.context.slice(0, 80))}${a.context.length > 80 ? '…' : ''}</div>
          <div class="actions">
            <button class="btn primary" data-approve="${escapeHtml(a.id)}">✓ Aprobar</button>
            <button class="btn ghost" data-reject="${escapeHtml(a.id)}">✗ Rechazar</button>
          </div>
        </div>
      `,
        )
        .join('');
      pendingList.querySelectorAll('[data-approve]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.approve;
          const { error } = await apiSafe(`/api/cu/mode/approve/${id}`, null, { method: 'POST', body: {} });
          if (error) toast('No se pudo aprobar', 'error');
          else {
            toast('✓ Aprobado', 'success');
            refreshState();
          }
        });
      });
      pendingList.querySelectorAll('[data-reject]').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = btn.dataset.reject;
          const { error } = await apiSafe(`/api/cu/mode/reject/${id}`, null, { method: 'POST', body: {} });
          if (error) toast('No se pudo rechazar', 'error');
          else {
            toast('Rechazado', 'info');
            refreshState();
          }
        });
      });
    } else {
      pendingBox.hidden = true;
    }
  }

  if (narratorCheckbox && info.voiceCfg && info.voiceCfg.enabled !== undefined) {
    narratorCheckbox.checked = info.voiceCfg.enabled;
  }
};

const refreshState = async () => {
  apiBust('/api/cu/mode');
  const info = await detectCuaState();
  updateUI(info);
};

const startPolling = () => {
  stopPolling();
  const poll = async () => {
    const info = await detectCuaState();
    updateUI(info);
  };
  poll();
  pollTimer = setInterval(poll, 8000);
};

const stopPolling = () => {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
};

const closeDropdown = () => {
  const dd = document.getElementById('cua-dropdown');
  const btn = document.getElementById('cua-btn');
  if (dd) dd.hidden = true;
  if (btn) btn.classList.remove('open');
};

const openDropdown = () => {
  const dd = document.getElementById('cua-dropdown');
  const btn = document.getElementById('cua-btn');
  if (dd) dd.hidden = false;
  if (btn) btn.classList.add('open');
};

const toggleDropdown = () => {
  const dd = document.getElementById('cua-dropdown');
  if (!dd) return;
  if (dd.hidden) openDropdown();
  else closeDropdown();
};

export const initTopbar = () => {
  const cuaBtn = document.getElementById('cua-btn');
  const cuaDropdown = document.getElementById('cua-dropdown');
  const narratorCheckbox = document.getElementById('cua-narrator-checkbox');
  const searchInput = document.getElementById('global-search');
  const notifBtn = document.getElementById('topbar-notif');
  const tasksBtn = document.getElementById('topbar-tasks');

  if (!cuaBtn) return;

  cuaBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  if (cuaDropdown) {
    cuaDropdown.addEventListener('click', (e) => e.stopPropagation());
  }

  document.addEventListener('click', (e) => {
    if (cuaDropdown && !cuaDropdown.hidden) {
      if (!cuaDropdown.contains(e.target) && !cuaBtn.contains(e.target)) {
        closeDropdown();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeDropdown();
  });

  // Quick-launch buttons
  document.querySelectorAll('[data-cua-launch]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const app = btn.dataset.cuaLaunch;
      try {
        if (app === 'canva') {
          await api('/api/cu/canva/open', { method: 'POST', body: {} });
          toast('🎨 Canva abierto', 'success');
        } else {
          const urlMap = {
            instagram: 'https://www.instagram.com/',
            figma: 'https://www.figma.com/',
            photopea: 'https://www.photopea.com/',
          };
          await api('/api/cu/apps/launch', {
            method: 'POST',
            body: { app: 'chrome', url: urlMap[app] },
          });
          toast(`${app} abierto en navegador`, 'success');
        }
      } catch (err) {
        toast(`Error: ${err.message ?? 'no se pudo abrir'}`, 'error');
      }
      closeDropdown();
    });
  });

  // Cierra dropdown al ir a una vista de CUA
  document.querySelectorAll('[data-cua-action]').forEach((item) => {
    item.addEventListener('click', () => closeDropdown());
  });

  // CUA Mode pills (Off / Auto / Supervisado)
  document.querySelectorAll('.cua-mode-pill').forEach((pill) => {
    pill.addEventListener('click', async (e) => {
      e.stopPropagation();
      const mode = pill.dataset.mode;
      // Optimistic UI: marcar activo inmediatamente
      document.querySelectorAll('.cua-mode-pill').forEach((p) => p.classList.toggle('active', p === pill));
      const { error } = await apiSafe('/api/cu/mode', null, {
        method: 'PUT',
        body: { mode, changedBy: 'user', reason: 'Cambio manual desde topbar' },
      });
      if (error) {
        const msg =
          error.code === 'API_NOT_FOUND'
            ? '⚙️ Servidor desactualizado: corré `npm run build && npm start` y volvé a probar.'
            : error.code === 'API_NETWORK_ERROR'
              ? 'Backend caído. Revisá que el servidor esté corriendo.'
              : `No se pudo cambiar el modo: ${error.message}`;
        toast(msg, 'error');
        // Volver al estado real
        await refreshState();
        return;
      }
      const label = {
        off: '🔴 Desactivado',
        auto: '🟢 Activado · auto-pilot',
        supervised: '👁️ Asistente · aprobás cada paso, podés frenar',
      }[mode];
      toast(`Modo CUA: ${label}`, 'success');
      await refreshState();
    });
  });

  // Emergency Stop — frena agente, rechaza pendientes, pasa a Off
  const emergencyBtn = document.getElementById('cua-emergency-stop');
  if (emergencyBtn) {
    emergencyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      emergencyBtn.disabled = true;
      // 1) Cancelar sesiones activas del watchdog (frena el agente mid-run)
      const { data: active } = await apiSafe('/api/cu/watchdog/active', { active: [] });
      const activeSessions = active?.active ?? [];
      await Promise.all(activeSessions.map((s) => apiSafe(`/api/cu/cancel/${s.sessionId}`, null, { method: 'POST' })));
      // 2) Rechazar todas las pending approvals
      const { data: pending } = await apiSafe('/api/cu/mode/pending-approvals', []);
      const items = pending ?? [];
      await Promise.all(
        items.map((a) =>
          apiSafe(`/api/cu/mode/reject/${a.id}`, null, { method: 'POST', body: { reason: 'emergency-stop' } }),
        ),
      );
      // 3) Forzar modo Off
      const { error } = await apiSafe('/api/cu/mode', null, {
        method: 'PUT',
        body: { mode: 'off', changedBy: 'user', reason: 'Emergency stop desde topbar' },
      });
      if (error) {
        const msg =
          error.code === 'API_NOT_FOUND'
            ? '⚙️ Servidor desactualizado: `npm run build && npm start` y reintentá.'
            : error.code === 'API_NETWORK_ERROR'
              ? 'Backend caído. Recargá la app cuando vuelva.'
              : `No se pudo frenar: ${error.message}`;
        toast(msg, 'error');
      } else {
        toast(`🛑 Agente frenado · ${activeSessions.length} sesiones + ${items.length} acciones canceladas`, 'success');
      }
      await refreshState();
      emergencyBtn.disabled = false;
      closeDropdown();
    });
  }

  // Voice Narrator toggle
  if (narratorCheckbox) {
    narratorCheckbox.addEventListener('change', async () => {
      const wantEnabled = narratorCheckbox.checked;
      try {
        if (wantEnabled) {
          await api('/api/cu/voice/enable', { method: 'POST', body: { level: 'normal' } });
          toast('🗣️ Voice Narrator activado', 'success');
        } else {
          await api('/api/cu/voice/disable', { method: 'POST', body: {} });
          toast('🔇 Voice Narrator desactivado', 'info');
        }
        apiBust('/api/cu/voice');
      } catch (err) {
        toast(`No se pudo cambiar: ${err.message}`, 'error');
        narratorCheckbox.checked = !wantEnabled;
      }
    });
  }

  // Global search: handler lives en lib/globalSearch.js (inicializado desde app.js)
  // No agregamos handler local acá para evitar conflictos.

  // Notif button — el handler que abre la campanita está en bootNotifications (app.js)
  // No agregamos handler acá para no chocar.

  // Tasks button
  if (tasksBtn) {
    tasksBtn.addEventListener('click', () => {
      window.location.hash = '#taskboard';
    });
  }

  startPolling();

  // Pausar polling cuando la pestaña no está visible
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPolling();
    else startPolling();
  });
};

export const refreshTopbarState = async () => {
  const info = await detectCuaState();
  updateUI(info);
};
