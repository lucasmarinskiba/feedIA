import { api, apiSafe } from '../lib/api.js';
import { escape, fmt } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen, withBtnSpinner } from '../lib/ui.js';

let state = { view: 'week', slots: [], jobs: [] };
let viewMode = 'week'; // 'week' | 'month' | 'year'
let monthOffset = 0; // 0 = mes actual
let yearOffset = 0; // 0 = año actual

const FORMAT_COLORS = {
  reel: { bg: 'rgba(225,48,108,.15)', border: '#e1306c', icon: '▶️' },
  carrusel: { bg: 'rgba(91,155,255,.15)', border: '#5b9bff', icon: '🎠' },
  'post-imagen': { bg: 'rgba(251,191,36,.15)', border: '#fbbf24', icon: '🖼️' },
  historia: { bg: 'rgba(74,222,128,.15)', border: '#4ade80', icon: '◎' },
};

const STATUS_COLORS = {
  pendiente: 'warn',
  publicado: 'ok',
  rechazado: 'crit',
  borrador: 'info',
};

// Tipos de ítem (colores legibles que diferencian de un vistazo)
const TYPE_COLORS = {
  publicacion: { color: '#7C3AED', soft: 'rgba(124,58,237,.12)', icon: '📢', label: 'Publicación' },
  tarea: { color: '#0EA5E9', soft: 'rgba(14,165,233,.12)', icon: '✅', label: 'Tarea' },
  evento: { color: '#F59E0B', soft: 'rgba(245,158,11,.14)', icon: '📌', label: 'Evento' },
  recordatorio: { color: '#10B981', soft: 'rgba(16,185,129,.12)', icon: '⏰', label: 'Recordatorio' },
};
const typeOf = (slot) => (TYPE_COLORS[slot.tipo] ? slot.tipo : 'publicacion');
const tmeta = (slot) => TYPE_COLORS[typeOf(slot)];

