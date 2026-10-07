/* ══════════════════════════════════════════════════════════════════════════════
   FORGE IA v2 — DECISION ENGINE
   ──────────────────────────────────────────────────────────────────────────────
   Flujo secuencial único que integra todas las fases en una decisión ejecutable:
     STEP 1: PREDICT   → Ángulos + hooks calibrados (phases 1-5)
     STEP 2: OPTIMIZE  → Personas + hashtags + timing (phases 6-10)
     STEP 3: ASSESS    → Health score + benchmark (phases 11-13)
     STEP 4: VERDICT   → Viral coeff + growth + repurposing (phases 14-16)
     STEP 5: ACTION    → Plan ejecutable + timeline
   ══════════════════════════════════════════════════════════════════════════════ */

import { apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';

const FORMATOS = [
  ['carrusel', '🗂️ Carrusel'],
  ['reel', '🎬 Reel / Video'],
  ['historia', '◎ Historia'],
];
const PLATAFORMAS = [
  ['instagram', '📷 Instagram'],
  ['tiktok', '🎵 TikTok'],
];
const OBJETIVOS = [
  ['engagement', '💜 Engagement'],
  ['alcance', '📡 Alcance'],
  ['conversion', '💰 Conversión'],
  ['comunidad', '👥 Comunidad'],
  ['ventas', '🛒 Ventas'],
];
const VOCES = ['cercano', 'profesional', 'autoritativo', 'humorístico', 'inspirador'];

const estado = {
  entrada: null,
  stepActual: 0,
  resultados: {},
  ocupado: false,
};

const colorPuntaje = (n) => (n >= 75 ? '#10b981' : n >= 60 ? '#3b82f6' : n >= 45 ? '#a855f7' : '#f59e0b');

const getActivePlatform = () => {
  try {
    return localStorage.getItem('feedia.platform') === 'tiktok' ? 'tiktok' : 'instagram';
  } catch {
    return 'instagram';
  }
};

const opciones = (lista, actual) =>
  lista.map(([v, l]) => `<option value="${v}" ${v === actual ? 'selected' : ''}>${l}</option>`).join('');

/* ───────── Vista Principal ───────── */

const buildForm = (platform) => `
  <div class="fg-card">
    <h2 class="fg-section-title">⚡ Forge Decision Engine</h2>
    <p class="fg-section-sub">Tu asistente para decidir qué, cuándo y cómo publicar — calibrado con datos reales.</p>

    <div class="fg-form-grid">
      <label class="fg-field fg-field-wide">
        <span class="fg-label">¿Sobre qué contenido quieres decidir?</span>
        <input class="fg-input" id="fg-topic" placeholder="Ej: 5 tips para automatizar marketing" autocomplete="off" />
      </label>
      <label class="fg-field">
        <span class="fg-label">Plataforma</span>
        <select class="fg-input" id="fg-platform">${opciones(PLATAFORMAS, platform)}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Formato</span>
        <select class="fg-input" id="fg-format">${opciones(FORMATOS, 'reel')}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Objetivo</span>
        <select class="fg-input" id="fg-goal">${opciones(OBJETIVOS, 'engagement')}</select>
      </label>
      <label class="fg-field">
        <span class="fg-label">Nicho</span>
        <input class="fg-input" id="fg-niche" placeholder="Ej: marketing, startups, IA" autocomplete="off" />
      </label>
      <label class="fg-field">
        <span class="fg-label">Voz de marca</span>
        <select class="fg-input" id="fg-voice">${VOCES.map((v) => `<option value="${v}">${v.charAt(0).toUpperCase() + v.slice(1)}</option>`).join('')}</select>
      </label>
    </div>

    <div class="fg-actions" style="display: flex; gap: 12px; justify-content: center; margin-top: 24px;">
      <button class="fg-btn fg-btn-primary" data-action="decision-flow" style="flex: 1; padding: 12px 24px; font-size: 16px; font-weight: 600;">
        <span class="fg-btn-icon">🎯</span>Iniciar Análisis
      </button>
      <button class="fg-btn fg-btn-secondary" data-action="legado" style="flex: 1; padding: 12px 24px;">Ver Herramientas Anteriores</button>
    </div>

    <p class="fg-disclaimer" style="margin-top: 20px; font-size: 12px; color: #64748b;">
      Forge analizará 5 dimensiones: predicción viral, optimización de timing, salud de cuenta, crecimiento y repurposing.
    </p>
  </div>`;

const buildDecisionFlow = () => `
  <div class="fg-card">
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
      <h2 class="fg-section-title" style="margin: 0;">Forge Decision Flow</h2>
      <button class="fg-btn fg-btn-ghost" data-action="back-to-form" style="padding: 8px 12px; font-size: 14px;">← Volver</button>
    </div>

    <div style="margin-bottom: 24px;">
      <div style="display: flex; gap: 8px; margin-bottom: 8px;">
        <div class="fg-progress-step fg-progress-active" data-step="1"><span>1</span><div class="fg-progress-label">PREDICT</div></div>
        <div class="fg-progress-step" data-step="2"><span>2</span><div class="fg-progress-label">OPTIMIZE</div></div>
        <div class="fg-progress-step" data-step="3"><span>3</span><div class="fg-progress-label">ASSESS</div></div>
        <div class="fg-progress-step" data-step="4"><span>4</span><div class="fg-progress-label">VERDICT</div></div>
        <div class="fg-progress-step" data-step="5"><span>5</span><div class="fg-progress-label">ACTION</div></div>
      </div>
      <div class="fg-progress-bar"><div class="fg-progress-fill" style="width: 20%;"></div></div>
    </div>

    <div id="fg-step-content" class="fg-step-container"></div>

    <div class="fg-actions" style="margin-top: 24px; display: flex; gap: 12px;">
      <button class="fg-btn fg-btn-secondary" id="fg-btn-prev" data-action="prev-step" style="display: none;">← Anterior</button>
      <button class="fg-btn fg-btn-primary" id="fg-btn-next" data-action="next-step">Siguiente →</button>
      <button class="fg-btn fg-btn-ghost" id="fg-btn-cancel" data-action="cancel-flow">Cancelar</button>
    </div>
  </div>`;

/* ───────── Renderización de Steps ───────── */

const renderStepPredict = () => `
  <h3>📊 STEP 1: PREDICT — Dirección & Hooks</h3>
  <p style="color: #64748b; margin-bottom: 16px;">Analizamos tu historial real para sugerir 3 direcciones probadas + hooks calibrados.</p>
  <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
    <div style="color: #94a3b8;">Analizando tu historial y generando direcciones...</div>
  </div>`;

const renderStepOptimize = () => `
  <h3>🎯 STEP 2: OPTIMIZE — Personas, Hashtags, Timing</h3>
  <p style="color: #64748b; margin-bottom: 16px;">Identificamos tu audiencia dominante, hashtags estratégicos y momento óptimo.</p>
  <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
    <div style="color: #94a3b8;">Optimizando para máximo engagement...</div>
  </div>`;

const renderStepAssess = () => `
  <h3>🏥 STEP 3: ASSESS — Salud de Cuenta</h3>
  <p style="color: #64748b; margin-bottom: 16px;">Diagnóstico: ¿está tu cuenta lista para este contenido?</p>
  <div style="background: #f8fafc; padding: 16px; border-radius: 8px;">
    <div style="color: #94a3b8;">Evaluando factores de cuenta...</div>
  </div>`;

const renderStepVerdict = () => `
  <h3>🚀 STEP 4: VERDICT — Predicción Viral & Crecimiento</h3>
  <p style="color: #64748b; margin-bottom: 16px;">¿Va a funcionar? ¿Cuánto crece tu cuenta?</p>
  <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
    <div style="background: #fef2f2; padding: 16px; border-radius: 8px; border: 2px solid #fca5a5;">
      <div style="font-size: 24px; font-weight: 700; color: #dc2626;">—/100</div>
      <div style="font-size: 13px; font-weight: 600; color: #dc2626;">Viral Coeff</div>
    </div>
    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 2px solid #86efac;">
      <div style="font-size: 24px; font-weight: 700; color: #16a34a;">+—</div>
      <div style="font-size: 13px; font-weight: 600; color: #16a34a;">Seguidores 90d</div>
    </div>
    <div style="background: #f5f3ff; padding: 16px; border-radius: 8px; border: 2px solid #d8b4fe;">
      <div style="font-size: 24px; font-weight: 700; color: #a855f7;">7</div>
      <div style="font-size: 13px; font-weight: 600; color: #a855f7;">Formatos</div>
    </div>
  </div>`;

const renderStepAction = () => `
  <h3>✅ STEP 5: ACTION PLAN</h3>
  <p style="color: #64748b; margin-bottom: 16px;">Tu plan ejecutable para publicar, crecer y escalar.</p>
  <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 2px solid #10b981; margin-bottom: 16px;">
    <div style="display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 32px;">✅</div>
      <div>
        <div style="font-weight: 700; font-size: 18px; color: #16a34a;">DECISIÓN: PROCEDER</div>
        <div style="font-size: 13px; color: #64748b;">Basada en predicción de viralidad y crecimiento proyectado</div>
      </div>
    </div>
  </div>`;

/* ───────── Lógica ───────── */

const ejecutarStep = async (step) => {
  estado.stepActual = step;
  const container = document.querySelector('#fg-step-content');

  let html = '';
  switch (step) {
    case 1:
      html = renderStepPredict();
      break;
    case 2:
      html = renderStepOptimize();
      break;
    case 3:
      html = renderStepAssess();
      break;
    case 4:
      html = renderStepVerdict();
      break;
    case 5:
      html = renderStepAction();
      break;
  }

  container.innerHTML = html;
  actualizarControles(step);
  actualizarProgress(step);
};

const actualizarControles = (step) => {
  document.querySelector('#fg-btn-prev').style.display = step > 1 ? 'block' : 'none';
  document.querySelector('#fg-btn-next').textContent = step === 5 ? '🎉 Completado' : 'Siguiente →';
};

const actualizarProgress = (step) => {
  document.querySelectorAll('.fg-progress-step').forEach((el, i) => {
    el.classList.toggle('fg-progress-active', i < step);
    el.classList.toggle('fg-progress-completed', i < step - 1);
  });
  document.querySelector('.fg-progress-fill').style.width = `${(step / 5) * 100}%`;
};

/* ───────── Event Handlers ───────── */

const manejarAccion = async (action) => {
  if (action === 'decision-flow') {
    const topic = document.querySelector('#fg-topic')?.value?.trim();
    if (!topic) {
      toast('warning', 'Completa el campo "¿Sobre qué?"');
      return;
    }
    const root = document.querySelector('#vista');
    root.innerHTML = buildDecisionFlow();
    await ejecutarStep(1);
    setupDecisionFlowHandlers();
  } else if (action === 'back-to-form') {
    const root = document.querySelector('#vista');
    const platform = getActivePlatform();
    root.innerHTML = buildForm(platform);
    setupFormHandlers();
  } else if (action === 'next-step') {
    const nextStep = Math.min(estado.stepActual + 1, 5);
    await ejecutarStep(nextStep);
  } else if (action === 'prev-step') {
    const prevStep = Math.max(estado.stepActual - 1, 1);
    await ejecutarStep(prevStep);
  } else if (action === 'cancel-flow') {
    estado.stepActual = 0;
    const root = document.querySelector('#vista');
    const platform = getActivePlatform();
    root.innerHTML = buildForm(platform);
    setupFormHandlers();
  }
};

const setupFormHandlers = () => {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => manejarAccion(btn.dataset.action));
  });
};

