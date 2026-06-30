/* ══════════════════════════════════════════════════════════════════════════════
   ACHIEVEMENTS — Galería de trofeos desbloqueables
   ══════════════════════════════════════════════════════════════════════════════ */
import { apiSafe, apiBust } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { getAchievementIcon } from '../js/achievement-icons.js';
import { getInstagramIcon } from '../js/instagram-icons.js';
import { getTikTokIcon } from '../js/tiktok-icons.js';
import { getGeneralIcon } from '../js/general-icons.js';

const EMPTY_SNAPSHOT = {
  totalUnlocked: 0,
  totalAvailable: 0,
  completionPct: 0,
  totalPoints: 0,
  epicUnlocked: 0,
  legendaryUnlocked: 0,
  mythicUnlocked: 0,
  lastUnlocked: null,
};

const RARITY_COLORS = {
  común: '#9CA3AF',
  rara: '#3B82F6',
  épica: '#A855F7',
  legendaria: '#F59E0B',
  mítica: '#EF4444',
};

const CATEGORY_EMOJI = {
  crecimiento: '📈',
  engagement: '❤️',
  contenido: '🎬',
  comunidad: '💬',
  ventas: '💰',
  rituales: '☀️',
  maestría: '🎖️',
  especiales: '✨',
  'tiktok-crecimiento': '🎵',
  'tiktok-engagement': '💕',
  'instagram-crecimiento': '📸',
  'instagram-engagement': '❤️',
};

const RARITY_SOUNDS = {
  común: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  rara: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  épica: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  legendaria: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
  mítica: 'data:audio/wav;base64,UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQIAAAAAAA==',
};

let activeCategory = null;
let activePlatform = null; // null, 'instagram', 'tiktok', 'general'
let showOnlyUnlocked = false;
let lastUnlockedCount = 0;
let all = []; // All achievements — module-level cache to fix scope issues in callbacks
let eventSource = null; // Global SSE instance — ensures single connection
let pollInterval = null; // Cleanup reference
let reconnectInterval = null; // Cleanup reference
let container = null; // Module-level reference to container DOM element
let unlocked = []; // Module-level so click/SSE callbacks can access it
let next = []; // Module-level
let snapshot = { ...EMPTY_SNAPSHOT }; // Module-level
let _sseWired = false; // Wire SSE + click once per module lifetime

const getPlatform = (category) => {
  if (!category) return 'general';
  if (category.includes('instagram')) return 'instagram';
  if (category.includes('tiktok')) return 'tiktok';
  return 'general';
};

const getIconForAchievement = (id, platform) => {
  platform = platform || 'general';
  if (platform === 'instagram') return getInstagramIcon(id);
  if (platform === 'tiktok') return getTikTokIcon(id);
  return getGeneralIcon(id);
};

const playSound = (rarity) => {
  try {
    const audio = new Audio(RARITY_SOUNDS[rarity] ?? RARITY_SOUNDS.común);
    audio.volume = 0.5;
    audio.play().catch(() => {}); // Ignore errors (user may have muted browser)
  } catch (e) {
    // Silently fail if audio not supported
  }
};

const showUnlockNotification = (achievement) => {
  const rarity = achievement.rarity || 'común';
  const rarityColor = RARITY_COLORS[rarity];

  // Toast notification
  toast(
    `🎉 ${escape(achievement.name)}\n${escape(achievement.description)}`,
    rarity === 'mítica' ? 'success' : rarity === 'legendaria' ? 'info' : 'default',
    5000
  );

  // Play sound
  playSound(rarity);

  // Visual pulse effect
  const shelf = container?.querySelector('#medal-shelf');
  if (shelf) {
    shelf.style.animation = 'none';
    setTimeout(() => {
      shelf.style.animation = 'pulse 0.6s ease-out';
    }, 10);
  }
};

