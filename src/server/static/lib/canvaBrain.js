/* ══════════════════════════════════════════════════════════════════════════════
   canvaBrain.js — Pipeline visual del Cerebro Computer Use operando Canva
   ──────────────────────────────────────────────────────────────────────────────
   Equipo de especialistas (branding, design, comm, publicist, art) orquestados
   en pasos secuenciales. Cada paso usa el agente correcto del backend.
   Modal in-app que muestra el progreso en vivo. Modo Supervisado pide aprobación.
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe } from './api.js';
import { toast } from './toast.js';
import { openExternal } from './dom.js';

/* Equipo de especialistas que opera Canva. Cada uno mapea a un agente del
   backend cuando existe; si no, simulación local. Pipeline 100% diseño-driven. */
const CANVA_TEAM = [
  {
    id: 'brand',
    emoji: '🎨',
    name: 'Brand Strategist',
    role: 'Branding · Pixel',
    task: 'Carga voz, paleta y reglas de marca del Brand Board',
    backendAgent: 'algorithm',
    backendAction: 'content-score',
    durationMs: 1100,
  },
  {
    id: 'designer',
    emoji: '🖼️',
    name: 'Visual Designer',
    role: 'Diseño · Nova',
    task: 'Elige template, compone layout, aplica paleta y jerarquía visual',
    backendAgent: 'visual-storyteller',
    backendAction: 'design-brief',
    durationMs: 2200,
  },
  {
    id: 'comm',
    emoji: '✍️',
    name: 'Communicator',
    role: 'Copy · Lía',
    task: 'Redacta titulares, bullets y CTA respetando voz de marca',
    backendAgent: 'algorithm',
    backendAction: 'content-score',
    durationMs: 1600,
  },
  {
    id: 'publicist',
    emoji: '📣',
    name: 'Publicist',
    role: 'Posicionamiento · Luca',
    task: 'Optimiza hook + caption + hashtags para alcance en Explore',
    backendAgent: 'algorithm',
    backendAction: 'reach-boost',
    durationMs: 1400,
  },
  {
    id: 'artist',
    emoji: '🎭',
    name: 'Art Director',
    role: 'Dirección artística · Pixel',
    task: 'Aprueba mood, contraste y consistencia visual con tu feed',
    backendAgent: 'visual-storyteller',
    backendAction: 'visual-audit',
    durationMs: 1300,
  },
  {
    id: 'compliance',
    emoji: '🛡️',
    name: 'Compliance Officer',
    role: 'Gard',
    task: 'Valida tono, riesgo de shadowban y políticas de IG',
    backendAgent: 'compliance',
    backendAction: 'safety-check',
    durationMs: 1000,
  },
  {
    id: 'publisher',
    emoji: '🚀',
    name: 'Publisher',
    role: 'Operador CUA',
    task: 'Toma el cursor: abre Canva → diseña → exporta → publica en Instagram',
    backendAgent: 'computer-use',
    backendAction: 'canva-to-instagram',
    durationMs: 2600,
  },
];

const escapeHtml = (s) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
  );

let activeModal = null;

const injectStyles = () => {
  if (document.getElementById('canva-brain-style')) return;
  const style = document.createElement('style');
  style.id = 'canva-brain-style';
  style.textContent = CB_STYLES;
  document.head.appendChild(style);
};

/* Lee modo CUA (auto / supervised / off) desde backend para decidir si pedir aprobaciones */
const getCuaMode = async () => {
  const { data } = await apiSafe('/api/cu/mode', { mode: 'off' });
  return data?.mode ?? 'off';
};

