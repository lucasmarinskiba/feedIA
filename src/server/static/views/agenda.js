/* ══════════════════════════════════════════════════════════════════════════════
   AGENDA — cronograma de lo que FeedIA va a hacer
   ──────────────────────────────────────────────────────────────────────────────
   Combina las próximas ejecuciones de directivas con items manuales que el
   usuario agenda. Vista lineal por día.
   ══════════════════════════════════════════════════════════════════════════════ */
import { api, apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

const dayKey = (iso) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });
};
const timeStr = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

const render = async (root) => {
  const host = root.querySelector('#agenda-content');
  if (!host) return;
  host.innerHTML = loadingScreen();
  const { data: items, error } = await apiSafe('/api/agenda', []);
  const list = Array.isArray(items) ? items : Array.isArray(items?.items) ? items.items : [];
  const isOffline = !!error || (items && items.demoMode === true && !Array.isArray(items));

  // metadatos de plataforma (colores legibles, no tapan texto)
  const PLAT = {
    instagram: { ico: '📷', label: 'Instagram', color: '#C13584', soft: 'rgba(193,53,132,.10)' },
    tiktok: { ico: '🎵', label: 'TikTok', color: '#FE2C55', soft: 'rgba(254,44,85,.10)' },
    general: { ico: '📌', label: 'General', color: '#6366F1', soft: 'rgba(99,102,241,.10)' },
  };
  const pmeta = (p) => PLAT[p] || PLAT.general;

  // filtro activo (persistido en memoria del módulo)
  const flt = render._flt || 'all';
  const shown = flt === 'all' ? list : list.filter((i) => (i.platform || 'general') === flt);

  // group by day
  const groups = {};
  for (const it of shown) {
    const k = dayKey(it.at);
    (groups[k] ||= []).push(it);
  }
  const total = list.length;
  const counts = {
    instagram: list.filter((i) => i.platform === 'instagram').length,
    tiktok: list.filter((i) => i.platform === 'tiktok').length,
  };

  host.innerHTML = `
    <style>
      .ag-wrap{--ink:#15181E;--ink2:#475067;--ink3:#667085;--line:#E6E8EE;--soft:#F7F8FB;}
      .ag-card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;margin-bottom:14px;box-shadow:0 1px 2px rgba(16,24,40,.04);}
      .ag-card h3,.ag-card strong,.ag-card .ag-title{color:var(--ink);}
      .ag-input{width:100%;box-sizing:border-box;background:#fff;color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:12px 14px;font-size:15px;font-family:inherit;outline:none;}
      .ag-input:focus{border-color:#9da9ff;box-shadow:0 0 0 3px rgba(99,102,241,.15);}
      select.ag-input{appearance:none;-webkit-appearance:none;cursor:pointer;}
      .ag-btn{border:0;border-radius:999px;padding:11px 18px;font-weight:700;font-size:14px;cursor:pointer;}
      .ag-btn.primary{background:linear-gradient(135deg,#7C3AED,#6366F1);color:#fff;}
      .ag-btn.ghost{background:var(--soft);color:var(--ink2);border:1px solid var(--line);}
      .ag-chip{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer;border:1px solid var(--line);background:#fff;color:var(--ink2);}
      .ag-chip.on{background:var(--ink);color:#fff;border-color:var(--ink);}
      .ag-day-head{font-size:13px;font-weight:800;color:var(--ink2);text-transform:capitalize;margin:18px 2px 8px;letter-spacing:.02em;}
      .ag-item{display:flex;gap:12px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-left:4px solid var(--pc,#6366F1);border-radius:12px;padding:13px 14px;margin-bottom:8px;}
      .ag-item.done{opacity:.55;}
      .ag-item.done .ag-title{text-decoration:line-through;}
      .ag-time{font-size:13px;font-weight:800;color:var(--ink);min-width:48px;}
      .ag-title{font-size:14px;font-weight:700;line-height:1.3;}
      .ag-notes{font-size:12px;color:var(--ink2);margin-top:3px;line-height:1.4;}
      .ag-meta{font-size:11px;color:var(--ink3);margin-top:5px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;}
      .ag-pbadge{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;}
      .ag-iconbtn{border:1px solid var(--line);background:#fff;color:var(--ink2);border-radius:8px;width:30px;height:30px;cursor:pointer;font-size:14px;}
      .ag-iconbtn:hover{background:var(--soft);}
      .ag-empty{text-align:center;padding:36px 20px;color:var(--ink3);}
    </style>
    <div class="ag-wrap">
      ${isOffline ? `<div class="ag-card" style="border-style:dashed;padding:12px 14px;"><span style="color:#475067;font-size:13px;">📡 Backend offline. Lo que escribas se guardará cuando vuelva.</span></div>` : ''}

      <!-- Plan IA: sincroniza con la cuenta -->
      <div class="ag-card" style="border-top:3px solid #7C3AED;">
        <div style="display:flex;align-items:center;gap:8px;"><span style="font-size:20px;">🧠</span><strong style="font-size:16px;">Planificador IA</strong><span class="ag-pbadge" style="background:rgba(124,58,237,.12);color:#7C3AED;">agente</span></div>
        <p style="color:#475067;font-size:13px;margin:6px 0 12px;">FeedIA arma tu calendario de contenido sincronizado con tu cuenta (mejores horarios, mix de formatos, cadencia por red).</p>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px;">
          <select id="ag-plan-plat" class="ag-input"><option value="instagram">📷 Instagram</option><option value="tiktok">🎵 TikTok</option><option value="both">🌐 Ambas</option></select>
          <select id="ag-plan-dias" class="ag-input"><option value="7">7 días</option><option value="14">14 días</option><option value="30">30 días</option></select>
          <input id="ag-plan-nicho" class="ag-input" placeholder="Tu nicho (ej: fitness, IA)">
        </div>
        <button class="ag-btn primary" id="ag-plan-go" style="margin-top:12px;width:100%;">✨ Generar plan de contenido</button>
      </div>

      <!-- Lenguaje natural -->
      <div class="ag-card">
        <strong>Decile a FeedIA qué hacer</strong>
        <p style="color:#475067;font-size:13px;margin:4px 0 10px;">Escribí natural: tareas, contenidos, recordatorios, automatizaciones.</p>
        <textarea id="ag-ai-input" class="ag-input" rows="2" placeholder='Ej: "Recordame revisar métricas los lunes 9am" · "Grabar reel sobre disciplina mañana 11am"'></textarea>
        <button class="ag-btn primary" id="ag-ai-go" style="margin-top:10px;">✨ Interpretar y agendar</button>
        <details style="margin-top:10px;">
          <summary style="cursor:pointer;color:#475067;font-size:13px;">➕ Agendar manualmente</summary>
          <div style="display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:8px;margin-top:10px;align-items:center;">
            <input class="ag-input" id="ag-title" placeholder="Título…"/>
            <input class="ag-input" id="ag-at" type="datetime-local"/>
            <select class="ag-input" id="ag-plat"><option value="general">📌 General</option><option value="instagram">📷 IG</option><option value="tiktok">🎵 TikTok</option></select>
            <button class="ag-btn primary" id="ag-add">Agendar</button>
          </div>
        </details>
      </div>

      <!-- Filtro por plataforma -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        <span class="ag-chip ${flt === 'all' ? 'on' : ''}" data-flt="all">Todo (${total})</span>
        <span class="ag-chip ${flt === 'instagram' ? 'on' : ''}" data-flt="instagram">📷 IG (${counts.instagram})</span>
        <span class="ag-chip ${flt === 'tiktok' ? 'on' : ''}" data-flt="tiktok">🎵 TikTok (${counts.tiktok})</span>
      </div>

      ${
        Object.keys(groups).length === 0
          ? `<div class="ag-card ag-empty">Sin nada agendado${flt !== 'all' ? ' en este filtro' : ''}. Generá un plan IA arriba o escribile a FeedIA.</div>`
          : Object.entries(groups)
              .map(
                ([day, dayItems]) => `
          <div class="ag-day">
            <div class="ag-day-head">${escape(day)}</div>
            ${dayItems
              .map((it) => {
                const pm = pmeta(it.platform);
                return `
              <div class="ag-item ${it.done ? 'done' : ''}" style="--pc:${pm.color};">
                <div class="ag-time">${timeStr(it.at)}</div>
                <div style="flex:1;min-width:0;">
                  <div class="ag-title">${escape(it.title)}</div>
                  ${it.notes ? `<div class="ag-notes">${escape(it.notes)}</div>` : ''}
                  <div class="ag-meta">
                    <span class="ag-pbadge" style="background:${pm.soft};color:${pm.color};">${pm.ico} ${pm.label}</span>
                    ${it.format ? `<span>· ${escape(it.format)}</span>` : ''}
                    <span>· ${it.fromDirective ? '🤖 IA' : '✋ manual'}</span>
                    <span>· ${fmt.rel(it.at)}</span>
                  </div>
                </div>
                <div style="display:flex;gap:6px;flex-shrink:0;">
                  <button class="ag-iconbtn" data-done="${escape(it.id)}" title="${it.done ? 'reabrir' : 'hecho'}">${it.done ? '↺' : '✓'}</button>
                  <button class="ag-iconbtn" data-del="${escape(it.id)}" title="eliminar">🗑</button>
                </div>
              </div>`;
              })
              .join('')}
          </div>`,
              )
              .join('')
      }
    </div>`;

  // filtro
  host.querySelectorAll('[data-flt]').forEach((c) =>
    c.addEventListener('click', () => {
      render._flt = c.dataset.flt;
      render(root);
    }),
  );

  // Plan IA
  root.querySelector('#ag-plan-go')?.addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'planeando…', async () => {
      const platform = root.querySelector('#ag-plan-plat').value;
      const dias = Number(root.querySelector('#ag-plan-dias').value);
      const nicho = root.querySelector('#ag-plan-nicho').value.trim();
      const { data, error } = await apiSafe('/api/agenda/plan', null, {
        method: 'POST',
        body: { platform, dias, nicho },
      });
      if (error) {
        toast('Backend offline — no se pudo planear', 'warn');
        return;
      }
      const created = data?.created ?? [];
      if (!created.length) {
        toast('Necesitás un LLM (GROQ_API_KEY) para el plan IA', 'warn');
        return;
      }
      toast(`✨ Plan listo: ${created.length} contenidos${data.real ? ' (con tus datos reales)' : ''}`, 'ok');
      await render(root);
    });
  });

  // IA-interpret box
  const aiInput = root.querySelector('#ag-ai-input');
  const aiGo = root.querySelector('#ag-ai-go');
  aiGo?.addEventListener('click', async (e) => {
    const text = aiInput?.value?.trim();
    if (!text) {
      toast('Escribí qué querés agendar', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'interpretando…', async () => {
      const { data, error } = await apiSafe('/api/agenda/interpret', null, {
        method: 'POST',
        body: { text },
      });
      if (error) {
        // Fallback: parser local básico
        const at = guessWhen(text);
        if (at) {
          await apiSafe('/api/agenda', null, {
            method: 'POST',
            body: { title: text.slice(0, 80), at: at.toISOString() },
          });
          toast('📅 Interpretado localmente. Agendado.', 'ok');
          aiInput.value = '';
          await render(root);
        } else {
          toast('Backend offline. No se pudo interpretar.', 'warn');
        }
        return;
      }
      const created = data?.created ?? [];
      toast(`✨ FeedIA agendó ${created.length} ítem${created.length === 1 ? '' : 's'}`, 'ok');
      aiInput.value = '';
      await render(root);
    });
  });
  aiInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      aiGo?.click();
    }
  });

  // Add manual
  root.querySelector('#ag-add')?.addEventListener('click', async (e) => {
    const title = root.querySelector('#ag-title').value.trim();
    const at = root.querySelector('#ag-at').value;
    const platform = root.querySelector('#ag-plat')?.value || 'general';
    if (!title || !at) {
      toast('Completá título y fecha', 'warn');
      return;
    }
    await withBtnSpinner(e.currentTarget, 'agendando…', async () => {
      const { error: addErr } = await apiSafe('/api/agenda', null, {
        method: 'POST',
        body: { title, at: new Date(at).toISOString(), platform },
      });
      if (addErr) {
        toast('Backend offline — guardalo cuando vuelva', 'warn');
        return;
      }
      toast('Agendado', 'ok');
      await render(root);
    });
  });

  host.querySelectorAll('[data-done]').forEach((b) =>
    b.addEventListener('click', async () => {
      await apiSafe(`/api/agenda/${b.dataset.done}/done`, null, {
        method: 'POST',
        body: { done: b.textContent.trim() === '✓' },
      });
      await render(root);
    }),
  );
  host.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      await apiSafe(`/api/agenda/${b.dataset.del}/delete`, null, { method: 'POST', body: {} });
      toast('Eliminado', 'ok');
      await render(root);
    }),
  );
};