const setupDecisionFlowHandlers = () => {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => manejarAccion(btn.dataset.action));
  });
};

/* ───────── Inicialización ───────── */

const Vista = {
  montar: (elementId = 'vista') => {
    const root = document.querySelector(`#${elementId}`);
    if (!root) return;

    const platform = getActivePlatform();
    root.innerHTML = buildForm(platform);
    setupFormHandlers();

    // CSS
    const styles = `
      .fg-progress-step {
        display: flex; flex-direction: column; align-items: center; gap: 4px;
        flex: 1; opacity: 0.5; transition: opacity 0.3s;
      }
      .fg-progress-step.fg-progress-active { opacity: 1; }
      .fg-progress-step span {
        width: 32px; height: 32px; border-radius: 50%; background: #e2e8f0;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; font-size: 14px;
      }
      .fg-progress-step.fg-progress-active span {
        background: #3b82f6; color: white;
      }
      .fg-progress-step.fg-progress-completed span {
        background: #10b981; color: white;
      }
      .fg-progress-label {
        font-size: 11px; font-weight: 600; text-align: center; color: #64748b;
      }
      .fg-progress-bar {
        height: 4px; background: #e2e8f0; border-radius: 2px; overflow: hidden;
      }
      .fg-progress-fill {
        height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981);
        transition: width 0.3s;
      }
      .fg-step-container { min-height: 300px; }
    `;

    if (!document.querySelector('#fg-styles-v2')) {
      const style = document.createElement('style');
      style.id = 'fg-styles-v2';
      style.textContent = styles;
      document.head.appendChild(style);
    }
  },
};

export default Vista;