const renderBadge = (a, unlocked) => {
  const c = RARITY_COLORS[a.rarity] ?? '#9CA3AF';
  const hidden = a.hidden && !unlocked;
  return `
    <div class="card achievement-card ${unlocked ? 'unlocked' : 'locked'}" style="border-left: 4px solid ${c}; opacity: ${unlocked || !a.hidden ? 1 : 0.4};">
      <div class="meta">
        <span class="tag tiny" style="background:${c}; color:white;">${escape(a.rarity)}</span>
        <span class="tag tiny">${escape(a.category)}</span>
        <span class="tag tiny">+${a.points}pts</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin:10px 0;">
        <div style="width:48px;height:48px;flex-shrink:0;display:flex;align-items:center;justify-content:center;${unlocked ? '' : 'filter:grayscale(1);opacity:0.35;'}">
          ${hidden
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
            : getIconForAchievement(a.id, getPlatform(a.category))}
        </div>
        <div>
          <h3 style="margin:0;">${hidden ? '???' : escape(a.name)}</h3>
          <div class="small muted">${hidden ? 'Logro oculto' : escape(a.description)}</div>
        </div>
      </div>
      ${unlocked ? `<div class="small accent" style="margin-top:6px;">✓ Desbloqueado · ${new Date(a.unlockedAt).toLocaleDateString('es-AR')}</div>` : ''}
      ${!hidden ? `<div class="small muted" style="font-style:italic;margin-top:8px;">"${escape(a.flavorText)}"</div>` : ''}
      ${!hidden ? `<div class="small" style="margin-top:6px;"><strong>Cómo:</strong> ${escape(a.unlockCondition)}</div>` : ''}
      ${unlocked && a.shareableText ? `<button class="btn small" data-share="${escape(a.id)}" style="margin-top:8px;">Compartir 📤</button>` : ''}
    </div>`;
};