/* Lanza el pipeline: muestra modal y va ejecutando paso a paso */
export const launchCanvaBrain = async ({ topic, format, brand, contentPayload } = {}) => {
  injectStyles();
  // Limpiar previo
  document.querySelectorAll('.cb-modal').forEach((m) => m.remove());

  const mode = await getCuaMode();
  const modeLabel =
    mode === 'auto'
      ? '🚀 Auto · sin aprobaciones'
      : mode === 'supervised'
        ? '👁️ Supervisado · aprobás cada paso crítico'
        : '🔴 CUA Off · ejecución manual';

  activeModal = document.createElement('div');
  activeModal.className = 'cb-modal';
  activeModal.innerHTML = `
    <div class="cb-backdrop"></div>
    <div class="cb-panel">
      <div class="cb-header">
        <div class="cb-header-left">
          <span class="cb-radar"></span>
          <div>
            <div class="cb-title">🧠 Cerebro Computer Use · Canva</div>
            <div class="cb-sub">${escapeHtml(topic ? `"${topic}"` : 'Pipeline visual end-to-end')} · ${escapeHtml(format ?? 'feed-post')}</div>
          </div>
        </div>
        <div class="cb-mode-pill">${escapeHtml(modeLabel)}</div>
        <button class="cb-close" aria-label="Cerrar">✕</button>
      </div>

      <div class="cb-team" id="cb-team">
        ${CANVA_TEAM.map(
          (s, i) => `
          <div class="cb-step" data-step="${s.id}" data-idx="${i}">
            <div class="cb-step-emoji">${s.emoji}</div>
            <div class="cb-step-info">
              <div class="cb-step-name">${escapeHtml(s.name)}</div>
              <div class="cb-step-role">${escapeHtml(s.role)}</div>
              <div class="cb-step-task">${escapeHtml(s.task)}</div>
            </div>
            <div class="cb-step-state" data-state="idle">esperando</div>
          </div>`,
        ).join('')}
      </div>

      <div class="cb-log-wrap">
        <div class="cb-log-label">Log en vivo</div>
        <div class="cb-log" id="cb-log"></div>
      </div>

      <div class="cb-actions" id="cb-actions">
        <button class="cb-btn primary" id="cb-start">▶ Iniciar pipeline</button>
        <button class="cb-btn ghost" id="cb-cancel">Cerrar</button>
      </div>
    </div>`;
  document.body.appendChild(activeModal);

  const closeModal = () => {
    activeModal?.remove();
    activeModal = null;
  };
  activeModal.querySelector('.cb-backdrop').addEventListener('click', closeModal);
  activeModal.querySelector('.cb-close').addEventListener('click', closeModal);
  activeModal.querySelector('#cb-cancel').addEventListener('click', closeModal);
  activeModal.querySelector('#cb-start').addEventListener('click', async () => {
    activeModal.querySelector('#cb-actions').innerHTML =
      '<div class="cb-running">🔄 Pipeline corriendo… el equipo está operando.</div>';
    await runPipeline({ topic, format, brand, contentPayload, mode });
  });
};

const log = (text, kind = 'info') => {
  const el = activeModal?.querySelector('#cb-log');
  if (!el) return;
  const time = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const div = document.createElement('div');
  div.className = `cb-log-line cb-log-${kind}`;
  div.innerHTML = `<span class="cb-log-time">${escapeHtml(time)}</span> ${escapeHtml(text)}`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
};

