/* ══════════════════════════════════════════════════════════════════════════════
   AUTOPILOT — Unified operations dashboard for the autonomous OS
   ──────────────────────────────────────────────────────────────────────────────
   Six modules in one screen, organized by autonomy phase:
   1. INTELLIGENCE  → Pin Slate (what to anchor at top of grid)
   2. PROTECTION    → Originality fingerprints + last drafts checked
   3. PRODUCTION    → Concept templates browser + filler
   4. CONVERSATION  → Convo router live tester + FAQ count
   5. RETENTION     → Pulse queue with status & high-priority count
   6. OUTREACH      → Active sequences + variant performance leaderboard
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

let activeTab = 'intelligence';

/* Master state del Autopilot — persistido en localStorage */
const AP_KEY = 'feedia.autopilot';
const loadAP = () => {
  try {
    return JSON.parse(localStorage.getItem(AP_KEY) ?? 'null') ?? defaultAP();
  } catch {
    return defaultAP();
  }
};
const defaultAP = () => ({
  enabled: false,
  mode: 'balanced', // 'conservative' | 'balanced' | 'aggressive'
  postsPerWeek: 5,
  storiesPerDay: 2,
  reelsPerWeek: 3,
  dmAutoReply: true,
  commentAutoReply: false,
  boostAutoApprove: false,
});
const saveAP = (s) => {
  try {
    localStorage.setItem(AP_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
};

const PLAN_BY_MODE = {
  conservative: {
    name: '🐢 Conservador',
    desc: 'Bajo volumen, alta supervisión. Ideal mientras te acostumbrás.',
    plan: [
      { emoji: '🎨', what: 'Generar 1 carrusel borrador', when: 'Lun 9h', agent: 'Nova' },
      { emoji: '✍️', what: 'Re-escribir 2 captions con voz de marca', when: 'Mié 10h', agent: 'Lía' },
      { emoji: '📊', what: 'Reporte semanal de métricas', when: 'Vie 18h', agent: 'Mira' },
    ],
  },
  balanced: {
    name: '⚖️ Balanceado',
    desc: 'Volumen estándar. El sistema publica y respeta tus aprobaciones.',
    plan: [
      { emoji: '🎨', what: 'Generar 3 carruseles + 2 reels', when: 'Lun-Vie', agent: 'Nova' },
      { emoji: '✍️', what: 'Captions auto-generados con tu voz', when: 'Diario', agent: 'Lía' },
      { emoji: '💬', what: 'Auto-respuesta DMs frecuentes', when: '24/7', agent: 'Luca' },
      { emoji: '📈', what: 'Boost al post con mejor 24h reach', when: 'Mar/Jue', agent: 'Mira' },
      { emoji: '📊', what: 'Reporte semanal', when: 'Vie 18h', agent: 'Mira' },
    ],
  },
  aggressive: {
    name: '🚀 Agresivo',
    desc: 'Volumen máximo. El sistema publica con menos checks. Solo si confías en la voz de marca.',
    plan: [
      { emoji: '🎨', what: '5 carruseles + 4 reels + stories diarias', when: 'Lun-Dom', agent: 'Nova' },
      { emoji: '✍️', what: 'Captions + reescrituras automáticas', when: 'Diario', agent: 'Lía' },
      { emoji: '💬', what: 'Auto-respuesta DMs y comentarios', when: '24/7', agent: 'Luca' },
      { emoji: '📈', what: 'Boost agresivo a 3 best performers/semana', when: 'Diario', agent: 'Mira' },
      { emoji: '🛡️', what: 'Compliance check continuo', when: '24/7', agent: 'Gard' },
      { emoji: '📊', what: 'Reportes diario + semanal', when: 'Diario', agent: 'Mira' },
    ],
  },
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* INTELLIGENCE — Pin Slate                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderPin = (pin, slotLabel) => {
  const isGap = pin.source === 'gap-brief';
  return `
    <div class="card pin-slot-card ${isGap ? 'pin-gap' : ''}">
      <div class="pin-slot-label">${slotLabel}</div>
      <div class="pin-source-tag">
        <span class="tag ${isGap ? 'warn' : 'ok'} tiny">${escape(pin.source)}</span>
        ${pin.format ? `<span class="tag tiny">${escape(pin.format)}</span>` : ''}
        ${pin.fitScore > 0 ? `<span class="tag info tiny">fit ${pin.fitScore}</span>` : ''}
      </div>
      <div class="pin-description">${escape(pin.description)}</div>
      <div class="small muted">${escape(pin.rationale)}</div>
    </div>`;
};

const renderIntelligence = async (host) => {
  host.innerHTML = loadingScreen();
  try {
    const slate = await api('/api/pins/recommend');
    const bandTag = slate.band === 'sólido' ? 'ok' : slate.band === 'mejorable' ? 'warn' : 'crit';
    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">📌 Pin Slate — Posts fijados estratégicos</h3>
          <div class="small muted">El sistema elige 3 piezas según funnel position: awareness → consideration → conversion.</div>
        </div>
        <div class="autopilot-slate-score">
          <span class="autopilot-score-num">${slate.slateScore}</span>
          <span class="muted small">/100</span>
          <span class="tag ${bandTag}">${escape(slate.band)}</span>
        </div>
      </div>
      <div class="pin-grid">
        ${renderPin(slate.awarenessPin, 'AWARENESS')}
        ${renderPin(slate.considerationPin, 'CONSIDERATION')}
        ${renderPin(slate.conversionPin, 'CONVERSION')}
      </div>
      ${
        slate.recommendations.length
          ? `
        <div class="card" style="margin-top:14px;">
          <div class="muted tiny" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px;">Recomendaciones</div>
          <ul class="small">${slate.recommendations.map((r) => `<li>${escape(r)}</li>`).join('')}</ul>
        </div>`
          : ''
      }`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* PROTECTION — Originality                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderProtection = async (host) => {
  host.innerHTML = `
    <div class="autopilot-grid-2">
      <div class="card">
        <h3 style="margin:0 0 6px;">🛡 Originality Engine</h3>
        <p class="small muted" style="margin:0 0 14px;">Pegá un draft. El motor compara contra el historial de la marca (fingerprints n-gram + hook overlap) y devuelve un score 0–100.</p>
        <div class="field">
          <label class="field-label">Hook</label>
          <textarea class="field-textarea" id="orig-hook" rows="2" placeholder="El 87% de las marcas comete este error..."></textarea>
        </div>
        <div class="field">
          <label class="field-label">Cuerpo</label>
          <textarea class="field-textarea" id="orig-body" rows="4" placeholder="Desarrollo del contenido..."></textarea>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="orig-check-btn">Verificar originalidad</button>
        </div>
        <div id="orig-result"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 6px;">📚 Fingerprints registrados</h3>
        <div id="orig-fps" class="small muted">cargando…</div>
      </div>
    </div>`;

  try {
    const fps = await api('/api/originality/fingerprints?limit=10');
    const el = host.querySelector('#orig-fps');
    el.innerHTML =
      fps.length === 0
        ? 'Sin fingerprints todavía. Cuando produzcas contenido se irán acumulando acá.'
        : fps
            .slice(-10)
            .reverse()
            .map(
              (f) => `
          <div class="orig-fp-row">
            <span class="tiny muted">${fmt.rel(f.createdAt)}</span>
            <span class="tiny" style="font-family:'SF Mono',monospace;color:var(--text-tertiary);">${escape(f.hash.slice(0, 8))}</span>
            <span class="small" style="flex:1;">${escape(f.hookLine.slice(0, 80) || '(sin hook)')}</span>
          </div>`,
            )
            .join('');
  } catch (err) {
    host.querySelector('#orig-fps').innerHTML = `<span class="crit">Error: ${escape(err.message)}</span>`;
  }

  host.querySelector('#orig-check-btn').addEventListener('click', async (e) => {
    const hook = host.querySelector('#orig-hook').value.trim();
    const body = host.querySelector('#orig-body').value.trim();
    if (!hook && !body) {
      toast('Pegá al menos un hook o body', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'verificando…', async () => {
      try {
        const r = await api('/api/originality/check', { method: 'POST', body: { hook, body } });
        const bandTag = r.band === 'unico' || r.band === 'fresco' ? 'ok' : r.band === 'similar' ? 'warn' : 'crit';
        const html = `
          <div class="orig-result-box">
            <div class="orig-result-head">
              <div class="orig-score-num">${r.originalityScore}</div>
              <span class="tag ${bandTag}">${escape(r.band)}</span>
              <span class="muted tiny">${r.passed ? '✓ puede publicar' : '✗ retry'}</span>
            </div>
            ${
              r.closestMatch
                ? `
              <div class="small muted" style="margin-top:8px;">
                Match más cercano: <span style="color:var(--text-secondary);">"${escape(r.closestMatch.hookLine.slice(0, 80))}"</span>
                <br>Similitud cuerpo: ${(r.closestMatch.bodySimilarity * 100).toFixed(0)}% · hook: ${(r.closestMatch.hookSimilarity * 100).toFixed(0)}%
              </div>`
                : '<div class="small muted" style="margin-top:8px;">Sin match cercano — pieza única.</div>'
            }
            ${r.triggeredRules.length ? `<ul class="small" style="margin-top:8px;">${r.triggeredRules.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>` : ''}
            ${
              r.recommendations.length
                ? `
              <div style="margin-top:8px;">
                <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Sugerencias</div>
                <ul class="small">${r.recommendations.map((x) => `<li>${escape(x)}</li>`).join('')}</ul>
              </div>`
                : ''
            }
          </div>`;
        host.querySelector('#orig-result').innerHTML = html;
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* PRODUCTION — Concept templates                                              */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderProduction = async (host) => {
  host.innerHTML = loadingScreen();
  try {
    const r = await api('/api/templates/list');
    const templates = r.templates ?? [];
    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">🧩 Concept Templates</h3>
          <div class="small muted">${templates.length} plantillas conceptuales. Cada una es el esqueleto narrativo completo de una pieza probada.</div>
        </div>
      </div>
      <div class="page-grid">
        ${templates
          .map(
            (t) => `
          <div class="card template-card" data-id="${escape(t.id)}">
            <div class="meta">
              <span class="tag accent tiny">${escape(t.format)}</span>
              <span class="tag info tiny">${escape(t.funnelPosition)}</span>
              <span class="tag tiny">score ${t.baselineScore}</span>
            </div>
            <h3 style="margin:6px 0 4px;">${escape(t.name)}</h3>
            <div class="small muted">${escape(t.whyItWorks)}</div>
            <div class="small" style="margin-top:6px;"><strong>${t.slots.length} slots:</strong> ${t.slots.map((s) => escape(s.key)).join(' → ')}</div>
            <div class="meta" style="margin-top:6px;">${t.goals.map((g) => `<span class="tag tiny">${escape(g)}</span>`).join('')}</div>
          </div>`,
          )
          .join('')}
      </div>`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* CONVERSATION — Router tester                                                */
/* ──────────────────────────────────────────────────────────────────────────── */

const INTENT_TAG_MAP = {
  'lead-qualified': 'ok',
  'lead-warm': 'info',
  support: 'info',
  complaint: 'crit',
  collab: 'accent',
  spam: 'muted',
  compliment: 'ok',
  'content-ask': 'info',
  'off-topic': 'muted',
  unknown: 'warn',
};

const renderConversation = async (host) => {
  host.innerHTML = `
    <div class="autopilot-grid-2">
      <div class="card">
        <h3 style="margin:0 0 6px;">🗣 Convo Router live tester</h3>
        <p class="small muted" style="margin:0 0 12px;">Pegá un mensaje real (DM o comentario). El router lo clasifica determinísticamente y decide el flujo de respuesta.</p>
        <div class="field">
          <label class="field-label">Mensaje entrante</label>
          <textarea class="field-textarea" id="convo-input" rows="3" placeholder="Hola, cuánto cuesta tu servicio?"></textarea>
        </div>
        <div class="btn-row">
          <button class="btn primary" id="convo-route-btn">Rutear</button>
        </div>
        <div id="convo-result"></div>
      </div>
      <div class="card">
        <h3 style="margin:0 0 6px;">📋 FAQs registradas</h3>
        <div id="convo-faqs" class="small muted">cargando…</div>
      </div>
    </div>`;

  try {
    const faqs = await api('/api/convo/faqs');
    const el = host.querySelector('#convo-faqs');
    el.innerHTML =
      faqs.length === 0
        ? 'Sin FAQs. Agregalas via API o desde Settings para que el router responda automáticamente.'
        : faqs
            .map(
              (f) => `
          <div class="convo-faq-row">
            <div class="small"><strong>${escape(f.topic)}</strong></div>
            <div class="tiny muted">${f.questionVariants.length} variantes · ${f.hits} hits</div>
          </div>`,
            )
            .join('');
  } catch (err) {
    host.querySelector('#convo-faqs').innerHTML = `<span class="crit">Error: ${escape(err.message)}</span>`;
  }

  host.querySelector('#convo-route-btn').addEventListener('click', async (e) => {
    const text = host.querySelector('#convo-input').value.trim();
    if (!text) {
      toast('Pegá un mensaje', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'ruteando…', async () => {
      try {
        const d = await api('/api/convo/route', { method: 'POST', body: { text } });
        const tagCls = INTENT_TAG_MAP[d.detectedIntent] ?? 'info';
        const html = `
          <div class="convo-result-box">
            <div class="meta">
              <span class="tag ${tagCls}">${escape(d.detectedIntent)}</span>
              <span class="tag tiny">conf ${(d.intentConfidence * 100).toFixed(0)}%</span>
              <span class="tag info tiny">policy: ${escape(d.policy)}</span>
              <span class="tag accent tiny">action: ${escape(d.action)}</span>
              ${d.requiresApproval ? '<span class="tag warn tiny">requiere aprobación</span>' : ''}
            </div>
            ${
              d.suggestedReply
                ? `
              <div class="convo-suggested">
                <div class="tiny muted" style="text-transform:uppercase;letter-spacing:.6px;margin-bottom:4px;">Reply sugerido (${escape(d.source)})</div>
                <div class="small">${escape(d.suggestedReply)}</div>
              </div>`
                : '<div class="small muted" style="margin-top:8px;">Sin reply template — se requiere LLM o intervención.</div>'
            }
            ${
              d.signals.length
                ? `
              <div class="tiny muted" style="margin-top:8px;">Señales: ${d.signals.map((s) => escape(s)).join(' · ')}</div>`
                : ''
            }
          </div>`;
        host.querySelector('#convo-result').innerHTML = html;
      } catch (err) {
        toast('Error: ' + err.message, 'crit');
      }
    });
  });
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* RETENTION — Pulses queue                                                    */
/* ──────────────────────────────────────────────────────────────────────────── */

const PULSE_TYPE_ICONS = {
  'cold-lead-dm': '📨',
  'dormant-story': '📖',
  'callback-content': '🔁',
  'nurture-reactivation': '🌱',
  'buyer-thanks': '🙏',
  'birthday-callout': '🎉',
};

const renderRetention = async (host) => {
  host.innerHTML = loadingScreen();
  try {
    const [stats, pulses] = await Promise.all([api('/api/retention/stats'), api('/api/retention/pulses')]);

    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">🔁 Retention Pulses</h3>
          <div class="small muted">Re-engagement proactivo: DMs a leads fríos, stories a dormidos, callbacks a virales pasados.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.total}</div><div class="autopilot-stat-label">total</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.byStatus.propuesto}</div><div class="autopilot-stat-label">propuestos</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${stats.highPriorityPending}</div><div class="autopilot-stat-label">prio alta</div></div>
        </div>
      </div>

      <div class="card" style="margin-bottom:14px;">
        <h3 style="margin:0 0 8px;">⚡ Generar pulsos desde signals</h3>
        <p class="small muted" style="margin:0 0 12px;">Ingresá señales aproximadas de tu audiencia. El motor genera pulsos accionables.</p>
        <div class="field-row">
          <div class="field" style="flex:1;"><label class="field-label">Cold leads</label><input class="field-input" id="sig-cold" type="number" placeholder="ej: 25"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Dormidos</label><input class="field-input" id="sig-dormant" type="number" placeholder="ej: 250"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Compradores recientes</label><input class="field-input" id="sig-buyers" type="number" placeholder="ej: 5"/></div>
          <div class="field" style="flex:1;"><label class="field-label">Warm sin compra</label><input class="field-input" id="sig-warm" type="number" placeholder="ej: 15"/></div>
        </div>
        <div class="btn-row" style="margin-top:8px;">
          <button class="btn primary" id="pulse-plan-btn">Planificar pulsos</button>
        </div>
      </div>

      <div id="pulse-list">
        ${
          pulses.length === 0
            ? '<div class="small muted" style="text-align:center;padding:20px;">Sin pulsos. Generá unos a partir de señales arriba.</div>'
            : pulses
                .map(
                  (p) => `
              <div class="card pulse-card">
                <div class="pulse-icon">${PULSE_TYPE_ICONS[p.type] ?? '⚡'}</div>
                <div class="pulse-body">
                  <div class="meta">
                    <span class="tag ${p.priority === 'alta' ? 'crit' : p.priority === 'media' ? 'warn' : ''} tiny">${escape(p.priority)}</span>
                    <span class="tag info tiny">${escape(p.type)}</span>
                    <span class="tag ${p.status === 'enviado' ? 'ok' : p.status === 'descartado' ? 'crit' : ''} tiny">${escape(p.status)}</span>
                  </div>
                  <h3 style="margin:6px 0 4px;">${escape(p.title)}</h3>
                  <div class="small">${escape(p.actionRequired)}</div>
                  ${p.draftCopy ? `<div class="small muted" style="font-style:italic;margin-top:6px;border-left:2px solid var(--border);padding-left:8px;">"${escape(p.draftCopy)}"</div>` : ''}
                  ${
                    p.status === 'propuesto'
                      ? `
                    <div class="btn-row" style="margin-top:8px;">
                      <button class="btn primary tiny" data-pulse-action="enviado" data-id="${escape(p.id)}">✓ Marcar enviado</button>
                      <button class="btn ghost tiny" data-pulse-action="descartado" data-id="${escape(p.id)}">Descartar</button>
                    </div>`
                      : ''
                  }
                </div>
              </div>`,
                )
                .join('')
        }
      </div>`;

    host.querySelector('#pulse-plan-btn').addEventListener('click', async (e) => {
      const signals = {
        coldLeads: Number(host.querySelector('#sig-cold').value) || 0,
        dormantFollowers: Number(host.querySelector('#sig-dormant').value) || 0,
        recentBuyers: Number(host.querySelector('#sig-buyers').value) || 0,
        warmNonBuyers: Number(host.querySelector('#sig-warm').value) || 0,
      };
      await withBtnSpinner(e.currentTarget, 'planificando…', async () => {
        try {
          const r = await api('/api/retention/plan', { method: 'POST', body: signals });
          toast(`${r.created} pulsos generados`, 'ok');
          await renderRetention(host);
        } catch (err) {
          toast('Error: ' + err.message, 'crit');
        }
      });
    });

    host.querySelectorAll('[data-pulse-action]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await api(`/api/retention/pulses/${btn.dataset.id}/status`, {
          method: 'POST',
          body: { status: btn.dataset.pulseAction },
        });
        await renderRetention(host);
      });
    });
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* OUTREACH — DM sequences                                                     */
/* ──────────────────────────────────────────────────────────────────────────── */

const renderOutreach = async (host) => {
  host.innerHTML = loadingScreen();
  try {
    const [templates, summary] = await Promise.all([api('/api/outreach/templates'), api('/api/outreach/summary')]);

    host.innerHTML = `
      <div class="autopilot-section-head">
        <div>
          <h3 style="margin:0;">📬 Outreach DM Engine</h3>
          <div class="small muted">Templates con secuencias multi-step + A/B variants. ${templates.count} templates, ${summary.total} secuencias disparadas.</div>
        </div>
        <div class="autopilot-stat-row">
          <div class="autopilot-stat"><div class="autopilot-stat-num">${summary.inProgress}</div><div class="autopilot-stat-label">en curso</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${summary.replied}</div><div class="autopilot-stat-label">replicados</div></div>
          <div class="autopilot-stat"><div class="autopilot-stat-num">${(summary.overallReplyRate * 100).toFixed(0)}%</div><div class="autopilot-stat-label">reply rate</div></div>
        </div>
      </div>

      <div class="col-header" style="margin-top:16px;"><h3>📚 Templates disponibles</h3></div>
      <div class="page-grid">
        ${templates.templates
          .map(
            (t) => `
          <div class="card outreach-template-card">
            <div class="meta">
              <span class="tag accent tiny">${escape(t.category)}</span>
              <span class="tag tiny">${escape(t.intensity)}</span>
              <span class="tag ok tiny">${(t.expectedReplyRate * 100).toFixed(0)}% reply esperado</span>
            </div>
            <h3 style="margin:6px 0 4px;">${escape(t.name)}</h3>
            <div class="small muted">${escape(t.whyItWorks)}</div>
            <div class="small" style="margin-top:6px;"><strong>Variants:</strong> ${t.variants.map((v) => escape(v.label)).join(' · ')}</div>
            <div class="small" style="margin-top:6px;"><strong>Steps:</strong> ${t.variants[0].steps.length} paso(s)</div>
          </div>`,
          )
          .join('')}
      </div>

      ${
        summary.variantPerformance.length
          ? `
        <div class="col-header" style="margin-top:24px;"><h3>🏆 Variant performance (A/B)</h3></div>
        <div class="card" style="padding:0;">
          <table style="width:100%;">
            <thead>
              <tr><th>Template</th><th>Variant</th><th style="text-align:right">Sent</th><th style="text-align:right">Reply</th><th style="text-align:right">Rate</th></tr>
            </thead>
            <tbody>
              ${summary.variantPerformance
                .map(
                  (p) => `
                <tr>
                  <td class="small">${escape(p.templateId)}</td>
                  <td class="small">${escape(p.variantLabel)}</td>
                  <td class="small" style="text-align:right">${p.totalSent}</td>
                  <td class="small" style="text-align:right">${p.replied}</td>
                  <td class="small" style="text-align:right"><strong>${(p.replyRate * 100).toFixed(1)}%</strong></td>
                </tr>`,
                )
                .join('')}
            </tbody>
          </table>
        </div>`
          : ''
      }`;
  } catch (err) {
    host.innerHTML = `<div class="alert crit">Error: ${escape(err.message)}</div>`;
  }
};

/* ──────────────────────────────────────────────────────────────────────────── */
/* TAB ROUTING                                                                 */
/* ──────────────────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'intelligence', label: '📌 Pin Slate', render: renderIntelligence },
  { id: 'production', label: '🧩 Templates', render: renderProduction },
  { id: 'protection', label: '🛡 Originality', render: renderProtection },
  { id: 'conversation', label: '🗣 Convo Router', render: renderConversation },
  { id: 'retention', label: '🔁 Retention', render: renderRetention },
  { id: 'outreach', label: '📬 Outreach', render: renderOutreach },
];

const renderActiveTab = async (root) => {
  const host = root.querySelector('#autopilot-content');
  if (!host) return;
  const def = TABS.find((t) => t.id === activeTab) ?? TABS[0];
  await def.render(host);
};

const renderMasterControl = () => {
  const ap = loadAP();
  const mode = PLAN_BY_MODE[ap.mode];
  return `
    <div class="autopilot-master">
      <div class="autopilot-master-head">
        <div class="autopilot-master-title">
          <span class="autopilot-master-status ${ap.enabled ? 'on' : 'off'}"></span>
          <h2>🛰 Autopilot ${ap.enabled ? '<span class="autopilot-on-pill">ACTIVADO</span>' : '<span class="autopilot-off-pill">EN PAUSA</span>'}</h2>
        </div>
        <button class="btn ${ap.enabled ? 'ghost' : 'primary'} large" id="autopilot-toggle">
          ${ap.enabled ? '⏸️ Pausar Autopilot' : '🚀 Activar Autopilot'}
        </button>
      </div>
      <p class="autopilot-master-sub">
        ${
          ap.enabled
            ? `El sistema está operando en modo <strong>${escape(mode.name)}</strong>. Acciones planeadas abajo.`
            : 'Cuando lo actives, el equipo IA empieza a ejecutar el plan automáticamente.'
        }
      </p>

      <!-- Mode selector -->
      <div class="autopilot-mode-row">
        ${Object.entries(PLAN_BY_MODE)
          .map(
            ([k, m]) => `
          <button class="autopilot-mode-card ${ap.mode === k ? 'active' : ''}" data-mode="${k}">
            <div class="autopilot-mode-name">${escape(m.name)}</div>
            <div class="autopilot-mode-desc">${escape(m.desc)}</div>
          </button>`,
          )
          .join('')}
      </div>

      <!-- Plan visible -->
      <div class="autopilot-plan">
        <h4>📅 Plan automático para ${escape(mode.name)}</h4>
        <div class="autopilot-plan-list">
          ${mode.plan
            .map(
              (p) => `
            <div class="autopilot-plan-item">
              <span class="autopilot-plan-emoji">${p.emoji}</span>
              <div class="autopilot-plan-body">
                <div class="autopilot-plan-what">${escape(p.what)}</div>
                <div class="autopilot-plan-meta">${escape(p.when)} · @${escape(p.agent)}</div>
              </div>
            </div>`,
            )
            .join('')}
        </div>
      </div>

      <!-- Permisos rápidos -->
      <div class="autopilot-perms">
        <h4>🔐 Permisos del Autopilot</h4>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="dmAutoReply" ${ap.dmAutoReply ? 'checked' : ''}>
          <span><strong>Auto-responder DMs frecuentes</strong><div class="small muted">Lía responde preguntas comunes con tu voz</div></span>
        </label>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="commentAutoReply" ${ap.commentAutoReply ? 'checked' : ''}>
          <span><strong>Auto-responder comentarios</strong><div class="small muted">Responde comentarios positivos y preguntas</div></span>
        </label>
        <label class="autopilot-perm">
          <input type="checkbox" data-perm="boostAutoApprove" ${ap.boostAutoApprove ? 'checked' : ''}>
          <span><strong>Boost auto-aprobado &lt;$50</strong><div class="small muted">Boosts de hasta $50 USD sin pedir confirmación</div></span>
        </label>
      </div>
    </div>

    <style>
      .autopilot-master {
        background: linear-gradient(135deg, #1a1a2e, #2a1a3e 70%);
        border: 1px solid rgba(168,85,247,.3); border-radius: 18px; padding: 22px;
        margin-bottom: 20px; position: relative; overflow: hidden;
      }
      .autopilot-master::before {
        content: ''; position: absolute; inset: 0;
        background: radial-gradient(circle at 100% 0%, rgba(168,85,247,.2), transparent 50%);
        pointer-events: none;
      }
      .autopilot-master-head { display: flex; justify-content: space-between; align-items: center; gap: 14px; flex-wrap: wrap; position: relative; }
      .autopilot-master-title { display: flex; align-items: center; gap: 12px; }
      .autopilot-master-title h2 { margin: 0; font-size: 22px; font-weight: 800; }
      .autopilot-master-status {
        width: 12px; height: 12px; border-radius: 50%;
      }
      .autopilot-master-status.on { background: #10b981; box-shadow: 0 0 14px rgba(16,185,129,.8); animation: apPulse 2s ease-in-out infinite; }
      .autopilot-master-status.off { background: #6b7280; }
      @keyframes apPulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.2); } }
      .autopilot-on-pill {
        font-size: 11px; padding: 2px 9px; border-radius: 999px;
        background: linear-gradient(90deg,#10b981,#22d3ee); color: #fff; font-weight: 800;
        text-transform: uppercase; letter-spacing: .05em; vertical-align: middle;
      }
      .autopilot-off-pill {
        font-size: 11px; padding: 2px 9px; border-radius: 999px;
        background: #6b7280; color: #fff; font-weight: 800;
        text-transform: uppercase; letter-spacing: .05em; vertical-align: middle;
      }
      .autopilot-master-sub { font-size: 13.5px; color: var(--text-muted, #9CA3AF); margin: 12px 0 18px; position: relative; }

      .autopilot-mode-row {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 10px; margin-bottom: 18px; position: relative;
      }
      .autopilot-mode-card {
        background: var(--surface, #141418); border: 2px solid var(--border);
        border-radius: 12px; padding: 14px; cursor: pointer; color: inherit; text-align: left;
        transition: border-color .15s, transform .15s, box-shadow .2s;
      }
      .autopilot-mode-card:hover { transform: translateY(-1px); border-color: rgba(168,85,247,.5); }
      .autopilot-mode-card.active {
        border-color: #a855f7;
        box-shadow: 0 0 0 3px rgba(168,85,247,.18), 0 6px 18px rgba(168,85,247,.25);
        background: linear-gradient(135deg, rgba(99,102,241,.1), rgba(168,85,247,.05));
      }
      .autopilot-mode-name { font-weight: 700; font-size: 14px; margin-bottom: 4px; }
      .autopilot-mode-desc { font-size: 11.5px; color: var(--text-muted, #9CA3AF); line-height: 1.4; }

      .autopilot-plan { margin-bottom: 18px; position: relative; }
      .autopilot-plan h4 { margin: 0 0 10px; font-size: 14px; }
      .autopilot-plan-list { display: flex; flex-direction: column; gap: 6px; }
      .autopilot-plan-item {
        display: flex; gap: 12px; align-items: center; padding: 10px 12px;
        background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px;
      }
      .autopilot-plan-emoji { font-size: 22px; flex-shrink: 0; }
      .autopilot-plan-body { flex: 1; }
      .autopilot-plan-what { font-weight: 600; font-size: 13px; }
      .autopilot-plan-meta { font-size: 11px; color: var(--text-muted, #9CA3AF); margin-top: 2px; }

      .autopilot-perms { position: relative; }
      .autopilot-perms h4 { margin: 0 0 10px; font-size: 14px; }
      .autopilot-perm {
        display: flex; gap: 12px; align-items: flex-start; padding: 10px 12px;
        background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
        border-radius: 10px; margin-bottom: 6px; cursor: pointer;
      }
      .autopilot-perm:hover { border-color: rgba(168,85,247,.3); }
      .autopilot-perm input { width: 18px; height: 18px; margin-top: 2px; accent-color: #a855f7; }
      .autopilot-perm > span { flex: 1; }
    </style>
  `;
};

const wireMasterControl = (root) => {
  // Toggle main
  root.querySelector('#autopilot-toggle')?.addEventListener('click', () => {
    const ap = loadAP();
    ap.enabled = !ap.enabled;
    saveAP(ap);
    void apiSafe('/api/autopilot/state', null, { method: 'PUT', body: { enabled: ap.enabled } });
    toast(ap.enabled ? '🚀 Autopilot activado — el equipo está operando' : '⏸️ Autopilot en pausa', 'ok');
    // Re-render master only
    const master = root.querySelector('.autopilot-master');
    if (master) {
      const wrap = document.createElement('div');
      wrap.innerHTML = renderMasterControl();
      master.outerHTML = wrap.firstElementChild.outerHTML;
      wireMasterControl(root);
    }
  });

  // Mode selector
  root.querySelectorAll('.autopilot-mode-card').forEach((card) => {
    card.addEventListener('click', () => {
      const ap = loadAP();
      ap.mode = card.dataset.mode;
      saveAP(ap);
      void apiSafe('/api/autopilot/state', null, { method: 'PUT', body: { mode: ap.mode } });
      toast(`Modo: ${PLAN_BY_MODE[ap.mode].name}`, 'ok');
      const master = root.querySelector('.autopilot-master');
      if (master) {
        const wrap = document.createElement('div');
        wrap.innerHTML = renderMasterControl();
        master.outerHTML = wrap.firstElementChild.outerHTML;
        wireMasterControl(root);
      }
    });
  });

  // Permisos
  root.querySelectorAll('[data-perm]').forEach((cb) => {
    cb.addEventListener('change', () => {
      const ap = loadAP();
      ap[cb.dataset.perm] = cb.checked;
      saveAP(ap);
      void apiSafe('/api/autopilot/state', null, { method: 'PUT', body: ap });
      toast(`${cb.checked ? '✓' : '✗'} ${cb.dataset.perm}`, 'info');
    });
  });
};

export const renderAutopilot = async (root) => {
  activeTab = 'intelligence';
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🛰 Autopilot</h1>
        <p class="view-subtitle page-subtitle">Centro de operación autónoma · activá el plan automático y el equipo trabaja solo.</p>
      </div>
    </header>

    ${renderMasterControl()}

    <div class="page-toolbar">
      <h3 style="margin:0 0 10px;font-size:14px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;">Módulos avanzados</h3>
      <div class="page-toolbar-tabs">
        ${TABS.map(
          (t) => `
          <button class="tool-tab-btn ${t.id === activeTab ? 'active' : ''}" data-tab="${t.id}">${escape(t.label)}</button>
        `,
        ).join('')}
      </div>
    </div>
    <div id="autopilot-content" class="page-body">${loadingScreen()}</div>`;

  wireMasterControl(root);

  root.querySelectorAll('.tool-tab-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      activeTab = btn.dataset.tab;
      root.querySelectorAll('.tool-tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
      await renderActiveTab(root);
    });
  });

  await renderActiveTab(root);
};