export const renderAchievements = async (containerEl) => {
  if (!containerEl) {
    console.error('[renderAchievements] container is null');
    return;
  }
  container = containerEl; // Store in module-level scope for callbacks
  container.innerHTML = `
    <div class="page-header">
      <h1>🏆 Logros</h1>
      <p class="muted">Cada paso del camino tiene un trofeo. Coleccionalos.</p>
    </div>
    <div id="achievements-stats" class="stats-grid" style="margin-bottom:20px;display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>
    <div id="medal-shelf" style="margin:30px 0;"></div>
    <div class="hook-category-filter" id="cat-filter"></div>
    <div style="margin:10px 0;display:flex;gap:10px;align-items:center;">
      <label class="small"><input type="checkbox" id="only-unlocked"> Solo desbloqueados</label>
      <button class="btn small" id="evaluate-btn">🔄 Evaluar progreso</button>
    </div>
    <div id="achievements-grid" class="page-grid"></div>
    <div id="next-section" style="margin-top:30px;"></div>
  `;

  const [allRes, unlockedRes, snapshotRes, nextRes, unackedRes] = await Promise.all([
    apiSafe('/api/achievements', []),
    apiSafe('/api/achievements/unlocked', []),
    apiSafe('/api/achievements/snapshot', EMPTY_SNAPSHOT),
    apiSafe('/api/achievements/next', []),
    apiSafe('/api/achievements/unacknowledged', []),
  ]);
  all = Array.isArray(allRes.data) ? allRes.data : [];
  unlocked = Array.isArray(unlockedRes.data) ? unlockedRes.data : [];
  snapshot = snapshotRes.data ?? EMPTY_SNAPSHOT;
  next = Array.isArray(nextRes.data) ? nextRes.data : [];
  lastUnlockedCount = unlocked.length;
  const isOffline = !!allRes.error && !!snapshotRes.error;

  // Show toast + ACK for any achievements unlocked since last visit
  const unacked = Array.isArray(unackedRes.data) ? unackedRes.data : [];
  if (unacked.length > 0) {
    for (const u of unacked) {
      showUnlockNotification(u);
      apiSafe(`/api/achievements/${u.id}/ack`, null, { method: 'POST', body: {} });
    }
  }

  if (isOffline && all.length === 0) {
    const grid = container?.querySelector('#achievements-grid');
    if (grid)
      grid.innerHTML =
        '<div class="empty-state">📡 Sin conexión al backend. Los logros se cargarán cuando el servidor vuelva.</div>';
    return;
  }

  // Stats
  const statEl = container?.querySelector('#achievements-stats');
  if (statEl) statEl.innerHTML = `
    <div class="card stat-card">
      <div class="stat-label">Desbloqueados</div>
      <div class="stat-value">${snapshot.totalUnlocked}/${snapshot.totalAvailable}</div>
      <div class="small muted">${((snapshot?.completionPct) ?? 0).toFixed(1)}%</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Puntos</div>
      <div class="stat-value">${snapshot.totalPoints}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Épicos+</div>
      <div class="stat-value">${snapshot.epicUnlocked + snapshot.legendaryUnlocked + snapshot.mythicUnlocked}</div>
    </div>
    <div class="card stat-card">
      <div class="stat-label">Último desbloqueo</div>
      <div class="stat-value" style="font-size:14px;">${snapshot.lastUnlocked ? escape(snapshot.lastUnlocked.name) : '—'}</div>
    </div>
  `;

  // Medal Shelf — ALL achievements (unlocked=color, locked=gray)
  const unlockedMap = new Map(unlocked.map((u) => [u.id, u]));
  const rarityStyles = {
    común: { border: '#9CA3AF', bg: 'rgba(156,163,175,0.12)' },
    rara: { border: '#3B82F6', bg: 'rgba(59,130,246,0.12)' },
    épica: { border: '#A855F7', bg: 'linear-gradient(135deg,rgba(168,85,247,0.15),rgba(168,85,247,0.08))' },
    legendaria: { border: '#F59E0B', bg: 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(245,158,11,0.08))' },
    mítica: { border: '#EF4444', bg: 'linear-gradient(135deg,rgba(239,68,68,0.15),rgba(239,68,68,0.08))' },
  };

  const shelfEl = container?.querySelector('#medal-shelf');
  if (shelfEl) shelfEl.innerHTML = `
    <div style="background:linear-gradient(135deg,rgba(88,28,135,0.1),rgba(200,124,124,0.05));border:1px solid rgba(255,255,255,0.15);border-radius:12px;padding:16px;margin-bottom:20px;backdrop-filter:blur(8px);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
        <h2 style="margin:0;font-size:18px;font-weight:600;">🏅 Repisa de Medallas</h2>
        <span class="badge" style="background:rgba(139,92,246,0.3);color:#a78bfa;padding:4px 10px;border-radius:20px;font-size:12px;font-weight:600;">${unlocked.length}/${all.length}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:10px;">
        ${all
          .map((m, idx) => {
            const isUnlocked = unlockedMap.has(m.id);
            const unlockedData = unlockedMap.get(m.id);
            const style = rarityStyles[m.rarity];
            const iconColor = isUnlocked
              ? m.rarity === 'legendaria'
                ? '#FCD34D'
                : m.rarity === 'épica'
                  ? '#D8B4FE'
                  : m.rarity === 'mítica'
                    ? '#FCA5A5'
                    : m.rarity === 'rara'
                      ? '#93C5FD'
                      : '#D1D5DB'
              : '#6B7280';

            return `
        <div class="medal-item medal-${m.rarity}" style="padding:12px 8px;text-align:center;border:2px solid ${isUnlocked ? style.border : '#D1D5DB'};border-radius:8px;cursor:pointer;background:${isUnlocked ? style.bg : 'rgba(107,114,128,0.05)'};transition:all 0.3s ease;animation:slideInUp 0.5s ease-out ${idx * 30}ms;transform:translateY(0);opacity:${isUnlocked ? 1 : 0.5};"
          onmouseover="this.style.transform='translateY(-4px)';this.classList.add('medal-hover');"
          onmouseout="this.style.transform='translateY(0)';this.classList.remove('medal-hover');"
          title="${escape(m.name)}${isUnlocked ? `&#10;✓ Desbloqueado: ${new Date(unlockedData.unlockedAt).toLocaleDateString('es-AR')}` : '&#10;Bloqueado: ' + escape(m.unlockCondition)}">
          <div style="width:32px;height:32px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;filter:${isUnlocked ? 'drop-shadow(0 2px 4px rgba(0,0,0,0.6))' : 'grayscale(100%) drop-shadow(0 2px 4px rgba(107,114,128,0.4))'};opacity:${isUnlocked ? 1 : 0.6};">${getIconForAchievement(m.id, getPlatform(m.category))}</div>
          <div class="tiny" style="font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:${isUnlocked ? '#e0e0e0' : '#9CA3AF'};">${escape(m.name)}</div>
          <div class="tiny muted" style="margin-top:4px;font-size:11px;">${isUnlocked ? new Date(unlockedData.unlockedAt).toLocaleDateString('es-AR') : '🔒'}</div>
        </div>
        `;
          })
          .join('')}
      </div>
    </div>
      <style>
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0.7); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(139,92,246,0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(139,92,246,0); }
        }
        @keyframes unlock-bounce {
          0%, 100% { transform: scale(1) rotate(0deg); }
          25% { transform: scale(1.1) rotate(-5deg); }
          75% { transform: scale(1.1) rotate(5deg); }
        }
        .medal-item {
          position: relative;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .medal-item::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.1), transparent);
          border-radius: 8px;
          pointer-events: none;
        }
        .medal-item.unlocking {
          animation: unlock-bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .medal-común.medal-hover { box-shadow: 0 8px 20px rgba(156,163,175,0.4); }
        .medal-rara.medal-hover { box-shadow: 0 8px 20px rgba(59,130,246,0.5); }
        .medal-épica.medal-hover { box-shadow: 0 8px 24px rgba(168,85,247,0.6); }
        .medal-legendaria.medal-hover { box-shadow: 0 8px 24px rgba(245,158,11,0.6); }
        .medal-mítica.medal-hover { box-shadow: 0 8px 28px rgba(239,68,68,0.7); }
      </style>
    `;
  }

  // Platform filter (tabs: Instagram | TikTok | General)
  const platforms = ['instagram', 'tiktok', 'general'];
  const platformCounts = {};
  platforms.forEach((p) => {
    platformCounts[p] = all.filter((a) => getPlatform(a.category) === p).length;
  });

  const catEl = container?.querySelector('#cat-filter'); if (catEl) catEl.innerHTML = `
    <div style="margin-bottom:12px;">
      <div class="small" style="color:#9CA3AF;margin-bottom:6px;font-weight:600;">PLATAFORMAS</div>
      <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
        <button class="tab-btn ${!activePlatform ? 'active' : ''}" data-platform="" style="background:${!activePlatform ? 'rgba(139,92,246,0.2)' : 'transparent'};border:1px solid ${!activePlatform ? '#a78bfa' : '#6B7280'};">Todos (${all.length})</button>
        <button class="tab-btn" data-platform="instagram" style="background:${activePlatform === 'instagram' ? 'rgba(59,130,246,0.2)' : 'transparent'};border:1px solid ${activePlatform === 'instagram' ? '#93C5FD' : '#6B7280'};">📷 Instagram (${platformCounts.instagram})</button>
        <button class="tab-btn" data-platform="tiktok" style="background:${activePlatform === 'tiktok' ? 'rgba(0,0,0,0.2)' : 'transparent'};border:1px solid ${activePlatform === 'tiktok' ? '#000' : '#6B7280'};">🎵 TikTok (${platformCounts.tiktok})</button>
        <button class="tab-btn" data-platform="general" style="background:${activePlatform === 'general' ? 'rgba(168,85,247,0.2)' : 'transparent'};border:1px solid ${activePlatform === 'general' ? '#D8B4FE' : '#6B7280'};">⭐ General (${platformCounts.general})</button>
      </div>
    </div>
    <div style="margin-bottom:12px;">
      <div class="small" style="color:#9CA3AF;margin-bottom:6px;font-weight:600;">CATEGORÍAS</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button class="tab-btn ${!activeCategory ? 'active' : ''}" data-cat="">Todos</button>
        ${[...new Set(all.map((a) => a.category))].map((c) => `<button class="tab-btn ${activeCategory === c ? 'active' : ''}" data-cat="${escape(c)}">${CATEGORY_EMOJI[c] ?? ''} ${escape(c)}</button>`).join('')}
      </div>
    </div>
  `;

  // Grid
  // unlockedMap already defined above
  let visible = all;
  if (activePlatform) visible = visible.filter((a) => getPlatform(a.category) === activePlatform);
  if (activeCategory) visible = visible.filter((a) => a.category === activeCategory);
  if (showOnlyUnlocked) visible = visible.filter((a) => unlockedMap.has(a.id));

  const gridEl = container?.querySelector('#achievements-grid'); if (gridEl) gridEl.innerHTML = visible
    .map((a) => renderBadge(unlockedMap.get(a.id) ?? a, unlockedMap.has(a.id)))
    .join('');

  // Next achievements
  if (next.length > 0) {
    const nextEl = container?.querySelector('#next-section'); if (nextEl) nextEl.innerHTML = `
      <h2 style="margin-bottom:10px;">🎯 Próximos a desbloquear</h2>
      <div class="page-grid">${next
        .map(
          (n) => `
        <div class="card">
          <div style="font-size:28px;">${escape(n.achievement.emoji)}</div>
          <h4>${escape(n.achievement.name)}</h4>
          <div class="small muted">${escape(n.achievement.description)}</div>
          <div class="small accent" style="margin-top:6px;"><strong>Progreso:</strong> ${escape(n.progressHint)}</div>
        </div>`,
        )
        .join('')}</div>
    `;
  }

  // Listeners — platform & category filters
  container?.querySelector('#cat-filter')?.addEventListener('click', (e) => {
    const platformBtn = e.target.closest('[data-platform]');
    const catBtn = e.target.closest('[data-cat]');

    if (platformBtn) {
      activePlatform = platformBtn.dataset.platform || null;
      renderAchievements(container);
    } else if (catBtn) {
      activeCategory = catBtn.dataset.cat || null;
      renderAchievements(container);
    }
  });

  container?.querySelector('#only-unlocked')?.addEventListener('change', (e) => {
    showOnlyUnlocked = e.target.checked;
    renderAchievements(container);
  });

  container?.querySelector('#evaluate-btn')?.addEventListener('click', async () => {
    toast('Evaluando achievements...', 'info');
    apiBust('/api/achievements');
    const { data: newUnlocks } = await apiSafe('/api/achievements/evaluate', [], { method: 'POST', body: {} });
    const count = (newUnlocks ?? []).length;
    if (count > 0) {
      // Show unlock notifications for each new achievement
      newUnlocks.forEach((unlock) => {
        const def = all.find((a) => a.id === unlock.achievementId);
        if (def) {
          showUnlockNotification(def);
        }
      });
      toast(
        `🎉 ${count} nuevo${count > 1 ? 's' : ''} achievement${count > 1 ? 's' : ''} desbloqueado${count > 1 ? 's' : ''}`,
        'success',
      );
    } else {
      toast('Sin nuevos achievements esta vez', 'info');
    }
    renderAchievements(container);
  });

  // Real-time SSE (Server-Sent Events) for achievements
  // Close previous connection if exists (prevent duplicates)
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  eventSource = new EventSource('/api/stream/achievements');

  eventSource.addEventListener('achievement-unlock', (event) => {
    const data = JSON.parse(event.data);
    const def = all.find((a) => a.id === data.id);
    if (def) {
      showUnlockNotification(def);
      lastUnlockedCount += 1;
      renderAchievements(container);
    }
  });

  eventSource.addEventListener('metrics-update', (event) => {
    const data = JSON.parse(event.data);
    renderAchievements(container);
  });

  eventSource.onerror = () => {
    console.warn('[SSE] Connection lost, falling back to polling');
    eventSource.close();
    // Cleanup old intervals
    if (pollInterval) clearInterval(pollInterval);
    if (reconnectInterval) clearInterval(reconnectInterval);

    // Fallback: poll every 30s — check unacknowledged to show toasts
    pollInterval = setInterval(async () => {
      const { data: unacked } = await apiSafe('/api/achievements/unacknowledged', []);
      if (Array.isArray(unacked) && unacked.length > 0) {
        for (const u of unacked) {
          showUnlockNotification(u);
          apiSafe(`/api/achievements/${u.id}/ack`, null, { method: 'POST', body: {} });
        }
        apiBust('/api/achievements');
        renderAchievements(container);
      }
    }, 30000);

    // Attempt SSE reconnection every 5 minutes
    reconnectInterval = setInterval(() => {
      console.log('[SSE] Attempting reconnection...');
      const newEventSource = new EventSource('/api/stream/achievements');
      newEventSource.onopen = () => {
        console.log('[SSE] Reconnected!');
        clearInterval(pollInterval);
        clearInterval(reconnectInterval);
        eventSource.close();
        eventSource = newEventSource;
        // Re-attach listeners
        newEventSource.addEventListener('achievement-unlock', (event) => {
          const data = JSON.parse(event.data);
          const def = all.find((a) => a.id === data.id);
          if (def) {
            showUnlockNotification(def);
            lastUnlockedCount += 1;
            renderAchievements(container);
          }
        });
        newEventSource.addEventListener('metrics-update', () => {
          renderAchievements(container);
        });
        newEventSource.onerror = eventSource.onerror;
      };
    }, 300000); // 5 minutes

    window.addEventListener('beforeunload', () => {
      clearInterval(pollInterval);
      clearInterval(reconnectInterval);
    });
  };

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => eventSource?.close());

  container?.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-share]');
    if (btn) {
      const id = btn.dataset.share;
      await apiSafe(`/api/achievements/${id}/share`, null, { method: 'POST', body: {} });
      const a = unlocked.find((x) => x.id === id);
      if (a && navigator.clipboard) {
        navigator.clipboard.writeText(a.shareableText);
        toast('Copiado al portapapeles', 'success');
      }
    }
  });

  _sseWired = true;
