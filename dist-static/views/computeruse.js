/* ══════════════════════════════════════════════════════════════════════════════
   PANTALLA EN VIVO — Computer Use Agent observable
   ──────────────────────────────────────────────────────────────────────────────
   El usuario escribe una instrucción y MIRA: el cursor se mueve solo, se
   abren apps, se tipea letra por letra. Stream SSE → escenario animado.
   ══════════════════════════════════════════════════════════════════════════════ */
import { api } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { withBtnSpinner } from '../lib/ui.js';

let es = null;
const stop = () => {
  try {
    es && es.close();
  } catch {
    /* noop */
  }
  es = null;
};
window.addEventListener('beforeunload', stop);
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'pantalla') stop();
});

const GESTURE_ICON = {
  navigate: '🧭',
  click: '👆',
  'double-click': '👆',
  type: '⌨️',
  scroll: '🖱️',
  hover: '✋',
  press: '⏎',
  wait: '⏳',
};

const onEvent = (root, ev) => {
  const stage = root.querySelector('#cu-stage');
  const cursor = root.querySelector('#cu-cursor');
  const titleEl = root.querySelector('#cu-apptitle');
  const narrate = root.querySelector('#cu-narrate');
  const typed = root.querySelector('#cu-typed');
  const log = root.querySelector('#cu-log');
  const prog = root.querySelector('#cu-progress');
  if (!stage) return;

  if (ev.kind === 'session-start') {
    titleEl.textContent = `Preparando — ${ev.surface}`;
    narrate.textContent = `Instrucción: ${ev.instruction}`;
    log.innerHTML = '';
    typed.textContent = '';
    prog.textContent = `0 / ${ev.steps}`;
    stage.dataset.total = ev.steps;
    if (ev.requiresApproval)
      toast('Este plan toca acciones de escritura (requiere aprobación para ejecutar de verdad)', 'warn');
  } else if (ev.kind === 'app-open') {
    titleEl.textContent = ev.app;
    stage.classList.add('cu-screen-on');
    const b = document.createElement('div');
    b.className = 'tiny muted';
    b.textContent = `🪟 ${ev.note}`;
    log.prepend(b);
  } else if (ev.kind === 'cursor') {
    // El cursor se desplaza solo (transición CSS).
    const rect = stage.getBoundingClientRect();
    const sx = (ev.x / 1000) * rect.width;
    const sy = (ev.y / 620) * rect.height;
    cursor.style.left = `${sx}px`;
    cursor.style.top = `${sy}px`;
    cursor.setAttribute('data-label', ev.label);
  } else if (ev.kind === 'act') {
    cursor.classList.add('cu-click');
    setTimeout(() => cursor.classList.remove('cu-click'), 320);
    narrate.innerHTML = `${GESTURE_ICON[ev.gesture] || '•'} <b>${escape(ev.gesture)}</b> → ${escape(ev.target)}<br><span class="muted">${escape(ev.narrate)}</span>`;
    if (ev.gesture !== 'type') typed.textContent = '';
  } else if (ev.kind === 'screenshot') {
    let img = stage.querySelector('#cu-shot');
    if (!img) {
      img = document.createElement('img');
      img.id = 'cu-shot';
      img.className = 'cu-shot';
      stage.prepend(img);
    }
    img.src = ev.dataUri;
    stage.classList.add('cu-has-shot');
  } else if (ev.kind === 'type-char') {
    typed.textContent = ev.full + '▌';
  } else if (ev.kind === 'step-done') {
    const row = document.createElement('div');
    row.className = 'cu-step-row';
    row.innerHTML = `<span class="tag ok tiny">✓</span><span class="small">#${ev.step} ${escape(ev.detail)}</span>`;
    log.prepend(row);
    const done = log.querySelectorAll('.cu-step-row').length;
    prog.textContent = `${done} / ${stage.dataset.total || '?'}`;
  } else if (ev.kind === 'session-end') {
    titleEl.textContent = ev.completed ? '✅ Tarea completada' : '⛔ Sesión finalizada';
    narrate.innerHTML = ev.completed
      ? `<b>Listo.</b> El sistema completó ${ev.ok}/${ev.total} pasos solo.`
      : 'La sesión terminó.';
    typed.textContent = '';
    cursor.classList.remove('cu-click');
    stop();
  }
};

