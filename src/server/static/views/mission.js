/* ══════════════════════════════════════════════════════════════════════════════
   MISSION CONTROL — Multi-agent orchestration view
   ──────────────────────────────────────────────────────────────────────────────
   5 tabs:
   1. LAUNCH      → User describes a goal → system decomposes → executes
   2. MISSIONS    → List of active and past missions
   3. TRACES      → Audit trail of every autonomous decision
   4. KNOWLEDGE   → Algorithm facts library + brand learnings
   5. BUS         → Live event stream between agents
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

/* Mission templates pre-armadas para inspirar al usuario */
const MISSION_TEMPLATES = [
  {
    emoji: '🚀',
    title: 'Lanzar un producto nuevo',
    goal: 'Lanzar mi nuevo curso "Productividad con IA" — 5 días de teaser, 3 reels de valor, 1 carrusel de stack, story diaria, abrir DMs el día del lanzamiento.',
  },
  {
    emoji: '📈',
    title: 'Crecer +1000 followers en 30 días',
    goal: 'Crecer mi cuenta de 0 a +1000 followers en 30 días: 5 posts/sem con voz de marca, optimizar bio, responder DMs, colaborar con 2 cuentas del nicho.',
  },
  {
    emoji: '💰',
    title: 'Vender en stories',
    goal: 'Funnel de ventas en stories: 7 frames diarios con educación + caso + oferta + escasez + CTA. Replicar 4 semanas seguidas.',
  },
  {
    emoji: '🎬',
    title: 'Serie de reels educativos',
    goal: 'Serie de 10 reels educativos sobre mi nicho. Cada uno con hook fuerte, 3 puntos clave en 25s, CTA a comentar. Publicar 2/semana.',
  },
  {
    emoji: '🤝',
    title: 'Re-activar comunidad',
    goal: 'Re-engagement de seguidores inactivos: identificar top 50 fans, 1 story-shoutout, DM personalizado a 20, live de Q&A semanal.',
  },
  {
    emoji: '🔥',
    title: 'Recuperar de bajón de alcance',
    goal: 'Diagnosticar caída de reach. Análisis de últimos 30 posts, comparar con baseline, identificar shadowban risk, plan de recovery 14 días.',
  },
];

/* Descompone localmente un goal en pasos por agente cuando backend no responde */
const decomposeLocally = (goal) => {
  const g = goal.toLowerCase();
  const steps = [];
  // Diseño / contenido
  if (/(reel|carrusel|story|post|contenido|publicar|lanzar)/.test(g)) {
    steps.push({ agent: 'Nova', emoji: '🎨', task: 'Diseñar piezas visuales con tu marca', eta: '15 min' });
  }
  // Copy
  if (/(caption|copy|texto|hook|narrativa)/.test(g) || true) {
    steps.push({ agent: 'Lía', emoji: '✍️', task: 'Escribir captions + hooks con voz de marca', eta: '8 min' });
  }
  // Compliance
  steps.push({ agent: 'Gard', emoji: '🛡️', task: 'Validar tono, hashtags y compliance', eta: '3 min' });
  // Publishing
  if (/(publicar|subir|lanzar|programar)/.test(g)) {
    steps.push({ agent: 'Luca', emoji: '🚀', task: 'Programar y publicar en Instagram', eta: '5 min' });
  }
  // Métricas
  if (/(crecer|métrica|análisis|análisi|reach|engagement|boost)/.test(g)) {
    steps.push({ agent: 'Mira', emoji: '📈', task: 'Análisis de performance + boost si aplica', eta: '10 min' });
  }
  // Community
  if (/(comunidad|dm|mensaje|comentario|fan|seguidor)/.test(g)) {
    steps.push({ agent: 'Luca', emoji: '💬', task: 'Responder DMs y comentarios con tu voz', eta: '20 min' });
  }
  return steps;
};

let activeTab = 'launch';

/* EventSource vivo del tab Autónomo. Se cierra al cambiar de tab o salir. */
let swarmES = null;
const closeSwarmStream = () => {
  try {
    swarmES && swarmES.close();
  } catch {
    /* noop */
  }
  swarmES = null;
};
window.addEventListener('beforeunload', closeSwarmStream);
// Salir de Mission Control en la SPA también cierra el stream (evita fugas).
window.addEventListener('hashchange', () => {
  if ((location.hash.replace('#', '') || 'feed') !== 'mission') closeSwarmStream();
});

