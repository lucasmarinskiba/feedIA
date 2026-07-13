/* ══════════════════════════════════════════════════════════════════════════════
   STUDIO MANAGER — Panel maestro del CU Brain
   ──────────────────────────────────────────────────────────────────────────────
   Dashboard centralizado con 8 paneles:
     1. Master Brain          4. DM Intelligence     7. Trending Engine
     2. Content Queue         5. Hashtag Engine       8. Competitor Analysis
     3. A/B Tests             6. Comment Intelligence
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { withBtnSpinner } from '../lib/ui.js';

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDuration = (ms) => {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms / 60000)}m`;
};

const badge = (text, color = '#3451d1') =>
  `<span style="display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600;background:${color}20;color:${color}">${escape(text)}</span>`;

const momentumBadge = (m) => {
  const map = { rising: ['#22c55e', '↑ subiendo'], peak: ['#f59e0b', '⚡ pico'], declining: ['#ef4444', '↓ bajando'] };
  const [c, l] = map[m] ?? ['#6b7280', m];
  return badge(l, c);
};

const opportunityBadge = (o) => {
  const map = { alta: '#22c55e', media: '#f59e0b', baja: '#6b7280' };
  return badge(o, map[o] ?? '#6b7280');
};

const copyText = (text) => {
  navigator.clipboard
    .writeText(text)
    .then(() => toast('Copiado ✓', 'success'))
    .catch(() => toast('Error al copiar', 'error'));
};

const collapsibleCard = (id, emoji, title, badgeHtml, contentHtml, initialOpen = false) => `
  <div class="sm-card" id="sm-card-${id}">
    <button class="sm-card-header" onclick="document.getElementById('sm-body-${id}').classList.toggle('hidden');this.querySelector('.sm-chevron').classList.toggle('rotated')">
      <span>${emoji} <strong>${escape(title)}</strong> ${badgeHtml}</span>
      <span class="sm-chevron${initialOpen ? ' rotated' : ''}">▾</span>
    </button>
    <div id="sm-body-${id}" class="${initialOpen ? '' : 'hidden'}">${contentHtml}</div>
  </div>`;

// ── CSS inline ────────────────────────────────────────────────────────────────

const injectStyles = () => {
  if (document.getElementById('sm-styles')) return;
  const s = document.createElement('style');
  s.id = 'sm-styles';
  s.textContent = `
    .sm-wrap { display:flex; flex-direction:column; gap:16px; padding:24px; max-width:960px; margin:0 auto; }
    .sm-topbar { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .sm-topbar h1 { font-size:22px; font-weight:700; margin:0; flex:1; }
    .sm-tabs { display:flex; gap:6px; flex-wrap:wrap; }
    .sm-tab { padding:6px 14px; border-radius:20px; font-size:13px; cursor:pointer; border:1px solid var(--border,#e2e8f0); background:transparent; transition:all .15s; }
    .sm-tab.active { background:#3451d1; color:#fff; border-color:#3451d1; }
    .sm-panel { display:none; flex-direction:column; gap:12px; }
    .sm-panel.visible { display:flex; }
    .sm-card { border:1px solid var(--border,#e2e8f0); border-radius:12px; overflow:hidden; background:var(--surface,#fff); }
    .sm-card-header { width:100%; text-align:left; padding:14px 16px; background:none; border:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; font-size:14px; }
    .sm-card-header:hover { background:var(--hover,#f8fafc); }
    .sm-chevron { transition:transform .2s; display:inline-block; }
    .sm-chevron.rotated { transform:rotate(180deg); }
    .sm-body { padding:16px; border-top:1px solid var(--border,#e2e8f0); display:flex; flex-direction:column; gap:10px; }
    #sm-body-masterrun { padding:16px; border-top:1px solid var(--border,#e2e8f0); }
    .sm-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .sm-stat { background:var(--hover,#f8fafc); border-radius:8px; padding:8px 12px; font-size:13px; }
    .sm-stat strong { display:block; font-size:18px; }
    .sm-stat-row { display:flex; gap:8px; flex-wrap:wrap; }
    .sm-step { display:flex; gap:8px; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-step:last-child { border:none; }
    .sm-step-emoji { font-size:18px; flex-shrink:0; }
    .sm-step-body { flex:1; min-width:0; }
    .sm-step-phase { font-weight:600; }
    .sm-step-out { color:var(--text-muted,#64748b); margin-top:2px; }
    .sm-step-dur { font-size:11px; color:var(--text-muted,#64748b); }
    .sm-trend-item { display:flex; flex-direction:column; gap:4px; padding:10px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-trend-item:last-child { border:none; }
    .sm-trend-name { font-weight:600; }
    .sm-trend-desc { color:var(--text-muted,#64748b); }
    .sm-trend-meta { display:flex; gap:6px; flex-wrap:wrap; align-items:center; }
    .sm-insight { padding:10px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-insight:last-child { border:none; }
    .sm-insight-title { font-weight:600; }
    .sm-insight-desc { color:var(--text-muted,#64748b); margin:2px 0; }
    .sm-insight-rec { font-style:italic; font-size:12px; color:#3451d1; }
    .sm-ab-item { display:flex; gap:8px; align-items:center; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-ab-item:last-child { border:none; }
    .sm-q-item { display:flex; gap:8px; align-items:flex-start; padding:8px 0; border-bottom:1px solid var(--border,#e2e8f0); font-size:13px; }
    .sm-q-item:last-child { border:none; }
    .sm-q-status { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:5px; }
    .sm-q-status.scheduled { background:#f59e0b; }
    .sm-q-status.pending { background:#94a3b8; }
    .sm-q-status.published { background:#22c55e; }
    .sm-q-status.failed { background:#ef4444; }
    .sm-input { width:100%; padding:8px 12px; border:1px solid var(--border,#e2e8f0); border-radius:8px; font-size:13px; background:var(--surface,#fff); color:inherit; }
    .sm-select { padding:7px 10px; border:1px solid var(--border,#e2e8f0); border-radius:8px; font-size:13px; background:var(--surface,#fff); color:inherit; }
    .sm-btn { padding:8px 16px; border-radius:8px; font-size:13px; font-weight:600; cursor:pointer; border:none; background:#3451d1; color:#fff; transition:opacity .15s; }
    .sm-btn:hover { opacity:.85; }
    .sm-btn.secondary { background:var(--hover,#f1f5f9); color:var(--text,#1e293b); border:1px solid var(--border,#e2e8f0); }
    .sm-btn.danger { background:#ef4444; }
    .sm-btn.success { background:#22c55e; }
    .sm-score-bar { height:6px; border-radius:3px; background:#e2e8f0; overflow:hidden; }
    .sm-score-fill { height:100%; border-radius:3px; background:#3451d1; transition:width .4s; }
    .sm-tag { display:inline-block; padding:2px 8px; border-radius:20px; font-size:11px; font-weight:500; background:#e2e8f0; color:#374151; margin:2px; }
    .sm-tag.purple { background:#7c3aed20; color:#7c3aed; }
    .sm-tag.blue { background:#3451d120; color:#3451d1; }
    .sm-tag.gray { background:#6b728020; color:#6b7280; }
    .sm-empty { text-align:center; padding:32px; color:var(--text-muted,#64748b); font-size:14px; }
    .hidden { display:none !important; }
  `;
  document.head.appendChild(s);
};

// ── Panel 1: Master Brain ─────────────────────────────────────────────────────

const renderMasterBrainPanel = (root) => {
  const wrap = root.querySelector('#sm-panel-brain');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">
        🧠 <strong>Master Brain</strong> — Orquestador unificado de Computer Use
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px;">
        <div class="sm-row">
          <select id="sm-mb-intent" class="sm-select">
            <option value="create-content">✍️ Crear contenido</option>
            <option value="build-brand">🏛️ Construir marca</option>
            <option value="evolve-brand">🔄 Evolucionar marca</option>
            <option value="analyze" selected>🔍 Análisis completo</option>
            <option value="publish">📤 Publicar</option>
            <option value="full-takeover">🤖 Full Takeover (autopilot)</option>
            <option value="manage-dms">💬 Gestionar DMs</option>
            <option value="manage-comments">💡 Gestionar comentarios</option>
            <option value="optimize-hashtags">#️⃣ Optimizar hashtags</option>
            <option value="schedule-queue">📅 Programar cola</option>
            <option value="generate-captions">✍️ Generar captions</option>
            <option value="detect-trends">📈 Detectar tendencias</option>
            <option value="analyze-competitors">🔍 Analizar competidores</option>
            <option value="ab-test">🧪 A/B Test</option>
          </select>
          <select id="sm-mb-mode" class="sm-select">
            <option value="supervisor">👤 Supervisor</option>
            <option value="autopilot">🤖 Autopilot</option>
            <option value="observer">👁️ Observer</option>
          </select>
          <select id="sm-mb-format" class="sm-select">
            <option value="carousel">Carrusel</option>
            <option value="reel">Reel</option>
            <option value="story">Historia</option>
            <option value="post">Post</option>
          </select>
        </div>
        <input id="sm-mb-topic" class="sm-input" placeholder="Tema / instrucción (ej: 'recetas rápidas para mamás ocupadas')" />
        <div class="sm-row">
          <button class="sm-btn" id="sm-mb-run">⚡ Ejecutar Master Brain</button>
          <button class="sm-btn secondary" id="sm-mb-list">📋 Ver cerebros disponibles</button>
        </div>
        <div id="sm-mb-result" style="display:none;"></div>
      </div>
    </div>`;

  root.querySelector('#sm-mb-run').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    const intent = root.querySelector('#sm-mb-intent').value;
    const mode = root.querySelector('#sm-mb-mode').value;
    const format = root.querySelector('#sm-mb-format').value;
    const topic = root.querySelector('#sm-mb-topic').value.trim();
    const resultEl = root.querySelector('#sm-mb-result');
    await withBtnSpinner(btn, async () => {
      const res = await apiSafe('/api/cu/master-brain', 'POST', {
        intent,
        mode,
        contentFormat: format,
        userInput: topic || intent,
        topic,
      });
      resultEl.style.display = 'block';
      if (!res.ok) {
        resultEl.innerHTML = `<p style="color:#ef4444">Error: ${escape(res.error ?? 'desconocido')}</p>`;
        return;
      }
      const { steps = [], brainsActivated = [], finalOutput } = res;
      resultEl.innerHTML = `
        <div class="sm-stat-row" style="margin-bottom:12px">
          <div class="sm-stat"><strong>${brainsActivated.length}</strong>Cerebros activados</div>
          <div class="sm-stat"><strong>${steps.length}</strong>Pasos ejecutados</div>
          <div class="sm-stat"><strong>${finalOutput?.deliverables?.length ?? 0}</strong>Entregables</div>
        </div>
        <div class="sm-score-bar" style="margin-bottom:12px"><div class="sm-score-fill" style="width:${Math.min(brainsActivated.length * 8, 100)}%"></div></div>
        ${steps
          .map(
            (s) => `
          <div class="sm-step">
            <div class="sm-step-emoji">${escape(s.emoji)}</div>
            <div class="sm-step-body">
              <div class="sm-step-phase">${escape(s.brainLabel)} · ${escape(s.phase)}</div>
              <div class="sm-step-out">${escape(s.output)}</div>
              <div class="sm-step-dur">${fmtDuration(s.durationMs)}</div>
            </div>
          </div>`,
          )
          .join('')}
        ${finalOutput?.nextActions?.length ? `<div class="sm-row" style="margin-top:8px">${finalOutput.nextActions.map((a) => `<button class="sm-btn secondary" onclick="toast('${escape(a.apiCall ?? a.route ?? '')}','info')">${escape(a.label)}</button>`).join('')}</div>` : ''}`;
      toast('Master Brain ejecutado ✓', 'success');
    });
  });

  root.querySelector('#sm-mb-list').addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    await withBtnSpinner(btn, async () => {
      const res = await apiSafe('/api/cu/master-brain/brains');
      const resultEl = root.querySelector('#sm-mb-result');
      resultEl.style.display = 'block';
      if (!res.ok || !res.brains) {
        resultEl.innerHTML = '<p style="color:#ef4444">No se pudo cargar</p>';
        return;
      }
      resultEl.innerHTML = res.brains
        .map(
          (b) => `
        <div class="sm-row" style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0)">
          <span>${escape(b.emoji)}</span>
          <span style="font-weight:600;font-size:13px">${escape(b.label)}</span>
          ${badge(b.isAvailable ? 'disponible' : 'inactivo', b.isAvailable ? '#22c55e' : '#ef4444')}
          <span style="font-size:12px;color:var(--text-muted,#64748b);flex:1">${escape(b.description)}</span>
        </div>`,
        )
        .join('');
    });
  });
};

// ── Panel 2: Content Queue ─────────────────────────────────────────────────────

const renderQueuePanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-queue');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">📅 <strong>Content Queue</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-q-load">🔄 Cargar cola</button>
          <button class="sm-btn secondary" id="sm-q-windows">⏰ Ver ventanas prime</button>
          <button class="sm-btn secondary" id="sm-q-next">▶️ Procesar siguiente</button>
        </div>
        <div id="sm-q-list"><div class="sm-empty">Cargá la cola para ver el contenido programado</div></div>
      </div>
    </div>`;

  const renderQueue = (items) => {
    const el = root.querySelector('#sm-q-list');
    if (!items?.length) {
      el.innerHTML = '<div class="sm-empty">Cola vacía — no hay contenido programado</div>';
      return;
    }
    el.innerHTML = items
      .map(
        (item) => `
      <div class="sm-q-item">
        <div class="sm-q-status ${escape(item.status ?? 'pending')}"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:13px">${escape(item.contentType ?? 'post')} · ${escape(item.topic ?? '—')}</div>
          <div style="font-size:12px;color:var(--text-muted,#64748b)">${item.scheduledFor ? new Date(item.scheduledFor).toLocaleString('es-AR') : 'Sin fecha'} · ${badge(item.status ?? 'pending')}</div>
        </div>
        <button class="sm-btn secondary" style="padding:4px 10px;font-size:11px" onclick="api('/api/queue/${escape(item.id)}','DELETE').then(()=>toast('Eliminado','success'))">✕</button>
      </div>`,
      )
      .join('');
  };

  root.querySelector('#sm-q-load').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/queue');
      renderQueue(res.items ?? res.queue ?? []);
    });
  });

  root.querySelector('#sm-q-windows').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/queue/windows', 'POST');
      const el = root.querySelector('#sm-q-list');
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const windows = res.windows ?? res ?? [];
      el.innerHTML =
        `<div style="font-weight:600;font-size:13px;margin-bottom:8px">🕐 Ventanas de publicación óptimas</div>` +
        windows
          .slice(0, 12)
          .map(
            (w) => `
          <div class="sm-row" style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <span style="font-weight:600;width:40px">${days[w.dayOfWeek] ?? '?'}</span>
            <span>${String(w.hour).padStart(2, '0')}:00hs</span>
            ${badge(w.quality, w.quality === 'prime' ? '#22c55e' : w.quality === 'good' ? '#f59e0b' : '#6b7280')}
            <span style="font-size:12px;color:var(--text-muted,#64748b)">${escape(w.reason ?? '')}</span>
          </div>`,
          )
          .join('');
    });
  });

  root.querySelector('#sm-q-next').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/queue/process-next', 'POST');
      toast(res.message ?? (res.processed ? 'Procesado ✓' : 'Nada pendiente'), res.processed ? 'success' : 'info');
    });
  });
};

// ── Panel 3: A/B Tests ────────────────────────────────────────────────────────

const renderABPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-ab');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">🧪 <strong>A/B Tests</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-ab-load">🔄 Cargar tests</button>
          <button class="sm-btn secondary" id="sm-ab-suggest">💡 Sugerir próximo test</button>
        </div>
        <div style="display:flex;gap:8px">
          <input id="sm-ab-topic" class="sm-input" placeholder="Tema del test (ej: 'caption de reel de recetas')" style="flex:1" />
          <button class="sm-btn" id="sm-ab-create">+ Crear test</button>
        </div>
        <div id="sm-ab-list"><div class="sm-empty">Cargá los tests para verlos</div></div>
      </div>
    </div>`;

  root.querySelector('#sm-ab-load').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/ab-tests');
      const el = root.querySelector('#sm-ab-list');
      const tests = res.tests ?? res ?? [];
      if (!tests.length) {
        el.innerHTML = '<div class="sm-empty">Sin tests — creá el primero</div>';
        return;
      }
      el.innerHTML = tests
        .map(
          (t) => `
        <div class="sm-ab-item">
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${escape(t.name ?? t.id)}</div>
            <div style="font-size:12px;color:var(--text-muted,#64748b)">${t.variants?.length ?? 0} variantes · ${badge(t.status ?? 'running')}</div>
          </div>
          <button class="sm-btn secondary" style="padding:4px 10px;font-size:11px"
            onclick="apiSafe('/api/ab-tests/${escape(t.id)}/evaluate','POST').then(r=>toast(r.winner?'Ganador: '+r.winner:'Sin ganador aún','info'))">
            📊 Evaluar
          </button>
        </div>`,
        )
        .join('');
    });
  });

  root.querySelector('#sm-ab-create').addEventListener('click', async (e) => {
    const topic = root.querySelector('#sm-ab-topic').value.trim();
    if (!topic) {
      toast('Escribí un tema para el test', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/ab-tests', 'POST', { name: topic, topic });
      if (res.id) toast(`Test creado: ${res.id}`, 'success');
      else toast('Error al crear test', 'error');
    });
  });

  root.querySelector('#sm-ab-suggest').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/ab-tests/suggest-next', 'POST');
      const el = root.querySelector('#sm-ab-list');
      if (res.suggestion) {
        el.innerHTML = `<div style="padding:12px;background:var(--hover,#f8fafc);border-radius:8px;font-size:13px">
          <div style="font-weight:600;margin-bottom:4px">💡 Test sugerido: ${escape(res.suggestion.name ?? '—')}</div>
          <div style="color:var(--text-muted,#64748b)">${escape(res.suggestion.rationale ?? '')}</div>
        </div>`;
      }
    });
  });
};

// ── Panel 4: DM Intelligence ──────────────────────────────────────────────────

const renderDMPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-dm');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">💬 <strong>DM Intelligence</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-dm-load">🔄 Cargar conversaciones</button>
          <button class="sm-btn secondary" id="sm-dm-templates">🤖 Generar auto-respuestas</button>
        </div>
        <div style="display:flex;gap:8px">
          <input id="sm-dm-text" class="sm-input" placeholder="Texto de un DM para clasificar..." style="flex:1" />
          <button class="sm-btn secondary" id="sm-dm-classify">🔍 Clasificar</button>
        </div>
        <div id="sm-dm-result"><div class="sm-empty">Cargá conversaciones o clasificá un DM</div></div>
      </div>
    </div>`;

  root.querySelector('#sm-dm-load').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/dm/conversations');
      const el = root.querySelector('#sm-dm-result');
      const convs = res.conversations ?? res ?? [];
      if (!convs.length) {
        el.innerHTML = '<div class="sm-empty">Sin conversaciones guardadas</div>';
        return;
      }
      el.innerHTML = convs
        .slice(0, 10)
        .map(
          (c) => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div style="font-weight:600">${escape(c.username ?? c.userId ?? '—')} ${badge(c.intent ?? 'desconocido')}</div>
          <div style="color:var(--text-muted,#64748b)">${escape(c.lastMessage?.slice(0, 80) ?? '')}...</div>
          <div style="font-size:11px;color:var(--text-muted,#64748b)">${badge(c.status ?? 'abierto', c.status === 'resolved' ? '#22c55e' : '#f59e0b')}</div>
        </div>`,
        )
        .join('');
    });
  });

  root.querySelector('#sm-dm-classify').addEventListener('click', async (e) => {
    const text = root.querySelector('#sm-dm-text').value.trim();
    if (!text) {
      toast('Escribí el texto de un DM', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/dm/classify', 'POST', { message: text });
      const el = root.querySelector('#sm-dm-result');
      el.innerHTML = `<div style="padding:12px;background:var(--hover,#f8fafc);border-radius:8px;font-size:13px">
        <div class="sm-row"><strong>Intent:</strong>${badge(res.intent ?? '—', '#3451d1')}</div>
        <div class="sm-row"><strong>Sentimiento:</strong>${badge(res.sentiment ?? '—', res.sentiment === 'positivo' ? '#22c55e' : res.sentiment === 'negativo' ? '#ef4444' : '#6b7280')}</div>
        <div class="sm-row"><strong>Urgencia:</strong>${badge(res.urgency ?? 'normal')}</div>
        ${res.suggestedResponse ? `<div style="margin-top:8px;padding:8px;border:1px solid var(--border,#e2e8f0);border-radius:6px">${escape(res.suggestedResponse)}</div>` : ''}
      </div>`;
    });
  });

  root.querySelector('#sm-dm-templates').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/dm/templates/build', 'POST');
      const el = root.querySelector('#sm-dm-result');
      const templates = Object.entries(res ?? {});
      if (!templates.length) {
        el.innerHTML = '<div class="sm-empty">Sin templates generados</div>';
        return;
      }
      el.innerHTML =
        `<div style="font-weight:600;margin-bottom:8px;font-size:13px">🤖 ${templates.length} plantillas de auto-respuesta generadas</div>` +
        templates
          .map(
            ([intent, tmpl]) => `
          <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:12px">
            <div style="font-weight:600">${badge(intent, '#3451d1')}</div>
            <div style="color:var(--text-muted,#64748b);margin-top:4px">${escape(typeof tmpl === 'string' ? tmpl : JSON.stringify(tmpl))}</div>
          </div>`,
          )
          .join('');
      toast(`${templates.length} plantillas listas ✓`, 'success');
    });
  });
};

// ── Panel 5: Hashtag Engine ───────────────────────────────────────────────────

const renderHashtagPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-hashtag');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">#️⃣ <strong>Hashtag Engine</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <input id="sm-ht-topic" class="sm-input" placeholder="Tema o contenido (ej: 'reel de recetas veganas')" style="flex:1" />
          <button class="sm-btn" id="sm-ht-strategy">⚡ Generar estrategia</button>
        </div>
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-ht-pool">🏊 Build pool</button>
          <button class="sm-btn secondary" id="sm-ht-rotate">🔄 Rotar sets</button>
        </div>
        <div id="sm-ht-result"><div class="sm-empty">Generá una estrategia de hashtags</div></div>
      </div>
    </div>`;

  const renderStrategy = (strategy, el) => {
    if (!strategy) {
      el.innerHTML = '<div class="sm-empty">Sin estrategia</div>';
      return;
    }
    el.innerHTML = `
      <div style="margin-bottom:8px;font-size:13px"><strong>Total: ${strategy.total ?? 0} hashtags</strong> · ${escape(strategy.rationale ?? '')}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">🟣 PRIMARIOS (nicho)</div>
      <div style="margin-bottom:8px">${(strategy.primarySet ?? []).map((t) => `<span class="sm-tag purple">${escape(t)}</span>`).join('')}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">🔵 SECUNDARIOS (audiencia)</div>
      <div style="margin-bottom:8px">${(strategy.secondarySet ?? []).map((t) => `<span class="sm-tag blue">${escape(t)}</span>`).join('')}</div>
      <div style="margin-bottom:4px;font-size:12px;font-weight:600;color:var(--text-muted,#64748b)">⚫ CONTEXTUALES (contenido)</div>
      <div style="margin-bottom:12px">${(strategy.contextualSet ?? []).map((t) => `<span class="sm-tag gray">${escape(t)}</span>`).join('')}</div>
      <button class="sm-btn secondary" style="font-size:12px" onclick="copyText([...(${JSON.stringify(strategy.primarySet ?? [])}),(${JSON.stringify(strategy.secondarySet ?? [])}),(${JSON.stringify(strategy.contextualSet ?? [])})].join(' '))">📋 Copiar todos</button>`;
  };

  root.querySelector('#sm-ht-strategy').addEventListener('click', async (e) => {
    const topic = root.querySelector('#sm-ht-topic').value.trim();
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/hashtags/strategy', 'POST', { topic, contentText: topic });
      renderStrategy(res.strategy ?? res, root.querySelector('#sm-ht-result'));
    });
  });

  root.querySelector('#sm-ht-pool').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/hashtags/build-pool', 'POST');
      const el = root.querySelector('#sm-ht-result');
      const pool = res.pool ?? res ?? {};
      const allTags = Object.values(pool).flat();
      el.innerHTML =
        `<div style="font-size:13px;margin-bottom:8px"><strong>${allTags.length} hashtags en el pool</strong></div>` +
        allTags.map((t) => `<span class="sm-tag">${escape(t)}</span>`).join('');
      toast(`Pool de ${allTags.length} hashtags listo ✓`, 'success');
    });
  });

  root.querySelector('#sm-ht-rotate').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/hashtags/rotate', 'POST', { currentSets: [] });
      renderStrategy(res.strategy ?? res, root.querySelector('#sm-ht-result'));
      toast('Hashtags rotados ✓', 'success');
    });
  });
};

// ── Panel 6: Comment Intelligence ────────────────────────────────────────────

const renderCommentPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-comment');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">💡 <strong>Comment Intelligence</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-cm-library">📚 Build librería</button>
          <button class="sm-btn secondary" id="sm-cm-seed">🌱 Generar seeds</button>
        </div>
        <textarea id="sm-cm-comments" class="sm-input" rows="3" placeholder='Pegá comentarios (uno por línea) para analizar...'></textarea>
        <div class="sm-row">
          <button class="sm-btn" id="sm-cm-analyze">🔍 Analizar</button>
          <button class="sm-btn secondary" id="sm-cm-replies">💬 Generar respuestas</button>
          <button class="sm-btn secondary" id="sm-cm-crisis">🚨 Detectar crisis</button>
        </div>
        <div id="sm-cm-result"><div class="sm-empty">Analizá comentarios o construí la librería</div></div>
      </div>
    </div>`;

  const parseComments = (root) => {
    const raw = root.querySelector('#sm-cm-comments').value.trim();
    return raw
      ? raw
          .split('\n')
          .filter(Boolean)
          .map((text, i) => ({ id: String(i), text, author: 'usuario', timestamp: new Date().toISOString() }))
      : [];
  };

  root.querySelector('#sm-cm-analyze').addEventListener('click', async (e) => {
    const comments = parseComments(root);
    if (!comments.length) {
      toast('Pegá comentarios para analizar', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/comments/analyze', 'POST', { comments });
      const el = root.querySelector('#sm-cm-result');
      const batch = res.batch ?? res;
      el.innerHTML = `
        <div class="sm-stat-row" style="margin-bottom:8px">
          <div class="sm-stat"><strong>${batch?.positiveCount ?? 0}</strong>Positivos</div>
          <div class="sm-stat"><strong>${batch?.negativeCount ?? 0}</strong>Negativos</div>
          <div class="sm-stat"><strong>${batch?.neutralCount ?? 0}</strong>Neutros</div>
          <div class="sm-stat"><strong>${batch?.questionCount ?? 0}</strong>Preguntas</div>
        </div>
        ${batch?.overallSentiment ? `<div style="font-size:13px">Sentimiento general: ${badge(batch.overallSentiment)}</div>` : ''}`;
    });
  });

  root.querySelector('#sm-cm-replies').addEventListener('click', async (e) => {
    const comments = parseComments(root);
    if (!comments.length) {
      toast('Pegá comentarios primero', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, async () => {
      const [batchRes, repliesRes] = await Promise.all([
        apiSafe('/api/comments/analyze', 'POST', { comments }),
        Promise.resolve(null),
      ]);
      const plans = await apiSafe('/api/comments/replies', 'POST', { batch: batchRes, mode: 'supervised' });
      const el = root.querySelector('#sm-cm-result');
      const items = plans.plans ?? plans ?? [];
      el.innerHTML = items
        .slice(0, 5)
        .map(
          (p) => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div style="color:var(--text-muted,#64748b)">${badge('a: ' + escape(p.comment?.text?.slice(0, 40) ?? '—'))}</div>
          <div style="margin-top:4px">${escape(p.suggestedReply ?? p.reply ?? '—')}</div>
        </div>`,
        )
        .join('');
    });
  });

  root.querySelector('#sm-cm-crisis').addEventListener('click', async (e) => {
    const comments = parseComments(root);
    if (!comments.length) {
      toast('Pegá comentarios primero', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, async () => {
      const batch = await apiSafe('/api/comments/analyze', 'POST', { comments });
      const crisis = await apiSafe('/api/comments/detect-crisis', 'POST', { batch });
      const el = root.querySelector('#sm-cm-result');
      el.innerHTML = `<div style="padding:12px;border-radius:8px;background:${crisis.isCrisis ? '#fef2f2' : '#f0fdf4'};font-size:13px">
        <div style="font-weight:600">${crisis.isCrisis ? '🚨 CRISIS DETECTADA' : '✅ Sin crisis'}</div>
        ${crisis.triggers?.length ? `<ul style="margin:6px 0 0 16px">${crisis.triggers.map((t) => `<li>${escape(t)}</li>`).join('')}</ul>` : ''}
        ${crisis.recommendedAction ? `<div style="margin-top:6px;font-style:italic">${escape(crisis.recommendedAction)}</div>` : ''}
      </div>`;
    });
  });

  root.querySelector('#sm-cm-seed').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/comments/seed', 'POST', { hook: 'contenido de marca', count: 5 });
      const el = root.querySelector('#sm-cm-result');
      const seeds = res.comments ?? res ?? [];
      el.innerHTML =
        `<div style="font-weight:600;margin-bottom:8px;font-size:13px">🌱 ${seeds.length} comentarios seed generados</div>` +
        seeds
          .map(
            (s) =>
              `<div style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">${escape(typeof s === 'string' ? s : (s.text ?? JSON.stringify(s)))}</div>`,
          )
          .join('');
    });
  });

  root.querySelector('#sm-cm-library').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      await apiSafe('/api/comments/library/build', 'POST');
      toast('Librería de respuestas construida ✓', 'success');
    });
  });
};

// ── Panel 7: Trending Engine ──────────────────────────────────────────────────

const renderTrendingPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-trend');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">📈 <strong>Trending Engine</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <button class="sm-btn" id="sm-tr-detect">🔍 Detectar tendencias</button>
          <button class="sm-btn secondary" id="sm-tr-latest">📄 Cargar último reporte</button>
          <button class="sm-btn secondary" id="sm-tr-calendar">📅 Generar calendario</button>
        </div>
        <div id="sm-tr-result"><div class="sm-empty">Detectá tendencias para tu nicho</div></div>
      </div>
    </div>`;

  const renderTrends = (report, el) => {
    if (!report?.trends?.length) {
      el.innerHTML = '<div class="sm-empty">Sin tendencias detectadas</div>';
      return;
    }
    el.innerHTML = `
      <div class="sm-stat-row" style="margin-bottom:12px">
        <div class="sm-stat"><strong>${report.trends.length}</strong>Tendencias</div>
        <div class="sm-stat"><strong>${report.topPicks.length}</strong>Top picks</div>
        <div class="sm-stat"><strong>${new Date(report.generatedAt).toLocaleDateString('es-AR')}</strong>Generado</div>
      </div>
      <div style="padding:8px;background:var(--hover,#f8fafc);border-radius:8px;font-size:12px;margin-bottom:12px;color:var(--text-muted,#64748b)">${escape(report.summary)}</div>
      ${report.trends
        .map(
          (t) => `
        <div class="sm-trend-item">
          <div class="sm-trend-meta">${momentumBadge(t.momentum)} ${badge(`${t.relevanceScore}/100`, t.relevanceScore >= 80 ? '#22c55e' : t.relevanceScore >= 60 ? '#f59e0b' : '#6b7280')} ${badge(t.timeWindow)}</div>
          <div class="sm-trend-name">${escape(t.name)}</div>
          <div class="sm-trend-desc">${escape(t.description)}</div>
          <div style="margin-top:4px">${t.hashtags
            .slice(0, 5)
            .map((h) => `<span class="sm-tag blue">${escape(h)}</span>`)
            .join('')}</div>
          <div style="font-size:12px;color:#3451d1;margin-top:4px">💡 ${escape(t.contentIdeas[0] ?? '')}</div>
        </div>`,
        )
        .join('')}`;
  };

  root.querySelector('#sm-tr-detect').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/trends/detect', 'POST');
      renderTrends(res, root.querySelector('#sm-tr-result'));
      toast(`${res.trends?.length ?? 0} tendencias detectadas ✓`, 'success');
    });
  });

  root.querySelector('#sm-tr-latest').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/trends/latest');
      if (res.error) {
        toast(res.error, 'warn');
        return;
      }
      renderTrends(res, root.querySelector('#sm-tr-result'));
    });
  });

  root.querySelector('#sm-tr-calendar').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/trends/calendar', 'POST', { days: 7 });
      const el = root.querySelector('#sm-tr-result');
      if (res.error) {
        toast(res.error, 'warn');
        return;
      }
      const calendar = res.calendar ?? [];
      el.innerHTML =
        `<div style="font-weight:600;margin-bottom:8px;font-size:13px">📅 Calendario de contenido trending (7 días)</div>` +
        calendar
          .map(
            (entry) => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <div class="sm-row">${badge(entry.date, '#3451d1')} ${badge(entry.publishTime)} ${badge(entry.priority, entry.priority === 'alta' ? '#22c55e' : entry.priority === 'media' ? '#f59e0b' : '#6b7280')}</div>
            <div style="font-weight:600;margin-top:4px">${escape(entry.trend.name)}</div>
            <div style="color:var(--text-muted,#64748b)">${escape(entry.adaptation?.contentIdea ?? entry.adaptation?.hook ?? '—')}</div>
            <div style="font-size:11px;margin-top:4px">${badge(entry.adaptation?.format ?? 'reel')} ${badge(entry.adaptation?.urgency ?? 'esta-semana')}</div>
          </div>`,
          )
          .join('');
    });
  });
};

// ── Panel 8: Competitor Analysis ──────────────────────────────────────────────

const renderCompetitorPanel = async (root) => {
  const wrap = root.querySelector('#sm-panel-comp');
  if (!wrap) return;

  wrap.innerHTML = `
    <div class="sm-card">
      <div class="sm-card-header" style="cursor:default">🔍 <strong>Competitor Analysis</strong></div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:12px">
        <div class="sm-row">
          <input id="sm-comp-handles" class="sm-input" placeholder="@handle1, @handle2 (opcional — deja vacío para auto-detectar)" style="flex:1" />
          <button class="sm-btn" id="sm-comp-analyze">🔍 Analizar competencia</button>
        </div>
        <div class="sm-row">
          <button class="sm-btn secondary" id="sm-comp-latest">📄 Último análisis</button>
          <button class="sm-btn secondary" id="sm-comp-strategies">⚡ Estrategias ganadoras</button>
          <button class="sm-btn secondary" id="sm-comp-gaps">💡 Ideas desde gaps</button>
        </div>
        <div id="sm-comp-result"><div class="sm-empty">Analizá la competencia de tu nicho</div></div>
      </div>
    </div>`;

  const renderReport = (report, el) => {
    if (!report?.competitors?.length) {
      el.innerHTML = '<div class="sm-empty">Sin datos de competidores</div>';
      return;
    }
    el.innerHTML = `
      <div class="sm-stat-row" style="margin-bottom:12px">
        <div class="sm-stat"><strong>${report.competitors.length}</strong>Competidores</div>
        <div class="sm-stat"><strong>${report.insights.length}</strong>Insights</div>
        <div class="sm-stat"><strong>${report.topOpportunities.length}</strong>Top oportunidades</div>
      </div>
      <div style="padding:8px;background:var(--hover,#f8fafc);border-radius:8px;font-size:12px;margin-bottom:12px;color:var(--text-muted,#64748b)">${escape(report.competitivePosition)}</div>
      <div style="font-weight:600;font-size:13px;margin-bottom:6px">🏆 Top oportunidades</div>
      ${report.topOpportunities
        .map(
          (ins) => `
        <div class="sm-insight">
          <div class="sm-row sm-insight-title">${escape(ins.title)} ${opportunityBadge(ins.opportunity)}</div>
          <div class="sm-insight-desc">${escape(ins.description)}</div>
          <div class="sm-insight-rec">→ ${escape(ins.actionableRecommendation)}</div>
        </div>`,
        )
        .join('')}
      <div style="font-weight:600;font-size:13px;margin:10px 0 6px">🏢 Competidores analizados</div>
      ${report.competitors
        .map(
          (c) => `
        <div style="padding:8px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
          <div class="sm-row"><span style="font-weight:600">${escape(c.handle)}</span> ${badge(c.postingFrequency)} <span style="font-size:12px;color:var(--text-muted,#64748b)">${c.estimatedFollowers.toLocaleString()} seguidores · ${c.estimatedEngagementRate}% eng.</span></div>
          <div style="font-size:12px;color:var(--text-muted,#64748b);margin-top:3px">${escape(c.winningFormula)}</div>
        </div>`,
        )
        .join('')}`;
  };

  root.querySelector('#sm-comp-analyze').addEventListener('click', async (e) => {
    const raw = root.querySelector('#sm-comp-handles').value.trim();
    const handles = raw
      ? raw
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
      : [];
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/competitors/analyze', 'POST', { handles });
      renderReport(res, root.querySelector('#sm-comp-result'));
      toast(`${res.competitors?.length ?? 0} competidores analizados ✓`, 'success');
    });
  });

  root.querySelector('#sm-comp-latest').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/competitors/latest');
      if (res.error) {
        toast(res.error, 'warn');
        return;
      }
      renderReport(res, root.querySelector('#sm-comp-result'));
    });
  });

  root.querySelector('#sm-comp-strategies').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/competitors/strategies', 'POST');
      if (res.error) {
        toast(res.error, 'warn');
        return;
      }
      const el = root.querySelector('#sm-comp-result');
      const strategies = res.strategies ?? [];
      el.innerHTML =
        `<div style="font-weight:600;margin-bottom:8px;font-size:13px">⚡ ${strategies.length} estrategias ganadoras adaptadas</div>` +
        strategies
          .map(
            (s, i) =>
              `<div style="padding:6px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">${i + 1}. ${escape(s)}</div>`,
          )
          .join('');
    });
  });

  root.querySelector('#sm-comp-gaps').addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, async () => {
      const res = await apiSafe('/api/competitors/content-from-gaps', 'POST', { maxIdeas: 5 });
      if (res.error) {
        toast(res.error, 'warn');
        return;
      }
      const el = root.querySelector('#sm-comp-result');
      const ideas = res.ideas ?? [];
      el.innerHTML =
        `<div style="font-weight:600;margin-bottom:8px;font-size:13px">💡 ${ideas.length} ideas de contenido desde gaps</div>` +
        ideas
          .map(
            (idea) => `
          <div style="padding:10px 0;border-bottom:1px solid var(--border,#e2e8f0);font-size:13px">
            <div class="sm-row">${badge(idea.format, '#3451d1')} ${badge(idea.estimatedImpact, idea.estimatedImpact === 'alto' ? '#22c55e' : idea.estimatedImpact === 'medio' ? '#f59e0b' : '#6b7280')}</div>
            <div style="font-weight:600;margin-top:4px">${escape(idea.title)}</div>
            <div style="color:var(--text-muted,#64748b)">${escape(idea.differentiationAngle)}</div>
            <div style="font-size:12px;color:#3451d1;margin-top:3px">Hook: ${escape(idea.hook)}</div>
          </div>`,
          )
          .join('');
    });
  });
};

// ── Entry point ────────────────────────────────────────────────────────────────

export const renderStudioManager = (root) => {
  injectStyles();

  const TABS = [
    { id: 'brain', label: '🧠 Master Brain' },
    { id: 'queue', label: '📅 Queue' },
    { id: 'ab', label: '🧪 A/B Tests' },
    { id: 'dm', label: '💬 DMs' },
    { id: 'hashtag', label: '#️⃣ Hashtags' },
    { id: 'comment', label: '💡 Comentarios' },
    { id: 'trend', label: '📈 Trending' },
    { id: 'comp', label: '🔍 Competidores' },
  ];

  root.innerHTML = `
    <div class="sm-wrap">
      <div class="sm-topbar">
        <h1>🤖 Studio Manager</h1>
        <div style="font-size:12px;color:var(--text-muted,#64748b)">CU Brain · ${TABS.length} módulos activos</div>
      </div>
      <div class="sm-tabs" id="sm-tabs">
        ${TABS.map((t, i) => `<button class="sm-tab${i === 0 ? ' active' : ''}" data-tab="${t.id}">${t.label}</button>`).join('')}
      </div>
      ${TABS.map((t, i) => `<div class="sm-panel${i === 0 ? ' visible' : ''}" id="sm-panel-${t.id}"></div>`).join('')}
    </div>`;

  // Tab switching
  root.querySelector('#sm-tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.sm-tab');
    if (!btn) return;
    const tabId = btn.dataset.tab;
    root.querySelectorAll('.sm-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    root.querySelectorAll('.sm-panel').forEach((p) => p.classList.remove('visible'));
    const panel = root.querySelector(`#sm-panel-${tabId}`);
    if (panel) panel.classList.add('visible');
  });

  // Render all panels
  renderMasterBrainPanel(root);
  void renderQueuePanel(root);
  void renderABPanel(root);
  void renderDMPanel(root);
  void renderHashtagPanel(root);
  void renderCommentPanel(root);
  void renderTrendingPanel(root);
  void renderCompetitorPanel(root);
};

export default renderStudioManager;