const attachToSession = (root, sessionId) => {
  stop();
  es = new EventSource(`/api/computer/stream?session=${encodeURIComponent(sessionId)}`);
  es.addEventListener('cu', (e) => {
    let d;
    try {
      d = JSON.parse(e.data);
    } catch {
      return;
    }
    onEvent(root, d);
  });
  es.onerror = () => {
    /* fin de stream: el server cierra al terminar */
  };
};

const watch = async (root, instruction, speed) => {
  let r;
  try {
    r = await api('/api/computer/watch', { method: 'POST', body: { instruction, speed } });
  } catch (err) {
    toast('Error: ' + err.message, 'crit');
    return;
  }
  attachToSession(root, r.sessionId);
};

export const renderComputerUse = async (root) => {
  stop();
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🖥️ Pantalla en vivo</h1>
        <p class="view-subtitle page-subtitle">Computer Use Agent: escribí una orden y mirá cómo el sistema abre apps, mueve el cursor y opera solo.</p>
      </div>
    </header>
    <div class="page-body">
      <!-- 🧠 Cerebro Activado: master switch + 6 subsistemas -->
      <div class="card cu-brain" id="cu-brain">
        <div class="cu-brain-head">
          <div>
            <div class="cu-brain-title"><span>🧠</span> <b>Cerebro autónomo</b> <span class="tag tiny" id="cu-brain-status">cargando…</span></div>
            <div class="tiny muted">Cuando está <b>Activado</b>, los subsistemas marcados corren solos en su ciclo. Apagado = todo manual.</div>
          </div>
          <label class="cu-switch" title="Activar cerebro autónomo">
            <input type="checkbox" id="cu-master"/><span class="cu-slider"></span>
          </label>
        </div>
        <div class="cu-modules" id="cu-modules">
          <div class="tiny muted">cargando subsistemas…</div>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <div class="row" style="gap:8px;align-items:flex-end;flex-wrap:wrap;">
          <div style="flex:1;min-width:240px;">
            <label class="small muted">¿Qué querés que haga? (modo manual)</label>
            <input id="cu-instruction" class="input" placeholder="Ej: armá un carrusel del nicho y subilo a Instagram" />
          </div>
          <div style="width:120px;">
            <label class="small muted">Velocidad</label>
            <select id="cu-speed" class="input">
              <option value="0.5">Lenta</option>
              <option value="1" selected>Normal</option>
              <option value="2">Rápida</option>
            </select>
          </div>
          <button class="btn primary" id="cu-go">▶ Mirar</button>
        </div>
      </div>

      <div class="card" style="margin-top:12px;padding:0;overflow:hidden;">
        <div class="cu-titlebar">
          <span class="cu-dot" style="background:#ff5f56"></span>
          <span class="cu-dot" style="background:#ffbd2e"></span>
          <span class="cu-dot" style="background:#27c93f"></span>
          <span id="cu-apptitle" class="small" style="margin-left:10px;font-weight:600;">Pantalla apagada</span>
          <span id="cu-progress" class="tag tiny" style="margin-left:auto;">0 / 0</span>
        </div>
        <div id="cu-stage" class="cu-stage">
          <div id="cu-narrate" class="cu-narrate muted">Escribí una instrucción y tocá “Mirar”. Te podés cruzar de brazos.</div>
          <div id="cu-typed" class="cu-typed"></div>
          <div id="cu-cursor" class="cu-cursor"></div>
        </div>
      </div>

      <div class="card" style="margin-top:12px;">
        <b class="small">Registro en vivo</b>
        <div id="cu-log" class="cu-loglist" style="margin-top:8px;max-height:240px;overflow:auto;"></div>
      </div>
    </div>

    <style>
      .cu-titlebar{display:flex;align-items:center;gap:6px;padding:10px 14px;background:var(--surface-2,#1a1a1a);border-bottom:1px solid var(--border);}
      .cu-dot{width:11px;height:11px;border-radius:50%;display:inline-block;}
      .cu-stage{position:relative;height:440px;background:radial-gradient(circle at 50% 30%, #1d1d22, #0c0c0e);overflow:hidden;transition:background .4s;}
      .cu-stage.cu-screen-on{background:radial-gradient(circle at 50% 30%, #23232b, #101014);}
      .cu-shot{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:1;}
      .cu-stage.cu-has-shot .cu-narrate{background:rgba(0,0,0,.55);border-radius:8px;}
      .cu-narrate{position:absolute;top:18px;left:0;right:0;text-align:center;font-size:15px;padding:0 24px;line-height:1.5;}
      .cu-typed{position:absolute;left:50%;top:46%;transform:translateX(-50%);max-width:78%;background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-family:ui-monospace,monospace;font-size:14px;color:var(--fg);min-height:0;}
      .cu-typed:empty{display:none;}
      .cu-cursor{position:absolute;left:40px;top:40px;width:22px;height:22px;pointer-events:none;transition:left .55s cubic-bezier(.4,.1,.2,1), top .55s cubic-bezier(.4,.1,.2,1);z-index:5;}
      .cu-cursor::before{content:"";position:absolute;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:16px solid #fff;transform:rotate(-35deg);filter:drop-shadow(0 1px 2px rgba(0,0,0,.6));}
      .cu-cursor::after{content:attr(data-label);position:absolute;left:18px;top:14px;font-size:10px;background:var(--accent);color:#fff;padding:1px 6px;border-radius:6px;white-space:nowrap;opacity:.92;}
      .cu-cursor.cu-click::before{filter:drop-shadow(0 0 6px var(--accent));}
      .cu-cursor.cu-click{animation:cuPulse .32s ease;}
      @keyframes cuPulse{0%{transform:scale(1)}50%{transform:scale(.78)}100%{transform:scale(1)}}
      .cu-loglist .cu-step-row{display:flex;gap:8px;align-items:center;padding:3px 0;}
      /* Cerebro Activado */
      .cu-brain{background:linear-gradient(135deg,rgba(225,48,108,.06),rgba(168,85,247,.04));border-color:var(--border-focus,#333);}
      .cu-brain.on{border-color:rgba(74,222,128,.55);box-shadow:0 0 0 1px rgba(74,222,128,.2), 0 12px 30px rgba(0,0,0,.25);}
      .cu-brain-head{display:flex;align-items:center;gap:14px;justify-content:space-between;flex-wrap:wrap;}
      .cu-brain-title{display:flex;align-items:center;gap:8px;font-size:15px;}
      .cu-modules{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-top:14px;}
      .cu-mod{background:var(--bg-card,#15151b);border:1px solid var(--border);border-radius:12px;padding:11px 13px;display:flex;align-items:flex-start;gap:10px;transition:border-color .15s, opacity .2s;}
      .cu-mod.off{opacity:.55;}
      .cu-mod-info{flex:1;min-width:0;}
      .cu-mod-info b{font-size:13px;display:block;}
      .cu-mod-info .desc{font-size:11.5px;color:var(--text-tertiary,#8a8a98);line-height:1.4;margin-top:2px;}
      .cu-mod-info .meta{font-size:10.5px;color:var(--text-tertiary,#6a6a78);margin-top:4px;display:flex;gap:8px;flex-wrap:wrap;}
      /* Switch reutilizable */
      .cu-switch{position:relative;display:inline-block;width:44px;height:24px;flex-shrink:0;cursor:pointer;}
      .cu-switch input{opacity:0;width:0;height:0;}
      .cu-slider{position:absolute;inset:0;background:#2c2c38;border-radius:24px;transition:background .2s;}
      .cu-slider::before{content:"";position:absolute;height:18px;width:18px;left:3px;top:3px;background:#fff;border-radius:50%;transition:transform .22s cubic-bezier(.2,.8,.2,1);}
      .cu-switch input:checked + .cu-slider{background:linear-gradient(135deg,#e1306c,#a855f7);}
      .cu-switch input:checked + .cu-slider::before{transform:translateX(20px);}
      .cu-switch input:disabled + .cu-slider{opacity:.4;cursor:not-allowed;}
    </style>`;

  const go = root.querySelector('#cu-go');
  go.addEventListener('click', async (e) => {
    const instruction = root.querySelector('#cu-instruction').value.trim();
    if (!instruction) {
      toast('Escribí una instrucción', 'warn');
      return;
    }
    const speed = Number(root.querySelector('#cu-speed').value) || 1;
    await withBtnSpinner(e.currentTarget, 'mirando…', async () => {
      await watch(root, instruction, speed);
    });
  });
  root.querySelector('#cu-instruction').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') go.click();
  });

  /* 🧠 Cerebro Activado — master + 6 subsistemas (persiste via API) */
  const brain = root.querySelector('#cu-brain');
  const brainStatus = root.querySelector('#cu-brain-status');
  const masterEl = root.querySelector('#cu-master');
  const modsEl = root.querySelector('#cu-modules');
  const fmtRel = (iso) => {
    if (!iso) return '—';
    const d = Date.now() - Date.parse(iso);
    if (isNaN(d)) return '—';
    const m = Math.round(d / 60000);
    if (m < 1) return 'recién';
    if (m < 60) return `hace ${m} min`;
    const h = Math.round(m / 60);
    return h < 24 ? `hace ${h} h` : `hace ${Math.round(h / 24)} d`;
  };
  const renderModules = (s) => {
    const mods = Object.values(s.modules || {});
    modsEl.innerHTML = mods
      .map(
        (m) => `
      <div class="cu-mod ${m.enabled ? '' : 'off'}" data-id="${m.id}">
        <label class="cu-switch"><input type="checkbox" class="cu-mod-toggle" data-id="${m.id}" ${m.enabled ? 'checked' : ''} ${s.activated ? '' : 'disabled'}/><span class="cu-slider"></span></label>
        <div class="cu-mod-info">
          <b>${m.label}</b>
          <div class="desc">${m.description}</div>
          <div class="meta"><span>último: ${fmtRel(m.lastRunAt)}</span>${m.nextRunAt ? `<span>· próx: ${fmtRel(m.nextRunAt)}</span>` : ''}</div>
        </div>
      </div>`,
      )
      .join('');
    modsEl.querySelectorAll('.cu-mod-toggle').forEach((inp) => {
      inp.addEventListener('change', async (e) => {
        const id = e.target.dataset.id;
        const enabled = e.target.checked;
        try {
          const updated = await api('/api/autopilot/activated', { method: 'POST', body: { moduleId: id, enabled } });
          renderState(updated);
          toast(`${updated.modules[id]?.label}: ${enabled ? 'activado' : 'pausado'}`, enabled ? 'ok' : 'info');
        } catch (err) {
          toast('No se pudo guardar: ' + err.message, 'crit');
          e.target.checked = !enabled;
        }
      });
    });
  };
  const renderState = (s) => {
    brain.classList.toggle('on', !!s.activated);
    masterEl.checked = !!s.activated;
    brainStatus.textContent = s.activated ? '● Activado' : '○ Apagado';
    brainStatus.className = `tag tiny ${s.activated ? 'ok' : ''}`;
    renderModules(s);
  };
  masterEl.addEventListener('change', async (e) => {
    const activated = e.target.checked;
    try {
      const updated = await api('/api/autopilot/activated', { method: 'POST', body: { activated } });
      renderState(updated);
      toast(activated ? '🧠 Cerebro autónomo activado' : '🧠 Cerebro autónomo apagado', activated ? 'ok' : 'info');
    } catch (err) {
      toast('No se pudo cambiar: ' + err.message, 'crit');
      e.target.checked = !activated;
    }
  });
  api('/api/autopilot/activated')
    .then(renderState)
    .catch(() => {
      brainStatus.textContent = 'sin conexión';
      modsEl.innerHTML = '<div class="tiny muted">No se pudo cargar el estado. Reintentá refrescando.</div>';
    });

  /* Handoff desde otra vista (ej: Carrusel Studio → "Crear en vivo en Canva").
     Si hay un sessionId guardado en sessionStorage, nos enganchamos al vuelo. */
  try {
    const handoff = sessionStorage.getItem('fx_cu_session');
    if (handoff) {
      sessionStorage.removeItem('fx_cu_session');
      const ttl = root.querySelector('#cu-apptitle');
      if (ttl) ttl.textContent = 'Continuando sesión iniciada desde el Estudio…';
      attachToSession(root, handoff);
    }
  } catch {
    /* sandboxed storage */
  }
};