const setStepState = (idx, state, detail) => {
  const step = activeModal?.querySelector(`.cb-step[data-idx="${idx}"]`);
  if (!step) return;
  const st = step.querySelector('.cb-step-state');
  st.dataset.state = state;
  st.textContent = detail ?? state;
  step.classList.toggle('cb-step-active', state === 'running');
  step.classList.toggle('cb-step-done', state === 'done');
  step.classList.toggle('cb-step-skip', state === 'skipped');
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const runPipeline = async ({ topic, format, brand, contentPayload, mode }) => {
  log(`🧠 Cerebro Computer Use iniciado · ${CANVA_TEAM.length} especialistas activos`, 'head');
  log(`📋 Modo: ${mode === 'auto' ? 'AUTO' : mode === 'supervised' ? 'SUPERVISED' : 'OFF (simulación)'}`, 'head');

  // Si CUA está OFF, ofrecer activarlo. No bloqueamos: corremos simulación visible.
  if (mode === 'off') {
    log('⚠️ CUA está apagado. Corriendo simulación visual. Activá Auto/Supervisado para ejecución real.', 'warn');
  }

  let designUrl = null;
  let publishUrl = null;

  for (let i = 0; i < CANVA_TEAM.length; i++) {
    const s = CANVA_TEAM[i];
    setStepState(i, 'running', 'trabajando…');
    log(`${s.emoji} ${s.name} → ${s.task}`, 'step');

    // Modo supervised: pedir aprobación para pasos críticos (designer + publisher)
    if (mode === 'supervised' && (s.id === 'designer' || s.id === 'publisher')) {
      const approved = await askApproval(s);
      if (!approved) {
        setStepState(i, 'skipped', 'rechazado');
        log(`✗ ${s.name} rechazado por el usuario. Pipeline detenido.`, 'crit');
        return finishPipeline({ aborted: true });
      }
    }

    // Llamar al backend cuando exista; si no, simular con sleep + outcome
    const backendCalled = await callBackendStep(s, { topic, format, brand, contentPayload });
    await sleep(s.durationMs * (mode === 'auto' ? 0.55 : 1));

    if (s.id === 'publisher' && backendCalled?.designUrl) designUrl = backendCalled.designUrl;
    if (s.id === 'publisher' && backendCalled?.postUrl) publishUrl = backendCalled.postUrl;

    setStepState(i, 'done', backendCalled?.ok === false ? 'simulado' : 'ok');
    log(`✓ ${s.name} completó: ${backendCalled?.message ?? s.task}`, backendCalled?.ok === false ? 'sim' : 'ok');
  }

  // Si el publisher devolvió un designUrl, abrir Canva
  if (designUrl) {
    log(`🎨 Canva listo: ${designUrl}`, 'ok');
    await openExternal(designUrl);
  } else if (mode !== 'off') {
    // Pedir al backend que abra Canva como fallback CUA
    const open = await apiSafe('/api/cu/canva/open', null, { method: 'POST', body: { topic, format } });
    if (!open.error) log('🖱️ Computer Use abrió Canva con el cursor', 'ok');
    else log('🌐 No se pudo abrir Canva vía CUA. Abriendo manualmente…', 'warn');
  }
  if (publishUrl) log(`📷 Post publicado: ${publishUrl}`, 'ok');

  finishPipeline({ aborted: false, designUrl, publishUrl });
};

const callBackendStep = async (step, payload) => {
  // Intenta los endpoints más probables; fallback a simulación local
  if (step.id === 'publisher') {
    const r = await apiSafe('/api/cu/canva/to-instagram', null, {
      method: 'POST',
      body: {
        topic: payload.topic,
        designIntent: 'educar',
        postType: payload.format ?? 'feed-post',
        publishMethod: 'computer-use',
        generateCaption: true,
      },
    });
    if (r.data?.ok) {
      return {
        ok: true,
        message: 'Diseño + publicación completados',
        designUrl: r.data?.designStep?.filePath ?? null,
        postUrl: r.data?.publishStep?.postUrl ?? null,
      };
    }
    return { ok: false, message: 'simulación: cursor abriría Canva, exportaría a IG (sin backend)' };
  }
  // Resto: best-effort sin tirar
  const r = await apiSafe(`/api/agents/${step.backendAgent}/action`, null, {
    method: 'POST',
    body: { actionId: step.backendAction, params: { topic: payload.topic, format: payload.format } },
  });
  if (r.data) return { ok: true, message: r.data.summary ?? r.data.title ?? 'completado' };
  return { ok: false, message: 'simulación local' };
};

const askApproval = (step) =>
  new Promise((resolve) => {
    if (!activeModal) return resolve(true);
    const overlay = document.createElement('div');
    overlay.className = 'cb-approval';
    overlay.innerHTML = `
    <div class="cb-approval-card">
      <div style="font-size:30px;">${step.emoji}</div>
      <h3>${escapeHtml(step.name)} pide aprobación</h3>
      <p>${escapeHtml(step.task)}</p>
      <div class="btn-row" style="justify-content:center;gap:8px;margin-top:14px;">
        <button class="cb-btn primary" id="cb-ap-yes">✓ Aprobar</button>
        <button class="cb-btn ghost" id="cb-ap-no">✗ Rechazar</button>
      </div>
    </div>`;
    activeModal.appendChild(overlay);
    overlay.querySelector('#cb-ap-yes').addEventListener('click', () => {
      overlay.remove();
      resolve(true);
    });
    overlay.querySelector('#cb-ap-no').addEventListener('click', () => {
      overlay.remove();
      resolve(false);
    });
  });

const finishPipeline = ({ aborted, designUrl, publishUrl }) => {
  const actions = activeModal?.querySelector('#cb-actions');
  if (!actions) return;
  if (aborted) {
    actions.innerHTML = `
      <button class="cb-btn ghost" id="cb-close-final">Cerrar</button>
      <div class="cb-aborted">Pipeline detenido. Podés retomar más tarde.</div>`;
  } else {
    actions.innerHTML = `
      <div class="cb-done">🎉 Pipeline completado · el equipo terminó</div>
      ${designUrl ? `<a class="cb-btn primary" href="${escapeHtml(designUrl)}" target="_blank" rel="noopener">Abrir diseño en Canva →</a>` : ''}
      ${publishUrl ? `<a class="cb-btn primary" href="${escapeHtml(publishUrl)}" target="_blank" rel="noopener">Ver post →</a>` : ''}
      <button class="cb-btn ghost" id="cb-close-final">Cerrar</button>`;
  }
  actions.querySelector('#cb-close-final')?.addEventListener('click', () => {
    activeModal?.remove();
    activeModal = null;
  });
  toast(aborted ? 'Pipeline detenido' : '🎉 Canva pipeline completado', aborted ? 'warn' : 'ok');
};

const CB_STYLES = `
.cb-modal { position: fixed; inset: 0; z-index: 100000; display: flex; align-items: center; justify-content: center; animation: cbIn .15s ease; }
@keyframes cbIn { from { opacity: 0; } to { opacity: 1; } }
.cb-backdrop { position: absolute; inset: 0; background: rgba(0,0,0,.72); backdrop-filter: blur(6px); }
.cb-panel {
  position: relative; width: min(720px, calc(100% - 32px)); max-height: 90vh;
  display: flex; flex-direction: column;
  background: linear-gradient(180deg, #1a1530 0%, #0c0c14 100%);
  border: 1px solid rgba(168,85,247,.3); border-radius: 18px; overflow: hidden;
  box-shadow: 0 24px 70px rgba(168,85,247,.18), 0 24px 60px rgba(0,0,0,.6);
  animation: cbSlide .24s cubic-bezier(.16,.84,.44,1);
}
@keyframes cbSlide { from { opacity: 0; transform: translateY(12px) scale(.97); } to { opacity: 1; transform: none; } }
.cb-header { display: flex; align-items: center; gap: 14px; padding: 16px 18px; border-bottom: 1px solid rgba(255,255,255,.06); }
.cb-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.cb-radar {
  width: 10px; height: 10px; border-radius: 50%; background: #22d3ee;
  box-shadow: 0 0 14px rgba(34,211,238,.7);
  animation: cbRadar 1.8s ease-in-out infinite; flex-shrink: 0;
}
@keyframes cbRadar { 0%,100% { opacity: .55; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.18); } }
.cb-title { font-size: 15px; font-weight: 800; }
.cb-sub { font-size: 11.5px; color: rgba(255,255,255,.6); margin-top: 2px; }
.cb-mode-pill {
  font-size: 10.5px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  background: rgba(168,85,247,.18); color: #d8b4fe; border: 1px solid rgba(168,85,247,.35);
  white-space: nowrap;
}
.cb-close { background: transparent; border: 0; color: #fff; font-size: 18px; cursor: pointer; width: 30px; height: 30px; border-radius: 6px; }
.cb-close:hover { background: rgba(255,255,255,.08); }
.cb-team { padding: 14px 18px; overflow-y: auto; flex: 1; min-height: 200px; }
.cb-step {
  display: flex; gap: 12px; align-items: center; padding: 10px 12px; margin-bottom: 6px;
  background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06); border-radius: 10px;
  transition: background .15s, border-color .15s;
}
.cb-step.cb-step-active {
  background: linear-gradient(135deg, rgba(99,102,241,.18), rgba(168,85,247,.1));
  border-color: rgba(168,85,247,.5);
  animation: cbPulseBorder 1.4s ease-in-out infinite;
}
@keyframes cbPulseBorder { 0%,100% { box-shadow: 0 0 0 0 rgba(168,85,247,.4); } 50% { box-shadow: 0 0 0 6px rgba(168,85,247,0); } }
.cb-step.cb-step-done { background: rgba(16,185,129,.08); border-color: rgba(16,185,129,.3); }
.cb-step.cb-step-skip { opacity: .4; }
.cb-step-emoji { font-size: 26px; flex-shrink: 0; line-height: 1; }
.cb-step-info { flex: 1; min-width: 0; }
.cb-step-name { font-size: 13.5px; font-weight: 700; }
.cb-step-role { font-size: 10.5px; color: rgba(255,255,255,.55); margin-top: 1px; }
.cb-step-task { font-size: 11.5px; color: rgba(255,255,255,.7); margin-top: 4px; line-height: 1.4; }
.cb-step-state {
  font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px;
  background: rgba(255,255,255,.05); color: rgba(255,255,255,.5);
  text-transform: uppercase; letter-spacing: .05em; flex-shrink: 0;
}
.cb-step-state[data-state="running"] { background: rgba(34,211,238,.18); color: #67e8f9; }
.cb-step-state[data-state="done"] { background: rgba(16,185,129,.18); color: #6ee7b7; }
.cb-step-state[data-state="skipped"] { background: rgba(239,68,68,.18); color: #fca5a5; }

.cb-log-wrap { padding: 0 18px 12px; }
.cb-log-label { font-size: 10.5px; font-weight: 700; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .06em; margin-bottom: 6px; }
.cb-log { background: rgba(0,0,0,.4); border-radius: 8px; padding: 8px 10px; max-height: 120px; overflow-y: auto; font-family: ui-monospace, Consolas, monospace; font-size: 11px; }
.cb-log-line { padding: 2px 0; line-height: 1.45; color: rgba(255,255,255,.75); }
.cb-log-line.cb-log-head { color: #d8b4fe; font-weight: 600; }
.cb-log-line.cb-log-step { color: #93c5fd; }
.cb-log-line.cb-log-ok { color: #6ee7b7; }
.cb-log-line.cb-log-sim { color: #fcd34d; }
.cb-log-line.cb-log-warn { color: #fdba74; }
.cb-log-line.cb-log-crit { color: #fca5a5; }
.cb-log-time { color: rgba(255,255,255,.35); margin-right: 6px; }

.cb-actions {
  display: flex; gap: 8px; align-items: center; padding: 14px 18px;
  border-top: 1px solid rgba(255,255,255,.06); background: rgba(0,0,0,.25);
  flex-wrap: wrap;
}
.cb-btn {
  border: 0; padding: 9px 16px; border-radius: 10px; cursor: pointer;
  font-size: 13px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
}
.cb-btn.primary { background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; }
.cb-btn.primary:hover { filter: brightness(1.1); }
.cb-btn.ghost { background: rgba(255,255,255,.05); color: #fff; border: 1px solid rgba(255,255,255,.1); }
.cb-running { color: #67e8f9; font-size: 12.5px; font-weight: 600; }
.cb-done { color: #6ee7b7; font-size: 13px; font-weight: 700; }
.cb-aborted { color: #fdba74; font-size: 12px; }

.cb-approval {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.6); backdrop-filter: blur(8px); z-index: 2;
  animation: cbIn .15s ease;
}
.cb-approval-card {
  background: var(--surface, #141418); border: 1px solid rgba(245,158,11,.5);
  border-radius: 14px; padding: 20px 22px; max-width: 360px; text-align: center;
  box-shadow: 0 16px 50px rgba(245,158,11,.2);
}
.cb-approval-card h3 { margin: 8px 0 6px; font-size: 15px; }
.cb-approval-card p { font-size: 12.5px; color: var(--text-muted, #9CA3AF); margin: 0; line-height: 1.5; }
`;