const STATUS_TAG = {
  planned: '',
  running: 'warn',
  completed: 'ok',
  failed: 'crit',
  cancelled: 'muted',
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* LAUNCH TAB                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderLaunch = async (host) => {
  let library = [];
  try {
    const r = await api('/api/missions/library');
    library = Array.isArray(r) ? r : Array.isArray(r?.library) ? r.library : [];
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
    return;
  }

  host.innerHTML = `
    <div class="card mission-launch-card">
      <h3 style="margin:0 0 6px;">🎯 Lanzar misión multi-agente</h3>
      <p class="small muted" style="margin:0 0 14px;">Describí qué necesitás. El sistema interpreta, decompone en sub-tareas, asigna agentes y ejecuta.</p>
      <div class="field">
        <label class="field-label">Tu objetivo (lenguaje natural)</label>
        <textarea class="field-textarea" id="mission-intent" rows="2" placeholder="Ej: quiero crecer en autoridad este mes en el nicho de IA aplicada"></textarea>
      </div>
      <div class="field-row">
        <div class="field" style="flex:1;">
          <label class="field-label">Horizonte (días)</label>
          <input class="field-input" id="mission-horizon" type="number" placeholder="30"/>
        </div>
        <div class="field" style="flex:2;align-self:flex-end;">
          <div class="btn-row">
            <button class="btn ghost" id="mission-plan-btn">📋 Solo planificar</button>
            <button class="btn primary" id="mission-launch-btn">🚀 Lanzar y ejecutar</button>
          </div>
        </div>
      </div>
      <div id="mission-plan-result"></div>
    </div>

    <div class="col-header" style="margin-top:20px;"><h3>📚 Misiones canónicas disponibles</h3></div>
    <div class="page-grid">
      ${library
        .map(
          (entry) => `
        <div class="card mission-library-card" data-intent="${escape(entry.intent)}">
          <div class="meta">
            <span class="tag accent tiny">${escape(entry.intent)}</span>
          </div>
          <h3 style="margin:6px 0 4px;">${escape(entry.intent.replace(/-/g, ' '))}</h3>
          <p class="small muted" style="margin:0 0 8px;">${escape(entry.description)}</p>
          <div class="tiny muted">Disparadores: ${entry.keywordTriggers
            .slice(0, 5)
            .map((k) => escape(k))
            .join(' · ')}</div>
        </div>`,
        )
        .join('')}
    </div>`;

  // Clickable library cards prefill the intent input.
  host.querySelectorAll('[data-intent]').forEach((card) => {
    card.addEventListener('click', () => {
      const input = host.querySelector('#mission-intent');
      if (input) {
        input.value = card.dataset.intent.replace(/-/g, ' ');
        input.focus();
      }
    });
  });

  const planBtn = host.querySelector('#mission-plan-btn');
  const launchBtn = host.querySelector('#mission-launch-btn');

  const renderPlanPreview = (decomp) => {
    return `
      <div class="mission-plan-preview">
        <div class="meta">
          <span class="tag ${decomp.matchedIntent === 'unknown' ? 'warn' : 'ok'}">match: ${escape(decomp.matchedIntent)}</span>
          <span class="tag tiny">${decomp.playbook.tasks.length} tasks</span>
        </div>
        <h4 style="margin:8px 0 4px;">${escape(decomp.playbook.name)}</h4>
        <p class="small muted" style="margin:0 0 10px;">${escape(decomp.playbook.description)}</p>
        <div class="mission-task-list">
          ${decomp.playbook.tasks
            .map(
              (t, i) => `
            <div class="mission-task-row">
              <span class="mission-task-num">${i + 1}</span>
              <div class="mission-task-body">
                <div class="small"><strong>${escape(t.agentId)}</strong> · ${escape(t.id)}</div>
                <div class="tiny muted">${escape(t.goal)}</div>
                ${t.dependsOn?.length ? `<div class="tiny muted">depende de: ${t.dependsOn.map((d) => escape(d)).join(', ')}</div>` : ''}
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>`;
  };

  planBtn?.addEventListener('click', async (e) => {
    const intent = host.querySelector('#mission-intent').value.trim();
    if (!intent) {
      toast('Describí tu objetivo', 'warn');
      return;
    }
    const horizon = Number(host.querySelector('#mission-horizon').value) || undefined;
    await withBtnSpinner(e.currentTarget, 'planificando…', async () => {
      try {
        const decomp = await api('/api/missions/decompose', {
          method: 'POST',
          body: { freeIntent: intent, horizonDays: horizon },
        });
        host.querySelector('#mission-plan-result').innerHTML = renderPlanPreview(decomp);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  launchBtn?.addEventListener('click', async (e) => {
    const intent = host.querySelector('#mission-intent').value.trim();
    if (!intent) {
      toast('Describí tu objetivo', 'warn');
      return;
    }
    const horizon = Number(host.querySelector('#mission-horizon').value) || undefined;
    await withBtnSpinner(e.currentTarget, 'lanzando…', async () => {
      try {
        const result = await api('/api/missions/launch', {
          method: 'POST',
          body: { freeIntent: intent, horizonDays: horizon, runNow: true },
        });
        toast(`Misión lanzada: ${result.mission.id}`, 'ok');
        host.querySelector('#mission-plan-result').innerHTML = `
          ${renderPlanPreview({ matchedIntent: result.mission.matchedIntent, playbook: result.mission.playbook })}
          <div class="alert" style="margin-top:12px;">
            <strong>🚀 Ejecutando en background</strong><br>
            <span class="small muted">Mission id: ${escape(result.mission.id)}. Ver progreso en tab "Misiones".</span>
          </div>`;
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* MISSIONS TAB                                                                */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderMissions = async (host) => {
  try {
    const missions = await api('/api/missions/list?limit=30');
    if (!missions.length) {
      host.innerHTML = `<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin misiones todavía. Lanzá una desde el tab "Lanzar".</div></div>`;
      return;
    }
    host.innerHTML = `
      <div class="autopilot-section-head">
        <h3 style="margin:0;">🎯 Misiones (${missions.length})</h3>
      </div>
      ${missions
        .map((m) => {
          const tagCls = STATUS_TAG[m.status] ?? '';
          return `
          <div class="card mission-card">
            <div class="row spread">
              <div style="flex:1;min-width:0;">
                <div class="meta">
                  <span class="tag ${tagCls}">${escape(m.status)}</span>
                  <span class="tag accent tiny">${escape(m.matchedIntent)}</span>
                  <span class="tiny muted">${fmt.rel(m.createdAt)}</span>
                </div>
                <h3 style="margin:6px 0 4px;">${escape(m.playbook.name)}</h3>
                <p class="small muted" style="margin:0 0 6px;">Intento: "${escape(m.freeIntent)}"</p>
                <div class="small">${m.tasksCompleted ?? 0} / ${m.tasksTotal ?? 0} tasks</div>
                ${m.summary ? `<div class="small muted" style="margin-top:6px;border-left:2px solid var(--border);padding-left:8px;">${escape(m.summary.slice(0, 200))}…</div>` : ''}
              </div>
              ${
                m.status === 'planned' || m.status === 'running'
                  ? `
                <div class="btn-row" style="flex-shrink:0;">
                  <button class="btn ghost tiny" data-cancel="${escape(m.id)}">Cancelar</button>
                </div>`
                  : ''
              }
            </div>
          </div>`;
        })
        .join('')}`;

    host.querySelectorAll('[data-cancel]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/missions/${btn.dataset.cancel}/cancel`, { method: 'POST' });
          toast('Misión cancelada', 'ok');
          await renderMissions(host);
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* TRACES TAB                                                                  */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderTraces = async (host) => {
  try {
    const [traces, stats] = await Promise.all([api('/api/traces/list?limit=40'), api('/api/traces/stats')]);

    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">🧠 Reasoning Traces</h3>
          <div class="small muted">Cada decisión autónoma queda auditada con su contexto, alternativas, elección y razonamiento.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.totalTraces}</div><div class="autopilot-stat-label">total</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.withOutcomes}</div><div class="autopilot-stat-label">con outcome</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${(stats.successRate * 100).toFixed(0)}%</div><div class="autopilot-stat-label">success rate</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.avgChosenScore.toFixed(0)}</div><div class="autopilot-stat-label">score prom</div></div>
        </div>
      </div>

      ${traces.length === 0 ? '<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin trazas todavía. Producí piezas o lanzá misiones para acumular decisiones autónomas.</div></div>' : ''}

      ${traces
        .map(
          (t) => `
        <div class="card trace-card">
          <div class="meta">
            <span class="tag accent tiny">${escape(t.agentId)}</span>
            <span class="tag info tiny">${escape(t.decisionType)}</span>
            ${t.outcome ? `<span class="tag ${t.outcome.ranking === 'better' ? 'ok' : t.outcome.ranking === 'worse' ? 'crit' : ''} tiny">outcome: ${escape(t.outcome.ranking)}</span>` : '<span class="tag tiny muted">sin outcome</span>'}
            <span class="tiny muted" style="margin-left:auto;">${fmt.rel(t.createdAt)}</span>
          </div>
          <div class="trace-chosen">
            <span class="trace-chosen-label">Elegido:</span>
            <code class="trace-chosen-value">${escape(t.chosen)}</code>
            <span class="tag ${t.chosenScore >= 80 ? 'ok' : t.chosenScore >= 60 ? 'info' : 'warn'} tiny">${t.chosenScore}</span>
          </div>
          <div class="small" style="margin-top:6px;">${escape(t.reasoning)}</div>
          ${
            t.alternatives.length > 1
              ? `
            <details class="trace-alternatives">
              <summary class="tiny muted">${t.alternatives.length - 1} alternativa(s) descartada(s)</summary>
              <div class="trace-alt-list">
                ${t.alternatives
                  .slice(0, 10)
                  .map(
                    (a) => `
                  <div class="trace-alt-row ${a.option === t.chosen ? 'trace-alt-winner' : ''}">
                    <code>${escape(a.option)}</code>
                    <span class="tag tiny">${a.score}</span>
                    ${a.reasoning ? `<span class="tiny muted">${escape(a.reasoning)}</span>` : ''}
                  </div>`,
                  )
                  .join('')}
              </div>
            </details>`
              : ''
          }
          ${t.factsUsed.length ? `<div class="tiny muted" style="margin-top:6px;">Facts: ${t.factsUsed.map((f) => `<code>${escape(f)}</code>`).join(' ')}</div>` : ''}
        </div>
      `,
        )
        .join('')}`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* KNOWLEDGE TAB                                                               */
/* ──────────────────────────────────────────────────────────────────────────── */

const CONFIDENCE_TAG = { alta: 'ok', media: 'info', baja: 'muted' };

const renderKnowledge = async (host) => {
  try {
    const [facts, learnings] = await Promise.all([api('/api/kb/facts'), api('/api/kb/learnings')]);

    // Group facts by topic.
    const grouped = {};
    for (const f of facts.facts) {
      if (!grouped[f.topic]) grouped[f.topic] = [];
      grouped[f.topic].push(f);
    }

    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">📖 Base de Conocimiento</h3>
          <div class="small muted">${facts.count} facts del algoritmo · ${learnings.length} aprendizajes propios de tu marca</div>
        </div>
      </div>

      <div class="autopilot-grid-2">
        <div>
          <div class="col-header"><h3>🌐 Algorithm Facts (curados)</h3></div>
          ${Object.entries(grouped)
            .map(
              ([topic, list]) => `
            <details class="kb-topic-group" open>
              <summary><strong>${escape(topic)}</strong> <span class="tiny muted">(${list.length})</span></summary>
              ${list
                .map(
                  (f) => `
                <div class="kb-fact-row">
                  <div class="meta" style="margin-bottom:4px;">
                    <span class="tag ${CONFIDENCE_TAG[f.confidence]} tiny">${escape(f.confidence)}</span>
                    <code class="tiny muted">${escape(f.id)}</code>
                  </div>
                  <div class="small">${escape(f.fact)}</div>
                </div>`,
                )
                .join('')}
            </details>`,
            )
            .join('')}
        </div>

        <div>
          <div class="col-header"><h3>🎓 Brand Learnings (dinámicos)</h3></div>
          ${
            learnings.length === 0
              ? '<div class="card" style="padding:20px;text-align:center;"><div class="muted small">Sin aprendizajes propios todavía. El sistema captura insights automáticamente a medida que produce contenido exitoso.</div></div>'
              : learnings
                  .slice(-30)
                  .reverse()
                  .map(
                    (l) => `
                <div class="card kb-learning-row">
                  <div class="meta">
                    <span class="tag accent tiny">${escape(l.category)}</span>
                    <span class="tag ${CONFIDENCE_TAG[l.confidence]} tiny">${escape(l.confidence)}</span>
                    <span class="tag tiny">×${l.reinforcements}</span>
                    <span class="tiny muted" style="margin-left:auto;">${fmt.rel(l.capturedAt)}</span>
                  </div>
                  <div class="small" style="margin-top:6px;">${escape(l.insight)}</div>
                  <div class="tiny muted" style="margin-top:4px;">Evidencia: ${escape(l.evidence)}</div>
                </div>`,
                  )
                  .join('')
          }
        </div>
      </div>`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* BUS TAB                                                                     */
/* ──────────────────────────────────────────────────────────────────────────── */

const PRIORITY_TAG = { critical: 'crit', high: 'warn', normal: 'info', low: 'muted' };

const renderBus = async (host) => {
  try {
    const events = await api('/api/bus/history?limit=80');
    if (!events.length) {
      host.innerHTML = `<div class="card" style="text-align:center;padding:30px;"><div class="muted">Sin eventos en el bus todavía. A medida que el sistema opere se irán acumulando aquí.</div></div>`;
      return;
    }
    host.innerHTML = `
      <div class="autopilot-section-head">
        <h3 style="margin:0;">📡 Event Bus (${events.length})</h3>
      </div>
      <div class="card" style="padding:0;">
        ${events
          .slice()
          .reverse()
          .map(
            (e) => `
          <div class="bus-event-row">
            <span class="tag ${PRIORITY_TAG[e.priority] ?? ''} tiny">${escape(e.priority)}</span>
            <code class="bus-event-type">${escape(e.type)}</code>
            <span class="tiny muted">${escape(e.sourceAgent ?? '—')} → ${escape(e.targetAgent ?? '*')}</span>
            <span class="tiny muted" style="margin-left:auto;">${fmt.rel(e.timestamp)}</span>
          </div>`,
          )
          .join('')}
      </div>`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* TALÍA — Agent Manager                                                       */
/* ──────────────────────────────────────────────────────────────────────────── */

const TYPE_COLORS = {
  'simple-reflex': '#5b9bff',
  'model-based-reflex': '#4ade80',
  'goal-based': '#e1306c',
  'utility-based': '#fbbf24',
  learning: '#a855f7',
};

const renderFacade = (host, view) => {
  host.innerHTML = `
    <div class="card talia-hero">
      <div class="talia-avatar">F</div>
      <div style="flex:1;min-width:0;">
        <h3 style="margin:0 0 4px;">${escape(view.assistant)} <span class="tag accent tiny">Sistema autónomo</span></h3>
        <p class="small muted" style="margin:0;">${escape(view.tagline)}</p>
        <p class="small" style="margin:8px 0 0;">${escape(view.teamPosture)}</p>
      </div>
    </div>
    <div class="col-header" style="margin-top:18px;"><h3>Qué hace FeedIA por vos</h3></div>
    <div class="page-grid">
      ${(view.capabilities || [])
        .map(
          (c) => `
        <div class="card">
          <h3 style="margin:0 0 6px;">${escape(c.area)}</h3>
          <p class="small muted" style="margin:0;">${escape(c.whatItDoes)}</p>
        </div>`,
        )
        .join('')}
    </div>
    <div class="card" style="margin-top:16px;">
      <p class="small muted" style="margin:0;">🔒 La arquitectura interna del sistema es propietaria y no se expone. Dale tus órdenes en la <strong>Pizarra</strong> o por voz — FeedIA se encarga del resto.</p>
    </div>`;
};

const renderTalia = async (host) => {
  try {
    const [org, knowledge, types] = await Promise.all([
      api('/api/talia/org-chart'),
      api('/api/talia/knowledge'),
      api('/api/taxonomy/types'),
    ]);

    // Privacy: when internals are hidden the API returns the public facade.
    if (org && org.internalsHidden) {
      renderFacade(host, org);
      return;
    }

    host.innerHTML = `
      <div class="card talia-hero">
        <div class="talia-avatar">T</div>
        <div style="flex:1;min-width:0;">
          <h3 style="margin:0 0 4px;">${escape(org.manager.name)} <span class="tag accent tiny">Agent Manager</span></h3>
          <p class="small muted" style="margin:0;">${escape(org.manager.title)}</p>
          <p class="small" style="margin:8px 0 0;">Gestiona <strong>${org.totalEmployees}</strong> agentes en <strong>${org.departments.length}</strong> departamentos · empresa: <strong>${escape(org.companyId)}</strong></p>
        </div>
      </div>

      <div class="card" style="margin-top:14px;">
        <h3 style="margin:0 0 8px;">🎯 Dale una orden global a Talía</h3>
        <p class="small muted" style="margin:0 0 12px;">Ej: "FeedIA, ayudame a crecer la cuenta". Talía la fragmenta y delega entre los agentes según su tipo (taxonomía IBM), departamento y carga.</p>
        <div class="field"><textarea class="field-textarea" id="talia-order" rows="2" placeholder="Escribí tu orden global…"></textarea></div>
        <div class="btn-row"><button class="btn primary" id="talia-delegate-btn">🧩 Fragmentar y delegar</button></div>
        <div id="talia-plan"></div>
      </div>

      <div class="col-header" style="margin-top:20px;"><h3>🏢 Organigrama por departamento</h3></div>
      <div class="page-grid">
        ${org.departments
          .map(
            (d) => `
          <div class="card">
            <div class="meta"><span class="tag accent tiny">${escape(d.name)}</span><span class="tag tiny">${d.headcount} agentes</span></div>
            <div class="talia-emp-list">
              ${d.employees
                .map(
                  (e) => `
                <div class="talia-emp-row">
                  <span class="talia-type-dot" style="background:${TYPE_COLORS[e.agentType] ?? '#888'}"></span>
                  <div style="flex:1;min-width:0;">
                    <div class="small"><strong>${escape(e.name)}</strong></div>
                    <div class="tiny muted">${escape(e.agentTypeName)} · ${escape(e.seniority)} · carga ${e.recentWorkload}</div>
                  </div>
                </div>`,
                )
                .join('')}
            </div>
          </div>`,
          )
          .join('')}
      </div>

      <div class="col-header" style="margin-top:20px;"><h3>🧬 Tipos de agente (clasificación IBM)</h3></div>
      <div class="page-grid">
        ${types
          .map(
            (tp) => `
          <div class="card">
            <div class="meta"><span class="talia-type-dot" style="background:${TYPE_COLORS[tp.type] ?? '#888'}"></span><strong>${escape(tp.name)}</strong></div>
            <p class="small" style="margin:6px 0;">${escape(tp.definition)}</p>
            <p class="tiny muted" style="margin:0;"><strong>Talía delega aquí cuando:</strong> ${escape(tp.delegateWhen)}</p>
            <div class="meta" style="margin-top:6px;">${tp.traits.map((x) => `<span class="tag tiny">${escape(x)}</span>`).join('')}</div>
          </div>`,
          )
          .join('')}
      </div>

      <div class="card" style="margin-top:20px;">
        <h3 style="margin:0 0 8px;">🔐 Qué sabe Talía (acceso scoped a la empresa)</h3>
        <ul class="small">${knowledge.whatSheManages.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>
      </div>`;

    host.querySelector('#talia-delegate-btn')?.addEventListener('click', async (e) => {
      const order = host.querySelector('#talia-order').value.trim();
      if (!order) {
        toast('Escribí una orden', 'warn');
        return;
      }
      await withBtnSpinner(e.currentTarget, 'delegando…', async () => {
        try {
          const plan = await api('/api/talia/delegate', { method: 'POST', body: { order, createMission: true } });
          if (plan.understood && Array.isArray(plan.plan)) {
            // Sanitized facade response — no internal agent/type disclosure.
            host.querySelector('#talia-plan').innerHTML = `
              <div class="talia-plan-box">
                <div class="meta"><span class="tag ok">recibida</span><span class="tag tiny">${plan.steps} pasos</span></div>
                <p class="small" style="margin:8px 0;font-style:italic;">"${escape(plan.note)}"</p>
                <div class="talia-assign-list">
                  ${plan.plan
                    .map(
                      (p) => `
                    <div class="talia-assign-row">
                      <span class="talia-assign-num">${p.step}</span>
                      <div style="flex:1;min-width:0;"><div class="small">${escape(p.task)}</div></div>
                    </div>`,
                    )
                    .join('')}
                </div>
              </div>`;
          } else {
            host.querySelector('#talia-plan').innerHTML = `
              <div class="talia-plan-box">
                <div class="meta"><span class="tag ${plan.matchedIntent === 'unknown' ? 'warn' : 'ok'}">${escape(plan.matchedIntent)}</span><span class="tag tiny">${plan.assignments.length} delegaciones</span></div>
                <p class="small" style="margin:8px 0;font-style:italic;">"${escape(plan.managerNote)}"</p>
                <div class="talia-assign-list">
                  ${plan.assignments
                    .map(
                      (a, i) => `
                    <div class="talia-assign-row">
                      <span class="talia-assign-num">${i + 1}</span>
                      <div style="flex:1;min-width:0;">
                        <div class="small"><strong>${escape(a.assignee.name)}</strong> <span class="tag tiny">${escape(a.requiredTypeName)}</span> <span class="tag tiny">fit ${a.fitScore}</span></div>
                        <div class="tiny muted">${escape(a.taskGoal)}</div>
                        <div class="tiny" style="color:var(--accent);">${escape(a.rationale)}</div>
                      </div>
                    </div>`,
                    )
                    .join('')}
                </div>
              </div>`;
          }
          toast('FeedIA recibió la orden', 'ok');
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* COMPUTER USE                                                                */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderComputer = async (host) => {
  try {
    const runtime = await api('/api/computer/runtime');
    host.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 6px;">🖥 Computer Use — control de cursor y teclado</h3>
        <p class="small muted" style="margin:0 0 4px;">FeedIA navega Instagram (Feed, Buscador, Explorar, Perfil, DMs, Historias, Reels, Crear +, Me gusta, Guardar, Compartir, Comentarios, Bio, Destacadas, Grid…) y apps de escritorio como un humano.</p>
        <div class="meta" style="margin:8px 0;">
          <span class="tag ${runtime.liveRuntimeAvailable ? 'ok' : 'warn'} tiny">${runtime.liveRuntimeAvailable ? 'Runtime en vivo disponible' : 'Modo plan (runtime no instalado)'}</span>
        </div>
        <div class="field"><textarea class="field-textarea" id="cu-instruction" rows="2" placeholder='Ej: "abrí los DMs y respondé al primero", "dale like y guardá el último post de @cuenta"'></textarea></div>
        <div class="btn-row">
          <button class="btn primary" id="cu-plan-btn">📋 Planificar acciones</button>
          <button class="btn ghost" id="cu-exec-btn">▶ Ejecutar (seguro)</button>
        </div>
        <div id="cu-result"></div>
      </div>`;

    const renderPlan = (plan) => `
      <div class="talia-plan-box">
        <div class="meta">
          <span class="tag tiny">${escape(plan.surface)}</span>
          <span class="tag ${plan.requiresApproval ? 'warn' : 'ok'} tiny">${plan.requiresApproval ? 'requiere aprobación' : 'solo lectura'}</span>
          <span class="tag tiny">${plan.actions.length} pasos</span>
        </div>
        <p class="tiny muted" style="margin:6px 0;">${escape(plan.notes)}</p>
        <div class="cu-step-list">
          ${plan.actions
            .map(
              (a) => `
            <div class="cu-step-row">
              <span class="cu-step-num">${a.step}</span>
              <span class="tag tiny">${escape(a.gesture)}</span>
              <div style="flex:1;min-width:0;">
                <div class="small">${escape(a.humanAction)}</div>
                <div class="tiny muted">target: ${escape(a.targetLabel)}${a.text ? ` · texto: "${escape(a.text)}"` : ''}</div>
              </div>
            </div>`,
            )
            .join('')}
        </div>
        ${plan.unresolved.length ? `<div class="tiny muted" style="margin-top:6px;">No resuelto: ${plan.unresolved.map((u) => escape(u)).join(' · ')}</div>` : ''}
      </div>`;

    host.querySelector('#cu-plan-btn')?.addEventListener('click', async (e) => {
      const instruction = host.querySelector('#cu-instruction').value.trim();
      if (!instruction) {
        toast('Escribí una instrucción', 'warn');
        return;
      }
      await withBtnSpinner(e.currentTarget, 'planificando…', async () => {
        try {
          const plan = await api('/api/computer/plan', { method: 'POST', body: { instruction } });
          host.querySelector('#cu-result').innerHTML = renderPlan(plan);
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });

    host.querySelector('#cu-exec-btn')?.addEventListener('click', async (e) => {
      const instruction = host.querySelector('#cu-instruction').value.trim();
      if (!instruction) {
        toast('Escribí una instrucción', 'warn');
        return;
      }
      await withBtnSpinner(e.currentTarget, 'ejecutando…', async () => {
        try {
          const { plan, result } = await api('/api/computer/execute', { method: 'POST', body: { instruction } });
          host.querySelector('#cu-result').innerHTML =
            renderPlan(plan) +
            `
            <div class="talia-plan-box" style="margin-top:10px;">
              <div class="meta"><span class="tag ${result.completed ? 'ok' : 'warn'} tiny">${escape(result.mode)}</span><span class="tag tiny">${result.steps.filter((s) => s.status === 'ok' || s.status === 'planned-only').length}/${result.steps.length} pasos</span></div>
              <div class="cu-step-list">
                ${result.steps
                  .map(
                    (s) => `
                  <div class="cu-step-row">
                    <span class="tag ${s.status === 'ok' ? 'ok' : s.status === 'failed' ? 'crit' : ''} tiny">${escape(s.status)}</span>
                    <div style="flex:1;"><div class="small">${escape(s.targetLabel)}</div><div class="tiny muted">${escape(s.detail ?? '')}</div></div>
                  </div>`,
                  )
                  .join('')}
              </div>
            </div>`;
          toast(`Ejecutado en modo ${result.mode}`, result.completed ? 'ok' : 'warn');
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* AUTÓNOMO (SWARM) TAB — framework orquestador en vivo                        */
/* ──────────────────────────────────────────────────────────────────────────── */

const SWARM_STATUS_TAG = { completed: 'ok', partial: 'warn', failed: 'crit' };
const STEP_TAG = { completed: 'ok', escalated: 'warn', failed: 'crit' };
const BB_ICON = { decision: '🧭', artifact: '📦', risk: '⚠️', metric: '📊', fact: '•' };

let swarmFocusId = null;

const renderSwarmMissionCard = (m) => {
  const tag = SWARM_STATUS_TAG[m.status] ?? '';
  const okCount = m.steps.filter((s) => s.status === 'completed').length;
  return `
    <div class="card mission-card swarm-mission" data-mission="${escape(m.id)}" style="cursor:pointer;${m.id === swarmFocusId ? 'border-color:var(--accent);' : ''}">
      <div class="row spread">
        <div style="flex:1;min-width:0;">
          <div class="meta">
            <span class="tag ${tag}">${escape(m.status)}</span>
            <span class="tag accent tiny">${escape(m.planSource)}</span>
            <span class="tag tiny">crew ${m.crew.length}</span>
            <span class="tiny muted">${fmt.rel(m.startedAt)}</span>
          </div>
          <h3 style="margin:6px 0 4px;">${escape(m.objective.slice(0, 90))}</h3>
          <div class="small">${okCount}/${m.steps.length} tareas OK · replans ${m.replans}</div>
        </div>
      </div>
    </div>`;
};

const renderSwarmDetail = (m, board) => {
  if (!m) return '<div class="muted small">Seleccioná una misión para ver su traza y pizarra en vivo.</div>';
  return `
    <div class="card">
      <div class="meta">
        <span class="tag ${SWARM_STATUS_TAG[m.status] ?? ''}">${escape(m.status)}</span>
        <span class="tag accent tiny">${escape(m.planSource)}</span>
        <span class="tiny muted">${escape(m.id)}</span>
      </div>
      <h3 style="margin:6px 0;">${escape(m.objective)}</h3>
      <p class="small muted" style="margin:0 0 8px;">${escape(m.rationale || '')}</p>
      <div class="small" style="margin-bottom:4px;font-weight:700;">Crew</div>
      <div class="meta" style="margin-bottom:10px;">
        ${m.crew.map((c) => `<span class="tag tiny">${escape(c.agentId)} · ${escape(c.role)}</span>`).join('') || '<span class="tiny muted">—</span>'}
      </div>
      <div class="small" style="margin-bottom:4px;font-weight:700;">Pasos (${m.steps.length})</div>
      <div class="cu-step-list">
        ${m.steps
          .map(
            (s) => `
          <div class="cu-step-row">
            <span class="tag ${STEP_TAG[s.status] ?? ''} tiny">${escape(s.status)}</span>
            <div style="flex:1;min-width:0;">
              <div class="small">${escape(s.taskId)} → ${escape(s.agentId)} <span class="tiny muted">(${escape(s.verdict)}, score ${s.score}, ${s.attempts} intento/s)</span></div>
              <div class="tiny muted">${escape(s.note || '')}</div>
            </div>
          </div>`,
          )
          .join('')}
      </div>
      ${m.summary ? `<div class="small muted" style="margin-top:8px;border-left:2px solid var(--border);padding-left:8px;white-space:pre-wrap;">${escape(m.summary)}</div>` : ''}
    </div>
    <div class="card" style="margin-top:10px;">
      <div class="small" style="font-weight:700;margin-bottom:6px;">🧩 Pizarra compartida ${board ? `(${board.entries.length})` : ''}</div>
      ${
        !board || !board.entries.length
          ? '<div class="tiny muted">Sin aportes todavía.</div>'
          : `
        <div class="cu-step-list">
          ${board.entries
            .slice()
            .reverse()
            .slice(0, 40)
            .map(
              (e) => `
            <div class="cu-step-row">
              <span class="tiny">${BB_ICON[e.kind] ?? '•'}</span>
              <div style="flex:1;min-width:0;">
                <div class="tiny"><b>${escape(e.by)}</b> · ${escape(e.label)}</div>
                <div class="tiny muted">${escape(typeof e.value === 'string' ? e.value.slice(0, 240) : JSON.stringify(e.value).slice(0, 240))}</div>
              </div>
            </div>`,
            )
            .join('')}
        </div>`
      }
    </div>`;
};

const openSwarmStream = (host) => {
  closeSwarmStream();
  const qs = swarmFocusId ? `?id=${encodeURIComponent(swarmFocusId)}` : '';
  swarmES = new EventSource(`/api/swarm/stream${qs}`);
  swarmES.addEventListener('swarm', (ev) => {
    let data;
    try {
      data = JSON.parse(ev.data);
    } catch {
      return;
    }
    const listEl = host.querySelector('#swarm-missions');
    const detailEl = host.querySelector('#swarm-detail');
    if (listEl) {
      listEl.innerHTML = data.missions.length
        ? data.missions.map(renderSwarmMissionCard).join('')
        : '<div class="card" style="text-align:center;padding:24px;"><div class="muted">Sin misiones autónomas todavía.</div></div>';
      listEl.querySelectorAll('[data-mission]').forEach((el) => {
        el.addEventListener('click', () => {
          swarmFocusId = el.dataset.mission;
          openSwarmStream(host);
        });
      });
    }
    if (detailEl) detailEl.innerHTML = renderSwarmDetail(data.detail, data.board);
  });
  swarmES.onerror = () => {
    /* EventSource reintenta solo */
  };
};

const renderSwarm = async (host) => {
  host.innerHTML = `
    <div class="card mission-launch-card">
      <h3 style="margin:0 0 6px;">🐝 Misión autónoma de punta a punta</h3>
      <p class="small muted" style="margin:0 0 10px;">El framework orquestador arma la crew, planifica el DAG, ejecuta en paralelo, autoevalúa con un crítico y replanifica si hace falta. Respeta los checkpoints humanos.</p>
      <textarea id="swarm-objetivo" class="input" rows="2" placeholder="Ej: Subí 1 carrusel por día esta semana con su estrategia y CTA"></textarea>
      <div class="btn-row" style="margin-top:8px;">
        <button class="btn primary" id="swarm-launch">🚀 Lanzar misión</button>
      </div>
    </div>
    <div class="card" style="margin-top:12px;">
      <div class="row spread" style="align-items:center;">
        <div><b>👥 Director de Operaciones 24/7</b><div class="tiny muted">Departamentos que trabajan en segundo plano con cooldown propio.</div></div>
        <button class="btn ghost tiny" id="swarm-ops-run">▶ Correr ciclo ahora</button>
      </div>
      <div id="swarm-ops" class="meta" style="margin-top:8px;"><span class="tiny muted">cargando…</span></div>
    </div>
    <div class="row" style="gap:14px;align-items:flex-start;margin-top:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:260px;">
        <div class="autopilot-section-head"><h3 style="margin:0;">Misiones (en vivo)</h3></div>
        <div id="swarm-missions">${loadingScreen()}</div>
      </div>
      <div style="flex:1.4;min-width:300px;">
        <div class="autopilot-section-head"><h3 style="margin:0;">Traza + pizarra</h3></div>
        <div id="swarm-detail"><div class="muted small">Seleccioná una misión para ver su traza y pizarra en vivo.</div></div>
      </div>
    </div>`;

  host.querySelector('#swarm-launch')?.addEventListener('click', async (e) => {
    const objetivo = host.querySelector('#swarm-objetivo').value.trim();
    if (!objetivo) {
      toast('Escribí un objetivo', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'lanzando…', async () => {
      try {
        await api('/api/swarm/mission', { method: 'POST', body: { objetivo } });
        toast('Misión autónoma en marcha 🐝', 'ok');
        host.querySelector('#swarm-objetivo').value = '';
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  const loadOps = async () => {
    try {
      const ops = await api('/api/swarm/operations');
      const el = host.querySelector('#swarm-ops');
      if (!el) return;
      const now = Date.now();
      el.innerHTML = ops
        .map((d) => {
          const ready = !d.nextEligibleAt || Date.parse(d.nextEligibleAt) <= now;
          return `<span class="tag ${ready ? 'ok' : ''} tiny" title="${d.lastRunAt ? 'Último: ' + fmt.rel(d.lastRunAt) : 'Nunca corrió'}">${escape(d.label)} · ${ready ? 'listo' : 'cooldown'}</span>`;
        })
        .join('');
    } catch {
      /* opcional */
    }
  };

  host.querySelector('#swarm-ops-run')?.addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'corriendo…', async () => {
      try {
        await api('/api/swarm/operations/run', { method: 'POST', body: {} });
        toast('Ciclo de operaciones lanzado 👥', 'ok');
        setTimeout(loadOps, 1500);
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });

  await loadOps();
  openSwarmStream(host);
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* TAB ROUTING                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'launch', label: '🚀 Lanzar', render: renderLaunch },
  { id: 'talia', label: '👩‍💼 Talía', render: renderTalia },
  { id: 'computer', label: '🖥 Computer Use', render: renderComputer },
  { id: 'swarm', label: '🐝 Autónomo', render: renderSwarm },
  { id: 'missions', label: '🎯 Misiones', render: renderMissions },
  { id: 'traces', label: '🧠 Trazas', render: renderTraces },
  { id: 'knowledge', label: '📖 Conocimiento', render: renderKnowledge },
  { id: 'bus', label: '📡 Bus', render: renderBus },
];

const renderActiveTab = async (root) => {
  const host = root.querySelector('#mission-content');
  if (!host) return;
  // Cambiar de tab cierra el stream en vivo del tab Autónomo.
  closeSwarmStream();
  if (activeTab !== 'swarm') swarmFocusId = null;
  const def = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  host.innerHTML = loadingScreen();
  await def.render(host);
};

export const renderMission = async (root) => {
  activeTab = 'launch';
  root.innerHTML = `
    <!-- HERO: comando central revolucionario -->
    <div class="mc-cockpit">
      <div class="mc-cockpit-bg"></div>
      <div class="mc-cockpit-content">
        <div class="mc-eyebrow">
          <span class="mc-radar"></span>
          MISSION CONTROL · sistema multi-agente
        </div>
        <h1 class="mc-title">¿Cuál es tu próxima <span class="mc-grad">misión</span>?</h1>
        <p class="mc-sub">Escribí un objetivo en una sola frase. El sistema lo descompone en pasos, asigna a los agentes correctos y los ejecuta. Vos solo aprobás.</p>

        <!-- Input gigante estilo Spotlight -->
        <div class="mc-command-box">
          <span class="mc-cmd-icon">🎯</span>
          <textarea id="mc-goal-input" placeholder="Ej: 'Lanzar mi curso de IA con 5 días de teaser, 3 reels educativos y vender 20 cupos en 7 días'" rows="2"></textarea>
          <button class="btn primary mc-launch-btn" id="mc-launch-btn">🚀 Descomponer y ejecutar</button>
        </div>

        <!-- Decomposition output: aparece cuando se lanza -->
        <div id="mc-decomposition" class="mc-decomposition" hidden></div>

        <!-- Templates -->
        <div class="mc-templates">
          <div class="mc-templates-label">O empezá con una misión pre-armada:</div>
          <div class="mc-templates-grid">
            ${MISSION_TEMPLATES.map(
              (t) => `
              <button class="mc-template" data-goal="${escape(t.goal)}">
                <span class="mc-template-emoji">${t.emoji}</span>
                <span class="mc-template-title">${escape(t.title)}</span>
              </button>`,
            ).join('')}
          </div>
        </div>
      </div>
    </div>

    <!-- Tabs avanzados (misiones activas, traces, knowledge, bus) -->
    <div class="page-toolbar" style="margin-top:22px;">
      <h3 style="margin:0 0 10px;font-size:13px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;font-weight:700;">📊 Operaciones avanzadas</h3>
      <div class="page-toolbar-tabs">
        ${TABS.map(
          (t) => `
          <button class="tool-tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${escape(t.label)}</button>
        `,
        ).join('')}
      </div>
    </div>
    <div id="mission-content" class="page-body">${loadingScreen()}</div>

    <style data-v="mc-v3">
      /* ═════════ Mission Control v3 · Vercel-grade · MAX CONTRAST · THEME-AWARE ═════════
         Uso !important para ganar sobre cualquier regla legacy de style.css.
         Tokens: --text-primary (#f5f5f5 dark / #16171c light), --bg-elevated, etc. */
      .mc-cockpit {
        position: relative !important;
        padding: 40px 32px !important;
        border-radius: 18px !important;
        background: var(--bg-elevated, #0a0a0a) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        overflow: hidden !important;
        margin-bottom: 12px !important;
        font-feature-settings: "tnum" 1, "ss01" 1 !important;
        letter-spacing: -0.011em !important;
        background-image: none !important;
      }
      .mc-cockpit-bg {
        position: absolute !important; inset: 0 !important; pointer-events: none !important;
        background: none !important;
        background-image: radial-gradient(circle, rgba(127,127,127,.10) 1px, transparent 1px) !important;
        background-size: 22px 22px !important;
        opacity: .55 !important;
      }
      .mc-cockpit-content { position: relative !important; z-index: 1 !important; }
      .mc-eyebrow {
        display: inline-flex !important; align-items: center !important; gap: 8px !important;
        font-size: 10.5px !important; font-weight: 700 !important; letter-spacing: .14em !important;
        color: var(--text-secondary, #d4d4d8) !important;
        text-transform: uppercase !important; margin-bottom: 16px !important;
        opacity: 1 !important;
      }
      .mc-radar {
        display: inline-block !important; width: 7px !important; height: 7px !important;
        border-radius: 50% !important;
        background: #10b981 !important; box-shadow: 0 0 10px rgba(16,185,129,.7) !important;
        animation: mcRadar 1.8s ease-in-out infinite !important;
      }
      @keyframes mcRadar { 0%,100% { opacity: .6; transform: scale(.9); } 50% { opacity: 1; transform: scale(1.15); } }

      /* ─── TITLE: cero gradient transparente. Color sólido alto contraste ─── */
      .mc-title {
        font-size: 40px !important; font-weight: 700 !important;
        margin: 0 0 14px !important; line-height: 1.04 !important;
        letter-spacing: -.04em !important;
        color: var(--text-primary, #f5f5f5) !important;
        -webkit-text-fill-color: var(--text-primary, #f5f5f5) !important;
        background: none !important; background-image: none !important;
        -webkit-background-clip: border-box !important; background-clip: border-box !important;
      }
      .mc-grad {
        color: var(--text-tertiary, #a1a1aa) !important;
        -webkit-text-fill-color: var(--text-tertiary, #a1a1aa) !important;
        background: none !important; background-image: none !important;
        -webkit-background-clip: border-box !important; background-clip: border-box !important;
        font-weight: 700 !important;
      }
      .mc-sub {
        font-size: 15px !important;
        color: var(--text-secondary, #d4d4d8) !important;
        margin: 0 0 24px !important; max-width: 64ch !important; line-height: 1.55 !important;
        opacity: 1 !important;
      }

      /* ─── Command box ─── */
      .mc-command-box {
        display: flex !important; align-items: stretch !important; gap: 0 !important;
        padding: 6px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.12)) !important;
        border: 0 !important; border-radius: 12px !important;
        transition: box-shadow .15s !important; margin-bottom: 24px !important;
      }
      .mc-command-box:focus-within {
        box-shadow: inset 0 0 0 1px var(--border-focus, rgba(255,255,255,.22)),
                    0 0 0 4px rgba(127,127,127,.08) !important;
      }
      .mc-cmd-icon {
        font-size: 18px !important; padding: 14px 10px 0 14px !important;
        flex-shrink: 0 !important; color: var(--text-tertiary, #a1a1aa) !important;
      }
      #mc-goal-input {
        flex: 1 !important; background: transparent !important; border: 0 !important;
        color: var(--text-primary, #f5f5f5) !important;
        padding: 14px 12px !important; font-size: 15px !important;
        outline: none !important; resize: none !important;
        font-family: inherit !important; line-height: 1.5 !important; min-height: 56px !important;
        letter-spacing: -.01em !important; font-weight: 500 !important;
      }
      #mc-goal-input::placeholder { color: var(--text-tertiary, #a1a1aa) !important; opacity: 1 !important; }

      /* ─── Launch button: pure white-on-bg, no rosa-fuchsia ─── */
      .mc-launch-btn {
        flex-shrink: 0 !important; border-radius: 10px !important;
        padding: 0 18px !important; height: auto !important;
        font-size: 13px !important; font-weight: 600 !important;
        background: var(--text-primary, #f5f5f5) !important;
        color: var(--bg-elevated, #0a0a0a) !important;
        border: 0 !important; box-shadow: none !important;
        background-image: none !important;
        letter-spacing: -.005em !important;
      }
      .mc-launch-btn:hover { opacity: .9 !important; }

      /* ─── Decomposition ─── */
      .mc-decomposition {
        margin-bottom: 24px !important; padding: 20px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        border: 0 !important; border-radius: 14px !important;
        background-image: none !important;
      }
      .mc-decomposition.mc-show { animation: mcSlideIn .3s ease; }
      @keyframes mcSlideIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
      .mc-decomp-head { display: flex !important; justify-content: space-between !important; align-items: center !important; margin-bottom: 14px !important; flex-wrap: wrap !important; gap: 10px !important; }
      .mc-decomp-head h4 { margin: 0 !important; font-size: 14px !important; color: var(--text-primary, #f5f5f5) !important; letter-spacing: -.015em !important; font-weight: 700 !important; }
      .mc-steps { display: flex !important; flex-direction: column !important; gap: 6px !important; }
      .mc-step {
        display: flex !important; gap: 12px !important; align-items: center !important;
        padding: 12px 14px !important;
        background: var(--bg-elevated, #0a0a0a) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.08)) !important;
        border: 0 !important; border-radius: 9px !important; position: relative !important;
      }
      .mc-step-num {
        width: 22px !important; height: 22px !important; border-radius: 50% !important;
        background: var(--text-primary, #f5f5f5) !important;
        color: var(--bg-elevated, #0a0a0a) !important;
        font-size: 11px !important; font-weight: 700 !important;
        display: flex !important; align-items: center !important; justify-content: center !important;
        flex-shrink: 0 !important; font-variant-numeric: tabular-nums !important;
        background-image: none !important;
      }
      .mc-step-emoji { font-size: 18px !important; flex-shrink: 0 !important; }
      .mc-step-body { flex: 1 !important; min-width: 0 !important; }
      .mc-step-task { font-weight: 600 !important; font-size: 13px !important; color: var(--text-primary, #f5f5f5) !important; letter-spacing: -.005em !important; }
      .mc-step-meta { font-size: 11px !important; color: var(--text-tertiary, #a1a1aa) !important; margin-top: 2px !important; }
      .mc-step-eta { font-size: 11px !important; color: var(--text-secondary, #d4d4d8) !important; font-weight: 600 !important; flex-shrink: 0 !important; font-variant-numeric: tabular-nums !important; }

      /* ─── Templates label + grid: títulos visibles SI O SI ─── */
      .mc-templates-label {
        font-size: 10.5px !important; color: var(--text-secondary, #d4d4d8) !important;
        margin-bottom: 12px !important; font-weight: 700 !important;
        text-transform: uppercase !important; letter-spacing: .14em !important;
        opacity: 1 !important;
      }
      .mc-templates-grid {
        display: grid !important; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important; gap: 6px !important;
      }
      .mc-template {
        display: flex !important; align-items: center !important; gap: 10px !important;
        padding: 11px 14px !important;
        background: var(--bg-card-2, #0f0f0f) !important;
        box-shadow: inset 0 0 0 1px var(--border, rgba(255,255,255,.10)) !important;
        border: 0 !important; border-radius: 10px !important;
        cursor: pointer !important;
        color: var(--text-primary, #f5f5f5) !important;
        text-align: left !important; transition: box-shadow .15s, background .15s !important;
        font-family: inherit !important;
        background-image: none !important;
      }
      .mc-template:hover {
        box-shadow: inset 0 0 0 1px var(--border-focus, rgba(255,255,255,.22)) !important;
        background: var(--bg-hover, rgba(255,255,255,.05)) !important;
      }
      .mc-template-emoji { font-size: 18px !important; flex-shrink: 0 !important; }
      .mc-template-title {
        font-size: 13px !important; font-weight: 600 !important;
        color: var(--text-primary, #f5f5f5) !important;
        -webkit-text-fill-color: var(--text-primary, #f5f5f5) !important;
        letter-spacing: -.005em !important; opacity: 1 !important;
      }

      @media (max-width: 640px){
        .mc-cockpit { padding: 26px 18px !important; }
        .mc-title { font-size: 28px !important; }
        .mc-command-box { flex-direction: column !important; }
        .mc-launch-btn { margin-top: 6px !important; }
      }
    </style>`;

  // Launch handler
  const launchGoal = async (goal) => {
    if (!goal || !goal.trim()) {
      toast('Escribí tu misión primero', 'warn');
      return;
    }
    const decompEl = root.querySelector('#mc-decomposition');
    decompEl.hidden = false;
    decompEl.classList.add('mc-show');
    decompEl.innerHTML = `<div style="text-align:center;padding:20px;"><span class="spinner lg"></span><div class="small muted" style="margin-top:8px;">Descomponiendo en pasos…</div></div>`;

    const { data, error } = await apiSafe('/api/missions/decompose', null, {
      method: 'POST',
      body: { goal: goal.trim() },
    });
    const steps = (data?.steps?.length ? data.steps : decomposeLocally(goal)).map((s, i) => ({ ...s, n: i + 1 }));

    decompEl.innerHTML = `
      <div class="mc-decomp-head">
        <h4>📋 Plan generado · ${steps.length} pasos</h4>
        ${error ? '<span class="tag tiny warn">descomposición local</span>' : '<span class="tag tiny ok">backend conectado</span>'}
      </div>
      <div class="mc-steps">
        ${steps
          .map(
            (s) => `
          <div class="mc-step">
            <span class="mc-step-num">${s.n}</span>
            <span class="mc-step-emoji">${s.emoji}</span>
            <div class="mc-step-body">
              <div class="mc-step-task">${escape(s.task)}</div>
              <div class="mc-step-meta">@${escape(s.agent)}</div>
            </div>
            <span class="mc-step-eta">${escape(s.eta ?? '—')}</span>
          </div>`,
          )
          .join('')}
      </div>
      <div class="btn-row" style="margin-top:14px;gap:8px;">
        <button class="btn primary" id="mc-approve-all">✅ Aprobar y ejecutar todo</button>
        <button class="btn ghost" id="mc-edit">✏️ Editar misión</button>
        <button class="btn ghost" id="mc-discard">🗑 Descartar</button>
      </div>
    `;

    decompEl.querySelector('#mc-approve-all').addEventListener('click', async () => {
      const { error: launchErr } = await apiSafe('/api/missions/launch', null, {
        method: 'POST',
        body: { freeIntent: goal, runNow: true },
      });
      if (launchErr) {
        toast(`🚀 Misión registrada localmente · ${steps.length} pasos. Se ejecuta cuando vuelva el backend.`, 'info');
      } else {
        toast(`🚀 ¡Misión lanzada! ${steps.length} agentes trabajando.`, 'ok');
      }
      activeTab = 'missions';
      root.querySelectorAll('.tool-tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === 'missions'));
      await renderActiveTab(root);
    });
    decompEl.querySelector('#mc-edit').addEventListener('click', () => {
      decompEl.hidden = true;
      root.querySelector('#mc-goal-input')?.focus();
    });
    decompEl.querySelector('#mc-discard').addEventListener('click', () => {
      decompEl.hidden = true;
      const input = root.querySelector('#mc-goal-input');
      if (input) input.value = '';
    });
  };

  root.querySelector('#mc-launch-btn')?.addEventListener('click', () => {
    const goal = root.querySelector('#mc-goal-input')?.value;
    void launchGoal(goal);
  });
  root.querySelector('#mc-goal-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      void launchGoal(e.target.value);
    }
  });
  root.querySelectorAll('.mc-template').forEach((btn) => {
    btn.addEventListener('click', () => {
      const goal = btn.dataset.goal;
      const input = root.querySelector('#mc-goal-input');
      if (input) input.value = goal;
      void launchGoal(goal);
    });
  });

  root.querySelectorAll('.tool-tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeTab = btn.dataset.tab;
      root.querySelectorAll('.tool-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      await renderActiveTab(root);
    });
  });

  await renderActiveTab(root);
};
