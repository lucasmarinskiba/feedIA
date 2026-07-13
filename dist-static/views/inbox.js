/* ══════════════════════════════════════════════════════════════════════════════
   inbox.js — Unified chat + calendar scheduling hub
   ──────────────────────────────────────────────────────────────────────────────
   Layout:
     Left side: Chatbot panel (account-aware, knows scheduling intents)
     Right side: Calendar mini-view (next 7 days, editable events)

   When user mentions scheduling ("schedule reel tomorrow", "remind me..."),
   chatbot detects intent → calendar side auto-scrolls/focuses event editor.
   ══════════════════════════════════════════════════════════════════════════════ */

import { api, apiSafe } from '../lib/api.js';
import { initChatbotUI, openChatbot } from '../lib/chatbotUI.js';
import { toast } from '../lib/toast.js';

let state = { navigate: () => {} };
let inboxMiniCalendar = [];

const renderInboxLayout = () => `
  <div class="inbox-container">
    <!-- Left: Chatbot panel in inbox mode -->
    <div class="inbox-chat-half">
      <div id="inbox-chatbot-wrapper"></div>
    </div>

    <!-- Right: Calendar mini-view (next 7 days) -->
    <div class="inbox-calendar-half">
      <div class="inbox-cal-header">
        <h3 style="margin:0;font-size:14px;font-weight:700;">Próximos eventos</h3>
        <a href="#calendar" style="font-size:12px;color:var(--primary);">Ver calendario →</a>
      </div>
      <div id="inbox-mini-calendar" class="inbox-mini-calendar">
        <!-- Populated by renderMiniCalendar -->
      </div>
    </div>
  </div>`;

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

const renderMiniCalendar = () => {
  const days = getDaysOfWeek(0);
  const todayStr = new Date().toISOString().slice(0, 10);
  const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  let html = `<div class="inbox-mini-grid">`;

  days.forEach((day, i) => {
    const dateStr = day.toISOString().slice(0, 10);
    const isToday = dateStr === todayStr;
    const daySlots = inboxMiniCalendar.filter((s) => (s.scheduledFor ?? '').startsWith(dateStr));

    html += `
      <div class="inbox-mini-day ${isToday ? 'today' : ''}">
        <div class="inbox-mini-day-header">
          <span>${DAY_NAMES[i]}</span>
          <span class="inbox-mini-day-num">${day.getDate()}</span>
        </div>
        <div class="inbox-mini-day-slots" data-date="${dateStr}">
          ${
            daySlots.length
              ? daySlots.map((s) => `<div class="inbox-mini-slot" title="${s.titulo || 'Sin título'}">${s.titulo?.slice(0, 8)}…</div>`).join('')
              : `<div class="inbox-mini-empty">—</div>`
          }
        </div>
      </div>`;
  });

  html += `</div>`;
  return html;
};

const loadMiniCalendar = async () => {
  const { data } = await apiSafe('/api/scheduler/jobs', null, { method: 'GET' });
  if (data?.jobs) {
    inboxMiniCalendar = data.jobs.slice(0, 20);
    const miniCal = document.getElementById('inbox-mini-calendar');
    if (miniCal) miniCal.innerHTML = renderMiniCalendar();
  }
};

const initChatbotInInboxMode = ({ navigate }) => {
  state.navigate = navigate;

  initChatbotUI({ navigate });

  const wrapper = document.getElementById('inbox-chatbot-wrapper');
  if (!wrapper) return;

  const chatPanel = document.getElementById('chatbot-panel');
  if (chatPanel) {
    chatPanel.classList.add('inbox-mode');
  }

  setTimeout(() => openChatbot?.(), 100);
};

export const renderInbox = ({ navigate }) => {
  const root = document.getElementById('main-content');
  if (!root) return;

  root.innerHTML = renderInboxLayout();
  loadMiniCalendar();
  initChatbotInInboxMode({ navigate });
};