const getDaysOfWeek = (weekOffset = 0) => {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

let currentWeekOffset = 0;

const getSlotsForDay = (dateStr) => state.slots.filter((s) => (s.scheduledFor ?? '').startsWith(dateStr));

const renderWeekView = () => {
  const days = getDaysOfWeek(currentWeekOffset);
  const todayStr = new Date().toISOString().slice(0, 10);

  return `
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">← Semana anterior</button>
      <div class="small" style="font-weight:700">
        ${days[0].toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
      </div>
      <button class="btn ghost small" id="cal-next-btn">Semana siguiente →</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>

    <div class="calendar-grid">
      ${days
        .map((day, i) => {
          const dateStr = day.toISOString().slice(0, 10);
          const isToday = dateStr === todayStr;
          const daySlots = getSlotsForDay(dateStr);

          return `
          <div class="calendar-day ${isToday ? 'today' : ''}">
            <div class="calendar-day-header">
              <span class="calendar-day-name">${DAY_NAMES[i]}</span>
              <span class="calendar-day-num ${isToday ? 'today-num' : ''}">${day.getDate()}</span>
            </div>
            <div class="calendar-day-slots" data-date="${dateStr}">
              ${
                daySlots.length
                  ? daySlots.map((slot) => renderSlotCard(slot)).join('')
                  : `<div class="calendar-empty-day">—</div>`
              }
              <button class="calendar-add-btn" data-date="${dateStr}" title="Agregar publicación">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14"><path d="M12 5v14M5 12h14"/></svg>
              </button>
            </div>
          </div>`;
        })
        .join('')}
    </div>

    <!-- Quick stats row -->
    <div class="calendar-stats">
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px">${state.slots.length}</div>
        <div class="tiny muted">programados</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--ok)">${state.slots.filter((s) => s.status === 'publicado').length}</div>
        <div class="tiny muted">publicados</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--warn)">${state.slots.filter((s) => s.status === 'pendiente').length}</div>
        <div class="tiny muted">pendientes</div>
      </div>
      <div class="calendar-stat-item">
        <div class="small" style="font-weight:800;font-size:20px;color:var(--info)">${state.slots.filter((s) => s.status === 'borrador').length}</div>
        <div class="tiny muted">borradores</div>
      </div>
    </div>`;
};

const renderSlotCard = (slot) => {
  const tm = tmeta(slot);
  const fi = (FORMAT_COLORS[slot.formato] ?? { icon: '📄' }).icon;
  const time = slot.scheduledFor
    ? new Date(slot.scheduledFor).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    : '';
  return `
    <div class="calendar-slot" style="background:${tm.soft};border-left:3px solid ${tm.color};color:#15181E;" data-id="${escape(slot.id ?? '')}">
      <div style="display:flex;align-items:center;gap:4px">
        <span>${tm.icon}</span>
        <span class="tiny" style="font-weight:700;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#15181E;">${fi} ${escape(slot.titulo ?? slot.hook ?? 'Sin título')}</span>
      </div>
      ${time ? `<div class="tiny" style="color:#667085;">${time}</div>` : ''}
      <span class="tag ${STATUS_COLORS[slot.status] ?? 'info'} tiny">${escape(slot.status ?? 'borrador')}</span>
    </div>`;
};

/* ── Add slot modal (lightweight, inline) ── */
const renderAddModal = (date) => `
  <div class="modal-overlay" id="add-slot-modal">
    <div class="modal">
      <div class="modal-header">
        <h3>➕ Nueva publicación</h3>
        <button class="icon-btn modal-close-btn">✕</button>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Fecha y hora</label>
        <input class="input" type="datetime-local" id="slot-datetime" value="${date}T09:00">
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Tipo</label>
        <select class="input" id="slot-tipo">
          <option value="publicacion">📢 Publicación</option>
          <option value="tarea">✅ Tarea</option>
          <option value="evento">📌 Evento</option>
          <option value="recordatorio">⏰ Recordatorio</option>
        </select>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Formato</label>
        <select class="input" id="slot-format">
          <option value="reel">Reel</option>
          <option value="carrusel">Carrusel</option>
          <option value="post-imagen">Post imagen</option>
          <option value="historia">Historia</option>
        </select>
      </div>
      <div class="field-group" style="margin-bottom:12px">
        <label class="field-label">Idea / Título</label>
        <input class="input" id="slot-title" placeholder="ej: 5 errores al automatizar con IA">
      </div>
      <div class="field-group" style="margin-bottom:16px">
        <label class="field-label">Estado</label>
        <select class="input" id="slot-status">
          <option value="borrador" selected>Borrador</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </div>
      <div class="btn-row">
        <button class="btn gradient" id="save-slot-btn">💾 Guardar</button>
        <button class="btn ghost modal-close-btn">Cancelar</button>
      </div>
    </div>
  </div>`;

/* ── Vista MES ── */
const renderMonthView = () => {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const monthName = MONTH_NAMES[target.getMonth()];
  const year = target.getFullYear();
  const firstDay = new Date(year, target.getMonth(), 1);
  const lastDay = new Date(year, target.getMonth() + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
  const daysInMonth = lastDay.getDate();
  const todayStr = new Date().toISOString().slice(0, 10);

  const cells = [];
  // Padding inicial
  for (let i = 0; i < startOffset; i++) cells.push({ empty: true });
  // Días del mes
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, target.getMonth(), d);
    const dateStr = dt.toISOString().slice(0, 10);
    cells.push({
      day: d,
      dateStr,
      isToday: dateStr === todayStr,
      slots: getSlotsForDay(dateStr),
    });
  }
  // Padding final hasta múltiplo de 7
  while (cells.length % 7 !== 0) cells.push({ empty: true });

  return `
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">← ${MONTH_NAMES[(target.getMonth() + 11) % 12]}</button>
      <div class="small" style="font-weight:700;font-size:15px;">${monthName} ${year}</div>
      <button class="btn ghost small" id="cal-next-btn">${MONTH_NAMES[(target.getMonth() + 1) % 12]} →</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>
    <div class="calendar-month-dow">
      ${DAY_NAMES.map((n) => `<div>${n}</div>`).join('')}
    </div>
    <div class="calendar-month-grid">
      ${cells
        .map((cell) => {
          if (cell.empty) return `<div class="calendar-month-cell empty"></div>`;
          const previewCount = cell.slots.length;
          return `
          <div class="calendar-month-cell ${cell.isToday ? 'today' : ''}" data-date="${cell.dateStr}">
            <div class="calendar-month-cell-head">
              <span class="calendar-month-day ${cell.isToday ? 'today-num' : ''}">${cell.day}</span>
              ${previewCount > 0 ? `<span class="calendar-month-count">${previewCount}</span>` : ''}
            </div>
            <div class="calendar-month-cell-body">
              ${cell.slots
                .slice(0, 3)
                .map((slot) => {
                  const tm = tmeta(slot);
                  const fi = (FORMAT_COLORS[slot.formato] ?? { icon: '' }).icon;
                  return `<div class="calendar-month-pill" style="border-left:3px solid ${tm.color};background:${tm.soft};color:#15181E;">
                  ${tm.icon}${fi ? ' ' + fi : ''} ${escape((slot.titulo ?? slot.hook ?? '—').slice(0, 20))}
                </div>`;
                })
                .join('')}
              ${previewCount > 3 ? `<div class="calendar-month-more">+${previewCount - 3} más</div>` : ''}
            </div>
            <button class="calendar-month-add" data-date="${cell.dateStr}" title="Agregar publicación">+</button>
          </div>`;
        })
        .join('')}
    </div>`;
};