/* Parser local básico: detecta "hoy/mañana/lunes/..." + hora "10am" para fallback offline */
const guessWhen = (text) => {
  const t = text.toLowerCase();
  const now = new Date();
  const when = new Date(now);
  if (/pasado\s*mañana/.test(t)) when.setDate(now.getDate() + 2);
  else if (/mañana/.test(t)) when.setDate(now.getDate() + 1);
  const days = {
    domingo: 0,
    lunes: 1,
    martes: 2,
    miércoles: 3,
    miercoles: 3,
    jueves: 4,
    viernes: 5,
    sábado: 6,
    sabado: 6,
  };
  for (const [name, dow] of Object.entries(days)) {
    if (new RegExp(`\\b${name}\\b`).test(t)) {
      const diff = (dow - now.getDay() + 7) % 7 || 7;
      when.setDate(now.getDate() + diff);
      break;
    }
  }
  const hm = t.match(/(\d{1,2})\s*(?::(\d{2}))?\s*(am|pm|h)?/);
  if (hm) {
    let h = parseInt(hm[1], 10);
    const m = hm[2] ? parseInt(hm[2], 10) : 0;
    if (/pm/.test(hm[3] ?? '') && h < 12) h += 12;
    when.setHours(h, m, 0, 0);
  } else {
    when.setHours(9, 0, 0, 0);
  }
  return when;
};

export const renderAgenda = async (root) => {
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📒 Agenda</h1>
        <p class="view-subtitle page-subtitle">Lo que FeedIA va a hacer y lo que agendás a mano, día por día.</p>
      </div>
    </header>
    <div id="agenda-content" class="page-body">${loadingScreen()}</div>`;
  await render(root);
};