/* ── Vista AÑO ── */
const renderYearView = () => {
  const now = new Date();
  const targetYear = now.getFullYear() + yearOffset;
  const todayStr = new Date().toISOString().slice(0, 10);

  return `
    <div class="calendar-week-header">
      <button class="btn ghost small" id="cal-prev-btn">← ${targetYear - 1}</button>
      <div class="small" style="font-weight:700;font-size:18px;">${targetYear}</div>
      <button class="btn ghost small" id="cal-next-btn">${targetYear + 1} →</button>
      <button class="btn primary small" id="cal-today-btn">Hoy</button>
    </div>
    <div class="calendar-year-grid">
      ${MONTH_NAMES.map((mname, mIdx) => {
        const firstDay = new Date(targetYear, mIdx, 1);
        const lastDay = new Date(targetYear, mIdx + 1, 0);
        const startOffset = (firstDay.getDay() + 6) % 7;
        const daysInMonth = lastDay.getDate();
        const monthSlots = state.slots.filter((s) => {
          const d = new Date(s.scheduledFor ?? 0);
          return d.getFullYear() === targetYear && d.getMonth() === mIdx;
        });
        const cells = [];
        for (let i = 0; i < startOffset; i++) cells.push(null);
        for (let d = 1; d <= daysInMonth; d++) cells.push(d);
        return `
          <div class="calendar-year-month" data-month="${mIdx}">
            <div class="calendar-year-month-head">
              <strong>${mname}</strong>
              ${monthSlots.length ? `<span class="calendar-year-count">${monthSlots.length}</span>` : ''}
            </div>
            <div class="calendar-year-dow">${DAY_NAMES.map((n) => `<span>${n[0]}</span>`).join('')}</div>
            <div class="calendar-year-days">
              ${cells
                .map((d) => {
                  if (d === null) return `<span class="calendar-year-day empty"></span>`;
                  const ds = `${targetYear}-${String(mIdx + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const has = monthSlots.filter((s) => (s.scheduledFor ?? '').startsWith(ds));
                  const isToday = ds === todayStr;
                  const dotColor = has[0] ? (FORMAT_COLORS[has[0].formato]?.border ?? 'var(--accent)') : null;
                  return `<span class="calendar-year-day ${isToday ? 'today' : ''} ${has.length ? 'has' : ''}"
                  style="${dotColor ? `--dot:${dotColor};` : ''}" data-date="${ds}">${d}</span>`;
                })
                .join('')}
            </div>
          </div>`;
      }).join('')}
    </div>`;
};

/* ── render ── */
const render = (root) => {
  const c = root.querySelector('#calendar-content');
  if (!c) return;
  if (viewMode === 'month') c.innerHTML = renderMonthView();
  else if (viewMode === 'year') c.innerHTML = renderYearView();
  else c.innerHTML = renderWeekView();
  // sync segmented control
  root.querySelectorAll('.cal-mode-btn').forEach((b) => b.classList.toggle('active', b.dataset.mode === viewMode));
  attachCalendarListeners(root, c);
};

const attachCalendarListeners = (root, c) => {
  c.querySelector('#cal-prev-btn')?.addEventListener('click', () => {
    if (viewMode === 'month') monthOffset--;
    else if (viewMode === 'year') yearOffset--;
    else currentWeekOffset--;
    render(root);
  });
  c.querySelector('#cal-next-btn')?.addEventListener('click', () => {
    if (viewMode === 'month') monthOffset++;
    else if (viewMode === 'year') yearOffset++;
    else currentWeekOffset++;
    render(root);
  });
  c.querySelector('#cal-today-btn')?.addEventListener('click', () => {
    currentWeekOffset = 0;
    monthOffset = 0;
    yearOffset = 0;
    render(root);
  });

  /* Click en celda de mes/año → abrir add modal o cambiar a semana */
  c.querySelectorAll('.calendar-month-add').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const date = btn.dataset.date;
      openAddModal(root, date);
    });
  });
  c.querySelectorAll('.calendar-year-day.has, .calendar-year-day.today').forEach((cell) => {
    cell.addEventListener('click', () => {
      // Saltar a vista semana de esa fecha
      const ds = cell.dataset.date;
      if (!ds) return;
      const target = new Date(ds);
      const now = new Date();
      const targetMonday = new Date(target);
      targetMonday.setDate(target.getDate() - ((target.getDay() + 6) % 7));
      const nowMonday = new Date(now);
      nowMonday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
      currentWeekOffset = Math.round((targetMonday - nowMonday) / (7 * 86400000));
      viewMode = 'week';
      render(root);
    });
  });

  /* Add slot buttons (week view) */
  c.querySelectorAll('.calendar-add-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      openAddModal(root, btn.dataset.date ?? new Date().toISOString().slice(0, 10));
    });
  });

  /* AI plan week button */
  root.querySelector('#ai-plan-week-btn')?.addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'Planificando…', async () => {
      try {
        await api('/api/calendar/ai-plan', { body: { weekOffset: currentWeekOffset } });
        toast('Semana planificada por IA ✓', 'ok');
        await loadData(root);
      } catch (err) {
        toast(err.message, 'crit');
      }
    });
  });
};

const loadData = async (root) => {
  const { data } = await apiSafe('/api/scheduler/jobs', { jobs: [] });
  const jobs = data?.jobs ?? [];
  /* Map scheduler jobs to calendar slots */
  state.slots = jobs
    .map((j) => ({
      id: j.id ?? j.name,
      titulo: j.titulo ?? j.description ?? j.name,
      formato: j.formato ?? 'post-imagen',
      status: j.status ?? 'pendiente',
      scheduledFor: j.scheduledFor ?? j.nextRun,
    }))
    .filter((s) => s.scheduledFor);
  render(root);
};

const openAddModal = (root, date) => {
  document.body.insertAdjacentHTML('beforeend', renderAddModal(date));
  const modal = document.querySelector('#add-slot-modal');
  modal?.querySelectorAll('.modal-close-btn').forEach((b) => b.addEventListener('click', () => modal.remove()));
  modal?.querySelector('#save-slot-btn')?.addEventListener('click', async () => {
    const datetime = modal.querySelector('#slot-datetime')?.value;
    const title = modal.querySelector('#slot-title')?.value.trim();
    if (!title) {
      toast('Ingresá una idea o título', 'warn');
      return;
    }
    const { error } = await apiSafe('/api/calendar/slots', null, {
      method: 'POST',
      body: {
        scheduledFor: datetime ? new Date(datetime).toISOString() : new Date().toISOString(),
        formato: modal.querySelector('#slot-format')?.value,
        tipo: modal.querySelector('#slot-tipo')?.value ?? 'publicacion',
        titulo: title,
        status: modal.querySelector('#slot-status')?.value ?? 'borrador',
      },
    });
    if (error) {
      toast('Backend offline. Guardalo cuando vuelva.', 'warn');
      return;
    }
    toast('Publicación agregada ✓', 'ok');
    modal.remove();
    await loadData(root);
  });
};

/* FeedIA interpreta texto libre y crea slot(s)/agenda automáticamente */
const interpretWithAI = async (root, text) => {
  if (!text || !text.trim()) return;
  toast('🧠 FeedIA está interpretando…', 'info');
  const { data, error } = await apiSafe('/api/calendar/interpret', null, {
    method: 'POST',
    body: { text: text.trim(), context: { weekOffset: currentWeekOffset, monthOffset, yearOffset, viewMode } },
  });
  if (error) {
    // Fallback: parsear manualmente fechas básicas y crear slot
    const slot = parseTextBasic(text);
    if (slot) {
      await apiSafe('/api/calendar/slots', null, { method: 'POST', body: slot });
      toast('📅 Interpretado localmente. Slot creado.', 'ok');
      await loadData(root);
    } else {
      toast('Backend offline — no se pudo interpretar.', 'warn');
    }
    return;
  }
  const created = data?.created ?? [];
  toast(`✨ FeedIA creó ${created.length} ítem${created.length === 1 ? '' : 's'} automáticamente`, 'ok');
  await loadData(root);
};

/* Parser local mínimo para offline: detecta "hoy/mañana/lunes/..." + hora "10am" */
const parseTextBasic = (text) => {
  const t = text.toLowerCase();
  const now = new Date();
  let when = new Date(now);
  if (/mañana/.test(t)) when.setDate(now.getDate() + 1);
  else if (/pasado mañana/.test(t)) when.setDate(now.getDate() + 2);
  const hourMatch = t.match(/(\d{1,2})\s*(am|pm|h|:00)?/);
  if (hourMatch) {
    let h = parseInt(hourMatch[1], 10);
    if (/pm/.test(hourMatch[2] ?? '') && h < 12) h += 12;
    when.setHours(h, 0, 0, 0);
  }
  let formato = 'post-imagen';
  if (/reel/.test(t)) formato = 'reel';
  else if (/carrusel|carousel/.test(t)) formato = 'carrusel';
  else if (/story|historia/.test(t)) formato = 'historia';
  return {
    scheduledFor: when.toISOString(),
    formato,
    titulo: text.trim().slice(0, 80),
    status: 'pendiente',
  };
};

export const renderCalendar = async (root) => {
  currentWeekOffset = 0;
  monthOffset = 0;
  yearOffset = 0;
  viewMode = 'month';
  state = { view: 'month', slots: [], jobs: [] };
  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">📅 Calendario de contenido</h1>
        <p class="view-subtitle page-subtitle">Planificá, visualizá y gestioná todas tus publicaciones. FeedIA interpreta lo que escribís y agenda automáticamente.</p>
      </div>
      <div class="page-actions">
        <button class="btn ghost" id="ai-plan-week-btn">🤖 Planificar con IA</button>
        <button class="btn primary" id="cal-add-now-btn">+ Nueva publicación</button>
      </div>
    </header>

    <!-- IA-interpret box: escribís libre, FeedIA agenda -->
    <div class="cal-ai-box">
      <div class="cal-ai-icon">🧠</div>
      <div class="cal-ai-body">
        <strong>Decile a FeedIA qué publicar</strong>
        <input class="cal-ai-input" id="cal-ai-input"
          placeholder='Ej: "Mañana 10am subir reel sobre disciplina" · "Carrusel semanal los martes a las 7pm" · "Story diaria con tip"' />
      </div>
      <button class="btn primary" id="cal-ai-go">✨ Interpretar y agendar</button>
    </div>

    <!-- Segmented control: Semana / Mes / Año -->
    <div class="cal-mode-bar">
      <button class="cal-mode-btn" data-mode="week">📅 Semana</button>
      <button class="cal-mode-btn active" data-mode="month">🗓️ Mes</button>
      <button class="cal-mode-btn" data-mode="year">🌐 Año</button>
    </div>

    <!-- Leyenda de tipos -->
    <div class="cal-legend">
      ${Object.values(TYPE_COLORS)
        .map(
          (t) =>
            `<span class="cal-legend-item"><span class="cal-legend-dot" style="background:${t.color};"></span>${t.icon} ${t.label}</span>`,
        )
        .join('')}
    </div>

    <div id="calendar-content" class="page-body">${loadingScreen()}</div>

    <style>
      /* /frontend-design: calendario mensual CUADRADO + texto legible + tipos por color */
      .cal-legend{display:flex;gap:14px;flex-wrap:wrap;margin:6px 2px 12px;}
      .cal-legend-item{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--text,#15181E);}
      .cal-legend-dot{width:10px;height:10px;border-radius:50%;display:inline-block;}
      .cal-mode-bar{display:flex;gap:6px;background:#F2F4F7;border:1px solid #E3E6EB;border-radius:12px;padding:5px;width:fit-content;margin-bottom:12px;}
      .cal-mode-btn{border:0;background:transparent;color:#475067;font-weight:700;font-size:13px;padding:8px 16px;border-radius:9px;cursor:pointer;}
      .cal-mode-btn.active{background:#fff;color:#15181E;box-shadow:0 1px 3px rgba(16,24,40,.12);}
      .calendar-month-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-bottom:8px;}
      .calendar-month-dow>div{text-align:center;font-size:12px;font-weight:800;color:#667085;text-transform:uppercase;letter-spacing:.04em;}
      .calendar-month-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;}
      .calendar-month-cell{position:relative;aspect-ratio:1/1;background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:8px;display:flex;flex-direction:column;overflow:hidden;transition:border-color .15s,box-shadow .15s;}
      .calendar-month-cell:hover{border-color:#9da9ff;box-shadow:0 4px 12px rgba(16,24,40,.08);}
      .calendar-month-cell.empty{background:transparent;border:0;}
      .calendar-month-cell.today{border-color:#7C3AED;box-shadow:0 0 0 2px rgba(124,58,237,.18);}
      .calendar-month-cell-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;}
      .calendar-month-day{font-size:13px;font-weight:800;color:#15181E;}
      .calendar-month-day.today-num{background:#7C3AED;color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;}
      .calendar-month-count{font-size:10px;font-weight:800;color:#7C3AED;background:rgba(124,58,237,.12);border-radius:999px;padding:1px 7px;}
      .calendar-month-cell-body{flex:1;display:flex;flex-direction:column;gap:4px;overflow:hidden;}
      .calendar-month-pill{font-size:11px;font-weight:600;padding:3px 7px;border-radius:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3;}
      .calendar-month-more{font-size:10px;color:#667085;font-weight:600;}
      .calendar-month-add{position:absolute;bottom:6px;right:6px;width:22px;height:22px;border-radius:7px;border:1px solid #E3E6EB;background:#F7F8FB;color:#475067;cursor:pointer;font-size:14px;line-height:1;opacity:0;transition:opacity .15s;}
      .calendar-month-cell:hover .calendar-month-add{opacity:1;}
      .calendar-slot{padding:6px 8px;border-radius:8px;margin-bottom:5px;}
      @media(max-width:640px){.calendar-month-cell{aspect-ratio:auto;min-height:74px;}.calendar-month-pill{font-size:10px;}}
    </style>`;

  // Segmented control
  root.querySelectorAll('.cal-mode-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      viewMode = btn.dataset.mode;
      render(root);
    });
  });

  // IA interpret box
  const goBtn = root.querySelector('#cal-ai-go');
  const input = root.querySelector('#cal-ai-input');
  goBtn?.addEventListener('click', async (e) => {
    await withBtnSpinner(e.currentTarget, 'interpretando…', async () => {
      await interpretWithAI(root, input.value);
      input.value = '';
    });
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') goBtn.click();
  });

  // Nueva publicación
  root.querySelector('#cal-add-now-btn')?.addEventListener('click', () => {
    openAddModal(root, new Date().toISOString().slice(0, 10));
  });

  await loadData(root);
};
